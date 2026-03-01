# Research Task: Phase 2 Class Ability Audit — AoE, Multi-Hit, Delayed Damage, Dispel

You are a research analyst preparing a comprehensive audit for the Team Lead. Your job is to investigate the current state of the Phase 1 class ability resolver and document everything needed to implement Phase 2 effect types.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

## Research Steps

### 1. Phase 1 Resolver Architecture

Read the resolver that was just built and document its exact structure:

```bash
cat server/src/lib/class-ability-resolver.ts
```

Document:
- The `resolveClassAbility()` function signature and flow
- The `EFFECT_HANDLERS` map — every key and its handler function name
- The handler function signature (what params do they take, what do they return?)
- How `effects` JSON is read from `AbilityDefinition`
- How damage is calculated (does it use rollDice? its own dice roller?)
- How targets are resolved (single target only? or does it support targetIds?)
- How results are built and returned
- The fallback behavior for unimplemented types
- Total line count of the file

### 2. Combat Engine Changes from Phase 1

```bash
cat server/src/lib/combat-engine.ts
```

Focus on:
- The `class_ability` case in `resolveTurn()` — how does it call the resolver?
- Buff tick processing — where does it happen, what does it do?
- Cooldown decrement — where and how?
- Any multi-target patterns that already exist (e.g., how does `resolveRacialAbility` handle AoE racial abilities like Dragonborn Breath Weapon?)
- How does `applyDamage()` work? (signature, does it handle multiple targets?)
- Any existing AoE or multi-target code patterns we can reuse
- The `resolvePsionAbility()` function — do any psion abilities hit multiple targets? If so, how?

### 3. Existing Multi-Target Patterns

Search for any existing multi-target resolution anywhere in the codebase:

```bash
grep -n "targetIds\|targets\|allEnemies\|enemies\|forEach.*combatant\|\.map.*combatant" server/src/lib/combat-engine.ts | head -60
grep -n "targetIds\|targets\|allEnemies\|enemies" server/src/lib/class-ability-resolver.ts | head -30
grep -n "aoe\|AoE\|AOE\|multi.*target\|multi.*attack\|all.*enemies" server/src/lib/combat-engine.ts | head -30
```

Document every instance where the engine handles actions affecting multiple combatants — this is the pattern Phase 2 must follow.

### 4. Phase 2 Ability Data — Exact Effect Shapes

Read each class file and extract the EXACT effects JSON for every ability that uses a Phase 2 effect type:

```bash
cat shared/src/data/skills/warrior.ts
cat shared/src/data/skills/mage.ts
cat shared/src/data/skills/rogue.ts
cat shared/src/data/skills/cleric.ts
cat shared/src/data/skills/ranger.ts
cat shared/src/data/skills/bard.ts
```

For EACH ability using these effect types, paste the complete effects object:
- `aoe_damage` — e.g., Cleave, Fireball, Meteor Strike, Divine Wrath, Rain of Arrows, Epic Finale
- `aoe_dot` — e.g., Consecrate
- `aoe_drain` — e.g., Soul Harvest
- `multi_attack` — e.g., Frenzy, Dual Strike, Flurry of Blades
- `multi_target` — e.g., Chain Lightning, Multi-Shot
- `delayed_damage` — e.g., Death Mark
- `dispel_damage` — e.g., Purging Flame

### 5. Combat State & Combatant Access

Document how the resolver accesses other combatants in the fight:

```bash
grep -n "CombatState\|state\." server/src/lib/class-ability-resolver.ts | head -40
```

- What does `CombatState` look like? (paste the type)
- How do you get all enemies from the state?
- How do you get all allies from the state?
- Is there a `getCombatantsByTeam()` or similar helper?

### 6. Combat Sim Scenario Structure

```bash
cat server/src/scripts/combat-sim-scenarios.ts
```

Document:
- The `class-abilities` scenario that was added in Phase 1
- How combatants are assigned to teams/sides
- How `unlockedAbilityIds` is used
- The `CombatantDef` type (full definition)

### 7. Delayed Damage Tracking

Check if there's any existing mechanism for tracking delayed/deferred effects:

```bash
grep -rn "delay\|deferred\|pending\|scheduled\|timer\|countdown" server/src/lib/combat-engine.ts server/src/lib/class-ability-resolver.ts server/src/types/combat.ts | head -20
```

