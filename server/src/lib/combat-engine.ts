/**
 * Core turn-based combat engine for Realm of Crowns.
 * Pure functions — no database calls. All state is passed in and returned.
 */

import {
  attackRoll,
  damageRoll,
  criticalDamageRoll,
  initiativeRoll,
  savingThrow,
  fleeCheck,
} from '@shared/utils/dice';

import type {
  CharacterStats,
  CombatAction,
  CombatState,
  Combatant,
  StatusEffect,
  StatusEffectName,
  WeaponInfo,
  SpellInfo,
  ItemInfo,
  TurnResult,
  AttackResult,
  AttackModifierBreakdown,
  CastResult,
  DefendResult,
  ItemResult,
  FleeResult,
  RacialAbilityActionResult,
  PsionAbilityResult,
  ClassAbilityResult,
  MonsterAbilityResult,
  StatusTickResult,
  TurnLogEntry,
  DeathPenalty,
  CombatDamageType,
  DamageTypeResult,
  CritResult,
  FumbleResult,
  D100Modifier,
  MonsterAbilityInstance,
  LegendaryResistanceResult,
  AuraResult,
  LegendaryActionResult,
  DeathThroesResult,
  PhaseTransition,
  PhaseTransitionResult,
  PhaseTransitionEffect,
} from '@shared/types/combat';

import { getModifier } from '@shared/types/combat';
import { getSaveModifier } from '@shared/utils/bounded-accuracy';

import type { RacialCombatTracker } from '../services/racial-combat-abilities';
import {
  getPassiveModifiers,
  resolveRacialAbility,
  checkDeathPrevention,
  checkBonusAttackOnKill,
  checkMeleeReflect,
  tickActiveBuffs,
  checkAutoHit,
  processPrimordialAwakeningDot,
} from '../services/racial-combat-abilities';
import { getBeastfolkNaturalWeapon } from '../services/racial-passive-tracker';
import { psionAbilities } from '@shared/data/skills/psion';
import { DEATH_PENALTY, getDeathXpPenalty, getDeathDurabilityPenalty } from '@shared/data/progression';
import { getFeatById } from '@shared/data/feats';
import {
  resolveClassAbility,
  tickAbilityCooldowns as tickClassAbilityCooldowns,
  tickActiveBuffs as tickClassActiveBuffs,
  tickDelayedEffects,
  getBuffAttackMod,
  getBuffAcMod,
  getBuffDamageMod,
  getBuffDamageReduction,
  consumeAbsorption,
  checkDeathPrevention as checkClassDeathPrevention,
} from './class-ability-resolver';
import {
  lookupCritChart,
  lookupFumbleChart,
  getCritChartType,
  getFumbleChartType,
  getFumbleLevelCap,
  getCritSeverity,
  getFumbleSeverity,
} from '@shared/data/combat/crit-charts';
import { resolveOnHitAbilities } from './monster-ability-resolver';

// ---- Constants ----

const DEFEND_AC_BONUS = 2;
const BASE_AC = 10;
const DEFAULT_FLEE_DC = 10;
const DEATH_GOLD_LOSS_PERCENT = DEATH_PENALTY.GOLD_LOSS_PERCENT;

/** Helper to create a no-op defend result (used as fallback in racial ability handlers). */
function noOpDefend(actorId: string): DefendResult {
  return { type: 'defend', actorId, acBonusGranted: 0 };
}

/** Aggregate a specific numeric feat effect for a combatant */
function getFeatBonus(combatant: Combatant, key: 'attackBonus' | 'acBonus' | 'initiativeBonus' | 'critDamageBonus' | 'allSaveBonus'): number {
  if (!combatant.featIds) return 0;
  let total = 0;
  for (const fid of combatant.featIds) {
    const feat = getFeatById(fid);
    if (feat?.effects[key]) total += feat.effects[key]!;
  }
  return total;
}

/** Non-proficient armor penalty: -3 to STR and DEX saving throws */
function getNonProfArmorSavePenalty(target: Combatant, saveType: string): number {
  if (!target.nonProficientArmor) return 0;
  if (saveType === 'str' || saveType === 'dex') return -3;
  return 0;
}

// ---- Status Effect Definitions ----
// Numeric modifiers driven by STATUS_EFFECT_MECHANICS from shared package.
// This interface adds dotDamage/hotHealing functions for tick processing.

import { STATUS_EFFECT_MECHANICS } from '@shared/data/combat/status-effect-defs';
export { STATUS_EFFECT_MECHANICS };

interface StatusEffectDef {
  /** Whether the combatant can take actions */
  preventsAction: boolean;
  /** Damage dealt per round at start of turn */
  dotDamage: (effect: StatusEffect) => number;
  /** Healing per round at start of turn */
  hotHealing: (effect: StatusEffect) => number;
  /** Modifier to attack rolls */
  attackModifier: number;
  /** Modifier to AC */
  acModifier: number;
  /** Modifier to saving throws */
  saveModifier: number;
}

// Build STATUS_EFFECT_DEFS from the centralized mechanics map
export const STATUS_EFFECT_DEFS: Record<StatusEffectName, StatusEffectDef> = Object.fromEntries(
  (Object.keys(STATUS_EFFECT_MECHANICS) as StatusEffectName[]).map(name => {
    const m = STATUS_EFFECT_MECHANICS[name];
    return [name, {
      preventsAction: m.preventsAction,
      dotDamage: m.hasDot ? (e: StatusEffect) => e.damagePerRound ?? m.dotDamageBase : () => 0,
      hotHealing: m.hasHot ? (e: StatusEffect) => e.damagePerRound ?? m.hotHealingBase : () => 0,
      attackModifier: m.attackMod,
      acModifier: m.acMod,
      saveModifier: m.saveMod,
    }];
  })
) as Record<StatusEffectName, StatusEffectDef>;

// ---- Initiative ----

/** Roll initiative for a combatant and return an updated copy. */
export function calculateInitiative(combatant: Combatant): Combatant {
  const dexMod = getModifier(combatant.stats.dex);
  // Phase 6 PSION-PASSIVE-2: initiativeBonus adds to initiative roll
  const bonus = (combatant.initiativeBonus ?? 0) + getFeatBonus(combatant, 'initiativeBonus');
  return {
    ...combatant,
    initiative: initiativeRoll(dexMod) + bonus,
  };
}

/** Roll initiative for all combatants and produce a sorted turn order. */
export function rollAllInitiative(state: CombatState): CombatState {
  const combatants = state.combatants.map(calculateInitiative);

  // Sort by initiative descending, break ties by DEX, then random
  const turnOrder = [...combatants]
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if (b.stats.dex !== a.stats.dex) return b.stats.dex - a.stats.dex;
      return Math.random() - 0.5;
    })
    .map((c) => c.id);

  return {
    ...state,
    combatants,
    turnOrder,
    round: 1,
    turnIndex: 0,
  };
}

// ---- AC Calculation ----

/** Calculate effective AC for a combatant, including status effects, defend stance, and racial bonuses. */
export function calculateAC(combatant: Combatant, racialTracker?: RacialCombatTracker): number {
  const dexMod = getModifier(combatant.stats.dex);
  let ac = BASE_AC + dexMod;

  // Add equipment AC (stored on combatant.ac as base from equipment)
  // We use the combatant.ac field if it was set from equipment, otherwise compute from stats
  if (combatant.ac > 0) {
    ac = combatant.ac;
  }

  // Defend bonus
  if (combatant.isDefending) {
    ac += DEFEND_AC_BONUS;
  }

  // Status effect modifiers
  for (const effect of combatant.statusEffects) {
    const def = STATUS_EFFECT_DEFS[effect.name];
    if (def) {
      ac += def.acModifier;
    }
  }

  // Racial passive AC bonuses
  if (combatant.race) {
    const racialMods = getPassiveModifiers(combatant, combatant.race, combatant.level, combatant.subRace, racialTracker);
    ac += racialMods.acBonus;
  }

  // Class ability buff AC bonuses
  ac += getBuffAcMod(combatant);

  // Feat AC bonus
  ac += getFeatBonus(combatant, 'acBonus');

  return ac;
}

// ---- Damage Calculation ----

/**
 * Calculate damage from a weapon attack.
 * Returns the total damage after rolling weapon dice + stat modifier + weapon bonus.
 */
export function calculateDamage(
  attacker: Combatant,
  weapon: WeaponInfo,
  critical: boolean
): { rolls: number[]; total: number } {
  const statMod = getModifier(attacker.stats[weapon.damageModifierStat]);
  const modifier = statMod + weapon.bonusDamage;

  if (critical) {
    return criticalDamageRoll(weapon.diceCount, weapon.diceSides, modifier);
  }
  return damageRoll(weapon.diceCount, weapon.diceSides, modifier);
}

// ---- Damage Type Interaction ----

/**
 * Apply damage type interaction (resistance/immunity/vulnerability).
 * Returns a DamageTypeResult with the modified damage.
 */
export function applyDamageTypeInteraction(
  damage: number,
  damageType: CombatDamageType,
  target: Combatant,
): DamageTypeResult {
  // Check status-based immunities (frozen: immune to COLD)
  for (const eff of target.statusEffects) {
    const mech = STATUS_EFFECT_MECHANICS[eff.name];
    if (mech?.immuneTo?.includes(damageType)) {
      return {
        originalDamage: damage,
        damageType,
        interaction: 'immune',
        multiplier: 0,
        finalDamage: 0,
      };
    }
  }

  // Check immunity first
  if (target.immunities?.includes(damageType)) {
    return {
      originalDamage: damage,
      damageType,
      interaction: 'immune',
      multiplier: 0,
      finalDamage: 0,
    };
  }

  // Check status-based vulnerabilities (frozen: vulnerable to BLUDGEONING = +50%)
  for (const eff of target.statusEffects) {
    const mech = STATUS_EFFECT_MECHANICS[eff.name];
    if (mech?.vulnerableTo?.includes(damageType)) {
      return {
        originalDamage: damage,
        damageType,
        interaction: 'vulnerable',
        multiplier: 1.5,
        finalDamage: Math.floor(damage * 1.5),
      };
    }
  }

  // Check vulnerability (double damage)
  if (target.vulnerabilities?.includes(damageType)) {
    return {
      originalDamage: damage,
      damageType,
      interaction: 'vulnerable',
      multiplier: 2,
      finalDamage: damage * 2,
    };
  }

  // Check resistance (half damage)
  if (target.resistances?.includes(damageType)) {
    return {
      originalDamage: damage,
      damageType,
      interaction: 'resistant',
      multiplier: 0.5,
      finalDamage: Math.floor(damage / 2),
    };
  }

  return {
    originalDamage: damage,
    damageType,
    interaction: 'normal',
    multiplier: 1,
    finalDamage: damage,
  };
}

// ---- Legendary Resistance ----

/**
 * Check if a monster can override a failed save with Legendary Resistance.
 * Consumes one LR charge. Only fires for monsters with remaining charges.
 */
export function checkLegendaryResistance(
  state: CombatState,
  targetId: string,
  save: { roll: number; total: number; success: boolean },
  saveDC: number,
): { state: CombatState; overridden: boolean; lrResult?: LegendaryResistanceResult } {
  if (save.success) return { state, overridden: false };
  const target = state.combatants.find(c => c.id === targetId);
  if (!target || target.entityType !== 'monster') return { state, overridden: false };
  if (!target.legendaryResistancesRemaining || target.legendaryResistancesRemaining <= 0)
    return { state, overridden: false };

  const remaining = target.legendaryResistancesRemaining - 1;
  const lrResult: LegendaryResistanceResult = {
    originalRoll: save.roll,
    originalTotal: save.total,
    saveDC,
    wouldHaveFailed: true,
    resistanceUsed: true,
    resistancesRemaining: remaining,
  };
  state = {
    ...state,
    lastLegendaryResistance: lrResult,
    combatants: state.combatants.map(c =>
      c.id === targetId ? { ...c, legendaryResistancesRemaining: remaining } : c
    ),
  };
  return {
    state,
    overridden: true,
    lrResult,
  };
}

// ---- Status Effects ----

// Phase 5A: CC statuses that are blocked by ccImmune buffs
const CC_STATUSES: StatusEffectName[] = ['stunned', 'frozen', 'paralyzed', 'dominated', 'mesmerize', 'polymorph', 'root', 'skip_turn', 'swallowed'];

/** Apply a status effect to a combatant. Replaces if same effect already present. */
export function applyStatusEffect(
  combatant: Combatant,
  effectName: StatusEffectName,
  duration: number,
  sourceId: string,
  damagePerRound?: number
): Combatant {
  // Phase 5A BUFF-1: CC immunity check
  if (CC_STATUSES.includes(effectName) && combatant.activeBuffs?.some(b => b.ccImmune === true)) {
    return combatant; // CC immune, status not applied
  }

  // Condition immunity check (monster-specific)
  if (combatant.conditionImmunities?.includes(effectName)) {
    return combatant; // Condition immune, status not applied
  }

  // Player-specific immunity passives
  if (effectName === 'blinded' && combatant.immuneBlinded) {
    return combatant; // Immune to blinded (Psion Third Eye)
  }

  const id = `${effectName}-${sourceId}-${Date.now()}`;
  const newEffect: StatusEffect = {
    id,
    name: effectName,
    remainingRounds: duration,
    damagePerRound,
    sourceId,
  };

  // Remove existing instance of same effect type, replace with new
  const filtered = combatant.statusEffects.filter((e) => e.name !== effectName);

  return {
    ...combatant,
    statusEffects: [...filtered, newEffect],
  };
}

/**
 * Process status effects at the start of a combatant's turn.
 * Applies DoT/HoT damage, decrements durations, removes expired effects.
 * Returns updated combatant and tick results for logging.
 */
export function processStatusEffects(
  combatant: Combatant
): { combatant: Combatant; ticks: StatusTickResult[] } {
  const ticks: StatusTickResult[] = [];
  let hp = combatant.currentHp;
  const remaining: StatusEffect[] = [];
  const damageTypesReceived = combatant.damageTypesReceivedThisRound ?? [];

  for (const effect of combatant.statusEffects) {
    const def = STATUS_EFFECT_DEFS[effect.name];
    const mech = STATUS_EFFECT_MECHANICS[effect.name];
    if (!def || !mech) {
      remaining.push(effect);
      continue;
    }

    // Check if status is removed by damage type received this round
    if (mech.removedBy && mech.removedBy.length > 0) {
      const removed = damageTypesReceived.some(dt => mech.removedBy!.includes(dt));
      if (removed) {
        ticks.push({
          combatantId: combatant.id,
          effectName: effect.name,
          expired: true,
          hpAfter: hp,
          killed: hp <= 0,
        });
        continue; // Don't add to remaining — removed
      }
    }

    // Regenerating: disabled by FIRE or ACID damage this round
    if (effect.name === 'regenerating') {
      const regenDisabled = damageTypesReceived.some(dt => dt === 'FIRE' || dt === 'ACID');
      if (regenDisabled) {
        // Skip healing this tick but keep the status
        const newDuration = effect.remainingRounds - 1;
        const expired = newDuration <= 0;
        ticks.push({
          combatantId: combatant.id,
          effectName: effect.name,
          expired,
          hpAfter: hp,
          killed: hp <= 0,
        });
        if (!expired) {
          remaining.push({ ...effect, remainingRounds: newDuration });
        }
        continue;
      }
    }

    let damage = 0;
    let healing = 0;

    // Apply DoT
    const dotDmg = def.dotDamage(effect);
    if (dotDmg > 0) {
      damage = dotDmg;
      hp = Math.max(0, hp - damage);
    }

    // Apply HoT (reduced by healing modifiers like diseased)
    const hotHeal = def.hotHealing(effect);
    if (hotHeal > 0) {
      healing = hotHeal;
      // Check healing received multiplier from other status effects
      for (const otherEff of combatant.statusEffects) {
        if (otherEff.id === effect.id) continue;
        const otherMech = STATUS_EFFECT_MECHANICS[otherEff.name];
        if (otherMech && otherMech.healingReceivedMult !== 1.0) {
          healing = Math.floor(healing * otherMech.healingReceivedMult);
        }
      }
      hp = Math.min(combatant.maxHp, hp + healing);
    }

    // Diseased does not expire naturally — persists until cleansed
    const neverExpires = effect.name === 'diseased';
    const newDuration = neverExpires ? effect.remainingRounds : effect.remainingRounds - 1;
    const expired = !neverExpires && newDuration <= 0;

    ticks.push({
      combatantId: combatant.id,
      effectName: effect.name,
      damage: damage > 0 ? damage : undefined,
      healing: healing > 0 ? healing : undefined,
      expired,
      hpAfter: hp,
      killed: hp <= 0,
    });

    if (!expired) {
      remaining.push({ ...effect, remainingRounds: newDuration });
    }
  }

  return {
    combatant: {
      ...combatant,
      currentHp: hp,
      isAlive: hp > 0,
      statusEffects: remaining,
    },
    ticks,
  };
}

