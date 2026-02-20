# Profession Economy Deep Analysis

**Generated:** 2026-02-20
**Analysis basis:** `docs/profession-economy-master.yaml` (2999 lines), audit report, fix queue, source code
**Analyst:** Claude Code quantitative analysis pipeline

---

## Executive Summary

The Realm of Crowns economy has **structural imbalances that will worsen as the game matures.** The core issue is not that some professions earn more than others — that's expected in a tiered system — but that several professions lack viable economic loops entirely, while others are money printers with near-zero capital requirements.

**Top 5 findings:**

1. **RANCHER is an economic trap.** Capital outlay of 330-730g (buildings + livestock) against a starting gold of 0g means RANCHERs cannot even begin operating without external funding. Once operational, feed costs (Grain every 3 ticks) create ongoing gold drain. With livestock products valued at 8-15g and animal death risk, break-even exceeds 90 days. Meanwhile, COOK (the primary consumer) earns 5-15g/day with zero capital.

2. **Gathering professions have a 3-10x income spread.** MINER and HERBALIST at Craftsman tier earn 28-32g per gather action (Medicinal Herbs, Glowcap Mushrooms, Silver Ore), while FARMER Apprentice earns 3-6g per action (Grain, Vegetables). This spread is acceptable IF the low-value gatherers feed high-value crafting chains — but FARMER's primary consumer (COOK) produces items worth only 8-40g.

3. **Service professions (5 of 7) have NO implemented revenue mechanism.** INNKEEPER, HEALER, STABLE_MASTER, COURIER, and MERCENARY_CAPTAIN are "PLANNED" status with no crafting recipes or service income. Only MERCHANT (reduced market fees) and BANKER (loan interest) have mechanics. Players who pick these professions generate zero income.

4. **SMELTER is a critical bottleneck with no alternatives.** 4 downstream professions (BLACKSMITH, ARMORER, JEWELER, ENCHANTER) all require SMELTER output. If SMELTER population drops 50%, the entire metal economy stalls. No other profession can produce ingots.

5. **The economy is deflationary at launch.** Gold sources (quests, combat loot) are one-time and level-gated, while gold sinks (market fees, building taxes, livestock, tool replacement) are perpetual. With 0g starting gold, new players face a cold-start problem where they must gather and sell before they can participate in the market economy.

**Overall Economy Health Grade: C+**
The gathering → processing → crafting pipeline is well-designed with genuine interdependencies. But severe imbalances at the extremes (RANCHER vs COOK, unimplemented services, SMELTER bottleneck) and a deflationary gold flow will frustrate players in specific roles.

---

## Assumptions & Parameters

All calculations use these values from game configuration:

| Parameter | Value | Source |
|-----------|-------|--------|
| Actions per day | **1 major action** (gather OR craft OR travel OR combat) | `DAILY_ACTION_REBALANCE.md` |
| Free actions per day | Unlimited (market list/buy, equip, chat) | Economy rules |
| Gather yield (base) | 1-3 items (avg **2**) | `gathering.ts` spot definitions |
| Gather yield (Apprentice) | +0% bonus → avg 2 items | Tier yield system |
| Gather yield (Journeyman) | +25% bonus → avg 2.5 items | Tier yield system |
| Gather yield (Craftsman) | +50% bonus → avg 3 items | Tier yield system |
| Crafts per action | 1 recipe execution | Crafting system |
| Market fee (standard) | **10%** on sale price | `shared/src/data/market/index.ts` |
| Market fee (Merchant) | **5%** on sale price | Merchant profession perk |
| Starting gold | **0g** | `characters.ts` getStartingGold() |
| Starter equipment | Free cottage + starter weapon + starter armor | Character creation |
| Tool durability | 50 uses (base Common) | Durability system |
| Tool bare-hands penalty | -25% gather yield | Equipment system |
| Listing duration | 7 days | Market config |
| Property tax (cottage) | 5g/day | `property-tax.ts` |
| Property tax (workshop) | 20g/day | `property-tax.ts` |
| Feed interval (livestock) | Every 3 ticks | RANCHER economy |
| Analysis period | **30 days** at **Apprentice tier** | Per prompt spec |

**Critical note on actions/day:** The prompt template suggests 2 actions/day, but the implemented game uses 1 major action/day. This analysis uses the **actual implemented value of 1 action/day** since that determines real player experience. Revenue estimates at 2 actions/day would simply double.

**Price estimation method:** For items sold on the player market, I use `base_value` from YAML as the expected market price. In a player-driven economy, prices will fluctuate, but base_value represents the design-intended equilibrium. I apply ±25% sensitivity analysis in Method 6.

---

## Method 1: Input-Output Matrix

### Profession Interdependency Matrix (Non-Zero Links Only)

Each cell shows the number of distinct recipe links where the **row profession** produces an item consumed by the **column profession**. Blank = 0.

**Rows = Producer (who makes it) | Columns = Consumer (who needs it)**

```
PRODUCER →        FAR RAN FIS LUM MIN HER HUN COK BRW SML BLK ARM WOW TAN LTH TAI ALC ENC JWL FLE MAS SCR  SUM
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
FARMER             .   1   .   .   .   .   .   8   5   .   .   .   .   .   .   1   .   .   .   .   .   .   15
RANCHER            .   .   .   .   .   .   .   3   .   .   .   .   .   .   .   3   .   .   .   .   .   .    6
FISHERMAN          .   .   .   .   .   .   .   7   .   .   .   .   .   .   .   .   .   .   .   .   .   .    7
LUMBERJACK         .   .   .   .   .   .   .  15   .   .   6   .  11   .   .   .   .   .   .   .   2   1   35
MINER              .   .   .   .   .   .   .   .   .  11   6   .   .   .   .   1   2   3   2   .   6   .   31
HERBALIST          .   .   .   .   .   .   .   6   3   .   .   .   .   .   .   1   8   3   .   .   .   2   23
HUNTER             .   .   .   .   .   .   .   1   .   .   .   .   .  15   .   .   .   .   .   .   .   .   16
SMELTER            .   .   .   .   .   .   .   .   .   .  28   25  .   .   .   .   .   6  12   .   4   .   75
TANNER             .   .   .   .   .   .   .   .   .   .   .   5   .   .  13   9   .   .   .   5   .   .   32
WOODWORKER         .   .   .   .   .   .   .   .   .   .   4   .   .   1  6   .   .   .   .  10   .   3   24
TAILOR             .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
COOK               .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
BREWER             .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
ALCHEMIST          .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
ENCHANTER          .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
JEWELER            .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
FLETCHER           .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
MASON              .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
SCRIBE             .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
LEATHERWORKER      .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .    0
```

*Note: Service professions (MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN) excluded — they have no recipe-based production/consumption links.*

### Row Sums (Downstream Demand — "Who needs my stuff?")

| Rank | Profession | Row Sum | Role |
|-----:|-----------|--------:|------|
| 1 | SMELTER | 75 | **Hub** — supplies 5 professions with ingots |
| 2 | LUMBERJACK | 35 | Hub — wood is fuel + construction material |
| 3 | TANNER | 32 | Hub — leather supplies 4 downstream professions |
| 4 | MINER | 31 | Hub — ores/stone feed processing + construction |
| 5 | WOODWORKER | 24 | Hub — processed wood feeds 4 crafters |
| 6 | HERBALIST | 23 | Mid — herbs for food, potions, enchanting |
| 7 | HUNTER | 16 | Mid — pelts and meat |
| 8 | FARMER | 15 | Mid — food crops, brewing inputs, feed grain |
| 9 | FISHERMAN | 7 | Low — only feeds COOK |
| 10 | RANCHER | 6 | Low — only feeds COOK + TAILOR |
| 11-20 | All crafting end-products | 0 | **Leaf nodes** — no profession consumes their output |

### Column Sums (Upstream Dependencies — "Whose stuff do I need?")

