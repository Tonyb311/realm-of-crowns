import { prisma } from '../lib/prisma';
import { BiomeType } from '@prisma/client';

// =========================================================================
// Merfolk Amphibious Service
// =========================================================================

const WATER_BIOMES: BiomeType[] = ['COASTAL', 'UNDERWATER', 'RIVER'];
const LAND_SPEED_MULTIPLIER = 0.85;
const WATER_SPEED_MULTIPLIER = 3.0;
const WATER_DEX_BONUS = 2;
const WATER_CON_BONUS = 2;

export interface MovementSpeed {
  multiplier: number;
  zoneType: string;
  isWaterZone: boolean;
}

export interface SwimmingBuff {
  active: boolean;
  dexBonus: number;
  conBonus: number;
}

/**
 * Get movement speed multiplier based on zone type.
 * 3x in water zones, 0.85x on land.
 */
export async function getMovementSpeed(
  characterId: string,
  zoneType: string,
): Promise<MovementSpeed> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  if (!character || character.race !== 'MERFOLK') {
    return { multiplier: 1.0, zoneType, isWaterZone: false };
  }

  const isWater = WATER_BIOMES.includes(zoneType as BiomeType);

  return {
    multiplier: isWater ? WATER_SPEED_MULTIPLIER : LAND_SPEED_MULTIPLIER,
    zoneType,
    isWaterZone: isWater,
  };
}

/**
 * Returns true for Merfolk — they can always access underwater nodes.
 */
export async function canAccessUnderwaterNode(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  return character?.race === 'MERFOLK';
}

/**
 * Water-adjacent towns: Merfolk can fish from anywhere in the town.
 */
export async function getWaterProximityBonus(
  characterId: string,
  townId: string,
): Promise<{ canFishAnywhere: boolean; townBiome: string | null }> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  if (!character || character.race !== 'MERFOLK') {
    return { canFishAnywhere: false, townBiome: null };
  }

  const town = await prisma.town.findUnique({
    where: { id: townId },
    select: { biome: true },
  });

  if (!town) {
    return { canFishAnywhere: false, townBiome: null };
  }

  const isWaterAdjacent = WATER_BIOMES.includes(town.biome);

  return {
    canFishAnywhere: isWaterAdjacent,
    townBiome: town.biome,
  };
}

/**
 * Check if the Merfolk character is currently in a water zone.
 */
export async function isInWaterZone(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, currentTownId: true },
  });

  if (!character || character.race !== 'MERFOLK' || !character.currentTownId) {
    return false;
  }

  const town = await prisma.town.findUnique({
    where: { id: character.currentTownId },
    select: { biome: true },
  });

  if (!town) return false;

  return WATER_BIOMES.includes(town.biome);
}

/**
 * In water zones: +2 DEX, +2 CON for combat.
 */
export async function getSwimmingBuff(characterId: string): Promise<SwimmingBuff> {
  const inWater = await isInWaterZone(characterId);

  return {
    active: inWater,
    dexBonus: inWater ? WATER_DEX_BONUS : 0,
    conBonus: inWater ? WATER_CON_BONUS : 0,
  };
}
