/**
 * Monster Ability Resolver
 *
 * Handles resolution of monster abilities in combat.
 * Follows the same pattern as class-ability-resolver.ts.
 *
 * Ability types:
 *   damage    - Roll attack vs AC, deal damage with damageType
 *   status    - Target saves, apply status on fail
 *   aoe       - DEX/CON save, deal AoE damage (1v1 = just damage + save)
 *   multiattack - Make N attacks, collect per-strike results
 *   buff      - Apply self-buff (AC bonus, regen flag)
 *   heal      - Heal self for hpPerTurn
 *   on_hit    - NOT an action — triggers inside resolveAttack() on basic attack hit
 */

import {
  attackRoll,
  damageRoll,
  savingThrow,
} from '@shared/utils/dice';

import type {
  CombatState,
  Combatant,
  MonsterAbility,
  MonsterAbilityResult,
  AttackModifierBreakdown,
  CombatDamageType,
} from '@shared/types/combat';

import { getModifier } from '@shared/types/combat';
import { getSaveModifier } from '@shared/utils/bounded-accuracy';
import { computeFeatBonus } from '@shared/data/feats';

import {
  applyStatusEffect,
  calculateAC,
  STATUS_EFFECT_DEFS,
  STATUS_EFFECT_MECHANICS,
  applyDamageTypeInteraction,
} from './combat-engine';

import type { StatusEffectName } from '@shared/types/combat';

// ---- Helpers ----

/** Compute total save modifier for a target including status effects, DEX/STR bonuses, and auto-fail. */
function computeTargetSaveMod(target: Combatant, saveType: string): { totalMod: number; autoFail: boolean } {
  const baseMod = getSaveModifier(target.stats, saveType, target.proficiencyBonus, target.saveProficiencies) + computeFeatBonus(target.featIds, 'allSaveBonus') + computeFeatBonus(target.featIds, 'spellSaveBonus');
  let totalMod = baseMod;
  let autoFail = false;

  for (const eff of target.statusEffects) {
    const def = STATUS_EFFECT_DEFS[eff.name];
    if (def) totalMod += def.saveModifier;
    const mech = STATUS_EFFECT_MECHANICS[eff.name];
    if (mech) {
      if (saveType === 'dex') {
        totalMod += mech.dexSaveMod;
        if (mech.autoFailDexSave) autoFail = true;
      }
      if (saveType === 'str') {
        totalMod += mech.strSaveMod;
        if (mech.autoFailStrSave) autoFail = true;
      }
    }
  }

  return { totalMod, autoFail };
}

function parseDamageString(damage: string): { diceCount: number; diceSides: number; bonus: number } {
  const match = damage.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) return { diceCount: 1, diceSides: 6, bonus: 0 };
  return {
    diceCount: parseInt(match[1]),
    diceSides: parseInt(match[2]),
    bonus: match[3] ? parseInt(match[3]) : 0,
  };
}

// ---- Effect Handlers ----

