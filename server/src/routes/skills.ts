import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { ABILITIES_BY_CLASS, SPECIALIZATIONS, ALL_ABILITIES } from '@shared/data/skills';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// ---- Zod Schemas ----

const specializeSchema = z.object({
  specialization: z.string().min(1, 'Specialization is required'),
});

const unlockAbilitySchema = z.object({
  abilityId: z.string().min(1, 'Ability ID is required'),
});

// ---- GET /api/skills/tree ----
// Get skill tree for the character's class, showing which abilities are unlocked

router.get('/tree', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (!character.class) {
      return res.status(400).json({ error: 'Character has no class assigned' });
    }

    const classAbilities = ABILITIES_BY_CLASS[character.class];
    if (!classAbilities) {
      return res.status(400).json({ error: `Unknown class: ${character.class}` });
    }

    // Get character's unlocked abilities
    const unlockedAbilities = await prisma.characterAbility.findMany({
      where: { characterId: character.id },
      select: { abilityId: true, unlockedAt: true },
    });
    const unlockedSet = new Set(unlockedAbilities.map((a) => a.abilityId));

    const specializations = SPECIALIZATIONS[character.class] ?? [];

    const tree = specializations.map((spec) => {
      const specAbilities = classAbilities.filter((a) => a.specialization === spec);
      return {
        specialization: spec,
        isActive: character.specialization === spec,
        abilities: specAbilities.map((ability) => ({
          ...ability,
          unlocked: unlockedSet.has(ability.id),
          canUnlock:
            !unlockedSet.has(ability.id) &&
            character.level >= ability.levelRequired &&
            character.unspentSkillPoints > 0 &&
            (!ability.prerequisiteAbilityId || unlockedSet.has(ability.prerequisiteAbilityId)) &&
            (character.specialization === spec || !character.specialization),
        })),
      };
    });

    return res.json({
      class: character.class,
      specialization: character.specialization,
      level: character.level,
      unspentSkillPoints: character.unspentSkillPoints,
      tree,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'skill-tree', req)) return;
    logRouteError(req, 500, 'Skill tree error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- POST /api/skills/specialize ----
// Choose a specialization (requires level 10, can only be done once)

router.post('/specialize', authGuard, characterGuard, validate(specializeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { specialization } = req.body;
    const character = req.character!;

    if (!character.class) {
      return res.status(400).json({ error: 'Character has no class assigned' });
    }

    if (character.specialization) {
      return res.status(400).json({ error: 'Character already has a specialization' });
    }

    if (character.level < 10) {
      return res.status(400).json({ error: 'Must be level 10 to specialize' });
    }

    const validSpecs = SPECIALIZATIONS[character.class];
    if (!validSpecs || !validSpecs.includes(specialization)) {
      return res.status(400).json({
        error: `Invalid specialization for ${character.class}. Valid options: ${validSpecs?.join(', ') ?? 'none'}`,
      });
    }

    await prisma.character.update({
      where: { id: character.id },
      data: { specialization },
    });

    return res.json({
      message: `Specialized as ${specialization}`,
      class: character.class,
      specialization,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'skill-specialize', req)) return;
    logRouteError(req, 500, 'Specialize error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- POST /api/skills/unlock ----
// Unlock an ability (validates class, spec, prereqs, skill points, level)

router.post('/unlock', authGuard, characterGuard, validate(unlockAbilitySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { abilityId } = req.body;
    const character = req.character!;

    if (!character.class) {
      return res.status(400).json({ error: 'Character has no class assigned' });
    }

    // Find the ability definition
    const abilityDef = ALL_ABILITIES.find((a) => a.id === abilityId);
    if (!abilityDef) {
      return res.status(404).json({ error: 'Ability not found' });
    }

    // Validate class
    if (abilityDef.class !== character.class) {
      return res.status(400).json({ error: `This ability is for the ${abilityDef.class} class` });
    }

    // Validate specialization
    if (character.specialization && abilityDef.specialization !== character.specialization) {
      return res.status(400).json({
        error: `This ability requires the ${abilityDef.specialization} specialization`,
      });
    }

    // Validate level
    if (character.level < abilityDef.levelRequired) {
      return res.status(400).json({
        error: `Requires level ${abilityDef.levelRequired}, you are level ${character.level}`,
      });
    }

    // Validate skill points
    if (character.unspentSkillPoints < 1) {
      return res.status(400).json({ error: 'No unspent skill points available' });
    }

    // Check not already unlocked
    const existing = await prisma.characterAbility.findFirst({
      where: { characterId: character.id, abilityId },
    });
    if (existing) {
      return res.status(400).json({ error: 'Ability already unlocked' });
    }

    // Validate prerequisite
    if (abilityDef.prerequisiteAbilityId) {
      const hasPrereq = await prisma.characterAbility.findFirst({
        where: { characterId: character.id, abilityId: abilityDef.prerequisiteAbilityId },
      });
      if (!hasPrereq) {
        const prereqDef = ALL_ABILITIES.find((a) => a.id === abilityDef.prerequisiteAbilityId);
        return res.status(400).json({
          error: `Prerequisite not met: must unlock ${prereqDef?.name ?? abilityDef.prerequisiteAbilityId} first`,
        });
      }
    }

    // Find or create the Ability row in DB (for the junction table)
    let dbAbility = await prisma.ability.findFirst({
      where: { name: abilityDef.name },
    });

    if (!dbAbility) {
      dbAbility = await prisma.ability.create({
        data: {
          id: abilityDef.id,
          name: abilityDef.name,
          description: abilityDef.description,
          class: abilityDef.class,
          specialization: abilityDef.specialization,
          tier: abilityDef.tier,
          effects: abilityDef.effects as any,
          cooldown: abilityDef.cooldown,

          prerequisiteAbilityId: abilityDef.prerequisiteAbilityId ?? null,
          levelRequired: abilityDef.levelRequired,
        },
      });
    }

    // Unlock the ability and deduct skill point
    await prisma.$transaction([
      prisma.characterAbility.create({
        data: {
          characterId: character.id,
          abilityId: dbAbility.id,
        },
      }),
      prisma.character.update({
        where: { id: character.id },
        data: { unspentSkillPoints: { decrement: 1 } },
      }),
    ]);

    return res.json({
      unlocked: {
        id: abilityDef.id,
        name: abilityDef.name,
        description: abilityDef.description,
        tier: abilityDef.tier,
        effects: abilityDef.effects,
      },
      unspentSkillPoints: character.unspentSkillPoints - 1,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'skill-unlock', req)) return;
    logRouteError(req, 500, 'Unlock ability error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- GET /api/skills/abilities ----
// Get character's unlocked abilities (for combat integration)

router.get('/abilities', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const characterAbilities = await prisma.characterAbility.findMany({
      where: { characterId: character.id },
      include: { ability: true },
    });

    const abilities = characterAbilities.map((ca) => ({
      id: ca.ability.id,
      name: ca.ability.name,
      description: ca.ability.description,
      class: ca.ability.class,
      specialization: ca.ability.specialization,
      tier: ca.ability.tier,
      effects: ca.ability.effects,
      cooldown: ca.ability.cooldown,
      levelRequired: ca.ability.levelRequired,
      unlockedAt: ca.unlockedAt.toISOString(),
    }));

    return res.json({ abilities });
  } catch (error) {
    if (handlePrismaError(error, res, 'skill-abilities', req)) return;
    logRouteError(req, 500, 'Get abilities error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
