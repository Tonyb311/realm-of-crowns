-- Balance Patch: Race renames, DraconicAncestry -> DragonBloodline, WarforgedMaintenance -> ForgebornMaintenance

-- Rename Race enum values
ALTER TYPE "Race" RENAME VALUE 'TIEFLING' TO 'NETHKIN';
ALTER TYPE "Race" RENAME VALUE 'DRAGONBORN' TO 'DRAKONID';
ALTER TYPE "Race" RENAME VALUE 'WARFORGED' TO 'FORGEBORN';
ALTER TYPE "Race" RENAME VALUE 'GENASI' TO 'ELEMENTARI';
ALTER TYPE "Race" RENAME VALUE 'DROW' TO 'NIGHTBORNE';
ALTER TYPE "Race" RENAME VALUE 'HALFLING' TO 'HARTHFOLK';
ALTER TYPE "Race" RENAME VALUE 'FIRBOLG' TO 'MOSSKIN';

-- Rename DraconicAncestry enum to DragonBloodline
ALTER TYPE "DraconicAncestry" RENAME TO "DragonBloodline";

-- Rename WarforgedMaintenance table to ForgebornMaintenance
ALTER TABLE "warforged_maintenance" RENAME TO "forgeborn_maintenance";

-- Rename draconic_ancestry column to dragon_bloodline on characters
ALTER TABLE "characters" RENAME COLUMN "draconic_ancestry" TO "dragon_bloodline";
