# Batch Combat Simulator CLI with Admin Dashboard Integration

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

### The Problem

When we run batch combat simulations via Claude Code prompts, the results vanish after the conversation ends. We get aggregates printed to chat or dumped to Excel, but:

- The admin dashboard (Admin → Combat → Simulation mode) shows nothing for these runs
- We can't compare batch sim results across sessions
- We can't drill into individual fights in the History tab
- The Overview stats (by-race, by-class, by-monster, balance alerts) don't reflect batch sim data
- Old batch sim data has no cleanup mechanism — no way to delete a run and its encounter logs

### How the Admin Dashboard Works

The admin combat dashboard (`AdminCombatPage.tsx`) has a data source toggle: Live / Simulation / All.

In **Simulation mode**, it shows a `RunSelector` that lists `SimulationRun` records from the DB. When you pick a run, every tab filters by `simulationRunId`:

- **Overview** — PvE survival rate, flee rate, avg rounds, economy, balance alerts, by-race/class/monster breakdowns. ALL sourced from `CombatEncounterLog` records where `simulationRunId = selectedRunId`.
- **History** — Paginated list of individual encounter logs with full round-by-round replay data.
- **Codex** — Static data (races, classes, items, status effects). Not affected by data source.
- **Simulator** — Interactive single-fight simulator. Not affected.

The key insight: **the entire dashboard reads from `CombatEncounterLog` rows.** If those rows don't exist for a simulation run, the dashboard shows empty panels. The current batch-simulate endpoint creates a `SimulationRun` row but zero `CombatEncounterLog` rows — so it shows up in the RunSelector but every tab is blank.

### Why Per-Fight Encounter Logs Matter

The `CombatEncounterLog` model stores:

```
id, type, sessionId, characterId, characterName, opponentId, opponentName,
townId, startedAt, endedAt, outcome, totalRounds,
characterStartHp, characterEndHp, opponentStartHp, opponentEndHp,
characterWeapon, opponentWeapon, xpAwarded, goldAwarded, lootDropped,
rounds (JSONB — full round-by-round data with encounter context),
summary, triggerSource, simulationTick, simulationRunId
```

The `rounds` JSONB field contains `[{ _encounterContext: { combatants, turnOrder } }, ...RoundLogEntry[]]` — every attack roll, damage roll, modifier, HP delta, status effect, ability use. This is what powers the History tab's combat replay view.

The `characterId` FK joins to Character for `race`, `class`, `level` — used by Overview stats breakdowns.

### The FK Constraint

`CombatEncounterLog.characterId` is a **required FK** to `Character` with `onDelete: Cascade`. The batch simulator currently uses `'sim-player'` as the combatant ID, which doesn't exist in the Character table. That's why the existing batch-simulate endpoint can't call `logPveCombat()`.

**Solution:** The CLI script creates lightweight test characters (real DB records with correct race/class/level) so the FK is satisfied and admin dashboard breakdowns work. On deletion, cascade-delete handles cleanup.

### Existing Delete Endpoint Bug

`DELETE /api/admin/simulation/runs/:id` currently does:
```typescript
// Nulls out FK references, leaving orphaned encounter logs
await prisma.combatEncounterLog.updateMany({
  where: { simulationRunId: req.params.id },
  data: { simulationRunId: null },
});
await prisma.simulationRun.delete({ where: { id: req.params.id } });
```

This leaves orphaned `CombatEncounterLog` rows with `simulationRunId: null` that pollute the "Live" data source. **Must fix to actually DELETE encounter logs.**

---

## THE TASK

### Part A: Create the CLI Script

Create `server/src/scripts/batch-combat-sim.ts` — a standalone CLI script that:

1. Accepts matchup configuration (same format as `/admin/combat/batch-simulate`)
2. Creates a `SimulationRun` record
3. Creates temporary test characters for each unique race+class+level combo
4. Runs fights using `resolveTickCombat()` (identical to live gameplay)
5. Writes `CombatEncounterLog` per fight via `logPveCombat()`
6. Prints aggregate summary to stdout
7. Cleans up test characters + encounter logs + SimulationRun on demand

#### CLI Interface

