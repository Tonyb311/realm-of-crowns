/**
 * Diplomacy Engine — Core diplomacy logic for Realm of Crowns
 *
 * Handles relation change costs, war score calculation, treaty validation,
 * and the Changeling diplomat bonus.
 */

import { RelationStatus, Race } from '@prisma/client';

// ─── Relation Hierarchy ──────────────────────────────────────────────

const RELATION_HIERARCHY: RelationStatus[] = [
  'BLOOD_FEUD',  // 0 (worst)
  'HOSTILE',     // 1
  'DISTRUSTFUL', // 2
  'NEUTRAL',     // 3
  'FRIENDLY',    // 4
  'ALLIED',      // 5 (best)
];

export function getRelationRank(status: RelationStatus): number {
  return RELATION_HIERARCHY.indexOf(status);
}

// ─── Relation Change Costs ───────────────────────────────────────────

interface RelationChangeCost {
  goldCost: number;
  requiredDays: number;
  prerequisite?: string;
}

/**
 * Cost to IMPROVE by one step. Keyed by the step transition "FROM->TO".
 * Worsening relations is always instant and free.
 */
const IMPROVEMENT_COSTS: Record<string, RelationChangeCost> = {
  'BLOOD_FEUD->HOSTILE':     { goldCost: 15000, requiredDays: 10 },
  'HOSTILE->DISTRUSTFUL':    { goldCost: 8000,  requiredDays: 7 },
  'DISTRUSTFUL->NEUTRAL':    { goldCost: 3000,  requiredDays: 4 },
  'NEUTRAL->FRIENDLY':       { goldCost: 5000,  requiredDays: 5 },
  'FRIENDLY->ALLIED':        { goldCost: 10000, requiredDays: 10, prerequisite: '14-day TRADE_AGREEMENT required' },
};

/**
 * Calculate the cost to change relation from `current` to `target`.
 * Returns null if the change is a worsening (free + instant).
 */
export function calculateRelationChangeCost(
  current: RelationStatus,
  target: RelationStatus,
  hasChangelingDiplomat: boolean = false,
): { steps: Array<{ from: RelationStatus; to: RelationStatus; cost: RelationChangeCost }>; totalGold: number; totalDays: number } | null {
  const currentRank = getRelationRank(current);
  const targetRank = getRelationRank(target);

  // Worsening is free and instant
  if (targetRank <= currentRank) {
    return null;
  }

  const steps: Array<{ from: RelationStatus; to: RelationStatus; cost: RelationChangeCost }> = [];
  let totalGold = 0;
  let totalDays = 0;

  for (let i = currentRank; i < targetRank; i++) {
    const from = RELATION_HIERARCHY[i];
    const to = RELATION_HIERARCHY[i + 1];
    const key = `${from}->${to}`;
    const baseCost = IMPROVEMENT_COSTS[key];

    if (!baseCost) {
      throw new Error(`No cost defined for transition ${key}`);
    }

    const discountMultiplier = hasChangelingDiplomat ? 0.8 : 1.0;
    const cost: RelationChangeCost = {
      goldCost: Math.floor(baseCost.goldCost * discountMultiplier),
      requiredDays: baseCost.requiredDays,
      prerequisite: baseCost.prerequisite,
    };

    steps.push({ from, to, cost });
    totalGold += cost.goldCost;
    totalDays += cost.requiredDays;
  }

  return { steps, totalGold, totalDays };
}

// ─── Treaty Validation ───────────────────────────────────────────────

export type TreatyType = 'TRADE_AGREEMENT' | 'NON_AGGRESSION_PACT' | 'ALLIANCE';

interface TreatyValidation {
  valid: boolean;
  reason?: string;
  goldCost: number;
  requiredDays: number;
}

const TREATY_REQUIREMENTS: Record<TreatyType, { minRelation: RelationStatus; goldCost: number; requiredDays: number }> = {
  TRADE_AGREEMENT:    { minRelation: 'NEUTRAL',   goldCost: 2000,  requiredDays: 3 },
  NON_AGGRESSION_PACT: { minRelation: 'DISTRUSTFUL', goldCost: 1500,  requiredDays: 2 },
  ALLIANCE:           { minRelation: 'FRIENDLY',  goldCost: 10000, requiredDays: 7 },
};

