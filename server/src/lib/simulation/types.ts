// ---------------------------------------------------------------------------
// Bot Simulation Types
// ---------------------------------------------------------------------------

import { TICK_CONSTANTS } from '@shared/data/constants/tick';

export const BOT_PROFILES = [
  'gatherer', 'crafter', 'merchant', 'warrior',
  'politician', 'socialite', 'explorer', 'balanced',
] as const;

export type BotProfile = typeof BOT_PROFILES[number];

export interface BotState {
  userId: string;
  characterId: string;
  username: string;
  characterName: string;
  token: string;
  profile: BotProfile;
  race: string;
  class: string;
  currentTownId: string;
  gold: number;
  xp: number;
  level: number;
  professions: string[];
  professionLevels: Record<string, number>;  // profession name -> level
  professionSpecializations: Record<string, string>;  // profession name -> specialization (e.g. BLACKSMITH -> TOOLSMITH)
  lastActionAt: number;
  lastAction: string | null;
  actionsCompleted: number;
  consecutiveErrors: number;
  errorsTotal: number;
  isActive: boolean;
  pendingGathering: boolean;
  pendingCrafting: boolean;
  pendingTravel: boolean;
  pausedUntil: number;
  intelligence: number; // 0-100
  partyId: string | null;       // Current party ID (null if not in a party)
  partyRole: string | null;     // 'leader' | 'member' | null
  partyTicksRemaining: number;  // Ticks until bot disbands the party (3-5)
  homeTownId: string;           // Bot's home town (for "travel home" logic)
  lastTravelTick: number;       // Last tick when bot traveled (for cooldown)
  p6ConsecutiveTrips: number;   // Consecutive ticks bot chose P6 combat travel
  p6BackoffUntilTick: number;   // Tick until which P6 is forced-skipped (backoff)
  neededItemNames: Set<string>;  // Cached recipe input names for bot's own professions (built at seed time)
  buyFailCooldowns: Map<string, number>;  // v20: itemName → tick when cooldown expires (skip buy attempts for 5 ticks after failure)
}

export interface SimulationConfig {
  botCount: number;
  tickIntervalMs: number;
  botsPerTick: number;
  actionsPerTick: number;
  profileDistribution: Partial<Record<BotProfile, number>>;
  enabledSystems: {
    combat: boolean;
    crafting: boolean;
    gathering: boolean;
    market: boolean;
    quests: boolean;
    governance: boolean;
    guilds: boolean;
    travel: boolean;
    social: boolean;
  };
  durationMinutes?: number;
}

export interface SimulationStatus {
  status: 'idle' | 'running' | 'paused' | 'stopping';
  startedAt: string | null;
  botCount: number;
  activeBots: number;
  totalActions: number;
  totalErrors: number;
  actionsPerMinute: number;
  uptime: number;
  bots: BotSummary[];
  recentActivity: ActivityEntry[];
  intelligence: number;
  gameDay: number;
  gameDayOffset: number;
  runProgress: { current: number; total: number } | null;
  lastTickNumber: number;
}

export interface BotSummary {
  characterId: string;
  characterName: string;
  username: string;
  profile: BotProfile;
  race: string;
  class: string;
  level: number;
  gold: number;
  currentTownId: string;
  lastAction: string | null;
  lastActionAt: number;
  actionsCompleted: number;
  errorsTotal: number;
  isActive: boolean;
  status: 'active' | 'idle' | 'paused' | 'error';
}

export interface ActivityEntry {
  timestamp: string;
  characterId: string;
  botName: string;
  profile: BotProfile;
  action: string;
  endpoint: string;
  success: boolean;
  detail: string;
  durationMs: number;
}

export interface ActionResult {
  success: boolean;
  detail: string;
  endpoint: string;
  httpStatus?: number;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
}

export interface DispatchResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // HTTP response body — genuinely dynamic JSON
}

// ---------------------------------------------------------------------------
// API response shapes (used by actions.ts for typing HTTP responses)
// ---------------------------------------------------------------------------

