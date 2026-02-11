-- Rollback: 20260208195306_add_npcs_and_quest_fields

-- Drop foreign keys
ALTER TABLE "quests" DROP CONSTRAINT IF EXISTS "quests_prerequisite_quest_id_fkey";
ALTER TABLE "npcs" DROP CONSTRAINT IF EXISTS "npcs_town_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "quests_prerequisite_quest_id_idx";

-- Drop table
DROP TABLE IF EXISTS "npcs" CASCADE;

-- Remove added columns from quests
ALTER TABLE "quests" DROP COLUMN IF EXISTS "cooldown_hours";
ALTER TABLE "quests" DROP COLUMN IF EXISTS "is_repeatable";
ALTER TABLE "quests" DROP COLUMN IF EXISTS "prerequisite_quest_id";

-- Drop enum
DROP TYPE IF EXISTS "NpcRole" CASCADE;
