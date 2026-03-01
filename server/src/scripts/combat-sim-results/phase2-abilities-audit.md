# Phase 2 Class Abilities Audit Report

> Generated: 2026-03-01
> Scope: Read-only research across class-ability-resolver.ts, combat-engine.ts, racial-combat-abilities.ts, all 6 class skill data files, combat types, and combat sim scenarios.

---

## 1. Phase 1 Resolver Architecture

### Function Signature

```typescript
export function resolveClassAbility(
  state: CombatState,
  actorId: string,
  abilityId: string,
  targetId?: string,
  targetIds?: string[],
): { state: CombatState; result: ClassAbilityResult }
```

**Note:** The `targetIds` parameter is accepted in the signature but **never used** by any Phase 1 handler. It is passed through from `resolveTurn()` in the combat engine (`action.targetIds`), but no handler reads it. This is a prepared hook for Phase 2.

### EFFECT_HANDLERS Map (13 keys)

```typescript
const EFFECT_HANDLERS: Record<string, EffectHandler> = {
  damage:        handleDamage,
  buff:          handleBuff,
  debuff:        handleDebuff,
  heal:          handleHeal,
  passive:       handlePassive,
  status:        handleStatus,
  damage_status: handleDamageStatus,
  damage_debuff: handleDamageDebuff,
  drain:         handleDrain,
  hot:           handleHot,
  cleanse:       handleCleanse,
  flee:          handleFleeAbility,
  aoe_debuff:    handleAoeDebuff,
};
```

### Handler Function Signature

All handlers share the same `EffectHandler` type:

```typescript
type EffectHandler = (
  state: CombatState,
  actor: Combatant,
  target: Combatant | null,
  enemies: Combatant[],
  abilityDef: AbilityDefinition,
  effects: Record<string, any>,
) => { state: CombatState; result: Partial<ClassAbilityResult> };
```

- `state`: Full combat state (immutable pattern — functions return new state)
- `actor`: The combatant using the ability (already looked up)
- `target`: Single target resolved from `targetId` (may be null)
- `enemies`: All alive, non-fled enemies of the actor (pre-filtered)
- `abilityDef`: Full ability definition from shared data
- `effects`: The `abilityDef.effects` cast to `Record<string, any>`

Handlers return `Partial<ClassAbilityResult>` — the main resolver merges this with base fields (`type`, `actorId`, `abilityId`, `abilityName`, `effectType`).

### How Effects JSON Is Read

1. Ability definition is looked up from `abilityMap` (a `Map<string, AbilityDefinition>` built at module load from `ALL_ABILITIES`).
2. `effects` is cast: `const effects = abilityDef.effects as Record<string, any>;`
3. `effectType` is read: `const effectType = (effects.type as string) ?? 'unknown';`
4. The `effectType` string is used to look up a handler from `EFFECT_HANDLERS`.
5. Each handler reads specific keys from `effects` with defaults: e.g., `(effects.bonusDamage as number) ?? 0`.

### How Damage Is Calculated

**In `handleDamage`:**
- Uses local `rollDice()` function which calls `rollMultiple(diceCount, diceSides) + bonus` from `@shared/utils/dice`.
- Combines weapon damage (if actor has a weapon) + ability dice damage + flat bonus.
- Weapon damage: `rollDice(weapon.diceCount, weapon.diceSides, statMod + weapon.bonusDamage)`.
- Ability damage: `rollDice(effects.diceCount, effects.diceSides)`.
- Total: `Math.max(0, weaponDmg + abilityDmg + bonusDamage)`.
- Does NOT use `resolveAttack()` — no attack roll, no AC check, no crit logic. Direct damage application.

**In `handleDamageStatus`:**
- Uses flat `effects.damage` + optional dice: `damage + (diceCount > 0 ? rollDice(diceCount, diceSides) : 0)`.
- No weapon damage component.

**In `handleDrain`:**
- Pure dice: `rollDice(diceCount, diceSides)` with heal = `floor(totalDamage * healPercent / 100)`.

**In `handleDamageDebuff`:**
- Pure dice: `rollDice(diceCount, diceSides)`.

### How Targets Are Resolved

In `resolveClassAbility()`:
```typescript
const target = getTarget(state, targetId);    // single target lookup
const enemies = getEnemies(state, actor);      // all alive non-fled enemies
```

- `getTarget()` returns `state.combatants.find(c => c.id === targetId) ?? null`
- `getEnemies()` returns `state.combatants.filter(c => c.team !== actor.team && c.isAlive && !c.hasFled)`

Both are passed to every handler. Most handlers use only `target`. The only handler that uses `enemies` is `handleAoeDebuff` (iterates all enemies to apply blinded status).

