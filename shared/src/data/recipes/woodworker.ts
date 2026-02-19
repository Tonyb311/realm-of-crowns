/**
 * WOODWORKER Recipes — 25 recipes across 3 tiers
 *
 * Processing (11): Raw lumber → planks, dowels, handles, staves, frames
 * Finished Goods (14): Tools, furniture, shields, weapon
 *
 * No specialization branches — all recipes available to all WOODWORKERs.
 */

import { ITEMS, type RecipeDefinition, type FinishedGoodsRecipe } from './types';

// ============================================================
// PROCESSING RECIPES (11 total: 7 original + 4 new)
// ============================================================

export const WOODWORKER_RECIPES: RecipeDefinition[] = [
  // ── Original 7 recipes (unchanged) ─────────────────────────
  {
    recipeId: 'mill-softwood',
    name: 'Mill Softwood Planks',
    professionRequired: 'WOODWORKER',
    levelRequired: 1,
    inputs: [{ itemName: 'Softwood', quantity: 2 }],
    outputs: [{ itemName: 'Softwood Planks', quantity: 4 }],
    craftTime: 15,
    xpReward: 8,
    tier: 1,
  },
  {
    recipeId: 'mill-hardwood',
    name: 'Mill Hardwood Planks',
    professionRequired: 'WOODWORKER',
    levelRequired: 10,
    inputs: [{ itemName: 'Hardwood', quantity: 2 }],
    outputs: [{ itemName: 'Hardwood Planks', quantity: 3 }],
    craftTime: 25,
    xpReward: 15,
    tier: 1,
  },
  {
    recipeId: 'shape-beams',
    name: 'Shape Beams',
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    inputs: [{ itemName: 'Hardwood', quantity: 3 }],
    outputs: [{ itemName: 'Beams', quantity: 2 }],
    craftTime: 35,
    xpReward: 20,
    tier: 2,
  },
  {
    recipeId: 'make-barrel',
    name: 'Make Barrel',
    professionRequired: 'WOODWORKER',
    levelRequired: 10,
    inputs: [
      { itemName: 'Softwood Planks', quantity: 4 },
      { itemName: 'Nails', quantity: 10 },
    ],
    outputs: [{ itemName: 'Barrel', quantity: 1 }],
    craftTime: 30,
    xpReward: 15,
    tier: 1,
  },
  {
    recipeId: 'make-furniture',
    name: 'Make Furniture',
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    inputs: [
      { itemName: 'Hardwood Planks', quantity: 4 },
      { itemName: 'Nails', quantity: 15 },
    ],
    outputs: [{ itemName: 'Furniture', quantity: 1 }],
    craftTime: 45,
    xpReward: 20,
    tier: 2,
  },
  {
    recipeId: 'saw-rough-planks',
    name: 'Saw Rough Planks',
    professionRequired: 'WOODWORKER',
    levelRequired: 1,
    inputs: [{ itemName: 'Wood Logs', quantity: 2 }],
    outputs: [{ itemName: 'Rough Planks', quantity: 3 }],
    craftTime: 12,
    xpReward: 6,
    tier: 1,
  },
  {
    recipeId: 'mill-exotic',
    name: 'Mill Exotic Planks',
    professionRequired: 'WOODWORKER',
    levelRequired: 40,
    inputs: [{ itemName: 'Exotic Wood', quantity: 2 }],
    outputs: [{ itemName: 'Exotic Planks', quantity: 2 }],
    craftTime: 60,
    xpReward: 45,
    tier: 3,
  },

  // ── New processing recipes (4) ─────────────────────────────

  // Tier 1 — Apprentice
  {
    recipeId: 'ww-carve-wooden-dowels',
    name: 'Carve Wooden Dowels',
    professionRequired: 'WOODWORKER',
    levelRequired: 3,
    inputs: [{ itemName: ITEMS.SOFTWOOD_PLANKS, quantity: 1 }],
    outputs: [{ itemName: ITEMS.WOODEN_DOWELS, quantity: 4 }],
    craftTime: 10,
    xpReward: 5,
    tier: 1,
  },
  {
    recipeId: 'ww-shape-wooden-handle',
    name: 'Shape Wooden Handle',
    professionRequired: 'WOODWORKER',
    levelRequired: 5,
    inputs: [
      { itemName: ITEMS.HARDWOOD, quantity: 1 },
      { itemName: ITEMS.ROUGH_PLANKS, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_HANDLE, quantity: 2 }],
    craftTime: 15,
    xpReward: 8,
    tier: 1,
  },
  {
    recipeId: 'ww-carve-bow-stave',
    name: 'Carve Bow Stave',
    professionRequired: 'WOODWORKER',
    levelRequired: 8,
    inputs: [{ itemName: ITEMS.HARDWOOD, quantity: 2 }],
    outputs: [{ itemName: ITEMS.BOW_STAVE, quantity: 1 }],
    craftTime: 20,
    xpReward: 12,
    tier: 1,
  },

  // Tier 2 — Journeyman
  {
    recipeId: 'ww-craft-wooden-frame',
    name: 'Craft Wooden Frame',
    professionRequired: 'WOODWORKER',
    levelRequired: 12,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 2 },
      { itemName: ITEMS.NAILS, quantity: 4 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_FRAME, quantity: 1 }],
    craftTime: 20,
    xpReward: 15,
    tier: 2,
  },
];

