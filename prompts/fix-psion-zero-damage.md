# Fix: Psion Zero-Damage Bug (4 Compounding Issues)

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

Read the full investigation report: `cat docs/investigations/psion-zero-damage-bug.md`

---

## CONTEXT

A batch combat sim of 382,200 fights revealed that L20 Psions deal **0 damage** every fight. Four bugs compound:

1. **`decideAction()` doesn't pass weapon in context for class abilities** → fallback-to-basic-attack never triggers
2. **8 Psion effect types are unimplemented** in `EFFECT_HANDLERS` → abilities always return `fallbackToAttack: true`
3. **Failed abilities don't get cooldowns set** → same broken ability retried every turn forever
4. **Combat logger has no `class_ability` handler** → encounter logs show empty "uses" entries

All four must be fixed. This isn't just a Psion bug — Fix 1, 3, and 4 protect ALL classes from future unimplemented-ability failures.

---

## THE FIXES

### Fix 1: Pass weapon in context for class abilities

**File:** `server/src/services/tick-combat-resolver.ts`

Find where `decideAction()` returns a `class_ability` action with `context: {}`. Change to include the combatant's weapon:

```diff
- context: {},
+ context: { weapon: params?.weapon ?? undefined },
```

Verify `params` is in scope at that point. If not, trace how the weapon gets to this function — it might be on the combatant object or in the params map. The goal: when `resolveTurn()` hits the fallback check at `combat-engine.ts:2376`, `context.weapon` is truthy.

**Do NOT modify `combat-engine.ts`.** The fallback logic there is correct — it just never receives a weapon.

### Fix 2: Set cooldown on failed abilities (prevent infinite no-op loops)

**File:** `server/src/lib/class-ability-resolver.ts`

Find the early return path when no handler is found for an effect type (around line 1787 per the investigation). Before returning `fallbackToAttack: true`, set a minimum cooldown on the ability so it's not retried next turn:

```typescript
// When no handler found for effect type, set a cooldown anyway
// to prevent infinite retries of the same unimplemented ability
if (actor.abilityCooldowns) {
  actor.abilityCooldowns.set(ability.id, ability.cooldown || 1);
}
```

Check the exact data structure for cooldowns on the combatant — it might be a Map, a plain object, or tracked differently. Match the pattern used when abilities succeed.

Also check: when `fallbackToAttack: true` is returned AND the fallback successfully executes (after Fix 1), does the cooldown get set? If not, set it there too.

### Fix 3: Implement the 8 missing Psion effect types

**File:** `server/src/lib/class-ability-resolver.ts`

Add handlers to `EFFECT_HANDLERS` for each missing type. Reference the existing handlers for patterns. Here's the design for each:

#### `teleport_attack` (Blink Strike — psi-nom-1, tier 1)
- Attack with bonus damage (treat as enhanced basic attack)
- Apply the ability's bonus damage on top of weapon damage
- Essentially: resolve as a damage ability with the weapon's base dice + ability bonus

#### `control` (Dominate — psi-tel-4, tier 4)
- Target makes a WIS save vs caster's INT-based save DC
- On fail: target is stunned for N rounds (use `statusEffect: 'stunned'` or `'charmed'` if it exists)
- On success: no effect
- Reference the `damage_status` handler for save mechanics

#### `aoe_damage_status` (Mind Shatter — psi-tel-5, tier 5; Rift Walk — psi-nom-5)
- Combine existing `aoe_damage` and `damage_status` logic
- Deal damage to target + apply a status effect
- For single-target combat (which is what PvE road encounters are), this is effectively `damage_status`

#### `reaction` (Precognitive Dodge — psi-see-3, tier 3)
- Grants a defensive buff: +AC bonus for N rounds
- Treat as a `buff` with AC modifier
- Reference the existing `buff` handler

#### `phase` (Dimensional Pocket — psi-nom-3, tier 3)
- Apply a defensive buff: damage reduction or temporary invulnerability
- Simplest implementation: grant high AC bonus for 1-2 rounds (simulates being phased out)
- Or apply a status effect that prevents damage

#### `swap` (Translocation — psi-nom-4, tier 4)
- In 1v1 PvE combat, position swapping is meaningless
- Implement as: deal damage + apply a debuff (disoriented → attack penalty)
- Use the ability's stated effects to determine damage/status

#### `echo` (Temporal Echo — psi-see-5, tier 5)
- Repeat the last successful action
- Complex to implement properly — simplest approach: deal damage equal to the ability's stated damage value
- If too complex, implement as a damage ability with the ability's bonus damage

#### `banish` (Banishment — psi-nom-6, tier 6)
- Target makes a save
- On fail: removed from combat for N rounds (stunned + untargetable)
- Simplest: apply `stunned` for the ability's stated duration
- On success: no effect

