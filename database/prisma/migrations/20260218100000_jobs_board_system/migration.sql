-- Jobs Board System: Extend JobListing + Add pendingYield to OwnedAsset

-- JobListing: add new columns
ALTER TABLE "job_listings" ADD COLUMN "job_type" VARCHAR(50) NOT NULL DEFAULT 'harvest_field';
ALTER TABLE "job_listings" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN';
ALTER TABLE "job_listings" ADD COLUMN "auto_posted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "job_listings" ADD COLUMN "product_yield" JSONB;
ALTER TABLE "job_listings" ADD COLUMN "completed_at" TIMESTAMPTZ;
ALTER TABLE "job_listings" ADD COLUMN "expires_at" INTEGER;

-- Migrate isOpen → status
UPDATE "job_listings" SET "status" = CASE WHEN "is_open" THEN 'OPEN' ELSE 'COMPLETED' END;

-- Drop old isOpen column
ALTER TABLE "job_listings" DROP COLUMN "is_open";

-- Remove unique constraint on asset_id, add regular index
ALTER TABLE "job_listings" DROP CONSTRAINT IF EXISTS "job_listings_asset_id_key";
CREATE INDEX IF NOT EXISTS "job_listings_asset_id_idx" ON "job_listings"("asset_id");

-- Replace old index with new status-based index
DROP INDEX IF EXISTS "job_listings_town_id_is_open_idx";
CREATE INDEX "job_listings_town_id_status_idx" ON "job_listings"("town_id", "status");

-- Add JOB to DailyActionType enum
ALTER TYPE "DailyActionType" ADD VALUE IF NOT EXISTS 'JOB';

-- OwnedAsset: add pending yield fields for RANCHER collection
ALTER TABLE "owned_assets" ADD COLUMN "pending_yield" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "owned_assets" ADD COLUMN "pending_yield_since" INTEGER;
