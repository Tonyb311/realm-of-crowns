-- Rollback: 20260210200100_add_missing_indexes

DROP INDEX IF EXISTS "trade_transactions_seller_id_created_at_idx";
DROP INDEX IF EXISTS "trade_transactions_buyer_id_created_at_idx";
DROP INDEX IF EXISTS "notifications_character_id_read_created_at_idx";
DROP INDEX IF EXISTS "combat_logs_actor_id_idx";
