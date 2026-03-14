/**
 * Religion buff lookup service.
 *
 * Provides helpers to resolve a character's religion-based buffs
 * (personal + town-wide) from their patron god and home town's
 * dominant church.  Accepts pre-fetched chapter data so the daily
 * tick can avoid N+1 queries.
 */

import { db } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { characters, churchChapters, travelRoutes, townPolicies } from '@database/tables';
import {
  getPersonalReligionBuffs,
  getDominantChurchTownEffects,
  GOD_BUFFS,
} from '@shared/data/god-buffs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReligionContext {
  patronGodId: string | null;
  homeTownId: string | null;
  chapterTier: string | null;        // tier of the character's church chapter
  dominantGodId: string | null;      // god of the dominant church in home town
  dominantTier: string | null;       // tier of the dominant church
  dominantIsShrine: boolean;         // whether the dominant church has a shrine
}

export interface ReligionBuffs {
  personalBuffs: Record<string, number>;
  townBuffs: Record<string, number>;
  combinedBuffs: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Core lookup — from DB
// ---------------------------------------------------------------------------

/** Fetch full religion context for a character from the database. */
export async function getCharacterReligionContext(characterId: string): Promise<ReligionContext> {
  const char = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { patronGodId: true, homeTownId: true },
  });

  if (!char || !char.homeTownId) {
    return { patronGodId: null, homeTownId: null, chapterTier: null, dominantGodId: null, dominantTier: null, dominantIsShrine: false };
  }

  // Character's own chapter (if they follow a god)
  let chapterTier: string | null = null;
  if (char.patronGodId) {
    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, char.patronGodId),
        eq(churchChapters.townId, char.homeTownId),
      ),
      columns: { tier: true },
    });
    chapterTier = chapter?.tier ?? null;
  }

  // Dominant church in home town
  const dominant = await db.query.churchChapters.findFirst({
    where: and(
      eq(churchChapters.townId, char.homeTownId),
      eq(churchChapters.isDominant, true),
    ),
    columns: { godId: true, tier: true, isShrine: true },
  });

  return {
    patronGodId: char.patronGodId,
    homeTownId: char.homeTownId,
    chapterTier,
    dominantGodId: dominant?.godId ?? null,
    dominantTier: dominant?.tier ?? null,
    dominantIsShrine: dominant?.isShrine ?? false,
  };
}

// ---------------------------------------------------------------------------
// Core lookup — from pre-fetched data (batch tick usage)
// ---------------------------------------------------------------------------

export interface ChapterRow {
  id: string;
  godId: string;
  townId: string;
  tier: string;
  isDominant: boolean;
  isShrine: boolean;
}

/** Build religion context from pre-fetched chapter data (avoids N+1 in tick). */
export function buildReligionContext(
  patronGodId: string | null,
  homeTownId: string | null,
  allChapters: ChapterRow[],
): ReligionContext {
  if (!homeTownId) {
    return { patronGodId, homeTownId, chapterTier: null, dominantGodId: null, dominantTier: null, dominantIsShrine: false };
  }

  let chapterTier: string | null = null;
  if (patronGodId) {
    const ch = allChapters.find(c => c.godId === patronGodId && c.townId === homeTownId);
    chapterTier = ch?.tier ?? null;
  }

  const dominant = allChapters.find(c => c.townId === homeTownId && c.isDominant);

  return {
    patronGodId,
    homeTownId,
    chapterTier,
    dominantGodId: dominant?.godId ?? null,
    dominantTier: dominant?.tier ?? null,
    dominantIsShrine: dominant?.isShrine ?? false,
  };
}

// ---------------------------------------------------------------------------
// Buff resolution
// ---------------------------------------------------------------------------

/** Resolve personal + town-wide religion buffs from context. */
export function resolveReligionBuffs(ctx: ReligionContext, crisisMultiplier = 1.0): ReligionBuffs {
  const personalBuffs = getPersonalReligionBuffs(ctx.patronGodId, ctx.chapterTier ?? '', crisisMultiplier);
  const townBuffs = ctx.dominantGodId && ctx.dominantTier
    ? getDominantChurchTownEffects(ctx.dominantGodId, ctx.dominantTier, crisisMultiplier)
    : {};

  // Additive stacking
  const combinedBuffs: Record<string, number> = { ...personalBuffs };
  for (const [key, val] of Object.entries(townBuffs)) {
    combinedBuffs[key] = (combinedBuffs[key] ?? 0) + val;
  }

  return { personalBuffs, townBuffs, combinedBuffs };
}

