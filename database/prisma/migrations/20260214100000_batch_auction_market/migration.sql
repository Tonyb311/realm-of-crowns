-- AlterTable: Add escrowedGold to characters
ALTER TABLE "characters" ADD COLUMN "escrowed_gold" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add batch auction fields to market_listings
ALTER TABLE "market_listings" ADD COLUMN "item_template_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "market_listings" ADD COLUMN "item_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "market_listings" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "market_listings" ADD COLUMN "auction_cycle_id" TEXT;
ALTER TABLE "market_listings" ADD COLUMN "sold_at" TIMESTAMP(3);
ALTER TABLE "market_listings" ADD COLUMN "sold_to" TEXT;
ALTER TABLE "market_listings" ADD COLUMN "sold_price" INTEGER;

-- CreateIndex: MarketListing status+townId
CREATE INDEX "market_listings_status_town_id_idx" ON "market_listings"("status", "town_id");

-- AlterTable: Add fee fields to trade_transactions
ALTER TABLE "trade_transactions" ADD COLUMN "seller_fee" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "trade_transactions" ADD COLUMN "seller_net" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "trade_transactions" ADD COLUMN "auction_cycle_id" TEXT;

-- CreateIndex: TradeTransaction auctionCycleId
CREATE INDEX "trade_transactions_auction_cycle_id_idx" ON "trade_transactions"("auction_cycle_id");

-- CreateTable: auction_cycles
CREATE TABLE "auction_cycles" (
    "id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "cycle_number" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "orders_processed" INTEGER NOT NULL DEFAULT 0,
    "transactions_completed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "auction_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: AuctionCycle townId+status
CREATE INDEX "auction_cycles_town_id_status_idx" ON "auction_cycles"("town_id", "status");

-- CreateTable: market_buy_orders
CREATE TABLE "market_buy_orders" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "bid_price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority_score" DOUBLE PRECISION,
    "roll_result" INTEGER,
    "roll_breakdown" JSONB,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "auction_cycle_id" TEXT,

    CONSTRAINT "market_buy_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: MarketBuyOrder unique buyer+listing
CREATE UNIQUE INDEX "market_buy_orders_buyer_id_listing_id_key" ON "market_buy_orders"("buyer_id", "listing_id");

-- CreateIndex: MarketBuyOrder listingId
CREATE INDEX "market_buy_orders_listing_id_idx" ON "market_buy_orders"("listing_id");

-- CreateIndex: MarketBuyOrder buyerId
CREATE INDEX "market_buy_orders_buyer_id_idx" ON "market_buy_orders"("buyer_id");

-- CreateIndex: MarketBuyOrder status
CREATE INDEX "market_buy_orders_status_idx" ON "market_buy_orders"("status");

-- AddForeignKey: auction_cycles -> towns
ALTER TABLE "auction_cycles" ADD CONSTRAINT "auction_cycles_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: market_listings -> auction_cycles
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_auction_cycle_id_fkey" FOREIGN KEY ("auction_cycle_id") REFERENCES "auction_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: market_buy_orders -> characters
ALTER TABLE "market_buy_orders" ADD CONSTRAINT "market_buy_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: market_buy_orders -> market_listings
ALTER TABLE "market_buy_orders" ADD CONSTRAINT "market_buy_orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: market_buy_orders -> auction_cycles
ALTER TABLE "market_buy_orders" ADD CONSTRAINT "market_buy_orders_auction_cycle_id_fkey" FOREIGN KEY ("auction_cycle_id") REFERENCES "auction_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: trade_transactions -> auction_cycles
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_auction_cycle_id_fkey" FOREIGN KEY ("auction_cycle_id") REFERENCES "auction_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
