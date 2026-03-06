-- Rebalance stat progression for D&D-style bounded accuracy
-- - Stat hard cap: 30 -> 20
-- - Stat points per level: 2 -> 1
-- - Cost curve retuned: 1/2/3/4 at brackets 11-14/15-17/18-19/20
--
-- This migration:
-- 1. Clamps any stat > 20 down to 20
-- 2. Recalculates unspentStatPoints based on new budget (level * 1) minus
--    total cost of purchased points under the new cost curve

-- Use a DO block for procedural logic
DO $$
DECLARE
  rec RECORD;
  stat_key TEXT;
  stat_keys TEXT[] := ARRAY['str','dex','con','int','wis','cha'];
  racial_mods JSONB;
  current_val INT;
  racial_base INT;
  racial_mod INT;
  purchased INT;
  step_cost INT;
  total_spent INT;
  new_stats JSONB;
  new_unspent INT;
  target_val INT;
  i INT;
BEGIN
  FOR rec IN
    SELECT id, race, level, stats, unspent_stat_points
    FROM characters
  LOOP
    -- Determine racial stat modifiers
    racial_mods := CASE rec.race
      WHEN 'human'     THEN '{"str":1,"dex":1,"con":1,"int":1,"wis":1,"cha":1}'::jsonb
      WHEN 'elf'       THEN '{"str":0,"dex":3,"con":-1,"int":2,"wis":2,"cha":1}'::jsonb
      WHEN 'dwarf'     THEN '{"str":2,"dex":-1,"con":3,"int":1,"wis":1,"cha":0}'::jsonb
      WHEN 'orc'       THEN '{"str":4,"dex":0,"con":3,"int":-1,"wis":0,"cha":-1}'::jsonb
      WHEN 'harthfolk' THEN '{"str":-1,"dex":3,"con":1,"int":1,"wis":1,"cha":2}'::jsonb
      WHEN 'drakonid'  THEN '{"str":3,"dex":-1,"con":2,"int":1,"wis":2,"cha":0}'::jsonb
      WHEN 'nethkin'   THEN '{"str":0,"dex":1,"con":0,"int":3,"wis":1,"cha":2}'::jsonb
      ELSE '{"str":0,"dex":0,"con":0,"int":0,"wis":0,"cha":0}'::jsonb
    END;

    new_stats := rec.stats;
    total_spent := 0;

    FOREACH stat_key IN ARRAY stat_keys LOOP
      -- Get current stat value (default 10 if missing)
      current_val := COALESCE((rec.stats ->> stat_key)::int, 10);

      -- Get racial modifier for this stat
      racial_mod := COALESCE((racial_mods ->> stat_key)::int, 0);
      racial_base := 10 + racial_mod;

      -- Clamp stat to 20 if it exceeds the new cap
      IF current_val > 20 THEN
        current_val := 20;
      END IF;

      -- Update the stat in new_stats
      new_stats := jsonb_set(new_stats, ARRAY[stat_key], to_jsonb(current_val));

      -- Calculate cost of purchased points under new cost curve
      -- Iterate from racial_base to current_val, summing costs
      IF current_val > racial_base THEN
        FOR i IN racial_base..(current_val - 1) LOOP
          target_val := i + 1;
          -- New cost curve: target 11-14 = 1, 15-17 = 2, 18-19 = 3, 20 = 4
          IF target_val <= 14 THEN
            step_cost := 1;
          ELSIF target_val <= 17 THEN
            step_cost := 2;
          ELSIF target_val <= 19 THEN
            step_cost := 3;
          ELSIF target_val <= 20 THEN
            step_cost := 4;
          ELSE
            step_cost := 0; -- shouldn't happen after clamping
          END IF;
          total_spent := total_spent + step_cost;
        END LOOP;
      END IF;
    END LOOP;

    -- New budget: level * 1 (was level * 2)
    new_unspent := GREATEST(0, rec.level - total_spent);

    -- Update the character
    UPDATE characters
    SET stats = new_stats,
        unspent_stat_points = new_unspent
    WHERE id = rec.id;
  END LOOP;
END $$;
