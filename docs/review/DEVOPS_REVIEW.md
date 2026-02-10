# DevOps & Infrastructure Review -- Realm of Crowns

**Date:** 2026-02-10
**Reviewer:** devops-reviewer (Claude Opus 4.6)
**Scope:** Docker, environment config, logging, testing, CI/CD, performance, monitoring, dependencies

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 4     |
| MAJOR    | 12    |
| MINOR    | 10    |
| SUGGESTION | 8   |

---

## 1. Secrets & Environment Configuration

### FINDING-001: Real Azure credentials committed in .env files on disk
- **Severity:** CRITICAL
- **Files:** `D:\realm_of_crowns\.env` (lines 1-5), `D:\realm_of_crowns\database\.env` (lines 1-5)
- **Description:** The root `.env` and `database/.env` contain real Azure PostgreSQL credentials, a real Azure Redis access key, and a predictable JWT secret. While these files are in `.gitignore` and are not currently tracked by git, they exist on disk and risk accidental exposure. The JWT secret is predictable and not cryptographically random. (Actual credential values redacted from this review.)
- **Recommended fix:**
  1. Immediately rotate all exposed credentials (Azure DB password, Redis key, JWT secret).
  2. Use a secrets manager (Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault) for production.
  3. Generate JWT secrets with a cryptographically secure random generator (e.g., `openssl rand -base64 64`).
  4. Add a pre-commit hook to prevent `.env` files from ever being staged.

### FINDING-002: Hardcoded credentials in docker-compose.yml
- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\docker-compose.yml` (lines 7-8, 41-43)
- **Description:** The production docker-compose.yml hardcodes database credentials (`roc_user`/`roc_password`), `DATABASE_URL` with plaintext password, and `JWT_SECRET: change-this-to-a-random-secret-in-production`. This file IS tracked by git. Anyone with repo access sees these credentials. The JWT secret placeholder string is the actual value used if no override is provided.
- **Recommended fix:**
  1. Use Docker secrets, environment variable files, or `env_file:` directive pointing to an untracked `.env` file.
  2. Remove all hardcoded secrets from `docker-compose.yml`.
  3. Use `${VARIABLE:-default}` interpolation with `.env` files for development.
  4. Document the required environment variables without exposing values.

### FINDING-003: database/.env may leak into Docker build context
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\.dockerignore` (no `database/.env` exclusion)
- **Description:** The `.dockerignore` excludes `.env` (root only via pattern matching) but the `server/Dockerfile` copies the entire `database/` directory at line 19: `COPY database/ ./database/`. The `.dockerignore` pattern `.env` matches the root `.env` but may not match `database/.env` depending on the Docker version. This means `database/.env` (which contains real Azure credentials) could be included in the Docker image layer.
- **Recommended fix:** Add explicit patterns to `.dockerignore`:
  ```
  **/.env
  **/.env.*
  database/.env
  ```

### FINDING-004: Non-assertion of JWT_SECRET existence at startup
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\middleware\auth.ts` (line 15), `D:\realm_of_crowns\server\src\routes\auth.ts` (line 29), `D:\realm_of_crowns\server\src\socket\middleware.ts` (line 24)
- **Description:** All JWT operations use `process.env.JWT_SECRET!` (non-null assertion) without validating that the environment variable actually exists. If JWT_SECRET is not set, `jwt.sign()` and `jwt.verify()` will receive `undefined`, causing cryptographic failures or accepting tokens signed with `undefined` as key. The server starts successfully without JWT_SECRET, creating a silent security vulnerability.
- **Recommended fix:** Add startup validation in `server/src/index.ts` or a dedicated config module:
  ```typescript
  const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`FATAL: Missing required env var: ${key}`);
      process.exit(1);
    }
  }
  ```

### FINDING-005: Azure PostgreSQL using sslmode=prefer instead of require
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\.env` (line 2), `D:\realm_of_crowns\database\.env` (line 2)
- **Description:** The DATABASE_URL uses `sslmode=prefer`, which will fall back to unencrypted connections if SSL negotiation fails. For a cloud-hosted database (Azure), this means database traffic could travel unencrypted. The `.env.example` correctly shows `sslmode=require` in its Azure example comment.
- **Recommended fix:** Change to `sslmode=require` (or `sslmode=verify-full` with CA certificate for maximum security) for all non-local database connections.

