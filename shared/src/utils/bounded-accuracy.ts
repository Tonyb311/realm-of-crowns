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

/**
 * Calculate a combatant's saving throw modifier for a given save type.
 * Proficient saves: stat modifier + proficiency bonus
 * Non-proficient saves: stat modifier only
 * Monsters (no saveProficiencies set): always add proficiency (legacy behavior)
 */
export function getSaveModifier(
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  saveType: string,
  proficiencyBonus: number,
  saveProficiencies?: string[],
): number {
  const statMod = getModifier(stats[saveType as keyof typeof stats] ?? 10);
  // If no proficiency list provided (monsters), add proficiency to all saves
  if (!saveProficiencies) return statMod + proficiencyBonus;
  // Characters: only add proficiency if proficient in this save
  const isProficient = saveProficiencies.includes(saveType);
  return statMod + (isProficient ? proficiencyBonus : 0);
}

export const STAT_HARD_CAP = 20;

// ============================================================
// Carry Capacity & Encumbrance
// ============================================================

export type EncumbranceTier =
  | 'NORMAL'
  | 'BURDENED'
  | 'ENCUMBERED'
  | 'HEAVILY_ENCUMBERED'
  | 'SEVERELY_OVERLOADED'
  | 'CRUSHED';

export interface EncumbrancePenalties {
  tier: EncumbranceTier;
  loadPercent: number;
  travelMultiplier: number;
  attackPenalty: number;
  acPenalty: number;
  saveDcPenalty: number;
  gatheringYieldModifier: number;
  canGather: boolean;
  canCraft: boolean;
  craftTimeMultiplier: number;
  canInitiatePvp: boolean;
  damageMultiplier: number;
}

/**
 * Carry capacity in lbs.
 * Base: STR × 10, modified by racial bonus and bag bonus.
 */
export function calculateCarryCapacity(
  str: number,
  racialCarryModifier: number = 0,
  bagBonus: number = 0,
): number {
  const base = str * 10;
  const withRacial = base * (1 + racialCarryModifier);
  return withRacial + bagBonus;
}

/**
 * Determine encumbrance tier and associated penalties from current load.
 * Sliding scale: 0-60% Normal, 60-80% Burdened, 80-100% Encumbered,
 * 100-130% Heavily Encumbered, 130-160% Severely Overloaded, 160%+ Crushed.
 */
export function getEncumbrancePenalties(currentWeight: number, carryCapacity: number): EncumbrancePenalties {
  const loadPercent = carryCapacity > 0
    ? (currentWeight / carryCapacity) * 100
    : (currentWeight > 0 ? 999 : 0);

  if (loadPercent <= 60) {
    return {
      tier: 'NORMAL', loadPercent, travelMultiplier: 1.0,
      attackPenalty: 0, acPenalty: 0, saveDcPenalty: 0,
      gatheringYieldModifier: 1.0, canGather: true, canCraft: true,
      craftTimeMultiplier: 1.0, canInitiatePvp: true, damageMultiplier: 1.0,
    };
  }
  if (loadPercent <= 80) {
    return {
      tier: 'BURDENED', loadPercent, travelMultiplier: 1.5,
      attackPenalty: -1, acPenalty: 0, saveDcPenalty: 0,
      gatheringYieldModifier: 0.75, canGather: true, canCraft: true,
      craftTimeMultiplier: 1.0, canInitiatePvp: true, damageMultiplier: 1.0,
    };
  }
  if (loadPercent <= 100) {
    return {
      tier: 'ENCUMBERED', loadPercent, travelMultiplier: 2.0,
      attackPenalty: -2, acPenalty: -1, saveDcPenalty: 0,
      gatheringYieldModifier: 0.5, canGather: true, canCraft: true,
      craftTimeMultiplier: 1.0, canInitiatePvp: true, damageMultiplier: 1.0,
    };
  }
  if (loadPercent <= 130) {
    return {
      tier: 'HEAVILY_ENCUMBERED', loadPercent, travelMultiplier: 3.0,
      attackPenalty: -3, acPenalty: -2, saveDcPenalty: -1,
      gatheringYieldModifier: 0.25, canGather: true, canCraft: true,
      craftTimeMultiplier: 1.0, canInitiatePvp: false, damageMultiplier: 1.0,
    };
  }
  if (loadPercent <= 160) {
    return {
      tier: 'SEVERELY_OVERLOADED', loadPercent, travelMultiplier: 4.0,
      attackPenalty: -5, acPenalty: -3, saveDcPenalty: -2,
      gatheringYieldModifier: 0, canGather: false, canCraft: true,
      craftTimeMultiplier: 2.0, canInitiatePvp: false, damageMultiplier: 1.0,
    };
  }
  // 160%+
  return {
    tier: 'CRUSHED', loadPercent, travelMultiplier: 6.0,
    attackPenalty: -7, acPenalty: -5, saveDcPenalty: -3,
    gatheringYieldModifier: 0, canGather: false, canCraft: false,
    craftTimeMultiplier: Infinity, canInitiatePvp: false, damageMultiplier: 0.5,
  };
}
