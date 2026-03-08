import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { eq, and, or, gte, lte, lt, like, inArray, desc, count, sql } from 'drizzle-orm';
import { errorLogs } from '@database/tables';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';
import type { LogLevel } from '@shared/enums';
import { logRouteError } from '../../lib/error-logger';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/admin/error-logs — Paginated, filterable list
// ---------------------------------------------------------------------------

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    if (req.query.level) {
      const levels = (req.query.level as string).split(',') as LogLevel[];
      conditions.push(inArray(errorLogs.level, levels));
    }
    if (req.query.category) {
      conditions.push(eq(errorLogs.category, req.query.category as string));
    }
    if (req.query.statusCode) {
      conditions.push(eq(errorLogs.statusCode, parseInt(req.query.statusCode as string, 10)));
    }
    if (req.query.resolved !== undefined) {
      conditions.push(eq(errorLogs.resolved, req.query.resolved === 'true'));
    }
    if (req.query.userId) {
      conditions.push(eq(errorLogs.userId, req.query.userId as string));
    }
    if (req.query.characterId) {
      conditions.push(eq(errorLogs.characterId, req.query.characterId as string));
    }
    if (req.query.startDate) {
      conditions.push(gte(errorLogs.timestamp, new Date(req.query.startDate as string).toISOString()));
    }
    if (req.query.endDate) {
      conditions.push(lte(errorLogs.timestamp, new Date(req.query.endDate as string).toISOString()));
    }
    if (req.query.search) {
      const search = `%${req.query.search as string}%`;
      conditions.push(
        or(
          like(sql`lower(${errorLogs.message})`, search.toLowerCase()),
          like(sql`lower(${errorLogs.detail})`, search.toLowerCase()),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, [{ total }]] = await Promise.all([
      db.query.errorLogs.findMany({
        where,
        orderBy: desc(errorLogs.timestamp),
        offset,
        limit,
      }),
      db.select({ total: count() }).from(errorLogs).where(where),
    ]);

    return res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logRouteError(req, 500, 'Error logs list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/error-logs/stats — Dashboard summary
// ---------------------------------------------------------------------------

router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      [{ count24h }],
      [{ count7d }],
      [{ count30d }],
      [{ unresolvedCount }],
      byLevelRaw,
      byCategoryRaw,
      byStatusCodeRaw,
      topMessagesRaw,
      hourlyRaw,
    ] = await Promise.all([
      db.select({ count24h: count() }).from(errorLogs).where(gte(errorLogs.timestamp, day1.toISOString())),
      db.select({ count7d: count() }).from(errorLogs).where(gte(errorLogs.timestamp, day7.toISOString())),
      db.select({ count30d: count() }).from(errorLogs).where(gte(errorLogs.timestamp, day30.toISOString())),
      db.select({ unresolvedCount: count() }).from(errorLogs).where(eq(errorLogs.resolved, false)),
      db.execute<{ level: string; cnt: string }>(sql`
        SELECT level, count(*)::text as cnt FROM error_logs WHERE timestamp >= ${day7.toISOString()} GROUP BY level
      `),
      db.execute<{ category: string; cnt: string }>(sql`
        SELECT category, count(*)::text as cnt FROM error_logs WHERE timestamp >= ${day7.toISOString()} GROUP BY category ORDER BY count(*) DESC LIMIT 15
      `),
      db.execute<{ status_code: number; cnt: string }>(sql`
        SELECT status_code, count(*)::text as cnt FROM error_logs WHERE timestamp >= ${day7.toISOString()} GROUP BY status_code ORDER BY count(*) DESC
      `),
      db.execute<{ message: string; cnt: string }>(sql`
        SELECT message, count(*)::text as cnt FROM error_logs WHERE timestamp >= ${day7.toISOString()} GROUP BY message ORDER BY count(*) DESC LIMIT 10
      `),
      db.execute<{ hour: string; cnt: string }>(sql`
        SELECT date_trunc('hour', timestamp::timestamp) as hour, count(*)::text as cnt
        FROM error_logs
        WHERE timestamp >= ${day1.toISOString()}
        GROUP BY date_trunc('hour', timestamp::timestamp)
        ORDER BY hour ASC
      `),
    ]);

    // Build hourly trend (fill in missing hours with 0)
    const hourlyTrend: { hour: string; count: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 60 * 60 * 1000);
      h.setMinutes(0, 0, 0);
      const hourKey = h.toISOString();
      const match = hourlyRaw.rows.find(r => new Date(r.hour).getHours() === h.getHours() && new Date(r.hour).getDate() === h.getDate());
      hourlyTrend.push({ hour: hourKey, count: match ? Number(match.cnt) : 0 });
    }

    return res.json({
      totals: { last24h: count24h, last7d: count7d, last30d: count30d, unresolved: unresolvedCount },
      byLevel: byLevelRaw.rows.map(g => ({ level: g.level, count: Number(g.cnt) })),
      byCategory: byCategoryRaw.rows.map(g => ({ category: g.category, count: Number(g.cnt) })),
      byStatusCode: byStatusCodeRaw.rows.map(g => ({ statusCode: g.status_code, count: Number(g.cnt) })),
      topMessages: topMessagesRaw.rows.map(g => ({ message: g.message, count: Number(g.cnt) })),
      hourlyTrend,
    });
  } catch (error) {
    logRouteError(req, 500, 'Error logs stats error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/error-logs/:id — Single log detail
// ---------------------------------------------------------------------------

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const log = await db.query.errorLogs.findFirst({ where: eq(errorLogs.id, req.params.id) });
    if (!log) return res.status(404).json({ error: 'Error log not found' });
    return res.json({ log });
  } catch (error) {
    logRouteError(req, 500, 'Error log detail error', error);
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
    const [log] = await db.update(errorLogs)
      .set({
        resolved: true,
        resolvedBy: req.user!.userId,
        resolvedAt: new Date().toISOString(),
        notes: req.body.notes || null,
      })
      .where(eq(errorLogs.id, req.params.id))
      .returning();
    if (!log) return res.status(404).json({ error: 'Error log not found' });
    return res.json({ log });
  } catch (error) {
    logRouteError(req, 500, 'Resolve error log error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/error-logs/:id/unresolve
// ---------------------------------------------------------------------------

router.patch('/:id/unresolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [log] = await db.update(errorLogs)
      .set({
        resolved: false,
        resolvedBy: null,
        resolvedAt: null,
      })
      .where(eq(errorLogs.id, req.params.id))
      .returning();
    if (!log) return res.status(404).json({ error: 'Error log not found' });
    return res.json({ log });
  } catch (error) {
    logRouteError(req, 500, 'Unresolve error log error', error);
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

    const deleted = await db.delete(errorLogs)
      .where(lt(errorLogs.timestamp, cutoff.toISOString()))
      .returning();

    return res.json({ deleted: deleted.length, olderThan: cutoff.toISOString() });
  } catch (error) {
    logRouteError(req, 500, 'Purge error logs error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
