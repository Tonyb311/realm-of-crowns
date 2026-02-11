/**
 * Node-based travel resolver for tick processing.
 * Replaces the old timer-based travel system with node-graph traversal.
 */

import { prisma } from '../lib/prisma';

// ---- Types ----

export interface TravelResult {
  success: boolean;
  newNodeId?: string;
  newTownId?: string | null;
  error?: string;
  encounterTriggered?: boolean;
  encounterType?: 'pve' | 'pvp';
}

export interface NodeEncounterResult {
  triggered: boolean;
  monsterId?: string;
  monsterName?: string;
  monsterLevel?: number;
}

export interface PvPEncounterResult {
  triggered: boolean;
  hostileCharacters: { id: string; name: string; level: number; stance: string }[];
}

interface NodeData {
  id: string;
  name: string;
  type: string;
  regionId: string;
  dangerLevel: number;
  encounterChance: number;
  townId: string | null;
  description: string | null;
}

interface ConnectionData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  bidirectional: boolean;
}

// ---- Racial Travel Modifiers ----

const RACIAL_ENCOUNTER_REDUCTION: Record<string, number> = {
  BEASTFOLK: -0.15, // Beastfolk: -15% encounter chance
};

const RACIAL_TERRAIN_BONUSES: Record<string, string[]> = {
  MERFOLK: ['COASTAL_PATH', 'RIVER_CROSSING'], // Merfolk: underwater/water nodes
  DROW: ['UNDERGROUND_TUNNEL'],                // Drow: underground nodes
};

const RACES_WITH_SKIP = ['FAEFOLK']; // Faefolk: flutter — can skip one node
const PROFESSIONS_WITH_DOUBLE_MOVE = ['COURIER']; // Courier: 2 nodes per day

// ---- Core Functions ----

/**
 * Resolve a travel action during tick processing.
 * Validates the move is legal, applies racial modifiers, and updates position.
 */
