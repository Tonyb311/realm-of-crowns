CREATE TABLE IF NOT EXISTS "dropped_items" (
  "id" text PRIMARY KEY NOT NULL,
  "character_id" text NOT NULL,
  "item_template_id" text NOT NULL,
  "item_template_name" text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "weight" double precision DEFAULT 0 NOT NULL,
  "dropped_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "dropped_items_character_id_idx" ON "dropped_items" USING btree ("character_id");
CREATE INDEX IF NOT EXISTS "dropped_items_expires_at_idx" ON "dropped_items" USING btree ("expires_at");

ALTER TABLE "dropped_items" ADD CONSTRAINT "dropped_items_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
