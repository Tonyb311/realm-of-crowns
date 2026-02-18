-- Add TOOL to EquipSlot enum
ALTER TYPE "EquipSlot" ADD VALUE 'TOOL';

-- Migrate existing tool equipment from MAIN_HAND to TOOL slot
-- (Must be in a separate transaction from ADD VALUE, so we run after)
