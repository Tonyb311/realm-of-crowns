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
  CastResult,
  DefendResult,
  ItemResult,
  FleeResult,
  RacialAbilityActionResult,
  PsionAbilityResult,
  StatusTickResult,
  TurnLogEntry,
  DeathPenalty,
} from '@shared/types/combat';

import { getModifier } from '@shared/types/combat';

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
import { DEATH_PENALTY } from '@shared/data/progression';

// ---- Constants ----

const DEFEND_AC_BONUS = 2;
const BASE_AC = 10;
const DEFAULT_FLEE_DC = 10;
const DEATH_GOLD_LOSS_PERCENT = DEATH_PENALTY.GOLD_LOSS_PERCENT;
const DEATH_XP_LOSS_PER_LEVEL = DEATH_PENALTY.XP_LOSS_PER_LEVEL;
const DEATH_DURABILITY_DAMAGE = DEATH_PENALTY.DURABILITY_DAMAGE;

// ---- Status Effect Definitions ----

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

const STATUS_EFFECT_DEFS: Record<StatusEffectName, StatusEffectDef> = {
  poisoned: {
    preventsAction: false,
    dotDamage: (e) => e.damagePerRound ?? 3,
    hotHealing: () => 0,
    attackModifier: -2,
    acModifier: 0,
    saveModifier: 0,
  },
  stunned: {
    preventsAction: true,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: -2,
    saveModifier: -4,
  },
  blessed: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 2,
    acModifier: 0,
    saveModifier: 2,
  },
  burning: {
    preventsAction: false,
    dotDamage: (e) => e.damagePerRound ?? 5,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: 0,
    saveModifier: 0,
  },
  frozen: {
    preventsAction: true,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: -4,
    saveModifier: -2,
  },
  paralyzed: {
    preventsAction: true,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: -4,
    saveModifier: -4,
  },
  blinded: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: -4,
    acModifier: -2,
    saveModifier: 0,
  },
  shielded: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: 4,
    saveModifier: 0,
  },
  weakened: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: -3,
    acModifier: 0,
    saveModifier: -2,
  },
  hasted: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 2,
    acModifier: 2,
    saveModifier: 0,
  },
  slowed: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: -2,
    acModifier: -2,
    saveModifier: -2,
  },
  regenerating: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: (e) => e.damagePerRound ?? 5, // reuse field for heal amount
    attackModifier: 0,
    acModifier: 0,
    saveModifier: 0,
  },
  dominated: {
    preventsAction: true,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: 0,
    saveModifier: 0,
  },
  banished: {
    preventsAction: true,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: 0,
    saveModifier: 0,
  },
  phased: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: 4,
    saveModifier: 0,
  },
  foresight: {
    preventsAction: false,
    dotDamage: () => 0,
    hotHealing: () => 0,
    attackModifier: 0,
    acModifier: 2,
    saveModifier: 2,
  },
};

// ---- Initiative ----