// ============================================================
// FINISHED GOODS RECIPES (14 total)
// ============================================================

export const WOODWORKER_FINISHED_GOODS: FinishedGoodsRecipe[] = [
  // ── Tier 1 — Apprentice (Level 3–10) ──────────────────────

  // Tools
  {
    recipeId: 'ww-wooden-pickaxe',
    name: 'Craft Wooden Pickaxe',
    professionRequired: 'WOODWORKER',
    levelRequired: 3,
    inputs: [
      { itemName: ITEMS.WOOD_LOGS, quantity: 2 },
      { itemName: ITEMS.WOODEN_DOWELS, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_PICKAXE, quantity: 1 }],
    craftTime: 15,
    xpReward: 10,
    tier: 1,
    outputItemType: 'TOOL',
    outputStats: { durability: 10, yieldBonus: 5 },
    specialization: null,
  },
  {
    recipeId: 'ww-fishing-rod',
    name: 'Craft Fishing Rod',
    professionRequired: 'WOODWORKER',
    levelRequired: 5,
    inputs: [
      { itemName: ITEMS.SOFTWOOD, quantity: 2 },
      { itemName: ITEMS.WOODEN_HANDLE, quantity: 1 },
      { itemName: ITEMS.WOODEN_DOWELS, quantity: 3 },
    ],
    outputs: [{ itemName: ITEMS.FISHING_ROD, quantity: 1 }],
    craftTime: 20,
    xpReward: 12,
    tier: 1,
    outputItemType: 'TOOL',
    outputStats: { durability: 15, yieldBonus: 10 },
    specialization: null,
  },
  {
    recipeId: 'ww-carving-knife',
    name: 'Craft Carving Knife',
    professionRequired: 'WOODWORKER',
    levelRequired: 8,
    inputs: [
      { itemName: ITEMS.WOODEN_HANDLE, quantity: 1 },
      { itemName: ITEMS.NAILS, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.CARVING_KNIFE, quantity: 1 }],
    craftTime: 15,
    xpReward: 10,
    tier: 1,
    outputItemType: 'TOOL',
    outputStats: { durability: 15, yieldBonus: 10 },
    specialization: null,
  },

  // Furniture
  {
    recipeId: 'ww-wooden-chair',
    name: 'Build Wooden Chair',
    professionRequired: 'WOODWORKER',
    levelRequired: 7,
    inputs: [
      { itemName: ITEMS.SOFTWOOD_PLANKS, quantity: 3 },
      { itemName: ITEMS.WOODEN_DOWELS, quantity: 4 },
      { itemName: ITEMS.NAILS, quantity: 4 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_CHAIR, quantity: 1 }],
    craftTime: 25,
    xpReward: 12,
    tier: 1,
    outputItemType: 'HOUSING',
    outputStats: {},
    specialization: null,
  },

  // ── Tier 2 — Journeyman (Level 11–25) ─────────────────────

  // Tools
  {
    recipeId: 'ww-tanning-rack',
    name: 'Craft Tanning Rack',
    professionRequired: 'WOODWORKER',
    levelRequired: 12,
    inputs: [
      { itemName: ITEMS.BEAMS, quantity: 3 },
      { itemName: ITEMS.WOODEN_HANDLE, quantity: 2 },
      { itemName: ITEMS.NAILS, quantity: 6 },
    ],
    outputs: [{ itemName: ITEMS.TANNING_RACK, quantity: 1 }],
    craftTime: 35,
    xpReward: 20,
    tier: 2,
    outputItemType: 'TOOL',
    outputStats: { durability: 25, yieldBonus: 15 },
    specialization: null,
  },
  {
    recipeId: 'ww-fine-fishing-rod',
    name: 'Craft Fine Fishing Rod',
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    inputs: [
      { itemName: ITEMS.HARDWOOD, quantity: 2 },
      { itemName: ITEMS.WOODEN_HANDLE, quantity: 1 },
      { itemName: ITEMS.WOODEN_DOWELS, quantity: 4 },
    ],
    outputs: [{ itemName: ITEMS.FINE_FISHING_ROD, quantity: 1 }],
    craftTime: 30,
    xpReward: 20,
    tier: 2,
    outputItemType: 'TOOL',
    outputStats: { durability: 25, yieldBonus: 20 },
    specialization: null,
  },

  // Armor
  {
    recipeId: 'ww-wooden-shield',
    name: 'Craft Wooden Shield',
    professionRequired: 'WOODWORKER',
    levelRequired: 12,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 3 },
      { itemName: ITEMS.WOODEN_HANDLE, quantity: 1 },
      { itemName: ITEMS.NAILS, quantity: 6 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_SHIELD, quantity: 1 }],
    craftTime: 30,
    xpReward: 18,
    tier: 2,
    outputItemType: 'ARMOR',
    equipSlot: 'OFF_HAND',
    outputStats: {
      armor: 5,
      durability: 60,
      levelToEquip: 5,
      movementPenalty: 0,
      stealthPenalty: 0,
    },
    specialization: null,
  },

  // Furniture
  {
    recipeId: 'ww-wooden-table',
    name: 'Build Wooden Table',
    professionRequired: 'WOODWORKER',
    levelRequired: 14,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 4 },
      { itemName: ITEMS.WOODEN_FRAME, quantity: 1 },
      { itemName: ITEMS.NAILS, quantity: 8 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_TABLE, quantity: 1 }],
    craftTime: 40,
    xpReward: 20,
    tier: 2,
    outputItemType: 'HOUSING',
    outputStats: {},
    specialization: null,
  },
  {
    recipeId: 'ww-storage-chest',
    name: 'Build Storage Chest',
    professionRequired: 'WOODWORKER',
    levelRequired: 16,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 4 },
      { itemName: ITEMS.WOODEN_FRAME, quantity: 2 },
      { itemName: ITEMS.NAILS, quantity: 10 },
    ],
    outputs: [{ itemName: ITEMS.STORAGE_CHEST, quantity: 1 }],
    craftTime: 45,
    xpReward: 22,
    tier: 2,
    outputItemType: 'HOUSING',
    outputStats: {},
    specialization: null,
  },
  {
    recipeId: 'ww-wooden-bed-frame',
    name: 'Build Wooden Bed Frame',
    professionRequired: 'WOODWORKER',
    levelRequired: 18,
    inputs: [
      { itemName: ITEMS.BEAMS, quantity: 4 },
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 6 },
      { itemName: ITEMS.NAILS, quantity: 12 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_BED_FRAME, quantity: 1 }],
    craftTime: 50,
    xpReward: 25,
    tier: 2,
    outputItemType: 'HOUSING',
    outputStats: {},
    specialization: null,
  },

  // ── Tier 3 — Craftsman (Level 26–50) ──────────────────────

  // Furniture
  {
    recipeId: 'ww-wooden-shelf',
    name: 'Build Wooden Shelf',
    professionRequired: 'WOODWORKER',
    levelRequired: 28,
    inputs: [
      { itemName: ITEMS.EXOTIC_PLANKS, quantity: 3 },
      { itemName: ITEMS.WOODEN_FRAME, quantity: 2 },
      { itemName: ITEMS.NAILS, quantity: 8 },
    ],
    outputs: [{ itemName: ITEMS.WOODEN_SHELF, quantity: 1 }],
    craftTime: 45,
    xpReward: 35,
    tier: 3,
    outputItemType: 'HOUSING',
    outputStats: {},
    specialization: null,
  },
  {
    recipeId: 'ww-reinforced-crate',
    name: 'Build Reinforced Crate',
    professionRequired: 'WOODWORKER',
    levelRequired: 30,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 4 },
      { itemName: ITEMS.BEAMS, quantity: 2 },
      { itemName: ITEMS.NAILS, quantity: 15 },
    ],
    outputs: [{ itemName: ITEMS.REINFORCED_CRATE, quantity: 1 }],
    craftTime: 40,
    xpReward: 30,
    tier: 3,
    outputItemType: 'HOUSING',
    outputStats: {},
    specialization: null,
  },

  // Weapon
  {
    recipeId: 'ww-practice-bow',
    name: 'Craft Practice Bow',
    professionRequired: 'WOODWORKER',
    levelRequired: 30,
    inputs: [
      { itemName: ITEMS.BOW_STAVE, quantity: 1 },
      { itemName: ITEMS.WOODEN_HANDLE, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.PRACTICE_BOW, quantity: 1 }],
    craftTime: 35,
    xpReward: 30,
    tier: 3,
    outputItemType: 'WEAPON',
    equipSlot: 'MAIN_HAND',
    outputStats: {
      baseDamage: 5,
      damageType: 'bludgeoning',
      speed: 8,
      requiredStr: 3,
      requiredDex: 5,
      durability: 60,
      levelToEquip: 10,
      twoHanded: true,
      range: 20,
    },
    specialization: null,
  },

  // Armor
  {
    recipeId: 'ww-hardwood-tower-shield',
    name: 'Craft Hardwood Tower Shield',
    professionRequired: 'WOODWORKER',
    levelRequired: 35,
    inputs: [
      { itemName: ITEMS.HARDWOOD_PLANKS, quantity: 6 },
      { itemName: ITEMS.BEAMS, quantity: 2 },
      { itemName: ITEMS.WOODEN_HANDLE, quantity: 1 },
      { itemName: ITEMS.NAILS, quantity: 15 },
    ],
    outputs: [{ itemName: ITEMS.HARDWOOD_TOWER_SHIELD, quantity: 1 }],
    craftTime: 55,
    xpReward: 40,
    tier: 3,
    outputItemType: 'ARMOR',
    equipSlot: 'OFF_HAND',
    outputStats: {
      armor: 10,
      durability: 100,
      levelToEquip: 15,
      requiredStr: 8,
      movementPenalty: 1,
      stealthPenalty: 1,
    },
    specialization: null,
  },
];
