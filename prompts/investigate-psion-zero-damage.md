# Investigate: Psion Dealing 0 Damage in Combat Sim

Read `cat CLAUDE.md` before starting.

---

## THE BUG

In the batch combat sim (run ID: `cmmal9e7l00007uzax90jtwka`), a L20 Drakonid Psion vs Lich fight shows:

- **0 damage dealt** over 8 rounds
- Lich stayed at 120/120 HP the entire fight
- Every Psion turn in the combat log shows "L20 Drakonid Psion uses" with NOTHING after it — no ability name, no attack roll, no damage
- The Lich attacks normally every round (attack rolls, damage, HP changes all visible)
- The Psion just stands there getting hit until dead

This means either:
1. The Psion's turn action is silently failing (ability or attack resolves but produces no result)
2. The tick combat resolver is choosing an action that the combat engine can't execute
3. The combat engine processes the Psion's action but the TurnLogEntry has no meaningful result data
4. The combat logger is dropping/not recording the Psion's action result

## INVESTIGATION STEPS

### Step 1: Check the raw encounter log data

Query the database for a Psion vs Lich encounter from this sim run and examine the raw `rounds` JSONB:

```bash
npx ts-node -e "
const { PrismaClient } = require('./database/prisma/generated/client');
const p = new PrismaClient();
p.combatEncounterLog.findFirst({
  where: {
    simulationRunId: 'cmmal9e7l00007uzax90jtwka',
    characterName: { contains: 'Psion' },
    opponentName: 'Lich'
  },
  select: { id: true, characterName: true, opponentName: true, outcome: true, totalRounds: true, rounds: true, characterStartHp: true, characterEndHp: true, opponentStartHp: true, opponentEndHp: true }
}).then(r => { console.log(JSON.stringify(r, null, 2)); p.\$disconnect(); });
"
```

Look at the `rounds` array. For each round where the Psion acts:
- Is there a round entry at all?
- What is the `action` field? (attack? class_ability? psion_ability?)
- Does the `result` field have data or is it empty/null?
- Is the `actorId` correct?

### Step 2: Check ALL classes, not just Psion

This might not be Psion-specific. Query a few different class matchups to see if any other class shows 0 damage:

```bash
npx ts-node -e "
const { PrismaClient } = require('./database/prisma/generated/client');
const p = new PrismaClient();
p.combatEncounterLog.findMany({
  where: {
    simulationRunId: 'cmmal9e7l00007uzax90jtwka',
    opponentEndHp: { equals: p.combatEncounterLog.fields.opponentStartHp }  
  },
  select: { characterName: true, opponentName: true, outcome: true, totalRounds: true, opponentStartHp: true, opponentEndHp: true },
  take: 20
}).then(r => { console.log(JSON.stringify(r, null, 2)); p.\$disconnect(); });
"
```

If the Prisma query syntax doesn't support field comparison, try:

```sql
SELECT character_name, opponent_name, outcome, total_rounds, opponent_start_hp, opponent_end_hp 
FROM combat_encounter_logs 
WHERE simulation_run_id = 'cmmal9e7l00007uzax90jtwka' 
AND opponent_end_hp = opponent_start_hp 
LIMIT 20;
```

This finds all fights where the player dealt exactly 0 damage. If it's only Psion, the bug is Psion-specific. If multiple classes show up, it's a broader issue.

### Step 3: Trace the tick combat resolver decision path

Open `server/src/services/tick-combat-resolver.ts` and trace what happens when a Psion takes a turn:

1. What action does `chooseAction()` (or equivalent) select for the Psion?
2. Does the ability queue contain Psion abilities? (Check `buildAbilityQueue` in `combat-simulator.ts` for class `psion`)
3. If a `psion_ability` action is chosen, does `combat-engine.ts` handle it? Look at the `resolveTurn()` function — does it have a case for `psion_ability`?
4. If abilities fail/are skipped, does it fall back to a basic attack? 
5. For basic attacks — the Psion weapon is "Adamantine Staff" with `attackModifierStat: 'int'`. Does the combat engine support `int` as an attack modifier stat, or does it only handle `str`/`dex`?

### Step 4: Check the Psion ability data

Look at `shared/src/data/skills/psion.ts`:
- What abilities are available at L20?
- Do they have `levelRequired <= 20`?
- Are any of them marked as passive (`effects.type === 'passive'`)? The ability queue builder filters those out.
- After filtering passives, are there any active abilities left?

### Step 5: Run a single Psion fight with debug logging

Write a small test script that runs ONE fight between a L20 Psion and a Lich, logging every turn:

```typescript
// Create the combatants
// Before each turn resolution, log: actorId, chosen action, action type
// After each turn resolution, log: the full TurnLogEntry
// Check if the Psion's turns produce results with actual damage/effects
```

This will show exactly what's happening on each Psion turn.

### Step 6: Check the combat logger specifically

Even if the combat engine IS resolving Psion turns correctly, the logger might be dropping the data. Look at `buildRoundsData()` in `combat-logger.ts`:
- Does it handle `result.type === 'psion_ability'`? (Yes, I know it has a psion_ability case)
- Does it handle `result.type === 'class_ability'`?
- Does it handle the fallback basic attack for staff weapons?

The key question: **what type is the Psion's TurnLogEntry.result?** If it's a type that `buildRoundsData` doesn't handle, the round entry would be created with empty fields — which matches the "uses [nothing]" display.

## OUTPUT

Write your findings to `D:\realm_of_crowns\docs\investigations\psion-zero-damage-bug.md` with:

1. **Root cause** — exactly why the Psion deals 0 damage
2. **Scope** — is this Psion-only or does it affect other classes?
3. **Which layer is broken** — combat engine? tick resolver? ability queue? logger? frontend display?
4. **Raw evidence** — the actual JSON from the encounter log, the relevant code paths
5. **Recommended fix** — what needs to change and where

Then print a brief summary to chat.

---

## DO NOT

- Do not fix the bug — investigation only
- Do not modify any game code
- Do not run any new simulations
- Do not delete any simulation data
