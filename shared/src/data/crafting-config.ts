/**
 * Crafting system constants — extracted from server/src/routes/crafting.ts
 *
 * Single source of truth for crafting tiers, quality bonuses, workshop mappings,
 * and quality roll mappings. DO NOT duplicate these values elsewhere.
 */

import type { ProfessionTier, ProfessionType, BuildingType } from '@prisma/client';

/** Tier progression order (lowest → highest). */
export const TIER_ORDER: ProfessionTier[] = [
  'APPRENTICE',
  'JOURNEYMAN',
  'CRAFTSMAN',
  'EXPERT',
  'MASTER',
  'GRANDMASTER',
];

/** Minimum profession level required to craft recipes of each tier. */
export const TIER_LEVEL_REQUIRED: Record<ProfessionTier, number> = {
  APPRENTICE: 1,
  JOURNEYMAN: 11,
  CRAFTSMAN: 26,
  EXPERT: 51,
  MASTER: 76,
  GRANDMASTER: 91,
};

/** Profession type → required workshop building type for crafting. */
export const PROFESSION_WORKSHOP_MAP: Partial<Record<ProfessionType, BuildingType>> = {
  SMELTER: 'SMELTERY',
  BLACKSMITH: 'SMITHY',
  TANNER: 'TANNERY',
  TAILOR: 'TAILOR_SHOP',
  MASON: 'MASON_YARD',
  WOODWORKER: 'LUMBER_MILL',
  ALCHEMIST: 'ALCHEMY_LAB',
  ENCHANTER: 'ENCHANTING_TOWER',
  COOK: 'KITCHEN',
  BREWER: 'BREWERY',
  JEWELER: 'JEWELER_WORKSHOP',
  FLETCHER: 'FLETCHER_BENCH',
  LEATHERWORKER: 'TANNERY',
  ARMORER: 'SMITHY',
  SCRIBE: 'SCRIBE_STUDY',
};

/** Cascading quality bonus — bonus added to crafting roll when using higher-quality ingredients. */
export const QUALITY_BONUS: Record<string, number> = {
  FINE: 1,
  SUPERIOR: 2,
  MASTERWORK: 3,
  LEGENDARY: 5,
};

/** Map quality string from dice.ts roll result → ItemRarity enum value. */
export const QUALITY_MAP: Record<string, 'POOR' | 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK' | 'LEGENDARY'> = {
  Poor: 'POOR',
  Common: 'COMMON',
  Fine: 'FINE',
  Superior: 'SUPERIOR',
  Masterwork: 'MASTERWORK',
  Legendary: 'LEGENDARY',
};

/** Profession tier → flat bonus added to quality roll. */
export const PROFESSION_TIER_QUALITY_BONUS: Record<ProfessionTier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  CRAFTSMAN: 2,
  EXPERT: 3,
  MASTER: 5,
  GRANDMASTER: 7,
};
