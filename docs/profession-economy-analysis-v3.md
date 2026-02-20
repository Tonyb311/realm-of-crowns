# Profession Economy Analysis v3 — With Finalized Tax System

**Generated:** 2026-02-20
**Basis:** `tax-system-design.md` (assessed values + weekly rates), `profession-economy-master.yaml`, `profession-economy-analysis-v2.md`
**Scope:** All 29 professions (22 active + 7 service)

---

## Executive Summary

The finalized weekly assessed-value tax system is **dramatically lighter** than v2's flat 5g/day workshop tax. Key finding:

| Metric | v2 Tax | v3 Tax (default 7%) | Change |
|--------|--------|---------------------|--------|
| Workshop tax (Basic, weekly) | 35g | 8.75g | **-75%** |
| Workshop tax (Master, weekly) | 105g | 26.25g | **-75%** |
| Plot 1 + building (RANCHER) | 0g | 15.75g | New cost (was untaxed) |
| Cottage only (public gatherers) | 0g | 1.75g | Trivial |

**Impact on viability:**
- **5 professions flip from Marginal/Underwater → Viable:** BREWER, MASON, FLETCHER, SCRIBE, ENCHANTER
- **2 professions remain Marginal** (positive but stressed): TAILOR (processing), JEWELER
- **3 professions remain genuinely Underwater** (negative pre-tax): LEATHERWORKER, ARMORER, TAILOR (armor)
- **All 7 gathering professions are tax-immune** — cottage-only tax is negligible
- **COOK remains the #1 earner** by a wide margin, now even more dominant with lighter tax

**Overall Grade: B+** (up from B- in v2). The tax system is well-calibrated. Remaining problems are recipe margin issues, not tax issues.

---

## Methodology

### Tax Conversion: v2 → v3

v2 crafting professions included a **flat 5g/day (35g/week)** proposed workshop tax in their net income figures. To get v3 numbers:

```
v3 weekly pre-tax income = (v2 daily net + 5g old tax) × 7
v3 weekly tax = total assessed value × combined rate
v3 weekly net = v3 weekly pre-tax income - v3 weekly tax
```

v2 gathering professions had **0g tax** (free plot, public spots). In v3, they pay cottage tax (25g × rate) and optionally plot+building tax.

### Assessed Value Source

All assessed values from `docs/tax-system-design.md` Part 1:

| Property | Assessed Value |
|----------|---------------:|
| Basic Cottage | 25g |
| Workshop T1 (Basic) | 100g |
| Workshop T2 (Improved) | 200g |
| Workshop T3 (Master) | 350g |
| Land Plot 1 (free) | 50g |
| Land Plot 2 | 200g |
| Land Plot 3 | 400g |
| Chicken Coop | 150g |
| Dairy Barn | 100g |
| Sheep Pen | 175g |
| Grain/Veg/Orchard Field | 75g |
| Berry Field | 60g |
| Herb Garden | 80g |
| Market Stall | 50g |
| Inn | 150g |
| Bank | 200g |
| Stable | 100g |
| Mine Claim / Timber Plot / etc. | 75-100g |

### Rate Tiers

| Tier | Town | Kingdom | Combined |
|------|-----:|--------:|---------:|
| Low | 5% | 0% | **5%** |
| Default | 5% | 2% | **7%** |
| High | 8% | 5% | **13%** |
| Max | 25% | 5% | **30%** |

---

## Part 1: Income & Tax by Profession

### 1A. Gathering Professions (7)

All gather at public spots. Assessed base = Cottage (25g) only unless they own private assets.

| Profession | Daily Net | Weekly Pre-Tax | Assessed | Tax 5% | Tax 7% | Tax 13% | Tax 30% | v2 Weekly Net | v3 Weekly Net (7%) |
|-----------|----------:|---------------:|---------:|-------:|-------:|--------:|--------:|--------------:|-------------------:|
| HUNTER | 11.7g | 81.9g | 25g | 1.3g | 1.8g | 3.3g | 7.5g | 81.9g | **80.2g** |
| LUMBERJACK | 9.0g | 63.0g | 25g | 1.3g | 1.8g | 3.3g | 7.5g | 63.0g | **61.3g** |
| MINER | 8.1g | 56.7g | 25g | 1.3g | 1.8g | 3.3g | 7.5g | 56.7g | **54.9g** |
| FISHERMAN | 7.2g | 50.4g | 25g | 1.3g | 1.8g | 3.3g | 7.5g | 50.4g | **48.7g** |
| HERBALIST | 6.75g | 47.3g | 25g | 1.3g | 1.8g | 3.3g | 7.5g | 47.3g | **45.5g** |
| FARMER (public orchard) | 5.4g | 37.8g | 25g | 1.3g | 1.8g | 3.3g | 7.5g | 37.8g | **36.0g** |

