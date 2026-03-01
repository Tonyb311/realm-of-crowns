import cron from 'node-cron';
import { processTravelTick } from '../lib/travel-tick';
import { logger } from '../lib/logger';
import { cronJobExecutions, cronJobDuration } from '../lib/metrics';
import type { Server } from 'socket.io';

/**
 * Travel tick cron job.
 *
 * Runs once per day at the configured TICK_HOUR (default 0 = midnight UTC).
 * Each tick advances all active travelers by 1 node along their route.
 * Emits a Socket.io event with the tick results so clients can update.
 */
export function startTravelTickJob(io: Server) {
  const tickHour = parseInt(process.env.TICK_HOUR || '0', 10);

  cron.schedule(`0 ${tickHour} * * *`, async () => {
    const jobName = 'travelTick';
    const end = cronJobDuration.startTimer({ job: jobName });
    logger.info({ job: jobName }, 'Travel tick cron job started');

    try {
      const result = await processTravelTick();
      end();
      cronJobExecutions.inc({ job: jobName, result: 'success' });

      logger.info(
        {
          job: jobName,
          soloMoved: result.soloMoved,
          soloArrived: result.soloArrived,
          groupsMoved: result.groupsMoved,
          groupsArrived: result.groupsArrived,
          errors: result.errors,
        },
        'Travel tick cron job completed',
      );

      // Broadcast tick results to all connected clients
      io.emit('travel:tick-processed', {
        ...result,
        processedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      end();
      cronJobExecutions.inc({ job: jobName, result: 'failure' });
      const errStr = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      logger.error(
        { job: jobName, err: errStr, stack: errStack },
        'Travel tick cron job FAILED',
      );
    }
  });

  logger.info({ tickHour }, 'Travel tick cron registered');
}
