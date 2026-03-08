import { db } from '../lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { dailyReports } from '@database/tables';
import {
  narrateCombatEvent,
  narrateCombatOpening,
  type NarrationContext,
  type NarratorLogEntry,
} from '@shared/data/combat-narrator/narrator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyReportData {
  foodConsumed: { itemName: string; buff: Record<string, unknown> | null } | null;
  actionResult: Record<string, unknown>;
  goldChange: number;
  xpEarned: number;
  combatLogs: Array<Record<string, unknown>>;
  questProgress: Array<Record<string, unknown>>;
  notifications: string[];
  worldEvents: Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// createDailyReport
// ---------------------------------------------------------------------------

export async function createDailyReport(
  characterId: string,
  tickDate: string,
  data: DailyReportData,
) {
  const [result] = await db.insert(dailyReports).values({
    id: crypto.randomUUID(),
    characterId,
    tickDate,
    foodConsumed: data.foodConsumed ?? undefined,
    actionResult: data.actionResult,
    goldChange: data.goldChange,
    xpEarned: data.xpEarned,
    combatLogs: data.combatLogs,
    questProgress: data.questProgress,
    notifications: data.notifications,
    worldEvents: data.worldEvents,
  }).onConflictDoUpdate({
    target: [dailyReports.characterId, dailyReports.tickDate],
    set: {
      foodConsumed: data.foodConsumed ?? undefined,
      actionResult: data.actionResult,
      goldChange: data.goldChange,
      xpEarned: data.xpEarned,
      combatLogs: data.combatLogs,
      questProgress: data.questProgress,
      notifications: data.notifications,
      worldEvents: data.worldEvents,
    },
  }).returning();
  return result;
}

// ---------------------------------------------------------------------------
// getLatestReport
// ---------------------------------------------------------------------------

export async function getLatestReport(characterId: string) {
  return db.query.dailyReports.findFirst({
    where: eq(dailyReports.characterId, characterId),
    orderBy: desc(dailyReports.tickDate),
  }) ?? null;
}

// ---------------------------------------------------------------------------
// getReportHistory
// ---------------------------------------------------------------------------

export async function getReportHistory(characterId: string, limit = 7) {
  return db.query.dailyReports.findMany({
    where: eq(dailyReports.characterId, characterId),
    orderBy: desc(dailyReports.tickDate),
    limit,
  });
}

// ---------------------------------------------------------------------------
// compileReport
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// dismissReport
// ---------------------------------------------------------------------------

export async function dismissReport(reportId: string) {
  const [result] = await db.update(dailyReports).set({ dismissedAt: new Date().toISOString() }).where(eq(dailyReports.id, reportId)).returning();
  return result;
}

// ---------------------------------------------------------------------------
// narrateCombatLog — add narrator text to round entries
// ---------------------------------------------------------------------------

