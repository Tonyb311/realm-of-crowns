# Research Task: Class Abilities Audit & Integration Report

You are a research analyst preparing a comprehensive audit for the Team Lead. Your job is to investigate the current state of class abilities in the codebase and produce a structured report that will be used to write the implementation prompt.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

## Research Steps

### 1. Class & Ability Data Definitions

Find and catalog ALL class ability data that exists anywhere in the codebase:

```bash
# Search for ability definitions, class skill lists, etc.
grep -r "abilities" --include="*.ts" --include="*.json" --include="*.yaml" -l server/src/
grep -r "classAbilities\|class_abilities\|ClassAbility" --include="*.ts" -l server/src/
grep -r "skillList\|skill_list\|spellList\|spell_list" --include="*.ts" -l server/src/
```

For each file found, extract:
- The data structure/type definition
- How many abilities are defined
- Which classes they belong to
- What fields each ability has (name, damage, cooldown, mana cost, etc.)

### 2. Combat Engine Hooks

Examine the combat engine to find where abilities SHOULD plug in but don't yet:

```bash
cat server/src/game/combat/combat-engine.ts
cat server/src/game/combat/tick-combat-resolver.ts
```

Document:
- The `decideAction` function — what does it check for abilities currently?
- The action resolution flow — is there a switch/if for ability actions?
- Any TODO comments or placeholder code for abilities
- The `CombatAction` type — what action types exist?

### 3. Combat Types & Interfaces

```bash
cat server/src/types/combat.ts
```

Document:
- `CombatAction` type/interface — all fields
- `Combatant` type — any ability-related fields (abilityQueue, cooldowns, mana, etc.)
- Any ability-specific types already defined

### 4. Combat Preset System

```bash
grep -r "preset\|CombatPreset\|combatPreset\|battle.*preset" --include="*.ts" -l server/src/
```

Then read the relevant files. Document:
- How presets define ability priority/queue
- The preset data structure
- How the decision chain uses presets (flee → ability → item → attack)

### 5. Database Schema

```bash
cat server/prisma/schema.prisma | grep -A 30 "model.*[Aa]bilit\|model.*[Ss]kill\|model.*[Cc]lass"
```

Also check:
```bash
grep -r "ability\|skill" server/prisma/schema.prisma
```

Document:
- Any ability-related tables/models
- Character class fields
- Any junction tables for character-abilities

### 6. Seed Data

```bash
grep -r "abilities\|skills" --include="*.ts" -l server/src/seeds/
grep -r "abilities\|skills" --include="*.ts" -l server/prisma/seed*
```

Check if ability data is seeded to DB or lives purely in code.

### 7. Class System Overview

```bash
grep -r "class\|Class" --include="*.ts" -l server/src/game/
grep -r "warrior\|mage\|rogue\|cleric\|ranger\|paladin\|psion" --include="*.ts" -i -l server/src/
```

Document:
- What classes exist in the game
- How a character's class is stored/referenced
- Any class progression or level-up hooks

### 8. The 108 Abilities Reference

The user mentioned 108 non-psion class abilities are defined in data but not integrated into combat. Find them:

```bash
# Look for large arrays/objects of ability definitions
grep -r "abilities" --include="*.ts" --include="*.json" --include="*.yaml" server/src/ -l
```

Read each file and count abilities per class.

### 9. Combat Simulator Hooks

```bash
cat server/src/scripts/combat-sim-runner.ts
cat server/src/scripts/combat-sim-scenarios.ts
```

Document:
- How the sim currently handles ability actions (or skips them)
- What changes the sim would need to test abilities

## Output

Write your complete findings to: `server/src/scripts/combat-sim-results/class-abilities-audit.md`

Use this exact structure:

```markdown
# Class Abilities Audit Report

## 1. Ability Data Inventory
- Total abilities found: X
- Per-class breakdown: [class: count]
- Data location(s): [file paths]
- Data structure: [paste the type/interface]

## 2. Combat Engine Integration Points
- decideAction current behavior: [description]
- Action resolution flow: [description]
- Missing hooks: [list what needs to be added]
- CombatAction types: [list all]

## 3. Type Definitions
- [paste relevant types from combat.ts]

## 4. Combat Preset Ability Fields
- Preset structure: [paste type]
- How ability queue works: [description]
- Priority system: [description]

## 5. Database Schema
- Ability-related models: [list]
- Character-class relationship: [description]
- Missing schema needs: [list]

## 6. Seed Data Status
- Where ability data lives: [description]
- Seeding mechanism: [description]

## 7. Class System
- Classes in game: [list all]
- Class storage: [how character class is persisted]
- Level/progression hooks: [description]

## 8. The 108 Abilities Detail
Per class, list:
- Class name
- Number of abilities
- Ability names (just names, not full definitions)
- Common fields across all abilities

## 9. Combat Simulator Gaps
- What sim needs to test abilities: [list]
- Scenario additions needed: [list]

## 10. Recommended Implementation Order
Based on what you found, suggest the logical order for wiring abilities in.
```

## Rules

- Do NOT modify any code. Read-only research.
- Do NOT skip any section. If something doesn't exist, say "NOT FOUND" explicitly.
- Keep findings factual — no speculation about what might be intended.
- Paste actual code snippets for type definitions and key structures.
- If you find more than expected (e.g., abilities in multiple places), document ALL locations.
