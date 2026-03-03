-- AlterTable: Add monster ability, damage type, and CR fields to Monster model
ALTER TABLE "Monster" ADD COLUMN "abilities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Monster" ADD COLUMN "damage_type" TEXT NOT NULL DEFAULT 'BLUDGEONING';
ALTER TABLE "Monster" ADD COLUMN "resistances" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Monster" ADD COLUMN "immunities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Monster" ADD COLUMN "vulnerabilities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Monster" ADD COLUMN "condition_immunities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Monster" ADD COLUMN "crit_immunity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Monster" ADD COLUMN "crit_resistance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Monster" ADD COLUMN "expanded_crit_range" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Monster" ADD COLUMN "formula_cr" DOUBLE PRECISION;
ALTER TABLE "Monster" ADD COLUMN "sim_cr" DOUBLE PRECISION;
ALTER TABLE "Monster" ADD COLUMN "encounter_type" TEXT NOT NULL DEFAULT 'solo';
