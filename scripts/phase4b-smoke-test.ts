/**
 * Phase 4B Smoke Test — Endgame monsters + storm aura fix verification
 *
 * 7 matchups (5 at 10 iterations, Storm Giant at 5, Arcane Titan at 10).
 * Usage: npx tsx --tsconfig server/tsconfig.json scripts/phase4b-smoke-test.ts
 */

import {
  buildSyntheticPlayer,
  buildSyntheticMonster,
  buildPlayerCombatParams,
  type MonsterStats,
  type MonsterCombatData,
} from '../server/src/services/combat-simulator';

import {
  createCharacterCombatant,
  createMonsterCombatant,
  createCombatState,
} from '../server/src/lib/combat-engine';

import {
  resolveTickCombat,
  type CombatantParams,
} from '../server/src/services/tick-combat-resolver';

import type {
  MonsterAbility,
  MonsterAbilityInstance,
  CombatDamageType,
  PhaseTransition,
  SwallowResult,
} from '../shared/src/types/combat';

// ---- Helpers (same as phase4a) ----

function buildMonsterAbilityInstances(abilities: any[]): MonsterAbilityInstance[] {
  if (!Array.isArray(abilities) || abilities.length === 0) return [];
  return abilities.map((a: any) => ({
    def: a as MonsterAbility,
    cooldownRemaining: 0,
    usesRemaining: a.usesPerCombat ?? null,
    isRecharged: false,
  }));
}

function buildMonsterCombatOptions(cd: MonsterCombatData) {
  const abilities = buildMonsterAbilityInstances(cd.abilities ?? []);
  const resistances = (cd.resistances ?? []) as CombatDamageType[];
  const immunities = (cd.immunities ?? []) as CombatDamageType[];
  const vulnerabilities = (cd.vulnerabilities ?? []) as CombatDamageType[];
  const conditionImmunities = cd.conditionImmunities as string[] ?? [];
  const critImmunity = cd.critImmunity ?? false;
  const critResistance = cd.critResistance ?? 0;
  const legendaryActions = cd.legendaryActions ?? 0;
  const legendaryResistances = cd.legendaryResistances ?? 0;
  const phaseTransitions = cd.phaseTransitions ?? [];

  if (abilities.length === 0 && resistances.length === 0 && immunities.length === 0 &&
      vulnerabilities.length === 0 && conditionImmunities.length === 0 &&
      !critImmunity && critResistance === 0 && legendaryActions === 0 && legendaryResistances === 0 &&
      phaseTransitions.length === 0) {
    return undefined;
  }
  return {
    ...(resistances.length > 0 && { resistances }),
    ...(immunities.length > 0 && { immunities }),
    ...(vulnerabilities.length > 0 && { vulnerabilities }),
    ...(conditionImmunities.length > 0 && { conditionImmunities }),
    ...(critImmunity && { critImmunity }),
    ...(critResistance !== 0 && { critResistance }),
    ...(abilities.length > 0 && { monsterAbilities: abilities }),
    ...(legendaryActions > 0 && { legendaryActions }),
    ...(legendaryResistances > 0 && { legendaryResistances }),
    ...(phaseTransitions.length > 0 && { phaseTransitions }),
  };
}

// ---- Monster Definitions ----

