# Tax System Design

**Generated:** 2026-02-20
**Basis:** `profession-economy-master.yaml`, `profession-economy-analysis-v2.md`, existing codebase audit
**Scope:** Property tax on all ownable assets — housing, land plots, buildings, workshops
**Status:** Design document. No code changes.

---

## Locked Design Decisions

These are final. Not revisited here.

| Decision | Answer |
|----------|--------|
| Frequency | **Weekly** (collected once per game week) |
| Taxable base | **Assessed value** — every property has one |
| Buildings on plots | Add to taxable base |
| Workshop tiers | Upgrade increases assessed value. Furniture does NOT. |
| Tax layers | **Town rate + Kingdom rate**, set independently |
| Destination | Town share → town treasury. Kingdom share → kingdom treasury. |
| Grace period | 1 week after missed payment |
| Consequence | Buildings offline + debt accumulates |
| Recovery | Pay all debt → immediate reactivation. No seizure. |

---

## Part 1: Assessed Value Table

### Design Principle

Assessed values are proportional to income-generating potential. Non-income properties (housing = storage only) have low assessed values. High-income properties (livestock buildings) have higher values. This is a **political/game design number** — it does not need to equal purchase cost.

### 1A. Housing

All players own a house (Basic Cottage is free at character creation).

| Tier | Name | Purchase/Upgrade Cost | Assessed Value | Weekly Tax at 8% |
|------|------|----------------------:|---------------:|-----------------:|
| 1 | Basic Cottage | FREE | **25g** | 2g |
| 2 | Improved House | 500g | **100g** | 8g |
| 3 | Manor | 1,500g | **300g** | 24g |
| 4 | Estate | 5,000g | **750g** | 60g |

Housing generates no income — it provides storage slots (20/40/80/150). Tax on housing is a **pure gold sink** that scales with wealth.

### 1B. Land Plots

FARMER, RANCHER, HERBALIST can own up to 3 plots.

| Plot # | Purchase Price | Assessed Value | Weekly Tax at 8% |
|--------|---------------:|---------------:|-----------------:|
| 1 | FREE | **50g** | 4g |
| 2 | 200g | **200g** | 16g |
| 3 | 400g | **400g** | 32g |

Plot assessed value = plot purchase price, except Plot 1 which is free but assessed at 50g per design decision.

### 1C. RANCHER Livestock Buildings (on plots)

Building assessed value **adds to** the plot's assessed value.

| Building | Build Cost | Livestock Investment | Daily Net Income | Assessed Value |
|----------|----------:|--------------------:|-----------------:|---------------:|
| Chicken Coop (cap 5) | 100g | 150g (5×30g) | ~13g | **150g** |
| Dairy Barn (cap 3) | 150g | 240g (3×80g) | ~6g | **100g** |
| Sheep Pen (cap 4) | 120g | 200g (4×50g) | ~16g | **175g** |
| Silkworm House | 250g | 0g (auto-producer) | ~12.7g | **200g** |

**Example total taxable base for RANCHER:**
Plot 1 (50g) + Chicken Coop (150g) = **200g total** → 16g/week at 8%

### 1D. FARMER Field Buildings (on plots)

| Building | Asset Cost (T1) | Daily Net Income | Assessed Value |
|----------|----------------:|-----------------:|---------------:|
| Grain Field | 100g | ~5.4g | **75g** |
| Vegetable Patch | 100g | ~5.4g | **75g** |
| Apple Orchard | 100g | ~5.4g | **75g** |
| Berry Field | 100g | ~3.6g | **60g** |
| Herb Garden (HERBALIST) | 100g | ~6.75g | **80g** |

**Example total taxable base for FARMER:**
Plot 1 (50g) + Grain Field (75g) = **125g total** → 10g/week at 8%

### 1E. Workshops (Crafting Professions)

All workshop types use the **same assessed value per tier**. This keeps the system simple — one rule for all crafters. Income disparity between professions is a balance issue, not a tax issue.

| Tier | Name | Upgrade Cost (materials) | Assessed Value | Weekly Tax at 8% |
|------|------|-------------------------:|---------------:|-----------------:|
| 1 | Basic Workshop | ~80–350g materials | **100g** | 8g |
| 2 | Improved Workshop | +~150g materials | **200g** | 16g |
| 3 | Master Workshop | +~300g materials | **350g** | 28g |

