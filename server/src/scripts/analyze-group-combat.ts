/**
 * Deep Group Combat Analysis — Ability Usage, Timing, Status Effects, Targeting, Combat Flow.
 *
 * Pulls encounter logs from the most recent group baseline sim run and produces
 * a comprehensive analysis written to docs/group-combat-deep-analysis.md.
 */

import { db, pool } from '../lib/db';
import { eq, desc, asc } from 'drizzle-orm';
import * as schema from '@database/index';
import * as fs from 'fs';
import * as path from 'path';

// ---- Types for parsed log data ----

interface CombatantSnapshot {
  id: string;
  name: string;
  entityType: string;
  team: number;
  level: number;
  race?: string;
  hp: number;
  maxHp: number;
  ac: number;
  characterClass?: string;
  weapon?: { name: string; dice?: string; bonusAttack?: number; bonusDamage?: number };
}

interface RoundEntry {
  round: number;
  actor: string;
  actorId: string;
  action: string;
  abilityName?: string;
  hit?: boolean;
  isCritical?: boolean;
  targetAC?: number;
  attackRoll?: { raw?: number; total?: number };
  damageRoll?: { total?: number; type?: string };
  targetHpBefore?: number;
  targetHpAfter?: number;
  targetKilled?: boolean;
  healAmount?: number;
  statusEffectsApplied?: string[];
  statusEffectsExpired?: string[];
  statusTickDamage?: number;
  statusTickHealing?: number;
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  saveSucceeded?: boolean;
  perTargetResults?: Array<{
    targetId: string;
    targetName: string;
    damage?: number;
    healing?: number;
    statusApplied?: string;
    hpAfter: number;
    killed?: boolean;
  }>;
  strikeResults?: Array<{
    strikeNumber: number;
    hit: boolean;
    crit?: boolean;
    damage: number;
  }>;
  buffApplied?: string;
  debuffApplied?: string;
  legendaryActions?: Array<{ abilityName: string; damage?: number; targets?: number }>;
  phaseTransition?: { phase: number; hpThreshold?: number };
  hpAfter?: Record<string, number>;
}

interface ParsedCombat {
  id: string;
  outcome: string;
  totalRounds: number;
  combatants: CombatantSnapshot[];
  rounds: RoundEntry[];
  party: string;
  level: number;
  difficulty: string;
}

// ---- Helper functions ----

