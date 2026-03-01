# Research Task: Phase 3 Class Ability Audit — Counter, Trap, Summon, Companion, Steal, Special

You are a research analyst preparing a comprehensive audit for the Team Lead. Your job is to investigate the current state of the Phase 2 class ability resolver and document everything needed to implement Phase 3 effect types — the final 10 abilities requiring new subsystems.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

## Research Steps

### 1. Current Resolver State Post-Phase 2

Read the full resolver and document its current architecture:

```bash
wc -l server/src/lib/class-ability-resolver.ts
grep -n "^function\|^export function\|EFFECT_HANDLERS" server/src/lib/class-ability-resolver.ts
```

Then read the full file:
```bash
cat server/src/lib/class-ability-resolver.ts
```

Document:
- Total line count
- Complete EFFECT_HANDLERS map (all 20 keys from Phase 1 + Phase 2)
- All exported functions (signatures)
- Any helper functions added in Phase 2 (getDeadEnemies, etc.)
- How handleMultiAttack integrates with resolveAttack (did it import directly? inline? circular import resolution?)
- How handleDelayedDamage + tickDelayedEffects work
- How cooldown reduction passives are stored and applied
- Any AoE utility functions that were extracted

### 2. Combat Engine Reaction/Response Patterns

Phase 3 needs reactive abilities (counter, trap). Research how the engine handles reactions:

```bash
cat server/src/lib/combat-engine.ts
```

Focus on:
- `hasReaction` and `reactionType` fields on Combatant — are they used? Where?
- Is there any existing "after being attacked" hook or callback pattern?
- How does the turn resolution flow: action → damage → death check? Where could a counter-attack inject?
- Is there a `postDamage` or `onHit` or `afterAttack` hook point?
- How does `resolveAttack()` return results — could a counter-attack be appended after a hit lands?
- The Psion ability `Thought Shield` (passive reflect) — does it trigger after being hit? How?
- Any racial abilities that trigger reactively (e.g., Nethkin fire reflect, melee reflect)?

Search for reactive patterns:
```bash
grep -n "reflect\|counter\|react\|retaliat\|riposte\|afterHit\|onDamage\|postAttack\|melee.*reflect" server/src/lib/combat-engine.ts | head -30
grep -n "reflect\|counter\|react\|retaliat" server/src/lib/racial-combat-abilities.ts | head -20
```

### 3. Phase 3 Ability Data — Exact Effect Shapes

Read each relevant class file and extract the EXACT effects JSON for every Phase 3 ability:

```bash
cat shared/src/data/skills/rogue.ts
cat shared/src/data/skills/ranger.ts
cat shared/src/data/skills/bard.ts
```

For EACH ability using these effect types, paste the COMPLETE ability definition (not just effects — include name, id, description, cooldown, level, prerequisites, everything):

- `counter` — rog-swa-1 Riposte
- `steal` — rog-thi-1 Pilfer
- `damage_steal` — rog-thi-5 Mug
- `trap` — ran-tra-1 Lay Trap, ran-tra-4 Explosive Trap
- `summon` — ran-bea-1 Call Companion, ran-bea-5 Alpha Predator
- `companion_attack` — ran-bea-4 Bestial Fury
- `special` — bar-dip-4 Diplomat's Gambit, bar-lor-5 Tome of Secrets

### 4. Companion/Summon System Investigation

Summoned creatures need to act in combat. Research what infrastructure exists:

```bash
grep -n "summon\|companion\|pet\|minion\|spawn\|addCombatant\|insertCombatant" server/src/lib/combat-engine.ts | head -20
grep -n "summon\|companion\|pet\|minion" shared/src/types/combat.ts | head -20
```

Document:
- Is there any way to add a combatant mid-combat?
- Does `CombatState.combatants` get modified during combat (push new entries)?
- Does `turnOrder` get recalculated when combatants change?
- Is there a concept of a "summoned" or "controlled" entity? (`controlledBy` field exists — what does it do?)
- How would a companion take turns? Same turn order? Bonus action?

### 5. Trap Mechanic Investigation

