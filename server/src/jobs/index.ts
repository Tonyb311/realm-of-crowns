/**
 * Job Registry
 *
 * The daily tick processor replaces all individual cron jobs.
 * Individual jobs are commented out below for reference.
 */

import cron from 'node-cron';
import type { Server } from 'socket.io';
import { processDailyTick } from './daily-tick';
import { startForgebornMaintenanceJob } from './forgeborn-maintenance';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { cronJobExecutions, cronJobDuration } from '../lib/metrics';

// ---------------------------------------------------------------------------
// Replaced by daily-tick.ts — kept as comments for reference
// ---------------------------------------------------------------------------
// import { startElectionLifecycle } from './election-lifecycle';
// import { startResourceRegenerationJob } from './resource-regeneration';
// import { startTaxCollectionJob } from './tax-collection';
// import { startLawExpirationJob } from './law-expiration';
// import { startPropertyTaxJob } from './property-tax';
// import { startBuildingMaintenanceJob } from './building-maintenance';
// import { startGatheringAutocompleteJob } from './gathering-autocomplete';
// import { startConstructionCompleteJob } from './construction-complete';
// import { startCaravanEventsJob } from './caravan-events';
// import { startStateOfAethermereJob } from './state-of-aethermere';

export function registerJobs(_io: Server) {
  // -----------------------------------------------------------------------
  // Daily Tick — single orchestrated processor (replaces 10 individual jobs)
  // -----------------------------------------------------------------------
  cron.schedule('0 0 * * *', async () => {
    const jobName = 'dailyTick';
    const end = cronJobDuration.startTimer({ job: jobName });
    logger.info({ job: jobName }, 'cron job started');

    try {
      await processDailyTick();
      end();
      cronJobExecutions.inc({ job: jobName, result: 'success' });
      logger.info({ job: jobName }, 'cron job completed successfully');

      // P3 #64: Record last success timestamp for health check freshness
      if (redis) {
        await redis.set('dailyTick:lastSuccess', Date.now().toString());
      }
    } catch (error: any) {
      end();
      cronJobExecutions.inc({ job: jobName, result: 'failure' });
      logger.error({ job: jobName, err: error.message, stack: error.stack }, 'cron job FAILED');
    }
  });
  logger.info('Daily tick cron registered (daily at 00:00 UTC)');

  // -----------------------------------------------------------------------
  // Forgeborn Maintenance — race-specific, runs independently
  // -----------------------------------------------------------------------
  startForgebornMaintenanceJob();

  // -----------------------------------------------------------------------
  // Commented out — replaced by daily tick Steps 1-12
  // -----------------------------------------------------------------------
  // startElectionLifecycle(io);       // -> Step 8
  // startResourceRegenerationJob();   // -> Step 7
  // startTaxCollectionJob();          // -> Step 7
  // startLawExpirationJob();          // -> Step 6
  // startPropertyTaxJob();            // -> Step 7
  // startBuildingMaintenanceJob();    // -> Step 7
  // startGatheringAutocompleteJob();  // -> Step 4 (daily actions replace real-time gathering)
  // startConstructionCompleteJob();   // -> still notification-based, not tick-dependent
  // startCaravanEventsJob();          // -> Step 7
  // startStateOfAethermereJob();      // -> Step 11
}
