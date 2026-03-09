/**
 * Enchanter Bag Recipes — Magical Bags of Holding
 *
 * Bags of Holding are enchanted bags that use dimensional magic to hold
 * more weight than their physical size would allow. Each tier requires
 * a base regular bag plus magical ingredients.
 *
 * Profession: ENCHANTER
 */

import { ITEMS, FinishedGoodsRecipe } from './types';

export const ENCHANTER_BAG_RECIPES: FinishedGoodsRecipe[] = [
  {
    recipeId: 'enc-minor-bag-of-holding',
    name: 'Enchant: Minor Bag of Holding',
    professionRequired: 'ENCHANTER',
    levelRequired: 30,
    inputs: [
      { itemName: ITEMS.LEATHER_BACKPACK, quantity: 1 },
      { itemName: ITEMS.ARCANE_REAGENTS, quantity: 3 },
      { itemName: ITEMS.GLOWCAP_MUSHROOMS, quantity: 2 },
      { itemName: ITEMS.SILK_FABRIC, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.MINOR_BAG_OF_HOLDING, quantity: 1 }],
    craftTime: 60,
    xpReward: 40,
    tier: 3,
    outputItemType: 'ACCESSORY',
    equipSlot: 'BAG',
    outputStats: {
      durability: 250,
      levelToEquip: 25,
      weight: 2,
      carryBonus: 40,
    },
  },
  {
    recipeId: 'enc-bag-of-holding',
    name: 'Enchant: Bag of Holding',
    professionRequired: 'ENCHANTER',
    levelRequired: 45,
    inputs: [
      { itemName: ITEMS.RANGERS_PACK, quantity: 1 },
      { itemName: ITEMS.ARCANE_REAGENTS, quantity: 5 },
      { itemName: ITEMS.GEMSTONES, quantity: 2 },
      { itemName: ITEMS.SILK_FABRIC, quantity: 2 },
    ],
    outputs: [{ itemName: ITEMS.BAG_OF_HOLDING, quantity: 1 }],
    craftTime: 90,
    xpReward: 60,
    tier: 4,
    outputItemType: 'ACCESSORY',
    equipSlot: 'BAG',
    outputStats: {
      durability: 350,
      levelToEquip: 40,
      weight: 2,
      carryBonus: 80,
    },
  },
  {
    recipeId: 'enc-greater-bag-of-holding',
    name: 'Enchant: Greater Bag of Holding',
    professionRequired: 'ENCHANTER',
    levelRequired: 60,
    inputs: [
      { itemName: ITEMS.EXPLORERS_PACK, quantity: 1 },
      { itemName: ITEMS.ARCANE_REAGENTS, quantity: 8 },
      { itemName: ITEMS.MITHRIL_INGOT, quantity: 1 },
      { itemName: ITEMS.GLOWCAP_MUSHROOMS, quantity: 5 },
    ],
    outputs: [{ itemName: ITEMS.GREATER_BAG_OF_HOLDING, quantity: 1 }],
    craftTime: 120,
    xpReward: 80,
    tier: 4,
    outputItemType: 'ACCESSORY',
    equipSlot: 'BAG',
    outputStats: {
      durability: 450,
      levelToEquip: 55,
      weight: 2,
      carryBonus: 120,
    },
  },
  {
    recipeId: 'enc-grand-bag-of-holding',
    name: 'Enchant: Grand Bag of Holding',
    professionRequired: 'ENCHANTER',
    levelRequired: 75,
    inputs: [
      { itemName: ITEMS.ADVENTURERS_HAVERSACK, quantity: 1 },
      { itemName: ITEMS.ARCANE_REAGENTS, quantity: 12 },
      { itemName: ITEMS.ADAMANTINE_INGOT, quantity: 1 },
      { itemName: ITEMS.VOID_FRAGMENT, quantity: 1 },
    ],
    outputs: [{ itemName: ITEMS.GRAND_BAG_OF_HOLDING, quantity: 1 }],
    craftTime: 150,
    xpReward: 100,
    tier: 5,
    outputItemType: 'ACCESSORY',
    equipSlot: 'BAG',
    outputStats: {
      durability: 500,
      levelToEquip: 70,
      weight: 2,
      carryBonus: 175,
    },
  },
];
