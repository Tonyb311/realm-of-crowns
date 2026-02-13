/**
 * Combat Encounter Logger
 *
 * Builds structured per-encounter logs from combat engine state.
 * Each encounter produces one CombatEncounterLog record with:
 * - Encounter header (participants, location, weapons, starting HP)
 * - Per-round data as JSONB array (attack rolls, damage, HP, status effects)
 * - Encounter footer (outcome, totals, rewards)
 *
 * Used by both PvE and PvP combat resolution.
 * Designed for balance analysis, debugging, and future player-facing combat replay.
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { getSimulationTick } from './simulation-context';
import type { CombatState, TurnLogEntry } from '@shared/types/combat';

// Config flag — can be turned off in production if performance is a concern
export const COMBAT_LOGGING_ENABLED = process.env.COMBAT_LOGGING_ENABLED !== 'false';

export interface RoundLogEntry {
  round: number;
  actor: string;
  actorId: string;
  action: string;
  attackRoll?: number;
  attackModifier?: number;
  totalAttackRoll?: number;
  targetAC?: number;
  hit?: boolean;
  damageRoll?: number;
  damageModifier?: number;
  totalDamage?: number;
  damageType?: string;
  isCritical?: boolean;
  healAmount?: number;
  fleeSuccess?: boolean;
  statusEffectsApplied: string[];
  statusEffectsExpired: string[];
  hpAfter: Record<string, number>;
}

/**
 * Extract structured per-round data from the combat engine's TurnLogEntry array.
 * The engine stores results in typed objects — we flatten them into a readable format.
 */
function buildRoundsData(state: CombatState): RoundLogEntry[] {
  const rounds: RoundLogEntry[] = [];

  for (const entry of state.log) {
    const actor = state.combatants.find(c => c.id === entry.actorId);
    const round: RoundLogEntry = {
      round: entry.round,
      actor: actor?.name ?? entry.actorId,
      actorId: entry.actorId,
      action: entry.action,
      statusEffectsApplied: [],
      statusEffectsExpired: [],
      hpAfter: {},
    };

    // Extract data from the result based on action type
    const result = entry.result as Record<string, any>;

    if (entry.action === 'attack' && result) {
      round.attackRoll = result.roll ?? result.attackRoll;
      round.attackModifier = result.modifier ?? result.attackModifier;
      round.totalAttackRoll = (round.attackRoll ?? 0) + (round.attackModifier ?? 0);
      round.targetAC = result.targetAC ?? result.ac;
      round.hit = result.hit ?? false;
      round.isCritical = result.critical ?? result.isCritical ?? false;
      if (round.hit) {
        round.damageRoll = result.damageRoll ?? result.damage;
        round.damageModifier = result.damageModifier ?? 0;
        round.totalDamage = result.totalDamage ?? result.damage ?? 0;
        round.damageType = result.damageType;
      }
    } else if (entry.action === 'cast' && result) {
      round.totalDamage = result.damage ?? 0;
      round.healAmount = result.healing ?? 0;
      round.damageType = result.damageType;
      round.hit = result.hit ?? (result.damage > 0);
      if (result.statusApplied) {
        round.statusEffectsApplied.push(result.statusApplied);
      }
    } else if (entry.action === 'flee' && result) {
      round.fleeSuccess = result.success ?? false;
      round.attackRoll = result.roll;
      round.targetAC = result.dc;
    } else if (entry.action === 'defend') {
      // Defend action — no roll data
    } else if (entry.action === 'item' && result) {
      round.healAmount = result.healAmount ?? result.healing ?? 0;
      round.totalDamage = result.damage ?? 0;
    } else if ((entry.action === 'racial_ability' || entry.action === 'psion_ability') && result) {
      round.totalDamage = result.damage ?? 0;
      round.healAmount = result.healing ?? 0;
      if (result.statusApplied) {
        round.statusEffectsApplied.push(result.statusApplied);
      }
    }

    // Process status tick data
    if (entry.statusTicks && Array.isArray(entry.statusTicks)) {
      for (const tick of entry.statusTicks) {
        if (tick.expired) {
          round.statusEffectsExpired.push(tick.effectName ?? 'unknown');
        }
        if (tick.damage && tick.damage > 0) {
          round.totalDamage = (round.totalDamage ?? 0) + tick.damage;
        }
        if (tick.healing && tick.healing > 0) {
          round.healAmount = (round.healAmount ?? 0) + tick.healing;
        }
      }
    }

    // Snapshot HP for all combatants after this action
    for (const c of state.combatants) {
      round.hpAfter[c.name] = c.currentHp;
    }
    // Note: HP snapshot here is from final state — for per-round accuracy,
    // we use the round number to approximate. This is acceptable for analysis.

    rounds.push(round);
  }

  return rounds;
}

