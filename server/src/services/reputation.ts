/**
 * Racial reputation service — manages per-character standing with each race.
 *
 * Rows are lazily created via upsert. Missing row = NEUTRAL (score 0).
 * Score is clamped to [-100, +100].
 */

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { racialReputations } from '@database/tables';
import { getReputationGainBonus } from './religion-buffs';
import crypto from 'crypto';

/**
 * Add racial reputation for a character with a target race.
 * Applies Valtheris reputation gain multiplier automatically.
 * Upserts — creates row on first interaction, updates on subsequent.
 */
export async function addRacialReputation(
  characterId: string,
  targetRace: string,
  baseAmount: number,
  townId: string,
): Promise<void> {
  // Get Valtheris reputation bonus
  const reputationBonus = await getReputationGainBonus(characterId, townId);
  const finalAmount = baseAmount * (1 + reputationBonus);

  await db.insert(racialReputations)
    .values({
      id: crypto.randomUUID(),
      characterId,
      race: targetRace,
      score: Math.max(-100, Math.min(100, finalAmount)),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [racialReputations.characterId, racialReputations.race],
      set: {
        score: sql`LEAST(100, GREATEST(-100, ${racialReputations.score} + ${finalAmount}))`,
        updatedAt: new Date().toISOString(),
      },
    });
}

/**
 * Batch-friendly version: add reputation with a pre-computed bonus.
 * Used in daily tick to avoid N+1 religion context lookups.
 */
export async function addRacialReputationWithBonus(
  characterId: string,
  targetRace: string,
  baseAmount: number,
  reputationBonus: number,
): Promise<void> {
  const finalAmount = baseAmount * (1 + reputationBonus);

  await db.insert(racialReputations)
    .values({
      id: crypto.randomUUID(),
      characterId,
      race: targetRace,
      score: Math.max(-100, Math.min(100, finalAmount)),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [racialReputations.characterId, racialReputations.race],
      set: {
        score: sql`LEAST(100, GREATEST(-100, ${racialReputations.score} + ${finalAmount}))`,
        updatedAt: new Date().toISOString(),
      },
    });
}
