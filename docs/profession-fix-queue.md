# Profession Fix Queue

Generated: 2026-02-20
Based on: [Profession Audit Report](./profession-audit-report.md)

## Overview

3 professions have seed pipeline gaps (P1), 2 have data quirks (P2), and 24 are fully functional (P3). The fixes below are ordered by dependency — upstream fixes first so downstream professions work correctly.

**Total work: 4 fixes across 2-3 files, no schema changes, no new migrations.**

---

## Tier 1 — Seed Pipeline Fixes (P1: Fresh DB would break)

### Fix 1: TANNER — Add intermediate templates to main pipeline

**Priority:** P1 | **Effort:** Small | **Files:** 1
**Depends on:** Nothing

**Problem:** `run-tanner.ts` (standalone script) created 3 intermediate output templates that aren't in `ITEM_TEMPLATES` in `database/seeds/recipes.ts`. A fresh `npm run seed` would fail at `seedRecipes()` when TANNER_RECIPES tries to create recipes outputting "Cured Leather" — template doesn't exist.

**Fix:** Add to `ITEM_TEMPLATES` array in `database/seeds/recipes.ts`:
- Cured Leather (MATERIAL, ~8g base value)
- Wolf Leather (MATERIAL, ~12g base value)
- Bear Leather (MATERIAL, ~15g base value)

**Unblocks:** LEATHERWORKER (uses these as recipe inputs)

---

### Fix 2: WOODWORKER — Add intermediate templates + finished goods to main pipeline

**Priority:** P1 | **Effort:** Medium | **Files:** 1-2
**Depends on:** Nothing

**Problem:** `run-recipes.ts` (standalone script) created 4 intermediate templates and 14 finished goods recipes. None are in the main seed pipeline. Fresh seed would fail when WOODWORKER_RECIPES references "Wooden Dowels" output.

**Fix:**
1. Add to `ITEM_TEMPLATES` in `database/seeds/recipes.ts`:
   - Wooden Dowels (MATERIAL)
   - Wooden Handle (MATERIAL)
   - Bow Stave (MATERIAL)
   - Wooden Frame (MATERIAL)

2. Add WOODWORKER_FINISHED_GOODS to the seed pipeline. Either:
   - **(Recommended)** Import and seed in `seedRecipes()` alongside ALL_PROCESSING_RECIPES
   - Or create a new `seedWoodworkerGoods()` function and add it to `index.ts`

**Unblocks:** FLETCHER (needs Bow Stave, Wooden Dowels as inputs)

---

### Fix 3: LEATHERWORKER — Verify inputs resolve after Fix 1

**Priority:** P1 | **Effort:** None (verification only)
**Depends on:** Fix 1 (TANNER templates)

**Problem:** LEATHERWORKER armor recipes use Cured Leather, Wolf Leather, Bear Leather as inputs. These templates are created by the TANNER fix.

**Fix:** No code change needed. Once Fix 1 lands, LEATHERWORKER recipes will resolve correctly on fresh seed. Verify by running `npm run seed` on a test DB after Fix 1.

---

## Tier 2 — Data Quality Fixes (P2: Functional but quirky)

### Fix 4: COOK — Deduplicate recipe IDs

**Priority:** P2 | **Effort:** Medium | **Files:** 1-2
**Depends on:** Nothing

**Problem:** COOK_RECIPES (RecipeDefinition format, 15 recipes in `cook.ts`) and COOK_CONSUMABLES (ConsumableRecipe format, 17 recipes in `consumables.ts`) share 4 overlapping recipeIds with different input lists:
- `cook-grilled-fish`
- `cook-berry-jam`
- `cook-fish-stew`
- `cook-herbal-tea`

Since `seedConsumableRecipes()` runs after `seedRecipes()`, the ConsumableRecipe version wins via upsert. The COOK_RECIPES versions are silently overwritten.

**Fix options:**
- **(Recommended)** Remove the 4 duplicates from COOK_RECIPES (the ConsumableRecipe versions in COOK_CONSUMABLES have consumableStats which is the correct format for food items)
- Or rename IDs in one set (e.g., `cook-basic-grilled-fish` vs `cook-grilled-fish`)

---

### Fix 5: TAILOR — Clean up template name divergence

**Priority:** P2 | **Effort:** Small | **Files:** 1-2
**Depends on:** Nothing

**Problem:** Legacy template names and recipe output names diverge:
- `Woven Wool` (legacy seed) vs `Woven Cloth` (recipe output, P0 fix)
- `Silk Cloth` (legacy seed) vs `Silk Fabric` (recipe output, P0 fix)

Both template sets exist in the DB. This wastes DB rows and could confuse admin tools or item searches.

**Fix:**
1. Pick canonical names (recommend recipe output names: Woven Cloth, Silk Fabric)
2. Update legacy template names in `ITEM_TEMPLATES` OR remove legacy duplicates
3. Verify no recipe references the old names

---

## Tier 3 — No Fixes Needed (P3: Fully Functional)

The following 24 professions are fully functional in both production AND fresh seed:

### Gathering (7)
| Profession | Status | Notes |
|-----------|--------|-------|
| FARMER | P3 | 7 private field types, feeds COOK/BREWER/TAILOR |
| RANCHER | P3 | 5 building types, feeds COOK/TAILOR |
| FISHERMAN | P3 | 3 tiers of fish |
| LUMBERJACK | P3 | 2 wood types |
| MINER | P3 | 8+ ore/stone types |
| HERBALIST | P3 | 3 herb types + Glowcap Mushrooms |
| HUNTER | P3 | Meat + pelts/hides |

### Crafting (10 of 15)
| Profession | Status | Notes |
|-----------|--------|-------|
| SMELTER | P3 | 11 processing + 2 Warforged consumables |
| BLACKSMITH | P3 | 34 weapons + 28 specialization recipes |
| ARMORER | P3 | 25 plate armor (5 tiers x 5 pieces) |
| TAILOR | P3 | 4 processing + 24 cloth armor |
| ALCHEMIST | P3 | 11 potions/elixirs |
| ENCHANTER | P3 | 9 enchantment scrolls |
| BREWER | P3 | 9 beverages (3 tiers x 3 types) |
| JEWELER | P3 | 12 accessories |
| FLETCHER | P3 | 13 bows/arrows/quivers |
| MASON | P3 | 8 processing + 4 housing |
| SCRIBE | P3 | 7 scrolls/maps |

### Service (7)
| Profession | Status | Notes |
|-----------|--------|-------|
| MERCHANT | P3 | Service actions only |
| INNKEEPER | P3 | Service actions only |
| HEALER | P3 | Service actions only |
| STABLE_MASTER | P3 | 6 mount gear recipes |
| BANKER | P3 | Loan system |
| COURIER | P3 | Service actions only |
| MERCENARY_CAPTAIN | P3 | Service actions only |

---

## Implementation Sequence

```
Fix 1 (TANNER templates)     ─┐
Fix 2 (WOODWORKER templates)  ├── Can be done in parallel
Fix 4 (COOK dedup)            │
Fix 5 (TAILOR cleanup)       ─┘
         │
         v
Fix 3 (LEATHERWORKER verify) ── After Fix 1 lands
         │
         v
   npm run seed test          ── Verify fresh DB works
```

**Estimated scope:** ~50-80 lines of seed data additions, ~10-20 lines of recipe dedup. No schema changes, no new migrations, no API changes, no frontend changes.
