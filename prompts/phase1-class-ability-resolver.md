# Phase 1: Class Ability Resolver — Infrastructure + Simple Effects

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed (frontend, backend, game design, narrative, art direction, etc.).
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable. Ensure game mechanics, narrative, UI, and code all align.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed. Don't pad the team.
- Common roles include (but aren't limited to):
  - **Game Designer** — Mechanics, systems, balance, progression, combat
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies.
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Keep scope realistic for a browser game. Avoid over-engineering.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

Also read the full audit report for reference:
```bash
cat server/src/scripts/combat-sim-results/class-abilities-audit.md
```

---

## The Problem

126 class abilities exist across 7 classes (3 specs × 6 abilities each). The 18 Psion abilities are fully integrated via a dedicated 665-line resolver. The remaining **108 non-psion abilities** are defined in data, seeded to DB, unlockable by players via skill tree API — but have **zero combat effect**.

Root causes:
1. No `class_ability` action type in `CombatActionType`
2. Ability queue in tick-combat-resolver dispatches ALL queued abilities as `racial_ability` — wrong type, silently fails
3. No cooldown or uses-per-combat tracking on `Combatant`
4. No resolver function for class abilities
5. 6 status effects referenced by abilities don't exist: `polymorph`, `silence`, `mesmerize`, `skip_turn`, `root`, `taunt`

## Phase 1 Scope

Build the **data-driven class ability resolver framework** and implement **13 simple effect types** that map to existing combat primitives. This covers approximately 60 of the 108 abilities.

### Effect Types for Phase 1

| # | Effect Type | What It Does | Approx Abilities Using It |
|---|-------------|-------------|--------------------------|
| 1 | `damage` | Bonus damage attack (flat bonus, accuracy mod, crit bonus) | Reckless Strike, Commanding Strike, Backstab, Smite, Aimed Shot, etc. |
| 2 | `buff` | Self/ally stat modification with duration (AC, attack, dodge, damage) | Blood Rage, Fortify, Rally Cry, Evasion, War Song, Holy Armor, etc. |
| 3 | `debuff` | Enemy stat reduction with duration | Enfeeble, Denounce, Charming Words, Excommunicate, etc. |
| 4 | `heal` | Direct HP restoration | Healing Light, Miracle, Legendary Commander |
| 5 | `passive` | Always-on combat effect (crit chance, regen, death prevention, bonus HP) | Shadow Mastery, Unbreakable, Inspiring Presence, Quick Fingers, etc. |
| 6 | `status` | Apply a status effect to target | Taunt, Silence, Silver Tongue (skip_turn), Enthrall (mesmerize) |
| 7 | `damage_status` | Damage + status effect | Shield Bash (dmg + stun), Frost Lance (dmg + slow) |
| 8 | `damage_debuff` | Damage + stat reduction | Shatter (sonic dmg + -4 AC) |
| 9 | `drain` | Damage that heals caster by percentage | Life Drain, Judgment |
| 10 | `hot` | Heal over time with duration | Regeneration (5 HP/round, 5 rounds) |
| 11 | `cleanse` | Remove negative status effects | Purify (remove 1 debuff) |
| 12 | `flee` | Enhanced flee attempt | Disengage (90% success) |
| 13 | `aoe_debuff` | AoE accuracy/stat reduction | Smoke Bomb (-5 accuracy, 2 rounds) |

### NOT in Phase 1 (Phase 2+)

These require new subsystems and will be handled separately:
- `aoe_damage`, `aoe_dot`, `aoe_drain` — multi-target damage resolution
- `multi_attack`, `multi_target` — multiple strikes/targets per action
- `delayed_damage` — deferred damage tracking
- `dispel_damage` — buff removal mechanics
- `counter`, `trap` — reactive trigger systems
- `summon`, `companion_attack` — entity management
- `steal`, `damage_steal` — economy hooks in combat
- `special` — unique one-off mechanics

**For abilities whose effect type is NOT in Phase 1**: The resolver must **gracefully skip** them with a log message like `"Ability X uses effect type 'summon' which is not yet implemented"` and fall through to a default attack. Do NOT crash, do NOT silently ignore. Log and fallback.

---

## Implementation Requirements

### 1. Type Changes (`shared/src/types/combat.ts`)

**Add `class_ability` to CombatActionType:**
```typescript
export type CombatActionType = 'attack' | 'cast' | 'defend' | 'item' | 'flee' | 'racial_ability' | 'psion_ability' | 'class_ability';
```

**Add `classAbilityId` to CombatAction:**
```typescript
export interface CombatAction {
  // ... existing fields ...
  classAbilityId?: string;
}
```

**Add `ClassAbilityResult` type:**
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
  fallbackToAttack?: boolean;  // True when unimplemented effect type falls through
}
```

**Add to TurnResult union:**
```typescript
export type TurnResult = AttackResult | CastResult | DefendResult | ItemResult | FleeResult | RacialAbilityActionResult | PsionAbilityResult | ClassAbilityResult;
```

**Add ability combat state to Combatant:**
```typescript
export interface Combatant {
  // ... existing fields ...
  abilityCooldowns?: Record<string, number>;     // abilityId -> rounds remaining
  abilityUsesThisCombat?: Record<string, number>; // abilityId -> times used
  activeBuffs?: ActiveBuff[];
  characterClass?: string | null;  // already exists, just confirming
  specialization?: string | null;
}

