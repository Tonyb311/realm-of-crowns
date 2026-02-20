# Profession Audit Report

Generated: 2026-02-20

## Summary

| Metric | Count |
|--------|-------|
| Total professions | 29 (7 gathering, 15 crafting, 7 service) |
| Fully functional in production | 29/29 |
| In main seed pipeline (`index.ts`) | 26/29 |
| Depend on one-time standalone scripts | 3 (TANNER, LEATHERWORKER, WOODWORKER) |
| Total recipes defined in code | ~360+ |
| Total recipes seeded in production | ~360+ |
| Missing from main seed pipeline | 14 finished goods recipes + 7 intermediate templates |
| Fresh-DB seed would fail | YES — 3 professions have templates only in standalone scripts |

## Priority Tiers

### P0 — Completely Broken
**None.** All professions are functional in production. One-time standalone seed scripts (`run-tanner.ts`, `run-recipes.ts`) were executed against the production DB to fill gaps.

### P1 — Main Seed Pipeline Gap (would break on fresh DB)

**WOODWORKER** — 14 finished goods recipes + 4 intermediate templates only in `database/seeds/run-recipes.ts` (standalone, not in `index.ts`). Fresh `npm run seed` would fail when ALL_PROCESSING_RECIPES tries to resolve Woodworker intermediate outputs (Wooden Dowels, Wooden Handle, Bow Stave, Wooden Frame).

**TANNER** — 3 intermediate output templates (Cured Leather, Wolf Leather, Bear Leather) only in `database/seeds/run-tanner.ts` (standalone). Fresh seed would throw `"Item template not found for output: Cured Leather"` when processing TANNER_RECIPES.

**LEATHERWORKER** — Depends on TANNER intermediate templates (Cured Leather, Wolf Leather, Bear Leather) as recipe inputs. If TANNER templates are missing, LEATHERWORKER armor recipes fail too.

### P2 — Functional but Quirky

**COOK** — Has duplicate recipeIds across two recipe sources:
- `COOK_RECIPES` (15, RecipeDefinition format in `cook.ts`) — seeded by `seedRecipes()`
- `COOK_CONSUMABLES` (17, ConsumableRecipe format in `consumables.ts`) — seeded by `seedConsumableRecipes()`
- Overlapping IDs: `cook-grilled-fish`, `cook-berry-jam`, `cook-fish-stew`, `cook-herbal-tea` — last writer wins (seedConsumableRecipes runs after seedRecipes)
- Different input lists per format (e.g., Grilled Fish: COOK_RECIPES uses Wood Logs, COOK_CONSUMABLES uses Salt)

**TAILOR** — Template name divergence between legacy seeds and recipe outputs:
- Seeds have: `Woven Wool`, `Silk Cloth` (original template names)
- Recipes output: `Woven Cloth`, `Silk Fabric` (recipe-matching names)
- Both template sets exist in DB (P0 fix added recipe-matching names), but the divergence is confusing

### P3 — Fully Functional

All remaining professions: SMELTER, BLACKSMITH, ARMORER, BREWER, ALCHEMIST, ENCHANTER, JEWELER, FLETCHER, MASON, SCRIBE, FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER, STABLE_MASTER, MERCHANT, INNKEEPER, HEALER, BANKER, COURIER, MERCENARY_CAPTAIN

---

## Per-Profession Detail

### FARMER
- Type: GATHERING
- YAML recipes: 0 (gathering only)
- Seeded recipes: N/A
- Missing: None
- Tiers live: APPRENTICE through EXPERT (cotton_field added 2026-02-19)
- Status: **P3**
- Notes: Private fields (grain_field, vegetable_patch, berry_field, hop_field, vineyard, cotton_field). Feeds COOK, BREWER, TAILOR.

### RANCHER
- Type: GATHERING
- YAML recipes: 0 (asset-based livestock)
- Seeded recipes: N/A
- Missing: None
- Tiers live: APPRENTICE through CRAFTSMAN
- Status: **P3**
- Notes: Buildings (chicken_coop, dairy_barn, sheep_pen, silkworm_house). Produces Eggs, Milk, Wool, Fine Wool, Silkworm Cocoons.

### FISHERMAN
- Type: GATHERING
- YAML recipes: 0
- Seeded recipes: N/A
- Missing: None
- Tiers live: APPRENTICE through CRAFTSMAN (River Trout, Lake Perch at L7+)
- Status: **P3**

