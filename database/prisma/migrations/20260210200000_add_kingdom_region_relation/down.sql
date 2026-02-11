-- Rollback: 20260210200000_add_kingdom_region_relation

DROP INDEX IF EXISTS "regions_kingdom_id_idx";
ALTER TABLE "regions" DROP CONSTRAINT IF EXISTS "regions_kingdom_id_fkey";
ALTER TABLE "regions" DROP COLUMN IF EXISTS "kingdom_id";
