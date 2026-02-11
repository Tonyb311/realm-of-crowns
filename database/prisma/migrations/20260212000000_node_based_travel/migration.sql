-- Node-Based Travel System Migration
-- Replaces old Node/NodeConnection/TravelAction models with new linear route system

-- ============================================================
-- Step 1: Drop old tables (order matters for FK constraints)
-- ============================================================

DROP TABLE IF EXISTS "travel_actions" CASCADE;
DROP TABLE IF EXISTS "node_connections" CASCADE;
DROP TABLE IF EXISTS "nodes" CASCADE;

-- Drop NodeType enum
DROP TYPE IF EXISTS "NodeType" CASCADE;

-- ============================================================
-- Step 2: Modify characters table
-- ============================================================

-- Remove old node reference
ALTER TABLE "characters" DROP COLUMN IF EXISTS "current_node_id";

-- Add travel status
ALTER TABLE "characters" ADD COLUMN "travel_status" TEXT NOT NULL DEFAULT 'idle';

-- Index on travel status
CREATE INDEX "characters_travel_status_idx" ON "characters"("travel_status");

-- ============================================================
-- Step 3: Modify travel_routes table
-- ============================================================

-- Add new columns
ALTER TABLE "travel_routes" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "travel_routes" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "travel_routes" ADD COLUMN "node_count" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "travel_routes" ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'moderate';
ALTER TABLE "travel_routes" ADD COLUMN "is_released" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "travel_routes" ADD COLUMN "bidirectional" BOOLEAN NOT NULL DEFAULT true;

-- Drop old distance column
ALTER TABLE "travel_routes" DROP COLUMN IF EXISTS "distance";

-- Index on is_released
CREATE INDEX "travel_routes_is_released_idx" ON "travel_routes"("is_released");

-- ============================================================
-- Step 4: Create new tables
-- ============================================================

-- TravelNode
CREATE TABLE "travel_nodes" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "node_index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "terrain" TEXT NOT NULL,
    "danger_level" INTEGER NOT NULL DEFAULT 3,
    "special_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_nodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "travel_nodes_route_id_node_index_key" ON "travel_nodes"("route_id", "node_index");
CREATE INDEX "travel_nodes_route_id_idx" ON "travel_nodes"("route_id");
ALTER TABLE "travel_nodes" ADD CONSTRAINT "travel_nodes_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "travel_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TravelGroup
CREATE TABLE "travel_groups" (
    "id" TEXT NOT NULL,
    "leader_id" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "max_size" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "travel_groups_leader_id_idx" ON "travel_groups"("leader_id");
CREATE INDEX "travel_groups_status_idx" ON "travel_groups"("status");
ALTER TABLE "travel_groups" ADD CONSTRAINT "travel_groups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TravelGroupMember
CREATE TABLE "travel_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "travel_group_members_group_id_character_id_key" ON "travel_group_members"("group_id", "character_id");
CREATE INDEX "travel_group_members_character_id_idx" ON "travel_group_members"("character_id");
ALTER TABLE "travel_group_members" ADD CONSTRAINT "travel_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "travel_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "travel_group_members" ADD CONSTRAINT "travel_group_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CharacterTravelState
CREATE TABLE "character_travel_states" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "current_node_index" INTEGER NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'forward',
    "speed_modifier" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_tick_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'traveling',

    CONSTRAINT "character_travel_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "character_travel_states_character_id_key" ON "character_travel_states"("character_id");
CREATE INDEX "character_travel_states_status_idx" ON "character_travel_states"("status");
CREATE INDEX "character_travel_states_route_id_current_node_index_idx" ON "character_travel_states"("route_id", "current_node_index");
ALTER TABLE "character_travel_states" ADD CONSTRAINT "character_travel_states_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "character_travel_states" ADD CONSTRAINT "character_travel_states_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "travel_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GroupTravelState
CREATE TABLE "group_travel_states" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "current_node_index" INTEGER NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'forward',
    "speed_modifier" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_tick_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'traveling',

    CONSTRAINT "group_travel_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "group_travel_states_group_id_key" ON "group_travel_states"("group_id");
CREATE INDEX "group_travel_states_status_idx" ON "group_travel_states"("status");
ALTER TABLE "group_travel_states" ADD CONSTRAINT "group_travel_states_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "travel_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_travel_states" ADD CONSTRAINT "group_travel_states_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "travel_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Step 5: Update existing route data with node counts and release status
-- ============================================================

-- Set is_released = true for routes where both towns are released
UPDATE "travel_routes" tr
SET "is_released" = true
FROM "towns" t1, "towns" t2
WHERE tr."from_town_id" = t1."id"
  AND tr."to_town_id" = t2."id"
  AND t1."is_released" = true
  AND t2."is_released" = true;

-- ============================================================
-- Step 6: Route names, descriptions, node counts, and travel node seed data
-- Auto-generated by scripts/generate-travel-seed.ts
-- ============================================================

-- Seed data is appended via: npx tsx scripts/generate-travel-seed.ts
-- See scripts/generate-travel-seed.ts for the source data and generation logic.
-- The SQL below covers 116 routes with ~1028 travel nodes across all regions.
-- ============================================================
-- Step 6: Route names, descriptions, node counts, and travel nodes
-- Auto-generated by scripts/generate-travel-seed.ts
-- ============================================================

-- Kingshold <-> Millhaven: The Granary Road
UPDATE "travel_routes" SET "name" = 'The Granary Road', "description" = 'A well-maintained road through golden wheat fields connecting the capital to its breadbasket.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Millhaven'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Millhaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Shepherd''s Rest', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Millstone Hill', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Barley Flats', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Barley Flats', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Millstone Hill', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Shepherd''s Rest', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Kingshold';

-- Kingshold <-> Bridgewater: Crown Bridge Way
UPDATE "travel_routes" SET "name" = 'Crown Bridge Way', "description" = 'The royal road leading from Kingshold to the river crossing at Bridgewater.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cricket Hollow', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Windswept Field', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Harvest Crossroads', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Harvest Crossroads', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Windswept Field', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cricket Hollow', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Kingshold';

-- Kingshold <-> Ironford: The Hill Road
UPDATE "travel_routes" SET "name" = 'The Hill Road', "description" = 'A winding road that climbs through rolling hills toward the mining outpost of Ironford.', "node_count" = 4, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ironford'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ironford') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'War Monument', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dust Storm Pass', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Bone Valley', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Skull Road', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Skull Road', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Bone Valley', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dust Storm Pass', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'War Monument', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Kingshold';

-- Kingshold <-> Whitefield: Cotton Trail
UPDATE "travel_routes" SET "name" = 'Cotton Trail', "description" = 'A pleasant road through cotton and flax fields, fragrant with wildflowers in season.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Whitefield'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Whitefield') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Driftwood Cove', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Whitefield';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Salt Spray Lookout', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Whitefield';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Fisher''s Rest', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Whitefield';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Fisher''s Rest', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whitefield' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Salt Spray Lookout', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whitefield' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Driftwood Cove', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whitefield' AND t2.name = 'Kingshold';

-- Millhaven <-> Whitefield: The Harvest Path
UPDATE "travel_routes" SET "name" = 'The Harvest Path', "description" = 'A short farm path connecting two agricultural communities.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Millhaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Whitefield'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Whitefield') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Millhaven'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Sunlit Vale', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Whitefield';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Stone Marker', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Whitefield';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stone Marker', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whitefield' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sunlit Vale', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whitefield' AND t2.name = 'Millhaven';

-- Bridgewater <-> Ironford: River-to-Hills Trail
UPDATE "travel_routes" SET "name" = 'River-to-Hills Trail', "description" = 'A trail that follows the river upstream before climbing into the hills.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ironford'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ironford') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Farmstead Gate', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Oxbow Bend', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Rolling Green', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Rolling Green', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Oxbow Bend', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Farmstead Gate', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Bridgewater';

-- Aelindra <-> Moonhaven: The Moonlit Way
UPDATE "travel_routes" SET "name" = 'The Moonlit Way', "description" = 'An ancient elven path through deep forest where moonlight filters through silver leaves.', "node_count" = 4, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Moonhaven'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Moonhaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Kelp Cathedral', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Moonhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Bioluminescent Trench', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Moonhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Sand Dollar Plain', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Moonhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Current Highway', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Moonhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Current Highway', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonhaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sand Dollar Plain', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonhaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Bioluminescent Trench', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonhaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Kelp Cathedral', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonhaven' AND t2.name = 'Aelindra';

-- Aelindra <-> Thornwatch: The Sentinel Path
UPDATE "travel_routes" SET "name" = 'The Sentinel Path', "description" = 'A well-guarded trail to the forest border fortress, marked by living tree sentinels.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Heartwood Gate', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Moonbeam Clearing', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Whispering Canopy', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Whispering Canopy', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Moonbeam Clearing', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Heartwood Gate', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Aelindra';

-- Aelindra <-> Willowmere: Lakeside Passage
UPDATE "travel_routes" SET "name" = 'Lakeside Passage', "description" = 'A peaceful path along crystal-clear lakes where willows trail their branches in the water.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Willowmere'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Willowmere') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Barley Flats', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Willowmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Millstone Hill', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Willowmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Shepherd''s Rest', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Willowmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Shepherd''s Rest', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Willowmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Millstone Hill', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Willowmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Barley Flats', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Willowmere' AND t2.name = 'Aelindra';

-- Aelindra <-> Eldergrove: The Sacred Way
UPDATE "travel_routes" SET "name" = 'The Sacred Way', "description" = 'The oldest road in Silverwood, its stones placed by the first elves millennia ago.', "node_count" = 4, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Root Tunnel', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Owl Roost', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Ring', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Thornwall Passage', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thornwall Passage', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Mushroom Ring', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Owl Roost', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Root Tunnel', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Aelindra';

-- Moonhaven <-> Eldergrove: Deep Forest Trail
UPDATE "travel_routes" SET "name" = 'Deep Forest Trail', "description" = 'A winding path through ancient groves where the trees grow so thick the sky disappears.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Moonhaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Moonhaven'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Fallen Giant', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonhaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thornwall Passage', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonhaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Ring', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonhaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Mushroom Ring', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Moonhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thornwall Passage', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Moonhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Fallen Giant', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Moonhaven';

-- Thornwatch <-> Willowmere: Forest Edge Walk
UPDATE "travel_routes" SET "name" = 'Forest Edge Walk', "description" = 'A gentle path skirting the forest edge with views of both woodland and meadow.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Willowmere'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Willowmere') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dappled Glade', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Willowmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Silver Birch Stand', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 2, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Willowmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Silver Birch Stand', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 2, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Willowmere' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dappled Glade', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Willowmere' AND t2.name = 'Thornwatch';

-- Kazad-Vorn <-> Deepvein: The Undermarch
UPDATE "travel_routes" SET "name" = 'The Undermarch', "description" = 'A broad tunnel highway hewn through solid granite, connecting the capital to the deepest mines.', "node_count" = 4, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Deepvein'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Deepvein') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Deep Blue', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Deepvein';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Pearl Beds', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 4, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Deepvein';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Jellyfish Canopy', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Deepvein';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Whale Song Crossing', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Deepvein';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Whale Song Crossing', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Deepvein' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Jellyfish Canopy', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Deepvein' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Pearl Beds', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 4, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Deepvein' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Deep Blue', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Deepvein' AND t2.name = 'Kazad-Vorn';

