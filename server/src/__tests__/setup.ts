import { db, pool } from '../lib/db';
import { eq, and, inArray, or } from 'drizzle-orm';
import * as schema from '@database/index';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Ensure JWT_SECRET is set for tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
}

export { db };

// Track created entities for cleanup
const createdUserIds: string[] = [];
const createdCharacterIds: string[] = [];
const createdTownIds: string[] = [];
const createdRegionIds: string[] = [];
const createdGuildIds: string[] = [];
const createdElectionIds: string[] = [];
const createdKingdomIds: string[] = [];
const createdQuestIds: string[] = [];
const createdMonsterIds: string[] = [];
const createdItemTemplateIds: string[] = [];
const createdResourceIds: string[] = [];

export function generateToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

interface TestUserOptions {
  email?: string;
  username?: string;
  password?: string;
  role?: string;
}

interface TestCharacterOptions {
  name?: string;
  race?: string;
  class?: string;
  level?: number;
  gold?: number;
  townId?: string;
  unspentStatPoints?: number;
  specialization?: string;
}

export interface TestUser {
  user: { id: string; email: string; username: string; role: string };
  token: string;
}

export interface TestUserWithCharacter extends TestUser {
  character: {
    id: string;
    name: string;
    race: string;
    class: string | null;
    level: number;
    gold: number;
    currentTownId: string | null;
  };
}

/**
 * Create a test user in the database and return the user + JWT token.
 */
export async function createTestUser(options: TestUserOptions = {}): Promise<TestUser> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const email = options.email || `test_${suffix}@test.com`;
  const username = options.username || `testuser${suffix}`;
  const password = options.password || 'TestPassword123';
  const role = options.role || 'player';

  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed

  const [user] = await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    email,
    username,
    passwordHash,
    role,
  }).returning();

  createdUserIds.push(user.id);

  const token = generateToken(user.id, user.username);

  return {
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
    token,
  };
}

/**
 * Create a test user with an associated character.
 */
export async function createTestUserWithCharacter(
  userOptions: TestUserOptions = {},
  charOptions: TestCharacterOptions = {},
): Promise<TestUserWithCharacter> {
  const testUser = await createTestUser(userOptions);
  const suffix = crypto.randomUUID().slice(0, 8);

  const [character] = await db.insert(schema.characters).values({
    id: crypto.randomUUID(),
    userId: testUser.user.id,
    name: charOptions.name || `Hero${suffix}`,
    race: (charOptions.race || 'HUMAN') as any,
    class: charOptions.class || 'warrior',
    level: charOptions.level ?? 1,
    gold: charOptions.gold ?? 100,
    currentTownId: charOptions.townId || null,
    stats: { str: 12, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    health: 100,
    maxHealth: 100,
    unspentStatPoints: charOptions.unspentStatPoints ?? 0,
    specialization: charOptions.specialization || null,
  }).returning();

  createdCharacterIds.push(character.id);

  return {
    ...testUser,
    character: {
      id: character.id,
      name: character.name,
      race: character.race,
      class: character.class,
      level: character.level,
      gold: character.gold,
      currentTownId: character.currentTownId,
    },
  };
}

/**
 * Create a test region + town combo. Returns the town and region IDs.
 */
export async function createTestTown(name?: string) {
  const suffix = crypto.randomUUID().slice(0, 8);

  const [region] = await db.insert(schema.regions).values({
    id: crypto.randomUUID(),
    name: `TestRegion${suffix}`,
    description: 'A test region',
    biome: 'PLAINS',
    levelMin: 1,
    levelMax: 50,
  }).returning();
  createdRegionIds.push(region.id);

  const [town] = await db.insert(schema.towns).values({
    id: crypto.randomUUID(),
    name: name || `TestTown${suffix}`,
    regionId: region.id,
    biome: 'PLAINS',
    description: 'A test town',
    population: 100,
  }).returning();
  createdTownIds.push(town.id);

  return { town, region };
}

/**
 * Create a test quest in the database.
 */
export async function createTestQuest(regionId: string, options: {
  name?: string;
  type?: string;
  levelRequired?: number;
  objectives?: object[];
  rewards?: object;
  isRepeatable?: boolean;
} = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);

  const [quest] = await db.insert(schema.quests).values({
    id: crypto.randomUUID(),
    name: options.name || `TestQuest${suffix}`,
    type: (options.type || 'TOWN') as any,
    description: 'A test quest',
    levelRequired: options.levelRequired ?? 1,
    objectives: options.objectives || [{ type: 'kill', target: 'goblin', quantity: 3 }],
    rewards: options.rewards || { xp: 100, gold: 50 },
    regionId,
    isRepeatable: options.isRepeatable ?? false,
  }).returning();
  createdQuestIds.push(quest.id);
  return quest;
}

/**
 * Create a test monster in the database.
 */
