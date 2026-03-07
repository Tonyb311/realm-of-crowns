-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."ActionStatus" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."BeastClan" AS ENUM('WOLF', 'BEAR', 'FOX', 'HAWK', 'PANTHER', 'BOAR');--> statement-breakpoint
CREATE TYPE "public"."BiomeType" AS ENUM('PLAINS', 'FOREST', 'MOUNTAIN', 'HILLS', 'BADLANDS', 'SWAMP', 'TUNDRA', 'VOLCANIC', 'COASTAL', 'DESERT', 'RIVER', 'UNDERGROUND', 'UNDERWATER', 'FEYWILD');--> statement-breakpoint
CREATE TYPE "public"."BuildingType" AS ENUM('HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP', 'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY', 'STABLE', 'WAREHOUSE', 'BANK', 'INN', 'MARKET_STALL', 'FARM', 'RANCH', 'MINE');--> statement-breakpoint
CREATE TYPE "public"."CombatSessionStatus" AS ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."CombatStance" AS ENUM('AGGRESSIVE', 'BALANCED', 'DEFENSIVE', 'EVASIVE');--> statement-breakpoint
CREATE TYPE "public"."CombatType" AS ENUM('PVE', 'PVP', 'DUEL', 'ARENA', 'WAR', 'SPAR');--> statement-breakpoint
CREATE TYPE "public"."DailyActionStatus" AS ENUM('LOCKED_IN', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."DailyActionType" AS ENUM('GATHER', 'CRAFT', 'TRAVEL', 'GUARD', 'AMBUSH', 'ENLIST', 'PROPOSE_LAW', 'REST', 'SERVICE', 'COMBAT_PVE', 'COMBAT_PVP', 'HARVEST', 'JOB');--> statement-breakpoint
CREATE TYPE "public"."DiplomacyActionType" AS ENUM('PROPOSE_TREATY', 'DECLARE_WAR', 'TRADE_AGREEMENT', 'NON_AGGRESSION_PACT', 'ALLIANCE', 'BREAK_TREATY');--> statement-breakpoint
CREATE TYPE "public"."DragonBloodline" AS ENUM('RED', 'BLUE', 'WHITE', 'BLACK', 'GREEN', 'GOLD', 'SILVER');--> statement-breakpoint
CREATE TYPE "public"."ElectionPhase" AS ENUM('NOMINATIONS', 'CAMPAIGNING', 'VOTING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."ElectionStatus" AS ENUM('SCHEDULED', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."ElectionType" AS ENUM('MAYOR', 'RULER', 'GUILD_LEADER');--> statement-breakpoint
CREATE TYPE "public"."ElementalType" AS ENUM('FIRE', 'WATER', 'EARTH', 'AIR');--> statement-breakpoint
CREATE TYPE "public"."EquipSlot" AS ENUM('HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'MAIN_HAND', 'OFF_HAND', 'RING_1', 'RING_2', 'NECK', 'BACK', 'TOOL');--> statement-breakpoint
CREATE TYPE "public"."FoodPriority" AS ENUM('EXPIRING_FIRST', 'BEST_FIRST', 'SPECIFIC_ITEM', 'CATEGORY_ONLY');--> statement-breakpoint
CREATE TYPE "public"."FriendStatus" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."HungerState" AS ENUM('FED', 'HUNGRY', 'STARVING', 'INCAPACITATED');--> statement-breakpoint
CREATE TYPE "public"."ImpeachmentStatus" AS ENUM('ACTIVE', 'PASSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ItemRarity" AS ENUM('POOR', 'COMMON', 'FINE', 'SUPERIOR', 'MASTERWORK', 'LEGENDARY');--> statement-breakpoint
CREATE TYPE "public"."ItemType" AS ENUM('WEAPON', 'ARMOR', 'TOOL', 'CONSUMABLE', 'MATERIAL', 'ACCESSORY', 'QUEST', 'HOUSING');--> statement-breakpoint
CREATE TYPE "public"."LawStatus" AS ENUM('PROPOSED', 'VOTING', 'ACTIVE', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."LoanStatus" AS ENUM('ACTIVE', 'REPAID', 'DEFAULTED', 'GARNISHED');--> statement-breakpoint
CREATE TYPE "public"."LogLevel" AS ENUM('ERROR', 'WARN', 'INFO', 'DEBUG');--> statement-breakpoint
CREATE TYPE "public"."MessageChannel" AS ENUM('GLOBAL', 'TOWN', 'GUILD', 'PARTY', 'WHISPER', 'TRADE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."NpcRole" AS ENUM('QUEST_GIVER', 'MERCHANT', 'TRAINER', 'GUARD');--> statement-breakpoint
CREATE TYPE "public"."PetitionStatus" AS ENUM('ACTIVE', 'FULFILLED', 'EXPIRED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."ProfessionCategory" AS ENUM('GATHERING', 'CRAFTING', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."ProfessionTier" AS ENUM('APPRENTICE', 'JOURNEYMAN', 'CRAFTSMAN', 'EXPERT', 'MASTER', 'GRANDMASTER');--> statement-breakpoint
CREATE TYPE "public"."ProfessionType" AS ENUM('FARMER', 'RANCHER', 'FISHERMAN', 'LUMBERJACK', 'MINER', 'HERBALIST', 'HUNTER', 'SMELTER', 'BLACKSMITH', 'ARMORER', 'WOODWORKER', 'TANNER', 'LEATHERWORKER', 'TAILOR', 'ALCHEMIST', 'ENCHANTER', 'COOK', 'BREWER', 'JEWELER', 'FLETCHER', 'MASON', 'SCRIBE', 'MERCHANT', 'INNKEEPER', 'HEALER', 'STABLE_MASTER', 'BANKER', 'COURIER', 'MERCENARY_CAPTAIN');--> statement-breakpoint
CREATE TYPE "public"."QuestType" AS ENUM('MAIN', 'TOWN', 'DAILY', 'GUILD', 'BOUNTY', 'RACIAL', 'TUTORIAL');--> statement-breakpoint
CREATE TYPE "public"."Race" AS ENUM('HUMAN', 'ELF', 'DWARF', 'HARTHFOLK', 'ORC', 'NETHKIN', 'DRAKONID', 'HALF_ELF', 'HALF_ORC', 'GNOME', 'MERFOLK', 'BEASTFOLK', 'FAEFOLK', 'GOLIATH', 'NIGHTBORNE', 'MOSSKIN', 'FORGEBORN', 'ELEMENTARI', 'REVENANT', 'CHANGELING');--> statement-breakpoint
CREATE TYPE "public"."RaceTier" AS ENUM('CORE', 'COMMON', 'EXOTIC');--> statement-breakpoint
CREATE TYPE "public"."RelationStatus" AS ENUM('ALLIED', 'FRIENDLY', 'NEUTRAL', 'DISTRUSTFUL', 'HOSTILE', 'BLOOD_FEUD');--> statement-breakpoint
CREATE TYPE "public"."ResourceType" AS ENUM('ORE', 'WOOD', 'GRAIN', 'HERB', 'FISH', 'HIDE', 'STONE', 'FIBER', 'ANIMAL_PRODUCT', 'REAGENT', 'EXOTIC');--> statement-breakpoint
CREATE TYPE "public"."TreatyStatus" AS ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'BROKEN');--> statement-breakpoint
CREATE TYPE "public"."TreatyType" AS ENUM('TRADE_AGREEMENT', 'NON_AGGRESSION_PACT', 'ALLIANCE');--> statement-breakpoint
CREATE TYPE "public"."WarStatus" AS ENUM('ACTIVE', 'PEACE_PROPOSED', 'ENDED');--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "racial_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"race1" "Race" NOT NULL,
	"race2" "Race" NOT NULL,
	"status" "RelationStatus" DEFAULT 'NEUTRAL' NOT NULL,
	"modifier" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"slot" "EquipSlot" NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventories" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"slot_position" integer,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profession_xp" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"profession_type" "ProfessionType" NOT NULL,
	"xp_gained" integer NOT NULL,
	"source" text NOT NULL,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "town_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"resource_type" "ResourceType" NOT NULL,
	"abundance" integer DEFAULT 50 NOT NULL,
	"respawn_rate" double precision DEFAULT 1 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_borders" (
	"id" text PRIMARY KEY NOT NULL,
	"region_id_1" text NOT NULL,
	"region_id_2" text NOT NULL,
	"type" text DEFAULT 'land' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diplomacy_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "DiplomacyActionType" NOT NULL,
	"initiator_id" text NOT NULL,
	"target_id" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kingdoms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ruler_id" text,
	"capital_town_id" text,
	"treasury" integer DEFAULT 0 NOT NULL,
	"laws" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "ResourceType" NOT NULL,
	"biome" "BiomeType" NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"description" text,
	"base_gather_time" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"town_id" text NOT NULL,
	"type" "BuildingType" NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"storage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "building_constructions" (
	"id" text PRIMARY KEY NOT NULL,
	"building_id" text NOT NULL,
	"status" "ActionStatus" DEFAULT 'PENDING' NOT NULL,
	"materials_used" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completes_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_histories" (
	"id" text PRIMARY KEY NOT NULL,
	"item_template_id" text NOT NULL,
	"town_id" text NOT NULL,
	"avg_price" double precision NOT NULL,
	"volume" integer DEFAULT 0 NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caravans" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"from_town_id" text NOT NULL,
	"to_town_id" text NOT NULL,
	"cargo" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "ActionStatus" DEFAULT 'PENDING' NOT NULL,
	"departed_at" timestamp(3),
	"arrives_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "election_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"election_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tag" text NOT NULL,
	"leader_id" text,
	"level" integer DEFAULT 1 NOT NULL,
	"treasury" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_members" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"character_id" text NOT NULL,
	"rank" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"quest_id" text NOT NULL,
	"status" "ActionStatus" DEFAULT 'PENDING' NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combat_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"round" integer NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combat_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"character_id" text NOT NULL,
	"team" integer DEFAULT 0 NOT NULL,
	"initiative" integer DEFAULT 0 NOT NULL,
	"current_hp" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "racial_ability_cooldowns" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"ability_name" text NOT NULL,
	"last_used" timestamp(3) NOT NULL,
	"cooldown_ends" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changeling_disguises" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"disguised_as" text,
	"disguise_race" "Race",
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reward" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forgeborn_maintenance" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"last_maintenance" timestamp(3) NOT NULL,
	"condition" integer DEFAULT 100 NOT NULL,
	"next_required" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_professions" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"profession_type" "ProfessionType" NOT NULL,
	"tier" "ProfessionTier" DEFAULT 'APPRENTICE' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"specialization" text
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"biome" "BiomeType" NOT NULL,
	"level_min" integer DEFAULT 1 NOT NULL,
	"level_max" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"kingdom_id" text
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"profession_type" "ProfessionType" NOT NULL,
	"tier" "ProfessionTier" NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result" text NOT NULL,
	"craft_time" integer DEFAULT 60 NOT NULL,
	"xp_reward" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"specialization" text,
	"level_required" integer
);
--> statement-breakpoint
CREATE TABLE "crafting_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"status" "ActionStatus" DEFAULT 'PENDING' NOT NULL,
	"quality" "ItemRarity",
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"tick_date" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "combat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "CombatType" NOT NULL,
	"status" "CombatSessionStatus" DEFAULT 'ACTIVE' NOT NULL,
	"location_town_id" text,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ended_at" timestamp(3),
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"attacker_params" jsonb,
	"defender_params" jsonb
);
--> statement-breakpoint
CREATE TABLE "towns" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region_id" text NOT NULL,
	"population" integer DEFAULT 0 NOT NULL,
	"biome" "BiomeType" NOT NULL,
	"description" text,
	"mayor_id" text,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"is_released" boolean DEFAULT false NOT NULL,
	"released_at" timestamp(3),
	"release_order" integer,
	"release_notes" text,
	"map_x" double precision,
	"map_y" double precision
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "QuestType" NOT NULL,
	"description" text,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rewards" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"level_required" integer DEFAULT 1 NOT NULL,
	"region_id" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"cooldown_hours" integer,
	"is_repeatable" boolean DEFAULT false NOT NULL,
	"prerequisite_quest_id" text,
	"slug" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"from_town_id" text NOT NULL,
	"to_town_id" text NOT NULL,
	"danger_level" integer DEFAULT 1 NOT NULL,
	"terrain" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"node_count" integer DEFAULT 3 NOT NULL,
	"difficulty" text DEFAULT 'moderate' NOT NULL,
	"is_released" boolean DEFAULT false NOT NULL,
	"bidirectional" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"item_id" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"town_id" text NOT NULL,
	"listed_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"item_template_id" text DEFAULT '' NOT NULL,
	"item_name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"auction_cycle_id" text,
	"sold_at" timestamp(3),
	"sold_to" text,
	"sold_price" integer
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"status" "FriendStatus" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"type" "ElectionType" NOT NULL,
	"status" "ElectionStatus" DEFAULT 'SCHEDULED' NOT NULL,
	"start_date" timestamp(3) NOT NULL,
	"end_date" timestamp(3) NOT NULL,
	"winner_id" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"kingdom_id" text,
	"phase" "ElectionPhase" DEFAULT 'NOMINATIONS' NOT NULL,
	"term_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "laws" (
	"id" text PRIMARY KEY NOT NULL,
	"kingdom_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"effects" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enacted_by_id" text NOT NULL,
	"enacted_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"expires_at" timestamp(3),
	"law_type" text DEFAULT 'general' NOT NULL,
	"proposed_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" "LawStatus" DEFAULT 'PROPOSED' NOT NULL,
	"votes_against" integer DEFAULT 0 NOT NULL,
	"votes_for" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_type" "MessageChannel" NOT NULL,
	"content" text NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text,
	"guild_id" text,
	"town_id" text,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "election_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"election_id" text NOT NULL,
	"character_id" text NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"nominated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impeachments" (
	"id" text PRIMARY KEY NOT NULL,
	"target_id" text NOT NULL,
	"town_id" text,
	"kingdom_id" text,
	"votes_for" integer DEFAULT 0 NOT NULL,
	"votes_against" integer DEFAULT 0 NOT NULL,
	"status" "ImpeachmentStatus" DEFAULT 'ACTIVE' NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ends_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impeachment_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"impeachment_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"support" boolean NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "town_treasuries" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"tax_rate" double precision DEFAULT 0.1 NOT NULL,
	"last_collected_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "council_members" (
	"id" text PRIMARY KEY NOT NULL,
	"kingdom_id" text,
	"town_id" text,
	"character_id" text NOT NULL,
	"role" text NOT NULL,
	"appointed_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"appointed_by_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "town_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"tax_rate" double precision DEFAULT 0.1 NOT NULL,
	"trade_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"building_permits" boolean DEFAULT true NOT NULL,
	"sheriff_id" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "abilities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"class" text NOT NULL,
	"specialization" text NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"effects" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cooldown" integer DEFAULT 0 NOT NULL,
	"prerequisite_ability_id" text,
	"level_required" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_abilities" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"ability_id" text NOT NULL,
	"unlocked_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npcs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"town_id" text NOT NULL,
	"role" "NpcRole" DEFAULT 'QUEST_GIVER' NOT NULL,
	"dialog" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quest_ids" text[],
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_appearances" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"apparent_race" "Race" NOT NULL,
	"apparent_name" text,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "ItemType" NOT NULL,
	"rarity" "ItemRarity" DEFAULT 'COMMON' NOT NULL,
	"description" text,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"durability" integer DEFAULT 100 NOT NULL,
	"requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profession_required" "ProfessionType",
	"level_required" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"food_buff" jsonb,
	"is_beverage" boolean DEFAULT false NOT NULL,
	"is_food" boolean DEFAULT false NOT NULL,
	"is_perishable" boolean DEFAULT false NOT NULL,
	"shelf_life_days" integer,
	"is_potion" boolean DEFAULT false NOT NULL,
	"base_value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"race" "Race" NOT NULL,
	"dragon_bloodline" "DragonBloodline",
	"beast_clan" "BeastClan",
	"elemental_type" "ElementalType",
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_town_id" text,
	"health" integer DEFAULT 100 NOT NULL,
	"max_health" integer DEFAULT 100 NOT NULL,
	"gold" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"class" text,
	"specialization" text,
	"title" text,
	"unspent_stat_points" integer DEFAULT 0 NOT NULL,
	"current_appearance_race" "Race",
	"race_tier" "RaceTier" DEFAULT 'CORE' NOT NULL,
	"sub_race" jsonb,
	"unlocked_abilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ability_priority_queue" jsonb,
	"combat_stance" "CombatStance" DEFAULT 'BALANCED' NOT NULL,
	"days_since_last_meal" integer DEFAULT 0 NOT NULL,
	"food_priority" "FoodPriority" DEFAULT 'EXPIRING_FIRST' NOT NULL,
	"hunger_state" "HungerState" DEFAULT 'FED' NOT NULL,
	"item_usage_rules" jsonb,
	"never_retreat" boolean DEFAULT false NOT NULL,
	"preferred_food_id" text,
	"pvp_loot_behavior" text DEFAULT 'GOLD_ONLY' NOT NULL,
	"retreat_hp_threshold" integer DEFAULT 25 NOT NULL,
	"retreat_opposition_ratio" double precision DEFAULT 3 NOT NULL,
	"retreat_round_limit" integer,
	"soul_fade_stage" integer DEFAULT 0 NOT NULL,
	"structural_decay_stage" integer DEFAULT 0 NOT NULL,
	"well_rested" boolean DEFAULT false NOT NULL,
	"travel_status" text DEFAULT 'idle' NOT NULL,
	"home_town_id" text,
	"escrowed_gold" integer DEFAULT 0 NOT NULL,
	"last_relocation_game_day" integer,
	"bio" text,
	"bonus_save_proficiencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pending_feat_choice" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exclusive_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"required_races" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"region_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"available_resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"danger_level" integer DEFAULT 1 NOT NULL,
	"entry_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owning_race" "Race",
	"required_level" integer DEFAULT 1 NOT NULL,
	"special_mechanics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"zone_type" text DEFAULT 'exclusive' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gathering_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"town_id" text NOT NULL,
	"status" "ActionStatus" DEFAULT 'PENDING' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"tick_date" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"owner_id" text,
	"current_durability" integer DEFAULT 100 NOT NULL,
	"quality" "ItemRarity" DEFAULT 'COMMON' NOT NULL,
	"crafted_by_id" text,
	"enchantments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"days_remaining" integer
);
--> statement-breakpoint
CREATE TABLE "wars" (
	"id" text PRIMARY KEY NOT NULL,
	"attacker_kingdom_id" text NOT NULL,
	"defender_kingdom_id" text NOT NULL,
	"status" "WarStatus" DEFAULT 'ACTIVE' NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ended_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"attacker_score" integer DEFAULT 0 NOT NULL,
	"defender_score" integer DEFAULT 0 NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"active_character_id" text,
	"last_switch_day" integer,
	"is_test_account" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treaties" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "TreatyType" NOT NULL,
	"proposer_kingdom_id" text NOT NULL,
	"receiver_kingdom_id" text NOT NULL,
	"proposed_by_id" text NOT NULL,
	"status" "TreatyStatus" DEFAULT 'PENDING' NOT NULL,
	"gold_cost" integer DEFAULT 0 NOT NULL,
	"required_days" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp(3),
	"expires_at" timestamp(3),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petitions" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"petition_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "PetitionStatus" DEFAULT 'ACTIVE' NOT NULL,
	"signature_goal" integer DEFAULT 10 NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petition_signatures" (
	"id" text PRIMARY KEY NOT NULL,
	"petition_id" text NOT NULL,
	"character_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"tick_date" timestamp(3) NOT NULL,
	"action_type" "DailyActionType" NOT NULL,
	"action_target" jsonb NOT NULL,
	"combat_params" jsonb,
	"status" "DailyActionStatus" DEFAULT 'LOCKED_IN' NOT NULL,
	"result" jsonb,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"client_id" text,
	"profession_type" "ProfessionType" NOT NULL,
	"action_type" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"details" jsonb,
	"game_day" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" text PRIMARY KEY NOT NULL,
	"banker_id" text NOT NULL,
	"borrower_id" text NOT NULL,
	"principal" integer NOT NULL,
	"interest_rate" double precision NOT NULL,
	"total_owed" integer NOT NULL,
	"amount_repaid" integer DEFAULT 0 NOT NULL,
	"term_days" integer NOT NULL,
	"start_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"status" "LoanStatus" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_reputations" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"profession_type" "ProfessionType" NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"last_active_day" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "law_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"law_id" text NOT NULL,
	"character_id" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"tick_date" timestamp(3) NOT NULL,
	"food_consumed" jsonb,
	"action_result" jsonb,
	"gold_change" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"combat_logs" jsonb,
	"quest_progress" jsonb,
	"notifications" jsonb,
	"world_events" jsonb,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dismissed_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"level" "LogLevel" DEFAULT 'ERROR' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"endpoint" text NOT NULL,
	"status_code" integer NOT NULL,
	"message" text NOT NULL,
	"detail" text,
	"user_id" text,
	"character_id" text,
	"request_body" jsonb,
	"user_agent" text,
	"ip" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp(3),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "content_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" text NOT NULL,
	"content_name" text NOT NULL,
	"tier" text,
	"is_released" boolean DEFAULT false NOT NULL,
	"released_at" timestamp(3),
	"release_order" integer,
	"release_notes" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"leader_id" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'forming' NOT NULL,
	"max_size" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"party_id" text
);
--> statement-breakpoint
CREATE TABLE "travel_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"node_index" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"terrain" text NOT NULL,
	"danger_level" integer DEFAULT 3 NOT NULL,
	"special_type" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"offset_x" double precision DEFAULT 0 NOT NULL,
	"offset_y" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"character_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_travel_states" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"route_id" text NOT NULL,
	"current_node_index" integer NOT NULL,
	"direction" text DEFAULT 'forward' NOT NULL,
	"speed_modifier" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_tick_at" timestamp(3),
	"status" text DEFAULT 'traveling' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combat_encounter_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"session_id" text,
	"character_id" text NOT NULL,
	"character_name" text DEFAULT '' NOT NULL,
	"opponent_id" text,
	"opponent_name" text DEFAULT '' NOT NULL,
	"town_id" text,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ended_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"outcome" text DEFAULT '' NOT NULL,
	"total_rounds" integer DEFAULT 0 NOT NULL,
	"character_start_hp" integer DEFAULT 0 NOT NULL,
	"character_end_hp" integer DEFAULT 0 NOT NULL,
	"opponent_start_hp" integer DEFAULT 0 NOT NULL,
	"opponent_end_hp" integer DEFAULT 0 NOT NULL,
	"character_weapon" text DEFAULT '' NOT NULL,
	"opponent_weapon" text DEFAULT '' NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"gold_awarded" integer DEFAULT 0 NOT NULL,
	"loot_dropped" text DEFAULT '' NOT NULL,
	"rounds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"simulation_tick" integer,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"destination_town_id" text,
	"origin_town_id" text,
	"trigger_source" text DEFAULT 'town_pve' NOT NULL,
	"party_id" text,
	"simulation_run_id" text
);
--> statement-breakpoint
CREATE TABLE "group_travel_states" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"route_id" text NOT NULL,
	"current_node_index" integer NOT NULL,
	"direction" text DEFAULT 'forward' NOT NULL,
	"speed_modifier" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_tick_at" timestamp(3),
	"status" text DEFAULT 'traveling' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"leader_id" text NOT NULL,
	"town_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"max_size" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"disbanded_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "party_members" (
	"id" text PRIMARY KEY NOT NULL,
	"party_id" text NOT NULL,
	"character_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"left_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "party_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"party_id" text NOT NULL,
	"character_id" text NOT NULL,
	"invited_by_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_buy_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"bid_price" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority_score" double precision,
	"roll_result" integer,
	"roll_breakdown" jsonb,
	"placed_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resolved_at" timestamp(3),
	"auction_cycle_id" text
);
--> statement-breakpoint
CREATE TABLE "trade_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"item_id" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"town_id" text NOT NULL,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"seller_fee" integer DEFAULT 0 NOT NULL,
	"seller_net" integer DEFAULT 0 NOT NULL,
	"auction_cycle_id" text,
	"num_bidders" integer DEFAULT 1 NOT NULL,
	"contested" boolean DEFAULT false NOT NULL,
	"all_bidders" jsonb
);
--> statement-breakpoint
CREATE TABLE "auction_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"cycle_number" integer NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resolved_at" timestamp(3),
	"status" text DEFAULT 'open' NOT NULL,
	"orders_processed" integer DEFAULT 0 NOT NULL,
	"transactions_completed" integer DEFAULT 0 NOT NULL,
	"contested_listings" integer DEFAULT 0 NOT NULL,
	"merchant_wins" integer DEFAULT 0 NOT NULL,
	"non_merchant_wins" integer DEFAULT 0 NOT NULL,
	"total_gold_traded" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "livestock" (
	"id" text PRIMARY KEY NOT NULL,
	"building_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"animal_type" text NOT NULL,
	"name" text,
	"age" integer DEFAULT 0 NOT NULL,
	"hunger" integer DEFAULT 0 NOT NULL,
	"health" integer DEFAULT 100 NOT NULL,
	"last_fed_at" integer,
	"last_produced_at" integer,
	"is_alive" boolean DEFAULT true NOT NULL,
	"death_cause" text,
	"purchased_at" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "houses" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"town_id" text NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"name" text,
	"storage_slots" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "house_storage" (
	"id" text PRIMARY KEY NOT NULL,
	"house_id" text NOT NULL,
	"item_template_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp(3),
	"tick_count" integer NOT NULL,
	"ticks_completed" integer DEFAULT 0 NOT NULL,
	"bot_count" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"encounter_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"notes" text,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"town_id" text NOT NULL,
	"wage" integer NOT NULL,
	"worker_id" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"job_type" varchar(50) DEFAULT 'harvest_field' NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"auto_posted" boolean DEFAULT false NOT NULL,
	"product_yield" jsonb,
	"completed_at" timestamp with time zone,
	"expires_at" integer
);
--> statement-breakpoint
CREATE TABLE "owned_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"town_id" text NOT NULL,
	"profession_type" text NOT NULL,
	"spot_type" text NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"slot_number" integer NOT NULL,
	"name" text NOT NULL,
	"crop_state" text DEFAULT 'EMPTY' NOT NULL,
	"planted_at" integer,
	"ready_at" integer,
	"withering_at" integer,
	"purchase_price" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"pending_yield" integer DEFAULT 0 NOT NULL,
	"pending_yield_since" integer
);
--> statement-breakpoint
CREATE TABLE "monsters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"loot_table" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"region_id" text,
	"biome" "BiomeType" NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"abilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"damage_type" text DEFAULT 'BLUDGEONING' NOT NULL,
	"resistances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"immunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vulnerabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"condition_immunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"crit_immunity" boolean DEFAULT false NOT NULL,
	"crit_resistance" integer DEFAULT 0 NOT NULL,
	"expanded_crit_range" integer DEFAULT 0 NOT NULL,
	"formula_cr" double precision,
	"sim_cr" double precision,
	"encounter_type" text DEFAULT 'standard' NOT NULL,
	"legendary_actions" integer DEFAULT 0 NOT NULL,
	"legendary_resistances" integer DEFAULT 0 NOT NULL,
	"phase_transitions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text DEFAULT 'beast' NOT NULL,
	"sentient" boolean DEFAULT false NOT NULL,
	"size" text DEFAULT 'medium' NOT NULL,
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profession_xp" ADD CONSTRAINT "profession_xp_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "town_resources" ADD CONSTRAINT "town_resources_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "region_borders" ADD CONSTRAINT "region_borders_region_id_1_fkey" FOREIGN KEY ("region_id_1") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "region_borders" ADD CONSTRAINT "region_borders_region_id_2_fkey" FOREIGN KEY ("region_id_2") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diplomacy_events" ADD CONSTRAINT "diplomacy_events_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diplomacy_events" ADD CONSTRAINT "diplomacy_events_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kingdoms" ADD CONSTRAINT "kingdoms_ruler_id_fkey" FOREIGN KEY ("ruler_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "building_constructions" ADD CONSTRAINT "building_constructions_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_item_template_id_fkey" FOREIGN KEY ("item_template_id") REFERENCES "public"."item_templates"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_from_town_id_fkey" FOREIGN KEY ("from_town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_to_town_id_fkey" FOREIGN KEY ("to_town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "election_votes" ADD CONSTRAINT "election_votes_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "election_votes" ADD CONSTRAINT "election_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_logs" ADD CONSTRAINT "combat_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."combat_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_participants" ADD CONSTRAINT "combat_participants_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_participants" ADD CONSTRAINT "combat_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."combat_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "racial_ability_cooldowns" ADD CONSTRAINT "racial_ability_cooldowns_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "changeling_disguises" ADD CONSTRAINT "changeling_disguises_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "forgeborn_maintenance" ADD CONSTRAINT "forgeborn_maintenance_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_professions" ADD CONSTRAINT "player_professions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "crafting_actions" ADD CONSTRAINT "crafting_actions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "crafting_actions" ADD CONSTRAINT "crafting_actions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_sessions" ADD CONSTRAINT "combat_sessions_location_town_id_fkey" FOREIGN KEY ("location_town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "towns" ADD CONSTRAINT "towns_mayor_id_fkey" FOREIGN KEY ("mayor_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "towns" ADD CONSTRAINT "towns_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_prerequisite_quest_id_fkey" FOREIGN KEY ("prerequisite_quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_routes" ADD CONSTRAINT "travel_routes_from_town_id_fkey" FOREIGN KEY ("from_town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_routes" ADD CONSTRAINT "travel_routes_to_town_id_fkey" FOREIGN KEY ("to_town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_auction_cycle_id_fkey" FOREIGN KEY ("auction_cycle_id") REFERENCES "public"."auction_cycles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "elections" ADD CONSTRAINT "elections_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "elections" ADD CONSTRAINT "elections_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "elections" ADD CONSTRAINT "elections_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "laws" ADD CONSTRAINT "laws_enacted_by_id_fkey" FOREIGN KEY ("enacted_by_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "laws" ADD CONSTRAINT "laws_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impeachments" ADD CONSTRAINT "impeachments_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impeachments" ADD CONSTRAINT "impeachments_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impeachments" ADD CONSTRAINT "impeachments_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impeachment_votes" ADD CONSTRAINT "impeachment_votes_impeachment_id_fkey" FOREIGN KEY ("impeachment_id") REFERENCES "public"."impeachments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impeachment_votes" ADD CONSTRAINT "impeachment_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "town_treasuries" ADD CONSTRAINT "town_treasuries_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_appointed_by_id_fkey" FOREIGN KEY ("appointed_by_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "town_policies" ADD CONSTRAINT "town_policies_sheriff_id_fkey" FOREIGN KEY ("sheriff_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "town_policies" ADD CONSTRAINT "town_policies_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "abilities" ADD CONSTRAINT "abilities_prerequisite_ability_id_fkey" FOREIGN KEY ("prerequisite_ability_id") REFERENCES "public"."abilities"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "character_appearances" ADD CONSTRAINT "character_appearances_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_current_town_id_fkey" FOREIGN KEY ("current_town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_home_town_id_fkey" FOREIGN KEY ("home_town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_preferred_food_id_fkey" FOREIGN KEY ("preferred_food_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exclusive_zones" ADD CONSTRAINT "exclusive_zones_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gathering_actions" ADD CONSTRAINT "gathering_actions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gathering_actions" ADD CONSTRAINT "gathering_actions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gathering_actions" ADD CONSTRAINT "gathering_actions_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_crafted_by_id_fkey" FOREIGN KEY ("crafted_by_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."item_templates"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "wars" ADD CONSTRAINT "wars_attacker_kingdom_id_fkey" FOREIGN KEY ("attacker_kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "wars" ADD CONSTRAINT "wars_defender_kingdom_id_fkey" FOREIGN KEY ("defender_kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "treaties" ADD CONSTRAINT "treaties_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "treaties" ADD CONSTRAINT "treaties_proposer_kingdom_id_fkey" FOREIGN KEY ("proposer_kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "treaties" ADD CONSTRAINT "treaties_receiver_kingdom_id_fkey" FOREIGN KEY ("receiver_kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "petition_signatures" ADD CONSTRAINT "petition_signatures_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "petition_signatures" ADD CONSTRAINT "petition_signatures_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "public"."petitions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "daily_actions" ADD CONSTRAINT "daily_actions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_banker_id_fkey" FOREIGN KEY ("banker_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_reputations" ADD CONSTRAINT "service_reputations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "law_votes" ADD CONSTRAINT "law_votes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "law_votes" ADD CONSTRAINT "law_votes_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "public"."laws"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_groups" ADD CONSTRAINT "travel_groups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_groups" ADD CONSTRAINT "travel_groups_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_nodes" ADD CONSTRAINT "travel_nodes_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."travel_routes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_group_members" ADD CONSTRAINT "travel_group_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_group_members" ADD CONSTRAINT "travel_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."travel_groups"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "character_travel_states" ADD CONSTRAINT "character_travel_states_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "character_travel_states" ADD CONSTRAINT "character_travel_states_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."travel_routes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_destination_town_id_fkey" FOREIGN KEY ("destination_town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_origin_town_id_fkey" FOREIGN KEY ("origin_town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_simulation_run_id_fkey" FOREIGN KEY ("simulation_run_id") REFERENCES "public"."simulation_runs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "group_travel_states" ADD CONSTRAINT "group_travel_states_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."travel_groups"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "group_travel_states" ADD CONSTRAINT "group_travel_states_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."travel_routes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_buy_orders" ADD CONSTRAINT "market_buy_orders_auction_cycle_id_fkey" FOREIGN KEY ("auction_cycle_id") REFERENCES "public"."auction_cycles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_buy_orders" ADD CONSTRAINT "market_buy_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "market_buy_orders" ADD CONSTRAINT "market_buy_orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."market_listings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_auction_cycle_id_fkey" FOREIGN KEY ("auction_cycle_id") REFERENCES "public"."auction_cycles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "auction_cycles" ADD CONSTRAINT "auction_cycles_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "livestock" ADD CONSTRAINT "livestock_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "public"."owned_assets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "livestock" ADD CONSTRAINT "livestock_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "houses" ADD CONSTRAINT "houses_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "houses" ADD CONSTRAINT "houses_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "house_storage" ADD CONSTRAINT "house_storage_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "house_storage" ADD CONSTRAINT "house_storage_item_template_id_fkey" FOREIGN KEY ("item_template_id") REFERENCES "public"."item_templates"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."owned_assets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "owned_assets" ADD CONSTRAINT "owned_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "owned_assets" ADD CONSTRAINT "owned_assets_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monsters" ADD CONSTRAINT "monsters_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "racial_relations_race1_race2_key" ON "racial_relations" USING btree ("race1" enum_ops,"race2" enum_ops);--> statement-breakpoint
CREATE INDEX "character_equipment_character_id_idx" ON "character_equipment" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "character_equipment_character_id_slot_key" ON "character_equipment" USING btree ("character_id" text_ops,"slot" text_ops);--> statement-breakpoint
CREATE INDEX "inventories_character_id_idx" ON "inventories" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "inventories_character_id_item_id_key" ON "inventories" USING btree ("character_id" text_ops,"item_id" text_ops);--> statement-breakpoint
CREATE INDEX "profession_xp_character_id_profession_type_idx" ON "profession_xp" USING btree ("character_id" text_ops,"profession_type" text_ops);--> statement-breakpoint
CREATE INDEX "town_resources_town_id_idx" ON "town_resources" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "town_resources_town_id_resource_type_key" ON "town_resources" USING btree ("town_id" text_ops,"resource_type" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "region_borders_region_id_1_region_id_2_key" ON "region_borders" USING btree ("region_id_1" text_ops,"region_id_2" text_ops);--> statement-breakpoint
CREATE INDEX "diplomacy_events_initiator_id_idx" ON "diplomacy_events" USING btree ("initiator_id" text_ops);--> statement-breakpoint
CREATE INDEX "diplomacy_events_target_id_idx" ON "diplomacy_events" USING btree ("target_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "kingdoms_capital_town_id_key" ON "kingdoms" USING btree ("capital_town_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "kingdoms_name_key" ON "kingdoms" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "kingdoms_ruler_id_key" ON "kingdoms" USING btree ("ruler_id" text_ops);--> statement-breakpoint
CREATE INDEX "resources_biome_idx" ON "resources" USING btree ("biome" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "resources_name_key" ON "resources" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "resources_type_idx" ON "resources" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "buildings_owner_id_idx" ON "buildings" USING btree ("owner_id" text_ops);--> statement-breakpoint
CREATE INDEX "buildings_town_id_idx" ON "buildings" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "building_constructions_building_id_idx" ON "building_constructions" USING btree ("building_id" text_ops);--> statement-breakpoint
CREATE INDEX "building_constructions_status_idx" ON "building_constructions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "price_histories_item_template_id_idx" ON "price_histories" USING btree ("item_template_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "price_histories_item_template_id_town_id_date_key" ON "price_histories" USING btree ("item_template_id" text_ops,"town_id" text_ops,"date" text_ops);--> statement-breakpoint
CREATE INDEX "price_histories_town_id_idx" ON "price_histories" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "caravans_owner_id_idx" ON "caravans" USING btree ("owner_id" text_ops);--> statement-breakpoint
CREATE INDEX "caravans_status_idx" ON "caravans" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "election_votes_election_id_idx" ON "election_votes" USING btree ("election_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "election_votes_election_id_voter_id_key" ON "election_votes" USING btree ("election_id" text_ops,"voter_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_leader_id_key" ON "guilds" USING btree ("leader_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_tag_key" ON "guilds" USING btree ("tag" text_ops);--> statement-breakpoint
CREATE INDEX "guild_members_character_id_idx" ON "guild_members" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "guild_members_guild_id_character_id_key" ON "guild_members" USING btree ("guild_id" text_ops,"character_id" text_ops);--> statement-breakpoint
CREATE INDEX "guild_members_guild_id_idx" ON "guild_members" USING btree ("guild_id" text_ops);--> statement-breakpoint
CREATE INDEX "quest_progress_character_id_idx" ON "quest_progress" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "quest_progress_character_id_quest_id_key" ON "quest_progress" USING btree ("character_id" text_ops,"quest_id" text_ops);--> statement-breakpoint
CREATE INDEX "quest_progress_character_id_status_idx" ON "quest_progress" USING btree ("character_id" enum_ops,"status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "quest_progress_one_active_per_character" ON "quest_progress" USING btree ("character_id" text_ops) WHERE (status = 'IN_PROGRESS'::"ActionStatus");--> statement-breakpoint
CREATE INDEX "quest_progress_quest_id_idx" ON "quest_progress" USING btree ("quest_id" text_ops);--> statement-breakpoint
CREATE INDEX "combat_logs_actor_id_idx" ON "combat_logs" USING btree ("actor_id" text_ops);--> statement-breakpoint
CREATE INDEX "combat_logs_session_id_idx" ON "combat_logs" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "combat_logs_session_id_round_idx" ON "combat_logs" USING btree ("session_id" int4_ops,"round" int4_ops);--> statement-breakpoint
CREATE INDEX "combat_participants_character_id_idx" ON "combat_participants" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "combat_participants_session_id_character_id_key" ON "combat_participants" USING btree ("session_id" text_ops,"character_id" text_ops);--> statement-breakpoint
CREATE INDEX "combat_participants_session_id_idx" ON "combat_participants" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_character_id_idx" ON "notifications" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_character_id_read_created_at_idx" ON "notifications" USING btree ("character_id" bool_ops,"read" timestamp_ops,"created_at" bool_ops);--> statement-breakpoint
CREATE INDEX "notifications_character_id_read_idx" ON "notifications" USING btree ("character_id" bool_ops,"read" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "racial_ability_cooldowns_character_id_ability_name_key" ON "racial_ability_cooldowns" USING btree ("character_id" text_ops,"ability_name" text_ops);--> statement-breakpoint
CREATE INDEX "racial_ability_cooldowns_character_id_idx" ON "racial_ability_cooldowns" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "changeling_disguises_character_id_key" ON "changeling_disguises" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "player_achievements_character_id_achievement_id_key" ON "player_achievements" USING btree ("character_id" text_ops,"achievement_id" text_ops);--> statement-breakpoint
CREATE INDEX "player_achievements_character_id_idx" ON "player_achievements" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "forgeborn_maintenance_character_id_key" ON "forgeborn_maintenance" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "player_professions_character_id_idx" ON "player_professions" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "player_professions_character_id_is_active_idx" ON "player_professions" USING btree ("character_id" bool_ops,"is_active" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "player_professions_character_id_profession_type_key" ON "player_professions" USING btree ("character_id" text_ops,"profession_type" enum_ops);--> statement-breakpoint
CREATE INDEX "regions_kingdom_id_idx" ON "regions" USING btree ("kingdom_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "regions_name_key" ON "regions" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "recipes_profession_type_idx" ON "recipes" USING btree ("profession_type" enum_ops);--> statement-breakpoint
CREATE INDEX "recipes_tier_idx" ON "recipes" USING btree ("tier" enum_ops);--> statement-breakpoint
CREATE INDEX "crafting_actions_character_id_idx" ON "crafting_actions" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "crafting_actions_status_idx" ON "crafting_actions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "combat_sessions_location_town_id_idx" ON "combat_sessions" USING btree ("location_town_id" text_ops);--> statement-breakpoint
CREATE INDEX "combat_sessions_status_idx" ON "combat_sessions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "towns_map_coordinates_idx" ON "towns" USING btree ("map_x" float8_ops,"map_y" float8_ops) WHERE (map_x IS NOT NULL);--> statement-breakpoint
CREATE INDEX "towns_mayor_id_idx" ON "towns" USING btree ("mayor_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "towns_name_key" ON "towns" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "towns_region_id_idx" ON "towns" USING btree ("region_id" text_ops);--> statement-breakpoint
CREATE INDEX "quests_prerequisite_quest_id_idx" ON "quests" USING btree ("prerequisite_quest_id" text_ops);--> statement-breakpoint
CREATE INDEX "quests_region_id_idx" ON "quests" USING btree ("region_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "quests_slug_key" ON "quests" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "quests_type_idx" ON "quests" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "travel_routes_from_town_id_idx" ON "travel_routes" USING btree ("from_town_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "travel_routes_from_town_id_to_town_id_key" ON "travel_routes" USING btree ("from_town_id" text_ops,"to_town_id" text_ops);--> statement-breakpoint
CREATE INDEX "travel_routes_is_released_idx" ON "travel_routes" USING btree ("is_released" bool_ops);--> statement-breakpoint
CREATE INDEX "travel_routes_to_town_id_idx" ON "travel_routes" USING btree ("to_town_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_listings_item_id_idx" ON "market_listings" USING btree ("item_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_listings_seller_id_idx" ON "market_listings" USING btree ("seller_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_listings_status_town_id_idx" ON "market_listings" USING btree ("status" text_ops,"town_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_listings_town_id_idx" ON "market_listings" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_listings_town_id_price_idx" ON "market_listings" USING btree ("town_id" text_ops,"price" int4_ops);--> statement-breakpoint
CREATE INDEX "friends_recipient_id_idx" ON "friends" USING btree ("recipient_id" text_ops);--> statement-breakpoint
CREATE INDEX "friends_recipient_id_status_idx" ON "friends" USING btree ("recipient_id" text_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "friends_requester_id_idx" ON "friends" USING btree ("requester_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "friends_requester_id_recipient_id_key" ON "friends" USING btree ("requester_id" text_ops,"recipient_id" text_ops);--> statement-breakpoint
CREATE INDEX "friends_requester_id_status_idx" ON "friends" USING btree ("requester_id" enum_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "friends_status_idx" ON "friends" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "elections_kingdom_id_idx" ON "elections" USING btree ("kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "elections_status_idx" ON "elections" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "elections_town_id_idx" ON "elections" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "laws_kingdom_id_idx" ON "laws" USING btree ("kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "laws_status_idx" ON "laws" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "messages_channel_type_town_id_timestamp_idx" ON "messages" USING btree ("channel_type" enum_ops,"town_id" text_ops,"timestamp" enum_ops);--> statement-breakpoint
CREATE INDEX "messages_guild_id_idx" ON "messages" USING btree ("guild_id" text_ops);--> statement-breakpoint
CREATE INDEX "messages_recipient_id_idx" ON "messages" USING btree ("recipient_id" text_ops);--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id" text_ops);--> statement-breakpoint
CREATE INDEX "messages_town_id_idx" ON "messages" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "election_candidates_character_id_idx" ON "election_candidates" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "election_candidates_election_id_character_id_key" ON "election_candidates" USING btree ("election_id" text_ops,"character_id" text_ops);--> statement-breakpoint
CREATE INDEX "election_candidates_election_id_idx" ON "election_candidates" USING btree ("election_id" text_ops);--> statement-breakpoint
CREATE INDEX "impeachments_kingdom_id_idx" ON "impeachments" USING btree ("kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "impeachments_status_idx" ON "impeachments" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "impeachments_target_id_idx" ON "impeachments" USING btree ("target_id" text_ops);--> statement-breakpoint
CREATE INDEX "impeachments_town_id_idx" ON "impeachments" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "impeachment_votes_impeachment_id_idx" ON "impeachment_votes" USING btree ("impeachment_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "impeachment_votes_impeachment_id_voter_id_key" ON "impeachment_votes" USING btree ("impeachment_id" text_ops,"voter_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "town_treasuries_town_id_key" ON "town_treasuries" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "council_members_character_id_idx" ON "council_members" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "council_members_kingdom_id_idx" ON "council_members" USING btree ("kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "council_members_town_id_idx" ON "council_members" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "town_policies_town_id_key" ON "town_policies" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "abilities_class_idx" ON "abilities" USING btree ("class" text_ops);--> statement-breakpoint
CREATE INDEX "abilities_class_specialization_idx" ON "abilities" USING btree ("class" text_ops,"specialization" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "abilities_name_key" ON "abilities" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "character_abilities_character_id_ability_id_key" ON "character_abilities" USING btree ("character_id" text_ops,"ability_id" text_ops);--> statement-breakpoint
CREATE INDEX "character_abilities_character_id_idx" ON "character_abilities" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "npcs_role_idx" ON "npcs" USING btree ("role" enum_ops);--> statement-breakpoint
CREATE INDEX "npcs_town_id_idx" ON "npcs" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "character_appearances_character_id_idx" ON "character_appearances" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "item_templates_rarity_idx" ON "item_templates" USING btree ("rarity" enum_ops);--> statement-breakpoint
CREATE INDEX "item_templates_type_idx" ON "item_templates" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "characters_current_town_id_idx" ON "characters" USING btree ("current_town_id" text_ops);--> statement-breakpoint
CREATE INDEX "characters_race_idx" ON "characters" USING btree ("race" enum_ops);--> statement-breakpoint
CREATE INDEX "characters_travel_status_idx" ON "characters" USING btree ("travel_status" text_ops);--> statement-breakpoint
CREATE INDEX "characters_user_id_idx" ON "characters" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "exclusive_zones_region_id_idx" ON "exclusive_zones" USING btree ("region_id" text_ops);--> statement-breakpoint
CREATE INDEX "gathering_actions_character_id_idx" ON "gathering_actions" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "gathering_actions_status_idx" ON "gathering_actions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "items_crafted_by_id_idx" ON "items" USING btree ("crafted_by_id" text_ops);--> statement-breakpoint
CREATE INDEX "items_owner_id_idx" ON "items" USING btree ("owner_id" text_ops);--> statement-breakpoint
CREATE INDEX "items_template_id_idx" ON "items" USING btree ("template_id" text_ops);--> statement-breakpoint
CREATE INDEX "wars_attacker_kingdom_id_idx" ON "wars" USING btree ("attacker_kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "wars_defender_kingdom_id_idx" ON "wars" USING btree ("defender_kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "wars_status_idx" ON "wars" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "users_is_test_account_idx" ON "users" USING btree ("is_test_account" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "world_events_created_at_idx" ON "world_events" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "world_events_event_type_idx" ON "world_events" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "treaties_proposer_kingdom_id_idx" ON "treaties" USING btree ("proposer_kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "treaties_receiver_kingdom_id_idx" ON "treaties" USING btree ("receiver_kingdom_id" text_ops);--> statement-breakpoint
CREATE INDEX "treaties_status_idx" ON "treaties" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "petitions_creator_id_idx" ON "petitions" USING btree ("creator_id" text_ops);--> statement-breakpoint
CREATE INDEX "petitions_expires_at_idx" ON "petitions" USING btree ("expires_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "petitions_status_idx" ON "petitions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "petition_signatures_character_id_idx" ON "petition_signatures" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "petition_signatures_petition_id_character_id_key" ON "petition_signatures" USING btree ("petition_id" text_ops,"character_id" text_ops);--> statement-breakpoint
CREATE INDEX "petition_signatures_petition_id_idx" ON "petition_signatures" USING btree ("petition_id" text_ops);--> statement-breakpoint
CREATE INDEX "daily_actions_character_id_idx" ON "daily_actions" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "daily_actions_character_id_tick_date_key" ON "daily_actions" USING btree ("character_id" text_ops,"tick_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "daily_actions_status_idx" ON "daily_actions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "daily_actions_tick_date_idx" ON "daily_actions" USING btree ("tick_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "service_actions_client_id_idx" ON "service_actions" USING btree ("client_id" text_ops);--> statement-breakpoint
CREATE INDEX "service_actions_game_day_idx" ON "service_actions" USING btree ("game_day" int4_ops);--> statement-breakpoint
CREATE INDEX "service_actions_provider_id_idx" ON "service_actions" USING btree ("provider_id" text_ops);--> statement-breakpoint
CREATE INDEX "loans_banker_id_idx" ON "loans" USING btree ("banker_id" text_ops);--> statement-breakpoint
CREATE INDEX "loans_borrower_id_idx" ON "loans" USING btree ("borrower_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "service_reputations_character_id_profession_type_key" ON "service_reputations" USING btree ("character_id" text_ops,"profession_type" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "law_votes_law_id_character_id_key" ON "law_votes" USING btree ("law_id" text_ops,"character_id" text_ops);--> statement-breakpoint
CREATE INDEX "daily_reports_character_id_idx" ON "daily_reports" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reports_character_id_tick_date_key" ON "daily_reports" USING btree ("character_id" text_ops,"tick_date" text_ops);--> statement-breakpoint
CREATE INDEX "daily_reports_tick_date_idx" ON "daily_reports" USING btree ("tick_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "error_logs_category_idx" ON "error_logs" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "error_logs_level_idx" ON "error_logs" USING btree ("level" enum_ops);--> statement-breakpoint
CREATE INDEX "error_logs_resolved_idx" ON "error_logs" USING btree ("resolved" bool_ops);--> statement-breakpoint
CREATE INDEX "error_logs_status_code_idx" ON "error_logs" USING btree ("status_code" int4_ops);--> statement-breakpoint
CREATE INDEX "error_logs_timestamp_idx" ON "error_logs" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "error_logs_user_id_idx" ON "error_logs" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "content_releases_content_type_content_id_key" ON "content_releases" USING btree ("content_type" text_ops,"content_id" text_ops);--> statement-breakpoint
CREATE INDEX "content_releases_content_type_idx" ON "content_releases" USING btree ("content_type" text_ops);--> statement-breakpoint
CREATE INDEX "content_releases_is_released_idx" ON "content_releases" USING btree ("is_released" bool_ops);--> statement-breakpoint
CREATE INDEX "travel_groups_leader_id_idx" ON "travel_groups" USING btree ("leader_id" text_ops);--> statement-breakpoint
CREATE INDEX "travel_groups_party_id_idx" ON "travel_groups" USING btree ("party_id" text_ops);--> statement-breakpoint
CREATE INDEX "travel_groups_status_idx" ON "travel_groups" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "travel_nodes_route_id_idx" ON "travel_nodes" USING btree ("route_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "travel_nodes_route_id_node_index_key" ON "travel_nodes" USING btree ("route_id" int4_ops,"node_index" int4_ops);--> statement-breakpoint
CREATE INDEX "travel_group_members_character_id_idx" ON "travel_group_members" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "travel_group_members_group_id_character_id_key" ON "travel_group_members" USING btree ("group_id" text_ops,"character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "character_travel_states_character_id_key" ON "character_travel_states" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "character_travel_states_route_id_current_node_index_idx" ON "character_travel_states" USING btree ("route_id" int4_ops,"current_node_index" int4_ops);--> statement-breakpoint
CREATE INDEX "character_travel_states_status_idx" ON "character_travel_states" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "combat_encounter_logs_character_id_started_at_idx" ON "combat_encounter_logs" USING btree ("character_id" text_ops,"started_at" text_ops);--> statement-breakpoint
CREATE INDEX "combat_encounter_logs_party_id_idx" ON "combat_encounter_logs" USING btree ("party_id" text_ops);--> statement-breakpoint
CREATE INDEX "combat_encounter_logs_simulation_run_id_idx" ON "combat_encounter_logs" USING btree ("simulation_run_id" text_ops);--> statement-breakpoint
CREATE INDEX "combat_encounter_logs_simulation_tick_idx" ON "combat_encounter_logs" USING btree ("simulation_tick" int4_ops);--> statement-breakpoint
CREATE INDEX "combat_encounter_logs_trigger_source_idx" ON "combat_encounter_logs" USING btree ("trigger_source" text_ops);--> statement-breakpoint
CREATE INDEX "combat_encounter_logs_type_idx" ON "combat_encounter_logs" USING btree ("type" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "group_travel_states_group_id_key" ON "group_travel_states" USING btree ("group_id" text_ops);--> statement-breakpoint
CREATE INDEX "group_travel_states_status_idx" ON "group_travel_states" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "parties_leader_id_idx" ON "parties" USING btree ("leader_id" text_ops);--> statement-breakpoint
CREATE INDEX "parties_status_idx" ON "parties" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "parties_town_id_idx" ON "parties" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "party_members_character_id_idx" ON "party_members" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE INDEX "party_members_character_id_left_at_idx" ON "party_members" USING btree ("character_id" text_ops,"left_at" text_ops);--> statement-breakpoint
CREATE INDEX "party_members_party_id_idx" ON "party_members" USING btree ("party_id" text_ops);--> statement-breakpoint
CREATE INDEX "party_invitations_character_id_status_idx" ON "party_invitations" USING btree ("character_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "party_invitations_party_id_idx" ON "party_invitations" USING btree ("party_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_buy_orders_buyer_id_idx" ON "market_buy_orders" USING btree ("buyer_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "market_buy_orders_buyer_id_listing_id_key" ON "market_buy_orders" USING btree ("buyer_id" text_ops,"listing_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_buy_orders_listing_id_idx" ON "market_buy_orders" USING btree ("listing_id" text_ops);--> statement-breakpoint
CREATE INDEX "market_buy_orders_status_idx" ON "market_buy_orders" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "trade_transactions_auction_cycle_id_idx" ON "trade_transactions" USING btree ("auction_cycle_id" text_ops);--> statement-breakpoint
CREATE INDEX "trade_transactions_buyer_id_created_at_idx" ON "trade_transactions" USING btree ("buyer_id" timestamp_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "trade_transactions_buyer_id_idx" ON "trade_transactions" USING btree ("buyer_id" text_ops);--> statement-breakpoint
CREATE INDEX "trade_transactions_seller_id_created_at_idx" ON "trade_transactions" USING btree ("seller_id" timestamp_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "trade_transactions_seller_id_idx" ON "trade_transactions" USING btree ("seller_id" text_ops);--> statement-breakpoint
CREATE INDEX "trade_transactions_timestamp_idx" ON "trade_transactions" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "trade_transactions_town_id_idx" ON "trade_transactions" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "auction_cycles_town_id_status_idx" ON "auction_cycles" USING btree ("town_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "livestock_building_id_idx" ON "livestock" USING btree ("building_id" text_ops);--> statement-breakpoint
CREATE INDEX "livestock_is_alive_idx" ON "livestock" USING btree ("is_alive" bool_ops);--> statement-breakpoint
CREATE INDEX "livestock_owner_id_idx" ON "livestock" USING btree ("owner_id" text_ops);--> statement-breakpoint
CREATE INDEX "houses_character_id_idx" ON "houses" USING btree ("character_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "houses_character_id_town_id_key" ON "houses" USING btree ("character_id" text_ops,"town_id" text_ops);--> statement-breakpoint
CREATE INDEX "houses_town_id_idx" ON "houses" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "house_storage_house_id_idx" ON "house_storage" USING btree ("house_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "house_storage_house_id_item_template_id_key" ON "house_storage" USING btree ("house_id" text_ops,"item_template_id" text_ops);--> statement-breakpoint
CREATE INDEX "simulation_runs_started_at_idx" ON "simulation_runs" USING btree ("started_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "simulation_runs_status_idx" ON "simulation_runs" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "job_listings_asset_id_idx" ON "job_listings" USING btree ("asset_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "job_listings_asset_id_key" ON "job_listings" USING btree ("asset_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_listings_owner_id_idx" ON "job_listings" USING btree ("owner_id" text_ops);--> statement-breakpoint
CREATE INDEX "job_listings_town_id_status_idx" ON "job_listings" USING btree ("town_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "job_listings_worker_id_idx" ON "job_listings" USING btree ("worker_id" text_ops);--> statement-breakpoint
CREATE INDEX "owned_assets_crop_state_idx" ON "owned_assets" USING btree ("crop_state" text_ops);--> statement-breakpoint
CREATE INDEX "owned_assets_owner_id_idx" ON "owned_assets" USING btree ("owner_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "owned_assets_owner_id_profession_type_tier_slot_number_key" ON "owned_assets" USING btree ("owner_id" text_ops,"profession_type" text_ops,"tier" text_ops,"slot_number" text_ops);--> statement-breakpoint
CREATE INDEX "owned_assets_town_id_idx" ON "owned_assets" USING btree ("town_id" text_ops);--> statement-breakpoint
CREATE INDEX "monsters_level_idx" ON "monsters" USING btree ("level" int4_ops);--> statement-breakpoint
CREATE INDEX "monsters_region_id_idx" ON "monsters" USING btree ("region_id" text_ops);
*/