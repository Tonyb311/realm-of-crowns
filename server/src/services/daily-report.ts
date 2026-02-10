import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

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
