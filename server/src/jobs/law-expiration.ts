import cron from 'node-cron';
import { prisma } from '../lib/prisma';

/**
 * Law expiration cron job.
 * Runs every 15 minutes to check for laws that have passed their expiresAt date
 * and marks them as expired.
 */
export function startLawExpirationJob() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[LawExpiration] Checking for expired laws...');
    try {
      await expireLaws();
    } catch (error) {
      console.error('[LawExpiration] Error:', error);
    }
  });

  console.log('[LawExpiration] Cron job registered (every 15 minutes)');
}

async function expireLaws() {
  const now = new Date();

  const result = await prisma.law.updateMany({
    where: {
      status: 'active',
      expiresAt: { lte: now },
    },
    data: {
      status: 'expired',
    },
  });

  if (result.count > 0) {
    console.log(`[LawExpiration] Expired ${result.count} law(s)`);
  }
}
