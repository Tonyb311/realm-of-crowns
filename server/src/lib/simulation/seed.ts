// ---------------------------------------------------------------------------
// Bot Account Creation & Cleanup
// ---------------------------------------------------------------------------

import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Race, DragonBloodline, BeastClan, ElementalType } from '@prisma/client';
import { getRace } from '@shared/data/races';
import { BotState, BotProfile, SeedConfig, DEFAULT_CONFIG, BOT_PROFILES } from './types';
import { generateCharacterName, resetNameCounter } from './names';
import { logger } from '../../lib/logger';
import { giveStartingInventory } from '../../lib/starting-inventory';
import { getReleasedRaceKeys, getReleasedTownIds } from '../../lib/content-release';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Weighted random selection from a set of items with associated weights.
 * Returns one of the items, chosen with probability proportional to its weight.
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Pick from an array where some entries are "favored" (weight 3) and the rest
 * get weight 1.
 */
function pickWeighted<T>(all: T[], favored: T[]): T {
  const favoredSet = new Set(favored);
  const weights = all.map((v) => (favoredSet.has(v) ? 3 : 1));
  return weightedRandom(all, weights);
}

// ---------------------------------------------------------------------------
// Profile-based race and class preferences
// ---------------------------------------------------------------------------

const ALL_RACES = Object.values(Race);
const ALL_CLASSES = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion'] as const;

const GATHERING_PROFESSIONS = ['MINER', 'FARMER', 'LUMBERJACK', 'HERBALIST', 'FISHERMAN', 'HUNTER', 'RANCHER'];

const PROFILE_RACE_PREFERENCES: Record<BotProfile, Race[]> = {
  gatherer: [Race.HUMAN, Race.HARTHFOLK, Race.MOSSKIN, Race.ELF],
  crafter: [Race.DWARF, Race.GNOME, Race.FORGEBORN],
  warrior: [Race.ORC, Race.HALF_ORC, Race.GOLIATH, Race.DRAKONID],
  merchant: [Race.HARTHFOLK, Race.HUMAN, Race.HALF_ELF],
  politician: [Race.HUMAN, Race.ELF, Race.HALF_ELF],
  socialite: [],
  balanced: [],
  explorer: [],
};

const PROFILE_CLASS_PREFERENCES: Record<BotProfile, string[]> = {
  gatherer: ['ranger', 'rogue'],
  crafter: ['rogue', 'ranger'],
  warrior: ['warrior', 'ranger'],
  merchant: ['bard', 'rogue'],
  politician: ['bard', 'cleric'],
  socialite: ['bard'],
  explorer: ['ranger'],
  balanced: [],
};

// Race enum -> registry key mapping (lowercase, underscored for half_ races)
function raceToRegistryKey(race: Race): string {
  return race.toLowerCase();
}

// Gold starting amounts by race tier (0 gold — bots start with 5 Basic Rations instead)
const GOLD_BY_TIER: Record<string, number> = {
  core: 0,
  common: 0,
  exotic: 0,
};

// HP by class
const CLASS_HP_MAP: Record<string, number> = {
  warrior: 10,
  cleric: 8,
  ranger: 8,
  rogue: 6,
  bard: 6,
  mage: 4,
  psion: 4,
};

// Primary stat by class (for distributing extra stat points at higher starting levels)
const CLASS_PRIMARY_STAT: Record<string, string> = {
  warrior: 'str',
  mage: 'int',
  rogue: 'dex',
  cleric: 'wis',
  ranger: 'dex',
  bard: 'cha',
  psion: 'int',
};

// ---------------------------------------------------------------------------
// seedBots
// ---------------------------------------------------------------------------

/**
 * Create bot accounts and characters in the database, returning fully
 * populated BotState objects ready for the simulation loop.
 *
 * Bots are created in batches of 10 to avoid overwhelming the database.
 */
export async function seedBots(config: SeedConfig): Promise<BotState[]> {
  resetNameCounter();

  const bots: BotState[] = [];
  const batchSize = 10;

  // Pre-resolve the profile distribution weights
  const profiles = [...BOT_PROFILES];
  const profileWeights = profiles.map((p) => DEFAULT_CONFIG.profileDistribution[p] || 1);

  // Filter races to released content only
  const releasedRaceKeys = await getReleasedRaceKeys();
  const releasedRaceEnums = ALL_RACES.filter(r => releasedRaceKeys.has(r.toLowerCase()));
  if (releasedRaceEnums.length === 0) {
    throw new Error('No released races found. Release at least one race before seeding bots.');
  }

  // Build town pool — only released towns
  let townPool: { id: string; name: string }[];
  if (config.townIds === 'all') {
    townPool = await prisma.town.findMany({
      where: { isReleased: true },
      select: { id: true, name: true },
    });
  } else {
    townPool = await prisma.town.findMany({
      where: { id: { in: config.townIds }, isReleased: true },
      select: { id: true, name: true },
    });
  }
  if (townPool.length === 0) throw new Error('No valid released towns found');

  for (let batchStart = 1; batchStart <= config.count; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize - 1, config.count);
    const batchIndices = Array.from({ length: batchEnd - batchStart + 1 }, (_, k) => batchStart + k);

    const batchResults = await Promise.all(
      batchIndices.map((i) => createSingleBot(i, config, townPool, profiles, profileWeights, releasedRaceEnums)),
    );

    bots.push(...batchResults);
    logger.info({ batch: `${batchStart}-${batchEnd}`, total: config.count }, 'Bot batch seeded');
  }

  logger.info({ count: bots.length }, 'All bots seeded');
  return bots;
}

