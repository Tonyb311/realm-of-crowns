import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { qualityRoll } from '@shared/utils/dice';
import { getProficiencyBonus, getModifier } from '@shared/utils/bounded-accuracy';
import { ProfessionTier, ProfessionType, BuildingType } from '@prisma/client';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { addProfessionXP } from '../services/profession-xp';
import { ACTION_XP } from '@shared/data/progression';
import {
  getRacialCraftSpeedBonus,
  getRacialCraftQualityBonus,
  getRacialMaterialReduction,
} from '../services/racial-profession-bonuses';
import { getProfessionByType } from '@shared/data/professions';
import {
  getForgebornOverclockMultiplier,
  getMaxQueueSlots,
} from '../services/racial-special-profession-mechanics';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { onCraftItem } from '../services/quest-triggers';
// emitCraftingReady is in '../socket/events' — called by background autocomplete job

const router = Router();

const startCraftSchema = z.object({
  recipeId: z.string().min(1, 'Recipe ID is required'),
});

const queueCraftSchema = z.object({
  recipeId: z.string().min(1, 'Recipe ID is required'),
  count: z.number().int().min(1).max(10).default(1),
});

const TIER_ORDER: ProfessionTier[] = [
  'APPRENTICE',
  'JOURNEYMAN',
  'CRAFTSMAN',
  'EXPERT',
  'MASTER',
  'GRANDMASTER',
];

// Tier -> minimum profession level required
const TIER_LEVEL_REQUIRED: Record<ProfessionTier, number> = {
  APPRENTICE: 1,
  JOURNEYMAN: 11,
  CRAFTSMAN: 26,
  EXPERT: 51,
  MASTER: 76,
  GRANDMASTER: 91,
};

// Profession type -> required workshop building type
const PROFESSION_WORKSHOP_MAP: Partial<Record<ProfessionType, BuildingType>> = {
  SMELTER: 'SMELTERY',
  BLACKSMITH: 'SMITHY',
  TANNER: 'TANNERY',
  TAILOR: 'TAILOR_SHOP',
  MASON: 'MASON_YARD',
  WOODWORKER: 'LUMBER_MILL',
  ALCHEMIST: 'ALCHEMY_LAB',
  ENCHANTER: 'ENCHANTING_TOWER',
  COOK: 'KITCHEN',
  BREWER: 'BREWERY',
  JEWELER: 'JEWELER_WORKSHOP',
  FLETCHER: 'FLETCHER_BENCH',
  LEATHERWORKER: 'TANNERY',
  ARMORER: 'SMITHY',
};

// Quality bonus values for cascading quality
const QUALITY_BONUS: Record<string, number> = {
  FINE: 1,
  SUPERIOR: 2,
  MASTERWORK: 3,
  LEGENDARY: 5,
};

// Map quality string from dice.ts to ItemRarity enum
const QUALITY_MAP: Record<string, 'POOR' | 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK' | 'LEGENDARY'> = {
  Poor: 'POOR',
  Common: 'COMMON',
  Fine: 'FINE',
  Superior: 'SUPERIOR',
  Masterwork: 'MASTERWORK',
  Legendary: 'LEGENDARY',
};

// Profession tier -> quality bonus for crafting rolls
const PROFESSION_TIER_QUALITY_BONUS: Record<ProfessionTier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  CRAFTSMAN: 2,
  EXPERT: 3,
  MASTER: 5,
  GRANDMASTER: 7,
};

function tierIndex(tier: ProfessionTier): number {
  return TIER_ORDER.indexOf(tier);
}

function getLevelRequired(tier: ProfessionTier): number {
  return TIER_LEVEL_REQUIRED[tier];
}

/**
 * Find the workshop building in the player's current town matching their profession.
 * Returns the building or null.
 */
async function findWorkshop(characterId: string, currentTownId: string | null, professionType: ProfessionType) {
  const requiredBuildingType = PROFESSION_WORKSHOP_MAP[professionType];
  if (!requiredBuildingType || !currentTownId) return null;

  return prisma.building.findFirst({
    where: {
      townId: currentTownId,
      type: requiredBuildingType,
    },
  });
}

/**
 * Build inventory map: templateId -> { total quantity, inventory entries with item/quality data }
 */
