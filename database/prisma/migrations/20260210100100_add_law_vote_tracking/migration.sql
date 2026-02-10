-- CreateTable
CREATE TABLE "law_votes" (
    "id" TEXT NOT NULL,
    "law_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "law_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "law_votes_law_id_character_id_key" ON "law_votes"("law_id", "character_id");

-- AddForeignKey
ALTER TABLE "law_votes" ADD CONSTRAINT "law_votes_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "laws"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "law_votes" ADD CONSTRAINT "law_votes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
