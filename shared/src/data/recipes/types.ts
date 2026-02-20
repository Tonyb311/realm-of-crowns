/**
 * Recipe type definitions for Realm of Crowns
 */

import type { ItemName } from '../items/item-names';
export { ITEMS, type ItemName } from '../items/item-names';

export type ProcessingProfession =
  | 'SMELTER'
  | 'TANNER'
  | 'TAILOR'
  | 'MASON'
  | 'WOODWORKER';

export type CraftingProfession =
  | ProcessingProfession
  | 'BLACKSMITH'
  | 'ARMORER'
  | 'LEATHERWORKER'
  | 'ALCHEMIST'
  | 'COOK'
  | 'BREWER'
  | 'ENCHANTER'
  | 'JEWELER'
  | 'FLETCHER'
  | 'SCRIBE'
  | 'STABLE_MASTER';

export interface RecipeInput {
  itemName: ItemName;
  quantity: number;
}

export interface RecipeOutput {
  itemName: ItemName;
  quantity: number;
}

export interface RecipeDefinition {
  recipeId: string;
  name: string;
  professionRequired: CraftingProfession;
  levelRequired: number;
  inputs: RecipeInput[];
  outputs: RecipeOutput[];
  craftTime: number;   // minutes
  xpReward: number;
  tier: number;        // 1-5
}

// --- Finished goods types ---

export type DamageType = 'slashing' | 'piercing' | 'bludgeoning';

export type EquipSlot =
  | 'MAIN_HAND'
  | 'OFF_HAND'
  | 'HEAD'
  | 'CHEST'
  | 'HANDS'
  | 'LEGS'
  | 'FEET'
  | 'RING_1'
  | 'RING_2'
  | 'NECK'
  | 'BACK';

export type OutputItemType =
  | 'WEAPON'
  | 'ARMOR'
  | 'CONSUMABLE'
  | 'ACCESSORY'
  | 'TOOL'
  | 'HOUSING';

export interface WeaponStats {
  baseDamage: number;
  damageType: DamageType;
  speed: number;          // attacks per round (higher = faster)
  requiredStr: number;
  requiredDex: number;
  durability: number;
  levelToEquip: number;
  twoHanded?: boolean;
  range?: number;         // for ranged weapons
}

export interface QualityMultiplier {
  POOR: number;
  COMMON: number;
  FINE: number;
  SUPERIOR: number;
  MASTERWORK: number;
  LEGENDARY: number;
}

export const QUALITY_MULTIPLIERS: QualityMultiplier = {
  POOR: 0.7,
  COMMON: 1.0,
  FINE: 1.15,
  SUPERIOR: 1.3,
  MASTERWORK: 1.5,
  LEGENDARY: 1.8,
};

export interface FinishedGoodsRecipe {
  recipeId: string;
  name: string;
  professionRequired: CraftingProfession;
  levelRequired: number;
  inputs: RecipeInput[];
  outputs: RecipeOutput[];
  craftTime: number;        // minutes
  xpReward: number;
  tier: number;             // 1-5
  outputItemType: OutputItemType;
  outputStats: WeaponStats | ArmorStats | ConsumableStats | Record<string, number>;
  equipSlot?: EquipSlot;
  classRestrictions?: string[];
  specialization?: string | null;  // e.g. 'TOOLSMITH' | 'WEAPONSMITH' | 'ARMORER'
}

// --- Armor stats ---

export type ArmorSlot = 'HEAD' | 'CHEST' | 'HANDS' | 'LEGS' | 'FEET' | 'BACK' | 'OFF_HAND';
export type ArmorCategory = 'cloth' | 'leather' | 'mail' | 'plate' | 'shield';

export interface ArmorStats {
  armor: number;
  magicResist?: number;
  durability: number;
  levelToEquip: number;
  requiredStr?: number;
  movementPenalty?: number;
  stealthPenalty?: number;
}

// --- Consumable stats ---

export type ConsumableEffect =
  | 'heal_hp'
  | 'heal_mana'
  | 'buff_strength'
  | 'buff_dexterity'
  | 'buff_intelligence'
  | 'buff_constitution'
  | 'buff_wisdom'
  | 'buff_charisma'
  | 'cure_poison'
  | 'cure_disease'
  | 'apply_poison'
  | 'damage_fire'
  | 'damage_area'
  | 'blind'
  | 'obscure'
  | 'hp_regen'
  | 'mana_regen'
  | 'buff_all_stats'
  | 'buff_strength_debuff_intelligence'
  | 'reveal_map'
  | 'identify'
  | 'damage_ice'
  | 'damage_lightning'
  | 'damage_healing'
  | 'cure_all'
  | 'poison_immunity'
  | 'sustenance'
  | 'buff_armor'
  | 'stun';

export interface ConsumableStats {
  effect: ConsumableEffect;
  magnitude: number;
  duration: number;       // minutes of real time (0 = instant)
  stackSize: number;
  secondaryEffect?: ConsumableEffect;
  secondaryMagnitude?: number;
}

export type ConsumableProfession = 'ALCHEMIST' | 'COOK' | 'BREWER' | 'SCRIBE' | 'SMELTER' | 'TANNER';

export interface ConsumableRecipe {
  recipeId: string;
  name: string;
  professionRequired: ConsumableProfession;
  levelRequired: number;
  inputs: RecipeInput[];
  output: RecipeOutput;
  consumableStats: ConsumableStats;
  craftTime: number;   // minutes
  xpReward: number;
  tier: number;        // 1-5
  description: string;
}
