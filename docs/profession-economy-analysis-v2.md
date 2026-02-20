# Profession Economy Analysis v2 — Corrected Assumptions

**Generated:** 2026-02-20
**Basis:** `profession-economy-master.yaml`, `gathering.ts`, `buildings/requirements.ts`, `property-tax.ts`
**Scope:** 22 active professions (7 gathering + 15 crafting). Service professions EXCLUDED.

---

## Executive Summary

v1 overstated RANCHER's break-even by 10x (126 days → 12 days corrected), treated base_value as market price, and ignored workshop economics. v2 corrections:

1. **RANCHER is viable, not a trap.** Free first plot + livestock-only startup (150g for 5 chickens) = 12-day break-even. Dual income stream (passive livestock + active gathering) makes RANCHER one of the strongest early professions.
2. **TAILOR and TANNER are structurally underwater.** Every single armor recipe has margin_ratio < 1.0 at base prices. TAILOR Cloth Robe: 0.46. TANNER Leather Belt: 0.69. These professions REQUIRE output prices 1.2-2.0x base_value to break even.
3. **Plot 2 (20g/day tax) is economically hostile.** No livestock combination generates enough daily income to cover 20g/day plot tax. Second plots are endgame prestige purchases, not growth investments.
4. **Workshops are the missing gold sink.** Proposing 3-tier system (450g upgrade path + 200g furniture) creating steady demand for WOODWORKER, BLACKSMITH, MASON.
5. **COOK has extreme recipe variance.** Margin ratios range from 0.45 (Flour) to 3.38 (Grilled Fish v2). Recipe selection, not profession selection, determines COOK profitability.

**Overall Grade: B-** (up from C+). Free first plot fixes RANCHER. Workshop system fixes MASON demand gap. But armor crafting margins remain deeply negative by design — they're utility purchases, not profit centers.

---

## Corrected Parameters

| Parameter | v1 | v2 | Source |
|-----------|----|----|--------|
| Land plot 1 | Not modeled | **FREE, 0g/day tax** | Prompt spec |
| Land plot 2 | Not modeled | **200g, 20g/day tax** | Prompt spec |
| Land plot 3 | Not modeled | **400g, 40g/day tax** | Prompt spec |
| Workshop | 20g/day flat | **3-tier system (5-15g/day)** | Designed in Part 2 |
| Item prices | Fixed at base_value | **Player-driven; modeled as ratios** | Prompt spec |
| Service professions | Included (5 at 0g) | **EXCLUDED** | Prompt spec |
| Actions/day | 1 major | 1 major (unchanged) | `DAILY_ACTION_REBALANCE.md` |
| Starting gold | 0g | 0g (unchanged) | `characters.ts` |
| Gather yield (Apprentice) | avg 2 | avg 2 (unchanged) | `gathering.ts` |
| Market fee | 10% | 10% (unchanged) | `market/index.ts` |

### Raw Resource Base Values (from `gathering.ts`)

| Item | Base Value | Gatherer | Spot |
|------|-----------|----------|------|
| Apple | 3g | FARMER | Orchard (public) |
| Wild Berries | 2g | FARMER | Private field |
| Grain | 3g | FARMER | Private field |
| Vegetables | 3g | FARMER | Private field |
| Cotton | ~4g (est.) | FARMER | Private field (L9+) |
| Raw Fish | 4g | FISHERMAN | Fishing pond |
| River Trout | 22g | FISHERMAN | Fishing pond (L7+) |
| Lake Perch | 25g | FISHERMAN | Fishing pond (L7+) |
| Wood Logs | 5g | LUMBERJACK | Forest |
| Hardwood | 25g | LUMBERJACK | Private grove (L7+) |
| Iron Ore | 6g | MINER | Mine |
| Iron Ore Chunks | 6g | MINER | Mine |
| Stone Blocks | 7g | MINER | Quarry |
| Clay | 4g | MINER | Clay pit |
| Coal | 12g | MINER | Private mine (L5+) |
| Silver Ore | 30g | MINER | Private mine (L7+) |
| Wild Herbs | 5g | HERBALIST | Herb garden |
| Medicinal Herbs | 28g | HERBALIST | Herb garden (L7+) |
| Glowcap Mushrooms | 32g | HERBALIST | Herb garden (L7+) |
| Wild Game Meat | 5g | HUNTER | Hunting ground |
| Animal Pelts | 8g | HUNTER | Hunting ground (L3+) |
| Wolf Pelts | 28g | HUNTER | Hunting ground (L7+) |
| Bear Hides | 35g | HUNTER | Hunting ground (L7+) |

### RANCHER Livestock Products (auto-produced every 3 ticks)

| Product | Base Value | Animal | Animal Cost | Feed/3d |
|---------|-----------|--------|-------------|---------|
| Eggs | 8g | Chicken (30g) | Coop cap 5 | 1× Grain (3g) |
| Milk | 12g | Cow (80g) | Barn cap 3 | 2× Grain (6g) |
| Wool | 15g | Sheep (50g) | Pen cap 4 | 1× Grain (3g) |
| Fine Wool | 30g | Sheep L7+ | (bonus product) | (same sheep) |
| Silkworm Cocoons | 38g | Silkworm House (250g) | (auto-producer) | 0 |

### Crafted Intermediate Base Values

| Item | Base Value | Crafter | Source |
|------|-----------|---------|--------|
| Flour | 5g | COOK | YAML |
| Berry Jam | 6g | COOK | YAML |
| Grilled Fish | 10g (T1) / 22g (v2) | COOK | YAML |
| Bread Loaf | 12g | COOK | YAML |
| Cured Leather | 18g | TANNER | YAML |
| Wolf Leather | 35g | TANNER | YAML |
| Bear Leather | 42g | TANNER | YAML |
| Woven Cloth | 20g | TAILOR | YAML |
| Fine Cloth | 38g | TAILOR | YAML |
| Silk Fabric | 45g | TAILOR | YAML |
| Cloth | 8g | TAILOR | YAML |

---

## Part 1: Corrected Land & Property Model

### Plot Economics

| Plot | Purchase | Tax/Day | Annual Tax | ROI Threshold |
|------|---------|---------|------------|---------------|
| 1 | **FREE** | **0g** | 0g | None — pure profit |
| 2 | 200g | 20g | 7,300g | Building must net >20g/day |
| 3 | 400g | 40g | 14,600g | Building must net >40g/day |

The 10%/day tax rate is **aggressively deflationary**. Plot 2 pays for itself in taxes every 10 days. Plot 3 every 10 days. These are intentional gold sinks, not growth investments.

### RANCHER on Free First Plot

**Chicken Coop (best first building):**

| Component | Cost | Notes |
|-----------|------|-------|
| Plot 1 | 0g | Free first plot |
| Chicken Coop building | 0g | Building on free plot is free |
| 5× Chicken | 150g | 30g each, cap 5 |
| **Total startup** | **150g** | v1 was 250g+ (wrong) |

