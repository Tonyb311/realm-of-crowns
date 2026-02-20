# Profession Audit Report (Team Audit v2)

Generated: 2026-02-20
Audited by: yaml-analyst, seed-auditor, recipe-auditor, team-lead

## Data Sources Cross-Referenced

| Source | Description | Records |
|--------|-------------|---------|
| `docs/profession-economy-master.yaml` | YAML source of truth (2999 lines) | 29 professions, ~201 recipes, 150+ items |
| `shared/src/data/recipes/*.ts` | 16 recipe definition files | 287 unique recipeIds |
| `database/seeds/*.ts` | 12 seed files (8 main pipeline + 4 standalone) | ~344 templates, ~250+ recipes (main) |

## Summary

| Metric | Count |
|--------|-------|
| Total professions | 29 (7 gathering, 15 crafting, 7 service) |
| Total YAML recipes | ~201 (across 15 crafting professions) |
| Total code recipes | 287 unique recipeIds |
| Total seeded in production | All 287 (via main pipeline + standalone scripts) |
| In main seed pipeline (`index.ts`) | 26/29 professions fully covered |
| Depend on standalone scripts | 3 (TANNER, LEATHERWORKER, WOODWORKER) |
| Standalone scripts not in pipeline | 4 (`run-tanner.ts`, `run-tailor.ts`, `run-recipes.ts`, `seed-supply-chain.ts`) |
| Duplicate recipeIds (cross-file) | 6 COOK IDs duplicated between `cook.ts` and `consumables.ts` |
| Duplicate recipeIds (intra-file) | 2 COOK IDs duplicated WITHIN `consumables.ts` (`cook-grilled-fish`, `cook-fish-stew`) |
| Missing from main pipeline templates | 7 (3 TANNER + 4 WOODWORKER intermediates) |
| Missing from main pipeline recipes | 14 WOODWORKER finished goods |
| Fresh-DB `npm run seed` would fail | **YES** — at step 5 (seedRecipes) |
| Fully functional in production | 29/29 |

## Priority Tiers

### P0 — Completely Broken
**None.** All 29 professions are functional in production. Standalone seed scripts were executed against the production DB to fill gaps.

### P1 — Main Seed Pipeline Gap (fresh DB would break)

**TANNER** — 3 intermediate output templates (Cured Leather, Wolf Leather, Bear Leather) exist ONLY in `database/seeds/run-tanner.ts` (standalone). `ITEM_TEMPLATES` in `recipes.ts` has "Soft Leather" but TANNER_RECIPES outputs "Cured Leather". Fresh `npm run seed` → step 5 `seedRecipes()` → template not found → **FAIL**.

**WOODWORKER** — 4 intermediate templates (Wooden Dowels, Wooden Handle, Bow Stave, Wooden Frame) + 14 finished goods recipes exist ONLY in `database/seeds/run-recipes.ts` (standalone). `WOODWORKER_FINISHED_GOODS` is exported from `shared/src/data/recipes/woodworker.ts` but no seed function in `index.ts` imports it. Fresh seed → intermediate output templates missing → **FAIL**.

**LEATHERWORKER** — Depends on TANNER intermediate templates (Cured Leather, Wolf Leather, Bear Leather) + WOODWORKER intermediates (Wooden Frame, Wooden Handle) as recipe inputs. If TANNER + WOODWORKER fixes land, LEATHERWORKER works automatically.

### P2 — Functional but Data Integrity Issues

**COOK** — 6 duplicate recipeIds across `cook.ts` (RecipeDefinition) and `consumables.ts` (ConsumableRecipe):

| recipeId | cook.ts | consumables.ts (1st) | consumables.ts (2nd) |
|----------|---------|---------------------|---------------------|
| `cook-grilled-fish` | line 59 | line 299 | line 582 |
| `cook-fish-stew` | line 120 | line 442 | line 598 |
| `cook-berry-jam` | line 48 | line 315 | — |
| `cook-herbal-tea` | line 70 | line 331 | — |
| `cook-apple-pie` | line 105 | line 371 | — |
| `cook-berry-tart` | line 150 | line 394 | — |

