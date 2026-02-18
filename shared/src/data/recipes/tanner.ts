import { RecipeDefinition } from './types';

export const TANNER_RECIPES: RecipeDefinition[] = [
  // --- Tier 1: Apprentice (L3) — Processing ---
  {
    recipeId: 'tan-cure-leather',
    name: 'Cure Leather',
    professionRequired: 'TANNER',
    levelRequired: 3,
    inputs: [
      { itemName: 'Animal Pelts', quantity: 2 },
    ],
    outputs: [{ itemName: 'Cured Leather', quantity: 2 }],
    craftTime: 20,
    xpReward: 10,
    tier: 1,
  },
  // --- Tier 3: Craftsman (L7) — Premium Processing ---
  {
    recipeId: 'tan-wolf-leather',
    name: 'Tan Wolf Leather',
    professionRequired: 'TANNER',
    levelRequired: 7,
    inputs: [
      { itemName: 'Wolf Pelts', quantity: 2 },
    ],
    outputs: [{ itemName: 'Wolf Leather', quantity: 2 }],
    craftTime: 35,
    xpReward: 25,
    tier: 3,
  },
  {
    recipeId: 'tan-bear-leather',
    name: 'Tan Bear Leather',
    professionRequired: 'TANNER',
    levelRequired: 7,
    inputs: [
      { itemName: 'Bear Hides', quantity: 2 },
    ],
    outputs: [{ itemName: 'Bear Leather', quantity: 2 }],
    craftTime: 40,
    xpReward: 28,
    tier: 3,
  },
];
