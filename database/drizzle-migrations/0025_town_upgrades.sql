CREATE TABLE "town_upgrades" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"upgrade_type" text NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"daily_maintenance" integer NOT NULL,
	"degrading_days" integer DEFAULT 0 NOT NULL,
	"purchased_by_id" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "town_upgrades_town_id_upgrade_type_unique" UNIQUE("town_id","upgrade_type")
);
--> statement-breakpoint
CREATE INDEX "town_upgrades_town_id_idx" ON "town_upgrades" USING btree ("town_id");
--> statement-breakpoint
ALTER TABLE "town_upgrades" ADD CONSTRAINT "town_upgrades_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "town_upgrades" ADD CONSTRAINT "town_upgrades_purchased_by_id_fkey" FOREIGN KEY ("purchased_by_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;