Document what exists or confirm nothing exists (Phase 2 will need to build this).

### 8. Damage Type System

Check if abilities reference damage types (fire, ice, lightning, radiant, sonic, shadow, psychic) and if the engine handles them:

```bash
grep -rn "damageType\|damage_type\|element\|fire\|ice\|lightning\|radiant\|sonic\|shadow\|psychic" server/src/lib/combat-engine.ts server/src/lib/class-ability-resolver.ts | head -30
```

Document whether damage types are tracked, displayed, or affect anything mechanically (resistances, vulnerabilities).

### 9. Corpse/Dead Combatant Tracking

Necromancer's Corpse Explosion requires a dead combatant. Check:

```bash
grep -rn "dead\|corpse\|killed\|eliminated\|hp.*<=.*0\|isAlive\|isDead" server/src/lib/combat-engine.ts | head -20
```

Document how dead combatants are tracked in CombatState — are they removed, flagged, or kept in the combatants array?

### 10. The Arcane Mastery / Spell Weaver Passive Question

Two passives reduce cooldowns:
- Arcane Mastery (mag-ele-6): 30% cooldown reduction
- Spell Weaver (mag-enc-6): cooldowns reduced by 1

Check how Phase 1 handles passives and whether cooldown reduction passives were implemented:

```bash
grep -n "passive\|cooldown.*reduc\|Arcane Mastery\|Spell Weaver" server/src/lib/class-ability-resolver.ts | head -20
```

## Output

Write your complete findings to: `server/src/scripts/combat-sim-results/phase2-abilities-audit.md`

Use this exact structure:

```markdown
# Phase 2 Class Abilities Audit Report

## 1. Phase 1 Resolver Architecture
- Function signature: [paste]
- EFFECT_HANDLERS map: [list all keys and handler names]
- Handler signature pattern: [describe]
- How effects JSON is read: [describe]
- How damage calc works: [describe]
- How targets resolve: [describe]
- Result building pattern: [describe]
- Fallback behavior: [describe]
- File line count: [number]

## 2. Combat Engine Multi-Target Patterns
- Existing AoE patterns: [describe with code snippets]
- How applyDamage works: [signature + behavior]
- Psion multi-target abilities: [list which ones, how they work]
- Racial ability AoE: [describe if any]

## 3. Phase 2 Ability Effect Data (EXACT JSON)
For each ability, paste:
- Ability ID, name, class, spec
- Complete effects object as it appears in the data file
- Cooldown value

Group by effect type:
### aoe_damage abilities
### aoe_dot abilities  
### aoe_drain abilities
### multi_attack abilities
### multi_target abilities
### delayed_damage abilities
### dispel_damage abilities

## 4. CombatState Structure
- [paste CombatState type]
- How to get enemies: [describe]
- How to get allies: [describe]
- Team/side tracking: [describe]

## 5. Combat Sim Team Structure
- How teams are assigned: [describe]
- CombatantDef full type: [paste]
- class-abilities scenario: [describe setup]

## 6. Delayed Effect Tracking
- Existing mechanisms: [describe or "NONE"]
- What needs to be built: [describe]

## 7. Damage Type System
- Are damage types tracked: [yes/no]
- Do they affect mechanics: [describe]
- Display only or functional: [describe]

## 8. Dead Combatant Tracking
- How death is handled: [describe]
- Are corpses kept in state: [yes/no]
- How to check for available corpses: [describe]

## 9. Cooldown Reduction Passives
- Phase 1 passive handling: [describe]
- Cooldown reduction implemented: [yes/no/partially]
- What needs to be added: [describe]

## 10. Recommended Implementation Approach
Based on findings, suggest:
- Which Phase 2 effect types can reuse existing patterns
- Which need new infrastructure
- Suggested handler implementation order
- Any architectural risks
```

## Rules

- Do NOT modify any code. Read-only research.
- Do NOT skip any section. If something doesn't exist, say "NOT FOUND" explicitly.
- Keep findings factual — no speculation about what might be intended.
- Paste actual code snippets for type definitions and effect JSON data.
- If any Phase 1 code looks buggy or incomplete, flag it explicitly.
