import cron from 'node-cron';
import { prisma } from '../lib/prisma';
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
    } catch (error: any) {
      cronJobExecutions.inc({ job: 'lawExpiration', result: 'failure' });
      logger.error({ job: 'lawExpiration', err: error.message }, 'cron job failed');
    }
  });

  logger.info('LawExpiration cron registered (every 15 minutes)');
}

async function expireLaws() {
  const now = new Date();

  const result = await prisma.law.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (result.count > 0) {
    console.log(`[LawExpiration] Expired ${result.count} law(s)`);
  }
}
