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
  domakhar: {
    personalBuffs: {
      MINORITY: { lawEnforcementPercent: 0.03 },
      CHAPTER: { lawEnforcementPercent: 0.05, townGuardBonus: 1 },
      ESTABLISHED: { lawEnforcementPercent: 0.08, townGuardBonus: 1 },
      DOMINANT: { lawEnforcementPercent: 0.10, townGuardBonus: 1 },
    },
    townEffects: {
      ESTABLISHED: { lawEnforcementPercent: 0.03 },
      DOMINANT: { lawEnforcementPercent: 0.05, guardCapabilityPercent: 0.10 },
    },
    metricModifiers: {
      ESTABLISHED: { LAW_ENFORCEMENT: 5 },
      DOMINANT: { LAW_ENFORCEMENT: 10 },
    },
    shrineEffects: { martialLaw: 1 },
  },
  seraphiel: {
    personalBuffs: {
      MINORITY: { historicalRecordsAccess: 1 },
      CHAPTER: { historicalRecordsAccess: 1, bloodMemory: 1 },
      ESTABLISHED: { historicalRecordsAccess: 1, bloodMemory: 1, invokeBloodMemory: 1 },
      DOMINANT: { historicalRecordsAccess: 1, bloodMemory: 1, invokeBloodMemory: 1, grudgeTracking: 1 },
    },
    townEffects: {
      ESTABLISHED: { diplomaticReputationPercent: 0.05 },
      DOMINANT: { diplomaticReputationPercent: 0.10 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: {},
    },
    shrineEffects: { reckoning: 1 },
  },
  xolthira: {
    personalBuffs: {
      MINORITY: { meditation: 1, meditationPositiveChance: 0.50 },
      CHAPTER: { meditation: 1, meditationPositiveChance: 0.70 },
      ESTABLISHED: { meditation: 1, meditationPositiveChance: 0.80, visions: 1 },
      DOMINANT: { meditation: 1, meditationPositiveChance: 0.85, visions: 1, prophecy: 1 },
    },
    townEffects: {
      ESTABLISHED: { rareDropPercent: 0.02 },
      DOMINANT: { rareDropPercent: 0.03 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: {},
    },
    shrineEffects: { communalMeditation: 1 },
  },
  morvaine: {
    personalBuffs: {
      MINORITY: { corruptionDetectionPercent: 0.05 },
      CHAPTER: { corruptionDetectionPercent: 0.10, identifyAnonymous: 1 },
      ESTABLISHED: { corruptionDetectionPercent: 0.15, identifyAnonymous: 1, exposeHidden: 1 },
      DOMINANT: { corruptionDetectionPercent: 0.20, identifyAnonymous: 1, exposeHidden: 1 },
    },
    townEffects: {
      ESTABLISHED: { politicalManipulationReduction: 0.10 },
      DOMINANT: { politicalManipulationReduction: 0.20 },
    },
    metricModifiers: {
      ESTABLISHED: {},
      DOMINANT: {},
    },
    shrineEffects: { crisisOfFaith: 1 },
  },
};

/** Get a character's personal religion buffs based on their god and chapter tier */
export function getPersonalReligionBuffs(godId: string | null, chapterTier: string, crisisMultiplier = 1.0): Record<string, number> {
  if (!godId || !GOD_BUFFS[godId]) return {};
  const godBuff = GOD_BUFFS[godId];
  const raw = godBuff.personalBuffs[chapterTier as keyof typeof godBuff.personalBuffs] ?? {};
  if (crisisMultiplier >= 1.0) return raw;
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    result[key] = val * crisisMultiplier;
  }
  return result;
}

/** Get town-wide effects from the dominant church */
export function getDominantChurchTownEffects(godId: string, tier: string, crisisMultiplier = 1.0): Record<string, number> {
  if (!GOD_BUFFS[godId]) return {};
  const godBuff = GOD_BUFFS[godId];
  const raw = godBuff.townEffects[tier as keyof typeof godBuff.townEffects] ?? {};
  if (crisisMultiplier >= 1.0) return raw;
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    result[key] = val * crisisMultiplier;
  }
  return result;
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
  lawEnforcementPercent: 'Law Enforcement',
  townGuardBonus: 'Town Guard Strength',
  guardCapabilityPercent: 'Guard Capability',
  historicalRecordsAccess: 'Historical Records',
  bloodMemory: 'Blood Memory',
  invokeBloodMemory: 'Invoke Blood Memory',
  grudgeTracking: 'Grudge Tracking',
  diplomaticReputationPercent: 'Diplomatic Reputation',
  meditation: 'Meditation',
  meditationPositiveChance: 'Positive Chance',
  visions: 'Visions',
  prophecy: 'Prophecy',
  rareDropPercent: 'Rare Drop Chance',
  communalMeditation: 'Communal Meditation',
  corruptionDetectionPercent: 'Corruption Detection',
  identifyAnonymous: 'Identify Anonymous',
  exposeHidden: 'Expose Hidden',
  politicalManipulationReduction: 'Anti-Corruption',
  crisisOfFaith: 'Crisis of Faith',
};
