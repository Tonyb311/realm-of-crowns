export type CaravanType = 'HANDCART' | 'WAGON' | 'LARGE_WAGON' | 'TRADE_CONVOY';

export type EscortType = 'SCOUT' | 'MERCENARY' | 'ELITE_GUARD';

export type InsuranceCoverage = 'BASIC' | 'STANDARD' | 'PREMIUM';

export type AmbushChoice = 'fight' | 'ransom' | 'flee';

export interface CaravanTypeDefinition {
  type: CaravanType;
  name: string;
  capacity: number;
  /** Multiplier on base travel time. Lower = faster. */
  speedMultiplier: number;
  /** Gold cost to create the caravan. */
  cost: number;
  /** Minimum Merchant profession level required. 0 = no requirement. */
  merchantLevelRequired: number;
}

export interface EscortDefinition {
  type: EscortType;
  name: string;
  cost: number;
  /** Percentage points of safety added (reduces ambush chance). */
  safetyBonus: number;
  /** Bonus to fight success chance (0-1 scale). */
  combatBonus: number;
}

export interface InsuranceDefinition {
  coverage: InsuranceCoverage;
  name: string;
  /** Percentage of cargo value charged as premium. */
  premiumRate: number;
  /** Percentage of cargo value paid out on loss. */
  payoutRate: number;
}

export const CARAVAN_TYPES: Record<CaravanType, CaravanTypeDefinition> = {
  HANDCART: {
    type: 'HANDCART',
    name: 'Handcart',
    capacity: 10,
    speedMultiplier: 0.5,
    cost: 50,
    merchantLevelRequired: 0,
  },
  WAGON: {
    type: 'WAGON',
    name: 'Wagon',
    capacity: 30,
    speedMultiplier: 1.0,
    cost: 200,
    merchantLevelRequired: 10,
  },
  LARGE_WAGON: {
    type: 'LARGE_WAGON',
    name: 'Large Wagon',
    capacity: 60,
    speedMultiplier: 0.8,
    cost: 500,
    merchantLevelRequired: 25,
  },
  TRADE_CONVOY: {
    type: 'TRADE_CONVOY',
    name: 'Trade Convoy',
    capacity: 150,
    speedMultiplier: 0.7,
    cost: 2000,
    merchantLevelRequired: 50,
  },
};

export const ESCORT_TYPES: Record<EscortType, EscortDefinition> = {
  SCOUT: {
    type: 'SCOUT',
    name: 'Scout',
    cost: 50,
    safetyBonus: 10,
    combatBonus: 0.05,
  },
  MERCENARY: {
    type: 'MERCENARY',
    name: 'Mercenary',
    cost: 150,
    safetyBonus: 25,
    combatBonus: 0.15,
  },
  ELITE_GUARD: {
    type: 'ELITE_GUARD',
    name: 'Elite Guard',
    cost: 500,
    safetyBonus: 50,
    combatBonus: 0.30,
  },
};

export const INSURANCE_OPTIONS: Record<InsuranceCoverage, InsuranceDefinition> = {
  BASIC: {
    coverage: 'BASIC',
    name: 'Basic Coverage',
    premiumRate: 0.05,
    payoutRate: 0.50,
  },
  STANDARD: {
    coverage: 'STANDARD',
    name: 'Standard Coverage',
    premiumRate: 0.10,
    payoutRate: 0.75,
  },
  PREMIUM: {
    coverage: 'PREMIUM',
    name: 'Premium Coverage',
    premiumRate: 0.15,
    payoutRate: 1.0,
  },
};

/** Base ambush chance per danger level point (5% per point). */
export const AMBUSH_CHANCE_PER_DANGER = 0.05;

/** Fight success base chance (before escort/level bonuses). */
export const FIGHT_BASE_SUCCESS = 0.40;

/** Ransom cost as fraction of total cargo gold value. */
export const RANSOM_COST_FRACTION = 0.30;

/** Fraction of cargo items lost on flee. */
export const FLEE_CARGO_LOSS_FRACTION = 0.20;
