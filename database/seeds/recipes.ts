/**
 * Recipe & Item Template Seed Data for Realm of Crowns
 *
 * Seeds: Item Templates (materials, weapons, armor, consumables) and Recipes.
 * Recipe ingredients reference item templates by name, resolved at seed time.
 *
 * Includes all 26 processing recipes (smelter, tanner, tailor, mason, woodworker)
 * plus existing crafting recipes (blacksmith, armorer, leatherworker, alchemist, cook, brewer).
 */

import { PrismaClient, ItemType, ItemRarity, ProfessionType, ProfessionTier, Prisma } from '@prisma/client';
import { ALL_PROCESSING_RECIPES } from '@shared/data/recipes';
import { COOK_RECIPES } from '@shared/data/recipes/cook';

// ============================================================
// ITEM TEMPLATE DEFINITIONS
// ============================================================

interface ItemTemplateDef {
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  stats: Record<string, number>;
  durability: number;
  professionRequired: ProfessionType | null;
  levelRequired: number;
  isFood?: boolean;
  foodBuff?: Prisma.InputJsonValue;
  isPerishable?: boolean;
  shelfLifeDays?: number;
  isBeverage?: boolean;
}

const ITEM_TEMPLATES: ItemTemplateDef[] = [
  // --- Processed Materials: Smelter ---
  {
    name: 'Copper Ingot',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A refined bar of copper. Soft but workable, used in basic smithing and wiring.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 1,
  },
  {
    name: 'Iron Ingot',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A refined bar of iron, ready for smithing.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 10,
  },
  {
    name: 'Steel Ingot',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'A hardened alloy of iron and carbon. Stronger and lighter than pure iron.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 30,
  },
  {
    name: 'Silver Ingot',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'A gleaming bar of refined silver. Prized by jewelers and effective against the undead.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 20,
  },
  {
    name: 'Gold Ingot',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'A heavy bar of pure gold. Used in jewelry, enchanting, and as currency.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 25,
  },
  {
    name: 'Mithril Ingot',
    type: 'MATERIAL',
    rarity: 'MASTERWORK',
    description: 'A bar of legendary mithril. Lighter than silk, harder than steel.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 55,
  },
  {
    name: 'Adamantine Ingot',
    type: 'MATERIAL',
    rarity: 'LEGENDARY',
    description: 'The hardest metal known to exist, forged from the depths. Nearly indestructible.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 75,
  },
  {
    name: 'Glass',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Clear glass panes smelted from silite sand. Used in windows, alchemy, and jewelry.',
    stats: {},
    durability: 50,
    professionRequired: 'SMELTER',
    levelRequired: 15,
  },
  {
    name: 'Nails',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Iron nails essential for construction and woodworking. Sold by the bundle.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 5,
  },

  // --- Processed Materials: Tanner ---
  {
    name: 'Soft Leather',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Supple tanned leather, ideal for light armor and clothing.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 1,
  },
  {
    name: 'Hard Leather',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Stiff, salt-cured leather. Offers more protection than soft leather.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 15,
  },
  {
    name: 'Fur Leather',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Tanned fur pelts with the hair intact. Warm and rugged.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 10,
  },
  {
    name: 'Exotic Leather',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'Rare leather from exotic beasts, treated with herbal preservatives.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 50,
  },
  {
    name: 'Dragonscale Leather',
    type: 'MATERIAL',
    rarity: 'LEGENDARY',
    description: 'Dragon hide treated with arcane reagents. Nearly fireproof and incredibly tough.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 80,
  },

  // --- Processed Materials: Tailor ---
  {
    name: 'Cloth',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Simple cotton cloth, the foundation of everyday garments.',
    stats: {},
    durability: 80,
    professionRequired: 'TAILOR',
    levelRequired: 1,
  },
  {
    name: 'Linen',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A bolt of woven linen fabric. Light, breathable, and favored by Elven tailors.',
    stats: {},
    durability: 80,
    professionRequired: 'TAILOR',
    levelRequired: 5,
  },
  {
    name: 'Woven Wool',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Thick woven wool fabric. Warm and durable, perfect for cold climates.',
    stats: {},
    durability: 90,
    professionRequired: 'TAILOR',
    levelRequired: 10,
  },
  {
    name: 'Silk Cloth',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'Luxurious silk fabric woven from rare silk thread. Light as air, strong as mail.',
    stats: {},
    durability: 70,
    professionRequired: 'TAILOR',
    levelRequired: 40,
  },

  // --- Processed Materials: Mason ---
  {
    name: 'Cut Stone',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Precisely cut stone blocks, ready for construction.',
    stats: {},
    durability: 100,
    professionRequired: 'MASON',
    levelRequired: 1,
  },
  {
    name: 'Bricks',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Fired clay bricks, strong and uniform. The builder\'s best friend.',
    stats: {},
    durability: 100,
    professionRequired: 'MASON',
    levelRequired: 10,
  },
  {
    name: 'Polished Marble',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Marble polished to a mirror shine. Used in temples, palaces, and sculptures.',
    stats: {},
    durability: 100,
    professionRequired: 'MASON',
    levelRequired: 30,
  },
  {
    name: 'Cut Sandstone',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Shaped sandstone blocks, popular in desert and coastal architecture.',
    stats: {},
    durability: 100,
    professionRequired: 'MASON',
    levelRequired: 5,
  },

  // --- Processed Materials: Woodworker ---
  {
    name: 'Softwood Planks',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Milled softwood planks, light and easy to work. Used in basic construction.',
    stats: {},
    durability: 80,
    professionRequired: 'WOODWORKER',
    levelRequired: 1,
  },
  {
    name: 'Hardwood Planks',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Dense hardwood planks. Strong, durable, and suitable for furniture and weapons.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 10,
  },
  {
    name: 'Beams',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Heavy structural beams shaped from hardwood. Essential for large buildings.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
  },
  {
    name: 'Exotic Planks',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'Rare planks milled from exotic timber. Beautiful grain and exceptional strength.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 40,
  },

  // --- COOK Food Products ---
  {
    name: 'Berry Jam',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'Sweet jam made from wild berries. Spread it on bread or eat it straight from the jar.',
    stats: { healAmount: 10, staminaRestore: 15 },
    durability: 1,
    professionRequired: 'COOK',
    levelRequired: 1,
    isFood: true,
    foodBuff: { effect: 'sustenance', magnitude: 10, duration: 0 },
    isPerishable: true,
    shelfLifeDays: 14,
  },
  {
    name: 'Herbal Tea',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'A soothing brew of wild herbs. Warms the body and eases aches.',
    stats: { healAmount: 5, staminaRestore: 10 },
    durability: 1,
    professionRequired: 'COOK',
    levelRequired: 1,
    isFood: true,
    isBeverage: true,
    foodBuff: { effect: 'hp_regen', magnitude: 5, duration: 30 },
    isPerishable: true,
    shelfLifeDays: 3,
  },
  {
    name: 'Apple Pie',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'A golden-crusted pie filled with spiced apple slices. Beloved across all of Aethermere.',
    stats: { healAmount: 30 },
    durability: 1,
    professionRequired: 'COOK',
    levelRequired: 11,
    isFood: true,
    foodBuff: { effect: 'heal_hp', magnitude: 30, duration: 0 },
    isPerishable: true,
    shelfLifeDays: 7,
  },
  {
    name: 'Berry Tart',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'A flaky pastry filled with sweetened wild berries. A traveler\'s favorite.',
    stats: { healAmount: 25, staminaRestore: 15 },
    durability: 1,
    professionRequired: 'COOK',
    levelRequired: 11,
    isFood: true,
    foodBuff: { effect: 'heal_hp', magnitude: 25, duration: 0 },
    isPerishable: true,
    shelfLifeDays: 7,
  },
  {
    name: 'Vegetable Soup',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'A hearty soup of herbs and garden vegetables. Warms the soul and strengthens the body.',
    stats: { healAmount: 20, staminaRestore: 20 },
    durability: 1,
    professionRequired: 'COOK',
    levelRequired: 11,
    isFood: true,
    foodBuff: { effect: 'buff_constitution', magnitude: 2, duration: 60 },
    isPerishable: true,
    shelfLifeDays: 3,
  },
  {
    name: 'Hearty Feast',
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'A lavish spread of apple sauce, berry compote, and herb-roasted vegetables. Fit for a harvest celebration.',
    stats: { healAmount: 50, staminaRestore: 30 },
    durability: 1,
    professionRequired: 'COOK',
    levelRequired: 26,
    isFood: true,
    foodBuff: { effect: 'buff_all_stats', magnitude: 1, duration: 60 },
    isPerishable: true,
    shelfLifeDays: 3,
  },

  // --- Weapons ---
  {
    name: 'Iron Sword',
    type: 'WEAPON',
    rarity: 'COMMON',
    description: 'A sturdy sword forged from iron. Reliable in battle.',
    stats: { attack: 12, speed: 8 },
    durability: 150,
    professionRequired: 'BLACKSMITH',
    levelRequired: 1,
  },
  {
    name: 'Wooden Bow',
    type: 'WEAPON',
    rarity: 'COMMON',
    description: 'A simple bow carved from hardwood. Good for hunting and combat.',
    stats: { attack: 10, range: 15, speed: 10 },
    durability: 120,
    professionRequired: 'WOODWORKER',
    levelRequired: 1,
  },
  {
    name: 'Oak Staff',
    type: 'WEAPON',
    rarity: 'COMMON',
    description: 'A solid oak staff, favored by travelers and mages alike.',
    stats: { attack: 8, magicPower: 5, speed: 7 },
    durability: 130,
    professionRequired: 'WOODWORKER',
    levelRequired: 1,
  },

  // --- Armor ---
  {
    name: 'Iron Shield',
    type: 'ARMOR',
    rarity: 'COMMON',
    description: 'A round shield of hammered iron. Blocks incoming blows.',
    stats: { defense: 10, blockChance: 15 },
    durability: 180,
    professionRequired: 'BLACKSMITH',
    levelRequired: 1,
  },
  {
    name: 'Iron Chainmail',
    type: 'ARMOR',
    rarity: 'FINE',
    description: 'Interlocking iron rings provide solid protection.',
    stats: { defense: 18, speed: -3 },
    durability: 200,
    professionRequired: 'ARMORER',
    levelRequired: 1,
  },
  {
    name: 'Leather Armor',
    type: 'ARMOR',
    rarity: 'COMMON',
    description: 'Light armor crafted from cured leather. Flexible and quiet.',
    stats: { defense: 8, stealth: 5, speed: 2 },
    durability: 140,
    professionRequired: 'LEATHERWORKER',
    levelRequired: 1,
  },

  // --- Consumables ---
  {
    name: 'Healing Potion',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'A ruby-red potion that restores health when consumed.',
    stats: { healAmount: 50 },
    durability: 1,
    professionRequired: 'ALCHEMIST',
    levelRequired: 1,
  },
  {
    name: 'Bread',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'A fresh loaf of bread. Filling and nourishing.',
    stats: { healAmount: 15, staminaRestore: 10 },
    durability: 1,
    professionRequired: 'COOK',
    levelRequired: 1,
  },
  {
    name: 'Ale',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'A hearty mug of ale. Boosts morale.',
    stats: { staminaRestore: 20, moraleBoost: 5 },
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 1,
  },
];

