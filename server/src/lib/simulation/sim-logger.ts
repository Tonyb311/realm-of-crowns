// ---------------------------------------------------------------------------
// SimulationLogger — Collects detailed per-bot action logs during simulation
// ---------------------------------------------------------------------------

import {
  BotState,
  BotActionEntry,
  BotStateSnapshot,
  TickResolutionEntry,
  BotTimeline,
  ActionResult,
  CombatRound,
} from './types';

// ---------------------------------------------------------------------------
// Snapshot helper
// ---------------------------------------------------------------------------

export function captureBotState(bot: BotState, dailyActionUsed: boolean = false): BotStateSnapshot {
  return {
    level: bot.level,
    town: bot.currentTownId,
    gold: bot.gold,
    dailyActionUsed,
    profession: bot.professions[0] || 'None',
    isInParty: !!bot.partyId,
    isTraveling: bot.pendingTravel,
  };
}

// ---------------------------------------------------------------------------
// Logger class
// ---------------------------------------------------------------------------

export class SimulationLogger {
  private actionLog: BotActionEntry[] = [];
  private tickResolutions: TickResolutionEntry[] = [];
  private combatRounds: CombatRound[] = [];

  // --- Log one API call ---
  logAction(entry: BotActionEntry): void {
    this.actionLog.push(entry);
  }

  // --- Convenience: build entry from an ActionResult ---
  logFromResult(
    bot: BotState,
    result: ActionResult,
    opts: {
      tick: number;
      phase: BotActionEntry['phase'];
      intent: string;
      attemptNumber: number;
      fallbackReason?: string;
      durationMs: number;
      dailyActionUsed: boolean;
    },
  ): void {
    this.actionLog.push({
      tick: opts.tick,
      botName: bot.characterName,
      botId: bot.characterId,
      phase: opts.phase,
      timestamp: new Date().toISOString(),
      intent: opts.intent,
      endpoint: result.endpoint,
      requestBody: result.requestBody ?? {},
      httpStatus: result.httpStatus ?? (result.success ? 200 : 400),
      success: result.success,
      responseBody: result.responseBody ?? { detail: result.detail },
      attemptNumber: opts.attemptNumber,
      fallbackReason: opts.fallbackReason,
      durationMs: opts.durationMs,
      botState: captureBotState(bot, opts.dailyActionUsed),
    });
  }

  // --- Log combat rounds ---
  logCombatRound(round: CombatRound): void {
    this.combatRounds.push(round);
  }

  logCombatRounds(rounds: CombatRound[]): void {
    this.combatRounds.push(...rounds);
  }

  getCombatRounds(): CombatRound[] {
    return this.combatRounds;
  }

  // --- Log tick resolution for one bot ---
  logTickResolution(entry: TickResolutionEntry): void {
    this.tickResolutions.push(entry);
  }

  // --- Getters ---
  getActionLog(): BotActionEntry[] {
    return this.actionLog;
  }

  getTickResolutions(): TickResolutionEntry[] {
    return this.tickResolutions;
  }

  // --- Aggregate per-bot timelines from the action log ---
  getBotTimelines(bots: BotState[]): BotTimeline[] {
    const botMap = new Map(bots.map(b => [b.characterId, b]));

    // Group action log entries by bot
    const byBot = new Map<string, BotActionEntry[]>();
    for (const entry of this.actionLog) {
      if (!byBot.has(entry.botId)) byBot.set(entry.botId, []);
      byBot.get(entry.botId)!.push(entry);
    }

    const timelines: BotTimeline[] = [];

    for (const [botId, entries] of byBot) {
      const bot = botMap.get(botId);
      const first = entries[0];
      const last = entries[entries.length - 1];

      const towns = new Set(entries.map(e => e.botState.town));

      // Bug 5 fix: Count success/failure per TICK, not per log entry.
      // Each tick may produce multiple daily-phase entries (one per priority attempted).
      // A tick counts as "committed" if ANY daily entry succeeded that tick.
      // A tick counts as "failed" only if ALL daily entries that tick failed
      // AND the bot actually attempted a real action (not travel_skip or free-only ticks).
      const dailyEntries = entries.filter(e => e.phase === 'daily');
      const byTick = new Map<number, BotActionEntry[]>();
      for (const e of dailyEntries) {
        if (!byTick.has(e.tick)) byTick.set(e.tick, []);
        byTick.get(e.tick)!.push(e);
      }

      let committed = 0;
      let failed = 0;
      for (const [, tickEntries] of byTick) {
        // Skip ticks where the only entry is travel_skip (bot in transit — not a failure)
        const realEntries = tickEntries.filter(e => e.intent !== 'travel_skip');
        if (realEntries.length === 0) continue;
        const anySuccess = realEntries.some(e => e.success);
        if (anySuccess) committed++;
        else failed++;
      }

      const gathered = entries.filter(e => e.intent.includes('gather') && e.success).length;
      const crafted = entries.filter(e => e.intent.includes('craft') && e.success).length;
      const quests = entries.filter(e => e.intent.includes('quest') && e.success).length;

      timelines.push({
        botName: first.botName,
        botId,
        race: bot?.race ?? '',
        class: bot?.class ?? '',
        profile: bot?.profile ?? '',
        startTown: first.botState.town,
        endTown: last.botState.town,
        townsVisited: towns.size,
        startLevel: first.botState.level,
        endLevel: last.botState.level,
        startGold: first.botState.gold,
        endGold: last.botState.gold,
        actionsCommitted: committed,
        actionsFailed: failed,
        resourcesGathered: gathered,
        itemsCrafted: crafted,
        questsCompleted: quests,
      });
    }

    return timelines;
  }

  clear(): void {
    this.actionLog = [];
    this.tickResolutions = [];
    this.combatRounds = [];
  }
}
