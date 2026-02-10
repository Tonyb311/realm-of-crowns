# Realm of Crowns -- Technical Architecture

> Version 0.1.0 | Last updated: 2026-02-08

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Architecture](#4-database-architecture)
5. [Shared Package](#5-shared-package)
6. [Real-Time System](#6-real-time-system)
7. [Cron Jobs](#7-cron-jobs)
8. [Caching Strategy](#8-caching-strategy)
9. [Security](#9-security)
10. [Development Workflow](#10-development-workflow)

---

## 1. System Architecture Overview

Realm of Crowns is a browser-based fantasy MMORPG built as a TypeScript monorepo with four workspace packages.

```
+--------------------------------------------------+
|                   BROWSER                        |
|                                                  |
|  React 18 + Vite     Socket.io Client            |
|  React Query          (WebSocket)                |
|  Zustand stores                                  |
+--------+-----------------+-----------------------+
         |  HTTP /api/*    |  ws /socket.io
         v                 v
+--------+-----------------+-----------------------+
|               EXPRESS SERVER (:4000)             |
|                                                  |
|  +----------+  +----------+  +----------------+  |
|  | REST API |  | Socket.io|  | Cron Jobs      |  |
|  | Routes   |  | Handlers |  | (node-cron)    |  |
|  +----+-----+  +----+-----+  +-------+--------+  |
|       |              |                |           |
|       v              v                v           |
|  +----+-----+  +-----+----+  +-------+--------+  |
|  | Services |  | Presence |  | Election       |  |
|  | (biz     |  | Tracking |  | Tax Collection |  |
|  |  logic)  |  |          |  | Law Expiration |  |
|  +----+-----+  +----+-----+  +-------+--------+  |
|       |              |                |           |
+-------+--------------+----------------+-----------+
         |              |                |
         v              v                v
+--------+-----+  +-----+-----+
| PostgreSQL   |  |   Redis    |
| (Prisma ORM) |  | (optional) |
| 15-alpine    |  | 7-alpine   |
+--------------+  +------------+
```

### Workspace Packages

| Package    | Path         | Purpose                                      |
|------------|--------------|----------------------------------------------|
| `client`   | `client/`    | React SPA (Vite, Tailwind, React Query)      |
| `server`   | `server/`    | Express API, Socket.io, cron jobs            |
| `shared`   | `shared/`    | Types, constants, game data, dice utilities  |
| `database` | `database/`  | Prisma schema, migrations, seed scripts      |

The root `package.json` uses npm workspaces to link all four packages. Build order: `shared` -> `client` + `server`.

---

## 2. Frontend Architecture

### Tech Stack

| Layer           | Library / Tool             | Version |
|-----------------|----------------------------|---------|
| Framework       | React                      | 18.3    |
| Bundler         | Vite                       | 5.3     |
| Routing         | React Router DOM           | 6.23    |
| Server State    | TanStack React Query       | 5.50    |
| Client State    | Zustand                    | 4.5     |
| HTTP Client     | Axios                      | 1.7     |
| Real-time       | Socket.io Client           | 4.7     |
| Styling         | Tailwind CSS               | 3.4     |
| Animations      | Framer Motion              | 11.2    |
| Icons           | Lucide React               | 0.400   |
| Charts          | Recharts                   | 2.12    |
| Notifications   | React Hot Toast            | 2.6     |
| Date formatting | date-fns                   | 3.6     |

### Entry Point

```
client/src/main.tsx
  -> QueryClientProvider (React Query, 5-min stale time, 1 retry)
    -> BrowserRouter
      -> App
        -> AuthProvider (React Context)
          -> Global components (HUD, ChatPanel, Notifications, Navigation)
          -> <Routes> (lazy-loaded pages)
```

### Routing & Code Splitting

All page components are lazy-loaded via `React.lazy()` + `<Suspense>`:

| Route                | Page Component           | Auth Required |
|----------------------|--------------------------|:------------:|
| `/`                  | HomePage (inline)        | Yes          |
| `/login`             | LoginPage                | No           |
| `/register`          | RegisterPage             | No           |
| `/create-character`  | CharacterCreationPage    | Yes          |
| `/town`              | TownPage                 | Yes          |
| `/market`            | MarketPage               | Yes          |
| `/inventory`         | InventoryPage            | Yes          |
| `/crafting`          | CraftingPage             | Yes          |
| `/combat`            | CombatPage               | Yes          |
| `/map`               | WorldMapPage             | Yes          |
| `/town-hall`         | TownHallPage             | Yes          |
| `/elections`         | ElectionPage             | Yes          |
| `/governance`        | GovernancePage           | Yes          |
| `/kingdom`           | KingdomPage              | Yes          |
| `/guild`             | GuildPage                | Yes          |
| `/profile/:characterId` | ProfilePage           | Yes          |
| `/quests`            | QuestJournalPage         | Yes          |
| `/skills`            | SkillTreePage            | Yes          |
| `/achievements`      | AchievementPage          | Yes          |

Protected routes are wrapped in `<ProtectedRoute>`, which checks the AuthContext.

### State Management

**Server state** is managed by React Query:
- Configured with a 5-minute `staleTime` and 1 retry
- Query keys follow `['resource', identifier]` convention (e.g., `['character', 'me']`)
- All API calls go through the `api` Axios instance (see below)

**Client state** is managed by Zustand stores in `client/src/stores/`.

**Auth state** is managed by React Context (`client/src/context/AuthContext.tsx`):
- Stores `user`, `token`, `isAuthenticated`, `isLoading`
- JWT token persisted in `localStorage` as `roc_token`
- On mount, validates token via `GET /api/auth/me`
- On 401 response, clears token and redirects to `/login`

### API Client

`client/src/services/api.ts` -- Axios instance with:
- Base URL: `/api` (proxied to server in dev)
- Request interceptor: attaches `Bearer <token>` from localStorage
- Response interceptor: on 401, clears token and redirects to `/login`

### Socket.io Client

`client/src/services/socket.ts` -- Singleton socket manager:
- Connects to `window.location.origin` with JWT auth from `socket.auth.token`
- Transports: WebSocket (primary), polling (fallback)
- Room management: `joinRooms()`, `leaveRooms()`, `joinGuildRoom()`, `leaveGuildRoom()`
- Typed event payloads for political, social, and progression events

### Real-time Event Providers

Three global provider components listen for Socket.io events and surface them via hooks:

| Provider                      | Hook                    | Events Handled                       |
|-------------------------------|-------------------------|--------------------------------------|
| `PoliticalNotifications`      | `usePoliticalEvents`    | Elections, impeachments, governance   |
| `SocialEventsProvider`        | `useSocialEvents`       | Chat, presence, guild, trade         |
| `ProgressionEventsProvider`   | `useProgressionEvents`  | Level-up, achievements               |

### Tailwind Theme

Custom fantasy theme in `client/tailwind.config.js`:

| Color Group | Usage                            |
|-------------|----------------------------------|
| `primary`   | Gold tones (50-900) for accents  |
| `dark`      | Deep purple-black backgrounds    |
| `parchment` | Warm beige tones for text/cards  |
| `blood`     | Dark reds for danger/combat      |
| `forest`    | Greens for nature/success        |

Fonts: `MedievalSharp` (display), `Crimson Text` (body), `Fira Code` (mono).

### Build Optimization

Vite config (`client/vite.config.ts`):
- Path aliases: `@` -> `./src`, `@shared` -> `../shared/src`
- Manual chunk splitting: `vendor` (React), `query` (React Query + Axios), `ui` (Framer Motion + Lucide), `socket` (Socket.io)
- Dev server proxy: `/api` and `/socket.io` forwarded to `localhost:4000`

---

## 3. Backend Architecture

### Tech Stack

| Layer         | Library / Tool          | Version |
|---------------|-------------------------|---------|
| Framework     | Express                 | 4.19    |
| ORM           | Prisma Client           | 5.15    |
| Auth          | jsonwebtoken + bcryptjs | 9.0/2.4 |
| Validation    | Zod                     | 3.23    |
| Real-time     | Socket.io               | 4.7     |
| Cache         | ioredis                 | 5.4     |
| Rate limiting | express-rate-limit      | 7.3     |
| Security      | helmet                  | 7.1     |
| Cron          | node-cron               | 3.0     |
| Dev runner    | tsx (watch mode)        | 4.15    |
| Testing       | Jest + Supertest        | 30.2    |

### Server Startup Flow

```
server/src/index.ts
  1. Load env vars (dotenv/config)
  2. Create HTTP server from Express app
  3. Create Socket.io server (CORS configured)
  4. Register socket auth middleware (JWT verification)
  5. Initialize event broadcaster (singleton io reference)
  6. Set up presence tracking
  7. Register connection handler (guild rooms, chat, disconnect)
  8. Start HTTP listener on PORT (default 4000)
  9. Start background cron jobs:
     - Election lifecycle (every 5 min)
     - Tax collection (every hour)
     - Law expiration (every 15 min)
```

### Middleware Pipeline

Middleware is applied in this order in `server/src/app.ts`:

```
Request
  |
  v
[1] helmet()               -- Security headers (CSP, HSTS, etc.)
  |
  v
[2] cors()                 -- CORS (origin: CLIENT_URL, credentials: true)
  |
  v
[3] express.json()         -- Parse JSON bodies
  |
  v
[4] express.urlencoded()   -- Parse URL-encoded bodies
  |
  v
[5] rateLimit()            -- 100 requests per 15 min on /api/*
  |
  v
[6] Router                 -- Route matching
  |  |
  |  +-- Per-route: authGuard     (JWT verification)
  |  +-- Per-route: validate()    (Zod schema validation)
  |  +-- Per-route: cache()       (Redis response caching)
  |
  v
[7] 404 handler            -- { error: 'Route not found' }
  |
  v
[8] Error handler          -- 500 with message in dev, generic in prod
```

### Route -> Service -> DB Pattern

Routes follow a consistent layered pattern:

```
Route Handler (server/src/routes/*.ts)
  |-- Applies authGuard + validate middleware
  |-- Extracts user from req.user (set by authGuard)
  |-- Calls Prisma directly for simple queries
  |-- Delegates to services for complex business logic
  |
  v
Service Layer (server/src/services/*.ts)
  |-- progression.ts    (XP, level-up calculations)
  |-- achievements.ts   (achievement trigger checks)
  |-- law-effects.ts    (tax rates, trade restrictions)
  |-- quest-triggers.ts (quest objective completion)
  |
  v
Prisma Client (server/src/lib/prisma.ts)
  |-- Direct DB queries via @prisma/client
  |-- Connection pool warmed on startup
  |-- Logging: warn+error in dev, error only in prod
```

### API Route Registry

All routes are mounted under `/api` in `server/src/routes/index.ts`:

| Mount Path        | Router File       | Key Endpoints                        |
|-------------------|-------------------|--------------------------------------|
| `/auth`           | `auth.ts`         | register, login, me, logout          |
| `/characters`     | `profiles.ts`     | search, profile by ID                |
| `/characters`     | `characters.ts`   | CRUD, me, stats, equipment           |
| `/world`          | `world.ts`        | regions, towns, routes               |
| `/towns`          | `towns.ts`        | town details, population, resources  |
| `/travel`         | `travel.ts`       | start/complete travel between towns  |
| `/market`         | `market.ts`       | list, buy, cancel, price history     |
| `/work`           | `work.ts`         | gathering, building, profession XP   |
| `/crafting`       | `crafting.ts`     | start/complete crafting              |
| `/combat/pve`     | `combat-pve.ts`   | PvE encounters, monster fights       |
| `/combat/pvp`     | `combat-pvp.ts`   | PvP duels, arenas, wars              |
| `/elections`      | `elections.ts`    | nominate, vote, results              |
| `/governance`     | `governance.ts`   | laws, councils, policies, diplomacy  |
| `/guilds`         | `guilds.ts`       | create, join, leave, manage          |
| `/messages`       | `messages.ts`     | message history by channel           |
| `/friends`        | `friends.ts`      | request, accept, decline, block      |
| `/notifications`  | `notifications.ts`| list, mark read                      |
| `/quests`         | `quests.ts`       | available, accept, progress, complete|
| `/skills`         | `skills.ts`       | skill trees, unlock abilities        |

### JWT Auth Flow

```
Client                              Server
  |                                   |
  |-- POST /api/auth/login ---------> |
  |   { email, password }             |
  |                                   |-- Validate with Zod
  |                                   |-- Find user by email
  |                                   |-- bcrypt.compare(password, hash)
  |                                   |-- jwt.sign({ userId, username })
  |                                   |
  | <--- { token, user } ------------ |
  |                                   |
  |-- Store token in localStorage     |
  |                                   |
  |-- GET /api/characters/me -------> |
  |   Authorization: Bearer <token>   |
  |                                   |-- authGuard middleware:
  |                                   |   jwt.verify(token, JWT_SECRET)
  |                                   |   sets req.user = { userId, username }
  |                                   |-- Handler uses req.user.userId
  |                                   |
  | <--- { character data } --------- |
```

### Error Handling

- **Validation errors**: Zod middleware returns 400 with field-level error details
- **Auth errors**: 401 with `{ error: 'Unauthorized' }`
- **Not found**: 404 with `{ error: 'Route not found' }` or resource-specific messages
- **Conflict**: 409 for duplicate email/username
- **Server errors**: 500 with full message in development, generic message in production

---

## 4. Database Architecture

### Prisma ORM

- Schema: `database/prisma/schema.prisma`
- Provider: PostgreSQL 15 (Alpine)
- Connection URL: `DATABASE_URL` env var
- Database workspace: `@realm-of-crowns/database`

### Key Model Relationships

```
User (1) -----> (*) Character
                     |
    +----------------+------------------+
    |                |                  |
    v                v                  v
 Inventory    PlayerProfession    GuildMember
    |                                   |
    v                                   v
  Item ---- ItemTemplate            Guild
    |
    v
 MarketListing ---- Town ---- Region
                      |
         +------------+------------+
         |            |            |
         v            v            v
     Election    TownTreasury   Building
         |
         v
    ElectionVote
```

### Entity Model Groups

| Group              | Models                                                         |
|--------------------|----------------------------------------------------------------|
| Users & Characters | User, Character, CharacterEquipment, Inventory                 |
| Professions        | PlayerProfession, ProfessionXP                                 |
| World Geography    | Region, Town, TownResource, TravelRoute, TravelAction, RegionBorder, ExclusiveZone |
| Items & Resources  | Resource, ItemTemplate, Item, Recipe                           |
| Crafting/Gathering | CraftingAction, GatheringAction                                |
| Buildings          | Building, BuildingConstruction                                 |
| Economy & Trade    | MarketListing, TradeTransaction, PriceHistory, Caravan         |
| Politics           | Election, ElectionVote, ElectionCandidate, Impeachment, ImpeachmentVote, TownTreasury, Law, Kingdom, TownPolicy, CouncilMember |
| Guilds             | Guild, GuildMember                                             |
| NPCs               | Npc                                                           |
| Quests             | Quest, QuestProgress                                           |
| Combat             | CombatSession, CombatLog, CombatParticipant, Monster           |
| Communication      | Message, Notification                                          |
| Racial Mechanics   | RacialRelation, RacialAbilityCooldown, ChangelingDisguise, WarforgedMaintenance, DiplomacyEvent, War |
| Abilities          | Ability, CharacterAbility                                      |
| Achievements       | Achievement, PlayerAchievement                                 |
| Social             | Friend                                                         |

### Enums (22 total)

Race (20 values), RaceTier, DraconicAncestry, BeastClan, ElementalType, RelationStatus, ProfessionType (28 values), ProfessionCategory, ProfessionTier, BiomeType (14 values), ItemType, ItemRarity, ResourceType, EquipSlot (11 values), BuildingType (23 values), ActionStatus, CombatType, ElectionType, ElectionPhase, ImpeachmentStatus, DiplomacyActionType, QuestType, FriendStatus, MessageChannel, NpcRole.

### Index Strategy

Prisma indexes follow these patterns:
- **Foreign keys**: Every FK field has a `@@index` (e.g., `@@index([characterId])`)
- **Unique constraints**: Natural keys use `@@unique` (e.g., `[characterId, slot]` on equipment)
- **Status columns**: `@@index([status])` on all action/election tables
- **Composite indexes**: For common query patterns (e.g., `[townId, price]` on market listings, `[channelType, townId, timestamp]` on messages, `[characterId, status]` on quest progress)
- **Lookup fields**: `@@index([race])`, `@@index([type])`, `@@index([biome])` for filtering

### Migration Management

```
database/prisma/
  schema.prisma          -- Source of truth
  migrations/            -- Prisma-generated SQL migration files
```

Commands (from project root):
- `npm run db:migrate` -- Run pending migrations (`prisma migrate dev`)
- `npm run db:seed` -- Execute seed scripts
- `npm run db:studio` -- Open Prisma Studio GUI
- `npm run db:reset` -- Drop and recreate database (`prisma migrate reset`)

### Seeding Strategy

The seed system (`database/seeds/index.ts`) runs in a defined order:

```
1. seedWorld()      -- Regions (14 biomes), Towns (68), TravelRoutes, TownResources
2. seedResources()  -- Base gathering resources per biome
3. seedRecipes()    -- Crafting recipes and item templates
4. seedMonsters()   -- PvE monsters by region and biome
5. seedQuests()     -- Quest definitions and NPC quest givers
```

Each seed function receives the Prisma client and is idempotent. Run via `tsx seeds/index.ts`.

---

## 5. Shared Package

The `shared/` workspace (`@realm-of-crowns/shared`) contains game logic and data shared between client and server.

### Structure

```
shared/src/
  index.ts              -- Re-exports types + constants
  types/
    index.ts            -- Re-exports all type modules
    combat.ts           -- CombatState, Combatant, TurnResult, etc.
    race.ts             -- Race type definitions
  constants/
    index.ts            -- Game constants (placeholder)
  utils/
    dice.ts             -- Dice rolling functions (attackRoll, damageRoll, etc.)
  data/
    achievements.ts     -- Achievement definitions
    items/              -- Item template data
    professions/        -- Profession definitions
    quests/             -- Quest data
    races/              -- Race stats and abilities
    recipes/            -- Crafting recipe data
    resources/          -- Resource definitions
    skills/             -- Skill tree data
    world/              -- Region and town data
```

### How Client and Server Import It

**Server** (via `tsx`): Imports directly using path aliases configured in the server's tsconfig:
```typescript
import { attackRoll } from '@shared/utils/dice';
import type { CombatState } from '@shared/types/combat';
```

**Client** (via Vite): Uses the resolve alias in `vite.config.ts`:
```typescript
// vite.config.ts
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, '../shared/src'),
  },
}
```

The shared package also builds independently (`tsc`) and exports from `src/index.ts` for any consumer that wants the compiled output.

---

## 6. Real-Time System

### Socket.io Server Setup

```
server/src/index.ts
  |-- Creates Socket.io server on the same HTTP server as Express
  |-- CORS: same origin as REST API (CLIENT_URL)
  |-- Auth middleware: verifies JWT from socket.handshake.auth.token
  |-- Event broadcaster: singleton pattern for route handlers to emit events
```

### Event Catalog

#### Political Events (server -> all clients)

| Event                      | Payload                                  | Trigger                  |
|----------------------------|------------------------------------------|--------------------------|
| `election:new`             | electionId, townId, type, phase, dates   | Auto-created by cron     |
| `election:phase-changed`   | electionId, previousPhase, newPhase      | Cron: nominations->voting|
| `election:results`         | electionId, winnerId, candidateResults   | Cron: voting->completed  |
| `impeachment:resolved`     | impeachmentId, result, votes             | Cron: expired impeachment|
| `governance:law-passed`    | lawId, title, kingdomId                  | Law vote passes          |
| `governance:war-declared`  | attackerKingdomId, defenderKingdomId     | Diplomacy action         |
| `governance:peace-proposed`| warId, proposerKingdomId                 | Diplomacy action         |
| `governance:tax-changed`   | townId, newRate                          | Policy update            |

#### Social Events (server -> targeted clients)

| Event               | Target          | Payload                              |
|---------------------|-----------------|--------------------------------------|
| `chat:message`      | Room or user    | id, channelType, content, sender     |
| `chat:error`        | Sender socket   | error message                        |
| `presence:online`   | User's friends  | characterId, characterName           |
| `presence:offline`  | User's friends  | characterId                          |
| `presence:friends-online` | Connecting user | friends[] array                |
| `player:enter-town` | Town room       | characterId, characterName           |
| `player:leave-town` | Town room       | characterId, destination             |
| `guild:member-joined` | Guild room    | guildId, characterId, characterName  |
| `guild:member-left` | Guild room      | guildId, characterId, characterName  |
| `guild:dissolved`   | Guild room      | guildId, guildName                   |
| `notification:new`  | Target user     | id, type, title, message             |

#### Combat / Progression Events (server -> targeted clients)

| Event                 | Target          | Payload                                |
|-----------------------|-----------------|----------------------------------------|
| `combat:result`       | Participants    | sessionId, type, result, summary       |
| `trade:completed`     | Seller          | buyerId, itemName, quantity, price      |
| `player:level-up`     | Target user     | characterId, newLevel, rewards         |
| `achievement:unlocked`| Target user     | characterId, achievementId, name       |
| `friend:request`      | Recipient       | friendshipId, requesterId, name        |
| `friend:accepted`     | Requester       | friendshipId, acceptedById, name       |

#### Client -> Server Events

| Event              | Payload            | Handler                          |
|--------------------|--------------------|----------------------------------|
| `chat:send`        | channelType, content, recipientId/guildId/townId | `chat-handlers.ts` |
| `chat:identify`    | characterId        | Sets socket.data.characterId     |
| `join:town`        | townId             | Join town room + update presence |
| `leave:town`       | townId             | Leave town room                  |
| `join:guild`       | guildId            | Join guild room                  |
| `leave:guild`      | guildId            | Leave guild room                 |
| `join:kingdom`     | kingdomId          | Join kingdom room                |
| `leave:kingdom`    | kingdomId          | Leave kingdom room               |

### Presence Tracking

`server/src/socket/presence.ts`:

```
On connect:
  1. Look up character from socket.data.userId
  2. Store PresenceEntry in onlineUsers Map (in-memory)
  3. Mirror to Redis hash (presence:online) if available
  4. Auto-join rooms: town:<townId>, user:<characterId>
  5. Notify online friends via presence:online
  6. Send presence:friends-online to connecting user

On disconnect:
  1. Remove from onlineUsers Map and Redis
  2. Notify friends via presence:offline
  3. Clean up socket rate limit entry
```

### Chat Architecture

7 message channels: GLOBAL, TOWN, GUILD, PARTY, WHISPER, TRADE, SYSTEM.

```
chat:send
  |-- Validate channelType and content (max 2000 chars)
  |-- Look up character from socket.data.characterId
  |-- Channel-specific validation:
  |     WHISPER: requires recipientId, no self-whisper
  |     GUILD: requires guildId, verify membership
  |     TOWN: resolve from character.currentTownId
  |
  |-- Persist to messages table via Prisma
  |
  |-- Broadcast to appropriate target:
       WHISPER -> recipient's sockets + echo to sender
       TOWN    -> town:<townId> room
       GUILD   -> guild:<guildId> room
       GLOBAL/TRADE/SYSTEM -> all connected sockets
       PARTY   -> echo to sender (pending party system)
```

---

## 7. Cron Jobs

Three background jobs run on the server using `node-cron`. All are started in `server/src/index.ts` after the HTTP server begins listening.

### Election Lifecycle (`server/src/jobs/election-lifecycle.ts`)

**Schedule**: Every 5 minutes (`*/5 * * * *`)

**Phases**:
```
[autoCreateElections]
  Towns without an active election -> create MAYOR election
  Phase: NOMINATIONS, duration: 24 hours

        | 24 hours
        v

[transitionNominationsToVoting]
  Elections past nomination period:
    No candidates -> mark COMPLETED (no winner)
    Has candidates -> transition to VOTING phase
    Emit: election:phase-changed

        | 24 hours (endDate)
        v

[transitionVotingToCompleted]
  Elections past endDate:
    Tally votes per candidate (groupBy)
    Winner = most votes (tie-break: earliest nomination)
    Appoint winner:
      MAYOR -> update town.mayorId
      RULER -> update kingdom.rulerId
    Emit: election:results

[resolveExpiredImpeachments]
  Active impeachments past endsAt:
    PASSED (votesFor > votesAgainst):
      Remove official (set mayorId/rulerId to null)
      New election auto-created next cycle
    FAILED: no action
    Emit: impeachment:resolved
```

### Tax Collection (`server/src/jobs/tax-collection.ts`)

**Schedule**: Every hour (`0 * * * *`)

```
For each TownTreasury:
  1. Find TradeTransactions since lastCollectedAt
  2. Look up effective tax rate from TownPolicy (falls back to treasury.taxRate)
  3. Calculate tax: floor(price * quantity * taxRate) per transaction
  4. Increment treasury balance
  5. Update lastCollectedAt timestamp
```

### Law Expiration (`server/src/jobs/law-expiration.ts`)

**Schedule**: Every 15 minutes (`*/15 * * * *`)

```
Find all laws where:
  status = 'active' AND expiresAt <= now
Update status to 'expired' (batch updateMany)
```

---

## 8. Caching Strategy

### Redis Configuration

`server/src/lib/redis.ts`:
- **Optional**: Server runs without Redis if `REDIS_URL` is not set
- **Connection**: ioredis with retry strategy (max 5 retries, backoff up to 2s)
- **Events**: Logs connect, error, and reconnecting events

### Cache Middleware

`server/src/middleware/cache.ts`:

```
cache(ttlSeconds: number)
  |-- Check Redis for key: cache:<originalUrl>
  |     HIT  -> return cached JSON, set X-Cache: HIT
  |     MISS -> intercept res.json():
  |               if 2xx: store in Redis with TTL
  |               set X-Cache: MISS
```

Usage in routes:
```typescript
router.get('/listings', authGuard, cache(60), async (req, res) => { ... });
```

### Cache Keys

| Key Pattern                  | TTL   | Used By              |
|------------------------------|-------|----------------------|
| `cache:/api/market/listings` | 60s   | Market listings      |
| `cache:/api/world/*`         | varies| World/region data    |
| `presence:online`            | N/A   | Redis hash for presence tracking |

### Cache Invalidation

`invalidateCache(pattern: string)`:
- Uses `redis.keys(pattern)` to find matching keys
- Deletes all matching keys in a single `redis.del()` call
- Called from route handlers after mutations (e.g., after a market listing is created)

---

## 9. Security

### Authentication

| Mechanism   | Implementation                          |
|-------------|----------------------------------------|
| Password    | bcryptjs with cost factor 12           |
| Token       | JWT signed with `JWT_SECRET` env var   |
| Expiry      | Configurable via `JWT_EXPIRES_IN` (default 7d) |
| Storage     | Client stores in `localStorage` as `roc_token` |
| Validation  | Server: `jwt.verify()` in authGuard middleware |
| Socket auth | JWT verified in `socketAuthMiddleware` before connection |

### HTTP Security Headers

Provided by `helmet()` middleware:
- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

### Rate Limiting

| Layer   | Scope           | Limit              | Window    |
|---------|-----------------|--------------------|-----------|
| HTTP    | All `/api/*`    | 100 requests       | 15 min    |
| Socket  | Per socket      | 30 messages        | 1 min     |

HTTP rate limiting uses `express-rate-limit` with standard headers. Socket rate limiting is a custom in-memory Map with per-socket counters, cleaned up on disconnect.

### CORS

```typescript
cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
})
```

Both Express and Socket.io use the same CORS origin. In production Docker, `CLIENT_URL` is set to the deployed client URL.

### Input Validation

Every POST/PUT route validates `req.body` against a Zod schema via the `validate()` middleware:

```typescript
router.post('/register', validate(registerSchema), async (req, res) => { ... });
```

Validation errors return 400 with structured field-level errors:
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

Chat messages enforce a 2000-character maximum. Channel types are validated against a whitelist.

---

## 10. Development Workflow

### Prerequisites

- Node.js (v20+)
- npm (v9+)
- Docker & Docker Compose (for PostgreSQL and Redis)

### Dev Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url> && cd realm-of-crowns
npm install

# 2. Start infrastructure (PostgreSQL + Redis)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 3. Set up environment
cp server/.env.example server/.env
# Edit server/.env with:
#   DATABASE_URL=postgresql://roc_user:roc_password@localhost:5432/realm_of_crowns
#   REDIS_URL=redis://localhost:6379
#   JWT_SECRET=<random-secret>
#   JWT_EXPIRES_IN=7d
#   PORT=4000
#   CLIENT_URL=http://localhost:3000

# 4. Run database migrations
npm run db:migrate

# 5. Seed the database
npm run db:seed

# 6. Start dev servers (client + server concurrently)
npm run dev
```

This starts:
- **Client**: Vite dev server on `http://localhost:3000` (with HMR)
- **Server**: tsx in watch mode on `http://localhost:4000`

The Vite dev server proxies `/api/*` and `/socket.io/*` to the server.

### Docker Production

```bash
# Full production stack
docker compose up -d

# Services:
#   roc-postgres  -> PostgreSQL on :5432
#   roc-redis     -> Redis on :6379
#   roc-server    -> API on :4000
#   roc-client    -> Static files via nginx on :80
```

### Database Commands

| Command             | Description                                     |
|---------------------|-------------------------------------------------|
| `npm run db:migrate`| Run pending Prisma migrations                   |
| `npm run db:seed`   | Execute seed scripts (world, resources, etc.)    |
| `npm run db:studio` | Open Prisma Studio GUI (visual data browser)     |
| `npm run db:reset`  | Drop and recreate database + re-run migrations   |

### Running Tests

```bash
npm test                # Run all server tests (Jest, sequential)
npm run test:verbose    # Same, with verbose output
```

Tests use Jest with `ts-jest` and Supertest for HTTP endpoint testing. Tests run sequentially (`--runInBand`) and force exit after completion.

### Adding a New Feature

The standard workflow for adding a new feature:

```
1. Schema   -- Add/modify models in database/prisma/schema.prisma
               Run: npm run db:migrate
               (creates a new migration file)

2. Shared   -- Add shared types/constants in shared/src/
               (if needed by both client and server)

3. Route    -- Create server/src/routes/<feature>.ts
               Add Zod validation schemas
               Register in routes/index.ts

4. Service  -- If complex business logic is needed:
               Create server/src/services/<feature>.ts

5. Events   -- Add Socket.io event emitters in socket/events.ts
               (if real-time updates are needed)

6. UI       -- Create page in client/src/pages/<Feature>Page.tsx
               Add route in client/src/App.tsx (lazy-loaded)
               Create components in client/src/components/<feature>/
               Add React Query hooks for data fetching

7. Test     -- Add tests in server/src/__tests__/
```

### Naming Conventions

| Element              | Convention                | Example                      |
|----------------------|---------------------------|------------------------------|
| Files (server)       | kebab-case                | `combat-pve.ts`              |
| Files (client pages) | PascalCase                | `TownHallPage.tsx`           |
| Files (client components) | PascalCase           | `PlayerSearch.tsx`           |
| Database tables      | snake_case (via @@map)    | `player_professions`         |
| Database columns     | snake_case (via @map)     | `character_id`               |
| TypeScript models    | PascalCase                | `PlayerProfession`           |
| API routes           | kebab-case                | `/api/combat/pve`            |
| Socket events        | colon-separated           | `election:phase-changed`     |
| Env variables        | SCREAMING_SNAKE_CASE      | `DATABASE_URL`               |
| React hooks          | camelCase with `use`      | `usePoliticalEvents`         |
| Zustand stores       | camelCase with `use`      | `useGameStore`               |

### Project Scripts (root)

| Script            | Command                                        |
|-------------------|------------------------------------------------|
| `npm run dev`     | Start client + server concurrently             |
| `npm run build`   | Build shared, then client + server             |
| `npm test`        | Run server test suite                          |
| `npm run lint`    | ESLint across all .ts/.tsx files               |
| `npm run typecheck` | TypeScript type checking (no emit)           |
