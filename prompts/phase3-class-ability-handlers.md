# Phase 3: Counter, Trap, Summon, Steal, Companion & Special Effect Handlers

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

Also read the Phase 3 audit for full context:
```bash
cat server/src/scripts/combat-sim-results/phase3-abilities-audit.md
```

---

## The Problem

Phase 2 completed all AoE, multi-hit, delayed damage, and dispel handlers. Phase 3 is the **final batch** — 7 new effect types covering the last 10 unimplemented abilities. After this, every class ability in the game has a working combat resolver.

These abilities currently hit the fallback path (log warning → basic attack). They span three complexity tiers:

- **Phase 3A** (no engine changes): steal, damage_steal, companion_attack, both specials
- **Phase 3B** (resolveAttack modification): counter, trap
- **Phase 3C** (buff tick extension): summon

---

## Phase 3 Abilities — Complete Reference

### steal — Pilfer (rog-thi-1)
```json
{ "type": "steal", "goldRange": [5, 20] }
```
Cooldown: 3, Level: 10

### damage_steal — Mug (rog-thi-5)
```json
{ "type": "damage_steal", "diceCount": 3, "diceSides": 6, "stealItem": true }
```
Cooldown: 8, Level: 30

### counter — Riposte (rog-swa-1)
```json
{ "type": "counter", "counterDamage": 8, "triggerOn": "melee_attack" }
```
Cooldown: 2, Level: 10

### trap — Lay Trap (ran-tra-1)
```json
{ "type": "trap", "trapDamage": 10, "triggerOn": "attacked" }
```
Cooldown: 3, Level: 10

### trap — Explosive Trap (ran-tra-4)
```json
{ "type": "trap", "trapDamage": 25, "aoe": true, "triggerOn": "attacked" }
```
Cooldown: 6, Level: 22

### summon — Call Companion (ran-bea-1)
```json
{ "type": "summon", "companionDamage": 5, "duration": 5 }
```
Cooldown: 6, Level: 10

### summon — Alpha Predator (ran-bea-5)
```json
{ "type": "summon", "companionDamage": 12, "companionHp": 50, "duration": 8 }
```
Cooldown: 12, Level: 30

### companion_attack — Bestial Fury (ran-bea-4)
```json
{ "type": "companion_attack", "diceCount": 4, "diceSides": 8 }
```
Cooldown: 5, Level: 22

### special — Diplomat's Gambit (bar-dip-4)
```json
{ "type": "special", "peacefulEnd": true, "successChance": 0.5 }
```
Cooldown: 8, Level: 22

### special — Tome of Secrets (bar-lor-5)
```json
{ "type": "special", "randomClassAbility": true, "powerLevel": "high" }
```
Cooldown: 8, Level: 30

---

## Design Decisions (Already Made)

These were flagged in the audit. Here are the rulings:

1. **Companions are buff-based, NOT full combatants.** Model companions as `ActiveBuff` entries on the ranger with `companionDamage` that auto-deals damage to a random alive enemy during the buff tick phase. No turn order changes, no companion AI, no mid-combat combatant insertion.

2. **Gold/item stealing is tracked on ClassAbilityResult, NOT in combat state.** Add `goldStolen?: number` and `bonusLootRoll?: boolean` to `ClassAbilityResult`. The combat-end handler (outside Phase 3 scope) will process these. For now, the combat sim just logs them.

3. **Counter and trap use the buff-triggered reaction pattern.** The ranger/rogue uses their turn to arm the effect (creating an ActiveBuff with reactive fields). When attacked, `resolveAttack` checks for reactive buffs and triggers them. One-shot: the buff is consumed on trigger.

4. **Diplomat's Gambit is PvE only for now.** 50% roll. On success, set `state.status = 'COMPLETED'` with `winningTeam: null` and `peacefulResolution: true` on the result. On failure, turn is wasted. PvP interactive negotiation is future scope.

5. **Tome of Secrets uses a static curated list.** Hardcode an array of ~15 eligible ability IDs (tier 3-4 abilities with implemented effect types: damage, aoe_damage, heal, buff, debuff, status, drain, aoe_drain). Exclude passives, counters, traps, summons, steals, companion_attack, flee, and anything requiring a specific precondition (corpses, companions). Pick one at random, look it up from the ability map, delegate to the matching EFFECT_HANDLER.