`cook-grilled-fish` and `cook-fish-stew` each appear **3 times** total. Different input lists per definition — e.g., Grilled Fish uses Wood Logs in cook.ts vs Salt in consumables.ts:299 vs Wild Herbs in consumables.ts:582. Last writer wins via upsert.

**TAILOR** — Legacy template name divergence in `ITEM_TEMPLATES`:
- "Woven Wool" (line ~211, legacy) AND "Woven Cloth" (line 235, recipe-matching) — both exist
- "Silk Cloth" (line ~221, legacy) AND "Silk Fabric" (line 255, recipe-matching) — both exist
- TAILOR_RECIPES correctly output "Woven Cloth" and "Silk Fabric". Legacy names are orphaned (no recipe references them).
- Also has standalone `run-tailor.ts` that duplicates what the main pipeline already covers.

### P3 — Fully Functional (24 professions)

**Gathering (7):** FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER
**Crafting (10):** SMELTER, BLACKSMITH, ARMORER, ALCHEMIST, ENCHANTER, BREWER, JEWELER, FLETCHER, MASON, SCRIBE
**Service (7):** MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN

---

## Per-Profession Detail

### GATHERING PROFESSIONS (7)

#### FARMER
- Type: GATHERING
- YAML: 7 gathering spots (grain_field, vegetable_patch, berry_field, hop_field, vineyard, cotton_field, apple_orchard)
- Code: All spots in `gathering.ts` RESOURCE_MAP + GATHER_SPOT_PROFESSION_MAP
- Seeded: All resource templates exist
- Tiers: APPRENTICE → EXPERT
- Status: **P3**
- Notes: Feeds COOK, BREWER, TAILOR. Cotton field added 2026-02-19.

#### RANCHER
- Type: GATHERING (asset-based)
- YAML: 4 buildings (chicken_coop, dairy_barn, sheep_pen, silkworm_house)
- Code: Buildings in `gathering.ts`
- Seeded: All output templates exist (Eggs, Milk, Wool, Fine Wool, Silkworm Cocoons)
- Tiers: APPRENTICE → CRAFTSMAN
- Status: **P3**

#### FISHERMAN
- Type: GATHERING
- YAML: 3 tiers (Raw Fish L1+, River Trout L7+, Lake Perch L7+)
- Seeded: All templates exist
- Status: **P3**

#### LUMBERJACK
- Type: GATHERING
- YAML: 3 tiers (Wood Logs/Softwood L1+, Hardwood L7+, Exotic Wood L15+)
- Seeded: All templates exist
- Status: **P3**

#### MINER
- Type: GATHERING
- YAML: 11+ resources (all ores, stone, clay, coal, silite sand)
- Seeded: All templates exist
- Tiers: APPRENTICE → MASTER
- Status: **P3**

#### HERBALIST
- Type: GATHERING
- YAML: 3 tiers (Wild Herbs L1+, Medicinal Herbs L7+, Glowcap Mushrooms L7+)
- Seeded: All templates exist
- Status: **P3**

#### HUNTER
- Type: GATHERING
- YAML: 5 outputs (Wild Game Meat, Animal Pelts, Wolf Pelts L7+, Bear Hides L7+, Exotic Hide L15+)
- Seeded: All templates exist
- Status: **P3**

---

### CRAFTING PROFESSIONS (15)

#### SMELTER
- YAML: 11 processing + 2 consumables = 13
- Code: 11 in `smelter.ts` + 2 in `consumables.ts` = 13
- Seeded: 13 (main pipeline)
- Missing: None
- Status: **P3**

#### BLACKSMITH
- YAML: 28 shared/specialization + 33 melee weapons = 61
- Code: 28 in `blacksmith.ts` + 33 in `weapons.ts` = 61
- Seeded: 33 weapons (main via `seedWeaponRecipes()`) + 28 specialization (standalone `run-recipes.ts`)
- Missing from main pipeline: 28 specialization recipes
- Status: **P3** (core weapons in main pipeline; specialization recipes additive)

#### ARMORER
- YAML: 25 (5 tiers × 5 armor pieces)
- Code: 25 in `armor.ts`
- Seeded: 25 (main pipeline)
- Missing: None
- Status: **P3**

