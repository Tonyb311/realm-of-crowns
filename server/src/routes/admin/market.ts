// ---------------------------------------------------------------------------
// Admin API — Market Administration Endpoints
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { db } from '../../lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { towns, auctionCycles } from '@database/tables';
import { handleDbError } from '../../lib/db-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';
import { resolveAllTownAuctions, resolveAuctionCycle } from '../../lib/auction-engine';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/admin/market/resolve — Force-resolve auction cycles
// Query param: ?townId=xxx (optional — resolves specific town, or all towns)
// ---------------------------------------------------------------------------

router.post('/resolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const townId = req.query.townId as string | undefined;

    if (townId) {
      // Validate town exists
      const town = await db.query.towns.findFirst({
        where: eq(towns.id, townId),
        columns: { id: true, name: true },
      });

      if (!town) {
        return res.status(404).json({ error: 'Town not found' });
      }

      // Force-resolve by temporarily setting the cycle's startedAt far enough in the past
      const cycle = await db.query.auctionCycles.findFirst({
        where: and(eq(auctionCycles.townId, townId), eq(auctionCycles.status, 'open')),
        orderBy: desc(auctionCycles.startedAt),
      });

      if (!cycle) {
        return res.json({
          message: `No open auction cycle for ${town.name}`,
          townId,
          townName: town.name,
          ordersProcessed: 0,
          transactionsCompleted: 0,
        });
      }

      // Temporarily backdate the cycle to force resolution
      await db.update(auctionCycles)
        .set({ startedAt: new Date(0).toISOString() })
        .where(eq(auctionCycles.id, cycle.id));

      const result = await resolveAuctionCycle(townId);

      return res.json({
        message: `Force-resolved auction cycle for ${town.name}`,
        townId,
        townName: town.name,
        ...result,
      });
    } else {
      // Force-resolve all towns: backdate all open cycles
      await db.update(auctionCycles)
        .set({ startedAt: new Date(0).toISOString() })
        .where(eq(auctionCycles.status, 'open'));

      const result = await resolveAllTownAuctions();

      return res.json({
        message: 'Force-resolved auction cycles for all towns',
        ...result,
      });
    }
  } catch (error) {
    if (handleDbError(error, res, 'admin-market-resolve', req)) return;
    logRouteError(req, 500, '[Admin] Market resolve error', error);
    return res.status(500).json({ error: 'Failed to resolve auction cycles' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/market/cycles — View all auction cycles
// ---------------------------------------------------------------------------

router.get('/cycles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const townId = req.query.townId as string | undefined;
    const limitVal = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(auctionCycles.status, status));
    if (townId) conditions.push(eq(auctionCycles.townId, townId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const cycles = await db.query.auctionCycles.findMany({
      where,
      with: {
        town: { columns: { id: true, name: true } },
        marketListings: { columns: { id: true } },
        marketBuyOrders: { columns: { id: true } },
        tradeTransactions: { columns: { id: true } },
      },
      orderBy: desc(auctionCycles.startedAt),
      limit: limitVal,
    });

    return res.json({
      cycles: cycles.map(c => ({
        id: c.id,
        townId: c.townId,
        townName: c.town.name,
        cycleNumber: c.cycleNumber,
        status: c.status,
        startedAt: c.startedAt,
        resolvedAt: c.resolvedAt,
        ordersProcessed: c.ordersProcessed,
        transactionsCompleted: c.transactionsCompleted,
        counts: {
          orders: c.marketBuyOrders.length,
          transactions: c.tradeTransactions.length,
          listings: c.marketListings.length,
        },
      })),
      total: cycles.length,
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-market-cycles', req)) return;
    logRouteError(req, 500, '[Admin] Market cycles error', error);
    return res.status(500).json({ error: 'Failed to fetch auction cycles' });
  }
});

export default router;