---

## 2. Docker

### FINDING-006: Server Docker image runs as root
- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\server\Dockerfile`
- **Description:** The production stage of the Dockerfile never creates or switches to a non-root user. The Node.js process runs as `root` inside the container, which means a container escape or application vulnerability gives the attacker root privileges.
- **Recommended fix:** Add a non-root user in the production stage:
  ```dockerfile
  RUN addgroup -g 1001 -S appuser && adduser -u 1001 -S appuser -G appuser
  USER appuser
  ```
  Place this before the `CMD` instruction.

### FINDING-007: Client Dockerfile nginx runs as root
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\Dockerfile`
- **Description:** The nginx-based client container also runs as root. The `nginx:alpine` image runs as root by default.
- **Recommended fix:** Use `nginx:alpine-unprivileged` base image, or add user configuration to switch to a non-root user. Adjust the `listen` directive if needed (unprivileged users cannot bind to port 80).

### FINDING-008: No database migration step in Docker deployment
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docker-compose.yml`
- **Description:** The `docker-compose.yml` starts the server directly with `CMD ["node", ...]` but never runs Prisma migrations. On first deployment or schema changes, the database will be empty/outdated, causing immediate 500 errors. There is no entrypoint script that runs `prisma migrate deploy` before starting the server.
- **Recommended fix:** Add an entrypoint script to the server Dockerfile that runs migrations before starting:
  ```bash
  #!/bin/sh
  npx prisma migrate deploy --schema=/app/database/prisma/schema.prisma
  exec node -r tsconfig-paths/register dist/index.js
  ```
  Or add a migration service in docker-compose that runs before the server starts.

### FINDING-009: No Docker health check for the server container
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docker-compose.yml` (lines 34-54)
- **Description:** The `postgres` and `redis` services have health checks, but the `server` service does not. Docker (and orchestrators like Kubernetes or ECS) cannot determine if the server is actually healthy, only that the process is running. The server has a `/api/health` endpoint that could be used.
- **Recommended fix:**
  ```yaml
  server:
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
  ```

### FINDING-010: Docker layer caching sub-optimal for client Dockerfile
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\Dockerfile`
- **Description:** The client Dockerfile copies `shared/package.json` and installs dependencies, but does not separately copy `shared/` source before `client/` source. The layer ordering is acceptable, but both `shared/` and `client/` are copied together, meaning a change in shared source code (which is common) invalidates the client source copy cache. The server Dockerfile handles this better by copying them sequentially.
- **Recommended fix:** This is minor and the current approach is functionally correct.

---

## 3. Logging

### FINDING-011: No structured logging -- all output is unstructured console.log/console.error
- **Severity:** MAJOR
- **File:** All 73 server files (384 occurrences of console.log/error/warn)
- **Description:** The entire server uses raw `console.log()` and `console.error()` with inconsistent formats. Some use prefixes like `[DailyTick]`, `[Redis]`, `[Cache]`, `[Admin]`, `[Jobs]`, while others use plain strings like `'Registration error:'`. There is no structured logging (JSON format), no log levels (DEBUG/INFO/WARN/ERROR), no correlation IDs for request tracing, and no log rotation. This makes production debugging, log aggregation (ELK, Datadog, etc.), and alerting extremely difficult.
- **Recommended fix:**
  1. Adopt a structured logger like `pino` or `winston` with JSON output.
  2. Implement log levels (DEBUG for dev, INFO+ for production).
  3. Add request correlation IDs via middleware.
  4. Configure log rotation or ship to a centralized logging service.

### FINDING-012: Sensitive data logged in admin password reset
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\admin\users.ts` (line 157)
- **Description:** The admin password reset logs `[Admin] Password reset for user ${user.username} by admin ${req.user!.userId}`. While it does not log the actual password (good), the `error` catch on line 160 logs the full error object which could contain request body data in stack traces, potentially including `newPassword`.
- **Recommended fix:** Sanitize error logging to never include request body data. Use a custom error serializer.

