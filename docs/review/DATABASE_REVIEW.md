# Database Review -- Realm of Crowns

**Reviewer:** database-reviewer (Claude Agent)
**Date:** 2026-02-10
**Scope:** `database/` directory, Prisma schema, migrations, seed data, indexes, data integrity, transaction safety, Redis usage

---

## Executive Summary

The database layer is generally well-structured with proper use of Prisma ORM, relational modeling, and transactional operations for critical paths like marketplace trades and guild creation. However, there are several areas of concern:

- **5 CRITICAL** findings (transaction safety gaps in combat resolution, double-taxation bug, Redis KEYS usage in production)
- **9 MAJOR** findings (missing indexes, orphan record risks, governance vote manipulation, missing cascade deletes)
- **8 MINOR** findings (seed data gaps, nullable fields, schema inconsistencies)
- **6 SUGGESTIONS** (caching improvements, index additions, data model refinements)

---

## 1. Schema Design

### CRITICAL-01: No unique constraint on `ItemTemplate.name`

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, line 837
- **Description:** `ItemTemplate.name` is not marked `@unique`, yet the seed data uses name-based lookups and stable IDs derived from names. If two templates with the same name are accidentally created, recipe resolution will break silently, as `findFirst` will return an arbitrary match.
- **Recommended Fix:** Add `@unique` to `ItemTemplate.name` or add a `@@unique([name, type])` compound constraint.

### CRITICAL-02: `Inventory` model allows duplicate `characterId + itemId` entries

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 508-522
- **Description:** There is no `@@unique([characterId, itemId])` constraint on the `Inventory` model. Multiple inventory rows can exist for the same character + item combination. The code in `market.ts` (line 319) uses `findFirst` to check for existing stacks and increments them, but without a unique constraint, concurrent requests could create duplicate rows. This causes item duplication and inventory count errors.
- **Recommended Fix:** Add `@@unique([characterId, itemId])` to the `Inventory` model, or if stacking by slot is intentional, add `@@unique([characterId, itemId, slotPosition])`.

### MAJOR-01: `Kingdom` model has no relation to `Region` or `Town[]`

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1216-1237
- **Description:** The `Kingdom` model stores `capitalTownId` but has no explicit `Town[]` relation indicating which towns belong to the kingdom. There is also no `kingdomId` field on the `Region` or `Town` models. This means there is no way to query "all towns in kingdom X" without relying on convention or the region->town chain, but regions also lack a kingdom FK. The governance system (laws, ruler elections, wars) references kingdoms but has no formal link to the territories they govern.
- **Recommended Fix:** Add a `kingdomId` foreign key to `Region` or `Town` (or both) to establish which territories belong to which kingdom.

### MAJOR-02: `DiplomacyEvent` references Character but should reference Kingdom

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 717-732
- **Description:** `DiplomacyEvent.initiatorId` and `targetId` point to `Character`, but diplomatic actions (treaties, war declarations, trade agreements) are kingdom-level actions. Storing character IDs makes it impossible to query "all diplomatic events between Kingdom A and Kingdom B" without joining through the character->kingdom chain (which itself is incomplete per MAJOR-01).
- **Recommended Fix:** Add `initiatorKingdomId` and `targetKingdomId` fields (optional, for kingdom-level events) alongside the character references.

### MAJOR-03: `Law` model has no vote-tracking table

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1191-1214; `D:\realm_of_crowns\server\src\routes\governance.ts`, lines 112-180
- **Description:** The `Law` model stores `votesFor` and `votesAgainst` as integer counters but there is no `LawVote` join table to track which characters have voted. In `governance.ts` line 150, the vote endpoint increments the counter without checking if the voter has already voted. A council member or ruler can vote multiple times on the same law, inflating vote counts and manipulating outcomes.
- **Recommended Fix:** Create a `LawVote` model with `@@unique([lawId, voterId])` and check for existing votes before incrementing.

### MINOR-01: `Election.status` is a `String` while `Election.phase` is an enum

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1084-1085
- **Description:** `Election.status` is typed as `String` with default `"scheduled"`, while `Election.phase` uses the `ElectionPhase` enum. This inconsistency means `status` values are not validated at the DB level. Values like `"active"`, `"completed"`, and `"scheduled"` are used in code but could be set to any arbitrary string.
- **Recommended Fix:** Create an `ElectionStatus` enum and use it for the `status` field.

