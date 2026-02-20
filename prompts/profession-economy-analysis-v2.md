# Prompt: Profession Economy Analysis v2 — Corrected Assumptions

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- Bias toward action. Write output to files early and often.
- Keep chat responses brief — this is a heavy analysis task.
- Show your math. State every assumption explicitly.
- One deliverable file: `docs/profession-economy-analysis-v2.md`

---

## YOUR TASK: Redo the Profession Economy Analysis with Corrected Assumptions

### Why v2?

The v1 analysis (`docs/profession-economy-analysis.md`) had several flawed assumptions:

1. **RANCHER/FARMER land ownership was wrong.** Players can own up to 3 land plots. The FIRST plot is FREE. The second costs 200g. The third costs 400g. Each plot is taxed at 10% of its purchase value per day (so free=0g tax, 200g plot=20g/day tax, 400g plot=40g/day tax). This dramatically changes RANCHER break-even — the first Chicken Coop / field is free, not 100g+.

2. **Prices are player-driven, not static.** The v1 analysis treated `base_value` from the YAML as the market price. In reality, ALL prices are set by players. Base_value is a design reference point, not a price floor or ceiling. The analysis must model price ranges and elasticity, not fixed prices. A COOK's Grilled Fish might sell for 5g or 50g depending on supply/demand. We can't predict exact prices — but we CAN analyze margin structures, cost ratios, and break-even price thresholds.

3. **Workshops need to be modeled as upgradeable gold sinks.** Workshops are taxed (like land). Players can only own ONE workshop but can upgrade it in two ways: (a) upgrade the building tier itself (better crafting bonuses), and (b) add furniture/equipment inside (specialized bonuses). Both are gold sinks that create ongoing demand for MASON, WOODWORKER, BLACKSMITH products.

4. **Service professions should be excluded.** INNKEEPER, HEALER, STABLE_MASTER, COURIER, MERCENARY_CAPTAIN, MERCHANT, and BANKER are sidebarred. Analyze only the 22 gathering + processing + crafting professions.

### Reference Files

Read these first:
- `docs/profession-economy-master.yaml` — source of truth for all professions, recipes, items
- `docs/profession-economy-analysis.md` — the v1 analysis (use its structure, fix its assumptions)
- `docs/profession-audit-report.md` — current implementation status

### Corrected Parameters

| Parameter | v1 Value | v2 Corrected Value | Notes |
|-----------|----------|-------------------|-------|
| Land plots per player | Not modeled | Up to 3 (1st free, 2nd 200g, 3rd 400g) | FARMER, RANCHER, HERBALIST (herb garden), etc. |
| Land tax rate | Not modeled | 10% of plot purchase price per day | Free plot = 0g/day, 200g plot = 20g/day, 400g plot = 40g/day |
| Workshop per player | Not modeled | 1 maximum, taxed | Required for crafting professions |
| Workshop upgrades | Not modeled | Building tier upgrades + furniture additions | Gold sink, creates cross-profession demand |
| Item prices | Fixed at base_value | Player-driven, unknown | Model as ratios and thresholds, not absolutes |
| Service professions | Included (5 at 0g) | EXCLUDED from analysis | Sidebarred |
| Actions per day | 1 major | 1 major (unchanged) | Confirmed correct |
| Starting gold | 0g | 0g (unchanged) | Confirmed correct |

---

## Analysis Structure

### Part 1: Corrected Land & Property Model

Model the full property ownership progression for land-based professions:

**Land Plots (FARMER, RANCHER, HERBALIST with gardens, etc.):**
- Plot 1: FREE, 0g/day tax
- Plot 2: 200g purchase, 20g/day tax
- Plot 3: 400g purchase, 40g/day tax

For each land-based profession, model:
- Income at 1 plot, 2 plots, 3 plots
- When does the 2nd plot become worth buying? (daily income from plot 2 must exceed 20g/day tax)
- When does the 3rd plot become worth buying? (daily income from plot 3 must exceed 40g/day tax)
- Total days to reach full 3-plot operation from 0g start

**RANCHER specifically:** First Chicken Coop is on the free plot. Livestock still costs gold (chickens, cows, sheep). Recalculate RANCHER break-even with free first plot. What's the ACTUAL startup cost now? Just livestock?

### Part 2: Workshop System Design & Cost Model

