# Profession Economy Audit v5 — Post Magical Components

**Date:** 2026-02-20
**Auditor:** Economy Analysis Team
**Source of Truth:** `docs/profession-economy-master.yaml` (all numbers traced to this file)
**Previous Audit:** v4 (grade C+)

---

## Part 1: Methodology

### Income Formula
- **Crafting:** `net_margin = (output_qty × base_value × 0.9) - Σ(input_qty × input_base_value)`
- **Gathering (spot):** `daily_income = avg_yield × tier_multiplier × base_value × 0.9`
- **Gathering (asset):** `daily_income ≈ avg_yield × tier_multiplier × base_value × 0.9` (1 harvest/day with staggered fields)
- The 0.9 multiplier reflects the 10% marketplace transaction fee
- 1 craft or 1 gather per daily action, 7 actions/week

### Yield Calculation
- `finalQuantity = ceil(baseQuantity × (1 + tierBonus))`
- Tier bonuses: Apprentice +0%, Journeyman +25%, Craftsman +50%, Expert +75%, Master +100%
- For yield range 1-3 at Craftsman (+50%): ceil(1×1.5)=2, ceil(2×1.5)=3, ceil(3×1.5)=5 → avg 3.33
- For yield range 1-2 at Craftsman (+50%): ceil(1×1.5)=2, ceil(2×1.5)=3 → avg 2.5

### Tax System
- Town rate 0-25% (default 5%) + Kingdom rate 0-5% (default 2%) = Combined default 7%
- Applied weekly to total assessed property value
- Assessed values: Workshop T1=100g, T2=200g, T3=350g; Cottage=25g; Plot=50g; RANCHER building=100-200g

### Changes Since v4
1. **226 base_values added/fixed** — raw materials anchored, value-destructive processing fixed
2. **18 magical components** added as monster-drop materials (8g-45g)
3. **15 existing ENCHANTER/SCRIBE recipes** modified with magical component inputs
4. **8 new ENCHANTER/SCRIBE recipes** (Expert/Craftsman tier)
5. **Wool repriced** 15g→10g for TAILOR margin fix
6. **TANNER finished goods repriced** (47g-476g) — eliminates value-destructive chains
7. **TAILOR armor repriced** (50g-986g) — eliminates value-destructive chains

### Margin Targets (from base-value-completion-changelog)
| Tier | Target Multiplier |
|------|------------------|
| Apprentice | 1.3-1.5× input |
| Journeyman | 1.4-1.6× input |
| Craftsman | 1.5-1.8× input |
| Expert | 1.6-2.0× input |
| Master | 1.8-2.0× input |

---

## Part 2: Per-Profession Deep Dive

### 2.1 FARMER (Gathering)

**A. Income Analysis**
| Tier | Resource | Spot Yield | Tier Bonus | Avg Yield | Base Value | Daily Net (×0.9) |
|------|----------|-----------|------------|-----------|------------|-----------------|
| Apprentice | Grain (private field) | 3-5 | +0% | 4.0 | 3g | 10.8g |
| Journeyman | Apple (orchard) | 1-3 | +25% | 3.0 | 3g | 8.1g |
| Craftsman | Hops (private field) | 3-5 | +50% | 6.0 | 5g | 27.0g |

- Best daily: Craftsman Hops = 27.0g → **189g/week**
- Apprentice Grain (staggered 3 fields): ~10.8g/day → **75.6g/week**

**B. Property & Tax**
- Typical: Cottage (25g) + 3× Field T1 (150g) = 175g assessed
- Weekly tax at 7%: 12.25g | Tax as % of income (Craftsman): 6.5% | Tax revolt: No

**C. Encounter Loot:** No direct benefit (gatherer, not fighter)

**D. Verdict: VIABLE** — Craftsman Hops is solid. Apprentice is low but FARMER is a feeder profession.

---

### 2.2 RANCHER (Gathering)

**A. Income Analysis**
| Building | Animals | Product | Value | Yield/3 ticks | Feed Cost/3 ticks | Net/day |
|----------|---------|---------|-------|---------------|-------------------|---------|
| Chicken Coop (cap 5) | 5 chickens | Eggs | 5g | 7.5 (avg) | 5×1×3g=15g | 7.5g |
| Dairy Barn (cap 3) | 3 cows | Milk | 6g | 3 | 3×2×3g=18g | 0g |
| Sheep Pen (cap 4) | 4 sheep | Wool | 10g | 4 | 4×1×3g=12g | 9.3g |
| Silkworm House | — | Cocoons | 38g | 1 | 0 | 12.7g |

- Apprentice+Journeyman: Chickens + Cows + Sheep = 7.5+0+9.3 = **16.8g/day → 117.6g/week**
- Craftsman adds Fine Wool (~10g/day) + Silkworm Cocoons (12.7g/day) = **+159g/week**
- Craftsman total: ~**276g/week**
- Note: Dairy Barn is break-even (Milk 6g × 3 = 18g revenue = 18g feed cost). Gold-neutral.

**B. Property & Tax**
- Typical: Cottage (25g) + 3 buildings (~360g) = 385g assessed
- Weekly tax at 7%: 26.95g | Tax as % (Craftsman): 9.8% | Tax revolt: No (but tight for Apprentice)

**C. Encounter Loot:** No direct benefit

**D. Verdict: VIABLE** (Craftsman). Apprentice-only RANCHER is **MARGINAL** at 117.6g/week with 27g tax.

---

### 2.3 FISHERMAN (Gathering)

**A. Income Analysis**
| Tier | Resources | Yield Range | Tier Bonus | Avg Yield | Expected Value/Item | Daily Net |
|------|-----------|------------|------------|-----------|--------------------|-----------|
| Apprentice | Raw Fish (4g) | 1-3 | +0% | 2.0 | 4g | 7.2g |
| Journeyman | Raw Fish (4g) | 1-3 | +25% | 3.0 | 4g | 10.8g |
| Craftsman | Mixed (30% Fish/35% Trout/35% Perch) | 1-3 | +50% | 3.33 | 17.65g | 52.9g |

- Craftsman weighted: 0.3×4 + 0.35×22 + 0.35×25 = 17.65g expected per item
- Best daily: Craftsman = **52.9g → 370.1g/week**

**B. Property & Tax**
- Typical: Cottage (25g) + Fishing Rights T1 (50g) = 75g assessed
- Weekly tax at 7%: 5.25g | Tax as % (Craftsman): 1.4% | Tax revolt: No

**C. Encounter Loot:** No direct benefit

**D. Verdict: VIABLE** — Craftsman tier is excellent. River Trout/Lake Perch are high-value.

---

### 2.4 LUMBERJACK (Gathering)

**A. Income Analysis**
| Tier | Resource | Yield | Bonus | Avg Yield | Base Value | Daily Net |
|------|----------|-------|-------|-----------|------------|-----------|
| Apprentice | Wood Logs (5g) | 1-3 | +0% | 2.0 | 5g | 9.0g |
| Journeyman | Hardwood (25g) | 1-2 | +25% | 2.5 | 25g | 56.25g |

- Best daily: Journeyman Hardwood = **56.25g → 393.75g/week**

**B. Property & Tax**
- Typical: Cottage (25g) + Timber Plot (50g) = 75g assessed
- Weekly tax at 7%: 5.25g | Tax as %: 1.3% | Tax revolt: No

**D. Verdict: VIABLE** — Hardwood is very profitable.

---

### 2.5 MINER (Gathering)

**A. Income Analysis**
| Tier | Resource | Yield | Bonus | Avg Yield | Base Value | Daily Net |
|------|----------|-------|-------|-----------|------------|-----------|
| Apprentice | Iron Ore (6g) | 1-2 | +0% | 1.5 | 6g | 8.1g |
| Journeyman | Coal (12g) | 1-2 | +25% | 2.5 | 12g | 27.0g |
| Craftsman | Silver Ore (30g) | 1-2 | +50% | 2.5 | 30g | 67.5g |

- Best daily: Craftsman Silver = **67.5g → 472.5g/week**

