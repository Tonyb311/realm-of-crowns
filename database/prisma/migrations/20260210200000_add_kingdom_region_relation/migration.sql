-- P1 #16 / Database MAJOR-01: Add kingdom_id FK to Region model
-- Links regions to their governing kingdom for territory ownership queries

-- AlterTable: add kingdom_id column to regions
ALTER TABLE "regions" ADD COLUMN "kingdom_id" TEXT;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "kingdoms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "regions_kingdom_id_idx" ON "regions"("kingdom_id");