/** Roll initiative for a combatant and return an updated copy. */
export function calculateInitiative(combatant: Combatant): Combatant {
  const dexMod = getModifier(combatant.stats.dex);
  return {
    ...combatant,
    initiative: initiativeRoll(dexMod),
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

// ---- Status Effects ----

/** Apply a status effect to a combatant. Replaces if same effect already present. */
export function applyStatusEffect(
  combatant: Combatant,
  effectName: StatusEffectName,
  duration: number,
  sourceId: string,
  damagePerRound?: number
): Combatant {
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

  for (const effect of combatant.statusEffects) {
    const def = STATUS_EFFECT_DEFS[effect.name];
    if (!def) {
      remaining.push(effect);
      continue;
    }

    let damage = 0;
    let healing = 0;

    // Apply DoT
    const dotDmg = def.dotDamage(effect);
    if (dotDmg > 0) {
      damage = dotDmg;
      hp = Math.max(0, hp - damage);
    }

    // Apply HoT
    const hotHeal = def.hotHealing(effect);
    if (hotHeal > 0) {
      healing = hotHeal;
      hp = Math.min(combatant.maxHp, hp + healing);
    }

    const newDuration = effect.remainingRounds - 1;
    const expired = newDuration <= 0;

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

  // Calculate attack modifier (stat + proficiency + weapon bonus)
  const statMod = getModifier(actor.stats[weapon.attackModifierStat]);
  let atkMod = statMod + actor.proficiencyBonus + weapon.bonusAttack;

  // Apply status effect modifiers to attack roll
  for (const effect of actor.statusEffects) {
    const def = STATUS_EFFECT_DEFS[effect.name];
    if (def) atkMod += def.attackModifier;
  }

  // Racial attack bonus
  if (racialMods) {
    atkMod += racialMods.attackBonus;
  }

  const targetAC = calculateAC(target, racialTracker);

  // Check Half-Orc Unstoppable Force auto-hit
  const autoHit = racialTracker ? checkAutoHit(racialTracker) : false;

  const roll = autoHit
    ? { roll: 20, total: 20 + atkMod, hit: true, critical: false }
    : attackRoll(atkMod, targetAC);

  let totalDamage = 0;
  let damageRollValue = 0;

  // Precognitive Dodge reaction: negate the hit entirely
  if (roll.hit && target.hasReaction && target.reactionType === 'precognitive_dodge') {
    target = { ...target, hasReaction: false, reactionType: null };
    const result: AttackResult = {
      type: 'attack',
      actorId,
      targetId,
      attackRoll: roll.roll,
      attackTotal: roll.total,
      targetAC,
      hit: false,
      critical: false,
      damageRoll: 0,
      totalDamage: 0,
      targetHpAfter: target.currentHp,
      targetKilled: false,
      negatedAttack: true,
    } as AttackResult;

    const combatants = state.combatants.map((c) => {
      if (c.id === targetId) return target;
      if (c.id === actorId) return actor;
      return c;
    });

    return { state: { ...state, combatants }, result };
  }

  if (roll.hit) {
    const dmg = calculateDamage(actor, weapon, roll.critical);
    damageRollValue = dmg.total;
    totalDamage = Math.max(0, dmg.total);

    // Half-Orc Savage Attacks: extra die on crit
    if (roll.critical && racialMods && racialMods.extraCritDice > 0) {
      const extraDmg = damageRoll(racialMods.extraCritDice, weapon.diceSides);
      totalDamage += extraDmg.total;
      damageRollValue += extraDmg.total;
    }

    // Racial damage multiplier (Orc Blood Fury, Beastfolk Apex Predator, etc.)
    if (racialMods && racialMods.damageMultiplier !== 1.0) {
      totalDamage = Math.floor(totalDamage * racialMods.damageMultiplier);
    }

    // Racial flat damage bonus (Goliath Titan's Grip)
    if (racialMods && racialMods.damageFlatBonus > 0) {
      totalDamage += racialMods.damageFlatBonus;
    }

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
  }

  const result: AttackResult = {
    type: 'attack',
    actorId,
    targetId,
    attackRoll: roll.roll,
    attackTotal: roll.total,
    targetAC,
    hit: roll.hit,
    critical: roll.critical,
    damageRoll: damageRollValue,
    totalDamage,
    targetHpAfter: target.currentHp,
    targetKilled: !target.isAlive,
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
    const targetSaveMod = getModifier(target.stats[spell.saveType]);
    let totalSaveMod = targetSaveMod + target.proficiencyBonus;
    // Apply status effect save modifiers
    for (const eff of target.statusEffects) {
      const def = STATUS_EFFECT_DEFS[eff.name];
      if (def) totalSaveMod += def.saveModifier;
    }
    const save = savingThrow(totalSaveMod, saveDC);
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

  // Determine if spell effect applies (no save required, or save failed)
  const effectApplies = !spell.requiresSave || !saveSucceeded;

  if (effectApplies) {
    if (spell.type === 'damage' || spell.type === 'damage_status') {
      const dmg = damageRoll(spell.diceCount, spell.diceSides, spell.modifier);
      damageRollValue = dmg.total;
      totalDamage = dmg.total;
      target = {
        ...target,
        currentHp: Math.max(0, target.currentHp - totalDamage),
        isAlive: target.currentHp - totalDamage > 0,
      };
      targetKilled = !target.isAlive;
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
    target = {
      ...target,
      currentHp: Math.max(0, target.currentHp - totalDamage),
      isAlive: target.currentHp - totalDamage > 0,
    };
    targetKilled = !target.isAlive;
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
  const combatants = state.combatants.map((c) =>
    c.id === actorId ? { ...c, isDefending: true } : c
  );

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
      'dominated', 'banished',
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
  const enemies = state.combatants.filter(
    (c) => c.team !== actor.team && c.isAlive
  );

  // DC increases with more enemies (base 10, +2 per extra enemy)
  const fleeDC = DEFAULT_FLEE_DC + Math.max(0, (enemies.length - 1) * 2);
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
function applyPsychicDamage(target: Combatant, rawDamage: number): { damage: number; target: Combatant } {
  let damage = rawDamage;

  // Forgeborn psychic resistance: halve psychic damage
  if (target.race === 'forgeborn') {
    damage = Math.floor(damage / 2);
  }

  // Thought Shield passive: psion telepaths get psychic resistance
  if (target.characterClass === 'psion') {
    const hasThoughtShield = psionAbilities.some(
      (a) => a.id === 'psi-tel-2' && a.levelRequired <= target.level
    );
    if (hasThoughtShield) {
      damage = Math.floor(damage / 2);
    }
  }

  damage = Math.max(0, damage);
  const newHp = Math.max(0, target.currentHp - damage);
  return {
    damage,
    target: { ...target, currentHp: newHp, isAlive: newHp > 0 },
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

  // Deduct mana cost
  const manaCost = abilityDef.manaCost;
  if (actor.currentMana < manaCost) {
    return {
      state: current,
      result: {
        type: 'psion_ability',
        actorId,
        abilityName: abilityDef.name,
        abilityId,
        saveRequired: false,
        description: `Not enough mana for ${abilityDef.name}. Requires ${manaCost}, has ${actor.currentMana}.`,
      },
    };
  }

  let updatedActor = { ...actor, currentMana: actor.currentMana - manaCost };
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
      const targetSaveMod = getModifier(target.stats.int) + target.proficiencyBonus;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
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
      const targetSaveMod = getModifier(target.stats.wis) + target.proficiencyBonus;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
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
      const targetSaveMod = getModifier(target.stats.wis) + target.proficiencyBonus - 2;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
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
        const targetSaveMod = getModifier(enemy.stats.wis) + enemy.proficiencyBonus;
        let totalSaveMod = targetSaveMod;
        for (const eff of enemy.statusEffects) {
          const def = STATUS_EFFECT_DEFS[eff.name];
          if (def) totalSaveMod += def.saveModifier;
        }
        const save = savingThrow(totalSaveMod, saveDC);
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
      const targetSaveMod = getModifier(target.stats.wis) + target.proficiencyBonus - 4;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
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

      // Re-resolve the last action by recursively calling resolvePsionAbility
      // if it was a psion ability, or simulate an attack if it was an attack
      const lastAction = updatedActor.lastAction;
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

      // For non-psion last actions, just mark the echo as performed
      return {
        state: current,
        result: {
          type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
          saveRequired: false, echoAction: true,
          description: `Temporal Echo repeats ${updatedActor.name}'s last action.`,
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
        const targetSaveMod = getModifier(target.stats.int) + target.proficiencyBonus;
        let totalSaveMod = targetSaveMod;
        for (const eff of target.statusEffects) {
          const def = STATUS_EFFECT_DEFS[eff.name];
          if (def) totalSaveMod += def.saveModifier;
        }
        const save = savingThrow(totalSaveMod, saveDC);

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
        // Ally target: both get +2 AC for 1 round (shielded)
        updatedTarget = applyStatusEffect(updatedTarget, 'shielded', 1, actorId);
        updatedActor = applyStatusEffect(updatedActor, 'shielded', 1, actorId);

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
            statusApplied: 'shielded', statusDuration: 1,
            description: `${updatedActor.name} and ${target.name} swap positions, both gaining +4 AC for 1 round.`,
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
        const targetSaveMod = getModifier(enemy.stats.wis) + enemy.proficiencyBonus;
        let totalSaveMod = targetSaveMod;
        for (const eff of enemy.statusEffects) {
          const def = STATUS_EFFECT_DEFS[eff.name];
          if (def) totalSaveMod += def.saveModifier;
        }
        const save = savingThrow(totalSaveMod, saveDC);
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
      const target = current.combatants.find((c) => c.id === targetId)!;
      const targetSaveMod = getModifier(target.stats.int) + target.proficiencyBonus - 2;
      let totalSaveMod = targetSaveMod;
      for (const eff of target.statusEffects) {
        const def = STATUS_EFFECT_DEFS[eff.name];
        if (def) totalSaveMod += def.saveModifier;
      }
      const save = savingThrow(totalSaveMod, saveDC);
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

  // Clear the actor's defend stance from previous round
  current = {
    ...current,
    combatants: current.combatants.map((c) =>
      c.id === actorId ? { ...c, isDefending: false } : c
    ),
  };

  // Process status effects at start of turn
  const actor = current.combatants.find((c) => c.id === actorId)!;
  const { combatant: updatedActor, ticks } = processStatusEffects(actor);

  current = {
    ...current,
    combatants: current.combatants.map((c) =>
      c.id === actorId ? updatedActor : c
    ),
  };

  // Process Elementari Primordial Awakening AoE DoT at start of turn
  if (racialContext?.tracker) {
    const { state: awState } = processPrimordialAwakeningDot(current, actorId, racialContext.tracker);
    current = awState;
  }

  // If actor died to DoT, log and skip action
  if (!updatedActor.isAlive) {
    const logEntry: TurnLogEntry = {
      round: current.round,
      actorId,
      action: action.type,
      result: {
        type: 'defend',
        actorId,
        acBonusGranted: 0,
      } as DefendResult,
      statusTicks: ticks,
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
      result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
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
    if (current.status === 'active') {
      current = advanceTurn(current);
    }
    return current;
  }

  // Check if stunned/frozen/paralyzed prevents action
  const isPrevented = updatedActor.statusEffects.some((e) => {
    const def = STATUS_EFFECT_DEFS[e.name];
    return def?.preventsAction;
  });

  let result: TurnResult;

  if (isPrevented) {
    // Forced to "defend" when unable to act
    result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
  } else {
    // Resolve the chosen action
    switch (action.type) {
      case 'attack': {
        if (!action.targetId || !context.weapon) {
          result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
          break;
        }
        const atk = resolveAttack(current, actorId, action.targetId, context.weapon, racialContext?.tracker);
        current = atk.state;
        result = atk.result;

        // Check for Orcish Rampage: bonus attack on kill
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
        break;
      }

      case 'cast': {
        if (!action.targetId || !context.spell) {
          result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
          break;
        }
        const slotLevel = action.spellSlotLevel ?? context.spell.level;
        // Verify actor has a slot available
        const actorNow = current.combatants.find((c) => c.id === actorId)!;
        if ((actorNow.spellSlots[slotLevel] ?? 0) <= 0) {
          result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
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
          result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
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
          result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
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
          result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
          break;
        }
        const psi = resolvePsionAbility(current, actorId, action.psionAbilityId, action.targetId);
        current = psi.state;
        result = psi.result;
        // Track lastAction for Temporal Echo
        current = {
          ...current,
          combatants: current.combatants.map((c) =>
            c.id === actorId ? { ...c, lastAction: action } : c
          ),
        };
        break;
      }

      default:
        result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
    }
  }

  const logEntry: TurnLogEntry = {
    round: current.round,
    actorId,
    action: action.type,
    result,
    statusTicks: ticks,
  };

  current = {
    ...current,
    log: [...current.log, logEntry],
  };

  // Tick down racial active buff durations at end of turn
  if (racialContext?.tracker) {
    tickActiveBuffs(racialContext.tracker);
  }

  // Check for combat end
  current = checkCombatEnd(current);

  // Advance to next turn
  if (current.status === 'active') {
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
function checkCombatEnd(state: CombatState): CombatState {
  const aliveTeams = new Set<number>();
  for (const c of state.combatants) {
    if (c.isAlive) aliveTeams.add(c.team);
  }

  if (aliveTeams.size <= 1) {
    const winningTeam = aliveTeams.size === 1 ? [...aliveTeams][0] : null;
    return {
      ...state,
      status: 'completed',
      winningTeam,
    };
  }

  return state;
}

// ---- Death Penalty ----

/** Calculate death penalties for a character. */
export function calculateDeathPenalty(
  characterId: string,
  level: number,
  gold: number,
  respawnTownId: string
): DeathPenalty {
  const goldLost = Math.floor(gold * (DEATH_GOLD_LOSS_PERCENT / 100));
  const xpLost = level * DEATH_XP_LOSS_PER_LEVEL;

  return {
    characterId,
    goldLostPercent: DEATH_GOLD_LOSS_PERCENT,
    goldLost,
    xpLost,
    durabilityDamage: DEATH_DURABILITY_DAMAGE,
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
    status: 'active',
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
  mana: number,
  maxMana: number,
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
    currentMana: mana,
    maxMana,
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
  proficiencyBonus: number = 0
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
    currentMana: 0,
    maxMana: 0,
    ac,
    initiative: 0,
    statusEffects: [],
    spellSlots: {},
    weapon,
    isAlive: true,
    isDefending: false,
    proficiencyBonus,
  };
}