### FINDING-013: Presence Redis errors silently swallowed
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\socket\presence.ts` (lines 31, 38, 51)
- **Description:** Multiple Redis operations in the presence module catch errors with `catch { /* ignore */ }`, providing zero visibility into Redis failures. If Redis goes down, presence tracking silently degrades with no alerts.
- **Recommended fix:** Log a warning at minimum: `catch (err) { console.warn('[Presence] Redis error:', err.message); }`.

---

## 4. Testing

### FINDING-014: No test coverage reporting configured
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\jest.config.js`, `D:\realm_of_crowns\server\package.json`
- **Description:** Jest is configured but there is no `--coverage` flag, no coverage thresholds, and no `coverageDirectory` or `coverageReporters` configuration. The CI pipeline (`ci.yml`) runs tests without coverage reporting. There is no way to track whether code coverage is improving or regressing.
- **Recommended fix:**
  1. Add coverage configuration to `jest.config.js`:
     ```js
     collectCoverage: true,
     coverageDirectory: 'coverage',
     coverageThreshold: { global: { branches: 60, functions: 60, lines: 70, statements: 70 } },
     ```
  2. Add `--coverage` to the CI test step and upload coverage artifacts.

### FINDING-015: Missing test suites for critical systems
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\__tests__/`
- **Description:** 8 test suites exist (auth, characters, combat, economy, politics, social, quests, progression). However, there are NO tests for:
  - **Professions** (28 profession system, learn/abandon, XP curves, tiers)
  - **Crafting system** (recipes, quality rolls, ingredient consumption, batch crafting)
  - **Buildings** (construction, property tax, degradation, workshops)
  - **Caravans** (cargo, escorts, bandit events)
  - **Travel system** (routes, border crossing, tariffs)
  - **Daily tick processor** (the 15-step game engine, the most complex single file at 1776 lines)
  - **Racial mechanics** (120 racial abilities, special mechanics for 6 exotic races)
  - **Diplomacy** (treaties, wars, relations matrix)
  - **Admin routes** (password reset, role changes, game tools)
  - **Zones** (exclusive access, zone resources)
  - **Food system** (hunger, buffs, spoilage)

  The daily tick processor (`daily-tick.ts`) is the single most critical piece of game logic and has zero test coverage.
- **Recommended fix:** Prioritize test coverage for `daily-tick.ts`, crafting, professions, and racial mechanics. These are the systems most likely to have regressions.

### FINDING-016: Tests use production database (no test database isolation)
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\__tests__\setup.ts`
- **Description:** The test setup creates a `PrismaClient` that connects to whatever `DATABASE_URL` is set. The CI correctly uses a separate `realm_of_crowns_test` database, but local development has no such guard. If a developer runs `npm test` without changing `DATABASE_URL`, tests will run against the development database (or worse, the Azure production database from the `.env` file), creating and deleting real data.
- **Recommended fix:** Add a guard in `jest.setup.ts` or `setup.ts`:
  ```typescript
  if (!process.env.DATABASE_URL?.includes('_test')) {
    throw new Error('Tests must run against a test database. Set DATABASE_URL to a *_test database.');
  }
  ```

### FINDING-017: Test cleanup is fragile -- relies on manual entity tracking
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\__tests__\setup.ts` (lines 14-25, 334-448)
- **Description:** Test cleanup tracks created entity IDs in module-level arrays and manually deletes them in reverse dependency order. This approach is brittle: if a test creates entities through the API (like the auth.test.ts register test does), those entities are NOT tracked and must be manually cleaned up (line 41: `prisma.user.delete`). Any test that forgets cleanup leaves orphaned data. The cleanup function itself is 100+ lines of cascading deletes.
- **Recommended fix:** Use database transactions for test isolation (wrap each test in a transaction that rolls back), or use `prisma migrate reset` between test suites, or use a fresh schema for each test run.

---

## 5. CI/CD

### FINDING-018: CI pipeline has no deployment step
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\.github\workflows\ci.yml`
- **Description:** The CI pipeline runs lint, test, build, and Docker build, but has no deployment step. Docker images are built but not pushed to any registry. There is no deployment to staging or production. The pipeline is purely validation -- getting code deployed requires manual steps.
- **Recommended fix:** Add deployment stages:
  1. Push Docker images to a container registry (ACR, ECR, GHCR).
  2. Add a staging deployment stage (triggered on merge to main).
  3. Add a production deployment stage (triggered on tag/release).