| Rank | Profession | Col Sum | Role |
|-----:|-----------|--------:|------|
| 1 | COOK | 40 | Most dependent — buys from 6 gatherers + LUMBERJACK |
| 2 | BLACKSMITH | 44 | Heavily dependent — SMELTER + WOODWORKER + MINER + LUMBERJACK |
| 3 | ARMORER | 30 | Dependent on SMELTER + TANNER |
| 4 | FLETCHER | 15 | Dependent on WOODWORKER + TANNER |
| 5 | JEWELER | 14 | Dependent on SMELTER + MINER |
| 6 | LEATHERWORKER | 19 | Dependent on TANNER + WOODWORKER |
| 7 | TAILOR | 15 | Dependent on RANCHER + TANNER + FARMER + MINER + HERBALIST |
| 8 | SMELTER | 11 | Dependent on MINER only |
| 9 | ALCHEMIST | 10 | Dependent on HERBALIST + FARMER + MINER |
| 10 | ENCHANTER | 12 | Dependent on SMELTER + HERBALIST + MINER |
| 11 | BREWER | 8 | Dependent on FARMER + HERBALIST |
| 12 | MASON | 12 | Dependent on MINER + LUMBERJACK + SMELTER |
| 13 | SCRIBE | 6 | Dependent on LUMBERJACK + HERBALIST + WOODWORKER |
| 14 | TANNER | 16 | Dependent on HUNTER + WOODWORKER |
| 15 | WOODWORKER | 11 | Dependent on LUMBERJACK |

### Key Findings

**Isolated Nodes (Row AND Column sum = 0):**
- COOK, BREWER, ALCHEMIST, ENCHANTER, JEWELER, FLETCHER, MASON, SCRIBE, LEATHERWORKER, TAILOR — all have **zero downstream demand** (row sum = 0). Their products are sold directly to players, not to other professions. This is by design (end products) but means these professions rely entirely on player consumption demand.

**Hub Professions (highest row sums):**
1. SMELTER (75) — the single most critical profession. Removing SMELTER breaks BLACKSMITH, ARMORER, JEWELER, ENCHANTER, and MASON.
2. LUMBERJACK (35) — wood is everywhere: fuel for COOK, construction for WOODWORKER, crafting for BLACKSMITH.
3. TANNER (32) — leather intermediates feed 4 professions.

**Bottleneck Score (high demand + sole source):**

| Bottleneck | Downstream Professions | Sole Source? | Risk |
|-----------|----------------------|-------------|------|
| SMELTER | BLACKSMITH, ARMORER, JEWELER, ENCHANTER, MASON | **YES** — only source of ingots | **CRITICAL** |
| TANNER | LEATHERWORKER, TAILOR, ARMORER, FLETCHER | **YES** — only source of leather | HIGH |
| WOODWORKER | FLETCHER, LEATHERWORKER, SCRIBE, BLACKSMITH | **YES** — only source of processed wood | HIGH |
| HUNTER | TANNER, COOK | **YES** — only source of pelts | MODERATE |
| MINER | SMELTER, MASON, JEWELER | **YES** — only source of ore/stone | MODERATE (high supply) |

---

## Method 2: Network Centrality Analysis

### Directed Graph Model

Nodes = 22 active professions (7 gathering + 15 crafting, excluding 5 unimplemented services + MERCHANT + BANKER)
Edges = "Profession A produces item X which Profession B consumes as recipe input"

### Degree Analysis

| Profession | Out-Degree | In-Degree | Net Flow | Role |
|-----------|----------:|----------:|----------:|------|
| SMELTER | 5 | 1 | +4 | **Top Supplier** |
| LUMBERJACK | 6 | 0 | +6 | **Top Supplier** |
| MINER | 5 | 0 | +5 | **Top Supplier** |
| HERBALIST | 5 | 0 | +5 | **Top Supplier** |
| TANNER | 4 | 2 | +2 | **Processor** |
| WOODWORKER | 4 | 2 | +2 | **Processor** |
| FARMER | 4 | 0 | +4 | Supplier |
| HUNTER | 2 | 0 | +2 | Supplier |
| RANCHER | 2 | 1 | +1 | Supplier (with feed cost) |
| FISHERMAN | 1 | 0 | +1 | **Narrowest supplier** |
| BLACKSMITH | 0 | 4 | -4 | End Crafter |
| ARMORER | 0 | 2 | -2 | End Crafter |
| COOK | 0 | 6 | -6 | **Most Dependent** |
| TAILOR | 0 | 5 | -5 | End Crafter |
| LEATHERWORKER | 0 | 2 | -2 | End Crafter |
| FLETCHER | 0 | 2 | -2 | End Crafter |
| JEWELER | 0 | 2 | -2 | End Crafter |
| ENCHANTER | 0 | 3 | -3 | End Crafter |
| ALCHEMIST | 0 | 2 | -2 | End Crafter |
| BREWER | 0 | 2 | -2 | End Crafter |
| MASON | 0 | 3 | -3 | End Crafter |
| SCRIBE | 0 | 3 | -3 | End Crafter |

### Betweenness Centrality (Professions on Most Supply Chain Paths)

Estimated betweenness centrality (proportion of all shortest paths passing through each node):

| Rank | Profession | Betweenness | Why |
|-----:|-----------|------------:|-----|
| 1 | **SMELTER** | 0.38 | Every metal path (ore → ingot → finished good) passes through SMELTER |
| 2 | **TANNER** | 0.22 | Every leather path (pelts → leather → goods) passes through TANNER |
| 3 | **WOODWORKER** | 0.18 | Every wood-product path (logs → planks/parts → finished) passes through WOODWORKER |
| 4 | MINER | 0.12 | Feeds SMELTER + MASON directly |
| 5 | LUMBERJACK | 0.08 | Feeds WOODWORKER + multiple direct consumers |
| 6 | HUNTER | 0.04 | Sole feeder of TANNER |

### Disconnected Subgraphs

The economy naturally clusters into **4 loosely-connected subgraphs**:

1. **Metal Cluster:** MINER → SMELTER → {BLACKSMITH, ARMORER, JEWELER, ENCHANTER}
2. **Organic Cluster:** {FARMER, RANCHER, FISHERMAN, HERBALIST, HUNTER} → {COOK, BREWER, ALCHEMIST, TANNER}
3. **Wood Cluster:** LUMBERJACK → WOODWORKER → {FLETCHER, SCRIBE}
4. **Textile Cluster:** RANCHER → TAILOR (with TANNER cross-link)

**Cross-cluster bridges:**
- TANNER bridges Organic → Metal (leather for ARMORER)
- WOODWORKER bridges Wood → Metal (handles for BLACKSMITH)
- LUMBERJACK bridges Wood → Organic (fuel logs for COOK)
- TANNER bridges Organic → Textile (Cured Leather for TAILOR)

### Leaf Nodes (Pure End-Point Professions)

**Pure producers (out-degree > 0, in-degree = 0):** FARMER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER
**Pure consumers (out-degree = 0, in-degree > 0):** COOK, BREWER, ALCHEMIST, BLACKSMITH, ARMORER, JEWELER, FLETCHER, ENCHANTER, MASON, SCRIBE, LEATHERWORKER

**Bidirectional flow (both produce AND consume):** SMELTER, TANNER, WOODWORKER, TAILOR, RANCHER
These are the **processing hub** professions that add value in the middle of supply chains.

---

## Method 3: 30-Day P&L Profiles (All 29 Professions)

### Methodology Notes

- **Self-Sufficient (Scenario A):** Player gathers own materials when possible. If profession is crafting-only, they spend some actions gathering raw materials and the rest crafting.
- **Market-Dependent (Scenario B):** Player buys all inputs from market at base_value, spends all actions on their highest-value activity.
- **Market fee:** 10% on all sales. 0% on purchases (buyer pays asking price; seller pays the fee).
- **All professions modeled at Apprentice tier** (L3-4) unless noted.
- **Cottage tax:** 5g/day is a universal cost all players bear. Excluded from profession-specific P&L to keep comparison fair. (If included, it would subtract 150g from all 30-day totals equally.)

---

### FARMER
**Type:** Gathering | **Startup Cost:** 0g (public orchard) or ~field asset cost | **Recurring Daily Cost:** 0g

FARMER Apprentice gathers at private grain_field/vegetable_patch (3g items) or public orchard (Apples, 3g). Average yield: 2 items/action at Apprentice.

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (30 × 2 items × 3g) | 180g | 180g |
| Material Costs | 0g | 0g |
| Market Fees (10% on sales) | -18g | -18g |
| Capital Amortization | 0g | 0g |
| Tool Replacement | 0g | 0g |
| **Net Profit (30 days)** | **162g** | **162g** |
| **Daily Average** | **5.4g/day** | **5.4g/day** |

**Break-Even:** 0 days (no capital required)
**Dependency Score:** Upstream 0/5 | Downstream 3/5 (COOK, BREWER, TAILOR)
**Bottleneck Risk:** LOW
**Balance Verdict:** Healthy but low-income. FARMER is an entry-level profession that feeds several crafters. Revenue improves significantly at Craftsman tier with Hops (6g) and Cotton fields.

---

