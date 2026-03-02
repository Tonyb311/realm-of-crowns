-- CreateTable
CREATE TABLE "simulation_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "tick_count" INTEGER NOT NULL,
    "ticks_completed" INTEGER NOT NULL DEFAULT 0,
    "bot_count" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "encounter_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "simulation_runs_started_at_idx" ON "simulation_runs"("started_at");

-- CreateIndex
CREATE INDEX "simulation_runs_status_idx" ON "simulation_runs"("status");

-- AlterTable
ALTER TABLE "combat_encounter_logs" ADD COLUMN "simulation_run_id" TEXT;

-- CreateIndex
CREATE INDEX "combat_encounter_logs_simulation_run_id_idx" ON "combat_encounter_logs"("simulation_run_id");

-- AddForeignKey
ALTER TABLE "combat_encounter_logs" ADD CONSTRAINT "combat_encounter_logs_simulation_run_id_fkey" FOREIGN KEY ("simulation_run_id") REFERENCES "simulation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