**With private assets** (optional expansion):

| Profession | Asset Config | Assessed | Weekly Pre-Tax | Tax at 7% | Weekly Net |
|-----------|-------------|--------:|---------------:|----------:|-----------:|
| FARMER (Plot 1 + Grain + active) | Cottage + Plot + Field | 150g | 75.6g | 10.5g | **65.1g** |
| RANCHER (Plot 1 + Chickens) | Cottage + Plot + Coop | 225g | 128.8g | 15.8g | **113.1g** |
| RANCHER (Plot 1+2 + Chick + Sheep) | +Plot 2 + Sheep Pen | 650g | ~203g | 45.5g | **~157.5g** |
| MINER (private mine claim) | Cottage + Mine Claim | 125g | ~70g (est.) | 8.8g | **~61.3g** |
| HERBALIST (herb garden) | Cottage + Plot + Garden | 155g | ~60g (est.) | 10.9g | **~49.2g** |

**Verdict:** All gathering professions are **Tax-Immune to Viable**. Cottage-only tax (1.8g/week at 7%) is negligible. Even with private assets, tax stays under 20% of income. No gatherer is endangered by the tax system.

### 1B. Crafting Professions (15)

All crafters own Cottage (25g) + Workshop. Base assessed = 125g (cottage + Basic Workshop T1).

Income shown as market-dependent (buy inputs, craft daily) using best recipe. **Pre-tax** column adds back v2's 5g/day workshop tax to recover true income before any tax.

| Profession | Best Recipe | v2 Daily Net | Pre-Tax Daily | Weekly Pre-Tax | Tax 5% | Tax 7% | Tax 13% | Tax 30% |
|-----------|------------|------------:|-------------:|--------------:|-------:|-------:|--------:|--------:|
| COOK | Smoked Fish | 26.6g | 31.6g | 221.2g | 6.3g | 8.8g | 16.3g | 37.5g |
| TANNER | Cured Leather | 3.4g | 8.4g | 58.8g | 6.3g | 8.8g | 16.3g | 37.5g |
| SMELTER | Iron Ingots | ~5.0g | ~10.0g | 70.0g | 6.3g | 8.8g | 16.3g | 37.5g |
| BLACKSMITH | Tools/Weapons | ~5.0g (est.) | ~10.0g | 70.0g | 6.3g | 8.8g | 16.3g | 37.5g |
| WOODWORKER | Planks/Furniture | ~3.3g | ~8.3g | 58.3g | 6.3g | 8.8g | 16.3g | 37.5g |
| ALCHEMIST | Potions | ~1.7g | ~6.7g | 46.7g | 6.3g | 8.8g | 16.3g | 37.5g |
| BREWER | Ale/Mead | ~2.2g | ~7.2g | 50.4g | 6.3g | 8.8g | 16.3g | 37.5g |
| MASON | Cut Stone | ~1.3g | ~6.3g | 44.3g | 6.3g | 8.8g | 16.3g | 37.5g |
| FLETCHER | Bows/Arrows | ~1.0g | ~6.0g | 42.0g | 6.3g | 8.8g | 16.3g | 37.5g |
| SCRIBE | Scrolls | ~0.67g | ~5.67g | 39.7g | 6.3g | 8.8g | 16.3g | 37.5g |
| ENCHANTER | Enchantments | ~0.33g | ~5.33g | 37.3g | 6.3g | 8.8g | 16.3g | 37.5g |
| TAILOR | Spin Cloth | ~0.5g | ~5.5g | 38.5g | 6.3g | 8.8g | 16.3g | 37.5g |
| JEWELER | Jewelry | ~-1.0g | ~4.0g | 28.0g | 6.3g | 8.8g | 16.3g | 37.5g |
| LEATHERWORKER | Accessories | ~-2.0g | ~3.0g | 21.0g | 6.3g | 8.8g | 16.3g | 37.5g |
| ARMORER | Armor | ~-5.0g (est.) | ~0g | ~0g | 6.3g | 8.8g | 16.3g | 37.5g |

**Weekly Net Income (v3, Cottage + Basic Workshop = 125g assessed):**

