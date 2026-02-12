// Shared toast style used across event hooks
export const TOAST_STYLE = {
  background: '#151A2D',
  color: '#E8DCC8',
  border: '1px solid rgba(212, 168, 67, 0.15)',
};

// Rarity colors with border/text/bg classes (used by Crafting, Inventory, etc.)
export const RARITY_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  POOR:       { border: 'border-realm-text-muted/50',   text: 'text-realm-text-muted',     bg: 'bg-realm-text-muted/10' },
  COMMON:     { border: 'border-realm-text-secondary/50', text: 'text-realm-text-secondary', bg: 'bg-realm-text-secondary/10' },
  FINE:       { border: 'border-realm-success/50',  text: 'text-realm-success',  bg: 'bg-realm-success/10' },
  SUPERIOR:   { border: 'border-realm-teal-300/50', text: 'text-realm-teal-300', bg: 'bg-realm-teal-300/10' },
  MASTERWORK: { border: 'border-realm-purple-300/50', text: 'text-realm-purple-300', bg: 'bg-realm-purple-300/10' },
  LEGENDARY:  { border: 'border-realm-gold-300/50',  text: 'text-realm-gold-300',  bg: 'bg-realm-gold-300/10' },
};

export function getRarityStyle(rarity: string) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.COMMON;
}

// Rarity badge color classes (single string per rarity, used by Market)
export const RARITY_BADGE_COLORS: Record<string, string> = {
  POOR: 'text-realm-text-muted bg-realm-text-muted/10 border-realm-text-muted/30',
  COMMON: 'text-realm-text-secondary bg-realm-text-secondary/10 border-realm-text-secondary/30',
  FINE: 'text-realm-success bg-realm-success/10 border-realm-success/30',
  SUPERIOR: 'text-realm-teal-300 bg-realm-teal-300/10 border-realm-teal-300/30',
  MASTERWORK: 'text-realm-purple-300 bg-realm-purple-300/10 border-realm-purple-300/30',
  LEGENDARY: 'text-realm-gold-300 bg-realm-gold-300/10 border-realm-gold-300/30',
};

// Rarity text-only colors (used by Market, Combat)
export const RARITY_TEXT_COLORS: Record<string, string> = {
  POOR: 'text-realm-text-muted',
  COMMON: 'text-realm-text-secondary',
  FINE: 'text-realm-success',
  SUPERIOR: 'text-realm-teal-300',
  MASTERWORK: 'text-realm-purple-300',
  LEGENDARY: 'text-realm-gold-300',
};
