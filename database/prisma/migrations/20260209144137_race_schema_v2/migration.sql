-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "current_appearance_race" "Race",
ADD COLUMN     "race_tier" "RaceTier" NOT NULL DEFAULT 'CORE',
ADD COLUMN     "sub_race" JSONB,
ADD COLUMN     "unlocked_abilities" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "character_appearances" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "apparent_race" "Race" NOT NULL,
    "apparent_name" TEXT,
    "features" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_appearances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_appearances_character_id_idx" ON "character_appearances"("character_id");

-- AddForeignKey
ALTER TABLE "character_appearances" ADD CONSTRAINT "character_appearances_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
