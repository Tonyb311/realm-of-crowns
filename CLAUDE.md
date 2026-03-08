# Realm of Crowns -- Claude Code Project Context

## Critical Rules

### Honesty & Uncertainty
- **Never fabricate information.** If you don't know something — a config key, a CLI flag, how a tool works, what a setting does — say "I don't know" or "I'm not sure" instead of guessing. A wrong confident answer is far more damaging than admitting uncertainty.
- **Verify before asserting.** Before claiming a config option exists, a file doesn't exist, or a command works a certain way: actually check. Read the file, run the command, search the codebase. Don't rely on training data for tool-specific details — it's often wrong or outdated.
- **Flag your confidence level.** If you're working from memory rather than verification, say so: "I believe X but haven't verified" is acceptable. "X is how it works" without checking is not.
- **Never invent API endpoints, config keys, CLI flags, or feature names.** If you're unsure whether something exists, search for it first.

### Deployment — GITHUB ACTIONS ONLY
- **NEVER run `az acr build`.** It is permanently broken (Azure ACR "failed to download context" errors). This is not a temporary issue — do not retry it, do not try workarounds, do not use the git URL variant. The command is dead.
- **NEVER run `az containerapp update` manually.** The workflow handles this.
- **The ONLY way to deploy is the GitHub Actions workflow:**
  1. Pre-flight: `npx tsc -p server/tsconfig.build.json --noEmit` (catch TS errors before pushing)
  2. `git add <specific files>` → `git commit -m "feat: ..."` → `git push`
  3. `gh workflow run deploy.yml --ref main`
  4. Wait ~30s, then: `gh run list --workflow=deploy.yml --limit=1`
  5. On failure: `gh run view --log-failed`
- **If you find yourself typing `az acr build` or `az containerapp update`, STOP. You are doing it wrong.** Go back to step 3 above.
- Database seeds run on container startup. If seed data changed, it updates on deploy.
- Azure Container Apps will NOT pull a new image if the tag hasn't changed. The workflow auto-generates unique timestamp tags.

### Package Manager
- **This project uses pnpm**, not npm. All install/run commands use `pnpm`.
- Workspace filter syntax: `pnpm --filter @realm-of-crowns/client <command>`
- Never use `npm install` or `npm run` — use `pnpm install` and `pnpm run`.

### Economy Changes -- YAML First
- `docs/profession-economy-master.yaml` is the **single source of truth** for all professions, recipes, and economy data.
- **Workflow:** (1) Audit the YAML, (2) Create prompt from findings, (3) Implement code, (4) Update YAML. Skipping causes naming mismatches between YAML and seed files.

### Simulation Rules
- **Never run a simulation unless explicitly told to.** Deploy and seed only unless instructed.
- Prompts saved to `prompts/`. Exports go to Excel. Analysis to markdown files, keep chat minimal.
- One major task per conversation to prevent context overflow.

### Ability System
- **Skill points are removed.** No manual ability unlocking. All abilities are either auto-granted or chosen.
- **Tier 0 abilities (levels 3, 5, 8):** Class-level choices. Player picks 1 of 3 options at each level. These are pre-specialization, low-power abilities. Choice is permanent. 63 total (9 per class × 7 classes). Data in `shared/src/data/skills/{class}.ts` as tier 0 exports.
- **Spec abilities (levels 10, 14, 20, 25, 32, 40):** Auto-granted when the character reaches the required level AND has a specialization selected. No player action needed.
- **Auto-grant service:** `server/src/services/ability-grants.ts` — called on level-up and on specialization selection. Idempotent.
- **Tier 0 choice API:** `POST /api/skills/choose-tier0` (pick an ability), `GET /api/skills/tier0-pending` (what choices are available)
- **Specialization is chosen at level 10.** On selection, all qualifying spec abilities are granted retroactively. Tier 0 choices made before level 10 persist after spec selection.
- **Old level schedule was 1→5→10→18→28→40.** New schedule: tier 0 at 3/5/8, then spec abilities at 10/14/20/25/32/40.
- **Ability attack resolution types:** Every ability has an `attackType` field determining how it resolves:
  - `'weapon'` — STR/DEX + proficiency vs AC (physical attacks: Warrior melee, Rogue strikes, Ranger shots)
  - `'spell'` — class primary stat + proficiency vs AC (magical attacks: Mage bolts, Psion jabs, Cleric holy fire)
  - `'save'` — auto-hits, target rolls a save to resist/reduce (AoE spells, debuffs, CC). Save DC = 8 + prof + caster's primary stat mod.
  - `'auto'` — no roll needed (self-buffs, heals, cleanses, passives, Arcane Bolt auto-hit)
  - Default (untagged) = `'weapon'` for backward compatibility. All 180 abilities are tagged.
