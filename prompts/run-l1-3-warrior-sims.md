# Run L1-3 Warrior Sims — All Released Races vs Early Monsters

```
cat CLAUDE.md
```

## Context

The batch combat sim CLI is fully built at `server/src/scripts/batch-combat-sim.ts`. It creates synthetic players, runs fights using the real combat engine (`resolveTickCombat`), and persists every fight to `CombatEncounterLog` tagged with a `SimulationRun` — which makes them viewable in the admin combat dashboard.

**Released races (7):** human, elf, dwarf, harthfolk, orc, nethkin, drakonid

**Early monsters (L1-5):** Goblin(1), Giant Rat(1), Wolf(2), Slime(2), Bandit(3), Mana Wisp(3), Bog Wraith(4), Skeleton Warrior(5)

**CLI usage:**
```
npm run sim:run -- --race human --class warrior --level 5 --monster Goblin --iterations 50
npm run sim:run -- --config=some-config.json
```

Grid config format (`server/src/scripts/sim-configs/*.json`):
```json
{
  "grid": {
    "races": ["human", "elf"],
    "classes": ["warrior"],
    "levels": [1, 2, 3],
    "monsters": ["Goblin", "Wolf"],
    "iterationsPerMatchup": 10
  },
  "notes": "description"
}
```

## Task

### Step 1 — Create Grid Config

Create `server/src/scripts/sim-configs/l1-3-warrior-released-races.json`:

```json
{
  "grid": {
    "races": ["human", "elf", "dwarf", "harthfolk", "orc", "nethkin", "drakonid"],
    "classes": ["warrior"],
    "levels": [1, 2, 3],
    "monsters": ["Goblin", "Giant Rat", "Wolf", "Slime", "Bandit", "Mana Wisp", "Bog Wraith", "Skeleton Warrior"],
    "iterationsPerMatchup": 10
  },
  "notes": "L1-3 Warriors, all 7 released races, vs L1-5 monsters. For admin log review."
}
```

That's 7 races × 1 class × 3 levels × 8 monsters × 10 iterations = **1,680 fights**.

### Step 2 — Run the Sim

```bash
cd server
npm run sim:run -- --config=l1-3-warrior-released-races.json --notes="L1-3 warrior verification, all released races"
```

Wait for it to complete. It should:
- Create test users + characters for each race/level combo (21 total: 7 races × 3 levels)
- Run 1,680 fights
- Write all results to `CombatEncounterLog` rows
- Print per-class and per-monster summary to console

### Step 3 — Verify Admin Visibility

After the sim completes, confirm the results are viewable:
1. Note the SimulationRun ID from the output
2. Verify encounter log count: `SELECT COUNT(*) FROM combat_encounter_logs WHERE simulation_run_id = '[run_id]'` — should be 1,680
3. Spot check a few rows: `SELECT character_name, opponent_name, outcome, total_rounds FROM combat_encounter_logs WHERE simulation_run_id = '[run_id]' LIMIT 10`

### Step 4 — Print Summary

Print the console output showing:
- Total fights completed
- Per-race win rates (which race performs best/worst as L1-3 warriors?)
- Per-monster win rates (which monsters are hardest for early warriors?)
- Any errors

Do NOT deploy — this is a local sim run only. No git commit needed.

## IMPORTANT

1. **Use the existing batch-combat-sim.ts** — do NOT create a new script
2. **Do NOT modify any source files** — just create the config and run it
3. **The sim writes to your local DB** — make sure your local DB is running (check DATABASE_URL in .env)
4. **If the sim fails**, check that all 51 monsters are seeded locally. If not, run the seed first.
5. **To clean up later:** `npm run sim:delete -- --run-id=[ID]` or `npm run sim:run -- delete-all --confirm`
