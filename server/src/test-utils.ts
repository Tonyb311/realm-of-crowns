/**
 * Test cleanup utility.
 *
 * FINDING-017: Provides a reliable cleanupDatabase() that deletes all rows
 * in reverse FK dependency order, preventing orphaned test data.
 */
import { db } from './lib/db';
import { sql } from 'drizzle-orm';

/**
 * Delete all rows from every table in reverse FK dependency order.
 * Safe for use in afterAll/afterEach blocks.
 */
export async function cleanupDatabase(): Promise<void> {
  const tables = [
    'law_votes',
    'combat_logs',
    'combat_participants',
    'combat_sessions',
    'notifications',
    'messages',
    'chat_channels',
    'market_listings',
    'trade_transactions',
    'price_histories',
    'inventories',
    'items',
    'quest_progress',
    'quests',
    'character_equipment',
    'player_professions',
    'profession_xp',
    'player_achievements',
    'friendships',
    'friends',
    'guild_members',
    'guilds',
    'daily_actions',
    'gathering_actions',
    'crafting_actions',
    'travel_actions',
    'character_abilities',
    'building_constructions',
    'buildings',
    'election_votes',
    'election_candidates',
    'elections',
    'impeachment_votes',
    'impeachments',
    'council_members',
    'laws',
    'wars',
    'town_resources',
    'town_treasuries',
    'town_policies',
    'monsters',
    'resources',
    'characters',
    'users',
    'towns',
    'kingdoms',
    'regions',
  ];

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`DELETE FROM "${table}" CASCADE`));
    } catch {
      // Table may not exist — skip silently
    }
  }
}

export { db as testDb };
