-- AlterTable: Add monster ability, damage type, and CR fields to Monster model
ALTER TABLE "monsters" ADD COLUMN "abilities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "monsters" ADD COLUMN "damage_type" TEXT NOT NULL DEFAULT 'BLUDGEONING';
ALTER TABLE "monsters" ADD COLUMN "resistances" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "monsters" ADD COLUMN "immunities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "monsters" ADD COLUMN "vulnerabilities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "monsters" ADD COLUMN "condition_immunities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "monsters" ADD COLUMN "crit_immunity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "monsters" ADD COLUMN "crit_resistance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "monsters" ADD COLUMN "expanded_crit_range" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "monsters" ADD COLUMN "formula_cr" DOUBLE PRECISION;
ALTER TABLE "monsters" ADD COLUMN "sim_cr" DOUBLE PRECISION;
ALTER TABLE "monsters" ADD COLUMN "encounter_type" TEXT NOT NULL DEFAULT 'solo';
