-- CreateTable: parties
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "leader_id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "max_size" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disbanded_at" TIMESTAMP(3),

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable: party_members
CREATE TABLE "party_members" (
    "id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "party_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: party_invitations
CREATE TABLE "party_invitations" (
    "id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_invitations_pkey" PRIMARY KEY ("id")
);

-- AlterTable: travel_groups - add party_id
ALTER TABLE "travel_groups" ADD COLUMN "party_id" TEXT;

-- AlterTable: combat_encounter_logs - add party_id
ALTER TABLE "combat_encounter_logs" ADD COLUMN "party_id" TEXT;

-- CreateIndex: parties
CREATE INDEX "parties_leader_id_idx" ON "parties"("leader_id");
CREATE INDEX "parties_town_id_idx" ON "parties"("town_id");
CREATE INDEX "parties_status_idx" ON "parties"("status");

-- CreateIndex: party_members
CREATE INDEX "party_members_party_id_idx" ON "party_members"("party_id");
CREATE INDEX "party_members_character_id_idx" ON "party_members"("character_id");
CREATE INDEX "party_members_character_id_left_at_idx" ON "party_members"("character_id", "left_at");

-- CreateIndex: party_invitations
CREATE INDEX "party_invitations_party_id_idx" ON "party_invitations"("party_id");
CREATE INDEX "party_invitations_character_id_status_idx" ON "party_invitations"("character_id", "status");

-- CreateIndex: travel_groups.party_id
CREATE INDEX "travel_groups_party_id_idx" ON "travel_groups"("party_id");

-- CreateIndex: combat_encounter_logs.party_id
CREATE INDEX "combat_encounter_logs_party_id_idx" ON "combat_encounter_logs"("party_id");

-- AddForeignKey: parties
ALTER TABLE "parties" ADD CONSTRAINT "parties_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parties" ADD CONSTRAINT "parties_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: party_members
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: party_invitations
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: travel_groups.party_id
ALTER TABLE "travel_groups" ADD CONSTRAINT "travel_groups_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: combat_encounter_logs.party_id
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
