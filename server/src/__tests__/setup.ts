import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Use a dedicated test Prisma client
export const prisma = new PrismaClient();

// Ensure JWT_SECRET is set for tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
}

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
  unspentSkillPoints?: number;
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
  const suffix = uuidv4().slice(0, 8);
  const email = options.email || `test_${suffix}@test.com`;
  const username = options.username || `testuser${suffix}`;
  const password = options.password || 'TestPassword123';
  const role = options.role || 'player';

  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed

  const user = await prisma.user.create({
    data: { email, username, passwordHash, role },
  });

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
  const suffix = uuidv4().slice(0, 8);

  const character = await prisma.character.create({
    data: {
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
      mana: 50,
      maxMana: 50,
      unspentStatPoints: charOptions.unspentStatPoints ?? 0,
      unspentSkillPoints: charOptions.unspentSkillPoints ?? 0,
      specialization: charOptions.specialization || null,
    },
  });

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
  const suffix = uuidv4().slice(0, 8);

  const region = await prisma.region.create({
    data: {
      name: `TestRegion${suffix}`,
      description: 'A test region',
      biome: 'PLAINS',
      levelMin: 1,
      levelMax: 50,
    },
  });
  createdRegionIds.push(region.id);

  const town = await prisma.town.create({
    data: {
      name: name || `TestTown${suffix}`,
      regionId: region.id,
      biome: 'PLAINS',
      description: 'A test town',
      population: 100,
    },
  });
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
  const suffix = uuidv4().slice(0, 8);

  const quest = await prisma.quest.create({
    data: {
      name: options.name || `TestQuest${suffix}`,
      type: (options.type || 'TOWN') as any,
      description: 'A test quest',
      levelRequired: options.levelRequired ?? 1,
      objectives: options.objectives || [{ type: 'kill', target: 'goblin', quantity: 3 }],
      rewards: options.rewards || { xp: 100, gold: 50 },
      regionId,
      isRepeatable: options.isRepeatable ?? false,
    },
  });
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
  const suffix = uuidv4().slice(0, 8);

  const monster = await prisma.monster.create({
    data: {
      name: options.name || `TestMonster${suffix}`,
      level: options.level ?? 1,
      stats: { hp: 30, ac: 10, str: 10, dex: 10, con: 10, int: 5, wis: 5, cha: 5, damage: '1d6', attack: 2 },
      lootTable: [{ dropChance: 1.0, minQty: 1, maxQty: 1, gold: 10 }],
      regionId,
      biome: 'PLAINS',
    },
  });
  createdMonsterIds.push(monster.id);
  return monster;
}

/**
 * Create a test kingdom.
 */
export async function createTestKingdom(rulerId?: string) {
  const suffix = uuidv4().slice(0, 8);

  const kingdom = await prisma.kingdom.create({
    data: {
      name: `TestKingdom${suffix}`,
      rulerId: rulerId || null,
      treasury: 10000,
    },
  });
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

  const election = await prisma.election.create({
    data: {
      townId,
      type: (options.type || 'MAYOR') as any,
      phase: (options.phase || 'NOMINATIONS') as any,
      startDate: now,
      endDate,
    },
  });
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
  const suffix = uuidv4().slice(0, 8);

  const template = await prisma.itemTemplate.create({
    data: {
      name: options.name || `TestItem${suffix}`,
      type: (options.type || 'WEAPON') as any,
      rarity: (options.rarity || 'COMMON') as any,
      description: 'A test item',
    },
  });
  createdItemTemplateIds.push(template.id);

  const item = await prisma.item.create({
    data: {
      templateId: template.id,
      ownerId,
      quality: (options.rarity || 'COMMON') as any,
    },
  });

  return { template, item };
}

/**
 * Create a test resource and town resource.
 */
