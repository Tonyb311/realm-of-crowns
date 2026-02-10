import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';
import { Prisma } from '@prisma/client';

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
router.get('/regions', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { towns: true } },
      },
    });

    return res.json(regions);
  } catch (error) {
    console.error('[Admin] Regions list error:', error);
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
    const skip = (page - 1) * pageSize;

    const where: Prisma.TownWhereInput = {
      ...(regionId ? { regionId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.town.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          region: { select: { name: true } },
          mayor: { select: { name: true } },
          _count: { select: { characters: true, buildings: true } },
        },
      }),
      prisma.town.count({ where }),
    ]);

    return res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[Admin] Towns list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/world/towns/:id
 * Town detail with all related data.
 */
router.get('/towns/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const town = await prisma.town.findUnique({
      where: { id: req.params.id },
      include: {
        region: true,
        mayor: { select: { id: true, name: true } },
        resources: true,
        buildings: true,
        townPolicy: true,
        treasury: true,
      },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    return res.json(town);
  } catch (error) {
    console.error('[Admin] Town detail error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/world/towns/:id
 * Edit town basic fields.
 */
router.patch('/towns/:id', validate(editTownSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const town = await prisma.town.findUnique({ where: { id: req.params.id } });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const updated = await prisma.town.update({
      where: { id: req.params.id },
      data: req.body,
    });

    console.log(`[Admin] Town ${town.name} edited by admin ${req.user!.userId}`);
    return res.json(updated);
  } catch (error) {
    console.error('[Admin] Edit town error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/world/towns/:id/resources
 * Edit town resources.
 */
router.patch('/towns/:id/resources', validate(editResourcesSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const town = await prisma.town.findUnique({ where: { id: req.params.id } });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const { resources } = req.body as { resources: Array<{ id: string; abundance: number; respawnRate: number }> };

    const updates = await Promise.all(
      resources.map((r) =>
        prisma.townResource.update({
          where: { id: r.id },
          data: {
            abundance: r.abundance,
            respawnRate: r.respawnRate,
          },
        })
      )
    );

    console.log(`[Admin] Town ${town.name} resources edited (${resources.length} resources) by admin ${req.user!.userId}`);
    return res.json({ updated: updates });
  } catch (error) {
    console.error('[Admin] Edit town resources error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
