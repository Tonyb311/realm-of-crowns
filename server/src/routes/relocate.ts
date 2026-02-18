// ---------------------------------------------------------------------------
// Relocate Routes — Single-Town Residency: Change Home Town
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
import { getGameDay } from '../lib/game-day';
import { giveStarterHouse } from '../lib/starting-house';

const router = Router();

const RELOCATION_COST = 500;
const RELOCATION_COOLDOWN_DAYS = 30;

// --- Zod schemas ---

const relocateSchema = z.object({
  targetTownId: z.string().uuid('Invalid town ID'),
});

// ============================================================
// POST /api/relocate/preview — Preview what will be lost
// ============================================================

router.post('/preview', authGuard, characterGuard, validate(relocateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { targetTownId } = req.body;

    // Validations
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot relocate while traveling.' });
    }

    if (character.currentTownId !== targetTownId) {
      return res.status(400).json({ error: 'You must be in the target town to relocate there.' });
    }

    if (character.homeTownId === targetTownId) {
      return res.status(400).json({ error: 'You are already a resident of this town.' });
    }

    if (character.gold < RELOCATION_COST) {
      return res.status(400).json({
        error: `Not enough gold. Need ${RELOCATION_COST}g, have ${character.gold}g.`,
      });
    }

    // Cooldown check
    const currentDay = getGameDay();
    if (character.lastRelocationGameDay != null) {
      const daysSince = currentDay - character.lastRelocationGameDay;
      if (daysSince < RELOCATION_COOLDOWN_DAYS) {
        const remaining = RELOCATION_COOLDOWN_DAYS - daysSince;
        return res.status(400).json({
          error: `You must wait ${remaining} more day${remaining !== 1 ? 's' : ''} before relocating again.`,
        });
      }
    }

    // Query everything that will be lost
    const oldHomeTownId = character.homeTownId;
    const warnings: string[] = [];

    // Old house + storage
    const oldHouse = oldHomeTownId ? await prisma.house.findFirst({
      where: { characterId: character.id, townId: oldHomeTownId },
      include: {
        storage: {
          include: { itemTemplate: { select: { name: true } } },
        },
      },
    }) : null;

    const storageItems = (oldHouse?.storage ?? []).map(s => ({
      itemTemplateId: s.itemTemplateId,
      itemName: s.itemTemplate.name,
      quantity: s.quantity,
    }));

    if (storageItems.length > 0) {
      const totalItems = storageItems.reduce((sum, s) => sum + s.quantity, 0);
      warnings.push(`You have ${storageItems.length} item type${storageItems.length !== 1 ? 's' : ''} (${totalItems} total) in storage. They will be LOST if not withdrawn first.`);
    }

    // Owned assets (fields, rancher buildings)
    const assets = oldHomeTownId ? await prisma.ownedAsset.findMany({
      where: { ownerId: character.id, townId: oldHomeTownId },
      select: {
        id: true,
        spotType: true,
        tier: true,
        cropState: true,
        professionType: true,
      },
    }) : [];

    // Livestock on owned buildings (rancher)
    const livestock = await prisma.livestock.findMany({
      where: { ownerId: character.id },
      select: {
        id: true,
        animalType: true,
        name: true,
        buildingId: true,
      },
    });

    // Buildings (workshops, etc.) in old home town
    const buildings = oldHomeTownId ? await prisma.building.findMany({
      where: { ownerId: character.id, townId: oldHomeTownId },
      select: {
        id: true,
        type: true,
        name: true,
        level: true,
      },
    }) : [];

    if (assets.length > 0) {
      warnings.push(`You will lose ${assets.length} field/asset${assets.length !== 1 ? 's' : ''}.`);
    }
    if (livestock.length > 0) {
      warnings.push(`You will lose ${livestock.length} animal${livestock.length !== 1 ? 's' : ''}.`);
    }
    if (buildings.length > 0) {
      warnings.push(`You will lose ${buildings.length} building${buildings.length !== 1 ? 's' : ''}.`);
    }

    // Get target town name
    const targetTown = await prisma.town.findUnique({
      where: { id: targetTownId },
      select: { name: true },
    });

    const oldTown = oldHomeTownId ? await prisma.town.findUnique({
      where: { id: oldHomeTownId },
      select: { name: true },
    }) : null;

    return res.json({
      canRelocate: true,
      cost: RELOCATION_COST,
      cooldownDays: RELOCATION_COOLDOWN_DAYS,
      currentHomeTown: oldTown ? { id: oldHomeTownId, name: oldTown.name } : null,
      targetTown: { id: targetTownId, name: targetTown?.name ?? 'Unknown' },
      losses: {
        storageItems,
        assets: assets.map(a => ({
          id: a.id,
          spotType: a.spotType,
          tier: a.tier,
          cropState: a.cropState,
          professionType: a.professionType,
        })),
        livestock: livestock.map(l => ({
          id: l.id,
          animalType: l.animalType,
          name: l.name,
        })),
        buildings: buildings.map(b => ({
          id: b.id,
          type: b.type,
          name: b.name,
          level: b.level,
        })),
      },
      warnings,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'relocate-preview', req)) return;
    logRouteError(req, 500, 'Relocate preview error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/relocate/confirm — Execute the relocation
// ============================================================

router.post('/confirm', authGuard, characterGuard, validate(relocateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { targetTownId } = req.body;

    // Re-validate everything (don't trust preview)
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot relocate while traveling.' });
    }

    if (character.currentTownId !== targetTownId) {
      return res.status(400).json({ error: 'You must be in the target town to relocate there.' });
    }

    if (character.homeTownId === targetTownId) {
      return res.status(400).json({ error: 'You are already a resident of this town.' });
    }

    // Re-read gold from DB to prevent race conditions
    const freshChar = await prisma.character.findUnique({
      where: { id: character.id },
      select: { gold: true, name: true, lastRelocationGameDay: true },
    });

    if (!freshChar || freshChar.gold < RELOCATION_COST) {
      return res.status(400).json({
        error: `Not enough gold. Need ${RELOCATION_COST}g, have ${freshChar?.gold ?? 0}g.`,
      });
    }

    // Cooldown check
    const currentDay = getGameDay();
    if (freshChar.lastRelocationGameDay != null) {
      const daysSince = currentDay - freshChar.lastRelocationGameDay;
      if (daysSince < RELOCATION_COOLDOWN_DAYS) {
        const remaining = RELOCATION_COOLDOWN_DAYS - daysSince;
        return res.status(400).json({
          error: `You must wait ${remaining} more day${remaining !== 1 ? 's' : ''} before relocating again.`,
        });
      }
    }

    const oldHomeTownId = character.homeTownId;

    // Execute in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete house storage items in old home
      if (oldHomeTownId) {
        const oldHouse = await tx.house.findFirst({
          where: { characterId: character.id, townId: oldHomeTownId },
        });
        if (oldHouse) {
          await tx.houseStorage.deleteMany({ where: { houseId: oldHouse.id } });
          await tx.house.delete({ where: { id: oldHouse.id } });
        }
      }

      // 2. Delete livestock on owned buildings
      await tx.livestock.deleteMany({ where: { ownerId: character.id } });

      // 3. Delete owned assets (fields, rancher buildings)
      if (oldHomeTownId) {
        // Delete job listings associated with assets first
        const assetIds = (await tx.ownedAsset.findMany({
          where: { ownerId: character.id, townId: oldHomeTownId },
          select: { id: true },
        })).map(a => a.id);

        if (assetIds.length > 0) {
          await tx.jobListing.deleteMany({ where: { assetId: { in: assetIds } } });
        }

        await tx.ownedAsset.deleteMany({
          where: { ownerId: character.id, townId: oldHomeTownId },
        });
      }

      // 4. Delete buildings in old home town
      if (oldHomeTownId) {
        await tx.building.deleteMany({
          where: { ownerId: character.id, townId: oldHomeTownId },
        });
      }

      // 5. Update character: new home town, deduct gold, set cooldown
      await tx.character.update({
        where: { id: character.id },
        data: {
          homeTownId: targetTownId,
          gold: { decrement: RELOCATION_COST },
          lastRelocationGameDay: currentDay,
        },
      });
    });

    // 6. Create new house in new town (outside transaction for idempotent upsert)
    await giveStarterHouse(character.id, targetTownId, freshChar.name);

    // Fetch new house for response
    const newHouse = await prisma.house.findUnique({
      where: { characterId_townId: { characterId: character.id, townId: targetTownId } },
      select: { id: true, name: true },
    });

    const targetTown = await prisma.town.findUnique({
      where: { id: targetTownId },
      select: { name: true },
    });

    return res.json({
      success: true,
      newHomeTown: { id: targetTownId, name: targetTown?.name ?? 'Unknown' },
      goldRemaining: freshChar.gold - RELOCATION_COST,
      newHouse: newHouse ? { id: newHouse.id, name: newHouse.name } : null,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'relocate-confirm', req)) return;
    logRouteError(req, 500, 'Relocate confirm error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
