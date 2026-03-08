import { Router, Response } from 'express';
import { db } from '../../lib/db';
import { eq, gte, count, sum, sql } from 'drizzle-orm';
import { users, characters, marketListings, guilds, towns, tradeTransactions, wars, elections } from '@database/tables';
import { handleDbError } from '../../lib/db-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

/**
 * GET /api/admin/stats/dashboard
 * Aggregate game stats for the admin dashboard.
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      [{ totalUsers }],
      [{ totalCharacters }],
      [{ totalGold }],
      [{ totalListings }],
      [{ totalGuilds }],
      [{ totalTowns }],
      raceCountsRaw,
      classCountsRaw,
      [{ recentTransactions }],
      [{ activeWars }],
      [{ activeElections }],
    ] = await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalCharacters: count() }).from(characters),
      db.select({ totalGold: sum(characters.gold) }).from(characters),
      db.select({ totalListings: count() }).from(marketListings),
      db.select({ totalGuilds: count() }).from(guilds),
      db.select({ totalTowns: count() }).from(towns),
      db.execute<{ race: string; cnt: string }>(sql`SELECT race, count(*)::text as cnt FROM characters GROUP BY race`),
      db.execute<{ class: string; cnt: string }>(sql`SELECT class, count(*)::text as cnt FROM characters GROUP BY class`),
      db.select({ recentTransactions: count() }).from(tradeTransactions).where(gte(tradeTransactions.timestamp, oneDayAgo.toISOString())),
      db.select({ activeWars: count() }).from(wars).where(eq(wars.status, 'ACTIVE')),
      db.select({ activeElections: count() }).from(elections).where(eq(elections.status, 'ACTIVE')),
    ]);

    return res.json({
      totalUsers,
      totalCharacters,
      totalGold: Number(totalGold) || 0,
      totalListings,
      totalGuilds,
      totalTowns,
      raceCounts: raceCountsRaw.rows.map((r) => ({ race: r.race, count: Number(r.cnt) })),
      classCounts: classCountsRaw.rows.map((c) => ({ class: c.class, count: Number(c.cnt) })),
      recentTransactions,
      activeWars,
      activeElections,
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-stats-dashboard', req)) return;
    logRouteError(req, 500, '[Admin] Stats dashboard error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
