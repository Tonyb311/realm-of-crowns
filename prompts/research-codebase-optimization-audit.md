# Research Prompt: Codebase Optimization Audit

You are the Team Lead for the Realm of Crowns project. Your task is a **diagnostic-only** codebase audit. You will NOT make any code changes. You will dump all findings to a file.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/backend-api.md
cat .claude/agents/database.md
cat .claude/agents/web-design.md
```

## Team

Assemble these teammates:

- **Archer** — Code Quality Analyst — Finds anti-patterns, duplication, dead code, and inconsistencies
- **Petra** — Performance Engineer — Identifies slow queries, missing indexes, bundle bloat, memory leaks
- **Nix** — Project Hygiene Specialist — Finds file pollution, config issues, build problems, dependency rot

## Mission: Diagnostic-Only Audit

**Do NOT change any code.** Dump all findings to `prompts/research-codebase-optimization-findings.md`.

### Phase 1: Project Hygiene (Nix)

Scan the project root and report:

1. **Root directory pollution** — List every file in the project root that is NOT a standard config file (package.json, tsconfig.json, docker-compose.yml, README.md, CLAUDE.md, .gitignore, .dockerignore, .env, .env.example). Count them. Categorize them:
   - `sim_*.json` files (how many?)
   - `analyze_*.js` files (how many?)
   - `diag_*.js` files (how many?)
   - `*_recipes.json` / `*_items.json` files (how many?)
   - Other misc files (list each)
2. **Gitignore gaps** — Check `.gitignore` for whether these temp/sim files are being tracked in git. Run `git ls-files sim_*.json analyze_*.js diag_*.js` to confirm.
3. **Unused dependencies** — In root, client, and server `package.json`, check for dependencies that aren't imported anywhere in the codebase. Use `grep -r` to verify.
4. **Multiple tsconfig files** — The server has `tsconfig.json`, `tsconfig.build.json`, `tsconfig.production.json`. Are all three actually needed? What are the differences?
5. **Docker build efficiency** — Check Dockerfiles for multi-stage build best practices, layer caching, .dockerignore coverage.

### Phase 2: Code Quality (Archer)

Scan server and client source code and report:

1. **Duplicate code blocks** — Find functions or code blocks that appear nearly identical in multiple files. Focus on:
   - `server/src/routes/` — Are there repeated auth/validation/error-handling patterns that should be middleware?
   - `server/src/services/` — Are there duplicated database query patterns?
   - `client/src/pages/` — Are there repeated data-fetching/loading/error patterns?
   - `client/src/components/` — Are there components that do essentially the same thing?

2. **Inconsistent patterns** — Find cases where the same thing is done multiple ways:
   - Error handling: Are errors handled consistently across routes? (try/catch everywhere? Some missing?)
   - Response format: Do all routes return the same response shape?
   - State management: Is Zustand used consistently, or are there random local state patterns for global data?
   - API calls: Is React Query used everywhere, or are there raw fetch/axios calls mixed in?
   - Validation: Is Zod validation on every route or are some missing?

3. **Dead code** — Find:
   - Exported functions/constants that are never imported anywhere
   - Commented-out code blocks (more than 5 lines)
   - Files that aren't imported by any other file (orphan files)
   - Unused route handlers or service methods

4. **Anti-patterns that cause bugs** — Find:
   - Missing `await` on async calls (fire-and-forget that should be awaited)
   - Unbounded database queries (no LIMIT/pagination on SELECT queries that could return thousands of rows)
   - Missing error handling on Prisma calls (queries that could throw but aren't in try/catch)
   - Race conditions in concurrent operations (any shared mutable state without locking)
   - Hardcoded magic numbers or strings that should be constants/config
   - Any game values hardcoded in server/client instead of referencing `/shared/src/data/`

5. **TypeScript issues** — Find:
   - Uses of `any` type (count them, list the worst offenders)
   - Missing return types on functions
   - Type assertions (`as X`) that could mask errors
   - `@ts-ignore` or `@ts-expect-error` comments

### Phase 3: Performance (Petra)

1. **Database performance** — Analyze `database/prisma/schema.prisma`:
   - List all tables and which columns have indexes
   - Identify queries in services/routes that filter or sort on non-indexed columns
   - Find N+1 query patterns (loop with individual DB call inside)
   - Find any `findMany()` without pagination or limits in production-facing routes

2. **API performance** — Scan routes for:
   - Endpoints that make multiple sequential DB queries that could be parallelized with `Promise.all()`
   - Missing Redis cache on frequently-called read endpoints
   - Overly large response payloads (endpoints returning full objects when only a few fields are needed — `select` not used in Prisma queries)

3. **Frontend performance** — Scan client for:
   - Components that re-render unnecessarily (missing React.memo, useMemo, useCallback where needed)
   - Large bundle imports (are heavy libraries tree-shaken? Any full lodash import instead of lodash/specific?)
   - Image/asset optimization issues
   - Components fetching data they don't display

4. **Build performance**:
   - Check client bundle size (`npm run build` in client, report output size)
   - Check server build output for unnecessary files in dist/

## Output Format

Write ALL findings to `prompts/research-codebase-optimization-findings.md` in this format:

```markdown
# Codebase Optimization Audit Findings

**Audit Date:** [date]
**Files Scanned:** [count]

## Critical (Fix These First)
### [Finding title]
- **Category:** [Hygiene/Quality/Performance]
- **Location:** [file path(s)]
- **Issue:** [description]
- **Impact:** [what goes wrong if not fixed]
- **Effort:** [Low/Medium/High]

## Important (Fix Soon)
### [Finding title]
...

## Nice-to-Have (Fix When Convenient)
### [Finding title]
...

## Metrics Summary
- Total `any` types found: X
- Total dead/orphan files: X
- Root directory pollution files: X
- Routes missing error handling: X
- Unbounded queries: X
- N+1 query patterns: X
- Estimated total tech debt items: X
```

## Rules

- **Do NOT make code changes.** This is diagnosis only.
- Be specific — give file paths and line numbers where possible.
- Prioritize findings by actual impact, not theoretical purity.
- If a pattern exists but is working fine and not causing problems, note it as Nice-to-Have, not Critical.
- Skip test files — focus on production code only.
- Keep the output file concise but thorough. No filler prose.