**`targetIds` is never consumed** — it is accepted in the function signature but never forwarded to handlers or used.

### Result Building Pattern

1. Handler returns `{ state, result: Partial<ClassAbilityResult> }`.
2. Main resolver merges:
```typescript
const result: ClassAbilityResult = {
  type: 'class_ability',
  actorId,
  abilityId,
  abilityName: abilityDef.name,
  effectType,
  targetId: targetId,
  ...partialResult,
  description: partialResult.description ?? abilityDef.name,
};
```
3. Cooldown is set after handler execution if `abilityDef.cooldown > 0`.

### Fallback Behavior

When `effectType` has no matching handler:
1. Logs a `console.warn` with the ability name and effect type.
2. Returns a result with `fallbackToAttack: true`.
3. In `resolveTurn()` (combat-engine.ts), if `fallbackToAttack === true` AND there is a `targetId` AND the actor has a weapon, it calls `resolveAttack()` for a basic weapon attack.

### File Line Count

**857 lines** (`class-ability-resolver.ts`)

### Additional Exported Functions

- `applyPassiveAbilities(combatant, unlockedAbilityIds)` — applies passive effects at combat start (bonus HP, regen buffs, dodge buffs, death prevention tracking)
- `tickAbilityCooldowns(combatant)` — decrements all cooldowns by 1, removes entries that hit 0
- `tickActiveBuffs(combatant)` — decrements buff durations, removes expired, applies HoT healing
- `checkDeathPrevention(combatant, unlockedAbilityIds)` — checks for `cheatingDeath`/`reviveOnDeath` passives
- `getBuffAttackMod`, `getBuffAcMod`, `getBuffDamageMod`, `getBuffDamageReduction`, `getBuffAbsorption` — query buff modifiers
- `consumeAbsorption(combatant, damage)` — consume absorb shield HP from buffs

---

## 2. Combat Engine Multi-Target Patterns

### The `class_ability` Case in `resolveTurn()`

```typescript
case 'class_ability': {
  if (!action.classAbilityId) {
    result = { type: 'defend', actorId, acBonusGranted: 0 } as DefendResult;
    break;
  }
  const classAbility = resolveClassAbility(
    current, actorId, action.classAbilityId, action.targetId, action.targetIds
  );
  current = classAbility.state;
  result = classAbility.result;
  // If effect type is unimplemented, fall back to basic attack
  if (classAbility.result.fallbackToAttack && action.targetId && context.weapon) {
    const atk = resolveAttack(current, actorId, action.targetId, context.weapon, racialContext?.tracker);
    current = atk.state;
    result = atk.result;
  }
  break;
}
```

Key observations:
- `action.targetIds` IS passed through (from `CombatAction.targetIds`)
- The resolver is called with both `targetId` and `targetIds`
- Fallback to attack only uses single `targetId`

### Buff Tick Processing

In `resolveTurn()`, lines 1715-1728:
```typescript
// Process class ability cooldowns and buff ticks at start of turn
const actorAfterStatus = current.combatants.find((c) => c.id === actorId)!;
const cooldownTicked = tickClassAbilityCooldowns(actorAfterStatus);
const { combatant: buffTicked, hotHealing: classHotHealing } = tickClassActiveBuffs(cooldownTicked);
if (classHotHealing > 0) {
  ticks.push({ combatantId: actorId, effectName: 'regenerating', healing: classHotHealing, ... });
}
```

This happens BEFORE the action is resolved, at the start of each combatant's turn.

### Cooldown Decrement

`tickAbilityCooldowns()` in class-ability-resolver.ts (lines 586-598):
- Iterates all entries in `combatant.abilityCooldowns`
- Decrements by 1
- Removes entries that reach 0
- Called at start of each turn via `tickClassAbilityCooldowns`

### How `resolveAttack()` Works (damage application)

```typescript
export function resolveAttack(
  state: CombatState,
  actorId: string,
  targetId: string,
  weapon: WeaponInfo,
  racialTracker?: RacialCombatTracker
): { state: CombatState; result: AttackResult }
```

This is a **single-target** function. It:
1. Gets actor and target from state
2. Applies racial passive modifiers
3. Makes attack roll (d20 + mods vs AC)
4. On hit: rolls weapon damage via `calculateDamage()`
5. Applies class buff modifiers (attack, damage, DR, absorption)
6. Checks death prevention (racial and class)
7. Checks melee reflect
8. Returns updated state with single AttackResult

**`resolveAttack` does NOT support multiple targets.** Each target requires a separate call.

### Psion Multi-Target Abilities