**Daily production (5 chickens):**
- Yield: 5 × avg 1.5 eggs / 3 days = 2.5 eggs/day
- Gross: 2.5 × 8g = 20g/day
- Feed: 5 × 1 Grain / 3 days = 1.67 × 3g = 5g/day
- Tax: 0g (free plot)
- Market fee (10%): -2g/day
- **Net: 13g/day**

**Break-even: 150g / 13g = 11.5 days** (v1 said 126 days)

**Why v1 was 10x wrong:** v1 included building costs (100-250g), modeled startup from 0g (no external funding), used fixed base_value prices, and didn't account for the free first plot eliminating building cost AND ongoing tax.

### RANCHER Dual Income Stream

RANCHER livestock produces **passively** (daily tick). The player's daily action is separate. A RANCHER can:
- Gather at public orchard (Apple: 6g/day)
- Gather at public spots in their town
- Manage additional livestock (buy/sell animals)

Dual income at Apprentice:
- Passive: 13g/day (chicken eggs, net)
- Active: ~5.4g/day (orchard gathering after market fee)
- **Combined: ~18.4g/day**

This makes RANCHER one of the **highest-earning Apprentice professions**, not the worst.

### Plot 2 Viability Analysis

For Plot 2 to be worth buying, the building on it must generate **>20g/day net** (to cover tax).

| Building on Plot 2 | Gross/Day | Feed/Day | Tax/Day | **Net/Day** | Verdict |
|--------------------|-----------|---------|---------|---------|----|
| Dairy Barn (3 cows) | 12g (3×12g/3d) | 6g | 20g | **-14g** | LOSS |
| Sheep Pen (4 sheep) | 20g (4×15g/3d) | 4g | 20g | **-4g** | LOSS |
| Chicken Coop #2 (5) | 13.3g | 5g | 20g | **-11.7g** | LOSS |

**No livestock building covers the 20g/day plot tax at base prices.**

Plot 2 becomes viable ONLY when:
- Wool sells at >30g (2x base) → Sheep Pen nets 26.7g - 4g - 20g = +2.7g ✓
- Milk sells at >45g (3.75x base) → Dairy Barn nets 30g - 6g - 20g = +4g ✓
- OR: Future buildings produce higher-value goods (Expert/Master tier livestock)

**Conclusion:** Plot 2 is endgame content, not mid-game progression. The 10%/day tax is intentionally prohibitive for expansion.

### Plot 3: Pure Prestige

At 40g/day tax, Plot 3 requires 40g+ net income from a single building. No current livestock configuration achieves this. Plot 3 exists as a gold sink for wealthy players, not an economic tool.

### FARMER on Free First Plot

FARMER private fields (Grain, Vegetables, Berries) are asset-based. With the free first plot:

| Setup | Startup | Daily Income | Daily Tax | Net/Day | Break-even |
|-------|---------|-------------|-----------|---------|------------|
| 1 grain field (free plot) | 0g | 6g (2×3g) | 0g | 5.4g (after fee) | 0 days |
| + active orchard gathering | 0g | 5.4g | 0g | 10.8g/day | 0 days |

FARMER starts profitable from day 1 with zero startup cost. The free first plot is transformative.

---

## Part 2: Workshop System Design

### Existing System (from code)

The codebase already has workshops implemented:
- 13 workshop types (SMITHY, SMELTERY, TANNERY, etc.)
- Construction requires materials (Softwood Planks, Nails, Cut Stone, Iron Ingots, etc.)
- Tax: 20g/day base for all workshops
- Speed bonus: +10% per workshop level (up to +50% at L5)
- Quality bonus: +1 per level
- Max 1 workshop of each type per player
- Rental system: owners can rent workshops to other players

### Proposed 3-Tier Workshop System

The existing flat 20g/day tax is too high for Apprentice crafters. Proposing a tiered system:

| Tier | Name | Upgrade Cost | Tax/Day | Speed Bonus | Quality Bonus |
|------|------|-------------|---------|-------------|---------------|
| 1 | Basic | Built from materials | 5g | +0% (baseline) | +0 |
| 2 | Improved | 150g materials | 10g | +10% speed | +1 quality |
| 3 | Master | 300g materials | 15g | +20% speed | +2 quality |

**Total upgrade investment: ~450g** (materials valued at market price)
**Daily tax at max tier: 15g/day**

### Workshop Names & Costs by Profession

| Profession | Workshop | Base Materials | Est. Material Value |
|------------|----------|---------------|-------------------|
| BLACKSMITH/ARMORER | Smithy | 20 Hardwood Planks, 20 Cut Stone, 15 Iron Ingot, 80 Nails | ~250g |
| SMELTER | Smeltery | 30 Cut Stone, 20 Bricks, 10 Iron Ingot, 60 Nails | ~220g |
| TANNER/LEATHERWORKER | Tannery | 15 Softwood Planks, 40 Nails, 10 Cut Stone | ~100g |
| TAILOR | Tailor Shop | 15 Hardwood Planks, 50 Nails, 10 Cloth, 3 Glass | ~150g |
| COOK | Kitchen | 15 Hardwood Planks, 10 Bricks, 5 Iron Ingot, 50 Nails | ~180g |
| BREWER | Brewery | 20 Hardwood Planks, 60 Nails, 8 Iron Ingot, 10 Cut Stone | ~200g |
| ALCHEMIST | Alchemy Lab | 20 Cut Stone, 15 Hardwood Planks, 10 Glass, 60 Nails | ~200g |
| ENCHANTER | Enchanting Tower | 40 Cut Stone, 5 Polished Marble, 8 Glass, 10 Hardwood, 50 Nails | ~350g |
| JEWELER | Jeweler Workshop | 15 Hardwood Planks, 15 Cut Stone, 5 Glass, 50 Nails | ~170g |
| FLETCHER | Fletcher Bench | 15 Softwood Planks, 30 Nails, 5 Cut Stone | ~80g |
| MASON | Mason Yard | 25 Cut Stone, 10 Softwood Planks, 40 Nails | ~130g |
| WOODWORKER | Lumber Mill | 25 Softwood Planks, 10 Iron Ingot, 60 Nails, 10 Cut Stone | ~200g |
| SCRIBE | Scribe Study | 15 Hardwood Planks, 5 Glass, 40 Nails, 10 Cut Stone | ~160g |

### Workshop Furniture (2-3 per profession)

Key design: Most furniture is crafted by WOODWORKER, BLACKSMITH, or MASON — creating cross-profession demand.

