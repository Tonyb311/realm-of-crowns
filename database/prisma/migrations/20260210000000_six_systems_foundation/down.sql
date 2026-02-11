-- Rollback: 20260210000000_six_systems_foundation
-- WARNING: This is a large migration. Dropping all six-systems tables and columns.

-- Drop foreign keys on new tables
ALTER TABLE "service_reputations" DROP CONSTRAINT IF EXISTS "service_reputations_character_id_fkey";
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_borrower_id_fkey";
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_banker_id_fkey";
ALTER TABLE "service_actions" DROP CONSTRAINT IF EXISTS "service_actions_client_id_fkey";
ALTER TABLE "service_actions" DROP CONSTRAINT IF EXISTS "service_actions_provider_id_fkey";
ALTER TABLE "daily_reports" DROP CONSTRAINT IF EXISTS "daily_reports_character_id_fkey";
ALTER TABLE "daily_actions" DROP CONSTRAINT IF EXISTS "daily_actions_character_id_fkey";
ALTER TABLE "node_connections" DROP CONSTRAINT IF EXISTS "node_connections_to_node_id_fkey";
ALTER TABLE "node_connections" DROP CONSTRAINT IF EXISTS "node_connections_from_node_id_fkey";
ALTER TABLE "nodes" DROP CONSTRAINT IF EXISTS "nodes_town_id_fkey";
ALTER TABLE "nodes" DROP CONSTRAINT IF EXISTS "nodes_region_id_fkey";
ALTER TABLE "nodes" DROP CONSTRAINT IF EXISTS "nodes_route_id_fkey";
ALTER TABLE "petition_signatures" DROP CONSTRAINT IF EXISTS "petition_signatures_character_id_fkey";
ALTER TABLE "petition_signatures" DROP CONSTRAINT IF EXISTS "petition_signatures_petition_id_fkey";
ALTER TABLE "petitions" DROP CONSTRAINT IF EXISTS "petitions_creator_id_fkey";
ALTER TABLE "treaties" DROP CONSTRAINT IF EXISTS "treaties_proposed_by_id_fkey";
ALTER TABLE "treaties" DROP CONSTRAINT IF EXISTS "treaties_receiver_kingdom_id_fkey";
ALTER TABLE "treaties" DROP CONSTRAINT IF EXISTS "treaties_proposer_kingdom_id_fkey";
ALTER TABLE "travel_actions" DROP CONSTRAINT IF EXISTS "travel_actions_to_node_id_fkey";
ALTER TABLE "travel_actions" DROP CONSTRAINT IF EXISTS "travel_actions_from_node_id_fkey";
ALTER TABLE "characters" DROP CONSTRAINT IF EXISTS "characters_current_node_id_fkey";
ALTER TABLE "characters" DROP CONSTRAINT IF EXISTS "characters_preferred_food_id_fkey";

-- Drop new tables
DROP TABLE IF EXISTS "service_reputations" CASCADE;
DROP TABLE IF EXISTS "loans" CASCADE;
DROP TABLE IF EXISTS "service_actions" CASCADE;
DROP TABLE IF EXISTS "daily_reports" CASCADE;
DROP TABLE IF EXISTS "daily_actions" CASCADE;
DROP TABLE IF EXISTS "node_connections" CASCADE;
DROP TABLE IF EXISTS "nodes" CASCADE;
DROP TABLE IF EXISTS "petition_signatures" CASCADE;
DROP TABLE IF EXISTS "petitions" CASCADE;
DROP TABLE IF EXISTS "world_events" CASCADE;
DROP TABLE IF EXISTS "treaties" CASCADE;

-- Remove added columns from characters
ALTER TABLE "characters" DROP COLUMN IF EXISTS "ability_priority_queue";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "combat_stance";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "current_node_id";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "days_since_last_meal";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "food_priority";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "hunger_state";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "item_usage_rules";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "never_retreat";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "preferred_food_id";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "pvp_loot_behavior";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "retreat_hp_threshold";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "retreat_opposition_ratio";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "retreat_round_limit";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "soul_fade_stage";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "structural_decay_stage";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "well_rested";

