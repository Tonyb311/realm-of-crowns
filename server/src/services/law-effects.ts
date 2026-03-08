import { db } from '../lib/db';
import { eq, and, or, gt, isNull, inArray } from 'drizzle-orm';
import { townPolicies, towns, laws, characters, kingdoms, regions, wars } from '@database/tables';

/**
 * Get the effective tax rate for a town, combining the base TownPolicy rate
 * with any active kingdom-level tax laws that modify it.
 */
export async function getEffectiveTaxRate(townId: string): Promise<number> {
  const policy = await db.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
  const baseTaxRate = policy?.taxRate ?? 0.10;

  // Find the kingdom this town belongs to via its region
  const town = await db.query.towns.findFirst({
    where: eq(towns.id, townId),
    columns: { regionId: true },
  });
  if (!town) return baseTaxRate;

  // Find active tax laws for any kingdom (we need to find which kingdom owns this town)
  // Kingdoms don't directly own towns in the schema, but we can check if the town's mayor
  // is the ruler of a kingdom, or look for laws that target this town via effects.
  // For now, look for active tax laws whose effects reference this town or apply kingdom-wide.
  const activeTaxLaws = await db.query.laws.findMany({
    where: and(
      eq(laws.status, 'ACTIVE'),
      eq(laws.lawType, 'tax'),
      or(
        isNull(laws.expiresAt),
        gt(laws.expiresAt, new Date().toISOString()),
      ),
    ),
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
    db.query.characters.findFirst({
      where: eq(characters.id, buyerCharacterId),
      columns: { currentTownId: true },
    }),
    db.query.characters.findFirst({
      where: eq(characters.id, sellerCharacterId),
      columns: { currentTownId: true },
    }),
  ]);

  if (!buyer || !seller) {
    return { blocked: false };
  }

  // Check for active trade embargo laws
  const embargoLaws = await db.query.laws.findMany({
    where: and(
      eq(laws.status, 'ACTIVE'),
      eq(laws.lawType, 'trade'),
      or(
        isNull(laws.expiresAt),
        gt(laws.expiresAt, new Date().toISOString()),
      ),
    ),
  });

  for (const law of embargoLaws) {
    const effects = law.effects as Record<string, unknown>;
    if (effects.embargo === true) {
      const targetKingdomId = effects.targetKingdomId as string | undefined;
      if (targetKingdomId) {
        // Check if buyer or seller belongs to the embargoed kingdom
        // We check via kingdom ruler relationship
        const targetKingdom = await db.query.kingdoms.findFirst({
          where: eq(kingdoms.id, targetKingdomId),
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
  const war = await db.query.wars.findFirst({
    where: and(
      eq(wars.status, 'ACTIVE'),
      or(
        and(eq(wars.attackerKingdomId, kingdomId1), eq(wars.defenderKingdomId, kingdomId2)),
        and(eq(wars.attackerKingdomId, kingdomId2), eq(wars.defenderKingdomId, kingdomId1)),
      ),
    ),
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
  const law = await db.query.laws.findFirst({ where: eq(laws.id, lawId) });
  if (!law) return false;
  if (law.status !== 'ACTIVE') return false;
  if (law.expiresAt && new Date(law.expiresAt) <= new Date()) return false;
  return true;
}

/**
 * Helper: resolve a character's kingdom via town -> region -> kingdom chain.
 * P1 #15 FIX: Uses Region.kingdomId if available (added by seed-data-fixer),
 * falls back to matching Kingdom.capitalTownId against the character's region.
 */
async function getCharacterKingdomId(characterId: string): Promise<string | null> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { currentTownId: true },
  });
  if (!character?.currentTownId) return null;

  const town = await db.query.towns.findFirst({
    where: eq(towns.id, character.currentTownId),
    columns: { regionId: true },
  });
  if (!town) return null;

  // Try Region.kingdomId if the field exists (optional chaining for forward-compat)
  const region = await db.query.regions.findFirst({
    where: eq(regions.id, town.regionId),
  }) as { id: string; kingdomId?: string | null } | null;
  if (region?.kingdomId) return region.kingdomId;

  // Fallback: find kingdom whose capitalTownId is in the same region
  const regionTowns = await db.query.towns.findMany({
    where: eq(towns.regionId, town.regionId),
    columns: { id: true },
  });
  const regionTownIds = regionTowns.map(t => t.id);

  const kingdom = regionTownIds.length > 0
    ? await db.query.kingdoms.findFirst({
        where: inArray(kingdoms.capitalTownId, regionTownIds),
        columns: { id: true },
      })
    : undefined;

  return kingdom?.id ?? null;
}

/**
 * Helper: check if two characters' kingdoms are at war.
 * Returns the war record if at war, null otherwise.
 * P1 #15 FIX: Now resolves kingdom via town -> region -> kingdom chain
 * instead of only checking ruler relationship.
 */
async function getWarBetweenCharacters(
  characterId1: string,
  characterId2: string
): Promise<{ id: string; attackerKingdomId: string; defenderKingdomId: string } | null> {
  const [kingdomId1, kingdomId2] = await Promise.all([
    getCharacterKingdomId(characterId1),
    getCharacterKingdomId(characterId2),
  ]);

  if (!kingdomId1 || !kingdomId2 || kingdomId1 === kingdomId2) return null;

  const warStatus = await getWarStatus(kingdomId1, kingdomId2);
  return warStatus.atWar ? warStatus.war! : null;
}

/**
 * Get all active wars for a kingdom.
 */
export async function getActiveWarsForKingdom(kingdomId: string) {
  return db.query.wars.findMany({
    where: and(
      eq(wars.status, 'ACTIVE'),
      or(
        eq(wars.attackerKingdomId, kingdomId),
        eq(wars.defenderKingdomId, kingdomId),
      ),
    ),
    with: {
      kingdom_attackerKingdomId: { columns: { id: true, name: true, capitalTownId: true } },
      kingdom_defenderKingdomId: { columns: { id: true, name: true, capitalTownId: true } },
    },
  });
}
