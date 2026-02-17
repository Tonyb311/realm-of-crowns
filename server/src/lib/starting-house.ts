import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Give a character a free Tier 1 cottage in the specified town.
 * Idempotent — uses upsert so it won't fail if the house already exists.
 */
export async function giveStarterHouse(
  characterId: string,
  townId: string,
  characterName: string,
): Promise<void> {
  await prisma.house.upsert({
    where: {
      characterId_townId: { characterId, townId },
    },
    update: {},
    create: {
      characterId,
      townId,
      tier: 1,
      name: `${characterName}'s Cottage`,
      storageSlots: 20,
    },
  });

  logger.info(
    { characterId, townId },
    `Granted starter cottage to ${characterName}`,
  );
}
