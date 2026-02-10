import cron from 'node-cron';
import { prisma } from '../lib/prisma';

/**
 * Resource regeneration cron job.
 * Runs every 30 minutes to restore TownResource abundance by each resource's respawnRate.
 * Abundance is capped at 100.
 */
export function startResourceRegenerationJob() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[ResourceRegeneration] Running resource regeneration...');
    try {
      await regenerateResources();
    } catch (error) {
      console.error('[ResourceRegeneration] Error:', error);
    }
  });

  console.log('[ResourceRegeneration] Cron job registered (every 30 minutes)');
}

async function regenerateResources() {
  // Fetch all town resources that are below 100 abundance
  const depleted = await prisma.townResource.findMany({
    where: { abundance: { lt: 100 } },
  });

  if (depleted.length === 0) {
    console.log('[ResourceRegeneration] All resources at full abundance.');
    return;
  }

  let restored = 0;
  for (const resource of depleted) {
    const increment = Math.max(1, Math.round(resource.respawnRate));
    const newAbundance = Math.min(100, resource.abundance + increment);

    if (newAbundance !== resource.abundance) {
      await prisma.townResource.update({
        where: { id: resource.id },
        data: { abundance: newAbundance },
      });
      restored++;
    }
  }

  console.log(`[ResourceRegeneration] Restored abundance for ${restored} town resources.`);
}
