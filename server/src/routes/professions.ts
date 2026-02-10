import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { ProfessionType, Race } from '@prisma/client';
import {
  ALL_PROFESSIONS,
  getProfessionByType,
  getProfessionsByCategory,
  getXpForLevel,
  VALID_PROFESSION_TYPES,
} from '@shared/data/professions';
import type { ProfessionCategory } from '@shared/data/professions';
import { getRace } from '@shared/data/races';

const router = Router();

// ---------------------------------------------------------------------------
// Category limits
// ---------------------------------------------------------------------------

const MAX_ACTIVE_PROFESSIONS = 3;
const CATEGORY_LIMITS: Record<ProfessionCategory, number> = {
  GATHERING: 2,
  CRAFTING: 2,
  SERVICE: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId } });
}

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
    errorMap: () => ({ message: `Invalid profession type` }),
  }),
});

// ---------------------------------------------------------------------------
// POST /api/professions/learn — Explicitly learn a new profession
// ---------------------------------------------------------------------------

router.post('/learn', authGuard, validate(professionTypeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    // Look up static definition
    const profDef = getProfessionByType(profEnum);
    if (!profDef) {
      return res.status(400).json({ error: 'Unknown profession type' });
    }

    // Check if already learned (active or inactive)
    const existing = await prisma.playerProfession.findUnique({
      where: {
        characterId_professionType: {
          characterId: character.id,
          professionType: profEnum,
        },
      },
    });

    if (existing && existing.isActive) {
      return res.status(400).json({ error: 'You already have this profession active' });
    }

    // If previously abandoned, reactivate (progress is preserved)
    if (existing && !existing.isActive) {
      // Count active professions for limit checks
      const activeProfessions = await prisma.playerProfession.findMany({
        where: { characterId: character.id, isActive: true },
      });

      if (activeProfessions.length >= MAX_ACTIVE_PROFESSIONS) {
        return res.status(400).json({
          error: `Cannot have more than ${MAX_ACTIVE_PROFESSIONS} active professions. Abandon one first.`,
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

      const reactivated = await prisma.playerProfession.update({
        where: { id: existing.id },
        data: { isActive: true },
      });

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
    const activeProfessions = await prisma.playerProfession.findMany({
      where: { characterId: character.id, isActive: true },
    });

    if (activeProfessions.length >= MAX_ACTIVE_PROFESSIONS) {
      return res.status(400).json({
        error: `Cannot have more than ${MAX_ACTIVE_PROFESSIONS} active professions. Abandon one first.`,
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

    const newProfession = await prisma.playerProfession.create({
      data: {
        characterId: character.id,
        professionType: profEnum,
        tier: 'APPRENTICE',
        level: 1,
        xp: 0,
        isActive: true,
      },
    });

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
    console.error('Learn profession error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/professions/abandon — Abandon a profession (preserves progress)
// ---------------------------------------------------------------------------

router.post('/abandon', authGuard, validate(professionTypeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const profession = await prisma.playerProfession.findUnique({
      where: {
        characterId_professionType: {
          characterId: character.id,
          professionType: profEnum,
        },
      },
    });

    if (!profession || !profession.isActive) {
      return res.status(400).json({ error: 'You do not have this profession active' });
    }

    // Cannot abandon if currently gathering with this profession
    const activeGathering = await prisma.gatheringAction.findFirst({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
    });
    if (activeGathering) {
      return res.status(400).json({
        error: 'Cannot abandon a profession while you have an active gathering action. Complete or cancel it first.',
      });
    }

    // Cannot abandon if currently crafting with this profession
    const activeCrafting = await prisma.craftingAction.findFirst({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
      include: { recipe: { select: { professionType: true } } },
    });
    if (activeCrafting && activeCrafting.recipe.professionType === profEnum) {
      return res.status(400).json({
        error: 'Cannot abandon a profession while crafting with it. Complete or cancel crafting first.',
      });
    }

    await prisma.playerProfession.update({
      where: { id: profession.id },
      data: { isActive: false },
    });

    return res.json({
      abandoned: true,
      professionType: profEnum,
      message: 'Profession abandoned. Progress is preserved and can be reactivated later by learning it again.',
    });
  } catch (error) {
    console.error('Abandon profession error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/professions/mine — Get all my active professions with full details
// ---------------------------------------------------------------------------

router.get('/mine', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const professions = await prisma.playerProfession.findMany({
      where: { characterId: character.id, isActive: true },
      orderBy: { level: 'desc' },
    });

    const result = professions.map((p) => {
      const def = getProfessionByType(p.professionType);
      const racialBonus = getRacialBonuses(character.race, p.professionType);

      return {
        type: p.professionType,
        name: def?.name ?? p.professionType,
        category: def?.category ?? 'GATHERING',
        description: def?.description ?? '',
        tier: p.tier,
        level: p.level,
        xp: p.xp,
        xpToNextLevel: p.level >= 100 ? 0 : getXpForLevel(p.level) - p.xp,
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
    console.error('Get my professions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/professions/info/:type — Get profession details (static data)
// ---------------------------------------------------------------------------

router.get('/info/:type', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.params;
    const profEnum = type as ProfessionType;

    const def = getProfessionByType(profEnum);
    if (!def) {
      return res.status(404).json({ error: `Unknown profession type: ${type}` });
    }

    // Get character for racial bonuses
    const character = await getCharacterForUser(req.user!.userId);
    const racialBonus = character ? getRacialBonuses(character.race, profEnum) : null;

    // Check if character has this profession
    let playerProgress = null;
    if (character) {
      const prof = await prisma.playerProfession.findUnique({
        where: {
          characterId_professionType: {
            characterId: character.id,
            professionType: profEnum,
          },
        },
      });
      if (prof) {
        playerProgress = {
          tier: prof.tier,
          level: prof.level,
          xp: prof.xp,
          xpToNextLevel: prof.level >= 100 ? 0 : getXpForLevel(prof.level) - prof.xp,
          isActive: prof.isActive,
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
    console.error('Profession info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/professions/available — List all professions with learn status
// ---------------------------------------------------------------------------

router.get('/available', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    // Get all player professions (active and inactive)
    const playerProfessions = await prisma.playerProfession.findMany({
      where: { characterId: character.id },
    });
    const profMap = new Map(playerProfessions.map((p) => [p.professionType, p]));

    // Count active per category
    const activeProfessions = playerProfessions.filter((p) => p.isActive);
    const activeCount = activeProfessions.length;

    const categoryCounts: Record<string, number> = { GATHERING: 0, CRAFTING: 0, SERVICE: 0 };
    for (const p of activeProfessions) {
      const def = getProfessionByType(p.professionType);
      if (def) {
        categoryCounts[def.category] = (categoryCounts[def.category] ?? 0) + 1;
      }
    }

    const professions = ALL_PROFESSIONS.map((def) => {
      const existing = profMap.get(def.type as ProfessionType);

      let status: 'learned' | 'available' | 'locked' | 'inactive';
      let lockReason: string | null = null;

      if (existing && existing.isActive) {
        status = 'learned';
      } else if (existing && !existing.isActive) {
        // Previously learned but abandoned — can reactivate if limits allow
        if (activeCount >= MAX_ACTIVE_PROFESSIONS) {
          status = 'locked';
          lockReason = `Maximum ${MAX_ACTIVE_PROFESSIONS} active professions reached`;
        } else if (categoryCounts[def.category] >= CATEGORY_LIMITS[def.category]) {
          status = 'locked';
          lockReason = `Maximum ${CATEGORY_LIMITS[def.category]} ${def.category.toLowerCase()} professions reached`;
        } else {
          status = 'inactive';
        }
      } else {
        // Never learned
        if (activeCount >= MAX_ACTIVE_PROFESSIONS) {
          status = 'locked';
          lockReason = `Maximum ${MAX_ACTIVE_PROFESSIONS} active professions reached`;
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
        maxActive: MAX_ACTIVE_PROFESSIONS,
        currentActive: activeCount,
        categories: {
          GATHERING: { max: CATEGORY_LIMITS.GATHERING, current: categoryCounts.GATHERING },
          CRAFTING: { max: CATEGORY_LIMITS.CRAFTING, current: categoryCounts.CRAFTING },
          SERVICE: { max: CATEGORY_LIMITS.SERVICE, current: categoryCounts.SERVICE },
        },
      },
    });
  } catch (error) {
    console.error('Available professions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
