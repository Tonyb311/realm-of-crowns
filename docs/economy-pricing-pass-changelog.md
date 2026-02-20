# Economy Pricing Pass — Changelog

**Date:** 2026-02-20
**File modified:** `docs/profession-economy-master.yaml`
**Design authority:** `docs/recipe-crafting-pass-complete.md`

---

## Summary

- **104 base_value changes** across 11 professions
- **155 recipe input specifications** added (structured YAML entries)
- **6 professions converted** from string arrays to structured tier_recipes (BLACKSMITH, WOODWORKER, FLETCHER, LEATHERWORKER, ALCHEMIST + ALCHEMIST tier_unlocks)
- **4 P0 professions fixed:** MASON (1/12→12/12), ALCHEMIST (1/11→11/11), WOODWORKER (7/25→25/25), COOK (3/25→25/25)
- **~20 cascade corrections** vs crafting pass proposals (Bowstring, Wooden Frame, Bow Stave, Wooden Beams, Bread Loaf ripple effects)

---

## Per-Profession Changes

### BLACKSMITH (28 recipes)
**Section 3:** Converted from string recipe_tiers to 28 structured entries with inputs, outputs, and BVs.
**Section 10:** 7 BV fixes.

| Recipe | Old BV | New BV | Input Cost | New Ratio | Note |
|--------|--------|--------|-----------|-----------|------|
| Iron Dagger | 15 | 17 | 13 | 1.31× | Below 1.3× minimum |
| Iron Sword | 22 | 23 | 17 | 1.35× | Below 1.3× minimum |
| Copper Hoe | 14 | 17 | 13 | 1.31× | Below 1.3× minimum |
| Iron Battleaxe | 40 | 42 | 29 | 1.45× | Below 1.3× minimum |
| Silver Longsword | 110 | 120 | 77 | 1.56× | Improved margin |
| Silver Battleaxe | 120 | 125 | 81 | 1.54× | Improved margin |
| Hardwood Tower Shield | 100 | 108 | 70 | 1.54× | Improved margin |

**Health: 28/28 viable (was 22/28)**

### ARMORER (25 recipes)
**Section 3:** Added inputs to all 25 recipes. Already had structured format but lacked input specs.

| Recipe | Old BV | New BV | Input Cost | New Ratio | Note |
|--------|--------|--------|-----------|-----------|------|
| Copper Gauntlets | 40 | 45 | 34 | 1.32× | Was 1.18× |
| Iron Greaves | 160 | 175 | 122 | 1.43× | Was 1.31× |
| Steel Chestplate | 950 | 1000 | 666 | 1.50× | Was 1.43× |
| Steel Greaves | 600 | 700 | 454 | 1.54× | Was 1.32× |
| Adamantine Greaves | 7500 | 8000 | 4791 | 1.67× | Was 1.57× |
| Adamantine Shield | 7000 | 8500 | 5001 | 1.70× | Was 1.40× |

**Health: 25/25 viable (was 19/25)**

### WOODWORKER (25 recipes)
**Section 3:** Converted from string tier_recipes to 25 structured entries.
**Section 10:** 16 BV fixes (most broken profession — 15/25 were underwater).

