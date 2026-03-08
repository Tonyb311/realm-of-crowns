import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, lte, and } from 'drizzle-orm';
import { buildingConstructions } from '@database/tables';
import { emitBuildingConstructed } from '../socket/events';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';

/**
 * Construction completion notification cron job.
 * Runs every 5 minutes, finds constructions where completesAt <= now and
 * status is still IN_PROGRESS, then emits a Socket.io 'building:constructed'
 * event to the building owner so they know to finalize.
 *
 * Does NOT auto-complete -- just notifies. Player must call complete-construction.
 */
export function startConstructionCompleteJob() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await notifyCompletedConstructions();
      cronJobExecutions.inc({ job: 'constructionComplete', result: 'success' });
    } catch (error: unknown) {
      cronJobExecutions.inc({ job: 'constructionComplete', result: 'failure' });
      logger.error({ job: 'constructionComplete', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });

  logger.info('ConstructionComplete cron registered (every 5 minutes)');
}

async function notifyCompletedConstructions() {
  const now = new Date();

  const readyConstructions = await db.query.buildingConstructions.findMany({
    where: and(
      eq(buildingConstructions.status, 'IN_PROGRESS'),
      lte(buildingConstructions.completesAt, now.toISOString()),
    ),
    with: {
      building: {
        columns: {
          id: true,
          name: true,
          type: true,
          level: true,
          ownerId: true,
        },
        with: {
          town: { columns: { id: true, name: true } },
        },
      },
    },
  });

  for (const construction of readyConstructions) {
    emitBuildingConstructed(construction.building.ownerId, {
      buildingId: construction.building.id,
      buildingName: construction.building.name,
      buildingType: construction.building.type,
      targetLevel: construction.building.level + 1,
      townName: construction.building.town.name,
    });
  }

  if (readyConstructions.length > 0) {
    console.log(`[ConstructionComplete] Notified ${readyConstructions.length} player(s) of ready constructions.`);
  }
}
