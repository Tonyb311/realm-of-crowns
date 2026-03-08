# Codebase Optimization: Critical + Important Items (10 of 18)

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
  - **Narrative Designer** — Story, lore, dialogue, quests, world-building
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **UX/UI Designer** — Interface layout, player flow, menus, HUD, accessibility
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review
  - **Art Director** — Visual style, asset guidance, theming, mood and atmosphere

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies (HTML, CSS, JavaScript/TypeScript, Canvas/WebGL where appropriate, and relevant backend stacks).
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Consider both solo and multiplayer implications when relevant.
- Keep scope realistic for a browser game. Avoid over-engineering or suggesting AAA-scale solutions.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together and flags open questions or next steps.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Keep the game's vision consistent across all teammate contributions.
- Always end with a clear summary of what was delivered and what still needs the user's input.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/backend-developer.md
```

Read the full audit findings:

```bash
cat prompts/research-codebase-optimization-findings.md
```

---

## Task Overview

Fix all 4 Critical items and all 6 Important items from the codebase audit. Work in order — Critical first, then Important.

**Commit after EACH numbered item** (10 commits total). This keeps changes reviewable and revertable. Do NOT batch multiple items into one commit.

---

## CRITICAL ITEMS

### Item 1: Exposed JWT Tokens — DELETE + SECURE

**Action:**
1. Delete `admin_token.txt` and `token_v17.txt` from the project root
2. Add `*_token.txt` pattern to `.gitignore`
3. Verify neither file is tracked by git (`git ls-files admin_token.txt token_v17.txt`)

**IMPORTANT:** Do NOT commit the token files to git history. They are currently untracked (good). Just delete from disk and add the gitignore pattern. No credential rotation needed — solo dev, early development, files were never in git.

```bash
git add .gitignore
git commit -m "Security: delete exposed JWT token files, add *_token.txt to .gitignore"
```

### Item 2: Root Directory Cleanup — 170 Temp Files

**Action:**
1. Delete ALL of these from the project root:
   - `sim_*.json` (125 files, ~12.5 GB)
   - `analyze_*.js` (14 files)
   - `diag_*.js` (11 files)
   - `*_recipes.json` / `*_items.json` (4 files)
   - `sim_login.js`, `sim_runner.js`, `run_v28_sim.js`, `generate_v24_excel.js`, `run_v19.sh`
   - `files.zip`
   - `nul` (Windows artifact)
2. Add patterns to `.gitignore`:
   ```
   # Simulation & temp artifacts
   sim_*.json
   analyze_*.js
   diag_*.js
   *_recipes.json
   *_items.json
   *.xlsx
   run_*.js
   run_*.sh
   generate_*.js
   nul
   files.zip
   ```
3. Verify none of these are git-tracked before deleting. If any ARE tracked, `git rm` them.

**CAUTION:** Do NOT delete files that are INSIDE proper directories (like `server/src/scripts/`). Only delete files that are loose in the project root `D:\realm_of_crowns\`.

```bash
git add .gitignore
git commit -m "Hygiene: remove 170 temp files from root, add patterns to .gitignore"
```

### Item 3: Hardcoded Game Constants → Shared Data

**Action:** Extract hardcoded game constants from route files into `/shared/src/data/` config files.

**3a. Crafting constants** (`server/src/routes/crafting.ts:41-105`)

Create `shared/src/data/crafting-config.ts`:
```typescript
export const CRAFTING_CONFIG = {
  TIER_LEVEL_REQUIRED: { /* extract exact values from crafting.ts:41+ */ },
  QUALITY_BONUS: { /* extract exact values */ },
  // ... any other crafting constants in that block
} as const;
```

Then update `crafting.ts` to import from shared:
```typescript
import { CRAFTING_CONFIG } from '@roc/shared/data/crafting-config';
```

**3b. Profession constants** (`server/src/routes/professions.ts:29-35`)

Create `shared/src/data/profession-config.ts`:
```typescript
export const PROFESSION_CONFIG = {
  BASE_MAX_PROFESSIONS: /* value */,
  CATEGORY_LIMITS: { /* values */ },
} as const;
```

**3c. Building constants** (`server/src/routes/buildings.ts:85-100`)

Create `shared/src/data/building-config.ts`:
```typescript
export const BUILDING_CONFIG = {
  STONE_BUILDINGS: [ /* values */ ],
  WOOD_BUILDINGS: [ /* values */ ],
  // ... building categorizations
} as const;
```

**3d. Combat PvE constants** (`server/src/routes/combat-pve.ts:39`)

Create `shared/src/data/combat-config.ts` (or add to existing if one exists):
```typescript
export const COMBAT_PVE_CONFIG = {
  COMBAT_TTL: 3600,
} as const;
```

**For each file:**
1. Read the route file to extract the EXACT constant values
2. Create the shared data file with those exact values
3. Update the route file to import from shared
4. Verify TypeScript compiles with no errors

**DO NOT change any values.** This is a pure extraction refactor — same values, different location.

```bash
git add -A
git commit -m "Refactor: extract 50+ hardcoded game constants from routes to shared/data/"
```

### Item 4: Racial Relations Cache

**Action:** Add Redis caching to the racial relations matrix query in both routes.

**Read both files first:**
```bash
cat server/src/routes/races.ts
cat server/src/routes/diplomacy.ts
```

**4a. Extract shared helper:**

Create `server/src/lib/racial-relations.ts`:
```typescript
import { prisma } from '../db';
import { redis } from '../redis'; // or however redis is imported in the codebase