### FINDING-019: No dependency caching in CI test job
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\.github\workflows\ci.yml` (line 67-74)
- **Description:** The `test` job uses `actions/setup-node@v4` with `cache: npm`, which caches npm packages. However, the Prisma client generation runs on every build. The `npm ci` runs full install every time. For a monorepo with many dependencies, this adds significant time.
- **Recommended fix:** Consider caching the Prisma client generation output and `node_modules` more aggressively.

### FINDING-020: No lint/format checking in CI
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\.github\workflows\ci.yml`
- **Description:** The CI job named `lint` actually only does TypeScript type-checking (`tsc --noEmit`), not linting. The root `package.json` has an `eslint` lint script, but it's never run in CI. There's no Prettier or formatting check either.
- **Recommended fix:** Add actual ESLint running to the CI pipeline. Consider adding Prettier for consistent formatting.

---

## 6. Performance

### FINDING-021: No graceful shutdown handling
- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\server\src\index.ts`
- **Description:** The server has no handler for `SIGTERM` or `SIGINT` signals. When the process is terminated (container restart, deployment, scaling), active HTTP requests are dropped mid-flight, WebSocket connections are severed without cleanup, Redis connections are abandoned, Prisma connection pool is not drained, and cron jobs may be interrupted mid-execution (e.g., the daily tick which takes significant time). This can cause data corruption, especially if the daily tick processor is mid-transaction.
- **Recommended fix:**
  ```typescript
  async function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}, shutting down gracefully...`);
    httpServer.close();
    io.close();
    if (redis) await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  }
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  ```

### FINDING-022: Redis KEYS command used in production code
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\lib\redis.ts` (line 34)
- **Description:** The `invalidateCache` function uses `redis.keys(pattern)` which is an O(N) command that scans ALL keys in the Redis database. In production with thousands of cached entries, this blocks the single-threaded Redis event loop. The Redis documentation explicitly warns: "KEYS should only be used in production environments with extreme care."
- **Recommended fix:** Use `SCAN` with cursor-based iteration instead of `KEYS`:
  ```typescript
  async function invalidateCache(pattern: string): Promise<void> {
    if (!redis) return;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  }
  ```

### FINDING-023: No Prisma connection pool configuration
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\lib\prisma.ts`, `D:\realm_of_crowns\database\prisma\schema.prisma`
- **Description:** The Prisma client is created with default connection pool settings. By default, Prisma uses `connection_limit = num_cpus * 2 + 1`. For a game server handling concurrent requests from many players, the default pool size may be too small, leading to connection exhaustion under load. There's no `connection_limit` parameter in the DATABASE_URL, and no `pool_timeout` configuration.
- **Recommended fix:** Add connection pool parameters to DATABASE_URL:
  ```
  ?connection_limit=20&pool_timeout=30
  ```
  Or configure via Prisma client options. Monitor connection usage and adjust based on actual load.

### FINDING-024: Daily tick processes ALL characters in single invocation
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\jobs\daily-tick.ts`
- **Description:** The `processDailyTick()` function loads ALL characters from the database at once (line 169: `prisma.character.findMany`), all buildings (line 1362: `prisma.building.findMany`), all town resources, etc. While it processes in batches of 50 (`BATCH_SIZE = 50`), the initial data load is unbounded. With thousands of players, this could cause:
  - Memory spikes from loading all records
  - Long-running transactions that hold database locks
  - The entire tick taking minutes, blocking the Node.js event loop
- **Recommended fix:** Implement cursor-based pagination for all bulk queries. Process in streaming fashion rather than loading all data upfront. Consider running the daily tick in a separate worker process.

### FINDING-025: Socket.io has no configuration for scaling
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\index.ts` (lines 26-31)
- **Description:** The Socket.io server is created with minimal configuration (only CORS). There are no settings for:
  - `maxHttpBufferSize` (default 1MB -- a malicious client could send large payloads)
  - `pingInterval`/`pingTimeout` (stale connections may not be cleaned up promptly)
  - Transport configuration (WebSocket only vs polling fallback)
  - No Redis adapter for horizontal scaling (multiple server instances cannot share Socket.io state)

  The presence system uses an in-memory `Map` (`onlineUsers`), which means presence tracking breaks if multiple server instances are deployed.
