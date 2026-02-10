/**
 * Seer Premonition — Daily cron job
 * Sends a daily premonition notification to all Psion/Seer characters.
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { generateSeerPremonition } from '../services/psion-perks';

export function startSeerPremonitionJob() {
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Seer Premonition: generating daily visions...');

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

      console.log(`[Cron] Seer Premonition: sent ${sent} visions to ${seers.length} Seers`);
    } catch (error) {
      console.error('[Cron] Seer Premonition error:', error);
    }
  });
}
