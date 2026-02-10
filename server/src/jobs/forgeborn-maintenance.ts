/**
 * @deprecated Forgeborn maintenance is now handled by the daily tick system
 * via processForgebornMaintenance() in food-system.ts.
 * This standalone cron job is no longer started.
 * Safe to delete after migration is verified.
 */

/**
 * @deprecated No-op stub. Maintenance is now handled by daily tick.
 */
export function startForgebornMaintenanceJob() {
  console.log('[ForgebornMaintenance] DEPRECATED — maintenance handled by daily tick. Skipping cron registration.');
}
