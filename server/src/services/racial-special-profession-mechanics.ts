import { ProfessionType, Race } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ---------------------------------------------------------------------------
// Gnome Eureka Moment — instant completion of one crafting action (1/day)
// ---------------------------------------------------------------------------

const EUREKA_ABILITY_NAME = 'Eureka Moment';
const EUREKA_COOLDOWN_SECONDS = 86400; // 24 hours
const EUREKA_LEVEL_REQUIRED = 25;

/**
 * Instantly complete one in-progress crafting action for a Gnome character.
 * Returns the completed crafting action ID, or an error message.
 */
export async function applyGnomeEurekaMoment(
  characterId: string,
): Promise<{ success: boolean; craftingActionId?: string; error?: string }> {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return { success: false, error: 'Character not found' };
  if (character.race !== 'GNOME') return { success: false, error: 'Only Gnomes can use Eureka Moment' };
  if (character.level < EUREKA_LEVEL_REQUIRED) {
    return { success: false, error: `Requires level ${EUREKA_LEVEL_REQUIRED}` };
  }

  // Check cooldown
  const now = new Date();
  const cooldown = await prisma.racialAbilityCooldown.findUnique({
    where: {
      characterId_abilityName: { characterId, abilityName: EUREKA_ABILITY_NAME },
    },
  });

  if (cooldown && cooldown.cooldownEnds > now) {
    const remainingSeconds = Math.ceil((cooldown.cooldownEnds.getTime() - now.getTime()) / 1000);
    return { success: false, error: `Eureka Moment is on cooldown (${remainingSeconds}s remaining)` };
  }

  // Find the earliest in-progress crafting action
  const craftAction = await prisma.craftingAction.findFirst({
    where: { characterId, status: 'IN_PROGRESS' },
    orderBy: { createdAt: 'asc' },
  });

  if (!craftAction) {
    return { success: false, error: 'No active crafting action to complete' };
  }

  // Instantly complete it + set cooldown
  await prisma.$transaction([
    prisma.craftingAction.update({
      where: { id: craftAction.id },
      data: { status: 'COMPLETED' },
    }),
    prisma.racialAbilityCooldown.upsert({
      where: {
        characterId_abilityName: { characterId, abilityName: EUREKA_ABILITY_NAME },
      },
      update: {
        lastUsed: now,
        cooldownEnds: new Date(now.getTime() + EUREKA_COOLDOWN_SECONDS * 1000),
      },
      create: {
        characterId,
        abilityName: EUREKA_ABILITY_NAME,
        lastUsed: now,
        cooldownEnds: new Date(now.getTime() + EUREKA_COOLDOWN_SECONDS * 1000),
      },
    }),
  ]);

  return { success: true, craftingActionId: craftAction.id };
}

// ---------------------------------------------------------------------------
// Forgeborn Overclock — 2x craft speed for 1 hour (24hr cooldown, level 25)
// ---------------------------------------------------------------------------

const OVERCLOCK_ABILITY_NAME = 'Overclock';
const OVERCLOCK_COOLDOWN_SECONDS = 86400; // 24 hours
const OVERCLOCK_DURATION_SECONDS = 3600; // 1 hour
const OVERCLOCK_LEVEL_REQUIRED = 25;

/**
 * Activate Forgeborn Overclock: 2x crafting speed for 1 hour.
 * The active buff is stored as a cooldown entry with a special name.
 * Returns success + expiry time, or an error.
 */
export async function applyForgebornOverclock(
  characterId: string,
): Promise<{ success: boolean; expiresAt?: string; error?: string }> {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return { success: false, error: 'Character not found' };
  if (character.race !== 'FORGEBORN') return { success: false, error: 'Only Forgeborn can use Overclock' };
  if (character.level < OVERCLOCK_LEVEL_REQUIRED) {
    return { success: false, error: `Requires level ${OVERCLOCK_LEVEL_REQUIRED}` };
  }

  const now = new Date();

  // Check cooldown on the main ability
  const cooldown = await prisma.racialAbilityCooldown.findUnique({
    where: {
      characterId_abilityName: { characterId, abilityName: OVERCLOCK_ABILITY_NAME },
    },
  });

  if (cooldown && cooldown.cooldownEnds > now) {
    const remainingSeconds = Math.ceil((cooldown.cooldownEnds.getTime() - now.getTime()) / 1000);
    return { success: false, error: `Overclock is on cooldown (${remainingSeconds}s remaining)` };
  }

  const expiresAt = new Date(now.getTime() + OVERCLOCK_DURATION_SECONDS * 1000);
  const cooldownEnds = new Date(now.getTime() + OVERCLOCK_COOLDOWN_SECONDS * 1000);

  // Store the buff as "Overclock_Active" and the cooldown as "Overclock"
  await prisma.$transaction([
    prisma.racialAbilityCooldown.upsert({
      where: {
        characterId_abilityName: { characterId, abilityName: OVERCLOCK_ABILITY_NAME },
      },
      update: { lastUsed: now, cooldownEnds },
      create: { characterId, abilityName: OVERCLOCK_ABILITY_NAME, lastUsed: now, cooldownEnds },
    }),
    prisma.racialAbilityCooldown.upsert({
      where: {
        characterId_abilityName: { characterId, abilityName: 'Overclock_Active' },
      },
      update: { lastUsed: now, cooldownEnds: expiresAt },
      create: { characterId, abilityName: 'Overclock_Active', lastUsed: now, cooldownEnds: expiresAt },
    }),
  ]);

  return { success: true, expiresAt: expiresAt.toISOString() };
}

