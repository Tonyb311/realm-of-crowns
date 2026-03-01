# Phase 3 Class Abilities Audit Report

## 1. Resolver State Post-Phase 2

### Line Count
- `class-ability-resolver.ts`: **1327 lines** (originally ~400 Phase 1, expanded through Phase 2)
- `combat-engine.ts`: **2205 lines** (includes psion resolution, turn management, factory helpers)

### EFFECT_HANDLERS Map (20 keys)
```typescript
const EFFECT_HANDLERS: Record<string, EffectHandler> = {
  // Phase 1 (13 handlers)
  damage: handleDamage,
  buff: handleBuff,
  debuff: handleDebuff,
  heal: handleHeal,
  passive: handlePassive,
  status: handleStatus,
  damage_status: handleDamageStatus,
  damage_debuff: handleDamageDebuff,
  drain: handleDrain,
  hot: handleHot,
  cleanse: handleCleanse,
  flee: handleFleeAbility,
  aoe_debuff: handleAoeDebuff,
  // Phase 2 (7 handlers)
  aoe_damage: handleAoeDamage,
  multi_target: handleMultiTarget,
  multi_attack: handleMultiAttack,
  aoe_drain: handleAoeDrain,
  dispel_damage: handleDispelDamage,
  aoe_dot: handleAoeDot,
  delayed_damage: handleDelayedDamage,
};
```

**Unimplemented effect types that will fall back to basic attack:**
- `counter`
- `steal`
- `damage_steal`
- `trap`
- `summon`
- `companion_attack`
- `special`

### Exported Functions (with signatures)

1. `resolveClassAbility(state: CombatState, actorId: string, abilityId: string, targetId?: string, targetIds?: string[]): { state: CombatState; result: ClassAbilityResult }`
2. `applyPassiveAbilities(combatant: Combatant, unlockedAbilityIds: string[]): Combatant`
3. `tickAbilityCooldowns(combatant: Combatant): Combatant`
4. `tickActiveBuffs(combatant: Combatant): { combatant: Combatant; hotHealing: number }`
5. `tickDelayedEffects(state: CombatState, combatant: Combatant): { state: CombatState; combatant: Combatant; detonations: DelayedDetonation[] }`
6. `checkDeathPrevention(combatant: Combatant, unlockedAbilityIds: string[]): { prevented: boolean; abilityName: string; revivedHp: number } | null`
7. `getBuffAttackMod(combatant: Combatant): number`
8. `getBuffAcMod(combatant: Combatant): number`
9. `getBuffDamageMod(combatant: Combatant): number`
10. `getBuffAbsorption(combatant: Combatant): number`
11. `getBuffDamageReduction(combatant: Combatant): number`
12. `consumeAbsorption(combatant: Combatant, damage: number): { combatant: Combatant; remainingDamage: number }`

Additionally, exported type:
```typescript
export interface DelayedDetonation {
  sourceAbilityId: string;
  sourceAbilityName: string;
  sourceActorId: string;
  targetId: string;
  damage: number;
  hpAfter: number;
  killed: boolean;
}
```

### Phase 2 Helpers Added
- `getDeadEnemies(state, actor)` -- returns dead enemies for Corpse Explosion
- `applyStatusEffectToState(state, targetId, effectName, duration, sourceId, damagePerRound?)` -- wrapper around `applyStatusEffect` for immutable state
- `mapStatusName(name)` -- maps ability data status names to engine StatusEffectName

### Multi-Attack Import Pattern
`handleMultiAttack` directly calls `resolveAttack` imported from `combat-engine.ts`:
```typescript
import { applyStatusEffect, resolveAttack, resolveFlee } from './combat-engine';
```
There is **no circular import issue** because `combat-engine.ts` imports from `class-ability-resolver.ts` (the resolver), and `class-ability-resolver.ts` imports individual functions from `combat-engine.ts`. This works because TypeScript/Node.js can resolve these at runtime -- the functions are not referenced at module load time within circular paths.

The resolver constructs a modified weapon with accuracy penalty applied and calls `resolveAttack` per strike, then corrects HP after applying the damage multiplier (since `resolveAttack` applies full damage internally):
```typescript
const modifiedWeapon: WeaponInfo = {
  ...actor.weapon,
  bonusAttack: actor.weapon.bonusAttack + accuracyPenalty,
};
const atk = resolveAttack(state, actor.id, target.id, modifiedWeapon);
// ... correct HP for damageMultiplier
```

### Delayed Damage + tickDelayedEffects
- `handleDelayedDamage` places a `DelayedEffect` on the **target** (not the actor)
- `tickDelayedEffects` is called at the start of each combatant's turn in `resolveTurn` (combat-engine.ts line 1737-1750)
- When `roundsRemaining` reaches 0, dice are rolled and damage is applied to the combatant who has the effect
- Detonations are logged as `StatusTickResult` entries using `'burning'` as a visual proxy

### Cooldown Reduction Passives
Applied in `applyPassiveAbilities`:
```typescript
if (effects.cooldownReduction != null) {
  const val = effects.cooldownReduction as number;
  if (val < 1) {
    // Percentage reduction (e.g., 0.3 = 30%)
    result = { ...result, cooldownReductionPercent: ... };
  } else {
    // Flat reduction (e.g., 1 = 1 round less)
    result = { ...result, cooldownReductionFlat: ... };
  }
}
```
Applied when setting cooldown after ability use in `resolveClassAbility`:
```typescript
let cd = abilityDef.cooldown;
if (updatedActor.cooldownReductionPercent) {
  cd = Math.ceil(cd * (1 - updatedActor.cooldownReductionPercent));
}
if (updatedActor.cooldownReductionFlat) {
  cd = Math.max(0, cd - updatedActor.cooldownReductionFlat);
}
```

