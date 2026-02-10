import { prisma } from '../lib/prisma';
import { getGameDay } from '../lib/game-day';

export async function processReputationDecay(): Promise<void> {
  const gameDay = getGameDay();
  const decayThreshold = gameDay - 7; // 7 days of inactivity

  const staleReps = await prisma.serviceReputation.findMany({
    where: { lastActiveDay: { lt: decayThreshold }, reputation: { gt: 0 } },
  });

  for (const rep of staleReps) {
    await prisma.serviceReputation.update({
      where: { id: rep.id },
      data: { reputation: Math.max(0, rep.reputation - 1) },
    });
  }

  if (staleReps.length > 0) {
    console.log(`[ReputationDecay] Decayed reputation for ${staleReps.length} inactive service provider(s)`);
  }
}
