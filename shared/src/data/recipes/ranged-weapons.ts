/**
 * FLETCHER Ranged Weapon & Ammunition Recipes — 13 recipes across 3 tiers
 *
 * Supply chain: WOODWORKER (Bow Stave, Planks, Dowels, Handle) +
 *               TANNER (Leather, Wolf Leather, Bear Leather)
 *
 * Damage progression:
 *   Practice Bow (5, WOODWORKER) → Shortbow (6) → Hunting Bow (8) →
 *   Longbow (14) → War Bow (16) → Composite Bow (22) → Ranger's Longbow (26)
 *
 * Also includes BLACKSMITH Throwing Knives (unchanged).
 */

import { ITEMS, type FinishedGoodsRecipe, tagRecipesWithCategories } from './types';

const _RANGED_WEAPON_RECIPES: FinishedGoodsRecipe[] = [
  // ============================================================
  // APPRENTICE TIER (L1-L10) — 4 recipes
  // ============================================================

  // Bowstring — intermediate component used in all bow recipes
  {
    recipeId: 'fletch-bowstring',
    name: 'Craft Bowstring',
    professionRequired: 'FLETCHER',
    levelRequired: 1,
    inputs: [
      { itemName: ITEMS.LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.BOWSTRING, quantity: 1 }],
    craftTime: 10,
    xpReward: 6,
    tier: 1,
    outputItemType: 'TOOL',
    outputStats: {
      weight: 0.1,
    },
  },

  // Arrows — basic consumable ammunition
  {
    recipeId: 'fletch-arrows',
    name: 'Fletch Arrows',
    professionRequired: 'FLETCHER',
    levelRequired: 3,
    inputs: [
      { itemName: ITEMS.SOFTWOOD_PLANKS, quantity: 2 },
      { itemName: ITEMS.IRON_ORE_CHUNKS, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.ARROWS, quantity: 10 }],
    craftTime: 15,
    xpReward: 8,
    tier: 1,
    outputItemType: 'CONSUMABLE',
    outputStats: {
      baseDamage: 2,
      damageType: 'piercing',
      speed: 0,
      requiredStr: 0,
      requiredDex: 0,
      durability: 1,
      levelToEquip: 1,
      weight: 0.05,
    },
  },

  // Shortbow — starter bow using Bow Stave
  {
    recipeId: 'fletch-shortbow',
    name: 'Craft Shortbow',
    professionRequired: 'FLETCHER',
    levelRequired: 5,
    inputs: [
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.SHORTBOW, quantity: 1 }],
    craftTime: 25,
    xpReward: 12,
    tier: 1,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 6,
      diceCount: 1,
      diceSides: 6,
      bonusDamage: 0,
      bonusAttack: 0,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      damageType: 'piercing',
      speed: 10,
      requiredStr: 4,
      requiredDex: 6,
      durability: 80,
      levelToEquip: 1,
      twoHanded: true,
      range: 20,
      weight: 2.0,
    },
  },

  // Hunting Bow — first Bow Stave weapon, upgrade from Practice Bow
  {
    recipeId: 'fletch-hunting-bow',
    name: 'Craft Hunting Bow',
    professionRequired: 'FLETCHER',
    levelRequired: 8,
    inputs: [
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.HUNTING_BOW, quantity: 1 }],
    craftTime: 35,
    xpReward: 18,
    tier: 1,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 8,
      diceCount: 1,
      diceSides: 8,
      bonusDamage: 0,
      bonusAttack: 0,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      damageType: 'piercing',
      speed: 9,
      requiredStr: 5,
      requiredDex: 8,
      durability: 90,
      levelToEquip: 5,
      twoHanded: true,
      range: 25,
      weight: 2.5,
    },
  },

  // ============================================================
  // JOURNEYMAN TIER (L12-L20) — 4 recipes
  // ============================================================

  // Longbow — long range, moderate damage
  {
    recipeId: 'fletch-longbow',
    name: 'Craft Longbow',
    professionRequired: 'FLETCHER',
    levelRequired: 12,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.LONGBOW, quantity: 1 }],
    craftTime: 50,
    xpReward: 28,
    tier: 2,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 14,
      diceCount: 1,
      diceSides: 8,
      bonusDamage: 2,
      bonusAttack: 1,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      damageType: 'piercing',
      speed: 7,
      requiredStr: 8,
      requiredDex: 12,
      durability: 120,
      levelToEquip: 10,
      twoHanded: true,
      range: 35,
      weight: 3.0,
    },
  },

  // War Arrows — hardwood shaft, improved damage
  {
    recipeId: 'fletch-war-arrows',
    name: 'Fletch War Arrows',
    professionRequired: 'FLETCHER',
    levelRequired: 15,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 2 },
      { itemName: ITEMS.IRON_ORE_CHUNKS, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.WAR_ARROWS, quantity: 10 }],
    craftTime: 20,
    xpReward: 15,
    tier: 2,
    outputItemType: 'CONSUMABLE',
    outputStats: {
      baseDamage: 4,
      damageType: 'piercing',
      speed: 0,
      requiredStr: 0,
      requiredDex: 0,
      durability: 1,
      levelToEquip: 10,
      weight: 0.05,
    },
  },

  // War Bow — heavy draw, high power
  {
    recipeId: 'fletch-war-bow',
    name: 'Craft War Bow',
    professionRequired: 'FLETCHER',
    levelRequired: 20,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.WOLF_LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.WAR_BOW, quantity: 1 }],
    craftTime: 60,
    xpReward: 35,
    tier: 2,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 16,
      diceCount: 1,
      diceSides: 10,
      bonusDamage: 1,
      bonusAttack: 1,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      damageType: 'piercing',
      speed: 6,
      requiredStr: 10,
      requiredDex: 14,
      durability: 140,
      levelToEquip: 15,
      twoHanded: true,
      range: 30,
      weight: 3.5,
    },
  },

  // Quiver — back-slot accessory for archers
  {
    recipeId: 'fletch-quiver',
    name: 'Craft Quiver',
    professionRequired: 'FLETCHER',
    levelRequired: 15,
    inputs: [
      { itemName: ITEMS.LEATHER, quantity: 1 },
      { itemName: ITEMS.WOODEN_DOWELS, quantity: 2 },
      { itemName: ITEMS.NAILS, quantity: 4 },
    ],
    outputs: [{ itemName: ITEMS.QUIVER, quantity: 1 }],
    craftTime: 40,
    xpReward: 25,
    tier: 2,
    outputItemType: 'ACCESSORY',
    equipSlot: 'BACK',
    outputStats: {
      armor: 1,
      durability: 60,
      levelToEquip: 10,
      weight: 1.0,
    },
  },

  // ============================================================
  // CRAFTSMAN TIER (L30-L45) — 5 recipes
  // ============================================================

  // Barbed Arrows — iron fittings for barbs, higher damage
  {
    recipeId: 'fletch-barbed-arrows',
    name: 'Fletch Barbed Arrows',
    professionRequired: 'FLETCHER',
    levelRequired: 30,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 2 },
      { itemName: ITEMS.IRON_FITTINGS, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.BARBED_ARROWS, quantity: 10 }],
    craftTime: 25,
    xpReward: 22,
    tier: 3,
    outputItemType: 'CONSUMABLE',
    outputStats: {
      baseDamage: 6,
      damageType: 'piercing',
      speed: 0,
      requiredStr: 0,
      requiredDex: 0,
      durability: 1,
      levelToEquip: 20,
      weight: 0.05,
    },
  },

  // Composite Bow — layered construction, fast and powerful
  {
    recipeId: 'fletch-composite-bow',
    name: 'Craft Composite Bow',
    professionRequired: 'FLETCHER',
    levelRequired: 35,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.WOLF_LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.COMPOSITE_BOW, quantity: 1 }],
    craftTime: 80,
    xpReward: 50,
    tier: 3,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 22,
      diceCount: 1,
      diceSides: 10,
      bonusDamage: 3,
      bonusAttack: 2,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      damageType: 'piercing',
      speed: 8,
      requiredStr: 12,
      requiredDex: 18,
      durability: 180,
      levelToEquip: 25,
      twoHanded: true,
      range: 40,
      weight: 3.0,
    },
  },

  // Ranger's Quiver — premium back-slot accessory
  {
    recipeId: 'fletch-rangers-quiver',
    name: "Craft Ranger's Quiver",
    professionRequired: 'FLETCHER',
    levelRequired: 35,
    inputs: [
      { itemName: ITEMS.WOLF_LEATHER, quantity: 1 },
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 2 },
      { itemName: ITEMS.NAILS, quantity: 4 },
    ],
    outputs: [{ itemName: ITEMS.RANGERS_QUIVER, quantity: 1 }],
    craftTime: 55,
    xpReward: 40,
    tier: 3,
    outputItemType: 'ACCESSORY',
    equipSlot: 'BACK',
    outputStats: {
      armor: 3,
      durability: 100,
      levelToEquip: 25,
      weight: 1.0,
    },
  },

  // Flight Arrows — spider silk fletching, premium ammo
  {
    recipeId: 'fletch-flight-arrows',
    name: 'Fletch Flight Arrows',
    professionRequired: 'FLETCHER',
    levelRequired: 30,
    inputs: [
      { itemName: ITEMS.SOFTWOOD_PLANKS, quantity: 2 },
      { itemName: ITEMS.SPIDER_SILK, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.FLIGHT_ARROWS, quantity: 10 }],
    craftTime: 30,
    xpReward: 30,
    tier: 3,
    outputItemType: 'CONSUMABLE',
    outputStats: {
      baseDamage: 8,
      damageType: 'piercing',
      speed: 0,
      requiredStr: 0,
      requiredDex: 0,
      durability: 1,
      levelToEquip: 30,
      weight: 0.05,
    },
  },

  // Ranger's Longbow — the finest bow a fletcher can craft
  {
    recipeId: 'fletch-rangers-longbow',
    name: "Craft Ranger's Longbow",
    professionRequired: 'FLETCHER',
    levelRequired: 45,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.BEAR_LEATHER, quantity: 1 },
      { itemName: ITEMS.BEAR_CLAW, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.RANGERS_LONGBOW, quantity: 1 }],
    craftTime: 100,
    xpReward: 65,
    tier: 3,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 26,
      diceCount: 1,
      diceSides: 10,
      bonusDamage: 3,
      bonusAttack: 3,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      damageType: 'piercing',
      speed: 7,
      requiredStr: 14,
      requiredDex: 22,
      durability: 220,
      levelToEquip: 35,
      twoHanded: true,
      range: 45,
      weight: 3.0,
    },
  },

  // ============================================================
  // EXPERT TIER (L55) — 3 recipes
  // ============================================================

  // Mithril-Tipped Arrows — premium ammunition
  {
    recipeId: 'fletch-mithril-arrows',
    name: 'Fletch Mithril-Tipped Arrows',
    professionRequired: 'FLETCHER',
    levelRequired: 55,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 2 },
      { itemName: ITEMS.MITHRIL_INGOT, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.MITHRIL_TIPPED_ARROWS, quantity: 10 }],
    craftTime: 35,
    xpReward: 35,
    tier: 4,
    outputItemType: 'CONSUMABLE',
    outputStats: {
      baseDamage: 10,
      damageType: 'piercing',
      speed: 0,
      requiredStr: 0,
      requiredDex: 0,
      durability: 1,
      levelToEquip: 40,
      bonusDamage: 3,
      weight: 0.05,
    },
  },

  // Mithril Longbow — long range, moderate power
  {
    recipeId: 'fletch-mithril-longbow',
    name: 'Craft Mithril Longbow',
    professionRequired: 'FLETCHER',
    levelRequired: 55,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.MITHRIL_INGOT, quantity: 1 },
      { itemName: ITEMS.BEAR_LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.MITHRIL_LONGBOW, quantity: 1 }],
    craftTime: 120,
    xpReward: 80,
    tier: 4,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 32,
      damageType: 'piercing',
      diceCount: 1,
      diceSides: 10,
      bonusAttack: 4,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      bonusDamage: 3,
      speed: 7,
      requiredStr: 16,
      requiredDex: 24,
      durability: 280,
      levelToEquip: 45,
      twoHanded: true,
      range: 45,
      weight: 1.8,
    },
  },

  // Mithril Composite Bow — fast, high damage
  {
    recipeId: 'fletch-mithril-composite-bow',
    name: 'Craft Mithril Composite Bow',
    professionRequired: 'FLETCHER',
    levelRequired: 55,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.MITHRIL_INGOT, quantity: 2 },
      { itemName: ITEMS.BEAR_LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.MITHRIL_COMPOSITE_BOW, quantity: 1 }],
    craftTime: 140,
    xpReward: 90,
    tier: 4,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 36,
      damageType: 'piercing',
      diceCount: 1,
      diceSides: 12,
      bonusAttack: 4,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      bonusDamage: 3,
      speed: 8,
      requiredStr: 18,
      requiredDex: 26,
      durability: 300,
      levelToEquip: 45,
      twoHanded: true,
      range: 40,
      weight: 1.8,
    },
  },

  // ============================================================
  // MASTER TIER (L75) — 3 recipes
  // ============================================================

  // Adamantine Arrows — ultimate ammunition
  {
    recipeId: 'fletch-adamantine-arrows',
    name: 'Fletch Adamantine Arrows',
    professionRequired: 'FLETCHER',
    levelRequired: 75,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 2 },
      { itemName: ITEMS.ADAMANTINE_INGOT, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.ADAMANTINE_ARROWS, quantity: 10 }],
    craftTime: 45,
    xpReward: 50,
    tier: 5,
    outputItemType: 'CONSUMABLE',
    outputStats: {
      baseDamage: 14,
      damageType: 'piercing',
      speed: 0,
      requiredStr: 0,
      requiredDex: 0,
      durability: 1,
      levelToEquip: 55,
      bonusDamage: 4,
      weight: 0.05,
    },
  },

  // Adamantine Longbow — supreme range and power
  {
    recipeId: 'fletch-adamantine-longbow',
    name: 'Craft Adamantine Longbow',
    professionRequired: 'FLETCHER',
    levelRequired: 75,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.ADAMANTINE_INGOT, quantity: 2 },
      { itemName: ITEMS.DRAGONSCALE_LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.ADAMANTINE_LONGBOW, quantity: 1 }],
    craftTime: 160,
    xpReward: 110,
    tier: 5,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 40,
      damageType: 'piercing',
      diceCount: 1,
      diceSides: 12,
      bonusAttack: 5,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      bonusDamage: 4,
      speed: 7,
      requiredStr: 20,
      requiredDex: 28,
      durability: 400,
      levelToEquip: 60,
      twoHanded: true,
      range: 50,
      weight: 3.9,
    },
  },

  // Adamantine War Bow — ultimate combat bow
  {
    recipeId: 'fletch-adamantine-war-bow',
    name: 'Craft Adamantine War Bow',
    professionRequired: 'FLETCHER',
    levelRequired: 75,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 1 },
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.BOWSTRING, quantity: 1 },
      { itemName: ITEMS.ADAMANTINE_INGOT, quantity: 2 },
      { itemName: ITEMS.DRAGONSCALE_LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.ADAMANTINE_WAR_BOW, quantity: 1 }],
    craftTime: 180,
    xpReward: 130,
    tier: 5,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 44,
      damageType: 'piercing',
      diceCount: 2,
      diceSides: 6,
      bonusAttack: 5,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      bonusDamage: 4,
      speed: 8,
      requiredStr: 22,
      requiredDex: 30,
      durability: 450,
      levelToEquip: 60,
      twoHanded: true,
      range: 45,
      weight: 4.6,
    },
  },

  // ============================================================
  // BLACKSMITH (non-FLETCHER, kept as-is)
  // ============================================================
  {
    recipeId: 'forge-throwing-knives',
    name: 'Forge Throwing Knives',
    professionRequired: 'BLACKSMITH',
    levelRequired: 10,
    inputs: [
      { itemName: ITEMS.IRON_INGOT, quantity: 2 },
      { itemName: ITEMS.LEATHER, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.THROWING_KNIVES, quantity: 10 }],
    craftTime: 25,
    xpReward: 15,
    tier: 2,
    outputItemType: 'CONSUMABLE',
    outputStats: {
      baseDamage: 6,
      damageType: 'piercing',
      speed: 12,
      requiredStr: 3,
      requiredDex: 8,
      durability: 1,
      levelToEquip: 10,
      range: 10,
      weight: 0.5,
    },
  },
];

export const RANGED_WEAPON_RECIPES = tagRecipesWithCategories(_RANGED_WEAPON_RECIPES);
