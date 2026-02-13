import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { Prisma } from '@prisma/client';
import { getEffectiveTaxRate, getTradeRestrictions } from '../services/law-effects';
import { emitTradeCompleted } from '../socket/events';
import { cache } from '../middleware/cache';
import { invalidateCache } from '../lib/redis';
import { awardCrossTownMerchantXP } from './trade-analytics';
import { getPsionSpec, calculateSellerUrgency, calculatePriceTrend } from '../services/psion-perks';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { isTownReleased } from '../lib/content-release';
import { onMarketSell, onMarketBuy } from '../services/quest-triggers';

const router = Router();

const LISTING_DURATION_DAYS = 7;

// --- Schemas ---

const listSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  price: z.number().int().min(1, 'Price must be at least 1'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const buySchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const cancelSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
});

// --- Helpers ---

// POST /api/market/list
router.post('/list', authGuard, characterGuard, validate(listSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId, price, quantity } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to list items' });
    }

    // Find item in inventory
    const inventoryEntry = await prisma.inventory.findFirst({
      where: { characterId: character.id, itemId },
    });

    if (!inventoryEntry) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }

    if (inventoryEntry.quantity < quantity) {
      return res.status(400).json({ error: `Insufficient quantity. You have ${inventoryEntry.quantity}` });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LISTING_DURATION_DAYS);

    const [listing] = await prisma.$transaction([
      prisma.marketListing.create({
        data: {
          sellerId: character.id,
          itemId,
          price,
          quantity,
          townId: character.currentTownId,
          expiresAt,
        },
        include: {
          item: { include: { template: true } },
        },
      }),
      // Reduce or remove inventory
      inventoryEntry.quantity === quantity
        ? prisma.inventory.delete({ where: { id: inventoryEntry.id } })
        : prisma.inventory.update({
            where: { id: inventoryEntry.id },
            data: { quantity: { decrement: quantity } },
          }),
    ]);

    onMarketSell(character.id).catch(() => {}); // fire-and-forget

    await invalidateCache('cache:/api/market/browse*');
    return res.status(201).json({ listing });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-list', req)) return;
    logRouteError(req, 500, 'Market list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/market/browse
router.get('/browse', authGuard, cache(30), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const townId = (req.query.townId as string) || character.currentTownId;
    if (!townId) {
      return res.status(400).json({ error: 'No town specified and character is not in a town' });
    }

    // Content gating: reject browsing unreleased town markets
    if (!(await isTownReleased(townId))) {
      return res.status(400).json({ error: 'This market is not yet available' });
    }

    const type = req.query.type as string | undefined;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string, 10) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;
    const rarity = req.query.rarity as string | undefined;
    const search = req.query.search as string | undefined;
    const sort = (req.query.sort as string) || 'newest';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const now = new Date();

    const where: Prisma.MarketListingWhereInput = {
      townId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      item: {
        template: {
          ...(type ? { type: type as any } : {}),
          ...(rarity ? { rarity: rarity as any } : {}),
          ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
        },
      },
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    };

    let orderBy: Prisma.MarketListingOrderByWithRelationInput;
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rarity':
        orderBy = { item: { template: { rarity: 'desc' } } };
        break;
      case 'newest':
      default:
        orderBy = { listedAt: 'desc' };
        break;
    }

    const [listings, total] = await Promise.all([
      prisma.marketListing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          item: { include: { template: true } },
          seller: { select: { id: true, name: true } },
        },
      }),
      prisma.marketListing.count({ where }),
    ]);

    // Build base listing data
    const baseListing = listings.map(l => ({
      id: l.id,
      price: l.price,
      quantity: l.quantity,
      listedAt: l.listedAt,
      expiresAt: l.expiresAt,
      seller: l.seller,
      sellerId: l.sellerId,
      item: {
        id: l.item.id,
        templateId: l.item.templateId,
        name: l.item.template.name,
        type: l.item.template.type,
        rarity: l.item.template.rarity,
        description: l.item.template.description,
        stats: l.item.template.stats,
        quality: l.item.quality,
        currentDurability: l.item.currentDurability,
      },
    }));

    // Psion perk enrichment (personalized, not cached)
    const { isPsion, specialization } = await getPsionSpec(character.id);
    let enrichedListings: typeof baseListing = baseListing;

    if (isPsion && specialization === 'telepath') {
      // Trader's Insight: add seller urgency to each listing
      enrichedListings = await Promise.all(
        baseListing.map(async (listing) => {
          const seller = await prisma.character.findUnique({
            where: { id: listing.sellerId },
            select: { gold: true },
          });
          return {
            ...listing,
            psionInsight: {
              sellerUrgency: calculateSellerUrgency(listing.listedAt, seller?.gold ?? 1000),
            },
          };
        }),
      );
    } else if (isPsion && specialization === 'seer') {
      // Market Foresight: add price trend to each listing
      enrichedListings = await Promise.all(
        baseListing.map(async (listing) => {
          const trend = await calculatePriceTrend(listing.item.templateId, townId ?? undefined);
          return {
            ...listing,
            psionInsight: { priceTrend: trend },
          };
        }),
      );
    }

    return res.json({
      listings: enrichedListings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-browse', req)) return;
    logRouteError(req, 500, 'Market browse error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/market/buy
router.post('/buy', authGuard, characterGuard, validate(buySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId, quantity } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId },
      include: {
        item: { include: { template: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.expiresAt && listing.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Listing has expired' });
    }

    if (listing.sellerId === character.id) {
      return res.status(400).json({ error: 'You cannot buy your own listing' });
    }

    if (character.currentTownId !== listing.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the listing' });
    }

    if (quantity > listing.quantity) {
      return res.status(400).json({ error: `Only ${listing.quantity} available` });
    }

    // Check trade restrictions (embargoes, war)
    const restrictions = await getTradeRestrictions(listing.townId, character.id, listing.sellerId);
    if (restrictions.blocked) {
      return res.status(403).json({ error: restrictions.reason });
    }

    const subtotal = listing.price * quantity;
    const taxRate = await getEffectiveTaxRate(listing.townId);
    const tax = Math.floor(subtotal * taxRate);
    const totalCost = subtotal + tax;

    if (character.gold < totalCost) {
      return res.status(400).json({ error: `Insufficient gold. Need ${totalCost} (${subtotal} + ${tax} tax), have ${character.gold}` });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Execute the purchase atomically
    const result = await prisma.$transaction(async (tx) => {
      // Deduct gold from buyer
      await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: totalCost } },
      });

      // Add gold to seller
      await tx.character.update({
        where: { id: listing.sellerId },
        data: { gold: { increment: subtotal } },
      });

      // Add item to buyer inventory (check if they already have a stack)
      const existingInv = await tx.inventory.findFirst({
        where: { characterId: character.id, itemId: listing.itemId },
      });

      if (existingInv) {
        await tx.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        await tx.inventory.create({
          data: {
            characterId: character.id,
            itemId: listing.itemId,
            quantity,
          },
        });
      }

      // Update or delete listing
      if (quantity === listing.quantity) {
        await tx.marketListing.delete({ where: { id: listingId } });
      } else {
        await tx.marketListing.update({
          where: { id: listingId },
          data: { quantity: { decrement: quantity } },
        });
      }

      // Create trade transaction
      const transaction = await tx.tradeTransaction.create({
        data: {
          buyerId: character.id,
          sellerId: listing.sellerId,
          itemId: listing.itemId,
          price: listing.price,
          quantity,
          townId: listing.townId,
        },
      });

      // Deposit tax into town treasury
      if (tax > 0) {
        await tx.townTreasury.upsert({
          where: { townId: listing.townId },
          update: { balance: { increment: tax } },
          create: { townId: listing.townId, balance: tax },
        });
      }

      // Update or create price history for today
      const existingHistory = await tx.priceHistory.findUnique({
        where: {
          itemTemplateId_townId_date: {
            itemTemplateId: listing.item.templateId,
            townId: listing.townId,
            date: today,
          },
        },
      });

      if (existingHistory) {
        const newVolume = existingHistory.volume + quantity;
        const newAvgPrice =
          (existingHistory.avgPrice * existingHistory.volume + listing.price * quantity) / newVolume;
        await tx.priceHistory.update({
          where: { id: existingHistory.id },
          data: { avgPrice: newAvgPrice, volume: newVolume },
        });
      } else {
        await tx.priceHistory.create({
          data: {
            itemTemplateId: listing.item.templateId,
            townId: listing.townId,
            avgPrice: listing.price,
            volume: quantity,
            date: today,
          },
        });
      }

      return transaction;
    });

    onMarketBuy(character.id).catch(() => {}); // fire-and-forget

    // Award cross-town Merchant XP to the seller (non-blocking)
    awardCrossTownMerchantXP(
      listing.sellerId,
      listing.itemId,
      listing.townId,
      listing.price,
      quantity,
    ).catch(() => {}); // fire-and-forget, errors already logged internally

    // Notify seller of the completed trade
    emitTradeCompleted({
      townId: listing.townId,
      buyerId: character.id,
      sellerId: listing.sellerId,
      itemName: listing.item.template.name,
      quantity,
      price: listing.price,
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({
      transaction: {
        id: result.id,
        itemName: listing.item.template.name,
        quantity,
        pricePerUnit: listing.price,
        subtotal,
        tax,
        totalCost,
        seller: listing.seller,
        timestamp: result.timestamp,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-buy', req)) return;
    logRouteError(req, 500, 'Market buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/market/cancel
router.post('/cancel', authGuard, characterGuard, validate(cancelSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.sellerId !== character.id) {
      return res.status(403).json({ error: 'This listing does not belong to you' });
    }

    await prisma.$transaction(async (tx) => {
      const existingInv = await tx.inventory.findFirst({
        where: { characterId: character.id, itemId: listing.itemId },
      });

      if (existingInv) {
        await tx.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: { increment: listing.quantity } },
        });
      } else {
        await tx.inventory.create({
          data: {
            characterId: character.id,
            itemId: listing.itemId,
            quantity: listing.quantity,
          },
        });
      }

      await tx.marketListing.delete({ where: { id: listingId } });
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({ message: 'Listing cancelled and item returned to inventory' });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-cancel', req)) return;
    logRouteError(req, 500, 'Market cancel error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/market/my-listings
router.get('/my-listings', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const listings = await prisma.marketListing.findMany({
      where: { sellerId: character.id },
      include: {
        item: { include: { template: true } },
        town: { select: { id: true, name: true } },
      },
      orderBy: { listedAt: 'desc' },
    });

    return res.json({
      listings: listings.map(l => ({
        id: l.id,
        price: l.price,
        quantity: l.quantity,
        listedAt: l.listedAt,
        expiresAt: l.expiresAt,
        town: l.town,
        item: {
          id: l.item.id,
          templateId: l.item.templateId,
          name: l.item.template.name,
          type: l.item.template.type,
          rarity: l.item.template.rarity,
          stats: l.item.template.stats,
          quality: l.item.quality,
        },
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-my-listings', req)) return;
    logRouteError(req, 500, 'Market my-listings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Remote Marketplace Helpers ---

async function hasGlobalPriceVisibility(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { professions: true },
  });
  if (!character) return false;

  // Harthfolk racial at level 25+
  if (character.race === 'HARTHFOLK' && character.level >= 25) return true;

  // Any Merchant profession
  if (character.professions.some((p: any) => p.professionType === 'MERCHANT')) return true;

  // Banker profession
  if (character.professions.some((p: any) => p.professionType === 'BANKER')) return true;

  return false;
}

// Check if character has Merchant profession at a minimum tier
async function getMerchantTier(characterId: string): Promise<string | null> {
  const profession = await prisma.playerProfession.findFirst({
    where: { characterId, professionType: 'MERCHANT', isActive: true },
  });
  return profession?.tier || null;
}

const TIER_RANK: Record<string, number> = {
  APPRENTICE: 1, JOURNEYMAN: 2, CRAFTSMAN: 3, EXPERT: 4, MASTER: 5, GRANDMASTER: 6
};

// GET /api/market/remote-browse
router.get('/remote-browse', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.query;
    if (!townId) return res.status(400).json({ error: 'townId required' });

    const character = req.character!;

    // Must have price visibility
    if (!(await hasGlobalPriceVisibility(character.id))) {
      return res.status(403).json({ error: 'No remote marketplace access. Requires Merchant or Banker profession, or Harthfolk racial.' });
    }

    const listings = await prisma.marketListing.findMany({
      where: { townId: townId as string },
      include: { item: { include: { template: true } }, seller: { select: { id: true, name: true } } },
      orderBy: { price: 'asc' },
    });

    return res.json({ townId, listings });
  } catch (error) {
    if (handlePrismaError(error, res, 'remote-browse', req)) return;
    logRouteError(req, 500, 'Remote browse error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/market/remote-buy
router.post('/remote-buy', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId required' });

    const character = req.character!;

    const merchantTier = await getMerchantTier(character.id);
    if (!merchantTier || (TIER_RANK[merchantTier] || 0) < 3) {
      return res.status(403).json({ error: 'Requires Merchant Craftsman (tier 3) or higher' });
    }

    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId },
      include: { item: true },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    // 10% markup for remote purchase
    const totalCost = Math.floor(listing.price * 1.10);
    if (character.gold < totalCost) {
      return res.status(400).json({ error: 'Insufficient gold', required: totalCost, available: character.gold });
    }

    // Deduct gold, remove listing, transfer item
    // For v1, item transfers immediately; in a full implementation it would be held in transit.
    await prisma.$transaction([
      prisma.character.update({ where: { id: character.id }, data: { gold: { decrement: totalCost } } }),
      prisma.character.update({ where: { id: listing.sellerId }, data: { gold: { increment: listing.price } } }),
      prisma.marketListing.delete({ where: { id: listingId } }),
      prisma.item.update({ where: { id: listing.itemId }, data: { ownerId: character.id } }),
    ]);

    return res.json({
      message: 'Remote purchase completed',
      totalCost,
      markup: totalCost - listing.price,
      itemId: listing.itemId,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'remote-buy', req)) return;
    logRouteError(req, 500, 'Remote buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/market/remote-instant-buy
router.post('/remote-instant-buy', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId required' });

    const character = req.character!;

    const merchantTier = await getMerchantTier(character.id);
    if (!merchantTier || (TIER_RANK[merchantTier] || 0) < 5) {
      return res.status(403).json({ error: 'Requires Merchant Master (tier 5) or higher' });
    }

    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId },
      include: { item: true },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    // 25% markup for instant remote
    const totalCost = Math.floor(listing.price * 1.25);
    if (character.gold < totalCost) {
      return res.status(400).json({ error: 'Insufficient gold', required: totalCost, available: character.gold });
    }

    await prisma.$transaction([
      prisma.character.update({ where: { id: character.id }, data: { gold: { decrement: totalCost } } }),
      prisma.character.update({ where: { id: listing.sellerId }, data: { gold: { increment: listing.price } } }),
      prisma.marketListing.delete({ where: { id: listingId } }),
      prisma.item.update({ where: { id: listing.itemId }, data: { ownerId: character.id } }),
    ]);

    return res.json({
      message: 'Instant remote purchase completed',
      totalCost,
      markup: totalCost - listing.price,
      itemId: listing.itemId,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'remote-instant-buy', req)) return;
    logRouteError(req, 500, 'Remote instant buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/market/prices-global
router.get('/prices-global', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemTemplateId } = req.query;
    if (!itemTemplateId) return res.status(400).json({ error: 'itemTemplateId required' });

    const character = req.character!;

    if (!(await hasGlobalPriceVisibility(character.id))) {
      return res.status(403).json({ error: 'No global price visibility' });
    }

    const listings = await prisma.marketListing.findMany({
      where: { item: { templateId: itemTemplateId as string } },
      include: { town: { select: { id: true, name: true } } },
    });

    // Aggregate by town
    const byTown: Record<string, { townId: string; townName: string; prices: number[]; count: number }> = {};
    for (const l of listings) {
      const key = l.townId;
      if (!byTown[key]) {
        byTown[key] = { townId: l.townId, townName: l.town.name, prices: [], count: 0 };
      }
      byTown[key].prices.push(l.price);
      byTown[key].count += l.quantity;
    }

    const result = Object.values(byTown).map(t => ({
      townId: t.townId,
      townName: t.townName,
      avgPrice: Math.round(t.prices.reduce((a, b) => a + b, 0) / t.prices.length),
      lowestPrice: Math.min(...t.prices),
      highestPrice: Math.max(...t.prices),
      listingCount: t.count,
    }));

    return res.json({ itemTemplateId, towns: result });
  } catch (error) {
    if (handlePrismaError(error, res, 'prices-global', req)) return;
    logRouteError(req, 500, 'Global prices error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/market/history
router.get('/history', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemTemplateId = req.query.itemTemplateId as string | undefined;
    const townId = req.query.townId as string | undefined;
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string, 10) || 30));

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Prisma.PriceHistoryWhereInput = {
      date: { gte: since },
      ...(itemTemplateId ? { itemTemplateId } : {}),
      ...(townId ? { townId } : {}),
    };

    const history = await prisma.priceHistory.findMany({
      where,
      include: {
        itemTemplate: { select: { id: true, name: true, type: true, rarity: true } },
        town: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    return res.json({
      history: history.map(h => ({
        id: h.id,
        date: h.date,
        avgPrice: h.avgPrice,
        volume: h.volume,
        itemTemplate: h.itemTemplate,
        town: h.town,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-history', req)) return;
    logRouteError(req, 500, 'Market history error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
