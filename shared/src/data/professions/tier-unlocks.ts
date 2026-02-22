/**
 * Profession Tier Unlock Tables
 *
 * Defines which gathering spots/crops each profession unlocks at each tier.
 * Used by the gathering system to gate bonus yields by profession level,
 * and by the codex to display tier progression.
 *
 * FARMER APPRENTICE (orchard), HUNTER APPRENTICE (hunting_ground), and
 * MINER/LUMBERJACK/HERBALIST/FISHERMAN APPRENTICE are fully live.
 * Higher tiers and RANCHER are data-only frameworks for future content.
 */

import { ProfessionTierName } from './types';
import { getTierForLevel } from './xp-curve';

// ============================================================
// TYPES
// ============================================================

export interface TierUnlockEntry {
  tier: number;
  crops: string[];
  spotTypes: string[];
  description: string;
  NOT_YET_IMPLEMENTED?: boolean;
  assetBased?: boolean;
}

export type ProfessionTierUnlocks = Record<ProfessionTierName, TierUnlockEntry>;

// ============================================================
// TIER BONUS TABLES
// ============================================================

const TIER_YIELD_BONUS: Record<ProfessionTierName, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 0.25,
  CRAFTSMAN: 0.5,
  EXPERT: 0.75,
  MASTER: 1.0,
  GRANDMASTER: 1.5,
};

const TIER_QUALITY_BONUS: Record<ProfessionTierName, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  CRAFTSMAN: 2,
  EXPERT: 3,
  MASTER: 4,
  GRANDMASTER: 5,
};

// ============================================================
// FARMER CROP UNLOCKS
// ============================================================

export const FARMER_CROP_UNLOCKS: ProfessionTierUnlocks = {
  APPRENTICE: {
    tier: 1,
    crops: ['Apples'],
    spotTypes: ['orchard'],
    description: 'Gather apples at orchards. Plant Grain and Vegetables in private T1 fields.',
  },
  JOURNEYMAN: {
    tier: 2,
    crops: [],
    spotTypes: [],
    description: 'No new public spots. +25% yield bonus at orchards. Private fields continue.',
  },
  CRAFTSMAN: {
    tier: 3,
    crops: ['Hops', 'Grapes'],
    spotTypes: ['hop_field', 'vineyard'],
    description: 'Hops and Grapes — feeds the Brewer profession. Grow in T2 private fields.',
  },
  EXPERT: {
    tier: 4,
    crops: ['Cotton', 'Flax'],
    spotTypes: ['cotton_field', 'flax_field'],
    description: 'Textile fibers — feeds the Tailor profession',
    NOT_YET_IMPLEMENTED: true,
  },
  MASTER: {
    tier: 5,
    crops: ['Rare Herbs', 'Exotic Fruits'],
    spotTypes: ['rare_herb_garden', 'exotic_grove'],
    description: 'Rare ingredients for master-level recipes and potions',
    NOT_YET_IMPLEMENTED: true,
  },
  GRANDMASTER: {
    tier: 6,
    crops: ['Legendary Crops', 'Magical Seedlings'],
    spotTypes: ['enchanted_plot', 'legendary_field'],
    description: 'Mythical crops grown only by the greatest farmers',
    NOT_YET_IMPLEMENTED: true,
  },
};

// ============================================================
// MINER ORE UNLOCKS
// ============================================================

