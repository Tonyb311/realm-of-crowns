# Phase 2: AoE, Multi-Hit, Delayed Damage & Dispel Effect Handlers

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

Also read the Phase 2 audit for full context:
```bash
cat server/src/scripts/combat-sim-results/phase2-abilities-audit.md
```

---

## The Problem

Phase 1 delivered the class ability resolver framework with 13 effect handlers covering ~60 abilities. Phase 2 adds **7 new handlers covering 16 abilities** — the multi-target, multi-hit, and complex damage patterns.

These abilities currently hit the fallback path (log warning → basic attack). After Phase 2, only 10 abilities remain unimplemented (Phase 3: counter, trap, summon, companion_attack, steal, damage_steal, special).

---

## Phase 2 Effect Types & Their Abilities

### 1. `aoe_damage` — 7 abilities (highest priority)

| ID | Name | Class/Spec | Effects JSON |
|----|------|-----------|-------------|
| `war-ber-3` | Cleave | Warrior/Berserker | `{ type: "aoe_damage", targets: "all_adjacent", damageMultiplier: 0.8 }` |
| `mag-ele-1` | Fireball | Mage/Elementalist | `{ type: "aoe_damage", element: "fire", diceCount: 3, diceSides: 6 }` |
| `mag-ele-5` | Meteor Strike | Mage/Elementalist | `{ type: "aoe_damage", element: "fire", diceCount: 6, diceSides: 8 }` |
| `mag-nec-3` | Corpse Explosion | Mage/Necromancer | `{ type: "aoe_damage", requiresCorpse: true, diceCount: 4, diceSides: 6 }` |
| `cle-pal-5` | Divine Wrath | Cleric/Paladin | `{ type: "aoe_damage", element: "radiant", diceCount: 5, diceSides: 8 }` |
| `ran-sha-5` | Rain of Arrows | Ranger/Sharpshooter | `{ type: "aoe_damage", hitsPerTarget: 2, diceCount: 2, diceSides: 8 }` |
| `bar-bat-6` | Epic Finale | Bard/Battlechanter | `{ type: "aoe_damage", element: "sonic", baseDice: 4, diceSides: 8, bonusPerRound: 5 }` |

### 2. `multi_target` — 2 abilities

| ID | Name | Class/Spec | Effects JSON |
|----|------|-----------|-------------|
| `mag-ele-3` | Chain Lightning | Mage/Elementalist | `{ type: "multi_target", element: "lightning", targets: 3, diceCount: 2, diceSides: 6 }` |
| `ran-sha-2` | Multi-Shot | Ranger/Sharpshooter | `{ type: "multi_target", targets: 3, diceCount: 1, diceSides: 8 }` |

### 3. `multi_attack` — 3 abilities

| ID | Name | Class/Spec | Effects JSON |
|----|------|-----------|-------------|
| `war-ber-4` | Frenzy | Warrior/Berserker | `{ type: "multi_attack", strikes: 2, accuracyPenalty: -3 }` |
| `rog-swa-2` | Dual Strike | Rogue/Swashbuckler | `{ type: "multi_attack", strikes: 2, damageMultiplier: 0.7 }` |
| `rog-swa-4` | Flurry of Blades | Rogue/Swashbuckler | `{ type: "multi_attack", strikes: 4, damageMultiplier: 0.4 }` |

### 4. `aoe_drain` — 1 ability

| ID | Name | Class/Spec | Effects JSON |
|----|------|-----------|-------------|
| `mag-nec-5` | Soul Harvest | Mage/Necromancer | `{ type: "aoe_drain", diceCount: 3, diceSides: 8, healPerTarget: 8 }` |

### 5. `dispel_damage` — 1 ability

| ID | Name | Class/Spec | Effects JSON |
|----|------|-----------|-------------|
| `cle-inq-4` | Purging Flame | Cleric/Inquisitor | `{ type: "dispel_damage", damagePerBuff: 8 }` |

### 6. `aoe_dot` — 1 ability

| ID | Name | Class/Spec | Effects JSON |
|----|------|-----------|-------------|
| `cle-pal-3` | Consecrate | Cleric/Paladin | `{ type: "aoe_dot", element: "radiant", damagePerRound: 6, duration: 3, bonusVsUndead: 2.0 }` |

### 7. `delayed_damage` — 1 ability

| ID | Name | Class/Spec | Effects JSON |
|----|------|-----------|-------------|
| `rog-ass-5` | Death Mark | Rogue/Assassin | `{ type: "delayed_damage", delay: 3, diceCount: 8, diceSides: 6 }` |