export function validateTreaty(
  treatyType: TreatyType,
  currentRelation: RelationStatus,
  hasChangelingDiplomat: boolean = false,
  hasActiveTradeAgreement: boolean = false,
): TreatyValidation {
  const req = TREATY_REQUIREMENTS[treatyType];
  const currentRank = getRelationRank(currentRelation);
  const minRank = getRelationRank(req.minRelation);

  if (currentRank < minRank) {
    return {
      valid: false,
      reason: `${treatyType} requires at least ${req.minRelation} relations (currently ${currentRelation})`,
      goldCost: 0,
      requiredDays: 0,
    };
  }

  // ALLIANCE requires an active trade agreement of at least 14 days
  if (treatyType === 'ALLIANCE' && !hasActiveTradeAgreement) {
    return {
      valid: false,
      reason: 'ALLIANCE requires an active TRADE_AGREEMENT of at least 14 days',
      goldCost: 0,
      requiredDays: 0,
    };
  }

  const discountMultiplier = hasChangelingDiplomat ? 0.8 : 1.0;

  return {
    valid: true,
    goldCost: Math.floor(req.goldCost * discountMultiplier),
    requiredDays: req.requiredDays,
  };
}

// ─── War Score Calculator ────────────────────────────────────────────

interface WarScoreInput {
  pvpKills: number;
  raids: number;
  territoryCaptured: number;
  territoryLost: number;
}

export interface WarScore {
  total: number;
  breakdown: {
    pvpKills: number;
    raids: number;
    territory: number;
  };
}

const WAR_SCORE_WEIGHTS = {
  pvpKill: 10,
  raid: 25,
  territoryNet: 50,
};

export function calculateWarScore(input: WarScoreInput): WarScore {
  const pvpScore = input.pvpKills * WAR_SCORE_WEIGHTS.pvpKill;
  const raidScore = input.raids * WAR_SCORE_WEIGHTS.raid;
  const territoryScore = (input.territoryCaptured - input.territoryLost) * WAR_SCORE_WEIGHTS.territoryNet;

  return {
    total: pvpScore + raidScore + territoryScore,
    breakdown: {
      pvpKills: pvpScore,
      raids: raidScore,
      territory: territoryScore,
    },
  };
}

// ─── Relation Worsening on War Declaration ───────────────────────────

/**
 * When war is declared, the relation worsens by 2 steps toward BLOOD_FEUD.
 * Returns the new relation status.
 */
export function worsenRelationForWar(current: RelationStatus): RelationStatus {
  const rank = getRelationRank(current);
  const newRank = Math.max(0, rank - 2);
  return RELATION_HIERARCHY[newRank];
}

// ─── Reputation Penalty on Treaty Breaking ───────────────────────────

export function calculateTreatyBreakPenalty(treatyType: TreatyType): { relationWorsen: number; goldPenalty: number } {
  switch (treatyType) {
    case 'ALLIANCE':
      return { relationWorsen: 3, goldPenalty: 5000 };
    case 'TRADE_AGREEMENT':
      return { relationWorsen: 1, goldPenalty: 1000 };
    case 'NON_AGGRESSION_PACT':
      return { relationWorsen: 2, goldPenalty: 2000 };
  }
}

/**
 * Apply a worsen-by-N-steps to a relation.
 */
export function worsenRelationBySteps(current: RelationStatus, steps: number): RelationStatus {
  const rank = getRelationRank(current);
  const newRank = Math.max(0, rank - steps);
  return RELATION_HIERARCHY[newRank];
}

// ─── Changeling Diplomat Detection ───────────────────────────────────

/**
 * Check if either kingdom has a Changeling ruler (diplomat bonus).
 */
export function isChangelingDiplomat(race1: Race | null, race2: Race | null): boolean {
  return race1 === 'CHANGELING' || race2 === 'CHANGELING';
}