### RANCHER
**Type:** Gathering (asset-based) | **Startup Cost:** 230-730g | **Recurring Daily Cost:** Grain feed

RANCHER Apprentice requires buildings (Chicken Coop 100g, Dairy Barn 150g) and livestock (Chickens 30g each, Cows 80g each). Minimum startup: 1 Coop (100g) + 1 Chicken (30g) = 130g. Reasonable startup: 1 Coop + 3 Chickens + 1 Barn + 1 Cow = 100 + 90 + 150 + 80 = 420g. But players start with 0g.

Animals auto-produce every 3 ticks if fed. Chickens produce 1-2 Eggs (8g). Cows produce 1 Milk (12g). Feed costs: 1 Grain (3g) per chicken per feed, 2 Grain (6g) per cow per feed.

With 3 chickens + 1 cow (420g startup):
- Eggs: 10 feed cycles/30 days × 3 chickens × 1.5 avg Eggs × 8g = 360g gross
- Milk: 10 feed cycles × 1 cow × 1 Milk × 12g = 120g gross
- Total gross: 480g
- Feed cost: 10 cycles × (3×3g + 1×6g) = 10 × 15g = 150g
- Market fee: 10% of 480g = 48g

**30-Day P&L — Apprentice (passive production, 1 action/day for other tasks)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (Eggs + Milk) | 480g | 480g |
| Feed Cost (Grain) | -150g (self-gathered) | -150g (market price) |
| Market Fees (10% on sales) | -48g | -48g |
| Capital Amortization (420g / 30d) | -14g | -14g |
| Animal Death Risk (~2% per 30d) | -8g | -8g |
| **Net Profit (30 days)** | **260g** | **260g** |
| **Daily Average** | **8.7g/day** | **8.7/day** |

**BUT: The cold-start problem.** With 0g starting gold, RANCHER cannot buy buildings or livestock until they earn 420g from other activities (~78 days of Apprentice gathering). This is a **gating barrier**, not a daily P&L issue.

**Break-Even:** 420g / 8.7g = **48 days** (after becoming operational) + ~78 days to save startup = **~126 days total**
**Dependency Score:** Upstream 1/5 (FARMER for Grain) | Downstream 2/5 (COOK, TAILOR)
**Bottleneck Risk:** LOW (products substitutable with other food/materials)
**Balance Verdict:** **Gold trap** at Apprentice. Viable mid-game profession but impossible to start without external funding or a prior profession bankrolling it. The 126-day total break-even is extreme.

---

### FISHERMAN
**Type:** Gathering | **Startup Cost:** 0g | **Recurring Daily Cost:** 0g

Apprentice gathers Raw Fish (4g, yield 1-3, avg 2). Craftsman gathers River Trout (22g) and Lake Perch (25g).

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (30 × 2 × 4g) | 240g | 240g |
| Material Costs | 0g | 0g |
| Market Fees (10%) | -24g | -24g |
| **Net Profit (30 days)** | **216g** | **216g** |
| **Daily Average** | **7.2g/day** | **7.2g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy entry-level. Scales well at Craftsman (River Trout/Lake Perch at 22-25g → ~40-50g/day).

---

### LUMBERJACK
**Type:** Gathering | **Startup Cost:** 0g | **Recurring Daily Cost:** 0g

Apprentice gathers Wood Logs (5g, yield 1-3, avg 2) at public forest spots.

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (30 × 2 × 5g) | 300g | 300g |
| Market Fees (10%) | -30g | -30g |
| **Net Profit (30 days)** | **270g** | **270g** |
| **Daily Average** | **9.0g/day** | **9.0g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy. Strong demand from 6+ professions. Hardwood at Journeyman (25g) makes this very profitable mid-game.

---

### MINER
**Type:** Gathering | **Startup Cost:** 0g | **Recurring Daily Cost:** 0g

Apprentice gathers Iron Ore (6g), Stone Blocks (7g), or Clay (4g). Average: ~5.5g per item, 2 items/action.

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (30 × 2 × 5.5g) | 330g | 330g |
| Market Fees (10%) | -33g | -33g |
| **Net Profit (30 days)** | **297g** | **297g** |
| **Daily Average** | **9.9g/day** | **9.9g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy. Highest-value Apprentice gathering. Coal (12g) and Silver Ore (30g) at higher tiers make MINER one of the best professions economically.

---

### HERBALIST
**Type:** Gathering | **Startup Cost:** 0g | **Recurring Daily Cost:** 0g

Apprentice gathers Wild Herbs (5g, yield 1-2, avg 1.5).

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (30 × 1.5 × 5g) | 225g | 225g |
| Market Fees (10%) | -22.5g | -22.5g |
| **Net Profit (30 days)** | **202g** | **202g** |
| **Daily Average** | **6.7g/day** | **6.7g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy. Slightly below average due to lower yield (1-2 vs 1-3). Excellent at Craftsman with Medicinal Herbs (28g) and Glowcap Mushrooms (32g).

---

### HUNTER
**Type:** Gathering | **Startup Cost:** 0g | **Recurring Daily Cost:** 0g

Apprentice gathers Wild Game Meat (5g) + Animal Pelts (8g bonus drop). Effective value depends on pelt drop rate. At L3: ~2 Meat + ~1 Pelts per action.

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (30 × (2×5g + 1×8g)) | 540g | 540g |
| Market Fees (10%) | -54g | -54g |
| **Net Profit (30 days)** | **486g** | **486g** |
| **Daily Average** | **16.2g/day** | **16.2g/day** |

**Break-Even:** 0 days
**Balance Verdict:** **Potential gold printer** if pelt drops are reliable. If Animal Pelts are only a bonus drop (not guaranteed), actual income is lower. At Craftsman with Wolf Pelts (28g) and Bear Hides (35g), HUNTER becomes the highest-earning gatherer. Need to verify pelt drop rates — if it's 2 Meat + 1 Pelt every action, HUNTER income is 1.8x the next best gatherer (MINER).

**Note:** The YAML says L3-6 yields "Wild Game Meat only + Animal Pelts (bonus drop)" — suggesting pelts are NOT guaranteed every action. If pelts drop ~50% of the time, revenue drops to (2×5g + 0.5×8g) × 30 = 420g → 378g net → 12.6g/day. Still high.

---

### COOK
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Input ingredients

COOK Apprentice has 8 recipes. Best T1: Grilled Fish (base_value 10g, inputs: 2 Raw Fish + 1 Wood Logs). At Apprentice, 1 craft/day.

**Scenario A — Self-Sufficient:** Must gather own ingredients AND craft. With 1 action/day, can only gather OR craft, not both. Needs to alternate: gather day 1, craft day 2. Effectively 0.5 crafts/day.

**Scenario B — Market-Dependent:** Buy all ingredients, craft every day.

**30-Day P&L — Apprentice (1 action/day, crafting Grilled Fish)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 crafts × 10g) | 150g | (30 crafts × 10g) 300g |
| Material Costs | 0g (self-gathered) | -(30 × (2×4g + 1×5g)) = -390g |
| Market Fees (10% on sales) | -15g | -30g |
| **Net Profit (30 days)** | **135g** | **-120g** |
| **Daily Average** | **4.5g/day** | **-4.0g/day** |

Market-dependent COOK is **unprofitable** on Grilled Fish because input cost (13g) > output value (10g) minus fees. This is a fundamental recipe pricing problem — the base_value of Grilled Fish (10g) is LESS than the sum of its inputs (2×4g + 5g = 13g).

**Better recipe: Vegetable Stew** (8g output, inputs: 3 Vegetables + 1 Wood Logs = 3×3g + 5g = 14g) — also unprofitable.

**Actually profitable: Apple Sauce** (8g output, inputs: 3 Apples + 1 Wood Logs = 3×3g + 5g = 14g) — also unprofitable.

**The COOK pricing problem:** At Apprentice, EVERY COOK recipe has output base_value LESS than input base_value sum. COOKs add HP restoration value, not gold value. The economic value of COOK products is in **consumption utility** (HP restore, buffs), not resale margin.

Recalculating with more realistic market pricing (food sells above base_value due to HP utility — estimate 1.5x base_value):

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 15g) | 225g | (30 × 15g) 450g |
| Material Costs | 0g | -390g |
| Market Fees (10%) | -22.5g | -45g |
| **Net Profit (30 days)** | **202g** | **15g** |
| **Daily Average** | **6.7g/day** | **0.5g/day** |