6. **Alpha Predator companion HP is tracked on the buff.** Add `companionHp?: number` to `ActiveBuff`. When an enemy attacks the ranger, if the ranger has a companion with HP, there's a 30% chance the companion intercepts the attack instead (takes the damage). If companion HP reaches 0, the buff is removed early.

---

## Implementation Requirements

### Phase 3A — Simple Handlers (No Engine Changes)

#### Handler 1: `handleSteal`

```
1. Get target (if no target, fail gracefully with description)
2. Roll gold stolen: random integer in [goldRange[0], goldRange[1]] inclusive
3. Do NOT modify any combatant state (no HP change, no gold tracking on combatant)
4. Return result:
   - description: "Pilfer: Stole {amount} gold from {target.name}"
   - goldStolen: amount
   - targetId: target.id
   - damage: 0
```

This is purely a result-tracking ability. No combat state changes. The gold transfer happens post-combat.

#### Handler 2: `handleDamageSteal`

```
1. Get target
2. Roll damage: rollDice(effects.diceCount, effects.diceSides)
3. Apply damage to target (same pattern as handleDamage — clamp HP, check death)
4. Track steal result:
   - goldStolen: roll random 10-50 (hardcode reasonable range since data only has stealItem: true flag)
   - bonusLootRoll: true (if effects.stealItem === true)
5. Return result with damage dealt, goldStolen, bonusLootRoll, description
```

#### Handler 3: `handleCompanionAttack`

```
1. Check if actor has a companion buff: actor.activeBuffs?.find(b => b.companionDamage != null)
2. If no companion: return { description: "Bestial Fury failed — no companion active", damage: 0 }
3. If companion exists:
   a. Roll damage: rollDice(effects.diceCount, effects.diceSides) — this is the DIRECTED attack, separate from auto-damage
   b. Apply damage to target
   c. Return result with damage, description: "Bestial Fury: Companion attacks {target.name} for {damage} damage"
```

#### Handler 4: `handleSpecial` (routes by sub-type)

This handler checks which special mechanic is being used and delegates:

```typescript
function handleSpecial(state, actor, target, enemies, abilityDef, effects): { state, result } {
  if (effects.peacefulEnd) {
    return handleDiplomatsGambit(state, actor, effects);
  }
  if (effects.randomClassAbility) {
    return handleTomeOfSecrets(state, actor, target, enemies, abilityDef, effects);
  }
  // Unknown special — fallback
  return { state, result: { description: `${abilityDef.name}: Unknown special effect`, fallbackToAttack: true } };
}
```

**`handleDiplomatsGambit` sub-handler:**
```
1. Roll: Math.random() < effects.successChance (0.5)
2. On SUCCESS:
   - Set state.status = 'COMPLETED'
   - Set state.winningTeam = null
   - Return result with peacefulResolution: true, description: "Diplomat's Gambit succeeds! Combat ends peacefully."
3. On FAILURE:
   - Return result with peacefulResolution: false, description: "Diplomat's Gambit fails — the enemy refuses peace."
   - No state changes, turn is wasted
```

**CRITICAL**: The combat loop in `resolveTurn` and `advanceTurn` must check `state.status === 'COMPLETED'` after resolving a class ability to stop the combat loop. Check that the existing combat end detection handles this — `checkCombatEnd` may only check alive teams. If needed, add an early exit check after class ability resolution:
```typescript
if (state.status === 'COMPLETED') {
  // Skip remaining turn processing
  break; // or return state;
}
```

