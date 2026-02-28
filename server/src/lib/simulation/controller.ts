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
  BotActionEntry,
  TickResolutionEntry,
  BotTimeline,
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
import { SimulationLogger, captureBotState } from './sim-logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIM_BATCH_SIZE = 10;

async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
  }
}

function categorizeAction(endpoint: string): string {
  if (endpoint.includes('work') || endpoint.includes('gather')) return 'gather';
  if (endpoint.includes('craft')) return 'craft';
  // lock-in actions carry the action type in their detail, but the endpoint
  // is /actions/lock-in. Categorise them by checking the body was CRAFT.
  if (endpoint.includes('lock-in')) return 'craft';
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
  if (endpoint.includes('parties') || endpoint.includes('party')) return 'party';
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
  private runProgress: { current: number; total: number } | null = null;
  private stopRequested = false;
  private simLogger: SimulationLogger = new SimulationLogger();

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
  // Tick (interval-based) — delegates to runSingleTick so tick resolution fires
  // ---------------------------------------------------------------------------
  private tickInProgress = false;

  private async tick(): Promise<void> {
    if (this.status !== 'running') return;
    if (this.tickInProgress) return; // prevent overlapping ticks

    this.tickInProgress = true;
    try {
      await this.runSingleTick();
    } catch (err: any) {
      logger.error({ err: err.message }, 'Interval tick error');
    } finally {
      this.tickInProgress = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Run a single tick across ALL bots (not interval-based, synchronous)
  // Each bot gets up to config.actionsPerTick actions per tick.
  // ---------------------------------------------------------------------------
  async runSingleTick(): Promise<SimTickResult> {
    const startTime = Date.now();
    const phaseTiming: Record<string, number> = {};
    const actionBreakdown: Record<string, number> = {};
    let successes = 0;
    let failures = 0;
    const errors: string[] = [];
    let botsProcessed = 0;

    // Set simulation context so combat logs get tagged with this tick number
    setSimulationTick(this.singleTickCount + 1);

    // Gold tracking accumulators
    const goldByProfession: Record<string, { earned: number; spent: number; net: number; botCount: number }> = {};
    const goldByTown: Record<string, { earned: number; spent: number; net: number }> = {};
    const goldByLevel: Record<number, { earned: number; spent: number; net: number }> = {};
    let totalEarned = 0;
    let totalSpent = 0;
    const earnerList: { botName: string; profession: string; town: string; earned: number }[] = [];

    const activeBots = this.bots.filter((b) => b.isActive);

    // -----------------------------------------------------------------------
    // Phase 1: Bot action loop — batched concurrency (SIM_BATCH_SIZE bots at a time)
    // Each bot commits exactly 1 daily action + free side-effects.
    // -----------------------------------------------------------------------
    const p1Start = Date.now();

    const botGoldBefore = new Map<string, number>();
    const botXpBefore = new Map<string, number>();
    const botTownBefore = new Map<string, string>();
    const botLevelBefore = new Map<string, number>();
    const botActionsList = new Map<string, Array<{
      order: number;
      type: string;
      detail: string;
      success: boolean;
      goldDelta: number;
      error?: string;
    }>>();
    const botMarketItemsListedMap = new Map<string, number>();
    const botMarketOrdersPlacedMap = new Map<string, number>();

    // Per-bot results collected concurrently, aggregated after
    interface BotPhase1Result {
      characterId: string;
      success: boolean;
      actionType: string;
      actions: Array<{ order: number; type: string; detail: string; success: boolean; goldDelta: number; error?: string }>;
      goldBefore: number;
      xpBefore: number;
      townBefore: string;
      levelBefore: number;
      error?: string;
      marketItemsListed: number;
      marketOrdersPlaced: number;
      freeMarketActions: Array<{ actionType: string; success: boolean; detail: string; isAlreadyOrder: boolean }>;
    }

    const botResults: BotPhase1Result[] = [];

    await processBatch(activeBots, SIM_BATCH_SIZE, async (bot) => {
      // Refresh state before the action
      try { await refreshBotState(bot); } catch { /* ignore */ }

      // Record state before action
      const goldBefore = bot.gold;
      const xpBefore = bot.xp;
      const townBefore = bot.currentTownId;
      const levelBefore = bot.level;

      const botActions: BotPhase1Result['actions'] = [];

      // --- Single call to decideBotAction (handles free + daily action) ---
      const goldBeforeAction = bot.gold;
      let result: ActionResult;
      try {
        result = await decideBotAction(bot, this.bots, this.config, this.simLogger, this.singleTickCount + 1);
      } catch (err: any) {
        result = { success: false, detail: `Uncaught: ${err.message}`, endpoint: 'error' };
      }

      const actionType = categorizeAction(result.endpoint);

      if (result.success) {
        bot.consecutiveErrors = 0;
      } else if (actionType === 'idle') {
        // Idle is neutral
      } else {
        bot.consecutiveErrors++;
        bot.errorsTotal++;
        if (bot.consecutiveErrors > 10) {
          bot.isActive = false;
        } else if (bot.consecutiveErrors > 5) {
          bot.pausedUntil = Date.now() + 30_000;
        }
      }

      // Refresh after action to pick up gold/xp changes
      try { await refreshBotState(bot); } catch { /* ignore */ }

      const actionGoldDelta = bot.gold - goldBeforeAction;

      botActions.push({
        order: 1,
        type: actionType,
        detail: result.detail,
        success: result.success,
        goldDelta: actionGoldDelta,
        error: result.success ? undefined : result.detail,
      });

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

      // Free market actions (don't consume action slots)
      let botMarketItemsListed = 0;
      let botMarketOrdersPlaced = 0;
      const freeMarketActions: BotPhase1Result['freeMarketActions'] = [];

      if (this.config.enabledSystems.market && bot.currentTownId && bot.isActive && !bot.pendingTravel) {
        try {
          const { doFreeMarketActions } = await import('./actions');
          const mktStart = Date.now();
          const marketResults = await doFreeMarketActions(bot);
          const mktDuration = Date.now() - mktStart;
          const perActionMs = marketResults.length > 0 ? Math.round(mktDuration / marketResults.length) : 0;

          for (const mr of marketResults) {
            const marketAction = categorizeAction(mr.endpoint);
            const isAlreadyOrder = !!mr.detail?.includes('Already have order');

            freeMarketActions.push({
              actionType: marketAction,
              success: mr.success,
              detail: mr.detail,
              isAlreadyOrder,
            });

            // Track per-bot market action counts
            if (mr.success) {
              if (marketAction === 'market_list') botMarketItemsListed++;
              if (marketAction === 'market_buy') botMarketOrdersPlaced++;
            }

            // Log to detailed sim logger (post phase)
            this.simLogger.logFromResult(bot, mr, {
              tick: this.singleTickCount + 1,
              phase: 'post',
              intent: marketAction,
              attemptNumber: 1,
              durationMs: perActionMs,
              dailyActionUsed: true,
            });

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

      botResults.push({
        characterId: bot.characterId,
        success: result.success,
        actionType,
        actions: botActions,
        goldBefore,
        xpBefore,
        townBefore,
        levelBefore,
        error: result.success ? undefined : result.detail,
        marketItemsListed: botMarketItemsListed,
        marketOrdersPlaced: botMarketOrdersPlaced,
        freeMarketActions,
      });
    });

    // Aggregate Phase 1 results
    for (const r of botResults) {
      botGoldBefore.set(r.characterId, r.goldBefore);
      botXpBefore.set(r.characterId, r.xpBefore);
      botTownBefore.set(r.characterId, r.townBefore);
      botLevelBefore.set(r.characterId, r.levelBefore);
      botActionsList.set(r.characterId, r.actions);
      botMarketItemsListedMap.set(r.characterId, r.marketItemsListed);
      botMarketOrdersPlacedMap.set(r.characterId, r.marketOrdersPlaced);

      // Daily action counts
      actionBreakdown[r.actionType] = (actionBreakdown[r.actionType] || 0) + 1;
      if (r.success) {
        successes++;
      } else if (r.actionType === 'idle') {
        successes++;
      } else {
        failures++;
        if (r.error) errors.push(r.error);
      }

      // Free market action counts
      for (const fma of r.freeMarketActions) {
        actionBreakdown[fma.actionType] = (actionBreakdown[fma.actionType] || 0) + 1;
        if (fma.success) {
          successes++;
        } else if (fma.isAlreadyOrder) {
          successes++;
        } else {
          failures++;
          if (fma.detail) errors.push(fma.detail);
        }
      }
    }

    phaseTiming['phase1_bot_actions'] = Date.now() - p1Start;

    // -----------------------------------------------------------------------
    // Phase 2: Run daily tick (resolves LOCKED_IN gather/craft actions from Phase 1)
    // -----------------------------------------------------------------------
    const p2Start = Date.now();
    try { await processDailyTick(); } catch (err: any) {
      errors.push(`Daily tick error: ${err.message}`);
    }
    phaseTiming['phase2_daily_tick'] = Date.now() - p2Start;

    // -----------------------------------------------------------------------
    // Phase 2b: Post-craft listing pass — batched concurrency
    // (v23: A7 in Phase 1 runs before crafting; this catches crafted items)
    // -----------------------------------------------------------------------
    const p2bStart = Date.now();
    if (this.config.enabledSystems.market) {
      const listableBots = activeBots.filter(b => b.isActive && b.currentTownId && !b.pendingTravel);
      await processBatch(listableBots, SIM_BATCH_SIZE, async (bot) => {
        try {
          const { listUnwantedItems } = await import('./actions');
          const listResult = await listUnwantedItems(bot);
          if (listResult.success) {
            console.log(`[SIM][Phase2b] ${bot.characterName} listed: ${listResult.detail}`);
            successes++;
            actionBreakdown['market_list_postcraft'] = (actionBreakdown['market_list_postcraft'] || 0) + 1;
          }
        } catch { /* ignore listing errors */ }
      });
      const postCraftListings = actionBreakdown['market_list_postcraft'] || 0;
      if (postCraftListings > 0) {
        console.log(`[SIM][Phase2b] Post-craft listings: ${postCraftListings} bots listed items`);
      }
    }
    phaseTiming['phase2b_post_craft'] = Date.now() - p2bStart;

    // -----------------------------------------------------------------------
    // Phase 3: Process travel tick — advance travelers and resolve road encounters
    // -----------------------------------------------------------------------
    const p3Start = Date.now();
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
      // Store round-by-round combat data for Excel export
      if (travelResult.combatRounds.length > 0) {
        this.simLogger.logCombatRounds(travelResult.combatRounds);
      }
      logger.info(
        { tick: this.singleTickCount + 1, soloMoved: travelResult.soloMoved, soloArrived: travelResult.soloArrived, soloEncountered: travelResult.soloEncountered, combatRoundsLogged: travelResult.combatRounds.length },
        'Travel tick processed within simulation',
      );
    } catch (err: any) {
      errors.push(`Travel tick error: ${err.message}`);
    }
    phaseTiming['phase3_travel'] = Date.now() - p3Start;

    // -----------------------------------------------------------------------
    // Phase 4: Resolve market auctions for all towns with pending orders
    // -----------------------------------------------------------------------
    const p4Start = Date.now();
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
    phaseTiming['phase4_auctions'] = Date.now() - p4Start;

    // -----------------------------------------------------------------------
    // Phase 5: Bulk auction result queries + gold tracking + day logs
    // Uses 4 bulk groupBy queries instead of 250 individual per-bot queries.
    // -----------------------------------------------------------------------
    const p5Start = Date.now();

    const allBotIds = activeBots.map(b => b.characterId);

    // 1. Bulk auction wins by buyer
    let winsMap = new Map<string, number>();
    let lossesMap = new Map<string, number>();
    let spentMap = new Map<string, number>();
    let earnedMap = new Map<string, number>();
    try {
      const auctionWins = await prisma.marketBuyOrder.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: allBotIds }, status: 'won', resolvedAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter } },
        _count: true,
      });
      winsMap = new Map(auctionWins.map(r => [r.buyerId, r._count]));

      // 2. Bulk auction losses by buyer
      const auctionLosses = await prisma.marketBuyOrder.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: allBotIds }, status: 'lost', resolvedAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter } },
        _count: true,
      });
      lossesMap = new Map(auctionLosses.map(r => [r.buyerId, r._count]));

      // 3. Bulk gold spent (as buyer)
      const goldSpent = await prisma.tradeTransaction.groupBy({
        by: ['buyerId'],
        where: { buyerId: { in: allBotIds }, createdAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter } },
        _sum: { price: true },
      });
      spentMap = new Map(goldSpent.map(r => [r.buyerId, r._sum.price ?? 0]));

      // 4. Bulk gold earned (as seller)
      const goldEarned = await prisma.tradeTransaction.groupBy({
        by: ['sellerId'],
        where: { sellerId: { in: allBotIds }, createdAt: { gte: auctionResolvedBefore, lte: auctionResolvedAfter } },
        _sum: { sellerNet: true },
      });
      earnedMap = new Map(goldEarned.map(r => [r.sellerId, r._sum.sellerNet ?? 0]));
    } catch { /* ignore bulk query errors */ }

    // 5. Batch refresh all bot states concurrently
    await processBatch(activeBots, SIM_BATCH_SIZE, async (bot) => {
      try { await refreshBotState(bot); } catch { /* ignore */ }
    });

    // Now loop through bots using the maps (pure in-memory, no DB calls)
    for (const bot of activeBots) {
      const goldBefore = botGoldBefore.get(bot.characterId) ?? bot.gold;
      const botActions = botActionsList.get(bot.characterId) ?? [];
      const botMarketItemsListed = botMarketItemsListedMap.get(bot.characterId) ?? 0;
      const botMarketOrdersPlaced = botMarketOrdersPlacedMap.get(bot.characterId) ?? 0;

      const botAuctionsWon = winsMap.get(bot.characterId) ?? 0;
      const botAuctionsLost = lossesMap.get(bot.characterId) ?? 0;
      const botMarketGoldSpent = spentMap.get(bot.characterId) ?? 0;
      const botMarketGoldEarned = earnedMap.get(bot.characterId) ?? 0;

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

      // Per-bot tick resolution entry
      const dailyAction = botActions.find(a => !a.type.includes('[FREE]') && a.success);
      const xpBefore = botXpBefore.get(bot.characterId) ?? 0;
      const xpAfter = bot.xp;
      this.simLogger.logTickResolution({
        tick: this.singleTickCount + 1,
        botName: bot.characterName,
        botId: bot.characterId,
        actionType: dailyAction?.type || 'none',
        actionDetail: dailyAction?.detail || 'No action committed',
        resourceGained: dailyAction?.type === 'gather' && dailyAction?.detail ? dailyAction.detail : '',
        xpEarned: xpAfter - xpBefore,
        levelBefore: botLevelBefore.get(bot.characterId) ?? bot.level,
        levelAfter: bot.level,
        goldBefore: goldBefore,
        goldAfter: goldAfter,
        townBefore: botTownBefore.get(bot.characterId) ?? bot.currentTownId,
        townAfter: bot.currentTownId,
      });

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
    phaseTiming['phase5_logging'] = Date.now() - p5Start;

    // -----------------------------------------------------------------------
    // Phase 6: Advance game day (AFTER resolution so bots commit against
    // the current day and resolution happens before we move forward)
    // -----------------------------------------------------------------------
    advanceGameDay(1);

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

    const totalMs = Date.now() - startTime;
    console.log(`[SIM][Tick ${this.singleTickCount}] Total: ${totalMs}ms | ${Object.entries(phaseTiming).map(([k, v]) => `${k}: ${v}ms`).join(' | ')}`);

    const tickResult: SimTickResult = {
      tickNumber: this.singleTickCount,
      botsProcessed,
      actionBreakdown,
      successes,
      failures,
      errors: errors.slice(0, 20), // cap at 20
      durationMs: totalMs,
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
    if (this.runProgress) {
      throw new Error('A simulation run is already in progress');
    }
    this.stopRequested = false;
    const results: SimTickResult[] = [];
    const progress = { current: 0, total: n };
    this.runProgress = progress;
    try {
      for (let i = 0; i < n; i++) {
        if (this.stopRequested) {
          logger.info(`Run stopped early at tick ${i}/${n}`);
          break;
        }
        progress.current = i + 1;
        const result = await this.runSingleTick();
        results.push(result);
      }
    } finally {
      this.runProgress = null;
      this.stopRequested = false;
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
    this.stopRequested = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Clear run progress so a new run can start after stop
    this.runProgress = null;
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

  getSimLogger(): SimulationLogger {
    return this.simLogger;
  }

  getDetailedActionLog(): BotActionEntry[] {
    return this.simLogger.getActionLog();
  }

  getTickResolutions(): TickResolutionEntry[] {
    return this.simLogger.getTickResolutions();
  }

  getBotTimelines(): BotTimeline[] {
    return this.simLogger.getBotTimelines(this.bots);
  }

  getCombatRounds(): import('./types').CombatRound[] {
    return this.simLogger.getCombatRounds();
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
    this.simLogger.clear();
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
      gameDay: getGameDay(),
      gameDayOffset: getGameDayOffset(),
      runProgress: this.runProgress,
      lastTickNumber: this.singleTickCount,
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