async function buildInventoryMap(characterId: string) {
  const inventory = await prisma.inventory.findMany({
    where: { characterId },
    include: { item: { include: { template: true } } },
  });

  const inventoryByTemplate = new Map<string, {
    total: number;
    entries: typeof inventory;
  }>();

  for (const inv of inventory) {
    const tid = inv.item.templateId;
    const existing = inventoryByTemplate.get(tid);
    if (existing) {
      existing.total += inv.quantity;
      existing.entries.push(inv);
    } else {
      inventoryByTemplate.set(tid, { total: inv.quantity, entries: [inv] });
    }
  }

  return { inventory, inventoryByTemplate };
}

/**
 * Calculate cascading quality bonus from consumed ingredients.
 * Averages quality bonuses across all ingredient slots.
 */
function calculateIngredientQualityBonus(
  ingredients: Array<{ itemTemplateId: string; quantity: number }>,
  inventoryByTemplate: Map<string, { total: number; entries: Array<{ quantity: number; item: { quality: string } }> }>,
): number {
  let totalBonus = 0;
  let totalItems = 0;

  for (const ing of ingredients) {
    const entries = inventoryByTemplate.get(ing.itemTemplateId)?.entries ?? [];
    let remaining = ing.quantity;

    for (const inv of entries) {
      if (remaining <= 0) break;
      const consumed = Math.min(inv.quantity, remaining);
      const bonus = QUALITY_BONUS[inv.item.quality] ?? 0;
      totalBonus += bonus * consumed;
      totalItems += consumed;
      remaining -= consumed;
    }
  }

  if (totalItems === 0) return 0;
  return totalBonus / totalItems;
}

/**
 * Consume ingredients from inventory within a Prisma transaction.
 */
async function consumeIngredients(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  ingredients: Array<{ itemTemplateId: string; quantity: number }>,
  inventoryByTemplate: Map<string, { total: number; entries: Array<{ id: string; itemId: string; quantity: number; item: { quality: string } }> }>,
) {
  for (const ing of ingredients) {
    let remaining = ing.quantity;
    const entries = inventoryByTemplate.get(ing.itemTemplateId)!.entries;

    for (const inv of entries) {
      if (remaining <= 0) break;

      if (inv.quantity <= remaining) {
        remaining -= inv.quantity;
        await tx.inventory.delete({ where: { id: inv.id } });
        await tx.item.delete({ where: { id: inv.itemId } });
      } else {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity - remaining },
        });
        remaining = 0;
      }
    }
  }
}