function handleDamage(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  if (!ability.damage) {
    return { state, result: { description: `${ability.name} has no damage defined.` } };
  }

  const parsed = parseDamageString(ability.damage);
  const atkMod = actor.weapon ? (getModifier(actor.stats[actor.weapon.attackModifierStat]) + actor.proficiencyBonus + actor.weapon.bonusAttack) : (getModifier(actor.stats.str) + actor.proficiencyBonus);
  const targetAC = calculateAC(target);
  const roll = attackRoll(atkMod, targetAC);

  if (!roll.hit) {
    return {
      state,
      result: {
        targetId: target.id,
        hit: false,
        attackRoll: roll.roll,
        attackTotal: roll.total,
        targetAC,
        damage: 0,
        targetHpAfter: target.currentHp,
        targetKilled: false,
        description: `${actor.name} uses ${ability.name} but misses.`,
      },
    };
  }

  const dmg = damageRoll(parsed.diceCount, parsed.diceSides, parsed.bonus);
  let totalDamage = dmg.total;

  // Apply damage type interaction
  const dtResult = ability.damageType
    ? applyDamageTypeInteraction(totalDamage, ability.damageType, target)
    : null;
  if (dtResult) {
    totalDamage = dtResult.finalDamage;
  }

  // Track damage type received
  if (ability.damageType) {
    target = {
      ...target,
      damageTypesReceivedThisRound: [
        ...(target.damageTypesReceivedThisRound ?? []),
        ability.damageType,
      ],
    };
  }

  const targetHpBefore = target.currentHp;
  const newHp = Math.max(0, target.currentHp - totalDamage);
  target = { ...target, currentHp: newHp, isAlive: newHp > 0 };

  const combatants = state.combatants.map(c => c.id === target.id ? target : c);

  return {
    state: { ...state, combatants },
    result: {
      targetId: target.id,
      hit: true,
      attackRoll: roll.roll,
      attackTotal: roll.total,
      targetAC,
      damage: totalDamage,
      damageType: ability.damageType,
      targetHpBefore,
      targetHpAfter: target.currentHp,
      targetKilled: !target.isAlive,
      damageTypeResult: dtResult ?? undefined,
      weaponDice: ability.damage,
      damageRolls: dmg.rolls,
      isCritical: roll.critical,
      description: `${actor.name} uses ${ability.name} for ${totalDamage} ${ability.damageType ?? ''} damage.`,
    },
  };
}

function handleStatus(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  if (!ability.saveType || !ability.saveDC || !ability.statusEffect) {
    return { state, result: { description: `${ability.name} missing save/status config.` } };
  }

  const { totalMod: totalSaveMod, autoFail } = computeTargetSaveMod(target, ability.saveType);
  const save = autoFail
    ? { roll: 1, total: 0, success: false }
    : savingThrow(totalSaveMod, ability.saveDC);

  if (save.success) {
    return {
      state,
      result: {
        targetId: target.id,
        saveRequired: true,
        saveType: ability.saveType,
        saveDC: ability.saveDC,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: true,
        targetHpAfter: target.currentHp,
        targetKilled: false,
        description: `${target.name} resists ${actor.name}'s ${ability.name}.`,
      },
    };
  }

  target = applyStatusEffect(
    target,
    ability.statusEffect as StatusEffectName,
    ability.statusDuration ?? 2,
    actor.id,
    ability.damage ? parseDamageString(ability.damage).bonus : undefined,
  );

  const combatants = state.combatants.map(c => c.id === target.id ? target : c);

  return {
    state: { ...state, combatants },
    result: {
      targetId: target.id,
      saveRequired: true,
      saveType: ability.saveType,
      saveDC: ability.saveDC,
      saveRoll: save.roll,
      saveTotal: save.total,
      saveSucceeded: false,
      statusApplied: ability.statusEffect,
      statusDuration: ability.statusDuration ?? 2,
      targetHpAfter: target.currentHp,
      targetKilled: false,
      description: `${target.name} fails to resist ${actor.name}'s ${ability.name} and is ${ability.statusEffect}!`,
    },
  };
}

function handleAoe(
  state: CombatState,
  actor: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  if (!ability.damage || !ability.saveType || !ability.saveDC) {
    return { state, result: { description: `${ability.name} missing AoE config.` } };
  }

  const parsed = parseDamageString(ability.damage);
  const enemies = state.combatants.filter(c => c.team !== actor.team && c.isAlive);
  const perTargetResults: MonsterAbilityResult['perTargetResults'] = [];
  let totalDamage = 0;
  let current = state;

  for (const enemy of enemies) {
    let target = current.combatants.find(c => c.id === enemy.id)!;
    const { totalMod: totalSaveMod, autoFail } = computeTargetSaveMod(target, ability.saveType!);
    const save = autoFail
      ? { roll: 1, total: 0, success: false }
      : savingThrow(totalSaveMod, ability.saveDC!);

    const dmg = damageRoll(parsed.diceCount, parsed.diceSides, parsed.bonus);
    let damage = save.success ? Math.floor(dmg.total / 2) : dmg.total;

    // Apply damage type interaction
    if (ability.damageType) {
      const dtResult = applyDamageTypeInteraction(damage, ability.damageType, target);
      damage = dtResult.finalDamage;
      target = {
        ...target,
        damageTypesReceivedThisRound: [
          ...(target.damageTypesReceivedThisRound ?? []),
          ability.damageType,
        ],
      };
    }

    const newHp = Math.max(0, target.currentHp - damage);
    target = { ...target, currentHp: newHp, isAlive: newHp > 0 };
    totalDamage += damage;

    perTargetResults!.push({
      targetId: target.id,
      targetName: target.name,
      damage,
      hpAfter: target.currentHp,
      killed: !target.isAlive,
      saveDC: ability.saveDC,
      saveRoll: save.roll,
      saveTotal: save.total,
      saveSucceeded: save.success,
    });

    current = {
      ...current,
      combatants: current.combatants.map(c => c.id === target.id ? target : c),
    };
  }

  return {
    state: current,
    result: {
      targetIds: enemies.map(e => e.id),
      damage: totalDamage,
      saveRequired: true,
      saveType: ability.saveType,
      saveDC: ability.saveDC,
      damageType: ability.damageType,
      perTargetResults,
      description: `${actor.name} uses ${ability.name}, hitting ${enemies.length} target(s) for ${totalDamage} total damage.`,
    },
  };
}

