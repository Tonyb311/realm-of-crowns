-- Remove MP/mana fields from characters
ALTER TABLE "characters" DROP COLUMN IF EXISTS "mana";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "max_mana";

-- Remove mana_cost from abilities
ALTER TABLE "abilities" DROP COLUMN IF EXISTS "mana_cost";
