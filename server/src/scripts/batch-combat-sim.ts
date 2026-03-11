/**
 * Batch Combat Simulator CLI — Creates per-fight encounter logs for admin dashboard.
 *
 * Subcommands:
 *   run       Execute matchups, write CombatEncounterLog rows to DB
 *   list      List all batch-cli simulation runs
 *   delete    Delete a specific run (--run-id ID)
 *   delete-all Delete all batch-cli runs (--confirm required)
 *
 * Usage:
 *   npm run sim:run -- --race human --class warrior --level 5 --monster Goblin --iterations 50
 *   npm run sim:run -- --grid --config sim-configs/quick-check.json
 *   npm run sim:run -- --pvp --config=pvp-1v1-quick.json
 *   npm run sim:run -- --pvp --group --config=pvp-party-battles.json
 *   npm run sim:list
 *   npm run sim:delete -- --run-id clxxxxxxxxxx
 */

import { db, pool } from '../lib/db';
import { eq, and, like, inArray, desc } from 'drizzle-orm';
import * as schema from '@database/index';
import type { Race } from '@shared/enums';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildSyntheticPlayer,
  buildSyntheticParty,
  buildSyntheticMonster,
  buildPlayerCombatParams,
  getAllRaceIds,
  getAllClassNames,
  getSimSaveProficiencies,
  getSimFeatIds,
  type MonsterStats,
  type MonsterCombatData,
  type PartyConfig,
  type PartyMemberConfig,
} from '../services/combat-simulator';
import {
  selectMonsterGroup,
  expandGroupGrid,
  type GroupRunConfig,
  type GroupMatchup,
  type MonsterRecord,
} from './group-combat-helpers';
import {
  createCharacterCombatant,
  createMonsterCombatant,
  createCombatState,
} from '../lib/combat-engine';
import { resolveTickCombat, type CombatantParams } from '../services/tick-combat-resolver';
import { buildEncounterContext, buildRoundsData, buildSummary } from '../lib/combat-logger';
import { setSimulationRunId } from '../lib/simulation-context';
import type { CombatDamageType, MonsterAbility, MonsterAbilityInstance } from '@shared/types/combat';
import { getAttacksPerAction } from '@shared/data/combat-constants';

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
// Race ID → Race enum string mapping
// ---------------------------------------------------------------------------

const RACE_ID_TO_ENUM: Record<string, Race> = {
  human: 'HUMAN',
  elf: 'ELF',
  dwarf: 'DWARF',
  harthfolk: 'HARTHFOLK',
  orc: 'ORC',
  nethkin: 'NETHKIN',
  drakonid: 'DRAKONID',
  half_elf: 'HALF_ELF',
  half_orc: 'HALF_ORC',
  gnome: 'GNOME',
  merfolk: 'MERFOLK',
  beastfolk: 'BEASTFOLK',
  faefolk: 'FAEFOLK',
  goliath: 'GOLIATH',
  nightborne: 'NIGHTBORNE',
  mosskin: 'MOSSKIN',
  forgeborn: 'FORGEBORN',
  elementari: 'ELEMENTARI',
  revenant: 'REVENANT',
  changeling: 'CHANGELING',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Matchup {
  race: string;
  class: string;
  level: number;
  opponent: string;
  iterations: number;
  tier0Selections?: Record<number, string>;
  specialization?: string;
  featIds?: string[];  // Override default feat picks. If omitted, uses getSimFeatIds()
}

interface GridConfig {
  races: string[];
  classes: string[];
  levels: number[];
  monsters: string[];
  iterationsPerMatchup: number;
}

interface RunConfig {
  matchups?: Matchup[];
  grid?: GridConfig;
  notes?: string;
}

// ---------------------------------------------------------------------------
// PvP Types
// ---------------------------------------------------------------------------

interface PvpPlayerConfig {
  race: string;
  class: string;
  level: number;
  specialization?: string;
  tier0Selections?: Record<number, string>;
  featIds?: string[];
}

interface PvpMatchup {
  player1: PvpPlayerConfig;
  player2: PvpPlayerConfig;
  iterations: number;
}

interface PvpGridConfig {
  classes: string[];
  specializations?: boolean;
  races: string[];
  levels: number[];
  iterationsPerMatchup: number;
}

interface PvpGroupConfig {
  parties: PartyConfig[];
  levels?: number[];
  iterationsPerMatchup: number;
  roundRobin?: boolean;
}

interface PvpRunConfig {
  pvpMatchups?: PvpMatchup[];
  pvpGrid?: PvpGridConfig;
  pvpGroups?: PvpGroupConfig;
  notes?: string;
}

/** Class → specializations mapping (verified against shared/src/data/skills/) */
const CLASS_SPECIALIZATIONS: Record<string, string[]> = {
  warrior: ['berserker', 'guardian', 'warlord'],
  mage: ['elementalist', 'necromancer', 'enchanter'],
  rogue: ['assassin', 'swashbuckler', 'thief'],
  cleric: ['healer', 'paladin', 'inquisitor'],
  ranger: ['beastmaster', 'sharpshooter', 'tracker'],
  bard: ['diplomat', 'battlechanter', 'lorekeeper'],
  psion: ['telepath', 'seer', 'nomad'],
};

// ---------------------------------------------------------------------------
// Arg Parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  command: string;
  race?: string;
  class?: string;
  level?: number;
  monster?: string;
  iterations?: number;
  config?: string;
  grid?: boolean;
  group?: boolean;
  pvp?: boolean;
  notes?: string;
  runId?: string;
  confirm?: boolean;
} {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  const result: ReturnType<typeof parseArgs> = { command };

  for (const arg of args.slice(command === 'run' || command === 'list' || command === 'delete' || command === 'delete-all' ? 1 : 0)) {
    if (arg.startsWith('--race=')) result.race = arg.split('=')[1];
    else if (arg.startsWith('--class=')) result.class = arg.split('=')[1];
    else if (arg.startsWith('--level=')) result.level = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--monster=')) result.monster = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--iterations=')) result.iterations = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--config=')) result.config = arg.split('=').slice(1).join('=');
    else if (arg === '--grid') result.grid = true;
    else if (arg === '--group') result.group = true;
    else if (arg === '--pvp') result.pvp = true;
    else if (arg.startsWith('--notes=')) result.notes = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--run-id=')) result.runId = arg.split('=')[1];
    else if (arg === '--confirm') result.confirm = true;
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return result;
}

function printUsage(): void {
  console.log(`
Batch Combat Simulator CLI

Usage:
  npm run sim:run -- [options]     Run combat simulations
  npm run sim:list                 List all batch-cli runs
  npm run sim:delete -- --run-id=ID  Delete a specific run
  npm run sim:run -- delete-all --confirm  Delete all batch-cli runs

Run Options:
  --race=NAME          Race (or ALL for all 20 races)
  --class=NAME         Class (or ALL for all 7 classes)
  --level=N            Level (1-50)
  --monster=NAME       Monster name (or ALL for all monsters)
  --iterations=N       Fights per matchup (default: 100)
  --config=PATH        JSON config file (relative to sim-configs/)
  --grid               Use grid expansion mode
  --group              Use group (5v5 party) mode with groupGrid/groupMatchups config
  --pvp                PvP mode: player vs player (1v1 or party vs party)
  --notes="text"       Notes for this run

Examples:
  npm run sim:run -- --race human --class warrior --level 5 --monster Goblin --iterations 50
  npm run sim:run -- --race ALL --class ALL --level 5 --monster Goblin --iterations 100
  npm run sim:run -- --config=quick-check.json
  npm run sim:run -- --config=full-sweep.json --notes="Post-balance patch"
  npm run sim:run -- --group --config=group-baseline.json
  npm run sim:run -- --pvp --config=pvp-1v1-quick.json
  npm run sim:run -- --pvp --group --config=pvp-party-battles.json
`);
}

// ---------------------------------------------------------------------------
// Config Loading
// ---------------------------------------------------------------------------

