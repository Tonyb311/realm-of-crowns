/**
 * Processing recipe data index for Realm of Crowns
 *
 * Exports all 26 processing recipes and utility lookup functions.
 */

export * from './types';

import { RecipeDefinition, ProcessingProfession, CraftingProfession, FinishedGoodsRecipe, ConsumableRecipe, ConsumableProfession } from './types';
import { SMELTER_RECIPES } from './smelter';
import { TANNER_RECIPES } from './tanner';
import { TAILOR_RECIPES } from './tailor';
import { MASON_RECIPES } from './mason';
import { WOODWORKER_RECIPES } from './woodworker';
import { BLACKSMITH_WEAPON_RECIPES } from './weapons';
import { RANGED_WEAPON_RECIPES } from './ranged-weapons';
import {
  ALCHEMIST_CONSUMABLES,
  COOK_CONSUMABLES,
  BREWER_CONSUMABLES,
  SCRIBE_CONSUMABLES,
  SMELTER_CONSUMABLES,
  ALL_CONSUMABLE_RECIPES,
} from './consumables';
import { ACCESSORY_RECIPES } from './accessories';
import { ENCHANTMENT_RECIPES } from './enchantments';
import { HOUSING_RECIPES } from './housing';
import { MOUNT_GEAR_RECIPES } from './mount-gear';
import { ARMORER_RECIPES, LEATHERWORKER_ARMOR_RECIPES, TAILOR_ARMOR_RECIPES, ALL_ARMOR_RECIPES } from './armor';

export { SMELTER_RECIPES } from './smelter';
export { TANNER_RECIPES } from './tanner';
export { TAILOR_RECIPES } from './tailor';
export { MASON_RECIPES } from './mason';
export { WOODWORKER_RECIPES } from './woodworker';
export { BLACKSMITH_WEAPON_RECIPES } from './weapons';
export { RANGED_WEAPON_RECIPES } from './ranged-weapons';
export {
  ALCHEMIST_CONSUMABLES,
  COOK_CONSUMABLES,
  BREWER_CONSUMABLES,
  SCRIBE_CONSUMABLES,
  SMELTER_CONSUMABLES,
  ALL_CONSUMABLE_RECIPES,
} from './consumables';
export { ACCESSORY_RECIPES } from './accessories';
export { ENCHANTMENT_RECIPES } from './enchantments';
export { HOUSING_RECIPES } from './housing';
export { MOUNT_GEAR_RECIPES } from './mount-gear';
export { ARMORER_RECIPES, LEATHERWORKER_ARMOR_RECIPES, TAILOR_ARMOR_RECIPES, ALL_ARMOR_RECIPES } from './armor';

/** All processing recipes across all professions. */
export const ALL_PROCESSING_RECIPES: RecipeDefinition[] = [
  ...SMELTER_RECIPES,
  ...TANNER_RECIPES,
  ...TAILOR_RECIPES,
  ...MASON_RECIPES,
  ...WOODWORKER_RECIPES,
];

/** All accessory, enchantment, housing, and mount gear recipes. */
export const ALL_ACCESSORY_RECIPES: RecipeDefinition[] = [
  ...ACCESSORY_RECIPES,
  ...ENCHANTMENT_RECIPES,
  ...HOUSING_RECIPES,
  ...MOUNT_GEAR_RECIPES,
];

// Pre-build lookup maps
const byId = new Map<string, RecipeDefinition>();
const byProfession = new Map<CraftingProfession, RecipeDefinition[]>();

for (const r of [...ALL_PROCESSING_RECIPES, ...ALL_ACCESSORY_RECIPES]) {
  byId.set(r.recipeId, r);
  const list = byProfession.get(r.professionRequired) ?? [];
  list.push(r);
  byProfession.set(r.professionRequired, list);
}

/** Look up a recipe by its stable recipeId. */
export function getRecipeById(recipeId: string): RecipeDefinition | undefined {
  return byId.get(recipeId);
}

/** Get all recipes for a given crafting profession. */
export function getRecipesByProfession(profession: CraftingProfession): RecipeDefinition[] {
  return byProfession.get(profession) ?? [];
}

/** Get all recipes a character can craft at a given profession level. */
export function getAvailableRecipes(
  profession: CraftingProfession,
  level: number,
): RecipeDefinition[] {
  return (byProfession.get(profession) ?? []).filter(
    (r) => r.levelRequired <= level,
  );
}

/** Get all recipes at or below a given tier. */
export function getRecipesByMaxTier(maxTier: number): RecipeDefinition[] {
  return ALL_PROCESSING_RECIPES.filter((r) => r.tier <= maxTier);
}

// ============================================================
// Weapon Recipes (finished goods)
// ============================================================

/** All weapon recipes (blacksmith melee + fletcher/ranged). */
export const ALL_WEAPON_RECIPES: FinishedGoodsRecipe[] = [
  ...BLACKSMITH_WEAPON_RECIPES,
  ...RANGED_WEAPON_RECIPES,
];

// ============================================================
// Armor Recipes (finished goods)
// ============================================================

/** All finished goods recipes (weapons + armor). */
export const ALL_FINISHED_GOODS_RECIPES: FinishedGoodsRecipe[] = [
  ...ALL_WEAPON_RECIPES,
  ...ALL_ARMOR_RECIPES,
];

// Pre-build finished goods lookup maps
const finishedGoodsById = new Map<string, FinishedGoodsRecipe>();
const finishedGoodsByProfession = new Map<CraftingProfession, FinishedGoodsRecipe[]>();

for (const r of ALL_FINISHED_GOODS_RECIPES) {
  finishedGoodsById.set(r.recipeId, r);
  const list = finishedGoodsByProfession.get(r.professionRequired) ?? [];
  list.push(r);
  finishedGoodsByProfession.set(r.professionRequired, list);
}

/** Look up a finished goods recipe by its stable recipeId. */
export function getFinishedGoodsRecipeById(recipeId: string): FinishedGoodsRecipe | undefined {
  return finishedGoodsById.get(recipeId);
}

/** Get all finished goods recipes for a given crafting profession. */
export function getFinishedGoodsByProfession(profession: CraftingProfession): FinishedGoodsRecipe[] {
  return finishedGoodsByProfession.get(profession) ?? [];
}

// ============================================================
// Consumable Recipes (potions, food, drinks, scrolls)
// ============================================================

// Pre-build consumable lookup maps
const consumableById = new Map<string, ConsumableRecipe>();
const consumableByProfession = new Map<ConsumableProfession, ConsumableRecipe[]>();

for (const r of ALL_CONSUMABLE_RECIPES) {
  consumableById.set(r.recipeId, r);
  const list = consumableByProfession.get(r.professionRequired) ?? [];
  list.push(r);
  consumableByProfession.set(r.professionRequired, list);
}

/** Look up a consumable recipe by its stable recipeId. */
export function getConsumableRecipeById(recipeId: string): ConsumableRecipe | undefined {
  return consumableById.get(recipeId);
}

/** Get all consumable recipes for a given profession. */
export function getConsumableRecipesByProfession(profession: ConsumableProfession): ConsumableRecipe[] {
  return consumableByProfession.get(profession) ?? [];
}

/** Get all consumable recipes a character can craft at a given profession level. */
export function getAvailableConsumableRecipes(
  profession: ConsumableProfession,
  level: number,
): ConsumableRecipe[] {
  return (consumableByProfession.get(profession) ?? []).filter(
    (r) => r.levelRequired <= level,
  );
}
