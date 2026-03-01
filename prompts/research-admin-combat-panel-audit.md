# Research Task: Admin Combat Panel — Codebase Audit

You are a research analyst preparing a comprehensive audit for the Team Lead. Your job is to investigate the current state of admin panel infrastructure, combat data structures, race/class/item definitions, combat logging, and the combat simulator to produce a structured report. This report will be used to write the implementation prompt for a comprehensive admin combat dashboard.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/web-design.md
cat .claude/agents/backend-api.md
```

## Research Steps

### 1. Current Admin Panel Architecture

Map the existing admin infrastructure — routes, pages, components, auth patterns:

```bash
# Admin route structure
cat server/src/routes/admin/index.ts
cat server/src/routes/admin/stats.ts
cat server/src/routes/admin/simulation.ts
cat server/src/routes/admin/monsters.ts
```

```bash
# Admin frontend pages
ls -la client/src/pages/admin/
cat client/src/pages/admin/AdminDashboardPage.tsx
cat client/src/pages/admin/SimulationDashboardPage.tsx
```

```bash
# Admin routing in frontend
grep -r "admin" client/src/App.tsx --include="*.tsx" -A 5
grep -r "AdminRoute\|admin.*route\|/admin" client/src/App.tsx
```

Document:
- How admin routes are registered and guarded (middleware)
- How admin pages are routed in the React app
- The pattern for adding new admin pages (imports, route declarations)
- What components/layouts admin pages use (PageLayout, RealmPanel, etc.)
- What the SimulationDashboardPage already shows (it may overlap with what we need)

### 2. Combat Engine Data Structures

Understand every data type that flows through combat so we know what to display:

```bash
cat shared/src/types/combat.ts
```

```bash
# The combat engine — focus on state shape, round logs, and result objects
cat server/src/lib/combat-engine.ts
```

Document ALL of these:
- `CombatState` — full shape (participants, round, status, logs, etc.)
- `Combatant` — every field (stats, equipment, buffs, abilities, passives, racialMods, etc.)
- `CombatAction` — all action types and their payloads
- `CombatRound` / round log structure — what gets recorded per round
- `CombatResult` — what the engine returns when combat ends
- The combat log format — what text/data is stored per action
- How modifiers are calculated (attack rolls, damage rolls, AC computation)
- How racial abilities and class abilities are invoked and logged
- How status effects are tracked and ticked

### 3. Combat Log Database Storage

Find how combat results are persisted:

```bash
grep -r "combatLog\|combat_log\|CombatLog\|combat.*log" database/prisma/schema.prisma -A 20
grep -r "combatLog\|combat_log\|CombatLog" server/src/ --include="*.ts" -l
```

Then read the relevant files. Document:
- The database model for combat logs
- What fields are stored (participants, rounds, result, timestamp, etc.)
- Whether full round-by-round data is persisted or just summaries
- How combat logs are queried/retrieved currently
- Any existing API endpoints that return combat history

### 4. Race Data — Complete Inventory

Catalog all race definitions for the codex:

```bash
cat shared/src/data/races/index.ts
```

Then read 2-3 race files to understand the data shape:
```bash
cat shared/src/data/races/core/human.ts
cat shared/src/data/races/common/merfolk.ts
cat shared/src/data/races/exotic/changeling.ts
```

Document:
- The `Race` type/interface (all fields)
- Stat modifiers format
- Racial traits format
- Racial abilities format (name, level unlock, description, mechanical effects)
- Sub-race structure (Dragonborn ancestries, Beastfolk clans, Genasi elements)
- Profession bonuses format
- How many total races and the file for each

### 5. Class & Skill Data — Complete Inventory

Catalog all class/skill definitions:

```bash
cat shared/src/data/skills/types.ts
cat shared/src/data/skills/index.ts
cat shared/src/data/skills/warrior.ts
cat shared/src/data/skills/mage.ts
cat shared/src/data/skills/rogue.ts
```

Document:
- The skill tree type/interface
- Class ability type (name, description, damage, cooldown, mana cost, effect type, etc.)
- How specializations are structured
- Total abilities per class and per spec
- How abilities are referenced in combat (IDs, names, lookup method)

### 6. Racial Combat Abilities — Detailed Structure

```bash
# Get the ability structure and key functions
head -100 server/src/services/racial-combat-abilities.ts
grep -n "function\|export\|interface\|type " server/src/services/racial-combat-abilities.ts
```

Document:
- The racial ability data structure
- All 121 abilities categorized (passive, active, reactive, DoT/HoT)
- How abilities are resolved in combat
- What data each ability execution produces (for display in combat reports)

### 7. Item & Equipment Data — Complete Inventory

Catalog items for the codex:

```bash
ls shared/src/data/recipes/
cat shared/src/data/recipes/types.ts
cat shared/src/data/recipes/weapons.ts | head -80
cat shared/src/data/recipes/armor.ts | head -80
cat shared/src/data/recipes/consumables.ts | head -80
```

```bash
# Item templates and types
grep -r "ItemTemplate\|itemTemplate\|ITEM_TEMPLATE" shared/src/ --include="*.ts" -l
cat shared/src/types/items.ts 2>/dev/null || grep -r "interface.*Item\b" shared/src/types/ --include="*.ts" -l
```

Document:
- Item type/interface (name, stats, rarity, durability, effects, etc.)
- Weapon stats format (damage dice, attack bonus, type, range)
- Armor stats format (AC bonus, type, weight class)
- Consumable effects format (healing, buffs, duration)
- Accessory/enchantment effects format
- How equipment modifies combat stats (the stat calculation pipeline)
- Total items by category

### 8. Monster Data

```bash
cat database/seeds/monsters.ts
```

Document:
- Monster type/interface
- All monster definitions (name, level, biome, stats, loot tables)
- How monster stats scale
- How monsters are selected for encounters (biome + level range)

### 9. Combat Simulator Infrastructure

```bash
# Look for any existing combat simulation tools
grep -r "sim\|simulate\|combat.*test\|test.*combat" server/src/ --include="*.ts" -l
cat server/src/routes/admin/simulation.ts
```

```bash
# Check if there's an existing combat sim script
ls server/src/scripts/combat-sim*
cat server/src/scripts/combat-sim-runner.ts 2>/dev/null
```

Document:
- Any existing simulation API endpoints
- How simulations are triggered and configured currently
- What parameters can be set (race, class, level, equipment, vs monster, vs player)
- What results are returned
- Any existing frontend for simulation results

### 10. Status Effects System

```bash
grep -r "StatusEffect\|status_effect\|statusEffect\|POISON\|STUNNED\|BURNING\|FROZEN\|BLESSED" shared/src/ --include="*.ts" -l
```

Read the relevant files and document:
- All status effects defined in the game
- Each effect's mechanical behavior (damage per turn, skip turn, stat reduction, etc.)
- Duration mechanics
- How they're applied and removed
- How they display in combat logs

### 11. Existing Admin API Patterns

```bash
# Check how admin endpoints are structured — auth, params, response format
cat server/src/routes/admin/economy.ts | head -60
cat server/src/routes/admin/characters.ts | head -60
```

Document:
- Authentication/authorization pattern for admin routes
- Standard response format
- Query parameter patterns (pagination, filters)
- Error handling pattern

## Output

Write your complete findings to: `prompts/research-admin-combat-panel-findings.md`

Use this exact structure:

```markdown
# Admin Combat Panel — Research Findings