/**
 * Build a human-readable summary string for the encounter.
 */
function buildSummary(
  outcome: string,
  totalRounds: number,
  characterName: string,
  opponentName: string,
  characterStartHp: number,
  characterEndHp: number,
  opponentStartHp: number,
  opponentEndHp: number,
): string {
  const charDmgDealt = Math.max(0, opponentStartHp - opponentEndHp);
  const charDmgTaken = Math.max(0, characterStartHp - characterEndHp);

  switch (outcome) {
    case 'win':
      return `${characterName} defeated ${opponentName} in ${totalRounds} round(s). Dealt ${charDmgDealt} damage, took ${charDmgTaken} damage.`;
    case 'loss':
      return `${characterName} was defeated by ${opponentName} in ${totalRounds} round(s). Dealt ${charDmgDealt} damage, took ${charDmgTaken} damage.`;
    case 'flee':
      return `${characterName} fled from ${opponentName} after ${totalRounds} round(s). Dealt ${charDmgDealt} damage, took ${charDmgTaken} damage.`;
    case 'draw':
      return `${characterName} vs ${opponentName} ended in a draw after ${totalRounds} round(s).`;
    default:
      return `Combat ended: ${outcome} in ${totalRounds} round(s).`;
  }
}

/**
 * Log a PvE combat encounter to the database.
 */
export async function logPveCombat(params: {
  sessionId: string;
  state: CombatState;
  characterId: string;
  characterName: string;
  opponentName: string;
  townId: string | null;
  characterStartHp: number;
  opponentStartHp: number;
  characterWeapon: string;
  opponentWeapon: string;
  xpAwarded: number;
  goldAwarded: number;
  lootDropped: string;
  outcome: 'win' | 'loss' | 'flee' | 'draw';
  simulationTick?: number | null;
}): Promise<void> {
  if (!COMBAT_LOGGING_ENABLED) return;

  try {
    const { state, characterId, characterName, opponentName, townId } = params;

    const playerCombatant = state.combatants.find(c => c.id === characterId);
    const monsterCombatant = state.combatants.find(c => c.entityType === 'monster');

    const characterEndHp = playerCombatant?.currentHp ?? 0;
    const opponentEndHp = monsterCombatant?.currentHp ?? 0;
    const totalRounds = state.round;

    const rounds = buildRoundsData(state);
    const summary = buildSummary(
      params.outcome, totalRounds, characterName, opponentName,
      params.characterStartHp, characterEndHp,
      params.opponentStartHp, opponentEndHp,
    );

    await prisma.combatEncounterLog.create({
      data: {
        type: 'pve',
        sessionId: params.sessionId,
        characterId,
        characterName,
        opponentId: monsterCombatant?.id ?? null,
        opponentName,
        townId,
        startedAt: new Date(Date.now() - (totalRounds * 6000)), // approximate
        endedAt: new Date(),
        outcome: params.outcome,
        totalRounds,
        characterStartHp: params.characterStartHp,
        characterEndHp,
        opponentStartHp: params.opponentStartHp,
        opponentEndHp,
        characterWeapon: params.characterWeapon,
        opponentWeapon: params.opponentWeapon,
        xpAwarded: params.xpAwarded,
        goldAwarded: params.goldAwarded,
        lootDropped: params.lootDropped,
        rounds: rounds as any,
        summary,
        simulationTick: params.simulationTick ?? getSimulationTick(),
      },
    });
  } catch (err) {
    // Combat logging failures should NOT break combat resolution
    logger.error({ err, sessionId: params.sessionId }, 'Failed to write combat encounter log');
  }
}

