import { ProfessionType } from '../professions/types';

// ---------------------------------------------------------------------------
// Tool tier definitions
// ---------------------------------------------------------------------------

export type ToolTier = 'CRUDE' | 'COPPER' | 'IRON' | 'STEEL' | 'MITHRIL' | 'ADAMANTINE';

export interface ToolTierStats {
  tier: ToolTier;
  speedBonus: number;   // fractional: 0.10 = 10%
  yieldBonus: number;   // fractional: 0.05 = 5%
  durability: number;   // max uses before breaking
  rarity: 'POOR' | 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK' | 'LEGENDARY';
}

export const TOOL_TIERS: ToolTierStats[] = [
  { tier: 'CRUDE',       speedBonus: 0.00, yieldBonus: 0.00, durability:  20, rarity: 'POOR' },
  { tier: 'COPPER',      speedBonus: 0.10, yieldBonus: 0.05, durability:  40, rarity: 'COMMON' },
  { tier: 'IRON',        speedBonus: 0.20, yieldBonus: 0.10, durability:  60, rarity: 'FINE' },
  { tier: 'STEEL',       speedBonus: 0.30, yieldBonus: 0.15, durability:  80, rarity: 'SUPERIOR' },
  { tier: 'MITHRIL',     speedBonus: 0.40, yieldBonus: 0.20, durability: 120, rarity: 'MASTERWORK' },
  { tier: 'ADAMANTINE',  speedBonus: 0.50, yieldBonus: 0.25, durability: 200, rarity: 'LEGENDARY' },
];

// ---------------------------------------------------------------------------
// Tool type definitions (one per gathering profession)
// ---------------------------------------------------------------------------

export interface ToolTypeDefinition {
  toolType: string;          // e.g. "Pickaxe"
  professionType: ProfessionType;
  description: string;
}

export const TOOL_TYPES: ToolTypeDefinition[] = [
  { toolType: 'Pickaxe',        professionType: 'MINER',      description: 'Used for mining ore and stone.' },
  { toolType: 'Axe',            professionType: 'LUMBERJACK',  description: 'Used for felling trees and splitting wood.' },
  { toolType: 'Hoe',            professionType: 'FARMER',      description: 'Used for tilling soil and harvesting crops.' },
  { toolType: 'Fishing Rod',    professionType: 'FISHERMAN',   description: 'Used for catching fish and shellfish.' },
  { toolType: 'Sickle',         professionType: 'HERBALIST',   description: 'Used for harvesting herbs and reagents.' },
  { toolType: 'Skinning Knife', professionType: 'HUNTER',      description: 'Used for skinning hides and harvesting game.' },
];

// ---------------------------------------------------------------------------
// Full tool template definitions (6 types x 6 tiers = 36 templates)
// ---------------------------------------------------------------------------

export interface ToolTemplate {
  name: string;              // e.g. "Crude Pickaxe"
  toolType: string;          // e.g. "Pickaxe"
  tier: ToolTier;
  professionType: ProfessionType;
  speedBonus: number;
  yieldBonus: number;
  durability: number;
  rarity: string;
  description: string;
}

function tierLabel(tier: ToolTier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export const TOOL_TEMPLATES: ToolTemplate[] = TOOL_TYPES.flatMap((toolDef) =>
  TOOL_TIERS.map((tierDef): ToolTemplate => ({
    name: `${tierLabel(tierDef.tier)} ${toolDef.toolType}`,
    toolType: toolDef.toolType,
    tier: tierDef.tier,
    professionType: toolDef.professionType,
    speedBonus: tierDef.speedBonus,
    yieldBonus: tierDef.yieldBonus,
    durability: tierDef.durability,
    rarity: tierDef.rarity,
    description: `${tierLabel(tierDef.tier)} quality ${toolDef.toolType.toLowerCase()}. ${toolDef.description}`,
  })),
);

// ---------------------------------------------------------------------------
// Bare-hands penalty applied when no tool is equipped
// ---------------------------------------------------------------------------

export const BARE_HANDS_SPEED_PENALTY = 0.25;   // 25% slower
export const BARE_HANDS_YIELD_PENALTY = 0.25;   // 25% less yield

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getToolTypeForProfession(professionType: ProfessionType): ToolTypeDefinition | undefined {
  return TOOL_TYPES.find((t) => t.professionType === professionType);
}

export function getToolTier(tier: ToolTier): ToolTierStats | undefined {
  return TOOL_TIERS.find((t) => t.tier === tier);
}
