// Game Day utility — universal time reference for the daily action economy
// All systems use getGameDay() to determine the current in-game day number.

const EPOCH = new Date('2026-01-01T00:00:00Z').getTime();
const DAY_MS = 86_400_000;

/**
 * Manual offset for testing — incremented when admin triggers daily tick.
 * Allows simulating multiple game days without waiting 24 real hours.
 * Resets on server restart (in-memory only).
 */
let gameDayOffset = 0;

/** Sequential day number since server epoch (2026-01-01). */
export function getGameDay(): number {
  return Math.floor((Date.now() - EPOCH) / DAY_MS) + gameDayOffset;
}

/** Next 00:00 UTC boundary (daily tick time). */
export function getNextTickTime(): Date {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  if (gameDayOffset > 0) {
    base.setUTCDate(base.getUTCDate() + gameDayOffset);
  }
  return base;
}

/** Today's tick date at 00:00 UTC — used for DailyAction.tickDate lookups. */
export function getTodayTickDate(): Date {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (gameDayOffset > 0) {
    base.setUTCDate(base.getUTCDate() + gameDayOffset);
  }
  return base;
}

/** Milliseconds until the next daily tick (00:00 UTC). */
export function getTimeUntilReset(): number {
  return getNextTickTime().getTime() - Date.now();
}

/** Advance the game day offset by the given number of days. Returns new offset. */
export function advanceGameDay(days: number = 1): number {
  gameDayOffset += days;
  return gameDayOffset;
}

/** Get the current game day offset. */
export function getGameDayOffset(): number {
  return gameDayOffset;
}

/** Reset the game day offset to 0. */
export function resetGameDayOffset(): void {
  gameDayOffset = 0;
}