| # | Profession | Weekly Pre-Tax | Tax at 7% | **v3 Weekly Net** | v2 Weekly Net | **Change** |
|--:|-----------|---------------:|----------:|------------------:|--------------:|---------:|
| 1 | COOK | 221.2g | 8.8g | **212.5g** | 186.2g | **+26.3g** |
| 2 | SMELTER | 70.0g | 8.8g | **61.3g** | 35.0g | **+26.3g** |
| 3 | BLACKSMITH | 70.0g | 8.8g | **61.3g** | ~35.0g | **+26.3g** |
| 4 | TANNER | 58.8g | 8.8g | **50.0g** | 23.8g | **+26.3g** |
| 5 | WOODWORKER | 58.3g | 8.8g | **49.5g** | 23.1g | **+26.3g** |
| 6 | BREWER | 50.4g | 8.8g | **41.7g** | 15.4g | **+26.3g** |
| 7 | ALCHEMIST | 46.7g | 8.8g | **37.9g** | 11.7g | **+26.3g** |
| 8 | MASON | 44.3g | 8.8g | **35.5g** | 9.3g | **+26.3g** |
| 9 | FLETCHER | 42.0g | 8.8g | **33.3g** | 7.0g | **+26.3g** |
| 10 | TAILOR (proc.) | 38.5g | 8.8g | **29.8g** | 3.5g | **+26.3g** |
| 11 | SCRIBE | 39.7g | 8.8g | **30.9g** | 4.7g | **+26.3g** |
| 12 | ENCHANTER | 37.3g | 8.8g | **28.5g** | 2.3g | **+26.3g** |
| 13 | JEWELER | 28.0g | 8.8g | **19.3g** | -7.0g | **+26.3g** |
| 14 | LEATHERWORKER | 21.0g | 8.8g | **12.3g** | -14.0g | **+26.3g** |
| 15 | ARMORER | ~0g | 8.8g | **-8.8g** | -35.0g | **+26.3g** |

**Key finding:** Every crafter gains exactly **+26.3g/week** (the difference between old 35g/week and new 8.75g/week tax). This uniform shift flips multiple professions from negative to positive.

### 1C. Service Professions (7)

Service professions were excluded from v2. Income estimates are speculative — service income depends on player interaction volume, not fixed recipes.

| Profession | Building | Assessed | Est. Weekly Income | Tax at 7% | Est. Weekly Net | Verdict |
|-----------|---------|--------:|------------------:|----------:|----------------:|---------|
| MERCHANT | Cottage + Market Stall | 75g | ~140g | 5.3g | **~134.8g** | Viable |
| INNKEEPER | Cottage + Inn | 175g | ~105g | 12.3g | **~92.8g** | Viable |
| BANKER | Cottage + Bank | 225g | ~105g | 15.8g | **~89.3g** | Viable |
| HEALER | Cottage + Workshop T1 | 125g | ~70g | 8.8g | **~61.3g** | Viable |
| STABLE MASTER | Cottage + Stable | 125g | ~52.5g | 8.8g | **~43.8g** | Viable |
| MERCENARY CAPTAIN | Cottage only | 25g | ~105g | 1.8g | **~103.3g** | Tax-immune |
| COURIER | Cottage only | 25g | ~52.5g | 1.8g | **~50.8g** | Tax-immune |

**Note:** Service profession income is fundamentally different — it scales with player population and activity, not fixed recipes. In a dead server they earn nothing; in an active server they could earn more than crafters. These estimates assume moderate activity (~50 active players in town).

---

## Part 2: Tax Burden as % of Weekly Income

### 2A. All 29 Professions at Default 7% Tax

