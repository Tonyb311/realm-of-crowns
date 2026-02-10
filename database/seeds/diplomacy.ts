/**
 * Diplomacy Seed Data for Realm of Crowns
 *
 * Seeds the full 20x20 racial relations matrix (190 unique pairings).
 * Idempotent via upsert on the (race1, race2) unique constraint.
 */

import { PrismaClient, Race, RelationStatus } from '@prisma/client';

// Specific relations — everything not listed defaults to NEUTRAL
const SPECIFIC_RELATIONS: Array<{ race1: Race; race2: Race; status: RelationStatus; modifier: number }> = [
  // BLOOD_FEUD
  { race1: 'DWARF', race2: 'ORC', status: 'BLOOD_FEUD', modifier: -100 },
  { race1: 'ELF', race2: 'NIGHTBORNE', status: 'BLOOD_FEUD', modifier: -100 },

  // HOSTILE
  { race1: 'HUMAN', race2: 'ORC', status: 'HOSTILE', modifier: -60 },
  { race1: 'ELF', race2: 'ORC', status: 'HOSTILE', modifier: -60 },
  { race1: 'HARTHFOLK', race2: 'ORC', status: 'HOSTILE', modifier: -60 },
  { race1: 'NIGHTBORNE', race2: 'FAEFOLK', status: 'HOSTILE', modifier: -60 },

  // DISTRUSTFUL
  { race1: 'HUMAN', race2: 'NETHKIN', status: 'DISTRUSTFUL', modifier: -30 },
  { race1: 'HUMAN', race2: 'NIGHTBORNE', status: 'DISTRUSTFUL', modifier: -30 },
  { race1: 'HARTHFOLK', race2: 'NETHKIN', status: 'DISTRUSTFUL', modifier: -30 },
  { race1: 'DWARF', race2: 'NETHKIN', status: 'DISTRUSTFUL', modifier: -30 },

  // ALLIED (these override any FRIENDLY entry below)
  { race1: 'ELF', race2: 'FAEFOLK', status: 'ALLIED', modifier: 100 },
  { race1: 'DWARF', race2: 'GNOME', status: 'ALLIED', modifier: 100 },

  // FRIENDLY
  { race1: 'ELF', race2: 'MOSSKIN', status: 'FRIENDLY', modifier: 50 },
  { race1: 'FAEFOLK', race2: 'MOSSKIN', status: 'FRIENDLY', modifier: 50 },
  { race1: 'DWARF', race2: 'FORGEBORN', status: 'FRIENDLY', modifier: 50 },
  { race1: 'GNOME', race2: 'FORGEBORN', status: 'FRIENDLY', modifier: 50 },
  { race1: 'NETHKIN', race2: 'NIGHTBORNE', status: 'FRIENDLY', modifier: 50 },
  { race1: 'NETHKIN', race2: 'REVENANT', status: 'FRIENDLY', modifier: 50 },
  { race1: 'NETHKIN', race2: 'CHANGELING', status: 'FRIENDLY', modifier: 50 },
  { race1: 'NIGHTBORNE', race2: 'REVENANT', status: 'FRIENDLY', modifier: 50 },
  { race1: 'NIGHTBORNE', race2: 'CHANGELING', status: 'FRIENDLY', modifier: 50 },
  { race1: 'REVENANT', race2: 'CHANGELING', status: 'FRIENDLY', modifier: 50 },
  { race1: 'HUMAN', race2: 'HARTHFOLK', status: 'FRIENDLY', modifier: 50 },
  { race1: 'HUMAN', race2: 'HALF_ELF', status: 'FRIENDLY', modifier: 50 },
  { race1: 'ELF', race2: 'HALF_ELF', status: 'FRIENDLY', modifier: 50 },
  { race1: 'HALF_ELF', race2: 'HALF_ORC', status: 'FRIENDLY', modifier: 50 },
  { race1: 'ORC', race2: 'HALF_ORC', status: 'FRIENDLY', modifier: 50 },
];

// Build a lookup map for specific relations keyed by sorted race pair
function pairKey(r1: Race, r2: Race): string {
  return [r1, r2].sort().join(':');
}

const specificMap = new Map<string, { status: RelationStatus; modifier: number }>();
for (const rel of SPECIFIC_RELATIONS) {
  specificMap.set(pairKey(rel.race1, rel.race2), { status: rel.status, modifier: rel.modifier });
}

export async function seedDiplomacy(prisma: PrismaClient): Promise<void> {
  console.log('  Seeding racial relations (190 pairings)...');

  const allRaces = Object.values(Race);
  let created = 0;
  let updated = 0;

  for (let i = 0; i < allRaces.length; i++) {
    for (let j = i + 1; j < allRaces.length; j++) {
      const race1 = allRaces[i];
      const race2 = allRaces[j];
      const key = pairKey(race1, race2);
      const specific = specificMap.get(key);
      const status = specific?.status ?? 'NEUTRAL';
      const modifier = specific?.modifier ?? 0;

      // Ensure race1 < race2 alphabetically for consistent unique key
      const [sortedRace1, sortedRace2] = [race1, race2].sort() as [Race, Race];

      const result = await prisma.racialRelation.upsert({
        where: {
          race1_race2: { race1: sortedRace1, race2: sortedRace2 },
        },
        update: { status, modifier },
        create: { race1: sortedRace1, race2: sortedRace2, status, modifier },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }
  }

  console.log(`    ✓ ${created} created, ${updated} updated (${created + updated} total pairings)`);
}
