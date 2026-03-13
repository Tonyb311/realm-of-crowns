import cron from 'node-cron';
import { db } from '../lib/db';
import { combatSessions } from '@database/tables';
import { and, eq, lt, inArray } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import { emitChallengeExpired } from '../socket/events';

const CHALLENGE_EXPIRY_MINUTES = 10;

export function startChallengeExpiryJob() {
  cron.schedule('*/5 * * * *', async () => {
    logger.debug({ job: 'challengeExpiry' }, 'cron job started');
    try {
      const cutoff = new Date(Date.now() - CHALLENGE_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // Find expired PENDING challenges
      const expired = await db.query.combatSessions.findMany({
        where: and(
          eq(combatSessions.status, 'PENDING'),
          inArray(combatSessions.type, ['DUEL', 'SPAR']),
          lt(combatSessions.startedAt, cutoff),
        ),
      });

      if (expired.length === 0) {
        cronJobExecutions.inc({ job: 'challengeExpiry', result: 'success' });
        return;
      }

      // Cancel each expired session and notify the challenger
      for (const session of expired) {
        await db.update(combatSessions).set({
          status: 'CANCELLED',
          endedAt: new Date().toISOString(),
        }).where(eq(combatSessions.id, session.id));

        const sessionLog = session.log as { challengerId?: string } | null;
        if (sessionLog?.challengerId) {
          emitChallengeExpired(sessionLog.challengerId, {
            sessionId: session.id,
            type: session.type,
          });
        }
      }

      logger.info({ job: 'challengeExpiry', expired: expired.length }, 'expired challenges cancelled');
      cronJobExecutions.inc({ job: 'challengeExpiry', result: 'success' });
    } catch (error) {
      cronJobExecutions.inc({ job: 'challengeExpiry', result: 'failure' });
      logger.error({ job: 'challengeExpiry', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });
  logger.info('ChallengeExpiry cron registered (every 5 minutes)');
}