// ============================================================
// RESOURCE ITEM TEMPLATES (raw materials from gathering)
// These are items that exist as crafting inputs but come from
// gathering, not crafting. We create templates so recipes can
// reference them.
// ============================================================

interface ResourceItemDef {
  name: string;
  type: ItemType;
  description: string;
}

const RESOURCE_ITEMS: ResourceItemDef[] = [
  // Ores & minerals
  { name: 'Copper Ore', type: 'MATERIAL', description: 'Common copper ore found in hillside deposits.' },
  { name: 'Iron Ore', type: 'MATERIAL', description: 'Raw iron ore mined from the earth.' },
  { name: 'Coal', type: 'MATERIAL', description: 'Black coal used as fuel for smelting and forging.' },
  { name: 'Silver Ore', type: 'MATERIAL', description: 'Gleaming silver ore from deep rock veins.' },
  { name: 'Gold Ore', type: 'MATERIAL', description: 'Precious gold ore mined from mountain caves.' },
  { name: 'Mithril Ore', type: 'MATERIAL', description: 'Legendary silvery-blue ore from the deepest mines.' },
  { name: 'Adamantine Ore', type: 'MATERIAL', description: 'The hardest metal ore, found only in extreme depths.' },
  { name: 'Silite Sand', type: 'MATERIAL', description: 'Fine crystalline sand used in glassmaking.' },
  // Stone
  { name: 'Raw Stone', type: 'MATERIAL', description: 'Rough-hewn stone blocks quarried from mountainsides.' },
  { name: 'Sandstone', type: 'MATERIAL', description: 'Warm-colored sandstone from arid regions.' },
  { name: 'Marble', type: 'MATERIAL', description: 'Polished white marble veined with color.' },
  // Wood
  { name: 'Softwood', type: 'MATERIAL', description: 'Common softwood lumber from pine and fir trees.' },
  { name: 'Hardwood', type: 'MATERIAL', description: 'Dense hardwood from ancient oaks and elms.' },
  { name: 'Exotic Wood', type: 'MATERIAL', description: 'Rare timber from ancient or magical trees.' },
  { name: 'Bark', type: 'MATERIAL', description: 'Stripped bark used in tanning and potion-making.' },
  // Animal products
  { name: 'Raw Leather', type: 'MATERIAL', description: 'Untanned hides from common game.' },
  { name: 'Pelts', type: 'MATERIAL', description: 'Fur-bearing animal pelts from wolves, foxes, and bears.' },
  { name: 'Exotic Hide', type: 'MATERIAL', description: 'Tough hide from exotic and dangerous beasts.' },
  { name: 'Dragon Hide', type: 'MATERIAL', description: 'Scaled hide stripped from a slain dragon. Nearly indestructible.' },
  // Fibers
  { name: 'Cotton', type: 'MATERIAL', description: 'Raw cotton fibers, ready for spinning.' },
  { name: 'Flax', type: 'MATERIAL', description: 'Flax stalks processed into linen thread.' },
  { name: 'Wool', type: 'MATERIAL', description: 'Sheared sheep wool, the warmest natural fiber.' },
  { name: 'Silk Thread', type: 'MATERIAL', description: 'Delicate silk thread harvested from giant silkworms. Rare and valuable.' },
  // Other inputs
  { name: 'Salt', type: 'MATERIAL', description: 'Sea salt harvested from tidal pools. Essential for preservation.' },
  { name: 'Rare Herbs', type: 'MATERIAL', description: 'Elusive plants that grow only in specific conditions.' },
  { name: 'Arcane Reagents', type: 'MATERIAL', description: 'Volatile magical substances harvested from places of power.' },
  // Town gathering spot items
  { name: 'Apples', type: 'MATERIAL', description: 'Crisp apples picked from the royal orchards.' },
  { name: 'Raw Fish', type: 'MATERIAL', description: 'Fresh fish caught from nearby waters.' },
  { name: 'Wild Berries', type: 'MATERIAL', description: 'A handful of wild berries foraged from the bushes.' },
  { name: 'Wild Herbs', type: 'MATERIAL', description: 'Fragrant herbs gathered from the wild.' },
  { name: 'Iron Ore Chunks', type: 'MATERIAL', description: 'Rough chunks of iron ore from the mines.' },
  { name: 'Wood Logs', type: 'MATERIAL', description: 'Freshly felled timber logs.' },
  { name: 'Stone Blocks', type: 'MATERIAL', description: 'Rough-hewn stone blocks from the quarry.' },
  { name: 'Clay', type: 'MATERIAL', description: 'Wet clay dug from river banks.' },
  // Legacy references (used by non-processing recipes)
  { name: 'Herbs', type: 'MATERIAL', description: 'A bundle of gathered herbs with medicinal properties.' },
  { name: 'Grain', type: 'MATERIAL', description: 'Harvested grain, a staple crop.' },
  { name: 'Fiber', type: 'MATERIAL', description: 'Plant fibers used for stringing bows and binding.' },
  { name: 'Lumber', type: 'MATERIAL', description: 'Cut and dried timber, ready for use.' },
  { name: 'Hide', type: 'MATERIAL', description: 'An animal hide, not yet tanned.' },
  { name: 'Arcane Reagent', type: 'MATERIAL', description: 'A shimmering reagent infused with magical energy.' },
];

