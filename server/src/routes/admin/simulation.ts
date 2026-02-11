// ---------------------------------------------------------------------------
// Admin API — Simulation Control Endpoints
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';
import { simulationController } from '../../lib/simulation/controller';
import { getTestPlayerCount } from '../../lib/simulation/seed';

const router = Router();

// --- Schemas ---

const seedSchema = z.object({
  botCount: z.number().int().min(1).max(100).default(20),
  tickIntervalMs: z.number().int().min(1000).max(60000).optional(),
  botsPerTick: z.number().int().min(1).max(20).optional(),
  profileDistribution: z.record(z.number().int().min(0)).optional(),
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

export default router;
