# Profession Economy Audit v4 — Post-Loot System, Full YAML Validation

**Generated:** 2026-02-20
**Basis:** `profession-economy-master.yaml` (primary), `tax-system-design.md`, `encounter-loot-design-phase1.md`, `profession-economy-analysis-v3.md` (reference)
**Scope:** All 29 professions — every number traced to YAML or explicitly flagged as estimated

---

## Part 1: Methodology

### How Numbers Are Derived

| Metric | Formula | Source |
|--------|---------|--------|
| **Daily gross income** | `output_qty × base_value` | YAML recipe outputs |
| **Daily net income** | `(output_qty × base_value × 0.9) - sum(input_qty × input_base_value)` | 10% marketplace transaction fee on sales |
| **Weekly income** | `daily net × 7` | 7 game days per week |
| **Weekly tax** | `total_assessed_value × combined_rate` | Tax design doc assessed values |
| **Net after tax** | `weekly income - weekly tax` | — |
| **Tax revolt rate** | `weekly_income / assessed_value` | Rate at which tax = income |
| **Encounter supplement** | `weekly_encounter_supply / weekly_gatherer_supply × 100%` | Encounter loot doc |

### Key Assumptions

1. **One daily action** — each profession performs one craft/gather per game day
2. **Market prices = base_value** — players buy/sell at YAML base_values (floor)
3. **10% transaction fee** on all marketplace sales (goes to town treasury)
4. **Average yield** for gathering: midpoint of yield range (e.g., yield 1-3 → avg 2)
5. **Tier yield bonuses** applied per YAML: Apprentice +0%, Journeyman +25%, Craftsman +50%
6. **Default tax rate: 7%** (5% town + 2% kingdom)

### Data Quality Declaration

**YAML has full recipe details (inputs, outputs, base_values) for:**
- All 7 gathering resources (Section 1)
- COOK: 25 recipes (Section 4)
- TANNER: 15 recipes (Section 4B)
- TAILOR: 17 recipes (Section 4C)
- BREWER: 9 recipes (inputs/outputs listed, but NO output base_values)
- SMELTER: 11 recipes (inputs/outputs listed, but NO output base_values)

**YAML has recipe IDs only (no input costs or output base_values) for:**
BLACKSMITH, ARMORER, WOODWORKER, LEATHERWORKER, ALCHEMIST, ENCHANTER, JEWELER, FLETCHER, MASON, SCRIBE

**~40% of crafting professions lack derivable margins from YAML.** Where YAML data is absent, v3 estimates are carried forward and marked with `~` (estimated). This is itself a finding — the YAML needs output base_values for all recipes before any recipe rebalancing can be data-driven.

### Missing Material Base Values

These materials are consumed by recipes but have no `base_value` in YAML Section 1:

| Material | Used By | Estimated Value | Basis |
|----------|---------|:-:|-------|
| Grain | COOK, BREWER, RANCHER | ~3g | Inferred: FARMER field income ~5.4g/day = avg_yield(2) × 3g × 0.9 |
| Vegetables | COOK | ~3g | Same logic as Grain |
| Wild Berries | COOK, BREWER | ~3g | FARMER berry field income ~3.6g/day suggests ~2-3g |
| Eggs | COOK | ~5g | Inferred: Scrambled Eggs economics (3×Eggs → 24g output) |
| Milk | COOK | ~6g | Inferred: Creamy Porridge economics (2×Grain + 1×Milk → 30g output) |
| Wool | TAILOR | ~15g | Not in YAML; v3 estimate. Woven Cloth (20g) from 3×Wool implies Wool < 13.3g for value-add |
| Cotton | TAILOR | ~4g | Encounter loot doc references "~4g"; FARMER cotton_field daily ~5.4g |
| Copper Ore | SMELTER | ~4g | Not in YAML; estimated |
| Iron Ore Chunks | SMELTER, BLACKSMITH | ~4g | Not in YAML; cheaper form of Iron Ore (6g) |
| Hops | BREWER | ~5g | Not in YAML; FARMER Craftsman asset |
| Grapes | BREWER | ~4g | Not in YAML; FARMER Craftsman asset |

---

## Part 2: Per-Profession Deep Dive

---

### 2.1 FARMER (Gathering)

**Tier unlocks:** Apprentice (orchard/grain/veg), Journeyman (+25%), Craftsman (hop/vineyard, +50%), Expert (cotton/flax, +75%)

**A. Income Analysis**

| Activity | Level | Yield/Day | Value/Unit | Gross | Net (×0.9) | Daily Net |
|----------|:-----:|:---------:|:----------:|------:|:----------:|:---------:|
| Orchard (Apple) | 3+ | 2 avg | 3g | 6g | 5.4g | **5.4g** |
| Grain Field (private) | 3+ | 2 avg | ~3g | 6g | 5.4g | **5.4g** |
| Vegetable Patch (private) | 3+ | 2 avg | ~3g | 6g | 5.4g | **5.4g** |
| Berry Field (private) | 5+ | 2 avg | ~3g | 6g | 5.4g | **~5.4g** |
| Orchard (Journeyman, +25%) | 5+ | 2.5 | 3g | 7.5g | 6.75g | **6.75g** |
| Cotton Field (Expert, +75%) | 9+ | ~2.6 | ~4g | 10.4g | 9.4g | **~9.4g** |

Best daily (public, Apprentice): **5.4g/day → 37.8g/week**
Best daily (private field, Journeyman+): **6.75g/day → 47.3g/week** (not counting field income)
With 1 private field + gathering: ~10.8g/day → **75.6g/week**

**B. Property & Tax**

| Profile | Assessed | Tax 5% | Tax 7% | Tax 13% | Tax 30% |
|---------|--------:|-------:|-------:|--------:|--------:|
| Public only (Cottage) | 25g | 1.3g | 1.8g | 3.3g | 7.5g |
| Plot 1 + Grain Field | 150g | 7.5g | 10.5g | 19.5g | 45g |
| Plot 1+2 + 2 Fields | 425g | 21.3g | 29.8g | 55.3g | 127.5g |

Tax revolt rate (public): >151% — **Tax-immune**
Tax revolt rate (1 plot): 75.6/150 = 50.4% — revolt at 50%+

**C. Encounter Loot Benefit**

Minimal — FARMER resources (Grain, Cotton) appear in encounter drops at <7% supplement. Bandit stolen goods include Cotton at ~4.5 units/week server-wide (6.4% of FARMER cotton output). **Negligible impact.**

**D. Viability Verdict: VIABLE (Tax-immune on public spots; Viable with assets)**

Math: 37.8g/week - 1.8g tax = **36.0g/week** (public). 75.6g - 10.5g = **65.1g/week** (1 plot). Healthy at all tax rates below revolt threshold.

---

### 2.2 RANCHER (Gathering — Asset-Based)

**A. Income Analysis (from YAML livestock data)**

| Building | Animals | Daily Product | Est. Daily Income | Feed Cost/Day |
|----------|--------:|:------------:|:-:|:-:|
| Chicken Coop (cap 5) | 5 chickens | ~2.5 Eggs/day | ~13g | ~1.7 Grain (~5g) |
| Dairy Barn (cap 3) | 3 cows | ~3 Milk/day | ~6g | ~2 Grain (~6g) |
| Sheep Pen (cap 4) | 4 sheep | ~4 Wool/day | ~16g | ~1.3 Grain (~4g) |
| Silkworm House | auto | ~1 Cocoons/3 days | ~12.7g | 0g |

*Note: Livestock produce every 3 ticks. Daily values are averaged. Feed: 1 Grain per animal per 3 ticks. Income values from tax design doc.*

Weekly income estimates:
- 1 Chicken Coop: ~91g/week (13g × 7)
- Add Sheep Pen: ~91 + 112 = ~203g/week
- Full operation (3 plots): ~315g/week (tax doc estimate)

**B. Property & Tax**

| Profile | Assessed | Tax 7% | Tax as % Income |
|---------|--------:|-------:|:-:|
| Plot 1 + Chicken Coop | 225g | 15.8g | 12.2% |
| Plot 1+2 + Coop + Sheep | 650g | 45.5g | 22.4% |
| 3 plots, full operation | ~1,275g | 89.3g | 28.4% |

Tax revolt rate (1 plot): 128.8/225 = **57%**
Tax revolt rate (3 plots): 315/1275 = **25%**

