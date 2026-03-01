# Implementation Prompt: Codebase Optimization — Phase 1 (Hygiene & Critical Fixes)

You are the Team Lead for the Realm of Crowns project. You have completed a diagnostic audit and findings are in `prompts/research-codebase-optimization-findings.md`. Your task is to implement fixes for the **Critical** and **Important** findings.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/backend-api.md
cat .claude/agents/database.md
cat .claude/agents/web-design.md
cat prompts/research-codebase-optimization-findings.md
```

## Team

Assemble based on what the audit found. Likely needed:

- **Archer** — Code Quality Engineer — Fixes anti-patterns, deduplicates code, removes dead code
- **Petra** — Performance Engineer — Adds indexes, fixes N+1 queries, optimizes hot paths
- **Nix** — Project Hygiene Specialist — Cleans file pollution, fixes configs, tightens gitignore

## Mission

Read the audit findings file. Then execute fixes in priority order:

### Priority 1: Project Hygiene (Nix)

1. **Clean root directory:**
   - Create `tmp/` directory, add to `.gitignore`
   - Move ALL `sim_*.json` files to `tmp/sim-outputs/`
   - Move ALL `analyze_*.js` files to `tmp/analysis-scripts/`
   - Move ALL `diag_*.js` files to `tmp/diagnostic-scripts/`
   - Move misc JSON dumps (`roc_items.json`, `roc_recipes.json`, `tanner_recipes.json`, `lw_recipes.json`, etc.) to `tmp/data-exports/`
   - Move `run_*.sh` and `run_*.js` files to `tmp/` or `scripts/` if they're useful
   - Remove `nul` file from root
   - Move `admin_token.txt` and `token_v17.txt` to `tmp/` and add to `.gitignore` if not already
   - Update `.gitignore` to cover `tmp/`, `sim_*.json`, `analyze_*.js`, `diag_*.js`, `*.token.txt`, `admin_token.txt`
   - **IMPORTANT:** Do `git rm --cached` for any files that were previously tracked before adding to .gitignore

2. **Fix any dependency or config issues** found in the audit.

### Priority 2: Critical Code Fixes (Archer)

For each **Critical** finding in the audit:

1. Read the finding carefully
2. Locate the exact code
3. Make the **minimal surgical fix** — do not refactor surrounding code
4. Verify the fix doesn't break anything

Focus areas (adjust based on actual audit findings):
- Fix any missing `await` on async calls
- Add error handling where it's missing on critical paths
- Fix any unbounded queries with LIMIT or pagination
- Replace any hardcoded game values with shared data references
- Remove clearly dead code (orphan files, commented blocks, unused exports)

### Priority 3: Performance Fixes (Petra)

For each **Critical** or **Important** performance finding:

1. Add missing database indexes (create a Prisma migration)
2. Fix N+1 query patterns with `include` or `Promise.all()`
3. Parallelize sequential DB calls where safe
4. Add Prisma `select` to endpoints returning overly large payloads

### Rules

- **Minimal changes only.** Fix what the audit found. Don't go on a refactoring adventure.
- **One commit per priority level** — so we can revert cleanly if needed.
- **Test after each priority level** — run `npm run build` in both client and server to verify no breaks.
- **Do NOT touch:** game balance, economy data, combat mechanics, or any gameplay logic.
- **Do NOT rename** routes, services, or components — that's a separate task.
- **Skip Nice-to-Have items** — those are for a future prompt if Tony wants them.

## Completion Checklist

After all fixes:

1. `npm run build` succeeds in `/client`
2. `npm run build` succeeds in `/server`
3. `npx tsc --noEmit` passes in `/server` (no new type errors)
4. Git commit each priority level separately:
   - `git add -A && git commit -m "chore: clean root directory and fix gitignore"`
   - `git add -A && git commit -m "fix: critical code quality issues from audit"`
   - `git add -A && git commit -m "perf: database indexes and query optimization"`
5. `git push`
6. Deploy to Azure with unique tag: `docker build -t rocregistry.azurecr.io/realm-of-crowns:optim-YYYYMMDD` → push → `az containerapp update`
7. Run database migration in production if any Prisma schema changes

## Output

After completion, write a summary to `prompts/codebase-optimization-results.md`:
- What was fixed (with file paths)
- What was intentionally skipped and why
- Any new issues discovered during fixes
- Before/after metrics (file count in root, `any` type count, etc.)