-- Kazad-Vorn <-> Hammerfall: Ironpeak Pass
UPDATE "travel_routes" SET "name" = 'Ironpeak Pass', "description" = 'A narrow mountain pass between twin iron-streaked peaks.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thunder Step', 'The wind screams through a natural gap in the rock, strong enough to stagger an unwary traveler.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Iron Ridge', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 4, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Goat Trail', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 3, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Goat Trail', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 3, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Iron Ridge', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 4, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Thunder Step', 'The wind screams through a natural gap in the rock, strong enough to stagger an unwary traveler.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kazad-Vorn';

-- Kazad-Vorn <-> Gemhollow: The Jeweled Corridor
UPDATE "travel_routes" SET "name" = 'The Jeweled Corridor', "description" = 'A wide cavern road with walls sparkling with exposed veins of precious stones.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Gemhollow'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Gemhollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dripping Gallery', 'An underground lake of impossible clarity reflects the cavern ceiling like a dark mirror.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Gemhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Forge Light Junction', 'Rails and minecart tracks crisscross the floor. The distant clatter of ore carts echoes from branching tunnels.', 'underground', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Gemhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'The Narrows', 'Thousands of glowworms cling to the ceiling, creating a false starscape of green and gold pinpoints.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Gemhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'The Narrows', 'Thousands of glowworms cling to the ceiling, creating a false starscape of green and gold pinpoints.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gemhollow' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Forge Light Junction', 'Rails and minecart tracks crisscross the floor. The distant clatter of ore carts echoes from branching tunnels.', 'underground', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gemhollow' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dripping Gallery', 'An underground lake of impossible clarity reflects the cavern ceiling like a dark mirror.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gemhollow' AND t2.name = 'Kazad-Vorn';

-- Kazad-Vorn <-> Alehearth: The Hearthstone Road
UPDATE "travel_routes" SET "name" = 'The Hearthstone Road', "description" = 'A short valley road to the cozy brewing town, fragrant with roasting barley.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cricket Hollow', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Grazing Commons', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Grazing Commons', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cricket Hollow', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Kazad-Vorn';

-- Deepvein <-> Gemhollow: The Blind Descent
UPDATE "travel_routes" SET "name" = 'The Blind Descent', "description" = 'A perilous tunnel through unstable rock where cave-ins are ever-present danger.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Deepvein') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Gemhollow'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Gemhollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Deepvein'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'The Dark Mile', 'Rails and minecart tracks crisscross the floor. The distant clatter of ore carts echoes from branching tunnels.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Deepvein' AND t2.name = 'Gemhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Echoing Hall', 'An underground lake of impossible clarity reflects the cavern ceiling like a dark mirror.', 'underground', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Deepvein' AND t2.name = 'Gemhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Crystal Chamber', 'An enormous cavern filled with giant fungi, some taller than houses. Their bioluminescence bathes everything in pale blue.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Deepvein' AND t2.name = 'Gemhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Crystal Chamber', 'An enormous cavern filled with giant fungi, some taller than houses. Their bioluminescence bathes everything in pale blue.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gemhollow' AND t2.name = 'Deepvein';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Echoing Hall', 'An underground lake of impossible clarity reflects the cavern ceiling like a dark mirror.', 'underground', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gemhollow' AND t2.name = 'Deepvein';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'The Dark Mile', 'Rails and minecart tracks crisscross the floor. The distant clatter of ore carts echoes from branching tunnels.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gemhollow' AND t2.name = 'Deepvein';

-- Hammerfall <-> Alehearth: The Switchback Trail
UPDATE "travel_routes" SET "name" = 'The Switchback Trail', "description" = 'A winding mountain trail zigzagging from the fortress to the valley floor.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stone Sentinel', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Avalanche Scar', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Frozen Switchback', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Frozen Switchback', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Avalanche Scar', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Stone Sentinel', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Hammerfall';

-- Hearthshire <-> Greenhollow: Cobblestone Lane
UPDATE "travel_routes" SET "name" = 'Cobblestone Lane', "description" = 'A well-kept cobblestone road through picturesque halfling countryside.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Greenhollow'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Greenhollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Grazing Commons', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Stone Marker', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stone Marker', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Grazing Commons', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Hearthshire';

-- Hearthshire <-> Peddler's Rest: The Market Road
UPDATE "travel_routes" SET "name" = 'The Market Road', "description" = 'A busy trade road connecting the halfling capital to the merchant hub.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Hawk''s Perch', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wildflower Meadow', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Wildflower Meadow', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Hawk''s Perch', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Hearthshire';

-- Hearthshire <-> Bramblewood: Country Lane
UPDATE "travel_routes" SET "name" = 'Country Lane', "description" = 'A winding lane through berry hedgerows and orchards.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bramblewood'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bramblewood') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Hawk''s Perch', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bramblewood';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wildflower Meadow', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bramblewood';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Barley Flats', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bramblewood';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Barley Flats', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bramblewood' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wildflower Meadow', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bramblewood' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Hawk''s Perch', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bramblewood' AND t2.name = 'Hearthshire';

-- Hearthshire <-> Riverside: Riverside Path
UPDATE "travel_routes" SET "name" = 'Riverside Path', "description" = 'A pleasant riverside walk connecting two peaceful communities.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Riverside'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Riverside') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Barley Flats', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wildflower Meadow', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Wildflower Meadow', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Barley Flats', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Hearthshire';

-- Peddler's Rest <-> Riverside: Trader's Shortcut
UPDATE "travel_routes" SET "name" = 'Trader''s Shortcut', "description" = 'A well-worn path between the merchant town and the fishing village.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Riverside'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Riverside') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Harvest Crossroads', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Harvest Crossroads', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Peddler''s Rest';

-- Greenhollow <-> Bramblewood: Farm Trail
UPDATE "travel_routes" SET "name" = 'Farm Trail', "description" = 'A quiet trail through vegetable gardens and flower meadows.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Greenhollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bramblewood'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bramblewood') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Greenhollow'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cricket Hollow', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 2, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Bramblewood';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Grazing Commons', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Bramblewood';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Grazing Commons', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bramblewood' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cricket Hollow', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 2, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bramblewood' AND t2.name = 'Greenhollow';

-- Grakthar <-> Bonepile: The Skull Road
UPDATE "travel_routes" SET "name" = 'The Skull Road', "description" = 'A dusty track through the wastes, lined with the bones of fallen beasts.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bonepile'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bonepile') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Harvest Crossroads', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Bonepile';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Golden Mile', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Bonepile';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Shepherd''s Rest', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Bonepile';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Shepherd''s Rest', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bonepile' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Golden Mile', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bonepile' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Harvest Crossroads', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bonepile' AND t2.name = 'Grakthar';

-- Grakthar <-> Ironfist Hold: Volcanic Trail
UPDATE "travel_routes" SET "name" = 'Volcanic Trail', "description" = 'A treacherous path across active lava fields and smoking vents.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ironfist Hold'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ironfist Hold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Molten River Ford', 'A field of black volcanic glass stretches ahead, razor-sharp edges gleaming in the red light.', 'volcanic', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Ironfist Hold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Flame Geyser Walk', 'Steam and sulfurous gas jet from vents in the ground. The air stings the eyes and throat.', 'volcanic', 6, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Ironfist Hold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Scorched Pass', 'A natural bridge of cooled lava spans a river of magma. Its surface is still warm to the touch.', 'volcanic', 6, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Ironfist Hold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Caldera Edge', 'Fine volcanic ash falls like grey snow, coating everything. The sky is perpetually hazy.', 'volcanic', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Ironfist Hold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Caldera Edge', 'Fine volcanic ash falls like grey snow, coating everything. The sky is perpetually hazy.', 'volcanic', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironfist Hold' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Scorched Pass', 'A natural bridge of cooled lava spans a river of magma. Its surface is still warm to the touch.', 'volcanic', 6, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironfist Hold' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Flame Geyser Walk', 'Steam and sulfurous gas jet from vents in the ground. The air stings the eyes and throat.', 'volcanic', 6, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironfist Hold' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Molten River Ford', 'A field of black volcanic glass stretches ahead, razor-sharp edges gleaming in the red light.', 'volcanic', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironfist Hold' AND t2.name = 'Grakthar';

-- Grakthar <-> Thornback Camp: War Road
UPDATE "travel_routes" SET "name" = 'War Road', "description" = 'A broad road built for marching armies, packed hard by generations of orc boots.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornback Camp'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornback Camp') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Thornback Camp';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Shepherd''s Rest', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Thornback Camp';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Millstone Hill', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Thornback Camp';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Millstone Hill', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornback Camp' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Shepherd''s Rest', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornback Camp' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornback Camp' AND t2.name = 'Grakthar';

-- Grakthar <-> Ashen Market: The Ash Way
UPDATE "travel_routes" SET "name" = 'The Ash Way', "description" = 'A short, well-traveled road to the border trading post.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Hawk''s Perch', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wildflower Meadow', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Wildflower Meadow', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Hawk''s Perch', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Grakthar';

-- Bonepile <-> Ironfist Hold: Scorched Path
UPDATE "travel_routes" SET "name" = 'Scorched Path', "description" = 'A dangerous trail through the hottest part of the wastes.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bonepile') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ironfist Hold'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ironfist Hold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bonepile'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Scorpion Nest', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bonepile' AND t2.name = 'Ironfist Hold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Desolation Point', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bonepile' AND t2.name = 'Ironfist Hold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Skull Road', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bonepile' AND t2.name = 'Ironfist Hold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Skull Road', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironfist Hold' AND t2.name = 'Bonepile';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Desolation Point', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironfist Hold' AND t2.name = 'Bonepile';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Scorpion Nest', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironfist Hold' AND t2.name = 'Bonepile';

-- Thornback Camp <-> Ashen Market: Border Trail
UPDATE "travel_routes" SET "name" = 'Border Trail', "description" = 'A contested trail near the edge of orc territory.', "node_count" = 2, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornback Camp') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornback Camp'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Skull Road', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornback Camp' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Desolation Point', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornback Camp' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Desolation Point', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornback Camp';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Skull Road', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornback Camp';

-- Nethermire <-> Boghollow: The Rotting Boardwalk
UPDATE "travel_routes" SET "name" = 'The Rotting Boardwalk', "description" = 'Creaking wooden planks over bottomless bog, maintained by nethkin alchemists.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Boghollow'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Boghollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stinking Pool', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 5, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Boghollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dead Tree Stand', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Boghollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mud Flats', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Boghollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Will-o-Wisp Crossing', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 5, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Boghollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Will-o-Wisp Crossing', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 5, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Boghollow' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Mud Flats', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Boghollow' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dead Tree Stand', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Boghollow' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Stinking Pool', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 5, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Boghollow' AND t2.name = 'Nethermire';

-- Nethermire <-> Mistwatch: The Hidden Way
UPDATE "travel_routes" SET "name" = 'The Hidden Way', "description" = 'A secret path through dense fog, known only to the marsh-dwellers.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Reed Maze', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Gaslight Passage', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Bank', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Mushroom Bank', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Gaslight Passage', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Reed Maze', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Nethermire';

-- Nethermire <-> Cinderkeep: Swamp Trail
UPDATE "travel_routes" SET "name" = 'Swamp Trail', "description" = 'A treacherous route through the deepest, most toxic sections of the marsh.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Cinderkeep'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Cinderkeep') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Sand Dollar Plain', 'A canopy of translucent jellyfish drifts overhead, their trailing tentacles creating a shimmering curtain.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Current Highway', 'Oyster beds cover the sea floor, occasionally revealing the gleam of a natural pearl.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Shipwreck Pass', 'The water deepens suddenly. Below is only endless blue fading to black. The pressure builds noticeably.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Anemone Forest', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Anemone Forest', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Shipwreck Pass', 'The water deepens suddenly. Below is only endless blue fading to black. The pressure builds noticeably.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Current Highway', 'Oyster beds cover the sea floor, occasionally revealing the gleam of a natural pearl.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Sand Dollar Plain', 'A canopy of translucent jellyfish drifts overhead, their trailing tentacles creating a shimmering curtain.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Nethermire';

