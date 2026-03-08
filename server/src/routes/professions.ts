import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { playerProfessions, gatheringActions, craftingActions } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import type { ProfessionType, Race } from '@shared/enums';
import {
  ALL_PROFESSIONS,
  getProfessionByType,
  getProfessionsByCategory,
  getXpForLevel,
  VALID_PROFESSION_TYPES,
} from '@shared/data/professions';
import type { ProfessionCategory } from '@shared/data/professions';
import { getRace } from '@shared/data/races';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';
import { CATEGORY_LIMITS, getMaxProfessions } from '@shared/data/profession-config';
import { onSelectProfession } from '../services/quest-triggers';

const router = Router();

// Profession constants imported from @shared/data/profession-config

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function raceEnumToRegistryKey(race: Race): string {
  return race.toLowerCase();
}

function getRacialBonuses(race: Race, professionType: string) {
  const raceDef = getRace(raceEnumToRegistryKey(race));
  if (!raceDef) return null;

  const profKey = professionType.toLowerCase();
  return raceDef.professionBonuses.find(
    (b) => b.professionType === profKey || b.professionType === profKey.replace('_', ''),
  ) ?? null;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const professionTypeSchema = z.object({
  professionType: z.enum(VALID_PROFESSION_TYPES as [string, ...string[]], {
    error: 'Invalid profession type',
  }),
});

// ---------------------------------------------------------------------------
// POST /api/professions/learn — Explicitly learn a new profession
// ---------------------------------------------------------------------------

router.post('/learn', authGuard, characterGuard, requireTown, validate(professionTypeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Level gate: must be at least Level 3 to learn a profession
    if (character.level < PROFESSION_UNLOCK_LEVEL) {
      return res.status(400).json({ error: 'You must be at least Level 3 to choose a profession.' });
    }

    // Look up static definition
    const profDef = getProfessionByType(profEnum);
    if (!profDef) {
      return res.status(400).json({ error: 'Unknown profession type' });
    }

    // Check if already learned (active or inactive)
    const existing = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, profEnum)),
    });

    if (existing && existing.isActive) {
      return res.status(400).json({ error: 'You already have this profession active' });
    }

    // If previously abandoned, reactivate (progress is preserved)
    if (existing && !existing.isActive) {
      // Count active professions for limit checks
      const activeProfessions = await db.query.playerProfessions.findMany({
        where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.isActive, true)),
      });

      const maxProf = getMaxProfessions(character.race, character.level);
      if (activeProfessions.length >= maxProf) {
        return res.status(400).json({
          error: `Cannot have more than ${maxProf} active professions. Abandon one first.`,
        });
      }

      // Check category limit
      const sameCategoryCount = activeProfessions.filter((p) => {
        const def = getProfessionByType(p.professionType);
        return def?.category === profDef.category;
      }).length;

      const categoryLimit = CATEGORY_LIMITS[profDef.category];
      if (sameCategoryCount >= categoryLimit) {
        return res.status(400).json({
          error: `Cannot have more than ${categoryLimit} ${profDef.category.toLowerCase()} professions`,
        });
      }

      const [reactivated] = await db.update(playerProfessions)
        .set({ isActive: true })
        .where(eq(playerProfessions.id, existing.id))
        .returning();

      onSelectProfession(character.id).catch(() => {}); // fire-and-forget

      return res.json({
        profession: {
          type: reactivated.professionType,
          name: profDef.name,
          category: profDef.category,
          tier: reactivated.tier,
          level: reactivated.level,
          xp: reactivated.xp,
          xpToNextLevel: getXpForLevel(reactivated.level) - reactivated.xp,
          reactivated: true,
        },
      });
    }

    // New profession — enforce limits
    const activeProfessions = await db.query.playerProfessions.findMany({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.isActive, true)),
    });

    const maxProf = getMaxProfessions(character.race, character.level);
    if (activeProfessions.length >= maxProf) {
      return res.status(400).json({
        error: `Cannot have more than ${maxProf} active professions. Abandon one first.`,
      });
    }

    const sameCategoryCount = activeProfessions.filter((p) => {
      const def = getProfessionByType(p.professionType);
      return def?.category === profDef.category;
    }).length;

    const categoryLimit = CATEGORY_LIMITS[profDef.category];
    if (sameCategoryCount >= categoryLimit) {
      return res.status(400).json({
        error: `Cannot have more than ${categoryLimit} ${profDef.category.toLowerCase()} professions`,
      });
    }

    const [newProfession] = await db.insert(playerProfessions).values({
      id: crypto.randomUUID(),
      characterId: character.id,
      professionType: profEnum,
      tier: 'APPRENTICE',
      level: 1,
      xp: 0,
      isActive: true,
    }).returning();

    onSelectProfession(character.id).catch(() => {}); // fire-and-forget

    return res.status(201).json({
      profession: {
        type: newProfession.professionType,
        name: profDef.name,
        category: profDef.category,
        tier: newProfession.tier,
        level: newProfession.level,
        xp: newProfession.xp,
        xpToNextLevel: getXpForLevel(newProfession.level),
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'learn profession', req)) return;
    logRouteError(req, 500, 'Learn profession error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/professions/abandon — Abandon a profession (preserves progress)
// ---------------------------------------------------------------------------

router.post('/abandon', authGuard, characterGuard, requireTown, validate(professionTypeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const profession = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, profEnum)),
    });

    if (!profession || !profession.isActive) {
      return res.status(400).json({ error: 'You do not have this profession active' });
    }

    // Cannot abandon if currently gathering with this profession
    const activeGathering = await db.query.gatheringActions.findFirst({
      where: and(eq(gatheringActions.characterId, character.id), eq(gatheringActions.status, 'IN_PROGRESS')),
    });
    if (activeGathering) {
      return res.status(400).json({
        error: 'Cannot abandon a profession while you have an active gathering action. Complete or cancel it first.',
      });
    }

    // Cannot abandon if currently crafting with this profession
    const activeCrafting = await db.query.craftingActions.findFirst({
      where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'IN_PROGRESS')),
      with: { recipe: { columns: { professionType: true } } },
    });
    if (activeCrafting && activeCrafting.recipe.professionType === profEnum) {
      return res.status(400).json({
        error: 'Cannot abandon a profession while crafting with it. Complete or cancel crafting first.',
      });
    }

    await db.update(playerProfessions)
      .set({ isActive: false })
      .where(eq(playerProfessions.id, profession.id));

    return res.json({
      abandoned: true,
      professionType: profEnum,
      message: 'Profession abandoned. Progress is preserved and can be reactivated later by learning it again.',
    });
  } catch (error) {
    if (handleDbError(error, res, 'abandon profession', req)) return;
    logRouteError(req, 500, 'Abandon profession error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/professions/mine — Get all my active professions with full details
// ---------------------------------------------------------------------------

router.get('/mine', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const professions = await db.query.playerProfessions.findMany({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.isActive, true)),
      orderBy: desc(playerProfessions.level),
    });

    const result = professions.map((p) => {
      const def = getProfessionByType(p.professionType);
      const racialBonus = getRacialBonuses(character.race, p.professionType);

      return {
        type: p.professionType,
        professionType: p.professionType,
        name: def?.name ?? p.professionType,
        category: def?.category ?? 'GATHERING',
        description: def?.description ?? '',
        tier: p.tier,
        level: p.level,
        xp: p.xp,
        xpToNextLevel: p.level >= 100 ? 0 : getXpForLevel(p.level) - p.xp,
        specialization: p.specialization ?? null,
        hasSpecializations: def?.hasSpecializations ?? false,
        specializations: def?.specializations ?? [],
        racialBonus: racialBonus
          ? {
              speedBonus: racialBonus.speedBonus,
              qualityBonus: racialBonus.qualityBonus,
              yieldBonus: racialBonus.yieldBonus,
              xpBonus: racialBonus.xpBonus,
            }
          : null,
      };
    });

    return res.json({ professions: result });
  } catch (error) {
    if (handleDbError(error, res, 'get my professions', req)) return;
    logRouteError(req, 500, 'Get my professions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/professions/info/:type — Get profession details (static data)
// ---------------------------------------------------------------------------

router.get('/info/:type', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.params;
    const profEnum = type as ProfessionType;

    const def = getProfessionByType(profEnum);
    if (!def) {
      return res.status(404).json({ error: `Unknown profession type: ${type}` });
    }

    // Get character for racial bonuses
    const character = req.character!;
    const racialBonus = getRacialBonuses(character.race, profEnum);

    // Check if character has this profession
    let playerProgress = null;
    {
      const prof = await db.query.playerProfessions.findFirst({
        where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, profEnum)),
      });
      if (prof) {
        playerProgress = {
          tier: prof.tier,
          level: prof.level,
          xp: prof.xp,
          xpToNextLevel: prof.level >= 100 ? 0 : getXpForLevel(prof.level) - prof.xp,
          isActive: prof.isActive,
          specialization: prof.specialization ?? null,
        };
      }
    }

    return res.json({
      profession: {
        type: def.type,
        name: def.name,
        category: def.category,
        description: def.description,
        primaryStat: def.primaryStat,
        relatedProfessions: def.relatedProfessions,
        inputResources: def.inputResources,
        outputProducts: def.outputProducts,
        townTypeAffinity: def.townTypeAffinity,
        tierUnlocks: def.tierUnlocks,
        racialBonus: racialBonus
          ? {
              speedBonus: racialBonus.speedBonus,
              qualityBonus: racialBonus.qualityBonus,
              yieldBonus: racialBonus.yieldBonus,
              xpBonus: racialBonus.xpBonus,
            }
          : null,
        playerProgress,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'profession info', req)) return;
    logRouteError(req, 500, 'Profession info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/professions/available — List all professions with learn status
// ---------------------------------------------------------------------------

router.get('/available', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Get all player professions (active and inactive)
    const charProfessions = await db.query.playerProfessions.findMany({
      where: eq(playerProfessions.characterId, character.id),
    });
    const profMap = new Map(charProfessions.map((p) => [p.professionType, p]));

    // Count active per category
    const activeProfessions = charProfessions.filter((p) => p.isActive);
    const activeCount = activeProfessions.length;

    const categoryCounts: Record<string, number> = { GATHERING: 0, CRAFTING: 0, SERVICE: 0 };
    for (const p of activeProfessions) {
      const def = getProfessionByType(p.professionType);
      if (def) {
        categoryCounts[def.category] = (categoryCounts[def.category] ?? 0) + 1;
      }
    }

    // P1 #27: Race-aware profession cap
    const maxProf = getMaxProfessions(character.race, character.level);

    const professions = ALL_PROFESSIONS.map((def) => {
      const existing = profMap.get(def.type as ProfessionType);

      let status: 'learned' | 'available' | 'locked' | 'inactive';
      let lockReason: string | null = null;

      if (existing && existing.isActive) {
        status = 'learned';
      } else if (existing && !existing.isActive) {
        // Previously learned but abandoned — can reactivate if limits allow
        if (activeCount >= maxProf) {
          status = 'locked';
          lockReason = `Maximum ${maxProf} active professions reached`;
        } else if (categoryCounts[def.category] >= CATEGORY_LIMITS[def.category]) {
          status = 'locked';
          lockReason = `Maximum ${CATEGORY_LIMITS[def.category]} ${def.category.toLowerCase()} professions reached`;
        } else {
          status = 'inactive';
        }
      } else {
        // Never learned
        if (activeCount >= maxProf) {
          status = 'locked';
          lockReason = `Maximum ${maxProf} active professions reached`;
        } else if (categoryCounts[def.category] >= CATEGORY_LIMITS[def.category]) {
          status = 'locked';
          lockReason = `Maximum ${CATEGORY_LIMITS[def.category]} ${def.category.toLowerCase()} professions reached`;
        } else {
          status = 'available';
        }
      }

      const racialBonus = getRacialBonuses(character.race, def.type);

      return {
        type: def.type,
        name: def.name,
        category: def.category,
        description: def.description,
        primaryStat: def.primaryStat,
        status,
        lockReason,
        level: existing?.level ?? null,
        tier: existing?.tier ?? null,
        specialization: existing?.specialization ?? null,
        hasSpecializations: def.hasSpecializations ?? false,
        specializations: def.specializations ?? [],
        racialBonus: racialBonus
          ? {
              speedBonus: racialBonus.speedBonus,
              qualityBonus: racialBonus.qualityBonus,
              yieldBonus: racialBonus.yieldBonus,
              xpBonus: racialBonus.xpBonus,
            }
          : null,
      };
    });

    return res.json({
      professions,
      limits: {
        maxActive: maxProf,
        currentActive: activeCount,
        categories: {
          GATHERING: { max: CATEGORY_LIMITS.GATHERING, current: categoryCounts.GATHERING },
          CRAFTING: { max: CATEGORY_LIMITS.CRAFTING, current: categoryCounts.CRAFTING },
          SERVICE: { max: CATEGORY_LIMITS.SERVICE, current: categoryCounts.SERVICE },
        },
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'available professions', req)) return;
    logRouteError(req, 500, 'Available professions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/professions/specialize — Permanently choose a specialization branch
// ---------------------------------------------------------------------------

const VALID_SPECIALIZATIONS: Record<string, string[]> = {
  BLACKSMITH: ['TOOLSMITH', 'WEAPONSMITH', 'ARMORER'],
};

const SPECIALIZATION_LEVEL_REQUIRED = 7;

const specializeSchema = z.object({
  professionType: z.enum(VALID_PROFESSION_TYPES as [string, ...string[]], {
    error: 'Invalid profession type',
  }),
  specialization: z.string().min(1, 'Specialization is required'),
});

router.post('/specialize', authGuard, characterGuard, requireTown, validate(specializeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType, specialization } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Validate this profession supports specializations
    const validSpecs = VALID_SPECIALIZATIONS[profEnum];
    if (!validSpecs) {
      return res.status(400).json({ error: `${profEnum} does not have specializations` });
    }

    // Validate the chosen specialization
    if (!validSpecs.includes(specialization)) {
      return res.status(400).json({
        error: `Invalid specialization '${specialization}' for ${profEnum}. Valid: ${validSpecs.join(', ')}`,
      });
    }

    // Check character has this profession and it's active
    const profession = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, profEnum)),
    });

    if (!profession || !profession.isActive) {
      return res.status(400).json({ error: `You do not have an active ${profEnum} profession` });
    }

    // Check level requirement
    if (profession.level < SPECIALIZATION_LEVEL_REQUIRED) {
      return res.status(400).json({
        error: `Requires level ${SPECIALIZATION_LEVEL_REQUIRED} in ${profEnum}, you are level ${profession.level}`,
      });
    }

    // Check not already specialized (permanent choice)
    if (profession.specialization) {
      return res.status(400).json({
        error: `You have already specialized as ${profession.specialization}. This choice is permanent.`,
      });
    }

    // Apply specialization
    const [updated] = await db.update(playerProfessions)
      .set({ specialization })
      .where(eq(playerProfessions.id, profession.id))
      .returning();

    const profDef = getProfessionByType(profEnum);

    return res.json({
      profession: {
        type: updated.professionType,
        name: profDef?.name ?? updated.professionType,
        specialization: updated.specialization,
        level: updated.level,
        tier: updated.tier,
      },
      message: `You have permanently specialized as a ${specialization}. New exclusive recipes are now available!`,
    });
  } catch (error) {
    if (handleDbError(error, res, 'specialize profession', req)) return;
    logRouteError(req, 500, 'Specialize profession error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