**`handleTomeOfSecrets` sub-handler:**
```
1. Define curated pool (static const at module level):
   const TOME_ELIGIBLE_ABILITIES = [
     'war-ber-1',  // Reckless Strike (damage)
     'mag-ele-1',  // Fireball (aoe_damage)
     'mag-ele-3',  // Chain Lightning (multi_target)
     'mag-nec-1',  // Life Drain (drain)
     'mag-nec-5',  // Soul Harvest (aoe_drain)
     'cle-hea-1',  // Healing Light (heal)
     'cle-hea-3',  // Greater Heal (heal)
     'cle-inq-1',  // Smite (damage_status)
     'cle-inq-4',  // Purging Flame (dispel_damage)
     'ran-sha-2',  // Multi-Shot (multi_target)
     'bar-bat-1',  // War Song (buff)
     'bar-bat-3',  // Thunderclap (aoe_debuff)
     'rog-ass-1',  // Backstab (damage)
     'mag-enc-1',  // Charm (debuff)
     'cle-pal-5',  // Divine Wrath (aoe_damage)
   ];

2. Pick random: const pickedId = TOME_ELIGIBLE_ABILITIES[Math.floor(Math.random() * TOME_ELIGIBLE_ABILITIES.length)]
3. Look up ability: abilityMap.get(pickedId)
4. Get its effect type, look up handler from EFFECT_HANDLERS
5. Call that handler with the picked ability's effects (NOT the Tome's effects)
6. Wrap the result:
   - randomAbilityUsed: pickedAbility.name
   - description: "Tome of Secrets channels {pickedAbility.name}! {originalDescription}"
```

**Edge case**: If the picked ability targets an enemy but the actor has no target, pick a random alive enemy. If it's a self-buff/heal, target the actor.

### Phase 3B — Reactive Subsystem (resolveAttack Modification)

#### New ActiveBuff Fields

Add to `ActiveBuff` in `shared/src/types/combat.ts`:

```typescript
export interface ActiveBuff {
  // ... existing fields ...
  
  // Reactive trigger fields (Phase 3)
  counterDamage?: number;       // Flat damage dealt back to attacker on trigger
  trapDamage?: number;          // Flat damage dealt to attacker (or all enemies if trapAoe)
  trapAoe?: boolean;            // If true, trap damages all enemies, not just attacker
  triggerOn?: 'melee_attack' | 'attacked';  // When this buff triggers
  companionDamage?: number;     // Auto-damage per round from companion
  companionHp?: number;         // Companion's HP pool (if targetable, can be reduced)
}
```

#### Handler 5: `handleCounter` (Riposte)

This handler is called on the rogue's TURN to arm the counter stance. It does NOT deal damage immediately.

```
1. Create an ActiveBuff on the actor:
   {
     sourceAbilityId: abilityId,
     name: 'Riposte Stance',
     roundsRemaining: 2,  // Lasts until next turn + 1 (enough to cover enemy attacks before rogue's next turn)
     counterDamage: effects.counterDamage (8),
     triggerOn: effects.triggerOn ('melee_attack'),
   }
2. Add buff to actor.activeBuffs
3. Return result with description: "Riposte: {actor.name} enters counter stance — next melee attacker takes 8 damage"
4. No immediate damage, no target needed
```

#### Handler 6: `handleTrap` (Lay Trap + Explosive Trap)

Same pattern as counter — the ranger uses their turn to arm the trap.

```
1. Create an ActiveBuff on the actor:
   {
     sourceAbilityId: abilityId,
     name: effects.aoe ? 'Explosive Trap' : 'Lay Trap',
     roundsRemaining: 3,  // Trap persists for 3 rounds waiting for trigger
     trapDamage: effects.trapDamage (10 or 25),
     trapAoe: effects.aoe ?? false,
     triggerOn: effects.triggerOn ('attacked'),
   }
2. Return result with description: "{abilityName}: Trap armed — triggers when attacked"
```

#### resolveAttack Modification — Reactive Trigger Check

In `combat-engine.ts`, inside `resolveAttack()`, AFTER the Nethkin melee reflect check (around line 669) and BEFORE building the final result:

