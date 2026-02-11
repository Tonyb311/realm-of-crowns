import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { handlePrismaError } from '../../lib/prisma-errors';
import { logRouteError } from '../../lib/error-logger';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types/express';
import {
  getContentReleaseMap,
  releaseContent,
  unreleaseContent,
  bulkRelease,
} from '../../lib/content-release';
import { RaceRegistry } from '@shared/data/races';

const router = Router();

// --- Schemas ---

const releaseNotesSchema = z.object({
  notes: z.string().optional(),
});

const bulkReleaseSchema = z.object({
  items: z.array(
    z.object({
      contentType: z.string().min(1),
      contentId: z.string().min(1),
    })
  ).min(1),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/content-release
 * Full content release map (races + towns with stats).
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const map = await getContentReleaseMap();
    return res.json(map);
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-content-release-map', req)) return;
    logRouteError(req, 500, '[Admin] Content release map error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/content-release/plan
 * Release plan view — unreleased content ordered by releaseOrder with dependency info.
 */
router.get('/plan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch unreleased races from contentRelease table
    const unreleasedRaces = await prisma.contentRelease.findMany({
      where: { contentType: 'race', isReleased: false },
      orderBy: [{ releaseOrder: 'asc' }, { contentName: 'asc' }],
    });

    // Fetch unreleased towns
    const unreleasedTowns = await prisma.town.findMany({
      where: { isReleased: false },
      orderBy: [{ releaseOrder: 'asc' }, { name: 'asc' }],
      include: {
        region: { select: { id: true, name: true } },
      },
    });

    // Build a set of unreleased race keys for dependency lookup
    const unreleasedRaceKeys = new Set(unreleasedRaces.map(r => r.contentId));

    // For each unreleased town, check if it is a starting town for any unreleased race
    const townDependencies: Record<string, string[]> = {};
    for (const town of unreleasedTowns) {
      const dependentRaces: string[] = [];
      for (const raceKey of unreleasedRaceKeys) {
        const raceDef = RaceRegistry[raceKey];
        if (raceDef && raceDef.startingTowns.includes(town.name)) {
          dependentRaces.push(raceDef.name);
        }
      }
      if (dependentRaces.length > 0) {
        townDependencies[town.id] = dependentRaces;
      }
    }

    const racePlan = unreleasedRaces.map(r => ({
      contentType: 'race' as const,
      contentId: r.contentId,
      contentName: r.contentName,
      tier: r.tier,
      releaseOrder: r.releaseOrder,
    }));

    const townPlan = unreleasedTowns.map(t => ({
      contentType: 'town' as const,
      contentId: t.id,
      contentName: t.name,
      regionName: t.region.name,
      releaseOrder: t.releaseOrder,
      isStartingTownFor: townDependencies[t.id] ?? [],
    }));

    return res.json({ races: racePlan, towns: townPlan });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-content-release-plan', req)) return;
    logRouteError(req, 500, '[Admin] Content release plan error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/content-release/:contentType/:contentId/release
 * Release a single content item.
 */
router.patch('/:contentType/:contentId/release', validate(releaseNotesSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contentType, contentId } = req.params;

    if (contentType !== 'race' && contentType !== 'town') {
      return res.status(400).json({ error: 'contentType must be "race" or "town"' });
    }

    const { notes } = req.body as { notes?: string };
    await releaseContent(contentType, contentId, notes);

    return res.json({ success: true, contentType, contentId });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-content-release', req)) return;
    logRouteError(req, 500, '[Admin] Content release error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/content-release/:contentType/:contentId/unrelease
 * Unrelease a single content item with safety checks.
 */
router.patch('/:contentType/:contentId/unrelease', validate(releaseNotesSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contentType, contentId } = req.params;

    if (contentType !== 'race' && contentType !== 'town') {
      return res.status(400).json({ error: 'contentType must be "race" or "town"' });
    }

    const { notes } = req.body as { notes?: string };
    const result = await unreleaseContent(contentType, contentId, notes);

    if (!result.success) {
      return res.status(409).json({ error: result.error });
    }

    return res.json({ success: true, contentType, contentId });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-content-unrelease', req)) return;
    logRouteError(req, 500, '[Admin] Content unrelease error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/content-release/bulk-release
 * Bulk release multiple content items at once.
 */
router.post('/bulk-release', validate(bulkReleaseSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items, notes } = req.body as {
      items: Array<{ contentType: string; contentId: string }>;
      notes?: string;
    };

    // Group items by contentType
    const grouped: Record<string, string[]> = {};
    for (const item of items) {
      if (!grouped[item.contentType]) {
        grouped[item.contentType] = [];
      }
      grouped[item.contentType].push(item.contentId);
    }

    let totalCount = 0;
    for (const [contentType, ids] of Object.entries(grouped)) {
      const result = await bulkRelease(contentType, ids, notes);
      totalCount += result.released;
    }

    return res.json({ released: totalCount });
  } catch (error) {
    if (handlePrismaError(error, res, 'admin-content-bulk-release', req)) return;
    logRouteError(req, 500, '[Admin] Content bulk release error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