#### WOODWORKER
- YAML: 11 processing + 14 finished goods + 7 housing = 32
- Code: 11 + 14 in `woodworker.ts` + 7 in `housing.ts` = 32
- Seeded: 11 processing + 7 housing (main) + 14 finished goods (standalone ONLY)
- **Missing from main pipeline:**
  - 4 templates: Wooden Dowels, Wooden Handle, Bow Stave, Wooden Frame (`run-recipes.ts` lines 1142-1145)
  - 14 finished goods recipes (`run-recipes.ts` lines 1197-1218)
- Status: **P1**

#### TANNER
- YAML: 3 processing + 11 armor + 1 consumable = 15
- Code: 3 in `tanner.ts` + 11 in `armor.ts` + 1 in `consumables.ts` = 15
- Seeded: 15 (main + standalone)
- **Missing from main pipeline:** 3 output templates (Cured Leather, Wolf Leather, Bear Leather) — only in `run-tanner.ts` lines 112/129/146
- Status: **P1**

#### LEATHERWORKER
- YAML: 13
- Code: 13 in `armor.ts` (LEATHERWORKER section)
- Seeded: 13 (main pipeline, IF TANNER + WOODWORKER templates exist)
- **Missing from main pipeline:** Transitive — needs Cured/Wolf/Bear Leather (TANNER) + Wooden Frame/Handle (WOODWORKER)
- Status: **P1**

#### TAILOR
- YAML: 4 processing + 13 armor = 17
- Code: 4 in `tailor.ts` + armor section in `armor.ts` = ~28
- Seeded: 4 processing + 24 armor = 28 (main pipeline)
- Missing: None — Woven Cloth, Fine Cloth, Silk Fabric ARE in `ITEM_TEMPLATES` (lines 235-263)
- Status: **P2** (orphaned legacy template names "Woven Wool", "Silk Cloth")

#### ALCHEMIST
- YAML: 11 | Code: 11 in `consumables.ts` | Seeded: 11 (main) | Status: **P3**

#### ENCHANTER
- YAML: 9 | Code: 9 in `enchantments.ts` | Seeded: 9 (main) | Status: **P3**

#### COOK
- YAML: 25 recipes
- Code: 15 in `cook.ts` (RecipeDefinition) + 24 in `consumables.ts` (ConsumableRecipe) = 39 entries, **33 unique** after dedup
- Seeded: All (main pipeline), but 6 recipeIds silently overwritten by later seed step
- **6 duplicate recipeIds** (see P2 section above)
- Status: **P2**

#### BREWER
- YAML: 9 | Code: 9 in `consumables.ts` | Seeded: 9 (main) | Status: **P3**

#### JEWELER
- YAML: 12 | Code: 12 in `accessories.ts` | Seeded: 12 (main) | Status: **P3**

#### FLETCHER
- YAML: 13 | Code: 14 in `ranged-weapons.ts` | Seeded: 14 (main) | Status: **P3**
- Notes: Depends on WOODWORKER intermediates (Bow Stave, Wooden Dowels) — works in prod but would fail on fresh DB.

#### MASON
- YAML: 8 + 4 = 12 | Code: 8 in `mason.ts` + 4 in `housing.ts` | Seeded: 12 (main) | Status: **P3**

#### SCRIBE
- YAML: 7 | Code: 7 in `consumables.ts` | Seeded: 7 (main) | Status: **P3**

---

### SERVICE PROFESSIONS (7)

| Profession | Recipes | Seed Path | Status |
|-----------|---------|-----------|--------|
| MERCHANT | None (service actions) | — | **P3** |
| INNKEEPER | None (service actions) | — | **P3** |
| HEALER | None (service actions) | — | **P3** |
| STABLE_MASTER | 6 mount gear | `seedAccessoryRecipes()` → MOUNT_GEAR_RECIPES | **P3** |
| BANKER | None (loan system) | — | **P3** |
| COURIER | None (delivery actions) | — | **P3** |
| MERCENARY_CAPTAIN | None (combat services) | — | **P3** |

---

## Recommended Fix Order

