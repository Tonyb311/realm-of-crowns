# Realm of Crowns -- Consolidated Review Summary

**Date:** 2026-02-10
**Synthesized by:** Team Lead (Claude Opus 4.6)
**Source Reports:** Backend, Frontend, Database, Systems, DevOps, Documentation

---

## 1. Critical Issues

All findings rated CRITICAL across all 6 review reports, grouped by theme.

### 1.1 Security: Exposed Credentials & Secrets

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| DevOps FINDING-001 | Real Azure PostgreSQL credentials and Redis access key committed in `.env` files on disk. JWT secret is predictable, not cryptographically random. | DevOps | `D:\realm_of_crowns\.env`, `D:\realm_of_crowns\database\.env` |
| DevOps FINDING-002 | Hardcoded credentials (`roc_user`/`roc_password`, placeholder JWT secret) in `docker-compose.yml`, which IS tracked by git. | DevOps | `D:\realm_of_crowns\docker-compose.yml` |

### 1.2 Security: Combat Exploits -- Client-Trusted Weapon Stats

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Backend CRITICAL-R01 / CRITICAL-S02 | Combat action schemas accept weapon/spell objects (diceCount, diceSides, bonusDamage, attackBonus) directly from the client. Server uses these values for damage calculation without verifying against equipped items in the database. A player can send arbitrarily high weapon stats to deal unlimited damage. | Backend (x2) | `server/src/routes/combat-pve.ts` (lines 20-40), `server/src/routes/combat-pvp.ts` |

### 1.3 Security: Character Impersonation in Chat

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Backend CRITICAL-S01 / CRITICAL-IO01 | The `chat:identify` socket event accepts a `characterId` from the client and sets it without verifying the authenticated user owns that character. Any authenticated user can impersonate any character in the chat system. | Backend (x2) | `server/src/socket/chat-handlers.ts` |

### 1.4 Security: Docker Containers Run as Root

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| DevOps FINDING-006 | Server Dockerfile never creates or switches to a non-root user. Container escape or app vulnerability grants root. | DevOps | `server/Dockerfile` |

### 1.5 Data Integrity: Double Taxation Bug

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Database CRITICAL-05 | Marketplace tax is collected in TWO places: at purchase time in `market.ts` AND by the hourly cron job in `tax-collection.ts`. Every sale is taxed twice. | Database | `server/src/routes/market.ts` (lines 361-367), `server/src/jobs/tax-collection.ts` (lines 23-63) |

### 1.6 Data Integrity: Combat Resolution Not Transactional

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Database CRITICAL-03 | PvE `finishCombat` performs 5+ sequential DB writes (session status, gold/XP, equipment durability, XP awards, participant HP) without a transaction. A crash mid-way leaves the database inconsistent. | Database | `server/src/routes/combat-pve.ts` (lines 518-643) |
| Database CRITICAL-04 | PvP wager settlement validates gold at challenge time but not at settlement. Loser can spend gold between challenge and resolution, pushing balance negative via `decrement`. | Database | `server/src/routes/combat-pvp.ts` (lines 895-920) |

### 1.7 Data Integrity: Governance Vote Stuffing

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Backend CRITICAL-R02 / Database MAJOR-03 / Database MAJOR-10 / Systems MAJOR-POLI-03 | Law voting increments `votesFor`/`votesAgainst` without checking if the voter already voted. No `LawVote` tracking table exists. A single council member can vote unlimited times. | Backend, Database (x2), Systems | `server/src/routes/governance.ts` (vote-law endpoint), Prisma schema (Law model) |

### 1.8 Data Integrity: Cache Serves Wrong User's Data

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Backend CRITICAL-M01 / Backend MAJOR-R04 | Cache middleware uses URL-only keys (`cache:${req.originalUrl}`), not differentiating between users. Per-user endpoints (quest availability) serve cached data from one user to another. | Backend (x2) | `server/src/middleware/cache.ts`, `server/src/routes/quests.ts` |

### 1.9 Data Integrity: Item Duplication via Crafting Race Condition

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Backend CRITICAL-B04 | Crafting collect endpoint checks for `status: 'COMPLETED'` but sets status to `'COMPLETED'` again (not `'COLLECTED'`). Two concurrent requests can both succeed, duplicating crafted items. | Backend | `server/src/routes/crafting.ts` (line ~617) |

### 1.10 Data Integrity: Inventory Duplication

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Database CRITICAL-02 | No `@@unique([characterId, itemId])` constraint on the `Inventory` model. Concurrent requests can create duplicate rows, causing item duplication and count errors. | Database | `database/prisma/schema.prisma` (lines 508-522) |

