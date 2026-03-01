/**
 * Combat Simulator — Logger
 *
 * Colored console output + JSON file writer for combat simulation results.
 * Uses raw ANSI escape codes — no chalk dependency.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SimulationResult, RoundLog, TurnLog, CombatantSnapshot } from './combat-sim-runner';

// ---- ANSI Colors ----

const ESC = '\x1b[';

const C = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  bgRed: `${ESC}41m`,
  bgGreen: `${ESC}42m`,
};

let noColor = false;

export function setNoColor(enabled: boolean): void {
  noColor = enabled;
}

function c(color: string, text: string): string {
  if (noColor) return text;
  return `${color}${text}${C.reset}`;
}

// ---- Formatters ----

function hpBar(current: number, max: number): string {
  const pct = Math.round((current / max) * 100);
  const pctStr = `${pct}%`;
  if (pct <= 25) return c(C.red, `${current}/${max} (${pctStr})`);
  if (pct <= 50) return c(C.yellow, `${current}/${max} (${pctStr})`);
  return c(C.green, `${current}/${max} (${pctStr})`);
}

function statusList(effects: { name: string; remainingRounds: number }[]): string {
  if (effects.length === 0) return '';
  const parts = effects.map(e => c(C.yellow, `${e.name}(${e.remainingRounds})`));
  return ` | Status: ${parts.join(', ')}`;
}

function indent(level: number): string {
  return '  '.repeat(level);
}

// ---- Console Output ----

export function printHeader(result: SimulationResult): void {
  console.log('');
  console.log(c(C.bold + C.cyan, '╔══════════════════════════════════════════════════════╗'));
  console.log(c(C.bold + C.cyan, `║  COMBAT SIMULATOR — ${result.scenario.name.toUpperCase().padEnd(33)}║`));
  console.log(c(C.bold + C.cyan, '╚══════════════════════════════════════════════════════╝'));
  console.log('');
  console.log(`${c(C.dim, 'Scenario:')} ${result.scenario.description}`);
  console.log(`${c(C.dim, 'Type:')} ${result.scenario.type}`);
  console.log(`${c(C.dim, 'Seed:')} ${result.seed}`);
  console.log('');
}

export function printInitiativeOrder(result: SimulationResult): void {
  console.log(c(C.bold, '── Initiative Order ──'));
  for (const entry of result.initiativeOrder) {
    const teamColor = entry.team === 0 ? C.cyan : C.magenta;
    console.log(
      `${indent(1)}${c(teamColor, entry.name)} ` +
        `${c(C.dim, `[Team ${entry.team}]`)} ` +
        `Roll: d20(${c(C.bold, String(entry.roll))}) + DEX(${entry.dexMod >= 0 ? '+' : ''}${entry.dexMod}) = ` +
        c(C.bold, String(entry.total)),
    );
  }
  console.log('');
}

export function printRound(round: RoundLog, verbose: boolean): void {
  console.log(c(C.bold + C.white, `═══ ROUND ${round.roundNumber} ═══`));

  for (let i = 0; i < round.turns.length; i++) {
    const turn = round.turns[i];
    printTurn(turn, i + 1, verbose);
  }

  console.log('');
}

function printTurn(turn: TurnLog, turnNumber: number, verbose: boolean): void {
  const teamColor = turn.pre.team === 0 ? C.cyan : C.magenta;
  const header =
    `${indent(1)}Turn ${turnNumber}: ` +
    c(teamColor + C.bold, turn.actorName) +
    ` [HP: ${hpBar(turn.pre.hp, turn.pre.maxHp)} | AC: ${turn.pre.ac}` +
    `${statusList(turn.pre.statusEffects)}]`;
  console.log(header);

  // Status ticks
  for (const tick of turn.statusTicks) {
    if (tick.damage && tick.damage > 0) {
      console.log(
        `${indent(2)}${c(C.yellow, 'Status tick:')} ${tick.effectName} ` +
          c(C.red, `-${tick.damage} HP`) +
          ` → HP now ${tick.hpAfter}`,
      );
    }
    if (tick.healing && tick.healing > 0) {
      console.log(
        `${indent(2)}${c(C.yellow, 'Status tick:')} ${tick.effectName} ` +
          c(C.green, `+${tick.healing} HP`) +
          ` → HP now ${tick.hpAfter}`,
      );
    }
    if (tick.expired) {
      console.log(`${indent(2)}${c(C.dim, `Status expired: ${tick.effectName}`)}`);
    }
    if (tick.killed) {
      console.log(`${indent(2)}${c(C.bold + C.bgRed + C.white, ` KILLED by ${tick.effectName} DoT! `)}`);
    }
  }

  // Decision
  console.log(`${indent(2)}${c(C.cyan, 'Decision:')} ${turn.action} — ${turn.reason}`);

  // Action result details
  for (const log of turn.engineLog) {
    printEngineLog(log, verbose);
  }

  // Post-turn deltas
  if (turn.damageDealt > 0) {
    console.log(`${indent(2)}${c(C.dim, `Total damage dealt: ${turn.damageDealt}`)}`);
  }
  if (turn.healingDone > 0) {
    console.log(`${indent(2)}${c(C.dim, `Total healing done: ${turn.healingDone}`)}`);
  }
  if (turn.kills.length > 0) {
    console.log(`${indent(2)}${c(C.bold + C.bgRed + C.white, ` KILLED: ${turn.kills.join(', ')} `)}`);
  }
}

function printEngineLog(log: string, verbose: boolean): void {
  // Parse the combat engine log strings for colored output
  const line = log.trim();
  if (!line) return;

  // Attack results
  if (line.includes('attacks') && line.includes('rolls')) {
    console.log(`${indent(2)}${c(C.white, line)}`);
    return;
  }

  // Per-target AoE / multi-attack strike lines (indented with →)
  if (line.startsWith('→') || line.startsWith('  →')) {
    const trimmed = line.replace(/^\s*/, '');
    if (trimmed.includes('KILLED')) {
      console.log(`${indent(3)}${c(C.bold + C.bgRed + C.white, ` ${trimmed} `)}`);
    } else if (trimmed.includes('MISS')) {
      console.log(`${indent(3)}${c(C.dim, trimmed)}`);
    } else if (trimmed.includes('CRIT')) {
      console.log(`${indent(3)}${c(C.bold + C.red, trimmed)}`);
    } else {
      console.log(`${indent(3)}${c(C.cyan, trimmed)}`);
    }
    return;
  }

  // Strikes summary line
  if (line.includes('Strikes:') && line.includes('hit')) {
    console.log(`${indent(2)}${c(C.bold + C.white, line)}`);
    return;
  }

  // Damage
  if (line.includes('damage') || line.includes('Damage') || line.includes('dmg')) {
    console.log(`${indent(2)}${c(C.red, line)}`);
    return;
  }

  // Healing
  if (line.includes('heal') || line.includes('Heal') || line.includes('restore') || line.includes('Self healing')) {
    console.log(`${indent(2)}${c(C.green, line)}`);
    return;
  }

  // Status / Buffs / Class abilities
  if (line.includes('status') || line.includes('effect') || line.includes('poisoned') ||
      line.includes('burning') || line.includes('frozen') || line.includes('stunned') ||
      line.includes('Buff:') || line.includes('Status:') || line.includes('Class:')) {
    console.log(`${indent(2)}${c(C.yellow, line)}`);
    return;
  }

  // Flee
  if (line.includes('flee') || line.includes('Flee') || line.includes('retreat')) {
    console.log(`${indent(2)}${c(C.magenta, line)}`);
    return;
  }

  // Kill
  if (line.includes('killed') || line.includes('slain') || line.includes('defeated')) {
    console.log(`${indent(2)}${c(C.bold + C.bgRed + C.white, ` ${line} `)}`);
    return;
  }

  // Fallback to attack
  if (line.includes('fell back')) {
    console.log(`${indent(2)}${c(C.dim, line)}`);
    return;
  }

  // Phase 3: Counter/trap reactive
  if (line.includes('Counter triggered') || line.includes('reactive')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 3: Companion
  if (line.includes('Companion') || line.includes('companion')) {
    console.log(`${indent(2)}${c(C.bold + C.blue, line)}`);
    return;
  }

  // Phase 3: Steal / Gold
  if (line.includes('Gold stolen') || line.includes('Bonus loot')) {
    console.log(`${indent(2)}${c(C.bold + C.yellow, line)}`);
    return;
  }

  // Phase 3: Peaceful resolution
  if (line.includes('PEACEFUL RESOLUTION')) {
    console.log(`${indent(2)}${c(C.bold + C.bgGreen + C.white, ` ${line} `)}`);
    return;
  }

  // Phase 3: Random ability used
  if (line.includes('Random ability')) {
    console.log(`${indent(2)}${c(C.magenta, line)}`);
    return;
  }

  // Phase 5A: CC Immunity
  if (line.includes('CC immune') || line.includes('resists') && line.includes('immune')) {
    console.log(`${indent(2)}${c(C.bold + C.cyan, line)}`);
    return;
  }

  // Phase 5A: Guaranteed Hits
  if (line.includes('guaranteed strike') || line.includes('guaranteed hit')) {
    console.log(`${indent(2)}${c(C.bold + C.green, line)}`);
    return;
  }

  // Phase 5A: Dodge
  if (line.includes('dodges the attack') || line.includes('dodge chance')) {
    console.log(`${indent(2)}${c(C.bold + C.yellow, line)}`);
    return;
  }

  // Phase 5A: Damage Reflect
  if (line.includes('reflects') && line.includes('damage back')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5A: Stealth Miss
  if (line.includes('is hidden') || line.includes('attack misses') && line.includes('stealth')) {
    console.log(`${indent(2)}${c(C.bold + C.magenta, line)}`);
    return;
  }

  // Phase 5A: Auto Hit / Ignore Armor / Crit Bonus
  if (line.includes('auto-hits') || line.includes('never misses')) {
    console.log(`${indent(2)}${c(C.bold + C.green, line)}`);
    return;
  }
  if (line.includes('ignores armor') || line.includes('AC treated as')) {
    console.log(`${indent(2)}${c(C.bold + C.cyan, line)}`);
    return;
  }
  if (line.includes('expanded range') || line.includes('expanded crit')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5A: Debuff Bonus Damage
  if (line.includes('bonus damage') && (line.includes('debuff') || line.includes('Penance'))) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5A: Damage Multiplier
  if (line.includes('damage') && line.includes('multiplier') || line.includes('from stealth')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5A: Stealth Requirement Warning
  if (line.includes('without stealth') || line.includes('reduced damage') && line.includes('stealth')) {
    console.log(`${indent(2)}${c(C.yellow, line)}`);
    return;
  }

  // Phase 4: Death prevention
  if (line.includes('survived lethal') || line.includes('death prevention') || line.includes('Undying')) {
    console.log(`${indent(2)}${c(C.bold + C.bgGreen + C.white, ` ${line} `)}`);
    return;
  }

  // Phase 4: Absorption shield
  if (line.includes('absorbed') && line.includes('shield')) {
    console.log(`${indent(2)}${c(C.bold + C.cyan, line)}`);
    return;
  }

  // Psion abilities
  if (line.includes('Psion') || line.includes('psion') || line.includes('psychic') || line.includes('Psychic')) {
    console.log(`${indent(2)}${c(C.bold + C.magenta, line)}`);
    return;
  }

  // Phase 5B: First strike crit
  if (line.includes('first strike') || line.includes('First Strike') || line.includes('auto-crit first')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5B: Permanent companion
  if (line.includes('permanent companion') || line.includes('immune companion') || line.includes('never expires')) {
    console.log(`${indent(2)}${c(C.bold + C.blue, line)}`);
    return;
  }

  // Phase 5B: Stacking damage
  if (line.includes('stacking damage') || line.includes('round bonus') || line.includes('ramping')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5B: Advantage vs low HP
  if (line.includes('advantage') && (line.includes('low HP') || line.includes('wounded'))) {
    console.log(`${indent(2)}${c(C.bold + C.yellow, line)}`);
    return;
  }

  // Phase 5B: Consume-on-use buff
  if (line.includes('consumed') && (line.includes('buff') || line.includes('one-use'))) {
    console.log(`${indent(2)}${c(C.yellow, line)}`);
    return;
  }

  // Phase 5B: Cooldown halved
  if (line.includes('cooldown halved') || line.includes('halved cooldown')) {
    console.log(`${indent(2)}${c(C.bold + C.cyan, line)}`);
    return;
  }

  // Phase 5B: Charm effectiveness
  if (line.includes('charm') && (line.includes('extended') || line.includes('effectiveness'))) {
    console.log(`${indent(2)}${c(C.bold + C.magenta, line)}`);
    return;
  }

  // Phase 5B: Taunt enforcement
  if (line.includes('taunt') || line.includes('Taunt') || line.includes('forced to attack')) {
    console.log(`${indent(2)}${c(C.bold + C.yellow, line)}`);
    return;
  }

  // Phase 5B: Anti-heal aura
  if (line.includes('anti-heal') || line.includes('healing blocked') || line.includes('heal aura')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5B: Poison charges
  if (line.includes('poison charge') || line.includes('poisoned blade') || line.includes('venom')) {
    console.log(`${indent(2)}${c(C.bold + C.green, line)}`);
    return;
  }

  // Phase 5B: Extra action
  if (line.includes('extra action') || line.includes('bonus attack') || line.includes('Extra Action')) {
    console.log(`${indent(2)}${c(C.bold + C.cyan, line)}`);
    return;
  }

  // Phase 5B: Stacking attack speed
  if (line.includes('attack speed') && line.includes('stack')) {
    console.log(`${indent(2)}${c(C.bold + C.yellow, line)}`);
    return;
  }

  // Phase 5B: Holy damage bonus
  if (line.includes('holy') && line.includes('bonus') || line.includes('radiant') && line.includes('bonus')) {
    console.log(`${indent(2)}${c(C.bold + C.yellow, line)}`);
    return;
  }

  // Phase 5B: Scaling attack
  if (line.includes('scaling') && (line.includes('missing HP') || line.includes('missingHp'))) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Phase 5B: Bonus damage from source
  if (line.includes('bonus from source') || line.includes('bonusFromSource') || line.includes('marked target')) {
    console.log(`${indent(2)}${c(C.bold + C.red, line)}`);
    return;
  }

  // Default
  if (verbose) {
    console.log(`${indent(2)}${c(C.dim, line)}`);
  }
}

export function printOutcome(result: SimulationResult): void {
  console.log(c(C.bold, '══════════════════════════════'));
  console.log(c(C.bold, '  COMBAT OUTCOME'));
  console.log(c(C.bold, '══════════════════════════════'));

  const { outcome } = result;

  // Winner
  if (outcome.winner === 'draw') {
    console.log(`${indent(1)}${c(C.yellow, 'Result: DRAW')}`);
  } else {
    console.log(`${indent(1)}${c(C.bold + C.green, `Winner: ${outcome.winner}`)}`);
  }

  console.log(`${indent(1)}Rounds: ${outcome.totalRounds}`);
  console.log(`${indent(1)}Duration: ${result.durationMs}ms`);

  // Survivors
  if (outcome.survivors.length > 0) {
    console.log(`${indent(1)}${c(C.green, 'Survivors:')}`);
    for (const s of outcome.survivors) {
      console.log(`${indent(2)}${s.name} — HP: ${hpBar(s.hpRemaining, s.maxHp)}`);
    }
  }

  // Casualties
  if (outcome.casualties.length > 0) {
    console.log(`${indent(1)}${c(C.red, 'Casualties:')}`);
    for (const d of outcome.casualties) {
      console.log(`${indent(2)}${c(C.red, d.name)} (Team ${d.team})`);
    }
  }

  // Fled
  if (outcome.fled.length > 0) {
    console.log(`${indent(1)}${c(C.magenta, 'Fled:')}`);
    for (const f of outcome.fled) {
      console.log(`${indent(2)}${c(C.magenta, f.name)} (Team ${f.team})`);
    }
  }

  // Per-combatant stats
  if (outcome.combatantStats.length > 0) {
    console.log('');
    console.log(c(C.bold, '── Per-Combatant Statistics ──'));
    for (const cs of outcome.combatantStats) {
      const teamColor = cs.team === 0 ? C.cyan : C.magenta;
      console.log(
        `${indent(1)}${c(teamColor + C.bold, cs.name)} ` +
          `[Team ${cs.team}] ` +
          `Dmg dealt: ${c(C.red, String(cs.totalDamageDealt))} | ` +
          `Dmg taken: ${cs.totalDamageTaken} | ` +
          `Healing: ${c(C.green, String(cs.totalHealingDone))} | ` +
          `Kills: ${cs.kills}`,
      );
    }
  }

  console.log('');
}

// ---- Batch Mode ----

export function printBatchStats(
  results: SimulationResult[],
  scenarioName: string,
): void {
  console.log('');
  console.log(c(C.bold + C.cyan, '╔══════════════════════════════════════════════════════╗'));
  console.log(c(C.bold + C.cyan, `║  BATCH RESULTS — ${scenarioName.toUpperCase().padEnd(36)}║`));
  console.log(c(C.bold + C.cyan, '╚══════════════════════════════════════════════════════╝'));
  console.log('');

  const total = results.length;

  // Win rates by team
  const winCounts: Record<string, number> = {};
  let drawCount = 0;
  const roundCounts: number[] = [];

  for (const r of results) {
    const winner = r.outcome.winner;
    if (winner === 'draw') {
      drawCount++;
    } else {
      winCounts[winner] = (winCounts[winner] || 0) + 1;
    }
    roundCounts.push(r.outcome.totalRounds);
  }

  console.log(c(C.bold, '── Win Rates ──'));
  for (const [winner, count] of Object.entries(winCounts)) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`${indent(1)}${winner}: ${count}/${total} (${pct}%)`);
  }
  if (drawCount > 0) {
    const pct = ((drawCount / total) * 100).toFixed(1);
    console.log(`${indent(1)}Draw: ${drawCount}/${total} (${pct}%)`);
  }

  // Round statistics
  const avgRounds = roundCounts.reduce((a, b) => a + b, 0) / total;
  const minRounds = Math.min(...roundCounts);
  const maxRounds = Math.max(...roundCounts);
  console.log('');
  console.log(c(C.bold, '── Round Statistics ──'));
  console.log(`${indent(1)}Average: ${avgRounds.toFixed(1)}`);
  console.log(`${indent(1)}Min: ${minRounds}`);
  console.log(`${indent(1)}Max: ${maxRounds}`);

  // Per-combatant aggregate stats
  const combatantAgg: Record<
    string,
    { name: string; team: number; totalDmg: number; totalKills: number; wins: number; count: number }
  > = {};

  for (const r of results) {
    for (const cs of r.outcome.combatantStats) {
      if (!combatantAgg[cs.id]) {
        combatantAgg[cs.id] = {
          name: cs.name,
          team: cs.team,
          totalDmg: 0,
          totalKills: 0,
          wins: 0,
          count: 0,
        };
      }
      const agg = combatantAgg[cs.id];
      agg.totalDmg += cs.totalDamageDealt;
      agg.totalKills += cs.kills;
      agg.count++;
    }
    // Track wins by survivor presence
    for (const s of r.outcome.survivors) {
      if (combatantAgg[s.id]) {
        combatantAgg[s.id].wins++;
      }
    }
  }

  console.log('');
  console.log(c(C.bold, '── Per-Combatant Averages ──'));
  for (const agg of Object.values(combatantAgg)) {
    const teamColor = agg.team === 0 ? C.cyan : C.magenta;
    const avgDmg = (agg.totalDmg / agg.count).toFixed(1);
    const avgKills = (agg.totalKills / agg.count).toFixed(2);
    const survivalPct = ((agg.wins / agg.count) * 100).toFixed(1);
    console.log(
      `${indent(1)}${c(teamColor, agg.name)} ` +
        `Avg dmg: ${avgDmg} | Avg kills: ${avgKills} | Survival: ${survivalPct}%`,
    );
  }

  console.log('');
}

// ---- JSON Output ----

export function writeJsonResult(result: SimulationResult, outputDir: string): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `sim-${result.scenario.name}-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`${c(C.dim, 'JSON output written to:')} ${filepath}`);

  return filepath;
}

export function writeBatchJsonResult(
  results: SimulationResult[],
  scenarioName: string,
  outputDir: string,
): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `batch-${scenarioName}-${results.length}runs-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  const summary = {
    scenario: scenarioName,
    runs: results.length,
    seed: results[0]?.seed,
    results: results.map(r => ({
      winner: r.outcome.winner,
      totalRounds: r.outcome.totalRounds,
      survivors: r.outcome.survivors.map(s => s.name),
      combatantStats: r.outcome.combatantStats,
    })),
  };

  fs.writeFileSync(filepath, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`${c(C.dim, 'Batch JSON output written to:')} ${filepath}`);

  return filepath;
}
