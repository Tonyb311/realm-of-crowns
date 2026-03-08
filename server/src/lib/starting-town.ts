import { db } from './db';
import { eq, and, inArray, ilike, sql, count } from 'drizzle-orm';
import { characters, towns } from '@database/tables';
import { getAllRaces } from '@shared/data/races';

/**
 * Assigns a starting town for a new character based on their race.
 * Picks the home city with the fewest current residents for population balance.
 * For ties, picks randomly among tied towns.
 */
export async function assignStartingTown(raceId: string): Promise<{ id: string; name: string }> {
  // 1. Find the race definition
  const allRaces = getAllRaces();
  const raceDef = allRaces.find(r => r.id === raceId.toLowerCase());
  if (!raceDef) throw new Error(`Unknown race: ${raceId}`);

  // 2. Get starting town names from race data
  let townNames = raceDef.startingTowns;

  // 3. Special case: Changelings (no starting towns) -- pick from all released towns
  if (townNames.length === 0) {
    const releasedTowns = await db.select({ id: towns.id, name: towns.name })
      .from(towns)
      .where(eq(towns.isReleased, true));
    if (releasedTowns.length === 0) throw new Error('No released towns available');
    // For changelings, pick the least populated released town
    townNames = releasedTowns.map(t => t.name);
  }

  // 4. Resolve town names to IDs (prefer released, fall back to all)
  // Drizzle doesn't have mode:'insensitive' for `in`, so use ilike with OR for case-insensitive matching
  let matchingTowns = await db.select({ id: towns.id, name: towns.name })
    .from(towns)
    .where(
      and(
        sql`lower(${towns.name}) IN (${sql.join(townNames.map(n => sql`lower(${n})`), sql`, `)})`,
        eq(towns.isReleased, true),
      )
    );

  // Fallback: if no released towns, use any matching town so creation doesn't 500
  if (matchingTowns.length === 0) {
    matchingTowns = await db.select({ id: towns.id, name: towns.name })
      .from(towns)
      .where(
        sql`lower(${towns.name}) IN (${sql.join(townNames.map(n => sql`lower(${n})`), sql`, `)})`
      );
  }

  if (matchingTowns.length === 0) {
    throw new Error(`No home towns found for race: ${raceId} (checked: ${townNames.join(', ')})`);
  }

  if (matchingTowns.length === 1) {
    return matchingTowns[0];
  }

  // 5. Count current residents in each home town
  const townIds = matchingTowns.map(t => t.id);
  const populations = await db.select({
    currentTownId: characters.currentTownId,
    count: count(characters.id),
  })
    .from(characters)
    .where(inArray(characters.currentTownId, townIds))
    .groupBy(characters.currentTownId);

  // 6. Build population map (default 0 for empty towns)
  const popMap = new Map<string, number>();
  for (const town of matchingTowns) {
    popMap.set(town.id, 0);
  }
  for (const pop of populations) {
    if (pop.currentTownId) {
      popMap.set(pop.currentTownId, pop.count);
    }
  }

  // 7. Find minimum population
  let minPop = Infinity;
  for (const cnt of popMap.values()) {
    if (cnt < minPop) minPop = cnt;
  }

  // 8. Collect tied towns and pick randomly
  const tiedTowns = matchingTowns.filter(t => popMap.get(t.id) === minPop);
  const chosen = tiedTowns[Math.floor(Math.random() * tiedTowns.length)];

  return chosen;
}