Furniture additions do **NOT** increase assessed value. Only the building tier matters.

**Example total taxable base for a crafter (Master Workshop):**
Cottage (25g) + Workshop (350g) = **375g total** → 30g/week at 8%

### 1F. Other Ownable Properties

| Property | Assessed Value | Notes |
|----------|---------------:|-------|
| Market Stall | **50g** | MERCHANT profession, small structure |
| Warehouse | **150g** | Extra storage, moderate income potential |
| Stable | **100g** | STABLE_MASTER profession |
| Bank | **200g** | BANKER profession |
| Inn | **150g** | INNKEEPER profession |
| Mine Claim (private) | **100g** | MINER private mine, treated as asset |
| Fishing Rights | **75g** | FISHERMAN private spot |
| Timber Plot | **75g** | LUMBERJACK private grove |
| Hunting Ground | **75g** | HUNTER private spot |

### 1G. Summary — Total Taxable Base Examples

| Player Profile | Properties | Total Assessed | Weekly Tax at 8% |
|---------------|-----------|---------------:|-----------------:|
| New player (cottage only) | Cottage T1 | 25g | **2g** |
| FISHERMAN (public spots) | Cottage T1 | 25g | **2g** |
| FARMER (1 plot + field) | Cottage T1 + Plot 1 + Grain Field | 150g | **12g** |
| RANCHER (chickens) | Cottage T1 + Plot 1 + Chicken Coop | 225g | **18g** |
| COOK (basic workshop) | Cottage T1 + Workshop T1 | 125g | **10g** |
| COOK (master workshop) | Cottage T1 + Workshop T3 | 375g | **30g** |
| RANCHER + COOK | Cottage T1 + Plot 1 + Coop + Workshop T1 | 325g | **26g** |
| Whale (max everything) | Estate + 3 plots + 3 buildings + Workshop T3 | 2,175g+ | **174g** |

---

## Part 2: Tax Rate Ranges & Defaults

### Rate Bounds

| Layer | Minimum | Default | Maximum | Set By |
|-------|--------:|--------:|--------:|--------|
| Town | 0% | **5%** | **25%** | Mayor or town council |
| Kingdom | 0% | **2%** | **5%** | King/ruler |
| **Combined** | 0% | **7%** | **30%** | Sum of both layers |

### Design Rationale

- **Town max 25%** enables political villainy. A greedy mayor can tax citizens heavily, creating real motivation for elections, opposition, and rebellion. This is a gameplay feature.
- **Kingdom max 5%** prevents oppressive stacking. The king's tax is a modest overlay, not a second full tax.
- **0% is allowed.** A town can run tax-free to attract settlers. A kingdom can waive its cut. This is a valid political strategy.
- **Default 5% + 2% = 7%** for newly founded towns/kingdoms. Moderate enough not to punish early settlers.

### Rate Change Rules

- **Frequency limit:** Town and kingdom rates can each change **once per game week** maximum.
- **Effective timing:** Rate changes take effect at the **start of the next game week**. No mid-week changes.
- **Notification:** All property owners in the jurisdiction receive a notification when rates change: `"Tax rate changed: Town rate now X%, Kingdom rate now Y%. New combined rate: Z%. Effective next week."`

### Weekly Tax at Different Rate Combinations

Representative properties at Low / Moderate / High / Max tax:

| Property (Assessed) | Low 5% | Moderate 8% | High 13% | Max 30% |
|---------------------|-------:|-----------:|---------:|--------:|
| Cottage (25g) | 1g | 2g | 3g | 8g |
| Workshop T1 (100g) | 5g | 8g | 13g | 30g |
| Workshop T3 (350g) | 18g | 28g | 46g | 105g |
| Plot 1 + Coop (200g) | 10g | 16g | 26g | 60g |
| Plot 2 + Sheep (375g) | 19g | 30g | 49g | 113g |
| Improved House (100g) | 5g | 8g | 13g | 30g |
| Estate (750g) | 38g | 60g | 98g | 225g |

