/**
 * Weapon Recipe & Item Template Seed Data for Realm of Crowns
 *
 * Seeds weapon ItemTemplates and their corresponding Recipe rows
 * for all blacksmith and fletcher/ranged weapon recipes.
 *
 * Depends on: seedRecipes() having run first (for material templates).
 */

import { PrismaClient, ProfessionType, ProfessionTier, ItemRarity } from '@prisma/client';
import { BLACKSMITH_WEAPON_RECIPES } from '@shared/data/recipes/weapons';
import { RANGED_WEAPON_RECIPES } from '@shared/data/recipes/ranged-weapons';
import { FinishedGoodsRecipe, WeaponStats } from '@shared/data/recipes/types';

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
// SEED FUNCTION
// ============================================================

export async function seedWeaponRecipes(prisma: PrismaClient) {
  const allWeaponRecipes: FinishedGoodsRecipe[] = [
    ...BLACKSMITH_WEAPON_RECIPES,
    ...RANGED_WEAPON_RECIPES,
  ];

  console.log('--- Seeding Weapon Item Templates ---');

  // First, build a map of existing templates so we can resolve ingredient references
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

  // Track newly created weapon templates
  let templatesCreated = 0;
  let recipesCreated = 0;

  for (const recipe of allWeaponRecipes) {
    const outputName = recipe.outputs[0].itemName;
    const stats = recipe.outputStats as WeaponStats;

    // Determine item type from recipe
    const itemType = (recipe.outputItemType === 'CONSUMABLE' ? 'CONSUMABLE'
      : recipe.outputItemType === 'TOOL' ? 'TOOL'
      : recipe.outputItemType === 'ACCESSORY' ? 'ACCESSORY'
      : 'WEAPON') as 'WEAPON' | 'CONSUMABLE' | 'TOOL' | 'ACCESSORY';
    const rarity = tierToRarity(recipe.tier);

    // Build description from stats
    let description: string;
    if (itemType === 'TOOL' || (stats.baseDamage === undefined && !stats.damageType)) {
      description = `Crafting component produced by ${recipe.professionRequired}.`;
    } else if (itemType === 'ACCESSORY') {
      const armorLabel = stats.armor ? `Armor ${stats.armor}` : '';
      description = `${armorLabel} accessory. Durability ${stats.durability}.`.trim();
    } else {
      const dmgLabel = `${stats.baseDamage} ${stats.damageType}`;
      const speedLabel = `Speed ${stats.speed}`;
      const twoHandLabel = stats.twoHanded ? ', two-handed' : '';
      const rangeLabel = stats.range ? `, range ${stats.range}` : '';
      description =
        itemType === 'CONSUMABLE'
          ? `Ammunition: ${dmgLabel} damage bonus${rangeLabel}.`
          : `${dmgLabel} damage, ${speedLabel}${twoHandLabel}${rangeLabel}. Requires Str ${stats.requiredStr}, Dex ${stats.requiredDex}.`;
    }

    // Upsert the item template
    const stableId = `weapon-${outputName.toLowerCase().replace(/\s+/g, '-')}`;
    const created = await prisma.itemTemplate.upsert({
      where: { id: stableId },
      update: {
        name: outputName,
        type: itemType,
        rarity,
        description,
        stats: recipe.outputStats as Record<string, unknown>,
        durability: stats.durability,
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
        durability: stats.durability,
        professionRequired: recipe.professionRequired as ProfessionType,
        levelRequired: recipe.levelRequired,
      },
    });
    templateMap.set(outputName, created.id);
    templatesCreated++;

    // Now upsert the recipe
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

  console.log(`  Weapon templates: ${templatesCreated}`);
  console.log(`  Weapon recipes: ${recipesCreated}`);
}