| # | Profession | Type | Weekly Pre-Tax | Tax (7%) | Tax % | Profitable? |
|--:|-----------|------|---------------:|---------:|------:|:-----------:|
| 1 | COOK | Crafting | 221.2g | 8.8g | 4.0% | Yes |
| 2 | MERCHANT | Service | ~140g | 5.3g | 3.8% | Yes |
| 3 | RANCHER (chickens) | Gathering | 128.8g | 15.8g | 12.2% | Yes |
| 4 | MERCENARY CAPTAIN | Service | ~105g | 1.8g | 1.7% | Yes |
| 5 | INNKEEPER | Service | ~105g | 12.3g | 11.7% | Yes |
| 6 | BANKER | Service | ~105g | 15.8g | 15.0% | Yes |
| 7 | HUNTER | Gathering | 81.9g | 1.8g | 2.1% | Yes |
| 8 | FARMER (plot + field) | Gathering | 75.6g | 10.5g | 13.9% | Yes |
| 9 | SMELTER | Crafting | 70.0g | 8.8g | 12.5% | Yes |
| 10 | BLACKSMITH | Crafting | 70.0g | 8.8g | 12.5% | Yes |
| 11 | HEALER | Service | ~70g | 8.8g | 12.5% | Yes |
| 12 | LUMBERJACK | Gathering | 63.0g | 1.8g | 2.8% | Yes |
| 13 | TANNER | Crafting | 58.8g | 8.8g | 14.9% | Yes |
| 14 | WOODWORKER | Crafting | 58.3g | 8.8g | 15.0% | Yes |
| 15 | MINER | Gathering | 56.7g | 1.8g | 3.1% | Yes |
| 16 | STABLE MASTER | Service | ~52.5g | 8.8g | 16.7% | Yes |
| 17 | COURIER | Service | ~52.5g | 1.8g | 3.3% | Yes |
| 18 | BREWER | Crafting | 50.4g | 8.8g | 17.4% | Yes |
| 19 | FISHERMAN | Gathering | 50.4g | 1.8g | 3.5% | Yes |
| 20 | HERBALIST | Gathering | 47.3g | 1.8g | 3.7% | Yes |
| 21 | ALCHEMIST | Crafting | 46.7g | 8.8g | 18.8% | Yes |
| 22 | MASON | Crafting | 44.3g | 8.8g | 19.8% | Yes |
| 23 | FLETCHER | Crafting | 42.0g | 8.8g | 20.9% | Yes |
| 24 | SCRIBE | Crafting | 39.7g | 8.8g | 22.1% | Yes |
| 25 | TAILOR (processing) | Crafting | 38.5g | 8.8g | 22.8% | Yes |
| 26 | FARMER (public only) | Gathering | 37.8g | 1.8g | 4.7% | Yes |
| 27 | ENCHANTER | Crafting | 37.3g | 8.8g | 23.5% | Yes |
| 28 | JEWELER | Crafting | 28.0g | 8.8g | 31.3% | Yes |
| 29 | LEATHERWORKER | Crafting | 21.0g | 8.8g | 41.8% | Yes |
| 30 | ARMORER | Crafting | ~0g | 8.8g | >100% | **No** |
| 31 | TAILOR (armor) | Crafting | -403g | 8.8g | N/A | **No** |

**At default 7% tax: 27 of 29 professions (93%) are profitable.** Only ARMORER and TAILOR (armor recipes) remain unprofitable — and they are unprofitable pre-tax due to negative recipe margins.

### 2B. Viability at Max 30% Tax (Villain Mayor Scenario)

At 30% combined rate, tax on 125g assessed = 37.5g/week.

| Profession | Weekly Pre-Tax | Tax (30%) | Net | Survives? |
|-----------|---------------:|---------:|----:|:---------:|
| COOK | 221.2g | 37.5g | 183.7g | Yes |
| SMELTER | 70.0g | 37.5g | 32.5g | Yes |
| BLACKSMITH | 70.0g | 37.5g | 32.5g | Yes |
| TANNER | 58.8g | 37.5g | 21.3g | Yes |
| WOODWORKER | 58.3g | 37.5g | 20.8g | Yes |
| BREWER | 50.4g | 37.5g | 12.9g | Yes |
| ALCHEMIST | 46.7g | 37.5g | 9.2g | Barely |
| MASON | 44.3g | 37.5g | 6.8g | Barely |
| FLETCHER | 42.0g | 37.5g | 4.5g | Barely |
| SCRIBE | 39.7g | 37.5g | 2.2g | Barely |
| TAILOR (proc.) | 38.5g | 37.5g | 1.0g | Barely |
| ENCHANTER | 37.3g | 37.5g | -0.2g | **No** |
| JEWELER | 28.0g | 37.5g | -9.5g | **No** |
| LEATHERWORKER | 21.0g | 37.5g | -16.5g | **No** |
| ARMORER | ~0g | 37.5g | -37.5g | **No** |

**At max 30% tax: 11 crafters survive, 4 go underwater.** The marginal crafters (ENCHANTER, JEWELER, LEATHERWORKER, ARMORER) are the casualties of villain mayors. This is exactly the political tension the system is designed to create.

---

## Part 3: Updated Viability Verdicts

| Verdict | Definition | Count | Professions |
|---------|-----------|------:|-------------|
| **Viable** | Profitable at default 7% tax | **24** | COOK, TANNER, SMELTER, BLACKSMITH, WOODWORKER, BREWER, ALCHEMIST, MASON, FLETCHER, SCRIBE, ENCHANTER, TAILOR (proc.), all 7 gathering, all 7 service |
| **Marginal** | Profitable at 7% but stressed (>30% tax burden) | **2** | JEWELER (31.3%), LEATHERWORKER (41.8%) |
| **Underwater** | Unprofitable even at 0% tax (negative pre-tax income) | **2** | ARMORER, TAILOR (armor recipes) |
| **Tax-Immune** | Assessed base so low (<50g) that tax is irrelevant at any rate | **9** | HUNTER, LUMBERJACK, MINER, FISHERMAN, HERBALIST, FARMER (public), MERCENARY CAPTAIN, COURIER + any public-spot gatherer |

