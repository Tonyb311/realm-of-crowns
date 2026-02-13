// ---------------------------------------------------------------------------
// Admin API — Simulation Control Endpoints
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { validate } from '../../middleware/validate';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { simulationController } from '../../lib/simulation/controller';
import { getTestPlayerCount } from '../../lib/simulation/seed';

const router = Router();

// --- Schemas ---

const seedSchema = z.object({
  count: z.number().int().min(1).max(500).default(20),
  townIds: z.union([z.array(z.string().uuid()), z.literal('all')]).default('all'),
  intelligence: z.number().int().min(0).max(100).default(50),
  raceDistribution: z.enum(['even', 'realistic']).default('realistic'),
  classDistribution: z.enum(['even', 'realistic']).default('realistic'),
  professionDistribution: z.enum(['even', 'diverse']).default('diverse'),
  startingLevel: z.number().int().min(1).max(10).default(1),
  namePrefix: z.string().min(1).max(20).default('Bot'),
});

const runSchema = z.object({
  ticks: z.number().int().min(1).max(100).default(1),
});

const configPatchSchema = z.object({
  tickIntervalMs: z.number().int().min(1000).max(60000).optional(),
  botsPerTick: z.number().int().min(1).max(20).optional(),
  enabledSystems: z
    .object({
      combat: z.boolean().optional(),
      crafting: z.boolean().optional(),
      gathering: z.boolean().optional(),
      market: z.boolean().optional(),
      quests: z.boolean().optional(),
      governance: z.boolean().optional(),
      guilds: z.boolean().optional(),
      travel: z.boolean().optional(),
      social: z.boolean().optional(),
    })
    .optional(),
});

const cleanupSchema = z.object({
  confirm: z.literal(true, { errorMap: () => ({ message: 'Must confirm cleanup with { confirm: true }' }) }),
});

const focusSchema = z.object({
  system: z.enum([
    'combat',
    'crafting',
    'gathering',
    'market',
    'quests',
    'governance',
    'guilds',
    'travel',
    'social',
  ]),
  durationSeconds: z.number().int().min(10).max(600).default(60),
});

