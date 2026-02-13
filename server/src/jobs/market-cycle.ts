// ---------------------------------------------------------------------------
// Market Cycle Timer — Periodically resolves auction cycles for all towns
// ---------------------------------------------------------------------------

import { resolveAllTownAuctions } from '../lib/auction-engine';
import { logger } from '../lib/logger';

let intervalId: NodeJS.Timeout | null = null;

export function startMarketCycleTimer(): void {
  if (intervalId) return; // already running

  // Check every 60 seconds if any town's cycle is due
  intervalId = setInterval(async () => {
    try {
      const result = await resolveAllTownAuctions();
      if (result.transactionsCompleted > 0) {
        logger.info(result, 'Market cycle resolved');
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Market cycle timer error');
    }
  }, 60_000);

  logger.info('Market cycle timer started (checking every 60s)');
}

export function stopMarketCycleTimer(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Market cycle timer stopped');
  }
}