**Break-Even:** 0 days (no capital), but market-dependent scenario is barely viable
**Balance Verdict:** Self-sufficient COOK is viable. Market-dependent COOK requires food to sell at significant premium over base_value. T2/T3 recipes (Harvest Feast 35g, Spiced Pastry 40g) have better margins.

---

### BREWER
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Input ingredients

Apprentice recipes: Ale (2x, from 3 Grain), Apple Cider (2x, from 3 Apples), Berry Cordial (2x, from 3 Wild Berries + 1 Grain).

Ale: Output 2× Ale. Ale base_value not explicitly listed but beverages grant buffs (+1 CON). Estimate ~8g per Ale = 16g output from 9g input (3×3g Grain). Margin: 7g per craft.

**30-Day P&L — Apprentice (1 action/day, crafting Ale)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 crafts × 16g) | 240g | (30 crafts × 16g) 480g |
| Material Costs | 0g | -(30 × 9g) = -270g |
| Market Fees (10%) | -24g | -48g |
| **Net Profit (30 days)** | **216g** | **162g** |
| **Daily Average** | **7.2g/day** | **5.4g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy. Better margins than COOK because beverages output 2 items per craft and buff utility supports premium pricing.

---

### SMELTER
**Type:** Crafting (Processing) | **Startup Cost:** 0g | **Recurring Daily Cost:** Ore inputs

Apprentice: Smelt Copper (3 Copper Ore + 1 Coal → 2 Copper Ingot). Copper Ingot value ~15g each. Inputs: 3×6g + 12g = 30g. Output: 2×15g = 30g. Break-even at base prices.

Better recipe: Forge Nails (1 Copper Ingot → 50 Nails). Nails are widely used. Value ~1g per 10 = 5g per stack. Hmm, Nails are low-value individually.

Iron Ingot (L10): 3 Iron Ore + 2 Coal → 2 Iron Ingots. Input: 3×6g + 2×12g = 42g. Iron Ingot ~20g each = 40g. Slightly negative at base prices but Iron Ingots have high demand.

**30-Day P&L — Apprentice (1 action/day, smelting copper)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 30g) | 450g | (30 × 30g) 900g |
| Material Costs | 0g | -(30 × 30g) = -900g |
| Market Fees (10%) | -45g | -90g |
| **Net Profit (30 days)** | **405g** | **-90g** |
| **Daily Average** | **13.5g/day** | **-3.0g/day** |

**Break-Even:** 0 days (self-sufficient)
**Balance Verdict:** Processing profession — strong self-sufficient, poor market-dependent. Best played as a combo profession (MINER + SMELTER). The real value is in enabling downstream crafting (BLACKSMITH needs ingots).

---

### BLACKSMITH
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Metal + Wood inputs

Apprentice L3 recipes use Iron Ore Chunks + Wood Logs (raw materials, no SMELTER needed). Iron Sword: inputs ~2 Iron Ore Chunks (6g each) + 2 Wood Logs (5g each) = 22g. Output value: ~30-40g (weapon).

**30-Day P&L — Apprentice (1 action/day, forging Iron Sword)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 35g) | 525g | (30 × 35g) 1,050g |
| Material Costs | 0g | -(30 × 22g) = -660g |
| Market Fees (10%) | -52.5g | -105g |
| **Net Profit (30 days)** | **472g** | **285g** |
| **Daily Average** | **15.7g/day** | **9.5g/day** |

**Break-Even:** 0 days
**Balance Verdict:** **Strong earner** at all levels. Weapons and tools are universally needed. Equipment durability ensures perpetual demand. Even market-dependent BLACKSMITH is profitable.

---

### ARMORER
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Ingot + Leather inputs

Apprentice: Copper Helm (1 Copper Ingot = ~15g input). Armor output ~25-40g.

**30-Day P&L — Apprentice (1 action/day, Copper Helm)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 30g) | 450g | (30 × 30g) 900g |
| Material Costs | 0g | -(30 × 15g) = -450g |
| Market Fees (10%) | -45g | -90g |
| **Net Profit (30 days)** | **405g** | **360g** |
| **Daily Average** | **13.5g/day** | **12.0g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Strong earner. Armor has constant demand from durability degradation and death penalties.

---

### WOODWORKER
**Type:** Crafting (Processing + Finished Goods) | **Startup Cost:** 0g | **Recurring Daily Cost:** Wood inputs

Apprentice processing: Saw Rough Planks (Wood Logs → Planks). Finished goods: Wooden Pickaxe, Fishing Rod, Carving Knife.

Wooden Pickaxe: inputs ~3 Wood Logs (15g). Output tool value ~20-25g.

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 22g) | 330g | (30 × 22g) 660g |
| Material Costs | 0g | -(30 × 15g) = -450g |
| Market Fees (10%) | -33g | -66g |
| **Net Profit (30 days)** | **297g** | **144g** |
| **Daily Average** | **9.9g/day** | **4.8g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy. Tools and processed wood are in high demand. Furniture adds housing-market revenue stream.

---

### TANNER
**Type:** Crafting (Processing + Finished Goods) | **Startup Cost:** 0g | **Recurring Daily Cost:** Pelt inputs

Apprentice: Cure Leather (3 Animal Pelts → 2 Cured Leather). Pelts at 8g each = 24g input. Cured Leather at 18g each = 36g output.

**30-Day P&L — Apprentice (1 action/day, Cured Leather processing)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 36g) | 540g | (30 × 36g) 1,080g |
| Material Costs | 0g | -(30 × 24g) = -720g |
| Market Fees (10%) | -54g | -108g |
| **Net Profit (30 days)** | **486g** | **252g** |
| **Daily Average** | **16.2g/day** | **8.4g/day** |

Alternatively, crafting Leather Cap (2 Cured Leather → 30g output):
- Self-sufficient: Need to cure leather AND craft. 2 actions per item (cure + craft). With 1 action/day, 15 items in 30 days. Revenue: 15 × 30g = 450g. But need 30 Cured Leather = 15 cure actions + 15 craft actions = 30 actions (perfect).
- Market-dependent: Buy Cured Leather (18g × 2 = 36g input), craft cap (30g output) = -6g per craft. **Unprofitable** buying intermediates.

**Break-Even:** 0 days
**Balance Verdict:** Strong as HUNTER+TANNER combo. Pure market-dependent TANNER processing is profitable; finished goods market-dependent is marginal. The two-step pipeline (cure then craft) halves effective throughput for self-sufficient tanners making finished goods.

---

### LEATHERWORKER
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Leather + Wood inputs

Apprentice: Leather Gloves (2 Cured Leather = 36g input, ~25g output), Leather Boots (3 Cured Leather = 54g input, ~30g output). These are unprofitable at market prices because LEATHERWORKER products are utility items (HANDS/FEET/BACK slots) with lower base_value than their leather inputs.

**30-Day P&L — Apprentice (1 action/day, Leather Gloves)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 25g) | 375g | (30 × 25g) 750g |
| Material Costs | 0g | -(30 × 36g) = -1,080g |
| Market Fees (10%) | -37.5g | -75g |
| **Net Profit (30 days)** | **337g** | **-405g** |
| **Daily Average** | **11.2g/day** | **-13.5g/day** |

**Break-Even:** 0 days (self-sufficient only)
**Balance Verdict:** **Dead end if market-dependent.** Input costs exceed output values. Only viable as a HUNTER+TANNER+LEATHERWORKER self-sufficiency chain, which requires 3 profession slots and considerable leveling.

---

### TAILOR
**Type:** Crafting (Processing + Armor) | **Startup Cost:** 0g | **Recurring Daily Cost:** Wool + Leather inputs

Apprentice processing: Weave Cloth (3 Wool → 2 Woven Cloth). Wool ~15g, Woven Cloth ~20g. Input: 45g, Output: 40g. **Negative margin** on processing.

Apprentice armor: Cloth Hood (2 Woven Cloth → 25g). Input: 2 × 20g = 40g. Output: 25g. **Also negative.**

The issue: RANCHER products (Wool 15g, Fine Wool 30g, Silkworm Cocoons 38g) are expensive inputs for TAILOR, but TAILOR outputs at Apprentice (25-45g) don't mark up enough.

**30-Day P&L — Apprentice (1 action/day, Woven Cloth processing)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 40g) | 600g | (30 × 40g) 1,200g |
| Material Costs | 0g | -(30 × 45g) = -1,350g |
| Market Fees (10%) | -60g | -120g |
| **Net Profit (30 days)** | **540g** | **-270g** |
| **Daily Average** | **18.0g/day** | **-9.0g/day** |

