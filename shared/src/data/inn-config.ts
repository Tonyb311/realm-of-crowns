/**
 * INN building level configuration.
 * Controls menu capacity and tax discount per building level.
 */

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