/**
 * Get Crisis of Faith multiplier for a god in a specific town.
 * Returns 0.75 if a Crisis of Faith is active against that god, otherwise 1.0.
 */
export async function getCrisisMultiplier(godId: string | null, townId: string | null): Promise<number> {
  if (!godId || !townId) return 1.0;
  const policy = await db.query.townPolicies.findFirst({
    where: eq(townPolicies.townId, townId),
    columns: { tradePolicy: true },
  });
  const tp = policy?.tradePolicy as Record<string, any> | null;
  if (!tp?.crisisOfFaith) return 1.0;
  const crisis = tp.crisisOfFaith as { targetGodId: string; until: string };
  if (crisis.targetGodId !== godId) return 1.0;
  if (new Date(crisis.until) <= new Date()) return 1.0;
  return 0.75;
}

// ---------------------------------------------------------------------------
// Market bonus helpers (Tessivane)
// ---------------------------------------------------------------------------

/**
 * Get the combined market bonus percentage for a character in a given town.
 * Combines personal buff (Tessivane member) + town-wide buff (Tessivane dominant).
 * Returns 0-1 (e.g. 0.10 = 10% bonus).
 */
export async function getMarketBonus(characterId: string, townId: string): Promise<number> {
  const ctx = await getCharacterReligionContext(characterId);
  const buffs = resolveReligionBuffs({ ...ctx, homeTownId: townId });
  return Math.min(1, buffs.combinedBuffs.marketBonusPercent ?? 0);
}

// ---------------------------------------------------------------------------
// Tax reduction helpers (Veradine)
// ---------------------------------------------------------------------------

/**
 * Get the combined tax reduction percentage for a character in a given town.
 * Combines personal buff (Veradine member) + town-wide buff (Veradine dominant).
 * Returns 0-1 (e.g. 0.13 = 13% reduction).
 */
export async function getTaxReduction(characterId: string, townId: string): Promise<number> {
  const ctx = await getCharacterReligionContext(characterId);
  // Override homeTownId with the tax town for town-wide buff check
  const buffs = resolveReligionBuffs({ ...ctx, homeTownId: townId });
  return Math.min(1, buffs.combinedBuffs.taxReductionPercent ?? 0);
}

/**
 * Batch-friendly version: get tax reduction from pre-fetched chapter data.
 * Used in property tax loops to avoid N+1 queries.
 */
export function getTaxReductionFromChapters(
  patronGodId: string | null,
  homeTownId: string | null,
  townId: string,
  allChapters: ChapterRow[],
): number {
  const ctx = buildReligionContext(patronGodId, homeTownId, allChapters);
  // Override homeTownId with tax town for town-wide buff lookup
  const buffs = resolveReligionBuffs({ ...ctx, homeTownId: townId });
  return Math.min(1, buffs.combinedBuffs.taxReductionPercent ?? 0);
}

// ---------------------------------------------------------------------------
// Road danger helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the total road encounter chance reduction for a route.
 *
 * Returns a value 0-1 representing the multiplicative reduction
 * (e.g., 0.25 means encounterChance *= 0.75).
 *
 * Sources:
 * 1. Town-wide effect from dominant church in origin town (Aurvandos)
 * 2. Personal member buff (Aurvandos members at ESTABLISHED+)
 * 3. Shrine effect: 25% reduction on routes adjacent to the shrine town
 */
export async function getReligionEncounterReduction(
  characterId: string,
  originTownId: string,
  destinationTownId: string,
): Promise<number> {
  // 1. Character's personal road danger reduction
  const ctx = await getCharacterReligionContext(characterId);
  const buffs = resolveReligionBuffs(ctx);
  let reduction = buffs.combinedBuffs.roadDangerReductionPercent ?? 0;

  // 2. Check for Aurvandos shrine on origin OR destination town
  //    (adjacent routes = routes connected to the shrine town)
  const shrineChapters = await db.query.churchChapters.findMany({
    where: and(
      eq(churchChapters.isShrine, true),
      eq(churchChapters.godId, 'aurvandos'),
    ),
    columns: { townId: true },
  });

  for (const sc of shrineChapters) {
    if (sc.townId === originTownId || sc.townId === destinationTownId) {
      const shrineEffect = GOD_BUFFS.aurvandos.shrineEffects.adjacentRouteDangerReductionPercent ?? 0;
      reduction += shrineEffect;
      break;
    }
  }

  return Math.min(1, reduction);
}

