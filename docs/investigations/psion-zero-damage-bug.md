# Investigation: Psion Dealing 0 Damage in Combat Sim

**Date:** 2026-03-03
**Sim Run:** `cmmal9e7l00007uzax90jtwka` (382,200 fights)
**Matchup:** L20 Psion vs Lich (all races)

---

## Root Cause

**Three compounding bugs** cause every L20 Psion to deal 0 damage:

### Bug #1: Missing `context.weapon` in `decideAction()` (CRITICAL — immediate cause)

**File:** `server/src/services/tick-combat-resolver.ts`, lines 161-170

When `decideAction()` selects a `class_ability` action, it returns `context: {}` — **no weapon is passed**:

```typescript
// Line 161-170 in tick-combat-resolver.ts
return {
  action: {
    type: 'class_ability',
    actorId,
    classAbilityId: entry.abilityId,
    targetId: target?.id,
    targetIds: enemies.map(e => e.id),
  },
  context: {},  // <-- NO WEAPON
};
```

The fallback-to-basic-attack check in `resolveTurn()` requires `context.weapon` to be truthy:

```typescript
// Line 2376 in combat-engine.ts
if (classAbility.result.fallbackToAttack && action.targetId && context.weapon) {
  // This NEVER executes because context.weapon is undefined
}
```

**Result:** Even when `resolveClassAbility` returns `fallbackToAttack: true`, the fallback never triggers. The Psion's turn resolves with an empty result — 0 damage.

### Bug #2: Unimplemented Psion effect types in `EFFECT_HANDLERS` (ROOT CAUSE)

**File:** `server/src/lib/class-ability-resolver.ts`, lines 1260-1290

The `EFFECT_HANDLERS` map is missing handlers for **8 effect types** used by Psion abilities:

| Missing Effect Type | Used By | Tier |
|---|---|---|
| `control` | Dominate (psi-tel-4), Absolute Dominion (psi-tel-6) | 4, 6 |
| `aoe_damage_status` | Mind Shatter (psi-tel-5), Rift Walk (psi-nom-5) | 5, 5 |
| `teleport_attack` | Blink Strike (psi-nom-1) | 1 |
| `reaction` | Precognitive Dodge (psi-see-3) | 3 |
| `echo` | Temporal Echo (psi-see-5) | 5 |
| `phase` | Dimensional Pocket (psi-nom-3) | 3 |
| `swap` | Translocation (psi-nom-4) | 4 |
| `banish` | Banishment (psi-nom-6) | 6 |

When `resolveClassAbility()` encounters an unknown effect type (line 1772-1787), it returns `fallbackToAttack: true`. But due to Bug #1, the fallback never executes.

### Bug #3: No cooldown set for failed abilities (AMPLIFIER)

**File:** `server/src/lib/class-ability-resolver.ts`, lines 1797-1828

Cooldowns are only set AFTER a handler successfully executes. When the handler is missing, the function returns early at line 1787 **without setting a cooldown**. This means:

1. Turn 1: `decideAction` picks Dominate (tier 4, `control`) — no cooldown
2. `resolveClassAbility` returns `fallbackToAttack: true` — no handler found
3. Fallback doesn't trigger (Bug #1) — 0 damage
4. No cooldown set — Dominate stays available
5. Turn 2: `decideAction` picks Dominate again (still no cooldown)
6. Repeat forever: every turn is a no-op

The Psion is trapped in an infinite loop of attempting the same unimplemented ability.

### Bug #4: Combat logger drops `class_ability` results (DISPLAY BUG)

**File:** `server/src/lib/combat-logger.ts`, lines 206-345

`buildRoundsData()` has handlers for: `attack`, `cast`, `flee`, `defend`, `item`, `racial_ability`, `psion_ability`

There is **no handler for `result.type === 'class_ability'`**. When a `class_ability` result flows through, all the if/else branches are skipped. The round entry is created with only basic metadata (round, actor, actorId, action, hpAfter) but no abilityName, damage, target info, etc.