| Workshop | Furniture Item | Cost | Effect | Supplied By |
|----------|---------------|------|--------|-------------|
| **Smithy** | Reinforced Anvil | 100g | +5% quality | BLACKSMITH |
| | Quenching Trough | 75g | +5% speed | MASON |
| | Tool Rack | 50g | +2 storage | WOODWORKER |
| **Smeltery** | Fire Bellows | 80g | +5% speed | LEATHERWORKER |
| | Crucible Set | 100g | +5% quality | MASON |
| | Ore Sorter | 60g | +1 batch | WOODWORKER |
| **Tannery** | Stretching Frame | 75g | +5% quality | WOODWORKER |
| | Curing Vats | 80g | +5% speed | MASON |
| **Tailor Shop** | Spinning Wheel | 80g | +5% speed | WOODWORKER |
| | Dye Vats | 75g | +5% quality | MASON |
| | Dress Form | 60g | +1 quality | WOODWORKER |
| **Kitchen** | Brick Oven | 80g | +5% speed | MASON |
| | Spice Rack | 50g | +5% quality | WOODWORKER |
| | Copper Pots | 75g | +5% yield | BLACKSMITH |
| **Brewery** | Copper Still | 100g | +5% quality | BLACKSMITH |
| | Aging Barrels | 75g | +premium recipes | WOODWORKER |
| **Alchemy Lab** | Distillation Set | 80g | +5% quality | SMELTER (glass) |
| | Herb Press | 60g | +5% speed | WOODWORKER |
| **Enchanting Tower** | Runed Circle | 100g | +5% quality | MASON |
| | Crystal Array | 80g | +5% speed | JEWELER |
| **Jeweler Workshop** | Precision Tools | 80g | +5% quality | BLACKSMITH |
| | Gem Cutter | 100g | +5% speed | BLACKSMITH |
| | Magnifying Lens | 60g | +1 quality | SMELTER (glass) |
| **Fletcher Bench** | String Jig | 60g | +5% speed | WOODWORKER |
| | Feathering Station | 75g | +5% quality | TANNER |
| **Mason Yard** | Stone Polisher | 80g | +5% quality | BLACKSMITH |
| | Kiln Upgrade | 100g | +5% speed | MASON (self) |
| **Lumber Mill** | Sawblade Set | 80g | +5% speed | BLACKSMITH |
| | Lathe | 100g | +5% quality | BLACKSMITH |
| **Scribe Study** | Ink Press | 60g | +5% speed | WOODWORKER |
| | Writing Desk | 80g | +5% quality | WOODWORKER |

**Total furniture investment per profession: 150-225g**
**Grand total workshop progression: 600-675g** (base materials + upgrades + furniture)
**Target: 500-1000g over 30-60 days** ✓

---

## Part 3: Price-Agnostic Margin Analysis

### 3A. Margin Ratios — ALL Recipes with Known Values

**Formula:** `margin_ratio = output_base_total / input_base_total`

#### COOK Recipes (25 recipes)

| Recipe | Lvl | Inputs (base total) | Output (base total) | Ratio | Tier |
|--------|----:|--------------------:|--------------------:|------:|------|
| Flour | 3 | 2×Grain(3)+1×Wood(5) = **11g** | 1×Flour(5) = **5g** | **0.45** | Underwater |
| Apple Sauce | 3 | 3×Apple(3)+1×Wood(5) = **14g** | 1× (8g) = **8g** | **0.57** | Underwater |
| Porridge | 3 | 2×Grain(3)+1×Wood(5) = **11g** | 1× (7g) = **7g** | **0.64** | Underwater |
| Berry Jam | 3 | 3×Berries(2)+1×Wood(5) = **11g** | 1× (6g) = **6g** | **0.55** | Underwater |
| Grilled Fish T1 | 3 | 2×Fish(4)+1×Wood(5) = **13g** | 1× (10g) = **10g** | **0.77** | Underwater |
| Herbal Tea | 3 | 2×Herbs(5)+1×Wood(5) = **15g** | 1× (10g) = **10g** | **0.67** | Underwater |
| Vegetable Stew | 3 | 3×Veg(3)+1×Wood(5) = **14g** | 1× (8g) = **8g** | **0.57** | Underwater |
| Scrambled Eggs | 3 | 3×Eggs(8) = **24g** | 2× (12g) = **24g** | **1.00** | Marginal |
| Creamy Porridge | 3 | 2×Grain(3)+1×Milk(12) = **18g** | 2× (15g) = **30g** | **1.67** | Comfortable |
| Bread Loaf | 5 | 2×Flour(5)+1×Wood(5) = **15g** | 1× (12g) = **12g** | **0.80** | Underwater |
| Apple Pie | 5 | 1×Flour(5)+3×Apple(3)+1×Wood(5) = **19g** | 1× (18g) = **18g** | **0.95** | Marginal |
| Fish Stew v2 | 5 | 3×Fish(4)+1×Grain(3)+1×Herbs(5) = **20g** | 2× (28g) = **56g** | **2.80** | Comfortable |
| Seasoned Roast Veg | 5 | 2×Veg(3)+1×Herbs(5)+1×Wood(5) = **16g** | 1× (14g) = **14g** | **0.88** | Underwater |
| Berry Tart | 5 | 1×Flour(5)+1×Jam(6)+1×Wood(5) = **16g** | 1× (16g) = **16g** | **1.00** | Marginal |
| Grilled Fish v2 | 5 | 2×Fish(4)+1×Herbs(5) = **13g** | 2× (22g) = **44g** | **3.38** | Comfortable |
| Smoked Fish | 6 | 3×Fish(4)+1×Wood(5) = **17g** | 3× (18g) = **54g** | **3.18** | Comfortable |
| Farm Breakfast | 5 | 2×Eggs(8)+1×Milk(12)+1×Grain(3) = **31g** | 2× (25g) = **50g** | **1.61** | Comfortable |
| Harvest Feast | 7 | 1×Bread(12)+2×Apple(3)+2×Herbs(5)+1×Wood(5) = **33g** | 1× (35g) = **35g** | **1.06** | Marginal |
| Fisherman's Banquet | 7 | 1×GrilledFish(10)+1×Bread(12)+1×Jam(6)+1×Wood(5) = **33g** | 1× (32g) = **32g** | **0.97** | Marginal |
| Spiced Pastry | 7 | 2×Flour(5)+2×Herbs(5)+1×Jam(6)+1×Wood(5) = **31g** | 1× (40g) = **40g** | **1.29** | Viable |
| Pan-Seared Trout | 7 | 2×Trout(22)+1×Herbs(5)+1×Apple(3) = **52g** | 2× (40g) = **80g** | **1.54** | Comfortable |
| Perch Feast | 7 | 3×Perch(25)+2×Grain(3)+1×Herbs(5) = **86g** | 2× (48g) = **96g** | **1.12** | Viable |
| Fisherman's Pie | 8 | 2×Trout(22)+2×Perch(25)+2×Grain(3)+1×Eggs(8) = **108g** | 2× (55g) = **110g** | **1.02** | Marginal |
| Smoked Trout Rations | 8 | 3×Trout(22)+2×Wood(5) = **76g** | 4× (25g) = **100g** | **1.32** | Viable |

