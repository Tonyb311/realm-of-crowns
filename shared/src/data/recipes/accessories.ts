import { RecipeDefinition } from './types';

export const ACCESSORY_RECIPES: RecipeDefinition[] = [
  // ── Rings ──────────────────────────────────────────────────
  {
    recipeId: 'jewel-copper-ring',
    name: 'Craft Copper Ring',
    professionRequired: 'JEWELER',
    levelRequired: 1,
    inputs: [
      { itemName: 'Copper Ingot', quantity: 1 },
    ],
    outputs: [{ itemName: 'Copper Ring', quantity: 1 }],
    craftTime: 20,
    xpReward: 10,
    tier: 1,
  },
  {
    recipeId: 'jewel-iron-ring',
    name: 'Craft Iron Ring',
    professionRequired: 'JEWELER',
    levelRequired: 10,
    inputs: [
      { itemName: 'Iron Ingot', quantity: 1 },
    ],
    outputs: [{ itemName: 'Iron Ring', quantity: 1 }],
    craftTime: 25,
    xpReward: 15,
    tier: 1,
  },
  {
    recipeId: 'jewel-silver-ring',
    name: 'Craft Silver Ring',
    professionRequired: 'JEWELER',
    levelRequired: 20,
    inputs: [
      { itemName: 'Silver Ingot', quantity: 1 },
      { itemName: 'Gemstones', quantity: 1 },
    ],
    outputs: [{ itemName: 'Silver Ring', quantity: 1 }],
    craftTime: 40,
    xpReward: 25,
    tier: 2,
  },
  {
    recipeId: 'jewel-gold-ring',
    name: 'Craft Gold Ring',
    professionRequired: 'JEWELER',
    levelRequired: 30,
    inputs: [
      { itemName: 'Gold Ingot', quantity: 1 },
      { itemName: 'Gemstones', quantity: 2 },
    ],
    outputs: [{ itemName: 'Gold Ring', quantity: 1 }],
    craftTime: 55,
    xpReward: 35,
    tier: 3,
  },
  {
    recipeId: 'jewel-mithril-ring',
    name: 'Craft Mithril Ring',
    professionRequired: 'JEWELER',
    levelRequired: 55,
    inputs: [
      { itemName: 'Mithril Ingot', quantity: 1 },
      { itemName: 'Gemstones', quantity: 3 },
    ],
    outputs: [{ itemName: 'Mithril Ring', quantity: 1 }],
    craftTime: 90,
    xpReward: 60,
    tier: 4,
  },

  // ── Necklaces ──────────────────────────────────────────────
  {
    recipeId: 'jewel-copper-necklace',
    name: 'Craft Copper Necklace',
    professionRequired: 'JEWELER',
    levelRequired: 1,
    inputs: [
      { itemName: 'Copper Ingot', quantity: 2 },
    ],
    outputs: [{ itemName: 'Copper Necklace', quantity: 1 }],
    craftTime: 25,
    xpReward: 12,
    tier: 1,
  },
  {
    recipeId: 'jewel-silver-necklace',
    name: 'Craft Silver Necklace',
    professionRequired: 'JEWELER',
    levelRequired: 20,
    inputs: [
      { itemName: 'Silver Ingot', quantity: 2 },
      { itemName: 'Gemstones', quantity: 1 },
    ],
    outputs: [{ itemName: 'Silver Necklace', quantity: 1 }],
    craftTime: 45,
    xpReward: 28,
    tier: 2,
  },
  {
    recipeId: 'jewel-gold-necklace',
    name: 'Craft Gold Necklace',
    professionRequired: 'JEWELER',
    levelRequired: 30,
    inputs: [
      { itemName: 'Gold Ingot', quantity: 2 },
      { itemName: 'Gemstones', quantity: 2 },
    ],
    outputs: [{ itemName: 'Gold Necklace', quantity: 1 }],
    craftTime: 60,
    xpReward: 40,
    tier: 3,
  },

  // ── Circlets & Crowns ──────────────────────────────────────
  {
    recipeId: 'jewel-circlet-focus',
    name: 'Craft Circlet of Focus',
    professionRequired: 'JEWELER',
    levelRequired: 25,
    inputs: [
      { itemName: 'Silver Ingot', quantity: 2 },
      { itemName: 'Gemstones', quantity: 2 },
      { itemName: 'Arcane Reagents', quantity: 1 },
    ],
    outputs: [{ itemName: 'Circlet of Focus', quantity: 1 }],
    craftTime: 70,
    xpReward: 35,
    tier: 3,
  },
  {
    recipeId: 'jewel-crown-wisdom',
    name: 'Craft Crown of Wisdom',
    professionRequired: 'JEWELER',
    levelRequired: 50,
    inputs: [
      { itemName: 'Gold Ingot', quantity: 3 },
      { itemName: 'Gemstones', quantity: 4 },
      { itemName: 'Arcane Reagents', quantity: 2 },
    ],
    outputs: [{ itemName: 'Crown of Wisdom', quantity: 1 }],
    craftTime: 120,
    xpReward: 70,
    tier: 4,
  },

  // ── Brooches ───────────────────────────────────────────────
  {
    recipeId: 'jewel-brooch-protection',
    name: 'Craft Brooch of Protection',
    professionRequired: 'JEWELER',
    levelRequired: 15,
    inputs: [
      { itemName: 'Iron Ingot', quantity: 1 },
      { itemName: 'Gemstones', quantity: 1 },
    ],
    outputs: [{ itemName: 'Brooch of Protection', quantity: 1 }],
    craftTime: 35,
    xpReward: 20,
    tier: 2,
  },
  {
    recipeId: 'jewel-brooch-speed',
    name: 'Craft Brooch of Speed',
    professionRequired: 'JEWELER',
    levelRequired: 30,
    inputs: [
      { itemName: 'Gold Ingot', quantity: 1 },
      { itemName: 'Gemstones', quantity: 2 },
      { itemName: 'Arcane Reagents', quantity: 1 },
    ],
    outputs: [{ itemName: 'Brooch of Speed', quantity: 1 }],
    craftTime: 55,
    xpReward: 38,
    tier: 3,
  },
];
