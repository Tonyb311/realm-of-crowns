/**
 * Consumable Recipe & Item Template Seed Data for Realm of Crowns
 *
 * Seeds consumable item templates and their crafting recipes for:
 *   ALCHEMIST (22 recipes) - Potions, cures, poisons, bombs
 *   COOK (7 recipes)       - Food with timed buffs
 *   BREWER (5 recipes)     - Drinks with stat effects
 *   SCRIBE (7 recipes)     - Spell scrolls, maps
 *
 * 41 consumable recipes total.
 */

import { PrismaClient, ItemType, ItemRarity, ProfessionType, ProfessionTier } from '@prisma/client';
import { ALL_CONSUMABLE_RECIPES, ConsumableRecipe } from '@shared/data/recipes/consumables';

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
// HELPER: Map level to ItemRarity
// ============================================================

function levelToRarity(level: number): ItemRarity {
  if (level >= 55) return 'MASTERWORK';
  if (level >= 35) return 'SUPERIOR';
  if (level >= 15) return 'FINE';
  return 'COMMON';
}

// ============================================================
// BASE VALUES: lookup map from YAML profession-economy-master.yaml
// ============================================================

// Base values from YAML profession-economy-master.yaml
const BASE_VALUE_MAP: Record<string, number> = {
  // ALCHEMIST
  'Minor Healing Potion': 19, 'Antidote': 14, 'Berry Salve': 15,
  'Healing Potion': 27, 'Elixir of Strength': 55, 'Elixir of Wisdom': 55,
  'Poison Resistance Tonic': 20,
  'Greater Healing Potion': 85, 'Elixir of Fortitude': 95, 'Glowcap Extract': 95,
  'Universal Antidote': 100,
  // COOK
  'Flour': 5, 'Apple Sauce': 19, 'Porridge': 15, 'Berry Jam': 6,
  'Grilled Fish': 17, 'Herbal Tea': 20, 'Vegetable Stew': 19,
  'Bread Loaf': 20, 'Apple Pie': 27, 'Fish Stew': 25,
  'Seasoned Roast Vegetables': 23, 'Berry Tart': 23,
  'Harvest Feast': 60, "Fisherman's Banquet": 72, 'Spiced Pastry': 40,
  'Scrambled Eggs': 12, 'Creamy Porridge': 15, 'Farm Breakfast': 25,
  'Smoked Trout Rations': 30,
  // BREWER
  'Ale': 6, 'Apple Cider': 6, 'Berry Cordial': 8,
  'Strong Ale': 12, 'Mulled Cider': 14, 'Herbal Brew': 15,
  'Hopped Beer': 15, 'Grape Wine': 15, 'Pale Ale': 18,
  // SCRIBE
  'Area Map': 15, 'Scroll of Fire': 82, 'Identification Scroll': 28,
  'Scroll of Ice': 80, 'Scroll of Healing': 75, 'Dungeon Map': 80,
  'Scroll of Lightning': 85, 'Scroll of Stone Skin': 90, 'Scroll of Might': 85,
  'Scroll of Entangle': 100, 'Scroll of Restoration': 130,
  // ENCHANTER
  'Fortified Enchantment Scroll': 110, 'Flaming Enchantment Scroll': 155,
  'Frost Enchantment Scroll': 155, 'Lightning Enchantment Scroll': 175,
  'Swift Enchantment Scroll': 195, 'Poisoned Enchantment Scroll': 200,
  'Warding Enchantment Scroll': 210, 'Holy Enchantment Scroll': 340,
  'Shadow Enchantment Scroll': 330, 'Earthen Enchantment Scroll': 250,
  'Vitality Enchantment Scroll': 220, "Nature's Ward Enchantment Scroll": 300,
  'True Sight Enchantment Scroll': 350,
};

// ============================================================
// CONSUMABLE ITEM TEMPLATES
// Generated from recipe outputs + consumableStats
// ============================================================

