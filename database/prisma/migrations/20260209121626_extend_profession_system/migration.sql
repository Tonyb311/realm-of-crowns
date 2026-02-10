-- AlterTable
ALTER TABLE "player_professions" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "specialization" TEXT;

-- CreateIndex
CREATE INDEX "player_professions_character_id_is_active_idx" ON "player_professions"("character_id", "is_active");
