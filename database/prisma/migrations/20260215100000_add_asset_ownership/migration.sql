-- AlterEnum
ALTER TYPE "DailyActionType" ADD VALUE 'HARVEST';

-- CreateTable
CREATE TABLE "owned_assets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "profession_type" TEXT NOT NULL,
    "spot_type" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "slot_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "crop_state" TEXT NOT NULL DEFAULT 'EMPTY',
    "planted_at" INTEGER,
    "ready_at" INTEGER,
    "withering_at" INTEGER,
    "purchase_price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owned_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "wage" INTEGER NOT NULL,
    "worker_id" TEXT,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owned_assets_owner_id_profession_type_tier_slot_number_key" ON "owned_assets"("owner_id", "profession_type", "tier", "slot_number");

-- CreateIndex
CREATE INDEX "owned_assets_owner_id_idx" ON "owned_assets"("owner_id");

-- CreateIndex
CREATE INDEX "owned_assets_town_id_idx" ON "owned_assets"("town_id");

-- CreateIndex
CREATE INDEX "owned_assets_crop_state_idx" ON "owned_assets"("crop_state");

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_asset_id_key" ON "job_listings"("asset_id");

-- CreateIndex
CREATE INDEX "job_listings_town_id_is_open_idx" ON "job_listings"("town_id", "is_open");

-- CreateIndex
CREATE INDEX "job_listings_owner_id_idx" ON "job_listings"("owner_id");

-- CreateIndex
CREATE INDEX "job_listings_worker_id_idx" ON "job_listings"("worker_id");

-- AddForeignKey
ALTER TABLE "owned_assets" ADD CONSTRAINT "owned_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_assets" ADD CONSTRAINT "owned_assets_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "owned_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
