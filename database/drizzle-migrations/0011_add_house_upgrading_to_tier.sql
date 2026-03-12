-- Migration: Add upgrading_to_tier column to houses table
-- Tracks pending cottage tier upgrades (null = not upgrading, integer = target tier)
ALTER TABLE "houses" ADD COLUMN "upgrading_to_tier" INTEGER DEFAULT NULL;
