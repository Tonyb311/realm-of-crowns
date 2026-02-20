# Prompt: Profession Economy Deep Analysis — Quantitative Balance, P&L Modeling, and Structural Health

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- Keep analysis brief in chat. **Write ALL detailed output to files.**
- Minimize tool calls — batch reads where possible.
- This is a heavy analysis task. Write output to file EARLY and OFTEN — do not accumulate everything in memory and write once at the end. Build the report in sections.

---

## YOUR TASK: Quantitative Profession Economy Analysis

### Context

This is a browser-based fantasy MMORPG with 29 playable professions and a player-driven economy inspired by Renaissance Kingdoms. Players gather, craft, trade, and sell. Each game tick represents a day. Players get a limited number of actions per day (typically 2 profession actions).

**The problem we're solving:** Some professions have built-in money sinks (FARMER buys fields, RANCHER buys chickens/cows/sheep) while others have near-zero capital requirements. Some professions produce universally-needed materials while others serve no one. A recent simulation showed crafters accumulating 400-600g while gatherer-only RANCHERs bled down to 10g. We need hard numbers on every profession to find structural imbalances.

**Not all professions need equal income.** But every profession needs a viable economic loop. This analysis will be the quantitative baseline we work from for all future balance changes.

### Source Files To Read

Read ALL of these to build your complete understanding. Batch your reads.

```
docs/profession-economy-master.yaml       — THE source of truth: all professions, recipes, items, gathering sources
docs/profession-audit-report.md            — What's seeded vs defined
docs/profession-fix-queue.md               — Known gaps
```

Also scan for and read:
- Any item price/value configuration (base prices, NPC vendor prices)
- Gathering yield configuration (how much you get per gather action)
- Action economy rules (actions per tick, free vs paid actions)
- Level/tier gating on recipes
- Any existing economy design docs
- Capital investment costs (field prices, livestock prices, tool prices)
- Market fee configuration (listing fees, transaction taxes)
- Seed files that define item templates with prices

---

## ANALYSIS METHODS TO APPLY

This is not a vibes-based review. Apply the following quantitative methods rigorously. Show your math.

### Method 1: Input-Output Matrix (Leontief Model)

Build a **29×29 profession interdependency matrix**. For each pair of professions (i, j), score whether profession i produces something profession j consumes.

```
           FARMER  MINER  LUMBERJACK  BLACKSMITH  COOK  TAILOR  ...
FARMER       —       0       0           0         3      1
MINER        0       —       0           3         0      0
LUMBERJACK   0       0       —           2         1      0
BLACKSMITH   0       0       0           —         0      0
COOK         0       0       0           0         —      0
TAILOR       0       0       0           0         0      —
```

Where values represent the number of distinct recipe links (how many recipes in profession j use an output from profession i).

From this matrix derive:
- **Row sums** = total downstream demand for each profession (who needs my stuff?)
- **Column sums** = total upstream dependencies for each profession (whose stuff do I need?)
- **Isolated nodes** = professions with row sum AND column sum of 0 (economic dead ends)
- **Hub professions** = highest row sums (most other professions depend on them)
- **Bottleneck score** = if a profession has high downstream demand but is the ONLY source for critical inputs

### Method 2: Network Centrality Analysis

Model the profession economy as a directed graph where:
- Nodes = professions
- Edges = "profession A produces item X which profession B consumes"
- Edge weight = number of recipe links

Calculate:
- **Out-degree** per node (how many professions does this one supply?)
- **In-degree** per node (how many professions does this one depend on?)
- **Betweenness centrality** (which professions sit on the most supply chain paths? These are critical infrastructure.)
- **Identify disconnected subgraphs** (groups of professions with no economic links to each other)
- **Identify leaf nodes** (professions that only consume or only produce — no bidirectional flow)

### Method 3: 30-Day P&L Model (Per Profession)

For each profession, build a 30-day profit & loss projection at APPRENTICE tier.

**Assumptions to state explicitly:**
- Actions per day: 2 profession actions available
- Gathering yield: X items per gather action (get from config)
- Crafting: 1 craft action = 1 recipe execution
- Market prices: estimate from input costs + reasonable markup
- Market fees: X% transaction fee (get from config)
- Starting gold: 200g

**Model TWO scenarios per profession:**

**Scenario A — Self-Sufficient:** Player gathers their own materials, crafts, sells output.
```
Revenue: [items crafted × sale price × 30 days]
- Material cost: 0 (self-gathered)
- Actions on gathering: X/day (reduces crafting capacity)
- Net crafts per day: Y
- Capital costs (amortized): startup_cost / 30
- Market fees on sales: revenue × fee_rate
= Net profit over 30 days
```