const CACHE_KEY = 'racial-relations-matrix';
const CACHE_TTL = 3600; // 1 hour — matrix only changes on deploy

export async function getRacialRelationsMatrix() {
  // Check Redis cache first
  const cached = await redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // Cache miss — query DB
  const relations = await prisma.racialRelation.findMany();
  await redis.set(CACHE_KEY, JSON.stringify(relations), 'EX', CACHE_TTL);
  return relations;
}
```

**IMPORTANT:** Before writing this, check how Redis is used in existing routes. Match the exact import path, client instance name, and set/get patterns already in the codebase. Don't introduce a new Redis pattern.

**4b. Update both routes** to use the shared helper instead of direct `prisma.racialRelation.findMany()`.

**4c.** Verify both routes return identical responses to before (same data shape, same fields).

```bash
git add -A
git commit -m "Perf: cache racial relations matrix (190 rows, 1hr TTL), deduplicate across 2 routes"
```

---

## IMPORTANT ITEMS

### Item 5: Type `simulation/actions.ts` — 118 `any` → Proper Types

**This is the biggest item. Read the full file first:**
```bash
cat server/src/lib/simulation/actions.ts
```

**Action:** Replace `any` types with proper types. Strategy:

1. **Identify the common patterns** — most `any` types will be:
   - Function parameters (bot action handlers)
   - Database query results (Prisma types)
   - JSON payloads (need interfaces)
   - Catch blocks (`catch (error: any)` → `catch (error: unknown)`)

2. **Create interfaces** for the bot action system in `server/src/lib/simulation/types.ts` (or at top of actions.ts if a types file doesn't exist):
   - `BotAction`, `BotActionResult`, `BotState`, etc.

3. **Replace `any` types** — work top to bottom through the file:
   - Function params: add proper types
   - Prisma returns: use generated Prisma types
   - Catch blocks: change `any` to `unknown`, add type guards
   - JSON fields: type as `Record<string, unknown>` or specific interfaces

4. **For the remaining ~70 `any` types in route catch blocks** across other files:
   - Do a global find-replace: `catch (error: any)` → `catch (error: unknown)`
   - This is safe — the existing `handlePrismaError` and `logRouteError` patterns accept unknown errors

**Target: reduce 409 → under 50.** Don't try to eliminate every single one — some are justified (dynamic Prisma includes, JSON columns). Focus on the 118 in actions.ts + the ~70 catch blocks.

```bash
git add -A
git commit -m "Types: replace 350+ 'any' types with proper types (actions.ts + route catch blocks)"
```

### Item 6: `.dockerignore` Update

**Action:** Add the temp file patterns to `.dockerignore`:

```bash
cat .dockerignore
```

Add these patterns (if not already present):
```
# Simulation & temp artifacts
sim_*.json
analyze_*.js
diag_*.js
*_recipes.json
*_items.json
*.xlsx
run_*.js
run_*.sh
generate_*.js
*_token.txt
nul
files.zip