function loadConfig(configPath: string): RunConfig {
  // Try relative to sim-configs/ first, then absolute
  let resolved = path.resolve(__dirname, 'sim-configs', configPath);
  if (!fs.existsSync(resolved)) {
    resolved = path.resolve(configPath);
  }
  if (!fs.existsSync(resolved)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
}

// ---------------------------------------------------------------------------
// Build Matchups
// ---------------------------------------------------------------------------

function buildMatchups(
  args: ReturnType<typeof parseArgs>,
  allMonsterNames: string[],
): Matchup[] {
  // If --config is provided, load from file
  if (args.config) {
    const config = loadConfig(args.config);
    if (config.matchups) return config.matchups;
    if (config.grid) {
      return expandGrid(config.grid, allMonsterNames);
    }
    console.error('Config file must have "matchups" or "grid" key');
    process.exit(1);
  }

  // Build from CLI args
  const allRaces = getAllRaceIds();
  const allClasses = getAllClassNames();
  const iterations = args.iterations ?? 100;

  const races = args.race?.toUpperCase() === 'ALL' ? allRaces : [args.race ?? 'human'];
  const classes = args.class?.toUpperCase() === 'ALL' ? allClasses : [args.class ?? 'warrior'];
  const levels = args.level ? [args.level] : [5];
  const monsters = args.monster?.toUpperCase() === 'ALL' ? allMonsterNames : [args.monster ?? 'Goblin'];

  return expandGridFromArrays(races, classes, levels, monsters, iterations);
}

function expandGrid(grid: GridConfig, allMonsterNames: string[]): Matchup[] {
  const allRaces = getAllRaceIds();
  const allClasses = getAllClassNames();

  const races = grid.races[0]?.toUpperCase() === 'ALL' ? allRaces : grid.races;
  const classes = grid.classes[0]?.toUpperCase() === 'ALL' ? allClasses : grid.classes;
  const monsters = grid.monsters[0]?.toUpperCase() === 'ALL' ? allMonsterNames : grid.monsters;

  return expandGridFromArrays(races, classes, grid.levels, monsters, grid.iterationsPerMatchup);
}

function expandGridFromArrays(
  races: string[], classes: string[], levels: number[],
  monsters: string[], iterations: number,
): Matchup[] {
  const matchups: Matchup[] = [];
  for (const race of races) {
    for (const cls of classes) {
      for (const lvl of levels) {
        for (const mon of monsters) {
          matchups.push({ race, class: cls, level: lvl, opponent: mon, iterations });
        }
      }
    }
  }
  return matchups;
}

// ---------------------------------------------------------------------------
// Run Command
// ---------------------------------------------------------------------------

async function runCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  const startTime = Date.now();

  // Fetch all monsters from DB
  console.log('Fetching monsters from database...');
  const dbMonsters = await db.query.monsters.findMany();
  const monsterMap = new Map(dbMonsters.map(m => [
    m.name.toLowerCase(),
    {
      name: m.name,
      level: m.level,
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
  const allMonsterNames = dbMonsters.map(m => m.name);

  // Build matchup list
  const matchups = buildMatchups(args, allMonsterNames);
  if (matchups.length === 0) {
    console.error('No matchups generated. Check configuration.');
    process.exit(1);
  }

  const totalFights = matchups.reduce((sum, m) => sum + m.iterations, 0);
  console.log(`Matchups: ${matchups.length} | Total fights: ${totalFights.toLocaleString()}`);

  // Create SimulationRun
  const [run] = await db.insert(schema.simulationRuns).values({
    id: crypto.randomUUID(),
    tickCount: 0,
    botCount: 0,
    config: { source: 'batch-cli', matchups: matchups.length, totalFights, grid: args.config ?? null },
    status: 'running',
    notes: args.notes || `Batch CLI: ${matchups.length} matchups, ${totalFights} fights`,
  }).returning();
  const runId = run.id;
  currentRunId = runId; // for SIGINT handler
  const runShort = runId.slice(-8);
  console.log(`SimulationRun created: ${runId}`);

  // Set simulation context so logPveCombat tags rows
  setSimulationRunId(runId);

  // Create test characters for each unique {race, class, level}
  const charKey = (race: string, cls: string, level: number) => `${race}-${cls}-${level}`;
  const charMap = new Map<string, string>(); // key → character ID

  const uniqueCombos = new Set<string>();
  for (const m of matchups) {
    uniqueCombos.add(charKey(m.race, m.class, m.level));
  }

  console.log(`Creating ${uniqueCombos.size} test characters...`);
  for (const combo of uniqueCombos) {
    const [race, cls, levelStr] = combo.split('-');
    const level = parseInt(levelStr, 10);
    const raceEnum = RACE_ID_TO_ENUM[race];
    if (!raceEnum) {
      console.error(`Unknown race: ${race} — skipping`);
      continue;
    }

    const player = buildSyntheticPlayer({ race, class: cls, level });
    if (!player) {
      console.error(`Invalid player config: ${race} ${cls} L${level} — skipping`);
      continue;
    }

    const charId = `bsim-c-${runShort}-${race}-${cls}-${level}`;
    const userId = `bsim-u-${runShort}-${race}-${cls}-${level}`;

    await db.insert(schema.users).values({
      id: userId,
      username: `BatchSim_${race}_${cls}_L${level}_${runShort}`,
      email: `bs-${runShort}-${race}-${cls}-${level}@sim.local`,
      passwordHash: 'batch-sim-no-login',
      isTestAccount: true,
    });

    await db.insert(schema.characters).values({
      id: charId,
      userId,
      name: player.name,
      race: raceEnum,
      class: cls,
      level,
      health: player.hp,
      maxHealth: player.maxHp,
      stats: player.stats,
      gold: 0,
      xp: 0,
    });

    charMap.set(combo, charId);
  }

  // Fight loop — all in-memory, no DB calls per fight
  let completedFights = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  let totalRoundsSum = 0;
  let errors = 0;

  // Per-class and per-monster stats
  const classStats = new Map<string, { wins: number; total: number }>();
  const monsterStats = new Map<string, { wins: number; total: number }>();

  // Collect encounter log rows in memory for bulk insert
  const BATCH_SIZE = 500;
  let pendingRows: any[] = [];

  async function flushRows(): Promise<void> {
    if (pendingRows.length === 0) return;
    await db.insert(schema.combatEncounterLogs).values(pendingRows);
    pendingRows = [];
  }

  const progressInterval = Math.max(1, Math.floor(totalFights / 20)); // Report every ~5%

  for (let mIdx = 0; mIdx < matchups.length; mIdx++) {
    const matchup = matchups[mIdx];
    const characterId = charMap.get(charKey(matchup.race, matchup.class, matchup.level));
    if (!characterId) {
      errors++;
      continue;
    }

    const player = buildSyntheticPlayer({
      race: matchup.race,
      class: matchup.class,
      level: matchup.level,
    }, matchup.featIds);
    if (!player) {
      errors++;
      continue;
    }

    const monsterData = monsterMap.get(matchup.opponent.toLowerCase());
    if (!monsterData) {
      console.error(`Monster not found: ${matchup.opponent}`);
      errors++;
      continue;
    }

    const monster = buildSyntheticMonster(monsterData.name, monsterData.level, monsterData.stats, monsterData.combatData);
    const playerParams = buildPlayerCombatParams(player, {
      tier0Selections: matchup.tier0Selections,
      specialization: matchup.specialization,
    });
    let matchupWins = 0;

    for (let i = 0; i < matchup.iterations; i++) {
      try {
        // Build combatants
        const playerCombatant = createCharacterCombatant(
          characterId, player.name, 0,
          player.stats, player.level,
          player.hp, player.maxHp,
          player.equipmentAC, player.weapon,
          player.spellSlots, player.proficiencyBonus,
        );
        (playerCombatant as any).characterClass = player.class;
        (playerCombatant as any).race = player.race;
        (playerCombatant as any).nonProficientArmor = false;
        (playerCombatant as any).nonProficientWeapon = false;
        (playerCombatant as any).saveProficiencies = getSimSaveProficiencies(player.class, player.level);
        (playerCombatant as any).extraAttacks = getAttacksPerAction(player.class, player.level);
        (playerCombatant as any).featIds = matchup.featIds ?? getSimFeatIds(player.class, player.level);

        const monsterCombatant = createMonsterCombatant(
          `sim-monster-${mIdx}-${i}`, monster.name, 1,
          monster.stats, monster.level,
          monster.hp, monster.ac,
          monster.weapon, 0,
          monster.combatData ? buildMonsterCombatOptions(monster.combatData) : undefined,
        );

        const state = createCombatState(`batch-${mIdx}-${i}`, 'PVE', [playerCombatant, monsterCombatant]);

        const paramsMap = new Map<string, CombatantParams>();
        paramsMap.set(characterId, { ...playerParams, id: characterId });

        const outcome = resolveTickCombat(state, paramsMap);

        const outcomeStr = outcome.winner === 'team0' ? 'win'
          : outcome.winner === 'team1' ? 'loss'
          : outcome.winner === 'fled' ? 'flee' : 'draw';

        if (outcome.winner === 'team0') { totalWins++; matchupWins++; }
        else if (outcome.winner === 'team1') totalLosses++;
        else totalDraws++;

        totalRoundsSum += outcome.rounds;

        // Build encounter log row data in-memory
        const fs = outcome.finalState;
        const playerC = fs.combatants.find(c => c.id === characterId);
        const monsterC = fs.combatants.find(c => c.entityType === 'monster');
        const encounterContext = buildEncounterContext(fs);
        const rounds = buildRoundsData(fs);
        const summary = buildSummary(
          outcomeStr, fs.round, player.name, monster.name,
          player.hp, playerC?.currentHp ?? 0,
          monster.hp, monsterC?.currentHp ?? 0,
        );

        pendingRows.push({
          id: crypto.randomUUID(),
          type: 'pve',
          sessionId: `batch-${mIdx}-${i}`,
          characterId,
          characterName: player.name,
          opponentId: monsterC?.id ?? null,
          opponentName: monster.name,
          townId: null,
          outcome: outcomeStr,
          totalRounds: fs.round,
          characterStartHp: player.hp,
          characterEndHp: playerC?.currentHp ?? 0,
          opponentStartHp: monster.hp,
          opponentEndHp: monsterC?.currentHp ?? 0,
          characterWeapon: player.weapon.name,
          opponentWeapon: monster.weapon.name,
          xpAwarded: 0,
          goldAwarded: 0,
          lootDropped: '',
          rounds: [{ _encounterContext: encounterContext }, ...rounds] as any,
          summary,
          triggerSource: 'batch_sim',
          simulationTick: mIdx,
          simulationRunId: runId,
        });

        completedFights++;

        // Flush batch to DB when buffer is full
        if (pendingRows.length >= BATCH_SIZE) {
          await flushRows();
        }

        // Progress reporting
        if (completedFights % progressInterval === 0 || completedFights === totalFights) {
          const pct = ((completedFights / totalFights) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\r[${completedFights.toLocaleString()}/${totalFights.toLocaleString()}] ${pct}% — ${elapsed}s`);
        }
      } catch (fightErr) {
        errors++;
      }
    }

    // Track per-class stats
    const clsKey = matchup.class;
    const existing = classStats.get(clsKey) || { wins: 0, total: 0 };
    existing.wins += matchupWins;
    existing.total += matchup.iterations;
    classStats.set(clsKey, existing);

    // Track per-monster stats
    const monKey = monsterData.name;
    const monExisting = monsterStats.get(monKey) || { wins: 0, total: 0 };
    monExisting.wins += matchupWins;
    monExisting.total += matchup.iterations;
    monsterStats.set(monKey, monExisting);
  }

  // Flush remaining rows
  await flushRows();

  console.log(''); // newline after progress

  // Update SimulationRun
  await db.update(schema.simulationRuns)
    .set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      encounterCount: completedFights,
    })
    .where(eq(schema.simulationRuns.id, runId));

  // Clear context
  setSimulationRunId(null);

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const winRate = totalFights > 0 ? ((totalWins / totalFights) * 100).toFixed(1) : '0.0';
  const avgRounds = totalFights > 0 ? (totalRoundsSum / totalFights).toFixed(1) : '0';

  console.log(`\n=== Batch Combat Simulation Complete ===`);
  console.log(`Run ID: ${runId}`);
  console.log(`Matchups: ${matchups.length} | Total fights: ${completedFights.toLocaleString()} | Duration: ${duration}s`);
  console.log(`Overall player win rate: ${winRate}% | Avg rounds: ${avgRounds}`);
  if (errors > 0) console.log(`Errors: ${errors}`);

  console.log(`\nBy Class:`);
  for (const [cls, data] of classStats) {
    const wr = ((data.wins / data.total) * 100).toFixed(1);
    console.log(`  ${cls}: ${wr}%`);
  }

  console.log(`\nBy Monster:`);
  for (const [mon, data] of monsterStats) {
    const wr = ((data.wins / data.total) * 100).toFixed(1);
    console.log(`  ${mon}: ${wr}% player wins`);
  }

  // Balance alerts
  console.log(`\nBalance Alerts:`);
  let alertCount = 0;
  for (const [cls, data] of classStats) {
    const wr = (data.wins / data.total) * 100;
    if (wr < 45 || wr > 85) {
      console.log(`  ! ${cls}: ${wr.toFixed(1)}% (expected 45-85%)`);
      alertCount++;
    }
  }
  for (const [mon, data] of monsterStats) {
    const wr = (data.wins / data.total) * 100;
    if (wr < 30) {
      console.log(`  ! ${mon}: ${wr.toFixed(1)}% player survival (very hard)`);
      alertCount++;
    } else if (wr > 95) {
      console.log(`  ! ${mon}: ${wr.toFixed(1)}% player survival (too easy)`);
      alertCount++;
    }
  }
  if (alertCount === 0) console.log('  None');

  console.log(`\nEncounter logs written: ${completedFights.toLocaleString()} | Test characters: ${charMap.size}`);
  console.log(`View in admin: Admin > Combat > Simulation > [select run]`);
  console.log(`To delete: npm run sim:delete -- --run-id=${runId}`);
}

// ---------------------------------------------------------------------------
// Group Combat Command
// ---------------------------------------------------------------------------

async function runGroupCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  if (!args.config) {
    console.error('--config is required for --group mode');
    process.exit(1);
  }

  const startTime = Date.now();
  const config = loadConfig(args.config) as GroupRunConfig;

  // Fetch all monsters from DB
  console.log('Fetching monsters from database...');
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

  // Build matchup list
  let matchups: GroupMatchup[];
  if (config.groupGrid) {
    matchups = expandGroupGrid(config.groupGrid);
  } else if (config.groupMatchups) {
    matchups = config.groupMatchups;
  } else {
    console.error('Config must have "groupGrid" or "groupMatchups" key');
    process.exit(1);
  }

  const totalFights = matchups.reduce((sum, m) => sum + m.iterations, 0);
  console.log(`Group matchups: ${matchups.length} | Total fights: ${totalFights.toLocaleString()}`);

  // Create SimulationRun
  const [run] = await db.insert(schema.simulationRuns).values({
    id: crypto.randomUUID(),
    tickCount: 0,
    botCount: 0,
    config: { source: 'batch-cli-group', matchups: matchups.length, totalFights, configFile: args.config },
    status: 'running',
    notes: args.notes || `Group CLI: ${matchups.length} matchups, ${totalFights} fights`,
  }).returning();
  const runId = run.id;
  currentRunId = runId;
  const runShort = runId.slice(-8);
  console.log(`SimulationRun created: ${runId}`);
  setSimulationRunId(runId);

  // Create test characters — one per unique {race, class, level}
  const charKey = (race: string, cls: string, level: number) => `${race}-${cls}-${level}`;
  const charMap = new Map<string, string>();
  const uniqueCombos = new Set<string>();

  for (const matchup of matchups) {
    for (const member of matchup.party.members) {
      const level = matchup.party.partyLevel ?? member.level;
      uniqueCombos.add(charKey(member.race, member.class, level));
    }
  }

  console.log(`Creating ${uniqueCombos.size} test characters...`);
  for (const combo of uniqueCombos) {
    const [race, cls, levelStr] = combo.split('-');
    const level = parseInt(levelStr, 10);
    const raceEnum = RACE_ID_TO_ENUM[race];
    if (!raceEnum) continue;

    const player = buildSyntheticPlayer({ race, class: cls, level });
    if (!player) continue;

    const charId = `bsim-g-${runShort}-${race}-${cls}-${level}`;
    const userId = `bsim-gu-${runShort}-${race}-${cls}-${level}`;

    await db.insert(schema.users).values({
      id: userId,
      username: `GrpSim_${race}_${cls}_L${level}_${runShort}`,
      email: `gs-${runShort}-${race}-${cls}-${level}@sim.local`,
      passwordHash: 'batch-sim-no-login',
      isTestAccount: true,
    });

    await db.insert(schema.characters).values({
      id: charId,
      userId,
      name: player.name,
      race: raceEnum,
      class: cls,
      level,
      health: player.hp,
      maxHealth: player.maxHp,
      stats: player.stats,
      gold: 0,
      xp: 0,
    });

    charMap.set(combo, charId);
  }

  // Fight loop
  let completedFights = 0;
  let errors = 0;

  // Per-matchup tracking
  interface MatchupStats {
    partyName: string;
    level: number;
    difficulty: string;
    wins: number;
    total: number;
    roundsSum: number;
    partyDeathsSum: number;
    monsterCountSum: number;
  }
  const matchupResults: MatchupStats[] = [];

  const BATCH_SIZE = 500;
  let pendingRows: any[] = [];

  async function flushRows(): Promise<void> {
    if (pendingRows.length === 0) return;
    await db.insert(schema.combatEncounterLogs).values(pendingRows);
    pendingRows = [];
  }

  const progressInterval = Math.max(1, Math.floor(totalFights / 20));

  for (let mIdx = 0; mIdx < matchups.length; mIdx++) {
    const matchup = matchups[mIdx];
    const partyLevel = matchup.party.partyLevel ?? matchup.party.members[0]?.level ?? 10;

    // Build party
    const partyMembers = buildSyntheticParty(matchup.party);
    if (partyMembers.length === 0) {
      console.error(`Failed to build party: ${matchup.party.name}`);
      errors++;
      continue;
    }

    // Select monster group
    const monsterNames = selectMonsterGroup(matchup.monsterGroup, allMonsterRecords);
    if (monsterNames.length === 0) {
      console.error(`No monsters selected for matchup ${mIdx}`);
      errors++;
      continue;
    }

    const stats: MatchupStats = {
      partyName: matchup.party.name,
      level: partyLevel,
      difficulty: matchup.monsterGroup.difficulty,
      wins: 0,
      total: matchup.iterations,
      roundsSum: 0,
      partyDeathsSum: 0,
      monsterCountSum: monsterNames.length * matchup.iterations,
    };

    // Get character IDs for party members
    const partyCharIds: string[] = [];
    for (const member of matchup.party.members) {
      const level = matchup.party.partyLevel ?? member.level;
      const key = charKey(member.race, member.class, level);
      const cid = charMap.get(key);
      if (cid) partyCharIds.push(cid);
    }

    for (let iter = 0; iter < matchup.iterations; iter++) {
      try {
        // Re-select monsters each iteration for variety in cr_match mode
        const iterMonsterNames = matchup.monsterGroup.method === 'cr_match'
          ? selectMonsterGroup(matchup.monsterGroup, allMonsterRecords)
          : monsterNames;

        // Build player combatants (team 0)
        const playerCombatants: any[] = [];
        const paramsMap = new Map<string, CombatantParams>();

        for (let pi = 0; pi < partyMembers.length; pi++) {
          const player = partyMembers[pi];
          const member = matchup.party.members[pi];
          const charId = partyCharIds[pi] || `bsim-g-${runShort}-${pi}`;
          const playerId = `grp-p${pi}-${mIdx}-${iter}`;

          const combatant = createCharacterCombatant(
            playerId, player.name, 0,
            player.stats, player.level,
            player.hp, player.maxHp,
            player.equipmentAC, player.weapon,
            player.spellSlots, player.proficiencyBonus,
          );
          (combatant as any).characterClass = player.class;
          (combatant as any).race = player.race;
          (combatant as any).nonProficientArmor = false;
          (combatant as any).nonProficientWeapon = false;
          (combatant as any).saveProficiencies = getSimSaveProficiencies(player.class, player.level);
          (combatant as any).extraAttacks = getAttacksPerAction(player.class, player.level);
          (combatant as any).featIds = member?.featIds ?? getSimFeatIds(player.class, player.level);
          playerCombatants.push(combatant);

          const playerParams = buildPlayerCombatParams(player, {
            tier0Selections: member?.tier0Selections,
            specialization: member?.specialization,
          });
          paramsMap.set(playerId, { ...playerParams, id: playerId });
        }

        // Build monster combatants (team 1)
        const monsterCombatants: any[] = [];
        for (let mi = 0; mi < iterMonsterNames.length; mi++) {
          const mData = monsterMap.get(iterMonsterNames[mi].toLowerCase());
          if (!mData) continue;

          const monster = buildSyntheticMonster(mData.name, mData.level, mData.stats, mData.combatData);
          const monsterId = `grp-m${mi}-${mIdx}-${iter}`;

          const combatant = createMonsterCombatant(
            monsterId, monster.name, 1,
            monster.stats, monster.level,
            monster.hp, monster.ac,
            monster.weapon, 0,
            monster.combatData ? buildMonsterCombatOptions(monster.combatData) : undefined,
          );
          monsterCombatants.push(combatant);
        }

        if (monsterCombatants.length === 0) {
          errors++;
          continue;
        }

        // Create combat state
        const allCombatants = [...playerCombatants, ...monsterCombatants];
        const sessionId = `grp-${mIdx}-${iter}`;
        const state = createCombatState(sessionId, 'PVE', allCombatants);

        // Resolve combat
        const outcome = resolveTickCombat(state, paramsMap);

        const outcomeStr = outcome.winner === 'team0' ? 'win'
          : outcome.winner === 'team1' ? 'loss'
          : outcome.winner === 'fled' ? 'flee' : 'draw';

        if (outcome.winner === 'team0') stats.wins++;
        stats.roundsSum += outcome.rounds;

        // Count party deaths
        const partyDead = outcome.finalState.combatants.filter(
          c => c.team === 0 && !c.isAlive
        ).length;
        stats.partyDeathsSum += partyDead;

        // Build encounter log
        const fs = outcome.finalState;
        const firstPlayer = fs.combatants.find(c => c.team === 0);
        const monsterGroupName = iterMonsterNames.join(', ');
        const primaryCharId = partyCharIds[0] || `bsim-g-${runShort}-0`;

        const encounterContext = buildEncounterContext(fs);
        const rounds = buildRoundsData(fs);
        const totalPartyHp = partyMembers.reduce((s, p) => s + p.hp, 0);
        const totalPartyEndHp = fs.combatants
          .filter(c => c.team === 0)
          .reduce((s, c) => s + Math.max(0, c.currentHp), 0);
        const totalMonsterHp = monsterCombatants.reduce((s: number, c: any) => s + c.maxHp, 0);
        const totalMonsterEndHp = fs.combatants
          .filter(c => c.team === 1)
          .reduce((s, c) => s + Math.max(0, c.currentHp), 0);

        const summary = buildSummary(
          outcomeStr, fs.round,
          matchup.party.name, monsterGroupName,
          totalPartyHp, totalPartyEndHp,
          totalMonsterHp, totalMonsterEndHp,
        );

        pendingRows.push({
          id: crypto.randomUUID(),
          type: 'pve',
          sessionId,
          characterId: primaryCharId,
          characterName: matchup.party.name,
          opponentId: null,
          opponentName: monsterGroupName,
          townId: null,
          outcome: outcomeStr,
          totalRounds: fs.round,
          characterStartHp: totalPartyHp,
          characterEndHp: totalPartyEndHp,
          opponentStartHp: totalMonsterHp,
          opponentEndHp: totalMonsterEndHp,
          characterWeapon: `Party of ${partyMembers.length}`,
          opponentWeapon: `${iterMonsterNames.length} monsters`,
          xpAwarded: 0,
          goldAwarded: 0,
          lootDropped: '',
          rounds: [{ _encounterContext: encounterContext }, ...rounds] as any,
          summary,
          triggerSource: 'batch_sim_group',
          simulationTick: mIdx,
          simulationRunId: runId,
        });

        completedFights++;

        if (pendingRows.length >= BATCH_SIZE) {
          await flushRows();
        }

        if (completedFights % progressInterval === 0 || completedFights === totalFights) {
          const pct = ((completedFights / totalFights) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\r[${completedFights.toLocaleString()}/${totalFights.toLocaleString()}] ${pct}% — ${elapsed}s`);
        }
      } catch (fightErr) {
        errors++;
      }
    }

    matchupResults.push(stats);
  }

  await flushRows();
  console.log('');

  // Update SimulationRun
  await db.update(schema.simulationRuns)
    .set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      encounterCount: completedFights,
    })
    .where(eq(schema.simulationRuns.id, runId));
  setSimulationRunId(null);

  // Print summary table
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Group Combat Simulation Complete ===`);
  console.log(`Run ID: ${runId}`);
  console.log(`Matchups: ${matchups.length} | Total fights: ${completedFights.toLocaleString()} | Duration: ${duration}s`);
  if (errors > 0) console.log(`Errors: ${errors}`);

  console.log(`\n${'Party'.padEnd(18)} | ${'Level'.padEnd(5)} | ${'Difficulty'.padEnd(10)} | ${'Win%'.padEnd(6)} | ${'AvgRounds'.padEnd(9)} | ${'AvgDeaths'.padEnd(9)} | ${'Monsters'.padEnd(8)}`);
  console.log('-'.repeat(85));

  for (const ms of matchupResults) {
    const winPct = ms.total > 0 ? ((ms.wins / ms.total) * 100).toFixed(0) : '0';
    const avgRounds = ms.total > 0 ? (ms.roundsSum / ms.total).toFixed(1) : '0';
    const avgDeaths = ms.total > 0 ? (ms.partyDeathsSum / ms.total).toFixed(1) : '0';
    const avgMonsters = ms.total > 0 ? (ms.monsterCountSum / ms.total).toFixed(1) : '0';
    console.log(
      `${ms.partyName.padEnd(18)} | ${String(ms.level).padEnd(5)} | ${ms.difficulty.padEnd(10)} | ${(winPct + '%').padEnd(6)} | ${avgRounds.padEnd(9)} | ${avgDeaths.padEnd(9)} | ${avgMonsters.padEnd(8)}`
    );
  }

  // Balance alerts
  console.log(`\nBalance Alerts:`);
  let alertCount = 0;
  for (const ms of matchupResults) {
    const wr = ms.total > 0 ? (ms.wins / ms.total) * 100 : 0;
    if (ms.difficulty === 'medium' && wr < 60) {
      console.log(`  ! ${ms.partyName} L${ms.level} medium: ${wr.toFixed(0)}% (expected 60%+)`);
      alertCount++;
    } else if (ms.difficulty === 'hard' && wr < 40) {
      console.log(`  ! ${ms.partyName} L${ms.level} hard: ${wr.toFixed(0)}% (expected 40%+)`);
      alertCount++;
    } else if (ms.difficulty === 'deadly' && wr > 80) {
      console.log(`  ! ${ms.partyName} L${ms.level} deadly: ${wr.toFixed(0)}% (too easy for deadly)`);
      alertCount++;
    }
  }
  if (alertCount === 0) console.log('  None');

  console.log(`\nEncounter logs written: ${completedFights.toLocaleString()} | Test characters: ${charMap.size}`);
  console.log(`To delete: npm run sim:delete -- --run-id=${runId}`);
}

// ---------------------------------------------------------------------------
// List Command
// ---------------------------------------------------------------------------

async function listCommand(): Promise<void> {
  // Drizzle doesn't support JSON path queries; query all recent and filter
  const allRuns = await db.query.simulationRuns.findMany({
    orderBy: desc(schema.simulationRuns.startedAt),
    limit: 200,
  });

  const runs = allRuns.filter(r => {
    const config = r.config as any;
    return config?.source === 'batch-cli' || config?.source === 'batch-cli-group'
      || config?.source === 'batch-cli-pvp' || config?.source === 'batch-cli-pvp-group';
  });

  if (runs.length === 0) {
    console.log('No batch-cli simulation runs found.');
    return;
  }

  console.log(`${'ID'.padEnd(28)} | ${'Started'.padEnd(18)} | ${'Status'.padEnd(10)} | ${'Fights'.padEnd(8)} | Notes`);
  console.log('-'.repeat(100));

  for (const run of runs) {
    const started = run.startedAt.replace('T', ' ').slice(0, 16);
    const notes = (run.notes || '').slice(0, 40);
    console.log(
      `${run.id.padEnd(28)} | ${started.padEnd(18)} | ${run.status.padEnd(10)} | ${String(run.encounterCount).padEnd(8)} | ${notes}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Delete Command
// ---------------------------------------------------------------------------

async function deleteCommand(runId: string): Promise<void> {
  const run = await db.query.simulationRuns.findFirst({
    where: eq(schema.simulationRuns.id, runId),
  });
  if (!run) {
    console.error(`SimulationRun not found: ${runId}`);
    process.exit(1);
  }

  const runShort = runId.slice(-8);
  console.log(`Deleting run ${runId}...`);

  // 1. Delete test users (cascade → characters → encounter logs)
  // Try all known prefixes: bsim-u (solo PvE), bsim-gu (group PvE), pvpsim-u (PvP 1v1), pvpsim-gu (PvP group)
  let userCount = 0;
  for (const prefix of [`bsim-u-${runShort}%`, `bsim-gu-${runShort}%`, `pvpsim-u-${runShort}%`, `pvpsim-gu-${runShort}%`]) {
    const result = await db.delete(schema.users).where(
      and(
        eq(schema.users.isTestAccount, true),
        like(schema.users.id, prefix),
      ),
    );
    userCount += result.rowCount ?? 0;
  }
  console.log(`  Deleted ${userCount} test users (+ cascaded characters & logs)`);

  // 2. Delete any remaining encounter logs for this run (safety net for non-batch logs)
  const logResult = await db.delete(schema.combatEncounterLogs).where(
    eq(schema.combatEncounterLogs.simulationRunId, runId),
  );
  const logCount = logResult.rowCount ?? 0;
  if (logCount > 0) {
    console.log(`  Deleted ${logCount} remaining encounter logs`);
  }

  // 3. Delete the SimulationRun
  await db.delete(schema.simulationRuns).where(eq(schema.simulationRuns.id, runId));
  console.log(`  Deleted SimulationRun record`);
  console.log('Done.');
}

async function deleteAllCommand(confirm: boolean): Promise<void> {
  if (!confirm) {
    console.error('This will delete ALL batch-cli simulation runs. Pass --confirm to proceed.');
    process.exit(1);
  }

  // Drizzle doesn't support JSON path queries; query all and filter
  const allRuns = await db.query.simulationRuns.findMany();
  const runs = allRuns.filter(r => {
    const config = r.config as any;
    return config?.source === 'batch-cli' || config?.source === 'batch-cli-group'
      || config?.source === 'batch-cli-pvp' || config?.source === 'batch-cli-pvp-group';
  });

  if (runs.length === 0) {
    console.log('No batch-cli runs found.');
    return;
  }

  console.log(`Deleting ${runs.length} batch-cli runs...`);

  for (const run of runs) {
    await deleteCommand(run.id);
  }

  // Safety net: delete any orphaned batch-sim users
  const orphanedUsers = await db.delete(schema.users).where(
    and(
      eq(schema.users.isTestAccount, true),
      like(schema.users.username, 'BatchSim_%'),
    ),
  );
  const orphanCount = orphanedUsers.rowCount ?? 0;
  if (orphanCount > 0) {
    console.log(`Cleaned up ${orphanCount} orphaned batch-sim users`);
  }

  console.log('All batch-cli runs deleted.');
}

// ---------------------------------------------------------------------------
// PvP Grid Expansion
// ---------------------------------------------------------------------------

function expandPvpGrid(grid: PvpGridConfig): PvpMatchup[] {
  const allClasses = getAllClassNames();
  const classes = grid.classes[0]?.toUpperCase() === 'ALL' ? allClasses : grid.classes;

  // Build list of combatant configs: class + optional spec
  interface CombatantSpec { class: string; specialization?: string; label: string }
  const specs: CombatantSpec[] = [];

  if (grid.specializations) {
    for (const cls of classes) {
      const classSpecs = CLASS_SPECIALIZATIONS[cls.toLowerCase()];
      if (classSpecs) {
        for (const spec of classSpecs) {
          specs.push({ class: cls, specialization: spec, label: `${cls}/${spec}` });
        }
      }
    }
  } else {
    for (const cls of classes) {
      specs.push({ class: cls, label: cls });
    }
  }

  const matchups: PvpMatchup[] = [];
  const race = grid.races[0] ?? 'human';

  for (const level of grid.levels) {
    // Full matrix including mirrors (i vs i) — each unordered pair once
    for (let i = 0; i < specs.length; i++) {
      for (let j = i; j < specs.length; j++) {
        matchups.push({
          player1: { race, class: specs[i].class, level, specialization: specs[i].specialization },
          player2: { race, class: specs[j].class, level, specialization: specs[j].specialization },
          iterations: grid.iterationsPerMatchup,
        });
      }
    }
  }

  return matchups;
}

function expandPvpGroupMatchups(config: PvpGroupConfig): { party1: PartyConfig; party2: PartyConfig; level: number; iterations: number }[] {
  const levels = config.levels ?? [10];
  const matchups: { party1: PartyConfig; party2: PartyConfig; level: number; iterations: number }[] = [];

  for (const level of levels) {
    const partiesWithLevel = config.parties.map(p => ({
      ...p,
      partyLevel: level,
    }));

    // Round-robin: each unordered pair (including mirrors)
    for (let i = 0; i < partiesWithLevel.length; i++) {
      for (let j = i; j < partiesWithLevel.length; j++) {
        matchups.push({
          party1: partiesWithLevel[i],
          party2: partiesWithLevel[j],
          level,
          iterations: config.iterationsPerMatchup,
        });
      }
    }
  }

  return matchups;
}

// ---------------------------------------------------------------------------
// PvP 1v1 Command
// ---------------------------------------------------------------------------

async function runPvpCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  if (!args.config) {
    console.error('--config is required for --pvp mode');
    process.exit(1);
  }

  const startTime = Date.now();
  const config = loadConfig(args.config) as PvpRunConfig;

  // Build matchup list
  let matchups: PvpMatchup[];
  if (config.pvpGrid) {
    matchups = expandPvpGrid(config.pvpGrid);
  } else if (config.pvpMatchups) {
    matchups = config.pvpMatchups;
  } else {
    console.error('PvP config must have "pvpGrid" or "pvpMatchups" key');
    process.exit(1);
  }

  const totalFights = matchups.reduce((sum, m) => sum + m.iterations, 0);
  console.log(`PvP matchups: ${matchups.length} | Total fights: ${totalFights.toLocaleString()}`);

  // Create SimulationRun
  const [run] = await db.insert(schema.simulationRuns).values({
    id: crypto.randomUUID(),
    tickCount: 0,
    botCount: 0,
    config: { source: 'batch-cli-pvp', matchups: matchups.length, totalFights, configFile: args.config },
    status: 'running',
    notes: args.notes || config.notes || `PvP CLI: ${matchups.length} matchups, ${totalFights} fights`,
  }).returning();
  const runId = run.id;
  currentRunId = runId;
  const runShort = runId.slice(-8);
  console.log(`SimulationRun created: ${runId}`);
  setSimulationRunId(runId);

  // Create test characters for each unique {race, class, level, spec}
  const charKey = (race: string, cls: string, level: number, spec?: string) =>
    `${race}-${cls}-${level}${spec ? `-${spec}` : ''}`;
  const charMap = new Map<string, string>();
  const uniqueCombos = new Set<string>();

  for (const m of matchups) {
    uniqueCombos.add(charKey(m.player1.race, m.player1.class, m.player1.level, m.player1.specialization));
    uniqueCombos.add(charKey(m.player2.race, m.player2.class, m.player2.level, m.player2.specialization));
  }

  console.log(`Creating ${uniqueCombos.size} test characters...`);
  for (const combo of uniqueCombos) {
    const parts = combo.split('-');
    const race = parts[0];
    const cls = parts[1];
    const level = parseInt(parts[2], 10);
    const raceEnum = RACE_ID_TO_ENUM[race];
    if (!raceEnum) {
      console.error(`Unknown race: ${race} — skipping`);
      continue;
    }

    const player = buildSyntheticPlayer({ race, class: cls, level });
    if (!player) {
      console.error(`Invalid player config: ${combo} — skipping`);
      continue;
    }

    const charId = `pvpsim-c-${runShort}-${combo}`;
    const userId = `pvpsim-u-${runShort}-${combo}`;

    await db.insert(schema.users).values({
      id: userId,
      username: `PvpSim_${combo}_${runShort}`.slice(0, 50),
      email: `pvp-${runShort}-${combo}@sim.local`.slice(0, 80),
      passwordHash: 'batch-sim-no-login',
      isTestAccount: true,
    });

    await db.insert(schema.characters).values({
      id: charId,
      userId,
      name: player.name,
      race: raceEnum,
      class: cls,
      level,
      health: player.hp,
      maxHealth: player.maxHp,
      stats: player.stats,
      gold: 0,
      xp: 0,
    });

    charMap.set(combo, charId);
  }

  // Fight loop
  let completedFights = 0;
  let errors = 0;
  let totalDraws = 0;

  // Per-matchup result tracking for matrix output
  // Key: "label1 vs label2", Value: { p1Wins, p2Wins, draws }
  interface PvpMatchupResult {
    p1Label: string;
    p2Label: string;
    level: number;
    p1Wins: number;
    p2Wins: number;
    draws: number;
    total: number;
    roundsSum: number;
  }
  const matchupResults: PvpMatchupResult[] = [];

  const BATCH_SIZE = 500;
  let pendingRows: any[] = [];

  async function flushRows(): Promise<void> {
    if (pendingRows.length === 0) return;
    await db.insert(schema.combatEncounterLogs).values(pendingRows);
    pendingRows = [];
  }

  const progressInterval = Math.max(1, Math.floor(totalFights / 20));

  for (let mIdx = 0; mIdx < matchups.length; mIdx++) {
    const matchup = matchups[mIdx];
    const p1Key = charKey(matchup.player1.race, matchup.player1.class, matchup.player1.level, matchup.player1.specialization);
    const p2Key = charKey(matchup.player2.race, matchup.player2.class, matchup.player2.level, matchup.player2.specialization);
    const p1CharId = charMap.get(p1Key);
    const p2CharId = charMap.get(p2Key);

    if (!p1CharId || !p2CharId) {
      errors++;
      continue;
    }

    const p1 = buildSyntheticPlayer(
      { race: matchup.player1.race, class: matchup.player1.class, level: matchup.player1.level },
      matchup.player1.featIds,
    );
    const p2 = buildSyntheticPlayer(
      { race: matchup.player2.race, class: matchup.player2.class, level: matchup.player2.level },
      matchup.player2.featIds,
    );

    if (!p1 || !p2) {
      errors++;
      continue;
    }

    const p1Label = matchup.player1.specialization
      ? `${matchup.player1.class}/${matchup.player1.specialization}`
      : matchup.player1.class;
    const p2Label = matchup.player2.specialization
      ? `${matchup.player2.class}/${matchup.player2.specialization}`
      : matchup.player2.class;

    const p1Params = buildPlayerCombatParams(p1, {
      tier0Selections: matchup.player1.tier0Selections,
      specialization: matchup.player1.specialization,
    });
    const p2Params = buildPlayerCombatParams(p2, {
      tier0Selections: matchup.player2.tier0Selections,
      specialization: matchup.player2.specialization,
    });

    const result: PvpMatchupResult = {
      p1Label, p2Label,
      level: matchup.player1.level,
      p1Wins: 0, p2Wins: 0, draws: 0,
      total: matchup.iterations,
      roundsSum: 0,
    };

    for (let i = 0; i < matchup.iterations; i++) {
      try {
        const combatantId1 = `pvp-p1-${mIdx}-${i}`;
        const combatantId2 = `pvp-p2-${mIdx}-${i}`;

        const c1 = createCharacterCombatant(
          combatantId1, p1.name, 0,
          p1.stats, p1.level,
          p1.hp, p1.maxHp,
          p1.equipmentAC, p1.weapon,
          p1.spellSlots, p1.proficiencyBonus,
        );
        (c1 as any).characterClass = p1.class;
        (c1 as any).race = p1.race;
        (c1 as any).nonProficientArmor = false;
        (c1 as any).nonProficientWeapon = false;
        (c1 as any).saveProficiencies = getSimSaveProficiencies(p1.class, p1.level);
        (c1 as any).extraAttacks = getAttacksPerAction(p1.class, p1.level);
        (c1 as any).featIds = matchup.player1.featIds ?? getSimFeatIds(p1.class, p1.level);

        const c2 = createCharacterCombatant(
          combatantId2, p2.name, 1,
          p2.stats, p2.level,
          p2.hp, p2.maxHp,
          p2.equipmentAC, p2.weapon,
          p2.spellSlots, p2.proficiencyBonus,
        );
        (c2 as any).characterClass = p2.class;
        (c2 as any).race = p2.race;
        (c2 as any).nonProficientArmor = false;
        (c2 as any).nonProficientWeapon = false;
        (c2 as any).saveProficiencies = getSimSaveProficiencies(p2.class, p2.level);
        (c2 as any).extraAttacks = getAttacksPerAction(p2.class, p2.level);
        (c2 as any).featIds = matchup.player2.featIds ?? getSimFeatIds(p2.class, p2.level);

        const state = createCombatState(`pvp-${mIdx}-${i}`, 'PVP', [c1, c2]);

        const paramsMap = new Map<string, CombatantParams>();
        paramsMap.set(combatantId1, { ...p1Params, id: combatantId1 });
        paramsMap.set(combatantId2, { ...p2Params, id: combatantId2 });

        const outcome = resolveTickCombat(state, paramsMap);

        if (outcome.winner === 'team0') result.p1Wins++;
        else if (outcome.winner === 'team1') result.p2Wins++;
        else { result.draws++; totalDraws++; }

        result.roundsSum += outcome.rounds;

        // Build encounter log
        const fs = outcome.finalState;
        const p1C = fs.combatants.find(c => c.id === combatantId1);
        const p2C = fs.combatants.find(c => c.id === combatantId2);
        const outcomeStr = outcome.winner === 'team0' ? 'win'
          : outcome.winner === 'team1' ? 'loss' : 'draw';

        const encounterContext = buildEncounterContext(fs);
        const rounds = buildRoundsData(fs);
        const summary = buildSummary(
          outcomeStr, fs.round, p1.name, p2.name,
          p1.hp, p1C?.currentHp ?? 0,
          p2.hp, p2C?.currentHp ?? 0,
        );

        pendingRows.push({
          id: crypto.randomUUID(),
          type: 'pvp',
          sessionId: `pvp-${mIdx}-${i}`,
          characterId: p1CharId,
          characterName: p1.name,
          opponentId: p2CharId,
          opponentName: p2.name,
          townId: null,
          outcome: outcomeStr,
          totalRounds: fs.round,
          characterStartHp: p1.hp,
          characterEndHp: p1C?.currentHp ?? 0,
          opponentStartHp: p2.hp,
          opponentEndHp: p2C?.currentHp ?? 0,
          characterWeapon: p1.weapon.name,
          opponentWeapon: p2.weapon.name,
          xpAwarded: 0,
          goldAwarded: 0,
          lootDropped: '',
          rounds: [{ _encounterContext: encounterContext }, ...rounds] as any,
          summary,
          triggerSource: 'batch_sim_pvp',
          simulationTick: mIdx,
          simulationRunId: runId,
        });

        completedFights++;

        if (pendingRows.length >= BATCH_SIZE) {
          await flushRows();
        }

        if (completedFights % progressInterval === 0 || completedFights === totalFights) {
          const pct = ((completedFights / totalFights) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\r[${completedFights.toLocaleString()}/${totalFights.toLocaleString()}] ${pct}% — ${elapsed}s`);
        }
      } catch (fightErr) {
        errors++;
      }
    }

    matchupResults.push(result);
  }

  await flushRows();
  console.log('');

  // Update SimulationRun
  await db.update(schema.simulationRuns)
    .set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      encounterCount: completedFights,
    })
    .where(eq(schema.simulationRuns.id, runId));
  setSimulationRunId(null);

  // Print results
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  printPvpMatrix(matchupResults, totalFights, completedFights, totalDraws, errors, duration, runId);

  // Write markdown summary
  writePvpSummaryFile(matchupResults, totalFights, completedFights, totalDraws, errors, duration, runId, args.config!);
}

// ---------------------------------------------------------------------------
// PvP Group Command
// ---------------------------------------------------------------------------

async function runPvpGroupCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  if (!args.config) {
    console.error('--config is required for --pvp --group mode');
    process.exit(1);
  }

  const startTime = Date.now();
  const config = loadConfig(args.config) as PvpRunConfig;

  if (!config.pvpGroups) {
    console.error('PvP group config must have "pvpGroups" key');
    process.exit(1);
  }

  const groupMatchups = expandPvpGroupMatchups(config.pvpGroups);
  const totalFights = groupMatchups.reduce((sum, m) => sum + m.iterations, 0);
  console.log(`PvP group matchups: ${groupMatchups.length} | Total fights: ${totalFights.toLocaleString()}`);

  // Create SimulationRun
  const [run] = await db.insert(schema.simulationRuns).values({
    id: crypto.randomUUID(),
    tickCount: 0,
    botCount: 0,
    config: { source: 'batch-cli-pvp-group', matchups: groupMatchups.length, totalFights, configFile: args.config },
    status: 'running',
    notes: args.notes || config.notes || `PvP Group CLI: ${groupMatchups.length} matchups, ${totalFights} fights`,
  }).returning();
  const runId = run.id;
  currentRunId = runId;
  const runShort = runId.slice(-8);
  console.log(`SimulationRun created: ${runId}`);
  setSimulationRunId(runId);

  // Create test characters
  const charKey = (race: string, cls: string, level: number) => `${race}-${cls}-${level}`;
  const charMap = new Map<string, string>();
  const uniqueCombos = new Set<string>();

  for (const m of groupMatchups) {
    for (const member of m.party1.members) {
      uniqueCombos.add(charKey(member.race, member.class, m.level));
    }
    for (const member of m.party2.members) {
      uniqueCombos.add(charKey(member.race, member.class, m.level));
    }
  }

  console.log(`Creating ${uniqueCombos.size} test characters...`);
  for (const combo of uniqueCombos) {
    const [race, cls, levelStr] = combo.split('-');
    const level = parseInt(levelStr, 10);
    const raceEnum = RACE_ID_TO_ENUM[race];
    if (!raceEnum) continue;

    const player = buildSyntheticPlayer({ race, class: cls, level });
    if (!player) continue;

    const charId = `pvpsim-g-${runShort}-${race}-${cls}-${level}`;
    const userId = `pvpsim-gu-${runShort}-${race}-${cls}-${level}`;

    await db.insert(schema.users).values({
      id: userId,
      username: `PvpGrp_${race}_${cls}_L${level}_${runShort}`.slice(0, 50),
      email: `pvpg-${runShort}-${race}-${cls}-${level}@sim.local`.slice(0, 80),
      passwordHash: 'batch-sim-no-login',
      isTestAccount: true,
    });

    await db.insert(schema.characters).values({
      id: charId,
      userId,
      name: player.name,
      race: raceEnum,
      class: cls,
      level,
      health: player.hp,
      maxHealth: player.maxHp,
      stats: player.stats,
      gold: 0,
      xp: 0,
    });

    charMap.set(combo, charId);
  }

  // Fight loop
  let completedFights = 0;
  let errors = 0;
  let totalDraws = 0;

  interface PvpGroupResult {
    party1Name: string;
    party2Name: string;
    level: number;
    p1Wins: number;
    p2Wins: number;
    draws: number;
    total: number;
    roundsSum: number;
  }
  const matchupResults: PvpGroupResult[] = [];

  const BATCH_SIZE = 500;
  let pendingRows: any[] = [];

  async function flushRows(): Promise<void> {
    if (pendingRows.length === 0) return;
    await db.insert(schema.combatEncounterLogs).values(pendingRows);
    pendingRows = [];
  }

  const progressInterval = Math.max(1, Math.floor(totalFights / 20));

  for (let mIdx = 0; mIdx < groupMatchups.length; mIdx++) {
    const gm = groupMatchups[mIdx];
    const party1Members = buildSyntheticParty(gm.party1);
    const party2Members = buildSyntheticParty(gm.party2);

    if (party1Members.length === 0 || party2Members.length === 0) {
      console.error(`Failed to build party for matchup ${mIdx}`);
      errors++;
      continue;
    }

    const result: PvpGroupResult = {
      party1Name: gm.party1.name,
      party2Name: gm.party2.name,
      level: gm.level,
      p1Wins: 0, p2Wins: 0, draws: 0,
      total: gm.iterations,
      roundsSum: 0,
    };

    for (let iter = 0; iter < gm.iterations; iter++) {
      try {
        const allCombatants: any[] = [];
        const paramsMap = new Map<string, CombatantParams>();

        // Build party 1 combatants (team 0)
        for (let pi = 0; pi < party1Members.length; pi++) {
          const player = party1Members[pi];
          const member = gm.party1.members[pi];
          const combatantId = `pvpg-t0-${pi}-${mIdx}-${iter}`;

          const combatant = createCharacterCombatant(
            combatantId, player.name, 0,
            player.stats, player.level,
            player.hp, player.maxHp,
            player.equipmentAC, player.weapon,
            player.spellSlots, player.proficiencyBonus,
          );
          (combatant as any).characterClass = player.class;
          (combatant as any).race = player.race;
          (combatant as any).nonProficientArmor = false;
          (combatant as any).nonProficientWeapon = false;
          (combatant as any).saveProficiencies = getSimSaveProficiencies(player.class, player.level);
          (combatant as any).extraAttacks = getAttacksPerAction(player.class, player.level);
          (combatant as any).featIds = (member as PartyMemberConfig)?.featIds ?? getSimFeatIds(player.class, player.level);
          allCombatants.push(combatant);

          const playerParams = buildPlayerCombatParams(player, {
            tier0Selections: (member as PartyMemberConfig)?.tier0Selections,
            specialization: (member as PartyMemberConfig)?.specialization,
          });
          paramsMap.set(combatantId, { ...playerParams, id: combatantId });
        }

        // Build party 2 combatants (team 1)
        for (let pi = 0; pi < party2Members.length; pi++) {
          const player = party2Members[pi];
          const member = gm.party2.members[pi];
          const combatantId = `pvpg-t1-${pi}-${mIdx}-${iter}`;

          const combatant = createCharacterCombatant(
            combatantId, player.name, 1,
            player.stats, player.level,
            player.hp, player.maxHp,
            player.equipmentAC, player.weapon,
            player.spellSlots, player.proficiencyBonus,
          );
          (combatant as any).characterClass = player.class;
          (combatant as any).race = player.race;
          (combatant as any).nonProficientArmor = false;
          (combatant as any).nonProficientWeapon = false;
          (combatant as any).saveProficiencies = getSimSaveProficiencies(player.class, player.level);
          (combatant as any).extraAttacks = getAttacksPerAction(player.class, player.level);
          (combatant as any).featIds = (member as PartyMemberConfig)?.featIds ?? getSimFeatIds(player.class, player.level);
          allCombatants.push(combatant);

          const playerParams = buildPlayerCombatParams(player, {
            tier0Selections: (member as PartyMemberConfig)?.tier0Selections,
            specialization: (member as PartyMemberConfig)?.specialization,
          });
          paramsMap.set(combatantId, { ...playerParams, id: combatantId });
        }

        const sessionId = `pvpg-${mIdx}-${iter}`;
        const state = createCombatState(sessionId, 'PVP', allCombatants);
        const outcome = resolveTickCombat(state, paramsMap);

        if (outcome.winner === 'team0') result.p1Wins++;
        else if (outcome.winner === 'team1') result.p2Wins++;
        else { result.draws++; totalDraws++; }

        result.roundsSum += outcome.rounds;

        // Build encounter log
        const fs = outcome.finalState;
        const outcomeStr = outcome.winner === 'team0' ? 'win'
          : outcome.winner === 'team1' ? 'loss' : 'draw';
        const totalP1Hp = party1Members.reduce((s, p) => s + p.hp, 0);
        const totalP1EndHp = fs.combatants.filter(c => c.team === 0).reduce((s, c) => s + Math.max(0, c.currentHp), 0);
        const totalP2Hp = party2Members.reduce((s, p) => s + p.hp, 0);
        const totalP2EndHp = fs.combatants.filter(c => c.team === 1).reduce((s, c) => s + Math.max(0, c.currentHp), 0);

        const primaryP1CharKey = charKey(gm.party1.members[0].race, gm.party1.members[0].class, gm.level);
        const primaryP1CharId = charMap.get(primaryP1CharKey) || `pvpsim-g-${runShort}-0`;

        const encounterContext = buildEncounterContext(fs);
        const rounds = buildRoundsData(fs);
        const summary = buildSummary(
          outcomeStr, fs.round,
          gm.party1.name, gm.party2.name,
          totalP1Hp, totalP1EndHp,
          totalP2Hp, totalP2EndHp,
        );

        pendingRows.push({
          id: crypto.randomUUID(),
          type: 'pvp_group',
          sessionId,
          characterId: primaryP1CharId,
          characterName: gm.party1.name,
          opponentId: null,
          opponentName: gm.party2.name,
          townId: null,
          outcome: outcomeStr,
          totalRounds: fs.round,
          characterStartHp: totalP1Hp,
          characterEndHp: totalP1EndHp,
          opponentStartHp: totalP2Hp,
          opponentEndHp: totalP2EndHp,
          characterWeapon: `Party of ${party1Members.length}`,
          opponentWeapon: `Party of ${party2Members.length}`,
          xpAwarded: 0,
          goldAwarded: 0,
          lootDropped: '',
          rounds: [{ _encounterContext: encounterContext }, ...rounds] as any,
          summary,
          triggerSource: 'batch_sim_pvp',
          simulationTick: mIdx,
          simulationRunId: runId,
        });

        completedFights++;

        if (pendingRows.length >= BATCH_SIZE) {
          await flushRows();
        }

        if (completedFights % progressInterval === 0 || completedFights === totalFights) {
          const pct = ((completedFights / totalFights) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\r[${completedFights.toLocaleString()}/${totalFights.toLocaleString()}] ${pct}% — ${elapsed}s`);
        }
      } catch (fightErr) {
        errors++;
      }
    }

    matchupResults.push(result);
  }

  await flushRows();
  console.log('');

  // Update SimulationRun
  await db.update(schema.simulationRuns)
    .set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      encounterCount: completedFights,
    })
    .where(eq(schema.simulationRuns.id, runId));
  setSimulationRunId(null);

  // Print group results
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  printPvpGroupResults(matchupResults, totalFights, completedFights, totalDraws, errors, duration, runId);
  writePvpGroupSummaryFile(matchupResults, totalFights, completedFights, totalDraws, errors, duration, runId, args.config!);
}