const MONSTERS: Record<string, { stats: MonsterStats; combatData: MonsterCombatData }> = {
  'Storm Giant': {
    stats: { hp: 280, ac: 21, attack: 15, damage: '3d10+8', speed: 50, str: 29, dex: 14, con: 22, int: 16, wis: 18, cha: 20 },
    combatData: {
      damageType: 'BLUDGEONING',
      resistances: ['COLD', 'THUNDER'],
      immunities: ['LIGHTNING'],
      legendaryActions: 3,
      legendaryResistances: 2,
      phaseTransitions: [{
        id: 'storm_giant_tempest', hpThresholdPercent: 40, name: 'Eye of the Storm',
        description: 'Full fury of the tempest.', triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, ac: 2, damage: 4 } },
          { type: 'aoe_burst', aoeBurst: { damage: '8d6', damageType: 'LIGHTNING', saveDC: 20, saveType: 'dex' } },
        ],
      }],
      abilities: [
        { id: 'storm_lightning', name: 'Lightning Strike', type: 'aoe', damage: '8d8', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 20, priority: 8, cooldown: 2, isLegendaryAction: true, legendaryCost: 2, description: 'Lightning bolt.' },
        { id: 'storm_aura', name: 'Storm Aura', type: 'damage_aura', auraDamage: '2d8', auraDamageType: 'LIGHTNING', description: 'Electric arc.' },
        { id: 'storm_multiattack', name: 'Thunderous Blows', type: 'multiattack', attacks: 2, priority: 5, cooldown: 0, isLegendaryAction: true, legendaryCost: 1, description: 'Two strikes.' },
        { id: 'storm_throw', name: 'Rock Throw', type: 'damage', damage: '4d10+7', damageType: 'BLUDGEONING', priority: 6, cooldown: 1, isLegendaryAction: true, legendaryCost: 1, description: 'Hurls boulder.' },
      ],
    },
  },
  'Basilisk King': {
    stats: { hp: 340, ac: 21, attack: 15, damage: '4d8+9', speed: 30, str: 24, dex: 10, con: 24, int: 3, wis: 14, cha: 8 },
    combatData: {
      damageType: 'PIERCING',
      immunities: ['POISON'],
      legendaryResistances: 1,
      phaseTransitions: [{
        id: 'basilisk_stone_fury', hpThresholdPercent: 30, name: 'Stone Fury',
        description: 'Scales harden into living stone.', triggered: false,
        effects: [{ type: 'stat_boost', statBoost: { attack: 3, ac: 2 } }],
      }],
      abilities: [
        { id: 'basilisk_multiattack', name: 'Bite and Tail', type: 'multiattack', attacks: 2, priority: 5, cooldown: 0, description: 'Bite and tail.' },
        { id: 'basilisk_gaze', name: 'Petrifying Gaze', type: 'status', saveType: 'con', saveDC: 19, statusEffect: 'stunned', statusDuration: 2, priority: 9, cooldown: 4, description: 'Petrifying gaze.' },
        { id: 'basilisk_venom', name: 'Venomous Bite', type: 'on_hit', saveType: 'con', saveDC: 18, statusEffect: 'poisoned', statusDuration: 3, description: 'Venom.' },
      ],
    },
  },
  'Archlich': {
    stats: { hp: 420, ac: 23, attack: 18, damage: '4d8+10', speed: 30, str: 14, dex: 14, con: 18, int: 24, wis: 22, cha: 20 },
    combatData: {
      damageType: 'NECROTIC',
      resistances: ['COLD', 'LIGHTNING', 'NECROTIC'],
      immunities: ['POISON', 'PSYCHIC'],
      conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned'],
      legendaryActions: 3, legendaryResistances: 3,
      phaseTransitions: [
        { id: 'archlich_phylactery', hpThresholdPercent: 50, name: 'Phylactery Surge', description: 'Dark energy erupts.', triggered: false, effects: [{ type: 'stat_boost', statBoost: { attack: 3, damage: 3 } }, { type: 'aoe_burst', aoeBurst: { damage: '6d8', damageType: 'NECROTIC', saveDC: 20, saveType: 'con' } }] },
        { id: 'archlich_undying', hpThresholdPercent: 25, name: 'Undying Will', description: 'Sustained by death energy.', triggered: false, effects: [{ type: 'stat_boost', statBoost: { ac: 3 } }, { type: 'add_ability', addAbility: { id: 'archlich_massraise', name: 'Mass Raise Dead', type: 'heal', hpPerTurn: 30, description: 'Self-sustain.' } }] },
      ],
      abilities: [
        { id: 'archlich_stun', name: 'Power Word Stun', type: 'status', saveType: 'wis', saveDC: 21, statusEffect: 'stunned', statusDuration: 2, priority: 10, cooldown: 4, isLegendaryAction: true, legendaryCost: 2, description: 'Stun.' },
        { id: 'archlich_storm', name: 'Necrotic Storm', type: 'aoe', damage: '8d8', damageType: 'NECROTIC', saveType: 'con', saveDC: 20, priority: 8, cooldown: 2, description: 'Death storm.' },
        { id: 'archlich_souldrain', name: 'Soul Drain', type: 'on_hit', saveType: 'con', saveDC: 20, statusEffect: 'weakened', statusDuration: 3, description: 'Life drain.' },
        { id: 'archlich_deathaura', name: 'Death Aura', type: 'damage_aura', auraDamage: '3d6', auraDamageType: 'NECROTIC', description: 'Aura of death.' },
      ],
    },
  },
  'Deep Kraken': {
    stats: { hp: 520, ac: 22, attack: 20, damage: '4d10+11', speed: 40, str: 30, dex: 12, con: 26, int: 18, wis: 16, cha: 14 },
    combatData: {
      damageType: 'BLUDGEONING',
      immunities: ['LIGHTNING', 'COLD'],
      resistances: ['ACID', 'PIERCING'],
      legendaryActions: 3, legendaryResistances: 2,
      abilities: [
        { id: 'deepkraken_tentacle', name: 'Tentacle Lash', type: 'multiattack', attacks: 4, priority: 5, cooldown: 0, description: 'Four tentacles.' },
        { id: 'deepkraken_maelstrom', name: 'Maelstrom', type: 'aoe', damage: '8d10', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 21, priority: 9, cooldown: 3, isLegendaryAction: true, legendaryCost: 2, description: 'Vortex.' },
        { id: 'deepkraken_lightning', name: 'Lightning Storm', type: 'aoe', damage: '8d8', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 20, priority: 7, cooldown: 2, description: 'Lightning.' },
        { id: 'deepkraken_ink', name: 'Ink Darkness', type: 'status', saveType: 'wis', saveDC: 20, statusEffect: 'frightened', statusDuration: 2, priority: 6, cooldown: 4, description: 'Darkness.' },
      ],
    },
  },
  'Tarrasque': {
    stats: { hp: 640, ac: 25, attack: 22, damage: '5d10+14', speed: 40, str: 30, dex: 12, con: 30, int: 4, wis: 14, cha: 14 },
    combatData: {
      damageType: 'PIERCING',
      immunities: ['FIRE', 'POISON'],
      resistances: ['COLD', 'LIGHTNING', 'SLASHING', 'PIERCING', 'BLUDGEONING'],
      conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned'],
      critResistance: -30,
      legendaryActions: 3, legendaryResistances: 3,
      phaseTransitions: [
        { id: 'tarrasque_rage', hpThresholdPercent: 50, name: 'Primal Rage', description: 'Primal fury.', triggered: false, effects: [{ type: 'stat_boost', statBoost: { attack: 3, damage: 3 } }, { type: 'aoe_burst', aoeBurst: { damage: '8d6', damageType: 'BLUDGEONING', saveDC: 22, saveType: 'str' } }] },
        { id: 'tarrasque_extinction', hpThresholdPercent: 20, name: 'Extinction Event', description: 'Apocalyptic might.', triggered: false, effects: [{ type: 'stat_boost', statBoost: { attack: 5, ac: 2 } }, { type: 'add_ability', addAbility: { id: 'tarrasque_quake', name: 'Earthshatter', type: 'aoe', damage: '12d10', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 24, cooldown: 3, priority: 10, description: 'Earth shatters.' } }] },
      ],
      abilities: [
        { id: 'tarrasque_multiattack', name: 'Rend and Tear', type: 'multiattack', attacks: 4, priority: 5, cooldown: 0, description: 'Bite+claws+tail.' },
        { id: 'tarrasque_swallow', name: 'Swallow', type: 'swallow', saveType: 'str', saveDC: 24, swallowDamage: '5d8', swallowDamageType: 'ACID', swallowEscapeThreshold: 40, priority: 8, cooldown: 4, description: 'Swallows prey whole.' },
        { id: 'tarrasque_fear', name: 'Frightful Presence', type: 'fear_aura', saveDC: 23, auraRepeats: false, description: 'Nightmare presence.' },
        { id: 'tarrasque_tail', name: 'Tail Sweep', type: 'aoe', damage: '8d8', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 22, priority: 7, cooldown: 2, isLegendaryAction: true, legendaryCost: 1, description: 'Tail sweep.' },
      ],
    },
  },
  'Void Emperor': {
    stats: { hp: 650, ac: 25, attack: 22, damage: '5d10+14', speed: 30, str: 24, dex: 16, con: 26, int: 28, wis: 24, cha: 26 },
    combatData: {
      damageType: 'PSYCHIC',
      immunities: ['PSYCHIC', 'NECROTIC', 'POISON'],
      resistances: ['COLD', 'FIRE', 'LIGHTNING', 'FORCE'],
      conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned'],
      critResistance: -25,
      legendaryActions: 3, legendaryResistances: 3,
      phaseTransitions: [
        { id: 'voidemperor_ascension', hpThresholdPercent: 50, name: 'Void Ascension', description: 'Transcends mortal form.', triggered: false, effects: [{ type: 'stat_boost', statBoost: { attack: 4, damage: 4 } }, { type: 'aoe_burst', aoeBurst: { damage: '10d8', damageType: 'PSYCHIC', saveDC: 24, saveType: 'wis' } }] },
        { id: 'voidemperor_horizon', hpThresholdPercent: 20, name: 'Event Horizon', description: 'Reality collapses.', triggered: false, effects: [{ type: 'stat_boost', statBoost: { ac: 3 } }, { type: 'add_ability', addAbility: { id: 'voidemperor_collapse', name: 'Dimensional Collapse', type: 'aoe', damage: '14d8', damageType: 'FORCE', saveType: 'int', saveDC: 25, cooldown: 3, priority: 10, description: 'Reality tears apart.' } }] },
      ],
      abilities: [
        { id: 'voidemperor_rend', name: 'Void Rend', type: 'multiattack', attacks: 3, priority: 5, cooldown: 0, description: 'Reality slashes.' },
        { id: 'voidemperor_tear', name: 'Reality Tear', type: 'aoe', damage: '12d8', damageType: 'PSYCHIC', saveType: 'wis', saveDC: 24, priority: 9, cooldown: 2, isLegendaryAction: true, legendaryCost: 2, description: 'Psychic devastation.' },
        { id: 'voidemperor_dread', name: 'Existential Dread', type: 'fear_aura', saveDC: 24, auraRepeats: false, description: 'Erases sense of self.' },
        { id: 'voidemperor_drain', name: 'Void Drain', type: 'on_hit', saveType: 'wis', saveDC: 22, statusEffect: 'weakened', statusDuration: 3, description: 'Drains meaning.' },
        { id: 'voidemperor_rift', name: 'Dimensional Rift', type: 'status', saveType: 'int', saveDC: 23, statusEffect: 'stunned', statusDuration: 2, priority: 10, cooldown: 4, isLegendaryAction: true, legendaryCost: 2, description: 'Trapped between dimensions.' },
        { id: 'voidemperor_death', name: 'Void Collapse', type: 'death_throes', deathDamage: '12d8', deathDamageType: 'PSYCHIC', deathSaveDC: 22, deathSaveType: 'wis', description: 'Dimensional collapse.' },
      ],
    },
  },
  'Arcane Titan': {
    stats: { hp: 580, ac: 24, attack: 21, damage: '5d8+12', speed: 40, str: 28, dex: 12, con: 24, int: 24, wis: 20, cha: 18 },
    combatData: {
      damageType: 'FORCE',
      immunities: ['PSYCHIC', 'FORCE'],
      resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
      conditionImmunities: ['charmed', 'frightened'],
      legendaryActions: 2, legendaryResistances: 2,
      phaseTransitions: [{
        id: 'arcanetitan_overload', hpThresholdPercent: 30, name: 'Arcane Overload',
        description: 'Raw magical power.', triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 5 } },
          { type: 'add_ability', addAbility: { id: 'arcanetitan_nova', name: 'Arcane Nova', type: 'aoe', damage: '12d8', damageType: 'FORCE', saveType: 'wis', saveDC: 23, cooldown: 3, priority: 10, description: 'Arcane explosion.' } },
        ],
      }],
      abilities: [
        { id: 'arcanetitan_fist', name: 'Arcane Fist', type: 'multiattack', attacks: 2, priority: 5, cooldown: 0, description: 'Arcane fists.' },
        { id: 'arcanetitan_cataclysm', name: 'Arcane Cataclysm', type: 'aoe', damage: '10d8', damageType: 'FORCE', saveType: 'wis', saveDC: 22, priority: 9, cooldown: 2, isLegendaryAction: true, legendaryCost: 2, description: 'Arcane destruction.' },
        { id: 'arcanetitan_pulse', name: 'Antimagic Pulse', type: 'status', saveType: 'int', saveDC: 22, statusEffect: 'weakened', statusDuration: 2, priority: 7, cooldown: 4, description: 'Antimagic.' },
        { id: 'arcanetitan_shield', name: 'Arcane Shield', type: 'buff', statusEffect: 'shielded', statusDuration: 2, priority: 4, cooldown: 4, description: 'Arcane barrier.' },
      ],
    },
  },
};

