-- Rollback: 20260210100000_add_inventory_unique_constraint

DROP INDEX IF EXISTS "inventories_character_id_item_id_key";