function handleMultiattack(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  const attacks = ability.attacks ?? 2;
  const strikeResults: MonsterAbilityResult['strikeResults'] = [];
  let totalDamage = 0;
  let strikesHit = 0;
  let current = state;

  for (let i = 0; i < attacks; i++) {
    let currentTarget = current.combatants.find(c => c.id === target.id)!;
    if (!currentTarget.isAlive) break;

    const weapon = actor.weapon;
    if (!weapon) break;

    const atkMod = getModifier(actor.stats[weapon.attackModifierStat]) + actor.proficiencyBonus + weapon.bonusAttack;
    const targetAC = calculateAC(currentTarget);
    const roll = attackRoll(atkMod, targetAC);

    if (roll.hit) {
      const dmg = damageRoll(weapon.diceCount, weapon.diceSides, getModifier(actor.stats[weapon.damageModifierStat]) + weapon.bonusDamage);
      let damage = dmg.total;

      // Apply damage type interaction for weapon's damage type
      const dtType = (weapon.damageType ?? 'BLUDGEONING') as CombatDamageType;
      const dtResult = applyDamageTypeInteraction(damage, dtType, currentTarget);
      damage = dtResult.finalDamage;

      // Track damage type
      currentTarget = {
        ...currentTarget,
        damageTypesReceivedThisRound: [
          ...(currentTarget.damageTypesReceivedThisRound ?? []),
          dtType,
        ],
      };

      const newHp = Math.max(0, currentTarget.currentHp - damage);
      currentTarget = { ...currentTarget, currentHp: newHp, isAlive: newHp > 0 };
      totalDamage += damage;
      strikesHit++;

      strikeResults!.push({
        strikeNumber: i + 1,
        hit: true,
        crit: roll.critical,
        damage,
        attackRoll: roll.roll,
        attackTotal: roll.total,
        targetAc: targetAC,
      });
    } else {
      strikeResults!.push({
        strikeNumber: i + 1,
        hit: false,
        crit: false,
        damage: 0,
        attackRoll: roll.roll,
        attackTotal: roll.total,
        targetAc: targetAC,
      });
    }

    current = {
      ...current,
      combatants: current.combatants.map(c => c.id === target.id ? currentTarget : c),
    };
  }

  const finalTarget = current.combatants.find(c => c.id === target.id)!;

  return {
    state: current,
    result: {
      targetId: target.id,
      damage: totalDamage,
      targetHpAfter: finalTarget.currentHp,
      targetKilled: !finalTarget.isAlive,
      strikeResults,
      totalStrikes: attacks,
      strikesHit,
      description: `${actor.name} uses ${ability.name} (${attacks} attacks): ${strikesHit} hit for ${totalDamage} total damage.`,
    },
  };
}