-- Nethermire <-> Whispering Docks: Waterway Path
UPDATE "travel_routes" SET "name" = 'Waterway Path', "description" = 'A partially submerged path following dark water channels.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Whispering Docks'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Whispering Docks') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Shepherd''s Rest', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Whispering Docks';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Golden Mile', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Whispering Docks';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Harvest Crossroads', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Whispering Docks';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Harvest Crossroads', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whispering Docks' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Golden Mile', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whispering Docks' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Shepherd''s Rest', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whispering Docks' AND t2.name = 'Nethermire';

-- Boghollow <-> Cinderkeep: Deep Swamp Crossing
UPDATE "travel_routes" SET "name" = 'Deep Swamp Crossing', "description" = 'A miserable slog through waist-deep muck and stinging insects.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Boghollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Cinderkeep'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Cinderkeep') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Boghollow'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Whale Song Crossing', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Boghollow' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Abyssal Gate', 'A flat expanse of white sand dotted with sand dollars and sea stars. The water is remarkably clear here.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Boghollow' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Starfish Meadow', 'The walls of the trench glow with bioluminescent organisms, painting the darkness in blue and green fire.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Boghollow' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Starfish Meadow', 'The walls of the trench glow with bioluminescent organisms, painting the darkness in blue and green fire.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Boghollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Abyssal Gate', 'A flat expanse of white sand dotted with sand dollars and sea stars. The water is remarkably clear here.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Boghollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Whale Song Crossing', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Boghollow';

-- Mistwatch <-> Whispering Docks: Marsh Edge Walk
UPDATE "travel_routes" SET "name" = 'Marsh Edge Walk', "description" = 'A relatively dry path along the marsh periphery.', "node_count" = 2, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Whispering Docks'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Whispering Docks') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Leech Hollow', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Whispering Docks';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Mire Bridge', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Whispering Docks';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Mire Bridge', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whispering Docks' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Leech Hollow', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Whispering Docks' AND t2.name = 'Mistwatch';

-- Drakenspire <-> Frostfang: The Frost Road
UPDATE "travel_routes" SET "name" = 'The Frost Road', "description" = 'A treacherous ice-covered road through howling tundra.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Frostfang'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Frostfang') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Glacier Edge', 'A shallow cave in a snowbank offers shelter from the wind. Previous travelers left a stack of firewood.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Snow Blind Pass', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Wind-Scoured Ridge', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Permafrost Plain', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Permafrost Plain', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wind-Scoured Ridge', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Snow Blind Pass', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Glacier Edge', 'A shallow cave in a snowbank offers shelter from the wind. Previous travelers left a stack of firewood.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Drakenspire';

-- Drakenspire <-> Emberpeak: Volcanic Ascent
UPDATE "travel_routes" SET "name" = 'Volcanic Ascent', "description" = 'A path between fire and ice, skirting active volcanic vents.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Emberpeak'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Emberpeak') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cinder Path', 'Geysers of super-heated water erupt on a regular schedule. Timing the crossing is essential.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Emberpeak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Basalt Columns', 'The ground crunches with cinder and ash. Thin streams of lava glow orange in cracks underfoot.', 'volcanic', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Emberpeak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Molten River Ford', 'A river of molten rock must be crossed on a narrow stone bridge. The heat is nearly unbearable.', 'volcanic', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Emberpeak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Flame Geyser Walk', 'A field of black volcanic glass stretches ahead, razor-sharp edges gleaming in the red light.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Emberpeak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Flame Geyser Walk', 'A field of black volcanic glass stretches ahead, razor-sharp edges gleaming in the red light.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Molten River Ford', 'A river of molten rock must be crossed on a narrow stone bridge. The heat is nearly unbearable.', 'volcanic', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Basalt Columns', 'The ground crunches with cinder and ash. Thin streams of lava glow orange in cracks underfoot.', 'volcanic', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cinder Path', 'Geysers of super-heated water erupt on a regular schedule. Timing the crossing is essential.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Drakenspire';

-- Drakenspire <-> Scalehaven: The Dragon Descent
UPDATE "travel_routes" SET "name" = 'The Dragon Descent', "description" = 'A long switchback road descending from the peaks to the coastal settlement.', "node_count" = 5, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Scalehaven'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Scalehaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stone Sentinel', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 3, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Granite Shelf', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cloud Walker''s Rest', 'The wind screams through a natural gap in the rock, strong enough to stagger an unwary traveler.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cliff Face Traverse', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Boulder Garden', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Boulder Garden', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cliff Face Traverse', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cloud Walker''s Rest', 'The wind screams through a natural gap in the rock, strong enough to stagger an unwary traveler.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Granite Shelf', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Stone Sentinel', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 3, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Drakenspire';

-- Drakenspire <-> Wyrmrest: The Ancient Road
UPDATE "travel_routes" SET "name" = 'The Ancient Road', "description" = 'A road of cracked obsidian leading to the legendary dragon burial grounds.', "node_count" = 5, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Wyrmrest'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Wyrmrest') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Scavenger''s Perch', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'War Monument', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dust Storm Pass', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Bone Valley', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Skull Road', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Skull Road', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Bone Valley', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dust Storm Pass', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'War Monument', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Scavenger''s Perch', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Drakenspire';

-- Frostfang <-> Wyrmrest: Tundra Crossing
UPDATE "travel_routes" SET "name" = 'Tundra Crossing', "description" = 'A bleak path across frozen wastes where blizzards can strike without warning.', "node_count" = 4, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Frostfang') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Wyrmrest'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Wyrmrest') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Frostfang'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Wind-Scoured Ridge', 'An endless expanse of white stretches in every direction. The cold is a physical force, pressing against exposed skin.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Snow Blind Pass', 'A shallow cave in a snowbank offers shelter from the wind. Previous travelers left a stack of firewood.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Glacier Edge', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Frost Cairn', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Wyrmrest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Frost Cairn', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Glacier Edge', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Snow Blind Pass', 'A shallow cave in a snowbank offers shelter from the wind. Previous travelers left a stack of firewood.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Wind-Scoured Ridge', 'An endless expanse of white stretches in every direction. The cold is a physical force, pressing against exposed skin.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Wyrmrest' AND t2.name = 'Frostfang';

-- Emberpeak <-> Scalehaven: Coastal Descent
UPDATE "travel_routes" SET "name" = 'Coastal Descent', "description" = 'A winding path from volcanic highlands to the sheltered coast.', "node_count" = 4, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Emberpeak') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Scalehaven'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Scalehaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Emberpeak'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Magma Bridge', 'Steam and sulfurous gas jet from vents in the ground. The air stings the eyes and throat.', 'volcanic', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Smoke Vent', 'A natural bridge of cooled lava spans a river of magma. Its surface is still warm to the touch.', 'volcanic', 4, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Obsidian Field', 'Fine volcanic ash falls like grey snow, coating everything. The sky is perpetually hazy.', 'volcanic', 4, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Lava Flow Crossing', 'The blackened skeletons of trees stand in rows, killed by a lava flow that has since cooled and hardened.', 'volcanic', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberpeak' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Lava Flow Crossing', 'The blackened skeletons of trees stand in rows, killed by a lava flow that has since cooled and hardened.', 'volcanic', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Emberpeak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Obsidian Field', 'Fine volcanic ash falls like grey snow, coating everything. The sky is perpetually hazy.', 'volcanic', 4, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Emberpeak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Smoke Vent', 'A natural bridge of cooled lava spans a river of magma. Its surface is still warm to the touch.', 'volcanic', 4, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Emberpeak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Magma Bridge', 'Steam and sulfurous gas jet from vents in the ground. The air stings the eyes and throat.', 'volcanic', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Emberpeak';

-- Porto Sole <-> Coral Bay: Coastal Highway
UPDATE "travel_routes" SET "name" = 'Coastal Highway', "description" = 'A broad, well-paved road along the sparkling coast.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Breakwater Walk', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sunset Promenade', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Palm Shade', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Palm Shade', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sunset Promenade', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Breakwater Walk', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Porto Sole';

-- Porto Sole <-> Libertad: Freedom Road
UPDATE "travel_routes" SET "name" = 'Freedom Road', "description" = 'A busy highway connecting the two largest Free Cities.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Libertad'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Libertad') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Pinnacle View', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Boulder Garden', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cliff Face Traverse', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cliff Face Traverse', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Boulder Garden', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Pinnacle View', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Porto Sole';

-- Porto Sole <-> Beacon's End: Lighthouse Road
UPDATE "travel_routes" SET "name" = 'Lighthouse Road', "description" = 'A scenic coastal road leading to the great lighthouse.', "node_count" = 4, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Beacon''s End'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Beacon''s End') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Breakwater Walk', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Beacon''s End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sunset Promenade', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Beacon''s End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Palm Shade', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Beacon''s End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Seagull Rock', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Beacon''s End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Seagull Rock', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Palm Shade', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Sunset Promenade', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Breakwater Walk', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'Porto Sole';

-- Porto Sole <-> Sandrift: Desert Approach
UPDATE "travel_routes" SET "name" = 'Desert Approach', "description" = 'A road that transitions from lush coast to arid desert.', "node_count" = 5, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Sandrift'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Sandrift') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cactus Garden', 'Atop a towering dune, the view stretches for miles. Sand streams from the crest like liquid gold.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Canyon Mouth', 'Miniature tornados of sand skip across the flats, their howling a mournful counterpoint to the silence.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Heat Shimmer', 'A natural arch of red sandstone frames the path, carved by millennia of desert wind.', 'desert', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Bleached Bones', 'Sun-bleached bones of some massive creature half-buried in the sand serve as a grim waymarker.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Sandstone Arch', 'The heat is a physical wall. Sweat evaporates before it can drip. The air itself seems to burn.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Sandstone Arch', 'The heat is a physical wall. Sweat evaporates before it can drip. The air itself seems to burn.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Bleached Bones', 'Sun-bleached bones of some massive creature half-buried in the sand serve as a grim waymarker.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Heat Shimmer', 'A natural arch of red sandstone frames the path, carved by millennia of desert wind.', 'desert', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Canyon Mouth', 'Miniature tornados of sand skip across the flats, their howling a mournful counterpoint to the silence.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Cactus Garden', 'Atop a towering dune, the view stretches for miles. Sand streams from the crest like liquid gold.', 'desert', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Porto Sole';

-- Coral Bay <-> Beacon's End: Seaside Path
UPDATE "travel_routes" SET "name" = 'Seaside Path', "description" = 'A short, pleasant walk along white sand beaches.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Beacon''s End'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Beacon''s End') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dry Riverbed', 'What appears to be water shimmers ahead, but it''s only heat haze dancing above the scorched earth.', 'desert', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Beacon''s End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Vulture Roost', 'The earth here is cracked into a mosaic of baked clay tiles. Not a drop of moisture remains.', 'desert', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Beacon''s End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Vulture Roost', 'The earth here is cracked into a mosaic of baked clay tiles. Not a drop of moisture remains.', 'desert', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dry Riverbed', 'What appears to be water shimmers ahead, but it''s only heat haze dancing above the scorched earth.', 'desert', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'Coral Bay';

