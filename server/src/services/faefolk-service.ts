import { prisma } from '../lib/prisma';

// =========================================================================
// Faefolk Flight Service
// =========================================================================

const FLIGHT_AC_BONUS = 2;
const HEAVY_LOAD_THRESHOLD = 3; // number of equipped heavy items

export interface FlightStatus {
  canFly: boolean;
  isOverloaded: boolean;
  combatBonus: number;
}

/**
 * Returns true if the character is Faefolk (Flutter ability is level 1 passive).
 */
export async function canFly(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  return character?.race === 'FAEFOLK';
}

/**
 * Check if Faefolk can bypass a specific obstacle type.
 * Ground traps, water gaps, low walls — all bypassable via flight.
 */
export async function canBypassObstacle(
  characterId: string,
  obstacleType: string,
): Promise<{ canBypass: boolean; reason: string }> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  if (!character || character.race !== 'FAEFOLK') {
    return { canBypass: false, reason: 'Only Faefolk can fly over obstacles' };
  }

  const overloaded = await isCarryingHeavyLoad(characterId);
  if (overloaded) {
    return { canBypass: false, reason: 'Too heavily loaded to fly' };
  }

  const bypassable = ['ground_trap', 'water_gap', 'low_wall', 'pit', 'river', 'chasm'];
  const canBypass = bypassable.includes(obstacleType.toLowerCase());

  return {
    canBypass,
    reason: canBypass
      ? `Faefolk flutter over ${obstacleType}`
      : `Cannot fly over ${obstacleType}`,
  };
}

/**
 * Check if the Faefolk is carrying too much heavy equipment to fly.
 */
export async function isCarryingHeavyLoad(characterId: string): Promise<boolean> {
  const equipped = await prisma.characterEquipment.findMany({
    where: { characterId },
    include: {
      item: {
        include: { template: true },
      },
    },
  });

  // Count heavy items (armor + heavy weapons)
  let heavyCount = 0;
  for (const eq of equipped) {
    const itemType = eq.item.template.type;
    if (itemType === 'ARMOR' || itemType === 'WEAPON') {
      heavyCount++;
    }
  }

  return heavyCount >= HEAVY_LOAD_THRESHOLD;
}

/**
 * Dodge ground-level attacks: +2 AC vs melee ground enemies.
 */
export async function getFlightCombatBonus(
  characterId: string,
): Promise<{ acBonus: number; active: boolean }> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  if (!character || character.race !== 'FAEFOLK') {
    return { acBonus: 0, active: false };
  }

  const overloaded = await isCarryingHeavyLoad(characterId);
  if (overloaded) {
    return { acBonus: 0, active: false };
  }

  return { acBonus: FLIGHT_AC_BONUS, active: true };
}

/**
 * Can cross terrain that normally requires a bridge: water, gaps, etc.
 */
export async function canCrossWithoutBridge(
  characterId: string,
  terrainType: string,
): Promise<{ canCross: boolean; reason: string }> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  if (!character || character.race !== 'FAEFOLK') {
    return { canCross: false, reason: 'Only Faefolk can fly across terrain' };
  }

  const overloaded = await isCarryingHeavyLoad(characterId);
  if (overloaded) {
    return { canCross: false, reason: 'Too heavily loaded to fly across' };
  }

  const crossable = ['water', 'river', 'gap', 'chasm', 'ravine', 'lava_stream'];
  const canCross = crossable.includes(terrainType.toLowerCase());

  return {
    canCross,
    reason: canCross
      ? `Faefolk flutter across ${terrainType}`
      : `Cannot fly across ${terrainType}`,
  };
}
