/**
 * Travel Node Count Normalization Script
 *
 * Recalculates TravelNode counts for every route so that node count is
 * proportional to the route's map distance.
 *
 * Baseline: Kazad-Vorn ↔ Deepvein = 2 nodes (3 days travel).
 * All other routes scaled proportionally, clamped to [1, 10].
 *
 * Usage:
 *   DATABASE_URL="..." REDIS_URL="..." npx tsx scripts/normalize-node-counts.ts
 *
 * Add --dry-run to preview without changes:
 *   DATABASE_URL="..." npx tsx scripts/normalize-node-counts.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Node name/description generation
// ---------------------------------------------------------------------------

const TERRAIN_NAMES: Record<string, { features: string[]; landmarks: string[] }> = {
  plains: {
    features: ['Rolling', 'Windswept', 'Golden', 'Sunlit', 'Open'],
    landmarks: ['Field', 'Meadow', 'Grassland', 'Prairie', 'Commons'],
  },
  forest: {
    features: ['Shaded', 'Mossy', 'Ancient', 'Tangled', 'Quiet'],
    landmarks: ['Glade', 'Clearing', 'Thicket', 'Hollow', 'Grove'],
  },
  mountain: {
    features: ['Craggy', 'Steep', 'Windswept', 'Rocky', 'High'],
    landmarks: ['Pass', 'Ridge', 'Ledge', 'Outcrop', 'Overlook'],
  },
  hills: {
    features: ['Grassy', 'Gentle', 'Rolling', 'Stony', 'Bare'],
    landmarks: ['Hilltop', 'Slope', 'Knoll', 'Rise', 'Bluff'],
  },
  swamp: {
    features: ['Murky', 'Misty', 'Dank', 'Boggy', 'Dim'],
    landmarks: ['Marsh', 'Mire', 'Fen', 'Bog', 'Wetland'],
  },
  desert: {
    features: ['Scorched', 'Dusty', 'Barren', 'Sun-bleached', 'Arid'],
    landmarks: ['Dune', 'Flats', 'Waste', 'Basin', 'Expanse'],
  },
  coast: {
    features: ['Salty', 'Breezy', 'Sandy', 'Rocky', 'Tidal'],
    landmarks: ['Shore', 'Cove', 'Beach', 'Bluff', 'Point'],
  },
  coastal: {
    features: ['Salty', 'Breezy', 'Sandy', 'Rocky', 'Tidal'],
    landmarks: ['Shore', 'Cove', 'Beach', 'Bluff', 'Point'],
  },
  tundra: {
    features: ['Frozen', 'Bitter', 'Icy', 'Bleak', 'Howling'],
    landmarks: ['Waste', 'Flat', 'Reach', 'Expanse', 'Steppe'],
  },
  volcanic: {
    features: ['Charred', 'Smoldering', 'Ashen', 'Scorched', 'Sulfurous'],
    landmarks: ['Crater', 'Flow', 'Vent', 'Caldera', 'Shelf'],
  },
  badlands: {
    features: ['Cracked', 'Scorched', 'Desolate', 'Eroded', 'Harsh'],
    landmarks: ['Gulch', 'Mesa', 'Ravine', 'Badland', 'Butte'],
  },
  underground: {
    features: ['Dark', 'Echoing', 'Damp', 'Deep', 'Silent'],
    landmarks: ['Cavern', 'Tunnel', 'Chamber', 'Passage', 'Grotto'],
  },
  mixed: {
    features: ['Dusty', 'Quiet', 'Worn', 'Old', 'Lonely'],
    landmarks: ['Crossroads', 'Waypoint', 'Mile Marker', 'Rest Stop', 'Camp'],
  },
};

const DEFAULT_TERRAIN = {
  features: ['Dusty', 'Quiet', 'Worn', 'Old', 'Lonely'],
  landmarks: ['Crossroads', 'Waypoint', 'Mile Marker', 'Rest Stop', 'Camp'],
};

function generateNodeName(terrain: string, index: number): string {
  const pool = TERRAIN_NAMES[terrain?.toLowerCase()] || DEFAULT_TERRAIN;
  const feature = pool.features[index % pool.features.length];
  const landmark = pool.landmarks[index % pool.landmarks.length];
  return `${feature} ${landmark}`;
}

function generateNodeDescription(
  terrain: string,
  index: number,
  totalNodes: number,
  routeName: string,
): string {
  const label = routeName || 'the road';
  if (index === 0) return `The first waypoint along ${label}. The road stretches ahead.`;
  if (index === totalNodes - 1) return `The final waypoint before reaching your destination. Journey's end is near.`;
  return `A waypoint along ${label}. The road continues onward.`;
}

function getDangerLevel(difficulty: string, nodeIndex: number, totalNodes: number): number {
  const base: Record<string, number> = { safe: 1, moderate: 3, dangerous: 6, deadly: 8 };
  const b = base[difficulty] ?? 2;
  // Middle nodes slightly more dangerous
  const midBonus = nodeIndex > 0 && nodeIndex < totalNodes - 1 ? 1 : 0;
  return Math.min(10, b + midBonus);
}

function getSpecialType(
  nodeIndex: number,
  totalNodes: number,
  terrain: string,
): string | null {
  if (totalNodes < 4) return null;
  const midpoint = Math.floor(totalNodes / 2);
  if (nodeIndex !== midpoint) return null;
  const terrainSpecials: Record<string, string> = {
    plains: 'crossroads',
    forest: 'ruins',
    mountain: 'cave',
    hills: 'watchtower',
    swamp: 'ford',
    desert: 'camp',
    coast: 'bridge',
    coastal: 'bridge',
    tundra: 'shrine',
    volcanic: 'cave',
    badlands: 'camp',
    underground: 'cave',
  };
  return terrainSpecials[terrain?.toLowerCase()] || 'camp';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no changes) ===' : '=== Node Count Normalization ===');
  console.log();

  // 1. Load routes with town coordinates
  const routes = await prisma.travelRoute.findMany({
    where: { isReleased: true },
    include: {
      fromTown: { select: { id: true, name: true, mapX: true, mapY: true } },
      toTown: { select: { id: true, name: true, mapX: true, mapY: true } },
    },
  });
  console.log(`Loaded ${routes.length} released routes`);

  // Count existing nodes
  const oldNodeCount = await prisma.travelNode.count();
  console.log(`Existing travel nodes: ${oldNodeCount}`);
  console.log();

  // 2. Calculate distances
  const routeDistances = routes.map(r => {
    const dx = r.fromTown.mapX! - r.toTown.mapX!;
    const dy = r.fromTown.mapY! - r.toTown.mapY!;
    return {
      routeId: r.id,
      routeName: r.name,
      fromTown: r.fromTown.name,
      toTown: r.toTown.name,
      terrain: r.terrain,
      difficulty: r.difficulty,
      oldNodeCount: r.nodeCount,
      distance: Math.sqrt(dx * dx + dy * dy),
    };
  });

  // 3. Find baseline: Kazad-Vorn ↔ Deepvein
  const baseline = routeDistances.find(
    r =>
      (r.fromTown === 'Kazad-Vorn' && r.toTown === 'Deepvein') ||
      (r.fromTown === 'Deepvein' && r.toTown === 'Kazad-Vorn'),
  );

  if (!baseline) {
    console.error('ERROR: Could not find Kazad-Vorn ↔ Deepvein route for baseline!');
    process.exit(1);
  }

  const BASELINE_NODES = 2;
  const distancePerNode = baseline.distance / BASELINE_NODES;
  console.log(`Baseline: ${baseline.fromTown} ↔ ${baseline.toTown}`);
  console.log(`  Distance: ${baseline.distance.toFixed(1)}`);
  console.log(`  Target nodes: ${BASELINE_NODES}`);
  console.log(`  Distance per node: ${distancePerNode.toFixed(1)}`);
  console.log();

  // 4. Calculate new node counts
  const routeUpdates = routeDistances
    .map(r => {
      let newNodeCount = Math.round(r.distance / distancePerNode);
      newNodeCount = Math.max(1, Math.min(10, newNodeCount));
      return { ...r, newNodeCount, travelDays: newNodeCount + 1 };
    })
    .sort((a, b) => a.distance - b.distance);

  // 5. Log plan
  console.log('Node Count Normalization Plan');
  console.log('='.repeat(95));
  console.log(
    'Route'.padEnd(45) +
      'Dist'.padStart(7) +
      'Old'.padStart(6) +
      'New'.padStart(6) +
      'Days'.padStart(6) +
      '  Change',
  );
  console.log('-'.repeat(95));

  let fewer = 0, more = 0, same = 0;
  let totalNewNodes = 0;

  for (const r of routeUpdates) {
    totalNewNodes += r.newNodeCount;
    const change =
      r.newNodeCount < r.oldNodeCount ? '  ↓' :
      r.newNodeCount > r.oldNodeCount ? '  ↑' : '  =';
    if (r.newNodeCount < r.oldNodeCount) fewer++;
    else if (r.newNodeCount > r.oldNodeCount) more++;
    else same++;

    const label = `${r.fromTown} ↔ ${r.toTown}`;
    console.log(
      label.padEnd(45) +
        r.distance.toFixed(1).padStart(7) +
        String(r.oldNodeCount).padStart(6) +
        String(r.newNodeCount).padStart(6) +
        String(r.travelDays).padStart(6) +
        change,
    );
  }

  console.log('-'.repeat(95));
  console.log(`Routes getting fewer nodes: ${fewer}`);
  console.log(`Routes getting more nodes: ${more}`);
  console.log(`Routes unchanged: ${same}`);
  console.log(`Total nodes: ${oldNodeCount} → ${totalNewNodes}`);
  console.log();

  // Distribution
  const dist = new Map<number, number>();
  for (const r of routeUpdates) {
    dist.set(r.newNodeCount, (dist.get(r.newNodeCount) ?? 0) + 1);
  }
  console.log('Node count distribution:');
  for (const [nodes, count] of [...dist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${nodes} node${nodes > 1 ? 's' : ''} (${nodes + 1}-day travel): ${count} routes`);
  }
  console.log();

  if (DRY_RUN) {
    console.log('DRY RUN — no changes performed.');
    return;
  }

  // 6. Safety check: active travelers
  const activeSolo = await prisma.characterTravelState.findMany();
  const activeGroups = await prisma.groupTravelState.findMany();
  if (activeSolo.length > 0 || activeGroups.length > 0) {
    console.error('BLOCKING: Active travelers exist!');
    activeSolo.forEach(t => console.error(`  Solo: character ${t.characterId} on route ${t.routeId}`));
    activeGroups.forEach(g => console.error(`  Group: group ${g.groupId} on route ${g.routeId}`));
    console.error('Complete or cancel their travel first.');
    process.exit(1);
  }
  console.log('No active travelers. Proceeding with migration...');
  console.log();

  // 7. Delete all existing TravelNodes
  console.log('Deleting all existing travel nodes...');
  const deleteResult = await prisma.travelNode.deleteMany({});
  console.log(`  Deleted ${deleteResult.count} travel nodes`);

  // 8. Create new TravelNodes for each route
  console.log('Creating new travel nodes...');
  let createdCount = 0;

  for (const route of routeUpdates) {
    const terrain = route.terrain || 'plains';
    const difficulty = route.difficulty || 'safe';

    for (let i = 0; i < route.newNodeCount; i++) {
      await prisma.travelNode.create({
        data: {
          routeId: route.routeId,
          nodeIndex: i,
          name: generateNodeName(terrain, i),
          description: generateNodeDescription(terrain, i, route.newNodeCount, route.routeName),
          terrain,
          dangerLevel: getDangerLevel(difficulty, i, route.newNodeCount),
          specialType: getSpecialType(i, route.newNodeCount, terrain),
          offsetX: 0,
          offsetY: 0,
        },
      });
      createdCount++;
    }

    // Update route's nodeCount field
    await prisma.travelRoute.update({
      where: { id: route.routeId },
      data: { nodeCount: route.newNodeCount },
    });
  }
  console.log(`  Created ${createdCount} new travel nodes`);
  console.log(`  Updated ${routeUpdates.length} route nodeCount fields`);
  console.log();

  // 9. Clear Redis caches
  if (process.env.REDIS_URL) {
    console.log('Clearing Redis caches...');
    const redis = new Redis(process.env.REDIS_URL);
    try {
      await redis.del('world:map:static');
      console.log('  Cleared world:map:static');
      const travelKeys = await redis.keys('travel:*');
      if (travelKeys.length > 0) {
        await Promise.all(travelKeys.map(k => redis.del(k)));
        console.log(`  Cleared ${travelKeys.length} travel:* cache keys`);
      }
    } finally {
      await redis.quit();
    }
  }

  // 10. Final verification
  console.log();
  const finalNodeCount = await prisma.travelNode.count();
  const finalRouteCount = await prisma.travelRoute.count({ where: { isReleased: true } });
  console.log(`Final state:`);
  console.log(`  Routes: ${finalRouteCount}`);
  console.log(`  Travel nodes: ${finalNodeCount}`);
  console.log();
  console.log('Done.');
}

main()
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