## 1. Admin Panel Architecture
- Route registration pattern: [description + code snippet]
- Admin middleware: [how auth/admin check works]
- Frontend routing pattern: [how new admin pages are added]
- Layout/component patterns: [what existing admin pages use]
- SimulationDashboard current state: [what it shows now]

## 2. Combat Engine Data Structures
### CombatState
[paste full type]
### Combatant
[paste full type with all fields annotated]
### CombatAction
[paste full type]
### Round Log Structure
[paste structure + describe what's recorded per round]
### CombatResult
[paste structure]
### Modifier Calculation Pipeline
[describe how attack/damage/AC is computed step-by-step]

## 3. Combat Log Database
- Schema model: [paste model]
- Stored data: [what's persisted]
- Round-by-round storage: [yes/no, what detail level]
- Existing query endpoints: [list]
- Data gaps: [what ISN'T stored that we'd need for detailed reports]

## 4. Race Data Inventory
- Race interface: [paste type]
- Total races: X
- File listing: [each race file path]
- Ability format: [paste ability type with example]
- Sub-race format: [paste structure]
- Stat modifier format: [paste example]
- Profession bonus format: [paste example]

## 5. Class & Skill Data Inventory
- Skill tree interface: [paste type]
- Ability interface: [paste type]
- Classes: [list all 7]
- Specializations: [list all 21]
- Abilities per class: [count]
- Total abilities: [count]
- Ability effect types: [list all unique effect types]

## 6. Racial Combat Abilities Detail
- Ability data structure: [paste type]
- Total: 121
- By category: [passive: X, active: X, reactive: X, etc.]
- Resolution function signature: [paste]
- What ability execution returns: [describe data shape]

## 7. Item & Equipment Inventory
- Item interface: [paste type]
- Weapon stats format: [paste with example]
- Armor stats format: [paste with example]
- Consumable format: [paste with example]
- Equipment → combat stat pipeline: [describe flow]
- Item counts by category: [weapons: X, armor: X, consumables: X, etc.]

## 8. Monster Data
- Monster interface: [paste type]
- Total monsters: X
- Per-biome breakdown: [biome: count, level range]
- Stat ranges: [min/max HP, AC, damage across all monsters]
- Loot table format: [paste example]

## 9. Combat Simulator Infrastructure
- Existing simulation endpoints: [list with descriptions]
- Current sim capabilities: [what can be simulated now]
- Current sim limitations: [what's missing]
- Frontend sim UI: [exists? what it shows?]
- Sim configuration options: [what params are available]

## 10. Status Effects
- All status effects: [list each with mechanical description]
- Duration format: [how turns/rounds work]
- Application/removal: [how they're added/removed]
- Combat log display: [how they show in logs]

## 11. Admin API Patterns
- Auth middleware: [code snippet]
- Response format: [standard shape]
- Pagination pattern: [code snippet]
- Error handling: [code snippet]
- Query params: [common patterns]

## 12. Implementation Recommendations
Based on all findings, note:
- Data gaps that need to be filled before the admin panel can show detailed combat info
- Whether combat logs store enough data for round-by-round replay
- What new API endpoints will be needed
- What shared types may need extending
- Estimated scope (small/medium/large) for each section:
  - Codex (races, classes, items): [scope]
  - Combat viewer (past combats): [scope]
  - Combat simulator: [scope]
  - Round-by-round reports: [scope]
```

## Rules

- Do NOT modify any code. Read-only research.
- Do NOT skip any section. If something doesn't exist, say "NOT FOUND" explicitly.
- Keep findings factual — no speculation about what might be intended.
- Paste actual code snippets for type definitions and key structures.
- If you find data in unexpected places, document ALL locations.
- For large files, extract the relevant sections — don't paste 2000-line files wholesale.
- Count things accurately. Don't estimate "about 100" — count the actual number.
