import { ProfessionType, ProfessionTier } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getXpForLevel, getTierForLevel } from '@shared/data/professions';
import { emitNotification } from '../socket/events';

export interface XPResult {
  xpGained: number;
  previousLevel: number;
  newLevel: number;
  newXp: number;
  newTier: ProfessionTier;
  leveledUp: boolean;
  tierChanged: boolean;
}

/**
 * Centralized profession XP service. Adds XP to a character's profession,
 * handles level-ups, tier promotions, logs the XP gain, and emits socket notifications.
 *
 * Must be called OUTSIDE of an existing Prisma transaction (it creates its own).
 */
export async function addProfessionXP(
  characterId: string,
  professionType: ProfessionType,
  amount: number,
  source: string,
): Promise<XPResult> {
  const profession = await prisma.playerProfession.findUnique({
    where: {
      characterId_professionType: { characterId, professionType },
    },
  });

  if (!profession) {
    throw new Error(`Character ${characterId} does not have profession ${professionType}`);
  }

  const previousLevel = profession.level;
  const previousTier = profession.tier;

  // Add XP and compute new level
  let currentXp = profession.xp + amount;
  let currentLevel = profession.level;

  // Level up as many times as possible
  while (currentLevel < 100) {
    const xpNeeded = getXpForLevel(currentLevel);
    if (currentXp < xpNeeded) break;
    currentXp -= xpNeeded;
    currentLevel++;
  }

  // Cap at level 100
  if (currentLevel >= 100) {
    currentLevel = 100;
    currentXp = 0;
  }

  const newTier = getTierForLevel(currentLevel) as ProfessionTier;
  const leveledUp = currentLevel > previousLevel;
  const tierChanged = newTier !== previousTier;

  await prisma.$transaction(async (tx) => {
    await tx.playerProfession.update({
      where: { id: profession.id },
      data: {
        xp: currentXp,
        level: currentLevel,
        tier: newTier,
      },
    });

    await tx.professionXP.create({
      data: {
        characterId,
        professionType,
        xpGained: amount,
        source,
      },
    });
  });

  // Socket notification for level-up
  if (leveledUp) {
    emitNotification(characterId, {
      id: `prof-levelup-${professionType}-${currentLevel}`,
      type: 'profession:level-up',
      title: 'Profession Level Up!',
      message: tierChanged
        ? `Your ${professionType} profession reached level ${currentLevel} and advanced to ${newTier}!`
        : `Your ${professionType} profession reached level ${currentLevel}!`,
      data: {
        characterId,
        professionType,
        newLevel: currentLevel,
        newTier: tierChanged ? newTier : undefined,
      },
    });
  }

  return {
    xpGained: amount,
    previousLevel,
    newLevel: currentLevel,
    newXp: currentXp,
    newTier,
    leveledUp,
    tierChanged,
  };
}

/**
 * Variant that works inside an existing Prisma interactive transaction.
 * Does NOT emit socket events or log XP (caller is responsible for those).
 * Returns the computed new level/tier/xp so the caller can apply them.
 */
export function computeLevelUp(
  currentLevel: number,
  currentXp: number,
  xpToAdd: number,
): { newLevel: number; newXp: number; newTier: ProfessionTier } {
  let xp = currentXp + xpToAdd;
  let level = currentLevel;

  while (level < 100) {
    const xpNeeded = getXpForLevel(level);
    if (xp < xpNeeded) break;
    xp -= xpNeeded;
    level++;
  }

  if (level >= 100) {
    level = 100;
    xp = 0;
  }

  return {
    newLevel: level,
    newXp: xp,
    newTier: getTierForLevel(level) as ProfessionTier,
  };
}
