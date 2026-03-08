import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, lte, and, sql } from 'drizzle-orm';
import { laws } from '@database/tables';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';

/**
 * Law expiration cron job.
 * Runs every 15 minutes to check for laws that have passed their expiresAt date
 * and marks them as expired.
 */
export function startLawExpirationJob() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.debug({ job: 'lawExpiration' }, 'cron job started');
    try {
      await expireLaws();
      cronJobExecutions.inc({ job: 'lawExpiration', result: 'success' });
    } catch (error: unknown) {
      cronJobExecutions.inc({ job: 'lawExpiration', result: 'failure' });
      logger.error({ job: 'lawExpiration', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });

  logger.info('LawExpiration cron registered (every 15 minutes)');
}

async function expireLaws() {
  const now = new Date();

  const result = await db.update(laws)
    .set({ status: 'EXPIRED' })
    .where(and(
      eq(laws.status, 'ACTIVE'),
      lte(laws.expiresAt, now.toISOString()),
    ));

  const count = result.rowCount ?? 0;
  if (count > 0) {
    console.log(`[LawExpiration] Expired ${count} law(s)`);
  }
}
