import crypto from 'crypto';
import { db } from '../lib/db';
import { travelLogs } from '@database/tables';

export async function logTravelEvent(
  townId: string,
  characterId: string,
  characterName: string,
  characterRace: string,
  action: 'ARRIVED' | 'DEPARTED',
  fromTownId?: string | null,
  toTownId?: string | null,
): Promise<void> {
  await db.insert(travelLogs).values({
    id: crypto.randomUUID(),
    townId,
    characterId,
    characterName,
    characterRace,
    action,
    fromTownId: fromTownId ?? undefined,
    toTownId: toTownId ?? undefined,
  });
}
