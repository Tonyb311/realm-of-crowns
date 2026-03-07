# Stack Modernization Audit
Date: 2026-03-07

## Executive Summary

The Realm of Crowns stack is **moderately outdated** across several major dependencies but **functional and stable**. The highest-impact upgrades are **Node.js 20 -> 22** (approaching EOL in April 2026), **Express 4 -> 5** (native async error handling), and **replacing the `xlsx` package** (stale npm version with known vulnerabilities). TypeScript should move to 5.8+ or 5.9 for the latest stable features before the 6.0/7.0 transition.

Most client-side upgrades (React 19, Vite 7, Tailwind 4, React Router 7) offer real improvements but have **medium-to-high migration costs** that may not justify the effort for a solo developer pre-launch. The recommendation is to tackle the **security/EOL items first**, then selectively upgrade the client stack based on Tony's bandwidth.

Prisma deserves special attention: v7 is a **major architectural change** (Rust-free, ESM-only, new config file, driver adapters required) that would touch every part of the server. This should be deferred until post-launch unless a compelling reason arises.

---

## Dependency Audit

### HIGH PRIORITY (real benefits, reasonable migration cost)

#### Node.js 20 -> 22 LTS
- **Current:** 20-alpine (Dockerfile)
- **Latest LTS:** 22.22.1
- **What we gain:** Node 20 EOL is **April 30, 2026** (next month!). Node 22 offers 30% faster startup, newer V8 engine, native `fetch`, better ESM support, and security patches until April 2027.
- **Migration cost:** LOW -- change `FROM node:20-alpine` to `FROM node:22-alpine` in Dockerfile, update CI `node-version: 22`, test for regressions.
- **Breaking changes:** Minimal. Some deprecated APIs removed, but unlikely to affect this project.
- **Recommended:** YES -- urgent. Node 20 goes EOL in ~7 weeks.

#### Express 4.22.1 -> 5.2.1
- **Current:** 4.22.1
- **Latest:** 5.2.1 (stable since late 2024, now `latest` on npm)
- **What we gain:** Native async error handling (no more try/catch wrappers or `next(err)` in async routes), `req.query` returns a plain object, better path-matching regex, removed deprecated methods.
- **Migration cost:** MEDIUM -- need to audit all route handlers and middleware. Key changes: `res.json(obj)` behavior, `req.host` vs `req.hostname`, removed `app.del()` (use `app.delete()`), `res.redirect()` status defaults, path-matching regex changes. With ~50+ routes, this is a few hours of work.
- **Breaking changes:** `req.query` is a plain object (no prototype), `res.redirect('/path')` defaults 307 not 302, `req.host` includes port, `app.listen()` doesn't return server directly.
- **Recommended:** YES -- the async error handling alone removes a class of uncaught-exception crashes.

#### TypeScript 5.4 -> 5.9.3
- **Current:** ^5.4.0 (resolves to ~5.4.x)
- **Latest stable:** 5.9.3 (TS 6.0 RC just dropped but is a bridge release)
- **What we gain:** 5.5 introduced inferred type predicates, better `isolatedDeclarations`. 5.6 added iterator helpers, `--noUncheckedSideEffectImports`. 5.7 added `--target ES2024`. 5.8 improved `--erasableSyntaxOnly` and CJS/ESM resolution. 5.9 has incremental improvements.
- **Migration cost:** LOW -- TypeScript minor versions are backward compatible. Just bump the version and run `tsc --noEmit`.
- **Breaking changes:** Minor strictness improvements may flag new errors (usually genuine bugs).
- **Recommended:** YES -- bump to `"typescript": "^5.9.0"` across all workspaces. Skip TS 6.0 for now (bridge release, deprecations for TS 7.0 Go rewrite).

#### `xlsx` 0.18.5 -> Replace with ExcelJS
- **Current:** xlsx 0.18.5 (stale on npm since 2022)
- **Latest on npm:** 0.18.5 (SheetJS abandoned npm, publishes only via CDN now)
- **What we gain:** The npm version has **known vulnerabilities** (DoS, prototype pollution in versions <= 0.19.2). SheetJS moved distribution off npm due to a legal dispute. The version on npm will never be updated.
- **Migration cost:** MEDIUM -- ExcelJS (`exceljs`) is a drop-in replacement with 2.9M weekly downloads, active maintenance, and MIT license. API differs but is well-documented.
- **Breaking changes:** Different API entirely, but `xlsx` is only used in sim export scripts, not core gameplay.
- **Recommended:** YES -- security risk. Replace with ExcelJS.

