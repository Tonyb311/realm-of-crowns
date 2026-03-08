/**
 * Ensures core game content is released at server startup.
 * Without this, a fresh DB has no released races or towns,
 * making character creation impossible (500 or 400 errors).
 *
 * Idempotent: only creates ContentRelease rows that don't exist,
 * and only auto-releases core-tier content when nothing is released yet.
 */

import crypto from 'crypto';
import { db } from './db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { contentReleases, towns } from '@database/tables';
import { logger } from './logger';
import { getAllRaces } from '@shared/data/races';

export async function ensureCoreContentReleased(): Promise<void> {
  try {
    // Check if any races are already released (admin has managed content)
    const [releasedResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(contentReleases)
      .where(and(eq(contentReleases.contentType, 'race'), eq(contentReleases.isReleased, true)));

    const releasedCount = releasedResult?.count ?? 0;

    if (releasedCount > 0) return; // Content is admin-managed, don't override

    const allRaces = getAllRaces();
    const now = new Date().toISOString();
    let racesReleased = 0;
    let townsReleased = 0;

    // Upsert ContentRelease rows for all races; auto-release core tier
    for (const race of allRaces) {
      const isCore = race.tier === 'core';
      await db.insert(contentReleases).values({
        id: crypto.randomUUID(),
        contentType: 'race',
        contentId: race.id,
        contentName: race.name,
        tier: race.tier,
        isReleased: isCore,
        releasedAt: isCore ? now : null,
        updatedAt: now,
      }).onConflictDoNothing();
      if (isCore) racesReleased++;
    }

    // Release all core-race home towns
    for (const race of allRaces.filter(r => r.tier === 'core')) {
      if (race.startingTowns.length === 0) continue;
      const result = await db.update(towns)
        .set({ isReleased: true, releasedAt: now })
        .where(
          and(
            sql`lower(${towns.name}) IN (${sql.join(race.startingTowns.map(n => sql`lower(${n})`), sql`, `)})`,
            eq(towns.isReleased, false),
          )
        );
      // Drizzle update returns the rows affected via .returning() but updateMany count isn't directly available
      // We'll count via the returned rows if needed, but for logging purposes just increment
      townsReleased += (result as any).rowCount ?? 0;
    }

    logger.warn(
      { racesReleased, townsReleased },
      'No released content found — auto-released core races and home towns',
    );
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to ensure core content released');
  }
}
