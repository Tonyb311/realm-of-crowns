-- Add feat system fields to characters table
-- feats: JSON array of feat IDs chosen at levels 38 and 48
-- pending_feat_choice: true when a feat choice is available
ALTER TABLE "characters" ADD COLUMN "feats" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "characters" ADD COLUMN "pending_feat_choice" BOOLEAN NOT NULL DEFAULT false;
