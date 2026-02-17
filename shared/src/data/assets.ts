// =============================================================================
// PRIVATE ASSET OWNERSHIP — Constants & Configuration
// =============================================================================
// Gathering professions can buy private production assets (fields, mines, etc.)
// that produce higher yields than public gathering spots.
// =============================================================================

export const ASSET_TIERS: Record<number, {
  levelRequired: number;
  baseCost: number;
  growthTicks: number;
  minYield: number;
  maxYield: number;
  label: string;
}> = {
  1: { levelRequired: 3, baseCost: 100, growthTicks: 3, minYield: 3, maxYield: 5, label: 'Apprentice' },
  2: { levelRequired: 7, baseCost: 200, growthTicks: 5, minYield: 5, maxYield: 8, label: 'Craftsman' },
  3: { levelRequired: 11, baseCost: 300, growthTicks: 8, minYield: 8, maxYield: 12, label: 'Master' },
};

export const MAX_SLOTS_PER_TIER = 3;
export const WITHER_TICKS = 3;

export interface AssetTypeDefinition {
  id: string;
  name: string;
  spotType: string;  // Key into RESOURCE_MAP from gathering.ts
  baseCost?: number;        // Override ASSET_TIERS[tier].baseCost
  levelRequired?: number;   // Override ASSET_TIERS[tier].levelRequired
  capacity?: number;        // For RANCHER: max animals per building
}

export const PROFESSION_ASSET_TYPES: Record<string, AssetTypeDefinition[]> = {
  FARMER: [
    { id: 'grain_field', name: 'Grain Field', spotType: 'grain_field' },
    { id: 'vegetable_patch', name: 'Vegetable Patch', spotType: 'vegetable_patch' },
    { id: 'apple_orchard', name: 'Apple Orchard', spotType: 'orchard' },
    { id: 'berry_field', name: 'Berry Field', spotType: 'berry' },
    { id: 'hop_field', name: 'Hop Field', spotType: 'hop_field', levelRequired: 7 },
    { id: 'vineyard', name: 'Vineyard', spotType: 'vineyard', levelRequired: 7 },
  ],
  MINER: [
    { id: 'iron_mine_claim', name: 'Iron Mine Claim', spotType: 'mine' },
    { id: 'quarry_claim', name: 'Quarry Claim', spotType: 'quarry' },
    { id: 'clay_pit_rights', name: 'Clay Pit Rights', spotType: 'clay' },
  ],
  LUMBERJACK: [
    { id: 'timber_plot', name: 'Timber Plot', spotType: 'forest' },
  ],
  FISHERMAN: [
    { id: 'fishing_rights', name: 'Fishing Rights', spotType: 'fishing' },
  ],
  HERBALIST: [
    { id: 'herb_garden_plot', name: 'Herb Garden Plot', spotType: 'herb' },
  ],
  RANCHER: [
    { id: 'chicken_coop', name: 'Chicken Coop', spotType: 'chicken_coop', baseCost: 100, levelRequired: 1, capacity: 5 },
    { id: 'dairy_barn', name: 'Dairy Barn', spotType: 'dairy_barn', baseCost: 150, levelRequired: 1, capacity: 3 },
    { id: 'sheep_pen', name: 'Sheep Pen', spotType: 'sheep_pen', baseCost: 120, levelRequired: 5, capacity: 4 },
  ],
  HUNTER: [
    { id: 'hunting_ground_rights', name: 'Hunting Ground Rights', spotType: 'hunting_ground' },
  ],
};

/** Calculate the purchase cost for an asset slot: baseCost * slotNumber */
export function getAssetPurchaseCost(tier: number, slotNumber: number): number {
  const tierData = ASSET_TIERS[tier];
  if (!tierData) throw new Error(`Invalid asset tier: ${tier}`);
  return tierData.baseCost * slotNumber;
}

/** Get all valid asset type IDs for a profession */
export function getAssetTypesForProfession(professionType: string): AssetTypeDefinition[] {
  return PROFESSION_ASSET_TYPES[professionType] || [];
}

/** Get the profession required for a given asset type ID */
export function getProfessionForAssetType(assetTypeId: string): string | null {
  for (const [prof, types] of Object.entries(PROFESSION_ASSET_TYPES)) {
    if (types.some(t => t.id === assetTypeId)) return prof;
  }
  return null;
}

/** Crop state constants */
export const CROP_STATES = {
  EMPTY: 'EMPTY',
  GROWING: 'GROWING',
  READY: 'READY',
  WITHERED: 'WITHERED',
} as const;

export type CropState = typeof CROP_STATES[keyof typeof CROP_STATES];

/** Crops available per field tier. Future items marked in comments. */
export const FIELD_TIER_CROPS: Record<number, { available: string[]; future: string[] }> = {
  1: { available: ['Grain', 'Vegetables'], future: [] },
  2: { available: ['Apples', 'Wild Berries', 'Hops', 'Grapes'], future: [] },
  3: { available: [], future: ['Rare Herbs', 'Exotic Fruits', 'Cotton', 'Flax'] },
};

// =============================================================================
// LIVESTOCK SYSTEM — Definitions & Constants
// =============================================================================

export interface LivestockDefinition {
  animalType: string;
  name: string;
  price: number;
  maxAge: number;           // ticks before old-age death
  feedCost: number;         // Grain consumed per feed cycle
  feedInterval: number;     // ticks between feed cycles
  product: string;          // item template name produced
  minYield: number;
  maxYield: number;
  buildingType: string;     // which building type houses this animal
}

export const LIVESTOCK_DEFINITIONS: Record<string, LivestockDefinition> = {
  chicken: {
    animalType: 'chicken',
    name: 'Chicken',
    price: 30,
    maxAge: 120,
    feedCost: 1,
    feedInterval: 3,
    product: 'Eggs',
    minYield: 1,
    maxYield: 2,
    buildingType: 'chicken_coop',
  },
  cow: {
    animalType: 'cow',
    name: 'Cow',
    price: 80,
    maxAge: 180,
    feedCost: 2,
    feedInterval: 3,
    product: 'Milk',
    minYield: 1,
    maxYield: 1,
    buildingType: 'dairy_barn',
  },
  sheep: {
    animalType: 'sheep',
    name: 'Sheep',
    price: 50,
    maxAge: 150,
    feedCost: 1,
    feedInterval: 3,
    product: 'Wool',
    minYield: 1,
    maxYield: 1,
    buildingType: 'sheep_pen',
  },
};

/** Maps building spotType to the animal types it can hold */
export const BUILDING_ANIMAL_MAP: Record<string, string[]> = {
  chicken_coop: ['chicken'],
  dairy_barn: ['cow'],
  sheep_pen: ['sheep'],
};

export const HUNGER_CONSTANTS = {
  HUNGER_PER_MISSED_FEED: 25,
  STARVING_THRESHOLD: 50,
  DEATH_THRESHOLD: 100,
  DISEASE_CHANCE: 0.01,
  PREDATOR_CHANCE: 0.005,
  DISEASE_HEALTH_LOSS: 25,
} as const;
