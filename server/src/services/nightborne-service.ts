import { prisma } from '../lib/prisma';
import { BiomeType } from '@prisma/client';
import { isDaytime } from './race-environment';

// =========================================================================
// Nightborne Sunlight Sensitivity Service
// =========================================================================

const SHELTERED_BIOMES: BiomeType[] = ['UNDERGROUND', 'UNDERWATER'];
const SUNLIGHT_ATTACK_PENALTY = -2;
const SUNLIGHT_PERCEPTION_PENALTY = -2;
const DEEPSIGHT_PERCEPTION_BONUS = 5;

export interface SunlightPenalties {
  attackPenalty: number;
  perceptionPenalty: number;
  hasPenalty: boolean;
  reason: string;
}

export interface EnvironmentStatus {
  underground: boolean;
  daytime: boolean;
  penalties: SunlightPenalties;
  deepsightBonus: number;
}

/**
 * Returns sunlight penalties if the Nightborne is on the surface during daytime.
 */
export async function getSunlightPenalties(characterId: string): Promise<SunlightPenalties> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, currentTownId: true },
  });

  if (!character || character.race !== 'NIGHTBORNE') {
    return { attackPenalty: 0, perceptionPenalty: 0, hasPenalty: false, reason: 'Not a Nightborne' };
  }

  const underground = await checkUnderground(character.currentTownId);

  if (underground) {
    return {
      attackPenalty: 0,
      perceptionPenalty: 0,
      hasPenalty: false,
      reason: 'Underground — no sunlight exposure',
    };
  }

  if (!isDaytime()) {
    return {
      attackPenalty: 0,
      perceptionPenalty: 0,
      hasPenalty: false,
      reason: 'Nighttime — no sunlight sensitivity',
    };
  }

  return {
    attackPenalty: SUNLIGHT_ATTACK_PENALTY,
    perceptionPenalty: SUNLIGHT_PERCEPTION_PENALTY,
    hasPenalty: true,
    reason: 'Daytime surface exposure — Nightborne suffer -2 attack and -2 perception',
  };
}

/**
 * Check if the character is in an underground zone.
 */
export async function isUnderground(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { currentTownId: true },
  });

  return checkUnderground(character?.currentTownId ?? null);
}

async function checkUnderground(townId: string | null): Promise<boolean> {
  if (!townId) return false;

  const town = await prisma.town.findUnique({
    where: { id: townId },
    select: { biome: true },
  });

  if (!town) return false;

  return SHELTERED_BIOMES.includes(town.biome);
}

/**
 * Simple day/night cycle check (delegates to race-environment service).
 */
export { isDaytime } from './race-environment';

/**
 * Get full environment status: underground, daytime, penalties, deepsight bonus.
 */
export async function getEnvironmentStatus(characterId: string): Promise<EnvironmentStatus> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, currentTownId: true },
  });

  if (!character || character.race !== 'NIGHTBORNE') {
    return {
      underground: false,
      daytime: isDaytime(),
      penalties: { attackPenalty: 0, perceptionPenalty: 0, hasPenalty: false, reason: 'Not a Nightborne' },
      deepsightBonus: 0,
    };
  }

  const underground = await checkUnderground(character.currentTownId);
  const penalties = await getSunlightPenalties(characterId);
  const deepsightBonus = getSuperiorDeepsight(underground);

  return {
    underground,
    daytime: isDaytime(),
    penalties,
    deepsightBonus,
  };
}

/**
 * Passive: +5 perception in dark/underground environments.
 */
export function getSuperiorDeepsight(isUndergroundOrDark?: boolean): number {
  // Nightborne always have deepsight; bonus applies in dark/underground
  if (isUndergroundOrDark === undefined) return DEEPSIGHT_PERCEPTION_BONUS;
  return isUndergroundOrDark ? DEEPSIGHT_PERCEPTION_BONUS : 0;
}
