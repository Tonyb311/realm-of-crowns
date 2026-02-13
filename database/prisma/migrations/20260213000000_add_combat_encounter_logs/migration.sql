-- CreateTable
CREATE TABLE "combat_encounter_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "session_id" TEXT,
    "character_id" TEXT NOT NULL,
    "character_name" TEXT NOT NULL DEFAULT '',
    "opponent_id" TEXT,
    "opponent_name" TEXT NOT NULL DEFAULT '',
    "town_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL DEFAULT '',
    "total_rounds" INTEGER NOT NULL DEFAULT 0,
    "character_start_hp" INTEGER NOT NULL DEFAULT 0,
    "character_end_hp" INTEGER NOT NULL DEFAULT 0,
    "opponent_start_hp" INTEGER NOT NULL DEFAULT 0,
    "opponent_end_hp" INTEGER NOT NULL DEFAULT 0,
    "character_weapon" TEXT NOT NULL DEFAULT '',
    "opponent_weapon" TEXT NOT NULL DEFAULT '',
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "gold_awarded" INTEGER NOT NULL DEFAULT 0,
    "loot_dropped" TEXT NOT NULL DEFAULT '',
    "rounds" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL DEFAULT '',
    "simulation_tick" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combat_encounter_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "combat_encounter_logs_character_id_started_at_idx" ON "combat_encounter_logs"("character_id", "started_at");

-- CreateIndex
CREATE INDEX "combat_encounter_logs_simulation_tick_idx" ON "combat_encounter_logs"("simulation_tick");

-- CreateIndex
CREATE INDEX "combat_encounter_logs_type_idx" ON "combat_encounter_logs"("type");

-- AddForeignKey
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