**Break-Even:** 0 days (self-sufficient only — but requires RANCHER alt or market Wool)
**Balance Verdict:** TAILOR is structurally dependent on RANCHER but RANCHER products are expensive. Self-sufficient TAILOR (owning RANCHER + TAILOR) is profitable. Market-dependent TAILOR at Apprentice is a **gold trap.** T3 items (Archmage's Robe 150g, Enchanted Cloak 180g) have much better margins.

---

### ALCHEMIST
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Herb + Berry inputs

Apprentice: Minor Healing Potion (3 Wild Herbs + 1 Wild Berries + 1 Clay = ~18g input). Potion value ~25g.

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 25g) | 375g | (30 × 25g) 750g |
| Material Costs | 0g | -(30 × 18g) = -540g |
| Market Fees (10%) | -37.5g | -75g |
| **Net Profit (30 days)** | **337g** | **135g** |
| **Daily Average** | **11.2g/day** | **4.5g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy. Potions are consumables with constant demand. Market-dependent is viable but tight.

---

### ENCHANTER
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Reagent + Ingot inputs

Apprentice L5: Fortified Enchantment Scroll. Inputs: expensive (Arcane Reagents, Ingots). Output value high (~50-80g).

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 60g) | 900g | (30 × 60g) 1,800g |
| Material Costs | 0g | -(30 × 40g) = -1,200g |
| Market Fees (10%) | -90g | -180g |
| **Net Profit (30 days)** | **810g** | **420g** |
| **Daily Average** | **27.0g/day** | **14.0g/day** |

**Break-Even:** 0 days
**Balance Verdict:** **High earner** but gated behind L5+ unlock and expensive inputs. Enchantment scrolls are luxury goods with limited demand — depends on player willingness to buy.

---

### JEWELER
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Ingot + Gem inputs

Apprentice L1: Copper Ring (1 Copper Ingot + 1 Gemstone = ~25g input, output ~20g). **Negative margin** at Apprentice.

Higher tier: Silver Ring (L20, Silver Ingot + Gemstone = ~45g input, output ~50g). Marginal.

**30-Day P&L — Apprentice (1 action/day, Copper Ring)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 20g) | 300g | (30 × 20g) 600g |
| Material Costs | 0g | -(30 × 25g) = -750g |
| Market Fees (10%) | -30g | -60g |
| **Net Profit (30 days)** | **270g** | **-210g** |
| **Daily Average** | **9.0g/day** | **-7.0g/day** |

**Break-Even:** 0 days (self-sufficient)
**Balance Verdict:** Market-dependent JEWELER loses money at Apprentice. Higher-tier jewelry (Gold Ring, Crown of Wisdom) has better margins. Niche profession.

---

### FLETCHER
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Wood + Leather inputs

Apprentice: Bowstring (leather), Arrows (wood + feathers), Shortbow. Shortbow (~25g output, ~15g wood input).

**30-Day P&L — Apprentice (1 action/day, Shortbow)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 25g) | 375g | (30 × 25g) 750g |
| Material Costs | 0g | -(30 × 15g) = -450g |
| Market Fees (10%) | -37.5g | -75g |
| **Net Profit (30 days)** | **337g** | **225g** |
| **Daily Average** | **11.2g/day** | **7.5g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Healthy. Ranged weapons serve ranger/hunter builds. Moderate but stable demand.

---

### MASON
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Stone + Clay inputs

Apprentice: Cut Stone (2 Stone Blocks → Cut Stone, ~12g output from 14g input). **Negative margin.**

**30-Day P&L — Apprentice (1 action/day, Cut Stone)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 12g) | 180g | (30 × 12g) 360g |
| Material Costs | 0g | -(30 × 14g) = -420g |
| Market Fees (10%) | -18g | -36g |
| **Net Profit (30 days)** | **162g** | **-96g** |
| **Daily Average** | **5.4g/day** | **-3.2g/day** |

**Break-Even:** 0 days (self-sufficient)
**Balance Verdict:** Low income. MASON processes building materials — demand is event-driven (construction), not steady. Market-dependent is unprofitable. Housing items at higher tiers (Stone Fountain, Marble Statue) have better margins but rare demand.

---

### SCRIBE
**Type:** Crafting | **Startup Cost:** 0g | **Recurring Daily Cost:** Wood + Herb inputs

Apprentice L5: Area Map. Inputs: ~15g (Planks + Herbs). Output: ~20g.

**30-Day P&L — Apprentice (1 action/day)**

| Line Item | Self-Sufficient | Market-Dependent |
|-----------|---------------:|----------------:|
| Gross Revenue (15 × 20g) | 300g | (30 × 20g) 600g |
| Material Costs | 0g | -(30 × 15g) = -450g |
| Market Fees (10%) | -30g | -60g |
| **Net Profit (30 days)** | **270g** | **90g** |
| **Daily Average** | **9.0g/day** | **3.0g/day** |

**Break-Even:** 0 days
**Balance Verdict:** Low but viable. Scrolls are consumables but niche (combat utility, maps). Limited market depth.

---

### SERVICE PROFESSIONS (7)

#### MERCHANT
**Startup Cost:** 0g | **Mechanic:** 5% market fee (vs 10% standard)

MERCHANT doesn't produce or craft — it reduces transaction costs. A MERCHANT who trades 100g/day of goods saves 5g/day in fees compared to a non-Merchant.

**30-Day Value:** 5g/day savings × 30 = **150g saved** (not earned, but preserved)
**Balance Verdict:** **Multiplier profession** — amplifies other profession income. Excellent as a 2nd or 3rd profession slot.

#### INNKEEPER, HEALER, STABLE_MASTER, COURIER, MERCENARY_CAPTAIN
**Status:** PLANNED (not implemented)
**Revenue:** **0g** — no mechanics exist
**Balance Verdict:** **Non-functional.** Players who pick these waste a profession slot. This is the single largest structural gap in the economy.

#### BANKER
**Status:** PLANNED (loan system exists in code)
**Revenue:** Interest on loans (if implemented)
**Balance Verdict:** Theoretical — needs implementation verification.

---

## Method 4: Break-Even Comparison Table

| Rank | Profession | Startup Cost | Daily Net (Self-Suff) | Daily Net (Market) | Break-Even (Days) | Verdict |
|-----:|-----------|------------:|-----------:|-----------:|----------:|---------|
| 1 | ENCHANTER | 0g | 27.0g | 14.0g | 0 | Gold printer |
| 2 | HUNTER | 0g | 16.2g | 16.2g | 0 | Gold printer |
| 3 | TANNER | 0g | 16.2g | 8.4g | 0 | Strong |
| 4 | BLACKSMITH | 0g | 15.7g | 9.5g | 0 | Strong |
| 5 | ARMORER | 0g | 13.5g | 12.0g | 0 | Strong |
| 6 | SMELTER | 0g | 13.5g | -3.0g | 0 | Combo only |
| 7 | TAILOR | 0g | 18.0g | -9.0g | 0 | Self-suff only |
| 8 | LEATHERWORKER | 0g | 11.2g | -13.5g | 0 | Self-suff only |
| 9 | FLETCHER | 0g | 11.2g | 7.5g | 0 | Healthy |
| 10 | ALCHEMIST | 0g | 11.2g | 4.5g | 0 | Healthy |
| 11 | MINER | 0g | 9.9g | 9.9g | 0 | Healthy |
| 12 | WOODWORKER | 0g | 9.9g | 4.8g | 0 | Healthy |
| 13 | LUMBERJACK | 0g | 9.0g | 9.0g | 0 | Healthy |
| 14 | JEWELER | 0g | 9.0g | -7.0g | 0 | Self-suff only |
| 15 | SCRIBE | 0g | 9.0g | 3.0g | 0 | Low but viable |
| 16 | BREWER | 0g | 7.2g | 5.4g | 0 | Healthy |
| 17 | FISHERMAN | 0g | 7.2g | 7.2g | 0 | Healthy |
| 18 | HERBALIST | 0g | 6.7g | 6.7g | 0 | Healthy |
| 19 | COOK | 0g | 6.7g | 0.5g | 0 | Barely viable |
| 20 | FARMER | 0g | 5.4g | 5.4g | 0 | Entry-level |
| 21 | MASON | 0g | 5.4g | -3.2g | 0 | Self-suff only |
| 22 | RANCHER | 420g | 8.7g | 8.7g | **126** | **Gold trap** |
| 23-29 | 5 Service (planned) | 0g | 0g | 0g | **Never** | **Non-functional** |

### Flagged Outliers

