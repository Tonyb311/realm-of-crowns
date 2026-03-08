import { Router, Response } from 'express';
import { db } from '../lib/db';
import { eq, desc, inArray, count } from 'drizzle-orm';
import { worldEvents, wars } from '@database/tables';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

// GET /api/world-events — list recent global events (paginated)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const eventType = req.query.eventType as string | undefined;

    const whereClause = eventType ? eq(worldEvents.eventType, eventType) : undefined;

    const [events, [{ total }]] = await Promise.all([
      db.select().from(worldEvents)
        .where(whereClause)
        .orderBy(desc(worldEvents.createdAt))
        .offset(offset)
        .limit(limit),
      db.select({ total: count() }).from(worldEvents)
        .where(whereClause),
    ]);

    return res.json({
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (handleDbError(error, res, 'list world events', req)) return;
    logRouteError(req, 500, 'List world events error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/world-events/war-bulletin — active war bulletin board
router.get('/war-bulletin', authGuard, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const activeWars = await db.query.wars.findMany({
      where: eq(wars.status, 'ACTIVE'),
      with: {
        kingdom_attackerKingdomId: { columns: { id: true, name: true } },
        kingdom_defenderKingdomId: { columns: { id: true, name: true } },
      },
      orderBy: desc(wars.startedAt),
    });

    // Also fetch recent war-related events
    const recentWarEvents = await db.select().from(worldEvents)
      .where(inArray(worldEvents.eventType, ['WAR_DECLARATION', 'PEACE_TREATY']))
      .orderBy(desc(worldEvents.createdAt))
      .limit(10);

    return res.json({
      activeWars: activeWars.map((w) => ({
        id: w.id,
        attacker: w.kingdom_attackerKingdomId,
        defender: w.kingdom_defenderKingdomId,
        reason: w.reason,
        status: w.status,
        attackerScore: w.attackerScore,
        defenderScore: w.defenderScore,
        startedAt: w.startedAt,
        daysSinceStart: Math.floor(
          (Date.now() - new Date(w.startedAt).getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      recentWarEvents: recentWarEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'war bulletin', _req)) return;
    logRouteError(_req, 500, 'War bulletin error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/world-events/state-report — latest State of Aethermere report
router.get('/state-report', authGuard, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const latestReport = await db.query.worldEvents.findFirst({
      where: eq(worldEvents.eventType, 'STATE_REPORT'),
      orderBy: desc(worldEvents.createdAt),
    });

    if (!latestReport) {
      return res.status(404).json({ error: 'No state report available yet' });
    }

    return res.json({
      report: {
        id: latestReport.id,
        title: latestReport.title,
        description: latestReport.description,
        metadata: latestReport.metadata,
        createdAt: latestReport.createdAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'state report', _req)) return;
    logRouteError(_req, 500, 'State report error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
