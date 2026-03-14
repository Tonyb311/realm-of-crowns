CREATE TABLE IF NOT EXISTS "disputes" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "filer_id" text NOT NULL,
  "target_id" text,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "resolution" text,
  "arbiter_id" text,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "resolved_at" timestamp(3)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disputes_town_id_idx" ON "disputes" USING btree ("town_id" ASC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_filer_id_fkey" FOREIGN KEY ("filer_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_arbiter_id_fkey" FOREIGN KEY ("arbiter_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referendums" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "proposed_by_id" text NOT NULL,
  "question" text NOT NULL,
  "policy_type" text NOT NULL,
  "policy_value" jsonb NOT NULL,
  "status" text DEFAULT 'VOTING' NOT NULL,
  "votes_for" integer DEFAULT 0 NOT NULL,
  "votes_against" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "ends_at" timestamp(3) NOT NULL,
  "resolved_at" timestamp(3)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referendums_town_id_idx" ON "referendums" USING btree ("town_id" ASC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "referendums" ADD CONSTRAINT "referendums_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "referendums" ADD CONSTRAINT "referendums_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referendum_votes" (
  "id" text PRIMARY KEY NOT NULL,
  "referendum_id" text NOT NULL,
  "character_id" text NOT NULL,
  "vote" boolean NOT NULL,
  "voted_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referendum_votes_referendum_id_character_id_key" ON "referendum_votes" USING btree ("referendum_id" ASC NULLS LAST, "character_id" ASC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "referendum_votes" ADD CONSTRAINT "referendum_votes_referendum_id_fkey" FOREIGN KEY ("referendum_id") REFERENCES "referendums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "referendum_votes" ADD CONSTRAINT "referendum_votes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
