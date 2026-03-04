# Fix: Class Ability Combat Log Missing Roll Details

Read `cat CLAUDE.md` before starting.

---

## THE BUG

In the admin combat dashboard History tab, when a player uses a **class ability**, the combat log shows minimal info:

```
L3 Orcs Warrior uses Reckless Strike
Reckless Strike: 11 damage to Bog Wraith | self AC -2
Deals 11 damage
```

But when a **monster attacks** (basic attack), the log shows full detail:

```
Bog Wraith attacks L3 Orcs Warrior with Natural Attack
  ATTACK ROLL
    d20 = 6
    -2 STR
    +0 proficiency
    +4 weaponBonus
    = 8 vs AC 12 → MISS
  DAMAGE
    2d6 = [3, 4]
    +2 STR
    +3 weaponBonus
    = 12
  L3 Orcs Warrior: 29 → 17 HP
```

The class ability entries need the same level of roll detail: attack roll (d20 + modifiers vs AC), hit/miss, damage dice breakdown, target HP before/after.

## INVESTIGATION

### Step 1: Compare the data structures

Look at how the basic `attack` result stores roll data in `TurnLogEntry` (from `combat-engine.ts`). It likely has fields like:
- `attackRoll` with `raw`, `total`, `modifiers[]`
- `damageRoll` with `dice`, `rolls[]`, `total`, `modifiers[]`
- `hit`, `isCritical`, `targetAC`
- `targetHpBefore`, `targetHpAfter`

Then look at the `ClassAbilityResult` type (from `class-ability-resolver.ts`). What fields does it return? Does it include roll breakdowns, or just final totals?

### Step 2: Check the class ability resolver

When a damage-dealing class ability resolves (e.g., Reckless Strike with effect type `damage`), does the handler in `EFFECT_HANDLERS`:
- Make an attack roll? If so, does it store the raw d20, modifiers, total?
- Roll damage dice? Does it store the individual dice results?
- Record target AC, hit/miss?
- Record target HP before/after?

If the handler only stores the final damage number without the breakdown, the logger can't display details it doesn't have. In that case, the fix needs to happen in the resolver, not just the logger.

### Step 3: Check the logger's class_ability handler

Look at the `class_ability` case in `buildRoundsData()` in `combat-logger.ts` (the one we just added). Compare it to the `attack` case. The `attack` case probably builds a rich `attackRoll` and `damageRoll` object with dice, modifiers, etc. The `class_ability` case probably just copies the summary text.

### Step 4: Check the frontend renderer

Look at the component that renders combat log entries in the admin dashboard. It's likely in `client/src/components/admin/combat/` — probably `HistoryTab.tsx` or a sub-component. How does it render the `attack` type vs `class_ability` type? It might already have UI for roll breakdowns but only triggers it when the data fields are present.

## THE FIX

The fix likely spans two layers:

### Layer 1: Class ability resolver — store roll details

When damage-dealing class abilities resolve, they should store the same roll breakdown that basic attacks do:

```typescript
{
  attackRoll: { raw: d20Result, total: d20 + modifiers, modifiers: [...] },
  targetAC: target.ac,
  hit: total >= targetAC,
  isCritical: d20Result === 20,
  damageRoll: { dice: '1d6+5', rolls: [4], total: 9, modifiers: [...] },
  targetHpBefore: target.hp + damage,
  targetHpAfter: target.hp,
  targetKilled: target.hp <= 0
}
```

Not all class abilities involve attack rolls — buffs, heals, and CC abilities don't. The fix should add roll data only for abilities that deal damage or make attack rolls. Check each effect type handler:

- `damage` — YES, should have attack roll + damage roll
- `damage_status` — YES, attack roll + damage roll + save info
- `teleport_attack` — YES, attack roll + damage roll
- `aoe_damage` — damage roll (no attack roll if auto-hit)
- `aoe_damage_status` — damage roll + save info
- `heal` — heal amount (no attack roll)
- `buff` — no rolls needed
- `debuff` — save info
- `control` — save info (save DC, save roll, success/fail)
- `multi_attack` — multiple attack rolls + damage rolls
- `steal` — no attack roll, just amount
- All others — check individually

### Layer 2: Combat logger — pass roll data through

Update the `class_ability` handler in `buildRoundsData()` to extract and format the roll data into the same structure the frontend expects. Map the `ClassAbilityResult` fields to the same shape the `attack` handler produces.

### Layer 3: Frontend — verify rendering

