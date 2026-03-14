import { db } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { townUpgrades } from '@database/tables';
import { UPGRADE_TYPES, type UpgradeType } from '@shared/data/town-projects-config';

export interface TownUpgradeEffects {
  allMetricsBonus: number;
  gatheringYieldPercent: number;
  craftingQualityPercent: number;
  buildingSlots: number;
  travelTimeReduction: number;
  roadDangerReduction: number;
}

const EMPTY_EFFECTS: TownUpgradeEffects = {
  allMetricsBonus: 0,
  gatheringYieldPercent: 0,
  craftingQualityPercent: 0,
  buildingSlots: 0,
  travelTimeReduction: 0,
  roadDangerReduction: 0,
};

export async function getTownUpgradeEffects(townId: string): Promise<TownUpgradeEffects> {
  const upgrades = await db.select().from(townUpgrades).where(
    and(eq(townUpgrades.townId, townId), eq(townUpgrades.status, 'ACTIVE'))
  );

  if (upgrades.length === 0) return { ...EMPTY_EFFECTS };

  const result = { ...EMPTY_EFFECTS };
  for (const upgrade of upgrades) {
    const typeConfig = UPGRADE_TYPES[upgrade.upgradeType as UpgradeType];
    if (!typeConfig) continue;
    const tierConfig = typeConfig.tiers[upgrade.tier as 1 | 2 | 3];
    if (!tierConfig) continue;
    const effects = tierConfig.effects as Record<string, number>;
    for (const [key, val] of Object.entries(effects)) {
      if (key in result) {
        (result as any)[key] += val;
      }
    }
  }
  return result;
}