**C. Encounter Loot: None** — RANCHER produces from buildings, not from encounters.

**D. Viability Verdict: VIABLE**

Most tax-sensitive gathering profession due to high assessed values. Multi-plot RANCHERs are the #1 political pressure point. But income is strong enough to survive even max tax.

---

### 2.3 FISHERMAN (Gathering)

**A. Income Analysis (YAML-confirmed)**

| Tier | Level | Resources | Avg Value/Unit | Yield | Daily Net |
|------|:-----:|-----------|:-:|:-:|:-:|
| Apprentice | 3-4 | Raw Fish (4g) | 4g | 2 | **7.2g** |
| Journeyman | 5-6 | Raw Fish (4g) | 4g | 2.5 | **9.0g** |
| Craftsman | 7-8 | 30% Raw Fish, 35% River Trout (22g), 35% Lake Perch (25g) | 17.65g | 3 | **47.7g** |

*Craftsman calculation: 3 × 17.65g × 0.9 = 47.7g/day → 333.6g/week*

**Critical v3 discrepancy:** v3 lists FISHERMAN at 50.4g/week (7.2g/day). This is the **Apprentice-only** income. A Craftsman FISHERMAN earning 333.6g/week would be the highest earner in the game. v3 does not account for tier scaling.

**B. Tax: Cottage only (25g assessed)**

Tax at 7%: 1.8g/week. Tax-immune at any tier.

**C. Encounter Loot: None** — Fish don't drop from encounters.

**D. Viability Verdict: VIABLE (Tax-immune)**

At Apprentice: 48.7g/week net. At Craftsman: 331.8g/week net — massively overperforming if tiered resources are implemented. **This needs validation: are Craftsman fishing spots actually live and working?**

---

### 2.4 LUMBERJACK (Gathering)

**A. Income (YAML-confirmed)**

| Tier | Resources | Value | Yield | Daily Net |
|------|-----------|:-----:|:-----:|:---------:|
| Apprentice | Wood Logs (5g) | 5g | 2 | **9.0g** |
| Journeyman | + Hardwood (25g, asset) | 25g | 2.5 | **~31.3g** (if Hardwood gathered) |

Apprentice weekly: 9.0 × 7 = **63.0g/week** ✓ (matches v3)
Journeyman (Hardwood): much higher if asset available.

**B. Tax:** 25g assessed (cottage). Tax-immune.
**C. Encounter Loot:** Wood doesn't drop from encounters.
**D. Verdict: VIABLE (Tax-immune)**

---

### 2.5 MINER (Gathering)

**A. Income (YAML-confirmed)**

| Tier | Resources | Value | Yield | Daily Net |
|------|-----------|:-----:|:-----:|:---------:|
| Apprentice (mine) | Iron Ore (6g) | 6g | 1.5 avg | **8.1g** |
| Apprentice (quarry) | Stone Blocks (7g) | 7g | 1.5 | **9.45g** |
| Apprentice (clay_pit) | Clay (4g) | 4g | 2 | **7.2g** |
| Journeyman (coal_mine, asset) | Coal (12g) | 12g | 1.5 | **16.2g** |
| Craftsman (silver_mine, asset) | Silver Ore (30g) | 30g | 1.5 | **40.5g** |

Best Apprentice daily: 9.45g (quarry) → **66.2g/week**
With Coal mine: 16.2g/day → **113.4g/week**
With Silver mine: 40.5g/day → **283.5g/week**

**v3 used 8.1g/day (56.7g/week)** — this is Iron Ore at mine, the most common spot. v3 did not account for quarry (higher) or asset mines.

**B. Tax:** 25g cottage (public) or +100g for Mine Claim. Tax-immune.
**C. Encounter Loot:** Iron Ore from encounters: ~11.9/week (7.1% supplement). Negligible.
**D. Verdict: VIABLE (Tax-immune)**

---

### 2.6 HERBALIST (Gathering)

**A. Income (YAML-confirmed)**

| Tier | Resources | Value | Yield | Daily Net |
|------|-----------|:-----:|:-----:|:---------:|
| Apprentice | Wild Herbs (5g) | 5g | 1.5 avg | **6.75g** |
| Journeyman | Wild Herbs (5g) | 5g | 1.88 | **8.44g** |
| Craftsman | 30% Herbs (5g), 35% Medicinal (28g), 35% Glowcap (32g) | 22.5g avg | 2.25 | **45.6g** |

*Craftsman: 2.25 × 22.5g × 0.9 = 45.6g/day → 319.0g/week*

**Another v3 discrepancy:** v3 lists HERBALIST at 47.3g/week (Apprentice). Craftsman income is **6.7× higher** — similar to FISHERMAN scaling issue.

