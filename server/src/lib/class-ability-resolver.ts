/**
 * Class Ability Resolver — Data-Driven Effect Resolution
 *
 * Phase 1: 13 simple effect types covering ~60 of 108 non-psion abilities.
 * Phase 2: 7 AoE/multi-hit/delayed/dispel handlers covering 16 more abilities.
 * Phase 3: 7 counter/trap/summon/steal/companion/special handlers — all 126 abilities covered.
 * Uses a function-map pattern instead of a giant switch.
 * Unimplemented effect types log a warning and fall back to basic attack.
 */

import { ALL_ABILITIES } from '@shared/data/skills';
import type { AbilityDefinition } from '@shared/data/skills/types';
import { CLASS_PRIMARY_STAT } from '@shared/data/combat-constants';
import {
  applyStatusEffect,
  resolveAttack,
  resolveFlee,
  checkLegendaryResistance,
  STATUS_EFFECT_DEFS,
  STATUS_EFFECT_MECHANICS,
} from './combat-engine';
import { roll, rollMultiple, savingThrow, fleeCheck } from '@shared/utils/dice';
import { getModifier } from '@shared/types/combat';
import type {
  CombatState,
  Combatant,
  ClassAbilityResult,
  StatusEffectName,
  ActiveBuff,
  DelayedEffect,
  WeaponInfo,
} from '@shared/types/combat';

// ---- Types ----

type EffectHandler = (
  state: CombatState,
  actor: Combatant,
  target: Combatant | null,
  enemies: Combatant[],
  abilityDef: AbilityDefinition,
  effects: Record<string, any>,
) => { state: CombatState; result: Partial<ClassAbilityResult> };

// ---- Ability Lookup Cache ----

const abilityMap = new Map<string, AbilityDefinition>();
for (const a of ALL_ABILITIES) {
  abilityMap.set(a.id, a);
}

// ---- Utility ----

/**
 * Calculate weapon/spell damage contribution for an ability.
 * Weapon attacks: weapon dice + stat mod + weapon bonus (doubled on crit).
 * Spell attacks: class primary stat modifier only (no weapon dice).
 * Save/auto/other: returns 0 (no weapon contribution).
 */
function calcWeaponDamage(actor: Combatant, abilityDef: AbilityDefinition, isCrit = false): number {
  const isSpellAttack = abilityDef.attackType === 'spell';
  const isWeaponAttack = abilityDef.attackType === 'weapon' || (!abilityDef.attackType && !isSpellAttack);

  if (isWeaponAttack && actor.weapon) {
    const statMod = getModifier(actor.stats[actor.weapon.damageModifierStat]);
    const critMult = isCrit ? 2 : 1;
    let total = 0;
    for (let i = 0; i < actor.weapon.diceCount * critMult; i++) {
      total += roll(actor.weapon.diceSides);
    }
    return Math.max(0, total + statMod + actor.weapon.bonusDamage);
  } else if (isSpellAttack) {
    const primaryStat = actor.characterClass
      ? CLASS_PRIMARY_STAT[actor.characterClass.toLowerCase()] ?? 'int'
      : 'int';
    const statMod = getModifier(actor.stats[primaryStat as keyof typeof actor.stats] ?? 10);
    return Math.max(0, statMod);
  }
  return 0;
}

function clampHp(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(hp, maxHp));
}

function updateCombatant(state: CombatState, id: string, update: Partial<Combatant>): CombatState {
  return {
    ...state,
    combatants: state.combatants.map(c => (c.id === id ? { ...c, ...update } : c)),
  };
}

function rollDice(diceCount: number, diceSides: number, bonus = 0): number {
  return rollMultiple(diceCount, diceSides) + bonus;
}

/** Roll dice and return individual results + total (for combat log breakdowns) */
function rollDiceDetailed(diceCount: number, diceSides: number, bonus = 0): { rolls: number[]; total: number } {
  const rolls: number[] = [];
  for (let i = 0; i < diceCount; i++) {
    rolls.push(roll(diceSides));
  }
  const total = Math.max(0, rolls.reduce((s, r) => s + r, 0) + bonus);
  return { rolls, total };
}

function getTarget(state: CombatState, targetId?: string): Combatant | null {
  if (!targetId) return null;
  return state.combatants.find(c => c.id === targetId) ?? null;
}

function getEnemies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => c.team !== actor.team && c.isAlive && !c.hasFled);
}

// ---- Effect Handlers ----

const handleDamage: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const bonusDamage = (effects.bonusDamage as number) ?? 0;
  const diceCount = (effects.diceCount as number) ?? 0;
  const diceSides = (effects.diceSides as number) ?? 0;

  // Phase 5A: Read attack/damage modifier fields
  const critBonus = (effects.critBonus as number) ?? 0;
  const autoHit = (effects.autoHit as boolean) ?? false;
  const ignoreArmor = (effects.ignoreArmor as boolean) ?? false;
  const bonusPerDebuff = (effects.bonusPerDebuff as number) ?? 0;
  const damageMultiplier = (effects.damageMultiplier as number) ?? 1.0;
  const requiresStealth = (effects.requiresStealth as boolean) ?? false;
  const requiresAnalyze = (effects.requiresAnalyze as boolean) ?? false;

  // BUG-FIX 2: Self-AC penalty — support both field names
  const selfAcPenalty = (effects.selfAcPenalty as number) ?? (effects.selfDefenseDebuff as number) ?? 0;
  if (selfAcPenalty) {
    state = updateCombatant(state, actor.id, { ac: actor.ac - Math.abs(selfAcPenalty) });
  }

  // Phase 5A: Check stealth requirement (DMG-7) — also honor setupTag from AI chaining
  let effectiveMultiplier = damageMultiplier;
  let stealthMissing = false;
  if (requiresStealth) {
    const currentActor = state.combatants.find(c => c.id === actor.id)!;
    const hasMechanicalStealth = currentActor.activeBuffs?.some(b => b.stealthed === true) ?? false;
    const hasSetupTag = currentActor.setupTags?.includes('stealthed') ?? false;
    if (!hasMechanicalStealth && !hasSetupTag) {
      effectiveMultiplier = 1.0;
      stealthMissing = true;
    }
  }

  // Phase 5A: Check analyze requirement (DMG-8) — also honor setupTag from AI chaining
  let analyzeMissing = false;
  if (requiresAnalyze) {
    const currentActor = state.combatants.find(c => c.id === actor.id)!;
    const hasMechanicalAnalyze = target.activeBuffs?.some(b => b.name === 'Analyze') ?? false;
    const hasSetupTag = currentActor.setupTags?.includes('target_analyzed') ?? false;
    if (!hasMechanicalAnalyze && !hasSetupTag) {
      analyzeMissing = true;
    }
  }

  // --- Save-based path (attackType: 'save') ---
  const saveResult = resolveAbilitySave(state, actor, target, abilityDef, effects);
  if (saveResult) {
    state = saveResult.state;
    const { dc, saveType, save } = saveResult.result;

    // Roll ability dice damage (no weapon damage for save-based abilities)
    let abilityDmg = 0;
    if (diceCount > 0) {
      abilityDmg = rollDice(diceCount, diceSides);
    }
    let totalDamage = Math.max(0, abilityDmg + bonusDamage);

    // On successful save: half damage
    if (save.success) {
      totalDamage = Math.floor(totalDamage / 2);
    }

    if (actor.holyDamageBonus && effects.element === 'radiant') {
      totalDamage += Math.floor(totalDamage * actor.holyDamageBonus);
    }

    const hpBefore = target.currentHp;
    const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
    const killed = newHp <= 0;
    state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

    return {
      state,
      result: {
        damage: totalDamage,
        targetHpAfter: newHp,
        targetKilled: killed,
        targetHpBefore: hpBefore,
        hit: true,
        saveRequired: true,
        saveDC: dc,
        saveType,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: save.success,
        damageType: abilityDef.damageType ?? (effects.element as string),
        description: `${abilityDef.name}: ${totalDamage} damage to ${target.name}${save.success ? ' (saved, half)' : ''} (DC ${dc} ${saveType.toUpperCase()})`,
      },
    };
  }

  // --- Attack roll path (weapon or spell) ---
  const atkResult = resolveAbilityAttackRoll(actor, target, abilityDef, effects);
  let abilityHit = true;
  let isCrit = false;
  let atkD20: number | undefined;
  let atkTotal: number | undefined;
  let atkModifiers: { source: string; value: number }[] | undefined;
  let effectiveAC: number | undefined;

  if (atkResult) {
    abilityHit = atkResult.hit;
    isCrit = atkResult.isCrit;
    atkD20 = atkResult.d20;
    atkTotal = atkResult.total;
    atkModifiers = atkResult.modifiers;
    effectiveAC = atkResult.targetAC;

    // Adjust crit for analyze requirement
    if (analyzeMissing && critBonus > 0) {
      isCrit = atkResult.d20 >= 20 && abilityHit;
    }
  }

  if (!abilityHit) {
    return {
      state,
      result: {
        damage: 0,
        targetHpAfter: target.currentHp,
        targetKilled: false,
        attackRoll: atkD20,
        attackTotal: atkTotal,
        attackModifiers: atkModifiers,
        targetAC: effectiveAC,
        hit: false,
        isCritical: false,
        targetHpBefore: target.currentHp,
        description: `${abilityDef.name}: missed ${target.name}`,
      },
    };
  }

  // Roll weapon damage + ability bonus (with detailed breakdowns)
  let weaponDmg = 0;
  let weaponDiceStr: string | undefined;
  let weaponDmgRolls: number[] = [];
  const dmgModifiers: { source: string; value: number }[] = [];

  // Spell attacks use class primary stat for damage instead of weapon stat
  const isSpellAttack = abilityDef.attackType === 'spell';

  if (actor.weapon && !isSpellAttack) {
    const statMod = getModifier(actor.stats[actor.weapon.damageModifierStat]);
    const critMult = isCrit ? 2 : 1;
    const wepDetailed = rollDiceDetailed(actor.weapon.diceCount * critMult, actor.weapon.diceSides);
    weaponDmg = Math.max(0, wepDetailed.total + statMod + actor.weapon.bonusDamage);
    weaponDiceStr = `${actor.weapon.diceCount * critMult}d${actor.weapon.diceSides}`;
    weaponDmgRolls = wepDetailed.rolls;
    if (statMod !== 0) dmgModifiers.push({ source: actor.weapon.damageModifierStat.toUpperCase(), value: statMod });
    if (actor.weapon.bonusDamage !== 0) dmgModifiers.push({ source: 'weapon bonus', value: actor.weapon.bonusDamage });
  } else if (isSpellAttack) {
    // Spell attacks: add class primary stat modifier to damage (no weapon dice)
    const primaryStat = actor.characterClass
      ? CLASS_PRIMARY_STAT[actor.characterClass.toLowerCase()] ?? 'int'
      : 'int';
    const statMod = getModifier(actor.stats[primaryStat as keyof typeof actor.stats] ?? 10);
    if (statMod > 0) dmgModifiers.push({ source: primaryStat.toUpperCase(), value: statMod });
    weaponDmg = Math.max(0, statMod);
  }

  let abilityDmg = 0;
  let abilityDmgRolls: number[] = [];
  if (diceCount > 0) {
    const abDetailed = rollDiceDetailed(diceCount * (isCrit ? 2 : 1), diceSides);
    abilityDmg = abDetailed.total;
    abilityDmgRolls = abDetailed.rolls;
    if (abilityDmg > 0) dmgModifiers.push({ source: 'ability dice', value: abilityDmg });
  }

  // Phase 5A: Bonus per debuff (DMG-5)
  let debuffBonus = 0;
  if (bonusPerDebuff > 0) {
    const harmfulStatuses = ['poisoned', 'stunned', 'burning', 'frozen', 'paralyzed', 'blinded', 'weakened', 'slowed', 'root', 'silence'];
    const statusDebuffs = target.statusEffects.filter(e => harmfulStatuses.includes(e.name)).length;
    const buffDebuffs = (target.activeBuffs ?? []).filter(b => (b.attackMod ?? 0) < 0 || (b.acMod ?? 0) < 0).length;
    debuffBonus = (statusDebuffs + buffDebuffs) * bonusPerDebuff;
  }

  // Track additional flat damage modifiers for log
  if (bonusDamage !== 0) dmgModifiers.push({ source: 'flat bonus', value: bonusDamage });
  if (debuffBonus > 0) dmgModifiers.push({ source: 'debuff bonus', value: debuffBonus });

  let totalDamage = Math.max(0, weaponDmg + abilityDmg + bonusDamage + debuffBonus);

  // Phase 5A: Apply damage multiplier (DMG-6)
  if (effectiveMultiplier !== 1.0) {
    totalDamage = Math.floor(totalDamage * effectiveMultiplier);
  }

  // Phase 5B MECH-6: Holy damage bonus for radiant abilities
  if (actor.holyDamageBonus && effects.element === 'radiant') {
    const holyBonus = Math.floor(totalDamage * actor.holyDamageBonus);
    totalDamage += holyBonus;
  }

  // Store HP before damage
  const hpBefore = target.currentHp;

  // Apply damage to target
  const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
  const killed = newHp <= 0;

  state = updateCombatant(state, target.id, {
    currentHp: newHp,
    isAlive: !killed,
  });

  // Build description
  const parts: string[] = [`${totalDamage} damage to ${target.name}`];
  if (isCrit) parts.push('CRITICAL');
  if (selfAcPenalty) parts.push(`self AC -${Math.abs(selfAcPenalty)}`);
  if (debuffBonus > 0) parts.push(`+${debuffBonus} debuff bonus`);
  if (effectiveMultiplier !== 1.0 && !stealthMissing) parts.push(`x${effectiveMultiplier}`);
  if (stealthMissing) parts.push('no stealth, reduced');
  if (analyzeMissing) parts.push('no Analyze, reduced');
  if (ignoreArmor) parts.push('ignores armor');
  if (autoHit) parts.push('auto-hit');

  return {
    state,
    result: {
      damage: totalDamage,
      targetHpAfter: newHp,
      targetKilled: killed,
      targetHpBefore: hpBefore,
      // Attack roll breakdown
      attackRoll: atkD20,
      attackTotal: atkTotal,
      attackModifiers: atkModifiers,
      targetAC: effectiveAC,
      hit: true,
      isCritical: isCrit,
      // Damage roll breakdown
      weaponDice: weaponDiceStr,
      damageRolls: [...weaponDmgRolls, ...abilityDmgRolls],
      damageModifiers: dmgModifiers,
      damageType: abilityDef.damageType ?? actor.weapon?.damageType ?? (effects.element as string),
      description: `${abilityDef.name}: ${parts.join(' | ')}`,
    },
  };
};