-- Libertad <-> Sandrift: Arid Road
UPDATE "travel_routes" SET "name" = 'Arid Road', "description" = 'A dusty road through increasingly barren landscape.', "node_count" = 4, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Libertad') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Sandrift'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Sandrift') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Libertad'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Barley Flats', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Millstone Hill', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Shepherd''s Rest', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Shepherd''s Rest', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Millstone Hill', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Barley Flats', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Libertad';

-- Porto Sole <-> The Crosswinds Inn: Inn Road
UPDATE "travel_routes" SET "name" = 'Inn Road', "description" = 'A short path to the famous neutral meeting ground.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'The Crosswinds Inn'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'The Crosswinds Inn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cricket Hollow', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Crosswinds Inn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Grazing Commons', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Crosswinds Inn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Grazing Commons', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Crosswinds Inn' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cricket Hollow', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Crosswinds Inn' AND t2.name = 'Porto Sole';

-- Beacon's End <-> The Crosswinds Inn: Seaside Trail
UPDATE "travel_routes" SET "name" = 'Seaside Trail', "description" = 'A breezy trail along the coast.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Beacon''s End') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'The Crosswinds Inn'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'The Crosswinds Inn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Beacon''s End'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Salt Spray Lookout', 'Tall palms provide welcome shade along the coastal path. Coconuts litter the ground.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'The Crosswinds Inn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Driftwood Cove', 'Seagulls wheel and cry above a jutting rock formation. Their guano paints the stone white.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Beacon''s End' AND t2.name = 'The Crosswinds Inn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Driftwood Cove', 'Seagulls wheel and cry above a jutting rock formation. Their guano paints the stone white.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Crosswinds Inn' AND t2.name = 'Beacon''s End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Salt Spray Lookout', 'Tall palms provide welcome shade along the coastal path. Coconuts litter the ground.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Crosswinds Inn' AND t2.name = 'Beacon''s End';

-- Dawnmere <-> Twinvale: Border Road
UPDATE "travel_routes" SET "name" = 'Border Road', "description" = 'A peaceful road through the borderlands where human and elven cultures blend.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Twinvale'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Twinvale') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Owl Roost', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Twinvale';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Root Tunnel', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Twinvale';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Silver Birch Stand', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 2, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Twinvale';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Silver Birch Stand', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 2, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Twinvale' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Root Tunnel', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Twinvale' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Owl Roost', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Twinvale' AND t2.name = 'Dawnmere';

-- Dawnmere <-> Harmony Point: Trade Road
UPDATE "travel_routes" SET "name" = 'Trade Road', "description" = 'A busy road connecting to the diplomatic hub.', "node_count" = 3, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Harmony Point'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Harmony Point') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Rolling Green', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Oxbow Bend', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Farmstead Gate', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Farmstead Gate', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Oxbow Bend', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Rolling Green', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Dawnmere';

-- Twinvale <-> Harmony Point: Meadow Path
UPDATE "travel_routes" SET "name" = 'Meadow Path', "description" = 'A gentle path through wildflower meadows.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Twinvale') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Harmony Point'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Harmony Point') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Twinvale'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Sunlit Vale', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 2, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Twinvale' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Stone Marker', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Twinvale' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stone Marker', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Twinvale';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sunlit Vale', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 2, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Twinvale';

-- Scarwatch <-> Tuskbridge: War-Scarred Road
UPDATE "travel_routes" SET "name" = 'War-Scarred Road', "description" = 'A road bearing the scars of countless border skirmishes.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Scarwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Scarwatch'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Desolation Point', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Scorpion Nest', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Warlord''s Marker', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Warlord''s Marker', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Scorpion Nest', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Desolation Point', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Scarwatch';

-- Scarwatch <-> Proving Grounds: Frontier Trail
UPDATE "travel_routes" SET "name" = 'Frontier Trail', "description" = 'A rough trail to the arena where warriors test their mettle.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Scarwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Proving Grounds'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Proving Grounds') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Scarwatch'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cracked Earth', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Proving Grounds';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Buzzard Ridge', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Proving Grounds';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dead Man''s Crossing', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Proving Grounds';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dead Man''s Crossing', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Proving Grounds' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Buzzard Ridge', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Proving Grounds' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cracked Earth', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Proving Grounds' AND t2.name = 'Scarwatch';

-- Tuskbridge <-> Proving Grounds: Contested Path
UPDATE "travel_routes" SET "name" = 'Contested Path', "description" = 'A disputed trail through no-man''s land.', "node_count" = 2, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Proving Grounds'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Proving Grounds') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Windswept Field', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Proving Grounds';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Harvest Crossroads', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Proving Grounds';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Harvest Crossroads', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Proving Grounds' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Windswept Field', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Proving Grounds' AND t2.name = 'Tuskbridge';

-- Cogsworth <-> Sparkhollow: Burrow Tunnel
UPDATE "travel_routes" SET "name" = 'Burrow Tunnel', "description" = 'An underground passage lined with gnomish lanterns and clockwork signposts.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Sparkhollow'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Sparkhollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Frozen Switchback', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 2, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Sparkhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Goat Trail', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 2, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Sparkhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Goat Trail', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 2, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sparkhollow' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Frozen Switchback', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 2, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sparkhollow' AND t2.name = 'Cogsworth';

-- Cogsworth <-> Fumblewick: Hillside Path
UPDATE "travel_routes" SET "name" = 'Hillside Path', "description" = 'A winding path over gnome-engineered bridges and past whirring windmills.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Fumblewick'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Fumblewick') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cricket Hollow', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Fumblewick';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Grazing Commons', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Fumblewick';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Grazing Commons', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Fumblewick' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cricket Hollow', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Fumblewick' AND t2.name = 'Cogsworth';

-- Sparkhollow <-> Fumblewick: Gnome Trail
UPDATE "travel_routes" SET "name" = 'Gnome Trail', "description" = 'A quirky trail with mechanical waymarkers and spring-loaded benches.', "node_count" = 2, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Sparkhollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Fumblewick'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Fumblewick') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Sparkhollow'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Shepherd''s Rest', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sparkhollow' AND t2.name = 'Fumblewick';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Golden Mile', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sparkhollow' AND t2.name = 'Fumblewick';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Golden Mile', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Fumblewick' AND t2.name = 'Sparkhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Shepherd''s Rest', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Fumblewick' AND t2.name = 'Sparkhollow';

-- Coralspire <-> Shallows End: Ocean Current
UPDATE "travel_routes" SET "name" = 'Ocean Current', "description" = 'A guided current through coral gardens and kelp forests.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Coralspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Coralspire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Mushroom Ring', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thornwall Passage', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Fallen Giant', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Fallen Giant', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Coralspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thornwall Passage', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Coralspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Ring', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Coralspire';

-- Coralspire <-> Abyssal Reach: The Deep Trench
UPDATE "travel_routes" SET "name" = 'The Deep Trench', "description" = 'A terrifying descent into crushing darkness where light fades to nothing.', "node_count" = 5, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Coralspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Abyssal Reach'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Abyssal Reach') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Coralspire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Granite Shelf', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 7, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cloud Walker''s Rest', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cliff Face Traverse', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 8, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Boulder Garden', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 7, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Pinnacle View', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coralspire' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Pinnacle View', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Coralspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Boulder Garden', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 7, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Coralspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cliff Face Traverse', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 8, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Coralspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cloud Walker''s Rest', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Coralspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Granite Shelf', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 7, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Coralspire';

-- Shallows End <-> Abyssal Reach: Ocean Descent
UPDATE "travel_routes" SET "name" = 'Ocean Descent', "description" = 'A gradual slope into deeper waters, past bioluminescent reefs.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Abyssal Reach'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Abyssal Reach') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dark Water', 'A flat expanse of white sand dotted with sand dollars and sea stars. The water is remarkably clear here.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Starfish Meadow', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Abyssal Gate', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Whale Song Crossing', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Abyssal Reach';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Whale Song Crossing', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Abyssal Gate', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Starfish Meadow', 'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.', 'underwater', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Dark Water', 'A flat expanse of white sand dotted with sand dollars and sea stars. The water is remarkably clear here.', 'underwater', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Abyssal Reach' AND t2.name = 'Shallows End';

-- Thornden <-> Clawridge: Wild Trail
UPDATE "travel_routes" SET "name" = 'Wild Trail', "description" = 'An untamed path through dense, predator-filled wilderness.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornden') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Clawridge'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Clawridge') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornden'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Blood Rock', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thorn Flats', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dead Man''s Crossing', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Buzzard Ridge', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Buzzard Ridge', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dead Man''s Crossing', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Thorn Flats', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Blood Rock', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Thornden';

-- Thornden <-> Windrun: Forest-to-Plains
UPDATE "travel_routes" SET "name" = 'Forest-to-Plains', "description" = 'A trail transitioning from dense forest to open grassland.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornden') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Windrun'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Windrun') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornden'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Owl Roost', 'A titan of a tree has fallen across the trail. Its trunk serves as a bridge over a mossy ravine.', 'forest', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Root Tunnel', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Silver Birch Stand', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Silver Birch Stand', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Root Tunnel', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Owl Roost', 'A titan of a tree has fallen across the trail. Its trunk serves as a bridge over a mossy ravine.', 'forest', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Thornden';

-- Clawridge <-> Windrun: Mountain Descent
UPDATE "travel_routes" SET "name" = 'Mountain Descent', "description" = 'A steep trail from craggy heights to wind-swept plains.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Clawridge') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Windrun'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Windrun') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Clawridge'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thorn Flats', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dead Man''s Crossing', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Buzzard Ridge', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cracked Earth', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cracked Earth', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Buzzard Ridge', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dead Man''s Crossing', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Thorn Flats', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Clawridge';

-- Glimmerheart <-> Dewdrop Hollow: Fey Path
UPDATE "travel_routes" SET "name" = 'Fey Path', "description" = 'A shimmering trail where reality bends and flowers glow with inner light.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Glimmerheart') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Glimmerheart'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Golden Mile', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Glimmerheart' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Shepherd''s Rest', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Glimmerheart' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Millstone Hill', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Glimmerheart' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Millstone Hill', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Glimmerheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Shepherd''s Rest', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Glimmerheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Golden Mile', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Glimmerheart';

-- Glimmerheart <-> Moonpetal Grove: Feywild Crossing
UPDATE "travel_routes" SET "name" = 'Feywild Crossing', "description" = 'A path that crosses into the Feywild itself at certain points.', "node_count" = 4, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Glimmerheart') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Moonpetal Grove'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Moonpetal Grove') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Glimmerheart'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Living Topiary', 'A bridge of solidified rainbow arcs over a stream that flows uphill. Fish swim through the air above it.', 'fey', 5, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Glimmerheart' AND t2.name = 'Moonpetal Grove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Mirror Pool', 'A bower of flowering vines creates a twilight space where day and night seem to coexist.', 'fey', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Glimmerheart' AND t2.name = 'Moonpetal Grove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Singing Stones', 'Flower petals swirl in a perpetual gentle storm, never landing, always dancing on an unfelt breeze.', 'fey', 6, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Glimmerheart' AND t2.name = 'Moonpetal Grove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Moonflower Walk', 'Hedges have been shaped by fey magic into animals, people, and impossible geometric forms that slowly move.', 'fey', 5, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Glimmerheart' AND t2.name = 'Moonpetal Grove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Moonflower Walk', 'Hedges have been shaped by fey magic into animals, people, and impossible geometric forms that slowly move.', 'fey', 5, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonpetal Grove' AND t2.name = 'Glimmerheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Singing Stones', 'Flower petals swirl in a perpetual gentle storm, never landing, always dancing on an unfelt breeze.', 'fey', 6, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonpetal Grove' AND t2.name = 'Glimmerheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mirror Pool', 'A bower of flowering vines creates a twilight space where day and night seem to coexist.', 'fey', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonpetal Grove' AND t2.name = 'Glimmerheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Living Topiary', 'A bridge of solidified rainbow arcs over a stream that flows uphill. Fish swim through the air above it.', 'fey', 5, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonpetal Grove' AND t2.name = 'Glimmerheart';