**Note:** TAILOR has a split verdict — Spin Cloth (processing) is Viable, but all armor recipes are deeply Underwater. TAILOR players who stick to processing intermediates (Cloth, Woven Cloth) are fine. Those who try to craft finished cloth armor lose money regardless of tax.

---

## Part 4: Comparison Table — v2 vs v3

This is the key deliverable. Shows how the tax system change affected each profession.

### 4A. Crafting Professions (the big movers)

| Profession | v2 Weekly Net | v3 Weekly Net (7%) | Delta | v2 Verdict | v3 Verdict | Changed? |
|-----------|-------------:|-------------------:|------:|:----------:|:----------:|:--------:|
| COOK | 186.2g | **212.5g** | +26.3g | Viable | Viable | No (better) |
| SMELTER | ~35.0g | **61.3g** | +26.3g | Viable | Viable | No (better) |
| BLACKSMITH | ~35.0g | **61.3g** | +26.3g | Viable | Viable | No (better) |
| TANNER | 23.8g | **50.0g** | +26.3g | Viable | Viable | No (better) |
| WOODWORKER | 23.1g | **49.5g** | +26.3g | Viable | Viable | No (better) |
| BREWER | 15.4g | **41.7g** | +26.3g | Marginal | **Viable** | **YES** |
| ALCHEMIST | 11.7g | **37.9g** | +26.3g | Marginal | **Viable** | **YES** |
| MASON | 9.3g | **35.5g** | +26.3g | Marginal | **Viable** | **YES** |
| FLETCHER | 7.0g | **33.3g** | +26.3g | Marginal | **Viable** | **YES** |
| SCRIBE | 4.7g | **30.9g** | +26.3g | Marginal | **Viable** | **YES** |
| TAILOR (proc.) | 3.5g | **29.8g** | +26.3g | Marginal | Viable | **YES** |
| ENCHANTER | 2.3g | **28.5g** | +26.3g | Marginal | Viable | **YES** |
| JEWELER | -7.0g | **19.3g** | +26.3g | Underwater | **Marginal** | **YES** |
| LEATHERWORKER | -14.0g | **12.3g** | +26.3g | Underwater | **Marginal** | **YES** |
| ARMORER | -35.0g | **-8.8g** | +26.3g | Underwater | Underwater | No (still bad) |

### 4B. Gathering Professions (minimal change)

| Profession | v2 Weekly Net | v3 Weekly Net (7%) | Delta | Verdict Change |
|-----------|-------------:|-------------------:|------:|:-------------:|
| HUNTER | 81.9g | 80.2g | -1.8g | No change |
| LUMBERJACK | 63.0g | 61.3g | -1.8g | No change |
| MINER | 56.7g | 54.9g | -1.8g | No change |
| FISHERMAN | 50.4g | 48.7g | -1.8g | No change |
| HERBALIST | 47.3g | 45.5g | -1.8g | No change |
| FARMER (public) | 37.8g | 36.0g | -1.8g | No change |

Gatherers lose 1.8g/week (cottage tax) — completely negligible.

### 4C. Plot-Based Professions (new tax, previously untaxed)

| Profile | v2 Weekly Net | v3 Weekly Net (7%) | Delta | Notes |
|---------|-------------:|-------------------:|------:|-------|
| FARMER (plot + field) | 75.6g | 65.1g | -10.5g | New 10.5g/week tax on 150g assessed |
| RANCHER (chickens) | 128.8g | 113.1g | -15.8g | New 15.8g/week tax on 225g assessed |

Plot-based professions are the only ones who pay MORE in v3 than v2 (they went from 0 to assessed-value tax). But the tax is 12-14% of income — well within viable range.

### 4D. Summary of Verdict Changes

| Direction | Count | Professions |
|-----------|------:|-------------|
| **Marginal → Viable** | 7 | BREWER, ALCHEMIST, MASON, FLETCHER, SCRIBE, TAILOR (proc.), ENCHANTER |
| **Underwater → Marginal** | 2 | JEWELER, LEATHERWORKER |
| **Underwater → Underwater** | 1 | ARMORER |
| **Unchanged (Viable)** | 12 | COOK, TANNER, SMELTER, BLACKSMITH, WOODWORKER + all 7 gathering |
| **Newly taxed (still Viable)** | 2 | FARMER (plot), RANCHER |
| **Service (new, all Viable)** | 7 | All 7 service professions |

