# Combat Balance Audit — Multi-Run Simulation Battery

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- **Dump all detailed analysis to files** — keep chat responses to summaries only.
- This task is both execution (run sims) AND analysis (interpret results).

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

### Recent Combat Fixes Just Deployed

These changes are now LIVE and this is the first real test of them:

1. **Armor AC fix** — `stats.ac` → `stats.armor` key mismatch fixed. Armor now actually provides AC in combat. Previously every character fought at naked AC (10 + DEX mod).
2. **Quality multipliers** — Item quality (POOR 0.7x → LEGENDARY 1.8x) now affects combat stats via `calculateItemStats()`.
3. **Equipment stat bonuses** — STR/DEX/CON/etc from gear now applied to combatant stats.
4. **Enchantment bonuses** — Applied via `calculateItemStats()` integration.

This means combat balance may have shifted dramatically. Armor-heavy classes (Warriors, Paladins) should be much stronger now. This audit will establish the new baseline.

### Simulation System

- Sims are run via `POST /api/admin/simulation/start` with config
- Combat happens via road encounters during travel (not direct PvE initiation)
- Each run now creates a `SimulationRun` record, encounters tagged with `simulationRunId`
- Run results viewable in admin combat dashboard with run selector
- The `SeedConfig` controls bot composition:

```typescript
interface SeedConfig {
  count: number;
  townIds: string[] | 'all';
  intelligence: number;          // 0-100
  raceDistribution: 'even' | 'realistic';
  classDistribution: 'even' | 'realistic';
  professionDistribution: 'even' | 'diverse';
  startingLevel: number | 'diverse';  // fixed level or L1-L7 spread
  startingGold: number;
  namePrefix: string;
}
```

- `SimulationConfig` has `enabledSystems` toggles and `profileDistribution` (gatherer/crafter/merchant/warrior/etc. bot behavior profiles)
- Combat only triggers during travel (P6 priority), so bots need travel enabled to fight

### How to Run a Simulation

Check `POST /api/admin/simulation/start` for exact request shape. It likely accepts both `SimulationConfig` and `SeedConfig` fields (or nested objects). Before running the first sim:

1. Read the simulation start endpoint to understand the exact API contract
2. Check if there's a way to set seed config (race/class distribution, level) via the API
3. If seed config isn't exposed via API, check if it can be passed as part of the start request or if you need to modify DEFAULT_SEED_CONFIG temporarily

**Important:** Each run must use the `notes` field on `SimulationRun` to label what it's testing. This is how we'll identify runs in the comparison view.

---

## THE TASK

Run a battery of **5 simulation runs** with different configurations, then analyze the combined results to assess combat balance. Each run should be 30 ticks with 40 bots (enough for statistical significance without taking forever).

### Run 1: Baseline — Even Distribution
**Purpose:** Establish baseline with equal representation across all variables.
**Config:**
- `raceDistribution: 'even'` — equal bots per race
- `classDistribution: 'even'` — equal bots per class
- `startingLevel: 'diverse'` — L1-L7 spread
- `intelligence: 50`
- All systems enabled (combat, crafting, gathering, market, travel)
- `notes: "Run 1: Baseline — even race/class, diverse levels"`

### Run 2: Realistic Distribution
**Purpose:** Test how combat plays out with population-weighted race/class mix.
**Config:**
- `raceDistribution: 'realistic'` — weighted by game population expectations
- `classDistribution: 'realistic'` — weighted by expected player preferences
- `startingLevel: 'diverse'`
- `intelligence: 50`
- All systems enabled
- `notes: "Run 2: Realistic race/class distribution, diverse levels"`

### Run 3: Low-Level Only (Level 1-3)
**Purpose:** Test early game combat balance. Are Level 1 characters dying too much? Does the death penalty still feel punishing?
**Config:**
- `raceDistribution: 'even'`
- `classDistribution: 'even'`
- `startingLevel: 1` — all bots start at Level 1
- `intelligence: 50`
- All systems enabled
- `notes: "Run 3: Low-level combat (all L1 start), even distribution"`

### Run 4: Mid-Level Only (Level 5-7)
**Purpose:** Test mid-game combat where gear diversity should matter more.
**Config:**
- `raceDistribution: 'even'`
- `classDistribution: 'even'`
- `startingLevel: 5` — all bots start at Level 5 (or closest config option — if only 'diverse' and fixed number are available, use 5)
- `intelligence: 70` — smarter bots to test gear acquisition + equipping behavior
- All systems enabled
- `notes: "Run 4: Mid-level combat (all L5 start), even distribution, high intelligence"`

### Run 5: Warriors Only — Class Stress Test
**Purpose:** Isolate warrior archetype balance. All melee combat, no caster variance. Tests whether armor/weapon fixes made melee meaningful.
**Config:**
- `raceDistribution: 'even'`
- `classDistribution: 'even'` BUT override `profileDistribution` to be mostly warriors:
  ```
  profileDistribution: { warrior: 8, balanced: 2, explorer: 2 }
  ```
  (This makes most bots prioritize combat. Keep some balanced/explorer for travel variety.)
- `startingLevel: 'diverse'`
- `intelligence: 60`
- All systems enabled
- `notes: "Run 5: Warrior-heavy — melee stress test"`

### Running the Sims

For each run:

1. **Clean up bots from previous run** if needed (check if there's a cleanup endpoint or if seeding handles it)
2. **Start the simulation** with the specified config via the API
3. **Wait for completion** — monitor via `GET /api/admin/simulation/status` until status is 'completed' or all ticks are done
4. **Verify the SimulationRun record** was created with correct notes and encounter count
5. **Move to the next run**

If the simulation API doesn't support all config overrides (e.g., `startingLevel` isn't in the start request), document which configs you CAN control vs which would need code changes, and run what you can.