export const MINER_ORE_UNLOCKS: ProfessionTierUnlocks = {
  APPRENTICE: {
    tier: 1,
    crops: ['Iron Ore Chunks', 'Stone Blocks', 'Clay', 'Coal'],
    spotTypes: ['mine', 'quarry', 'clay', 'coal_mine'],
    description: 'Basic ore, stone, and coal extraction from public mines',
  },
  JOURNEYMAN: {
    tier: 2,
    crops: ['Coal'],
    spotTypes: ['coal_mine'],
    description: 'Coal deposits — improved yield at coal mines. Private coal mine assets (L5+).',
  },
  CRAFTSMAN: {
    tier: 3,
    crops: ['Silver Ore'],
    spotTypes: ['silver_mine'],
    description: 'Precious silver veins — feeds the Blacksmith. Mine from private claims (L7+).',
    assetBased: true,
  },
  EXPERT: {
    tier: 4,
    crops: ['Gemstones'],
    spotTypes: ['gem_deposit'],
    description: 'Rare gemstone extraction',
    NOT_YET_IMPLEMENTED: true,
  },
  MASTER: {
    tier: 5,
    crops: ['Mithril Ore'],
    spotTypes: ['mithril_deposit'],
    description: 'Legendary metal mining',
    NOT_YET_IMPLEMENTED: true,
  },
  GRANDMASTER: {
    tier: 6,
    crops: ['Adamantine Ore'],
    spotTypes: ['adamantine_seam'],
    description: 'The rarest ores known to exist',
    NOT_YET_IMPLEMENTED: true,
  },
};

// ============================================================
// LUMBERJACK WOOD UNLOCKS
// ============================================================

export const LUMBERJACK_WOOD_UNLOCKS: ProfessionTierUnlocks = {
  APPRENTICE: {
    tier: 1,
    crops: ['Wood Logs', 'Softwood'],
    spotTypes: ['forest', 'softwood_grove'],
    description: 'Common timber and softwood harvesting from public groves',
  },
  JOURNEYMAN: {
    tier: 2,
    crops: ['Hardwood'],
    spotTypes: ['hardwood_grove'],
    description: 'Dense hardwood from old-growth trees. Public groves and private assets (L5+).',
  },
  CRAFTSMAN: {
    tier: 3,
    crops: ['Resin', 'Bark'],
    spotTypes: ['resin_grove'],
    description: 'Specialty forest products',
    NOT_YET_IMPLEMENTED: true,
  },
  EXPERT: {
    tier: 4,
    crops: ['Exotic Wood'],
    spotTypes: ['exotic_stand'],
    description: 'Rare tropical and magical timbers',
    NOT_YET_IMPLEMENTED: true,
  },
  MASTER: {
    tier: 5,
    crops: ['Petrified Wood', 'Living Bark'],
    spotTypes: ['ancient_grove'],
    description: 'Ancient and magical wood sources',
    NOT_YET_IMPLEMENTED: true,
  },
  GRANDMASTER: {
    tier: 6,
    crops: ['Heartwood', 'Legendary Timber'],
    spotTypes: ['world_tree'],
    description: 'The rarest woods from legendary trees',
    NOT_YET_IMPLEMENTED: true,
  },
};

// ============================================================
// HERBALIST HERB UNLOCKS
// ============================================================

export const HERBALIST_HERB_UNLOCKS: ProfessionTierUnlocks = {
  APPRENTICE: {
    tier: 1,
    crops: ['Wild Herbs'],
    spotTypes: ['herb'],
    description: 'Common herbs and medicinal plants',
  },
  JOURNEYMAN: {
    tier: 2,
    crops: ['Medicinal Herbs'],
    spotTypes: ['apothecary_garden'],
    description: 'Herbs with healing properties',
    NOT_YET_IMPLEMENTED: true,
  },
  CRAFTSMAN: {
    tier: 3,
    crops: ['Medicinal Herbs', 'Glowcap Mushrooms'],
    spotTypes: ['herb'],
    description: 'Medicinal herbs and luminescent fungi — feeds the Alchemist profession. L7+ at herb garden spots.',
  },
  EXPERT: {
    tier: 4,
    crops: ['Arcane Reagents'],
    spotTypes: ['arcane_grove'],
    description: 'Herbs with magical properties',
    NOT_YET_IMPLEMENTED: true,
  },
  MASTER: {
    tier: 5,
    crops: ['Legendary Flora'],
    spotTypes: ['enchanted_garden'],
    description: 'Legendary plants of immense power',
    NOT_YET_IMPLEMENTED: true,
  },
  GRANDMASTER: {
    tier: 6,
    crops: ['Mythical Plants', 'Pure Arcane Essences'],
    spotTypes: ['mythical_grove'],
    description: 'The rarest botanical treasures in the world',
    NOT_YET_IMPLEMENTED: true,
  },
};

// ============================================================
// FISHERMAN FISH UNLOCKS
// ============================================================

