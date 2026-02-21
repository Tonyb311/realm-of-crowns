# Economy Simulation v7 — Full-Stack Validation

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## How You Operate

When given a task:
1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed.
3. **Delegate & Execute** — Assign work items to each teammate.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles
- Bias toward action.
- **Write all analysis to files. Keep chat responses to summaries only.**
- One major task per chat to avoid context overflow.
- Every prompt must end with git commit, push, deploy, and production verification.

---

## Background

The economy has been through 6 audit iterations:
- **v5 (B-):** Functional but 73 recipes missing inputs, ALCHEMIST underwater
- **v6 (D+ DB / A- YAML):** All recipes specified, 104 pricing corrections designed — but never propagated to production
- **Post-v6 fix:** 381/639 items priced (propagation pass)
- **258-item fix:** Remaining items priced → **639/639 items now have baseValue > 0**

The economy has NEVER been validated by a live simulation since the pricing fixes. Previous 45-tick simulation (50 bots) revealed critical supply chain gaps, but ran before the current pricing was in place.

**This simulation is the acid test:** Do all 15 crafting professions actually work end-to-end in production?

---

## CRITICAL PRE-WORK: Expand Bot Profession Coverage

### The Problem

`server/src/lib/simulation/seed.ts` line 58-59 defines:
```typescript
const GATHERING_PROFESSIONS = ['MINER', 'FARMER', 'LUMBERJACK', 'HERBALIST', 'FISHERMAN', 'HUNTER', 'RANCHER'];
const ALL_SEED_PROFESSIONS = [...GATHERING_PROFESSIONS, 'COOK', 'BREWER', 'BLACKSMITH', 'TANNER', 'TAILOR', 'ALCHEMIST'];
```

**9 crafting professions are MISSING from bot seeding:**
- SMELTER (critical — produces ALL ingots consumed by BLACKSMITH, ARMORER, JEWELER)
- WOODWORKER (critical — produces planks, handles, staves consumed by FLETCHER, MASON, BLACKSMITH)
- ARMORER (25 recipes, highest-value items in the game)
- LEATHERWORKER (accessories, bags — consumes TANNER output)
- JEWELER (rings, necklaces, amulets — consumes ingots + gemstones)
- FLETCHER (bows, arrows, quivers — consumes WOODWORKER + TANNER output)
- MASON (housing items — consumes stone, marble, wood)
- ENCHANTER (magical items — consumes arcane reagents + mundane gear)
- SCRIBE (scrolls, books — consumes arcane reagents + paper)

Without these professions seeded, the simulation will never test ~60% of the economy.

### The Fix

Update `ALL_SEED_PROFESSIONS` in `server/src/lib/simulation/seed.ts`:

```typescript
const ALL_SEED_PROFESSIONS = [
  ...GATHERING_PROFESSIONS,
  // Processing (intermediates)
  'SMELTER', 'WOODWORKER', 'TANNER',
  // Crafting (finished goods)
  'BLACKSMITH', 'ARMORER', 'LEATHERWORKER', 'TAILOR',
  'ALCHEMIST', 'COOK', 'BREWER',
  'JEWELER', 'FLETCHER', 'MASON',
  'ENCHANTER', 'SCRIBE',
];
```

That's 7 gathering + 15 crafting = 22 professions total. With 50 bots and `professionDistribution: 'even'`, each profession gets at least 2 bots (44 minimum), with 6 extras distributed round-robin.

### Engine Verification

Verify `server/src/lib/simulation/engine.ts` already supports the new professions in its CRAFTING_PROFESSIONS set (it does — line ~30 lists all 15). The engine's craft priority logic (P3) should already handle these professions since it queries available recipes from the DB.

