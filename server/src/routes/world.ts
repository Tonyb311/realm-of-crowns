import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { cache } from '../middleware/cache';
import { getGameTime } from '../services/race-environment';

const router = Router();

// GET /api/world/map
router.get('/map', cache(300), async (req, res) => {
  try {
    const [regions, towns, routes] = await Promise.all([
      prisma.region.findMany({
        select: { id: true, name: true, biome: true },
      }),
      prisma.town.findMany({
        where: { isReleased: true },
        select: {
          id: true,
          name: true,
          regionId: true,
          population: true,
          biome: true,
          features: true,
          region: { select: { name: true } },
        },
      }),
      prisma.travelRoute.findMany({
        where: { isReleased: true },
        select: {
          id: true,
          name: true,
          fromTownId: true,
          toTownId: true,
          nodeCount: true,
          difficulty: true,
          dangerLevel: true,
          terrain: true,
          isReleased: true,
        },
      }),
    ]);

    // Filter regions to only those with released towns
    const regionIdsWithTowns = new Set(towns.map(t => t.regionId));
    const filteredRegions = regions.filter(r => regionIdsWithTowns.has(r.id));

    const townsWithRegionName = towns.map((t) => ({
      id: t.id,
      name: t.name,
      regionId: t.regionId,
      regionName: t.region.name,
      population: t.population,
      biome: t.biome,
      coordinates: (t.features as any)?.coordinates ?? null,
    }));

    return res.json({ regions: filteredRegions, towns: townsWithRegionName, routes });
  } catch (error) {
    if (handlePrismaError(error, res, 'world map', req)) return;
    logRouteError(req, 500, 'World map error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/world/regions
router.get('/regions', cache(300), async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      include: {
        _count: { select: { towns: true } },
      },
    });

    const result = regions.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      biome: r.biome,
      levelMin: r.levelMin,
      levelMax: r.levelMax,
      townCount: r._count.towns,
    }));

    return res.json({ regions: result });
  } catch (error) {
    if (handlePrismaError(error, res, 'get regions', req)) return;
    logRouteError(req, 500, 'Get regions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/world/regions/:id
router.get('/regions/:id', async (req, res) => {
  try {
    const region = await prisma.region.findUnique({
      where: { id: req.params.id },
      include: {
        towns: {
          select: {
            id: true,
            name: true,
            population: true,
            biome: true,
            description: true,
            features: true,
          },
        },
      },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    return res.json({ region });
  } catch (error) {
    if (handlePrismaError(error, res, 'get region', req)) return;
    logRouteError(req, 500, 'Get region error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/world/time — current game time (day/night cycle)
router.get('/time', (req, res) => {
  try {
    const gameTime = getGameTime();

    return res.json({
      gameTime: {
        hour: gameTime.gameHour,
        minute: gameTime.gameMinute,
        isDaytime: gameTime.isDaytime,
        period: gameTime.period,
        formatted: `${String(gameTime.gameHour).padStart(2, '0')}:${String(gameTime.gameMinute).padStart(2, '0')}`,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get game time', req)) return;
    logRouteError(req, 500, 'Get game time error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