Design the workshop system with these constraints:
- 1 workshop per player (crafting professions only)
- Workshop is REQUIRED to craft (no workshop = can't craft, similar to how gatherers need gathering spots)
- Workshop has a purchase cost + daily tax
- Workshop can be upgraded two ways:

**Building Tier Upgrades:**
| Tier | Name | Cost | Tax/Day | Crafting Bonus | Supplied By |
|------|------|-----:|--------:|---------------|-------------|
| 1 | Basic Workshop | ??? | ??? | None (baseline) | ??? |
| 2 | Improved Workshop | ??? | ??? | +10% craft speed or yield | ??? |
| 3 | Master Workshop | ??? | ??? | +20% craft speed or yield | ??? |

**Furniture/Equipment Additions (examples — design 3-5 per profession):**
| Item | Cost | Effect | Supplied By | Replaces? |
|------|-----:|--------|-------------|-----------|
| Better Anvil | ??? | +quality chance | BLACKSMITH (self or other) | No (additive) |
| Storage Chest | ??? | +inventory slots | WOODWORKER | No (additive) |
| etc. | | | | |

For EACH crafting profession, propose:
- What their workshop is called (Forge, Kitchen, Tannery, Loom Room, etc.)
- Base cost and tax rate
- 2-3 furniture items they can add (with costs, effects, and which profession supplies them)
- Which professions SUPPLY workshop materials (this creates the cross-profession demand loop)

**Key design goal:** Workshop upgrades should be the primary gold sink for established crafters. A fully upgraded Master Workshop with all furniture should cost 500-1000g total and take 30-60 days to fully kit out. This gives crafters a long-term progression goal AND creates demand for MASON, WOODWORKER, BLACKSMITH products.

### Part 3: Price-Agnostic Margin Analysis

Since prices are player-driven, do NOT model fixed prices. Instead analyze:

**A. Cost Ratios:** For each recipe, calculate:
- `input_units` = total number of input items consumed
- `output_units` = total number of output items produced
- `input_base_total` = sum of input base_values (as a reference ratio, not a price)
- `output_base_total` = sum of output base_values
- `margin_ratio` = output_base_total / input_base_total

A margin_ratio < 1.0 means the recipe DESTROYS value at base prices. The market would need to price the output at a premium for the crafter to profit. A margin_ratio > 1.5 means generous markup is built into the recipe design.

Flag every recipe with margin_ratio < 1.1 (barely viable or negative). These are the recipes where market-dependent crafters will struggle regardless of what prices settle at.

**B. Break-Even Price Thresholds:** For each crafting profession, calculate:
- "What price must the output sell for (relative to input costs) for the crafter to break even after 10% market fee?"
- Formula: `break_even_output_price = (sum_input_costs) / 0.9`
- If break_even_output_price > 1.5× base_value, flag as "requires significant premium"

**C. Margin Tiers:** Classify each recipe:
- **Comfortable (ratio > 1.5):** Crafter profits even if forced to sell at a discount
- **Viable (ratio 1.1–1.5):** Crafter profits at or near base prices
- **Marginal (ratio 0.9–1.1):** Crafter breaks even only if output sells at premium
- **Underwater (ratio < 0.9):** Crafter loses money unless output sells at significant premium

**D. Price Elasticity Scenarios:** Instead of fixed prices, model 3 scenarios:
- **Buyer's Market:** Outputs sell at 75% of base_value, inputs cost 100% of base_value (oversupply of finished goods)
- **Balanced Market:** Everything at base_value
- **Seller's Market:** Outputs sell at 125% of base_value, inputs cost 100% (high demand for finished goods)

For each profession, show profit/loss across all 3 scenarios. This shows which professions are resilient vs fragile to market shifts.

### Part 4: Revised 30-Day P&L Profiles

Redo the 30-day P&L for all 22 active professions with these corrections:

- **Land-based professions:** Include free first plot, model 1-plot income
- **Crafting professions:** Include workshop cost + tax as startup/recurring costs
- **All professions:** Use margin ratios instead of fixed prices. Show the P&L as "at base_value prices" but note the break-even price threshold
- **RANCHER:** Corrected with free first plot. What does the startup actually cost now?
- **Exclude:** All 7 service professions

For each profession P&L, include a one-line **"Market Reality Check"**: what has to be true about market prices for this profession to be viable? Example: "COOK is viable IF food sells at 1.3x+ base_value due to HP utility premium" or "BLACKSMITH is viable at ANY market price above 0.7x base_value."

### Part 5: Revised Break-Even Table

Same format as v1 but with corrected numbers. Include:
- Startup cost (land + workshop + livestock where applicable)
- Daily tax burden (land tax + workshop tax)
- Net daily income after taxes
- Days to break even on startup
- Market reality check (what price conditions are needed)

### Part 6: Workshop-Driven Demand Analysis

Show how workshop requirements change the dependency graph:
- Which professions SUPPLY workshop materials?
- How much new demand does this create for MASON, WOODWORKER, BLACKSMITH?
- Does this fix the "MASON has no steady demand" problem from v1?
- Does this create any NEW bottlenecks?

### Part 7: Revised Gold Flow

Redo the gold flow analysis with:
- Workshop taxes as a new sink
- Land taxes (plot 2 and 3) as expansion sinks
- Workshop upgrade spending as a long-term sink
- Furniture crafting demand as gold circulation (not a sink — gold moves between players)

Does the economy still trend deflationary? What's the new balance?

### Part 8: Revised Top 10 Recommendations

Update the recommendations based on v2 findings. Remove any that are no longer relevant (e.g., if RANCHER break-even is now reasonable with free first plot). Add new ones if the workshop system reveals new issues.

**IMPORTANT: Do NOT include service profession recommendations.** Those are sidebarred.

---

## What NOT To Do

- Do NOT treat base_value as actual market price. Use it as a ratio baseline only.
- Do NOT include service professions in analysis or recommendations.
- Do NOT propose changes to the YAML or code. This is analysis only.
- Do NOT make the report longer than necessary. Tables > prose. Math > hand-waving.
- Do NOT model player behavior or psychology. Stick to structural economics.

## Output

Single file: `docs/profession-economy-analysis-v2.md`

Write to this file early and incrementally. If the analysis is getting long, prioritize:
1. The corrected break-even table (Part 5) — this is the money shot
2. The margin ratio analysis (Part 3A) — flags broken recipes
3. The workshop system design (Part 2) — new system needs design
4. Everything else

Keep chat responses to a brief summary of findings. The file IS the deliverable.