// ---- Individual Action Resolvers ----

/** Resolve a melee/ranged attack action, with racial ability integration. */
export function resolveAttack(
  state: CombatState,
  actorId: string,
  targetId: string,
  weapon: WeaponInfo,
  racialTracker?: RacialCombatTracker
): { state: CombatState; result: AttackResult } {
  let actor = state.combatants.find((c) => c.id === actorId)!;
  let target = state.combatants.find((c) => c.id === targetId)!;

  // Racial passive modifiers for the attacker
  const racialMods = actor.race
    ? getPassiveModifiers(actor, actor.race, actor.level, actor.subRace, racialTracker)
    : null;

  // Beastfolk natural weapon fallback
  if (!weapon && actor.race === 'beastfolk') {
    const natural = getBeastfolkNaturalWeapon(actor.level);
    if (natural) weapon = natural;
  }

  // Polymorph: reduce to 1d4 damage, no weapon bonuses
  const isPolymorphed = actor.statusEffects.some(e => e.name === 'polymorph');
  if (isPolymorphed) {
    weapon = { ...weapon, diceCount: 1, diceSides: 4, bonusDamage: 0, bonusAttack: 0 };
  }

  // Calculate attack modifier (stat + proficiency + weapon bonus)
  const statMod = getModifier(actor.stats[weapon.attackModifierStat]);
  let atkMod = statMod + actor.proficiencyBonus + weapon.bonusAttack;

  // Track individual modifier sources for logging
  const atkModBreakdown: AttackModifierBreakdown[] = [
    { source: weapon.attackModifierStat.toUpperCase(), value: statMod },
    { source: 'proficiency', value: actor.proficiencyBonus },
  ];
  if (weapon.bonusAttack !== 0) {
    atkModBreakdown.push({ source: 'weaponBonus', value: weapon.bonusAttack });
  }

  // Apply status effect modifiers to attack roll
  let statusAtkMod = 0;
  for (const effect of actor.statusEffects) {
    const def = STATUS_EFFECT_DEFS[effect.name];
    if (def && def.attackModifier !== 0) {
      statusAtkMod += def.attackModifier;
    }
  }
  if (statusAtkMod !== 0) {
    atkModBreakdown.push({ source: 'statusEffects', value: statusAtkMod });
  }
  atkMod += statusAtkMod;

  // Racial attack bonus
  if (racialMods && racialMods.attackBonus !== 0) {
    atkModBreakdown.push({ source: 'racial', value: racialMods.attackBonus });
    atkMod += racialMods.attackBonus;
  }

  // Target status effect bonuses for attacker (e.g., +4 vs stunned, +2 vs blinded)
  let targetStatusAtkBonus = 0;
  for (const effect of target.statusEffects) {
    const mech = STATUS_EFFECT_MECHANICS[effect.name];
    if (mech && mech.grantsAdvantageToAttackers !== 0) {
      // knocked_down: +2 melee, -2 ranged
      if (effect.name === 'knocked_down') {
        const isRanged = weapon.attackModifierStat === 'dex' &&
          !(['FORCE', 'PSYCHIC', 'RADIANT'] as string[]).includes(weapon.damageType ?? '');
        targetStatusAtkBonus += isRanged ? -2 : mech.grantsAdvantageToAttackers;
      } else {
        targetStatusAtkBonus += mech.grantsAdvantageToAttackers;
      }
    }
  }
  if (targetStatusAtkBonus !== 0) {
    atkModBreakdown.push({ source: 'targetStatus', value: targetStatusAtkBonus });
    atkMod += targetStatusAtkBonus;
  }

  // Class ability buff attack bonus
  const buffAtkMod = getBuffAttackMod(actor);
  if (buffAtkMod !== 0) {
    atkModBreakdown.push({ source: 'classBuffs', value: buffAtkMod });
    atkMod += buffAtkMod;
  }

  // Proficiency penalties
  if (actor.nonProficientArmor) {
    atkModBreakdown.push({ source: 'nonProfArmor', value: -3 });
    atkMod -= 3;
  }
  if (actor.nonProficientWeapon) {
    atkModBreakdown.push({ source: 'nonProfWeapon', value: -actor.proficiencyBonus });
    atkMod -= actor.proficiencyBonus;
  }

  // Feat attack bonus
  const featAtkBonus = getFeatBonus(actor, 'attackBonus');
  if (featAtkBonus !== 0) {
    atkModBreakdown.push({ source: 'feat', value: featAtkBonus });
    atkMod += featAtkBonus;
  }

  // Phase 5A: Class ability attack modifiers (set by handleDamage)
  const classMods = actor.classAbilityAttackMods;
  if (classMods) {
    if (classMods.accuracyMod) {
      atkModBreakdown.push({ source: 'abilityAccuracy', value: classMods.accuracyMod });
      atkMod += classMods.accuracyMod;
    }
    // Clear after reading
    actor = { ...actor, classAbilityAttackMods: undefined };
  }

  let targetAC = calculateAC(target, racialTracker);

  // Phase 5A: ignoreArmor from class abilities
  if (classMods?.ignoreArmor) {
    targetAC = 10;
  }

  // Phase 5A BUFF-5: Stealth miss — stealthed targets auto-dodge attacks
  // Phase 6 PSION-PASSIVE-3: seeInvisible bypasses stealth
  if (target.activeBuffs?.some(b => b.stealthed === true) && !actor.seeInvisible) {
    const result: AttackResult = {
      type: 'attack',
      actorId,
      targetId,
      attackRoll: 0,
      attackTotal: 0,
      attackModifiers: atkModBreakdown,
      targetAC,
      hit: false,
      critical: false,
      damageRoll: 0,
      damageRolls: [],
      damageModifiers: [],
      damageType: weapon.damageType,
      totalDamage: 0,
      targetHpBefore: target.currentHp,
      targetHpAfter: target.currentHp,
      targetKilled: false,
      weaponName: weapon.name,
      weaponDice: `${weapon.diceCount}d${weapon.diceSides}`,
    };
    const combatants = state.combatants.map((c) => {
      if (c.id === targetId) return target;
      if (c.id === actorId) return actor;
      return c;
    });
    return { state: { ...state, combatants }, result };
  }

  // Check Half-Orc Unstoppable Force auto-hit
  const autoHit = racialTracker ? checkAutoHit(racialTracker) : false;

  // Phase 5A BUFF-2: Guaranteed hits from buffs
  let guaranteedHitUsed = false;
  const guaranteedBuff = actor.activeBuffs?.find(b => b.guaranteedHits != null && b.guaranteedHits > 0);
  if (guaranteedBuff) {
    guaranteedHitUsed = true;
    actor = {
      ...actor,
      activeBuffs: actor.activeBuffs!.map(b =>
        b === guaranteedBuff ? { ...b, guaranteedHits: Math.max(0, (b.guaranteedHits ?? 0) - 1) } : b
      ),
    };
  }

  // Phase 5B PASSIVE-6: Advantage vs low HP targets — roll twice, take better
  const useAdvantage = actor.advantageVsLowHp &&
    (target.currentHp / target.maxHp * 100) <= (actor.advantageHpThreshold ?? 50);

  let roll: { roll: number; total: number; hit: boolean; critical: boolean };
  if (autoHit || guaranteedHitUsed || (classMods?.autoHit ?? false)) {
    roll = { roll: 15, total: 15 + atkMod, hit: true, critical: false };
  } else if (useAdvantage) {
    const roll1 = attackRoll(atkMod, targetAC);
    const roll2 = attackRoll(atkMod, targetAC);
    roll = roll1.total >= roll2.total ? roll1 : roll2;
  } else {
    roll = attackRoll(atkMod, targetAC);
  }

  // Phase 5A: Expanded crit range from class abilities
  const totalCritBonus = (classMods?.critBonus ?? 0) + (actor.critChanceBonus ?? 0);
  if (roll.hit && !roll.critical && totalCritBonus > 0) {
    const critThreshold = 20 - Math.floor(totalCritBonus / 5);
    if (roll.roll >= critThreshold) {
      roll.critical = true;
    }
  }

  // Phase 5B PASSIVE-3: First strike auto-crit
  if (roll.hit && !roll.critical && actor.firstStrikeCrit && !actor.hasAttackedThisCombat) {
    roll.critical = true;
  }

  // Paralyzed target: melee attacks auto-crit (d20 standard)
  if (roll.hit && !roll.critical) {
    const targetParalyzed = target.statusEffects.some(e => e.name === 'paralyzed');
    if (targetParalyzed) {
      const isRanged = weapon.attackModifierStat === 'dex' &&
        !(['FORCE', 'PSYCHIC', 'RADIANT'] as string[]).includes(weapon.damageType ?? '');
      if (!isRanged) {
        roll.critical = true;
      }
    }
  }
  // Mark that actor has now attacked
  if (actor.firstStrikeCrit && !actor.hasAttackedThisCombat) {
    actor = { ...actor, hasAttackedThisCombat: true };
  }

  // === FUMBLE RESOLUTION (d100 charts) ===
  let fumbleResult: FumbleResult | undefined;
  if (roll.roll === 1) {
    const confirmRoll = attackRoll(atkMod, targetAC);
    if (!confirmRoll.hit) {
      // Confirmed fumble — d100 chart lookup
      const isSpell = weapon.damageType === 'FORCE' || weapon.damageType === 'PSYCHIC' || weapon.damageType === 'RADIANT';
      const isRanged = weapon.attackModifierStat === 'dex' && !isSpell;
      const fumbleChartType = getFumbleChartType(isRanged, isSpell);
      const rawD100 = Math.floor(Math.random() * 100) + 1;
      const levelCap = getFumbleLevelCap(actor.level);
      const modifiers: D100Modifier[] = [];
      // Bard: -15 (less clumsy), Heavy weapon: +5, Finesse: -5
      if (actor.characterClass?.toLowerCase() === 'bard') modifiers.push({ source: 'Bard', value: -15 });
      const totalMod = modifiers.reduce((sum, m) => sum + m.value, 0);
      const modifiedD100 = Math.max(1, Math.min(levelCap, rawD100 + totalMod));
      const entry = lookupFumbleChart(fumbleChartType, modifiedD100);
      const severity = getFumbleSeverity(modifiedD100);

      fumbleResult = {
        confirmed: true,
        confirmationRoll: confirmRoll.roll,
        confirmationTotal: confirmRoll.total,
        confirmationAC: targetAC,
        rawD100,
        modifiers,
        modifiedD100,
        levelCap,
        cappedD100: modifiedD100,
        severity,
        chartType: fumbleChartType,
        entry,
        effectApplied: entry.effect.type !== 'none' ? entry.effect.type : undefined,
        duration: entry.effect.duration || undefined,
      };

      // Apply fumble self-effects
      if (entry.effect.type === 'ac_penalty' && entry.effect.value) {
        actor = applyStatusEffect(actor, 'weakened', entry.effect.duration, actorId, 0);
      }
      if (entry.effect.type === 'attack_penalty' && entry.effect.value) {
        actor = applyStatusEffect(actor, 'weakened', entry.effect.duration, actorId, 0);
      }
      if (entry.effect.type === 'skip_attack') {
        actor = applyStatusEffect(actor, 'stunned', entry.effect.duration, actorId, 0);
      }

      // Fumble = miss with consequences — early return
      const fumbleAttackResult: AttackResult = {
        type: 'attack',
        actorId,
        targetId,
        attackRoll: roll.roll,
        attackTotal: roll.total,
        attackModifiers: atkModBreakdown,
        targetAC,
        hit: false,
        critical: false,
        damageRoll: 0,
        damageRolls: [],
        damageModifiers: [],
        damageType: weapon.damageType,
        totalDamage: 0,
        targetHpBefore: target.currentHp,
        targetHpAfter: target.currentHp,
        targetKilled: false,
        weaponName: weapon.name,
        weaponDice: `${weapon.diceCount}d${weapon.diceSides}`,
        fumbleResult,
      };
      const combatants = state.combatants.map(c => {
        if (c.id === actorId) return actor;
        return c;
      });
      return { state: { ...state, combatants }, result: fumbleAttackResult };
    } else {
      // Not confirmed — just a regular miss
      fumbleResult = {
        confirmed: false,
        confirmationRoll: confirmRoll.roll,
        confirmationTotal: confirmRoll.total,
        confirmationAC: targetAC,
      };
    }
  }

  let totalDamage = 0;
  let damageRollValue = 0;
  let damageRolls: number[] = [];
  const dmgModBreakdown: AttackModifierBreakdown[] = [];
  const targetHpBefore = target.currentHp;

  // Phase 3: Reactive/companion tracking (declared before hit block for scope)
  let companionIntercepted = false;
  let companionDmgAbsorbed = 0;
  let companionKilled = false;
  let counterTriggered = false;
  let counterDmg = 0;
  let counterAbilityName = '';
  let counterAoe = false;
  // Phase 4: Death prevention tracking
  let deathPrevented = false;
  let deathPreventedAbility = '';
  let attackerDeathPrevented = false;
  let attackerDeathPreventedAbility = '';

  // Precognitive Dodge reaction: negate the hit entirely
  if (roll.hit && target.hasReaction && target.reactionType === 'precognitive_dodge') {
    target = { ...target, hasReaction: false, reactionType: null };
    const result: AttackResult = {
      type: 'attack',
      actorId,
      targetId,
      attackRoll: roll.roll,
      attackTotal: roll.total,
      attackModifiers: atkModBreakdown,
      targetAC,
      hit: false,
      critical: false,
      damageRoll: 0,
      damageRolls: [],
      damageModifiers: [],
      damageType: weapon.damageType,
      totalDamage: 0,
      targetHpBefore,
      targetHpAfter: target.currentHp,
      targetKilled: false,
      weaponName: weapon.name,
      weaponDice: `${weapon.diceCount}d${weapon.diceSides}`,
      negatedAttack: true,
    };

    const combatants = state.combatants.map((c) => {
      if (c.id === targetId) return target;
      if (c.id === actorId) return actor;
      return c;
    });

    return { state: { ...state, combatants }, result };
  }

  // Phase 5A BUFF-3: Dodge check after hit determination
  let dodged = false;
  let damageAuraResult: AuraResult | undefined;
  if (roll.hit) {
    const totalDodge = (target.activeBuffs ?? []).reduce((sum, b) => sum + (b.dodgeMod ?? 0), 0);
    if (totalDodge > 0) {
      const dodgeRoll = Math.floor(Math.random() * 100) + 1;
      if (dodgeRoll <= totalDodge) {
        dodged = true;
      }
    }
  }

  // === CRIT RESOLUTION (d100 charts) ===
  let critResult: CritResult | undefined;
  let damageTypeResult: DamageTypeResult | undefined;
  let statusEffectsApplied: string[] | undefined;

  if (roll.hit && !dodged) {
    // Always calculate base damage (non-crit), d100 chart adds bonus dice
    const dmg = calculateDamage(actor, weapon, false);
    damageRollValue = dmg.total;
    damageRolls = dmg.rolls;
    totalDamage = Math.max(0, dmg.total);

    // Track damage modifier breakdown
    const dmgStatMod = getModifier(actor.stats[weapon.damageModifierStat]);
    dmgModBreakdown.push({ source: weapon.damageModifierStat.toUpperCase(), value: dmgStatMod });
    if (weapon.bonusDamage !== 0) {
      dmgModBreakdown.push({ source: 'weaponBonus', value: weapon.bonusDamage });
    }

    // d100 Crit chart resolution
    if (roll.critical) {
      // Check crit immunity (amorphous creatures like Slime)
      if (target.critImmunity) {
        // Downgrade to normal hit — damage already calculated as base
        roll.critical = false;
      } else {
        // Determine crit trigger source
        let critTrigger: 'nat20' | 'expanded_range' | 'first_strike' = 'nat20';
        if (roll.roll !== 20 && actor.firstStrikeCrit && !actor.hasAttackedThisCombat) {
          critTrigger = 'first_strike';
        } else if (roll.roll !== 20) {
          critTrigger = 'expanded_range';
        }

        // Determine chart type from weapon damage type
        const isRanged = weapon.attackModifierStat === 'dex' &&
          !(weapon.damageType === 'FORCE' || weapon.damageType === 'PSYCHIC' || weapon.damageType === 'RADIANT');
        const chartType = getCritChartType(weapon.damageType ?? 'BLUDGEONING', isRanged);

        // Roll d100 and collect modifiers
        const rawD100 = Math.floor(Math.random() * 100) + 1;
        const critModifiers: D100Modifier[] = [];
        // Berserker Rage: +15
        if (actor.activeBuffs?.some(b => b.name?.toLowerCase().includes('rage'))) {
          critModifiers.push({ source: 'Berserker Rage', value: 15 });
        }
        // Rogue stealth: +20
        if (actor.activeBuffs?.some(b => b.stealthed === true)) {
          critModifiers.push({ source: 'Rogue Stealth', value: 20 });
        }
        // Psion bonus: +5
        if (actor.characterClass?.toLowerCase() === 'psion') {
          critModifiers.push({ source: 'Psion', value: 5 });
        }
        // Target crit resistance (negative modifier)
        if (target.critResistance && target.critResistance !== 0) {
          critModifiers.push({ source: 'Target Crit Resistance', value: target.critResistance });
        }
        const totalCritMod = critModifiers.reduce((sum, m) => sum + m.value, 0);
        const modifiedD100 = Math.max(1, Math.min(100, rawD100 + totalCritMod));

        // Lookup chart entry
        const critEntry = lookupCritChart(chartType, modifiedD100);
        const critSeverity = getCritSeverity(modifiedD100);

        // Apply bonus dice from chart entry
        const bonusDmg = damageRoll(critEntry.bonusDice, weapon.diceSides);
        // Brutal Critical feat: +50% crit bonus damage
        const critFeatMult = getFeatBonus(actor, 'critDamageBonus');
        const critFeatExtra = critFeatMult > 0 ? Math.floor(bonusDmg.total * critFeatMult) : 0;
        totalDamage += bonusDmg.total + critFeatExtra;
        damageRollValue += bonusDmg.total + critFeatExtra;
        damageRolls = [...damageRolls, ...bonusDmg.rolls];
        dmgModBreakdown.push({ source: `crit_${critSeverity}`, value: bonusDmg.total + critFeatExtra });

        // Apply chart status effect if present
        if (critEntry.statusEffect) {
          const effectName = critEntry.statusEffect.type as StatusEffectName;
          if (STATUS_EFFECT_DEFS[effectName]) {
            target = applyStatusEffect(
              target, effectName, critEntry.statusEffect.duration,
              actorId, critEntry.statusEffect.value ?? 0,
            );
          }
        }

        critResult = {
          trigger: critTrigger,
          chartType,
          rawD100,
          modifiers: critModifiers,
          modifiedD100,
          severity: critSeverity,
          entry: critEntry,
          bonusDamage: bonusDmg.total,
          statusApplied: critEntry.statusEffect?.type,
          statusDuration: critEntry.statusEffect?.duration,
          totalCritDamage: totalDamage,
        };
      }
    }

    // Half-Orc Savage Attacks: extra die on crit (still applies on top of d100 chart)
    if (roll.critical && racialMods && racialMods.extraCritDice > 0) {
      const extraDmg = damageRoll(racialMods.extraCritDice, weapon.diceSides);
      totalDamage += extraDmg.total;
      damageRollValue += extraDmg.total;
      damageRolls = [...damageRolls, ...extraDmg.rolls];
      dmgModBreakdown.push({ source: 'savageAttacks', value: extraDmg.total });
    }

    // Racial damage multiplier (Orc Blood Fury, Beastfolk Apex Predator, etc.)
    if (racialMods && racialMods.damageMultiplier !== 1.0) {
      const before = totalDamage;
      totalDamage = Math.floor(totalDamage * racialMods.damageMultiplier);
      dmgModBreakdown.push({ source: 'racialMultiplier', value: totalDamage - before });
    }

    // Racial flat damage bonus (Goliath Titan's Grip)
    if (racialMods && racialMods.damageFlatBonus > 0) {
      totalDamage += racialMods.damageFlatBonus;
      dmgModBreakdown.push({ source: 'racialFlat', value: racialMods.damageFlatBonus });
    }

    // Status effect damage modifier (weakened: -2, diseased: -2)
    let statusDmgMod = 0;
    for (const eff of actor.statusEffects) {
      const mech = STATUS_EFFECT_MECHANICS[eff.name];
      if (mech && mech.damageDealtMod !== 0) {
        statusDmgMod += mech.damageDealtMod;
      }
    }
    if (statusDmgMod !== 0) {
      totalDamage = Math.max(0, totalDamage + statusDmgMod);
      dmgModBreakdown.push({ source: 'statusDamageMod', value: statusDmgMod });
    }

    // Class ability buff damage bonus
    const buffDmgMod = getBuffDamageMod(actor);
    if (buffDmgMod !== 0) {
      totalDamage = Math.max(0, totalDamage + buffDmgMod);
      dmgModBreakdown.push({ source: 'classBuffs', value: buffDmgMod });
    }

    // Phase 5B MECH-1: Consume one-use buffs (bonusDamageNext) after damage applied
    if (actor.activeBuffs?.some(b => b.consumeOnUse && b.damageMod)) {
      actor = {
        ...actor,
        activeBuffs: actor.activeBuffs!.map(b =>
          b.consumeOnUse && b.damageMod ? { ...b, damageMod: 0, consumeOnUse: false } : b
        ),
      };
    }

    // Phase 5B MECH-5: Bonus damage from source — check target for bonusDamageFromSource matching actor
    if (target.activeBuffs) {
      const sourceBuff = target.activeBuffs.find(b =>
        b.bonusDamageFromSource && b.bonusDamageSourceId === actorId
      );
      if (sourceBuff && sourceBuff.bonusDamageFromSource) {
        totalDamage += sourceBuff.bonusDamageFromSource;
        dmgModBreakdown.push({ source: 'bonusFromSource', value: sourceBuff.bonusDamageFromSource });
      }
    }

    // Phase 5B MECH-9: Poison charges — on hit, apply poisoned to target and decrement charge
    if (actor.activeBuffs) {
      const poisonBuff = actor.activeBuffs.find(b => b.poisonCharges != null && b.poisonCharges > 0);
      if (poisonBuff) {
        target = applyStatusEffect(
          target, 'poisoned',
          poisonBuff.poisonDotDuration ?? 3,
          actorId,
          poisonBuff.poisonDotDamage ?? 3,
        );
        actor = {
          ...actor,
          activeBuffs: actor.activeBuffs.map(b =>
            b === poisonBuff ? { ...b, poisonCharges: Math.max(0, (b.poisonCharges ?? 0) - 1) } : b
          ),
        };
      }
    }

    // Phase 5B MECH-11: Stacking attack speed — increment stacks on hit
    if (actor.activeBuffs) {
      actor = {
        ...actor,
        activeBuffs: actor.activeBuffs.map(b => {
          if (b.stackingAttackSpeedStacks != null && b.stackingAttackSpeedMax != null) {
            const newStacks = Math.min(b.stackingAttackSpeedMax, (b.stackingAttackSpeedStacks ?? 0) + 1);
            return { ...b, stackingAttackSpeedStacks: newStacks };
          }
          return b;
        }),
      };
    }

    // Class ability damage reduction on target
    const dr = getBuffDamageReduction(target);
    if (dr > 0) {
      const before = totalDamage;
      totalDamage = Math.floor(totalDamage * (1 - dr));
      dmgModBreakdown.push({ source: 'targetDR', value: totalDamage - before });
    }

    // Class ability absorption on target
    const absorbResult = consumeAbsorption(target, totalDamage);
    if (absorbResult.remainingDamage < totalDamage) {
      dmgModBreakdown.push({ source: 'absorbed', value: absorbResult.remainingDamage - totalDamage });
      target = absorbResult.combatant;
      totalDamage = absorbResult.remainingDamage;
    }

    // === DAMAGE TYPE INTERACTION ===
    if (totalDamage > 0 && weapon.damageType) {
      const dtResult = applyDamageTypeInteraction(totalDamage, weapon.damageType as CombatDamageType, target);
      if (dtResult.interaction !== 'normal') {
        dmgModBreakdown.push({ source: `DT_${dtResult.interaction}`, value: dtResult.finalDamage - totalDamage });
        totalDamage = dtResult.finalDamage;
        damageTypeResult = dtResult;
      }
      // Track damage type received for regen-disabling
      if (totalDamage > 0 && weapon.damageType) {
        target = {
          ...target,
          damageTypesReceivedThisRound: [
            ...(target.damageTypesReceivedThisRound ?? []),
            weapon.damageType as CombatDamageType,
          ],
        };
      }
    }

    // Phase 3: Companion interception check (Alpha Predator)
    if (target.activeBuffs && totalDamage > 0) {
      const companionBuff = target.activeBuffs.find(b => b.companionHp != null && b.companionHp > 0);
      if (companionBuff && Math.random() < 0.3) {
        companionIntercepted = true;
        companionDmgAbsorbed = totalDamage;
        // Phase 5B PASSIVE-4: Companion immune — absorbs damage without taking HP loss
        if (target.companionImmune) {
          companionKilled = false;
          // Companion absorbs all damage but takes no HP loss
        } else {
          const newCompanionHp = Math.max(0, companionBuff.companionHp! - totalDamage);
          companionKilled = newCompanionHp <= 0;
          if (companionKilled) {
            target = { ...target, activeBuffs: target.activeBuffs.filter(b => b !== companionBuff) };
          } else {
            target = {
              ...target,
              activeBuffs: target.activeBuffs.map(b =>
                b === companionBuff ? { ...b, companionHp: newCompanionHp } : b
              ),
            };
          }
        }
        totalDamage = 0; // Companion absorbs all damage
      }
    }

    // Break mesmerize on damage
    if (totalDamage > 0) {
      target = {
        ...target,
        statusEffects: target.statusEffects.filter(e => e.name !== 'mesmerize'),
      };
    }

    // Apply damage to target (skip if companion intercepted)
    if (totalDamage > 0) {
      // Check death prevention (Orc Relentless Endurance, Revenant Undying Fortitude)
      if (target.race && racialTracker) {
        const prevention = checkDeathPrevention(target, totalDamage, target.race, target.level, racialTracker);
        if (prevention.prevented) {
          target = {
            ...target,
            currentHp: prevention.newHp,
            isAlive: true,
          };
        } else {
          target = {
            ...target,
            currentHp: Math.max(0, target.currentHp - totalDamage),
            isAlive: target.currentHp - totalDamage > 0,
          };
        }
      } else {
        target = {
          ...target,
          currentHp: Math.max(0, target.currentHp - totalDamage),
          isAlive: target.currentHp - totalDamage > 0,
        };
      }
    }

    // Phase 4: Class ability death prevention (fallback after racial)
    if (!target.isAlive && !target.hasFled) {
      const unlockedIds = Object.keys(target.abilityUsesThisCombat ?? {});
      const classPrevention = checkClassDeathPrevention(target, unlockedIds);
      if (classPrevention) {
        target = {
          ...target,
          currentHp: classPrevention.revivedHp,
          isAlive: true,
          abilityUsesThisCombat: {
            ...(target.abilityUsesThisCombat ?? {}),
            [classPrevention.abilityId]: (target.abilityUsesThisCombat?.[classPrevention.abilityId] ?? 0) + 1,
          },
        };
        deathPrevented = true;
        deathPreventedAbility = classPrevention.abilityName;
      }
    }

    // Nethkin Infernal Rebuke: reflect fire damage on melee hit
    if (target.race === 'nethkin') {
      const reflectDmg = checkMeleeReflect(target.race, target.level);
      if (reflectDmg > 0) {
        actor = {
          ...actor,
          currentHp: Math.max(0, actor.currentHp - reflectDmg),
          isAlive: actor.currentHp - reflectDmg > 0,
        };
      }
    }

    // Phase 5A BUFF-4: Buff-based damage reflect (e.g., Iron Bulwark 30%)
    if (target.activeBuffs && totalDamage > 0) {
      const reflectValues = target.activeBuffs.filter(b => b.damageReflect != null && b.damageReflect > 0).map(b => b.damageReflect!);
      const maxReflect = reflectValues.length > 0 ? Math.max(...reflectValues) : 0;
      if (maxReflect > 0) {
        const reflectedDamage = Math.floor(totalDamage * maxReflect);
        if (reflectedDamage > 0) {
          actor = {
            ...actor,
            currentHp: Math.max(0, actor.currentHp - reflectedDamage),
            isAlive: actor.currentHp - reflectedDamage > 0,
          };
          dmgModBreakdown.push({ source: 'damageReflect', value: -reflectedDamage });
        }
      }
    }

    // === MONSTER ON-HIT ABILITIES ===
    if (actor.entityType === 'monster' && totalDamage > 0 && target.isAlive) {
      const onHitResult = resolveOnHitAbilities(actor, target);
      target = onHitResult.target;
      if (onHitResult.effectsApplied.length > 0) {
        statusEffectsApplied = onHitResult.effectsApplied;
      }
    }

    // === DAMAGE AURA (fire aura damages melee attacker on hit) ===
    if (target.entityType === 'monster' && target.monsterAbilities && roll.hit && weapon.attackModifierStat === 'str') {
      const dmgAura = target.monsterAbilities.find(inst => inst.def.type === 'damage_aura');
      if (dmgAura && dmgAura.def.auraDamage) {
        const auraDmgMatch = dmgAura.def.auraDamage.match(/^(\d+)d(\d+)$/);
        if (auraDmgMatch) {
          const auraDmgRoll = damageRoll(parseInt(auraDmgMatch[1]), parseInt(auraDmgMatch[2]));
          let auraDmg = auraDmgRoll.total;
          const auraDmgType = dmgAura.def.auraDamageType;
          // Apply DT interaction (future-proof: in case attacker has resistances)
          if (auraDmgType && actor.resistances?.includes(auraDmgType)) {
            auraDmg = Math.floor(auraDmg / 2);
          }
          if (auraDmgType && actor.immunities?.includes(auraDmgType)) {
            auraDmg = 0;
          }
          if (auraDmg > 0) {
            actor = {
              ...actor,
              currentHp: Math.max(0, actor.currentHp - auraDmg),
              isAlive: actor.currentHp - auraDmg > 0,
            };
          }
          damageAuraResult = {
            auraName: dmgAura.def.name,
            auraType: 'damage',
            damage: auraDmg,
            damageType: auraDmgType,
            damageRoll: dmgAura.def.auraDamage,
          };
        }
      }
    }

    // Phase 3: Reactive counter/trap trigger check on target
    if (target.activeBuffs && target.activeBuffs.length > 0) {
      const reactiveBuff = target.activeBuffs.find(buff =>
        (buff.counterDamage && buff.triggerOn === 'melee_attack') ||
        (buff.trapDamage && buff.triggerOn === 'attacked')
      );
      if (reactiveBuff) {
        const reactiveDamage = reactiveBuff.counterDamage ?? reactiveBuff.trapDamage ?? 0;
        counterTriggered = true;
        counterDmg = reactiveDamage;
        counterAbilityName = reactiveBuff.name;
        counterAoe = reactiveBuff.trapAoe ?? false;

        if (counterAoe) {
          // Explosive Trap: damage ALL alive enemies of the trap-layer
          const trapEnemies = state.combatants.filter(
            c => c.team !== target.team && c.isAlive && !c.hasFled
          );
          for (const enemy of trapEnemies) {
            const newHp = Math.max(0, enemy.currentHp - reactiveDamage);
            if (enemy.id === actor.id) {
              actor = { ...actor, currentHp: newHp, isAlive: newHp > 0 };
            }
            state = {
              ...state,
              combatants: state.combatants.map(c =>
                c.id === enemy.id ? { ...c, currentHp: newHp, isAlive: newHp > 0 } : c
              ),
            };
          }
        } else {
          // Counter/single trap: damage only the ATTACKER
          const newActorHp = Math.max(0, actor.currentHp - reactiveDamage);
          actor = { ...actor, currentHp: newActorHp, isAlive: newActorHp > 0 };
        }

        // Consume the reactive buff (one-shot)
        target = {
          ...target,
          activeBuffs: target.activeBuffs.filter(b => b !== reactiveBuff),
        };

        // Phase 4: Check class death prevention for attacker killed by counter/trap
        if (!actor.isAlive && !actor.hasFled) {
          const attackerUnlockedIds = Object.keys(actor.abilityUsesThisCombat ?? {});
          const attackerPrev = checkClassDeathPrevention(actor, attackerUnlockedIds);
          if (attackerPrev) {
            actor = {
              ...actor,
              currentHp: attackerPrev.revivedHp,
              isAlive: true,
              abilityUsesThisCombat: {
                ...(actor.abilityUsesThisCombat ?? {}),
                [attackerPrev.abilityId]: (actor.abilityUsesThisCombat?.[attackerPrev.abilityId] ?? 0) + 1,
              },
            };
            attackerDeathPrevented = true;
            attackerDeathPreventedAbility = attackerPrev.abilityName;
          }
        }
      }
    }
  }

  // Phase 5B MECH-7: Taunt enforcement is handled before action resolution in resolveTurn

  const result: AttackResult = {
    type: 'attack',
    actorId,
    targetId,
    attackRoll: roll.roll,
    attackTotal: roll.total,
    attackModifiers: atkModBreakdown,
    targetAC,
    hit: roll.hit && !dodged,
    critical: roll.critical && !dodged,
    damageRoll: damageRollValue,
    damageRolls,
    damageModifiers: dmgModBreakdown,
    damageType: weapon.damageType,
    totalDamage,
    targetHpBefore,
    targetHpAfter: target.currentHp,
    targetKilled: !target.isAlive,
    weaponName: weapon.name,
    weaponDice: `${weapon.diceCount}d${weapon.diceSides}`,
    counterTriggered,
    counterDamage: counterTriggered ? counterDmg : undefined,
    counterAbilityName: counterTriggered ? counterAbilityName : undefined,
    counterAoe: counterTriggered ? counterAoe : undefined,
    companionIntercepted: companionIntercepted || undefined,
    companionDamageAbsorbed: companionIntercepted ? companionDmgAbsorbed : undefined,
    companionKilled: companionIntercepted ? companionKilled : undefined,
    deathPrevented: deathPrevented || undefined,
    deathPreventedAbility: deathPrevented ? deathPreventedAbility : undefined,
    attackerDeathPrevented: attackerDeathPrevented || undefined,
    attackerDeathPreventedAbility: attackerDeathPrevented ? attackerDeathPreventedAbility : undefined,
    critResult,
    fumbleResult,
    damageTypeResult,
    statusEffectsApplied,
    ...(damageAuraResult && { auraResult: damageAuraResult }),
  };

  const combatants = state.combatants.map((c) => {
    if (c.id === targetId) return target;
    if (c.id === actorId) return actor;
    return c;
  });

  return { state: { ...state, combatants }, result };
}

