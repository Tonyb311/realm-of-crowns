# Phase 7: Handler Audit — 5 Untested Handlers

**Generated:** 2026-03-01
**Source files:** `combat-engine.ts`, `class-ability-resolver.ts`, `class-abilities.ts`, `combat.ts`

---

## Handler Group 1: Psion Handlers (HIGH RISK)

### 1. `echo` — Temporal Echo (`psi-see-5`)

**Implementation status: FULL**

#### Code Block (combat-engine.ts ~L1689-1725)
```typescript
case 'psi-see-5': { // Temporal Echo - repeat last action
  if (!updatedActor.lastAction) {
    return {
      state: current,
      result: {
        type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
        saveRequired: false, echoAction: false,
        description: 'No previous action to echo.',
      },
    };
  }
  const lastAction = updatedActor.lastAction;
  if (lastAction.type === 'psion_ability' && lastAction.psionAbilityId) {
    const echo = resolvePsionAbility(current, actorId, lastAction.psionAbilityId, lastAction.targetId);
    return {
      state: echo.state,
      result: {
        ...echo.result,
        abilityName: `Temporal Echo: ${echo.result.abilityName}`,
        echoAction: true,
      },
    };
  }
  // Non-psion last actions: mark as echoed but don't re-execute
  return {
    state: current,
    result: {
      type: 'psion_ability', actorId, abilityName: abilityDef.name, abilityId,
      saveRequired: false, echoAction: true,
      description: `Temporal Echo repeats ${updatedActor.name}'s last action.`,
    },
  };
}
```

#### lastAction Tracking (combat-engine.ts ~L2327-2333)
```typescript
current = {
  ...current,
  combatants: current.combatants.map((c) =>
    c.id === actorId ? { ...c, lastAction: action } : c
  ),
};
```

#### Fields Involved
| Field | Interface | Purpose |
|-------|-----------|---------|
| `lastAction` | `Combatant` | `CombatAction \| null` — stores previous turn's action |
| `echoAction` | `PsionAbilityResult` | Boolean flag marking result as echoed |

#### Key Findings
- **No previous action guard:** Returns no-op with description "No previous action to echo" — safe
- **Recursive resolution:** Calls `resolvePsionAbility()` recursively for psion abilities — correctly replays full ability (effects, damage, saves)
- **Non-psion actions:** If lastAction was attack/cast/flee, it logs a description but does NOT re-execute. **GAP:** Non-psion echo is effectively a no-op
- **`freeAction: true` in ability data:** The handler does NOT implement freeAction — echo consumes the turn like any other ability. The `freeAction` field in the ability definition is UNUSED
- **Infinite recursion risk:** If echo replays echo (psi-see-5 → psi-see-5), it would recurse. Mitigated by lastAction being set BEFORE resolution, so the echoed echo would replay the pre-echo action. Safe but untested.

---

### 2. `swap` — Translocation (`psi-nom-4`)

**Implementation status: FULL**

#### Code Block (combat-engine.ts ~L1818-1879)
```typescript
case 'psi-nom-4': { // Translocation
  const target = current.combatants.find((c) => c.id === targetId)!;
  let updatedTarget = target;

  if (target.team !== updatedActor.team) {
    // Enemy: INT save or stunned 1 round
    const targetSaveMod = getModifier(target.stats.int) + target.proficiencyBonus;
    let totalSaveMod = targetSaveMod;
    for (const eff of target.statusEffects) {
      const def = STATUS_EFFECT_DEFS[eff.name];
      if (def) totalSaveMod += def.saveModifier;
    }
    const save = savingThrow(totalSaveMod, saveDC);
    if (!save.success) {
      updatedTarget = applyStatusEffect(updatedTarget, 'stunned', 1, actorId);
    }
    // ... update state + return result ...
  } else {
    // Ally: both get shielded (+4 AC) for 1 round
    updatedTarget = applyStatusEffect(updatedTarget, 'shielded', 1, actorId);
    updatedActor = applyStatusEffect(updatedActor, 'shielded', 1, actorId);
    // ... update state + return result ...
  }
}
```

#### Fields Involved
| Field | Interface | Purpose |
|-------|-----------|---------|
| `team` | `Combatant` | Enemy vs ally detection |
| `statusEffects` | `Combatant` | Applies `stunned` (enemy) or `shielded` (ally) |

#### Key Findings
- **Enemy vs ally:** Uses `target.team !== updatedActor.team` — correct
- **Enemy effect:** Applies `stunned` status (1 round). `stunned.preventsAction = true` forces defend next turn. Matches `lose_action` intent.
- **Ally effect:** Applies `shielded` status to BOTH caster and ally. `shielded.acModifier = 4`, giving +4 AC.
- **Data mismatch:** Ability data says `allyEffect: { acBonus: 2 }` but code applies `shielded` (+4 AC). **Code gives +4 AC, data says +2 AC.** The shielded status definition controls the value, not the ability data.
- **Self-target:** If `targetId === actorId`, both branches are the same entity. Ally branch fires (same team), applies shielded to self twice. No crash but double-application is redundant.
- **1v1 (no allies):** Works fine — targets enemy, applies stunned.

---

### 3. `banish` — Banishment (`psi-nom-6`)

**Implementation status: FULL**

#### Cast Block (combat-engine.ts ~L1924-1974)
```typescript
case 'psi-nom-6': { // Banishment
  const target = current.combatants.find((c) => c.id === targetId)!;
  const targetSaveMod = getModifier(target.stats.int) + target.proficiencyBonus - 2;
  // ... status effect save modifier loop ...
  const save = savingThrow(totalSaveMod, saveDC);

  if (save.success) {
    // 2d6 psychic + slowed 1 round
    const rawDmg = damageRoll(2, 6);
    const applied = applyPsychicDamage(updatedTarget, rawDmg.total);
    totalDamage = applied.damage;
    updatedTarget = applied.target;
    updatedTarget = applyStatusEffect(updatedTarget, 'slowed', 1, actorId);
  } else {
    // Banished for 3 rounds
    updatedTarget = {
      ...updatedTarget,
      banishedUntilRound: current.round + 3,
    };
    updatedTarget = applyStatusEffect(updatedTarget, 'banished', 3, actorId);
  }
  // ... update state + return result ...
}
```

#### Return Logic (combat-engine.ts ~L2463-2477)
```typescript
if (combatant.banishedUntilRound != null && combatant.banishedUntilRound <= round) {
  // Return: 4d6 psychic + stunned 1 round
  const returnDmg = damageRoll(4, 6);
  const applied = applyPsychicDamage(combatant, returnDmg.total);
  let returned = applied.target;
  returned = applyStatusEffect(returned, 'stunned', 1, 'banishment');
  returned = {
    ...returned,
    banishedUntilRound: null,
    statusEffects: returned.statusEffects.filter((e) => e.name !== 'banished'),
  };
  combatants = combatants.map((c) => (c.id === combatant.id ? returned : c));
  continue; // Skip their turn
}