// ---- Runner ----

interface MatchupResult {
  label: string;
  wins: number;
  losses: number;
  draws: number;
  totalRounds: number;
  iterations: number;
  mechanics: Record<string, number>;
  errors: string[];
}

function runMatchup(
  playerClass: string,
  playerLevel: number,
  monsterName: string,
  monsterLevel: number,
  iterations: number,
  mechanicCheckers: (log: any[], results: MatchupResult) => void,
): MatchupResult {
  const mData = MONSTERS[monsterName];
  if (!mData) throw new Error(`Monster ${monsterName} not defined`);

  const result: MatchupResult = {
    label: `${playerClass} L${playerLevel} vs ${monsterName} L${monsterLevel}`,
    wins: 0, losses: 0, draws: 0, totalRounds: 0,
    iterations,
    mechanics: {},
    errors: [],
  };

  for (let i = 0; i < iterations; i++) {
    try {
      const player = buildSyntheticPlayer({ race: 'human', class: playerClass, level: playerLevel });
      if (!player) { result.errors.push(`Failed to build player iter ${i}`); continue; }

      const monster = buildSyntheticMonster(monsterName, monsterLevel, mData.stats, mData.combatData);
      const playerParams = buildPlayerCombatParams(player);

      const playerCombatant = createCharacterCombatant(
        `player-${i}`, player.name, 0,
        player.stats, player.level,
        player.hp, player.maxHp,
        player.equipmentAC, player.weapon,
        player.spellSlots, player.proficiencyBonus,
      );
      (playerCombatant as any).characterClass = player.class;
      (playerCombatant as any).race = player.race;

      const monsterCombatant = createMonsterCombatant(
        `monster-${i}`, monster.name, 1,
        monster.stats, monster.level,
        monster.hp, monster.ac,
        monster.weapon, 0,
        monster.combatData ? buildMonsterCombatOptions(monster.combatData) : undefined,
      );

      const state = createCombatState(`smoke-${i}`, 'PVE', [playerCombatant, monsterCombatant]);
      const paramsMap = new Map<string, CombatantParams>();
      paramsMap.set(`player-${i}`, { ...playerParams, id: `player-${i}` });

      const outcome = resolveTickCombat(state, paramsMap);

      if (outcome.winner === 'team0') result.wins++;
      else if (outcome.winner === 'team1') result.losses++;
      else result.draws++;
      result.totalRounds += outcome.rounds;

      mechanicCheckers(outcome.combatLog, result);
    } catch (err: any) {
      result.errors.push(`Iter ${i}: ${err.message}`);
    }
  }

  return result;
}