**9 of 15 crafting professions improved their verdict.** The tax system was the bottleneck for mid-tier crafters, not recipe margins.

---

## Part 5: Remaining Problem Professions

These professions are still Marginal or Underwater **after** the v3 tax correction. Their problems are genuine recipe/margin issues, not tax problems.

### 5A. ARMORER — Underwater (pre-tax income ~0g/week)

**Root cause:** Armor recipes have margin ratios 0.6-0.9 (output base_value < input base_total). Armor's value is in combat utility (defense stats), not gold resale. Crafting armor is a service, not a product business.

**Why the tax doesn't matter:** ARMORER is unprofitable at 0% tax. Even with no tax at all, selling armor at base prices loses money. The issue is entirely structural.

**Suggested fix direction:**
- **Option A:** Raise armor output base_values by 40-60% to reach ratio 1.0-1.2
- **Option B:** Reduce material input quantities by 30-40% (less leather/metal per piece)
- **Option C:** Accept that ARMORER is a "commission crafter" — players pay labor fees on top of material cost. Add explicit "crafting fee" UI that lets ARMORERs charge for their time. This is the most realistic solution — real-world blacksmiths charge for labor.

### 5B. TAILOR (armor recipes) — Underwater (deeply negative)

**Root cause:** Cloth armor recipes have the worst margins in the game (0.46-0.70). Cloth Robe costs 98g in inputs, sells for 45g. That's a 54% value destruction.

**Why the tax doesn't matter:** TAILOR armor is -403g/week pre-tax. The 8.8g tax is a rounding error on a 403g loss.

**Suggested fix direction:**
- **Option A (preferred):** Reduce input quantities. Cloth Robe should be 2×Woven Cloth + 1×Cured Leather (not 4×WC + 1×CL). This alone would bring ratio from 0.46 to ~0.92.
- **Option B:** Raise cloth armor base_values by 80-100%. Cloth Robe from 45g to 90g.
- **Option C:** Same as ARMORER — commission-based crafting fee system.

### 5C. LEATHERWORKER — Marginal (12.3g/week at 7%)

**Root cause:** Leather accessories (bags, bracers, belts) have margin ratios 0.69-0.85. Similar to armor, the value is in the equipment slot utility, not gold.

**Why it's marginal, not underwater:** LEATHERWORKER's pre-tax income is positive (21g/week). The old 35g/week workshop tax made them negative. The new 8.8g tax leaves them at 12.3g — tight but survivable.

**Suggested fix direction:**
- Short-term: No change needed — 12.3g/week is enough for a secondary profession.
- Long-term: Add higher-margin recipes (exotic leather goods, decorative items) that don't compete with armor slot items.

### 5D. JEWELER — Marginal (19.3g/week at 7%)

**Root cause:** Precious metal inputs (Silver Ore 30g, Gold Ore 50g+) are expensive. Jewelry output prices don't cover the premium input costs.

**Why it's marginal, not underwater:** The old tax (35g/week) made JEWELER deeply negative (-7g/week). New tax (8.8g) puts them at +19.3g. Tight but positive.

**Suggested fix direction:**
- Short-term: Acceptable as-is — JEWELER is a luxury profession with high-value niche demand.
- Long-term: Add gemcutting sub-recipes (cut gems from raw stones) with better margins to supplement jewelry sales.

### 5E. Honest Assessment

| Profession | Problem Type | Tax Fix Helped? | Needs Recipe Fix? |
|-----------|-------------|:--------------:|:----------------:|
| ARMORER | Negative pre-tax income | No | **Yes (P0)** |
| TAILOR (armor) | Deeply negative pre-tax | No | **Yes (P0)** |
| LEATHERWORKER | Low pre-tax, was killed by tax | **Yes (saved it)** | Maybe (P2) |
| JEWELER | Expensive inputs, was killed by tax | **Yes (saved it)** | Maybe (P2) |

The tax system fix solved LEATHERWORKER and JEWELER. ARMORER and TAILOR armor need recipe-level fixes that no amount of tax reduction can address.

---

## Part 6: Political Faction Analysis

### Faction Groupings by Tax Sensitivity

**Tax revolt rate** = combined rate at which weekly tax exceeds weekly pre-tax income.
Formula: `revolt_rate = weekly_pre_tax_income / assessed_value`