- **Recommended fix:**
  1. Add `@socket.io/redis-adapter` for multi-instance support.
  2. Configure `maxHttpBufferSize`, `pingInterval`, `pingTimeout`.
  3. Move the in-memory presence Maps to Redis-only storage.

### FINDING-026: No request body size limit
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\app.ts` (line 16)
- **Description:** `express.json()` is used without a `limit` option, defaulting to 100KB. While 100KB is reasonable for most endpoints, there is no differentiation between endpoints that should accept large payloads (file uploads, rich text messages) and those that should only accept small payloads (login, gathering).
- **Recommended fix:** Set an explicit global limit and override for specific endpoints if needed:
  ```typescript
  app.use(express.json({ limit: '16kb' }));
  ```

### FINDING-027: Express not configured to trust proxy
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\app.ts`
- **Description:** When running behind nginx (as configured in docker-compose), Express does not know the client's real IP address. `app.set('trust proxy', 1)` is not configured. This means `express-rate-limit` rate-limits based on the nginx container's IP (all users share one rate limit), and `req.ip` returns the proxy's IP instead of the client's real IP.
- **Recommended fix:** Add `app.set('trust proxy', 1)` before the rate limiter middleware.

---

## 7. Monitoring & Health Checks

### FINDING-028: Health check endpoint is superficial
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\app.ts` (lines 29-36)
- **Description:** The `/api/health` endpoint returns `{ status: 'ok' }` without actually checking the health of dependencies. It does not verify:
  - PostgreSQL connectivity (Prisma can connect)
  - Redis connectivity
  - Available memory
  - Cron job status (is the daily tick running on schedule?)

  A server could return "ok" even if the database is down or Redis is disconnected.
- **Recommended fix:** Implement a deep health check:
  ```typescript
  app.get('/api/health', async (_req, res) => {
    const checks: Record<string, boolean> = {};
    try { await prisma.$queryRaw`SELECT 1`; checks.database = true; }
    catch { checks.database = false; }
    try { if (redis) { await redis.ping(); checks.redis = true; } else { checks.redis = false; } }
    catch { checks.redis = false; }
    const allHealthy = Object.values(checks).every(Boolean);
    res.status(allHealthy ? 200 : 503).json({ status: allHealthy ? 'ok' : 'degraded', checks });
  });
  ```

### FINDING-029: No metrics collection or APM
- **Severity:** MINOR
- **File:** N/A (missing entirely)
- **Description:** There is no application performance monitoring (APM), no Prometheus metrics endpoint, no request duration tracking, no database query timing, and no error rate tracking. For a game server expected to handle concurrent players, performance visibility is critical for capacity planning and incident response.
- **Recommended fix:** Add basic metrics collection with `prom-client` or similar:
  - HTTP request duration histogram
  - Active WebSocket connection gauge
  - Database query duration histogram
  - Cron job execution time and success/failure
  - Cache hit/miss ratio

### FINDING-030: No alerting mechanism for cron job failures
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\jobs\index.ts`, `D:\realm_of_crowns\server\src\jobs\daily-tick.ts`
- **Description:** Cron job failures are logged to stdout but there is no alerting mechanism. If the daily tick fails (the entire game economy depends on it), nobody is notified. The `runStep` function in `daily-tick.ts` catches errors per-step, which is good for isolation, but a complete tick failure produces only a console log.
- **Recommended fix:** Integrate with an alerting service (PagerDuty, OpsGenie, Discord webhook, etc.) for critical job failures. At minimum, emit a health check signal (heartbeat) that can be monitored externally.

---

## 8. Dependencies

### FINDING-031: Version ranges too loose -- all use caret (^) ranges
- **Severity:** MINOR
- **Files:** All `package.json` files
- **Description:** All dependencies use caret (`^`) version ranges (e.g., `"express": "^4.19.0"`), which allows minor version updates. While `package-lock.json` pins exact versions for reproducible installs, the caret ranges mean `npm install` (without lock file) could pull different versions. Some notable loose ranges:
  - `"socket.io": "^4.7.0"` -- could jump to 4.8, 4.9, etc.
  - `"@prisma/client": "^5.15.0"` -- Prisma minor versions can have breaking changes
  - `"jest": "^30.2.0"` (server), but `"ts-jest": "^29.4.6"` -- major version mismatch between Jest 30 and ts-jest 29