### File Organization
Everything is in a single `class-ability-resolver.ts` file. No extracted utility files. The handler map pattern (`EFFECT_HANDLERS`) is clean enough that adding new handlers requires:
1. Write a new `const handleX: EffectHandler = ...` function
2. Add `x: handleX` to the EFFECT_HANDLERS map

---

## 2. Reactive/Counter Patterns in Combat Engine

### hasReaction / reactionType Usage
These fields are **USED exclusively by Psion abilities**:
- `psi-see-3` (Precognitive Dodge) sets `hasReaction: true, reactionType: 'precognitive_dodge'` on the actor
- In `resolveAttack` (line 534-567), after a hit is calculated but before damage is applied, the engine checks:
```typescript
if (roll.hit && target.hasReaction && target.reactionType === 'precognitive_dodge') {
  target = { ...target, hasReaction: false, reactionType: null };
  // Return a MISS result with negatedAttack: true
}
```
This is a **one-shot reaction that completely negates one attack**. After triggering, `hasReaction` is set to `false`.

**KEY FINDING**: This is the only reactive pattern in the entire engine. The `hasReaction`/`reactionType` system is extensible -- a `counter` or `riposte` reaction type could be added with the same pattern.

### Existing Reactive Patterns

1. **Nethkin Infernal Rebuke (melee reflect)** -- In `resolveAttack` (lines 659-669):
```typescript
if (target.race === 'nethkin') {
  const reflectDmg = checkMeleeReflect(target.race, target.level);
  if (reflectDmg > 0) {
    actor = {
      ...actor,
      currentHp: Math.max(0, actor.currentHp - reflectDmg),
      isAlive: actor.currentHp - reflectDmg > 0,
    };
  }
}
```
This is hardcoded inside `resolveAttack` after damage is applied. It triggers **unconditionally** when the target is Nethkin level 25+. It is **not** a generic hook.

2. **Psion Thought Shield** -- In `applyPsychicDamage` (lines 982-989):
```typescript
if (target.characterClass === 'psion') {
  const hasThoughtShield = psionAbilities.some(
    (a) => a.id === 'psi-tel-2' && a.levelRequired <= target.level
  );
  if (hasThoughtShield) {
    damage = Math.floor(damage / 2);
  }
}
```
This is a **passive resistance check**, not a reactive trigger. It applies automatically during psychic damage calculation.

### Where Counter-Attacks Could Inject

The `resolveAttack` function flow is:
1. Calculate attack roll (lines 480-526)
2. Check Precognitive Dodge reaction (lines 534-567) -- **INJECTION POINT A: before damage**
3. Calculate damage if hit (lines 569-609)
4. Apply damage reduction / absorption (lines 612-625)
5. Break mesmerize on damage (lines 628-633)
6. Check death prevention (lines 636-657)
7. Apply damage to target HP (lines 645-657)
8. Nethkin melee reflect (lines 659-669) -- **INJECTION POINT B: after damage applied**
9. Build result and return (lines 672-700)

**Recommended counter-attack injection**: After step 8, before step 9. At this point, `target` has taken damage and is still alive (or not). A counter-attack would:
- Check if `target.hasReaction && target.reactionType === 'riposte'`
- Resolve a simplified attack from target back at actor
- Append counter-attack damage to actor
- Clear the reaction

This follows the exact same pattern as Precognitive Dodge but with damage instead of negation.

### Post-Damage Callback Pattern
**DOES NOT EXIST.** There is no generic `postDamage`, `onHit`, `afterAttack`, or hook system. All reactive effects are hardcoded inline within `resolveAttack`. Phase 3 could either:
- Continue the inline hardcoding approach (simple but messy)
- Introduce a hook array on Combatant (cleaner but more refactoring)

---

## 3. Phase 3 Ability Data (COMPLETE definitions)

### counter abilities

**rog-swa-1: Riposte**
```typescript
{
  id: 'rog-swa-1',
  name: 'Riposte',
  description: 'Counter an incoming attack with a swift strike.',
  class: 'rogue',
  specialization: 'swashbuckler',
  tier: 1,
  effects: {
    type: 'counter',
    counterDamage: 8,
    triggerOn: 'melee_attack'
  },
  cooldown: 2,
  levelRequired: 10
}
```
**Analysis**: Riposte deals flat 8 damage when triggered by a melee attack. `triggerOn: 'melee_attack'` means it should only counter physical melee attacks (not spells, ranged). This is a reactive ability -- the rogue should use their turn to "enter counter stance", then it triggers automatically when attacked. Cooldown 2 means it can be used every other turn.

### steal abilities

**rog-thi-1: Pilfer**
```typescript
{
  id: 'rog-thi-1',
  name: 'Pilfer',
  description: 'Attempt to steal gold from an enemy during combat.',
  class: 'rogue',
  specialization: 'thief',
  tier: 1,
  effects: {
    type: 'steal',
    goldRange: [5, 20]
  },
  cooldown: 3,
  levelRequired: 10
}
```
**Analysis**: Steals 5-20 gold from enemy. The combat engine has NO gold tracking on combatants (see Section 6). This would need to either:
- Track stolen gold as a combat-end bonus (simple)
- Add a `gold` field to Combatant (more complex, monsters would need gold values)

### damage_steal abilities

