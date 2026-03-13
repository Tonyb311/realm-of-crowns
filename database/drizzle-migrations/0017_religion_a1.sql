-- Religion Phase A1: gods table, church_chapters table, character religion columns

-- 1. Create gods table
CREATE TABLE IF NOT EXISTS "gods" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"philosophy" text NOT NULL,
	"church_name" text NOT NULL,
	"church_description" text NOT NULL,
	"racial_lean" text NOT NULL,
	"icon_name" text,
	"color_hex" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Create church_chapters table
CREATE TABLE IF NOT EXISTS "church_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"god_id" text NOT NULL,
	"town_id" text NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'MINORITY' NOT NULL,
	"is_dominant" boolean DEFAULT false NOT NULL,
	"is_shrine" boolean DEFAULT false NOT NULL,
	"treasury" integer DEFAULT 0 NOT NULL,
	"high_priest_id" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Add religion columns to characters
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "patron_god_id" text;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "conversion_cooldown_until" timestamp(3);
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "tithe_rate" integer DEFAULT 10 NOT NULL;

-- 4. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "church_chapters_god_id_town_id_key" ON "church_chapters" USING btree ("god_id","town_id");
CREATE INDEX IF NOT EXISTS "church_chapters_town_id_idx" ON "church_chapters" USING btree ("town_id");
CREATE INDEX IF NOT EXISTS "church_chapters_god_id_idx" ON "church_chapters" USING btree ("god_id");
CREATE INDEX IF NOT EXISTS "characters_patron_god_id_idx" ON "characters" USING btree ("patron_god_id");

-- 5. Foreign keys
ALTER TABLE "church_chapters" ADD CONSTRAINT "church_chapters_god_id_fkey" FOREIGN KEY ("god_id") REFERENCES "gods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "church_chapters" ADD CONSTRAINT "church_chapters_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "church_chapters" ADD CONSTRAINT "church_chapters_high_priest_id_fkey" FOREIGN KEY ("high_priest_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "characters" ADD CONSTRAINT "characters_patron_god_id_fkey" FOREIGN KEY ("patron_god_id") REFERENCES "gods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
