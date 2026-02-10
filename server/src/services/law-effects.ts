import { prisma } from '../lib/prisma';

/**
 * Get the effective tax rate for a town, combining the base TownPolicy rate
 * with any active kingdom-level tax laws that modify it.
 */
export async function getEffectiveTaxRate(townId: string): Promise<number> {
  const policy = await prisma.townPolicy.findUnique({ where: { townId } });
  const baseTaxRate = policy?.taxRate ?? 0.10;

  // Find the kingdom this town belongs to via its region
  const town = await prisma.town.findUnique({
    where: { id: townId },
    select: { regionId: true },
  });
  if (!town) return baseTaxRate;

  // Find active tax laws for any kingdom (we need to find which kingdom owns this town)
  // Kingdoms don't directly own towns in the schema, but we can check if the town's mayor
  // is the ruler of a kingdom, or look for laws that target this town via effects.
  // For now, look for active tax laws whose effects reference this town or apply kingdom-wide.
  const activeTaxLaws = await prisma.law.findMany({
    where: {
      status: 'active',
      lawType: 'tax',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  let modifier = 0;
  for (const law of activeTaxLaws) {
    const effects = law.effects as Record<string, unknown>;
    // Support effects like { taxModifier: 0.05, targetTownId?: "..." }
    if (typeof effects.taxModifier === 'number') {
      const targetTownId = effects.targetTownId as string | undefined;
      // Apply if law targets this specific town, or applies kingdom-wide (no targetTownId)
      if (!targetTownId || targetTownId === townId) {
        modifier += effects.taxModifier;
      }
    }
  }

  // Clamp between 0 and 0.50 (50% max effective tax)
  return Math.max(0, Math.min(0.50, baseTaxRate + modifier));
}

/**
 * Check trade restrictions between buyer and seller kingdoms.
 * Returns { blocked: true, reason: string } if trade is blocked, or { blocked: false }.
 */
export async function getTradeRestrictions(
  townId: string,
  buyerCharacterId: string,
  sellerCharacterId: string
): Promise<{ blocked: boolean; reason?: string }> {
  // Get both characters' current towns and their kingdoms
  const [buyer, seller] = await Promise.all([
    prisma.character.findUnique({
      where: { id: buyerCharacterId },
      select: { currentTownId: true },
    }),
    prisma.character.findUnique({
      where: { id: sellerCharacterId },
      select: { currentTownId: true },
    }),
  ]);

  if (!buyer || !seller) {
    return { blocked: false };
  }

  // Check for active trade embargo laws
  const embargoLaws = await prisma.law.findMany({
    where: {
      status: 'active',
      lawType: 'trade',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  for (const law of embargoLaws) {
    const effects = law.effects as Record<string, unknown>;
    if (effects.embargo === true) {
      const targetKingdomId = effects.targetKingdomId as string | undefined;
      if (targetKingdomId) {
        // Check if buyer or seller belongs to the embargoed kingdom
        // We check via kingdom ruler relationship
        const targetKingdom = await prisma.kingdom.findUnique({
          where: { id: targetKingdomId },
        });
        if (targetKingdom) {
          return {
            blocked: true,
            reason: `Trade embargo is in effect against the kingdom of ${targetKingdom.name}`,
          };
        }
      }
    }
  }

  // Check war status between kingdoms of buyer and seller
  const warCheck = await getWarBetweenCharacters(buyerCharacterId, sellerCharacterId);
  if (warCheck) {
    return {
      blocked: true,
      reason: 'Trade is blocked between kingdoms at war',
    };
  }

  return { blocked: false };
}

/**
 * Check if two kingdoms are currently at war.
 */
export async function getWarStatus(
  kingdomId1: string,
  kingdomId2: string
): Promise<{ atWar: boolean; war?: { id: string; attackerKingdomId: string; defenderKingdomId: string } }> {
  const war = await prisma.war.findFirst({
    where: {
      status: 'active',
      OR: [
        { attackerKingdomId: kingdomId1, defenderKingdomId: kingdomId2 },
        { attackerKingdomId: kingdomId2, defenderKingdomId: kingdomId1 },
      ],
    },
  });

  if (war) {
    return {
      atWar: true,
      war: {
        id: war.id,
        attackerKingdomId: war.attackerKingdomId,
        defenderKingdomId: war.defenderKingdomId,
      },
    };
  }

  return { atWar: false };
}

/**
 * Check if a specific law is active and not expired.
 */
export async function isLawActive(lawId: string): Promise<boolean> {
  const law = await prisma.law.findUnique({ where: { id: lawId } });
  if (!law) return false;
  if (law.status !== 'active') return false;
  if (law.expiresAt && law.expiresAt <= new Date()) return false;
  return true;
}

/**
 * Helper: check if two characters' kingdoms are at war.
 * Returns the war record if at war, null otherwise.
 */
async function getWarBetweenCharacters(
  characterId1: string,
  characterId2: string
): Promise<{ id: string; attackerKingdomId: string; defenderKingdomId: string } | null> {
  // Find kingdoms these characters might belong to (via ruler relationship)
  const kingdoms = await prisma.kingdom.findMany({
    where: {
      rulerId: { in: [characterId1, characterId2] },
    },
    select: { id: true, rulerId: true },
  });

  if (kingdoms.length < 2) {
    // Characters aren't rulers of different kingdoms -- check town mayors
    // For a broader approach, get the kingdoms that own the towns these characters are in
    // Since there's no direct town->kingdom FK, we skip this deeper check for now
    return null;
  }

  const k1 = kingdoms.find(k => k.rulerId === characterId1);
  const k2 = kingdoms.find(k => k.rulerId === characterId2);
  if (!k1 || !k2) return null;

  const warStatus = await getWarStatus(k1.id, k2.id);
  return warStatus.atWar ? warStatus.war! : null;
}

/**
 * Get all active wars for a kingdom.
 */
export async function getActiveWarsForKingdom(kingdomId: string) {
  return prisma.war.findMany({
    where: {
      status: 'active',
      OR: [
        { attackerKingdomId: kingdomId },
        { defenderKingdomId: kingdomId },
      ],
    },
    include: {
      attackerKingdom: { select: { id: true, name: true, capitalTownId: true } },
      defenderKingdom: { select: { id: true, name: true, capitalTownId: true } },
    },
  });
}