---

## Implementation Requirements

### Handler 1: `handleAoeDamage`

**Pattern:** Follow Psion Mind Shatter / Drakonid Breath Weapon loop — iterate all alive enemies, roll damage per target, update state per combatant, collect targetIds.

**Logic:**

```
1. Get all alive enemies via getEnemies(state, actor)
2. Handle special cases FIRST:
   - If effects.requiresCorpse === true:
     - Check for dead enemies: state.combatants.filter(c => !c.isAlive && c.team !== actor.team)
     - If no corpses available: return fallback description "No corpses available for Corpse Explosion"
     - If corpse found: proceed with AoE against alive enemies (corpse is the "bomb", not the target)
3. For each alive enemy:
   a. Roll damage:
      - If effects.diceCount/diceSides exist: rollDice(diceCount, diceSides)
      - If effects.damageMultiplier exists (Cleave): use actor's weapon damage × multiplier
      - If effects.hitsPerTarget exists (Rain of Arrows): roll diceCount/diceSides that many times, sum
      - If effects.baseDice exists (Epic Finale): rollDice(baseDice, diceSides) + (state.round * bonusPerRound)
   b. Apply damage: clamp HP, check isAlive, check death prevention
   c. Update combatant in state
   d. Collect targetId and damage dealt
4. Return result with targetIds array, total damage, description listing per-target damage
```

**Add helper function** `getDeadEnemies()`:
```typescript
function getDeadEnemies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => !c.isAlive && c.team !== actor.team);
}
```

### Handler 2: `handleMultiTarget`

**Pattern:** Same as aoe_damage but capped at `effects.targets` enemies.

**Logic:**
```
1. Get alive enemies
2. Slice to min(enemies.length, effects.targets) — pick the first N (weakest-first or random, your call — weakest is more strategic)
3. For each target: roll diceCount/diceSides, apply damage, update state
4. Return result with targetIds array (only the ones actually hit)
```

**Key difference from aoe_damage:** `multi_target` hits UP TO N targets. `aoe_damage` hits ALL enemies.

### Handler 3: `handleMultiAttack`

**This is different from all other handlers.** Multi-attack uses weapon strikes with attack rolls, AC checks, and crit logic — it must call the combat engine's `resolveAttack()`.

**Logic:**
```
1. Get actor's weapon (if no weapon, fallback)
2. For effects.strikes times:
   a. Calculate modified attack params:
      - If effects.accuracyPenalty: apply to attack roll modifier
      - If effects.damageMultiplier: apply to final damage
   b. Call resolveAttack(state, actorId, targetId, weapon) — or replicate its logic inline
   c. Apply damageMultiplier to the result's damage if relevant
   d. Update state from each attack result
   e. If target dies mid-sequence, remaining strikes still go (attacking a dead enemy = wasted strikes)
3. Return a composite result:
   - Total damage across all strikes
   - Individual hit/miss/crit per strike (in description)
   - targetHpAfter from final state
```

**Critical decision:** You have two options for calling resolveAttack:

**Option A — Import and call resolveAttack directly:**
- Pro: Reuses all attack logic (crits, racial mods, buff interactions, death prevention)
- Con: resolveAttack returns `{ state, result: AttackResult }`, not `ClassAbilityResult`. You'll need to run it N times and merge into one ClassAbilityResult.
- Con: Potential circular import if combat-engine.ts imports class-ability-resolver.ts

**Option B — Replicate core attack math inline:**
- Pro: No import issues, full control
- Con: Duplicated logic, diverges over time

**Preferred: Option A.** Import `resolveAttack` from combat-engine.ts. The import direction is: class-ability-resolver.ts → combat-engine.ts (resolver imports from engine). Combat-engine.ts already imports resolveClassAbility from class-ability-resolver.ts via the `resolveTurn` case. **Check for circular import issues.** If circular, use a lazy require or extract resolveAttack to a shared utility.

For accuracyPenalty: temporarily modify the actor's stats or pass it as an override. The simplest approach is to apply the penalty to the actor's attack stat in a cloned combatant before calling resolveAttack, then restore after.

For damageMultiplier: apply after resolveAttack returns — multiply `result.totalDamage` and re-apply to target HP.

### Handler 4: `handleAoeDrain`

**Pattern:** aoe_damage loop + self-healing.

**Logic:**
```
1. Get alive enemies
2. For each enemy: roll diceCount/diceSides, apply damage, update state
3. Calculate self-heal: enemiesHit × effects.healPerTarget
4. Heal actor: clamp to maxHp
5. Return result with targetIds, total damage, selfHealing amount
```

