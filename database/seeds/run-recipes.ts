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
        description: 'A lavish spread of bread, baked apples, and herb-roasted delicacies. Fit for a harvest celebration.',
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

    console.log(`\n✅ COOK seed complete: ${COOK_ITEMS.length} items, ${RECIPES.length} recipes`);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