### LUMBERJACK
- Type: GATHERING
- YAML recipes: 0
- Seeded recipes: N/A
- Missing: None
- Tiers live: APPRENTICE through JOURNEYMAN (Hardwood Grove)
- Status: **P3**

### MINER
- Type: GATHERING
- YAML recipes: 0
- Seeded recipes: N/A
- Missing: None
- Tiers live: APPRENTICE through CRAFTSMAN (Coal Mine L5+, Silver Mine L7+)
- Status: **P3**

### HERBALIST
- Type: GATHERING
- YAML recipes: 0
- Seeded recipes: N/A
- Missing: None
- Tiers live: APPRENTICE through CRAFTSMAN (Medicinal Herbs, Glowcap Mushrooms at L7+)
- Status: **P3**

### HUNTER
- Type: GATHERING
- YAML recipes: 0
- Seeded recipes: N/A
- Missing: None
- Tiers live: APPRENTICE through CRAFTSMAN (Wolf Pelts, Bear Hides at L7+)
- Status: **P3**

---

### SMELTER
- Type: CRAFTING
- YAML recipes: 11 processing + 2 consumables = 13
- Seeded recipes: 13
- Missing recipes: None
- Missing items: None
- Seed path: `seedRecipes()` → ALL_PROCESSING_RECIPES (11) + `seedConsumableRecipes()` → SMELTER_CONSUMABLES (2)
- Status: **P3**
- Notes: Core bottleneck profession. All ore→ingot recipes live. Maintenance Kit and Precision Maintenance Kit for Warforged.

### BLACKSMITH
- Type: CRAFTING
- YAML recipes: 28 (16 shared + 12 branch-exclusive across Toolsmith/Weaponsmith/Armorer)
- Seeded recipes: 28 (via `run-recipes.ts` standalone) + 34 weapon recipes (via `seedWeaponRecipes()`)
- Missing recipes: None
- Missing items: None
- Seed path: `seedWeaponRecipes()` → BLACKSMITH_WEAPON_RECIPES (34) + standalone `run-recipes.ts` (28 specialization recipes)
- Status: **P3**
- Notes: 3 specialization branches at L7. Toolsmith/Weaponsmith/Armorer recipes in standalone script but also covered by weapon-recipes seed.

### ARMORER
- Type: CRAFTING
- YAML recipes: 25 (5 metal tiers × 5 armor pieces)
- Seeded recipes: 25
- Missing recipes: None
- Missing items: None
- Seed path: `seedArmorRecipes()` → ALL_ARMOR_RECIPES
- Status: **P3**
- Notes: Full tier coverage: Copper → Iron → Steel → Mithril → Adamantine.

### WOODWORKER
- Type: CRAFTING
- YAML recipes: 25 (11 processing + 14 finished goods) + 7 housing
- Seeded recipes: 11 processing (main pipeline) + 7 housing (main pipeline) + 14 finished goods (standalone only)
- Missing from main pipeline: **14 finished goods + 4 intermediate templates**
- Missing items from main pipeline:
  - Templates: Wooden Dowels, Wooden Handle, Bow Stave, Wooden Frame
  - Finished goods: Wooden Pickaxe, Fishing Rod, Carving Knife, Wooden Chair, Tanning Rack, Fine Fishing Rod, Wooden Shield, Wooden Table, Storage Chest, Wooden Bed Frame, Wooden Shelf, Reinforced Crate, Practice Bow, Hardwood Tower Shield
- Seed path:
  - Main: `seedRecipes()` → 11 processing + `seedAccessoryRecipes()` → 7 housing
  - Standalone: `run-recipes.ts` → 14 finished goods + 4 intermediate templates
- Status: **P1** (functional in production, would break on fresh DB)
- Notes: `WOODWORKER_FINISHED_GOODS` is exported from `shared/src/data/recipes/woodworker.ts` but no seed function in `index.ts` imports it. Only `run-recipes.ts` (standalone) handles these.

### TANNER
- Type: CRAFTING
- YAML recipes: 3 processing + 11 armor goods + 1 consumable = 15
- Seeded recipes: 15
- Missing from main pipeline: **3 intermediate output templates** (Cured Leather, Wolf Leather, Bear Leather)
- Seed path:
  - Main: `seedRecipes()` → 3 processing (TANNER_RECIPES) + `seedArmorRecipes()` → 11 armor + `seedConsumableRecipes()` → 1 consumable
  - Standalone: `run-tanner.ts` → intermediate templates + all tanner recipes