### Handler 5: `handleDispelDamage`

**Pattern:** Count and clear target's activeBuffs, deal damage per buff removed.

**Logic:**
```
1. Get target
2. Count target.activeBuffs.length (default to empty array)
3. Clear target.activeBuffs to []
4. Also remove positive status effects: blessed, shielded, hasted, regenerating, foresight
5. Calculate damage: buffsRemoved × effects.damagePerBuff
6. Apply damage to target
7. Return result with buffCount removed, total damage
```

**Design decision on what counts as a "buff":**
- `activeBuffs` array (from class abilities) — YES, always remove
- Positive status effects (blessed, shielded, hasted, regenerating, foresight) — YES, also remove
- Negative status effects — NO, leave them
- This makes Purging Flame a strong counter to buff-heavy classes (Guardian, Warlord, Battlechanter)

### Handler 6: `handleAoeDot`

**Pattern:** Apply a DoT status effect to all enemies rather than tracking a persistent zone.

**Logic:**
```
1. Get alive enemies
2. For each enemy:
   a. Apply a 'burning' status effect with:
      - damage per round = effects.damagePerRound (6 for Consecrate)
      - duration = effects.duration (3 rounds)
      - Optionally: if effects.bonusVsUndead and target has some undead flag, multiply damage
   b. Update combatant in state
3. Return result with targetIds, description
```

**On bonusVsUndead:** The game currently has no `isUndead` flag on combatants or monsters. For now, **ignore bonusVsUndead** — just apply the base damage. Log a note: "bonusVsUndead not applied — no undead flag exists on combatants." This is a future enhancement when monster types are implemented.

**On which status to use:** Rather than creating a new status type, use the existing `burning` status since it already has DoT handling in the engine. Set it to the correct damage/duration. If the ability's element is `radiant`, that's flavor — mechanically it works the same as burning DoT.

### Handler 7: `handleDelayedDamage`

**New infrastructure required.**

**Step 1 — Add to Combatant type** (`shared/src/types/combat.ts`):

```typescript
export interface DelayedEffect {
  id: string;
  sourceAbilityId: string;
  sourceAbilityName: string;
  sourceActorId: string;
  roundsRemaining: number;
  diceCount: number;
  diceSides: number;
}

// On Combatant:
export interface Combatant {
  // ... existing fields ...
  delayedEffects?: DelayedEffect[];
}
```

**Step 2 — Handler logic:**
```
1. Get target
2. Create a DelayedEffect:
   - id: generate a unique string (e.g., `${abilityId}-${Date.now()}` or use crypto.randomUUID)
   - sourceAbilityId: abilityId
   - sourceAbilityName: abilityDef.name
   - sourceActorId: actorId
   - roundsRemaining: effects.delay (3 for Death Mark)
   - diceCount: effects.diceCount (8)
   - diceSides: effects.diceSides (6)
3. Add to target.delayedEffects array
4. Return result with description: "Death Mark placed on [target]. Detonates in 3 rounds for 8d6 damage."
   - No immediate damage
   - Set a custom field or use description to convey the delayed nature
```

**Step 3 — Tick processing** (add to the turn-start processing alongside cooldowns and buffs):

Create and export a new function in class-ability-resolver.ts:
```typescript
export function tickDelayedEffects(
  state: CombatState,
  combatant: Combatant
): { combatant: Combatant; detonations: DelayedDetonation[] }
```

Logic:
```
1. For each delayedEffect on the combatant:
   a. Decrement roundsRemaining by 1
   b. If roundsRemaining === 0:
      - Roll damage: rollDice(diceCount, diceSides)
      - Apply damage to combatant
      - Add to detonations array: { abilityName, damage, targetId }
      - Remove the effect
2. Return updated combatant and detonation results
```

**Step 4 — Wire into combat-engine.ts turn processing:**

In `resolveTurn()`, alongside the existing cooldown/buff ticks at turn start, add:
```typescript
const { combatant: delayTicked, detonations } = tickDelayedEffects(state, actorAfterBuffTick);
// Add detonation results to the turn log
for (const det of detonations) {
  ticks.push({
    combatantId: actorId,
    effectName: det.abilityName,
    damage: det.damage,
    // ... format appropriately
  });
}
```

**Design decisions:**
- Death Mark detonates at the START of the marked target's turn (like DoT/status ticks)
- If the target is already dead when it detonates, the damage is wasted (no overkill tracking)
- Death Mark CANNOT be cleansed by `handleCleanse` (it's not a status effect — it's tracked separately). If you want it cleansable, that's a Phase 3 decision.
- Only one Death Mark per target at a time (if re-applied, refresh the timer)