Two psion abilities hit multiple targets via inline loops in `resolvePsionAbility()`:

**1. psi-tel-5 (Mind Shatter) — AoE damage + status to all enemies:**
```typescript
case 'psi-tel-5': {
  const enemies = current.combatants.filter(
    (c) => c.team !== updatedActor.team && c.isAlive
  );
  let totalDamage = 0;
  const affectedIds: string[] = [];

  for (const enemy of enemies) {
    // Per-enemy: WIS save, 3d6+INT psychic, half on save
    const save = savingThrow(totalSaveMod, saveDC);
    const rawDmg = damageRoll(3, 6, intMod);
    let dmg = rawDmg.total;
    if (save.success) dmg = Math.floor(dmg / 2);
    // Apply damage + weakened status if failed save
    // Update combatant in state
    affectedIds.push(enemy.id);
    totalDamage += dmg;
  }

  return {
    state: current,
    result: {
      type: 'psion_ability', actorId, abilityName, abilityId,
      targetIds: affectedIds, damage: totalDamage, saveRequired: true, saveDC,
      description: `Mind Shatter hits ${affectedIds.length} enemies for ${totalDamage} psychic damage.`,
    },
  };
}
```

**2. psi-nom-5 (Rift Walk) — AoE damage + slow to all enemies:**
Same pattern as Mind Shatter but with 2d8+INT and slowed status. Identical loop structure.

**Pattern:** Filter all alive enemies, iterate with per-target saves, accumulate total damage, return `targetIds` array in result.

### Racial Ability AoE — Breath Weapon

The Drakonid Breath Weapon in `racial-combat-abilities.ts` uses the same pattern:

```typescript
case 'Breath Weapon': {
  const enemies = getEnemies(state, actor);
  let current = state;
  const hitTargets: string[] = [];

  for (const enemy of enemies) {
    const saveDC = 8 + conMod + proficiency;
    const save = savingThrow(dexMod, saveDC);
    const actualDamage = save.success ? Math.floor(totalDamage / 2) : totalDamage;
    const newHp = Math.max(0, enemy.currentHp - actualDamage);
    current = updateCombatant(current, enemy.id, {
      currentHp: newHp,
      isAlive: newHp > 0,
    });
    hitTargets.push(enemy.id);
  }

  return { ..., combatLog: [makeLog(actor.id, abilityName, ..., { targetIds: hitTargets, damage: totalDamage })] };
}
```

### Other Racial Multi-Target Patterns

Several racial abilities apply effects to all allies:
- **Human Rally Cry**: Iterates `[actor, ...allies]`, applies `blessed` status to each
- **Orc Clan Warhorn**: Same pattern, applies `blessed` + `hasted` to all allies
- **Drakonid Frightful Presence**: Iterates all enemies, applies `weakened` status

These all use the same pattern: get target list -> iterate -> `updateCombatant()` per target -> collect `targetIds`.

---

## 3. Phase 2 Ability Effect Data (EXACT JSON)

### aoe_damage Abilities

**war-ber-3 — Cleave** (Warrior / Berserker, Tier 2)
```json
{ "type": "aoe_damage", "targets": "all_adjacent", "damageMultiplier": 0.8 }
```
Cooldown: 3, Level: 16

**mag-ele-1 — Fireball** (Mage / Elementalist, Tier 1)
```json
{ "type": "aoe_damage", "element": "fire", "diceCount": 3, "diceSides": 6 }
```
Cooldown: 2, Level: 10

**mag-ele-5 — Meteor Strike** (Mage / Elementalist, Tier 4)
```json
{ "type": "aoe_damage", "element": "fire", "diceCount": 6, "diceSides": 8 }
```
Cooldown: 10, Level: 30

**mag-nec-3 — Corpse Explosion** (Mage / Necromancer, Tier 2)
```json
{ "type": "aoe_damage", "requiresCorpse": true, "diceCount": 4, "diceSides": 6 }
```
Cooldown: 4, Level: 16

**cle-pal-5 — Divine Wrath** (Cleric / Paladin, Tier 4)
```json
{ "type": "aoe_damage", "element": "radiant", "diceCount": 5, "diceSides": 8 }
```
Cooldown: 10, Level: 30

**ran-sha-5 — Rain of Arrows** (Ranger / Sharpshooter, Tier 4)
```json
{ "type": "aoe_damage", "hitsPerTarget": 2, "diceCount": 2, "diceSides": 8 }
```
Cooldown: 10, Level: 30

**bar-bat-6 — Epic Finale** (Bard / Battlechanter, Tier 5)
```json
{ "type": "aoe_damage", "element": "sonic", "baseDice": 4, "diceSides": 8, "bonusPerRound": 5 }
```
Cooldown: 12, Level: 40

