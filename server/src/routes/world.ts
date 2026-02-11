import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { cache } from '../middleware/cache';
import { getGameTime } from '../services/race-environment';

const router = Router();

// ── Region color map ────────────────────────────────────────────────────────
const REGION_COLORS: Record<string, string> = {
  'Verdant Heartlands': '#4a7c59',
  'Silverwood Forest': '#7ba7a7',
  'Ironvault Mountains': '#8b7355',
  'The Crossroads': '#c4a265',
  'Ashenfang Wastes': '#8b4513',
  'Shadowmere Marshes': '#556b2f',
  'Frozen Reaches': '#6b8fa3',
  'The Suncoast': '#d4a574',
  'Twilight March': '#7b9e87',
  'Scarred Frontier': '#9e6b55',
  'Cogsworth Warrens': '#b8a88a',
  'Pelagic Depths': '#4682b4',
  'Thornwilds': '#6b8e23',
  'Glimmerveil': '#9b7dcf',
  'Skypeak Plateaus': '#a0a0c0',
  "Vel'Naris Underdark": '#483d8b',
  'Mistwood Glens': '#698b69',
  'The Foundry': '#808080',
  'The Confluence': '#cd853f',
  'Ashenmoor': '#696969',
};

// ── Town type from population ───────────────────────────────────────────────
function getTownType(population: number): string {
  if (population >= 10000) return 'capital';
  if (population >= 5000) return 'city';
  if (population >= 1000) return 'town';
  if (population >= 200) return 'village';
  return 'outpost';
}

// ── Static data cache key ───────────────────────────────────────────────────
const STATIC_CACHE_KEY = 'world:map:static';
const STATIC_CACHE_TTL = 3600; // 1 hour

// GET /api/world/map
router.get('/map', async (req, res) => {
  try {
    // ── Auth-aware: optionally decode JWT for player position ──────────
    let userId: string | null = null;
    const authHeader = (req as any).headers.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId: string;
        };
        userId = decoded.userId;
      } catch {
        // Invalid / expired token — continue without auth
      }
    }

    // ── Static data: try Redis cache first ────────────────────────────
    let staticData: {
      towns: any[];
      routes: any[];
      regions: any[];
    } | null = null;

    if (redis) {
      try {
        const cached = await redis.get(STATIC_CACHE_KEY);
        if (cached) {
          staticData = JSON.parse(cached);
        }
      } catch {
        // Redis read failed — fall through to DB
      }
    }

    if (!staticData) {
      // ── Fetch from database ───────────────────────────────────────
      const [dbRegions, dbTowns, dbRoutes] = await Promise.all([
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
            description: true,
            mapX: true,
            mapY: true,
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
            travelNodes: {
              select: {
                id: true,
                nodeIndex: true,
                name: true,
                description: true,
                terrain: true,
                dangerLevel: true,
                specialType: true,
                offsetX: true,
                offsetY: true,
              },
              orderBy: { nodeIndex: 'asc' },
            },
          },
        }),
      ]);

      // Build a town lookup for node position interpolation
      const townLookup = new Map<string, { mapX: number | null; mapY: number | null }>();
      for (const t of dbTowns) {
        townLookup.set(t.id, { mapX: t.mapX, mapY: t.mapY });
      }

      // Filter regions to only those with released towns
      const regionIdsWithTowns = new Set(dbTowns.map(t => t.regionId));
      const regions = dbRegions
        .filter(r => regionIdsWithTowns.has(r.id))
        .map(r => ({
          id: r.id,
          name: r.name,
          biome: r.biome,
          color: REGION_COLORS[r.name] || '#888888',
        }));

      // Transform towns
      const towns = dbTowns.map(t => ({
        id: t.id,
        name: t.name,
        type: getTownType(t.population),
        regionId: t.regionId,
        regionName: t.region.name,
        mapX: t.mapX,
        mapY: t.mapY,
        population: t.population,
        biome: t.biome,
        description: t.description,
      }));

      // Transform routes with interpolated node positions
      const routes = dbRoutes.map(route => {
        const fromTown = townLookup.get(route.fromTownId);
        const toTown = townLookup.get(route.toTownId);

        const nodes = route.travelNodes.map(node => {
          let mapX: number | null = null;
          let mapY: number | null = null;

          if (
            fromTown?.mapX != null && fromTown?.mapY != null &&
            toTown?.mapX != null && toTown?.mapY != null
          ) {
            const t = node.nodeIndex / (route.nodeCount + 1);
            mapX = fromTown.mapX + t * (toTown.mapX - fromTown.mapX) + node.offsetX;
            mapY = fromTown.mapY + t * (toTown.mapY - fromTown.mapY) + node.offsetY;
          }

          return {
            id: node.id,
            nodeIndex: node.nodeIndex,
            name: node.name,
            description: node.description,
            terrain: node.terrain,
            dangerLevel: node.dangerLevel,
            specialType: node.specialType,
            mapX,
            mapY,
          };
        });

        return {
          id: route.id,
          fromTownId: route.fromTownId,
          toTownId: route.toTownId,
          name: route.name,
          difficulty: route.difficulty,
          terrain: route.terrain,
          nodeCount: route.nodeCount,
          dangerLevel: route.dangerLevel,
          nodes,
        };
      });

      staticData = { towns, routes, regions };

      // ── Cache static data in Redis ──────────────────────────────────
      if (redis) {
        try {
          await redis.setex(STATIC_CACHE_KEY, STATIC_CACHE_TTL, JSON.stringify(staticData));
        } catch {
          // Redis write failed — continue without caching
        }
      }
    }

    // ── Dynamic data: always fresh ────────────────────────────────────

    // Player position (only if authenticated)
    let playerPosition: {
      type: 'town' | 'traveling' | null;
      townId?: string;
      routeId?: string;
      nodeIndex?: number;
      direction?: string;
    } = { type: null };

    let playerTownId: string | null = null;

    if (userId) {
      const character = await prisma.character.findFirst({
        where: { userId },
        select: {
          id: true,
          currentTownId: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (character) {
        // Check if traveling
        const travelState = await prisma.characterTravelState.findUnique({
          where: { characterId: character.id },
          select: {
            routeId: true,
            currentNodeIndex: true,
            direction: true,
            status: true,
          },
        });

        if (travelState && travelState.status === 'traveling') {
          playerPosition = {
            type: 'traveling',
            routeId: travelState.routeId,
            nodeIndex: travelState.currentNodeIndex,
            direction: travelState.direction,
          };
        } else if (character.currentTownId) {
          playerPosition = {
            type: 'town',
            townId: character.currentTownId,
          };
          playerTownId = character.currentTownId;
        }
      }
    }

    // Active travelers (all characters currently traveling)
    const activeTravelers = await prisma.characterTravelState.findMany({
      where: { status: 'traveling' },
      select: {
        characterId: true,
        routeId: true,
        currentNodeIndex: true,
        character: {
          select: { name: true },
        },
      },
    });

    const travelers = activeTravelers.map(t => ({
      characterId: t.characterId,
      characterName: t.character.name,
      routeId: t.routeId,
      nodeIndex: t.currentNodeIndex,
    }));

    // ── Annotate towns with isPlayerHere ───────────────────────────────
    const towns = staticData.towns.map(town => ({
      ...town,
      isPlayerHere: playerTownId != null && town.id === playerTownId,
    }));

    return res.json({
      towns,
      routes: staticData.routes,
      regions: staticData.regions,
      playerPosition,
      travelers,
    });
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
