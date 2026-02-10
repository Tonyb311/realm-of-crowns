-- Database MAJOR-06 / P2 #40: Add missing indexes for hottest query paths

-- CombatLog: index on actorId for combat history lookups per character
CREATE INDEX "combat_logs_actor_id_idx" ON "combat_logs"("actor_id");

-- Notification: composite on [characterId, read, createdAt] for "unread notifications, newest first"
CREATE INDEX "notifications_character_id_read_created_at_idx" ON "notifications"("character_id", "read", "created_at");

-- TradeTransaction: composite on [buyerId, createdAt] for buyer trade history
CREATE INDEX "trade_transactions_buyer_id_created_at_idx" ON "trade_transactions"("buyer_id", "created_at");

-- TradeTransaction: composite on [sellerId, createdAt] for seller trade history
CREATE INDEX "trade_transactions_seller_id_created_at_idx" ON "trade_transactions"("seller_id", "created_at");
