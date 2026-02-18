import { prisma } from '../lib/prisma';
import { emitAchievementUnlocked } from '../socket/events';

export interface AchievementCheckResult {
  unlocked: string[];
}

/**
 * Checks if a character qualifies for any not-yet-earned achievements
 * based on the provided category and data context.
 *
 * Categories and their data fields:
 * - combat_pve: { wins: number }
 * - combat_pvp: { wins: number }
 * - crafting: { itemsCrafted: number, professionTier?: string }
 * - social: { friendsCount: number, isGuildLeader?: boolean }
 * - exploration: { townsVisited: number }
 * - economy: { marketSales: number, goldFromSales?: number }
 * - political: { electionsWon: number, lawsEnacted?: number }
 * - leveling: { level: number }
 * - gathering: { completed: number }
 * - progression: { hasSpecialization?: boolean, abilitiesUnlocked?: number }
 */
export async function checkAchievements(
  characterId: string,
  category: string,
  data: Record<string, unknown>,
): Promise<AchievementCheckResult> {
  // Get all achievements (isCriteriaCategoryMatch filters by category downstream)
  const achievements = await prisma.achievement.findMany();

  // Get already earned achievements
  const earned = await prisma.playerAchievement.findMany({
    where: { characterId },
    select: { achievementId: true },
  });
  const earnedIds = new Set(earned.map((e) => e.achievementId));

  const unlocked: string[] = [];

  for (const achievement of achievements) {
    if (earnedIds.has(achievement.id)) continue;

    const criteria = achievement.criteria as { type: string; target: number; [key: string]: unknown };

    // Filter by category-relevant criteria types
    if (!isCriteriaCategoryMatch(criteria.type, category)) continue;

    const met = checkCriteria(criteria, data);
    if (!met) continue;

    // Grant achievement
    await prisma.playerAchievement.create({
      data: {
        characterId,
        achievementId: achievement.id,
      },
    });

    // Apply rewards
    const reward = achievement.reward as { xp?: number; gold?: number; title?: string };
    const updateData: Record<string, unknown> = {};
    if (reward.xp) updateData.xp = { increment: reward.xp };
    if (reward.gold) updateData.gold = { increment: reward.gold };
    if (reward.title) updateData.title = reward.title;

    if (Object.keys(updateData).length > 0) {
      await prisma.character.update({
        where: { id: characterId },
        data: updateData as any,
      });
    }

    unlocked.push(achievement.name);

    // Emit socket event
    emitAchievementUnlocked(characterId, {
      characterId,
      achievementId: achievement.id,
      name: achievement.name,
      description: achievement.description ?? '',
      reward,
    });
  }

  return { unlocked };
}

function isCriteriaCategoryMatch(criteriaType: string, category: string): boolean {
  const mapping: Record<string, string[]> = {
    combat_pve: ['pve_wins'],
    combat_pvp: ['pvp_wins'],
    crafting: ['items_crafted', 'profession_tier'],
    social: ['friends_count', 'guild_leader'],
    exploration: ['towns_visited'],
    economy: ['market_sales', 'gold_earned_from_sales'],
    political: ['elections_won', 'laws_enacted'],
    leveling: ['level_reached'],
    gathering: ['gathering_completed'],
    progression: ['has_specialization', 'abilities_unlocked'],
  };

  return mapping[category]?.includes(criteriaType) ?? false;
}

function checkCriteria(
  criteria: { type: string; target: number; [key: string]: unknown },
  data: Record<string, unknown>,
): boolean {
  switch (criteria.type) {
    case 'pve_wins':
      return (data.wins as number ?? 0) >= criteria.target;
    case 'pvp_wins':
      return (data.wins as number ?? 0) >= criteria.target;
    case 'items_crafted':
      return (data.itemsCrafted as number ?? 0) >= criteria.target;
    case 'profession_tier':
      return data.professionTier === criteria.tier;
    case 'friends_count':
      return (data.friendsCount as number ?? 0) >= criteria.target;
    case 'guild_leader':
      return !!data.isGuildLeader;
    case 'towns_visited':
      return (data.townsVisited as number ?? 0) >= criteria.target;
    case 'market_sales':
      return (data.marketSales as number ?? 0) >= criteria.target;
    case 'gold_earned_from_sales':
      return (data.goldFromSales as number ?? 0) >= criteria.target;
    case 'elections_won':
      return (data.electionsWon as number ?? 0) >= criteria.target;
    case 'laws_enacted':
      return (data.lawsEnacted as number ?? 0) >= criteria.target;
    case 'level_reached':
      return (data.level as number ?? 0) >= criteria.target;
    case 'gathering_completed':
      return (data.completed as number ?? 0) >= criteria.target;
    case 'has_specialization':
      return !!data.hasSpecialization;
    case 'abilities_unlocked':
      return (data.abilitiesUnlocked as number ?? 0) >= criteria.target;
    default:
      return false;
  }
}

/**
 * Seeds all achievements defined in shared data into the database.
 * Skips any that already exist (by name).
 */
export async function seedAchievements(): Promise<{ created: number; skipped: number }> {
  // Dynamic import to avoid bundling issues
  const { ACHIEVEMENTS } = await import('@shared/data/achievements');

  let created = 0;
  let skipped = 0;

  for (const achievement of ACHIEVEMENTS) {
    const existing = await prisma.achievement.findUnique({
      where: { name: achievement.name },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.achievement.create({
      data: {
        name: achievement.name,
        description: achievement.description,
        criteria: achievement.criteria as any,
        reward: achievement.reward as any,
      },
    });
    created++;
  }

  return { created, skipped };
}