-- Remove added columns from combat_sessions
ALTER TABLE "combat_sessions" DROP COLUMN IF EXISTS "attacker_params";
ALTER TABLE "combat_sessions" DROP COLUMN IF EXISTS "defender_params";

-- Restore dropped columns on crafting_actions
ALTER TABLE "crafting_actions" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "crafting_actions" ADD COLUMN IF NOT EXISTS "completes_at" TIMESTAMP(3);
ALTER TABLE "crafting_actions" DROP COLUMN IF EXISTS "tick_date";

-- Remove added columns from exclusive_zones
ALTER TABLE "exclusive_zones" DROP COLUMN IF EXISTS "available_resources";
ALTER TABLE "exclusive_zones" DROP COLUMN IF EXISTS "danger_level";
ALTER TABLE "exclusive_zones" DROP COLUMN IF EXISTS "entry_requirements";
ALTER TABLE "exclusive_zones" DROP COLUMN IF EXISTS "owning_race";
ALTER TABLE "exclusive_zones" DROP COLUMN IF EXISTS "required_level";
ALTER TABLE "exclusive_zones" DROP COLUMN IF EXISTS "special_mechanics";
ALTER TABLE "exclusive_zones" DROP COLUMN IF EXISTS "zone_type";

-- Restore dropped columns on gathering_actions
ALTER TABLE "gathering_actions" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "gathering_actions" ADD COLUMN IF NOT EXISTS "completes_at" TIMESTAMP(3);
ALTER TABLE "gathering_actions" DROP COLUMN IF EXISTS "tick_date";

-- Remove added columns from item_templates
ALTER TABLE "item_templates" DROP COLUMN IF EXISTS "food_buff";
ALTER TABLE "item_templates" DROP COLUMN IF EXISTS "is_beverage";
ALTER TABLE "item_templates" DROP COLUMN IF EXISTS "is_food";
ALTER TABLE "item_templates" DROP COLUMN IF EXISTS "is_perishable";
ALTER TABLE "item_templates" DROP COLUMN IF EXISTS "shelf_life_days";

-- Remove added column from items
ALTER TABLE "items" DROP COLUMN IF EXISTS "days_remaining";

-- Restore dropped columns on travel_actions
ALTER TABLE "travel_actions" ADD COLUMN IF NOT EXISTS "completes_at" TIMESTAMP(3);
ALTER TABLE "travel_actions" DROP COLUMN IF EXISTS "from_node_id";
ALTER TABLE "travel_actions" DROP COLUMN IF EXISTS "tick_date";
ALTER TABLE "travel_actions" DROP COLUMN IF EXISTS "to_node_id";

-- Remove added columns from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "active_character_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_switch_day";

-- Remove added columns from wars
ALTER TABLE "wars" DROP COLUMN IF EXISTS "attacker_score";
ALTER TABLE "wars" DROP COLUMN IF EXISTS "defender_score";
ALTER TABLE "wars" DROP COLUMN IF EXISTS "reason";

-- Drop new enums
DROP TYPE IF EXISTS "PetitionStatus" CASCADE;
DROP TYPE IF EXISTS "TreatyStatus" CASCADE;
DROP TYPE IF EXISTS "TreatyType" CASCADE;
DROP TYPE IF EXISTS "LoanStatus" CASCADE;
DROP TYPE IF EXISTS "FoodPriority" CASCADE;
DROP TYPE IF EXISTS "CombatStance" CASCADE;
DROP TYPE IF EXISTS "HungerState" CASCADE;
DROP TYPE IF EXISTS "DailyActionStatus" CASCADE;
DROP TYPE IF EXISTS "DailyActionType" CASCADE;
DROP TYPE IF EXISTS "NodeType" CASCADE;