const handleBuff: EffectHandler = (state, actor, _target, _enemies, abilityDef, effects) => {
  const duration = (effects.duration as number) ?? 3;

  const buff: ActiveBuff = {
    sourceAbilityId: abilityDef.id,
    name: abilityDef.name,
    roundsRemaining: duration,
    attackMod: (effects.attackBonus as number) ?? undefined,
    acMod: (effects.acBonus as number) ?? undefined,
    damageMod: (effects.bonusDamage as number) ?? (effects.bonusDamageNext as number) ?? undefined,
    dodgeMod: (effects.dodgeBonus as number) ?? undefined,
    damageReduction: (effects.damageReduction as number) ?? undefined,
    damageReflect: (effects.damageReflect as number) ?? undefined,
    absorbRemaining: (effects.absorbDamage as number) ?? undefined,
    guaranteedHits: (effects.guaranteedHits as number) ?? undefined,
    extraAction: (effects.extraAction as boolean) ?? undefined,
    ccImmune: (effects.ccImmune as boolean) ?? undefined,
    stealthed: (effects.stealth as boolean) || (effects.untargetable as boolean) || undefined,
    hotPerRound: (effects.hpRegenPerRound as number) ?? undefined,
    // Phase 5B MECH-1: Consume buff after one use (bonusDamageNext)
    consumeOnUse: effects.bonusDamageNext != null ? true : undefined,
    // Phase 5B MECH-2: Next ability cooldown halved
    nextCooldownHalved: (effects.nextCooldownHalved as boolean) ?? undefined,
    // Phase 5B MECH-4: Attack scaling based on missing HP
    scalingType: (effects.attackScaling as string) ?? undefined,
    scalingMax: (effects.scalingMax as number) ?? undefined,
    // Phase 5B MECH-9: Poison charges on hit
    poisonCharges: (effects.poisonCharges as number) ?? undefined,
    poisonDotDamage: (effects.poisonDotDamage as number) ?? undefined,
    poisonDotDuration: (effects.poisonDotDuration as number) ?? undefined,
    // Phase 5B MECH-11: Stacking attack speed
    stackingAttackSpeedStacks: effects.stackingAttackSpeed ? 0 : undefined,
    stackingAttackSpeedMax: (effects.stackingAttackSpeedMax as number) ?? undefined,
  };

  const currentBuffs = actor.activeBuffs ?? [];
  // Replace existing buff from same ability
  const filtered = currentBuffs.filter(b => b.sourceAbilityId !== abilityDef.id);
  state = updateCombatant(state, actor.id, {
    activeBuffs: [...filtered, buff],
  });

  const parts: string[] = [];
  if (buff.attackMod) parts.push(`ATK ${buff.attackMod > 0 ? '+' : ''}${buff.attackMod}`);
  if (buff.acMod) parts.push(`AC ${buff.acMod > 0 ? '+' : ''}${buff.acMod}`);
  if (buff.damageReduction) parts.push(`${Math.round(buff.damageReduction * 100)}% DR`);
  if (buff.absorbRemaining) parts.push(`absorb ${buff.absorbRemaining}`);
  if (buff.ccImmune) parts.push('CC immune');
  if (buff.stealthed) parts.push('stealth');

  return {
    state,
    result: {
      buffApplied: abilityDef.name,
      buffDuration: duration,
      description: `${abilityDef.name}: buff for ${duration} rounds (${parts.join(', ') || 'active'})`,
    },
  };
};

const handleDebuff: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const duration = (effects.duration as number) ?? 3;
  // BUG-FIX 4: Data stores reductions as negative numbers (-4 = reduce by 4), use Math.abs
  const attackReduction = Math.abs((effects.attackReduction as number) ?? 0);
  const acReduction = Math.abs((effects.acReduction as number) ?? 0);
  const allStatsReduction = Math.abs((effects.allStatsReduction as number) ?? 0);

  // Phase 5B MECH-5: bonusDamageFromYou — target takes bonus damage from actor
  const bonusDamageFromYou = (effects.bonusDamageFromYou as number) ?? 0;

  // --- Save-based path: target can resist the debuff ---
  const saveResult = resolveAbilitySave(state, actor, target, abilityDef, effects);
  if (saveResult) {
    state = saveResult.state;
    const { dc, saveType, save } = saveResult.result;

    if (save.success) {
      return {
        state,
        result: {
          saveRequired: true, saveDC: dc, saveType, saveRoll: save.roll, saveTotal: save.total, saveSucceeded: true,
          description: `${abilityDef.name}: ${target.name} resisted debuff (${save.total} vs DC ${dc} ${saveType.toUpperCase()})`,
        },
      };
    }
  }

  // BUG-FIX 4: Use ActiveBuff for actual values instead of weakened status
  const debuffBuff: ActiveBuff = {
    sourceAbilityId: abilityDef.id,
    name: abilityDef.name,
    roundsRemaining: duration,
    attackMod: (attackReduction > 0 || allStatsReduction > 0) ? -(attackReduction || allStatsReduction) : undefined,
    acMod: acReduction > 0 ? -acReduction : undefined,
    bonusDamageFromSource: bonusDamageFromYou > 0 ? bonusDamageFromYou : undefined,
    bonusDamageSourceId: bonusDamageFromYou > 0 ? actor.id : undefined,
  };

  const updatedTarget = state.combatants.find(c => c.id === target.id)!;
  const currentBuffs = updatedTarget.activeBuffs ?? [];
  state = updateCombatant(state, target.id, {
    activeBuffs: [...currentBuffs.filter(b => b.sourceAbilityId !== abilityDef.id), debuffBuff],
  });

  const saveInfo = saveResult ? { saveRequired: true, saveDC: saveResult.result.dc, saveType: saveResult.result.saveType, saveRoll: saveResult.result.save.roll, saveTotal: saveResult.result.save.total, saveSucceeded: false } : {};

  return {
    state,
    result: {
      debuffApplied: abilityDef.name,
      debuffDuration: duration,
      statModifiers: {
        ...(attackReduction ? { attack: -attackReduction } : {}),
        ...(acReduction ? { ac: -acReduction } : {}),
        ...(allStatsReduction ? { allStats: -allStatsReduction } : {}),
      },
      ...saveInfo,
      description: (() => {
        const parts: string[] = [];
        if (attackReduction > 0) parts.push(`ATK -${attackReduction}`);
        if (acReduction > 0) parts.push(`AC -${acReduction}`);
        if (allStatsReduction > 0) parts.push(`all stats -${allStatsReduction}`);
        if (bonusDamageFromYou > 0) parts.push(`+${bonusDamageFromYou} bonus dmg taken`);
        const saveNote = saveResult ? ` (DC ${saveResult.result.dc})` : '';
        return `${abilityDef.name}: debuff on ${target.name} for ${duration} rounds${parts.length ? ` (${parts.join(', ')})` : ''}${saveNote}`;
      })(),
    },
  };
};

const handleHeal: EffectHandler = (state, actor, target, enemies, abilityDef, effects) => {
  const healTarget = target?.team === actor.team ? target : actor;
  const fullRestore = (effects.fullRestore as boolean) ?? false;
  const usesPerCombat = (effects.usesPerCombat as number) ?? 0;

  // Phase 5B MECH-8: Anti-heal aura — skip heal if any enemy has it
  if (enemies.some(e => e.antiHealAura)) {
    return { state, result: { description: `${abilityDef.name}: healing blocked by anti-heal aura` } };
  }

  // Check uses-per-combat limit
  if (usesPerCombat > 0) {
    const uses = actor.abilityUsesThisCombat?.[abilityDef.id] ?? 0;
    if (uses >= usesPerCombat) {
      return { state, result: { description: `${abilityDef.name}: already used this combat` } };
    }
    state = updateCombatant(state, actor.id, {
      abilityUsesThisCombat: { ...(actor.abilityUsesThisCombat ?? {}), [abilityDef.id]: uses + 1 },
    });
  }

  let healAmount: number;
  if (fullRestore) {
    healAmount = healTarget.maxHp - healTarget.currentHp;
  } else {
    const diceCount = (effects.diceCount as number) ?? 1;
    const diceSides = (effects.diceSides as number) ?? 8;
    const bonus = (effects.bonusHealing as number) ?? 0;
    healAmount = rollDice(diceCount, diceSides, bonus);
  }

  // Diseased targets receive halved healing
  for (const eff of healTarget.statusEffects) {
    const mech = STATUS_EFFECT_MECHANICS[eff.name];
    if (mech && mech.healingReceivedMult !== 1.0) {
      healAmount = Math.floor(healAmount * mech.healingReceivedMult);
    }
  }

  const newHp = clampHp(healTarget.currentHp + healAmount, healTarget.maxHp);
  state = updateCombatant(state, healTarget.id, { currentHp: newHp });

  const diseasedNote = healTarget.statusEffects.some(e => e.name === 'diseased') ? ' (halved by disease)' : '';
  return {
    state,
    result: {
      healing: healAmount,
      targetId: healTarget.id,
      targetHpAfter: newHp,
      description: `${abilityDef.name}: healed ${healTarget.name} for ${healAmount} HP${fullRestore ? ' (full restore)' : ''}${diseasedNote}`,
    },
  };
};

const handlePassive: EffectHandler = (_state, _actor, _target, _enemies, abilityDef, _effects) => {
  // Passives are applied at combat start, not during turn resolution.
  // If dispatched during combat, just acknowledge.
  return {
    state: _state,
    result: {
      description: `${abilityDef.name}: passive ability (always active)`,
    },
  };
};

const handleStatus: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const statusEffect = mapStatusName((effects.statusEffect as string) ?? 'stunned');
  let duration = (effects.statusDuration as number) ?? 2;

  // Save check — if the ability defines a saveType, target can resist
  const saveType = effects.saveType as string | undefined;
  if (saveType) {
    const dc = calculateSaveDC(actor);
    // Auto-fail DEX/STR saves for stunned/paralyzed targets
    const autoFailDex = target.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailDexSave);
    const autoFailStr = target.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailStrSave);
    if (!((saveType === 'dex' && autoFailDex) || (saveType === 'str' && autoFailStr))) {
      let targetSaveMod = getModifier(target.stats[saveType as keyof typeof target.stats] ?? 10) + target.proficiencyBonus;
      for (const eff of target.statusEffects) {
        const seDef = STATUS_EFFECT_DEFS[eff.name];
        if (seDef) targetSaveMod += seDef.saveModifier;
        const mech = STATUS_EFFECT_MECHANICS[eff.name];
        if (mech) {
          if (saveType === 'dex') targetSaveMod += mech.dexSaveMod;
          if (saveType === 'str') targetSaveMod += mech.strSaveMod;
        }
      }
      const save = savingThrow(targetSaveMod, dc);
      { const lr = checkLegendaryResistance(state, target.id, save, dc); if (lr.overridden) { save.success = true; state = lr.state; } }

      if (save.success) {
        return {
          state,
          result: {
            saveRequired: true,
            saveDC: dc,
            saveRoll: save.roll,
            saveTotal: save.total,
            saveSucceeded: true,
            description: `${abilityDef.name}: ${target.name} resisted (${save.total} vs DC ${dc})`,
          },
        };
      }
    }
  }

  // Phase 5B MECH-3: Charm effectiveness multiplier for mesmerize/charm abilities
  if (actor.charmEffectiveness && (statusEffect === 'mesmerize' || abilityDef.id.startsWith('bar-dip-'))) {
    duration = Math.floor(duration * (1 + actor.charmEffectiveness));
  }

  state = applyStatusEffectToState(state, target.id, statusEffect, duration, actor.id);

  // Phase 5B MECH-7: Taunt enforcement — also apply AC debuff to the taunted target
  if (statusEffect === 'taunt') {
    const tTarget = state.combatants.find(c => c.id === target.id)!;
    const tauntDebuff: ActiveBuff = {
      sourceAbilityId: abilityDef.id,
      name: `${abilityDef.name} (taunt debuff)`,
      roundsRemaining: duration,
      acMod: -2,
    };
    const tBuffs = tTarget.activeBuffs ?? [];
    state = updateCombatant(state, target.id, {
      activeBuffs: [...tBuffs.filter(b => b.name !== tauntDebuff.name), tauntDebuff],
    });
  }

  const saveInfo = saveType ? ` (DC ${calculateSaveDC(actor)})` : '';
  return {
    state,
    result: {
      statusApplied: statusEffect,
      statusDuration: duration,
      ...(saveType ? { saveRequired: true, saveDC: calculateSaveDC(actor), saveSucceeded: false } : {}),
      description: `${abilityDef.name}: applied ${statusEffect} to ${target.name} for ${duration} rounds${statusEffect === 'taunt' ? ' (AC -2)' : ''}${saveInfo}`,
    },
  };
};

const handleDamageStatus: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const damage = (effects.damage as number) ?? 0;
  const diceCount = (effects.diceCount as number) ?? 0;
  const diceSides = (effects.diceSides as number) ?? 0;
  const damageBonus = (effects.damageBonus as string);
  const statusEffect = mapStatusName((effects.statusEffect as string) ?? 'stunned');
  const duration = (effects.statusDuration as number) ?? 1;

  // --- Save-based path ---
  const saveResult = resolveAbilitySave(state, actor, target, abilityDef, effects);
  if (saveResult) {
    state = saveResult.state;
    const { dc, saveType, save } = saveResult.result;
    const bonusMod = damageBonus ? Math.max(0, getModifier(actor.stats[damageBonus as keyof typeof actor.stats] ?? 10)) : 0;
    let diceDmg = diceCount > 0 ? rollDice(diceCount, diceSides) : 0;
    const saveWeaponDmg = calcWeaponDamage(actor, abilityDef);
    let totalDamage = Math.max(0, saveWeaponDmg + damage + diceDmg + bonusMod);

    if (save.success) {
      totalDamage = Math.floor(totalDamage / 2);
      // No status on successful save
    }

    const hpBefore = target.currentHp;
    const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
    const killed = newHp <= 0;
    state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

    if (!save.success && !killed) {
      state = applyStatusEffectToState(state, target.id, statusEffect, duration, actor.id);
    }

    return {
      state,
      result: {
        damage: totalDamage,
        statusApplied: save.success ? undefined : statusEffect,
        statusDuration: save.success ? undefined : duration,
        targetHpAfter: newHp,
        targetKilled: killed,
        targetHpBefore: hpBefore,
        hit: true,
        saveRequired: true, saveDC: dc, saveType, saveRoll: save.roll, saveTotal: save.total, saveSucceeded: save.success,
        damageType: abilityDef.damageType ?? (effects.element as string),
        description: `${abilityDef.name}: ${totalDamage} damage${save.success ? ' (saved, half, no status)' : ` + ${statusEffect}(${duration})`} to ${target.name} (DC ${dc})`,
      },
    };
  }

  // --- Attack roll path (weapon or spell) ---
  const atkResult = resolveAbilityAttackRoll(actor, target, abilityDef, effects);
  if (atkResult && !atkResult.hit) {
    return {
      state,
      result: {
        damage: 0, targetHpAfter: target.currentHp, targetKilled: false, targetHpBefore: target.currentHp,
        attackRoll: atkResult.d20, attackTotal: atkResult.total, attackModifiers: atkResult.modifiers,
        targetAC: atkResult.targetAC, hit: false, isCritical: false,
        description: `${abilityDef.name}: missed ${target.name}`,
      },
    };
  }

  // Calculate stat-based bonus damage (e.g., INT modifier for psion abilities)
  const bonusMod = damageBonus ? Math.max(0, getModifier(actor.stats[damageBonus as keyof typeof actor.stats] ?? 10)) : 0;

  // Roll with detailed breakdown
  let diceRolls: number[] = [];
  let diceDmg = 0;
  if (diceCount > 0) {
    const detailed = rollDiceDetailed(diceCount, diceSides);
    diceRolls = detailed.rolls;
    diceDmg = detailed.total;
  }
  const weaponDmg = calcWeaponDamage(actor, abilityDef, atkResult?.isCrit ?? false);
  const totalDamage = Math.max(0, weaponDmg + damage + diceDmg + bonusMod);

  const hpBefore = target.currentHp;

  // Apply damage
  const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
  const killed = newHp <= 0;
  state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

  // Apply status (only if alive)
  if (!killed) {
    state = applyStatusEffectToState(state, target.id, statusEffect, duration, actor.id);
  }

  // Build damage modifiers
  const dmgModifiers: { source: string; value: number }[] = [];
  if (damage > 0) dmgModifiers.push({ source: 'flat damage', value: damage });
  if (bonusMod > 0) dmgModifiers.push({ source: `${damageBonus!.toUpperCase()} bonus`, value: bonusMod });

  return {
    state,
    result: {
      damage: totalDamage,
      statusApplied: statusEffect,
      statusDuration: duration,
      targetHpAfter: newHp,
      targetKilled: killed,
      targetHpBefore: hpBefore,
      weaponDice: diceCount > 0 ? `${diceCount}d${diceSides}` : undefined,
      damageRolls: diceRolls.length > 0 ? diceRolls : undefined,
      damageModifiers: dmgModifiers.length > 0 ? dmgModifiers : undefined,
      ...(atkResult ? { attackRoll: atkResult.d20, attackTotal: atkResult.total, attackModifiers: atkResult.modifiers, targetAC: atkResult.targetAC, hit: true, isCritical: atkResult.isCrit } : {}),
      damageType: abilityDef.damageType ?? (effects.element as string),
      description: `${abilityDef.name}: ${totalDamage} damage + ${statusEffect}(${duration}) to ${target.name}`,
    },
  };
};

