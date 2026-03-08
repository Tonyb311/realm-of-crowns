import { Router, Response } from 'express';
import { db } from '../../lib/db';
import { eq, inArray, count, sql } from 'drizzle-orm';
import { characters, towns } from '@database/tables';
import { handleDbError } from '../../lib/db-errors';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

/**
 * GET /api/admin/population
 * Returns per-town population counts, ordered by population descending.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const populations = await db
      .select({
        currentTownId: characters.currentTownId,
        count: count(characters.id),
      })
      .from(characters)
      .groupBy(characters.currentTownId)
      .orderBy(sql`count(${characters.id}) desc`);

    const townIds = populations
      .map(p => p.currentTownId)
      .filter((id): id is string => id !== null);

    const townList = townIds.length > 0
      ? await db.query.towns.findMany({
          where: inArray(towns.id, townIds),
          columns: { id: true, name: true, biome: true },
        })
      : [];
    const townMap = new Map(townList.map(t => [t.id, t]));

    const result = populations
      .filter(p => p.currentTownId !== null)
      .map(p => ({
        town: townMap.get(p.currentTownId!),
        population: p.count,
      }));

    return res.json({
      populations: result,
      total: result.reduce((sum, r) => sum + r.population, 0),
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-population', req)) return;
    logRouteError(req, 500, '[Admin] Population query error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
