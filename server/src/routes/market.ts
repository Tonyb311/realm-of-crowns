// ---------------------------------------------------------------------------
// Market Routes — Batch Auction System
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getEffectiveTaxRate, getTradeRestrictions } from '../services/law-effects';
import { emitTradeCompleted } from '../socket/events';
import { cache } from '../middleware/cache';
import { invalidateCache } from '../lib/redis';
import { getPsionSpec, calculateSellerUrgency, calculatePriceTrend } from '../services/psion-perks';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { isTownReleased } from '../lib/content-release';
import { onMarketSell, onMarketBuy } from '../services/quest-triggers';
import {
  LISTING_DURATION_DAYS,
  MARKET_CYCLE_DURATION_MS,
  getMarketFeeRate,
  calculateNetProceeds,
  isMerchant,
} from '@shared/data/market';
import { getOrCreateOpenCycle } from '../lib/auction-engine';

const router = Router();

// --- Schemas ---

const listSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  price: z.number().int().min(1, 'Price must be at least 1'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const buySchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  bidPrice: z.number().int().min(1, 'Bid price must be at least 1'),
});

const cancelSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
});

// --- Helpers ---

async function getCharacterProfessionTypes(characterId: string): Promise<string[]> {
  const profs = await prisma.playerProfession.findMany({
    where: { characterId, isActive: true },
    select: { professionType: true },
  });
  return profs.map(p => p.professionType);
}