**Break-even > 60 days (too long):**
- RANCHER: 126 days total (78 days saving + 48 days operational break-even)

**Professions unprofitable when market-dependent:**
- SMELTER (-3.0g/day), TAILOR (-9.0g/day), LEATHERWORKER (-13.5g/day), JEWELER (-7.0g/day), MASON (-3.2g/day), COOK (0.5g/day barely)

These professions REQUIRE self-gathered or combo-profession inputs to be viable. This is by design (forces interdependency) but creates a harsh cliff between "has gathering profession" and "doesn't."

---

## Method 5: Gold Flow Analysis

### Gold Sources (Per 100-Player Server Per Day)

| Source | Amount | Frequency | Est. Daily Total |
|--------|-------:|-----------|----------:|
| Main quest gold (12 quests, avg 530g) | 530g | One-time per player | ~17g/day (amortized over 30d, 100 players) |
| Town quest gold (20 quests, avg 180g) | 180g | One-time per player | ~6g/day |
| Recurring quest gold (8 quests, avg 160g) | 160g | Every 3-7 days | ~2,286g/day (100 players × 1 recurring/3 days × 69g avg) |
| PvE combat loot | ~10g avg | ~20% of players/day | ~200g/day |
| Login/streak bonus | 0g (XP only) | Daily | 0g |
| **Total Daily Gold Injection** | | | **~2,500g/day** |

### Gold Sinks (Per 100-Player Server Per Day)

| Sink | Amount | Frequency | Est. Daily Total |
|------|-------:|-----------|----------:|
| Market fees (10% on transactions) | 10% of trade volume | Every transaction | ~1,000g/day (est. 10,000g daily trade volume) |
| Property tax (cottages) | 5g/player | Daily | ~500g/day |
| Property tax (workshops) | 20g/workshop | Daily | ~200g/day (10 workshops) |
| RANCHER buildings + livestock | 30-250g | One-time | ~50g/day (amortized, ~5 ranchers) |
| RANCHER feed costs | 3-6g/animal | Every 3 days | ~50g/day |
| Tool replacement (50 uses) | ~15-30g per tool | Every 50 days | ~100g/day |
| Building maintenance | 5-10g | Weekly | ~100g/day |
| Death penalty (5% gold) | Variable | ~5% of players/day | ~50g/day |
| **Total Daily Gold Drain** | | | **~2,050g/day** |

### Net Gold Flow

**Daily net:** +2,500g injected − 2,050g drained = **+450g/day surplus** (mildly inflationary)

However, this changes over time:
- **Early game (Day 1-30):** Strongly inflationary — quest rewards are front-loaded, market activity is low
- **Mid game (Day 30-90):** Roughly balanced — quest rewards thin out, market fees increase
- **Late game (Day 90+):** **Deflationary** — quest rewards exhausted, property taxes and fees dominate

The economy's long-term trajectory is deflationary because gold sources are finite (quests) while gold sinks are perpetual (taxes, fees, tool replacement).

### Gold Velocity Estimate

With 10,000g in daily trade volume across 100 players:
- Average gold per player: ~200g
- Average trades per player per day: ~2 (1 buy + 1 sell)
- Gold velocity: 10,000g traded / 20,000g total gold supply = **~0.5 turns per day**

This is LOW velocity for an MMORPG economy. Gold is changing hands slowly, which compounds the deflationary pressure. Players are hoarding rather than trading.

---

## Method 6: Sensitivity Analysis

### Professions That Flip Unprofitable at -25% Prices

If market prices drop 25% below base_value:

| Profession | Current Daily (Market-Dep) | At -25% Prices | Status |
|-----------|----------------:|---------------:|--------|
| COOK | 0.5g/day | -5.7g/day | **FLIPS** |
| BREWER | 5.4g/day | 1.4g/day | Survives |
| SCRIBE | 3.0g/day | -0.8g/day | **FLIPS** |
| SMELTER | -3.0g/day | -10.5g/day | Already negative |
| MASON | -3.2g/day | -6.2g/day | Already negative |
| WOODWORKER | 4.8g/day | 0.3g/day | Barely survives |
| ALCHEMIST | 4.5g/day | -0.8g/day | **FLIPS** |
| FLETCHER | 7.5g/day | 3.8g/day | Survives |
| FARMER | 5.4g/day | 4.1g/day | Survives (raw materials) |

**Margin professions** (within 25% of breakeven): COOK, SCRIBE, ALCHEMIST, WOODWORKER

### Professions Fragile to 50% Population Drop

| Profession Losing Players | Downstream Impact | Severity | Rating |
|--------------------------|-------------------|----------|--------|
| **SMELTER** | BLACKSMITH, ARMORER, JEWELER, ENCHANTER all stall | Critical — no alternatives | **FRAGILE** |
| **TANNER** | LEATHERWORKER, TAILOR, ARMORER, FLETCHER lose leather | High — no alternatives | **FRAGILE** |
| **WOODWORKER** | FLETCHER, LEATHERWORKER, SCRIBE, BLACKSMITH lose parts | High — no alternatives | **FRAGILE** |
| **HUNTER** | TANNER loses all pelt supply → cascading failure | High — sole source | **FRAGILE** |
| **MINER** | SMELTER slows → cascading metal shortage | Moderate — MINER has broad resource variety | **MODERATE** |
| **FARMER** | COOK, BREWER, RANCHER lose ingredients | Moderate — some items have alternatives | **MODERATE** |
| **LUMBERJACK** | WOODWORKER slows, COOK loses fuel | Moderate — widespread but substitutable | **MODERATE** |
| **FISHERMAN** | COOK loses fish recipes (7 of 25) | Low — COOK has many alternative recipes | **RESILIENT** |
| **HERBALIST** | ALCHEMIST, BREWER slow | Low — multiple consumers buffer the impact | **RESILIENT** |
| **RANCHER** | TAILOR loses Wool/Silk supply | Moderate — TAILOR has no alternative wool source | **FRAGILE** |

### Most Resilient Professions

1. **FARMER** — low-value but universally needed; always has something to sell
2. **MINER** — multiple resource types across many regions; broad demand base
3. **LUMBERJACK** — wood is literally fuel for civilization; always in demand
4. **COOK** — 25 recipes from 6 different suppliers; loses one supplier, has others
5. **BLACKSMITH** — weapons and tools always needed; can use raw ore or ingots

---

## Method 7: Structural Gap Analysis

### A. Proposed Workshop Requirements

Currently only RANCHER has meaningful capital investment (buildings + livestock). Crafting professions have zero startup cost, creating an imbalance where crafters earn 10-27g/day from day one while RANCHER bleeds gold for 126 days.

| Profession | Proposed Workshop | Cost | Supplied By | Break-Even Impact | P&L Impact (30d) |
|-----------|-------------------|-----:|-------------|------------------:|----------------:|
| BLACKSMITH | Forge & Anvil | 200g | MINER (stone) + WOODWORKER (beams) | +23 days | -6.7g/day amortized |
| ARMORER | Shared Smithy | 200g | Same as BLACKSMITH | +17 days | -6.7g/day amortized |
| COOK | Kitchen Hearth | 100g | WOODWORKER (planks) + MASON (bricks) | +15 days | -3.3g/day amortized |
| TAILOR | Loom & Table | 150g | WOODWORKER (frame) + FARMER (cotton) | +8 days | -5.0g/day amortized |
| ALCHEMIST | Alchemy Lab | 150g | MASON (clay pots) + WOODWORKER (shelf) | +13 days | -5.0g/day amortized |
| BREWER | Brewing Vat | 100g | WOODWORKER (barrel) + MASON (hearth) | +14 days | -3.3g/day amortized |
| WOODWORKER | Workbench | 80g | Self-supplied (wood) + MINER (nails) | +8 days | -2.7g/day amortized |
| JEWELER | Jeweler's Bench | 120g | WOODWORKER (frame) + SMELTER (tools) | +13 days | -4.0g/day amortized |
| ENCHANTER | Enchanting Circle | 200g | MASON (marble) + ALCHEMIST (reagents) | +7 days | -6.7g/day amortized |
| FLETCHER | Fletcher's Bench | 80g | WOODWORKER (planks) + TANNER (leather) | +7 days | -2.7g/day amortized |
| MASON | Mason's Yard | 100g | Self-supplied (stone) + WOODWORKER | +19 days | -3.3g/day amortized |
| SMELTER | Smeltery | 150g | MINER (stone) + WOODWORKER (bellows) | +11 days | -5.0g/day amortized |
| SCRIBE | Scribe's Study | 80g | WOODWORKER (desk) + TANNER (leather) | +9 days | -2.7g/day amortized |

