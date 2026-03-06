import { prisma } from '../lib/prisma';
import { emitLevelUp } from '../socket/events';
import {
  xpToNextLevel,
  totalXpForLevel,
  levelForXp,
  LEVEL_UP_REWARDS,
} from '@shared/data/progression';
import { autoGrantAbilities, autoGrantSaveProficiencies } from './ability-grants';
import { TIER0_ABILITIES_BY_CLASS, TIER0_CHOICE_LEVELS } from '@shared/data/skills';

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
  maxHealthGained: number;
  abilitiesGranted: string[];
}

/**
 * Checks if a character has enough XP to level up.
 * If so, applies all level ups (possibly multiple), grants stat points,
 * increases max HP, heals to full, and auto-grants any new abilities.
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
  const maxHealthGained = levelsGained * LEVEL_UP_REWARDS.HP_PER_LEVEL;

  const newMaxHealth = character.maxHealth + maxHealthGained;

  await prisma.character.update({
    where: { id: characterId },
    data: {
      level: newLevel,
      unspentStatPoints: character.unspentStatPoints + statPointsGained,
      maxHealth: newMaxHealth,
      health: newMaxHealth, // heal to full
    },
  });

  // Auto-grant any abilities the character now qualifies for
  const abilitiesGranted = await autoGrantAbilities(characterId);

  // Auto-grant milestone save proficiencies (levels 18, 30, 45)
  await autoGrantSaveProficiencies(characterId);

  const result: LevelUpResult = {
    levelsGained,
    oldLevel: currentLevel,
    newLevel,
    statPointsGained,
    maxHealthGained,
    abilitiesGranted,
  };

  // Check leveling achievements
  const { checkAchievements } = await import('./achievements');
  await checkAchievements(characterId, 'leveling', { level: newLevel });

  // Count pending tier 0 choices at the new level
  let tier0Pending = 0;
  if (character.class) {
    const tier0Abilities = TIER0_ABILITIES_BY_CLASS[character.class] ?? [];
    const existingAbilities = await prisma.characterAbility.findMany({
      where: { characterId },
      select: { abilityId: true },
    });
    const existingSet = new Set(existingAbilities.map((e) => e.abilityId));

    for (const lvl of TIER0_CHOICE_LEVELS) {
      if (newLevel < lvl) continue;
      const group = `${character.class}_tier0_level${lvl}`;
      const groupAbilities = tier0Abilities.filter((a) => a.choiceGroup === group);
      const alreadyChosen = groupAbilities.some((a) => existingSet.has(a.id));
      if (!alreadyChosen) tier0Pending++;
    }
  }

  // Emit Socket.io event
  emitLevelUp(characterId, {
    characterId,
    newLevel,
    rewards: {
      statPoints: statPointsGained,
      maxHealth: maxHealthGained,
      abilitiesGranted,
    },
    tier0Pending: tier0Pending > 0 ? tier0Pending : undefined,
  });

  return result;
}
