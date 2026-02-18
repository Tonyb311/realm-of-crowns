/**
 * Targeted seed script: TANNER items + recipes + HUNTER resources.
 * Run: DATABASE_URL=... npx tsx seeds/run-tanner.ts
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
    // Step 0: Remove old TANNER recipes from DB
    // ---------------------------------------------------------------
    console.log('--- Removing old TANNER recipes ---');
    // Delete referencing crafting_actions first (FK constraint)
    const tannerRecipes = await prisma.recipe.findMany({
      where: { professionType: 'TANNER' },
      select: { id: true },
    });
    if (tannerRecipes.length > 0) {
      const deletedActions = await prisma.craftingAction.deleteMany({
        where: { recipeId: { in: tannerRecipes.map(r => r.id) } },
      });
      if (deletedActions.count > 0) {
        console.log(`  Removed ${deletedActions.count} crafting actions`);
      }
    }
    const deleted = await prisma.recipe.deleteMany({
      where: { professionType: 'TANNER' },
    });
    console.log(`  Deleted ${deleted.count} old TANNER recipes`);

    // ---------------------------------------------------------------
    // Step 1: Upsert all TANNER-related ItemTemplates
    // ---------------------------------------------------------------
    console.log('\n--- Seeding TANNER ItemTemplates ---');

    const TANNER_ITEMS: Array<{
      id: string;
      name: string;
      type: 'CONSUMABLE' | 'MATERIAL' | 'ARMOR' | 'TOOL';
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
      baseValue?: number;
    }> = [
      // -- Raw resources (HUNTER gathering) --
      {
        id: 'resource-animal_pelts',
        name: 'Animal Pelts',
        type: 'MATERIAL',
        rarity: 'COMMON',
        description: 'Rough animal pelts stripped from hunted game. Essential for leatherworking.',
        stats: {},
        durability: 100,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 8,
      },
      {
        id: 'resource-wolf_pelts',
        name: 'Wolf Pelts',
        type: 'MATERIAL',
        rarity: 'FINE',
        description: 'Thick, durable pelts from wolves. Their natural toughness makes superior leather for armor.',
        stats: {},
        durability: 100,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 28,
      },
      {
        id: 'resource-bear_hides',
        name: 'Bear Hides',
        type: 'MATERIAL',
        rarity: 'FINE',
        description: 'Massive hides from bears. Incredibly dense and durable — the finest material for heavy leather armor.',
        stats: {},
        durability: 100,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 35,
      },

      // -- Intermediate materials (TANNER processing) --
      {
        id: 'material-cured_leather',
        name: 'Cured Leather',
        type: 'MATERIAL',
        rarity: 'COMMON',
        description: 'Animal pelts that have been cleaned, stretched, and treated. The foundation of all leather goods.',
        stats: {},
        durability: 100,
        professionRequired: 'TANNER',
        levelRequired: 3,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 18,
      },
      {
        id: 'material-wolf_leather',
        name: 'Wolf Leather',
        type: 'MATERIAL',
        rarity: 'FINE',
        description: 'Tanned wolf hide. Tougher and more flexible than standard leather.',
        stats: {},
        durability: 100,
        professionRequired: 'TANNER',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 35,
      },
      {
        id: 'material-bear_leather',
        name: 'Bear Leather',
        type: 'MATERIAL',
        rarity: 'FINE',
        description: 'Dense tanned bear hide. Almost as protective as chain mail, but far more flexible.',
        stats: {},
        durability: 100,
        professionRequired: 'TANNER',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 42,
      },

      // -- Apprentice finished goods (L3-4) --
      {
        id: 'crafted-leather-cap',
        name: 'Leather Cap',
        type: 'ARMOR',
        rarity: 'COMMON',
        description: 'A fitted leather cap that protects without restricting vision.',
        stats: { armor: 2, dexBonus: 1, durability: 80, levelToEquip: 3 },
        durability: 80,
        professionRequired: 'TANNER',
        levelRequired: 3,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 30,
      },
      {
        id: 'crafted-leather-vest',
        name: 'Leather Vest',
        type: 'ARMOR',
        rarity: 'COMMON',
        description: 'A sturdy leather vest. Lighter than chain, quieter than plate.',
        stats: { armor: 3, dexBonus: 2, durability: 100, levelToEquip: 4 },
        durability: 100,
        professionRequired: 'TANNER',
        levelRequired: 4,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 45,
      },
      {
        id: 'crafted-leather-belt',
        name: 'Leather Belt',
        type: 'ARMOR',
        rarity: 'COMMON',
        description: 'A reinforced leather belt with an iron buckle. Every adventurer needs one.',
        stats: { armor: 1, dexBonus: 1, durability: 80, levelToEquip: 4 },
        durability: 80,
        professionRequired: 'TANNER',
        levelRequired: 4,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 25,
      },
      {
        id: 'crafted-leather-satchel',
        name: 'Leather Satchel',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'A durable leather satchel for carrying supplies. Expands what you can carry on the road.',
        stats: {},
        durability: 1,
        professionRequired: 'TANNER',
        levelRequired: 3,
        isFood: false,
        foodBuff: { effect: 'buff_dexterity', magnitude: 1, duration: 5 },
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 35,
      },

      // -- Journeyman finished goods (L5-6) --
      {
        id: 'crafted-leather-armor',
        name: 'Leather Armor',
        type: 'ARMOR',
        rarity: 'FINE',
        description: 'Reinforced leather armor with iron studs. The choice of scouts and rangers.',
        stats: { armor: 5, dexBonus: 3, durability: 120, levelToEquip: 5 },
        durability: 120,
        professionRequired: 'TANNER',
        levelRequired: 5,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 65,
      },
      {
        id: 'crafted-leather-bracers',
        name: 'Leather Bracers',
        type: 'ARMOR',
        rarity: 'FINE',
        description: 'Fitted leather bracers that guard the forearms without hindering movement.',
        stats: { armor: 2, dexBonus: 2, durability: 90, levelToEquip: 5 },
        durability: 90,
        professionRequired: 'TANNER',
        levelRequired: 5,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 40,
      },
      {
        id: 'crafted-leather-greaves',
        name: 'Leather Greaves',
        type: 'ARMOR',
        rarity: 'FINE',
        description: 'Leather leg guards that protect the shins while allowing full range of motion.',
        stats: { armor: 3, dexBonus: 2, durability: 100, levelToEquip: 6 },
        durability: 100,
        professionRequired: 'TANNER',
        levelRequired: 6,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 50,
      },
      {
        id: 'crafted-quiver',
        name: 'Quiver',
        type: 'TOOL',
        rarity: 'FINE',
        description: 'A well-crafted leather quiver. Keeps arrows organized and within easy reach.',
        stats: { durability: 35, yieldBonus: 25 },
        durability: 35,
        professionRequired: 'TANNER',
        levelRequired: 6,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 55,
      },

      // -- Craftsman finished goods (L7-8) --
      {
        id: 'crafted-wolf-leather-armor',
        name: 'Wolf Leather Armor',
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'Supple wolf leather armor reinforced with silver clasps. Offers remarkable protection without sacrificing agility.',
        stats: { armor: 8, dexBonus: 4, durability: 150, levelToEquip: 7 },
        durability: 150,
        professionRequired: 'TANNER',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 120,
      },
      {
        id: 'crafted-wolf-leather-hood',
        name: 'Wolf Leather Hood',
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'A hooded cap of wolf leather. Intimidating and practical.',
        stats: { armor: 4, dexBonus: 3, durability: 120, levelToEquip: 7 },
        durability: 120,
        professionRequired: 'TANNER',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 75,
      },
      {
        id: 'crafted-bear-hide-cuirass',
        name: 'Bear Hide Cuirass',
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'A massive cuirass of layered bear hide. Nearly as protective as steel plate, with a fraction of the weight.',
        stats: { armor: 10, dexBonus: 3, conBonus: 2, durability: 180, levelToEquip: 8 },
        durability: 180,
        professionRequired: 'TANNER',
        levelRequired: 8,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 155,
      },
      {
        id: 'crafted-rangers-quiver',
        name: "Ranger's Quiver",
        type: 'TOOL',
        rarity: 'SUPERIOR',
        description: "A masterwork quiver of layered wolf and bear leather with a hardwood frame. A ranger's most prized possession.",
        stats: { durability: 50, yieldBonus: 40 },
        durability: 50,
        professionRequired: 'TANNER',
        levelRequired: 8,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 105,
      },
    ];

    const templateMap = new Map<string, string>();

    for (const item of TANNER_ITEMS) {
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
    const resourceNames = ['Iron Ore Chunks', 'Silver Ore', 'Wood Logs', 'Hardwood'];
    for (const name of resourceNames) {
      if (templateMap.has(name)) continue;
      const tmpl = await prisma.itemTemplate.findFirst({ where: { name } });
      if (tmpl) {
        templateMap.set(name, tmpl.id);
        console.log(`  Found resource: ${name} (${tmpl.id})`);
      } else {
        console.error(`  MISSING resource template: ${name}`);
      }
    }

    // ---------------------------------------------------------------
    // Step 3: Seed all 15 TANNER recipes
    // ---------------------------------------------------------------
    console.log('\n--- Seeding TANNER Recipes ---');

    const RECIPES: Array<{
      recipeId: string;
      name: string;
      levelRequired: number;
      tier: number;
      inputs: { itemName: string; quantity: number }[];
      outputName: string;
      xpReward: number;
      craftTime: number;
    }> = [
      // Processing — Apprentice (L3)
      { recipeId: 'tan-cure-leather', name: 'Cure Leather', levelRequired: 3, tier: 1, inputs: [{ itemName: 'Animal Pelts', quantity: 2 }], outputName: 'Cured Leather', xpReward: 10, craftTime: 20 },
      // Consumable — Apprentice (L3)
      { recipeId: 'tan-leather-satchel', name: 'Craft Leather Satchel', levelRequired: 3, tier: 1, inputs: [{ itemName: 'Cured Leather', quantity: 3 }], outputName: 'Leather Satchel', xpReward: 12, craftTime: 25 },
      // Equipment — Apprentice (L3-4)
      { recipeId: 'tan-leather-cap', name: 'Craft Leather Cap', levelRequired: 3, tier: 1, inputs: [{ itemName: 'Cured Leather', quantity: 2 }], outputName: 'Leather Cap', xpReward: 12, craftTime: 20 },
      { recipeId: 'tan-leather-vest', name: 'Craft Leather Vest', levelRequired: 4, tier: 1, inputs: [{ itemName: 'Cured Leather', quantity: 4 }], outputName: 'Leather Vest', xpReward: 18, craftTime: 30 },
      { recipeId: 'tan-leather-belt', name: 'Craft Leather Belt', levelRequired: 4, tier: 1, inputs: [{ itemName: 'Cured Leather', quantity: 2 }, { itemName: 'Iron Ore Chunks', quantity: 1 }], outputName: 'Leather Belt', xpReward: 14, craftTime: 20 },
      // Equipment — Journeyman (L5-6)
      { recipeId: 'tan-leather-armor', name: 'Craft Leather Armor', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Cured Leather', quantity: 5 }, { itemName: 'Iron Ore Chunks', quantity: 1 }], outputName: 'Leather Armor', xpReward: 25, craftTime: 40 },
      { recipeId: 'tan-leather-bracers', name: 'Craft Leather Bracers', levelRequired: 5, tier: 2, inputs: [{ itemName: 'Cured Leather', quantity: 2 }, { itemName: 'Iron Ore Chunks', quantity: 1 }], outputName: 'Leather Bracers', xpReward: 18, craftTime: 25 },
      { recipeId: 'tan-leather-greaves', name: 'Craft Leather Greaves', levelRequired: 6, tier: 2, inputs: [{ itemName: 'Cured Leather', quantity: 3 }, { itemName: 'Iron Ore Chunks', quantity: 1 }], outputName: 'Leather Greaves', xpReward: 20, craftTime: 30 },
      { recipeId: 'tan-quiver', name: 'Craft Quiver', levelRequired: 6, tier: 2, inputs: [{ itemName: 'Cured Leather', quantity: 3 }, { itemName: 'Wood Logs', quantity: 2 }], outputName: 'Quiver', xpReward: 22, craftTime: 30 },
      // Processing — Craftsman (L7)
      { recipeId: 'tan-wolf-leather', name: 'Tan Wolf Leather', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Wolf Pelts', quantity: 2 }], outputName: 'Wolf Leather', xpReward: 25, craftTime: 35 },
      { recipeId: 'tan-bear-leather', name: 'Tan Bear Leather', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Bear Hides', quantity: 2 }], outputName: 'Bear Leather', xpReward: 28, craftTime: 40 },
      // Equipment — Craftsman (L7-8)
      { recipeId: 'tan-wolf-leather-armor', name: 'Craft Wolf Leather Armor', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Wolf Leather', quantity: 4 }, { itemName: 'Cured Leather', quantity: 2 }, { itemName: 'Silver Ore', quantity: 1 }], outputName: 'Wolf Leather Armor', xpReward: 35, craftTime: 50 },
      { recipeId: 'tan-wolf-leather-hood', name: 'Craft Wolf Leather Hood', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Wolf Leather', quantity: 2 }, { itemName: 'Cured Leather', quantity: 1 }], outputName: 'Wolf Leather Hood', xpReward: 28, craftTime: 30 },
      { recipeId: 'tan-bear-hide-cuirass', name: 'Craft Bear Hide Cuirass', levelRequired: 8, tier: 3, inputs: [{ itemName: 'Bear Leather', quantity: 5 }, { itemName: 'Cured Leather', quantity: 2 }, { itemName: 'Silver Ore', quantity: 2 }], outputName: 'Bear Hide Cuirass', xpReward: 45, craftTime: 60 },
      { recipeId: 'tan-rangers-quiver', name: "Craft Ranger's Quiver", levelRequired: 8, tier: 3, inputs: [{ itemName: 'Wolf Leather', quantity: 2 }, { itemName: 'Bear Leather', quantity: 1 }, { itemName: 'Hardwood', quantity: 1 }], outputName: "Ranger's Quiver", xpReward: 40, craftTime: 45 },
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
          professionType: 'TANNER' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId,
          name: recipe.name,
          professionType: 'TANNER' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
      });

      console.log(`  + ${recipe.name} (TANNER ${tier}, Lvl ${recipe.levelRequired})`);
    }

    console.log(`\nTANNER seed complete: ${TANNER_ITEMS.length} items, ${RECIPES.length} recipes`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
