// ---------------------------------------------------------------------------
// Houses Routes — Basic Housing System with Storage Rooms
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
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

    const houses = await prisma.house.findMany({
      where: { characterId: character.id },
      include: {
        town: { select: { id: true, name: true } },
        storage: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      houses: houses.map(h => ({
        id: h.id,
        townId: h.town.id,
        townName: h.town.name,
        tier: h.tier,
        name: h.name,
        storageSlots: h.storageSlots,
        storageUsed: h.storage.length,
        isCurrentTown: h.townId === character.currentTownId,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'houses-mine', req)) return;
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

    const house = await prisma.house.findUnique({
      where: { characterId_townId: { characterId: character.id, townId } },
      include: {
        town: { select: { id: true, name: true } },
        storage: true,
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
        storageUsed: house.storage.length,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'houses-town-check', req)) return;
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

    const house = await prisma.house.findUnique({
      where: { id: houseId },
      include: {
        town: { select: { id: true, name: true } },
        storage: {
          include: { itemTemplate: { select: { id: true, name: true, type: true, rarity: true } } },
          orderBy: { itemTemplate: { name: 'asc' } },
        },
      },
    });

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.characterId !== character.id) {
      return res.status(403).json({ error: 'You do not own this house' });
    }

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
        used: house.storage.length,
        items: house.storage.map(s => ({
          itemTemplateId: s.itemTemplateId,
          itemName: s.itemTemplate.name,
          itemType: s.itemTemplate.type,
          itemRarity: s.itemTemplate.rarity,
          quantity: s.quantity,
        })),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'houses-storage-view', req)) return;
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

    const house = await prisma.house.findUnique({
      where: { id: houseId },
      include: { storage: true },
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
    const existingSlot = house.storage.find(s => s.itemTemplateId === itemTemplateId);
    if (!existingSlot && house.storage.length >= house.storageSlots) {
      return res.status(400).json({ error: `Storage is full (${house.storageSlots} slots). Clear some items first.` });
    }

    // Find the item(s) in inventory matching this template
    const inventoryEntries = await prisma.inventory.findMany({
      where: {
        characterId: character.id,
        item: { templateId: itemTemplateId },
      },
      include: { item: { include: { template: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const totalAvailable = inventoryEntries.reduce((sum, e) => sum + e.quantity, 0);
    if (totalAvailable < quantity) {
      return res.status(400).json({
        error: `Not enough items in inventory. Need ${quantity}, have ${totalAvailable}.`,
      });
    }

    // Transaction: remove from inventory, add to storage
    await prisma.$transaction(async (tx) => {
      // Remove from inventory entries (consume from oldest first)
      let remaining = quantity;
      for (const entry of inventoryEntries) {
        if (remaining <= 0) break;
        if (entry.quantity <= remaining) {
          remaining -= entry.quantity;
          await tx.inventory.delete({ where: { id: entry.id } });
        } else {
          await tx.inventory.update({
            where: { id: entry.id },
            data: { quantity: { decrement: remaining } },
          });
          remaining = 0;
        }
      }

      // Upsert storage slot
      await tx.houseStorage.upsert({
        where: {
          houseId_itemTemplateId: { houseId: house.id, itemTemplateId },
        },
        update: { quantity: { increment: quantity } },
        create: { houseId: house.id, itemTemplateId, quantity },
      });
    });

    // Fetch updated storage count
    const updatedCount = await prisma.houseStorage.count({ where: { houseId: house.id } });
    const itemName = inventoryEntries[0]?.item.template.name ?? 'Unknown';

    return res.json({
      deposited: { itemTemplateId, itemName, quantity },
      storageUsed: updatedCount,
      storageCapacity: house.storageSlots,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'houses-storage-deposit', req)) return;
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

    const house = await prisma.house.findUnique({ where: { id: houseId } });

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.characterId !== character.id) {
      return res.status(403).json({ error: 'You do not own this house' });
    }
    if (house.townId !== character.currentTownId) {
      return res.status(400).json({ error: 'You must be in the same town as your house to withdraw items.' });
    }

    const storageEntry = await prisma.houseStorage.findUnique({
      where: { houseId_itemTemplateId: { houseId: house.id, itemTemplateId } },
      include: { itemTemplate: { select: { id: true, name: true } } },
    });

    if (!storageEntry || storageEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough in storage. Need ${quantity}, have ${storageEntry?.quantity ?? 0}.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      // Decrement or delete storage entry
      if (storageEntry.quantity <= quantity) {
        await tx.houseStorage.delete({ where: { id: storageEntry.id } });
      } else {
        await tx.houseStorage.update({
          where: { id: storageEntry.id },
          data: { quantity: { decrement: quantity } },
        });
      }

      // Create an Item instance from the template and add to inventory
      const item = await tx.item.create({
        data: {
          templateId: itemTemplateId,
          ownerId: character.id,
          quality: 'COMMON',
        },
      });

      // Try to stack onto existing inventory entry
      const existingInv = await tx.inventory.findFirst({
        where: { characterId: character.id, item: { templateId: itemTemplateId } },
      });

      if (existingInv) {
        await tx.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: { increment: quantity } },
        });
        // Delete the extra item since we're stacking
        await tx.item.delete({ where: { id: item.id } });
      } else {
        await tx.inventory.create({
          data: {
            characterId: character.id,
            itemId: item.id,
            quantity,
          },
        });
      }
    });

    const updatedCount = await prisma.houseStorage.count({ where: { houseId: house.id } });

    return res.json({
      withdrawn: { itemTemplateId, itemName: storageEntry.itemTemplate.name, quantity },
      storageUsed: updatedCount,
      storageCapacity: house.storageSlots,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'houses-storage-withdraw', req)) return;
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

    const house = await prisma.house.findUnique({
      where: { id: houseId },
      include: { town: { select: { id: true, name: true } } },
    });

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.characterId !== character.id) {
      return res.status(403).json({ error: 'You do not own this house' });
    }

    const storageEntry = await prisma.houseStorage.findUnique({
      where: { houseId_itemTemplateId: { houseId: house.id, itemTemplateId } },
      include: { itemTemplate: { select: { id: true, name: true } } },
    });

    if (!storageEntry || storageEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough in storage. Need ${quantity}, have ${storageEntry?.quantity ?? 0}.`,
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LISTING_DURATION_DAYS);

    const result = await prisma.$transaction(async (tx) => {
      // Decrement or delete storage entry
      if (storageEntry.quantity <= quantity) {
        await tx.houseStorage.delete({ where: { id: storageEntry.id } });
      } else {
        await tx.houseStorage.update({
          where: { id: storageEntry.id },
          data: { quantity: { decrement: quantity } },
        });
      }

      // Create an Item from the template for the listing
      const item = await tx.item.create({
        data: {
          templateId: itemTemplateId,
          ownerId: character.id,
          quality: 'COMMON',
        },
      });

      // Create the market listing in the house's town
      const listing = await tx.marketListing.create({
        data: {
          sellerId: character.id,
          itemId: item.id,
          itemTemplateId,
          itemName: storageEntry.itemTemplate.name,
          price,
          quantity,
          townId: house.townId,
          status: 'active',
          expiresAt,
        },
      });

      return listing;
    });

    await invalidateCache('cache:/api/market/browse*');

    const updatedCount = await prisma.houseStorage.count({ where: { houseId: house.id } });

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
    if (handlePrismaError(error, res, 'houses-storage-list', req)) return;
    logRouteError(req, 500, 'List from house storage error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