Traps trigger on enemy action. Research turn-order hooks:

```bash
grep -n "startOfTurn\|endOfTurn\|beforeAction\|afterAction\|turnStart\|turnEnd\|onMove" server/src/lib/combat-engine.ts | head -20
```

Document:
- Is there any per-turn hook system?
- How could a trap trigger "when an enemy attacks" or "at the start of an enemy's turn"?
- The existing `statusEffects` tick system — could traps be modeled as a special status on the caster that checks enemy actions?
- Or should traps be modeled like `delayedEffects` but triggered by conditions rather than timers?

### 6. Gold/Item System in Combat

Steal and Mug involve taking gold or items. Research:

```bash
grep -n "gold\|coins\|currency\|inventory\|items\|loot" server/src/lib/combat-engine.ts | head -20
grep -n "gold\|coins\|currency\|inventory\|items\|loot" shared/src/types/combat.ts | head -20
grep -n "gold\|coins\|inventory" server/src/lib/class-ability-resolver.ts | head -20
```

Document:
- Does the Combatant interface have gold/inventory?
- Is there any loot system in combat?
- How does the existing `ItemInfo` work in combat (if at all)?
- Is gold tracked per-combatant or only on character entities?
- If no gold/item system exists in combat state, document what would need to be added vs. what could be deferred (e.g., gold tracked post-combat rather than during)

### 7. The "special" Effect Type Investigation

Diplomat's Gambit and Tome of Secrets use `type: "special"`. These are unique mechanics. Read their full descriptions and effects:

```bash
grep -A 30 "Diplomat's Gambit\|bar-dip-4" shared/src/data/skills/bard.ts
grep -A 30 "Tome of Secrets\|bar-lor-5" shared/src/data/skills/bard.ts
```

Document the exact mechanic each one is trying to do — these might need completely custom handlers.

### 8. Sim Runner Action Decision Logic

The sim's AI needs to know when to use these new ability types. Research how ability decisions work:

```bash
grep -n "simDecideAction\|decideAction\|abilityQueue\|useWhen\|chooseAbility" server/src/scripts/combat-sim-runner.ts | head -20
```

Then read the decision function:
```bash
cat server/src/scripts/combat-sim-runner.ts
```

