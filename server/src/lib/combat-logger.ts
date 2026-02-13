/**
 * Combat Encounter Logger
 *
 * Builds structured per-encounter logs from combat engine state.
 * Each encounter produces one CombatEncounterLog record with:
 * - Encounter context (combatant stat blocks, weapons, initiative, turn order)
 * - Per-round data as JSONB array (full roll breakdowns, modifiers, HP tracking)
 * - Encounter footer (outcome, totals, rewards)
 *
 * Used by both PvE and PvP combat resolution.
 * Designed for balance analysis, debugging, and future player-facing combat replay.
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { getSimulationTick } from './simulation-context';
import type {
  CombatState,
  TurnLogEntry,
  AttackResult,
  CastResult,
  FleeResult,
  ItemResult,
  DefendResult,
  RacialAbilityActionResult,
  PsionAbilityResult,
  AttackModifierBreakdown,
} from '@shared/types/combat';

// Config flag — can be turned off in production if performance is a concern
export const COMBAT_LOGGING_ENABLED = process.env.COMBAT_LOGGING_ENABLED !== 'false';

// ---- Encounter Context ----

export interface CombatantSnapshot {
  id: string;
  name: string;
  entityType: string;
  team: number;
  level: number;
  race?: string;
  hp: number;
  maxHp: number;
  ac: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  proficiencyBonus: number;
  initiative: number;
  weapon: {
    name: string;
    dice: string;
    damageType?: string;
    bonusAttack: number;
    bonusDamage: number;
    attackStat: string;
    damageStat: string;
  } | null;
}

export interface EncounterContext {
  combatants: CombatantSnapshot[];
  turnOrder: string[];
}

// ---- Round Log Entry ----

export interface RoundLogEntry {
  round: number;
  actor: string;
  actorId: string;
  action: string;
  // Attack details
  attackRoll?: {
    raw: number;
    modifiers: AttackModifierBreakdown[];
    total: number;
  };
  targetAC?: number;
  hit?: boolean;
  isCritical?: boolean;
  damageRoll?: {
    dice: string;
    rolls: number[];
    modifiers: AttackModifierBreakdown[];
    total: number;
    type?: string;
  };
  targetHpBefore?: number;
  targetHpAfter?: number;
  targetKilled?: boolean;
  weaponName?: string;
  negatedAttack?: boolean;
  // Cast/spell details
  spellName?: string;
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  saveSucceeded?: boolean;
  // Flee details
  fleeRoll?: number;
  fleeDC?: number;
  fleeSuccess?: boolean;
  // Heal
  healAmount?: number;
  // Defend
  acBonusGranted?: number;
  // Item
  itemName?: string;
  // Ability
  abilityName?: string;
  abilityDescription?: string;
  // Status effects
  statusEffectsApplied: string[];
  statusEffectsExpired: string[];
  statusTickDamage?: number;
  statusTickHealing?: number;
  // HP snapshot for all combatants after this action
  hpAfter: Record<string, number>;
}

/**
 * Build encounter context with starting stat blocks for all combatants.
 */
function buildEncounterContext(state: CombatState): EncounterContext {
  // Use the first round's combatants — they represent the starting state
  // since combatants are immutable (new objects each round via spread)
  // We take the snapshot from the state but use maxHp as the starting HP indicator
  const combatants: CombatantSnapshot[] = state.combatants.map(c => ({
    id: c.id,
    name: c.name,
    entityType: c.entityType,
    team: c.team,
    level: c.level,
    race: c.race,
    hp: c.maxHp, // starting HP (use maxHp since currentHp is final state)
    maxHp: c.maxHp,
    ac: c.ac,
    stats: { ...c.stats },
    proficiencyBonus: c.proficiencyBonus,
    initiative: c.initiative,
    weapon: c.weapon ? {
      name: c.weapon.name,
      dice: `${c.weapon.diceCount}d${c.weapon.diceSides}`,
      damageType: c.weapon.damageType,
      bonusAttack: c.weapon.bonusAttack,
      bonusDamage: c.weapon.bonusDamage,
      attackStat: c.weapon.attackModifierStat,
      damageStat: c.weapon.damageModifierStat,
    } : null,
  }));

  return {
    combatants,
    turnOrder: [...state.turnOrder],
  };
}

/**
 * Extract structured per-round data from the combat engine's TurnLogEntry array.
 * Uses typed result objects for correct field access.
 */
