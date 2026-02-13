// ---------------------------------------------------------------------------
// Bot Simulation Types
// ---------------------------------------------------------------------------

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
  level: number;
  professions: string[];
  lastActionAt: number;
  lastAction: string | null;
  actionsCompleted: number;
  consecutiveErrors: number;
  errorsTotal: number;
  isActive: boolean;
  pendingGathering: boolean;
  pendingCrafting: boolean;
  pausedUntil: number;
  intelligence: number; // 0-100
  partyId: string | null;       // Current party ID (null if not in a party)
  partyRole: string | null;     // 'leader' | 'member' | null
  partyTicksRemaining: number;  // Ticks until bot disbands the party (3-5)
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
  gameDayOffset: number;
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
  startingLevel: number; // 1-10
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
  actionsPerTick: 3,
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
