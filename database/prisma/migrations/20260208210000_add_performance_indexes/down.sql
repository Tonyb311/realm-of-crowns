-- Rollback: 20260208210000_add_performance_indexes

DROP INDEX IF EXISTS "friends_recipient_id_status_idx";
DROP INDEX IF EXISTS "friends_requester_id_status_idx";
DROP INDEX IF EXISTS "market_listings_town_id_price_idx";
DROP INDEX IF EXISTS "quest_progress_character_id_status_idx";
DROP INDEX IF EXISTS "messages_channel_type_town_id_timestamp_idx";

-- Restore the original index that was replaced
CREATE INDEX IF NOT EXISTS "messages_channel_type_timestamp_idx" ON "messages"("channel_type", "timestamp");