/** Resolve a spell cast action. */
export function resolveCast(
  state: CombatState,
  actorId: string,
  targetId: string,
  spell: SpellInfo,
  slotLevel: number
): { state: CombatState; result: CastResult } {
  let actor = state.combatants.find((c) => c.id === actorId)!;
  let target = state.combatants.find((c) => c.id === targetId)!;

  // Expend spell slot
  const newSlots = { ...actor.spellSlots };
  newSlots[slotLevel] = Math.max(0, (newSlots[slotLevel] ?? 0) - 1);
  actor = { ...actor, spellSlots: newSlots };

  // Spell save DC: 8 + proficiencyBonus + casting stat mod
  const castMod = getModifier(actor.stats[spell.castingStat]);
  const saveDC = 8 + actor.proficiencyBonus + castMod;

  let saveRoll: number | undefined;
  let saveTotal: number | undefined;
  let saveSucceeded: boolean | undefined;

  if (spell.requiresSave && spell.saveType) {
    const targetSaveMod = getSaveModifier(target.stats, spell.saveType, target.proficiencyBonus, target.saveProficiencies) + getFeatBonus(target, 'allSaveBonus');
    let totalSaveMod = targetSaveMod;
    // Apply status effect save modifiers
    for (const eff of target.statusEffects) {
      const def = STATUS_EFFECT_DEFS[eff.name];
      if (def) totalSaveMod += def.saveModifier;
    }
    // Non-proficient armor: -3 to STR/DEX saves
    totalSaveMod += getNonProfArmorSavePenalty(target, spell.saveType);
    const save = savingThrow(totalSaveMod, saveDC);
    // Legendary Resistance check
    { const lr = checkLegendaryResistance(state, targetId, save, saveDC);
      if (lr.overridden) { save.success = true; state = lr.state; target = state.combatants.find(c => c.id === targetId)!; } }
    saveRoll = save.roll;
    saveTotal = save.total;
    saveSucceeded = save.success;
  }

  let totalDamage: number | undefined;
  let damageRollValue: number | undefined;
  let healAmount: number | undefined;
  let statusApplied: StatusEffectName | undefined;
  let statusDuration: number | undefined;
  let targetKilled = false;
  let spellDamageTypeResult: DamageTypeResult | undefined;

  // Determine if spell effect applies (no save required, or save failed)
  const effectApplies = !spell.requiresSave || !saveSucceeded;

  if (effectApplies) {
    if (spell.type === 'damage' || spell.type === 'damage_status') {
      const dmg = damageRoll(spell.diceCount, spell.diceSides, spell.modifier);
      damageRollValue = dmg.total;
      totalDamage = dmg.total;
      // Apply damage type resistance/vulnerability/immunity
      if (spell.damageType) {
        spellDamageTypeResult = applyDamageTypeInteraction(totalDamage, spell.damageType, target);
        totalDamage = spellDamageTypeResult.finalDamage;
      }
      target = {
        ...target,
        currentHp: Math.max(0, target.currentHp - totalDamage),
        isAlive: target.currentHp - totalDamage > 0,
      };
      targetKilled = !target.isAlive;
      // Break mesmerize on damage
      if (totalDamage > 0) {
        target = { ...target, statusEffects: target.statusEffects.filter(e => e.name !== 'mesmerize') };
      }
    }

    if (spell.type === 'heal') {
      const heal = damageRoll(spell.diceCount, spell.diceSides, spell.modifier);
      healAmount = heal.total;
      target = {
        ...target,
        currentHp: Math.min(target.maxHp, target.currentHp + healAmount),
      };
    }

    if (
      (spell.type === 'status' || spell.type === 'damage_status') &&
      spell.statusEffect &&
      spell.statusDuration
    ) {
      statusApplied = spell.statusEffect;
      statusDuration = spell.statusDuration;
      target = applyStatusEffect(
        target,
        spell.statusEffect,
        spell.statusDuration,
        actorId
      );
    }
  } else if (spell.type === 'damage' || spell.type === 'damage_status') {
    // Save succeeded: half damage for damage spells
    const dmg = damageRoll(spell.diceCount, spell.diceSides, spell.modifier);
    damageRollValue = dmg.total;
    totalDamage = Math.floor(dmg.total / 2);
    // Apply damage type resistance/vulnerability/immunity
    if (spell.damageType) {
      spellDamageTypeResult = applyDamageTypeInteraction(totalDamage, spell.damageType, target);
      totalDamage = spellDamageTypeResult.finalDamage;
    }
    target = {
      ...target,
      currentHp: Math.max(0, target.currentHp - totalDamage),
      isAlive: target.currentHp - totalDamage > 0,
    };
    targetKilled = !target.isAlive;
    // Break mesmerize on damage
    if (totalDamage > 0) {
      target = { ...target, statusEffects: target.statusEffects.filter(e => e.name !== 'mesmerize') };
    }
  }

  const result: CastResult = {
    type: 'cast',
    actorId,
    targetId,
    spellName: spell.name,
    spellLevel: spell.level,
    slotExpended: slotLevel,
    damageRoll: damageRollValue,
    totalDamage,
    healAmount,
    saveRequired: spell.requiresSave,
    saveRoll,
    saveTotal,
    saveDC,
    saveSucceeded,
    statusApplied,
    statusDuration,
    targetHpAfter: target.currentHp,
    targetKilled,
    damageTypeResult: spellDamageTypeResult,
  };

  const combatants = state.combatants.map((c) => {
    if (c.id === actorId) return actor;
    if (c.id === targetId) return target;
    return c;
  });

  return { state: { ...state, combatants }, result };
}

