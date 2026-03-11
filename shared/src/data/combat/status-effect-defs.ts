/**
 * Status Effect Mechanics — Single Source of Truth
 *
 * Every status effect's mechanical impact is defined here.
 * The combat engine reads from this map to apply modifiers, restrictions,
 * and special interactions. Tune effects here, not in scattered engine code.
 */

import type { StatusEffectName, CombatDamageType } from '../../types/combat';

export interface StatusEffectMechanics {
  /** Whether the combatant skips their turn entirely */
  preventsAction: boolean;
  /** Modifier to the combatant's attack rolls */
  attackMod: number;
  /** Modifier to the combatant's AC */
  acMod: number;
  /** Modifier to ALL saving throws */
  saveMod: number;
  /** Additional modifier to DEX saving throws (stacks with saveMod) */
  dexSaveMod: number;
  /** Additional modifier to STR saving throws (stacks with saveMod) */
  strSaveMod: number;
  /** Modifier to damage dealt by the combatant */
  damageDealtMod: number;
  /** Multiplier on incoming healing (1.0 = normal, 0.5 = halved) */
  healingReceivedMult: number;
  /** Prevents using multiattack abilities (only single attacks allowed) */
  blocksMultiattack: boolean;
  /** Prevents fleeing */
  blocksFlee: boolean;
  /** Prevents casting spells / class abilities */
  blocksSpells: boolean;
  /** Prevents movement-based abilities (Vanish, Blink Strike, Disengage) */
  blocksMovementAbilities: boolean;
  /** Bonus that attackers get against this target (e.g., +2 vs blinded) */
  grantsAdvantageToAttackers: number;
  /** Whether this effect deals damage per round */
  hasDot: boolean;
  /** Default DoT damage if not specified by the effect instance */
  dotDamageBase: number;
  /** Whether this effect heals per round */
  hasHot: boolean;
  /** Default HoT healing if not specified by the effect instance */
  hotHealingBase: number;
  /** Takes extra damage from these damage types while active */
  vulnerableTo?: CombatDamageType[];
  /** Status is removed if hit by these damage types */
  removedBy?: CombatDamageType[];
  /** Immune to these damage types while active */
  immuneTo?: CombatDamageType[];
  /** AI behavior override when this status is active */
  aiPreference?: 'defensive' | 'flee';
  /** Percentage chance AI attempts flee each turn (0-100) */
  fleeChance?: number;
  /** Auto-fail DEX saves (stunned, paralyzed) */
  autoFailDexSave?: boolean;
  /** Auto-fail STR saves (stunned, paralyzed) */
  autoFailStrSave?: boolean;
  /** Melee attacks auto-crit against this target (paralyzed) */
  meleeAutoCrit?: boolean;
  /** All attacks get bonus attack against this target (stunned: +4) */
  attackBonusVsTarget?: number;
  /** Bonus (or penalty) to flee save rolls while this effect is active */
  fleeBonus?: number;
  /** Player-friendly description of the effect */
  description: string;
}