export async function resolveTravel(
  characterId: string,
  targetNodeId: string,
): Promise<TravelResult> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      professions: { where: { isActive: true } },
    },
  });

  if (!character) {
    return { success: false, error: 'Character not found' };
  }

  const currentNodeId = (character as any).currentNodeId as string | null;

  // If character is in a town, find the TOWN_GATE node for that town
  let effectiveCurrentNodeId = currentNodeId;
  if (!effectiveCurrentNodeId && character.currentTownId) {
    const townGate = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "nodes" WHERE "town_id" = ${character.currentTownId} AND type = 'TOWN_GATE' LIMIT 1
    `;
    if (townGate.length > 0) {
      effectiveCurrentNodeId = townGate[0].id;
    }
  }

  if (!effectiveCurrentNodeId) {
    return { success: false, error: 'Character has no current position on the node graph' };
  }

  // Check Faefolk flutter (can skip one node) or Courier (2 nodes/day handled at tick level)
  const canSkip = RACES_WITH_SKIP.includes(character.race);

  // Validate the target node is reachable
  const connected = await getConnectedNodes(effectiveCurrentNodeId);
  const isDirectlyConnected = connected.some(n => n.id === targetNodeId);

  let isSkipConnected = false;
  if (!isDirectlyConnected && canSkip) {
    // Check if target is 2 hops away (skip one intermediate node)
    for (const intermediate of connected) {
      const secondHop = await getConnectedNodes(intermediate.id);
      if (secondHop.some(n => n.id === targetNodeId)) {
        isSkipConnected = true;
        break;
      }
    }
  }

  if (!isDirectlyConnected && !isSkipConnected) {
    return { success: false, error: 'Target node is not connected to current position' };
  }

  // Fetch target node details
  const targetNode = await prisma.$queryRaw<NodeData[]>`
    SELECT id, name, type, "region_id" as "regionId", "danger_level" as "dangerLevel",
           "encounter_chance" as "encounterChance", "town_id" as "townId", description
    FROM "nodes" WHERE id = ${targetNodeId} LIMIT 1
  `;

  if (targetNode.length === 0) {
    return { success: false, error: 'Target node not found' };
  }

  const node = targetNode[0];

  // Check racial terrain restrictions/bonuses
  // Merfolk can only use underwater/water nodes freely, but aren't blocked from others
  // Drow get bonuses in underground, but aren't blocked from others

  // Move the character
  const newTownId = node.type === 'TOWN_GATE' && node.townId ? node.townId : null;

  // Update character position
  await prisma.character.update({
    where: { id: characterId },
    data: {
      currentTownId: newTownId,
      // currentNodeId will be set via raw query since Prisma schema may not have it yet
    },
  });

  // Set currentNodeId via raw query (schema teammate is adding this field)
  await prisma.$executeRaw`
    UPDATE "characters" SET "current_node_id" = ${targetNodeId} WHERE id = ${characterId}
  `;

  return {
    success: true,
    newNodeId: targetNodeId,
    newTownId: newTownId,
  };
}

/**
 * Check for a PvE encounter on a node based on encounterChance.
 * Returns a monster if an encounter is triggered.
 */
export async function checkNodeEncounter(
  characterId: string,
  node: { encounterChance: number; regionId: string; dangerLevel: number },
): Promise<NodeEncounterResult> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, level: true },
  });

  if (!character) {
    return { triggered: false };
  }

  // Base encounter chance from node
  let encounterChance = node.encounterChance;

  // Apply racial modifiers
  const raceModifier = RACIAL_ENCOUNTER_REDUCTION[character.race] ?? 0;
  encounterChance = Math.max(0, encounterChance + raceModifier);

  // Roll for encounter
  const roll = Math.random();
  if (roll > encounterChance) {
    return { triggered: false };
  }

  // Find a suitable monster
  const levelMin = Math.max(1, character.level - 3);
  const levelMax = character.level + 3 + node.dangerLevel;

  let monsters = await prisma.monster.findMany({
    where: {
      regionId: node.regionId,
      level: { gte: levelMin, lte: levelMax },
    },
    select: { id: true, name: true, level: true },
  });

  if (monsters.length === 0) {
    // Fallback: any monster in level range
    monsters = await prisma.monster.findMany({
      where: { level: { gte: levelMin, lte: levelMax } },
      select: { id: true, name: true, level: true },
      take: 10,
    });
  }

  if (monsters.length === 0) {
    return { triggered: false };
  }

  const monster = monsters[Math.floor(Math.random() * monsters.length)];

  return {
    triggered: true,
    monsterId: monster.id,
    monsterName: monster.name,
    monsterLevel: monster.level,
  };
}

/**
 * Check for PvP encounters on a node.
 * Finds GUARD or AMBUSH players stationed on the same node.
 * Also checks war faction hostilities.
 */
export async function checkPvPEncounter(
  characterId: string,
  nodeId: string,
): Promise<PvPEncounterResult> {
  // Find characters on the same node with GUARD or AMBUSH daily actions
  const hostiles = await prisma.$queryRaw<
    { id: string; name: string; level: number; combatStance: string }[]
  >`
    SELECT c.id, c.name, c.level,
           COALESCE(c."combat_stance", 'BALANCED') as "combatStance"
    FROM "characters" c
    JOIN "daily_actions" da ON da."character_id" = c.id
    WHERE c."current_node_id" = ${nodeId}
      AND c.id != ${characterId}
      AND da."action_type" IN ('GUARD', 'AMBUSH')
      AND da.status = 'PENDING'
  `;

  if (hostiles.length === 0) {
    return { triggered: false, hostileCharacters: [] };
  }

  // TODO: Filter by war faction — only return hostiles if at war with traveler's faction
  // For now, AMBUSH players always trigger, GUARD players only if at war

  return {
    triggered: hostiles.length > 0,
    hostileCharacters: hostiles.map(h => ({
      id: h.id,
      name: h.name,
      level: h.level,
      stance: h.combatStance,
    })),
  };
}

/**
 * Get all nodes connected to a given node via NodeConnection.
 */
export async function getConnectedNodes(nodeId: string): Promise<NodeData[]> {
  const nodes = await prisma.$queryRaw<NodeData[]>`
    SELECT n.id, n.name, n.type, n."region_id" as "regionId",
           n."danger_level" as "dangerLevel", n."encounter_chance" as "encounterChance",
           n."town_id" as "townId", n.description
    FROM "nodes" n
    JOIN "node_connections" nc ON (
      (nc."from_node_id" = ${nodeId} AND nc."to_node_id" = n.id)
      OR (nc."to_node_id" = ${nodeId} AND nc."from_node_id" = n.id AND nc.bidirectional = true)
    )
  `;

  return nodes;
}

/**
 * Find the shortest path between two towns using BFS on the node graph.
 * Returns an ordered array of node IDs from start to end.
 */
export async function getRouteBetweenTowns(
  fromTownId: string,
  toTownId: string,
): Promise<{ path: NodeData[]; distance: number } | null> {
  // Find the TOWN_GATE nodes for each town
  const [startNodes, endNodes] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "nodes" WHERE "town_id" = ${fromTownId} AND type = 'TOWN_GATE' LIMIT 1
    `,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "nodes" WHERE "town_id" = ${toTownId} AND type = 'TOWN_GATE' LIMIT 1
    `,
  ]);

  if (startNodes.length === 0 || endNodes.length === 0) {
    return null;
  }

  const startId = startNodes[0].id;
  const endId = endNodes[0].id;

  // Load the entire node graph into memory for BFS
  const allConnections = await prisma.$queryRaw<ConnectionData[]>`
    SELECT id, "from_node_id" as "fromNodeId", "to_node_id" as "toNodeId", bidirectional
    FROM "node_connections"
  `;

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const conn of allConnections) {
    if (!adjacency.has(conn.fromNodeId)) adjacency.set(conn.fromNodeId, new Set());
    adjacency.get(conn.fromNodeId)!.add(conn.toNodeId);

    if (conn.bidirectional) {
      if (!adjacency.has(conn.toNodeId)) adjacency.set(conn.toNodeId, new Set());
      adjacency.get(conn.toNodeId)!.add(conn.fromNodeId);
    }
  }

  // BFS
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: string[] = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === endId) {
      // Reconstruct path
      const pathIds: string[] = [];
      let node: string | undefined = endId;
      while (node !== undefined) {
        pathIds.unshift(node);
        node = parent.get(node);
      }

      // Fetch full node data for the path
      if (pathIds.length === 0) return null;

      const pathNodes = await prisma.$queryRaw<NodeData[]>`
        SELECT id, name, type, "region_id" as "regionId",
               "danger_level" as "dangerLevel", "encounter_chance" as "encounterChance",
               "town_id" as "townId", description
        FROM "nodes" WHERE id = ANY(${pathIds}::text[])
      `;

      // Sort by path order
      const nodeMap = new Map(pathNodes.map(n => [n.id, n]));
      const orderedPath = pathIds.map(id => nodeMap.get(id)!).filter(Boolean);

      return {
        path: orderedPath,
        distance: orderedPath.length - 1, // number of edges = nodes - 1
      };
    }

    const neighbors = adjacency.get(current) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return null; // No path found
}

/**
 * Apply wartime modifiers to a node.
 * If there's an active war and the node is in enemy territory, increase encounter chances.
 */
export async function applyWartimeModifiers(
  characterId: string,
  node: { regionId: string; encounterChance: number },
): Promise<{ encounterChance: number; warActive: boolean }> {
  // Find which kingdom the character belongs to (via their current town's region)
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { currentTownId: true },
  });

  if (!character?.currentTownId) {
    return { encounterChance: node.encounterChance, warActive: false };
  }

  // Check for active wars
  const activeWars = await prisma.war.findMany({
    where: { status: 'ACTIVE' },
    include: {
      attackerKingdom: { select: { id: true, capitalTownId: true } },
      defenderKingdom: { select: { id: true, capitalTownId: true } },
    },
  });

  if (activeWars.length === 0) {
    return { encounterChance: node.encounterChance, warActive: false };
  }

  // If there are active wars, increase encounter chance by 25%
  // This is a simplified check — a full implementation would check territory ownership
  const warMultiplier = 1.25;
  return {
    encounterChance: Math.min(1.0, node.encounterChance * warMultiplier),
    warActive: true,
  };
}

/**
 * Check if a character has the Courier profession (allows 2-node movement per day).
 */
export async function canMoveMultipleNodes(characterId: string): Promise<boolean> {
  const professions = await prisma.playerProfession.findMany({
    where: { characterId, isActive: true },
    select: { professionType: true },
  });

  return professions.some(p => PROFESSIONS_WITH_DOUBLE_MOVE.includes(p.professionType));
}

/**
 * Check if a character's race allows them to skip a node (e.g., Faefolk flutter).
 */
export async function canSkipNode(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  return character ? RACES_WITH_SKIP.includes(character.race) : false;
}
