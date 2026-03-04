# Build: Batch Combat Simulator — Race/Class Aware with Persistence

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed.
3. **Delegate & Execute** — Assign work items to each teammate.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- **Surgical changes** — don't refactor what already works.
- The existing 1v1 simulator endpoint and combat engine are solid. Build ON TOP of them, don't replace them.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

### What Already Works

- `POST /admin/combat/simulate` — 1v1 synthetic combat, 1-1000 iterations, no DB needed
- `createCharacterCombatant()` / `createMonsterCombatant()` — pure synthetic builders
- `resolveTurn()` — pure function combat engine, zero side effects
- `SimulationRun` model — tracks batch runs with metadata
- `CombatEncounterLog` — combat result persistence with `simulationRunId` FK
- Race data in `shared/src/data/races/` — all 20 races with stat modifiers
- Class data in `shared/src/data/skills/` — 7 classes with abilities
- Monster seeds — 21 monsters across 3 tiers
- `logPveCombat()` in `combat-logger.ts` — existing combat log writer

### What's Missing

1. **Race/class-aware stat generator** — function that takes `{ race, class, level }` and produces realistic combatant stats using racial modifiers, class HP formulas, and level-appropriate gear
2. **Batch endpoint** — accepts a grid of configs, runs them, persists results
3. **Level-appropriate equipment generator** — given a level, produce sensible weapon + armor stats
4. **Result persistence** — write batch results to `CombatEncounterLog` tagged with `SimulationRun`
5. **Frontend batch grid UI** — select race/class/level ranges + monster, run batch

---

## THE TASK

### Part 1: Synthetic Combatant Builder

Create: `server/src/services/combat-simulator.ts`

#### `buildSyntheticPlayer({ race, class, level, subRace? })`

Builds a realistic combatant for a given race/class/level combo WITHOUT touching the database.

**Base Stats (before racial modifiers):**

Use a standard array allocation based on class archetype:

| Class | Primary | Secondary | Tertiary | Others |
|-------|---------|-----------|----------|--------|
| WARRIOR | STR 16 | CON 14 | DEX 12 | INT 10, WIS 10, CHA 8 |
| PALADIN | STR 16 | CHA 14 | CON 12 | DEX 10, WIS 10, INT 8 |
| ROGUE | DEX 16 | CHA 14 | CON 12 | STR 10, WIS 10, INT 8 |
| RANGER | DEX 16 | WIS 14 | CON 12 | STR 10, INT 10, CHA 8 |
| MAGE | INT 16 | WIS 14 | CON 12 | DEX 10, STR 8, CHA 10 |
| CLERIC | WIS 16 | CON 14 | STR 12 | CHA 10, DEX 10, INT 8 |
| WARLOCK | CHA 16 | INT 14 | CON 12 | DEX 10, WIS 10, STR 8 |

If the class list has changed, check `shared/src/data/skills/` for the current valid classes and assign stat arrays that make sense for their archetype (melee → STR/CON, caster → INT or WIS or CHA, hybrid → mixed).

**Apply racial modifiers:**

Load the race definition from `shared/src/data/races/` (e.g., `shared/src/data/races/core/orc.ts`). Each race has `statModifiers: { str, dex, con, int, wis, cha }`. Add these to the base stats.

Example: Orc Warrior → base STR 16 + Orc STR +4 = STR 20.

**Level scaling:**

- Every 4 levels, add +1 to primary stat (simulates ability score improvements)
- Level 4 → +1, Level 8 → +2, Level 12 → +3, etc.

**HP calculation:**

Use a class-based hit die:
| Class | Hit Die |
|-------|---------|
| WARRIOR, PALADIN | d10 |
| ROGUE, RANGER, CLERIC, WARLOCK | d8 |
| MAGE | d6 |

`HP = hitDie max at L1 + (level - 1) * (hitDie avg + CON modifier) + CON modifier`

