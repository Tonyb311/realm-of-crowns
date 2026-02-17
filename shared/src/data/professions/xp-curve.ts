import { XPCurveEntry, ProfessionTierName } from './types';

function buildXpCurve(): XPCurveEntry[] {
  const entries: XPCurveEntry[] = [];
  let cumulative = 0;
  for (let level = 1; level <= 100; level++) {
    const xpRequired = Math.floor(100 * (1 + (level - 1) * 0.15));
    cumulative += xpRequired;
    entries.push({ level, xpRequired, cumulativeXp: cumulative });
  }
  return entries;
}

export const XP_CURVE: XPCurveEntry[] = buildXpCurve();

export function getXpForLevel(level: number): number {
  if (level < 1 || level > 100) return 0;
  return XP_CURVE[level - 1].xpRequired;
}

export function getCumulativeXpForLevel(level: number): number {
  if (level < 1 || level > 100) return 0;
  return XP_CURVE[level - 1].cumulativeXp;
}

export function getTierForLevel(level: number): ProfessionTierName {
  if (level >= 13) return 'GRANDMASTER';
  if (level >= 11) return 'MASTER';
  if (level >= 9) return 'EXPERT';
  if (level >= 7) return 'CRAFTSMAN';
  if (level >= 5) return 'JOURNEYMAN';
  return 'APPRENTICE';
}