// ---------------------------------------------------------------------------
// PvP Output — Win-Rate Matrix
// ---------------------------------------------------------------------------

function printPvpMatrix(
  results: { p1Label: string; p2Label: string; level: number; p1Wins: number; p2Wins: number; draws: number; total: number; roundsSum: number }[],
  totalFights: number, completedFights: number, totalDraws: number, errors: number, duration: string, runId: string,
): void {
  // Group results by level
  const byLevel = new Map<number, typeof results>();
  for (const r of results) {
    if (!byLevel.has(r.level)) byLevel.set(r.level, []);
    byLevel.get(r.level)!.push(r);
  }

  const allAlerts: string[] = [];

  for (const [level, levelResults] of byLevel) {
    // Build unique labels
    const labels = new Set<string>();
    for (const r of levelResults) {
      labels.add(r.p1Label);
      labels.add(r.p2Label);
    }
    const sortedLabels = [...labels].sort();

    // Build win-rate lookup: winRate[row][col] = row's win% against col
    const winRateMap = new Map<string, Map<string, { rate: number; total: number; draws: number }>>();

    for (const r of levelResults) {
      // P1 win rate vs P2
      if (!winRateMap.has(r.p1Label)) winRateMap.set(r.p1Label, new Map());
      const p1Rate = r.total > 0 ? (r.p1Wins / r.total) * 100 : 50;
      winRateMap.get(r.p1Label)!.set(r.p2Label, { rate: p1Rate, total: r.total, draws: r.draws });

      // P2 win rate vs P1 (reverse)
      if (r.p1Label !== r.p2Label) {
        if (!winRateMap.has(r.p2Label)) winRateMap.set(r.p2Label, new Map());
        const p2Rate = r.total > 0 ? (r.p2Wins / r.total) * 100 : 50;
        winRateMap.get(r.p2Label)!.set(r.p1Label, { rate: p2Rate, total: r.total, draws: r.draws });
      }
    }

    // Print matrix
    const itr = levelResults[0]?.total ?? 0;
    console.log(`\n=== PvP 1v1 Results (Level ${level}, ${itr} iterations each) ===\n`);

    const colWidth = Math.max(10, ...sortedLabels.map(l => l.length + 2));
    const headerRow = ''.padEnd(colWidth) + sortedLabels.map(l => l.padEnd(colWidth)).join('');
    console.log(headerRow);

    for (const rowLabel of sortedLabels) {
      let line = rowLabel.padEnd(colWidth);
      for (const colLabel of sortedLabels) {
        if (rowLabel === colLabel) {
          line += '—'.padEnd(colWidth);
        } else {
          const data = winRateMap.get(rowLabel)?.get(colLabel);
          if (data) {
            line += `${data.rate.toFixed(0)}%`.padEnd(colWidth);
          } else {
            line += '—'.padEnd(colWidth);
          }
        }
      }
      console.log(line);
    }

    // Balance alerts
    for (const r of levelResults) {
      if (r.p1Label === r.p2Label) {
        // Mirror: check for draw dominance
        const drawPct = r.total > 0 ? (r.draws / r.total) * 100 : 0;
        if (drawPct > 10) {
          allAlerts.push(`  ! ${r.p1Label} mirror L${level}: ${drawPct.toFixed(0)}% draws (>10% threshold)`);
        }
        continue;
      }
      const p1WinPct = r.total > 0 ? (r.p1Wins / r.total) * 100 : 50;
      if (p1WinPct > 60) {
        allAlerts.push(`  ! ${r.p1Label} vs ${r.p2Label} L${level}: ${p1WinPct.toFixed(0)}% (>60% — potential imbalance)`);
      } else if (p1WinPct < 40) {
        allAlerts.push(`  ! ${r.p1Label} vs ${r.p2Label} L${level}: ${p1WinPct.toFixed(0)}% (<40% — ${r.p1Label} disadvantaged)`);
      }
    }
  }

  console.log(`\nBalance Alerts:`);
  if (allAlerts.length > 0) {
    for (const alert of allAlerts) console.log(alert);
  } else {
    console.log('  None');
  }

  console.log(`\n=== PvP Simulation Complete ===`);
  console.log(`Run ID: ${runId}`);
  console.log(`Fights: ${completedFights.toLocaleString()} | Draws: ${totalDraws} | Duration: ${duration}s`);
  if (errors > 0) console.log(`Errors: ${errors}`);
  console.log(`To delete: npm run sim:delete -- --run-id=${runId}`);
}

