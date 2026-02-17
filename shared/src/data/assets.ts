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
}

export const PROFESSION_ASSET_TYPES: Record<string, AssetTypeDefinition[]> = {
  FARMER: [
    { id: 'grain_field', name: 'Grain Field', spotType: 'grain_field' },
    { id: 'vegetable_patch', name: 'Vegetable Patch', spotType: 'vegetable_patch' },
    { id: 'apple_orchard', name: 'Apple Orchard', spotType: 'orchard' },
    { id: 'berry_field', name: 'Berry Field', spotType: 'berry' },
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
    { id: 'pasture_lease', name: 'Pasture Lease', spotType: 'pasture' },
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
  2: { available: ['Apples', 'Wild Berries'], future: ['Hops', 'Grapes'] },
  3: { available: [], future: ['Rare Herbs', 'Exotic Fruits', 'Cotton', 'Flax'] },
};
