import cron from 'node-cron';
import { prisma } from '../lib/prisma';
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
        createdAt: event.createdAt.toISOString(),
      });

      cronJobExecutions.inc({ job: 'stateOfAethermere', result: 'success' });
      logger.info({ job: 'stateOfAethermere' }, 'monthly report broadcast complete');
    } catch (error: any) {
      cronJobExecutions.inc({ job: 'stateOfAethermere', result: 'failure' });
      logger.error({ job: 'stateOfAethermere', err: error.message }, 'cron job failed');
    }
  });

  logger.info('StateOfAethermere cron registered (1st of each month)');
}

async function compileReport(): Promise<string> {
  const sections: string[] = [];
  sections.push('=== STATE OF AETHERMERE ===\n');

  // Active wars
  const activeWars = await prisma.war.findMany({
    where: { status: 'ACTIVE' },
    include: {
      attackerKingdom: { select: { name: true } },
      defenderKingdom: { select: { name: true } },
    },
  });

  if (activeWars.length > 0) {
    sections.push('-- ONGOING CONFLICTS --');
    for (const war of activeWars) {
      const duration = Math.floor(
        (Date.now() - war.startedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      sections.push(
        `  ${war.attackerKingdom.name} vs ${war.defenderKingdom.name} ` +
        `(Day ${duration}) — Score: ${war.attackerScore}-${war.defenderScore}`,
      );
    }
    sections.push('');
  } else {
    sections.push('-- ONGOING CONFLICTS --\n  Peace reigns across the land.\n');
  }

  // Active treaties
  const activeTreaties = await prisma.treaty.findMany({
    where: { status: 'ACTIVE' },
    include: {
      proposerKingdom: { select: { name: true } },
      receiverKingdom: { select: { name: true } },
    },
  });

  if (activeTreaties.length > 0) {
    sections.push('-- ACTIVE TREATIES --');
    for (const treaty of activeTreaties) {
      sections.push(
        `  ${treaty.proposerKingdom.name} <-> ${treaty.receiverKingdom.name}: ` +
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

  const recentEvents = await prisma.worldEvent.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      eventType: { not: 'STATE_REPORT' },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (recentEvents.length > 0) {
    sections.push('-- RECENT DEVELOPMENTS --');
    for (const evt of recentEvents) {
      const dateStr = evt.createdAt.toISOString().slice(0, 10);
      sections.push(`  [${dateStr}] ${evt.title}`);
    }
    sections.push('');
  }

  // Kingdom count
  const kingdomCount = await prisma.kingdom.count();
  sections.push(`-- REALM STATISTICS --`);
  sections.push(`  Kingdoms: ${kingdomCount}`);
  sections.push(`  Active Wars: ${activeWars.length}`);
  sections.push(`  Active Treaties: ${activeTreaties.length}`);

  return sections.join('\n');
}