This is why the encounter log shows:
```json
{
  "actor": "L20 Dwarves Psion",
  "round": 1,
  "action": "class_ability",
  "actorId": "bsim-c-x90jtwka-dwarf-psion-20",
  "hpAfter": { "Lich": 120, "L20 Dwarves Psion": 85 }
}
```
No abilityName, no damageRoll, no targetHpAfter — the round is essentially empty.

---

## Scope

### Psion-only at L20

Queried all fights where `opponent_end_hp = opponent_start_hp` (0 player damage dealt):

```sql
SELECT character_name, opponent_name, outcome, total_rounds, opponent_start_hp, opponent_end_hp
FROM combat_encounter_logs
WHERE simulation_run_id = 'cmmal9e7l00007uzax90jtwka'
AND opponent_end_hp = opponent_start_hp
LIMIT 30;
```

**All 30 results are exclusively "L20 [Race] Psion" vs Lich.** No other class appears.

### Why only Psion?

`buildAbilityQueue()` sorts abilities by **tier descending** (highest first). At L20, the Psion's highest-tier ability is Dominate (tier 4, `control`) or Translocation (tier 4, `swap`) — both unimplemented.

Other classes' top-tier abilities at L20 use effect types that ARE implemented:
- Warrior: `damage`, `buff`, `damage_status`
- Mage: `damage`, `aoe_damage`, `damage_status`
- Rogue: `damage`, `damage_status`, `steal`
- Cleric: `heal`, `buff`, `damage`
- Ranger: `damage`, `companion_attack`
- Bard: `buff`, `debuff`, `heal`

### Lower-level Psions may be partially affected

At levels below 18, Dominate/Translocation aren't available. The queue starts with tier 3 abilities:
- Psychic Crush (tier 3, `damage_status`) — **implemented** ✅
- Precognitive Dodge (tier 3, `reaction`) — **unimplemented** ❌
- Dimensional Pocket (tier 3, `phase`) — **unimplemented** ❌

Whether lower-level Psions are affected depends on which specialization's ability sorts first in `buildAbilityQueue`. If an implemented type (like `damage_status`) comes first, the Psion works. If not, same bug.

At L1, all three tier-1 abilities are:
- Mind Spike (`damage_status`) — ✅
- Foresight (`buff`) — ✅
- Blink Strike (`teleport_attack`) — ❌

Again depends on sort order.

---

## Which Layer Is Broken

| Layer | Status | Issue |
|---|---|---|
| Ability data (`shared/src/data/skills/psion.ts`) | OK | Abilities are well-defined with correct effect types |
| Ability queue builder (`combat-simulator.ts:buildAbilityQueue`) | OK | Correctly filters passives and sorts by tier |
| Decision engine (`tick-combat-resolver.ts:decideAction`) | **BUG** | Doesn't pass `weapon` in context for class abilities |
| Class ability resolver (`class-ability-resolver.ts`) | **BUG** | 8 Psion effect types have no handler |
| Combat engine (`combat-engine.ts:resolveTurn`) | **BUG** | Fallback check requires `context.weapon` which is never provided |
| Combat logger (`combat-logger.ts:buildRoundsData`) | **BUG** | No handler for `result.type === 'class_ability'` |

---

## Raw Evidence

### Encounter log (Round 1, Psion's turn)

```json
{
  "actor": "L20 Dwarves Psion",
  "round": 1,
  "action": "class_ability",
  "actorId": "bsim-c-x90jtwka-dwarf-psion-20",
  "hpAfter": {
    "Lich": 120,
    "L20 Dwarves Psion": 85
  },
  "statusEffectsApplied": [],
  "statusEffectsExpired": []
}
```

No `abilityName`, no `damageRoll`, no `targetHpAfter`, no `targetHpBefore`. Empty round.

### Lich's turn (same fight, for comparison)