### 1.11 Data Integrity: Spar Cooldowns Lost on Restart

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Backend CRITICAL-B01 | Spar cooldown tracking uses an in-memory `Map`. Server restart/deployment/crash loses all cooldown data, allowing unlimited sparring. | Backend | `server/src/routes/combat-pvp.ts` |

### 1.12 Performance: Redis KEYS Command Blocks Event Loop

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Database CRITICAL-06 / Backend MAJOR-D02 / DevOps FINDING-022 | `invalidateCache` uses `redis.keys(pattern)` which is O(N) and scans every key. Blocks the single-threaded Redis event loop under load. | Database, Backend, DevOps | `server/src/lib/redis.ts` (lines 31-41) |

### 1.13 Stability: No Graceful Shutdown

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| DevOps FINDING-021 | No SIGTERM/SIGINT handlers. Container restarts drop HTTP requests, sever WebSocket connections, abandon Redis/Prisma connections, and can interrupt the daily tick mid-transaction. | DevOps | `server/src/index.ts` |

### 1.14 Game Logic: Broken Crafting Chains (3 Critical Blockers)

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Systems CRITICAL-ECON-01 | Nails recipe requires Iron Ingot (Smelter L10) but Nails recipe unlocks at Smelter L5. Blocks ALL building construction. | Systems | `shared/src/data/recipes/smelter.ts` |
| Systems CRITICAL-ECON-02 | Silk Cloth recipe requires Silk Thread, but no recipe, gathering profession, or resource produces Silk Thread. Blocks cloth armor tier 3+. | Systems | `shared/src/data/recipes/tailor.ts` |
| Systems CRITICAL-ECON-03 | Exotic Leather recipe requires Exotic Hide, but no source exists. Blocks leather armor tier 4. | Systems | `shared/src/data/recipes/tanner.ts` |

### 1.15 Game Logic: War Trade Embargoes Only Apply to Rulers

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Systems CRITICAL-XSYS-01 | `getWarBetweenCharacters` only checks if the buyer/seller is a kingdom ruler. Regular citizens can trade freely across warring kingdoms, completely undermining the diplomacy system. | Systems | `server/src/services/law-effects.ts` (lines 165-190) |

### 1.16 Documentation: Outdated Inventory & Missing Psion Class

| ID | Description | Report(s) | File(s) |
|----|-------------|-----------|---------|
| Docs C1 / C2 | GAME_GUIDE.md and API_REFERENCE.md say 6 classes, omitting the fully-implemented Psion class. Players and developers building clients would not know it exists. | Docs | `docs/GAME_GUIDE.md`, `docs/API_REFERENCE.md` |
| Docs C3 | CODE_INVENTORY.md reflects ~30% of the actual codebase. Says 20 route modules (actual: 41), 4 services (actual: 31), 3 cron jobs (actual: 17), and marks several populated directories as "empty." | Docs | `docs/CODE_INVENTORY.md` |

---

## 2. Major Gaps

Key MAJOR findings representing missing features, incomplete implementations, or broken system interactions.

### 2.1 Broken Crafting & Economy Chains

| ID | Description | Report(s) |
|----|-------------|-----------|
| Systems MAJOR-ECON-04 | Copper weapons (Blacksmith L1) require Hardwood Planks (Woodworker L10). Starter weapons unreachable for new players. | Systems |
| Systems MAJOR-ECON-05 | No Bricks recipe exists. Smeltery and Kitchen buildings cannot be constructed. | Systems |
| Systems MAJOR-ECON-06 | No Cloth Padding recipe for Tailor. Plate armor crafting chain may be incomplete. | Systems |
| Systems MAJOR-ECON-07 | Rancher output names (Cattle/Pigs/Chickens) mismatch resource names (Beef/Pork/Chicken). | Systems |
| Systems MAJOR-ECON-08/09 | DESERT and RIVER biomes referenced in resource definitions but do not exist in the world. | Systems |
| Systems MAJOR-PROF-01 | No Barrel or Furniture recipes for Woodworker despite profession listing them as outputs. Brewers cannot get barrels. | Systems |

### 2.2 Missing Seed Data

| ID | Description | Report(s) |
|----|-------------|-----------|
| Database MAJOR-04 | No Kingdom seed data. Kingdom-level governance is completely nonfunctional. | Database |
| Database MAJOR-05 | Abilities and achievements not seeded via main pipeline (separate scripts exist but are not called). Skill and achievement systems nonfunctional on fresh DB. | Database |

### 2.3 Political System Flaws

