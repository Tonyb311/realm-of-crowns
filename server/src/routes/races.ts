import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { getRace, getRacesByTier } from '@shared/data/races';
import { Race, ProfessionType } from '@prisma/client';
import { calculateRacialBonuses } from '../services/racial-bonus-calculator';
import { getAllRacialProfessionBonuses } from '../services/racial-profession-bonuses';
import {
  applyHalfElfChosenProfession,
  applyGnomeEurekaMoment,
  applyForgebornOverclock,
} from '../services/racial-special-profession-mechanics';

const router = Router();

// =========================================================================
// Zod Schemas
// =========================================================================

const useRacialAbilitySchema = z.object({
  abilityName: z.string().min(1, 'Ability name is required'),
});

const changelingShiftSchema = z.object({
  disguisedAs: z.string().min(1, 'Disguise name is required'),
  disguiseRace: z.nativeEnum(Race),
});

const halfElfChosenProfessionSchema = z.object({
  profession: z.nativeEnum(ProfessionType),
});

// =========================================================================
// Helper
// =========================================================================

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId } });
}

// =========================================================================
// GET /api/races — list all 20 races grouped by tier
// =========================================================================
router.get('/', (req: Request, res: Response) => {
  try {
    const mapSummary = (r: ReturnType<typeof getRace> & {}) => ({
      id: r.id,
      name: r.name,
      tier: r.tier,
      trait: r.trait,
      statModifiers: r.statModifiers,
      homelandRegion: r.homelandRegion,
    });

    const core = getRacesByTier('core').map(mapSummary);
    const common = getRacesByTier('common').map(mapSummary);
    const exotic = getRacesByTier('exotic').map(mapSummary);

    return res.json({ races: { core, common, exotic } });
  } catch (error) {
    console.error('List races error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// NOTE: All literal path routes MUST come before /:race to avoid param capture
// =========================================================================

// =========================================================================
// GET /api/races/relations/matrix — full 20x20 racial relations matrix
// =========================================================================
router.get('/relations/matrix', async (req: Request, res: Response) => {
  try {
    const relations = await prisma.racialRelation.findMany();

    const matrix: Record<string, Record<string, { status: string; modifier: number }>> = {};

    const allRaces = Object.values(Race);
    for (const r1 of allRaces) {
      matrix[r1] = {};
      for (const r2 of allRaces) {
        matrix[r1][r2] = r1 === r2
          ? { status: 'SELF', modifier: 0 }
          : { status: 'NEUTRAL', modifier: 0 };
      }
    }

    for (const rel of relations) {
      matrix[rel.race1][rel.race2] = { status: rel.status, modifier: rel.modifier };
      matrix[rel.race2][rel.race1] = { status: rel.status, modifier: rel.modifier };
    }

    return res.json({ matrix, races: allRaces });
  } catch (error) {
    console.error('Get relations matrix error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/races/abilities/racial/use — use a racial ability with cooldown
// =========================================================================
router.post('/abilities/racial/use', authGuard, validate(useRacialAbilitySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { abilityName } = req.body;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const raceKey = character.race.toLowerCase();
    const raceDef = getRace(raceKey);

    if (!raceDef) {
      return res.status(400).json({ error: 'Unknown race' });
    }

    const ability = raceDef.abilities.find(a => a.name === abilityName);

    if (!ability) {
      return res.status(404).json({ error: `Ability '${abilityName}' not found for race ${raceDef.name}` });
    }

    if (ability.type !== 'active') {
      return res.status(400).json({ error: 'Only active abilities can be used' });
    }

    if (character.level < ability.levelRequired) {
      return res.status(400).json({
        error: `Requires level ${ability.levelRequired}, you are level ${character.level}`,
      });
    }

    const now = new Date();
    const existingCooldown = await prisma.racialAbilityCooldown.findUnique({
      where: {
        characterId_abilityName: {
          characterId: character.id,
          abilityName,
        },
      },
    });

    if (existingCooldown && existingCooldown.cooldownEnds > now) {
      const remainingMs = existingCooldown.cooldownEnds.getTime() - now.getTime();
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return res.status(400).json({
        error: 'Ability is on cooldown',
        cooldownEnds: existingCooldown.cooldownEnds.toISOString(),
        remainingSeconds,
      });
    }

    const cooldownSeconds = ability.cooldownSeconds ?? 0;
    const cooldownEnds = new Date(now.getTime() + cooldownSeconds * 1000);

    await prisma.racialAbilityCooldown.upsert({
      where: {
        characterId_abilityName: {
          characterId: character.id,
          abilityName,
        },
      },
      update: {
        lastUsed: now,
        cooldownEnds,
      },
      create: {
        characterId: character.id,
        abilityName,
        lastUsed: now,
        cooldownEnds,
      },
    });

    return res.json({
      used: true,
      ability: {
        name: ability.name,
        description: ability.description,
        effectType: ability.effectType,
        effectValue: ability.effectValue,
        duration: ability.duration ?? null,
      },
      cooldown: {
        cooldownSeconds,
        cooldownEnds: cooldownEnds.toISOString(),
      },
    });
  } catch (error) {
    console.error('Use racial ability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/races/changeling/shift — change Changeling appearance
// =========================================================================
router.post('/changeling/shift', authGuard, validate(changelingShiftSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { disguisedAs, disguiseRace } = req.body;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    if (character.race !== 'CHANGELING') {
      return res.status(400).json({ error: 'Only Changelings can shapeshift' });
    }

    const disguise = await prisma.changelingDisguise.upsert({
      where: { characterId: character.id },
      update: {
        disguisedAs,
        disguiseRace,
        startedAt: new Date(),
      },
      create: {
        characterId: character.id,
        disguisedAs,
        disguiseRace,
        startedAt: new Date(),
      },
    });

    await prisma.character.update({
      where: { id: character.id },
      data: { currentAppearanceRace: disguiseRace },
    });

    return res.json({
      shifted: true,
      disguise: {
        disguisedAs: disguise.disguisedAs,
        disguiseRace: disguise.disguiseRace,
        startedAt: disguise.startedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Changeling shift error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/races/changeling/trueform — get Changeling's true form
// =========================================================================
router.get('/changeling/trueform', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    if (character.race !== 'CHANGELING') {
      return res.status(400).json({ error: 'Only Changelings have a true form' });
    }

    const disguise = await prisma.changelingDisguise.findUnique({
      where: { characterId: character.id },
    });

    return res.json({
      trueRace: 'CHANGELING',
      characterName: character.name,
      isDisguised: disguise?.disguisedAs != null,
      currentDisguise: disguise ? {
        disguisedAs: disguise.disguisedAs,
        disguiseRace: disguise.disguiseRace,
        since: disguise.startedAt.toISOString(),
      } : null,
    });
  } catch (error) {
    console.error('Get changeling trueform error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/races/forgeborn/maintenance — Forgeborn maintenance status
// =========================================================================
router.get('/forgeborn/maintenance', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    if (character.race !== 'FORGEBORN') {
      return res.status(400).json({ error: 'Only Forgeborn require maintenance' });
    }

    const maintenance = await prisma.forgebornMaintenance.findUnique({
      where: { characterId: character.id },
    });

    if (!maintenance) {
      return res.json({
        hasMaintenanceRecord: false,
        message: 'No maintenance record found. Maintenance tracking begins after first service.',
      });
    }

    const now = new Date();
    const overdue = maintenance.nextRequired < now;
    const overdueMs = overdue ? now.getTime() - maintenance.nextRequired.getTime() : 0;
    const overdueDays = Math.floor(overdueMs / (1000 * 60 * 60 * 24));

    return res.json({
      hasMaintenanceRecord: true,
      condition: maintenance.condition,
      lastMaintenance: maintenance.lastMaintenance.toISOString(),
      nextRequired: maintenance.nextRequired.toISOString(),
      overdue,
      overdueDays: overdue ? overdueDays : 0,
      degradation: overdue
        ? { statPenaltyPercent: Math.min(overdueDays, 100) }
        : null,
    });
  } catch (error) {
    console.error('Get forgeborn maintenance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/races/merfolk/underwater-nodes — list underwater resource nodes
// =========================================================================
router.get('/merfolk/underwater-nodes', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    if (character.race !== 'MERFOLK') {
      return res.status(400).json({ error: 'Only Merfolk can access underwater nodes' });
    }

    const zones = await prisma.exclusiveZone.findMany({
      include: { region: true },
    });

    const merfolkZones = zones.filter(zone => {
      const requiredRaces = zone.requiredRaces as string[];
      return Array.isArray(requiredRaces) && requiredRaces.includes('MERFOLK');
    });

    return res.json({
      underwaterNodes: merfolkZones.map(zone => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        region: zone.region ? {
          id: zone.region.id,
          name: zone.region.name,
          biome: zone.region.biome,
        } : null,
      })),
      total: merfolkZones.length,
    });
  } catch (error) {
    console.error('Get merfolk underwater nodes error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/races/profession-bonuses/:race — get all profession bonuses for a race
// =========================================================================
router.get('/profession-bonuses/:race', (req: Request, res: Response) => {
  try {
    const raceKey = req.params.race.toUpperCase() as Race;
    if (!Object.values(Race).includes(raceKey)) {
      return res.status(404).json({ error: 'Race not found' });
    }

    const bonuses = getAllRacialProfessionBonuses(raceKey);

    return res.json({ race: raceKey, professionBonuses: bonuses });
  } catch (error) {
    console.error('Get profession bonuses error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/races/half-elf-chosen-profession — set Half-Elf's chosen profession
// =========================================================================
router.post('/half-elf-chosen-profession', authGuard, validate(halfElfChosenProfessionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { profession } = req.body;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const result = await applyHalfElfChosenProfession(character.id, profession);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      chosenProfession: profession,
      message: `Your chosen profession is now ${profession} (+20% bonus)`,
    });
  } catch (error) {
    console.error('Set half-elf chosen profession error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/races/gnome-eureka — trigger Gnome Eureka Moment
// =========================================================================
router.post('/gnome-eureka', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const result = await applyGnomeEurekaMoment(character.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      craftingActionId: result.craftingActionId,
      message: 'Eureka! Your crafting action has been instantly completed.',
    });
  } catch (error) {
    console.error('Gnome eureka error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/races/forgeborn-overclock — trigger Forgeborn Overclock
// =========================================================================
router.post('/forgeborn-overclock', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const result = await applyForgebornOverclock(character.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      expiresAt: result.expiresAt,
      message: 'Overclock activated! 2x crafting speed for 1 hour.',
    });
  } catch (error) {
    console.error('Forgeborn overclock error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/races/bonuses/calculate — calculate racial bonuses for character
// =========================================================================
router.get('/bonuses/calculate', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findFirst({
      where: { userId: req.user!.userId },
      include: { currentTown: true },
    });

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const { profession } = req.query;
    const professionType = typeof profession === 'string' ? profession : null;
    const currentTown = character.currentTown?.name ?? null;
    const currentBiome = character.currentTown?.biome ?? null;

    const subRace = character.subRace as { id: string; name: string; element?: string; [key: string]: unknown } | null;
    const raceKey = character.race.toLowerCase();

    const bonuses = calculateRacialBonuses(
      raceKey,
      subRace,
      professionType,
      currentTown,
      currentBiome,
    );

    return res.json({ race: character.race, subRace, bonuses });
  } catch (error) {
    console.error('Calculate racial bonuses error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/races/:race — full race details (MUST be after all literal paths)
// =========================================================================
router.get('/:race', (req: Request, res: Response) => {
  try {
    const raceId = req.params.race.toLowerCase();
    const raceDef = getRace(raceId);

    if (!raceDef) {
      return res.status(404).json({ error: 'Race not found' });
    }

    return res.json({ race: raceDef });
  } catch (error) {
    console.error('Get race details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/races/:race/subraces — get sub-race options
// =========================================================================
router.get('/:race/subraces', (req: Request, res: Response) => {
  try {
    const raceId = req.params.race.toLowerCase();
    const raceDef = getRace(raceId);

    if (!raceDef) {
      return res.status(404).json({ error: 'Race not found' });
    }

    const subRaces = raceDef.subRaces ?? [];

    return res.json({
      race: raceId,
      raceName: raceDef.name,
      subRaces,
      hasSubRaces: subRaces.length > 0,
    });
  } catch (error) {
    console.error('Get sub-races error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
