// ============================================================
// Realm of Crowns — Shared Enum Definitions
// Source of truth: database/prisma/schema.prisma
// Generated as const arrays with derived TypeScript types.
// ============================================================

// ============================================================
// RACES & RACIAL
// ============================================================

export const RACES = [
  'HUMAN', 'ELF', 'DWARF', 'HARTHFOLK', 'ORC', 'NETHKIN', 'DRAKONID',
  'HALF_ELF', 'HALF_ORC', 'GNOME', 'MERFOLK', 'BEASTFOLK', 'FAEFOLK',
  'GOLIATH', 'NIGHTBORNE', 'MOSSKIN', 'FORGEBORN', 'ELEMENTARI',
  'REVENANT', 'CHANGELING',
] as const;
export type Race = typeof RACES[number];

export const RACE_TIERS = [
  'CORE', 'COMMON', 'EXOTIC',
] as const;
export type RaceTier = typeof RACE_TIERS[number];

export const DRAGON_BLOODLINES = [
  'RED', 'BLUE', 'WHITE', 'BLACK', 'GREEN', 'GOLD', 'SILVER',
] as const;
export type DragonBloodline = typeof DRAGON_BLOODLINES[number];

export const BEAST_CLANS = [
  'WOLF', 'BEAR', 'FOX', 'HAWK', 'PANTHER', 'BOAR',
] as const;
export type BeastClan = typeof BEAST_CLANS[number];

export const ELEMENTAL_TYPES = [
  'FIRE', 'WATER', 'EARTH', 'AIR',
] as const;
export type ElementalType = typeof ELEMENTAL_TYPES[number];

export const RELATION_STATUSES = [
  'ALLIED', 'FRIENDLY', 'NEUTRAL', 'DISTRUSTFUL', 'HOSTILE', 'BLOOD_FEUD',
] as const;
export type RelationStatus = typeof RELATION_STATUSES[number];

// ============================================================
// PROFESSIONS
// ============================================================

export const PROFESSION_TYPES = [
  'FARMER', 'RANCHER', 'FISHERMAN', 'LUMBERJACK', 'MINER', 'HERBALIST',
  'HUNTER', 'SMELTER', 'BLACKSMITH', 'ARMORER', 'WOODWORKER', 'TANNER',
  'LEATHERWORKER', 'TAILOR', 'ALCHEMIST', 'ENCHANTER', 'COOK', 'BREWER',
  'JEWELER', 'FLETCHER', 'MASON', 'SCRIBE', 'MERCHANT', 'INNKEEPER',
  'HEALER', 'STABLE_MASTER', 'BANKER', 'COURIER', 'MERCENARY_CAPTAIN',
] as const;
export type ProfessionType = typeof PROFESSION_TYPES[number];

export const PROFESSION_CATEGORIES = [
  'GATHERING', 'CRAFTING', 'SERVICE',
] as const;
export type ProfessionCategory = typeof PROFESSION_CATEGORIES[number];

export const PROFESSION_TIERS = [
  'APPRENTICE', 'JOURNEYMAN', 'CRAFTSMAN', 'EXPERT', 'MASTER', 'GRANDMASTER',
] as const;
export type ProfessionTier = typeof PROFESSION_TIERS[number];

// ============================================================
// WORLD & BIOMES
// ============================================================

export const BIOME_TYPES = [
  'PLAINS', 'FOREST', 'MOUNTAIN', 'HILLS', 'BADLANDS', 'SWAMP',
  'TUNDRA', 'VOLCANIC', 'COASTAL', 'DESERT', 'RIVER', 'UNDERGROUND',
  'UNDERWATER', 'FEYWILD',
] as const;
export type BiomeType = typeof BIOME_TYPES[number];

// ============================================================
// ITEMS & EQUIPMENT
// ============================================================

export const ITEM_TYPES = [
  'WEAPON', 'ARMOR', 'TOOL', 'CONSUMABLE', 'MATERIAL', 'ACCESSORY',
  'QUEST', 'HOUSING',
] as const;
export type ItemType = typeof ITEM_TYPES[number];

export const ITEM_RARITIES = [
  'POOR', 'COMMON', 'FINE', 'SUPERIOR', 'MASTERWORK', 'LEGENDARY',
] as const;
export type ItemRarity = typeof ITEM_RARITIES[number];

export const RESOURCE_TYPES = [
  'ORE', 'WOOD', 'GRAIN', 'HERB', 'FISH', 'HIDE', 'STONE', 'FIBER',
  'ANIMAL_PRODUCT', 'REAGENT', 'EXOTIC',
] as const;
export type ResourceType = typeof RESOURCE_TYPES[number];

export const EQUIP_SLOTS = [
  'HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'MAIN_HAND', 'OFF_HAND',
  'RING_1', 'RING_2', 'NECK', 'BACK', 'TOOL',
] as const;
export type EquipSlot = typeof EQUIP_SLOTS[number];

// ============================================================
// BUILDINGS
// ============================================================

export const BUILDING_TYPES = [
  'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'SMITHY', 'SMELTERY',
  'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'KITCHEN',
  'BREWERY', 'JEWELER_WORKSHOP', 'FLETCHER_BENCH', 'MASON_YARD',
  'LUMBER_MILL', 'SCRIBE_STUDY', 'STABLE', 'WAREHOUSE', 'BANK', 'INN',
  'MARKET_STALL', 'FARM', 'RANCH', 'MINE',
] as const;
export type BuildingType = typeof BUILDING_TYPES[number];

// ============================================================
// ACTIONS & DAILY SYSTEM
// ============================================================

export const ACTION_STATUSES = [
  'PENDING', 'IN_PROGRESS', 'COMPLETED', 'COLLECTED', 'FAILED', 'CANCELLED',
] as const;
export type ActionStatus = typeof ACTION_STATUSES[number];

