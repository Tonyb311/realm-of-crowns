/**
 * Ensures core game content is released at server startup.
 * Without this, a fresh DB has no released races or towns,
 * making character creation impossible (500 or 400 errors).
 *
 * Idempotent: only creates ContentRelease rows that don't exist,
 * and only auto-releases core-tier content when nothing is released yet.
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { getAllRaces } from '@shared/data/races';

export async function ensureCoreContentReleased(): Promise<void> {
  try {
    // Check if any races are already released (admin has managed content)
    const releasedCount = await prisma.contentRelease.count({
      where: { contentType: 'race', isReleased: true },
    });

    if (releasedCount > 0) return; // Content is admin-managed, don't override

    const allRaces = getAllRaces();
    const now = new Date();
    let racesReleased = 0;
    let townsReleased = 0;

    // Upsert ContentRelease rows for all races; auto-release core tier
    for (const race of allRaces) {
      const isCore = race.tier === 'core';
      await prisma.contentRelease.upsert({
        where: { contentType_contentId: { contentType: 'race', contentId: race.id } },
        update: {},
        create: {
          contentType: 'race',
          contentId: race.id,
          contentName: race.name,
          tier: race.tier,
          isReleased: isCore,
          releasedAt: isCore ? now : null,
        },
      });
      if (isCore) racesReleased++;
    }

    // Release all core-race home towns
    for (const race of allRaces.filter(r => r.tier === 'core')) {
      if (race.startingTowns.length === 0) continue;
      const result = await prisma.town.updateMany({
        where: {
          name: { in: race.startingTowns, mode: 'insensitive' },
          isReleased: false,
        },
        data: { isReleased: true, releasedAt: now },
      });
      townsReleased += result.count;
    }

    logger.warn(
      { racesReleased, townsReleased },
      'No released content found — auto-released core races and home towns',
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to ensure core content released');
  }
}