---

## Part 3: Tax Collection Mechanics

### Collection Timing

- Tax is collected **once per week** at the start of each game week.
- Game weeks align with the daily tick system. The **first tick of each Monday** (game time) triggers collection.
- The weekly tax job runs AFTER the daily tick, as a dedicated `weekly-tax-collection` job.

### Collection Flow

```
START OF GAME WEEK (Monday tick)
│
├─ 1. Calculate tax for each property owner:
│     totalTax = sum(assessedValue × combinedRate) for all owned properties
│     townShare = sum(assessedValue × townRate)
│     kingdomShare = sum(assessedValue × kingdomRate)
│
├─ 2. Attempt auto-deduction from player gold:
│     IF player.gold >= totalTax:
│       ├─ Deduct totalTax from player.gold
│       ├─ Credit townShare to TownTreasury.balance
│       ├─ Credit kingdomShare to Kingdom.treasury
│       ├─ Emit: "Tax paid: {totalTax}g (Town: {townShare}g + Kingdom: {kingdomShare}g)"
│       └─ Clear any previous grace period
│     ELSE:
│       ├─ Pay what you can (partial payment):
│       │   paid = player.gold (drain to 0)
│       │   debt = totalTax - paid
│       │   Split paid proportionally between town/kingdom
│       ├─ Record debt on player account
│       ├─ IF first missed week:
│       │   ├─ Set graceStartDate = now
│       │   └─ Emit: "GRACE PERIOD: Unpaid tax of {debt}g. Buildings remain active.
│       │           Pay within 7 days or buildings go offline."
│       └─ IF graceStartDate is older than 7 days:
│           ├─ Set all buildings to OFFLINE status
│           └─ Emit: "BUILDINGS OFFLINE: Tax debt of {totalDebt}g.
│                   Pay full debt to reactivate."
│
└─ END
```

### Partial Payment Rules

- If the player can't pay the full amount, **all available gold is applied** as partial payment. The player is not left with zero debt if they had some gold.
- Partial payments are split **proportionally** between town and kingdom shares (same ratio as the rate split).
- Remaining unpaid amount becomes debt.
- Partial payment does NOT extend the grace period — the grace clock starts ticking on the first week with ANY unpaid balance.

### Notification Schedule

| Event | Timing | Message |
|-------|--------|---------|
| Tax due reminder | 1 day before collection | "Property tax of ~{estimate}g due tomorrow." |
| Payment successful | At collection | "Tax paid: {total}g (Town: {town}g, Kingdom: {kingdom}g). Remaining gold: {balance}g." |
| Partial payment | At collection | "Partial tax payment: {paid}g of {total}g. Remaining debt: {debt}g. GRACE PERIOD active — pay within 7 days." |
| Grace period warning | Day 3 and Day 6 of grace | "WARNING: {days} days until buildings go offline. Outstanding debt: {debt}g." |
| Buildings offline | Day 8 (grace expired) | "BUILDINGS OFFLINE: Unpaid tax debt of {debt}g. All buildings non-functional until debt is paid." |
| Debt increases | Each subsequent collection while offline | "Tax debt increased to {newTotal}g (was {oldTotal}g). Buildings remain offline." |
| Recovery | Player pays full debt | "All taxes paid! Buildings reactivated. Welcome back." |

---

## Part 4: Debt Accumulation & Recovery

### Debt Mechanics

- **Debt = sum of unpaid weekly taxes.** Flat accumulation — no interest.
- Debt increases every week by the unpaid portion of that week's tax.
- Debt is tracked per-player (not per-property). One debt balance covers all properties.
- Debt can be viewed on the player's property management screen.

### Offline Building Effects

When buildings go offline (grace period expired):

