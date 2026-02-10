import { prisma } from './prisma';

/**
 * Check if two characters belong to the same account (same userId).
 * Used to enforce multi-character restrictions: no self-trading,
 * no self-combat, no self-services, etc.
 */
export async function isSameAccount(
  characterId1: string,
  characterId2: string
): Promise<boolean> {
  if (characterId1 === characterId2) return true;

  const [c1, c2] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId1 },
      select: { userId: true },
    }),
    prisma.character.findUnique({
      where: { id: characterId2 },
      select: { userId: true },
    }),
  ]);

  if (!c1 || !c2) return false;
  return c1.userId === c2.userId;
}