#### Helmet 7.1 -> 8.1.0
- **Current:** ^7.1.0
- **Latest:** 8.1.0
- **What we gain:** Updated Content-Security-Policy defaults, improved Cross-Origin headers. Security headers library should stay current.
- **Migration cost:** LOW -- likely zero code changes needed. `app.use(helmet())` API unchanged.
- **Breaking changes:** Some default header values changed (stricter defaults). May need to verify CSP doesn't block game assets.
- **Recommended:** YES -- security library, keep it current.

#### node-cron 3.0.3 -> 4.2.1
- **Current:** ^3.0.3
- **Latest:** 4.2.1
- **What we gain:** Better cron expression validation, improved timezone support, TypeScript types.
- **Migration cost:** LOW -- API is similar. Check cron expression syntax hasn't changed for existing scheduled tasks.
- **Breaking changes:** Some edge cases in cron expression parsing.
- **Recommended:** YES -- minor effort.

---

### LOW PRIORITY (minor benefits or high migration cost)

#### React 18.3.1 -> 19.2.4
- **Current:** 18.3.1
- **Latest:** 19.2.4
- **What we gain:** `use()` hook, improved ref handling (no more `forwardRef`), `<form>` actions, automatic batching improvements, React Compiler (Forget). Server components are irrelevant for this SPA.
- **Migration cost:** HIGH -- React 19 requires updating all `forwardRef` usage, `useContext` -> `use(Context)` migration, potential breaks with third-party libraries (framer-motion, recharts, react-hot-toast may need updates). `@types/react` changes significantly. Need to verify every component library is React 19 compatible.
- **Breaking changes:** `forwardRef` deprecated, `useContext` API change, `defaultProps` on function components removed, string refs removed entirely, implicit children typing removed.
- **Recommended:** DEFER -- real benefits but high migration cost for a solo dev. The game works fine on React 18. Upgrade when you have a quiet week and can test thoroughly.

#### Vite 5.4.21 -> 7.3.1
- **Current:** 5.4.21
- **Latest:** 7.3.1 (skipped v6 entirely)
- **What we gain:** New default browser targets, Rolldown/Oxc integration coming in v8, improved HMR, better error overlays.
- **Migration cost:** MEDIUM -- two major version jumps. v6 changes: CSS output naming, resolve conditions. v7 changes: browser target defaults, potential plugin compatibility. Need to verify `@vitejs/plugin-react` compatibility.
- **Breaking changes:** Default browser target changed, some resolve condition defaults changed, CSS library output naming.
- **Recommended:** DEFER -- Vite 5 works fine. When ready, jump straight to v7. Consider waiting for Vite 8 (Rolldown) which is the real paradigm shift.

#### Tailwind CSS 3.4 -> 4.2.1
- **Current:** ^3.4.0
- **Latest:** 4.2.1
- **What we gain:** CSS-first configuration (no `tailwind.config.js`), new high-performance Rust engine, container queries, `@starting-style`, simplified color palettes, 35% smaller output.
- **Migration cost:** HIGH -- Tailwind 4 is a **complete overhaul**. The JS config file (`tailwind.config.js`) is replaced with CSS `@theme` directives. Every custom color, font, and shadow in the current 120-line config must be migrated to CSS syntax. PostCSS setup changes. Some utility class names changed. `@apply` behavior differs.
- **Breaking changes:** Config format entirely different, some default colors removed, `@apply` limitations, plugin API changed.
- **Recommended:** DEFER -- the current design system with 50+ custom tokens in `tailwind.config.js` makes this a multi-hour migration. Not worth it pre-launch. The current Tailwind 3.4 setup is performant and feature-complete.