---

## Additional Required Changes

### Fix: Cooldown Reduction Passives

The audit flagged that `cooldownReduction` has ambiguous semantics: Arcane Mastery uses 0.3 (30%), Spell Weaver uses 1 (flat).

**Resolution:** Disambiguate by value range:
- If `cooldownReduction < 1`: treat as percentage (multiply cooldown by `1 - value`)
- If `cooldownReduction >= 1`: treat as flat reduction (subtract from cooldown)

In `applyPassiveAbilities()`, store the reduction on the combatant. Suggested approach — add to Combatant:

```typescript
cooldownReductionPercent?: number;  // 0-1, from Arcane Mastery
cooldownReductionFlat?: number;     // integer, from Spell Weaver
```

In `resolveClassAbility()` where cooldown is set after ability use:
```typescript
let cd = abilityDef.cooldown;
if (actor.cooldownReductionPercent) {
  cd = Math.ceil(cd * (1 - actor.cooldownReductionPercent));
}
if (actor.cooldownReductionFlat) {
  cd = Math.max(0, cd - actor.cooldownReductionFlat);
}
if (cd > 0) {
  // set cooldown
}
```

Apply percentage first, then flat, so they stack multiplicatively then additively.

### Update: ClassAbilityResult for Multi-Target Results

The existing `ClassAbilityResult` has `targetId?: string` and `targetIds?: string[]`. Add a per-target breakdown field for detailed logging:

```typescript
export interface ClassAbilityResult {
  // ... existing fields ...
  perTargetResults?: Array<{
    targetId: string;
    targetName: string;
    damage?: number;
    healing?: number;
    statusApplied?: string;
    hpAfter: number;
    killed: boolean;
  }>;
  // For multi_attack:
  strikeResults?: Array<{
    strikeNumber: number;
    hit: boolean;
    crit: boolean;
    damage: number;
    attackRoll?: number;
    attackTotal?: number;
    targetAc?: number;
  }>;
  totalStrikes?: number;
  strikesHit?: number;
}
```

---

## Combat Simulator Updates

### New Scenarios

Add **two new scenarios** to `combat-sim-scenarios.ts`:

**Scenario: `aoe-abilities`**
```
Team 0: L20 Mage (Elementalist) with Fireball + Meteor Strike
  - unlockedAbilityIds: ['mag-ele-1', 'mag-ele-5']
  - abilityQueue: [Meteor Strike priority 1 always, Fireball priority 2 always]
  
Team 1: 3x L15 Orc Warriors (no abilities)
  - Tests AoE damage against multiple enemies
  - Verifies per-target damage rolls
  - Verifies death mid-AoE doesn't crash remaining targets
```

**Scenario: `multi-attack`**
```
Team 0: L22 Rogue (Swashbuckler) with Dual Strike + Flurry of Blades
  - unlockedAbilityIds: ['rog-swa-2', 'rog-swa-4']
  - abilityQueue: [Flurry priority 1 always, Dual Strike priority 2 always]
  
Team 1: L22 Warrior (Guardian) with Fortify
  - unlockedAbilityIds: ['war-gua-2']
  - abilityQueue: [Fortify priority 1 first_round]
  - Tests multi-strike against high-AC target
  - Verifies damage multiplier, per-strike hit/miss, cooldown cycling
```

### Update Sim Logger

In `combat-sim-logger.ts`, handle `ClassAbilityResult` with:
- `perTargetResults`: log each target hit with damage and HP remaining
- `strikeResults`: log each strike with hit/miss/crit and damage
- Color: magenta for class ability name, red for damage values, yellow for status effects
- Format example:
  ```
  [ABILITY] Fireball hits 3 targets:
    → Orc Grunt A: 14 fire damage (HP: 78→64)
    → Orc Grunt B: 11 fire damage (HP: 78→67)
    → Orc Grunt C: 18 fire damage (HP: 78→60, CRIT)
  ```
  ```
  [ABILITY] Flurry of Blades (4 strikes):
    → Strike 1: HIT (17 vs AC 18) — 8 damage
    → Strike 2: MISS (12 vs AC 18)
    → Strike 3: CRIT (nat 20) — 14 damage
    → Strike 4: HIT (19 vs AC 18) — 6 damage
    Total: 3/4 hits, 28 damage (HP: 78→50)
  ```

---

## Implementation Order

