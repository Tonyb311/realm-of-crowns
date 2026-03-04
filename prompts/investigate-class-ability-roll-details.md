# Investigate: Class Ability Roll Details Not Showing in Combat Log

Read `cat CLAUDE.md` before starting.

---

## THE BUG

We just deployed changes to show full roll breakdowns for class abilities (attack roll, damage dice, modifiers, AC comparison) — matching the detail level of basic monster attacks. But the admin dashboard History tab still shows the old summary format for class abilities:

```
L3 Drakonid Warrior uses Reckless Strike
Reckless Strike: 14 damage to Mana Wisp | self AC -2
Deals 14 damage
```

Expected (matching the monster's basic attack detail):

```
L3 Drakonid Warrior uses Reckless Strike
  ATTACK ROLL
    d20 = 15
    +4 STR
    +2 proficiency
    +0 weaponBonus
    = 21 vs AC 8 → HIT
  DAMAGE
    1d6 = [4]
    +4 STR
    +5 bonusDamage
    = 14
  Mana Wisp: 16 → 2 HP
```

The monster's Natural Attack in the same fight shows full detail (d20 = 12, -4 STR, +0 proficiency, +3 weaponBonus, = 11 vs AC 12 → MISS). So the frontend CAN render roll breakdowns — it's just not getting the data for class abilities.

## INVESTIGATION STEPS

### Step 1: Check what data is actually in the DB

Query a recent post-deploy encounter log (from the smoke test run after the fix was deployed) and examine the raw `rounds` JSONB:

```bash
cd /d/realm_of_crowns
npx ts-node -e "
const { PrismaClient } = require('./database/prisma/generated/client');
const p = new PrismaClient();
p.combatEncounterLog.findFirst({
  where: { 
    characterName: { contains: 'Warrior' },
    createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
  },
  orderBy: { createdAt: 'desc' },
  select: { id: true, characterName: true, opponentName: true, rounds: true, createdAt: true }
}).then(r => { 
  const rounds = r?.rounds as any[];
  if (rounds) {
    rounds.forEach((round, i) => {
      console.log('--- Entry', i, '---');
      console.log(JSON.stringify(round, null, 2));
    });
  }
  p.\$disconnect(); 
});
"
```

For the round where the warrior uses Reckless Strike, check:
- Is there an `attackRoll` object with `raw`, `total`, `modifiers`?
- Is there a `damageRoll` object with `dice`, `rolls`, `modifiers`?
- Is there `targetAC`, `hit`, `isCritical`?
- Or is it just the old format: `{ action: 'class_ability', actor: '...', ... }` with no roll data?

If the roll data IS in the DB but not rendering → frontend bug.
If the roll data is NOT in the DB → logger or resolver bug.

### Step 2: Trace the class ability resolver output

Look at `handleDamage` in `server/src/lib/class-ability-resolver.ts`. After the recent changes, it should be storing roll data on the `ClassAbilityResult`. Check:

1. Does `handleDamage` actually get called for Reckless Strike? Reckless Strike's effect type is `damage` with `bonusDamage: 5, selfDefenseDebuff: -2`. Verify the `EFFECT_HANDLERS` map routes `'damage'` to the handler that stores roll details.

2. Does the handler set the new fields (`attackRoll`, `attackTotal`, `attackModifiers`, `targetAC`, `hit`, `weaponDice`, `damageRolls`, `damageModifiers`, `targetHpBefore`)? Print the return value.

3. Where does the `ClassAbilityResult` get attached to the `TurnLogEntry`? Follow the return path from the handler → `resolveClassAbility()` → back to `resolveTurn()` in `combat-engine.ts`. Is the full result preserved, or is it reduced/flattened somewhere?

### Step 3: Trace the combat logger

Look at `buildRoundsData()` in `server/src/lib/combat-logger.ts`:

1. Find the `class_ability` case. 
2. What fields does it read from the TurnLogEntry result?
3. Does it extract `attackRoll`, `damageRoll`, etc. and pass them into the round log entry?
4. Or does it still just build the summary string?
5. Compare the `attack` case (which works) to the `class_ability` case field by field.

### Step 4: Trace the frontend normalizer

Look at `HistoryTab.tsx`:

1. Find the normalizer function that processes round entries for display.
2. For entries with `action === 'class_ability'`, does it extract roll data into the same format the `attack` renderer expects?
3. Find where `RollBreakdown` and `DamageBreakdown` components are rendered — do they check for a specific data shape? 
4. Is there a type check or conditional that gates showing roll details (e.g., `if (entry.attackRoll)`) that might be failing because the field name doesn't match?

### Step 5: Find the break point

At this point you should know exactly where the chain breaks:
- Resolver stores roll data ✅/❌
- Result is preserved through to TurnLogEntry ✅/❌
- Logger writes roll data to rounds JSONB ✅/❌
- Frontend reads and renders roll data ✅/❌

## OUTPUT

Write findings to `D:\realm_of_crowns\docs\investigations\class-ability-roll-details-missing.md` with:

1. **Where the chain breaks** — which layer drops or fails to pass the roll data
2. **Raw evidence** — actual JSON from the DB showing what's stored vs what's expected
3. **Code paths** — the exact lines where data is lost or not read
4. **Recommended fix** — specific changes needed, with file and line references

Then print a brief summary to chat.

---

## DO NOT

- Do not fix the bug — investigation only
- Do not modify any code
- Do not run any new simulations
- Do not delete any simulation data