| ID | Description | Report(s) |
|----|-------------|-----------|
| Systems MAJOR-POLI-01 | Election lifecycle creates infinite empty elections for unpopulated towns (68 towns, few players). | Systems |
| Systems MAJOR-POLI-02 | Impeachment uses simple plurality (`votesFor > votesAgainst`) instead of majority of eligible voters. 2 votes can impeach a mayor in a town of hundreds. | Systems |
| Backend MAJOR-B03 | Treaty gold cost checked at proposal but only deducted at acceptance. Proposer can spend the gold between, causing negative treasury. | Backend |
| Backend MINOR-B09 / Systems MINOR-POLI-04 | Peace negotiation is unilateral. Either ruler can end a war without opponent's consent. | Backend, Systems |

### 2.4 Frontend Architecture & UX

| ID | Description | Report(s) |
|----|-------------|-----------|
| Frontend CRIT-01/02/03 | Three page files exceed 980 lines with 5-10 inline sub-components each (CraftingPage: 1380, CombatPage: 1256, MarketPage: 981). | Frontend |
| Frontend MAJ-03 | No Error Boundaries anywhere. A render error crashes the entire app to a white screen. | Frontend |
| Frontend MAJ-09 | 401 interceptor uses `window.location.href = '/login'`, destroying all in-memory state, React Query cache, and socket connections. | Frontend |
| Frontend MAJ-10/11 | Tax rate hardcoded as 10% in MarketPage and TownPage instead of using server data. Players see wrong tax rates. | Frontend |
| Frontend MAJ-12 | GovernancePage hardcodes `kingdomId: 'default'`. Breaks for any real kingdom. | Frontend |
| Frontend MAJ-13 | ChatPanel sends messages via BOTH Socket AND REST simultaneously, creating duplicate processing. | Frontend |
| Frontend MAJ-15 | No socket reconnection handling or error events. Silent failure on disconnect. | Frontend |
| Frontend MAJ-18 | No 404 catch-all route. Undefined paths show a blank page. | Frontend |
| Frontend MAJ-19 | Modals lack focus trapping and Escape key handling. No accessibility. | Frontend |
| Frontend MAJ-20 | PvP challenge requires typing a raw UUID. No player search/autocomplete. | Frontend |

### 2.5 Backend Logic Gaps

| ID | Description | Report(s) |
|----|-------------|-----------|
| Backend MAJOR-B02 | Human 4th profession slot (at Level 15) not implemented. Hard limit of 3 for all races. | Backend |
| Backend MAJOR-B06 | Remote marketplace buy updates `item.ownerId` but does not create an Inventory record. Bought items invisible in buyer's inventory. | Backend |
| Backend MAJOR-R03 | PvP leaderboard loads ALL completed sessions into memory with no pagination. OOM risk at scale. | Backend |
| Systems MAJOR-QUEST-01 | Quest progress endpoint accepts arbitrary progress amounts without validating actual gameplay actions. Players can cheat quest completion. | Systems |

### 2.6 Schema & Data Model Gaps

| ID | Description | Report(s) |
|----|-------------|-----------|
| Database MAJOR-01 | Kingdom model has no relation to Region or Town. Cannot query "all towns in kingdom X." | Database |
| Database MAJOR-08/09 | Loan, ServiceAction, and ServiceReputation lack `onDelete` on character FK. Character deletion blocked by FK violations. | Database |
| Database MAJOR-12 | `getCharacter` helper uses `findFirst` without ordering. If user has multiple characters, returns arbitrary one. Used in 30+ route files. | Database, Backend |
| Database MAJOR-06 | Missing index on MarketListing for item type/rarity search -- the hottest query path in a player-driven economy. | Database |

### 2.7 Infrastructure Gaps

| ID | Description | Report(s) |
|----|-------------|-----------|
| DevOps FINDING-008 | No database migration step in Docker deployment. Fresh deployments have empty/outdated schema. | DevOps |
| DevOps FINDING-015 | Missing test suites for 80%+ of systems. No tests for professions, crafting, buildings, caravans, travel, daily tick, racial mechanics, diplomacy, admin, zones, or food. | DevOps |
| DevOps FINDING-035 | Duplicate cron job execution risk: `index.ts` starts 11 individual cron jobs AND `jobs/index.ts` defines a consolidated daily tick that replaces them. Both may run. | DevOps |
| DevOps FINDING-024 | Daily tick loads ALL characters, buildings, and town resources at once. Unbounded memory usage with growth. | DevOps |

---

## 3. Security Vulnerabilities

All security-related findings consolidated from Backend, DevOps, and Frontend reviews.

