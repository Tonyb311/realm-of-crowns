-- Travel presets: engagement mode, target selection strategy

DO $$ BEGIN
  CREATE TYPE "TravelEngagementMode" AS ENUM ('ALWAYS_FIGHT', 'FIGHT_IF_WINNABLE', 'FLEE_IF_DANGEROUS', 'ALWAYS_FLEE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TargetSelectionStrategy" AS ENUM ('FIRST', 'WEAKEST', 'STRONGEST', 'LOWEST_AC', 'CASTER_FIRST');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "travel_engagement_mode" "TravelEngagementMode" NOT NULL DEFAULT 'ALWAYS_FIGHT';
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "travel_flee_max_monster_level" integer;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "target_selection_strategy" "TargetSelectionStrategy" NOT NULL DEFAULT 'FIRST';
