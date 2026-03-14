CREATE TABLE IF NOT EXISTS "racial_reputations" (
  "id" text PRIMARY KEY NOT NULL,
  "character_id" text NOT NULL,
  "race" text NOT NULL,
  "score" real DEFAULT 0 NOT NULL,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "racial_reputations_character_id_race_key" ON "racial_reputations" USING btree ("character_id" ASC NULLS LAST, "race" ASC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "racial_reputations_character_id_idx" ON "racial_reputations" USING btree ("character_id" ASC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "racial_reputations" ADD CONSTRAINT "racial_reputations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