### 3.1 P0 -- Credential & Secret Exposure

| # | Finding | Report |
|---|---------|--------|
| 1 | Real Azure DB credentials + Redis key in `.env` files on disk | DevOps |
| 2 | Hardcoded credentials in git-tracked `docker-compose.yml` | DevOps |
| 3 | `database/.env` may leak into Docker image layer (not excluded in `.dockerignore`) | DevOps |
| 4 | JWT secret is predictable string, not cryptographically random | DevOps |
| 5 | `sslmode=prefer` for Azure DB allows unencrypted fallback | DevOps |

### 3.2 P0 -- Exploit Vectors

| # | Finding | Report |
|---|---------|--------|
| 6 | Combat accepts arbitrary weapon stats from client (unlimited damage) | Backend |
| 7 | Chat character impersonation (any user can chat as any character) | Backend |
| 8 | Crafting collect race condition allows item duplication | Backend |
| 9 | Governance vote stuffing (unlimited votes per person) | Backend, Database, Systems |
| 10 | Cache serves User A's data to User B | Backend |

### 3.3 P1 -- Authentication & Authorization

| # | Finding | Report |
|---|---------|--------|
| 11 | `JWT_SECRET` not validated at startup; `undefined` causes silent auth failures | Backend, DevOps |
| 12 | Logout endpoint is a no-op; JWTs remain valid for 7 days after "logout" | Backend, DevOps |
| 13 | Border check endpoint lacks character ownership validation | Backend |
| 14 | Quest progress endpoint allows arbitrary progress without gameplay validation | Systems |
| 15 | Docker containers run as root | DevOps |

### 3.4 P1 -- Input Validation & Injection

| # | Finding | Report |
|---|---------|--------|
| 16 | No HTML/XSS sanitization on chat/message content (stored XSS risk) | Backend |
| 17 | No socket event payload size limits (multi-MB messages can be stored/broadcast) | Backend |
| 18 | Loan issuance endpoint lacks Zod validation; type coercion issues possible | Backend |
| 19 | No request body size limits explicitly configured | Backend, DevOps |

### 3.5 P1 -- Rate Limiting

| # | Finding | Report |
|---|---------|--------|
| 20 | Global rate limit (100 req/15 min) too low for active gameplay | Backend, DevOps |
| 21 | `trust proxy` not set; all users behind nginx share one rate limit | DevOps |
| 22 | No per-endpoint rate limiting on combat actions | Backend |
| 23 | Socket rate limiter uses `socket.id` (bypassed by reconnecting); memory leak from never-cleaned entries | Backend |

### 3.6 P2 -- Other

| # | Finding | Report |
|---|---------|--------|
| 24 | CORS allows only a single origin | Backend |
| 25 | No CSRF protection (acceptable for JWT-in-header, noted for future cookie usage) | Backend |
| 26 | Caravan ambush uses `Math.random()` for combat outcomes instead of crypto-secure RNG | Backend |

---

## 4. Improvement Opportunities

Performance optimizations, code quality, and architecture suggestions from across all reports.

### 4.1 Performance

| ID | Description | Report(s) |
|----|-------------|-----------|
| Frontend MAJ-22 | CombatPage polls every 3 seconds during combat. Should use Socket.io events instead. | Frontend |
| Frontend MAJ-23 | CraftingPage runs 3 overlapping polling intervals (10s, 15s, 15s). Socket events already available. | Frontend |
| Backend MAJOR-D01 | N+1 query: death penalty updates equipment durability one-by-one in a loop. Use `updateMany`. | Backend |
| Backend MAJOR-D03 | N+1 query: caravan collect does findFirst + create/update per cargo item. 40 queries for 20 items. | Backend |
| Backend MAJOR-D04 | Building deposit-materials loads entire inventory when only specific materials needed. | Backend |
| Backend MAJOR-IO02 | WHISPER uses `io.fetchSockets()` (O(N) scan of all connected sockets) to find recipient. | Backend |
| DevOps FINDING-023 | No Prisma connection pool configuration. Default may be too small under load. | DevOps |
| DevOps FINDING-024 | Daily tick loads ALL characters/buildings/resources at once. No cursor pagination. | DevOps |
| Database SUGGESTION-02/03 | Missing composite indexes on Notification and TradeTransaction for common queries. | Database |

### 4.2 Code Quality & Architecture