const errorStormSchema = z.object({
  durationSeconds: z.number().int().min(5).max(120).default(30),
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/seed — Create test players
// ---------------------------------------------------------------------------
router.post('/seed', validate(seedSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await simulationController.seed(req.body);
    return res.json({
      message: `Seeded ${result.botsCreated} bots`,
      botsCreated: result.botsCreated,
      bots: result.bots,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'simulation-seed', req)) return;
    logRouteError(req, 500, '[Simulation] Seed error', error);
    return res.status(500).json({ error: 'Failed to seed bots' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/tick — Run one simulation tick
// ---------------------------------------------------------------------------
router.post('/tick', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await simulationController.runSingleTick();
    return res.json(result);
  } catch (error: any) {
    logRouteError(req, 500, '[Simulation] Tick error', error);
    return res.status(500).json({ error: error.message || 'Tick failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/run — Run N ticks
// ---------------------------------------------------------------------------
router.post('/run', validate(runSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticks } = req.body;
    const results = await simulationController.runTicks(ticks);
    return res.json({
      message: `Completed ${ticks} tick(s)`,
      ticksRun: results.length,
      results,
    });
  } catch (error: any) {
    logRouteError(req, 500, '[Simulation] Run error', error);
    return res.status(500).json({ error: error.message || 'Run failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/simulation/stats — Distribution & economy stats
// ---------------------------------------------------------------------------
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = simulationController.getSimulationStats();
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/start — Start the simulation loop
// ---------------------------------------------------------------------------
router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await simulationController.start();
    return res.json({ message: 'Simulation started' });
  } catch (error: any) {
    logRouteError(req, 400, '[Simulation] Start error', error);
    return res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/pause — Pause the simulation
// ---------------------------------------------------------------------------
router.post('/pause', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    simulationController.pause();
    return res.json({ message: 'Simulation paused' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/resume — Resume the simulation
// ---------------------------------------------------------------------------
router.post('/resume', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    simulationController.resume();
    return res.json({ message: 'Simulation resumed' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/stop — Stop the simulation (bots persist)
// ---------------------------------------------------------------------------
router.post('/stop', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    simulationController.stop();
    return res.json({ message: 'Simulation stopped' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/simulation/status — Current state + bot summaries + stats
// ---------------------------------------------------------------------------
router.get('/status', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = simulationController.getStatus();
    const dbTestPlayers = await getTestPlayerCount();
    return res.json({ ...status, dbTestPlayers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/simulation/activity — Recent activity entries
// ---------------------------------------------------------------------------
router.get('/activity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 50;
    const status = simulationController.getStatus();
    return res.json({
      recentActivity: status.recentActivity.slice(0, Math.min(count, 200)),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/simulation/config — Adjust speed/systems on the fly
// ---------------------------------------------------------------------------
router.patch('/config', validate(configPatchSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    simulationController.adjustConfig(req.body);
    return res.json({ message: 'Configuration updated', config: req.body });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/simulation/cleanup — Stop + delete ALL test data
// ---------------------------------------------------------------------------
router.delete('/cleanup', validate(cleanupSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await simulationController.cleanup();
    return res.json({
      message: 'All test data cleaned up',
      ...result,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'simulation-cleanup', req)) return;
    logRouteError(req, 500, '[Simulation] Cleanup error', error);
    return res.status(500).json({ error: 'Cleanup failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/error-storm — Trigger error storm for testing
// ---------------------------------------------------------------------------
router.post('/error-storm', validate(errorStormSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { durationSeconds } = req.body;
    simulationController.triggerErrorStorm(durationSeconds);
    return res.json({ message: `Error storm triggered for ${durationSeconds}s` });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/simulation/focus — Focus all bots on one system
// ---------------------------------------------------------------------------
router.post('/focus', validate(focusSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { system, durationSeconds } = req.body;
    simulationController.focusOnSystem(system, durationSeconds);
    return res.json({ message: `Focused on ${system} for ${durationSeconds}s` });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/simulation/history — Tick history
// ---------------------------------------------------------------------------
router.get('/history', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const history = simulationController.getTickHistory();
    return res.json({ ticks: history, total: history.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/simulation/bot-logs — Per-bot daily logs with filters
// ---------------------------------------------------------------------------
router.get('/bot-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let logs = simulationController.getBotDayLogs();

    if (req.query.botId) {
      logs = logs.filter(l => l.botId === req.query.botId);
    }
    if (req.query.tick) {
      logs = logs.filter(l => l.tickNumber === Number(req.query.tick));
    }
    if (req.query.botName) {
      logs = logs.filter(l => l.botName.toLowerCase().includes(String(req.query.botName).toLowerCase()));
    }

    return res.json({ logs, total: logs.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/simulation/export — Download Excel report
// ---------------------------------------------------------------------------
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = simulationController.getSimulationStats();
    const status = simulationController.getStatus();
    const history = simulationController.getTickHistory();
    const botLogs = simulationController.getBotDayLogs();

    // Resolve town UUIDs to human-readable names
    const allTowns = await prisma.town.findMany({ select: { id: true, name: true } });
    const townNameMap = new Map(allTowns.map(t => [t.id, t.name]));
    function resolveTown(id: string): string { return townNameMap.get(id) ?? id; }

    const workbook = XLSX.utils.book_new();

    // ---- Summary sheet (computed first, inserted as first sheet) ----
    let totalEarned = 0;
    let totalSpent = 0;
    let totalActions = 0;
    let totalErrors = 0;
    history.forEach((t: any) => {
      totalEarned += t.goldStats?.totalEarned ?? 0;
      totalSpent += t.goldStats?.totalSpent ?? 0;
      totalActions += (t.successes ?? 0) + (t.failures ?? 0);
      totalErrors += t.failures ?? 0;
    });
    const netGold = totalEarned - totalSpent;
    const errorRate = totalActions > 0 ? (totalErrors / totalActions * 100).toFixed(1) : '0.0';

    const bots = status.bots ?? [];
    const avgLevel = bots.length > 0
      ? Math.round(bots.reduce((sum: number, b: any) => sum + b.level, 0) / bots.length * 10) / 10
      : 0;

    const lastTick = history.length > 0 ? history[history.length - 1] : null;
    const topEarner = (lastTick as any)?.goldStats?.topEarners?.[0];
    const topEarnerName = topEarner?.botName ?? 'N/A';
    const topEarnerGold = topEarner?.earned ?? 0;

    // Profession adoption (use stats.professionDistribution — bot summaries lack professions array)
    const profDist = stats.professionDistribution ?? [];
    const botsWithProf = profDist.reduce((sum: number, p: any) => sum + p.count, 0);
    const topProfession = profDist.length > 0 ? profDist[0].name : 'None';

    const summaryData = [
      { Metric: 'Bots Seeded', Value: bots.length },
      { Metric: 'Ticks Completed', Value: history.length },
      { Metric: 'Start Game Day', Value: history.length > 0 ? (history[0] as any).gameDay : 'N/A' },
      { Metric: 'End Game Day', Value: lastTick ? (lastTick as any).gameDay : 'N/A' },
      { Metric: 'Total Gold Earned', Value: totalEarned },
      { Metric: 'Total Gold Spent', Value: totalSpent },
      { Metric: 'Net Gold Change', Value: netGold },
      { Metric: 'Total Actions', Value: totalActions },
      { Metric: 'Total Errors', Value: totalErrors },
      { Metric: 'Error Rate', Value: `${errorRate}%` },
      { Metric: 'Avg Bot Level', Value: avgLevel },
      { Metric: 'Top Earner', Value: topEarnerName },
      { Metric: 'Top Earner Gold', Value: topEarnerGold },
      { Metric: 'Bots with Professions', Value: botsWithProf },
      { Metric: 'Most Popular Profession', Value: topProfession },
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), 'Summary');

    // Sheet 2: Bot Details
    const botData = bots.map((b: any) => ({
      Name: b.characterName,
      Race: b.race,
      Class: b.class,
      Profile: b.profile,
      Level: b.level,
      Gold: b.gold,
      Town: resolveTown(b.currentTownId),
      ActionsCompleted: b.actionsCompleted,
      Errors: b.errorsTotal,
      Status: b.status,
    }));
    if (botData.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(botData), 'Bots');
    }

    // Sheet 3: Race Distribution
    if (stats.raceDistribution.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats.raceDistribution.map((d: any) => ({ Race: d.name, Count: d.count }))), 'Race Distribution');
    }

    // Sheet 4: Class Distribution
    if (stats.classDistribution.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats.classDistribution.map((d: any) => ({ Class: d.name, Count: d.count }))), 'Class Distribution');
    }

    // Sheet 5: Profession Distribution
    if (stats.professionDistribution.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats.professionDistribution.map((d: any) => ({ Profession: d.name, Count: d.count }))), 'Prof Distribution');
    }

    // Sheet 6: Town Distribution
    if (stats.townDistribution.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats.townDistribution.map((d: any) => ({ Town: resolveTown(d.name), Count: d.count }))), 'Town Distribution');
    }

    // Sheet 7: Tick History (with cumulative columns)
    let cumGoldEarned = 0;
    let cumGoldSpent = 0;
    let cumActions = 0;
    const tickData = history.map((t: any) => {
      const earned = t.goldStats?.totalEarned ?? 0;
      const spent = t.goldStats?.totalSpent ?? 0;
      cumGoldEarned += earned;
      cumGoldSpent += spent;
      cumActions += (t.successes ?? 0) + (t.failures ?? 0);

      return {
        Tick: t.tickNumber,
        GameDay: t.gameDay ?? 0,
        BotsProcessed: t.botsProcessed,
        Successes: t.successes,
        Failures: t.failures,
        Gathered: t.actionBreakdown?.gather ?? 0,
        Crafted: t.actionBreakdown?.craft ?? 0,
        Sold: t.actionBreakdown?.sell ?? 0,
        Bought: t.actionBreakdown?.buy ?? 0,
        Quested: t.actionBreakdown?.quest ?? 0,
        Traveled: t.actionBreakdown?.travel ?? 0,
        Combat: t.actionBreakdown?.combat ?? 0,
        GoldEarned: earned,
        GoldSpent: spent,
        NetGold: t.goldStats?.netGoldChange ?? 0,
        CumulativeGoldEarned: cumGoldEarned,
        CumulativeGoldSpent: cumGoldSpent,
        CumulativeNetGold: cumGoldEarned - cumGoldSpent,
        CumulativeActions: cumActions,
        Errors: t.errors?.length ?? 0,
        DurationMs: t.durationMs,
      };
    });
    if (tickData.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tickData), 'Tick History');
    }

    // Sheet 8: Gold by Profession (per tick)
    const goldByProf: any[] = [];
    history.forEach((t: any) => {
      if (t.goldStats?.byProfession) {
        Object.entries(t.goldStats.byProfession).forEach(([prof, data]: [string, any]) => {
          goldByProf.push({
            Tick: t.tickNumber,
            Profession: prof,
            BotCount: data.botCount,
            Earned: data.earned,
            Spent: data.spent,
            Net: data.net,
            AvgPerBot: data.botCount > 0 ? Math.round(data.net / data.botCount) : 0,
          });
        });
      }
    });
    if (goldByProf.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(goldByProf), 'Gold by Profession');
    }

    // Sheet 9: Gold by Town
    const goldByTown: any[] = [];
    history.forEach((t: any) => {
      if (t.goldStats?.byTown) {
        Object.entries(t.goldStats.byTown).forEach(([town, data]: [string, any]) => {
          goldByTown.push({
            Tick: t.tickNumber,
            Town: resolveTown(town),
            Earned: data.earned,
            Spent: data.spent,
            Net: data.net,
          });
        });
      }
    });
    if (goldByTown.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(goldByTown), 'Gold by Town');
    }

    // Sheet 10: Activity Log
    const recentActivity = status.recentActivity ?? [];
    if (recentActivity.length > 0) {
      const actData = recentActivity.slice(0, 500).map((a: any) => ({
        Time: a.timestamp,
        Bot: a.botName,
        Profile: a.profile,
        Action: a.action,
        Success: a.success,
        Detail: a.detail,
        DurationMs: a.durationMs,
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(actData), 'Activity Log');
    }

    // Sheet 11: Bot Daily Logs
    if (botLogs.length > 0) {
      const dailyData = botLogs.map((l: any) => ({
        Tick: l.tickNumber,
        GameDay: l.gameDay,
        BotName: l.botName,
        Race: l.race,
        Class: l.class,
        Profession: l.profession,
        Town: resolveTown(l.town),
        Level: l.level,
        GoldStart: l.goldStart,
        GoldEnd: l.goldEnd,
        GoldNet: l.goldNet,
        ActionsUsed: l.actionsUsed,
        Summary: l.summary,
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyData), 'Bot Daily Logs');
    }

    // Sheet 12: All Actions Detail
    const actionsDetail: any[] = [];
    botLogs.forEach((l: any) => {
      (l.actions || []).forEach((a: any) => {
        actionsDetail.push({
          Tick: l.tickNumber,
          BotName: l.botName,
          Profession: l.profession,
          Town: resolveTown(l.town),
          Level: l.level,
          ActionOrder: a.order,
          ActionType: a.type,
          Detail: a.detail,
          Success: a.success,
          GoldDelta: a.goldDelta,
          Error: a.error ?? '',
        });
      });
    });
    if (actionsDetail.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(actionsDetail), 'All Actions Detail');
    }

    // If only summary sheet exists (no data sheets added), that's fine — summary has metadata

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const gameDay = history.length > 0 ? (history[history.length - 1] as any).gameDay ?? 0 : 0;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=simulation-export-day${gameDay}.xlsx`);
    return res.send(Buffer.from(buffer));
  } catch (error: any) {
    logRouteError(req as any, 500, '[Simulation] Export error', error);
    return res.status(500).json({ error: error.message || 'Export failed' });
  }
});

export default router;
