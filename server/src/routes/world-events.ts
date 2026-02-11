import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

// GET /api/world-events — list recent global events (paginated)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;
    const eventType = req.query.eventType as string | undefined;

    const where = eventType ? { eventType } : {};

    const [events, total] = await Promise.all([
      prisma.worldEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.worldEvent.count({ where }),
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
    console.error('List world events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/world-events/war-bulletin — active war bulletin board
router.get('/war-bulletin', authGuard, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const activeWars = await prisma.war.findMany({
      where: { status: 'ACTIVE' },
      include: {
        attackerKingdom: { select: { id: true, name: true } },
        defenderKingdom: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Also fetch recent war-related events
    const recentWarEvents = await prisma.worldEvent.findMany({
      where: {
        eventType: { in: ['WAR_DECLARATION', 'PEACE_TREATY'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json({
      activeWars: activeWars.map((w) => ({
        id: w.id,
        attacker: w.attackerKingdom,
        defender: w.defenderKingdom,
        reason: w.reason,
        status: w.status,
        attackerScore: w.attackerScore,
        defenderScore: w.defenderScore,
        startedAt: w.startedAt,
        daysSinceStart: Math.floor(
          (Date.now() - w.startedAt.getTime()) / (1000 * 60 * 60 * 24),
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
    console.error('War bulletin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/world-events/state-report — latest State of Aethermere report
router.get('/state-report', authGuard, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const latestReport = await prisma.worldEvent.findFirst({
      where: { eventType: 'STATE_REPORT' },
      orderBy: { createdAt: 'desc' },
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
    console.error('State report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