**B. Property & Tax**
- Typical: Cottage (25g) + Mine Claim (50g) = 75g assessed
- Weekly tax at 7%: 5.25g | Tax as %: 1.1% | Tax revolt: No

**D. Verdict: VIABLE** — Silver mining is the highest-income gathering profession.

---

### 2.6 HERBALIST (Gathering)

**A. Income Analysis**
| Tier | Resources | Yield | Bonus | Avg Yield | Expected Value/Item | Daily Net |
|------|-----------|-------|-------|-----------|--------------------|-----------|
| Apprentice | Wild Herbs (5g) | 1-2 | +0% | 1.5 | 5g | 6.75g |
| Craftsman | Mixed (30% Herbs/35% Medicinal/35% Glowcap) | 1-2 | +50% | 2.5 | 22.5g | 50.6g |

- Craftsman weighted: 0.3×5 + 0.35×28 + 0.35×32 = 22.5g per item
- Best daily: Craftsman = **50.6g → 354.4g/week**

**B. Property & Tax**
- Typical: Cottage (25g) + Herb Garden (50g) = 75g assessed
- Weekly tax at 7%: 5.25g | Tax as %: 1.5% | Tax revolt: No

**D. Verdict: VIABLE** — Craftsman-tier Medicinal Herbs and Glowcaps are high-value.

---

### 2.7 HUNTER (Gathering)

**A. Income Analysis**
| Tier | Resources | Yield | Bonus | Avg Yield | Expected Value/Item | Daily Net |
|------|-----------|-------|-------|-----------|--------------------|-----------|
| Apprentice | Meat (5g) + Pelts (8g) | 1-3 | +0% | 2.0 | ~6.5g | 11.7g |
| Craftsman | Mixed (40/20/20/20 Meat/AP/Wolf/Bear) | 1-3 | +50% | 3.33 | 16.2g | 48.6g |

- Craftsman weighted: 0.4×5 + 0.2×8 + 0.2×28 + 0.2×35 = 16.2g per item
- Best daily: Craftsman = **48.6g → 340.0g/week**

**B. Property & Tax**
- Typical: Cottage (25g) + Hunting Rights (50g) = 75g assessed
- Weekly tax at 7%: 5.25g | Tax as %: 1.5% | Tax revolt: No

**D. Verdict: VIABLE** — Wolf Pelts (28g) and Bear Hides (35g) drive Craftsman income.

---

### 2.8 COOK (Crafting)

**A. Income Analysis — All 25 Recipes**

| Recipe | Tier | Inputs (cost) | Output (qty × base_value) | Net Margin | Status |
|--------|------|--------------|--------------------------|------------|--------|
| Flour | T1 | 2×Grain(6)+1×Wood(5)=11g | 1×5g | -6.5g | UNDERWATER (intermediate) |
| Apple Sauce | T1 | 3×Apple(9)+1×Wood(5)=14g | 1×8g=7.2g | -6.8g | UNDERWATER |
| Porridge | T1 | 2×Grain(6)+1×Wood(5)=11g | 1×7g=6.3g | -4.7g | UNDERWATER |
| Berry Jam | T1 | 3×Berry(9)+1×Wood(5)=14g | 1×6g=5.4g | -8.6g | UNDERWATER (intermediate) |
| Grilled Fish (orig) | T1 | 2×Fish(8)+1×Wood(5)=13g | 1×10g=9g | -4.0g | UNDERWATER |
| Herbal Tea | T1 | 2×Herb(10)+1×Wood(5)=15g | 1×10g=9g | -6.0g | UNDERWATER |
| Vegetable Stew | T1 | 3×Veg(9)+1×Wood(5)=14g | 1×8g=7.2g | -6.8g | UNDERWATER |
| Scrambled Eggs | T1 | 3×Eggs(15)=15g | 2×12g=21.6g | **+6.6g** | Viable |
| Creamy Porridge | T1 | 2×Grain(6)+1×Milk(6)=12g | 2×15g=27g | **+15.0g** | Viable |
| Bread Loaf | T2 | 2×Flour(10)+1×Wood(5)=15g | 1×12g=10.8g | -4.2g | UNDERWATER |
| Apple Pie | T2 | 1×Flour(5)+3×Apple(9)+1×Wood(5)=19g | 1×18g=16.2g | -2.8g | UNDERWATER |
| Fish Stew v2 | T2 | 3×Fish(12)+1×Grain(3)+1×Herb(5)=20g | 2×28g=50.4g | **+30.4g** | Viable |
| Grilled Fish v2 | T2 | 2×Fish(8)+1×Herb(5)=13g | 2×22g=39.6g | **+26.6g** | Viable |
| Smoked Fish | T2 | 3×Fish(12)+1×Wood(5)=17g | 3×18g=48.6g | **+31.6g** | **BEST** |
| Seasoned Roast Veg | T2 | 2×Veg(6)+1×Herb(5)+1×Wood(5)=16g | 1×14g=12.6g | -3.4g | UNDERWATER |
| Berry Tart | T2 | 1×Flour(5)+1×Jam(6)+1×Wood(5)=16g | 1×16g=14.4g | -1.6g | UNDERWATER |
| Farm Breakfast | T2 | 2×Eggs(10)+1×Milk(6)+1×Grain(3)=19g | 2×25g=45g | **+26.0g** | Viable |
| Harvest Feast | T3 | 1×Bread(12)+2×Apple(6)+2×Herb(10)+1×Wood(5)=33g | 1×35g=31.5g | -1.5g | MARGINAL |
| Fisherman's Banquet | T3 | 1×GF(22)+1×Bread(12)+1×Jam(6)+1×Wood(5)=45g | 1×32g=28.8g | -16.2g | UNDERWATER |
| Spiced Pastry | T3 | 2×Flour(10)+2×Herb(10)+1×Jam(6)+1×Wood(5)=31g | 1×40g=36g | **+5.0g** | Viable |
| Pan-Seared Trout | T3 | 2×Trout(44)+1×Herb(5)+1×Apple(3)=52g | 2×40g=72g | **+20.0g** | Viable |
| Perch Feast | T3 | 3×Perch(75)+2×Grain(6)+1×Herb(5)=86g | 2×48g=86.4g | **+0.4g** | MARGINAL |
| Fisherman's Pie | T3 | 2×Trout(44)+2×Perch(50)+2×Grain(6)+1×Egg(5)=105g | 2×55g=99g | -6.0g | UNDERWATER |
| Smoked Trout Rations | T3 | 3×Trout(66)+2×Wood(10)=76g | 4×25g=90g | **+14.0g** | Viable |

**Summary:** 11 of 25 recipes profitable. Best: Smoked Fish +31.6g/day → **221.2g/week**