- **Recommended fix:** Pin exact versions for critical dependencies (Prisma, Socket.io, Express). Verify that `ts-jest@29.x` is compatible with `jest@30.x` -- this is likely a version incompatibility.

### FINDING-032: Jest 30 with ts-jest 29 -- potential incompatibility
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\package.json` (lines 38-40)
- **Description:** The server uses `jest@^30.2.0` but `ts-jest@^29.4.6`. Jest 30 is a major version jump from 29 and ts-jest may not be fully compatible. This could cause test failures, incorrect transforms, or subtle bugs.
- **Recommended fix:** Either downgrade Jest to 29.x to match ts-jest, or upgrade ts-jest to 30.x when available.

### FINDING-033: No vulnerability scanning in CI
- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\.github\workflows\ci.yml`
- **Description:** The CI pipeline does not run `npm audit` or any dependency vulnerability scanning. Known CVEs in dependencies would not be detected until manually checked.
- **Recommended fix:** Add `npm audit --audit-level=high` to the CI pipeline, or integrate with Dependabot/Snyk for automated vulnerability scanning.

### FINDING-034: Duplicate TypeScript dependency across workspaces
- **Severity:** SUGGESTION
- **Files:** `package.json` (root), `server/package.json`, `client/package.json`, `shared/package.json`, `database/package.json`
- **Description:** TypeScript `^5.4.0` is declared as a devDependency in 5 separate package.json files. npm workspaces should hoist this to the root, but the redundant declarations add maintenance burden.
- **Recommended fix:** Declare TypeScript only in the root `package.json` and remove from workspace packages. npm workspaces will resolve it from the root.

---

## 9. Additional Operational Concerns

### FINDING-035: Server startup runs 11 cron jobs AND the index.ts jobs -- duplicate execution risk
- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\index.ts` (lines 74-87), `D:\realm_of_crowns\server\src\jobs\index.ts`
- **Description:** The `server/src/index.ts` file directly imports and starts 11 individual cron jobs (election lifecycle, tax collection, law expiration, resource regeneration, etc.) in the `httpServer.listen()` callback. Meanwhile, `server/src/jobs/index.ts` defines a `registerJobs()` function that schedules a single consolidated daily tick that replaces those same 10 jobs. The `index.ts` code comments say some are deprecated but still calls them. If `registerJobs()` is also called somewhere, the same jobs could run twice -- once as individual crons and once as part of the daily tick. Even if `registerJobs()` is not called, the 11 individual cron jobs in `index.ts` are running alongside whatever the daily tick does, leading to potential double-processing of elections, taxes, building maintenance, etc.
- **Recommended fix:** Remove the individual job starts from `index.ts` and call `registerJobs(io)` instead. The daily-tick consolidation was designed to replace them.

### FINDING-036: Rate limiter configured too restrictively for a game API
- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\app.ts` (lines 20-26)
- **Description:** The global rate limiter allows only 100 requests per 15 minutes (6.7 req/min). For an MMORPG where a single page load might make 5-10 API calls, and players actively craft/trade/combat, this limit would be hit within 2-3 minutes of active gameplay. The rate limiter also applies to ALL `/api/` routes uniformly, including the health check.
- **Recommended fix:**
  1. Increase the global limit to 500-1000 requests per 15 minutes.
  2. Apply stricter per-route limits on expensive operations (auth/register, combat actions).
  3. Exclude the health check from rate limiting.
  4. With `trust proxy` not set (Finding-027), the limiter treats all users behind nginx as one IP -- combining these issues means ALL players share 100 requests per 15 minutes.

### FINDING-037: No CORS origin validation for production
- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\app.ts` (line 13), `D:\realm_of_crowns\server\src\index.ts` (line 28)
- **Description:** CORS origin falls back to `http://localhost:3000` if `CLIENT_URL` is not set. In production, if `CLIENT_URL` is accidentally omitted, the server would only accept requests from localhost -- blocking all real users. Conversely, the docker-compose.yml sets `CLIENT_URL: http://localhost` which differs from the nginx configuration serving on port 80.
- **Recommended fix:** Validate `CLIENT_URL` at startup. For production, ensure the CORS origin matches the actual client domain.