export const DAILY_ACTION_TYPES = [
  'GATHER', 'CRAFT', 'TRAVEL', 'GUARD', 'AMBUSH', 'ENLIST',
  'PROPOSE_LAW', 'REST', 'SERVICE', 'COMBAT_PVE', 'COMBAT_PVP',
  'HARVEST', 'JOB',
] as const;
export type DailyActionType = typeof DAILY_ACTION_TYPES[number];

export const DAILY_ACTION_STATUSES = [
  'LOCKED_IN', 'PROCESSING', 'COMPLETED', 'FAILED',
] as const;
export type DailyActionStatus = typeof DAILY_ACTION_STATUSES[number];

// ============================================================
// COMBAT
// ============================================================

export const COMBAT_TYPES = [
  'PVE', 'PVP', 'DUEL', 'ARENA', 'WAR', 'SPAR',
] as const;
export type CombatType = typeof COMBAT_TYPES[number];

export const COMBAT_STANCES = [
  'AGGRESSIVE', 'BALANCED', 'DEFENSIVE', 'EVASIVE',
] as const;
export type CombatStance = typeof COMBAT_STANCES[number];

export const COMBAT_SESSION_STATUSES = [
  'PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED',
] as const;
export type CombatSessionStatus = typeof COMBAT_SESSION_STATUSES[number];

// ============================================================
// POLITICS & ELECTIONS
// ============================================================

export const ELECTION_TYPES = [
  'MAYOR', 'RULER', 'GUILD_LEADER',
] as const;
export type ElectionType = typeof ELECTION_TYPES[number];

export const ELECTION_PHASES = [
  'NOMINATIONS', 'CAMPAIGNING', 'VOTING', 'COMPLETED',
] as const;
export type ElectionPhase = typeof ELECTION_PHASES[number];

export const ELECTION_STATUSES = [
  'SCHEDULED', 'ACTIVE', 'COMPLETED',
] as const;
export type ElectionStatus = typeof ELECTION_STATUSES[number];

export const IMPEACHMENT_STATUSES = [
  'ACTIVE', 'PASSED', 'FAILED',
] as const;
export type ImpeachmentStatus = typeof IMPEACHMENT_STATUSES[number];

export const LAW_STATUSES = [
  'PROPOSED', 'VOTING', 'ACTIVE', 'REJECTED', 'EXPIRED',
] as const;
export type LawStatus = typeof LAW_STATUSES[number];

export const PETITION_STATUSES = [
  'ACTIVE', 'FULFILLED', 'EXPIRED', 'REJECTED',
] as const;
export type PetitionStatus = typeof PETITION_STATUSES[number];

// ============================================================
// DIPLOMACY & WAR
// ============================================================

export const DIPLOMACY_ACTION_TYPES = [
  'PROPOSE_TREATY', 'DECLARE_WAR', 'TRADE_AGREEMENT',
  'NON_AGGRESSION_PACT', 'ALLIANCE', 'BREAK_TREATY',
] as const;
export type DiplomacyActionType = typeof DIPLOMACY_ACTION_TYPES[number];

export const WAR_STATUSES = [
  'ACTIVE', 'PEACE_PROPOSED', 'ENDED',
] as const;
export type WarStatus = typeof WAR_STATUSES[number];

export const TREATY_TYPES = [
  'TRADE_AGREEMENT', 'NON_AGGRESSION_PACT', 'ALLIANCE',
] as const;
export type TreatyType = typeof TREATY_TYPES[number];

export const TREATY_STATUSES = [
  'PENDING', 'ACTIVE', 'EXPIRED', 'BROKEN',
] as const;
export type TreatyStatus = typeof TREATY_STATUSES[number];

// ============================================================
// QUESTS
// ============================================================

export const QUEST_TYPES = [
  'MAIN', 'TOWN', 'DAILY', 'GUILD', 'BOUNTY', 'RACIAL', 'TUTORIAL',
] as const;
export type QuestType = typeof QUEST_TYPES[number];

// ============================================================
// SOCIAL & MESSAGING
// ============================================================

export const FRIEND_STATUSES = [
  'PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED',
] as const;
export type FriendStatus = typeof FRIEND_STATUSES[number];

export const MESSAGE_CHANNELS = [
  'GLOBAL', 'TOWN', 'GUILD', 'PARTY', 'WHISPER', 'TRADE', 'SYSTEM',
] as const;
export type MessageChannel = typeof MESSAGE_CHANNELS[number];

// ============================================================
// CHARACTER STATE
// ============================================================

export const HUNGER_STATES = [
  'FED', 'HUNGRY', 'STARVING', 'INCAPACITATED',
] as const;
export type HungerState = typeof HUNGER_STATES[number];

export const FOOD_PRIORITIES = [
  'EXPIRING_FIRST', 'BEST_FIRST', 'SPECIFIC_ITEM', 'CATEGORY_ONLY',
] as const;
export type FoodPriority = typeof FOOD_PRIORITIES[number];

// ============================================================
// ECONOMY & FINANCE
// ============================================================

export const LOAN_STATUSES = [
  'ACTIVE', 'REPAID', 'DEFAULTED', 'GARNISHED',
] as const;
export type LoanStatus = typeof LOAN_STATUSES[number];

// ============================================================
// NPCS
// ============================================================

export const NPC_ROLES = [
  'QUEST_GIVER', 'MERCHANT', 'TRAINER', 'GUARD',
] as const;
export type NpcRole = typeof NPC_ROLES[number];

// ============================================================
// SYSTEM & LOGGING
// ============================================================

export const LOG_LEVELS = [
  'ERROR', 'WARN', 'INFO', 'DEBUG',
] as const;
export type LogLevel = typeof LOG_LEVELS[number];