const handleDamageDebuff: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const diceCount = (effects.diceCount as number) ?? 1;
  const diceSides = (effects.diceSides as number) ?? 6;
  const acReduction = (effects.acReduction as number) ?? 0;
  const duration = (effects.duration as number) ?? 2;

  // --- Save-based path ---
  const saveResult = resolveAbilitySave(state, actor, target, abilityDef, effects);
  if (saveResult) {
    state = saveResult.state;
    const { dc, saveType, save } = saveResult.result;
    const ddSaveWeapon = calcWeaponDamage(actor, abilityDef);
    let totalDamage = ddSaveWeapon + rollDice(diceCount, diceSides);
    if (save.success) {
      totalDamage = Math.floor(totalDamage / 2);
    }
    const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
    const killed = newHp <= 0;
    state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

    if (!save.success && !killed && acReduction > 0) {
      state = applyStatusEffectToState(state, target.id, 'weakened', duration, actor.id);
    }

    return {
      state,
      result: {
        damage: totalDamage,
        debuffApplied: save.success ? undefined : `AC -${acReduction}`,
        debuffDuration: save.success ? undefined : duration,
        targetHpAfter: newHp, targetKilled: killed,
        hit: true, saveRequired: true, saveDC: dc, saveType, saveRoll: save.roll, saveTotal: save.total, saveSucceeded: save.success,
        damageType: abilityDef.damageType ?? (effects.element as string),
        description: `${abilityDef.name}: ${totalDamage} damage${save.success ? ' (saved, half, no debuff)' : ` + AC-${acReduction}(${duration}r)`} to ${target.name} (DC ${dc})`,
      },
    };
  }

  // --- Attack roll path ---
  const atkResult = resolveAbilityAttackRoll(actor, target, abilityDef, effects);
  if (atkResult && !atkResult.hit) {
    return {
      state,
      result: {
        damage: 0, targetHpAfter: target.currentHp, targetKilled: false,
        attackRoll: atkResult.d20, attackTotal: atkResult.total, attackModifiers: atkResult.modifiers,
        targetAC: atkResult.targetAC, hit: false, isCritical: false,
        description: `${abilityDef.name}: missed ${target.name}`,
      },
    };
  }

  const ddWeaponDmg = calcWeaponDamage(actor, abilityDef, atkResult?.isCrit ?? false);
  const totalDamage = ddWeaponDmg + rollDice(diceCount, diceSides);
  const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
  const killed = newHp <= 0;
  state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

  if (!killed && acReduction > 0) {
    state = applyStatusEffectToState(state, target.id, 'weakened', duration, actor.id);
  }

  return {
    state,
    result: {
      damage: totalDamage,
      debuffApplied: `AC -${acReduction}`,
      debuffDuration: duration,
      targetHpAfter: newHp,
      targetKilled: killed,
      ...(atkResult ? { attackRoll: atkResult.d20, attackTotal: atkResult.total, attackModifiers: atkResult.modifiers, targetAC: atkResult.targetAC, hit: true, isCritical: atkResult.isCrit } : {}),
      damageType: abilityDef.damageType ?? (effects.element as string),
      description: `${abilityDef.name}: ${totalDamage} damage + AC-${acReduction}(${duration}r) to ${target.name}`,
    },
  };
};

const handleDrain: EffectHandler = (state, actor, target, enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  // Save path for attackType: 'save' drain abilities
  const saveResult = resolveAbilitySave(state, actor, target, abilityDef, effects as Record<string, any>);
  if (saveResult) {
    state = saveResult.state;
  }

  // Attack roll for spell/weapon drain abilities (only if not save-based)
  const atkResult = !saveResult ? resolveAbilityAttackRoll(actor, target, abilityDef, effects) : null;
  if (atkResult && !atkResult.hit) {
    return {
      state,
      result: {
        damage: 0, targetHpAfter: target.currentHp, targetKilled: false,
        attackRoll: atkResult.d20, attackTotal: atkResult.total, attackModifiers: atkResult.modifiers,
        targetAC: atkResult.targetAC, hit: false, isCritical: false,
        description: `${abilityDef.name}: missed ${target.name}`,
      },
    };
  }

  const diceCount = (effects.diceCount as number) ?? 2;
  const diceSides = (effects.diceSides as number) ?? 6;
  // BUG-FIX 1: healPercent is already a fraction (0.5 = 50%), don't divide by 100 again
  const healPercent = (effects.healPercent as number) ?? 0.5;

  const drainWeaponDmg = calcWeaponDamage(actor, abilityDef, atkResult?.isCrit ?? false);
  let totalDamage = drainWeaponDmg + rollDice(diceCount, diceSides);

  // On successful save: half damage, half heal
  if (saveResult?.result.save.success) {
    totalDamage = Math.floor(totalDamage / 2);
  }

  // Phase 5B MECH-8: Anti-heal aura blocks self-heal from drains
  const hasAntiHeal = enemies.some(e => e.antiHealAura);
  const selfHeal = hasAntiHeal ? 0 : Math.floor(totalDamage * healPercent);

  const targetNewHp = clampHp(target.currentHp - totalDamage, target.maxHp);
  const killed = targetNewHp <= 0;
  state = updateCombatant(state, target.id, { currentHp: targetNewHp, isAlive: !killed });

  const actorNewHp = clampHp(actor.currentHp + selfHeal, actor.maxHp);
  state = updateCombatant(state, actor.id, { currentHp: actorNewHp });

  return {
    state,
    result: {
      damage: totalDamage,
      selfHealing: selfHeal,
      targetHpAfter: targetNewHp,
      actorHpAfter: actorNewHp,
      targetKilled: killed,
      ...(atkResult ? { attackRoll: atkResult.d20, attackTotal: atkResult.total, attackModifiers: atkResult.modifiers, targetAC: atkResult.targetAC, hit: true, isCritical: atkResult.isCrit } : {}),
      ...(saveResult ? { saveDC: saveResult.result.dc, saveRoll: saveResult.result.save.roll, saveTotal: saveResult.result.save.total, saveSucceeded: saveResult.result.save.success } : {}),
      damageType: abilityDef.damageType ?? (effects.element as string),
      description: `${abilityDef.name}: ${totalDamage} damage to ${target.name}, healed self ${selfHeal}`,
    },
  };
};

const handleHot: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  const hotTarget = target?.team === actor.team ? target : actor;
  const healPerRound = (effects.healPerRound as number) ?? 5;
  const duration = (effects.duration as number) ?? 5;

  // Apply as regenerating status with custom heal amount
  state = applyStatusEffectToState(state, hotTarget.id, 'regenerating', duration, actor.id, healPerRound);

  return {
    state,
    result: {
      buffApplied: 'Regeneration',
      buffDuration: duration,
      description: `${abilityDef.name}: ${healPerRound} HP/round for ${duration} rounds on ${hotTarget.name}`,
    },
  };
};

const handleCleanse: EffectHandler = (state, actor, _target, _enemies, abilityDef, effects) => {
  const removeCount = (effects.removeCount as number) ?? 1;

  const harmfulEffects = ['poisoned', 'stunned', 'burning', 'frozen', 'paralyzed', 'blinded', 'weakened', 'slowed', 'dominated', 'root', 'silence', 'mesmerize', 'skip_turn', 'polymorph', 'diseased'];
  const currentActor = state.combatants.find(c => c.id === actor.id)!;
  const toRemove = currentActor.statusEffects
    .filter(e => harmfulEffects.includes(e.name))
    .slice(0, removeCount);

  if (toRemove.length === 0) {
    return { state, result: { description: `${abilityDef.name}: no debuffs to cleanse` } };
  }

  const removeIds = new Set(toRemove.map(e => e.id));
  state = updateCombatant(state, actor.id, {
    statusEffects: currentActor.statusEffects.filter(e => !removeIds.has(e.id)),
  });

  return {
    state,
    result: {
      cleansedEffects: toRemove.map(e => e.name),
      description: `${abilityDef.name}: cleansed ${toRemove.map(e => e.name).join(', ')}`,
    },
  };
};

const handleFleeAbility: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  // Phase 7 BUG-1: Taunted combatants cannot flee — taunt forces them to stay and fight
  const isTaunted = actor.statusEffects.some(e => e.name === 'taunt');
  if (isTaunted) {
    return {
      state,
      result: {
        fleeAttempt: true,
        fleeSuccess: false,
        description: `${abilityDef.name}: Cannot flee while taunted!`,
      },
    };
  }

  // BUG-FIX 3: successChance is a fraction (0.9 = 90%), multiply by 100 for percentile comparison
  const successChance = (effects.successChance as number) ?? 0.9;

  // Roll percentile
  const roll100 = roll(100);
  const success = roll100 <= successChance * 100;

  if (success) {
    state = updateCombatant(state, actor.id, { hasFled: true });
  }

  return {
    state,
    result: {
      fleeAttempt: true,
      fleeSuccess: success,
      description: `${abilityDef.name}: ${success ? 'escaped!' : 'failed to escape'} (${roll100}% vs ${successChance}%)`,
    },
  };
};

const handleAoeDebuff: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  const accuracyReduction = (effects.accuracyReduction as number) ?? 5;
  const duration = (effects.duration as number) ?? 2;
  const isSaveBased = abilityDef.attackType === 'save';
  const saveType = (effects as Record<string, any>).saveType as string ?? 'dex';
  const dc = isSaveBased ? calculateSaveDC(actor) : 0;

  let affected = 0;
  let immune = 0;
  let saved = 0;
  for (const enemy of enemies) {
    // Phase 7 BUG-2: Skip enemies with immuneBlinded (Third Eye Psion passive)
    if (enemy.immuneBlinded) {
      immune++;
      continue;
    }
    // Save check — target can resist the debuff
    if (isSaveBased) {
      // Auto-fail DEX/STR saves for stunned/paralyzed
      const afDex = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailDexSave);
      const afStr = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailStrSave);
      if (!((saveType === 'dex' && afDex) || (saveType === 'str' && afStr))) {
        let targetSaveMod = getModifier(enemy.stats[saveType as keyof typeof enemy.stats] ?? 10) + enemy.proficiencyBonus;
        for (const eff of enemy.statusEffects) {
          const seDef = STATUS_EFFECT_DEFS[eff.name];
          if (seDef) targetSaveMod += seDef.saveModifier;
          const mech = STATUS_EFFECT_MECHANICS[eff.name];
          if (mech) {
            if (saveType === 'dex') targetSaveMod += mech.dexSaveMod;
            if (saveType === 'str') targetSaveMod += mech.strSaveMod;
          }
        }
        const save = savingThrow(targetSaveMod, dc);
        const lr = checkLegendaryResistance(state, enemy.id, save, dc);
        if (lr.overridden) { save.success = true; state = lr.state; }
        if (save.success) { saved++; continue; }
      }
    }
    state = applyStatusEffectToState(state, enemy.id, 'blinded', duration, actor.id);
    affected++;
  }

  const immuneNote = immune > 0 ? ` (${immune} immune)` : '';
  const savedNote = saved > 0 ? ` (${saved} saved)` : '';
  return {
    state,
    result: {
      targetIds: enemies.filter(e => !e.immuneBlinded).map(e => e.id),
      debuffApplied: `accuracy -${accuracyReduction}`,
      debuffDuration: duration,
      ...(isSaveBased ? { saveRequired: true, saveDC: dc, saveType } : {}),
      description: `${abilityDef.name}: -${accuracyReduction} accuracy on ${affected} enemies for ${duration} rounds${immuneNote}${savedNote}`,
    },
  };
};

// ---- Phase 2 Helpers ----

function getDeadEnemies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => !c.isAlive && c.team !== actor.team);
}

// ---- Phase 2 Effect Handlers ----