function inc(m: Record<string, number>, key: string, amount: number = 1) {
  m[key] = (m[key] ?? 0) + amount;
}

// ---- Mechanic Checkers ----

function stormGiantCheckers(log: any[], r: MatchupResult) {
  let auraDmg = 0;
  let phaseTriggered = false;
  for (const entry of log) {
    if (entry.phaseTransition) phaseTriggered = true;
    // Check auraResults on log entry (fear + damage auras)
    if (entry.auraResults) {
      for (const aura of entry.auraResults) {
        if (aura.auraType === 'damage' && aura.damage) auraDmg += aura.damage;
      }
    }
    // Also check AttackResult.auraResult (basic attack path)
    const res = entry.result;
    if (res?.auraResult?.damage) auraDmg += res.auraResult.damage;
  }
  if (phaseTriggered) inc(r.mechanics, 'phaseTriggered');
  inc(r.mechanics, 'stormAuraDmg', auraDmg);
}

function basiliskCheckers(log: any[], r: MatchupResult) {
  let stunFired = false;
  let phaseTriggered = false;
  for (const entry of log) {
    if (entry.phaseTransition) phaseTriggered = true;
    const res = entry.result;
    if (res?.type === 'monster_ability' && res.abilityName === 'Petrifying Gaze' && !res.saveSucceeded) stunFired = true;
  }
  if (stunFired) inc(r.mechanics, 'stunFired');
  if (phaseTriggered) inc(r.mechanics, 'phaseTriggered');
}