export interface ApiRecipe {
  id: string;
  recipeId?: string;
  name: string;
  canCraft: boolean;
  professionType?: string;
  tier?: number;
  ingredients?: ApiRecipeInput[];
  inputs?: ApiRecipeInput[];
  outputItemName?: string;
  outputTemplateId?: string;
  outputQuantity?: number;
  requiredLevel?: number;
  craftMinutes?: number;
  category?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiRecipeInput {
  itemName?: string;
  templateName?: string;
  templateId?: string;
  name?: string;
  quantity: number;
  needed?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiInventoryItem {
  id: string;
  itemId?: string;
  templateName?: string;
  name?: string;
  templateId?: string;
  quantity?: number;
  equipped?: boolean;
  isEquipped?: boolean;
  slot?: string;
  type?: string;
  itemType?: string;
  baseValue?: number;
  value?: number;
  stats?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiMarketListing {
  id: string;
  listingId?: string;
  itemId?: string;
  itemName?: string;
  name?: string;
  price: number;
  unitPrice?: number;
  quantity?: number;
  sellerId?: string;
  sellerName?: string;
  templateId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiRoute {
  id: string;
  routeId?: string;
  fromTownId?: string;
  toTownId?: string;
  fromTown?: { id: string; name: string };
  toTown?: { id: string; name: string };
  destination?: { id: string; name: string };
  terrain?: string;
  estimatedTime?: number;
  distance?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiQuest {
  id: string;
  questId?: string;
  name?: string;
  title?: string;
  type?: string;
  objectives?: unknown[];
  progress?: Record<string, number>;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiTool {
  id: string;
  itemId?: string;
  stats?: { professionType?: string; yieldBonus?: number; qualityBonus?: number };
  currentDurability: number;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiAsset {
  id: string;
  townId: string;
  name?: string;
  cropState?: string;
  professionType?: string;
  spotType?: string;
  pendingYield?: number;
  capacity?: number;
  aliveCount?: number;
  tier?: number;
  jobs?: unknown[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiJob {
  id: string;
  category?: string;
  pay?: number;
  posterId?: string;
  title?: string;
  jobLabel?: string;
  jobType?: string;
  assetName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiBuilding {
  id: string;
  town?: { id: string; name: string };
  townId?: string;
  name?: string;
  spotType?: string;
  capacity?: number;
  aliveCount?: number;
  type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiHouse {
  id: string;
  townId: string;
  storageCapacity?: number;
  storageUsed?: number;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiStorageItem {
  itemName: string;
  quantity: number;
  templateId?: string;
  itemTemplateId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiProfession {
  type: string;
  professionType?: string;
  name?: string;
  level?: number;
  assetTypes?: ApiProfessionAssetType[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ApiProfessionAssetType {
  id?: string;
  name?: string;
  spotType?: string;
  tiers?: ApiAssetTier[];
}

export interface ApiAssetTier {
  tier: number;
  name?: string;
  cost?: number;
  locked?: boolean;
  owned?: number;
  maxSlots?: number;
  nextSlotCost?: number;
  levelRequired?: number;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ---------------------------------------------------------------------------
// Seed Configuration (used by seedBots, separate from SimulationConfig)
// ---------------------------------------------------------------------------

export interface SeedConfig {
  count: number;
  townIds: string[] | 'all';
  intelligence: number; // 0-100
  raceDistribution: 'even' | 'realistic';
  classDistribution: 'even' | 'realistic';
  professionDistribution: 'even' | 'diverse';
  startingLevel: number | 'diverse'; // 1-10 or 'diverse' for L1-L7 spread
  startingGold: number; // 0-1000
  namePrefix: string;
}

export const DEFAULT_SEED_CONFIG: SeedConfig = {
  count: 20,
  townIds: 'all',
  intelligence: 50,
  raceDistribution: 'realistic',
  classDistribution: 'realistic',
  professionDistribution: 'diverse',
  startingLevel: 1,
  startingGold: 100,
  namePrefix: 'Bot',
};

// ---------------------------------------------------------------------------
// Gold tracking per tick
// ---------------------------------------------------------------------------

export interface GoldStats {
  totalEarned: number;
  totalSpent: number;
  netGoldChange: number;
  byProfession: Record<string, { earned: number; spent: number; net: number; botCount: number }>;
  byTown: Record<string, { earned: number; spent: number; net: number }>;
  byLevel: Record<number, { earned: number; spent: number; net: number }>;
  topEarners: { botName: string; profession: string; town: string; earned: number }[];
}

// ---------------------------------------------------------------------------
// Per-bot daily log
// ---------------------------------------------------------------------------

export interface BotDayLog {
  tickNumber: number;
  gameDay: number;
  botId: string;
  botName: string;
  race: string;
  class: string;
  profession: string;
  town: string;
  level: number;
  goldStart: number;
  goldEnd: number;
  goldNet: number;
  actionsUsed: number;
  actions: {
    order: number;
    type: string;
    detail: string;
    success: boolean;
    goldDelta: number;
    error?: string;
  }[];
  summary: string;
  // Per-bot market activity tracking
  marketItemsListed: number;
  marketOrdersPlaced: number;
  marketAuctionsWon: number;
  marketAuctionsLost: number;
  marketGoldSpent: number;
  marketGoldEarned: number;
  marketNetGold: number;
}

// ---------------------------------------------------------------------------
// Tick result returned after running a simulation tick
// ---------------------------------------------------------------------------

export interface SimTickResult {
  tickNumber: number;
  botsProcessed: number;
  actionBreakdown: Record<string, number>; // e.g. { gather: 12, craft: 5, sell: 3 }
  successes: number;
  failures: number;
  errors: string[];
  durationMs: number;
  goldStats: GoldStats;
  gameDay: number;
}

// ---------------------------------------------------------------------------
// Stats for dashboard distribution charts
// ---------------------------------------------------------------------------

export interface SimulationStats {
  raceDistribution: { name: string; count: number }[];
  classDistribution: { name: string; count: number }[];
  professionDistribution: { name: string; count: number }[];
  townDistribution: { name: string; count: number }[];
  levelDistribution: { level: number; count: number }[];
  totalGold: number;
  totalItems: number;
  averageLevel: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  botCount: 20,
  tickIntervalMs: 5000,
  botsPerTick: 5,
  actionsPerTick: TICK_CONSTANTS.ACTIONS_PER_TICK,
  profileDistribution: {
    gatherer: 3,
    crafter: 2,
    merchant: 1,
    warrior: 2,
    politician: 1,
    socialite: 1,
    explorer: 1,
    balanced: 2,
  },
  enabledSystems: {
    combat: true,
    crafting: true,
    gathering: true,
    market: true,
    quests: true,
    governance: false,
    guilds: true,
    travel: true,
    social: true,
  },
};

// ---------------------------------------------------------------------------
// Detailed per-bot action logging
// ---------------------------------------------------------------------------

export interface BotStateSnapshot {
  level: number;
  town: string;
  gold: number;
  dailyActionUsed: boolean;
  profession: string;
  isInParty: boolean;
  isTraveling: boolean;
}

export interface BotActionEntry {
  tick: number;
  botName: string;
  botId: string;
  phase: 'free' | 'daily' | 'post';
  timestamp: string;
  intent: string;
  endpoint: string;
  requestBody: Record<string, unknown>;
  httpStatus: number;
  success: boolean;
  responseBody: Record<string, unknown>;
  attemptNumber: number;
  fallbackReason?: string;
  durationMs: number;
  botState: BotStateSnapshot;
}

export interface TickResolutionEntry {
  tick: number;
  botName: string;
  botId: string;
  actionType: string;
  actionDetail: string;
  resourceGained: string;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  goldBefore: number;
  goldAfter: number;
  townBefore: string;
  townAfter: string;
}

export interface BotTimeline {
  botName: string;
  botId: string;
  race: string;
  class: string;
  profile: string;
  startTown: string;
  endTown: string;
  townsVisited: number;
  startLevel: number;
  endLevel: number;
  startGold: number;
  endGold: number;
  actionsCommitted: number;
  actionsFailed: number;
  resourcesGathered: number;
  itemsCrafted: number;
  questsCompleted: number;
}

// ---------------------------------------------------------------------------
// Combat Round Logging (round-by-round detail for Excel export)
// ---------------------------------------------------------------------------

export interface CombatRound {
  tick: number;
  combatId: string;
  round: number;
  attacker: string;
  defender: string;
  attackRoll: number;
  attackModifiers: string;
  totalAttack: number;
  defenseValue: number;
  defenseModifiers: string;
  totalDefense: number;
  hit: boolean;
  damageRoll: number;
  damageModifiers: string;
  totalDamage: number;
  attackerHPBefore: number;
  attackerHPAfter: number;
  defenderHPBefore: number;
  defenderHPAfter: number;
  notes: string;
}
