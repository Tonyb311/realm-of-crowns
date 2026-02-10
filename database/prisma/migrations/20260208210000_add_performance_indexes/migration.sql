-- Performance indexes for high-traffic queries

-- Messages: composite index for channel+town+time queries (replaces channelType+timestamp)
DROP INDEX IF EXISTS "messages_channel_type_timestamp_idx";
CREATE INDEX "messages_channel_type_town_id_timestamp_idx" ON "messages"("channel_type", "town_id", "timestamp");

-- QuestProgress: composite for character+status lookups
CREATE INDEX "quest_progress_character_id_status_idx" ON "quest_progress"("character_id", "status");

-- MarketListing: composite for town+price browsing
CREATE INDEX "market_listings_town_id_price_idx" ON "market_listings"("town_id", "price");

-- Friend: composite for requester+status and recipient+status lookups
CREATE INDEX "friends_requester_id_status_idx" ON "friends"("requester_id", "status");
CREATE INDEX "friends_recipient_id_status_idx" ON "friends"("recipient_id", "status");
