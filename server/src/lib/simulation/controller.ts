// ---------------------------------------------------------------------------
// Simulation Lifecycle Controller (Singleton)
// ---------------------------------------------------------------------------

import {
  BotState,
  SimulationConfig,
  SimulationStatus,
  SimTickResult,
  SimulationStats,
  BotSummary,
  ActivityEntry,
  ActionResult,
  SeedConfig,
  GoldStats,
  BotDayLog,
  DEFAULT_CONFIG,
  DEFAULT_SEED_CONFIG,
} from './types';
import { seedBots, cleanupBots, initResourceCache } from './seed';
import { decideBotAction, errorStormAction } from './engine';
import { logActivity, getRecentActivity, getStats as getActivityStats, getUptime, resetLog } from './activity-log';
import { refreshBotState } from './actions';
import { advanceGameDay, getGameDay, getGameDayOffset } from '../../lib/game-day';
import { processDailyTick } from '../../jobs/daily-tick';
import { processTravelTick } from '../../lib/travel-tick';
import { logger } from '../../lib/logger';
import { setSimulationTick } from '../../lib/simulation-context';
import { prisma } from '../../lib/prisma';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categorizeAction(endpoint: string): string {
  if (endpoint.includes('work') || endpoint.includes('gather')) return 'gather';
  if (endpoint.includes('craft')) return 'craft';
  if (endpoint.includes('market/buy') || endpoint.includes('buy')) return 'market_buy';
  if (endpoint.includes('market/list') || endpoint.includes('sell')) return 'market_list';
  if (endpoint.includes('market/browse')) return 'market_browse';
  if (endpoint.includes('market_auction')) return 'market_auction';
  // Road encounters are tracked by the travel tick, not individual bot actions
  if (endpoint.includes('road_encounter')) return 'road_encounter';
  if (endpoint.includes('quest')) return 'quest';
  if (endpoint.includes('travel')) return 'travel';
  if (endpoint.includes('message')) return 'social';
  if (endpoint.includes('friend')) return 'social';
  if (endpoint.includes('election') || endpoint.includes('vote') || endpoint.includes('nominate')) return 'politics';
  if (endpoint.includes('guild')) return 'guild';
  if (endpoint.includes('equip')) return 'equip';
  if (endpoint.includes('profession')) return 'profession';
  if (endpoint === 'none') return 'idle';
  return 'other';
}

class SimulationController {
  private bots: BotState[] = [];
  private config: SimulationConfig = DEFAULT_CONFIG;
  private seedConfig: SeedConfig = DEFAULT_SEED_CONFIG;
  private intervalId: NodeJS.Timeout | null = null;
  private status: 'idle' | 'running' | 'paused' | 'stopping' = 'idle';
  private startedAt: Date | null = null;
  private errorStormUntil: number = 0;
  private focusSystem: string | null = null;
  private focusUntil: number = 0;
  private tickIndex: number = 0;         // round-robin index for interval mode
  private singleTickCount: number = 0;   // sequential counter for runSingleTick
  private tickHistory: SimTickResult[] = [];
  private botDayLogs: BotDayLog[] = [];