**Net effect:** Adds 80-200g startup cost to all crafters, creating 7-23 day break-even periods. This narrows the gap with RANCHER (126 days → still far worse, but crafters no longer start from zero). More importantly, workshops create **cross-profession demand for building materials**, adding new edges to the interdependency graph.

### B. Proposed Consumable Tool System

Tools already exist in-game with 50-use durability. The existing system covers:
- Pickaxe (MINER), Hoe (FARMER), Hatchet (LUMBERJACK), Fishing Rod (FISHERMAN), Sickle (HERBALIST)
- All crafted by BLACKSMITH or WOODWORKER

**Current tool durability:** 50 uses = 50 days of gathering. Tool replacement cost: ~15-30g (wooden/copper tier). Daily amortized: ~0.3-0.6g/day.

This is already working but the cost is trivially low. Proposed adjustments:

| Tool | Used By | Supplied By | Current Dur | Proposed Dur | Replace Cost | Gatherer P&L Impact | Supplier Revenue |
|------|---------|-------------|:-----------:|:------------:|:-----------:|:------------------:|:---------------:|
| Pickaxe | MINER | BLACKSMITH/WW | 50 | 30 | 20g | -0.7g/day | +0.7g per miner |
| Hoe | FARMER | BLACKSMITH | 50 | 30 | 15g | -0.5g/day | +0.5g per farmer |
| Hatchet | LUMBERJACK | BLACKSMITH/WW | 50 | 30 | 20g | -0.7g/day | +0.7g per jack |
| Fishing Rod | FISHERMAN | WOODWORKER | 50 | 30 | 15g | -0.5g/day | +0.5g per fisher |
| Sickle | HERBALIST | BLACKSMITH | 50 | 30 | 15g | -0.5g/day | +0.5g per herbalist |
| Hunting Knife | HUNTER | BLACKSMITH | 50 | 30 | 25g | -0.8g/day | +0.8g per hunter |

**Impact if all 7 gatherer types have 5 players each (35 gatherers):**
- Gatherers lose: 35 × 0.6g/day avg = **-21g/day total**
- Tool crafters gain: **+21g/day** distributed among BLACKSMITH/WOODWORKER

Reducing tool durability from 50 to 30 increases tool-crafting demand by 67% without making any gatherer unprofitable (biggest impact: HUNTER loses 0.8g/day from 16.2g = 5% reduction).

### C. Missing Recipe Links (Dead-End Items)

Items produced but never consumed by any recipe:

| Item Produced | Produced By | Current Consumers | Proposed New Consumer | Proposed Recipe |
|--------------|-------------|-------------------|---------------------|----------------|
| Cut Stone | MASON | Housing construction only | WOODWORKER | Stone-Reinforced Crate (Cut Stone + Planks) |
| Bricks | MASON | Housing construction only | MASON | Brick Workshop Floor (housing upgrade) |
| Clay Pot | MASON | None | ALCHEMIST | Improved Potion (Clay Pot + herbs) |
| Polished Marble | MASON | Housing only | JEWELER | Marble Pedestal (display housing) |
| Cloth (legacy) | TAILOR | WOODWORKER bed recipe | More ARMORER recipes | Padded Armor (Cloth + Iron Ingot) |
| All COOK outputs | COOK | Consumed by players | No recipe consumers | By design — food is an end product |
| All BREWER outputs | BREWER | Consumed by players | No recipe consumers | By design — drinks are end products |
| All weapon/armor outputs | Various | Equipped by players | No recipe consumers | By design — equipment is end products |
| Stone Slab | MASON | None currently | MASON | Stone Bench (housing, 2× Stone Slab + Cut Stone) |
| Glass | SMELTER | Few recipes | SCRIBE | Glass Vial (for ALCHEMIST potions) |

**Priority missing links:**
1. **MASON → more consumers:** MASON products (Cut Stone, Bricks, Marble) are almost entirely consumed by the housing system. Adding recipe links to WOODWORKER, ALCHEMIST, and JEWELER would give MASON steady crafting demand beyond sporadic construction events.
2. **Glass → ALCHEMIST:** SMELTER produces Glass from Silite Sand, but almost nothing uses Glass. Adding Glass Vials as ALCHEMIST inputs creates a SMELTER → ALCHEMIST link.
3. **Clay Pot → ALCHEMIST:** MASON crafts Clay Pots but nothing uses them. Making potions require Clay Pots adds MASON → ALCHEMIST demand.

---

## 30-Day P&L Ranking (All 29)

| Rank | Profession | Type | Net Profit (Self-Suff) | Net Profit (Market-Dep) | Break-Even | Verdict |
|-----:|-----------|------|----------:|----------:|----------:|---------|
| 1 | ENCHANTER | Crafting | 810g | 420g | 0d | Gold printer |
| 2 | HUNTER | Gathering | 486g | 486g | 0d | Gold printer |
| 3 | TANNER (processing) | Crafting | 486g | 252g | 0d | Strong |
| 4 | TAILOR (self-suff) | Crafting | 540g | -270g | 0d | Self-suff only |
| 5 | BLACKSMITH | Crafting | 472g | 285g | 0d | Strong |
| 6 | ARMORER | Crafting | 405g | 360g | 0d | Strong |
| 7 | SMELTER | Processing | 405g | -90g | 0d | Combo only |
| 8 | FLETCHER | Crafting | 337g | 225g | 0d | Healthy |
| 9 | ALCHEMIST | Crafting | 337g | 135g | 0d | Healthy |
| 10 | LEATHERWORKER | Crafting | 337g | -405g | 0d | Self-suff only |
| 11 | MINER | Gathering | 297g | 297g | 0d | Healthy |
| 12 | WOODWORKER | Crafting | 297g | 144g | 0d | Healthy |
| 13 | LUMBERJACK | Gathering | 270g | 270g | 0d | Healthy |
| 14 | SCRIBE | Crafting | 270g | 90g | 0d | Low but viable |
| 15 | JEWELER | Crafting | 270g | -210g | 0d | Self-suff only |
| 16 | RANCHER | Gathering | 260g | 260g | **126d** | Gold trap |
| 17 | BREWER | Crafting | 216g | 162g | 0d | Healthy |
| 18 | FISHERMAN | Gathering | 216g | 216g | 0d | Healthy |
| 19 | HERBALIST | Gathering | 202g | 202g | 0d | Healthy |
| 20 | COOK | Crafting | 202g | 15g | 0d | Barely viable |
| 21 | FARMER | Gathering | 162g | 162g | 0d | Entry-level |
| 22 | MASON | Crafting | 162g | -96g | 0d | Self-suff only |
| 23 | MERCHANT | Service | ~150g saved | ~150g saved | 0d | Multiplier |
| 24-28 | 5 Planned Services | Service | 0g | 0g | Never | Non-functional |
| 29 | BANKER | Service | Unknown | Unknown | Unknown | Not implemented |

**Spread:** Top earner (ENCHANTER, 27g/day self-suff) earns **5x** more than bottom viable earner (FARMER, 5.4g/day). This spread is acceptable in a tiered system — ENCHANTER requires L5 unlock and expensive inputs, while FARMER starts immediately.

**Unacceptable gaps:**
- RANCHER 126-day break-even vs every other profession at 0 days
- 5 service professions earning literally 0g/day
- 6 crafting professions unprofitable when market-dependent (forces multi-profession self-sufficiency which conflicts with the 3-profession limit)

---

## Top 10 Recommendations (Priority Ordered)

### 1. Implement Service Profession Revenue (5 professions)
**Source:** Method 3 (zero income), Method 4 (infinite break-even)
**Impact:** HIGH — 5 of 29 professions are non-functional
**Action:** Design and implement income mechanics for INNKEEPER, HEALER, STABLE_MASTER, COURIER, MERCENARY_CAPTAIN. At minimum, each should earn 5-15g/day through service actions (healing fees, delivery fees, escort fees, room rental, mount rental). These should consume items from other professions (ALCHEMIST potions for HEALER, COOK food for INNKEEPER, etc.).

### 2. Reduce RANCHER Startup Costs or Add Bootstrap Path
**Source:** Method 4 (126-day break-even), Method 3 (gold trap)
**Impact:** HIGH — RANCHER is the only gathering profession that requires capital
**Action options:**
- (a) Give all players a free Chicken Coop + 2 Chickens at character creation (instead of just a cottage)
- (b) Add a "Starter Flock" quest that awards a Chicken Coop at Level 3
- (c) Reduce building costs: Chicken Coop 50g (from 100g), Chickens 15g (from 30g)
- (d) Increase egg/milk base values: Eggs 12g (from 8g), Milk 18g (from 12g)
**Recommended:** Option (b) + (c). Reduces break-even from 126 to ~45 days.

