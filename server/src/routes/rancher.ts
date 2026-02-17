// ---------------------------------------------------------------------------
// Rancher Routes — Livestock Purchase & Management
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { getGameDay } from '../lib/game-day';
import {
  LIVESTOCK_DEFINITIONS,
  BUILDING_ANIMAL_MAP,
  PROFESSION_ASSET_TYPES,
} from '@shared/data/assets';

const router = Router();

// --- Schemas ---

const buyLivestockSchema = z.object({
  buildingId: z.string().uuid('Invalid building ID'),
  animalType: z.string().min(1, 'animalType is required'),
});

// ============================================================
// POST /api/rancher/buy-livestock — Purchase an animal for a building
// ============================================================

router.post('/buy-livestock', authGuard, characterGuard, requireTown, validate(buyLivestockSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { buildingId, animalType } = req.body;

    // 1. Validate animal type exists
    const livestockDef = LIVESTOCK_DEFINITIONS[animalType];
    if (!livestockDef) {
      return res.status(400).json({ error: `Unknown animal type: ${animalType}` });
    }

    // 2. Character must have RANCHER profession
    const rancherProf = await prisma.playerProfession.findFirst({
      where: { characterId: character.id, professionType: 'RANCHER', isActive: true },
    });
    if (!rancherProf) {
      return res.status(400).json({ error: 'You must have the RANCHER profession to buy livestock.' });
    }

    // 3. Find building, check ownership
    const building = await prisma.ownedAsset.findUnique({
      where: { id: buildingId },
      include: { livestock: { where: { isAlive: true } } },
    });
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }
    if (building.professionType !== 'RANCHER') {
      return res.status(400).json({ error: 'This is not a RANCHER building' });
    }

    // 4. Check building type matches animal type
    const allowedAnimals = BUILDING_ANIMAL_MAP[building.spotType];
    if (!allowedAnimals || !allowedAnimals.includes(animalType)) {
      return res.status(400).json({
        error: `A ${building.name} cannot house ${livestockDef.name}. Allowed: ${allowedAnimals?.join(', ') || 'none'}`,
      });
    }

    // 5. Check capacity
    const assetTypeDef = PROFESSION_ASSET_TYPES.RANCHER.find(t => t.spotType === building.spotType);
    const capacity = assetTypeDef?.capacity ?? 5;
    const aliveCount = building.livestock.length;
    if (aliveCount >= capacity) {
      return res.status(400).json({
        error: `Building is at capacity (${aliveCount}/${capacity}). No room for more animals.`,
      });
    }

    // 6. Must be in same town as building
    if (character.currentTownId !== building.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the building.' });
    }

    // 7. Check gold
    const price = livestockDef.price;
    if (character.gold < price) {
      return res.status(400).json({
        error: `Insufficient gold. Need ${price}g, have ${character.gold}g.`,
      });
    }

    // 8. Transaction: deduct gold + create livestock
    const currentDay = getGameDay();

    const [livestock] = await prisma.$transaction([
      prisma.livestock.create({
        data: {
          buildingId: building.id,
          ownerId: character.id,
          animalType,
          name: `${livestockDef.name} #${aliveCount + 1}`,
          purchasedAt: currentDay,
        },
      }),
      prisma.character.update({
        where: { id: character.id },
        data: { gold: { decrement: price } },
      }),
    ]);

    return res.status(201).json({
      success: true,
      livestock: {
        id: livestock.id,
        animalType: livestock.animalType,
        name: livestock.name,
        buildingId: livestock.buildingId,
        purchasedAt: livestock.purchasedAt,
      },
      goldRemaining: character.gold - price,
      message: `You purchased a ${livestockDef.name} for ${price}g.`,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'rancher-buy-livestock', req)) return;
    logRouteError(req, 500, 'Rancher buy-livestock error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/rancher/buildings — List RANCHER buildings + livestock summary
// ============================================================

router.get('/buildings', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const buildings = await prisma.ownedAsset.findMany({
      where: {
        ownerId: character.id,
        professionType: 'RANCHER',
      },
      include: {
        town: { select: { id: true, name: true } },
        livestock: {
          where: { isAlive: true },
          select: { id: true, animalType: true, name: true, age: true, hunger: true, health: true },
        },
      },
      orderBy: [{ tier: 'asc' }, { slotNumber: 'asc' }],
    });

    const result = buildings.map((b) => {
      const assetTypeDef = PROFESSION_ASSET_TYPES.RANCHER.find(t => t.spotType === b.spotType);
      const capacity = assetTypeDef?.capacity ?? 5;

      return {
        id: b.id,
        name: b.name,
        spotType: b.spotType,
        tier: b.tier,
        town: b.town,
        aliveCount: b.livestock.length,
        capacity,
        livestock: b.livestock,
      };
    });

    return res.json({ buildings: result, currentGameDay: getGameDay() });
  } catch (error) {
    if (handlePrismaError(error, res, 'rancher-buildings', req)) return;
    logRouteError(req, 500, 'Rancher buildings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/rancher/livestock/:buildingId — Detailed per-animal view
// ============================================================

router.get('/livestock/:buildingId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { buildingId } = req.params;

    // Verify building ownership
    const building = await prisma.ownedAsset.findUnique({ where: { id: buildingId } });
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    const livestock = await prisma.livestock.findMany({
      where: { buildingId },
      orderBy: [{ isAlive: 'desc' }, { purchasedAt: 'asc' }],
    });

    return res.json({
      buildingId,
      buildingName: building.name,
      livestock: livestock.map((l) => ({
        id: l.id,
        animalType: l.animalType,
        name: l.name,
        age: l.age,
        hunger: l.hunger,
        health: l.health,
        isAlive: l.isAlive,
        deathCause: l.deathCause,
        lastFedAt: l.lastFedAt,
        lastProducedAt: l.lastProducedAt,
        purchasedAt: l.purchasedAt,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'rancher-livestock-detail', req)) return;
    logRouteError(req, 500, 'Rancher livestock detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
