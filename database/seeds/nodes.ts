/**
 * Node seed for Realm of Crowns
 *
 * Converts all existing TravelRoutes into node chains for the tick-based travel system.
 * For each route: [FromTown TOWN_GATE] -> [intermediate nodes] -> [ToTown TOWN_GATE]
 *
 * Node count per route based on distance:
 *   distance 1-15  = 2 intermediate nodes
 *   distance 16-25 = 3 intermediate nodes
 *   distance 26-40 = 5 intermediate nodes
 *   distance 41+   = 7 intermediate nodes
 *
 * Uses upsert pattern (findFirst + update/create) since Node has no unique name constraint.
 */

import { PrismaClient, NodeType } from '@prisma/client';

// ============================================================
// TERRAIN -> NODE TYPE MAPPING
// ============================================================

function terrainToNodeType(terrain: string): NodeType {
  const t = terrain.toLowerCase();
  if (t.includes('road') || t.includes('highway') || t.includes('cobblestone') || t.includes('path') && t.includes('plain'))
    return 'ROAD';
  if (t.includes('mountain') || t.includes('peak') || t.includes('altitude') || t.includes('descent'))
    return 'MOUNTAIN_PASS';
  if (t.includes('forest') || t.includes('wood') || t.includes('glade') || t.includes('grove') || t.includes('silverwood'))
    return 'FOREST_TRAIL';
  if (t.includes('swamp') || t.includes('marsh') || t.includes('bog') || t.includes('boardwalk'))
    return 'SWAMP_PATH';
  if (t.includes('river') || t.includes('lake') || t.includes('waterway') || t.includes('current'))
    return 'RIVER_CROSSING';
  if (t.includes('coast') || t.includes('sea') || t.includes('shore') || t.includes('shallow'))
    return 'COASTAL_PATH';
  if (t.includes('tunnel') || t.includes('underdark') || t.includes('underground') || t.includes('subterranean') || t.includes('cavern') || t.includes('mine') || t.includes('burrow'))
    return 'UNDERGROUND_TUNNEL';
  if (t.includes('border') || t.includes('contested') || t.includes('frontier'))
    return 'BORDER_CROSSING';
  if (t.includes('trail') || t.includes('path') || t.includes('lane') || t.includes('connector'))
    return 'ROAD';
  return 'WILDERNESS';
}

// ============================================================
// ENCOUNTER CHANCES PER NODE TYPE
// ============================================================

const ENCOUNTER_CHANCES: Record<NodeType, number> = {
  ROAD: 0.10,
  WILDERNESS: 0.30,
  MOUNTAIN_PASS: 0.25,
  RIVER_CROSSING: 0.15,
  BORDER_CROSSING: 0.10,
  FOREST_TRAIL: 0.25,
  SWAMP_PATH: 0.40,
  UNDERGROUND_TUNNEL: 0.35,
  COASTAL_PATH: 0.15,
  TOWN_GATE: 0.0,
};

// ============================================================
// NODE COUNT FROM DISTANCE
// ============================================================