export const STATUS_EFFECT_MECHANICS: Record<StatusEffectName, StatusEffectMechanics> = {
  // ========== MOVEMENT / SPEED EFFECTS ==========

  slowed: {
    preventsAction: false,
    attackMod: 0,
    acMod: -2,
    saveMod: 0,
    dexSaveMod: -2,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: true,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    fleeChance: 0,
    description: 'Movements become sluggish. -2 AC, -2 DEX saves, cannot use multiattack abilities, +5 flee DC.',
  },

  root: {
    preventsAction: false,
    attackMod: 0,
    acMod: -3,
    saveMod: 0,
    dexSaveMod: -2,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: true,
    blocksSpells: false,
    blocksMovementAbilities: true,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Pinned in place. -3 AC, -2 DEX saves, cannot flee or use movement abilities.',
  },

  // Reserved — no abilities currently apply this effect
  restrained: {
    preventsAction: false,
    attackMod: 0,
    acMod: -4,
    saveMod: 0,
    dexSaveMod: -4,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: true,
    blocksFlee: true,
    blocksSpells: false,
    blocksMovementAbilities: true,
    grantsAdvantageToAttackers: 2,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Bound and unable to move freely. -4 AC, -4 DEX saves, cannot multiattack or flee, attackers get +2.',
  },

  // ========== MENTAL EFFECTS ==========

  frightened: {
    preventsAction: false,
    attackMod: -2,
    acMod: 0,
    saveMod: -2,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    aiPreference: 'defensive',
    fleeChance: 30,
    description: 'Shaking with fear. -2 attack rolls, -2 saving throws, prefers defensive actions, 30% chance to flee.',
  },

  mesmerize: {
    preventsAction: false, // Changed: can act, but cannot target charmer
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Charmed. Cannot attack the charmer. If charmer is the only enemy, skips turn. Breaks on damage.',
  },

  dominated: {
    preventsAction: true,
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Mind controlled. Attacks own allies. Most powerful CC in the game.',
  },

  // ========== ACTION-PREVENTING EFFECTS ==========

  stunned: {
    preventsAction: true,
    attackMod: 0,
    acMod: -4,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 4,
    autoFailDexSave: true,
    autoFailStrSave: true,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Incapacitated. Skips turn, -4 AC, auto-fail DEX/STR saves, attackers get +4 bonus.',
  },

  paralyzed: {
    preventsAction: true,
    attackMod: 0,
    acMod: -4,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 4,
    autoFailDexSave: true,
    autoFailStrSave: true,
    meleeAutoCrit: true,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Completely paralyzed. Skips turn, -4 AC, auto-fail DEX/STR saves, melee attacks auto-crit.',
  },

  frozen: {
    preventsAction: true,
    attackMod: 0,
    acMod: -4,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    vulnerableTo: ['BLUDGEONING'],
    removedBy: ['FIRE'],
    immuneTo: ['COLD'],
    description: 'Encased in ice. Skips turn, -4 AC, immune to COLD, vulnerable to BLUDGEONING, thaws on FIRE damage.',
  },

  knocked_down: {
    preventsAction: false,
    attackMod: 0,
    acMod: -4,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 2, // melee only; ranged gets -2 (handled in engine)
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Knocked prone. -4 AC, melee attackers get +2, ranged attackers get -2.',
  },

  skip_turn: {
    preventsAction: true,
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Loses turn. No other effects.',
  },

  polymorph: {
    preventsAction: false,
    attackMod: -4,
    acMod: -5,
    saveMod: -2,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: true,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Transformed into a weak creature. -4 attack, -5 AC, -2 saves, cannot use abilities.',
  },

  // ========== DAMAGE OVER TIME ==========

  poisoned: {
    preventsAction: false,
    attackMod: -2,
    acMod: 0,
    saveMod: -2,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: true,
    dotDamageBase: 3,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Poisoned. Takes damage each round, -2 attack rolls, -2 saving throws.',
  },

  burning: {
    preventsAction: false,
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: true,
    dotDamageBase: 5,
    hasHot: false,
    hotHealingBase: 0,
    removedBy: ['COLD'],
    description: 'On fire. Takes fire damage each round. Removed by COLD damage or Defend action (stop, drop, roll).',
  },

  diseased: {
    preventsAction: false,
    attackMod: -2,
    acMod: -2,
    saveMod: -2,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: -2,
    healingReceivedMult: 0.5,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Diseased. -2 attack, -2 AC, -2 saves, -2 damage dealt, healing received halved. Does not expire naturally.',
  },

  // ========== DEFENSIVE EFFECTS (DEBUFFS) ==========

  weakened: {
    preventsAction: false,
    attackMod: -3,
    acMod: -2,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: -2,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Debilitated. -3 attack rolls, -2 damage dealt, -2 AC.',
  },

  blinded: {
    preventsAction: false,
    attackMod: -4,
    acMod: -4,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 2,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Cannot see. -4 attack rolls, -4 AC, attackers get +2 bonus.',
  },

  silence: {
    preventsAction: false,
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: true,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Cannot speak. Blocks casting and class abilities (except damage/passive). Does not block psion or monster abilities.',
  },

  // ========== POSITIVE EFFECTS ==========

  blessed: {
    preventsAction: false,
    attackMod: 2,
    acMod: 0,
    saveMod: 2,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Blessed. +2 attack rolls, +2 saving throws.',
  },

  shielded: {
    preventsAction: false,
    attackMod: 0,
    acMod: 4,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Shielded. +4 AC. Absorbs damage before HP is affected.',
  },

  hasted: {
    preventsAction: false,
    attackMod: 2,
    acMod: 2,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Hasted. +2 attack rolls, +2 AC. Extra action per turn.',
  },

  regenerating: {
    preventsAction: false,
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: true,
    hotHealingBase: 5,
    description: 'Regenerating. Heals HP each round. Disabled by FIRE or ACID damage.',
  },

  foresight: {
    preventsAction: false,
    attackMod: 0,
    acMod: 2,
    saveMod: 0,
    dexSaveMod: 2,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Precognitive awareness. +2 AC, +2 DEX saves.',
  },

  phased: {
    preventsAction: false,
    attackMod: 0,
    acMod: 4,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Phased out of reality. +4 AC.',
  },

  // ========== SPECIAL ==========

  swallowed: {
    preventsAction: false,
    attackMod: -4,
    acMod: -2,
    saveMod: -2,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Swallowed by a creature. Can only attack the swallower. Takes acid damage each round.',
  },

  taunt: {
    preventsAction: false,
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Forced to attack the taunter. Cannot switch targets.',
  },

  banished: {
    preventsAction: true,
    attackMod: 0,
    acMod: 0,
    saveMod: 0,
    dexSaveMod: 0,
    strSaveMod: 0,
    damageDealtMod: 0,
    healingReceivedMult: 1.0,
    blocksMultiattack: false,
    blocksFlee: false,
    blocksSpells: false,
    blocksMovementAbilities: false,
    grantsAdvantageToAttackers: 0,
    hasDot: false,
    dotDamageBase: 0,
    hasHot: false,
    hotHealingBase: 0,
    description: 'Removed from combat for several rounds. Cannot act or be targeted.',
  },
};
