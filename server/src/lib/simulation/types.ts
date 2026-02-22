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
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
}

export interface DispatchResult {
  status: number;
  data: any;
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
  requestBody: Record<string, any>;
  httpStatus: number;
  success: boolean;
  responseBody: Record<string, any>;
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