const handleAoeDamage: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  // Corpse Explosion requires a dead enemy as the "bomb"
  if (effects.requiresCorpse) {
    const corpses = getDeadEnemies(state, actor);
    if (corpses.length === 0) {
      return {
        state,
        result: { description: `${abilityDef.name}: no corpses available` },
      };
    }
  }

  if (enemies.length === 0) {
    return { state, result: { description: `${abilityDef.name}: no targets` } };
  }

  // Save-based AoE: calculate DC once, each target saves individually
  const isSaveBased = abilityDef.attackType === 'save';
  const saveType = (effects.saveType as string) ?? 'dex';
  const dc = isSaveBased ? calculateSaveDC(actor) : 0;

  const perTargetResults: ClassAbilityResult['perTargetResults'] = [];
  let totalDamage = 0;
  const targetIds: string[] = [];

  for (const enemy of enemies) {
    let dmg = 0;
    const diceCount = (effects.diceCount as number) ?? 0;
    const diceSides = (effects.diceSides as number) ?? 6;

    if (effects.damageMultiplier && actor.weapon) {
      // Cleave: weapon damage × multiplier
      const statMod = getModifier(actor.stats[actor.weapon.damageModifierStat]);
      const weaponDmg = rollDice(actor.weapon.diceCount, actor.weapon.diceSides, statMod + actor.weapon.bonusDamage);
      dmg = Math.max(0, Math.floor(weaponDmg * (effects.damageMultiplier as number)));
    } else if (effects.hitsPerTarget) {
      // Rain of Arrows: roll damage multiple times per target
      for (let i = 0; i < (effects.hitsPerTarget as number); i++) {
        dmg += rollDice(diceCount, diceSides);
      }
    } else if (effects.baseDice) {
      // Epic Finale: base dice + round bonus
      const baseDice = (effects.baseDice as number);
      const bonusPerRound = (effects.bonusPerRound as number) ?? 0;
      dmg = rollDice(baseDice, diceSides) + (state.round * bonusPerRound);
    } else if (diceCount > 0) {
      // Standard: Fireball, Meteor Strike, Corpse Explosion, Divine Wrath
      dmg = rollDice(diceCount, diceSides);
    }

    // Per-target save for save-based AoE
    let saveDCVal: number | undefined;
    let saveRollVal: number | undefined;
    let saveTotalVal: number | undefined;
    let saveSucceededVal: boolean | undefined;
    if (isSaveBased) {
      // Auto-fail DEX/STR saves for stunned/paralyzed
      const afDex = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailDexSave);
      const afStr = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailStrSave);
      if ((saveType === 'dex' && afDex) || (saveType === 'str' && afStr)) {
        // Auto-fail: full damage
        saveDCVal = dc;
        saveRollVal = 1;
        saveTotalVal = 0;
        saveSucceededVal = false;
      } else {
        let targetSaveMod = getModifier(enemy.stats[saveType as keyof typeof enemy.stats] ?? 10) + enemy.proficiencyBonus;
        for (const eff of enemy.statusEffects) {
          const seDef = STATUS_EFFECT_DEFS[eff.name];
          if (seDef) targetSaveMod += seDef.saveModifier;
          const mech = STATUS_EFFECT_MECHANICS[eff.name];
          if (mech) {
            if (saveType === 'dex') targetSaveMod += mech.dexSaveMod;
            if (saveType === 'str') targetSaveMod += mech.strSaveMod;
          }
        }
        const save = savingThrow(targetSaveMod, dc);
        const lr = checkLegendaryResistance(state, enemy.id, save, dc);
        if (lr.overridden) { save.success = true; state = lr.state; }
        if (save.success) {
          dmg = Math.floor(dmg / 2);
        }
        saveDCVal = dc;
        saveRollVal = save.roll;
        saveTotalVal = save.total;
        saveSucceededVal = save.success;
      }
    }

    dmg = Math.max(0, dmg);
    const target = state.combatants.find(c => c.id === enemy.id)!;
    const newHp = clampHp(target.currentHp - dmg, target.maxHp);
    const killed = newHp <= 0;

    state = updateCombatant(state, enemy.id, { currentHp: newHp, isAlive: !killed });
    totalDamage += dmg;
    targetIds.push(enemy.id);

    perTargetResults.push({
      targetId: enemy.id,
      targetName: enemy.name,
      damage: dmg,
      hpAfter: newHp,
      killed,
      ...(isSaveBased ? { saveDC: saveDCVal, saveRoll: saveRollVal, saveTotal: saveTotalVal, saveSucceeded: saveSucceededVal } : {}),
    });
  }

  const element = (effects.element as string) ?? '';
  const saveNote = isSaveBased ? ` (DC ${dc} ${saveType.toUpperCase()} save, half on success)` : '';
  return {
    state,
    result: {
      targetIds,
      damage: totalDamage,
      perTargetResults,
      ...(isSaveBased ? { saveRequired: true, saveDC: dc, saveType } : {}),
      damageType: abilityDef.damageType ?? (effects.element as string),
      description: `${abilityDef.name}: ${totalDamage}${element ? ' ' + element : ''} damage to ${enemies.length} targets${saveNote}`,
    },
  };
};

const handleMultiTarget: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  const maxTargets = (effects.targets as number) ?? 3;
  // Target weakest enemies first
  const sorted = [...enemies].sort((a, b) => a.currentHp - b.currentHp);
  const targets = sorted.slice(0, maxTargets);

  if (targets.length === 0) {
    return { state, result: { description: `${abilityDef.name}: no targets` } };
  }

  const diceCount = (effects.diceCount as number) ?? 1;
  const diceSides = (effects.diceSides as number) ?? 6;
  const hasAttackRoll = abilityDef.attackType === 'weapon' || abilityDef.attackType === 'spell';
  const isSaveBased = abilityDef.attackType === 'save';
  const saveType = (effects as Record<string, any>).saveType as string ?? 'dex';
  const dc = isSaveBased ? calculateSaveDC(actor) : 0;
  const perTargetResults: ClassAbilityResult['perTargetResults'] = [];
  let totalDamage = 0;
  const targetIds: string[] = [];

  for (const enemy of targets) {
    // Per-target attack roll for weapon/spell multi-target abilities
    if (hasAttackRoll) {
      const atkResult = resolveAbilityAttackRoll(actor, enemy, abilityDef, effects);
      if (atkResult && !atkResult.hit) {
        targetIds.push(enemy.id);
        perTargetResults.push({
          targetId: enemy.id,
          targetName: enemy.name,
          damage: 0,
          hpAfter: enemy.currentHp,
          killed: false,
        });
        continue;
      }
    }

    const mtWeaponDmg = calcWeaponDamage(actor, abilityDef);
    let dmg = mtWeaponDmg + rollDice(diceCount, diceSides);

    // Per-target save for save-based multi-target abilities
    let saveDCVal: number | undefined;
    let saveRollVal: number | undefined;
    let saveTotalVal: number | undefined;
    let saveSucceededVal: boolean | undefined;
    if (isSaveBased) {
      const afDex = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailDexSave);
      const afStr = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailStrSave);
      if ((saveType === 'dex' && afDex) || (saveType === 'str' && afStr)) {
        saveDCVal = dc;
        saveRollVal = 1;
        saveTotalVal = 0;
        saveSucceededVal = false;
      } else {
        let targetSaveMod = getModifier(enemy.stats[saveType as keyof typeof enemy.stats] ?? 10) + enemy.proficiencyBonus;
        for (const eff of enemy.statusEffects) {
          const seDef = STATUS_EFFECT_DEFS[eff.name];
          if (seDef) targetSaveMod += seDef.saveModifier;
          const mech = STATUS_EFFECT_MECHANICS[eff.name];
          if (mech) {
            if (saveType === 'dex') targetSaveMod += mech.dexSaveMod;
            if (saveType === 'str') targetSaveMod += mech.strSaveMod;
          }
        }
        const save = savingThrow(targetSaveMod, dc);
        const lr = checkLegendaryResistance(state, enemy.id, save, dc);
        if (lr.overridden) { save.success = true; state = lr.state; }
        if (save.success) dmg = Math.floor(dmg / 2);
        saveDCVal = dc;
        saveRollVal = save.roll;
        saveTotalVal = save.total;
        saveSucceededVal = save.success;
      }
    }

    const target = state.combatants.find(c => c.id === enemy.id)!;
    const newHp = clampHp(target.currentHp - dmg, target.maxHp);
    const killed = newHp <= 0;

    state = updateCombatant(state, enemy.id, { currentHp: newHp, isAlive: !killed });
    totalDamage += dmg;
    targetIds.push(enemy.id);

    perTargetResults.push({
      targetId: enemy.id,
      targetName: enemy.name,
      damage: dmg,
      hpAfter: newHp,
      killed,
      ...(isSaveBased ? { saveDC: saveDCVal, saveRoll: saveRollVal, saveTotal: saveTotalVal, saveSucceeded: saveSucceededVal } : {}),
    });
  }

  const element = (effects.element as string) ?? '';
  const saveNote = isSaveBased ? ` (DC ${dc} ${saveType} save)` : '';
  return {
    state,
    result: {
      targetIds,
      damage: totalDamage,
      perTargetResults,
      ...(isSaveBased ? { saveRequired: true, saveDC: dc, saveType } : {}),
      damageType: abilityDef.damageType ?? (effects.element as string),
      description: `${abilityDef.name}: ${totalDamage}${element ? ' ' + element : ''} damage to ${targets.length} targets${saveNote}`,
    },
  };
};

const handleMultiAttack: EffectHandler = (state, actor, target, enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    // Pick first alive enemy
    target = enemies[0] ?? null;
    if (!target) {
      return { state, result: { description: `${abilityDef.name}: no targets` } };
    }
  }

  const strikes = (effects.strikes as number) ?? 2;
  const accuracyPenalty = (effects.accuracyPenalty as number) ?? 0;
  const damageMultiplier = (effects.damageMultiplier as number) ?? 1.0;

  if (!actor.weapon) {
    return { state, result: { description: `${abilityDef.name}: no weapon equipped`, fallbackToAttack: true } };
  }

  const strikeResults: NonNullable<ClassAbilityResult['strikeResults']> = [];
  let totalDamage = 0;
  let strikesHit = 0;

  for (let i = 0; i < strikes; i++) {
    // Clone actor with accuracy penalty applied to weapon bonus
    const modifiedWeapon: WeaponInfo = {
      ...actor.weapon,
      bonusAttack: actor.weapon.bonusAttack + accuracyPenalty,
    };

    const atk = resolveAttack(state, actor.id, target.id, modifiedWeapon);
    state = atk.state;

    let strikeDamage = atk.result.totalDamage;
    if (damageMultiplier !== 1.0 && atk.result.hit) {
      // Apply damage multiplier and correct the HP
      const originalDmg = strikeDamage;
      strikeDamage = Math.max(0, Math.floor(originalDmg * damageMultiplier));
      const diff = originalDmg - strikeDamage;
      if (diff !== 0) {
        // Restore the HP difference since resolveAttack already applied full damage
        const currentTarget = state.combatants.find(c => c.id === target!.id)!;
        const correctedHp = clampHp(currentTarget.currentHp + diff, currentTarget.maxHp);
        state = updateCombatant(state, target.id, {
          currentHp: correctedHp,
          isAlive: correctedHp > 0,
        });
      }
    }

    if (atk.result.hit) strikesHit++;
    totalDamage += strikeDamage;

    strikeResults.push({
      strikeNumber: i + 1,
      hit: atk.result.hit,
      crit: atk.result.critical,
      damage: strikeDamage,
      attackRoll: atk.result.attackRoll,
      attackTotal: atk.result.attackTotal,
      targetAc: atk.result.targetAC,
    });
  }

  const finalTarget = state.combatants.find(c => c.id === target!.id)!;
  return {
    state,
    result: {
      targetId: target.id,
      damage: totalDamage,
      strikeResults,
      totalStrikes: strikes,
      strikesHit,
      targetHpAfter: finalTarget.currentHp,
      targetKilled: !finalTarget.isAlive,
      description: `${abilityDef.name}: ${strikesHit}/${strikes} strikes hit for ${totalDamage} total damage`,
    },
  };
};

const handleAoeDrain: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  if (enemies.length === 0) {
    return { state, result: { description: `${abilityDef.name}: no targets` } };
  }

  const diceCount = (effects.diceCount as number) ?? 3;
  const diceSides = (effects.diceSides as number) ?? 8;
  const healPerTarget = (effects.healPerTarget as number) ?? 8;

  // Save-based AoE drain: each target saves individually
  const isSaveBased = abilityDef.attackType === 'save';
  const saveType = (effects.saveType as string) ?? 'wis';
  const dc = isSaveBased ? calculateSaveDC(actor) : 0;

  const perTargetResults: ClassAbilityResult['perTargetResults'] = [];
  let totalDamage = 0;
  let healableTargets = 0;
  const targetIds: string[] = [];

  for (const enemy of enemies) {
    let dmg = rollDice(diceCount, diceSides);

    // Per-target save
    if (isSaveBased) {
      const afDex = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailDexSave);
      const afStr = enemy.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailStrSave);
      if (!((saveType === 'dex' && afDex) || (saveType === 'str' && afStr))) {
        let targetSaveMod = getModifier(enemy.stats[saveType as keyof typeof enemy.stats] ?? 10) + enemy.proficiencyBonus;
        for (const eff of enemy.statusEffects) {
          const seDef = STATUS_EFFECT_DEFS[eff.name];
          if (seDef) targetSaveMod += seDef.saveModifier;
          const mech = STATUS_EFFECT_MECHANICS[eff.name];
          if (mech) {
            if (saveType === 'dex') targetSaveMod += mech.dexSaveMod;
            if (saveType === 'str') targetSaveMod += mech.strSaveMod;
          }
        }
        const save = savingThrow(targetSaveMod, dc);
        const lr = checkLegendaryResistance(state, enemy.id, save, dc);
        if (lr.overridden) { save.success = true; state = lr.state; }
        if (save.success) {
          dmg = Math.floor(dmg / 2);
        }
      }
    }

    dmg = Math.max(0, dmg);
    const target = state.combatants.find(c => c.id === enemy.id)!;
    const newHp = clampHp(target.currentHp - dmg, target.maxHp);
    const killed = newHp <= 0;

    state = updateCombatant(state, enemy.id, { currentHp: newHp, isAlive: !killed });
    totalDamage += dmg;
    healableTargets++;
    targetIds.push(enemy.id);

    perTargetResults.push({
      targetId: enemy.id,
      targetName: enemy.name,
      damage: dmg,
      hpAfter: newHp,
      killed,
    });
  }

  // Heal actor
  const selfHeal = healableTargets * healPerTarget;
  const actorNow = state.combatants.find(c => c.id === actor.id)!;
  const newActorHp = clampHp(actorNow.currentHp + selfHeal, actorNow.maxHp);
  state = updateCombatant(state, actor.id, { currentHp: newActorHp });

  const saveNote = isSaveBased ? ` (DC ${dc} ${saveType.toUpperCase()} save)` : '';
  return {
    state,
    result: {
      targetIds,
      damage: totalDamage,
      selfHealing: selfHeal,
      actorHpAfter: newActorHp,
      perTargetResults,
      ...(isSaveBased ? { saveRequired: true, saveDC: dc, saveType } : {}),
      damageType: abilityDef.damageType ?? (effects.element as string),
      description: `${abilityDef.name}: ${totalDamage} damage to ${enemies.length} targets, healed self ${selfHeal}${saveNote}`,
    },
  };
};

const handleDispelDamage: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const damagePerBuff = (effects.damagePerBuff as number) ?? 8;

  // Count and remove activeBuffs
  const currentTarget = state.combatants.find(c => c.id === target.id)!;
  const buffCount = (currentTarget.activeBuffs ?? []).length;

  // Also count positive status effects to remove
  const positiveStatuses = ['blessed', 'shielded', 'hasted', 'regenerating', 'foresight'];
  const positiveEffects = currentTarget.statusEffects.filter(e => positiveStatuses.includes(e.name));
  const totalRemoved = buffCount + positiveEffects.length;

  if (totalRemoved === 0) {
    return {
      state,
      result: { description: `${abilityDef.name}: target has no buffs to purge` },
    };
  }

  // Clear buffs and positive statuses
  state = updateCombatant(state, target.id, {
    activeBuffs: [],
    statusEffects: currentTarget.statusEffects.filter(e => !positiveStatuses.includes(e.name)),
  });

  // Apply damage
  const totalDamage = totalRemoved * damagePerBuff;
  const updatedTarget = state.combatants.find(c => c.id === target.id)!;
  const newHp = clampHp(updatedTarget.currentHp - totalDamage, updatedTarget.maxHp);
  const killed = newHp <= 0;
  state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

  return {
    state,
    result: {
      targetId: target.id,
      damage: totalDamage,
      cleansedEffects: [...(currentTarget.activeBuffs ?? []).map(b => b.name), ...positiveEffects.map(e => e.name)],
      targetHpAfter: newHp,
      targetKilled: killed,
      description: `${abilityDef.name}: purged ${totalRemoved} buffs, dealt ${totalDamage} damage (${damagePerBuff} per buff)`,
    },
  };
};