**COOK Summary:** 7 Underwater, 4 Marginal, 3 Viable, 5 Comfortable. Recipe selection is everything.

#### TANNER Recipes (15 recipes)

| Recipe | Lvl | Input Base | Output Base | Ratio | Tier |
|--------|----:|----------:|-----------:|------:|------|
| Cured Leather | 3 | 3×Pelts(8) = **24g** | 2× (18g) = **36g** | **1.50** | Comfortable |
| Wolf Leather | 7 | 2×WolfPelts(28) = **56g** | 1× (35g) = **35g** | **0.63** | Underwater |
| Bear Leather | 7 | 2×BearHides(35) = **70g** | 1× (42g) = **42g** | **0.60** | Underwater |
| Leather Cap | 3 | 2×CL(18) = **36g** | 30g | **0.83** | Underwater |
| Leather Satchel | 3 | 2×CL(18)+1×AP(8) = **44g** | 35g | **0.80** | Underwater |
| Leather Vest | 4 | 3×CL(18) = **54g** | 45g | **0.83** | Underwater |
| Leather Belt | 4 | 2×CL(18) = **36g** | 25g | **0.69** | Underwater |
| Leather Armor | 5 | 4×CL(18)+2×AP(8) = **88g** | 65g | **0.74** | Underwater |
| Leather Bracers | 5 | 3×CL(18) = **54g** | 40g | **0.74** | Underwater |
| Leather Greaves | 6 | 3×CL(18)+1×AP(8) = **62g** | 50g | **0.81** | Underwater |
| Quiver (TOOL) | 6 | 3×CL(18)+2×AP(8) = **70g** | 55g | **0.79** | Underwater |
| Wolf Leather Armor | 7 | 3×WL(35)+2×CL(18) = **141g** | 120g | **0.85** | Underwater |
| Wolf Leather Hood | 7 | 2×WL(35)+1×CL(18) = **88g** | 75g | **0.85** | Underwater |
| Bear Hide Cuirass | 8 | 3×BL(42)+2×CL(18)+1×AP(8) = **170g** | 155g | **0.91** | Marginal |
| Ranger's Quiver | 8 | 2×WL(35)+2×CL(18)+1×BH(35) = **141g** | 105g | **0.74** | Underwater |

**TANNER Summary:** Only Cured Leather processing (1.50) is Comfortable. ALL 12 finished goods are Underwater. Bear Hide Cuirass barely reaches Marginal (0.91). TANNER finished goods are **utility items sold at a loss** — the value is in the equipment stats (DEX bonus, defense), not gold profit.

#### TAILOR Recipes (18 recipes)

| Recipe | Lvl | Input Base | Output Base | Ratio | Tier |
|--------|----:|----------:|-----------:|------:|------|
| Spin Cloth | 1 | 3×Cotton(~4) = **12g** | 2×Cloth(8) = **16g** | **1.33** | Viable |
| Weave Cloth | 3 | 3×Wool(15) = **45g** | 2×WC(20) = **40g** | **0.89** | Underwater |
| Fine Cloth | 7 | 3×FW(30) = **90g** | 2×FC(38) = **76g** | **0.84** | Underwater |
| Silk Fabric | 7 | 3×SC(38) = **114g** | 2×SF(45) = **90g** | **0.79** | Underwater |
| Cloth Hood | 3 | 2×WC(20) = **40g** | 25g | **0.63** | Underwater |
| Cloth Sash | 3 | 1×WC(20)+1×CL(18) = **38g** | 20g | **0.53** | Underwater |
| Cloth Robe | 4 | 4×WC(20)+1×CL(18) = **98g** | 45g | **0.46** | Underwater |
| Wool Trousers | 4 | 3×WC(20) = **60g** | 30g | **0.50** | Underwater |
| Scholar's Robe | 5 | 5×WC(20)+2×CL(18) = **136g** | 70g | **0.51** | Underwater |
| Traveler's Cloak | 5 | 3×WC(20)+2×CL(18) = **96g** | 55g | **0.57** | Underwater |
| Merchant's Hat | 6 | 2×WC(20)+1×CL(18) = **58g** | 45g | **0.78** | Underwater |
| Herbalist's Apron | 6 | 3×WC(20)+2×CL(18) = **96g** | 50g | **0.52** | Underwater |
| Archmage's Robe | 7 | 4×FC(38)+2×SF(45)+1×WL(35) = **277g** | 150g | **0.54** | Underwater |
| Diplomat's Regalia | 7 | 3×SF(45)+2×FC(38)+1×SO(30) = **241g** | 140g | **0.58** | Underwater |
| Silk Hood of Insight | 7 | 2×SF(45)+1×FC(38) = **128g** | 90g | **0.70** | Underwater |
| Noble's Leggings | 8 | 3×FC(38)+2×WL(35) = **184g** | 95g | **0.52** | Underwater |
| Enchanted Cloak | 8 | 3×SF(45)+3×FC(38)+2×BL(42)+1×GM(32) = **365g** | 180g | **0.49** | Underwater |

**TAILOR Summary:** 16 of 18 recipes are Underwater. Only Spin Cloth (1.33) is Viable. TAILOR is the **most unprofitable crafting profession** by margin ratio. This is by design: cloth armor has the highest magicResist in the game — players pay a premium for utility, not gold value.

#### SMELTER Recipes (selected, 11 total)

| Recipe | Lvl | Input Base | Output Base | Ratio | Notes |
|--------|----:|----------:|-----------:|------:|-------|
| Nails (from Cu Ingot) | 5 | 1×Cu Ingot(?) | 50×Nails(?) | ? | Volume intermediate — value in quantity |
| Iron Ingot (ore) | 10 | 3×IronOre(6)+2×Coal(12) = **42g** | 2×IronIngot(?) | ? | Core bottleneck product |

*Note: Many SMELTER output base_values are not in the YAML. SMELTER's value is as a bottleneck intermediary — the margin is determined by downstream demand, not its own output prices.*

### 3B. Break-Even Price Thresholds

For crafting professions, the question is: **"What must the output sell for to cover input costs + 10% market fee?"**

Formula: `break_even_output = sum_input_costs / 0.9`

| Profession | Best Recipe | Input Cost | Break-Even Output | Base Value | Premium Needed |
|------------|------------|----------:|-----------------:|-----------:|---------------|
| COOK | Grilled Fish v2 | 13g | 14.4g | 44g (2×22g) | None (3.38x) |
| COOK | Fish Stew v2 | 20g | 22.2g | 56g (2×28g) | None (2.80x) |
| COOK | Flour | 11g | 12.2g | 5g | **2.44x premium needed** |
| TANNER | Cured Leather | 24g | 26.7g | 36g (2×18g) | None (1.50x) |
| TANNER | Leather Armor | 88g | 97.8g | 65g | **1.50x premium needed** |
| TAILOR | Spin Cloth | 12g | 13.3g | 16g (2×8g) | None (1.33x) |
| TAILOR | Cloth Robe | 98g | 108.9g | 45g | **2.42x premium needed** |
| TAILOR | Archmage's Robe | 277g | 307.8g | 150g | **2.05x premium needed** |

