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
  // Get all town treasuries
  const treasuries = await prisma.townTreasury.findMany();

  for (const treasury of treasuries) {
    // Find transactions in this town since last collection
    const transactions = await prisma.tradeTransaction.findMany({
      where: {
        townId: treasury.townId,
        timestamp: { gt: treasury.lastCollectedAt },
      },
    });

    if (transactions.length === 0) continue;

    // Calculate tax owed on each transaction
    const policy = await prisma.townPolicy.findUnique({
      where: { townId: treasury.townId },
    });
    const taxRate = policy?.taxRate ?? treasury.taxRate;

    let totalTax = 0;
    for (const tx of transactions) {
      totalTax += Math.floor(tx.price * tx.quantity * taxRate);
    }

    if (totalTax <= 0) continue;

    // Update treasury balance and last collected timestamp
    await prisma.townTreasury.update({
      where: { id: treasury.id },
      data: {
        balance: { increment: totalTax },
        lastCollectedAt: new Date(),
      },
    });

    console.log(
      `[TaxCollection] Collected ${totalTax} gold from ${transactions.length} transactions in town ${treasury.townId}`
    );
  }
}