/**
 * Check if Forgeborn Overclock is currently active for a character.
 * Returns the speed multiplier (2.0 if active, 1.0 if not).
 */
export async function getForgebornOverclockMultiplier(
  characterId: string,
): Promise<number> {
  const buff = await prisma.racialAbilityCooldown.findUnique({
    where: {
      characterId_abilityName: { characterId, abilityName: 'Overclock_Active' },
    },
  });

  if (buff && buff.cooldownEnds > new Date()) {
    return 2.0;
  }
  return 1.0;
}

// ---------------------------------------------------------------------------
// Forgeborn Tireless Worker — 50% more queue slots (level 10)
// ---------------------------------------------------------------------------

const TIRELESS_WORKER_LEVEL = 10;
const BASE_QUEUE_SLOTS = 5;

/**
 * Returns the maximum crafting queue slots for a character.
 * Forgeborn at level 10+ get 50% more slots.
 */
export async function getMaxQueueSlots(
  characterId: string,
): Promise<number> {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return BASE_QUEUE_SLOTS;

  if (character.race === 'FORGEBORN' && character.level >= TIRELESS_WORKER_LEVEL) {
    return Math.ceil(BASE_QUEUE_SLOTS * 1.5);
  }

  return BASE_QUEUE_SLOTS;
}

// ---------------------------------------------------------------------------
// Half-Elf Chosen Profession — set/get the +20% flexible bonus
// ---------------------------------------------------------------------------

/**
 * Set the Half-Elf's chosen profession for their +20% flexible bonus.
 * Stored in the character's subRace JSON field as { chosenProfession: "PROFESSION" }.
 */
export async function applyHalfElfChosenProfession(
  characterId: string,
  profession: ProfessionType,
): Promise<{ success: boolean; error?: string }> {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return { success: false, error: 'Character not found' };
  if (character.race !== 'HALF_ELF') return { success: false, error: 'Only Half-Elves can set a chosen profession' };

  // Merge with existing subRace data
  const existing = (character.subRace as Record<string, unknown>) ?? {};
  const updated = { ...existing, chosenProfession: profession };

  await prisma.character.update({
    where: { id: characterId },
    data: { subRace: updated },
  });

  return { success: true };
}

/**
 * Get the Half-Elf's currently chosen profession.
 */
export async function getHalfElfChosenProfession(
  characterId: string,
): Promise<ProfessionType | null> {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character || character.race !== 'HALF_ELF') return null;

  const subRace = character.subRace as Record<string, unknown> | null;
  const chosen = subRace?.chosenProfession;
  if (typeof chosen === 'string') return chosen as ProfessionType;
  return null;
}

// ---------------------------------------------------------------------------
// Nightborne Daytime Penalty — check if gathering during daytime on surface
// ---------------------------------------------------------------------------

/**
 * Returns a gathering penalty multiplier for Nightborne characters gathering
 * during daytime on the surface. Returns 0 if no penalty applies.
 */
export function checkNightborneDaytimePenalty(
  race: Race,
  biome: string | null,
  timeOfDay?: 'day' | 'night',
): number {
  if (race !== 'NIGHTBORNE') return 0;

  // No penalty underground or underwater
  if (biome && ['UNDERGROUND', 'UNDERWATER'].includes(biome.toUpperCase())) return 0;

  // Penalty only during daytime
  if (timeOfDay === 'day') return 0.10; // 10% penalty

  // Default: no penalty at night or if time unknown
  return 0;
}