```typescript
// === Phase 3: Check for reactive buffs on the TARGET (counter/trap) ===
let counterResult: { counterDamage: number; abilityName: string; trapAoe: boolean } | null = null;

if (target.activeBuffs && target.activeBuffs.length > 0) {
  // Find first matching reactive buff
  const reactiveBuff = target.activeBuffs.find(buff => {
    if (buff.counterDamage && buff.triggerOn === 'melee_attack') return true;
    if (buff.trapDamage && buff.triggerOn === 'attacked') return true;
    return false;
  });

  if (reactiveBuff) {
    const reactiveDamage = reactiveBuff.counterDamage ?? reactiveBuff.trapDamage ?? 0;
    const isAoe = reactiveBuff.trapAoe ?? false;
    const buffName = reactiveBuff.name;

    if (isAoe) {
      // Explosive Trap: damage ALL alive enemies of the trap-layer
      const trapEnemies = state.combatants.filter(
        c => c.team !== target.team && c.isAlive && !c.hasFled
      );
      for (const enemy of trapEnemies) {
        const newHp = Math.max(0, enemy.currentHp - reactiveDamage);
        state = {
          ...state,
          combatants: state.combatants.map(c =>
            c.id === enemy.id
              ? { ...c, currentHp: newHp, isAlive: newHp > 0 }
              : c
          ),
        };
      }
      counterResult = { counterDamage: reactiveDamage, abilityName: buffName, trapAoe: true };
    } else {
      // Counter/single trap: damage only the ATTACKER
      const newActorHp = Math.max(0, actor.currentHp - reactiveDamage);
      actor = {
        ...actor,
        currentHp: newActorHp,
        isAlive: newActorHp > 0,
      };
      counterResult = { counterDamage: reactiveDamage, abilityName: buffName, trapAoe: false };
    }

    // Consume the reactive buff (one-shot)
    target = {
      ...target,
      activeBuffs: target.activeBuffs.filter(b => b !== reactiveBuff),
    };
  }
}
```

Then include `counterResult` in the `AttackResult`:

Add to `AttackResult` in `shared/src/types/combat.ts`:
```typescript
export interface AttackResult {
  // ... existing fields ...
  counterTriggered?: boolean;
  counterDamage?: number;
  counterAbilityName?: string;
  counterAoe?: boolean;
}
```

Populate these from `counterResult` when building the result.

**IMPORTANT**: After the reactive check, update both `actor` and `target` back into the `state.combatants` array before returning. The existing code at the end of `resolveAttack` that builds the final state needs to use the potentially-modified `actor` (who may have taken counter damage and died).

### Phase 3C — Companion Subsystem (Buff Tick Extension)

#### Handler 7: `handleSummon` (Call Companion + Alpha Predator)

```
1. Check if actor already has a companion buff — if so, REPLACE it (don't stack)
   Remove existing: actor.activeBuffs.filter(b => b.companionDamage == null)
2. Create companion ActiveBuff:
   {
     sourceAbilityId: abilityId,
     name: abilityDef.name === 'Alpha Predator' ? 'Alpha Companion' : 'Animal Companion',
     roundsRemaining: effects.duration (5 or 8),
     companionDamage: effects.companionDamage (5 or 12),
     companionHp: effects.companionHp ?? undefined,  // Only Alpha Predator has HP
   }
3. Return result with description: "{actor.name} summons a companion! ({companionDamage} damage/round for {duration} rounds)"
```

#### Companion Auto-Damage in Buff Tick

Extend `tickActiveBuffs` in `class-ability-resolver.ts` to handle companion damage:

Currently `tickActiveBuffs` handles `hotPerRound` (healing per round). Add companion damage:

```typescript
export function tickActiveBuffs(combatant: Combatant, enemies?: Combatant[]): {
  combatant: Combatant;
  hotHealing: number;
  companionDamageDealt?: { targetId: string; damage: number };
} {
  // ... existing HoT logic ...

  // Companion auto-damage
  let companionResult: { targetId: string; damage: number } | undefined;
  for (const buff of combatant.activeBuffs ?? []) {
    if (buff.companionDamage && buff.companionDamage > 0) {
      // Pick a random alive enemy to attack
      if (enemies && enemies.length > 0) {
        const targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        companionResult = { targetId: targetEnemy.id, damage: buff.companionDamage };
      }
      break; // Only one companion at a time
    }
  }

  return { combatant: tickedCombatant, hotHealing, companionDamageDealt: companionResult };
}
```

**CRITICAL**: `tickActiveBuffs` currently only receives the combatant. It needs access to alive enemies to pick a companion target. The function signature must change to accept an optional `enemies` parameter. Update the call site in `combat-engine.ts` `resolveTurn()` to pass enemies:

