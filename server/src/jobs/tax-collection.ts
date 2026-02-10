import cron from 'node-cron';
import { prisma } from '../lib/prisma';

/**
 * Tax collection cron job.
 * Runs every hour to process tax from recent marketplace transactions
 * and deposit it into the appropriate town treasuries.
 */
export function startTaxCollectionJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[TaxCollection] Running hourly tax collection...');
    try {
      await collectTaxes();
    } catch (error) {
      console.error('[TaxCollection] Error:', error);
    }
  });

  console.log('[TaxCollection] Cron job registered (every hour)');
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