function getIntermediateNodeCount(distance: number): number {
  if (distance <= 15) return 2;
  if (distance <= 25) return 3;
  if (distance <= 40) return 5;
  return 7;
}

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedNodes(prisma: PrismaClient) {
  console.log('--- Seeding Nodes ---');

  // Step 1: Get all towns and create TOWN_GATE nodes
  const towns = await prisma.town.findMany({
    include: { region: true },
  });

  const townGateMap = new Map<string, string>(); // townId -> nodeId
  let gateCount = 0;

  for (const town of towns) {
    const gateName = `${town.name} Gate`;

    // Upsert: find by townId (unique on Node)
    const existing = await prisma.node.findUnique({
      where: { townId: town.id },
    });

    if (existing) {
      await prisma.node.update({
        where: { id: existing.id },
        data: {
          name: gateName,
          position: 0,
          type: 'TOWN_GATE',
          regionId: town.regionId,
          dangerLevel: 0,
          description: `The gates of ${town.name}`,
          encounterChance: 0.0,
        },
      });
      townGateMap.set(town.id, existing.id);
    } else {
      const created = await prisma.node.create({
        data: {
          name: gateName,
          position: 0,
          type: 'TOWN_GATE',
          regionId: town.regionId,
          dangerLevel: 0,
          description: `The gates of ${town.name}`,
          townId: town.id,
          encounterChance: 0.0,
        },
      });
      townGateMap.set(town.id, created.id);
      gateCount++;
    }
  }
  console.log(`  Created ${gateCount} town gate nodes (${towns.length} total towns)`);

  // Step 2: Get all travel routes and create intermediate nodes + connections
  const routes = await prisma.travelRoute.findMany({
    include: { fromTown: true, toTown: true },
  });

  // Track which route pairs we've already processed (since routes are bidirectional)
  const processedPairs = new Set<string>();
  let intermediateCount = 0;
  let connectionCount = 0;

  for (const route of routes) {
    // Skip reverse direction (A->B and B->A are the same physical route)
    const pairKey = [route.fromTownId, route.toTownId].sort().join('|');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const fromGateId = townGateMap.get(route.fromTownId);
    const toGateId = townGateMap.get(route.toTownId);
    if (!fromGateId || !toGateId) {
      console.error(`  ERROR: Missing gate node for route "${route.fromTown.name}" -> "${route.toTown.name}"`);
      continue;
    }

    const nodeType = terrainToNodeType(route.terrain);
    const nodeCount = getIntermediateNodeCount(route.distance);
    const dangerBase = route.dangerLevel / 7; // Normalize 1-7 to ~0.14-1.0
    const encounterChance = ENCOUNTER_CHANCES[nodeType];

    // Create intermediate nodes
    const chainNodeIds: string[] = [fromGateId];

    for (let i = 1; i <= nodeCount; i++) {
      const nodeName = `${route.fromTown.name}-${route.toTown.name} ${getNodeLabel(nodeType, i, nodeCount)}`;
      const position = i;

      // Find existing node by route + position
      const existing = await prisma.node.findFirst({
        where: {
          routeId: route.id,
          position,
        },
      });

      let nodeId: string;
      if (existing) {
        await prisma.node.update({
          where: { id: existing.id },
          data: {
            name: nodeName,
            type: nodeType,
            regionId: route.fromTown.regionId,
            dangerLevel: Math.round(dangerBase * 100) / 100,
            description: getNodeDescription(nodeType, route.fromTown.name, route.toTown.name, i, nodeCount),
            encounterChance,
          },
        });
        nodeId = existing.id;
      } else {
        const created = await prisma.node.create({
          data: {
            name: nodeName,
            routeId: route.id,
            position,
            type: nodeType,
            regionId: route.fromTown.regionId,
            dangerLevel: Math.round(dangerBase * 100) / 100,
            description: getNodeDescription(nodeType, route.fromTown.name, route.toTown.name, i, nodeCount),
            encounterChance,
          },
        });
        nodeId = created.id;
        intermediateCount++;
      }

      chainNodeIds.push(nodeId);
    }

    chainNodeIds.push(toGateId);

    // Create connections between consecutive nodes
    for (let i = 0; i < chainNodeIds.length - 1; i++) {
      const fromId = chainNodeIds[i];
      const toId = chainNodeIds[i + 1];

      // Upsert connection (fromNode -> toNode)
      const existingConn = await prisma.nodeConnection.findUnique({
        where: { fromNodeId_toNodeId: { fromNodeId: fromId, toNodeId: toId } },
      });

      if (!existingConn) {
        await prisma.nodeConnection.create({
          data: {
            fromNodeId: fromId,
            toNodeId: toId,
            bidirectional: true,
          },
        });
        connectionCount++;
      }

      // Also create the reverse direction for easy querying
      const existingReverse = await prisma.nodeConnection.findUnique({
        where: { fromNodeId_toNodeId: { fromNodeId: toId, toNodeId: fromId } },
      });

      if (!existingReverse) {
        await prisma.nodeConnection.create({
          data: {
            fromNodeId: toId,
            toNodeId: fromId,
            bidirectional: true,
          },
        });
        connectionCount++;
      }
    }
  }

  console.log(`  Created ${intermediateCount} intermediate nodes across ${processedPairs.size} unique routes`);
  console.log(`  Created ${connectionCount} node connections`);
}

// ============================================================
// HELPERS
// ============================================================

function getNodeLabel(type: NodeType, position: number, total: number): string {
  if (position === 1) return 'Outskirts';
  if (position === total) return 'Approach';

  const labels: Record<NodeType, string[]> = {
    ROAD: ['Crossroads', 'Waypoint', 'Milestone', 'Rest Stop', 'Junction'],
    WILDERNESS: ['Clearing', 'Wilds', 'Thicket', 'Gully', 'Ridge'],
    MOUNTAIN_PASS: ['Switchback', 'Ledge', 'Summit', 'Ravine', 'Cleft'],
    RIVER_CROSSING: ['Ford', 'Rapids', 'Bridge', 'Shallows', 'Bend'],
    BORDER_CROSSING: ['Checkpoint', 'Boundary', 'Outpost', 'Marker', 'Watchtower'],
    FOREST_TRAIL: ['Glade', 'Canopy Path', 'Brook', 'Hollow', 'Thicket'],
    SWAMP_PATH: ['Mire', 'Boardwalk', 'Bog', 'Stagnant Pool', 'Mudflats'],
    UNDERGROUND_TUNNEL: ['Cavern', 'Shaft', 'Gallery', 'Grotto', 'Chasm'],
    COASTAL_PATH: ['Cove', 'Bluff', 'Tidepools', 'Dunes', 'Jetty'],
    TOWN_GATE: ['Gate'],
  };

  const options = labels[type];
  return options[(position - 2) % options.length];
}

function getNodeDescription(
  type: NodeType,
  fromTown: string,
  toTown: string,
  position: number,
  total: number,
): string {
  if (position === 1) return `The road leading away from ${fromTown} toward ${toTown}.`;
  if (position === total) return `The final stretch before reaching ${toTown}.`;

  const descriptions: Record<NodeType, string> = {
    ROAD: `A well-traveled stretch of road between ${fromTown} and ${toTown}.`,
    WILDERNESS: `Untamed wilderness between ${fromTown} and ${toTown}.`,
    MOUNTAIN_PASS: `A treacherous mountain passage between ${fromTown} and ${toTown}.`,
    RIVER_CROSSING: `A river crossing point on the route from ${fromTown} to ${toTown}.`,
    BORDER_CROSSING: `A border zone between the territories of ${fromTown} and ${toTown}.`,
    FOREST_TRAIL: `A winding forest trail between ${fromTown} and ${toTown}.`,
    SWAMP_PATH: `A murky swamp path between ${fromTown} and ${toTown}.`,
    UNDERGROUND_TUNNEL: `A dark underground passage between ${fromTown} and ${toTown}.`,
    COASTAL_PATH: `A scenic coastal path between ${fromTown} and ${toTown}.`,
    TOWN_GATE: `Town gate.`,
  };

  return descriptions[type];
}