/** Resolve a defend action: grants AC bonus until next turn. */
export function resolveDefend(
  state: CombatState,
  actorId: string
): { state: CombatState; result: DefendResult } {
  const combatants = state.combatants.map((c) => {
    if (c.id !== actorId) return c;
    // Defend action extinguishes burning (stop, drop, roll)
    const updatedEffects = c.statusEffects.filter(e => e.name !== 'burning');
    return { ...c, isDefending: true, statusEffects: updatedEffects };
  });

  const result: DefendResult = {
    type: 'defend',
    actorId,
    acBonusGranted: DEFEND_AC_BONUS,
  };

  return { state: { ...state, combatants }, result };
}

/** Resolve a consumable item usage. */
export function resolveItem(
  state: CombatState,
  actorId: string,
  targetId: string,
  item: ItemInfo
): { state: CombatState; result: ItemResult } {
  let target = state.combatants.find((c) => c.id === targetId)!;

  let healAmountVal: number | undefined;
  let damageAmountVal: number | undefined;
  let statusApplied: StatusEffectName | undefined;
  let statusRemoved: StatusEffectName | undefined;

  if (item.type === 'heal') {
    const amount = item.diceCount && item.diceSides
      ? damageRoll(item.diceCount, item.diceSides, 0).total + (item.flatAmount ?? 0)
      : item.flatAmount ?? 0;
    healAmountVal = amount;
    target = {
      ...target,
      currentHp: Math.min(target.maxHp, target.currentHp + amount),
    };
  }

  if (item.type === 'damage') {
    const amount = item.diceCount && item.diceSides
      ? damageRoll(item.diceCount, item.diceSides, 0).total + (item.flatAmount ?? 0)
      : item.flatAmount ?? 0;
    damageAmountVal = amount;
    target = {
      ...target,
      currentHp: Math.max(0, target.currentHp - amount),
      isAlive: target.currentHp - amount > 0,
    };
  }

  if (item.type === 'buff' && item.statusEffect && item.statusDuration) {
    statusApplied = item.statusEffect;
    target = applyStatusEffect(
      target,
      item.statusEffect,
      item.statusDuration,
      actorId
    );
  }

  if (item.type === 'cleanse') {
    // Remove the first harmful status effect
    const harmful: StatusEffectName[] = [
      'poisoned', 'stunned', 'burning', 'frozen', 'paralyzed', 'blinded', 'weakened', 'slowed',
      'dominated', 'banished', 'diseased',
    ];
    const toRemove = target.statusEffects.find((e) => harmful.includes(e.name));
    if (toRemove) {
      statusRemoved = toRemove.name;
      target = {
        ...target,
        statusEffects: target.statusEffects.filter((e) => e.id !== toRemove.id),
      };
    }
  }

  const result: ItemResult = {
    type: 'item',
    actorId,
    targetId,
    itemName: item.name,
    healAmount: healAmountVal,
    damageAmount: damageAmountVal,
    statusApplied,
    statusRemoved,
    targetHpAfter: target.currentHp,
  };

  const combatants = state.combatants.map((c) => (c.id === targetId ? target : c));

  return { state: { ...state, combatants }, result };
}

/** Resolve a flee attempt. DC scales with number of enemies. */
export function resolveFlee(
  state: CombatState,
  actorId: string
): { state: CombatState; result: FleeResult } {
  const actor = state.combatants.find((c) => c.id === actorId)!;

  // Rooted/restrained combatants cannot flee
  const cantFlee = actor.statusEffects.some(e => {
    const mech = STATUS_EFFECT_MECHANICS[e.name];
    return mech?.blocksFlee;
  });
  if (cantFlee) {
    return {
      state,
      result: { type: 'flee', actorId, fleeRoll: 0, fleeDC: 0, success: false },
    };
  }

  const enemies = state.combatants.filter(
    (c) => c.team !== actor.team && c.isAlive
  );

  // Slowed combatants have harder time fleeing (+5 DC)
  const slowedPenalty = actor.statusEffects.some(e => e.name === 'slowed') ? 5 : 0;

  // DC increases with more enemies (base 10, +2 per extra enemy)
  const fleeDC = DEFAULT_FLEE_DC + Math.max(0, (enemies.length - 1) * 2) + slowedPenalty;
  const dexMod = getModifier(actor.stats.dex);
  const check = fleeCheck(dexMod, fleeDC);

  const result: FleeResult = {
    type: 'flee',
    actorId,
    fleeRoll: check.roll,
    fleeDC,
    success: check.success,
  };

  // P2 #52 FIX: If flee succeeds, mark as fled instead of dead to avoid death penalties
  let combatants = state.combatants;
  if (check.success) {
    combatants = combatants.map((c) =>
      c.id === actorId ? { ...c, isAlive: false, hasFled: true } : c
    );
  }

  return { state: { ...state, combatants }, result };
}

// ---- Psychic Damage Helper ----

/** Apply psychic damage to a target, respecting Forgeborn resistance and Thought Shield. */
function applyPsychicDamage(target: Combatant, rawDamage: number): { damage: number; target: Combatant; damageTypeResult?: DamageTypeResult } {
  // Use standard damage type pipeline for PSYCHIC — handles monster immunities/resistances
  const dtResult = applyDamageTypeInteraction(rawDamage, 'PSYCHIC' as CombatDamageType, target);
  let damage = dtResult.finalDamage;

  // Thought Shield passive: psychicResistance field halves psychic damage (stacks with resistance)
  // (set by applyPassiveAbilities when psi-tel-2 is unlocked, or manually in sim)
  if (target.psychicResistance) {
    damage = Math.floor(damage / 2);
  }

  damage = Math.max(0, damage);
  const newHp = Math.max(0, target.currentHp - damage);
  return {
    damage,
    target: { ...target, currentHp: newHp, isAlive: newHp > 0 },
    damageTypeResult: dtResult,
  };
}

// ---- Psion Ability Resolution ----

