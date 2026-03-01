/**
 * Building system constants — extracted from server/src/routes/buildings.ts
 */

import type { BuildingType } from '@prisma/client';

/** Workshop building types (used for rental features, crafting access). */
export const WORKSHOP_TYPES: BuildingType[] = [
  'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB',
  'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP',
  'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY',
];

/** Building types that support item storage. */
export const STORAGE_TYPES: BuildingType[] = [
  'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'WAREHOUSE',
];

/** Stone construction buildings (Dwarf racial bonus applies). */
export const STONE_BUILDINGS: string[] = [
  'SMITHY', 'SMELTERY', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'MASON_YARD', 'BANK', 'MINE',
];

/** Wood construction buildings (Firbolg racial bonus applies). */
export const WOOD_BUILDINGS: string[] = [
  'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'KITCHEN', 'BREWERY',
  'FLETCHER_BENCH', 'LUMBER_MILL', 'STABLE', 'INN', 'FARM', 'RANCH',
];

/** Building condition → effectiveness multiplier tiers. */
export const CONDITION_TIERS = [
  { minCondition: 75, effectTier: 'FULL', effectivenessMultiplier: 1.0 },
  { minCondition: 50, effectTier: 'DEGRADED', effectivenessMultiplier: 0.90 },
  { minCondition: 25, effectTier: 'POOR', effectivenessMultiplier: 0.75 },
  { minCondition: 1, effectTier: 'CONDEMNED', effectivenessMultiplier: 0.50 },
  { minCondition: 0, effectTier: 'NON_FUNCTIONAL', effectivenessMultiplier: 0 },
] as const;
