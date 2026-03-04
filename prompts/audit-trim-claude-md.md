# Audit and Trim CLAUDE.md

Read `cat CLAUDE.md` before starting.

---

## CONTEXT

CLAUDE.md is ~600 lines and growing. Its purpose is to give Claude Code agents the operational context they need to work effectively. But a lot of content has accumulated that either:

1. **Duplicates info available elsewhere** — full route lists, component inventories, world lore that lives in dedicated docs
2. **Is static reference data an agent never needs** — the 20x20 diplomacy matrix summary, exclusive zone tables, crafting chain examples
3. **Is outdated** — phase completion statuses, fix pass descriptions from months ago
4. **Adds noise** — long enumerated lists of every file when agents should search the codebase

The longer CLAUDE.md gets, the less effective it becomes — agents waste context window on static trivia instead of operational rules that prevent mistakes.

## TASK

Audit every section of CLAUDE.md against these criteria:

### KEEP if it meets ANY of these:
- **Prevents a known mistake** (e.g., "never use :latest tag", "YAML-first workflow", "use in-game race IDs")
- **Contains a non-obvious convention** an agent couldn't discover by reading code (e.g., "PvE combat only via road encounters", "bot priority chain order")
- **Is actively referenced** by prompts or agents (e.g., race ID table, batch sim commands, key file paths for active work)
- **Describes the current development focus** (what we're working on NOW, not what was completed months ago)

### REMOVE or MOVE TO DOCS if:
- **It's a complete inventory** of routes, components, services, cron jobs, middleware, socket files — agents can `find` and `grep` the codebase. These lists go stale and create false confidence.
- **It's world lore or game design** — belongs in `docs/GAME_GUIDE.md`, `docs/RACES.md`, `docs/WORLD_MAP.md`, `docs/COMBAT.md`, etc.
- **It's phase completion history** — belongs in `docs/CHANGELOG.md`
- **It's a static data reference** agents don't need (crafting chains, zone tables, diplomacy matrix, progression formulas)
- **It duplicates a dedicated doc** — if `docs/ARCHITECTURE.md` covers the tech stack, CLAUDE.md doesn't need to repeat it

### CONDENSE if:
- A section is useful but verbose — reduce to the minimum an agent needs
- Multiple sections overlap — merge them

## PROPOSED STRUCTURE

The trimmed CLAUDE.md should follow this structure (adjust based on what you find):

```
# Realm of Crowns — Claude Code Project Context

## Critical Rules (prevent known mistakes)
- Deployment rules (unique tags, seed-on-startup)
- Economy workflow (YAML-first)
- Simulation rules
- Monster/combat design rules
- Code style rules

## Operating Mode
- Team Lead role (brief)
- Workflow discipline (plan before build, diagnosis vs fix, etc.)

## Active Conventions
- Race ID mapping table
- Narrator template convention
- Batch sim CLI reference
- Key file paths for current work

## Project Overview (2-3 lines max)
- What the game is
- Tech stack (1 line)
- Monorepo structure (1 line)

## Where to Find Things
- Point to docs/ for details instead of inlining them
- "For routes, see docs/API_REFERENCE.md"
- "For world data, see docs/WORLD_MAP.md"
- etc.
```

## EXECUTION

1. **Read the entire current CLAUDE.md**
2. **For each section**, categorize as KEEP / REMOVE / CONDENSE / MOVE-TO-DOCS
3. **Write the trimmed version** — target roughly 150-250 lines (down from ~600)
4. **Verify nothing critical was lost** — cross-reference the Critical Rules section against the current version
5. **Save the trimmed version** as the new CLAUDE.md

## IMPORTANT RULES

- **Do NOT delete any Critical Rules** — every rule in the current "⚠️ CRITICAL RULES" section stays (possibly condensed)
- **Do NOT remove the Race ID table** — we just added it and it prevents real bugs
- **Do NOT remove the Batch Sim reference** — actively used
- **Do NOT remove the Bot Priority Chain** — agents need this for sim work
- **Keep the Operating Mode / Team Lead section** but condense it
- **Keep the Workflow Discipline section** — these rules prevent real recurring mistakes
- All the detailed inventories (52 routes, 31 services, 18 cron jobs, 35 pages, 30+ component dirs) should be REMOVED — agents should search the codebase, not rely on a potentially stale list

---

## DEPLOYMENT

```bash
git add CLAUDE.md
git commit -m "docs: trim CLAUDE.md from ~600 to ~200 lines — remove stale inventories, keep operational rules"
git push origin main
```

---

## DO NOT

- Do not modify any code files
- Do not deploy to Azure
- Do not delete any docs/ files (content moves there, it doesn't vanish)
- Do not remove any rule from the Critical Rules section
- Do not create a backup file — git history is the backup