function printPvpGroupResults(
  results: { party1Name: string; party2Name: string; level: number; p1Wins: number; p2Wins: number; draws: number; total: number; roundsSum: number }[],
  totalFights: number, completedFights: number, totalDraws: number, errors: number, duration: string, runId: string,
): void {
  const byLevel = new Map<number, typeof results>();
  for (const r of results) {
    if (!byLevel.has(r.level)) byLevel.set(r.level, []);
    byLevel.get(r.level)!.push(r);
  }

  for (const [level, levelResults] of byLevel) {
    const names = new Set<string>();
    for (const r of levelResults) {
      names.add(r.party1Name);
      names.add(r.party2Name);
    }
    const sortedNames = [...names].sort();

    // Build win-rate lookup
    const winRateMap = new Map<string, Map<string, number>>();
    for (const r of levelResults) {
      if (!winRateMap.has(r.party1Name)) winRateMap.set(r.party1Name, new Map());
      const p1Rate = r.total > 0 ? (r.p1Wins / r.total) * 100 : 50;
      winRateMap.get(r.party1Name)!.set(r.party2Name, p1Rate);

      if (r.party1Name !== r.party2Name) {
        if (!winRateMap.has(r.party2Name)) winRateMap.set(r.party2Name, new Map());
        const p2Rate = r.total > 0 ? (r.p2Wins / r.total) * 100 : 50;
        winRateMap.get(r.party2Name)!.set(r.party1Name, p2Rate);
      }
    }

    const itr = levelResults[0]?.total ?? 0;
    console.log(`\n=== PvP Group Results (Level ${level}, ${itr} iterations each) ===\n`);

    const colWidth = Math.max(16, ...sortedNames.map(n => n.length + 2));
    const headerRow = ''.padEnd(colWidth) + sortedNames.map(n => n.padEnd(colWidth)).join('');
    console.log(headerRow);

    for (const rowName of sortedNames) {
      let line = rowName.padEnd(colWidth);
      for (const colName of sortedNames) {
        if (rowName === colName) {
          line += '—'.padEnd(colWidth);
        } else {
          const rate = winRateMap.get(rowName)?.get(colName);
          if (rate !== undefined) {
            line += `${rate.toFixed(0)}%`.padEnd(colWidth);
          } else {
            line += '—'.padEnd(colWidth);
          }
        }
      }
      console.log(line);
    }
  }

  console.log(`\n=== PvP Group Simulation Complete ===`);
  console.log(`Run ID: ${runId}`);
  console.log(`Fights: ${completedFights.toLocaleString()} | Draws: ${totalDraws} | Duration: ${duration}s`);
  if (errors > 0) console.log(`Errors: ${errors}`);
  console.log(`To delete: npm run sim:delete -- --run-id=${runId}`);
}