However, check that the engine's **intermediate prioritization** (INTERMEDIATE_RECIPE_IDS set, ~line 50) includes intermediates for the newly-added professions. Add any missing ones:
```typescript
// SMELTER intermediates (ingots → consumed by BLACKSMITH, ARMORER, JEWELER)
'smelt-copper-ingot', 'smelt-iron-ingot', 'smelt-steel-ingot',
'smelt-silver-ingot', 'smelt-gold-ingot', 'smelt-mithril-ingot', 'smelt-adamantine-ingot',
// WOODWORKER intermediates (planks, handles → consumed by FLETCHER, MASON, BLACKSMITH)
'wood-rough-planks', 'wood-softwood-planks', 'wood-hardwood-planks', 'wood-exotic-planks',
'wood-wooden-handle', 'wood-wooden-dowels', 'wood-bow-stave', 'wood-wooden-beams', 'wood-wooden-frame',
```

Verify these recipe stableIds exist in the DB. If the naming convention differs, use the actual stableIds from:
```sql
SELECT "stableId", name FROM "Recipe" WHERE "professionType" IN ('SMELTER', 'WOODWORKER') ORDER BY "professionType", level;
```

### Supply Chain Dependencies

The bot engine needs to understand supply chains so bots buy intermediates they can't make:

| Profession | Needs (buys from market) |
|-----------|--------------------------|
| SMELTER | Ore (from MINER), Coal (from MINER) |
| WOODWORKER | Wood Logs, Hardwood, Exotic Wood (from LUMBERJACK) |
| BLACKSMITH | Ingots (from SMELTER), Handles (from WOODWORKER) |
| ARMORER | Ingots (from SMELTER), Cured Leather (from TANNER), Fittings (from BLACKSMITH) |
| LEATHERWORKER | Cured/Wolf/Bear Leather (from TANNER), Fittings (from BLACKSMITH) |
| FLETCHER | Bow Staves, Planks (from WOODWORKER), Bowstring (from TAILOR), Leather (from TANNER) |
| JEWELER | Ingots (from SMELTER), Gemstones (from MINER) |
| MASON | Stone Blocks (from MINER), Wood (from LUMBERJACK/WOODWORKER), Marble (from MINER) |
| ENCHANTER | Arcane Reagents (from HERBALIST), Mundane gear (from BLACKSMITH/ARMORER) |
| SCRIBE | Arcane Reagents (from HERBALIST), Paper/Ink (check source) |
| COOK | Raw Fish (FISHERMAN), Grain/Berries (FARMER), Wild Game (HUNTER), Herbs (HERBALIST) |
| BREWER | Grain (FARMER), Wild Berries (FARMER), Herbs (HERBALIST) |
| TAILOR | Wool/Cotton (FARMER/RANCHER), Silk (RANCHER), Spider Silk (HUNTER) |
| ALCHEMIST | Wild Herbs, Medicinal Herbs, Glowcap Mushrooms (HERBALIST), Berries (FARMER) |

Verify the engine's P5 (buy from market) logic handles these supply chains. Bots should be able to buy materials they need for crafting if they can't gather them directly.

---

## Phase 1: Pre-Flight Checks

Before running the simulation, verify the production state:

```sql
-- 1. Zero-value items (should be 0)
SELECT COUNT(*) as zero_items FROM "ItemTemplate" WHERE "baseValue" = 0 OR "baseValue" IS NULL;

-- 2. Recipe count by profession
SELECT "professionType", COUNT(*) as recipe_count
FROM "Recipe"
GROUP BY "professionType"
ORDER BY "professionType";

-- 3. Recipes with missing outputs (orphaned)
SELECT r.name, r."professionType" FROM "Recipe" r
WHERE r."outputItemId" IS NULL OR NOT EXISTS (
  SELECT 1 FROM "ItemTemplate" it WHERE it.id = r."outputItemId"
);

-- 4. Recipes with missing inputs
SELECT r.name, r."professionType", ri."itemTemplateId" FROM "Recipe" r
JOIN "RecipeInput" ri ON ri."recipeId" = r.id
WHERE NOT EXISTS (
  SELECT 1 FROM "ItemTemplate" it WHERE it.id = ri."itemTemplateId"
);

-- 5. Town count and gathering spot availability
SELECT t.name, COUNT(gs.id) as spots FROM "Town" t
LEFT JOIN "GatheringSpot" gs ON gs."townId" = t.id
GROUP BY t.name ORDER BY spots DESC;
```

Write results to `docs/economy-sim-v7-preflight.md`. If any checks fail, fix before proceeding.