```typescript
const enemies = state.combatants.filter(c => c.team !== actor.team && c.isAlive && !c.hasFled);
const { combatant: buffTicked, hotHealing, companionDamageDealt } = tickClassActiveBuffs(cooldownTicked, enemies);
```

Then, if `companionDamageDealt` is set, apply the damage to the target enemy in state and log it.

#### Companion HP / Interception (Alpha Predator Only)

When the ranger with an Alpha Predator companion is attacked, 30% chance the companion takes the hit instead:

In `resolveAttack()`, BEFORE the main damage application to target, add a companion interception check:

```typescript
// === Companion interception check ===
if (target.activeBuffs) {
  const companionBuff = target.activeBuffs.find(b => b.companionHp != null && b.companionHp > 0);
  if (companionBuff && Math.random() < 0.3) {
    // Companion intercepts — takes the damage instead of the ranger
    const newCompanionHp = Math.max(0, companionBuff.companionHp! - totalDamage);
    if (newCompanionHp <= 0) {
      // Companion dies — remove the buff entirely
      target = {
        ...target,
        activeBuffs: target.activeBuffs.filter(b => b !== companionBuff),
      };
    } else {
      target = {
        ...target,
        activeBuffs: target.activeBuffs.map(b =>
          b === companionBuff ? { ...b, companionHp: newCompanionHp } : b
        ),
      };
    }
    // The ranger takes NO damage — the companion absorbed it
    // Set result to reflect companion interception
    // ... build result with companionIntercepted: true ...
    // RETURN EARLY — skip normal damage application to target
  }
}
```

Add to `AttackResult`:
```typescript
companionIntercepted?: boolean;
companionDamageAbsorbed?: number;
companionKilled?: boolean;
```

**Place this check AFTER the attack roll succeeds and damage is calculated, but BEFORE applying damage to the target.** The companion takes the full calculated damage instead of the ranger.

---

## Type Changes Summary

### shared/src/types/combat.ts

**ActiveBuff** — add:
```typescript
counterDamage?: number;
trapDamage?: number;
trapAoe?: boolean;
triggerOn?: 'melee_attack' | 'attacked';
companionDamage?: number;
companionHp?: number;
```

**ClassAbilityResult** — add:
```typescript
goldStolen?: number;
bonusLootRoll?: boolean;
peacefulResolution?: boolean;
randomAbilityUsed?: string;
```

**AttackResult** — add:
```typescript
counterTriggered?: boolean;
counterDamage?: number;
counterAbilityName?: string;
counterAoe?: boolean;
companionIntercepted?: boolean;
companionDamageAbsorbed?: number;
companionKilled?: boolean;
```

**CombatState** — add:
```typescript
peacefulResolution?: boolean;
```

---

## Combat Simulator Updates

### New Scenarios

Add **three new scenarios** to `combat-sim-scenarios.ts`:

**Scenario: `counter-trap`**
```
Team 0: L10 Rogue (Swashbuckler) with Riposte + L10 Ranger (Tracker) with Lay Trap
  - Rogue: unlockedAbilityIds: ['rog-swa-1']
    abilityQueue: [{ abilityId: 'rog-swa-1', abilityName: 'Riposte', priority: 1, useWhen: 'always' }]
  - Ranger: unlockedAbilityIds: ['ran-tra-1']
    abilityQueue: [{ abilityId: 'ran-tra-1', abilityName: 'Lay Trap', priority: 1, useWhen: 'always' }]

Team 1: 2x L10 Orc Warriors (no abilities, aggressive stance)
  - These will attack into the counter/trap and take reactive damage
  - Validates: counter triggers on melee, trap triggers on attack, one-shot consumption, correct damage
```

**Scenario: `companion`**
```
Team 0: L10 Ranger (Beastmaster) with Call Companion + Bestial Fury
  - unlockedAbilityIds: ['ran-bea-1', 'ran-bea-4']
  - abilityQueue: [
      { abilityId: 'ran-bea-1', abilityName: 'Call Companion', priority: 1, useWhen: 'first_round' },
      { abilityId: 'ran-bea-4', abilityName: 'Bestial Fury', priority: 2, useWhen: 'always' },
    ]

Team 1: L10 Warrior (no abilities)
  - Validates: companion summoned round 1, auto-damage each subsequent round, Bestial Fury works when companion exists, Bestial Fury fails (gracefully) if companion not summoned
```