// ============================================================
// NON-PROCESSING RECIPE DEFINITIONS (crafting professions)
// ============================================================

interface RecipeDef {
  name: string;
  professionType: ProfessionType;
  tier: ProfessionTier;
  ingredients: Array<{ itemName: string; quantity: number }>;
  resultName: string;
  craftTime: number;
  xpReward: number;
}

const CRAFTING_RECIPES: RecipeDef[] = [
  {
    name: 'Forge Iron Sword',
    professionType: 'BLACKSMITH',
    tier: 'JOURNEYMAN',
    ingredients: [
      { itemName: 'Iron Ingot', quantity: 3 },
      { itemName: 'Soft Leather', quantity: 1 },
      { itemName: 'Hardwood Planks', quantity: 1 },
    ],
    resultName: 'Iron Sword',
    craftTime: 60,
    xpReward: 30,
  },
  {
    name: 'Forge Iron Shield',
    professionType: 'BLACKSMITH',
    tier: 'APPRENTICE',
    ingredients: [
      { itemName: 'Iron Ingot', quantity: 2 },
      { itemName: 'Hardwood Planks', quantity: 1 },
    ],
    resultName: 'Iron Shield',
    craftTime: 45,
    xpReward: 20,
  },
  {
    name: 'Craft Chainmail',
    professionType: 'ARMORER',
    tier: 'JOURNEYMAN',
    ingredients: [
      { itemName: 'Iron Ingot', quantity: 5 },
      { itemName: 'Soft Leather', quantity: 1 },
    ],
    resultName: 'Iron Chainmail',
    craftTime: 90,
    xpReward: 40,
  },
  {
    name: 'Craft Leather Armor',
    professionType: 'LEATHERWORKER',
    tier: 'APPRENTICE',
    ingredients: [
      { itemName: 'Soft Leather', quantity: 4 },
      { itemName: 'Linen', quantity: 1 },
    ],
    resultName: 'Leather Armor',
    craftTime: 60,
    xpReward: 25,
  },
  {
    name: 'Brew Healing Potion',
    professionType: 'ALCHEMIST',
    tier: 'APPRENTICE',
    ingredients: [
      { itemName: 'Herbs', quantity: 3 },
      { itemName: 'Arcane Reagent', quantity: 1 },
    ],
    resultName: 'Healing Potion',
    craftTime: 45,
    xpReward: 20,
  },
  {
    name: 'Bake Bread',
    professionType: 'COOK',
    tier: 'APPRENTICE',
    ingredients: [{ itemName: 'Grain', quantity: 2 }],
    resultName: 'Bread',
    craftTime: 15,
    xpReward: 8,
  },
  {
    name: 'Brew Ale',
    professionType: 'BREWER',
    tier: 'APPRENTICE',
    ingredients: [
      { itemName: 'Grain', quantity: 2 },
      { itemName: 'Herbs', quantity: 1 },
    ],
    resultName: 'Ale',
    craftTime: 30,
    xpReward: 15,
  },
  {
    name: 'Craft Wooden Bow',
    professionType: 'WOODWORKER',
    tier: 'APPRENTICE',
    ingredients: [
      { itemName: 'Hardwood Planks', quantity: 2 },
      { itemName: 'Fiber', quantity: 1 },
    ],
    resultName: 'Wooden Bow',
    craftTime: 40,
    xpReward: 18,
  },
];

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
// SEED FUNCTION
// ============================================================