function narrateCombatLog(log: any): any {
  if (!log || typeof log !== 'object') return log;

  const rawRounds: any[] = Array.isArray(log.rounds) ? log.rounds : [];
  if (rawRounds.length === 0) return log;

  // Extract encounter context (first entry with _encounterContext)
  let encounterCtx: any = null;
  for (const entry of rawRounds) {
    if (entry._encounterContext) {
      encounterCtx = entry._encounterContext;
      break;
    }
  }

  // Build combatant lookup
  const combatants: Record<string, any> = {};
  if (encounterCtx?.combatants) {
    for (const c of encounterCtx.combatants) {
      combatants[c.id] = c;
      combatants[c.name] = c;
    }
  }

  // Generate opening text
  const openingText = log.monsterName
    ? narrateCombatOpening(log.monsterName)
    : undefined;

  // Narrate each round entry
  const narratedRounds = rawRounds.map((entry: any) => {
    // Skip the context entry
    if (entry._encounterContext || entry.round == null) return entry;

    const actor = combatants[entry.actorId] || combatants[entry.actor] || {};

    // Find the target — the other combatant
    let target: any = {};
    if (encounterCtx?.combatants) {
      target = encounterCtx.combatants.find(
        (c: any) => c.id !== entry.actorId && c.name !== entry.actor,
      ) || {};
    }

    // Compute HP percentages from hpAfter map
    const actorMaxHp = actor.maxHp || actor.hp || 100;
    const actorCurrentHp = entry.hpAfter?.[entry.actor] ?? actorMaxHp;
    const actorHpPercent = Math.round((actorCurrentHp / actorMaxHp) * 100);

    const targetMaxHp = target.maxHp || target.hp || 100;
    const targetCurrentHp = entry.hpAfter?.[target.name] ?? targetMaxHp;
    const targetHpPercent = Math.round((targetCurrentHp / targetMaxHp) * 100);

    const context: NarrationContext = {
      actorName: entry.actor,
      actorRace: actor.race,
      actorClass: actor.class,
      actorEntityType: actor.entityType === 'monster' ? 'monster' : 'character',
      actorHpPercent,
      targetName: target.name,
      targetEntityType: target.entityType === 'monster' ? 'monster' : 'character',
      targetHpPercent,
      targetKilled: entry.targetKilled,
      weaponName: entry.weaponName || actor.weapon?.name,
    };

    const narratorEntry: NarratorLogEntry = {
      round: entry.round,
      actorId: entry.actorId || entry.actor,
      action: entry.action,
      result: {
        type: entry.action, // 'attack', 'class_ability', etc.
        actorId: entry.actorId || entry.actor,
        hit: entry.hit,
        critical: entry.isCritical,
        attackRoll: entry.attackRoll?.raw,
        targetKilled: entry.targetKilled,
        abilityName: entry.abilityName,
        healAmount: entry.healAmount,
        damageAmount: entry.damageRoll?.total,
      },
    };

    try {
      const text = narrateCombatEvent(narratorEntry, context);
      // Capitalize actor name + narrator text (verb-first)
      const narratorText = `${entry.actor} ${text}`;
      return { ...entry, narratorText };
    } catch {
      return entry;
    }
  });

  return { ...log, rounds: narratedRounds, openingText };
}

// ---------------------------------------------------------------------------
// transformToSections / transformReport
// ---------------------------------------------------------------------------

function transformToSections(report: any) {
  const combatLogs = (report.combatLogs ?? []) as any[];
  return {
    food: report.foodConsumed ? {
      consumed: (report.foodConsumed as any)?.itemName ?? null,
      hungerState: 'FED',
      buff: (report.foodConsumed as any)?.buff ?? null,
    } : null,
    action: report.actionResult && Object.keys(report.actionResult as object).length > 0 ? report.actionResult : null,
    combat: {
      occurred: combatLogs.length > 0,
      logs: combatLogs.map(narrateCombatLog),
      outcome: combatLogs.length > 0 ? (combatLogs[0] as any)?.outcome?.toUpperCase() : undefined,
      loot: combatLogs.flatMap((l: any) => {
        const lootStr = l.loot || l.lootDropped || '';
        if (!lootStr) return [];
        return [{ name: lootStr, quantity: 1 }];
      }),
    },
    economy: {
      goldEarned: report.goldChange > 0 ? report.goldChange : undefined,
      goldSpent: report.goldChange < 0 ? Math.abs(report.goldChange) : undefined,
      netChange: report.goldChange,
    },
    progression: {
      xpEarned: report.xpEarned,
      questProgress: (report.questProgress as any[]) ?? [],
    },
    worldNews: {
      events: (report.worldEvents as any[]) ?? [],
    },
  };
}

export function transformReport(report: any) {
  return {
    ...report,
    sections: transformToSections(report),
    dismissed: !!report.dismissedAt,
  };
}

// ---------------------------------------------------------------------------
// compileReport
// ---------------------------------------------------------------------------

export function compileReport(
  results: {
    food?: { consumed: { name: string } | null; buff: Record<string, unknown> | null };
    action?: Record<string, unknown>;
    goldChange?: number;
    xpEarned?: number;
    combatLogs?: Array<Record<string, unknown>>;
    questProgress?: Array<Record<string, unknown>>;
    notifications?: string[];
    worldEvents?: Array<Record<string, unknown>>;
  },
): DailyReportData {
  return {
    foodConsumed: results.food?.consumed
      ? { itemName: results.food.consumed.name, buff: results.food.buff ?? null }
      : null,
    actionResult: results.action ?? {},
    goldChange: results.goldChange ?? 0,
    xpEarned: results.xpEarned ?? 0,
    combatLogs: results.combatLogs ?? [],
    questProgress: results.questProgress ?? [],
    notifications: results.notifications ?? [],
    worldEvents: results.worldEvents ?? [],
  };
}