| ID | Description | Report(s) |
|----|-------------|-----------|
| Backend SUGGESTION-R10 | Character lookup duplicated in 30+ route files. Extract to `characterGuard` middleware. | Backend, Database |
| Backend MAJOR-B05 | Circular imports: route files import from `../index.ts` (server entry point). | Backend |
| Frontend MAJ-01/04 | GoldAmount and CountdownTimer components duplicated across 3+ files each. | Frontend |
| Frontend MAJ-05 | Zustand listed in tech stack but no stores exist. State managed via useState + React Query. | Frontend |
| Frontend MAJ-06 | 9+ components independently fetch `['character', 'me']` with inconsistent type casting. | Frontend |
| Frontend MIN-02/03 | RARITY_COLORS and TOAST_STYLE constants duplicated across 5+ files. | Frontend |
| Systems SUGGESTION-ECON-13 | Recipe inputs use free-text strings instead of typed references. Broken chains not caught at compile time. | Systems |
| DevOps FINDING-011 | 384 occurrences of console.log/error across 73 files. No structured logging, levels, or correlation IDs. | DevOps |

### 4.3 Observability & Operations

| ID | Description | Report(s) |
|----|-------------|-----------|
| DevOps FINDING-028 | Health check returns `{ status: 'ok' }` without checking DB or Redis connectivity. | DevOps |
| DevOps FINDING-029 | No metrics collection, APM, or request duration tracking. | DevOps |
| DevOps FINDING-030 | No alerting for cron job failures. Daily tick failure = silent economy halt. | DevOps |
| DevOps FINDING-038 | No HTTP request logging middleware. | DevOps |
| DevOps FINDING-040 | No backup strategy documented or automated. | DevOps |

### 4.4 Testing

| ID | Description | Report(s) |
|----|-------------|-----------|
| DevOps FINDING-014 | No test coverage reporting or thresholds configured. | DevOps |
| DevOps FINDING-015 | 8 test suites exist but 11+ critical systems have zero test coverage. | DevOps |
| DevOps FINDING-016 | Tests use production database if `DATABASE_URL` not overridden. No guard. | DevOps |
| DevOps FINDING-017 | Test cleanup relies on manual entity tracking. Fragile and leak-prone. | DevOps |

---

## 5. Documentation Drift

Where docs and code disagree, from the Docs review plus cross-references from other reviews.

### 5.1 Critical Drift

| Area | Docs Say | Code Does | Source |
|------|----------|-----------|--------|
| Character classes | GAME_GUIDE, API_REFERENCE, ARCHITECTURE: 6 classes | 7 classes (Psion fully implemented with 3 specs, 18 abilities) | Docs C1, C2, M1 |
| CODE_INVENTORY.md | 20 routes, 4 services, 3 jobs | 41 routes, 31 services, 17 jobs | Docs C3 |

### 5.2 Major Drift

| Area | Docs Say | Code Does | Source |
|------|----------|-----------|--------|
| Specialization names | QUESTS.md lists evoker, trickster, shadow, crusader, oracle, marksman, warden, minstrel, wardrummer | Code has elementalist, thief, swashbuckler, paladin, inquisitor, sharpshooter, tracker, diplomat, battlechanter | Docs M2 |
| Profession count | ECONOMY.md header: 29; CLAUDE.md: 28 | Code exports 29 types (7+15+7) but Rancher/Herder is single profession | Docs M3, Systems MINOR-ECON-12 |
| World regions | GAME_GUIDE: "10 distinct regions" | 21 territories (8 core + 6 common + 7 exotic) | Docs M5 |
| Town count | _gameplay-section.md: 69 towns | 68 towns everywhere else (code, seeds, all other docs) | Docs M6 |
| Nightborne abilities | RACES.md: 7 abilities | Code: 7 abilities (breaks "6 per race" rule, makes total 121 not 120) | Docs M7 |
| ARCHITECTURE.md scope | "Phase 1 completion" | Codebase is through Phase 2B | Docs M4 |
| Middleware/lib counts | CLAUDE.md: 4 middleware, 3 libs | Actual: 5 middleware, 5 libs | Docs M8, M9 |
| Ability names | RACES.md: "Superior Darkvision", "Drow Magic" | Code: "Superior Deepsight", "Nightborne Magic" | Docs m1 |
| Combat Redis key | COMBAT.md: `combat:{characterId}` | Code: `combat:pve:{sessionId}` | Docs m6 |
| Combat endpoint paths | CHANGELOG: `/api/combat/pve/start` | Actual: `/api/combat-pve/start` (hyphen, not slash) | Docs m5 |
| Tax rate source | town-info returns `TownTreasury.taxRate` | set-tax writes to `TownPolicy.taxRate` | Systems MINOR-POLI-05, Systems MAJOR-XSYS-02 |
| Human 4th profession | CLAUDE.md: "Humans get 4th at Level 15" | Code: hard limit of 3 for all races | Backend MAJOR-B02 |
| Diplomatic relations seed | CLAUDE.md: "Human-Halfling: Allied" | Seed: `FRIENDLY` (modifier 50), not `ALLIED` (modifier 100) | Database MINOR-08 |

