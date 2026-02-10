import { BuildingType } from '@prisma/client';

export interface MaterialRequirement {
  itemName: string;
  quantity: number;
}

export interface BuildingRequirements {
  materials: MaterialRequirement[];
  constructionTimeHours: number;
}

/**
 * Base construction requirements per building type (level 0 -> 1).
 * Upgrades multiply materials by 1.5x per level and time by 1.5x per level.
 */
export const BUILDING_REQUIREMENTS: Record<BuildingType, BuildingRequirements> = {
  // ── Houses ──────────────────────────────────────────────────
  HOUSE_SMALL: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 20 },
      { itemName: 'Nails', quantity: 50 },
      { itemName: 'Cut Stone', quantity: 10 },
    ],
    constructionTimeHours: 24,
  },
  HOUSE_MEDIUM: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 30 },
      { itemName: 'Nails', quantity: 100 },
      { itemName: 'Cut Stone', quantity: 20 },
      { itemName: 'Glass', quantity: 5 },
    ],
    constructionTimeHours: 72,
  },
  HOUSE_LARGE: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 50 },
      { itemName: 'Beams', quantity: 20 },
      { itemName: 'Nails', quantity: 200 },
      { itemName: 'Cut Stone', quantity: 40 },
      { itemName: 'Glass', quantity: 10 },
      { itemName: 'Polished Marble', quantity: 5 },
    ],
    constructionTimeHours: 168,
  },

  // ── Workshops ───────────────────────────────────────────────
  SMITHY: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 20 },
      { itemName: 'Cut Stone', quantity: 20 },
      { itemName: 'Iron Ingot', quantity: 15 },
      { itemName: 'Nails', quantity: 80 },
    ],
    constructionTimeHours: 48,
  },
  SMELTERY: {
    materials: [
      { itemName: 'Cut Stone', quantity: 30 },
      { itemName: 'Bricks', quantity: 20 },
      { itemName: 'Iron Ingot', quantity: 10 },
      { itemName: 'Nails', quantity: 60 },
    ],
    constructionTimeHours: 48,
  },
  TANNERY: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 15 },
      { itemName: 'Nails', quantity: 40 },
      { itemName: 'Cut Stone', quantity: 10 },
    ],
    constructionTimeHours: 48,
  },
  TAILOR_SHOP: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 15 },
      { itemName: 'Nails', quantity: 50 },
      { itemName: 'Cloth', quantity: 10 },
      { itemName: 'Glass', quantity: 3 },
    ],
    constructionTimeHours: 48,
  },
  ALCHEMY_LAB: {
    materials: [
      { itemName: 'Cut Stone', quantity: 20 },
      { itemName: 'Hardwood Planks', quantity: 15 },
      { itemName: 'Glass', quantity: 10 },
      { itemName: 'Nails', quantity: 60 },
    ],
    constructionTimeHours: 48,
  },
  ENCHANTING_TOWER: {
    materials: [
      { itemName: 'Cut Stone', quantity: 40 },
      { itemName: 'Polished Marble', quantity: 5 },
      { itemName: 'Glass', quantity: 8 },
      { itemName: 'Hardwood Planks', quantity: 10 },
      { itemName: 'Nails', quantity: 50 },
    ],
    constructionTimeHours: 48,
  },
  KITCHEN: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 15 },
      { itemName: 'Bricks', quantity: 10 },
      { itemName: 'Iron Ingot', quantity: 5 },
      { itemName: 'Nails', quantity: 50 },
    ],
    constructionTimeHours: 48,
  },
  BREWERY: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 20 },
      { itemName: 'Nails', quantity: 60 },
      { itemName: 'Iron Ingot', quantity: 8 },
      { itemName: 'Cut Stone', quantity: 10 },
    ],
    constructionTimeHours: 48,
  },
  JEWELER_WORKSHOP: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 15 },
      { itemName: 'Cut Stone', quantity: 15 },
      { itemName: 'Glass', quantity: 5 },
      { itemName: 'Nails', quantity: 50 },
    ],
    constructionTimeHours: 48,
  },
  FLETCHER_BENCH: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 15 },
      { itemName: 'Nails', quantity: 30 },
      { itemName: 'Cut Stone', quantity: 5 },
    ],
    constructionTimeHours: 48,
  },
  MASON_YARD: {
    materials: [
      { itemName: 'Cut Stone', quantity: 25 },
      { itemName: 'Softwood Planks', quantity: 10 },
      { itemName: 'Nails', quantity: 40 },
    ],
    constructionTimeHours: 48,
  },
  LUMBER_MILL: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 25 },
      { itemName: 'Iron Ingot', quantity: 10 },
      { itemName: 'Nails', quantity: 60 },
      { itemName: 'Cut Stone', quantity: 10 },
    ],
    constructionTimeHours: 48,
  },
  SCRIBE_STUDY: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 15 },
      { itemName: 'Glass', quantity: 5 },
      { itemName: 'Nails', quantity: 40 },
      { itemName: 'Cut Stone', quantity: 10 },
    ],
    constructionTimeHours: 48,
  },

  // ── Service Buildings ───────────────────────────────────────
  STABLE: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 30 },
      { itemName: 'Nails', quantity: 80 },
      { itemName: 'Beams', quantity: 10 },
      { itemName: 'Cut Stone', quantity: 10 },
    ],
    constructionTimeHours: 48,
  },
  WAREHOUSE: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 40 },
      { itemName: 'Nails', quantity: 150 },
      { itemName: 'Cut Stone', quantity: 30 },
    ],
    constructionTimeHours: 72,
  },
  BANK: {
    materials: [
      { itemName: 'Cut Stone', quantity: 40 },
      { itemName: 'Hardwood Planks', quantity: 20 },
      { itemName: 'Iron Ingot', quantity: 20 },
      { itemName: 'Nails', quantity: 100 },
      { itemName: 'Glass', quantity: 5 },
    ],
    constructionTimeHours: 96,
  },
  INN: {
    materials: [
      { itemName: 'Hardwood Planks', quantity: 30 },
      { itemName: 'Beams', quantity: 10 },
      { itemName: 'Nails', quantity: 100 },
      { itemName: 'Cut Stone', quantity: 20 },
      { itemName: 'Glass', quantity: 8 },
    ],
    constructionTimeHours: 72,
  },
  MARKET_STALL: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 10 },
      { itemName: 'Nails', quantity: 20 },
    ],
    constructionTimeHours: 12,
  },

  // ── Production Buildings ────────────────────────────────────
  FARM: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 20 },
      { itemName: 'Nails', quantity: 40 },
      { itemName: 'Cut Stone', quantity: 5 },
    ],
    constructionTimeHours: 48,
  },
  RANCH: {
    materials: [
      { itemName: 'Softwood Planks', quantity: 25 },
      { itemName: 'Nails', quantity: 60 },
      { itemName: 'Beams', quantity: 8 },
      { itemName: 'Cut Stone', quantity: 10 },
    ],
    constructionTimeHours: 48,
  },
  MINE: {
    materials: [
      { itemName: 'Beams', quantity: 15 },
      { itemName: 'Hardwood Planks', quantity: 20 },
      { itemName: 'Nails', quantity: 80 },
      { itemName: 'Cut Stone', quantity: 15 },
    ],
    constructionTimeHours: 72,
  },
};

