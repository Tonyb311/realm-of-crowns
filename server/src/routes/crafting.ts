import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { sql, count } from 'drizzle-orm';
import { recipes, playerProfessions, inventories, items, itemTemplates, craftingActions, characterEquipment, buildings, characters } from '@database/tables';
import { professionTier as professionTierEnum, professionType as professionTypeEnum, buildingType as buildingTypeEnum } from '@database/enums';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { qualityRoll } from '@shared/utils/dice';
import { getProficiencyBonus, getModifier } from '@shared/utils/bounded-accuracy';
import {
  TIER_ORDER,
  TIER_LEVEL_REQUIRED,
  PROFESSION_WORKSHOP_MAP,
  QUALITY_BONUS,
  QUALITY_MAP,
  PROFESSION_TIER_QUALITY_BONUS,
} from '@shared/data/crafting-config';
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
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { onCraftItem } from '../services/quest-triggers';
import { calculateWeightState } from '../services/weight-calculator';
import { computeFeatBonus } from '@shared/data/feats';
// emitCraftingReady is in '../socket/events' — called by background autocomplete job

type ProfessionTier = typeof professionTierEnum.enumValues[number];
type ProfessionType = typeof professionTypeEnum.enumValues[number];
type BuildingType = typeof buildingTypeEnum.enumValues[number];

const router = Router();

const startCraftSchema = z.object({
  recipeId: z.string().min(1, 'Recipe ID is required'),
});

const queueCraftSchema = z.object({
  recipeId: z.string().min(1, 'Recipe ID is required'),
  count: z.number().int().min(1).max(10).default(1),
});

// Crafting constants imported from @shared/data/crafting-config

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

  return db.query.buildings.findFirst({
    where: and(eq(buildings.townId, currentTownId), eq(buildings.type, requiredBuildingType)),
  });
}

/**
 * Build inventory map: templateId -> { total quantity, inventory entries with item/quality data }
 */