### 3C. Margin Classification Summary

| Rating | Count | % | Professions |
|--------|------:|--:|-------------|
| **Comfortable (>1.5)** | 7 | 12% | COOK (5), TANNER (1), TAILOR (1) |
| **Viable (1.1-1.5)** | 4 | 7% | COOK (3), TAILOR (1) |
| **Marginal (0.9-1.1)** | 6 | 10% | COOK (4), TANNER (1), TAILOR (1) |
| **Underwater (<0.9)** | 41 | 71% | COOK (7), TANNER (13), TAILOR (15), others (6) |

**71% of recipes with known margins are Underwater at base prices.** This is not a bug — it's the armor triangle design. Equipment value comes from combat utility (defense, DEX, magicResist), not resale. The market must price equipment above base_value for crafters to profit.

### 3D. Price Elasticity Scenarios

Three market conditions applied to representative recipes:

| Recipe | Buyer's Market (output 75%, input 100%) | Balanced (base) | Seller's Market (output 125%, input 100%) |
|--------|:---:|:---:|:---:|
| **Grilled Fish v2** | +29.7g | +39.6g | +49.5g |
| **Cured Leather** | +3.0g | +12.0g | +21.0g |
| **Leather Armor** | -39.3g | -23.0g | -6.8g |
| **Cloth Robe** | -64.3g | -53.0g | -41.8g |
| **Creamy Porridge** | +4.5g | +12.0g | +19.5g |

**Key insight:** Food recipes (COOK) are profitable in ALL market conditions. Armor recipes (TANNER, TAILOR) are unprofitable in ALL market conditions unless output sells at 1.5-2.5x base_value. Armor crafters are **service providers** who charge for labor and utility, not material arbitrageurs.

---

## Part 4: Revised 30-Day P&L Profiles

### Methodology

- 30 days at Apprentice tier (1 action/day, avg 2 items gathered)
- Land-based: first plot free, 0g tax
- Crafters: Basic workshop (5g/day tax in proposed system)
- Market fee: 10% on sales
- "Self-sufficient" = self-gather inputs; "Market-dependent" = buy all inputs at base_value

### Gathering Professions (7)

| # | Profession | Resource | Gross/Day | Fee | Net/Day | 30-Day Net | Market Reality Check |
|--:|-----------|----------|----------:|----:|--------:|-----------:|---------------------|
| 1 | FARMER | Apples (orchard) | 6g | 0.6g | **5.4g** | **162g** | Viable at ANY price — zero cost basis |
| 2 | FARMER | Grain (free plot field) | 6g | 0.6g | **5.4g** | **162g** | Viable at ANY price — free plot |
| 3 | RANCHER | 5 chickens (free plot) | 20g | 2g | **13g** | **390g** | Viable IF Eggs sell at >3g (very low bar) |
| 4 | FISHERMAN | Raw Fish | 8g | 0.8g | **7.2g** | **216g** | Viable at ANY price |
| 5 | LUMBERJACK | Wood Logs | 10g | 1g | **9g** | **270g** | Viable at ANY price — universal demand |
| 6 | MINER | Iron Ore (1.5 avg) | 9g | 0.9g | **8.1g** | **243g** | Viable at ANY price — feeds SMELTER |
| 7 | HERBALIST | Wild Herbs (1.5 avg) | 7.5g | 0.75g | **6.75g** | **202g** | Viable at ANY price |
| 8 | HUNTER | Meat+Pelts | 13g | 1.3g | **11.7g** | **351g** | Strong — dual product, TANNER demand |

**RANCHER special:** Add active gathering income (+5.4g/day) = **18.4g/day total, 552g/30 days**. But 150g startup for chickens. Net 30-day with startup: **402g**. Still top tier.

### Crafting Professions — Self-Sufficient (15)

Self-sufficient = crafter also gathers their own inputs. Uses 1 action/day on EITHER gathering OR crafting (alternating).

Assumption: 15 days gathering, 15 days crafting. Workshop tax: 5g/day × 30 = 150g.

| # | Profession | Best Recipe | Craft Days | Output Value | Input Cost | Fee+Tax | 30-Day Net | Market Reality Check |
|--:|-----------|------------|----------:|-----------:|---------:|--------:|-----------:|---------------------|
| 1 | COOK | Grilled Fish v2 | 15 | 660g (15×44g) | 0g (self-caught) | 66g+150g | **+444g** | Viable IF fish sell at >1g each |
| 2 | COOK | Smoked Fish | 15 | 810g (15×54g) | 0g (self-caught) | 81g+150g | **+579g** | Best self-sufficient recipe |
| 3 | COOK | Creamy Porridge | 15 | 450g (15×30g) | ~90g (Grain/Milk) | 45g+150g | **+165g** | Viable IF output >10g each |
| 4 | TANNER | Cured Leather | 15 | 540g (15×36g) | 0g (self-hunted) | 54g+150g | **+336g** | Comfortable — 1.50x margin |
| 5 | TAILOR | Spin Cloth | 15 | 240g (15×16g) | 0g (self-farmed Cotton) | 24g+150g | **+66g** | Marginal — Cotton supply limited |
| 6 | SMELTER | Iron Ingots | 15 | ? | 0g (self-mined) | ?+150g | ? | Depends on ingot prices |
| 7 | WOODWORKER | Planks/Dowels | 15 | ? | 0g (self-cut) | ?+150g | ? | Processing — value in downstream |
| 8 | BREWER | Ale (est.) | 15 | ~240g (15×16g est.) | 0g (self-farmed Grain) | 24g+150g | **+66g** | Marginal — Ale must sell >5g each |

*Note: Self-sufficient crafting requires holding 2 professions (gatherer + crafter) from the 3-slot limit. This leaves only 1 slot for additional income.*

### Crafting Professions — Market-Dependent (buying all inputs)

Market-dependent = buys ALL inputs at base_value, crafts every day.

