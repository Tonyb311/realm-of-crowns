import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { processTravelTick } from '../../lib/travel-tick';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

/**
 * POST /api/admin/travel/trigger-tick
 * Manually trigger a travel tick (advances all travelers by 1 node).
 * Useful for testing and debugging without waiting for the cron schedule.
 */
router.post('/trigger-tick', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await processTravelTick();

    return res.json({
      success: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-travel-trigger-tick', req)) return;
    logRouteError(req, 500, '[Admin] Travel trigger-tick error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/travel/overview
 * Overview of all active travelers: counts, grouped by route, and by node index.
 */
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch all active solo travelers
    const soloTravelers = await prisma.characterTravelState.findMany({
      where: { status: 'traveling' },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            fromTownId: true,
            toTownId: true,
            fromTown: { select: { name: true } },
            toTown: { select: { name: true } },
          },
        },
      },
    });

    // Fetch all active group travel states
    const groupStates = await prisma.groupTravelState.findMany({
      where: { status: 'traveling' },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            fromTownId: true,
            toTownId: true,
            fromTown: { select: { name: true } },
            toTown: { select: { name: true } },
          },
        },
        group: {
          include: {
            members: { select: { characterId: true } },
          },
        },
      },
    });

    const soloTravelerCount = soloTravelers.length;
    const groupCount = groupStates.length;

    // Group solo travelers by route
    const byRouteMap = new Map<string, {
      routeId: string;
      routeName: string;
      fromTown: string;
      toTown: string;
      travelerCount: number;
    }>();

    for (const t of soloTravelers) {
      const key = t.route.id;
      const existing = byRouteMap.get(key);
      if (existing) {
        existing.travelerCount++;
      } else {
        byRouteMap.set(key, {
          routeId: t.route.id,
          routeName: t.route.name,
          fromTown: t.route.fromTown.name,
          toTown: t.route.toTown.name,
          travelerCount: 1,
        });
      }
    }

    // Include group members in the per-route counts
    for (const gs of groupStates) {
      const key = gs.route.id;
      const memberCount = gs.group.members.length;
      const existing = byRouteMap.get(key);
      if (existing) {
        existing.travelerCount += memberCount;
      } else {
        byRouteMap.set(key, {
          routeId: gs.route.id,
          routeName: gs.route.name,
          fromTown: gs.route.fromTown.name,
          toTown: gs.route.toTown.name,
          travelerCount: memberCount,
        });
      }
    }

    const travelersByRoute = Array.from(byRouteMap.values())
      .sort((a, b) => b.travelerCount - a.travelerCount);

    // Group by current node index
    const byNodeMap = new Map<number, number>();

    for (const t of soloTravelers) {
      byNodeMap.set(t.currentNodeIndex, (byNodeMap.get(t.currentNodeIndex) || 0) + 1);
    }

    for (const gs of groupStates) {
      const memberCount = gs.group.members.length;
      byNodeMap.set(gs.currentNodeIndex, (byNodeMap.get(gs.currentNodeIndex) || 0) + memberCount);
    }

    const travelersByNodeIndex = Array.from(byNodeMap.entries())
      .map(([nodeIndex, count]) => ({ nodeIndex, count }))
      .sort((a, b) => a.nodeIndex - b.nodeIndex);

    return res.json({
      soloTravelerCount,
      groupCount,
      travelersByRoute,
      travelersByNodeIndex,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-travel-overview', req)) return;
    logRouteError(req, 500, '[Admin] Travel overview error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
