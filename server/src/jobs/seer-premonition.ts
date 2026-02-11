/**
 * Seer Premonition — Daily cron job
 * Sends a daily premonition notification to all Psion/Seer characters.
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import { generateSeerPremonition } from '../services/psion-perks';

export function startSeerPremonitionJob() {
  cron.schedule('0 6 * * *', async () => {
    logger.debug({ job: 'seerPremonition' }, 'cron job started');

    try {
      const seers = await prisma.character.findMany({
        where: { class: 'psion', specialization: 'seer' },
        select: { id: true, name: true },
      });

      let sent = 0;
      for (const seer of seers) {
        const premonition = await generateSeerPremonition(seer.id);

        if (premonition) {
          await prisma.notification.create({
            data: {
              characterId: seer.id,
              type: 'seer_premonition',
              title: 'Premonition',
              message: premonition,
              data: { source: 'seer_perk', timestamp: new Date().toISOString() },
            },
          });
          sent++;
        }
      }

      cronJobExecutions.inc({ job: 'seerPremonition', result: 'success' });
      logger.info({ job: 'seerPremonition', sent, total: seers.length }, 'seer premonitions sent');
    } catch (error: any) {
      cronJobExecutions.inc({ job: 'seerPremonition', result: 'failure' });
      logger.error({ job: 'seerPremonition', err: error.message }, 'cron job failed');
    }
  });
}