```bash
# Run a batch sim from a JSON config file
npx ts-node server/src/scripts/batch-combat-sim.ts run --config matchups.json --notes "Post-L1 ability balance check"

# Run a quick grid sweep
npx ts-node server/src/scripts/batch-combat-sim.ts run --grid --races ALL --classes ALL --levels 1,5,10,20 --monsters ALL --iterations 100 --notes "Full grid sweep"

# Run a single matchup from CLI args
npx ts-node server/src/scripts/batch-combat-sim.ts run --race human --class mage --level 1 --monster Goblin --iterations 500

# List all batch sim runs
npx ts-node server/src/scripts/batch-combat-sim.ts list

# Delete a specific run (SimulationRun + all CombatEncounterLog + test characters)
npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id <CUID>

# Delete ALL batch sim runs
npx ts-node server/src/scripts/batch-combat-sim.ts delete-all --confirm
```

#### Config File Format (matchups.json)

```json
{
  "matchups": [
    { "race": "human", "class": "mage", "level": 1, "opponent": "Goblin", "iterations": 100 },
    { "race": "orc", "class": "warrior", "level": 5, "opponent": "Orc Warrior", "iterations": 100 }
  ],
  "notes": "Testing mage L1 after early abilities patch"
}
```

OR grid format:

```json
{
  "grid": {
    "races": ["ALL"],
    "classes": ["ALL"],
    "levels": [1, 5, 10, 20],
    "monsters": ["ALL"],
    "iterationsPerMatchup": 100
  },
  "notes": "Full balance sweep"
}
```

Both formats are already supported by the batch-simulate endpoint — reuse the same expansion logic (ALL → all races/classes/monsters from DB).

#### Script Architecture

```typescript
// 1. Parse CLI args and load config
// 2. Connect to database via Prisma
// 3. Fetch monster data from DB (same as batch-simulate)
// 4. Create SimulationRun record (status: 'running', config: matchup JSON)
// 5. For each unique {race, class, level} in matchups:
//    a. Create a test User (isTestAccount: true, username: `batch-sim-${runId}-${race}-${class}-${level}`)
//    b. Create a test Character with correct race, class, level, stats (via buildSyntheticPlayer)
//    c. Store characterId in a lookup map
// 6. For each matchup, for each iteration:
//    a. Build combatants via buildSyntheticPlayer + buildSyntheticMonster + createCharacterCombatant + createMonsterCombatant
//    b. Run resolveTickCombat() (with buildPlayerCombatParams for abilities, presets, stance)
//    c. Build CombatState from outcome for logPveCombat
//    d. Call logPveCombat() with:
//       - characterId: test character's real DB ID (from lookup map)
//       - characterName: synthetic player name
//       - opponentName: monster name
//       - townId: null (batch sim, no town context)
//       - All HP, weapon, outcome, XP data from the fight
//       - simulationTick: matchup index (for ordering)
//       - simulationRunId: from step 4
//       - triggerSource: 'batch_sim' (new value — add to the type check if needed)
// 7. Update SimulationRun with status: 'completed', encounterCount, completedAt
// 8. Print summary to stdout
// 9. Disconnect Prisma and exit
```

#### Test Character Creation

For each unique `{race, class, level}` combo in the matchups, create:

```typescript
// User record (minimal, just for FK chain)
const user = await prisma.user.create({
  data: {
    id: `batch-sim-user-${runId}-${race}-${cls}-${level}`,
    username: `BatchSim_${race}_${cls}_L${level}`,
    email: `batch-${runId}-${race}-${cls}-${level}@sim.local`,
    passwordHash: 'batch-sim-no-login',
    isTestAccount: true,
  },
});

// Character record (using synthetic stats)
const synthetic = buildSyntheticPlayer({ race, class: cls, level });
const character = await prisma.character.create({
  data: {
    id: `batch-sim-char-${runId}-${race}-${cls}-${level}`,
    userId: user.id,
    name: synthetic.name,
    race: race.toUpperCase(), // Match DB enum format — CHECK what format the Character.race field uses
    class: cls.toLowerCase(), // CHECK Character.class field format
    level: level,
    health: synthetic.hp,
    maxHealth: synthetic.maxHp,
    gold: 0,
    xp: 0,
    stats: synthetic.stats,
    currentTownId: null, // No town for batch sims — CHECK if this is nullable
  },
});
```