export interface ActiveBuff {
  sourceAbilityId: string;
  name: string;
  roundsRemaining: number;
  attackMod?: number;
  acMod?: number;
  damageMod?: number;
  dodgeMod?: number;
  damageReduction?: number;    // percentage (0-1)
  damageReflect?: number;      // percentage (0-1)
  absorbRemaining?: number;    // flat damage absorption pool
  hotPerRound?: number;        // healing per round
  guaranteedHits?: number;     // remaining guaranteed hits
  extraAction?: boolean;
  ccImmune?: boolean;
  stealthed?: boolean;         // untargetable
}
```

### 2. New Status Effects (`shared/src/types/combat.ts`)

Add to `StatusEffectName`:
```typescript
export type StatusEffectName =
  | 'poisoned' | 'stunned' | 'blessed' | 'burning' | 'frozen'
  | 'paralyzed' | 'blinded' | 'shielded' | 'weakened' | 'hasted'
  | 'slowed' | 'regenerating' | 'dominated' | 'banished' | 'phased' | 'foresight'
  // New for class abilities:
  | 'polymorph' | 'silence' | 'mesmerize' | 'skip_turn' | 'root' | 'taunt';
```

**Status effect behaviors** (implement in combat-engine.ts `applyStatusTick` or equivalent):

| Status | Effect |
|--------|--------|
| `polymorph` | Cannot use abilities or cast. Attack reduced to 1d4 base. AC set to 10. |
| `silence` | Cannot use abilities that deal magic damage or apply status effects. Can still basic attack. |
| `mesmerize` | Cannot act (like stun). Breaks on taking damage. |
| `skip_turn` | Skip next turn, then auto-remove. |
| `root` | Cannot flee. AC penalty (-3). Can still attack and use abilities. |
| `taunt` | Must target the taunter. Cannot flee or use abilities on other targets. |

### 3. Data-Driven Resolver (`server/src/lib/class-ability-resolver.ts`)

Create a NEW file — do NOT add to the existing 1950-line combat-engine.ts. The resolver should:

**A. Look up ability data:**
```typescript
import { ALL_ABILITIES } from '@shared/data/skills';

