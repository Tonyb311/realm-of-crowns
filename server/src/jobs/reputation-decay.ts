import { db } from '../lib/db';
import { eq, lt, gt, and } from 'drizzle-orm';
import { serviceReputations } from '@database/tables';
import { getGameDay } from '../lib/game-day';

export async function processReputationDecay(): Promise<void> {
  const gameDay = getGameDay();
  const decayThreshold = gameDay - 7; // 7 days of inactivity

  const staleReps = await db.query.serviceReputations.findMany({
    where: and(lt(serviceReputations.lastActiveDay, decayThreshold), gt(serviceReputations.reputation, 0)),
  });

  for (const rep of staleReps) {
    await db.update(serviceReputations)
      .set({ reputation: Math.max(0, rep.reputation - 1) })
      .where(eq(serviceReputations.id, rep.id));
  }

  if (staleReps.length > 0) {
    console.log(`[ReputationDecay] Decayed reputation for ${staleReps.length} inactive service provider(s)`);
  }
}
