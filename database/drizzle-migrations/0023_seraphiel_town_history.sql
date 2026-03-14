CREATE TABLE IF NOT EXISTS "town_history_log" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "event_type" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "involved_character_id" text,
  "involved_race" text,
  "metadata" jsonb,
  "occurred_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "town_history_log" ADD CONSTRAINT "town_history_log_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "town_history_log" ADD CONSTRAINT "town_history_log_involved_character_id_fkey" FOREIGN KEY ("involved_character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "town_history_log_town_id_idx" ON "town_history_log" USING btree ("town_id");
CREATE INDEX IF NOT EXISTS "town_history_log_event_type_idx" ON "town_history_log" USING btree ("event_type");
CREATE INDEX IF NOT EXISTS "town_history_log_occurred_at_idx" ON "town_history_log" USING btree ("occurred_at");