**IMPORTANT DESIGN PRINCIPLES:**
- Keep implementations simple and combat-engine compatible
- Use existing status effects (`stunned`, `poisoned`, `blessed`, etc.) rather than creating new ones
- Use existing handler patterns (save DC calculation, damage application, status application)
- Every handler must return a proper `ClassAbilityResult` that the combat logger can process
- Check what fields `ClassAbilityResult` has and populate them fully

**Before implementing**, read the existing handlers in `EFFECT_HANDLERS` thoroughly. Understand:
- How save DCs are calculated
- How damage is applied to targets
- How status effects are applied
- What the return type looks like
- How cooldowns are set after successful use

Then implement each handler following the same patterns.

### Fix 4: Add `class_ability` handler to combat logger

**File:** `server/src/lib/combat-logger.ts`

In `buildRoundsData()`, add a handler for `result.type === 'class_ability'` after the existing `psion_ability` handler. It should extract:

- `abilityName` from the result
- `abilityDescription` from the result
- `saveDC`, `saveRoll`, `saveTotal`, `saveSucceeded` if present
- `damage` → populate `damageRoll`
- `healing` → populate `healAmount`
- `statusApplied` → push to `statusEffectsApplied`
- `targetHpAfter`, `targetKilled`
- Update `hpTracker` for affected targets

Check the actual `ClassAbilityResult` type definition to see what fields are available. The handler should be similar to the `psion_ability` handler — copy that pattern and adjust field names.

---

## TESTING

### Unit Tests

1. **Existing tests still pass:** Run the full test suite — all 65/65 combat scenarios, all 29 narrator tests, everything. Zero regressions.

2. **New test: class ability fallback** — When an ability's effect type has no handler AND weapon is in context, the combatant falls back to a basic weapon attack and deals damage.

3. **New test: failed ability cooldown** — When an ability fails (no handler), it still gets a cooldown set, preventing infinite retries.

4. **New test: each new effect type handler** — For each of the 8 implemented handlers, create a minimal test that:
   - Creates a Psion combatant with the relevant ability
   - Resolves the ability against a target
   - Verifies the result has correct fields (damage, status, save if applicable)

5. **New test: combat logger class_ability** — Feed a mock `class_ability` TurnLogEntry through `buildRoundsData()` and verify the output has `abilityName`, damage data, and status effects.

### Integration Verification

After deploying, run a quick smoke sim:

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run --race human --class psion --level 20 --monster Lich --iterations 10
```

Then check the admin dashboard History tab for one of these fights:
- Psion should deal actual damage
- Ability names should appear in the combat log
- HP timeline should show the Lich taking damage
- Win rate won't be 0% anymore (though Lich is still tough)

Also verify other classes weren't broken:

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run --race human --class warrior --level 10 --monster "Orc Warrior" --iterations 10
```

---

## DEPLOYMENT

```bash
git add -A
git commit -m "fix: psion zero-damage bug — 4 compounding issues

- Fix 1: pass weapon in context for class abilities (tick-combat-resolver.ts)
  Enables fallback-to-basic-attack when ability resolution fails
- Fix 2: set cooldown on failed abilities (class-ability-resolver.ts)
  Prevents infinite retry of same unimplemented ability
- Fix 3: implement 8 missing Psion effect type handlers (class-ability-resolver.ts)
  teleport_attack, control, aoe_damage_status, reaction, echo, phase, swap, banish
- Fix 4: add class_ability handler to combat logger (combat-logger.ts)
  Encounter logs now show ability name, damage, status effects for class abilities"
git push origin main
```

Build and deploy with unique tag:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify `combat-engine.ts` — the fallback logic there is correct, it just needs the weapon passed in
- Do not create new status effect types — use existing ones (stunned, poisoned, blessed, burning, etc.)
- Do not change ability data in `shared/src/data/skills/psion.ts` — the definitions are fine, the handlers were missing
- Do not change any other class's ability data
- Do not run a full balance sim — just the quick smoke tests above
- Do not delete the existing sim run data

## SUMMARY FOR CHAT

When done, print:

```
Psion zero-damage bug fixed (4 issues):
1. Weapon now passed in context for class abilities → fallback attacks work
2. Failed abilities get cooldowns → no more infinite retry loops
3. 8 Psion effect types implemented: teleport_attack, control, aoe_damage_status, reaction, echo, phase, swap, banish
4. Combat logger handles class_ability results → encounter logs show ability data

Tests: [X/X passing, X new tests added]
Smoke test: L20 Psion vs Lich now deals damage, abilities visible in admin combat log
Deployed: tag [TAG]
```
