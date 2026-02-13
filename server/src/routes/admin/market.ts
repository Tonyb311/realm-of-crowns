// ---------------------------------------------------------------------------
// Admin API — Market Administration Endpoints
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';
import { resolveAllTownAuctions, resolveAuctionCycle } from '../../lib/auction-engine';
import { prisma } from '../../lib/prisma';

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
      const town = await prisma.town.findUnique({
        where: { id: townId },
        select: { id: true, name: true },
      });

      if (!town) {
        return res.status(404).json({ error: 'Town not found' });
      }

      // Force-resolve by temporarily setting the cycle's startedAt far enough in the past
      const cycle = await prisma.auctionCycle.findFirst({
        where: { townId, status: 'open' },
        orderBy: { startedAt: 'desc' },
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
      await prisma.auctionCycle.update({
        where: { id: cycle.id },
        data: { startedAt: new Date(0) }, // epoch — ensures it's old enough
      });

      const result = await resolveAuctionCycle(townId);

      return res.json({
        message: `Force-resolved auction cycle for ${town.name}`,
        townId,
        townName: town.name,
        ...result,
      });
    } else {
      // Force-resolve all towns: backdate all open cycles
      await prisma.auctionCycle.updateMany({
        where: { status: 'open' },
        data: { startedAt: new Date(0) },
      });

      const result = await resolveAllTownAuctions();

      return res.json({
        message: 'Force-resolved auction cycles for all towns',
        ...result,
      });
    }
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-market-resolve', req)) return;
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
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const cycles = await prisma.auctionCycle.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(townId ? { townId } : {}),
      },
      include: {
        town: { select: { id: true, name: true } },
        _count: {
          select: {
            orders: true,
            transactions: true,
            listings: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
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
        counts: c._count,
      })),
      total: cycles.length,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-market-cycles', req)) return;
    logRouteError(req, 500, '[Admin] Market cycles error', error);
    return res.status(500).json({ error: 'Failed to fetch auction cycles' });
  }
});

export default router;