function archlichCheckers(log: any[], r: MatchupResult) {
  let laCount = 0;
  let phase1 = false;
  let phase2 = false;
  for (const entry of log) {
    if (entry.legendaryActions) laCount += entry.legendaryActions.length;
    if (entry.phaseTransition) {
      if (entry.phaseTransition.name === 'Phylactery Surge') phase1 = true;
      if (entry.phaseTransition.name === 'Undying Will') phase2 = true;
    }
  }
  inc(r.mechanics, 'legendaryActions', laCount);
  if (phase1) inc(r.mechanics, 'phase1Triggered');
  if (phase2) inc(r.mechanics, 'phase2Triggered');
}

function deepKrakenCheckers(log: any[], r: MatchupResult) {
  let maelstromFired = false;
  let multiattack4 = false;
  for (const entry of log) {
    const res = entry.result;
    if (res?.type === 'monster_ability' && res.abilityName === 'Maelstrom') maelstromFired = true;
    if (res?.type === 'monster_ability' && res.abilityName === 'Tentacle Lash') multiattack4 = true;
  }
  if (maelstromFired) inc(r.mechanics, 'maelstromFired');
  if (multiattack4) inc(r.mechanics, 'tentacleLash4');
}

function tarrasqueCheckers(log: any[], r: MatchupResult) {
  let swallowFired = 0;
  let phase1 = false;
  let phase2 = false;
  for (const entry of log) {
    if (entry.swallowResults) {
      for (const sr of entry.swallowResults) {
        if (sr.type === 'swallow_attempt' && sr.swallowed) swallowFired++;
        if (sr.type === 'swallow_damage') inc(r.mechanics, 'digestiveDmg', sr.damage ?? 0);
      }
    }
    const res = entry.result;
    if (res?.type === 'monster_ability' && res.abilityName === 'Swallow' && res.statusApplied === 'swallowed') swallowFired++;
    if (entry.phaseTransition) {
      if (entry.phaseTransition.name === 'Primal Rage') phase1 = true;
      if (entry.phaseTransition.name === 'Extinction Event') phase2 = true;
    }
  }
  inc(r.mechanics, 'swallowFired', swallowFired);
  if (phase1) inc(r.mechanics, 'phase1Triggered');
  if (phase2) inc(r.mechanics, 'phase2Triggered');
}

