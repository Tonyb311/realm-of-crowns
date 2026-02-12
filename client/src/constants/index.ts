// Shared toast style used across event hooks
export const TOAST_STYLE = {
  background: '#151A2D',
  color: '#E8DCC8',
  border: '1px solid rgba(212, 168, 67, 0.15)',
};

// Rarity colors with border/text/bg classes (used by Crafting, Inventory, etc.)
export const RARITY_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  POOR:       { border: 'border-gray-500',   text: 'text-gray-400',   bg: 'bg-gray-500/10' },
  COMMON:     { border: 'border-parchment-300', text: 'text-parchment-300', bg: 'bg-parchment-300/10' },
  FINE:       { border: 'border-green-500',  text: 'text-green-400',  bg: 'bg-green-500/10' },
  SUPERIOR:   { border: 'border-blue-500',   text: 'text-blue-400',   bg: 'bg-blue-500/10' },
  MASTERWORK: { border: 'border-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  LEGENDARY:  { border: 'border-amber-400',  text: 'text-amber-400',  bg: 'bg-amber-400/10' },
};

export function getRarityStyle(rarity: string) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.COMMON;
}

// Rarity badge color classes (single string per rarity, used by Market)
export const RARITY_BADGE_COLORS: Record<string, string> = {
  POOR: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
  COMMON: 'text-parchment-200 bg-parchment-200/10 border-parchment-200/30',
  FINE: 'text-green-400 bg-green-400/10 border-green-400/30',
  SUPERIOR: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  MASTERWORK: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  LEGENDARY: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
};

// Rarity text-only colors (used by Market, Combat)
export const RARITY_TEXT_COLORS: Record<string, string> = {
  POOR: 'text-gray-400',
  COMMON: 'text-parchment-200',
  FINE: 'text-green-400',
  SUPERIOR: 'text-blue-400',
  MASTERWORK: 'text-purple-400',
  LEGENDARY: 'text-amber-400',
};
