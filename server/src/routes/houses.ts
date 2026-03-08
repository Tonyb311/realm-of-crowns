// ---------------------------------------------------------------------------
// Houses Routes — Basic Housing System with Storage Rooms
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, asc, sql, count } from 'drizzle-orm';
import { houses, houseStorage, inventories, items, marketListings, itemTemplates } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';
import { LISTING_DURATION_DAYS } from '@shared/data/market';
import { invalidateCache } from '../lib/redis';

const router = Router();

// --- Zod schemas ---

const depositSchema = z.object({
  itemTemplateId: z.string().min(1, 'itemTemplateId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const withdrawSchema = z.object({
  itemTemplateId: z.string().min(1, 'itemTemplateId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const listOnMarketSchema = z.object({
  itemTemplateId: z.string().min(1, 'itemTemplateId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().int().min(1, 'Price must be at least 1'),
});

// ============================================================
// GET /api/houses/mine — List all houses owned by character
// ============================================================

router.get('/mine', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const houseRows = await db.query.houses.findMany({
      where: eq(houses.characterId, character.id),
      with: {
        town: { columns: { id: true, name: true } },
        houseStorages: true,
      },
      orderBy: asc(houses.createdAt),
    });

    return res.json({
      houses: houseRows.map(h => ({
        id: h.id,
        townId: h.town.id,
        townName: h.town.name,
        tier: h.tier,
        name: h.name,
        storageSlots: h.storageSlots,
        storageUsed: h.houseStorages.length,
        isCurrentTown: h.townId === character.currentTownId,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'houses-mine', req)) return;
    logRouteError(req, 500, 'List houses error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/houses/town/:townId — Check if player has a house in a town
// ============================================================

router.get('/town/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.params;

    const house = await db.query.houses.findFirst({
      where: and(eq(houses.characterId, character.id), eq(houses.townId, townId)),
      with: {
        town: { columns: { id: true, name: true } },
        houseStorages: true,
      },
    });

    if (!house) {
      return res.json({ hasHouse: false });
    }

    return res.json({
      hasHouse: true,
      isHomeTown: character.homeTownId === townId,
      house: {
        id: house.id,
        townId: house.town.id,
        townName: house.town.name,
        tier: house.tier,
        name: house.name,
        storageSlots: house.storageSlots,
        storageUsed: house.houseStorages.length,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'houses-town-check', req)) return;
    logRouteError(req, 500, 'Check house in town error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/houses/buy — DISABLED (single-town residency model)
// ============================================================

router.post('/buy', authGuard, characterGuard, async (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({
    error: 'House purchasing has been removed. You get a free house in your home town. Use the relocation system to change your resident town.',
  });
});

// ============================================================
// GET /api/houses/:houseId/storage — View storage contents
// ============================================================

router.get('/:houseId/storage', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { houseId } = req.params;

    const house = await db.query.houses.findFirst({
      where: eq(houses.id, houseId),
      with: {
        town: { columns: { id: true, name: true } },
        houseStorages: {
          with: { itemTemplate: { columns: { id: true, name: true, type: true, rarity: true } } },
        },
      },
    });

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.characterId !== character.id) {
      return res.status(403).json({ error: 'You do not own this house' });
    }

    // Sort by item name (Drizzle with: doesn't support nested orderBy)
    const sortedStorage = house.houseStorages.sort((a, b) =>
      a.itemTemplate.name.localeCompare(b.itemTemplate.name)
    );

    return res.json({
      house: {
        id: house.id,
        name: house.name,
        townId: house.town.id,
        townName: house.town.name,
        tier: house.tier,
        storageSlots: house.storageSlots,
      },
      storage: {
        capacity: house.storageSlots,
        used: sortedStorage.length,
        items: sortedStorage.map(s => ({
          itemTemplateId: s.itemTemplateId,
          itemName: s.itemTemplate.name,
          itemType: s.itemTemplate.type,
          itemRarity: s.itemTemplate.rarity,
          quantity: s.quantity,
        })),
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'houses-storage-view', req)) return;
    logRouteError(req, 500, 'View house storage error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/houses/:houseId/storage/deposit — Deposit items from inventory
// ============================================================

router.post('/:houseId/storage/deposit', authGuard, characterGuard, validate(depositSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { houseId } = req.params;
    const { itemTemplateId, quantity } = req.body;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    const house = await db.query.houses.findFirst({
      where: eq(houses.id, houseId),
      with: { houseStorages: true },
    });

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.characterId !== character.id) {
      return res.status(403).json({ error: 'You do not own this house' });
    }
    if (house.townId !== character.currentTownId) {
      return res.status(400).json({ error: 'You must be in the same town as your house to deposit items.' });
    }

    // Check slot limit — only if this is a new item type
    const existingSlot = house.houseStorages.find(s => s.itemTemplateId === itemTemplateId);
    if (!existingSlot && house.houseStorages.length >= house.storageSlots) {
      return res.status(400).json({ error: `Storage is full (${house.storageSlots} slots). Clear some items first.` });
    }

    // Find the item(s) in inventory matching this template
    // Drizzle doesn't support nested where on relations, so join manually
    const inventoryEntries = await db.query.inventories.findMany({
      where: eq(inventories.characterId, character.id),
      with: { item: { with: { itemTemplate: true } } },
      orderBy: asc(inventories.createdAt),
    });
    const matchingEntries = inventoryEntries.filter(e => e.item.itemTemplate.id === itemTemplateId);

    const totalAvailable = matchingEntries.reduce((sum, e) => sum + e.quantity, 0);
    if (totalAvailable < quantity) {
      return res.status(400).json({
        error: `Not enough items in inventory. Need ${quantity}, have ${totalAvailable}.`,
      });
    }

    // Transaction: remove from inventory, add to storage
    await db.transaction(async (tx) => {
      // Remove from inventory entries (consume from oldest first)
      let remaining = quantity;
      for (const entry of matchingEntries) {
        if (remaining <= 0) break;
        if (entry.quantity <= remaining) {
          remaining -= entry.quantity;
          await tx.delete(inventories).where(eq(inventories.id, entry.id));
        } else {
          await tx.update(inventories)
            .set({ quantity: sql`${inventories.quantity} - ${remaining}` })
            .where(eq(inventories.id, entry.id));
          remaining = 0;
        }
      }

      // Upsert storage slot
      if (existingSlot) {
        await tx.update(houseStorage)
          .set({ quantity: sql`${houseStorage.quantity} + ${quantity}` })
          .where(and(eq(houseStorage.houseId, house.id), eq(houseStorage.itemTemplateId, itemTemplateId)));
      } else {
        await tx.insert(houseStorage).values({ id: crypto.randomUUID(), houseId: house.id, itemTemplateId, quantity });
      }
    });

    // Fetch updated storage count
    const [countResult] = await db.select({ value: count() }).from(houseStorage).where(eq(houseStorage.houseId, house.id));
    const updatedCount = countResult.value;
    const itemName = matchingEntries[0]?.item.itemTemplate.name ?? 'Unknown';

    return res.json({
      deposited: { itemTemplateId, itemName, quantity },
      storageUsed: updatedCount,
      storageCapacity: house.storageSlots,
    });
  } catch (error) {
    if (handleDbError(error, res, 'houses-storage-deposit', req)) return;
    logRouteError(req, 500, 'Deposit to house storage error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/houses/:houseId/storage/withdraw — Withdraw items to inventory
// ============================================================

router.post('/:houseId/storage/withdraw', authGuard, characterGuard, validate(withdrawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { houseId } = req.params;
    const { itemTemplateId, quantity } = req.body;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    const house = await db.query.houses.findFirst({ where: eq(houses.id, houseId) });

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.characterId !== character.id) {
      return res.status(403).json({ error: 'You do not own this house' });
    }
    if (house.townId !== character.currentTownId) {
      return res.status(400).json({ error: 'You must be in the same town as your house to withdraw items.' });
    }

    const storageEntry = await db.query.houseStorage.findFirst({
      where: and(eq(houseStorage.houseId, house.id), eq(houseStorage.itemTemplateId, itemTemplateId)),
      with: { itemTemplate: { columns: { id: true, name: true } } },
    });

    if (!storageEntry || storageEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough in storage. Need ${quantity}, have ${storageEntry?.quantity ?? 0}.`,
      });
    }

    await db.transaction(async (tx) => {
      // Decrement or delete storage entry
      if (storageEntry.quantity <= quantity) {
        await tx.delete(houseStorage).where(eq(houseStorage.id, storageEntry.id));
      } else {
        await tx.update(houseStorage)
          .set({ quantity: sql`${houseStorage.quantity} - ${quantity}` })
          .where(eq(houseStorage.id, storageEntry.id));
      }

      // Create an Item instance from the template and add to inventory
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: itemTemplateId,
        ownerId: character.id,
        quality: 'COMMON',
      }).returning();

      // Try to stack onto existing inventory entry
      // Drizzle doesn't support nested where on relations in findFirst, so load and filter
      const invEntries = await tx.query.inventories.findMany({
        where: eq(inventories.characterId, character.id),
        with: { item: true },
      });
      const existingInv = invEntries.find(e => e.item.templateId === itemTemplateId);

      if (existingInv) {
        await tx.update(inventories)
          .set({ quantity: sql`${inventories.quantity} + ${quantity}` })
          .where(eq(inventories.id, existingInv.id));
        // Delete the extra item since we're stacking
        await tx.delete(items).where(eq(items.id, item.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: item.id,
          quantity,
        });
      }
    });

    const [countResult] = await db.select({ value: count() }).from(houseStorage).where(eq(houseStorage.houseId, house.id));
    const updatedCount = countResult.value;

    return res.json({
      withdrawn: { itemTemplateId, itemName: storageEntry.itemTemplate.name, quantity },
      storageUsed: updatedCount,
      storageCapacity: house.storageSlots,
    });
  } catch (error) {
    if (handleDbError(error, res, 'houses-storage-withdraw', req)) return;
    logRouteError(req, 500, 'Withdraw from house storage error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/houses/:houseId/storage/list — List storage items on town market (REMOTE OK)
// ============================================================

router.post('/:houseId/storage/list', authGuard, characterGuard, validate(listOnMarketSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { houseId } = req.params;
    const { itemTemplateId, quantity, price } = req.body;

    // No location requirement — remote listing is the feature

    const house = await db.query.houses.findFirst({
      where: eq(houses.id, houseId),
      with: { town: { columns: { id: true, name: true } } },
    });

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.characterId !== character.id) {
      return res.status(403).json({ error: 'You do not own this house' });
    }

    const storageEntry = await db.query.houseStorage.findFirst({
      where: and(eq(houseStorage.houseId, house.id), eq(houseStorage.itemTemplateId, itemTemplateId)),
      with: { itemTemplate: { columns: { id: true, name: true } } },
    });

    if (!storageEntry || storageEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough in storage. Need ${quantity}, have ${storageEntry?.quantity ?? 0}.`,
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LISTING_DURATION_DAYS);

    const result = await db.transaction(async (tx) => {
      // Decrement or delete storage entry
      if (storageEntry.quantity <= quantity) {
        await tx.delete(houseStorage).where(eq(houseStorage.id, storageEntry.id));
      } else {
        await tx.update(houseStorage)
          .set({ quantity: sql`${houseStorage.quantity} - ${quantity}` })
          .where(eq(houseStorage.id, storageEntry.id));
      }

      // Create an Item from the template for the listing
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: itemTemplateId,
        ownerId: character.id,
        quality: 'COMMON',
      }).returning();

      // Create the market listing in the house's town
      const [listing] = await tx.insert(marketListings).values({
        id: crypto.randomUUID(),
        sellerId: character.id,
        itemId: item.id,
        itemTemplateId,
        itemName: storageEntry.itemTemplate.name,
        price,
        quantity,
        townId: house.townId,
        status: 'active',
        expiresAt: expiresAt.toISOString(),
      }).returning();

      return listing;
    });

    await invalidateCache('cache:/api/market/browse*');

    const [countResult] = await db.select({ value: count() }).from(houseStorage).where(eq(houseStorage.houseId, house.id));
    const updatedCount = countResult.value;

    return res.status(201).json({
      listing: {
        id: result.id,
        itemName: storageEntry.itemTemplate.name,
        price,
        quantity,
        townId: house.townId,
        townName: house.town.name,
      },
      storageUsed: updatedCount,
      storageCapacity: house.storageSlots,
    });
  } catch (error) {
    if (handleDbError(error, res, 'houses-storage-list', req)) return;
    logRouteError(req, 500, 'List from house storage error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