**IMPORTANT:** Before creating test characters, verify:
1. What format `Character.race` uses (uppercase? lowercase? enum?)
2. What format `Character.class` uses
3. Whether `currentTownId` is nullable
4. What other required fields Character has (check the Prisma schema)

If `currentTownId` is NOT nullable, pick any town from the DB as a default.

#### Calling logPveCombat

The `logPveCombat` function in `server/src/lib/combat-logger.ts` takes a `CombatState` object and extracts round-by-round data. The tricky part: `resolveTickCombat()` returns a `TickCombatOutcome` (winner, combatLog, rounds, survivors, casualties), NOT a `CombatState`.

You need to either:

**Option A:** Keep a reference to the final `CombatState` from `resolveTickCombat`. Look at how `resolveTickCombat` works — it operates on a `CombatState` internally. If it doesn't expose the final state, you may need to modify it to return it alongside the outcome. CHECK `resolveTickCombat`'s return type and see if the `CombatState` is accessible.

**Option B:** Reconstruct the data `logPveCombat` needs. Looking at the function signature:
```typescript
logPveCombat({
  sessionId, state, characterId, characterName, opponentName,
  townId, characterStartHp, opponentStartHp, characterWeapon, opponentWeapon,
  xpAwarded, goldAwarded, lootDropped, outcome,
  simulationTick, triggerSource, originTownId, destinationTownId
})
```

The `state` parameter is used by `buildEncounterContext(state)` and `buildRoundsData(state)` which read `state.combatants` and `state.log` (the `TurnLogEntry[]`).

**If resolveTickCombat doesn't expose the final CombatState**, the script should use a lower-level approach:
1. Create the combat state manually via `createCombatState` + `rollAllInitiative`
2. Run the fight loop manually (copy the loop from `resolveTickCombat` but retain the final `CombatState`)
3. Call `logPveCombat` with the retained state

CHECK `resolveTickCombat`'s source. If it returns the full state, use it directly. If not, the manual approach is needed. The existing batch-simulate endpoint in `combat.ts` already does a manual loop — reference that pattern.

Actually wait — looking at the batch-simulate endpoint code more carefully, it ALREADY calls `resolveTickCombat(state, paramsMap)` which returns `TickCombatOutcome`. But `TickCombatOutcome` has `combatLog: TurnLogEntry[]` — that's the same data `buildRoundsData` needs. 

The script may need to reconstruct a minimal `CombatState`-like object from the outcome, OR modify `resolveTickCombat` to also return the final state. **The cleanest fix: add an optional `returnFinalState: true` parameter to resolveTickCombat that includes the final CombatState in the outcome.** But that's a code change to an existing function — evaluate whether it's safe.

Alternatively, call `logPveCombat` manually by building the encounter context and rounds data from the outcome's `combatLog`. This avoids modifying `resolveTickCombat` but requires duplicating some logic from `combat-logger.ts`.

**Decide the cleanest approach after reading the actual code.** The goal is: every fight produces a `CombatEncounterLog` with full round-by-round JSONB data, identical to what a real road encounter produces.

#### Summary Output

After all fights complete, print:

```
=== Batch Combat Simulation Complete ===
Run ID: clxxxxxxxxxx
Matchups: 147 (7 races × 7 classes × 3 levels)
Total fights: 14,700 (100 iterations each)
Duration: 45.2s

Overall player win rate: 62.3%
Avg rounds: 4.8

By Class:
  warrior: 71.2% | mage: 58.4% | rogue: 63.1% | cleric: 55.7% | ranger: 66.8% | bard: 51.2% | psion: 59.9%

By Monster:
  Goblin: 89.2% player wins | Orc Warrior: 61.4% | Shadow Wraith: 33.8%

Balance Alerts:
  ⚠ Bard has 51.2% win rate (expected 55-75%)
  🔴 Shadow Wraith: 33.8% player survival (expected 45-80%)

Encounter logs written: 14,700
Test characters created: 147
View in admin: Admin → Combat → Simulation → [select run]
To delete: npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id clxxxxxxxxxx
```

### Part B: Delete Functionality

#### CLI Delete

