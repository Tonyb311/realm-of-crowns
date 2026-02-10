# Backend Code Review -- Realm of Crowns

**Review Date:** 2026-02-10
**Scope:** `server/src/` -- all route handlers, middleware, services, socket handlers, and infrastructure
**Reviewer:** Automated code review via Claude Opus 4.6

---

## Table of Contents

1. [Route Handlers](#1-route-handlers)
2. [Middleware Pipeline](#2-middleware-pipeline)
3. [Database Queries](#3-database-queries)
4. [Error Handling](#4-error-handling)
5. [Security](#5-security)
6. [Business Logic Bugs](#6-business-logic-bugs)
7. [Socket.io](#7-socketio)
8. [Summary Statistics](#8-summary-statistics)

---

## 1. Route Handlers

### CRITICAL-R01: Combat endpoints trust client-sent weapon/spell data
- **File:** `server/src/routes/combat-pve.ts`, lines 20-40 (combatActionSchema)
- **File:** `server/src/routes/combat-pvp.ts`, similar schema definitions
- **Description:** The Zod schema for combat actions accepts `weapon` and `spell` objects directly from the client, including `diceCount`, `diceSides`, `bonusDamage`, `attackBonus`, and `damageType`. The server uses these values to calculate damage without verifying them against the character's actual equipped items in the database. A malicious client can send arbitrarily high weapon stats.
- **Recommended Fix:** On each combat action, look up the character's equipped weapon from the `CharacterEquipment` table, load its template stats, and use those server-side values instead of client-provided data. Only accept the action *type* (attack, spell, flee, item) from the client.

### CRITICAL-R02: Governance law voting has no duplicate vote prevention
- **File:** `server/src/routes/governance.ts`, vote-law endpoint
- **Description:** When a council member votes on a law (for or against), the route simply increments `votesFor` or `votesAgainst` on the `Law` record. There is no check for whether this council member has already voted on this law, and no `CouncilVote` join table or unique constraint to prevent repeat voting. A council member can call the endpoint repeatedly to stuff the ballot.
- **Recommended Fix:** Create a `LawVote` junction table with a unique constraint on `(lawId, characterId)` or check for an existing vote before incrementing. The elections route correctly handles this pattern (it has duplicate vote detection via unique constraint).

### MAJOR-R03: PvP leaderboard loads all completed sessions into memory
- **File:** `server/src/routes/combat-pvp.ts`, leaderboard endpoint
- **Description:** The leaderboard query does `prisma.combatSession.findMany({ where: { type: { in: ['DUEL', 'ARENA'] }, status: 'completed' }, include: { participants: { include: { character: ... } } } })` with no `take` limit. As the game grows, this will load every completed PvP session with all participants into memory to compute rankings, causing Out-of-Memory crashes.
- **Recommended Fix:** Use a materialized leaderboard table updated by a cron job, or use SQL aggregation queries with `GROUP BY` and `ORDER BY` to compute rankings server-side with pagination.

### MAJOR-R04: Quest available endpoint cached with per-user data
- **File:** `server/src/routes/quests.ts`, `GET /available`
- **Description:** The available quests endpoint uses the `cache(60)` middleware, which caches responses by URL only (`cache:${req.originalUrl}`). Since this returns different quest data per user (based on their completed quests, level, location), the first user's response is cached and returned to all subsequent users for 60 seconds.
- **Recommended Fix:** Either remove caching from this endpoint or modify the cache middleware to include the user ID in the cache key for authenticated endpoints.

### MAJOR-R05: Loan issuance lacks Zod validation
- **File:** `server/src/routes/loans.ts`, lines 22-106
- **Description:** The `POST /issue` endpoint does not use the `validate()` middleware. While it does manual validation of each field inside the handler, this is inconsistent with the rest of the codebase and misses type coercion that Zod provides. The `principal`, `interestRate`, and `termDays` fields from `req.body` could be strings instead of numbers, leading to unexpected behavior with arithmetic operations.
- **Recommended Fix:** Add a Zod schema (`z.object({ borrowerId: z.string().uuid(), principal: z.number().int().min(1), interestRate: z.number().min(0.01).max(0.10), termDays: z.number().int().min(7).max(30) })`) and pass it to `validate()`.

### MAJOR-R06: Caravan collect does not verify character is in destination town
- **File:** `server/src/routes/caravans.ts`, lines 591-675
- **Description:** The `POST /:caravanId/collect` endpoint deposits cargo into the player's inventory but does not check whether the character is currently in the caravan's destination town. A player could collect caravan goods from anywhere in the world.
- **Recommended Fix:** Add a check: `if (character.currentTownId !== caravan.toTownId) return res.status(400).json({ error: 'You must be in the destination town to collect' })`.

### MINOR-R07: Notifications read-all route ordering conflict
- **File:** `server/src/routes/notifications.ts`, lines 87-106
- **Description:** The `PATCH /read-all` route is defined after `PATCH /:id/read`. Express matches routes in order, so a request to `/read-all` will first match `/:id/read` with `id = "read-all"`, causing a failed notification lookup. This is a route ordering bug.
- **Recommended Fix:** Move the `PATCH /read-all` route definition before the `PATCH /:id/read` route.

### MINOR-R08: Logout endpoint is a no-op
- **File:** `server/src/routes/auth.ts`, lines 137-139
- **Description:** The logout endpoint returns a success message but does not invalidate the JWT token. Since JWTs are stateless, the token remains valid until expiration (default 7 days). If a token is compromised, there is no way to revoke it.
- **Recommended Fix:** Implement a token blacklist using Redis with TTL matching the token's remaining lifetime, and check the blacklist in the `authGuard` middleware.

### MINOR-R09: Diplomacy relations endpoint is unauthenticated
- **File:** `server/src/routes/diplomacy.ts`, line 116
- **Description:** `GET /api/diplomacy/relations` and several other diplomacy read endpoints have no `authGuard`. While the data may be intended to be public, this is inconsistent with the rest of the API where even read-only endpoints require authentication.
- **Recommended Fix:** Add `authGuard` for consistency, or document the intentional public access.

### SUGGESTION-R10: Inconsistent character lookup pattern
- **Files:** All route files
- **Description:** Every route handler independently looks up the character via `prisma.character.findFirst({ where: { userId } })`. This is duplicated across 30+ files and always uses `findFirst` (which could return a non-deterministic result if a user has multiple characters, though the schema may prevent this). Consider extracting this to shared middleware that attaches the character to the request object.
- **Recommended Fix:** Create a `characterGuard` middleware that runs after `authGuard`, looks up the character, attaches it to `req.character`, and returns 404 if not found.

---

## 2. Middleware Pipeline

### CRITICAL-M01: Cache middleware uses URL-only keys for user-specific data
- **File:** `server/src/middleware/cache.ts`
- **Description:** The cache key is `cache:${req.originalUrl}`, which does not differentiate between users. Any endpoint using `cache()` that returns user-specific data will serve cached responses from one user to another. This affects quest availability, and potentially other endpoints if `cache()` is added to more routes in the future.
- **Recommended Fix:** For authenticated routes, include the user ID in the cache key: `cache:${req.user?.userId}:${req.originalUrl}`. Alternatively, provide a `cache({ perUser: true })` option.

### MAJOR-M02: Validation middleware only validates request body
- **File:** `server/src/middleware/validate.ts`
- **Description:** The `validate()` middleware only validates `req.body`. Query parameters (`req.query`) and URL parameters (`req.params`) are never validated through Zod. Routes that accept query parameters (e.g., pagination `page`, `limit` in notifications, market browse filters) parse them manually with `parseInt()` inside handlers, which is error-prone.
- **Recommended Fix:** Extend the validation middleware to support separate schemas for body, query, and params: `validate({ body: schema, query: querySchema, params: paramsSchema })`.

### MAJOR-M03: Daily action middleware uses findFirst without ordering
- **File:** `server/src/middleware/daily-action.ts`
- **Description:** The daily action check uses `prisma.dailyAction.findFirst({ where: { characterId, actionType, gameDay } })` without an `orderBy` clause. If multiple daily action records exist for the same character/type/day (due to a race condition or bug), `findFirst` returns a non-deterministic result.
- **Recommended Fix:** Add `orderBy: { createdAt: 'desc' }` to ensure the most recent record is checked, and add a unique constraint on `(characterId, actionType, gameDay)` to prevent duplicates at the database level.

### MINOR-M04: Admin guard nests authGuard callbacks
- **File:** `server/src/middleware/admin.ts`, lines 5-12
- **Description:** The `adminGuard` manually calls `authGuard(req, res, () => { ... })` with a callback. This works but breaks Express middleware chaining conventions. If `authGuard` is refactored to be async, the callback pattern could fail silently.
- **Recommended Fix:** Use standard middleware chaining: have routes use `[authGuard, adminGuard]` as an array, where `adminGuard` only checks `req.user.role` and assumes auth already ran.

### SUGGESTION-M05: No request body size limit configured
- **File:** `server/src/app.ts`
- **Description:** Express defaults to a 100KB body size limit via `express.json()`. For a game API, some endpoints (e.g., chat messages, combat actions) should have smaller limits to prevent abuse, while others (e.g., bulk market listings) might need more. No explicit `limit` option is set.
- **Recommended Fix:** Configure `express.json({ limit: '100kb' })` explicitly and use route-specific overrides where needed.

---

## 3. Database Queries

### MAJOR-D01: N+1 query in PvE combat death penalty
- **File:** `server/src/routes/combat-pve.ts`, death penalty section
- **Description:** When a character dies, the code loads all equipped items then iterates through each one, calling `prisma.item.update()` individually in a loop to reduce durability. With 10+ equipment slots, this generates 10+ individual UPDATE queries.
- **Recommended Fix:** Use `prisma.item.updateMany()` with a `where: { id: { in: equipmentItemIds } }` clause, or batch the updates in a single `prisma.$transaction()` with a single `updateMany` call.

### MAJOR-D02: Redis KEYS command used for cache invalidation
- **File:** `server/src/lib/redis.ts`, `invalidateCache` function
- **Description:** The `invalidateCache` function uses `redis.keys(pattern)` to find keys matching a pattern, then deletes them. The `KEYS` command scans the entire Redis keyspace and is O(N). In production with thousands of cache keys, this will block the Redis server and cause latency spikes for all connected clients.
- **Recommended Fix:** Use `SCAN` with cursor-based iteration instead of `KEYS`, or track cache keys by prefix in a Redis SET for efficient bulk deletion.

### MAJOR-D03: Caravan collect has N+1 for inventory deposits
- **File:** `server/src/routes/caravans.ts`, lines 613-628
- **Description:** When collecting caravan cargo, the code loops through each cargo item, does a `findFirst` to check if the item already exists in inventory, then either creates or updates. For a caravan with 20 different item types, this generates 40 queries inside the transaction.
- **Recommended Fix:** Batch the inventory upserts using a single raw SQL query or use Prisma's `createMany` combined with conflict handling.

### MAJOR-D04: Building deposit-materials loads full inventory
- **File:** `server/src/routes/buildings.ts`, lines 265-276
- **Description:** The deposit-materials endpoint loads the character's entire inventory with template includes (`prisma.inventory.findMany({ where: { characterId }, include: { item: { include: { template: true } } } })`) to build a name-based lookup map, even though only a few specific material items are needed.
- **Recommended Fix:** Filter the inventory query to only load items whose template names match the materials being deposited.

### MINOR-D05: Duplicate character lookups in single request
- **Files:** Multiple route handlers
- **Description:** Several routes call `getCharacterForUser(userId)` and then later call `prisma.character.findUnique({ where: { id: character.id } })` to re-fetch the same character with different select/include clauses. This results in unnecessary database round-trips.
- **Recommended Fix:** Fetch the character once with all needed fields via an appropriate `include` clause.

### MINOR-D06: Diplomacy relations matrix built in application code
- **File:** `server/src/routes/diplomacy.ts`, lines 116-141
- **Description:** The `GET /relations` endpoint loads all racial relations from the database, then builds a 20x20 matrix in JavaScript by iterating over all race combinations. This is computed fresh on every request.
- **Recommended Fix:** Cache this matrix in Redis (it changes infrequently) with invalidation when a racial relation is updated.

### SUGGESTION-D07: No database indexes mentioned for common query patterns
- **Files:** Various route handlers
- **Description:** Several common query patterns (e.g., `findMany where characterId`, `findMany where townId`, `findMany where status`) rely on Prisma-generated indexes. Worth verifying the Prisma schema includes appropriate indexes for: `Inventory.characterId`, `Building.townId + type`, `CombatSession.status + type`, `Loan.borrowerId`, `Loan.bankerId`, `DailyAction.characterId + actionType + gameDay`.
- **Recommended Fix:** Audit the Prisma schema for missing `@@index` declarations on frequently-queried columns.

---

## 4. Error Handling

### MAJOR-E01: JWT_SECRET uses non-null assertion without startup validation
- **File:** `server/src/middleware/auth.ts`, line 15
- **File:** `server/src/routes/auth.ts`, line 29
- **Description:** `process.env.JWT_SECRET!` uses TypeScript's non-null assertion. If `JWT_SECRET` is not set in the environment, `jwt.sign()` will throw a cryptic runtime error, and `jwt.verify()` will reject all tokens. The server starts successfully but all auth operations fail.
- **Recommended Fix:** Add startup validation in `server/src/index.ts` that checks for required environment variables (`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`) and fails fast with a clear error message before starting the server.

### MAJOR-E02: 404 handler doesn't propagate to error handler
- **File:** `server/src/app.ts`
- **Description:** The 404 catch-all route directly sends a response (`res.status(404).json(...)`) instead of calling `next()` with an error. This means the global error handler middleware never fires for 404s, making error logging and monitoring inconsistent.
- **Recommended Fix:** Either call `next(new NotFoundError())` or accept the current behavior but document it.

### MINOR-E03: Inconsistent error response shapes
- **Files:** Various route handlers
- **Description:** Most errors return `{ error: string }`, but some return additional fields like `{ error: string, missing: [...] }` (buildings) or `{ error: string, repairCost: number }` (items). While the extra data is useful, there is no standard error envelope. Clients cannot reliably parse error responses.
- **Recommended Fix:** Standardize on an error response shape like `{ error: { code: string, message: string, details?: unknown } }`.

### MINOR-E04: Console.error used for all error logging
- **Files:** All route handlers
- **Description:** Every route handler uses `console.error('Description:', error)` for error logging. In production, this provides no structured logging, log levels, or correlation IDs. Error logs cannot be easily searched or aggregated.
- **Recommended Fix:** Integrate a structured logger (e.g., Pino, Winston) with request ID correlation, log levels, and JSON output for production.

### SUGGESTION-E05: Swallowed errors in caravan XP award
- **File:** `server/src/routes/caravans.ts`, lines 650-654
- **Description:** When awarding Merchant XP after caravan delivery, the code wraps `addProfessionXP` in a try/catch that silently swallows all errors with a comment "Player may not have Merchant profession." However, this could also swallow database connection errors, transaction failures, or other real errors.
- **Recommended Fix:** Check for the specific error case (no Merchant profession) and re-throw unexpected errors.

---

## 5. Security

### CRITICAL-S01: Chat identify event allows character impersonation
- **File:** `server/src/socket/chat-handlers.ts`, `chat:identify` event
- **Description:** The `chat:identify` socket event accepts a `characterId` from the client and sets `socket.data.characterId = character.id` after only verifying the character exists in the database. It does NOT verify that the authenticated socket user (`socket.data.userId`) actually owns that character. Any authenticated user can impersonate any other character in the chat system.
- **Recommended Fix:** Add ownership verification: `const character = await prisma.character.findFirst({ where: { id: data.characterId, userId: socket.data.userId } })`.

### CRITICAL-S02: Combat actions accept arbitrary weapon stats from client
- **File:** `server/src/routes/combat-pve.ts`, lines 20-40
- **File:** `server/src/routes/combat-pvp.ts`, similar
- **Description:** (Same as CRITICAL-R01.) The combat action schema accepts weapon and spell objects with `diceCount`, `diceSides`, `bonusDamage`, and `attackBonus` directly from the client. A player can send `{ weapon: { diceCount: 100, diceSides: 100, bonusDamage: 9999 } }` and deal massive damage.
- **Recommended Fix:** Server must look up the actual equipped weapon/spell from the database and use its stats for damage calculation.

### MAJOR-S03: No rate limiting on combat actions
- **File:** `server/src/routes/combat-pve.ts`, `server/src/routes/combat-pvp.ts`
- **Description:** While the global rate limiter applies (100 requests per 15 minutes), combat action endpoints have no specific rate limiting. A script could submit many combat actions rapidly within the global limit, potentially exploiting timing windows in the Redis-based combat state machine.
- **Recommended Fix:** Add a per-character, per-session rate limit on combat action submissions (e.g., 1 action per 2 seconds per combat session).

### MAJOR-S04: Border check endpoint lacks character ownership validation
- **File:** `server/src/routes/travel.ts`, border check endpoint
- **Description:** The border check endpoint accepts `characterId` in the request body without verifying the authenticated user owns that character. An attacker could probe border permissions for any character in the game.
- **Recommended Fix:** Look up the character using `req.user.userId` instead of accepting `characterId` from the body, consistent with other endpoints.

### MAJOR-S05: No HTML/XSS sanitization on message content
- **File:** `server/src/routes/messages.ts`
- **File:** `server/src/socket/chat-handlers.ts`
- **Description:** Message content from chat and the messaging system is stored and potentially re-served to clients without sanitization. If the frontend renders this content as HTML (e.g., via `dangerouslySetInnerHTML` or markdown renderers), stored XSS attacks are possible.
- **Recommended Fix:** Sanitize message content on input using a library like `DOMPurify` (server-side) or `sanitize-html`. Strip or escape HTML tags before storage.

### MAJOR-S06: Socket rate limiter uses socket.id as key
- **File:** `server/src/socket/middleware.ts`
- **Description:** The socket rate limiter uses `socket.id` as the rate limit key. Since `socket.id` changes on every reconnection, a user can bypass the rate limit by rapidly disconnecting and reconnecting. Additionally, the in-memory `rateLimitMap` grows unboundedly as disconnected sockets' entries are never cleaned up.
- **Recommended Fix:** Use `socket.data.userId` (set during socket authentication) as the rate limit key. Add a periodic cleanup job or use Redis for socket rate limiting with TTL keys.

### MINOR-S07: CORS allows only a single origin
- **File:** `server/src/app.ts`, line 7
- **Description:** CORS is configured as `origin: process.env.CLIENT_URL || 'http://localhost:3000'`. This only allows a single origin, which may be insufficient if the game needs to serve multiple frontend domains (e.g., staging, CDN, mobile web).
- **Recommended Fix:** Support an array of allowed origins via comma-separated env var: `CLIENT_URL=https://game.com,https://staging.game.com`.

### MINOR-S08: Rate limit of 100 requests per 15 minutes is low for a game
- **File:** `server/src/app.ts`, rate limiter config
- **Description:** The global rate limit is 100 requests per 15 minutes per IP. For an active game session where a player is navigating, trading, crafting, and chatting, this limit could easily be hit during normal gameplay. This would lock out legitimate players.
- **Recommended Fix:** Increase the global limit (e.g., 300-500 per 15 minutes) and add stricter per-endpoint limits on sensitive operations (login, registration).

### SUGGESTION-S09: No CSRF protection
- **Files:** `server/src/app.ts`
- **Description:** The API relies solely on JWT Bearer tokens for authentication. While JWTs in Authorization headers are not automatically attached by browsers (unlike cookies), if tokens are ever stored in cookies for session management, CSRF protection would be needed.
- **Recommended Fix:** If cookies are used for auth in the future, implement CSRF tokens. For now, ensure JWT is always sent via the Authorization header and not cookies.

---

## 6. Business Logic Bugs

### CRITICAL-B01: Spar cooldowns stored in-memory, lost on server restart
- **File:** `server/src/routes/combat-pvp.ts`
- **Description:** Spar cooldown tracking uses an in-memory `Map<string, number>`. When the server restarts (deployment, crash, scaling), all cooldown data is lost, allowing players to bypass spar cooldowns by waiting for or triggering a restart.
- **Recommended Fix:** Store spar cooldowns in Redis with a TTL matching the cooldown duration.

### MAJOR-B02: Human 4th profession slot not implemented
- **File:** `server/src/routes/professions.ts`
- **Description:** According to the design docs (`CLAUDE.md` and `ECONOMY.md`), Humans should get a 4th profession slot at Level 15. The professions route enforces a hard limit of 3 professions for all races, with no special case for Humans.
- **Recommended Fix:** Add a conditional check: `const maxProfessions = (character.race === 'HUMAN' && character.level >= 15) ? 4 : 3;`

### MAJOR-B03: Treaty gold cost deducted on acceptance, not on proposal
- **File:** `server/src/routes/diplomacy.ts`, lines 337-353
- **Description:** When a treaty is proposed, the proposer's treasury balance is checked but NOT deducted. Gold is only deducted when the receiver accepts. In the time between proposal and acceptance, the proposer could spend that gold elsewhere, causing the treasury balance to go negative via the `decrement` operation.
- **Recommended Fix:** Either reserve the gold at proposal time (create a hold/escrow), or re-validate the treasury balance at acceptance time before deducting.

### MAJOR-B04: Crafting collect endpoint re-sets status on already-completed actions
- **File:** `server/src/routes/crafting.ts`, line ~617
- **Description:** The crafting collect endpoint checks for `status: 'COMPLETED'` but then sets the status to `'COMPLETED'` again. If two concurrent requests hit this endpoint, both could succeed, duplicating the crafted item. There is no optimistic locking or status transition guard.
- **Recommended Fix:** Use an atomic status transition: `UPDATE ... SET status = 'COLLECTED' WHERE id = ? AND status = 'COMPLETED'`. If no rows are affected, the action was already collected.

### MAJOR-B05: Governance circular import from index.ts
- **File:** `server/src/routes/governance.ts`, imports `emitGovernanceEvent` from `'../index'`
- **File:** `server/src/routes/guilds.ts`, imports `io` from `'../index'`
- **Description:** Multiple route files import from `../index.ts`, which is the server entry point that imports all route files. This creates a circular dependency. While Node.js handles some circular imports, it can cause undefined values at import time, especially with TypeScript and ESM, leading to hard-to-debug runtime errors.
- **Recommended Fix:** Move the `emitGovernanceEvent` function to `socket/events.ts` alongside other event emitters. Never import from the entry point file.

### MAJOR-B06: Remote marketplace buy does not use Inventory system
- **File:** `server/src/routes/market.ts`, remote buy endpoint
- **Description:** The remote buy endpoint transfers item ownership by updating `item.ownerId` directly instead of going through the Inventory table. This creates an inconsistency where the buyer "owns" the item but it does not appear in their inventory. Other systems (equipment, crafting, caravans) check the Inventory table to find items.
- **Recommended Fix:** After updating the item's `ownerId`, also create an `Inventory` record for the buyer.

### MINOR-B07: War score calculation uses stored score as kill count
- **File:** `server/src/routes/diplomacy.ts`, lines 716-728
- **Description:** The war details endpoint passes `war.attackerScore` as `pvpKills` to `calculateWarScore()`, with `raids`, `territoryCaptured`, and `territoryLost` hardcoded to 0. The comment acknowledges this simplification ("stored score acts as kill count"), but it means the war score formula is not being used as designed.
- **Recommended Fix:** Track PvP kills, raids, and territory changes separately in the War model, or simplify the `calculateWarScore` function to match the actual data model.

### MINOR-B08: Caravan ambush uses Math.random() for combat outcome
- **File:** `server/src/routes/caravans.ts`, line 715
- **Description:** The fight outcome in ambush resolution uses `Math.random()` which is not cryptographically secure and is predictable. In a game where real in-game value is at stake (cargo with gold value), the randomness source should be more robust.
- **Recommended Fix:** Use `crypto.randomInt()` or a seeded PRNG for game-critical random outcomes.

### MINOR-B09: Peace negotiation is unilateral
- **File:** `server/src/routes/diplomacy.ts`, lines 754-807
- **Description:** Either ruler of a warring kingdom can unilaterally end the war via the negotiate-peace endpoint. There is no acceptance flow from the other party, unlike treaty proposals which require bilateral agreement. This contradicts the design doc's concept of "peace negotiation."
- **Recommended Fix:** Implement a peace proposal/acceptance flow similar to treaties, requiring both rulers to agree.

### SUGGESTION-B10: Building condition stored in JSON blob
- **File:** `server/src/routes/buildings.ts`
- **Description:** Building condition, rental price, rental log, and tax delinquency data are all stored in the `storage` JSON field of the Building model. This makes it impossible to query buildings by condition, find delinquent buildings efficiently, or enforce constraints at the database level. The town economics endpoint (line 1457) has to load all buildings and parse their JSON fields in application code.
- **Recommended Fix:** Promote frequently-queried fields (`condition`, `rentalPrice`, `taxDelinquentSince`) to proper database columns with indexes.

---

## 7. Socket.io

### CRITICAL-IO01: Character impersonation via chat:identify
- **File:** `server/src/socket/chat-handlers.ts`
- **Description:** (Same as CRITICAL-S01.) The `chat:identify` event allows any authenticated user to associate any `characterId` with their socket, without ownership verification. This enables sending chat messages as another player's character.
- **Recommended Fix:** Verify character ownership: `const character = await prisma.character.findFirst({ where: { id: data.characterId, userId: socket.data.userId } })`.

### MAJOR-IO02: WHISPER uses io.fetchSockets() to find recipient
- **File:** `server/src/socket/chat-handlers.ts`, WHISPER handling
- **Description:** To find the recipient socket for a whisper, the code calls `io.fetchSockets()` which loads ALL connected sockets into memory, then filters by `characterId`. With 10,000+ concurrent users, this creates an O(N) scan on every whisper message.
- **Recommended Fix:** Maintain a Redis hash map of `characterId -> socketId` (updated on connect/disconnect/identify). Look up the target socket directly by ID.

### MAJOR-IO03: Socket rate limiter memory leak
- **File:** `server/src/socket/middleware.ts`
- **Description:** The `rateLimitMap` is an in-memory `Map<string, { count: number; resetAt: number }>` keyed by `socket.id`. Entries are never removed when sockets disconnect. Over time, this map grows unboundedly as users connect and disconnect.
- **Recommended Fix:** Clean up entries on socket disconnect, or use a WeakMap if possible, or switch to Redis-based rate limiting with TTL keys.

### MAJOR-IO04: Presence tracking has potential race condition
- **File:** `server/src/socket/presence.ts`
- **Description:** The presence system maintains an in-memory Map and a Redis backup. On disconnect, it removes the user from the in-memory map and Redis. However, if a user rapidly disconnects and reconnects (common on mobile), the disconnect handler could fire after the new connection's connect handler, removing the freshly-set presence data.
- **Recommended Fix:** Use a reconnection grace period (e.g., 5 seconds) before processing disconnects. Alternatively, use only Redis for presence with TTL-based expiration.

### MINOR-IO05: No socket event payload size limits
- **File:** `server/src/socket/chat-handlers.ts`
- **Description:** Chat message content is accepted without length validation. A malicious client could send extremely large messages (megabytes of text) that get stored in the database and broadcast to other connected users.
- **Recommended Fix:** Validate message length on the server side in socket handlers (e.g., max 2000 characters for chat messages, max 500 for whispers).

### MINOR-IO06: No error handling in socket event handlers
- **File:** `server/src/socket/chat-handlers.ts`, `server/src/socket/presence.ts`
- **Description:** Socket event handlers that perform async database operations (e.g., saving chat messages, looking up characters) do not consistently wrap operations in try/catch. An unhandled promise rejection in a socket handler will crash the server process.
- **Recommended Fix:** Wrap all async socket event handlers in try/catch blocks that log the error and optionally emit an error event back to the client.

### SUGGESTION-IO07: Socket.io not configured for horizontal scaling
- **File:** `server/src/index.ts`
- **Description:** The Socket.io server is configured without an adapter. In a multi-server deployment, sockets connected to different servers cannot communicate. Room events and broadcasts only reach sockets on the same server instance.
- **Recommended Fix:** Configure the `@socket.io/redis-adapter` to use Redis as the pub/sub backend, enabling cross-server communication.

---

## 8. Summary Statistics

| Severity | Count |
|----------|-------|
| CRITICAL | 6     |
| MAJOR    | 20    |
| MINOR    | 13    |
| SUGGESTION | 7  |
| **Total** | **46** |

### Critical Issues Requiring Immediate Attention

1. **CRITICAL-R01/S02:** Combat trusts client-sent weapon stats -- allows unlimited damage exploit
2. **CRITICAL-R02:** Governance vote stuffing -- council members can vote unlimited times
3. **CRITICAL-S01/IO01:** Chat character impersonation -- any user can chat as any character
4. **CRITICAL-M01:** Cache serves User A's data to User B on cached per-user endpoints
5. **CRITICAL-B01:** Spar cooldowns lost on restart -- stored in-memory only
6. **CRITICAL-B04:** Crafting collect race condition -- can duplicate crafted items

### Priority Remediation Order

1. Fix combat weapon validation (CRITICAL-R01/S02) -- highest exploit potential
2. Fix chat character impersonation (CRITICAL-S01/IO01) -- social system integrity
3. Fix governance vote duplication (CRITICAL-R02) -- political system integrity
4. Fix cache key to include user ID (CRITICAL-M01) -- data leakage
5. Move spar cooldowns to Redis (CRITICAL-B01) -- game balance
6. Add atomic crafting collection (CRITICAL-B04) -- item duplication
7. Add startup env var validation (MAJOR-E01) -- operational stability
8. Fix PvP leaderboard unbounded query (MAJOR-R03) -- scalability
9. Fix socket memory leaks (MAJOR-IO03) -- production stability
10. Implement HTML sanitization (MAJOR-S05) -- security

---

*End of review.*
