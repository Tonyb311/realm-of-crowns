/**
 * Targeted seed script: TAILOR items + recipes + RANCHER Craftsman resources.
 * Run: DATABASE_URL=... npx tsx seeds/run-tailor.ts
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
    // Step 0: Remove old TAILOR recipes from DB
    // ---------------------------------------------------------------
    console.log('--- Removing old TAILOR recipes ---');
    // Delete referencing crafting_actions first (FK constraint)
    const tailorRecipes = await prisma.recipe.findMany({
      where: { professionType: 'TAILOR' },
      select: { id: true },
    });
    if (tailorRecipes.length > 0) {
      const deletedActions = await prisma.craftingAction.deleteMany({
        where: { recipeId: { in: tailorRecipes.map(r => r.id) } },
      });
      if (deletedActions.count > 0) {
        console.log(`  Removed ${deletedActions.count} crafting actions`);
      }
    }
    const deleted = await prisma.recipe.deleteMany({
      where: { professionType: 'TAILOR' },
    });
    console.log(`  Deleted ${deleted.count} old TAILOR recipes`);

    // ---------------------------------------------------------------
    // Step 1: Upsert all TAILOR-related ItemTemplates
    // ---------------------------------------------------------------
    console.log('\n--- Seeding TAILOR ItemTemplates ---');

    const TAILOR_ITEMS: Array<{
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
      // -- RANCHER Craftsman resources --
      {
        id: 'resource-fine_wool',
        name: 'Fine Wool',
        type: 'MATERIAL',
        rarity: 'COMMON',
        description: 'Exceptionally soft, high-grade wool from carefully bred sheep. Prized by tailors for fine garments.',
        stats: {},
        durability: 100,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 30,
      },
      {
        id: 'resource-silkworm_cocoons',
        name: 'Silkworm Cocoons',
        type: 'MATERIAL',
        rarity: 'COMMON',
        description: 'Delicate cocoons spun by silkworms raised alongside livestock. The raw material for silk fabric.',
        stats: {},
        durability: 100,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 38,
      },

      // -- Legacy intermediate (ARMORER chain) --
      {
        id: 'material-cloth_padding',
        name: 'Cloth Padding',
        type: 'MATERIAL',
        rarity: 'COMMON',
        description: 'Layered cloth padding used as armor lining by armorers. Essential for plate armor construction.',
        stats: {},
        durability: 100,
        professionRequired: 'TAILOR',
        levelRequired: 3,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 15,
      },

      // -- Intermediate materials (TAILOR processing) --
      {
        id: 'material-woven_cloth',
        name: 'Woven Cloth',
        type: 'MATERIAL',
        rarity: 'COMMON',
        description: 'Wool woven into sturdy cloth. The foundation of all tailored garments.',
        stats: {},
        durability: 100,
        professionRequired: 'TAILOR',
        levelRequired: 3,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 20,
      },
      {
        id: 'material-fine_cloth',
        name: 'Fine Cloth',
        type: 'MATERIAL',
        rarity: 'FINE',
        description: 'Delicate cloth woven from fine wool. Soft, lightweight, and perfect for enchanted garments.',
        stats: {},
        durability: 100,
        professionRequired: 'TAILOR',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 38,
      },
      {
        id: 'material-silk_fabric',
        name: 'Silk Fabric',
        type: 'MATERIAL',
        rarity: 'FINE',
        description: 'Luxurious silk processed from silkworm cocoons. The finest textile in Aethermere.',
        stats: {},
        durability: 100,
        professionRequired: 'TAILOR',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 45,
      },

      // -- Apprentice finished goods (L3-4) --
      {
        id: 'crafted-cloth-hood',
        name: 'Cloth Hood',
        type: 'ARMOR',
        rarity: 'COMMON',
        description: 'A simple hood of woven cloth. Offers modest protection and channels magical energy.',
        stats: { armor: 1, magicResist: 3, wisdomBonus: 1, durability: 30, levelToEquip: 3 },
        durability: 30,
        professionRequired: 'TAILOR',
        levelRequired: 3,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 25,
      },
      {
        id: 'crafted-cloth-sash',
        name: 'Cloth Sash',
        type: 'ARMOR',
        rarity: 'COMMON',
        description: 'A cloth sash reinforced with leather. Worn at the hip to carry spell components.',
        stats: { armor: 1, magicResist: 2, intelligenceBonus: 1, durability: 25, levelToEquip: 3 },
        durability: 25,
        professionRequired: 'TAILOR',
        levelRequired: 3,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 20,
      },
      {
        id: 'crafted-cloth-robe',
        name: 'Cloth Robe',
        type: 'ARMOR',
        rarity: 'COMMON',
        description: 'A full-length robe of woven cloth. The everyday garment of scholars and apprentice mages.',
        stats: { armor: 2, magicResist: 5, intelligenceBonus: 1, wisdomBonus: 1, durability: 35, levelToEquip: 4 },
        durability: 35,
        professionRequired: 'TAILOR',
        levelRequired: 4,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 45,
      },
      {
        id: 'crafted-wool-trousers',
        name: 'Wool Trousers',
        type: 'ARMOR',
        rarity: 'COMMON',
        description: 'Sturdy wool trousers. Warm, comfortable, and subtly warded against magical harm.',
        stats: { armor: 1, magicResist: 3, charismaBonus: 1, durability: 30, levelToEquip: 4 },
        durability: 30,
        professionRequired: 'TAILOR',
        levelRequired: 4,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 30,
      },

      // -- Journeyman finished goods (L5-6) --
      {
        id: 'crafted-scholars-robe',
        name: "Scholar's Robe",
        type: 'ARMOR',
        rarity: 'FINE',
        description: 'A finely tailored robe favored by academics and court mages. Woven with protective enchantments.',
        stats: { armor: 3, magicResist: 8, intelligenceBonus: 2, wisdomBonus: 1, durability: 45, levelToEquip: 5 },
        durability: 45,
        professionRequired: 'TAILOR',
        levelRequired: 5,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 70,
      },
      {
        id: 'crafted-travelers-cloak',
        name: "Traveler's Cloak",
        type: 'ARMOR',
        rarity: 'FINE',
        description: "A durable cloak for the open road. Leather-reinforced shoulders shed rain and resist blade's edge.",
        stats: { armor: 4, magicResist: 5, charismaBonus: 1, durability: 45, levelToEquip: 5 },
        durability: 45,
        professionRequired: 'TAILOR',
        levelRequired: 5,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 55,
      },
      {
        id: 'crafted-merchants-hat',
        name: "Merchant's Hat",
        type: 'ARMOR',
        rarity: 'FINE',
        description: 'A wide-brimmed hat with a leather band. Popular among traders for its distinguished appearance.',
        stats: { armor: 1, magicResist: 5, charismaBonus: 2, durability: 35, levelToEquip: 6 },
        durability: 35,
        professionRequired: 'TAILOR',
        levelRequired: 6,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 45,
      },
      {
        id: 'crafted-herbalists-apron',
        name: "Herbalist's Apron",
        type: 'ARMOR',
        rarity: 'FINE',
        description: 'A reinforced apron designed for herbalists. Protects against thorns, splashes, and minor magical mishaps.',
        stats: { armor: 2, magicResist: 4, wisdomBonus: 2, durability: 40, levelToEquip: 6 },
        durability: 40,
        professionRequired: 'TAILOR',
        levelRequired: 6,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 50,
      },

      // -- Craftsman finished goods (L7-8) --
      {
        id: 'crafted-archmages-robe',
        name: "Archmage's Robe",
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'A magnificent robe of fine cloth and silk, trimmed with wolf leather. Radiates arcane authority.',
        stats: { armor: 4, magicResist: 14, intelligenceBonus: 3, wisdomBonus: 2, durability: 60, levelToEquip: 7 },
        durability: 60,
        professionRequired: 'TAILOR',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 150,
      },
      {
        id: 'crafted-diplomats-regalia',
        name: "Diplomat's Regalia",
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'Opulent garments of silk and fine cloth with silver clasps. Commands respect in any court.',
        stats: { armor: 3, magicResist: 12, charismaBonus: 3, intelligenceBonus: 2, durability: 55, levelToEquip: 7 },
        durability: 55,
        professionRequired: 'TAILOR',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 140,
      },
      {
        id: 'crafted-silk-hood-of-insight',
        name: 'Silk Hood of Insight',
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'A silken hood that sharpens the mind and wards against psychic intrusion.',
        stats: { armor: 2, magicResist: 10, wisdomBonus: 3, intelligenceBonus: 1, durability: 50, levelToEquip: 7 },
        durability: 50,
        professionRequired: 'TAILOR',
        levelRequired: 7,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 90,
      },
      {
        id: 'crafted-nobles-leggings',
        name: "Noble's Leggings",
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'Elegant leggings of fine cloth reinforced with wolf leather. Fit for nobility.',
        stats: { armor: 4, magicResist: 8, charismaBonus: 2, wisdomBonus: 1, durability: 50, levelToEquip: 8 },
        durability: 50,
        professionRequired: 'TAILOR',
        levelRequired: 8,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 95,
      },
      {
        id: 'crafted-enchanted-cloak',
        name: 'Enchanted Cloak',
        type: 'ARMOR',
        rarity: 'SUPERIOR',
        description: 'A cloak of silk, fine cloth, and bear leather infused with glowcap essence. Shimmers with protective magic.',
        stats: { armor: 5, magicResist: 16, intelligenceBonus: 2, wisdomBonus: 2, charismaBonus: 2, durability: 65, levelToEquip: 8 },
        durability: 65,
        professionRequired: 'TAILOR',
        levelRequired: 8,
        isFood: false,
        foodBuff: null,
        isPerishable: false,
        shelfLifeDays: null,
        isBeverage: false,
        baseValue: 180,
      },
    ];

    const templateMap = new Map<string, string>();

    for (const item of TAILOR_ITEMS) {
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
    const resourceNames = [
      'Cotton', 'Cloth', 'Cloth Padding',         // Legacy processing chain
      'Wool',                                       // RANCHER T1
      'Cured Leather', 'Wolf Leather', 'Bear Leather',  // TANNER outputs
      'Silver Ore', 'Glowcap Mushrooms',            // Craftsman recipe inputs
    ];
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
    // Step 3: Seed all 18 TAILOR recipes
    // ---------------------------------------------------------------
    console.log('\n--- Seeding TAILOR Recipes ---');

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
      // Legacy processing (kept for ARMORER chain)
      { recipeId: 'spin-cloth', name: 'Spin Cloth', levelRequired: 1, tier: 1, inputs: [{ itemName: 'Cotton', quantity: 3 }], outputName: 'Cloth', xpReward: 10, craftTime: 20 },
      { recipeId: 'make-cloth-padding', name: 'Make Cloth Padding', levelRequired: 3, tier: 1, inputs: [{ itemName: 'Cloth', quantity: 2 }], outputName: 'Cloth Padding', xpReward: 8, craftTime: 15 },
      // New processing — Apprentice (L3)
      { recipeId: 'tai-weave-cloth', name: 'Weave Cloth', levelRequired: 3, tier: 1, inputs: [{ itemName: 'Wool', quantity: 3 }], outputName: 'Woven Cloth', xpReward: 12, craftTime: 20 },
      // New processing — Craftsman (L7)
      { recipeId: 'tai-weave-fine-cloth', name: 'Weave Fine Cloth', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Fine Wool', quantity: 3 }], outputName: 'Fine Cloth', xpReward: 25, craftTime: 35 },
      { recipeId: 'tai-process-silk', name: 'Process Silk', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Silkworm Cocoons', quantity: 3 }], outputName: 'Silk Fabric', xpReward: 28, craftTime: 40 },
      // Apprentice armor (L3-4)
      { recipeId: 'tai-cloth-hood', name: 'Sew Cloth Hood', levelRequired: 3, tier: 1, inputs: [{ itemName: 'Woven Cloth', quantity: 2 }], outputName: 'Cloth Hood', xpReward: 8, craftTime: 10 },
      { recipeId: 'tai-cloth-sash', name: 'Sew Cloth Sash', levelRequired: 3, tier: 1, inputs: [{ itemName: 'Woven Cloth', quantity: 1 }, { itemName: 'Cured Leather', quantity: 1 }], outputName: 'Cloth Sash', xpReward: 7, craftTime: 8 },
      { recipeId: 'tai-cloth-robe', name: 'Sew Cloth Robe', levelRequired: 4, tier: 1, inputs: [{ itemName: 'Woven Cloth', quantity: 4 }, { itemName: 'Cured Leather', quantity: 1 }], outputName: 'Cloth Robe', xpReward: 12, craftTime: 20 },
      { recipeId: 'tai-wool-trousers', name: 'Sew Wool Trousers', levelRequired: 4, tier: 1, inputs: [{ itemName: 'Woven Cloth', quantity: 3 }], outputName: 'Wool Trousers', xpReward: 10, craftTime: 15 },
      // Journeyman armor (L5-6)
      { recipeId: 'tai-scholars-robe', name: "Sew Scholar's Robe", levelRequired: 5, tier: 2, inputs: [{ itemName: 'Woven Cloth', quantity: 5 }, { itemName: 'Cured Leather', quantity: 2 }], outputName: "Scholar's Robe", xpReward: 18, craftTime: 30 },
      { recipeId: 'tai-travelers-cloak', name: "Sew Traveler's Cloak", levelRequired: 5, tier: 2, inputs: [{ itemName: 'Woven Cloth', quantity: 3 }, { itemName: 'Cured Leather', quantity: 2 }], outputName: "Traveler's Cloak", xpReward: 15, craftTime: 25 },
      { recipeId: 'tai-merchants-hat', name: "Sew Merchant's Hat", levelRequired: 6, tier: 2, inputs: [{ itemName: 'Woven Cloth', quantity: 2 }, { itemName: 'Cured Leather', quantity: 1 }], outputName: "Merchant's Hat", xpReward: 12, craftTime: 15 },
      { recipeId: 'tai-herbalists-apron', name: "Sew Herbalist's Apron", levelRequired: 6, tier: 2, inputs: [{ itemName: 'Woven Cloth', quantity: 3 }, { itemName: 'Cured Leather', quantity: 2 }], outputName: "Herbalist's Apron", xpReward: 14, craftTime: 25 },
      // Craftsman armor (L7-8)
      { recipeId: 'tai-archmages-robe', name: "Sew Archmage's Robe", levelRequired: 7, tier: 3, inputs: [{ itemName: 'Fine Cloth', quantity: 4 }, { itemName: 'Silk Fabric', quantity: 2 }, { itemName: 'Wolf Leather', quantity: 1 }], outputName: "Archmage's Robe", xpReward: 35, craftTime: 50 },
      { recipeId: 'tai-diplomats-regalia', name: "Sew Diplomat's Regalia", levelRequired: 7, tier: 3, inputs: [{ itemName: 'Silk Fabric', quantity: 3 }, { itemName: 'Fine Cloth', quantity: 2 }, { itemName: 'Silver Ore', quantity: 1 }], outputName: "Diplomat's Regalia", xpReward: 35, craftTime: 50 },
      { recipeId: 'tai-silk-hood-insight', name: 'Sew Silk Hood of Insight', levelRequired: 7, tier: 3, inputs: [{ itemName: 'Silk Fabric', quantity: 2 }, { itemName: 'Fine Cloth', quantity: 1 }], outputName: 'Silk Hood of Insight', xpReward: 25, craftTime: 35 },
      { recipeId: 'tai-nobles-leggings', name: "Sew Noble's Leggings", levelRequired: 8, tier: 3, inputs: [{ itemName: 'Fine Cloth', quantity: 3 }, { itemName: 'Wolf Leather', quantity: 2 }], outputName: "Noble's Leggings", xpReward: 30, craftTime: 40 },
      { recipeId: 'tai-enchanted-cloak', name: 'Sew Enchanted Cloak', levelRequired: 8, tier: 3, inputs: [{ itemName: 'Silk Fabric', quantity: 3 }, { itemName: 'Fine Cloth', quantity: 3 }, { itemName: 'Bear Leather', quantity: 2 }, { itemName: 'Glowcap Mushrooms', quantity: 1 }], outputName: 'Enchanted Cloak', xpReward: 40, craftTime: 60 },
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
          professionType: 'TAILOR' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId,
          name: recipe.name,
          professionType: 'TAILOR' as ProfessionType,
          tier,
          ingredients,
          result: resultId,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
        },
      });

      console.log(`  + ${recipe.name} (TAILOR ${tier}, Lvl ${recipe.levelRequired})`);
    }

    console.log(`\nTAILOR seed complete: ${TAILOR_ITEMS.length} items, ${RECIPES.length} recipes`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
