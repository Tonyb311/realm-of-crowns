-- CreateTable
CREATE TABLE "livestock" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "animal_type" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER NOT NULL DEFAULT 0,
    "hunger" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "last_fed_at" INTEGER,
    "last_produced_at" INTEGER,
    "is_alive" BOOLEAN NOT NULL DEFAULT true,
    "death_cause" TEXT,
    "purchased_at" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livestock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "livestock_building_id_idx" ON "livestock"("building_id");

-- CreateIndex
CREATE INDEX "livestock_owner_id_idx" ON "livestock"("owner_id");

-- CreateIndex
CREATE INDEX "livestock_is_alive_idx" ON "livestock"("is_alive");

-- AddForeignKey
ALTER TABLE "livestock" ADD CONSTRAINT "livestock_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "owned_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock" ADD CONSTRAINT "livestock_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