**rog-thi-5: Mug**
```typescript
{
  id: 'rog-thi-5',
  name: 'Mug',
  description: 'A damaging attack that also steals an item from the enemy.',
  class: 'rogue',
  specialization: 'thief',
  tier: 4,
  effects: {
    type: 'damage_steal',
    diceCount: 3,
    diceSides: 6,
    stealItem: true
  },
  cooldown: 8,
  prerequisiteAbilityId: 'rog-thi-4',
  levelRequired: 30
}
```
**Analysis**: Deals 3d6 damage AND steals an item. Item stealing is even more complex than gold stealing -- the combat engine has no item/inventory tracking during combat. The `stealItem: true` flag implies stealing from the enemy's loot table, which could be modeled as a post-combat bonus item drop.

### trap abilities

**ran-tra-1: Lay Trap**
```typescript
{
  id: 'ran-tra-1',
  name: 'Lay Trap',
  description: 'Place a trap that damages the next enemy that attacks you.',
  class: 'ranger',
  specialization: 'tracker',
  tier: 1,
  effects: {
    type: 'trap',
    trapDamage: 10,
    triggerOn: 'attacked'
  },
  cooldown: 3,
  levelRequired: 10
}
```

**ran-tra-4: Explosive Trap**
```typescript
{
  id: 'ran-tra-4',
  name: 'Explosive Trap',
  description: 'Place a powerful trap that deals area damage when triggered.',
  class: 'ranger',
  specialization: 'tracker',
  tier: 3,
  effects: {
    type: 'trap',
    trapDamage: 25,
    aoe: true,
    triggerOn: 'attacked'
  },
  cooldown: 6,
  prerequisiteAbilityId: 'ran-tra-2',
  levelRequired: 22
}
```
**Analysis**: Both traps trigger when the ranger is attacked (`triggerOn: 'attacked'`). Lay Trap deals 10 damage to the attacker. Explosive Trap deals 25 damage to ALL enemies (AoE). These are reactive effects similar to counter -- the ranger uses a turn to arm the trap, and it triggers on the next incoming attack. The key difference from counter: Explosive Trap is AoE.

### summon abilities

**ran-bea-1: Call Companion**
```typescript
{
  id: 'ran-bea-1',
  name: 'Call Companion',
  description: 'Summon an animal companion that attacks alongside you each round.',
  class: 'ranger',
  specialization: 'beastmaster',
  tier: 1,
  effects: {
    type: 'summon',
    companionDamage: 5,
    duration: 5
  },
  cooldown: 6,
  levelRequired: 10
}
```

**ran-bea-5: Alpha Predator**
```typescript
{
  id: 'ran-bea-5',
  name: 'Alpha Predator',
  description: 'Summon a more powerful alpha companion with increased stats.',
  class: 'ranger',
  specialization: 'beastmaster',
  tier: 4,
  effects: {
    type: 'summon',
    companionDamage: 12,
    companionHp: 50,
    duration: 8
  },
  cooldown: 12,
  prerequisiteAbilityId: 'ran-bea-4',
  levelRequired: 30
}
```
**Analysis**: Summons a companion that "attacks alongside you each round". This implies the companion gets its own attacks, not just a buff. Call Companion: 5 flat damage per round for 5 rounds. Alpha Predator: 12 damage, 50 HP, 8 rounds. The companion having HP (Alpha Predator) means it can be targeted and killed. This is the most complex new subsystem -- see Section 4.

### companion_attack abilities

**ran-bea-4: Bestial Fury**
```typescript
{
  id: 'ran-bea-4',
  name: 'Bestial Fury',
  description: 'Command your companion to make a devastating attack.',
  class: 'ranger',
  specialization: 'beastmaster',
  tier: 3,
  effects: {
    type: 'companion_attack',
    diceCount: 4,
    diceSides: 8
  },
  cooldown: 5,
  prerequisiteAbilityId: 'ran-bea-2',
  levelRequired: 22
}
```
**Analysis**: This is a **directed companion attack** -- the ranger spends their action to command the companion to make a powerful attack (4d8 damage). This requires a companion to be present (summoned via Call Companion or Alpha Predator). If no companion exists, it should fail. This is simpler than the auto-attack companion turn -- it's just "roll 4d8 damage against target if companion is alive".

### special abilities

**bar-dip-4: Diplomat's Gambit**
```typescript
{
  id: 'bar-dip-4',
  name: 'Diplomats Gambit',
  description: 'Offer peace. If the enemy accepts (50% chance), combat ends with no penalties.',
  class: 'bard',
  specialization: 'diplomat',
  tier: 3,
  effects: {
    type: 'special',
    peacefulEnd: true,
    successChance: 0.5
  },
  cooldown: 8,
  prerequisiteAbilityId: 'bar-dip-2',
  levelRequired: 22
}
```

**bar-lor-5: Tome of Secrets**
```typescript
{
  id: 'bar-lor-5',
  name: 'Tome of Secrets',
  description: 'Use a random powerful spell from any class.',
  class: 'bard',
  specialization: 'lorekeeper',
  tier: 4,
  effects: {
    type: 'special',
    randomClassAbility: true,
    powerLevel: 'high'
  },
  cooldown: 8,
  prerequisiteAbilityId: 'bar-lor-4',
  levelRequired: 30
}
```
**Analysis**: See Section 7 for detailed analysis.

---

## 4. Companion/Summon Infrastructure

### Mid-Combat Combatant Addition
**NOT POSSIBLE** with current architecture. `CombatState.combatants` is set once at creation via `createCombatState` which calls `rollAllInitiative`. There is no `addCombatant` function. The `combatants` array is immutably spread during updates, but only via `map` (updating existing entries), never via `push` or `concat` to add new ones.