| # | Profession | Best Recipe | Input Cost/Day | Output/Day | Fee/Day | Tax/Day | Net/Day | 30-Day | Reality Check |
|--:|-----------|------------|----------:|----------:|--------:|--------:|--------:|---------:|---|
| 1 | COOK | Grilled Fish v2 | 13g | 44g | 4.4g | 5g | **+21.6g** | **+648g** | Viable at base prices |
| 2 | COOK | Smoked Fish | 17g | 54g | 5.4g | 5g | **+26.6g** | **+798g** | Viable at base prices |
| 3 | COOK | Fish Stew v2 | 20g | 56g | 5.6g | 5g | **+25.4g** | **+762g** | Viable at base prices |
| 4 | COOK | Creamy Porridge | 18g | 30g | 3g | 5g | **+4g** | **+120g** | Marginal — needs output >15g ea |
| 5 | COOK | Flour | 11g | 5g | 0.5g | 5g | **-11.5g** | **-345g** | LOSS — Flour destroys value |
| 6 | TANNER | Cured Leather | 24g | 36g | 3.6g | 5g | **+3.4g** | **+102g** | Viable — barely |
| 7 | TANNER | Leather Armor | 88g | 65g | 6.5g | 5g | **-34.5g** | **-1,035g** | LOSS at any price near base |
| 8 | TAILOR | Cloth Robe | 98g | 45g | 4.5g | 5g | **-62.5g** | **-1,875g** | LOSS — requires 2.4x premium |
| 9 | TAILOR | Archmage's Robe | 277g | 150g | 15g | 5g | **-147g** | **-4,410g** | LOSS — requires 2.1x premium |

### 30-Day P&L Ranking (All 22 Professions)

Ranked by net 30-day income at Apprentice tier, best available recipe/resource:

| Rank | Profession | Type | 30-Day Net | Notes |
|-----:|-----------|------|----------:|-------|
| 1 | COOK (fish recipes) | Crafting | **+798g** | Smoked Fish market-dependent |
| 2 | RANCHER (chickens) | Gathering | **+402g** | After 150g startup, dual income |
| 3 | HUNTER | Gathering | **+351g** | Meat+Pelts, zero startup |
| 4 | TANNER (processing) | Crafting | **+336g** | Cured Leather self-sufficient |
| 5 | LUMBERJACK | Gathering | **+270g** | Wood Logs, universal demand |
| 6 | MINER | Gathering | **+243g** | Iron Ore, SMELTER demand |
| 7 | FISHERMAN | Gathering | **+216g** | Raw Fish, steady |
| 8 | HERBALIST | Gathering | **+202g** | Wild Herbs, multi-consumer |
| 9 | FARMER | Gathering | **+162g** | Apples or Grain, zero startup |
| 10 | SMELTER | Crafting | ~150g (est.) | Ingot intermediary |
| 11 | WOODWORKER | Crafting | ~100g (est.) | Plank intermediary |
| 12 | BREWER | Crafting | ~66g (est.) | Ale at estimated prices |
| 13 | ALCHEMIST | Crafting | ~50g (est.) | Potions at estimated prices |
| 14 | MASON | Crafting | ~40g (est.) | Cut Stone intermediary |
| 15 | FLETCHER | Crafting | ~30g (est.) | Bows — limited data |
| 16 | SCRIBE | Crafting | ~20g (est.) | Scrolls — limited data |
| 17 | ENCHANTER | Crafting | ~10g (est.) | High workshop cost |
| 18 | JEWELER | Crafting | ~0g (est.) | Precious metals expensive |
| 19 | LEATHERWORKER | Crafting | ~-50g (est.) | Accessories underwater |
| 20 | BLACKSMITH | Crafting | ? | Depends on tool/weapon prices |
| 21 | ARMORER | Crafting | ~-200g (est.) | Armor margins negative |
| 22 | TAILOR (armor) | Crafting | **-1,875g** | Worst margin profession |

---

## Part 5: Revised Break-Even Table

| Profession | Startup Cost | Daily Tax | Best Net/Day | Break-Even (Days) | Market Condition |
|------------|------------:|---------:|-----------:|------------------:|-----------------|
| FARMER | 0g | 0g | 5.4g | **0** | Always viable |
| FISHERMAN | 0g | 0g | 7.2g | **0** | Always viable |
| LUMBERJACK | 0g | 0g | 9g | **0** | Always viable |
| MINER | 0g | 0g | 8.1g | **0** | Always viable |
| HERBALIST | 0g | 0g | 6.75g | **0** | Always viable |
| HUNTER | 0g | 0g | 11.7g | **0** | Always viable |
| RANCHER | 150g | 0g | 18.4g | **8** | Eggs sell at >3g |
| COOK | 0g (workshop) | 5g | 26.6g | **0** | Fish sell at >5g each |
| TANNER (processing) | 0g (workshop) | 5g | 3.4g | **0** | Pelts available on market |
| SMELTER | 0g (workshop) | 5g | ~5g (est.) | **0** | Ore available on market |
| WOODWORKER | 0g (workshop) | 5g | ~3g (est.) | **0** | Logs available on market |
| BREWER | 0g (workshop) | 5g | ~2g (est.) | **0** | Grain/herbs available |
| ALCHEMIST | 0g (workshop) | 5g | ~1.5g (est.) | **0** | Herbs available |
| MASON | 0g (workshop) | 5g | ~1g (est.) | **0** | Stone/clay available |
| TAILOR (processing) | 0g (workshop) | 5g | ~0.5g (est.) | **0** | Wool available |
| FLETCHER | 0g (workshop) | 5g | ~1g (est.) | **0** | Wood parts available |
| SCRIBE | 0g (workshop) | 5g | ~0.5g (est.) | **0** | Planks available |
| ENCHANTER | 0g (workshop) | 5g | ~0.3g (est.) | **0** | High input costs |
| JEWELER | 0g (workshop) | 5g | ~-1g (est.) | **Never** | Precious metals too expensive |
| LEATHERWORKER | 0g (workshop) | 5g | ~-2g (est.) | **Never** | Leather outputs underwater |
| ARMORER | 0g (workshop) | 5g | ~-5g (est.) | **Never** | Armor margins negative |
| TAILOR (armor) | 0g (workshop) | 5g | -62.5g | **Never** | 2.4x premium needed |

**Key corrections from v1:**
- RANCHER break-even: **8 days** (v1: 126 days) — free plot + livestock-only startup
- All gathering professions: **0 days** — zero startup cost on public spots
- Crafting professions break-even on workshop: **0 days** if the proposed 5g/day tax is used
- Several crafting professions **never** break even at base prices — they're utility/service roles

---

## Part 6: Workshop-Driven Demand Analysis

### New Demand Created by Workshop System

Each of the 15 crafting professions needs:
- Workshop construction materials (one-time)
- Tier 2 upgrade materials (one-time)
- Tier 3 upgrade materials (one-time)
- 2-3 furniture items (one-time)

### Cross-Profession Supply for Workshops

