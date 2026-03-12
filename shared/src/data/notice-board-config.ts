export const NOTICE_BOARD_CONFIG = {
  maxTitleLength: 100,
  maxBodyLength: 500,
  minDurationDays: 1,
  maxDurationDays: 7,
  maxActivePostsPerPlayer: 5, // per town
  costs: {
    TRADE_REQUEST: { resident: 0, visitor: 5 },  // per day
    BOUNTY: { resident: 10, visitor: 25 },        // per day (on top of escrow)
  },
  minBountyReward: 10, // minimum escrow amount
} as const;

export type NoticeBoardPostType = 'TRADE_REQUEST' | 'BOUNTY';
export type TradeDirection = 'BUYING' | 'SELLING';
export type BountyStatus = 'OPEN' | 'CLAIMED' | 'COMPLETED' | 'EXPIRED' | 'REFUNDED';

export function calculatePostingFee(
  type: NoticeBoardPostType,
  isResident: boolean,
  durationDays: number,
): number {
  const baseCost = NOTICE_BOARD_CONFIG.costs[type][isResident ? 'resident' : 'visitor'];
  return baseCost * durationDays;
}
