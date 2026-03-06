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
 *   npm run sim:list
 *   npm run sim:delete -- --run-id clxxxxxxxxxx
 */

import { PrismaClient, Race } from '@prisma/client';
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
// Prisma (standalone — not the server singleton)
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Race ID → Prisma Race enum mapping
// ---------------------------------------------------------------------------

const RACE_ID_TO_ENUM: Record<string, Race> = {
  human: Race.HUMAN,
  elf: Race.ELF,
  dwarf: Race.DWARF,
  harthfolk: Race.HARTHFOLK,
  orc: Race.ORC,
  nethkin: Race.NETHKIN,
  drakonid: Race.DRAKONID,
  half_elf: Race.HALF_ELF,
  half_orc: Race.HALF_ORC,
  gnome: Race.GNOME,
  merfolk: Race.MERFOLK,
  beastfolk: Race.BEASTFOLK,
  faefolk: Race.FAEFOLK,
  goliath: Race.GOLIATH,
  nightborne: Race.NIGHTBORNE,
  mosskin: Race.MOSSKIN,
  forgeborn: Race.FORGEBORN,
  elementari: Race.ELEMENTARI,
  revenant: Race.REVENANT,
  changeling: Race.CHANGELING,
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
  --notes="text"       Notes for this run

Examples:
  npm run sim:run -- --race human --class warrior --level 5 --monster Goblin --iterations 50
  npm run sim:run -- --race ALL --class ALL --level 5 --monster Goblin --iterations 100
  npm run sim:run -- --config=quick-check.json
  npm run sim:run -- --config=full-sweep.json --notes="Post-balance patch"
  npm run sim:run -- --group --config=group-baseline.json
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
  const dbMonsters = await prisma.monster.findMany();
  const monsterMap = new Map(dbMonsters.map(m => [
    m.name.toLowerCase(),
    {
      name: m.name,
      level: m.level,
      stats: m.stats as unknown as MonsterStats,
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
  const run = await prisma.simulationRun.create({
    data: {
      tickCount: 0,
      botCount: 0,
      config: { source: 'batch-cli', matchups: matchups.length, totalFights, grid: args.config ?? null },
      status: 'running',
      notes: args.notes || `Batch CLI: ${matchups.length} matchups, ${totalFights} fights`,
    },
  });
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

    await prisma.user.create({
      data: {
        id: userId,
        username: `BatchSim_${race}_${cls}_L${level}_${runShort}`,
        email: `bs-${runShort}-${race}-${cls}-${level}@sim.local`,
        passwordHash: 'batch-sim-no-login',
        isTestAccount: true,
      },
    });

    await prisma.character.create({
      data: {
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
      },
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
    await prisma.combatEncounterLog.createMany({ data: pendingRows });
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
    });
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
        (playerCombatant as any).featIds = getSimFeatIds(player.class, player.level);

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
  await prisma.simulationRun.update({
    where: { id: runId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      encounterCount: completedFights,
    },
  });

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
  const dbMonsters = await prisma.monster.findMany();
  const monsterMap = new Map(dbMonsters.map(m => [
    m.name.toLowerCase(),
    {
      name: m.name,
      level: m.level,
      classification: (m as any).classification as string | undefined,
      stats: m.stats as unknown as MonsterStats,
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
  const run = await prisma.simulationRun.create({
    data: {
      tickCount: 0,
      botCount: 0,
      config: { source: 'batch-cli-group', matchups: matchups.length, totalFights, configFile: args.config },
      status: 'running',
      notes: args.notes || `Group CLI: ${matchups.length} matchups, ${totalFights} fights`,
    },
  });
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

    await prisma.user.create({
      data: {
        id: userId,
        username: `GrpSim_${race}_${cls}_L${level}_${runShort}`,
        email: `gs-${runShort}-${race}-${cls}-${level}@sim.local`,
        passwordHash: 'batch-sim-no-login',
        isTestAccount: true,
      },
    });

    await prisma.character.create({
      data: {
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
      },
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
    await prisma.combatEncounterLog.createMany({ data: pendingRows });
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
          (combatant as any).featIds = getSimFeatIds(player.class, player.level);
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
  await prisma.simulationRun.update({
    where: { id: runId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      encounterCount: completedFights,
    },
  });
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
  const runs = await prisma.simulationRun.findMany({
    where: {
      OR: [
        { config: { path: ['source'], equals: 'batch-cli' } },
        { config: { path: ['source'], equals: 'batch-cli-group' } },
      ],
    },
    orderBy: { startedAt: 'desc' },
  });

  if (runs.length === 0) {
    console.log('No batch-cli simulation runs found.');
    return;
  }

  console.log(`${'ID'.padEnd(28)} | ${'Started'.padEnd(18)} | ${'Status'.padEnd(10)} | ${'Fights'.padEnd(8)} | Notes`);
  console.log('-'.repeat(100));

  for (const run of runs) {
    const started = run.startedAt.toISOString().replace('T', ' ').slice(0, 16);
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
  const run = await prisma.simulationRun.findUnique({ where: { id: runId } });
  if (!run) {
    console.error(`SimulationRun not found: ${runId}`);
    process.exit(1);
  }

  const runShort = runId.slice(-8);
  console.log(`Deleting run ${runId}...`);

  // 1. Delete test users (cascade → characters → encounter logs)
  const userResult = await prisma.user.deleteMany({
    where: {
      isTestAccount: true,
      id: { startsWith: `bsim-u-${runShort}` },
    },
  });
  console.log(`  Deleted ${userResult.count} test users (+ cascaded characters & logs)`);

  // 2. Delete any remaining encounter logs for this run (safety net for non-batch logs)
  const logResult = await prisma.combatEncounterLog.deleteMany({
    where: { simulationRunId: runId },
  });
  if (logResult.count > 0) {
    console.log(`  Deleted ${logResult.count} remaining encounter logs`);
  }

  // 3. Delete the SimulationRun
  await prisma.simulationRun.delete({ where: { id: runId } });
  console.log(`  Deleted SimulationRun record`);
  console.log('Done.');
}

async function deleteAllCommand(confirm: boolean): Promise<void> {
  if (!confirm) {
    console.error('This will delete ALL batch-cli simulation runs. Pass --confirm to proceed.');
    process.exit(1);
  }

  const runs = await prisma.simulationRun.findMany({
    where: {
      config: { path: ['source'], equals: 'batch-cli' },
    },
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
  const orphanedUsers = await prisma.user.deleteMany({
    where: {
      isTestAccount: true,
      username: { startsWith: 'BatchSim_' },
    },
  });
  if (orphanedUsers.count > 0) {
    console.log(`Cleaned up ${orphanedUsers.count} orphaned batch-sim users`);
  }

  console.log('All batch-cli runs deleted.');
}

// ---------------------------------------------------------------------------
// SIGINT Handler
// ---------------------------------------------------------------------------

let currentRunId: string | null = null;

process.on('SIGINT', async () => {
  console.log('\nInterrupted. Cleaning up...');
  if (currentRunId) {
    try {
      await prisma.simulationRun.update({
        where: { id: currentRunId },
        data: { status: 'stopped', completedAt: new Date() },
      });
      console.log(`Run ${currentRunId} marked as stopped.`);
    } catch {
      // ignore cleanup errors
    }
  }
  setSimulationRunId(null);
  await prisma.$disconnect();
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
        if (args.group) {
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
        await prisma.simulationRun.update({
          where: { id: currentRunId },
          data: { status: 'failed', completedAt: new Date() },
        });
      } catch {
        // ignore
      }
    }
    setSimulationRunId(null);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