```bash
# Delete one run
npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id <ID>

# Delete all batch sim runs
npx ts-node server/src/scripts/batch-combat-sim.ts delete-all --confirm
```

Delete sequence:
1. Find all test Users created for this run (where `username LIKE 'BatchSim_%'` AND `id LIKE 'batch-sim-user-${runId}%'`)
2. Delete those Users — this CASCADE-DELETES their Characters, which CASCADE-DELETES their CombatEncounterLog rows
3. Delete the SimulationRun record
4. Print confirmation: "Deleted run {id}: {X} encounter logs, {Y} test characters removed"

For `delete-all`:
1. Find all SimulationRun records where config contains batch sim marker (see below)
2. Run the same delete sequence for each
3. As a safety net, also delete any Users where `username LIKE 'BatchSim_%'` (catches orphans)

#### Batch Sim Identification

To distinguish batch sim runs from bot tick simulation runs in the `SimulationRun` table, store a marker in the `config` JSON:

```json
{
  "source": "batch-cli",
  "matchups": [...],
  ...
}
```

The `delete-all` command filters by `config->>'source' = 'batch-cli'`.

#### Fix Existing Admin Delete Endpoint

In `server/src/routes/admin/simulation.ts`, fix `DELETE /runs/:id`:

```typescript
// BEFORE (buggy — orphans encounter logs):
await prisma.combatEncounterLog.updateMany({
  where: { simulationRunId: req.params.id },
  data: { simulationRunId: null },
});
await prisma.simulationRun.delete({ where: { id: req.params.id } });

// AFTER (proper cleanup):
// 1. Find and delete test users/characters created for this run (cascade-deletes encounter logs)
await prisma.user.deleteMany({
  where: { 
    isTestAccount: true,
    id: { startsWith: `batch-sim-user-${req.params.id}` }
  },
});
// 2. Delete any remaining encounter logs for this run (from bot tick sims, not batch)
await prisma.combatEncounterLog.deleteMany({
  where: { simulationRunId: req.params.id },
});
// 3. Delete the run itself
await prisma.simulationRun.delete({ where: { id: req.params.id } });
```

This handles both batch sim runs (test users cascade) and bot tick sim runs (direct encounter log delete).

### Part C: Add npm Script Shortcut

In `package.json` (root or server), add:

```json
{
  "scripts": {
    "sim:run": "ts-node server/src/scripts/batch-combat-sim.ts run",
    "sim:list": "ts-node server/src/scripts/batch-combat-sim.ts list",
    "sim:delete": "ts-node server/src/scripts/batch-combat-sim.ts delete"
  }
}
```

### Part D: Create a Default Config File

Create `server/src/scripts/sim-configs/full-sweep.json`:

```json
{
  "grid": {
    "races": ["ALL"],
    "classes": ["ALL"],
    "levels": [1, 3, 5, 10, 15, 20],
    "monsters": ["ALL"],
    "iterationsPerMatchup": 50
  },
  "notes": "Full balance sweep — all races × classes × levels × monsters"
}
```

And `server/src/scripts/sim-configs/quick-check.json`:

```json
{
  "grid": {
    "races": ["human"],
    "classes": ["ALL"],
    "levels": [1, 5, 10],
    "monsters": ["Goblin", "Orc Warrior", "Shadow Wraith", "Young Dragon"],
    "iterationsPerMatchup": 100
  },
  "notes": "Quick balance check — all classes vs key monsters"
}
```

---

## IMPORTANT IMPLEMENTATION DETAILS

### Database Connection