**B. Tax:** 25g cottage or +80g herb garden. Tax-immune.
**C. Encounter Loot:** None directly (herbs don't drop from encounters).
**D. Verdict: VIABLE (Tax-immune)**

---

### 2.7 HUNTER (Gathering)

**A. Income (YAML-confirmed)**

| Tier | Resources | Avg Value | Yield | Daily Net |
|------|-----------|:---------:|:-----:|:---------:|
| Apprentice | Game Meat (5g) + Animal Pelts (8g) | ~6.5g avg | 2 | **11.7g** |
| Craftsman | 40% Meat, 20% Pelts, 20% Wolf Pelts (28g), 20% Bear Hides (35g) | 17.6g avg | 3 | **47.5g** |

*Craftsman: 3 × 17.6g × 0.9 = 47.5g/day → 332.5g/week*

v3 listed HUNTER at 81.9g/week (11.7g/day) — Apprentice level only.

**B. Tax:** 25g cottage. Tax-immune.
**C. Encounter Loot:** Animal Pelts from encounters: ~26.5/week (12.6% supplement). Slight price pressure but HUNTER still dominant. Wolf Pelts: 3.6/week (14.4%). Bear Hides: 2.1/week (14.0%). All within safe 5-15% range.
**D. Verdict: VIABLE (Tax-immune). Highest Apprentice-level gatherer.**

---

### 2.8 COOK (Crafting)

**A. Income Analysis — ALL 25 Recipes (YAML-confirmed)**

**Tier 1: Apprentice (L3-4)**

| Recipe | Inputs (cost) | Output (qty × value) | Net per Craft |
|--------|--------------|---------------------|:------------:|
| Flour | 2×Grain(~6g) + 1×Wood(5g) = 11g | 1× Flour (5g) → 4.5g | **-6.5g** |
| Apple Sauce | 3×Apple(9g) + 1×Wood(5g) = 14g | 1× (8g) → 7.2g | **-6.8g** |
| Porridge | 2×Grain(~6g) + 1×Wood(5g) = 11g | 1× (7g) → 6.3g | **-4.7g** |
| Berry Jam | 3×Berries(~9g) + 1×Wood(5g) = 14g | 1× (6g) → 5.4g | **-8.6g** |
| Grilled Fish (T1) | 2×Raw Fish(8g) + 1×Wood(5g) = 13g | 1× (10g) → 9g | **-4g** |
| Herbal Tea | 2×Herbs(10g) + 1×Wood(5g) = 15g | 1× (10g) → 9g | **-6g** |
| Vegetable Stew | 3×Veg(~9g) + 1×Wood(5g) = 14g | 1× (8g) → 7.2g | **-6.8g** |
| Scrambled Eggs | 3×Eggs(~15g) | 2× (12g) → 21.6g | **+6.6g** |
| Creamy Porridge | 2×Grain(~6g) + 1×Milk(~6g) = 12g | 2× (15g) → 27g | **+15g** |

*T1 verdict: Most T1 recipes are money-losers. Their value is HP restoration, not resale. Scrambled Eggs and Creamy Porridge are profitable because livestock inputs have favorable ratios.*

**Tier 2: Journeyman (L5-6)**

| Recipe | Inputs (cost) | Output (qty × value) | Net per Craft |
|--------|--------------|---------------------|:------------:|
| Bread Loaf | 2×Flour(10g) + 1×Wood(5g) = 15g | 1× (12g) → 10.8g | **-4.2g** |
| Apple Pie | 1×Flour(5g) + 3×Apple(9g) + 1×Wood(5g) = 19g | 1× (18g) → 16.2g | **-2.8g** |
| Grilled Fish v2 | 2×Raw Fish(8g) + 1×Herbs(5g) = 13g | **2×** (22g) → 39.6g | **+26.6g** |
| Fish Stew v2 | 3×Raw Fish(12g) + 1×Grain(~3g) + 1×Herbs(5g) = 20g | **2×** (28g) → 50.4g | **+30.4g** |
| Smoked Fish | 3×Raw Fish(12g) + 1×Wood(5g) = 17g | **3×** (18g) → 48.6g | **+31.6g** |
| Seasoned Roast Veg | 2×Veg(~6g) + 1×Herbs(5g) + 1×Wood(5g) = 16g | 1× (14g) → 12.6g | **-3.4g** |
| Berry Tart | 1×Flour(5g) + 1×Berry Jam(6g) + 1×Wood(5g) = 16g | 1× (16g) → 14.4g | **-1.6g** |
| Farm Breakfast | 2×Eggs(~10g) + 1×Milk(~6g) + 1×Grain(~3g) = 19g | **2×** (25g) → 45g | **+26g** |

*T2 verdict: Fish recipes are COOK's goldmine. Smoked Fish is the single best recipe (+31.6g/day). Livestock recipes also strong. Land-based T2 recipes (Bread, Pie, Tart) are slight losses.*

**Tier 3: Craftsman (L7-8)**

| Recipe | Inputs (cost) | Output (qty × value) | Net per Craft |
|--------|--------------|---------------------|:------------:|
| Harvest Feast | 1×Bread(12g) + 2×Apple(6g) + 2×Herbs(10g) + 1×Wood(5g) = 33g | 1× (35g) → 31.5g | **-1.5g** |
| Fisherman's Banquet | 1×Grilled Fish(10g) + 1×Bread(12g) + 1×Berry Jam(6g) + 1×Wood(5g) = 33g | 1× (32g) → 28.8g | **-4.2g** |
| Spiced Pastry | 2×Flour(10g) + 2×Herbs(10g) + 1×Berry Jam(6g) + 1×Wood(5g) = 31g | 1× (40g) → 36g | **+5g** |
| Pan-Seared Trout | 2×River Trout(44g) + 1×Herbs(5g) + 1×Apple(3g) = 52g | **2×** (40g) → 72g | **+20g** |
| Perch Feast | 3×Lake Perch(75g) + 2×Grain(~6g) + 1×Herbs(5g) = 86g | **2×** (48g) → 86.4g | **+0.4g** |
| Fisherman's Pie | 2×Trout(44g) + 2×Perch(50g) + 2×Grain(~6g) + 1×Eggs(~5g) = 105g | **2×** (55g) → 99g | **-6g** |
| Smoked Trout Rations | 3×River Trout(66g) + 2×Wood(10g) = 76g | **4×** (25g) → 90g | **+14g** |

*T3 verdict: Premium fish recipes have high gross values but thin or negative margins because River Trout (22g) and Lake Perch (25g) are expensive inputs. Smoked Fish (T2) remains the best recipe overall.*

**Daily Income Summary:**

| Scenario | Recipe | Daily Net | Weekly |
|----------|--------|:---------:|:------:|
| Best | Smoked Fish | **31.6g** | **221.2g** |
| 2nd best | Fish Stew v2 | 30.4g | 212.8g |
| 3rd best | Grilled Fish v2 | 26.6g | 186.2g |
| Realistic mix (T2 avg) | Mix of fish recipes | ~28g | ~196g |
| Worst viable | Spiced Pastry | 5g | 35g |
| Worst overall | Berry Jam | -8.6g | -60.2g |

**B. Property & Tax**

| Config | Assessed | Tax 7% | Tax % of Income | Revolt Rate |
|--------|--------:|-------:|:-:|:-:|
| Cottage + Workshop T1 | 125g | 8.8g | 4.0% | 177% |
| Cottage + Workshop T3 | 375g | 26.3g | 11.9% | 59% |

**C. Encounter Loot:** None meaningful — COOK ingredients don't drop from encounters (except small amounts of Wild Game Meat for a few recipes).

**D. Viability Verdict: VIABLE — #1 earner by a wide margin**

221.2g/week pre-tax. 212.5g/week net at 7%. Survives max 30% tax (183.7g net). v3 number confirmed — Smoked Fish +31.6g/day is YAML-verified.

---

### 2.9 TANNER (Crafting)

**A. Income Analysis — ALL 15 Recipes (YAML-confirmed)**

**Processing Recipes:**

| Recipe | Inputs (cost) | Output | Net per Craft | Verdict |
|--------|--------------|--------|:------------:|---------|
| Cured Leather | 3×Animal Pelts (24g) | 2×Cured Leather (36g→32.4g) | **+8.4g** | Profitable |
| Wolf Leather | 2×Wolf Pelts (56g) | 1×Wolf Leather (35g→31.5g) | **-24.5g** | VALUE-DESTRUCTIVE |
| Bear Leather | 2×Bear Hides (70g) | 1×Bear Leather (42g→37.8g) | **-32.2g** | VALUE-DESTRUCTIVE |

**v4 FINDING: Wolf Leather and Bear Leather processing DESTROYS value.** Raw Wolf Pelts (28g each) are worth more than the processed Wolf Leather (35g for 2 pelts = 17.5g/pelt equivalent). This means TANNERs should sell Wolf Pelts and Bear Hides raw rather than processing them — which defeats the purpose of the profession at Craftsman tier.

**Finished Goods (ALL are losses):**

| Recipe | Input Cost | Output Value | Net | Margin Ratio |
|--------|----------:|:----------:|:---:|:----------:|
| Leather Cap | 36g | 27g | **-9g** | 0.75 |
| Leather Satchel | 44g | 31.5g | **-12.5g** | 0.72 |
| Leather Vest | 54g | 40.5g | **-13.5g** | 0.75 |
| Leather Belt | 36g | 22.5g | **-13.5g** | 0.63 |
| Leather Armor | 88g | 58.5g | **-29.5g** | 0.66 |
| Leather Bracers | 54g | 36g | **-18g** | 0.67 |
| Leather Greaves | 62g | 45g | **-17g** | 0.73 |
| Quiver | 70g | 49.5g | **-20.5g** | 0.71 |
| Wolf Leather Armor | 141g | 108g | **-33g** | 0.77 |
| Wolf Leather Hood | 88g | 67.5g | **-20.5g** | 0.77 |
| Bear Hide Cuirass | 170g | 139.5g | **-30.5g** | 0.82 |
| Ranger's Quiver | 141g | 94.5g | **-46.5g** | 0.67 |

**v4 FINDING: ALL 12 TANNER finished goods are losses.** Margin ratios range from 0.63 to 0.82 (need >1.11 to break even after 10% fee). This is a new finding — v3 only flagged ARMORER and TAILOR armor as underwater. TANNER finished goods have the same structural problem.

**Daily Income:** Best recipe = Cured Leather at +8.4g/day → **58.8g/week** ✓ (matches v3)

**B. Property & Tax**

| Config | Assessed | Tax 7% | Tax % | Revolt Rate |
|--------|--------:|-------:|:-----:|:-----------:|
| Cottage + Workshop T1 | 125g | 8.8g | 14.9% | 47% |
| Cottage + Workshop T3 | 375g | 26.3g | 44.7% | 16% |

**C. Encounter Loot Benefit**

Animal Pelts from encounters: ~26.5/week (12.6% of HUNTER output). If TANNER obtains pelts from encounters instead of buying at market:
- 26.5 pelts × 8g = 212g/week server-wide saved on inputs
- Per TANNER (~5 active): ~4.2g/week saved (5% income improvement)
- **Modest benefit.** Doesn't change viability.

**D. Viability Verdict: VIABLE (processing only) / UNDERWATER (finished goods)**

TANNER is only viable as a processing intermediary selling Cured Leather. The entire finished goods tree is underwater. **This is a P0 finding that v3 missed** — v3 rated TANNER as "Viable" without examining individual finished goods margins.

---

### 2.10 TAILOR (Crafting)

**A. Income Analysis — ALL 17 Recipes (YAML-confirmed)**

**Processing Recipes:**

| Recipe | Inputs (cost) | Output | Net per Craft | Verdict |
|--------|--------------|--------|:------------:|---------|
| Spin Cloth | 3×Cotton (~12g) | 2×Cloth (16g→14.4g) | **+2.4g** | Barely profitable |
| Weave Cloth | 3×Wool (~45g) | 2×Woven Cloth (40g→36g) | **-9g** | VALUE-DESTRUCTIVE |
| Weave Fine Cloth | 3×Fine Wool (90g) | 2×Fine Cloth (76g→68.4g) | **-21.6g** | VALUE-DESTRUCTIVE |
| Process Silk | 3×Silkworm Cocoons (114g) | 2×Silk Fabric (90g→81g) | **-33g** | VALUE-DESTRUCTIVE |

**v4 FINDING: 3 of 4 TAILOR processing recipes are value-destructive.** Only Spin Cloth (Cotton→Cloth) is marginally profitable. This is catastrophic — the Woven Cloth intermediate that ALL TAILOR armor needs is itself a money-loser.

**Armor Recipes (ALL deeply underwater):**

| Recipe | Input Cost | Output Value | Net | Ratio |
|--------|----------:|:----------:|:---:|:-----:|
| Cloth Hood | 2×WC (40g) | 25g → 22.5g | **-17.5g** | 0.56 |
| Cloth Sash | 1×WC (20g) + 1×CL (18g) = 38g | 20g → 18g | **-20g** | 0.47 |
| Cloth Robe | 4×WC (80g) + 1×CL (18g) = 98g | 45g → 40.5g | **-57.5g** | 0.41 |
| Wool Trousers | 3×WC (60g) | 30g → 27g | **-33g** | 0.45 |
| Scholar's Robe | 5×WC (100g) + 2×CL (36g) = 136g | 70g → 63g | **-73g** | 0.46 |
| Traveler's Cloak | 3×WC (60g) + 2×CL (36g) = 96g | 55g → 49.5g | **-46.5g** | 0.52 |
| Merchant's Hat | 2×WC (40g) + 1×CL (18g) = 58g | 45g → 40.5g | **-17.5g** | 0.70 |
| Herbalist's Apron | 3×WC (60g) + 2×CL (36g) = 96g | 50g → 45g | **-51g** | 0.47 |
| Archmage's Robe | 4×FC (152g) + 2×SF (90g) + 1×WL (35g) = 277g | 150g → 135g | **-142g** | 0.49 |
| Diplomat's Regalia | 3×SF (135g) + 2×FC (76g) + 1×Silver (30g) = 241g | 140g → 126g | **-115g** | 0.52 |
| Silk Hood of Insight | 2×SF (90g) + 1×FC (38g) = 128g | 90g → 81g | **-47g** | 0.63 |
| Noble's Leggings | 3×FC (114g) + 2×WL (70g) = 184g | 95g → 85.5g | **-98.5g** | 0.46 |
| Enchanted Cloak | 3×SF (135g) + 3×FC (114g) + 2×BL (84g) + 1×Glowcap (32g) = 365g | 180g → 162g | **-203g** | 0.44 |

*WC=Woven Cloth (20g), CL=Cured Leather (18g), FC=Fine Cloth (38g), SF=Silk Fabric (45g), WL=Wolf Leather (35g), BL=Bear Leather (42g)*

**The Enchanted Cloak costs 365g in materials and sells for 162g — a 203g loss per craft.** This is the single worst recipe in the game.

Note: These armor input costs use market-price intermediates. If TAILOR makes their own Woven Cloth, the raw cost is even higher (3×Wool per 2×WC = 22.5g per WC vs 20g market price).

**Daily Income:** Spin Cloth at +2.4g/day → **16.8g/week**

**v3 discrepancy:** v3 listed TAILOR (processing) at 38.5g/week. Re-deriving from YAML gives only 16.8g/week. The difference: v3 added back 5g/day old tax to v2's 0.5g/day estimate, giving 5.5g/day. My YAML derivation gives 2.4g/day. **v3 overestimated TAILOR income by ~2.3×.** This likely stems from v2 using a lower Cotton price (~2g vs ~4g).

**B. Property & Tax**

| Config | Assessed | Tax 7% | Tax % of 16.8g/week |
|--------|--------:|-------:|:---:|
| Cottage + Workshop T1 | 125g | 8.8g | **52%** |

Tax revolt rate: 16.8/125 = **13.4%** — Tax-fragile.

**C. Encounter Loot Benefit**

Spider Silk (~9 units/week server-wide at 6g each) provides a free Cotton-equivalent fiber. If TAILOR loots Spider Silk personally: 3×Spider Silk (0g) → 2×Cloth → output 14.4g. **Full 14.4g profit** vs 2.4g profit when buying Cotton. This is a significant improvement for TAILOR who fights spiders, but depends on personal encounter luck.

Stolen Cotton from Goblins: ~4.5/week server-wide. Minor supplement.

**D. Viability Verdict: MARGINAL (processing) / DEEPLY UNDERWATER (armor)**

Revised down from v3's "Viable" to **Marginal** based on YAML-derived income (16.8g/week, not 38.5g). Tax consumes 52% of income at default 7%. Armor recipes are the worst in the game. **TAILOR is in worse shape than v3 reported.**

---

### 2.11 SMELTER (Crafting)

**A. Income Analysis**

YAML lists 11 recipes with inputs/outputs but **NO output base_values** for any ingot:

| Recipe | Level | Inputs | Output | Base Value |
|--------|:-----:|--------|--------|:----------:|
| Smelt Copper | 1 | 3×Copper Ore + 1×Coal | 2×Copper Ingot | **MISSING** |
| Smelt Iron (chunks) | 3 | 4×Iron Ore Chunks + 2×Coal | 1×Iron Ingot | **MISSING** |
| Forge Nails | 5 | 1×Copper Ingot | 50×Nails | **MISSING** |
| Forge Iron Fittings | 8 | 3×Iron Ore Chunks + 1×Coal | 4×Iron Fittings | **MISSING** |
| Smelt Iron | 10 | 3×Iron Ore + 2×Coal | 2×Iron Ingot | **MISSING** |
| Smelt Glass | 15 | 5×Silite Sand | 3×Glass | **MISSING** |
| Smelt Silver | 20 | 3×Silver Ore + 1×Coal | 2×Silver Ingot | **MISSING** |
| Smelt Gold | 25 | 3×Gold Ore + 1×Coal | 1×Gold Ingot | **MISSING** |
| Smelt Steel | 30 | 2×Iron Ingot + 3×Coal | 1×Steel Ingot | **MISSING** |
| Smelt Mithril | 55 | 5×Mithril Ore + 3×Coal | 1×Mithril Ingot | **MISSING** |
| Smelt Adamantine | 75 | 8×Adamantine Ore + 5×Coal + 1×Arcane Reagents | 1×Adamantine Ingot | **MISSING** |

**Cannot derive SMELTER margins from YAML.** Using v3 estimate: ~10g/day → **70g/week** (~estimated).

**B. Tax:** 125g assessed → 8.8g/week at 7% → ~12.5% of income
**C. Encounter Loot:** Iron Ore from encounters (7.1% supplement) reduces input costs slightly.
**D. Verdict: ~VIABLE (estimated, not YAML-confirmed)**

---

### 2.12 BLACKSMITH (Crafting)

**A. Income:** YAML lists 28 recipes (recipe IDs only, no base_values). Has 3 specializations at L7 (Toolsmith, Weaponsmith, Armorer). **Cannot derive margins from YAML.** v3 estimate: ~10g/day → **70g/week** (~estimated).

**B. Tax:** 125g → 8.8g/week (12.5%)
**C. Encounter Loot:** Iron Ore supplement (7.1%), Hardwood/Coal not from encounters.
**D. Verdict: ~VIABLE (estimated)**

---

### 2.13 ARMORER (Crafting)

**A. Income:** YAML lists 25 recipes (5 per tier, all recipe IDs only). No output base_values. Depends on SMELTER ingots + TANNER leather.

v3 assessed ARMORER at ~0g/week pre-tax income (deeply negative margins). ARMORER shares the same structural problem as TANNER finished goods and TAILOR armor — output base_value < input cost.

**B. Tax:** 125g → 8.8g/week → >100% of income
**C. Encounter Loot:** Bear Hides from encounters (~2.1/week, 14% supplement) → ~1 extra Bear Leather/week via TANNER. Minor input cost reduction (~42g saved/week server-wide). **Does NOT fix the fundamental margin problem.**
**D. Verdict: UNDERWATER — needs recipe rebalance or commission system**

---

### 2.14 WOODWORKER (Crafting)

**A. Income:** YAML lists 25 recipes (11 processing + 14 finished goods). Recipe IDs only. No output base_values.

v3 estimate: ~8.3g/day → **58.3g/week** (~estimated).

Likely viable as a processing intermediary (Planks, Dowels, Handles, Frames — all consumed by FLETCHER, LEATHERWORKER, MASON). Similar economic structure to TANNER (processing profitable, finished goods possibly underwater).

**B. Tax:** 125g → 8.8g/week (15.0%)
**C. Encounter Loot:** None — wood doesn't drop from encounters.
**D. Verdict: ~VIABLE (estimated, processing-focused)**

---

### 2.15 LEATHERWORKER (Crafting)

**A. Income:** YAML lists 13 recipes (recipe IDs only). Depends on TANNER (Cured/Wolf/Bear Leather) + WOODWORKER (Wooden Frame, Handle, Nails).

v3 estimate: ~3g/day → **21g/week** (~estimated). Marginal.

**B. Tax:** 125g → 8.8g/week (41.8% of income)
**C. Encounter Loot:** Animal Pelts (12.6% supplement) indirectly reduce leather prices.
**D. Verdict: ~MARGINAL (estimated). Tax is 42% of income — survives at 7% but fragile.**

---

### 2.16 ALCHEMIST (Crafting)

**A. Income:** YAML lists 11 recipes across 3 tiers (names only). Depends on HERBALIST (Wild Herbs, Medicinal Herbs, Glowcap Mushrooms), FARMER (Wild Berries), MINER (Clay).

v3 estimate: ~6.7g/day → **46.7g/week** (~estimated).

**B. Tax:** 125g → 8.8g/week (18.8%)
**C. Encounter Loot:** Spider Venom (~2.9/week at 12g) and Rat Tail (~1.5/week at 2g) are new encounter-exclusive ingredients. These enable future recipes but don't affect current income.
**D. Verdict: ~VIABLE (estimated)**

---

### 2.17 BREWER (Crafting)

**A. Income Analysis (Partial YAML)**

YAML lists 9 recipes with inputs/outputs but **NO output base_values**:

| Recipe | Level | Inputs | Output | Base Value |
|--------|:-----:|--------|--------|:----------:|
| Ale | 3 | 3×Grain | 2×Ale | **MISSING** |
| Apple Cider | 3 | 3×Apples | 2×Apple Cider | **MISSING** |
| Berry Cordial | 4 | 3×Berries + 1×Grain | 2×Berry Cordial | **MISSING** |
| Strong Ale | 5 | 4×Grain + 1×Herbs | 2×Strong Ale | **MISSING** |
| Mulled Cider | 5 | 3×Apples + 2×Herbs | 2×Mulled Cider | **MISSING** |
| Herbal Brew | 6 | 3×Herbs + 2×Grain | 2×Herbal Brew | **MISSING** |
| Hopped Beer | 7 | 3×Grain + 2×Hops | 2×Hopped Beer | **MISSING** |
| Grape Wine | 7 | 4×Grapes | 2×Grape Wine | **MISSING** |
| Pale Ale | 8 | 3×Grain + 2×Hops + 1×Herbs | 2×Pale Ale | **MISSING** |

v3 estimate: ~7.2g/day → **50.4g/week** (~estimated).

**B. Tax:** 125g → 8.8g/week (17.4%)
**C. Encounter Loot:** None.
**D. Verdict: ~VIABLE (estimated, but income not YAML-confirmed)**

---

### 2.18 ENCHANTER (Crafting)

**A. Income:** 9 recipes listed with inputs (Arcane Reagents, Coal, Gemstones, etc.) but no output base_values. v3 estimate: ~5.33g/day → **37.3g/week**.

**B. Tax:** 125g → 8.8g/week (23.5%)
**D. Verdict: ~VIABLE (estimated, tax-sensitive)**

---

### 2.19 JEWELER (Crafting)

**A. Income:** 12 recipes listed (recipe IDs only). Uses expensive precious metal ingots (Silver, Gold, Mithril) from SMELTER + Gemstones from MINER.

v3 estimate: ~4g/day → **28g/week**. Marginal — expensive inputs, unclear output values.

**B. Tax:** 125g → 8.8g/week (31.3%)
**C. Encounter Loot:** New encounter materials (Wolf Fang 5.7/week, Boar Tusk 1.8/week, Bear Claw 1.7/week, Bone Fragments 9.6/week) provide cheap inputs for potential new recipes. **Meaningful future improvement** if low-cost encounter-material recipes are designed.
**D. Verdict: ~MARGINAL (estimated)**

---

### 2.20 FLETCHER (Crafting)

**A. Income:** 13 recipes. Depends on WOODWORKER (Bow Stave, Planks, Dowels) + TANNER (Cured/Wolf/Bear Leather). No output base_values in YAML.

v3 estimate: ~6g/day → **42g/week**.

**B. Tax:** 125g → 8.8g/week (20.9%)
**C. Encounter Loot:** Bone Fragments (9.6/week) and Wolf Fang (5.7/week) provide new arrow component materials.
**D. Verdict: ~VIABLE (estimated)**

---

### 2.21 MASON (Crafting)

**A. Income:** 12 recipes. Depends on MINER (Raw Stone, Stone Blocks, Clay, Marble) + SMELTER (Iron Ingot). No output base_values.

v3 estimate: ~6.3g/day → **44.3g/week**.

**B. Tax:** 125g → 8.8g/week (19.8%)
**C. Encounter Loot:** None.
**D. Verdict: ~VIABLE (estimated)**

---

### 2.22 SCRIBE (Crafting)

**A. Income:** 7 recipes. Depends on LUMBERJACK (→WOODWORKER → Softwood Planks) + HERBALIST (herbs, reagents). No output base_values.

v3 estimate: ~5.67g/day → **39.7g/week**.

**B. Tax:** 125g → 8.8g/week (22.1%)
**C. Encounter Loot:** None.
**D. Verdict: ~VIABLE (estimated)**

---

### 2.23-2.29 SERVICE PROFESSIONS (7)

Service professions have no recipes in the YAML — their income depends on player interactions.

| # | Profession | Building | Assessed | Est. Weekly Income | Tax 7% | Net | Verdict |
|:-:|-----------|---------|--------:|:-:|:-:|:-:|:-:|
| 23 | MERCHANT | Market Stall | 75g | ~140g | 5.3g | ~135g | Viable |
| 24 | INNKEEPER | Inn | 175g | ~105g | 12.3g | ~93g | Viable |
| 25 | BANKER | Bank | 225g | ~105g | 15.8g | ~89g | Viable |
| 26 | HEALER | Workshop T1 | 125g | ~70g | 8.8g | ~61g | Viable |
| 27 | STABLE MASTER | Stable | 125g | ~52.5g | 8.8g | ~44g | Viable |
| 28 | MERCENARY CAPTAIN | Cottage only | 25g | ~105g | 1.8g | ~103g | Tax-immune |
| 29 | COURIER | Cottage only | 25g | ~52.5g | 1.8g | ~51g | Tax-immune |

All service profession income is estimated — no YAML basis. Depends entirely on server population and activity.

---

## Part 3: Cross-Profession Comparison Tables

### Table A: Income Rankings (Weekly Pre-Tax)

| Rank | Profession | Type | Weekly Pre-Tax | Confidence | Source |
|:----:|-----------|------|:------------:|:----------:|--------|
| 1 | FISHERMAN (Craftsman) | Gathering | **333.6g** | YAML | Tiered resources (Trout/Perch) |
| 2 | HUNTER (Craftsman) | Gathering | **332.5g** | YAML | Tiered resources (Wolf/Bear) |
| 3 | HERBALIST (Craftsman) | Gathering | **319.0g** | YAML | Tiered resources (Medicinal/Glowcap) |
| 4 | MINER (Silver, Craftsman) | Gathering | **283.5g** | YAML | Silver Ore at 30g |
| 5 | COOK | Crafting | **221.2g** | YAML | Smoked Fish recipe |
| 6 | RANCHER (full) | Gathering | **~315g** | Est. | 3-plot full operation |
| 7 | MERCHANT | Service | **~140g** | Est. | — |
| 8 | RANCHER (1 plot) | Gathering | **128.8g** | Est. | Chicken Coop |
| 9 | MINER (Coal) | Gathering | **113.4g** | YAML | Coal at 12g |
| 10 | MERCENARY CAPTAIN | Service | **~105g** | Est. | — |
| 11 | INNKEEPER | Service | **~105g** | Est. | — |
| 12 | BANKER | Service | **~105g** | Est. | — |
| 13 | HUNTER (Apprentice) | Gathering | **81.9g** | YAML | — |
| 14 | FARMER (1 plot) | Gathering | **75.6g** | YAML | Plot + Field + gathering |
| 15 | SMELTER | Crafting | **~70g** | Est. | — |
| 16 | BLACKSMITH | Crafting | **~70g** | Est. | — |
| 17 | HEALER | Service | **~70g** | Est. | — |
| 18 | MINER (Apprentice) | Gathering | **66.2g** | YAML | Stone Blocks at quarry |
| 19 | LUMBERJACK | Gathering | **63.0g** | YAML | — |
| 20 | TANNER | Crafting | **58.8g** | YAML | Cured Leather only |
| 21 | WOODWORKER | Crafting | **~58.3g** | Est. | — |
| 22 | MINER (Iron) | Gathering | **56.7g** | YAML | — |
| 23 | STABLE MASTER | Service | **~52.5g** | Est. | — |
| 24 | COURIER | Service | **~52.5g** | Est. | — |
| 25 | BREWER | Crafting | **~50.4g** | Est. | — |
| 26 | FISHERMAN (Apprentice) | Gathering | **50.4g** | YAML | — |
| 27 | HERBALIST (Apprentice) | Gathering | **47.3g** | YAML | — |
| 28 | ALCHEMIST | Crafting | **~46.7g** | Est. | — |
| 29 | MASON | Crafting | **~44.3g** | Est. | — |
| 30 | FLETCHER | Crafting | **~42g** | Est. | — |
| 31 | SCRIBE | Crafting | **~39.7g** | Est. | — |
| 32 | FARMER (public) | Gathering | **37.8g** | YAML | — |
| 33 | ENCHANTER | Crafting | **~37.3g** | Est. | — |
| 34 | JEWELER | Crafting | **~28g** | Est. | — |
| 35 | LEATHERWORKER | Crafting | **~21g** | Est. | — |
| 36 | TAILOR (processing) | Crafting | **16.8g** | YAML | Spin Cloth only |
| 37 | ARMORER | Crafting | **~0g** | Est. | Negative margins |
| 38 | TAILOR (armor) | Crafting | **-203g** | YAML | Value-destructive |
| 39 | TANNER (finished) | Crafting | **-46.5g** | YAML | Value-destructive |

**Critical finding:** Craftsman-tier gatherers (FISHERMAN, HUNTER, HERBALIST) earn 3-6× more than Apprentice-level, creating massive income inequality between low and high-level players of the same profession. This was invisible in v3 which only used Apprentice-level income.

### Table B: Tax Burden Rankings (at 7%, Cottage + Workshop T1 = 125g)

| Rank | Profession | Weekly Income | Tax 7% (8.8g) | Tax % | Revolt Rate |
|:----:|-----------|:------------:|:-----:|:-----:|:-----------:|
| 1 | TAILOR (proc.) | 16.8g | 8.8g | **52.2%** | 13.4% |
| 2 | LEATHERWORKER | ~21g | 8.8g | **41.8%** | 16.8% |
| 3 | JEWELER | ~28g | 8.8g | **31.3%** | 22.4% |
| 4 | ENCHANTER | ~37.3g | 8.8g | **23.5%** | 29.8% |
| 5 | SCRIBE | ~39.7g | 8.8g | **22.1%** | 31.8% |
| 6 | FLETCHER | ~42g | 8.8g | **20.9%** | 33.6% |
| 7 | MASON | ~44.3g | 8.8g | **19.8%** | 35.4% |
| 8 | ALCHEMIST | ~46.7g | 8.8g | **18.8%** | 37.4% |
| 9 | BREWER | ~50.4g | 8.8g | **17.4%** | 40.3% |
| 10 | WOODWORKER | ~58.3g | 8.8g | **15.0%** | 46.6% |
| 11 | TANNER | 58.8g | 8.8g | **14.9%** | 47.0% |
| 12-15 | SMELTER/BLACKSMITH | ~70g | 8.8g | **12.5%** | 56.0% |
| 16 | COOK | 221.2g | 8.8g | **4.0%** | 177% |

### Table C: Viability Summary

| Profession | Weekly Income | Tax 7% | Net After Tax | Verdict | Changed from v3? |
|-----------|:------------:|:------:|:------------:|:-------:|:----------------:|
| COOK | 221.2g | 8.8g | **212.5g** | Viable | No |
| RANCHER (1 plot) | ~128.8g | 15.8g | **~113g** | Viable | No |
| HUNTER | 81.9g | 1.8g | **80.2g** | Tax-immune | No |
| FARMER (1 plot) | 75.6g | 10.5g | **65.1g** | Viable | No |
| SMELTER | ~70g | 8.8g | **~61g** | ~Viable | No |
| BLACKSMITH | ~70g | 8.8g | **~61g** | ~Viable | No |
| LUMBERJACK | 63g | 1.8g | **61.3g** | Tax-immune | No |
| TANNER | 58.8g | 8.8g | **50g** | Viable* | **YES** (downgraded) |
| WOODWORKER | ~58.3g | 8.8g | **~49.5g** | ~Viable | No |
| MINER | 56.7g | 1.8g | **54.9g** | Tax-immune | No |
| BREWER | ~50.4g | 8.8g | **~41.7g** | ~Viable | No |
| FISHERMAN | 50.4g | 1.8g | **48.7g** | Tax-immune | No |
| HERBALIST | 47.3g | 1.8g | **45.5g** | Tax-immune | No |
| ALCHEMIST | ~46.7g | 8.8g | **~37.9g** | ~Viable | No |
| MASON | ~44.3g | 8.8g | **~35.5g** | ~Viable | No |
| FLETCHER | ~42g | 8.8g | **~33.3g** | ~Viable | No |
| SCRIBE | ~39.7g | 8.8g | **~30.9g** | ~Viable | No |
| FARMER (public) | 37.8g | 1.8g | **36g** | Tax-immune | No |
| ENCHANTER | ~37.3g | 8.8g | **~28.5g** | ~Viable | No |
| JEWELER | ~28g | 8.8g | **~19.3g** | ~Marginal | No |
| LEATHERWORKER | ~21g | 8.8g | **~12.3g** | ~Marginal | No |
| TAILOR (proc.) | 16.8g | 8.8g | **8.0g** | **Marginal** | **YES** (was Viable) |
| ARMORER | ~0g | 8.8g | **-8.8g** | Underwater | No |
| TAILOR (armor) | -203g | 8.8g | **-212g** | Underwater | No |
| TANNER (finished) | -46.5g | 8.8g | **-55.3g** | **Underwater** | **YES** (was hidden) |

*TANNER: Viable for Cured Leather processing. Entire finished goods tree is underwater — see Part 5.*

### Table D: Encounter Loot Impact

| Profession | Encounter Benefit | Materials | Weekly Supplement Value | Income Improvement |
|-----------|:----------------:|-----------|:-----:|:------:|
| TANNER | Moderate | Animal Pelts (12.6%), Wolf Pelts (14.4%), Bear Hides (14.0%) | ~4.2g saved/TANNER | ~7% |
| TAILOR | Significant | Spider Silk (encounter-only, free fiber) | 14.4g if self-looted | ~86% on Spin Cloth |
| JEWELER | High (future) | Wolf Fang, Boar Tusk, Bear Claw, Bone Fragments | New recipes needed | Potentially 2-3× |
| ALCHEMIST | Moderate | Spider Venom (12g), Rat Tail (2g), Orc War Paint (8g) | New recipe ingredients | Recipe expansion |
| FLETCHER | Moderate | Bone Fragments, Wolf Fang (arrow components) | New recipe ingredients | Recipe expansion |
| SMELTER | Minimal | Iron Ore from salvage (7.1%) | ~1g/SMELTER | <2% |
| Others | None | — | 0 | 0% |

---

## Part 4: Supply Chain Validation

### Full Supply Chain Map

| Raw Material | Gatherer | Processor | Final Crafter | Chain Complete? |
|-------------|----------|-----------|---------------|:------:|
| Apple (3g) | FARMER | — | COOK | Yes |
| Wild Herbs (5g) | HERBALIST | — | COOK, BREWER, ALCHEMIST | Yes |
| Raw Fish (4g) | FISHERMAN | — | COOK | Yes |
| Wood Logs (5g) | LUMBERJACK | WOODWORKER (Planks) | FLETCHER, MASON, SCRIBE, COOK (fuel) | Yes |
| Iron Ore (6g) | MINER | SMELTER (Ingots) | BLACKSMITH, ARMORER, JEWELER | Yes |
| Stone Blocks (7g) | MINER | MASON (Cut Stone) | Housing | Yes |
| Clay (4g) | MINER | MASON (Bricks) / ALCHEMIST | Housing, Potions | Yes |
| Coal (12g) | MINER (L5+) | SMELTER, BLACKSMITH | — | Yes |
| Silver Ore (30g) | MINER (L7+) | SMELTER (Silver Ingot) | BLACKSMITH, JEWELER, TAILOR | Yes |
| Hardwood (25g) | LUMBERJACK (L7+) | WOODWORKER | BLACKSMITH (handles) | Yes |
| Wild Game Meat (5g) | HUNTER | — | COOK | Yes |
| Animal Pelts (8g) | HUNTER | TANNER (Cured Leather) | TANNER, LEATHERWORKER, TAILOR, ARMORER | Yes |
| Wolf Pelts (28g) | HUNTER (L7+) | TANNER (Wolf Leather) | TANNER, LEATHERWORKER, TAILOR | Yes |
| Bear Hides (35g) | HUNTER (L7+) | TANNER (Bear Leather) | TANNER, LEATHERWORKER, TAILOR | Yes |
| Grain (~3g) | FARMER (private) | — | COOK, BREWER, RANCHER (feed) | Yes |
| Wool (~15g) | RANCHER (sheep) | TAILOR (Woven Cloth) | TAILOR | Yes |
| Fine Wool (30g) | RANCHER (L7+ sheep) | TAILOR (Fine Cloth) | TAILOR | Yes |
| Silkworm Cocoons (38g) | RANCHER (Silkworm House) | TAILOR (Silk Fabric) | TAILOR | Yes |
| Cotton (~4g) | FARMER (L9+ Expert) | TAILOR (Spin Cloth) | TAILOR, ARMORER (legacy) | Yes |
| Eggs (~5g) | RANCHER (chickens) | — | COOK | Yes |
| Milk (~6g) | RANCHER (cows) | — | COOK | Yes |
| Medicinal Herbs (28g) | HERBALIST (L7+) | — | ALCHEMIST | Yes |
| Glowcap Mushrooms (32g) | HERBALIST (L7+) | — | ALCHEMIST, TAILOR (Enchanted Cloak) | Yes |
| River Trout (22g) | FISHERMAN (L7+) | — | COOK | Yes |
| Lake Perch (25g) | FISHERMAN (L7+) | — | COOK | Yes |

### Bottleneck Analysis

| Material | Produced By | Consumed By | Bottleneck? |
|----------|-----------|-------------|:-----------:|
| Cured Leather (18g) | TANNER | TANNER, LEATHERWORKER, TAILOR, ARMORER | **YES** — 4 professions compete for 1 TANNER's output |
| Iron Ingot | SMELTER | BLACKSMITH, ARMORER, JEWELER, MASON | **YES** — 4 consumers per SMELTER |
| Woven Cloth (20g) | TAILOR | TAILOR (own recipes) | No — self-consumed |
| Grain (~3g) | FARMER | COOK, BREWER, RANCHER | **Moderate** — 3 consumers |
| Wolf/Bear Leather | TANNER | TANNER, LEATHERWORKER, TAILOR | **Moderate** — but processing is value-destructive |

### Materials with NO Source

| Material | Referenced By | Status |
|----------|-------------|--------|
| Hops | BREWER T3 | **No gathering source.** Listed as "FARMER Craftsman" but no spot exists. |
| Grapes | BREWER T3 | **No gathering source.** Same issue. |
| Gold Ore | SMELTER (Smelt Gold) | **No gathering source** in YAML Section 1. May be MINER Expert+ tier. |
| Mithril Ore | SMELTER (Smelt Mithril) | **No gathering source.** Future MINER tier. |
| Adamantine Ore | SMELTER (Smelt Adamantine) | **No gathering source.** Future MINER tier. |
| Arcane Reagents | SMELTER, ENCHANTER | **No gathering source.** May be HERBALIST Expert+ tier. |
| Gemstones | ENCHANTER, JEWELER | **No gathering source.** May be MINER Expert+ tier. |
| Silite Sand | SMELTER (Glass) | **No gathering source.** |

**8 materials have no implemented gathering source.** These are all Expert+ tier (L9+) materials intended for future profession tiers. No current recipes are broken by their absence — they gate future content.

### Encounter Loot Supply Chain Relief

| Bottleneck | Encounter Material | Relief Level |
|-----------|-------------------|:------------:|
| Cured Leather demand | Animal Pelts from encounters (+12.6%) | Slight — more pelts for TANNERs |
| Iron Ingot demand | Iron Ore from salvage (+7.1%) | Minimal |
| TAILOR fiber supply | Spider Silk (encounter-only) | **Significant** — new free fiber channel |
| JEWELER input diversity | Wolf Fang, Boar Tusk, Bear Claw, Bone Fragments | **Significant** — cheap new materials |

---

## Part 5: Problem Professions (Detailed)

### P0: TAILOR Armor — Worst Recipe Margins in the Game

**Root cause:** Cloth intermediates (Woven Cloth, Fine Cloth, Silk Fabric) are expensive because the processing step is value-destructive, AND armor output base_values are far too low relative to material input quantities.

**Example:** Cloth Robe
- 4×Woven Cloth (20g×4=80g) + 1×Cured Leather (18g) = **98g input**
- 1×Cloth Robe (45g×0.9) = **40.5g output**
- **Net: -57.5g per craft** (margin ratio: 0.41)

**Fix (Option A — reduce inputs):**
- Change to: 2×Woven Cloth (40g) + 1×Cured Leather (18g) = 58g input
- Output: 45g×0.9 = 40.5g
- Net: -17.5g (still negative, but improved)
- Would need Cloth Robe base_value → **65g** for break-even: 65×0.9=58.5g > 58g input

**Fix (Option B — raise output values):**
- Current: Cloth Robe 45g → needs **109g** to break even against 98g input
- That's a 142% increase — unreasonable for a T1 robe

**Fix (Option C — combination, recommended):**
- Halve input quantities: 2×WC + 1×CL = 58g
- Raise Cloth Robe to 70g: 70×0.9 = 63g
- Net: +5g/craft → viable

Apply same pattern to all 13 armor recipes.

### P0: TANNER Finished Goods — All 12 Recipes Underwater

**Root cause:** Cured Leather (18g) is too expensive relative to finished goods output values. A Leather Cap (2×CL = 36g input) sells for 30g (27g after fee).

**Fix:** Raise finished goods base_values by 30-50%:

| Item | Current | Needed (break-even) | Suggested | New Net |
|------|--------:|:---:|:---------:|:-------:|
| Leather Cap | 30g | 40g | **45g** | +4.5g |
| Leather Vest | 45g | 60g | **70g** | +9g |
| Leather Armor | 65g | 98g | **110g** | +11g |
| Quiver | 55g | 78g | **85g** | +6g |

### P0: Wolf/Bear Leather Processing — Value-Destructive

**Root cause:** Wolf Pelts (28g×2=56g) → Wolf Leather (35g). Output < input.

**Fix:** Either:
- Raise Wolf Leather to 32g per pelt input: 2×28g=56g → need 63g output → **set Wolf Leather to 63g**
- Or change ratio: 2×Wolf Pelts → **2** Wolf Leather (not 1)

### P0: TAILOR Processing (Weave Cloth, Fine Cloth, Silk)

**Root cause:** 3×Wool→2×Woven Cloth: if Wool=15g, input=45g, output=36g (net -9g).

**Fix:** Either:
- Change ratio: 3×Wool → **3**×Woven Cloth
- Or set Wool base_value < 10g so processing adds value

### P1: ARMORER — Zero Pre-Tax Income

**Root cause:** Metal armor output values not derivable from YAML (no base_values). Based on structural similarity to TANNER finished goods and TAILOR armor, likely same issue: output < input.

**Fix:** Commission system (crafting fee UI) or output value increase. Requires YAML base_values to quantify.

### P2: TAILOR Processing Income — Overestimated in v3

v3: 38.5g/week. v4 YAML-derived: **16.8g/week**. Difference: 21.7g/week (2.3× overestimate).

This reclassifies TAILOR from "Viable" to **"Marginal"** — tax consumes 52% of income at default 7%.

### Priority Ranking

| Priority | Fix | Impact | Difficulty |
|:--------:|-----|--------|:----------:|
| **P0** | TAILOR armor input reduction (halve quantities) | Fixes 13 recipes, enables cloth armor economy | Low (YAML edits) |
| **P0** | TANNER finished goods value increase (+30-50%) | Fixes 12 recipes, enables leather economy | Low (YAML edits) |
| **P0** | Wolf/Bear Leather processing ratio fix | Fixes 2 value-destructive recipes | Low |
| **P0** | TAILOR processing ratio fix (Wool→WC) | Fixes 3 value-destructive recipes | Low |
| **P1** | ARMORER output base_values (need YAML data first) | Enables metal armor economy | Medium |
| **P1** | Commission/crafting fee UI | Fixes ARMORER, TANNER, TAILOR structurally | High (code change) |
| **P2** | BREWER/SMELTER output base_values | Enables margin validation | Low (YAML edits) |
| **P2** | All remaining recipe base_values | Completes YAML source of truth | Medium |

---

## Part 6: Economy Health Scorecard

### Metric Breakdown

| Metric | Value | Grade |
|--------|-------|:-----:|
| % Professions Viable at 7% (of 29) | 22/29 = **76%** (but 10 are estimated) | B |
| % YAML-Confirmed Viable | 12/29 = **41%** (only those with YAML data) | D |
| Income inequality (highest/lowest viable) | COOK 221g / TAILOR 16.8g = **13.2:1** | D |
| Income inequality (Craftsman gatherers) | FISHERMAN 334g / FARMER 37.8g = **8.8:1** | D |
| Gatherer-to-crafter income ratio | HUNTER 82g / COOK 221g = 0.37:1 (Apprentice); HUNTER Craftsman 333g / COOK 221g = 1.51:1 | C |
| Supply chain completeness | 22/30 materials have sources (73%) | B- |
| Professions with broken recipes | 3 (TANNER finished, TAILOR armor, ARMORER) | D |
| Recipe data completeness in YAML | 60% have base_values, 40% missing | D |

### Overall Grade: **C+**

**Rationale:** The economy has a sound foundation — gathering professions work well, COOK is the standout crafter, tax system is well-calibrated. But three critical problems prevent a higher grade:

1. **40% of recipe output base_values are missing from the YAML** — making it impossible to validate margins for 12 of 15 crafting professions. The YAML is the declared source of truth but is incomplete.

2. **All three armor crafting professions are structurally broken** — TANNER finished goods, TAILOR armor, and ARMORER all have output values less than input costs. The entire combat equipment economy is non-functional.

3. **Income inequality is extreme** — a 13:1 ratio between COOK and TAILOR, and Craftsman-tier gatherers earning 3-6× their Apprentice-level income creates massive balance issues that v3 completely missed.

---

## Part 7: Comparison — v3 vs v4

### Numbers That Changed

| Profession | v3 Weekly | v4 Weekly | Delta | Cause |
|-----------|:---------:|:---------:|:-----:|-------|
| TAILOR (proc.) | 38.5g | **16.8g** | -21.7g | v3 used estimated Cotton ~2-3g; v4 uses YAML-inferred ~4g |
| FISHERMAN (Craftsman) | — | **333.6g** | NEW | v3 only reported Apprentice (50.4g) |
| HUNTER (Craftsman) | — | **332.5g** | NEW | v3 only reported Apprentice (81.9g) |
| HERBALIST (Craftsman) | — | **319.0g** | NEW | v3 only reported Apprentice (47.3g) |
| MINER (Silver) | — | **283.5g** | NEW | v3 only reported Iron Ore (56.7g) |

### Verdicts That Changed

| Profession | v3 Verdict | v4 Verdict | Why |
|-----------|:----------:|:----------:|-----|
| TAILOR (processing) | Viable | **Marginal** | Income 16.8g (not 38.5g). Tax = 52% of income. |
| TANNER (finished goods) | Viable | **Underwater** | v3 didn't examine finished goods margins — all 12 are losses |
| TANNER (processing) | Viable | **Viable** | Confirmed — Cured Leather is profitable |

### v3 Errors Found

1. **TAILOR income overestimate** — v3 carried forward v2's ~5.5g/day without re-deriving from YAML. Actual Spin Cloth margin: 2.4g/day (Cotton at ~4g), not 5.5g/day.

2. **TANNER presented as monolithically Viable** — v3 only looked at Cured Leather processing (8.4g/day ✓) but did not examine the 12 finished goods recipes, all of which are underwater. TANNER's "Viable" verdict was misleading — it's only viable as a processor, not as a finished goods crafter.

3. **Tier scaling invisible** — v3 used Apprentice-level income for all gatherers. Craftsman-tier FISHERMAN (334g/week) vs Apprentice (50.4g/week) is a 6.6× difference. This fundamentally changes the income ranking and gathering vs crafting balance.

4. **40% estimated numbers carried from v2** — v3 acknowledged this in its appendix but didn't flag it prominently. Professions with "~" estimates may have systematically wrong numbers. Until the YAML has output base_values for ALL recipes, no economy analysis can claim to be fully validated.

### What Stayed the Same

- COOK income (221.2g/week) — YAML-confirmed, matches v3 ✓
- TANNER processing income (58.8g/week) — YAML-confirmed, matches v3 ✓
- All Apprentice-level gathering incomes — YAML-confirmed ✓
- Tax system assessment — v3's tax burden analysis is correct ✓
- ARMORER remains Underwater ✓
- Political faction analysis — still valid ✓
- Overall tax design is well-calibrated ✓

---

## Appendix A: Immediate Action Items

### To make this audit fully validated:

1. **Add output base_values to YAML** for: SMELTER (11 recipes), BLACKSMITH (28 recipes), ARMORER (25 recipes), WOODWORKER (25 recipes), LEATHERWORKER (13 recipes), ALCHEMIST (11 recipes), BREWER (9 recipes), ENCHANTER (9 recipes), JEWELER (12 recipes), FLETCHER (13 recipes), MASON (12 recipes), SCRIBE (7 recipes). **Total: 175 recipes need base_values.**

2. **Add missing material base_values** for: Grain, Vegetables, Wild Berries, Eggs, Milk, Wool, Cotton, Copper Ore, Iron Ore Chunks, Hops, Grapes. **Total: 11 materials.**

3. **Fix P0 recipe margins** for TANNER finished goods, TAILOR armor, and TAILOR/TANNER processing.

4. **Re-run this audit as v5** after YAML is complete.

## Appendix B: Recipe Margin Calculation Sheets

### How to Read

For each YAML-confirmed recipe: `Input Cost = sum(qty × market_price)`, `Output = qty × base_value × 0.9`, `Net = Output - Input`.

Margin ratio = Output / Input. Need >1.0 for profitability, >1.11 to exceed the 10% marketplace fee.

### All 57 YAML-Confirmed Recipe Margins

**COOK (25 recipes):** 8 profitable, 17 unprofitable (T1 losses have HP value)
**TANNER (15 recipes):** 1 profitable, 14 unprofitable (12 finished goods + 2 processing)
**TAILOR (17 recipes):** 1 barely profitable, 16 unprofitable (3 processing + 13 armor)

**Total recipes with YAML data: 57**
**Profitable at market prices: 10 (17.5%)**
**Unprofitable at market prices: 47 (82.5%)**

This 82.5% unprofitable rate is alarming but misleading — many T1 COOK recipes are food items where the value is HP restoration, not resale. The truly broken recipes are the armor and finished goods where output is meant to be sold but can't cover input costs.
