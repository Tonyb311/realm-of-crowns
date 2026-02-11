import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';

/**
 * Tax collection cron job.
 * Runs every hour to process tax from recent marketplace transactions
 * and deposit it into the appropriate town treasuries.
 */
export function startTaxCollectionJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    logger.debug({ job: 'taxCollection' }, 'cron job started');
    try {
      await collectTaxes();
      cronJobExecutions.inc({ job: 'taxCollection', result: 'success' });
    } catch (error: any) {
      cronJobExecutions.inc({ job: 'taxCollection', result: 'failure' });
      logger.error({ job: 'taxCollection', err: error.message }, 'cron job failed');
    }
  });

  logger.info('TaxCollection cron registered (every hour)');
}

async function collectTaxes() {
  // P0 #6 FIX: Marketplace tax is collected at purchase time in market.ts. Do not double-collect here.
  // This cron job now only updates lastCollectedAt timestamps so the treasury tracking stays current.
  // If future non-marketplace tax types are added (e.g. property tax, income tax), collect them here.

  const treasuries = await prisma.townTreasury.findMany();

  for (const treasury of treasuries) {
    // Check if there were any transactions since last collection (for timestamp tracking)
    const transactionCount = await prisma.tradeTransaction.count({
      where: {
        townId: treasury.townId,
        timestamp: { gt: treasury.lastCollectedAt },
      },
    });

    if (transactionCount === 0) continue;

    // Update lastCollectedAt only — tax was already deposited at purchase time in market.ts
    await prisma.townTreasury.update({
      where: { id: treasury.id },
      data: {
        lastCollectedAt: new Date(),
      },
    });

    console.log(
      `[TaxCollection] Updated timestamp for town ${treasury.townId} (${transactionCount} transactions already taxed at purchase)`
    );
  }
}
