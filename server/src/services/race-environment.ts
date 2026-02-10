import { prisma } from '../lib/prisma';
import { BiomeType } from '@prisma/client';

// =========================================================================
// Day/Night Cycle
// =========================================================================

/** Game-time ratio: 1 real hour = 1 game day (configurable). */
const REAL_MS_PER_GAME_DAY = 60 * 60 * 1000; // 1 hour in ms

/** Daytime is game hours 6–18. */
const DAWN_HOUR = 6;
const DUSK_HOUR = 18;

export interface GameTime {
  gameHour: number;
  gameMinute: number;
  isDaytime: boolean;
  period: 'dawn' | 'day' | 'dusk' | 'night';
}

/**
 * Calculate the current game time based on server time.
 * 1 real hour = 1 game day (24 game hours).
 */
export function getGameTime(): GameTime {
  const now = Date.now();
  const msIntoGameDay = now % REAL_MS_PER_GAME_DAY;
  const fractionOfDay = msIntoGameDay / REAL_MS_PER_GAME_DAY;
  const totalGameMinutes = fractionOfDay * 24 * 60;
  const gameHour = Math.floor(totalGameMinutes / 60);
  const gameMinute = Math.floor(totalGameMinutes % 60);

  const daytime = gameHour >= DAWN_HOUR && gameHour < DUSK_HOUR;

  let period: GameTime['period'];
  if (gameHour >= DAWN_HOUR && gameHour < DAWN_HOUR + 1) {
    period = 'dawn';
  } else if (gameHour >= DAWN_HOUR + 1 && gameHour < DUSK_HOUR - 1) {
    period = 'day';
  } else if (gameHour >= DUSK_HOUR - 1 && gameHour < DUSK_HOUR) {
    period = 'dusk';
  } else {
    period = 'night';
  }

  return { gameHour, gameMinute, isDaytime: daytime, period };
}

/**
 * Simple check: is it currently daytime in the game world?
 */
export function isDaytime(): boolean {
  return getGameTime().isDaytime;
}

// =========================================================================
// Merfolk land/water transition
// =========================================================================

const WATER_BIOMES: BiomeType[] = ['COASTAL', 'UNDERWATER', 'RIVER'] as BiomeType[];

/**
 * Detect if a Merfolk character is transitioning from a water biome to
 * a land biome. Returns the speed multiplier (0.85 for water-to-land, 1.0 otherwise).
 */
export async function detectWaterTransition(
  fromTownId: string,
  toTownId: string,
): Promise<{ isWaterToLand: boolean; speedMultiplier: number }> {
  const [fromTown, toTown] = await Promise.all([
    prisma.town.findUnique({
      where: { id: fromTownId },
      select: { biome: true },
    }),
    prisma.town.findUnique({
      where: { id: toTownId },
      select: { biome: true },
    }),
  ]);

  if (!fromTown || !toTown) {
    return { isWaterToLand: false, speedMultiplier: 1.0 };
  }

  const fromWater = WATER_BIOMES.includes(fromTown.biome);
  const toWater = WATER_BIOMES.includes(toTown.biome);

  if (fromWater && !toWater) {
    return { isWaterToLand: true, speedMultiplier: 0.85 };
  }

  return { isWaterToLand: false, speedMultiplier: 1.0 };
}

// =========================================================================
// Drow sunlight tracking
// =========================================================================

export interface DrowPenalty {
  hasPenalty: boolean;
  attackModifier: number;
  perceptionModifier: number;
  reason: string;
}

/**
 * Calculate Drow sunlight penalties based on game time and the character's
 * current location. No penalty at night or in underground/underwater biomes.
 */
export async function calculateDrowPenalty(characterId: string): Promise<DrowPenalty> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, race: true, currentTownId: true },
  });

  if (!character || character.race !== 'NIGHTBORNE') {
    return {
      hasPenalty: false,
      attackModifier: 0,
      perceptionModifier: 0,
      reason: 'Not a Drow — no sunlight sensitivity.',
    };
  }

  // Check if underground/underwater — no sunlight there
  if (character.currentTownId) {
    const town = await prisma.town.findUnique({
      where: { id: character.currentTownId },
      select: { biome: true },
    });

    const shelteredBiomes: BiomeType[] = ['UNDERGROUND', 'UNDERWATER'] as BiomeType[];
    if (town && shelteredBiomes.includes(town.biome)) {
      return {
        hasPenalty: false,
        attackModifier: 0,
        perceptionModifier: 0,
        reason: 'Underground/underwater — no sunlight exposure.',
      };
    }
  }

  if (!isDaytime()) {
    return {
      hasPenalty: false,
      attackModifier: 0,
      perceptionModifier: 0,
      reason: 'Nighttime — no sunlight sensitivity.',
    };
  }

  return {
    hasPenalty: true,
    attackModifier: -2,
    perceptionModifier: -2,
    reason: 'Daytime surface exposure — Drow suffer -2 attack and -2 perception.',
  };
}