async function createSingleBot(
  index: number,
  config: SeedConfig,
  townPool: { id: string; name: string }[],
  profiles: BotProfile[],
  profileWeights: number[],
  releasedRaceEnums: Race[] = ALL_RACES,
): Promise<BotState> {
  // 1. Assign profile
  const profile = weightedRandom(profiles, profileWeights);

  // 2. Choose race (from released races only)
  let raceEnum: Race;
  if (config.raceDistribution === 'even') {
    // Uniform distribution across released races
    raceEnum = pick(releasedRaceEnums);
  } else {
    // 'realistic' — profile-weighted approach, filtered to released
    const favoredRaces = PROFILE_RACE_PREFERENCES[profile].filter(r => releasedRaceEnums.includes(r));
    raceEnum = favoredRaces.length > 0
      ? pickWeighted(releasedRaceEnums, favoredRaces)
      : pick(releasedRaceEnums);
  }

  // 3. Choose class
  let charClass: string;
  if (config.classDistribution === 'even') {
    // Uniform distribution across all classes
    charClass = pick([...ALL_CLASSES]);
  } else {
    // 'realistic' — profile-weighted approach
    const favoredClasses = PROFILE_CLASS_PREFERENCES[profile];
    charClass = favoredClasses.length > 0
      ? pickWeighted([...ALL_CLASSES], favoredClasses)
      : pick([...ALL_CLASSES]);
  }

  // 4. Resolve race definition (used for town, stats, and tier)
  const registryKey = raceToRegistryKey(raceEnum);
  const raceDef = getRace(registryKey);

  // 5. Resolve starting town
  let townId: string;
  if (Array.isArray(config.townIds)) {
    // Admin specified towns — distribute evenly
    townId = townPool[index % townPool.length].id;
  } else {
    // 'all' — use race-based defaults (released towns only)
    if (raceDef && raceDef.startingTowns.length > 0) {
      const townName = pick(raceDef.startingTowns);
      const town = await prisma.town.findFirst({
        where: { name: { equals: townName, mode: 'insensitive' }, isReleased: true },
      });
      townId = town?.id ?? townPool[index % townPool.length].id;
    } else {
      // CHANGELING or missing race def — pick from pool
      townId = townPool[index % townPool.length].id;
    }
  }

  // 6. Sub-race handling
  let dragonBloodline: DragonBloodline | null = null;
  let beastClan: BeastClan | null = null;
  let elementalType: ElementalType | null = null;

  if (raceEnum === Race.DRAKONID) {
    dragonBloodline = pick(Object.values(DragonBloodline));
  } else if (raceEnum === Race.BEASTFOLK) {
    beastClan = pick(Object.values(BeastClan));
  } else if (raceEnum === Race.ELEMENTARI) {
    elementalType = pick(Object.values(ElementalType));
  }

  // 7. Create User
  const user = await prisma.user.create({
    data: {
      email: `${config.namePrefix.toLowerCase()}${index}@simulation.roc`,
      username: `${config.namePrefix.toLowerCase()}${index}`,
      passwordHash: await bcrypt.hash('simbot', 4), // low rounds for speed
      isTestAccount: true,
    },
  });

  // 8. Calculate starting stats

  const baseStat = 10;
  const mods = raceDef?.statModifiers ?? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const stats: Record<string, number> = {
    str: baseStat + mods.str,
    dex: baseStat + mods.dex,
    con: baseStat + mods.con,
    int: baseStat + mods.int,
    wis: baseStat + mods.wis,
    cha: baseStat + mods.cha,
  };

  // 9. Starting level handling
  const startLevel = Math.max(1, Math.min(10, config.startingLevel));

  // Calculate accumulated XP for this level
  let accumulatedXP = 0;
  for (let lvl = 1; lvl < startLevel; lvl++) {
    accumulatedXP += Math.floor(10 * Math.pow(lvl, 1.15)) + 30;
  }

  // Extra stat points from leveling — distribute to primary stat based on class
  const extraStatPoints = startLevel - 1;
  const primaryStat = CLASS_PRIMARY_STAT[charClass] || 'str';
  stats[primaryStat] += extraStatPoints;

  const conModifier = Math.floor((stats.con - 10) / 2);
  const maxHealth = (10 + conModifier + (CLASS_HP_MAP[charClass] || 6)) * startLevel;

  // Gold by tier
  const tier = raceDef?.tier ?? 'core';
  const gold = GOLD_BY_TIER[tier] ?? 100;

  // Skill points from leveling
  const unspentSkillPoints = startLevel - 1;

  // 10. Starting profession (if professionDistribution is configured)
  let startingProfession: string | null = null;
  if (config.professionDistribution === 'even') {
    // Round-robin through gathering professions
    startingProfession = GATHERING_PROFESSIONS[index % GATHERING_PROFESSIONS.length];
  }
  // 'diverse' uses profile-based selection at runtime (existing engine logic)

  // 11. Create Character
  const character = await prisma.character.create({
    data: {
      userId: user.id,
      name: generateCharacterName(raceEnum.toString()),
      race: raceEnum,
      dragonBloodline,
      beastClan,
      elementalType,
      class: charClass,
      stats,
      gold,
      level: startLevel,
      xp: accumulatedXP,
      health: maxHealth,
      maxHealth,
      unspentSkillPoints,
      currentTownId: townId,
      homeTownId: townId,
    },
  });

  // 12. Give starting inventory (5 Basic Rations)
  await giveStartingInventory(character.id);

  // 13. Generate JWT
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: 'player' },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' },
  );

  // 14. Return BotState
  return {
    userId: user.id,
    characterId: character.id,
    username: user.username,
    characterName: character.name,
    token,
    profile,
    race: raceEnum,
    class: charClass,
    currentTownId: townId,
    gold,
    level: startLevel,
    professions: startingProfession ? [startingProfession] : [],
    lastActionAt: Date.now(),
    lastAction: null,
    actionsCompleted: 0,
    consecutiveErrors: 0,
    errorsTotal: 0,
    isActive: true,
    pendingGathering: false,
    pendingCrafting: false,
    pausedUntil: 0,
    intelligence: config.intelligence,
  };
}

