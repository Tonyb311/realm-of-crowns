-- CreateEnum
CREATE TYPE "Race" AS ENUM ('HUMAN', 'ELF', 'DWARF', 'HALFLING', 'ORC', 'TIEFLING', 'DRAGONBORN', 'HALF_ELF', 'HALF_ORC', 'GNOME', 'MERFOLK', 'BEASTFOLK', 'FAEFOLK', 'GOLIATH', 'DROW', 'FIRBOLG', 'WARFORGED', 'GENASI', 'REVENANT', 'CHANGELING');

-- CreateEnum
CREATE TYPE "RaceTier" AS ENUM ('CORE', 'COMMON', 'EXOTIC');

-- CreateEnum
CREATE TYPE "DraconicAncestry" AS ENUM ('RED', 'BLUE', 'WHITE', 'BLACK', 'GREEN', 'GOLD', 'SILVER');

-- CreateEnum
CREATE TYPE "BeastClan" AS ENUM ('WOLF', 'BEAR', 'FOX', 'HAWK', 'PANTHER', 'BOAR');

-- CreateEnum
CREATE TYPE "ElementalType" AS ENUM ('FIRE', 'WATER', 'EARTH', 'AIR');

-- CreateEnum
CREATE TYPE "RelationStatus" AS ENUM ('ALLIED', 'FRIENDLY', 'NEUTRAL', 'DISTRUSTFUL', 'HOSTILE', 'BLOOD_FEUD');

-- CreateEnum
CREATE TYPE "ProfessionType" AS ENUM ('FARMER', 'RANCHER', 'FISHERMAN', 'LUMBERJACK', 'MINER', 'HERBALIST', 'HUNTER', 'SMELTER', 'BLACKSMITH', 'ARMORER', 'WOODWORKER', 'TANNER', 'LEATHERWORKER', 'TAILOR', 'ALCHEMIST', 'ENCHANTER', 'COOK', 'BREWER', 'JEWELER', 'FLETCHER', 'MASON', 'SCRIBE', 'MERCHANT', 'INNKEEPER', 'HEALER', 'STABLE_MASTER', 'BANKER', 'COURIER', 'MERCENARY_CAPTAIN');

-- CreateEnum
CREATE TYPE "ProfessionCategory" AS ENUM ('GATHERING', 'CRAFTING', 'SERVICE');

-- CreateEnum
CREATE TYPE "ProfessionTier" AS ENUM ('APPRENTICE', 'JOURNEYMAN', 'CRAFTSMAN', 'EXPERT', 'MASTER', 'GRANDMASTER');