1. **Type changes** — `DelayedEffect`, `perTargetResults`, `strikeResults`, cooldown reduction fields on Combatant
2. **`handleAoeDamage`** + `getDeadEnemies()` helper — 7 abilities, biggest impact
3. **`handleMultiTarget`** — 2 abilities, variation of aoe_damage
4. **`handleMultiAttack`** — 3 abilities, requires resolveAttack integration (check circular imports)
5. **`handleAoeDrain`** — 1 ability, extension of aoe_damage
6. **`handleDispelDamage`** — 1 ability, buff removal + damage
7. **`handleAoeDot`** — 1 ability, apply burning status to all enemies
8. **`handleDelayedDamage`** + `tickDelayedEffects()` + combat-engine wiring — 1 ability, most infrastructure
9. **Cooldown reduction passives** in `applyPassiveAbilities()` + `resolveClassAbility()`
10. **Combat sim scenarios** + logger updates
11. **TypeScript compilation check** (`npx tsc --noEmit`)
12. **Run ALL sim scenarios** — verify old ones still pass, new ones work

---

## Validation Criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Existing scenarios pass: basic-melee, spell-vs-melee, status-effects, flee-test, racial-abilities, team-fight, class-abilities
- [ ] New scenario `aoe-abilities` runs: Fireball hits all 3 enemies, Meteor Strike hits all 3, per-target damage logged
- [ ] New scenario `multi-attack` runs: Flurry of Blades shows 4 strike results with hit/miss/crit each
- [ ] Corpse Explosion: fails gracefully when no corpses, works when enemy is dead
- [ ] Rain of Arrows: `hitsPerTarget: 2` rolls damage twice per enemy
- [ ] Epic Finale: damage increases with round number
- [ ] Soul Harvest: heals caster 8 HP per enemy hit
- [ ] Purging Flame: removes all activeBuffs + positive statuses, deals 8 dmg per buff removed
- [ ] Consecrate: applies burning DoT to all enemies for 3 rounds
- [ ] Death Mark: no immediate damage, detonates after 3 rounds at target's turn start
- [ ] Cooldown reduction: Arcane Mastery (30%) reduces a cooldown 10 to 7; Spell Weaver (flat 1) reduces cooldown 10 to 9
- [ ] Determinism: same seed produces identical output across runs
- [ ] Unimplemented types (steal, trap, summon, counter, etc.) still log warning and fallback — no regression

---

## Files Expected to Change

**Modified:**
- `shared/src/types/combat.ts` — DelayedEffect interface, new Combatant fields, ClassAbilityResult additions
- `server/src/lib/class-ability-resolver.ts` — 7 new handlers in EFFECT_HANDLERS map, getDeadEnemies helper, tickDelayedEffects export, cooldown reduction in applyPassiveAbilities + resolveClassAbility
- `server/src/lib/combat-engine.ts` — wire tickDelayedEffects into turn processing, add detonation to turn log
- `server/src/scripts/combat-sim-runner.ts` — handle new result fields (perTargetResults, strikeResults), delayed effect ticking
- `server/src/scripts/combat-sim-scenarios.ts` — 2 new scenarios (aoe-abilities, multi-attack)
- `server/src/scripts/combat-sim-logger.ts` — multi-target and multi-strike log formatting

**Do NOT modify:**
- `shared/src/data/skills/*.ts` — ability data is correct
- `server/prisma/schema.prisma` — no schema changes needed
- `server/src/services/tick-combat-resolver.ts` — Phase 1 already fixed dispatch; no Phase 2 changes needed
- The psion resolver — leave it alone

---

## Constraints

- The resolver file is currently 857 lines. Phase 2 adds 7 handlers at ~30-50 lines each plus infrastructure. Target: stay under **1200 lines total**. If exceeding, extract AoE helpers into a separate `class-ability-aoe.ts` utility file.
- Do NOT refactor Phase 1 handlers. They work. Add alongside them.
- Do NOT implement damage type resistances/vulnerabilities. Damage types are display-only for now. Just pass `element` through to the result description.
- Do NOT implement the `bonusVsUndead` mechanic. No undead flag exists. Log a comment noting this for future implementation.
- Minimal tool calls, brief analysis. Get to implementation quickly.

---

## Deployment

After all implementation and validation:

```bash
git add -A
git commit -m "Phase 2: AoE, multi-hit, delayed damage, dispel handlers + cooldown reduction passives + 2 new sim scenarios"
git push origin main
```

Then deploy to Azure following the deployment process in CLAUDE.md (unique image tag, not :latest).

No database seed changes needed — ability data is already seeded.
