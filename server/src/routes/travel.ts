/**
 * Node-based travel routes.
 * Replaces the old timer-based travel system with node-graph endpoints.
 * Travel is now resolved during the daily tick, not in real-time.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { checkBorderCrossing } from '../services/border-crossing';
import {
  getConnectedNodes,
  getRouteBetweenTowns,
} from '../services/travel-resolver';
import {
  getCombatPresets,
  updateCombatPresets,
  validateAbilityQueue,
  validateItemUsageRules,
} from '../services/combat-presets';
import { getPsionSpec, NOMAD_TRAVEL_MULTIPLIER } from '../services/psion-perks';

const router = Router();

// ---- Zod Schemas ----

const borderCheckSchema = z.object({
  characterId: z.string().min(1, 'Character ID is required'),
  fromTownId: z.string().min(1, 'From town ID is required'),
  toTownId: z.string().min(1, 'To town ID is required'),
});

const updatePresetsSchema = z.object({
  stance: z.enum(['AGGRESSIVE', 'BALANCED', 'DEFENSIVE', 'EVASIVE']).optional(),
  retreat: z.object({
    hpThreshold: z.number().min(0).max(100).optional(),
    oppositionRatio: z.number().min(0).optional(),
    roundLimit: z.number().min(0).optional(),
    neverRetreat: z.boolean().optional(),
  }).optional(),
  abilityQueue: z.array(z.object({
    abilityId: z.string(),
    abilityName: z.string(),
    priority: z.number().int().min(0),
    useWhen: z.enum(['always', 'low_hp', 'high_hp', 'first_round', 'outnumbered']).optional(),
    hpThreshold: z.number().min(0).max(100).optional(),
  })).optional(),
  itemUsageRules: z.array(z.object({
    itemTemplateId: z.string(),
    itemName: z.string(),
    useWhen: z.enum(['hp_below', 'mana_below', 'status_effect', 'first_round']),
    threshold: z.number().min(0).max(100).optional(),
    statusEffect: z.string().optional(),
  })).optional(),
  pvpLootBehavior: z.enum(['TAKE_GOLD', 'TAKE_ITEMS', 'TAKE_ALL', 'TAKE_NOTHING']).optional(),
});

// ---- Helpers ----

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId } });
}

// ---- Routes ----

// GET /api/travel/position — Character's current position (town or node)
router.get('/position', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    // Read currentNodeId via raw query (field being added by schema teammate)
    const nodeResult = await prisma.$queryRaw<{ currentNodeId: string | null }[]>`
      SELECT "current_node_id" as "currentNodeId" FROM "characters" WHERE id = ${character.id} LIMIT 1
    `;

    const currentNodeId = nodeResult[0]?.currentNodeId ?? null;

    let nodeDetails = null;
    if (currentNodeId) {
      const nodes = await prisma.$queryRaw<any[]>`
        SELECT id, name, type, "region_id" as "regionId",
               "danger_level" as "dangerLevel", description,
               "town_id" as "townId"
        FROM "nodes" WHERE id = ${currentNodeId} LIMIT 1
      `;
      nodeDetails = nodes[0] ?? null;
    }

    let townDetails = null;
    if (character.currentTownId) {
      townDetails = await prisma.town.findUnique({
        where: { id: character.currentTownId },
        select: { id: true, name: true, regionId: true },
      });
    }

    return res.json({
      position: {
        inTown: !!character.currentTownId,
        town: townDetails,
        onNode: !!currentNodeId,
        node: nodeDetails,
      },
    });
  } catch (error) {
    console.error('Travel position error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/nodes — Nodes connected to current position
router.get('/nodes', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    // Determine current node
    const nodeResult = await prisma.$queryRaw<{ currentNodeId: string | null }[]>`
      SELECT "current_node_id" as "currentNodeId" FROM "characters" WHERE id = ${character.id} LIMIT 1
    `;

    let currentNodeId = nodeResult[0]?.currentNodeId ?? null;

    // If in a town but not on a node, find the TOWN_GATE for that town
    if (!currentNodeId && character.currentTownId) {
      const townGate = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "nodes" WHERE "town_id" = ${character.currentTownId} AND type = 'TOWN_GATE' LIMIT 1
      `;
      if (townGate.length > 0) {
        currentNodeId = townGate[0].id;
      }
    }

    if (!currentNodeId) {
      return res.json({ nodes: [], currentNodeId: null });
    }

    const connected = await getConnectedNodes(currentNodeId);

    return res.json({
      currentNodeId,
      nodes: connected.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        regionId: n.regionId,
        dangerLevel: n.dangerLevel,
        encounterChance: n.encounterChance,
        townId: n.townId,
        description: n.description,
      })),
    });
  } catch (error) {
    console.error('Travel nodes error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/nodes/:nodeId — Node details with occupants
router.get('/nodes/:nodeId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nodeId } = req.params;

    const nodes = await prisma.$queryRaw<any[]>`
      SELECT id, name, type, "region_id" as "regionId",
             "danger_level" as "dangerLevel", "encounter_chance" as "encounterChance",
             "town_id" as "townId", description
      FROM "nodes" WHERE id = ${nodeId} LIMIT 1
    `;

    if (nodes.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const node = nodes[0];

    // Get characters currently on this node (visible occupants)
    const occupants = await prisma.$queryRaw<{ id: string; name: string; level: number; race: string }[]>`
      SELECT id, name, level, race
      FROM "characters"
      WHERE "current_node_id" = ${nodeId}
    `;

    // Get connected nodes
    const connected = await getConnectedNodes(nodeId);

    return res.json({
      node: {
        ...node,
        occupants: occupants.map(o => ({
          id: o.id,
          name: o.name,
          level: o.level,
          race: o.race,
        })),
        connectedNodes: connected.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          dangerLevel: n.dangerLevel,
        })),
      },
    });
  } catch (error) {
    console.error('Travel node detail error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/routes/:fromTownId/:toTownId — Full path with distance and dangers
router.get('/routes/:fromTownId/:toTownId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromTownId, toTownId } = req.params;

    if (fromTownId === toTownId) {
      return res.status(400).json({ error: 'Origin and destination are the same town' });
    }

    // Verify both towns exist
    const [fromTown, toTown] = await Promise.all([
      prisma.town.findUnique({ where: { id: fromTownId }, select: { id: true, name: true } }),
      prisma.town.findUnique({ where: { id: toTownId }, select: { id: true, name: true } }),
    ]);

    if (!fromTown) return res.status(404).json({ error: 'Origin town not found' });
    if (!toTown) return res.status(404).json({ error: 'Destination town not found' });

    const route = await getRouteBetweenTowns(fromTownId, toTownId);

    if (!route) {
      return res.status(404).json({ error: 'No route found between these towns' });
    }

    // Calculate danger summary
    const maxDanger = Math.max(...route.path.map(n => n.dangerLevel));
    const avgDanger = route.path.reduce((sum, n) => sum + n.dangerLevel, 0) / route.path.length;
    const terrainTypes = [...new Set(route.path.map(n => n.type))];
    const totalEncounterRisk = route.path.reduce((sum, n) => sum + n.encounterChance, 0);

    // Psion Nomad: Dimensional Trade — show adjusted travel estimate
    const character = await getCharacterForUser(req.user!.userId);
    let psionInsight: { adjustedDistance?: number; nomadSpeedBonus?: boolean; warPenaltyBypassed?: boolean } | undefined;
    if (character) {
      const { isPsion, specialization } = await getPsionSpec(character.id);
      if (isPsion && specialization === 'nomad') {
        psionInsight = {
          adjustedDistance: Math.max(1, Math.floor(route.distance * NOMAD_TRAVEL_MULTIPLIER)),
          nomadSpeedBonus: true,
          warPenaltyBypassed: true,
        };
      }
    }

    return res.json({
      route: {
        from: fromTown,
        to: toTown,
        distance: route.distance,
        nodes: route.path.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          dangerLevel: n.dangerLevel,
          encounterChance: n.encounterChance,
          townId: n.townId,
        })),
        dangers: {
          maxDangerLevel: maxDanger,
          avgDangerLevel: Math.round(avgDanger * 10) / 10,
          terrainTypes,
          totalEncounterRisk: Math.round(totalEncounterRisk * 100) / 100,
        },
        ...(psionInsight ? { psionInsight } : {}),
      },
    });
  } catch (error) {
    console.error('Travel route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/node-map — Regional node/connection data for map rendering
router.get('/node-map', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    // Determine the character's current region
    let regionId: string | null = null;

    if (character.currentTownId) {
      const town = await prisma.town.findUnique({
        where: { id: character.currentTownId },
        select: { regionId: true },
      });
      regionId = town?.regionId ?? null;
    }

    if (!regionId) {
      // Try to get region from current node
      const nodeResult = await prisma.$queryRaw<{ regionId: string | null }[]>`
        SELECT n."region_id" as "regionId"
        FROM "characters" c
        JOIN "nodes" n ON n.id = c."current_node_id"
        WHERE c.id = ${character.id}
        LIMIT 1
      `;
      regionId = nodeResult[0]?.regionId ?? null;
    }

    if (!regionId) {
      return res.json({ nodes: [], connections: [] });
    }

    // Get all nodes in this region and adjacent regions
    const adjacentRegions = await prisma.regionBorder.findMany({
      where: {
        OR: [
          { regionId1: regionId },
          { regionId2: regionId },
        ],
      },
    });

    const regionIds = [
      regionId,
      ...adjacentRegions.map(b => b.regionId1 === regionId ? b.regionId2 : b.regionId1),
    ];

    const nodes = await prisma.$queryRaw<any[]>`
      SELECT id, name, type, "region_id" as "regionId",
             "danger_level" as "dangerLevel", "encounter_chance" as "encounterChance",
             "town_id" as "townId", description, position
      FROM "nodes"
      WHERE "region_id" = ANY(${regionIds}::text[])
    `;

    const nodeIds = nodes.map(n => n.id);

    const connections = await prisma.$queryRaw<any[]>`
      SELECT id, "from_node_id" as "fromNodeId", "to_node_id" as "toNodeId", bidirectional
      FROM "node_connections"
      WHERE "from_node_id" = ANY(${nodeIds}::text[])
         OR "to_node_id" = ANY(${nodeIds}::text[])
    `;

    return res.json({
      regionId,
      nodes: nodes.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        regionId: n.regionId,
        dangerLevel: n.dangerLevel,
        encounterChance: n.encounterChance,
        townId: n.townId,
        description: n.description,
        position: n.position,
      })),
      connections: connections.map(c => ({
        id: c.id,
        fromNodeId: c.fromNodeId,
        toNodeId: c.toNodeId,
        bidirectional: c.bidirectional,
      })),
    });
  } catch (error) {
    console.error('Travel node-map error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/travel/border-check — Check border crossing requirements (KEPT from old system)
router.post('/border-check', authGuard, validate(borderCheckSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId, fromTownId, toTownId } = req.body;
    const result = await checkBorderCrossing(characterId, fromTownId, toTownId);
    return res.json({ borderCheck: result });
  } catch (error) {
    console.error('Border check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/travel/combat-presets — Get character's combat presets
router.get('/combat-presets', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const presets = await getCombatPresets(character.id);
    return res.json({ presets });
  } catch (error) {
    console.error('Get combat presets error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/travel/combat-presets — Update character's combat presets
router.put('/combat-presets', authGuard, validate(updatePresetsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const presets = req.body;

    // Validate ability queue if provided
    if (presets.abilityQueue) {
      const abilityValidation = await validateAbilityQueue(character.id, presets.abilityQueue);
      if (!abilityValidation.valid) {
        return res.status(400).json({
          error: 'Invalid ability queue',
          details: abilityValidation.errors,
        });
      }
    }

    // Validate item usage rules if provided
    if (presets.itemUsageRules) {
      const itemValidation = await validateItemUsageRules(character.id, presets.itemUsageRules);
      if (!itemValidation.valid) {
        return res.status(400).json({
          error: 'Invalid item usage rules',
          details: itemValidation.errors,
        });
      }
    }

    await updateCombatPresets(character.id, presets);

    const updated = await getCombatPresets(character.id);
    return res.json({ presets: updated });
  } catch (error) {
    console.error('Update combat presets error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
