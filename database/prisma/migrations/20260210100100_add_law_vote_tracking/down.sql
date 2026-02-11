-- Rollback: 20260210100100_add_law_vote_tracking

ALTER TABLE "law_votes" DROP CONSTRAINT IF EXISTS "law_votes_character_id_fkey";
ALTER TABLE "law_votes" DROP CONSTRAINT IF EXISTS "law_votes_law_id_fkey";
DROP TABLE IF EXISTS "law_votes" CASCADE;