/**
 * Storage capacity per building type (number of item slots).
 */
export const STORAGE_CAPACITY: Partial<Record<BuildingType, number>> = {
  HOUSE_SMALL: 20,
  HOUSE_MEDIUM: 50,
  HOUSE_LARGE: 100,
  WAREHOUSE: 200,
};

/**
 * Get materials required for a specific level upgrade.
 * Level 1 (initial build) uses base materials.
 * Each subsequent level multiplies by 1.5x.
 */
export function getMaterialsForLevel(
  buildingType: BuildingType,
  targetLevel: number,
): MaterialRequirement[] {
  const base = BUILDING_REQUIREMENTS[buildingType];
  if (!base) return [];

  const multiplier = Math.pow(1.5, targetLevel - 1);
  return base.materials.map(m => ({
    itemName: m.itemName,
    quantity: Math.ceil(m.quantity * multiplier),
  }));
}

/**
 * Get construction time for a specific level upgrade in hours.
 */
export function getConstructionTimeForLevel(
  buildingType: BuildingType,
  targetLevel: number,
): number {
  const base = BUILDING_REQUIREMENTS[buildingType];
  if (!base) return 48;

  const multiplier = Math.pow(1.5, targetLevel - 1);
  return Math.ceil(base.constructionTimeHours * multiplier);
}
