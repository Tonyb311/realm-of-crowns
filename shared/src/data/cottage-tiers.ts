export interface CottageTierConfig {
  tier: number;
  name: string;
  storageSlots: number;
  upgradeCost: {
    gold: number;
    materials: { itemName: string; quantity: number }[];
  } | null; // null for tier 1 (free)
}

export const COTTAGE_TIERS: CottageTierConfig[] = [
  {
    tier: 1,
    name: 'Basic Cottage',
    storageSlots: 20,
    upgradeCost: null,
  },
  {
    tier: 2,
    name: 'Improved Cottage',
    storageSlots: 35,
    upgradeCost: {
      gold: 50,
      materials: [
        { itemName: 'Softwood Planks', quantity: 10 },
        { itemName: 'Nails', quantity: 20 },
        { itemName: 'Cut Stone', quantity: 5 },
      ],
    },
  },
  {
    tier: 3,
    name: 'Comfortable Cottage',
    storageSlots: 50,
    upgradeCost: {
      gold: 150,
      materials: [
        { itemName: 'Softwood Planks', quantity: 15 },
        { itemName: 'Nails', quantity: 40 },
        { itemName: 'Cut Stone', quantity: 10 },
      ],
    },
  },
  {
    tier: 4,
    name: 'Spacious Cottage',
    storageSlots: 75,
    upgradeCost: {
      gold: 350,
      materials: [
        { itemName: 'Hardwood Planks', quantity: 15 },
        { itemName: 'Nails', quantity: 60 },
        { itemName: 'Cut Stone', quantity: 15 },
        { itemName: 'Glass', quantity: 3 },
      ],
    },
  },
  {
    tier: 5,
    name: 'Grand Cottage',
    storageSlots: 100,
    upgradeCost: {
      gold: 750,
      materials: [
        { itemName: 'Hardwood Planks', quantity: 20 },
        { itemName: 'Nails', quantity: 100 },
        { itemName: 'Cut Stone', quantity: 20 },
        { itemName: 'Glass', quantity: 5 },
        { itemName: 'Bricks', quantity: 5 },
      ],
    },
  },
];

export function getCottageTier(tier: number): CottageTierConfig | undefined {
  return COTTAGE_TIERS.find(t => t.tier === tier);
}

export function getNextCottageTier(currentTier: number): CottageTierConfig | undefined {
  return COTTAGE_TIERS.find(t => t.tier === currentTier + 1);
}

export const MAX_COTTAGE_TIER = 5;
