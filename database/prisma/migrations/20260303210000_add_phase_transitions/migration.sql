-- Add phase_transitions column to monsters table
ALTER TABLE "monsters" ADD COLUMN "phase_transitions" JSONB NOT NULL DEFAULT '[]';