| Faction | Revolt Rate | Professions | Est. % of Players | Political Behavior |
|---------|:----------:|-------------|------------------:|-------------------|
| **Tax-Proof** (>100%) | >100% | HUNTER, LUMBERJACK, MINER, FISHERMAN, HERBALIST, FARMER (public), COURIER, MERCENARY CAPTAIN | ~30% | Don't care. Won't vote on tax. Passive political base. |
| **Tax-Resilient** (50-100%) | 50-100% | COOK, MERCHANT, INNKEEPER, BANKER, RANCHER (1 plot), SMELTER, BLACKSMITH | ~25% | Notice taxes but never threatened. Support moderate rates for town services. |
| **Tax-Aware** (25-50%) | 25-50% | FARMER (plot), TANNER, WOODWORKER, BREWER, ALCHEMIST, HEALER, STABLE MASTER | ~25% | Prefer lower rates. Will vote for pro-business candidates. Swing voters. |
| **Tax-Sensitive** (15-25%) | 15-25% | MASON, FLETCHER, SCRIBE, TAILOR (proc.), ENCHANTER, JEWELER, LEATHERWORKER | ~15% | Actively oppose tax increases. May relocate. Core opposition constituency. |
| **Tax-Fragile** (<15%) | <15% | ARMORER, TAILOR (armor) | ~5% | Cannot survive taxes. Will abandon profession or town. Permanent have-nots. |

### Does This Create Interesting Gameplay?

**Yes.** The distribution is well-shaped for political dynamics:

1. **30% passive base** (Tax-Proof gatherers): These players have no tax stake. They're the silent majority who might not vote at all — or might be swayed by non-tax issues (defense, infrastructure, social policy). A clever mayor can ignore their tax preferences without consequence.

2. **25% tax-resilient establishment** (COOK, MERCHANT, RANCHER): These are the wealthy players who benefit from town services funded by taxes. They'd support moderate-to-high tax rates because they can afford it and the treasury spending (guards, market improvements, roads) helps their businesses. Natural allies of active mayors.

3. **25% swing voters** (TANNER, BREWER, WOODWORKER, ALCHEMIST): The middle class. They'll support a 5-8% mayor but rebel against 13%+. These are the kingmakers in elections — whichever candidate appeals to this bloc wins.

4. **15% vocal opposition** (MASON, FLETCHER, SCRIBE, ENCHANTER): The small business owners who live on thin margins. They'll form "low tax" political factions, petition for rate reductions, and threaten to leave for lower-tax towns. Great source of political roleplay drama.

5. **5% permanent have-nots** (ARMORER, TAILOR armor): These players can't be saved by tax policy. They need recipe rebalancing, not political action. But they might not realize this — expect them to blame taxes for their woes, creating a frustrated underclass that drives political extremism (support for 0% tax candidates or anti-establishment movements).

### Population Distribution Creates Natural Tension

The key tension: **the 25% establishment wants taxes (to fund services)** while **the 15% opposition wants zero taxes (to survive)**. The 25% swing voters decide which way it goes. This is almost exactly how real democratic politics works — and it emerges naturally from the economic math.

A mayor who sets 5% town tax satisfies everyone except the tax-fragile (who need recipe fixes, not tax cuts). A mayor who sets 15% town tax alienates 40% of the population. A mayor who sets 25% town tax creates a genuine political crisis — only COOK, MERCHANT, and RANCHER can survive comfortably.

This is **excellent game design**. The system creates organic political conflict from economic fundamentals.

---

## Part 7: v3 Break-Even Table (All 29 Professions)

Comprehensive table with v3 tax applied. Break-even = days to recover startup investment.