- **Class primary stats for spell attacks and save DCs:** Warrior=STR, Rogue=DEX, Ranger=DEX, Mage=INT, Psion=INT, Cleric=WIS, Bard=CHA. Map is `CLASS_PRIMARY_STAT` in `class-ability-resolver.ts`.
- **Combat AI chaining:** Setup→payoff ability pairs use `grantsSetupTag`/`requiresSetupTag`/`consumesSetupTag` fields on AbilityDefinition. Current chains: Vanish→Ambush (Rogue), Analyze→Exploit Weakness (Bard). Tags stored as `setupTags[]` on Combatant.
- **Psion routing:** Psion spec abilities dispatch as `psion_ability` action type and resolve through `resolvePsionAbility()` in combat-engine.ts. Psion tier 0 abilities dispatch as `class_ability` through the standard resolver.
- **Full audit docs:** `docs/audit-ability-attack-mechanics.md`, `docs/audit-combat-stat-mechanics.md`, `docs/audit-save-dc-stats.md`
- **Codex update rule:** ANY change to ability data, combat mechanics, or monster data MUST also update both codexes (player-facing `client/src/components/codex/CodexClasses.tsx` and admin `client/src/components/admin/combat/CodexTab.tsx`) if those fields are displayed. API routes: `/api/codex/classes` and `/admin/combat/codex/classes`.

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

### Code Navigation — Prefer LSP
- **Always prefer LSP tools** (`goToDefinition`, `findReferences`, `hover`, `documentSymbol`) over Grep/Glob for code navigation tasks.
- Fall back to text search (Grep, Glob) only when LSP returns no results or the file type isn't covered.
- LSP gives exact file+line answers in ~50ms vs 30-60s grep scans. Use it for: tracing function definitions, finding all call sites before refactoring, checking type signatures, and catching errors after edits.

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
| `server/src/services/ability-grants.ts` | Auto-grant abilities on level-up / spec selection |
| `docs/skill-point-removal-summary.md` | Prompt A changes: skill point removal, auto-grant |
| `docs/tier0-ability-choices-summary.md` | Prompt B changes: 63 tier 0 abilities, choice system |
| `server/src/lib/combat-logger.ts` | Structured per-encounter combat logs |
| `shared/src/types/combat.ts` | All combat type definitions |
| `prompts/` | All Claude Code task prompts |

---

## Project Overview

Browser-based fantasy MMORPG (Renaissance Kingdoms meets D&D). 20 races, 29 professions, 68 towns, player-driven economy/politics. All Phase 1-2B systems complete.

**Tech:** React 18 + TypeScript + Vite + Tailwind + Zustand | Node.js + Express | PostgreSQL 15 + Drizzle ORM | Redis 7 | Socket.io | Docker + Azure Container Apps

**Monorepo:** `client/` (React), `server/` (Express API), `shared/` (types + game data), `database/` (Drizzle schema + seeds), `docs/`, `prompts/`

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
- Database schema at `/database/schema/` (Drizzle ORM). Relations in `schema/relations.ts`.
- Drizzle config at `/database/drizzle.config.ts`. Migrations in `/database/drizzle-migrations/`.
- Server DB instance: `server/src/lib/db.ts` — exports `db` (Drizzle) and `pool` (pg Pool).
- Enums defined as `const` arrays in `shared/src/enums.ts` — import from `@shared/enums`, NOT from `@prisma/client`.
- Seeds import schema via relative `../schema` path. Server imports via `@database/index` or `@database/tables`.

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
