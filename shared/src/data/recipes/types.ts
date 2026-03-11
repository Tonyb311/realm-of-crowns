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

export type DamageType = 'slashing' | 'piercing' | 'bludgeoning'
  | 'FORCE' | 'RADIANT' | 'THUNDER' | 'PSYCHIC';

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
  | 'BACK'
  | 'BAG';

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
  diceCount?: number;     // e.g. 1 for 1d6 (caster weapons)
  diceSides?: number;     // e.g. 6 for 1d6 (caster weapons)
  bonusAttack?: number;   // flat attack bonus
  bonusDamage?: number;   // flat damage bonus
  weight?: number;        // item weight in lbs
  damageModifierStat?: string;  // stat key for damage modifier (str/dex/int/wis/cha)
  attackModifierStat?: string;  // stat key for attack modifier (str/dex/int/wis/cha)
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
  weight?: number;        // item weight in lbs
  fleeBonus?: number;     // bonus to flee save rolls (e.g., Boots of Escape +2)
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
  weight?: number;        // weight per unit in lbs
}

export type ConsumableProfession = 'ALCHEMIST' | 'COOK' | 'BREWER' | 'SCRIBE' | 'SMELTER' | 'TANNER';

// ============================================================
// PROFICIENCY CATEGORY DERIVATION
// ============================================================

import type { ProfArmorCategory, ProfWeaponCategory } from '../combat-constants';

const SIMPLE_MELEE_NAMES = ['dagger', 'mace', 'spear', 'club', 'quarterstaff', 'sickle', 'javelin', 'handaxe', 'light hammer'];
const INSTRUMENT_NAMES = ['drum', 'lute', 'flute', 'horn', 'harp', 'fiddle', 'pipes', 'lyre', 'tambourine'];

/** Derive armor proficiency category from recipe metadata */
export function deriveArmorCategory(recipe: FinishedGoodsRecipe): ProfArmorCategory | null {
  if (recipe.outputItemType !== 'ARMOR') return null;
  if (recipe.equipSlot === 'OFF_HAND') return 'shield';
  switch (recipe.professionRequired) {
    case 'ARMORER': return 'heavy';
    case 'TANNER': return 'medium';
    case 'TAILOR': return 'none';  // cloth = always proficient
    case 'LEATHERWORKER':
      return recipe.tier <= 1 ? 'light' : 'medium';
    default: return null;
  }
}

/** Derive weapon proficiency category from recipe metadata */
export function deriveWeaponCategory(recipe: FinishedGoodsRecipe): ProfWeaponCategory | null {
  if (recipe.outputItemType !== 'WEAPON') return null;
  const stats = recipe.outputStats as WeaponStats;
  const name = recipe.name.toLowerCase();

  // Caster weapon types by damage type
  if (stats.damageType === 'FORCE' && (name.includes('staff') || stats.twoHanded)) return 'staff';
  if (stats.damageType === 'FORCE' && name.includes('wand')) return 'wand';
  if (stats.damageType === 'RADIANT' && (name.includes('holy') || name.includes('symbol'))) return 'holy_symbol';
  if (stats.damageType === 'THUNDER' || INSTRUMENT_NAMES.some(i => name.includes(i))) return 'instrument';
  if (stats.damageType === 'PSYCHIC' && name.includes('orb')) return 'orb';
  if (stats.damageType === 'PSYCHIC' && (name.includes('staff') || stats.twoHanded)) return 'staff';

  // Ranged weapons
  if (stats.range || name.includes('bow') || name.includes('crossbow') || name.includes('throwing')) {
    // Simple ranged: shortbow, throwing knives, sling
    if (name.includes('short') || name.includes('throwing') || name.includes('sling') || name.includes('practice')) {
      return 'simple_ranged';
    }
    return 'martial_ranged';
  }

  // Melee weapons
  if (SIMPLE_MELEE_NAMES.some(s => name.includes(s))) return 'simple_melee';
  return 'martial_melee';
}

/** Add proficiency categories to recipe outputStats at export time */
export function tagRecipesWithCategories<T extends FinishedGoodsRecipe>(recipes: T[]): T[] {
  return recipes.map(recipe => {
    const armorCat = deriveArmorCategory(recipe);
    const weaponCat = deriveWeaponCategory(recipe);
    if (!armorCat && !weaponCat) return recipe;
    return {
      ...recipe,
      outputStats: {
        ...recipe.outputStats,
        ...(armorCat != null && { armorCategory: armorCat }),
        ...(weaponCat != null && { weaponCategory: weaponCat }),
      },
    };
  });
}

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
