import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
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
  return prisma.dailyReport.upsert({
    where: {
      characterId_tickDate: { characterId, tickDate },
    },
    create: {
      characterId,
      tickDate,
      foodConsumed: (data.foodConsumed ?? undefined) as Prisma.InputJsonValue | undefined,
      actionResult: data.actionResult as Prisma.InputJsonValue,
      goldChange: data.goldChange,
      xpEarned: data.xpEarned,
      combatLogs: data.combatLogs as unknown as Prisma.InputJsonValue,
      questProgress: data.questProgress as unknown as Prisma.InputJsonValue,
      notifications: data.notifications,
      worldEvents: data.worldEvents as unknown as Prisma.InputJsonValue,
    },
    update: {
      foodConsumed: (data.foodConsumed ?? undefined) as Prisma.InputJsonValue | undefined,
      actionResult: data.actionResult as Prisma.InputJsonValue,
      goldChange: data.goldChange,
      xpEarned: data.xpEarned,
      combatLogs: data.combatLogs as unknown as Prisma.InputJsonValue,
      questProgress: data.questProgress as unknown as Prisma.InputJsonValue,
      notifications: data.notifications,
      worldEvents: data.worldEvents as unknown as Prisma.InputJsonValue,
    },
  });
}

// ---------------------------------------------------------------------------
// getLatestReport
// ---------------------------------------------------------------------------

export async function getLatestReport(characterId: string) {
  return prisma.dailyReport.findFirst({
    where: { characterId },
    orderBy: { tickDate: 'desc' },
  });
}

// ---------------------------------------------------------------------------
// getReportHistory
// ---------------------------------------------------------------------------

export async function getReportHistory(characterId: string, limit = 7) {
  return prisma.dailyReport.findMany({
    where: { characterId },
    orderBy: { tickDate: 'desc' },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// compileReport
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// dismissReport
// ---------------------------------------------------------------------------

export async function dismissReport(reportId: string) {
  return prisma.dailyReport.update({
    where: { id: reportId },
    data: { dismissedAt: new Date() },
  });
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