The script runs standalone (not inside the server). It needs its own Prisma client connection:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// ... at the end:
await prisma.$disconnect();
process.exit(0);
```

Make sure the Prisma import path is correct for the project structure. Check existing scripts or the server's prisma import to find the right path.

### Monster Data

Monsters live in the DB, not in code. The script must query `prisma.monster.findMany()` to get monster stats, just like the batch-simulate endpoint does.

### Combat Resolution Fidelity

The fights MUST use `resolveTickCombat()` with `buildPlayerCombatParams()` — this is the same code path as real road encounters. It includes:
- Ability priority queue (presets)
- Stance modifiers (aggressive/defensive/balanced)
- Racial combat abilities
- Class abilities at correct levels
- Flee threshold behavior

Do NOT use the simple `resolveTurn()` loop from the `/simulate` endpoint — that's basic attack-only combat without abilities, stances, or AI decision-making. The whole point is matching live gameplay.

### Progress Reporting

For large sims (50,000+ fights), print progress every 1000 fights:

```
[1000/14700] 6.8% — warrior vs Goblin L1: 89% win rate
[2000/14700] 13.6% — mage vs Goblin L1: 72% win rate
...
```

### Error Handling

- If a matchup fails (bad race/class/monster name), log the error and continue to the next matchup
- If DB write fails for an encounter log, log the error and continue (don't abort the whole sim)
- If the script is interrupted (Ctrl+C), attempt to update SimulationRun status to 'stopped'
- On any fatal error, set SimulationRun status to 'failed'

### triggerSource Value

Add `'batch_sim'` as a new triggerSource value. The existing values are: `'road_encounter'`, `'group_road_encounter'`, `'town_pve'`, `'pvp_duel'`, `'pvp_spar'`, `'arena'`. The schema stores this as a plain String, so no migration needed — just start writing `'batch_sim'`.

---

## TESTING

1. **Quick smoke test:** Run with 1 matchup, 5 iterations. Verify:
   - SimulationRun created in DB with correct config
   - 5 CombatEncounterLog rows with correct simulationRunId
   - Test User + Character exist in DB with isTestAccount: true
   - Encounter logs have full `rounds` JSONB data (encounter context + round entries)
   - Summary printed to stdout

2. **Admin dashboard verification:** After a run, go to Admin → Combat → switch to Simulation → select the run:
   - Overview shows correct stats (win rates, avg rounds, alerts)
   - History shows individual encounter logs with combat replay data
   - by-race and by-class breakdowns show correct races/classes from the test characters

3. **Delete verification:** Run delete command, verify:
   - SimulationRun deleted
   - All CombatEncounterLog rows for that run deleted
   - Test Users and Characters deleted
   - No orphaned records

4. **Parity check:** Run the same matchup through both the CLI and the admin batch-simulate endpoint. Compare:
   - Win rates should be statistically similar (within ~3% for 100+ iterations)
   - Both use resolveTickCombat — if win rates diverge, something is wrong with combatant construction

---

## DEPLOYMENT

```bash
git add -A
git commit -m "feat: batch combat sim CLI with admin dashboard integration

- CLI script: server/src/scripts/batch-combat-sim.ts
- Commands: run, list, delete, delete-all
- Creates SimulationRun + CombatEncounterLog per fight
- Uses resolveTickCombat for live-accurate combat resolution
- Test characters with correct race/class/level for FK + admin breakdowns
- Full cleanup: delete run cascades to encounter logs + test characters
- Fix: admin DELETE /runs/:id now properly deletes encounter logs (was orphaning them)
- Default configs: full-sweep.json, quick-check.json
- npm shortcuts: sim:run, sim:list, sim:delete"
git push origin main
```

Build and deploy:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify `combat-engine.ts` — battle-tested
- Do not modify `combat-logger.ts` — only call its existing `logPveCombat()` function
- Do not use the simple `resolveTurn()` loop — must use `resolveTickCombat()` for ability/stance fidelity
- Do not skip encounter log writing — the entire point is admin dashboard visibility
- Do not leave orphaned test characters or encounter logs on delete
- Do not create test characters with `isTestAccount: false` — they must be identifiable for cleanup
- Do not hardcode DB connection strings — use the project's existing env/config pattern

## SUMMARY FOR CHAT

When done, print:

```
Batch Combat Sim CLI deployed:
- Script: server/src/scripts/batch-combat-sim.ts
- Commands: run (--config/--grid/--race), list, delete (--run-id), delete-all (--confirm)
- Combat resolution: resolveTickCombat (identical to live road encounters)
- DB writes: SimulationRun + CombatEncounterLog per fight + test Characters
- Admin dashboard: fully functional in Simulation mode for batch runs
- Cleanup: delete cascades SimulationRun → encounter logs → test characters
- Fix: admin DELETE /runs/:id now deletes encounter logs (was orphaning)
- Default configs: full-sweep.json, quick-check.json
- npm scripts: sim:run, sim:list, sim:delete
Deployed: tag [TAG]
```