function voidEmperorCheckers(log: any[], r: MatchupResult) {
  let laCount = 0;
  let deathThroes = false;
  let phase1 = false;
  let phase2 = false;
  let fearApplied = false;
  for (const entry of log) {
    if (entry.legendaryActions) laCount += entry.legendaryActions.length;
    if (entry.deathThroesResult) deathThroes = true;
    if (entry.phaseTransition) {
      if (entry.phaseTransition.name === 'Void Ascension') phase1 = true;
      if (entry.phaseTransition.name === 'Event Horizon') phase2 = true;
    }
    if (entry.auraResults) {
      for (const aura of entry.auraResults) {
        if (aura.auraType === 'fear' && aura.statusApplied) fearApplied = true;
      }
    }
  }
  inc(r.mechanics, 'legendaryActions', laCount);
  if (deathThroes) inc(r.mechanics, 'deathThroesFired');
  if (phase1) inc(r.mechanics, 'phase1Triggered');
  if (phase2) inc(r.mechanics, 'phase2Triggered');
  if (fearApplied) inc(r.mechanics, 'fearApplied');
}

function arcaneTitanCheckers(log: any[], r: MatchupResult) {
  let phaseFired = false;
  for (const entry of log) {
    if (entry.phaseTransition) phaseFired = true;
  }
  if (phaseFired) inc(r.mechanics, 'phaseTriggered');
}