**Observations:**
- Cleave uses `targets: "all_adjacent"` and `damageMultiplier: 0.8` (no dice defined — presumably uses weapon damage)
- Fireball/Meteor Strike/Divine Wrath use `diceCount`/`diceSides` (pure ability dice, no weapon)
- Corpse Explosion requires `requiresCorpse: true` — needs dead combatant check
- Rain of Arrows uses `hitsPerTarget: 2` — multiple damage rolls per enemy
- Epic Finale uses `baseDice` (not `diceCount`) and `bonusPerRound` — scales with combat duration

### aoe_dot Abilities

**cle-pal-3 — Consecrate** (Cleric / Paladin, Tier 2)
```json
{ "type": "aoe_dot", "element": "radiant", "damagePerRound": 6, "duration": 3, "bonusVsUndead": 2.0 }
```
Cooldown: 5, Level: 16

**Observations:**
- Only one ability uses this type.
- `bonusVsUndead: 2.0` implies double damage vs undead — needs entity type check.
- Duration-based: damage applied each round for 3 rounds to all enemies.

### aoe_drain Abilities

**mag-nec-5 — Soul Harvest** (Mage / Necromancer, Tier 4)
```json
{ "type": "aoe_drain", "diceCount": 3, "diceSides": 8, "healPerTarget": 8 }
```
Cooldown: 10, Level: 30

**Observations:**
- Deals 3d8 to all enemies.
- Heals caster 8 HP per target hit (not percentage-based like single-target `drain`).

### multi_attack Abilities

**war-ber-4 — Frenzy** (Warrior / Berserker, Tier 3)
```json
{ "type": "multi_attack", "strikes": 2, "accuracyPenalty": -3 }
```
Cooldown: 4, Level: 22

**rog-swa-2 — Dual Strike** (Rogue / Swashbuckler, Tier 2)
```json
{ "type": "multi_attack", "strikes": 2, "damageMultiplier": 0.7 }
```
Cooldown: 2, Level: 14

**rog-swa-4 — Flurry of Blades** (Rogue / Swashbuckler, Tier 3)
```json
{ "type": "multi_attack", "strikes": 4, "damageMultiplier": 0.4 }
```
Cooldown: 6, Level: 22

**Observations:**
- All use `strikes` for hit count.
- Frenzy uses `accuracyPenalty` (attack roll modifier).
- Dual Strike and Flurry use `damageMultiplier` (damage scaling per hit).
- These are single-target multi-hit (attack the same target N times), NOT AoE.
- Should use `resolveAttack()` per strike (needs attack roll, AC check, crit logic per hit).

### multi_target Abilities

**mag-ele-3 — Chain Lightning** (Mage / Elementalist, Tier 2)
```json
{ "type": "multi_target", "element": "lightning", "targets": 3, "diceCount": 2, "diceSides": 6 }
```
Cooldown: 3, Level: 16

**ran-sha-2 — Multi-Shot** (Ranger / Sharpshooter, Tier 2)
```json
{ "type": "multi_target", "targets": 3, "diceCount": 1, "diceSides": 8 }
```
Cooldown: 3, Level: 14

**Observations:**
- `targets: 3` means hit UP TO 3 enemies (not necessarily all enemies).
- Damage is rolled per target (separate `diceCount`/`diceSides` per hit).
- Chain Lightning has `element: "lightning"`.
- Multi-Shot has no element (physical arrows).
- These differ from `aoe_damage` in that they hit a limited number of targets, not all.

### delayed_damage Abilities

**rog-ass-5 — Death Mark** (Rogue / Assassin, Tier 4)
```json
{ "type": "delayed_damage", "delay": 3, "diceCount": 8, "diceSides": 6 }
```
Cooldown: 10, Level: 30

**Observations:**
- Mark an enemy, then after 3 rounds the damage detonates (8d6).
- Requires a new tracking mechanism for deferred effects — nothing exists today.
- The mark is applied to a specific target. After `delay` rounds, damage fires automatically.
- Questions: Does the target need to be alive? Does it bypass saves? Can the mark be cleansed?

### dispel_damage Abilities

**cle-inq-4 — Purging Flame** (Cleric / Inquisitor, Tier 3)
```json
{ "type": "dispel_damage", "damagePerBuff": 8 }
```
Cooldown: 6, Level: 22

**Observations:**
- Removes all buffs from an enemy.
- Deals 8 damage per buff removed.
- Needs to count `target.activeBuffs.length`, clear them, then deal `count * 8` damage.
- Questions: Does it also remove positive status effects (blessed, shielded, etc.)? Or only `activeBuffs` from class abilities?