function inc(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function push<T>(map: Map<string, T[]>, key: string, val: T) {
  const arr = map.get(key);
  if (arr) arr.push(val); else map.set(key, [val]);
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function pct(num: number, den: number): string {
  return den === 0 ? '0%' : `${((num / den) * 100).toFixed(1)}%`;
}

function sortMapDesc(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

// ---- Parse encounter logs ----

function parseCombats(logs: any[]): ParsedCombat[] {
  const combats: ParsedCombat[] = [];
  for (const log of logs) {
    const roundsRaw = log.rounds as any[];
    if (!roundsRaw || roundsRaw.length === 0) continue;

    // First element is encounter context
    const ctx = roundsRaw[0]?._encounterContext;
    if (!ctx) continue;

    const combatants: CombatantSnapshot[] = (ctx.combatants ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      entityType: c.entityType,
      team: c.team,
      level: c.level,
      race: c.race,
      hp: c.hp,
      maxHp: c.maxHp,
      ac: c.ac,
      characterClass: c.characterClass,
      weapon: c.weapon,
    }));

    const rounds: RoundEntry[] = roundsRaw.slice(1).map((r: any) => ({
      round: r.round,
      actor: r.actor,
      actorId: r.actorId,
      action: r.action,
      abilityName: r.abilityName ?? r.spellName,
      hit: r.hit,
      isCritical: r.isCritical,
      targetAC: r.targetAC,
      attackRoll: r.attackRoll,
      damageRoll: r.damageRoll,
      targetHpBefore: r.targetHpBefore,
      targetHpAfter: r.targetHpAfter,
      targetKilled: r.targetKilled,
      healAmount: r.healAmount,
      statusEffectsApplied: r.statusEffectsApplied ?? [],
      statusEffectsExpired: r.statusEffectsExpired ?? [],
      statusTickDamage: r.statusTickDamage,
      statusTickHealing: r.statusTickHealing,
      saveDC: r.saveDC,
      saveRoll: r.saveRoll,
      saveTotal: r.saveTotal,
      saveSucceeded: r.saveSucceeded,
      perTargetResults: r.perTargetResults,
      strikeResults: r.strikeResults,
      buffApplied: r.buffApplied,
      debuffApplied: r.debuffApplied,
      legendaryActions: r.legendaryActions,
      phaseTransition: r.phaseTransition,
      hpAfter: r.hpAfter,
    }));

    // Extract party/level/difficulty from config or log metadata
    const config = log.config ?? {};
    combats.push({
      id: log.id,
      outcome: log.outcome,
      totalRounds: log.totalRounds,
      combatants,
      rounds,
      party: log.characterName ?? config.party ?? 'Unknown',
      level: combatants.find((c: CombatantSnapshot) => c.team === 0)?.level ?? 0,
      difficulty: config.difficulty ?? 'unknown',
    });
  }
  return combats;
}

// ---- Section 1: Per-Class Ability Usage ----

interface AbilityStats {
  uses: number;
  totalDamage: number;
  totalHealing: number;
  hits: number;
  misses: number;
  saves: number;
  saveFails: number;
  kills: number;
  firstRounds: number[];
  statusApplied: Map<string, number>;
}

function analyzeClassAbilities(combats: ParsedCombat[]) {
  // classKey → abilityName → stats
  const classAbilities = new Map<string, Map<string, AbilityStats>>();
  const classActionCounts = new Map<string, number>();
  // Track combat IDs per class for per-combat averages
  const classCombatSets = new Map<string, Set<string>>();

  for (const combat of combats) {
    const playerCombatants = combat.combatants.filter(c => c.team === 0);

    for (const entry of combat.rounds) {
      const combatant = combat.combatants.find(c => c.id === entry.actorId);
      if (!combatant || combatant.team !== 0) continue;

      const cls = combatant.characterClass ?? combatant.name.split(' ').pop()?.toLowerCase() ?? 'unknown';
      const abilityName = entry.abilityName ?? entry.action;

      if (!classAbilities.has(cls)) classAbilities.set(cls, new Map());
      if (!classCombatSets.has(cls)) classCombatSets.set(cls, new Set());
      classCombatSets.get(cls)!.add(combat.id);

      const abilMap = classAbilities.get(cls)!;
      if (!abilMap.has(abilityName)) {
        abilMap.set(abilityName, {
          uses: 0, totalDamage: 0, totalHealing: 0, hits: 0, misses: 0,
          saves: 0, saveFails: 0, kills: 0, firstRounds: [], statusApplied: new Map(),
        });
      }
      const stats = abilMap.get(abilityName)!;
      stats.uses++;
      inc(classActionCounts, cls);

      // Track first use round per combat
      stats.firstRounds.push(entry.round);

      // Damage
      let dmg = 0;
      if (entry.damageRoll?.total) dmg += entry.damageRoll.total;
      if (entry.perTargetResults) {
        for (const tr of entry.perTargetResults) {
          dmg += tr.damage ?? 0;
          if (tr.killed) stats.kills++;
          if (tr.statusApplied) inc(stats.statusApplied, tr.statusApplied);
        }
      }
      if (entry.strikeResults) {
        for (const sr of entry.strikeResults) {
          dmg += sr.damage ?? 0;
          if (sr.hit) stats.hits++;
          else stats.misses++;
        }
      }
      stats.totalDamage += dmg;

      // Healing
      if (entry.healAmount) stats.totalHealing += entry.healAmount;

      // Hit/miss (single target)
      if (entry.hit === true && !entry.strikeResults) stats.hits++;
      if (entry.hit === false && !entry.strikeResults) stats.misses++;

      // Saves
      if (entry.saveDC !== undefined) {
        stats.saves++;
        if (!entry.saveSucceeded) stats.saveFails++;
      }

      // Kills (single target)
      if (entry.targetKilled && !entry.perTargetResults) stats.kills++;

      // Status effects
      if (entry.statusEffectsApplied) {
        for (const se of entry.statusEffectsApplied) {
          inc(stats.statusApplied, se);
        }
      }
    }
  }

  return { classAbilities, classActionCounts, classCombatSets };
}

// ---- Section 2: Monster Ability Usage ----

function analyzeMonsterAbilities(combats: ParsedCombat[]) {
  const monsterAbilities = new Map<string, Map<string, AbilityStats>>();
  const monsterActionCounts = new Map<string, number>();

  for (const combat of combats) {
    for (const entry of combat.rounds) {
      const combatant = combat.combatants.find(c => c.id === entry.actorId);
      if (!combatant || combatant.team !== 1) continue;

      const monsterName = combatant.name;
      const abilityName = entry.abilityName ?? entry.action;

      if (!monsterAbilities.has(monsterName)) monsterAbilities.set(monsterName, new Map());
      const abilMap = monsterAbilities.get(monsterName)!;
      if (!abilMap.has(abilityName)) {
        abilMap.set(abilityName, {
          uses: 0, totalDamage: 0, totalHealing: 0, hits: 0, misses: 0,
          saves: 0, saveFails: 0, kills: 0, firstRounds: [], statusApplied: new Map(),
        });
      }

      const stats = abilMap.get(abilityName)!;
      stats.uses++;
      inc(monsterActionCounts, monsterName);

      let dmg = 0;
      if (entry.damageRoll?.total) dmg += entry.damageRoll.total;
      if (entry.perTargetResults) {
        for (const tr of entry.perTargetResults) {
          dmg += tr.damage ?? 0;
          if (tr.killed) stats.kills++;
        }
      }
      if (entry.strikeResults) {
        for (const sr of entry.strikeResults) {
          dmg += sr.damage ?? 0;
        }
      }
      stats.totalDamage += dmg;

      if (entry.hit === true) stats.hits++;
      if (entry.hit === false) stats.misses++;
      if (entry.saveDC !== undefined) {
        stats.saves++;
        if (!entry.saveSucceeded) stats.saveFails++;
      }
      if (entry.targetKilled && !entry.perTargetResults) stats.kills++;
      if (entry.statusEffectsApplied) {
        for (const se of entry.statusEffectsApplied) inc(stats.statusApplied, se);
      }

      // Legendary actions
      if (entry.legendaryActions) {
        for (const la of entry.legendaryActions) {
          const laName = `[Legendary] ${la.abilityName}`;
          if (!abilMap.has(laName)) {
            abilMap.set(laName, {
              uses: 0, totalDamage: 0, totalHealing: 0, hits: 0, misses: 0,
              saves: 0, saveFails: 0, kills: 0, firstRounds: [], statusApplied: new Map(),
            });
          }
          const laStats = abilMap.get(laName)!;
          laStats.uses++;
          laStats.totalDamage += la.damage ?? 0;
        }
      }
    }
  }

  return { monsterAbilities, monsterActionCounts };
}

// ---- Section 3: Status Effect Analysis ----

interface StatusImpact {
  timesApplied: number;
  sources: Map<string, number>;
  turnsActive: number;
  turnsPrevented: number;
  dotDamage: number;
  hotHealing: number;
  affectedCombatants: Set<string>;
}

function analyzeStatusEffects(combats: ParsedCombat[]) {
  const statuses = new Map<string, StatusImpact>();

  function getOrCreate(name: string): StatusImpact {
    if (!statuses.has(name)) {
      statuses.set(name, {
        timesApplied: 0, sources: new Map(), turnsActive: 0, turnsPrevented: 0,
        dotDamage: 0, hotHealing: 0, affectedCombatants: new Set(),
      });
    }
    return statuses.get(name)!;
  }

  // Track active statuses per combatant across rounds
  for (const combat of combats) {
    // Track which statuses are currently on each combatant
    const activeStatuses = new Map<string, Set<string>>(); // combatantId → Set<statusName>

    for (const entry of combat.rounds) {
      // Status applications
      if (entry.statusEffectsApplied) {
        for (const se of entry.statusEffectsApplied) {
          const impact = getOrCreate(se);
          impact.timesApplied++;
          const sourceName = entry.abilityName ?? entry.action ?? 'unknown';
          const actorName = entry.actor ?? 'unknown';
          inc(impact.sources, `${actorName}: ${sourceName}`);
        }
      }

      // Status tick damage
      if (entry.statusTickDamage && entry.statusTickDamage > 0) {
        // Attribute to whatever statuses are active on this combatant
        const actorStatuses = activeStatuses.get(entry.actorId);
        if (actorStatuses) {
          for (const se of actorStatuses) {
            if (['poisoned', 'burning', 'diseased'].includes(se)) {
              getOrCreate(se).dotDamage += entry.statusTickDamage;
              break; // attribute to first DoT found
            }
          }
        }
      }

      // Status tick healing
      if (entry.statusTickHealing && entry.statusTickHealing > 0) {
        const actorStatuses = activeStatuses.get(entry.actorId);
        if (actorStatuses) {
          for (const se of actorStatuses) {
            if (se === 'regenerating') {
              getOrCreate(se).hotHealing += entry.statusTickHealing;
              break;
            }
          }
        }
      }

      // Track turns prevented (action = defend/noOp while stunned/frozen/paralyzed)
      if (entry.action === 'defend' || entry.action === 'noOp') {
        const actorStatuses = activeStatuses.get(entry.actorId);
        if (actorStatuses) {
          for (const se of actorStatuses) {
            if (['stunned', 'frozen', 'paralyzed', 'dominated', 'banished', 'mesmerize', 'skip_turn'].includes(se)) {
              getOrCreate(se).turnsPrevented++;
              break;
            }
          }
        }
      }

      // Update active status tracking
      if (entry.statusEffectsApplied) {
        for (const se of entry.statusEffectsApplied) {
          if (!activeStatuses.has(entry.actorId)) activeStatuses.set(entry.actorId, new Set());
          // The status is applied to the TARGET, not the actor
          // But the log entry records it on the actor's line... need to handle both
          // perTargetResults track per-target status applications
        }
      }

      // Track from perTargetResults
      if (entry.perTargetResults) {
        for (const tr of entry.perTargetResults) {
          if (tr.statusApplied) {
            if (!activeStatuses.has(tr.targetId)) activeStatuses.set(tr.targetId, new Set());
            activeStatuses.get(tr.targetId)!.add(tr.statusApplied);
            getOrCreate(tr.statusApplied).affectedCombatants.add(tr.targetId);
          }
        }
      }

      // Expirations
      if (entry.statusEffectsExpired) {
        for (const se of entry.statusEffectsExpired) {
          const actorStatuses = activeStatuses.get(entry.actorId);
          if (actorStatuses) actorStatuses.delete(se);
        }
      }
    }
  }

  return statuses;
}

// ---- Section 4: Targeting Analysis ----

function analyzeTargeting(combats: ParsedCombat[]) {
  let totalPlayerAttacks = 0;
  let attacksOnLowestHp = 0;
  let totalClericHeals = 0;
  let healsOnLowestHpAlly = 0;
  let tauntActiveAttacks = 0;
  let tauntRedirectedAttacks = 0;
  let monsterSpreadAttacks = 0;
  let monsterUniqueTargets = 0;
  let monsterTotalAttackRounds = 0;
  let aoeWith3Plus = 0;
  let aoeWith1or2 = 0;

  for (const combat of combats) {
    const players = combat.combatants.filter(c => c.team === 0);
    const monsters = combat.combatants.filter(c => c.team === 1);

    // Track HP per combatant across rounds
    const currentHp = new Map<string, number>();
    for (const c of combat.combatants) currentHp.set(c.id, c.hp);

    for (const entry of combat.rounds) {
      const actor = combat.combatants.find(c => c.id === entry.actorId);
      if (!actor) continue;

      // Update HP from hpAfter snapshot
      if (entry.hpAfter) {
        for (const [name, hp] of Object.entries(entry.hpAfter)) {
          const c = combat.combatants.find(x => x.name === name);
          if (c) currentHp.set(c.id, hp as number);
        }
      }

      // Player targeting analysis
      if (actor.team === 0) {
        const isHeal = entry.action === 'class_ability' && (entry.healAmount ?? 0) > 0;
        const isDamage = (entry.damageRoll?.total ?? 0) > 0 || (entry.perTargetResults?.some(tr => (tr.damage ?? 0) > 0));

        if (isDamage && !isHeal) {
          totalPlayerAttacks++;
          // Check if target is lowest HP enemy
          const aliveMonsters = monsters.filter(m => (currentHp.get(m.id) ?? 0) > 0);
          if (aliveMonsters.length > 0) {
            const lowestHpMonster = aliveMonsters.reduce((a, b) =>
              (currentHp.get(a.id) ?? 999) < (currentHp.get(b.id) ?? 999) ? a : b
            );
            // Determine target from the log
            if (entry.targetHpAfter !== undefined || entry.perTargetResults) {
              // For single target, check if the damaged monster was the lowest HP
              // We can't always tell the exact target, but we can check from hpAfter changes
            }
          }
        }

        // AoE analysis
        if (entry.perTargetResults && entry.perTargetResults.length > 1) {
          const aliveMonsters = monsters.filter(m => (currentHp.get(m.id) ?? 0) > 0);
          if (aliveMonsters.length >= 3) aoeWith3Plus++;
          else aoeWith1or2++;
        }
      }

      // Monster targeting
      if (actor.team === 1 && !entry.perTargetResults) {
        monsterTotalAttackRounds++;
      }
    }
  }

  return {
    totalPlayerAttacks, attacksOnLowestHp,
    totalClericHeals, healsOnLowestHpAlly,
    tauntActiveAttacks, tauntRedirectedAttacks,
    aoeWith3Plus, aoeWith1or2,
    monsterTotalAttackRounds,
  };
}

// ---- Section 5: Combat Flow ----

function analyzeCombatFlow(combats: ParsedCombat[]) {
  const firstPlayerDeathRounds: number[] = [];
  const firstMonsterDeathRounds: number[] = [];
  const roundsToEnd: number[] = [];
  const partyWins = combats.filter(c => c.outcome === 'win').length;
  const partyLosses = combats.filter(c => c.outcome === 'loss').length;

  // HP curves by round
  const hpCurves = new Map<number, { playerHpPct: number[]; monsterHpPct: number[] }>();

  // Actions per round
  const playerActionsPerRound: number[] = [];
  const monsterActionsPerRound: number[] = [];

  for (const combat of combats) {
    const players = combat.combatants.filter(c => c.team === 0);
    const monsters = combat.combatants.filter(c => c.team === 1);
    const totalPlayerHp = players.reduce((s, p) => s + p.maxHp, 0);
    const totalMonsterHp = monsters.reduce((s, m) => s + m.maxHp, 0);

    let firstPlayerDeath: number | null = null;
    let firstMonsterDeath: number | null = null;

    // Track HP by round
    const currentHp = new Map<string, number>();
    for (const c of combat.combatants) currentHp.set(c.id, c.hp);

    let prevRound = 0;
    let roundPlayerActions = 0;
    let roundMonsterActions = 0;

    for (const entry of combat.rounds) {
      if (entry.round !== prevRound) {
        if (prevRound > 0) {
          // Store per-round action counts
          while (playerActionsPerRound.length < prevRound) playerActionsPerRound.push(0);
          while (monsterActionsPerRound.length < prevRound) monsterActionsPerRound.push(0);
        }
        prevRound = entry.round;
        roundPlayerActions = 0;
        roundMonsterActions = 0;
      }

      const actor = combat.combatants.find(c => c.id === entry.actorId);
      if (actor?.team === 0) roundPlayerActions++;
      if (actor?.team === 1) roundMonsterActions++;

      // Update HP from hpAfter
      if (entry.hpAfter) {
        for (const [name, hp] of Object.entries(entry.hpAfter)) {
          const c = combat.combatants.find(x => x.name === name);
          if (c) currentHp.set(c.id, hp as number);
        }
      }

      // Check for kills
      if (entry.targetKilled) {
        // Find who died — check all combatants for HP 0
        for (const c of combat.combatants) {
          if ((currentHp.get(c.id) ?? 1) <= 0) {
            if (c.team === 0 && firstPlayerDeath === null) firstPlayerDeath = entry.round;
            if (c.team === 1 && firstMonsterDeath === null) firstMonsterDeath = entry.round;
          }
        }
      }
      if (entry.perTargetResults) {
        for (const tr of entry.perTargetResults) {
          if (tr.killed) {
            const c = combat.combatants.find(x => x.id === tr.targetId);
            if (c?.team === 0 && firstPlayerDeath === null) firstPlayerDeath = entry.round;
            if (c?.team === 1 && firstMonsterDeath === null) firstMonsterDeath = entry.round;
          }
        }
      }

      // HP curve tracking at end of each round
      if (entry.hpAfter) {
        if (!hpCurves.has(entry.round)) {
          hpCurves.set(entry.round, { playerHpPct: [], monsterHpPct: [] });
        }
        const curve = hpCurves.get(entry.round)!;
        let pHp = 0;
        for (const p of players) pHp += Math.max(0, currentHp.get(p.id) ?? 0);
        let mHp = 0;
        for (const m of monsters) mHp += Math.max(0, currentHp.get(m.id) ?? 0);
        curve.playerHpPct.push(totalPlayerHp > 0 ? pHp / totalPlayerHp : 0);
        curve.monsterHpPct.push(totalMonsterHp > 0 ? mHp / totalMonsterHp : 0);
      }
    }

    if (firstPlayerDeath !== null) firstPlayerDeathRounds.push(firstPlayerDeath);
    if (firstMonsterDeath !== null) firstMonsterDeathRounds.push(firstMonsterDeath);
    roundsToEnd.push(combat.totalRounds);
  }

  // HP curve averages
  const hpCurveAvg = new Map<number, { playerPct: number; monsterPct: number }>();
  for (const [round, data] of hpCurves) {
    hpCurveAvg.set(round, {
      playerPct: avg(data.playerHpPct),
      monsterPct: avg(data.monsterHpPct),
    });
  }

  return {
    partyWins,
    partyLosses,
    firstPlayerDeathRound: avg(firstPlayerDeathRounds),
    firstMonsterDeathRound: avg(firstMonsterDeathRounds),
    avgRounds: avg(roundsToEnd),
    hpCurveAvg,
    totalCombats: combats.length,
  };
}

// ---- Status Effect Mechanical Definitions (from code audit) ----

const STATUS_MECHANICS: Record<string, { effect: string; verdict: string }> = {
  stunned: { effect: 'Prevents action, AC -2, save -4', verdict: 'ACTIVE' },
  frozen: { effect: 'Prevents action, AC -4, save -2', verdict: 'ACTIVE' },
  paralyzed: { effect: 'Prevents action, AC -4, save -4', verdict: 'ACTIVE' },
  poisoned: { effect: 'DoT (3/round), attack -2', verdict: 'ACTIVE' },
  burning: { effect: 'DoT (5/round)', verdict: 'ACTIVE' },
  diseased: { effect: 'DoT (2/round), attack -1, save -1', verdict: 'ACTIVE' },
  blinded: { effect: 'Attack -4, AC -2', verdict: 'ACTIVE' },
  weakened: { effect: 'Attack -3, save -2', verdict: 'ACTIVE' },
  slowed: { effect: 'Attack -2, AC -2, save -2, +5 flee DC', verdict: 'PARTIAL — flee DC useless in group combat' },
  frightened: { effect: 'Attack -2, save -2 (from fear_aura)', verdict: 'ACTIVE' },
  knocked_down: { effect: 'Attack -2, AC -2', verdict: 'ACTIVE' },
  restrained: { effect: 'Attack -4, AC -2, save -2', verdict: 'ACTIVE' },
  silence: { effect: 'Blocks non-damage class abilities (fallback to basic attack)', verdict: 'ACTIVE (gap: psion abilities not blocked)' },
  taunt: { effect: 'Forces attack on taunter, AC -2 on taunted', verdict: 'ACTIVE' },
  root: { effect: 'AC -3, blocks flee', verdict: 'PARTIAL — flee block useless in group combat, AC penalty is active' },
  dominated: { effect: 'Hijacks action — forces ally attack', verdict: 'ACTIVE' },
  banished: { effect: 'Turn skipped entirely, 4d6+stun on return', verdict: 'ACTIVE' },
  mesmerize: { effect: 'Prevents action, breaks on damage', verdict: 'ACTIVE' },
  polymorph: { effect: 'Blocks class abilities, attack -4, AC -5, save -2', verdict: 'ACTIVE (gap: psion abilities not blocked)' },
  skip_turn: { effect: 'Prevents action', verdict: 'ACTIVE' },
  blessed: { effect: 'Attack +2, save +2', verdict: 'ACTIVE (buff)' },
  shielded: { effect: 'AC +4', verdict: 'ACTIVE (buff)' },
  hasted: { effect: 'Attack +2, AC +2', verdict: 'ACTIVE (buff)' },
  phased: { effect: 'AC +4', verdict: 'ACTIVE (buff)' },
  foresight: { effect: 'AC +2, save +2', verdict: 'ACTIVE (buff)' },
  regenerating: { effect: 'HoT (5/round)', verdict: 'ACTIVE (buff)' },
  swallowed: { effect: 'Force attack swallower, digestive DoT, attack -4, AC -2, save -2', verdict: 'ACTIVE' },
};

// ---- Report Generation ----

function generateReport(combats: ParsedCombat[]): string {
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  w('# Deep Group Combat Analysis');
  w('');
  w(`**Date:** ${new Date().toISOString().split('T')[0]}`);
  w(`**Source:** Most recent group baseline sim run (${combats.length} combats)`);
  w(`**Overall Win Rate:** ${pct(combats.filter(c => c.outcome === 'win').length, combats.length)}`);
  w('');

  // ---- Section 1: Per-Class Ability Usage ----
  w('---');
  w('');
  w('## Section 1: Per-Class Ability Usage');
  w('');

  const { classAbilities, classActionCounts, classCombatSets } = analyzeClassAbilities(combats);

  for (const [cls, abilMap] of [...classAbilities.entries()].sort()) {
    const totalActions = classActionCounts.get(cls) ?? 0;
    const combatCount = classCombatSets.get(cls)?.size ?? 1;

    w(`### ${cls.charAt(0).toUpperCase() + cls.slice(1)}`);
    w('');
    w(`Total actions: ${totalActions} across ${combatCount} combats (${(totalActions / combatCount).toFixed(1)}/combat)`);
    w('');
    w('| Ability | Uses | %Actions | Avg Dmg | Avg Heal | Hit Rate | Kill% | Avg Round |');
    w('|---------|------|----------|---------|----------|----------|-------|-----------|');

    const sorted = [...abilMap.entries()].sort((a, b) => b[1].uses - a[1].uses);
    for (const [name, stats] of sorted) {
      const pctActions = pct(stats.uses, totalActions);
      const avgDmg = stats.totalDamage > 0 ? (stats.totalDamage / stats.uses).toFixed(1) : '-';
      const avgHeal = stats.totalHealing > 0 ? (stats.totalHealing / stats.uses).toFixed(1) : '-';
      const hitRate = (stats.hits + stats.misses) > 0 ? pct(stats.hits, stats.hits + stats.misses) : '-';
      const killPct = stats.kills > 0 ? pct(stats.kills, stats.uses) : '-';
      const avgRound = stats.firstRounds.length > 0 ? avg(stats.firstRounds).toFixed(1) : '-';
      w(`| ${name} | ${stats.uses} | ${pctActions} | ${avgDmg} | ${avgHeal} | ${hitRate} | ${killPct} | ${avgRound} |`);
    }
    w('');

    // Status effects applied by this class
    const allStatuses = new Map<string, number>();
    for (const [, stats] of abilMap) {
      for (const [se, count] of stats.statusApplied) inc(allStatuses, se, count);
    }
    if (allStatuses.size > 0) {
      w('**Status effects applied:** ' + [...allStatuses.entries()].map(([se, n]) => `${se}(${n})`).join(', '));
      w('');
    }
  }

  // ---- Section 2: Monster Ability Usage ----
  w('---');
  w('');
  w('## Section 2: Per-Monster Ability Usage');
  w('');

  const { monsterAbilities, monsterActionCounts } = analyzeMonsterAbilities(combats);

  // Aggregate monster damage across all instances
  const monsterTotalDamage = new Map<string, number>();
  const monsterAppearances = new Map<string, number>();

  for (const [monster, abilMap] of monsterAbilities) {
    let totalDmg = 0;
    for (const [, stats] of abilMap) totalDmg += stats.totalDamage;
    inc(monsterTotalDamage, monster, totalDmg);
  }

  // Top monsters by total damage
  w('### Top Monsters by Total Damage');
  w('');
  w('| Monster | Total Damage | Total Actions | Avg Dmg/Action |');
  w('|---------|-------------|---------------|----------------|');
  for (const [monster, dmg] of sortMapDesc(monsterTotalDamage).slice(0, 15)) {
    const actions = monsterActionCounts.get(monster) ?? 1;
    w(`| ${monster} | ${dmg} | ${actions} | ${(dmg / actions).toFixed(1)} |`);
  }
  w('');

  // Top abilities by total damage (across all monsters)
  const abilityDamageRanking = new Map<string, number>();
  const abilityUsesRanking = new Map<string, number>();
  for (const [monster, abilMap] of monsterAbilities) {
    for (const [abil, stats] of abilMap) {
      const key = `${monster}: ${abil}`;
      inc(abilityDamageRanking, key, stats.totalDamage);
      inc(abilityUsesRanking, key, stats.uses);
    }
  }

  w('### Top Monster Abilities by Total Damage');
  w('');
  w('| Monster: Ability | Uses | Total Damage | Avg Dmg/Use |');
  w('|-----------------|------|-------------|-------------|');
  for (const [key, dmg] of sortMapDesc(abilityDamageRanking).slice(0, 20)) {
    const uses = abilityUsesRanking.get(key) ?? 1;
    w(`| ${key} | ${uses} | ${dmg} | ${(dmg / uses).toFixed(1)} |`);
  }
  w('');

  // ---- Section 3: Status Effects ----
  w('---');
  w('');
  w('## Section 3: Status Effect Impact Analysis');
  w('');

  const statuses = analyzeStatusEffects(combats);

  w('| Status | Times Applied | Top Sources | Mechanical Effect | DoT/Turns Prevented | Verdict |');
  w('|--------|--------------|-------------|-------------------|--------------------|---------');

  for (const [name, impact] of [...statuses.entries()].sort((a, b) => b[1].timesApplied - a[1].timesApplied)) {
    const topSources = sortMapDesc(impact.sources).slice(0, 3).map(([s, n]) => `${s}(${n})`).join(', ');
    const mechInfo = STATUS_MECHANICS[name] ?? { effect: 'Unknown', verdict: '???' };
    let impactStr = '';
    if (impact.turnsPrevented > 0) impactStr += `${impact.turnsPrevented} turns prevented`;
    if (impact.dotDamage > 0) impactStr += `${impactStr ? ', ' : ''}${impact.dotDamage} DoT dmg`;
    if (impact.hotHealing > 0) impactStr += `${impactStr ? ', ' : ''}${impact.hotHealing} HoT heal`;
    if (!impactStr) impactStr = '-';
    w(`| ${name} | ${impact.timesApplied} | ${topSources} | ${mechInfo.effect} | ${impactStr} | ${mechInfo.verdict} |`);
  }
  w('');

  // ---- Section 4: Targeting ----
  w('---');
  w('');
  w('## Section 4: Targeting Analysis');
  w('');

  const targeting = analyzeTargeting(combats);
  w(`- AoE fired with 3+ enemies alive: ${targeting.aoeWith3Plus}`);
  w(`- AoE fired with 1-2 enemies alive: ${targeting.aoeWith1or2}`);
  w(`- Monster single-target actions: ${targeting.monsterTotalAttackRounds}`);
  w('');

  // ---- Section 5: Combat Flow ----
  w('---');
  w('');
  w('## Section 5: Combat Flow Analysis');
  w('');

  const flow = analyzeCombatFlow(combats);
  w(`- **Total combats:** ${flow.totalCombats}`);
  w(`- **Party wins:** ${flow.partyWins} (${pct(flow.partyWins, flow.totalCombats)})`);
  w(`- **Party losses:** ${flow.partyLosses} (${pct(flow.partyLosses, flow.totalCombats)})`);
  w(`- **Avg rounds per combat:** ${flow.avgRounds.toFixed(1)}`);
  w(`- **First party member dies (avg round):** ${flow.firstPlayerDeathRound.toFixed(1)}`);
  w(`- **First monster dies (avg round):** ${flow.firstMonsterDeathRound.toFixed(1)}`);
  w('');

  // HP curves
  w('### HP Curves by Round');
  w('');
  w('| Round | Party HP% | Monster HP% |');
  w('|-------|-----------|-------------|');
  const sortedRounds = [...flow.hpCurveAvg.entries()].sort((a, b) => a[0] - b[0]);
  for (const [round, data] of sortedRounds.slice(0, 15)) {
    w(`| ${round} | ${(data.playerPct * 100).toFixed(1)}% | ${(data.monsterPct * 100).toFixed(1)}% |`);
  }
  w('');

  // Level breakdown
  w('### Win Rate by Level');
  w('');
  const levelWins = new Map<number, { wins: number; total: number }>();
  for (const c of combats) {
    const lvl = c.level;
    if (!levelWins.has(lvl)) levelWins.set(lvl, { wins: 0, total: 0 });
    const entry = levelWins.get(lvl)!;
    entry.total++;
    if (c.outcome === 'win') entry.wins++;
  }
  w('| Level | Win Rate | Combats |');
  w('|-------|----------|---------|');
  for (const [lvl, data] of [...levelWins.entries()].sort((a, b) => a[0] - b[0])) {
    w(`| ${lvl} | ${pct(data.wins, data.total)} | ${data.total} |`);
  }
  w('');

  return lines.join('\n');
}

// ---- Main ----

async function main() {
  try {
    // Find most recent group sim run
    // Drizzle doesn't support JSON path queries directly; query recent and filter
    const allRuns = await db.query.simulationRuns.findMany({
      orderBy: desc(schema.simulationRuns.startedAt),
      limit: 50,
    });

    const latestRun = allRuns.find(r => {
      const config = r.config as any;
      return config?.source === 'batch-cli-group';
    });

    if (!latestRun) {
      console.error('No group sim runs found in DB');
      process.exit(1);
    }

    console.log(`Found sim run: ${latestRun.id} (${latestRun.startedAt})`);

    // Pull all encounter logs
    const logs = await db.query.combatEncounterLogs.findMany({
      where: eq(schema.combatEncounterLogs.simulationRunId, latestRun.id),
      orderBy: asc(schema.combatEncounterLogs.startedAt),
    });

    console.log(`Loaded ${logs.length} encounter logs`);

    // Parse
    const combats = parseCombats(logs);
    console.log(`Parsed ${combats.length} combats`);

    if (combats.length === 0) {
      console.error('No parseable combats found');
      process.exit(1);
    }

    // Generate report
    const report = generateReport(combats);

    // Write to file
    const outPath = path.resolve(__dirname, '../../../docs/group-combat-deep-analysis.md');
    fs.writeFileSync(outPath, report, 'utf-8');
    console.log(`Report written to: ${outPath}`);

    // Print chat summary
    console.log('\n=== CHAT SUMMARY ===\n');

    // Top player abilities by damage
    const { classAbilities } = analyzeClassAbilities(combats);
    const allPlayerAbilDmg: [string, number, number][] = []; // [name, totalDmg, uses]
    for (const [cls, abilMap] of classAbilities) {
      for (const [name, stats] of abilMap) {
        if (stats.totalDamage > 0) allPlayerAbilDmg.push([`${cls}: ${name}`, stats.totalDamage, stats.uses]);
      }
    }
    allPlayerAbilDmg.sort((a, b) => b[1] - a[1]);
    console.log('Top 3 most impactful PLAYER abilities (by total damage):');
    for (const [name, dmg, uses] of allPlayerAbilDmg.slice(0, 3)) {
      console.log(`  ${name} — ${dmg} total damage (${uses} uses, ${(dmg / uses).toFixed(1)} avg)`);
    }

    // Top monster abilities by damage
    const { monsterAbilities: mAbils } = analyzeMonsterAbilities(combats);
    const allMonsterAbilDmg: [string, number, number][] = [];
    for (const [monster, abilMap] of mAbils) {
      for (const [name, stats] of abilMap) {
        if (stats.totalDamage > 0) allMonsterAbilDmg.push([`${monster}: ${name}`, stats.totalDamage, stats.uses]);
      }
    }
    allMonsterAbilDmg.sort((a, b) => b[1] - a[1]);
    console.log('\nTop 3 most impactful MONSTER abilities (by total damage):');
    for (const [name, dmg, uses] of allMonsterAbilDmg.slice(0, 3)) {
      console.log(`  ${name} — ${dmg} total damage (${uses} uses, ${(dmg / uses).toFixed(1)} avg)`);
    }

    // Status effects
    const statuses = analyzeStatusEffects(combats);
    const deadStatuses: string[] = [];
    const activeStatuses: string[] = [];
    for (const [name, impact] of statuses) {
      const mech = STATUS_MECHANICS[name];
      if (mech?.verdict.startsWith('DEAD') || mech?.verdict.startsWith('PARTIAL')) {
        deadStatuses.push(`${name} (${impact.timesApplied} applications)`);
      }
      if (impact.turnsPrevented > 0 || impact.dotDamage > 0 || impact.hotHealing > 0) {
        activeStatuses.push(name);
      }
    }
    console.log('\nDead/Partial status effects:', deadStatuses.length > 0 ? deadStatuses.join(', ') : 'None found');

    // Zero-damage abilities fired 100+ times
    console.log('\nAbilities used 100+ times with 0 total damage:');
    let zeroCount = 0;
    for (const [cls, abilMap] of classAbilities) {
      for (const [name, stats] of abilMap) {
        if (stats.uses >= 100 && stats.totalDamage === 0 && stats.totalHealing === 0) {
          console.log(`  ${cls}: ${name} — ${stats.uses} uses, 0 damage, 0 healing`);
          zeroCount++;
        }
      }
    }
    if (zeroCount === 0) console.log('  None');

    // Combat flow
    const flow = analyzeCombatFlow(combats);
    console.log(`\nCombat flow:`);
    console.log(`  Win rate: ${pct(flow.partyWins, flow.totalCombats)}`);
    console.log(`  Avg rounds: ${flow.avgRounds.toFixed(1)}`);
    console.log(`  First party death (avg round): ${flow.firstPlayerDeathRound.toFixed(1)}`);
    console.log(`  First monster death (avg round): ${flow.firstMonsterDeathRound.toFixed(1)}`);

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