export async function createTestResource(townId: string, options: {
  name?: string;
  type?: string;
} = {}) {
  const suffix = uuidv4().slice(0, 8);

  const resource = await prisma.resource.create({
    data: {
      name: options.name || `TestOre${suffix}`,
      type: (options.type || 'ORE') as any,
      biome: 'PLAINS',
      tier: 1,
      baseGatherTime: 1, // 1 minute for testing
    },
  });
  createdResourceIds.push(resource.id);

  await prisma.townResource.create({
    data: {
      townId,
      resourceType: (options.type || 'ORE') as any,
      abundance: 80,
    },
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
      await prisma.combatParticipant.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.questProgress.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.guildMember.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.electionVote.deleteMany({ where: { voterId: { in: createdCharacterIds } } });
      await prisma.electionCandidate.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.impeachmentVote.deleteMany({ where: { voterId: { in: createdCharacterIds } } });
      await prisma.friend.deleteMany({
        where: { OR: [{ requesterId: { in: createdCharacterIds } }, { recipientId: { in: createdCharacterIds } }] },
      });
      await prisma.message.deleteMany({
        where: { OR: [{ senderId: { in: createdCharacterIds } }, { recipientId: { in: createdCharacterIds } }] },
      });
      await prisma.notification.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.inventory.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.marketListing.deleteMany({ where: { sellerId: { in: createdCharacterIds } } });
      await prisma.gatheringAction.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.craftingAction.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.travelAction.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.characterAbility.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.characterEquipment.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.playerProfession.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.professionXP.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.playerAchievement.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
      await prisma.councilMember.deleteMany({ where: { characterId: { in: createdCharacterIds } } });
    }

    if (createdGuildIds.length > 0) {
      await prisma.guildMember.deleteMany({ where: { guildId: { in: createdGuildIds } } });
      await prisma.guild.deleteMany({ where: { id: { in: createdGuildIds } } });
    }

    if (createdElectionIds.length > 0) {
      await prisma.electionVote.deleteMany({ where: { electionId: { in: createdElectionIds } } });
      await prisma.electionCandidate.deleteMany({ where: { electionId: { in: createdElectionIds } } });
      await prisma.election.deleteMany({ where: { id: { in: createdElectionIds } } });
    }

    if (createdKingdomIds.length > 0) {
      await prisma.war.deleteMany({
        where: { OR: [{ attackerKingdomId: { in: createdKingdomIds } }, { defenderKingdomId: { in: createdKingdomIds } }] },
      });
      await prisma.law.deleteMany({ where: { kingdomId: { in: createdKingdomIds } } });
      await prisma.impeachment.deleteMany({ where: { kingdomId: { in: createdKingdomIds } } });
      await prisma.kingdom.deleteMany({ where: { id: { in: createdKingdomIds } } });
    }

    if (createdMonsterIds.length > 0) {
      await prisma.monster.deleteMany({ where: { id: { in: createdMonsterIds } } });
    }

    if (createdQuestIds.length > 0) {
      await prisma.questProgress.deleteMany({ where: { questId: { in: createdQuestIds } } });
      await prisma.quest.deleteMany({ where: { id: { in: createdQuestIds } } });
    }

    // Clean up items
    if (createdItemTemplateIds.length > 0) {
      await prisma.item.deleteMany({ where: { templateId: { in: createdItemTemplateIds } } });
      await prisma.itemTemplate.deleteMany({ where: { id: { in: createdItemTemplateIds } } });
    }

    if (createdResourceIds.length > 0) {
      await prisma.resource.deleteMany({ where: { id: { in: createdResourceIds } } });
    }

    // Clean up combat sessions that may have been created
    await prisma.combatLog.deleteMany({
      where: { session: { participants: { some: { characterId: { in: createdCharacterIds } } } } },
    });
    await prisma.combatSession.deleteMany({
      where: { participants: { some: { characterId: { in: createdCharacterIds } } } },
    });

    // Now delete characters and users
    if (createdCharacterIds.length > 0) {
      await prisma.character.deleteMany({ where: { id: { in: createdCharacterIds } } });
    }

    if (createdTownIds.length > 0) {
      await prisma.townResource.deleteMany({ where: { townId: { in: createdTownIds } } });
      await prisma.townTreasury.deleteMany({ where: { townId: { in: createdTownIds } } });
      await prisma.townPolicy.deleteMany({ where: { townId: { in: createdTownIds } } });
      await prisma.impeachment.deleteMany({ where: { townId: { in: createdTownIds } } });
      await prisma.town.deleteMany({ where: { id: { in: createdTownIds } } });
    }

    if (createdRegionIds.length > 0) {
      await prisma.region.deleteMany({ where: { id: { in: createdRegionIds } } });
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
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

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