**Scenario: `special-abilities`**
```
Team 0: L30 Bard (Lorekeeper) with Tome of Secrets
  - unlockedAbilityIds: ['bar-lor-5']
  - abilityQueue: [{ abilityId: 'bar-lor-5', abilityName: 'Tome of Secrets', priority: 1, useWhen: 'always' }]

Team 1: L30 Warrior (no abilities)
  - Validates: random ability selection, correct delegation to handler, result wrapping
  - Note: Diplomat's Gambit can't easily be sim-tested since it ends combat immediately.
    Add a simple unit-style check in the scenario setup comments describing manual test.
```

### Update Sim Logger

In `combat-sim-logger.ts`, handle:

1. **Counter/trap triggers**: When `AttackResult.counterTriggered`, log:
   ```
   [REACTION] Riposte Stance triggers! {target.name} counters for 8 damage → {actor.name} (HP: X→Y)
   ```

2. **Companion auto-damage**: When companion damage occurs during buff tick:
   ```
   [COMPANION] Animal Companion attacks {enemy.name} for 5 damage (HP: X→Y)
   ```

3. **Companion interception**: When `AttackResult.companionIntercepted`:
   ```
   [COMPANION] Alpha Companion intercepts! Takes 15 damage (Companion HP: 50→35)
   ```

4. **Steal results**: When `ClassAbilityResult.goldStolen`:
   ```
   [ABILITY] Pilfer: Stole 14 gold from {target.name}
   ```

5. **Tome of Secrets**: When `ClassAbilityResult.randomAbilityUsed`:
   ```
   [ABILITY] Tome of Secrets channels Fireball! {delegated result description}
   ```

6. **Diplomat's Gambit**: When `peacefulResolution`:
   ```
   [ABILITY] Diplomat's Gambit: Peace offer ACCEPTED — combat ends!
   ```
   or:
   ```
   [ABILITY] Diplomat's Gambit: Peace offer REJECTED — turn wasted
   ```

---

## Sim Runner Decision Changes

Add a new `useWhen` condition to handle companion-dependent abilities:

In the `useWhen` check within `simDecideAction`, add:

```typescript
case 'has_companion':
  shouldUse = (combatant.activeBuffs ?? []).some(b => b.companionDamage != null);
  break;
```

Update the `AbilityQueueEntry` type in `shared/src/types/combat.ts` to include the new condition:
```typescript
useWhen?: 'always' | 'low_hp' | 'high_hp' | 'first_round' | 'outnumbered' | 'has_companion';
```

This lets the companion scenario use `useWhen: 'has_companion'` for Bestial Fury so it only fires when a companion is active.

---

## Implementation Order

