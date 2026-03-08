// ---------------------------------------------------------------------------
// Relocate Routes — Single-Town Residency: Change Home Town
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { characters, houses, houseStorage, livestock, ownedAssets, buildings, jobListings, towns, itemTemplates } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
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
    const oldHouse = oldHomeTownId ? await db.query.houses.findFirst({
      where: and(eq(houses.characterId, character.id), eq(houses.townId, oldHomeTownId)),
      with: {
        houseStorages: {
          with: { itemTemplate: { columns: { name: true } } },
        },
      },
    }) : null;

    const storageItems = (oldHouse?.houseStorages ?? []).map(s => ({
      itemTemplateId: s.itemTemplateId,
      itemName: s.itemTemplate.name,
      quantity: s.quantity,
    }));

    if (storageItems.length > 0) {
      const totalItems = storageItems.reduce((sum, s) => sum + s.quantity, 0);
      warnings.push(`You have ${storageItems.length} item type${storageItems.length !== 1 ? 's' : ''} (${totalItems} total) in storage. They will be LOST if not withdrawn first.`);
    }

    // Owned assets (fields, rancher buildings)
    const assets = oldHomeTownId ? await db.select({
      id: ownedAssets.id,
      spotType: ownedAssets.spotType,
      tier: ownedAssets.tier,
      cropState: ownedAssets.cropState,
      professionType: ownedAssets.professionType,
    }).from(ownedAssets).where(and(eq(ownedAssets.ownerId, character.id), eq(ownedAssets.townId, oldHomeTownId))) : [];

    // Livestock on owned buildings (rancher)
    const livestockRows = await db.select({
      id: livestock.id,
      animalType: livestock.animalType,
      name: livestock.name,
      buildingId: livestock.buildingId,
    }).from(livestock).where(eq(livestock.ownerId, character.id));

    // Buildings (workshops, etc.) in old home town
    const buildingRows = oldHomeTownId ? await db.select({
      id: buildings.id,
      type: buildings.type,
      name: buildings.name,
      level: buildings.level,
    }).from(buildings).where(and(eq(buildings.ownerId, character.id), eq(buildings.townId, oldHomeTownId))) : [];

    if (assets.length > 0) {
      warnings.push(`You will lose ${assets.length} field/asset${assets.length !== 1 ? 's' : ''}.`);
    }
    if (livestockRows.length > 0) {
      warnings.push(`You will lose ${livestockRows.length} animal${livestockRows.length !== 1 ? 's' : ''}.`);
    }
    if (buildingRows.length > 0) {
      warnings.push(`You will lose ${buildingRows.length} building${buildingRows.length !== 1 ? 's' : ''}.`);
    }

    // Get target town name
    const targetTown = await db.query.towns.findFirst({
      where: eq(towns.id, targetTownId),
      columns: { name: true },
    });

    const oldTown = oldHomeTownId ? await db.query.towns.findFirst({
      where: eq(towns.id, oldHomeTownId),
      columns: { name: true },
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
        livestock: livestockRows.map(l => ({
          id: l.id,
          animalType: l.animalType,
          name: l.name,
        })),
        buildings: buildingRows.map(b => ({
          id: b.id,
          type: b.type,
          name: b.name,
          level: b.level,
        })),
      },
      warnings,
    });
  } catch (error) {
    if (handleDbError(error, res, 'relocate-preview', req)) return;
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
    const freshChar = await db.query.characters.findFirst({
      where: eq(characters.id, character.id),
      columns: { gold: true, name: true, lastRelocationGameDay: true },
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
    await db.transaction(async (tx) => {
      // 1. Delete house storage items in old home
      if (oldHomeTownId) {
        const oldHouse = await tx.query.houses.findFirst({
          where: and(eq(houses.characterId, character.id), eq(houses.townId, oldHomeTownId)),
        });
        if (oldHouse) {
          await tx.delete(houseStorage).where(eq(houseStorage.houseId, oldHouse.id));
          await tx.delete(houses).where(eq(houses.id, oldHouse.id));
        }
      }

      // 2. Delete livestock on owned buildings
      await tx.delete(livestock).where(eq(livestock.ownerId, character.id));

      // 3. Delete owned assets (fields, rancher buildings)
      if (oldHomeTownId) {
        // Delete job listings associated with assets first
        const assetRows = await tx.select({ id: ownedAssets.id })
          .from(ownedAssets)
          .where(and(eq(ownedAssets.ownerId, character.id), eq(ownedAssets.townId, oldHomeTownId)));
        const assetIds = assetRows.map(a => a.id);

        if (assetIds.length > 0) {
          await tx.delete(jobListings).where(inArray(jobListings.assetId, assetIds));
        }

        await tx.delete(ownedAssets).where(and(eq(ownedAssets.ownerId, character.id), eq(ownedAssets.townId, oldHomeTownId)));
      }

      // 4. Delete buildings in old home town
      if (oldHomeTownId) {
        await tx.delete(buildings).where(and(eq(buildings.ownerId, character.id), eq(buildings.townId, oldHomeTownId)));
      }

      // 5. Update character: new home town, deduct gold, set cooldown
      await tx.update(characters)
        .set({
          homeTownId: targetTownId,
          gold: sql`${characters.gold} - ${RELOCATION_COST}`,
          lastRelocationGameDay: currentDay,
        })
        .where(eq(characters.id, character.id));
    });

    // 6. Create new house in new town (outside transaction for idempotent upsert)
    await giveStarterHouse(character.id, targetTownId, freshChar.name);

    // Fetch new house for response
    const newHouse = await db.query.houses.findFirst({
      where: and(eq(houses.characterId, character.id), eq(houses.townId, targetTownId)),
      columns: { id: true, name: true },
    });

    const targetTown = await db.query.towns.findFirst({
      where: eq(towns.id, targetTownId),
      columns: { name: true },
    });

    return res.json({
      success: true,
      newHomeTown: { id: targetTownId, name: targetTown?.name ?? 'Unknown' },
      goldRemaining: freshChar.gold - RELOCATION_COST,
      newHouse: newHouse ? { id: newHouse.id, name: newHouse.name } : null,
    });
  } catch (error) {
    if (handleDbError(error, res, 'relocate-confirm', req)) return;
    logRouteError(req, 500, 'Relocate confirm error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
