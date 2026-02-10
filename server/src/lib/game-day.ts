// Game Day utility — universal time reference for the daily action economy
// All systems use getGameDay() to determine the current in-game day number.

const EPOCH = new Date('2026-01-01T00:00:00Z').getTime();
const DAY_MS = 86_400_000;

/** Sequential day number since server epoch (2026-01-01). */
export function getGameDay(): number {
  return Math.floor((Date.now() - EPOCH) / DAY_MS);
}

/** Next 00:00 UTC boundary (daily tick time). */
export function getNextTickTime(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** Today's tick date at 00:00 UTC — used for DailyAction.tickDate lookups. */
export function getTodayTickDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Milliseconds until the next daily tick (00:00 UTC). */
export function getTimeUntilReset(): number {
  return getNextTickTime().getTime() - Date.now();
}