-- CreateEnum
CREATE TYPE "BiomeType" AS ENUM ('PLAINS', 'FOREST', 'MOUNTAIN', 'HILLS', 'BADLANDS', 'SWAMP', 'TUNDRA', 'VOLCANIC', 'COASTAL', 'DESERT', 'RIVER', 'UNDERGROUND', 'UNDERWATER', 'FEYWILD');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'TOOL', 'CONSUMABLE', 'MATERIAL', 'ACCESSORY', 'QUEST', 'HOUSING');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('POOR', 'COMMON', 'FINE', 'SUPERIOR', 'MASTERWORK', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ORE', 'WOOD', 'GRAIN', 'HERB', 'FISH', 'HIDE', 'STONE', 'FIBER', 'ANIMAL_PRODUCT', 'REAGENT', 'EXOTIC');

-- CreateEnum
CREATE TYPE "EquipSlot" AS ENUM ('HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'MAIN_HAND', 'OFF_HAND', 'RING_1', 'RING_2', 'NECK', 'BACK');

-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP', 'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY', 'STABLE', 'WAREHOUSE', 'BANK', 'INN', 'MARKET_STALL', 'FARM', 'RANCH', 'MINE');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CombatType" AS ENUM ('PVE', 'PVP', 'DUEL', 'ARENA', 'WAR');

-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('MAYOR', 'RULER', 'GUILD_LEADER');

-- CreateEnum
CREATE TYPE "DiplomacyActionType" AS ENUM ('PROPOSE_TREATY', 'DECLARE_WAR', 'TRADE_AGREEMENT', 'NON_AGGRESSION_PACT', 'ALLIANCE', 'BREAK_TREATY');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('MAIN', 'TOWN', 'DAILY', 'GUILD', 'BOUNTY', 'RACIAL');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('GLOBAL', 'TOWN', 'GUILD', 'PARTY', 'WHISPER', 'TRADE', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "race" "Race" NOT NULL,
    "draconic_ancestry" "DraconicAncestry",
    "beast_clan" "BeastClan",
    "elemental_type" "ElementalType",
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "current_town_id" TEXT,
    "health" INTEGER NOT NULL DEFAULT 100,
    "max_health" INTEGER NOT NULL DEFAULT 100,
    "mana" INTEGER NOT NULL DEFAULT 50,
    "max_mana" INTEGER NOT NULL DEFAULT 50,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_equipment" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "slot" "EquipSlot" NOT NULL,
    "item_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventories" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "slot_position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_professions" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "profession_type" "ProfessionType" NOT NULL,
    "tier" "ProfessionTier" NOT NULL DEFAULT 'APPRENTICE',
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profession_xp" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "profession_type" "ProfessionType" NOT NULL,
    "xp_gained" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profession_xp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "biome" "BiomeType" NOT NULL,
    "level_min" INTEGER NOT NULL DEFAULT 1,
    "level_max" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "towns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "population" INTEGER NOT NULL DEFAULT 0,
    "biome" "BiomeType" NOT NULL,
    "description" TEXT,
    "mayor_id" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "towns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "town_resources" (
    "id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "resource_type" "ResourceType" NOT NULL,
    "abundance" INTEGER NOT NULL DEFAULT 50,
    "respawn_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "town_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_routes" (
    "id" TEXT NOT NULL,
    "from_town_id" TEXT NOT NULL,
    "to_town_id" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "danger_level" INTEGER NOT NULL DEFAULT 1,
    "terrain" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_actions" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_borders" (
    "id" TEXT NOT NULL,
    "region_id_1" TEXT NOT NULL,
    "region_id_2" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'land',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "region_borders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racial_relations" (
    "id" TEXT NOT NULL,
    "race1" "Race" NOT NULL,
    "race2" "Race" NOT NULL,
    "status" "RelationStatus" NOT NULL DEFAULT 'NEUTRAL',
    "modifier" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "racial_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diplomacy_events" (
    "id" TEXT NOT NULL,
    "type" "DiplomacyActionType" NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diplomacy_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wars" (
    "id" TEXT NOT NULL,
    "attacker_kingdom_id" TEXT NOT NULL,
    "defender_kingdom_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exclusive_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "required_races" JSONB NOT NULL DEFAULT '[]',
    "region_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exclusive_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "biome" "BiomeType" NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "base_gather_time" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "rarity" "ItemRarity" NOT NULL DEFAULT 'COMMON',
    "description" TEXT,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "durability" INTEGER NOT NULL DEFAULT 100,
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "profession_required" "ProfessionType",
    "level_required" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "owner_id" TEXT,
    "current_durability" INTEGER NOT NULL DEFAULT 100,
    "quality" "ItemRarity" NOT NULL DEFAULT 'COMMON',
    "crafted_by_id" TEXT,
    "enchantments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profession_type" "ProfessionType" NOT NULL,
    "tier" "ProfessionTier" NOT NULL,
    "ingredients" JSONB NOT NULL DEFAULT '[]',
    "result" TEXT NOT NULL,
    "craft_time" INTEGER NOT NULL DEFAULT 60,
    "xp_reward" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crafting_actions" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "quality" "ItemRarity",
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crafting_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_actions" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gathering_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "type" "BuildingType" NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "storage" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_constructions" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "materials_used" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_constructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_listings" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "town_id" TEXT NOT NULL,
    "listed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_transactions" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "town_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_histories" (
    "id" TEXT NOT NULL,
    "item_template_id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "avg_price" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caravans" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "from_town_id" TEXT NOT NULL,
    "to_town_id" TEXT NOT NULL,
    "cargo" JSONB NOT NULL DEFAULT '[]',
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "departed_at" TIMESTAMP(3),
    "arrives_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caravans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "type" "ElectionType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "winner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_votes" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laws" (
    "id" TEXT NOT NULL,
    "kingdom_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "effects" JSONB NOT NULL DEFAULT '{}',
    "enacted_by_id" TEXT NOT NULL,
    "enacted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kingdoms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruler_id" TEXT,
    "capital_town_id" TEXT,
    "treasury" INTEGER NOT NULL DEFAULT 0,
    "laws" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kingdoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "leader_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "treasury" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_members" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "description" TEXT,
    "objectives" JSONB NOT NULL DEFAULT '[]',
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "level_required" INTEGER NOT NULL DEFAULT 1,
    "region_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_progress" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "quest_id" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "progress" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combat_sessions" (
    "id" TEXT NOT NULL,
    "type" "CombatType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "location_town_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "log" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combat_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combat_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combat_participants" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "team" INTEGER NOT NULL DEFAULT 0,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "current_hp" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monsters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "loot_table" JSONB NOT NULL DEFAULT '[]',
    "region_id" TEXT,
    "biome" "BiomeType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monsters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "channel_type" "MessageChannel" NOT NULL,
    "content" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT,
    "guild_id" TEXT,
    "town_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racial_ability_cooldowns" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "ability_name" TEXT NOT NULL,
    "last_used" TIMESTAMP(3) NOT NULL,
    "cooldown_ends" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "racial_ability_cooldowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changeling_disguises" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "disguised_as" TEXT,
    "disguise_race" "Race",
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "changeling_disguises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warforged_maintenance" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "last_maintenance" TIMESTAMP(3) NOT NULL,
    "condition" INTEGER NOT NULL DEFAULT 100,
    "next_required" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warforged_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "reward" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_achievements" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "characters_user_id_idx" ON "characters"("user_id");

-- CreateIndex
CREATE INDEX "characters_current_town_id_idx" ON "characters"("current_town_id");

-- CreateIndex
CREATE INDEX "characters_race_idx" ON "characters"("race");

-- CreateIndex
CREATE INDEX "character_equipment_character_id_idx" ON "character_equipment"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_equipment_character_id_slot_key" ON "character_equipment"("character_id", "slot");

-- CreateIndex
CREATE INDEX "inventories_character_id_idx" ON "inventories"("character_id");

-- CreateIndex
CREATE INDEX "player_professions_character_id_idx" ON "player_professions"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_professions_character_id_profession_type_key" ON "player_professions"("character_id", "profession_type");

-- CreateIndex
CREATE INDEX "profession_xp_character_id_profession_type_idx" ON "profession_xp"("character_id", "profession_type");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "towns_name_key" ON "towns"("name");

-- CreateIndex
CREATE INDEX "towns_region_id_idx" ON "towns"("region_id");

-- CreateIndex
CREATE INDEX "towns_mayor_id_idx" ON "towns"("mayor_id");

-- CreateIndex
CREATE INDEX "town_resources_town_id_idx" ON "town_resources"("town_id");

-- CreateIndex
CREATE UNIQUE INDEX "town_resources_town_id_resource_type_key" ON "town_resources"("town_id", "resource_type");

-- CreateIndex
CREATE INDEX "travel_routes_from_town_id_idx" ON "travel_routes"("from_town_id");

-- CreateIndex
CREATE INDEX "travel_routes_to_town_id_idx" ON "travel_routes"("to_town_id");

-- CreateIndex
CREATE UNIQUE INDEX "travel_routes_from_town_id_to_town_id_key" ON "travel_routes"("from_town_id", "to_town_id");

-- CreateIndex
CREATE INDEX "travel_actions_character_id_idx" ON "travel_actions"("character_id");

-- CreateIndex
CREATE INDEX "travel_actions_status_idx" ON "travel_actions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "region_borders_region_id_1_region_id_2_key" ON "region_borders"("region_id_1", "region_id_2");

-- CreateIndex
CREATE UNIQUE INDEX "racial_relations_race1_race2_key" ON "racial_relations"("race1", "race2");

-- CreateIndex
CREATE INDEX "diplomacy_events_initiator_id_idx" ON "diplomacy_events"("initiator_id");

-- CreateIndex
CREATE INDEX "diplomacy_events_target_id_idx" ON "diplomacy_events"("target_id");

-- CreateIndex
CREATE INDEX "wars_attacker_kingdom_id_idx" ON "wars"("attacker_kingdom_id");

-- CreateIndex
CREATE INDEX "wars_defender_kingdom_id_idx" ON "wars"("defender_kingdom_id");

-- CreateIndex
CREATE INDEX "wars_status_idx" ON "wars"("status");

-- CreateIndex
CREATE INDEX "exclusive_zones_region_id_idx" ON "exclusive_zones"("region_id");

-- CreateIndex
CREATE UNIQUE INDEX "resources_name_key" ON "resources"("name");

-- CreateIndex
CREATE INDEX "resources_type_idx" ON "resources"("type");

-- CreateIndex
CREATE INDEX "resources_biome_idx" ON "resources"("biome");

-- CreateIndex
CREATE INDEX "item_templates_type_idx" ON "item_templates"("type");

-- CreateIndex
CREATE INDEX "item_templates_rarity_idx" ON "item_templates"("rarity");

-- CreateIndex
CREATE INDEX "items_template_id_idx" ON "items"("template_id");

-- CreateIndex
CREATE INDEX "items_owner_id_idx" ON "items"("owner_id");

-- CreateIndex
CREATE INDEX "items_crafted_by_id_idx" ON "items"("crafted_by_id");

-- CreateIndex
CREATE INDEX "recipes_profession_type_idx" ON "recipes"("profession_type");

-- CreateIndex
CREATE INDEX "recipes_tier_idx" ON "recipes"("tier");

-- CreateIndex
CREATE INDEX "crafting_actions_character_id_idx" ON "crafting_actions"("character_id");

-- CreateIndex
CREATE INDEX "crafting_actions_status_idx" ON "crafting_actions"("status");

-- CreateIndex
CREATE INDEX "gathering_actions_character_id_idx" ON "gathering_actions"("character_id");

-- CreateIndex
CREATE INDEX "gathering_actions_status_idx" ON "gathering_actions"("status");

-- CreateIndex
CREATE INDEX "buildings_owner_id_idx" ON "buildings"("owner_id");

-- CreateIndex
CREATE INDEX "buildings_town_id_idx" ON "buildings"("town_id");

-- CreateIndex
CREATE INDEX "building_constructions_building_id_idx" ON "building_constructions"("building_id");

-- CreateIndex
CREATE INDEX "building_constructions_status_idx" ON "building_constructions"("status");

-- CreateIndex
CREATE INDEX "market_listings_seller_id_idx" ON "market_listings"("seller_id");

-- CreateIndex
CREATE INDEX "market_listings_town_id_idx" ON "market_listings"("town_id");

-- CreateIndex
CREATE INDEX "market_listings_item_id_idx" ON "market_listings"("item_id");

-- CreateIndex
CREATE INDEX "trade_transactions_buyer_id_idx" ON "trade_transactions"("buyer_id");

-- CreateIndex
CREATE INDEX "trade_transactions_seller_id_idx" ON "trade_transactions"("seller_id");

-- CreateIndex
CREATE INDEX "trade_transactions_town_id_idx" ON "trade_transactions"("town_id");

-- CreateIndex
CREATE INDEX "trade_transactions_timestamp_idx" ON "trade_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "price_histories_item_template_id_idx" ON "price_histories"("item_template_id");

-- CreateIndex
CREATE INDEX "price_histories_town_id_idx" ON "price_histories"("town_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_histories_item_template_id_town_id_date_key" ON "price_histories"("item_template_id", "town_id", "date");

-- CreateIndex
CREATE INDEX "caravans_owner_id_idx" ON "caravans"("owner_id");

-- CreateIndex
CREATE INDEX "caravans_status_idx" ON "caravans"("status");

-- CreateIndex
CREATE INDEX "elections_town_id_idx" ON "elections"("town_id");

-- CreateIndex
CREATE INDEX "elections_status_idx" ON "elections"("status");

-- CreateIndex
CREATE INDEX "election_votes_election_id_idx" ON "election_votes"("election_id");

-- CreateIndex
CREATE UNIQUE INDEX "election_votes_election_id_voter_id_key" ON "election_votes"("election_id", "voter_id");

-- CreateIndex
CREATE INDEX "laws_kingdom_id_idx" ON "laws"("kingdom_id");

-- CreateIndex
CREATE UNIQUE INDEX "kingdoms_name_key" ON "kingdoms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "kingdoms_ruler_id_key" ON "kingdoms"("ruler_id");

-- CreateIndex
CREATE UNIQUE INDEX "kingdoms_capital_town_id_key" ON "kingdoms"("capital_town_id");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_tag_key" ON "guilds"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_leader_id_key" ON "guilds"("leader_id");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_idx" ON "guild_members"("guild_id");

-- CreateIndex
CREATE INDEX "guild_members_character_id_idx" ON "guild_members"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "guild_members_guild_id_character_id_key" ON "guild_members"("guild_id", "character_id");

-- CreateIndex
CREATE INDEX "quests_type_idx" ON "quests"("type");

-- CreateIndex
CREATE INDEX "quests_region_id_idx" ON "quests"("region_id");

-- CreateIndex
CREATE INDEX "quest_progress_character_id_idx" ON "quest_progress"("character_id");

-- CreateIndex
CREATE INDEX "quest_progress_quest_id_idx" ON "quest_progress"("quest_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_progress_character_id_quest_id_key" ON "quest_progress"("character_id", "quest_id");

-- CreateIndex
CREATE INDEX "combat_sessions_status_idx" ON "combat_sessions"("status");

-- CreateIndex
CREATE INDEX "combat_sessions_location_town_id_idx" ON "combat_sessions"("location_town_id");

-- CreateIndex
CREATE INDEX "combat_logs_session_id_idx" ON "combat_logs"("session_id");

-- CreateIndex
CREATE INDEX "combat_logs_session_id_round_idx" ON "combat_logs"("session_id", "round");

-- CreateIndex
CREATE INDEX "combat_participants_session_id_idx" ON "combat_participants"("session_id");

-- CreateIndex
CREATE INDEX "combat_participants_character_id_idx" ON "combat_participants"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "combat_participants_session_id_character_id_key" ON "combat_participants"("session_id", "character_id");

-- CreateIndex
CREATE INDEX "monsters_region_id_idx" ON "monsters"("region_id");

-- CreateIndex
CREATE INDEX "monsters_level_idx" ON "monsters"("level");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_recipient_id_idx" ON "messages"("recipient_id");

-- CreateIndex
CREATE INDEX "messages_guild_id_idx" ON "messages"("guild_id");

-- CreateIndex
CREATE INDEX "messages_town_id_idx" ON "messages"("town_id");

-- CreateIndex
CREATE INDEX "messages_channel_type_timestamp_idx" ON "messages"("channel_type", "timestamp");

-- CreateIndex
CREATE INDEX "notifications_character_id_idx" ON "notifications"("character_id");

-- CreateIndex
CREATE INDEX "notifications_character_id_read_idx" ON "notifications"("character_id", "read");

-- CreateIndex
CREATE INDEX "racial_ability_cooldowns_character_id_idx" ON "racial_ability_cooldowns"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "racial_ability_cooldowns_character_id_ability_name_key" ON "racial_ability_cooldowns"("character_id", "ability_name");

-- CreateIndex
CREATE UNIQUE INDEX "changeling_disguises_character_id_key" ON "changeling_disguises"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "warforged_maintenance_character_id_key" ON "warforged_maintenance"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "player_achievements_character_id_idx" ON "player_achievements"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_achievements_character_id_achievement_id_key" ON "player_achievements"("character_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_current_town_id_fkey" FOREIGN KEY ("current_town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_professions" ADD CONSTRAINT "player_professions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profession_xp" ADD CONSTRAINT "profession_xp_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towns" ADD CONSTRAINT "towns_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towns" ADD CONSTRAINT "towns_mayor_id_fkey" FOREIGN KEY ("mayor_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "town_resources" ADD CONSTRAINT "town_resources_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_routes" ADD CONSTRAINT "travel_routes_from_town_id_fkey" FOREIGN KEY ("from_town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_routes" ADD CONSTRAINT "travel_routes_to_town_id_fkey" FOREIGN KEY ("to_town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_actions" ADD CONSTRAINT "travel_actions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_actions" ADD CONSTRAINT "travel_actions_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "travel_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_borders" ADD CONSTRAINT "region_borders_region_id_1_fkey" FOREIGN KEY ("region_id_1") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_borders" ADD CONSTRAINT "region_borders_region_id_2_fkey" FOREIGN KEY ("region_id_2") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diplomacy_events" ADD CONSTRAINT "diplomacy_events_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diplomacy_events" ADD CONSTRAINT "diplomacy_events_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wars" ADD CONSTRAINT "wars_attacker_kingdom_id_fkey" FOREIGN KEY ("attacker_kingdom_id") REFERENCES "kingdoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wars" ADD CONSTRAINT "wars_defender_kingdom_id_fkey" FOREIGN KEY ("defender_kingdom_id") REFERENCES "kingdoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exclusive_zones" ADD CONSTRAINT "exclusive_zones_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_crafted_by_id_fkey" FOREIGN KEY ("crafted_by_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crafting_actions" ADD CONSTRAINT "crafting_actions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crafting_actions" ADD CONSTRAINT "crafting_actions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gathering_actions" ADD CONSTRAINT "gathering_actions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gathering_actions" ADD CONSTRAINT "gathering_actions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gathering_actions" ADD CONSTRAINT "gathering_actions_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_constructions" ADD CONSTRAINT "building_constructions_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_item_template_id_fkey" FOREIGN KEY ("item_template_id") REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_from_town_id_fkey" FOREIGN KEY ("from_town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_to_town_id_fkey" FOREIGN KEY ("to_town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_votes" ADD CONSTRAINT "election_votes_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_votes" ADD CONSTRAINT "election_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laws" ADD CONSTRAINT "laws_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "kingdoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laws" ADD CONSTRAINT "laws_enacted_by_id_fkey" FOREIGN KEY ("enacted_by_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kingdoms" ADD CONSTRAINT "kingdoms_ruler_id_fkey" FOREIGN KEY ("ruler_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combat_sessions" ADD CONSTRAINT "combat_sessions_location_town_id_fkey" FOREIGN KEY ("location_town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combat_logs" ADD CONSTRAINT "combat_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "combat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combat_participants" ADD CONSTRAINT "combat_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "combat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combat_participants" ADD CONSTRAINT "combat_participants_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monsters" ADD CONSTRAINT "monsters_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racial_ability_cooldowns" ADD CONSTRAINT "racial_ability_cooldowns_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changeling_disguises" ADD CONSTRAINT "changeling_disguises_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warforged_maintenance" ADD CONSTRAINT "warforged_maintenance_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