function handleHeal(
  state: CombatState,
  actor: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  const healAmount = ability.hpPerTurn ?? 0;
  if (healAmount <= 0) {
    return { state, result: { description: `${ability.name} has no heal amount.` } };
  }

  const newHp = Math.min(actor.maxHp, actor.currentHp + healAmount);
  const updatedActor = { ...actor, currentHp: newHp };
  const combatants = state.combatants.map(c => c.id === actor.id ? updatedActor : c);

  return {
    state: { ...state, combatants },
    result: {
      healing: healAmount,
      actorHpAfter: newHp,
      description: `${actor.name} regenerates ${healAmount} HP.`,
    },
  };
}

function handleBuff(
  state: CombatState,
  actor: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  // Apply a self-buff status effect
  if (ability.statusEffect) {
    const updated = applyStatusEffect(
      actor,
      ability.statusEffect as StatusEffectName,
      ability.statusDuration ?? 3,
      actor.id,
    );
    const combatants = state.combatants.map(c => c.id === actor.id ? updated : c);
    return {
      state: { ...state, combatants },
      result: {
        statusApplied: ability.statusEffect,
        statusDuration: ability.statusDuration,
        description: `${actor.name} uses ${ability.name}.`,
      },
    };
  }

  return { state, result: { description: `${actor.name} uses ${ability.name}.` } };
}

// ---- Swallow Handler ----

function handleSwallow(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  // Already swallowed — skip
  if (target.swallowedBy) {
    return { state, result: { description: `${target.name} is already swallowed.` } };
  }

  // 1. Attack roll vs AC
  const atkMod = actor.weapon
    ? (getModifier(actor.stats[actor.weapon.attackModifierStat]) + actor.proficiencyBonus + actor.weapon.bonusAttack)
    : (getModifier(actor.stats.str) + actor.proficiencyBonus);
  const targetAC = calculateAC(target);
  const roll = attackRoll(atkMod, targetAC);

  if (!roll.hit) {
    return {
      state,
      result: {
        targetId: target.id,
        hit: false,
        attackRoll: roll.roll,
        attackTotal: roll.total,
        targetAC,
        damage: 0,
        targetHpAfter: target.currentHp,
        targetKilled: false,
        description: `${actor.name} attempts to swallow ${target.name} but misses.`,
      },
    };
  }

  // 2. STR save vs saveDC
  if (!ability.saveType || !ability.saveDC) {
    return { state, result: { description: `${ability.name} missing save config.` } };
  }

  const { totalMod: totalSaveMod, autoFail: saveAutoFail } = computeTargetSaveMod(target, ability.saveType);
  const save = saveAutoFail
    ? { roll: 1, total: 0, success: false }
    : savingThrow(totalSaveMod, ability.saveDC);

  if (save.success) {
    return {
      state,
      result: {
        targetId: target.id,
        hit: true,
        attackRoll: roll.roll,
        attackTotal: roll.total,
        targetAC,
        saveRequired: true,
        saveType: ability.saveType,
        saveDC: ability.saveDC,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: true,
        targetHpAfter: target.currentHp,
        targetKilled: false,
        description: `${actor.name} tries to swallow ${target.name}, but they wrench free!`,
      },
    };
  }

  // 3. Save failed — apply swallowed status + tracking fields
  let updatedTarget = applyStatusEffect(target, 'swallowed' as StatusEffectName, 999, actor.id);
  updatedTarget = {
    ...updatedTarget,
    swallowedBy: actor.id,
    swallowDamagePerRound: ability.swallowDamage,
    swallowDamageTypePerRound: ability.swallowDamageType,
    swallowEscapeThreshold: ability.swallowEscapeThreshold,
  };

  const combatants = state.combatants.map(c => c.id === target.id ? updatedTarget : c);

  return {
    state: { ...state, combatants },
    result: {
      targetId: target.id,
      hit: true,
      attackRoll: roll.roll,
      attackTotal: roll.total,
      targetAC,
      saveRequired: true,
      saveType: ability.saveType,
      saveDC: ability.saveDC,
      saveRoll: save.roll,
      saveTotal: save.total,
      saveSucceeded: false,
      statusApplied: 'swallowed',
      targetHpAfter: updatedTarget.currentHp,
      targetKilled: false,
      description: `${actor.name} swallows ${target.name} whole! They must deal ${ability.swallowEscapeThreshold} damage in a round to escape.`,
    },
  };
}

