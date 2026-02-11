// ---------------------------------------------------------------------------
// In-memory ring buffer for bot activity (ephemeral monitoring data)
// ---------------------------------------------------------------------------

import { ActivityEntry } from './types';

const MAX_ENTRIES = 500;
const buffer: (ActivityEntry | null)[] = new Array(MAX_ENTRIES).fill(null);
let writeIndex = 0;
let totalCount = 0;
let totalActions = 0;
let totalErrors = 0;
let startTime = Date.now();

export function logActivity(entry: ActivityEntry): void {
  buffer[writeIndex % MAX_ENTRIES] = entry;
  writeIndex++;
  totalCount++;
  totalActions++;
  if (!entry.success) totalErrors++;
}

export function getRecentActivity(count: number = 50): ActivityEntry[] {
  const results: ActivityEntry[] = [];
  const filled = Math.min(totalCount, MAX_ENTRIES);
  const start = writeIndex - filled;
  // Read in reverse (most recent first)
  for (let i = writeIndex - 1; i >= start && results.length < count; i--) {
    const entry = buffer[((i % MAX_ENTRIES) + MAX_ENTRIES) % MAX_ENTRIES];
    if (entry) results.push(entry);
  }
  return results;
}

export function getStats(): {
  totalActions: number;
  totalErrors: number;
  actionsPerMinute: number;
} {
  // Calculate actions in last 60 seconds
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  let recentCount = 0;
  const filled = Math.min(totalCount, MAX_ENTRIES);
  const start = writeIndex - filled;
  for (let i = writeIndex - 1; i >= start; i--) {
    const entry = buffer[((i % MAX_ENTRIES) + MAX_ENTRIES) % MAX_ENTRIES];
    if (!entry) break;
    if (new Date(entry.timestamp).getTime() < oneMinuteAgo) break;
    recentCount++;
  }
  return { totalActions, totalErrors, actionsPerMinute: recentCount };
}

export function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

export function resetLog(): void {
  buffer.fill(null);
  writeIndex = 0;
  totalCount = 0;
  totalActions = 0;
  totalErrors = 0;
  startTime = Date.now();
}
