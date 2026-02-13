// ---------------------------------------------------------------------------
// Market System Constants — Batch Auction with Competitive Bidding
// ---------------------------------------------------------------------------

// ---- Cycle timing ----
export const MARKET_CYCLE_DURATION_MS = 15 * 60 * 1000; // 15 minutes per town cycle

// ---- Fee rates ----
export const STANDARD_FEE_RATE = 0.10;  // 10% for non-merchants
export const MERCHANT_FEE_RATE = 0.05;  // 5% for Merchant profession

// ---- Auction bonuses ----
export const MERCHANT_PRIORITY_BONUS = 5;
export const MERCHANT_ROLL_BONUS = 5;

// ---- Listing config ----
export const LISTING_DURATION_DAYS = 7;
export const LISTING_EXPIRY_MS = LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000;

// ---- Priority tie threshold ----
// Orders within this range of each other go to a haggling roll
export const PRIORITY_TIE_THRESHOLD = 2;

// ---- Future features (defined but not yet active) ----
export const MERCHANT_CROSS_TOWN_ENABLED = false;
export const MERCHANT_BULK_ORDER_ENABLED = false;

// ---- Helper functions ----

/**
 * Check if a character can view price history (Merchant profession perk).
 * Future: also check Merchant's Guild membership.
 */
export function canViewPriceHistory(professions: string[]): boolean {
  return professions.includes('MERCHANT');
  // Future: || guildType === 'MERCHANT_GUILD'
}

/**
 * Get the market fee rate for a character based on their professions.
 */
export function getMarketFeeRate(professions: string[]): number {
  return professions.includes('MERCHANT') ? MERCHANT_FEE_RATE : STANDARD_FEE_RATE;
}

/**
 * Check if a character has the Merchant profession (for bid visibility, bonuses).
 */
export function isMerchant(professions: string[]): boolean {
  return professions.includes('MERCHANT');
}

/**
 * Calculate net proceeds from a sale after fees.
 */
export function calculateNetProceeds(
  salePrice: number,
  feeRate: number,
): { fee: number; net: number } {
  const fee = Math.floor(salePrice * feeRate);
  return { fee, net: salePrice - fee };
}

/**
 * Calculate priority score for a buy order.
 * bidRatio = bidPrice / askingPrice (normalized so higher bids > lower bids)
 * charismaModifier = (CHA - 10) / 2 (D&D 5e style)
 */
export function calculatePriorityScore(
  bidPrice: number,
  askingPrice: number,
  charismaModifier: number,
  professions: string[],
  itemBonuses: number = 0,
  skillBonuses: number = 0,
): number {
  const bidRatio = (bidPrice / Math.max(askingPrice, 1)) * 10;
  const merchantBonus = isMerchant(professions) ? MERCHANT_PRIORITY_BONUS : 0;
  return bidRatio + charismaModifier + merchantBonus + itemBonuses + skillBonuses;
}

/**
 * Calculate a haggling roll for contested auctions.
 * d20 + CHA modifier + merchant bonus
 */
export function calculateHagglingRoll(
  d20: number,
  charismaModifier: number,
  professions: string[],
  itemBonuses: number = 0,
): { total: number; breakdown: { raw: number; modifiers: Array<{ source: string; value: number }>; total: number } } {
  const merchantBonus = isMerchant(professions) ? MERCHANT_ROLL_BONUS : 0;
  const modifiers: Array<{ source: string; value: number }> = [];

  if (charismaModifier !== 0) modifiers.push({ source: 'CHA', value: charismaModifier });
  if (merchantBonus > 0) modifiers.push({ source: 'Merchant', value: merchantBonus });
  if (itemBonuses !== 0) modifiers.push({ source: 'Items', value: itemBonuses });

  const total = d20 + charismaModifier + merchantBonus + itemBonuses;

  return {
    total,
    breakdown: { raw: d20, modifiers, total },
  };
}

/**
 * D&D-style ability modifier: (score - 10) / 2, floored
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
