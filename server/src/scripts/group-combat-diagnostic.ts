/**
 * Group Combat Diagnostic — Verbose 5-fight analysis of Balanced L20 medium.
 *
 * Outputs per-fight:
 *   1. Monster selection (names + levels)
 *   2. Total monster HP pool vs total party HP pool
 *   3. Round-by-round party HP tracking
 *   4. Rounds survived
 *   5. Did the Cleric ever heal an ally?
 *   6. Did any AoE abilities fire against the monster group?
 */

import { db, pool } from '../lib/db';
import * as schema from '@database/index';
import {
  buildSyntheticPlayer,
  buildSyntheticParty,
  buildSyntheticMonster,
  buildPlayerCombatParams,
  type MonsterStats,
  type MonsterCombatData,
  type PartyConfig,
} from '../services/combat-simulator';
import {
  selectMonsterGroup,
  type MonsterRecord,
  type MonsterGroupConfig,
} from './group-combat-helpers';
import {
  createCharacterCombatant,
  createMonsterCombatant,
  createCombatState,
} from '../lib/combat-engine';
import { resolveTickCombat, type CombatantParams } from '../services/tick-combat-resolver';
import type { CombatDamageType, MonsterAbilityInstance, MonsterAbility, TurnLogEntry } from '@shared/types/combat';

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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PARTY: PartyConfig = {
  name: 'Balanced',
  partyLevel: 20,
  members: [
    { race: 'human', class: 'warrior', level: 20, specialization: 'guardian' },
    { race: 'human', class: 'mage', level: 20, specialization: 'elementalist' },
    { race: 'human', class: 'cleric', level: 20, specialization: 'healer' },
    { race: 'human', class: 'rogue', level: 20, specialization: 'assassin' },
    { race: 'human', class: 'ranger', level: 20, specialization: 'sharpshooter' },
  ],
};

const MONSTER_CONFIG: MonsterGroupConfig = {
  partyLevel: 20,
  partySize: 5,
  method: 'cr_match',
  difficulty: 'medium',
};