**Scenario B — Market-Dependent:** Player buys all inputs from market, maximizes crafting.
```
Revenue: [items crafted × sale price × 30 days]  
- Material cost: [inputs × market price × 30 days]
- Actions: all 2 on crafting
- Capital costs (amortized): startup_cost / 30
- Market fees on purchases + sales
= Net profit over 30 days
```

**For gathering-only professions** (no crafting recipes), model:
```
Revenue: [items gathered × sale price × 30 days]
- Recurring costs: tool replacement, feed, etc.
- Capital costs (amortized): startup_cost / 30  
- Market fees on sales
= Net profit over 30 days
```

### Method 4: Break-Even Analysis

For professions with capital investments (fields, livestock, workshops, tools):
- **Break-even point** = startup_cost / daily_net_profit
- How many days to recoup initial investment?
- Flag any profession where break-even > 60 days (too long — players will quit before ROI)
- Flag any profession where break-even < 5 days (too easy — money printer)

### Method 5: Gold Flow Analysis (Velocity & Sinks)

Map where gold enters and exits the economy:

**Gold sources** (where new gold is created):
- Quest rewards
- NPC vendor sales  
- Combat loot drops
- Any other gold-from-nothing sources

**Gold sinks** (where gold is permanently removed):
- Capital purchases (fields, livestock, etc.)
- Market transaction fees
- NPC vendor purchases (if buying from NPCs)
- Tool repair/replacement costs
- Taxes (if any)
- Any other gold-to-nothing sinks

Calculate:
- **Total daily gold injection** across all profession activities (per 100 players)
- **Total daily gold drain** across all profession activities (per 100 players)
- **Net gold flow** — is the economy inflationary (more sources than sinks) or deflationary?
- **Gold velocity estimate** — how many times does 1g change hands per day through market transactions?

### Method 6: Demand Elasticity / Sensitivity Analysis

For each profession, answer: **What happens if this profession has 50% fewer players than expected?**

- Which downstream professions are impacted?
- How severely? (Can they find alternatives, or is this the only source?)
- Score each profession: FRAGILE (single-source dependency) vs RESILIENT (multiple sources)

Also: **What happens if item prices shift ±25%?**
- Which professions flip from profitable to unprofitable?
- These are the "margin professions" — barely viable and sensitive to market fluctuations.

### Method 7: Structural Gap Analysis

Identify specific missing economic links that SHOULD exist:

**A. Workshop/Infrastructure Requirements**
Currently FARMER buys fields, RANCHER buys livestock. Evaluate whether these professions should also have capital requirements:
- BLACKSMITH → forge/anvil
- COOK → kitchen/hearting
- TAILOR → loom/sewing table
- WOODWORKER → workbench
- ALCHEMIST → lab equipment
- JEWELER → jeweler's bench
- Every other crafting profession

For each proposed workshop, specify:
- Suggested cost (proportional to profession revenue)
- Which profession would SUPPLY the workshop (creates demand link)
- Impact on break-even timeline
- Impact on 30-day P&L

**B. Consumable Tool System**
Evaluate adding tool degradation where gatherers must periodically replace tools:
- HUNTER → hunting knives (supplied by BLACKSMITH)
- LUMBERJACK → axes (supplied by BLACKSMITH or WOODWORKER)
- MINER → pickaxes (supplied by BLACKSMITH)
- HERBALIST → gathering sickle (supplied by BLACKSMITH)
- FISHERMAN → fishing rod/hooks (supplied by WOODWORKER + BLACKSMITH)
- FARMER → hoe, scythe (supplied by BLACKSMITH)

For each tool, model:
- Durability: lasts X days before replacement needed
- Cost to replace
- Impact on gatherer's 30-day P&L
- Gold flow created toward tool-making professions
- Does this make any gatherer unprofitable? If so, adjust durability/cost.

**C. Missing Recipe Connections**
Find items that are PRODUCED but never CONSUMED by any recipe. These are economic dead ends.
Find professions that COULD logically consume an item but don't have a recipe for it.
Propose specific new recipes that would close demand gaps.

---

## DELIVERABLE

Write ONE comprehensive file: `docs/profession-economy-analysis.md`

**IMPORTANT: Build this file in sections. Write the first sections to file early, then append remaining sections. Do NOT try to hold the entire report in memory.**

### Report Structure

