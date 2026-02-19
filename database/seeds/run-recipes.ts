/**
 * Targeted seed script: COOK items + recipes (replaces old FARMER recipes).
 * Run: DATABASE_URL=... npx tsx seeds/run-recipes.ts
 */
import { PrismaClient, ProfessionType, ProfessionTier } from '@prisma/client';

function levelToTier(level: number): ProfessionTier {
  if (level >= 75) return 'MASTER';
  if (level >= 50) return 'EXPERT';
  if (level >= 30) return 'CRAFTSMAN';
  if (level >= 10) return 'JOURNEYMAN';
  return 'APPRENTICE';
}

async function main() {
  const prisma = new PrismaClient();
  try {
    // ---------------------------------------------------------------
    // Step 0: Remove old FARMER recipes from DB
    // ---------------------------------------------------------------
    console.log('--- Removing old FARMER recipes ---');
    const deleted = await prisma.recipe.deleteMany({
      where: { professionType: 'FARMER' },
    });
    console.log(`  Deleted ${deleted.count} old FARMER recipes`);

    // ---------------------------------------------------------------
    // Step 1: Upsert all COOK output ItemTemplates
    // ---------------------------------------------------------------
    console.log('\n--- Seeding COOK food ItemTemplates ---');

    const COOK_ITEMS: Array<{
      id: string;
      name: string;
      type: 'CONSUMABLE' | 'MATERIAL';
      rarity: 'COMMON' | 'FINE' | 'SUPERIOR';
      description: string;
      stats: Record<string, unknown>;
      durability: number;
      professionRequired?: ProfessionType;
      levelRequired?: number;
      isFood: boolean;
      foodBuff: Record<string, unknown> | null;
      isPerishable: boolean;
      shelfLifeDays: number | null;
      isBeverage: boolean;
    }> = [
      // -- Gathering resources (needed by COOK recipes) --
      {
        id: 'resource-grain',
        name: 'Grain',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'Golden stalks of wheat and barley. The foundation of bread and beer.',
        stats: {},
        durability: 100,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
      },
      {
        id: 'resource-vegetables',
        name: 'Vegetables',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'Carrots, onions, and turnips pulled fresh from the earth.',
        stats: { hpRestore: 4 },
        durability: 100,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 4, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 4,
        isBeverage: false,
      },

      // -- Intermediate ingredients --
      {
        id: 'crafted-flour',
        name: 'Flour',
        type: 'MATERIAL',
        rarity: 'COMMON',
        description: 'Finely ground grain. The foundation of all baking.',
        stats: {},
        durability: 100,
        professionRequired: 'COOK',
        levelRequired: 1,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
      },
      {
        id: 'crafted-berry-jam',
        name: 'Berry Jam',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'Sweet preserved berries. Delicious on bread.',
        stats: { hpRestore: 8 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 1,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 8, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 14,
        isBeverage: false,
      },

      // -- Tier 1 Products (Level 1) --
      {
        id: 'crafted-apple-sauce',
        name: 'Apple Sauce',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'Smooth, sweet apple sauce with a hint of cinnamon. Comforting and nourishing.',
        stats: { hpRestore: 15 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 1,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 15, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 5,
        isBeverage: false,
      },
      {
        id: 'crafted-porridge',
        name: 'Porridge',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'A thick, warming bowl of grain porridge. Simple but sustaining.',
        stats: { hpRestore: 12 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 1,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 12, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },
      {
        id: 'crafted-grilled-fish',
        name: 'Grilled Fish',
        type: 'CONSUMABLE',
        rarity: 'FINE',
        description: 'Fresh fish grilled with wild herbs. Simple, wholesome, and filling.',
        stats: { hpRestore: 22 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 5,
        isFood: true,
        foodBuff: { effect: 'hp_regen', magnitude: 2, duration: 3 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },
      {
        id: 'crafted-herbal-tea',
        name: 'Herbal Tea',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'A soothing brew of wild herbs that clears the mind and quickens thought.',
        stats: { hpRestore: 10 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 1,
        isFood: true,
        foodBuff: { effect: 'buff_wisdom', magnitude: 1, duration: 60 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: true,
      },
      {
        id: 'crafted-vegetable-stew',
        name: 'Vegetable Stew',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'A hearty stew of fresh vegetables, fragrant with herbs. Warms body and soul.',
        stats: { hpRestore: 15 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 1,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 15, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },

      // -- Tier 2 Products (Level 5) --
      {
        id: 'crafted-bread-loaf',
        name: 'Bread Loaf',
        type: 'CONSUMABLE',
        rarity: 'FINE',
        description: 'A crusty loaf of freshly baked bread, golden-brown and fragrant from the oven.',
        stats: { hpRestore: 20 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 5,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 20, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 5,
        isBeverage: false,
      },
      {
        id: 'crafted-apple-pie',
        name: 'Apple Pie',
        type: 'CONSUMABLE',
        rarity: 'FINE',
        description: 'A golden-crusted pie filled with spiced apple slices. Beloved across all of Aethermere.',
        stats: { hpRestore: 30 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 5,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 30, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 7,
        isBeverage: false,
      },
      {
        id: 'crafted-fish-stew',
        name: 'Fish Stew',
        type: 'CONSUMABLE',
        rarity: 'FINE',
        description: 'A hearty stew of fish, grain, and herbs. Warms the bones on cold nights.',
        stats: { hpRestore: 28 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 5,
        isFood: true,
        foodBuff: { effect: 'buff_constitution', magnitude: 2, duration: 3 },
        isPerishable: true,
        shelfLifeDays: 5,
        isBeverage: false,
      },
      {
        id: 'crafted-seasoned-roast-veg',
        name: 'Seasoned Roast Vegetables',
        type: 'CONSUMABLE',
        rarity: 'FINE',
        description: 'Root vegetables roasted with wild herbs until caramelized and fragrant.',
        stats: { hpRestore: 22 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 5,
        isFood: true,
        foodBuff: { effect: 'buff_strength', magnitude: 1, duration: 60 },
        isPerishable: true,
        shelfLifeDays: 5,
        isBeverage: false,
      },
      {
        id: 'crafted-berry-tart',
        name: 'Berry Tart',
        type: 'CONSUMABLE',
        rarity: 'FINE',
        description: "A flaky pastry filled with sweetened berry jam. A traveler's favorite.",
        stats: { hpRestore: 25 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 5,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 25, duration: 0 },
        isPerishable: true,
        shelfLifeDays: 7,
        isBeverage: false,
      },

      // -- Tier 3 Products (Level 7) --
      {
        id: 'crafted-harvest-feast',
        name: 'Harvest Feast',
        type: 'CONSUMABLE',
        rarity: 'SUPERIOR',
        description: 'A lavish spread of bread, apple sauce, and herb-roasted delicacies. Fit for a harvest celebration.',
        stats: { hpRestore: 50 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 7,
        isFood: true,
        foodBuff: { effect: 'buff_constitution', magnitude: 2, duration: 180, secondaryEffect: 'buff_charisma', secondaryMagnitude: 1 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },
      {
        id: 'crafted-fishermans-banquet',
        name: "Fisherman's Banquet",
        type: 'CONSUMABLE',
        rarity: 'SUPERIOR',
        description: 'A grand spread of grilled fish, fresh bread, and berry preserves. A feast for seafarers.',
        stats: { hpRestore: 45 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 7,
        isFood: true,
        foodBuff: { effect: 'buff_strength', magnitude: 2, duration: 180, secondaryEffect: 'buff_dexterity', secondaryMagnitude: 1 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },
      {
        id: 'crafted-spiced-pastry',
        name: 'Spiced Pastry',
        type: 'CONSUMABLE',
        rarity: 'SUPERIOR',
        description: 'An elaborate layered pastry infused with exotic spices and berry jam. Prized by merchants and nobles.',
        stats: { hpRestore: 20 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 7,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 20, duration: 0 },
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
      },

      // -- New Fish Products (Journeyman L5-6) --
      {
        id: 'crafted-smoked-fish',
        name: 'Smoked Fish',
        type: 'CONSUMABLE',
        rarity: 'FINE',
        description: "Fish cured over a wood fire. Keeps for days on the road — a traveler's staple.",
        stats: { hpRestore: 18 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 6,
        isFood: true,
        foodBuff: { effect: 'hp_regen', magnitude: 1, duration: 5 },
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
      },

      // -- New Fish Products (Craftsman L7-8) --
      {
        id: 'crafted-pan-seared-trout',
        name: 'Pan-Seared Trout',
        type: 'CONSUMABLE',
        rarity: 'SUPERIOR',
        description: "Trout seared to perfection with herbs and apple glaze. A dish fit for a lord's table.",
        stats: { hpRestore: 40 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 7,
        isFood: true,
        foodBuff: { effect: 'buff_dexterity', magnitude: 3, duration: 4, secondaryEffect: 'hp_regen', secondaryMagnitude: 2 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },
      {
        id: 'crafted-perch-feast',
        name: 'Perch Feast',
        type: 'CONSUMABLE',
        rarity: 'SUPERIOR',
        description: 'A generous platter of roasted perch with grain bread and herb butter. Feeds the body and the spirit.',
        stats: { hpRestore: 48 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 7,
        isFood: true,
        foodBuff: { effect: 'buff_constitution', magnitude: 3, duration: 4, secondaryEffect: 'buff_strength', secondaryMagnitude: 2 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },
      {
        id: 'crafted-fishermans-pie',
        name: "Fisherman's Pie",
        type: 'CONSUMABLE',
        rarity: 'SUPERIOR',
        description: 'A golden-crusted pie stuffed with two kinds of fish, grain, and eggs. The finest comfort food in the realm.',
        stats: { hpRestore: 55 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 8,
        isFood: true,
        foodBuff: { effect: 'buff_constitution', magnitude: 4, duration: 4, secondaryEffect: 'hp_regen', secondaryMagnitude: 3 },
        isPerishable: true,
        shelfLifeDays: 3,
        isBeverage: false,
      },
      {
        id: 'crafted-smoked-trout-rations',
        name: 'Smoked Trout Rations',
        type: 'CONSUMABLE',
        rarity: 'SUPERIOR',
        description: 'Premium smoked trout wrapped in leaves. Stays fresh for long journeys and tastes far better than hardtack.',
        stats: { hpRestore: 25 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 8,
        isFood: true,
        foodBuff: { effect: 'hp_regen', magnitude: 2, duration: 5 },
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
      },
    ];

    const templateMap = new Map<string, string>();

    for (const item of COOK_ITEMS) {
      const data: Record<string, unknown> = {
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        description: item.description,
        stats: item.stats,
        durability: item.durability,
        professionRequired: item.professionRequired ?? null,
        levelRequired: item.levelRequired ?? 1,
        isFood: item.isFood,
        foodBuff: item.foodBuff ?? undefined,
        isPerishable: item.isPerishable,
        shelfLifeDays: item.shelfLifeDays,
        isBeverage: item.isBeverage,
      };

      const created = await prisma.itemTemplate.upsert({
        where: { id: item.id },
        update: data,
        create: { id: item.id, ...data } as any,
      });
      templateMap.set(item.name, created.id);
      console.log(`  + ${item.name} (${item.type} / ${item.rarity})`);
    }

    // ---------------------------------------------------------------
    // Step 1B: Upsert FISHERMAN Craftsman resource templates
    // ---------------------------------------------------------------
    console.log('\n--- Seeding FISHERMAN Craftsman resources ---');
    const FISHERMAN_RESOURCES = [
      { id: 'resource-river_trout', name: 'River Trout', description: 'A prized freshwater fish with firm, flavorful flesh. Only skilled fishermen can consistently land these.', baseValue: 22 },
      { id: 'resource-lake_perch', name: 'Lake Perch', description: 'A large, meaty lake fish. Its delicate flavor makes it the centerpiece of fine cuisine.', baseValue: 25 },
    ];
    for (const res of FISHERMAN_RESOURCES) {
      const data = {
        name: res.name,
        type: 'MATERIAL' as const,
        rarity: 'FINE' as const,
        description: res.description,
        stats: {},
        durability: 100,
        isFood: false,
        foodBuff: undefined,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
      };
      const created = await prisma.itemTemplate.upsert({
        where: { id: res.id },
        update: data,
        create: { id: res.id, ...data } as any,
      });
      templateMap.set(res.name, created.id);
      console.log(`  + ${res.name} (MATERIAL / FINE, ${res.baseValue}g)`);
    }

    // ---------------------------------------------------------------
    // Step 2: Load existing resource templates (gathering ingredients)
    // ---------------------------------------------------------------
    const resourceNames = ['Apples', 'Wild Berries', 'Wild Herbs', 'Raw Fish', 'Grain', 'Vegetables', 'Wood Logs', 'Eggs'];
    for (const name of resourceNames) {
      if (templateMap.has(name)) continue; // already loaded from COOK_ITEMS
      const tmpl = await prisma.itemTemplate.findFirst({ where: { name } });
      if (tmpl) {
        templateMap.set(name, tmpl.id);
        console.log(`  ✓ Found resource: ${name} (${tmpl.id})`);
      } else {
        console.error(`  ✗ MISSING resource template: ${name}`);
      }
    }

    // ---------------------------------------------------------------
    // Step 3: Seed all 15 COOK recipes
    // ---------------------------------------------------------------
    console.log('\n--- Seeding COOK Recipes ---');

    const RECIPES = [
      // Tier 1 — Level 1
      { recipeId: 'cook-flour', name: 'Mill Flour', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Grain', quantity: 2 }], outputName: 'Flour', xpReward: 8, craftTime: 10 },
      { recipeId: 'cook-apple-sauce', name: 'Make Apple Sauce', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Apples', quantity: 3 }], outputName: 'Apple Sauce', xpReward: 10, craftTime: 10 },
      { recipeId: 'cook-porridge', name: 'Cook Porridge', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Grain', quantity: 2 }], outputName: 'Porridge', xpReward: 10, craftTime: 10 },
      { recipeId: 'cook-berry-jam', name: 'Make Berry Jam', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Wild Berries', quantity: 3 }], outputName: 'Berry Jam', xpReward: 8, craftTime: 10 },
      { recipeId: 'cook-grilled-fish', name: 'Grill Fish', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Raw Fish', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Grilled Fish', xpReward: 12, craftTime: 15 },
      { recipeId: 'cook-herbal-tea', name: 'Brew Herbal Tea', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Wild Herbs', quantity: 2 }], outputName: 'Herbal Tea', xpReward: 10, craftTime: 10 },
      { recipeId: 'cook-vegetable-stew', name: 'Cook Vegetable Stew', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Vegetables', quantity: 3 }], outputName: 'Vegetable Stew', xpReward: 10, craftTime: 15 },
      // Tier 2 — Level 5
      { recipeId: 'cook-bread-loaf', name: 'Bake Bread', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Flour', quantity: 2 }], outputName: 'Bread Loaf', xpReward: 15, craftTime: 20 },
      { recipeId: 'cook-apple-pie', name: 'Bake Apple Pie', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Flour', quantity: 1 }, { itemName: 'Apples', quantity: 3 }], outputName: 'Apple Pie', xpReward: 18, craftTime: 25 },
      { recipeId: 'cook-fish-stew', name: 'Cook Fish Stew', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Raw Fish', quantity: 3 }, { itemName: 'Grain', quantity: 1 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Fish Stew', xpReward: 15, craftTime: 25 },
      { recipeId: 'cook-seasoned-roast-veg', name: 'Roast Seasoned Vegetables', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Vegetables', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Seasoned Roast Vegetables', xpReward: 15, craftTime: 20 },
      { recipeId: 'cook-berry-tart', name: 'Bake Berry Tart', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Flour', quantity: 1 }, { itemName: 'Berry Jam', quantity: 1 }], outputName: 'Berry Tart', xpReward: 18, craftTime: 25 },
      // Tier 3 — Level 7
      { recipeId: 'cook-harvest-feast', name: 'Prepare Harvest Feast', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Bread Loaf', quantity: 1 }, { itemName: 'Apples', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 2 }], outputName: 'Harvest Feast', xpReward: 30, craftTime: 45 },
      { recipeId: 'cook-fishermans-banquet', name: "Prepare Fisherman's Banquet", levelRequired: 7, tier: 3, inputs: [{ itemName: 'Grilled Fish', quantity: 1 }, { itemName: 'Bread Loaf', quantity: 1 }, { itemName: 'Berry Jam', quantity: 1 }], outputName: "Fisherman's Banquet", xpReward: 30, craftTime: 45 },
      { recipeId: 'cook-spiced-pastry', name: 'Bake Spiced Pastry', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Flour', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 2 }, { itemName: 'Berry Jam', quantity: 1 }], outputName: 'Spiced Pastry', xpReward: 25, craftTime: 40 },
      // New Fish Recipes — Journeyman (L5-6)
      { recipeId: 'cook-smoked-fish', name: 'Smoke Fish', levelRequired: 6, tier: 2, inputs: [{ itemName: 'Raw Fish', quantity: 3 }, { itemName: 'Wood Logs', quantity: 1 }], outputName: 'Smoked Fish', xpReward: 15, craftTime: 30 },
      // New Fish Recipes — Craftsman (L7-8)
      { recipeId: 'cook-pan-seared-trout', name: 'Sear Trout', levelRequired: 7, tier: 3, inputs: [{ itemName: 'River Trout', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 1 }, { itemName: 'Apples', quantity: 1 }], outputName: 'Pan-Seared Trout', xpReward: 25, craftTime: 30 },
      { recipeId: 'cook-perch-feast', name: 'Prepare Perch Feast', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Lake Perch', quantity: 3 }, { itemName: 'Grain', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Perch Feast', xpReward: 28, craftTime: 40 },
      { recipeId: 'cook-fishermans-pie', name: "Bake Fisherman's Pie", levelRequired: 8, tier: 3, inputs: [{ itemName: 'River Trout', quantity: 2 }, { itemName: 'Lake Perch', quantity: 2 }, { itemName: 'Grain', quantity: 2 }, { itemName: 'Eggs', quantity: 1 }], outputName: "Fisherman's Pie", xpReward: 30, craftTime: 45 },
      { recipeId: 'cook-smoked-trout-rations', name: 'Smoke Trout Rations', levelRequired: 8, tier: 3, inputs: [{ itemName: 'River Trout', quantity: 3 }, { itemName: 'Wood Logs', quantity: 2 }], outputName: 'Smoked Trout Rations', xpReward: 25, craftTime: 35 },
    ];

    for (const recipe of RECIPES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      const resultId = templateMap.get(recipe.outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: ${recipe.outputName} (recipe: ${recipe.name})`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: 'COOK' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId,
          name: recipe.name,
          professionType: 'COOK' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
      });

      console.log(`  + ${recipe.name} (COOK ${tier}, Lvl ${recipe.levelRequired})`);
    }

    // ---------------------------------------------------------------
    // Step 4: Clean up orphaned recipes (Baked Apples, etc.)
    // Any COOK recipe in the DB that's NOT in the canonical list gets deleted.
    // ---------------------------------------------------------------
    console.log('\n--- Cleaning orphaned COOK recipes ---');
    const canonicalCookIds = new Set(RECIPES.map(r => `recipe-${r.recipeId}`));
    const allDbCookRecipes = await prisma.recipe.findMany({
      where: { professionType: 'COOK' },
      select: { id: true, name: true },
    });
    let orphanCount = 0;
    for (const dbRecipe of allDbCookRecipes) {
      if (!canonicalCookIds.has(dbRecipe.id)) {
        // Delete referencing crafting_actions first (FK constraint)
        const deletedActions = await prisma.craftingAction.deleteMany({
          where: { recipeId: dbRecipe.id },
        });
        if (deletedActions.count > 0) {
          console.log(`    Removed ${deletedActions.count} crafting actions for ${dbRecipe.name}`);
        }
        await prisma.recipe.delete({ where: { id: dbRecipe.id } });
        console.log(`  ✗ Deleted orphaned recipe: ${dbRecipe.name} (${dbRecipe.id})`);
        orphanCount++;
      }
    }
    console.log(`  Orphaned recipes removed: ${orphanCount}`);

    console.log(`\n✅ COOK seed complete: ${COOK_ITEMS.length} items, ${RECIPES.length} recipes`);

    // ---------------------------------------------------------------
    // Step 5: Seed BREWER beverage ItemTemplates + resource ingredients
    // ---------------------------------------------------------------
    console.log('\n--- Seeding BREWER ItemTemplates ---');

    // Ensure Hops and Grapes resource templates exist
    const brewerResources = [
      { id: 'resource-hops', name: 'Hops', type: 'MATERIAL' as const, description: 'Aromatic hop flowers, essential for brewing fine beer.' },
      { id: 'resource-grapes', name: 'Grapes', type: 'MATERIAL' as const, description: 'Plump, juicy grapes, ready to be pressed into wine.' },
    ];
    for (const res of brewerResources) {
      const created = await prisma.itemTemplate.upsert({
        where: { id: res.id },
        update: { name: res.name, type: res.type, description: res.description },
        create: { id: res.id, name: res.name, type: res.type, rarity: 'COMMON', description: res.description, stats: {}, durability: 100, professionRequired: null, levelRequired: 1 },
      });
      templateMap.set(res.name, created.id);
      console.log(`  + ${res.name} (resource)`);
    }

    // Also ensure Grain is in templateMap (it should be from COOK step)
    if (!templateMap.has('Grain')) {
      const grainTmpl = await prisma.itemTemplate.findFirst({ where: { name: 'Grain' } });
      if (grainTmpl) templateMap.set('Grain', grainTmpl.id);
    }

    // Load Wild Herbs, Apples, Wild Berries if not already in map
    for (const name of ['Wild Herbs', 'Apples', 'Wild Berries']) {
      if (!templateMap.has(name)) {
        const tmpl = await prisma.itemTemplate.findFirst({ where: { name } });
        if (tmpl) templateMap.set(name, tmpl.id);
      }
    }

    const BREWER_ITEMS: Array<{
      id: string;
      name: string;
      type: 'CONSUMABLE';
      rarity: 'COMMON' | 'FINE' | 'SUPERIOR';
      description: string;
      stats: Record<string, unknown>;
      durability: number;
      professionRequired: ProfessionType;
      levelRequired: number;
      isFood: boolean;
      foodBuff: Record<string, unknown>;
      isBeverage: boolean;
    }> = [
      // Tier 1 — Apprentice
      { id: 'crafted-ale', name: 'Ale', type: 'CONSUMABLE', rarity: 'COMMON', description: 'A hearty mug of golden ale brewed from grain. Fortifies the body.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 3, isFood: false, foodBuff: { effect: 'buff_constitution', magnitude: 1, duration: 30 }, isBeverage: true },
      { id: 'crafted-apple-cider', name: 'Apple Cider', type: 'CONSUMABLE', rarity: 'COMMON', description: 'A crisp, amber cider pressed from ripe apples.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 3, isFood: false, foodBuff: { effect: 'buff_charisma', magnitude: 1, duration: 30 }, isBeverage: true },
      { id: 'crafted-berry-cordial', name: 'Berry Cordial', type: 'CONSUMABLE', rarity: 'COMMON', description: 'A sweet cordial fermented from wild berries. Soothes wounds.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 4, isFood: false, foodBuff: { effect: 'hp_regen', magnitude: 2, duration: 30 }, isBeverage: true },
      // Tier 2 — Journeyman
      { id: 'crafted-strong-ale', name: 'Strong Ale', type: 'CONSUMABLE', rarity: 'FINE', description: 'A potent double-brewed ale infused with wild herbs.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 5, isFood: false, foodBuff: { effect: 'buff_strength', magnitude: 2, duration: 30 }, isBeverage: true },
      { id: 'crafted-mulled-cider', name: 'Mulled Cider', type: 'CONSUMABLE', rarity: 'FINE', description: 'Warm spiced cider steeped with aromatic herbs.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 5, isFood: false, foodBuff: { effect: 'buff_wisdom', magnitude: 2, duration: 30 }, isBeverage: true },
      { id: 'crafted-herbal-brew', name: 'Herbal Brew', type: 'CONSUMABLE', rarity: 'FINE', description: 'A bitter, restorative brew of wild herbs and grain.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 6, isFood: false, foodBuff: { effect: 'hp_regen', magnitude: 3, duration: 30 }, isBeverage: true },
      // Tier 3 — Craftsman
      { id: 'crafted-hopped-beer', name: 'Hopped Beer', type: 'CONSUMABLE', rarity: 'SUPERIOR', description: 'A complex beer brewed with cultivated hops. Fortifies body and spirit.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 7, isFood: false, foodBuff: { effect: 'buff_constitution', magnitude: 3, duration: 40, secondaryEffect: 'buff_strength', secondaryMagnitude: 1 }, isBeverage: true },
      { id: 'crafted-grape-wine', name: 'Grape Wine', type: 'CONSUMABLE', rarity: 'SUPERIOR', description: 'A rich wine pressed from vineyard grapes. The drink of diplomats.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 7, isFood: false, foodBuff: { effect: 'buff_charisma', magnitude: 3, duration: 40, secondaryEffect: 'buff_wisdom', secondaryMagnitude: 1 }, isBeverage: true },
      { id: 'crafted-pale-ale', name: 'Pale Ale', type: 'CONSUMABLE', rarity: 'SUPERIOR', description: 'A light, crisp ale balanced with hops and herbs.', stats: {}, durability: 1, professionRequired: 'BREWER', levelRequired: 8, isFood: false, foodBuff: { effect: 'buff_strength', magnitude: 2, duration: 40, secondaryEffect: 'buff_dexterity', secondaryMagnitude: 2 }, isBeverage: true },
    ];

    for (const item of BREWER_ITEMS) {
      const created = await prisma.itemTemplate.upsert({
        where: { id: item.id },
        update: { name: item.name, type: item.type, rarity: item.rarity, description: item.description, stats: item.stats, durability: item.durability, professionRequired: item.professionRequired, levelRequired: item.levelRequired, isFood: item.isFood, foodBuff: item.foodBuff, isBeverage: item.isBeverage },
        create: { id: item.id, name: item.name, type: item.type, rarity: item.rarity, description: item.description, stats: item.stats, durability: item.durability, professionRequired: item.professionRequired, levelRequired: item.levelRequired, isFood: item.isFood, foodBuff: item.foodBuff, isBeverage: item.isBeverage },
      });
      templateMap.set(item.name, created.id);
      console.log(`  + ${item.name} (${item.rarity} / BREWER Lvl ${item.levelRequired})`);
    }

    // ---------------------------------------------------------------
    // Step 6: Seed 9 BREWER recipes
    // ---------------------------------------------------------------
    console.log('\n--- Seeding BREWER Recipes ---');

    const BREWER_RECIPES = [
      // Tier 1 — Level 3-4
      { recipeId: 'brew-ale', name: 'Ale', levelRequired: 3, inputs: [{ itemName: 'Grain', quantity: 3 }], outputName: 'Ale', xpReward: 8, craftTime: 20 },
      { recipeId: 'brew-apple-cider', name: 'Apple Cider', levelRequired: 3, inputs: [{ itemName: 'Apples', quantity: 3 }], outputName: 'Apple Cider', xpReward: 8, craftTime: 20 },
      { recipeId: 'brew-berry-cordial', name: 'Berry Cordial', levelRequired: 4, inputs: [{ itemName: 'Wild Berries', quantity: 3 }, { itemName: 'Grain', quantity: 1 }], outputName: 'Berry Cordial', xpReward: 10, craftTime: 25 },
      // Tier 2 — Level 5-6
      { recipeId: 'brew-strong-ale', name: 'Strong Ale', levelRequired: 5, inputs: [{ itemName: 'Grain', quantity: 4 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Strong Ale', xpReward: 15, craftTime: 30 },
      { recipeId: 'brew-mulled-cider', name: 'Mulled Cider', levelRequired: 5, inputs: [{ itemName: 'Apples', quantity: 3 }, { itemName: 'Wild Herbs', quantity: 2 }], outputName: 'Mulled Cider', xpReward: 15, craftTime: 30 },
      { recipeId: 'brew-herbal-brew', name: 'Herbal Brew', levelRequired: 6, inputs: [{ itemName: 'Wild Herbs', quantity: 3 }, { itemName: 'Grain', quantity: 2 }], outputName: 'Herbal Brew', xpReward: 18, craftTime: 35 },
      // Tier 3 — Level 7-8
      { recipeId: 'brew-hopped-beer', name: 'Hopped Beer', levelRequired: 7, inputs: [{ itemName: 'Grain', quantity: 3 }, { itemName: 'Hops', quantity: 2 }], outputName: 'Hopped Beer', xpReward: 22, craftTime: 40 },
      { recipeId: 'brew-grape-wine', name: 'Grape Wine', levelRequired: 7, inputs: [{ itemName: 'Grapes', quantity: 4 }], outputName: 'Grape Wine', xpReward: 22, craftTime: 45 },
      { recipeId: 'brew-pale-ale', name: 'Pale Ale', levelRequired: 8, inputs: [{ itemName: 'Grain', quantity: 3 }, { itemName: 'Hops', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Pale Ale', xpReward: 25, craftTime: 45 },
    ];

    for (const recipe of BREWER_RECIPES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      const resultId = templateMap.get(recipe.outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: ${recipe.outputName} (recipe: ${recipe.name})`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: 'BREWER' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId,
          name: recipe.name,
          professionType: 'BREWER' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
      });

      console.log(`  + ${recipe.name} (BREWER ${tier}, Lvl ${recipe.levelRequired})`);
    }

    // Clean up orphaned BREWER recipes (old ones from before rewrite)
    console.log('\n--- Cleaning orphaned BREWER recipes ---');
    const canonicalBrewerIds = new Set(BREWER_RECIPES.map(r => `recipe-${r.recipeId}`));
    const allDbBrewerRecipes = await prisma.recipe.findMany({
      where: { professionType: 'BREWER' },
      select: { id: true, name: true },
    });
    let brewerOrphanCount = 0;
    for (const dbRecipe of allDbBrewerRecipes) {
      if (!canonicalBrewerIds.has(dbRecipe.id)) {
        const deletedActions = await prisma.craftingAction.deleteMany({
          where: { recipeId: dbRecipe.id },
        });
        if (deletedActions.count > 0) {
          console.log(`    Removed ${deletedActions.count} crafting actions for ${dbRecipe.name}`);
        }
        await prisma.recipe.delete({ where: { id: dbRecipe.id } });
        console.log(`  ✗ Deleted orphaned recipe: ${dbRecipe.name} (${dbRecipe.id})`);
        brewerOrphanCount++;
      }
    }
    console.log(`  Orphaned BREWER recipes removed: ${brewerOrphanCount}`);

    console.log(`\n✅ BREWER seed complete: ${BREWER_ITEMS.length} items, ${BREWER_RECIPES.length} recipes`);

    // ---------------------------------------------------------------
    // Step 6B: Seed ALCHEMIST resource + output ItemTemplates
    // ---------------------------------------------------------------
    console.log('\n--- Seeding ALCHEMIST ItemTemplates ---');

    // Ensure Medicinal Herbs and Glowcap Mushrooms resource templates exist
    const alchemistResources = [
      { id: 'resource-medicinal-herbs', name: 'Medicinal Herbs', type: 'MATERIAL' as const, description: 'Potent herbs with proven healing properties, identifiable only by skilled herbalists.' },
      { id: 'resource-glowcap-mushrooms', name: 'Glowcap Mushrooms', type: 'MATERIAL' as const, description: 'Luminescent fungi found in shaded groves, prized by alchemists for their arcane reagent properties.' },
    ];
    for (const res of alchemistResources) {
      const created = await prisma.itemTemplate.upsert({
        where: { id: res.id },
        update: { name: res.name, type: res.type, description: res.description },
        create: { id: res.id, name: res.name, type: res.type, rarity: 'COMMON', description: res.description, stats: {}, durability: 100, professionRequired: null, levelRequired: 1 },
      });
      templateMap.set(res.name, created.id);
      console.log(`  + ${res.name} (resource)`);
    }

    // Ensure Clay, Wild Herbs, Wild Berries are in templateMap
    for (const name of ['Clay', 'Wild Herbs', 'Wild Berries', 'Medicinal Herbs', 'Glowcap Mushrooms']) {
      if (!templateMap.has(name)) {
        const tmpl = await prisma.itemTemplate.findFirst({ where: { name } });
        if (tmpl) templateMap.set(name, tmpl.id);
      }
    }

    const ALCHEMIST_ITEMS: Array<{
      id: string;
      name: string;
      type: 'CONSUMABLE';
      rarity: 'COMMON' | 'FINE' | 'SUPERIOR';
      description: string;
      stats: Record<string, unknown>;
      durability: number;
      professionRequired: ProfessionType;
      levelRequired: number;
      isFood: boolean;
      foodBuff: Record<string, unknown>;
      isBeverage: boolean;
      isPotion: boolean;
    }> = [
      // Tier 1 — Apprentice
      { id: 'crafted-minor-healing-potion', name: 'Minor Healing Potion', type: 'CONSUMABLE', rarity: 'COMMON', description: 'A basic herbal remedy that mends minor wounds. Every adventurer\'s first purchase.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 3, isFood: false, foodBuff: { effect: 'heal_hp', magnitude: 15, duration: 0 }, isBeverage: false, isPotion: true },
      { id: 'crafted-antidote', name: 'Antidote', type: 'CONSUMABLE', rarity: 'COMMON', description: 'A bitter tincture that neutralizes common poisons. Tastes terrible, works wonders.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 3, isFood: false, foodBuff: { effect: 'cure_poison', magnitude: 1, duration: 0 }, isBeverage: false, isPotion: true },
      { id: 'crafted-berry-salve', name: 'Berry Salve', type: 'CONSUMABLE', rarity: 'COMMON', description: 'A soothing salve made from crushed berries and herbs. Apply to wounds for gradual healing.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 4, isFood: false, foodBuff: { effect: 'hp_regen', magnitude: 8, duration: 3 }, isBeverage: false, isPotion: true },
      // Tier 2 — Journeyman
      { id: 'crafted-healing-potion', name: 'Healing Potion', type: 'CONSUMABLE', rarity: 'FINE', description: 'A proper healing draught sealed in a clay vial. Standard issue for soldiers and adventurers.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 5, isFood: false, foodBuff: { effect: 'heal_hp', magnitude: 30, duration: 0 }, isBeverage: false, isPotion: true },
      { id: 'crafted-elixir-of-strength', name: 'Elixir of Strength', type: 'CONSUMABLE', rarity: 'FINE', description: 'A deep red elixir that floods the muscles with vigor. Handle with care \u2014 the effect is intense.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 5, isFood: false, foodBuff: { effect: 'buff_strength', magnitude: 3, duration: 5 }, isBeverage: false, isPotion: true },
      { id: 'crafted-elixir-of-wisdom', name: 'Elixir of Wisdom', type: 'CONSUMABLE', rarity: 'FINE', description: 'A shimmering blue elixir that clears the mind and sharpens intuition.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 5, isFood: false, foodBuff: { effect: 'buff_wisdom', magnitude: 3, duration: 5 }, isBeverage: false, isPotion: true },
      { id: 'crafted-poison-resistance-tonic', name: 'Poison Resistance Tonic', type: 'CONSUMABLE', rarity: 'FINE', description: 'A preventive tonic that coats the stomach against venomous attacks.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 6, isFood: false, foodBuff: { effect: 'poison_immunity', magnitude: 1, duration: 5 }, isBeverage: false, isPotion: true },
      // Tier 3 — Craftsman
      { id: 'crafted-greater-healing-potion', name: 'Greater Healing Potion', type: 'CONSUMABLE', rarity: 'SUPERIOR', description: 'A powerful healing draught brewed from rare medicinal herbs. Can save a life on the battlefield.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 7, isFood: false, foodBuff: { effect: 'heal_hp', magnitude: 60, duration: 0 }, isBeverage: false, isPotion: true },
      { id: 'crafted-elixir-of-fortitude', name: 'Elixir of Fortitude', type: 'CONSUMABLE', rarity: 'SUPERIOR', description: 'A thick golden elixir that hardens the body against physical punishment.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 7, isFood: false, foodBuff: { effect: 'buff_constitution', magnitude: 4, duration: 5, secondaryEffect: 'buff_strength', secondaryMagnitude: 2 }, isBeverage: false, isPotion: true },
      { id: 'crafted-glowcap-extract', name: 'Glowcap Extract', type: 'CONSUMABLE', rarity: 'SUPERIOR', description: 'A luminescent extract that enhances mental acuity. The glow fades as the mind sharpens.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 7, isFood: false, foodBuff: { effect: 'buff_intelligence', magnitude: 4, duration: 5, secondaryEffect: 'buff_wisdom', secondaryMagnitude: 2 }, isBeverage: false, isPotion: true },
      { id: 'crafted-universal-antidote', name: 'Universal Antidote', type: 'CONSUMABLE', rarity: 'SUPERIOR', description: 'A legendary cure-all that purges every toxin and affliction.', stats: {}, durability: 1, professionRequired: 'ALCHEMIST', levelRequired: 8, isFood: false, foodBuff: { effect: 'cure_all', magnitude: 1, duration: 0, secondaryEffect: 'poison_immunity', secondaryMagnitude: 1 }, isBeverage: false, isPotion: true },
    ];

    for (const item of ALCHEMIST_ITEMS) {
      const created = await prisma.itemTemplate.upsert({
        where: { id: item.id },
        update: { name: item.name, type: item.type, rarity: item.rarity, description: item.description, stats: item.stats, durability: item.durability, professionRequired: item.professionRequired, levelRequired: item.levelRequired, isFood: item.isFood, foodBuff: item.foodBuff, isBeverage: item.isBeverage, isPotion: item.isPotion },
        create: { id: item.id, name: item.name, type: item.type, rarity: item.rarity, description: item.description, stats: item.stats, durability: item.durability, professionRequired: item.professionRequired, levelRequired: item.levelRequired, isFood: item.isFood, foodBuff: item.foodBuff, isBeverage: item.isBeverage, isPotion: item.isPotion },
      });
      templateMap.set(item.name, created.id);
      console.log(`  + ${item.name} (${item.rarity} / ALCHEMIST Lvl ${item.levelRequired})`);
    }

    // ---------------------------------------------------------------
    // Step 6C: Seed 11 ALCHEMIST recipes
    // ---------------------------------------------------------------
    console.log('\n--- Seeding ALCHEMIST Recipes ---');

    const ALCHEMIST_RECIPES = [
      // Tier 1 — Level 3-4
      { recipeId: 'alch-minor-healing-potion', name: 'Minor Healing Potion', levelRequired: 3, inputs: [{ itemName: 'Wild Herbs', quantity: 3 }], outputName: 'Minor Healing Potion', xpReward: 8, craftTime: 10 },
      { recipeId: 'alch-antidote', name: 'Antidote', levelRequired: 3, inputs: [{ itemName: 'Wild Herbs', quantity: 2 }, { itemName: 'Wild Berries', quantity: 1 }], outputName: 'Antidote', xpReward: 8, craftTime: 10 },
      { recipeId: 'alch-berry-salve', name: 'Berry Salve', levelRequired: 4, inputs: [{ itemName: 'Wild Berries', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 2 }], outputName: 'Berry Salve', xpReward: 10, craftTime: 15 },
      // Tier 2 — Level 5-6
      { recipeId: 'alch-healing-potion', name: 'Healing Potion', levelRequired: 5, inputs: [{ itemName: 'Wild Herbs', quantity: 4 }, { itemName: 'Clay', quantity: 1 }], outputName: 'Healing Potion', xpReward: 15, craftTime: 20 },
      { recipeId: 'alch-elixir-of-strength', name: 'Elixir of Strength', levelRequired: 5, inputs: [{ itemName: 'Wild Herbs', quantity: 3 }, { itemName: 'Wild Berries', quantity: 2 }, { itemName: 'Clay', quantity: 1 }], outputName: 'Elixir of Strength', xpReward: 15, craftTime: 25 },
      { recipeId: 'alch-elixir-of-wisdom', name: 'Elixir of Wisdom', levelRequired: 5, inputs: [{ itemName: 'Wild Herbs', quantity: 4 }, { itemName: 'Clay', quantity: 1 }], outputName: 'Elixir of Wisdom', xpReward: 15, craftTime: 25 },
      { recipeId: 'alch-poison-resistance-tonic', name: 'Poison Resistance Tonic', levelRequired: 6, inputs: [{ itemName: 'Wild Herbs', quantity: 3 }, { itemName: 'Wild Berries', quantity: 2 }, { itemName: 'Clay', quantity: 1 }], outputName: 'Poison Resistance Tonic', xpReward: 18, craftTime: 30 },
      // Tier 3 — Level 7-8
      { recipeId: 'alch-greater-healing-potion', name: 'Greater Healing Potion', levelRequired: 7, inputs: [{ itemName: 'Medicinal Herbs', quantity: 3 }, { itemName: 'Clay', quantity: 2 }], outputName: 'Greater Healing Potion', xpReward: 22, craftTime: 35 },
      { recipeId: 'alch-elixir-of-fortitude', name: 'Elixir of Fortitude', levelRequired: 7, inputs: [{ itemName: 'Medicinal Herbs', quantity: 2 }, { itemName: 'Glowcap Mushrooms', quantity: 2 }, { itemName: 'Clay', quantity: 1 }], outputName: 'Elixir of Fortitude', xpReward: 25, craftTime: 40 },
      { recipeId: 'alch-glowcap-extract', name: 'Glowcap Extract', levelRequired: 7, inputs: [{ itemName: 'Glowcap Mushrooms', quantity: 4 }, { itemName: 'Clay', quantity: 1 }], outputName: 'Glowcap Extract', xpReward: 25, craftTime: 40 },
      { recipeId: 'alch-universal-antidote', name: 'Universal Antidote', levelRequired: 8, inputs: [{ itemName: 'Medicinal Herbs', quantity: 3 }, { itemName: 'Glowcap Mushrooms', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 2 }, { itemName: 'Clay', quantity: 1 }], outputName: 'Universal Antidote', xpReward: 30, craftTime: 50 },
    ];

    for (const recipe of ALCHEMIST_RECIPES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      const resultId = templateMap.get(recipe.outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: ${recipe.outputName} (recipe: ${recipe.name})`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: 'ALCHEMIST' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId,
          name: recipe.name,
          professionType: 'ALCHEMIST' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
      });

      console.log(`  + ${recipe.name} (ALCHEMIST ${tier}, Lvl ${recipe.levelRequired})`);
    }

    // Clean up orphaned ALCHEMIST recipes (old ones from before rewrite)
    console.log('\n--- Cleaning orphaned ALCHEMIST recipes ---');
    const canonicalAlchemistIds = new Set(ALCHEMIST_RECIPES.map(r => `recipe-${r.recipeId}`));
    const allDbAlchemistRecipes = await prisma.recipe.findMany({
      where: { professionType: 'ALCHEMIST' },
      select: { id: true, name: true },
    });
    let alchemistOrphanCount = 0;
    for (const dbRecipe of allDbAlchemistRecipes) {
      if (!canonicalAlchemistIds.has(dbRecipe.id)) {
        const deletedActions = await prisma.craftingAction.deleteMany({
          where: { recipeId: dbRecipe.id },
        });
        if (deletedActions.count > 0) {
          console.log(`    Removed ${deletedActions.count} crafting actions for ${dbRecipe.name}`);
        }
        await prisma.recipe.delete({ where: { id: dbRecipe.id } });
        console.log(`  ✗ Deleted orphaned recipe: ${dbRecipe.name} (${dbRecipe.id})`);
        alchemistOrphanCount++;
      }
    }
    console.log(`  Orphaned ALCHEMIST recipes removed: ${alchemistOrphanCount}`);

    console.log(`\n✅ ALCHEMIST seed complete: ${ALCHEMIST_ITEMS.length} items, ${ALCHEMIST_RECIPES.length} recipes`);

    // ---------------------------------------------------------------
    // Step 7: Seed BLACKSMITH resource + output ItemTemplates
    // ---------------------------------------------------------------
    console.log('\n--- Seeding BLACKSMITH ItemTemplates ---');

    // Ensure input resource templates exist
    const blacksmithResources = [
      { id: 'resource-iron-ore-chunks', name: 'Iron Ore Chunks', type: 'MATERIAL' as const, description: 'Rough chunks of iron ore from the mines.' },
      { id: 'resource-wood-logs', name: 'Wood Logs', type: 'MATERIAL' as const, description: 'Freshly felled timber logs.' },
      { id: 'resource-coal', name: 'Coal', type: 'MATERIAL' as const, description: 'Dense black fuel, essential for smelting steel and forging advanced metalwork.' },
      { id: 'resource-silver-ore', name: 'Silver Ore', type: 'MATERIAL' as const, description: 'Lustrous silver-veined rock prized by blacksmiths and jewelers alike.' },
      { id: 'resource-hardwood', name: 'Hardwood', type: 'MATERIAL' as const, description: 'Dense, slow-grown timber from old-growth trees. Superior for tool handles and shields.' },
    ];
    for (const res of blacksmithResources) {
      const created = await prisma.itemTemplate.upsert({
        where: { id: res.id },
        update: { name: res.name, type: res.type, description: res.description },
        create: { id: res.id, name: res.name, type: res.type, rarity: 'COMMON', description: res.description, stats: {}, durability: 100, professionRequired: null, levelRequired: 1 },
      });
      templateMap.set(res.name, created.id);
      console.log(`  + ${res.name} (resource)`);
    }

    // Output item templates — 24 new items + 4 that may already exist
    const BLACKSMITH_ITEMS: Array<{
      id: string;
      name: string;
      type: 'TOOL' | 'WEAPON' | 'ARMOR';
      rarity: 'COMMON' | 'FINE' | 'SUPERIOR';
      description: string;
      stats: Record<string, unknown>;
      durability: number;
      professionRequired: ProfessionType;
      levelRequired: number;
      equipSlot?: string;
    }> = [
      // --- Apprentice Tools (L3-4) ---
      { id: 'crafted-iron-pickaxe', name: 'Iron Pickaxe', type: 'TOOL', rarity: 'COMMON', description: 'A sturdy iron pickaxe that improves mining yield.', stats: { durability: 20, yieldBonus: 15, professionType: 'MINER' }, durability: 50, professionRequired: 'BLACKSMITH', levelRequired: 3 },
      { id: 'crafted-iron-hatchet', name: 'Iron Hatchet', type: 'TOOL', rarity: 'COMMON', description: 'A reliable iron hatchet for woodcutting.', stats: { durability: 20, yieldBonus: 15, professionType: 'LUMBERJACK' }, durability: 50, professionRequired: 'BLACKSMITH', levelRequired: 3 },
      { id: 'crafted-iron-hoe', name: 'Iron Hoe', type: 'TOOL', rarity: 'COMMON', description: 'An iron hoe that helps farmers work the soil more efficiently.', stats: { durability: 20, yieldBonus: 15, professionType: 'FARMER' }, durability: 50, professionRequired: 'BLACKSMITH', levelRequired: 4 },
      // --- Apprentice Weapons (L3-4) ---
      { id: 'crafted-bs-iron-sword', name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON', description: 'A sturdy iron sword forged from raw ore. Reliable in battle.', stats: { baseDamage: 5, damageType: 'slashing', speed: 10, requiredStr: 5, requiredDex: 3, durability: 80, levelToEquip: 3 }, durability: 80, professionRequired: 'BLACKSMITH', levelRequired: 3, equipSlot: 'MAIN_HAND' },
      { id: 'crafted-iron-mace', name: 'Iron Mace', type: 'WEAPON', rarity: 'COMMON', description: 'A heavy iron mace that crushes armor and bone alike.', stats: { baseDamage: 6, damageType: 'bludgeoning', speed: 8, requiredStr: 6, requiredDex: 2, durability: 90, levelToEquip: 3 }, durability: 90, professionRequired: 'BLACKSMITH', levelRequired: 4, equipSlot: 'MAIN_HAND' },
      // --- Apprentice Armor (L3-4) ---
      { id: 'crafted-iron-chain-shirt', name: 'Iron Chain Shirt', type: 'ARMOR', rarity: 'COMMON', description: 'A light shirt of interlocking iron rings. Offers decent protection.', stats: { armor: 4, durability: 100, levelToEquip: 3, requiredStr: 5, movementPenalty: 0, stealthPenalty: 1 }, durability: 100, professionRequired: 'BLACKSMITH', levelRequired: 4, equipSlot: 'CHEST' },
      { id: 'crafted-wooden-shield', name: 'Wooden Shield', type: 'ARMOR', rarity: 'COMMON', description: 'A wooden shield reinforced with iron bands. Light but protective.', stats: { armor: 3, durability: 60, levelToEquip: 3, movementPenalty: 0, stealthPenalty: 0 }, durability: 60, professionRequired: 'BLACKSMITH', levelRequired: 3, equipSlot: 'OFF_HAND' },
      // --- Journeyman Tools (L5-6) ---
      { id: 'crafted-steel-pickaxe', name: 'Steel Pickaxe', type: 'TOOL', rarity: 'FINE', description: 'A steel-tipped pickaxe with enhanced mining performance.', stats: { durability: 35, yieldBonus: 25, professionType: 'MINER' }, durability: 75, professionRequired: 'BLACKSMITH', levelRequired: 5 },
      { id: 'crafted-steel-hatchet', name: 'Steel Hatchet', type: 'TOOL', rarity: 'FINE', description: 'A keen steel hatchet that bites deep into timber.', stats: { durability: 35, yieldBonus: 25, professionType: 'LUMBERJACK' }, durability: 75, professionRequired: 'BLACKSMITH', levelRequired: 5 },
      { id: 'crafted-steel-hoe', name: 'Steel Hoe', type: 'TOOL', rarity: 'FINE', description: 'A steel hoe that turns even the hardest soil with ease.', stats: { durability: 35, yieldBonus: 25, professionType: 'FARMER' }, durability: 75, professionRequired: 'BLACKSMITH', levelRequired: 5 },
      { id: 'crafted-herbalists-sickle', name: "Herbalist's Sickle", type: 'TOOL', rarity: 'FINE', description: 'A curved steel sickle designed for precise herb harvesting.', stats: { durability: 35, yieldBonus: 25, professionType: 'HERBALIST' }, durability: 75, professionRequired: 'BLACKSMITH', levelRequired: 6 },
      { id: 'crafted-fishing-hook-set', name: 'Fishing Hook Set', type: 'TOOL', rarity: 'FINE', description: 'A set of barbed steel hooks that improve catch rates.', stats: { durability: 35, yieldBonus: 25, professionType: 'FISHERMAN' }, durability: 75, professionRequired: 'BLACKSMITH', levelRequired: 6 },
      // --- Journeyman Weapons (L5-6) ---
      { id: 'crafted-steel-sword', name: 'Steel Sword', type: 'WEAPON', rarity: 'FINE', description: 'A sharp steel blade tempered with coal. Cuts through armor.', stats: { baseDamage: 8, damageType: 'slashing', speed: 10, requiredStr: 7, requiredDex: 4, durability: 100, levelToEquip: 5 }, durability: 100, professionRequired: 'BLACKSMITH', levelRequired: 5, equipSlot: 'MAIN_HAND' },
      { id: 'crafted-steel-warhammer', name: 'Steel Warhammer', type: 'WEAPON', rarity: 'FINE', description: 'A devastating steel warhammer that shatters shields and bones.', stats: { baseDamage: 10, damageType: 'bludgeoning', speed: 7, requiredStr: 9, requiredDex: 2, durability: 110, levelToEquip: 5 }, durability: 110, professionRequired: 'BLACKSMITH', levelRequired: 6, equipSlot: 'MAIN_HAND' },
      // --- Journeyman Armor (L5-6) ---
      { id: 'crafted-steel-chain-mail', name: 'Steel Chain Mail', type: 'ARMOR', rarity: 'FINE', description: 'Heavy steel chain mail forged with coal. Superior protection.', stats: { armor: 7, durability: 130, levelToEquip: 5, requiredStr: 7, movementPenalty: 0, stealthPenalty: 2 }, durability: 130, professionRequired: 'BLACKSMITH', levelRequired: 5, equipSlot: 'CHEST' },
      { id: 'crafted-steel-helmet', name: 'Steel Helmet', type: 'ARMOR', rarity: 'FINE', description: 'A solid steel helmet that protects the head in combat.', stats: { armor: 4, durability: 100, levelToEquip: 5, requiredStr: 5, movementPenalty: 0, stealthPenalty: 1 }, durability: 100, professionRequired: 'BLACKSMITH', levelRequired: 6, equipSlot: 'HEAD' },
      // --- Toolsmith Branch (L7-8) ---
      { id: 'crafted-silver-pickaxe', name: 'Silver Pickaxe', type: 'TOOL', rarity: 'SUPERIOR', description: 'A silver-reinforced pickaxe with exceptional mining yield.', stats: { durability: 50, yieldBonus: 40, professionType: 'MINER' }, durability: 100, professionRequired: 'BLACKSMITH', levelRequired: 7 },
      { id: 'crafted-hardwood-hatchet', name: 'Hardwood Hatchet', type: 'TOOL', rarity: 'SUPERIOR', description: 'An iron-headed hatchet with a dense hardwood handle. Built to last.', stats: { durability: 50, yieldBonus: 40, professionType: 'LUMBERJACK' }, durability: 100, professionRequired: 'BLACKSMITH', levelRequired: 7 },
      { id: 'crafted-hunters-knife', name: "Hunter's Knife", type: 'TOOL', rarity: 'SUPERIOR', description: 'A silver-edged skinning knife that improves hunting yields.', stats: { durability: 50, yieldBonus: 40, professionType: 'HUNTER' }, durability: 100, professionRequired: 'BLACKSMITH', levelRequired: 7 },
      { id: 'crafted-reinforced-hoe', name: 'Reinforced Hoe', type: 'TOOL', rarity: 'SUPERIOR', description: 'A hardwood-handled hoe with silver blade. The finest farming tool.', stats: { durability: 50, yieldBonus: 40, professionType: 'FARMER' }, durability: 100, professionRequired: 'BLACKSMITH', levelRequired: 8 },
      // --- Weaponsmith Branch (L7-8) ---
      { id: 'crafted-silver-longsword', name: 'Silver Longsword', type: 'WEAPON', rarity: 'SUPERIOR', description: 'A gleaming silver longsword. Devastating against undead.', stats: { baseDamage: 13, damageType: 'slashing', speed: 9, requiredStr: 10, requiredDex: 5, durability: 130, levelToEquip: 7 }, durability: 130, professionRequired: 'BLACKSMITH', levelRequired: 7, equipSlot: 'MAIN_HAND' },
      { id: 'crafted-silver-dagger', name: 'Silver Dagger', type: 'WEAPON', rarity: 'SUPERIOR', description: 'A wickedly fast silver dagger favored by rogues.', stats: { baseDamage: 9, damageType: 'piercing', speed: 13, requiredStr: 4, requiredDex: 8, durability: 90, levelToEquip: 7 }, durability: 90, professionRequired: 'BLACKSMITH', levelRequired: 7, equipSlot: 'MAIN_HAND' },
      { id: 'crafted-silver-battleaxe', name: 'Silver Battleaxe', type: 'WEAPON', rarity: 'SUPERIOR', description: 'A massive silver battleaxe that cleaves through foes.', stats: { baseDamage: 16, damageType: 'slashing', speed: 7, requiredStr: 12, requiredDex: 3, durability: 140, levelToEquip: 7, twoHanded: true }, durability: 140, professionRequired: 'BLACKSMITH', levelRequired: 8, equipSlot: 'MAIN_HAND' },
      { id: 'crafted-war-pick', name: 'War Pick', type: 'WEAPON', rarity: 'SUPERIOR', description: 'A silver-tipped war pick that punches through heavy armor.', stats: { baseDamage: 12, damageType: 'piercing', speed: 9, requiredStr: 9, requiredDex: 4, durability: 120, levelToEquip: 7 }, durability: 120, professionRequired: 'BLACKSMITH', levelRequired: 8, equipSlot: 'MAIN_HAND' },
      // --- Armorer Branch (L7-8) ---
      { id: 'crafted-silver-studded-plate', name: 'Silver-Studded Plate', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Heavy plate armor studded with silver rivets. Exceptional protection.', stats: { armor: 11, durability: 160, levelToEquip: 7, requiredStr: 10, movementPenalty: 1, stealthPenalty: 3 }, durability: 160, professionRequired: 'BLACKSMITH', levelRequired: 7, equipSlot: 'CHEST' },
      { id: 'crafted-silver-helm', name: 'Silver Helm', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A gleaming silver helm that inspires confidence on the battlefield.', stats: { armor: 6, durability: 120, levelToEquip: 7, requiredStr: 6, movementPenalty: 0, stealthPenalty: 1 }, durability: 120, professionRequired: 'BLACKSMITH', levelRequired: 7, equipSlot: 'HEAD' },
      { id: 'crafted-hardwood-tower-shield', name: 'Hardwood Tower Shield', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A massive hardwood tower shield bound with silver. Wall-like protection.', stats: { armor: 8, durability: 140, levelToEquip: 7, requiredStr: 8, movementPenalty: 1, stealthPenalty: 2 }, durability: 140, professionRequired: 'BLACKSMITH', levelRequired: 8, equipSlot: 'OFF_HAND' },
      { id: 'crafted-reinforced-chain-leggings', name: 'Reinforced Chain Leggings', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Silver-reinforced chain leggings that protect the legs without sacrificing mobility.', stats: { armor: 7, durability: 130, levelToEquip: 7, requiredStr: 7, movementPenalty: 0, stealthPenalty: 2 }, durability: 130, professionRequired: 'BLACKSMITH', levelRequired: 8, equipSlot: 'LEGS' },
    ];

    for (const item of BLACKSMITH_ITEMS) {
      // Merge equipSlot into stats JSON (not a column on ItemTemplate)
      const statsWithSlot = item.equipSlot
        ? { ...item.stats, equipSlot: item.equipSlot }
        : item.stats;

      const data: Record<string, unknown> = {
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        description: item.description,
        stats: statsWithSlot,
        durability: item.durability,
        professionRequired: item.professionRequired,
        levelRequired: item.levelRequired,
      };

      const created = await prisma.itemTemplate.upsert({
        where: { id: item.id },
        update: data,
        create: { id: item.id, ...data } as any,
      });
      templateMap.set(item.name, created.id);
      console.log(`  + ${item.name} (${item.type} / ${item.rarity})`);
    }

    // ---------------------------------------------------------------
    // Step 8: Seed 28 BLACKSMITH recipes
    // ---------------------------------------------------------------
    console.log('\n--- Seeding BLACKSMITH Recipes ---');

    const BS_RECIPES = [
      // Apprentice (L3-4) — shared
      { recipeId: 'bs-iron-pickaxe', name: 'Forge Iron Pickaxe', levelRequired: 3, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 3 }, { itemName: 'Wood Logs', quantity: 1 }], outputName: 'Iron Pickaxe', xpReward: 10, craftTime: 20, specialization: null as string | null },
      { recipeId: 'bs-iron-hatchet', name: 'Forge Iron Hatchet', levelRequired: 3, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 3 }, { itemName: 'Wood Logs', quantity: 2 }], outputName: 'Iron Hatchet', xpReward: 10, craftTime: 20, specialization: null },
      { recipeId: 'bs-iron-hoe', name: 'Forge Iron Hoe', levelRequired: 4, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 2 }, { itemName: 'Wood Logs', quantity: 2 }], outputName: 'Iron Hoe', xpReward: 10, craftTime: 20, specialization: null },
      { recipeId: 'bs-iron-sword', name: 'Forge Iron Sword', levelRequired: 3, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 4 }, { itemName: 'Wood Logs', quantity: 1 }], outputName: 'Iron Sword', xpReward: 12, craftTime: 25, specialization: null },
      { recipeId: 'bs-iron-mace', name: 'Forge Iron Mace', levelRequired: 4, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 5 }], outputName: 'Iron Mace', xpReward: 12, craftTime: 25, specialization: null },
      { recipeId: 'bs-iron-chain-shirt', name: 'Forge Iron Chain Shirt', levelRequired: 4, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 6 }], outputName: 'Iron Chain Shirt', xpReward: 14, craftTime: 30, specialization: null },
      { recipeId: 'bs-wooden-shield', name: 'Craft Wooden Shield', levelRequired: 3, inputs: [{ itemName: 'Wood Logs', quantity: 4 }, { itemName: 'Iron Ore Chunks', quantity: 1 }], outputName: 'Wooden Shield', xpReward: 10, craftTime: 20, specialization: null },
      // Journeyman (L5-6) — shared
      { recipeId: 'bs-steel-pickaxe', name: 'Forge Steel Pickaxe', levelRequired: 5, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 3 }, { itemName: 'Coal', quantity: 2 }, { itemName: 'Wood Logs', quantity: 1 }], outputName: 'Steel Pickaxe', xpReward: 15, craftTime: 30, specialization: null },
      { recipeId: 'bs-steel-hatchet', name: 'Forge Steel Hatchet', levelRequired: 5, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 3 }, { itemName: 'Coal', quantity: 2 }, { itemName: 'Wood Logs', quantity: 2 }], outputName: 'Steel Hatchet', xpReward: 15, craftTime: 30, specialization: null },
      { recipeId: 'bs-steel-hoe', name: 'Forge Steel Hoe', levelRequired: 5, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 2 }, { itemName: 'Coal', quantity: 2 }, { itemName: 'Wood Logs', quantity: 2 }], outputName: 'Steel Hoe', xpReward: 14, craftTime: 25, specialization: null },
      { recipeId: 'bs-herbalists-sickle', name: "Forge Herbalist's Sickle", levelRequired: 6, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 2 }, { itemName: 'Coal', quantity: 1 }, { itemName: 'Wood Logs', quantity: 1 }], outputName: "Herbalist's Sickle", xpReward: 14, craftTime: 25, specialization: null },
      { recipeId: 'bs-fishing-hook-set', name: 'Forge Fishing Hook Set', levelRequired: 6, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 2 }, { itemName: 'Coal', quantity: 1 }], outputName: 'Fishing Hook Set', xpReward: 12, craftTime: 20, specialization: null },
      { recipeId: 'bs-steel-sword', name: 'Forge Steel Sword', levelRequired: 5, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 4 }, { itemName: 'Coal', quantity: 3 }, { itemName: 'Wood Logs', quantity: 1 }], outputName: 'Steel Sword', xpReward: 18, craftTime: 35, specialization: null },
      { recipeId: 'bs-steel-warhammer', name: 'Forge Steel Warhammer', levelRequired: 6, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 5 }, { itemName: 'Coal', quantity: 3 }, { itemName: 'Wood Logs', quantity: 2 }], outputName: 'Steel Warhammer', xpReward: 20, craftTime: 40, specialization: null },
      { recipeId: 'bs-steel-chain-mail', name: 'Forge Steel Chain Mail', levelRequired: 5, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 6 }, { itemName: 'Coal', quantity: 3 }], outputName: 'Steel Chain Mail', xpReward: 20, craftTime: 40, specialization: null },
      { recipeId: 'bs-steel-helmet', name: 'Forge Steel Helmet', levelRequired: 6, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 3 }, { itemName: 'Coal', quantity: 2 }], outputName: 'Steel Helmet', xpReward: 16, craftTime: 30, specialization: null },
      // Toolsmith (L7-8)
      { recipeId: 'bs-silver-pickaxe', name: 'Forge Silver Pickaxe', levelRequired: 7, inputs: [{ itemName: 'Silver Ore', quantity: 2 }, { itemName: 'Coal', quantity: 2 }, { itemName: 'Hardwood', quantity: 1 }], outputName: 'Silver Pickaxe', xpReward: 22, craftTime: 40, specialization: 'TOOLSMITH' },
      { recipeId: 'bs-hardwood-hatchet', name: 'Forge Hardwood Hatchet', levelRequired: 7, inputs: [{ itemName: 'Iron Ore Chunks', quantity: 3 }, { itemName: 'Coal', quantity: 2 }, { itemName: 'Hardwood', quantity: 2 }], outputName: 'Hardwood Hatchet', xpReward: 22, craftTime: 40, specialization: 'TOOLSMITH' },
      { recipeId: 'bs-hunters-knife', name: "Forge Hunter's Knife", levelRequired: 7, inputs: [{ itemName: 'Silver Ore', quantity: 2 }, { itemName: 'Coal', quantity: 1 }, { itemName: 'Hardwood', quantity: 1 }], outputName: "Hunter's Knife", xpReward: 20, craftTime: 35, specialization: 'TOOLSMITH' },
      { recipeId: 'bs-reinforced-hoe', name: 'Forge Reinforced Hoe', levelRequired: 8, inputs: [{ itemName: 'Silver Ore', quantity: 2 }, { itemName: 'Coal', quantity: 1 }, { itemName: 'Hardwood', quantity: 2 }], outputName: 'Reinforced Hoe', xpReward: 25, craftTime: 40, specialization: 'TOOLSMITH' },
      // Weaponsmith (L7-8)
      { recipeId: 'bs-silver-longsword', name: 'Forge Silver Longsword', levelRequired: 7, inputs: [{ itemName: 'Silver Ore', quantity: 4 }, { itemName: 'Coal', quantity: 2 }, { itemName: 'Hardwood', quantity: 1 }], outputName: 'Silver Longsword', xpReward: 25, craftTime: 45, specialization: 'WEAPONSMITH' },
      { recipeId: 'bs-silver-dagger', name: 'Forge Silver Dagger', levelRequired: 7, inputs: [{ itemName: 'Silver Ore', quantity: 2 }, { itemName: 'Coal', quantity: 1 }], outputName: 'Silver Dagger', xpReward: 20, craftTime: 30, specialization: 'WEAPONSMITH' },
      { recipeId: 'bs-silver-battleaxe', name: 'Forge Silver Battleaxe', levelRequired: 8, inputs: [{ itemName: 'Silver Ore', quantity: 5 }, { itemName: 'Coal', quantity: 3 }, { itemName: 'Hardwood', quantity: 2 }], outputName: 'Silver Battleaxe', xpReward: 28, craftTime: 50, specialization: 'WEAPONSMITH' },
      { recipeId: 'bs-war-pick', name: 'Forge War Pick', levelRequired: 8, inputs: [{ itemName: 'Silver Ore', quantity: 4 }, { itemName: 'Coal', quantity: 2 }, { itemName: 'Hardwood', quantity: 1 }], outputName: 'War Pick', xpReward: 25, craftTime: 45, specialization: 'WEAPONSMITH' },
      // Armorer (L7-8)
      { recipeId: 'bs-silver-studded-plate', name: 'Forge Silver-Studded Plate', levelRequired: 7, inputs: [{ itemName: 'Silver Ore', quantity: 6 }, { itemName: 'Coal', quantity: 3 }, { itemName: 'Hardwood', quantity: 2 }], outputName: 'Silver-Studded Plate', xpReward: 28, craftTime: 50, specialization: 'ARMORER' },
      { recipeId: 'bs-silver-helm', name: 'Forge Silver Helm', levelRequired: 7, inputs: [{ itemName: 'Silver Ore', quantity: 3 }, { itemName: 'Coal', quantity: 2 }], outputName: 'Silver Helm', xpReward: 22, craftTime: 35, specialization: 'ARMORER' },
      { recipeId: 'bs-hardwood-tower-shield', name: 'Craft Hardwood Tower Shield', levelRequired: 8, inputs: [{ itemName: 'Hardwood', quantity: 4 }, { itemName: 'Silver Ore', quantity: 2 }, { itemName: 'Coal', quantity: 1 }], outputName: 'Hardwood Tower Shield', xpReward: 25, craftTime: 45, specialization: 'ARMORER' },
      { recipeId: 'bs-reinforced-chain-leggings', name: 'Forge Reinforced Chain Leggings', levelRequired: 8, inputs: [{ itemName: 'Silver Ore', quantity: 5 }, { itemName: 'Coal', quantity: 3 }, { itemName: 'Hardwood', quantity: 1 }], outputName: 'Reinforced Chain Leggings', xpReward: 25, craftTime: 45, specialization: 'ARMORER' },
    ];

    for (const recipe of BS_RECIPES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      const resultId = templateMap.get(recipe.outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: ${recipe.outputName} (recipe: ${recipe.name})`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: 'BLACKSMITH' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
          specialization: recipe.specialization,
          levelRequired: recipe.levelRequired,
        },
        create: {
          id: recipeId,
          name: recipe.name,
          professionType: 'BLACKSMITH' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
          specialization: recipe.specialization,
          levelRequired: recipe.levelRequired,
        },
      });

      const specLabel = recipe.specialization ? ` [${recipe.specialization}]` : '';
      console.log(`  + ${recipe.name} (BLACKSMITH ${tier}, Lvl ${recipe.levelRequired})${specLabel}`);
    }

    // Clean up orphaned BLACKSMITH recipes
    console.log('\n--- Cleaning orphaned BLACKSMITH recipes ---');
    const canonicalBsIds = new Set(BS_RECIPES.map(r => `recipe-${r.recipeId}`));
    const allDbBsRecipes = await prisma.recipe.findMany({
      where: { professionType: 'BLACKSMITH' },
      select: { id: true, name: true },
    });
    let bsOrphanCount = 0;
    for (const dbRecipe of allDbBsRecipes) {
      if (!canonicalBsIds.has(dbRecipe.id)) {
        const deletedActions = await prisma.craftingAction.deleteMany({
          where: { recipeId: dbRecipe.id },
        });
        if (deletedActions.count > 0) {
          console.log(`    Removed ${deletedActions.count} crafting actions for ${dbRecipe.name}`);
        }
        await prisma.recipe.delete({ where: { id: dbRecipe.id } });
        console.log(`  ✗ Deleted orphaned recipe: ${dbRecipe.name} (${dbRecipe.id})`);
        bsOrphanCount++;
      }
    }
    console.log(`  Orphaned BLACKSMITH recipes removed: ${bsOrphanCount}`);

    console.log(`\n✅ BLACKSMITH seed complete: ${BLACKSMITH_ITEMS.length} items, ${BS_RECIPES.length} recipes`);

    // ---------------------------------------------------------------
    // Step 9: Seed WOODWORKER finished goods item templates
    // ---------------------------------------------------------------
    console.log('\n--- Seeding WOODWORKER Item Templates ---');

    const WOODWORKER_ITEMS: Array<{
      id: string;
      name: string;
      type: string;
      rarity: string;
      description: string;
      stats: Record<string, unknown>;
      durability: number;
      professionRequired: string;
      levelRequired: number;
      equipSlot?: string;
    }> = [
      // Intermediate materials
      { id: 'crafted-wooden-dowels', name: 'Wooden Dowels', type: 'MATERIAL', rarity: 'COMMON', description: 'Thin wooden pegs used to join furniture and tools.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 3 },
      { id: 'crafted-wooden-handle', name: 'Wooden Handle', type: 'MATERIAL', rarity: 'COMMON', description: 'A shaped hardwood handle for tools and weapons.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 5 },
      { id: 'crafted-bow-stave', name: 'Bow Stave', type: 'MATERIAL', rarity: 'COMMON', description: 'A carefully shaped stave of hardwood, ready to be strung into a bow.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 8 },
      { id: 'crafted-wooden-frame', name: 'Wooden Frame', type: 'MATERIAL', rarity: 'COMMON', description: 'A sturdy wooden frame used as the skeleton for furniture and crates.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 12 },
      // Tools
      { id: 'crafted-wooden-pickaxe', name: 'Wooden Pickaxe', type: 'TOOL', rarity: 'POOR', description: 'A crude wooden pickaxe. Better than nothing for a novice miner.', stats: { durability: 10, yieldBonus: 5, professionType: 'MINER' }, durability: 25, professionRequired: 'WOODWORKER', levelRequired: 3 },
      { id: 'crafted-fishing-rod', name: 'Fishing Rod', type: 'TOOL', rarity: 'COMMON', description: 'A flexible softwood fishing rod with a simple line and hook.', stats: { durability: 15, yieldBonus: 10, professionType: 'FISHERMAN' }, durability: 35, professionRequired: 'WOODWORKER', levelRequired: 5 },
      { id: 'crafted-carving-knife', name: 'Carving Knife', type: 'TOOL', rarity: 'COMMON', description: 'A precision woodworking knife with a sharpened spike blade.', stats: { durability: 15, yieldBonus: 10, professionType: 'WOODWORKER' }, durability: 35, professionRequired: 'WOODWORKER', levelRequired: 8 },
      { id: 'crafted-tanning-rack', name: 'Tanning Rack', type: 'TOOL', rarity: 'FINE', description: 'A sturdy wooden rack for stretching and curing hides.', stats: { durability: 25, yieldBonus: 15, professionType: 'TANNER' }, durability: 60, professionRequired: 'WOODWORKER', levelRequired: 12 },
      { id: 'crafted-fine-fishing-rod', name: 'Fine Fishing Rod', type: 'TOOL', rarity: 'FINE', description: 'A well-crafted hardwood fishing rod with superior flexibility and control.', stats: { durability: 25, yieldBonus: 20, professionType: 'FISHERMAN' }, durability: 60, professionRequired: 'WOODWORKER', levelRequired: 15 },
      // Furniture / Housing
      { id: 'crafted-wooden-chair', name: 'Wooden Chair', type: 'MATERIAL', rarity: 'COMMON', description: 'A simple but comfortable wooden chair for any home.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 7 },
      { id: 'crafted-wooden-table', name: 'Wooden Table', type: 'MATERIAL', rarity: 'COMMON', description: 'A solid wooden table with a smooth hardwood surface.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 14 },
      { id: 'crafted-wooden-bed-frame', name: 'Wooden Bed Frame', type: 'MATERIAL', rarity: 'COMMON', description: 'A sturdy bed frame built from heavy beams and planks.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 18 },
      { id: 'crafted-wooden-shelf', name: 'Wooden Shelf', type: 'MATERIAL', rarity: 'FINE', description: 'An elegant shelf crafted from exotic wood.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 28 },
      { id: 'crafted-reinforced-crate', name: 'Reinforced Crate', type: 'MATERIAL', rarity: 'FINE', description: 'A heavy-duty crate reinforced with beams and extra nails.', stats: {}, durability: 0, professionRequired: 'WOODWORKER', levelRequired: 30 },
      // Armor (shields)
      { id: 'crafted-ww-wooden-shield', name: 'Wooden Shield', type: 'ARMOR', rarity: 'COMMON', description: 'A sturdy wooden shield held together with hardwood planks and nails.', stats: { armor: 5, durability: 60, levelToEquip: 5, movementPenalty: 0, stealthPenalty: 0 }, durability: 60, professionRequired: 'WOODWORKER', levelRequired: 12, equipSlot: 'OFF_HAND' },
      { id: 'crafted-ww-hardwood-tower-shield', name: 'Hardwood Tower Shield', type: 'ARMOR', rarity: 'FINE', description: 'A massive tower shield built from heavy hardwood planks and beams.', stats: { armor: 10, durability: 100, levelToEquip: 15, requiredStr: 8, movementPenalty: 1, stealthPenalty: 1 }, durability: 100, professionRequired: 'WOODWORKER', levelRequired: 35, equipSlot: 'OFF_HAND' },
      // Weapon
      { id: 'crafted-practice-bow', name: 'Practice Bow', type: 'WEAPON', rarity: 'COMMON', description: 'A basic training bow. Functional but no match for a real fletcher\'s work.', stats: { baseDamage: 5, damageType: 'bludgeoning', speed: 8, requiredStr: 3, requiredDex: 5, durability: 60, levelToEquip: 10, twoHanded: true, range: 20 }, durability: 60, professionRequired: 'WOODWORKER', levelRequired: 30, equipSlot: 'MAIN_HAND' },
    ];

    for (const item of WOODWORKER_ITEMS) {
      const statsWithSlot = item.equipSlot
        ? { ...item.stats, equipSlot: item.equipSlot }
        : item.stats;

      const data: Record<string, unknown> = {
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        description: item.description,
        stats: statsWithSlot,
        durability: item.durability,
        professionRequired: item.professionRequired,
        levelRequired: item.levelRequired,
      };

      const created = await prisma.itemTemplate.upsert({
        where: { id: item.id },
        update: data,
        create: { id: item.id, ...data } as any,
      });
      templateMap.set(item.name, created.id);
      console.log(`  + ${item.name} (${item.type} / ${item.rarity})`);
    }

    // ---------------------------------------------------------------
    // Step 10: Seed 18 WOODWORKER finished goods + processing recipes
    // ---------------------------------------------------------------
    console.log('\n--- Seeding WOODWORKER Recipes ---');

    const WW_RECIPES = [
      // Processing — new recipes only (original 7 are seeded elsewhere)
      { recipeId: 'ww-carve-wooden-dowels', name: 'Carve Wooden Dowels', levelRequired: 3, inputs: [{ itemName: 'Softwood Planks', quantity: 1 }], outputName: 'Wooden Dowels', xpReward: 5, craftTime: 10, specialization: null as string | null },
      { recipeId: 'ww-shape-wooden-handle', name: 'Shape Wooden Handle', levelRequired: 5, inputs: [{ itemName: 'Hardwood', quantity: 1 }, { itemName: 'Rough Planks', quantity: 1 }], outputName: 'Wooden Handle', xpReward: 8, craftTime: 15, specialization: null },
      { recipeId: 'ww-carve-bow-stave', name: 'Carve Bow Stave', levelRequired: 8, inputs: [{ itemName: 'Hardwood', quantity: 2 }], outputName: 'Bow Stave', xpReward: 12, craftTime: 20, specialization: null },
      { recipeId: 'ww-craft-wooden-frame', name: 'Craft Wooden Frame', levelRequired: 12, inputs: [{ itemName: 'Hardwood Planks', quantity: 2 }, { itemName: 'Nails', quantity: 4 }], outputName: 'Wooden Frame', xpReward: 15, craftTime: 20, specialization: null },
      // Finished goods — Tools
      { recipeId: 'ww-wooden-pickaxe', name: 'Craft Wooden Pickaxe', levelRequired: 3, inputs: [{ itemName: 'Wood Logs', quantity: 2 }, { itemName: 'Wooden Dowels', quantity: 2 }], outputName: 'Wooden Pickaxe', xpReward: 10, craftTime: 15, specialization: null },
      { recipeId: 'ww-fishing-rod', name: 'Craft Fishing Rod', levelRequired: 5, inputs: [{ itemName: 'Softwood', quantity: 2 }, { itemName: 'Wooden Handle', quantity: 1 }, { itemName: 'Wooden Dowels', quantity: 3 }], outputName: 'Fishing Rod', xpReward: 12, craftTime: 20, specialization: null },
      { recipeId: 'ww-carving-knife', name: 'Craft Carving Knife', levelRequired: 8, inputs: [{ itemName: 'Wooden Handle', quantity: 1 }, { itemName: 'Nails', quantity: 2 }], outputName: 'Carving Knife', xpReward: 10, craftTime: 15, specialization: null },
      { recipeId: 'ww-tanning-rack', name: 'Craft Tanning Rack', levelRequired: 12, inputs: [{ itemName: 'Beams', quantity: 3 }, { itemName: 'Wooden Handle', quantity: 2 }, { itemName: 'Nails', quantity: 6 }], outputName: 'Tanning Rack', xpReward: 20, craftTime: 35, specialization: null },
      { recipeId: 'ww-fine-fishing-rod', name: 'Craft Fine Fishing Rod', levelRequired: 15, inputs: [{ itemName: 'Hardwood', quantity: 2 }, { itemName: 'Wooden Handle', quantity: 1 }, { itemName: 'Wooden Dowels', quantity: 4 }], outputName: 'Fine Fishing Rod', xpReward: 20, craftTime: 30, specialization: null },
      // Finished goods — Furniture
      { recipeId: 'ww-wooden-chair', name: 'Build Wooden Chair', levelRequired: 7, inputs: [{ itemName: 'Softwood Planks', quantity: 3 }, { itemName: 'Wooden Dowels', quantity: 4 }, { itemName: 'Nails', quantity: 4 }], outputName: 'Wooden Chair', xpReward: 12, craftTime: 25, specialization: null },
      { recipeId: 'ww-wooden-table', name: 'Build Wooden Table', levelRequired: 14, inputs: [{ itemName: 'Hardwood Planks', quantity: 4 }, { itemName: 'Wooden Frame', quantity: 1 }, { itemName: 'Nails', quantity: 8 }], outputName: 'Wooden Table', xpReward: 20, craftTime: 40, specialization: null },
      { recipeId: 'ww-storage-chest', name: 'Build Storage Chest', levelRequired: 16, inputs: [{ itemName: 'Hardwood Planks', quantity: 4 }, { itemName: 'Wooden Frame', quantity: 2 }, { itemName: 'Nails', quantity: 10 }], outputName: 'Storage Chest', xpReward: 22, craftTime: 45, specialization: null },
      { recipeId: 'ww-wooden-bed-frame', name: 'Build Wooden Bed Frame', levelRequired: 18, inputs: [{ itemName: 'Beams', quantity: 4 }, { itemName: 'Hardwood Planks', quantity: 6 }, { itemName: 'Nails', quantity: 12 }], outputName: 'Wooden Bed Frame', xpReward: 25, craftTime: 50, specialization: null },
      { recipeId: 'ww-wooden-shelf', name: 'Build Wooden Shelf', levelRequired: 28, inputs: [{ itemName: 'Exotic Planks', quantity: 3 }, { itemName: 'Wooden Frame', quantity: 2 }, { itemName: 'Nails', quantity: 8 }], outputName: 'Wooden Shelf', xpReward: 35, craftTime: 45, specialization: null },
      { recipeId: 'ww-reinforced-crate', name: 'Build Reinforced Crate', levelRequired: 30, inputs: [{ itemName: 'Hardwood Planks', quantity: 4 }, { itemName: 'Beams', quantity: 2 }, { itemName: 'Nails', quantity: 15 }], outputName: 'Reinforced Crate', xpReward: 30, craftTime: 40, specialization: null },
      // Finished goods — Shields
      { recipeId: 'ww-wooden-shield', name: 'Craft Wooden Shield', levelRequired: 12, inputs: [{ itemName: 'Hardwood Planks', quantity: 3 }, { itemName: 'Wooden Handle', quantity: 1 }, { itemName: 'Nails', quantity: 6 }], outputName: 'Wooden Shield', xpReward: 18, craftTime: 30, specialization: null },
      { recipeId: 'ww-hardwood-tower-shield', name: 'Craft Hardwood Tower Shield', levelRequired: 35, inputs: [{ itemName: 'Hardwood Planks', quantity: 6 }, { itemName: 'Beams', quantity: 2 }, { itemName: 'Wooden Handle', quantity: 1 }, { itemName: 'Nails', quantity: 15 }], outputName: 'Hardwood Tower Shield', xpReward: 40, craftTime: 55, specialization: null },
      // Finished goods — Weapon
      { recipeId: 'ww-practice-bow', name: 'Craft Practice Bow', levelRequired: 30, inputs: [{ itemName: 'Bow Stave', quantity: 1 }, { itemName: 'Wooden Handle', quantity: 1 }], outputName: 'Practice Bow', xpReward: 30, craftTime: 35, specialization: null },
    ];

    for (const recipe of WW_RECIPES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      const resultId = templateMap.get(recipe.outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: ${recipe.outputName} (recipe: ${recipe.name})`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: 'WOODWORKER' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
          specialization: recipe.specialization,
          levelRequired: recipe.levelRequired,
        },
        create: {
          id: recipeId,
          name: recipe.name,
          professionType: 'WOODWORKER' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
          specialization: recipe.specialization,
          levelRequired: recipe.levelRequired,
        },
      });

      console.log(`  + ${recipe.name} (WOODWORKER ${tier}, Lvl ${recipe.levelRequired})`);
    }

    console.log(`\n✅ WOODWORKER seed complete: ${WOODWORKER_ITEMS.length} items, ${WW_RECIPES.length} recipes`);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