### Fix 1: TANNER — Add 3 intermediate templates to `ITEM_TEMPLATES`
**Priority:** P1 | **Unblocks:** TANNER, LEATHERWORKER, FLETCHER (via TANNER inputs)
**File:** `database/seeds/recipes.ts`
**Action:** Add Cured Leather, Wolf Leather, Bear Leather (copy from `run-tanner.ts` lines 112-146)

### Fix 2: WOODWORKER — Add 4 templates + wire finished goods into pipeline
**Priority:** P1 | **Unblocks:** WOODWORKER finished goods, FLETCHER (via Bow Stave/Dowels)
**Files:** `database/seeds/recipes.ts` + `database/seeds/index.ts`
**Action:**
1. Add Wooden Dowels, Wooden Handle, Bow Stave, Wooden Frame to `ITEM_TEMPLATES` (from `run-recipes.ts` lines 1142-1145)
2. Import `WOODWORKER_FINISHED_GOODS` into a seed function and create 14 finished goods recipes

### Fix 3: COOK — Deduplicate 6+2 recipe IDs
**Priority:** P2 | **Impact:** Eliminates silent data overwrite
**Files:** `shared/src/data/recipes/cook.ts` + `consumables.ts`
**Action:**
- Remove 6 duplicate IDs from COOK_RECIPES in `cook.ts` (ConsumableRecipe versions in `consumables.ts` are canonical — they have consumableStats)
- Fix 2 intra-file duplicates in `consumables.ts` (`cook-grilled-fish` at L299+L582, `cook-fish-stew` at L442+L598)

### Fix 4: TAILOR — Remove orphaned legacy templates
**Priority:** P2 | **Impact:** DB cleanup
**File:** `database/seeds/recipes.ts`
**Action:** Remove "Woven Wool" and "Silk Cloth" from `ITEM_TEMPLATES` (orphaned, no recipe uses them)

### Fix 5: BLACKSMITH — Fold specialization recipes into main pipeline
**Priority:** P3 | **Impact:** Main pipeline completeness
**Action:** Import 28 `blacksmith.ts` recipes into a seed function

### Fix 6: Deprecate standalone scripts
**Priority:** P3 | **Impact:** Code hygiene
**Action:** After Fixes 1-5, mark `run-tanner.ts`, `run-tailor.ts`, `run-recipes.ts`, `seed-supply-chain.ts` as deprecated

---

## Supply Chain Dependency Map

```
TIER 1 — Raw Resource Providers (no crafting dependencies)
├── FARMER    → Grain, Vegetables, Wild Berries, Hops, Grapes, Cotton, Apples
├── RANCHER   → Eggs, Milk, Wool, Fine Wool, Silkworm Cocoons
├── FISHERMAN → Raw Fish, River Trout, Lake Perch
├── LUMBERJACK → Wood Logs, Softwood, Hardwood, Exotic Wood
├── MINER     → Iron Ore, Copper Ore, Coal, Silver Ore, Gold Ore, Mithril, Adamantine, Stone, Clay
├── HERBALIST → Wild Herbs, Medicinal Herbs, Glowcap Mushrooms
└── HUNTER    → Wild Game Meat, Animal Pelts, Wolf Pelts, Bear Hides

TIER 2 — Primary Processors (Tier 1 inputs only)
├── SMELTER    → Ingots (7 metals), Glass, Nails, Iron Fittings
├── TANNER     → Cured Leather, Wolf Leather, Bear Leather + basic armor
├── TAILOR     → Cloth, Woven Cloth, Fine Cloth, Silk Fabric
├── MASON      → Cut Stone, Bricks, Polished Marble, Sandstone, Stone Slab, Clay Pot
├── WOODWORKER → Planks, Beams, Dowels, Handles, Bow Staves, Frames + furniture
├── COOK       → Flour + 24 meals (direct Tier 1)
├── BREWER     → 9 beverages (direct Tier 1)
└── ALCHEMIST  → 11 potions (direct Tier 1)

TIER 3 — Secondary Crafters (Tier 2 processed materials)
├── BLACKSMITH   → 61 weapons/tools (SMELTER + WOODWORKER + TANNER)
├── ARMORER      → 25 plate armor (SMELTER + TANNER)
├── LEATHERWORKER → 13 leather gear (TANNER + WOODWORKER)
├── TAILOR       → 24 cloth armor (own cloth + TANNER + SMELTER)
├── FLETCHER     → 14 ranged weapons (WOODWORKER + TANNER)
└── SCRIBE       → 7 scrolls/maps (WOODWORKER + HERBALIST)

TIER 4 — Advanced/Luxury (multiple tier dependencies)
├── ENCHANTER → 9 scrolls (Arcane Reagents + SMELTER + Gemstones)
├── JEWELER   → 12 accessories (SMELTER + Gemstones)
└── MASON     → 4 housing items (own stone + SMELTER)

SERVICE
├── STABLE_MASTER → 6 mount gear (TANNER + SMELTER)
└── MERCHANT, INNKEEPER, HEALER, BANKER, COURIER, MERCENARY_CAPTAIN
```

