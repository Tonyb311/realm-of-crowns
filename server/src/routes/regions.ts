import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { eq, asc } from 'drizzle-orm';
import { regions, characters } from '@database/tables';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import {
  calculateTownDemographics,
  calculateRacialBonuses,
} from '../services/regional-mechanics';

const router = Router();

// =========================================================================
// GET /api/regions — list all regions
// =========================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const regionRows = await db.query.regions.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
        biome: true,
        levelMin: true,
        levelMax: true,
      },
      orderBy: asc(regions.name),
    });

    return res.json({ regions: regionRows });
  } catch (error) {
    if (handleDbError(error, res, 'list regions', req)) return;
    logRouteError(req, 500, 'List regions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// NOTE: All literal path routes MUST come before /:id to avoid param capture
// =========================================================================

// =========================================================================
// GET /api/regions/:id — region details
// =========================================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const region = await db.query.regions.findFirst({
      where: eq(regions.id, req.params.id),
      with: {
        towns: {
          columns: {
            id: true,
            name: true,
            population: true,
            biome: true,
            description: true,
          },
        },
        regionBorders_regionId1: {
          with: { region_regionId2: { columns: { id: true, name: true, biome: true } } },
        },
        regionBorders_regionId2: {
          with: { region_regionId1: { columns: { id: true, name: true, biome: true } } },
        },
      },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    // Combine borders from both directions
    const borders = [
      ...region.regionBorders_regionId1.map(b => ({
        id: b.id,
        type: b.type,
        neighborRegion: b.region_regionId2,
      })),
      ...region.regionBorders_regionId2.map(b => ({
        id: b.id,
        type: b.type,
        neighborRegion: b.region_regionId1,
      })),
    ];

    return res.json({
      region: {
        id: region.id,
        name: region.name,
        description: region.description,
        biome: region.biome,
        levelMin: region.levelMin,
        levelMax: region.levelMax,
        towns: region.towns,
        borders,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'get region details', req)) return;
    logRouteError(req, 500, 'Get region error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/regions/:id/demographics — racial demographics of all towns in region
// =========================================================================
router.get('/:id/demographics', async (req: Request, res: Response) => {
  try {
    const region = await db.query.regions.findFirst({
      where: eq(regions.id, req.params.id),
      with: {
        towns: { columns: { id: true, name: true } },
      },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    const demographics = await Promise.all(
      region.towns.map(town => calculateTownDemographics(town.id)),
    );

    return res.json({
      regionId: region.id,
      regionName: region.name,
      towns: demographics.filter(Boolean),
    });
  } catch (error) {
    if (handleDbError(error, res, 'get region demographics', req)) return;
    logRouteError(req, 500, 'Get region demographics error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/regions/:id/bonuses?characterId=X — bonuses/penalties for character
// =========================================================================
router.get('/:id/bonuses', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const characterId = req.query.characterId as string | undefined;

    let character;
    if (characterId) {
      character = await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
        columns: { id: true, race: true, currentTownId: true },
      });
    } else {
      character = await db.query.characters.findFirst({
        where: eq(characters.userId, req.user!.userId),
        columns: { id: true, race: true, currentTownId: true },
      });
    }

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const region = await db.query.regions.findFirst({
      where: eq(regions.id, req.params.id),
      with: { towns: { columns: { id: true, name: true } } },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    const townBonuses = await Promise.all(
      region.towns.map(async (town) => {
        const bonuses = await calculateRacialBonuses(character.race, town.id);
        return {
          townId: town.id,
          townName: town.name,
          ...bonuses,
        };
      }),
    );

    return res.json({
      regionId: region.id,
      regionName: region.name,
      characterRace: character.race,
      towns: townBonuses,
    });
  } catch (error) {
    if (handleDbError(error, res, 'get region bonuses', req)) return;
    logRouteError(req, 500, 'Get region bonuses error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
