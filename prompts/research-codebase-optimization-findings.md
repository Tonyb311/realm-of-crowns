# Codebase Optimization Audit Findings

**Audit Date:** 2026-03-01
**Auditors:** Nix (Hygiene), Archer (Quality), Petra (Performance)
**Mode:** Diagnostic only — NO code changes made

---

## Critical (Fix These First)

### 1. Exposed JWT Tokens in Root Directory
- **Category:** Hygiene / Security
- **Location:** `admin_token.txt`, `token_v17.txt`
- **Issue:** Two JWT tokens with admin credentials stored as plaintext files in the project root. Not tracked by git (good), but present on disk and could leak.
- **Impact:** Compromised admin access if files are shared, copied, or accidentally committed.
- **Effort:** Low
- **Action:** Delete both files. Rotate admin credentials in production. Add `*_token.txt` to `.gitignore`.

### 2. Root Directory Pollution — 150+ Temp Files
- **Category:** Hygiene
- **Location:** Project root (`D:\realm_of_crowns\`)
- **Issue:** 170 development artifacts cluttering the root:
  - `sim_*.json`: **125 files** (~12.5 GB) — simulation run outputs
  - `analyze_*.js`: **14 files** — one-off analysis scripts
  - `diag_*.js`: **11 files** — diagnostic scripts
  - `*_recipes.json` / `*_items.json`: **4 files** — data dumps
  - Other: `sim_login.js`, `sim_runner.js`, `run_v28_sim.js`, `generate_v24_excel.js`, `run_v19.sh`, `files.zip`, `nul`
- **Impact:** 12.5 GB disk waste, cognitive clutter, slows Docker build context (`.dockerignore` doesn't exclude these).
- **Effort:** Low
- **Action:** Move to `sim-data/` or delete. Add explicit patterns to `.gitignore` and `.dockerignore`:
  ```
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
  ```

### 3. Hardcoded Game Values in Routes
- **Category:** Quality
- **Location:** Multiple route files
- **Issue:** 50+ game balance constants hardcoded in routes instead of `/shared/src/data/`:
  - `server/src/routes/crafting.ts:41-105` — `TIER_LEVEL_REQUIRED`, `QUALITY_BONUS`
  - `server/src/routes/professions.ts:29-35` — `BASE_MAX_PROFESSIONS`, `CATEGORY_LIMITS`
  - `server/src/routes/buildings.ts:85-100` — Building categorizations (`stoneBuildings`, `woodBuildings`)
  - `server/src/routes/combat-pve.ts:39` — `COMBAT_TTL = 3600`
- **Impact:** Changing game balance requires editing route files (fragile, violates CLAUDE.md rule). Risk of inconsistency between server and client.
- **Effort:** Medium (4 hours)
- **Action:** Extract to `/shared/src/data/` config files.

### 4. Racial Relations Matrix — Uncached 190-Row Query (x2 routes)
- **Category:** Performance
- **Location:** `server/src/routes/races.ts:80`, `server/src/routes/diplomacy.ts:115`
- **Issue:** Both routes execute `prisma.racialRelation.findMany()` (190 rows, full table scan) on every request with NO Redis cache. Identical code duplicated in two files.
- **Impact:** ~5-10ms per request wasted. Under load, this becomes a hot path since the relations matrix is displayed on multiple pages.
- **Effort:** Low (5 min per route)
- **Action:** Add `cache(3600)` middleware — the 20x20 matrix only changes on deploy.

---

## Important (Fix Soon)

### 5. Excessive `any` Types — 409 Instances
- **Category:** Quality / TypeScript
- **Location:** 83 files across server and client
- **Issue:** 409 uses of `any` type. Worst offenders:
  - `server/src/lib/simulation/actions.ts` — **118 instances** (entire bot action system untyped)
  - `server/src/lib/simulation/seed.ts` — 7 instances
  - `server/src/lib/class-ability-resolver.ts` — 9 instances
  - Route handlers — ~70 instances (mostly `catch (error: any)`)
- **Impact:** Type errors pass silently. Simulation bugs are harder to catch. Refactoring is risky without type safety.
- **Effort:** High (6+ hours for simulation code, 2 hours for routes)
- **Action:** Priority: type `simulation/actions.ts` first (highest count + active development).

### 6. `.dockerignore` Missing Temp File Patterns
- **Category:** Hygiene / Performance
- **Location:** `.dockerignore`
- **Issue:** Simulation JSON files (12.5 GB), analysis scripts, recipe dumps, and Excel files are NOT excluded from Docker build context.
- **Impact:** Docker builds copy 12.5 GB of unnecessary data into the build context, dramatically slowing `docker build` and `az acr build`.
- **Effort:** Low (5 min)
- **Action:** Add patterns listed in Critical #2.

### 7. Duplicate Inventory Transformation Logic
- **Category:** Quality
- **Location:** `server/src/routes/characters.ts:237-261` and `:352-367`
- **Issue:** Identical 25-line inventory-to-frontend mapping appears twice in the same file (in `/me` and `/me/inventory` endpoints).
- **Impact:** Any change to inventory shape must be updated in 2 places. Risk of silent inconsistency.
- **Effort:** Low (1 hour)
- **Action:** Extract to `server/src/lib/inventory-transform.ts`.

### 8. Elections Nomination — 4 Sequential DB Queries
- **Category:** Performance
- **Location:** `server/src/routes/elections.ts:53-107`
- **Issue:** 4 sequential `await` calls that could be parallelized:
  1. `election.findUnique()` (line 53) — must be first
  2. `town.findFirst()` for mayor check (line 78) — could parallelize
  3. `election.count()` for term limits (line 87) — could parallelize
  4. `electionCandidate.findUnique()` (line 101) — could parallelize
- **Impact:** ~50-100ms per nomination request (4 round-trips → 2).
- **Effort:** Low (10 min)
- **Action:** Wrap queries 2-4 in `Promise.all()` after query 1.

### 9. Orphan Client Pages — 5 Potentially Dead Files
- **Category:** Quality
- **Location:** `client/src/pages/`
- **Issue:** Pages that may not be routed/reachable:
  - `ApothecaryPage.tsx`
  - `CodexPage.tsx`
  - `JobsBoardPage.tsx`
  - `TavernPage.tsx`
  - `admin/SupplyChainView.tsx`
- **Impact:** Dead code adds maintenance burden and bundle size.
- **Effort:** Low (1 hour to investigate routing)
- **Action:** Check router config. Delete if unreachable, add routes if intentional.

### 10. `studio-website/` Orphan Directory
- **Category:** Hygiene
- **Location:** `studio-website/` in project root
- **Issue:** Contains its own `.git/` (separate repository), `.claude/`, and `.gitignore`. Not listed in root `package.json` workspaces. Last modified Feb 18, 2026.
- **Impact:** Confusing project structure. 230 KB waste.
- **Effort:** Low
- **Action:** Review ownership — either integrate into workspaces or remove.

---

## Nice-to-Have (Fix When Convenient)

### 11. Missing Index on DiplomacyEvent.timestamp
- **Category:** Performance
- **Location:** `database/prisma/schema.prisma:760-774`
- **Issue:** `DiplomacyEvent` table has no `@@index([timestamp])`. Queries for "recent diplomatic events" do full table scans.
- **Impact:** ~1-2ms per query (low frequency, low impact currently).
- **Effort:** Low (2 min + migration)

### 12. Unused `clsx` Dependency in Client
- **Category:** Hygiene
- **Location:** `client/package.json`
- **Issue:** `clsx` is listed as a dependency but never imported anywhere in `client/src/`.
- **Impact:** Minor (15 KB in node_modules, no runtime effect).
- **Effort:** Low (1 min)

### 13. Redundant `tsconfig.production.json`
- **Category:** Hygiene
- **Location:** `server/tsconfig.production.json`
- **Issue:** Standalone config that duplicates all options from `tsconfig.json` instead of extending `tsconfig.build.json`. Three tsconfig files exist:
  - `tsconfig.json` — Dev (paths to `../shared/src/*`)
  - `tsconfig.build.json` — Build (extends base, paths to `../shared/dist/*`)
  - `tsconfig.production.json` — Docker (standalone copy, paths to `../shared/dist/*`)
- **Impact:** Maintenance burden — changes to compiler options must be made in 2+ places.
- **Effort:** Low
- **Action:** Refactor production.json to extend build.json, or use build.json in Dockerfile directly.

### 14. Type Assertions — 200 Uses of `as`
- **Category:** Quality / TypeScript
- **Location:** Multiple files
- **Issue:** 200 type assertions. Worst offenders:
  - `combat-engine.ts` — 17 assertions
  - `combat-logger.ts` — 10 assertions
  - Various route handlers — 50+ combined
- **Impact:** Type assertions mask potential errors at compile time. Most are justified (Prisma JSON fields, union narrowing) but some indicate weak typing at the source.
- **Effort:** Medium (3+ hours)

### 15. Fire-and-Forget Pattern in Market Route
- **Category:** Quality
- **Location:** `server/src/routes/market.ts:128`
- **Issue:** `onMarketSell(character.id).catch(() => {})` — quest trigger silently swallows errors.
- **Impact:** If quest trigger fails, player gets no feedback. Low frequency but poor practice.
- **Effort:** Low (30 min)

### 16. Election Routes Include Full Town Object
- **Category:** Performance
- **Location:** `server/src/routes/elections.ts:55`
- **Issue:** `include: { town: true }` returns all 15 town fields when only `id` and `name` are needed.
- **Impact:** ~2-5 KB extra per response (minor).
- **Effort:** Low (5 min)

### 17. Admin Route Uses `console.error` Instead of `logRouteError`
- **Category:** Quality
- **Location:** `server/src/routes/admin/errorLogs.ts:71`
- **Issue:** Uses `console.error('Error logs list error:', error)` instead of the standard `logRouteError(req, 500, ...)` pattern used by all other routes.
- **Impact:** Error not captured by structured logging system. Admin-only, low frequency.
- **Effort:** Low (15 min)

### 18. Missing Indexes on Low-Traffic Tables
- **Category:** Performance
- **Location:** `database/prisma/schema.prisma`
- **Issue:** Several tables lack indexes beyond primary key: `CharacterAppearance`, `ChangelingDisguise`, `ForgebornMaintenance`, `ServiceAction`, `RacialAbilityCooldown`, `LivestockRecord`
- **Impact:** Minimal — these tables are low-traffic and small. Would only matter at scale.
- **Effort:** Low per table (migration required)

---

## Metrics Summary

| Metric | Count |
|--------|-------|
| Total `any` types found | 409 (across 83 files) |
| Total `as` type assertions | 200 |
| `@ts-ignore` / `@ts-expect-error` | **0** (excellent) |
| Root directory pollution files | **170** (~12.5 GB) |
| Routes missing error handling | 0 (all have try/catch) |
| Routes with inconsistent error logging | 1 (admin/errorLogs.ts) |
| Unbounded production queries | 0 (all bounded by business logic) |
| N+1 query patterns | 2 (racial relations matrix x2 routes) |
| Missing cache on hot endpoints | 2 (races.ts, diplomacy.ts) |
| Exposed credential files | 2 (admin_token.txt, token_v17.txt) |
| Unused dependencies | 1 (clsx in client) |
| Orphan client pages | 5 (need routing verification) |
| Orphan directories | 1 (studio-website/) |
| Duplicate code blocks | 1 (inventory transformation) |
| Hardcoded game values in routes | 50+ constants across 4+ files |
| Sequential DB queries (parallelizable) | 1 endpoint (elections nomination) |
| Redundant config files | 1 (tsconfig.production.json) |
| **Estimated total tech debt items** | **18** |

---

## Strengths Noted

- **Error handling:** Consistent try/catch + `handlePrismaError` + `logRouteError` across all 59 route files (788 error patterns)
- **Validation:** All routes use Zod middleware — no missing validation
- **TypeScript discipline:** Zero `@ts-ignore` or `@ts-expect-error` comments
- **Database transactions:** Properly used for inventory, combat, marketplace operations
- **Frontend dependencies:** Well-chosen (date-fns over moment, tree-shakeable imports, no lodash)
- **React Query:** 243 instances of `useQuery`/`useMutation` — consistent data fetching
- **Prisma indexes:** 95+ explicit `@@index` directives across 60+ models — excellent coverage
- **Promise.all:** 23 occurrences in routes — already parallelizing where obvious
- **React.memo:** Used sparingly and correctly (4 map components — appropriate, not over-memoized)
- **Multi-stage Docker build:** Properly configured with non-root user