---

## Seed Pipeline Architecture

### Main Pipeline (`database/seeds/index.ts` — 18 functions via `npm run seed`)

| # | Function | Templates | Recipes | Notes |
|---|----------|-----------|---------|-------|
| 1 | seedAdmin | 0 | 0 | Admin account |
| 2 | seedWorld | 0 | 0 | 21 regions, 68 towns |
| 3 | seedKingdoms | 0 | 0 | 8 kingdoms |
| 4 | seedResources | ~51 | 0 | Gathering metadata |
| 5 | seedRecipes | ~105 | ~82 | Materials + processing + COOK + BREWER + legacy |
| 6 | seedMonsters | 0 | 0 | PvE encounters |
| 7 | seedQuests | 0 | 0 | 49 quests |
| 8 | seedTools | 36 | 0 | 6 types x 6 tiers |
| 9 | seedTownResources | 0 | 0 | Biome assignments |
| 10 | seedConsumableRecipes | ~40 | ~54 | ALCH+COOK+BREW+SCRIBE+SMELT+TAN |
| 11 | seedArmorRecipes | ~75 | ~62 | ARMORER+LW+TAILOR+TANNER armor |
| 12 | seedDiplomacy | 0 | 0 | 190 racial relations |
| 13 | seedNodes | 0 | 0 | Travel nodes |
| 14 | seedFoodItems | ~35 | 0 | Food/beverage templates |
| 15 | seedWeaponRecipes | ~50 | ~47 | BS weapons + Fletcher ranged |
| 16 | seedAccessoryRecipes | ~43 | ~34 | Jeweler+Enchanter+Housing+Mount |
| 17 | seedAbilities | 0 | 0 | 7 classes x 3 specs |
| 18 | seedAchievements | 0 | 0 | 27 achievements |

### Standalone Scripts (NOT in main pipeline)

| Script | What it creates | Status |
|--------|----------------|--------|
| `run-tanner.ts` | 3 leather templates + 15 TANNER recipes | **Required for fresh DB** |
| `run-tailor.ts` | TAILOR items + RANCHER Craftsman resources | Redundant (main pipeline covers) |
| `run-recipes.ts` | 4 WW templates + 14 WW goods + 28 BS specs | **Required for fresh DB** |
| `seed-supply-chain.ts` | 38 templates + 28 recipes (P0 fix) | Partially redundant |

### Fresh DB Failure Chain

```
npm run seed
  → Step 5: seedRecipes()
    → ALL_PROCESSING_RECIPES includes TANNER_RECIPES
    → tan-cure-leather outputs "Cured Leather" → template NOT in ITEM_TEMPLATES → FAIL
    → ww-carve-wooden-dowels outputs "Wooden Dowels" → template NOT in ITEM_TEMPLATES → FAIL
  → Step 11: seedArmorRecipes() (if step 5 didn't halt)
    → LEATHERWORKER recipes need Cured Leather input → FAIL
  → Step 15: seedWeaponRecipes()
    → FLETCHER recipes need Bow Stave, Wooden Dowels → FAIL
```

**Impact:** 4 professions broken (TANNER, WOODWORKER, LEATHERWORKER, FLETCHER). 25 other professions seed correctly.