Example: Level 5 Warrior with CON 14 (+2 mod) → 10 + 4*(5.5+2) + 2 = 42

**Proficiency Bonus:**

Standard D&D 5e: `Math.floor((level - 1) / 4) + 2` (ranges from +2 at L1 to +6 at L17+)

**Level-appropriate equipment:**

Generate weapon and armor based on level tier:

| Level Range | Material Tier | Weapon Example | Armor AC |
|-------------|---------------|----------------|----------|
| 1-4 | Copper | 1d6+1, +0 attack | 12-14 |
| 5-9 | Iron | 1d8+2, +1 attack | 15-17 |
| 10-14 | Steel | 1d8+3, +2 attack | 18-20 |
| 15-19 | Mithril | 1d10+4, +3 attack | 21-24 |
| 20+ | Adamantine | 1d12+5, +4 attack | 25-28 |

**Check the actual item seed data** (`database/seeds/weapon-recipes.ts`, `armor-recipes.ts`) and use stats that match real items at each tier. The numbers above are estimates — use the real data.

For weapon modifiers:
- STR-based classes (Warrior, Paladin): `attackModifierStat: 'str'`, `damageModifierStat: 'str'`
- DEX-based classes (Rogue, Ranger): `attackModifierStat: 'dex'`, `damageModifierStat: 'dex'`
- Casters (Mage, Cleric, Warlock): Give them a simple weapon (staff: 1d6, STR-based) — caster balance testing is secondary for now

**Output:**

Return everything needed for `createCharacterCombatant()`:
```typescript
{
  stats: { str, dex, con, int, wis, cha },
  level: number,
  hp: number,
  maxHp: number,
  equipmentAC: number,
  weapon: WeaponInfo,
  proficiencyBonus: number,
  race: string,
  class: string,
  name: string  // e.g., "L5 Orc Warrior"
}
```

#### `buildSyntheticMonster(monsterName)`

Load a monster from the seed data or DB, parse its stats into the format `createMonsterCombatant()` expects. This is simpler — just a data lookup and format conversion.

If the monster doesn't exist, return null (caller handles error).

---

### Part 2: Batch Simulation Endpoint

Add to `server/src/routes/admin/combat.ts` (or create `server/src/routes/admin/combat-batch.ts` if cleaner):

#### `POST /admin/combat/batch-simulate`

**Request schema:**
```typescript
{
  // Option A: Explicit matchup list
  matchups?: [{
    race: string,       // e.g., "ORC"
    class: string,      // e.g., "WARRIOR"
    level: number,
    opponent: string,   // monster name, e.g., "Goblin"
    iterations: number  // 50-500 per matchup
  }],
  
  // Option B: Grid sweep (auto-generates matchups)
  grid?: {
    races: string[],        // ["ORC", "ELF", "HUMAN"] or ["ALL"]
    classes: string[],      // ["WARRIOR", "MAGE"] or ["ALL"]
    levels: number[],       // [1, 5, 10, 15, 20]
    monsters: string[],     // ["Goblin", "Orc Warrior", "Young Dragon"] or ["ALL"]
    iterationsPerMatchup: number  // 50-200
  },
  
  // Common options
  persist: boolean,           // write results to CombatEncounterLog + SimulationRun
  notes?: string              // label for the SimulationRun
}
```

**"ALL" expansion:**
- `races: ["ALL"]` → expand to all 20 races
- `classes: ["ALL"]` → expand to all 7 classes
- `monsters: ["ALL"]` → expand to all 21 monsters

**Processing:**

