/**
 * Crafted Goods Recipe & Item Template Seed Data for Realm of Crowns
 *
 * Seeds ItemTemplates and Recipe rows for:
 *   - WOODWORKER finished goods (14 recipes: tools, furniture, shields, bow)
 *   - BLACKSMITH specialization recipes (28 recipes: toolsmith, weaponsmith, armorer)
 *
 * Depends on: seedRecipes() having run first (for material templates).
 */

import { PrismaClient, ProfessionType, ProfessionTier, ItemRarity } from '@prisma/client';
import { WOODWORKER_FINISHED_GOODS } from '@shared/data/recipes/woodworker';
import { BLACKSMITH_RECIPES } from '@shared/data/recipes/blacksmith';
import { FinishedGoodsRecipe, WeaponStats, ArmorStats } from '@shared/data/recipes/types';

// ============================================================
// HELPER: Map level to ProfessionTier
// ============================================================

function levelToTier(level: number): ProfessionTier {
  if (level >= 75) return 'MASTER';
  if (level >= 50) return 'EXPERT';
  if (level >= 30) return 'CRAFTSMAN';
  if (level >= 10) return 'JOURNEYMAN';
  return 'APPRENTICE';
}

// ============================================================
// HELPER: Map tier to ItemRarity
// ============================================================

function tierToRarity(tier: number): ItemRarity {
  switch (tier) {
    case 1: return 'COMMON';
    case 2: return 'COMMON';
    case 3: return 'FINE';
    case 4: return 'MASTERWORK';
    case 5: return 'LEGENDARY';
    default: return 'COMMON';
  }
}

// ============================================================
// HELPER: Generate description from recipe stats and type
// ============================================================

function buildDescription(recipe: FinishedGoodsRecipe): string {
  const stats = recipe.outputStats as Record<string, unknown>;
  const itemType = recipe.outputItemType;

  if (itemType === 'TOOL') {
    return `Crafting component produced by ${recipe.professionRequired}.`;
  }

  if (itemType === 'HOUSING') {
    return `A crafted furnishing produced by ${recipe.professionRequired}.`;
  }

  if (itemType === 'ARMOR') {
    const armorStats = stats as unknown as ArmorStats;
    const armorVal = armorStats.armor ?? 0;
    const dur = armorStats.durability ?? 0;
    return `${armorVal} armor, Durability ${dur}. Produced by ${recipe.professionRequired}.`;
  }

  // WEAPON
  const weaponStats = stats as unknown as WeaponStats;
  if (weaponStats.baseDamage !== undefined) {
    const dmgLabel = `${weaponStats.baseDamage} ${weaponStats.damageType}`;
    const speedLabel = `Speed ${weaponStats.speed}`;
    const twoHandLabel = weaponStats.twoHanded ? ', two-handed' : '';
    const rangeLabel = weaponStats.range ? `, range ${weaponStats.range}` : '';
    return `${dmgLabel} damage, ${speedLabel}${twoHandLabel}${rangeLabel}. Requires Str ${weaponStats.requiredStr}, Dex ${weaponStats.requiredDex}.`;
  }

  return `Crafted item produced by ${recipe.professionRequired}.`;
}

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedCraftedGoodsRecipes(prisma: PrismaClient) {
  const allRecipes: FinishedGoodsRecipe[] = [
    ...WOODWORKER_FINISHED_GOODS,
    ...BLACKSMITH_RECIPES,
  ];

  console.log('--- Seeding Crafted Goods Item Templates ---');

  // Build a map of existing templates so we can resolve ingredient references
  const existingTemplates = await prisma.itemTemplate.findMany({
    select: { id: true, name: true },
  });
  const templateMap = new Map<string, string>();
  for (const t of existingTemplates) {
    templateMap.set(t.name, t.id);
  }

  // Helper: resolve template or fail loudly
  function ensureTemplate(itemName: string, context: string): string {
    const id = templateMap.get(itemName);
    if (!id) {
      throw new Error(
        `Recipe references unknown item template "${itemName}" (recipe: ${context}). ` +
        `Add it to ITEM_TEMPLATES in database/seeds/recipes.ts first.`
      );
    }
    return id;
  }

  let templatesCreated = 0;
  let recipesCreated = 0;

  for (const recipe of allRecipes) {
    const outputName = recipe.outputs[0].itemName;
    const stats = recipe.outputStats as Record<string, unknown>;

    // Map outputItemType to DB item type
    const itemType = recipe.outputItemType as string;
    const rarity = tierToRarity(recipe.tier);
    const description = buildDescription(recipe);
    const durability = (stats.durability as number) ?? 100;

    // Upsert the item template
    const stableId = `crafted-${outputName.toLowerCase().replace(/\s+/g, '-')}`;
    const created = await prisma.itemTemplate.upsert({
      where: { id: stableId },
      update: {
        name: outputName,
        type: itemType,
        rarity,
        description,
        stats: recipe.outputStats as Record<string, unknown>,
        durability,
        professionRequired: recipe.professionRequired as ProfessionType,
        levelRequired: recipe.levelRequired,
      },
      create: {
        id: stableId,
        name: outputName,
        type: itemType,
        rarity,
        description,
        stats: recipe.outputStats as Record<string, unknown>,
        durability,
        professionRequired: recipe.professionRequired as ProfessionType,
        levelRequired: recipe.levelRequired,
      },
    });
    templateMap.set(outputName, created.id);
    templatesCreated++;

    // Upsert the recipe
    const ingredients: { itemTemplateId: string; itemName: string; quantity: number }[] = [];
    for (const inp of recipe.inputs) {
      const templateId = ensureTemplate(inp.itemName, recipe.name);
      ingredients.push({ itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity });
    }

    const resultId = templateMap.get(outputName)!;

    const recipeId = `recipe-${recipe.recipeId}`;
    const tier = levelToTier(recipe.levelRequired);

    await prisma.recipe.upsert({
      where: { id: recipeId },
      update: {
        name: recipe.name,
        professionType: recipe.professionRequired as ProfessionType,
        tier,
        ingredients,
        result: resultId,
        craftTime: recipe.craftTime,
        xpReward: recipe.xpReward,
      },
      create: {
        id: recipeId,
        name: recipe.name,
        professionType: recipe.professionRequired as ProfessionType,
        tier,
        ingredients,
        result: resultId,
        craftTime: recipe.craftTime,
        xpReward: recipe.xpReward,
      },
    });

    recipesCreated++;
    console.log(`  + ${recipe.name} (${recipe.professionRequired} Lvl ${recipe.levelRequired})`);
  }

  console.log(`  Crafted goods templates: ${templatesCreated}`);
  console.log(`  Crafted goods recipes: ${recipesCreated}`);
}
