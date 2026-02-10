export function getStatAllocationCost(currentValue: number): number {
  const target = currentValue + 1;
  if (target > 30) return Infinity;
  if (target <= 14) return 1;
  if (target <= 18) return 2;
  if (target <= 22) return 3;
  if (target <= 26) return 4;
  if (target <= 30) return 5;
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

export const STAT_HARD_CAP = 30;
