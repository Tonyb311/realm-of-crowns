# Run Full Balance Simulation Battery

Read `cat CLAUDE.md` before starting.

---

## CONTEXT

We have a batch combat sim CLI at `server/src/scripts/batch-combat-sim.ts` that writes `CombatEncounterLog` rows to the database for admin dashboard review. It's deployed and smoke-tested (tag 202603030440).

We need to run a comprehensive balance battery across all released content with level-appropriate matchups.

## TASK

### Step 1: Query Monster Data

Connect to the database and query all monsters to get their names and levels:

```bash
cd /d/realm_of_crowns
npx ts-node -e "
const { PrismaClient } = require('./database/prisma/generated/client');
const p = new PrismaClient();
p.monster.findMany({ select: { name: true, level: true }, orderBy: { level: 'asc' } })
  .then(m => { console.log(JSON.stringify(m, null, 2)); p.\$disconnect(); });
"
```

If the Prisma import path is wrong, check how the server imports it (look at `server/src/lib/prisma.ts`).

### Step 2: Build Level-Appropriate Matchup Config

Create a config file at `server/src/scripts/sim-configs/full-balance-battery.json` that pairs player levels with monsters in their combat range.

Use this pairing logic based on the monster levels you discovered in Step 1:

| Player Level | Monster Level Range | Rationale |
|---|---|---|
| 1 | L1-3 monsters | Fresh characters, should fight easy stuff |
| 3 | L1-5 monsters | Still early game, slight stretch fights |
| 5 | L3-7 monsters | Transitioning to mid tier |
| 10 | L6-12 monsters | Full mid tier range |
| 15 | L10-16 monsters | Overlapping mid-high tier |
| 20 | L14-18 monsters | End game content |

The config should use the `matchups` array format (NOT grid), since we need specific level-to-monster pairings:

```json
{
  "matchups": [
    { "race": "human", "class": "warrior", "level": 1, "opponent": "Giant Rat", "iterations": 200 },
    { "race": "human", "class": "warrior", "level": 1, "opponent": "Goblin", "iterations": 200 },
    ...
  ],
  "notes": "Full balance battery: 7 released races × 7 classes × 6 levels × level-appropriate monsters × 200 iterations"
}
```

**Released races (7 only):** human, elf, dwarf, halfling, orc, tiefling, dragonborn

**All classes (7):** warrior, mage, rogue, cleric, ranger, bard, psion

Generate every combination of `{race} × {class} × {level} × {level-appropriate monsters}` at 200 iterations each.

Calculate and print the total fight count before running. It should be roughly:
- 7 races × 7 classes = 49 combatant configs
- × 6 levels with varying monster counts per level
- × 200 iterations each

### Step 3: Run the Simulation

```bash
cd /d/realm_of_crowns
npx ts-node server/src/scripts/batch-combat-sim.ts run --config server/src/scripts/sim-configs/full-balance-battery.json --notes "Full balance battery: released races × all classes × L1-20 × level-appropriate monsters @ 200 iterations"
```

This will take a while. The script prints progress every 1000 fights. Let it run to completion.

### Step 4: Report Summary

After the sim completes, print the run ID and key stats from the output:
- Total matchups and fights
- Duration
- Overall win rate
- Per-class win rates
- Per-monster difficulty
- Any balance alerts the script flags

Then print:
```
Run complete. View results:
  Admin → Combat Dashboard → Switch to "Simulation" → Select this run
  
To delete later:
  npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id <THE_RUN_ID>
```

---

## DO NOT

- Do not include unreleased races (only the 7 listed above)
- Do not pair L1 characters against L18 monsters (use the level-appropriate ranges)
- Do not modify any game code — this is a read-only simulation run
- Do not deploy anything — just run the existing script
- Do not reduce iterations below 200 — we want high precision

## IMPORTANT

If the total fight count exceeds 500,000 (the max per batch), split into multiple runs:
- Run 1: L1 and L3 matchups
- Run 2: L5 and L10 matchups  
- Run 3: L15 and L20 matchups

Each gets its own SimulationRun and shows up separately in the admin RunSelector. Add the level range to the notes field so they're easy to identify.
