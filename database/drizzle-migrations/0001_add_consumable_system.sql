-- Migration: Add consumable system (active effects table, daily flags, combat presets)

-- New enum for consumable source types
DO $$ BEGIN
  CREATE TYPE "ConsumableSourceType" AS ENUM('POTION', 'FOOD', 'SCROLL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- New table for character active effects (pre-tick consumable buffs)
CREATE TABLE IF NOT EXISTS "character_active_effects" (
  "id" text PRIMARY KEY NOT NULL,
  "character_id" text NOT NULL,
  "source_type" "ConsumableSourceType" NOT NULL,
  "effect_type" text NOT NULL,
  "magnitude" integer DEFAULT 0 NOT NULL,
  "effect_type_2" text,
  "magnitude_2" integer,
  "item_name" text NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL
);

-- Indexes for active effects
CREATE INDEX IF NOT EXISTS "character_active_effects_character_id_idx" ON "character_active_effects" USING btree ("character_id");
CREATE INDEX IF NOT EXISTS "character_active_effects_expires_at_idx" ON "character_active_effects" USING btree ("expires_at");

-- Foreign key
ALTER TABLE "character_active_effects"
  ADD CONSTRAINT "character_active_effects_character_id_fkey"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

-- Add consumable daily flags to characters
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "potion_buff_used_today" boolean DEFAULT false NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "food_used_today" boolean DEFAULT false NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "scroll_used_today" boolean DEFAULT false NOT NULL;

-- Add healing potion combat preset columns
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "healing_potion_threshold" integer DEFAULT 50 NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "max_healing_potions_per_combat" integer DEFAULT 1 NOT NULL;