const handleAoeDot: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  if (enemies.length === 0) {
    return { state, result: { description: `${abilityDef.name}: no targets` } };
  }

  const damagePerRound = (effects.damagePerRound as number) ?? 6;
  const duration = (effects.duration as number) ?? 3;
  // NOTE: bonusVsUndead not applied — no undead flag exists on combatants
  const targetIds: string[] = [];

  for (const enemy of enemies) {
    state = applyStatusEffectToState(state, enemy.id, 'burning', duration, actor.id, damagePerRound);
    targetIds.push(enemy.id);
  }

  const element = (effects.element as string) ?? '';
  return {
    state,
    result: {
      targetIds,
      statusApplied: 'burning',
      statusDuration: duration,
      description: `${abilityDef.name}: ${damagePerRound}${element ? ' ' + element : ''} damage/round to ${enemies.length} targets for ${duration} rounds`,
    },
  };
};

const handleDelayedDamage: EffectHandler = (state, actor, target, enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    target = enemies[0] ?? null;
    if (!target) {
      return { state, result: { description: `${abilityDef.name}: no valid target` } };
    }
  }

  const delay = (effects.delay as number) ?? 3;
  const diceCount = (effects.diceCount as number) ?? 8;
  const diceSides = (effects.diceSides as number) ?? 6;

  const currentTarget = state.combatants.find(c => c.id === target!.id)!;
  const existing = (currentTarget.delayedEffects ?? []).filter(
    d => d.sourceAbilityId !== abilityDef.id // Replace existing mark from same ability
  );

  const newEffect: DelayedEffect = {
    id: `${abilityDef.id}-${Date.now()}`,
    sourceAbilityId: abilityDef.id,
    sourceAbilityName: abilityDef.name,
    sourceActorId: actor.id,
    roundsRemaining: delay,
    diceCount,
    diceSides,
  };

  state = updateCombatant(state, target.id, {
    delayedEffects: [...existing, newEffect],
  });

  return {
    state,
    result: {
      targetId: target.id,
      description: `${abilityDef.name}: placed on ${target.name}. Detonates in ${delay} rounds for ${diceCount}d${diceSides} damage.`,
    },
  };
};

// ---- Phase 3A Handlers: Steal, Damage+Steal, Companion Attack, Special ----

const handleSteal: EffectHandler = (_state, _actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state: _state, result: { description: `${abilityDef.name}: no valid target` } };
  }
  const range = (effects.goldRange as number[]) ?? [5, 20];
  const amount = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
  return {
    state: _state,
    result: {
      targetId: target.id,
      damage: 0,
      goldStolen: amount,
      description: `${abilityDef.name}: Stole ${amount} gold from ${target.name}`,
    },
  };
};

const handleDamageSteal: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }
  const diceCount = (effects.diceCount as number) ?? 3;
  const diceSides = (effects.diceSides as number) ?? 6;
  const damage = rollDice(diceCount, diceSides);
  const hpAfter = clampHp(target.currentHp - damage, target.maxHp);
  const killed = hpAfter <= 0;
  state = updateCombatant(state, target.id, { currentHp: hpAfter, isAlive: !killed });

  const goldStolen = 10 + Math.floor(Math.random() * 41); // 10-50
  return {
    state,
    result: {
      targetId: target.id,
      damage,
      targetHpAfter: hpAfter,
      targetKilled: killed,
      goldStolen,
      bonusLootRoll: !!(effects.stealItem),
      description: `${abilityDef.name}: ${damage} damage to ${target.name}, stole ${goldStolen} gold${effects.stealItem ? ' + bonus loot' : ''}`,
    },
  };
};

const handleCompanionAttack: EffectHandler = (state, actor, target, enemies, abilityDef, effects) => {
  const companion = (actor.activeBuffs ?? []).find(b => b.companionDamage != null);
  if (!companion) {
    return {
      state,
      result: { description: `${abilityDef.name} failed — no companion active`, damage: 0 },
    };
  }

  const actualTarget = (target && target.isAlive) ? target : enemies[0];
  if (!actualTarget) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const diceCount = (effects.diceCount as number) ?? 4;
  const diceSides = (effects.diceSides as number) ?? 8;
  const damage = rollDice(diceCount, diceSides);
  const hpAfter = clampHp(actualTarget.currentHp - damage, actualTarget.maxHp);
  const killed = hpAfter <= 0;
  state = updateCombatant(state, actualTarget.id, { currentHp: hpAfter, isAlive: !killed });

  return {
    state,
    result: {
      targetId: actualTarget.id,
      damage,
      targetHpAfter: hpAfter,
      targetKilled: killed,
      description: `${abilityDef.name}: Companion attacks ${actualTarget.name} for ${damage} damage`,
    },
  };
};

// ---- Tome of Secrets curated ability pool ----

const TOME_ELIGIBLE_ABILITIES = [
  'war-ber-1',  // Reckless Strike (damage)
  'mag-ele-1',  // Fireball (aoe_damage)
  'mag-ele-3',  // Chain Lightning (multi_target)
  'mag-nec-1',  // Life Drain (drain)
  'mag-nec-5',  // Soul Harvest (aoe_drain)
  'cle-hea-1',  // Healing Light (heal)
  'cle-hea-3',  // Greater Heal (heal)
  'cle-inq-1',  // Denounce (damage_status)
  'cle-inq-4',  // Purging Flame (dispel_damage)
  'ran-sha-2',  // Multi-Shot (multi_target)
  'bar-bat-1',  // War Song (buff)
  'bar-bat-3',  // Thunderclap (aoe_debuff)
  'rog-ass-1',  // Backstab (damage)
  'mag-enc-1',  // Arcane Bolt (damage)
  'cle-pal-5',  // Divine Wrath (aoe_damage)
];

function handleDiplomatsGambit(
  state: CombatState, actor: Combatant, effects: Record<string, any>,
): { state: CombatState; result: Partial<ClassAbilityResult> } {
  const successChance = (effects.successChance as number) ?? 0.5;
  if (Math.random() < successChance) {
    state = { ...state, status: 'COMPLETED', winningTeam: null, peacefulResolution: true };
    return {
      state,
      result: {
        peacefulResolution: true,
        description: `Diplomat's Gambit succeeds! Combat ends peacefully.`,
      },
    };
  }
  return {
    state,
    result: {
      peacefulResolution: false,
      description: `Diplomat's Gambit fails — the enemy refuses peace.`,
    },
  };
}

function handleTomeOfSecrets(
  state: CombatState, actor: Combatant, target: Combatant | null, enemies: Combatant[],
  _abilityDef: AbilityDefinition, _effects: Record<string, any>,
): { state: CombatState; result: Partial<ClassAbilityResult> } {
  const pickedId = TOME_ELIGIBLE_ABILITIES[Math.floor(Math.random() * TOME_ELIGIBLE_ABILITIES.length)];
  const pickedAbility = abilityMap.get(pickedId);
  if (!pickedAbility) {
    return { state, result: { description: 'Tome of Secrets: failed to channel an ability', fallbackToAttack: true } };
  }

  const pickedEffects = pickedAbility.effects as Record<string, any>;
  const effectType = (pickedEffects.type as string) ?? 'unknown';
  const handler = EFFECT_HANDLERS[effectType];
  if (!handler) {
    return { state, result: { description: `Tome of Secrets: channeled ${pickedAbility.name} but effect type "${effectType}" not implemented`, fallbackToAttack: true } };
  }

  // Ensure we have a target for damage/enemy-targeting abilities
  let resolvedTarget = target;
  if (!resolvedTarget || !resolvedTarget.isAlive) {
    if (enemies.length > 0) {
      resolvedTarget = enemies[0];
    }
  }
  // Self-targeting for heals/buffs
  if (effectType === 'heal' || effectType === 'buff' || effectType === 'hot') {
    resolvedTarget = actor;
  }

  const { state: newState, result: delegatedResult } = handler(state, actor, resolvedTarget, enemies, pickedAbility, pickedEffects);
  return {
    state: newState,
    result: {
      ...delegatedResult,
      randomAbilityUsed: pickedAbility.name,
      description: `Tome of Secrets channels ${pickedAbility.name}! ${delegatedResult.description ?? ''}`,
    },
  };
}

const handleSpecial: EffectHandler = (state, actor, target, enemies, abilityDef, effects) => {
  if (effects.peacefulEnd) {
    return handleDiplomatsGambit(state, actor, effects);
  }
  if (effects.randomClassAbility) {
    return handleTomeOfSecrets(state, actor, target, enemies, abilityDef, effects);
  }
  return { state, result: { description: `${abilityDef.name}: Unknown special effect`, fallbackToAttack: true } };
};

// ---- Phase 3B Handlers: Counter, Trap ----

const handleCounter: EffectHandler = (state, actor, _target, _enemies, abilityDef, effects) => {
  const counterDamage = (effects.counterDamage as number) ?? 8;
  const triggerOn = (effects.triggerOn as 'melee_attack' | 'attacked') ?? 'melee_attack';

  const buffs = [...(actor.activeBuffs ?? [])];
  buffs.push({
    sourceAbilityId: abilityDef.id,
    name: `${abilityDef.name} Stance`,
    roundsRemaining: 2,
    counterDamage,
    triggerOn,
  });
  state = updateCombatant(state, actor.id, { activeBuffs: buffs });

  return {
    state,
    result: {
      buffApplied: `${abilityDef.name} Stance`,
      buffDuration: 2,
      description: `${abilityDef.name}: ${actor.name} enters counter stance — next ${triggerOn === 'melee_attack' ? 'melee attacker' : 'attacker'} takes ${counterDamage} damage`,
    },
  };
};

const handleTrap: EffectHandler = (state, actor, _target, _enemies, abilityDef, effects) => {
  const trapDamage = (effects.trapDamage as number) ?? 10;
  const trapAoe = !!(effects.aoe);
  const triggerOn = (effects.triggerOn as 'melee_attack' | 'attacked') ?? 'attacked';

  const buffs = [...(actor.activeBuffs ?? [])];
  buffs.push({
    sourceAbilityId: abilityDef.id,
    name: trapAoe ? 'Explosive Trap' : 'Lay Trap',
    roundsRemaining: 3,
    trapDamage,
    trapAoe,
    triggerOn,
  });
  state = updateCombatant(state, actor.id, { activeBuffs: buffs });

  return {
    state,
    result: {
      buffApplied: trapAoe ? 'Explosive Trap' : 'Lay Trap',
      buffDuration: 3,
      description: `${abilityDef.name}: Trap armed — triggers when attacked${trapAoe ? ' (hits all enemies)' : ''}`,
    },
  };
};

// ---- Phase 3C Handler: Summon ----

const handleSummon: EffectHandler = (state, actor, _target, _enemies, abilityDef, effects) => {
  const companionDamage = (effects.companionDamage as number) ?? 5;
  const duration = (effects.duration as number) ?? 5;
  const companionHp = effects.companionHp as number | undefined;

  // Replace existing companion (don't stack)
  const existingBuffs = (actor.activeBuffs ?? []).filter(b => b.companionDamage == null);
  const companionName = companionHp ? 'Alpha Companion' : 'Animal Companion';

  existingBuffs.push({
    sourceAbilityId: abilityDef.id,
    name: companionName,
    roundsRemaining: duration,
    companionDamage,
    companionHp,
  });
  state = updateCombatant(state, actor.id, { activeBuffs: existingBuffs });

  const hpStr = companionHp ? ` (HP: ${companionHp})` : '';
  return {
    state,
    result: {
      buffApplied: companionName,
      buffDuration: duration,
      description: `${actor.name} summons a ${companionName.toLowerCase()}!${hpStr} (${companionDamage} damage/round for ${duration} rounds)`,
    },
  };
};

// ---- Psion Effect Handlers ----

// CLASS_PRIMARY_STAT imported from @shared/data/combat-constants

/** Save DC = 8 + proficiency bonus + class primary stat modifier */
function calculateSaveDC(actor: Combatant, saveStatOverride?: string): number {
  const castingStat = saveStatOverride
    ?? (actor.characterClass ? CLASS_PRIMARY_STAT[actor.characterClass.toLowerCase()] : undefined)
    ?? 'int';
  const statMod = getModifier(actor.stats[castingStat as keyof typeof actor.stats] ?? 10);
  return 8 + actor.proficiencyBonus + statMod;
}

// ---- Ability Attack/Save Resolution Utilities ----

interface AbilityAttackResult {
  hit: boolean;
  isCrit: boolean;
  d20: number;
  total: number;
  modifiers: { source: string; value: number }[];
  targetAC: number;
}

/**
 * Shared attack roll for class abilities based on attackType.
 * - 'weapon': uses weapon's attackModifierStat + proficiency + weapon bonus
 * - 'spell': uses CLASS_PRIMARY_STAT + proficiency (no weapon bonus)
 * - 'save' / 'auto' / undefined with autoHit: returns null (no roll)
 */
function resolveAbilityAttackRoll(
  actor: Combatant,
  target: Combatant,
  abilityDef: AbilityDefinition,
  effects: Record<string, any>,
): AbilityAttackResult | null {
  const attackType = abilityDef.attackType;
  const autoHit = (effects.autoHit as boolean) ?? false;
  const ignoreArmor = (effects.ignoreArmor as boolean) ?? false;
  const accuracyBonus = (effects.accuracyBonus as number) ?? 0;
  const accuracyPenalty = (effects.accuracyPenalty as number) ?? 0;
  const accuracyMod = accuracyBonus + accuracyPenalty;
  const critBonus = (effects.critBonus as number) ?? 0;

  // No roll for auto-hit, save-based, or explicitly auto abilities
  if (autoHit || attackType === 'save' || attackType === 'auto') return null;

  // Determine stat and bonus based on attack type
  let statMod: number;
  let statName: string;
  let weaponBonus = 0;
  const modifiers: { source: string; value: number }[] = [];

  if (attackType === 'spell') {
    // Spell attack: class primary stat + proficiency, no weapon bonus
    statName = actor.characterClass
      ? CLASS_PRIMARY_STAT[actor.characterClass.toLowerCase()] ?? 'int'
      : 'int';
    statMod = getModifier(actor.stats[statName as keyof typeof actor.stats] ?? 10);
  } else {
    // Weapon attack (default): use weapon's attack modifier stat
    if (!actor.weapon) return null; // can't roll without weapon
    statName = actor.weapon.attackModifierStat;
    statMod = getModifier(actor.stats[actor.weapon.attackModifierStat]);
    weaponBonus = actor.weapon.bonusAttack;
  }

  const totalMod = statMod + actor.proficiencyBonus + weaponBonus + accuracyMod;
  const effectiveAC = ignoreArmor ? 10 : target.ac;
  const d20 = roll(20);
  const hit = d20 + totalMod >= effectiveAC || d20 === 20;
  const critThreshold = 20 - Math.floor(critBonus / 5);
  const isCrit = d20 >= critThreshold && hit;

  if (statMod !== 0) modifiers.push({ source: statName.toUpperCase(), value: statMod });
  if (actor.proficiencyBonus !== 0) modifiers.push({ source: 'proficiency', value: actor.proficiencyBonus });
  if (weaponBonus !== 0) modifiers.push({ source: 'weapon bonus', value: weaponBonus });
  if (accuracyMod !== 0) modifiers.push({ source: 'ability accuracy', value: accuracyMod });

  return { hit, isCrit, d20, total: d20 + totalMod, modifiers, targetAC: effectiveAC };
}

interface AbilitySaveResult {
  dc: number;
  saveType: string;
  save: { roll: number; total: number; success: boolean };
}