// =========================================================================
// GET /api/crafting/recipes
// =========================================================================
router.get('/recipes', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { profession, tier, level } = req.query;

    const where: Record<string, unknown> = {};
    if (profession && typeof profession === 'string') {
      where.professionType = profession;
    }
    if (tier && typeof tier === 'string') {
      where.tier = tier;
    }

    const recipes = await prisma.recipe.findMany({
      where,
      orderBy: [{ professionType: 'asc' }, { tier: 'asc' }, { name: 'asc' }],
    });

    // Get character professions for requirement checking
    const professions = await prisma.playerProfession.findMany({
      where: { characterId: character.id },
    });
    const profMap = new Map(professions.map(p => [p.professionType, p]));

    // Get inventory for canCraft / missingIngredients check
    const { inventoryByTemplate } = await buildInventoryMap(character.id);

    // Resolve ingredient template names
    const allTemplateIds = new Set<string>();
    for (const recipe of recipes) {
      const ingredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
      for (const ing of ingredients) {
        if (ing.itemTemplateId) allTemplateIds.add(ing.itemTemplateId);
      }
      if (recipe.result) allTemplateIds.add(recipe.result);
    }

    const templateIdArray = [...allTemplateIds].filter(Boolean);
    const templates = templateIdArray.length > 0 ? await prisma.itemTemplate.findMany({
      where: { id: { in: templateIdArray } },
      select: { id: true, name: true, type: true, rarity: true },
    }) : [];
    const templateMap = new Map(templates.map(t => [t.id, t]));

    let result = recipes.map(recipe => {
      const ingredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
      const prof = profMap.get(recipe.professionType);
      const hasRequiredProfession = prof ? tierIndex(prof.tier) >= tierIndex(recipe.tier) : false;
      // Per-recipe levelRequired overrides tier-based level if set
      const recipeLevelRequired = (recipe as any).levelRequired as number | null;
      const levelRequired = recipeLevelRequired ?? getLevelRequired(recipe.tier);
      const meetsLevelRequirement = prof ? prof.level >= levelRequired : false;

      // Specialization gating
      const recipeSpecialization = (recipe as any).specialization as string | null;
      const playerSpecialization = prof?.specialization ?? null;
      const meetsSpecialization = !recipeSpecialization || recipeSpecialization === playerSpecialization;

      // canCraft: check if player has all ingredients in sufficient quantities
      const missingIngredients: Array<{ itemTemplateId: string; itemName: string; needed: number; have: number }> = [];
      let canCraft = hasRequiredProfession && meetsLevelRequirement && meetsSpecialization;

      for (const ing of ingredients) {
        const available = inventoryByTemplate.get(ing.itemTemplateId)?.total ?? 0;
        if (available < ing.quantity) {
          canCraft = false;
          missingIngredients.push({
            itemTemplateId: ing.itemTemplateId,
            itemName: templateMap.get(ing.itemTemplateId)?.name ?? 'Unknown',
            needed: ing.quantity,
            have: available,
          });
        }
      }

      return {
        id: recipe.id,
        name: recipe.name,
        professionType: recipe.professionType,
        tier: recipe.tier,
        levelRequired,
        specialization: recipeSpecialization,
        meetsSpecialization,
        playerSpecialization,
        ingredients: ingredients.map(ing => ({
          itemTemplateId: ing.itemTemplateId,
          itemName: templateMap.get(ing.itemTemplateId)?.name ?? 'Unknown',
          quantity: ing.quantity,
        })),
        result: {
          itemTemplateId: recipe.result,
          itemName: templateMap.get(recipe.result)?.name ?? 'Unknown',
        },
        craftTime: recipe.craftTime,
        xpReward: recipe.xpReward,
        hasRequiredProfession,
        canCraft,
        missingIngredients,
      };
    });

    // Filter to recipes the player's level can craft when ?level=true
    if (level === 'true') {
      result = result.filter(r => {
        const prof = profMap.get(r.professionType);
        return prof ? prof.level >= r.levelRequired : false;
      });
    }

    return res.json({ recipes: result });
  } catch (error) {
    if (handlePrismaError(error, res, 'list recipes', req)) return;
    logRouteError(req, 500, 'List recipes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/crafting/start  (single craft — kept for backward compat)
// =========================================================================
router.post('/start', authGuard, characterGuard, requireTown, validate(startCraftSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipeId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Load the recipe
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check profession requirement
    const profession = await prisma.playerProfession.findFirst({
      where: {
        characterId: character.id,
        professionType: recipe.professionType,
      },
    });

    if (!profession) {
      return res.status(400).json({ error: `You do not have the ${recipe.professionType} profession` });
    }

    // Level-based gating: per-recipe levelRequired overrides tier-based
    const recipeLevelRequired = (recipe as any).levelRequired as number | null;
    const levelRequired = recipeLevelRequired ?? getLevelRequired(recipe.tier);
    if (profession.level < levelRequired) {
      return res.status(400).json({
        error: `Requires level ${levelRequired} in ${recipe.professionType}, you are level ${profession.level}`,
      });
    }

    if (tierIndex(profession.tier) < tierIndex(recipe.tier)) {
      return res.status(400).json({
        error: `Requires ${recipe.tier} tier in ${recipe.professionType}, you are ${profession.tier}`,
      });
    }

    // Specialization gating
    const recipeSpecialization = (recipe as any).specialization as string | null;
    if (recipeSpecialization && profession.specialization !== recipeSpecialization) {
      return res.status(400).json({
        error: `Requires ${recipeSpecialization} specialization in ${recipe.professionType}`,
      });
    }

    // Check not already crafting
    const activeCraft = await prisma.craftingAction.findFirst({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
    });
    if (activeCraft) {
      return res.status(400).json({ error: 'Already crafting something' });
    }

    // Check not traveling
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'Cannot craft while traveling' });
    }

    // Workshop check
    const workshop = await findWorkshop(character.id, character.currentTownId, recipe.professionType);

    // Higher-tier recipes require a workshop
    if (recipe.tier !== 'APPRENTICE' && !workshop) {
      const requiredBuildingType = PROFESSION_WORKSHOP_MAP[recipe.professionType];
      return res.status(400).json({
        error: `${recipe.tier} tier recipes require a ${requiredBuildingType ?? 'workshop'} in your current town`,
      });
    }

    const workshopLevel = workshop?.level ?? 0;

    // Check ingredients (apply racial material reduction)
    const rawIngredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
    const matReduction = getRacialMaterialReduction(character.race, character.level);
    const ingredients = rawIngredients.map(ing => ({
      ...ing,
      quantity: matReduction.reduction > 0
        ? Math.max(1, Math.round(ing.quantity * (1 - matReduction.reduction)))
        : ing.quantity,
    }));

    const { inventoryByTemplate } = await buildInventoryMap(character.id);

    for (const ing of ingredients) {
      const available = inventoryByTemplate.get(ing.itemTemplateId)?.total ?? 0;
      if (available < ing.quantity) {
        const template = await prisma.itemTemplate.findUnique({ where: { id: ing.itemTemplateId } });
        return res.status(400).json({
          error: `Not enough ${template?.name ?? 'materials'}: need ${ing.quantity}, have ${available}`,
        });
      }
    }

    // Calculate cascading quality bonus from ingredient qualities
    const ingredientQualityBonus = calculateIngredientQualityBonus(
      ingredients,
      inventoryByTemplate as Map<string, { total: number; entries: Array<{ quantity: number; item: { quality: string } }> }>,
    );

    // Compute craft time with level bonus + workshop speed bonus + racial speed bonus
    const now = new Date();
    const levelBonus = profession.level * 0.02; // 2% per level
    const workshopSpeedBonus = workshopLevel * 0.10; // 10% per workshop level
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const racialSpeed = getRacialCraftSpeedBonus(character.race, subRaceData, recipe.professionType);
    const overclockMultiplier = await getForgebornOverclockMultiplier(character.id);
    const adjustedCraftTime = Math.max(1, Math.round(
      recipe.craftTime * (1 - levelBonus - workshopSpeedBonus - racialSpeed.speedBonus) / overclockMultiplier,
    ));
    const completesAt = new Date(now.getTime() + adjustedCraftTime * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await consumeIngredients(tx, ingredients, inventoryByTemplate as any);

      await tx.craftingAction.create({
        data: {
          characterId: character.id,
          recipeId: recipe.id,
          status: 'IN_PROGRESS',
          tickDate: now,
        },
      });
    });

    return res.status(201).json({
      crafting: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        startedAt: now.toISOString(),
        completesAt: completesAt.toISOString(),
        craftTimeMinutes: adjustedCraftTime,
        workshop: workshop ? {
          buildingId: workshop.id,
          name: workshop.name,
          level: workshopLevel,
          speedBonus: `${Math.round(workshopSpeedBonus * 100)}%`,
          qualityBonus: workshopLevel,
        } : null,
        ingredientQualityBonus: Math.round(ingredientQualityBonus * 100) / 100,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'start crafting', req)) return;
    logRouteError(req, 500, 'Start crafting error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/crafting/status
// =========================================================================
router.get('/status', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const activeCraft = await prisma.craftingAction.findFirst({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
      include: { recipe: true },
    });

    if (!activeCraft) {
      return res.json({ crafting: false });
    }

    const now = new Date();
    const elapsedMs = now.getTime() - activeCraft.createdAt.getTime();
    const requiredMs = activeCraft.recipe.craftTime * 60 * 1000;
    const isReady = elapsedMs >= requiredMs;
    const remainingMinutes = isReady ? 0 : Math.ceil((requiredMs - elapsedMs) / 60000);

    return res.json({
      crafting: true,
      ready: isReady,
      recipeId: activeCraft.recipeId,
      recipeName: activeCraft.recipe.name,
      lockedInAt: activeCraft.createdAt.toISOString(),
      completesAt: new Date(activeCraft.createdAt.getTime() + requiredMs).toISOString(),
      remainingMinutes,
      message: isReady
        ? 'Crafting complete! Collect your item.'
        : `Crafting in progress. ${remainingMinutes} minute(s) remaining.`,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'crafting status', req)) return;
    logRouteError(req, 500, 'Crafting status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/crafting/collect — collects the FIRST completed action in queue
// =========================================================================
router.post('/collect', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Find the earliest completed crafting action (status COMPLETED, ready to collect)
    let activeCraft = await prisma.craftingAction.findFirst({
      where: {
        characterId: character.id,
        status: 'COMPLETED',
      },
      include: { recipe: true },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-complete: if no COMPLETED craft exists, check IN_PROGRESS crafts
    // whose craftTime has elapsed and transition them to COMPLETED.
    if (!activeCraft) {
      const pendingCraft = await prisma.craftingAction.findFirst({
        where: { characterId: character.id, status: 'IN_PROGRESS' },
        include: { recipe: true },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingCraft) {
        const elapsedMs = Date.now() - pendingCraft.createdAt.getTime();
        const requiredMs = pendingCraft.recipe.craftTime * 60 * 1000;

        if (elapsedMs >= requiredMs) {
          // Auto-transition to COMPLETED
          await prisma.craftingAction.update({
            where: { id: pendingCraft.id },
            data: { status: 'COMPLETED' },
          });
          activeCraft = { ...pendingCraft, status: 'COMPLETED' };
        } else {
          const remainingMinutes = Math.ceil((requiredMs - elapsedMs) / 60000);
          return res.status(400).json({
            error: `Crafting is not yet complete. ${remainingMinutes} minute(s) remaining.`,
          });
        }
      } else {
        return res.status(400).json({ error: 'No active crafting action' });
      }
    }

    // Get profession for quality roll
    const profession = await prisma.playerProfession.findFirst({
      where: {
        characterId: character.id,
        professionType: activeCraft.recipe.professionType,
      },
    });

    const profLevel = profession?.level ?? 1;

    // Get equipped tool bonus
    const equippedTool = await prisma.characterEquipment.findUnique({
      where: {
        characterId_slot: { characterId: character.id, slot: 'TOOL' },
      },
      include: { item: { include: { template: true } } },
    });
    let toolBonus = 0;
    if (equippedTool && equippedTool.item.template.type === 'TOOL') {
      const toolStats = equippedTool.item.template.stats as Record<string, unknown>;
      if (toolStats.professionType === activeCraft.recipe.professionType) {
        toolBonus = (typeof toolStats.qualityBonus === 'number') ? toolStats.qualityBonus : 0;
      }
    }

    // Workshop quality bonus
    const workshop = await findWorkshop(character.id, character.currentTownId, activeCraft.recipe.professionType);
    const workshopBonus = workshop?.level ?? 0;

    // Racial quality bonus
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const racialQuality = getRacialCraftQualityBonus(character.race, subRaceData, activeCraft.recipe.professionType);

    // Profession tier bonus
    const professionTierBonus = PROFESSION_TIER_QUALITY_BONUS[profession?.tier ?? 'APPRENTICE'];

    // Stat modifier from profession's primary stat
    const profDef = getProfessionByType(activeCraft.recipe.professionType);
    const characterStats = character.stats as Record<string, number>;
    const primaryStatKey = profDef?.primaryStat?.toLowerCase() ?? 'int';
    const statModifier = getModifier(characterStats[primaryStatKey] ?? 10);

    const { roll: diceRoll, total, quality: qualityName } = qualityRoll(
      getProficiencyBonus(character.level),
      statModifier,
      toolBonus,
      workshopBonus,
      racialQuality.qualityBonus,
      professionTierBonus,
      0, // ingredientQualityBonus — ingredients already consumed at collect time
    );
    const quality = QUALITY_MAP[qualityName] ?? 'COMMON';

    // Get result template
    const resultTemplate = await prisma.itemTemplate.findUnique({
      where: { id: activeCraft.recipe.result },
    });

    if (!resultTemplate) {
      return res.status(500).json({ error: 'Result item template not found' });
    }

    // Transaction: atomically mark collected, create item, add to inventory
    // P0 #5 FIX: Use updateMany with status guard to prevent double-collect race condition
    const xpGain = Math.floor(activeCraft.recipe.xpReward * ACTION_XP.WORK_CRAFT_MULTIPLIER);

    const craftedItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.craftingAction.updateMany({
        where: { id: activeCraft.id, status: 'COMPLETED' },
        data: { status: 'COLLECTED', quality },
      });

      if (updated.count === 0) {
        throw new Error('ALREADY_COLLECTED');
      }

      const item = await tx.item.create({
        data: {
          templateId: resultTemplate.id,
          ownerId: character.id,
          currentDurability: resultTemplate.durability,
          quality,
          craftedById: character.id,
          enchantments: [],
        },
      });

      await tx.inventory.create({
        data: {
          characterId: character.id,
          itemId: item.id,
          quantity: 1,
        },
      });

      return item;
    });

    // Award profession XP
    let xpResult = null;
    if (profession) {
      xpResult = await addProfessionXP(
        character.id,
        activeCraft.recipe.professionType,
        xpGain,
        `Crafted ${resultTemplate.name}`,
      );
    }

    // Grant character XP
    await prisma.character.update({
      where: { id: character.id },
      data: { xp: { increment: xpGain } },
    });

    await checkLevelUp(character.id);

    // Check crafting achievements (count both COMPLETED and COLLECTED statuses)
    const itemsCrafted = await prisma.craftingAction.count({
      where: { characterId: character.id, status: { in: ['COMPLETED', 'COLLECTED'] } },
    });
    await checkAchievements(character.id, 'crafting', {
      itemsCrafted,
      professionTier: xpResult?.newTier ?? profession?.tier ?? 'APPRENTICE',
    });

    onCraftItem(character.id).catch(() => {}); // fire-and-forget

    // Check remaining queue
    const remainingInQueue = await prisma.craftingAction.count({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
    });

    return res.json({
      collected: true,
      item: {
        id: craftedItem.id,
        name: resultTemplate.name,
        type: resultTemplate.type,
        quality,
        craftedBy: character.name,
      },
      qualityRoll: {
        roll: diceRoll,
        total,
        quality,
      },
      xpAwarded: xpGain,
      profession: {
        type: activeCraft.recipe.professionType,
        level: xpResult?.newLevel ?? profLevel,
        tier: xpResult?.newTier ?? profession?.tier ?? 'APPRENTICE',
        leveledUp: xpResult?.leveledUp ?? false,
      },
      remainingInQueue,
    });
  } catch (error: any) {
    if (handlePrismaError(error, res, 'collect crafting', req)) return;
    // P0 #5 FIX: Return 409 if already collected (race condition guard)
    if (error?.message === 'ALREADY_COLLECTED') {
      return res.status(409).json({ error: 'Crafting action already collected' });
    }
    logRouteError(req, 500, 'Collect crafting error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/crafting/queue — batch craft { recipeId, count: 1-10 }
// =========================================================================
router.post('/queue', authGuard, characterGuard, requireTown, validate(queueCraftSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipeId, count } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check profession
    const profession = await prisma.playerProfession.findFirst({
      where: {
        characterId: character.id,
        professionType: recipe.professionType,
      },
    });

    if (!profession) {
      return res.status(400).json({ error: `You do not have the ${recipe.professionType} profession` });
    }

    // Level-based gating: per-recipe levelRequired overrides tier-based
    const recipeLevelRequired = (recipe as any).levelRequired as number | null;
    const levelRequired = recipeLevelRequired ?? getLevelRequired(recipe.tier);
    if (profession.level < levelRequired) {
      return res.status(400).json({
        error: `Requires level ${levelRequired} in ${recipe.professionType}, you are level ${profession.level}`,
      });
    }

    if (tierIndex(profession.tier) < tierIndex(recipe.tier)) {
      return res.status(400).json({
        error: `Requires ${recipe.tier} tier in ${recipe.professionType}, you are ${profession.tier}`,
      });
    }

    // Specialization gating
    const recipeSpecialization = (recipe as any).specialization as string | null;
    if (recipeSpecialization && profession.specialization !== recipeSpecialization) {
      return res.status(400).json({
        error: `Requires ${recipeSpecialization} specialization in ${recipe.professionType}`,
      });
    }

    // Check not traveling
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'Cannot craft while traveling' });
    }

    // Workshop check
    const workshop = await findWorkshop(character.id, character.currentTownId, recipe.professionType);

    if (recipe.tier !== 'APPRENTICE' && !workshop) {
      const requiredBuildingType = PROFESSION_WORKSHOP_MAP[recipe.professionType];
      return res.status(400).json({
        error: `${recipe.tier} tier recipes require a ${requiredBuildingType ?? 'workshop'} in your current town`,
      });
    }

    const workshopLevel = workshop?.level ?? 0;

    // Check queue slot limits (Forgeborn Tireless Worker gets 50% more)
    const existingQueueCount = await prisma.craftingAction.count({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
    });
    const maxSlots = await getMaxQueueSlots(character.id);
    if (existingQueueCount + count > maxSlots) {
      return res.status(400).json({
        error: `Queue limit exceeded: ${existingQueueCount} in queue + ${count} requested > ${maxSlots} max slots`,
      });
    }

    // Validate ALL materials for the full batch (apply racial material reduction)
    const rawIngredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
    const matReduction = getRacialMaterialReduction(character.race, character.level);
    const ingredients = rawIngredients.map(ing => ({
      ...ing,
      quantity: matReduction.reduction > 0
        ? Math.max(1, Math.round(ing.quantity * (1 - matReduction.reduction)))
        : ing.quantity,
    }));
    const { inventoryByTemplate } = await buildInventoryMap(character.id);

    for (const ing of ingredients) {
      const needed = ing.quantity * count;
      const available = inventoryByTemplate.get(ing.itemTemplateId)?.total ?? 0;
      if (available < needed) {
        const template = await prisma.itemTemplate.findUnique({ where: { id: ing.itemTemplateId } });
        return res.status(400).json({
          error: `Not enough ${template?.name ?? 'materials'}: need ${needed} (${ing.quantity} x ${count}), have ${available}`,
        });
      }
    }

    // Calculate cascading quality bonus
    const ingredientQualityBonus = calculateIngredientQualityBonus(
      // Scale ingredient quantities by batch count for the bonus calc
      ingredients.map(ing => ({ ...ing, quantity: ing.quantity * count })),
      inventoryByTemplate as Map<string, { total: number; entries: Array<{ quantity: number; item: { quality: string } }> }>,
    );

    // Compute craft time per item with racial speed bonus + Overclock
    const levelBonus = profession.level * 0.02;
    const workshopSpeedBonus = workshopLevel * 0.10;
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const racialSpeed = getRacialCraftSpeedBonus(character.race, subRaceData, recipe.professionType);
    const overclockMultiplier = await getForgebornOverclockMultiplier(character.id);
    const adjustedCraftTime = Math.max(1, Math.round(
      recipe.craftTime * (1 - levelBonus - workshopSpeedBonus - racialSpeed.speedBonus) / overclockMultiplier,
    ));

    const now = new Date();

    // Consume ALL materials and create crafting actions (daily-tick model: all resolve at tick)
    const craftingActions = await prisma.$transaction(async (tx) => {
      // Consume ingredients for the full batch
      const batchIngredients = ingredients.map(ing => ({
        itemTemplateId: ing.itemTemplateId,
        quantity: ing.quantity * count,
      }));
      await consumeIngredients(tx, batchIngredients, inventoryByTemplate as any);

      // Create crafting actions (all locked in for today's tick)
      const actions = [];
      for (let i = 0; i < count; i++) {
        const action = await tx.craftingAction.create({
          data: {
            characterId: character.id,
            recipeId: recipe.id,
            status: 'IN_PROGRESS',
            tickDate: now,
          },
        });
        actions.push(action);
      }

      return actions;
    });

    return res.status(201).json({
      queued: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        count,
        craftTimePerItem: adjustedCraftTime,
        totalCraftTimeMinutes: adjustedCraftTime * count,
        actions: craftingActions.map((a, i) => ({
          id: a.id,
          index: i + 1,
          createdAt: a.createdAt.toISOString(),
          tickDate: a.tickDate?.toISOString() ?? null,
        })),
        workshop: workshop ? {
          buildingId: workshop.id,
          name: workshop.name,
          level: workshopLevel,
          speedBonus: `${Math.round(workshopSpeedBonus * 100)}%`,
          qualityBonus: workshopLevel,
        } : null,
        ingredientQualityBonus: Math.round(ingredientQualityBonus * 100) / 100,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'queue crafting', req)) return;
    logRouteError(req, 500, 'Queue crafting error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/crafting/queue — returns all IN_PROGRESS crafting actions
// =========================================================================
router.get('/queue', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const actions = await prisma.craftingAction.findMany({
      where: {
        characterId: character.id,
        status: 'IN_PROGRESS',
      },
      include: { recipe: true },
      orderBy: { createdAt: 'asc' },
    });

    const queue = actions.map((action, index) => ({
      id: action.id,
      index: index + 1,
      recipeId: action.recipeId,
      recipeName: action.recipe.name,
      createdAt: action.createdAt.toISOString(),
      tickDate: action.tickDate?.toISOString() ?? null,
      ready: false, // In daily-tick model, resolved at tick
    }));

    const readyCount = 0;

    return res.json({
      queue,
      total: queue.length,
      readyCount,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get crafting queue', req)) return;
    logRouteError(req, 500, 'Get crafting queue error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