function buildRoundsData(state: CombatState): RoundLogEntry[] {
  const rounds: RoundLogEntry[] = [];

  // Track HP per combatant across rounds
  const hpTracker: Record<string, number> = {};
  for (const c of state.combatants) {
    hpTracker[c.id] = c.maxHp; // start at max HP
  }

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

    // Process status tick damage/healing first (happens at start of turn)
    if (entry.statusTicks && Array.isArray(entry.statusTicks)) {
      let tickDmg = 0;
      let tickHeal = 0;
      for (const tick of entry.statusTicks) {
        if (tick.expired) {
          round.statusEffectsExpired.push(tick.effectName ?? 'unknown');
        }
        if (tick.damage && tick.damage > 0) {
          tickDmg += tick.damage;
          hpTracker[tick.combatantId] = tick.hpAfter;
        }
        if (tick.healing && tick.healing > 0) {
          tickHeal += tick.healing;
          hpTracker[tick.combatantId] = tick.hpAfter;
        }
      }
      if (tickDmg > 0) round.statusTickDamage = tickDmg;
      if (tickHeal > 0) round.statusTickHealing = tickHeal;
    }

    // Extract data from the typed result based on action type
    const result = entry.result;

    if (result.type === 'attack') {
      const atk = result as AttackResult;
      round.attackRoll = {
        raw: atk.attackRoll,
        modifiers: atk.attackModifiers ?? [],
        total: atk.attackTotal,
      };
      round.targetAC = atk.targetAC;
      round.hit = atk.hit;
      round.isCritical = atk.critical;
      round.negatedAttack = atk.negatedAttack;
      round.weaponName = atk.weaponName;
      round.targetHpBefore = atk.targetHpBefore ?? hpTracker[atk.targetId];
      round.targetHpAfter = atk.targetHpAfter;
      round.targetKilled = atk.targetKilled;

      if (atk.hit && atk.totalDamage > 0) {
        round.damageRoll = {
          dice: atk.weaponDice ?? 'unknown',
          rolls: atk.damageRolls ?? [],
          modifiers: atk.damageModifiers ?? [],
          total: atk.totalDamage,
          type: atk.damageType,
        };
      }

      // Update HP tracker
      if (atk.targetId) {
        hpTracker[atk.targetId] = atk.targetHpAfter;
      }

    } else if (result.type === 'cast') {
      const cast = result as CastResult;
      round.spellName = cast.spellName;
      round.saveDC = cast.saveDC;
      round.saveRoll = cast.saveRoll;
      round.saveTotal = cast.saveTotal;
      round.saveSucceeded = cast.saveSucceeded;
      round.targetHpAfter = cast.targetHpAfter;
      round.targetKilled = cast.targetKilled;
      round.targetHpBefore = hpTracker[cast.targetId];

      if (cast.totalDamage && cast.totalDamage > 0) {
        round.damageRoll = {
          dice: 'spell',
          rolls: [],
          modifiers: [],
          total: cast.totalDamage,
        };
      }
      if (cast.healAmount && cast.healAmount > 0) {
        round.healAmount = cast.healAmount;
      }
      if (cast.statusApplied) {
        round.statusEffectsApplied.push(cast.statusApplied);
      }

      // Update HP tracker
      hpTracker[cast.targetId] = cast.targetHpAfter;

    } else if (result.type === 'flee') {
      const flee = result as FleeResult;
      round.fleeRoll = flee.fleeRoll;
      round.fleeDC = flee.fleeDC;
      round.fleeSuccess = flee.success;

    } else if (result.type === 'defend') {
      const def = result as DefendResult;
      round.acBonusGranted = def.acBonusGranted;

    } else if (result.type === 'item') {
      const item = result as ItemResult;
      round.itemName = item.itemName;
      round.targetHpAfter = item.targetHpAfter;
      round.targetHpBefore = hpTracker[item.targetId];
      if (item.healAmount && item.healAmount > 0) {
        round.healAmount = item.healAmount;
      }
      if (item.damageAmount && item.damageAmount > 0) {
        round.damageRoll = {
          dice: 'item',
          rolls: [],
          modifiers: [],
          total: item.damageAmount,
        };
      }
      if (item.statusApplied) {
        round.statusEffectsApplied.push(item.statusApplied);
      }

      hpTracker[item.targetId] = item.targetHpAfter;

    } else if (result.type === 'racial_ability') {
      const racial = result as RacialAbilityActionResult;
      round.abilityName = racial.abilityName;
      round.abilityDescription = racial.description;
      if (racial.damage && racial.damage > 0) {
        round.damageRoll = {
          dice: 'ability',
          rolls: [],
          modifiers: [],
          total: racial.damage,
        };
      }
      if (racial.healing && racial.healing > 0) {
        round.healAmount = racial.healing;
      }
      if (racial.statusApplied) {
        round.statusEffectsApplied.push(racial.statusApplied);
      }

    } else if (result.type === 'psion_ability') {
      const psion = result as PsionAbilityResult;
      round.abilityName = psion.abilityName;
      round.abilityDescription = psion.description;
      round.saveDC = psion.saveDC;
      round.saveRoll = psion.saveRoll;
      round.saveTotal = psion.saveTotal;
      round.saveSucceeded = psion.saveSucceeded;
      if (psion.targetHpAfter !== undefined) {
        round.targetHpAfter = psion.targetHpAfter;
        round.targetKilled = psion.targetKilled;
      }
      if (psion.damage && psion.damage > 0) {
        round.damageRoll = {
          dice: 'psion',
          rolls: [],
          modifiers: [],
          total: psion.damage,
        };
      }
      if (psion.statusApplied) {
        round.statusEffectsApplied.push(psion.statusApplied);
      }

      // Update HP tracker for psion targets
      if (psion.targetId && psion.targetHpAfter !== undefined) {
        hpTracker[psion.targetId] = psion.targetHpAfter;
      }
    }

    // Snapshot HP for all combatants after this action
    for (const c of state.combatants) {
      round.hpAfter[c.name] = hpTracker[c.id] ?? c.currentHp;
    }

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

    const encounterContext = buildEncounterContext(state);
    const rounds = buildRoundsData(state);
    const summary = buildSummary(
      params.outcome, totalRounds, characterName, opponentName,
      params.characterStartHp, characterEndHp,
      params.opponentStartHp, opponentEndHp,
    );

    // Store rounds with encounter context as first element
    const roundsWithContext = [
      { _encounterContext: encounterContext },
      ...rounds,
    ];

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
        rounds: roundsWithContext as any,
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
    const encounterContext = buildEncounterContext(state);
    const rounds = buildRoundsData(state);

    const roundsWithContext = [
      { _encounterContext: encounterContext },
      ...rounds,
    ];

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
          rounds: roundsWithContext as any,
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
          rounds: roundsWithContext as any,
          summary: loserSummary,
        },
      }),
    ]);
  } catch (err) {
    logger.error({ err, sessionId: params.sessionId }, 'Failed to write PvP combat encounter log');
  }
}
