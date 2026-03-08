import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, gte } from 'drizzle-orm';
import { buildings } from '@database/tables';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import { emitBuildingConditionLow, emitBuildingDamaged } from '../socket/events';

/**
 * Building maintenance cron job.
 * Runs weekly to degrade building condition and notify owners.
 *
 * Condition scale:
 *   100 = perfect
 *   50-99 = functional (reduced bonuses below 50)
 *   25-49 = non-functional
 *   0 = condemned
 */
const WEEKLY_DEGRADATION = 5;
const LOW_CONDITION_THRESHOLD = 50;
const NONFUNCTIONAL_THRESHOLD = 25;

export function startBuildingMaintenanceJob() {
  // Run every Monday at 03:00 AM
  cron.schedule('0 3 * * 1', async () => {
    logger.debug({ job: 'buildingMaintenance' }, 'cron job started');
    try {
      await degradeBuildings();
      cronJobExecutions.inc({ job: 'buildingMaintenance', result: 'success' });
    } catch (error: unknown) {
      cronJobExecutions.inc({ job: 'buildingMaintenance', result: 'failure' });
      logger.error({ job: 'buildingMaintenance', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });

  logger.info('BuildingMaintenance cron registered (weekly on Monday 03:00)');
}

async function degradeBuildings() {
  const allBuildings = await db.query.buildings.findMany({
    where: gte(buildings.level, 1),
    with: {
      character: { columns: { id: true, name: true } },
      town: { columns: { id: true, name: true } },
    },
  });

  let degradedCount = 0;
  let lowConditionCount = 0;
  let condemnedCount = 0;

  for (const building of allBuildings) {
    const storageData = building.storage as Record<string, unknown>;
    const currentCondition = (storageData.condition as number) ?? 100;
    const newCondition = Math.max(0, currentCondition - WEEKLY_DEGRADATION);

    // Update condition in storage JSON
    await db.update(buildings)
      .set({ storage: { ...storageData, condition: newCondition } })
      .where(eq(buildings.id, building.id));

    degradedCount++;

    if (newCondition <= LOW_CONDITION_THRESHOLD && newCondition > 0) {
      emitBuildingConditionLow(building.ownerId, {
        buildingId: building.id,
        buildingName: building.name,
        buildingType: building.type,
        townName: building.town.name,
        condition: newCondition,
        isFunctional: newCondition >= NONFUNCTIONAL_THRESHOLD,
        isCondemned: false,
      });
      lowConditionCount++;
    } else if (newCondition <= 0) {
      emitBuildingConditionLow(building.ownerId, {
        buildingId: building.id,
        buildingName: building.name,
        buildingType: building.type,
        townName: building.town.name,
        condition: 0,
        isFunctional: false,
        isCondemned: true,
      });
      condemnedCount++;
    }
  }

  console.log(
    `[BuildingMaintenance] Degraded ${degradedCount} buildings. ` +
    `${lowConditionCount} low condition, ${condemnedCount} condemned.`
  );
}

/**
 * Apply war damage to buildings in a town.
 * Called externally when a war event targets a town.
 */
export async function applyWarDamage(townId: string): Promise<{
  damagedBuildings: Array<{ buildingId: string; buildingName: string; damage: number; newCondition: number }>;
}> {
  const townBuildings = await db.query.buildings.findMany({
    where: eq(buildings.townId, townId),
    with: {
      character: { columns: { id: true, name: true } },
      town: { columns: { name: true } },
    },
  });

  // Filter to level >= 1 in JS (Drizzle doesn't support AND on same-table where in query API easily)
  const eligibleBuildings = townBuildings.filter(b => b.level >= 1);

  if (eligibleBuildings.length === 0) {
    return { damagedBuildings: [] };
  }

  // Randomly damage 1-3 buildings
  const numToDamage = Math.min(eligibleBuildings.length, Math.floor(Math.random() * 3) + 1);
  const shuffled = [...eligibleBuildings].sort(() => Math.random() - 0.5);
  const targets = shuffled.slice(0, numToDamage);

  const damagedBuildings: Array<{ buildingId: string; buildingName: string; damage: number; newCondition: number }> = [];

  for (const building of targets) {
    const storageData = building.storage as Record<string, unknown>;
    const currentCondition = (storageData.condition as number) ?? 100;
    const damage = Math.floor(Math.random() * 31) + 20; // 20-50 damage
    const newCondition = Math.max(0, currentCondition - damage);

    await db.update(buildings)
      .set({ storage: { ...storageData, condition: newCondition } })
      .where(eq(buildings.id, building.id));

    emitBuildingDamaged(building.ownerId, {
      buildingId: building.id,
      buildingName: building.name,
      buildingType: building.type,
      townName: building.town.name,
      damage,
      newCondition,
      cause: 'war',
    });

    damagedBuildings.push({
      buildingId: building.id,
      buildingName: building.name,
      damage,
      newCondition,
    });
  }

  console.log(
    `[BuildingMaintenance] War damage applied to ${damagedBuildings.length} buildings in town ${townId}`
  );

  return { damagedBuildings };
}
