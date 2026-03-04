-- Remove skill points column from characters table
-- Abilities are now auto-granted based on level and specialization
ALTER TABLE "characters" DROP COLUMN IF EXISTS "unspent_skill_points";