# Development artifacts
prompts/
*.md
!README.md
studio-website/
```

```bash
git add .dockerignore
git commit -m "Docker: exclude 12.5 GB of temp files from build context"
```

### Item 7: Duplicate Inventory Transformation

**Action:**

```bash
cat server/src/routes/characters.ts
```

1. Find the two duplicate inventory transformation blocks (~lines 237-261 and 352-367)
2. Extract to `server/src/lib/inventory-transform.ts`:
   ```typescript
   export function transformInventoryForClient(inventory: /* Prisma type */) {
     // ... the shared transformation logic
   }
   ```
3. Update both usages in `characters.ts` to call the shared function
4. Verify TypeScript compiles

```bash
git add -A
git commit -m "Refactor: extract duplicate inventory transformation to shared helper"
```

### Item 8: Parallelize Elections Nomination Queries

**Action:**

```bash
cat server/src/routes/elections.ts
```

Find the nomination handler (~lines 53-107) with 4 sequential queries. Refactor:

```typescript
// Query 1 must be first (needs election data for subsequent queries)
const election = await prisma.election.findUnique({ ... });
if (!election) return res.status(404)...;

// Queries 2-4 can run in parallel
const [mayorCheck, termCount, existingCandidate] = await Promise.all([
  prisma.town.findFirst({ ... }),      // mayor check
  prisma.election.count({ ... }),       // term limits
  prisma.electionCandidate.findUnique({ ... }), // duplicate check
]);
```

**IMPORTANT:** Read the actual code first. The queries might have dependencies between them that prevent parallelization. If query 3 depends on query 2's result, only parallelize what's safe. The audit said queries 2-4 are independent, but verify.

```bash
git add -A
git commit -m "Perf: parallelize 3 independent DB queries in election nomination (4 round-trips → 2)"
```

### Item 9: Orphan Client Pages Investigation

**Action:**

```bash
cat client/src/App.tsx
```

Or wherever the router config lives (could be `client/src/router.tsx`, `client/src/routes.tsx`, etc.). Search for:
- `ApothecaryPage`
- `CodexPage`
- `JobsBoardPage`
- `TavernPage`
- `SupplyChainView`

**For each page:**
- If routed and reachable → leave alone, note in commit
- If imported but route is commented out → leave alone, note as "planned feature"
- If NOT imported/routed anywhere → delete the file

**CAUTION:** Before deleting, also search for:
```bash
grep -r "ApothecaryPage\|CodexPage\|JobsBoardPage\|TavernPage\|SupplyChainView" client/src/
```
to catch lazy imports, dynamic imports, or references outside the router.

```bash
git add -A
git commit -m "Cleanup: resolve 5 orphan client pages (delete dead / document planned)"
```

### Item 10: `studio-website/` Orphan Directory

**Action:**

This is Tony's Babe Crest Studios website — it has its own `.git/` so it's a separate repo that was cloned inside the game project.

1. Check if it's in `.gitignore` already
2. If NOT in `.gitignore`, add `studio-website/` to `.gitignore`
3. Do NOT delete it — it's a separate project the user may want
4. Just ensure it's excluded from the game project's git tracking and Docker builds

```bash
git add .gitignore
git commit -m "Hygiene: exclude studio-website/ from game project git + Docker"
```

---

## Final Verification

After all 10 items:

```bash
# Verify TypeScript compiles
cd server && npx tsc --noEmit && cd ..
cd client && npx tsc --noEmit && cd ..
cd shared && npx tsc --noEmit && cd ..

# Run combat sim to verify no regressions
cd server && npx ts-node src/scripts/combat-sim-runner.ts
```

All 65 scenarios must still pass.

Then deploy:
```bash
git push
```

Deploy to Azure (unique image tag, never :latest) and run database seed in production.

---

## Scope Boundaries

### DO:
- Fix all 4 Critical items
- Fix all 6 Important items
- Commit after each item (10 commits)
- Verify TypeScript compiles after each change
- Run combat sim at the end

### DO NOT:
- Touch the 8 Nice-to-Have items (separate task)
- Change any game balance values during constant extraction
- Modify combat engine code
- Add new features
- Refactor code beyond what's specified per item