### controlledBy Field Usage
The `controlledBy` field exists on `Combatant` and is **used exclusively by Psion Dominate/Absolute Dominion**:
- When an enemy is dominated, `controlledBy` is set to the psion's ID and `controlDuration` tracks remaining rounds
- In `resolveTurn` (lines 1779-1829), dominated combatants are forced to attack their own allies
- Control is decremented and cleared when duration expires

This field is **not suitable for companion ownership** because its semantics are "this combatant is mind-controlled by another". A companion would need a different concept (e.g., `ownedBy` or `summonerId`).

### Turn Order Recalculation
`turnOrder` is calculated **once** in `rollAllInitiative` at combat start and **never recalculated**. The `advanceTurn` function iterates through the fixed `turnOrder` array, skipping dead/banished combatants. There is no mechanism to insert a new combatant into the turn order mid-combat.

### Companion Turn Resolution
**NO MECHANISM EXISTS.** Options for implementation:

1. **Buff-based auto-damage** (simplest): Model the companion as a buff on the ranger that deals automatic damage at the start of each turn. No actual combatant added. This is the recommended approach for Phase 3 MVP.
   - Call Companion: Add an `ActiveBuff` with `companionDamage: 5`, tick it each round
   - Alpha Predator: Same but with `companionDamage: 12` and separate HP tracking on the buff

2. **Full combatant insertion** (complex): Add the companion as a real combatant with its own turn. Would require:
   - New `addCombatant(state, combatant)` function
   - Recalculate turn order (or insert at specific position)
   - Track `summonerId` field for ownership
   - Handle companion death separately from character death
   - Sim runner would need to decide companion actions

---

## 5. Trap Trigger Infrastructure

### Existing Per-Turn Hooks
**NONE.** There are no `startOfTurn`, `endOfTurn`, `beforeAction`, `afterAction`, `turnStart`, `turnEnd`, or `onMove` hook systems in the combat engine. The turn resolution flow is:
1. Clear defend stance
2. Process status effects (DoT/HoT)
3. Tick class ability cooldowns and buffs
4. Tick delayed effects (detonation)
5. Process Elementari DoT
6. Check if dead from DoT
7. Check if dominated
8. Check if prevented from acting
9. Resolve chosen action
10. Log, check combat end, advance turn

### Recommended Trap Modeling Approach: **Buff-Based**

Traps should be modeled as `ActiveBuff` entries on the trap-layer (ranger) with a new `trapDamage` field. When the ranger is attacked (in `resolveAttack`), the engine checks for trap buffs and triggers them:

```
ranger uses Lay Trap -> ActiveBuff { sourceAbilityId: 'ran-tra-1', trapDamage: 10, triggerOn: 'attacked', roundsRemaining: 3 }
enemy attacks ranger -> inside resolveAttack, check target.activeBuffs for trap buffs
  -> if found, deal trapDamage to attacker (single-target or AoE)
  -> consume/remove the trap buff
```

This follows the same pattern as Precognitive Dodge and Nethkin melee reflect -- inline reactive checks in `resolveAttack`.

### Alternative: Delayed-Effect-Based
Traps could use the `DelayedEffect` system but with condition-based triggers instead of round-based timers. This would require extending `DelayedEffect` with a `triggerCondition` field. This is more work and less aligned with existing patterns.

### Trigger Conditions Available
Currently, the only condition-based triggers are:
- `hasReaction && reactionType` (one-shot)
- Race-based checks (hardcoded Nethkin)

For traps, the following conditions from ability data need support:
- `triggerOn: 'attacked'` -- when the trap-layer is the target of an attack

---

## 6. Gold/Item System in Combat

### Combatant Gold Tracking
**DOES NOT EXIST.** The `Combatant` interface has no `gold` field. Gold only appears in:
- `DeathPenalty` interface (post-combat calculation)
- `calculateDeathPenalty` function (takes `gold` as parameter from database)

### Combat Inventory
**DOES NOT EXIST.** The `ItemInfo` interface exists but is for **consumable item usage** (healing potions, damage items, buffs), not for looting or stealing. Items are not tracked as inventory during combat -- they are treated as single-use actions.

### Steal Feasibility

**Gold stealing (Pilfer)** -- Two approaches:
1. **Simple (recommended)**: Track stolen gold as a field on `ClassAbilityResult` (e.g., `goldStolen?: number`). The combat-end handler reads this from the log and grants the gold. No changes to `Combatant` needed.
2. **Full**: Add `gold` field to `Combatant`, seed from database during combat init, transfer on steal. More accurate but requires plumbing gold into every combat initialization path.

**Item stealing (Mug)** -- Very complex. The combat engine has no concept of loot tables or item drops during combat. Options:
1. **Simple (recommended)**: Model `stealItem: true` as a post-combat bonus loot roll. Add `bonusLootRoll?: boolean` to `ClassAbilityResult`. The combat-end handler grants an extra loot roll.
2. **Full**: Implement in-combat inventory. NOT RECOMMENDED -- massive scope increase.

---

## 7. "special" Ability Mechanics

### Diplomat's Gambit (bar-dip-4) -- Full Definition + Mechanic Analysis

```typescript
{
  id: 'bar-dip-4',
  name: 'Diplomats Gambit',
  description: 'Offer peace. If the enemy accepts (50% chance), combat ends with no penalties.',
  class: 'bard',
  specialization: 'diplomat',
  tier: 3,
  effects: {
    type: 'special',
    peacefulEnd: true,
    successChance: 0.5
  },
  cooldown: 8,
  prerequisiteAbilityId: 'bar-dip-2',
  levelRequired: 22
}
```

