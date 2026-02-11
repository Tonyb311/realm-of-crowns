import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';
import { Prisma, LogLevel } from '@prisma/client';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/admin/error-logs — Paginated, filterable list
// ---------------------------------------------------------------------------

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.ErrorLogWhereInput = {};

    if (req.query.level) {
      const levels = (req.query.level as string).split(',') as LogLevel[];
      where.level = { in: levels };
    }
    if (req.query.category) {
      where.category = req.query.category as string;
    }
    if (req.query.statusCode) {
      where.statusCode = parseInt(req.query.statusCode as string, 10);
    }
    if (req.query.resolved !== undefined) {
      where.resolved = req.query.resolved === 'true';
    }
    if (req.query.userId) {
      where.userId = req.query.userId as string;
    }
    if (req.query.characterId) {
      where.characterId = req.query.characterId as string;
    }
    if (req.query.startDate || req.query.endDate) {
      where.timestamp = {};
      if (req.query.startDate) where.timestamp.gte = new Date(req.query.startDate as string);
      if (req.query.endDate) where.timestamp.lte = new Date(req.query.endDate as string);
    }
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { detail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.errorLog.count({ where }),
    ]);

    return res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error logs list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/error-logs/stats — Dashboard summary
// ---------------------------------------------------------------------------

router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [count24h, count7d, count30d, unresolved, byLevel, byCategory, byStatusCode, topMessages, hourlyRaw] = await Promise.all([
      prisma.errorLog.count({ where: { timestamp: { gte: day1 } } }),
      prisma.errorLog.count({ where: { timestamp: { gte: day7 } } }),
      prisma.errorLog.count({ where: { timestamp: { gte: day30 } } }),
      prisma.errorLog.count({ where: { resolved: false } }),
      prisma.errorLog.groupBy({ by: ['level'], _count: true, where: { timestamp: { gte: day7 } } }),
      prisma.errorLog.groupBy({ by: ['category'], _count: true, where: { timestamp: { gte: day7 } }, orderBy: { _count: { category: 'desc' } }, take: 15 }),
      prisma.errorLog.groupBy({ by: ['statusCode'], _count: true, where: { timestamp: { gte: day7 } }, orderBy: { _count: { statusCode: 'desc' } } }),
      prisma.errorLog.groupBy({ by: ['message'], _count: true, where: { timestamp: { gte: day7 } }, orderBy: { _count: { message: 'desc' } }, take: 10 }),
      // Hourly counts for last 24h
      prisma.$queryRaw<{ hour: Date; count: bigint }[]>`
        SELECT date_trunc('hour', timestamp) as hour, count(*)::bigint as count
        FROM "error_logs"
        WHERE timestamp >= ${day1}
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY hour ASC
      `,
    ]);

    // Build hourly trend (fill in missing hours with 0)
    const hourlyTrend: { hour: string; count: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 60 * 60 * 1000);
      h.setMinutes(0, 0, 0);
      const hourKey = h.toISOString();
      const match = hourlyRaw.find(r => new Date(r.hour).getHours() === h.getHours() && new Date(r.hour).getDate() === h.getDate());
      hourlyTrend.push({ hour: hourKey, count: match ? Number(match.count) : 0 });
    }

    return res.json({
      totals: { last24h: count24h, last7d: count7d, last30d: count30d, unresolved },
      byLevel: byLevel.map(g => ({ level: g.level, count: g._count })),
      byCategory: byCategory.map(g => ({ category: g.category, count: g._count })),
      byStatusCode: byStatusCode.map(g => ({ statusCode: g.statusCode, count: g._count })),
      topMessages: topMessages.map(g => ({ message: g.message, count: g._count })),
      hourlyTrend,
    });
  } catch (error) {
    console.error('Error logs stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/error-logs/:id — Single log detail
// ---------------------------------------------------------------------------

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const log = await prisma.errorLog.findUnique({ where: { id: req.params.id } });
    if (!log) return res.status(404).json({ error: 'Error log not found' });
    return res.json({ log });
  } catch (error) {
    console.error('Error log detail error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/error-logs/:id/resolve
// ---------------------------------------------------------------------------

const resolveSchema = z.object({
  notes: z.string().optional(),
});

router.patch('/:id/resolve', validate(resolveSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const log = await prisma.errorLog.update({
      where: { id: req.params.id },
      data: {
        resolved: true,
        resolvedBy: req.user!.userId,
        resolvedAt: new Date(),
        notes: req.body.notes || null,
      },
    });
    return res.json({ log });
  } catch (error) {
    console.error('Resolve error log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/error-logs/:id/unresolve
// ---------------------------------------------------------------------------

router.patch('/:id/unresolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const log = await prisma.errorLog.update({
      where: { id: req.params.id },
      data: {
        resolved: false,
        resolvedBy: null,
        resolvedAt: null,
      },
    });
    return res.json({ log });
  } catch (error) {
    console.error('Unresolve error log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/error-logs/purge
// ---------------------------------------------------------------------------

const purgeSchema = z.object({
  olderThanDays: z.number().int().min(7, 'Minimum retention is 7 days'),
});

router.delete('/purge', validate(purgeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { olderThanDays } = req.body;
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.errorLog.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    return res.json({ deleted: result.count, olderThan: cutoff.toISOString() });
  } catch (error) {
    console.error('Purge error logs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
