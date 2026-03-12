/**
 * INN building level configuration.
 * Controls menu capacity, tax discount, and Well Rested buff per building level.
 */

export interface WellRestedBonus {
  gatheringYieldPercent: number;   // +2% to +10%
  craftingQualityBonus: number;    // +1 to +5 added to quality roll
  combatHpRecoveryPercent: number; // +2% to +10%
}

const WELL_RESTED_BONUSES: Record<number, WellRestedBonus> = {
  1: { gatheringYieldPercent: 0.02, craftingQualityBonus: 1, combatHpRecoveryPercent: 0.02 },
  2: { gatheringYieldPercent: 0.04, craftingQualityBonus: 2, combatHpRecoveryPercent: 0.04 },
  3: { gatheringYieldPercent: 0.06, craftingQualityBonus: 3, combatHpRecoveryPercent: 0.06 },
  4: { gatheringYieldPercent: 0.08, craftingQualityBonus: 4, combatHpRecoveryPercent: 0.08 },
  5: { gatheringYieldPercent: 0.10, craftingQualityBonus: 5, combatHpRecoveryPercent: 0.10 },
};

export function getWellRestedBonus(innLevel: number): WellRestedBonus | null {
  return WELL_RESTED_BONUSES[Math.min(innLevel, 5)] ?? null;
}

const INN_MENU_CAPACITY: Record<number, number> = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
};

/**
 * Get the max number of distinct menu items an INN can stock at a given level.
 */
export function getInnMenuCapacity(level: number): number {
  return INN_MENU_CAPACITY[level] ?? 10;
}

/**
 * Tax multiplier for inn sales. Level 5 gets a 50% tax discount.
 * Applied to the town's effective tax rate.
 */
export function getInnTaxMultiplier(level: number): number {
  return level >= 5 ? 0.5 : 1.0;
}
