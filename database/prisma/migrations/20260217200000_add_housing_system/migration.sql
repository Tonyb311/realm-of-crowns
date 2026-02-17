-- CreateTable
CREATE TABLE "houses" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "storage_slots" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house_storage" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "item_template_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "house_storage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "houses_character_id_idx" ON "houses"("character_id");

-- CreateIndex
CREATE INDEX "houses_town_id_idx" ON "houses"("town_id");

-- CreateIndex
CREATE UNIQUE INDEX "houses_character_id_town_id_key" ON "houses"("character_id", "town_id");

-- CreateIndex
CREATE INDEX "house_storage_house_id_idx" ON "house_storage"("house_id");

-- CreateIndex
CREATE UNIQUE INDEX "house_storage_house_id_item_template_id_key" ON "house_storage"("house_id", "item_template_id");

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_storage" ADD CONSTRAINT "house_storage_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_storage" ADD CONSTRAINT "house_storage_item_template_id_fkey" FOREIGN KEY ("item_template_id") REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
