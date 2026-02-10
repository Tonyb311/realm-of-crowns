export interface StatModifiers {
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
}

export interface RacialAbility {
  name: string;
  description: string;
  levelRequired: number;
  type: 'active' | 'passive';
  effectType: string;
  effectValue: any;
  cooldownSeconds?: number;
  duration?: number;
  targetType: 'self' | 'party' | 'enemy' | 'aoe';
}

export interface ProfessionBonus {
  professionType: string;
  speedBonus: number;
  qualityBonus: number;
  yieldBonus: number;
  xpBonus: number;
}

export interface GatheringBonus {
  resourceType: string;
  biome: string;
  bonusPercent: number;
}

export interface SubRaceOption {
  id: string;
  name: string;
  description: string;
  bonusStat?: string;
  bonusValue?: number;
  specialPerk?: string;
  element?: string;
  resistance?: string;
}

export interface RaceDefinition {
  id: string;
  name: string;
  tier: 'core' | 'common' | 'exotic';
  lore: string;
  trait: { name: string; description: string };
  statModifiers: StatModifiers;
  abilities: RacialAbility[];
  professionBonuses: ProfessionBonus[];
  gatheringBonuses?: GatheringBonus[];
  subRaces?: SubRaceOption[];
  homelandRegion: string;
  startingTowns: string[];
  specialMechanics?: Record<string, any>;
  exclusiveZone?: string;
}