// ---- On-Hit Resolution (called from resolveAttack) ----

/**
 * Resolve on_hit abilities when a monster's basic attack lands.
 * Returns updated target and description of applied effects.
 */
export function resolveOnHitAbilities(
  actor: Combatant,
  target: Combatant,
): { target: Combatant; effectsApplied: string[] } {
  if (!actor.monsterAbilities) return { target, effectsApplied: [] };

  const effectsApplied: string[] = [];

  for (const instance of actor.monsterAbilities) {
    if (instance.def.type !== 'on_hit') continue;
    if (!instance.def.saveType || !instance.def.saveDC || !instance.def.statusEffect) continue;

    // Target saves vs saveDC
    const { totalMod: fearSaveMod, autoFail: fearAutoFail } = computeTargetSaveMod(target, instance.def.saveType);
    const save = fearAutoFail
      ? { roll: 1, total: 0, success: false }
      : savingThrow(fearSaveMod, instance.def.saveDC);

    if (!save.success) {
      target = applyStatusEffect(
        target,
        instance.def.statusEffect as StatusEffectName,
        instance.def.statusDuration ?? 1,
        actor.id,
        instance.def.damage ? parseDamageString(instance.def.damage).bonus : undefined,
      );

      // On-hit life drain: heal self
      if (instance.def.hpPerTurn && instance.def.hpPerTurn > 0) {
        // Life drain heals are tracked via the effectsApplied array
        effectsApplied.push(`${instance.def.name}: life drain +${instance.def.hpPerTurn}`);
      }

      effectsApplied.push(`${instance.def.name}: ${instance.def.statusEffect}`);
    }
  }

  return { target, effectsApplied };
}

// ---- Main Resolution ----

/**
 * Resolve a monster ability action.
 * Follows resolveClassAbility pattern.
 */
export function resolveMonsterAbility(
  state: CombatState,
  actorId: string,
  abilityDef: MonsterAbility,
  targetId?: string,
): { state: CombatState; result: MonsterAbilityResult } {
  const actor = state.combatants.find(c => c.id === actorId)!;

  // Find a valid target
  const enemies = state.combatants.filter(c => c.team !== actor.team && c.isAlive && !c.hasFled);
  const target = targetId
    ? state.combatants.find(c => c.id === targetId) ?? enemies[0]
    : enemies[0];

  const baseResult: MonsterAbilityResult = {
    type: 'monster_ability',
    actorId,
    abilityName: abilityDef.name,
    abilityId: abilityDef.id,
    description: '',
  };

  let resolved: { state: CombatState; result: Partial<MonsterAbilityResult> };

  switch (abilityDef.type) {
    case 'damage':
      if (!target) {
        return { state, result: { ...baseResult, description: 'No valid target.' } };
      }
      resolved = handleDamage(state, actor, target, abilityDef);
      break;

    case 'status':
      if (!target) {
        return { state, result: { ...baseResult, description: 'No valid target.' } };
      }
      resolved = handleStatus(state, actor, target, abilityDef);
      break;

    case 'aoe':
      resolved = handleAoe(state, actor, abilityDef);
      break;

    case 'multiattack':
      if (!target) {
        return { state, result: { ...baseResult, description: 'No valid target.' } };
      }
      resolved = handleMultiattack(state, actor, target, abilityDef);
      break;

    case 'heal':
      resolved = handleHeal(state, actor, abilityDef);
      break;

    case 'buff':
      resolved = handleBuff(state, actor, abilityDef);
      break;

    case 'swallow':
      if (!target) {
        return { state, result: { ...baseResult, description: 'No valid target.' } };
      }
      resolved = handleSwallow(state, actor, target, abilityDef);
      break;

    case 'death_throes':
    case 'fear_aura':
    case 'damage_aura':
      // Passive abilities — not resolved as actions
      return { state, result: { ...baseResult, description: `${abilityDef.name} is passive.` } };

    default:
      return { state, result: { ...baseResult, description: `Unknown ability type: ${abilityDef.type}` } };
  }

  return {
    state: resolved.state,
    result: { ...baseResult, ...resolved.result },
  };
}