// ============================================================
// POST /api/market/list — List an item for sale
// ============================================================

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
      include: { item: { include: { template: true } } },
    });

    if (!inventoryEntry) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }

    if (inventoryEntry.quantity < quantity) {
      return res.status(400).json({ error: `Insufficient quantity. You have ${inventoryEntry.quantity}` });
    }

    // Check item is not equipped
    const equipped = await prisma.characterEquipment.findFirst({
      where: { characterId: character.id, itemId },
    });
    if (equipped) {
      return res.status(400).json({ error: 'Cannot list an equipped item. Unequip it first.' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LISTING_DURATION_DAYS);

    const [listing] = await prisma.$transaction([
      prisma.marketListing.create({
        data: {
          sellerId: character.id,
          itemId,
          itemTemplateId: inventoryEntry.item.templateId,
          itemName: inventoryEntry.item.template.name,
          price,
          quantity,
          townId: character.currentTownId,
          status: 'active',
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

// ============================================================
// GET /api/market/list-preview — Preview net proceeds
// ============================================================

router.get('/list-preview', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const askingPrice = parseInt(req.query.askingPrice as string, 10);

    if (!askingPrice || askingPrice < 1) {
      return res.status(400).json({ error: 'askingPrice must be a positive integer' });
    }

    const professions = await getCharacterProfessionTypes(character.id);
    const feeRate = getMarketFeeRate(professions);
    const { fee: feeAmount, net: netProceeds } = calculateNetProceeds(askingPrice, feeRate);

    return res.json({
      askingPrice,
      feeRate,
      feeAmount,
      netProceeds,
      isMerchant: isMerchant(professions),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-list-preview', req)) return;
    logRouteError(req, 500, 'Market list-preview error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/market/browse — Browse LOCAL market only
// ============================================================

router.get('/browse', authGuard, characterGuard, cache(30), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // CRITICAL: Always use character's current town — no townId query param
    const townId = character.currentTownId;
    if (!townId) {
      return res.status(400).json({ error: 'You must be in a town to browse the market' });
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
    const isBeverage = req.query.isBeverage === 'true';
    const isPotion = req.query.isPotion === 'true';
    const sort = (req.query.sort as string) || 'newest';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const now = new Date();

    const where: Prisma.MarketListingWhereInput = {
      townId,
      status: 'active',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      item: {
        template: {
          ...(type ? { type: type as any } : {}),
          ...(rarity ? { rarity: rarity as any } : {}),
          ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
          ...(isBeverage ? { isBeverage: true } : {}),
          ...(isPotion ? { isPotion: true } : {}),
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
          _count: {
            select: {
              buyOrders: { where: { status: 'pending' } },
            },
          },
        },
      }),
      prisma.marketListing.count({ where }),
    ]);

    // Check if browsing character is a merchant (for bid count visibility)
    const professions = await getCharacterProfessionTypes(character.id);
    const characterIsMerchant = isMerchant(professions);

    // Build base listing data
    const baseListing = listings.map(l => ({
      id: l.id,
      price: l.price,
      quantity: l.quantity,
      listedAt: l.listedAt,
      expiresAt: l.expiresAt,
      status: l.status,
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
      // Merchants see exact bid count; non-merchants see boolean
      ...(characterIsMerchant
        ? { bidCount: l._count.buyOrders }
        : { hasMultipleBids: l._count.buyOrders > 1 }),
    }));

    // Psion perk enrichment (personalized, not cached)
    const { isPsion, specialization } = await getPsionSpec(character.id);
    let enrichedListings: typeof baseListing = baseListing;

    if (isPsion && specialization === 'telepath') {
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
      enrichedListings = await Promise.all(
        baseListing.map(async (listing) => {
          const trend = await calculatePriceTrend(listing.item.templateId, townId);
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

// ============================================================
// POST /api/market/buy — Place a buy order (bid)
// ============================================================

router.post('/buy', authGuard, characterGuard, validate(buySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId, bidPrice } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to place a buy order' });
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

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is no longer active' });
    }

    if (listing.expiresAt && listing.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Listing has expired' });
    }

    if (listing.sellerId === character.id) {
      return res.status(400).json({ error: 'You cannot bid on your own listing' });
    }

    if (character.currentTownId !== listing.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the listing' });
    }

    if (bidPrice < listing.price) {
      return res.status(400).json({ error: `Bid must be at least the asking price of ${listing.price}` });
    }

    // Check if buyer already has an order on this listing
    const existingOrder = await prisma.marketBuyOrder.findUnique({
      where: {
        buyerId_listingId: {
          buyerId: character.id,
          listingId,
        },
      },
    });
    if (existingOrder) {
      return res.status(400).json({ error: 'You already have an order on this listing' });
    }

    // Check trade restrictions (embargoes, war)
    const restrictions = await getTradeRestrictions(listing.townId, character.id, listing.sellerId);
    if (restrictions.blocked) {
      return res.status(403).json({ error: restrictions.reason });
    }

    // Check available gold (gold minus already escrowed)
    // Re-fetch to get the most current gold values
    const freshChar = await prisma.character.findUnique({
      where: { id: character.id },
      select: { gold: true, escrowedGold: true },
    });
    if (!freshChar) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const availableGold = freshChar.gold - freshChar.escrowedGold;
    if (availableGold < bidPrice) {
      return res.status(400).json({
        error: `Insufficient available gold. Need ${bidPrice}, have ${availableGold} available (${freshChar.gold} total, ${freshChar.escrowedGold} escrowed)`,
      });
    }

    // Get or create auction cycle for this town
    const cycle = await getOrCreateOpenCycle(listing.townId);

    // Create buy order in transaction (escrow gold)
    const order = await prisma.$transaction(async (tx) => {
      // Escrow gold
      await tx.character.update({
        where: { id: character.id },
        data: {
          escrowedGold: { increment: bidPrice },
        },
      });

      // Create buy order
      const newOrder = await tx.marketBuyOrder.create({
        data: {
          buyerId: character.id,
          listingId,
          bidPrice,
          status: 'pending',
          auctionCycleId: cycle.id,
        },
        include: {
          listing: {
            select: {
              id: true,
              price: true,
              itemName: true,
              quantity: true,
              seller: { select: { id: true, name: true } },
            },
          },
        },
      });

      return newOrder;
    });

    await invalidateCache('cache:/api/market/browse*');

    return res.status(201).json({
      order: {
        id: order.id,
        listingId: order.listingId,
        bidPrice: order.bidPrice,
        status: order.status,
        placedAt: order.placedAt,
        listing: order.listing,
        cycle: {
          id: cycle.id,
          cycleNumber: cycle.cycleNumber,
          startedAt: cycle.startedAt,
        },
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-buy', req)) return;
    logRouteError(req, 500, 'Market buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// DELETE /api/market/listings/:listingId — Cancel a listing
// ============================================================

router.delete('/listings/:listingId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId } = req.params;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId },
      include: {
        buyOrders: {
          where: { status: 'pending' },
          select: { id: true, buyerId: true, bidPrice: true },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.sellerId !== character.id) {
      return res.status(403).json({ error: 'This listing does not belong to you' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Can only cancel active listings' });
    }

    await prisma.$transaction(async (tx) => {
      // Refund all pending buy orders' escrow
      for (const order of listing.buyOrders) {
        await tx.character.update({
          where: { id: order.buyerId },
          data: {
            gold: { increment: order.bidPrice },
            escrowedGold: { decrement: order.bidPrice },
          },
        });

        await tx.marketBuyOrder.update({
          where: { id: order.id },
          data: { status: 'cancelled', resolvedAt: new Date() },
        });
      }

      // Return item to seller's inventory
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

      // Mark listing as cancelled
      await tx.marketListing.update({
        where: { id: listingId },
        data: { status: 'cancelled' },
      });
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({ message: 'Listing cancelled, item returned, and all pending bids refunded' });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-cancel-listing', req)) return;
    logRouteError(req, 500, 'Market cancel listing error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// DELETE /api/market/orders/:orderId — Cancel a buy order
// ============================================================

router.delete('/orders/:orderId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const character = req.character!;

    const order = await prisma.marketBuyOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.buyerId !== character.id) {
      return res.status(403).json({ error: 'This order does not belong to you' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending orders' });
    }

    await prisma.$transaction(async (tx) => {
      // Refund escrow
      await tx.character.update({
        where: { id: character.id },
        data: {
          gold: { increment: order.bidPrice },
          escrowedGold: { decrement: order.bidPrice },
        },
      });

      // Mark order as cancelled
      await tx.marketBuyOrder.update({
        where: { id: orderId },
        data: { status: 'cancelled', resolvedAt: new Date() },
      });
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({ message: 'Order cancelled and gold refunded' });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-cancel-order', req)) return;
    logRouteError(req, 500, 'Market cancel order error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/market/my-listings — Your active listings with order counts
// ============================================================

router.get('/my-listings', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const listings = await prisma.marketListing.findMany({
      where: { sellerId: character.id },
      include: {
        item: { include: { template: true } },
        town: { select: { id: true, name: true } },
        _count: {
          select: {
            buyOrders: { where: { status: 'pending' } },
          },
        },
      },
      orderBy: { listedAt: 'desc' },
    });

    return res.json({
      listings: listings.map(l => ({
        id: l.id,
        price: l.price,
        quantity: l.quantity,
        status: l.status,
        listedAt: l.listedAt,
        expiresAt: l.expiresAt,
        soldAt: l.soldAt,
        soldPrice: l.soldPrice,
        town: l.town,
        pendingOrderCount: l._count.buyOrders,
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

// ============================================================
// GET /api/market/my-orders — Your buy orders (pending and recent)
// ============================================================

router.get('/my-orders', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const orders = await prisma.marketBuyOrder.findMany({
      where: { buyerId: character.id },
      include: {
        listing: {
          select: {
            id: true,
            price: true,
            itemName: true,
            quantity: true,
            townId: true,
            town: { select: { id: true, name: true } },
            seller: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { placedAt: 'desc' },
      take: 50,
    });

    return res.json({
      orders: orders.map(o => ({
        id: o.id,
        bidPrice: o.bidPrice,
        status: o.status,
        priorityScore: o.priorityScore,
        rollResult: o.rollResult,
        rollBreakdown: o.rollBreakdown,
        placedAt: o.placedAt,
        resolvedAt: o.resolvedAt,
        listing: o.listing,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-my-orders', req)) return;
    logRouteError(req, 500, 'Market my-orders error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/market/price-history — MERCHANT ONLY
// ============================================================

router.get('/price-history', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const itemTemplateId = req.query.itemTemplateId as string | undefined;
    const queryLimit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    if (!itemTemplateId) {
      return res.status(400).json({ error: 'itemTemplateId is required' });
    }

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to view price history' });
    }

    // ACCESS CHECK: must be Merchant
    const professions = await getCharacterProfessionTypes(character.id);
    if (!isMerchant(professions)) {
      return res.status(403).json({ error: 'Only merchants can view market price history' });
    }

    // Get item template info
    const template = await prisma.itemTemplate.findUnique({
      where: { id: itemTemplateId },
      select: { name: true },
    });

    const transactions = await prisma.tradeTransaction.findMany({
      where: {
        item: { templateId: itemTemplateId },
        townId: character.currentTownId,
      },
      orderBy: { timestamp: 'desc' },
      take: queryLimit,
      select: {
        price: true,
        quantity: true,
        timestamp: true,
      },
    });

    return res.json({
      itemName: template?.name ?? 'Unknown',
      transactions: transactions.map(t => ({
        salePrice: t.price,
        soldAt: t.timestamp,
        quantity: t.quantity,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-price-history', req)) return;
    logRouteError(req, 500, 'Market price-history error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/market/results — Your recent auction results
// ============================================================

router.get('/results', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const transactions = await prisma.tradeTransaction.findMany({
      where: {
        OR: [
          { buyerId: character.id },
          { sellerId: character.id },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        item: { include: { template: { select: { name: true, type: true, rarity: true } } } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        town: { select: { id: true, name: true } },
      },
    });

    const results = transactions.map(t => ({
      id: t.id,
      role: t.buyerId === character.id ? 'buyer' : 'seller',
      itemName: t.item.template.name,
      itemType: t.item.template.type,
      itemRarity: t.item.template.rarity,
      price: t.price,
      quantity: t.quantity,
      sellerFee: t.sellerFee,
      sellerNet: t.sellerNet,
      buyer: t.buyer,
      seller: t.seller,
      town: t.town,
      timestamp: t.timestamp,
      auctionCycleId: t.auctionCycleId,
    }));

    // If character is MERCHANT, also include market trends
    const professions = await getCharacterProfessionTypes(character.id);
    let marketTrends: any[] | undefined;

    if (isMerchant(professions) && character.currentTownId) {
      // Get unique item template IDs from this character's recent trades
      const tradedTemplateIds = [
        ...new Set(transactions.map(t => t.item.templateId)),
      ].slice(0, 10);

      if (tradedTemplateIds.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const priceData = await prisma.priceHistory.findMany({
          where: {
            itemTemplateId: { in: tradedTemplateIds },
            townId: character.currentTownId,
            date: { gte: thirtyDaysAgo },
          },
          orderBy: { date: 'desc' },
          include: {
            itemTemplate: { select: { name: true } },
          },
        });

        marketTrends = priceData.map(ph => ({
          itemTemplateId: ph.itemTemplateId,
          itemName: ph.itemTemplate.name,
          date: ph.date,
          avgPrice: ph.avgPrice,
          volume: ph.volume,
        }));
      }
    }

    return res.json({
      results,
      ...(marketTrends ? { marketTrends } : {}),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-results', req)) return;
    logRouteError(req, 500, 'Market results error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/market/cycle-status — Current cycle info
// ============================================================

router.get('/cycle-status', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to view cycle status' });
    }

    const cycle = await getOrCreateOpenCycle(character.currentTownId);

    const cycleAgeMs = Date.now() - new Date(cycle.startedAt).getTime();
    const timeRemainingMs = Math.max(0, MARKET_CYCLE_DURATION_MS - cycleAgeMs);

    // Count pending orders in this town's active listings
    const pendingOrderCount = await prisma.marketBuyOrder.count({
      where: {
        status: 'pending',
        listing: {
          townId: character.currentTownId,
          status: 'active',
        },
      },
    });

    // Count active listings in town
    const activeListingCount = await prisma.marketListing.count({
      where: {
        townId: character.currentTownId,
        status: 'active',
      },
    });

    return res.json({
      cycle: {
        id: cycle.id,
        cycleNumber: cycle.cycleNumber,
        startedAt: cycle.startedAt,
        status: cycle.status,
      },
      timeRemainingMs,
      timeRemainingMinutes: Math.ceil(timeRemainingMs / 60_000),
      pendingOrderCount,
      activeListingCount,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-cycle-status', req)) return;
    logRouteError(req, 500, 'Market cycle-status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/market/cancel — Backwards-compatible listing cancellation
// ============================================================

router.post('/cancel', authGuard, characterGuard, validate(cancelSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId },
      include: {
        buyOrders: {
          where: { status: 'pending' },
          select: { id: true, buyerId: true, bidPrice: true },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.sellerId !== character.id) {
      return res.status(403).json({ error: 'This listing does not belong to you' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Can only cancel active listings' });
    }

    await prisma.$transaction(async (tx) => {
      // Refund all pending buy orders' escrow
      for (const order of listing.buyOrders) {
        await tx.character.update({
          where: { id: order.buyerId },
          data: {
            gold: { increment: order.bidPrice },
            escrowedGold: { decrement: order.bidPrice },
          },
        });

        await tx.marketBuyOrder.update({
          where: { id: order.id },
          data: { status: 'cancelled', resolvedAt: new Date() },
        });
      }

      // Return item to seller's inventory
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

      await tx.marketListing.update({
        where: { id: listingId },
        data: { status: 'cancelled' },
      });
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({ message: 'Listing cancelled and item returned to inventory' });
  } catch (error) {
    if (handlePrismaError(error, res, 'market-cancel', req)) return;
    logRouteError(req, 500, 'Market cancel error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// Removed endpoints — return 410 Gone
// ============================================================

router.get('/remote-browse', authGuard, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({ error: 'Remote browsing has been removed. Market is local only.' });
});

router.post('/remote-buy', authGuard, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({ error: 'Remote buying has been removed. Market is local only.' });
});

router.post('/remote-instant-buy', authGuard, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({ error: 'Remote instant buying has been removed. Market is local only.' });
});

router.get('/prices-global', authGuard, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({ error: 'Global price browsing has been removed. Use /price-history (merchant only).' });
});

router.get('/history', authGuard, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({ error: 'Public price history has been removed. Use /price-history (merchant only).' });
});

export default router;
