import { prisma } from './prisma';
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
    const releasedTowns = await prisma.town.findMany({
      where: { isReleased: true },
      select: { id: true, name: true },
    });
    if (releasedTowns.length === 0) throw new Error('No released towns available');
    // For changelings, pick the least populated released town
    townNames = releasedTowns.map(t => t.name);
  }

  // 4. Resolve town names to IDs (only released towns)
  const towns = await prisma.town.findMany({
    where: {
      name: { in: townNames, mode: 'insensitive' },
      isReleased: true,
    },
    select: { id: true, name: true },
  });

  if (towns.length === 0) {
    throw new Error(`No released home towns found for race: ${raceId}`);
  }

  if (towns.length === 1) {
    return towns[0];
  }

  // 5. Count current residents in each home town
  const townIds = towns.map(t => t.id);
  const populations = await prisma.character.groupBy({
    by: ['currentTownId'],
    where: { currentTownId: { in: townIds } },
    _count: { id: true },
  });

  // 6. Build population map (default 0 for empty towns)
  const popMap = new Map<string, number>();
  for (const town of towns) {
    popMap.set(town.id, 0);
  }
  for (const pop of populations) {
    if (pop.currentTownId) {
      popMap.set(pop.currentTownId, pop._count.id);
    }
  }

  // 7. Find minimum population
  let minPop = Infinity;
  for (const count of popMap.values()) {
    if (count < minPop) minPop = count;
  }

  // 8. Collect tied towns and pick randomly
  const tiedTowns = towns.filter(t => popMap.get(t.id) === minPop);
  const chosen = tiedTowns[Math.floor(Math.random() * tiedTowns.length)];

  return chosen;
}
