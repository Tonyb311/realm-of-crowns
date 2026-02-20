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
import { BREWER_CONSUMABLES } from '@shared/data/recipes/consumables';

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
  baseValue: number;
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
    baseValue: 16,
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
    baseValue: 52,
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
    baseValue: 210,
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
    baseValue: 72,
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
    baseValue: 185,
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
    baseValue: 700,
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
    baseValue: 2350,
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
    baseValue: 12,
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
    baseValue: 1,
  },
  {
    name: 'Iron Fittings',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Sturdy iron brackets and fittings. Essential for construction and woodworking.',
    stats: {},
    durability: 100,
    professionRequired: 'SMELTER',
    levelRequired: 8,
    baseValue: 8,
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
    baseValue: 14,
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
    baseValue: 24,
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
    baseValue: 18,
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
    baseValue: 120,
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
    baseValue: 300,
  },
  {
    name: 'Cured Leather',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Animal pelts that have been cleaned, stretched, and treated. The foundation of all leather goods.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 3,
    baseValue: 18,
  },
  {
    name: 'Wolf Leather',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Tanned wolf hide. Tougher and more flexible than standard leather.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 7,
    baseValue: 73,
  },
  {
    name: 'Bear Leather',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Dense tanned bear hide. Almost as protective as chain mail, but far more flexible.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 7,
    baseValue: 91,
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
    baseValue: 8,
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
    baseValue: 8,
  },

  // --- Processed Materials: Tailor (recipe outputs with different names from above) ---
  {
    name: 'Woven Cloth',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Sturdy fabric woven from raw wool. Warm and durable, ideal for everyday garments.',
    stats: {},
    durability: 90,
    professionRequired: 'TAILOR',
    levelRequired: 3,
    baseValue: 20,
  },
  {
    name: 'Fine Cloth',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Exquisitely soft fabric woven from fine wool. Favored for noble attire and enchanted robes.',
    stats: {},
    durability: 80,
    professionRequired: 'TAILOR',
    levelRequired: 7,
    baseValue: 59,
  },
  {
    name: 'Silk Fabric',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'Shimmering fabric processed from silkworm cocoons. Lightweight yet resilient, prized by master tailors.',
    stats: {},
    durability: 70,
    professionRequired: 'TAILOR',
    levelRequired: 7,
    baseValue: 75,
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
    baseValue: 19,
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
    baseValue: 33,
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
    baseValue: 65,
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
    baseValue: 50,
  },
  {
    name: 'Stone Slab',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A smooth stone slab carved from raw blocks. Used in flooring and construction.',
    stats: {},
    durability: 100,
    professionRequired: 'MASON',
    levelRequired: 8,
    baseValue: 55,
  },
  {
    name: 'Clay Pot',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A fired clay pot. Used for storage, decoration, and alchemy.',
    stats: {},
    durability: 80,
    professionRequired: 'MASON',
    levelRequired: 12,
    baseValue: 30,
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
    baseValue: 3,
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
    baseValue: 18,
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
    baseValue: 17,
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
    baseValue: 40,
  },
  {
    name: 'Wooden Dowels',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Thin wooden pegs used to join furniture and tools.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 3,
    baseValue: 4,
  },
  {
    name: 'Wooden Handle',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A shaped hardwood handle for tools and weapons.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 5,
    baseValue: 5,
  },
  {
    name: 'Bow Stave',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A carefully shaped stave of hardwood, ready to be strung into a bow.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 8,
    baseValue: 11,
  },
  {
    name: 'Wooden Frame',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A sturdy wooden frame used as the skeleton for furniture and crates.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 12,
    baseValue: 58,
  },

  // --- Woodworker Finished Materials ---
  {
    name: 'Rough Planks',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Roughly sawn planks from raw logs. Cheap and basic, used in bulk construction.',
    stats: {},
    durability: 80,
    professionRequired: 'WOODWORKER',
    levelRequired: 1,
    baseValue: 4,
  },
  {
    name: 'Barrel',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A sturdy wooden barrel bound with iron hoops, used for storing goods and liquids.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    baseValue: 55,
  },
  {
    name: 'Furniture',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Assembled wooden furniture crafted from hardwood planks. Used in housing and shops.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    baseValue: 63,
  },

  // --- Fletcher Materials (animal drops) ---
  {
    name: 'Spider Silk',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Strong, lightweight silk harvested from giant spiders. Prized by fletchers for bowstrings and arrow fletching.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 18,
  },
  {
    name: 'Bear Claw',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'A large, curved claw from a bear. Used as a decorative and functional component in high-end bows.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 15,
  },

  // --- Magical Components (monster encounter drops) ---
  {
    name: 'Ember Core',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'A fist-sized sphere of solidified flame, warm to the touch and faintly glowing. Harvested from slain fire elementals.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 15,
  },
  {
    name: 'Frost Essence',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'A crystalline shard of pure cold, perpetually rimmed in ice. Condenses from the remains of destroyed ice wraiths.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 15,
  },
  {
    name: 'Storm Feather',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'An iridescent feather that crackles with static. Plucked from the wings of storm hawks after they fall.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 15,
  },
  {
    name: 'Earth Crystal',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A dense, geometric crystal that hums when struck. Found in the rubble of shattered stone golems.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 12,
  },
  {
    name: 'Troll Blood',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Thick, dark-green ichor that writhes and tries to congeal. Must be bottled quickly before it regenerates.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 15,
  },
  {
    name: 'Fey Tear',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'A single luminous droplet, cool as spring water, that falls from a corrupted dryad upon death. Radiates gentle warmth.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 35,
  },
  {
    name: 'Heartwood Sap',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Amber-gold sap that seeps from treant heartwood. Smells of deep forest and old growth. Sticky, warm, faintly alive.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 10,
  },
  {
    name: 'Basilisk Scale',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'A thick, stone-grey scale with a pearlescent sheen. Unnervingly heavy for its size. Retains petrifying resilience.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 25,
  },
  {
    name: 'Wyvern Scale',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'A broad, iridescent scale from the underbelly of a wyvern. Tough as steel, light as leather.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 45,
  },
  {
    name: 'Ogre Sinew',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A thick, fibrous tendon strip from an ogre. Impossibly strong — a single strand can support a man\'s weight.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 12,
  },
  {
    name: 'Wind Mote',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A captured wisp of living wind, bottled from a storm hawk\'s death spiral. Trembles and tries to escape its container.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 12,
  },
  {
    name: 'Basilisk Eye',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'The petrifying eye of a basilisk, carefully extracted and preserved in oil. Still seems to watch you.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 20,
  },
  {
    name: 'Shadow Essence',
    type: 'MATERIAL',
    rarity: 'SUPERIOR',
    description: 'A vial of liquid darkness that absorbs light around it. Extracted from the dissipating form of a slain shadow stalker.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 30,
  },
  {
    name: 'Spider Venom',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Viscous green liquid with paralytic properties. Harvested from giant spiders.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 12,
  },
  {
    name: 'Living Bark',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A section of bark that still pulses with green energy. Slowly tries to grow roots if left on soil.',
    stats: {},
    durability: 100,
    professionRequired: null,
    levelRequired: 1,
    baseValue: 8,
  },

  // --- Enchantment Scrolls (ENCHANTER outputs) ---
  {
    name: 'Earthen Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'An enchantment scroll imbued with the resilience of stone. Apply to equipment for earth-aspected protection.',
    stats: {},
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 35,
    baseValue: 250,
  },
  {
    name: 'Vitality Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'An enchantment scroll pulsing with life energy. Apply to equipment for vitality enhancement.',
    stats: {},
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 35,
    baseValue: 220,
  },
  {
    name: "Nature's Ward Enchantment Scroll",
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'An enchantment scroll woven with primal nature magic. Apply to equipment for natural ward protection.',
    stats: {},
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 40,
    baseValue: 300,
  },
  {
    name: 'True Sight Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'An enchantment scroll infused with basilisk perception. Apply to equipment to pierce illusions and invisibility.',
    stats: {},
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 45,
    baseValue: 350,
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
    baseValue: 6,
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
    baseValue: 20,
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
    baseValue: 27,
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
    baseValue: 23,
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
    baseValue: 19,
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
    baseValue: 60,
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
    baseValue: 23,
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
    baseValue: 45,
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
    baseValue: 15,
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
    baseValue: 25,
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
    baseValue: 48,
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
    baseValue: 30,
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
    baseValue: 27,
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
    baseValue: 20,
  },
  // --- Brewer Beverages ---
  {
    name: 'Ale',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'A hearty mug of golden ale brewed from grain. Fortifies the body.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 3,
    baseValue: 6,
    isBeverage: true,
    foodBuff: { effect: 'buff_constitution', magnitude: 1, duration: 30 },
  },
  {
    name: 'Apple Cider',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'A crisp, amber cider pressed from ripe apples. Loosens tongues and lifts spirits.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 3,
    baseValue: 6,
    isBeverage: true,
    foodBuff: { effect: 'buff_charisma', magnitude: 1, duration: 30 },
  },
  {
    name: 'Berry Cordial',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'A sweet, ruby-hued cordial fermented from wild berries. Soothes wounds over time.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 4,
    baseValue: 8,
    isBeverage: true,
    foodBuff: { effect: 'hp_regen', magnitude: 2, duration: 30 },
  },
  {
    name: 'Strong Ale',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'A potent double-brewed ale infused with wild herbs. A warrior\'s drink of choice.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 5,
    baseValue: 12,
    isBeverage: true,
    foodBuff: { effect: 'buff_strength', magnitude: 2, duration: 30 },
  },
  {
    name: 'Mulled Cider',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'Warm spiced cider steeped with aromatic herbs. Sharpens the mind.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 5,
    baseValue: 14,
    isBeverage: true,
    foodBuff: { effect: 'buff_wisdom', magnitude: 2, duration: 30 },
  },
  {
    name: 'Herbal Brew',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'A bitter, restorative brew of wild herbs and grain. Mends the body between battles.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 6,
    baseValue: 15,
    isBeverage: true,
    foodBuff: { effect: 'hp_regen', magnitude: 3, duration: 30 },
  },
  {
    name: 'Hopped Beer',
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'A complex, aromatic beer brewed with cultivated hops. Fortifies body and spirit alike.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 7,
    baseValue: 15,
    isBeverage: true,
    foodBuff: { effect: 'buff_constitution', magnitude: 3, duration: 40, secondaryEffect: 'buff_strength', secondaryMagnitude: 1 },
  },
  {
    name: 'Grape Wine',
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'A rich, fruity wine pressed from vineyard grapes. The drink of diplomats and scholars.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 7,
    baseValue: 15,
    isBeverage: true,
    foodBuff: { effect: 'buff_charisma', magnitude: 3, duration: 40, secondaryEffect: 'buff_wisdom', secondaryMagnitude: 1 },
  },
  {
    name: 'Pale Ale',
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'A light, crisp ale balanced with hops and herbs. Favoured by rangers and scouts.',
    stats: {},
    durability: 1,
    professionRequired: 'BREWER',
    levelRequired: 8,
    baseValue: 18,
    isBeverage: true,
    foodBuff: { effect: 'buff_strength', magnitude: 2, duration: 40, secondaryEffect: 'buff_dexterity', secondaryMagnitude: 2 },
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
  baseValue: number;
}