**B. Property & Tax**
- Typical: Workshop T1 (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as % of income: 4.0% | Tax revolt: No

**C. Encounter Loot:** No direct benefit (buys from gatherers)

**D. Verdict: VIABLE** — Strong fish-based recipes. 14 recipes underwater but those are low-tier/intermediate.

---

### 2.9 BREWER (Crafting)

**A. Income Analysis — All 9 Recipes**

| Recipe | Tier | Inputs (cost) | Output (qty × base_value) | Net Margin |
|--------|------|--------------|--------------------------|------------|
| Ale | T1 | 3×Grain(9)=9g | 2×6g=10.8g | +1.8g |
| Apple Cider | T1 | 3×Apple(9)=9g | 2×6g=10.8g | +1.8g |
| Berry Cordial | T1 | 3×Berry(9)+1×Grain(3)=12g | 2×8g=14.4g | +2.4g |
| Strong Ale | T2 | 4×Grain(12)+1×Herb(5)=17g | 2×12g=21.6g | +4.6g |
| Mulled Cider | T2 | 3×Apple(9)+2×Herb(10)=19g | 2×14g=25.2g | +6.2g |
| Herbal Brew | T2 | 3×Herb(15)+2×Grain(6)=21g | 2×15g=27g | +6.0g |
| Hopped Beer | T3 | 3×Grain(9)+2×Hops(10)=19g | 2×15g=27g | +8.0g |
| **Grape Wine** | **T3** | **4×Grapes(16)=16g** | **2×15g=27g** | **+11.0g** |
| Pale Ale | T3 | 3×Grain(9)+2×Hops(10)+1×Herb(5)=24g | 2×18g=32.4g | +8.4g |

**Summary:** All 9 recipes profitable! Best: Grape Wine +11g/day → **77g/week**

**B. Property & Tax**
- Workshop T1 (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as %: 11.4% | Tax revolt: No, but high ratio

**D. Verdict: VIABLE** — All recipes profitable, but low absolute income. Lowest-earning crafting profession.

---

### 2.10 SMELTER (Crafting)

**A. Income Analysis — All 11 Recipes**

| Recipe | Tier | Inputs (cost) | Output (qty × base_value) | Net Margin |
|--------|------|--------------|--------------------------|------------|
| Smelt Copper | App | 3×CopperOre(12)+1×Coal(12)=24g | 2×16g=28.8g | +4.8g |
| Smelt Ore Chunks | App | 4×IOC(16)+2×Coal(24)=40g | 1×52g=46.8g | +6.8g |
| Forge Nails | App | 1×CopperIngot(16)=16g | 50×1g=45g | +29.0g |
| Iron Fittings | App | 3×IOC(12)+1×Coal(12)=24g | 4×8g=28.8g | +4.8g |
| **Smelt Iron** | **App** | **3×IronOre(18)+2×Coal(24)=42g** | **2×52g=93.6g** | **+51.6g** |
| Smelt Glass | Jour | 5×Sand(25)=25g | 3×12g=32.4g | +7.4g |
| Smelt Silver | Jour | 3×SilverOre(90)+1×Coal(12)=102g | 2×72g=129.6g | +27.6g |
| Smelt Gold | Jour | 3×GoldOre(120)+1×Coal(12)=132g | 1×185g=166.5g | +34.5g |
| Smelt Steel | Craft | 2×IronIngot(104)+3×Coal(36)=140g | 1×210g=189g | +49.0g |
| Smelt Mithril | Expert | 5×MithrilOre(400)+3×Coal(36)=436g | 1×700g=630g | +194.0g |
| Smelt Adamantine | Master | 8×AdOre(1200)+5×Coal(60)+1×AR(35)=1295g | 1×2350g=2115g | +820.0g |

**Summary:** All 11 recipes profitable! Best current: Smelt Iron +51.6g/day → **361.2g/week**

**B. Property & Tax**
- Smeltery (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as %: 2.4% | Tax revolt: No

**D. Verdict: VIABLE** — Excellent margins. Critical bottleneck profession (feeds BLACKSMITH, ARMORER, JEWELER).

---

### 2.11 BLACKSMITH (Crafting)

**A. Income Analysis — 28 Recipes (inputs not fully specified in YAML)**

BLACKSMITH recipes are listed as string arrays in Section 3 with base_values in Section 10. Exact input quantities are NOT in the YAML for most recipes.

**Estimated margins (Apprentice, ~2-3 IOC + 1-2 Wood):**
| Recipe | Base Value | Est. Input | Est. Net Margin |
|--------|-----------|------------|-----------------|
| Iron Sword | 22g | ~13g (3×IOC+1×Wood) | +6.8g |
| Iron Shield | 25g | ~17g (3×IOC+2×Wood) | +5.5g |
| Iron Helm | 20g | ~13g | +5.0g |

**Estimated margins (Specialist, Silver Ore + Hardwood):**
| Recipe | Base Value | Est. Input | Est. Net Margin |
|--------|-----------|------------|-----------------|
| Silver Longsword | 110g | ~85g (2×SO+1×HW) | +14.0g |
| Silver Battleaxe | 120g | ~97g | +11.0g |
| Silver-Studded Plate | 130g | ~97g | +20.0g |

**Best estimated:** Specialist tier ~+14-20g/craft → **~98-140g/week**

**B. Property & Tax**
- Smithy (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as %: ~6-9% | Tax revolt: No

**D. Verdict: VIABLE (estimated)** — Cannot confirm exact margins without full input specs in YAML. ⚠️ **DATA GAP: BLACKSMITH recipe inputs need to be fully specified.**

---

### 2.12 ARMORER (Crafting)

**A. Income Analysis — 25 Recipes (inputs not fully specified)**

ARMORER recipes list only base_values and slot types. Input quantities are NOT in the YAML.

**Estimated margins:**
| Recipe | Base Value | Est. Input | Est. Net |
|--------|-----------|------------|----------|
| Copper Chestplate | 90g | ~66g (3×CI+1×CL) | +15g |
| Iron Chestplate | 250g | ~192g (3×II+2×CL) | +33g |
| Steel Chestplate | 950g | ~490g (2×SI+2×CL+BL) | +365g |

**Best estimated (Journeyman):** Iron Chestplate ~+33g → **~231g/week**

**B. Property & Tax**
- Smithy (100g) + Cottage (25g) = 125g assessed (shares SMITHY with BLACKSMITH)
- Weekly tax at 7%: 8.75g

**D. Verdict: VIABLE (estimated)** — ⚠️ **DATA GAP: ARMORER recipe inputs need to be fully specified.** Journeyman+ likely profitable given high base_values.

---

### 2.13 TANNER (Crafting)

**A. Income Analysis — All 15 Recipes (FULLY SPECIFIED)**

| Recipe | Tier | Inputs (cost) | Output × base_value | Net Margin |
|--------|------|--------------|---------------------|------------|
| Cured Leather | T1 proc | 3×AP(24)=24g | 2×18g=32.4g | +8.4g |
| Wolf Leather | T3 proc | 2×WolfPelts(56)=56g | 1×73g=65.7g | +9.7g |
| Bear Leather | T3 proc | 2×BearHides(70)=70g | 1×91g=81.9g | +11.9g |
| Leather Cap | T1 | 2×CL(36)=36g | 1×47g=42.3g | +6.3g |
| Leather Satchel | T1 | 2×CL(36)+1×AP(8)=44g | 1×58g=52.2g | +8.2g |
| Leather Vest | T1 | 3×CL(54)=54g | 1×71g=63.9g | +9.9g |
| Leather Belt | T1 | 2×CL(36)=36g | 1×47g=42.3g | +6.3g |
| Leather Armor | T2 | 4×CL(72)+2×AP(16)=88g | 1×124g=111.6g | +23.6g |
| Leather Bracers | T2 | 3×CL(54)=54g | 1×76g=68.4g | +14.4g |
| Leather Greaves | T2 | 3×CL(54)+1×AP(8)=62g | 1×87g=78.3g | +16.3g |
| Quiver | T2 | 3×CL(54)+2×AP(16)=70g | 1×98g=88.2g | +18.2g |
| Wolf Leather Armor | T3 | 3×WL(219)+2×CL(36)=255g | 1×383g=344.7g | +89.7g |
| Wolf Leather Hood | T3 | 2×WL(146)+1×CL(18)=164g | 1×246g=221.4g | +57.4g |
| **Bear Hide Cuirass** | **T3** | **3×BL(273)+2×CL(36)+1×AP(8)=317g** | **1×476g=428.4g** | **+111.4g** |
| Ranger's Quiver | T3 | 2×WL(146)+2×CL(36)+1×BH(35)=217g | 1×326g=293.4g | +76.4g |

**Summary:** ALL 15 recipes profitable! Best: Bear Hide Cuirass +111.4g/day → **779.8g/week**

**B. Property & Tax**
- Tannery (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as %: 1.1% | Tax revolt: No

**C. Encounter Loot:** Pelts from HUNTER (not monster encounters), but HUNTER gets pelts from hunting grounds.

**D. Verdict: VIABLE** ✅ — **FIXED FROM v4 (was UNDERWATER).** All value-destructive chains eliminated. Bear Hide Cuirass is the 3rd highest-margin recipe in the game.

---

### 2.14 LEATHERWORKER (Crafting)

**A. Income Analysis — 13 Recipes (inputs from Section 10 comments)**

| Recipe | Tier | Inputs (cost) | Output base_value | Net Margin |
|--------|------|--------------|-------------------|------------|
| Leather Gloves | App | 2×CL+1×AP=44g | 52g=46.8g | +2.8g |
| Leather Boots | App | 2×CL+1×AP=44g | 52g=46.8g | +2.8g |
| Leather Backpack | App | 3×CL=54g | 60g=54g | 0g |
| Leather Waterskin | App | 1×CL+1×AP=26g | 30g=27g | +1.0g |
| Wolf Leather Gloves | Jour | 1×WL+1×CL=91g | 145g=130.5g | +39.5g |
| Wolf Leather Boots | Jour | 1×WL+1×CL=91g | 145g=130.5g | +39.5g |
| **Toolbelt** | **Jour** | **2×CL+1×WF=56g** | **130g=117g** | **+61.0g** |
| Leather Repair Kit | Jour | 2×CL+Nails=37g | 80g=72g | +35.0g |
| Ranger's Pack | Jour | 1×WL+2×CL+1×WF=129g | 180g=162g | +33.0g |
| Bear Hide Vambraces | Craft | 2×BL+1×CL=200g | 250g=225g | +25.0g |
| Bear Leather Boots | Craft | 1×BL+1×WL=164g | 230g=207g | +43.0g |
| Hunter's Kit | Craft | 1×WL+1×BL+Nails=165g | 200g=180g | +15.0g |
| Explorer's Pack | Craft | 2×BL+1×WL+1×WF=275g | 320g=288g | +13.0g |

**Summary:** All recipes profitable (Backpack break-even). Best: Toolbelt +61g/day → **427g/week**

**B. Property & Tax**
- Tannery (100g, shared) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as %: 2.0% | Tax revolt: No

**D. Verdict: VIABLE** — Solid Journeyman/Craftsman margins. Toolbelt is excellent.

---

### 2.15 TAILOR (Crafting)

**A. Income Analysis — All 17 Recipes (FULLY SPECIFIED)**

| Recipe | Tier | Inputs (cost) | Output × base_value | Net Margin |
|--------|------|--------------|---------------------|------------|
| Spin Cloth | T1 proc | 3×Cotton(12)=12g | 2×8g=14.4g | +2.4g |
| Weave Cloth | T1 proc | 3×Wool(30)=30g | 2×20g=36g | +6.0g |
| Fine Cloth | T3 proc | 3×FineWool(90)=90g | 2×59g=106.2g | +16.2g |
| Silk Fabric | T3 proc | 3×Cocoons(114)=114g | 2×75g=135g | +21.0g |
| Cloth Hood | T1 | 2×WC(40)=40g | 1×52g=46.8g | +6.8g |
| Cloth Sash | T1 | 1×WC(20)+1×CL(18)=38g | 1×50g=45g | +7.0g |
| Cloth Robe | T1 | 4×WC(80)+1×CL(18)=98g | 1×128g=115.2g | +17.2g |
| Wool Trousers | T1 | 3×WC(60)=60g | 1×78g=70.2g | +10.2g |
| Scholar's Robe | T2 | 5×WC(100)+2×CL(36)=136g | 1×191g=171.9g | +35.9g |
| Traveler's Cloak | T2 | 3×WC(60)+2×CL(36)=96g | 1×135g=121.5g | +25.5g |
| Merchant's Hat | T2 | 2×WC(40)+1×CL(18)=58g | 1×82g=73.8g | +15.8g |
| Herbalist's Apron | T2 | 3×WC(60)+2×CL(36)=96g | 1×135g=121.5g | +25.5g |
| Archmage's Robe | T3 | 4×FC(236)+2×SF(150)+1×WL(73)=459g | 1×689g=620.1g | +161.1g |
| Diplomat's Regalia | T3 | 3×SF(225)+2×FC(118)+1×SO(30)=373g | 1×560g=504g | +131.0g |
| Silk Hood of Insight | T3 | 2×SF(150)+1×FC(59)=209g | 1×314g=282.6g | +73.6g |
| Noble's Leggings | T3 | 3×FC(177)+2×WL(146)=323g | 1×485g=436.5g | +113.5g |
| **Enchanted Cloak** | **T3** | **3×SF(225)+3×FC(177)+2×BL(182)+1×GM(32)=616g** | **1×986g=887.4g** | **+271.4g** |

**Summary:** ALL 17 recipes profitable! Best: Enchanted Cloak +271.4g/day → **1899.8g/week**

**B. Property & Tax**
- Workshop T1 (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as %: 0.5% | Tax revolt: No

**D. Verdict: VIABLE** ✅ — **FIXED FROM v4 (was UNDERWATER).** Enchanted Cloak is the single most profitable recipe in the game. Wool repricing (15→10g) and armor repricing fixed all chains.

---

### 2.16 ALCHEMIST (Crafting) ⚠️ CRITICAL PROBLEM

**A. Income Analysis — All 11 Recipes (FULLY SPECIFIED)**

| Recipe | Tier | Inputs (cost) | Output base_value | Net Margin | Status |
|--------|------|--------------|-------------------|------------|--------|
| Minor Healing Potion | App | 2×WH(10)+1×Clay(4)=14g | 12g=10.8g | **-3.2g** | UNDERWATER |
| Antidote | App | 2×WH(10)=10g | 10g=9g | **-1.0g** | UNDERWATER |
| Berry Salve | App | 2×WB(6)+1×WH(5)=11g | 10g=9g | **-2.0g** | UNDERWATER |
| Healing Potion | Jour | 3×WH(15)+1×Clay(4)=19g | 22g=19.8g | +0.8g | MARGINAL |
| Elixir of Strength | Jour | 2×WH(10)+1×MH(28)=38g | 25g=22.5g | **-15.5g** | VERY UNDERWATER |
| Elixir of Wisdom | Jour | 2×WH(10)+1×MH(28)=38g | 25g=22.5g | **-15.5g** | VERY UNDERWATER |
| Poison Resistance Tonic | Jour | 2×WH(10)+1×WB(3)=13g | 20g=18g | **+5.0g** | Best recipe |
| Greater Healing Potion | Craft | 2×MH(56)+1×Clay(4)=60g | 55g=49.5g | **-10.5g** | UNDERWATER |
| Elixir of Fortitude | Craft | 1×MH(28)+1×GM(32)+1×Clay(4)=64g | 60g=54g | **-10.0g** | UNDERWATER |
| Glowcap Extract | Craft | 2×GM(64)=64g | 50g=45g | **-19.0g** | VERY UNDERWATER |
| Universal Antidote | Craft | 1×MH(28)+1×GM(32)+1×WH(5)=65g | 65g=58.5g | **-6.5g** | UNDERWATER |

**Summary:** 8 of 11 recipes UNDERWATER. Only 2 profitable:
- Poison Resistance Tonic: +5.0g
- Healing Potion: +0.8g (barely)
- Best: +5.0g/day → **35g/week** ← WORST CRAFTING PROFESSION

**Root Cause:** The base_value completion pass set consumable prices using a "lower base_value for consumables (utility in repeat demand)" rule, but herb inputs (especially Medicinal Herbs 28g and Glowcap Mushrooms 32g) are expensive. Elixir of Strength costs 38g in inputs but sells for 25g — a 0.66× ratio. Greater Healing Potion costs 60g but sells for 55g — a 0.92× ratio. These are value-destructive.

**B. Property & Tax**
- Workshop T1 (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as % of income: **25%** | Tax revolt: Near

**D. Verdict: UNDERWATER** ❌ — 8 of 11 recipes lose money. A Craftsman ALCHEMIST loses gold on every craft. **Needs immediate rebalancing.**

---

### 2.17 ENCHANTER (Crafting)

**A. Income Analysis — 13 Recipes**

Original 9 recipes list only `magical_inputs` — mundane inputs are NOT specified in the YAML.
4 new recipes (Earthen, Vitality, Nature's Ward, True Sight) have COMPLETE input data.

**Recipes with complete input data:**

| Recipe | Tier | Magical Cost | Mundane Cost | Total Input | Output | Net Margin | Magic % |
|--------|------|-------------|-------------|-------------|--------|------------|---------|
| Earthen Enchantment | Craft | 3×EarthCrystal=36g | 1×II(52)+1×AR(35)+2×Coal(24)=111g | 147g | 250g=225g | **+78g** | 24.5% |
| Vitality Enchantment | Craft | 2×HSap(20)+1×TB(15)=35g | 1×AR(35)+1×SI(72)=107g | 142g | 220g=198g | **+56g** | 24.6% |
| Nature's Ward | Expert | 2×LB(16)+1×HSap(10)+1×FT(35)=61g | 1×AR(35)+1×SI(72)=107g | 168g | 300g=270g | **+102g** | 36.3% |
| **True Sight** | **Expert** | **2×BE(40)=40g** | **1×Gem(25)+1×AR(35)+1×SI(72)+2×Coal(24)=156g** | **196g** | **350g=315g** | **+119g** | **20.4%** |

**Original 9 recipes (magical cost only, mundane unknown):**

| Recipe | Tier | Magical Cost | Output base_value | Max Possible Margin |
|--------|------|-------------|-------------------|-------------------|
| Fortified | App | 2×LB=16g | 80g | ≤+56g |
| Flaming | Jour | 2×EC=30g | 130g | ≤+87g |
| Frost | Jour | 2×FE=30g | 130g | ≤+87g |
| Lightning | Jour | 2×SF=30g | 175g | ≤+127.5g |
| Swift | Jour | 1×OS+1×WM=24g | 160g | ≤+120g |
| Poisoned | Jour | 3×SV=36g | 200g | ≤+144g |
| Warding | Jour | 1×BS=25g | 210g | ≤+163.9g |
| Holy | Craft | 2×FT=70g | 450g | ≤+335g |
| Shadow | Craft | 2×SE=60g | 450g | ≤+345g |

**Summary:** 4 complete recipes: all highly profitable (+56g to +119g). Original 9: likely profitable given high base_values, but exact margins depend on undocumented mundane inputs.

**Magical component % of total input:** 20-37% on complete recipes (within 20-40% design target).

**B. Property & Tax**
- Enchanting Tower (200g) + Cottage (25g) = 225g assessed
- Weekly tax at 7%: 15.75g | Tax as % (best recipe): 1.9% | Tax revolt: No

**D. Verdict: VIABLE** — New Expert-tier recipes are excellent. Best: True Sight +119g/day → **833g/week**. ⚠️ Original 9 recipes need mundane inputs documented.

---

### 2.18 SCRIBE (Crafting)

**A. Income Analysis — 11 Recipes**

Area Map (L5) is mundane-only, inputs unspecified. 6 Journeyman recipes list only magical inputs. 4 new Craftsman recipes have complete data.

**Complete recipes:**

| Recipe | Tier | Magical Cost | Mundane Cost | Total | Output | Net Margin | Magic % |
|--------|------|-------------|-------------|-------|--------|------------|---------|
| Stone Skin | Craft | 1×EC=12g | 1×AR(35)+2×SP(6)=41g | 53g | 90g=81g | **+28g** | 22.6% |
| Might | Craft | 1×OS=12g | 1×AR(35)+2×SP(6)=41g | 53g | 85g=76.5g | **+23.5g** | 22.6% |
| **Entangle** | **Craft** | **1×LB(8)+1×DB(15)=23g** | **1×MH(28)+1×SP(3)=31g** | **54g** | **100g=90g** | **+36g** | **42.6%** |
| **Restoration** | **Craft** | **1×FT(35)+1×TB(15)=50g** | **1×MH(28)+1×SP(3)=31g** | **81g** | **130g=117g** | **+36g** | **61.7%** |

**Journeyman recipes (magical cost only):**

| Recipe | Magical Cost | Output | Max Possible Margin |
|--------|-------------|--------|-------------------|
| Scroll of Fire | 1×EC=15g | 60g | ≤+39g |
| Identification | 1×WM=8g | 50g | ≤+37g |
| Scroll of Ice | 1×FE=15g | 80g | ≤+57g |
| Scroll of Healing | 1×TB=15g | 100g | ≤+75g |
| Dungeon Map | 1×SD=10g | 80g | ≤+62g |
| Scroll of Lightning | 1×SF=15g | 120g | ≤+93g |

**Summary:** 4 complete recipes profitable (+23.5g to +36g). Best: Entangle/Restoration +36g → **252g/week**

**Note:** Scroll of Restoration has 61.7% magical component cost — above the 20-40% target. Fey Tear (35g) is the driver.

**B. Property & Tax**
- Scribe Study (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g | Tax as %: 3.5% | Tax revolt: No

**D. Verdict: VIABLE** — Craftsman recipes are solid. Journeyman recipes likely profitable too given high output values vs low single-component costs.

---

### 2.19 JEWELER (Crafting)

**A. Income Analysis — 12 Recipes (inputs not fully specified)**

Only base_values are listed in Section 10. Input quantities must be estimated from ingot/gem costs.

**Estimated margins:**

| Recipe | Tier | Est. Input | Base Value | Est. Net |
|--------|------|-----------|------------|----------|
| Copper Ring | App | ~2×CI(32)=32g | 50g=45g | +13g |
| Copper Necklace | App | ~3×CI(48)=48g | 60g=54g | +6g |
| Iron Ring | Jour | ~1×II(52)=52g | 120g=108g | +56g |
| Silver Ring | Jour | ~2×SI(144)=144g | 200g=180g | +36g |
| Gold Ring | Craft | ~2×GI(370)=370g | 450g=405g | +35g |
| Crown of Wisdom | Expert | ~1×MI+gems | 2000g | High margin likely |

**Best practical:** Iron Ring ~+56g/day → **392g/week** (if input estimate is correct)

**B. Property & Tax**
- Jeweler Workshop (100g) + Cottage (25g) = 125g assessed
- Weekly tax at 7%: 8.75g

**D. Verdict: VIABLE (estimated)** — ⚠️ **DATA GAP: Input quantities unspecified.** High base_values suggest healthy margins.

---

### 2.20 FLETCHER (Crafting)

**A. Income Analysis — 13 Recipes (inputs not fully specified)**

| Recipe | Tier | Est. Input | Base Value | Est. Net |
|--------|------|-----------|------------|----------|
| Bowstring | App | ~1×CL strip=9g | 6g=5.4g | -3.6g |
| Arrows (10) | App | ~2×SP(6)+1×Dowels(4)=10g | 10×2g=18g | +8g |
| Shortbow | App | 1×BS(8)+1×Bow(6)=14g | 20g=18g | +4g |
| Hunting Bow | App | ~22g | 30g=27g | +5g |
| Composite Bow | Craft | ~90g | 150g=135g | +45g |
| Ranger's Longbow | Craft | ~120g | 200g=180g | +60g |

**Best estimated:** Ranger's Longbow ~+60g → **420g/week** (highly speculative)

**D. Verdict: VIABLE (estimated)** — ⚠️ **DATA GAP: Input quantities unspecified.** Bowstring appears underwater.

---

### 2.21 MASON (Crafting)

**A. Income Analysis — 12 Recipes (inputs not fully specified)**

| Recipe | Tier | Est. Input | Base Value | Est. Net |
|--------|------|-----------|------------|----------|
| Cut Stone (L1) | App | ~2×Stone(14)=14g | 12g=10.8g | -3.2g |
| Cut Stone (L3) | App | ~2×Stone(14)=14g | 15g=13.5g | -0.5g |
| Bricks (L5) | App | ~3×Clay(12)+1×Coal(12)=24g | 15g=13.5g | -10.5g |
| Stone Slab | App | ~3×Stone(21)+1×Coal(12)=33g | 25g=22.5g | -10.5g |
| Stone Hearth | Jour | ~4×Cut Stone+Wood | 60g=54g | Est. +10g? |
| Brick Oven | Jour | ~6×Bricks+Iron | 90g=81g | Est. +15g? |
| Stone Fountain | Jour | ~complex | 200g=180g | Unknown |
| Marble Statue | Craft | ~Polished Marble+complex | 350g=315g | Unknown |

**Summary:** Processing recipes appear UNDERWATER. Housing items might be profitable but inputs are speculative.

**D. Verdict: MARGINAL (estimated)** — ⚠️ **DATA GAP: No input quantities.** Processing recipes (Cut Stone, Bricks) appear value-destructive. Housing items (60g-350g) need input specs to verify.

---

### 2.22 WOODWORKER (Crafting)

**A. Income Analysis — 25 Recipes (inputs not fully specified)**

From Section 10 base_values and known input costs:

| Recipe | Tier | Est. Input | Base Value | Est. Net |
|--------|------|-----------|------------|----------|
| Rough Planks | App proc | 1×Wood(5)=5g | ~3×4g=10.8g | +5.8g |
| Softwood Planks | App proc | ~2×SW(6)=6g | ~3×3g=8.1g | +2.1g |
| Wooden Handle | App proc | ~1×Wood(5)=5g | 5g=4.5g | -0.5g |
| Bow Stave | App proc | ~2×Wood(10)=10g | 8g=7.2g | -2.8g |
| Wooden Chair | App | ~3×Planks+Nails=14g | 15g=13.5g | -0.5g |
| Tanning Rack | Jour | ~Planks+Handle+Nails=15g | 35g=31.5g | +16.5g |
| Storage Chest | Jour | ~Planks+Nails+Handle=18g | 45g=40.5g | +22.5g |
| Wooden Bed Frame | Jour | ~Planks+Cloth+Nails=25g | 50g=45g | +20g |
| Reinforced Crate | Craft | ~HW Planks+Iron=40g | 65g=58.5g | +18.5g |

**Best estimated:** Storage Chest ~+22.5g → **157.5g/week** (speculative)

**D. Verdict: VIABLE (estimated)** — ⚠️ **DATA GAP: Processing intermediates may be marginal. Finished goods appear profitable.**

---

### 2.23-2.29 SERVICE PROFESSIONS (7)

| # | Profession | Status | Income Model | Verdict |
|---|-----------|--------|-------------|---------|
| 2.23 | MERCHANT | LIVE | Reduced market fees, trade commissions | TAX-IMMUNE (no workshop) |
| 2.24 | INNKEEPER | PLANNED | Sells food/drink, rest bonuses | N/A |
| 2.25 | HEALER | PLANNED | Heals players using potions | N/A |
| 2.26 | STABLE MASTER | PLANNED | Mount services, travel speed | N/A |
| 2.27 | BANKER | PLANNED | Loans, interest, gold storage | N/A |
| 2.28 | COURIER | PLANNED | Item delivery, faster travel | N/A |
| 2.29 | MERCENARY CAPTAIN | PLANNED | Combat services | N/A |

Service professions don't craft or gather — they earn through service fees. Only MERCHANT is implemented. They have no workshop property and thus minimal tax burden. All PLANNED professions excluded from income rankings.

---

## Part 3: Cross-Profession Comparison Tables

### Table A: Income Rankings (All 29, by weekly net income at best available tier)

| Rank | Profession | Type | Best Recipe/Resource | Weekly Income | Tier |
|------|-----------|------|---------------------|---------------|------|
| 1 | TAILOR | Crafting | Enchanted Cloak | 1,899.8g | Craftsman |
| 2 | ENCHANTER | Crafting | True Sight Scroll | 833.0g | Expert |
| 3 | TANNER | Crafting | Bear Hide Cuirass | 779.8g | Craftsman |
| 4 | MINER | Gathering | Silver Ore | 472.5g | Craftsman |
| 5 | LEATHERWORKER | Crafting | Toolbelt | 427.0g | Journeyman |
| 6 | FLETCHER | Crafting | Ranger's Longbow (est.) | ~420.0g | Craftsman |
| 7 | LUMBERJACK | Gathering | Hardwood | 393.75g | Journeyman |
| 8 | JEWELER | Crafting | Iron Ring (est.) | ~392.0g | Journeyman |
| 9 | FISHERMAN | Gathering | Trout/Perch mix | 370.1g | Craftsman |
| 10 | SMELTER | Crafting | Smelt Iron | 361.2g | Apprentice |
| 11 | HERBALIST | Gathering | Medicinal/Glowcap mix | 354.4g | Craftsman |
| 12 | HUNTER | Gathering | Wolf Pelts/Bear Hides | 340.0g | Craftsman |
| 13 | RANCHER | Gathering | Full livestock | 276.0g | Craftsman |
| 14 | SCRIBE | Crafting | Entangle/Restoration | 252.0g | Craftsman |
| 15 | ARMORER | Crafting | Iron Chestplate (est.) | ~231.0g | Journeyman |
| 16 | COOK | Crafting | Smoked Fish | 221.2g | Journeyman |
| 17 | FARMER | Gathering | Craftsman Hops | 189.0g | Craftsman |
| 18 | WOODWORKER | Crafting | Storage Chest (est.) | ~157.5g | Journeyman |
| 19 | BLACKSMITH | Crafting | Silver Longsword (est.) | ~140.0g | Specialist |
| 20 | RANCHER (App) | Gathering | Chickens+Sheep | 117.6g | Apprentice |
| 21 | BREWER | Crafting | Grape Wine | 77.0g | Craftsman |
| 22 | FARMER (App) | Gathering | Grain fields | 75.6g | Apprentice |
| 23 | ALCHEMIST | Crafting | Poison Resistance Tonic | **35.0g** | Journeyman |
| — | MERCHANT | Service | Trade commissions | N/A | — |
| — | INNKEEPER-COURIER | Service | PLANNED | N/A | — |

### Table B: Tax Burden Rankings (at 7% combined rate)

| Rank | Profession | Assessed Value | Weekly Tax | Weekly Income | Tax as % |
|------|-----------|---------------|------------|---------------|----------|
| 1 | ALCHEMIST | 125g | 8.75g | 35g | **25.0%** |
| 2 | BREWER | 125g | 8.75g | 77g | 11.4% |
| 3 | RANCHER (App) | 385g | 26.95g | 117.6g | 22.9% |
| 4 | BLACKSMITH | 125g | 8.75g | ~140g | ~6.3% |
| 5 | FARMER (App) | 175g | 12.25g | 75.6g | 16.2% |
| 6 | WOODWORKER | 125g | 8.75g | ~157.5g | ~5.6% |
| 7 | COOK | 125g | 8.75g | 221.2g | 4.0% |
| 8 | SCRIBE | 125g | 8.75g | 252g | 3.5% |
| 9 | LEATHERWORKER | 125g | 8.75g | 427g | 2.0% |
| 10 | ENCHANTER | 225g | 15.75g | 833g | 1.9% |
| 11 | SMELTER | 125g | 8.75g | 361.2g | 2.4% |
| 12 | TANNER | 125g | 8.75g | 779.8g | 1.1% |
| 13 | TAILOR | 125g | 8.75g | 1899.8g | 0.5% |

### Table C: Viability Summary

| Profession | Weekly Income | Weekly Tax (7%) | Net After Tax | Verdict | Changed from v4? |
|-----------|--------------|----------------|--------------|---------|-----------------|
| TAILOR | 1,899.8g | 8.75g | 1,891g | **VIABLE** | ✅ Was UNDERWATER |
| ENCHANTER | 833.0g | 15.75g | 817g | **VIABLE** | New recipes added |
| TANNER | 779.8g | 8.75g | 771g | **VIABLE** | ✅ Was UNDERWATER |
| MINER | 472.5g | 5.25g | 467g | **VIABLE** | Unchanged |
| LEATHERWORKER | 427.0g | 8.75g | 418g | **VIABLE** | New profession |
| FLETCHER | ~420g | 8.75g | ~411g | **VIABLE (est.)** | New base_values |
| LUMBERJACK | 393.75g | 5.25g | 389g | **VIABLE** | Unchanged |
| JEWELER | ~392g | 8.75g | ~383g | **VIABLE (est.)** | New base_values |
| FISHERMAN | 370.1g | 5.25g | 365g | **VIABLE** | New Craftsman tier |
| SMELTER | 361.2g | 8.75g | 352g | **VIABLE** | New profession |
| HERBALIST | 354.4g | 5.25g | 349g | **VIABLE** | Unchanged |
| HUNTER | 340.0g | 5.25g | 335g | **VIABLE** | Unchanged |
| RANCHER | 276.0g | 26.95g | 249g | **VIABLE** | Unchanged |
| SCRIBE | 252.0g | 8.75g | 243g | **VIABLE** | New recipes added |
| ARMORER | ~231g | 8.75g | ~222g | **VIABLE (est.)** | New base_values |
| COOK | 221.2g | 8.75g | 212g | **VIABLE** | Fish recipes added |
| FARMER | 189.0g | 12.25g | 177g | **VIABLE** | Unchanged |
| WOODWORKER | ~157.5g | 8.75g | ~149g | **VIABLE (est.)** | New base_values |
| BLACKSMITH | ~140g | 8.75g | ~131g | **VIABLE (est.)** | New base_values |
| BREWER | 77.0g | 8.75g | 68g | **VIABLE** | New profession |
| ALCHEMIST | 35.0g | 8.75g | **26g** | **UNDERWATER** ❌ | ✅ Was "viable" in v4 |

### Table D: ENCHANTER/SCRIBE Impact — Before vs After Magical Components

| Profession | Metric | Before Components | After Components | Change |
|-----------|--------|------------------|-----------------|--------|
| ENCHANTER | Input cost (4 new recipes avg) | Mundane only (~107g) | Mundane + Magical (~163g avg) | +52% |
| ENCHANTER | Output base_value (4 new avg) | N/A (new recipes) | 280g avg | — |
| ENCHANTER | Net margin (4 new avg) | N/A | +88.75g avg | Healthy |
| ENCHANTER | Magical % of input | 0% | 20-37% | On target |
| SCRIBE | Input cost (4 new recipes avg) | Mundane only (~36g) | Mundane + Magical (~60g avg) | +67% |
| SCRIBE | Output base_value (4 new avg) | N/A (new recipes) | 101g avg | — |
| SCRIBE | Net margin (4 new avg) | N/A | +30.9g avg | Healthy |
| SCRIBE | Magical % of input | 0% | 23-62% | Restoration above target |

**Verdict:** Adding magical components did NOT hurt ENCHANTER/SCRIBE viability. The new recipes with components have excellent margins. The pre-existing 9 ENCHANTER / 6 SCRIBE recipes still need mundane inputs documented to verify they remain viable with the added component costs.

---

## Part 4: Supply Chain Validation

### 4.1 Magical Component Coverage

All 18 magical components verified:

| Component | Base Value | Monster Source | Recipe Destination(s) | Orphan? |
|-----------|-----------|---------------|----------------------|---------|
| Ember Core | 15g | Fire Elemental (L12) | ENCHANTER (Flaming) + SCRIBE (Fire) | No |
| Frost Essence | 15g | Ice Wraith (L10) | ENCHANTER (Frost) + SCRIBE (Ice) | No |
| Storm Feather | 15g | Storm Hawk (L6) | ENCHANTER (Lightning) + SCRIBE (Lightning) | No |
| Earth Crystal | 12g | Stone Golem (L10) | ENCHANTER (Earthen) + SCRIBE (Stone Skin) | No |
| Troll Blood | 15g | Troll (L10) | SCRIBE (Healing, Restoration) + ENCHANTER (Vitality) | No |
| Fey Tear | 35g | Corrupted Dryad (L13) | ENCHANTER (Holy, Nature's Ward) + SCRIBE (Restoration) | No |
| Heartwood Sap | 10g | Treant (L8) | ENCHANTER (Vitality, Nature's Ward) | No |
| Basilisk Scale | 25g | Basilisk (L13) | ENCHANTER (Warding) | No |
| Wyvern Scale | 45g | Wyvern (L16) | ENCHANTER (planned future) | ⚠️ No current recipe |
| Ogre Sinew | 12g | Ogre (L9) | ENCHANTER (Swift) + SCRIBE (Might) | No |
| Wind Mote | 12g | Storm Hawk (L6) | ENCHANTER (Swift) | No |
| Basilisk Eye | 20g | Basilisk (L13) | ENCHANTER (True Sight) + SCRIBE (planned) | No |
| Shadow Essence | 30g | Shadow Stalker (L14) | ENCHANTER (Shadow) | No |
| Wisp Mote | 8g | Will-o'-Wisp (L7) | SCRIBE (Identification) | No |
| Spectral Dust | 10g | Grave Wight (L11) | SCRIBE (Dungeon Map) | No |
| Living Bark | 8g | Treant (L8) | ENCHANTER (Fortified, Nature's Ward) + SCRIBE (Entangle) | No |
| Dryad Blossom | 15g | Corrupted Dryad (L13) | SCRIBE (Entangle) | No |
| Spider Venom | 12g | Giant Spider (L7) | ENCHANTER (Poisoned) + ALCHEMIST (future) | No |

**Issues found:**
- ⚠️ **Wyvern Scale (45g)** — Listed in ENCHANTER `magical_component_inputs` but NO current recipe uses it. It's the most expensive component with no crafting destination. Needs a recipe or should be flagged as future-only.

### 4.2 Value-Destructive Chain Check

| Chain | v4 Status | v5 Status | Fix Applied |
|-------|----------|----------|-------------|
| Wolf Pelts → Wolf Leather | Destructive (56g→35g) | **FIXED** (56g→73g) | WL repriced 35→73g |
| Bear Hides → Bear Leather | Destructive (70g→42g) | **FIXED** (70g→91g) | BL repriced 42→91g |
| Fine Wool → Fine Cloth | Destructive (90g/2=45g→38g) | **FIXED** (45g→59g) | FC repriced 38→59g |
| Cocoons → Silk Fabric | Destructive (114g/2=57g→45g) | **FIXED** (57g→75g) | SF repriced 45→75g |
| Medicinal Herbs → Greater HP | N/A (new) | **DESTRUCTIVE** (60g→55g) | ❌ NOT FIXED |
| Glowcap → Glowcap Extract | N/A (new) | **DESTRUCTIVE** (64g→50g) | ❌ NOT FIXED |
| Herbs+MH → Elixir of Strength | N/A (new) | **DESTRUCTIVE** (38g→25g) | ❌ NOT FIXED |

**Result:** TANNER and TAILOR chains are FIXED. ALCHEMIST has 3 new value-destructive chains introduced by the base_value completion pass.

### 4.3 Orphan Materials Check

| Material | Has Source? | Has Recipe Consumer? | Status |
|----------|-----------|---------------------|--------|
| Wyvern Scale | Yes (Wyvern) | **No current recipe** | ⚠️ ORPHAN |
| All other 17 components | Yes | Yes | OK |
| All raw materials | Yes | Yes | OK |

### 4.4 Missing Input Sources

No recipes reference inputs without a source. All raw materials trace to gathering spots, FARMER fields, RANCHER livestock, or monster encounters.

---

## Part 5: Problem Professions

### P0: ALCHEMIST — CRITICAL (8 of 11 recipes underwater)

**Root Cause:** base_value completion pass applied "consumable discount" to potion prices but didn't account for expensive Craftsman-tier herb inputs (Medicinal Herbs 28g, Glowcap Mushrooms 32g).

**Specific fixes needed:**

| Recipe | Current Input→Output | Current Ratio | Fix: New base_value | New Margin |
|--------|---------------------|--------------|--------------------|-----------|
| Minor Healing Potion | 14g→12g | 0.86× | **20g** (1.43×) | +4g |
| Antidote | 10g→10g | 1.0× | **15g** (1.50×) | +3.5g |
| Berry Salve | 11g→10g | 0.91× | **16g** (1.45×) | +3.4g |
| Elixir of Strength | 38g→25g | 0.66× | **55g** (1.45×) | +11.5g |
| Elixir of Wisdom | 38g→25g | 0.66× | **55g** (1.45×) | +11.5g |
| Greater Healing Potion | 60g→55g | 0.92× | **85g** (1.42×) | +16.5g |
| Elixir of Fortitude | 64g→60g | 0.94× | **95g** (1.48×) | +21.5g |
| Glowcap Extract | 64g→50g | 0.78× | **90g** (1.41×) | +17g |
| Universal Antidote | 65g→65g | 1.0× | **95g** (1.46×) | +20.5g |

**Priority:** IMMEDIATE — ALCHEMIST is currently unplayable for profit.

### P1: MASON — DATA GAP (processing recipes likely underwater)

**Root Cause:** No input quantities specified for any of the 12 recipes. Processing recipes (Cut Stone, Bricks) have low base_values that are likely underwater given Stone Blocks (7g), Clay (4g), and Coal (12g) input costs.

**Fix:** Specify exact input quantities for all 12 MASON recipes in the YAML, then reprice if needed.

### P2: BLACKSMITH/ARMORER/FLETCHER/JEWELER/WOODWORKER — DATA GAPS

**Root Cause:** These 5 professions (73 recipes total) list recipes as string arrays without input quantities. Base_values were set in Section 10 but cannot be verified without knowing exact inputs.

**Fix:** Add full `inputs:` blocks to these profession recipe sections in the YAML, matching the format used by COOK, TANNER, TAILOR, SMELTER, and BREWER.

### P3: Wyvern Scale — Orphan Component

**Fix:** Either create a Master-tier ENCHANTER recipe using Wyvern Scale, or mark it explicitly as "future content" in the YAML.

### P4: ENCHANTER/SCRIBE Original Recipes — Missing Mundane Inputs

**Root Cause:** 9 ENCHANTER + 6 SCRIBE recipes list only `magical_inputs`. The `mundane_inputs` field is absent, making margin calculation impossible.

**Fix:** Add `mundane_inputs:` to all 15 original recipes following the pattern of the 8 new recipes.

### P5: COOK — 14 Underwater Recipes

**Root Cause:** T1 recipes and some T2/T3 recipes have output base_values below input costs. Wood Logs (5g) as a universal fuel adds significant cost. Intermediates (Flour 5g, Berry Jam 6g) are priced below their input cost.

**Fix (lower priority):** Reprice Flour to 8g, Berry Jam to 10g, and raise base_values on underwater T1 recipes. Alternatively, accept that T1 COOK recipes are XP-training recipes, not profit recipes — COOKs earn from T2+ fish and livestock recipes.

### P6: Scroll of Restoration — High Magical %

Magical components represent 61.7% of total input cost (target: 20-40%). Fey Tear (35g) + Troll Blood (15g) = 50g of 81g total.

**Fix:** Either increase base_value from 130g to 150g, or reduce Fey Tear requirement to maintain the 40% target.

---

## Part 6: Economy Health Scorecard

| Metric | v4 | v5 | Change |
|--------|----|----|--------|
| Professions Viable at 7% tax | 14/22 assessed (64%) | **19/22 assessed (86%)** | +22% |
| Professions Underwater | 2 (TANNER, TAILOR) | **1 (ALCHEMIST)** | -1 |
| Professions Marginal | 3 | 1 (MASON estimated) | -2 |
| Income inequality (highest/lowest crafter) | ~10:1 | **54:1** (TAILOR 1899g / ALCHEMIST 35g) | Worse |
| Supply chain completeness | 85% | **95%** (18 components connected) | +10% |
| Orphan materials | 0 | **1** (Wyvern Scale) | +1 |
| Value-destructive chains | 4 | **3** (all ALCHEMIST) | -1 |
| Magical component economy | N/A | **Healthy** (20-37% of input on complete recipes) | New |
| Recipe data completeness | ~60% | ~65% (73 recipes still lack input specs) | +5% |

### Overall Grade: **B-**

**Justification:**
- **Upgraded from C+** because TANNER and TAILOR — the two worst professions in v4 — are now fully viable with excellent margins
- **Not a B** because ALCHEMIST is now underwater (8/11 recipes), replacing the two fixed professions with one new problem
- **Not a B+** because 73 recipes across 5 professions (BLACKSMITH, ARMORER, FLETCHER, JEWELER, WOODWORKER) still lack input specifications, making verification impossible
- **Income inequality is severe:** TAILOR earns 54× what ALCHEMIST earns. Even excluding ALCHEMIST, the spread is 25:1 (TAILOR vs BREWER)
- **Magical component integration is clean:** 17 of 18 components have recipe destinations, costs are within target range

---

## Part 7: v4 → v5 Delta

### Verdict Changes

| Profession | v4 Verdict | v5 Verdict | Cause |
|-----------|-----------|-----------|-------|
| **TANNER** | UNDERWATER | **VIABLE** ✅ | 12 finished goods repriced (47g-476g), Wolf/Bear Leather repriced |
| **TAILOR** | UNDERWATER | **VIABLE** ✅ | 13 armor repriced (52g-986g), Wool 15g→10g, Fine Cloth 38g→59g, Silk Fabric 45g→75g |
| **ALCHEMIST** | Viable | **UNDERWATER** ❌ | Consumable base_values set too low relative to Craftsman-tier herb inputs |

### Key Questions Answered

**Did the base_value fixes resolve v4's value-destructive chains?**
YES for TANNER and TAILOR. Wolf Leather (35→73g), Bear Leather (42→91g), Fine Cloth (38→59g), Silk Fabric (45→75g) — all now produce positive margins. NO for ALCHEMIST — new value-destructive chains were introduced (Greater HP, Glowcap Extract, Elixirs).

**Did magical component inputs hurt ENCHANTER/SCRIBE margins?**
NO. The 8 new recipes with complete data all have healthy margins (+23.5g to +119g). Magical components add 20-37% to input costs, within the design target. ENCHANTER/SCRIBE are among the most profitable crafting professions.

**Did Wool repricing (15g→10g) fix TAILOR?**
YES. Woven Cloth processing: 3×Wool(30g) → 2×Woven Cloth(36g) = +6g margin. All downstream cloth armor is profitable. The most impactful change was repricing the armor outputs, not just the Wool.

**Are ARMORER and TAILOR still the two underwater professions?**
NO. TAILOR is now the HIGHEST-EARNING profession (1899.8g/week). ARMORER cannot be verified (inputs unspecified) but estimated as viable. The one underwater profession is now ALCHEMIST.

### Significant Number Shifts

| Item | v4 base_value | v5 base_value | Change |
|------|-------------|-------------|--------|
| Wool | 15g | 10g | -33% |
| Wolf Leather | 35g | 73g | +109% |
| Bear Leather | 42g | 91g | +117% |
| Fine Cloth | 38g | 59g | +55% |
| Silk Fabric | 45g | 75g | +67% |
| Enchanted Cloak | N/A | 986g | NEW (highest crafted item) |
| Bear Hide Cuirass | N/A | 476g | NEW |
| Archmage's Robe | N/A | 689g | NEW |

### Next Steps (Priority Order)

1. **ALCHEMIST rebalance** — Reprice 9 recipes per Part 5 P0 fix table
2. **YAML input completion** — Add `inputs:` blocks to BLACKSMITH (28), ARMORER (25), FLETCHER (13), JEWELER (12), WOODWORKER (25), MASON (12) = 115 recipes
3. **ENCHANTER/SCRIBE mundane inputs** — Document mundane inputs for 15 original recipes
4. **Wyvern Scale recipe** — Create a Master-tier ENCHANTER recipe or mark as future
5. **Re-audit** as v6 after fixes 1-4 are applied

