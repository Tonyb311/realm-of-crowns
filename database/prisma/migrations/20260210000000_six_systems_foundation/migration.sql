-- Six Systems Foundation Migration
-- Includes: LoanStatus enum, SPAR combat type, SERVICE/COMBAT_PVE/COMBAT_PVP daily actions,
-- ServiceAction, Loan, ServiceReputation models, User active character fields,
-- plus catch-up for any unapplied schema drift.

-- CreateEnum (only if not exists)
DO $$ BEGIN
  CREATE TYPE "NodeType" AS ENUM ('ROAD', 'WILDERNESS', 'MOUNTAIN_PASS', 'RIVER_CROSSING', 'BORDER_CROSSING', 'FOREST_TRAIL', 'SWAMP_PATH', 'UNDERGROUND_TUNNEL', 'COASTAL_PATH', 'TOWN_GATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DailyActionType" AS ENUM ('GATHER', 'CRAFT', 'TRAVEL', 'GUARD', 'AMBUSH', 'ENLIST', 'PROPOSE_LAW', 'REST', 'SERVICE', 'COMBAT_PVE', 'COMBAT_PVP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DailyActionStatus" AS ENUM ('LOCKED_IN', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "HungerState" AS ENUM ('FED', 'HUNGRY', 'STARVING', 'INCAPACITATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CombatStance" AS ENUM ('AGGRESSIVE', 'BALANCED', 'DEFENSIVE', 'EVASIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FoodPriority" AS ENUM ('EXPIRING_FIRST', 'BEST_FIRST', 'SPECIFIC_ITEM', 'CATEGORY_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'REPAID', 'DEFAULTED', 'GARNISHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TreatyType" AS ENUM ('TRADE_AGREEMENT', 'NON_AGGRESSION_PACT', 'ALLIANCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TreatyStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'BROKEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PetitionStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'EXPIRED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum: Add SPAR to CombatType
DO $$ BEGIN
  ALTER TYPE "CombatType" ADD VALUE IF NOT EXISTS 'SPAR';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum: Add new DailyActionType values (if enum existed before without them)
DO $$ BEGIN
  ALTER TYPE "DailyActionType" ADD VALUE IF NOT EXISTS 'SERVICE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "DailyActionType" ADD VALUE IF NOT EXISTS 'COMBAT_PVE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "DailyActionType" ADD VALUE IF NOT EXISTS 'COMBAT_PVP';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: characters - add columns if not exist
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "ability_priority_queue" JSONB;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "combat_stance" "CombatStance" NOT NULL DEFAULT 'BALANCED';
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "current_node_id" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "days_since_last_meal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "food_priority" "FoodPriority" NOT NULL DEFAULT 'EXPIRING_FIRST';
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "hunger_state" "HungerState" NOT NULL DEFAULT 'FED';
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "item_usage_rules" JSONB;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "never_retreat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "preferred_food_id" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "pvp_loot_behavior" TEXT NOT NULL DEFAULT 'GOLD_ONLY';
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "retreat_hp_threshold" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "retreat_opposition_ratio" DOUBLE PRECISION NOT NULL DEFAULT 3.0;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "retreat_round_limit" INTEGER;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "soul_fade_stage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "structural_decay_stage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "well_rested" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: combat_sessions
ALTER TABLE "combat_sessions" ADD COLUMN IF NOT EXISTS "attacker_params" JSONB;
ALTER TABLE "combat_sessions" ADD COLUMN IF NOT EXISTS "defender_params" JSONB;

-- AlterTable: crafting_actions - drop old columns, add tick_date
ALTER TABLE "crafting_actions" DROP COLUMN IF EXISTS "completes_at";
ALTER TABLE "crafting_actions" DROP COLUMN IF EXISTS "started_at";
ALTER TABLE "crafting_actions" ADD COLUMN IF NOT EXISTS "tick_date" TIMESTAMP(3);

-- AlterTable: exclusive_zones
ALTER TABLE "exclusive_zones" ADD COLUMN IF NOT EXISTS "available_resources" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "exclusive_zones" ADD COLUMN IF NOT EXISTS "danger_level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "exclusive_zones" ADD COLUMN IF NOT EXISTS "entry_requirements" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "exclusive_zones" ADD COLUMN IF NOT EXISTS "owning_race" "Race";
ALTER TABLE "exclusive_zones" ADD COLUMN IF NOT EXISTS "required_level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "exclusive_zones" ADD COLUMN IF NOT EXISTS "special_mechanics" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "exclusive_zones" ADD COLUMN IF NOT EXISTS "zone_type" TEXT NOT NULL DEFAULT 'exclusive';

-- AlterTable: forgeborn_maintenance - rename constraint if needed
DO $$ BEGIN
  ALTER TABLE "forgeborn_maintenance" RENAME CONSTRAINT "warforged_maintenance_pkey" TO "forgeborn_maintenance_pkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- AlterTable: gathering_actions
ALTER TABLE "gathering_actions" DROP COLUMN IF EXISTS "completes_at";
ALTER TABLE "gathering_actions" DROP COLUMN IF EXISTS "started_at";
ALTER TABLE "gathering_actions" ADD COLUMN IF NOT EXISTS "tick_date" TIMESTAMP(3);

-- AlterTable: item_templates
ALTER TABLE "item_templates" ADD COLUMN IF NOT EXISTS "food_buff" JSONB;
ALTER TABLE "item_templates" ADD COLUMN IF NOT EXISTS "is_beverage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "item_templates" ADD COLUMN IF NOT EXISTS "is_food" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "item_templates" ADD COLUMN IF NOT EXISTS "is_perishable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "item_templates" ADD COLUMN IF NOT EXISTS "shelf_life_days" INTEGER;

-- AlterTable: items
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "days_remaining" INTEGER;

-- AlterTable: travel_actions
ALTER TABLE "travel_actions" DROP COLUMN IF EXISTS "completes_at";
ALTER TABLE "travel_actions" ADD COLUMN IF NOT EXISTS "from_node_id" TEXT;
ALTER TABLE "travel_actions" ADD COLUMN IF NOT EXISTS "tick_date" TIMESTAMP(3);
ALTER TABLE "travel_actions" ADD COLUMN IF NOT EXISTS "to_node_id" TEXT;

-- AlterTable: users - six-systems fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_character_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_switch_day" INTEGER;

-- AlterTable: wars
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "attacker_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "defender_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "reason" TEXT;

-- CreateTable: treaties
CREATE TABLE IF NOT EXISTS "treaties" (
    "id" TEXT NOT NULL,
    "type" "TreatyType" NOT NULL,
    "proposer_kingdom_id" TEXT NOT NULL,
    "receiver_kingdom_id" TEXT NOT NULL,
    "proposed_by_id" TEXT NOT NULL,
    "status" "TreatyStatus" NOT NULL DEFAULT 'PENDING',
    "gold_cost" INTEGER NOT NULL DEFAULT 0,
    "required_days" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "treaties_pkey" PRIMARY KEY ("id")
);

-- CreateTable: world_events
CREATE TABLE IF NOT EXISTS "world_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "world_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: petitions
CREATE TABLE IF NOT EXISTS "petitions" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "petition_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_data" JSONB NOT NULL DEFAULT '{}',
    "status" "PetitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "signature_goal" INTEGER NOT NULL DEFAULT 10,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "petitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: petition_signatures
CREATE TABLE IF NOT EXISTS "petition_signatures" (
    "id" TEXT NOT NULL,
    "petition_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "petition_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable: nodes
CREATE TABLE IF NOT EXISTS "nodes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "route_id" TEXT,
    "position" INTEGER NOT NULL,
    "type" "NodeType" NOT NULL,
    "region_id" TEXT,
    "danger_level" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "description" TEXT NOT NULL DEFAULT '',
    "town_id" TEXT,
    "encounter_chance" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: node_connections
CREATE TABLE IF NOT EXISTS "node_connections" (
    "id" TEXT NOT NULL,
    "from_node_id" TEXT NOT NULL,
    "to_node_id" TEXT NOT NULL,
    "bidirectional" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "node_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: daily_actions
CREATE TABLE IF NOT EXISTS "daily_actions" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "tick_date" TIMESTAMP(3) NOT NULL,
    "action_type" "DailyActionType" NOT NULL,
    "action_target" JSONB NOT NULL,
    "combat_params" JSONB,
    "status" "DailyActionStatus" NOT NULL DEFAULT 'LOCKED_IN',
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "daily_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: daily_reports
CREATE TABLE IF NOT EXISTS "daily_reports" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "tick_date" TIMESTAMP(3) NOT NULL,
    "food_consumed" JSONB,
    "action_result" JSONB,
    "gold_change" INTEGER NOT NULL DEFAULT 0,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    "combat_logs" JSONB,
    "quest_progress" JSONB,
    "notifications" JSONB,
    "world_events" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: service_actions (NEW - six systems)
CREATE TABLE IF NOT EXISTS "service_actions" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "client_id" TEXT,
    "profession_type" "ProfessionType" NOT NULL,
    "action_type" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "game_day" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: loans (NEW - six systems)
CREATE TABLE IF NOT EXISTS "loans" (
    "id" TEXT NOT NULL,
    "banker_id" TEXT NOT NULL,
    "borrower_id" TEXT NOT NULL,
    "principal" INTEGER NOT NULL,
    "interest_rate" DOUBLE PRECISION NOT NULL,
    "total_owed" INTEGER NOT NULL,
    "amount_repaid" INTEGER NOT NULL DEFAULT 0,
    "term_days" INTEGER NOT NULL,
    "start_day" INTEGER NOT NULL,
    "due_day" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: service_reputations (NEW - six systems)
CREATE TABLE IF NOT EXISTS "service_reputations" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "profession_type" "ProfessionType" NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "last_active_day" INTEGER NOT NULL,
    CONSTRAINT "service_reputations_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes (idempotent)
CREATE INDEX IF NOT EXISTS "treaties_proposer_kingdom_id_idx" ON "treaties"("proposer_kingdom_id");
CREATE INDEX IF NOT EXISTS "treaties_receiver_kingdom_id_idx" ON "treaties"("receiver_kingdom_id");
CREATE INDEX IF NOT EXISTS "treaties_status_idx" ON "treaties"("status");
CREATE INDEX IF NOT EXISTS "world_events_event_type_idx" ON "world_events"("event_type");
CREATE INDEX IF NOT EXISTS "world_events_created_at_idx" ON "world_events"("created_at");
CREATE INDEX IF NOT EXISTS "petitions_creator_id_idx" ON "petitions"("creator_id");
CREATE INDEX IF NOT EXISTS "petitions_status_idx" ON "petitions"("status");
CREATE INDEX IF NOT EXISTS "petitions_expires_at_idx" ON "petitions"("expires_at");
CREATE INDEX IF NOT EXISTS "petition_signatures_petition_id_idx" ON "petition_signatures"("petition_id");
CREATE INDEX IF NOT EXISTS "petition_signatures_character_id_idx" ON "petition_signatures"("character_id");
CREATE UNIQUE INDEX IF NOT EXISTS "petition_signatures_petition_id_character_id_key" ON "petition_signatures"("petition_id", "character_id");
CREATE UNIQUE INDEX IF NOT EXISTS "nodes_town_id_key" ON "nodes"("town_id");
CREATE INDEX IF NOT EXISTS "nodes_route_id_idx" ON "nodes"("route_id");
CREATE INDEX IF NOT EXISTS "nodes_region_id_idx" ON "nodes"("region_id");
CREATE INDEX IF NOT EXISTS "nodes_type_idx" ON "nodes"("type");
CREATE INDEX IF NOT EXISTS "node_connections_from_node_id_idx" ON "node_connections"("from_node_id");
CREATE INDEX IF NOT EXISTS "node_connections_to_node_id_idx" ON "node_connections"("to_node_id");
CREATE UNIQUE INDEX IF NOT EXISTS "node_connections_from_node_id_to_node_id_key" ON "node_connections"("from_node_id", "to_node_id");
CREATE INDEX IF NOT EXISTS "daily_actions_character_id_idx" ON "daily_actions"("character_id");
CREATE INDEX IF NOT EXISTS "daily_actions_tick_date_idx" ON "daily_actions"("tick_date");
CREATE INDEX IF NOT EXISTS "daily_actions_status_idx" ON "daily_actions"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "daily_actions_character_id_tick_date_key" ON "daily_actions"("character_id", "tick_date");
CREATE INDEX IF NOT EXISTS "daily_reports_character_id_idx" ON "daily_reports"("character_id");
CREATE INDEX IF NOT EXISTS "daily_reports_tick_date_idx" ON "daily_reports"("tick_date");
CREATE UNIQUE INDEX IF NOT EXISTS "daily_reports_character_id_tick_date_key" ON "daily_reports"("character_id", "tick_date");
CREATE INDEX IF NOT EXISTS "service_actions_provider_id_idx" ON "service_actions"("provider_id");
CREATE INDEX IF NOT EXISTS "service_actions_client_id_idx" ON "service_actions"("client_id");
CREATE INDEX IF NOT EXISTS "service_actions_game_day_idx" ON "service_actions"("game_day");
CREATE INDEX IF NOT EXISTS "loans_banker_id_idx" ON "loans"("banker_id");
CREATE INDEX IF NOT EXISTS "loans_borrower_id_idx" ON "loans"("borrower_id");
CREATE UNIQUE INDEX IF NOT EXISTS "service_reputations_character_id_profession_type_key" ON "service_reputations"("character_id", "profession_type");
CREATE INDEX IF NOT EXISTS "characters_current_node_id_idx" ON "characters"("current_node_id");

-- RenameForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "forgeborn_maintenance" RENAME CONSTRAINT "warforged_maintenance_character_id_fkey" TO "forgeborn_maintenance_character_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- AddForeignKeys (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "characters" ADD CONSTRAINT "characters_preferred_food_id_fkey" FOREIGN KEY ("preferred_food_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "characters" ADD CONSTRAINT "characters_current_node_id_fkey" FOREIGN KEY ("current_node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "travel_actions" ADD CONSTRAINT "travel_actions_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "travel_actions" ADD CONSTRAINT "travel_actions_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "treaties" ADD CONSTRAINT "treaties_proposer_kingdom_id_fkey" FOREIGN KEY ("proposer_kingdom_id") REFERENCES "kingdoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "treaties" ADD CONSTRAINT "treaties_receiver_kingdom_id_fkey" FOREIGN KEY ("receiver_kingdom_id") REFERENCES "kingdoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "treaties" ADD CONSTRAINT "treaties_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "petitions" ADD CONSTRAINT "petitions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "petition_signatures" ADD CONSTRAINT "petition_signatures_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "petitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "petition_signatures" ADD CONSTRAINT "petition_signatures_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "nodes" ADD CONSTRAINT "nodes_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "travel_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "nodes" ADD CONSTRAINT "nodes_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "nodes" ADD CONSTRAINT "nodes_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "node_connections" ADD CONSTRAINT "node_connections_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "node_connections" ADD CONSTRAINT "node_connections_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "daily_actions" ADD CONSTRAINT "daily_actions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "loans" ADD CONSTRAINT "loans_banker_id_fkey" FOREIGN KEY ("banker_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_reputations" ADD CONSTRAINT "service_reputations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RenameIndex (idempotent)
DO $$ BEGIN
  ALTER INDEX "warforged_maintenance_character_id_key" RENAME TO "forgeborn_maintenance_character_id_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