### FINDING-038: No request logging middleware
- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\app.ts`
- **Description:** There is no HTTP request logging middleware (like `morgan` or `pino-http`). In production, there is no way to audit which endpoints are being called, by whom, how long they take, or what HTTP status codes are returned. The only logging is manual `console.error` in error handlers.
- **Recommended fix:** Add `morgan` or `pino-http` middleware for structured HTTP access logging.

### FINDING-039: Logout endpoint does not invalidate JWT
- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\routes\auth.ts` (lines 137-139)
- **Description:** The `/api/auth/logout` endpoint returns `{ message: 'Logged out successfully' }` without doing anything. JWTs remain valid until they expire (7 days). A stolen token cannot be revoked. There is no token blacklist in Redis.
- **Recommended fix:** Implement a JWT blacklist in Redis. On logout, add the token's `jti` (or token hash) to a Redis set with TTL matching the remaining token lifetime.

### FINDING-040: No backup strategy documented or automated
- **Severity:** SUGGESTION
- **File:** N/A (missing entirely)
- **Description:** There are no database backup scripts, no automated backup cron, no backup verification, and no disaster recovery documentation. For a game with persistent player data (characters, items, gold, buildings, political state), data loss would be catastrophic.
- **Recommended fix:** Implement automated PostgreSQL backups (pg_dump or WAL-based continuous archiving) with tested restore procedures. For Azure, enable Azure Backup for the PostgreSQL Flexible Server.

### FINDING-041: No database connection error recovery in Prisma client
- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\lib\prisma.ts` (lines 15-17)
- **Description:** The Prisma client calls `$connect()` on startup and logs an error if it fails, but the server continues running. Subsequent requests will fail with database connection errors but the server reports healthy via `/api/health`. There is no reconnection logic or circuit breaker pattern.
- **Recommended fix:** Either fail fast (exit the process) on initial connection failure, or implement a health-aware startup that waits for database connectivity before accepting traffic.

---

## Summary of Critical Findings

| # | Finding | Severity | Impact |
|---|---------|----------|--------|
| 001 | Real Azure credentials on disk in .env | CRITICAL | Credential exposure risk |
| 002 | Hardcoded secrets in docker-compose.yml (git-tracked) | CRITICAL | Secrets in version control |
| 006 | Docker containers run as root | CRITICAL | Container escape = root access |
| 021 | No graceful shutdown (SIGTERM/SIGINT) | CRITICAL | Data corruption on restarts |
| 004 | JWT_SECRET not validated at startup | MAJOR | Silent auth vulnerability |
| 005 | SSL mode "prefer" for cloud database | MAJOR | Unencrypted DB traffic possible |
| 008 | No DB migration in Docker deployment | MAJOR | Broken deployments |
| 011 | No structured logging | MAJOR | Undebuggable production |
| 014 | No test coverage reporting | MAJOR | Blind to regressions |
| 015 | Missing tests for 80%+ of systems | MAJOR | Untested critical code |
| 018 | No CD pipeline | MAJOR | Manual deployments |
| 022 | Redis KEYS in production | MAJOR | Performance degradation |
| 023 | No DB connection pool config | MAJOR | Connection exhaustion |
| 025 | Socket.io not configured for scaling | MAJOR | Cannot scale horizontally |
| 028 | Health check does not verify dependencies | MAJOR | False positive health |
| 035 | Duplicate cron job execution risk | MAJOR | Double-processing game logic |

---

## Recommended Priority Order

1. **Immediate (security):** Rotate all leaked credentials (Finding-001). Remove hardcoded secrets from docker-compose.yml (Finding-002). Add startup env var validation (Finding-004).
2. **High (stability):** Add graceful shutdown (Finding-021). Fix duplicate cron jobs (Finding-035). Run containers as non-root (Finding-006). Replace `redis.keys()` with SCAN (Finding-022).
3. **Medium (operability):** Adopt structured logging (Finding-011). Deep health checks (Finding-028). Add DB migration to Docker entrypoint (Finding-008). Configure `trust proxy` (Finding-027).
4. **Lower (quality):** Add test coverage (Finding-014/015). Add deployment pipeline (Finding-018). Configure Socket.io for scaling (Finding-025). Add metrics/monitoring (Finding-029).