const RESOURCE_ITEMS: ResourceItemDef[] = [
  // Ores & minerals
  { name: 'Copper Ore', type: 'MATERIAL', description: 'Common copper ore found in hillside deposits.', baseValue: 4 },
  { name: 'Iron Ore', type: 'MATERIAL', description: 'Raw iron ore mined from the earth.', baseValue: 6 },
  { name: 'Coal', type: 'MATERIAL', description: 'Black coal used as fuel for smelting and forging.', baseValue: 12 },
  { name: 'Silver Ore', type: 'MATERIAL', description: 'Gleaming silver ore from deep rock veins.', baseValue: 30 },
  { name: 'Gold Ore', type: 'MATERIAL', description: 'Precious gold ore mined from mountain caves.', baseValue: 40 },
  { name: 'Mithril Ore', type: 'MATERIAL', description: 'Legendary silvery-blue ore from the deepest mines.', baseValue: 80 },
  { name: 'Adamantine Ore', type: 'MATERIAL', description: 'The hardest metal ore, found only in extreme depths.', baseValue: 150 },
  { name: 'Silite Sand', type: 'MATERIAL', description: 'Fine crystalline sand used in glassmaking.', baseValue: 5 },
  // Stone
  { name: 'Raw Stone', type: 'MATERIAL', description: 'Rough-hewn stone blocks quarried from mountainsides.', baseValue: 7 },
  { name: 'Sandstone', type: 'MATERIAL', description: 'Warm-colored sandstone from arid regions.', baseValue: 7 },
  { name: 'Marble', type: 'MATERIAL', description: 'Polished white marble veined with color.', baseValue: 15 },
  // Wood
  { name: 'Softwood', type: 'MATERIAL', description: 'Common softwood lumber from pine and fir trees.', baseValue: 3 },
  { name: 'Hardwood', type: 'MATERIAL', description: 'Dense hardwood from ancient oaks and elms.', baseValue: 25 },
  { name: 'Exotic Wood', type: 'MATERIAL', description: 'Rare timber from ancient or magical trees.', baseValue: 50 },
  { name: 'Bark', type: 'MATERIAL', description: 'Stripped bark used in tanning and potion-making.', baseValue: 3 },
  // Animal products
  { name: 'Raw Leather', type: 'MATERIAL', description: 'Untanned hides from common game.', baseValue: 8 },
  { name: 'Animal Pelts', type: 'MATERIAL', description: 'Fur-bearing animal pelts from wolves, foxes, and bears.', baseValue: 8 },
  { name: 'Wolf Pelts', type: 'MATERIAL', description: 'Thick pelts from wild wolves. Prized by tanners for durable leather.', baseValue: 28 },
  { name: 'Bear Hides', type: 'MATERIAL', description: 'Heavy hides from bears. Exceptionally tough when tanned.', baseValue: 35 },
  { name: 'Exotic Hide', type: 'MATERIAL', description: 'Tough hide from exotic and dangerous beasts.', baseValue: 50 },
  { name: 'Dragon Hide', type: 'MATERIAL', description: 'Scaled hide stripped from a slain dragon. Nearly indestructible.', baseValue: 200 },
  // Fibers
  { name: 'Cotton', type: 'MATERIAL', description: 'Raw cotton fibers, ready for spinning.', baseValue: 4 },
  { name: 'Flax', type: 'MATERIAL', description: 'Flax stalks processed into linen thread.', baseValue: 4 },
  { name: 'Wool', type: 'MATERIAL', description: 'Sheared sheep wool, the warmest natural fiber.', baseValue: 10 },
  { name: 'Silk Thread', type: 'MATERIAL', description: 'Delicate silk thread harvested from giant silkworms. Rare and valuable.', baseValue: 38 },
  // Other inputs
  { name: 'Salt', type: 'MATERIAL', description: 'Sea salt harvested from tidal pools. Essential for preservation.', baseValue: 3 },
  { name: 'Rare Herbs', type: 'MATERIAL', description: 'Elusive plants that grow only in specific conditions.', baseValue: 28 },
  { name: 'Arcane Reagents', type: 'MATERIAL', description: 'Volatile magical substances harvested from places of power.', baseValue: 35 },
  // Town gathering spot items
  { name: 'Apples', type: 'MATERIAL', description: 'Crisp apples picked from the royal orchards.', baseValue: 3 },
  { name: 'Raw Fish', type: 'MATERIAL', description: 'Fresh fish caught from nearby waters.', baseValue: 4 },
  { name: 'Wild Berries', type: 'MATERIAL', description: 'A handful of wild berries foraged from the bushes.', baseValue: 3 },
  { name: 'Wild Herbs', type: 'MATERIAL', description: 'Fragrant herbs gathered from the wild.', baseValue: 5 },
  { name: 'Iron Ore Chunks', type: 'MATERIAL', description: 'Rough chunks of iron ore from the mines.', baseValue: 4 },
  { name: 'Wood Logs', type: 'MATERIAL', description: 'Freshly felled timber logs.', baseValue: 5 },
  { name: 'Stone Blocks', type: 'MATERIAL', description: 'Rough-hewn stone blocks from the quarry.', baseValue: 7 },
  { name: 'Clay', type: 'MATERIAL', description: 'Wet clay dug from river banks.', baseValue: 4 },
  // Legacy references (used by non-processing recipes)
  { name: 'Herbs', type: 'MATERIAL', description: 'A bundle of gathered herbs with medicinal properties.', baseValue: 5 },
  { name: 'Grain', type: 'MATERIAL', description: 'Harvested grain, a staple crop.', baseValue: 3 },
  { name: 'Hops', type: 'MATERIAL', description: 'Aromatic hop flowers, essential for brewing fine beer.', baseValue: 5 },
  { name: 'Grapes', type: 'MATERIAL', description: 'Plump, juicy grapes, ready to be pressed into wine.', baseValue: 4 },
  { name: 'Fiber', type: 'MATERIAL', description: 'Plant fibers used for stringing bows and binding.', baseValue: 3 },
  { name: 'Lumber', type: 'MATERIAL', description: 'Cut and dried timber, ready for use.', baseValue: 5 },
  { name: 'Hide', type: 'MATERIAL', description: 'An animal hide, not yet tanned.', baseValue: 8 },
  { name: 'Arcane Reagent', type: 'MATERIAL', description: 'A shimmering reagent infused with magical energy.', baseValue: 35 },
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
  // (BREWER recipes now seeded from shared BREWER_CONSUMABLES data)
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

  // Pre-load ALL existing templates from DB so recipes can reference them
  const existingTemplates = await prisma.itemTemplate.findMany({ select: { id: true, name: true } });
  for (const t of existingTemplates) {
    templateMap.set(t.name, t.id);
  }
  console.log(`  Pre-loaded ${existingTemplates.length} existing templates from DB`);

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

  // Seed resource item templates (raw materials)
  for (const res of RESOURCE_ITEMS) {
    const stableId = `resource-${res.name.toLowerCase().replace(/\s+/g, '-')}`;
    const created = await prisma.itemTemplate.upsert({
      where: { id: stableId },
      update: {
        name: res.name,
        type: res.type,
        description: res.description,
        baseValue: res.baseValue,
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
        baseValue: res.baseValue,
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
        baseValue: tmpl.baseValue,
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
        baseValue: tmpl.baseValue,
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
    const ingredients: { itemTemplateId: string; itemName: string; quantity: number }[] = [];
    for (const inp of recipe.inputs) {
      const templateId = ensureTemplate(inp.itemName, recipe.name);
      ingredients.push({ itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity });
    }

    const output = recipe.outputs[0];
    const resultId = ensureTemplate(output.itemName, recipe.name);

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
    const ingredients: { itemTemplateId: string; itemName: string; quantity: number }[] = [];
    for (const inp of recipe.inputs) {
      const templateId = ensureTemplate(inp.itemName, recipe.name);
      ingredients.push({ itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity });
    }

    const output = recipe.outputs[0];
    const resultId = ensureTemplate(output.itemName, recipe.name);

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

  // ----- Seed BREWER Recipes (from shared data) -----
  console.log('--- Seeding BREWER Recipes ---');

  for (const recipe of BREWER_CONSUMABLES) {
    const ingredients: { itemTemplateId: string; itemName: string; quantity: number }[] = [];
    for (const inp of recipe.inputs) {
      const templateId = ensureTemplate(inp.itemName, recipe.name);
      ingredients.push({ itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity });
    }

    const resultId = ensureTemplate(recipe.output.itemName, recipe.name);

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

    console.log(`  + ${recipe.name} (BREWER Lvl ${recipe.levelRequired})`);
  }

  console.log(`  BREWER recipes: ${BREWER_CONSUMABLES.length}`);

  // ----- Seed Crafting Recipes (non-processing) -----
  console.log('--- Seeding Crafting Recipes ---');

  for (const recipe of CRAFTING_RECIPES) {
    const ingredients: { itemTemplateId: string; itemName: string; quantity: number }[] = [];
    for (const ing of recipe.ingredients) {
      const templateId = ensureTemplate(ing.itemName, recipe.name);
      ingredients.push({ itemTemplateId: templateId, itemName: ing.itemName, quantity: ing.quantity });
    }

    const resultId = ensureTemplate(recipe.resultName, recipe.name);

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
  console.log(`  Total recipes: ${ALL_PROCESSING_RECIPES.length + COOK_RECIPES.length + BREWER_CONSUMABLES.length + CRAFTING_RECIPES.length}`);
}
