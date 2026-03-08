import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { eq, and, like, asc, count, sql } from 'drizzle-orm';
import { regions, towns, townResources } from '@database/tables';
import { handleDbError } from '../../lib/db-errors';
import { logRouteError } from '../../lib/error-logger';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';

const router = Router();

// --- Schemas ---

const editTownSchema = z.object({
  population: z.number().int().min(0).optional(),
  description: z.string().optional(),
});

const editResourcesSchema = z.object({
  resources: z.array(
    z.object({
      id: z.string().min(1),
      abundance: z.number().int().min(0).max(100),
      respawnRate: z.number().min(0),
    })
  ),
});

/**
 * GET /api/admin/world/regions
 * All regions with town count.
 */
router.get('/regions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allRegions = await db.query.regions.findMany({
      orderBy: asc(regions.name),
      with: {
        towns: { columns: { id: true } },
      },
    });

    // Transform to match Prisma's _count format
    const transformed = allRegions.map(r => ({
      ...r,
      _count: { towns: r.towns.length },
      towns: undefined,
    }));

    return res.json(transformed);
  } catch (error) {
    if (handleDbError(error, res, 'admin-list-regions', req)) return;
    logRouteError(req, 500, '[Admin] Regions list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/world/towns
 * Paginated town list with filters.
 */
router.get('/towns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string, 10) || 20));
    const regionId = req.query.regionId as string | undefined;
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * pageSize;

    const conditions: ReturnType<typeof eq>[] = [];
    if (regionId) conditions.push(eq(towns.regionId, regionId));
    if (search) conditions.push(like(sql`lower(${towns.name})`, `%${search.toLowerCase()}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ total }]] = await Promise.all([
      db.query.towns.findMany({
        where,
        offset,
        limit: pageSize,
        orderBy: asc(towns.name),
        with: {
          region: { columns: { name: true } },
          character: { columns: { name: true } },
          characters_currentTownId: { columns: { id: true } },
          buildings: { columns: { id: true } },
        },
      }),
      db.select({ total: count() }).from(towns).where(where),
    ]);

    // Transform to match Prisma's shape
    const transformed = data.map(t => ({
      ...t,
      mayor: t.character,
      _count: {
        characters: t.characters_currentTownId.length,
        buildings: t.buildings.length,
      },
    }));

    return res.json({
      data: transformed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    if (handleDbError(error, res, 'admin-list-towns', req)) return;
    logRouteError(req, 500, '[Admin] Towns list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/world/towns/:id
 * Town detail with all related data.
 */
router.get('/towns/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, req.params.id),
      with: {
        region: true,
        character: { columns: { id: true, name: true } },
        townResources: true,
        buildings: true,
        townPolicies: true,
        townTreasuries: true,
      },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    // Reshape to match Prisma naming
    const result = {
      ...town,
      mayor: town.character,
      resources: town.townResources,
      townPolicy: town.townPolicies,
      treasury: town.townTreasuries,
    };

    return res.json(result);
  } catch (error) {
    if (handleDbError(error, res, 'admin-town-detail', req)) return;
    logRouteError(req, 500, '[Admin] Town detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/world/towns/:id
 * Edit town basic fields.
 */
router.patch('/towns/:id', validate(editTownSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const town = await db.query.towns.findFirst({ where: eq(towns.id, req.params.id) });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const [updated] = await db.update(towns)
      .set(req.body)
      .where(eq(towns.id, req.params.id))
      .returning();

    console.log(`[Admin] Town ${town.name} edited by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    if (handleDbError(error, res, 'admin-edit-town', req)) return;
    logRouteError(req, 500, '[Admin] Edit town error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/world/towns/:id/resources
 * Edit town resources.
 */
router.patch('/towns/:id/resources', validate(editResourcesSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const town = await db.query.towns.findFirst({ where: eq(towns.id, req.params.id) });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const { resources } = req.body as { resources: Array<{ id: string; abundance: number; respawnRate: number }> };

    const updates = await Promise.all(
      resources.map((r) =>
        db.update(townResources)
          .set({
            abundance: r.abundance,
            respawnRate: r.respawnRate,
          })
          .where(eq(townResources.id, r.id))
          .returning()
          .then(([row]) => row)
      )
    );

    console.log(`[Admin] Town ${town.name} resources edited (${resources.length} resources) by admin ${req.user!.userId}`);
    return res.json({ updated: updates });
  } catch (error) {
    if (handleDbError(error, res, 'admin-edit-town-resources', req)) return;
    logRouteError(req, 500, '[Admin] Edit town resources error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
