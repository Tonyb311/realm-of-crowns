/**
 * Test cleanup utility.
 *
 * FINDING-017: Provides a reliable cleanupDatabase() that deletes all rows
 * in reverse FK dependency order, preventing orphaned test data.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Delete all rows from every table in reverse FK dependency order.
 * Safe for use in afterAll/afterEach blocks.
 */
export async function cleanupDatabase(): Promise<void> {
  const tables = [
    'LawVote',
    'CombatLog',
    'CombatParticipant',
    'CombatSession',
    'Notification',
    'Message',
    'ChatChannel',
    'MarketListing',
    'TradeTransaction',
    'PriceHistory',
    'Inventory',
    'Item',
    'QuestProgress',
    'Quest',
    'CharacterEquipment',
    'PlayerProfession',
    'ProfessionXP',
    'PlayerAchievement',
    'Friendship',
    'Friend',
    'GuildMember',
    'Guild',
    'DailyAction',
    'GatheringAction',
    'CraftingAction',
    'TravelAction',
    'CharacterAbility',
    'BuildingConstruction',
    'Building',
    'ElectionVote',
    'ElectionCandidate',
    'Election',
    'ImpeachmentVote',
    'Impeachment',
    'CouncilMember',
    'Law',
    'War',
    'TownResource',
    'TownTreasury',
    'TownPolicy',
    'Monster',
    'Resource',
    'Character',
    'User',
    'Town',
    'Kingdom',
    'Region',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}" CASCADE`);
    } catch {
      // Table may not exist — skip silently
    }
  }
}

export { prisma as testPrisma };
