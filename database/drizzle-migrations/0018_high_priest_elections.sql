-- Religion Phase A3: High Priest elections — extend elections table for church leadership

-- 1. Add HIGH_PRIEST to ElectionType enum
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction.
-- The breakpoint below ensures this commits before the next statement.
ALTER TYPE "ElectionType" ADD VALUE IF NOT EXISTS 'HIGH_PRIEST';
--> statement-breakpoint

-- 2. Add god_id column to elections table (nullable — null for MAYOR/RULER elections)
ALTER TABLE "elections" ADD COLUMN IF NOT EXISTS "god_id" text;

-- 3. Foreign key: god_id -> gods.id
ALTER TABLE "elections" ADD CONSTRAINT "elections_god_id_fkey" FOREIGN KEY ("god_id") REFERENCES "gods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Index on god_id
CREATE INDEX IF NOT EXISTS "elections_god_id_idx" ON "elections" USING btree ("god_id");
