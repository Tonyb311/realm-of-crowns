-- Add TUTORIAL to QuestType enum
ALTER TYPE "QuestType" ADD VALUE IF NOT EXISTS 'TUTORIAL';

-- Add new columns to quests table
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Unique index on slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "quests_slug_key" ON "quests" ("slug");

-- Enforce one active quest per character at database level
-- A character can only have ONE quest_progress row with status 'IN_PROGRESS'
CREATE UNIQUE INDEX IF NOT EXISTS "quest_progress_one_active_per_character"
  ON "quest_progress" ("character_id")
  WHERE status = 'IN_PROGRESS';
