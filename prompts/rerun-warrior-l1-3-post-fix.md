# Rerun Warrior L1-3 Sim (Post Attack Roll Fix)

Read `cat CLAUDE.md` before starting.

---

## TASK

Run the warrior L1-3 sim using the existing corrected config. This data will have full attack roll breakdowns for class abilities (the previous runs didn't).

### Step 1: Run

```bash
cd /d/realm_of_crowns
npx ts-node server/src/scripts/batch-combat-sim.ts run --config server/src/scripts/sim-configs/warrior-l1-3.json --notes "Warriors L1-3 × 7 released races × level-appropriate monsters @ 200 iterations — post attack-roll fix"
```

### Step 2: Report

Print:
- Run ID
- Total matchups and fights
- Confirm 0 errors and all 7 races ran
- Win rate by level (L1 / L2 / L3)
- Win rate by race (all 7)
- Win rate by monster
- Any matchups with notably different win rates from the previous run (could indicate the d20 roll vs auto-hit changes balance)

```
View in admin: Admin → Combat → Simulation → select this run
Delete later: npx ts-node server/src/scripts/batch-combat-sim.ts delete --run-id <ID>
```

---

## DO NOT

- Do not modify any code
- Do not delete previous sim runs (keep them for comparison)
