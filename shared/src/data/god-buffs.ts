export interface GodBuff {
  /** Personal buffs by tier (member-only) */
  personalBuffs: {
    MINORITY: Record<string, number>;
    CHAPTER: Record<string, number>;
    ESTABLISHED: Record<string, number>;
    DOMINANT: Record<string, number>;
  };
  /** Town-wide effects by tier (apply to ALL residents when this god is dominant) */
  townEffects: {
    ESTABLISHED: Record<string, number>;
    DOMINANT: Record<string, number>;
  };
  /** Town metric modifiers by tier */
  metricModifiers: {
    ESTABLISHED: Record<string, number>;
    DOMINANT: Record<string, number>;
  };
  /** Shrine-specific effects */
  shrineEffects: Record<string, number>;
}

export const GOD_BUFFS: Record<string, GodBuff> = {
  aurvandos: {
    personalBuffs: {
      MINORITY: { combatDefensePercent: 0.02 },
      CHAPTER: { combatDefensePercent: 0.04 },
      ESTABLISHED: { combatDefensePercent: 0.06, roadDangerReductionPercent: 0.05 },
      DOMINANT: { combatDefensePercent: 0.08, roadDangerReductionPercent: 0.10 },
    },
    townEffects: {
      ESTABLISHED: { roadDangerReductionPercent: 0.05 },
      DOMINANT: { roadDangerReductionPercent: 0.10 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: { DEFENSES: 5 },
    },
    shrineEffects: { adjacentRouteDangerReductionPercent: 0.25 },
  },
  kethara: {
    personalBuffs: {
      MINORITY: { foodEffectivenessPercent: 0.05 },
      CHAPTER: { foodEffectivenessPercent: 0.10 },
      ESTABLISHED: { foodEffectivenessPercent: 0.15 },
      DOMINANT: { foodEffectivenessPercent: 0.20 },
    },
    townEffects: {
      ESTABLISHED: { foodEffectivenessPercent: 0.05 },
      DOMINANT: { foodEffectivenessPercent: 0.10 },
    },
    metricModifiers: {
      ESTABLISHED: { PUBLIC_HEALTH: 5 },
      DOMINANT: { PUBLIC_HEALTH: 10 },
    },
    shrineEffects: { healingHouse: 1 },
  },
  tyrvex: {
    personalBuffs: {
      MINORITY: { craftingQualityPercent: 0.02 },
      CHAPTER: { craftingQualityPercent: 0.04 },
      ESTABLISHED: { craftingQualityPercent: 0.06 },
      DOMINANT: { craftingQualityPercent: 0.08 },
    },
    townEffects: {
      ESTABLISHED: { craftingQualityPercent: 0.02 },
      DOMINANT: { craftingQualityPercent: 0.04 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: {},
    },
    shrineEffects: { worldEventPrediction: 1 },
  },
  vareth: {
    personalBuffs: {
      MINORITY: { localCraftingYieldPercent: 0.03 },
      CHAPTER: { localCraftingYieldPercent: 0.05 },
      ESTABLISHED: { localCraftingYieldPercent: 0.08 },
      DOMINANT: { localCraftingYieldPercent: 0.10 },
    },
    townEffects: {
      ESTABLISHED: { localCraftingYieldPercent: 0.03 },
      DOMINANT: { localCraftingYieldPercent: 0.05, visitorMarketSurchargePercent: 0.10 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: {},
    },
    shrineEffects: { tariffControl: 1 },
  },
  veradine: {
    personalBuffs: {
      MINORITY: { taxReductionPercent: 0.02 },
      CHAPTER: { taxReductionPercent: 0.04 },
      ESTABLISHED: { taxReductionPercent: 0.06 },
      DOMINANT: { taxReductionPercent: 0.08 },
    },
    townEffects: {
      ESTABLISHED: { taxReductionPercent: 0.03 },
      DOMINANT: { taxReductionPercent: 0.05 },
    },
    metricModifiers: {
      ESTABLISHED: { MARKET_EFFICIENCY: 3 },
      DOMINANT: { MARKET_EFFICIENCY: 5 },
    },
    shrineEffects: { economicPolicyBypass: 1 },
  },
  tessivane: {
    personalBuffs: {
      MINORITY: { marketBonusPercent: 0.03 },
      CHAPTER: { marketBonusPercent: 0.05, priceTrendAccess: 1 },
      ESTABLISHED: { marketBonusPercent: 0.08, priceTrendAccess: 1, crossTownPriceVisibility: 1 },
      DOMINANT: { marketBonusPercent: 0.10, priceTrendAccess: 1, crossTownPriceVisibility: 1 },
    },
    townEffects: {
      ESTABLISHED: { marketBonusPercent: 0.02 },
      DOMINANT: { marketBonusPercent: 0.03 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: {},
    },
    shrineEffects: { blackMarket: 1 },
  },
  valtheris: {
    personalBuffs: {
      MINORITY: { reputationGainPercent: 0.05 },
      CHAPTER: { reputationGainPercent: 0.10, reducedConversionCooldown: 1 },
      ESTABLISHED: { reputationGainPercent: 0.15, foreignTradePercent: 0.05, reducedConversionCooldown: 1 },
      DOMINANT: { reputationGainPercent: 0.20, foreignTradePercent: 0.10, reducedConversionCooldown: 1 },
    },
    townEffects: {
      ESTABLISHED: { reputationGainPercent: 0.05 },
      DOMINANT: { reputationGainPercent: 0.10, foreignTradePercent: 0.05 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: {},
    },
    shrineEffects: { diplomaticSummit: 1 },
  },
  solimene: {
    personalBuffs: {
      MINORITY: { electionIntegrityPercent: 0.05 },
      CHAPTER: { electionIntegrityPercent: 0.10, disputeResolution: 1 },
      ESTABLISHED: { electionIntegrityPercent: 0.15, disputeResolution: 1, fileFormalDispute: 1 },
      DOMINANT: { electionIntegrityPercent: 0.20, disputeResolution: 1, fileFormalDispute: 1 },
    },
    townEffects: {
      ESTABLISHED: { electionIntegrityPercent: 0.05 },
      DOMINANT: { electionIntegrityPercent: 0.10 },
    },
    metricModifiers: {
      ESTABLISHED: { ELECTION_INTEGRITY: 5 },
      DOMINANT: { ELECTION_INTEGRITY: 10 },
    },
    shrineEffects: { bindingReferendum: 1 },
  },
};

/** Get a character's personal religion buffs based on their god and chapter tier */
export function getPersonalReligionBuffs(godId: string | null, chapterTier: string): Record<string, number> {
  if (!godId || !GOD_BUFFS[godId]) return {};
  const godBuff = GOD_BUFFS[godId];
  return godBuff.personalBuffs[chapterTier as keyof typeof godBuff.personalBuffs] ?? {};
}

/** Get town-wide effects from the dominant church */
export function getDominantChurchTownEffects(godId: string, tier: string): Record<string, number> {
  if (!GOD_BUFFS[godId]) return {};
  const godBuff = GOD_BUFFS[godId];
  return godBuff.townEffects[tier as keyof typeof godBuff.townEffects] ?? {};
}

/** Human-readable buff labels for UI display */
export const BUFF_LABELS: Record<string, string> = {
  combatDefensePercent: 'Combat Defense',
  roadDangerReductionPercent: 'Road Danger Reduction',
  foodEffectivenessPercent: 'Food Effectiveness',
  craftingQualityPercent: 'Crafting Quality',
  localCraftingYieldPercent: 'Local Crafting Yield',
  visitorMarketSurchargePercent: 'Visitor Market Surcharge',
  taxReductionPercent: 'Tax Reduction',
  marketBonusPercent: 'Market Bonus',
  priceTrendAccess: 'Price Trends',
  crossTownPriceVisibility: 'Cross-Town Prices',
  reputationGainPercent: 'Reputation Gains',
  foreignTradePercent: 'Foreign Trade Bonus',
  reducedConversionCooldown: 'Reduced Conversion Cooldown',
  electionIntegrityPercent: 'Election Integrity',
  disputeResolution: 'Dispute Resolution',
  fileFormalDispute: 'Formal Disputes',
};