```markdown
# Profession Economy Deep Analysis
Generated: [date]
Analysis basis: profession-economy-master.yaml

## Executive Summary
[3-4 paragraphs: biggest imbalances found, top 5 actionable recommendations, overall economy health grade A-F]

## Assumptions & Parameters
[All values used in calculations: actions/day, market fee rate, gather yields, base prices, starting gold, etc.]

## Method 1: Input-Output Matrix
[Full 29×29 matrix or simplified version showing non-zero links]
[Row sums, column sums, isolated nodes, hub professions, bottleneck scores]

## Method 2: Network Centrality
[Out-degree, in-degree, betweenness centrality per profession]
[Disconnected subgraphs identified]
[Leaf nodes identified]
[Text-based dependency map showing the supply chain web]

## Method 3: 30-Day P&L Profiles (All 29 Professions)

### [PROFESSION_NAME]
**Tier:** Gathering / Processing / Crafting / Service / Leadership
**Startup Cost:** Xg | **Recurring Daily Cost:** Xg

**30-Day P&L — Apprentice Tier (2 actions/day)**
| Line Item | Self-Sufficient | Market-Dependent |
|-----------|----------------|-----------------|
| Gross Revenue | Xg | Xg |
| Material Costs | 0g | Xg |
| Market Fees (sales) | Xg | Xg |
| Market Fees (purchases) | 0g | Xg |
| Capital Amortization (30d) | Xg | Xg |
| Tool Replacement | Xg | Xg |
| **Net Profit (30 days)** | **Xg** | **Xg** |
| **Daily Average** | **Xg/day** | **Xg/day** |

**Break-Even:** X days
**Dependency Score:** Upstream X/5 | Downstream X/5
**Bottleneck Risk:** HIGH / MED / LOW
**Balance Verdict:** [healthy / gold printer / gold trap / dead end]

[repeat for all 29]

## Method 4: Break-Even Comparison Table
[All 29 professions ranked by break-even days, side by side]
[Flag outliers: <5 days or >60 days]

## Method 5: Gold Flow Analysis
### Gold Sources (per 100-player server per day)
[itemized list with estimated quantities]
### Gold Sinks (per 100-player server per day)
[itemized list with estimated quantities]
### Net Flow
[inflationary or deflationary? by how much?]
### Gold Velocity Estimate
[how many transactions per gold piece per day]

## Method 6: Sensitivity Analysis
### Professions That Flip Unprofitable at -25% Prices
[list]
### Professions Fragile to Population Drops
[list with impact descriptions]
### Most Resilient Professions
[list]

## Method 7: Structural Gap Analysis

### A. Proposed Workshop Requirements
| Profession | Workshop | Cost | Supplied By | Break-Even Impact | P&L Impact |
|-----------|----------|------|-------------|-------------------|------------|
| BLACKSMITH | Forge & Anvil | Xg | MINER + WOODWORKER | +X days | -Xg/30d |
| COOK | Kitchen Hearth | Xg | WOODWORKER + MASON | +X days | -Xg/30d |
[etc for all crafting professions]

### B. Proposed Consumable Tool System
| Tool | Used By | Supplied By | Durability | Replace Cost | Gatherer P&L Impact | Supplier Revenue Created |
|------|---------|-------------|-----------|-------------|---------------------|------------------------|
| Hunting Knife | HUNTER | BLACKSMITH | 10 days | Xg | -Xg/30d | +Xg/30d per hunter |
| Logging Axe | LUMBERJACK | BLACKSMITH | 15 days | Xg | -Xg/30d | +Xg/30d per lumberjack |
[etc]

### C. Missing Recipe Links
| Item Produced | Produced By | Current Consumers | Proposed New Consumer | Proposed Recipe |
|--------------|-------------|-------------------|---------------------|----------------|
[every dead-end item with a proposed fix]

## 30-Day P&L Ranking (All 29)
| Rank | Profession | Net Profit (Self-Suff) | Net Profit (Market-Dep) | Break-Even | Verdict |
|------|-----------|----------------------|------------------------|-----------|---------|
| 1 | [best] | Xg | Xg | X days | gold printer |
| ... | ... | ... | ... | ... | ... |
| 29 | [worst] | Xg | Xg | X days | gold trap |

## Top 10 Recommendations (Priority Ordered)
1. [Most impactful change with expected economic effect]
2. ...
[Each recommendation should reference the specific analysis method that identified it]

## Appendix: Raw Data Tables
[Any supporting calculations, intermediate values, or reference data]
```

### What NOT To Do

- Do NOT modify any game files. This is analysis only.
- Do NOT implement any changes.
- Do NOT run the game or database.
- Keep chat responses brief — all detail goes in the report file.
- Do NOT skip the math. Show calculations for P&L estimates. Approximate where needed but state assumptions.

### Final Steps

After writing the report:

```bash
git add docs/profession-economy-analysis.md
git commit -m "analysis: quantitative profession economy balance analysis with P&L models and structural gap analysis"
git push
```

No deployment needed — this is documentation only.
