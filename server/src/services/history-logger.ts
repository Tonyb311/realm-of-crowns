/**
 * Historical records logger for Seraphiel.
 * Fire-and-forget: failures never block the parent operation.
 */

import { db } from '../lib/db';
import { townHistoryLog } from '@database/tables';
import crypto from 'crypto';

export async function logTownEvent(
  townId: string,
  eventType: string,
  title: string,
  description: string,
  involvedCharacterId?: string,
  involvedRace?: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    await db.insert(townHistoryLog).values({
      id: crypto.randomUUID(),
      townId,
      eventType,
      title,
      description,
      involvedCharacterId: involvedCharacterId ?? null,
      involvedRace: involvedRace ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    // Fire-and-forget — never let logging failures block critical paths
    console.error('[HistoryLogger] Failed to log event:', err instanceof Error ? err.message : String(err));
  }
}
