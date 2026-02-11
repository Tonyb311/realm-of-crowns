/**
 * MST Route Pruning Script
 *
 * Computes a Minimum Spanning Tree from all released travel routes,
 * then deletes the non-MST routes (and their travel nodes via cascade).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/mst-prune-routes.ts
 *
 * Add --dry-run to preview without deleting:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/mst-prune-routes.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Union-Find for Kruskal's MST
// ---------------------------------------------------------------------------

class UnionFind {
  parent: number[];
  rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false;
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no deletions) ===' : '=== MST Route Pruning ===');
  console.log();

  // 1. Load towns with coordinates
  const towns = await prisma.town.findMany({
    where: { isReleased: true },
    select: { id: true, name: true, mapX: true, mapY: true, population: true },
  });
  console.log(`Loaded ${towns.length} released towns`);

  // 2. Load routes
  const routes = await prisma.travelRoute.findMany({
    where: { isReleased: true },
    select: {
      id: true,
      name: true,
      fromTownId: true,
      toTownId: true,
      nodeCount: true,
      difficulty: true,
      dangerLevel: true,
    },
  });
  console.log(`Loaded ${routes.length} released routes`);

  // Count travel nodes
  const totalNodes = await prisma.travelNode.count({
    where: { route: { isReleased: true } },
  });
  console.log(`Total travel nodes: ${totalNodes}`);
  console.log();

  // 3. Build edges with Euclidean distance
  const townIndex = new Map(towns.map((t, i) => [t.id, i]));
  const townById = new Map(towns.map(t => [t.id, t]));

  const edges = routes
    .map(route => {
      const from = townById.get(route.fromTownId);
      const to = townById.get(route.toTownId);
      if (!from || !to) return null;
      const fi = townIndex.get(from.id);
      const ti = townIndex.get(to.id);
      if (fi === undefined || ti === undefined) return null;
      if (from.mapX == null || from.mapY == null || to.mapX == null || to.mapY == null) return null;
      const dx = from.mapX - to.mapX;
      const dy = from.mapY - to.mapY;
      return { route, from, to, fi, ti, distance: Math.sqrt(dx * dx + dy * dy) };
    })
    .filter(Boolean) as { route: typeof routes[0]; from: typeof towns[0]; to: typeof towns[0]; fi: number; ti: number; distance: number }[];

  edges.sort((a, b) => a.distance - b.distance);
  console.log(`Built ${edges.length} edges with distances`);

  // 4. Kruskal's MST
  const uf = new UnionFind(towns.length);
  const keepIds = new Set<string>();

  for (const edge of edges) {
    if (uf.union(edge.fi, edge.ti)) {
      keepIds.add(edge.route.id);
      if (keepIds.size === towns.length - 1) break;
    }
  }

  console.log(`MST edges: ${keepIds.size} (expected: ${towns.length - 1})`);
  console.log();

  // 5. Verify completeness
  const connected = new Set<string>();
  for (const route of routes) {
    if (!keepIds.has(route.id)) continue;
    connected.add(route.fromTownId);
    connected.add(route.toTownId);
  }
  const isolated = towns.filter(t => !connected.has(t.id));
  if (isolated.length > 0) {
    console.error('WARNING: Isolated towns (not connected by any MST edge):');
    isolated.forEach(t => console.error(`  ${t.name} (${t.id})`));
    console.log();
  } else {
    console.log('All towns connected by MST.');
  }

  // 6. Print MST edges
  console.log();
  console.log('MST Road Network:');
  for (const edge of edges) {
    if (!keepIds.has(edge.route.id)) continue;
    console.log(
      `  ${edge.from.name} ↔ ${edge.to.name} (${edge.route.nodeCount} nodes, ${edge.route.difficulty}, dist=${edge.distance.toFixed(1)})`
    );
  }

  // 7. Identify routes to delete
  const deleteIds = routes.filter(r => !keepIds.has(r.id)).map(r => r.id);
  console.log();
  console.log(`Routes to keep: ${keepIds.size}`);
  console.log(`Routes to delete: ${deleteIds.length}`);
  console.log();

  // Print routes being removed
  console.log('Routes being removed:');
  for (const edge of edges) {
    if (keepIds.has(edge.route.id)) continue;
    console.log(`  ${edge.from.name} → ${edge.to.name} (${edge.route.name || 'unnamed'})`);
  }
  console.log();

  // 8. Check for active travelers on routes being deleted
  const activeSolo = await prisma.characterTravelState.findMany({
    where: { routeId: { in: deleteIds } },
    select: { characterId: true, routeId: true, currentNodeIndex: true, status: true },
  });

  const activeGroups = await prisma.groupTravelState.findMany({
    where: { routeId: { in: deleteIds } },
    select: { groupId: true, routeId: true, currentNodeIndex: true, status: true },
  });

  if (activeSolo.length > 0 || activeGroups.length > 0) {
    console.error('BLOCKING: Active travelers on routes being deleted!');
    activeSolo.forEach(t =>
      console.error(`  Solo: character ${t.characterId} on route ${t.routeId} (node ${t.currentNodeIndex}, ${t.status})`)
    );
    activeGroups.forEach(g =>
      console.error(`  Group: group ${g.groupId} on route ${g.routeId} (node ${g.currentNodeIndex}, ${g.status})`)
    );
    console.error('Resolve these travelers before proceeding.');
    process.exit(1);
  }
  console.log('No active travelers on routes being deleted.');
  console.log();

  // 9. Delete non-MST routes (cascade deletes travel nodes)
  if (DRY_RUN) {
    console.log('DRY RUN — no deletions performed.');
    // Count what would be deleted
    const nodeCount = await prisma.travelNode.count({
      where: { routeId: { in: deleteIds } },
    });
    console.log(`Would delete ${nodeCount} travel nodes`);
    console.log(`Would delete ${deleteIds.length} routes`);
  } else {
    console.log('Deleting non-MST routes...');
    const result = await prisma.$transaction([
      // Travel nodes are cascade-deleted, but explicit delete is safer
      prisma.travelNode.deleteMany({ where: { routeId: { in: deleteIds } } }),
      prisma.travelRoute.deleteMany({ where: { id: { in: deleteIds } } }),
    ]);
    console.log(`Deleted ${result[0].count} travel nodes`);
    console.log(`Deleted ${result[1].count} routes`);
  }

  // 10. Clear Redis caches
  if (!DRY_RUN && process.env.REDIS_URL) {
    console.log('Clearing Redis caches...');
    const redis = new Redis(process.env.REDIS_URL);
    try {
      await redis.del('world:map:static');
      console.log('  Cleared world:map:static');
      // Clear travel-related cache keys
      const travelKeys = await redis.keys('travel:*');
      if (travelKeys.length > 0) {
        await Promise.all(travelKeys.map(k => redis.del(k)));
        console.log(`  Cleared ${travelKeys.length} travel:* cache keys`);
      }
    } finally {
      await redis.quit();
    }
  }

  // 11. Final counts
  console.log();
  const remainingRoutes = await prisma.travelRoute.count({ where: { isReleased: true } });
  const remainingNodes = await prisma.travelNode.count({ where: { route: { isReleased: true } } });
  console.log(`Remaining routes: ${remainingRoutes}`);
  console.log(`Remaining travel nodes: ${remainingNodes}`);
  console.log();
  console.log('Done.');
}

main()
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