/** Resolve a psion ability action. Returns updated state and result. */
export function resolvePsionAbility(
  state: CombatState,
  actorId: string,
  abilityId: string,
  targetId?: string
): { state: CombatState; result: PsionAbilityResult } {
  let current = state;
  const actor = current.combatants.find((c) => c.id === actorId)!;
  const abilityDef = psionAbilities.find((a) => a.id === abilityId);

  if (!abilityDef) {
    return {
      state: current,
      result: {
        type: 'psion_ability',
        actorId,
        abilityName: 'Unknown',
        abilityId,
        saveRequired: false,
        description: 'Unknown psion ability.',
      },
    };
  }

  let updatedActor = { ...actor };
  current = {
    ...current,
    combatants: current.combatants.map((c) => (c.id === actorId ? updatedActor : c)),
  };

  const intMod = getModifier(updatedActor.stats.int);
  const saveDC = 8 + updatedActor.proficiencyBonus + intMod;

  const effects = abilityDef.effects as Record<string, unknown>;

  switch (abilityId) {
    // ---- TELEPATH ----

    case 'psi-tel-1': { // Mind Spike - INT save, 2d6+INT psychic, weakened on fail
      const target = current.combatants.find((c) => c.id === targetId)!;
      const targetSaveMod = getSaveModifier(target.stats, 'int', target.proficiencyBonus, target.saveProficiencies) + getFeatBonus(target, 'allSaveBonus');
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
      { const lr = checkLegendaryResistance(current, targetId!, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }
      const rawDmg = damageRoll(2, 6, intMod);
      let totalDamage = rawDmg.total;
      let statusApplied: string | undefined;
      let statusDuration: number | undefined;
      let updatedTarget = target;

      if (save.success) {
        totalDamage = Math.floor(totalDamage / 2);
        const applied = applyPsychicDamage(updatedTarget, totalDamage);
        totalDamage = applied.damage;
        updatedTarget = applied.target;
      } else {
        const applied = applyPsychicDamage(updatedTarget, totalDamage);
        totalDamage = applied.damage;
        updatedTarget = applied.target;
        updatedTarget = applyStatusEffect(updatedTarget, 'weakened', 2, actorId);
        statusApplied = 'weakened';
        statusDuration = 2;
      }

      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === targetId ? updatedTarget : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetId, damage: totalDamage, saveRequired: true,
          saveRoll: save.roll, saveTotal: save.total, saveDC,
          saveSucceeded: save.success, statusApplied, statusDuration,
          targetHpAfter: updatedTarget.currentHp, targetKilled: !updatedTarget.isAlive,
          description: save.success
            ? `${abilityDef.name} deals ${totalDamage} psychic damage (save halved).`
            : `${abilityDef.name} deals ${totalDamage} psychic damage and weakens the target.`,
        },
      };
    }

    case 'psi-tel-2': { // Thought Shield - passive, no turn resolution
      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          description: 'Thought Shield is a passive ability and does not require activation.',
        },
      };
    }

    case 'psi-tel-3': { // Psychic Crush - WIS save, 3d8+INT psychic, stunned on fail
      const target = current.combatants.find((c) => c.id === targetId)!;
      const targetSaveMod = getSaveModifier(target.stats, 'wis', target.proficiencyBonus, target.saveProficiencies) + getFeatBonus(target, 'allSaveBonus');
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
      { const lr = checkLegendaryResistance(current, targetId!, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }
      const rawDmg = damageRoll(3, 8, intMod);
      let totalDamage = rawDmg.total;
      let statusApplied: string | undefined;
      let statusDuration: number | undefined;
      let updatedTarget = target;

      if (save.success) {
        totalDamage = Math.floor(totalDamage / 2);
        const applied = applyPsychicDamage(updatedTarget, totalDamage);
        totalDamage = applied.damage;
        updatedTarget = applied.target;
      } else {
        const applied = applyPsychicDamage(updatedTarget, totalDamage);
        totalDamage = applied.damage;
        updatedTarget = applied.target;
        updatedTarget = applyStatusEffect(updatedTarget, 'stunned', 1, actorId);
        statusApplied = 'stunned';
        statusDuration = 1;
      }

      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === targetId ? updatedTarget : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetId, damage: totalDamage, saveRequired: true,
          saveRoll: save.roll, saveTotal: save.total, saveDC,
          saveSucceeded: save.success, statusApplied, statusDuration,
          targetHpAfter: updatedTarget.currentHp, targetKilled: !updatedTarget.isAlive,
          description: save.success
            ? `${abilityDef.name} deals ${totalDamage} psychic damage (save halved).`
            : `${abilityDef.name} deals ${totalDamage} psychic damage and stuns the target.`,
        },
      };
    }

    case 'psi-tel-4': { // Dominate - WIS save at -2, control 1 round or weakened 2 rounds
      const target = current.combatants.find((c) => c.id === targetId)!;
      const targetSaveMod = getSaveModifier(target.stats, 'wis', target.proficiencyBonus, target.saveProficiencies) + getFeatBonus(target, 'allSaveBonus') - 2;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
      { const lr = checkLegendaryResistance(current, targetId!, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }
      let updatedTarget = target;
      let statusApplied: string | undefined;
      let statusDuration: number | undefined;
      let controlled = false;

      if (save.success) {
        updatedTarget = applyStatusEffect(updatedTarget, 'weakened', 2, actorId);
        statusApplied = 'weakened';
        statusDuration = 2;
      } else {
        updatedTarget = {
          ...updatedTarget,
          controlledBy: actorId,
          controlDuration: 1,
        };
        updatedTarget = applyStatusEffect(updatedTarget, 'dominated', 1, actorId);
        statusApplied = 'dominated';
        statusDuration = 1;
        controlled = true;
      }

      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === targetId ? updatedTarget : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetId, saveRequired: true,
          saveRoll: save.roll, saveTotal: save.total, saveDC,
          saveSucceeded: save.success, statusApplied, statusDuration, controlled,
          targetHpAfter: updatedTarget.currentHp, targetKilled: false,
          description: save.success
            ? `${target.name} resists ${abilityDef.name} but is weakened.`
            : `${target.name} falls under ${updatedActor.name}'s control for 1 round.`,
        },
      };
    }

    case 'psi-tel-5': { // Mind Shatter - AoE WIS save, 3d6+INT psychic, weakened
      const enemies = current.combatants.filter(
        (c) => c.team !== updatedActor.team && c.isAlive
      );
      let totalDamage = 0;
      const affectedIds: string[] = [];

      for (const enemy of enemies) {
        const targetSaveMod = getSaveModifier(enemy.stats, 'wis', enemy.proficiencyBonus, enemy.saveProficiencies) + getFeatBonus(enemy, 'allSaveBonus');
        let totalSaveMod = targetSaveMod;
        for (const eff of enemy.statusEffects) {
          const def = STATUS_EFFECT_DEFS[eff.name];
          if (def) totalSaveMod += def.saveModifier;
        }
        const save = savingThrow(totalSaveMod, saveDC);
        { const lr = checkLegendaryResistance(current, enemy.id, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }
        const rawDmg = damageRoll(3, 6, intMod);
        let dmg = rawDmg.total;
        let updatedEnemy = enemy;

        if (save.success) {
          dmg = Math.floor(dmg / 2);
          const applied = applyPsychicDamage(updatedEnemy, dmg);
          dmg = applied.damage;
          updatedEnemy = applied.target;
        } else {
          const applied = applyPsychicDamage(updatedEnemy, dmg);
          dmg = applied.damage;
          updatedEnemy = applied.target;
          updatedEnemy = applyStatusEffect(updatedEnemy, 'weakened', 2, actorId);
        }

        totalDamage += dmg;
        affectedIds.push(enemy.id);
        current = {
          ...current,
          combatants: current.combatants.map((c) => (c.id === enemy.id ? updatedEnemy : c)),
        };
      }

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetIds: affectedIds, damage: totalDamage, saveRequired: true, saveDC,
          description: `${abilityDef.name} hits ${affectedIds.length} enemies for a total of ${totalDamage} psychic damage.`,
        },
      };
    }

    case 'psi-tel-6': { // Absolute Dominion - WIS save at -4, control 2 rounds or stunned+2d10 psychic
      const target = current.combatants.find((c) => c.id === targetId)!;
      const targetSaveMod = getSaveModifier(target.stats, 'wis', target.proficiencyBonus, target.saveProficiencies) + getFeatBonus(target, 'allSaveBonus') - 4;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
      { const lr = checkLegendaryResistance(current, targetId!, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }
      let updatedTarget = target;
      let statusApplied: string | undefined;
      let statusDuration: number | undefined;
      let controlled = false;
      let totalDamage: number | undefined;

      if (save.success) {
        updatedTarget = applyStatusEffect(updatedTarget, 'stunned', 1, actorId);
        const rawDmg = damageRoll(2, 10);
        const applied = applyPsychicDamage(updatedTarget, rawDmg.total);
        totalDamage = applied.damage;
        updatedTarget = applied.target;
        statusApplied = 'stunned';
        statusDuration = 1;
      } else {
        updatedTarget = {
          ...updatedTarget,
          controlledBy: actorId,
          controlDuration: 2,
        };
        updatedTarget = applyStatusEffect(updatedTarget, 'dominated', 2, actorId);
        statusApplied = 'dominated';
        statusDuration = 2;
        controlled = true;
      }

      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === targetId ? updatedTarget : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetId, damage: totalDamage, saveRequired: true,
          saveRoll: save.roll, saveTotal: save.total, saveDC,
          saveSucceeded: save.success, statusApplied, statusDuration, controlled,
          targetHpAfter: updatedTarget.currentHp, targetKilled: !updatedTarget.isAlive,
          description: save.success
            ? `${target.name} resists ${abilityDef.name} but is stunned and takes ${totalDamage} psychic damage.`
            : `${target.name} falls under absolute domination for 2 rounds.`,
        },
      };
    }

    // ---- SEER ----

    case 'psi-see-1': { // Foresight - apply foresight status to self for 3 rounds
      const foresightTarget = targetId
        ? current.combatants.find((c) => c.id === targetId)!
        : updatedActor;
      const foresightTargetId = foresightTarget.id;
      const updatedForesightTarget = applyStatusEffect(foresightTarget, 'foresight', 3, actorId);

      current = {
        ...current,
        combatants: current.combatants.map((c) =>
          c.id === foresightTargetId ? updatedForesightTarget : c
        ),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetId: foresightTargetId, saveRequired: false,
          statusApplied: 'foresight', statusDuration: 3,
          description: `${foresightTarget.name} gains Foresight (+2 AC, +2 saves) for 3 rounds.`,
        },
      };
    }

    case 'psi-see-2': { // Danger Sense - passive
      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          description: 'Danger Sense is a passive ability and does not require activation.',
        },
      };
    }

    case 'psi-see-3': { // Precognitive Dodge - set reaction
      updatedActor = { ...updatedActor, hasReaction: true, reactionType: 'precognitive_dodge' };
      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === actorId ? updatedActor : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          description: `${updatedActor.name} readies Precognitive Dodge to negate the next incoming attack.`,
        },
      };
    }

    case 'psi-see-4': { // Third Eye - passive
      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          description: 'Third Eye is a passive ability and does not require activation.',
        },
      };
    }

    case 'psi-see-5': { // Temporal Echo - repeat last action
      // NOTE: freeAction in ability data is intentionally NOT implemented.
      // Echo replaying a full psion ability (Psychic Crush, Dominate, etc.) as a free action
      // would be extremely overpowered. Temporal Echo is balanced as a turn-consuming replay.
      if (!updatedActor.lastAction) {
        return {
          state: current,
          result: {
            type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
            saveRequired: false, echoAction: false,
            description: 'No previous action to echo.',
          },
        };
      }

      const lastAction = updatedActor.lastAction;

      // Echo psion spec abilities — re-resolve via resolvePsionAbility (no cooldown cost)
      if (lastAction.type === 'psion_ability' && lastAction.psionAbilityId) {
        const echo = resolvePsionAbility(current, actorId, lastAction.psionAbilityId, lastAction.targetId);
        return {
          state: echo.state,
          result: {
            ...echo.result,
            abilityName: `Temporal Echo: ${echo.result.abilityName}`,
            echoAction: true,
          },
        };
      }

      // Echo class abilities (tier 0 psion abilities route here) — re-resolve via resolveClassAbility
      if (lastAction.type === 'class_ability' && lastAction.classAbilityId) {
        // Temporarily zero out cooldown so the echo doesn't get blocked
        const origCd = updatedActor.abilityCooldowns?.[lastAction.classAbilityId] ?? 0;
        if (origCd > 0) {
          current = {
            ...current,
            combatants: current.combatants.map((c) =>
              c.id === actorId ? {
                ...c,
                abilityCooldowns: { ...c.abilityCooldowns, [lastAction.classAbilityId!]: 0 },
              } : c
            ),
          };
        }
        const echo = resolveClassAbility(current, actorId, lastAction.classAbilityId, lastAction.targetId, lastAction.targetIds);
        // Restore original cooldown (don't let echo consume a real use)
        let echoState = echo.state;
        if (origCd > 0) {
          echoState = {
            ...echoState,
            combatants: echoState.combatants.map((c) =>
              c.id === actorId ? {
                ...c,
                abilityCooldowns: { ...c.abilityCooldowns, [lastAction.classAbilityId!]: origCd },
              } : c
            ),
          };
        }
        return {
          state: echoState,
          result: {
            type: 'psion_ability', actorId,
            abilityName: `Temporal Echo: ${echo.result.abilityName ?? lastAction.classAbilityId}`,
            abilityId, saveRequired: false, echoAction: true,
            damage: echo.result.damage,
            description: echo.result.description ? `Temporal Echo: ${echo.result.description}` : `Temporal Echo repeats ${updatedActor.name}'s last class ability.`,
          },
        };
      }

      // Echo basic attacks — re-resolve via resolveAttack
      if (lastAction.type === 'attack' && lastAction.targetId && updatedActor.weapon) {
        const echoTarget = current.combatants.find((c) => c.id === lastAction.targetId && c.isAlive)
          ?? current.combatants.find((c) => c.team !== updatedActor.team && c.isAlive);
        if (echoTarget) {
          const echo = resolveAttack(current, actorId, echoTarget.id, updatedActor.weapon);
          return {
            state: echo.state,
            result: {
              type: 'psion_ability', actorId,
              abilityName: `Temporal Echo: Attack`,
              abilityId, saveRequired: false, echoAction: true,
              damage: echo.result.totalDamage,
              description: `Temporal Echo repeats ${updatedActor.name}'s attack against ${echoTarget.name}.`,
            },
          };
        }
      }

      // Fallback: action type not echoable (defend, flee, item, etc.)
      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false, echoAction: true,
          description: `Temporal Echo: no echoable action to repeat.`,
        },
      };
    }

    case 'psi-see-6': { // Prescient Mastery - enhanced foresight buff for 3 rounds
      // Apply foresight with enhanced modifiers: +4 saves (handled by additional blessed-like buff)
      updatedActor = applyStatusEffect(updatedActor, 'foresight', 3, actorId);
      // Stack a blessed buff for the additional +2 attack and save bonus
      updatedActor = applyStatusEffect(updatedActor, 'blessed', 3, actorId);

      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === actorId ? updatedActor : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          statusApplied: 'foresight', statusDuration: 3,
          description: `${updatedActor.name} achieves Prescient Mastery: foresight + blessed for 3 rounds (+2 AC, +4 saves, +2 attack).`,
        },
      };
    }

    // ---- NOMAD ----

    case 'psi-nom-1': { // Blink Strike - teleport attack with +2 hit + INT mod bonus damage
      const target = current.combatants.find((c) => c.id === targetId)!;
      if (!updatedActor.weapon) {
        return {
          state: current,
          result: {
            type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
            targetId, saveRequired: false,
            description: 'No weapon equipped for Blink Strike.',
          },
        };
      }

      // Create a modified weapon with +2 attack bonus and INT mod bonus damage
      const blinkWeapon: WeaponInfo = {
        ...updatedActor.weapon,
        bonusAttack: updatedActor.weapon.bonusAttack + 2,
        bonusDamage: updatedActor.weapon.bonusDamage + intMod,
      };

      // Resolve the attack (no reactions from target due to teleportation)
      const blinkAtk = resolveAttack(current, actorId, targetId!, blinkWeapon);
      current = blinkAtk.state;

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetId, damage: blinkAtk.result.totalDamage, saveRequired: false,
          targetHpAfter: blinkAtk.result.targetHpAfter,
          targetKilled: blinkAtk.result.targetKilled,
          description: blinkAtk.result.hit
            ? `${updatedActor.name} blinks to ${target.name} and strikes for ${blinkAtk.result.totalDamage} damage${blinkAtk.result.critical ? ' (critical!)' : ''}.`
            : `${updatedActor.name} blinks to ${target.name} but misses.`,
        },
      };
    }

    case 'psi-nom-2': { // Phase Step - passive
      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          description: 'Phase Step is a passive ability and does not require activation.',
        },
      };
    }

    case 'psi-nom-3': { // Dimensional Pocket - phase self for 1 round
      updatedActor = applyStatusEffect(updatedActor, 'phased', 1, actorId);
      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === actorId ? updatedActor : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          statusApplied: 'phased', statusDuration: 1,
          description: `${updatedActor.name} shifts into a dimensional pocket, becoming untargetable for 1 round.`,
        },
      };
    }

    case 'psi-nom-4': { // Translocation - enemy: INT save or stunned; ally: both get +2 AC
      const target = current.combatants.find((c) => c.id === targetId)!;
      let updatedTarget = target;

      if (target.team !== updatedActor.team) {
        // Enemy target: INT save or lose next action (stunned 1 round)
        const targetSaveMod = getSaveModifier(target.stats, 'int', target.proficiencyBonus, target.saveProficiencies) + getFeatBonus(target, 'allSaveBonus');
        let totalSaveMod = targetSaveMod;
        for (const eff of target.statusEffects) {
          const def = STATUS_EFFECT_DEFS[eff.name];
          if (def) totalSaveMod += def.saveModifier;
        }
        const save = savingThrow(totalSaveMod, saveDC);
        { const lr = checkLegendaryResistance(current, targetId!, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }

        if (!save.success) {
          updatedTarget = applyStatusEffect(updatedTarget, 'stunned', 1, actorId);
        }

        current = {
          ...current,
          combatants: current.combatants.map((c) => (c.id === targetId ? updatedTarget : c)),
        };

        return {
          state: current,
          result: {
            type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
            targetId, saveRequired: true,
            saveRoll: save.roll, saveTotal: save.total, saveDC,
            saveSucceeded: save.success,
            statusApplied: save.success ? undefined : 'stunned',
            statusDuration: save.success ? undefined : 1,
            description: save.success
              ? `${target.name} resists the disorientation from Translocation.`
              : `${target.name} is stunned by the sudden Translocation.`,
          },
        };
      } else {
        // Phase 7 MISMATCH-2: Ally target — +2 AC via ActiveBuff (not shielded +4).
        // Ability data says acBonus: 2. Using a custom buff keeps shielded status intact for other uses.
        const translocBuff = {
          sourceAbilityId: abilityId,
          name: 'Translocation Shield',
          roundsRemaining: 1,
          acMod: 2,
        };
        const targetBuffs = [...(updatedTarget.activeBuffs ?? []), translocBuff];
        updatedTarget = { ...updatedTarget, activeBuffs: targetBuffs };
        const actorBuffs = [...(updatedActor.activeBuffs ?? []), translocBuff];
        updatedActor = { ...updatedActor, activeBuffs: actorBuffs };

        current = {
          ...current,
          combatants: current.combatants.map((c) => {
            if (c.id === actorId) return updatedActor;
            if (c.id === targetId) return updatedTarget;
            return c;
          }),
        };

        return {
          state: current,
          result: {
            type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
            targetId, saveRequired: false,
            description: `${updatedActor.name} and ${target.name} swap positions, both gaining +2 AC for 1 round.`,
          },
        };
      }
    }

    case 'psi-nom-5': { // Rift Walk - AoE 2d8+INT psychic, WIS save or slowed 2 rounds
      const enemies = current.combatants.filter(
        (c) => c.team !== updatedActor.team && c.isAlive
      );
      let totalDamage = 0;
      const affectedIds: string[] = [];

      for (const enemy of enemies) {
        const targetSaveMod = getSaveModifier(enemy.stats, 'wis', enemy.proficiencyBonus, enemy.saveProficiencies) + getFeatBonus(enemy, 'allSaveBonus');
        let totalSaveMod = targetSaveMod;
        for (const eff of enemy.statusEffects) {
          const def = STATUS_EFFECT_DEFS[eff.name];
          if (def) totalSaveMod += def.saveModifier;
        }
        const save = savingThrow(totalSaveMod, saveDC);
        { const lr = checkLegendaryResistance(current, enemy.id, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }
        const rawDmg = damageRoll(2, 8, intMod);
        let dmg = rawDmg.total;
        const applied = applyPsychicDamage(enemy, dmg);
        dmg = applied.damage;
        let updatedEnemy = applied.target;

        if (!save.success) {
          updatedEnemy = applyStatusEffect(updatedEnemy, 'slowed', 2, actorId);
        }

        totalDamage += dmg;
        affectedIds.push(enemy.id);
        current = {
          ...current,
          combatants: current.combatants.map((c) => (c.id === enemy.id ? updatedEnemy : c)),
        };
      }

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetIds: affectedIds, damage: totalDamage, saveRequired: true, saveDC,
          description: `${abilityDef.name} tears through ${affectedIds.length} enemies for ${totalDamage} total psychic damage.`,
        },
      };
    }

    case 'psi-nom-6': { // Banishment - INT save at -2, banish 3 rounds or 2d6 psychic + slowed
      // NOTE: Damage dice, duration, and effects are hard-coded since psi-nom-6 is the only
      // banish ability. If additional banish abilities are added, refactor to read from abilityDef.effects.
      const target = current.combatants.find((c) => c.id === targetId)!;

      // Phase 7 BUG-3: noDuplicateBanish — cannot re-banish an already banished target
      if (target.banishedUntilRound != null) {
        return {
          state: current,
          result: {
            type: 'psion_ability', actorId, targetId, abilityName: abilityDef.name, abilityId,
            saveRequired: false,
            description: `${abilityDef.name}: Target is already banished — cannot re-banish.`,
          },
        };
      }

      const targetSaveMod = getSaveModifier(target.stats, 'int', target.proficiencyBonus, target.saveProficiencies) + getFeatBonus(target, 'allSaveBonus') - 2;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
      { const lr = checkLegendaryResistance(current, targetId!, save, saveDC); if (lr.overridden) { save.success = true; current = lr.state; } }
      let updatedTarget = target;
      let totalDamage: number | undefined;
      let banished = false;

      if (save.success) {
        // Save: 2d6 psychic + slowed 1 round
        const rawDmg = damageRoll(2, 6);
        const applied = applyPsychicDamage(updatedTarget, rawDmg.total);
        totalDamage = applied.damage;
        updatedTarget = applied.target;
        updatedTarget = applyStatusEffect(updatedTarget, 'slowed', 1, actorId);
      } else {
        // Fail: banished for 3 rounds
        updatedTarget = {
          ...updatedTarget,
          banishedUntilRound: current.round + 3,
        };
        updatedTarget = applyStatusEffect(updatedTarget, 'banished', 3, actorId);
        banished = true;
      }

      current = {
        ...current,
        combatants: current.combatants.map((c) => (c.id === targetId ? updatedTarget : c)),
      };

      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          targetId, damage: totalDamage, saveRequired: true,
          saveRoll: save.roll, saveTotal: save.total, saveDC,
          saveSucceeded: save.success, banished,
          statusApplied: save.success ? 'slowed' : 'banished',
          statusDuration: save.success ? 1 : 3,
          targetHpAfter: updatedTarget.currentHp, targetKilled: !updatedTarget.isAlive,
          description: save.success
            ? `${target.name} resists Banishment but takes ${totalDamage} psychic damage and is slowed.`
            : `${target.name} is banished to a dimensional void for 3 rounds!`,
        },
      };
    }

    default: {
      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false,
          description: `${abilityDef.name} has no combat resolution.`,
        },
      };
    }
  }
}