function buildConsumableTemplates(recipes: ConsumableRecipe[]) {
  const seen = new Set<string>();
  const templates: Array<{
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    description: string;
    stats: Record<string, unknown>;
    durability: number;
    professionRequired: ProfessionType;
    levelRequired: number;
    baseValue: number;
  }> = [];

  for (const recipe of recipes) {
    const name = recipe.output.itemName;
    if (seen.has(name)) continue;
    seen.add(name);

    const baseValue = BASE_VALUE_MAP[name] ?? 0;

    templates.push({
      name,
      type: 'CONSUMABLE',
      rarity: levelToRarity(recipe.levelRequired),
      description: recipe.description,
      stats: {
        effect: recipe.consumableStats.effect,
        magnitude: recipe.consumableStats.magnitude,
        duration: recipe.consumableStats.duration,
        stackSize: recipe.consumableStats.stackSize,
        ...(recipe.consumableStats.secondaryEffect
          ? {
              secondaryEffect: recipe.consumableStats.secondaryEffect,
              secondaryMagnitude: recipe.consumableStats.secondaryMagnitude,
            }
          : {}),
      },
      durability: 1,
      professionRequired: recipe.professionRequired,
      levelRequired: recipe.levelRequired,
      baseValue,
    });
  }

  return templates;
}

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedConsumableRecipes(prisma: PrismaClient) {
  console.log('--- Seeding Consumable Item Templates ---');

  const templates = buildConsumableTemplates(ALL_CONSUMABLE_RECIPES);
  const templateMap = new Map<string, string>(); // name -> id

  for (const tmpl of templates) {
    const stableId = `consumable-${tmpl.name.toLowerCase().replace(/\s+/g, '-')}`;
    const created = await prisma.itemTemplate.upsert({
      where: { id: stableId },
      update: {
        name: tmpl.name,
        type: tmpl.type,
        rarity: tmpl.rarity,
        description: tmpl.description,
        stats: tmpl.stats,
        durability: tmpl.durability,
        professionRequired: tmpl.professionRequired,
        levelRequired: tmpl.levelRequired,
        baseValue: tmpl.baseValue,
      },
      create: {
        id: stableId,
        name: tmpl.name,
        type: tmpl.type,
        rarity: tmpl.rarity,
        description: tmpl.description,
        stats: tmpl.stats,
        durability: tmpl.durability,
        professionRequired: tmpl.professionRequired,
        levelRequired: tmpl.levelRequired,
        baseValue: tmpl.baseValue,
      },
    });
    templateMap.set(tmpl.name, created.id);
    console.log(`  + Template: ${tmpl.name} (${tmpl.rarity})`);
  }
  console.log(`  Consumable templates: ${templates.length}`);

  // We also need to look up existing resource/material templates for ingredients
  // Fetch all existing templates so we can resolve ingredient names
  const existingTemplates = await prisma.itemTemplate.findMany({
    select: { id: true, name: true },
  });
  for (const t of existingTemplates) {
    if (!templateMap.has(t.name)) {
      templateMap.set(t.name, t.id);
    }
  }

  // ----- Seed Consumable Recipes -----
  console.log('--- Seeding Consumable Recipes ---');

  let seeded = 0;
  for (const recipe of ALL_CONSUMABLE_RECIPES) {
    const ingredients = recipe.inputs.map((inp) => {
      const templateId = templateMap.get(inp.itemName);
      if (!templateId) {
        console.warn(`  ! Warning: Item template not found for input: ${inp.itemName} (recipe: ${recipe.name}), skipping ingredient`);
      }
      return {
        itemTemplateId: templateId ?? null,
        itemName: inp.itemName,
        quantity: inp.quantity,
      };
    });

    const resultId = templateMap.get(recipe.output.itemName);
    if (!resultId) {
      console.warn(`  ! Warning: Item template not found for output: ${recipe.output.itemName} (recipe: ${recipe.name}), skipping`);
      continue;
    }

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

    console.log(`  + ${recipe.name} (${recipe.professionRequired} Lvl ${recipe.levelRequired})`);
    seeded++;
  }

  console.log(`  Consumable recipes seeded: ${seeded}`);
}
