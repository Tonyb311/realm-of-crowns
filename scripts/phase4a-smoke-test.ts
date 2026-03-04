/**
 * Phase 4A Smoke Test — Offline combat sim (no DB required)
 *
 * 4 matchups × 10 iterations each.
 * Checks for swallow firing, phase transitions, legendary actions, etc.
 *
 * Usage: npx tsx --tsconfig server/tsconfig.json scripts/phase4a-smoke-test.ts
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

// ---- Monster data (from seeds — avoid DB dependency) ----

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

// ---- Inline Monster Definitions ----

const MONSTERS: Record<string, { stats: MonsterStats; combatData: MonsterCombatData }> = {
  'Mind Flayer': {
    stats: { hp: 120, ac: 16, attack: 10, damage: '2d8+4', speed: 30, str: 11, dex: 12, con: 14, int: 22, wis: 18, cha: 17 },
    combatData: {
      damageType: 'PSYCHIC',
      resistances: ['PSYCHIC'],
      immunities: ['FORCE'],
      conditionImmunities: ['frightened'],
      abilities: [
        { id: 'mindflayer_blast', name: 'Mind Blast', type: 'aoe', damage: '6d8', damageType: 'PSYCHIC', saveType: 'int', saveDC: 17, priority: 8, recharge: 5, description: 'Psychic wave.' },
        { id: 'mindflayer_stun', name: 'Psychic Grasp', type: 'status', saveType: 'wis', saveDC: 17, statusEffect: 'stunned', statusDuration: 2, priority: 6, cooldown: 3, description: 'Stun.' },
        { id: 'mindflayer_extract', name: 'Extract Brain', type: 'damage', damage: '10d10', damageType: 'PSYCHIC', priority: 10, usesPerCombat: 1, cooldown: 0, description: 'Devastating one-shot.' },
      ],
    },
  },
  'Purple Worm': {
    stats: { hp: 210, ac: 18, attack: 13, damage: '3d8+7', speed: 50, str: 28, dex: 7, con: 22, int: 1, wis: 8, cha: 4 },
    combatData: {
      damageType: 'PIERCING',
      resistances: ['BLUDGEONING', 'PIERCING'],
      immunities: ['POISON'],
      conditionImmunities: ['poisoned', 'frightened'],
      phaseTransitions: [{
        id: 'worm_frenzy', hpThresholdPercent: 30, name: 'Burrowing Frenzy',
        description: 'The Purple Worm thrashes violently.', triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, damage: 3 } },
          { type: 'aoe_burst', aoeBurst: { damage: '4d8', damageType: 'BLUDGEONING', saveDC: 18, saveType: 'dex' } },
        ],
      }],
      abilities: [
        { id: 'worm_swallow', name: 'Swallow', type: 'swallow', saveType: 'str', saveDC: 18, swallowDamage: '3d6', swallowDamageType: 'ACID', swallowEscapeThreshold: 25, priority: 9, cooldown: 4, description: 'Swallow whole.' },
        { id: 'worm_multiattack', name: 'Bite and Tail', type: 'multiattack', attacks: 2, priority: 5, cooldown: 0, description: 'Bite and tail.' },
        { id: 'worm_death_throes', name: 'Bursting Death', type: 'death_throes', deathDamage: '6d8', deathDamageType: 'ACID', deathSaveDC: 16, deathSaveType: 'dex', description: 'Acid explosion.' },
      ],
    },
  },
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
        description: 'The Storm Giant channels the full fury of the tempest.', triggered: false,
        effects: [
          { type: 'stat_boost', statBoost: { attack: 3, ac: 2, damage: 4 } },
          { type: 'aoe_burst', aoeBurst: { damage: '8d6', damageType: 'LIGHTNING', saveDC: 20, saveType: 'dex' } },
        ],
      }],
      abilities: [
        { id: 'storm_lightning', name: 'Lightning Strike', type: 'aoe', damage: '8d8', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 20, priority: 8, cooldown: 2, isLegendaryAction: true, legendaryCost: 2, description: 'Lightning bolt.' },
        { id: 'storm_aura', name: 'Storm Aura', type: 'damage_aura', auraDamage: '2d8', auraDamageType: 'LIGHTNING', description: 'Electric arc.' },
        { id: 'storm_multiattack', name: 'Thunderous Blows', type: 'multiattack', attacks: 2, priority: 5, cooldown: 0, isLegendaryAction: true, legendaryCost: 1, description: 'Two strikes.' },
        { id: 'storm_throw', name: 'Rock Throw', type: 'damage', damage: '4d10+7', damageType: 'BLUDGEONING', priority: 6, cooldown: 1, isLegendaryAction: true, legendaryCost: 1, description: 'Hurls a boulder.' },
      ],
    },
  },
  'Fey Dragon': {
    stats: { hp: 145, ac: 17, attack: 11, damage: '2d8+5', speed: 60, str: 16, dex: 18, con: 16, int: 18, wis: 16, cha: 20 },
    combatData: {
      damageType: 'FORCE',
      resistances: ['PSYCHIC', 'RADIANT'],
      abilities: [
        { id: 'feydragon_breath', name: 'Fey Breath', type: 'aoe', damage: '6d6', damageType: 'FORCE', saveType: 'dex', saveDC: 16, priority: 7, recharge: 5, description: 'Force wave.' },
        { id: 'feydragon_phase', name: 'Phase Shift', type: 'buff', statusEffect: 'shielded', statusDuration: 1, priority: 4, cooldown: 3, description: 'Plane shift defense.' },
        { id: 'feydragon_multiattack', name: 'Claw and Fang', type: 'multiattack', attacks: 2, priority: 5, cooldown: 0, description: 'Claw and fang.' },
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

      // Run mechanic checkers on the combat log
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

// ---- Matchup 1: Warrior L20 vs Mind Flayer ----
function mindFlayerCheckers(log: any[], r: MatchupResult) {
  let extractFired = false;
  let stunApplied = false;
  let totalPsychicDmg = 0;

  for (const entry of log) {
    const res = entry.result;
    if (res?.type === 'monster_ability') {
      if (res.abilityName === 'Extract Brain' && res.hit) { extractFired = true; totalPsychicDmg += res.damage ?? 0; }
      if (res.abilityName === 'Mind Blast') totalPsychicDmg += res.damage ?? 0;
      if (res.statusApplied === 'stunned') stunApplied = true;
    }
  }

  if (extractFired) inc(r.mechanics, 'extractBrainFired');
  if (stunApplied) inc(r.mechanics, 'stunApplied');
  inc(r.mechanics, 'totalPsychicDmg', totalPsychicDmg);
}

// ---- Matchup 2: Warrior L25 vs Purple Worm ----
function purpleWormCheckers(log: any[], r: MatchupResult) {
  let swallowFired = false;
  let escapeCount = 0;
  let freedCount = 0;
  let digestiveDmg = 0;

  for (const entry of log) {
    const res = entry.result;
    if (res?.type === 'monster_ability' && res.abilityName === 'Swallow') {
      swallowFired = true;
    }

    if (entry.swallowResults) {
      for (const sr of entry.swallowResults as SwallowResult[]) {
        if (sr.type === 'swallow_damage') digestiveDmg += sr.damage ?? 0;
        if (sr.type === 'swallow_escape') escapeCount++;
        if (sr.type === 'swallow_freed') freedCount++;
      }
    }
  }

  if (swallowFired) inc(r.mechanics, 'swallowFired');
  inc(r.mechanics, 'swallowEscapes', escapeCount);
  inc(r.mechanics, 'swallowFreed', freedCount);
  inc(r.mechanics, 'digestiveDmg', digestiveDmg);
}

// ---- Matchup 3: Warrior L30 vs Storm Giant ----
function stormGiantCheckers(log: any[], r: MatchupResult) {
  let phaseTriggered = false;
  let laCount = 0;
  let auraDmg = 0;

  for (const entry of log) {
    if (entry.phaseTransition) phaseTriggered = true;
    if (entry.legendaryActions) laCount += entry.legendaryActions.length;
    if (entry.auraResults) {
      for (const aura of entry.auraResults) {
        if (aura.damage) auraDmg += aura.damage;
      }
    }
    // Also check attack result for aura
    const res = entry.result;
    if (res?.auraResult?.damage) auraDmg += res.auraResult.damage;
  }

  if (phaseTriggered) inc(r.mechanics, 'phaseTriggered');
  inc(r.mechanics, 'legendaryActions', laCount);
  inc(r.mechanics, 'stormAuraDmg', auraDmg);
}

// ---- Matchup 4: Psion L22 vs Fey Dragon ----
function feyDragonCheckers(log: any[], r: MatchupResult) {
  let feyBreathFired = false;
  for (const entry of log) {
    const res = entry.result;
    if (res?.type === 'monster_ability' && res.abilityName === 'Fey Breath') feyBreathFired = true;
  }
  if (feyBreathFired) inc(r.mechanics, 'feyBreathFired');
}

// ---- Main ----

const ITERS = 10;

console.log('=== PHASE 4A SMOKE TEST ===\n');

const results: MatchupResult[] = [];

console.log('Running: Warrior L20 vs Mind Flayer L20...');
results.push(runMatchup('warrior', 20, 'Mind Flayer', 20, ITERS, mindFlayerCheckers));

console.log('Running: Warrior L25 vs Purple Worm L25...');
results.push(runMatchup('warrior', 25, 'Purple Worm', 25, ITERS, purpleWormCheckers));

console.log('Running: Warrior L30 vs Storm Giant L30...');
results.push(runMatchup('warrior', 30, 'Storm Giant', 30, ITERS, stormGiantCheckers));

console.log('Running: Psion L22 vs Fey Dragon L22...');
results.push(runMatchup('psion', 22, 'Fey Dragon', 22, ITERS, feyDragonCheckers));

console.log('\n=== RESULTS ===\n');

for (const r of results) {
  const winRate = ((r.wins / r.iterations) * 100).toFixed(0);
  const avgRounds = (r.totalRounds / r.iterations).toFixed(1);
  console.log(`${r.label}:`);
  console.log(`  Win rate: ${winRate}% (${r.wins}W/${r.losses}L/${r.draws}D)`);
  console.log(`  Avg rounds: ${avgRounds}`);
  for (const [k, v] of Object.entries(r.mechanics)) {
    console.log(`  ${k}: ${v}`);
  }
  if (r.errors.length > 0) {
    console.log(`  ERRORS: ${r.errors.length}`);
    for (const e of r.errors) console.log(`    - ${e}`);
  }
  console.log('');
}

// Check critical: swallow must fire
const pwResult = results[1];
if ((pwResult.mechanics['swallowFired'] ?? 0) === 0) {
  console.log('!!! CRITICAL: Swallow did NOT fire in any Purple Worm fight !!!');
} else {
  console.log(`OK: Swallow fired in ${pwResult.mechanics['swallowFired']}/${ITERS} fights.`);
}
