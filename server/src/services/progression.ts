import { prisma } from '../lib/prisma';
import { emitLevelUp } from '../socket/events';
import {
  xpToNextLevel,
  totalXpForLevel,
  levelForXp,
  LEVEL_UP_REWARDS,
} from '@shared/data/progression';

/**
 * XP Curve: floor(10 * level^1.15) + 30
 *
 * Rebalanced for daily-action economy (1 major action per day).
 * See shared/src/data/progression/xp-curve.ts for full design rationale.
 *
 * Cumulative milestones:
 *   Level 5:  ~329 XP     Level 20: ~3,666 XP
 *   Level 10: ~1,025 XP   Level 30: ~8,110 XP
 *   Level 15: ~2,129 XP   Level 50: ~22,836 XP
 */

/** XP required to advance from the given level to the next. */
export function getXpForLevel(level: number): number {
  return xpToNextLevel(level);
}

/** Total cumulative XP needed to reach a given level from level 1. */
export function getTotalXpForLevel(level: number): number {
  return totalXpForLevel(level);
}

/** Determines what level a character should be based on their total XP. */
export function getLevelForXp(totalXp: number): number {
  return levelForXp(totalXp);
}

export interface LevelUpResult {
  levelsGained: number;
  oldLevel: number;
  newLevel: number;
  statPointsGained: number;
  skillPointsGained: number;
  maxHealthGained: number;
  maxManaGained: number;
}

/**
 * Checks if a character has enough XP to level up.
 * If so, applies all level ups (possibly multiple), grants stat/skill points,
 * increases max HP/MP, and heals to full.
 *
 * Returns null if no level up occurred, or the details of the level-up(s).
 */
export async function checkLevelUp(characterId: string): Promise<LevelUpResult | null> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!character) return null;

  const currentLevel = character.level;
  const newLevel = getLevelForXp(character.xp);

  if (newLevel <= currentLevel) return null;

  const levelsGained = newLevel - currentLevel;
  const statPointsGained = levelsGained * LEVEL_UP_REWARDS.STAT_POINTS_PER_LEVEL;
  const skillPointsGained = levelsGained * LEVEL_UP_REWARDS.SKILL_POINTS_PER_LEVEL;
  const maxHealthGained = levelsGained * LEVEL_UP_REWARDS.HP_PER_LEVEL;
  const maxManaGained = levelsGained * LEVEL_UP_REWARDS.MP_PER_LEVEL;

  const newMaxHealth = character.maxHealth + maxHealthGained;
  const newMaxMana = character.maxMana + maxManaGained;

  await prisma.character.update({
    where: { id: characterId },
    data: {
      level: newLevel,
      unspentStatPoints: character.unspentStatPoints + statPointsGained,
      unspentSkillPoints: character.unspentSkillPoints + skillPointsGained,
      maxHealth: newMaxHealth,
      maxMana: newMaxMana,
      health: newMaxHealth, // heal to full
      mana: newMaxMana,     // restore mana to full
    },
  });

  const result: LevelUpResult = {
    levelsGained,
    oldLevel: currentLevel,
    newLevel,
    statPointsGained,
    skillPointsGained,
    maxHealthGained,
    maxManaGained,
  };

  // Check leveling achievements
  const { checkAchievements } = await import('./achievements');
  await checkAchievements(characterId, 'leveling', { level: newLevel });

  // Emit Socket.io event
  emitLevelUp(characterId, {
    characterId,
    newLevel,
    rewards: {
      statPoints: statPointsGained,
      skillPoints: skillPointsGained,
      maxHealth: maxHealthGained,
      maxMana: maxManaGained,
    },
  });

  return result;
}
