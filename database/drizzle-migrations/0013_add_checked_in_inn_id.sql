-- Migration: Add checked_in_inn_id to characters for inn presence tracking
ALTER TABLE "characters" ADD COLUMN "checked_in_inn_id" TEXT;

CREATE INDEX "characters_checked_in_inn_id_idx" ON "characters" USING btree ("checked_in_inn_id");

ALTER TABLE "characters" ADD CONSTRAINT "characters_checked_in_inn_id_fkey"
  FOREIGN KEY ("checked_in_inn_id") REFERENCES "buildings"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;
