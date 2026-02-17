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
        rarity: 'COMMON',
        description: 'Fish seared over hot coals until the skin crisps golden. Protein-rich and satisfying.',
        stats: { hpRestore: 20 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 1,
        isFood: true,
        foodBuff: { effect: 'heal_hp', magnitude: 20, duration: 0 },
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
        description: 'A rich stew of fish and herbs that strengthens the constitution.',
        stats: { hpRestore: 28 },
        durability: 1,
        professionRequired: 'COOK',
        levelRequired: 5,
        isFood: true,
        foodBuff: { effect: 'buff_constitution', magnitude: 1, duration: 120 },
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
    // Step 2: Load existing resource templates (gathering ingredients)
    // ---------------------------------------------------------------
    const resourceNames = ['Apples', 'Wild Berries', 'Wild Herbs', 'Raw Fish', 'Grain', 'Vegetables'];
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
      { recipeId: 'cook-grilled-fish', name: 'Grill Fish', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Raw Fish', quantity: 2 }], outputName: 'Grilled Fish', xpReward: 10, craftTime: 15 },
      { recipeId: 'cook-herbal-tea', name: 'Brew Herbal Tea', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Wild Herbs', quantity: 2 }], outputName: 'Herbal Tea', xpReward: 10, craftTime: 10 },
      { recipeId: 'cook-vegetable-stew', name: 'Cook Vegetable Stew', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Vegetables', quantity: 3 }], outputName: 'Vegetable Stew', xpReward: 10, craftTime: 15 },
      // Tier 2 — Level 5
      { recipeId: 'cook-bread-loaf', name: 'Bake Bread', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Flour', quantity: 2 }], outputName: 'Bread Loaf', xpReward: 15, craftTime: 20 },
      { recipeId: 'cook-apple-pie', name: 'Bake Apple Pie', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Flour', quantity: 1 }, { itemName: 'Apples', quantity: 3 }], outputName: 'Apple Pie', xpReward: 18, craftTime: 25 },
      { recipeId: 'cook-fish-stew', name: 'Cook Fish Stew', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Raw Fish', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Fish Stew', xpReward: 18, craftTime: 25 },
      { recipeId: 'cook-seasoned-roast-veg', name: 'Roast Seasoned Vegetables', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Vegetables', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 1 }], outputName: 'Seasoned Roast Vegetables', xpReward: 15, craftTime: 20 },
      { recipeId: 'cook-berry-tart', name: 'Bake Berry Tart', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Flour', quantity: 1 }, { itemName: 'Berry Jam', quantity: 1 }], outputName: 'Berry Tart', xpReward: 18, craftTime: 25 },
      // Tier 3 — Level 7
      { recipeId: 'cook-harvest-feast', name: 'Prepare Harvest Feast', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Bread Loaf', quantity: 1 }, { itemName: 'Apples', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 2 }], outputName: 'Harvest Feast', xpReward: 30, craftTime: 45 },
      { recipeId: 'cook-fishermans-banquet', name: "Prepare Fisherman's Banquet", levelRequired: 7, tier: 3, inputs: [{ itemName: 'Grilled Fish', quantity: 1 }, { itemName: 'Bread Loaf', quantity: 1 }, { itemName: 'Berry Jam', quantity: 1 }], outputName: "Fisherman's Banquet", xpReward: 30, craftTime: 45 },
      { recipeId: 'cook-spiced-pastry', name: 'Bake Spiced Pastry', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Flour', quantity: 2 }, { itemName: 'Wild Herbs', quantity: 2 }, { itemName: 'Berry Jam', quantity: 1 }], outputName: 'Spiced Pastry', xpReward: 25, craftTime: 40 },
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
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
