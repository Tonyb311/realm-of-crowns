export const TREATY_TYPES = {
  TRADE_AGREEMENT: {
    name: 'Trade Agreement',
    description: 'Reduce tariffs between partner towns',
    hasTerms: true,
  },
  SHARED_MARKET: {
    name: 'Shared Market Access',
    description: "Partner town residents treated as local in each other's markets",
    hasTerms: false,
  },
  MUTUAL_DEFENSE: {
    name: 'Mutual Defense',
    description: 'Share road patrol benefits and sheriff warrant enforcement',
    hasTerms: false,
  },
  CULTURAL_EXCHANGE: {
    name: 'Cultural Exchange',
    description: '+25% racial reputation gains between partner town residents',
    hasTerms: false,
  },
  RESOURCE_SHARING: {
    name: 'Resource Sharing',
    description: 'Daily gold transfer between town treasuries',
    hasTerms: true,
  },
} as const;

export type TownTreatyType = keyof typeof TREATY_TYPES;

export const TOWN_TREATY_STATUSES = [
  'PROPOSED', 'ACCEPTED', 'PENDING_RATIFICATION', 'ACTIVE',
  'CANCELLING', 'CANCELLED', 'EXPIRED', 'REJECTED',
] as const;

export type TownTreatyStatus = (typeof TOWN_TREATY_STATUSES)[number];

export const MAX_ACTIVE_TREATIES = 3;
export const RATIFICATION_DAYS = 3;
export const CANCEL_NOTICE_DAYS = 7;
export const RENEWAL_WINDOW_DAYS = 7;
export const DEFAULT_TREATY_DURATION = 30;
export const MIN_TREATY_DURATION = 15;
export const MAX_TREATY_DURATION = 60;
export const MIN_TARIFF_REDUCTION = 0.1;
export const MAX_TARIFF_REDUCTION = 1.0;
export const MIN_RESOURCE_SHARING_GOLD = 5;
export const MAX_RESOURCE_SHARING_GOLD = 500;
export const CULTURAL_EXCHANGE_BONUS = 0.25;