**Mechanic**: Roll percentile. On success (50%), combat immediately ends with status `COMPLETED` and `winningTeam: null` (draw/peace). Neither side takes death penalties, gold loss, or XP loss. On failure, the bard's turn is wasted.

**Implementation complexity**: MEDIUM. Requires:
1. A new handler that can set `state.status = 'COMPLETED'` with `winningTeam: null`
2. A way to flag the combat result as "peaceful" so the combat-end handler skips death penalties
3. A new field on `CombatState` or `ClassAbilityResult` like `peacefulResolution?: boolean`

**POTENTIAL BUG**: The `checkCombatEnd` function only checks alive teams. A peaceful end from Diplomat's Gambit would need a different code path since both teams are still alive.

**PvP consideration**: Should this work in PvP duels? The description says "enemy accepts" -- in PvP, the other player should probably get a choice. In PvE, the 50% roll is fine. This needs a design decision.

### Tome of Secrets (bar-lor-5) -- Full Definition + Mechanic Analysis

```typescript
{
  id: 'bar-lor-5',
  name: 'Tome of Secrets',
  description: 'Use a random powerful spell from any class.',
  class: 'bard',
  specialization: 'lorekeeper',
  tier: 4,
  effects: {
    type: 'special',
    randomClassAbility: true,
    powerLevel: 'high'
  },
  cooldown: 8,
  prerequisiteAbilityId: 'bar-lor-4',
  levelRequired: 30
}
```

**Mechanic**: Randomly selects a powerful ability from the entire class ability pool and resolves it. `powerLevel: 'high'` implies filtering to tier 3-4 abilities.

**Implementation complexity**: HIGH. Requires:
1. Build a curated list of "eligible" abilities (probably all tier 3-4 abilities with effect types that are already implemented -- damage, aoe_damage, heal, buff, etc.)
2. Filter out passives, counter/trap/summon (unimplemented types or non-castable types)
3. Randomly select one
4. Resolve it using the existing EFFECT_HANDLERS map

**SCOPE RISK**: This is actually simpler than it sounds IF the curated list is predefined rather than dynamically computed. A static array of 15-20 eligible ability IDs would be cleaner and more predictable than runtime filtering.

**Design decision needed**: Should the bard get the ability's full effect (including class-specific bonuses)? Or should it be a "generic" version? The description suggests full effect.

---

## 8. Sim Runner Decision System

### simDecideAction Flow

The function `simDecideAction` in `combat-sim-runner.ts` (lines 171-412) follows a strict priority chain:

1. **Check retreat**: If HP% <= `retreatHpThreshold` and not `neverRetreat`, return flee action
2. **Check ability priority queue**: Iterate `abilityQueue` entries, evaluate `useWhen` condition, check cooldown, return first match
3. **Check item usage rules**: Iterate `itemUsageRules`, evaluate conditions, return first match
4. **Spellcasting**: Try highest-level spell first, then cantrips
5. **Default attack**: Attack weakest enemy (lowest HP)
6. **No enemies**: Defend

### Available useWhen Conditions

From `AbilityQueueEntry`:
```typescript
useWhen?: 'always' | 'low_hp' | 'high_hp' | 'first_round' | 'outnumbered';
```

- `always` -- always use when off cooldown
- `low_hp` -- use when HP% <= `hpThreshold` (default 50%)
- `high_hp` -- use when HP% >= `hpThreshold` (default 75%)
- `first_round` -- use only in round 1
- `outnumbered` -- use when enemies > allies

From `ItemUsageRule`:
```typescript
useWhen: 'hp_below' | 'mana_below' | 'status_effect' | 'first_round';
```

### Reactive Ability Handling Gap
**SIGNIFICANT GAP.** The sim's decision system only handles **active** abilities -- abilities the combatant chooses to use on their turn. Reactive abilities (counter, trap) should **not** be selected via `simDecideAction` -- they should trigger automatically when conditions are met (e.g., being attacked).

However, the sim runner DOES need to decide when to "arm" the counter/trap. For example:
- Lay Trap should be used as a turn action (the ranger places the trap)
- Riposte should be used as a turn action (the rogue enters counter stance)

After arming, the effect triggers reactively in `resolveAttack`. The sim runner's existing `useWhen: 'first_round'` or `useWhen: 'always'` conditions work for this.

### Companion Turn Handling Gap
**SIGNIFICANT GAP.** If companions are modeled as auto-damage buffs (recommended), no sim change is needed -- the damage just happens during buff tick. If companions are full combatants, the sim runner would need to handle companion turns with a separate decision function (companions always attack weakest enemy).

---

## 9. ClassAbilityResult Current Shape

