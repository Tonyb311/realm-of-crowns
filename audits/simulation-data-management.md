# Simulation Data Management Audit

## Summary

Simulation combat data is stored in the same `CombatEncounterLog` table as real player combat, distinguished only by a nullable `simulationTick` (Int) field. There is **no `SimulationRun` model** — run metadata (tick count, bot count, config, timing) exists only in-memory in the `SimulationController` singleton and is lost when the server restarts. The admin combat dashboard already has robust `dataSource` filtering ('live' vs 'sim') via `getSimFilter()`, but has no concept of individual simulation runs — it shows ALL simulation data or ALL live data, with optional date range filtering.

---

## Q1: Data Storage

### Simulation-Related Models

**`CombatEncounterLog`** — the primary table for all combat records:
- `id` (String, cuid)
- `attackerId`, `defenderId` (String → Character)
- `attackerName`, `defenderName` (String)
- `attackerRace`, `defenderRace` (Race enum)
- `attackerClass`, `defenderClass` (CharacterClass enum)
- `attackerLevel`, `defenderLevel` (Int)
- `winnerId`, `winnerName` (String, nullable)
- `rounds` (Int)
- `encounterType` (String — "pve", "pvp", "simulation")
- `**simulationTick**` (Int, nullable) — **only field distinguishing sim from real combat**
- `createdAt` (DateTime)
- `combatLog` (Json — full round-by-round log)

**No `SimulationRun`, `SimulationBatch`, or `SimulationConfig` model exists.**

### Bot Characters

- Bot users: `User.isTestAccount = true`
- Bot characters: created during `SimulationController.seedBots()`, persist in `Character` table
- Bot naming: `"Bot_{Race}_{Profession}_{index}"` pattern
- Bots use standard Character/User models — no separate bot table

### Run Grouping

- **No `batchId`, `runId`, or `simulationId` exists** in the schema
- Simulation runs can only be approximated by `createdAt` timestamp ranges
- `simulationTick` gives tick-level granularity within a run but doesn't identify which run
- Multiple simulation runs create records that are indistinguishable except by timestamp gaps

---

## Q2: Stats Page Component

### Component: `client/src/components/admin/combat/OverviewTab.tsx`

The main simulation stats view within the admin combat dashboard (`/admin/combat`).

**API Calls:**
- `GET /api/admin/combat/stats?dataSource={live|sim}&startDate=...&endDate=...` — main KPIs
- `GET /api/admin/combat/stats/by-race?dataSource=...` — race win rates
- `GET /api/admin/combat/stats/by-class?dataSource=...` — class win rates
- `GET /api/admin/combat/stats/by-monster?dataSource=...` — monster encounter stats

**Current Filtering:**
- `dataSource` toggle: "Live" vs "Simulation" (switches between `simulationTick IS NULL` / `IS NOT NULL`)
- Date range picker: `startDate` and `endDate` query params
- **No run selection** — cannot pick a specific simulation run
- **No "clear view" or "new run" concept** — shows ALL sim data in the date range

**Displayed Stats:**
- Total encounters, unique combatants, average rounds, win rates
- Race-based breakdown: encounters per race, win rate, avg rounds, K/D
- Class-based breakdown: same metrics by character class
- Monster-based breakdown: encounters per monster type, win rate, player deaths
- All rendered as data tables with sortable columns

### Other Combat Dashboard Tabs

- **`HistoryTab.tsx`** — Paginated encounter history table. Same `dataSource` filter. Shows individual encounters with attacker/defender/winner/rounds.
- **`SimulatorTab.tsx`** — 1v1 combat simulator (run-on-demand, not related to batch simulation data). Lets admin pick two combatants and simulate a fight.
- **`CodexTab.tsx`** — Item/recipe/monster reference. No simulation data.

---

## Q3: Simulation Run Process

### Initiation

**`server/src/lib/simulation/`** contains:
- `engine.ts` — `SimulationEngine` class: bot AI priority chain, tick loop
- `actions.ts` — Bot action implementations (travel, craft, gather, combat)
- `seed.ts` — Bot seeding: creates Users (`isTestAccount: true`) + Characters
- `controller.ts` — `SimulationController` singleton: orchestrates runs

**Run flow:**
1. Admin calls `POST /api/admin/simulation/start` with config (tickCount, botCount, etc.)
2. `SimulationController.start()` seeds bots via `seed.ts`
3. Engine runs tick loop: each tick processes all bots through priority chain
4. P6 (combat travel) triggers road encounters → `resolveRoadEncounter()` → `CombatEncounterLog` entries with `simulationTick` set