1. Expand grid into matchup list (if grid mode)
2. Calculate total matchups. If > 5000, reject with 400 error: "Grid produces {N} matchups × {iterations} = {total} fights. Max 500,000 total fights per batch. Reduce grid or iterations."
3. If `persist: true`, create a `SimulationRun` record with notes and config snapshot
4. For each matchup:
   a. `buildSyntheticPlayer({ race, class, level })`
   b. `buildSyntheticMonster(opponent)`
   c. Run `iterations` fights using the existing combat loop from `/admin/combat/simulate`
   d. Aggregate results: wins, losses, draws, avg rounds, avg HP remaining
   e. If `persist: true`, write summary to CombatEncounterLog (one record per matchup with aggregated data, NOT one per iteration — that would explode the DB)
5. Return results

**Response:**
```json
{
  "simulationRunId": "cuid (if persist=true)",
  "totalMatchups": 140,
  "totalFights": 14000,
  "durationMs": 5200,
  "results": [
    {
      "race": "ORC",
      "class": "WARRIOR",
      "level": 5,
      "opponent": "Goblin",
      "iterations": 100,
      "playerWins": 87,
      "monsterWins": 13,
      "draws": 0,
      "winRate": 0.87,
      "avgRounds": 3.2,
      "avgPlayerHpRemaining": 28.5,
      "avgMonsterHpRemaining": 0
    }
  ],
  "summary": {
    "overallPlayerWinRate": 0.62,
    "avgRounds": 4.1,
    "raceWinRates": { "ORC": 0.71, "ELF": 0.58, ... },
    "classWinRates": { "WARRIOR": 0.68, "MAGE": 0.52, ... },
    "monsterDifficulty": { "Goblin": 0.15, "Young Dragon": 0.72, ... }
  }
}
```

The `summary` object pre-computes the most useful aggregations so the caller doesn't have to.

**Performance considerations:**

- The combat engine is a pure function — each fight is ~0.1-1ms
- 500,000 fights = ~50-500 seconds worst case
- Run synchronously in a single request for now (no job queue needed at this scale)
- If it becomes too slow, we can add chunking later. Don't over-engineer now.

---

### Part 3: Frontend — Batch Grid Mode in SimulatorTab

Add a new mode toggle to `SimulatorTab.tsx`: **"1v1 Mode"** (existing) | **"Batch Grid Mode"** (new)

#### Batch Grid Mode UI:

