/**
 * Trade policy configuration — secular tariff, market rules, town laws.
 * Used by both server and client.
 */

export const TRADE_POLICY_CONFIG = {
  maxSecularTariff: 0.15,       // 15% max
  minSecularTariff: 0,          // 0% = no tariff
  minListingPrice: 1,           // absolute floor: 1g
  maxListingQuantityLimit: 999, // max cap a mayor can set
  defaultMinListingPrice: 0,    // no minimum by default
  defaultMaxListingQuantity: 0, // 0 = no limit
  maxActiveTownLaws: 10,        // max active town laws per town
} as const;

export const TOWN_LAW_TYPES = ['ECONOMIC', 'SOCIAL', 'BUILDING', 'GENERAL'] as const;
export type TownLawType = typeof TOWN_LAW_TYPES[number];
