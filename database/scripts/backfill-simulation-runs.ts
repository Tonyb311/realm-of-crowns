/**
 * Backfill Script: Group historical CombatEncounterLog entries (with simulationTick
 * but no simulationRunId) into synthetic SimulationRun records.
 *
 * Run with: npx tsx database/scripts/backfill-simulation-runs.ts
 *
 * Logic:
 * 1. Find all encounters where simulationTick IS NOT NULL AND simulationRunId IS NULL
 * 2. Order by createdAt ASC
 * 3. Gaps > 5 minutes between consecutive entries = new run boundary
 * 4. For each group: create SimulationRun, batch-update encounter FKs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GAP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 500;

async function backfill() {
  console.log('[Backfill] Querying orphan simulation encounters...');

  const orphans = await prisma.combatEncounterLog.findMany({
    where: {
      simulationTick: { not: null },
      simulationRunId: null,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      simulationTick: true,
      createdAt: true,
    },
  });

  if (orphans.length === 0) {
    console.log('[Backfill] No orphan simulation encounters found. Nothing to do.');
    return;
  }

  console.log(`[Backfill] Found ${orphans.length} orphan encounters. Grouping into runs...`);

  // Group by time gaps
  const groups: typeof orphans[] = [];
  let currentGroup: typeof orphans = [orphans[0]];

  for (let i = 1; i < orphans.length; i++) {
    const prev = orphans[i - 1];
    const curr = orphans[i];
    const gap = curr.createdAt.getTime() - prev.createdAt.getTime();

    if (gap > GAP_THRESHOLD_MS) {
      groups.push(currentGroup);
      currentGroup = [curr];
    } else {
      currentGroup.push(curr);
    }
  }
  groups.push(currentGroup);

  console.log(`[Backfill] Identified ${groups.length} simulation run(s).`);

  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const startedAt = group[0].createdAt;
    const completedAt = group[group.length - 1].createdAt;
    const distinctTicks = new Set(group.map(e => e.simulationTick)).size;
    const encounterCount = group.length;

    // Create synthetic SimulationRun
    const run = await prisma.simulationRun.create({
      data: {
        startedAt,
        completedAt,
        tickCount: distinctTicks,
        ticksCompleted: distinctTicks,
        botCount: 0, // unknown for historical data
        encounterCount,
        status: 'completed',
        notes: 'Backfilled from historical simulation data',
      },
    });

    console.log(`[Backfill] Run ${g + 1}/${groups.length}: ${run.id} — ${distinctTicks} ticks, ${encounterCount} encounters`);

    // Batch update encounter FKs
    const ids = group.map(e => e.id);
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      await prisma.combatEncounterLog.updateMany({
        where: { id: { in: batch } },
        data: { simulationRunId: run.id },
      });
    }
  }

  console.log(`[Backfill] Done. Created ${groups.length} simulation run(s) covering ${orphans.length} encounters.`);
}

backfill()
  .catch((err) => {
    console.error('[Backfill] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
