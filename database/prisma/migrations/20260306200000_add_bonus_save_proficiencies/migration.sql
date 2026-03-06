-- Add bonus_save_proficiencies column to characters table
-- Stores additional saving throw proficiencies unlocked at milestone levels (18, 30, 45)
-- Default [] means existing characters only have their class-based save proficiencies
ALTER TABLE "characters" ADD COLUMN "bonus_save_proficiencies" JSONB NOT NULL DEFAULT '[]';
