import crypto from 'crypto';
import { db } from './db';
import { and, eq } from 'drizzle-orm';
import { houses } from '@database/tables';
import { logger } from './logger';
import { COTTAGE_TIERS } from '@shared/data/cottage-tiers';

/**
 * Give a character a free Tier 1 cottage in the specified town.
 * Idempotent — uses onConflictDoNothing so it won't fail if the house already exists.
 */
export async function giveStarterHouse(
  characterId: string,
  townId: string,
  characterName: string,
): Promise<void> {
  // Check if house already exists (upsert equivalent)
  const existing = await db.query.houses.findFirst({
    where: and(eq(houses.characterId, characterId), eq(houses.townId, townId)),
  });

  if (!existing) {
    await db.insert(houses).values({
      id: crypto.randomUUID(),
      characterId,
      townId,
      tier: 1,
      name: COTTAGE_TIERS[0].name,
      storageSlots: COTTAGE_TIERS[0].storageSlots,
      updatedAt: new Date().toISOString(),
    });
  }

  logger.info(
    { characterId, townId },
    `Granted starter cottage to ${characterName}`,
  );
}
