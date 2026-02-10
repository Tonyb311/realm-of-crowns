import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { Race } from '@prisma/client';

import * as changelingService from '../services/changeling-service';
import * as forgebornService from '../services/forgeborn-service';
import * as merfolkService from '../services/merfolk-service';
import * as nightborneService from '../services/nightborne-service';
import * as faefolkService from '../services/faefolk-service';
import * as revenantService from '../services/revenant-service';

const router = Router();

// =========================================================================
// Helpers
// =========================================================================

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId } });
}

// =========================================================================
// Zod Schemas
// =========================================================================

const changelingShiftSchema = z.object({
  targetRace: z.nativeEnum(Race),
  targetName: z.string().min(1).max(50).optional(),
});

const forgebornMaintainSchema = z.object({
  repairKitItemId: z.string().uuid('Invalid item ID'),
});

// =========================================================================
// CHANGELING
// =========================================================================

// GET /api/special-mechanics/changeling/status
router.get('/changeling/status', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'CHANGELING') return res.status(400).json({ error: 'Not a Changeling' });

    const [appearance, canFool, veilAccess] = await Promise.all([
      changelingService.getCurrentAppearance(character.id),
      changelingService.canFoolDetection(character.id),
      changelingService.hasVeilNetworkAccess(character.id),
    ]);

    return res.json({
      appearance,
      canFoolDetection: canFool,
      hasVeilNetworkAccess: veilAccess,
      level: character.level,
    });
  } catch (error) {
    console.error('Changeling status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/special-mechanics/changeling/shift
router.post('/changeling/shift', authGuard, validate(changelingShiftSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'CHANGELING') return res.status(400).json({ error: 'Not a Changeling' });

    const { targetRace, targetName } = req.body;
    const result = await changelingService.shiftAppearance(character.id, targetRace, targetName);

    return res.json(result);
  } catch (error: any) {
    console.error('Changeling shift error:', error);
    return res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/special-mechanics/changeling/revert
router.post('/changeling/revert', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'CHANGELING') return res.status(400).json({ error: 'Not a Changeling' });

    const result = await changelingService.revertToTrueForm(character.id);
    return res.json(result);
  } catch (error: any) {
    console.error('Changeling revert error:', error);
    return res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

// =========================================================================
// FORGEBORN
// =========================================================================

// GET /api/special-mechanics/forgeborn/status
router.get('/forgeborn/status', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'FORGEBORN') return res.status(400).json({ error: 'Not a Forgeborn' });

    const [status, queueBonus] = await Promise.all([
      forgebornService.checkMaintenanceStatus(character.id),
      forgebornService.getQueueSlotBonus(character.id),
    ]);

    return res.json({
      maintenance: status,
      queueSlotBonus: queueBonus,
    });
  } catch (error: any) {
    console.error('Forgeborn status error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/special-mechanics/forgeborn/maintain
router.post('/forgeborn/maintain', authGuard, validate(forgebornMaintainSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'FORGEBORN') return res.status(400).json({ error: 'Not a Forgeborn' });

    const { repairKitItemId } = req.body;
    const result = await forgebornService.performMaintenance(character.id, repairKitItemId);

    return res.json(result);
  } catch (error: any) {
    console.error('Forgeborn maintain error:', error);
    return res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/special-mechanics/forgeborn/self-repair
router.post('/forgeborn/self-repair', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'FORGEBORN') return res.status(400).json({ error: 'Not a Forgeborn' });

    const result = await forgebornService.applySelfRepair(character.id);
    return res.json(result);
  } catch (error: any) {
    console.error('Forgeborn self-repair error:', error);
    return res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

// =========================================================================
// MERFOLK
// =========================================================================

// GET /api/special-mechanics/merfolk/status
router.get('/merfolk/status', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'MERFOLK') return res.status(400).json({ error: 'Not a Merfolk' });

    const [inWater, underwaterAccess, swimmingBuff] = await Promise.all([
      merfolkService.isInWaterZone(character.id),
      merfolkService.canAccessUnderwaterNode(character.id),
      merfolkService.getSwimmingBuff(character.id),
    ]);

    // Get movement speed based on current town biome
    const town = character.currentTownId
      ? await prisma.town.findUnique({ where: { id: character.currentTownId }, select: { biome: true } })
      : null;

    const speed = await merfolkService.getMovementSpeed(
      character.id,
      town?.biome ?? 'PLAINS',
    );

    const waterProximity = character.currentTownId
      ? await merfolkService.getWaterProximityBonus(character.id, character.currentTownId)
      : { canFishAnywhere: false, townBiome: null };

    return res.json({
      inWaterZone: inWater,
      underwaterAccess,
      movementSpeed: speed,
      swimmingBuff,
      waterProximity,
    });
  } catch (error) {
    console.error('Merfolk status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// NIGHTBORNE
// =========================================================================

// GET /api/special-mechanics/nightborne/status
router.get('/nightborne/status', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'NIGHTBORNE') return res.status(400).json({ error: 'Not a Nightborne' });

    const envStatus = await nightborneService.getEnvironmentStatus(character.id);

    return res.json({
      environment: envStatus,
      superiorDeepsight: nightborneService.getSuperiorDeepsight(envStatus.underground),
    });
  } catch (error) {
    console.error('Nightborne status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// FAEFOLK
// =========================================================================

// GET /api/special-mechanics/faefolk/status
router.get('/faefolk/status', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'FAEFOLK') return res.status(400).json({ error: 'Not a Faefolk' });

    const [flight, overloaded, combatBonus] = await Promise.all([
      faefolkService.canFly(character.id),
      faefolkService.isCarryingHeavyLoad(character.id),
      faefolkService.getFlightCombatBonus(character.id),
    ]);

    return res.json({
      canFly: flight,
      isOverloaded: overloaded,
      flightCombatBonus: combatBonus,
    });
  } catch (error) {
    console.error('Faefolk status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// REVENANT
// =========================================================================

// GET /api/special-mechanics/revenant/status
router.get('/revenant/status', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });
    if (character.race !== 'REVENANT') return res.status(400).json({ error: 'Not a Revenant' });

    const [penalties, respawn] = await Promise.all([
      revenantService.getDeathPenalties(character.id),
      revenantService.getRespawnTimer(character.id),
    ]);

    return res.json({
      deathPenalties: penalties,
      respawnTimer: respawn,
      level: character.level,
      hasLifeDrain: character.level >= 15,
      hasUndyingFortitude: character.level >= 25,
    });
  } catch (error) {
    console.error('Revenant status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GENERIC ENVIRONMENT CHECK
// =========================================================================

// GET /api/special-mechanics/:characterId/environment
router.get('/:characterId/environment', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId } = req.params;
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        race: true,
        level: true,
        currentTownId: true,
        userId: true,
      },
    });

    if (!character) return res.status(404).json({ error: 'Character not found' });

    // Only allow checking your own character
    if (character.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Cannot check another player\'s environment' });
    }

    const town = character.currentTownId
      ? await prisma.town.findUnique({
          where: { id: character.currentTownId },
          select: { biome: true, name: true },
        })
      : null;

    const result: Record<string, unknown> = {
      characterId: character.id,
      race: character.race,
      level: character.level,
      currentBiome: town?.biome ?? null,
      currentTown: town?.name ?? null,
    };

    // Add race-specific environment data
    switch (character.race) {
      case 'CHANGELING':
        result.appearance = await changelingService.getCurrentAppearance(character.id);
        break;
      case 'FORGEBORN':
        result.maintenance = await forgebornService.checkMaintenanceStatus(character.id);
        break;
      case 'MERFOLK':
        result.inWaterZone = await merfolkService.isInWaterZone(character.id);
        result.swimmingBuff = await merfolkService.getSwimmingBuff(character.id);
        break;
      case 'NIGHTBORNE':
        result.environment = await nightborneService.getEnvironmentStatus(character.id);
        break;
      case 'FAEFOLK':
        result.canFly = await faefolkService.canFly(character.id);
        result.flightBonus = await faefolkService.getFlightCombatBonus(character.id);
        break;
      case 'REVENANT':
        result.deathPenalties = await revenantService.getDeathPenalties(character.id);
        break;
    }

    return res.json(result);
  } catch (error) {
    console.error('Environment check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
