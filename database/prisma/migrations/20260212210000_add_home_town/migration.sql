-- Add home_town_id to characters
ALTER TABLE "characters" ADD COLUMN "home_town_id" TEXT;

-- Add foreign key constraint
ALTER TABLE "characters" ADD CONSTRAINT "characters_home_town_id_fkey"
  FOREIGN KEY ("home_town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: set home_town_id to current_town_id for existing characters
UPDATE "characters" SET "home_town_id" = "current_town_id" WHERE "home_town_id" IS NULL AND "current_town_id" IS NOT NULL;
