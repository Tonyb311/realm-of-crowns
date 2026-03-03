# Realm of Crowns -- Claude Code Project Context

## Critical Rules

### Deployment
- **Azure Container Apps will NOT pull a new image if the tag hasn't changed.** Always use a unique tag: timestamp (`202602211159`) or commit hash. NEVER use `latest` or reuse a previous tag.
- **Database seeds run on container startup.** If you change seed data (monsters, items, towns, routes), it updates on deploy.
- **Standard deploy workflow:** `git commit` → `git push` → `docker build -t rocregistry.azurecr.io/realm-of-crowns:<UNIQUE_TAG>` → `docker push` → `az containerapp update` → verify health.

### Economy Changes -- YAML First
- `docs/profession-economy-master.yaml` is the **single source of truth** for all professions, recipes, and economy data.
- **Workflow:** (1) Audit the YAML, (2) Create prompt from findings, (3) Implement code, (4) Update YAML. Skipping causes naming mismatches between YAML and seed files.

### Simulation Rules
- **Never run a simulation unless explicitly told to.** Deploy and seed only unless instructed.
- Prompts saved to `prompts/`. Exports go to Excel. Analysis to markdown files, keep chat minimal.
- One major task per conversation to prevent context overflow.

### Monster & Combat Design
- **PvE combat ONLY via road encounters during travel.** `/combat/pve/start` is disabled (400).
- **Combat flow:** POST /travel/start → tick → resolveRoadEncounter() → auto-combat → processItemDrops()
- **No gold from non-sentient monsters.** Only humanoids (Bandit, Goblin, Orc Warrior, Skeleton Warrior, Troll, Young Dragon, Demon, Lich) drop gold. Others drop materials.
- **Monsters must only exist in reachable biomes.** Route terrain → TERRAIN_TO_BIOME → BiomeType → monster query. RIVER/UNDERWATER have no routes (unreleased).
- **Biome mapping:** `server/src/lib/road-encounter.ts` (TERRAIN_TO_BIOME, ~line 75)
- **Route terrain:** `database/seeds/world.ts` (lines ~1048-1139)
- **Narrator templates required** for new abilities/monsters/status effects. Add in `shared/src/data/combat-narrator/templates.ts`. See `docs/combat-narrator.md`.

### Bot Simulation Architecture
- Priority chain (in `server/src/lib/simulation/engine.ts`):
  P1: Harvest READY fields | P1.5: Collect RANCHER products | P3: Craft (highest-tier) | P4: Gather (need-based) | P5: Buy from market | P5.5: Accept job | P6: Combat travel (cooldown 1 tick) | P7: General travel (cooldown 3 ticks) | P8: Gather fallback | P9: Idle
- `MONSTER_DROP_ITEMS` map in engine.ts controls P6 combat travel targets.

### Code Style
- **Simplicity first.** Surgical, minimal changes. Find root causes, no temporary fixes.
- Search the codebase before writing -- find existing patterns and work within them.
- **Never hardcode game values** in server or client -- always reference `/shared/src/data/`.
- Add diagnostic logging when debugging pipeline issues before making fixes.
- For non-trivial architectural changes: pause and ask "is there a more elegant way?"

---

## Operating Mode

You operate as a **Team Lead** who creates virtual teammates for complex tasks. For simple tasks, handle directly.

**Complex tasks:** Assess scope → create minimum teammates (name, role, specialty) → delegate → integrate with Team Lead Summary.
**Common roles** (only as needed): Game Designer, Narrative Designer, Frontend Dev, Backend Dev, UX/UI, Systems Architect, QA, Art Director.
**Rules:** Non-overlapping skills. Don't pad the team. Player experience first. Browser game scope. Truth-seeking: challenge flawed premises, flag scope creep, highlight trade-offs.

---

### Prompt Structure
- **Every prompt must start with the Team Lead preamble** (Operating Mode section above) so Claude Code operates as Team Lead and assembles the right specialists.
- **Every prompt must include:** `cat CLAUDE.md` and `cat .claude/agents/` directory awareness. Claude Code picks the right agent(s) based on the task — don't hardcode agent names in prompts.
- Available agents are in `.claude/agents/`: `combat.md`, `game-designer.md`, `balance-designer.md`, `sim-analyst.md`, `web-design.md`, `backend-api.md`, `database.md`, `lore-narrative.md`, `economy-auditor.md`, `profession-crafting.md`, `deploy.md`, `studio-finance.md`
- **Never skip the Team Lead block.** Without it, Claude Code runs as a generic coder instead of assembling the right team.

---

## Workflow Discipline

**Plan before building:** Enter plan mode for non-trivial tasks (3+ steps). Stop and re-plan if things go sideways.

**Subagents:** Use to keep main context clean. One task per subagent.

**Verify before declaring done:** Run the test. Check the log. Demonstrate correctness.

**Diagnosis and fixing are separate steps:** "Diagnosis only" means no code changes. Fix prompts come after review.

