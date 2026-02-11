import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';

/**
 * Resource regeneration cron job.
 * Runs every 30 minutes to restore TownResource abundance by each resource's respawnRate.
 * Abundance is capped at 100.
 */
export function startResourceRegenerationJob() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.debug({ job: 'resourceRegeneration' }, 'cron job started');
    try {
      await regenerateResources();
      cronJobExecutions.inc({ job: 'resourceRegeneration', result: 'success' });
    } catch (error: any) {
      cronJobExecutions.inc({ job: 'resourceRegeneration', result: 'failure' });
      logger.error({ job: 'resourceRegeneration', err: error.message }, 'cron job failed');
    }
  });

  logger.info('ResourceRegeneration cron registered (every 30 minutes)');
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
