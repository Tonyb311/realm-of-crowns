-- Town Proclamations
CREATE TABLE IF NOT EXISTS "town_proclamations" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "author_id" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "is_urgent" boolean DEFAULT false NOT NULL,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" timestamp(3)
);

CREATE INDEX IF NOT EXISTS "town_proclamations_town_id_idx" ON "town_proclamations" USING btree ("town_id");

ALTER TABLE "town_proclamations"
  ADD CONSTRAINT "town_proclamations_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "town_proclamations"
  ADD CONSTRAINT "town_proclamations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;

-- Travel Logs
CREATE TABLE IF NOT EXISTS "travel_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "character_id" text NOT NULL,
  "character_name" text NOT NULL,
  "character_race" text NOT NULL,
  "action" text NOT NULL,
  "from_town_id" text,
  "to_town_id" text,
  "occurred_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "travel_logs_town_id_idx" ON "travel_logs" USING btree ("town_id");
CREATE INDEX IF NOT EXISTS "travel_logs_occurred_at_idx" ON "travel_logs" USING btree ("occurred_at");

ALTER TABLE "travel_logs"
  ADD CONSTRAINT "travel_logs_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "travel_logs"
  ADD CONSTRAINT "travel_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;

-- Notice Board Posts: moderation + official columns
ALTER TABLE "notice_board_posts" ADD COLUMN IF NOT EXISTS "is_moderated" boolean DEFAULT false NOT NULL;
ALTER TABLE "notice_board_posts" ADD COLUMN IF NOT EXISTS "moderation_reason" text;
ALTER TABLE "notice_board_posts" ADD COLUMN IF NOT EXISTS "is_official" boolean DEFAULT false NOT NULL;
