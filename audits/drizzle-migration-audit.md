# Prisma -> Drizzle ORM Migration Audit

Date: 2026-03-07

## Executive Summary

**Feasibility:** Yes, fully feasible. The codebase has zero production users and zero data dependencies, making this the cheapest possible time to migrate.

**Scale:** 103 files import from `@prisma/client`. ~1,871 Prisma method calls across server and database packages. 86 models, 39 enums, 216 relations in the schema. 27 seed files, 16 test files.

**Estimated effort:** 3-5 focused sessions for a big-bang rewrite (recommended approach). The schema introspection handles the largest single piece; the rest is mechanical query translation.

**Key risks:**
1. 747 `@map`/`@@map` remappings mean the Drizzle schema must explicitly map every camelCase field to its snake_case column -- `drizzle-kit introspect` handles this automatically
2. 20 Prisma enums imported across 82 files need to become shared TypeScript enums
3. 69 interactive transactions need careful translation to Drizzle's `db.transaction()` API
4. 46 Json fields need `jsonb()` type with manual TypeScript typing (Prisma's `Prisma.InputJsonValue` disappears)

**Bottom line:** The migration is straightforward but large. The biggest win is eliminating the code generation step, the engine binaries, and the Dockerfile gymnastics. The biggest risk is missing a query pattern during translation -- this audit exists to prevent that.

---

## Prisma Usage Census

### Enum Imports (20 enums across 82 files)

| Enum | Import Count | Key Files |
|------|-------------|-----------|
| ProfessionType | 23 | routes, services, seeds, shared |
| Race | 18 | routes, services, seeds, shared |
| ItemRarity | 11 | routes, constants, seeds |
| ProfessionTier | 11 | routes, services |
| BiomeType | 10 | road-encounter, seeds, shared |
| BuildingType | 9 | routes, services |
| RelationStatus | 7 | diplomacy routes/services |
| ItemType | 6 | routes, seeds |
| ElementalType | 3 | character creation, shared |
| LogLevel | 3 | error logging |
| ResourceType | 3 | gathering, seeds |
| DragonBloodline | 2 | character creation |
| BeastClan | 2 | character creation |
| EquipSlot | 2 | equipment routes |
| HungerState | 2 | food system |
| NodeType | 1 | travel nodes |
| NpcRole | 1 | quests |
| DailyActionType | 1 | daily actions |
| DailyActionStatus | 1 | daily actions |
| CombatStance | 1 | combat system |

### Type Imports (6 types across 18 files)

| Type | Count | Usage |
|------|-------|-------|
| `Prisma.InputJsonValue` | 9 | JSON field writes in daily-report, action-lock-in, seeds |
| `Prisma.*WhereInput` | 8 | Dynamic filters in admin routes, market |
| `Prisma.JsonNull` | 3 | Explicit null for JSON fields in daily-tick, jobs |
| `Prisma.join()` | 3 | SQL parameter arrays in combat-pve, road-encounter |
| `Prisma.PrismaClientKnownRequestError` | 1 | Error handler (prisma-errors.ts) |
| `Prisma.*OrderByWithRelationInput` | 1 | Market sorting |

### Query Pattern Frequency

| Pattern | Server Count | Seeds Count | Total | Drizzle Equivalent |
|---------|-------------|-------------|-------|-------------------|
| `.findUnique()` | 381 | 14 | 395 | `db.query.*.findFirst({ where: eq(*.id, val) })` |
| `.findFirst()` | 195 | 18 | 213 | `db.query.*.findFirst({ where: ... })` |
| `.findMany()` | 261 | 22 | 283 | `db.query.*.findMany({ where: ..., with: ... })` |
| `.create()` | 186 | 16 | 202 | `db.insert(table).values({...}).returning()` |
| `.createMany()` | 4 | 0 | 4 | `db.insert(table).values([...]).returning()` |
| `.update()` | 343 | 11 | 354 | `db.update(table).set({...}).where(...)` |
| `.updateMany()` | 31 | 0 | 31 | `db.update(table).set({...}).where(...)` |
| `.delete()` | 93 | 0 | 93 | `db.delete(table).where(...)` |
| `.deleteMany()` | 90 | 0 | 90 | `db.delete(table).where(...)` |
| `.upsert()` | 80 | 56 | 136 | `db.insert(table).values({...}).onConflictDoUpdate({...})` |
| `.groupBy()` | 5 | 0 | 5 | `db.select().from(table).groupBy(...)` |
| `.aggregate()` | 21 | 0 | 21 | `db.select({ sum: sql\`sum(...)\` }).from(table)` |
| `.count()` | 103 | 0 | 103 | `db.select({ count: count() }).from(table)` |
| `$transaction` (batch) | 30 | 0 | 30 | `db.batch([...])` or sequential in `db.transaction()` |
| `$transaction` (interactive) | 69 | 0 | 69 | `db.transaction(async (tx) => { ... })` |
| `$queryRaw` | 12 | 0 | 12 | `db.execute(sql\`...\`)` |
| `$executeRaw` | 8 | 0 | 8 | `db.execute(sql\`...\`)` |
| `$connect` | 1 | 0 | 1 | Pool auto-connects |
| `$disconnect` | 11 | 0 | 11 | `pool.end()` |
| **Total** | **~1,664** | **~207** | **~1,871** | |

### Deepest Nested Include Chain

**4 levels** in `server/src/lib/travel-tick.ts`:

```typescript
// Prisma (current)
const groupTravelers = await prisma.groupTravelState.findMany({
  where: { status: 'traveling' },
  include: {
    route: { select: { nodeCount: true, fromTownId: true, toTownId: true, dangerLevel: true, terrain: true } },
    group: {
      include: {
        party: { select: { id: true } },
        members: {
          include: {
            character: { select: { id: true } },
          },
        },
      },
    },
  },
});

// Drizzle equivalent (relational query API)
const groupTravelers = await db.query.groupTravelState.findMany({
  where: eq(groupTravelState.status, 'traveling'),
  with: {
    route: { columns: { nodeCount: true, fromTownId: true, toTownId: true, dangerLevel: true, terrain: true } },
    group: {
      with: {
        party: { columns: { id: true } },
        members: {
          with: {
            character: { columns: { id: true } },
          },
        },
      },
    },
  },
});
```

Other 3-4 level chains found in: `simulation/actions.ts`, `simulation/controller.ts`, `characters.ts`, `combat-pvp.ts`.

### Seed Complexity

27 seed files creating ~2,500+ records:

| Seed File | Records | Methods | Complexity |
|-----------|---------|---------|------------|
| world.ts | 21 regions + 69 towns + ~140 routes | create, createMany, findFirst | High (geographic topology) |
| monsters.ts | 129 monsters + abilities + loot | create, findFirst | High (nested ability trees) |
| recipes.ts | ~190+ recipes + items | create, createMany, findFirst | Medium |
| diplomacy.ts | 190 racial relation pairings | upsert | Low (idempotent) |
| abilities.ts | 180+ class abilities | create, findFirst | Medium (prerequisite chains) |
| nodes.ts | ~200+ travel nodes | findFirst, create, update | Medium (algorithmic) |
| resources.ts | 51 resources | upsert | Low |
| food-items.ts | 32 food templates | create, createMany | Low |
| armor-recipes.ts | 75 recipes | create | Low |
| tools.ts | 36 tool templates | create | Low |
| kingdoms.ts | 9 kingdoms | findUnique, update | Low |
| quests.ts | 9 tutorial quests | deleteMany, create | Low |
| Others (15 files) | Various | Mixed | Low-Medium |

Orchestrated by `database/seeds/index.ts` -- sequential execution with error isolation per seed.

---

## Schema Translation Plan

### Model/Enum/Relation Counts

| Metric | Count |
|--------|-------|
| Models | 86 |
| Enums | 39 |
| Relations | 216 |
| Indexes (@@index) | 179 |
| Unique constraints (@@unique + @unique) | 50 |
| @map/@@@map remappings | 747 |
| @default(uuid()) | 85 |
| @default(now()) | 105 |
| @updatedAt | 54 |
| Json fields | 46 |
| onDelete: Cascade | 104 |
| onDelete: SetNull | 27 |
| Named relations | 128 |
| Migration files | 51 (irrelevant post-migration) |

### Drizzle Schema File Organization

Recommended: **Domain-based split** (one file per game system), all in `database/schema/`:

```
database/schema/
  index.ts          -- Re-exports everything, defines relations
  enums.ts          -- All 39 pgEnum definitions
  auth.ts           -- User, Session, PasswordReset
  character.ts      -- Character, CharacterStat, Equipment, Inventory
  combat.ts         -- CombatEncounterLog, CombatSession, Monster
  economy.ts        -- MarketListing, TradeTransaction, AuctionCycle
  crafting.ts       -- Recipe, CraftingQueue, Profession, OwnedAsset
  world.ts          -- Region, Town, TravelRoute, Node, Kingdom
  politics.ts       -- Election, Law, Council, Petition, Diplomacy
  social.ts         -- Friend, Guild, Party, Message, Notification
  housing.ts        -- OwnedBuilding, ConstructionProject
  quest.ts          -- Quest, QuestProgress, Achievement
  food.ts           -- FoodItem, FoodPreference, HungerState
  daily.ts          -- DailyAction, DailyReport, ActionLockIn
  simulation.ts     -- SimulationRun, SimulationResult
  errors.ts         -- ErrorLog
  relations.ts      -- All relations() definitions (separate for clarity)
```

Why domain-based: the schema is 2,388 lines in Prisma. A single file would be ~3,000+ lines in Drizzle (relations are separate). Domain files keep each file to 150-300 lines.

### Enum Strategy Recommendation

**Option A (recommended): Define enums in `shared/src/enums.ts` as plain TypeScript, import into Drizzle schema via `pgEnum()`.**

Rationale:
- The client imports 20 enums but never touches the database
- `shared/` is the existing cross-package bridge
- Drizzle's `pgEnum()` accepts string arrays -- these can derive from the shared const

```typescript
// shared/src/enums.ts
export const RACES = ['human', 'elf', 'dwarf', ...] as const;
export type Race = typeof RACES[number];

// database/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';
import { RACES, PROFESSION_TYPES, ... } from '@shared/enums';

export const raceEnum = pgEnum('Race', RACES);
export const professionTypeEnum = pgEnum('ProfessionType', PROFESSION_TYPES);
```

This lets the client import from `@shared/enums` (no DB dependency) while the schema uses the same values.

### Features Requiring Special Handling

| Prisma Feature | Drizzle Equivalent | Notes |
|----------------|-------------------|-------|
| 747 @map/@@map | Column name in pgTable field definition | `drizzle-kit introspect` generates these automatically |
| @updatedAt (54) | `.$onUpdate(() => new Date())` | Must be added manually to each field |
| Json fields (46) | `jsonb('column_name').$type<MyType>()` | Lose Prisma's `InputJsonValue`; define explicit types |
| @default(uuid()) (85) | `.defaultRandom()` or `.default(sql\`gen_random_uuid()\`)` | Native Postgres UUID generation |
| @default(now()) (105) | `.defaultNow()` | Direct equivalent |
| Named relations (128) | `relationName` parameter in `relations()` | Required for models with multiple relations to same table |
| Prisma.join() (3 uses) | `sql.join()` or `inArray()` | Different API but same capability |
| @default(cuid()) (1) | Custom `$default()` function | Only 1 occurrence; can use uuid instead or `cuid2` package |

---

## Query Translation Guide

### a) Nested Includes (Relational Queries)

```typescript
// PRISMA -- character detail with equipment
const char = await prisma.character.findUnique({
  where: { id },
  include: {
    equipment: { include: { item: { include: { template: true } } } },
    professions: true,
    currentTown: { select: { id: true, name: true } },
  },
});

// DRIZZLE -- relational query API
const char = await db.query.character.findFirst({
  where: eq(character.id, id),
  with: {
    equipment: { with: { item: { with: { template: true } } } },
    professions: true,
    currentTown: { columns: { id: true, name: true } },
  },
});
```

Drizzle's relational query API (`db.query.*`) is the direct equivalent of Prisma's `include`/`select`. Key differences:
- `where` uses functional operators (`eq`, `and`, `or`, `gt`, etc.) not objects
- `select` becomes `columns`
- `include` becomes `with`
- No `_count` -- use a subquery or separate count query

### b) Transactions

```typescript
// PRISMA -- batch array style (30 occurrences)
await prisma.$transaction([
  prisma.inventory.create({ data: {...} }),
  prisma.character.update({ where: { id }, data: { gold: { decrement: 100 } } }),
]);

// DRIZZLE -- transaction callback (batch isn't directly equivalent)
await db.transaction(async (tx) => {
  await tx.insert(inventory).values({...});
  await tx.update(character).set({ gold: sql`${character.gold} - 100` }).where(eq(character.id, id));
});

// PRISMA -- interactive callback style (69 occurrences)
await prisma.$transaction(async (tx) => {
  const item = await tx.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error('Not found');
  await tx.inventory.create({ data: {...} });
});

// DRIZZLE -- same pattern, different API
await db.transaction(async (tx) => {
  const [item] = await tx.select().from(items).where(eq(items.id, itemId));
  if (!item) throw new Error('Not found');
  await tx.insert(inventory).values({...});
});
```

### c) Upserts (136 total)

```typescript
// PRISMA
await prisma.cooldown.upsert({
  where: { characterId_type: { characterId: charId, type: 'combat' } },
  create: { characterId: charId, type: 'combat', expiresAt: new Date() },
  update: { expiresAt: new Date() },
});

// DRIZZLE
await db.insert(cooldown)
  .values({ characterId: charId, type: 'combat', expiresAt: new Date() })
  .onConflictDoUpdate({
    target: [cooldown.characterId, cooldown.type],
    set: { expiresAt: new Date() },
  });
```

### d) Raw SQL (20 occurrences)

```typescript
// PRISMA -- BFS graph traversal in travel-resolver
const nodes = await prisma.$queryRaw`
  SELECT id, from_town_id, to_town_id, danger_level
  FROM travel_route_nodes
  WHERE route_id = ${routeId}
  ORDER BY sequence ASC
`;

// DRIZZLE -- simpler, same tagged template
const nodes = await db.execute(sql`
  SELECT id, from_town_id, to_town_id, danger_level
  FROM travel_route_nodes
  WHERE route_id = ${routeId}
  ORDER BY sequence ASC
`);
```

Raw SQL becomes simpler in Drizzle -- no `Prisma.sql` wrapper, just `sql` from drizzle-orm. The `sql` template tag handles parameterization identically.

### e) Error Handling

```typescript
// PRISMA -- prisma-errors.ts handles these
// P2002 = unique constraint violation
// P2003 = foreign key constraint violation
// P2025 = record not found

// DRIZZLE -- catch native PostgreSQL errors
import { DatabaseError } from 'pg';

function handleDbError(error: unknown, res: Response, context: string, req?: Request): boolean {
  if (error instanceof DatabaseError) {
    switch (error.code) {
      case '23505': // unique_violation (was P2002)
        const field = error.constraint ?? 'unknown';
        res.status(409).json({ error: `Duplicate value for ${field}` });
        return true;
      case '23503': // foreign_key_violation (was P2003)
        res.status(400).json({ error: 'Referenced record does not exist' });
        return true;
    }
  }
  return false;
}
```

PostgreSQL error codes replace Prisma error codes:
- `P2002` -> `23505` (unique_violation)
- `P2003` -> `23503` (foreign_key_violation)
- `P2025` -> No equivalent (Drizzle returns empty arrays, not errors)

For P2025 (not found), Prisma throws an error. Drizzle returns `undefined` or empty `[]`. Check result directly:
```typescript
const [char] = await db.select().from(character).where(eq(character.id, id));
if (!char) return res.status(404).json({ error: 'Character not found' });
```

### f) GroupBy and Aggregations

```typescript
// PRISMA
const stats = await prisma.marketListing.groupBy({
  by: ['status'],
  _count: { id: true },
  _sum: { price: true },
});

// DRIZZLE
const stats = await db
  .select({
    status: marketListing.status,
    count: count(),
    totalPrice: sum(marketListing.price),
  })
  .from(marketListing)
  .groupBy(marketListing.status);
```

### g) Count with Filters

```typescript
// PRISMA
const total = await prisma.character.count({ where: { level: { gte: 10 } } });

// DRIZZLE
const [{ total }] = await db
  .select({ total: count() })
  .from(character)
  .where(gte(character.level, 10));
```

### h) Increment/Decrement

```typescript
// PRISMA
await prisma.character.update({
  where: { id },
  data: { gold: { increment: 100 } },
});

// DRIZZLE
await db.update(character)
  .set({ gold: sql`${character.gold} + 100` })
  .where(eq(character.id, id));
```

---

## Shared Package Strategy

**Recommended: Option A -- Define enums in `shared/`, import into Drizzle schema**

Current state: `shared/src/data/` files import enums from `@prisma/client` (Race, BiomeType, etc.). The client then imports from shared. This creates a transitive dependency: client -> shared -> @prisma/client.

New architecture:
```
shared/src/enums/
  index.ts          -- All 39 enum definitions as const arrays + types
  race.ts           -- Race enum
  profession.ts     -- ProfessionType, ProfessionTier, ProfessionCategory
  item.ts           -- ItemType, ItemRarity, EquipSlot
  biome.ts          -- BiomeType
  building.ts       -- BuildingType
  combat.ts         -- CombatType, CombatStance, CombatSessionStatus
  ... etc

database/schema/enums.ts
  -- imports const arrays from @shared/enums
  -- wraps each in pgEnum() for Drizzle schema use
```

Migration path for each enum:
1. Create `shared/src/enums/{domain}.ts` with `export const RACES = [...] as const; export type Race = typeof RACES[number];`
2. Update `database/schema/enums.ts` to `export const raceEnum = pgEnum('Race', RACES);`
3. Update all 82 files that import from `@prisma/client` to import from `@shared/enums`
4. The client gets zero new dependencies

---

## Build Pipeline Changes

### Dockerfile (before/after)

**Before (Prisma):**
```dockerfile
# Builder stage
RUN cd database && pnpm exec prisma generate --schema=prisma/schema.prisma

# Production stage -- copy generated client + engine binaries
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/ ...
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/ ...
COPY database/prisma/ ./database/prisma/
RUN pnpm add -g tsx prisma@5.22.0

# Startup: migrate, seed, run
CMD sh -c "prisma migrate deploy --schema=/app/database/prisma/schema.prisma && cd /app/database && tsx ... seeds/index.ts && cd /app/server && node ... dist/index.js"
```

**After (Drizzle):**
```dockerfile
# Builder stage -- NO generate step needed

# Production stage -- NO client/engine copying needed
# Just ensure drizzle-kit is available for migrations
COPY database/ ./database/
RUN pnpm add -g tsx drizzle-kit

# Startup: migrate, seed, run
CMD sh -c "drizzle-kit migrate --config=/app/database/drizzle.config.ts && cd /app/database && tsx ... seeds/index.ts && cd /app/server && node ... dist/index.js"
```

Changes:
- **Delete:** `prisma generate` step (saves ~5s build time)
- **Delete:** Two `COPY --from=builder` lines for Prisma client/engine (saves ~50MB image size)
- **Delete:** `COPY database/prisma/` line
- **Add:** `COPY database/` for drizzle schema + migration files
- **Replace:** `pnpm add -g prisma@5.22.0` -> `pnpm add -g drizzle-kit`
- **Replace:** `prisma migrate deploy` -> `drizzle-kit migrate`

### CI Workflows (before/after)

**ci.yml changes:**
```yaml
# BEFORE
- run: pnpm exec prisma generate --schema=database/prisma/schema.prisma
- run: pnpm exec prisma migrate deploy --schema=database/prisma/schema.prisma

# AFTER
- run: pnpm exec drizzle-kit migrate --config=database/drizzle.config.ts
# No generate step needed
```

**deploy.yml:** No changes (Docker handles everything).

### package.json Scripts (before/after)

**Root package.json:**
```json
// BEFORE
"db:migrate": "pnpm --filter @realm-of-crowns/database migrate",
"db:seed": "pnpm --filter @realm-of-crowns/database seed",
"db:studio": "pnpm --filter @realm-of-crowns/database studio",
"db:reset": "pnpm --filter @realm-of-crowns/database reset"

// AFTER
"db:migrate": "pnpm --filter @realm-of-crowns/database exec drizzle-kit generate",
"db:push": "pnpm --filter @realm-of-crowns/database exec drizzle-kit push",
"db:seed": "pnpm --filter @realm-of-crowns/database seed",
"db:studio": "pnpm --filter @realm-of-crowns/database exec drizzle-kit studio",
"db:introspect": "pnpm --filter @realm-of-crowns/database exec drizzle-kit introspect"
```

### Startup Command (before/after)

```bash
# BEFORE
prisma migrate deploy --schema=... && tsx seeds/index.ts && node dist/index.js

# AFTER
drizzle-kit migrate --config=... && tsx seeds/index.ts && node dist/index.js
```

---

## Connection Pooling

**Current (Prisma):**
```typescript
export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
prisma.$connect();
```
Pool managed internally by Prisma. Default: `num_cpus * 2 + 1` connections.

**Drizzle (node-postgres Pool):**
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../database/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Azure PostgreSQL requires SSL
  max: 15,          // Match current behavior
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
```

**Azure PostgreSQL notes:**
- `?sslmode=require` in the connection string works with `pg` Pool natively
- `ssl: { rejectUnauthorized: false }` required for Azure's self-signed certs
- Azure Basic tier (B1ms) allows max 50 connections; `max: 15` leaves headroom

---

## Testing Strategy

### Current Test Infrastructure
- 16 test files, 221 test specs
- `server/src/__tests__/setup.ts` provides factory functions: `createTestUser()`, `createTestTown()`, etc.
- `cleanupTestData()` deletes from 26 tables in dependency order
- `jest.config.js` enforces `maxWorkers: 1` (serial execution)
- Tests guard against running on production DB

### Migration Approach

1. **Replace PrismaClient with Drizzle db in setup.ts:**
```typescript
// BEFORE
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// AFTER
import { db } from '../lib/db';
import { users, characters, towns, ... } from '../../database/schema';
```

2. **Factory functions translate directly:**
```typescript
// BEFORE
async function createTestUser() {
  return prisma.user.create({ data: { username: 'test', ... } });
}

// AFTER
async function createTestUser() {
  const [user] = await db.insert(users).values({ username: 'test', ... }).returning();
  return user;
}
```

3. **Cleanup translates directly:**
```typescript
// BEFORE
await prisma.inventory.deleteMany({});

// AFTER
await db.delete(inventory);
```

4. **No Drizzle-specific test utilities needed** -- standard queries work fine for test setup/teardown.

5. **Test database migrations:** Replace `prisma migrate deploy` with `drizzle-kit migrate` in CI workflow.

---

## Migration Execution Plan

### Recommended Approach: Option A -- Big-Bang Rewrite

**Rationale:**
- Zero users = zero risk to production data
- Running two ORMs doubles complexity and confusion
- 103 files is large but mechanical -- most changes are find-and-replace patterns
- Drizzle-Kit introspect generates 80% of the schema automatically
- Clean break avoids `prisma` and `drizzle-orm` both in node_modules

### Phase-by-Phase Timeline

**Phase 1: Schema + Infrastructure (Session 1)**
1. Run `drizzle-kit introspect` against production DB to generate initial schema
2. Verify generated schema against Prisma schema (86 models, 39 enums, all indexes)
3. Split into domain files per the organization above
4. Create `shared/src/enums/` with all 39 enum definitions
5. Create `database/drizzle.config.ts`
6. Create `server/src/lib/db.ts` (Drizzle client singleton)
7. Create `server/src/lib/db-errors.ts` (PostgreSQL error handler)
8. Update `database/package.json` dependencies

**Phase 2: Core Services + Routes (Session 2-3)**
9. Migrate `server/src/lib/` files (prisma.ts -> db.ts, prisma-errors.ts -> db-errors.ts, road-encounter.ts, travel-tick.ts, etc.)
10. Migrate `server/src/services/` (12 files)
11. Migrate `server/src/routes/` (20 files)
12. Migrate `server/src/jobs/` (2 files)
13. Update all `@prisma/client` enum imports -> `@shared/enums` (82 files)
14. Update all `Prisma.*` type imports -> Drizzle equivalents (18 files)

**Phase 3: Seeds + Tests (Session 3-4)**
15. Migrate `database/seeds/` (27 files)
16. Migrate `server/src/__tests__/setup.ts` and all 16 test files
17. Migrate `server/src/scripts/` (6 files)
18. Run full test suite

**Phase 4: Cleanup + Deploy (Session 4-5)**
19. Delete `database/prisma/` directory (schema.prisma + 51 migrations)
20. Delete `server/src/lib/prisma.ts` and `prisma-errors.ts`
21. Remove `prisma` and `@prisma/client` from all package.json files
22. Update Dockerfile (remove generate, copy, prisma CLI)
23. Update CI workflow (remove prisma generate/migrate)
24. Run full test suite again
25. TypeScript compilation check (server + client)
26. Deploy

### Rollback Plan

- Git branch: all work on `feat/drizzle-migration` branch
- If migration fails mid-deploy: revert to `main` (Prisma still works)
- Database schema is UNCHANGED -- both ORMs talk to the same tables
- No data migration needed; this is purely an application-layer change

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Missing query pattern causes runtime crash | Medium | High | This audit catalogs all 1,871 calls; grep-verify before deploy |
| Drizzle relational query API generates inefficient SQL for deep includes | Low | Medium | Benchmark critical paths (travel-tick, combat) before/after |
| Json field typing loses safety without Prisma.InputJsonValue | Medium | Low | Define explicit interfaces for all 46 Json fields |
| @updatedAt auto-update missed on some models | Medium | Medium | Grep for all 54 @updatedAt fields; add `$onUpdate` to each |
| Connection pool misconfiguration with Azure PostgreSQL | Low | High | Test SSL and pool settings against production DB before deploy |
| Seeds break due to Drizzle API differences | Low | Medium | Seeds run on every deploy; first failed deploy reveals issues |
| 747 column name mappings have a typo | Low | High | `drizzle-kit introspect` generates mappings from actual DB; verify |
| Test cleanup order wrong with Drizzle | Low | Low | Same 26-table deletion order works; FK cascade unchanged |
| `drizzle-kit migrate` behavior differs from `prisma migrate deploy` | Low | Medium | Test migration command against staging before production |
| Drizzle doesn't support a specific PostgreSQL feature used in raw SQL | Very Low | Low | Only 20 raw SQL calls; all use standard PostgreSQL features |

---

## Dependencies to Install

```bash
# Database package
pnpm --filter @realm-of-crowns/database add drizzle-orm pg
pnpm --filter @realm-of-crowns/database add -D drizzle-kit @types/pg

# Server package (needs drizzle-orm for queries, pg for pool)
pnpm --filter @realm-of-crowns/server add drizzle-orm pg
pnpm --filter @realm-of-crowns/server add -D @types/pg

# Remove from all packages when migration is complete
pnpm --filter @realm-of-crowns/database remove prisma @prisma/client
pnpm --filter @realm-of-crowns/server remove @prisma/client
pnpm --filter @realm-of-crowns/shared remove @prisma/client
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `database/schema/index.ts` | Re-exports all tables, relations, enums |
| `database/schema/enums.ts` | All 39 `pgEnum()` definitions |
| `database/schema/auth.ts` | User, Session, PasswordReset tables |
| `database/schema/character.ts` | Character, Equipment, Inventory, etc. |
| `database/schema/combat.ts` | Monster, CombatEncounterLog, CombatSession |
| `database/schema/economy.ts` | MarketListing, TradeTransaction, etc. |
| `database/schema/crafting.ts` | Recipe, CraftingQueue, Profession, etc. |
| `database/schema/world.ts` | Region, Town, TravelRoute, Node, Kingdom |
| `database/schema/politics.ts` | Election, Law, Council, Petition, etc. |
| `database/schema/social.ts` | Friend, Guild, Party, Message, etc. |
| `database/schema/housing.ts` | OwnedBuilding, ConstructionProject |
| `database/schema/quest.ts` | Quest, QuestProgress, Achievement |
| `database/schema/food.ts` | FoodItem, FoodPreference |
| `database/schema/daily.ts` | DailyAction, DailyReport, ActionLockIn |
| `database/schema/simulation.ts` | SimulationRun, SimulationResult |
| `database/schema/errors.ts` | ErrorLog table |
| `database/schema/relations.ts` | All 216 relation definitions |
| `database/drizzle.config.ts` | Drizzle-Kit configuration |
| `server/src/lib/db.ts` | Drizzle client singleton (replaces prisma.ts) |
| `server/src/lib/db-errors.ts` | PostgreSQL error handler (replaces prisma-errors.ts) |
| `shared/src/enums/index.ts` | All 39 enum const arrays + types |
| `shared/src/enums/race.ts` | Race enum |
| `shared/src/enums/profession.ts` | ProfessionType, ProfessionTier, etc. |
| `shared/src/enums/item.ts` | ItemType, ItemRarity, EquipSlot |
| `shared/src/enums/biome.ts` | BiomeType |
| `shared/src/enums/building.ts` | BuildingType |
| `shared/src/enums/combat.ts` | CombatType, CombatStance, etc. |
| `shared/src/enums/misc.ts` | Remaining enums |

---

## Files to Delete

| File | Reason |
|------|--------|
| `database/prisma/schema.prisma` | Replaced by `database/schema/` |
| `database/prisma/migrations/` (51 dirs) | Irrelevant; Drizzle manages its own migrations |
| `server/src/lib/prisma.ts` | Replaced by `server/src/lib/db.ts` |
| `server/src/lib/prisma-errors.ts` | Replaced by `server/src/lib/db-errors.ts` |

Also remove from `package.json` files:
- `prisma` (dev dependency in database)
- `@prisma/client` (dependency in database, server, shared)

---

## Open Questions for Tony

1. **Drizzle-Kit introspect first?** Recommended to generate the initial schema from the live DB rather than hand-translating 2,388 lines. This guarantees the schema matches production exactly. Proceed?

2. **Enum naming convention:** Prisma uses PascalCase enum values (`WARRIOR`, `COMMON`). Keep uppercase or switch to lowercase (`warrior`, `common`)? Uppercase is more conventional for const enums but requires updating any string comparisons.

3. **Drizzle Studio port:** Drizzle Studio runs as a local web UI (`drizzle-kit studio`). Replace the `db:studio` script with Drizzle's? It's less polished than Prisma Studio but adequate.

4. **Root-level scripts:** 14 audit/analysis scripts in `/scripts/` import PrismaClient. These are one-off diagnostic scripts. Migrate them too or leave them (they'll break but aren't used in production)?

5. **Migration timing:** Run this immediately after Phase 7 (Tailwind 4) while the modernization momentum is fresh? Or wait for a feature freeze?
