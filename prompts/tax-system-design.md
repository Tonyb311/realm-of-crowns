# Prompt: Tax System Design & Implementation

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- Bias toward action. Write output to files early and often.
- Keep chat responses brief — save detail for the design doc.
- One major deliverable: `docs/tax-system-design.md`
- If implementation touches code, end with: git commit, push to GitHub, deploy to Azure, run database seed in production.

---

## YOUR TASK: Design and Implement the Property Tax System

### Context

This is a browser-based fantasy MMORPG with player-driven economics and political systems. Towns have elected councils. Kingdoms have rulers. Both can set tax rates. Property taxes are the primary recurring gold redistribution mechanic and a core political gameplay lever.

### Locked Design Decisions

These are final. Do not revisit or propose alternatives.

| Decision | Answer |
|----------|--------|
| Tax frequency | **Weekly** (collected once per game week) |
| Taxable base | **Assessed value** — every property has an assessed value, even the "free" first plot (~50g assessed) |
| Buildings on plots | **Yes, add to taxable base.** Taxable value = plot assessed value + building assessed value |
| Workshop upgrades | **Building tier upgrades increase assessed value. Furniture does NOT.** |
| Tax rates | **Two-layer: Town rate + Kingdom rate.** Each set independently by their respective political leaders. |
| Tax destination | **Town's share → town treasury. Kingdom's share → kingdom treasury.** This is redistribution, not a gold sink. |
| Non-payment grace | **1 week grace period** after a missed payment. Player is notified. |
| Non-payment consequence | **After grace period: building stops functioning + debt accumulates.** Building is offline (can't craft, livestock don't produce, fields don't grow) until ALL back taxes are paid. Debt increases each week the building remains unpaid. |
| Non-payment recovery | **Pay all accumulated debt → building immediately reactivates.** No permanent loss, no seizure. Player's property and improvements are safe — just frozen. |

### Reference Files

Read these for current game state:
- `docs/profession-economy-master.yaml` — all professions, recipes, items, buildings
- `docs/profession-economy-analysis-v2.md` — economic analysis with property costs
- Check existing code for any tax-related implementations: search for "tax", "property", "treasury", "weekly" in the codebase

### Design Document Requirements

Write `docs/tax-system-design.md` covering:

#### 1. Assessed Value Table

Assign an assessed value to EVERY ownable property in the game. Use these tiers:

**Land Plots:**
| Plot | Purchase Price | Assessed Value | Notes |
|------|---------------|---------------|-------|
| Plot 1 | Free | 50g | Free to acquire, but has tax basis once built on |
| Plot 2 | 200g | 200g | Assessed = purchase price |
| Plot 3 | 400g | 400g | Assessed = purchase price |

**Buildings on Plots (RANCHER/FARMER):**
Assign assessed values to each building type (Chicken Coop, Dairy Barn, Sheep Pen, Grain Field, Vegetable Garden, Orchard, Herb Garden, etc.). These add to the plot's assessed value.

Example: Plot 1 (50g assessed) + Chicken Coop (???g assessed) = total taxable base of Plot 1.

**Workshops (Crafting Professions):**
| Tier | Name | Upgrade Cost | Assessed Value | Notes |
|------|------|-------------|---------------|-------|
| 1 | Basic Workshop | Built from materials | ???g | Baseline |
| 2 | Improved Workshop | ~150g materials | ???g | Higher assessed = higher tax |
| 3 | Master Workshop | ~300g materials | ???g | Highest tier, highest tax |

Furniture additions do NOT increase assessed value. Only the building tier matters.

**Design guidance for assessed values:**
- They should feel proportional to the income the property generates
- A Chicken Coop generating ~13g/day should have a higher assessed value than a Grain Field generating ~5.4g/day
- Workshop assessed values should scale with tier bonuses
- The total weekly tax at moderate rates (5% town + 3% kingdom = 8%) should be meaningful but not crippling

#### 2. Tax Rate Ranges & Defaults

Define the allowed ranges for town and kingdom tax rates:

- **Town tax rate:** Min 0%, Max **25%**, Default ???%
- **Kingdom tax rate:** Min 0%, Max **5%**, Default ???%
- **Combined maximum: 30%** (25% town + 5% kingdom). No additional cap needed — the per-layer caps enforce this.

The high town cap (25%) is intentional — it enables political villainy. A corrupt or greedy mayor can tax citizens heavily, creating real motivation for political opposition, elections, and even rebellion. This is a feature, not a bug. The kingdom cap is kept low (5%) so the king's tax doesn't stack into truly oppressive territory.

Consider:
- What should the **default** rates be for newly founded towns and kingdoms? (Recommend something moderate like 5% town / 2% kingdom so new settlements aren't punishing)
- Can rates be set to 0%? (Yes — a town might want to attract settlers with no-tax incentives)
- How often can rates change? (Recommend: once per game week maximum, to prevent daily rate-flipping)

Provide a table showing weekly tax at different rate combinations for representative properties.

#### 3. Tax Collection Mechanics

Design the weekly collection flow:

- **When exactly does collection happen?** Start of game week? End? Specific tick?
- **Auto-deducted from player gold?** Or must player manually pay?
- **What if player has insufficient gold?** Partial payment? Or full non-payment triggering grace period?
- **Notification system:** What messages does the player receive?
  - "Tax due: Xg (Town: Yg + Kingdom: Zg)" — when?
  - "Payment successful: Xg deducted" — confirmation
  - "GRACE PERIOD: You missed tax payment. Pay within 7 days or buildings go offline." — warning
  - "BUILDINGS OFFLINE: Unpaid tax debt of Xg. Pay to reactivate." — consequence

#### 4. Debt Accumulation & Recovery

- Debt = missed weekly tax amount. Accumulates each week while active.
- After grace period (1 week), buildings go offline.
- Does debt accrue interest? Or just flat missed payments stacking?
- Recovery: Pay full debt → buildings immediately reactivate.

#### 4b. Vacation / Pause System

Instead of a debt cap, the game has a **vacation system** to protect inactive players:

- Player can "pause" their account in **1-week increments** (select 1 week, 2 weeks, 3 weeks, etc.)
- While paused:
  - **NO taxes accumulate.** Tax clock stops entirely.
  - **Player is locked out of ALL game actions** — no crafting, gathering, market, combat, chat, politics. Nothing.
  - **ONLY action available:** Log in and unpause early.
- If player **unpauses early within a paid week**, they are NOT charged for that week. But if they cross into the next week period, they ARE charged for it.
  - Example: Player pauses for 2 weeks. Comes back on day 10. Week 1 (days 1-7) = no tax. Week 2 (days 8-14) = they unpaused during this week, so they ARE charged tax for week 2.
  - Simpler way to think about it: You're charged for any week in which you were active (unpaused) for any portion of it. Fully paused weeks = free.
- Buildings remain intact but non-functional while paused (same as non-payment offline state, but without accumulating debt).
- Livestock do NOT produce while paused. Fields do NOT grow. No passive income during pause.
- **No limit on pause duration.** A player can pause for 6 months and come back with zero debt and all property intact.

Design questions for this section:
- **Cooldown:** 48 hours minimum active time before a player can re-pause. Prevents rapid pause/unpause cycling to skip tax weeks.
- **Mid-week pause:** Current week is already charged. Pause takes effect at the START of the next game week. No partial-week refunds.
- **Visibility:** Paused players show "On Vacation" status. Not invisible, but cannot be interacted with (no trade, no combat, no messaging).
- **Political roles:** If a player holding a political role (mayor, council, king) is paused for 2+ weeks continuously, an automatic succession/election is triggered. They lose the role. They can run again when they return.

#### 5. Treasury Mechanics

- Town treasury receives town tax share. Kingdom treasury receives kingdom tax share.
- Who can access/spend treasury gold? (Mayor/council only? King only? Vote required?)
- What can treasury gold be spent on? (Town upgrades, NPC guards, war funding, public buildings?)
- Is there a treasury maintenance cost? (This would make taxes partially a gold sink — treasury loses X% per week to "administration costs" or NPC wages, removing gold from economy)
- Treasury balance visibility — public to all citizens? Or only to leaders?

#### 6. Political Gameplay Integration

- How do players SET tax rates? Through a UI? A political action? A vote?
- How often can rates change? (Prevent daily rate-flipping abuse)
- Can different property types be taxed at different rates? (e.g., tax workshops higher than farmland) Or is it one flat rate for all property?
- Do players get a say? Can citizens petition for rate changes? Or is it pure authority?

#### 7. Economic Impact Analysis

Using the assessed values you defined, model the tax impact on each profession at three rate scenarios:

- **Low tax (3% town + 2% kingdom = 5%):** Settler-friendly
- **Moderate tax (5% town + 3% kingdom = 8%):** Balanced
- **High tax (8% town + 5% kingdom = 13%):** Revenue-maximizing

For each scenario, show:
- Weekly tax burden for a typical player of each profession
- As a percentage of that profession's weekly income
- At what combined rate does each profession become unprofitable? (the "tax revolt threshold")

This directly feeds back into the economy analysis — we need to know which professions are fragile to tax increases.

#### 8. Edge Cases & Abuse Prevention

Think through:
- **Tax evasion:** Can players move property between plots/towns to dodge taxes? How to prevent?
- **Rate griefing:** A king sets 50% tax to grief citizens. Mitigation?
- **Treasury theft:** Leader takes all treasury gold and abandons role. Prevention?
- **Alt account abuse:** Player creates alt as town leader, sets 0% tax for their main. Detection?
- **Ghost towns:** All players leave a town. What happens to the treasury? The tax rate?
- **Conquest:** A kingdom conquers a town. What happens to the town's tax rate and treasury?

---

## What NOT To Do

- Do NOT implement code yet. This is a design document only.
- Do NOT redesign the property ownership system. Plots and workshops exist as described.
- Do NOT touch service professions (sidebarred).
- Do NOT overcomplicate the UI. Tax should be simple for players to understand: "You owe Xg this week. It goes to your town and kingdom."
- Do NOT design a full treasury spending system. Just sketch what treasuries can be spent on — the full design is a separate task.

## Output

Single file: `docs/tax-system-design.md`

Write to this file early and incrementally. Prioritize:
1. Assessed value table (Part 1) — everything else depends on this
2. Tax rate ranges (Part 2) — sets the bounds
3. Economic impact analysis (Part 7) — validates the numbers work
4. Collection mechanics (Part 3) — the implementation spec
5. Everything else
