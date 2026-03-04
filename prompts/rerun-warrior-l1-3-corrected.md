# Rerun Warrior L1-3 Sim with Correct Race IDs

Read `cat CLAUDE.md` before starting.

---

## TASK

The previous warrior L1-3 sim (run `cmmaobks20000v7rwcssznhxg`) skipped 3 races because of wrong race IDs. Rerun with the correct in-game IDs.

### Step 1: Verify all 7 race IDs

Query the race registry to confirm the exact IDs:

```bash
cd /d/realm_of_crowns
npx ts-node -e "
const { RaceRegistry } = require('./shared/src/data/races');
console.log(Object.keys(RaceRegistry));
"
```

If this import doesn't work, check how the server imports it and adjust.

### Step 2: Update the config

Edit `server/src/scripts/sim-configs/warrior-l1-3.json`. Replace race IDs:
- `halfling` → whatever the registry says (likely `harthfolk`)
- `tiefling` → whatever the registry says (likely `nethkin`)  
- `dragonborn` → whatever the registry says (likely `drakonid`)

Keep `human`, `elf`, `dwarf`, `orc` as-is (those worked).

Keep everything else the same — warrior class, L1-3, same monster pairings, 200 iterations.

### Step 3: Delete the previous incomplete run

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id cmmaobks20000v7rwcssznhxg
```

### Step 4: Run the corrected sim

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run --config server/src/scripts/sim-configs/warrior-l1-3.json --notes "Warriors L1-3 × 7 released races (corrected IDs) × level-appropriate monsters @ 200 iterations"
```

### Step 5: Report

Confirm all 7 races ran with 0 errors. Print:
- Run ID
- Total matchups and fights (should be ~23,800 if all 119 matchups ran)
- Win rate by level (L1 / L2 / L3)
- Win rate by race (all 7)
- Win rate by monster
- Any 0% or 100% win rates

```
View in admin: Admin → Combat → Simulation → select this run
Delete later: npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id <ID>
```

---

## DO NOT

- Do not modify any game code
- Do not change class, levels, iterations, or monster pairings — only fix the race IDs
- Do not keep the old incomplete run (delete it)