```
┌─────────────────────────────────────────────────┐
│ Batch Combat Simulator                          │
│                                                 │
│ Races:    [✓] All  [ ] Pick...                 │
│           [dropdown: multi-select race list]     │
│                                                 │
│ Classes:  [✓] All  [ ] Pick...                 │
│           [dropdown: multi-select class list]    │
│                                                 │
│ Levels:   [1] [5] [10] [15] [20]               │
│           (clickable level chips, multi-select)  │
│                                                 │
│ Monsters: [✓] All  [ ] Pick...                 │
│           [dropdown: multi-select monster list]  │
│                                                 │
│ Iterations per matchup: [100]                   │
│ [ ] Save results (creates SimulationRun)        │
│ Notes: [text field]                             │
│                                                 │
│ Grid preview: 20 races × 7 classes × 5 levels  │
│               × 21 monsters = 14,700 matchups   │
│               × 100 iterations = 1,470,000 fights│
│               ⚠ Consider reducing grid           │
│                                                 │
│ [Run Batch]                                     │
├─────────────────────────────────────────────────┤
│ Results (after run):                            │
│                                                 │
│ ┌─ Summary ───────────────────────────────────┐ │
│ │ Overall win rate: 62%  Avg rounds: 4.1      │ │
│ │ Duration: 5.2s  Total fights: 14,700        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Race Win Rates ────────────────────────────┐ │
│ │ [horizontal bar chart]                      │ │
│ │ Orc:        ████████████████░░░░ 71%       │ │
│ │ Dwarf:      ███████████████░░░░░ 67%       │ │
│ │ Human:      █████████████░░░░░░░ 62%       │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Class Win Rates ───────────────────────────┐ │
│ │ [horizontal bar chart]                      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Monster Difficulty ────────────────────────┐ │
│ │ [horizontal bar chart — player death rate]  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Detailed Results Table ────────────────────┐ │
│ │ [sortable table: race, class, level,        │ │
│ │  monster, win rate, avg rounds, avg HP]     │ │
│ │ [filter dropdowns for each column]          │ │
│ │ [highlight cells: red < 35%, green > 65%]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Red Flags ─────────────────────────────────┐ │
│ │ ⚠ Mage L1 vs Goblin: 23% win rate          │ │
│ │ ⚠ Orc Warrior L10 vs Orc Warrior: 89% wr   │ │
│ │ (matchups outside 35-65% band)              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Key UI features:**

- **Grid preview** — show matchup count + total fight count BEFORE running. Warn if > 500K.
- **Summary cards** — overall win rate, avg rounds, duration, fight count
- **Bar charts** — race win rates, class win rates, monster difficulty (sorted)
- **Sortable/filterable results table** — every matchup result in a row. Color-code: red cells for win rates < 35%, green for > 65%, yellow for 35-45% and 55-65% (borderline).
- **Red flags panel** — auto-extract matchups outside the 35-65% balance band, sorted by severity
- **Loading state** — show progress while batch runs (can be a simple spinner with "Running X/Y matchups...")

Match existing admin dashboard styling. Use the same chart components already used in OverviewTab if any exist.

---

## TESTING

1. **Stat generator:** `buildSyntheticPlayer({ race: 'ORC', class: 'WARRIOR', level: 5 })` should produce stats with Orc racial mods applied (STR 20 = base 16 + orc +4)
2. **Single matchup:** POST batch-simulate with 1 matchup, 100 iterations — verify response shape
3. **Grid mode:** POST with `grid: { races: ["ORC", "ELF"], classes: ["WARRIOR"], levels: [1, 5], monsters: ["Goblin"], iterationsPerMatchup: 50 }` — should produce 4 matchups × 50 = 200 fights
4. **Persistence:** Run with `persist: true` — verify `SimulationRun` created, encounters logged
5. **Frontend:** Grid mode UI renders, grid preview shows correct counts, results display after run
6. **Edge cases:** Monster not found (graceful error), 0 iterations (reject), empty grid (reject)

---

## DEPLOYMENT

After all changes verified:

```bash
git add -A
git commit -m "feat: batch combat simulator — race/class-aware stat gen, grid sweep, persistence, admin UI"
git push origin main
```

Build and deploy with unique tag:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify the existing 1v1 simulator endpoint or SimulatorTab single mode — they work fine
- Do not modify the combat engine (`resolveTurn`, `createCombatState`) — it's battle-tested with 65/65 passing scenarios
- Do not add racial abilities to the simulator yet — that's a future enhancement. Base stats + gear is enough for the first balance pass.
- Do not implement a job queue — synchronous processing is fine at this scale
- Do not create per-iteration CombatEncounterLog entries — one summary row per matchup to avoid DB bloat
- Do not show `speed` in any stat displays — it's a dead stat
- Do not assume class names — verify from `VALID_CLASSES` in `shared/src/data/skills/index.ts`. The actual released classes are likely Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion (not Paladin/Warlock). USE WHATEVER THE CODE SAYS.
- Only 7 core races are released: HUMAN, ELF, DWARF, HARTHFOLK, ORC, NETHKIN, DRAKONID. When "ALL" is expanded in the grid, only include released races. The `ContentRelease` table or `isRaceReleased()` function controls this.

## SUMMARY FOR CHAT

When done, print:
```
Batch combat simulator built:
- Synthetic combatant builder: race/class-aware stats with racial mods, class HP, level scaling, tier-appropriate gear
- POST /admin/combat/batch-simulate: grid sweep + explicit matchup modes, 1-500K fights, optional persistence
- SimulatorTab: new Batch Grid mode with race/class/level/monster multi-select, grid preview, summary charts, sortable results table, red flag detection
- Deployed: tag [TAG]
```