### MINOR-02: `CombatSession.status` is `String` instead of an enum

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, line 1357
- **Description:** `CombatSession.status` is a plain string with default `"active"`. Values `"active"`, `"pending"`, `"completed"`, `"cancelled"` are used in code. This should be an enum for type safety and query optimization.
- **Recommended Fix:** Create a `CombatSessionStatus` enum.

### MINOR-03: `War.status` is `String` instead of an enum

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, line 739
- **Description:** Same pattern. Values `"active"` and `"peace_proposed"` are used but not enumerated. Queries filter on this field (`status: 'active'`), so an enum would improve safety.
- **Recommended Fix:** Create a `WarStatus` enum.

### MINOR-04: `User.activeCharacterId` has no FK relation

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, line 367
- **Description:** `User.activeCharacterId` is declared as `String?` but has no `@relation` to `Character`. If a character is deleted, this field becomes a dangling reference. The schema already has `Character.userId` -> `User.id` with `onDelete: Cascade`, but the reverse pointer is unmanaged.
- **Recommended Fix:** Either add a formal relation with `onDelete: SetNull` or implement application-level cleanup when characters are deleted.

### MINOR-05: `Recipe.result` is a `String` not a relation

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, line 899
- **Description:** `Recipe.result` stores an `ItemTemplate` ID as a plain string with no foreign key constraint. If the referenced template is deleted, the recipe becomes broken silently.
- **Recommended Fix:** Convert to a proper relation: `resultTemplate ItemTemplate @relation(fields: [result], references: [id])`.

---

## 2. Migrations

### SUGGESTION-01: Migrations use idempotent DDL but lack rollback scripts

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\database\prisma\migrations\20260210000000_six_systems_foundation\migration.sql`
- **Description:** The latest migration uses `IF NOT EXISTS` and `IF NOT EXISTS` clauses extensively, which is good for idempotency. However, there are no down-migration scripts anywhere. While Prisma does not natively support down migrations, for a production MMORPG, having documented rollback steps would be prudent.
- **Recommended Fix:** Add `rollback.sql` scripts alongside each migration for emergency reversals.

### MINOR-06: Migration count (9 files) appears in sync with schema

- **Severity:** INFO (no action needed)
- **File:** `D:\realm_of_crowns\database\prisma\migrations/`
- **Description:** The 9 migration files progress logically: init -> friends -> messages -> abilities/progression -> NPCs -> performance indexes -> professions -> balance renames -> race schema v2 -> six systems foundation. The latest schema.prisma appears consistent with the cumulative effect of all migrations.

---

## 3. Seed Data

### MAJOR-04: No seed data for Kingdoms

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\seeds\index.ts`
- **Description:** The seed script seeds regions, towns, resources, recipes, monsters, quests, tools, town-resources, consumable/armor recipes, diplomacy (racial relations), nodes, and food items. However, **no kingdoms are seeded**. The governance routes reference `Kingdom` records, but there are none in the database after seeding. Elections are auto-created for towns (via the cron job), but kingdom-level governance is completely nonfunctional without kingdom records.
- **Recommended Fix:** Add a `seedKingdoms` function that creates one Kingdom per core region, linking each to its capital town.

### MAJOR-05: No seed data for Abilities

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\seeds\index.ts`
- **Description:** The `Ability` table (skill tree abilities) is not seeded by the database seed script. There are standalone scripts at `server/src/scripts/seed-abilities.ts` and `server/src/scripts/seed-achievements.ts`, but these are not called from the main seed pipeline. A fresh database will have empty `abilities` and `achievements` tables, making the skill system and achievement system nonfunctional.
- **Recommended Fix:** Import and call `seedAbilities` and `seedAchievements` from the main `database/seeds/index.ts`.

### MINOR-07: Weapon/accessory recipe seeds exist as separate files but are not called

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\seeds\weapon-recipes.ts`, `D:\realm_of_crowns\database\seeds\accessory-recipes.ts`
- **Description:** Files `weapon-recipes.ts` and `accessory-recipes.ts` exist in the seeds directory but are not imported or called from `index.ts`. These recipes are therefore not seeded into the database.
- **Recommended Fix:** Import and call `seedWeaponRecipes` and `seedAccessoryRecipes` from `index.ts`.

