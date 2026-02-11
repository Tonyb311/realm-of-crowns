-- Rollback: 20260209121626_extend_profession_system

DROP INDEX IF EXISTS "player_professions_character_id_is_active_idx";
ALTER TABLE "player_professions" DROP COLUMN IF EXISTS "is_active";
ALTER TABLE "player_professions" DROP COLUMN IF EXISTS "specialization";
