import { logger } from '../lib/logger';

/**
 * Gathering auto-complete notification cron job.
 *
 * DEPRECATED: In the daily-tick model, gathering completion is handled by the
 * daily tick processor (daily-tick.ts Step 4). This cron job is no longer needed
 * because there are no timer-based completesAt fields to check.
 *
 * Kept as a no-op to avoid breaking imports.
 */
export function startGatheringAutocompleteJob() {
  // No-op: gathering completion is now handled by the daily tick processor.
  logger.info('GatheringAutocomplete skipped — handled by daily tick');
}