/**
 * Shared saving throw resolution for abilities with attackType: 'save'.
 * Uses calculateSaveDC() (class-aware) and savingThrow() from dice utils.
 * Also checks legendary resistance.
 */
function resolveAbilitySave(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  abilityDef: AbilityDefinition,
  effects: Record<string, any>,
): { result: AbilitySaveResult; state: CombatState } | null {
  if (abilityDef.attackType !== 'save') return null;

  const saveType = (effects.saveType as string) ?? 'wis';
  const dc = calculateSaveDC(actor);

  // Auto-fail DEX/STR saves for stunned/paralyzed targets
  const autoFailDex = target.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailDexSave);
  const autoFailStr = target.statusEffects.some(e => STATUS_EFFECT_MECHANICS[e.name]?.autoFailStrSave);
  if ((saveType === 'dex' && autoFailDex) || (saveType === 'str' && autoFailStr)) {
    return {
      result: { dc, saveType, save: { roll: 1, total: 0, success: false } },
      state,
    };
  }

  let targetSaveMod = getModifier(target.stats[saveType as keyof typeof target.stats] ?? 10) + target.proficiencyBonus;
  // Apply status effect save modifiers (e.g., frightened -2)
  for (const eff of target.statusEffects) {
    const seDef = STATUS_EFFECT_DEFS[eff.name];
    if (seDef) targetSaveMod += seDef.saveModifier;
    // Additional DEX/STR save modifiers from mechanics
    const mech = STATUS_EFFECT_MECHANICS[eff.name];
    if (mech) {
      if (saveType === 'dex') targetSaveMod += mech.dexSaveMod;
      if (saveType === 'str') targetSaveMod += mech.strSaveMod;
    }
  }
  const save = savingThrow(targetSaveMod, dc);

  // Check legendary resistance
  const lr = checkLegendaryResistance(state, target.id, save, dc);
  if (lr.overridden) {
    save.success = true;
    state = lr.state;
  }

  return {
    result: { dc, saveType, save: { roll: save.roll, total: save.total, success: save.success } },
    state,
  };
}

/** teleport_attack: Blink Strike — teleport to target and attack with spell attack (INT) */
const handleTeleportAttack: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const damageBonus = (effects.damageBonus as string);

  // Use resolveAbilityAttackRoll — Blink Strike has attackType: 'spell' on the definition
  // which will use INT (psion's primary stat) instead of weapon's attack stat
  const atkResult = resolveAbilityAttackRoll(actor, target, abilityDef, effects);
  const hpBefore = target.currentHp;

  if (atkResult && !atkResult.hit) {
    return {
      state,
      result: {
        damage: 0,
        targetHpAfter: target.currentHp,
        targetKilled: false,
        targetHpBefore: hpBefore,
        attackRoll: atkResult.d20,
        attackTotal: atkResult.total,
        attackModifiers: atkResult.modifiers,
        targetAC: atkResult.targetAC,
        hit: false,
        isCritical: false,
        description: `${abilityDef.name}: teleported to ${target.name} but missed`,
      },
    };
  }

  const isCrit = atkResult?.isCrit ?? false;

  // Weapon damage + bonus damage (with detailed breakdown)
  let totalDamage = 0;
  let weaponDiceStr: string | undefined;
  const allDmgRolls: number[] = [];
  const dmgModifiers: { source: string; value: number }[] = [];

  if (actor.weapon) {
    const dmgStatMod = getModifier(actor.stats[actor.weapon.damageModifierStat]);
    const critMult = isCrit ? 2 : 1;
    const wepDetailed = rollDiceDetailed(actor.weapon.diceCount * critMult, actor.weapon.diceSides);
    totalDamage += Math.max(0, wepDetailed.total + dmgStatMod + actor.weapon.bonusDamage);
    weaponDiceStr = `${actor.weapon.diceCount * critMult}d${actor.weapon.diceSides}`;
    allDmgRolls.push(...wepDetailed.rolls);
    if (dmgStatMod !== 0) dmgModifiers.push({ source: actor.weapon.damageModifierStat.toUpperCase(), value: dmgStatMod });
    if (actor.weapon.bonusDamage !== 0) dmgModifiers.push({ source: 'weapon bonus', value: actor.weapon.bonusDamage });
  }
  // Add INT modifier as bonus damage if damageBonus is 'int'
  if (damageBonus) {
    const bonusMod = getModifier(actor.stats[damageBonus as keyof typeof actor.stats] ?? 10);
    const bonusVal = Math.max(0, bonusMod);
    totalDamage += bonusVal;
    if (bonusVal > 0) dmgModifiers.push({ source: `${damageBonus.toUpperCase()} bonus`, value: bonusVal });
  }
  totalDamage = Math.max(0, totalDamage);

  const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
  const killed = newHp <= 0;
  state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

  return {
    state,
    result: {
      damage: totalDamage,
      targetHpAfter: newHp,
      targetKilled: killed,
      targetHpBefore: hpBefore,
      ...(atkResult ? { attackRoll: atkResult.d20, attackTotal: atkResult.total, attackModifiers: atkResult.modifiers, targetAC: atkResult.targetAC } : {}),
      hit: true,
      isCritical: isCrit,
      weaponDice: weaponDiceStr,
      damageRolls: allDmgRolls,
      damageModifiers: dmgModifiers,
      damageType: abilityDef.damageType ?? actor.weapon?.damageType,
      description: `${abilityDef.name}: teleported and struck ${target.name} for ${totalDamage} damage${isCrit ? ' CRITICAL' : ''}`,
    },
  };
};

/** control: Dominate — target saves or is stunned (domination = stun in combat) */
const handleControl: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const saveType = (effects.saveType as string) ?? 'wis';
  const savePenalty = (effects.savePenalty as number) ?? 0;
  const controlDuration = (effects.controlDuration as number) ?? 1;
  const failEffect = (effects.failEffect as string);
  const failDuration = (effects.failDuration as number) ?? 2;

  const dc = calculateSaveDC(actor) + Math.abs(savePenalty);
  const targetSaveMod = getModifier(target.stats[saveType as keyof typeof target.stats] ?? 10);
  const save = savingThrow(targetSaveMod, dc);
  { const lr = checkLegendaryResistance(state, target.id, save, dc); if (lr.overridden) { save.success = true; state = lr.state; } }

  if (save.success) {
    // On save: apply weaker effect if specified, otherwise nothing
    if (failEffect) {
      const mapped = mapStatusName(failEffect);
      state = applyStatusEffectToState(state, target.id, mapped, failDuration, actor.id);
      return {
        state,
        result: {
          saveRequired: true,
          saveDC: dc,
          saveRoll: save.roll,
          saveTotal: save.total,
          saveSucceeded: true,
          statusApplied: mapped,
          statusDuration: failDuration,
          description: `${abilityDef.name}: ${target.name} resisted (${save.total} vs DC ${dc}) but ${mapped} for ${failDuration} rounds`,
        },
      };
    }
    return {
      state,
      result: {
        saveRequired: true,
        saveDC: dc,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: true,
        description: `${abilityDef.name}: ${target.name} resisted (${save.total} vs DC ${dc})`,
      },
    };
  }

  // Failed save: apply domination as stunned
  state = applyStatusEffectToState(state, target.id, 'stunned', controlDuration, actor.id);

  // Apply fail damage if defined (Absolute Dominion)
  let failDmg = 0;
  const failDamage = effects.failDamage as { diceCount?: number; diceSides?: number } | undefined;
  if (failDamage?.diceCount && failDamage?.diceSides) {
    failDmg = rollDice(failDamage.diceCount, failDamage.diceSides);
    const newHp = clampHp(target.currentHp - failDmg, target.maxHp);
    const killed = newHp <= 0;
    state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });
    return {
      state,
      result: {
        saveRequired: true,
        saveDC: dc,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: false,
        statusApplied: 'stunned',
        statusDuration: controlDuration,
        damage: failDmg,
        targetHpAfter: newHp,
        targetKilled: killed,
        description: `${abilityDef.name}: dominated ${target.name} for ${controlDuration} rounds + ${failDmg} damage (${save.total} vs DC ${dc})`,
      },
    };
  }

  return {
    state,
    result: {
      saveRequired: true,
      saveDC: dc,
      saveRoll: save.roll,
      saveTotal: save.total,
      saveSucceeded: false,
      statusApplied: 'stunned',
      statusDuration: controlDuration,
      description: `${abilityDef.name}: dominated ${target.name} for ${controlDuration} rounds (${save.total} vs DC ${dc})`,
    },
  };
};

/** aoe_damage_status: Mind Shatter / Rift Walk — AoE damage + status to all enemies */
const handleAoeDamageStatus: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  if (enemies.length === 0) {
    return { state, result: { description: `${abilityDef.name}: no targets` } };
  }

  const diceCount = (effects.diceCount as number) ?? 2;
  const diceSides = (effects.diceSides as number) ?? 6;
  const damageBonus = (effects.damageBonus as string);
  const statusEffect = mapStatusName((effects.statusEffect as string) ?? 'weakened');
  const statusDuration = (effects.statusDuration as number) ?? 2;
  const saveType = (effects.saveType as string) ?? 'wis';
  const halfDamageOnSave = (effects.halfDamageOnSave as boolean) ?? false;

  const dc = calculateSaveDC(actor);
  const bonusMod = damageBonus ? Math.max(0, getModifier(actor.stats[damageBonus as keyof typeof actor.stats] ?? 10)) : 0;

  const perTargetResults: ClassAbilityResult['perTargetResults'] = [];
  let totalDamage = 0;
  const targetIds: string[] = [];

  for (const enemy of enemies) {
    let dmg = rollDice(diceCount, diceSides, bonusMod);
    const targetSaveMod = getModifier(enemy.stats[saveType as keyof typeof enemy.stats] ?? 10);
    const save = savingThrow(targetSaveMod, dc);
    { const lr = checkLegendaryResistance(state, enemy.id, save, dc); if (lr.overridden) { save.success = true; state = lr.state; } }

    let statusApplied: string | undefined;
    if (save.success && halfDamageOnSave) {
      dmg = Math.floor(dmg / 2);
      // No status on save
    } else if (save.success) {
      dmg = 0;
    } else {
      // Failed save: full damage + status
      state = applyStatusEffectToState(state, enemy.id, statusEffect, statusDuration, actor.id);
      statusApplied = statusEffect;
    }

    dmg = Math.max(0, dmg);
    const target = state.combatants.find(c => c.id === enemy.id)!;
    const newHp = clampHp(target.currentHp - dmg, target.maxHp);
    const killed = newHp <= 0;
    state = updateCombatant(state, enemy.id, { currentHp: newHp, isAlive: !killed });
    totalDamage += dmg;
    targetIds.push(enemy.id);

    perTargetResults.push({
      targetId: enemy.id,
      targetName: enemy.name,
      damage: dmg,
      statusApplied,
      hpAfter: newHp,
      killed,
    });
  }

  return {
    state,
    result: {
      targetIds,
      damage: totalDamage,
      saveRequired: true,
      saveDC: dc,
      statusApplied: statusEffect,
      statusDuration,
      perTargetResults,
      description: `${abilityDef.name}: ${totalDamage} damage + ${statusEffect}(${statusDuration}) to ${enemies.length} targets (DC ${dc})`,
    },
  };
};

/** reaction: Precognitive Dodge — grant self AC buff (simulate precognitive defense) */
const handleReaction: EffectHandler = (state, actor, _target, _enemies, abilityDef, effects) => {
  const usesPerCombat = (effects.usesPerCombat as number) ?? 1;
  const acBonus = 4; // simulate dodging: significant AC boost for 1 round

  // Check if already used this combat (tracked via cooldowns — reaction abilities have cd:1)
  const buff: ActiveBuff = {
    sourceAbilityId: abilityDef.id,
    name: abilityDef.name,
    roundsRemaining: 1,
    acMod: acBonus,
    damageReduction: 0.5, // 50% damage reduction simulates negating an attack
  };

  const currentBuffs = actor.activeBuffs ?? [];
  const filtered = currentBuffs.filter(b => b.sourceAbilityId !== abilityDef.id);
  state = updateCombatant(state, actor.id, { activeBuffs: [...filtered, buff] });

  return {
    state,
    result: {
      buffApplied: abilityDef.name,
      buffDuration: 1,
      description: `${abilityDef.name}: precognitive defense (+${acBonus} AC, 50% DR for 1 round)`,
    },
  };
};

/** phase: Dimensional Pocket — become untargetable (stealth buff) with advantage on return */
const handlePhase: EffectHandler = (state, actor, _target, _enemies, abilityDef, effects) => {
  const duration = (effects.duration as number) ?? 1;

  const buff: ActiveBuff = {
    sourceAbilityId: abilityDef.id,
    name: abilityDef.name,
    roundsRemaining: duration,
    stealthed: true,
    acMod: 5, // phased out = very hard to hit
  };

  const currentBuffs = actor.activeBuffs ?? [];
  const filtered = currentBuffs.filter(b => b.sourceAbilityId !== abilityDef.id);
  state = updateCombatant(state, actor.id, { activeBuffs: [...filtered, buff] });

  // Grant advantage on return (attack bonus for next round)
  if (effects.advantageOnReturn) {
    const returnBuff: ActiveBuff = {
      sourceAbilityId: `${abilityDef.id}-return`,
      name: `${abilityDef.name} (return)`,
      roundsRemaining: duration + 1,
      attackMod: 4, // simulate advantage
    };
    state = updateCombatant(state, actor.id, {
      activeBuffs: [...(state.combatants.find(c => c.id === actor.id)!.activeBuffs ?? []), returnBuff],
    });
  }

  return {
    state,
    result: {
      buffApplied: abilityDef.name,
      buffDuration: duration,
      description: `${abilityDef.name}: phased out for ${duration} round${duration > 1 ? 's' : ''} (untargetable)${effects.advantageOnReturn ? ', advantage on return' : ''}`,
    },
  };
};

/** swap: Translocation — in 1v1, apply disoriented debuff (stunned) + damage on fail */
const handleSwap: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const saveType = (effects.saveType as string) ?? 'int';
  const enemyEffect = (effects.enemyEffect as string) ?? 'lose_action';

  const dc = calculateSaveDC(actor);
  const targetSaveMod = getModifier(target.stats[saveType as keyof typeof target.stats] ?? 10);
  const save = savingThrow(targetSaveMod, dc);
  { const lr = checkLegendaryResistance(state, target.id, save, dc); if (lr.overridden) { save.success = true; state = lr.state; } }

  if (save.success) {
    return {
      state,
      result: {
        saveRequired: true,
        saveDC: dc,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: true,
        description: `${abilityDef.name}: ${target.name} resisted translocation (${save.total} vs DC ${dc})`,
      },
    };
  }

  // Failed save: target loses action (stunned for 1 round)
  state = applyStatusEffectToState(state, target.id, 'stunned', 1, actor.id);

  return {
    state,
    result: {
      saveRequired: true,
      saveDC: dc,
      saveRoll: save.roll,
      saveTotal: save.total,
      saveSucceeded: false,
      statusApplied: 'stunned',
      statusDuration: 1,
      description: `${abilityDef.name}: translocated ${target.name}, disoriented for 1 round (${save.total} vs DC ${dc})`,
    },
  };
};