  // ---------------------------------------------------------------------------
  // Seed bots
  // ---------------------------------------------------------------------------
  async seed(
    config: Partial<SeedConfig>,
  ): Promise<{ botsCreated: number; bots: BotSummary[] }> {
    this.seedConfig = { ...DEFAULT_SEED_CONFIG, ...config };
    await initResourceCache();
    this.bots = await seedBots(this.seedConfig);
    return { botsCreated: this.bots.length, bots: this.getBotSummaries() };
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  async start(): Promise<void> {
    if (this.status === 'running') {
      throw new Error('Simulation is already running');
    }
    if (this.bots.length === 0) {
      throw new Error('No bots seeded. Call seed first.');
    }

    this.status = 'running';
    this.startedAt = new Date();
    resetLog();

    this.intervalId = setInterval(() => this.tick(), this.config.tickIntervalMs);
    logger.info({ botCount: this.bots.length, tickMs: this.config.tickIntervalMs }, 'Simulation started');
  }

  // ---------------------------------------------------------------------------
  // Tick (interval-based, processes botsPerTick bots)
  // ---------------------------------------------------------------------------
  private async tick(): Promise<void> {
    if (this.status !== 'running') return;

    const now = Date.now();
    const activeBots = this.bots.filter((b) => b.isActive);
    const count = Math.min(this.config.botsPerTick, activeBots.length);

    // Build effective config (focus override)
    let effectiveConfig = this.config;
    if (this.focusSystem && this.focusUntil > now) {
      const focusEnabled: SimulationConfig['enabledSystems'] = {
        combat: false,
        crafting: false,
        gathering: false,
        market: false,
        quests: false,
        governance: false,
        guilds: false,
        travel: false,
        social: false,
      };
      // Enable only the focused system if it is a valid key
      if (this.focusSystem in focusEnabled) {
        (focusEnabled as any)[this.focusSystem] = true;
      }
      effectiveConfig = { ...this.config, enabledSystems: focusEnabled };
    }

    for (let i = 0; i < count; i++) {
      const botIdx = this.tickIndex % activeBots.length;
      this.tickIndex++;
      const bot = activeBots[botIdx];

      if (!bot.isActive || bot.pausedUntil > now) continue;

      const startTime = Date.now();
      let result: { success: boolean; detail: string; endpoint: string };

      // Quietly refresh bot state from the database
      try {
        await refreshBotState(bot);
      } catch (_err) {
        // Ignore refresh errors
      }

      // Decide and execute action
      try {
        if (this.errorStormUntil > now) {
          result = await errorStormAction(bot);
        } else {
          result = await decideBotAction(bot, this.bots, effectiveConfig);
        }
      } catch (err: any) {
        result = {
          success: false,
          detail: `Uncaught: ${err.message}`,
          endpoint: 'error',
        };
      }

      const durationMs = Date.now() - startTime;

      // Log activity
      const entry: ActivityEntry = {
        timestamp: new Date().toISOString(),
        characterId: bot.characterId,
        botName: bot.characterName,
        profile: bot.profile,
        action: result.endpoint,
        endpoint: result.endpoint,
        success: result.success,
        detail: result.detail,
        durationMs,
      };
      logActivity(entry);

      // Update bot state
      bot.lastAction = result.detail;
      bot.lastActionAt = Date.now();
      bot.actionsCompleted++;

      if (result.success) {
        bot.consecutiveErrors = 0;
      } else {
        bot.consecutiveErrors++;
        bot.errorsTotal++;

        // Escalating pause / deactivation on consecutive errors
        if (bot.consecutiveErrors > 10) {
          bot.isActive = false;
          logger.warn(
            { bot: bot.characterName, errors: bot.consecutiveErrors },
            'Bot deactivated after >10 consecutive errors',
          );
        } else if (bot.consecutiveErrors > 5) {
          bot.pausedUntil = Date.now() + 30_000;
          logger.warn(
            { bot: bot.characterName, errors: bot.consecutiveErrors },
            'Bot paused 30s after >5 consecutive errors',
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Run a single tick across ALL bots (not interval-based, synchronous)
  // Each bot gets up to config.actionsPerTick actions per tick.
  // ---------------------------------------------------------------------------
  async runSingleTick(): Promise<SimTickResult> {
    const startTime = Date.now();
    const actionBreakdown: Record<string, number> = {};
    let successes = 0;
    let failures = 0;
    const errors: string[] = [];
    let botsProcessed = 0;

    // Set simulation context so combat logs get tagged with this tick number
    setSimulationTick(this.singleTickCount + 1);

    // 1. Advance game day
    advanceGameDay(1);

    // 2. Run daily tick (reset actions, process events)
    try { await processDailyTick(); } catch (err: any) {
      errors.push(`Daily tick error: ${err.message}`);
    }

    // 2b. Process travel tick — advance travelers and resolve road encounters
    try {
      const travelResult = await processTravelTick();
      if (travelResult.soloEncountered > 0) {
        actionBreakdown['road_encounter'] = (actionBreakdown['road_encounter'] || 0) + travelResult.soloEncountered;
        actionBreakdown['road_encounter_win'] = (actionBreakdown['road_encounter_win'] || 0) + travelResult.soloEncounterWins;
        actionBreakdown['road_encounter_loss'] = (actionBreakdown['road_encounter_loss'] || 0) + travelResult.soloEncounterLosses;
      }
      if (travelResult.soloArrived > 0) {
        actionBreakdown['travel_arrived'] = (actionBreakdown['travel_arrived'] || 0) + travelResult.soloArrived;
      }
      logger.info(
        { tick: this.singleTickCount + 1, ...travelResult },
        'Travel tick processed within simulation',
      );
    } catch (err: any) {
      errors.push(`Travel tick error: ${err.message}`);
    }

    // 2c. Resolve market auctions for all towns with pending orders
    const auctionResolvedBefore = new Date();
    try {
      const { resolveAllTownAuctions } = await import('../auction-engine');
      const auctionResult = await resolveAllTownAuctions();
      if (auctionResult.transactionsCompleted > 0) {
        actionBreakdown['market_auction'] = (actionBreakdown['market_auction'] || 0) + auctionResult.transactionsCompleted;
      }
      logger.info(
        { tick: this.singleTickCount + 1, ...auctionResult },
        'Market auctions resolved within simulation',
      );
    } catch (err: any) {
      errors.push(`Market auction error: ${err.message}`);
    }
    const auctionResolvedAfter = new Date();

    // Gold tracking accumulators
    const goldByProfession: Record<string, { earned: number; spent: number; net: number; botCount: number }> = {};
    const goldByTown: Record<string, { earned: number; spent: number; net: number }> = {};
    const goldByLevel: Record<number, { earned: number; spent: number; net: number }> = {};
    let totalEarned = 0;
    let totalSpent = 0;
    const earnerList: { botName: string; profession: string; town: string; earned: number }[] = [];

    const activeBots = this.bots.filter((b) => b.isActive);
    const maxActions = this.config.actionsPerTick;

    for (const bot of activeBots) {
      // Refresh state before the action loop
      try { await refreshBotState(bot); } catch { /* ignore */ }

      // Record gold before first action
      const goldBefore = bot.gold;

      const botActions: Array<{
        order: number;
        type: string;
        detail: string;
        success: boolean;
        goldDelta: number;
        error?: string;
      }> = [];

      let botDeactivated = false;

      for (let actionNum = 0; actionNum < maxActions; actionNum++) {
        const goldBeforeAction = bot.gold;

        // Decide and execute
        let result: ActionResult;
        try {
          result = await decideBotAction(bot, this.bots, this.config);
        } catch (err: any) {
          result = { success: false, detail: `Uncaught: ${err.message}`, endpoint: 'error' };
        }

        // Categorize action
        const actionType = categorizeAction(result.endpoint);
        actionBreakdown[actionType] = (actionBreakdown[actionType] || 0) + 1;

        if (result.success) {
          successes++;
          bot.consecutiveErrors = 0;
        } else {
          failures++;
          bot.consecutiveErrors++;
          bot.errorsTotal++;
          if (result.detail) errors.push(`${bot.characterName}: ${result.detail}`);
          // Same escalation logic
          if (bot.consecutiveErrors > 10) {
            bot.isActive = false;
            botDeactivated = true;
          } else if (bot.consecutiveErrors > 5) {
            bot.pausedUntil = Date.now() + 30_000;
          }
        }

        // Quick state refresh between actions to pick up gold/xp changes
        try { await refreshBotState(bot); } catch { /* ignore */ }

        const actionGoldDelta = bot.gold - goldBeforeAction;

        botActions.push({
          order: actionNum + 1,
          type: actionType,
          detail: result.detail,
          success: result.success,
          goldDelta: actionGoldDelta,
          error: result.success ? undefined : result.detail,
        });

        // Log each action individually
        logActivity({
          timestamp: new Date().toISOString(),
          characterId: bot.characterId,
          botName: bot.characterName,
          profile: bot.profile,
          action: actionType,
          endpoint: result.endpoint,
          success: result.success,
          detail: result.detail,
          durationMs: Date.now() - startTime,
        });

        bot.lastAction = result.detail;
        bot.lastActionAt = Date.now();
        bot.actionsCompleted++;

        // If action was idle/paused, or bot was deactivated/paused, stop giving actions
        if (result.endpoint === 'none' || botDeactivated || bot.pausedUntil > Date.now()) break;
      }

      // Free market actions (don't consume action slots)
      let botMarketItemsListed = 0;
      let botMarketOrdersPlaced = 0;
      if (this.config.enabledSystems.market && bot.currentTownId && bot.isActive) {
        try {
          const { doFreeMarketActions } = await import('./actions');
          const marketResults = await doFreeMarketActions(bot);
          for (const mr of marketResults) {
            const marketAction = categorizeAction(mr.endpoint);
            actionBreakdown[marketAction] = (actionBreakdown[marketAction] || 0) + 1;
            if (mr.success) successes++;
            else failures++;

            // Track per-bot market action counts
            if (mr.success) {
              if (marketAction === 'market_list') botMarketItemsListed++;
              if (marketAction === 'market_buy') botMarketOrdersPlaced++;
            }

            logActivity({
              timestamp: new Date().toISOString(),
              characterId: bot.characterId,
              botName: bot.characterName,
              profile: bot.profile,
              action: marketAction,
              endpoint: mr.endpoint,
              success: mr.success,
              detail: `[FREE] ${mr.detail}`,
              durationMs: 0,
            });

            botActions.push({
              order: botActions.length + 1,
              type: `${marketAction} [FREE]`,
              detail: mr.detail,
              success: mr.success,
              goldDelta: 0,
            });
          }
        } catch { /* ignore market errors */ }
      }

      // Query per-bot auction results from the cycles resolved this tick
      let botAuctionsWon = 0;
      let botAuctionsLost = 0;
      let botMarketGoldSpent = 0;
      let botMarketGoldEarned = 0;
      try {
        // Count buy orders resolved in this tick's auction resolution
        const wonOrders = await prisma.marketBuyOrder.count({
          where: {
            buyerId: bot.characterId,
            status: 'won',
            resolvedAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter },
          },
        });
        const lostOrders = await prisma.marketBuyOrder.count({
          where: {
            buyerId: bot.characterId,
            status: 'lost',
            resolvedAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter },
          },
        });
        botAuctionsWon = wonOrders;
        botAuctionsLost = lostOrders;

        // Sum gold spent on won auctions (as buyer)
        const wonTransactions = await prisma.tradeTransaction.aggregate({
          where: {
            buyerId: bot.characterId,
            createdAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter },
          },
          _sum: { price: true },
        });
        botMarketGoldSpent = wonTransactions._sum.price ?? 0;

        // Sum gold earned from sales (as seller)
        const sellTransactions = await prisma.tradeTransaction.aggregate({
          where: {
            sellerId: bot.characterId,
            createdAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter },
          },
          _sum: { sellerNet: true },
        });
        botMarketGoldEarned = sellTransactions._sum.sellerNet ?? 0;
      } catch { /* ignore query errors */ }

      // Final state refresh to get accurate gold
      try { await refreshBotState(bot); } catch { /* ignore */ }
      const goldAfter = bot.gold;
      const goldDelta = goldAfter - goldBefore;

      // Accumulate gold stats
      const earned = goldDelta > 0 ? goldDelta : 0;
      const spent = goldDelta < 0 ? Math.abs(goldDelta) : 0;
      totalEarned += earned;
      totalSpent += spent;

      // By profession
      const profKey = bot.professions[0] || 'None';
      if (!goldByProfession[profKey]) {
        goldByProfession[profKey] = { earned: 0, spent: 0, net: 0, botCount: 0 };
      }
      goldByProfession[profKey].earned += earned;
      goldByProfession[profKey].spent += spent;
      goldByProfession[profKey].net += goldDelta;
      goldByProfession[profKey].botCount++;

      // By town
      if (!goldByTown[bot.currentTownId]) {
        goldByTown[bot.currentTownId] = { earned: 0, spent: 0, net: 0 };
      }
      goldByTown[bot.currentTownId].earned += earned;
      goldByTown[bot.currentTownId].spent += spent;
      goldByTown[bot.currentTownId].net += goldDelta;

      // By level
      if (!goldByLevel[bot.level]) {
        goldByLevel[bot.level] = { earned: 0, spent: 0, net: 0 };
      }
      goldByLevel[bot.level].earned += earned;
      goldByLevel[bot.level].spent += spent;
      goldByLevel[bot.level].net += goldDelta;

      // Top earners tracking
      if (earned > 0) {
        earnerList.push({
          botName: bot.characterName,
          profession: profKey,
          town: bot.currentTownId,
          earned,
        });
      }

      botsProcessed++;

      // Per-bot day log with all actions accumulated
      const actionSummaryParts = botActions.map((a) => a.type);
      const botLog: BotDayLog = {
        tickNumber: this.singleTickCount + 1,
        gameDay: getGameDay(),
        botId: bot.characterId,
        botName: bot.characterName,
        race: bot.race,
        class: bot.class,
        profession: profKey,
        town: bot.currentTownId,
        level: bot.level,
        goldStart: goldBefore,
        goldEnd: goldAfter,
        goldNet: goldDelta,
        actionsUsed: botActions.length,
        actions: botActions,
        summary: `${actionSummaryParts.join(', ')} — ${goldDelta >= 0 ? '+' : ''}${goldDelta}g`,
        marketItemsListed: botMarketItemsListed,
        marketOrdersPlaced: botMarketOrdersPlaced,
        marketAuctionsWon: botAuctionsWon,
        marketAuctionsLost: botAuctionsLost,
        marketGoldSpent: botMarketGoldSpent,
        marketGoldEarned: botMarketGoldEarned,
        marketNetGold: botMarketGoldEarned - botMarketGoldSpent,
      };
      this.botDayLogs.push(botLog);
    }

    this.singleTickCount++;

    // Build gold stats
    const topEarners = earnerList
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10);

    const goldStats: GoldStats = {
      totalEarned,
      totalSpent,
      netGoldChange: totalEarned - totalSpent,
      byProfession: goldByProfession,
      byTown: goldByTown,
      byLevel: goldByLevel,
      topEarners,
    };

    const tickResult: SimTickResult = {
      tickNumber: this.singleTickCount,
      botsProcessed,
      actionBreakdown,
      successes,
      failures,
      errors: errors.slice(0, 20), // cap at 20
      durationMs: Date.now() - startTime,
      goldStats,
      gameDay: getGameDay(),
    };

    this.tickHistory.push(tickResult);

    // Clear simulation context
    setSimulationTick(null);

    return tickResult;
  }

  // ---------------------------------------------------------------------------
  // Run N ticks sequentially
  // ---------------------------------------------------------------------------
  async runTicks(n: number): Promise<SimTickResult[]> {
    const results: SimTickResult[] = [];
    for (let i = 0; i < n; i++) {
      const result = await this.runSingleTick();
      results.push(result);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Get distribution stats from current bot population
  // ---------------------------------------------------------------------------
  getSimulationStats(): SimulationStats {
    const raceCounts: Record<string, number> = {};
    const classCounts: Record<string, number> = {};
    const profCounts: Record<string, number> = {};
    const townCounts: Record<string, number> = {};
    const levelCounts: Record<number, number> = {};
    let totalGold = 0;

    for (const bot of this.bots) {
      raceCounts[bot.race] = (raceCounts[bot.race] || 0) + 1;
      classCounts[bot.class] = (classCounts[bot.class] || 0) + 1;
      for (const prof of bot.professions) {
        profCounts[prof] = (profCounts[prof] || 0) + 1;
      }
      townCounts[bot.currentTownId] = (townCounts[bot.currentTownId] || 0) + 1;
      levelCounts[bot.level] = (levelCounts[bot.level] || 0) + 1;
      totalGold += bot.gold;
    }

    return {
      raceDistribution: Object.entries(raceCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      classDistribution: Object.entries(classCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      professionDistribution: Object.entries(profCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      townDistribution: Object.entries(townCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      levelDistribution: Object.entries(levelCounts).map(([level, count]) => ({ level: Number(level), count })).sort((a, b) => a.level - b.level),
      totalGold,
      totalItems: 0, // Would need DB query, keep simple
      averageLevel: this.bots.length > 0 ? this.bots.reduce((sum, b) => sum + b.level, 0) / this.bots.length : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Pause / Resume / Stop
  // ---------------------------------------------------------------------------
  pause(): void {
    this.status = 'paused';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Simulation paused');
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.intervalId = setInterval(() => this.tick(), this.config.tickIntervalMs);
    logger.info('Simulation resumed');
  }

  stop(): void {
    this.status = 'idle';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Simulation stopped');
  }

  // ---------------------------------------------------------------------------
  // Tick history & bot day logs
  // ---------------------------------------------------------------------------
  getTickHistory(): SimTickResult[] {
    return this.tickHistory;
  }

  getBotDayLogs(): BotDayLog[] {
    return this.botDayLogs;
  }

  // ---------------------------------------------------------------------------
  // Cleanup (full teardown)
  // ---------------------------------------------------------------------------
  async cleanup(): Promise<any> {
    if (this.status === 'running' || this.status === 'paused') {
      this.stop();
    }
    const result = await cleanupBots();
    this.bots = [];
    this.status = 'idle';
    this.config = DEFAULT_CONFIG;
    this.seedConfig = DEFAULT_SEED_CONFIG;
    this.startedAt = null;
    this.tickIndex = 0;
    this.singleTickCount = 0;
    this.errorStormUntil = 0;
    this.focusSystem = null;
    this.focusUntil = 0;
    this.tickHistory = [];
    this.botDayLogs = [];
    resetLog();
    logger.info('Simulation cleaned up');
    return result;
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------
  getStatus(): SimulationStatus {
    const stats = getActivityStats();
    return {
      status: this.status,
      startedAt: this.startedAt?.toISOString() || null,
      botCount: this.bots.length,
      activeBots: this.bots.filter((b) => b.isActive).length,
      totalActions: stats.totalActions,
      totalErrors: stats.totalErrors,
      actionsPerMinute: stats.actionsPerMinute,
      uptime: this.startedAt ? getUptime() : 0,
      bots: this.getBotSummaries(),
      recentActivity: getRecentActivity(50),
      intelligence: this.seedConfig.intelligence,
      gameDayOffset: getGameDayOffset(),
    };
  }

  // ---------------------------------------------------------------------------
  // Bot summaries
  // ---------------------------------------------------------------------------
  getBotSummaries(): BotSummary[] {
    const now = Date.now();
    return this.bots.map((b) => {
      let status: BotSummary['status'];
      if (!b.isActive) {
        status = b.consecutiveErrors > 10 ? 'error' : 'idle';
      } else if (b.pausedUntil > now) {
        status = 'paused';
      } else if (b.consecutiveErrors > 3) {
        status = 'error';
      } else {
        status = 'active';
      }

      return {
        characterId: b.characterId,
        characterName: b.characterName,
        username: b.username,
        profile: b.profile,
        race: b.race,
        class: b.class,
        level: b.level,
        gold: b.gold,
        currentTownId: b.currentTownId,
        lastAction: b.lastAction,
        lastActionAt: b.lastActionAt,
        actionsCompleted: b.actionsCompleted,
        errorsTotal: b.errorsTotal,
        isActive: b.isActive,
        status,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Error storm
  // ---------------------------------------------------------------------------
  triggerErrorStorm(durationSeconds: number = 30): void {
    this.errorStormUntil = Date.now() + durationSeconds * 1000;
    logger.info({ durationSeconds }, 'Error storm triggered');
  }

  // ---------------------------------------------------------------------------
  // Focus on a single system
  // ---------------------------------------------------------------------------
  focusOnSystem(system: string, durationSeconds: number = 60): void {
    this.focusSystem = system;
    this.focusUntil = Date.now() + durationSeconds * 1000;
    logger.info({ system, durationSeconds }, 'Focus mode activated');
  }

  // ---------------------------------------------------------------------------
  // Runtime config adjustment
  // ---------------------------------------------------------------------------
  adjustConfig(partial: Partial<SimulationConfig>): void {
    const oldTickInterval = this.config.tickIntervalMs;
    this.config = { ...this.config, ...partial };

    // Restart interval if tick rate changed while running
    if (
      partial.tickIntervalMs !== undefined &&
      partial.tickIntervalMs !== oldTickInterval &&
      this.status === 'running' &&
      this.intervalId
    ) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.tick(), this.config.tickIntervalMs);
      logger.info({ tickIntervalMs: this.config.tickIntervalMs }, 'Tick interval updated');
    }
  }
}

export const simulationController = new SimulationController();
