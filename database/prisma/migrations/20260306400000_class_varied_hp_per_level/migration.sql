-- Recalculate all character HP using class-varied HP per level.
-- Old formula: 10 + conMod + classBonus + (level-1) * 10
-- New formula: 10 + conMod + classBonus + (level-1) * classHpPerLevel
-- classHpPerLevel: warrior=4, ranger=4, cleric=3, rogue=3, bard=3, mage=2, psion=2
-- classBonus (creation): warrior=10, ranger=8, cleric=8, rogue=6, bard=6, mage=4, psion=4
-- Preserves health ratio (current HP / max HP) so injured characters stay injured.

UPDATE characters SET
  health = GREATEST(1, FLOOR(
    (health::float / GREATEST(max_health, 1)) *
    GREATEST(1,
      10
      + FLOOR(((stats->>'con')::int - 10) / 2.0)
      + CASE class
          WHEN 'warrior' THEN 10
          WHEN 'ranger'  THEN 8
          WHEN 'cleric'  THEN 8
          WHEN 'rogue'   THEN 6
          WHEN 'bard'    THEN 6
          WHEN 'mage'    THEN 4
          WHEN 'psion'   THEN 4
          ELSE 6
        END
      + (level - 1) * CASE class
          WHEN 'warrior' THEN 4
          WHEN 'ranger'  THEN 4
          WHEN 'cleric'  THEN 3
          WHEN 'rogue'   THEN 3
          WHEN 'bard'    THEN 3
          WHEN 'mage'    THEN 2
          WHEN 'psion'   THEN 2
          ELSE 3
        END
      + CASE
          WHEN feats::text LIKE '%feat-tough%' THEN level * 2
          ELSE 0
        END
    )
  )),
  max_health = GREATEST(1,
    10
    + FLOOR(((stats->>'con')::int - 10) / 2.0)
    + CASE class
        WHEN 'warrior' THEN 10
        WHEN 'ranger'  THEN 8
        WHEN 'cleric'  THEN 8
        WHEN 'rogue'   THEN 6
        WHEN 'bard'    THEN 6
        WHEN 'mage'    THEN 4
        WHEN 'psion'   THEN 4
        ELSE 6
      END
    + (level - 1) * CASE class
        WHEN 'warrior' THEN 4
        WHEN 'ranger'  THEN 4
        WHEN 'cleric'  THEN 3
        WHEN 'rogue'   THEN 3
        WHEN 'bard'    THEN 3
        WHEN 'mage'    THEN 2
        WHEN 'psion'   THEN 2
        ELSE 3
      END
    + CASE
        WHEN feats::text LIKE '%feat-tough%' THEN level * 2
        ELSE 0
      END
  )
WHERE class IS NOT NULL AND stats IS NOT NULL;
