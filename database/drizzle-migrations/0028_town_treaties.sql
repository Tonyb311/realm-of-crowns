-- Town Treaties
CREATE TABLE IF NOT EXISTS "town_treaties" (
  "id" text PRIMARY KEY NOT NULL,
  "town_a_id" text NOT NULL,
  "town_b_id" text NOT NULL,
  "proposed_by_id" text,
  "treaty_type" text NOT NULL,
  "terms" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'PROPOSED',
  "duration" integer NOT NULL DEFAULT 30,
  "town_a_votes_for" integer NOT NULL DEFAULT 0,
  "town_a_votes_against" integer NOT NULL DEFAULT 0,
  "town_b_votes_for" integer NOT NULL DEFAULT 0,
  "town_b_votes_against" integer NOT NULL DEFAULT 0,
  "ratification_ends_at" timestamp(3),
  "activated_at" timestamp(3),
  "expires_at" timestamp(3),
  "cancelled_at" timestamp(3),
  "cancel_notice_until" timestamp(3),
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp(3) NOT NULL
);

-- Town Treaty Votes
CREATE TABLE IF NOT EXISTS "town_treaty_votes" (
  "id" text PRIMARY KEY NOT NULL,
  "treaty_id" text NOT NULL,
  "character_id" text NOT NULL,
  "town_id" text NOT NULL,
  "vote" boolean NOT NULL,
  "voted_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "town_treaties_town_a_id_idx" ON "town_treaties" USING btree ("town_a_id");
CREATE INDEX IF NOT EXISTS "town_treaties_town_b_id_idx" ON "town_treaties" USING btree ("town_b_id");
CREATE INDEX IF NOT EXISTS "town_treaties_status_idx" ON "town_treaties" USING btree ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "town_treaty_votes_treaty_character_key" ON "town_treaty_votes" USING btree ("treaty_id", "character_id");
CREATE INDEX IF NOT EXISTS "town_treaty_votes_treaty_id_idx" ON "town_treaty_votes" USING btree ("treaty_id");

-- Foreign keys
ALTER TABLE "town_treaties" ADD CONSTRAINT "town_treaties_town_a_id_fkey" FOREIGN KEY ("town_a_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "town_treaties" ADD CONSTRAINT "town_treaties_town_b_id_fkey" FOREIGN KEY ("town_b_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "town_treaties" ADD CONSTRAINT "town_treaties_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "town_treaty_votes" ADD CONSTRAINT "town_treaty_votes_treaty_id_fkey" FOREIGN KEY ("treaty_id") REFERENCES "town_treaties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "town_treaty_votes" ADD CONSTRAINT "town_treaty_votes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