### MINOR-08: Diplomacy seed covers 25 specific relations out of 190 pairings

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\seeds\diplomacy.ts`
- **Description:** The diplomacy seed correctly generates all 190 unique race pairings and fills unlisted ones with NEUTRAL status. The 25 specific relations listed are a reasonable subset covering the key alliances, hostilities, and blood feuds from the design docs. However, the CLAUDE.md mentions "Human-Halfling: Allied" (which maps to HUMAN-HARTHFOLK) but the seed data has this as `FRIENDLY` (modifier 50), not `ALLIED` (modifier 100). This is a data discrepancy.
- **Recommended Fix:** Verify all specific relations against `docs/RACES.md` and update the seed data accordingly.

---

## 4. Indexes

### MAJOR-06: Missing index on `MarketListing` for item type/rarity search

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 992-1013
- **Description:** The marketplace browse endpoint filters listings by item template type, rarity, and name (via nested `item.template` relations). The current indexes are on `sellerId`, `townId`, `itemId`, and `(townId, price)`. However, the most common query pattern -- browse by town with type filter -- requires joining through `Item` to `ItemTemplate`, which has indexes on `type` and `rarity` but no composite index. For a player-driven economy where marketplace browsing is the hottest path, this will cause slow queries as the item count grows.
- **Recommended Fix:** Add `@@index([townId, listedAt])` and consider a denormalized `itemType` field on `MarketListing` to avoid the join.

### MAJOR-07: Missing index on `CombatLog.sessionId` + `round` is present, but `CombatLog.actorId` lacks an index

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1376-1390
- **Description:** `CombatLog` has indexes on `sessionId` and `(sessionId, round)` but no index on `actorId`. If combat history lookups per character are needed (e.g., "show me my combat history"), this would require a full table scan on `actorId`.
- **Recommended Fix:** Add `@@index([actorId])` to the `CombatLog` model.

### SUGGESTION-02: Missing index on `Notification.timestamp`

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1456-1473
- **Description:** `Notification` has indexes on `characterId` and `(characterId, read)`. Notifications are typically fetched in reverse chronological order, but there's no composite index for `(characterId, timestamp)` or `(characterId, read, timestamp)`.
- **Recommended Fix:** Add `@@index([characterId, read, timestamp])` for efficient "unread notifications, newest first" queries.

### SUGGESTION-03: Missing index on `TradeTransaction.itemId`

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1015-1036
- **Description:** `TradeTransaction` has indexes on `buyerId`, `sellerId`, `townId`, and `timestamp`, but not on `itemId`. The trade analytics system queries transaction history by item, which would benefit from an `itemId` index.
- **Recommended Fix:** Add `@@index([itemId])` to `TradeTransaction`.

---

## 5. Data Integrity

### MAJOR-08: `Loan` and `ServiceAction` models lack cascade delete on character relations

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1841-1860 (Loan), lines 1822-1839 (ServiceAction)
- **Description:** The `Loan` model has relations to `Character` (banker and borrower) but neither specifies `onDelete` behavior. The `ServiceAction` model also lacks `onDelete` on its `provider` and `client` relations. If a character is deleted (via `User` cascade), these records will cause foreign key violations and block the deletion.
- **Recommended Fix:** Add `onDelete: Cascade` or `onDelete: SetNull` to these relations depending on whether loan/service history should be preserved.

### MAJOR-09: `ServiceReputation` lacks `onDelete` on character relation

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, lines 1862-1872
- **Description:** Same issue as MAJOR-08. `ServiceReputation.character` relation has no `onDelete` specified, which will block character deletion.
- **Recommended Fix:** Add `onDelete: Cascade` to the character relation.

### SUGGESTION-04: `Character.gold` should have a check constraint for non-negative values

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, line 401
- **Description:** `Character.gold` is `Int @default(0)` with no check constraint. While the application code checks for sufficient gold before decrementing, race conditions or bugs could push gold negative. Prisma does not natively support check constraints, but a raw SQL migration could add `CHECK (gold >= 0)`.
- **Recommended Fix:** Add a PostgreSQL check constraint via a custom migration: `ALTER TABLE characters ADD CONSTRAINT characters_gold_non_negative CHECK (gold >= 0);`

---

## 6. Transaction Safety

### CRITICAL-03: PvE combat resolution is not transactional

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\server\src\routes\combat-pve.ts`, lines 518-643 (`finishCombat` function)
- **Description:** The `finishCombat` function performs multiple sequential database writes without wrapping them in a transaction:
  1. Updates `CombatSession` status (line 521)
  2. Updates character gold/xp/health (line 542 or 589)
  3. Updates equipment durability in a loop (lines 556-563)
  4. Awards survive XP (line 567)
  5. Updates `CombatParticipant` HP in a loop (lines 618-630)

  If any step fails mid-way (e.g., the server crashes after awarding gold but before updating equipment durability), the database will be left in an inconsistent state. In the worst case, players could receive rewards without penalties, or vice versa.