// ---------------------------------------------------------------------------
// PvP Summary Files
// ---------------------------------------------------------------------------

function writePvpSummaryFile(
  results: { p1Label: string; p2Label: string; level: number; p1Wins: number; p2Wins: number; draws: number; total: number; roundsSum: number }[],
  totalFights: number, completedFights: number, totalDraws: number, errors: number, duration: string, runId: string, configFile: string,
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.resolve(__dirname, '..', '..', '..', 'docs', `pvp-sim-results-${timestamp}.md`);

  const lines: string[] = [];
  lines.push(`# PvP Simulation Results`);
  lines.push(`\n**Date:** ${new Date().toISOString()}`);
  lines.push(`**Run ID:** ${runId}`);
  lines.push(`**Config:** ${configFile}`);
  lines.push(`**Total Fights:** ${completedFights.toLocaleString()} | **Draws:** ${totalDraws} | **Duration:** ${duration}s`);
  if (errors > 0) lines.push(`**Errors:** ${errors}`);

  // Group by level
  const byLevel = new Map<number, typeof results>();
  for (const r of results) {
    if (!byLevel.has(r.level)) byLevel.set(r.level, []);
    byLevel.get(r.level)!.push(r);
  }

  const allAlerts: string[] = [];
  const allWinRates: { label: string; rate: number; opponent: string; level: number }[] = [];

  for (const [level, levelResults] of byLevel) {
    const labels = new Set<string>();
    for (const r of levelResults) {
      labels.add(r.p1Label);
      labels.add(r.p2Label);
    }
    const sortedLabels = [...labels].sort();

    const winRateMap = new Map<string, Map<string, number>>();
    for (const r of levelResults) {
      if (!winRateMap.has(r.p1Label)) winRateMap.set(r.p1Label, new Map());
      const p1Rate = r.total > 0 ? (r.p1Wins / r.total) * 100 : 50;
      winRateMap.get(r.p1Label)!.set(r.p2Label, p1Rate);
      if (r.p1Label !== r.p2Label) {
        allWinRates.push({ label: r.p1Label, rate: p1Rate, opponent: r.p2Label, level });
        if (!winRateMap.has(r.p2Label)) winRateMap.set(r.p2Label, new Map());
        const p2Rate = r.total > 0 ? (r.p2Wins / r.total) * 100 : 50;
        winRateMap.get(r.p2Label)!.set(r.p1Label, p2Rate);
        allWinRates.push({ label: r.p2Label, rate: p2Rate, opponent: r.p1Label, level });
      }
    }

    lines.push(`\n## Level ${level}\n`);
    // Markdown table
    lines.push(`| | ${sortedLabels.join(' | ')} |`);
    lines.push(`|${sortedLabels.map(() => '---').join('|')}|---|`);
    for (const rowLabel of sortedLabels) {
      const cells = sortedLabels.map(colLabel => {
        if (rowLabel === colLabel) return '—';
        const rate = winRateMap.get(rowLabel)?.get(colLabel);
        return rate !== undefined ? `${rate.toFixed(0)}%` : '—';
      });
      lines.push(`| **${rowLabel}** | ${cells.join(' | ')} |`);
    }

    // Alerts for this level
    for (const r of levelResults) {
      if (r.p1Label === r.p2Label) continue;
      const p1Rate = r.total > 0 ? (r.p1Wins / r.total) * 100 : 50;
      if (p1Rate > 60) {
        allAlerts.push(`- ${r.p1Label} vs ${r.p2Label} L${level}: **${p1Rate.toFixed(0)}%** (>60%)`);
      } else if (p1Rate < 40) {
        allAlerts.push(`- ${r.p1Label} vs ${r.p2Label} L${level}: **${p1Rate.toFixed(0)}%** (<40%)`);
      }
    }
  }

  // Balance alerts section
  lines.push(`\n## Balance Alerts\n`);
  if (allAlerts.length > 0) {
    for (const alert of allAlerts) lines.push(alert);
  } else {
    lines.push('No matchups outside the 40-60% balance window.');
  }

  // Top 5 strongest / weakest
  const sorted = [...allWinRates].sort((a, b) => b.rate - a.rate);
  if (sorted.length >= 5) {
    lines.push(`\n## Top 5 Strongest Matchups\n`);
    for (let i = 0; i < 5; i++) {
      const s = sorted[i];
      lines.push(`${i + 1}. **${s.label}** vs ${s.opponent} L${s.level}: ${s.rate.toFixed(0)}%`);
    }
    lines.push(`\n## Top 5 Weakest Matchups\n`);
    for (let i = sorted.length - 5; i < sorted.length; i++) {
      const s = sorted[i];
      lines.push(`${sorted.length - i}. **${s.label}** vs ${s.opponent} L${s.level}: ${s.rate.toFixed(0)}%`);
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`\nSummary written to: ${filePath}`);
}

function writePvpGroupSummaryFile(
  results: { party1Name: string; party2Name: string; level: number; p1Wins: number; p2Wins: number; draws: number; total: number; roundsSum: number }[],
  totalFights: number, completedFights: number, totalDraws: number, errors: number, duration: string, runId: string, configFile: string,
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.resolve(__dirname, '..', '..', '..', 'docs', `pvp-group-sim-results-${timestamp}.md`);

  const lines: string[] = [];
  lines.push(`# PvP Group Simulation Results`);
  lines.push(`\n**Date:** ${new Date().toISOString()}`);
  lines.push(`**Run ID:** ${runId}`);
  lines.push(`**Config:** ${configFile}`);
  lines.push(`**Total Fights:** ${completedFights.toLocaleString()} | **Draws:** ${totalDraws} | **Duration:** ${duration}s`);
  if (errors > 0) lines.push(`**Errors:** ${errors}`);

  const byLevel = new Map<number, typeof results>();
  for (const r of results) {
    if (!byLevel.has(r.level)) byLevel.set(r.level, []);
    byLevel.get(r.level)!.push(r);
  }

  for (const [level, levelResults] of byLevel) {
    const names = new Set<string>();
    for (const r of levelResults) {
      names.add(r.party1Name);
      names.add(r.party2Name);
    }
    const sortedNames = [...names].sort();

    const winRateMap = new Map<string, Map<string, number>>();
    for (const r of levelResults) {
      if (!winRateMap.has(r.party1Name)) winRateMap.set(r.party1Name, new Map());
      const p1Rate = r.total > 0 ? (r.p1Wins / r.total) * 100 : 50;
      winRateMap.get(r.party1Name)!.set(r.party2Name, p1Rate);
      if (r.party1Name !== r.party2Name) {
        if (!winRateMap.has(r.party2Name)) winRateMap.set(r.party2Name, new Map());
        const p2Rate = r.total > 0 ? (r.p2Wins / r.total) * 100 : 50;
        winRateMap.get(r.party2Name)!.set(r.party1Name, p2Rate);
      }
    }

    lines.push(`\n## Level ${level}\n`);
    lines.push(`| | ${sortedNames.join(' | ')} |`);
    lines.push(`|${sortedNames.map(() => '---').join('|')}|---|`);
    for (const rowName of sortedNames) {
      const cells = sortedNames.map(colName => {
        if (rowName === colName) return '—';
        const rate = winRateMap.get(rowName)?.get(colName);
        return rate !== undefined ? `${rate.toFixed(0)}%` : '—';
      });
      lines.push(`| **${rowName}** | ${cells.join(' | ')} |`);
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`\nSummary written to: ${filePath}`);
}

// ---------------------------------------------------------------------------
// SIGINT Handler
// ---------------------------------------------------------------------------

let currentRunId: string | null = null;

process.on('SIGINT', async () => {
  console.log('\nInterrupted. Cleaning up...');
  if (currentRunId) {
    try {
      await db.update(schema.simulationRuns)
        .set({ status: 'stopped', completedAt: new Date().toISOString() })
        .where(eq(schema.simulationRuns.id, currentRunId));
      console.log(`Run ${currentRunId} marked as stopped.`);
    } catch {
      // ignore cleanup errors
    }
  }
  setSimulationRunId(null);
  await pool.end();
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();

  try {
    switch (args.command) {
      case 'run':
        currentRunId = null; // will be set inside runCommand
        if (args.pvp && args.group) {
          await runPvpGroupCommand(args);
        } else if (args.pvp) {
          await runPvpCommand(args);
        } else if (args.group) {
          await runGroupCommand(args);
        } else {
          await runCommand(args);
        }
        break;
      case 'list':
        await listCommand();
        break;
      case 'delete':
        if (!args.runId) {
          console.error('--run-id is required for delete command');
          process.exit(1);
        }
        await deleteCommand(args.runId);
        break;
      case 'delete-all':
        await deleteAllCommand(args.confirm ?? false);
        break;
      default:
        console.error(`Unknown command: ${args.command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    if (currentRunId) {
      try {
        await db.update(schema.simulationRuns)
          .set({ status: 'failed', completedAt: new Date().toISOString() })
          .where(eq(schema.simulationRuns.id, currentRunId));
      } catch {
        // ignore
      }
    }
    setSimulationRunId(null);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