```json
{
  "hit": true,
  "actor": "Lich",
  "round": 1,
  "action": "attack",
  "actorId": "sim-monster-0",
  "hpAfter": { "Lich": 120, "L20 Dwarves Psion": 85 },
  "targetAC": 10,
  "attackRoll": { "raw": 15, "total": 24, "modifiers": [...] },
  "damageRoll": { "dice": "2d8+5", "rolls": [8, 1], "total": 14, "modifiers": [...] },
  "isCritical": false,
  "weaponName": "Natural Attack",
  "targetKilled": false,
  "targetHpAfter": 85,
  "targetHpBefore": 99
}
```

Fully populated, normal combat data.

### Ability queue at L20 (reconstructed)

All Psion abilities with `levelRequired <= 20`, filtered for non-passive, sorted by tier DESC:

| Priority | Ability | Tier | Effect Type | Implemented? |
|---|---|---|---|---|
| 0 | Dominate (psi-tel-4) | 4 | `control` | NO |
| 1 | Translocation (psi-nom-4) | 4 | `swap` | NO |
| 2 | Psychic Crush (psi-tel-3) | 3 | `damage_status` | YES |
| 3 | Precognitive Dodge (psi-see-3) | 3 | `reaction` | NO |
| 4 | Dimensional Pocket (psi-nom-3) | 3 | `phase` | NO |
| 5 | Mind Spike (psi-tel-1) | 1 | `damage_status` | YES |
| 6 | Foresight (psi-see-1) | 1 | `buff` | YES |
| 7 | Blink Strike (psi-nom-1) | 1 | `teleport_attack` | NO |

Position 0 (Dominate) is always tried first, always fails, never gets cooldown → positions 2+ never get a chance.

---

## Recommended Fix

### Fix 1 (IMMEDIATE — unblocks Psion combat): Pass weapon in context for class abilities

**File:** `server/src/services/tick-combat-resolver.ts`, line 169

```diff
- context: {},
+ context: { weapon: params.weapon ?? undefined },
```

This ensures the fallback-to-basic-attack works when abilities are unimplemented. The Psion will at least do staff damage.

### Fix 2 (IMMEDIATE — logging): Add `class_ability` handler to `buildRoundsData`

**File:** `server/src/lib/combat-logger.ts`, after line 345

Add an `else if (result.type === 'class_ability')` branch that extracts abilityName, damage, target info, status effects from the `ClassAbilityResult` type — similar to the existing `racial_ability` handler.

### Fix 3 (PROPER — implement missing effect types):

**File:** `server/src/lib/class-ability-resolver.ts`

Add handlers for the 8 missing effect types to `EFFECT_HANDLERS`:
- `control` — dominate/charm logic
- `aoe_damage_status` — AoE damage + status application (similar to existing `aoe_damage` + `damage_status`)
- `teleport_attack` — attack with bonus (can be simplified to damage + attack bonus)
- `reaction` — negate one incoming attack (counter-like)
- `echo` — repeat last action
- `phase` — untargetable for N rounds
- `swap` — position swap + enemy debuff
- `banish` — remove from combat temporarily

### Fix 4 (DEFENSIVE — prevent infinite no-op loops):

When `resolveClassAbility` returns `fallbackToAttack: true`, set a 1-round cooldown on the failed ability anyway. This prevents the same unimplemented ability from being retried every turn and allows the queue to try the next ability.

---

## Priority

| Fix | Impact | Effort |
|---|---|---|
| Fix 1 (weapon context) | Psion deals staff damage immediately | 1 line change |
| Fix 2 (logger) | Encounter logs show class ability data | ~30 lines |
| Fix 3 (effect handlers) | Psion abilities work as designed | ~200-400 lines |
| Fix 4 (cooldown safety) | Prevents future infinite no-op loops | ~5 lines |

Fixes 1 and 4 should be applied together as an immediate patch. Fix 2 is independent. Fix 3 is the proper long-term solution.
