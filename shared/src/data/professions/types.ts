export type ProfessionType =
  | 'FARMER' | 'RANCHER' | 'FISHERMAN' | 'LUMBERJACK' | 'MINER' | 'HERBALIST' | 'HUNTER'
  | 'SMELTER' | 'BLACKSMITH' | 'ARMORER' | 'WOODWORKER' | 'TANNER' | 'LEATHERWORKER'
  | 'TAILOR' | 'ALCHEMIST' | 'ENCHANTER' | 'COOK' | 'BREWER' | 'JEWELER' | 'FLETCHER'
  | 'MASON' | 'SCRIBE'
  | 'MERCHANT' | 'INNKEEPER' | 'HEALER' | 'STABLE_MASTER' | 'BANKER' | 'COURIER' | 'MERCENARY_CAPTAIN';

export type ProfessionCategory = 'GATHERING' | 'CRAFTING' | 'SERVICE';

export type ProfessionTierName = 'APPRENTICE' | 'JOURNEYMAN' | 'CRAFTSMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export type PrimaryStat = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface TierDefinition {
  tier: ProfessionTierName;
  levelRange: [number, number];
  title: string;
  perks: string[];
}

export interface XPCurveEntry {
  level: number;
  xpRequired: number;
  cumulativeXp: number;
}

export interface ProfessionDefinition {
  type: ProfessionType;
  name: string;
  category: ProfessionCategory;
  description: string;
  primaryStat: PrimaryStat;
  relatedProfessions: ProfessionType[];
  inputResources: string[];
  outputProducts: string[];
  townTypeAffinity: string[];
  tierUnlocks: Record<ProfessionTierName, string[]>;
  hasSpecializations?: boolean;
  specializations?: Array<{ id: string; name: string; description: string }>;
}
