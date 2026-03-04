# Fix: Simulation Run Management — Track, Filter, Compare

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead.
- Always end with a clear summary of what was delivered and what still needs the user's input.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

### Current State

- Simulation combat data is stored in `CombatEncounterLog` with a `simulationTick` (Int, nullable) field to distinguish sim from live combat
- **No `SimulationRun` model exists** — run metadata (tick count, bot count, config, timing) is ephemeral and lost on server restart
- **No way to distinguish between different simulation runs** other than timestamp gaps
- The admin combat dashboard has `dataSource` filtering (live vs sim) and date range pickers, but no run-level selection
- The `SimulationController` singleton manages runs in-memory only
- A 50-bot, 45-tick run generates ~200-500 `CombatEncounterLog` entries

### The Problem

When the admin runs a new simulation, old simulation data clutters the stats view. There's no way to say "show me just the latest run" vs "compare this run to last week's run." The user wants to clear the view for fresh runs without deleting old data (needed for comparing balance changes over time).

---

## THE TASK

### Phase 1: Add `SimulationRun` Model (Backend Schema)

Add a new Prisma model to track simulation runs as first-class entities:

```prisma
model SimulationRun {
  id            String    @id @default(cuid())
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  tickCount     Int       // configured tick count
  ticksCompleted Int      @default(0) // actual ticks completed (may differ if stopped early)
  botCount      Int       // number of bots
  config        Json      @default("{}") // full simulation config snapshot
  encounterCount Int      @default(0)   // total combat encounters generated
  status        String    @default("running") // "running", "completed", "stopped", "failed"
  notes         String?   // optional admin notes (e.g., "post-armor-fix baseline")
  archived      Boolean   @default(false) // hidden from default view, still queryable
  
  encounters    CombatEncounterLog[]
  
  @@index([startedAt])
  @@index([status])
}
```

Add FK to `CombatEncounterLog`:

```prisma
model CombatEncounterLog {
  // ... existing fields ...
  simulationRunId  String?
  simulationRun    SimulationRun? @relation(fields: [simulationRunId], references: [id])
  
  @@index([simulationRunId])
}
```

Run `npx prisma migrate dev --name add-simulation-run-model`.

### Phase 2: Wire SimulationRun into the Simulation Engine

**File: `server/src/lib/simulation/controller.ts`** (or wherever the simulation orchestration lives)

When a simulation starts:
1. Create a `SimulationRun` record with config snapshot, tickCount, botCount, status "running"
2. Store the `runId` on the controller instance
3. Pass `runId` through to wherever `CombatEncounterLog` entries are created

When combat encounters are logged during simulation:
4. Set `simulationRunId` on every `CombatEncounterLog` entry created during this run

When the simulation completes or is stopped:
5. Update the `SimulationRun`: set `completedAt`, `ticksCompleted`, `encounterCount` (count of encounters created), status "completed" or "stopped"

**Find where CombatEncounterLog entries are created during simulation.** The audit says simulation combat flows through `resolveRoadEncounter()` in `road-encounter.ts` and `tick-combat-resolver.ts`. Search for `CombatEncounterLog.create` or `.createMany` in these files and add `simulationRunId` to the create data. The runId needs to be threaded through from the controller → engine → action → combat resolver.

**Important:** The simulation engine likely passes context through function parameters or a shared state object. Find the existing pattern for how `simulationTick` gets set on encounters and follow the same pattern for `simulationRunId`. Don't invent a new threading mechanism — piggyback on whatever exists.

### Phase 3: Backfill Existing Data (Migration Script)

Existing simulation encounters have `simulationTick IS NOT NULL` but no `simulationRunId`. Group them into synthetic runs:

Create a one-time migration script (can be a seed file or standalone script):

1. Query all `CombatEncounterLog` where `simulationTick IS NOT NULL AND simulationRunId IS NULL`
2. Group by large timestamp gaps (> 5 minutes between consecutive entries = new run boundary)
3. For each group:
   - Create a `SimulationRun` with `startedAt` = earliest entry, `completedAt` = latest entry, `status = "completed"`, `ticksCompleted` = max simulationTick in group, `encounterCount` = count, `notes = "Backfilled from historical data"`
   - Update all entries in the group with the new `simulationRunId`

This is approximate but good enough — the point is to have historical runs queryable. If there are very few old sim records, this could even be done manually.

**If grouping by timestamp gaps is too complex,** a simpler alternative: create one `SimulationRun` per distinct `createdAt` date (i.e., group by calendar day). Less precise but much simpler. Pick whichever feels right for the actual data volume.

### Phase 4: Update Backend Stats Endpoints

**File: `server/src/routes/admin/combat-stats.ts`**

Add `simulationRunId` as an optional query parameter to all stats endpoints:

- `GET /admin/combat/stats?dataSource=sim&runId=xxx` — filter to specific run
- `GET /admin/combat/stats/by-race?dataSource=sim&runId=xxx`
- `GET /admin/combat/stats/by-class?dataSource=sim&runId=xxx`
- `GET /admin/combat/stats/by-monster?dataSource=sim&runId=xxx`
- `GET /admin/combat/history?dataSource=sim&runId=xxx`

Update `getSimFilter()` (or create a new helper):

```typescript
function getSimFilter(dataSource: string, runId?: string) {
  if (dataSource === 'sim') {
    const filter: any = { simulationTick: { not: null } };
    if (runId) filter.simulationRunId = runId;
    return filter;
  }
  if (dataSource === 'live') return { simulationTick: null };
  return {};
}
```