// ---------------------------------------------------------------------------
// cleanupBots
// ---------------------------------------------------------------------------

/**
 * Bulletproof cleanup: removes ALL test accounts and their associated data
 * without foreign-key violations.
 */
export async function cleanupBots(): Promise<{ deletedUsers: number; deletedCharacters: number }> {
  // 1. Gather test user IDs
  const testUsers = await prisma.user.findMany({
    where: { isTestAccount: true },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);

  if (userIds.length === 0) {
    logger.info('No test accounts to clean up');
    return { deletedUsers: 0, deletedCharacters: 0 };
  }

  // 2. Gather their character IDs
  const testCharacters = await prisma.character.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const charIds = testCharacters.map((c) => c.id);

  // 3. Transactional cleanup to avoid FK violations
  const result = await prisma.$transaction(async (tx) => {
    // 4. Delete items owned by bot characters
    if (charIds.length > 0) {
      await tx.item.deleteMany({ where: { ownerId: { in: charIds } } });

      // 5. Null out craftedById references on items crafted by bots but owned by real players
      await tx.item.updateMany({
        where: { craftedById: { in: charIds } },
        data: { craftedById: null },
      });

      // 6. Null out guild leaderId
      await tx.guild.updateMany({
        where: { leaderId: { in: charIds } },
        data: { leaderId: null },
      });

      // 7. Null out town mayorId
      await tx.town.updateMany({
        where: { mayorId: { in: charIds } },
        data: { mayorId: null },
      });

      // 8. Null out kingdom rulerId
      await tx.kingdom.updateMany({
        where: { rulerId: { in: charIds } },
        data: { rulerId: null },
      });

      // 9. Delete DailyAction records
      await tx.dailyAction.deleteMany({
        where: { characterId: { in: charIds } },
      });
    }

    // 10. Delete users (cascades to characters and most other tables)
    const deleted = await tx.user.deleteMany({
      where: { isTestAccount: true },
    });

    return { deletedUsers: deleted.count, deletedCharacters: charIds.length };
  });

  logger.info(result, 'Bot cleanup complete');
  return result;
}

// ---------------------------------------------------------------------------
// getTestPlayerCount
// ---------------------------------------------------------------------------

/**
 * Returns the number of test accounts currently in the database.
 */
export async function getTestPlayerCount(): Promise<number> {
  return prisma.user.count({ where: { isTestAccount: true } });
}

// ---------------------------------------------------------------------------
// Resource Cache
// ---------------------------------------------------------------------------

let resourceCache: Map<string, { id: string; name: string; type: string }[]> | null = null;

/**
 * One-time query to build a resource lookup map keyed by resource type.
 * Call once at simulation startup so gathering actions can resolve resources
 * without repeated DB queries.
 */
export async function initResourceCache(): Promise<void> {
  const resources = await prisma.resource.findMany({
    select: { id: true, name: true, type: true },
  });
  resourceCache = new Map();
  for (const r of resources) {
    const list = resourceCache.get(r.type) || [];
    list.push({ id: r.id, name: r.name, type: r.type });
    resourceCache.set(r.type, list);
  }
  logger.info({ resourceTypes: resourceCache.size, totalResources: resources.length }, 'Resource cache initialized');
}

/**
 * Retrieve cached resources for a given type (e.g. "ORE", "WOOD").
 * Returns an empty array if the cache has not been initialized or the type
 * has no entries.
 */
export function getResourcesByType(type: string): { id: string; name: string; type: string }[] {
  return resourceCache?.get(type) || [];
}
