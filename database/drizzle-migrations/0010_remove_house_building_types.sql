-- Migration: Remove HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE from BuildingType enum
-- Safe because buildings table starts empty (all buildings are player-created)
-- and no player should have built HOUSE types.

-- Pre-check: abort if any buildings with HOUSE types exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM buildings
    WHERE type IN ('HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE')
  ) THEN
    RAISE EXCEPTION 'Cannot remove HOUSE building types: existing HOUSE buildings found. Migrate or delete them first.';
  END IF;
END $$;

-- Rename old enum
ALTER TYPE "BuildingType" RENAME TO "BuildingType_old";

-- Create new enum without HOUSE types
CREATE TYPE "BuildingType" AS ENUM (
  'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB',
  'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP',
  'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY',
  'STABLE', 'WAREHOUSE', 'BANK', 'INN', 'MARKET_STALL',
  'FARM', 'RANCH', 'MINE'
);

-- Swap column type
ALTER TABLE "buildings" ALTER COLUMN "type" TYPE "BuildingType" USING "type"::text::"BuildingType";

-- Drop old enum
DROP TYPE "BuildingType_old";
