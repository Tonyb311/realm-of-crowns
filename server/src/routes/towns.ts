import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { cache } from '../middleware/cache';

const router = Router();

// GET /api/towns/:id
router.get('/:id', cache(120), async (req, res) => {
  try {
    const town = await prisma.town.findUnique({
      where: { id: req.params.id },
      include: {
        region: { select: { id: true, name: true, biome: true } },
        resources: {
          select: {
            id: true,
            resourceType: true,
            abundance: true,
            respawnRate: true,
          },
        },
        buildings: {
          select: {
            id: true,
            type: true,
            name: true,
            level: true,
            owner: { select: { id: true, name: true } },
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            race: true,
            level: true,
          },
        },
      },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    return res.json({ town });
  } catch (error) {
    console.error('Get town error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/towns/:id/resources
router.get('/:id/resources', async (req, res) => {
  try {
    const town = await prisma.town.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const townResources = await prisma.townResource.findMany({
      where: { townId: req.params.id },
      select: {
        id: true,
        resourceType: true,
        abundance: true,
        respawnRate: true,
      },
    });

    // Map abundance number to label and include resource name
    const resources = townResources.map((tr) => {
      let abundanceLabel = 'NORMAL';
      if (tr.abundance >= 90) abundanceLabel = 'ABUNDANT';
      else if (tr.abundance >= 70) abundanceLabel = 'HIGH';
      else if (tr.abundance >= 50) abundanceLabel = 'MODERATE';
      else if (tr.abundance >= 30) abundanceLabel = 'LOW';
      else if (tr.abundance >= 10) abundanceLabel = 'SCARCE';
      else abundanceLabel = 'DEPLETED';

      return {
        id: tr.id,
        resourceType: tr.resourceType,
        resourceName: tr.resourceType.charAt(0) + tr.resourceType.slice(1).toLowerCase().replace(/_/g, ' '),
        abundance: abundanceLabel,
        abundanceValue: tr.abundance,
      };
    });

    return res.json(resources);
  } catch (error) {
    console.error('Get town resources error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/towns/:id/buildings
router.get('/:id/buildings', async (req, res) => {
  try {
    const town = await prisma.town.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const buildings = await prisma.building.findMany({
      where: { townId: req.params.id },
      select: {
        id: true,
        type: true,
        name: true,
        level: true,
        owner: { select: { id: true, name: true } },
      },
    });

    return res.json({ buildings });
  } catch (error) {
    console.error('Get town buildings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/towns/:id/characters
router.get('/:id/characters', async (req, res) => {
  try {
    const town = await prisma.town.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const characters = await prisma.character.findMany({
      where: { currentTownId: req.params.id },
      select: {
        id: true,
        name: true,
        race: true,
        level: true,
      },
    });

    return res.json({ characters });
  } catch (error) {
    console.error('Get town characters error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
