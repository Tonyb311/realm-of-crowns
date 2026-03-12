-- Migration: Create inn_menu table for tavern item menu system
CREATE TABLE "inn_menu" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "building_id" TEXT NOT NULL REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "item_template_id" TEXT NOT NULL REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "price" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inn_menu_building_id_item_template_id_unique" UNIQUE ("building_id", "item_template_id")
);

CREATE INDEX "inn_menu_building_id_idx" ON "inn_menu" USING btree ("building_id");