// ---- Main ----

console.log('=== PHASE 4B SMOKE TEST ===\n');

const results: MatchupResult[] = [];

console.log('1. Storm Giant aura fix verification (5 fights)...');
results.push(runMatchup('warrior', 30, 'Storm Giant', 30, 5, stormGiantCheckers));

console.log('2. Warrior L35 vs Basilisk King L35 (10 fights)...');
results.push(runMatchup('warrior', 35, 'Basilisk King', 35, 10, basiliskCheckers));

console.log('3. Warrior L40 vs Archlich L40 (10 fights)...');
results.push(runMatchup('warrior', 40, 'Archlich', 40, 10, archlichCheckers));

console.log('4. Warrior L45 vs Deep Kraken L44 (10 fights)...');
results.push(runMatchup('warrior', 45, 'Deep Kraken', 44, 10, deepKrakenCheckers));

console.log('5. Warrior L49 vs Tarrasque L49 (10 fights)...');
results.push(runMatchup('warrior', 49, 'Tarrasque', 49, 10, tarrasqueCheckers));

console.log('6. Warrior L50 vs Void Emperor L50 (10 fights)...');
results.push(runMatchup('warrior', 50, 'Void Emperor', 50, 10, voidEmperorCheckers));

console.log('7. Psion L47 vs Arcane Titan L47 (10 fights)...');
results.push(runMatchup('psion', 47, 'Arcane Titan', 47, 10, arcaneTitanCheckers));

console.log('\n=== RESULTS ===\n');

for (const r of results) {
  const avgRounds = r.iterations > 0 ? (r.totalRounds / r.iterations).toFixed(1) : '0';
  const winPct = r.iterations > 0 ? Math.round((r.wins / r.iterations) * 100) : 0;
  console.log(`${r.label}:`);
  console.log(`  Win rate: ${winPct}%  (${r.wins}W / ${r.losses}L / ${r.draws}D)`);
  console.log(`  Avg rounds: ${avgRounds}`);
  if (Object.keys(r.mechanics).length > 0) {
    for (const [k, v] of Object.entries(r.mechanics)) {
      console.log(`  ${k}: ${v}`);
    }
  }
  if (r.errors.length > 0) {
    console.log(`  ERRORS: ${r.errors.length}`);
    for (const e of r.errors) console.log(`    ${e}`);
  }
  console.log('');
}
