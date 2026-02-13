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
  DEFAULT_CONFIG,
  DEFAULT_SEED_CONFIG,
} from './types';
import { seedBots, cleanupBots, initResourceCache } from './seed';
import { decideBotAction, errorStormAction } from './engine';
import { logActivity, getRecentActivity, getStats as getActivityStats, getUptime, resetLog } from './activity-log';
import { refreshBotState } from './actions';
import { getGameDayOffset } from '../../lib/game-day';
import { logger } from '../../lib/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categorizeAction(endpoint: string): string {
  if (endpoint.includes('work') || endpoint.includes('gather')) return 'gather';
  if (endpoint.includes('craft')) return 'craft';
  if (endpoint.includes('market/buy') || endpoint.includes('buy')) return 'buy';
  if (endpoint.includes('market/list') || endpoint.includes('sell') || endpoint.includes('market/browse')) return 'sell';
  if (endpoint.includes('combat')) return 'combat';
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
  private tickIndex: number = 0;

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
  // ---------------------------------------------------------------------------
  async runSingleTick(): Promise<SimTickResult> {
    const startTime = Date.now();
    const actionBreakdown: Record<string, number> = {};
    let successes = 0;
    let failures = 0;
    const errors: string[] = [];
    let botsProcessed = 0;

    const activeBots = this.bots.filter((b) => b.isActive);

    for (const bot of activeBots) {
      // Refresh state
      try { await refreshBotState(bot); } catch { /* ignore */ }

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
        if (bot.consecutiveErrors > 10) bot.isActive = false;
        else if (bot.consecutiveErrors > 5) bot.pausedUntil = Date.now() + 30_000;
      }

      // Log
      const entry: ActivityEntry = {
        timestamp: new Date().toISOString(),
        characterId: bot.characterId,
        botName: bot.characterName,
        profile: bot.profile,
        action: actionType,
        endpoint: result.endpoint,
        success: result.success,
        detail: result.detail,
        durationMs: Date.now() - startTime,
      };
      logActivity(entry);

      bot.lastAction = result.detail;
      bot.lastActionAt = Date.now();
      bot.actionsCompleted++;
      botsProcessed++;
    }

    this.tickIndex++;

    return {
      tickNumber: this.tickIndex,
      botsProcessed,
      actionBreakdown,
      successes,
      failures,
      errors: errors.slice(0, 20), // cap at 20
      durationMs: Date.now() - startTime,
    };
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
    this.errorStormUntil = 0;
    this.focusSystem = null;
    this.focusUntil = 0;
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