// Skip banished combatants
if (combatant.banishedUntilRound != null && combatant.banishedUntilRound > round) {
  continue;
}
```

#### Fields Involved
| Field | Interface | Purpose |
|-------|-----------|---------|
| `banishedUntilRound` | `Combatant` | `number \| null` — round when target returns |
| `statusEffects` | `Combatant` | `banished` status (preventsAction, acMod: 0) |

#### Key Findings
- **Banished state:** Dual-tracked — `banishedUntilRound` field + `banished` status effect. Both checked independently.
- **Turn skipping:** Turn order loop checks `banishedUntilRound > round` and `continue`s, skipping the combatant entirely. Correct.
- **Return mechanics:** 4d6 psychic damage (respects `psychicResistance`) + stunned 1 round. Removes `banished` status. Skips the return turn via `continue`.
- **`noDuplicateBanish`:** Defined in ability data (`noDuplicateBanish: true`) but **NOT checked in the handler**. Re-banishing is possible — latest `banishedUntilRound` overwrites. Could extend or shorten banish duration.
- **Banisher dies:** Target remains banished until `banishedUntilRound` expires. No early-return logic.
- **All others die while target banished:** Target returns normally at round expiry. Combat ends when the returned target is the only one alive (or dies from return damage).
- **DoTs/buffs while banished:** `banished.preventsAction = true` but status effects still tick (round-based). DoTs and HoTs continue applying during banishment. **Design question:** Should DoTs pause while banished?

---

## Handler Group 2: Non-Psion Handlers (LOWER RISK)

### 4. `flee` — Disengage (`rog-thi-4`)

**Implementation status: PARTIAL**

#### Code Block (class-ability-resolver.ts ~L566-586)
```typescript
const handleFleeAbility: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  const successChance = (effects.successChance as number) ?? 0.9;
  const roll100 = roll(100);
  const success = roll100 <= successChance * 100;

  if (success) {
    state = updateCombatant(state, actor.id, { hasFled: true });
  }

  return {
    state,
    result: {
      fleeAttempt: true,
      fleeSuccess: success,
      description: `${abilityDef.name}: ${success ? 'escaped!' : 'failed to escape'} (${roll100}% vs ${successChance}%)`,
    },
  };
};
```

#### Fields Involved
| Field | Interface | Purpose |
|-------|-----------|---------|
| `hasFled` | `Combatant` | Boolean — fled combatant excluded from targeting |

#### Key Findings
- **Success evaluation:** `roll(100)` percentile roll, success if ≤ `successChance * 100`. For Disengage (0.9): 90% chance.
- **On success:** Sets `hasFled: true`. `getEnemies()` filters `!c.hasFled`, so fled combatant is no longer targeted. Combat engine marks fled combatants as `isAlive: false`.
- **On failure:** No state change — turn ends, combatant remains in combat.
- **Taunt interaction: BUG** — Handler does NOT check for `taunt` status. A taunted combatant can use Disengage to flee. Should be blocked.
- **`freeDisengage` interaction:** None. `freeDisengage` is a passive flag for opportunity attacks (not implemented). No connection to the flee handler.
- **Determinism:** Uses `roll(100)` which respects the seeded PRNG (`mulberry32`), so results are reproducible with same seed.

---

### 5. `aoe_debuff` — Smoke Bomb (`rog-thi-2`)

**Implementation status: FULL (with data mismatch)**

#### Code Block (class-ability-resolver.ts ~L588-607)
```typescript
const handleAoeDebuff: EffectHandler = (state, actor, _target, enemies, abilityDef, effects) => {
  const accuracyReduction = (effects.accuracyReduction as number) ?? 5;
  const duration = (effects.duration as number) ?? 2;

  let affected = 0;
  for (const enemy of enemies) {
    state = applyStatusEffectToState(state, enemy.id, 'blinded', duration, actor.id);
    affected++;
  }

  return {
    state,
    result: {
      targetIds: enemies.map(e => e.id),
      debuffApplied: `accuracy -${accuracyReduction}`,
      debuffDuration: duration,
      description: `${abilityDef.name}: -${accuracyReduction} accuracy on ${affected} enemies for ${duration} rounds`,
    },
  };
};
```

#### `blinded` Status Definition (combat-engine.ts)
```typescript
blinded: {
  preventsAction: false,
  dotDamage: () => 0,
  hotHealing: () => 0,
  attackModifier: -5,
  acModifier: 0,
  saveModifier: -2,
}
```

#### Fields Involved
| Field | Interface | Purpose |
|-------|-----------|---------|
| `statusEffects` | `Combatant` | `blinded` applied to all enemies |
| `team` | `Combatant` | `getEnemies()` uses team comparison |

#### Key Findings
- **Enemy targeting:** Uses `getEnemies(state, actor)` which filters by `c.team !== actor.team && c.isAlive && !c.hasFled`. Correct.
- **Debuff mechanism:** Applies `blinded` status effect (NOT an ActiveBuff). `blinded.attackModifier = -5` matches the ability data's `accuracyReduction: -5`.
- **Data mismatch (cosmetic):** The `accuracyReduction` value from ability data is only used in the description string, not the actual debuff. The -5 attack penalty comes from the `blinded` status definition. If `accuracyReduction` changes in ability data, the description updates but the actual effect stays at -5.
- **Debuff immunity:** No `ccImmune` check. `blinded` is a debuff, not CC, so this may be intentional.
- **`immuneBlinded` check:** The handler does NOT check `target.immuneBlinded` (Psion Third Eye passive). This is a **real bug** — Third Eye psions should be immune to Smoke Bomb.
- **Duration:** Uses `effects.duration` (2 rounds) passed to `applyStatusEffectToState`. Duration ticks down normally in combat engine.
- **Cleansable:** Yes — `blinded` is a standard status effect, removable by `cleanse` handler (Purify).

---

## Section 2: Ability Data Cross-Reference

| Ability ID | Unused/Ignored Data Fields | Notes |
|-----------|---------------------------|-------|
| `psi-see-5` | `freeAction: true`, `repeatLastAction: true` | **`freeAction` NOT consumed by handler** — echo uses a normal turn. `repeatLastAction` is implicit in the handler logic (not read). |
| `psi-nom-4` | `allyEffect: { acBonus: 2, duration: 1 }`, `enemyEffect: 'lose_action'` | Handler hard-codes `shielded` (+4 AC) and `stunned` (1 round) instead of reading these fields. **acBonus mismatch: data=2, code=4.** |
| `psi-nom-6` | `noDuplicateBanish: true`, `returnDamage`, `returnEffect`, `returnDuration`, `failDamage`, `failEffect`, `failDuration` | Handler **hard-codes** all damage dice and effects instead of reading from data. `noDuplicateBanish` is completely ignored. |
| `rog-thi-4` | None | All fields consumed correctly. |
| `rog-thi-2` | `accuracyReduction: -5` | Used only in description text. Actual penalty comes from `blinded` status definition (`attackModifier: -5`). If data value changes, effect doesn't change. |

---

## Section 3: Missing Infrastructure

| Handler | Missing Combatant Fields | Missing CombatState Fields | Missing ActiveBuff Fields | Missing Status Effects | Other Gaps |
|---------|------------------------|--------------------------|--------------------------|----------------------|------------|
| `echo` | None | None | None | None | Non-psion echo is a no-op (attack/cast/flee not re-executed) |
| `swap` | None | None | None | None | acBonus data vs code mismatch (+2 vs +4) |
| `banish` | None | None | None | None | `noDuplicateBanish` not enforced |
| `flee` | None | None | None | None | No taunt check before flee |
| `aoe_debuff` | None | None | None | None | No `immuneBlinded` check |

**No new fields needed.** All infrastructure exists. Issues are logic gaps, not missing types.

---

## Section 4: Scenario Design Constraints

| Handler | Required Combatant Setup | Required State Setup | Min Combatants | Deterministic Notes |
|---------|------------------------|---------------------|----------------|---------------------|
| `echo` | L28+ Psion/Seer with `psi-see-5` unlocked + at least one other psion ability | Must take an action BEFORE using echo (round 2+) | 2 (1v1) | Uses PRNG for replayed ability's saves/damage. Seed controls outcomes. |
| `swap` | L18+ Psion/Nomad with `psi-nom-4` unlocked | (a) Enemy target for stun test, (b) Ally target for AC test — needs 2v1 or 3v1 | 3 (2v1) for ally test | INT save uses PRNG — seed controls success/fail. |
| `banish` | L40 Psion/Nomad with `psi-nom-6` unlocked | Combat must run 4+ rounds to see return. Target needs enough HP to survive 4d6 return damage. | 2 (1v1) | INT save (-2 penalty) + 2d6/4d6 damage use PRNG. |
| `flee` | L22+ Rogue/Thief with `rog-thi-4` unlocked | Combatant must have HP to survive until flee turn | 2 (1v1) | `roll(100)` percentile — 90% success. Seeds that roll >90 show failure. |
| `aoe_debuff` | L14+ Rogue/Thief with `rog-thi-2` unlocked | Multiple enemies to show AoE spread | 3+ (1v2) | No random in debuff application (auto-applies). Only combat rolls use PRNG. |

---

## Section 5: Bug Risk Assessment

| Handler | Risk Level | Primary Risk | Worst Case Failure Mode |
|---------|-----------|--------------|------------------------|
| `echo` | **MEDIUM** | Non-psion echo is a no-op — player uses ability, nothing happens | Wasted turn, no combat impact. `freeAction` not honored = tempo loss. |
| `swap` | **LOW** | acBonus mismatch (+4 instead of +2) — ally version is too strong | Balance issue only. No crash risk. |
| `banish` | **MEDIUM** | No `noDuplicateBanish` guard — re-banishing extends void duration | Target stuck in void indefinitely if repeatedly banished. Return damage stacks on each re-entry. |
| `flee` | **HIGH** | Taunted combatant can flee — bypasses taunt mechanic entirely | Breaks tank/taunt strategy. Player can always escape even when taunted. |
| `aoe_debuff` | **MEDIUM** | No `immuneBlinded` check — Third Eye psions get blinded despite immunity | Psion passive rendered useless against Smoke Bomb. |

---

## Section 6: Recommended Scenarios

### S59: `echo-replay` — Temporal Echo psion ability replay
- L28 Psion/Seer vs Training Dummy
- Queue: psi-see-1 (Foresight) → psi-tel-1 (Mind Blast, damage) → psi-see-5 (Temporal Echo)
- Assertions: Echo re-executes Mind Blast with new damage roll, description shows "Temporal Echo: Mind Blast"

### S60: `echo-no-previous` — Temporal Echo with no prior action
- L28 Psion/Seer vs Training Dummy
- Queue: psi-see-5 first (no previous action)
- Assertions: Returns no-op description, no crash

### S61: `swap-enemy-stun` — Translocation vs enemy
- L18 Psion/Nomad vs L18 Orc
- Queue: psi-nom-4 (target enemy)
- Assertions: INT save rolled, on fail target stunned 1 round (skips next turn)

### S62: `swap-ally-shield` — Translocation with ally
- 2v1: L18 Psion/Nomad + L18 Warrior vs L20 Orc
- Queue: psi-nom-4 (target ally warrior)
- Assertions: Both caster and ally get shielded (+4 AC) for 1 round

### S63: `banish-full-cycle` — Banishment cast + return
- L40 Psion/Nomad vs L35 Orc (high HP to survive return damage)
- Queue: psi-nom-6 (round 1), then basic attacks
- Assertions: Target banished 3 rounds, skipped in turn order, returns with 4d6 damage + stunned

### S64: `flee-disengage` — Thief Disengage flee
- L22 Rogue/Thief vs L20 Orc
- Queue: rog-thi-4 Disengage
- Assertions: 90% success roll, on success `hasFled: true`, combatant excluded from further targeting

### S65: `smoke-bomb-aoe` — Smoke Bomb AoE debuff
- 1v2: L14 Rogue/Thief vs 2x L14 Orcs
- Queue: rog-thi-2 Smoke Bomb
- Assertions: Both enemies get `blinded` status for 2 rounds, -5 attack modifier

---

## SUMMARY

```
Handlers audited: 5
Implementation status: 4 FULL, 1 PARTIAL (flee)
Combatant interface additions needed: 0 fields
CombatState additions needed: 0 fields
ActiveBuff additions needed: 0 fields

Bugs found: 3
  1. flee: No taunt check (HIGH risk)
  2. aoe_debuff: No immuneBlinded check (MEDIUM risk)
  3. banish: noDuplicateBanish not enforced (MEDIUM risk)

Data mismatches: 3
  1. echo: freeAction field unused (echo consumes turn)
  2. swap: allyEffect.acBonus=2 in data, shielded gives +4 AC in code
  3. banish: All damage/effect values hard-coded, ability data fields ignored

Scenarios needed: 7 (S59-S65)
Critical risks: None (no crash/infinite loop risks)
Implementation estimate: ~25 lines for bug fixes, 0 for infrastructure
```