#### React Router 6.23 -> 7.x (now just `react-router`)
- **Current:** react-router-dom ^6.23.0
- **Latest:** react-router 7.x
- **What we gain:** ~15% smaller bundle, improved type safety, package consolidation (`react-router-dom` -> `react-router`). Loader/action APIs if you want them (you don't for this SPA).
- **Migration cost:** LOW-MEDIUM -- officially a "non-breaking upgrade" for SPA usage. Main change: uninstall `react-router-dom`, install `react-router`, update all imports. No route definition changes needed for basic usage.
- **Breaking changes:** Package rename. Some deprecated APIs removed.
- **Recommended:** DEFER -- easy migration but no critical benefit. Good candidate for a quiet afternoon.

#### Zustand 4.5 -> 5.0.11
- **Current:** ^4.5.0
- **Latest:** 5.0.11
- **What we gain:** Drops `use-sync-external-store` shim (uses native React 18+ API), slightly smaller bundle, stricter types.
- **Migration cost:** LOW-MEDIUM -- `create` function API changed (equality function via `createWithEqualityFn`), persist middleware behavior changed, some import paths changed.
- **Breaking changes:** `create` doesn't accept equality function, persist middleware no longer stores initial state, import path reorganization.
- **Recommended:** DEFER -- minor benefit. Requires React 18+ (already satisfied). Good to do alongside React Router if batching client upgrades.

#### Prisma 5.22.0 -> 7.4.2
- **Current:** 5.22.0 (server + database + shared)
- **Latest:** 7.4.2
- **What we gain:** Rust-free client (smaller, faster cold starts), driver adapters, new `prisma.config.ts` file.
- **Migration cost:** VERY HIGH -- Prisma 7 is a **massive breaking change**:
  1. Must create `prisma.config.ts` (replaces datasource URL in schema)
  2. Must use driver adapters (`PrismaPg`) instead of built-in connection
  3. Generator provider changes from `"prisma-client-js"` to `"prisma-client"`
  4. Ships as ESM only (server uses CommonJS)
  5. `prisma generate` no longer auto-runs from `prisma migrate`
  6. Dockerfile Prisma client copy paths change
  7. Connection pool settings differ
  8. Every Prisma import may need updating
- **Breaking changes:** See above. This touches server, database, shared, Dockerfile, CI, and deployment.
- **Recommended:** HARD NO for now. The current Prisma 5.22.0 still receives security patches. The migration would take 1-2 days and risk production stability. Revisit post-launch. Could consider Prisma 6 as a stepping stone but even that has breaking changes (Buffer -> Uint8Array, removed NotFoundError).

#### Zod 3.23 -> 4.3.6
- **Current:** ^3.23.0
- **Latest:** 4.3.6
- **What we gain:** 57% smaller bundle, better TypeScript performance (fewer instantiation explosions), JSON Schema -> Zod conversion.
- **Migration cost:** MEDIUM -- some API changes, import paths may differ, schema definition syntax mostly compatible but edge cases exist.
- **Breaking changes:** Some schema method signatures changed, stricter type inference.
- **Recommended:** DEFER -- nice-to-have for bundle size but not urgent. Check migration guide when ready.

#### framer-motion 11.2 -> motion (12.35.0)
- **Current:** framer-motion ^11.2.0
- **Latest:** framer-motion 12.35.0 (also available as `motion` package)
- **What we gain:** Bug fixes, performance improvements. The rebranding to `motion` makes it framework-agnostic.
- **Migration cost:** LOW -- can stay on `framer-motion` package for now (still updated). To switch to `motion`: uninstall framer-motion, install motion, update imports from `"framer-motion"` to `"motion/react"`.
- **Breaking changes:** Minor API adjustments between 11 and 12. Package name change optional.
- **Recommended:** DEFER -- works fine as-is. Bump the version range when convenient.

---

### NO ACTION NEEDED (already current or no benefit)

| Dependency | Current | Latest | Status |
|---|---|---|---|
| Socket.IO (server) | 4.8.3 | 4.8.3 | Current. Server + client versions match. |
| Socket.IO-client | 4.8.3 | 4.8.3 | Current. |
| @socket.io/redis-adapter | ^8.3.0 | 8.3.x | Current. |
| Pino | ^10.3.1 | 10.3.1 | Current. |
| @tanstack/react-query | ^5.50.0 | 5.90.21 | Auto-updates via `^`. Already resolves to latest v5. |
| tsx | ^4.15.0 | 4.21.0 | Auto-updates via `^`. |
| Jest | 30.2.0 | 30.x | Very current (Jest 30 released recently). |
| date-fns | ^3.6.0 | 3.x | Current within v3. |
| axios | ^1.7.0 | 1.x | Current. |
| cors | ^2.8.5 | 2.x | Stable, no changes needed. |
| dotenv | ^16.4.0 | 16.x | Current. |
| ioredis | ^5.4.0 | 5.x | Current. |
| jsonwebtoken | ^9.0.0 | 9.x | Stable. |
| bcryptjs | ^2.4.3 | 2.x | Stable. |
| express-rate-limit | ^7.3.0 | 7.x | Current. |
| uuid | ^10.0.0 | 10.x | Current. |
| prom-client | ^15.1.3 | 15.x | Current. |
| lucide-react | ^0.400.0 | 0.4xx | Updates frequently, caret range covers it. |
| react-hot-toast | ^2.6.0 | 2.x | Stable. |
| Recharts | ^2.12.0 | 2.x | Stable. Fine for game dashboards. Alternatives (nivo, ECharts) are overkill for this use case. |
| concurrently | ^8.2.0 | 8.x | Current. |
| pnpm | 10.30.3 | 10.x | Very current. |
| supertest | ^7.2.2 | 7.x | Current. |

---

## Tooling Audit

### Build Pipeline
- **Client:** Vite + React plugin. Well-configured with manual chunks for vendor splitting. No issues.
- **Server:** `tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json`. This works but is the **slowest** approach.
  - **Alternative:** `tsup` or `esbuild` direct would be 10-50x faster for the build step. However, the current build time (~10-15s) is acceptable for a project of this size, and the `tsc-alias` step handles the `@shared/*` path resolution cleanly.
  - **Recommendation:** No change needed. If build times become painful, consider `tsup` but it adds another tool to learn.

### Testing
- **Server:** Jest 30.2.0 with `ts-jest` 29.4.6. 118 tests across 8 suites. All passing.
- **Client:** No tests at all.
- **Should we add client tests?** For a solo dev pre-launch: **no**. The ROI on component tests for a game UI in active development is poor. The game logic lives server-side where tests exist. Consider adding client tests post-launch for regression prevention on stable components.
- **Jest vs Vitest:** Vitest is 10-20x faster and has native ESM/Vite support. However, migrating 118 working tests from Jest to Vitest is unnecessary churn. If starting fresh, Vitest would be the pick. For now, Jest 30 is fine. `ts-jest` 29.4.6 may need bumping to match Jest 30 -- verify compatibility.
- **Note:** `ts-jest` 29.4.6 is technically one major version behind Jest 30.2.0. This may cause subtle issues. Check if `ts-jest` 30.x exists.

### Linting
- **Current state:** The root `package.json` has `"lint": "eslint . --ext .ts,.tsx"` but **there is no ESLint config file** (no `.eslintrc.*` or `eslint.config.*`) in the project root. This means the lint command would use ESLint defaults (essentially nothing useful). ESLint is not listed in any `package.json` dependencies either.
- **Assessment:** Linting is effectively **not configured** for the main project. The `studio-website` has a modern `eslint.config.js` (flat config, ESLint 9), but the main game project does not.
- **Recommendation:** LOW PRIORITY -- TypeScript's strict mode already catches most issues. If Tony wants linting, add a minimal `eslint.config.js` with `@typescript-eslint` rules. But this is polish, not urgent.

### Docker
- **Base image:** `node:20-alpine` -- needs upgrading to `node:22-alpine` (see Node.js section above).
- **Multi-stage build:** Well-structured (builder + production). Production stage uses `pnpm install --prod` and copies only needed artifacts.
- **Prisma client copy:** Hardcoded version path (`@prisma+client@5.22.0_prisma@5.22.0`) will break on any Prisma version change. This is a known maintenance burden.
- **`corepack prepare pnpm@latest`:** Using `@latest` in Docker is non-deterministic. Consider pinning: `corepack prepare pnpm@10.30.3`.
- **CMD line:** The startup command is a single long `sh -c` with `&&` chaining. If any step fails silently, the next still runs. Consider splitting into a `start.sh` script with proper error handling.
- **Security:** Runs as non-root `app` user. Good.

### CI/CD
- **CI workflow (`ci.yml`):**
  - Type check, test, build, and Docker build jobs. Well-structured with parallel jobs.
  - Uses `postgres:15-alpine` for test DB -- consider matching production Postgres version.
  - Uses `npx prisma generate` (pulls Prisma globally) instead of `pnpm exec prisma generate`. Works but inconsistent with pnpm-everywhere policy.
  - Has a `docker` job that builds a `client/Dockerfile` that doesn't appear to exist (orphaned step?).
  - Missing: no `pnpm store` caching. Adding `actions/cache` for the pnpm store would cut install times by 50-70%.

- **Deploy workflow (`deploy.yml`):**
  - Manual trigger with optional tag. Uses GitHub Actions to build Docker locally and push to ACR. Clean and correct.
  - Health check URL points to `realmofcrowns.com/health` -- verify this domain is configured and the health endpoint exists.
  - Missing: no rollback step on health check failure.
  - Missing: no build validation (type check, tests) before deploying. Currently trusts that `main` is clean.

### Monorepo Tooling
- **pnpm workspaces:** Working correctly. No issues.
- **Turborepo:** Would help if builds were slow or if there were many packages. With 4 workspaces and ~15s build times, Turborepo is overkill. Not recommended.

---

## Structural Concerns

### Shared Package (`"main": "src/index.ts"`)
- **Issue:** The shared package's `package.json` has `"main": "src/index.ts"` pointing to source, not compiled output. This works because:
  - **Vite** resolves `@shared` via path alias to `../shared/src/*` directly (reads TS source).
  - **tsx** (dev server) transpiles on-the-fly, so source imports work.
  - **Production build:** `tsc` compiles shared to `dist/`, and `tsconfig.build.json` remaps `@shared/*` to `../shared/dist/*`. The Dockerfile copies `shared/dist/`.
- **Assessment:** This is an unusual but functional setup. The risk is confusion: `main` says one thing, actual resolution depends on context. It works because the project enforces strict build order (`shared` first).
- **Recommendation:** No change needed. If it causes issues later, change `main` to `"dist/index.js"` and add `"types": "dist/index.d.ts"`, but only if something breaks.

### Path Aliases (`tsconfig-paths` + `tsc-alias`)
- **Current:** Server uses `@shared/*` and `@/*` aliases. Resolved at compile time by `tsc-alias` and at runtime by `tsconfig-paths/register`.
- **Assessment:** This is the standard approach for TypeScript monorepos with CommonJS output. It works, it's well-understood, and the tools are stable.
- **Alternative:** Node.js 22 has better `--import` and subpath imports support. TypeScript 5.9 has improved path mapping. But none of these eliminate the need for `tsconfig-paths` in a CJS project.
- **Recommendation:** No change needed.

### Redis Connection
- **Current:** Single `REDIS_URL` used for both:
  1. `ioredis` instance (app-level caching, session data)
  2. Socket.IO Redis adapter (pub/sub for WebSocket scaling)
- **Concern at scale:** Socket.IO's Redis adapter uses pub/sub, which can generate significant traffic under heavy WebSocket load. This could interfere with app-level Redis operations on the same connection.
- **Assessment:** For a browser game pre-launch, this is fine. Redis Basic C0 (250MB, 256 connections) can handle both workloads at current scale.
- **Recommendation:** No change needed now. If you scale beyond ~500 concurrent WebSocket users, consider separate Redis instances for app cache vs Socket.IO pub/sub. This is a post-launch optimization.

---

## Recommended Migration Order

If proceeding with upgrades, this order minimizes risk and maximizes early wins:

### Phase 1: Security & EOL (do ASAP)
1. **Node.js 20 -> 22** in Dockerfile + CI (30 min)
2. **Replace `xlsx` with `exceljs`** in sim scripts (1-2 hours)
3. **Helmet 7 -> 8** (15 min)
4. **node-cron 3 -> 4** (15 min)

### Phase 2: Quick Wins (anytime)
5. **TypeScript 5.4 -> 5.9** across all workspaces (30 min + fixing any new type errors)
6. **Express 4 -> 5** (2-4 hours, need to audit routes)

### Phase 3: Client Stack (when bandwidth allows)
7. **React Router 6 -> 7** (1-2 hours, mostly import changes)
8. **Zustand 4 -> 5** (1 hour)
9. **framer-motion version bump** (15 min)

### Phase 4: Big Lifts (post-launch)
10. **React 18 -> 19** (4-8 hours, ecosystem compatibility)
11. **Vite 5 -> 7** (1-2 hours)
12. **Tailwind 3 -> 4** (3-6 hours, config migration)
13. **Zod 3 -> 4** (1-2 hours)

### Phase 5: Not Until Forced
14. **Prisma 5 -> 7** (1-2 days, high risk, major rewrite)

---

## Open Questions for Tony

1. **Node.js 20 EOL (April 2026):** This is urgent. Should we upgrade to Node 22 in the next deploy? It's a one-line Dockerfile change + CI update.

2. **`xlsx` vulnerability:** The npm version of `xlsx` has known security issues and will never be updated. How heavily is it used? Is it only for sim exports? If so, can we swap to ExcelJS quickly?

3. **Express 5:** The native async error handling is genuinely valuable for production stability. Worth prioritizing before launch? Or defer?

4. **Client tests:** Currently zero client-side tests. Is this acceptable for launch, or should we add basic smoke tests for critical flows (login, character creation, travel)?

5. **ESLint:** The main project has no linting configured (the lint script exists but no config file). Is this intentional? Worth setting up, or is TypeScript strict mode sufficient?

6. **CI Docker build:** The CI workflow references `client/Dockerfile` which doesn't seem to exist. Is this a dead step that should be removed?

7. **Deploy workflow health check:** The URL `realmofcrowns.com/health` -- is this domain configured? The live app is on `ambitioustree-37a1315e.eastus.azurecontainerapps.io`.

8. **`corepack prepare pnpm@latest` in Dockerfile:** Should we pin the pnpm version for reproducible builds?
