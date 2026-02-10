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
    try {
      await processDailyTick();
    } catch (error) {
      console.error('[Jobs] Daily tick failed:', error);
    }
  });
  console.log('[Jobs] Daily tick cron registered (daily at 00:00 UTC)');

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