The frontend should already render roll breakdowns when the data is present (it does for basic attacks). Verify the component checks for roll data fields and displays them. If the `class_ability` type is rendered by a different code path that doesn't show rolls, add the roll rendering there too.

---

### Layer 4: Show AC breakdown for both combatants

At the start of each round (or at least in the encounter header / round context), display both combatants' current AC with a breakdown of how it's calculated:

```
L3 Orcs Warrior — AC 12 (base 10 + 2 armor + 2 DEX - 2 Reckless Strike)
Bog Wraith — AC 8 (base 10 - 2 natural)
```

This requires:

1. **Track AC components on the combatant** — The combat engine already calculates effective AC, but does it store the breakdown? Check `CombatantState` (or equivalent) for how AC is tracked. It likely has a base AC and then status effects modify it. The breakdown should show:
   - Base AC (10 for unarmored, or equipment AC for armored characters)
   - Armor bonus (from equipment tier)
   - DEX modifier (if applicable based on armor type)
   - Shield bonus (if any)
   - Active buff/debuff modifiers (e.g., Reckless Strike -2, Fortify +5, Shield Wall, etc.)
   - Status effect modifiers (stunned, blessed, etc.)
   - The final effective AC

2. **Store AC breakdown in the round log data** — Each round entry should include both combatants' AC state. Add to the round log entry:
   ```typescript
   combatantAC: {
     [combatantId]: {
       effective: number,       // final AC used for hit checks
       components: {
         base: number,          // 10 or equipment base AC
         armor: number,         // armor bonus above base 10 (0 if unarmored)
         dexMod: number,        // DEX modifier contribution (0 for heavy armor)
         shield: number,        // shield bonus if any
         buffs: { name: string, modifier: number }[],   // active positive modifiers
         debuffs: { name: string, modifier: number }[],  // active negative modifiers
       }
     }
   }
   ```

3. **Logger passes AC data through** — `buildRoundsData()` should include the AC breakdown in each round entry.

4. **Frontend renders AC breakdown** — In each round header or as a tooltip/expandable section, show the AC formula for both combatants. When AC changes mid-combat (Reckless Strike debuff applies, Fortify buff expires), the breakdown should update to reflect the new state.

This is critical for balance verification — we need to see that:
- Reckless Strike's self AC -2 is actually being applied
- Fortify's +5 AC is showing up
- Status effects modifying AC are reflected
- Equipment AC tiers are correct for the level
- Monster AC matches their seed data

---

## TESTING

1. All existing tests pass (0 regressions)
2. Run a quick smoke sim after deploying:

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run --race orc --class warrior --level 3 --monster "Bog Wraith" --iterations 5
```

3. Check the admin dashboard History tab for one of these fights. The warrior's Reckless Strike entries should now show:
   - Attack roll with d20 + modifiers vs AC
   - Hit/miss result
   - Damage dice breakdown
   - Target HP change

4. Also verify a non-damage ability still looks right — find a fight where a buff or heal was used and confirm it doesn't show fake attack rolls.

---

## DEPLOYMENT

```bash
git add -A
git commit -m "fix: class ability combat logs now show full roll details + AC breakdown

- Class ability resolver now stores attack roll, damage dice, modifiers, AC comparison
- Combat logger class_ability handler passes roll breakdown data
- AC breakdown per combatant per round: base + armor + DEX + buffs/debuffs = effective
- Frontend renders class ability rolls with same detail as basic attacks
- Non-damage abilities (buffs, heals, CC) show appropriate detail without fake attack rolls"
git push origin main
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify the basic `attack` handler — it's working perfectly
- Do not change ability definitions or balance values
- Do not add roll data to buff/heal abilities that don't make attack rolls
- Do not delete any existing sim data
- Do not run a full balance sim — just the 5-fight smoke test

## SUMMARY FOR CHAT

When done, print:

```
Class ability combat log detail + AC breakdown fixed:
- Damage abilities now show: attack roll (d20 + modifiers vs AC), hit/miss, damage dice breakdown, target HP change
- Non-damage abilities show: save DC/roll for CC, heal amount for heals, buff details for buffs
- AC breakdown per combatant per round: base AC + armor + DEX + buffs/debuffs = effective AC
- AC updates visible when buffs/debuffs apply (e.g., Reckless Strike -2 AC reflected in breakdown)
- Frontend renders class ability rolls with same detail as basic attacks
Tests: [X/X passing]
Smoke verified: Reckless Strike shows full roll breakdown + AC debuff visible in admin History tab
Deployed: tag [TAG]
```
