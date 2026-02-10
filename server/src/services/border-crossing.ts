import { prisma } from '../lib/prisma';
import { Race, RelationStatus } from '@prisma/client';
import { lookupRelation } from './regional-mechanics';

export interface BorderCheckResult {
  crossesBorder: boolean;
  fromRegionId: string | null;
  toRegionId: string | null;
  tariffPercent: number;
  encounterRisk: number;
  allowed: boolean;
  relationStatus: RelationStatus | null;
  warnings: string[];
}

/**
 * Check if traveling between two towns crosses a region border. If so,
 * look up racial relations between the character's race and the destination
 * town's majority race to determine tariffs, encounter risk, and whether
 * travel is allowed.
 */
export async function checkBorderCrossing(
  characterId: string,
  fromTownId: string,
  toTownId: string,
): Promise<BorderCheckResult> {
  const [character, fromTown, toTown] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, race: true },
    }),
    prisma.town.findUnique({
      where: { id: fromTownId },
      select: { id: true, name: true, regionId: true },
    }),
    prisma.town.findUnique({
      where: { id: toTownId },
      select: { id: true, name: true, regionId: true },
    }),
  ]);

  if (!character || !fromTown || !toTown) {
    return {
      crossesBorder: false,
      fromRegionId: fromTown?.regionId ?? null,
      toRegionId: toTown?.regionId ?? null,
      tariffPercent: 0,
      encounterRisk: 0,
      allowed: false,
      relationStatus: null,
      warnings: ['Character or town not found.'],
    };
  }

  // Same region — no border crossing
  if (fromTown.regionId === toTown.regionId) {
    return {
      crossesBorder: false,
      fromRegionId: fromTown.regionId,
      toRegionId: toTown.regionId,
      tariffPercent: 0,
      encounterRisk: 0,
      allowed: true,
      relationStatus: null,
      warnings: [],
    };
  }

  // Changelings bypass all border penalties
  if (character.race === 'CHANGELING') {
    return {
      crossesBorder: true,
      fromRegionId: fromTown.regionId,
      toRegionId: toTown.regionId,
      tariffPercent: 0,
      encounterRisk: 0,
      allowed: true,
      relationStatus: null,
      warnings: ['Changeling: border penalties bypassed.'],
    };
  }

  // Get majority race in destination town
  const destCharacters = await prisma.character.findMany({
    where: { currentTownId: toTownId },
    select: { race: true },
  });

  let majorityRace: Race | null = null;
  if (destCharacters.length > 0) {
    const counts = new Map<Race, number>();
    for (const c of destCharacters) {
      counts.set(c.race, (counts.get(c.race) ?? 0) + 1);
    }
    let max = 0;
    for (const [race, count] of counts) {
      if (count > max) {
        max = count;
        majorityRace = race;
      }
    }
  }

  // If no population or same race, allow freely
  if (!majorityRace || majorityRace === character.race) {
    return {
      crossesBorder: true,
      fromRegionId: fromTown.regionId,
      toRegionId: toTown.regionId,
      tariffPercent: 0,
      encounterRisk: 0,
      allowed: true,
      relationStatus: null,
      warnings: [],
    };
  }

  const relation = await lookupRelation(character.race, majorityRace);
  const warnings: string[] = [];
  let tariffPercent = 0;
  let encounterRisk = 0;
  let allowed = true;

  switch (relation.status) {
    case 'ALLIED':
    case 'FRIENDLY':
      tariffPercent = 0;
      encounterRisk = 0;
      break;

    case 'NEUTRAL':
      tariffPercent = 0;
      encounterRisk = 0.05;
      break;

    case 'DISTRUSTFUL':
      tariffPercent = 10;
      encounterRisk = 0.15;
      warnings.push('Border guards may question your presence.');
      break;

    case 'HOSTILE':
      tariffPercent = 25;
      encounterRisk = 0.35;
      warnings.push('Hostile territory — expect confrontation at the border.');
      break;

    case 'BLOOD_FEUD':
      tariffPercent = 50;
      encounterRisk = 0.60;
      warnings.push('Blood Feud — extreme danger. You may be attacked on sight.');
      break;
  }

  return {
    crossesBorder: true,
    fromRegionId: fromTown.regionId,
    toRegionId: toTown.regionId,
    tariffPercent,
    encounterRisk,
    allowed,
    relationStatus: relation.status,
    warnings,
  };
}

/**
 * Calculate and deduct a tariff from a character's gold based on goods value.
 * Returns the tariff amount and remaining gold.
 */
export async function applyTariff(
  characterId: string,
  goodsValue: number,
  tariffPercent: number,
): Promise<{ tariffAmount: number; remainingGold: number; paid: boolean }> {
  const tariffAmount = Math.ceil(goodsValue * (tariffPercent / 100));

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, gold: true },
  });

  if (!character) {
    return { tariffAmount, remainingGold: 0, paid: false };
  }

  if (character.gold < tariffAmount) {
    return { tariffAmount, remainingGold: character.gold, paid: false };
  }

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { gold: { decrement: tariffAmount } },
    select: { gold: true },
  });

  return { tariffAmount, remainingGold: updated.gold, paid: true };
}

/**
 * Trigger a border encounter for hostile/blood feud crossings.
 * Returns encounter details based on severity.
 */
export function triggerBorderEncounter(
  characterId: string,
  severity: 'DISTRUSTFUL' | 'HOSTILE' | 'BLOOD_FEUD',
): {
  encounterType: string;
  description: string;
  combatChance: number;
  escapeChance: number;
} {
  switch (severity) {
    case 'DISTRUSTFUL':
      return {
        encounterType: 'interrogation',
        description: 'Border guards stop you for questioning.',
        combatChance: 0.05,
        escapeChance: 0.90,
      };

    case 'HOSTILE':
      return {
        encounterType: 'ambush',
        description: 'A hostile patrol spots you crossing the border.',
        combatChance: 0.40,
        escapeChance: 0.50,
      };

    case 'BLOOD_FEUD':
      return {
        encounterType: 'war_party',
        description: 'A war party intercepts you at the border. Blood demands blood.',
        combatChance: 0.70,
        escapeChance: 0.20,
      };
  }
}