- **Recommended Fix:** Wrap the entire `finishCombat` function body in a `prisma.$transaction(async (tx) => { ... })` block.

### CRITICAL-04: PvP wager settlement uses batched transaction but lacks gold negativity guard

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\server\src\routes\combat-pvp.ts`, lines 895-920
- **Description:** The PvP completion code uses `prisma.$transaction([...])` (batched array syntax) to settle wagers. However, the gold validation happens at challenge creation time (lines 256-261), not at settlement time. Between challenge acceptance and combat resolution, the losing player may have spent their gold elsewhere. The transaction will execute `gold: { decrement: wager }` which can push gold negative since there is no DB-level check constraint.
- **Recommended Fix:** Use the interactive transaction form (`prisma.$transaction(async (tx) => { ... })`) and re-validate gold balance inside the transaction. Also add the PostgreSQL check constraint from SUGGESTION-04.

### CRITICAL-05: Tax collection cron job double-taxes marketplace transactions

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\server\src\jobs\tax-collection.ts`, lines 23-63; `D:\realm_of_crowns\server\src\routes\market.ts`, lines 361-367
- **Description:** Tax is collected in **two places**:
  1. **At purchase time** in `market.ts` line 361-367: tax is calculated and deposited into `TownTreasury` within the buy transaction.
  2. **By the hourly cron job** in `tax-collection.ts` lines 29-58: the cron scans `TradeTransaction` records since the last collection and calculates tax again on the same transactions.

  This means every marketplace sale is taxed twice: once immediately and once by the cron job. Players are being over-taxed, and town treasuries are receiving double the intended tax revenue.
- **Recommended Fix:** Remove the tax collection from either the buy transaction OR the cron job. Since the buy transaction already handles it atomically, the cron job's tax collection logic should be removed or repurposed for a different function (e.g., property tax only).

### MAJOR-10: `governance.ts` vote-law endpoint lacks duplicate vote prevention

- **Severity:** MAJOR (duplicate of MAJOR-03 from schema perspective, transaction angle here)
- **File:** `D:\realm_of_crowns\server\src\routes\governance.ts`, lines 112-180
- **Description:** As noted in MAJOR-03, the `/vote-law` endpoint directly increments `votesFor` or `votesAgainst` without recording who voted. Beyond the missing table, the endpoint also has a TOCTOU (time-of-check-time-of-use) issue: even if a vote-tracking check were added, without a transaction wrapping the check + increment, concurrent requests could both pass the check.
- **Recommended Fix:** Create a `LawVote` model, use a transaction with the unique constraint to prevent duplicates atomically.

