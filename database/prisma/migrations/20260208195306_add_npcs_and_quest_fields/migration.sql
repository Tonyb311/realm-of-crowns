-- CreateEnum
CREATE TYPE "NpcRole" AS ENUM ('QUEST_GIVER', 'MERCHANT', 'TRAINER', 'GUARD');

-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "cooldown_hours" INTEGER,
ADD COLUMN     "is_repeatable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prerequisite_quest_id" TEXT;

-- CreateTable
CREATE TABLE "npcs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "role" "NpcRole" NOT NULL DEFAULT 'QUEST_GIVER',
    "dialog" JSONB NOT NULL DEFAULT '{}',
    "quest_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "npcs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "npcs_town_id_idx" ON "npcs"("town_id");

-- CreateIndex
CREATE INDEX "npcs_role_idx" ON "npcs"("role");

-- CreateIndex
CREATE INDEX "quests_prerequisite_quest_id_idx" ON "quests"("prerequisite_quest_id");

-- AddForeignKey
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_prerequisite_quest_id_fkey" FOREIGN KEY ("prerequisite_quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
