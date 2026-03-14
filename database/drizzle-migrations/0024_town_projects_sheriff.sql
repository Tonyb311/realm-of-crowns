-- Town Projects table
CREATE TABLE IF NOT EXISTS "town_projects" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "project_type" text NOT NULL,
  "status" text DEFAULT 'IN_PROGRESS' NOT NULL,
  "commissioned_by_id" text NOT NULL,
  "cost" integer NOT NULL,
  "started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "completes_at" timestamp(3) NOT NULL,
  "completed_at" timestamp(3),
  "target_route_id" text,
  "metadata" jsonb,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "town_projects" ADD CONSTRAINT "town_projects_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "town_projects" ADD CONSTRAINT "town_projects_commissioned_by_id_fkey" FOREIGN KEY ("commissioned_by_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "town_projects" ADD CONSTRAINT "town_projects_target_route_id_fkey" FOREIGN KEY ("target_route_id") REFERENCES "public"."travel_routes"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "town_projects_town_id_idx" ON "town_projects" USING btree ("town_id");
CREATE INDEX IF NOT EXISTS "town_projects_status_idx" ON "town_projects" USING btree ("status");

-- Add projectModifier to town_metrics
ALTER TABLE "town_metrics" ADD COLUMN IF NOT EXISTS "project_modifier" integer DEFAULT 0 NOT NULL;

-- Add sheriff budget columns to town_policies
ALTER TABLE "town_policies" ADD COLUMN IF NOT EXISTS "sheriff_daily_budget" integer DEFAULT 50 NOT NULL;
ALTER TABLE "town_policies" ADD COLUMN IF NOT EXISTS "sheriff_budget_used_today" integer DEFAULT 0 NOT NULL;
