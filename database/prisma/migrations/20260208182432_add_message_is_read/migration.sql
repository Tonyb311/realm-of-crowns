-- CreateEnum
CREATE TYPE "ElectionPhase" AS ENUM ('NOMINATIONS', 'CAMPAIGNING', 'VOTING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ImpeachmentStatus" AS ENUM ('ACTIVE', 'PASSED', 'FAILED');

-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "kingdom_id" TEXT,
ADD COLUMN     "phase" "ElectionPhase" NOT NULL DEFAULT 'NOMINATIONS',
ADD COLUMN     "term_number" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "laws" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "law_type" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'proposed',
ADD COLUMN     "votes_against" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "votes_for" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "election_candidates" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT '',
    "nominated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impeachments" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "town_id" TEXT,
    "kingdom_id" TEXT,
    "votes_for" INTEGER NOT NULL DEFAULT 0,
    "votes_against" INTEGER NOT NULL DEFAULT 0,
    "status" "ImpeachmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impeachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impeachment_votes" (
    "id" TEXT NOT NULL,
    "impeachment_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "support" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impeachment_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "town_treasuries" (
    "id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "last_collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "town_treasuries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "council_members" (
    "id" TEXT NOT NULL,
    "kingdom_id" TEXT,
    "town_id" TEXT,
    "character_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "appointed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "council_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "town_policies" (
    "id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "trade_policy" JSONB NOT NULL DEFAULT '{}',
    "building_permits" BOOLEAN NOT NULL DEFAULT true,
    "sheriff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "town_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "election_candidates_election_id_idx" ON "election_candidates"("election_id");

-- CreateIndex
CREATE INDEX "election_candidates_character_id_idx" ON "election_candidates"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "election_candidates_election_id_character_id_key" ON "election_candidates"("election_id", "character_id");

-- CreateIndex
CREATE INDEX "impeachments_target_id_idx" ON "impeachments"("target_id");

-- CreateIndex
CREATE INDEX "impeachments_town_id_idx" ON "impeachments"("town_id");

-- CreateIndex
CREATE INDEX "impeachments_kingdom_id_idx" ON "impeachments"("kingdom_id");

-- CreateIndex
CREATE INDEX "impeachments_status_idx" ON "impeachments"("status");

-- CreateIndex
CREATE INDEX "impeachment_votes_impeachment_id_idx" ON "impeachment_votes"("impeachment_id");

-- CreateIndex
CREATE UNIQUE INDEX "impeachment_votes_impeachment_id_voter_id_key" ON "impeachment_votes"("impeachment_id", "voter_id");

-- CreateIndex
CREATE UNIQUE INDEX "town_treasuries_town_id_key" ON "town_treasuries"("town_id");

-- CreateIndex
CREATE INDEX "council_members_kingdom_id_idx" ON "council_members"("kingdom_id");

-- CreateIndex
CREATE INDEX "council_members_town_id_idx" ON "council_members"("town_id");

-- CreateIndex
CREATE INDEX "council_members_character_id_idx" ON "council_members"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "town_policies_town_id_key" ON "town_policies"("town_id");

-- CreateIndex
CREATE INDEX "elections_kingdom_id_idx" ON "elections"("kingdom_id");

-- CreateIndex
CREATE INDEX "laws_status_idx" ON "laws"("status");

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "kingdoms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impeachments" ADD CONSTRAINT "impeachments_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impeachments" ADD CONSTRAINT "impeachments_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impeachments" ADD CONSTRAINT "impeachments_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "kingdoms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impeachment_votes" ADD CONSTRAINT "impeachment_votes_impeachment_id_fkey" FOREIGN KEY ("impeachment_id") REFERENCES "impeachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impeachment_votes" ADD CONSTRAINT "impeachment_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "town_treasuries" ADD CONSTRAINT "town_treasuries_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "kingdoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_appointed_by_id_fkey" FOREIGN KEY ("appointed_by_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "town_policies" ADD CONSTRAINT "town_policies_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "town_policies" ADD CONSTRAINT "town_policies_sheriff_id_fkey" FOREIGN KEY ("sheriff_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