| # | Profession | Type | Startup | Assessed | Tax/Week (7%) | Net/Week (7%) | Break-Even | Viability |
|--:|-----------|------|--------:|---------:|--------------:|--------------:|-----------:|:---------:|
| 1 | COOK | Craft | 0g | 125g | 8.8g | 212.5g | 0d | Viable |
| 2 | MERCHANT | Service | 0g | 75g | 5.3g | ~134.8g | 0d | Viable |
| 3 | RANCHER | Gather | 150g | 225g | 15.8g | 113.1g | 9d | Viable |
| 4 | MERCENARY CAP. | Service | 0g | 25g | 1.8g | ~103.3g | 0d | Tax-immune |
| 5 | INNKEEPER | Service | 0g | 175g | 12.3g | ~92.8g | 0d | Viable |
| 6 | BANKER | Service | 0g | 225g | 15.8g | ~89.3g | 0d | Viable |
| 7 | HUNTER | Gather | 0g | 25g | 1.8g | 80.2g | 0d | Tax-immune |
| 8 | FARMER (plot) | Gather | 0g | 150g | 10.5g | 65.1g | 0d | Viable |
| 9 | SMELTER | Craft | 0g | 125g | 8.8g | 61.3g | 0d | Viable |
| 10 | BLACKSMITH | Craft | 0g | 125g | 8.8g | 61.3g | 0d | Viable |
| 11 | HEALER | Service | 0g | 125g | 8.8g | ~61.3g | 0d | Viable |
| 12 | LUMBERJACK | Gather | 0g | 25g | 1.8g | 61.3g | 0d | Tax-immune |
| 13 | MINER | Gather | 0g | 25g | 1.8g | 54.9g | 0d | Tax-immune |
| 14 | COURIER | Service | 0g | 25g | 1.8g | ~50.8g | 0d | Tax-immune |
| 15 | TANNER | Craft | 0g | 125g | 8.8g | 50.0g | 0d | Viable |
| 16 | WOODWORKER | Craft | 0g | 125g | 8.8g | 49.5g | 0d | Viable |
| 17 | FISHERMAN | Gather | 0g | 25g | 1.8g | 48.7g | 0d | Tax-immune |
| 18 | HERBALIST | Gather | 0g | 25g | 1.8g | 45.5g | 0d | Tax-immune |
| 19 | STABLE MASTER | Service | 0g | 125g | 8.8g | ~43.8g | 0d | Viable |
| 20 | BREWER | Craft | 0g | 125g | 8.8g | 41.7g | 0d | Viable |
| 21 | ALCHEMIST | Craft | 0g | 125g | 8.8g | 37.9g | 0d | Viable |
| 22 | FARMER (public) | Gather | 0g | 25g | 1.8g | 36.0g | 0d | Tax-immune |
| 23 | MASON | Craft | 0g | 125g | 8.8g | 35.5g | 0d | Viable |
| 24 | FLETCHER | Craft | 0g | 125g | 8.8g | 33.3g | 0d | Viable |
| 25 | SCRIBE | Craft | 0g | 125g | 8.8g | 30.9g | 0d | Viable |
| 26 | TAILOR (proc.) | Craft | 0g | 125g | 8.8g | 29.8g | 0d | Viable |
| 27 | ENCHANTER | Craft | 0g | 125g | 8.8g | 28.5g | 0d | Viable |
| 28 | JEWELER | Craft | 0g | 125g | 8.8g | 19.3g | 0d | Marginal |
| 29 | LEATHERWORKER | Craft | 0g | 125g | 8.8g | 12.3g | 0d | Marginal |
| 30 | ARMORER | Craft | 0g | 125g | 8.8g | -8.8g | Never | Underwater |
| 31 | TAILOR (armor) | Craft | 0g | 125g | 8.8g | -412g | Never | Underwater |

---

## Appendix: Data Quality Notes

### Confirmed Numbers (from YAML + code)

All gathering profession incomes, COOK recipes (25), TANNER recipes (15), TAILOR recipes (18). These have explicit base_values in the YAML and are high-confidence.

### Estimated Numbers (marked ~)

SMELTER, BLACKSMITH, WOODWORKER, BREWER, ALCHEMIST, MASON, FLETCHER, SCRIBE, ENCHANTER, JEWELER, LEATHERWORKER, ARMORER — these professions' output base_values are incomplete in the YAML. Estimates are based on v2 analysis patterns and reasonable extrapolation. All service profession income is estimated.

### Discrepancies Found

None between tax design doc and YAML. The assessed values in the tax doc were designed specifically to align with YAML-sourced income data.

### Recommendations Carried Forward

| # | Priority | Issue | Status After v3 |
|--:|:--------:|-------|:---------------:|
| 1 | P0 | TAILOR armor margins (0.46-0.70) | **Still broken** — needs recipe fix |
| 2 | P0 | ARMORER negative pre-tax income | **Still broken** — needs recipe fix or commission system |
| 3 | P1 | Workshop tier system implementation | Tax doc defines it — ready for coding |
| 4 | P1 | TANNER Wolf/Bear Leather processing value-destructive | **Improved** by lighter tax but still underwater for finished goods |
| 5 | P2 | LEATHERWORKER thin margins | **Fixed by tax** — now marginal, acceptable for secondary profession |
| 6 | P2 | JEWELER expensive inputs | **Fixed by tax** — now marginal, acceptable for luxury niche |
| 7 | P3 | Missing base_values for 40% of recipes | Still missing — affects analysis confidence |
