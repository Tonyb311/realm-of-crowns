import { Router } from 'express';
import { db } from '../lib/db';
import { eq } from 'drizzle-orm';
import { towns, townResources, buildings, characters } from '@database/tables';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { cache } from '../middleware/cache';

const router = Router();

// GET /api/towns/:id
router.get('/:id', cache(120), async (req, res) => {
  try {
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, req.params.id),
      with: {
        region: { columns: { id: true, name: true, biome: true } },
        townTreasuries: { columns: { taxRate: true } },
        townResources: {
          columns: {
            id: true,
            resourceType: true,
            abundance: true,
            respawnRate: true,
          },
        },
        buildings: {
          columns: {
            id: true,
            type: true,
            name: true,
            level: true,
          },
          with: {
            character: { columns: { id: true, name: true } },
          },
        },
        characters_currentTownId: {
          columns: {
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

    // Map buildings to include owner as nested object (matching Prisma shape)
    const buildingsWithOwner = town.buildings.map(b => ({
      id: b.id,
      type: b.type,
      name: b.name,
      level: b.level,
      owner: b.character ? { id: b.character.id, name: b.character.name } : null,
    }));

    const treasury = town.townTreasuries[0] ?? null;
    const townCharacters = town.characters_currentTownId;

    // P1 #24: Include taxRate at top level for easy client access
    // Override static seed population with live character count
    return res.json({
      town: {
        ...town,
        treasury,
        resources: town.townResources,
        buildings: buildingsWithOwner,
        characters: townCharacters,
        taxRate: treasury?.taxRate ?? 0.10,
        population: townCharacters.length,
        // Remove Drizzle relation names from response
        townTreasuries: undefined,
        townResources: undefined,
        characters_currentTownId: undefined,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'get town', req)) return;
    logRouteError(req, 500, 'Get town error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/towns/:id/resources
router.get('/:id/resources', async (req, res) => {
  try {
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, req.params.id),
      columns: { id: true },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const townResourceRows = await db.select({
      id: townResources.id,
      resourceType: townResources.resourceType,
      abundance: townResources.abundance,
      respawnRate: townResources.respawnRate,
    }).from(townResources).where(eq(townResources.townId, req.params.id));

    // Map abundance number to label and include resource name
    const resources = townResourceRows.map((tr) => {
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
    if (handleDbError(error, res, 'get town resources', req)) return;
    logRouteError(req, 500, 'Get town resources error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/towns/:id/buildings
router.get('/:id/buildings', async (req, res) => {
  try {
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, req.params.id),
      columns: { id: true },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const buildingRows = await db.query.buildings.findMany({
      where: eq(buildings.townId, req.params.id),
      columns: {
        id: true,
        type: true,
        name: true,
        level: true,
      },
      with: {
        character: { columns: { id: true, name: true } },
      },
    });

    const buildingsResult = buildingRows.map(b => ({
      id: b.id,
      type: b.type,
      name: b.name,
      level: b.level,
      owner: b.character ? { id: b.character.id, name: b.character.name } : null,
    }));

    return res.json({ buildings: buildingsResult });
  } catch (error) {
    if (handleDbError(error, res, 'get town buildings', req)) return;
    logRouteError(req, 500, 'Get town buildings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/towns/:id/characters
router.get('/:id/characters', async (req, res) => {
  try {
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, req.params.id),
      columns: { id: true },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const characterRows = await db.select({
      id: characters.id,
      name: characters.name,
      race: characters.race,
      level: characters.level,
    }).from(characters).where(eq(characters.currentTownId, req.params.id));

    return res.json({ characters: characterRows });
  } catch (error) {
    if (handleDbError(error, res, 'get town characters', req)) return;
    logRouteError(req, 500, 'Get town characters error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