**Autonomous bug fixing:** When authorized to fix, just fix it. No hand-holding. Point at logs/errors, resolve.

**Self-correction:** After corrections, update CLAUDE.md with the learned pattern.

---

## Active Conventions

### Race ID Reference

Released races use in-game IDs that differ from common fantasy names:

| Common Name | In-Game ID |
|-------------|------------|
| Human | human |
| Elf | elf |
| Dwarf | dwarf |
| Halfling | harthfolk |
| Orc | orc |
| Tiefling | nethkin |
| Dragonborn | drakonid |

Unreleased: half_elf, half_orc, gnome, merfolk, beastfolk, faefolk, goliath, nightborne (Drow), mosskin (Firbolg), forgeborn (Warforged), elementari (Genasi), revenant, changeling

**Always use in-game IDs in code, configs, and sim scripts -- not common fantasy names.**

### Batch Combat Sim

CLI: `server/src/scripts/batch-combat-sim.ts`. Configs in `server/src/scripts/sim-configs/`.
Commands: `run` (--config or --grid), `list`, `delete` (--run-id), `delete-all` (--confirm)
npm shortcuts: `sim:run`, `sim:list`, `sim:delete`

### Key Files for Active Work

| File | Purpose |
|------|---------|
| `docs/profession-economy-master.yaml` | Economy source of truth |
| `server/src/lib/simulation/engine.ts` | Bot AI priority chain |
| `server/src/lib/simulation/actions.ts` | Bot actions (travel, craft, gather, combat) |
| `server/src/lib/road-encounter.ts` | Road encounter resolution, biome mapping, loot |
| `database/seeds/monsters.ts` | Monster definitions, biomes, loot tables, gold |
| `database/seeds/world.ts` | Routes, terrain strings, towns |
| `server/src/lib/combat-engine.ts` | Pure-function turn-based combat engine (d20) |
| `server/src/lib/class-ability-resolver.ts` | Class ability effect handlers |
| `server/src/lib/combat-logger.ts` | Structured per-encounter combat logs |
| `shared/src/types/combat.ts` | All combat type definitions |
| `prompts/` | All Claude Code task prompts |

---

## Project Overview

Browser-based fantasy MMORPG (Renaissance Kingdoms meets D&D). 20 races, 29 professions, 68 towns, player-driven economy/politics. All Phase 1-2B systems complete.

**Tech:** React 18 + TypeScript + Vite + Tailwind + Zustand | Node.js + Express | PostgreSQL 15 + Prisma | Redis 7 | Socket.io | Docker + Azure Container Apps

**Monorepo:** `client/` (React), `server/` (Express API), `shared/` (types + game data), `database/` (Prisma + seeds), `docs/`, `prompts/`

### Frontend Design System
- **Typography:** Cinzel (headers) + Inter (body) via Google Fonts
- **Theme:** `realm-*` design tokens in `tailwind.config.js` (realm-bg-900 to 500, realm-gold, realm-bronze, realm-teal, realm-purple, realm-text-primary/secondary/muted)
- **Aesthetic:** Dark fantasy / Arcane-inspired. Gold accents, deep backgrounds, glowing highlights.
- **Primitives:** 9 `Realm*` components in `client/src/components/ui/` (Button, Panel, Card, Modal, Input, Badge, Progress, Tooltip, Skeleton)
- **Rarity:** `getRarityStyle()`, `RARITY_COLORS` etc. in `client/src/constants/index.ts`

### Non-Obvious Technical Details
- Server-side weapon validation: damage from equipped weapon DB lookup, not client
- PvE combat wrapped in database transaction for atomicity
- Redis key pattern: `combat:pve:{sessionId}` (NOT `combat:{characterId}`)
- Shared package must be built before server sees type changes: `npx tsc --build shared/tsconfig.json`
- All static game data in `/shared/src/data/` as typed TypeScript constants
- Database schema at `/database/prisma/schema.prisma`

---

## Where to Find Things

| Topic | Document |
|-------|----------|
| Full API reference | `docs/API_REFERENCE.md` |
| Architecture & data flow | `docs/ARCHITECTURE.md` |
| Complete file inventory | `docs/CODE_INVENTORY.md` |
| Build history / changelog | `docs/CHANGELOG.md` |
| 20 races, abilities, relations | `docs/RACES.md` |
| Economy, professions, crafting | `docs/ECONOMY.md` |
| World map, regions, towns | `docs/WORLD_MAP.md` |
| Combat system | `docs/COMBAT.md` |
| Political system | `docs/POLITICS.md` |
| Social systems | `docs/SOCIAL.md` |
| Quests & progression | `docs/QUESTS.md` |
| Player-facing game guide | `docs/GAME_GUIDE.md` |
| Combat narrator format | `docs/combat-narrator.md` |
| Economy YAML source of truth | `docs/profession-economy-master.yaml` |

For file inventories (routes, services, components, pages, cron jobs, middleware), search the codebase directly rather than relying on a static list.
