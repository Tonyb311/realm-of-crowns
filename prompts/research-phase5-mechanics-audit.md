# Research Task: Phase 5 — Ability Mechanics Gap Analysis

You are a research analyst preparing a comprehensive audit for the Team Lead. Your job is to map every ability-specific mechanic that is defined in data but silently ignored by the combat engine, identify exactly where each needs to be consumed, and assess implementation complexity.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

## Research Steps

### 1. Catalog Every Ignored Mechanic

Read every class ability data file and the resolver to build the complete list:

```bash
cat shared/src/data/skills/warrior.ts
cat shared/src/data/skills/mage.ts
cat shared/src/data/skills/cleric.ts
cat shared/src/data/skills/rogue.ts
cat shared/src/data/skills/ranger.ts
cat shared/src/data/skills/bard.ts
cat server/src/lib/class-ability-resolver.ts
cat server/src/lib/combat-engine.ts
```

For EACH ability mechanic field that exists in the data but is NOT functionally consumed by the engine during combat resolution, document:

- **Field name** (e.g., `critBonus`, `ignoreArmor`, `autoHit`)
- **Which abilities use it** (list every ability ID)
- **What the handler currently does with it** (stores it? ignores it? partially uses it?)
- **What the engine SHOULD do with it** (where in combat resolution it needs to be checked)
- **Exact file + function + approximate line range** where the consumption logic needs to go

### 2. Dead ActiveBuff Fields

The Phase 4 audit identified 6 ActiveBuff fields that are populated by handlers but never consumed:

- `damageReflect`
- `guaranteedHits`
- `extraAction`
- `ccImmune`
- `stealthed`
- `dodgeMod`

For EACH, trace:
- Which handler sets it (exact line)
- Where in combat-engine.ts it SHOULD be read
- What the expected behavior is (e.g., `guaranteedHits` should bypass the d20 roll)
- Are there any other dead fields not in this list?

### 3. Handler-Level Gaps

For each handler in EFFECT_HANDLERS, check if it reads all the fields from the ability data that it receives. Specifically:

```bash
grep -n "EFFECT_HANDLERS\|handleDamage\|handleBuff\|handleDebuff\|handleHeal\|handleStatus\|handleDrain\|handleHot\|handleCleanse\|handleFlee\|handleAoeDamage\|handleMultiTarget\|handleMultiAttack\|handleAoeDrain\|handleDispelDamage\|handleAoeDot\|handleDelayedDamage\|handleDamageStatus\|handleDamageDebuff\|handleSteal\|handleDamageSteal\|handleCompanionAttack\|handleSpecial\|handleCounter\|handleTrap\|handleSummon" server/src/lib/class-ability-resolver.ts | head -60
```

For each handler, compare:
- What fields the ability data provides (from the skill .ts files)
- What fields the handler actually reads/uses
- What's dropped on the floor

### 4. Engine Consumption Points

Map the combat-engine.ts functions where ability mechanic data SHOULD influence outcomes:

```bash
grep -n "resolveAttack\|getBuffAttackMod\|getBuffDamageMod\|getBuffDamageReduction\|consumeAbsorption\|isPrevented\|checkDeathPrevention\|rollAttack\|calculateDamage\|applyDamage" server/src/lib/combat-engine.ts | head -40
```

For each function, identify:
- What ability data it currently checks
- What ability data it SHOULD check but doesn't
- Whether the data flows through (is it on the combatant? on activeBuffs? needs a new path?)

### 5. Data Flow Assessment

For mechanics that need to flow from handler → engine, trace the data path:

1. Ability data defined in `shared/src/data/skills/*.ts`
2. Handler receives ability data in `resolveClassAbility`
3. Handler may create an ActiveBuff, apply a status, or directly modify state
4. Engine's `resolveAttack` / `resolveTurn` reads combatant state, activeBuffs, status effects
5. Engine applies modifiers to rolls, damage, targeting

For each ignored mechanic, identify which step in this pipeline is broken:
- Does the handler store the data correctly but the engine never reads it?
- Does the handler not even extract the field from ability data?
- Is there a type mismatch (field exists on data type but not on ActiveBuff/Combatant type)?

### 6. Implementation Grouping

Group the fixes by WHERE they need to go:

**Group A: Handler-only fixes** (handler needs to read a field it currently ignores)
- These are self-contained in class-ability-resolver.ts

**Group B: Engine consumption fixes** (engine needs to check a buff/status field it currently ignores)
- These require changes to combat-engine.ts resolveAttack or related functions

**Group C: New infrastructure** (mechanic requires a new system that doesn't exist)
- e.g., poison charges on subsequent attacks, stacking damage per round, extra action granting

**Group D: Cross-cutting** (needs changes in both handler AND engine)
- e.g., handler sets a flag, engine needs to read it during a different phase

### 7. Complexity & Priority Assessment

For each mechanic, rate:
- **Complexity:** TRIVIAL (1-5 lines), SMALL (5-15 lines), MEDIUM (15-40 lines), LARGE (40+ lines)
- **Priority:** HIGH (affects multiple abilities or core balance), MEDIUM (affects 1-2 abilities), LOW (edge case or cosmetic)
- **Risk:** Does this change touch hot paths (resolveAttack, damage calculation)? Could it break existing scenarios?

### 8. Sim Scenario Impact

Which of the Phase 4 recommended P2/P3 scenarios become testable once these mechanics are fixed?

```bash
cat server/src/scripts/combat-sim-results/phase4-validation-audit.md
```

Look at the P2/P3 scenarios that were deferred because the mechanics weren't implemented. Map which scenarios unlock as each mechanic is fixed.

## Output

Write your complete findings to: `server/src/scripts/combat-sim-results/phase5-mechanics-audit.md`

Use this structure:

```markdown
# Phase 5 Mechanics Gap Audit

## 1. Complete Ignored Mechanics Inventory
For each mechanic:
| Field | Abilities | Handler Status | Engine Status | Fix Location | Complexity |

## 2. Dead ActiveBuff Fields
For each field:
- Set by (handler, line)
- Should be read by (engine function, line)
- Expected behavior
- Fix complexity

## 3. Handler-by-Handler Gap Analysis
For each of the 27 handlers:
- Fields received from data
- Fields actually used
- Fields dropped

## 4. Engine Consumption Point Map
For each relevant engine function:
- Currently checks
- Should also check
- Data flow path

## 5. Implementation Groups
- Group A: Handler-only (list)
- Group B: Engine consumption (list)
- Group C: New infrastructure (list)
- Group D: Cross-cutting (list)

## 6. Recommended Implementation Order
Ordered by: unblocks most abilities, lowest risk, highest impact
Each item: mechanic, fix description, affected abilities, complexity, risk

## 7. Scenario Unlocks
Which deferred scenarios become testable after each group of fixes

## 8. Type Changes Needed
Any TypeScript interface changes required (ActiveBuff, Combatant, AttackResult, etc.)
```

## Rules

- Do NOT modify any code. Read-only research.
- Do NOT skip any handler or ability.
- Be EXACT about line numbers and function names — the implementation prompt will reference them.
- If you find new issues not in the Phase 4 audit, flag them.
- The goal is a complete blueprint so the implementation prompt can be written without any additional code reading.
