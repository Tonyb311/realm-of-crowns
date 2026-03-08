/**
 * Node seed for Realm of Crowns
 *
 * Converts all existing TravelRoutes into travel node chains for the tick-based travel system.
 * For each route, creates intermediate nodes indexed by nodeIndex (0-based).
 *
 * Node count per route based on the route's nodeCount field (default 3).
 * The terrain type for each node is derived from the route's terrain string.
 *
 * Uses upsert pattern via onConflictDoUpdate on the (routeId, nodeIndex) unique constraint.
 */

import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';

// ============================================================
// NODE TYPE (string values for terrain column)
// ============================================================

type NodeType = 'ROAD' | 'WILDERNESS' | 'MOUNTAIN_PASS' | 'RIVER_CROSSING'
  | 'BORDER_CROSSING' | 'FOREST_TRAIL' | 'SWAMP_PATH' | 'UNDERGROUND_TUNNEL'
  | 'COASTAL_PATH' | 'TOWN_GATE';

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
// SEED FUNCTION
// ============================================================

export async function seedNodes(db: any) {
  console.log('--- Seeding Travel Nodes ---');

  // Get all travel routes with their from/to town info via relations
  const routes = await db.query.travelRoutes.findMany({
    with: {
      town_fromTownId: true,
      town_toTownId: true,
    },
  });

  // Track which route pairs we've already processed (since routes are bidirectional)
  const processedPairs = new Set<string>();
  let nodeCount = 0;

  for (const route of routes) {
    // Skip reverse direction (A->B and B->A are the same physical route)
    const pairKey = [route.fromTownId, route.toTownId].sort().join('|');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const fromTown = route.town_fromTownId;
    const toTown = route.town_toTownId;
    if (!fromTown || !toTown) {
      console.error(`  ERROR: Missing town data for route ${route.id}`);
      continue;
    }

    const terrain = terrainToNodeType(route.terrain);
    const totalNodes = route.nodeCount || 3;
    const dangerBase = route.dangerLevel;

    // Delete existing nodes for this route, then re-create
    await db.delete(schema.travelNodes).where(eq(schema.travelNodes.routeId, route.id));

    // Create intermediate nodes for this route
    const nodes = [];
    for (let i = 0; i < totalNodes; i++) {
      const nodeName = `${fromTown.name}-${toTown.name} ${getNodeLabel(terrain, i, totalNodes)}`;
      const description = getNodeDescription(terrain, fromTown.name, toTown.name, i, totalNodes);

      nodes.push({
        id: crypto.randomUUID(),
        routeId: route.id,
        nodeIndex: i,
        name: nodeName,
        description,
        terrain: terrain,
        dangerLevel: dangerBase,
      });
    }

    if (nodes.length > 0) {
      await db.insert(schema.travelNodes).values(nodes);
      nodeCount += nodes.length;
    }
  }

  console.log(`  Created ${nodeCount} travel nodes across ${processedPairs.size} unique routes`);
}

// ============================================================
// HELPERS
// ============================================================

function getNodeLabel(type: NodeType, index: number, total: number): string {
  if (index === 0) return 'Outskirts';
  if (index === total - 1) return 'Approach';

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
  return options[(index - 1) % options.length];
}

function getNodeDescription(
  type: NodeType,
  fromTown: string,
  toTown: string,
  index: number,
  total: number,
): string {
  if (index === 0) return `The road leading away from ${fromTown} toward ${toTown}.`;
  if (index === total - 1) return `The final stretch before reaching ${toTown}.`;

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