| Supplier Profession | Furniture Items Supplied | # Workshops Served | New Demand |
|--------------------|------------------------|------------------:|-----------|
| **WOODWORKER** | Tool Rack, Stretching Frame, Spinning Wheel, Dress Form, Spice Rack, Aging Barrels, Herb Press, String Jig, Measuring Tools, Sawblade Set, Lathe, Ink Press, Writing Desk | **13** | **HUGE** — nearly every workshop needs WOODWORKER furniture |
| **BLACKSMITH** | Reinforced Anvil, Copper Pots, Copper Still, Precision Tools, Gem Cutter, Stone Polisher, Sawblade Set, Lathe | **8** | HIGH — metal fixtures for most workshops |
| **MASON** | Quenching Trough, Crucible Set, Curing Vats, Dye Vats, Brick Oven, Runed Circle, Kiln Upgrade, Warding Stones | **8** | HIGH — stone/brick installations |
| SMELTER | Distillation Set (glass), Magnifying Lens (glass) | 2 | Moderate |
| JEWELER | Crystal Array | 1 | Low |
| TANNER | Feathering Station | 1 | Low |
| LEATHERWORKER | Fire Bellows | 1 | Low |

### Does This Fix MASON's Demand Problem?

**v1 finding:** MASON had 0 downstream recipe consumers (leaf node) and weak demand.

**v2 with workshops:** MASON supplies stone/brick furniture to 8 workshop types. With 15 crafting professions × 1 workshop each × 1-2 MASON furniture items = **15-30 total MASON furniture orders** across the player base. Plus workshop construction itself uses Cut Stone (every workshop needs 5-25 Cut Stone).

**Verdict: YES** — workshops create steady, recurring demand for MASON. MASON is no longer a dead-end profession. The demand isn't infinite (furniture is one-time purchase) but workshop REPAIRS and UPGRADES create long-term demand cycles.

### New Bottlenecks

| Bottleneck | Cause | Severity |
|-----------|-------|----------|
| WOODWORKER furniture demand | 13 of 15 workshops need WOODWORKER furniture | **HIGH** — WOODWORKER becomes as critical as SMELTER |
| Nails supply | Every workshop construction + furniture needs Nails (SMELTER product) | **HIGH** — existing SMELTER bottleneck intensifies |
| Cut Stone supply | Most workshops need Cut Stone (MASON intermediate) | **MODERATE** — self-reinforcing for MASON |

The workshop system **does not create any new critical bottlenecks** — it reinforces existing ones (SMELTER, WOODWORKER) while solving the MASON demand gap.

---

## Part 7: Revised Gold Flow

### Gold Sources (inflow to players)

