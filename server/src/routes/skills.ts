import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { ABILITIES_BY_CLASS, SPECIALIZATIONS } from '@shared/data/skills';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { autoGrantAbilities } from '../services/ability-grants';

const router = Router();

// ---- Zod Schemas ----

const specializeSchema = z.object({
  specialization: z.string().min(1, 'Specialization is required'),
});

// ---- GET /api/skills/tree ----
// Get skill tree for the character's class, showing ability progression

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
        abilities: specAbilities.map((ability) => {
          const unlocked = unlockedSet.has(ability.id);
          let status: 'unlocked' | 'upcoming' | 'locked';
          if (unlocked) {
            status = 'unlocked';
          } else if (character.level >= ability.levelRequired) {
            // Character meets level but doesn't have it yet (e.g. different spec, or not yet specialized)
            status = 'upcoming';
          } else {
            status = 'locked';
          }
          return {
            ...ability,
            unlocked,
            status,
          };
        }),
      };
    });

    return res.json({
      class: character.class,
      specialization: character.specialization,
      level: character.level,
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
// Auto-grants all qualifying abilities immediately

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

    // Auto-grant all abilities the character qualifies for at their current level
    const grantedAbilities = await autoGrantAbilities(character.id);

    return res.json({
      message: `Specialized as ${specialization}`,
      class: character.class,
      specialization,
      abilitiesGranted: grantedAbilities,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'skill-specialize', req)) return;
    logRouteError(req, 500, 'Specialize error', error);
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
