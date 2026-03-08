import { db } from '../lib/db';
import { eq, and, or, inArray, isNotNull, count } from 'drizzle-orm';
import { treaties, wars } from '@database/tables';

// ---------------------------------------------------------------------------
// Diplomatic reputation — calculates a kingdom's standing based on history
// ---------------------------------------------------------------------------

export type ReputationTier = 'Honored' | 'Respected' | 'Neutral' | 'Suspect' | 'Oathbreaker';

export interface ReputationResult {
  kingdomId: string;
  score: number;
  tier: ReputationTier;
  treatyCostMultiplier: number;
}

const SCORE_THRESHOLDS: { min: number; tier: ReputationTier }[] = [
  { min: 50, tier: 'Honored' },
  { min: 20, tier: 'Respected' },
  { min: -10, tier: 'Neutral' },
  { min: -30, tier: 'Suspect' },
  { min: -Infinity, tier: 'Oathbreaker' },
];

const TREATY_COST_MULTIPLIERS: Record<ReputationTier, number> = {
  Honored: 0.90,
  Respected: 0.95,
  Neutral: 1.00,
  Suspect: 1.25,
  Oathbreaker: 1.50,
};

function tierFromScore(score: number): ReputationTier {
  for (const t of SCORE_THRESHOLDS) {
    if (score >= t.min) return t.tier;
  }
  return 'Oathbreaker';
}

export async function calculateKingdomReputation(kingdomId: string): Promise<ReputationResult> {
  // Treaties kept (ACTIVE or EXPIRED normally) = +2 each
  const [{ total: keptTreaties }] = await db.select({ total: count() }).from(treaties).where(
    and(
      or(eq(treaties.proposerKingdomId, kingdomId), eq(treaties.receiverKingdomId, kingdomId)),
      inArray(treaties.status, ['ACTIVE', 'EXPIRED']),
    ),
  );

  // Treaties broken = -5 each
  const [{ total: brokenTreaties }] = await db.select({ total: count() }).from(treaties).where(
    and(
      or(eq(treaties.proposerKingdomId, kingdomId), eq(treaties.receiverKingdomId, kingdomId)),
      eq(treaties.status, 'BROKEN'),
    ),
  );

  // Wars declared (as attacker) = -2 each
  const [{ total: warsDeclared }] = await db.select({ total: count() }).from(wars).where(
    eq(wars.attackerKingdomId, kingdomId),
  );

  // Peace treaties ended (wars with endedAt set) = +3 each
  const [{ total: peacesReached }] = await db.select({ total: count() }).from(wars).where(
    and(
      or(eq(wars.attackerKingdomId, kingdomId), eq(wars.defenderKingdomId, kingdomId)),
      isNotNull(wars.endedAt),
    ),
  );

  const score =
    (keptTreaties * 2) +
    (brokenTreaties * -5) +
    (warsDeclared * -2) +
    (peacesReached * 3);

  const tier = tierFromScore(score);

  return {
    kingdomId,
    score,
    tier,
    treatyCostMultiplier: TREATY_COST_MULTIPLIERS[tier],
  };
}

export async function getReputationMultiplier(kingdomId: string): Promise<number> {
  const rep = await calculateKingdomReputation(kingdomId);
  return rep.treatyCostMultiplier;
}
