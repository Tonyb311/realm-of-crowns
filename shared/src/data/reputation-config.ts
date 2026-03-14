export const REPUTATION_TIERS = [
  { id: 'HOSTILE', min: -100, max: -50, label: 'Hostile', color: '#dc2626' },
  { id: 'UNFRIENDLY', min: -50, max: -20, label: 'Unfriendly', color: '#f59e0b' },
  { id: 'NEUTRAL', min: -20, max: 20, label: 'Neutral', color: '#6b7280' },
  { id: 'FRIENDLY', min: 20, max: 50, label: 'Friendly', color: '#3b82f6' },
  { id: 'HONORED', min: 50, max: 80, label: 'Honored', color: '#8b5cf6' },
  { id: 'REVERED', min: 80, max: 100, label: 'Revered', color: '#f59e0b' },
] as const;

export function getReputationTier(score: number) {
  return REPUTATION_TIERS.find(t => score >= t.min && score <= t.max) ?? REPUTATION_TIERS[2]; // default NEUTRAL
}

export const REPUTATION_GAINS = {
  MARKET_TRADE: 1,        // trade with a different race
  JOB_COMPLETION: 2,      // complete a job from a different race
  PROXIMITY_TICK: 0.5,    // per tick, per race present in your town
  DIPLOMATIC_SUMMIT: 5,   // during summit event
};