When `runId` is provided, stats are scoped to that run only. When omitted and `dataSource=sim`, show all sim data (backward compatible).

Add a new endpoint to list simulation runs:

```
GET /admin/simulation/runs?includeArchived=false
```

Returns:
```json
{
  "runs": [
    {
      "id": "cuid",
      "startedAt": "2026-03-02T10:00:00Z",
      "completedAt": "2026-03-02T10:15:00Z",
      "tickCount": 45,
      "ticksCompleted": 45,
      "botCount": 50,
      "encounterCount": 342,
      "status": "completed",
      "notes": "Post-armor-fix baseline",
      "archived": false
    }
  ]
}
```

Order by `startedAt DESC`. Default excludes archived runs; `includeArchived=true` shows all.

Add endpoints for run management:

```
PATCH /admin/simulation/runs/:id         — Update notes, archived status
DELETE /admin/simulation/runs/:id         — Hard delete run + its encounters (for when you truly want to purge)
POST /admin/simulation/runs/:id/archive   — Toggle archived status
```

**The DELETE is for genuine cleanup** (e.g., a botched run with bad config). Default UX should be archive, not delete. The delete endpoint is the escape hatch.

### Phase 5: Frontend — Run Selector + Compare Mode

**File: `client/src/components/admin/combat/OverviewTab.tsx`**

#### Run Selector (replaces date range picker when dataSource = "sim")

When `dataSource` is set to "Simulation":

1. Fetch the runs list from `GET /admin/simulation/runs`
2. Show a **run selector dropdown** at the top of the stats area:
   - Default selection: latest run (provides the "clear view" behavior — you only see the newest data)
   - Each option shows: date + tick count + bot count + encounter count + notes preview
   - Format: `"Mar 2, 2026 — 45 ticks, 50 bots, 342 encounters"` with notes as subtitle if present
   - "All Simulation Data" option at the bottom for unfiltered view
3. When a run is selected, pass `runId` to all stats API calls
4. Keep the date range picker visible but secondary (useful for "All Simulation Data" mode)

#### Run Management (small additions)

Add next to the run selector:
- **Archive button** — hides the selected run from the dropdown (with confirmation). Tooltip: "Hide from default view. Data preserved for comparison."
- **Notes field** — inline editable text field for the selected run. Useful for labeling: "Pre-armor fix", "After balance patch", etc.
- **Delete button** — hard deletes the run + encounters (with strong confirmation: "This permanently deletes X encounters. Cannot be undone."). Style as danger/red.
- **Show archived toggle** — checkbox that includes archived runs in the dropdown

#### Compare Mode

Add a "Compare" toggle/button next to the run selector:

When enabled:
1. Show TWO run selectors side by side: "Run A" and "Run B"
2. Display stats for both runs in a **side-by-side layout**
3. For each metric, show the delta between runs:
   - Win rates: "Warrior: 62% → 58% (▼4%)"
   - Avg rounds: "4.2 → 3.8 (▼0.4)"
   - Encounter count: "342 → 410 (▲68)"
4. Color-code deltas: green for improvements (subjective — higher win rate balance may be contextual), red for concerning shifts, gray for minimal change (< 2% difference)

**Keep compare mode simple.** It's just the same stats tables rendered twice with a diff column. Don't build a separate comparison engine — reuse the existing stats components with two different `runId` params.

If compare mode is too complex for a single prompt, it can be a follow-up. **The core deliverable is the run model + run selector + archive.** Compare is a bonus.

---

## TESTING

1. **Run a fresh simulation** — verify a `SimulationRun` record is created with correct metadata
2. **Check encounters are tagged** — verify new `CombatEncounterLog` entries have `simulationRunId` set
3. **Run selector works** — select the new run, verify stats show only that run's data
4. **Backfill worked** — verify old simulation data is grouped into synthetic runs
5. **Archive works** — archive a run, verify it disappears from default dropdown, reappears with "show archived"
6. **Notes work** — add notes to a run, verify they persist and display
7. **Compare mode** (if implemented) — select two runs, verify side-by-side stats with deltas

---

## DEPLOYMENT

After all changes verified:

```bash
npx prisma migrate dev --name add-simulation-run-model
git add -A
git commit -m "feat: simulation run tracking — run model, run selector, archive, compare mode"
git push origin main
```

Build and deploy with unique tag:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

Run migration on production:
```bash
az containerapp exec --name realm-of-crowns --resource-group realm-of-crowns-rg --command "npx prisma migrate deploy"
```

Then run the backfill script for historical data (if created as a standalone script).

---

## DO NOT

- Do not delete any existing `CombatEncounterLog` data
- Do not change the `simulationTick` field or its existing behavior
- Do not modify the simulation engine's core AI/action logic
- Do not change how live (non-simulation) combat data works
- Do not remove the existing `dataSource` toggle — run selection supplements it, doesn't replace it
- Do not over-engineer compare mode — simple side-by-side tables with deltas is sufficient

## SUMMARY FOR CHAT

When done, print:
```
Simulation run management implemented:
- Schema: SimulationRun model + simulationRunId FK on CombatEncounterLog
- Engine: Runs create/update SimulationRun records, encounters tagged with runId
- Backfill: Historical sim data grouped into [N] synthetic runs
- API: Run list, run-scoped stats filtering, archive/notes/delete endpoints
- UI: Run selector dropdown (defaults to latest), archive/notes controls
- Compare: [implemented/deferred] — side-by-side run comparison with deltas
Deployed: tag [TAG], migration applied
```