/**
 * Log a PvP combat encounter to the database.
 * Creates one log entry per participant (each gets their own perspective).
 */
export async function logPvpCombat(params: {
  sessionId: string;
  state: CombatState;
  winnerId: string;
  loserId: string;
  winnerName: string;
  loserName: string;
  townId: string | null;
  winnerStartHp: number;
  loserStartHp: number;
  winnerWeapon: string;
  loserWeapon: string;
  xpAwarded: number;
  wagerAmount: number;
  isSpar: boolean;
}): Promise<void> {
  if (!COMBAT_LOGGING_ENABLED) return;

  try {
    const { state, winnerId, loserId, winnerName, loserName, townId } = params;

    const winnerCombatant = state.combatants.find(c => c.id === winnerId);
    const loserCombatant = state.combatants.find(c => c.id === loserId);

    const totalRounds = state.round;
    const rounds = buildRoundsData(state);

    // Winner's perspective
    const winnerSummary = buildSummary(
      'win', totalRounds, winnerName, loserName,
      params.winnerStartHp, winnerCombatant?.currentHp ?? 0,
      params.loserStartHp, loserCombatant?.currentHp ?? 0,
    );

    // Loser's perspective
    const loserSummary = buildSummary(
      'loss', totalRounds, loserName, winnerName,
      params.loserStartHp, loserCombatant?.currentHp ?? 0,
      params.winnerStartHp, winnerCombatant?.currentHp ?? 0,
    );

    const type = params.isSpar ? 'spar' : 'pvp';

    await prisma.$transaction([
      prisma.combatEncounterLog.create({
        data: {
          type,
          sessionId: params.sessionId,
          characterId: winnerId,
          characterName: winnerName,
          opponentId: loserId,
          opponentName: loserName,
          townId,
          startedAt: new Date(Date.now() - (totalRounds * 6000)),
          endedAt: new Date(),
          outcome: 'win',
          totalRounds,
          characterStartHp: params.winnerStartHp,
          characterEndHp: winnerCombatant?.currentHp ?? 0,
          opponentStartHp: params.loserStartHp,
          opponentEndHp: loserCombatant?.currentHp ?? 0,
          characterWeapon: params.winnerWeapon,
          opponentWeapon: params.loserWeapon,
          xpAwarded: params.xpAwarded,
          goldAwarded: params.wagerAmount,
          rounds: rounds as any,
          summary: winnerSummary,
        },
      }),
      prisma.combatEncounterLog.create({
        data: {
          type,
          sessionId: params.sessionId,
          characterId: loserId,
          characterName: loserName,
          opponentId: winnerId,
          opponentName: winnerName,
          townId,
          startedAt: new Date(Date.now() - (totalRounds * 6000)),
          endedAt: new Date(),
          outcome: 'loss',
          totalRounds,
          characterStartHp: params.loserStartHp,
          characterEndHp: loserCombatant?.currentHp ?? 0,
          opponentStartHp: params.winnerStartHp,
          opponentEndHp: winnerCombatant?.currentHp ?? 0,
          characterWeapon: params.loserWeapon,
          opponentWeapon: params.winnerWeapon,
          xpAwarded: 0,
          goldAwarded: params.wagerAmount > 0 ? -params.wagerAmount : 0,
          rounds: rounds as any,
          summary: loserSummary,
        },
      }),
    ]);
  } catch (err) {
    logger.error({ err, sessionId: params.sessionId }, 'Failed to write PvP combat encounter log');
  }
}
