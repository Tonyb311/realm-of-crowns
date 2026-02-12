import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

/**
 * GET /api/admin/population
 * Returns per-town population counts, ordered by population descending.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const populations = await prisma.character.groupBy({
      by: ['currentTownId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const townIds = populations
      .map(p => p.currentTownId)
      .filter((id): id is string => id !== null);

    const towns = await prisma.town.findMany({
      where: { id: { in: townIds } },
      select: { id: true, name: true, biome: true },
    });
    const townMap = new Map(towns.map(t => [t.id, t]));

    const result = populations
      .filter(p => p.currentTownId !== null)
      .map(p => ({
        town: townMap.get(p.currentTownId!),
        population: p._count.id,
      }));

    return res.json({
      populations: result,
      total: result.reduce((sum, r) => sum + r.population, 0),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-population', req)) return;
    logRouteError(req, 500, '[Admin] Population query error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
