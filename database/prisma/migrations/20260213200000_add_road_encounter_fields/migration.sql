-- AlterTable: Add road encounter fields to combat encounter logs
ALTER TABLE "combat_encounter_logs" ADD COLUMN     "destination_town_id" TEXT,
ADD COLUMN     "origin_town_id" TEXT,
ADD COLUMN     "trigger_source" TEXT NOT NULL DEFAULT 'town_pve';

-- CreateIndex
CREATE INDEX "combat_encounter_logs_trigger_source_idx" ON "combat_encounter_logs"("trigger_source");

-- AddForeignKey
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_origin_town_id_fkey" FOREIGN KEY ("origin_town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_destination_town_id_fkey" FOREIGN KEY ("destination_town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