- Status: **P1** (functional in production; fresh seed would fail at TANNER_RECIPES)
- Notes: `seedRecipes()` tries to seed TANNER_RECIPES but "Cured Leather" output template only exists if `run-tanner.ts` was run first. ITEM_TEMPLATES has "Soft Leather" but TANNER_RECIPES outputs "Cured Leather" — name mismatch.

### LEATHERWORKER
- Type: CRAFTING
- YAML recipes: 13-14
- Seeded recipes: 13-14
- Missing from main pipeline: Depends on TANNER intermediate templates
- Seed path: `seedArmorRecipes()` → ALL_ARMOR_RECIPES (LEATHERWORKER section)
- Status: **P1** (depends on TANNER templates from standalone script)
- Notes: Uses Cured Leather, Wolf Leather, Bear Leather as inputs. If those templates don't exist, recipes fail.

### TAILOR
- Type: CRAFTING
- YAML recipes: 4 processing + 13-15 armor = 17-19
- Seeded recipes: 4 processing + 24 armor = 28
- Missing recipes: None
- Missing items: None (P0 fix added Cotton gathering + Woven Cloth/Fine Cloth/Silk Fabric templates)
- Seed path: `seedRecipes()` → 4 processing + `seedArmorRecipes()` → 24 armor
- Status: **P3**
- Notes: P0 supply chain fix (2026-02-19) unblocked this profession. Armor seed has 5 cloth tiers (Cloth, Linen, Woven Wool, Silk, Enchanted Silk) with 4-5 pieces each.

### ALCHEMIST
- Type: CRAFTING
- YAML recipes: 11
- Seeded recipes: 11
- Missing recipes: None
- Missing items: None
- Seed path: `seedConsumableRecipes()` → ALL_CONSUMABLE_RECIPES (ALCHEMIST_CONSUMABLES)
- Status: **P3**
- Notes: 3 tiers (Minor Healing → Healing → Greater Healing + elixirs). Uses Wild Herbs, Medicinal Herbs, Glowcap Mushrooms, Clay.

### ENCHANTER
- Type: CRAFTING
- YAML recipes: 9
- Seeded recipes: 9
- Missing recipes: None
- Missing items: None
- Seed path: `seedAccessoryRecipes()` → ENCHANTMENT_RECIPES
- Status: **P3**
- Notes: 9 enchantment scrolls (Flaming, Frost, Lightning, Poisoned, Holy, Shadow, Fortified, Swift, Warding).

### COOK
- Type: CRAFTING
- YAML recipes: ~25 (including Fisherman + Rancher recipes)
- Seeded recipes: 15 (COOK_RECIPES) + 17 (COOK_CONSUMABLES) = ~32 (with overlaps)
- Missing recipes: None
- Missing items: None (P0 fix added all output templates)
- Seed path: `seedRecipes()` → COOK_RECIPES (15) + `seedConsumableRecipes()` → COOK_CONSUMABLES (17)
- Status: **P2** (functional but has duplicate recipeId conflicts)
- Notes: Duplicate IDs between COOK_RECIPES and COOK_CONSUMABLES (cook-grilled-fish, cook-berry-jam, etc.) with different input lists. The ConsumableRecipe version wins since seedConsumableRecipes runs later.

### BREWER
- Type: CRAFTING
- YAML recipes: 9
- Seeded recipes: 9
- Missing recipes: None
- Missing items: None (P0 fix added Hops, Grapes templates)
- Seed path: `seedRecipes()` → BREWER_CONSUMABLES (9) + `seedConsumableRecipes()` → BREWER_CONSUMABLES (9, same data, upsert)
- Status: **P3**
- Notes: Seeded by both seed functions (no conflict, both upsert same data). 3 tiers × 3 recipes.

### JEWELER
- Type: CRAFTING
- YAML recipes: 12
- Seeded recipes: 12
- Missing recipes: None
- Missing items: None
- Seed path: `seedAccessoryRecipes()` → ACCESSORY_RECIPES (JEWELER section)
- Status: **P3**
- Notes: Rings (5 metals), Necklaces (3 metals), Brooches (2), Circlet of Focus, Crown of Wisdom.