1. **Type changes** — ActiveBuff reactive fields, ClassAbilityResult fields, AttackResult fields, CombatState.peacefulResolution, useWhen extension
2. **handleSteal** — simplest, pure result tracking
3. **handleDamageSteal** — damage + result tracking
4. **handleCompanionAttack** — check buff, roll damage
5. **handleSpecial** (Diplomat's Gambit sub-handler) — percentile roll, combat end
6. **handleSpecial** (Tome of Secrets sub-handler) — curated list, delegation
7. **handleSummon** — create companion buff
8. **Companion auto-damage in tickActiveBuffs** — extend function signature, wire in combat-engine
9. **handleCounter** — arm counter stance buff
10. **handleTrap** — arm trap buff (single + AoE variant)
11. **resolveAttack reactive trigger check** — counter/trap trigger + companion interception
12. **Sim scenarios** — counter-trap, companion, special-abilities
13. **Sim logger updates** — counter/trap/companion/steal/special formatting
14. **TypeScript compilation check** (`npx tsc --noEmit`)
15. **Run ALL sim scenarios** — verify old ones still pass, new ones work

---

## Validation Criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All 9 existing scenarios pass (basic-melee, spell-vs-melee, status-effects, flee-test, racial-abilities, team-fight, class-abilities, aoe-abilities, multi-attack) — NO REGRESSIONS
- [ ] New scenario `counter-trap`: Riposte triggers when rogue is melee attacked, deals 8 counter damage. Lay Trap triggers when ranger is attacked, deals 10 damage. Both are one-shot (consumed after trigger). Both re-arm when used again after cooldown.
- [ ] New scenario `companion`: Call Companion creates buff in round 1. Companion deals 5 auto-damage each subsequent round to a random enemy. Bestial Fury deals 4d8 directed damage when companion is active.
- [ ] New scenario `special-abilities`: Tome of Secrets picks a random ability and delegates correctly. Result shows which ability was channeled.
- [ ] Pilfer: sets goldStolen on result (5-20 range), no HP change on target
- [ ] Mug: deals 3d6 damage AND sets goldStolen + bonusLootRoll on result
- [ ] Bestial Fury with no companion: fails gracefully, no crash, descriptive message
- [ ] Explosive Trap: deals 25 damage to ALL enemies (not just attacker) when triggered
- [ ] Alpha Predator companion HP: companion can intercept attacks (30% chance), takes damage, dies when HP depleted
- [ ] Diplomat's Gambit success: state.status becomes 'COMPLETED', winningTeam is null, combat loop stops
- [ ] Diplomat's Gambit failure: no state changes, turn wasted, combat continues
- [ ] Determinism: same seed produces identical output across runs
- [ ] No unimplemented effect types remain — all 27 effect types now have handlers. The EFFECT_HANDLERS map should have 27 entries (13 Phase 1 + 7 Phase 2 + 7 Phase 3). Note: `special` is one handler that routes internally.
- [ ] Fallback to basic attack should ONLY trigger for truly unknown effect types, not for any of the 27 defined types.

---

## Files Expected to Change

**Modified:**
- `shared/src/types/combat.ts` — ActiveBuff fields, ClassAbilityResult fields, AttackResult fields, CombatState.peacefulResolution, AbilityQueueEntry useWhen union
- `server/src/lib/class-ability-resolver.ts` — 7 new handlers (steal, damage_steal, companion_attack, special, counter, trap, summon), TOME_ELIGIBLE_ABILITIES const, companion auto-damage in tickActiveBuffs, useWhen 'has_companion'
- `server/src/lib/combat-engine.ts` — reactive trigger check in resolveAttack (counter/trap/companion interception), pass enemies to tickActiveBuffs call, apply companion auto-damage to state, check peaceful resolution after class ability
- `server/src/scripts/combat-sim-runner.ts` — handle new result fields, has_companion useWhen condition
- `server/src/scripts/combat-sim-scenarios.ts` — 3 new scenarios (counter-trap, companion, special-abilities)
- `server/src/scripts/combat-sim-logger.ts` — counter/trap/companion/steal/special log formatting

**Do NOT modify:**
- `shared/src/data/skills/*.ts` — ability data is correct as-is
- `server/prisma/schema.prisma` — no schema changes
- `server/src/services/tick-combat-resolver.ts` — no changes needed
- The psion resolver or racial abilities — leave them alone
- Phase 1/2 handlers — don't refactor, add alongside

---

## Constraints

- The resolver file is currently 1327 lines. Phase 3 adds 7 handlers at ~20-40 lines each plus the TOME_ELIGIBLE_ABILITIES const and companion tick logic. Target: stay under **1600 lines total**. If exceeding, extract companion logic or reactive handlers into a separate utility file.
- Do NOT refactor Phase 1/2 handlers. They work.
- Do NOT fix the dead ActiveBuff fields bug (damageReflect, guaranteedHits, extraAction, ccImmune, stealthed, dodgeMod being unused). That's a separate task.
- Do NOT fix the handleDamage critBonus/damageMultiplier bug. That's a separate task.
- Do NOT implement damage type resistances. Display-only.
- Minimal tool calls, brief analysis. Get to implementation quickly.

---

## Deployment

After all implementation and validation:

```bash
git add -A
git commit -m "Phase 3: Counter, trap, summon, companion, steal, special handlers — all 126 class abilities now combat-functional"
git push origin main
```

Then deploy to Azure following the deployment process in CLAUDE.md (unique image tag, not :latest).

No database seed changes needed — ability data is already seeded.
