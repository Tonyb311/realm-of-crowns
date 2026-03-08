import { db } from './db';
import { eq, and, sql, inArray, asc, desc } from 'drizzle-orm';
import { contentReleases, towns, characters, regions } from '@database/tables';
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

  const rows = await db.query.contentReleases.findMany({
    where: and(eq(contentReleases.contentType, 'race'), eq(contentReleases.isReleased, true)),
    columns: { contentId: true },
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

  const rows = await db.query.towns.findMany({
    where: eq(towns.isReleased, true),
    columns: { id: true },
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
  const [result] = await db.select({ count: sql<number>`count(*)::int` })
    .from(contentReleases)
    .where(eq(contentReleases.contentType, 'race'));
  const totalRows = result?.count ?? 0;
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
  const raceReleases = await db.query.contentReleases.findMany({
    where: eq(contentReleases.contentType, 'race'),
    orderBy: [asc(contentReleases.tier), asc(contentReleases.releaseOrder), asc(contentReleases.contentName)],
  });

  // Count characters per race — use raw SQL groupBy
  const raceCounts = await db.select({
    race: characters.race,
    count: sql<number>`count(*)::int`,
  })
    .from(characters)
    .groupBy(characters.race);

  const raceCountMap: Record<string, number> = {};
  for (const rc of raceCounts) {
    raceCountMap[rc.race.toLowerCase()] = rc.count;
  }

  const races = raceReleases.map(r => ({
    ...r,
    playerCount: raceCountMap[r.contentId] ?? 0,
  }));

  // Towns with region and character count
  const townRows = await db.query.towns.findMany({
    columns: {
      id: true,
      name: true,
      regionId: true,
      isReleased: true,
      releasedAt: true,
      releaseOrder: true,
      releaseNotes: true,
    },
    with: {
      region: { columns: { id: true, name: true } },
    },
    orderBy: [asc(towns.regionId), asc(towns.releaseOrder), asc(towns.name)],
  });

  // Count characters per town
  const townCharCounts = await db.select({
    currentTownId: characters.currentTownId,
    count: sql<number>`count(*)::int`,
  })
    .from(characters)
    .where(sql`${characters.currentTownId} IS NOT NULL`)
    .groupBy(characters.currentTownId);

  const townCharCountMap: Record<string, number> = {};
  for (const tc of townCharCounts) {
    if (tc.currentTownId) townCharCountMap[tc.currentTownId] = tc.count;
  }

  const townItems = townRows.map(t => ({
    id: t.id,
    name: t.name,
    regionId: t.regionId,
    regionName: t.region.name,
    isReleased: t.isReleased,
    releasedAt: t.releasedAt,
    releaseOrder: t.releaseOrder,
    releaseNotes: t.releaseNotes,
    playerCount: townCharCountMap[t.id] ?? 0,
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
  const now = new Date().toISOString();

  if (contentType === 'town') {
    await db.update(towns)
      .set({ isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined })
      .where(eq(towns.id, contentId));
  } else {
    await db.update(contentReleases)
      .set({ isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined })
      .where(and(eq(contentReleases.contentType, contentType), eq(contentReleases.contentId, contentId)));
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
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(characters)
      .where(eq(characters.race, raceEnum as any));
    const count = result?.count ?? 0;
    if (count > 0) {
      return {
        success: false,
        error: `Cannot unrelease: ${count} character(s) belong to the ${contentId} race`,
      };
    }
  }

  if (contentType === 'town') {
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(characters)
      .where(eq(characters.currentTownId, contentId));
    const count = result?.count ?? 0;
    if (count > 0) {
      return {
        success: false,
        error: `Cannot unrelease: ${count} character(s) are currently in this town`,
      };
    }
  }

  const now = new Date().toISOString();

  if (contentType === 'town') {
    await db.update(towns)
      .set({ isReleased: false, releasedAt: null, releaseNotes: notes ?? undefined })
      .where(eq(towns.id, contentId));
  } else {
    await db.update(contentReleases)
      .set({ isReleased: false, releasedAt: null, releaseNotes: notes ?? undefined })
      .where(and(eq(contentReleases.contentType, contentType), eq(contentReleases.contentId, contentId)));
  }

  await invalidateContentCache();
  return { success: true };
}

export async function bulkRelease(
  contentType: string,
  ids: string[],
  notes?: string,
): Promise<{ released: number }> {
  const now = new Date().toISOString();

  if (contentType === 'town') {
    const result = await db.update(towns)
      .set({ isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined })
      .where(inArray(towns.id, ids));
    await invalidateContentCache();
    return { released: (result as any).rowCount ?? 0 };
  } else {
    const result = await db.update(contentReleases)
      .set({ isReleased: true, releasedAt: now, releaseNotes: notes ?? undefined })
      .where(and(eq(contentReleases.contentType, contentType), inArray(contentReleases.contentId, ids)));
    await invalidateContentCache();
    return { released: (result as any).rowCount ?? 0 };
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