-- Dewdrop Hollow <-> Moonpetal Grove: Glade Path
UPDATE "travel_routes" SET "name" = 'Glade Path', "description" = 'A winding path through enchanted glades where time moves strangely.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Moonpetal Grove'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Moonpetal Grove') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Moonflower Walk', 'A circle of oversized toadstools pulses with warm light. Each cap is large enough to sit upon.', 'fey', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Moonpetal Grove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Toadstool Circle', 'A bridge woven from spider silk and starlight spans a chasm. It sways but holds firm.', 'fey', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Moonpetal Grove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Gossamer Bridge', 'A glade centers around an ancient well where coins shimmer in impossibly deep water.', 'fey', 3, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Moonpetal Grove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Gossamer Bridge', 'A glade centers around an ancient well where coins shimmer in impossibly deep water.', 'fey', 3, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonpetal Grove' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Toadstool Circle', 'A bridge woven from spider silk and starlight spans a chasm. It sways but holds firm.', 'fey', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonpetal Grove' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Moonflower Walk', 'A circle of oversized toadstools pulses with warm light. Each cap is large enough to sit upon.', 'fey', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Moonpetal Grove' AND t2.name = 'Dewdrop Hollow';

-- Skyhold <-> Windbreak: Peak Trail
UPDATE "travel_routes" SET "name" = 'Peak Trail', "description" = 'A vertigo-inducing trail along razor-thin mountain ridges.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Skyhold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Windbreak'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Windbreak') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Skyhold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Avalanche Scar', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Windbreak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Stone Sentinel', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 6, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Windbreak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Granite Shelf', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Windbreak';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Granite Shelf', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windbreak' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Stone Sentinel', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 6, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windbreak' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Avalanche Scar', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windbreak' AND t2.name = 'Skyhold';

-- Vel'Naris <-> Gloom Market: Underdark Tunnel
UPDATE "travel_routes" SET "name" = 'Underdark Tunnel', "description" = 'A pitch-black tunnel patrolled by drow sentries and giant spiders.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Vel''Naris') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Gloom Market'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Gloom Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Vel''Naris'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stalactite Forest', 'The tunnel opens into a vast chamber where every sound echoes endlessly. Luminous crystals stud the ceiling.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Gloom Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Lava Vent Chamber', 'A magnificent stone arch carved with dwarven runes spans the passage, marking territory boundaries.', 'underground', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Gloom Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Glowworm Tunnel', 'Stalactites and stalagmites grow in such profusion they form a stone forest through which the path winds.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Gloom Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Glowworm Tunnel', 'Stalactites and stalagmites grow in such profusion they form a stone forest through which the path winds.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Vel''Naris';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Lava Vent Chamber', 'A magnificent stone arch carved with dwarven runes spans the passage, marking territory boundaries.', 'underground', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Vel''Naris';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Stalactite Forest', 'The tunnel opens into a vast chamber where every sound echoes endlessly. Luminous crystals stud the ceiling.', 'underground', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Vel''Naris';

-- Misthaven <-> Rootholme: Misty Path
UPDATE "travel_routes" SET "name" = 'Misty Path', "description" = 'A path through perpetual mist where enormous trees form living archways.', "node_count" = 3, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Misthaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Rootholme'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Rootholme') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Misthaven'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Ancient Oak Crossing', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Rootholme';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dappled Glade', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Rootholme';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Silver Birch Stand', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Rootholme';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Silver Birch Stand', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Rootholme' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dappled Glade', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Rootholme' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Ancient Oak Crossing', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Rootholme' AND t2.name = 'Misthaven';

-- The Confluence <-> Emberheart: Elemental Rift
UPDATE "travel_routes" SET "name" = 'Elemental Rift', "description" = 'A path through zones of clashing elemental energy.', "node_count" = 3, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'The Confluence') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Emberheart'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Emberheart') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'The Confluence'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Scavenger''s Perch', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Emberheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'War Monument', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Emberheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dust Storm Pass', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Emberheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dust Storm Pass', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'War Monument', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Scavenger''s Perch', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'The Confluence';

-- Drakenspire <-> Kazad-Vorn: The Frostfire Pass
UPDATE "travel_routes" SET "name" = 'The Frostfire Pass', "description" = 'A legendary mountain pass connecting dwarven and drakonid realms through eternal snow.', "node_count" = 9, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Permafrost Plain', 'An endless expanse of white stretches in every direction. The cold is a physical force, pressing against exposed skin.', 'tundra', 6, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Blizzard Gate', 'A shallow cave in a snowbank offers shelter from the wind. Previous travelers left a stack of firewood.', 'tundra', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Ice Bridge', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 7, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Frozen Waste', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 8, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Snowdrift Passage', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 8, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Northern Lights Lookout', 'A cairn of frost-covered stones marks the way. Without it, the featureless white would be impossible to navigate.', 'tundra', 8, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Bone-Cold Crossing', 'The blue-white wall of a glacier towers above. Its face is scarred with crevasses and dripping meltwater.', 'tundra', 7, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Storm Shelter', 'Blinding white snow reflects the sun so intensely that unprotected eyes begin to ache within minutes.', 'tundra', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Frozen River Ford', 'A ridge of bare rock scoured clean by ceaseless wind. The exposure here is deadly in bad weather.', 'tundra', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Frozen River Ford', 'A ridge of bare rock scoured clean by ceaseless wind. The exposure here is deadly in bad weather.', 'tundra', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Storm Shelter', 'Blinding white snow reflects the sun so intensely that unprotected eyes begin to ache within minutes.', 'tundra', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Bone-Cold Crossing', 'The blue-white wall of a glacier towers above. Its face is scarred with crevasses and dripping meltwater.', 'tundra', 7, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Northern Lights Lookout', 'A cairn of frost-covered stones marks the way. Without it, the featureless white would be impossible to navigate.', 'tundra', 8, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Snowdrift Passage', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 8, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Frozen Waste', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 8, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Ice Bridge', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 7, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Blizzard Gate', 'A shallow cave in a snowbank offers shelter from the wind. Previous travelers left a stack of firewood.', 'tundra', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Permafrost Plain', 'An endless expanse of white stretches in every direction. The cold is a physical force, pressing against exposed skin.', 'tundra', 6, 'cave'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Drakenspire';

-- Scalehaven <-> Kingshold: The Northern Highway
UPDATE "travel_routes" SET "name" = 'The Northern Highway', "description" = 'The great road connecting the frozen north to the human heartlands.', "node_count" = 10, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Scalehaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Scalehaven'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Permafrost Plain', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Blizzard Gate', 'A cairn of frost-covered stones marks the way. Without it, the featureless white would be impossible to navigate.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Ice Bridge', 'The blue-white wall of a glacier towers above. Its face is scarred with crevasses and dripping meltwater.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Frozen Waste', 'Blinding white snow reflects the sun so intensely that unprotected eyes begin to ache within minutes.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Snowdrift Passage', 'A ridge of bare rock scoured clean by ceaseless wind. The exposure here is deadly in bad weather.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Northern Lights Lookout', 'The ground is frozen so deeply that nothing grows. Not even snow sticks to the iron-hard earth.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Bone-Cold Crossing', 'The wind carries stinging ice crystals that reduce visibility to nothing. Travel by rope is the only safe option.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Storm Shelter', 'A bridge of ancient ice spans a crevasse. The ice groans and cracks with each step but holds firm.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Frozen River Ford', 'An endless expanse of white stretches in every direction. The cold is a physical force, pressing against exposed skin.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 10, 'Wind-Scoured Ridge', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scalehaven' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Wind-Scoured Ridge', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Frozen River Ford', 'An endless expanse of white stretches in every direction. The cold is a physical force, pressing against exposed skin.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Storm Shelter', 'A bridge of ancient ice spans a crevasse. The ice groans and cracks with each step but holds firm.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Bone-Cold Crossing', 'The wind carries stinging ice crystals that reduce visibility to nothing. Travel by rope is the only safe option.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Northern Lights Lookout', 'The ground is frozen so deeply that nothing grows. Not even snow sticks to the iron-hard earth.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Snowdrift Passage', 'A ridge of bare rock scoured clean by ceaseless wind. The exposure here is deadly in bad weather.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Frozen Waste', 'Blinding white snow reflects the sun so intensely that unprotected eyes begin to ache within minutes.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Ice Bridge', 'The blue-white wall of a glacier towers above. Its face is scarred with crevasses and dripping meltwater.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Blizzard Gate', 'A cairn of frost-covered stones marks the way. Without it, the featureless white would be impossible to navigate.', 'tundra', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 10, 'Permafrost Plain', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scalehaven';

-- Frostfang <-> Nethermire: Tundra-to-Marsh Trail
UPDATE "travel_routes" SET "name" = 'Tundra-to-Marsh Trail', "description" = 'A miserable trail crossing from frozen wastes to poisonous bogs.', "node_count" = 10, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Frostfang') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Frostfang'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Glacier Edge', 'The wind carries stinging ice crystals that reduce visibility to nothing. Travel by rope is the only safe option.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Snow Blind Pass', 'The ground is frozen so deeply that nothing grows. Not even snow sticks to the iron-hard earth.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Wind-Scoured Ridge', 'A ridge of bare rock scoured clean by ceaseless wind. The exposure here is deadly in bad weather.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Permafrost Plain', 'Blinding white snow reflects the sun so intensely that unprotected eyes begin to ache within minutes.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Blizzard Gate', 'The blue-white wall of a glacier towers above. Its face is scarred with crevasses and dripping meltwater.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Ice Bridge', 'A cairn of frost-covered stones marks the way. Without it, the featureless white would be impossible to navigate.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Frozen Waste', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Snowdrift Passage', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Northern Lights Lookout', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 10, 'Frost Cairn', 'The wind carries stinging ice crystals that reduce visibility to nothing. Travel by rope is the only safe option.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Frostfang' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Frost Cairn', 'The wind carries stinging ice crystals that reduce visibility to nothing. Travel by rope is the only safe option.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Northern Lights Lookout', 'A river frozen solid provides a natural highway. Dark shapes move in the ice below.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Snowdrift Passage', 'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Frozen Waste', 'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Ice Bridge', 'A cairn of frost-covered stones marks the way. Without it, the featureless white would be impossible to navigate.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Blizzard Gate', 'The blue-white wall of a glacier towers above. Its face is scarred with crevasses and dripping meltwater.', 'tundra', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Permafrost Plain', 'Blinding white snow reflects the sun so intensely that unprotected eyes begin to ache within minutes.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Wind-Scoured Ridge', 'A ridge of bare rock scoured clean by ceaseless wind. The exposure here is deadly in bad weather.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Snow Blind Pass', 'The ground is frozen so deeply that nothing grows. Not even snow sticks to the iron-hard earth.', 'tundra', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 10, 'Glacier Edge', 'The wind carries stinging ice crystals that reduce visibility to nothing. Travel by rope is the only safe option.', 'tundra', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Frostfang';

-- Alehearth <-> Ironford: Mountain-to-Hills Road
UPDATE "travel_routes" SET "name" = 'Mountain-to-Hills Road', "description" = 'A winding descent from dwarven mountains to the human hill country.', "node_count" = 7, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ironford'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ironford') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Frozen Switchback', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Avalanche Scar', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Stone Sentinel', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Granite Shelf', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Cloud Walker''s Rest', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Cliff Face Traverse', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Boulder Garden', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Ironford';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Boulder Garden', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cliff Face Traverse', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cloud Walker''s Rest', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Granite Shelf', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Stone Sentinel', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Avalanche Scar', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Frozen Switchback', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ironford' AND t2.name = 'Alehearth';

