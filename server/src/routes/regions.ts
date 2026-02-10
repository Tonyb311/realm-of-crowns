import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
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
    const regions = await prisma.region.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        biome: true,
        levelMin: true,
        levelMax: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ regions });
  } catch (error) {
    console.error('List regions error:', error);
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
          },
        },
        bordersA: {
          include: { region2: { select: { id: true, name: true, biome: true } } },
        },
        bordersB: {
          include: { region1: { select: { id: true, name: true, biome: true } } },
        },
      },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    // Combine borders from both directions
    const borders = [
      ...region.bordersA.map(b => ({
        id: b.id,
        type: b.type,
        neighborRegion: b.region2,
      })),
      ...region.bordersB.map(b => ({
        id: b.id,
        type: b.type,
        neighborRegion: b.region1,
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
    console.error('Get region error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/regions/:id/demographics — racial demographics of all towns in region
// =========================================================================
router.get('/:id/demographics', async (req: Request, res: Response) => {
  try {
    const region = await prisma.region.findUnique({
      where: { id: req.params.id },
      include: {
        towns: { select: { id: true, name: true } },
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
    console.error('Get region demographics error:', error);
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
      character = await prisma.character.findUnique({
        where: { id: characterId },
        select: { id: true, race: true, currentTownId: true },
      });
    } else {
      character = await prisma.character.findFirst({
        where: { userId: req.user!.userId },
        select: { id: true, race: true, currentTownId: true },
      });
    }

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const region = await prisma.region.findUnique({
      where: { id: req.params.id },
      include: { towns: { select: { id: true, name: true } } },
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
    console.error('Get region bonuses error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