### SUGGESTION-05: `border-crossing.ts` tariff deduction is not transactional with treasury deposit

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\services\border-crossing.ts`, line 191-195
- **Description:** The border crossing tariff deducts gold from the character but does not deposit it into any treasury in the same operation. The gold effectively vanishes. If the intent is to route tariffs to the destination town's treasury, this needs to be a transaction with a corresponding treasury increment.
- **Recommended Fix:** Wrap the tariff deduction in a transaction that also credits the destination town's treasury.

---

## 7. Redis Usage

### CRITICAL-06: `invalidateCache` uses `redis.keys()` which is O(N) and blocks Redis

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\server\src\lib\redis.ts`, lines 31-41
- **Description:** The `invalidateCache` function uses `redis.keys(pattern)` to find keys matching a glob pattern, then deletes them. The Redis `KEYS` command scans every key in the database and is O(N) where N is the total number of keys. In production with thousands of cached entries, this will block the Redis event loop and cause latency spikes across all Redis operations (including combat state reads/writes). The Redis documentation explicitly warns: "KEYS should only be used in production environments with extreme care."
- **Recommended Fix:** Use `SCAN` with cursor-based iteration instead of `KEYS`:
  ```typescript
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== '0');
  ```
  Alternatively, switch to explicit key deletion (e.g., `redis.del('cache:/api/market/browse')`) instead of pattern-based invalidation.