async function buildInventoryMap(characterId: string) {
  const inventory = await db.query.inventories.findMany({
    where: eq(inventories.characterId, characterId),
    with: { item: { with: { itemTemplate: true } } },
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
 * Consume ingredients from inventory within a Drizzle transaction.
 */
async function consumeIngredients(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
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
        await tx.delete(inventories).where(eq(inventories.id, inv.id));
        await tx.delete(items).where(eq(items.id, inv.itemId));
      } else {
        await tx.update(inventories).set({ quantity: inv.quantity - remaining }).where(eq(inventories.id, inv.id));
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

    // Build filter conditions
    const conditions = [];
    if (profession && typeof profession === 'string') {
      conditions.push(eq(recipes.professionType, profession as any));
    }
    if (tier && typeof tier === 'string') {
      conditions.push(eq(recipes.tier, tier as any));
    }

    const allRecipes = conditions.length > 0
      ? await db.query.recipes.findMany({
          where: and(...conditions),
          orderBy: (r, { asc }) => [asc(r.professionType), asc(r.tier), asc(r.name)],
        })
      : await db.query.recipes.findMany({
          orderBy: (r, { asc }) => [asc(r.professionType), asc(r.tier), asc(r.name)],
        });

    // Get character professions for requirement checking
    const professions = await db.query.playerProfessions.findMany({
      where: eq(playerProfessions.characterId, character.id),
    });
    const profMap = new Map(professions.map(p => [p.professionType, p]));

    // Get inventory for canCraft / missingIngredients check
    const { inventoryByTemplate } = await buildInventoryMap(character.id);

    // Resolve ingredient template names
    const allTemplateIds = new Set<string>();
    for (const recipe of allRecipes) {
      const ingredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
      for (const ing of ingredients) {
        if (ing.itemTemplateId) allTemplateIds.add(ing.itemTemplateId);
      }
      if (recipe.result) allTemplateIds.add(recipe.result);
    }

    const templateIdArray = [...allTemplateIds].filter(Boolean);
    const templates = templateIdArray.length > 0 ? await db.query.itemTemplates.findMany({
      where: inArray(itemTemplates.id, templateIdArray),
      columns: { id: true, name: true, type: true, rarity: true, weight: true },
    }) : [];
    const templateMap = new Map(templates.map(t => [t.id, t]));

    let result = allRecipes.map(recipe => {
      const ingredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
      const prof = profMap.get(recipe.professionType);
      const hasRequiredProfession = prof ? tierIndex(prof.tier as ProfessionTier) >= tierIndex(recipe.tier as ProfessionTier) : false;
      // Per-recipe levelRequired overrides tier-based level if set
      const recipeLevelRequired = (recipe as any).levelRequired as number | null;
      const levelRequired = recipeLevelRequired ?? getLevelRequired(recipe.tier as ProfessionTier);
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
          resultWeight: templateMap.get(recipe.result)?.weight ?? 0,
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
    if (handleDbError(error, res, 'list recipes', req)) return;
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
    const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check profession requirement
    const profession = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, recipe.professionType)),
    });

    if (!profession) {
      return res.status(400).json({ error: `You do not have the ${recipe.professionType} profession` });
    }

    // Level-based gating: per-recipe levelRequired overrides tier-based
    const recipeLevelRequired = (recipe as any).levelRequired as number | null;
    const levelRequired = recipeLevelRequired ?? getLevelRequired(recipe.tier as ProfessionTier);
    if (profession.level < levelRequired) {
      return res.status(400).json({
        error: `Requires level ${levelRequired} in ${recipe.professionType}, you are level ${profession.level}`,
      });
    }

    if (tierIndex(profession.tier as ProfessionTier) < tierIndex(recipe.tier as ProfessionTier)) {
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

    // Check encumbrance — too overloaded to craft
    const weightState = await calculateWeightState(character.id);
    if (!weightState.encumbrance.canCraft) {
      return res.status(400).json({ error: 'You are too overloaded to craft.' });
    }

    // Check not already crafting
    const activeCraft = await db.query.craftingActions.findFirst({
      where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'IN_PROGRESS')),
    });
    if (activeCraft) {
      return res.status(400).json({ error: 'Already crafting something' });
    }

    // Check not traveling
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'Cannot craft while traveling' });
    }

    // Workshop check
    const workshop = await findWorkshop(character.id, character.currentTownId, recipe.professionType as ProfessionType);

    // Higher-tier recipes require a workshop
    if (recipe.tier !== 'APPRENTICE' && !workshop) {
      const requiredBuildingType = PROFESSION_WORKSHOP_MAP[recipe.professionType as ProfessionType];
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
        const template = await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, ing.itemTemplateId) });
        return res.status(400).json({
          error: `Not enough ${template?.name ?? 'materials'}: need ${ing.quantity}, have ${available}`,
        });
      }
    }

    // Calculate cascading quality bonus from ingredient qualities
    const ingredientQualityBonus = calculateIngredientQualityBonus(
      ingredients,
      inventoryByTemplate as unknown as Map<string, { total: number; entries: Array<{ quantity: number; item: { quality: string } }> }>,
    );

    // Compute craft time with level bonus + workshop speed bonus + racial speed bonus
    const now = new Date();
    const levelBonus = profession.level * 0.02; // 2% per level
    const workshopSpeedBonus = workshopLevel * 0.10; // 10% per workshop level
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const racialSpeed = getRacialCraftSpeedBonus(character.race, subRaceData, recipe.professionType);
    const overclockMultiplier = await getForgebornOverclockMultiplier(character.id);
    const baseCraftTime = Math.max(1, Math.round(
      recipe.craftTime * (1 - levelBonus - workshopSpeedBonus - racialSpeed.speedBonus) / overclockMultiplier,
    ));
    const adjustedCraftTime = weightState.encumbrance.craftTimeMultiplier > 1
      ? Math.max(1, Math.ceil(baseCraftTime * weightState.encumbrance.craftTimeMultiplier))
      : baseCraftTime;
    const completesAt = new Date(now.getTime() + adjustedCraftTime * 60 * 1000);

    await db.transaction(async (tx) => {
      await consumeIngredients(tx, ingredients, inventoryByTemplate as any);

      await tx.insert(craftingActions).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        recipeId: recipe.id,
        status: 'IN_PROGRESS',
        tickDate: now.toISOString(),
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
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'start crafting', req)) return;
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

    const activeCraft = await db.query.craftingActions.findFirst({
      where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'IN_PROGRESS')),
      with: { recipe: true },
    });

    if (!activeCraft) {
      return res.json({ crafting: false });
    }

    const now = new Date();
    const elapsedMs = now.getTime() - new Date(activeCraft.createdAt).getTime();
    const requiredMs = activeCraft.recipe.craftTime * 60 * 1000;
    const isReady = elapsedMs >= requiredMs;
    const remainingMinutes = isReady ? 0 : Math.ceil((requiredMs - elapsedMs) / 60000);

    return res.json({
      crafting: true,
      ready: isReady,
      recipeId: activeCraft.recipeId,
      recipeName: activeCraft.recipe.name,
      lockedInAt: activeCraft.createdAt,
      completesAt: new Date(new Date(activeCraft.createdAt).getTime() + requiredMs).toISOString(),
      remainingMinutes,
      message: isReady
        ? 'Crafting complete! Collect your item.'
        : `Crafting in progress. ${remainingMinutes} minute(s) remaining.`,
    });
  } catch (error) {
    if (handleDbError(error, res, 'crafting status', req)) return;
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
    let activeCraft = await db.query.craftingActions.findFirst({
      where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'COMPLETED')),
      with: { recipe: true },
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    });

    // Auto-complete: if no COMPLETED craft exists, check IN_PROGRESS crafts
    // whose craftTime has elapsed and transition them to COMPLETED.
    if (!activeCraft) {
      const pendingCraft = await db.query.craftingActions.findFirst({
        where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'IN_PROGRESS')),
        with: { recipe: true },
        orderBy: (c, { asc }) => [asc(c.createdAt)],
      });

      if (pendingCraft) {
        const elapsedMs = Date.now() - new Date(pendingCraft.createdAt).getTime();
        const requiredMs = pendingCraft.recipe.craftTime * 60 * 1000;

        if (elapsedMs >= requiredMs) {
          // Auto-transition to COMPLETED
          await db.update(craftingActions).set({ status: 'COMPLETED' }).where(eq(craftingActions.id, pendingCraft.id));
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
    const profession = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, activeCraft.recipe.professionType)),
    });

    const profLevel = profession?.level ?? 1;

    // Get equipped tool bonus
    const equippedTool = await db.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.characterId, character.id), eq(characterEquipment.slot, 'TOOL')),
      with: { item: { with: { itemTemplate: true } } },
    });
    let toolBonus = 0;
    if (equippedTool && equippedTool.item.itemTemplate.type === 'TOOL') {
      const toolStats = equippedTool.item.itemTemplate.stats as Record<string, unknown>;
      if (toolStats.professionType === activeCraft.recipe.professionType) {
        toolBonus = (typeof toolStats.qualityBonus === 'number') ? toolStats.qualityBonus : 0;
      }
    }

    // Workshop quality bonus
    const workshop = await findWorkshop(character.id, character.currentTownId, activeCraft.recipe.professionType as ProfessionType);
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

    const craftFeats = (character.feats as string[]) ?? [];
    const { roll: diceRoll, total, quality: qualityName } = qualityRoll(
      getProficiencyBonus(character.level),
      statModifier,
      toolBonus,
      workshopBonus,
      racialQuality.qualityBonus,
      professionTierBonus,
      0, // ingredientQualityBonus — ingredients already consumed at collect time
      computeFeatBonus(craftFeats, 'professionQualityBonus'),
    );
    const quality = QUALITY_MAP[qualityName] ?? 'COMMON';

    // Get result template
    const resultTemplate = await db.query.itemTemplates.findFirst({
      where: eq(itemTemplates.id, activeCraft.recipe.result),
    });

    if (!resultTemplate) {
      return res.status(500).json({ error: 'Result item template not found' });
    }

    // Transaction: atomically mark collected, create item, add to inventory
    // P0 #5 FIX: Use status guard to prevent double-collect race condition
    const xpGain = Math.floor(activeCraft.recipe.xpReward * ACTION_XP.WORK_CRAFT_MULTIPLIER);

    const craftedItem = await db.transaction(async (tx) => {
      // Guard: only update if still COMPLETED (prevents double-collect)
      const updated = await tx.update(craftingActions)
        .set({ status: 'COLLECTED' as any, quality })
        .where(and(eq(craftingActions.id, activeCraft!.id), eq(craftingActions.status, 'COMPLETED')))
        .returning();

      if (updated.length === 0) {
        throw new Error('ALREADY_COLLECTED');
      }

      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: resultTemplate.id,
        ownerId: character.id,
        currentDurability: resultTemplate.durability,
        quality,
        craftedById: character.id,
        enchantments: [],
      }).returning();

      await tx.insert(inventories).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        itemId: item.id,
        quantity: 1,
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

    // Grant character XP (with feat bonus)
    const finalCraftXp = Math.round(xpGain * (1 + computeFeatBonus(craftFeats, 'xpBonus')));
    await db.update(characters).set({ xp: sql`${characters.xp} + ${finalCraftXp}` }).where(eq(characters.id, character.id));

    await checkLevelUp(character.id);

    // Check crafting achievements (count both COMPLETED and COLLECTED statuses)
    const allCraftActions = await db.query.craftingActions.findMany({
      where: eq(craftingActions.characterId, character.id),
    });
    const itemsCrafted = allCraftActions.filter(
      (a: any) => a.status === 'COMPLETED' || a.status === 'COLLECTED'
    ).length;
    await checkAchievements(character.id, 'crafting', {
      itemsCrafted,
      professionTier: xpResult?.newTier ?? profession?.tier ?? 'APPRENTICE',
    });

    onCraftItem(character.id).catch(() => {}); // fire-and-forget

    // Check remaining queue
    const remainingActions = await db.query.craftingActions.findMany({
      where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'IN_PROGRESS')),
    });
    const remainingInQueue = remainingActions.length;

    const weightState = await calculateWeightState(character.id);

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
      weightState,
    });
  } catch (error: unknown) {
    if (handleDbError(error, res, 'collect crafting', req)) return;
    // P0 #5 FIX: Return 409 if already collected (race condition guard)
    if (error instanceof Error && error.message === 'ALREADY_COLLECTED') {
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
    const { recipeId, count: batchCount } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check profession
    const profession = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, recipe.professionType)),
    });

    if (!profession) {
      return res.status(400).json({ error: `You do not have the ${recipe.professionType} profession` });
    }

    // Level-based gating: per-recipe levelRequired overrides tier-based
    const recipeLevelRequired = (recipe as any).levelRequired as number | null;
    const levelRequired = recipeLevelRequired ?? getLevelRequired(recipe.tier as ProfessionTier);
    if (profession.level < levelRequired) {
      return res.status(400).json({
        error: `Requires level ${levelRequired} in ${recipe.professionType}, you are level ${profession.level}`,
      });
    }

    if (tierIndex(profession.tier as ProfessionTier) < tierIndex(recipe.tier as ProfessionTier)) {
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
    const workshop = await findWorkshop(character.id, character.currentTownId, recipe.professionType as ProfessionType);

    if (recipe.tier !== 'APPRENTICE' && !workshop) {
      const requiredBuildingType = PROFESSION_WORKSHOP_MAP[recipe.professionType as ProfessionType];
      return res.status(400).json({
        error: `${recipe.tier} tier recipes require a ${requiredBuildingType ?? 'workshop'} in your current town`,
      });
    }

    const workshopLevel = workshop?.level ?? 0;

    // Check queue slot limits (Forgeborn Tireless Worker gets 50% more)
    const existingQueueActions = await db.query.craftingActions.findMany({
      where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'IN_PROGRESS')),
    });
    const existingQueueCount = existingQueueActions.length;
    const maxSlots = await getMaxQueueSlots(character.id);
    if (existingQueueCount + batchCount > maxSlots) {
      return res.status(400).json({
        error: `Queue limit exceeded: ${existingQueueCount} in queue + ${batchCount} requested > ${maxSlots} max slots`,
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
      const needed = ing.quantity * batchCount;
      const available = inventoryByTemplate.get(ing.itemTemplateId)?.total ?? 0;
      if (available < needed) {
        const template = await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, ing.itemTemplateId) });
        return res.status(400).json({
          error: `Not enough ${template?.name ?? 'materials'}: need ${needed} (${ing.quantity} x ${batchCount}), have ${available}`,
        });
      }
    }

    // Calculate cascading quality bonus
    const ingredientQualityBonus = calculateIngredientQualityBonus(
      // Scale ingredient quantities by batch count for the bonus calc
      ingredients.map(ing => ({ ...ing, quantity: ing.quantity * batchCount })),
      inventoryByTemplate as unknown as Map<string, { total: number; entries: Array<{ quantity: number; item: { quality: string } }> }>,
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
    const craftingActionResults = await db.transaction(async (tx) => {
      // Consume ingredients for the full batch
      const batchIngredients = ingredients.map(ing => ({
        itemTemplateId: ing.itemTemplateId,
        quantity: ing.quantity * batchCount,
      }));
      await consumeIngredients(tx, batchIngredients, inventoryByTemplate as any);

      // Create crafting actions (all locked in for today's tick)
      const actions = [];
      for (let i = 0; i < batchCount; i++) {
        const [action] = await tx.insert(craftingActions).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          recipeId: recipe.id,
          status: 'IN_PROGRESS',
          tickDate: now.toISOString(),
        }).returning();
        actions.push(action);
      }

      return actions;
    });

    return res.status(201).json({
      queued: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        count: batchCount,
        craftTimePerItem: adjustedCraftTime,
        totalCraftTimeMinutes: adjustedCraftTime * batchCount,
        actions: craftingActionResults.map((a, i) => ({
          id: a.id,
          index: i + 1,
          createdAt: a.createdAt,
          tickDate: a.tickDate ?? null,
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
    if (handleDbError(error, res, 'queue crafting', req)) return;
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

    const actions = await db.query.craftingActions.findMany({
      where: and(eq(craftingActions.characterId, character.id), eq(craftingActions.status, 'IN_PROGRESS')),
      with: { recipe: true },
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    });

    const queue = actions.map((action, index) => ({
      id: action.id,
      index: index + 1,
      recipeId: action.recipeId,
      recipeName: action.recipe.name,
      createdAt: action.createdAt,
      tickDate: action.tickDate ?? null,
      ready: false, // In daily-tick model, resolved at tick
    }));

    const readyCount = 0;

    return res.json({
      queue,
      total: queue.length,
      readyCount,
    });
  } catch (error) {
    if (handleDbError(error, res, 'get crafting queue', req)) return;
    logRouteError(req, 500, 'Get crafting queue error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
