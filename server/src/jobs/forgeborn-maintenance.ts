/**
 * @deprecated Forgeborn maintenance is now handled by the daily tick system
 * via processForgebornMaintenance() in food-system.ts.
 * This standalone cron job is no longer started.
 * Safe to delete after migration is verified.
 */

import { logger } from '../lib/logger';

/**
 * @deprecated No-op stub. Maintenance is now handled by daily tick.
 */
export function startForgebornMaintenanceJob() {
  logger.info('ForgebornMaintenance DEPRECATED — handled by daily tick, skipping');
}
