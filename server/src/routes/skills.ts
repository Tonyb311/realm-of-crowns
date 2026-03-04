import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { ABILITIES_BY_CLASS, SPECIALIZATIONS, TIER0_ABILITIES_BY_CLASS, TIER0_CHOICE_LEVELS } from '@shared/data/skills';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { autoGrantAbilities } from '../services/ability-grants';

const router = Router();

// ---- Zod Schemas ----

const specializeSchema = z.object({
  specialization: z.string().min(1, 'Specialization is required'),
});

const chooseTier0Schema = z.object({
  abilityId: z.string().min(1, 'Ability ID is required'),
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

    // Build tier 0 section
    const tier0Abilities = TIER0_ABILITIES_BY_CLASS[character.class] ?? [];
    const tier0Groups: Record<string, {
      level: number;
      choiceGroup: string;
      abilities: Array<typeof tier0Abilities[0] & { unlocked: boolean; status: 'chosen' | 'not_chosen' | 'available' | 'locked' }>;
      chosen: string | null;
    }> = {};

    for (const level of TIER0_CHOICE_LEVELS) {
      const group = `${character.class}_tier0_level${level}`;
      const groupAbilities = tier0Abilities.filter((a) => a.choiceGroup === group);

      // Check which (if any) the character has chosen
      const chosenAbility = groupAbilities.find((a) => unlockedSet.has(a.id));

      tier0Groups[group] = {
        level,
        choiceGroup: group,
        chosen: chosenAbility?.id ?? null,
        abilities: groupAbilities.map((a) => {
          let status: 'chosen' | 'not_chosen' | 'available' | 'locked';
          if (unlockedSet.has(a.id)) {
            status = 'chosen';
          } else if (chosenAbility) {
            status = 'not_chosen'; // another was chosen
          } else if (character.level >= a.levelRequired) {
            status = 'available';
          } else {
            status = 'locked';
          }
          return { ...a, unlocked: unlockedSet.has(a.id), status };
        }),
      };
    }

    return res.json({
      class: character.class,
      specialization: character.specialization,
      level: character.level,
      tier0: Object.values(tier0Groups),
      tree,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'skill-tree', req)) return;
    logRouteError(req, 500, 'Skill tree error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- GET /api/skills/tier0-pending ----
// Get pending tier 0 choices (levels where the character qualifies but hasn't chosen yet)

router.get('/tier0-pending', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (!character.class) {
      return res.json({ pending: [] });
    }

    const tier0Abilities = TIER0_ABILITIES_BY_CLASS[character.class] ?? [];
    if (tier0Abilities.length === 0) {
      return res.json({ pending: [] });
    }

    // Get character's unlocked ability IDs
    const existing = await prisma.characterAbility.findMany({
      where: { characterId: character.id },
      select: { abilityId: true },
    });
    const existingSet = new Set(existing.map((e) => e.abilityId));

    const pending: Array<{
      level: number;
      choiceGroup: string;
      options: typeof tier0Abilities;
    }> = [];

    for (const level of TIER0_CHOICE_LEVELS) {
      if (character.level < level) continue; // hasn't reached this level yet

      const group = `${character.class}_tier0_level${level}`;
      const groupAbilities = tier0Abilities.filter((a) => a.choiceGroup === group);

      // Check if any from this group is already chosen
      const alreadyChosen = groupAbilities.some((a) => existingSet.has(a.id));
      if (alreadyChosen) continue;

      pending.push({ level, choiceGroup: group, options: groupAbilities });
    }

    return res.json({ pending });
  } catch (error) {
    if (handlePrismaError(error, res, 'tier0-pending', req)) return;
    logRouteError(req, 500, 'Tier0 pending error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- POST /api/skills/choose-tier0 ----
// Choose a tier 0 ability (permanent, one per choice group)

router.post('/choose-tier0', authGuard, characterGuard, validate(chooseTier0Schema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { abilityId } = req.body;
    const character = req.character!;

    if (!character.class) {
      return res.status(400).json({ error: 'Character has no class assigned' });
    }

    // Find the ability in tier 0 definitions
    const tier0Abilities = TIER0_ABILITIES_BY_CLASS[character.class] ?? [];
    const abilityDef = tier0Abilities.find((a) => a.id === abilityId);

    if (!abilityDef) {
      return res.status(400).json({ error: 'Invalid tier 0 ability for this class' });
    }

    if (!abilityDef.requiresChoice || abilityDef.tier !== 0) {
      return res.status(400).json({ error: 'This is not a tier 0 choice ability' });
    }

    if (character.level < abilityDef.levelRequired) {
      return res.status(400).json({ error: `Must be level ${abilityDef.levelRequired} to choose this ability` });
    }

    // Check if this choice group already has a chosen ability
    const groupAbilities = tier0Abilities.filter((a) => a.choiceGroup === abilityDef.choiceGroup);
    const groupAbilityIds = groupAbilities.map((a) => a.id);

    const existingChoice = await prisma.characterAbility.findFirst({
      where: {
        characterId: character.id,
        abilityId: { in: groupAbilityIds },
      },
    });

    if (existingChoice) {
      return res.status(400).json({ error: 'Already made a choice for this tier 0 level' });
    }

    // Ensure the Ability DB row exists
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

    // Create CharacterAbility row
    await prisma.characterAbility.create({
      data: {
        characterId: character.id,
        abilityId: dbAbility.id,
      },
    });

    return res.json({
      message: `Chose ability: ${abilityDef.name}`,
      ability: {
        id: abilityDef.id,
        name: abilityDef.name,
        description: abilityDef.description,
        choiceGroup: abilityDef.choiceGroup,
        levelRequired: abilityDef.levelRequired,
        effects: abilityDef.effects,
        cooldown: abilityDef.cooldown,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'choose-tier0', req)) return;
    logRouteError(req, 500, 'Choose tier0 error', error);
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