-- Hammerfall <-> Kingshold: The Fortified Road
UPDATE "travel_routes" SET "name" = 'The Fortified Road', "description" = 'A heavily patrolled road connecting the dwarven fortress to the human capital.', "node_count" = 8, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Bone Valley', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dust Storm Pass', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'War Monument', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Scavenger''s Perch', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 4, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Blood Rock', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Thorn Flats', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Dead Man''s Crossing', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Buzzard Ridge', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Buzzard Ridge', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dead Man''s Crossing', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Thorn Flats', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Blood Rock', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 4, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Scavenger''s Perch', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 4, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'War Monument', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Dust Storm Pass', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Bone Valley', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Hammerfall';

-- Hammerfall <-> Grakthar: Blood Feud Border
UPDATE "travel_routes" SET "name" = 'Blood Feud Border', "description" = 'The most dangerous road in Aethermere, crossing the dwarf-orc blood feud line.', "node_count" = 8, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Blood Rock', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thorn Flats', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dead Man''s Crossing', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Buzzard Ridge', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 8, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Cracked Earth', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 8, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Rusted Gate', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Ash Heap', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 7, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Warlord''s Marker', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Warlord''s Marker', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Ash Heap', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 7, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Rusted Gate', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cracked Earth', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 8, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Buzzard Ridge', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 8, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Dead Man''s Crossing', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Thorn Flats', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Blood Rock', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Hammerfall';

-- Bridgewater <-> Hearthshire: Great Trade Road
UPDATE "travel_routes" SET "name" = 'Great Trade Road', "description" = 'The busiest trade route in Aethermere, always crowded with merchant caravans.', "node_count" = 6, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hearthshire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Millstone Hill', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Barley Flats', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Wildflower Meadow', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Hawk''s Perch', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Rolling Green', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Oxbow Bend', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Hearthshire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Oxbow Bend', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Rolling Green', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Hawk''s Perch', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Wildflower Meadow', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Barley Flats', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Millstone Hill', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hearthshire' AND t2.name = 'Bridgewater';

-- Millhaven <-> Greenhollow: Farmland Road
UPDATE "travel_routes" SET "name" = 'Farmland Road', "description" = 'A gentle road through endless fields connecting human and halfling breadbaskets.', "node_count" = 6, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Millhaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Greenhollow'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Greenhollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Millhaven'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stone Marker', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Grazing Commons', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cricket Hollow', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 3, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Windswept Field', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Harvest Crossroads', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Millhaven' AND t2.name = 'Greenhollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Golden Mile', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 2, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Harvest Crossroads', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Windswept Field', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cricket Hollow', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 3, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Grazing Commons', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Millhaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Stone Marker', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Greenhollow' AND t2.name = 'Millhaven';

-- Kingshold <-> Mistwatch: Marsh Approach
UPDATE "travel_routes" SET "name" = 'Marsh Approach', "description" = 'A road that grows increasingly damp and gloomy as it nears Shadowmere.', "node_count" = 9, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Warlord''s Marker', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Ash Heap', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Rusted Gate', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cracked Earth', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Buzzard Ridge', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Dead Man''s Crossing', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Thorn Flats', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Blood Rock', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Scavenger''s Perch', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Scavenger''s Perch', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Blood Rock', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Thorn Flats', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Dead Man''s Crossing', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Buzzard Ridge', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Cracked Earth', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Rusted Gate', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Ash Heap', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Warlord''s Marker', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Kingshold';

-- Peddler's Rest <-> Porto Sole: Merchant Highway
UPDATE "travel_routes" SET "name" = 'Merchant Highway', "description" = 'The great commercial artery connecting the Crossroads to the Suncoast.', "node_count" = 7, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Seagull Rock', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Coral Shore', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Fisher''s Rest', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Salt Spray Lookout', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Driftwood Cove', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Sea Cliff Path', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Shell Beach', 'A small dock and lean-to mark where local fishermen rest. Nets hang drying in the sea breeze.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Shell Beach', 'A small dock and lean-to mark where local fishermen rest. Nets hang drying in the sea breeze.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sea Cliff Path', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Driftwood Cove', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Salt Spray Lookout', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Fisher''s Rest', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Coral Shore', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Seagull Rock', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Peddler''s Rest';

-- Riverside <-> Coral Bay: River-to-Coast Road
UPDATE "travel_routes" SET "name" = 'River-to-Coast Road', "description" = 'A scenic road following the river down to the sun-drenched coast.', "node_count" = 7, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Riverside') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Riverside'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Coral Shore', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Seagull Rock', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Palm Shade', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Sunset Promenade', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Breakwater Walk', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Whale Watch Point', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Sandy Stretch', 'Colorful tide pools line the rocky shore, each a miniature world of anemones, crabs, and tiny fish.', 'coastal', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Riverside' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Sandy Stretch', 'Colorful tide pools line the rocky shore, each a miniature world of anemones, crabs, and tiny fish.', 'coastal', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Whale Watch Point', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Breakwater Walk', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Sunset Promenade', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Palm Shade', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Seagull Rock', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Riverside';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Coral Shore', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 2, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Riverside';

-- Peddler's Rest <-> Ashen Market: Contested Trade Route
UPDATE "travel_routes" SET "name" = 'Contested Trade Route', "description" = 'A dangerous but profitable route to the orc trading post.', "node_count" = 8, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dust Storm Pass', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Bone Valley', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Skull Road', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Desolation Point', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Scorpion Nest', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Warlord''s Marker', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Ash Heap', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Rusted Gate', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Rusted Gate', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Ash Heap', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Warlord''s Marker', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Scorpion Nest', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Desolation Point', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Skull Road', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Bone Valley', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Dust Storm Pass', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Peddler''s Rest';

-- Ashen Market <-> Thornwatch: Hostile Borderlands
UPDATE "travel_routes" SET "name" = 'Hostile Borderlands', "description" = 'A heavily contested path through territory claimed by multiple factions.', "node_count" = 10, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Bone Valley', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dust Storm Pass', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'War Monument', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Scavenger''s Perch', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Blood Rock', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 8, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Thorn Flats', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 8, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Dead Man''s Crossing', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Buzzard Ridge', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 7, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Cracked Earth', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 10, 'Ash Heap', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Ash Heap', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cracked Earth', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 7, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Buzzard Ridge', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 7, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Dead Man''s Crossing', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 7, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Thorn Flats', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 8, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Blood Rock', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 8, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Scavenger''s Perch', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'War Monument', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Dust Storm Pass', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 10, 'Bone Valley', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Ashen Market';

-- Mistwatch <-> Thornwatch: Marsh-to-Forest Trail
UPDATE "travel_routes" SET "name" = 'Marsh-to-Forest Trail', "description" = 'A trail connecting the swamp watchtower to the forest border fortress.', "node_count" = 8, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Rotting Boardwalk', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Will-o-Wisp Crossing', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mud Flats', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Dead Tree Stand', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Stinking Pool', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Fogbound Landing', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Leech Hollow', 'Skeletal trees rise from the murk, their bare branches clawing at the grey sky like bony fingers.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Mire Bridge', 'The path sinks into thick, sucking mud. Each step requires effort to extract. The air reeks of decay.', 'swamp', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Mire Bridge', 'The path sinks into thick, sucking mud. Each step requires effort to extract. The air reeks of decay.', 'swamp', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Leech Hollow', 'Skeletal trees rise from the murk, their bare branches clawing at the grey sky like bony fingers.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Fogbound Landing', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Stinking Pool', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Dead Tree Stand', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Mud Flats', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Will-o-Wisp Crossing', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Rotting Boardwalk', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Mistwatch';

-- Porto Sole <-> Aelindra: Ancient Trade Road
UPDATE "travel_routes" SET "name" = 'Ancient Trade Road', "description" = 'An old elven road connecting the coast to the forest capital.', "node_count" = 9, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Driftwood Cove', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sea Cliff Path', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Shell Beach', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Harbor View', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Lighthouse Point', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Tide Pool Walk', 'Colorful tide pools line the rocky shore, each a miniature world of anemones, crabs, and tiny fish.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Sandy Stretch', 'White sand crunches underfoot as the trail follows the coastline. Turquoise waves lap gently at the shore.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Whale Watch Point', 'Tall palms provide welcome shade along the coastal path. Coconuts litter the ground.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Breakwater Walk', 'Seagulls wheel and cry above a jutting rock formation. Their guano paints the stone white.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Breakwater Walk', 'Seagulls wheel and cry above a jutting rock formation. Their guano paints the stone white.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Whale Watch Point', 'Tall palms provide welcome shade along the coastal path. Coconuts litter the ground.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Sandy Stretch', 'White sand crunches underfoot as the trail follows the coastline. Turquoise waves lap gently at the shore.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Tide Pool Walk', 'Colorful tide pools line the rocky shore, each a miniature world of anemones, crabs, and tiny fish.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Lighthouse Point', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Harbor View', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Shell Beach', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Sea Cliff Path', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Driftwood Cove', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Porto Sole';

-- Libertad <-> Ashen Market: Lawless Coast Road
UPDATE "travel_routes" SET "name" = 'Lawless Coast Road', "description" = 'A dangerous road where bandits and war parties are common.', "node_count" = 8, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Libertad') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Libertad'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thorn Flats', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 4, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dead Man''s Crossing', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Buzzard Ridge', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cracked Earth', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Rusted Gate', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 6, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Ash Heap', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Warlord''s Marker', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Scorpion Nest', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 4, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Libertad' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Scorpion Nest', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 4, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Warlord''s Marker', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Ash Heap', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Rusted Gate', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 6, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Cracked Earth', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Buzzard Ridge', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Dead Man''s Crossing', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Thorn Flats', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 4, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Libertad';

-- Dawnmere <-> Kingshold: Border Highway
UPDATE "travel_routes" SET "name" = 'Border Highway', "description" = 'A well-maintained highway connecting the half-elf town to the human capital.', "node_count" = 6, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Frozen Switchback', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Goat Trail', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Iron Ridge', 'Twin pillars of natural stone frame the path like a gateway, standing guard over the passage.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Thunder Step', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Cairn Summit', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Rockfall Narrows', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Rockfall Narrows', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cairn Summit', 'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Thunder Step', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Iron Ridge', 'Twin pillars of natural stone frame the path like a gateway, standing guard over the passage.', 'mountain', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Goat Trail', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Frozen Switchback', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Dawnmere';

-- Dawnmere <-> Aelindra: Forest Border Road
UPDATE "travel_routes" SET "name" = 'Forest Border Road', "description" = 'A beautiful road entering the ancient forest from the borderlands.', "node_count" = 6, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dawnmere'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Root Tunnel', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Owl Roost', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Ring', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Thornwall Passage', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Fallen Giant', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Spider Silk Dell', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 2, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dawnmere' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Spider Silk Dell', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 2, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Fallen Giant', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Thornwall Passage', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 3, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Mushroom Ring', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 3, 'shrine'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Owl Roost', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 2, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dawnmere';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Root Tunnel', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dawnmere';