export async function createTestMonster(regionId: string, options: {
  name?: string;
  level?: number;
} = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);

  const [monster] = await db.insert(schema.monsters).values({
    id: crypto.randomUUID(),
    name: options.name || `TestMonster${suffix}`,
    level: options.level ?? 1,
    stats: { hp: 30, ac: 10, str: 10, dex: 10, con: 10, int: 5, wis: 5, cha: 5, damage: '1d6', attack: 2 },
    lootTable: [{ dropChance: 1.0, minQty: 1, maxQty: 1, gold: 10 }],
    regionId,
    biome: 'PLAINS',
  }).returning();
  createdMonsterIds.push(monster.id);
  return monster;
}

/**
 * Create a test kingdom.
 */
export async function createTestKingdom(rulerId?: string) {
  const suffix = crypto.randomUUID().slice(0, 8);

  const [kingdom] = await db.insert(schema.kingdoms).values({
    id: crypto.randomUUID(),
    name: `TestKingdom${suffix}`,
    rulerId: rulerId || null,
    treasury: 10000,
  }).returning();
  createdKingdomIds.push(kingdom.id);
  return kingdom;
}

/**
 * Create a test election.
 */
export async function createTestElection(townId: string, options: {
  type?: string;
  phase?: string;
} = {}) {
  const now = new Date();
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [election] = await db.insert(schema.elections).values({
    id: crypto.randomUUID(),
    townId,
    type: (options.type || 'MAYOR') as any,
    phase: (options.phase || 'NOMINATIONS') as any,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
  }).returning();
  createdElectionIds.push(election.id);
  return election;
}

/**
 * Create a test item template and an item instance.
 */
export async function createTestItem(ownerId: string, options: {
  name?: string;
  type?: string;
  rarity?: string;
} = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);

  const [template] = await db.insert(schema.itemTemplates).values({
    id: crypto.randomUUID(),
    name: options.name || `TestItem${suffix}`,
    type: (options.type || 'WEAPON') as any,
    rarity: (options.rarity || 'COMMON') as any,
    description: 'A test item',
  }).returning();
  createdItemTemplateIds.push(template.id);

  const [item] = await db.insert(schema.items).values({
    id: crypto.randomUUID(),
    templateId: template.id,
    ownerId,
    quality: (options.rarity || 'COMMON') as any,
  }).returning();

  return { template, item };
}

/**
 * Create a test resource and town resource.
 */
export async function createTestResource(townId: string, options: {
  name?: string;
  type?: string;
} = {}) {
  const suffix = crypto.randomUUID().slice(0, 8);

  const [resource] = await db.insert(schema.resources).values({
    id: crypto.randomUUID(),
    name: options.name || `TestOre${suffix}`,
    type: (options.type || 'ORE') as any,
    biome: 'PLAINS',
    tier: 1,
    baseGatherTime: 1, // 1 minute for testing
  }).returning();
  createdResourceIds.push(resource.id);

  await db.insert(schema.townResources).values({
    id: crypto.randomUUID(),
    townId,
    resourceType: (options.type || 'ORE') as any,
    abundance: 80,
  });

  return resource;
}

/**
 * Clean up all test data created during a test run.
 * Delete in reverse dependency order.
 */