export async function seedRecipes(prisma: PrismaClient) {
  console.log('--- Seeding Item Templates ---');

  const templateMap = new Map<string, string>(); // name -> id

  // Seed resource item templates (raw materials)
  for (const res of RESOURCE_ITEMS) {
    const stableId = `resource-${res.name.toLowerCase().replace(/\s+/g, '-')}`;
    const created = await prisma.itemTemplate.upsert({
      where: { id: stableId },
      update: {
        name: res.name,
        type: res.type,
        description: res.description,
      },
      create: {
        id: stableId,
        name: res.name,
        type: res.type,
        rarity: 'COMMON',
        description: res.description,
        stats: {},
        durability: 100,
        professionRequired: null,
        levelRequired: 1,
      },
    });
    templateMap.set(res.name, created.id);
  }
  console.log(`  Resource templates: ${RESOURCE_ITEMS.length}`);

  // Seed crafted item templates
  for (const tmpl of ITEM_TEMPLATES) {
    const stableId = `crafted-${tmpl.name.toLowerCase().replace(/\s+/g, '-')}`;
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
        ...(tmpl.isFood != null && { isFood: tmpl.isFood }),
        ...(tmpl.foodBuff != null && { foodBuff: tmpl.foodBuff }),
        ...(tmpl.isPerishable != null && { isPerishable: tmpl.isPerishable }),
        ...(tmpl.shelfLifeDays != null && { shelfLifeDays: tmpl.shelfLifeDays }),
        ...(tmpl.isBeverage != null && { isBeverage: tmpl.isBeverage }),
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
        ...(tmpl.isFood != null && { isFood: tmpl.isFood }),
        ...(tmpl.foodBuff != null && { foodBuff: tmpl.foodBuff }),
        ...(tmpl.isPerishable != null && { isPerishable: tmpl.isPerishable }),
        ...(tmpl.shelfLifeDays != null && { shelfLifeDays: tmpl.shelfLifeDays }),
        ...(tmpl.isBeverage != null && { isBeverage: tmpl.isBeverage }),
      },
    });
    templateMap.set(tmpl.name, created.id);
  }
  console.log(`  Crafted templates: ${ITEM_TEMPLATES.length}`);
  console.log(`  Total templates: ${templateMap.size}`);

  // ----- Seed Processing Recipes (from shared data) -----
  console.log('--- Seeding Processing Recipes ---');

  for (const recipe of ALL_PROCESSING_RECIPES) {
    const ingredients = recipe.inputs.map((inp) => {
      const templateId = templateMap.get(inp.itemName);
      if (!templateId) {
        throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
      }
      return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
    });

    const output = recipe.outputs[0];
    const resultId = templateMap.get(output.itemName);
    if (!resultId) {
      throw new Error(`Item template not found for output: ${output.itemName} (recipe: ${recipe.name})`);
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
  }

  console.log(`  Processing recipes: ${ALL_PROCESSING_RECIPES.length}`);

  // ----- Seed COOK Recipes (from shared data) -----
  console.log('--- Seeding COOK Recipes ---');

  for (const recipe of COOK_RECIPES) {
    const ingredients = recipe.inputs.map((inp) => {
      const templateId = templateMap.get(inp.itemName);
      if (!templateId) {
        throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
      }
      return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
    });

    const output = recipe.outputs[0];
    const resultId = templateMap.get(output.itemName);
    if (!resultId) {
      throw new Error(`Item template not found for output: ${output.itemName} (recipe: ${recipe.name})`);
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

    console.log(`  + ${recipe.name} (COOK Lvl ${recipe.levelRequired})`);
  }

  console.log(`  COOK recipes: ${COOK_RECIPES.length}`);

  // ----- Seed Crafting Recipes (non-processing) -----
  console.log('--- Seeding Crafting Recipes ---');

  for (const recipe of CRAFTING_RECIPES) {
    const ingredients = recipe.ingredients.map((ing) => {
      const templateId = templateMap.get(ing.itemName);
      if (!templateId) {
        throw new Error(`Item template not found for ingredient: ${ing.itemName} (recipe: ${recipe.name})`);
      }
      return { itemTemplateId: templateId, itemName: ing.itemName, quantity: ing.quantity };
    });

    const resultId = templateMap.get(recipe.resultName);
    if (!resultId) {
      throw new Error(`Item template not found for result: ${recipe.resultName} (recipe: ${recipe.name})`);
    }

    const recipeId = `recipe-${recipe.name.toLowerCase().replace(/\s+/g, '-')}`;

    await prisma.recipe.upsert({
      where: { id: recipeId },
      update: {
        name: recipe.name,
        professionType: recipe.professionType,
        tier: recipe.tier,
        ingredients,
        result: resultId,
        craftTime: recipe.craftTime,
        xpReward: recipe.xpReward,
      },
      create: {
        id: recipeId,
        name: recipe.name,
        professionType: recipe.professionType,
        tier: recipe.tier,
        ingredients,
        result: resultId,
        craftTime: recipe.craftTime,
        xpReward: recipe.xpReward,
      },
    });

    console.log(`  + ${recipe.name} (${recipe.professionType}/${recipe.tier})`);
  }

  console.log(`  Crafting recipes: ${CRAFTING_RECIPES.length}`);
  console.log(`  Total recipes: ${ALL_PROCESSING_RECIPES.length + COOK_RECIPES.length + CRAFTING_RECIPES.length}`);
}
