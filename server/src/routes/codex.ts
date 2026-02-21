import { Router, Request, Response } from 'express';
import { cache } from '../middleware/cache';
import { prisma } from '../lib/prisma';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

// Shared data (class/spec/ability/profession data lives in shared TS, not DB)
import { VALID_CLASSES, SPECIALIZATIONS, ABILITIES_BY_CLASS } from '@shared/data/skills';
import { ALL_PROFESSIONS, PROFESSION_TIERS } from '@shared/data/professions';
import { PROFESSION_TIER_UNLOCKS } from '@shared/data/professions/tier-unlocks';
import { getAllRaces } from '@shared/data/races';
import { getReleasedRaceKeys } from '../lib/content-release';

const router = Router();

// =========================================================================
// GET /api/codex/races — all released races with full definitions
// =========================================================================
router.get('/races', cache(300), async (req: Request, res: Response) => {
  try {
    const releasedKeys = await getReleasedRaceKeys();
    const races = getAllRaces().filter(r => releasedKeys.has(r.id));

    return res.json({ races, total: races.length });
  } catch (error) {
    logRouteError(req, 500, 'Codex races error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/codex/classes — all 7 classes with specializations and abilities
// =========================================================================
router.get('/classes', cache(300), (_req: Request, res: Response) => {
  try {
    const classes = (VALID_CLASSES || []).map(cls => ({
      name: cls,
      specializations: SPECIALIZATIONS?.[cls] || [],
      abilities: (ABILITIES_BY_CLASS?.[cls] || []).map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        specialization: a.specialization,
        tier: a.tier,
        levelRequired: a.levelRequired,
        cooldown: a.cooldown,
        effects: a.effects,
      })),
    }));

    return res.json({ classes });
  } catch (error) {
    logRouteError(_req, 500, 'Codex classes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/codex/professions — all 29 professions with tier unlocks + DB recipes
// =========================================================================
router.get('/professions', cache(300), async (req: Request, res: Response) => {
  try {
    // Recipes from DB so changes are always live
    const dbRecipes = await prisma.recipe.findMany({
      orderBy: [{ professionType: 'asc' }, { tier: 'asc' }, { name: 'asc' }],
    });

    // Group recipes by profession type
    const recipesByProfession = new Map<string, typeof dbRecipes>();
    for (const recipe of dbRecipes) {
      const list = recipesByProfession.get(recipe.professionType) ?? [];
      list.push(recipe);
      recipesByProfession.set(recipe.professionType, list);
    }

    const professions = (ALL_PROFESSIONS || []).map(p => ({
      type: p.type,
      name: p.name,
      category: p.category,
      description: p.description,
      primaryStat: p.primaryStat,
      relatedProfessions: p.relatedProfessions || [],
      tierUnlocks: p.tierUnlocks,
      recipes: (recipesByProfession.get(p.type) || []).map(r => ({
        id: r.id,
        name: r.name,
        tier: r.tier,
        levelRequired: r.levelRequired,
        ingredients: r.ingredients,
        result: r.result,
        craftTime: r.craftTime,
        xpReward: r.xpReward,
        specialization: r.specialization,
      })),
    }));

    return res.json({
      professions,
      tiers: PROFESSION_TIERS,
      tierUnlocks: PROFESSION_TIER_UNLOCKS,
      total: professions.length,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'codex professions', req)) return;
    logRouteError(req, 500, 'Codex professions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/codex/items — all item templates from DB
// =========================================================================
router.get('/items', cache(300), async (req: Request, res: Response) => {
  try {
    const items = await prisma.itemTemplate.findMany({
      orderBy: [{ type: 'asc' }, { rarity: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        rarity: true,
        description: true,
        stats: true,
        durability: true,
        baseValue: true,
        professionRequired: true,
        levelRequired: true,
      },
    });

    return res.json({ items, total: items.length });
  } catch (error) {
    if (handlePrismaError(error, res, 'codex items', req)) return;
    logRouteError(req, 500, 'Codex items error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/codex/monsters — player-appropriate monster info (no drop rates)
// =========================================================================
router.get('/monsters', cache(300), async (req: Request, res: Response) => {
  try {
    const monsters = await prisma.monster.findMany({
      include: { region: { select: { name: true } } },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    const sanitized = monsters.map(m => {
      const stats = (m.stats as Record<string, any>) || {};
      const lootTable = (m.lootTable as any[]) || [];

      // Only expose gold range, not exact drop rates
      let maxGold = 0;
      for (const entry of lootTable) {
        maxGold += (entry.gold ?? 0) * (entry.maxQty ?? 1);
      }

      return {
        name: m.name,
        level: m.level,
        biome: m.biome,
        regionName: m.region?.name ?? null,
        stats: {
          hp: stats.hp ?? 0,
          ac: stats.ac ?? 10,
          attack: stats.attack ?? 0,
          damage: stats.damage ?? '1d4',
        },
        resistances: (stats.resistances as string[]) || [],
        goldRange: maxGold > 0 ? `Up to ${maxGold}g` : 'None',
      };
    });

    return res.json({ monsters: sanitized, total: sanitized.length });
  } catch (error) {
    if (handlePrismaError(error, res, 'codex monsters', req)) return;
    logRouteError(req, 500, 'Codex monsters error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/codex/recipes — all recipes from DB
// =========================================================================
router.get('/recipes', cache(300), async (req: Request, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: [{ professionType: 'asc' }, { tier: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        professionType: true,
        tier: true,
        ingredients: true,
        result: true,
        craftTime: true,
        xpReward: true,
        specialization: true,
        levelRequired: true,
      },
    });

    return res.json({ recipes, total: recipes.length });
  } catch (error) {
    if (handlePrismaError(error, res, 'codex recipes', req)) return;
    logRouteError(req, 500, 'Codex recipes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