---

### Additional Unimplemented Effect Types Found (Not in Research Prompt)

These effect types also have no handler in Phase 1:

| Effect Type | Abilities Using It |
|---|---|
| `steal` | rog-thi-1 Pilfer |
| `counter` | rog-swa-1 Riposte |
| `damage_steal` | rog-thi-5 Mug |
| `trap` | ran-tra-1 Lay Trap, ran-tra-4 Explosive Trap |
| `summon` | ran-bea-1 Call Companion, ran-bea-5 Alpha Predator |
| `companion_attack` | ran-bea-4 Bestial Fury |
| `special` | bar-dip-4 Diplomat's Gambit, bar-lor-5 Tome of Secrets |

---

## 4. CombatState Structure

### Full CombatState Type

```typescript
export interface CombatState {
  sessionId: string;
  type: 'PVE' | 'PVP' | 'DUEL' | 'ARENA' | 'WAR';
  status: 'ACTIVE' | 'COMPLETED';
  round: number;
  turnIndex: number;
  combatants: Combatant[];
  /** Turn order by combatant id, sorted by initiative descending */
  turnOrder: string[];
  log: TurnLogEntry[];
  winningTeam: number | null;
}
```

### Full Combatant Type

```typescript
export interface Combatant {
  id: string;
  name: string;
  entityType: 'character' | 'monster';
  team: number;
  stats: CharacterStats;
  level: number;
  currentHp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  statusEffects: StatusEffect[];
  spellSlots: SpellSlots;
  weapon: WeaponInfo | null;
  isAlive: boolean;
  isDefending: boolean;
  proficiencyBonus: number;
  race?: string;
  subRace?: { id: string; element?: string } | null;
  controlledBy?: string | null;
  controlDuration?: number;
  banishedUntilRound?: number | null;
  hasReaction?: boolean;
  reactionType?: string | null;
  lastAction?: CombatAction | null;
  characterClass?: string | null;
  specialization?: string | null;
  hasFled?: boolean;
  abilityCooldowns?: Record<string, number>;
  abilityUsesThisCombat?: Record<string, number>;
  activeBuffs?: ActiveBuff[];
}
```

### How to Get Enemies

In class-ability-resolver.ts:
```typescript
function getEnemies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => c.team !== actor.team && c.isAlive && !c.hasFled);
}
```

In racial-combat-abilities.ts:
```typescript
function getEnemies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => c.team !== actor.team && c.isAlive);
}
```

**BUG FLAG:** The two `getEnemies` functions have different behavior — the class-ability version excludes fled combatants, the racial version does not. This is inconsistent but the class-ability version is more correct.

### How to Get Allies

In racial-combat-abilities.ts:
```typescript
function getAllies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => c.team === actor.team && c.isAlive && c.id !== actor.id);
}
```

**No `getAllies` helper exists in class-ability-resolver.ts** — Phase 2 will need to add one for party-target abilities.

### Team/Side Tracking

Teams are tracked via `Combatant.team` (a number). Typically:
- Team 0 = player side
- Team 1 = monster/opponent side

`CombatAction.targetIds` exists in the type for AoE abilities. Currently only used by racial abilities in `resolveTurn()`.

---

## 5. Combat Sim Team Structure

### How Teams Are Assigned

Each `CombatantDef` in a scenario has a `team: number` field. Team 0 vs Team 1 for duels, can support 3+ teams for arena.

### CombatantDef Full Type

```typescript
export interface CombatantDef {
  id: string;
  name: string;
  entityType: 'character' | 'monster';
  team: number;
  stats: CharacterStats;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  weapon: WeaponInfo;
  spellSlots?: SpellSlots;
  spells?: SpellInfo[];
  items?: ItemInfo[];
  race?: string;
  subRace?: { id: string; element?: string } | null;
  characterClass?: string;
  specialization?: string;
  unlockedAbilityIds?: string[];
  stance?: CombatStance;
  retreatHpThreshold?: number;
  neverRetreat?: boolean;
  abilityQueue?: AbilityQueueEntry[];
  itemUsageRules?: ItemUsageRule[];
}
```

### class-abilities Scenario

