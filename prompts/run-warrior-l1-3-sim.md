# Run Focused Sim: Warriors L1-3, All Released Races, Level-Appropriate Monsters

Read `cat CLAUDE.md` before starting.

---

## TASK

Run a targeted batch combat sim: **Warriors only, levels 1-3, all 7 released races, level-appropriate monsters, 200 iterations each.**

### Step 1: Query monsters

Get all monsters and their levels from the DB so you can build level-appropriate matchups:

```bash
cd /d/realm_of_crowns
npx ts-node -e "
const { PrismaClient } = require('./database/prisma/generated/client');
const p = new PrismaClient();
p.monster.findMany({ select: { name: true, level: true }, orderBy: { level: 'asc' } })
  .then(m => { console.log(JSON.stringify(m, null, 2)); p.\$disconnect(); });
"
```

### Step 2: Build the config

Create `server/src/scripts/sim-configs/warrior-l1-3.json` with matchups:

**Races (7):** human, elf, dwarf, halfling, orc, tiefling, dragonborn

**Class:** warrior only

**Levels and monster pairing:**
- **L1** → all monsters at level 1-2
- **L2** → all monsters at level 1-3
- **L3** → all monsters at level 1-4

**200 iterations per matchup.**

Use the `matchups` array format. Print the total fight count before running.

### Step 3: Run

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run --config server/src/scripts/sim-configs/warrior-l1-3.json --notes "Warriors L1-3 × 7 released races × level-appropriate monsters @ 200 iterations"
```

### Step 4: Report

Print:
- Run ID
- Total matchups and fights
- Duration
- Win rate breakdown by level (L1 / L2 / L3)
- Win rate breakdown by race
- Win rate breakdown by monster
- Any matchups where win rate is 0% or 100% (flags broken mechanics)

```
View in admin: Admin → Combat → Simulation → select this run
Delete later: npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id <ID>
```

---

## DO NOT

- Do not include any class other than warrior
- Do not include unreleased races
- Do not include levels above 3
- Do not pair L1 against monsters above L2
- Do not modify any code
- Do not delete previous sim runs