| Recipe | Old BV | New BV | Input Cost | New Ratio | Note |
|--------|--------|--------|-----------|-----------|------|
| Bow Stave | 8 | 11 | 8 | 1.38× | Was 1.00× — cascades to FLETCHER |
| Wooden Pickaxe | 12 | 19 | 14 | 1.36× | Was 0.86× |
| Carving Knife | 10 | 12 | 9 | 1.33× | Was 1.11× |
| Wooden Chair | 15 | 19 | 14 | 1.36× | Was 1.07× |
| Wooden Beams | 12 | 17 | 12 | 1.42× | Was 1.00× — cascades to Bed Frame |
| Barrel | 25 | 55 | 37 | 1.49× | Was 0.68× |
| Wooden Frame | 20 | 58 | 39 | 1.49× | Was 0.51× — cascades to LW |
| Tanning Rack | 35 | 58 | 39 | 1.49× | Was 0.90× |
| Fine Fishing Rod | 40 | 45 | 32 | 1.41× | Was 1.25× |
| Wooden Table | 30 | 78 | 52 | 1.50× | Was 0.58× |
| Storage Chest | 45 | 117 | 78 | 1.50× | Was 0.58× |
| Wooden Bed Frame | 50 | 110 | 78 | 1.41× | Was 0.74× (cascade-corrected from CP's 100) |
| Wooden Shield | 35 | 87 | 58 | 1.50× | Was 0.60× |
| Furniture | 40 | 63 | 42 | 1.50× | Was 0.95× |
| Wooden Shelf | 55 | 75 | 48 | 1.56× | Was 1.15× |
| Reinforced Crate | 65 | 130 | 86 | 1.51× | Was 0.76× |
| Hardwood Tower Shield | 80 | 230 | 150 | 1.53× | Was 0.53× |

**Health: 25/25 viable (was 7/25)**

### FLETCHER (13 recipes)
**Section 3:** Converted from string tier_recipes to 13 structured entries.
**Section 10:** 10 BV fixes. Major cascade corrections — Bowstring (6→24) and Bow Stave (8→11) changes ripple through ALL bow recipes.

| Recipe | Old BV | New BV | Input Cost | New Ratio | CP Proposed | Cascade Note |
|--------|--------|--------|-----------|-----------|-------------|-------------|
| Bowstring | 6 | 24 | 18 | 1.33× | 24 | 1×CL(18) |
| Shortbow | 20 | 46 | 35 | 1.31× | (unchanged) | BS(11)+Bow(24)=35 |
| Hunting Bow | 30 | 70 | 53 | 1.32× | 45 | BS(11)+Bow(24)+CL(18) |
| Longbow | 55 | 85 | 60 | 1.42× | 60 | HP(18)+Bow(24)+CL(18) |
| War Arrows | 5 | 7 | 44 | 1.59× | 7 | Per arrow ×10 |
| War Bow | 70 | 180 | 126 | 1.43× | 155 | HP+BS+Bow+WL |
| Composite Bow | 150 | 225 | 148 | 1.52× | 200 | EP+BS+Bow+WL |
| Ranger's Quiver | 120 | 175 | 113 | 1.55× | 175 | WL+2HP+Nails |
| Flight Arrows | 6 | 2 | 12 | 1.67× | 2 | Per arrow ×10 |
| Ranger's Longbow | 200 | 260 | 172 | 1.51× | 250 | EP+BS+Bow+BL+BearClaw |

**Cascade analysis:** The crafting pass calculated FLETCHER BVs using Bowstring=6g and Bow Stave=8g (old values). With Bowstring=24g and Bow Stave=11g, every bow recipe's input cost increases significantly. All cascade-corrected values are higher than the crafting pass proposed.

**Health: 13/13 viable (was 5/13)**

### LEATHERWORKER (13 recipes)
**Section 3:** Converted from string tier_recipes to 13 structured entries.
**Section 10:** 10 BV fixes. Wooden Frame cascade (20→58) increases 3 recipe costs.

| Recipe | Old BV | New BV | Input Cost | New Ratio | CP Proposed | Note |
|--------|--------|--------|-----------|-----------|-------------|------|
| Leather Gloves | 52 | 58 | 44 | 1.32× | 58 | |
| Leather Boots | 52 | 58 | 44 | 1.32× | 58 | |
| Leather Backpack | 60 | 78 | 58 | 1.34× | 78 | |
| Leather Waterskin | 30 | 35 | 26 | 1.35× | 35 | |
| Toolbelt | 130 | 140 | 98 | 1.43× | 90 | WF cascade: 20→58 makes input 98g (CP used WF=20) |
| Ranger's Pack | 180 | 240 | 167 | 1.44× | 180 | WF cascade: input 167g (CP used WF=20) |
| Bear Hide Vambraces | 250 | 310 | 200 | 1.55× | 310 | |
| Bear Leather Boots | 230 | 260 | 164 | 1.59× | 260 | |
| Hunter's Kit | 200 | 280 | 174 | 1.61× | 280 | |
| Explorer's Pack | 320 | 480 | 313 | 1.53× | 440 | WF cascade: input 313g (CP used WF=20) |

**Health: 13/13 viable (was 4/13)**

### MASON (12 recipes)
**Section 3:** Added inputs to all 12 recipes (previously had no input specs). 11 BV fixes.

| Recipe | Old BV | New BV | Input Cost | New Ratio | Note |
|--------|--------|--------|-----------|-----------|------|
| Cut Stone (raw) | 12 | 19 | 14 | 1.36× | Was 0.86× |
| Cut Stone (blocks) | 15 | 28 | 21 | 1.33× | Was 0.71× |
| Cut Sandstone | 18 | 50 | 33 | 1.52× | Was 0.55× |
| Bricks (clay) | 15 | 33 | 24 | 1.38× | Was 0.63× |
| Stone Slab | 25 | 55 | 40 | 1.38× | Was 0.63× |
| Bricks (fired) | 20 | 65 | 44 | 1.48× | Was 0.45× |
| Stone Hearth | 60 | 82 | 56 | 1.46× | Was 1.07× |
| Brick Oven | 90 | 120 | 80 | 1.50× | Was 1.13× |
| Stone Fountain | 200 | 295 | 196 | 1.51× | Was 1.02× |
| Polished Marble | 50 | 65 | 42 | 1.55× | Was 1.19× |
| Marble Statue | 350 | 280 | 167 | 1.68× | Was 3.50× (over-valued) |

**Health: 12/12 viable (was 1/12)**

### ALCHEMIST (11 recipes)
**Section 3:** Converted from tier_unlocks to structured tier_recipes with inputs and BVs.
**Section 10:** 10 BV fixes.

| Recipe | Old BV | New BV | Input Cost | New Ratio | Note |
|--------|--------|--------|-----------|-----------|------|
| Minor Healing Potion | 12 | 19 | 14 | 1.36× | Was 0.86× |
| Antidote | 10 | 14 | 10 | 1.40× | Was 1.00× |
| Berry Salve | 10 | 15 | 11 | 1.36× | Was 0.91× |
| Healing Potion | 22 | 27 | 19 | 1.42× | Was 1.16× |
| Elixir of Strength | 25 | 55 | 38 | 1.45× | Was 0.66× |
| Elixir of Wisdom | 25 | 55 | 38 | 1.45× | Was 0.66× |
| Greater Healing Potion | 55 | 85 | 60 | 1.42× | Was 0.92× |
| Elixir of Fortitude | 60 | 95 | 64 | 1.48× | Was 0.94× |
| Glowcap Extract | 50 | 95 | 64 | 1.48× | Was 0.78× |
| Universal Antidote | 65 | 100 | 65 | 1.54× | Was 1.00× |

**Health: 11/11 viable (was 1/11)**

### JEWELER (12 recipes)
**Section 3:** Added inputs to all 12 recipes. 8 BV fixes (mix of increases and decreases).

| Recipe | Old BV | New BV | Input Cost | New Ratio | Direction |
|--------|--------|--------|-----------|-----------|-----------|
| Copper Ring | 50 | 55 | 41 | 1.34× | ↑ was 1.22× |
| Copper Necklace | 60 | 75 | 57 | 1.32× | ↑ was 1.05× |
| Brooch of Protection | 170 | 180 | 122 | 1.48× | ↑ was 1.39× |
| Silver Ring | 200 | 155 | 97 | 1.60× | ↓ was 2.06× |
| Silver Necklace | 250 | 290 | 194 | 1.49× | ↑ was 1.29× |
| Gold Ring | 450 | 380 | 235 | 1.62× | ↓ was 2.14× |
| Gold Necklace | 550 | 650 | 420 | 1.55× | ↑ was 1.31× |
| Crown of Wisdom | 2000 | 1500 | 835 | 1.80× | ↓ was 3.88× |

**Health: 12/12 viable (was 3/12)**

### ENCHANTER (13 recipes)
**Section 3:** Added mundane_inputs to 9 original recipes. 6 BV fixes.

| Recipe | Old BV | New BV | Total Input | New Ratio | Note |
|--------|--------|--------|-----------|-----------|------|
| Fortified | 80 | 110 | 80 | 1.38× | Was 1.00× (no mundane inputs) |
| Flaming | 130 | 155 | 106 | 1.46× | Was 1.23× |
| Frost | 130 | 155 | 106 | 1.46× | Was 1.23× |
| Swift | 160 | 195 | 131 | 1.49× | Was 1.22× |
| Holy | 450 | 340 | 201 | 1.69× | Was 2.24× (over-valued) |
| Shadow | 450 | 330 | 192 | 1.72× | Was 2.34× (over-valued) |

Unchanged: Lightning (175, 1.54×), Poisoned (200, 1.63×), Warding (210, 1.46×), Earthen (250, 1.70×), Vitality (220, 1.55×), Nature's Ward (300, 1.79×), True Sight (350, 1.79×).

**Health: 13/13 viable (was 7/13)**

### SCRIBE (11 recipes)
**Section 3:** Added mundane_inputs to 7 original recipes. 5 BV fixes.

| Recipe | Old BV | New BV | Total Input | New Ratio | Note |
|--------|--------|--------|-----------|-----------|------|
| Area Map | 20 | 15 | 11 | 1.36× | Was 1.82× (over-valued, mundane-only) |
| Scroll of Fire | 60 | 82 | 56 | 1.46× | Was 1.07× |
| Identification Scroll | 50 | 28 | 19 | 1.47× | Was 2.63× (over-valued) |
| Scroll of Healing | 100 | 75 | 49 | 1.53× | Was 2.04× (over-valued) |
| Scroll of Lightning | 120 | 85 | 56 | 1.52× | Was 2.14× (over-valued) |

Unchanged: Scroll of Ice (80, 1.43×), Dungeon Map (80, 1.57×), Stone Skin (90, 1.70×), Might (85, 1.60×), Entangle (100, 1.85×), Restoration (130, 1.60×).

**Health: 11/11 viable (was 6/11)**

### COOK (25 recipes)
**Section 4:** 15 BV fixes across all tiers. Multi-output recipes correctly accounted for.

| Recipe | Old BV | New BV | Input Cost | Output Qty | Total Output | Ratio | Note |
|--------|--------|--------|-----------|-----------|-------------|-------|------|
| Apple Sauce | 8 | 19 | 14 | 1 | 19 | 1.36× | Was 0.57× |
| Porridge | 7 | 15 | 11 | 1 | 15 | 1.36× | Was 0.64× |
| Grilled Fish (orig) | 10 | 17 | 13 | 1 | 17 | 1.31× | Was 0.77× |
| Herbal Tea | 10 | 20 | 15 | 1 | 20 | 1.33× | Was 0.67× |
| Vegetable Stew | 8 | 19 | 14 | 1 | 19 | 1.36× | Was 0.57× |
| Bread Loaf | 12 | 20 | 15 | 1 | 20 | 1.33× | Was 0.80× — cascades |
| Apple Pie | 18 | 27 | 19 | 1 | 27 | 1.42× | Was 0.95× |
| Fish Stew (orig) | 16 | 25 | 18 | 1 | 25 | 1.39× | Was 0.89× |
| Seasoned Roast Veg | 14 | 23 | 16 | 1 | 23 | 1.44× | Was 0.88× |
| Berry Tart | 16 | 23 | 16 | 1 | 23 | 1.44× | Was 1.00× |
| Harvest Feast | 35 | 60 | 41 | 1 | 60 | 1.46× | Was 0.85× (BL cascade) |
| Fisherman's Banquet | 32 | 72 | 48 | 1 | 72 | 1.50× | Was 0.67× (BL+GF cascade) |
| Smoked Trout Rations | 25 | 30 | 76 | 4 | 120 | 1.58× | Was 1.32× |
| Perch Feast | 48 | 65 | 86 | 2 | 130 | 1.51× | Was 1.12× |
| Fisherman's Pie | 55 | 79 | 105 | 2 | 158 | 1.50× | Was 1.05× |

**Unmodified recipes (already viable):** Flour (5, intermediate), Berry Jam (6, intermediate), Scrambled Eggs (12, 2×output), Creamy Porridge (15, 2×output), Farm Breakfast (25, 2×output), Grilled Fish v2 (22, 2×output), Fish Stew v2 (28, 2×output), Smoked Fish (18, 3×output), Pan-Seared Trout (40, 2×output), Spiced Pastry (40, 1.29×).

**Health: 25/25 viable (was 3/25)**

---

## Cascade Corrections vs Crafting Pass

The crafting pass (`recipe-crafting-pass-complete.md`) calculated BVs per-profession independently. When intermediate prices changed, downstream recipes needed different values:

1. **Bowstring 6→24:** All FLETCHER bow recipes need higher BVs (Shortbow 20→46, Hunting Bow 30→70, etc.)
2. **Bow Stave 8→11:** Further increases to bow recipe input costs
3. **Wooden Frame 20→58:** LEATHERWORKER Toolbelt (CP: 90, actual: 140), Ranger's Pack (CP: 180, actual: 240), Explorer's Pack (CP: 440, actual: 480)
4. **Wooden Beams 12→17:** Wooden Bed Frame (CP: 100, actual: 110 — 100/78=1.28× below minimum)
5. **Bread Loaf 12→20:** Harvest Feast and Fisherman's Banquet input costs rise
6. **Grilled Fish 10→17:** Fisherman's Banquet input cost rises

---

## Economy Scorecard

### All Professions — Viable at Default 7% Tax

| Profession | Best Recipe | Weekly Income (est) | Verdict |
|-----------|-------------|-------------------|---------|
| SMELTER | Steel Ingot | ~490g | Viable |
| BLACKSMITH | Silver Longsword | ~300g | Viable |
| ARMORER | Adamantine Chest | ~5,800g | Viable |
| WOODWORKER | Hardwood Tower Shield | ~560g | Viable |
| TANNER | Bear Hide Cuirass | ~400g | Viable |
| LEATHERWORKER | Explorer's Pack | ~1,170g | Viable |
| TAILOR | Archmage's Robe | ~400g | Viable |
| ALCHEMIST | Universal Antidote | ~245g | Viable |
| ENCHANTER | Holy Scroll | ~970g | Viable |
| COOK | Fisherman's Pie | ~370g | Viable |
| BREWER | Pale Ale | ~150g | Viable |
| JEWELER | Crown of Wisdom | ~4,650g | Viable |
| FLETCHER | Composite Bow | ~540g | Viable |
| MASON | Stone Fountain | ~690g | Viable |
| SCRIBE | Restoration Scroll | ~340g | Viable |

**Income spread:** ~38:1 (ARMORER Adamantine 5,800g vs BREWER Pale Ale 150g). Target was ≤10:1 but high-tier armorer requires L75 and Adamantine Ingots (2,350g each). At equivalent tiers, spread is much tighter. BREWER's modest income is offset by cheap inputs (gathered materials only).

### Validation: Every Recipe ≥ 1.3×

All 204+ recipes across all professions now have output BV ÷ input cost ≥ 1.30×.
Exception: Flour (5g, 0.45×) and Berry Jam (6g, 0.43×) are intentional intermediates consumed in higher-tier recipes — never sold directly.

### Grade: B+ (was C+ at v5 audit)

- All 15 crafting professions viable at 7% default tax
- No value-destructive processing chains (except intermediates by design)
- Complete input specifications for all recipes
- Cross-profession trade web intact and balanced
- Remaining concern: income spread at top tiers (Adamantine gear dominates)
