/**
 * FARMER profession recipes — agricultural food production
 *
 * Tier 1 (Apprentice): Single ingredient, basic food/drink
 * Tier 2 (Journeyman): Two ingredients, better food with stronger effects
 * Tier 3 (Craftsman): 2-3 ingredients from different spots, premium food
 */

import { RecipeDefinition } from './types';
import { ITEMS } from '../items/item-names';

export const FARMER_RECIPES: RecipeDefinition[] = [
  // ── Tier 1 — Apprentice (profession level 1) ──────────────────────────────

  {
    recipeId: 'farmer-baked-apples',
    name: 'Bake Apples',
    professionRequired: 'FARMER',
    levelRequired: 1,
    inputs: [{ itemName: ITEMS.APPLES, quantity: 2 }],
    outputs: [{ itemName: ITEMS.BAKED_APPLES, quantity: 1 }],
    craftTime: 10,
    xpReward: 8,
    tier: 1,
  },
  {
    recipeId: 'farmer-berry-jam',
    name: 'Make Berry Jam',
    professionRequired: 'FARMER',
    levelRequired: 1,
    inputs: [{ itemName: ITEMS.WILD_BERRIES, quantity: 3 }],
    outputs: [{ itemName: ITEMS.BERRY_JAM, quantity: 1 }],
    craftTime: 10,
    xpReward: 8,
    tier: 1,
  },
  {
    recipeId: 'farmer-herbal-tea',
    name: 'Brew Herbal Tea',
    professionRequired: 'FARMER',
    levelRequired: 1,
    inputs: [{ itemName: ITEMS.WILD_HERBS, quantity: 2 }],
    outputs: [{ itemName: ITEMS.HERBAL_TEA, quantity: 1 }],
    craftTime: 15,
    xpReward: 10,
    tier: 1,
  },

  // ── Tier 2 — Journeyman (profession level 11) ─────────────────────────────

  {
    recipeId: 'farmer-apple-pie',
    name: 'Bake Apple Pie',
    professionRequired: 'FARMER',
    levelRequired: 11,
    inputs: [
      { itemName: ITEMS.APPLES, quantity: 3 },
      { itemName: ITEMS.WILD_HERBS, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.APPLE_PIE, quantity: 1 }],
    craftTime: 25,
    xpReward: 20,
    tier: 2,
  },
  {
    recipeId: 'farmer-berry-tart',
    name: 'Bake Berry Tart',
    professionRequired: 'FARMER',
    levelRequired: 11,
    inputs: [
      { itemName: ITEMS.WILD_BERRIES, quantity: 2 },
      { itemName: ITEMS.APPLES, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.BERRY_TART, quantity: 1 }],
    craftTime: 25,
    xpReward: 20,
    tier: 2,
  },
  {
    recipeId: 'farmer-vegetable-soup',
    name: 'Cook Vegetable Soup',
    professionRequired: 'FARMER',
    levelRequired: 11,
    inputs: [
      { itemName: ITEMS.WILD_HERBS, quantity: 2 },
      { itemName: ITEMS.WILD_BERRIES, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.VEGETABLE_SOUP, quantity: 1 }],
    craftTime: 20,
    xpReward: 18,
    tier: 2,
  },

  // ── Tier 3 — Craftsman (profession level 26) ──────────────────────────────

  {
    recipeId: 'farmer-hearty-feast',
    name: 'Prepare Hearty Feast',
    professionRequired: 'FARMER',
    levelRequired: 26,
    inputs: [
      { itemName: ITEMS.APPLES, quantity: 3 },
      { itemName: ITEMS.WILD_BERRIES, quantity: 3 },
      { itemName: ITEMS.WILD_HERBS, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.HEARTY_FEAST, quantity: 1 }],
    craftTime: 45,
    xpReward: 40,
    tier: 3,
  },
];
