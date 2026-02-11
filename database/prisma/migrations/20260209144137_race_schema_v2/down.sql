-- Rollback: 20260209144137_race_schema_v2

-- Drop foreign key
ALTER TABLE "character_appearances" DROP CONSTRAINT IF EXISTS "character_appearances_character_id_fkey";

-- Drop table
DROP TABLE IF EXISTS "character_appearances" CASCADE;

-- Remove added columns from characters
ALTER TABLE "characters" DROP COLUMN IF EXISTS "current_appearance_race";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "race_tier";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "sub_race";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "unlocked_abilities";