// ---- Main Turn Resolution ----

/**
 * Resolve a single turn for the current combatant in the turn order.
 * Processes status effects first, then resolves the action.
 * Returns the updated state with log entry appended.
 *
 * If racialContext is provided, racial passive abilities are applied to
 * attack/damage/AC calculations and 'racial_ability' becomes a valid action type.
 */
export function resolveTurn(
  state: CombatState,
  action: CombatAction,
  context: {
    weapon?: WeaponInfo;
    spell?: SpellInfo;
    item?: ItemInfo;
  },
  racialContext?: {
    tracker: RacialCombatTracker;
    race: string;
    level: number;
    subRace?: { id: string; element?: string } | null;
  }
): CombatState {
  const actorId = state.turnOrder[state.turnIndex];
  let current = state;

  // === LEGENDARY ACTION POOL REFRESH (at start of monster's turn) ===
  const laActor = current.combatants.find(c => c.id === actorId);
  if (laActor?.entityType === 'monster' && laActor.legendaryActionsMax && laActor.legendaryActionsMax > 0) {
    current = {
      ...current,
      combatants: current.combatants.map(c =>
        c.id === actorId ? { ...c, legendaryActionsRemaining: c.legendaryActionsMax } : c
      ),
    };
  }

  // Clear the actor's defend stance from previous round
  current = {
    ...current,
    combatants: current.combatants.map((c) =>
      c.id === actorId ? { ...c, isDefending: false } : c
    ),
  };

  // Check if stunned/frozen/paralyzed prevents action BEFORE ticking status effects
  // (a 1-round stun must block the turn before it expires)
  const actorBeforeTick = current.combatants.find((c) => c.id === actorId)!;
  const isPrevented = actorBeforeTick.statusEffects.some((e) => {
    const def = STATUS_EFFECT_DEFS[e.name];
    return def?.preventsAction;
  });

  // Process status effects at start of turn (DoT/HoT, duration decrement)
  const actor = actorBeforeTick;
  const { combatant: updatedActor, ticks } = processStatusEffects(actor);

  current = {
    ...current,
    combatants: current.combatants.map((c) =>
      c.id === actorId ? updatedActor : c
    ),
  };

  // Phase 5B PASSIVE-5: Increment stacking damage bonus at start of turn
  const actorForStacking = current.combatants.find((c) => c.id === actorId)!;
  if (actorForStacking.stackingDamagePerRound) {
    const newBonus = (actorForStacking.roundDamageBonus ?? 0) + actorForStacking.stackingDamagePerRound;
    current = {
      ...current,
      combatants: current.combatants.map(c =>
        c.id === actorId ? { ...c, roundDamageBonus: newBonus } : c
      ),
    };
  }

  // Process class ability cooldowns and buff ticks at start of turn
  const actorAfterStatus = current.combatants.find((c) => c.id === actorId)!;
  const cooldownTicked = tickClassAbilityCooldowns(actorAfterStatus);
  const enemies = current.combatants.filter(c => c.team !== actorAfterStatus.team && c.isAlive && !c.hasFled);
  const { combatant: buffTicked, hotHealing: classHotHealing, companionDamageDealt } = tickClassActiveBuffs(cooldownTicked, enemies);
  if (classHotHealing > 0) {
    ticks.push({
      combatantId: actorId,
      effectName: 'regenerating',
      healing: classHotHealing,
      expired: false,
      hpAfter: buffTicked.currentHp,
      killed: false,
    });
  }
  current = {
    ...current,
    combatants: current.combatants.map((c) =>
      c.id === actorId ? buffTicked : c
    ),
  };

  // Phase 3: Apply companion auto-damage to the targeted enemy
  if (companionDamageDealt) {
    const cTarget = current.combatants.find(c => c.id === companionDamageDealt.targetId);
    if (cTarget) {
      const newHp = Math.max(0, cTarget.currentHp - companionDamageDealt.damage);
      current = {
        ...current,
        combatants: current.combatants.map(c =>
          c.id === companionDamageDealt.targetId
            ? { ...c, currentHp: newHp, isAlive: newHp > 0 }
            : c
        ),
      };
      ticks.push({
        combatantId: companionDamageDealt.targetId,
        effectName: 'burning', // Visual proxy for companion damage
        damage: companionDamageDealt.damage,
        expired: false,
        hpAfter: newHp,
        killed: newHp <= 0,
      });
    }
  }

  // Process delayed effect detonations at start of turn (e.g., Death Mark)
  const actorForDelayed = current.combatants.find((c) => c.id === actorId)!;
  const { state: delayedState, detonations } = tickDelayedEffects(current, actorForDelayed);
  current = delayedState;
  for (const det of detonations) {
    ticks.push({
      combatantId: det.targetId,
      effectName: 'burning', // Visual proxy for delayed detonation
      damage: det.damage,
      expired: true,
      hpAfter: det.hpAfter,
      killed: det.killed,
    });
  }

  // Process Elementari Primordial Awakening AoE DoT at start of turn
  if (racialContext?.tracker) {
    const { state: awState } = processPrimordialAwakeningDot(current, actorId, racialContext.tracker);
    current = awState;
  }

  // === MONSTER REGENERATION (start of monster turn, before action) ===
  const regenActor = current.combatants.find(c => c.id === actorId);
  if (regenActor?.entityType === 'monster' && regenActor.monsterAbilities && regenActor.isAlive) {
    let regenUpdated = { ...regenActor };
    for (const inst of regenUpdated.monsterAbilities!) {
      if (inst.def.type === 'heal' && inst.def.hpPerTurn) {
        const disabled = inst.def.disabledBy?.some(dt =>
          regenUpdated.damageTypesReceivedThisRound?.includes(dt)
        );
        if (!disabled) {
          const healAmount = Math.min(inst.def.hpPerTurn, regenUpdated.maxHp - regenUpdated.currentHp);
          if (healAmount > 0) {
            regenUpdated = { ...regenUpdated, currentHp: regenUpdated.currentHp + healAmount };
            ticks.push({
              combatantId: actorId,
              effectName: 'regenerating',
              healing: healAmount,
              expired: false,
              hpAfter: regenUpdated.currentHp,
              killed: false,
            });
          }
        }
      }
    }
    if (regenUpdated.currentHp !== regenActor.currentHp) {
      current = {
        ...current,
        combatants: current.combatants.map(c => c.id === actorId ? regenUpdated : c),
      };
    }
  }

  // === FEAR AURA (player turn start — check opponent monster's fear_aura) ===
  const auraResults: AuraResult[] = [];
  const currentActorPreAura = current.combatants.find(c => c.id === actorId)!;
  if (currentActorPreAura.entityType === 'character' && !currentActorPreAura.fearAuraImmune) {
    const monsterOpponent = current.combatants.find(
      c => c.team !== currentActorPreAura.team && c.isAlive && c.entityType === 'monster' && c.monsterAbilities
    );
    if (monsterOpponent) {
      const fearAura = monsterOpponent.monsterAbilities?.find(inst => inst.def.type === 'fear_aura');
      if (fearAura) {
        const wisMod = getModifier(currentActorPreAura.stats.wis);
        let totalSaveMod = wisMod + currentActorPreAura.proficiencyBonus;
        for (const eff of currentActorPreAura.statusEffects) {
          const effDef = STATUS_EFFECT_DEFS[eff.name];
          if (effDef) totalSaveMod += effDef.saveModifier;
        }
        const auraSaveDC = fearAura.def.saveDC ?? 15;
        const save = savingThrow(totalSaveMod, auraSaveDC);
        const auraResult: AuraResult = {
          auraName: fearAura.def.name,
          auraType: 'fear',
          saveDC: auraSaveDC,
          saveRoll: save.roll,
          saveTotal: save.total,
          savePassed: save.success,
        };
        if (save.success) {
          // Immune after passing
          auraResult.immuneAfterPass = true;
          current = {
            ...current,
            combatants: current.combatants.map(c =>
              c.id === actorId ? { ...c, fearAuraImmune: true } : c
            ),
          };
        } else {
          // Apply frightened status (1 round)
          const frightened = applyStatusEffect(
            current.combatants.find(c => c.id === actorId)!,
            'frightened', 1, monsterOpponent.id
          );
          current = {
            ...current,
            combatants: current.combatants.map(c =>
              c.id === actorId ? frightened : c
            ),
          };
          auraResult.statusApplied = 'frightened';
        }
        auraResults.push(auraResult);
      }
    }
  }

  // If actor died to DoT, log and skip action
  if (!updatedActor.isAlive) {
    const logEntry: TurnLogEntry = {
      round: current.round,
      actorId,
      action: action.type,
      result: noOpDefend(actorId),
      statusTicks: ticks,
      ...(auraResults.length > 0 && { auraResults }),
    };

    return advanceTurn({
      ...current,
      log: [...current.log, logEntry],
    });
  }

  // Handle dominated combatants: force attack an ally
  const currentActor = current.combatants.find((c) => c.id === actorId)!;
  if (currentActor.controlledBy && (currentActor.controlDuration ?? 0) > 0) {
    // Find closest ally (same team) to attack
    const allies = current.combatants.filter(
      (c) => c.team === currentActor.team && c.isAlive && c.id !== actorId
    );
    let result: TurnResult;

    if (allies.length > 0 && currentActor.weapon) {
      const allyTarget = allies[0];
      const atk = resolveAttack(current, actorId, allyTarget.id, currentActor.weapon);
      current = atk.state;
      result = atk.result;
    } else {
      result = noOpDefend(actorId);
    }

    // Decrement control duration
    let newDuration = (currentActor.controlDuration ?? 1) - 1;
    current = {
      ...current,
      combatants: current.combatants.map((c) => {
        if (c.id !== actorId) return c;
        if (newDuration <= 0) {
          // Control ended: clear domination
          return {
            ...c,
            controlledBy: null,
            controlDuration: 0,
            statusEffects: c.statusEffects.filter((e) => e.name !== 'dominated'),
          };
        }
        return { ...c, controlDuration: newDuration };
      }),
    };

    const logEntry: TurnLogEntry = {
      round: current.round,
      actorId,
      action: 'attack',
      result,
      statusTicks: ticks,
    };

    current = { ...current, log: [...current.log, logEntry] };
    current = checkCombatEnd(current);
    if (current.status === 'ACTIVE') {
      current = advanceTurn(current);
    }
    return current;
  }

  let result: TurnResult;

  // Phase 5B MECH-7: Taunt enforcement — override attack/ability target to taunt source
  const tauntEffect = currentActor.statusEffects.find(e => e.name === 'taunt');
  if (tauntEffect && !isPrevented) {
    const tauntSource = current.combatants.find(c => c.id === tauntEffect.sourceId && c.isAlive && !c.hasFled);
    if (tauntSource && (action.type === 'attack' || action.type === 'class_ability')) {
      action = { ...action, targetId: tauntSource.id };
    }
  }

  if (isPrevented) {
    // Forced to "defend" when unable to act
    result = noOpDefend(actorId);
  } else {
    // Resolve the chosen action
    switch (action.type) {
      case 'attack': {
        if (!action.targetId || !context.weapon) {
          result = noOpDefend(actorId);
          break;
        }
        // First attack (always happens)
        const atk = resolveAttack(current, actorId, action.targetId, context.weapon, racialContext?.tracker);
        current = atk.state;
        result = atk.result;

        // === EXTRA ATTACKS ===
        const totalAttacks = currentActor.extraAttacks ?? 1;
        const extraAttackResults: TurnLogEntry[] = [];

        if (totalAttacks > 1) {
          for (let i = 1; i < totalAttacks; i++) {
            // Check combat is still active
            current = checkCombatEnd(current);
            if (current.status !== 'ACTIVE') break;

            // Re-fetch actor (may have taken damage from thorns/reflect)
            const actorNow = current.combatants.find(c => c.id === actorId);
            if (!actorNow || !actorNow.isAlive) break;

            // Find a valid target: prefer original, fall back to any alive enemy
            let extraTargetId = action.targetId;
            const originalTarget = current.combatants.find(c => c.id === extraTargetId);
            if (!originalTarget || !originalTarget.isAlive) {
              const anyEnemy = current.combatants.find(
                c => c.team !== actorNow.team && c.isAlive && !c.hasFled
              );
              if (!anyEnemy) break;
              extraTargetId = anyEnemy.id;
            }

            // Resolve extra attack
            const extraAtk = resolveAttack(current, actorId, extraTargetId, context.weapon, racialContext?.tracker);
            current = extraAtk.state;

            // Log as separate entry
            extraAttackResults.push({
              round: current.round,
              actorId,
              action: 'attack',
              result: extraAtk.result,
              statusTicks: [],
            });
          }

          // Append all extra attack logs
          if (extraAttackResults.length > 0) {
            current = { ...current, log: [...current.log, ...extraAttackResults] };
          }
        }

        // Check for Orcish Rampage: bonus attack on kill (only from FIRST attack)
        if (atk.result.targetKilled && racialContext) {
          const bonusAttack = checkBonusAttackOnKill(racialContext.race, racialContext.level, racialContext.tracker);
          if (bonusAttack) {
            // Find next alive enemy for bonus attack
            const nextTarget = current.combatants.find(
              (c) => c.team !== actor.team && c.isAlive && c.id !== action.targetId
            );
            if (nextTarget && context.weapon) {
              const bonus = resolveAttack(current, actorId, nextTarget.id, context.weapon, racialContext.tracker);
              current = bonus.state;
              // Log the bonus attack as an additional entry
              const bonusLog: TurnLogEntry = {
                round: current.round,
                actorId,
                action: 'attack',
                result: bonus.result,
                statusTicks: [],
              };
              current = { ...current, log: [...current.log, bonusLog] };
            }
          }
        }
        // Track lastAction for Temporal Echo
        current = {
          ...current,
          combatants: current.combatants.map((c) =>
            c.id === actorId ? { ...c, lastAction: action } : c
          ),
        };
        break;
      }

      case 'cast': {
        if (!action.targetId || !context.spell) {
          result = noOpDefend(actorId);
          break;
        }
        // Silence prevents spellcasting (verbal component)
        const casterForSilence = current.combatants.find(c => c.id === actorId)!;
        if (casterForSilence.statusEffects.some(e => e.name === 'silence')) {
          result = noOpDefend(actorId);
          break;
        }
        const slotLevel = action.spellSlotLevel ?? context.spell.level;
        // Verify actor has a slot available
        const actorNow = current.combatants.find((c) => c.id === actorId)!;
        if ((actorNow.spellSlots[slotLevel] ?? 0) <= 0) {
          result = noOpDefend(actorId);
          break;
        }
        const cast = resolveCast(current, actorId, action.targetId, context.spell, slotLevel);
        current = cast.state;
        result = cast.result;
        break;
      }

      case 'defend': {
        const def = resolveDefend(current, actorId);
        current = def.state;
        result = def.result;
        break;
      }

      case 'item': {
        if (!action.targetId || !context.item) {
          result = noOpDefend(actorId);
          break;
        }
        const itm = resolveItem(current, actorId, action.targetId, context.item);
        current = itm.state;
        result = itm.result;
        break;
      }

      case 'flee': {
        const fl = resolveFlee(current, actorId);
        current = fl.state;
        result = fl.result;
        break;
      }

      case 'racial_ability': {
        if (!action.racialAbilityName || !racialContext) {
          result = noOpDefend(actorId);
          break;
        }
        const abilityResult = resolveRacialAbility(
          current,
          actorId,
          action.racialAbilityName,
          racialContext.race,
          racialContext.level,
          racialContext.tracker,
          action.targetIds,
          racialContext.subRace,
        );
        current = abilityResult.state;
        result = {
          type: 'racial_ability',
          actorId,
          abilityName: action.racialAbilityName,
          success: abilityResult.success,
          description: abilityResult.description,
          targetIds: abilityResult.combatLog[0]?.targetIds,
          damage: abilityResult.combatLog[0]?.damage,
          healing: abilityResult.combatLog[0]?.healing,
          statusApplied: abilityResult.combatLog[0]?.statusApplied,
        } as RacialAbilityActionResult;
        break;
      }

      case 'psion_ability': {
        if (!action.psionAbilityId) {
          result = noOpDefend(actorId);
          break;
        }
        const psi = resolvePsionAbility(current, actorId, action.psionAbilityId, action.targetId);
        current = psi.state;
        result = psi.result;
        // Set cooldown for the psion ability (resolveClassAbility does this internally, psion does not)
        const psiDef = psionAbilities.find(a => a.id === action.psionAbilityId);
        if (psiDef && psiDef.cooldown > 0) {
          const psiActor = current.combatants.find(c => c.id === actorId);
          if (psiActor) {
            current = {
              ...current,
              combatants: current.combatants.map((c) =>
                c.id === actorId ? {
                  ...c,
                  abilityCooldowns: { ...c.abilityCooldowns, [action.psionAbilityId!]: psiDef.cooldown },
                } : c
              ),
            };
          }
        }
        // Track lastAction for Temporal Echo — skip echo itself to prevent
        // infinite recursion (echo replaying echo replaying echo...)
        if (action.psionAbilityId !== 'psi-see-5') {
          current = {
            ...current,
            combatants: current.combatants.map((c) =>
              c.id === actorId ? { ...c, lastAction: action } : c
            ),
          };
        }
        break;
      }

      case 'class_ability': {
        if (!action.classAbilityId) {
          result = noOpDefend(actorId);
          break;
        }
        const classAbility = resolveClassAbility(current, actorId, action.classAbilityId, action.targetId, action.targetIds);
        current = classAbility.state;
        result = classAbility.result;
        // Apply damage type interaction to class ability damage
        if (classAbility.result.damage && classAbility.result.damage > 0 && action.targetId && context.weapon?.damageType) {
          const dtTarget = current.combatants.find(c => c.id === action.targetId);
          if (dtTarget) {
            const dtRes = applyDamageTypeInteraction(classAbility.result.damage, context.weapon.damageType as CombatDamageType, dtTarget);
            if (dtRes.interaction !== 'normal') {
              // Undo full damage, reapply with DT modifier
              const hpBeforeDmg = classAbility.result.targetHpBefore ?? (dtTarget.currentHp + classAbility.result.damage);
              const newHp = Math.max(0, hpBeforeDmg - dtRes.finalDamage);
              current = {
                ...current,
                combatants: current.combatants.map(c =>
                  c.id === action.targetId ? { ...c, currentHp: newHp, isAlive: newHp > 0 } : c
                ),
              };
              (classAbility.result as any).damageTypeResult = dtRes;
              (classAbility.result as any).targetHpAfter = newHp;
              (classAbility.result as any).targetKilled = newHp <= 0;
            }
            // Track damage type received for regen-disabling
            if (dtRes.finalDamage > 0) {
              current = {
                ...current,
                combatants: current.combatants.map(c =>
                  c.id === action.targetId ? {
                    ...c,
                    damageTypesReceivedThisRound: [
                      ...(c.damageTypesReceivedThisRound ?? []),
                      context.weapon!.damageType as CombatDamageType,
                    ],
                  } : c
                ),
              };
            }
          }
        }
        // If effect type is unimplemented, fall back to basic attack
        if (classAbility.result.fallbackToAttack && action.targetId && context.weapon) {
          const atk = resolveAttack(current, actorId, action.targetId, context.weapon, racialContext?.tracker);
          current = atk.state;
          result = atk.result;
        }
        // Track lastAction for Temporal Echo (psion tier 0 abilities route here)
        current = {
          ...current,
          combatants: current.combatants.map((c) =>
            c.id === actorId ? { ...c, lastAction: action } : c
          ),
        };
        // Phase 3: Diplomat's Gambit may end combat peacefully
        if (current.status === 'COMPLETED') {
          const logEntry: TurnLogEntry = {
            round: current.round,
            actorId,
            action: action.type,
            result,
            statusTicks: ticks,
          };
          return { ...current, log: [...current.log, logEntry] };
        }
        break;
      }

      case 'monster_ability': {
        if (!action.monsterAbilityId) {
          result = noOpDefend(actorId);
          break;
        }
        const mActor = current.combatants.find(c => c.id === actorId);
        const abilityInst = mActor?.monsterAbilities?.find(inst => inst.def.id === action.monsterAbilityId);
        if (!abilityInst || !mActor) {
          // Fallback to basic attack if ability not found
          if (action.targetId && context.weapon) {
            const atk = resolveAttack(current, actorId, action.targetId, context.weapon, racialContext?.tracker);
            current = atk.state;
            result = atk.result;
          } else {
            result = noOpDefend(actorId);
          }
          break;
        }
        const { resolveMonsterAbility } = require('./monster-ability-resolver');
        const monsterAbilityResult = resolveMonsterAbility(current, actorId, abilityInst.def, action.targetId, action.targetIds);
        current = monsterAbilityResult.state;
        result = monsterAbilityResult.result;

        // Tick cooldowns: set cooldown on the used ability, decrement others
        current = {
          ...current,
          combatants: current.combatants.map(c => {
            if (c.id !== actorId || !c.monsterAbilities) return c;
            return {
              ...c,
              monsterAbilities: c.monsterAbilities.map(inst => {
                if (inst.def.id === action.monsterAbilityId) {
                  return {
                    ...inst,
                    cooldownRemaining: inst.def.recharge ? 1 : (inst.def.cooldown ?? 0),
                    usesRemaining: inst.usesRemaining !== null ? inst.usesRemaining - 1 : null,
                    isRecharged: false,
                  };
                }
                return inst;
              }),
            };
          }),
        };
        break;
      }

      default:
        result = noOpDefend(actorId);
    }
  }

  // === DAMAGE AURA for non-attack melee actions (class_ability etc. hitting a monster with damage_aura) ===
  // resolveAttack() already handles damage_aura for basic 'attack' actions
  if (
    action.type !== 'attack' &&
    !isPrevented &&
    context.weapon?.attackModifierStat === 'str'
  ) {
    const actorForAura = current.combatants.find(c => c.id === actorId);
    if (actorForAura?.entityType === 'character') {
      const resultAny = result as any;
      const resultDmg = resultAny?.damage ?? resultAny?.totalDamage ?? 0;
      const targetIdForAura = resultAny?.targetId ?? action.targetId;
      if (resultDmg > 0 && targetIdForAura) {
        const auraTarget = current.combatants.find(c => c.id === targetIdForAura);
        if (auraTarget?.entityType === 'monster' && auraTarget.monsterAbilities) {
          const dmgAura = auraTarget.monsterAbilities.find(inst => inst.def.type === 'damage_aura');
          if (dmgAura?.def.auraDamage) {
            const auraDmgMatch = dmgAura.def.auraDamage.match(/^(\d+)d(\d+)$/);
            if (auraDmgMatch) {
              const auraDmgRoll = damageRoll(parseInt(auraDmgMatch[1]), parseInt(auraDmgMatch[2]));
              let auraDmg = auraDmgRoll.total;
              const auraDmgType = dmgAura.def.auraDamageType;
              if (auraDmgType && actorForAura.resistances?.includes(auraDmgType as CombatDamageType)) {
                auraDmg = Math.floor(auraDmg / 2);
              }
              if (auraDmgType && actorForAura.immunities?.includes(auraDmgType as CombatDamageType)) {
                auraDmg = 0;
              }
              if (auraDmg > 0) {
                const newHp = Math.max(0, actorForAura.currentHp - auraDmg);
                current = {
                  ...current,
                  combatants: current.combatants.map(c =>
                    c.id === actorId ? { ...c, currentHp: newHp, isAlive: newHp > 0 } : c
                  ),
                };
              }
              auraResults.push({
                auraName: dmgAura.def.name,
                auraType: 'damage',
                damage: auraDmg,
                damageType: auraDmgType as CombatDamageType,
                damageRoll: dmgAura.def.auraDamage,
              });
            }
          }
        }
      }
    }
  }

  // Consume LR result from state (set by checkLegendaryResistance during action resolution)
  const lrResult = current.lastLegendaryResistance;
  if (lrResult) {
    current = { ...current, lastLegendaryResistance: undefined };
  }

  const logEntry: TurnLogEntry = {
    round: current.round,
    actorId,
    action: action.type,
    result,
    statusTicks: ticks,
    ...(auraResults.length > 0 && { auraResults }),
    ...(lrResult && { legendaryResistance: lrResult }),
  };

  current = {
    ...current,
    log: [...current.log, logEntry],
  };

  // Phase 5B MECH-10: Extra action — resolve one basic attack if extraAction buff is present
  const extraActionActor = current.combatants.find(c => c.id === actorId);
  if (
    extraActionActor?.isAlive &&
    !extraActionActor.extraActionUsedThisTurn &&
    extraActionActor.activeBuffs?.some(b => b.extraAction === true) &&
    context.weapon &&
    !isPrevented
  ) {
    // Find a valid target
    const extraEnemies = current.combatants.filter(c => c.team !== extraActionActor.team && c.isAlive && !c.hasFled);
    if (extraEnemies.length > 0) {
      const extraTarget = extraEnemies.reduce((w, e) => e.currentHp < w.currentHp ? e : w);
      // Mark extra action used to prevent infinite loops
      current = {
        ...current,
        combatants: current.combatants.map(c =>
          c.id === actorId ? { ...c, extraActionUsedThisTurn: true } : c
        ),
      };
      const extraAtk = resolveAttack(current, actorId, extraTarget.id, context.weapon, racialContext?.tracker);
      current = extraAtk.state;
      const extraLog: TurnLogEntry = {
        round: current.round,
        actorId,
        action: 'attack',
        result: extraAtk.result,
        statusTicks: [],
      };
      current = { ...current, log: [...current.log, extraLog] };
    }
  }

  // Reset extra action flag at end of turn
  if (extraActionActor?.extraActionUsedThisTurn) {
    current = {
      ...current,
      combatants: current.combatants.map(c =>
        c.id === actorId ? { ...c, extraActionUsedThisTurn: false } : c
      ),
    };
  }

  // === MONSTER ABILITY COOLDOWN TICK ===
  const turnActor = current.combatants.find(c => c.id === actorId);
  if (turnActor?.entityType === 'monster' && turnActor.monsterAbilities) {
    let updatedActor = { ...turnActor };

    // Clear damage types received this round
    updatedActor = { ...updatedActor, damageTypesReceivedThisRound: [] };

    // Tick all ability cooldowns down by 1
    updatedActor = {
      ...updatedActor,
      monsterAbilities: updatedActor.monsterAbilities!.map(inst => ({
        ...inst,
        cooldownRemaining: inst.def.recharge
          ? inst.cooldownRemaining  // recharge abilities only clear via d6 roll, not tick
          : Math.max(0, inst.cooldownRemaining - 1),
      })),
    };

    current = {
      ...current,
      combatants: current.combatants.map(c => c.id === actorId ? updatedActor : c),
    };
  }

  // Tick down racial active buff durations at end of turn
  if (racialContext?.tracker) {
    tickActiveBuffs(racialContext.tracker);
  }

  // Check for combat end
  current = checkCombatEnd(current);

  // Advance to next turn
  if (current.status === 'ACTIVE') {
    current = advanceTurn(current);
  }

  return current;
}

