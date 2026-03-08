// ---------------------------------------------------------------------------
// Market Routes — Batch Auction System
// ---------------------------------------------------------------------------

import crypto from 'crypto';
import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, sql, count, inArray } from 'drizzle-orm';
import {
  marketListings,
  marketBuyOrders,
  inventories,
  items,
  itemTemplates,
  characters,
  characterEquipment,
  playerProfessions,
  tradeTransactions,
  priceHistories,
  townTreasuries,
  auctionCycles,
} from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getEffectiveTaxRate, getTradeRestrictions } from '../services/law-effects';
import { emitTradeCompleted } from '../socket/events';
import { cache } from '../middleware/cache';
import { invalidateCache } from '../lib/redis';
import { getPsionSpec, calculateSellerUrgency, calculatePriceTrend } from '../services/psion-perks';
import { handleDbError } from '../lib/db-errors';
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
  const profs = await db.query.playerProfessions.findMany({
    where: and(
      eq(playerProfessions.characterId, characterId),
      eq(playerProfessions.isActive, true),
    ),
    columns: { professionType: true },
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
    const inventoryEntry = await db.query.inventories.findFirst({
      where: and(
        eq(inventories.characterId, character.id),
        eq(inventories.itemId, itemId),
      ),
      with: { item: { with: { itemTemplate: true } } },
    });

    if (!inventoryEntry) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }

    if (inventoryEntry.quantity < quantity) {
      return res.status(400).json({ error: `Insufficient quantity. You have ${inventoryEntry.quantity}` });
    }

    // Check item is not equipped
    const equipped = await db.query.characterEquipment.findFirst({
      where: and(
        eq(characterEquipment.characterId, character.id),
        eq(characterEquipment.itemId, itemId),
      ),
    });
    if (equipped) {
      return res.status(400).json({ error: 'Cannot list an equipped item. Unequip it first.' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LISTING_DURATION_DAYS);

    // Transaction: create listing + reduce inventory
    const listing = await db.transaction(async (tx) => {
      const [newListing] = await tx.insert(marketListings).values({
        id: crypto.randomUUID(),
        sellerId: character.id,
        itemId,
        itemTemplateId: inventoryEntry.item.templateId,
        itemName: inventoryEntry.item.itemTemplate.name,
        price,
        quantity,
        townId: character.currentTownId!,
        status: 'active',
        expiresAt: expiresAt.toISOString(),
      }).returning();

      // Reduce or remove inventory
      if (inventoryEntry.quantity === quantity) {
        await tx.delete(inventories).where(eq(inventories.id, inventoryEntry.id));
      } else {
        await tx.update(inventories).set({
          quantity: sql`${inventories.quantity} - ${quantity}`,
        }).where(eq(inventories.id, inventoryEntry.id));
      }

      return newListing;
    });

    // Fetch listing with relations for response
    const listingWithRelations = await db.query.marketListings.findFirst({
      where: eq(marketListings.id, listing.id),
      with: {
        item: { with: { itemTemplate: true } },
      },
    });

    onMarketSell(character.id).catch((error: unknown) => {
      logRouteError(req, 500, 'Quest trigger failed after market sell', error);
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.status(201).json({ listing: listingWithRelations });
  } catch (error) {
    if (handleDbError(error, res, 'market-list', req)) return;
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
    if (handleDbError(error, res, 'market-list-preview', req)) return;
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

    // Drizzle doesn't support Prisma's nested where on relations in query API.
    // Load all active listings for this town, then filter in app code.
    const allListings = await db.query.marketListings.findMany({
      where: and(
        eq(marketListings.townId, townId),
        eq(marketListings.status, 'active'),
      ),
      with: {
        item: { with: { itemTemplate: true } },
        character: { columns: { id: true, name: true } },
        marketBuyOrders: true,
      },
      orderBy: (t, { desc, asc }) => {
        switch (sort) {
          case 'price_asc': return [asc(t.price)];
          case 'price_desc': return [desc(t.price)];
          case 'newest':
          default: return [desc(t.listedAt)];
        }
      },
    });

    // Filter: expiration, type, rarity, search, price range, beverage, potion
    const nowStr = now.toISOString();
    let filtered = allListings.filter(l => {
      if (l.expiresAt !== null && l.expiresAt <= nowStr) return false;
      const tmpl = l.item.itemTemplate;
      if (type && tmpl.type !== type) return false;
      if (rarity && tmpl.rarity !== rarity) return false;
      if (search && !tmpl.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (isBeverage && !tmpl.isBeverage) return false;
      if (isPotion && !tmpl.isPotion) return false;
      if (minPrice !== undefined && l.price < minPrice) return false;
      if (maxPrice !== undefined && l.price > maxPrice) return false;
      return true;
    });

    // Sort by rarity if requested (post-filter since it's on a nested field)
    if (sort === 'rarity') {
      const rarityOrder: Record<string, number> = { LEGENDARY: 5, EPIC: 4, SUPERIOR: 3, FINE: 2, COMMON: 1 };
      filtered.sort((a, b) => (rarityOrder[b.item.itemTemplate.rarity] ?? 0) - (rarityOrder[a.item.itemTemplate.rarity] ?? 0));
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    // Check if browsing character is a merchant (for bid count visibility)
    const professions = await getCharacterProfessionTypes(character.id);
    const characterIsMerchant = isMerchant(professions);

    // Build base listing data
    const baseListing = paginated.map(l => {
      const pendingOrderCount = l.marketBuyOrders.filter(o => o.status === 'pending').length;
      return {
        id: l.id,
        price: l.price,
        quantity: l.quantity,
        listedAt: l.listedAt,
        expiresAt: l.expiresAt,
        status: l.status,
        seller: l.character,
        sellerId: l.sellerId,
        item: {
          id: l.item.id,
          templateId: l.item.templateId,
          name: l.item.itemTemplate.name,
          type: l.item.itemTemplate.type,
          rarity: l.item.itemTemplate.rarity,
          description: l.item.itemTemplate.description,
          stats: l.item.itemTemplate.stats,
          quality: l.item.quality,
          currentDurability: l.item.currentDurability,
        },
        // Merchants see exact bid count; non-merchants see boolean
        ...(characterIsMerchant
          ? { bidCount: pendingOrderCount }
          : { hasMultipleBids: pendingOrderCount > 1 }),
      };
    });

    // Psion perk enrichment (personalized, not cached)
    const { isPsion, specialization } = await getPsionSpec(character.id);
    let enrichedListings: typeof baseListing = baseListing;

    if (isPsion && specialization === 'telepath') {
      enrichedListings = await Promise.all(
        baseListing.map(async (listing) => {
          const seller = await db.query.characters.findFirst({
            where: eq(characters.id, listing.sellerId),
            columns: { gold: true },
          });
          return {
            ...listing,
            psionInsight: {
              sellerUrgency: calculateSellerUrgency(new Date(listing.listedAt), seller?.gold ?? 1000),
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
    if (handleDbError(error, res, 'market-browse', req)) return;
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

    const listing = await db.query.marketListings.findFirst({
      where: eq(marketListings.id, listingId),
      with: {
        item: { with: { itemTemplate: true } },
        character: { columns: { id: true, name: true } },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is no longer active' });
    }

    if (listing.expiresAt && listing.expiresAt < new Date().toISOString()) {
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
    const existingOrder = await db.query.marketBuyOrders.findFirst({
      where: and(
        eq(marketBuyOrders.buyerId, character.id),
        eq(marketBuyOrders.listingId, listingId),
      ),
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
    const freshChar = await db.query.characters.findFirst({
      where: eq(characters.id, character.id),
      columns: { gold: true, escrowedGold: true },
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
    const order = await db.transaction(async (tx) => {
      // Escrow gold
      await tx.update(characters).set({
        escrowedGold: sql`${characters.escrowedGold} + ${bidPrice}`,
      }).where(eq(characters.id, character.id));

      // Create buy order
      const [newOrder] = await tx.insert(marketBuyOrders).values({
        id: crypto.randomUUID(),
        buyerId: character.id,
        listingId,
        bidPrice,
        status: 'pending',
        auctionCycleId: cycle.id,
      }).returning();

      return newOrder;
    });

    // Fetch order with listing relations for response
    const orderWithRelations = await db.query.marketBuyOrders.findFirst({
      where: eq(marketBuyOrders.id, order.id),
      with: {
        marketListing: {
          columns: { id: true, price: true, itemName: true, quantity: true },
          with: {
            character: { columns: { id: true, name: true } },
          },
        },
      },
    });

    await invalidateCache('cache:/api/market/browse*');

    return res.status(201).json({
      order: {
        id: order.id,
        listingId: order.listingId,
        bidPrice: order.bidPrice,
        status: order.status,
        placedAt: order.placedAt,
        listing: orderWithRelations ? {
          id: orderWithRelations.marketListing.id,
          price: orderWithRelations.marketListing.price,
          itemName: orderWithRelations.marketListing.itemName,
          quantity: orderWithRelations.marketListing.quantity,
          seller: orderWithRelations.marketListing.character,
        } : null,
        cycle: {
          id: cycle.id,
          cycleNumber: cycle.cycleNumber,
          startedAt: cycle.startedAt,
        },
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'market-buy', req)) return;
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

    const listing = await db.query.marketListings.findFirst({
      where: eq(marketListings.id, listingId),
      with: {
        marketBuyOrders: true,
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

    // Filter pending buy orders in app code
    const pendingOrders = listing.marketBuyOrders.filter(o => o.status === 'pending');

    await db.transaction(async (tx) => {
      // Refund all pending buy orders' escrow
      for (const order of pendingOrders) {
        await tx.update(characters).set({
          gold: sql`${characters.gold} + ${order.bidPrice}`,
          escrowedGold: sql`${characters.escrowedGold} - ${order.bidPrice}`,
        }).where(eq(characters.id, order.buyerId));

        await tx.update(marketBuyOrders).set({
          status: 'cancelled',
          resolvedAt: new Date().toISOString(),
        }).where(eq(marketBuyOrders.id, order.id));
      }

      // Return item to seller's inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: and(
          eq(inventories.characterId, character.id),
          eq(inventories.itemId, listing.itemId),
        ),
      });

      if (existingInv) {
        await tx.update(inventories).set({
          quantity: sql`${inventories.quantity} + ${listing.quantity}`,
        }).where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: listing.itemId,
          quantity: listing.quantity,
        });
      }

      // Mark listing as cancelled
      await tx.update(marketListings).set({
        status: 'cancelled',
      }).where(eq(marketListings.id, listingId));
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({ message: 'Listing cancelled, item returned, and all pending bids refunded' });
  } catch (error) {
    if (handleDbError(error, res, 'market-cancel-listing', req)) return;
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

    const order = await db.query.marketBuyOrders.findFirst({
      where: eq(marketBuyOrders.id, orderId),
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

    await db.transaction(async (tx) => {
      // Refund escrow
      await tx.update(characters).set({
        gold: sql`${characters.gold} + ${order.bidPrice}`,
        escrowedGold: sql`${characters.escrowedGold} - ${order.bidPrice}`,
      }).where(eq(characters.id, character.id));

      // Mark order as cancelled
      await tx.update(marketBuyOrders).set({
        status: 'cancelled',
        resolvedAt: new Date().toISOString(),
      }).where(eq(marketBuyOrders.id, orderId));
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({ message: 'Order cancelled and gold refunded' });
  } catch (error) {
    if (handleDbError(error, res, 'market-cancel-order', req)) return;
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

    const listings = await db.query.marketListings.findMany({
      where: eq(marketListings.sellerId, character.id),
      with: {
        item: { with: { itemTemplate: true } },
        town: { columns: { id: true, name: true } },
        marketBuyOrders: true,
      },
      orderBy: (t, { desc }) => [desc(t.listedAt)],
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
        pendingOrderCount: l.marketBuyOrders.filter(o => o.status === 'pending').length,
        item: {
          id: l.item.id,
          templateId: l.item.templateId,
          name: l.item.itemTemplate.name,
          type: l.item.itemTemplate.type,
          rarity: l.item.itemTemplate.rarity,
          stats: l.item.itemTemplate.stats,
          quality: l.item.quality,
        },
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'market-my-listings', req)) return;
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

    const orders = await db.query.marketBuyOrders.findMany({
      where: eq(marketBuyOrders.buyerId, character.id),
      with: {
        marketListing: {
          columns: { id: true, price: true, itemName: true, quantity: true, townId: true },
          with: {
            town: { columns: { id: true, name: true } },
            character: { columns: { id: true, name: true } },
          },
        },
      },
      orderBy: (t, { desc }) => [desc(t.placedAt)],
      limit: 50,
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
        listing: {
          id: o.marketListing.id,
          price: o.marketListing.price,
          itemName: o.marketListing.itemName,
          quantity: o.marketListing.quantity,
          townId: o.marketListing.townId,
          town: o.marketListing.town,
          seller: o.marketListing.character,
        },
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'market-my-orders', req)) return;
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
    const template = await db.query.itemTemplates.findFirst({
      where: eq(itemTemplates.id, itemTemplateId),
      columns: { name: true },
    });

    // Load transactions and filter by templateId in app code
    // (Prisma's nested where `item: { templateId }` not supported in Drizzle with)
    const allTransactions = await db.query.tradeTransactions.findMany({
      where: eq(tradeTransactions.townId, character.currentTownId),
      with: { item: { columns: { templateId: true } } },
      orderBy: (t, { desc }) => [desc(t.timestamp)],
    });

    const filteredTransactions = allTransactions
      .filter(t => t.item.templateId === itemTemplateId)
      .slice(0, queryLimit);

    return res.json({
      itemName: template?.name ?? 'Unknown',
      transactions: filteredTransactions.map(t => ({
        salePrice: t.price,
        soldAt: t.timestamp,
        quantity: t.quantity,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'market-price-history', req)) return;
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

    // Load all transactions where character is buyer or seller
    const allTransactions = await db.query.tradeTransactions.findMany({
      where: or(
        eq(tradeTransactions.buyerId, character.id),
        eq(tradeTransactions.sellerId, character.id),
      ),
      orderBy: (t, { desc }) => [desc(t.timestamp)],
      limit: 20,
      with: {
        item: { with: { itemTemplate: { columns: { name: true, type: true, rarity: true } } } },
        character_buyerId: { columns: { id: true, name: true } },
        character_sellerId: { columns: { id: true, name: true } },
        town: { columns: { id: true, name: true } },
      },
    });

    const results = allTransactions.map(t => ({
      id: t.id,
      role: t.buyerId === character.id ? 'buyer' : 'seller',
      itemName: t.item.itemTemplate.name,
      itemType: t.item.itemTemplate.type,
      itemRarity: t.item.itemTemplate.rarity,
      price: t.price,
      quantity: t.quantity,
      sellerFee: t.sellerFee,
      sellerNet: t.sellerNet,
      buyer: t.character_buyerId,
      seller: t.character_sellerId,
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
        ...new Set(allTransactions.map(t => t.item.templateId)),
      ].slice(0, 10);

      if (tradedTemplateIds.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const priceData = await db.query.priceHistories.findMany({
          where: and(
            inArray(priceHistories.itemTemplateId, tradedTemplateIds),
            eq(priceHistories.townId, character.currentTownId),
            sql`${priceHistories.date} >= ${thirtyDaysAgo}`,
          ),
          orderBy: (t, { desc }) => [desc(t.date)],
          with: {
            itemTemplate: { columns: { name: true } },
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
    if (handleDbError(error, res, 'market-results', req)) return;
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
    // Load buy orders with listing relation and filter in app code
    const pendingOrders = await db.query.marketBuyOrders.findMany({
      where: eq(marketBuyOrders.status, 'pending'),
      with: {
        marketListing: { columns: { townId: true, status: true } },
      },
    });
    const pendingOrderCount = pendingOrders.filter(
      o => o.marketListing.townId === character.currentTownId && o.marketListing.status === 'active'
    ).length;

    // Count active listings in town
    const [activeListingCountResult] = await db.select({ value: count() }).from(marketListings).where(
      and(
        eq(marketListings.townId, character.currentTownId),
        eq(marketListings.status, 'active'),
      ),
    );

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
      activeListingCount: activeListingCountResult.value,
    });
  } catch (error) {
    if (handleDbError(error, res, 'market-cycle-status', req)) return;
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

    const listing = await db.query.marketListings.findFirst({
      where: eq(marketListings.id, listingId),
      with: {
        marketBuyOrders: true,
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

    // Filter pending buy orders in app code
    const pendingOrders = listing.marketBuyOrders.filter(o => o.status === 'pending');

    await db.transaction(async (tx) => {
      // Refund all pending buy orders' escrow
      for (const order of pendingOrders) {
        await tx.update(characters).set({
          gold: sql`${characters.gold} + ${order.bidPrice}`,
          escrowedGold: sql`${characters.escrowedGold} - ${order.bidPrice}`,
        }).where(eq(characters.id, order.buyerId));

        await tx.update(marketBuyOrders).set({
          status: 'cancelled',
          resolvedAt: new Date().toISOString(),
        }).where(eq(marketBuyOrders.id, order.id));
      }

      // Return item to seller's inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: and(
          eq(inventories.characterId, character.id),
          eq(inventories.itemId, listing.itemId),
        ),
      });

      if (existingInv) {
        await tx.update(inventories).set({
          quantity: sql`${inventories.quantity} + ${listing.quantity}`,
        }).where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: listing.itemId,
          quantity: listing.quantity,
        });
      }

      await tx.update(marketListings).set({
        status: 'cancelled',
      }).where(eq(marketListings.id, listingId));
    });

    await invalidateCache('cache:/api/market/browse*');
    return res.json({ message: 'Listing cancelled and item returned to inventory' });
  } catch (error) {
    if (handleDbError(error, res, 'market-cancel', req)) return;
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