Document:
- How does `simDecideAction` pick which ability to use?
- What `useWhen` conditions exist? (always, low_hp, first_round, etc.)
- How would reactive abilities (counter) work with the current decision system? (They shouldn't be "chosen" — they trigger automatically)
- How would the sim decide to lay a trap vs. attack?
- How would companions get their own turn actions?

### 9. ClassAbilityResult Current Shape

Document the exact current shape after Phase 2 additions:

```bash
grep -A 40 "export interface ClassAbilityResult" shared/src/types/combat.ts
```

Also check for any other result types that might be relevant for Phase 3:
```bash
grep -n "Result\b" shared/src/types/combat.ts | head -20
```

### 10. Combat State Mutation Patterns

Phase 3 needs to add combatants (summon), modify turn order, and set up persistent effects (traps). Document how state is mutated:

```bash
grep -n "updateCombatant\|updateState\|setCombatant" server/src/lib/class-ability-resolver.ts | head -20
grep -n "function updateCombatant\|function updateState" server/src/lib/combat-engine.ts | head -10
```

Document:
- `updateCombatant()` signature and behavior
- How does state immutability work? (spread pattern? immer? direct mutation?)
- Is there a way to add new combatants to state? Or only update existing ones?
- How is `turnOrder` calculated? Can it be recalculated mid-combat?

### 11. Active Buff System Detail

Counter and trap might be modeled as buffs. Document the ActiveBuff system in full:

```bash
grep -A 15 "export interface ActiveBuff" shared/src/types/combat.ts
grep -n "activeBuff\|ActiveBuff" server/src/lib/class-ability-resolver.ts | head -30
grep -n "activeBuff\|ActiveBuff" server/src/lib/combat-engine.ts | head -30
```

Document:
- Full ActiveBuff interface
- All buff types currently used
- How buffs interact with combat resolution (AC mod, attack mod, damage mod, etc.)
- Could a "counter_stance" or "trap_armed" buff type be added to trigger reactive effects?

### 12. Existing Ability Queue Entry Type

```bash
grep -A 10 "AbilityQueueEntry\|abilityQueue" shared/src/types/combat.ts | head -30
grep -A 10 "AbilityQueueEntry\|abilityQueue" server/src/scripts/combat-sim-scenarios.ts | head -20
```

Document the full type — Phase 3 may need new `useWhen` conditions like `has_companion`, `trap_ready`, etc.

## Output

Write your complete findings to: `server/src/scripts/combat-sim-results/phase3-abilities-audit.md`

Use this exact structure:

```markdown
# Phase 3 Class Abilities Audit Report

## 1. Resolver State Post-Phase 2
- Line count: [number]
- EFFECT_HANDLERS map: [list all 20 keys]
- Exported functions: [list with signatures]
- Phase 2 helpers added: [list]
- Multi-attack import pattern: [describe how circular imports were handled]
- File organization: [any extracted utility files?]

## 2. Reactive/Counter Patterns in Combat Engine
- hasReaction/reactionType usage: [describe or "UNUSED"]
- Existing reactive patterns: [melee reflect, thought shield, etc.]
- Where counter-attacks could inject: [describe hook points]
- Post-damage callback pattern: [exists/doesn't exist]

## 3. Phase 3 Ability Data (COMPLETE definitions)
For each ability, paste the FULL definition object from the data file:
### counter abilities
### steal abilities
### damage_steal abilities
### trap abilities
### summon abilities
### companion_attack abilities
### special abilities

## 4. Companion/Summon Infrastructure
- Mid-combat combatant addition: [possible/not possible]
- controlledBy field usage: [describe]
- Turn order recalculation: [describe]
- Companion turn resolution: [describe or "NO MECHANISM"]

## 5. Trap Trigger Infrastructure
- Existing per-turn hooks: [describe or "NONE"]
- Recommended trap modeling approach: [buff-based / delayed-effect-based / new system]
- Trigger conditions available: [list]

## 6. Gold/Item System in Combat
- Combatant gold tracking: [exists/doesn't exist]
- Combat inventory: [describe]
- Steal feasibility: [describe what exists vs what needs building]

## 7. "special" Ability Mechanics
### Diplomat's Gambit — full definition + mechanic analysis
### Tome of Secrets — full definition + mechanic analysis

## 8. Sim Runner Decision System
- simDecideAction flow: [describe]
- Available useWhen conditions: [list all]
- Reactive ability handling: [describe gap]
- Companion turn handling: [describe gap]

## 9. ClassAbilityResult Current Shape
- [paste full interface]
- Other relevant result types: [list]

## 10. State Mutation Patterns
- updateCombatant: [signature + behavior]
- Immutability pattern: [describe]
- Adding new combatants: [possible/not possible, how]
- Turn order recalculation: [describe]

## 11. ActiveBuff System
- Full ActiveBuff interface: [paste]
- Current buff types: [list all]
- Buff-combat interaction points: [list]
- Feasibility of buff-based counter/trap: [assessment]

## 12. Ability Queue System
- AbilityQueueEntry type: [paste]
- Current useWhen conditions: [list all with descriptions]
- Gaps for Phase 3: [list needed conditions]

## 13. Recommended Implementation Approach
Based on all findings:
- Which abilities can use existing patterns with minor extensions
- Which need new subsystems and what those subsystems look like
- Suggested implementation order (simplest → most complex)
- Architectural risks and design decisions needed
- Whether any abilities should be simplified/deferred
- Estimated complexity: [LOW/MEDIUM/HIGH per ability]
```

## Rules

- Do NOT modify any code. Read-only research.
- Do NOT skip any section. If something doesn't exist, say "NOT FOUND" explicitly.
- Keep findings factual — no speculation about what might be intended.
- Paste actual code snippets for type definitions and ability data.
- If any Phase 1 or Phase 2 code looks buggy or incomplete, flag it explicitly.
- Pay special attention to the "special" abilities — these are the wildcards that could blow up scope.