export async function cleanupTestData() {
  try {
    // Delete in reverse dependency order to avoid FK violations
    if (createdCharacterIds.length > 0) {
      // Clean up related data first
      await db.delete(schema.combatParticipants).where(inArray(schema.combatParticipants.characterId, createdCharacterIds));
      await db.delete(schema.questProgress).where(inArray(schema.questProgress.characterId, createdCharacterIds));
      await db.delete(schema.guildMembers).where(inArray(schema.guildMembers.characterId, createdCharacterIds));
      await db.delete(schema.electionVotes).where(inArray(schema.electionVotes.voterId, createdCharacterIds));
      await db.delete(schema.electionCandidates).where(inArray(schema.electionCandidates.characterId, createdCharacterIds));
      await db.delete(schema.impeachmentVotes).where(inArray(schema.impeachmentVotes.voterId, createdCharacterIds));
      await db.delete(schema.friends).where(
        or(
          inArray(schema.friends.requesterId, createdCharacterIds),
          inArray(schema.friends.recipientId, createdCharacterIds),
        ),
      );
      await db.delete(schema.messages).where(
        or(
          inArray(schema.messages.senderId, createdCharacterIds),
          inArray(schema.messages.recipientId, createdCharacterIds),
        ),
      );
      await db.delete(schema.notifications).where(inArray(schema.notifications.characterId, createdCharacterIds));
      await db.delete(schema.inventories).where(inArray(schema.inventories.characterId, createdCharacterIds));
      await db.delete(schema.marketListings).where(inArray(schema.marketListings.sellerId, createdCharacterIds));
      await db.delete(schema.gatheringActions).where(inArray(schema.gatheringActions.characterId, createdCharacterIds));
      await db.delete(schema.craftingActions).where(inArray(schema.craftingActions.characterId, createdCharacterIds));
      await db.delete(schema.characterTravelStates).where(inArray(schema.characterTravelStates.characterId, createdCharacterIds));
      await db.delete(schema.characterAbilities).where(inArray(schema.characterAbilities.characterId, createdCharacterIds));
      await db.delete(schema.characterEquipment).where(inArray(schema.characterEquipment.characterId, createdCharacterIds));
      await db.delete(schema.playerProfessions).where(inArray(schema.playerProfessions.characterId, createdCharacterIds));
      await db.delete(schema.professionXp).where(inArray(schema.professionXp.characterId, createdCharacterIds));
      await db.delete(schema.playerAchievements).where(inArray(schema.playerAchievements.characterId, createdCharacterIds));
      await db.delete(schema.councilMembers).where(inArray(schema.councilMembers.characterId, createdCharacterIds));
    }

    if (createdGuildIds.length > 0) {
      await db.delete(schema.guildMembers).where(inArray(schema.guildMembers.guildId, createdGuildIds));
      await db.delete(schema.guilds).where(inArray(schema.guilds.id, createdGuildIds));
    }

    if (createdElectionIds.length > 0) {
      await db.delete(schema.electionVotes).where(inArray(schema.electionVotes.electionId, createdElectionIds));
      await db.delete(schema.electionCandidates).where(inArray(schema.electionCandidates.electionId, createdElectionIds));
      await db.delete(schema.elections).where(inArray(schema.elections.id, createdElectionIds));
    }

    if (createdKingdomIds.length > 0) {
      await db.delete(schema.wars).where(
        or(
          inArray(schema.wars.attackerKingdomId, createdKingdomIds),
          inArray(schema.wars.defenderKingdomId, createdKingdomIds),
        ),
      );
      await db.delete(schema.laws).where(inArray(schema.laws.kingdomId, createdKingdomIds));
      await db.delete(schema.impeachments).where(inArray(schema.impeachments.kingdomId, createdKingdomIds));
      await db.delete(schema.kingdoms).where(inArray(schema.kingdoms.id, createdKingdomIds));
    }

    if (createdMonsterIds.length > 0) {
      await db.delete(schema.monsters).where(inArray(schema.monsters.id, createdMonsterIds));
    }

    if (createdQuestIds.length > 0) {
      await db.delete(schema.questProgress).where(inArray(schema.questProgress.questId, createdQuestIds));
      await db.delete(schema.quests).where(inArray(schema.quests.id, createdQuestIds));
    }

    // Clean up items
    if (createdItemTemplateIds.length > 0) {
      await db.delete(schema.items).where(inArray(schema.items.templateId, createdItemTemplateIds));
      await db.delete(schema.itemTemplates).where(inArray(schema.itemTemplates.id, createdItemTemplateIds));
    }

    if (createdResourceIds.length > 0) {
      await db.delete(schema.resources).where(inArray(schema.resources.id, createdResourceIds));
    }

    // Clean up combat sessions that may have been created
    if (createdCharacterIds.length > 0) {
      const sessionIds = await db.select({ id: schema.combatParticipants.sessionId })
        .from(schema.combatParticipants)
        .where(inArray(schema.combatParticipants.characterId, createdCharacterIds));
      const sids = sessionIds.map(s => s.id);
      if (sids.length > 0) {
        await db.delete(schema.combatLogs).where(inArray(schema.combatLogs.sessionId, sids));
        await db.delete(schema.combatSessions).where(inArray(schema.combatSessions.id, sids));
      }
    }

    // Now delete characters and users
    if (createdCharacterIds.length > 0) {
      await db.delete(schema.characters).where(inArray(schema.characters.id, createdCharacterIds));
    }

    if (createdTownIds.length > 0) {
      await db.delete(schema.townResources).where(inArray(schema.townResources.townId, createdTownIds));
      await db.delete(schema.townTreasuries).where(inArray(schema.townTreasuries.townId, createdTownIds));
      await db.delete(schema.townPolicies).where(inArray(schema.townPolicies.townId, createdTownIds));
      await db.delete(schema.impeachments).where(inArray(schema.impeachments.townId, createdTownIds));
      await db.delete(schema.towns).where(inArray(schema.towns.id, createdTownIds));
    }

    if (createdRegionIds.length > 0) {
      await db.delete(schema.regions).where(inArray(schema.regions.id, createdRegionIds));
    }

    if (createdUserIds.length > 0) {
      await db.delete(schema.users).where(inArray(schema.users.id, createdUserIds));
    }
  } catch (error) {
    console.error('Cleanup error (non-fatal):', error);
  }

  // Clear tracking arrays
  createdUserIds.length = 0;
  createdCharacterIds.length = 0;
  createdTownIds.length = 0;
  createdRegionIds.length = 0;
  createdGuildIds.length = 0;
  createdElectionIds.length = 0;
  createdKingdomIds.length = 0;
  createdQuestIds.length = 0;
  createdMonsterIds.length = 0;
  createdItemTemplateIds.length = 0;
  createdResourceIds.length = 0;
}

export function trackGuildId(id: string) {
  createdGuildIds.push(id);
}

export async function disconnectDb() {
  await pool.end();
}
