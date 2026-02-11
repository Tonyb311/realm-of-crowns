import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

/**
 * GET /api/admin/stats/dashboard
 * Aggregate game stats for the admin dashboard.
 */
router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalCharacters,
      totalGoldResult,
      totalListings,
      totalGuilds,
      totalTowns,
      raceCounts,
      classCounts,
      recentTransactions,
      activeWars,
      activeElections,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.character.count(),
      prisma.character.aggregate({ _sum: { gold: true } }),
      prisma.marketListing.count(),
      prisma.guild.count(),
      prisma.town.count(),
      prisma.character.groupBy({ by: ['race'], _count: { race: true } }),
      prisma.character.groupBy({ by: ['class'], _count: { class: true } }),
      prisma.tradeTransaction.count({ where: { timestamp: { gte: oneDayAgo } } }),
      prisma.war.count({ where: { status: 'ACTIVE' } }),
      prisma.election.count({ where: { status: 'ACTIVE' } }),
    ]);

    return res.json({
      totalUsers,
      totalCharacters,
      totalGold: totalGoldResult._sum.gold ?? 0,
      totalListings,
      totalGuilds,
      totalTowns,
      raceCounts: raceCounts.map((r) => ({ race: r.race, count: r._count.race })),
      classCounts: classCounts.map((c) => ({ class: c.class, count: c._count.class })),
      recentTransactions,
      activeWars,
      activeElections,
    });
  } catch (error) {
    console.error('[Admin] Stats dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