export const FISHERMAN_FISH_UNLOCKS: ProfessionTierUnlocks = {
  APPRENTICE: {
    tier: 1,
    crops: ['Raw Fish'],
    spotTypes: ['fishing'],
    description: 'Common freshwater and coastal fishing',
  },
  JOURNEYMAN: {
    tier: 2,
    crops: ['River Fish'],
    spotTypes: ['river_bank'],
    description: 'Skilled river fishing techniques',
    NOT_YET_IMPLEMENTED: true,
  },
  CRAFTSMAN: {
    tier: 3,
    crops: ['River Trout', 'Lake Perch'],
    spotTypes: ['fishing'],
    description: 'Skilled freshwater fishing for premium catch. +50% gathering bonus.',
  },
  EXPERT: {
    tier: 4,
    crops: ['Deep-sea Fish'],
    spotTypes: ['deep_water'],
    description: 'Deep water fishing expeditions',
    NOT_YET_IMPLEMENTED: true,
  },
  MASTER: {
    tier: 5,
    crops: ['Abyssal Fish', 'Giant Shellfish'],
    spotTypes: ['abyssal_trench'],
    description: 'Fishing the darkest depths',
    NOT_YET_IMPLEMENTED: true,
  },
  GRANDMASTER: {
    tier: 6,
    crops: ['Legendary Sea Creatures'],
    spotTypes: ['legendary_waters'],
    description: 'Catching mythical aquatic beings',
    NOT_YET_IMPLEMENTED: true,
  },
};

// ============================================================
// RANCHER ANIMAL UNLOCKS
// ============================================================

export const RANCHER_ANIMAL_UNLOCKS: ProfessionTierUnlocks = {
  APPRENTICE: {
    tier: 1,
    crops: ['Eggs', 'Milk'],
    spotTypes: ['chicken_coop', 'dairy_barn'],
    description: 'Build a Chicken Coop or Dairy Barn, buy livestock, and produce Eggs or Milk.',
    assetBased: true,
  },
  JOURNEYMAN: {
    tier: 2,
    crops: ['Wool'],
    spotTypes: ['sheep_pen'],
    description: 'Build a Sheep Pen to raise sheep for Wool.',
    assetBased: true,
  },
  CRAFTSMAN: {
    tier: 3,
    crops: ['Fine Wool', 'Silkworm Cocoons'],
    spotTypes: ['sheep_pen', 'silkworm_house'],
    description: 'L7+ Sheep Pens produce Fine Wool. Build a Silkworm House to produce Silkworm Cocoons.',
    assetBased: true,
  },
  EXPERT: {
    tier: 4,
    crops: ['War Horses', 'Exotic Livestock'],
    spotTypes: ['war_stable'],
    description: 'Elite animal breeding',
    NOT_YET_IMPLEMENTED: true,
  },
  MASTER: {
    tier: 5,
    crops: ['Prize Breeding Lines'],
    spotTypes: ['champion_ranch'],
    description: 'Legendary bloodlines',
    NOT_YET_IMPLEMENTED: true,
  },
  GRANDMASTER: {
    tier: 6,
    crops: ['Legendary Mounts'],
    spotTypes: ['mythical_pasture'],
    description: 'Breeding mythical creatures',
    NOT_YET_IMPLEMENTED: true,
  },
};

// ============================================================
// HUNTER GAME UNLOCKS
// ============================================================

