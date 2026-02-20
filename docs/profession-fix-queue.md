# Profession Fix Queue (Team Audit v2)

Generated: 2026-02-20
Based on: [Profession Audit Report](./profession-audit-report.md)

## Overview

| Priority | Professions | Issue | Effort |
|----------|-------------|-------|--------|
| P1 | TANNER, LEATHERWORKER, WOODWORKER | Templates only in standalone scripts — fresh DB seed fails | Small-Medium |
| P2 | COOK, TAILOR | Duplicate recipeIds, orphaned template names | Small |
| P3 | BLACKSMITH | Specialization recipes only in standalone | Small |
| P3 | All 4 standalone scripts | Code hygiene — deprecate after fixes | Trivial |

**Total work: 6 fixes across 3-4 files. No schema changes, no migrations, no API changes.**

---

## Tier 1 — Fresh DB Blockers (P1)

### Fix 1: TANNER — Add 3 intermediate templates

**Depends on:** Nothing
**Unblocks:** LEATHERWORKER (uses as inputs), ARMORER (some recipes use Cured Leather)

**Problem:** `ITEM_TEMPLATES` in `database/seeds/recipes.ts` has "Soft Leather" but `TANNER_RECIPES` in `shared/src/data/recipes/tanner.ts` outputs "Cured Leather". The actual templates exist only in `database/seeds/run-tanner.ts` (standalone, lines 112/129/146).

**Fix:** Add to `ITEM_TEMPLATES` array in `database/seeds/recipes.ts`:
```
Cured Leather  (MATERIAL, rarity: COMMON, professionRequired: TANNER, levelRequired: 3)
Wolf Leather   (MATERIAL, rarity: FINE, professionRequired: TANNER, levelRequired: 7)
Bear Leather   (MATERIAL, rarity: SUPERIOR, professionRequired: TANNER, levelRequired: 7)
```

---

### Fix 2: WOODWORKER — Add 4 templates + wire 14 finished goods

**Depends on:** Nothing
**Unblocks:** FLETCHER (needs Bow Stave + Wooden Dowels), LEATHERWORKER (needs Wooden Frame + Wooden Handle)

**Problem:** 4 intermediate output templates and 14 finished goods recipes exist only in `database/seeds/run-recipes.ts` (standalone, lines 1142-1218). `WOODWORKER_FINISHED_GOODS` is exported from `shared/src/data/recipes/woodworker.ts` but not consumed by any seed function.

**Fix:**
1. Add 4 templates to `ITEM_TEMPLATES` in `database/seeds/recipes.ts`:
```
Wooden Dowels  (MATERIAL, WOODWORKER L3)
Wooden Handle  (MATERIAL, WOODWORKER L5)
Bow Stave      (MATERIAL, WOODWORKER L8)
Wooden Frame   (MATERIAL, WOODWORKER L12)
```

2. Import and seed `WOODWORKER_FINISHED_GOODS` (14 recipes) — either:
   - **(Recommended)** Add to `seedRecipes()` in `recipes.ts` alongside ALL_PROCESSING_RECIPES
   - Or create `seedWoodworkerGoods()` and add to `index.ts`

---

### Fix 3: LEATHERWORKER — Verify (no code change)

**Depends on:** Fix 1 (TANNER) + Fix 2 (WOODWORKER)
**Fix:** None — once TANNER + WOODWORKER templates exist, all 13 LEATHERWORKER recipes resolve. Verify with `npm run seed` on test DB.

---

## Tier 2 — Data Integrity Fixes (P2)

### Fix 4: COOK — Deduplicate 6+2 recipe IDs

**Depends on:** Nothing

**Problem:** 6 recipeIds appear in BOTH `cook.ts` (RecipeDefinition) and `consumables.ts` (ConsumableRecipe) with different inputs. Plus 2 of those (`cook-grilled-fish`, `cook-fish-stew`) appear **twice within** `consumables.ts` itself. Total: 8 duplicate entries across 2 files.