export function resolveClassAbility(
  state: CombatState,
  actorId: string,
  abilityId: string,
  targetId?: string,
  targetIds?: string[]
): { state: CombatState; result: ClassAbilityResult }
```

- Find the ability definition from `ALL_ABILITIES` by `abilityId`
- Validate the actor has the ability (check `characterClass` + `specialization` match, or just trust the dispatch — the preset system already validated)
- Check cooldown: if `abilityCooldowns[abilityId] > 0`, fall through to default attack with description "Ability X is on cooldown (Y rounds remaining)"
- Check uses-per-combat for passives with `1x/combat` limits

**B. Dispatch by effect type:**

Use a clean function map pattern, NOT a giant switch:

```typescript
const EFFECT_HANDLERS: Record<string, EffectHandler> = {
  damage: handleDamage,
  buff: handleBuff,
  debuff: handleDebuff,
  heal: handleHeal,
  passive: handlePassive, // Passives are always-on; if dispatched, just describe and skip
  status: handleStatus,
  damage_status: handleDamageStatus,
  damage_debuff: handleDamageDebuff,
  drain: handleDrain,
  hot: handleHot,
  cleanse: handleCleanse,
  flee: handleFlee,
  aoe_debuff: handleAoeDebuff,
};
```

Unrecognized effect types → log warning + fallback to basic attack.

**C. Effect handler details:**

Each handler reads from the ability's `effects` JSON (the `Record<string, unknown>` field on `AbilityDefinition`). Look at the actual effect data in each class file (e.g., `shared/src/data/skills/warrior.ts`) to understand the shape. The effects JSON varies by type but commonly includes:

- `bonusDamage: number` — flat damage bonus
- `accuracyMod: number` — attack roll modifier
- `critBonus: number` — added to crit range
- `acBonus: number` — AC modifier
- `attackBonus: number` — attack modifier
- `dodgeBonus: number` — dodge modifier
- `duration: number` — rounds
- `damageReduction: number` — percentage
- `damageReflect: number` — percentage
- `healAmount: string` — dice expression like "2d8+3"
- `statusEffect: string` — status to apply
- `statusDuration: number` — rounds
- `selfAcPenalty: number` — penalty to self
- `healPercent: number` — percentage of damage healed
- `saveType: string` — ability save type
- `saveDC: number` or a formula

**For each handler, use existing combat-engine.ts functions where possible:**
- Use `rollDice()` for dice expressions
- Use `calculateAttackRoll()` patterns for hit/miss
- Use `applyDamage()` patterns for HP modification  
- Use `applyStatusEffect()` for status application
- Use the existing save system (`rollSave()` etc.) for abilities requiring saves

**D. Cooldown management:**

After successful ability use:
```typescript
if (abilityDef.cooldown > 0) {
  actor.abilityCooldowns[abilityId] = abilityDef.cooldown;
}
```

At start of each combatant's turn (in the turn resolution flow):
```typescript
// Decrement all cooldowns by 1
for (const id in combatant.abilityCooldowns) {
  if (combatant.abilityCooldowns[id] > 0) {
    combatant.abilityCooldowns[id]--;
  }
}
```

**E. Passive ability handling:**

Passives should be applied when building the combatant at combat start, NOT during turn resolution. Create a function:

```typescript
export function applyPassiveAbilities(combatant: Combatant, unlockedAbilityIds: string[]): Combatant
```

This should:
- Filter `ALL_ABILITIES` for the combatant's unlocked passives
- Apply permanent effects: bonus HP (Unbreakable: +20% CON as HP), crit chance (Shadow Mastery: +15%), regen (Inspiring Presence: 3 HP/round as permanent HoT), etc.
- Handle "1x per combat" passives (Undying Fury, Lichdom, Resurrection) by setting `abilityUsesThisCombat[id] = 0`
- Death prevention passives: hook into the death check — if HP drops to 0 and a death prevention passive hasn't been used, restore HP and mark it used

### 4. Combat Engine Integration (`server/src/lib/combat-engine.ts`)

**In `resolveTurn`**, add the `class_ability` case:

```typescript
case 'class_ability': {
  const { resolveClassAbility } = require('./class-ability-resolver');
  return resolveClassAbility(state, action.actorId, action.classAbilityId!, action.targetId, action.targetIds);
}
```

(Or use a proper import at the top — whatever avoids circular dependencies. The resolver is in a separate file specifically to avoid bloating combat-engine.ts.)

**Add buff tick processing** alongside status effect ticks at the start of each turn:
- Decrement `activeBuffs[].roundsRemaining`
- Remove expired buffs
- Apply HoT from buffs
- Apply cooldown decrements
- Check death prevention passives when HP hits 0

**Buff modifiers must feed into existing calculations:**
- Attack roll: include `activeBuffs` attack modifiers
- AC calculation: include `activeBuffs` AC modifiers  
- Damage calculation: include `activeBuffs` damage modifiers
- Damage absorption: check `absorbRemaining` before applying damage to HP
- Damage reduction: apply percentage reduction before absorption
- Guaranteed hits: skip attack roll, auto-hit

### 5. Fix Ability Queue Dispatch (`server/src/services/tick-combat-resolver.ts`)

The `decideAction` function currently dispatches ALL queued abilities as `racial_ability`. Fix this:

```typescript
// BEFORE (broken):
return {
  action: {
    type: 'racial_ability',
    actorId,
    racialAbilityName: entry.abilityName,
    targetId: target?.id,
    targetIds: enemies.map(e => e.id),
  },
  context: {},
};

// AFTER (fixed):
// Determine if this is a class ability or racial ability
const isClassAbility = ALL_ABILITIES.some(a => a.id === entry.abilityId || a.name === entry.abilityName);