### 3. Fix Crafting Recipe Margins for Market-Dependent Players
**Source:** Method 3 (6 professions unprofitable market-dependent), Method 6 (margin professions)
**Impact:** HIGH — market-dependent gameplay is a core design pillar
**Action:** Increase output base_values for recipes where output < sum(input base_values):
- COOK T1: Increase Apple Sauce 8g→14g, Porridge 7g→12g, Vegetable Stew 8g→14g
- MASON: Increase Cut Stone 12g→18g
- JEWELER Apprentice: Increase Copper Ring 20g→30g
- TAILOR processing: Increase Woven Cloth 20g→28g (from 15g × 3 Wool = 45g input)
**Principle:** Output base_value should be ≥ 1.3× sum(input base_values) for market-dependent viability after 10% fee.

### 4. Add MASON Recipe Links to Eliminate Dead-End Items
**Source:** Method 7C (dead-end items), Method 1 (zero row sum for MASON products)
**Impact:** MODERATE — MASON is currently building-event-dependent with no steady demand
**Action:** Add Clay Pot as ALCHEMIST input, Glass Vial as ALCHEMIST input, Cut Stone as WOODWORKER input. Creates 3 new edges in the dependency graph.

### 5. Add Workshop Requirements for All Crafting Professions
**Source:** Method 7A (RANCHER vs zero-cost crafters imbalance)
**Impact:** MODERATE — levels the playing field and creates construction demand
**Action:** Require 80-200g workshops for crafting professions (see Method 7A table). Creates cross-profession demand for building materials. Gives MASON and WOODWORKER steady demand.

### 6. Reduce Tool Durability from 50 to 30
**Source:** Method 7B (tool economy too cheap)
**Impact:** LOW-MODERATE — increases BLACKSMITH/WOODWORKER demand by 67%
**Action:** Change base tool durability from 50 to 30 uses. Costs gatherers ~0.5-0.8g/day (trivial), creates meaningful tool-crafting demand. No gatherer becomes unprofitable.

### 7. Add SMELTER Alternative Path (Emergency)
**Source:** Method 2 (betweenness centrality 0.38), Method 6 (fragile bottleneck)
**Impact:** MODERATE — reduces catastrophic risk
**Action:** Add 2-3 "direct smelting" recipes to BLACKSMITH (raw ore + coal → 1 ingot, less efficient than SMELTER's 2-ingot output). BLACKSMITH can self-supply at a premium, reducing single-point-of-failure risk. SMELTER remains the efficient choice.

### 8. Create Cross-Cluster Recipe Bridges
**Source:** Method 2 (disconnected subgraphs)
**Impact:** LOW-MODERATE — increases economic interconnection
**Action:** Add recipes that bridge the Metal, Organic, Wood, and Textile clusters:
- COOK recipe using Iron Pot (SMELTER → COOK link)
- TAILOR recipe using Softwood Planks for loom (WOODWORKER → TAILOR link)
- ALCHEMIST recipe using Glass Vials (SMELTER → ALCHEMIST link)

### 9. Increase RANCHER Product Values
**Source:** Method 3 (RANCHER P&L), Method 4 (break-even)
**Impact:** MODERATE — makes RANCHER operational faster
**Action:** Increase Eggs 8g→12g, Milk 12g→18g, Wool 15g→20g. Combined with Recommendation 2, brings RANCHER break-even from 126 to ~30-40 days.

### 10. Add Gold Source for Service Professions
**Source:** Method 5 (deflationary late-game), Method 3 (zero service income)
**Impact:** LOW-MODERATE — addresses long-term deflation
**Action:** Implement NPC-funded service rewards: HEALER earns 5g per heal from "town health fund," COURIER earns 3g per delivery from "postal service fund," INNKEEPER earns 2g per rest customer from "tourism fund." These are gold-from-nothing sources that offset the purely-sink economy for service players.

---

## Appendix: Raw Data Tables

### Resource Base Values (from YAML)

| Resource | Base Value | Gathered By | Yield | Tier |
|----------|----------:|------------|:-----:|:----:|
| Apples | 3g | FARMER | 1-3 | Public |
| Wild Herbs | 5g | HERBALIST | 1-2 | Public |
| Raw Fish | 4g | FISHERMAN | 1-3 | Public |
| Wood Logs | 5g | LUMBERJACK | 1-3 | Public |
| Iron Ore | 6g | MINER | 1-2 | Public |
| Stone Blocks | 7g | MINER | 1-2 | Public |
| Clay | 4g | MINER | 1-3 | Public |
| Wild Game Meat | 5g | HUNTER | 1-3 | Public |
| Animal Pelts | 8g | HUNTER | Bonus | L3+ |
| Coal | 12g | MINER | 1-2 | L5+ Asset |
| Silver Ore | 30g | MINER | 1-2 | L7+ Asset |
| Hardwood | 25g | LUMBERJACK | 1-2 | L7+ Asset |
| Wolf Pelts | 28g | HUNTER | Tiered | L7+ |
| Bear Hides | 35g | HUNTER | Tiered | L7+ |
| Medicinal Herbs | 28g | HERBALIST | Tiered | L7+ |
| Glowcap Mushrooms | 32g | HERBALIST | Tiered | L7+ |
| River Trout | 22g | FISHERMAN | Tiered | L7+ |
| Lake Perch | 25g | FISHERMAN | Tiered | L7+ |
| Eggs | 8g | RANCHER | 1-2 | Auto (chickens) |
| Milk | 12g | RANCHER | 1 | Auto (cows) |
| Wool | 15g | RANCHER | 1 | Auto (sheep) |
| Fine Wool | 30g | RANCHER | Bonus | L7+ |
| Silkworm Cocoons | 38g | RANCHER | Auto | L7+ Asset |
| Grain | 3g | FARMER | 1-3 | Private field |
| Vegetables | 3g | FARMER | 1-3 | Private field |
| Wild Berries | 3g | FARMER | 1-3 | Private field |
| Hops | 6g | FARMER | Tiered | L7+ |
| Grapes | 6g | FARMER | Tiered | L7+ |
| Cotton | 3g | FARMER | Tiered | L9+ |

### Key Processed Material Values

| Material | Base Value | Produced By | Key Consumers |
|----------|----------:|------------|---------------|
| Cured Leather | 18g | TANNER | TANNER, TAILOR, LEATHERWORKER, ARMORER |
| Wolf Leather | 35g | TANNER | TANNER, TAILOR, LEATHERWORKER |
| Bear Leather | 42g | TANNER | TANNER, TAILOR, LEATHERWORKER |
| Woven Cloth | 20g | TAILOR | TAILOR (armor) |
| Fine Cloth | 38g | TAILOR | TAILOR (T3 armor) |
| Silk Fabric | 45g | TAILOR | TAILOR (T3 armor) |
| Copper Ingot | ~15g | SMELTER | BLACKSMITH, ARMORER, JEWELER |
| Iron Ingot | ~20g | SMELTER | BLACKSMITH, ARMORER |
| Steel Ingot | ~35g | SMELTER | BLACKSMITH, ARMORER |
| Softwood Planks | ~8g | WOODWORKER | FLETCHER, SCRIBE, Housing |
| Hardwood Planks | ~20g | WOODWORKER | FLETCHER, BLACKSMITH |
| Wooden Handle | ~10g | WOODWORKER | BLACKSMITH, LEATHERWORKER |
| Bow Stave | ~15g | WOODWORKER | FLETCHER |
| Wooden Frame | ~18g | WOODWORKER | LEATHERWORKER, Housing |

### Gold Source/Sink Estimation Inputs

| Parameter | Value | Notes |
|-----------|------:|-------|
| Players on server | 100 | Modeling assumption |
| % gathering daily | 60% | Rest combat, travel, craft |
| % crafting daily | 25% | |
| % combat daily | 10% | |
| % traveling daily | 5% | |
| Avg trade volume per player/day | 100g | Buy + sell |
| Total daily trade volume | 10,000g | |
| Market fee rate | 10% | |
| Daily market fee drain | 1,000g | |
| Recurring quests completed/day | ~33 | 100 players ÷ 3-day cooldown |
| Avg recurring quest gold | 69g | Weighted avg of 8 quests |