| recipeId | cook.ts | consumables.ts 1st | consumables.ts 2nd |
|----------|---------|--------------------|--------------------|
| cook-grilled-fish | L59 (Wood Logs) | L299 (Salt) | L582 (Wild Herbs) |
| cook-fish-stew | L120 (Wood Logs) | L442 (Spices) | L598 (Wild Herbs) |
| cook-berry-jam | L48 | L315 | — |
| cook-herbal-tea | L70 | L331 | — |
| cook-apple-pie | L105 | L371 | — |
| cook-berry-tart | L150 | L394 | — |

**Fix:**
1. Remove the 6 duplicate recipeIds from `COOK_RECIPES` in `cook.ts` (the ConsumableRecipe versions have `consumableStats` which is correct for food items)
2. Deduplicate the 2 intra-file duplicates in `consumables.ts` — keep the version with correct inputs per YAML spec, remove the other
3. Verify remaining COOK_RECIPES (9 unique non-duplicated) are still seeded correctly

---

### Fix 5: TAILOR — Remove orphaned legacy templates

**Depends on:** Nothing

**Problem:** `ITEM_TEMPLATES` contains both legacy and current names:
- "Woven Wool" (legacy, ~line 211) — no recipe outputs this name
- "Silk Cloth" (legacy, ~line 221) — no recipe outputs this name
- "Woven Cloth" (line 235) — TAILOR_RECIPES outputs this (canonical)
- "Silk Fabric" (line 255) — TAILOR_RECIPES outputs this (canonical)

**Fix:** Remove "Woven Wool" and "Silk Cloth" entries from `ITEM_TEMPLATES` in `recipes.ts`. Canonical names are "Woven Cloth" and "Silk Fabric".

---

## Tier 3 — Pipeline Completeness (P3)

### Fix 6: BLACKSMITH — Fold specialization recipes

**Depends on:** Nothing

**Problem:** 28 specialization recipes (Toolsmith/Weaponsmith/Armorer branches) in `shared/src/data/recipes/blacksmith.ts` are only seeded by standalone `run-recipes.ts`. Core weapons (33 recipes via `weapons.ts`) are in the main pipeline.

**Fix:** Import and seed the 28 `blacksmith.ts` recipes in a seed function (extend `seedWeaponRecipes()` or create `seedBlacksmithSpecializations()`).

---

### Fix 7: Deprecate standalone scripts

**Depends on:** Fixes 1-6

**Problem:** 4 standalone scripts (`run-tanner.ts`, `run-tailor.ts`, `run-recipes.ts`, `seed-supply-chain.ts`) are not in the main pipeline and create confusion about what's seeded vs not.

**Fix:** After all templates and recipes are in the main pipeline:
1. Add deprecation comments to each standalone script
2. Optionally delete them (they're in git history if ever needed)
3. Verify `npm run seed` on clean DB seeds everything correctly

---

## Implementation Sequence

```
Fix 1 (TANNER templates)      ─┐
Fix 2 (WOODWORKER templates)   ├── Can run in parallel (no dependencies)
Fix 4 (COOK dedup)             │
Fix 5 (TAILOR cleanup)        ─┘
         │
         v
Fix 3 (LEATHERWORKER verify)  ── After Fix 1 + Fix 2
         │
         v
Fix 6 (BLACKSMITH specs)      ── Independent, low priority
         │
         v
Fix 7 (Deprecate standalones) ── After all above
         │
         v
    npm run seed test          ── Full fresh-DB verification
```

## Fresh DB Verification Checklist

After all fixes, run on a clean database:
- [ ] `npm run seed` completes without errors
- [ ] All 29 professions queryable via API
- [ ] TANNER: 15 recipes (3 processing + 11 armor + 1 consumable)
- [ ] WOODWORKER: 32 recipes (11 processing + 14 goods + 7 housing)
- [ ] LEATHERWORKER: 13 recipes resolve all input templates
- [ ] FLETCHER: 14 recipes resolve Bow Stave + Wooden Dowels
- [ ] COOK: No duplicate recipeIds in Recipe table
- [ ] TAILOR: No orphaned "Woven Wool" or "Silk Cloth" templates
- [ ] BLACKSMITH: 61 total recipes (33 weapons + 28 specialization)