### MAJOR-11: No cache invalidation for most cached endpoints

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\routes\` (multiple files)
- **Description:** Cache invalidation is only implemented for marketplace browse (`cache:/api/market/browse*`). The following endpoints use caching but have **no invalidation**:
  - `GET /api/guilds` (60s) -- stale after guild creation/deletion
  - `GET /api/quests/available` (60s) -- stale after quest acceptance
  - `GET /api/towns/:id` (120s) -- stale after mayor election, tax change, population change
  - `GET /api/world/map` (300s) -- stale after world events
  - `GET /api/world/regions` (300s) -- generally static, acceptable
  - `GET /api/trade-analytics/*` (30-120s) -- stale after trades

  For a 300s (5-minute) TTL on town data, a player could see a stale mayor for 5 minutes after an election. For a 60s guild cache, a newly created guild might not appear in search for up to a minute.
- **Recommended Fix:** Add `invalidateCache` calls for guild and town mutations. For trade analytics, the short TTL may be acceptable, but document the expected staleness.

### SUGGESTION-06: Combat state in Redis has no persistence fallback recovery

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\routes\combat-pve.ts`, lines 37-63
- **Description:** PvE and PvP combat state is stored in Redis with a 1-hour TTL, with an in-memory `Map` fallback. If Redis is restarted while combat sessions are active, the state is lost and players lose their in-progress combat. The in-memory fallback only works within the same server process -- in a multi-server deployment, the fallback would not help.
- **Recommended Fix:** Consider storing critical combat state (or at least a snapshot) in the `CombatSession.log` JSON field periodically, so sessions can be recovered from the database if Redis fails.

---

## 8. Miscellaneous Findings

### MAJOR-12: `getCharacter` helper uses `findFirst` without ordering, may return wrong character

- **Severity:** MAJOR
- **File:** Multiple route files (market.ts, elections.ts, guilds.ts, governance.ts, friends.ts, etc.)
- **Description:** Nearly every route file has a helper `getCharacter(userId)` that calls `prisma.character.findFirst({ where: { userId } })`. Since a user can have multiple characters, `findFirst` without an `orderBy` clause returns an arbitrary character. The schema has `User.activeCharacterId` field, but it is never used in these lookups. This means if a user has multiple characters, API actions could be performed as the wrong character.
- **Recommended Fix:** Either:
  (a) Change all `getCharacter` helpers to use `activeCharacterId` from the User record, or
  (b) Add `orderBy: { createdAt: 'asc' }` to ensure deterministic selection, or
  (c) Add a `@@unique([userId])` constraint on Character if only one character per user is intended (contradicted by the schema which allows multiple).

### MINOR-09: `Npc.questIds` is `String[]` instead of a relation

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\database\prisma\schema.prisma`, line 1292
- **Description:** `Npc.questIds` stores quest IDs as a `String[]` (PostgreSQL text array) rather than using a proper many-to-many relation through a join table. This means quest IDs are not validated as foreign keys -- if a quest is deleted, the NPC will still reference a nonexistent quest ID.
- **Recommended Fix:** Create an `NpcQuest` join table or use Prisma's implicit many-to-many: `quests Quest[]`.

---

## Summary Table

| # | Severity | Category | Description |
|---|----------|----------|-------------|
| CRITICAL-01 | CRITICAL | Schema | No unique constraint on `ItemTemplate.name` |
| CRITICAL-02 | CRITICAL | Schema | `Inventory` allows duplicate character+item rows |
| CRITICAL-03 | CRITICAL | Transactions | PvE combat resolution is not transactional |
| CRITICAL-04 | CRITICAL | Transactions | PvP wager settlement lacks gold balance re-check |
| CRITICAL-05 | CRITICAL | Transactions | Tax collection double-charges (cron + buy transaction) |
| CRITICAL-06 | CRITICAL | Redis | `redis.keys()` blocks Redis in production |
| MAJOR-01 | MAJOR | Schema | Kingdom has no relation to Region/Town |
| MAJOR-02 | MAJOR | Schema | DiplomacyEvent references Character not Kingdom |
| MAJOR-03 | MAJOR | Schema | Law voting has no vote-tracking table (allows duplicate votes) |
| MAJOR-04 | MAJOR | Seeds | No kingdom seed data |
| MAJOR-05 | MAJOR | Seeds | No ability/achievement seed data in main pipeline |
| MAJOR-06 | MAJOR | Indexes | Missing index for marketplace item type searches |
| MAJOR-07 | MAJOR | Indexes | Missing `actorId` index on CombatLog |
| MAJOR-08 | MAJOR | Integrity | Loan/ServiceAction lack cascade delete on character FK |
| MAJOR-09 | MAJOR | Integrity | ServiceReputation lacks onDelete on character FK |
| MAJOR-10 | MAJOR | Transactions | governance vote-law allows unlimited duplicate votes |
| MAJOR-11 | MAJOR | Redis | No cache invalidation for guilds, towns, quests |
| MAJOR-12 | MAJOR | Data | `getCharacter` uses findFirst, may return wrong character |
| MINOR-01 | MINOR | Schema | Election.status is String, not enum |
| MINOR-02 | MINOR | Schema | CombatSession.status is String, not enum |
| MINOR-03 | MINOR | Schema | War.status is String, not enum |
| MINOR-04 | MINOR | Schema | User.activeCharacterId has no FK relation |
| MINOR-05 | MINOR | Schema | Recipe.result is String, not a relation |
| MINOR-06 | MINOR | Migrations | Migrations appear in sync (info only) |
| MINOR-07 | MINOR | Seeds | weapon-recipes.ts and accessory-recipes.ts not called |
| MINOR-08 | MINOR | Seeds | Human-Harthfolk relation is FRIENDLY, docs say ALLIED |
| MINOR-09 | MINOR | Schema | Npc.questIds is String[] not a relation |
| SUGGESTION-01 | SUGGESTION | Migrations | No rollback scripts |
| SUGGESTION-02 | SUGGESTION | Indexes | Missing (characterId, read, timestamp) on Notification |
| SUGGESTION-03 | SUGGESTION | Indexes | Missing itemId index on TradeTransaction |
| SUGGESTION-04 | SUGGESTION | Integrity | gold column should have CHECK >= 0 constraint |
| SUGGESTION-05 | SUGGESTION | Transactions | Border tariff gold vanishes, not deposited to treasury |
| SUGGESTION-06 | SUGGESTION | Redis | Combat state lost on Redis restart |

---

## Priority Recommendations

### Immediate (before any production deployment):
1. Fix CRITICAL-05 (double taxation) -- players are being over-charged
2. Fix CRITICAL-06 (Redis KEYS) -- will cause production outages under load
3. Fix CRITICAL-03 (combat transaction safety) -- data corruption risk
4. Fix CRITICAL-04 (PvP wager gold check) -- potential gold duplication/negative gold
5. Fix CRITICAL-01 and CRITICAL-02 (unique constraints) -- data integrity

### Next sprint:
6. Fix MAJOR-03/MAJOR-10 (law voting) -- governance exploit
7. Fix MAJOR-08/MAJOR-09 (cascade deletes) -- will block character deletion
8. Fix MAJOR-04/MAJOR-05 (missing seed data) -- kingdoms and abilities nonfunctional
9. Fix MAJOR-12 (getCharacter) -- wrong character may act

### Backlog:
10. All MINOR items (enum conversions, relation fixes, seed data corrections)
11. All SUGGESTION items (index additions, check constraints, cache improvements)
