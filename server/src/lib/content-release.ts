import { prisma } from './prisma';
import { redis } from './redis';
import { logger } from './logger';

const RELEASED_RACES_KEY = 'content:released-races';
const RELEASED_TOWNS_KEY = 'content:released-towns';
const CACHE_TTL = 300; // 5 minutes

// ---------------------------------------------------------------------------
// Read helpers (cached)
// ---------------------------------------------------------------------------

/**
 * Returns a Set of released race registry keys (e.g. "human", "elf").
 * Cached in Redis for 5 minutes.
 */
export async function getReleasedRaceKeys(): Promise<Set<string>> {
  if (redis) {
    try {
      const cached = await redis.get(RELEASED_RACES_KEY);
      if (cached) return new Set(JSON.parse(cached));
    } catch (err) {
      logger.error({ err }, 'Redis read error for released races');
    }
  }

  const rows = await prisma.contentRelease.findMany({
    where: { contentType: 'race', isReleased: true },
    select: { contentId: true },
  });

  const keys = rows.map(r => r.contentId);

  if (redis) {
    try {
      await redis.set(RELEASED_RACES_KEY, JSON.stringify(keys), 'EX', CACHE_TTL);
    } catch (err) {
      logger.error({ err }, 'Redis write error for released races');
    }
  }

  return new Set(keys);
}

/**
 * Returns a Set of released town UUIDs.
 * Cached in Redis for 5 minutes.
 */
export async function getReleasedTownIds(): Promise<Set<string>> {
  if (redis) {
    try {
      const cached = await redis.get(RELEASED_TOWNS_KEY);
      if (cached) return new Set(JSON.parse(cached));
    } catch (err) {
      logger.error({ err }, 'Redis read error for released towns');
    }
  }

  const rows = await prisma.town.findMany({
    where: { isReleased: true },
    select: { id: true },
  });

  const ids = rows.map(r => r.id);

  if (redis) {
    try {
      await redis.set(RELEASED_TOWNS_KEY, JSON.stringify(ids), 'EX', CACHE_TTL);
    } catch (err) {
      logger.error({ err }, 'Redis write error for released towns');
    }
  }

  return new Set(ids);
}

export async function isRaceReleased(raceKey: string): Promise<boolean> {
  // If no ContentRelease rows exist at all (fresh DB before startup seed),
  // allow all races so character creation doesn't fail with 400.
  const totalRows = await prisma.contentRelease.count({ where: { contentType: 'race' } });
  if (totalRows === 0) return true;

  const released = await getReleasedRaceKeys();
  return released.has(raceKey);
}

export async function isTownReleased(townId: string): Promise<boolean> {
  const released = await getReleasedTownIds();
  return released.has(townId);
}

// ---------------------------------------------------------------------------
// Admin read helpers
// ---------------------------------------------------------------------------

export async function getContentReleaseMap() {
  // Races
  const raceReleases = await prisma.contentRelease.findMany({
    where: { contentType: 'race' },
    orderBy: [{ tier: 'asc' }, { releaseOrder: 'asc' }, { contentName: 'asc' }],
  });

  // Count characters per race
  const raceCounts = await prisma.character.groupBy({
    by: ['race'],
    _count: { race: true },
  });
  const raceCountMap: Record<string, number> = {};
  for (const rc of raceCounts) {
    raceCountMap[rc.race.toLowerCase()] = rc._count.race;
  }

  const races = raceReleases.map(r => ({
    ...r,
    playerCount: raceCountMap[r.contentId] ?? 0,
  }));

  // Towns
  const towns = await prisma.town.findMany({
    select: {
      id: true,
      name: true,
      regionId: true,
      isReleased: true,
      releasedAt: true,
      releaseOrder: true,
      releaseNotes: true,
      region: { select: { id: true, name: true } },
      _count: { select: { characters: true } },
    },
    orderBy: [{ region: { name: 'asc' } }, { releaseOrder: 'asc' }, { name: 'asc' }],
  });

  const townItems = towns.map(t => ({
    id: t.id,
    name: t.name,
    regionId: t.regionId,
    regionName: t.region.name,
    isReleased: t.isReleased,
    releasedAt: t.releasedAt,
    releaseOrder: t.releaseOrder,
    releaseNotes: t.releaseNotes,
    playerCount: t._count.characters,
  }));

  const totalRaces = races.length;
  const releasedRaces = races.filter(r => r.isReleased).length;
  const totalTowns = townItems.length;
  const releasedTowns = townItems.filter(t => t.isReleased).length;

  return {
    summary: {
      totalRaces,
      releasedRaces,
      totalTowns,
      releasedTowns,
      percentReleased: totalRaces + totalTowns > 0
        ? Math.round(((releasedRaces + releasedTowns) / (totalRaces + totalTowns)) * 100)
        : 0,
    },
    races,
    towns: townItems,
  };
}

// ---------------------------------------------------------------------------
// Release / Unrelease
// ---------------------------------------------------------------------------

export async function releaseContent(
  contentType: string,
  contentId: string,
  notes?: string,
): Promise<{ success: true }> {
  const now = new Date();

  if (contentType === 'town') {
    await prisma.town.update({
      where: { id: contentId },
      data: { isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined },
    });
  } else {
    await prisma.contentRelease.update({
      where: { contentType_contentId: { contentType, contentId } },
      data: { isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined },
    });
  }

  await invalidateContentCache();
  return { success: true };
}

export async function unreleaseContent(
  contentType: string,
  contentId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  // Safety checks
  if (contentType === 'race') {
    const raceEnum = contentId.toUpperCase();
    const count = await prisma.character.count({ where: { race: raceEnum as any } });
    if (count > 0) {
      return {
        success: false,
        error: `Cannot unrelease: ${count} character(s) belong to the ${contentId} race`,
      };
    }
  }

  if (contentType === 'town') {
    const count = await prisma.character.count({ where: { currentTownId: contentId } });
    if (count > 0) {
      return {
        success: false,
        error: `Cannot unrelease: ${count} character(s) are currently in this town`,
      };
    }
  }

  if (contentType === 'town') {
    await prisma.town.update({
      where: { id: contentId },
      data: { isReleased: false, releasedAt: null, releaseNotes: notes ?? undefined },
    });
  } else {
    await prisma.contentRelease.update({
      where: { contentType_contentId: { contentType, contentId } },
      data: { isReleased: false, releasedAt: null, releaseNotes: notes ?? undefined },
    });
  }

  await invalidateContentCache();
  return { success: true };
}

export async function bulkRelease(
  contentType: string,
  ids: string[],
  notes?: string,
): Promise<{ released: number }> {
  const now = new Date();

  if (contentType === 'town') {
    const result = await prisma.town.updateMany({
      where: { id: { in: ids } },
      data: { isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined },
    });
    await invalidateContentCache();
    return { released: result.count };
  } else {
    const result = await prisma.contentRelease.updateMany({
      where: { contentType, contentId: { in: ids } },
      data: { isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined },
    });
    await invalidateContentCache();
    return { released: result.count };
  }
}

// ---------------------------------------------------------------------------
// Cache invalidation
// ---------------------------------------------------------------------------

export async function invalidateContentCache(): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(RELEASED_RACES_KEY, RELEASED_TOWNS_KEY);
  } catch (err) {
    logger.error({ err }, 'Failed to invalidate content release cache');
  }
}