**Between runs:** Verify bots are cleaned up so Run 2's bots don't carry over to Run 3. Check if `POST /api/admin/simulation/start` handles cleanup automatically or if there's a separate cleanup step.

---

## ANALYSIS

After all 5 runs complete, analyze the results using the combat stats endpoints. For each run, pull data from:

- `GET /api/admin/combat/stats?dataSource=sim&runId={id}` — overall KPIs
- `GET /api/admin/combat/stats/by-race?dataSource=sim&runId={id}` — per-race breakdown
- `GET /api/admin/combat/stats/by-class?dataSource=sim&runId={id}` — per-class breakdown
- `GET /api/admin/combat/stats/by-monster?dataSource=sim&runId={id}` — per-monster breakdown

### Analysis Questions to Answer

**A. Overall Health**
- How many combat encounters occurred per run? Is 30 ticks enough to generate meaningful data?
- Average rounds per combat — are fights too fast (1-2 rounds = one-shots) or too slow (10+ rounds = tedious)?
- Player death rate — what % of encounters result in player death? Target: 15-30% (challenging but not punishing)

**B. Race Balance**
- Which races have the highest/lowest win rates?
- Do any races have win rates outside the 40-60% band? (indicates imbalance)
- Do racial abilities appear to be affecting outcomes? (Compare races with combat-relevant racial abilities vs utility races)
- Any race with < 35% or > 65% win rate is a red flag

**C. Class Balance**
- Which classes have the highest/lowest win rates?
- Now that armor works: are heavy armor classes (Warrior, Paladin) significantly outperforming light armor classes?
- Are casters (Mage, Warlock) competitive or getting crushed?
- Tank vs DPS vs Healer archetype balance
- Any class with < 35% or > 65% win rate is a red flag

**D. Level Scaling**
- Compare Run 1 (diverse levels) vs Run 3 (all L1) vs Run 4 (all L5)
- At Level 1, are players dying too much to random encounters?
- At Level 5, does gear make a noticeable difference?
- Is the level gap between attacker and monster creating lopsided fights?

**E. Monster Balance**
- Which monsters have the highest player kill rate?
- Are any monsters too easy (0% player deaths) or too hard (80%+ player deaths)?
- Does monster difficulty scale appropriately with level?
- Which biome/terrain spawns the deadliest encounters?

**F. Equipment Impact (The Big Question)**
- Compare outcomes for bots that had time to acquire gear vs fresh bots
- Do later ticks (when bots have gear) show better combat outcomes than early ticks?
- Is there evidence that armor AC and weapon quality multipliers are affecting results? (Look for any equipment-related fields in the combat logs)

**G. Run 5 Warrior Stress Test**
- With mostly warriors, do melee-vs-melee fights play out diversely or feel samey?
- Does race choice create meaningful variation within the warrior archetype?
- Average fight duration for warrior-vs-monster compared to mixed class runs

---

## OUTPUT

Write the full analysis to: `D:\realm_of_crowns\audits\combat-balance-audit.md`

Structure:

```markdown
# Combat Balance Audit — Post-Equipment-Fix Baseline

## Executive Summary
[5-8 sentences: overall combat health, biggest balance concerns, what's working well]

## Run Configuration Summary
| Run | Notes | Bots | Ticks | Encounters | Avg Rounds | Death Rate |
|-----|-------|------|-------|------------|------------|------------|
| 1   | ...   | 40   | 30    | ...        | ...        | ...        |

## A. Overall Health
[Findings across all runs]

## B. Race Balance
[Win rate table for all races, flagged outliers, analysis]

## C. Class Balance
[Win rate table for all classes, flagged outliers, heavy armor vs light analysis]

## D. Level Scaling
[Cross-run comparison, early game survivability]

## E. Monster Balance
[Per-monster death rates, difficulty curve analysis]

## F. Equipment Impact
[Evidence of gear affecting outcomes, early-tick vs late-tick comparison]

## G. Warrior Stress Test
[Run 5 analysis]

## Balance Red Flags
[Ordered list of the most concerning imbalances found]

## Recommendations
[Specific balance changes to consider, ordered by impact]
```

### Chat Summary

In chat, give me:
```
Combat balance audit complete — 5 runs, [total encounters] encounters.
Top findings:
- [Most critical balance issue]
- [Second most critical]
- [Third most critical]
Full analysis in audits/combat-balance-audit.md
```

---

## IMPORTANT NOTES

- **If a run fails or produces zero encounters**, document why and adjust. Maybe bots aren't traveling enough, or the sim config isn't triggering combat. Diagnose and fix before moving to the next run.
- **If the API doesn't support all seed config options**, run what you can and note what was limited. Don't spend time modifying the sim engine — just document the gaps.
- **30 ticks with 40 bots should produce ~150-400 encounters per run.** If you're getting fewer than 50, something is wrong with the combat trigger rate — investigate.
- **Between runs, check `GET /api/admin/simulation/runs`** to verify the new run tracking is working and encounters are properly tagged.

## DO NOT

- Do not modify the combat engine or balance numbers — this is observation only
- Do not modify the simulation engine's bot AI
- Do not change monster stats
- Do not deploy anything — this runs against the live deployment
- Do not skip runs that produce unexpected results — document them, they're valuable data
- Do not fabricate data — if a run produces weird results, say so honestly
