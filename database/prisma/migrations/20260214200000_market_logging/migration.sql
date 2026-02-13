-- AlterTable: Add market activity logging fields to trade_transactions
ALTER TABLE "trade_transactions" ADD COLUMN "num_bidders" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "trade_transactions" ADD COLUMN "contested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trade_transactions" ADD COLUMN "all_bidders" JSONB;

-- AlterTable: Add market activity logging fields to auction_cycles
ALTER TABLE "auction_cycles" ADD COLUMN "contested_listings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "auction_cycles" ADD COLUMN "merchant_wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "auction_cycles" ADD COLUMN "non_merchant_wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "auction_cycles" ADD COLUMN "total_gold_traded" INTEGER NOT NULL DEFAULT 0;
