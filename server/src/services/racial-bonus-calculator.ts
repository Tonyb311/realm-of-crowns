import { getRace } from '@shared/data/races';
import type { GatheringBonus } from '@shared/types/race';

export interface SubRaceInput {
  id: string;
  name: string;
  element?: string;
  [key: string]: unknown;
}

export interface RacialBonusResult {
  speedBonus: number;
  yieldBonus: number;
  qualityBonus: number;
  xpBonus: number;
  gatheringBonuses: GatheringBonus[];
  tradeModifiers: {
    professionType: string;
    speedBonus: number;
    qualityBonus: number;
    yieldBonus: number;
    xpBonus: number;
  }[];
}

/**
 * Calculate the composite racial bonuses for a character based on their race,
 * sub-race, current profession, town, and biome.
 */
export function calculateRacialBonuses(
  race: string,
  subRace: SubRaceInput | null,
  professionType: string | null,
  currentTown: string | null,
  currentBiome: string | null,
): RacialBonusResult {
  const raceDef = getRace(race.toLowerCase());

  if (!raceDef) {
    return {
      speedBonus: 0,
      yieldBonus: 0,
      qualityBonus: 0,
      xpBonus: 0,
      gatheringBonuses: [],
      tradeModifiers: [],
    };
  }

  // Start with profession bonuses from race definition
  const tradeModifiers = raceDef.professionBonuses.map(pb => ({
    professionType: pb.professionType,
    speedBonus: pb.speedBonus,
    qualityBonus: pb.qualityBonus,
    yieldBonus: pb.yieldBonus,
    xpBonus: pb.xpBonus,
  }));

  // Aggregate bonuses for the current profession
  let speedBonus = 0;
  let yieldBonus = 0;
  let qualityBonus = 0;
  let xpBonus = 0;

  if (professionType) {
    const profLower = professionType.toLowerCase();
    for (const pb of raceDef.professionBonuses) {
      const pbType = pb.professionType.toLowerCase();
      // Match exact profession or wildcard categories like "all_crafting"
      if (pbType === profLower || pbType === 'all_crafting' || pbType === 'all_gathering') {
        speedBonus += pb.speedBonus;
        yieldBonus += pb.yieldBonus;
        qualityBonus += pb.qualityBonus;
        xpBonus += pb.xpBonus;
      }
    }
  }

  // Apply sub-race bonuses on top (element-specific crafting bonuses from specialMechanics)
  if (subRace && raceDef.specialMechanics) {
    const elementBonuses = raceDef.specialMechanics.elementSpecificBonuses;
    if (elementBonuses && subRace.element) {
      const elemData = elementBonuses[subRace.element];
      if (elemData && professionType) {
        const profLower = professionType.toLowerCase();
        // Check if any key in elemData matches the current profession
        for (const [key, value] of Object.entries(elemData)) {
          if (typeof value === 'number' && key.toLowerCase().includes(profLower)) {
            speedBonus += value;
          }
        }
      }
    }
  }

  // Gather gathering bonuses, filtered by current biome if provided
  let gatheringBonuses = raceDef.gatheringBonuses ?? [];
  if (currentBiome) {
    const biomeLower = currentBiome.toLowerCase();
    gatheringBonuses = gatheringBonuses.filter(
      gb => gb.biome.toLowerCase() === 'any' || gb.biome.toLowerCase() === biomeLower,
    );
  }

  return {
    speedBonus,
    yieldBonus,
    qualityBonus,
    xpBonus,
    gatheringBonuses,
    tradeModifiers,
  };
}