```typescript
const classAbilities: ScenarioDef = {
  name: 'class-abilities',
  description: 'L10 Warrior (Berserker) vs L10 Cleric (Healer) — tests class ability dispatch, buffs, heals, cooldowns',
  type: 'DUEL',
  combatants: [
    {
      id: 'warrior-1',
      name: 'Grukk the Berserker',
      entityType: 'character',
      team: 0,
      stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 10 },
      level: 10,
      hp: 78, maxHp: 78, ac: 16,
      weapon: makeWeapon('Greataxe', 1, 12, 'str', 0, 0, 'SLASHING'),
      race: 'orc',
      characterClass: 'Warrior',
      specialization: 'Berserker',
      unlockedAbilityIds: ['war-ber-1'], // Reckless Strike only
      abilityQueue: [
        { abilityId: 'war-ber-1', abilityName: 'Reckless Strike', priority: 1, useWhen: 'always' },
      ],
      stance: 'AGGRESSIVE',
      neverRetreat: true,
    },
    {
      id: 'cleric-1',
      name: 'Sister Aelith',
      entityType: 'character',
      team: 1,
      stats: { str: 10, dex: 12, con: 14, int: 12, wis: 18, cha: 14 },
      level: 10,
      hp: 62, maxHp: 62, ac: 17,
      weapon: makeWeapon('Mace', 1, 6, 'str', 0, 0, 'BLUDGEONING'),
      race: 'human',
      characterClass: 'Cleric',
      specialization: 'Healer',
      unlockedAbilityIds: ['cle-hea-1'], // Healing Light only
      abilityQueue: [
        { abilityId: 'cle-hea-1', abilityName: 'Healing Light', priority: 1, useWhen: 'low_hp', hpThreshold: 60 },
      ],
      stance: 'DEFENSIVE',
      neverRetreat: true,
    },
  ],
};
```

**Observations:**
- Only tests Tier 1 abilities (Reckless Strike + Healing Light)
- `unlockedAbilityIds` controls which abilities the combatant has access to
- `abilityQueue` with `useWhen` conditions controls AI behavior
- Phase 2 will need new scenarios testing AoE, multi-target, delayed, and dispel abilities

---

## 6. Delayed Effect Tracking

### Existing Mechanisms: NONE

Searched for `delay`, `deferred`, `pending`, `scheduled`, `timer`, `countdown` in:
- `server/src/lib/combat-engine.ts` — **NOT FOUND**
- `server/src/lib/class-ability-resolver.ts` — **NOT FOUND**
- `shared/src/types/combat.ts` — **NOT FOUND**

### What Needs to Be Built

For Death Mark (`rog-ass-5`):

1. **New field on Combatant** or CombatState:
   ```typescript
   delayedEffects?: DelayedEffect[];
   ```

2. **DelayedEffect interface:**
   ```typescript
   interface DelayedEffect {
     id: string;
     sourceId: string;          // who applied it
     targetId: string;          // who it will hit
     roundsRemaining: number;   // countdown
     effectType: string;        // 'damage', 'status', etc.
     diceCount: number;
     diceSides: number;
     abilityId: string;
     abilityName: string;
   }
   ```

3. **Tick processing:** At the start of the target's turn (or end of round), decrement `roundsRemaining`. When it hits 0, resolve the deferred damage.

4. **Decision needed:** Should delayed effects be stored on the target (Combatant) or on the CombatState? The psion `banishedUntilRound` pattern stores the round on the Combatant itself, which is the existing precedent.

The closest existing analog is `banishedUntilRound` on Combatant, which is a simple round counter checked at turn start. A similar pattern could work: add `delayedDamageEffects` to Combatant, tick them down in the buff processing step.

---

## 7. Damage Type System

### Are Damage Types Tracked?

**Partially.** In `WeaponInfo`:
```typescript
damageType?: string;  // 'SLASHING', 'PIERCING', 'BLUDGEONING', etc.
```

In `AttackResult`:
```typescript
damageType?: string;
```

The `resolveAttack()` function passes `weapon.damageType` through to the result for display purposes.

### Do They Affect Mechanics?

**Minimally.** The combat engine does NOT have a general damage type resolution system. However:

1. **Weapon damage types** (SLASHING, PIERCING, BLUDGEONING) are tracked on `WeaponInfo` and displayed in `AttackResult` but have no mechanical effect in combat resolution.

2. **Racial resistances** handle specific elements in a hardcoded fashion:
   - Nethkin: Fire resistance 50% (handled per-case in racial abilities, not via a general system)
   - Psion: `applyPsychicDamage()` checks for Thought Shield resistance (hardcoded)

3. **Ability effect data** includes `element` fields (fire, ice, lightning, radiant, sonic, shadow) but the class-ability-resolver **does not read or use the `element` field at all**. These are purely data annotations today.

### Summary

- Damage types exist in the data but are largely **display-only** for class abilities.
- No general damage type → resistance/vulnerability system exists.
- Phase 2 could optionally implement this but it is NOT required for the effect type handlers to function.