const NUM_FIGHTS = 5;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Group Combat Diagnostic: Balanced L20 Medium ===\n');

  // Fetch monsters
  const dbMonsters = await db.query.monsters.findMany();
  const monsterMap = new Map(dbMonsters.map(m => [
    m.name.toLowerCase(),
    {
      name: m.name,
      level: m.level,
      classification: (m as any).classification as string | undefined,
      stats: { ...(m.stats as any), attackStat: m.attackStat ?? 'str' } as unknown as MonsterStats,
      combatData: {
        damageType: m.damageType,
        abilities: m.abilities as any[] || [],
        resistances: m.resistances as string[] || [],
        immunities: m.immunities as string[] || [],
        vulnerabilities: m.vulnerabilities as string[] || [],
        conditionImmunities: m.conditionImmunities as string[] || [],
        critImmunity: m.critImmunity,
        critResistance: m.critResistance,
        legendaryActions: (m as any).legendaryActions ?? 0,
        legendaryResistances: (m as any).legendaryResistances ?? 0,
        phaseTransitions: (m as any).phaseTransitions as any[] || [],
      } as MonsterCombatData,
    },
  ]));

  const allMonsterRecords: MonsterRecord[] = dbMonsters.map(m => ({
    name: m.name,
    level: m.level,
    classification: (m as any).classification as string | undefined,
  }));

  // Show CR budget calculation
  const budget = MONSTER_CONFIG.partySize * MONSTER_CONFIG.partyLevel * 0.75;
  console.log(`CR Budget: ${MONSTER_CONFIG.partySize} × ${MONSTER_CONFIG.partyLevel} × 0.75 = ${budget}`);

  // Show eligible monsters
  const eligible = allMonsterRecords.filter(m => {
    if (m.classification === 'world_boss') return false;
    if (Math.abs(m.level - 20) > 5) return false;
    if (m.level > budget) return false;
    return true;
  });
  console.log(`Eligible monsters (L15-25, non-world_boss): ${eligible.length}`);
  for (const m of eligible.sort((a, b) => a.level - b.level)) {
    console.log(`  ${m.name} (L${m.level}, ${m.classification ?? 'standard'})`);
  }

  // Build party once
  const partyMembers = buildSyntheticParty(PARTY);
  const totalPartyHp = partyMembers.reduce((s, p) => s + p.hp, 0);
  console.log(`\nParty HP Pool: ${totalPartyHp}`);
  for (const p of partyMembers) {
    console.log(`  ${p.name}: ${p.hp} HP, AC ${p.equipmentAC}, ${p.weapon.name}`);
  }

  // Show ability queues
  console.log('\n--- Party Ability Queues ---');
  for (let pi = 0; pi < partyMembers.length; pi++) {
    const p = partyMembers[pi];
    const member = PARTY.members[pi];
    const params = buildPlayerCombatParams(p, {
      tier0Selections: member.tier0Selections,
      specialization: member.specialization,
    });
    console.log(`\n  ${p.name} (${member.specialization}):`);
    for (const entry of params.presets.abilityQueue) {
      console.log(`    [${entry.useWhen}${entry.hpThreshold ? `@${entry.hpThreshold}%` : ''}] ${entry.abilityName} (${entry.abilityId})`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // Run fights
  const allFightData: any[] = [];

  for (let fight = 0; fight < NUM_FIGHTS; fight++) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FIGHT ${fight + 1} of ${NUM_FIGHTS}`);
    console.log('='.repeat(80));

    // Select monsters
    const monsterNames = selectMonsterGroup(MONSTER_CONFIG, allMonsterRecords);
    const monsterDetails: { name: string; level: number; hp: number; ac: number; classification?: string }[] = [];

    console.log(`\nMonsters selected (budget=${budget}):`);
    let totalMonsterHp = 0;
    let budgetUsed = 0;
    for (const name of monsterNames) {
      const mData = monsterMap.get(name.toLowerCase());
      if (!mData) continue;
      const mStats = mData.stats;
      console.log(`  ${mData.name} — L${mData.level}, HP:${mStats.hp}, AC:${mStats.ac}, ATK:+${mStats.attack}, DMG:${mStats.damage}, ${mData.classification ?? 'standard'}`);
      totalMonsterHp += mStats.hp;
      budgetUsed += mData.level;
      monsterDetails.push({ name: mData.name, level: mData.level, hp: mStats.hp, ac: mStats.ac, classification: mData.classification });
    }
    console.log(`  Total: ${monsterNames.length} monsters, ${totalMonsterHp} HP (budget used: ${budgetUsed}/${budget})`);
    console.log(`  HP ratio: Party ${totalPartyHp} vs Monsters ${totalMonsterHp} (${(totalMonsterHp / totalPartyHp * 100).toFixed(0)}%)`);

    // Build combatants
    const playerCombatants: any[] = [];
    const paramsMap = new Map<string, CombatantParams>();

    for (let pi = 0; pi < partyMembers.length; pi++) {
      const player = partyMembers[pi];
      const member = PARTY.members[pi];
      const playerId = `diag-p${pi}-${fight}`;

      const combatant = createCharacterCombatant(
        playerId, player.name, 0,
        player.stats, player.level,
        player.hp, player.maxHp,
        player.equipmentAC, player.weapon,
        player.spellSlots, player.proficiencyBonus,
      );
      (combatant as any).characterClass = player.class;
      (combatant as any).race = player.race;
      playerCombatants.push(combatant);

      const playerParams = buildPlayerCombatParams(player, {
        tier0Selections: member.tier0Selections,
        specialization: member.specialization,
      });
      paramsMap.set(playerId, { ...playerParams, id: playerId });
    }

    const monsterCombatants: any[] = [];
    for (let mi = 0; mi < monsterNames.length; mi++) {
      const mData = monsterMap.get(monsterNames[mi].toLowerCase());
      if (!mData) continue;
      const monster = buildSyntheticMonster(mData.name, mData.level, mData.stats, mData.combatData);
      const monsterId = `diag-m${mi}-${fight}`;
      const combatant = createMonsterCombatant(
        monsterId, monster.name, 1,
        monster.stats, monster.level,
        monster.hp, monster.ac,
        monster.weapon, 0,
        monster.combatData ? buildMonsterCombatOptions(monster.combatData) : undefined,
      );
      monsterCombatants.push(combatant);
    }

    // Create and resolve combat
    const allCombatants = [...playerCombatants, ...monsterCombatants];
    const state = createCombatState(`diag-${fight}`, 'PVE', allCombatants);
    const outcome = resolveTickCombat(state, paramsMap);

    // Analyze combat log
    console.log(`\nInitiative order:`);
    const initState = outcome.finalState; // turnOrder was set at start
    // We can reconstruct from the log
    const firstRoundActors = outcome.combatLog.filter(l => l.round === 1).map(l => {
      const c = allCombatants.find(c => c.id === l.actorId);
      return c ? `${c.name} (${c.entityType === 'monster' ? 'M' : 'P'})` : l.actorId;
    });
    console.log(`  ${firstRoundActors.join(' → ')}`);

    // Round-by-round tracking
    console.log(`\nRound-by-round:`);
    const maxRound = outcome.rounds;
    let clericHealedAlly = false;
    let aoeAbilitiesFired: string[] = [];

    // Track HP state per round
    const playerIds = playerCombatants.map((c: any) => c.id);
    const monsterIds = monsterCombatants.map((c: any) => c.id);

    // Build a running HP tracker from log entries
    const hpTracker = new Map<string, number>();
    for (const c of allCombatants) {
      hpTracker.set(c.id, c.maxHp);
    }

    let currentRound = 0;
    for (const entry of outcome.combatLog) {
      if (entry.round > currentRound) {
        // Print round summary
        if (currentRound > 0) {
          const partyHpState = playerCombatants.map((c: any) => {
            const hp = hpTracker.get(c.id) ?? 0;
            const alive = hp > 0;
            return `${c.name.split(' ').slice(-1)[0]}:${hp}/${c.maxHp}${alive ? '' : '☠'}`;
          });
          const monsterHpState = monsterCombatants.map((c: any) => {
            const hp = hpTracker.get(c.id) ?? 0;
            return `${c.name}:${hp}/${c.maxHp}${hp <= 0 ? '☠' : ''}`;
          });
          console.log(`  R${currentRound}: Party[${partyHpState.join(', ')}] | Monsters[${monsterHpState.join(', ')}]`);
        }
        currentRound = entry.round;
      }

      // Update HP from results
      const result = entry.result as any;

      // Attack results
      if (result.type === 'attack' && result.targetId) {
        hpTracker.set(result.targetId, Math.max(0, result.targetHpAfter ?? hpTracker.get(result.targetId) ?? 0));
      }

      // Class ability results
      if (result.type === 'class_ability') {
        // Check for heals
        if (result.healing && result.healing > 0) {
          const actorIsCleric = playerCombatants.find((c: any) => c.id === entry.actorId && (c as any).characterClass === 'cleric');
          const targetIsAlly = result.targetId && playerIds.includes(result.targetId) && result.targetId !== entry.actorId;
          if (actorIsCleric && targetIsAlly) {
            clericHealedAlly = true;
            console.log(`    ** CLERIC HEALED ALLY: ${result.abilityName} on ${result.targetName ?? result.targetId} for ${result.healing} HP`);
          } else if (actorIsCleric) {
            console.log(`    ** CLERIC HEAL: ${result.abilityName} ${result.targetId === entry.actorId ? '(self)' : `on ${result.targetName ?? result.targetId}`} for ${result.healing} HP`);
          }
        }
        // Check for AoE (perTargetResults with multiple targets)
        if (result.perTargetResults && result.perTargetResults.length > 1) {
          const targetTeams = result.perTargetResults.map((t: any) => monsterIds.includes(t.targetId) ? 'monster' : 'player');
          if (targetTeams.includes('monster')) {
            aoeAbilitiesFired.push(`${result.abilityName} by ${allCombatants.find(c => c.id === entry.actorId)?.name} (${result.perTargetResults.length} targets)`);
            console.log(`    ** AOE: ${result.abilityName} hit ${result.perTargetResults.length} targets`);
          }
        }
        // Update HP from per-target results
        if (result.perTargetResults) {
          for (const tr of result.perTargetResults) {
            hpTracker.set(tr.targetId, Math.max(0, tr.hpAfter));
          }
        }
        // Single target HP update
        if (result.targetId && result.hpAfter !== undefined) {
          hpTracker.set(result.targetId, Math.max(0, result.hpAfter));
        }
      }

      // Monster ability results
      if (result.type === 'monster_ability') {
        if (result.perTargetResults) {
          for (const tr of result.perTargetResults) {
            hpTracker.set(tr.targetId, Math.max(0, tr.hpAfter));
          }
          if (result.perTargetResults.length > 1) {
            aoeAbilitiesFired.push(`${result.abilityName} by ${allCombatants.find(c => c.id === entry.actorId)?.name} (monster, ${result.perTargetResults.length} targets)`);
            console.log(`    ** MONSTER AOE: ${result.abilityName} hit ${result.perTargetResults.length} targets`);
          }
        }
        if (result.targetId && result.hpAfter !== undefined) {
          hpTracker.set(result.targetId, Math.max(0, result.hpAfter));
        }
      }

      // Psion ability results
      if (result.type === 'psion_ability') {
        if (result.perTargetResults) {
          for (const tr of result.perTargetResults) {
            hpTracker.set(tr.targetId, Math.max(0, tr.hpAfter));
          }
        }
      }

      // Status tick damage
      for (const st of entry.statusTicks || []) {
        if (st.damage && st.damage > 0) {
          hpTracker.set(st.combatantId, Math.max(0, st.hpAfter));
        }
        if (st.healing && st.healing > 0) {
          hpTracker.set(st.combatantId, st.hpAfter);
        }
      }
    }

    // Print final round
    const partyHpFinal = playerCombatants.map((c: any) => {
      const hp = hpTracker.get(c.id) ?? 0;
      return `${c.name.split(' ').slice(-1)[0]}:${hp}/${c.maxHp}${hp <= 0 ? '☠' : ''}`;
    });
    const monsterHpFinal = monsterCombatants.map((c: any) => {
      const hp = hpTracker.get(c.id) ?? 0;
      return `${c.name}:${hp}/${c.maxHp}${hp <= 0 ? '☠' : ''}`;
    });
    console.log(`  R${currentRound}: Party[${partyHpFinal.join(', ')}] | Monsters[${monsterHpFinal.join(', ')}]`);

    // Summary (printed after damage tracking below)
    const partyAlive = outcome.finalState.combatants.filter(c => c.team === 0 && c.isAlive).length;
    const monstersAlive = outcome.finalState.combatants.filter(c => c.team === 1 && c.isAlive).length;

    // Collect per-combatant damage dealt (fixed: include class_ability damage)
    const damageDealt = new Map<string, number>();
    let totalHealingDone = 0;
    let clericHealCount = 0;
    for (const entry of outcome.combatLog) {
      const r = entry.result as any;
      const actorName = allCombatants.find(c => c.id === entry.actorId)?.name ?? entry.actorId;
      let entryDmg = 0;

      // totalDamage (AttackResult)
      if (r.totalDamage && r.totalDamage > 0) {
        entryDmg += r.totalDamage;
      }
      // damage field (class_ability, monster_ability single-target)
      if (r.damage && r.damage > 0 && !r.totalDamage) {
        entryDmg += r.damage;
      }
      // perTargetResults (AoE, multi-strike)
      if (r.perTargetResults) {
        for (const tr of r.perTargetResults) {
          if (tr.damage && tr.damage > 0) entryDmg += tr.damage;
        }
      }
      // strikeResults (multi-attack abilities)
      if (r.strikeResults) {
        for (const sr of r.strikeResults) {
          if (sr.damage && sr.damage > 0) entryDmg += sr.damage;
        }
      }

      if (entryDmg > 0) {
        damageDealt.set(actorName, (damageDealt.get(actorName) ?? 0) + entryDmg);
      }

      // Track healing
      if (r.healing && r.healing > 0) {
        totalHealingDone += r.healing;
        const actorIsCleric = playerCombatants.find((c: any) => c.id === entry.actorId && (c as any).characterClass === 'cleric');
        if (actorIsCleric) clericHealCount++;
      }
      if (r.perTargetResults) {
        for (const tr of r.perTargetResults) {
          if (tr.healing && tr.healing > 0) totalHealingDone += tr.healing;
        }
      }

      // Verbose per-action logging for fight 1
      if (fight === 0 && playerIds.includes(entry.actorId)) {
        const miss = r.hit === false ? ' MISS' : '';
        const dmgStr = entryDmg > 0 ? ` dmg=${entryDmg}` : '';
        const healStr = r.healing ? ` heal=${r.healing}` : '';
        const abilityName = r.abilityName ?? (r.type === 'attack' ? 'basic_attack' : r.type);
        console.log(`    [R${entry.round}] ${actorName}: ${abilityName}${miss}${dmgStr}${healStr}`);
      }
    }

    console.log(`\n  OUTCOME: ${outcome.winner === 'team0' ? 'PARTY WIN' : outcome.winner === 'team1' ? 'PARTY WIPE' : outcome.winner}`);
    console.log(`  Rounds: ${outcome.rounds} | Party alive: ${partyAlive}/${partyMembers.length} | Monsters alive: ${monstersAlive}/${monsterNames.length}`);
    console.log(`  Cleric healed ally: ${clericHealedAlly ? 'YES' : 'NO'} (${clericHealCount} heals, ${totalHealingDone} total HP restored)`);
    console.log(`  AoE abilities fired: ${aoeAbilitiesFired.length > 0 ? aoeAbilitiesFired.join('; ') : 'NONE'}`);

    console.log(`\n  Damage dealt:`);
    for (const [name, dmg] of [...damageDealt.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${name}: ${dmg}`);
    }

    // Collect actions taken per combatant
    const actionCounts = new Map<string, Map<string, number>>();
    for (const entry of outcome.combatLog) {
      const actorName = allCombatants.find(c => c.id === entry.actorId)?.name ?? entry.actorId;
      if (!actionCounts.has(actorName)) actionCounts.set(actorName, new Map());
      const counts = actionCounts.get(actorName)!;

      const r = entry.result as any;
      let actionLabel: string = entry.action;
      if (r.abilityName) actionLabel = r.abilityName;
      else if (r.type === 'attack') actionLabel = 'basic_attack';

      counts.set(actionLabel, (counts.get(actionLabel) ?? 0) + 1);
    }

    console.log(`\n  Actions taken:`);
    for (const [name, counts] of actionCounts) {
      const acts = [...counts.entries()].map(([a, c]) => `${a}×${c}`).join(', ');
      console.log(`    ${name}: ${acts}`);
    }

    allFightData.push({
      fight: fight + 1,
      monsterDetails,
      totalMonsterHp,
      totalPartyHp,
      hpRatio: (totalMonsterHp / totalPartyHp * 100).toFixed(0),
      budgetUsed,
      outcome: outcome.winner,
      rounds: outcome.rounds,
      partyAlive,
      monstersAlive,
      clericHealedAlly,
      aoeAbilitiesFired,
      damageDealt: Object.fromEntries(damageDealt),
    });
  }

  // Final aggregate
  console.log('\n' + '='.repeat(80));
  console.log('AGGREGATE SUMMARY');
  console.log('='.repeat(80));

  const wins = allFightData.filter(f => f.outcome === 'team0').length;
  const avgRounds = allFightData.reduce((s, f) => s + f.rounds, 0) / NUM_FIGHTS;
  const avgAlive = allFightData.reduce((s, f) => s + f.partyAlive, 0) / NUM_FIGHTS;
  const healCount = allFightData.filter(f => f.clericHealedAlly).length;
  const aoeCount = allFightData.filter(f => f.aoeAbilitiesFired.length > 0).length;

  console.log(`Win rate: ${wins}/${NUM_FIGHTS} (${(wins/NUM_FIGHTS*100).toFixed(0)}%)`);
  console.log(`Avg rounds survived: ${avgRounds.toFixed(1)}`);
  console.log(`Avg party members alive at end: ${avgAlive.toFixed(1)}`);
  console.log(`Fights where Cleric healed ally: ${healCount}/${NUM_FIGHTS}`);
  console.log(`Fights with AoE usage: ${aoeCount}/${NUM_FIGHTS}`);
  console.log(`Avg monster HP pool: ${(allFightData.reduce((s, f) => s + f.totalMonsterHp, 0) / NUM_FIGHTS).toFixed(0)} vs Party HP: ${totalPartyHp}`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