/**
 * Batch-friendly version: accepts pre-fetched chapter data.
 * Used in group encounters and tick processing.
 */
export function getReligionEncounterReductionFromChapters(
  patronGodId: string | null,
  homeTownId: string | null,
  originTownId: string,
  destinationTownId: string,
  allChapters: ChapterRow[],
): number {
  const ctx = buildReligionContext(patronGodId, homeTownId, allChapters);
  const buffs = resolveReligionBuffs(ctx);
  let reduction = buffs.combinedBuffs.roadDangerReductionPercent ?? 0;

  // Shrine check
  const aurvanShrine = allChapters.find(
    c => c.godId === 'aurvandos' && c.isShrine && (c.townId === originTownId || c.townId === destinationTownId),
  );
  if (aurvanShrine) {
    reduction += GOD_BUFFS.aurvandos.shrineEffects.adjacentRouteDangerReductionPercent ?? 0;
  }

  return Math.min(1, reduction);
}

// ---------------------------------------------------------------------------
// Reputation gain helpers (Valtheris)
// ---------------------------------------------------------------------------

/**
 * Get the combined reputation gain bonus for a character in a given town.
 * Combines personal buff (Valtheris member) + town-wide buff (Valtheris dominant)
 * + Seraphiel diplomaticReputationPercent (stacks additively).
 * Returns 0-1 (e.g. 0.15 = 15% bonus).
 */
export async function getReputationGainBonus(characterId: string, townId: string): Promise<number> {
  const ctx = await getCharacterReligionContext(characterId);
  const buffs = resolveReligionBuffs({ ...ctx, homeTownId: townId });
  const valtherisBonus = buffs.combinedBuffs.reputationGainPercent ?? 0;
  const seraphielBonus = buffs.combinedBuffs.diplomaticReputationPercent ?? 0;
  return Math.min(1, valtherisBonus + seraphielBonus);
}

/** Batch-friendly: get reputation gain bonus from pre-fetched chapters. */
export function getReputationGainBonusFromChapters(
  patronGodId: string | null,
  homeTownId: string | null,
  townId: string,
  allChapters: ChapterRow[],
): number {
  const ctx = buildReligionContext(patronGodId, homeTownId, allChapters);
  const buffs = resolveReligionBuffs({ ...ctx, homeTownId: townId });
  const valtherisBonus = buffs.combinedBuffs.reputationGainPercent ?? 0;
  const seraphielBonus = buffs.combinedBuffs.diplomaticReputationPercent ?? 0;
  return Math.min(1, valtherisBonus + seraphielBonus);
}

// ---------------------------------------------------------------------------
// Foreign trade helpers (Valtheris)
// ---------------------------------------------------------------------------

/**
 * Get the combined foreign trade bonus for a character in a given town.
 * Applies when trading in a town that is NOT the character's home town.
 * Returns 0-1 (e.g. 0.10 = 10% bonus).
 */
export async function getForeignTradeBonus(characterId: string, townId: string): Promise<number> {
  const ctx = await getCharacterReligionContext(characterId);
  const buffs = resolveReligionBuffs({ ...ctx, homeTownId: townId });
  return Math.min(1, buffs.combinedBuffs.foreignTradePercent ?? 0);
}

/**
 * Check if a town is currently under martial law.
 * Martial law state is stored in townPolicies.tradePolicy JSONB.
 */
export async function isTownUnderMartialLaw(townId: string): Promise<boolean> {
  const policy = await db.query.townPolicies.findFirst({
    where: eq(townPolicies.townId, townId),
    columns: { tradePolicy: true },
  });
  const tp = policy?.tradePolicy as Record<string, any> | null;
  if (!tp?.martialLawUntil) return false;
  return new Date(tp.martialLawUntil) > new Date();
}
