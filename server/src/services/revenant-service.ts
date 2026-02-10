import { prisma } from '../lib/prisma';

// =========================================================================
// Revenant Reduced Death Service
// =========================================================================

// Normal death penalties
const NORMAL_GOLD_LOSS = 0.10;
const NORMAL_XP_LOSS = 50;
const NORMAL_DURABILITY_LOSS = 10;
const NORMAL_RESPAWN_SECONDS = 60;

// Revenant halved penalties
const REVENANT_MULTIPLIER = 0.5;

// Life Drain
const LIFE_DRAIN_PERCENT = 0.50;
const LIFE_DRAIN_LEVEL = 15;

// Undying Fortitude
const UNDYING_FORTITUDE_LEVEL = 25;
const UNDYING_FORTITUDE_COOLDOWN_SECONDS = 86400; // once per day

export interface DeathPenalties {
  goldLoss: number;
  xpLoss: number;
  durabilityLoss: number;
  isReduced: boolean;
}

export interface RespawnInfo {
  respawnSeconds: number;
  isReduced: boolean;
}

export interface LifeDrainResult {
  healAmount: number;
  active: boolean;
}

/**
 * Get death penalties: halved for Revenants.
 */
export async function getDeathPenalties(characterId: string): Promise<DeathPenalties> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  if (!character || character.race !== 'REVENANT') {
    return {
      goldLoss: NORMAL_GOLD_LOSS,
      xpLoss: NORMAL_XP_LOSS,
      durabilityLoss: NORMAL_DURABILITY_LOSS,
      isReduced: false,
    };
  }

  return {
    goldLoss: NORMAL_GOLD_LOSS * REVENANT_MULTIPLIER,
    xpLoss: NORMAL_XP_LOSS * REVENANT_MULTIPLIER,
    durabilityLoss: NORMAL_DURABILITY_LOSS * REVENANT_MULTIPLIER,
    isReduced: true,
  };
}

/**
 * Get respawn timer: halved for Revenants.
 */
export async function getRespawnTimer(characterId: string): Promise<RespawnInfo> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true },
  });

  if (!character || character.race !== 'REVENANT') {
    return { respawnSeconds: NORMAL_RESPAWN_SECONDS, isReduced: false };
  }

  return {
    respawnSeconds: NORMAL_RESPAWN_SECONDS * REVENANT_MULTIPLIER,
    isReduced: true,
  };
}

/**
 * Level 15 Life Drain: heal for 50% of damage dealt.
 */
export async function applyLifeDrain(
  characterId: string,
  damageDealt: number,
): Promise<LifeDrainResult> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, level: true, health: true, maxHealth: true },
  });

  if (!character || character.race !== 'REVENANT' || character.level < LIFE_DRAIN_LEVEL) {
    return { healAmount: 0, active: false };
  }

  const healAmount = Math.floor(damageDealt * LIFE_DRAIN_PERCENT);
  const newHealth = Math.min(character.maxHealth, character.health + healAmount);

  await prisma.character.update({
    where: { id: characterId },
    data: { health: newHealth },
  });

  return { healAmount, active: true };
}

/**
 * Level 25 Undying Fortitude: can't die for 2 rounds (once per day).
 * Returns whether the ability is available and triggers cooldown if used.
 */
export async function checkUndyingFortitude(
  characterId: string,
): Promise<{ available: boolean; cooldownEnds: string | null; reason: string }> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, level: true },
  });

  if (!character || character.race !== 'REVENANT') {
    return { available: false, cooldownEnds: null, reason: 'Not a Revenant' };
  }

  if (character.level < UNDYING_FORTITUDE_LEVEL) {
    return { available: false, cooldownEnds: null, reason: `Requires level ${UNDYING_FORTITUDE_LEVEL}` };
  }

  const now = new Date();
  const abilityName = 'Undying Fortitude';
  const existingCooldown = await prisma.racialAbilityCooldown.findUnique({
    where: { characterId_abilityName: { characterId, abilityName } },
  });

  if (existingCooldown && existingCooldown.cooldownEnds > now) {
    return {
      available: false,
      cooldownEnds: existingCooldown.cooldownEnds.toISOString(),
      reason: 'On cooldown',
    };
  }

  // Trigger the cooldown
  const cooldownEnds = new Date(now.getTime() + UNDYING_FORTITUDE_COOLDOWN_SECONDS * 1000);
  await prisma.racialAbilityCooldown.upsert({
    where: { characterId_abilityName: { characterId, abilityName } },
    update: { lastUsed: now, cooldownEnds },
    create: { characterId, abilityName, lastUsed: now, cooldownEnds },
  });

  return {
    available: true,
    cooldownEnds: cooldownEnds.toISOString(),
    reason: 'Undying Fortitude activated — immune to death for 2 rounds',
  };
}