---

## 8. Dead Combatant Tracking

### How Death Is Handled

When a combatant's HP drops to 0:
```typescript
target = {
  ...target,
  currentHp: Math.max(0, target.currentHp - totalDamage),
  isAlive: target.currentHp - totalDamage > 0,
};
```

Dead combatants are set `isAlive: false` but are **NOT removed** from `state.combatants`. They remain in the array with `isAlive: false` and `currentHp: 0`.

### Are Corpses Kept in State?

**YES.** Dead combatants stay in the `combatants` array. They are:
- Excluded from `getEnemies()` (filters `c.isAlive`)
- Excluded from `getAllies()` (filters `c.isAlive`)
- Skipped in turn order (via `advanceTurn()` which checks `combatant.isAlive`)
- Checked in `checkCombatEnd()` which counts alive teams

### How to Check for Available Corpses

For Corpse Explosion (`mag-nec-3`, `requiresCorpse: true`):
```typescript
const corpses = state.combatants.filter(c => !c.isAlive && c.team !== actor.team);
```

This will find dead enemies. The data has no concept of corpse proximity, so any dead enemy could serve as the corpse.

**Additional note:** There is no "corpse cleanup" mechanism — dead combatants persist for the entire combat, so corpses are always available once an enemy dies.

---

## 9. Cooldown Reduction Passives

### Phase 1 Passive Handling

`applyPassiveAbilities()` in class-ability-resolver.ts handles these passive effects:
- `bonusHpFromCon` — adds bonus HP
- `hpRegenPerRound` — adds a permanent HoT buff
- `cheatingDeath` / `reviveOnDeath` — tracks usage for death prevention
- `dodgeBonus` — adds a permanent dodge buff

### Cooldown Reduction: NOT IMPLEMENTED

**Arcane Mastery (mag-ele-6):**
```json
{ "type": "passive", "cooldownReduction": 0.3 }
```
This means 30% shorter cooldowns. No code reads `cooldownReduction` anywhere in the codebase. Searched `server/src/lib/` and `server/src/` — zero matches.

**Spell Weaver (mag-enc-6):**
```json
{ "type": "passive", "cooldownReduction": 1 }
```
This means cooldowns reduced by 1 round (flat). Same field name, different interpretation (percentage vs flat). Also not implemented.

### What Needs to Be Added

1. In `applyPassiveAbilities()`, detect `cooldownReduction` on passive abilities.
2. Store cooldown reduction data on the combatant (new field or in `activeBuffs`).
3. In `resolveClassAbility()` where cooldowns are set:
   ```typescript
   if (abilityDef.cooldown > 0) {
     finalState = updateCombatant(finalState, actorId, {
       abilityCooldowns: { ..., [abilityId]: abilityDef.cooldown },
     });
   }
   ```
   Apply the reduction here: e.g., `Math.max(1, Math.ceil(abilityDef.cooldown * (1 - reductionPercent)))` for Arcane Mastery, or `Math.max(0, abilityDef.cooldown - flatReduction)` for Spell Weaver.

4. **Design decision needed:** Both passives use `cooldownReduction` but with different semantics (0.3 = 30% vs 1 = flat 1 round). Either:
   - Use the value to determine: if < 1 treat as percentage, if >= 1 treat as flat
   - Rename one of them (e.g., `cooldownReductionFlat` vs `cooldownReductionPercent`)
   - Handle by ability ID

**BUG FLAG:** The two passives use the same JSON key `cooldownReduction` with incompatible semantics. Arcane Mastery uses 0.3 (interpreted as 30%), Spell Weaver uses 1 (interpreted as "1 round flat"). This ambiguity must be resolved before implementation.

---

## 10. Recommended Implementation Approach

### Effect Types That Can Reuse Existing Patterns

| Effect Type | Reuse Pattern | Notes |
|---|---|---|
| `aoe_damage` | Psion Mind Shatter / Drakonid Breath Weapon loop | Iterate enemies, per-target damage roll, update state per combatant |
| `aoe_drain` | Combine `aoe_damage` loop + `handleDrain` self-heal | Same loop + accumulate heal amount |
| `aoe_debuff` | Already implemented (handleAoeDebuff) | Could extend for damage variant |
| `multi_target` | Psion Mind Shatter pattern with `targets` limit | Same loop but `enemies.slice(0, targets)` |
| `dispel_damage` | New but simple: count buffs, clear, deal damage | Uses existing `activeBuffs` array on Combatant |

### Effect Types That Need New Infrastructure

