import { Race, ProfessionType, BiomeType, ElementalType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GatheringBonusResult {
  /** Multiplicative yield modifier, e.g. 0.30 = +30% */
  yieldMultiplier: number;
  /** Speed modifier for gathering (subtracted from time multiplier) */
  speedModifier: number;
  /** Penalty applied (negative value means slower / less yield) */
  penalty: number;
  /** Human-readable explanations */
  sources: string[];
}

export interface CraftSpeedBonusResult {
  /** Total speed bonus (subtracted from time multiplier) */
  speedBonus: number;
  sources: string[];
}

export interface CraftQualityBonusResult {
  /** Added to quality roll total */
  qualityBonus: number;
  sources: string[];
}

export interface MaterialReductionResult {
  /** Fractional reduction, e.g. 0.10 = 10% fewer materials */
  reduction: number;
  sources: string[];
}

// ---------------------------------------------------------------------------
// Internal bonus definitions
// ---------------------------------------------------------------------------

interface GatheringBonusDef {
  profession?: ProfessionType;
  resourceType?: string;
  biomes?: BiomeType[];
  yieldBonus: number;
  speedBonus?: number;
  condition?: string;
}

interface CraftSpeedDef {
  professions?: ProfessionType[];
  /** 'all' means every crafting profession */
  all?: boolean;
  speedBonus: number;
}

interface CraftQualityDef {
  professions: ProfessionType[];
  qualityBonus: number;
}

interface PenaltyDef {
  professions?: ProfessionType[];
  gatheringCondition?: 'daytime' | 'land' | 'all';
  /** Applied as negative yield/speed/quality modifier */
  value: number;
  type: 'gathering' | 'crafting_quality' | 'crafting_speed';
}

interface RaceBonusProfile {
  gathering: GatheringBonusDef[];
  craftSpeed: CraftSpeedDef[];
  craftQuality: CraftQualityDef[];
  penalties: PenaltyDef[];
  materialReduction?: { levelRequired: number; reduction: number };
  extraProfessionSlot?: { levelRequired: number };
}

// ---------------------------------------------------------------------------
// All 20 race bonus profiles
// ---------------------------------------------------------------------------

const RACIAL_BONUS_MAP: Record<Race, RaceBonusProfile> = {
  HUMAN: {
    gathering: [
      { profession: 'FARMER', biomes: ['PLAINS'], yieldBonus: 0.10 },
    ],
    craftSpeed: [{ all: true, speedBonus: 0.05 }],
    craftQuality: [],
    penalties: [],
    extraProfessionSlot: { levelRequired: 15 },
  },

  ELF: {
    gathering: [
      { profession: 'HERBALIST', biomes: ['FOREST', 'FEYWILD'], yieldBonus: 0.25 },
    ],
    craftSpeed: [],
    craftQuality: [
      { professions: ['ENCHANTER'], qualityBonus: 4 },
    ],
    penalties: [],
  },

  DWARF: {
    gathering: [
      { profession: 'MINER', biomes: ['MOUNTAIN', 'UNDERGROUND'], yieldBonus: 0.30 },
    ],
    craftSpeed: [
      { professions: ['SMELTER'], speedBonus: 0.20 },
    ],
    craftQuality: [
      { professions: ['BLACKSMITH', 'ARMORER'], qualityBonus: 5 },
    ],
    penalties: [],
  },

  HARTHFOLK: {
    gathering: [
      { profession: 'FARMER', yieldBonus: 0.15 },
    ],
    craftSpeed: [],
    craftQuality: [
      { professions: ['COOK'], qualityBonus: 5 },
      { professions: ['BREWER'], qualityBonus: 4 },
    ],
    penalties: [],
  },

  ORC: {
    gathering: [
      { profession: 'HUNTER', yieldBonus: 0.30 },
    ],
    craftSpeed: [
      { professions: ['TANNER'], speedBonus: 0.20 },
      { professions: ['LEATHERWORKER'], speedBonus: 0.20 },
    ],
    craftQuality: [],
    penalties: [],
  },

  NETHKIN: {
    gathering: [
      { profession: 'HERBALIST', biomes: ['SWAMP'], yieldBonus: 0.25 },
    ],
    craftSpeed: [],
    craftQuality: [
      { professions: ['ALCHEMIST'], qualityBonus: 6 },
      { professions: ['ENCHANTER'], qualityBonus: 4 },
    ],
    penalties: [],
  },

  DRAKONID: {
    gathering: [
      { profession: 'MINER', biomes: ['VOLCANIC'], yieldBonus: 0.20 },
    ],
    craftSpeed: [
      { professions: ['SMELTER'], speedBonus: 0.20 },
    ],
    craftQuality: [],
    penalties: [],
  },

  HALF_ELF: {
    // The +20% to ONE chosen profession is handled dynamically via chosenProfession
    gathering: [],
    craftSpeed: [],
    craftQuality: [],
    penalties: [],
  },

  HALF_ORC: {
    gathering: [
      { profession: 'HUNTER', yieldBonus: 0.20 },
    ],
    craftSpeed: [
      { professions: ['TANNER'], speedBonus: 0.15 },
    ],
    craftQuality: [
      { professions: ['BLACKSMITH', 'ARMORER'], qualityBonus: 3 },
    ],
    penalties: [],
  },

  GNOME: {
    gathering: [],
    craftSpeed: [{ all: true, speedBonus: 0.10 }],
    craftQuality: [
      { professions: ['JEWELER', 'FLETCHER'], qualityBonus: 3 },
    ],
    penalties: [],
    materialReduction: { levelRequired: 10, reduction: 0.10 },
  },

  MERFOLK: {
    gathering: [
      { profession: 'FISHERMAN', yieldBonus: 0.40 },
      { resourceType: 'pearl_coral', biomes: ['UNDERWATER', 'COASTAL'], yieldBonus: 0.30 },
    ],
    craftSpeed: [],
    craftQuality: [],
    penalties: [
      { gatheringCondition: 'land', value: 0.15, type: 'gathering' },
    ],
  },

  BEASTFOLK: {
    gathering: [
      { profession: 'HUNTER', yieldBonus: 0.35 },
    ],
    craftSpeed: [],
    craftQuality: [
      { professions: ['TANNER', 'LEATHERWORKER'], qualityBonus: 5 },
    ],
    penalties: [
      { professions: ['ENCHANTER'], value: 0.20, type: 'crafting_quality' },
    ],
  },

  FAEFOLK: {
    gathering: [
      { profession: 'HERBALIST', yieldBonus: 0.30 },
    ],
    craftSpeed: [],
    craftQuality: [
      { professions: ['ENCHANTER'], qualityBonus: 7 },
    ],
    penalties: [
      { professions: ['BLACKSMITH', 'ARMORER', 'MASON'], value: 0.25, type: 'crafting_quality' },
    ],
  },

  GOLIATH: {
    gathering: [
      { profession: 'MINER', biomes: ['MOUNTAIN', 'TUNDRA', 'VOLCANIC'], yieldBonus: 0.35 },
    ],
    craftSpeed: [],
    craftQuality: [
      { professions: ['MASON'], qualityBonus: 5 },
    ],
    penalties: [
      { professions: ['TAILOR', 'ENCHANTER'], value: 0.20, type: 'crafting_quality' },
    ],
  },

  NIGHTBORNE: {
    gathering: [],
    craftSpeed: [],
    craftQuality: [
      { professions: ['ALCHEMIST'], qualityBonus: 6 },
      { professions: ['TAILOR'], qualityBonus: 5 },
    ],
    penalties: [
      { gatheringCondition: 'daytime', value: 0.10, type: 'gathering' },
    ],
  },

  MOSSKIN: {
    gathering: [
      { profession: 'HERBALIST', yieldBonus: 0.40 },
      { profession: 'FARMER', yieldBonus: 0.30 },
    ],
    craftSpeed: [],
    craftQuality: [],
    penalties: [
      { professions: ['MINER', 'MASON'], value: 0.25, type: 'crafting_quality' },
    ],
  },

  FORGEBORN: {
    gathering: [],
    craftSpeed: [
      { professions: ['SMELTER'], speedBonus: 0.25 },
      { all: true, speedBonus: 0.25 },
    ],
    craftQuality: [],
    penalties: [
      { professions: ['COOK', 'BREWER'], value: 0.30, type: 'crafting_quality' },
      { professions: ['HERBALIST' as unknown as ProfessionType], value: 0.20, type: 'crafting_quality' },
    ],
  },

  ELEMENTARI: {
    // Element-specific bonuses handled dynamically via elementalType
    gathering: [],
    craftSpeed: [],
    craftQuality: [],
    penalties: [],
  },

  REVENANT: {
    gathering: [
      { profession: 'HERBALIST', biomes: ['SWAMP', 'UNDERGROUND'], yieldBonus: 0.25 },
      { profession: 'MINER', yieldBonus: 0.15 },
    ],
    craftSpeed: [],
    craftQuality: [],
    penalties: [
      { professions: ['COOK', 'BREWER'], value: 0.25, type: 'crafting_quality' },
    ],
  },

  CHANGELING: {
    gathering: [],
    craftSpeed: [],
    craftQuality: [],
    penalties: [],
    // Changeling bonuses are service-profession focused: merchant, courier, innkeeper
    // Handled in trade/service systems, not gathering/crafting
  },
};

// ---------------------------------------------------------------------------
// Elementari element-specific bonuses
// ---------------------------------------------------------------------------

interface ElementariBonusProfile {
  craftSpeed: CraftSpeedDef[];
  craftQuality: CraftQualityDef[];
  gathering: GatheringBonusDef[];
}

const ELEMENTARI_ELEMENT_BONUSES: Record<ElementalType, ElementariBonusProfile> = {
  FIRE: {
    craftSpeed: [{ professions: ['SMELTER'], speedBonus: 0.25 }],
    craftQuality: [{ professions: ['BLACKSMITH', 'ARMORER'], qualityBonus: 4 }],
    gathering: [],
  },
  WATER: {
    craftSpeed: [],
    craftQuality: [{ professions: ['ALCHEMIST'], qualityBonus: 5 }],
    gathering: [{ profession: 'FISHERMAN', yieldBonus: 0.20 }],
  },
  EARTH: {
    craftSpeed: [],
    craftQuality: [{ professions: ['MASON'], qualityBonus: 5 }],
    gathering: [{ profession: 'MINER', yieldBonus: 0.20 }],
  },
  AIR: {
    craftSpeed: [],
    craftQuality: [{ professions: ['ENCHANTER'], qualityBonus: 3 }],
    gathering: [{ profession: 'HERBALIST', yieldBonus: 0.20 }],
  },
};

// ---------------------------------------------------------------------------
// Half-Elf chosen profession bonus value
// ---------------------------------------------------------------------------

const HALF_ELF_CHOSEN_BONUS = 0.20; // +20% to chosen profession

// ---------------------------------------------------------------------------
// Changeling service bonuses (profit/speed/income — applied in trade routes)
// ---------------------------------------------------------------------------

export const CHANGELING_SERVICE_BONUSES = {
  MERCHANT: { profitBonus: 0.30 },
  COURIER: { speedBonus: 0.25 },
  INNKEEPER: { incomeBonus: 0.20 },
} as const;

// ---------------------------------------------------------------------------
// Harthfolk trade profit bonus (applied in market/trade routes)
// ---------------------------------------------------------------------------

export const HARTHFOLK_TRADE_PROFIT_BONUS = 0.20;

// Harthfolk gather speed bonus (all gathering)
const HARTHFOLK_GATHER_SPEED_BONUS = 0.10;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate racial gathering bonus for a character.
 * Returns yield multiplier, speed modifier, and any penalties.
 */
export function getRacialGatheringBonus(
  race: Race,
  subRace: { element?: string; chosenProfession?: string } | null,
  profession: ProfessionType,
  biome: BiomeType | null,
  timeOfDay?: 'day' | 'night',
): GatheringBonusResult {
  const profile = RACIAL_BONUS_MAP[race];
  let yieldMultiplier = 0;
  let speedModifier = 0;
  let penalty = 0;
  const sources: string[] = [];

  // Static gathering bonuses
  for (const gb of profile.gathering) {
    if (gb.profession && gb.profession !== profession) continue;
    if (gb.biomes && biome && !gb.biomes.includes(biome)) continue;
    yieldMultiplier += gb.yieldBonus;
    if (gb.speedBonus) speedModifier += gb.speedBonus;
    sources.push(
      `${race} +${Math.round(gb.yieldBonus * 100)}% ${gb.profession ?? 'gathering'}` +
      (gb.biomes ? ` in ${gb.biomes.join('/')}` : ''),
    );
  }

  // Harthfolk global gather speed
  if (race === 'HARTHFOLK') {
    speedModifier += HARTHFOLK_GATHER_SPEED_BONUS;
    sources.push('Harthfolk +10% gather speed (all)');
  }

  // Elementari element-specific gathering
  if (race === 'ELEMENTARI' && subRace?.element) {
    const elem = subRace.element.toUpperCase() as ElementalType;
    const elemProfile = ELEMENTARI_ELEMENT_BONUSES[elem];
    if (elemProfile) {
      for (const gb of elemProfile.gathering) {
        if (gb.profession && gb.profession !== profession) continue;
        yieldMultiplier += gb.yieldBonus;
        sources.push(`${elem} Elementari +${Math.round(gb.yieldBonus * 100)}% ${gb.profession ?? 'gathering'}`);
      }
    }
  }

  // Half-Elf chosen profession (applies to gathering too)
  if (race === 'HALF_ELF' && subRace?.chosenProfession) {
    if (subRace.chosenProfession === profession) {
      yieldMultiplier += HALF_ELF_CHOSEN_BONUS;
      sources.push(`Half-Elf chosen profession +${Math.round(HALF_ELF_CHOSEN_BONUS * 100)}%`);
    }
  }

  // Penalties
  for (const pen of profile.penalties) {
    if (pen.type !== 'gathering') continue;

    if (pen.gatheringCondition === 'daytime' && timeOfDay === 'day') {
      penalty += pen.value;
      sources.push(`${race} -${Math.round(pen.value * 100)}% daytime gathering penalty`);
    } else if (pen.gatheringCondition === 'land' && biome && !['UNDERWATER', 'COASTAL'].includes(biome)) {
      penalty += pen.value;
      sources.push(`${race} -${Math.round(pen.value * 100)}% land gathering penalty`);
    } else if (pen.gatheringCondition === 'all') {
      penalty += pen.value;
      sources.push(`${race} -${Math.round(pen.value * 100)}% gathering penalty`);
    }
  }

  return { yieldMultiplier, speedModifier, penalty, sources };
}

/**
 * Calculate racial craft speed bonus for a character.
 */
export function getRacialCraftSpeedBonus(
  race: Race,
  subRace: { element?: string; chosenProfession?: string } | null,
  profession: ProfessionType,
): CraftSpeedBonusResult {
  const profile = RACIAL_BONUS_MAP[race];
  let speedBonus = 0;
  const sources: string[] = [];

  for (const cs of profile.craftSpeed) {
    if (cs.all) {
      speedBonus += cs.speedBonus;
      sources.push(`${race} +${Math.round(cs.speedBonus * 100)}% all craft speed`);
    } else if (cs.professions?.includes(profession)) {
      speedBonus += cs.speedBonus;
      sources.push(`${race} +${Math.round(cs.speedBonus * 100)}% ${profession} speed`);
    }
  }

  // Elementari element-specific craft speed
  if (race === 'ELEMENTARI' && subRace?.element) {
    const elem = subRace.element.toUpperCase() as ElementalType;
    const elemProfile = ELEMENTARI_ELEMENT_BONUSES[elem];
    if (elemProfile) {
      for (const cs of elemProfile.craftSpeed) {
        if (cs.professions?.includes(profession)) {
          speedBonus += cs.speedBonus;
          sources.push(`${elem} Elementari +${Math.round(cs.speedBonus * 100)}% ${profession} speed`);
        }
      }
    }
  }

  // Half-Elf chosen profession speed bonus
  if (race === 'HALF_ELF' && subRace?.chosenProfession === profession) {
    speedBonus += HALF_ELF_CHOSEN_BONUS;
    sources.push(`Half-Elf chosen profession +${Math.round(HALF_ELF_CHOSEN_BONUS * 100)}% speed`);
  }

  return { speedBonus, sources };
}

/**
 * Calculate racial craft quality bonus for a character.
 * Returns a value to be added to the quality roll total.
 */
export function getRacialCraftQualityBonus(
  race: Race,
  subRace: { element?: string; chosenProfession?: string } | null,
  profession: ProfessionType,
): CraftQualityBonusResult {
  const profile = RACIAL_BONUS_MAP[race];
  let qualityBonus = 0;
  const sources: string[] = [];

  for (const cq of profile.craftQuality) {
    if (cq.professions.includes(profession)) {
      qualityBonus += cq.qualityBonus;
      sources.push(`${race} +${cq.qualityBonus} ${profession} quality`);
    }
  }

  // Check penalties that reduce quality
  for (const pen of profile.penalties) {
    if (pen.type !== 'crafting_quality') continue;
    if (pen.professions?.includes(profession)) {
      // Convert percentage penalty to quality roll points (scale: 20-point range)
      const penaltyPoints = Math.round(pen.value * 20);
      qualityBonus -= penaltyPoints;
      sources.push(`${race} -${penaltyPoints} ${profession} quality penalty`);
    }
  }

  // Elementari element-specific quality
  if (race === 'ELEMENTARI' && subRace?.element) {
    const elem = subRace.element.toUpperCase() as ElementalType;
    const elemProfile = ELEMENTARI_ELEMENT_BONUSES[elem];
    if (elemProfile) {
      for (const cq of elemProfile.craftQuality) {
        if (cq.professions.includes(profession)) {
          qualityBonus += cq.qualityBonus;
          sources.push(`${elem} Elementari +${cq.qualityBonus} ${profession} quality`);
        }
      }
    }
  }

  // Half-Elf chosen profession quality bonus
  if (race === 'HALF_ELF' && subRace?.chosenProfession === profession) {
    const bonus = Math.round(HALF_ELF_CHOSEN_BONUS * 20); // +4 on quality roll
    qualityBonus += bonus;
    sources.push(`Half-Elf chosen profession +${bonus} quality`);
  }

  return { qualityBonus, sources };
}

/**
 * Calculate material reduction for crafting (currently only Gnome at level 10+).
 * Returns fractional reduction (0.10 = 10% fewer materials).
 */
export function getRacialMaterialReduction(
  race: Race,
  characterLevel: number,
): MaterialReductionResult {
  const profile = RACIAL_BONUS_MAP[race];
  if (!profile.materialReduction) {
    return { reduction: 0, sources: [] };
  }

  if (characterLevel < profile.materialReduction.levelRequired) {
    return { reduction: 0, sources: [] };
  }

  return {
    reduction: profile.materialReduction.reduction,
    sources: [`${race} Efficient Engineering: ${Math.round(profile.materialReduction.reduction * 100)}% material reduction`],
  };
}

/**
 * Returns the maximum number of active profession slots for a character.
 * Default is 3. Humans gain a 4th slot at level 15.
 */
export function getMaxProfessionSlots(
  race: Race,
  characterLevel: number,
): number {
  const profile = RACIAL_BONUS_MAP[race];
  const base = 3;

  if (profile.extraProfessionSlot && characterLevel >= profile.extraProfessionSlot.levelRequired) {
    return base + 1;
  }

  return base;
}

/**
 * Get a summary of ALL racial profession bonuses for a given race.
 * Used for the info API endpoint.
 */
export function getAllRacialProfessionBonuses(race: Race): {
  gathering: GatheringBonusDef[];
  craftSpeed: CraftSpeedDef[];
  craftQuality: CraftQualityDef[];
  penalties: PenaltyDef[];
  materialReduction: { levelRequired: number; reduction: number } | null;
  extraProfessionSlot: { levelRequired: number } | null;
} {
  const profile = RACIAL_BONUS_MAP[race];
  return {
    gathering: profile.gathering,
    craftSpeed: profile.craftSpeed,
    craftQuality: profile.craftQuality,
    penalties: profile.penalties,
    materialReduction: profile.materialReduction ?? null,
    extraProfessionSlot: profile.extraProfessionSlot ?? null,
  };
}
