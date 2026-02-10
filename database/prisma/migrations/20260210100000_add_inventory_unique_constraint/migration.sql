-- CreateIndex
CREATE UNIQUE INDEX "inventories_character_id_item_id_key" ON "inventories"("character_id", "item_id");