| Effect Type | What's Needed |
|---|---|
| `delayed_damage` | New `DelayedEffect` tracking on Combatant or CombatState, tick processing in turn loop, detonation logic |
| `aoe_dot` | New persistent AoE zone concept OR apply DoT status to all enemies with custom damage tracking |
| `multi_attack` | Needs to call `resolveAttack()` N times with modified params (accuracy penalty, damage multiplier). Must handle per-hit crit, per-hit death checks. |

### Suggested Handler Implementation Order

1. **`aoe_damage`** — Most abilities use it (7 abilities). Clear pattern from psion. Highest impact.
2. **`multi_target`** — Variation of aoe_damage with target cap. 2 abilities.
3. **`multi_attack`** — 3 abilities. Requires resolveAttack() integration. Different from AoE (single target, multiple hits).
4. **`aoe_drain`** — 1 ability. Simple extension of aoe_damage + self heal.
5. **`dispel_damage`** — 1 ability. Straightforward buff removal + damage calc.
6. **`aoe_dot`** — 1 ability. Requires decision on zone tracking vs status application.
7. **`delayed_damage`** — 1 ability. Requires most new infrastructure (delayed effect tracking system).

### Architectural Risks

1. **Damage application inconsistency:** Phase 1 handlers apply damage directly (`clampHp`, `updateCombatant`) without going through `resolveAttack()`. This means no attack rolls, no AC checks, no crit logic, no racial modifiers, no buff interactions. This is intentional for spells but `multi_attack` should use `resolveAttack()` for weapon-based hits. The handler will need to call the exported `resolveAttack()` function, which is a different pattern than all other handlers.

2. **`targetIds` plumbing:** While `resolveClassAbility()` accepts `targetIds`, it is never forwarded to handlers. The handler signature has `enemies: Combatant[]` which is pre-filtered. For `multi_target` with a cap, handlers could use `enemies.slice(0, targets)`. For target-selected AoE, `targetIds` may need to be passed through.

3. **Corpse Explosion dependency:** Requires checking `!isAlive` combatants. Current `getEnemies()` filters them out. Will need a separate `getDeadEnemies()` helper.

4. **aoe_dot zone tracking:** No zone/persistent-effect system exists. Options: (a) apply a custom status effect to all current enemies with `damagePerRound`, or (b) track as a state-level effect that hits all enemies each round. Option (a) is simpler and consistent with existing patterns but means new enemies entering combat would not be affected (unlikely in this game).

5. **Epic Finale round scaling:** Needs access to `state.round` to calculate bonus damage. The handler signature already receives `state`, so this is accessible.

6. **Cooldown reduction ambiguity:** `cooldownReduction: 0.3` vs `cooldownReduction: 1` have different semantics. Must be disambiguated before implementation.

7. **`handleAoeDebuff` already exists** for Smoke Bomb but only applies `blinded` status — does not deal damage. The new `aoe_damage` handler is a superset. Consider whether `aoe_debuff` should be refactored to merge with or extend the new handler.

---

## Appendix: Complete Effect Type Coverage

| Effect Type | Phase 1 Handler | Phase 2 Needed | Ability Count |
|---|---|---|---|
| `damage` | handleDamage | No | 9 |
| `buff` | handleBuff | No | 11 |
| `debuff` | handleDebuff | No | 5 |
| `heal` | handleHeal | No | 4 |
| `passive` | handlePassive | Partial (cooldown reduction) | 16 |
| `status` | handleStatus | No | 5 |
| `damage_status` | handleDamageStatus | No | 2 |
| `damage_debuff` | handleDamageDebuff | No | 1 |
| `drain` | handleDrain | No | 2 |
| `hot` | handleHot | No | 1 |
| `cleanse` | handleCleanse | No | 1 |
| `flee` | handleFleeAbility | No | 1 |
| `aoe_debuff` | handleAoeDebuff | No | 1 |
| **`aoe_damage`** | — | **YES** | **7** |
| **`multi_attack`** | — | **YES** | **3** |
| **`multi_target`** | — | **YES** | **2** |
| **`aoe_drain`** | — | **YES** | **1** |
| **`aoe_dot`** | — | **YES** | **1** |
| **`delayed_damage`** | — | **YES** | **1** |
| **`dispel_damage`** | — | **YES** | **1** |
| `steal` | — | Future | 1 |
| `counter` | — | Future | 1 |
| `damage_steal` | — | Future | 1 |
| `trap` | — | Future | 2 |
| `summon` | — | Future | 2 |
| `companion_attack` | — | Future | 1 |
| `special` | — | Future | 2 |

**Phase 2 scope: 7 new handlers covering 16 abilities.**
**Future scope: 7 additional handlers covering 10 abilities.**
