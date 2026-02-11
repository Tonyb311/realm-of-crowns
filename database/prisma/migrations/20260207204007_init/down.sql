-- Rollback: 20260207204007_init
-- WARNING: This drops the ENTIRE schema. Only use for a full database reset.
-- This is not safe for production use; prefer pg_dump backups.

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS "combat_logs" CASCADE;
DROP TABLE IF EXISTS "combat_sessions" CASCADE;
DROP TABLE IF EXISTS "market_listings" CASCADE;
DROP TABLE IF EXISTS "trade_transactions" CASCADE;
DROP TABLE IF EXISTS "quest_progress" CASCADE;
DROP TABLE IF EXISTS "quests" CASCADE;
DROP TABLE IF EXISTS "guild_members" CASCADE;
DROP TABLE IF EXISTS "guild_donations" CASCADE;
DROP TABLE IF EXISTS "guilds" CASCADE;
DROP TABLE IF EXISTS "election_votes" CASCADE;
DROP TABLE IF EXISTS "elections" CASCADE;
DROP TABLE IF EXISTS "laws" CASCADE;
DROP TABLE IF EXISTS "wars" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "inventories" CASCADE;
DROP TABLE IF EXISTS "items" CASCADE;
DROP TABLE IF EXISTS "item_templates" CASCADE;
DROP TABLE IF EXISTS "gathering_actions" CASCADE;
DROP TABLE IF EXISTS "crafting_actions" CASCADE;
DROP TABLE IF EXISTS "travel_actions" CASCADE;
DROP TABLE IF EXISTS "travel_routes" CASCADE;
DROP TABLE IF EXISTS "exclusive_zones" CASCADE;
DROP TABLE IF EXISTS "player_professions" CASCADE;
DROP TABLE IF EXISTS "racial_relations" CASCADE;
DROP TABLE IF EXISTS "forgeborn_maintenance" CASCADE;
DROP TABLE IF EXISTS "buildings" CASCADE;
DROP TABLE IF EXISTS "characters" CASCADE;
DROP TABLE IF EXISTS "regions" CASCADE;
DROP TABLE IF EXISTS "towns" CASCADE;
DROP TABLE IF EXISTS "kingdoms" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS "CombatType" CASCADE;
DROP TYPE IF EXISTS "ProfessionType" CASCADE;
DROP TYPE IF EXISTS "Race" CASCADE;
DROP TYPE IF EXISTS "RaceTier" CASCADE;
DROP TYPE IF EXISTS "DragonBloodline" CASCADE;
DROP TYPE IF EXISTS "BeastfolkClan" CASCADE;
DROP TYPE IF EXISTS "GenasiElement" CASCADE;
