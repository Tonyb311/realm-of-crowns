/**
 * Town Projects, Emergency Spending, and Sheriff Patrol configuration.
 * Used by both server and client.
 */

export const PROJECT_TYPES = {
  ROAD_IMPROVEMENT: {
    name: 'Road Improvement',
    description: 'Reduce travel time on one adjacent route by 10%',
    cost: 200,
    durationTicks: 3,
    category: 'INFRASTRUCTURE' as const,
    requiresRouteSelection: true,
    effect: { type: 'TRAVEL_TIME_REDUCTION' as const, value: 0.10, permanent: true },
  },
  ROAD_PATROL: {
    name: 'Road Patrol',
    description: 'Reduce road danger on one adjacent route by 15% for 14 days',
    cost: 150,
    durationTicks: 2,
    category: 'DEFENSE' as const,
    requiresRouteSelection: true,
    effect: { type: 'ROAD_DANGER_REDUCTION' as const, value: 0.15, durationDays: 14 },
  },
  FORTIFY_DEFENSES: {
    name: 'Fortify Defenses',
    description: 'Increase DEFENSES metric by +10',
    cost: 300,
    durationTicks: 4,
    category: 'DEFENSE' as const,
    effect: { type: 'METRIC_BOOST' as const, metric: 'DEFENSES', value: 10, permanent: true },
  },
  PUBLIC_SANITATION: {
    name: 'Public Sanitation',
    description: 'Increase PUBLIC_HEALTH metric by +10',
    cost: 250,
    durationTicks: 3,
    category: 'HEALTH' as const,
    effect: { type: 'METRIC_BOOST' as const, metric: 'PUBLIC_HEALTH', value: 10, permanent: true },
  },
  MARKET_RENOVATION: {
    name: 'Market Renovation',
    description: 'Increase MARKET_EFFICIENCY metric by +10',
    cost: 350,
    durationTicks: 5,
    category: 'ECONOMY' as const,
    effect: { type: 'METRIC_BOOST' as const, metric: 'MARKET_EFFICIENCY', value: 10, permanent: true },
  },
  FESTIVAL: {
    name: 'Festival',
    description: '+5 to ALL metrics for 7 days, +2 reputation with all races for residents',
    cost: 100,
    durationTicks: 1,
    category: 'MORALE' as const,
    effect: { type: 'FESTIVAL' as const, metricBoost: 5, reputationBoost: 2, durationDays: 7 },
  },
  GUARD_TRAINING: {
    name: 'Town Guard Training',
    description: 'Increase LAW_ENFORCEMENT metric by +10',
    cost: 200,
    durationTicks: 3,
    category: 'DEFENSE' as const,
    effect: { type: 'METRIC_BOOST' as const, metric: 'LAW_ENFORCEMENT', value: 10, permanent: true },
  },
  EXPAND_WALLS: {
    name: 'Expand Walls',
    description: '+5 building capacity',
    cost: 500,
    durationTicks: 7,
    category: 'INFRASTRUCTURE' as const,
    effect: { type: 'BUILDING_CAPACITY' as const, value: 5, permanent: true },
  },
  TRADE_FAIR: {
    name: 'Trade Fair',
    description: '+20% market volume for 7 days',
    cost: 300,
    durationTicks: 2,
    category: 'ECONOMY' as const,
    effect: { type: 'MARKET_VOLUME_BOOST' as const, value: 0.20, durationDays: 7 },
  },
} as const;

export type ProjectType = keyof typeof PROJECT_TYPES;

export const PROJECT_CATEGORIES = ['INFRASTRUCTURE', 'DEFENSE', 'HEALTH', 'ECONOMY', 'MORALE'] as const;
export type ProjectCategory = typeof PROJECT_CATEGORIES[number];

export const MAX_CONCURRENT_PROJECTS = 2;

export const EMERGENCY_SPENDING_TYPES = {
  EMERGENCY_REPAIRS: {
    name: 'Emergency Repairs',
    description: '+3 to one metric immediately',
    cost: 50,
    requiresMetricSelection: true,
  },
  BONUS_GUARD_SHIFT: {
    name: 'Bonus Guard Shift',
    description: '-10% road danger on all adjacent routes for 3 days',
    cost: 75,
  },
  MARKET_STIMULUS: {
    name: 'Market Stimulus',
    description: '+5% market bonus for all transactions for 3 days',
    cost: 100,
  },
} as const;

export type EmergencySpendingType = keyof typeof EMERGENCY_SPENDING_TYPES;

export const MAX_EMERGENCY_PER_DAY = 1;

export const SHERIFF_PATROL_CONFIG = {
  costPerNode: 15,
  durationDays: 3,
  dangerReduction: 0.10,
  maxActivePatrols: 2,
  defaultDailyBudget: 50,
  minDailyBudget: 10,
  maxDailyBudget: 100,
} as const;
