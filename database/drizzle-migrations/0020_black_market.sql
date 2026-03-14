CREATE TABLE IF NOT EXISTS "black_market_listings" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "seller_id" text NOT NULL,
  "item_id" text NOT NULL,
  "item_template_id" text NOT NULL,
  "item_name" text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "price" integer NOT NULL,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "black_market_listings_town_id_idx" ON "black_market_listings" USING btree ("town_id" ASC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "black_market_listings_seller_id_idx" ON "black_market_listings" USING btree ("seller_id" ASC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "black_market_listings" ADD CONSTRAINT "black_market_listings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "black_market_listings" ADD CONSTRAINT "black_market_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "black_market_listings" ADD CONSTRAINT "black_market_listings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "black_market_listings" ADD CONSTRAINT "black_market_listings_item_template_id_fkey" FOREIGN KEY ("item_template_id") REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