/** echo: Temporal Echo — repeat last action as a damage ability */
const handleEcho: EffectHandler = (state, actor, target, _enemies, abilityDef, _effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  // Resolve as a weapon attack (echoing the last action)
  let totalDamage = 0;
  if (actor.weapon) {
    const statMod = getModifier(actor.stats[actor.weapon.damageModifierStat]);
    const atkMod = statMod + actor.proficiencyBonus + actor.weapon.bonusAttack;
    const d20 = roll(20);
    const hit = d20 + atkMod >= target.ac || d20 === 20;
    const isCrit = d20 === 20;

    if (!hit) {
      return {
        state,
        result: {
          damage: 0,
          targetHpAfter: target.currentHp,
          targetKilled: false,
          description: `${abilityDef.name}: temporal echo missed ${target.name} (${d20}+${atkMod} vs AC ${target.ac})`,
        },
      };
    }

    totalDamage = rollDice(actor.weapon.diceCount * (isCrit ? 2 : 1), actor.weapon.diceSides, statMod + actor.weapon.bonusDamage);
  } else {
    // No weapon — deal INT-based psychic damage
    const intMod = getModifier(actor.stats.int);
    totalDamage = rollDice(2, 6, intMod);
  }

  totalDamage = Math.max(0, totalDamage);
  const newHp = clampHp(target.currentHp - totalDamage, target.maxHp);
  const killed = newHp <= 0;
  state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });

  return {
    state,
    result: {
      damage: totalDamage,
      targetHpAfter: newHp,
      targetKilled: killed,
      description: `${abilityDef.name}: echoed attack for ${totalDamage} damage to ${target.name}`,
    },
  };
};

/** banish: Banishment — target saves or is stunned for N rounds (removed from combat) */
const handleBanish: EffectHandler = (state, actor, target, _enemies, abilityDef, effects) => {
  if (!target || !target.isAlive) {
    return { state, result: { description: `${abilityDef.name}: no valid target` } };
  }

  const saveType = (effects.saveType as string) ?? 'int';
  const savePenalty = (effects.savePenalty as number) ?? 0;
  const banishDuration = (effects.banishDuration as number) ?? 3;
  const returnDamage = effects.returnDamage as { diceCount?: number; diceSides?: number } | undefined;
  const returnEffect = (effects.returnEffect as string);
  const returnDuration = (effects.returnDuration as number) ?? 1;
  const failDamage = effects.failDamage as { diceCount?: number; diceSides?: number } | undefined;
  const failEffect = (effects.failEffect as string);
  const failDuration = (effects.failDuration as number) ?? 1;

  const dc = calculateSaveDC(actor) + Math.abs(savePenalty);
  const targetSaveMod = getModifier(target.stats[saveType as keyof typeof target.stats] ?? 10);
  const save = savingThrow(targetSaveMod, dc);
  { const lr = checkLegendaryResistance(state, target.id, save, dc); if (lr.overridden) { save.success = true; state = lr.state; } }

  if (save.success) {
    // Reduced effect on save
    let dmg = 0;
    if (failDamage?.diceCount && failDamage?.diceSides) {
      dmg = rollDice(failDamage.diceCount, failDamage.diceSides);
    }
    if (dmg > 0) {
      const newHp = clampHp(target.currentHp - dmg, target.maxHp);
      const killed = newHp <= 0;
      state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });
      if (!killed && failEffect) {
        state = applyStatusEffectToState(state, target.id, mapStatusName(failEffect), failDuration, actor.id);
      }
      return {
        state,
        result: {
          saveRequired: true,
          saveDC: dc,
          saveRoll: save.roll,
          saveTotal: save.total,
          saveSucceeded: true,
          damage: dmg,
          targetHpAfter: newHp,
          targetKilled: killed,
          statusApplied: failEffect ? mapStatusName(failEffect) : undefined,
          statusDuration: failEffect ? failDuration : undefined,
          description: `${abilityDef.name}: ${target.name} resisted full banishment (${save.total} vs DC ${dc}), ${dmg} damage${failEffect ? ` + ${failEffect}` : ''}`,
        },
      };
    }
    return {
      state,
      result: {
        saveRequired: true,
        saveDC: dc,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: true,
        description: `${abilityDef.name}: ${target.name} resisted banishment (${save.total} vs DC ${dc})`,
      },
    };
  }

  // Failed save: banish = stunned for banishDuration
  state = applyStatusEffectToState(state, target.id, 'stunned', banishDuration, actor.id);

  // Apply return damage immediately (simplified — in combat the target is stunned the whole time)
  let returnDmg = 0;
  if (returnDamage?.diceCount && returnDamage?.diceSides) {
    returnDmg = rollDice(returnDamage.diceCount, returnDamage.diceSides);
    const newHp = clampHp(target.currentHp - returnDmg, target.maxHp);
    const killed = newHp <= 0;
    state = updateCombatant(state, target.id, { currentHp: newHp, isAlive: !killed });
    if (!killed && returnEffect) {
      state = applyStatusEffectToState(state, target.id, mapStatusName(returnEffect), returnDuration, actor.id);
    }
    return {
      state,
      result: {
        saveRequired: true,
        saveDC: dc,
        saveRoll: save.roll,
        saveTotal: save.total,
        saveSucceeded: false,
        statusApplied: 'stunned',
        statusDuration: banishDuration,
        damage: returnDmg,
        targetHpAfter: clampHp(target.currentHp - returnDmg, target.maxHp),
        targetKilled: clampHp(target.currentHp - returnDmg, target.maxHp) <= 0,
        description: `${abilityDef.name}: banished ${target.name} for ${banishDuration} rounds! ${returnDmg} damage on return (${save.total} vs DC ${dc})`,
      },
    };
  }

  return {
    state,
    result: {
      saveRequired: true,
      saveDC: dc,
      saveRoll: save.roll,
      saveTotal: save.total,
      saveSucceeded: false,
      statusApplied: 'stunned',
      statusDuration: banishDuration,
      description: `${abilityDef.name}: banished ${target.name} for ${banishDuration} rounds (${save.total} vs DC ${dc})`,
    },
  };
};

// ---- Effect Handler Map ----

const EFFECT_HANDLERS: Record<string, EffectHandler> = {
  damage: handleDamage,
  buff: handleBuff,
  debuff: handleDebuff,
  heal: handleHeal,
  passive: handlePassive,
  status: handleStatus,
  damage_status: handleDamageStatus,
  damage_debuff: handleDamageDebuff,
  drain: handleDrain,
  hot: handleHot,
  cleanse: handleCleanse,
  flee: handleFleeAbility,
  aoe_debuff: handleAoeDebuff,
  // Phase 2 handlers
  aoe_damage: handleAoeDamage,
  multi_target: handleMultiTarget,
  multi_attack: handleMultiAttack,
  aoe_drain: handleAoeDrain,
  dispel_damage: handleDispelDamage,
  aoe_dot: handleAoeDot,
  delayed_damage: handleDelayedDamage,
  // Phase 3 handlers
  steal: handleSteal,
  damage_steal: handleDamageSteal,
  companion_attack: handleCompanionAttack,
  special: handleSpecial,
  counter: handleCounter,
  trap: handleTrap,
  summon: handleSummon,
  // Psion handlers
  teleport_attack: handleTeleportAttack,
  control: handleControl,
  aoe_damage_status: handleAoeDamageStatus,
  reaction: handleReaction,
  phase: handlePhase,
  swap: handleSwap,
  echo: handleEcho,
  banish: handleBanish,
};

// ---- Status Name Mapping ----

/** Map ability data status names to engine StatusEffectName */
function mapStatusName(name: string): StatusEffectName {
  const mapping: Record<string, StatusEffectName> = {
    stun: 'stunned',
    stunned: 'stunned',
    slow: 'slowed',
    slowed: 'slowed',
    poison: 'poisoned',
    poisoned: 'poisoned',
    burn: 'burning',
    burning: 'burning',
    freeze: 'frozen',
    frozen: 'frozen',
    blind: 'blinded',
    blinded: 'blinded',
    weak: 'weakened',
    weakened: 'weakened',
    taunt: 'taunt',
    silence: 'silence',
    root: 'root',
    skip_turn: 'skip_turn',
    mesmerize: 'mesmerize',
    polymorph: 'polymorph',
  };
  return mapping[name] ?? (name as StatusEffectName);
}

// ---- Status Effect Application Wrapper ----

function applyStatusEffectToState(
  state: CombatState,
  targetId: string,
  effectName: StatusEffectName,
  duration: number,
  sourceId: string,
  damagePerRound?: number,
): CombatState {
  const target = state.combatants.find(c => c.id === targetId);
  if (!target) return state;

  const updated = applyStatusEffect(target, effectName, duration, sourceId, damagePerRound);
  return updateCombatant(state, targetId, {
    statusEffects: updated.statusEffects,
  });
}

// ---- Passive Application ----

/**
 * Apply passive abilities at combat start.
 * Called when building combatants for tick resolution or simulation.
 */
export function applyPassiveAbilities(combatant: Combatant, unlockedAbilityIds: string[]): Combatant {
  let result = { ...combatant };
  const usesTracker: Record<string, number> = {};

  for (const abilityId of unlockedAbilityIds) {
    const def = abilityMap.get(abilityId);
    if (!def) continue;
    const effects = def.effects as Record<string, any>;
    if (effects.type !== 'passive') continue;

    // Bonus HP from CON
    if (effects.bonusHpFromCon) {
      const conMod = getModifier(result.stats.con);
      const bonusHp = Math.floor(conMod * (effects.bonusHpFromCon as number) / 100 * result.maxHp);
      result = { ...result, maxHp: result.maxHp + bonusHp, currentHp: result.currentHp + bonusHp };
    }

    // Permanent HP regen (as a buff)
    if (effects.hpRegenPerRound) {
      const buffs = result.activeBuffs ?? [];
      buffs.push({
        sourceAbilityId: abilityId,
        name: def.name,
        roundsRemaining: 999, // permanent
        hotPerRound: effects.hpRegenPerRound as number,
      });
      result = { ...result, activeBuffs: buffs };
    }

    // Death prevention (1x per combat)
    if (effects.cheatingDeath || effects.reviveOnDeath) {
      usesTracker[abilityId] = 0;
    }

    // Cooldown reduction passive (Arcane Mastery = 0.3, Spell Weaver = 1)
    if (effects.cooldownReduction != null) {
      const val = effects.cooldownReduction as number;
      if (val < 1) {
        // Percentage reduction (e.g., 0.3 = 30%)
        result = { ...result, cooldownReductionPercent: (result.cooldownReductionPercent ?? 0) + val };
      } else {
        // Flat reduction (e.g., 1 = 1 round less)
        result = { ...result, cooldownReductionFlat: (result.cooldownReductionFlat ?? 0) + val };
      }
    }

    // PASSIVE-1: Crit chance bonus (consumed in resolveAttack crit check)
    if (effects.critChanceBonus) {
      result = { ...result, critChanceBonus: (result.critChanceBonus ?? 0) + (effects.critChanceBonus as number) };
    }

    // PASSIVE-2: Accuracy bonus as permanent buff (auto-consumed by getBuffAttackMod)
    if (effects.accuracyBonus && effects.type === 'passive') {
      const buffs = result.activeBuffs ?? [];
      buffs.push({
        sourceAbilityId: abilityId,
        name: def.name,
        roundsRemaining: 999,
        attackMod: effects.accuracyBonus as number,
      });
      result = { ...result, activeBuffs: buffs };
    }

    // PASSIVE-3: First attack in combat is an auto-crit
    if (effects.firstStrikeCrit) {
      result = { ...result, firstStrikeCrit: true, hasAttackedThisCombat: false };
    }

    // PASSIVE-4: Permanent companion (never expires, immune to interception damage)
    if (effects.permanentCompanion) {
      result = { ...result, permanentCompanion: true, companionImmune: !!effects.companionImmune };
    }

    // PASSIVE-5: Stacking damage per round
    if (effects.stackingDamagePerRound) {
      result = { ...result, stackingDamagePerRound: effects.stackingDamagePerRound as number, roundDamageBonus: 0 };
    }

    // PASSIVE-6: Advantage vs low HP targets
    if (effects.advantageVsLowHp) {
      result = {
        ...result,
        advantageVsLowHp: true,
        advantageHpThreshold: (effects.advantageHpThreshold as number) ?? 50,
      };
    }

    // MECH-6: Holy damage bonus multiplier
    if (effects.holyDamageBonus) {
      result = { ...result, holyDamageBonus: effects.holyDamageBonus as number };
    }

    // MECH-8: Anti-heal aura
    if (effects.antiHealAura) {
      result = { ...result, antiHealAura: true };
    }

    // MECH-3: Charm effectiveness multiplier
    if (effects.charmEffectiveness) {
      result = { ...result, charmEffectiveness: effects.charmEffectiveness as number };
    }

    // PSION-PASSIVE-1: Thought Shield — psychic resistance + mental save bonus
    if (effects.psychicResistance) {
      result = { ...result, psychicResistance: true };
    }
    if (effects.mentalSaveBonus) {
      result = { ...result, mentalSaveBonus: (result.mentalSaveBonus ?? 0) + (effects.mentalSaveBonus as number) };
    }

    // PSION-PASSIVE-2: Danger Sense — initiative bonus + cannot be surprised
    if (effects.initiativeBonus) {
      result = { ...result, initiativeBonus: (result.initiativeBonus ?? 0) + (effects.initiativeBonus as number) };
    }
    if (effects.cannotBeSurprised) {
      result = { ...result, cannotBeSurprised: true };
    }

    // PSION-PASSIVE-3: Third Eye — see invisible, immune to blinded, trap detection
    if (effects.seeInvisible) {
      result = { ...result, seeInvisible: true };
    }
    if (effects.immuneBlinded) {
      result = { ...result, immuneBlinded: true };
    }
    if (effects.trapDetectionBonus) {
      result = { ...result, trapDetectionBonus: (result.trapDetectionBonus ?? 0) + (effects.trapDetectionBonus as number) };
    }

    // PSION-PASSIVE-4: Phase Step — free disengage (no opportunity attacks)
    if (effects.freeDisengage) {
      result = { ...result, freeDisengage: true };
    }

    // Dodge bonus (stored as passive buff)
    if (effects.dodgeBonus) {
      const buffs = result.activeBuffs ?? [];
      buffs.push({
        sourceAbilityId: abilityId,
        name: def.name,
        roundsRemaining: 999,
        dodgeMod: effects.dodgeBonus as number,
      });
      result = { ...result, activeBuffs: buffs };
    }
  }

  result = { ...result, abilityUsesThisCombat: usesTracker };
  return result;
}

// ---- Cooldown Tick ----

/**
 * Decrement all ability cooldowns by 1 at the start of a combatant's turn.
 */
export function tickAbilityCooldowns(combatant: Combatant): Combatant {
  const cooldowns = combatant.abilityCooldowns;
  if (!cooldowns || Object.keys(cooldowns).length === 0) return combatant;

  const updated: Record<string, number> = {};
  for (const [id, remaining] of Object.entries(cooldowns)) {
    if (remaining > 1) {
      updated[id] = remaining - 1;
    }
    // Remove entries that hit 0
  }
  return { ...combatant, abilityCooldowns: updated };
}

// ---- Buff Tick ----

/**
 * Process active buff ticks at the start of a combatant's turn.
 * Decrements durations, removes expired buffs, applies HoT.
 */
