import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, gte, desc, count, sql } from 'drizzle-orm';
import { wars, treaties, worldEvents, kingdoms } from '@database/tables';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import { generateStateReport } from '../services/herald';
import { emitStateReport } from '../socket/events';

// ---------------------------------------------------------------------------
// State of Aethermere — monthly summary report broadcast to all players
// ---------------------------------------------------------------------------

export function startStateOfAethermereJob() {
  // Run on the 1st of every month at midnight
  cron.schedule('0 0 1 * *', async () => {
    logger.info({ job: 'stateOfAethermere' }, 'cron job started');
    try {
      const report = await compileReport();
      const event = await generateStateReport(report);

      emitStateReport({
        id: event.id,
        title: event.title,
        description: event.description,
        createdAt: event.createdAt,
      });

      cronJobExecutions.inc({ job: 'stateOfAethermere', result: 'success' });
      logger.info({ job: 'stateOfAethermere' }, 'monthly report broadcast complete');
    } catch (error: unknown) {
      cronJobExecutions.inc({ job: 'stateOfAethermere', result: 'failure' });
      logger.error({ job: 'stateOfAethermere', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });

  logger.info('StateOfAethermere cron registered (1st of each month)');
}

async function compileReport(): Promise<string> {
  const sections: string[] = [];
  sections.push('=== STATE OF AETHERMERE ===\n');

  // Active wars
  const activeWars = await db.query.wars.findMany({
    where: eq(wars.status, 'ACTIVE'),
    with: {
      kingdom_attackerKingdomId: { columns: { name: true } },
      kingdom_defenderKingdomId: { columns: { name: true } },
    },
  });

  if (activeWars.length > 0) {
    sections.push('-- ONGOING CONFLICTS --');
    for (const war of activeWars) {
      const duration = Math.floor(
        (Date.now() - new Date(war.startedAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      sections.push(
        `  ${war.kingdom_attackerKingdomId.name} vs ${war.kingdom_defenderKingdomId.name} ` +
        `(Day ${duration}) — Score: ${war.attackerScore}-${war.defenderScore}`,
      );
    }
    sections.push('');
  } else {
    sections.push('-- ONGOING CONFLICTS --\n  Peace reigns across the land.\n');
  }

  // Active treaties
  const activeTreaties = await db.query.treaties.findMany({
    where: eq(treaties.status, 'ACTIVE'),
    with: {
      kingdom_proposerKingdomId: { columns: { name: true } },
      kingdom_receiverKingdomId: { columns: { name: true } },
    },
  });

  if (activeTreaties.length > 0) {
    sections.push('-- ACTIVE TREATIES --');
    for (const treaty of activeTreaties) {
      sections.push(
        `  ${treaty.kingdom_proposerKingdomId.name} <-> ${treaty.kingdom_receiverKingdomId.name}: ` +
        `${treaty.type.replace('_', ' ')}`,
      );
    }
    sections.push('');
  } else {
    sections.push('-- ACTIVE TREATIES --\n  No treaties currently in effect.\n');
  }

  // Recent events (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEvents = await db.query.worldEvents.findMany({
    where: sql`${worldEvents.createdAt} >= ${thirtyDaysAgo.toISOString()} AND ${worldEvents.eventType} != 'STATE_REPORT'`,
    orderBy: desc(worldEvents.createdAt),
    limit: 10,
  });

  if (recentEvents.length > 0) {
    sections.push('-- RECENT DEVELOPMENTS --');
    for (const evt of recentEvents) {
      const dateStr = new Date(evt.createdAt).toISOString().slice(0, 10);
      sections.push(`  [${dateStr}] ${evt.title}`);
    }
    sections.push('');
  }

  // Kingdom count
  const [{ kingdomCount }] = await db.select({ kingdomCount: count() }).from(kingdoms);
  sections.push(`-- REALM STATISTICS --`);
  sections.push(`  Kingdoms: ${kingdomCount}`);
  sections.push(`  Active Wars: ${activeWars.length}`);
  sections.push(`  Active Treaties: ${activeTreaties.length}`);

  return sections.join('\n');
}
