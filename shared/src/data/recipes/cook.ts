/**
 * COOK profession recipes — food production from raw ingredients
 *
 * Tier 1 (Level 1): Single-ingredient basics
 * Tier 2 (Level 5): Multi-ingredient meals with buffs
 * Tier 3 (Level 7): Premium feast dishes
 */

import { RecipeDefinition } from './types';
import { ITEMS } from '../items/item-names';

export const COOK_RECIPES: RecipeDefinition[] = [
  // ── Tier 1 — Level 1 ──────────────────────────────
  {
    recipeId: 'cook-flour',
    name: 'Mill Flour',
    professionRequired: 'COOK',
    levelRequired: 1,
    inputs: [{ itemName: ITEMS.GRAIN, quantity: 2 }, { itemName: ITEMS.WOOD_LOGS, quantity: 1 }],
    outputs: [{ itemName: ITEMS.FLOUR, quantity: 1 }],
    craftTime: 10,
    xpReward: 8,
    tier: 1,
  },
  {
    recipeId: 'cook-apple-sauce',
    name: 'Make Apple Sauce',
    professionRequired: 'COOK',
    levelRequired: 1,
    inputs: [{ itemName: ITEMS.APPLES, quantity: 3 }, { itemName: ITEMS.WOOD_LOGS, quantity: 1 }],
    outputs: [{ itemName: ITEMS.APPLE_SAUCE, quantity: 1 }],
    craftTime: 10,
    xpReward: 10,
    tier: 1,
  },
  {
    recipeId: 'cook-porridge',
    name: 'Cook Porridge',
    professionRequired: 'COOK',
    levelRequired: 1,
    inputs: [{ itemName: ITEMS.GRAIN, quantity: 2 }, { itemName: ITEMS.WOOD_LOGS, quantity: 1 }],
    outputs: [{ itemName: ITEMS.PORRIDGE, quantity: 1 }],
    craftTime: 10,
    xpReward: 10,
    tier: 1,
  },
  {
    recipeId: 'cook-vegetable-stew',
    name: 'Cook Vegetable Stew',
    professionRequired: 'COOK',
    levelRequired: 1,
    inputs: [{ itemName: ITEMS.VEGETABLES, quantity: 3 }, { itemName: ITEMS.WOOD_LOGS, quantity: 1 }],
    outputs: [{ itemName: ITEMS.VEGETABLE_STEW, quantity: 1 }],
    craftTime: 15,
    xpReward: 10,
    tier: 1,
  },

  // ── Tier 2 — Level 5 ──────────────────────────────
  {
    recipeId: 'cook-bread-loaf',
    name: 'Bake Bread',
    professionRequired: 'COOK',
    levelRequired: 5,
    inputs: [{ itemName: ITEMS.FLOUR, quantity: 2 }, { itemName: ITEMS.WOOD_LOGS, quantity: 1 }],
    outputs: [{ itemName: ITEMS.BREAD_LOAF, quantity: 1 }],
    craftTime: 20,
    xpReward: 15,
    tier: 2,
  },
  {
    recipeId: 'cook-seasoned-roast-veg',
    name: 'Roast Seasoned Vegetables',
    professionRequired: 'COOK',
    levelRequired: 5,
    inputs: [
      { itemName: ITEMS.VEGETABLES, quantity: 2 },
      { itemName: ITEMS.WILD_HERBS, quantity: 1 },
      { itemName: ITEMS.WOOD_LOGS, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.SEASONED_ROAST_VEGETABLES, quantity: 1 }],
    craftTime: 20,
    xpReward: 15,
    tier: 2,
  },

  // ── Tier 3 — Level 7 ──────────────────────────────
  {
    recipeId: 'cook-harvest-feast',
    name: 'Prepare Harvest Feast',
    professionRequired: 'COOK',
    levelRequired: 7,
    inputs: [
      { itemName: ITEMS.BREAD_LOAF, quantity: 1 },
      { itemName: ITEMS.APPLES, quantity: 2 },
      { itemName: ITEMS.WILD_HERBS, quantity: 2 },
      { itemName: ITEMS.WOOD_LOGS, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.HARVEST_FEAST, quantity: 1 }],
    craftTime: 45,
    xpReward: 30,
    tier: 3,
  },
  {
    recipeId: 'cook-fishermans-banquet',
    name: "Prepare Fisherman's Banquet",
    professionRequired: 'COOK',
    levelRequired: 7,
    inputs: [
      { itemName: ITEMS.GRILLED_FISH, quantity: 1 },
      { itemName: ITEMS.BREAD_LOAF, quantity: 1 },
      { itemName: ITEMS.BERRY_JAM, quantity: 1 },
      { itemName: ITEMS.WOOD_LOGS, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.FISHERMANS_BANQUET, quantity: 1 }],
    craftTime: 45,
    xpReward: 30,
    tier: 3,
  },
  {
    recipeId: 'cook-spiced-pastry',
    name: 'Bake Spiced Pastry',
    professionRequired: 'COOK',
    levelRequired: 7,
    inputs: [
      { itemName: ITEMS.FLOUR, quantity: 2 },
      { itemName: ITEMS.WILD_HERBS, quantity: 2 },
      { itemName: ITEMS.BERRY_JAM, quantity: 1 },
      { itemName: ITEMS.WOOD_LOGS, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.SPICED_PASTRY, quantity: 1 }],
    craftTime: 40,
    xpReward: 25,
    tier: 3,
  },
];
