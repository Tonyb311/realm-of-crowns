import { prisma } from '../lib/prisma';
import { Race, RelationStatus } from '@prisma/client';

export interface TownDemographics {
  townId: string;
  townName: string;
  totalCharacters: number;
  majorityRace: Race | null;
  majorityPercent: number;
  breakdown: { race: Race; count: number; percent: number }[];
}

export interface RacialBonusModifiers {
  professionYieldModifier: number;
  npcPriceModifier: number;
  relationStatus: RelationStatus | 'SAME_RACE';
  description: string;
}

/**
 * Count characters by race in a town and return the majority race + percentages.
 */
export async function calculateTownDemographics(townId: string): Promise<TownDemographics | null> {
  const town = await prisma.town.findUnique({
    where: { id: townId },
    select: { id: true, name: true },
  });

  if (!town) return null;

  const characters = await prisma.character.findMany({
    where: { currentTownId: townId },
    select: { race: true },
  });

  const total = characters.length;
  if (total === 0) {
    return {
      townId: town.id,
      townName: town.name,
      totalCharacters: 0,
      majorityRace: null,
      majorityPercent: 0,
      breakdown: [],
    };
  }

  const counts = new Map<Race, number>();
  for (const c of characters) {
    counts.set(c.race, (counts.get(c.race) ?? 0) + 1);
  }

  const breakdown = Array.from(counts.entries())
    .map(([race, count]) => ({
      race,
      count,
      percent: Math.round((count / total) * 10000) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    townId: town.id,
    townName: town.name,
    totalCharacters: total,
    majorityRace: breakdown[0]?.race ?? null,
    majorityPercent: breakdown[0]?.percent ?? 0,
    breakdown,
  };
}

/**
 * Look up the racial relation between two races from the RacialRelation table.
 * Returns NEUTRAL if no explicit relation exists. Returns SAME_RACE if raceA === raceB.
 */
export async function lookupRelation(
  raceA: Race,
  raceB: Race,
): Promise<{ status: RelationStatus; modifier: number }> {
  if (raceA === raceB) {
    return { status: 'NEUTRAL' as RelationStatus, modifier: 0 };
  }

  const relation = await prisma.racialRelation.findFirst({
    where: {
      OR: [
        { race1: raceA, race2: raceB },
        { race1: raceB, race2: raceA },
      ],
    },
  });

  if (!relation) {
    return { status: 'NEUTRAL' as RelationStatus, modifier: 0 };
  }

  return { status: relation.status, modifier: relation.modifier };
}

/**
 * Calculate the racial bonuses/penalties a character gets in a town based on
 * the town's majority race and the racial relation between them.
 *
 * Changeling exception: always treated as same race (no penalties).
 */
export async function calculateRacialBonuses(
  characterRace: Race,
  townId: string,
): Promise<RacialBonusModifiers> {
  // Changelings are always treated as same race
  if (characterRace === 'CHANGELING') {
    return {
      professionYieldModifier: 0.10,
      npcPriceModifier: 0,
      relationStatus: 'SAME_RACE',
      description: 'Changeling: blends in perfectly with any population.',
    };
  }

  const demographics = await calculateTownDemographics(townId);

  if (!demographics || !demographics.majorityRace) {
    return {
      professionYieldModifier: 0,
      npcPriceModifier: 0,
      relationStatus: 'NEUTRAL' as RelationStatus,
      description: 'No population data available; neutral treatment.',
    };
  }

  // Same race as majority
  if (characterRace === demographics.majorityRace) {
    return {
      professionYieldModifier: 0.10,
      npcPriceModifier: 0,
      relationStatus: 'SAME_RACE',
      description: `Same race as majority (${demographics.majorityRace}): +10% profession bonuses.`,
    };
  }

  const relation = await lookupRelation(characterRace, demographics.majorityRace);

  switch (relation.status) {
    case 'ALLIED':
    case 'FRIENDLY':
      return {
        professionYieldModifier: 0,
        npcPriceModifier: 0,
        relationStatus: relation.status,
        description: `Friendly relations with ${demographics.majorityRace}: no penalties.`,
      };

    case 'NEUTRAL':
      return {
        professionYieldModifier: 0,
        npcPriceModifier: 0,
        relationStatus: 'NEUTRAL',
        description: `Neutral relations with ${demographics.majorityRace}: no bonus or penalty.`,
      };

    case 'DISTRUSTFUL':
      return {
        professionYieldModifier: -0.05,
        npcPriceModifier: 0.10,
        relationStatus: 'DISTRUSTFUL',
        description: `Distrustful of ${characterRace}: -5% yields, NPCs charge 10% more.`,
      };

    case 'HOSTILE':
      return {
        professionYieldModifier: -0.10,
        npcPriceModifier: 0.25,
        relationStatus: 'HOSTILE',
        description: `Hostile toward ${characterRace}: -10% yields, NPCs charge 25% more.`,
      };

    case 'BLOOD_FEUD':
      return {
        professionYieldModifier: -0.15,
        npcPriceModifier: 0.50,
        relationStatus: 'BLOOD_FEUD',
        description: `Blood Feud against ${characterRace}: -15% yields, 50% tariff, NPCs may refuse service.`,
      };

    default:
      return {
        professionYieldModifier: 0,
        npcPriceModifier: 0,
        relationStatus: 'NEUTRAL',
        description: 'Neutral treatment.',
      };
  }
}