-- Harmony Point <-> Bridgewater: Diplomat's Road
UPDATE "travel_routes" SET "name" = 'Diplomat''s Road', "description" = 'A safe road frequently used by diplomats and merchants.', "node_count" = 5, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Harmony Point') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Bridgewater') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Harmony Point'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Barley Flats', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wildflower Meadow', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Hawk''s Perch', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Rolling Green', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Oxbow Bend', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Harmony Point' AND t2.name = 'Bridgewater';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Oxbow Bend', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Rolling Green', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Hawk''s Perch', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Wildflower Meadow', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Harmony Point';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Barley Flats', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Bridgewater' AND t2.name = 'Harmony Point';

-- Scarwatch <-> Kingshold: Fortified Road
UPDATE "travel_routes" SET "name" = 'Fortified Road', "description" = 'A militarized road connecting the frontier fortress to the capital.', "node_count" = 7, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Scarwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kingshold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Scarwatch'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Rusted Gate', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Ash Heap', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Warlord''s Marker', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Scorpion Nest', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Desolation Point', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Skull Road', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Bone Valley', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Scarwatch' AND t2.name = 'Kingshold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Bone Valley', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Skull Road', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Desolation Point', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Scorpion Nest', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Warlord''s Marker', 'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Ash Heap', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scarwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Rusted Gate', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kingshold' AND t2.name = 'Scarwatch';

-- Tuskbridge <-> Grakthar: Orc Border Road
UPDATE "travel_routes" SET "name" = 'Orc Border Road', "description" = 'A rough road to the orc capital, dangerous for non-orcs.', "node_count" = 7, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Grakthar') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Ash Heap', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Warlord''s Marker', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Scorpion Nest', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Desolation Point', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Skull Road', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Bone Valley', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Dust Storm Pass', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Grakthar';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dust Storm Pass', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Bone Valley', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Skull Road', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 6, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Desolation Point', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Scorpion Nest', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Warlord''s Marker', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Ash Heap', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Grakthar' AND t2.name = 'Tuskbridge';

-- Tuskbridge <-> Ashen Market: Wasteland Track
UPDATE "travel_routes" SET "name" = 'Wasteland Track', "description" = 'A dusty track through desolate borderlands.', "node_count" = 6, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashen Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Tuskbridge'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Dead Man''s Crossing', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Buzzard Ridge', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cracked Earth', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Rusted Gate', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Ash Heap', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Warlord''s Marker', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Tuskbridge' AND t2.name = 'Ashen Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Warlord''s Marker', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Ash Heap', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Rusted Gate', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cracked Earth', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Buzzard Ridge', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Tuskbridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Dead Man''s Crossing', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashen Market' AND t2.name = 'Tuskbridge';

-- Cogsworth <-> Kazad-Vorn: Mountain Foothill
UPDATE "travel_routes" SET "name" = 'Mountain Foothill', "description" = 'A road climbing from gnome burrows to dwarven halls.', "node_count" = 6, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Crystal Chamber', 'Thousands of glowworms cling to the ceiling, creating a false starscape of green and gold pinpoints.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dripping Gallery', 'Hot air rises from vents in the floor, carrying the sulfurous breath of the deep earth.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Forge Light Junction', 'Stalactites and stalagmites grow in such profusion they form a stone forest through which the path winds.', 'underground', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'The Narrows', 'A magnificent stone arch carved with dwarven runes spans the passage, marking territory boundaries.', 'underground', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Mushroom Cavern', 'The tunnel opens into a vast chamber where every sound echoes endlessly. Luminous crystals stud the ceiling.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Underground Lake', 'Crystalline formations jut from every surface, refracting lantern light into a thousand rainbow shards.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Underground Lake', 'Crystalline formations jut from every surface, refracting lantern light into a thousand rainbow shards.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Mushroom Cavern', 'The tunnel opens into a vast chamber where every sound echoes endlessly. Luminous crystals stud the ceiling.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'The Narrows', 'A magnificent stone arch carved with dwarven runes spans the passage, marking territory boundaries.', 'underground', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Forge Light Junction', 'Stalactites and stalagmites grow in such profusion they form a stone forest through which the path winds.', 'underground', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Dripping Gallery', 'Hot air rises from vents in the floor, carrying the sulfurous breath of the deep earth.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Crystal Chamber', 'Thousands of glowworms cling to the ceiling, creating a false starscape of green and gold pinpoints.', 'underground', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Cogsworth';

-- Cogsworth <-> Alehearth: Valley Connector
UPDATE "travel_routes" SET "name" = 'Valley Connector', "description" = 'A pleasant valley road between gnome and dwarf settlements.', "node_count" = 5, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Alehearth') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Cogsworth'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Rusted Gate', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cracked Earth', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Buzzard Ridge', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Dead Man''s Crossing', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Thorn Flats', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cogsworth' AND t2.name = 'Alehearth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thorn Flats', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dead Man''s Crossing', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Buzzard Ridge', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cracked Earth', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Cogsworth';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Rusted Gate', 'A crude monument of stacked weapons marks the site of some long-forgotten battle.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Alehearth' AND t2.name = 'Cogsworth';

-- Shallows End <-> Coral Bay: Coastal Shallows
UPDATE "travel_routes" SET "name" = 'Coastal Shallows', "description" = 'A path through warm, shallow waters between merfolk and human territory.', "node_count" = 4, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Coral Bay') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Bone Valley', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dust Storm Pass', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'War Monument', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Scavenger''s Perch', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Coral Bay';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Scavenger''s Perch', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'War Monument', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Dust Storm Pass', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Bone Valley', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Coral Bay' AND t2.name = 'Shallows End';

-- Shallows End <-> Porto Sole: Coastal Path
UPDATE "travel_routes" SET "name" = 'Coastal Path', "description" = 'A coastal route connecting merfolk shallows to the great Free City.', "node_count" = 5, "difficulty" = 'safe'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Shallows End'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Fisher''s Rest', 'White sand crunches underfoot as the trail follows the coastline. Turquoise waves lap gently at the shore.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Salt Spray Lookout', 'Colorful tide pools line the rocky shore, each a miniature world of anemones, crabs, and tiny fish.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Driftwood Cove', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Sea Cliff Path', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Shell Beach', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Shallows End' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Shell Beach', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sea Cliff Path', 'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Driftwood Cove', 'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Salt Spray Lookout', 'Colorful tide pools line the rocky shore, each a miniature world of anemones, crabs, and tiny fish.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Shallows End';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Fisher''s Rest', 'White sand crunches underfoot as the trail follows the coastline. Turquoise waves lap gently at the shore.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'Shallows End';

-- Thornden <-> Thornwatch: Wild Forest Road
UPDATE "travel_routes" SET "name" = 'Wild Forest Road', "description" = 'A dangerous road through untamed wilderness connecting beastfolk and elven lands.', "node_count" = 6, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornden') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Thornwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Thornden'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Root Tunnel', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Owl Roost', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Ring', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Thornwall Passage', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Fallen Giant', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Spider Silk Dell', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornden' AND t2.name = 'Thornwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Spider Silk Dell', 'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Fallen Giant', 'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Thornwall Passage', 'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.', 'forest', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Mushroom Ring', 'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.', 'forest', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Owl Roost', 'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Thornden';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Root Tunnel', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Thornwatch' AND t2.name = 'Thornden';

-- Windrun <-> Peddler's Rest: Plains Connector
UPDATE "travel_routes" SET "name" = 'Plains Connector', "description" = 'A road across open plains connecting beastfolk territory to the Crossroads.', "node_count" = 6, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Windrun') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Peddler''s Rest') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Windrun'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Barley Flats', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Wildflower Meadow', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Hawk''s Perch', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Rolling Green', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Oxbow Bend', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Farmstead Gate', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Windrun' AND t2.name = 'Peddler''s Rest';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Farmstead Gate', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Oxbow Bend', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Rolling Green', 'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Hawk''s Perch', 'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Wildflower Meadow', 'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Windrun';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Barley Flats', 'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Peddler''s Rest' AND t2.name = 'Windrun';

-- Clawridge <-> Hammerfall: Mountain Wilderness
UPDATE "travel_routes" SET "name" = 'Mountain Wilderness', "description" = 'A harsh trail through mountain wilderness connecting beastfolk and dwarven lands.', "node_count" = 7, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Clawridge') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Hammerfall') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Clawridge'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Granite Shelf', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Stone Sentinel', 'Twin pillars of natural stone frame the path like a gateway, standing guard over the passage.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Avalanche Scar', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Frozen Switchback', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Goat Trail', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Iron Ridge', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Thunder Step', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Clawridge' AND t2.name = 'Hammerfall';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thunder Step', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Iron Ridge', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Goat Trail', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Frozen Switchback', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Avalanche Scar', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Stone Sentinel', 'Twin pillars of natural stone frame the path like a gateway, standing guard over the passage.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Clawridge';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Granite Shelf', 'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Hammerfall' AND t2.name = 'Clawridge';

-- Dewdrop Hollow <-> Aelindra: Silverwood Glade
UPDATE "travel_routes" SET "name" = 'Silverwood Glade', "description" = 'A mystical path through the most beautiful part of the ancient forest.', "node_count" = 5, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Fallen Giant', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thornwall Passage', 'A titan of a tree has fallen across the trail. Its trunk serves as a bridge over a mossy ravine.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Ring', 'Gossamer spider silk stretches between the trees, catching morning dew like strings of diamonds.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Owl Roost', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Root Tunnel', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Root Tunnel', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Owl Roost', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Mushroom Ring', 'Gossamer spider silk stretches between the trees, catching morning dew like strings of diamonds.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Thornwall Passage', 'A titan of a tree has fallen across the trail. Its trunk serves as a bridge over a mossy ravine.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Fallen Giant', 'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Dewdrop Hollow';

-- Dewdrop Hollow <-> Eldergrove: Sacred Forest Path
UPDATE "travel_routes" SET "name" = 'Sacred Forest Path', "description" = 'A path connecting faefolk territory to the most sacred elven grove.', "node_count" = 4, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Dewdrop Hollow'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Heartwood Gate', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Deer Trail Fork', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Spider Silk Dell', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Fallen Giant', 'Gossamer spider silk stretches between the trees, catching morning dew like strings of diamonds.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Dewdrop Hollow' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Fallen Giant', 'Gossamer spider silk stretches between the trees, catching morning dew like strings of diamonds.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Spider Silk Dell', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Deer Trail Fork', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Dewdrop Hollow';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Heartwood Gate', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Dewdrop Hollow';

-- Skyhold <-> Drakenspire: Extreme Altitude Pass
UPDATE "travel_routes" SET "name" = 'Extreme Altitude Pass', "description" = 'A path so high that even mountain goats hesitate.', "node_count" = 6, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Skyhold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Drakenspire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Skyhold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Windscream Gap', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Eagle''s Ledge', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Pinnacle View', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Boulder Garden', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Cliff Face Traverse', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Cloud Walker''s Rest', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Drakenspire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cloud Walker''s Rest', 'Ice clings to every surface here. The path is treacherous with frost even in summer months.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Cliff Face Traverse', 'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Boulder Garden', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Pinnacle View', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Eagle''s Ledge', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Windscream Gap', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Drakenspire' AND t2.name = 'Skyhold';

-- Skyhold <-> Kazad-Vorn: High Peak Descent
UPDATE "travel_routes" SET "name" = 'High Peak Descent', "description" = 'A long descent from goliath peaks to dwarven mountain halls.', "node_count" = 7, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Skyhold') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Skyhold'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cairn Summit', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Thunder Step', 'The wind screams through a natural gap in the rock, strong enough to stagger an unwary traveler.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Iron Ridge', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Goat Trail', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Frozen Switchback', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Avalanche Scar', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Stone Sentinel', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Skyhold' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Stone Sentinel', 'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Avalanche Scar', 'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Frozen Switchback', 'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Goat Trail', 'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Iron Ridge', 'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.', 'mountain', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Thunder Step', 'The wind screams through a natural gap in the rock, strong enough to stagger an unwary traveler.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Skyhold';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Cairn Summit', 'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.', 'mountain', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'Skyhold';