### 5.3 Minor/Cosmetic Drift

| Area | Issue | Source |
|------|-------|--------|
| Profession category constraints | ECONOMY.md adds category constraints (1G+1C+1S); CLAUDE.md just says "max 3" | Docs m2 |
| Profession tier ranges | Minor boundary discrepancies between ECONOMY.md and code | Docs m3 |
| Azure deployment | README mentions Azure; Docker Compose uses standard images | Docs m4 |
| XP streak comment | Internal code comment says "5 days * 2" but max days is 7 | Docs m8 |

---

## 6. Recommended Priority Order

### P0 -- Immediate (Security vulnerabilities, data corruption risks)

| # | Action | Reports Flagging | Effort |
|---|--------|------------------|--------|
| 1 | **Rotate all leaked Azure credentials** (DB password, Redis key). Generate cryptographically random JWT secret. | DevOps | Low |
| 2 | **Remove hardcoded secrets from `docker-compose.yml`**. Use env_file directive. Add `**/.env` to `.dockerignore`. | DevOps | Low |
| 3 | **Fix combat weapon validation**: server must look up equipped weapon stats from DB, not trust client. | Backend | Medium |
| 4 | **Fix chat character impersonation**: verify `socket.data.userId` owns the `characterId` in `chat:identify`. | Backend | Low |
| 5 | **Fix crafting collect race condition**: use atomic status transition (`SET status='COLLECTED' WHERE status='COMPLETED'`). | Backend | Low |
| 6 | **Fix double taxation**: remove tax collection from cron job (buy transaction already handles it). | Database | Low |
| 7 | **Wrap PvE combat resolution in a transaction**. Re-validate PvP wager gold inside transaction. | Database | Medium |
| 8 | **Add `@@unique([characterId, itemId])` to Inventory model** to prevent duplicate rows. | Database | Low |
| 9 | **Fix cache middleware**: include user ID in cache key for authenticated endpoints. | Backend | Low |
| 10 | **Fix governance vote stuffing**: create `LawVote` table with unique constraint. | Backend, Database, Systems | Medium |
| 11 | **Add graceful shutdown** (SIGTERM/SIGINT handlers for HTTP, Socket.io, Redis, Prisma). | DevOps | Medium |
| 12 | **Run Docker containers as non-root user**. | DevOps | Low |
| 13 | **Validate JWT_SECRET exists at startup**; fail fast if missing. | Backend, DevOps | Low |

### P1 -- Next Sprint (Broken game mechanics, major bugs)

| # | Action | Reports Flagging | Effort |
|---|--------|------------------|--------|
| 14 | **Fix broken crafting chains**: Nails level req, Silk Thread source, Exotic Hide source, Bricks recipe. | Systems | Medium |
| 15 | **Fix war trade embargo** to check kingdom membership via town, not just ruler identity. | Systems | Medium |
| 16 | **Seed Kingdom data** and link to Regions/Towns. | Database | Medium |
| 17 | **Seed Abilities and Achievements** from main seed pipeline. | Database | Low |
| 18 | **Move spar cooldowns to Redis** with TTL. | Backend | Low |
| 19 | **Replace `redis.keys()` with SCAN**-based iteration. | Backend, Database, DevOps | Low |
| 20 | **Fix remote marketplace buy** to create Inventory record for buyer. | Backend | Low |
| 21 | **Fix PvP leaderboard** to use aggregation query with pagination, not load all sessions. | Backend | Medium |
| 22 | **Add Error Boundaries** to the React app to prevent white-screen crashes. | Frontend | Low |
| 23 | **Fix 401 interceptor** to update AuthContext instead of full page reload. | Frontend | Low |
| 24 | **Fix hardcoded tax rates** in MarketPage and TownPage to use server data. | Frontend | Low |
| 25 | **Fix GovernancePage** hardcoded `kingdomId: 'default'`. | Frontend | Low |
| 26 | **Add HTML/XSS sanitization** on message/chat content. | Backend | Low |
| 27 | **Implement Human 4th profession slot** at Level 15. | Backend | Low |
| 28 | **Fix duplicate cron job execution**: remove individual job starts from index.ts, use consolidated daily tick. | DevOps | Medium |
| 29 | **Fix socket rate limiter**: use userId as key, clean up entries on disconnect. | Backend | Low |
| 30 | **Add DB migration step** to Docker deployment entrypoint. | DevOps | Low |
| 31 | **Fix notification route ordering** (`/read-all` before `/:id/read`). | Backend | Low |
| 32 | **Fix caravan collect** to verify character is in destination town. | Backend | Low |
| 33 | **Fix election lifecycle** to skip towns below a population threshold. | Systems | Low |
| 34 | **Add `trust proxy`** setting before rate limiter. | DevOps | Low |
| 35 | **Fix tax rate source** inconsistency (TownPolicy vs TownTreasury). | Systems | Low |

