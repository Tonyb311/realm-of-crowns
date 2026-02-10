# Rebalance Integration Checklist

All changes for the daily-action economy rebalance (v2.0). Players get 1 major action per day; progression is measured in days/weeks.

## Core XP System (Task #1 -- COMPLETE)

- [x] `shared/src/data/progression/xp-curve.ts` -- New XP curve, ACTION_XP constants, DEATH_PENALTY constants, LEVEL_UP_REWARDS
- [x] `shared/src/data/progression/index.ts` -- Re-exports all progression constants

## Quest Rebalance (Task #2 -- COMPLETE)

- [x] `shared/src/data/quests.ts` -- All 55 quest definitions rebalanced for daily pacing

## Achievement + Combat + Gathering Rebalance (Task #3 -- COMPLETE)

### A. Achievement Thresholds & XP Rewards

- [x] `shared/src/data/achievements.ts` -- All 27 achievements rebalanced:
  - PvE combat win thresholds: 1/10/50/200 -> 1/5/20/75
  - PvP combat win thresholds: unchanged (1/10/50 already reasonable)
  - Crafting thresholds: 10/50 -> 5/25
  - Exploration thresholds: 5/15 -> 3/8
  - Gathering thresholds: 25/100 -> 10/40
  - Economy thresholds: kept (marketplace doesn't cost an action)
  - XP rewards scaled from 50-2000 range down to 10-150 range
  - Added v2.0 rebalance comment header

### B. Combat Reward Updates

- [x] `server/src/routes/combat-pve.ts`
  - Import `ACTION_XP` from `@shared/data/progression`
  - PvE win XP: `monster.level * 25` -> `ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL * monster.level` (5 * level)
  - Added survive XP: `ACTION_XP.PVE_SURVIVE` (5 flat) on death/loss

- [x] `server/src/routes/combat-pvp.ts`
  - Import `ACTION_XP` from `@shared/data/progression`
  - PvP win XP: `XP_PER_OPPONENT_LEVEL = 50` -> `ACTION_XP.PVP_WIN_PER_OPPONENT_LEVEL` (8 * level)

- [x] `server/src/lib/combat-engine.ts` -- Already using `DEATH_PENALTY` from `@shared/data/progression` (no changes needed, was done in Task #1)
  - `DEATH_GOLD_LOSS_PERCENT = DEATH_PENALTY.GOLD_LOSS_PERCENT` (5%)
  - `DEATH_XP_LOSS_PER_LEVEL = DEATH_PENALTY.XP_LOSS_PER_LEVEL` (15)
  - `DEATH_DURABILITY_DAMAGE = DEATH_PENALTY.DURABILITY_DAMAGE` (5)

### C. Gathering XP Updates

- [x] `server/src/routes/work.ts`
  - Import `ACTION_XP` from `@shared/data/progression`
  - Gathering XP: `10 + (tier-1)*5` -> `ACTION_XP.WORK_GATHER_BASE + (tier-1) * ACTION_XP.WORK_GATHER_PER_TIER` (T1=15, T2=20, T3=25, T4=30)

### D. Crafting XP Updates

- [x] `server/src/routes/crafting.ts`
  - Import `ACTION_XP` from `@shared/data/progression`
  - Crafting XP: `recipe.xpReward` -> `Math.floor(recipe.xpReward * ACTION_XP.WORK_CRAFT_MULTIPLIER)` (80% of recipe value)

## Files NOT Changed (verified correct)

- `server/src/services/quest-triggers.ts` -- Quest trigger logic unchanged (triggers only, no XP values)
- `server/src/services/progression.ts` -- Level-up service reads from xp-curve.ts (already correct)
- `server/src/services/achievements.ts` -- Achievement checking service reads from achievements.ts (already correct)

## Summary of XP Value Changes

| Action | Old Value | New Value | Notes |
|--------|-----------|-----------|-------|
| Gather T1 | 5 (half of 10) | 15 | Direct from ACTION_XP |
| Gather T4 | 12.5 (half of 25) | 30 | Direct from ACTION_XP |
| Craft | recipe.xpReward (10-50) | 80% of recipe.xpReward (8-40) | Multiplier applied |
| PvE Win (L5 mob) | 125 | 25 | 5x multiplier down from 25x |
| PvE Win (L10 mob) | 250 | 50 | 5x multiplier down from 25x |
| PvE Survive | 0 | 5 | New consolation prize |
| PvP Win (L10 opp) | 500 | 80 | 8x multiplier down from 50x |
| Death gold loss | 10% | 5% | Via DEATH_PENALTY constant |
| Death XP loss/level | 50 | 15 | Via DEATH_PENALTY constant |
| Death durability | 10 | 5 | Via DEATH_PENALTY constant |
