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
  buildSyntheticMonster,
  buildPlayerCombatParams,
  getAllRaceIds,
  getAllClassNames,
  type MonsterStats,
} from '../services/combat-simulator';
import {
  createCharacterCombatant,
  createMonsterCombatant,
  createCombatState,
} from '../lib/combat-engine';
import { resolveTickCombat, type CombatantParams } from '../services/tick-combat-resolver';
import { buildEncounterContext, buildRoundsData, buildSummary } from '../lib/combat-logger';
import { setSimulationRunId } from '../lib/simulation-context';

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
  --notes="text"       Notes for this run

Examples:
  npm run sim:run -- --race human --class warrior --level 5 --monster Goblin --iterations 50
  npm run sim:run -- --race ALL --class ALL --level 5 --monster Goblin --iterations 100
  npm run sim:run -- --config=quick-check.json
  npm run sim:run -- --config=full-sweep.json --notes="Post-balance patch"
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
    { name: m.name, level: m.level, stats: m.stats as unknown as MonsterStats },
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

    const monster = buildSyntheticMonster(monsterData.name, monsterData.level, monsterData.stats);
    const playerParams = buildPlayerCombatParams(player);
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

        const monsterCombatant = createMonsterCombatant(
          `sim-monster-${mIdx}-${i}`, monster.name, 1,
          monster.stats, monster.level,
          monster.hp, monster.ac,
          monster.weapon, 0,
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
// List Command
// ---------------------------------------------------------------------------

async function listCommand(): Promise<void> {
  const runs = await prisma.simulationRun.findMany({
    where: {
      config: { path: ['source'], equals: 'batch-cli' },
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
        await runCommand(args);
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
