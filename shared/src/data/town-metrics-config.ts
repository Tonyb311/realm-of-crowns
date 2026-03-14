export const TOWN_METRIC_TYPES = [
  'DEFENSES', 'PUBLIC_HEALTH', 'LAW_ENFORCEMENT', 'MARKET_EFFICIENCY', 'ELECTION_INTEGRITY'
] as const;
export type TownMetricType = typeof TOWN_METRIC_TYPES[number];

export const METRIC_LABELS: Record<TownMetricType, string> = {
  DEFENSES: 'Defenses',
  PUBLIC_HEALTH: 'Public Health',
  LAW_ENFORCEMENT: 'Law Enforcement',
  MARKET_EFFICIENCY: 'Market Efficiency',
  ELECTION_INTEGRITY: 'Election Integrity',
};

export const METRIC_DESCRIPTIONS: Record<TownMetricType, string> = {
  DEFENSES: 'Military readiness and road safety around the town',
  PUBLIC_HEALTH: 'Food safety, disease resistance, and general wellness',
  LAW_ENFORCEMENT: 'Crime prevention and maintenance of order',
  MARKET_EFFICIENCY: 'Trade speed and reduced marketplace overhead',
  ELECTION_INTEGRITY: 'Resistance to vote manipulation and political corruption',
};

/** Which metrics are active (have god-backed modifiers wired). Rest show as "Coming soon". */
export const ACTIVE_METRICS: TownMetricType[] = ['DEFENSES', 'PUBLIC_HEALTH', 'ELECTION_INTEGRITY'];

// Shrine consecration costs from church treasury
export const SHRINE_CONSECRATION_COST = 500; // gold from church treasury
export const SHRINE_DECONSECRATION_REFUND = 0; // no refund

/** Maps prosperity level (1-5) to base metric value */
export function getBaseValueForProsperity(level: number): number {
  switch (level) {
    case 5: return 60;
    case 4: return 55;
    case 3: return 50;
    case 2: return 40;
    default: return 35;
  }
}

/**
 * Preview text for what a dominant god's shrine affects.
 * Used on Temple page to show informational text before Phase B2 wires actual modifiers.
 */
export const GOD_METRIC_PREVIEW: Record<string, string> = {
  aurvandos: '+5 Defenses, -10% road danger for all residents',
  kethara: '+10 Public Health, +10% food effectiveness for all',
  tyrvex: '+4% crafting quality for all residents',
  vareth: '+5% local crafting yield, +10% visitor market fees',
  veradine: '-5% tax overhead for all residents',
  tessivane: '+3% market bonus for all residents',
  valtheris: '+10% reputation gains, +5% foreign trade for all',
  domakhar: '+5% law enforcement, +10% guard capability',
  solimene: '+10% election integrity for all',
  'xol-thira': '+3% rare drop chance for all residents',
  morvaine: '-20% political manipulation effectiveness',
  seraphiel: '+10% diplomatic/reputation interactions for all',
};