// ---- Turn / Round Management ----

/** Advance to the next combatant's turn. Skips dead and banished combatants. Increments round as needed. */
function advanceTurn(state: CombatState): CombatState {
  let { turnIndex, round, turnOrder } = state;
  let combatants = [...state.combatants];
  const maxIterations = turnOrder.length;
  let iterations = 0;

  do {
    turnIndex++;
    if (turnIndex >= turnOrder.length) {
      turnIndex = 0;
      round++;
    }
    iterations++;
    const combatantIndex = combatants.findIndex((c) => c.id === turnOrder[turnIndex]);
    if (combatantIndex === -1) continue;
    const combatant = combatants[combatantIndex];

    // Check if banished combatant should return this round
    if (combatant.banishedUntilRound != null && combatant.banishedUntilRound <= round) {
      // Return from banishment: apply 4d6 psychic damage + stunned 1 round
      const returnDmg = damageRoll(4, 6);
      const applied = applyPsychicDamage(combatant, returnDmg.total);
      let returned = applied.target;
      returned = applyStatusEffect(returned, 'stunned', 1, 'banishment');
      returned = {
        ...returned,
        banishedUntilRound: null,
        statusEffects: returned.statusEffects.filter((e) => e.name !== 'banished'),
      };
      combatants = combatants.map((c) => (c.id === combatant.id ? returned : c));
      // Banishment return skips their turn (they are stunned), continue to next
      continue;
    }

    // Skip banished combatants (still in the void)
    if (combatant.banishedUntilRound != null && combatant.banishedUntilRound > round) {
      continue;
    }

    if (combatant.isAlive) break;
  } while (iterations < maxIterations);

  return { ...state, turnIndex, round, combatants };
}

