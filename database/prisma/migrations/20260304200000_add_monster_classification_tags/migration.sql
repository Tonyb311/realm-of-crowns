-- AlterTable: Add classification columns to monsters
ALTER TABLE "monsters" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'beast';
ALTER TABLE "monsters" ADD COLUMN "sentient" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "monsters" ADD COLUMN "size" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "monsters" ADD COLUMN "tags" JSONB NOT NULL DEFAULT '{}';

-- Update encounterType default from 'solo' to 'standard'
ALTER TABLE "monsters" ALTER COLUMN "encounter_type" SET DEFAULT 'standard';
