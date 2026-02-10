-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "class" TEXT,
ADD COLUMN     "specialization" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "unspent_skill_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unspent_stat_points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "abilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "class" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "effects" JSONB NOT NULL DEFAULT '{}',
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "mana_cost" INTEGER NOT NULL DEFAULT 0,
    "prerequisite_ability_id" TEXT,
    "level_required" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_abilities" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "ability_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_abilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abilities_name_key" ON "abilities"("name");

-- CreateIndex
CREATE INDEX "abilities_class_idx" ON "abilities"("class");

-- CreateIndex
CREATE INDEX "abilities_class_specialization_idx" ON "abilities"("class", "specialization");

-- CreateIndex
CREATE INDEX "character_abilities_character_id_idx" ON "character_abilities"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_abilities_character_id_ability_id_key" ON "character_abilities"("character_id", "ability_id");

-- AddForeignKey
ALTER TABLE "abilities" ADD CONSTRAINT "abilities_prerequisite_ability_id_fkey" FOREIGN KEY ("prerequisite_ability_id") REFERENCES "abilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "abilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
