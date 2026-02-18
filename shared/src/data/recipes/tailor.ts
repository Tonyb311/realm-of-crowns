import { RecipeDefinition } from './types';

export const TAILOR_RECIPES: RecipeDefinition[] = [
  // ---- KEPT: Legacy processing for ARMORER chain ----
  {
    recipeId: 'spin-cloth',
    name: 'Spin Cloth',
    professionRequired: 'TAILOR',
    levelRequired: 1,
    inputs: [{ itemName: 'Cotton', quantity: 3 }],
    outputs: [{ itemName: 'Cloth', quantity: 2 }],
    craftTime: 20,
    xpReward: 10,
    tier: 1,
  },
  {
    recipeId: 'make-cloth-padding',
    name: 'Make Cloth Padding',
    professionRequired: 'TAILOR',
    levelRequired: 3,
    inputs: [{ itemName: 'Cloth', quantity: 2 }],
    outputs: [{ itemName: 'Cloth Padding', quantity: 1 }],
    craftTime: 15,
    xpReward: 8,
    tier: 1,
  }, // Major-ECON-06: Cloth Padding — needed by Armorer for plate armor

  // ---- NEW: TAILOR Apprentice processing ----
  {
    recipeId: 'tai-weave-cloth',
    name: 'Weave Cloth',
    professionRequired: 'TAILOR',
    levelRequired: 3,
    inputs: [{ itemName: 'Wool', quantity: 3 }],
    outputs: [{ itemName: 'Woven Cloth', quantity: 2 }],
    craftTime: 20,
    xpReward: 12,
    tier: 1,
  },

  // ---- NEW: TAILOR Craftsman processing ----
  {
    recipeId: 'tai-weave-fine-cloth',
    name: 'Weave Fine Cloth',
    professionRequired: 'TAILOR',
    levelRequired: 7,
    inputs: [{ itemName: 'Fine Wool', quantity: 3 }],
    outputs: [{ itemName: 'Fine Cloth', quantity: 2 }],
    craftTime: 35,
    xpReward: 25,
    tier: 3,
  },
  {
    recipeId: 'tai-process-silk',
    name: 'Process Silk',
    professionRequired: 'TAILOR',
    levelRequired: 7,
    inputs: [{ itemName: 'Silkworm Cocoons', quantity: 3 }],
    outputs: [{ itemName: 'Silk Fabric', quantity: 2 }],
    craftTime: 40,
    xpReward: 28,
    tier: 3,
  },
];