| Building Type | Offline Effect |
|--------------|----------------|
| Workshop | Cannot craft. Rental income stops. |
| Chicken Coop / Dairy Barn / Sheep Pen | Livestock stop producing. Animals still consume feed. |
| Silkworm House | Production stops. |
| Farm fields | Growth timer pauses. Crops in READY state do not wither (frozen). |
| Housing | Storage access remains (can't lock players out of their stuff). Market listing still works. |
| Market Stall | Cannot list new items. Existing listings remain active. |

**Offline = Frozen.** Livestock do NOT consume feed while buildings are offline. Production stops, aging stops, feed consumption stops — same freeze behavior as the pause system. The debt accumulation alone is sufficient punishment. With a proper pause system available, there's no need to punish tax-delinquent players with a feed death spiral on top of growing debt.

### Recovery

1. Player accumulates enough gold (from any source — gifts, market sales, quest rewards).
2. Player pays full outstanding debt via the property management UI.
3. **All** buildings immediately reactivate.
4. Grace period resets.
5. Livestock resume production next tick. Farm growth timers resume. Workshops available for crafting.

### Debt Visibility

- Player sees total debt on their property screen and HUD.
- Debt amount is visible in the town's citizen registry (public — encourages social pressure).
- Mayor can see all debtors and their amounts in the town management screen.

---

## Part 4b: Vacation / Pause System

### Overview

Players can pause their account in 1-week increments to avoid tax accumulation while inactive.

### Mechanics

| Rule | Detail |
|------|--------|
| Pause duration | Selected in **1-week increments** (1, 2, 3, ... weeks). No upper limit. |
| Tax during pause | **None.** Tax clock stops entirely. |
| Game actions during pause | **None.** Locked out of ALL actions — no crafting, gathering, market, combat, chat, politics. |
| Only action available | Log in and **unpause early**. |
| Buildings during pause | Intact but non-functional (same visual as offline). No degradation. |
| Livestock during pause | Do not produce. Do not consume feed. Do not age. Frozen. |
| Farm fields during pause | Growth timers frozen. No withering. |
| Player visibility | Status shows **"On Vacation"**. Cannot be traded with, attacked, or messaged. |

### Billing Rules

You are charged for any game week in which you were **active (unpaused) for any portion of it**. Fully paused weeks are free.

| Scenario | Week 1 Tax | Week 2 Tax |
|----------|:----------:|:----------:|
| Pause for 2 weeks, stay paused | Free | Free |
| Pause for 2 weeks, unpause on day 10 (mid-week-2) | Free | **Charged** |
| Pause mid-week (e.g., Wednesday) | **Charged** (already active this week) | Free (if still paused) |

### Pause Activation Timing

- Pause request can be made any time.
- Pause takes effect at the **start of the next game week**. The current week is already charged (no partial refunds).
- Player remains fully active until the pause takes effect.

### Anti-Abuse: Pause Cooldown

- **48 hours minimum active time** before a player can re-pause.
- Prevents rapid pause/unpause cycling to skip alternating tax weeks.
- Cooldown starts when the player unpauses.

### Political Role Handling

| Scenario | Consequence |
|----------|------------|
| Mayor paused for < 2 weeks | Role held. Deputy mayor (if appointed) handles duties. |
| Mayor paused for 2+ weeks continuously | **Automatic special election triggered.** Mayor loses role. Can run again on return. |
| King/ruler paused for 2+ weeks | **Automatic succession.** Highest-ranking council member becomes interim ruler. Former ruler can challenge on return. |
| Council member paused for 2+ weeks | Seat declared vacant. Eligible citizens can apply/be appointed. |

### No Limit on Duration

A player can pause for 6 months and return with:
- Zero debt
- All property intact (buildings, livestock, fields, workshops)
- All inventory preserved
- Political roles lost (if paused 2+ weeks)
- Friends list, guild membership, achievements all preserved

---

## Part 5: Treasury Mechanics

### Revenue Sources

| Source | Destination | Frequency |
|--------|------------|-----------|
| Property tax (town share) | Town treasury | Weekly |
| Property tax (kingdom share) | Kingdom treasury | Weekly |
| Marketplace transaction fees (10%) | Town treasury | Per transaction |
| Border crossing tariffs | Town treasury (entry town) | Per crossing |
| Building permit fees (if enabled by mayor) | Town treasury | Per construction |

### Treasury Access

| Role | Town Treasury | Kingdom Treasury |
|------|:------------:|:----------------:|
| Mayor | **Full access** (spend, view) | View only |
| Town Council | View. Spending requires mayor approval. | View only |
| King/Ruler | View only | **Full access** (spend, view) |
| Kingdom Council | View only | View. Spending requires ruler approval. |
| Citizens | **View balance only** (public) | **View balance only** (public) |

Treasury balances are **public**. All citizens can see how much gold is in their town's treasury and their kingdom's treasury. This transparency enables political accountability — voters can judge whether their leaders are spending wisely.

### Treasury Spending Categories

Sketch only — full spending system is a separate design task.

| Category | Example Uses | Destination |
|----------|-------------|-------------|
| Infrastructure | Build/repair town buildings, roads, bridges | Town treasury |
| Military | Hire NPC guards, fund town militia, war contributions | Town or kingdom |
| Events | Festival bonuses, market day promotions | Town treasury |
| Subsidies | Tax rebates for specific professions, new settler bonuses | Town treasury |
| Diplomacy | Treaty signing bonuses, tribute payments, ransom | Kingdom treasury |

### Administration Cost (Gold Sink)

To prevent treasury hoarding and make taxes partially a gold sink:

- **5% of treasury balance is lost per game week** to "administration costs" (NPC clerks, guards, building maintenance).
- This applies to BOTH town and kingdom treasuries.
- Minimum deduction: 0g (no negative treasuries). Maximum deduction: uncapped.
- This creates natural pressure to SPEND treasury gold rather than stockpile it.
- Net effect: of every 100g collected in taxes, ~95g reaches the treasury, then 5% decays weekly. Over 4 weeks, ~82g of a 100g deposit remains if unspent.

**Why 5%?** It's low enough that active leaders lose little (they spend faster than decay), but high enough that neglected treasuries drain meaningfully. A town with 1,000g in treasury loses 50g/week to administration — enough to notice, not enough to empty quickly.

---

## Part 6: Political Gameplay Integration

### Setting Tax Rates

| Action | Who | How | Constraints |
|--------|-----|-----|------------|
| Set town tax rate | Mayor | Governance UI → "Set Tax Rate" | 0–25%, once per game week |
| Set kingdom tax rate | King/Ruler | Kingdom UI → "Set Tax Rate" | 0–5%, once per game week |

Rate changes go through the existing governance system. No council vote required for rate changes (mayor/ruler has unilateral authority). This is intentional — it gives the office real power, which makes elections matter.

### Rate Change Flow

1. Mayor selects new rate in Governance UI.
2. System validates: within bounds, not changed this week.
3. New rate is **announced** to all citizens: `"Mayor {name} has set the town tax rate to {rate}%. Effective next week."`
4. Rate takes effect at the start of the next game week.
5. Previous rate applies for the current week (no retroactive changes).

### Flat Rate (No Differentiation)

All property types in a jurisdiction are taxed at the **same rate**. No per-type rates (e.g., "tax workshops at 10% and farms at 5%"). Reasons:

1. **Simplicity.** One number per layer. Easy for players to understand and politicians to set.
2. **Prevents gaming.** Differentiated rates invite lobbying, special interests, and complex abuse.
3. **Political clarity.** "The tax is 8%" is clear. "The tax is 5% on farms, 8% on workshops, 12% on housing" is confusing.

If future playtesting reveals a need for differentiation, it can be added as a "tax code" political action — but start simple.

### Citizen Petitions

Citizens can submit petitions related to tax rates through the existing petition system:

| Petition Type | Threshold | Effect |
|--------------|-----------|--------|
| "Lower tax rate" | 50% of property-owning citizens sign | Mayor receives formal notification. No binding effect — but ignoring a popular petition has political consequences. |
| "Tax rate referendum" | 75% of property-owning citizens sign | Forces a binding vote. If majority votes to change, rate is set to the petitioned value. Mayor cannot override for 4 weeks. |

---

## Part 7: Economic Impact Analysis

### Methodology

- Weekly income = daily net income × 7 (from v2 analysis data)
- Tax = total assessed value × combined rate
- Tax burden = tax / weekly income × 100%
- Tax revolt threshold = rate at which weekly tax > weekly income

### 7A. Gathering Professions

Gatherers on public spots own only a cottage. Tax burden is minimal.

| Profession | Weekly Income | Assessed Base | Tax at 5% | Tax at 8% | Tax at 13% | Revolt Rate |
|------------|-------------:|-------------:|----------:|----------:|-----------:|------------:|
| FISHERMAN | 50g | 25g (cottage) | 1g (2.5%) | 2g (4.0%) | 3g (6.5%) | >200% |
| HERBALIST | 47g | 25g | 1g (2.7%) | 2g (4.3%) | 3g (6.8%) | >188% |
| LUMBERJACK | 63g | 25g | 1g (2.0%) | 2g (3.2%) | 3g (5.2%) | >252% |
| MINER | 57g | 25g | 1g (2.2%) | 2g (3.5%) | 3g (5.7%) | >228% |
| HUNTER | 82g | 25g | 1g (1.5%) | 2g (2.4%) | 3g (4.0%) | >328% |

**Verdict:** Tax is trivially low for public-spot gatherers. Even at max 30%, a HUNTER pays only 8g/week on 82g income (9.1%). Tax is not a meaningful factor for these professions.

### 7B. FARMER / RANCHER (Plot + Building)

| Player Profile | Weekly Income | Assessed Base | Tax at 5% | Tax at 8% | Tax at 13% | Revolt Rate |
|---------------|-------------:|-------------:|----------:|----------:|-----------:|------------:|
| FARMER (Plot 1 + Grain + gathering) | 76g | 150g | 8g (10%) | 12g (16%) | 20g (26%) | 51% |
| RANCHER (Plot 1 + Chickens) | 91g | 225g | 11g (12%) | 18g (20%) | 29g (32%) | 40% |
| RANCHER (Plot 1+2 + Chickens + Sheep) | 203g | 650g | 33g (16%) | 52g (26%) | 85g (42%) | 31% |
| RANCHER (3 plots, full operation) | 315g (est.) | 1,275g | 64g (20%) | 102g (32%) | 166g (53%) | 25% |

**Key insight:** Multi-plot RANCHER is heavily taxed by design. At high rates (13%), a 3-plot RANCHER pays 53% of income in taxes. This is the intended political pressure point — RANCHER players are the most tax-sensitive constituency and will drive political engagement.

**RANCHER revolt threshold (40% at 1 plot)** means a corrupt 25%+5% mayor+king combo still leaves the RANCHER profitable (30% combined < 40% revolt). Good.

### 7C. Crafting Professions (Workshop)

Using best-recipe market-dependent income from v2 analysis:

| Profession | Weekly Income | Assessed Base | Tax at 5% | Tax at 8% | Tax at 13% | Revolt Rate |
|-----------|-------------:|-------------:|----------:|----------:|-----------:|------------:|
| COOK (Smoked Fish) | 186g | 125g | 6g (3%) | 10g (5%) | 16g (9%) | >100% |
| COOK (Master WS) | 186g | 375g | 19g (10%) | 30g (16%) | 49g (26%) | 50% |
| TANNER (Cured Leather) | 24g | 125g | 6g (26%) | 10g (42%) | 16g (68%) | 19% |
| TANNER (Master WS) | 24g | 375g | 19g (79%) | 30g (125%) | — | 6% |
| TAILOR (Spin Cloth) | 17g | 125g | 6g (37%) | 10g (59%) | 16g (96%) | 14% |
| SMELTER | ~35g (est.) | 125g | 6g (18%) | 10g (29%) | 16g (47%) | 28% |
| WOODWORKER | ~21g (est.) | 125g | 6g (29%) | 10g (48%) | 16g (77%) | 17% |
| BREWER | ~14g (est.) | 125g | 6g (45%) | 10g (71%) | 16g (>100%) | 11% |
| ALCHEMIST | ~21g (est.) | 125g | 6g (29%) | 10g (48%) | 16g (77%) | 17% |
| MASON | ~14g (est.) | 125g | 6g (45%) | 10g (71%) | 16g (>100%) | 11% |
| FLETCHER | ~14g (est.) | 125g | 6g (45%) | 10g (71%) | 16g (>100%) | 11% |
| ENCHANTER | ~14g (est.) | 125g | 6g (45%) | 10g (71%) | 16g (>100%) | 11% |
| JEWELER | ~7g (est.) | 125g | 6g (90%) | — | — | 6% |

### 7D. Tax Sensitivity Summary

| Sensitivity Tier | Professions | Revolt Rate Range | Political Behavior |
|-----------------|-------------|:-----------------:|-------------------|
| **Tax-proof** (>50%) | FISHERMAN, HERBALIST, LUMBERJACK, MINER, HUNTER, COOK | >50% | Don't care about taxes. Won't vote on tax issues. |
| **Tax-aware** (25–50%) | FARMER, RANCHER (1 plot), SMELTER, ALCHEMIST | 25–50% | Notice taxes, prefer lower rates, but survive at any non-extreme rate. |
| **Tax-sensitive** (15–25%) | RANCHER (multi-plot), WOODWORKER, TANNER | 15–25% | Actively oppose tax increases. May relocate towns. Core political constituency. |
| **Tax-fragile** (<15%) | TAILOR, BREWER, MASON, FLETCHER, ENCHANTER, JEWELER | <15% | Cannot survive high taxes. Will abandon profession or town. |

**This is good design.** The spread creates natural political factions:
- Wealthy gatherers/COOKs who don't care about taxes → passive political base
- Mid-income crafters who want moderate taxes → swing voters
- Marginal crafters who need low taxes to survive → vocal opposition
- Multi-plot RANCHERs with lots to lose → political donors/activists

---

## Part 8: Edge Cases & Abuse Prevention

### 8A. Tax Evasion

| Exploit | Mitigation |
|---------|-----------|
| Move property between towns to find lowest-tax town | **Allowed.** This is intended gameplay — towns compete for residents. Moving costs 500g + 30-day cooldown + lose all buildings in old town. |
| Demolish buildings before tax day, rebuild after | **Tax is based on property at time of collection.** But demolishing destroys the building and all materials. Not economically viable as evasion. |
| Transfer property to alt account | **Properties are non-transferable.** Buildings cannot be given/sold to other players. Only the player who built it owns it. |
| Store gold on alt to appear broke | **Alt guard system** already tracks multi-character abuse. Tax debt accumulates regardless of gold balance. |

### 8B. Rate Griefing

| Exploit | Mitigation |
|---------|-----------|
| Mayor sets 25% to grief citizens | **Intended gameplay.** Citizens can: (1) petition for referendum at 75% threshold, (2) vote mayor out next election, (3) leave town. The 25% cap + kingdom 5% cap = 30% max, which is painful but not lethal for most professions. |
| King sets 5% to grief entire kingdom | 5% kingdom tax is modest. Even combined with 25% town = 30%. Political remedy: impeachment, rebellion mechanics. |
| Rate flip-flopping (change every week) | Once-per-week change limit prevents daily manipulation. Players get 1-week advance notice. |

### 8C. Treasury Theft

| Exploit | Mitigation |
|---------|-----------|
| Mayor drains treasury, then quits | **Spending transparency.** All treasury transactions are logged and visible to citizens. Large withdrawals (>50% of treasury in one action) trigger an automatic notification to all citizens. |
| Mayor funnels treasury to alt | **Spending categories are restricted.** Treasury can only be spent on predefined categories (infrastructure, military, events, subsidies). No direct player-to-player transfer from treasury. |
| Leader hoards treasury forever | **5% weekly administration cost** decays unused treasury. |

### 8D. Alt Account Abuse

| Exploit | Mitigation |
|---------|-----------|
| Alt as mayor with 0% tax for main | **Existing alt guard system** (server/src/lib/alt-guard.ts) detects multi-character abuse via IP/session analysis. Additionally: mayors must be citizens for 14+ days before running for office (prevents instant alt mayors). |
| Create alts to vote in elections | Alt guard + minimum-level requirements for voting (level 5+). |

### 8E. Ghost Towns

| Scenario | Resolution |
|----------|-----------|
| All players leave a town | Treasury is frozen. Tax rate stays at last-set value. NPC "caretaker" maintains town. When new players move in, they can elect a new mayor who inherits the treasury. |
| Town has residents but no mayor | Default tax rate (5%) applies. Citizens are prompted to run for office. |
| Treasury exceeds reasonable amount (>10,000g with no spending) | 5% weekly administration cost naturally drains it. At 10,000g, that's 500g/week drain. No active intervention needed. |

### 8F. Conquest

| Scenario | Resolution |
|----------|-----------|
| Kingdom conquers a town (war mechanic) | **Town treasury:** Conquering kingdom seizes 50% of town treasury as war spoils. Remaining 50% stays in town treasury under new governance. |
| Conquered town's tax rate | Reset to kingdom default (2% kingdom rate). Town rate preserved — new governor (appointed by conquering ruler) can change it next week. |
| Players in conquered town | Properties safe. Tax obligations transfer to new governance. Players may choose to relocate (500g + cooldown). |

---

## Appendix A: Migration from Current System

### What Exists Today

The current codebase has a **daily flat-rate** property tax system:

| Current | Design Target |
|---------|--------------|
| Daily collection | **Weekly** collection |
| Flat rates (5–25g/day by building type) | **Assessed value × percentage rate** |
| Town tax only | **Town + Kingdom** two-layer |
| 7-day grace → building seizure | 7-day grace → **building offline** (no seizure) |
| No vacation system | **Full pause system** |
| No kingdom treasury tax | **Kingdom treasury receives kingdom share** |

### Key Code Files to Modify (future implementation)

| File | Change |
|------|--------|
| `server/src/jobs/daily-tick.ts` (L876-2320) | Replace daily property tax with weekly collection job |
| `server/src/routes/governance.ts` (L209-256) | Add kingdom rate setting, rate change cooldown |
| `server/src/services/law-effects.ts` (L7-48) | Separate town rate from kingdom rate |
| `database/prisma/schema.prisma` | Add: `assessedValue` to Building model, `taxDebt` to Character, `kingdomTaxRate` to Kingdom, `pausedUntil`/`pauseCooldown` to Character |
| `server/src/socket/events.ts` (L253-290) | Update notification events for weekly system |
| NEW: `server/src/jobs/weekly-tax.ts` | New weekly collection job |
| NEW: `server/src/routes/vacation.ts` | Pause/unpause endpoints |

### Database Schema Additions (sketch)

```
// On Building model
assessedValue  Int      @default(0)    // Set based on building type + tier
isOffline      Boolean  @default(false) // True when tax-delinquent

// On Character model
taxDebt        Int      @default(0)    // Accumulated unpaid taxes
graceStartDate DateTime?               // When grace period began
pausedUntil    DateTime?               // When pause ends (null = active)
pauseCooldown  DateTime?               // Earliest next pause allowed

// On Kingdom model
taxRate        Float    @default(0.02) // Kingdom tax rate (0-0.05)
```

---

## Appendix B: Complete Assessed Value Reference

Sorted by assessed value descending.

| Property | Type | Assessed Value |
|----------|------|---------------:|
| Estate (Tier 4) | Housing | 750g |
| Land Plot 3 | Plot | 400g |
| Workshop T3 (Master) | Workshop | 350g |
| Manor (Tier 3) | Housing | 300g |
| Silkworm House | RANCHER building | 200g |
| Land Plot 2 | Plot | 200g |
| Workshop T2 (Improved) | Workshop | 200g |
| Bank | Service building | 200g |
| Sheep Pen | RANCHER building | 175g |
| Warehouse | Storage | 150g |
| Inn | Service building | 150g |
| Chicken Coop | RANCHER building | 150g |
| Dairy Barn | RANCHER building | 100g |
| Workshop T1 (Basic) | Workshop | 100g |
| Improved House (Tier 2) | Housing | 100g |
| Stable | Service building | 100g |
| Mine Claim | Gathering asset | 100g |
| Herb Garden | HERBALIST building | 80g |
| Apple Orchard | FARMER building | 75g |
| Grain Field | FARMER building | 75g |
| Vegetable Patch | FARMER building | 75g |
| Fishing Rights | Gathering asset | 75g |
| Timber Plot | Gathering asset | 75g |
| Hunting Ground | Gathering asset | 75g |
| Berry Field | FARMER building | 60g |
| Market Stall | Service building | 50g |
| Land Plot 1 | Plot | 50g |
| Basic Cottage (Tier 1) | Housing | 25g |