export const HUNTER_GAME_UNLOCKS: ProfessionTierUnlocks = {
  APPRENTICE: {
    tier: 1,
    crops: ['Wild Game Meat', 'Animal Pelts'],
    spotTypes: ['hunting_ground'],
    description: 'Hunt wild game at hunting grounds for meat and pelts.',
  },
  JOURNEYMAN: {
    tier: 2,
    crops: ['Animal Pelts'],
    spotTypes: ['hunting_ground'],
    description: 'Improved hunting technique with better pelt yield.',
  },
  CRAFTSMAN: {
    tier: 3,
    crops: ['Wolf Pelts', 'Bear Hides'],
    spotTypes: ['hunting_ground'],
    description: 'Tracking wolves and bears for premium pelts and hides.',
  },
  EXPERT: {
    tier: 4,
    crops: ['Exotic Hides'],
    spotTypes: ['exotic_territory'],
    description: 'Hunting rare and dangerous creatures',
    NOT_YET_IMPLEMENTED: true,
  },
  MASTER: {
    tier: 5,
    crops: ['Dragon Bone Fragments'],
    spotTypes: ['dragon_territory'],
    description: 'Hunting legendary beasts',
    NOT_YET_IMPLEMENTED: true,
  },
  GRANDMASTER: {
    tier: 6,
    crops: ['Spirit Beast Hide', 'Mythical Trophies'],
    spotTypes: ['spirit_wilds'],
    description: 'Tracking creatures of myth and legend',
    NOT_YET_IMPLEMENTED: true,
  },
};

// ============================================================
// MASTER MAP
// ============================================================

export const PROFESSION_TIER_UNLOCKS: Record<string, ProfessionTierUnlocks> = {
  FARMER: FARMER_CROP_UNLOCKS,
  MINER: MINER_ORE_UNLOCKS,
  LUMBERJACK: LUMBERJACK_WOOD_UNLOCKS,
  HERBALIST: HERBALIST_HERB_UNLOCKS,
  FISHERMAN: FISHERMAN_FISH_UNLOCKS,
  RANCHER: RANCHER_ANIMAL_UNLOCKS,
  HUNTER: HUNTER_GAME_UNLOCKS,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Get the yield bonus multiplier for a given tier name (0, 0.25, 0.5, 0.75, 1.0, 1.5) */
export function getTierYieldBonus(tierName: ProfessionTierName): number {
  return TIER_YIELD_BONUS[tierName] ?? 0;
}

/** Get the crafting quality bonus for a given tier name (0, 1, 2, 3, 4, 5) */
export function getTierQualityBonus(tierName: ProfessionTierName): number {
  return TIER_QUALITY_BONUS[tierName] ?? 0;
}

/**
 * Get the gathering yield bonus for a profession at a specific spot.
 * Returns the bonus multiplier (e.g. 0.25 for +25%) or 0 if the spot is not unlocked.
 *
 * @param profession - The profession type (e.g. 'FARMER', 'MINER')
 * @param professionLevel - The character's profession level
 * @param spotType - The gathering spot resource type (e.g. 'orchard', 'mine', 'hunting_ground')
 * @returns Yield bonus multiplier (0 = no bonus, 0.25 = +25%, etc.)
 */
export function getGatheringBonus(profession: string, professionLevel: number, spotType: string): number {
  const tierUnlocks = PROFESSION_TIER_UNLOCKS[profession];
  if (!tierUnlocks) return 0;

  const currentTierName = getTierForLevel(professionLevel);
  const currentTierNum = tierUnlocks[currentTierName]?.tier ?? 1;

  // Check if any tier up to the current one unlocks this spot type
  for (const entry of Object.values(tierUnlocks)) {
    if (entry.tier <= currentTierNum && entry.spotTypes.includes(spotType)) {
      return getTierYieldBonus(currentTierName);
    }
  }

  return 0; // Spot type not unlocked at current tier
}

/**
 * Get all spot types a profession has unlocked at the given level.
 * Returns spot types from all tiers up to and including the current tier.
 *
 * @param profession - The profession type (e.g. 'FARMER', 'MINER')
 * @param professionLevel - The character's profession level
 * @returns Array of unlocked spot type strings
 */
export function getUnlockedSpotTypes(profession: string, professionLevel: number): string[] {
  const tierUnlocks = PROFESSION_TIER_UNLOCKS[profession];
  if (!tierUnlocks) return [];

  const currentTierName = getTierForLevel(professionLevel);
  const currentTierNum = tierUnlocks[currentTierName]?.tier ?? 1;

  const spotTypes: string[] = [];
  for (const entry of Object.values(tierUnlocks)) {
    if (entry.tier <= currentTierNum && !entry.NOT_YET_IMPLEMENTED) {
      spotTypes.push(...entry.spotTypes);
    }
  }

  return spotTypes;
}