### P2 -- Soon (Performance, code quality, missing features)

| # | Action | Reports Flagging | Effort |
|---|--------|------------------|--------|
| 36 | **Extract large page files** (CraftingPage, CombatPage, MarketPage) into smaller components. | Frontend | High |
| 37 | **Add structured logging** (Pino or Winston) with JSON output, log levels, correlation IDs. | DevOps | Medium |
| 38 | **Replace combat polling** with socket-only state updates. Remove crafting multi-poll. | Frontend | Medium |
| 39 | **Create shared hooks**: `useCharacter()`, `useSocket()` to replace 9+ duplicate fetch patterns. | Frontend | Medium |
| 40 | **Add missing database indexes** (MarketListing type search, CombatLog actorId, Notification composite). | Database | Low |
| 41 | **Fix N+1 queries** in death penalty, caravan collect, building deposit. | Backend | Medium |
| 42 | **Create `characterGuard` middleware** to eliminate duplicated character lookup in 30+ files. | Backend | Medium |
| 43 | **Add deep health check** that verifies DB and Redis connectivity. | DevOps | Low |
| 44 | **Fix cascade deletes** on Loan, ServiceAction, ServiceReputation character FKs. | Database | Low |
| 45 | **Add 404 catch-all route** in frontend. | Frontend | Low |
| 46 | **Add socket reconnection handling** and connection status indicator. | Frontend | Medium |
| 47 | **Add quest progress validation** (server-side gameplay action verification). | Systems | Medium |
| 48 | **Add test coverage** for crafting, professions, daily tick, buildings, travel, and racial mechanics. | DevOps | High |
| 49 | **Configure Prisma connection pool** and Socket.io scaling (Redis adapter). | DevOps | Medium |
| 50 | **Add copper weapon recipes** using Softwood Planks (Woodworker L1) instead of Hardwood Planks. | Systems | Low |
| 51 | **Fix quest item rewards** not being granted on completion. | Systems | Low |
| 52 | **Fix flee action** marking character as dead instead of fled (applies death penalties). | Systems | Low |
| 53 | **Implement building condition degradation** mechanism (cron job or usage decay). | Systems | Medium |
| 54 | **Add modal accessibility** (focus trapping, Escape key, aria attributes). | Frontend | Medium |
| 55 | **Fix Woodworker recipes**: add Barrels, Furniture, and Handles. | Systems | Low |

### P3 -- Backlog (Nice-to-haves, suggestions)

| # | Action | Reports Flagging |
|---|--------|------------------|
| 56 | Implement JWT token blacklist for logout | Backend, DevOps |
| 57 | Update GAME_GUIDE.md, API_REFERENCE.md, ARCHITECTURE.md, CODE_INVENTORY.md for Phase 2B | Docs |
| 58 | Fix specialization name discrepancies in QUESTS.md | Docs |
| 59 | Add Prisma CHECK constraint for non-negative gold | Database |
| 60 | Add test coverage reporting and thresholds | DevOps |
| 61 | Add CI deployment pipeline (push to container registry, staging deploy) | DevOps |
| 62 | Add vulnerability scanning in CI (`npm audit`) | DevOps |
| 63 | Add APM/metrics collection (Prometheus, request timing) | DevOps |
| 64 | Add cron job failure alerting | DevOps |
| 65 | Add automated database backup strategy | DevOps |
| 66 | Convert string status fields to enums (Election.status, CombatSession.status, War.status) | Database |
| 67 | Use typed recipe references instead of free-text strings | Systems |
| 68 | Extract GoldAmount, CountdownTimer, TOAST_STYLE to shared components/constants | Frontend |
| 69 | Add Storybook or component documentation | Frontend |
| 70 | Add loading skeletons to replace spinner states | Frontend |
| 71 | Add migration rollback scripts | Database |
| 72 | Pin critical dependency versions (Prisma, Socket.io). Fix Jest 30 / ts-jest 29 mismatch. | DevOps |

---

## 7. Stats

