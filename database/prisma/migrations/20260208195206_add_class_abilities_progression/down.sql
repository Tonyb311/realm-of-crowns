-- Rollback: 20260208195206_add_class_abilities_progression

-- Drop foreign keys
ALTER TABLE "character_abilities" DROP CONSTRAINT IF EXISTS "character_abilities_ability_id_fkey";
ALTER TABLE "character_abilities" DROP CONSTRAINT IF EXISTS "character_abilities_character_id_fkey";
ALTER TABLE "abilities" DROP CONSTRAINT IF EXISTS "abilities_prerequisite_ability_id_fkey";

-- Drop tables
DROP TABLE IF EXISTS "character_abilities" CASCADE;
DROP TABLE IF EXISTS "abilities" CASCADE;

-- Remove added columns from characters
ALTER TABLE "characters" DROP COLUMN IF EXISTS "class";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "specialization";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "title";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "unspent_skill_points";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "unspent_stat_points";