### Records Created Per Run

- **`CombatEncounterLog`** entries: tagged with `simulationTick` (the tick number, 1-N)
- **`Character`** records: bot characters persist after run (not cleaned up)
- **`User`** records: bot users persist (`isTestAccount: true`)
- **`InventoryItem`** records: bots accumulate items during simulation
- **`MarketListing`** records: bots may list items on market

### Metadata NOT Persisted

- Run start/end timestamps (in-memory only)
- Config (tickCount, botCount, professions) — in-memory only
- Per-tick timing data — in-memory only, exported to Excel
- Bot action logs — in-memory only, exported to Excel
- **All run metadata is lost on server restart**

---

## Q4: Data Volume & Separation

### Estimated Volume

- A 50-bot, 45-tick simulation generates roughly **200-500 combat encounters** (P6 combat travel triggers road encounters stochastically)
- Each encounter = 1 `CombatEncounterLog` row + embedded `combatLog` JSON (can be large — full round-by-round data)
- Multiple sim runs accumulate — no automatic cleanup

### Separation

- **Same tables as real combat**: `CombatEncounterLog` stores both
- **Distinguishing sim data**: `simulationTick IS NOT NULL` (reliable for encounter logs)
- **Distinguishing bot characters**: `User.isTestAccount = true` (reliable)
- **No way to distinguish between different simulation runs** other than timestamp gaps
- `encounterType` field can be "simulation" but `simulationTick` is the canonical filter used by `getSimFilter()`

### `getSimFilter()` Helper

```typescript
// server/src/routes/admin/combat-stats.ts (approx)
function getSimFilter(dataSource: string) {
  if (dataSource === 'sim') return { simulationTick: { not: null } };
  if (dataSource === 'live') return { simulationTick: null };
  return {}; // 'all' — no filter
}
```

Used consistently across all combat stats endpoints.

---

## Q5: Backend Endpoints

### Combat Stats Endpoints (`server/src/routes/admin/combat-stats.ts`)

| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/admin/combat/stats` | GET | `dataSource`, `startDate`, `endDate` | Main KPIs: total encounters, unique combatants, avg rounds, win rates |
| `/admin/combat/stats/by-race` | GET | `dataSource`, `startDate`, `endDate` | Per-race encounter counts, win rates, K/D |
| `/admin/combat/stats/by-class` | GET | `dataSource`, `startDate`, `endDate` | Per-class encounter counts, win rates |
| `/admin/combat/stats/by-monster` | GET | `dataSource`, `startDate`, `endDate` | Per-monster encounter counts, player deaths |
| `/admin/combat/history` | GET | `dataSource`, `page`, `limit`, `startDate`, `endDate` | Paginated encounter list |

### Simulation Control Endpoints (`server/src/routes/admin/simulation.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/simulation/start` | POST | Start a sim run (tickCount, botCount, config) |
| `/admin/simulation/stop` | POST | Stop running sim |
| `/admin/simulation/status` | GET | Current sim state (running/stopped, tick progress) |
| `/admin/simulation/export` | GET | Export sim results to Excel |

### Aggregation Approach

- All stats endpoints aggregate **on the fly** using Prisma `groupBy` and `aggregate` queries
- No pre-computed summaries or materialized views
- `getSimFilter()` applied as `where` clause to every query
- Date range filtering via `createdAt: { gte: startDate, lte: endDate }`
- Performance is acceptable for current data volume but could degrade with many accumulated runs

---

## Recommendations

1. **Add a `SimulationRun` model** — Store run metadata (startedAt, completedAt, tickCount, botCount, config JSON) so runs become first-class entities with unique IDs. Add `simulationRunId` FK to `CombatEncounterLog`.

2. **Add run selector to OverviewTab** — Dropdown/list of past runs (by date + config summary). Selecting a run filters stats to that run's encounters only. "Latest run" as default selection provides the "clear view" UX without deleting data.

3. **Add "Compare Runs" mode** — Side-by-side stats for two selected runs. This addresses the original requirement: "old runs need to be available for comparison." The `SimulationRun` model makes this straightforward.

4. **Soft-archive instead of delete** — Add `archived: Boolean` to `SimulationRun`. Archived runs hidden from default view but retrievable for comparison. This is the "clear view" without data loss.

5. **Consider cleanup for bot artifacts** — Bot characters, inventory items, and market listings persist after simulation runs. A "cleanup bots" action (or automatic post-run cleanup) would prevent database bloat from accumulated simulation artifacts.