if (isClassAbility) {
  return {
    action: {
      type: 'class_ability',
      actorId,
      classAbilityId: entry.abilityId,
      targetId: target?.id,
      targetIds: enemies.map(e => e.id),
    },
    context: {},
  };
} else {
  return {
    action: {
      type: 'racial_ability',
      actorId,
      racialAbilityName: entry.abilityName,
      targetId: target?.id,
      targetIds: enemies.map(e => e.id),
    },
    context: {},
  };
}
```

Also: the `decideAction` function must check cooldowns before queuing an ability. If the ability is on cooldown, skip it and try the next entry in the queue.

### 6. Combatant Building (`server/src/services/tick-combat-resolver.ts`)

Where combatants are built from character data (the `buildCombatParams` or equivalent function):

- Load `CharacterAbility` records and populate `combatant.abilityCooldowns = {}` (all start at 0)
- Load `combatant.abilityUsesThisCombat = {}`
- Call `applyPassiveAbilities()` to apply always-on effects
- Set `combatant.activeBuffs = []`
- Set `combatant.characterClass` and `combatant.specialization` from character data

### 7. Combat Simulator Updates (`server/src/scripts/combat-sim-runner.ts`)

**Update `simDecideAction`** with the same fix as tick-combat-resolver — dispatch class abilities as `class_ability` not `racial_ability`.

**Update `CombatantDef`** in `combat-sim-scenarios.ts` to support:
- `unlockedAbilityIds?: string[]` — list of ability IDs this combatant has unlocked
- Passive application at sim start

**Add one new scenario: `class-abilities`** that tests Phase 1 abilities:
- L15 Human Warrior (Berserker) with Reckless Strike + Blood Rage vs L15 Orc Warrior (no abilities)
- Verifies: damage bonus applies, self-AC penalty applies, buff duration ticks down, cooldown tracks

**Update sim logging** in `combat-sim-logger.ts` to handle `ClassAbilityResult`:
- Log ability name, effect type, damage/healing/buff/debuff details
- Color: magenta for class abilities (distinct from cyan rolls, red damage, green healing)

### 8. Buff Display in Combat Log

The existing `combat-logger.ts` (the production combat log, not the sim) needs to handle `ClassAbilityResult` in its log formatting. Add a case for the new result type that describes what happened in player-readable text.

---

## Implementation Order

1. Type changes first (combat.ts) — everything else depends on these
2. New status effects + their tick behavior in combat-engine.ts
3. Class ability resolver (new file: class-ability-resolver.ts)
4. Combat engine integration (resolveTurn case + buff tick processing)
5. Fix tick-combat-resolver dispatch + combatant building
6. Combat simulator updates + new scenario
7. Combat logger updates
8. TypeScript compilation check (`npx tsc --noEmit`)
9. Run combat sim with `class-abilities` scenario to verify

---

## Validation Criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run combat-sim -- --scenario=class-abilities --seed=42` runs successfully
- [ ] Class ability resolves with correct damage/buff values in sim output
- [ ] Cooldown prevents re-use before expiry
- [ ] Buff duration decrements and expires correctly
- [ ] Existing scenarios (`basic-melee`, `racial-abilities`, etc.) still work unchanged
- [ ] Unimplemented effect types (summon, trap, counter, etc.) log a warning and fallback to attack — no crash
- [ ] New status effects (polymorph, silence, mesmerize, skip_turn, root, taunt) apply and tick correctly
- [ ] Passive abilities apply at combat start (verify via sim combatant stats)
- [ ] Death prevention passive triggers when HP hits 0 (test with a scenario if time permits)

---

## Files Expected to Change

**New files:**
- `server/src/lib/class-ability-resolver.ts` — the main resolver

**Modified files:**
- `shared/src/types/combat.ts` — new types, action type, status effects
- `server/src/lib/combat-engine.ts` — resolveTurn case, buff ticks, new status tick behavior, damage absorption check
- `server/src/services/tick-combat-resolver.ts` — fix dispatch, combatant building
- `server/src/scripts/combat-sim-runner.ts` — fix dispatch, passive application
- `server/src/scripts/combat-sim-scenarios.ts` — new class-abilities scenario
- `server/src/scripts/combat-sim-logger.ts` — ClassAbilityResult logging
- `server/src/services/combat-logger.ts` — production log formatting (if exists as separate file; may be in combat-engine.ts)

**Do NOT modify:**
- `shared/src/data/skills/*.ts` — ability data is correct, don't touch it
- `server/prisma/schema.prisma` — schema is complete, no changes needed
- `server/src/routes/skills.ts` — skill tree API is working, leave it alone
- `server/src/scripts/seed-abilities.ts` — seeding is correct

---

## Deployment

After all implementation and validation:

```bash
git add -A
git commit -m "Phase 1: Class ability resolver framework + 13 effect types + 6 new status effects + combat sim integration"
git push origin main
```

Then deploy to Azure following the deployment process in CLAUDE.md (unique image tag, not :latest).

Then run database seed in production if any seed changes were made (likely not needed for Phase 1 since ability data is already seeded — but confirm).

---

## Constraints

- Keep `class-ability-resolver.ts` under 800 lines. If it's growing past that, you're over-engineering the handlers. Each simple effect handler should be 20-40 lines.
- Do NOT refactor the existing Psion resolver. It works. Leave it alone. Phase 1 is parallel infrastructure, not a rewrite.
- Do NOT add any frontend changes. This is purely backend combat engine work.
- Do NOT add any new API routes. The existing skill tree and combat preset APIs are sufficient.
- Minimal tool calls, brief analysis. Get to implementation quickly.