```typescript
export interface ClassAbilityResult {
  type: 'class_ability';
  actorId: string;
  abilityId: string;
  abilityName: string;
  effectType: string;
  targetId?: string;
  targetIds?: string[];
  damage?: number;
  healing?: number;
  selfHealing?: number;
  buffApplied?: string;
  buffDuration?: number;
  debuffApplied?: string;
  debuffDuration?: number;
  statusApplied?: StatusEffectName;
  statusDuration?: number;
  statModifiers?: Record<string, number>;
  saveRequired?: boolean;
  saveType?: string;
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  saveSucceeded?: boolean;
  fleeAttempt?: boolean;
  fleeSuccess?: boolean;
  cleansedEffects?: string[];
  description: string;
  targetHpAfter?: number;
  actorHpAfter?: number;
  targetKilled?: boolean;
  /** True when unimplemented effect type falls through to basic attack */
  fallbackToAttack?: boolean;
  /** Per-target breakdown for AoE abilities */
  perTargetResults?: Array<{
    targetId: string;
    targetName: string;
    damage?: number;
    healing?: number;
    statusApplied?: string;
    hpAfter: number;
    killed: boolean;
  }>;
  /** Per-strike breakdown for multi_attack abilities */
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

### Fields Needed for Phase 3
The following fields would need to be added:
- `goldStolen?: number` -- for Pilfer
- `bonusLootRoll?: boolean` -- for Mug's item steal
- `counterDamage?: number` -- for Riposte counter damage dealt
- `trapTriggered?: boolean` -- for trap activation
- `companionDamage?: number` -- for companion/bestial fury damage
- `peacefulResolution?: boolean` -- for Diplomat's Gambit
- `randomAbilityUsed?: string` -- for Tome of Secrets (which ability was selected)

### Other Relevant Result Types
```typescript
export type TurnResult = AttackResult | CastResult | DefendResult | ItemResult | FleeResult
  | RacialAbilityActionResult | PsionAbilityResult | ClassAbilityResult;
