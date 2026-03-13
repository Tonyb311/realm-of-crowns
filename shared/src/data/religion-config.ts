// ---------------------------------------------------------------------------
// Religion System — Shared Configuration
// ---------------------------------------------------------------------------

export const DIVINE_PHILOSOPHIES = ['WARDEN', 'PRAGMATIST', 'RECLAIMER', 'EMBRACED', 'WITHDRAWN', 'UNITER', 'NIHILIST'] as const;
export type DivinePhilosophy = typeof DIVINE_PHILOSOPHIES[number];

export const CHURCH_TIERS = ['MINORITY', 'CHAPTER', 'ESTABLISHED', 'DOMINANT'] as const;
export type ChurchTier = typeof CHURCH_TIERS[number];

export const CHURCH_TIER_THRESHOLDS = {
  MINORITY: 0,
  CHAPTER: 0.20,
  ESTABLISHED: 0.40,
  DOMINANT: 0.60,
};

export const CONVERSION_COOLDOWN_DAYS = 7;

export function calculateChurchTier(memberCount: number, totalResidents: number): ChurchTier {
  if (totalResidents === 0) return 'MINORITY';
  const percentage = memberCount / totalResidents;
  if (percentage >= CHURCH_TIER_THRESHOLDS.DOMINANT) return 'DOMINANT';
  if (percentage >= CHURCH_TIER_THRESHOLDS.ESTABLISHED) return 'ESTABLISHED';
  if (percentage >= CHURCH_TIER_THRESHOLDS.CHAPTER) return 'CHAPTER';
  return 'MINORITY';
}