export function tickActiveBuffs(
  combatant: Combatant,
  enemies?: Combatant[],
): { combatant: Combatant; hotHealing: number; companionDamageDealt?: { targetId: string; damage: number } } {
  const buffs = combatant.activeBuffs;
  if (!buffs || buffs.length === 0) return { combatant, hotHealing: 0 };

  let totalHot = 0;
  let companionResult: { targetId: string; damage: number } | undefined;
  const remaining: ActiveBuff[] = [];

  // Phase 5B MECH-8: Check if any enemy has anti-heal aura
  const hasAntiHeal = (enemies ?? []).some(e => e.antiHealAura);

  for (const buff of buffs) {
    if (buff.roundsRemaining <= 0) continue; // expired

    // Apply HoT (blocked by anti-heal aura)
    if (buff.hotPerRound && buff.hotPerRound > 0 && !hasAntiHeal) {
      totalHot += buff.hotPerRound;
    }

    // Companion auto-damage: pick random alive enemy
    if (buff.companionDamage && buff.companionDamage > 0 && !companionResult) {
      const aliveEnemies = (enemies ?? []).filter(e => e.isAlive && !e.hasFled);
      if (aliveEnemies.length > 0) {
        const targetEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        companionResult = { targetId: targetEnemy.id, damage: buff.companionDamage };
      }
    }

    // Phase 5B PASSIVE-4: Skip duration decrement for permanent companions
    if (buff.companionHp != null && combatant.permanentCompanion) {
      remaining.push(buff); // Never expires
      continue;
    }

    // Decrement (permanent buffs at 999 don't functionally expire)
    const newRounds = buff.roundsRemaining - 1;
    if (newRounds > 0) {
      remaining.push({ ...buff, roundsRemaining: newRounds });
    }
    // If 0, buff expires and is removed
  }

  let newHp = combatant.currentHp;
  if (totalHot > 0) {
    newHp = clampHp(combatant.currentHp + totalHot, combatant.maxHp);
  }

  return {
    combatant: { ...combatant, activeBuffs: remaining, currentHp: newHp },
    hotHealing: totalHot,
    companionDamageDealt: companionResult,
  };
}

// ---- Delayed Effect Tick ----

export interface DelayedDetonation {
  sourceAbilityId: string;
  sourceAbilityName: string;
  sourceActorId: string;
  targetId: string;
  damage: number;
  hpAfter: number;
  killed: boolean;
}

/**
 * Tick delayed effects at the start of a combatant's turn.
 * Decrements roundsRemaining; when it hits 0, detonates for damage.
 */
export function tickDelayedEffects(
  state: CombatState,
  combatant: Combatant,
): { state: CombatState; combatant: Combatant; detonations: DelayedDetonation[] } {
  const effects = combatant.delayedEffects;
  if (!effects || effects.length === 0) {
    return { state, combatant, detonations: [] };
  }

  const remaining: DelayedEffect[] = [];
  const detonations: DelayedDetonation[] = [];
  let updatedCombatant = { ...combatant };

  for (const effect of effects) {
    const newRounds = effect.roundsRemaining - 1;
    if (newRounds > 0) {
      remaining.push({ ...effect, roundsRemaining: newRounds });
    } else {
      // Detonate!
      const damage = rollDice(effect.diceCount, effect.diceSides);
      const hpAfter = clampHp(updatedCombatant.currentHp - damage, updatedCombatant.maxHp);
      const killed = hpAfter <= 0;

      updatedCombatant = {
        ...updatedCombatant,
        currentHp: hpAfter,
        isAlive: !killed,
      };

      detonations.push({
        sourceAbilityId: effect.sourceAbilityId,
        sourceAbilityName: effect.sourceAbilityName,
        sourceActorId: effect.sourceActorId,
        targetId: combatant.id,
        damage,
        hpAfter,
        killed,
      });
    }
  }

  updatedCombatant = { ...updatedCombatant, delayedEffects: remaining };
  state = updateCombatant(state, combatant.id, updatedCombatant);

  return { state, combatant: updatedCombatant, detonations };
}

// ---- Death Prevention Check ----

/**
 * Check if a combatant has an unused death prevention passive.
 * Called when HP drops to 0.
 */
export function checkDeathPrevention(combatant: Combatant, unlockedAbilityIds: string[]): {
  prevented: boolean;
  abilityId: string;
  abilityName: string;
  revivedHp: number;
} | null {
  for (const abilityId of unlockedAbilityIds) {
    const def = abilityMap.get(abilityId);
    if (!def) continue;
    const effects = def.effects as Record<string, any>;
    if (effects.type !== 'passive') continue;
    if (!effects.cheatingDeath && !effects.reviveOnDeath) continue;

    const uses = combatant.abilityUsesThisCombat?.[abilityId] ?? 0;
    const maxUses = (effects.usesPerCombat as number) ?? 1;
    if (uses >= maxUses) continue;

    const revivePercent = (effects.reviveHpPercent as number) ?? 1;
    const revivedHp = Math.max(1, Math.floor(combatant.maxHp * (revivePercent / 100)));

    return { prevented: true, abilityId, abilityName: def.name, revivedHp };
  }
  return null;
}

// ---- Main Resolver ----

/**
 * Resolve a class ability action. Data-driven: looks up the ability definition
 * and dispatches to the appropriate effect handler.
 */
export function resolveClassAbility(
  state: CombatState,
  actorId: string,
  abilityId: string,
  targetId?: string,
  targetIds?: string[],
): { state: CombatState; result: ClassAbilityResult } {
  const actor = state.combatants.find(c => c.id === actorId);
  if (!actor) {
    return {
      state,
      result: {
        type: 'class_ability',
        actorId,
        abilityId,
        abilityName: 'Unknown',
        effectType: 'unknown',
        description: 'Actor not found',
      },
    };
  }

  const abilityDef = abilityMap.get(abilityId);
  if (!abilityDef) {
    return {
      state,
      result: {
        type: 'class_ability',
        actorId,
        abilityId,
        abilityName: 'Unknown',
        effectType: 'unknown',
        description: `Unknown ability ID: ${abilityId}`,
        fallbackToAttack: true,
      },
    };
  }

  const effects = abilityDef.effects as Record<string, any>;
  const effectType = (effects.type as string) ?? 'unknown';

  // Check cooldown
  const cooldownRemaining = actor.abilityCooldowns?.[abilityId] ?? 0;
  if (cooldownRemaining > 0) {
    return {
      state,
      result: {
        type: 'class_ability',
        actorId,
        abilityId,
        abilityName: abilityDef.name,
        effectType,
        description: `${abilityDef.name} is on cooldown (${cooldownRemaining} rounds remaining)`,
        fallbackToAttack: true,
      },
    };
  }

  // Check silence — prevents ability use (still allows basic attack)
  const isSilenced = actor.statusEffects.some(e => e.name === 'silence');
  if (isSilenced && effectType !== 'damage' && effectType !== 'passive') {
    return {
      state,
      result: {
        type: 'class_ability',
        actorId,
        abilityId,
        abilityName: abilityDef.name,
        effectType,
        description: `${abilityDef.name}: silenced, cannot use abilities`,
        fallbackToAttack: true,
      },
    };
  }

  // Check polymorph — prevents ability use
  const isPolymorphed = actor.statusEffects.some(e => e.name === 'polymorph');
  if (isPolymorphed) {
    return {
      state,
      result: {
        type: 'class_ability',
        actorId,
        abilityId,
        abilityName: abilityDef.name,
        effectType,
        description: `${abilityDef.name}: polymorphed, cannot use abilities`,
        fallbackToAttack: true,
      },
    };
  }

  // Slowed/restrained blocks multiattack abilities (multi_target, multi_attack)
  const multiattackTypes = ['multi_target', 'multi_attack'];
  if (multiattackTypes.includes(effectType)) {
    const blocksMulti = actor.statusEffects.some(e => {
      const mech = STATUS_EFFECT_MECHANICS[e.name];
      return mech?.blocksMultiattack;
    });
    if (blocksMulti) {
      return {
        state,
        result: {
          type: 'class_ability',
          actorId,
          abilityId,
          abilityName: abilityDef.name,
          effectType,
          description: `${abilityDef.name}: too slow to use multiattack`,
          fallbackToAttack: true,
        },
      };
    }
  }

  // Root blocks movement-based abilities (Vanish, Blink Strike, Disengage, etc.)
  if (effects.requiresMovement || effectType === 'flee' || effectType === 'teleport_attack') {
    const blocksMovement = actor.statusEffects.some(e => {
      const mech = STATUS_EFFECT_MECHANICS[e.name];
      return mech?.blocksMovementAbilities;
    });
    if (blocksMovement) {
      return {
        state,
        result: {
          type: 'class_ability',
          actorId,
          abilityId,
          abilityName: abilityDef.name,
          effectType,
          description: `${abilityDef.name}: cannot use movement abilities while rooted`,
          fallbackToAttack: true,
        },
      };
    }
  }

  // Get handler
  const handler = EFFECT_HANDLERS[effectType];
  if (!handler) {
    // Unimplemented effect type — log and fallback
    console.warn(`[class-ability-resolver] Ability "${abilityDef.name}" uses effect type "${effectType}" which is not yet implemented`);
    // Set cooldown even on failure to prevent infinite retries of the same unimplemented ability
    let failState = state;
    const cd = abilityDef.cooldown || 1;
    const actorNow = failState.combatants.find(c => c.id === actorId);
    if (actorNow) {
      failState = updateCombatant(failState, actorId, {
        abilityCooldowns: { ...(actorNow.abilityCooldowns ?? {}), [abilityId]: cd },
      });
    }
    return {
      state: failState,
      result: {
        type: 'class_ability',
        actorId,
        abilityId,
        abilityName: abilityDef.name,
        effectType,
        description: `${abilityDef.name}: effect type "${effectType}" not yet implemented — falling back to attack`,
        fallbackToAttack: true,
      },
    };
  }

  // Resolve target
  const target = getTarget(state, targetId);
  const enemies = getEnemies(state, actor);

  // Execute handler
  const { state: newState, result: partialResult } = handler(state, actor, target, enemies, abilityDef, effects);

  // Set cooldown (with passive reduction applied)
  let finalState = newState;
  if (abilityDef.cooldown > 0) {
    const updatedActor = finalState.combatants.find(c => c.id === actorId);
    if (updatedActor) {
      let cd = abilityDef.cooldown;
      // Apply flat reduction first (Spell Weaver mag-enc-6: -1)
      if (updatedActor.cooldownReductionFlat) {
        cd = Math.max(0, cd - updatedActor.cooldownReductionFlat);
      }
      // Apply percentage reduction (Arcane Mastery mag-ele-6: 30%)
      if (updatedActor.cooldownReductionPercent) {
        cd = Math.max(0, Math.floor(cd * (1 - updatedActor.cooldownReductionPercent)));
      }
      // Phase 5B MECH-2: nextCooldownHalved — halve this cooldown and consume the flag
      const halveBuff = updatedActor.activeBuffs?.find(b => b.nextCooldownHalved === true);
      if (halveBuff) {
        cd = Math.max(0, Math.floor(cd / 2));
        finalState = updateCombatant(finalState, actorId, {
          activeBuffs: (updatedActor.activeBuffs ?? []).map(b =>
            b === halveBuff ? { ...b, nextCooldownHalved: false } : b
          ),
        });
      }
      if (cd > 0) {
        const actorNow = finalState.combatants.find(c => c.id === actorId)!;
        finalState = updateCombatant(finalState, actorId, {
          abilityCooldowns: { ...(actorNow.abilityCooldowns ?? {}), [abilityId]: cd },
        });
      }
    }
  }

  // Setup tag chaining: grant tag when setup ability fires
  if (abilityDef.grantsSetupTag) {
    const actorNow = finalState.combatants.find(c => c.id === actorId)!;
    const tags = actorNow.setupTags ?? [];
    if (!tags.includes(abilityDef.grantsSetupTag)) {
      finalState = updateCombatant(finalState, actorId, {
        setupTags: [...tags, abilityDef.grantsSetupTag],
      });
    }
  }

  // Setup tag chaining: consume tag when payoff ability fires
  if (abilityDef.consumesSetupTag && abilityDef.requiresSetupTag) {
    const actorNow = finalState.combatants.find(c => c.id === actorId)!;
    const tags = actorNow.setupTags ?? [];
    finalState = updateCombatant(finalState, actorId, {
      setupTags: tags.filter(t => t !== abilityDef.requiresSetupTag),
    });
  }

  const result: ClassAbilityResult = {
    type: 'class_ability',
    actorId,
    abilityId,
    abilityName: abilityDef.name,
    effectType,
    targetId: targetId,
    ...partialResult,
    description: partialResult.description ?? abilityDef.name,
  };

  return { state: finalState, result };
}

// ---- Buff Modifier Queries ----

/** Get total attack modifier from active buffs */
export function getBuffAttackMod(combatant: Combatant): number {
  let total = 0;
  for (const b of combatant.activeBuffs ?? []) {
    total += b.attackMod ?? 0;
    // Phase 5B MECH-4: Dynamic scaling based on missing HP percent
    if (b.scalingType === 'missingHpPercent' && b.scalingMax) {
      const missingPct = 1 - (combatant.currentHp / combatant.maxHp);
      total += Math.min(b.scalingMax, Math.floor(missingPct * b.scalingMax));
    }
    // Phase 5B MECH-11: Stacking attack speed bonus
    if (b.stackingAttackSpeedStacks != null && b.stackingAttackSpeedStacks > 0) {
      total += b.stackingAttackSpeedStacks * 2;
    }
  }
  return total;
}

/** Get total AC modifier from active buffs */
export function getBuffAcMod(combatant: Combatant): number {
  return (combatant.activeBuffs ?? []).reduce((sum, b) => sum + (b.acMod ?? 0), 0);
}

/** Get total damage modifier from active buffs */
export function getBuffDamageMod(combatant: Combatant): number {
  const buffMod = (combatant.activeBuffs ?? []).reduce((sum, b) => sum + (b.damageMod ?? 0), 0);
  // Phase 5B PASSIVE-5: Add stacking round damage bonus
  const roundBonus = combatant.roundDamageBonus ?? 0;
  return buffMod + roundBonus;
}

/** Get total damage absorption remaining */
export function getBuffAbsorption(combatant: Combatant): number {
  return (combatant.activeBuffs ?? []).reduce((sum, b) => sum + (b.absorbRemaining ?? 0), 0);
}

/** Get total damage reduction percentage (0-1) */
export function getBuffDamageReduction(combatant: Combatant): number {
  return Math.min(1, (combatant.activeBuffs ?? []).reduce((sum, b) => sum + (b.damageReduction ?? 0), 0));
}

/** Consume absorption from buffs. Returns remaining damage after absorption. */
export function consumeAbsorption(combatant: Combatant, damage: number): { combatant: Combatant; remainingDamage: number } {
  let remaining = damage;
  const buffs = (combatant.activeBuffs ?? []).map(b => {
    if (!b.absorbRemaining || b.absorbRemaining <= 0 || remaining <= 0) return b;
    const absorbed = Math.min(b.absorbRemaining, remaining);
    remaining -= absorbed;
    return { ...b, absorbRemaining: b.absorbRemaining - absorbed };
  }).filter(b => !(b.absorbRemaining !== undefined && b.absorbRemaining <= 0));

  return { combatant: { ...combatant, activeBuffs: buffs }, remainingDamage: Math.max(0, remaining) };
}