### 7.1 Total Issues by Reviewer

| Reviewer | CRITICAL | MAJOR | MINOR | SUGGESTION | Total |
|----------|----------|-------|-------|------------|-------|
| Backend | 6 | 20 | 13 | 7 | 46 |
| Frontend | 3 | 18 | 14 | 12 | 47 |
| Database | 6 | 12 | 9 | 6 | 33 |
| Systems | 4 | 15 | 15 | 5 | 39 |
| DevOps | 4 | 12 | 10 | 8 | 34 |
| Docs | 3 | 12 | 11 | 5 | 31 |
| **Totals (raw)** | **26** | **89** | **72** | **43** | **230** |

### 7.2 Deduplicated Issue Counts by Severity

After deduplication (several issues flagged by multiple reviewers):

| Severity | Deduplicated Count |
|----------|-------------------|
| CRITICAL | 19 |
| MAJOR | 72 |
| MINOR | 63 |
| SUGGESTION | 38 |
| **Total** | **192** |

**Key duplicates identified:**
- Combat weapon trust: Backend CRITICAL-R01 = Backend CRITICAL-S02 (2 entries, 1 issue)
- Chat impersonation: Backend CRITICAL-S01 = Backend CRITICAL-IO01 (2 entries, 1 issue)
- Redis KEYS: Database CRITICAL-06 = Backend MAJOR-D02 = DevOps FINDING-022 (3 entries, 1 issue)
- Governance vote stuffing: Backend CRITICAL-R02 = Database MAJOR-03 = Database MAJOR-10 = Systems MAJOR-POLI-03 (4 entries, 1 issue)
- Cache user-data leak: Backend CRITICAL-M01 = Backend MAJOR-R04 (2 entries, 1 issue)
- JWT_SECRET validation: Backend MAJOR-E01 = DevOps FINDING-004 (2 entries, 1 issue)
- Character lookup pattern: Backend SUGGESTION-R10 = Database MAJOR-12 (2 entries, 1 issue)
- Socket scaling: Backend SUGGESTION-IO07 = DevOps FINDING-025 (2 entries, 1 issue)
- Rate limit too low: Backend MINOR-S08 = DevOps FINDING-036 (2 entries, 1 issue)
- No body size limit: Backend SUGGESTION-M05 = DevOps FINDING-026 (2 entries, 1 issue)
- Logout no-op: Backend MINOR-R08 = DevOps FINDING-039 (2 entries, 1 issue)
- Peace unilateral: Backend MINOR-B09 = Systems MINOR-POLI-04 (2 entries, 1 issue)
- Tax rate mismatch: Systems MINOR-POLI-05 = Systems MAJOR-XSYS-02 (2 entries, 1 issue)

### 7.3 Issues by Category

| Category | CRITICAL | MAJOR | MINOR | SUGGESTION | Total |
|----------|----------|-------|-------|------------|-------|
| **Security** | 5 | 8 | 5 | 3 | 21 |
| **Data Integrity** | 6 | 8 | 2 | 2 | 18 |
| **Game Logic** | 4 | 18 | 10 | 2 | 34 |
| **Performance** | 1 | 10 | 4 | 4 | 19 |
| **UX / Frontend** | 3 | 14 | 10 | 8 | 35 |
| **Documentation** | 3 | 12 | 11 | 5 | 31 |
| **DevOps / Infra** | 2 | 10 | 6 | 7 | 25 |
| **Code Quality** | 0 | 4 | 8 | 7 | 19 |

### 7.4 Cross-Reviewer Agreement

Issues flagged by 3+ reviewers (highest consensus = highest confidence):

| Issue | Reviewers | Count |
|-------|-----------|-------|
| Governance vote stuffing | Backend, Database, Database, Systems | 4 |
| Redis KEYS blocking | Backend, Database, DevOps | 3 |

Issues flagged by 2 reviewers:

| Issue | Reviewers |
|-------|-----------|
| Combat weapon trust exploit | Backend (x2 -- routes + security sections) |
| Chat impersonation | Backend (x2 -- security + socket sections) |
| Cache user-data leak | Backend (x2 -- middleware + routes sections) |
| JWT_SECRET not validated | Backend, DevOps |
| Character lookup non-deterministic | Backend, Database |
| Socket.io scaling | Backend, DevOps |
| Rate limit too low | Backend, DevOps |
| Request body size limit | Backend, DevOps |
| Logout no-op | Backend, DevOps |
| Peace unilateral | Backend, Systems |
| Tax rate source mismatch | Systems (x2 -- politics + cross-system sections) |

---

*End of consolidated review summary.*