-- Vel'Naris <-> Nethermire: Underdark-to-Surface
UPDATE "travel_routes" SET "name" = 'Underdark-to-Surface', "description" = 'A twisting passage from the deepest dark to the swamp surface.', "node_count" = 6, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Vel''Naris') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Vel''Naris'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Abyssal Gate', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Whale Song Crossing', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Jellyfish Canopy', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Pearl Beds', 'The water deepens suddenly. Below is only endless blue fading to black. The pressure builds noticeably.', 'underwater', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Deep Blue', 'Oyster beds cover the sea floor, occasionally revealing the gleam of a natural pearl.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Thermal Vent', 'A canopy of translucent jellyfish drifts overhead, their trailing tentacles creating a shimmering curtain.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Vel''Naris' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thermal Vent', 'A canopy of translucent jellyfish drifts overhead, their trailing tentacles creating a shimmering curtain.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Vel''Naris';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Deep Blue', 'Oyster beds cover the sea floor, occasionally revealing the gleam of a natural pearl.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Vel''Naris';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Pearl Beds', 'The water deepens suddenly. Below is only endless blue fading to black. The pressure builds noticeably.', 'underwater', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Vel''Naris';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Jellyfish Canopy', 'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.', 'underwater', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Vel''Naris';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Whale Song Crossing', 'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Vel''Naris';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Abyssal Gate', 'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.', 'underwater', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Vel''Naris';

-- Gloom Market <-> Cinderkeep: Subterranean Passage
UPDATE "travel_routes" SET "name" = 'Subterranean Passage', "description" = 'A dark tunnel connecting the underground market to the marsh fortress.', "node_count" = 5, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Gloom Market') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Cinderkeep'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Cinderkeep') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Gloom Market'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Bog Island', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sunken Road', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Heron Watch', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 6, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Mushroom Bank', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Gaslight Passage', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Gloom Market' AND t2.name = 'Cinderkeep';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Gaslight Passage', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Gloom Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Mushroom Bank', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Gloom Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Heron Watch', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 6, 'bridge'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Gloom Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Sunken Road', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 5, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Gloom Market';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Bog Island', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 5, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Cinderkeep' AND t2.name = 'Gloom Market';

-- Misthaven <-> Eldergrove: Hidden Forest Trail
UPDATE "travel_routes" SET "name" = 'Hidden Forest Trail', "description" = 'A trail through the most ancient and magical part of the forest.', "node_count" = 5, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Misthaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Eldergrove') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Misthaven'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Owl Roost', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Root Tunnel', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Silver Birch Stand', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Dappled Glade', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Ancient Oak Crossing', 'Gossamer spider silk stretches between the trees, catching morning dew like strings of diamonds.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Eldergrove';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Ancient Oak Crossing', 'Gossamer spider silk stretches between the trees, catching morning dew like strings of diamonds.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dappled Glade', 'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Silver Birch Stand', 'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.', 'forest', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Root Tunnel', 'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Owl Roost', 'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.', 'forest', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Eldergrove' AND t2.name = 'Misthaven';

-- Misthaven <-> Aelindra: Deep Silverwood
UPDATE "travel_routes" SET "name" = 'Deep Silverwood', "description" = 'A path through towering trees where the air thrums with natural magic.', "node_count" = 6, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Misthaven') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Aelindra') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Misthaven'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Oxbow Bend', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Farmstead Gate', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Sunlit Vale', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 4, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Stone Marker', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 4, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Grazing Commons', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Cricket Hollow', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 3, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Misthaven' AND t2.name = 'Aelindra';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Cricket Hollow', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 3, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Grazing Commons', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Stone Marker', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 4, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Sunlit Vale', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 4, 'crossroads'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Farmstead Gate', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Misthaven';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Oxbow Bend', 'A lone watchtower rises from the plains, its beacon cold but its garrison alert.', 'plains', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Aelindra' AND t2.name = 'Misthaven';

-- The Foundry <-> Kazad-Vorn: The Abandoned Road
UPDATE "travel_routes" SET "name" = 'The Abandoned Road', "description" = 'An old dwarven road, partially reclaimed by wilderness, leading to the warforged citadel.', "node_count" = 8, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'The Foundry') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Kazad-Vorn') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'The Foundry'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Ash Heap', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Warlord''s Marker', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Scorpion Nest', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Desolation Point', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Skull Road', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Bone Valley', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Dust Storm Pass', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'War Monument', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Kazad-Vorn';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'War Monument', 'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dust Storm Pass', 'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Bone Valley', 'A crossroads where the bones of failed travelers remind the living to stay alert.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Skull Road', 'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Desolation Point', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Scorpion Nest', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Warlord''s Marker', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Ash Heap', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Kazad-Vorn' AND t2.name = 'The Foundry';

-- The Foundry <-> Porto Sole: Trade Road South
UPDATE "travel_routes" SET "name" = 'Trade Road South', "description" = 'A long road connecting the warforged forge to the coastal trade hub.', "node_count" = 9, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'The Foundry') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'The Foundry'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Whale Watch Point', 'White sand crunches underfoot as the trail follows the coastline. Turquoise waves lap gently at the shore.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sandy Stretch', 'Tall palms provide welcome shade along the coastal path. Coconuts litter the ground.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Tide Pool Walk', 'Seagulls wheel and cry above a jutting rock formation. Their guano paints the stone white.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Lighthouse Point', 'The shoreline is a riot of color from coral fragments and exotic shells washed up by warm currents.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Harbor View', 'A small dock and lean-to mark where local fishermen rest. Nets hang drying in the sea breeze.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Shell Beach', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Sea Cliff Path', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Driftwood Cove', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Salt Spray Lookout', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Foundry' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Salt Spray Lookout', 'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.', 'coastal', 2, 'ruins'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Driftwood Cove', 'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.', 'coastal', 3, 'watchtower'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Sea Cliff Path', 'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.', 'coastal', 3, 'camp'
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Shell Beach', 'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Harbor View', 'A small dock and lean-to mark where local fishermen rest. Nets hang drying in the sea breeze.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Lighthouse Point', 'The shoreline is a riot of color from coral fragments and exotic shells washed up by warm currents.', 'coastal', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Tide Pool Walk', 'Seagulls wheel and cry above a jutting rock formation. Their guano paints the stone white.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 8, 'Sandy Stretch', 'Tall palms provide welcome shade along the coastal path. Coconuts litter the ground.', 'coastal', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 9, 'Whale Watch Point', 'White sand crunches underfoot as the trail follows the coastline. Turquoise waves lap gently at the shore.', 'coastal', 2, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Foundry';

-- The Confluence <-> Porto Sole: Elemental Road
UPDATE "travel_routes" SET "name" = 'Elemental Road', "description" = 'A road where elemental energy occasionally surges, making travel unpredictable.', "node_count" = 7, "difficulty" = 'moderate'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'The Confluence') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Porto Sole') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'The Confluence'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Wildflower Meadow', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Barley Flats', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Millstone Hill', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Shepherd''s Rest', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Golden Mile', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Harvest Crossroads', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Windswept Field', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'The Confluence' AND t2.name = 'Porto Sole';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Windswept Field', 'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Harvest Crossroads', 'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Golden Mile', 'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Shepherd''s Rest', 'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Millstone Hill', 'An ancient milestone stands here, its carved distances worn but still legible after centuries.', 'plains', 4, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Barley Flats', 'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Confluence';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Wildflower Meadow', 'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.', 'plains', 3, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Porto Sole' AND t2.name = 'The Confluence';

-- Emberheart <-> Sandrift: Desert-Rift Path
UPDATE "travel_routes" SET "name" = 'Desert-Rift Path', "description" = 'A scorching path through desert and elemental rifts.', "node_count" = 5, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Emberheart') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Sandrift'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Sandrift') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Emberheart'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Ash Rain Valley', 'Steam and sulfurous gas jet from vents in the ground. The air stings the eyes and throat.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Charred Forest', 'A natural bridge of cooled lava spans a river of magma. Its surface is still warm to the touch.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Sulfur Springs', 'Fine volcanic ash falls like grey snow, coating everything. The sky is perpetually hazy.', 'volcanic', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Ember Rock', 'The blackened skeletons of trees stand in rows, killed by a lava flow that has since cooled and hardened.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Fire-Glass Ridge', 'Pools of mineral-rich water bubble and steam. Despite the heat, the colors are strangely beautiful.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Emberheart' AND t2.name = 'Sandrift';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Fire-Glass Ridge', 'Pools of mineral-rich water bubble and steam. Despite the heat, the colors are strangely beautiful.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Emberheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Ember Rock', 'The blackened skeletons of trees stand in rows, killed by a lava flow that has since cooled and hardened.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Emberheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Sulfur Springs', 'Fine volcanic ash falls like grey snow, coating everything. The sky is perpetually hazy.', 'volcanic', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Emberheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Charred Forest', 'A natural bridge of cooled lava spans a river of magma. Its surface is still warm to the touch.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Emberheart';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Ash Rain Valley', 'Steam and sulfurous gas jet from vents in the ground. The air stings the eyes and throat.', 'volcanic', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Sandrift' AND t2.name = 'Emberheart';

-- Ashenmoor <-> Nethermire: Cursed Marshland
UPDATE "travel_routes" SET "name" = 'Cursed Marshland', "description" = 'A path through the most accursed, haunted section of the marshes.', "node_count" = 7, "difficulty" = 'deadly'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashenmoor') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Nethermire') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashenmoor'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Bog Island', 'Herons stand motionless in the shallows, their eyes tracking movement with predatory patience.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Sunken Road', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Heron Watch', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Mushroom Bank', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Gaslight Passage', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Reed Maze', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Quicksand Warning', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Nethermire';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Quicksand Warning', 'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Reed Maze', 'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm''s length.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Gaslight Passage', 'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.', 'swamp', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Mushroom Bank', 'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.', 'swamp', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Heron Watch', 'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.', 'swamp', 8, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Sunken Road', 'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 7, 'Bog Island', 'Herons stand motionless in the shallows, their eyes tracking movement with predatory patience.', 'swamp', 7, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Nethermire' AND t2.name = 'Ashenmoor';

-- Ashenmoor <-> Mistwatch: Blighted Trail
UPDATE "travel_routes" SET "name" = 'Blighted Trail', "description" = 'A trail through sickly land where nothing wholesome grows.', "node_count" = 6, "difficulty" = 'dangerous'
WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = 'Ashenmoor') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch'))
   OR ("from_town_id" = (SELECT id FROM towns WHERE name = 'Mistwatch') AND "to_town_id" = (SELECT id FROM towns WHERE name = 'Ashenmoor'));

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Thorn Flats', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Dead Man''s Crossing', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Buzzard Ridge', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Cracked Earth', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Rusted Gate', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Ash Heap', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Ashenmoor' AND t2.name = 'Mistwatch';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 1, 'Ash Heap', 'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 2, 'Rusted Gate', 'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 3, 'Cracked Earth', 'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 4, 'Buzzard Ridge', 'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.', 'badlands', 6, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 5, 'Dead Man''s Crossing', 'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Ashenmoor';

INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")
SELECT gen_random_uuid(), tr.id, 6, 'Thorn Flats', 'The earth is cracked into a web of deep fissures. Something growls from the darkness below.', 'badlands', 5, NULL
FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = 'Mistwatch' AND t2.name = 'Ashenmoor';

-- Set default node_count for any remaining routes based on old distance pattern
UPDATE "travel_routes" SET "node_count" = 3 WHERE "name" = '' AND "node_count" = 3;

