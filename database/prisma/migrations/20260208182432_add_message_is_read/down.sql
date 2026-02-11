-- Rollback: 20260208182432_add_message_is_read
-- Note: This migration added governance tables, election/law extensions, AND messages.is_read

-- Drop foreign keys first
ALTER TABLE "town_policies" DROP CONSTRAINT IF EXISTS "town_policies_sheriff_id_fkey";
ALTER TABLE "town_policies" DROP CONSTRAINT IF EXISTS "town_policies_town_id_fkey";
ALTER TABLE "council_members" DROP CONSTRAINT IF EXISTS "council_members_appointed_by_id_fkey";
ALTER TABLE "council_members" DROP CONSTRAINT IF EXISTS "council_members_character_id_fkey";
ALTER TABLE "council_members" DROP CONSTRAINT IF EXISTS "council_members_town_id_fkey";
ALTER TABLE "council_members" DROP CONSTRAINT IF EXISTS "council_members_kingdom_id_fkey";
ALTER TABLE "town_treasuries" DROP CONSTRAINT IF EXISTS "town_treasuries_town_id_fkey";
ALTER TABLE "impeachment_votes" DROP CONSTRAINT IF EXISTS "impeachment_votes_voter_id_fkey";
ALTER TABLE "impeachment_votes" DROP CONSTRAINT IF EXISTS "impeachment_votes_impeachment_id_fkey";
ALTER TABLE "impeachments" DROP CONSTRAINT IF EXISTS "impeachments_kingdom_id_fkey";
ALTER TABLE "impeachments" DROP CONSTRAINT IF EXISTS "impeachments_town_id_fkey";
ALTER TABLE "impeachments" DROP CONSTRAINT IF EXISTS "impeachments_target_id_fkey";
ALTER TABLE "election_candidates" DROP CONSTRAINT IF EXISTS "election_candidates_character_id_fkey";
ALTER TABLE "election_candidates" DROP CONSTRAINT IF EXISTS "election_candidates_election_id_fkey";
ALTER TABLE "elections" DROP CONSTRAINT IF EXISTS "elections_kingdom_id_fkey";

-- Drop tables
DROP TABLE IF EXISTS "town_policies" CASCADE;
DROP TABLE IF EXISTS "council_members" CASCADE;
DROP TABLE IF EXISTS "town_treasuries" CASCADE;
DROP TABLE IF EXISTS "impeachment_votes" CASCADE;
DROP TABLE IF EXISTS "impeachments" CASCADE;
DROP TABLE IF EXISTS "election_candidates" CASCADE;

-- Remove added columns
ALTER TABLE "messages" DROP COLUMN IF EXISTS "is_read";
ALTER TABLE "laws" DROP COLUMN IF EXISTS "expires_at";
ALTER TABLE "laws" DROP COLUMN IF EXISTS "law_type";
ALTER TABLE "laws" DROP COLUMN IF EXISTS "proposed_at";
ALTER TABLE "laws" DROP COLUMN IF EXISTS "status";
ALTER TABLE "laws" DROP COLUMN IF EXISTS "votes_against";
ALTER TABLE "laws" DROP COLUMN IF EXISTS "votes_for";
ALTER TABLE "elections" DROP COLUMN IF EXISTS "kingdom_id";
ALTER TABLE "elections" DROP COLUMN IF EXISTS "phase";
ALTER TABLE "elections" DROP COLUMN IF EXISTS "term_number";

-- Drop indexes
DROP INDEX IF EXISTS "elections_kingdom_id_idx";
DROP INDEX IF EXISTS "laws_status_idx";

-- Drop enums
DROP TYPE IF EXISTS "ElectionPhase" CASCADE;
DROP TYPE IF EXISTS "ImpeachmentStatus" CASCADE;
