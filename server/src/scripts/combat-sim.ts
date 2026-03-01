/**
 * Combat Simulator & Round-by-Round Debugger — CLI Entry Point
 *
 * Usage:
 *   npm run combat-sim -- --scenario=basic-melee --seed=42 --verbose
 *   npm run combat-sim -- --scenario=basic-melee --runs=100 --seed=1
 *   npm run combat-sim -- --scenario=custom --config=my-scenario.json
 *
 * Flags:
 *   --scenario=NAME   Scenario name (default: basic-melee)
 *   --seed=N          Seed for deterministic PRNG (optional)
 *   --config=PATH     Path to custom scenario JSON (for --scenario=custom)
 *   --verbose / -v    Extra detail in output
 *   --no-color        Disable ANSI color codes
 *   --runs=N          Batch mode: run N times, print win rate stats
 *   --json            Write JSON output file (default)
 *   --no-json         Skip JSON output
 */

// ---- Seeded PRNG (must be installed BEFORE any other imports) ----

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Parse seed from args early so we can install PRNG before imports
const seedArg = process.argv.find(a => a.startsWith('--seed='));
const seed = seedArg ? parseInt(seedArg.split('=')[1], 10) : null;

if (seed !== null && !isNaN(seed)) {
  const prng = mulberry32(seed);
  Math.random = prng;
}

// ---- Now safe to import (all dice functions flow through Math.random) ----

import * as fs from 'fs';
import * as path from 'path';
import { SCENARIOS, getScenarioNames } from './combat-sim-scenarios';
import type { ScenarioDef } from './combat-sim-scenarios';
import { runCombatSim } from './combat-sim-runner';
import {
  setNoColor,
  printHeader,
  printInitiativeOrder,
  printRound,
  printOutcome,
  printBatchStats,
  writeJsonResult,
  writeBatchJsonResult,
} from './combat-sim-logger';

// ---- Arg Parsing ----

function parseArgs(): {
  scenario: string;
  seed: number | 'random';
  configPath: string | null;
  verbose: boolean;
  noColor: boolean;
  runs: number;
  writeJson: boolean;
} {
  const args = process.argv.slice(2);

  let scenario = 'basic-melee';
  let configPath: string | null = null;
  let verbose = false;
  let noColor = false;
  let runs = 1;
  let writeJson = true;

  for (const arg of args) {
    if (arg.startsWith('--scenario=')) {
      scenario = arg.split('=')[1];
    } else if (arg.startsWith('--config=')) {
      configPath = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--no-color') {
      noColor = true;
    } else if (arg.startsWith('--runs=')) {
      runs = parseInt(arg.split('=')[1], 10);
      if (isNaN(runs) || runs < 1) runs = 1;
    } else if (arg === '--json') {
      writeJson = true;
    } else if (arg === '--no-json') {
      writeJson = false;
    } else if (arg.startsWith('--seed=')) {
      // Already parsed above
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return {
    scenario,
    seed: seed !== null && !isNaN(seed) ? seed : 'random',
    configPath,
    verbose,
    noColor,
    runs,
    writeJson,
  };
}

function printUsage(): void {
  console.log(`
Combat Simulator & Round-by-Round Debugger

Usage: npm run combat-sim -- [options]

Options:
  --scenario=NAME   Scenario to run (default: basic-melee)
  --seed=N          Seed for deterministic PRNG
  --config=PATH     Custom scenario JSON file (use with --scenario=custom)
  --verbose / -v    Extra output detail
  --no-color        Disable ANSI color codes
  --runs=N          Batch mode: run N times, show stats
  --json            Write JSON output (default)
  --no-json         Skip JSON file output
  --help / -h       Show this help

Available scenarios:
  ${getScenarioNames().join('\n  ')}
  custom            Load from --config=path.json
`);
}

// ---- Scenario Loading ----

function loadScenario(name: string, configPath: string | null): ScenarioDef {
  if (name === 'custom') {
    if (!configPath) {
      console.error('Error: --scenario=custom requires --config=path.json');
      process.exit(1);
    }
    const resolved = path.resolve(configPath);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: config file not found: ${resolved}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(resolved, 'utf-8');
    const parsed = JSON.parse(raw) as ScenarioDef;
    if (!parsed.combatants || parsed.combatants.length === 0) {
      console.error('Error: custom scenario must define at least 2 combatants');
      process.exit(1);
    }
    return parsed;
  }

  const scenario = SCENARIOS[name];
  if (!scenario) {
    console.error(`Error: unknown scenario "${name}"`);
    console.error(`Available: ${getScenarioNames().join(', ')}, custom`);
    process.exit(1);
  }
  return scenario;
}

// ---- Main ----

function main(): void {
  const opts = parseArgs();

  if (opts.noColor) {
    setNoColor(true);
  }

  const scenario = loadScenario(opts.scenario, opts.configPath);
  const outputDir = path.join(__dirname, 'combat-sim-results');

  if (opts.runs > 1) {
    // Batch mode
    console.log(`Running ${opts.runs} simulations of "${scenario.name}"...`);

    const results = [];
    for (let i = 0; i < opts.runs; i++) {
      // For batch mode with a seed, offset each run's seed
      if (opts.seed !== 'random') {
        const runSeed = (opts.seed as number) + i;
        const prng = mulberry32(runSeed);
        Math.random = prng;
      }

      const result = runCombatSim(scenario, opts.seed !== 'random' ? (opts.seed as number) + i : 'random');
      results.push(result);
    }

    printBatchStats(results, scenario.name);

    if (opts.writeJson) {
      writeBatchJsonResult(results, scenario.name, outputDir);
    }
  } else {
    // Single run
    const result = runCombatSim(scenario, opts.seed);

    printHeader(result);
    printInitiativeOrder(result);

    for (const round of result.rounds) {
      printRound(round, opts.verbose);
    }

    printOutcome(result);

    if (opts.writeJson) {
      writeJsonResult(result, outputDir);
    }
  }
}

main();