### FLETCHER
- Type: CRAFTING
- YAML recipes: 13
- Seeded recipes: 13
- Missing recipes: None
- Missing items: None
- Seed path: `seedWeaponRecipes()` → RANGED_WEAPON_RECIPES
- Status: **P3**
- Notes: Bows (Shortbow → Hunting → Longbow → War → Composite → Ranger's Longbow), Arrows (3 types), Quivers. Depends on WOODWORKER intermediates (Bow Stave, Wooden Dowels).

### MASON
- Type: CRAFTING
- YAML recipes: 8 processing + 4 housing = 12
- Seeded recipes: 12
- Missing recipes: None
- Missing items: None
- Seed path: `seedRecipes()` → 8 processing + `seedAccessoryRecipes()` → 4 housing
- Status: **P3**
- Notes: Cut Stone, Bricks, Polished Marble, Cut Sandstone, Stone Slab, Clay Pot + Stone Hearth, Brick Oven, Stone Fountain, Marble Statue.

### SCRIBE
- Type: CRAFTING
- YAML recipes: 7
- Seeded recipes: 7
- Missing recipes: None
- Missing items: None
- Seed path: `seedConsumableRecipes()` → ALL_CONSUMABLE_RECIPES (SCRIBE_CONSUMABLES)
- Status: **P3**
- Notes: Spell scrolls (Fire, Ice, Lightning, Healing) + maps (Area, Dungeon) + Identification Scroll.

---

### SERVICE PROFESSIONS

### MERCHANT
- Type: SERVICE
- Recipes: None (service actions via `service.ts` routes)
- Status: **P3**

### INNKEEPER
- Type: SERVICE
- Recipes: None
- Status: **P3**

### HEALER
- Type: SERVICE
- Recipes: None
- Status: **P3**

### STABLE_MASTER
- Type: SERVICE
- YAML recipes: 6 (mount gear)
- Seeded recipes: 6
- Missing: None
- Seed path: `seedAccessoryRecipes()` → MOUNT_GEAR_RECIPES
- Status: **P3**
- Notes: Saddle, Horseshoes, Saddlebags, Horse Armor, War Saddle, Mithril Horseshoes.

### BANKER
- Type: SERVICE
- Recipes: None
- Status: **P3**

### COURIER
- Type: SERVICE
- Recipes: None
- Status: **P3**

### MERCENARY_CAPTAIN
- Type: SERVICE
- Recipes: None
- Status: **P3**

---

## Recommended Fix Order

### Fix 1: Fold `run-tanner.ts` templates into main pipeline
Add Cured Leather, Wolf Leather, Bear Leather templates to `ITEM_TEMPLATES` in `database/seeds/recipes.ts`. This unblocks TANNER and LEATHERWORKER on fresh DB seeds.

### Fix 2: Fold `run-recipes.ts` templates and recipes into main pipeline
Add Wooden Dowels, Wooden Handle, Bow Stave, Wooden Frame templates to `ITEM_TEMPLATES` in `database/seeds/recipes.ts`. Add WOODWORKER_FINISHED_GOODS to a seed function (either extend `seedRecipes()` or create a new `seedWoodworkerGoods()`).

### Fix 3: Resolve COOK duplicate recipeIds
Deduplicate cook-grilled-fish, cook-berry-jam, cook-fish-stew, cook-herbal-tea between COOK_RECIPES and COOK_CONSUMABLES. Either unify into one format or use unique IDs (e.g., `cook-v2-grilled-fish` for the ConsumableRecipe version).

### Fix 4: Clean up TAILOR template name divergence
Decide canonical names for TAILOR intermediates: either "Woven Wool" or "Woven Cloth" (currently both exist). Same for "Silk Cloth" vs "Silk Fabric". Remove duplicates and update recipes to use one name.

---

## Supply Chain Dependency Map

```
TIER 1 — Raw Resource Providers (no crafting dependencies)
├── FARMER    → Grain, Vegetables, Berries, Hops, Grapes, Cotton, Apples
├── RANCHER   → Eggs, Milk, Wool, Fine Wool, Silkworm Cocoons
├── FISHERMAN → Raw Fish, River Trout, Lake Perch
├── LUMBERJACK → Wood Logs, Hardwood
├── MINER     → Iron Ore, Stone, Clay, Coal, Silver Ore, Gold Ore, Mithril, Adamantine
├── HERBALIST → Wild Herbs, Medicinal Herbs, Glowcap Mushrooms
└── HUNTER    → Wild Game Meat, Animal Pelts, Wolf Pelts, Bear Hides

TIER 2 — Primary Processors (depend on Tier 1 outputs only)
├── SMELTER   → Copper/Iron/Steel/Silver/Gold/Mithril/Adamantine Ingots, Glass, Nails
├── TANNER    → Cured Leather, Wolf Leather, Bear Leather + armor
├── TAILOR    → Cloth, Woven Cloth, Fine Cloth, Silk Fabric (processing)
├── MASON     → Cut Stone, Bricks, Sandstone, Stone Slab, Clay Pot
├── WOODWORKER → Softwood/Hardwood Planks, Beams, Dowels, Handles, Bow Staves, Frames
├── COOK      → Flour, meals, feasts (uses Tier 1 directly)
├── BREWER    → Ales, ciders, wines (uses Tier 1 directly)
└── ALCHEMIST → Potions, elixirs (uses Tier 1 directly)

TIER 3 — Secondary Crafters (depend on Tier 2 processed materials)
├── BLACKSMITH  → Weapons + tools (needs SMELTER ingots + WOODWORKER planks + TANNER leather)
├── ARMORER     → Plate armor (needs SMELTER ingots + TANNER leather + WOODWORKER planks)
├── LEATHERWORKER → Leather goods (needs TANNER leather + WOODWORKER frames)
├── TAILOR      → Cloth armor (needs own cloth + TANNER leather + SMELTER silver)
├── FLETCHER    → Bows + arrows (needs WOODWORKER staves/dowels + TANNER leather)
└── SCRIBE      → Scrolls + maps (needs WOODWORKER planks + HERBALIST herbs)

TIER 4 — Advanced/Luxury Crafters (depend on multiple tiers)
├── ENCHANTER → Enchantment scrolls (needs SMELTER ingots + JEWELER gems + HERBALIST herbs)
├── JEWELER   → Accessories (needs SMELTER ingots + gathered gems)
└── MASON     → Housing items (needs own stone + SMELTER ingots)

SERVICE — No crafting dependencies
├── STABLE_MASTER → Mount gear (needs TANNER leather + SMELTER ingots)
├── MERCHANT, INNKEEPER, HEALER, BANKER, COURIER, MERCENARY_CAPTAIN
```

---

## Seed Pipeline Architecture

### Main Pipeline (`database/seeds/index.ts` — runs via `npm run seed`)

| Order | Function | Templates | Recipes | Source |
|-------|----------|-----------|---------|--------|
| 1 | seedAdmin | 0 | 0 | — |
| 2 | seedWorld | 0 | 0 | 21 regions, 68 towns |
| 3 | seedKingdoms | 0 | 0 | 8 kingdoms |
| 4 | seedResources | ~51 | 0 | Base gathering resources |
| 5 | seedRecipes | ~105 | ~82 | Materials + processing + COOK + BREWER + legacy |
| 6 | seedMonsters | 0 | 0 | PvE encounters |
| 7 | seedQuests | 0 | 0 | 49 quests |
| 8 | seedTools | 36 | 0 | 6 types × 6 tiers |
| 9 | seedTownResources | 0 | 0 | Biome assignments |
| 10 | seedConsumableRecipes | ~40 | ~47 | ALCH + COOK + BREW + SCRIBE + SMELT + TAN |
| 11 | seedArmorRecipes | ~75 | ~75 | ARMORER + LW + TAILOR + TANNER armor |
| 12 | seedDiplomacy | 0 | 0 | 190 racial relations |
| 13 | seedNodes | 0 | 0 | Travel nodes |
| 14 | seedFoodItems | 32 | 0 | Food templates |
| 15 | seedWeaponRecipes | ~50 | ~47 | BS weapons + Fletcher ranged |
| 16 | seedAccessoryRecipes | ~70 | ~34 | Jeweler + Enchanter + Housing + Mount |
| 17 | seedAbilities | 0 | 0 | 7 classes × 3 specs |
| 18 | seedAchievements | 0 | 0 | 27 achievements |

### Standalone Scripts (NOT in main pipeline — must be run manually)

| Script | Templates | Recipes | Professions Affected |
|--------|-----------|---------|---------------------|
| `run-tanner.ts` | 3 (Cured/Wolf/Bear Leather) + armor templates | 15 | TANNER, LEATHERWORKER |
| `run-recipes.ts` | 4 intermediates + 14 finished goods | 28+ (BS specializations + WW finished) | WOODWORKER, BLACKSMITH |
| `seed-supply-chain.ts` | 38 (resources + COOK/BREWER outputs) | 28 (TAILOR + COOK + BREWER) | TAILOR, COOK, BREWER |

### Key Risk
Running `npm run seed` on a fresh database **will fail** at step 5 (seedRecipes) because:
- TANNER_RECIPES references "Cured Leather" output → template doesn't exist in ITEM_TEMPLATES
- WOODWORKER_RECIPES references "Wooden Dowels" output → template doesn't exist in ITEM_TEMPLATES
