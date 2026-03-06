/**
 * Cost to raise a stat from currentValue to currentValue+1.
 *
 * D&D-aligned cost curve:
 *   Target 11-14: 1 point each (cheap early growth)
 *   Target 15-17: 2 points each (moderate investment)
 *   Target 18-19: 3 points each (expensive)
 *   Target 20:    4 points (premium capstone)
 *   Above 20:     Impossible
 *
 * Total cost to max one stat from base 10 -> 20:
 *   4x1 + 3x2 + 2x3 + 1x4 = 4 + 6 + 6 + 4 = 20 points
 *
 * Budget analysis (50 total stat points over 50 levels):
 *   Max one stat 10->20: 20 pts, second 10->18: 16 pts, third 10->14: 4 pts
 *   Typical end-state: 20/18/14/14/12/10 + racial mods
 */
export function getStatAllocationCost(currentValue: number): number {
  const target = currentValue + 1;
  if (target > STAT_HARD_CAP) return Infinity;
  if (target <= 14) return 1;
  if (target <= 17) return 2;
  if (target <= 19) return 3;
  if (target <= 20) return 4;
  return Infinity;
}

export function getProficiencyBonus(level: number): number {
  if (level <= 4) return 2;
  if (level <= 9) return 3;
  if (level <= 14) return 4;
  if (level <= 19) return 5;
  if (level <= 29) return 6;
  if (level <= 39) return 7;
  return 8;
}

export function getModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

export const STAT_HARD_CAP = 20;
