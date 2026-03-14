-- Add REPEALED to LawStatus enum
ALTER TYPE "LawStatus" ADD VALUE IF NOT EXISTS 'REPEALED';
--> statement-breakpoint
-- Make laws.kingdom_id nullable (town laws have no kingdom)
ALTER TABLE "laws" ALTER COLUMN "kingdom_id" DROP NOT NULL;
--> statement-breakpoint
-- Add town_id to laws for town-level executive laws
ALTER TABLE "laws" ADD COLUMN "town_id" text;
--> statement-breakpoint
CREATE INDEX "laws_town_id_idx" ON "laws" USING btree ("town_id");
--> statement-breakpoint
ALTER TABLE "laws" ADD CONSTRAINT "laws_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
-- Item price ceilings table
CREATE TABLE "item_price_ceilings" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"item_template_id" text NOT NULL,
	"max_price" integer NOT NULL,
	"set_by_id" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "item_price_ceilings_town_id_item_template_id_unique" UNIQUE("town_id","item_template_id")
);
--> statement-breakpoint
CREATE INDEX "item_price_ceilings_town_id_idx" ON "item_price_ceilings" USING btree ("town_id");
--> statement-breakpoint
ALTER TABLE "item_price_ceilings" ADD CONSTRAINT "item_price_ceilings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "item_price_ceilings" ADD CONSTRAINT "item_price_ceilings_item_template_id_fkey" FOREIGN KEY ("item_template_id") REFERENCES "public"."item_templates"("id") ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "item_price_ceilings" ADD CONSTRAINT "item_price_ceilings_set_by_id_fkey" FOREIGN KEY ("set_by_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;