/** Check if combat has ended (one team standing). */
export function checkCombatEnd(state: CombatState): CombatState {
  const aliveTeams = new Set<number>();
  for (const c of state.combatants) {
    if (c.isAlive) aliveTeams.add(c.team);
  }

  if (aliveTeams.size <= 1) {
    const winningTeam = aliveTeams.size === 1 ? [...aliveTeams][0] : null;
    return {
      ...state,
      status: 'COMPLETED',
      winningTeam,
    };
  }

  return state;
}

// ---- Death Penalty ----

/** Calculate death penalties for a character. Uses level-scaled penalties. */
export function calculateDeathPenalty(
  characterId: string,
  level: number,
  gold: number,
  respawnTownId: string
): DeathPenalty {
  const goldLost = Math.floor(gold * (DEATH_GOLD_LOSS_PERCENT / 100));
  const xpLost = getDeathXpPenalty(level);
  const durabilityDamage = getDeathDurabilityPenalty(level);

  return {
    characterId,
    goldLostPercent: DEATH_GOLD_LOSS_PERCENT,
    goldLost,
    xpLost,
    durabilityDamage,
    respawnTownId,
  };
}

// ---- Factory Helpers ----

/** Create an initial CombatState for a new session. */
export function createCombatState(
  sessionId: string,
  type: CombatState['type'],
  combatants: Combatant[]
): CombatState {
  const state: CombatState = {
    sessionId,
    type,
    status: 'ACTIVE',
    round: 0,
    turnIndex: 0,
    combatants,
    turnOrder: [],
    log: [],
    winningTeam: null,
  };

  return rollAllInitiative(state);
}

/** Create a Combatant from character data. */
export function createCharacterCombatant(
  id: string,
  name: string,
  team: number,
  stats: CharacterStats,
  level: number,
  hp: number,
  maxHp: number,
  equipmentAC: number,
  weapon: WeaponInfo | null,
  spellSlots: { [level: number]: number },
  proficiencyBonus: number = 0
): Combatant {
  return {
    id,
    name,
    entityType: 'character',
    team,
    stats,
    level,
    currentHp: hp,
    maxHp,
    ac: equipmentAC > 0 ? equipmentAC : BASE_AC + getModifier(stats.dex),
    initiative: 0,
    statusEffects: [],
    spellSlots,
    weapon,
    isAlive: true,
    isDefending: false,
    proficiencyBonus,
    controlledBy: null,
    controlDuration: 0,
    banishedUntilRound: null,
    hasReaction: false,
    reactionType: null,
    lastAction: null,
  };
}

/** Create a Combatant from monster data. */
export function createMonsterCombatant(
  id: string,
  name: string,
  team: number,
  stats: CharacterStats,
  level: number,
  hp: number,
  ac: number,
  weapon: WeaponInfo | null,
  proficiencyBonus: number = 0,
  options?: {
    resistances?: CombatDamageType[];
    immunities?: CombatDamageType[];
    vulnerabilities?: CombatDamageType[];
    conditionImmunities?: string[];
    critImmunity?: boolean;
    critResistance?: number;
    monsterAbilities?: MonsterAbilityInstance[];
    legendaryActions?: number;
    legendaryResistances?: number;
    phaseTransitions?: PhaseTransition[];
  },
): Combatant {
  return {
    id,
    name,
    entityType: 'monster',
    team,
    stats,
    level,
    currentHp: hp,
    maxHp: hp,
    ac,
    initiative: 0,
    statusEffects: [],
    spellSlots: {},
    weapon,
    isAlive: true,
    isDefending: false,
    proficiencyBonus,
    ...(options?.resistances && { resistances: options.resistances }),
    ...(options?.immunities && { immunities: options.immunities }),
    ...(options?.vulnerabilities && { vulnerabilities: options.vulnerabilities }),
    ...(options?.conditionImmunities && { conditionImmunities: options.conditionImmunities }),
    ...(options?.critImmunity && { critImmunity: options.critImmunity }),
    ...(options?.critResistance && { critResistance: options.critResistance }),
    ...(options?.monsterAbilities && { monsterAbilities: options.monsterAbilities }),
    ...(options?.legendaryActions && {
      legendaryActionsMax: options.legendaryActions,
      legendaryActionsRemaining: options.legendaryActions,
    }),
    ...(options?.legendaryResistances && {
      legendaryResistancesMax: options.legendaryResistances,
      legendaryResistancesRemaining: options.legendaryResistances,
    }),
    ...(options?.phaseTransitions && options.phaseTransitions.length > 0 && {
      phaseTransitions: options.phaseTransitions.map(pt => ({ ...pt, triggered: false })),
    }),
  };
}

// ---- Death Throes ----

/** Parse dice string like "8d6" or "3d6+5" into components */
function parseDiceString(diceStr: string): { count: number; sides: number; bonus: number } {
  const match = diceStr.match(/^(\d+)d(\d+)(?:([+-]\d+))?$/);
  if (!match) return { count: 1, sides: 6, bonus: 0 };
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    bonus: match[3] ? parseInt(match[3], 10) : 0,
  };
}

/**
 * Resolve death throes for a dead monster. Fires AoE damage on first alive enemy (player).
 * Called once per monster death — `deathThroesProcessed` flag prevents double-firing.
 */
export function resolveDeathThroes(
  state: CombatState,
  deadMonsterId: string,
): { state: CombatState; result: DeathThroesResult | null } {
  const monster = state.combatants.find(c => c.id === deadMonsterId);
  if (!monster || monster.isAlive || monster.deathThroesProcessed) {
    return { state, result: null };
  }

  // Find death_throes ability
  const dtAbility = monster.monsterAbilities?.find(inst => inst.def.type === 'death_throes');
  if (!dtAbility) {
    return { state, result: null };
  }

  const def = dtAbility.def;
  if (!def.deathDamage || !def.deathDamageType || !def.deathSaveDC || !def.deathSaveType) {
    return { state, result: null };
  }

  // Find first alive enemy (player)
  const player = state.combatants.find(c => c.team !== monster.team && c.isAlive);
  if (!player) {
    return { state, result: null };
  }

  // Roll damage
  const parsed = parseDiceString(def.deathDamage);
  const dmgResult = damageRoll(parsed.count, parsed.sides, parsed.bonus);
  const totalDmg = dmgResult.total;
  const damageRollStr = def.deathDamage;

  // Player saves
  const saveStat = def.deathSaveType;
  const statMod = getModifier(player.stats[saveStat]);
  const profBonus = player.proficiencyBonus;

  // Status effect save modifiers
  let statusSaveMod = 0;
  for (const effect of player.statusEffects) {
    const effectDef = STATUS_EFFECT_DEFS[effect.name];
    if (effectDef && effectDef.saveModifier !== 0) {
      statusSaveMod += effectDef.saveModifier;
    }
  }

  const profPenalty = getNonProfArmorSavePenalty(player, saveStat);
  const saveResult = savingThrow(statMod + profBonus + statusSaveMod + profPenalty, def.deathSaveDC);
  const savePassed = saveResult.success;

  let finalDamage = savePassed ? Math.floor(totalDmg / 2) : totalDmg;

  // Apply damage type interaction
  const dtResult = applyDamageTypeInteraction(finalDamage, def.deathDamageType, player);
  finalDamage = dtResult.finalDamage;

  // Apply damage to player
  const playerHpBefore = player.currentHp;
  const newHp = Math.max(0, playerHpBefore - finalDamage);
  const playerSurvived = newHp > 0;

  // Mark monster as processed
  state = {
    ...state,
    combatants: state.combatants.map(c => {
      if (c.id === deadMonsterId) return { ...c, deathThroesProcessed: true };
      if (c.id === player.id) return { ...c, currentHp: newHp, isAlive: playerSurvived };
      return c;
    }),
  };

  const result: DeathThroesResult = {
    monsterName: monster.name,
    damage: totalDmg,
    damageType: def.deathDamageType,
    damageRoll: damageRollStr,
    saveDC: def.deathSaveDC,
    saveType: saveStat,
    saveRoll: saveResult.roll,
    saveTotal: saveResult.total,
    savePassed,
    finalDamage,
    playerHpBefore,
    playerHpAfter: newHp,
    playerSurvived,
    mutualKill: !playerSurvived,
  };

  return { state, result };
}

// ---- Phase Transitions ----

/**
 * Check and trigger phase transitions for a monster based on current HP%.
 * Only triggers ONE transition per call (the highest untriggered threshold reached).
 */
export function checkPhaseTransitions(
  state: CombatState,
  monsterId: string,
): { state: CombatState; result: PhaseTransitionResult | null } {
  const monster = state.combatants.find(c => c.id === monsterId);
  if (!monster || !monster.isAlive || !monster.phaseTransitions || monster.phaseTransitions.length === 0) {
    return { state, result: null };
  }

  const hpPercent = (monster.currentHp / monster.maxHp) * 100;

  // Find untriggered transitions where HP% has dropped to or below the threshold
  const eligible = monster.phaseTransitions
    .filter(pt => !pt.triggered && pt.hpThresholdPercent >= hpPercent);

  if (eligible.length === 0) {
    return { state, result: null };
  }

  // Take the highest threshold first (only one per call)
  eligible.sort((a, b) => b.hpThresholdPercent - a.hpThresholdPercent);
  const transition = eligible[0];

  // Mark as triggered
  const updatedTransitions = monster.phaseTransitions.map(pt =>
    pt.id === transition.id ? { ...pt, triggered: true } : pt
  );

  let updatedMonster: Combatant = { ...monster, phaseTransitions: updatedTransitions };
  const effectDescriptions: string[] = [];
  let aoeDamage: number | undefined;
  let aoeSavePassed: boolean | undefined;

  // Find the player target (for aoe_burst)
  const player = state.combatants.find(c => c.team !== monster.team && c.isAlive);

  for (const effect of transition.effects) {
    switch (effect.type) {
      case 'add_ability': {
        if (effect.ability) {
          const newInstance: MonsterAbilityInstance = {
            def: effect.ability,
            cooldownRemaining: 0,
            usesRemaining: effect.ability.usesPerCombat ?? null,
            isRecharged: true,
          };
          updatedMonster = {
            ...updatedMonster,
            monsterAbilities: [...(updatedMonster.monsterAbilities ?? []), newInstance],
          };
          effectDescriptions.push(`Unlocked: ${effect.ability.name}`);
        }
        break;
      }
      case 'stat_boost': {
        if (effect.statBoost) {
          const buff = {
            sourceAbilityId: transition.id,
            name: transition.name,
            roundsRemaining: 999, // permanent for combat duration
            ...(effect.statBoost.attack && { attackMod: effect.statBoost.attack }),
            ...(effect.statBoost.ac && { acMod: effect.statBoost.ac }),
            ...(effect.statBoost.damage && { damageMod: effect.statBoost.damage }),
          };
          updatedMonster = {
            ...updatedMonster,
            activeBuffs: [...(updatedMonster.activeBuffs ?? []), buff],
          };
          const parts: string[] = [];
          if (effect.statBoost.attack) parts.push(`+${effect.statBoost.attack} attack`);
          if (effect.statBoost.damage) parts.push(`+${effect.statBoost.damage} damage`);
          if (effect.statBoost.ac) parts.push(`${effect.statBoost.ac > 0 ? '+' : ''}${effect.statBoost.ac} AC`);
          effectDescriptions.push(`Stat boost: ${parts.join(', ')}`);
        }
        break;
      }
      case 'self_buff': {
        if (effect.selfBuff) {
          updatedMonster = applyStatusEffect(
            updatedMonster,
            effect.selfBuff.status as any,
            effect.selfBuff.duration,
            monsterId,
          );
          effectDescriptions.push(`Applied: ${effect.selfBuff.status} (${effect.selfBuff.duration} rounds)`);
        }
        break;
      }
      case 'aoe_burst': {
        if (effect.aoeBurst && player) {
          const burstParsed = parseDiceString(effect.aoeBurst.damage);
          const burstRoll = damageRoll(burstParsed.count, burstParsed.sides, burstParsed.bonus);
          const burstDamage = burstRoll.total;
          const saveStat = effect.aoeBurst.saveType;
          const statMod = getModifier(player.stats[saveStat]);
          const profBonus = player.proficiencyBonus;
          let statusSaveMod = 0;
          for (const eff of player.statusEffects) {
            const effDef = STATUS_EFFECT_DEFS[eff.name];
            if (effDef && effDef.saveModifier !== 0) statusSaveMod += effDef.saveModifier;
          }
          const burstProfPenalty = getNonProfArmorSavePenalty(player, saveStat);
          const saveResult = savingThrow(statMod + profBonus + statusSaveMod + burstProfPenalty, effect.aoeBurst.saveDC);
          const passed = saveResult.success;
          const finalBurstDmg = passed ? Math.floor(burstDamage / 2) : burstDamage;

          // Apply damage type interaction
          const dtResult = applyDamageTypeInteraction(finalBurstDmg, effect.aoeBurst.damageType, player);

          const newPlayerHp = Math.max(0, player.currentHp - dtResult.finalDamage);
          const playerAlive = newPlayerHp > 0;

          // Update player in state (will be synced below)
          state = {
            ...state,
            combatants: state.combatants.map(c =>
              c.id === player.id ? { ...c, currentHp: newPlayerHp, isAlive: playerAlive } : c
            ),
          };

          aoeDamage = dtResult.finalDamage;
          aoeSavePassed = passed;
          effectDescriptions.push(`AoE burst: ${dtResult.finalDamage} ${effect.aoeBurst.damageType} damage${passed ? ' (save halved)' : ''}`);
        }
        break;
      }
      case 'unlock_ability': {
        if (effect.unlockAbilityId && updatedMonster.monsterAbilities) {
          const abilities = updatedMonster.monsterAbilities;
          updatedMonster = {
            ...updatedMonster,
            monsterAbilities: abilities.map(inst =>
              inst.def.id === effect.unlockAbilityId
                ? { ...inst, cooldownRemaining: 0, isRecharged: true }
                : inst
            ),
          };
          const abilName = abilities.find(
            inst => inst.def.id === effect.unlockAbilityId
          )?.def.name ?? effect.unlockAbilityId;
          effectDescriptions.push(`Reset: ${abilName}`);
        }
        break;
      }
    }
  }

  // Sync updated monster back into state combatants
  state = {
    ...state,
    combatants: state.combatants.map(c =>
      c.id === monsterId ? updatedMonster : c
    ),
  };

  const result: PhaseTransitionResult = {
    transitionId: transition.id,
    transitionName: transition.name,
    hpThresholdPercent: transition.hpThresholdPercent,
    actualHpPercent: Math.round(hpPercent * 10) / 10,
    effects: effectDescriptions,
    ...(aoeDamage !== undefined && { aoeDamage }),
    ...(aoeSavePassed !== undefined && { aoeSavePassed }),
    narratorText: transition.description,
  };

  return { state, result };
}
