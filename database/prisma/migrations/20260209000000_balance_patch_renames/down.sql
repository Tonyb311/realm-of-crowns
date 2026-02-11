-- Rollback: 20260209000000_balance_patch_renames
-- WARNING: Reversing race renames. Only safe if no new data depends on the new names.

-- Reverse column rename
ALTER TABLE "characters" RENAME COLUMN "dragon_bloodline" TO "draconic_ancestry";

-- Reverse table rename
ALTER TABLE "forgeborn_maintenance" RENAME TO "warforged_maintenance";

-- Reverse enum rename
ALTER TYPE "DragonBloodline" RENAME TO "DraconicAncestry";

-- Reverse Race enum value renames
ALTER TYPE "Race" RENAME VALUE 'NETHKIN' TO 'TIEFLING';
ALTER TYPE "Race" RENAME VALUE 'DRAKONID' TO 'DRAGONBORN';
ALTER TYPE "Race" RENAME VALUE 'FORGEBORN' TO 'WARFORGED';
ALTER TYPE "Race" RENAME VALUE 'ELEMENTARI' TO 'GENASI';
ALTER TYPE "Race" RENAME VALUE 'NIGHTBORNE' TO 'DROW';
ALTER TYPE "Race" RENAME VALUE 'HARTHFOLK' TO 'HALFLING';
ALTER TYPE "Race" RENAME VALUE 'MOSSKIN' TO 'FIRBOLG';
