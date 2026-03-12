-- Replace job_listings with unified jobs table
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"town_id" text NOT NULL,
	"poster_id" text NOT NULL,
	"worker_id" text,
	"title" text NOT NULL,
	"description" text,
	"wage" integer NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"expires_at" timestamp (3),
	"completed_at" timestamp (3),
	"result" jsonb,
	"asset_id" text,
	"job_type" text,
	"auto_posted" boolean DEFAULT false NOT NULL,
	"recipe_id" text,
	"workshop_building_id" text,
	"materials_escrow" jsonb,
	"destination_town_id" text,
	"delivery_items" jsonb,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_town_id_status_idx" ON "jobs" USING btree ("town_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_poster_id_idx" ON "jobs" USING btree ("poster_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_worker_id_idx" ON "jobs" USING btree ("worker_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_asset_id_idx" ON "jobs" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_category_idx" ON "jobs" USING btree ("category");
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_poster_id_fkey" FOREIGN KEY ("poster_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."owned_assets"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
DROP TABLE IF EXISTS "job_listings";