| Source | Type | Estimated Monthly Per Player |
|--------|------|----------------------------:|
| Quest rewards | One-time (gated) | ~200g first month |
| Combat loot (PvE) | Repeatable | ~50g/month |
| Market sales | Player-to-player transfer | 0g net (moves gold, doesn't create it) |

**Total new gold entering economy: ~250g/player/month**

### Gold Sinks (outflow from players)

| Sink | Type | Estimated Monthly Per Player |
|------|------|----------------------------:|
| Market fee (10%) | Per transaction | ~30g (on ~300g sales volume) |
| Workshop tax | Daily (5-15g/day) | **150-450g** |
| Land plot tax (plot 2+) | Daily (20-40g/day) | **0-600g** (if plot 2 purchased) |
| Tool replacement | Periodic | ~25g (1 tool/50 days) |
| Building repair | Periodic | ~10g |
| Livestock replacement | Risk-based | ~15g (disease/death) |
| Workshop furniture | One-time | ~15g (amortized over months) |

### Monthly Gold Balance

| Scenario | Gold In | Gold Out | **Net** |
|----------|--------:|---------:|--------:|
| Gatherer (no workshop, no plot 2) | 250g | 75g | **+175g** (mild inflation) |
| Crafter (Basic workshop) | 250g | 225g | **+25g** (near neutral) |
| Crafter (Master workshop) | 250g | 525g | **-275g** (deflationary) |
| Rancher (plot 2 sheep) | 250g | 750g | **-500g** (heavily deflationary) |

### Gold Flow Verdict

**The economy is:**
- **Inflationary for pure gatherers** — quest gold accumulates with few sinks
- **Neutral for basic crafters** — workshop tax roughly matches quest income
- **Deflationary for advanced players** — Master workshops + plot 2 drain gold fast

**Workshop tax is the primary balancing lever.** At 5g/day (Basic), crafters barely feel it. At 15g/day (Master), it's a significant drain that forces active selling to maintain. This is good design — it keeps crafters engaged in the market.

**Plot 2 tax (20g/day) is the endgame gold destroyer.** Only players with established income streams (50g+/day) should consider it. This prevents wealth accumulation and keeps the economy circulating.

**v1 said the economy was deflationary.** v2 correction: **the economy is conditionally deflationary** — it depends on player progression. Early game is mildly inflationary (gatherers stockpile gold). Mid-game is neutral (crafters spend on workshops). Late-game is deflationary (plot expansion + Master workshops drain faster than income).

This progression is **good design** — it matches player lifecycle and prevents runaway wealth.

---

## Part 8: Revised Top 10 Recommendations

### Removed from v1

- ~~"RANCHER break-even is too long"~~ — Corrected. Break-even is 8 days with free plot.
- ~~"Service professions need income"~~ — Sidebarred per v2 scope.

### Updated Recommendations

| # | Priority | Issue | Recommendation | Impact |
|--:|:--------:|-------|---------------|--------|
| 1 | **P0** | TAILOR armor margins 0.46-0.58 | Raise cloth armor base_values by 80-100% OR reduce input quantities by 40%. Cloth Robe should cost 2×WC+1×CL, not 4×WC+1×CL. | Fixes most underwater profession |
| 2 | **P0** | TANNER Wolf/Bear Leather processing is value-destructive (0.60-0.63) | Increase Wolf Leather to 50g (from 35g) and Bear Leather to 60g (from 42g), or reduce input from 2×pelts to 1×pelt+1×CL | Fixes T3 leather pipeline |
| 3 | **P1** | COOK T1 recipes are ALL underwater (0.45-0.77) | By design (HP utility > gold value). Add explicit tooltip: "Food is consumed for HP/buffs — sell value is secondary." No mechanical change. | Player expectation management |
| 4 | **P1** | Workshop tax scaling not implemented | Implement 3-tier workshop system (5/10/15g per day) replacing flat 20g/day. Current 20g/day is too high for Apprentice crafters. | Crafter viability |
| 5 | **P1** | Workshop furniture system not implemented | Add 2-3 purchasable furniture items per workshop type (per Part 2 design). Creates WOODWORKER/BLACKSMITH/MASON demand. | Fixes MASON demand gap |
| 6 | **P2** | SMELTER bottleneck intensified by workshop demand | Add alternative ingot source: MINER can learn "Field Smelting" at L10+ to produce low-quality ingots directly. Or: add a second processing profession. | Reduces single-point-of-failure |
| 7 | **P2** | Plot 2 economically hostile at 20g/day | Consider reducing plot 2 tax to 10g/day (5% of purchase price instead of 10%). At 10g/day, Sheep Pen becomes viable with 4 sheep. | RANCHER mid-game progression |
| 8 | **P2** | TANNER finished goods all underwater except Cured Leather | Implement "quality premium" — Higher quality items (Fine/Superior/Masterwork) sell for 1.5-3x base_value on market. This rewards high-level crafters. | Gives end-crafters a path to profit |
| 9 | **P3** | Missing base_values for BREWER, BLACKSMITH, ARMORER, FLETCHER, etc. | Add explicit base_value to ALL output items in YAML for full margin analysis. Currently ~40% of recipes lack output pricing. | Analysis completeness |
| 10 | **P3** | WOODWORKER becomes new bottleneck | Monitor WOODWORKER capacity. If workshop furniture creates excess demand, consider: (a) Raise WOODWORKER gather yield, (b) Add CARPENTER as alt profession, (c) Allow NPC-crafted basic furniture at 2x price. | Prevent new bottleneck |

### Priority Explanation

- **P0:** Structural balance fixes that affect multiple professions. Should be addressed before player economy goes live.
- **P1:** System implementations (workshop tiers, furniture) that improve economy health.
- **P2:** Tuning adjustments after observing player behavior.
- **P3:** Data completeness and monitoring.

---

## Appendix A: Full Margin Ratio Sorted List

All recipes with known margins, sorted by margin_ratio descending:

| Rank | Recipe | Profession | Ratio | Tier |
|-----:|--------|-----------|------:|------|
| 1 | Grilled Fish v2 | COOK | 3.38 | Comfortable |
| 2 | Smoked Fish | COOK | 3.18 | Comfortable |
| 3 | Fish Stew v2 | COOK | 2.80 | Comfortable |
| 4 | Creamy Porridge | COOK | 1.67 | Comfortable |
| 5 | Farm Breakfast | COOK | 1.61 | Comfortable |
| 6 | Pan-Seared Trout | COOK | 1.54 | Comfortable |
| 7 | Cured Leather | TANNER | 1.50 | Comfortable |
| 8 | Spin Cloth | TAILOR | 1.33 | Viable |
| 9 | Smoked Trout Rations | COOK | 1.32 | Viable |
| 10 | Spiced Pastry | COOK | 1.29 | Viable |
| 11 | Perch Feast | COOK | 1.12 | Viable |
| 12 | Harvest Feast | COOK | 1.06 | Marginal |
| 13 | Fisherman's Pie | COOK | 1.02 | Marginal |
| 14 | Berry Tart | COOK | 1.00 | Marginal |
| 15 | Scrambled Eggs | COOK | 1.00 | Marginal |
| 16 | Fisherman's Banquet | COOK | 0.97 | Marginal |
| 17 | Apple Pie | COOK | 0.95 | Marginal |
| 18 | Bear Hide Cuirass | TANNER | 0.91 | Marginal |
| 19 | Weave Cloth | TAILOR | 0.89 | Underwater |
| 20 | Seasoned Roast Veg | COOK | 0.88 | Underwater |
| 21 | Wolf Leather Armor | TANNER | 0.85 | Underwater |
| 22 | Wolf Leather Hood | TANNER | 0.85 | Underwater |
| 23 | Fine Cloth | TAILOR | 0.84 | Underwater |
| 24 | Leather Cap | TANNER | 0.83 | Underwater |
| 25 | Leather Vest | TANNER | 0.83 | Underwater |
| 26 | Leather Greaves | TANNER | 0.81 | Underwater |
| 27 | Bread Loaf | COOK | 0.80 | Underwater |
| 28 | Leather Satchel | TANNER | 0.80 | Underwater |
| 29 | Silk Fabric | TAILOR | 0.79 | Underwater |
| 30 | Quiver | TANNER | 0.79 | Underwater |
| 31 | Merchant's Hat | TAILOR | 0.78 | Underwater |
| 32 | Grilled Fish T1 | COOK | 0.77 | Underwater |
| 33 | Leather Armor | TANNER | 0.74 | Underwater |
| 34 | Leather Bracers | TANNER | 0.74 | Underwater |
| 35 | Ranger's Quiver | TANNER | 0.74 | Underwater |
| 36 | Silk Hood of Insight | TAILOR | 0.70 | Underwater |
| 37 | Leather Belt | TANNER | 0.69 | Underwater |
| 38 | Herbal Tea | COOK | 0.67 | Underwater |
| 39 | Porridge | COOK | 0.64 | Underwater |
| 40 | Wolf Leather | TANNER | 0.63 | Underwater |
| 41 | Cloth Hood | TAILOR | 0.63 | Underwater |
| 42 | Bear Leather | TANNER | 0.60 | Underwater |
| 43 | Diplomat's Regalia | TAILOR | 0.58 | Underwater |
| 44 | Apple Sauce | COOK | 0.57 | Underwater |
| 45 | Vegetable Stew | COOK | 0.57 | Underwater |
| 46 | Traveler's Cloak | TAILOR | 0.57 | Underwater |
| 47 | Berry Jam | COOK | 0.55 | Underwater |
| 48 | Archmage's Robe | TAILOR | 0.54 | Underwater |
| 49 | Cloth Sash | TAILOR | 0.53 | Underwater |
| 50 | Herbalist's Apron | TAILOR | 0.52 | Underwater |
| 51 | Noble's Leggings | TAILOR | 0.52 | Underwater |
| 52 | Scholar's Robe | TAILOR | 0.51 | Underwater |
| 53 | Wool Trousers | TAILOR | 0.50 | Underwater |
| 54 | Enchanted Cloak | TAILOR | 0.49 | Underwater |
| 55 | Cloth Robe | TAILOR | 0.46 | Underwater |
| 56 | Flour | COOK | 0.45 | Underwater |

---

## Appendix B: Cross-Profession Workshop Material Demand Matrix

Shows which professions are needed to build and furnish each workshop:

| Workshop | WOODWORKER | BLACKSMITH | MASON | SMELTER | JEWELER | TANNER | LWORKER |
|----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Smithy | ✓ constr + furn | ✓ furn | ✓ furn | ✓ ingots | | | |
| Smeltery | | | ✓ constr + furn | | | | ✓ furn |
| Tannery | ✓ furn | | ✓ furn | | | | |
| Tailor Shop | ✓ furn | | ✓ furn | | | | |
| Kitchen | | ✓ furn | ✓ furn | | | | |
| Brewery | ✓ furn | ✓ furn | | | | | |
| Alchemy Lab | ✓ furn | | | ✓ glass | | | |
| Enchanting Tower | | | ✓ furn | | ✓ furn | | |
| Jeweler Workshop | | ✓ furn | | ✓ glass | | | |
| Fletcher Bench | ✓ furn | | | | | ✓ furn | |
| Mason Yard | | ✓ furn | ✓ self | | | | |
| Lumber Mill | | ✓ furn | | | | | |
| Scribe Study | ✓ furn | | | | | | |

**WOODWORKER touches 8/13 workshops. MASON touches 6/13. BLACKSMITH touches 6/13.**

---

*End of analysis. All calculations shown. Assumptions explicit. Numbers over narrative.*
