/**
 * Seer Premonition — Daily cron job
 * Sends a daily premonition notification to all Psion/Seer characters.
 */

import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { characters, notifications } from '@database/tables';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import { generateSeerPremonition } from '../services/psion-perks';

export function startSeerPremonitionJob() {
  cron.schedule('0 6 * * *', async () => {
    logger.debug({ job: 'seerPremonition' }, 'cron job started');

    try {
      const seers = await db.query.characters.findMany({
        where: and(eq(characters.class, 'psion'), eq(characters.specialization, 'seer')),
        columns: { id: true, name: true },
      });

      let sent = 0;
      for (const seer of seers) {
        const premonition = await generateSeerPremonition(seer.id);

        if (premonition) {
          await db.insert(notifications).values({
            id: crypto.randomUUID(),
            characterId: seer.id,
            type: 'seer_premonition',
            title: 'Premonition',
            message: premonition,
            data: { source: 'seer_perk', timestamp: new Date().toISOString() },
          });
          sent++;
        }
      }

      cronJobExecutions.inc({ job: 'seerPremonition', result: 'success' });
      logger.info({ job: 'seerPremonition', sent, total: seers.length }, 'seer premonitions sent');
    } catch (error: unknown) {
      cronJobExecutions.inc({ job: 'seerPremonition', result: 'failure' });
      logger.error({ job: 'seerPremonition', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });
}