```
All result types share an `actorId` field but otherwise have distinct shapes. The `ClassAbilityResult` is the most extensible due to its optional field approach.

---

## 10. State Mutation Patterns

### updateCombatant Signature + Behavior

In `class-ability-resolver.ts` (line 53):
```typescript
function updateCombatant(state: CombatState, id: string, update: Partial<Combatant>): CombatState {
  return {
    ...state,
    combatants: state.combatants.map(c => (c.id === id ? { ...c, ...update } : c)),
  };
}
```
This is a **private helper** (not exported). It creates a new `CombatState` with the targeted combatant shallowly merged with the update.

In `combat-engine.ts`, the same pattern is used but **inline** -- there is no `updateCombatant` helper. The engine directly maps over `state.combatants` to produce new arrays:
```typescript
const combatants = state.combatants.map((c) => {
  if (c.id === targetId) return target;
  if (c.id === actorId) return actor;
  return c;
});
return { ...state, combatants };
```

### Immutability Pattern
The entire system uses **spread-based immutability**. No `immer`, no direct mutation. Every state change produces a new object:
- `{ ...state, combatants: ... }` for state updates
- `{ ...combatant, field: newValue }` for combatant updates
- Arrays use `.map()`, `.filter()`, and spread `[...array, newItem]`

**No direct mutation anywhere.** This is consistent and clean.

### Adding New Combatants
**NOT CURRENTLY POSSIBLE** through any existing function. To add a companion mid-combat:
```typescript
// Would need to add something like:
function addCombatant(state: CombatState, combatant: Combatant): CombatState {
  const updated = { ...state, combatants: [...state.combatants, combatant] };
  // Recalculate turn order?
  return updated;
}
```

However, this raises the question of turn order. The companion would need to be inserted into `turnOrder` or given a separate mechanism.

### Turn Order Recalculation
`rollAllInitiative` recalculates initiative for ALL combatants and rebuilds `turnOrder`:
```typescript
export function rollAllInitiative(state: CombatState): CombatState {
  const combatants = state.combatants.map(calculateInitiative);
  const turnOrder = [...combatants]
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if (b.stats.dex !== a.stats.dex) return b.stats.dex - a.stats.dex;
      return Math.random() - 0.5;
    })
    .map((c) => c.id);
  return { ...state, combatants, turnOrder, round: 1, turnIndex: 0 };
}
```
Calling this mid-combat would **reset the round to 1 and turnIndex to 0**, which is destructive. A separate `insertIntoTurnOrder` function would be needed that doesn't reset round/index.

---

## 11. ActiveBuff System

### Full ActiveBuff Interface
```typescript
export interface ActiveBuff {
  sourceAbilityId: string;
  name: string;
  roundsRemaining: number;
  attackMod?: number;
  acMod?: number;
  damageMod?: number;
  dodgeMod?: number;
  damageReduction?: number;
  damageReflect?: number;
  absorbRemaining?: number;
  hotPerRound?: number;
  guaranteedHits?: number;
  extraAction?: boolean;
  ccImmune?: boolean;
  stealthed?: boolean;
}
```

### Current Buff Types Used (by field)
| Field | Used By | How |
|-------|---------|-----|
| `attackMod` | War Song (bar-bat-1), various | Added to attack rolls via `getBuffAttackMod` |
| `acMod` | Shield of Faith (cle-*), various | Added to AC via `getBuffAcMod` |
| `damageMod` | Analyze (bar-lor-1), various | Added to damage via `getBuffDamageMod` |
| `dodgeMod` | Evasion (rog-swa-3), Untouchable passive | Used for dodge chance (exact integration unclear) |
| `damageReduction` | Stone Skin, etc. | Percentage DR via `getBuffDamageReduction` |
| `damageReflect` | Shield of Thorns, etc. | **DEFINED but NOT CONSUMED in combat engine** |
| `absorbRemaining` | Ward, etc. | Consumed via `consumeAbsorption` in `resolveAttack` |
| `hotPerRound` | Soothing Presence passive, healer HoTs | Applied in `tickActiveBuffs` at turn start |
| `guaranteedHits` | Battle Focus, etc. | **DEFINED but NOT CONSUMED in combat engine** |
| `extraAction` | Haste-like, etc. | **DEFINED but NOT CONSUMED in combat engine** |
| `ccImmune` | Iron Will, etc. | **DEFINED but NOT CONSUMED in combat engine** |
| `stealthed` | Vanish (rog-ass-2) | **DEFINED but NOT CONSUMED in combat engine** |

**BUG FLAG**: Several `ActiveBuff` fields are defined and populated by `handleBuff` but **never consumed** by the combat engine:
- `damageReflect` -- should deal damage back to attackers but `resolveAttack` never checks it
- `guaranteedHits` -- should auto-hit but `resolveAttack` never checks it
- `extraAction` -- should grant a bonus action but `resolveTurn` never checks it
- `ccImmune` -- should prevent status effects but `applyStatusEffect` never checks it
- `stealthed` -- should make untargetable but targeting logic never checks it
- `dodgeMod` -- is set but there's no dodge mechanic in `resolveAttack` (dodge would need to convert to AC or provide miss chance)

These are Phase 1/2 bugs where the buff system was built with fields that were never wired into the engine.

### Buff-Combat Interaction Points
Active buffs interact with combat at these explicit points:
1. `resolveAttack` line 513-517: `getBuffAttackMod(actor)` adds to attack roll
2. `calculateAC` line 338: `getBuffAcMod(combatant)` adds to AC
3. `resolveAttack` line 604-609: `getBuffDamageMod(actor)` adds to damage
4. `resolveAttack` line 612-617: `getBuffDamageReduction(target)` reduces damage
5. `resolveAttack` line 620-625: `consumeAbsorption(target, totalDamage)` absorbs damage
6. `tickClassActiveBuffs` in `resolveTurn`: Decrements durations, applies HoT

### Feasibility of Buff-Based Counter/Trap
**HIGH FEASIBILITY.** Adding new fields to `ActiveBuff` for traps and counters fits naturally:

```typescript
// Proposed new fields:
export interface ActiveBuff {
  // ... existing fields ...
  trapDamage?: number;         // Damage dealt when triggered
  trapAoe?: boolean;           // Whether trap is AoE
  counterDamage?: number;      // Damage dealt on counter
  triggerOn?: 'attacked' | 'melee_attack';  // Trigger condition
  companionDamage?: number;    // Auto-damage per round from companion
  companionHp?: number;        // Companion's HP (if targetable)
}
```

The trigger check would go in `resolveAttack` after the Nethkin reflect check (line 669):
```typescript
// Check for trap/counter buffs on target
const trapBuff = target.activeBuffs?.find(b => b.trapDamage && b.triggerOn === 'attacked');
if (trapBuff) {
  // Deal trap damage to attacker
  // Remove trap buff (one-shot)
}
```

---

## 12. Ability Queue System

### AbilityQueueEntry Type
```typescript
export interface AbilityQueueEntry {
  abilityId: string;
  abilityName: string;
  priority: number;
  useWhen?: 'always' | 'low_hp' | 'high_hp' | 'first_round' | 'outnumbered';
  hpThreshold?: number;
}
```

### Current useWhen Conditions (with descriptions)
| Condition | Description | Implementation |
|-----------|-------------|----------------|
| `always` | Use whenever off cooldown | `shouldUse = true` |
| `low_hp` | Use when HP% <= threshold | `shouldUse = hpPercent <= (entry.hpThreshold ?? 50)` |
| `high_hp` | Use when HP% >= threshold | `shouldUse = hpPercent >= (entry.hpThreshold ?? 75)` |
| `first_round` | Use only in round 1 | `shouldUse = state.round <= 1` |
| `outnumbered` | Use when more enemies than allies | `shouldUse = enemies.length > allies.length` |

### Gaps for Phase 3

New `useWhen` conditions needed:
- `has_companion` -- only use companion_attack when companion is active (buff exists)
- `no_trap_active` -- only lay trap when no trap buff is active (avoid wasting turns)
- `no_counter_active` -- only enter counter stance when not already in one
- `target_has_gold` -- only use Pilfer if target entity type is appropriate (PvE humanoid or PvP)
- `never` -- for reactive abilities like Riposte that should NOT be chosen as turn actions (they auto-trigger)

**Note**: The `priority` field in `AbilityQueueEntry` is defined but **not used** in `simDecideAction`. Abilities are checked in array order, not sorted by priority. This is either a bug or an unused future feature.

---

## 13. Recommended Implementation Approach

### Abilities by Existing Pattern Compatibility

**Can use existing patterns with minor extensions:**
1. **Pilfer (steal)** -- MEDIUM. New handler, add `goldStolen` to result, post-combat gold grant. No engine changes.
2. **Mug (damage_steal)** -- MEDIUM. Combine `handleDamage` pattern with `goldStolen` / `bonusLootRoll` result fields.
3. **Bestial Fury (companion_attack)** -- MEDIUM. New handler: check for companion buff, roll dice, apply damage. Fails if no companion.
4. **Diplomat's Gambit (special: peaceful end)** -- MEDIUM. New handler: roll percentile, on success set state to COMPLETED with `peacefulResolution` flag.
5. **Tome of Secrets (special: random ability)** -- MEDIUM-HIGH. New handler: pick from curated list, delegate to EFFECT_HANDLERS.

**Need new reactive subsystem (buff-triggered reactions in resolveAttack):**
6. **Riposte (counter)** -- MEDIUM. Add `counterDamage`/`triggerOn` to ActiveBuff, check in `resolveAttack` after hit, deal damage back.
7. **Lay Trap (trap)** -- MEDIUM. Same as counter but with different trigger. Add `trapDamage`/`trapAoe`/`triggerOn` to ActiveBuff.
8. **Explosive Trap (trap, AoE)** -- MEDIUM-HIGH. Same as Lay Trap but damages ALL enemies, not just the attacker.

**Need new companion subsystem:**
9. **Call Companion (summon)** -- HIGH. Model as buff with `companionDamage` that auto-deals damage each turn.
10. **Alpha Predator (summon, advanced)** -- HIGH. Same as above but companion has HP and can be killed. Needs `companionHp` tracking on buff.

### Suggested Implementation Order (simplest to most complex)

**Phase 3A -- Simple handlers (no engine changes):**
1. `steal` handler (Pilfer) -- new handler, result field
2. `damage_steal` handler (Mug) -- combine damage + steal
3. `companion_attack` handler (Bestial Fury) -- check buff, roll damage
4. `special: peacefulEnd` handler (Diplomat's Gambit) -- percentile roll, end combat
5. `special: randomClassAbility` handler (Tome of Secrets) -- pick ability, delegate

**Phase 3B -- Reactive subsystem (requires resolveAttack modification):**
6. `counter` handler (Riposte) -- arm buff on turn, trigger in resolveAttack
7. `trap` handler (Lay Trap) -- arm buff on turn, trigger in resolveAttack
8. `trap` handler with AoE (Explosive Trap) -- same but hit all enemies

**Phase 3C -- Companion subsystem (requires buff tick extension):**
9. `summon` handler (Call Companion) -- add companion buff, auto-damage in tick
10. `summon` handler (Alpha Predator) -- companion buff with HP tracking

### Architectural Risks and Design Decisions Needed

1. **Reactive system architecture**: Should the engine use the existing inline-check pattern (like Nethkin reflect) or introduce a proper hook system? Inline is faster to implement but will get messy if more reactive abilities are added in future phases.

2. **Companion as buff vs. combatant**: Strongly recommend buff-based companions for now. Full combatant companions would require ~200+ lines of new infrastructure (turn order management, companion AI, targeting, death handling) and changes to EVERY combat code path.

3. **Gold/item stealing**: Since the combat engine is pure-functional with no database access, gold and items cannot be directly transferred during combat. The cleanest approach is tracking theft results in `ClassAbilityResult` and processing them in the combat-end handler (which has database access).

4. **Diplomat's Gambit in PvP**: Needs a design decision. Options: (a) Always 50% roll, (b) Only works in PvE, (c) In PvP, sends a "peace offer" that the opponent can accept or decline.

5. **Tome of Secrets ability pool**: Needs a curated list. If it randomly picks an ability that requires a companion (companion_attack) or a corpse (corpse explosion), it would fail. The pool should be filtered to abilities that always work (damage, buff, heal, status, debuff, aoe_damage).

6. **ActiveBuff field bloat**: The `ActiveBuff` interface is already large. Adding trap/counter/companion fields will make it larger. Consider whether a separate `TrapEffect` or `CompanionEffect` interface would be cleaner. However, the buff system's tick/expiry mechanics are exactly what these features need, so keeping them as buff fields avoids duplicating tick logic.

### Estimated Complexity Per Ability

| Ability | Effect Type | Complexity | Notes |
|---------|-------------|------------|-------|
| Pilfer (rog-thi-1) | steal | LOW | New handler + result field |
| Mug (rog-thi-5) | damage_steal | LOW | Damage handler + steal result |
| Bestial Fury (ran-bea-4) | companion_attack | LOW | Check buff, roll damage |
| Diplomat's Gambit (bar-dip-4) | special | MEDIUM | Combat end logic |
| Tome of Secrets (bar-lor-5) | special | MEDIUM | Curated list + delegation |
| Riposte (rog-swa-1) | counter | MEDIUM | resolveAttack modification |
| Lay Trap (ran-tra-1) | trap | MEDIUM | resolveAttack modification |
| Explosive Trap (ran-tra-4) | trap (AoE) | MEDIUM-HIGH | AoE in resolveAttack |
| Call Companion (ran-bea-1) | summon | HIGH | Auto-damage buff system |
| Alpha Predator (ran-bea-5) | summon | HIGH | Companion HP tracking |

### Existing Bugs Found in Phase 1/2 Code

1. **Unused ActiveBuff fields**: `damageReflect`, `guaranteedHits`, `extraAction`, `ccImmune`, `stealthed`, and `dodgeMod` are populated by `handleBuff` but never consumed by the combat engine. These are effectively dead code that will mislead players into thinking abilities work when they do not.

2. **AbilityQueueEntry.priority unused**: The `priority` field is defined on `AbilityQueueEntry` but `simDecideAction` processes entries in array order without sorting by priority.

3. **Fleeing sets `isAlive: false`**: In `resolveFlee` (line 963), fled combatants are set to `isAlive: false` AND `hasFled: true`. This means they are treated as "dead" for combat-end checks. While the `hasFled` flag prevents death penalties, the `isAlive: false` means companions or buffs targeting "alive allies" would skip fled characters. This is probably intentional but worth noting.

4. **handleAoeDot bonusVsUndead not applied**: Line 775 has a comment: `// NOTE: bonusVsUndead not applied -- no undead flag exists on combatants`. This is a known limitation documented inline.

5. **handleDamage ignores critBonus and damageMultiplier**: The `handleDamage` handler does not check `effects.critBonus`, `effects.damageMultiplier`, or `effects.requiresStealth` -- these fields are defined on abilities like Backstab (rog-ass-1), Ambush (rog-ass-4), and others but are silently ignored. Backstab's `critBonus: 10` and Ambush's `damageMultiplier: 3.0` are not applied. This means those abilities deal significantly less damage than intended.

6. **handleBuff dodgeMod has no engine integration**: Evasion (rog-swa-3) applies `dodgeMod: 30` as a buff, but there is no dodge/evasion mechanic in `resolveAttack`. The buff is tracked but never affects attack resolution.
