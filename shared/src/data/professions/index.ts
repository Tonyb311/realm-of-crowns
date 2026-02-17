export type {
  ProfessionType,
  ProfessionCategory,
  ProfessionTierName,
  PrimaryStat,
  TierDefinition,
  XPCurveEntry,
  ProfessionDefinition,
} from './types';

export { GATHERING_PROFESSIONS } from './gathering';
export { CRAFTING_PROFESSIONS } from './crafting';
export { SERVICE_PROFESSIONS } from './service';
export { PROFESSION_TIERS, getTierByName } from './tiers';
export { XP_CURVE, getXpForLevel, getCumulativeXpForLevel, getTierForLevel } from './xp-curve';
export {
  PROFESSION_TIER_UNLOCKS,
  FARMER_CROP_UNLOCKS,
  MINER_ORE_UNLOCKS,
  LUMBERJACK_WOOD_UNLOCKS,
  HERBALIST_HERB_UNLOCKS,
  FISHERMAN_FISH_UNLOCKS,
  RANCHER_ANIMAL_UNLOCKS,
  HUNTER_GAME_UNLOCKS,
  getTierYieldBonus,
  getTierQualityBonus,
  getGatheringBonus,
  getUnlockedSpotTypes,
} from './tier-unlocks';
export type { TierUnlockEntry, ProfessionTierUnlocks } from './tier-unlocks';

// Re-export individual professions for direct access
export {
  FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER,
} from './gathering';
export {
  SMELTER, BLACKSMITH, ARMORER, WOODWORKER, TANNER, LEATHERWORKER, TAILOR,
  ALCHEMIST, ENCHANTER, COOK, BREWER, JEWELER, FLETCHER, MASON, SCRIBE,
} from './crafting';
export {
  MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN,
} from './service';

import { GATHERING_PROFESSIONS } from './gathering';
import { CRAFTING_PROFESSIONS } from './crafting';
import { SERVICE_PROFESSIONS } from './service';
import { ProfessionDefinition, ProfessionType, ProfessionCategory } from './types';

export const ALL_PROFESSIONS: ProfessionDefinition[] = [
  ...GATHERING_PROFESSIONS,
  ...CRAFTING_PROFESSIONS,
  ...SERVICE_PROFESSIONS,
];

const PROFESSION_MAP = new Map<ProfessionType, ProfessionDefinition>(
  ALL_PROFESSIONS.map(p => [p.type, p]),
);

export function getProfessionByType(type: ProfessionType): ProfessionDefinition | undefined {
  return PROFESSION_MAP.get(type);
}

export function getProfessionsByCategory(category: ProfessionCategory): ProfessionDefinition[] {
  return ALL_PROFESSIONS.filter(p => p.category === category);
}

export const VALID_PROFESSION_TYPES: ProfessionType[] = ALL_PROFESSIONS.map(p => p.type);

export const PROFESSION_CATEGORIES: ProfessionCategory[] = ['GATHERING', 'CRAFTING', 'SERVICE'];
