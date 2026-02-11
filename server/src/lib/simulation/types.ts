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
}

export interface SimulationConfig {
  botCount: number;
  tickIntervalMs: number;
  botsPerTick: number;
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

export const DEFAULT_CONFIG: SimulationConfig = {
  botCount: 20,
  tickIntervalMs: 5000,
  botsPerTick: 5,
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
