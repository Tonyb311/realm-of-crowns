import { prisma } from '../lib/prisma';
import { ItemRarity } from '@prisma/client';

// Quality multipliers applied to base stats
const QUALITY_MULTIPLIERS: Record<ItemRarity, number> = {
  POOR: 0.7,
  COMMON: 1.0,
  FINE: 1.15,
  SUPERIOR: 1.3,
  MASTERWORK: 1.5,
  LEGENDARY: 1.8,
};

export interface ItemStats {
  armor?: number;
  damage?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  speed?: number;
  resistance?: Record<string, number>;
  [key: string]: unknown;
}

export interface CalculatedItemStats {
  baseStats: ItemStats;
  qualityMultiplier: number;
  enchantmentBonuses: ItemStats;
  finalStats: ItemStats;
}

export interface EquipmentTotals {
  totalAC: number;
  totalDamage: number;
  totalStatBonuses: Record<string, number>;
  totalResistances: Record<string, number>;
  items: Array<{
    slot: string;
    itemId: string;
    itemName: string;
    quality: ItemRarity;
    stats: CalculatedItemStats;
  }>;
}

const NUMERIC_STAT_KEYS = [
  'armor', 'damage', 'strength', 'dexterity', 'constitution',
  'intelligence', 'wisdom', 'charisma', 'speed',
];

function multiplyStats(stats: ItemStats, multiplier: number): ItemStats {
  const result: ItemStats = {};

  for (const key of NUMERIC_STAT_KEYS) {
    if (typeof stats[key] === 'number') {
      result[key] = Math.round((stats[key] as number) * multiplier * 100) / 100;
    }
  }

  if (stats.resistance && typeof stats.resistance === 'object') {
    result.resistance = {};
    for (const [resType, value] of Object.entries(stats.resistance)) {
      if (typeof value === 'number') {
        result.resistance[resType] = Math.round(value * multiplier * 100) / 100;
      }
    }
  }

  return result;
}

function sumEnchantmentBonuses(enchantments: unknown[]): ItemStats {
  const totals: ItemStats = {};

  for (const ench of enchantments) {
    if (!ench || typeof ench !== 'object') continue;
    const enchObj = ench as Record<string, unknown>;
    const bonuses = enchObj.bonuses ?? enchObj.stats;
    if (!bonuses || typeof bonuses !== 'object') continue;

    const bonusObj = bonuses as Record<string, unknown>;
    for (const key of NUMERIC_STAT_KEYS) {
      if (typeof bonusObj[key] === 'number') {
        totals[key] = ((totals[key] as number) ?? 0) + (bonusObj[key] as number);
      }
    }

    if (bonusObj.resistance && typeof bonusObj.resistance === 'object') {
      if (!totals.resistance) totals.resistance = {};
      for (const [resType, value] of Object.entries(bonusObj.resistance as Record<string, unknown>)) {
        if (typeof value === 'number') {
          totals.resistance[resType] = (totals.resistance[resType] ?? 0) + value;
        }
      }
    }
  }

  return totals;
}

function addStats(a: ItemStats, b: ItemStats): ItemStats {
  const result: ItemStats = { ...a };

  for (const key of NUMERIC_STAT_KEYS) {
    if (typeof b[key] === 'number') {
      result[key] = ((result[key] as number) ?? 0) + (b[key] as number);
    }
  }

  if (b.resistance && typeof b.resistance === 'object') {
    if (!result.resistance) result.resistance = {};
    for (const [resType, value] of Object.entries(b.resistance)) {
      if (typeof value === 'number') {
        result.resistance[resType] = (result.resistance[resType] ?? 0) + value;
      }
    }
  }

  return result;
}

/**
 * Calculate the final stats for an item: baseStats * qualityMultiplier + enchantmentBonuses
 */
export function calculateItemStats(item: {
  quality: ItemRarity;
  enchantments: unknown;
  template: { stats: unknown };
}): CalculatedItemStats {
  const baseStats = (item.template.stats ?? {}) as ItemStats;
  const qualityMultiplier = QUALITY_MULTIPLIERS[item.quality] ?? 1.0;
  const enchantments = Array.isArray(item.enchantments) ? item.enchantments : [];
  const enchantmentBonuses = sumEnchantmentBonuses(enchantments);
  const scaledBase = multiplyStats(baseStats, qualityMultiplier);
  const finalStats = addStats(scaledBase, enchantmentBonuses);

  return {
    baseStats,
    qualityMultiplier,
    enchantmentBonuses,
    finalStats,
  };
}

/**
 * Aggregate all equipped item stats for a character.
 */
export async function calculateEquipmentTotals(characterId: string): Promise<EquipmentTotals> {
  const equipped = await prisma.characterEquipment.findMany({
    where: { characterId },
    include: {
      item: { include: { template: true } },
    },
  });

  const totals: EquipmentTotals = {
    totalAC: 0,
    totalDamage: 0,
    totalStatBonuses: {},
    totalResistances: {},
    items: [],
  };

  for (const equip of equipped) {
    const calculated = calculateItemStats(equip.item);
    const final = calculated.finalStats;

    if (typeof final.armor === 'number') {
      totals.totalAC += final.armor;
    }
    if (typeof final.damage === 'number') {
      totals.totalDamage += final.damage;
    }

    for (const key of NUMERIC_STAT_KEYS) {
      if (key === 'armor' || key === 'damage') continue;
      if (typeof final[key] === 'number') {
        totals.totalStatBonuses[key] = (totals.totalStatBonuses[key] ?? 0) + (final[key] as number);
      }
    }

    if (final.resistance && typeof final.resistance === 'object') {
      for (const [resType, value] of Object.entries(final.resistance)) {
        if (typeof value === 'number') {
          totals.totalResistances[resType] = (totals.totalResistances[resType] ?? 0) + value;
        }
      }
    }

    totals.items.push({
      slot: equip.slot,
      itemId: equip.item.id,
      itemName: equip.item.template.name,
      quality: equip.item.quality,
      stats: calculated,
    });
  }

  return totals;
}