---

## Phase 2: Seed Configuration

Use the admin simulation API (localhost or production, depending on where you're running):

### Step 1: Cleanup any previous simulation data
```
DELETE /api/admin/simulation/cleanup
```

### Step 2: Seed bots with full profession coverage
```json
POST /api/admin/simulation/seed
{
  "count": 50,
  "townIds": "all",
  "intelligence": 70,
  "raceDistribution": "realistic",
  "classDistribution": "realistic",
  "professionDistribution": "even",
  "startingLevel": "diverse",
  "startingGold": 200,
  "namePrefix": "V7"
}
```

**Key config choices:**
- `count: 50` — enough for 2+ bots per profession (22 professions × 2 = 44 min)
- `intelligence: 70` — smart enough to buy materials, not perfect
- `startingLevel: "diverse"` — L1-L7 spread tests progression + tier unlocks
- `startingGold: 200` — enough to buy initial materials but not infinite
- `professionDistribution: "even"` — guarantees coverage of all 22 professions

### Step 3: Verify seed distribution
```
GET /api/admin/simulation/stats
```

Confirm all 22 professions have at least 1 bot. If any profession has 0 bots, the seed logic needs fixing.

---

## Phase 3: Run Simulation — 50 Ticks

```json
POST /api/admin/simulation/run
{
  "ticks": 50
}
```

50 ticks = 50 game days. This gives:
- Apprentice bots: ~50 actions × ~5-15 XP each = 250-750 XP (reach Journeyman ~L10)
- Supply chains: 5-10 cycles to stabilize (gatherers → processors → crafters → market)
- Market: enough listings to see real price discovery
- Gold flow: enough data to spot inflation/deflation trends

Monitor progress:
```
GET /api/admin/simulation/status
```

If errors spike above 30%, pause and investigate:
```
POST /api/admin/simulation/pause
GET /api/admin/simulation/activity
```

---

## Phase 4: Export & Analyze

### Step 1: Export the Excel report
```
GET /api/admin/simulation/export
```

This generates a multi-sheet workbook with:
1. Summary stats
2. Race distribution
3. Class distribution
4. Profession distribution
5. Town distribution
6. Level distribution
7. Tick history (gold flow per tick)
8. Gold by profession per tick
9. XP by profession per tick
10. Bot day logs (per-bot actions)
11. Item movement
12. Combat logs
13. Combat rounds
14. Market transactions
15. Market orders
16. Market cycle history
17. Gathering results
18. Bot action log
19. Tick resolutions
20. Bot timelines

Save the export as `docs/economy-sim-v7-export.xlsx`.

### Step 2: Write analysis report

Create `docs/economy-sim-v7-analysis.md` with:

#### A. Profession Viability Matrix
For each of the 15 crafting professions + 7 gathering professions:
- Did bots successfully craft/gather? (Y/N)
- How many successful actions?
- Average gold earned per tick?
- Were inputs available (from market or gathering)?
- Any error patterns?

Format as a table:
```
| Profession | Bots | Actions | Success% | Avg Gold/Tick | Inputs Available | Status |
|-----------|------|---------|----------|---------------|-----------------|--------|
| SMELTER   | 2    | 87      | 94%      | 32g           | Yes             | ✅ OK  |
| ARMORER   | 2    | 45      | 78%      | 185g          | Partial         | ⚠️ Low |
```

Status codes:
- ✅ OK — >80% success, positive gold flow
- ⚠️ Low — 50-80% success or negative gold some ticks
- ❌ Broken — <50% success or consistently negative gold
- 🚫 Never — 0 successful actions (profession completely non-functional)

#### B. Supply Chain Analysis
Track the flow of materials through the economy:
1. **Raw materials** (gathered) → market listings?
2. **Intermediates** (smelted, tanned, milled) → market listings?
3. **Finished goods** (crafted) → market listings?
4. **Any broken chains?** (e.g., no one listing Iron Ingots = BLACKSMITH/ARMORER starved)

#### C. Gold Economy Health
From tick history data:
- Total gold injected (gathering sales + NPC income)
- Total gold removed (marketplace tax + property tax + tool wear)
- Net gold flow per tick (inflation/deflation trend)
- Gold distribution by profession (Gini coefficient or just max/min ratio)
- Is any profession consistently losing gold? → design bug
- Income inequality ratio (highest earner / lowest earner)

#### D. Market Health
From market transaction data:
- Total volume (items traded)
- Total gold transacted
- Average markup over baseValue (healthy = 0.9-1.3×)
- Any items with 0 listings across all 50 ticks? → supply gap
- Any items listed but never sold? → no demand / overpriced

#### E. Progression Health
From XP and level data:
- Average level gain over 50 ticks
- Did any profession XP curve feel too slow or too fast?
- Did tier unlocks trigger correctly?

#### F. Error Analysis
From bot action logs:
- Top 10 most common errors
- Error rate by profession
- Error rate by tick (trending up = regression, trending down = stabilization)
- Any 500-level server errors? → code bugs to fix

---

## Phase 5: Grade the Economy

Based on the analysis, assign a letter grade:

| Grade | Criteria |
|-------|----------|
| **A** | All 15 crafting professions viable, <10:1 income inequality, 0 broken supply chains, <5% error rate |
| **A-** | All 15 viable, <15:1 inequality, ≤1 partial supply chain, <10% errors |
| **B+** | 13-14 viable, <20:1 inequality, ≤2 partial chains, <15% errors |
| **B** | 11-12 viable, <30:1 inequality, ≤3 partial chains, <20% errors |
| **B-** | 9-10 viable, some chains broken, <25% errors |
| **C** | 6-8 viable, multiple chains broken, high error rate |
| **D** | <6 viable, most chains broken, economy non-functional |

Write the grade + justification at the top of the analysis report.

---

## Phase 6: Generate Fix Recommendations

Based on findings, create a prioritized fix list in `docs/economy-sim-v7-recommendations.md`:

### P0 — Blocking (must fix before next sim)
- Any profession with 🚫 Never status
- Server 500 errors in crafting/gathering
- Missing recipe inputs that prevent crafting

### P1 — Economy Breaking
- Supply chains with 0 supply (no market listings)
- Professions consistently losing gold
- Income inequality > 30:1

### P2 — Balance Issues
- Professions with <50% action success rate
- Items never traded (no demand)
- XP curves that feel wrong (too fast/slow)

### P3 — Polish
- Market price volatility
- Bot AI improvements (smarter buying, better travel)
- Minor balance tweaks

---

## Phase 7: Commit & Deploy

```bash
git add -A
git commit -m "feat: economy sim v7 — expand bot professions to all 22, run 50-tick validation

- Add SMELTER, WOODWORKER, ARMORER, LEATHERWORKER, JEWELER, FLETCHER, MASON, ENCHANTER, SCRIBE to bot seeding
- Add intermediate recipe IDs for SMELTER and WOODWORKER to engine priority system
- 50-tick simulation results: [GRADE] — [X]/15 crafting professions viable
- Analysis: docs/economy-sim-v7-analysis.md
- Recommendations: docs/economy-sim-v7-recommendations.md"

git push origin main
```

If code changes were made (seed.ts, engine.ts), deploy:
```bash
COMMIT_HASH=$(git rev-parse --short HEAD)
# Build and deploy with unique tag
```

---

## Deliverables

1. `docs/economy-sim-v7-preflight.md` — pre-flight check results
2. `docs/economy-sim-v7-export.xlsx` — raw simulation data (Excel export from API)
3. `docs/economy-sim-v7-analysis.md` — full analysis with profession viability matrix, supply chain analysis, gold economy, market health, progression, errors
4. `docs/economy-sim-v7-recommendations.md` — prioritized P0-P3 fix list
5. Updated `server/src/lib/simulation/seed.ts` — ALL 22 professions in bot seeding
6. Updated `server/src/lib/simulation/engine.ts` — intermediate recipe IDs for new professions (if needed)
7. Git commit + push (deploy only if code changed)

**Chat summary:** Economy grade, profession viability count (X/15 crafting + Y/7 gathering), top 3 issues found, top 3 recommendations. Under 15 lines.
