# Realm of Crowns -- Technical Architecture Document

> Version 0.2.0 | Last updated: 2026-02-10 | Reflects Phase 1 completion (Prompts 00-08)

This document describes the technical architecture of Realm of Crowns, a browser-based fantasy MMORPG built as an npm workspaces monorepo. It is derived from reading the actual codebase, not design aspirations.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Architecture](#4-database-architecture)
5. [Shared Package](#5-shared-package)
6. [Real-Time System](#6-real-time-system)
7. [Cron Job / Daily Tick System](#7-cron-job--daily-tick-system)
8. [Caching Strategy](#8-caching-strategy)
9. [Security](#9-security)
10. [Development Workflow](#10-development-workflow)
11. [Deployment](#11-deployment)

---

## 1. System Architecture Overview

### High-Level Topology

```
+---------------------+          +-------------------------------+
|                     |   HTTP   |                               |
|   React SPA         |<-------->|   Express API Server          |
|   (Vite / Nginx)    |   /api/* |   (Node.js + TypeScript)      |
|                     |          |                               |
|   Port 3000 (dev)   |  WS      |   Port 4000                   |
|   Port 80   (prod)  |<-------->|                               |
|                     | /socket  |   +-------------------------+ |
+---------------------+  .io/*   |   | Socket.io Server        | |
                                 |   | (same HTTP server)      | |
                                 |   +-------------------------+ |
                                 |                               |
                                 |   +-------------------------+ |
                                 |   | Cron Jobs / Daily Tick   | |
                                 |   | (node-cron, 00:00 UTC)  | |
                                 |   +-------------------------+ |
                                 +--------+----------+-----------+
                                          |          |
                                          |          |
                                 +--------v--+  +----v--------+
                                 |            |  |             |
                                 | PostgreSQL |  | Redis 7     |
                                 | 15         |  | (cache,     |
                                 | (Prisma    |  |  presence,  |
                                 |  ORM)      |  |  combat     |
                                 |            |  |  state)     |
                                 +------------+  +-------------+
```

### Monorepo Structure

```
/                          -- npm workspaces root
  client/                  -- React 18 + Vite + Tailwind (@realm-of-crowns/client)
  server/                  -- Express + Socket.io + TypeScript (@realm-of-crowns/server)
  shared/                  -- Shared types, constants, game data (@realm-of-crowns/shared)
  database/                -- Prisma schema, migrations, seeds (@realm-of-crowns/database)
  docs/                    -- Game design documents and architecture
  prompts/                 -- Claude Code agent team prompts by build phase
  scripts/                 -- setup.sh and utilities
  docker-compose.yml       -- Production multi-container config
  docker-compose.dev.yml   -- Dev override (only postgres + redis)
```

### Request/Response Flow

1. The client sends an HTTP request to `/api/*`.
2. In development, Vite proxies `/api/*` and `/socket.io/*` to port 4000. In production, Nginx performs the reverse proxy.
3. Express middleware pipeline processes the request in order: `helmet` (security headers) -> `cors` -> `express.json()` -> `rateLimit` -> route matching.
4. Route handlers call `authGuard` (JWT verification), optionally `validate` (Zod schema), optionally `cache` (Redis lookup), then invoke service-layer logic.
5. Services interact with PostgreSQL via Prisma ORM and Redis via `ioredis`.
6. The response is returned as JSON. If the cache middleware is active, successful responses are written to Redis for future requests.

### Real-Time Event Flow

1. The client creates a Socket.io connection, passing the JWT in `socket.handshake.auth.token`.
2. The server's `socketAuthMiddleware` verifies the token and attaches `userId` to `socket.data`.
3. The `setupPresence` handler resolves the user's character, registers them in the in-memory presence map (backed by Redis), and auto-joins them to `user:{characterId}` and `town:{townId}` rooms.
4. Route handlers and cron jobs call exported functions in `server/src/socket/events.ts` (e.g., `emitTradeCompleted`, `emitLevelUp`) which emit events to the appropriate Socket.io rooms.
5. The client receives events via typed listeners in custom React hooks (e.g., `usePoliticalEvents`, `useSocialEvents`, `useProgressionEvents`).

---

## 2. Frontend Architecture

**Location:** `client/`

**Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, React Query 5 (`@tanstack/react-query`), Zustand 4, Socket.io Client 4, React Router 6, Framer Motion 11, Recharts 2, Lucide Icons, date-fns 3, react-hot-toast, clsx

### Entry Point

`client/src/main.tsx` bootstraps the application:

```tsx
<React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
</React.StrictMode>
```

- **QueryClient** is configured with a 5-minute `staleTime` and single retry.
- **BrowserRouter** provides client-side routing.
- **App** wraps everything in `<AuthProvider>` (React Context) and renders global UI overlays plus `<Routes>`.

### Routing

Defined in `client/src/App.tsx` using React Router v6 `<Routes>` and `<Route>`. All game routes are wrapped in `<ProtectedRoute>` which checks auth state. Pages are code-split via `React.lazy()` with a `<Suspense fallback={<LoadingScreen />}>` boundary.

**Public routes:** `/login`, `/register`

**Protected routes (20):**

| Path | Page Component | Purpose |
|------|---------------|---------|
| `/` | `HomePage` (inline) | Landing / character check |
| `/create-character` | `CharacterCreationPage` | Character creation with race selection |
| `/town` | `TownPage` | Current town overview |
| `/market` | `MarketPage` | Marketplace listings |
| `/inventory` | `InventoryPage` | Character inventory |
| `/crafting` | `CraftingPage` | Crafting interface |
| `/combat` | `CombatPage` | Combat encounters |
| `/map` | `WorldMapPage` | World map with 68 towns |
| `/town-hall` | `TownHallPage` | Town governance |
| `/elections` | `ElectionPage` | Elections UI |
| `/governance` | `GovernancePage` | Laws, treasury |
| `/kingdom` | `KingdomPage` | Kingdom management |
| `/guild` | `GuildPage` | Guild management |
| `/profile/:characterId` | `ProfilePage` | Character profiles |
| `/quests` | `QuestJournalPage` | Quest journal |
| `/skills` | `SkillTreePage` | Skill trees |
| `/achievements` | `AchievementPage` | Achievement tracking |
| `/professions` | `ProfessionsPage` | Profession management |
| `/housing` | `HousingPage` | Building management |
| `/trade` | `TradePage` | Trade routes and caravans |
| `/diplomacy` | `DiplomacyPage` | Racial relations and treaties |

### Global UI Components

Always rendered (outside `<Routes>`):
- `PoliticalNotifications` -- Real-time political event toasts
- `SocialEventsProvider` -- Socket listener for social events
- `ProgressionEventsProvider` -- Socket listener for level-ups and achievements
- `NotificationDropdown` -- Bell icon dropdown for notifications
- `ChatPanel` -- Multi-channel chat interface
- `HUD` -- Heads-up display (health, mana, gold, hunger)
- `Navigation` -- Bottom/side navigation bar

### State Management

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Server state | React Query (`@tanstack/react-query`) | All `/api/*` data fetching, caching, and invalidation. 5-minute stale time. |
| Auth state | React Context (`client/src/context/AuthContext.tsx`) | `user`, `token`, `isAuthenticated`, `isLoading`. Exposes `login`, `register`, `logout`. Token persisted in `localStorage` as `roc_token`. |
| Real-time state | Socket.io Client singleton (`client/src/services/socket.ts`) | Connection lifecycle, room joins/leaves, typed event listeners. |
| UI state | Zustand (available for cross-component state) | Lightweight stores for local/shared UI state without prop drilling. |

### API Client

`client/src/services/api.ts` exports a configured Axios instance:

- **Base URL:** `/api` (proxied in dev, reverse-proxied in prod).
- **Request interceptor:** Attaches `Authorization: Bearer <token>` from `localStorage`.
- **Response interceptor:** Catches 401 errors, clears the token, redirects to `/login`.

### Socket.io Client

`client/src/services/socket.ts` provides:

- `connectSocket()` -- Creates or returns the singleton Socket.io connection. Passes JWT via `auth.token`. Transports: `['websocket', 'polling']`. Connects to `window.location.origin`.
- `disconnectSocket()` -- Tears down the connection and nulls the reference.
- `joinRooms(townId, kingdomId)` / `leaveRooms(townId, kingdomId)` -- Room management.
- `joinGuildRoom(guildId)` / `leaveGuildRoom(guildId)` -- Guild-specific rooms.
- Typed payload interfaces: `PoliticalEvents`, `SocialEvents`, `ProgressionEvents`, plus individual payload types for every event.

### Real-Time Event Hooks

Located in `client/src/hooks/`:

| Hook | Events Handled |
|------|---------------|
| `usePoliticalEvents` | `election:*`, `impeachment:*`, `governance:*` |
| `useSocialEvents` | `chat:message`, `presence:*`, `player:*-town`, `guild:*`, `notification:new`, `combat:result`, `trade:completed` |
| `useProgressionEvents` | `player:level-up`, `achievement:unlocked` |
| `useBuildingEvents` | `building:constructed`, `building:taxDue`, `building:damaged`, `building:conditionLow` |
| `useCraftingEvents` | `crafting:ready` |
| `useGatheringEvents` | `gathering:ready`, `gathering:depleted` |
| `useTradeEvents` | `trade:completed`, `item:lowDurability`, `item:broken` |

### Component Organization

```
client/src/
  components/
    auth/              -- Login/register forms
    character/         -- Character creation, stats display
    combat/            -- Combat UI, turn log, initiative tracker
    crafting/          -- Crafting interface, recipe browser
    daily-actions/     -- Daily action lock-in panel
    daily-report/      -- End-of-day report viewer
    diplomacy/         -- Treaties, wars, racial relations
    economy/           -- Trade analytics, market charts (Recharts)
    food/              -- Food management, hunger display
    gathering/         -- Resource gathering interface
    guilds/            -- Guild management, roster, treasury
    housing/           -- Building construction, upgrades
    hud/               -- HUD sub-components
    inventory/         -- Item grid, equipment slots
    map/               -- World map, region browser
    messaging/         -- Chat channels
    politics/          -- Election UI, governance panels
    professions/       -- Profession trees, XP display
    quests/            -- Quest log, objectives tracker
    races/             -- Race info, abilities display
    racial-abilities/  -- Racial ability usage UI
    social/            -- Friends list, social actions
    town/              -- Town overview, buildings, NPCs
    trade/             -- Caravan management, trade routes
    travel/            -- Travel interface, node map
    ui/                -- Shared primitives (ProtectedRoute, Navigation, etc.)
    -- Standalone components:
    ChatPanel.tsx, FriendsList.tsx, HUD.tsx, LoadingScreen.tsx,
    LevelUpCelebration.tsx, NotificationDropdown.tsx, PlayerSearch.tsx,
    PoliticalNotifications.tsx, ProgressionEventsProvider.tsx,
    QuestDialog.tsx, SocialEventsProvider.tsx, StatAllocation.tsx, XpBar.tsx
  pages/               -- 24 top-level page components (one per route)
  services/            -- api.ts, socket.ts, sounds.ts
  context/             -- AuthContext.tsx
  hooks/               -- 7 real-time event hooks
  types/               -- Client-specific type declarations
  utils/               -- Client-side utilities
  styles/              -- Additional CSS
```

### Styling

Tailwind CSS 3 with a custom medieval/fantasy theme defined in `client/tailwind.config.js`:

- **Color palette:** `primary` (gold/amber tones, 50-900), `dark` (deep blue-black, 50-900), `parchment` (tan/cream, 50-500), `blood` (crimson variants), `forest` (green variants).
- **Fonts:** `MedievalSharp` (display/headings), `Crimson Text` (body), `Fira Code` (monospace).
- **Background textures:** `parchment-texture` and `dark-stone` image URLs.

### Build Optimization

Vite is configured in `client/vite.config.ts` with:

- **Path aliases:** `@` -> `client/src/`, `@shared` -> `shared/src/`.
- **Manual chunk splitting** for optimal caching:
  - `vendor` -- react, react-dom, react-router-dom
  - `query` -- @tanstack/react-query, axios
  - `ui` -- framer-motion, lucide-react
  - `socket` -- socket.io-client
- **Dev server proxy:** `/api` and `/socket.io` (with WebSocket support) forwarded to `http://localhost:4000`.

---

## 3. Backend Architecture

**Location:** `server/`

**Stack:** Node.js 20, Express 4, TypeScript 5, Socket.io 4, Prisma 5, ioredis 5, jsonwebtoken 9, bcryptjs 2, Zod 3, node-cron 3, Helmet 7, express-rate-limit 7, uuid 10

**Dev tools:** tsx (TypeScript execution with watch mode), Jest 30, Supertest 7, tsc-alias (path alias resolution for production builds)

### Entry Point and Server Bootstrap

`server/src/index.ts` orchestrates startup:

1. Creates an HTTP server from the Express `app` (imported from `app.ts`).
2. Attaches a Socket.io `Server` with CORS configured to `CLIENT_URL`.
3. Registers `socketAuthMiddleware` on the Socket.io server.
4. Calls `initEventBroadcaster(io)` to set up the singleton event emitter.
5. Calls `setupPresence(io)` to initialize presence tracking.
6. Registers per-connection handlers: guild room joins, chat handlers, disconnect cleanup.
7. Starts the HTTP server on `PORT` (default 4000).
8. Starts all background cron jobs (election lifecycle, tax collection, resource regeneration, construction completion, caravan events, state-of-aethermere reports, seer premonitions).
9. Exports `io` instance and `emitGovernanceEvent()` helper for use by route handlers.

### Express Application (`app.ts`)

Middleware pipeline in order:

```
Request
  |
  v
helmet()                    -- Security headers (CSP, HSTS, X-Content-Type-Options, etc.)
  |
  v
cors({                      -- CORS with credentials support
  origin: CLIENT_URL,
  credentials: true
})
  |
  v
express.json()              -- JSON body parsing
express.urlencoded()        -- URL-encoded body parsing
  |
  v
rateLimit({                 -- 100 requests per 15-minute window on /api/*
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true
})
  |
  v
/api/health                 -- Health check (no auth): { status, game, version, timestamp }
/api                        -- Welcome endpoint
/api/*                      -- Route tree (35+ sub-routers)
  |
  v
Static files (prod only)    -- Serves client/dist/, SPA fallback for non-API paths
  |
  v
404 handler                 -- { error: 'Route not found' }
  |
  v
Error handler               -- 500; full message in dev, generic in prod
```

### Route Registration

All routes are mounted under `/api` via `server/src/routes/index.ts`. The router registers **35+ sub-routers**:

| Route Prefix | Module | Purpose |
|-------------|--------|---------|
| `/auth` | `auth.ts` | Register, login, logout, `GET /me` session check |
| `/characters` | `characters.ts`, `profiles.ts` | CRUD, character creation with 20 races, profile search |
| `/world` | `world.ts` | World overview data |
| `/towns` | `towns.ts` | Town info, population, features |
| `/travel` | `travel.ts` | Node-based travel system |
| `/market` | `market.ts` | Marketplace listings, purchases |
| `/work` | `work.ts` | Gathering and crafting (real-time actions) |
| `/crafting` | `crafting.ts` | Crafting actions, recipe lookup |
| `/combat/pve` | `combat-pve.ts` | PvE encounter initiation and resolution |
| `/combat/pvp` | `combat-pvp.ts` | PvP duels, challenges, wagers, leaderboard |
| `/elections` | `elections.ts` | Nominations, voting, results |
| `/governance` | `governance.ts` | Laws, treasury, council appointments, war/peace |
| `/guilds` | `guilds.ts` | Guild CRUD, ranks, invites, donations, leadership |
| `/messages` | `messages.ts` | Chat message history retrieval (7 channel types) |
| `/friends` | `friends.ts` | Friend requests, accept/decline, block |
| `/notifications` | `notifications.ts` | Notification CRUD, mark-read |
| `/quests` | `quests.ts` | Quest journal, progress, completion, NPC quest givers |
| `/skills` | `skills.ts` | Skill trees (6 classes, 18 specializations), ability unlocks |
| `/professions` | `professions.ts` | Profession management, XP tracking, tier progression |
| `/tools` | `tools.ts` | Tool crafting and equipping |
| `/equipment` | `equipment.ts` | Equipment slots (11), equip/unequip |
| `/items` | `items.ts` | Item details, durability |
| `/buildings` | `buildings.ts` | Construction, upgrades, maintenance |
| `/trade` | `trade-analytics.ts` | Price history, trade analytics |
| `/caravans` | `caravans.ts` | Caravan dispatch and tracking |
| `/races` | `races.ts` | Race data, abilities, racial relations |
| `/zones` | `zones.ts` | Exclusive zone access (11 zones) |
| `/regions` | `regions.ts` | Region info and borders |
| `/diplomacy` | `diplomacy.ts` | Treaties, wars, peace proposals |
| `/petitions` | `petitions.ts` | Player petitions and signatures |
| `/world-events` | `world-events.ts` | World event feed |
| `/special-mechanics` | `special-mechanics.ts` | Race-specific mechanics (Changeling disguise, etc.) |
| `/food` | `food.ts` | Food management, consumption preferences |
| `/actions` | `actions.ts` | Daily action lock-in |
| `/reports` | `reports.ts` | Daily report retrieval |
| `/admin` | `admin.ts` | Admin controls (manual tick trigger, etc.) |
| `/service` | `service.ts` | Service profession actions |
| `/loans` | `loans.ts` | Banker loans, interest, repayment |
| `/game` | `game.ts` | Game day number, tick status, time-until-reset |

### Middleware

Located in `server/src/middleware/`:

| Middleware | File | Signature | Description |
|-----------|------|-----------|-------------|
| `authGuard` | `auth.ts` | `(req, res, next)` | Extracts and verifies JWT from `Authorization: Bearer <token>` header. Attaches `req.user = { userId, username }`. Returns 401 if missing or invalid. |
| `validate(schema)` | `validate.ts` | Factory -> `(req, res, next)` | Takes a Zod schema. Parses `req.body`. Returns 400 with structured error details (`[{ field, message }]`) on validation failure. |
| `cache(ttlSeconds)` | `cache.ts` | Factory -> `async (req, res, next)` | Redis-backed response cache. Key: `cache:{req.originalUrl}`. Intercepts `res.json()` to cache successful (2xx) responses. Sets `X-Cache: HIT/MISS` and `Cache-Control` headers. No-ops if Redis is unavailable. |
| `requireDailyAction(type)` | `daily-action.ts` | Factory -> `async (req, res, next)` | Enforces one-major-action-per-day. Looks up existing `DailyAction` for today's tick date. Returns 429 with `{ error, actionType, resetsAt }` if already used. Attaches `req.character` and `req.dailyActionType`. |

### Service Layer

Located in `server/src/services/` -- **31 service modules** containing business logic separated from route handlers:

**Core systems:**
- `progression.ts` -- XP calculation, `checkLevelUp()`, stat/skill point awards, HP/MP growth
- `food-system.ts` -- `processSpoilage()`, `processAutoConsumption()`, `getHungerModifier()`, race-specific sustenance (Revenant soul essence, Forgeborn maintenance)
- `durability.ts` -- Item wear tracking
- `combat-presets.ts` -- Pre-configured combat behavior (retreat thresholds, stance, ability priorities)
- `action-lock-in.ts` -- Daily action commitment logic
- `profession-xp.ts` -- `addProfessionXP()`, tier advancement
- `item-stats.ts` -- Item stat calculations

**Race-specific services (7):**
- `changeling-service.ts` -- Disguise mechanics
- `faefolk-service.ts` -- Feywild interactions
- `forgeborn-service.ts` -- Maintenance kits, structural decay
- `merfolk-service.ts` -- Deep ocean mechanics
- `nightborne-service.ts` -- Underdark interactions
- `revenant-service.ts` -- Soul essence, soul fade
- `psion-perks.ts` -- Psion ability bonuses

**Racial mechanics (6):**
- `racial-bonus-calculator.ts` -- Composite racial bonus calculations
- `racial-combat-abilities.ts` -- 120 racial abilities across 20 races (passive modifiers, active abilities, death prevention, melee reflect, etc.)
- `racial-passive-tracker.ts` -- Persistent passive effect tracking
- `racial-profession-bonuses.ts` -- `getRacialGatheringBonus()`, `getRacialCraftQualityBonus()`, `getRacialMaterialReduction()`
- `racial-special-profession-mechanics.ts` -- Race-specific profession interactions
- `race-environment.ts` -- Biome/environment effects per race

**Combat & Travel:**
- `tick-combat-resolver.ts` -- `resolveNodePvE()`, `resolveNodePvP()` for daily tick combat
- `travel-resolver.ts` -- `resolveTravel()`, `checkNodeEncounter()`, `checkPvPEncounter()`
- `border-crossing.ts` -- Region border crossing mechanics

**Social/World:**
- `herald.ts` -- World announcement generation
- `quest-triggers.ts` -- `onResourceGather()` and other trigger checks
- `achievements.ts` -- `checkAchievements()` across categories
- `daily-report.ts` -- `createDailyReport()`, `compileReport()`
- `diplomacy-engine.ts` -- Treaty and war resolution
- `diplomacy-reputation.ts` -- Racial relation modifier tracking
- `law-effects.ts` -- Law effect application
- `regional-mechanics.ts` -- Region-specific game rules

### Engine Layer

`server/src/lib/` contains core infrastructure:

| Module | Purpose |
|--------|---------|
| `prisma.ts` | Singleton `PrismaClient` instance. Connection pool warmed on startup (`$connect()`). Logging: `['warn', 'error']` in dev, `['error']` in prod. |
| `redis.ts` | Singleton `ioredis` client connected to `REDIS_URL`. Retry: 5 attempts, exponential backoff (200ms base, 2s max). Exports `redis` (nullable) and `invalidateCache(pattern)`. Gracefully degrades if `REDIS_URL` is not set. |
| `combat-engine.ts` | Pure-function turn-based combat engine. No database calls. Imports dice utilities from `@shared/utils/dice` and combat types from `@shared/types/combat`. Integrates racial combat abilities from the service layer. Uses d20 attack rolls, damage rolls, critical hits, initiative, saving throws, and flee checks. |
| `game-day.ts` | Game day utilities. Epoch: `2026-01-01T00:00:00Z`. Exports: `getGameDay()` (sequential day number), `getNextTickTime()` (next 00:00 UTC), `getTodayTickDate()` (today at 00:00 UTC), `getTimeUntilReset()` (ms until next tick). |
| `alt-guard.ts` | Multi-character abuse prevention. `isSameAccount(charId1, charId2)` checks if two characters belong to the same `User` to block self-trading, self-combat, self-services, etc. |

---

## 4. Database Architecture

**Location:** `database/`

**Stack:** PostgreSQL 15, Prisma ORM 5

### Schema Overview

The Prisma schema (`database/prisma/schema.prisma`) defines **46 models** and **32 enums** organized into functional domains:

#### Core Identity (3 models)
- **`User`** -- Account with email (unique), username (unique), bcrypt password hash, role (default "player"), active character ID, last character switch day.
- **`Character`** -- Primary game entity. Belongs to a User. Contains race, class, specialization, level, XP, stats (JSON), position (current town + current node), health/mana, gold, combat presets (retreat thresholds, stance, ability priorities), hunger state, food preferences, sub-race data (dragon bloodline, beast clan, elemental type), unlocked abilities (JSON). **Central hub with 40+ relation fields.**
- **`CharacterAppearance`** -- Supports the Changeling race's disguise mechanic with apparent race and features.

#### Equipment & Inventory (3 models)
- **`CharacterEquipment`** -- 11 equip slots: HEAD, CHEST, HANDS, LEGS, FEET, MAIN_HAND, OFF_HAND, RING_1, RING_2, NECK, BACK. Unique constraint on `[characterId, slot]`.
- **`Inventory`** -- Character-to-item mapping with quantity and optional slot position.
- **`Item`** -- Individual item instance with `currentDurability`, `quality` (ItemRarity), `enchantments` (JSON), `daysRemaining` (perishables). References `ItemTemplate` for base stats and `Character` for crafter/owner.

#### Items & Templates (2 models)
- **`ItemTemplate`** -- Prototype definitions. Types: WEAPON, ARMOR, TOOL, CONSUMABLE, MATERIAL, ACCESSORY, QUEST, HOUSING. Rarity: POOR through LEGENDARY. Includes food metadata: `shelfLifeDays`, `isFood`, `foodBuff` (JSON), `isPerishable`, `isBeverage`.
- **`Resource`** -- Base gathering resources with type (ORE, WOOD, GRAIN, HERB, FISH, HIDE, STONE, FIBER, ANIMAL_PRODUCT, REAGENT, EXOTIC), biome, tier, and base gather time.

#### Professions & Crafting (5 models)
- **`PlayerProfession`** -- Character's professions with type, tier (APPRENTICE through GRANDMASTER), level (1-100), XP, specialization, active flag. Unique on `[characterId, professionType]`. Max 3 enforced at the application layer.
- **`ProfessionXP`** -- XP gain log entries per profession per character.
- **`Recipe`** -- Crafting recipes: profession type, tier requirement, ingredients (JSON array of `{ itemTemplateId, quantity }`), result template ID, craft time, XP reward.
- **`CraftingAction`** -- In-progress crafting with status (PENDING -> IN_PROGRESS -> COMPLETED/FAILED) and quality result.
- **`GatheringAction`** -- In-progress gathering tied to resource, town, and character.

#### World Geography (7 models)
- **`Region`** -- 21 regions with biome (14 biome types), level range. Related to towns, exclusive zones, quests, monsters, nodes.
- **`Town`** -- 68 towns with biome, population, mayor reference, features (JSON). Hub for characters, resources, buildings, market, elections, messages, NPCs.
- **`TownResource`** -- Per-town resource availability with `abundance` (0-100) and `respawnRate`. Unique on `[townId, resourceType]`.
- **`TravelRoute`** -- Town-to-town connections with distance, danger level, terrain. Unique on `[fromTownId, toTownId]`.
- **`Node`** -- Graph nodes for tick-based travel. 10 types: ROAD, WILDERNESS, MOUNTAIN_PASS, RIVER_CROSSING, BORDER_CROSSING, FOREST_TRAIL, SWAMP_PATH, UNDERGROUND_TUNNEL, COASTAL_PATH, TOWN_GATE. Has position within route, danger level, encounter chance.
- **`NodeConnection`** -- Directed graph edges between nodes with bidirectional flag. Unique on `[fromNodeId, toNodeId]`.
- **`RegionBorder`** -- Region adjacency (land/sea/mountain border types).

#### Racial Systems (4 models)
- **`RacialRelation`** -- 20x20 race diplomacy matrix (190 unique pairs). Statuses: ALLIED, FRIENDLY, NEUTRAL, DISTRUSTFUL, HOSTILE, BLOOD_FEUD. Modifier field for ongoing changes.
- **`RacialAbilityCooldown`** -- Per-character ability cooldowns with `lastUsed` and `cooldownEnds` timestamps.
- **`ChangelingDisguise`** -- Active disguise state for Changeling characters (disguised name and race).
- **`ForgebornMaintenance`** -- Maintenance tracking for Forgeborn characters (last maintenance date, condition, next required).

#### Economy & Trade (6 models)
- **`MarketListing`** -- Player marketplace listings with price, quantity, town, expiration.
- **`TradeTransaction`** -- Completed trade log with buyer, seller, item, price, town.
- **`PriceHistory`** -- Daily average prices per item template per town.
- **`Caravan`** -- Trade caravans with cargo (JSON), status, departure/arrival times.
- **`Building`** -- Player-owned buildings (23 types including houses, workshops, farms, mines). Level, storage (JSON for condition, tax delinquency tracking).
- **`BuildingConstruction`** -- In-progress construction with materials used and completion time.

#### Politics & Governance (10 models)
- **`Election`** -- Election system supporting MAYOR, RULER, GUILD_LEADER types with phases: NOMINATIONS -> CAMPAIGNING -> VOTING -> COMPLETED.
- **`ElectionVote`** -- One vote per voter per election. Unique on `[electionId, voterId]`.
- **`ElectionCandidate`** -- Candidate registrations with platform text.
- **`Impeachment`**, **`ImpeachmentVote`** -- Impeachment proceedings with vote tallies.
- **`Kingdom`** -- Kingdom entity with ruler, capital town, treasury.
- **`Law`** -- Proposed/active/expired/rejected laws with vote tallies and effects (JSON).
- **`TownTreasury`** -- Town gold balance and last tax collection timestamp.
- **`TownPolicy`** -- Per-town governance settings: tax rate, trade policy (JSON), building permits, sheriff.
- **`CouncilMember`** -- Appointed council members for kingdoms and towns with role.
- **`War`**, **`Treaty`** -- Inter-kingdom warfare (scores, status) and diplomacy (TRADE_AGREEMENT, NON_AGGRESSION_PACT, ALLIANCE with durations).

#### Social (4 models)
- **`Guild`** -- Guild entity with name, tag (unique), leader, level, treasury.
- **`GuildMember`** -- Membership with rank (member, officer, leader, etc.).
- **`Message`** -- Multi-channel messaging. 7 channels: GLOBAL, TOWN, GUILD, PARTY, WHISPER, TRADE, SYSTEM. Compound index on `[channelType, townId, timestamp]`.
- **`Notification`** -- Per-character notification queue with type, title, message, read status, data (JSON).
- **`Friend`** -- Friendship system: PENDING, ACCEPTED, DECLINED, BLOCKED.

#### Combat (4 models)
- **`CombatSession`** -- Combat instance with type (PVE, PVP, DUEL, ARENA, WAR, SPAR), status, combat log (JSON), attacker/defender params (JSON).
- **`CombatLog`** -- Per-round combat actions with actor, action, result (JSON).
- **`CombatParticipant`** -- Combatants with team, initiative, current HP.
- **`Monster`** -- PvE enemy definitions with stats (JSON), loot table (JSON), region, biome, level.

#### Quests & Progression (5 models)
- **`Quest`** -- Quest definitions with 6 types (MAIN, TOWN, DAILY, GUILD, BOUNTY, RACIAL), objectives (JSON), rewards (JSON), prerequisites, repeatability.
- **`QuestProgress`** -- Per-character quest state with progress (JSON) and timestamps.
- **`Ability`** -- Skill tree abilities with class, specialization, tier, effects (JSON), cooldown, mana cost, prerequisites.
- **`CharacterAbility`** -- Unlocked abilities per character.
- **`Achievement`**, **`PlayerAchievement`** -- Achievement definitions and per-character unlock tracking.

#### Daily Tick System (2 models)
- **`DailyAction`** -- One major action per character per game day. 11 types: GATHER, CRAFT, TRAVEL, GUARD, AMBUSH, ENLIST, PROPOSE_LAW, REST, SERVICE, COMBAT_PVE, COMBAT_PVP. Statuses: LOCKED_IN -> PROCESSING -> COMPLETED/FAILED. Unique on `[characterId, tickDate]`.
- **`DailyReport`** -- Compiled end-of-day report per character with food consumed, action result, gold change, XP earned, combat logs, quest progress, notifications, world events.

#### NPCs (1 model)
- **`Npc`** -- Town NPCs with role (QUEST_GIVER, MERCHANT, TRAINER, GUARD), dialog (JSON), and quest ID references.

#### World Events & Petitions (3 models)
- **`WorldEvent`** -- Server-generated world events (daily summaries, state reports, announcements).
- **`Petition`**, **`PetitionSignature`** -- Player petition system with signature goals and expiration.

#### Service Professions (3 models)
- **`ServiceAction`** -- Service profession interactions with provider, client, profession type, action type, price.
- **`Loan`** -- Banker loans: principal, interest rate, total owed, term, status (ACTIVE, REPAID, DEFAULTED, GARNISHED).
- **`ServiceReputation`** -- Per-character reputation per service profession.

### Key Model Relationships

```
User 1---* Character
Character *---1 Town (currentTown)
Character *---1 Node (currentNode)
Character 1---* Inventory ---* Item ---1 ItemTemplate
Character 1---* CharacterEquipment ---1 Item
Character 1---* PlayerProfession
Region 1---* Town
Town 1---* TownResource
Town 1---* Building ---* BuildingConstruction
Town 1---1 TownTreasury
Town 1---1 TownPolicy
Town 1---* Election ---* ElectionCandidate
Town 1---* MarketListing
TravelRoute 1---* Node ---* NodeConnection
Guild 1---* GuildMember ---1 Character
Character *---* Quest (via QuestProgress)
Character *---* Ability (via CharacterAbility)
Kingdom 1---* Law
Kingdom 1---* CouncilMember
Kingdom *---* Kingdom (via War, Treaty)
```

### Migration Strategy

Prisma Migrate with a development-centric workflow:

| Command | Script | Description |
|---------|--------|-------------|
| `npm run db:migrate` | `prisma migrate dev` | Create and apply a new migration in dev |
| `npm run db:seed` | `tsx seeds/index.ts` | Run all seed scripts |
| `npm run db:studio` | `prisma studio` | Open Prisma Studio (GUI database browser) |
| `npm run db:reset` | `prisma migrate reset` | Drop all tables, re-apply migrations, re-seed (destructive) |

Production: `prisma migrate deploy` (applied in Docker build or CI pipeline).

Current migrations (11 as of Phase 1):
```
20260207204007_init
20260208120000_add_friends
20260208182432_add_message_is_read
20260208195206_add_class_abilities_progression
20260208195306_add_npcs_and_quest_fields
20260208210000_add_performance_indexes
20260209000000_balance_patch_renames
20260209121626_extend_profession_system
20260209144137_race_schema_v2
20260210000000_six_systems_foundation
```

### Seeding Strategy

The master seed script (`database/seeds/index.ts`) runs **12 seed modules** in dependency order:

| Order | Seed Module | Content |
|-------|-------------|---------|
| 1 | `seedWorld` | 21 regions, 68 towns, travel routes, exclusive zones, region borders, kingdoms |
| 2 | `seedResources` | Base gathering resource definitions |
| 3 | `seedRecipes` | Crafting recipes and item templates (weapons) |
| 4 | `seedMonsters` | PvE monster definitions |
| 5 | `seedQuests` | Quest templates and NPC quest givers |
| 6 | `seedTools` | 36 tool templates (6 tool types x 6 material tiers) |
| 7 | `seedTownResources` | Biome-to-resource assignments per town |
| 8 | `seedConsumableRecipes` | Potions, food, drinks, scrolls |
| 9 | `seedArmorRecipes` | Metal, leather, cloth armor (75 recipes) |
| 10 | `seedDiplomacy` | 190 racial relation pairs (20x20 matrix) |
| 11 | `seedNodes` | Travel node graph (converted from TravelRoutes into node chains) |
| 12 | `seedFoodItems` | 32 food and beverage item templates |

Run with: `npm run db:seed`

---

## 5. Shared Package

**Location:** `shared/`

**Purpose:** Single source of truth for types, constants, game data, and utility functions consumed by both `client` and `server`.

### Package Configuration

```json
{
  "name": "@realm-of-crowns/shared",
  "main": "src/index.ts",
  "dependencies": { "zod": "^3.23.0" }
}
```

The package is consumed directly via TypeScript source in development. The `main` field points to `src/index.ts`. In production, `shared` is compiled first (`npm run build --workspace=shared`), and downstream packages reference the compiled output.

### Structure

```
shared/src/
  index.ts                -- Re-exports from types/ and constants/
  types/
    index.ts              -- Re-exports combat.ts, psion-perks.ts
    combat.ts             -- Combat state types: Combatant, CombatState, CombatAction,
                             TurnResult, AttackResult, CastResult, DefendResult,
                             ItemResult, FleeResult, StatusEffect, WeaponInfo,
                             SpellInfo, DeathPenalty, getModifier()
    psion-perks.ts        -- Psion ability type definitions
    race.ts               -- Race-related type definitions
  constants/
    index.ts              -- (Placeholder, populated as features grow)
  data/
    achievements.ts       -- Achievement definitions
    buildings/            -- Building type data, costs, bonuses
    caravans/             -- Caravan configuration
    items/                -- Item template data
    professions/          -- 28 profession definitions (categories, stats, tiers)
    progression/          -- XP curves, level requirements, stat growth
    quests/               -- Quest template data
    races/                -- 20 race definitions: stats, abilities (6 per race),
                             sub-races (Dragonborn bloodlines, Beastfolk clans,
                             Genasi elements), racial relations matrix
    recipes/              -- Recipe definitions
    resources/            -- Resource type data, biome mappings
    skills/               -- Skill tree data: 6 classes, 18 specializations
    tools/                -- Tool definitions
    world/                -- Region, town, route, biome definitions
  utils/
    dice.ts               -- D&D-style dice rolling:
                             roll(sides), rollMultiple(count, sides),
                             rollWithModifier(sides, mod), advantage(),
                             disadvantage(), rollAbilityScore(),
                             attackRoll, damageRoll, criticalDamageRoll,
                             initiativeRoll, savingThrow, fleeCheck,
                             qualityRoll (crafting quality d20)
    bounded-accuracy.ts   -- getProficiencyBonus(level), getModifier(stat)
```

### How Client and Server Import

**Client** -- Vite path aliases in `client/vite.config.ts`:
```typescript
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, '../shared/src'),
  }
}
```

**Server** -- TypeScript path aliases via `tsconfig-paths` (runtime) and `tsc-alias` (build):
```typescript
import { qualityRoll } from '@shared/utils/dice';
import { getProfessionByType } from '@shared/data/professions';
import { getProficiencyBonus, getModifier } from '@shared/utils/bounded-accuracy';
```

### Design Principle

All static game data lives in `shared/src/data/` as typed TypeScript constants. Neither `server` nor `client` should hardcode game values. This ensures:
- A single source of truth for profession definitions, race stats, XP curves, resource types, recipes, and more.
- Type safety across the entire stack.
- Easy game balance adjustments without code changes in multiple places.

---

## 6. Real-Time System

**Location:** `server/src/socket/`

### Architecture

Socket.io runs on the same HTTP server as Express (port 4000). The system is organized into four files:

### `middleware.ts` -- Authentication and Rate Limiting

**`socketAuthMiddleware(socket, next)`:**
- Extracts JWT from `socket.handshake.auth.token`.
- Verifies with `jwt.verify()` using `JWT_SECRET`.
- Attaches `socket.data.userId` and `socket.data.username`.
- Rejects unauthenticated connections with `Error('Authentication required')`.

**`socketRateLimitMiddleware(socket, next)`:**
- Per-socket rate limit: 30 messages per 60-second window.
- In-memory `Map<socketId, { count, resetAt }>`.
- Rejects with `Error('Rate limit exceeded')`.

**`cleanupRateLimit(socketId)`:**
- Removes entries on disconnect to prevent memory leaks.

### `presence.ts` -- Online Status Tracking

Dual-layer presence tracking (in-memory + Redis fallback):

- **In-memory:** `Map<characterId, PresenceEntry>` for fast local lookups.
- **Redis:** Hash at key `presence:online` with character ID fields for cross-process queries.

`PresenceEntry` shape:
```typescript
{
  userId: string;
  characterId: string;
  characterName: string;
  currentTownId: string | null;
  socketId: string;
  connectedAt: Date;
}
```

**On connect:**
1. Look up the user's character from the database.
2. Register in both in-memory map and Redis hash.
3. Auto-join `town:{currentTownId}` room (if in a town).
4. Auto-join `user:{characterId}` room (personal notifications).
5. Broadcast `presence:online` to all online friends.
6. Send `presence:friends-online` list to the connecting user.

**On disconnect:**
1. Remove from in-memory map and Redis hash.
2. Broadcast `presence:offline` to all online friends.
3. Clean up rate limit entries.

**Room management events:** `join:town`, `leave:town`, `join:kingdom`, `leave:kingdom`, `join:guild`, `leave:guild`.

**Public API exports:** `getOnlineUsers(townId?)`, `isOnline(characterId)`, `getPresenceEntry(characterId)`, `updatePresenceTown(characterId, townId)`.

### `chat-handlers.ts` -- Real-Time Chat

Handles `chat:send` events with full validation:

- Content length cap: 2000 characters.
- Channel type whitelist: GLOBAL, TOWN, GUILD, PARTY, WHISPER, TRADE, SYSTEM.
- Channel-specific requirements:
  - WHISPER: requires `recipientId`, cannot whisper self.
  - GUILD: requires `guildId`, membership verified via database.
  - TOWN: requires character to be in a town.

Channel routing:

| Channel | Routing |
|---------|---------|
| WHISPER | Direct to recipient's sockets + echo to sender |
| TOWN | Broadcast to `town:{townId}` room |
| GUILD | Broadcast to `guild:{guildId}` room |
| GLOBAL, TRADE, SYSTEM | Broadcast to all connected sockets |
| PARTY | Echo to sender (party system not yet fully implemented) |

All messages persisted to the `Message` database table via Prisma.

`chat:identify` event: allows setting `socket.data.characterId` and `socket.data.characterName` post-connection.

### `events.ts` -- Event Broadcaster

Singleton pattern: `initEventBroadcaster(io)` called at startup stores the `Server` reference. All exported emit functions use `getIO()` to access it.

**Event catalog (30+ events):**

| Function | Target | Event Name |
|----------|--------|------------|
| `emitPlayerEnterTown` | `town:{townId}` | `player:enter-town` |
| `emitPlayerLeaveTown` | `town:{townId}` | `player:leave-town` |
| `emitCombatResult` | `user:{charId}` (each) | `combat:result` |
| `emitTradeCompleted` | `user:{sellerId}` | `trade:completed` |
| `emitFriendRequest` | `user:{recipientId}` | `friend:request` |
| `emitFriendAccepted` | `user:{requesterId}` | `friend:accepted` |
| `emitLevelUp` | `user:{charId}` | `player:level-up` |
| `emitAchievementUnlocked` | `user:{charId}` | `achievement:unlocked` |
| `emitNotification` | `user:{charId}` | `notification:new` |
| `emitToolBroken` | `user:{charId}` | `tool:broken` |
| `emitGatheringReady` | `user:{charId}` | `gathering:ready` |
| `emitGatheringDepleted` | `user:{charId}` | `gathering:depleted` |
| `emitCraftingReady` | `user:{charId}` | `crafting:ready` |
| `emitItemLowDurability` | `user:{charId}` | `item:lowDurability` |
| `emitItemBroken` | `user:{charId}` | `item:broken` |
| `emitBuildingConstructed` | `user:{charId}` | `building:constructed` |
| `emitBuildingTaxDue` | `user:{charId}` | `building:taxDue` |
| `emitBuildingDelinquent` | `user:{charId}` | `building:delinquent` |
| `emitBuildingSeized` | `user:{charId}` | `building:seized` |
| `emitBuildingDamaged` | `user:{charId}` | `building:damaged` |
| `emitBuildingConditionLow` | `user:{charId}` | `building:conditionLow` |
| `emitWorldEvent` | global | `world-event:new` |
| `emitStateReport` | global | `world-event:state-report` |
| `emitHeraldAnnouncement` | global | `herald:announcement` |
| `emitWarBulletinUpdate` | global | `war:bulletin-update` |
| `emitActionLockedIn` | `user:{charId}` | `action:locked-in` |
| `emitActionCancelled` | `user:{charId}` | `action:cancelled` |
| `emitDailyReportReady` | `user:{charId}` | `daily-report:ready` |
| `emitTickComplete` | global | `tick:complete` |

### Room Strategy

| Room Pattern | Joined When | Purpose |
|-------------|-------------|---------|
| `user:{characterId}` | On connect (always) | Personal notifications, direct messages, combat results, achievement alerts |
| `town:{townId}` | On connect (if in town) or `join:town` | Town chat, player enter/leave, town-scoped events |
| `guild:{guildId}` | On `join:guild` | Guild chat, member join/leave events |
| `kingdom:{kingdomId}` | On `join:kingdom` | Kingdom governance events (law passed, war declared, etc.) |

---

## 7. Cron Job / Daily Tick System

**Location:** `server/src/jobs/`

### Architecture Evolution

The system originally used individual `node-cron` jobs for each game mechanic (election lifecycle, tax collection, resource regeneration, etc.). These have been consolidated into a single **daily tick processor** (`daily-tick.ts`) that runs once per game day at 00:00 UTC, processing all game mechanics in a strict multi-step pipeline.

### Job Registry

`server/src/jobs/index.ts` registers:

1. **Daily Tick** -- `cron.schedule('0 0 * * *', processDailyTick)` -- The master processor.
2. **Forgeborn Maintenance** -- Standalone race-specific job (runs independently).

Legacy individual cron jobs are documented in the registry as comments, mapping each to its replacement step in the daily tick.

Note: `server/src/index.ts` still starts legacy individual cron jobs directly (election lifecycle, tax collection, etc.) for backward compatibility during transition. These will eventually be fully replaced by the daily tick.

### Daily Tick Pipeline (15 Steps)

Each step runs in isolation via `runStep(name, stepNum, fn)` with error containment -- failures in one step are logged but do not block subsequent steps. Characters are processed in batches of `BATCH_SIZE = 50` for memory efficiency.

| Step | Name | Description |
|------|------|-------------|
| 1 | Food Spoilage & Consumption | Global perishable item spoilage. Per-character auto-consumption. Race-specific sustenance: Revenant soul essence (soul fade stages 0-3), Forgeborn maintenance kits (structural decay stages 0-3). Populates hunger state cache and food buff cache for downstream steps. |
| 2 | Travel Movement | Resolve all TRAVEL daily actions via `resolveTravel()`. Move characters along the node graph to their target node. |
| 3 | Node Encounters & Combat | Group characters by node. Detect PvP encounters (hostile characters on same node via racial relations). Detect PvE encounters (random roll against node `encounterChance`). Resolve via `resolveNodePvP()` and `resolveNodePvE()`. Track characters who already fought to avoid double-processing. |
| 4 | Work Actions | **Gathering:** Validate resource/town, check profession, apply hunger modifier, calculate yield (d20 + proficiency + stat mod + abundance + racial bonus + tool bonus + food buff), create items in inventory, deplete town resource, award profession XP and character XP, degrade tools. **Crafting:** Validate recipe/profession/workshop, check ingredients (with racial material reduction), calculate quality (d20 + proficiency + stat + tool + workshop + racial + tier + ingredient quality), consume ingredients, create item, award XP, degrade tools. |
| 5 | Service Professions | Innkeeper income from resting characters in their town (5 gold per resting character, split among innkeepers). |
| 6 | Governance Processing | Tally law votes, activate or reject proposed laws past their expiry. Expire active laws past their date. |
| 7 | Economy Cycle | **Tax collection** from recent marketplace trades. **Property taxes** on buildings (delinquency tracking, 7-day grace period, mayor seizure). **Building degradation** (1 condition per day). **Resource regeneration** (restore depleted town resources by respawn rate). **Caravan arrivals** (notify owners). |
| 8 | Elections & Diplomacy | Auto-create MAYOR elections for towns without one. Transition NOMINATIONS -> VOTING (after 3 days). Transition VOTING -> COMPLETED (after 3+3 = 6 days from start). Tally votes, appoint winners. Resolve expired impeachments. Expire treaties. |
| 9 | Rest/Idle Processing | Characters with REST action (or no action): heal 15% max HP if FED, set `wellRested = true`. Hungry characters get no recovery and `wellRested = false`. |
| 10 | Quest & Achievement Checks | Check combat kill counts for achievements. Check gathering completions for quest triggers via `onResourceGather()`. |
| 11 | World Events & Notifications | Generate a DAILY_SUMMARY world event if significant activity occurred (combats, gatherers, travelers). Emit to all characters. |
| 12 | Results Delivery | Compile per-character daily reports via `compileReport()`. Persist to `DailyReport` table. Emit `daily-report:ready` events. Mark all LOCKED_IN DailyActions as COMPLETED. Emit global `tick:complete`. |
| 13 | Service NPC Income | Process NPC-based service profession income generation. |
| 14 | Loan Default Processing | Check loan due dates via `processLoans()`. Handle defaults and garnishments. |
| 15 | Service Reputation Decay | Decay inactive service profession reputations via `processReputationDecay()`. |

### Legacy Cron Jobs

These are still started from `server/src/index.ts` and run on their own schedules:

| Job | File | Schedule | Daily Tick Replacement |
|-----|------|----------|----------------------|
| Election Lifecycle | `election-lifecycle.ts` | Every 5 min | Step 8 |
| Tax Collection | `tax-collection.ts` | Every hour | Step 7 |
| Law Expiration | `law-expiration.ts` | Varies | Step 6 |
| Resource Regeneration | `resource-regeneration.ts` | Varies | Step 7 |
| Gathering Autocomplete | `gathering-autocomplete.ts` | Varies | Step 4 |
| Construction Complete | `construction-complete.ts` | Varies | Notification-based |
| Property Tax | `property-tax.ts` | Varies | Step 7 |
| Building Maintenance | `building-maintenance.ts` | Varies | Step 7 |
| Caravan Events | `caravan-events.ts` | Varies | Step 7 |
| State of Aethermere | `state-of-aethermere.ts` | Varies | Step 11 |
| Seer Premonition | `seer-premonition.ts` | Varies | Standalone |

### Game Day Concept

The game operates on a day-based action economy. `server/src/lib/game-day.ts` provides:

- **Epoch:** January 1, 2026, 00:00 UTC.
- **`getGameDay()`:** Returns sequential day number since epoch (integer).
- **`getTodayTickDate()`:** Returns today at 00:00 UTC (used for `DailyAction.tickDate` lookups).
- **`getNextTickTime()`:** Returns the next 00:00 UTC boundary.
- **`getTimeUntilReset()`:** Milliseconds until the next daily tick.

Each character gets one major action per game day (GATHER, CRAFT, TRAVEL, COMBAT_PVE, COMBAT_PVP, REST, etc.), locked in via the `requireDailyAction` middleware and processed during the daily tick at midnight UTC.

### Manual Trigger

`triggerManualTick()` is exported from `daily-tick.ts` and exposed via the `/api/admin` route for admin-initiated tick processing.

---

## 8. Caching Strategy

### Redis Configuration

`server/src/lib/redis.ts` creates a singleton `ioredis` client:

```typescript
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;  // stop after 5 attempts
    return Math.min(times * 200, 2000);  // 200ms, 400ms, ..., 2000ms max
  },
});
```

- Connects to `REDIS_URL` (default `redis://redis:6379` in Docker, `redis://localhost:6379` in dev).
- Graceful degradation: if `REDIS_URL` is not set, `redis` is `null` and all cache/presence operations are no-ops.
- Event listeners for `connect`, `error`, `reconnecting` with console logging.

**`invalidateCache(pattern: string)`:** Uses `redis.keys(pattern)` + `redis.del(...keys)` for pattern-based invalidation. Called after write operations to keep caches fresh.

### Cache Middleware

`server/src/middleware/cache.ts` provides a `cache(ttlSeconds)` factory:

```typescript
// Usage in a route:
router.get('/towns', cache(300), getTownsHandler);
```

- **Key format:** `cache:{req.originalUrl}` (includes path and query string).
- **Cache hit:** Returns cached JSON immediately. Sets `X-Cache: HIT` header and `Cache-Control: public, max-age={ttl}`.
- **Cache miss:** Intercepts `res.json()`. Only caches responses with status 200-299. Writes to Redis with `SETEX` (key, ttl, body). Sets `X-Cache: MISS`.
- **Error resilience:** Redis read/write errors are logged but never affect the response.
- **No-op:** If `redis` is null, calls `next()` immediately.

### Redis Usage Patterns

| Use Case | Key Pattern | TTL | Description |
|----------|-------------|-----|-------------|
| HTTP response cache | `cache:/api/*` | Route-specific (e.g., 300s for towns) | Caches GET responses for relatively static data (world, towns, regions, races) |
| Presence tracking | `presence:online` (hash) | None (manual cleanup on disconnect) | Hash of `characterId` -> `PresenceEntry` JSON. Updated on connect/disconnect/town change. |
| Cache invalidation | Pattern-based | N/A | `invalidateCache('cache:/api/towns/*')` after town data changes |

---

## 9. Security

### Authentication

- **Password hashing:** bcryptjs with cost factor 12 (`bcrypt.hash(password, 12)`).
- **JWT tokens:** Signed with `JWT_SECRET` (environment variable, must be set). Payload: `{ userId, username }`. Default expiration: 7 days (`JWT_EXPIRES_IN`).
- **Token storage:** Client stores JWT in `localStorage` as `roc_token`.
- **Token transmission:**
  - HTTP: `Authorization: Bearer <token>` header (attached by Axios interceptor).
  - WebSocket: `socket.handshake.auth.token` (attached on connection).
- **Session validation:** `GET /api/auth/me` verifies the token and returns user data. Called on page load to restore sessions.

### Authorization

- **`authGuard` middleware:** Required on every protected API endpoint. Verifies JWT, returns 401 if missing or invalid.
- **`socketAuthMiddleware`:** Verifies JWT before allowing Socket.io connections. Rejects with error.
- **Resource-level authorization:** Route handlers verify character ownership, guild membership, town residency, mayoral authority, etc. at the application layer.
- **Alt-guard:** `isSameAccount()` in `server/src/lib/alt-guard.ts` prevents multi-character abuse -- detects if two character IDs belong to the same user account and blocks self-trading, self-combat, and self-service interactions.
- **Daily action enforcement:** `requireDailyAction` middleware prevents action spamming by limiting characters to one major action per game day.

### Rate Limiting

| Layer | Mechanism | Limit | Window |
|-------|----------|-------|--------|
| HTTP API | `express-rate-limit` | 100 requests | 15 minutes per IP |
| WebSocket chat | In-memory Map | 30 messages | 60 seconds per socket |

### Input Validation

- **Zod schemas** on all POST/PUT endpoints via `validate(schema)` middleware. Returns structured 400 errors:
  ```json
  {
    "error": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email format" }]
  }
  ```
- **Registration validation:** Email format, username 3-20 chars alphanumeric only, password min 8 chars.
- **Chat validation:** Content length cap (2000 chars), channel type whitelist, channel-specific checks.
- **Type coercion:** Prisma ORM handles SQL injection prevention through parameterized queries.

### HTTP Security Headers

**Helmet.js** (applied in `app.ts`) sets:
- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options: nosniff
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- And other security-related headers

**Nginx** (production, `client/nginx.conf`) adds:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### CORS

Configured in both Express and Socket.io:
```javascript
cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
})
```

### Error Information Exposure

- **Development (`NODE_ENV=development`):** Error handler returns the actual error message.
- **Production:** Error handler returns generic `"Internal server error"` -- no stack traces or internal details leaked.

---

## 10. Development Workflow

### Prerequisites

- Node.js 20+
- npm 9+
- Docker and Docker Compose (for PostgreSQL and Redis)

### First-Time Setup

```bash
# Automated setup (checks tools, installs deps, starts Docker, runs migrations + seed)
bash scripts/setup.sh

# Or manually:
npm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
npx prisma migrate deploy --schema=database/prisma/schema.prisma
npm run db:seed
```

The setup script (`scripts/setup.sh`):
1. Verifies `node`, `npm`, and `docker` are installed.
2. Copies `.env.example` to `.env` if not present.
3. Runs `npm install`.
4. Starts PostgreSQL and Redis containers.
5. Waits for PostgreSQL to be ready.
6. Runs migrations and seeds.

### Starting Development Servers

```bash
npm run dev
```

This uses `concurrently` to run:
- `npm run dev:client` -- Vite dev server on port 3000 (with HMR, API proxy to port 4000)
- `npm run dev:server` -- `tsx watch src/index.ts` (TypeScript execution with automatic file-watching restart)

**URLs:**
- Client: `http://localhost:3000`
- Server API: `http://localhost:4000/api`
- Health check: `http://localhost:4000/api/health`

### Database Operations

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Create and apply a new Prisma migration |
| `npm run db:seed` | Run all seed scripts |
| `npm run db:studio` | Open Prisma Studio (GUI database browser on port 5555) |
| `npm run db:reset` | Drop all tables, re-apply all migrations, re-seed (destructive, dev only) |

### Build

```bash
npm run build
```

Build order (enforced by the script):
1. `shared` -- TypeScript compilation (`tsc`)
2. `client` -- TypeScript check + Vite production build
3. `server` -- TypeScript compilation (`tsc -p tsconfig.build.json`) + path alias resolution (`tsc-alias`)

### Testing

```bash
npm run test                    # Run server tests (Jest, sequential, force exit)
npm run test:verbose            # Same with verbose output
```

Test suite in `server/src/__tests__/`:

| Test File | Coverage |
|-----------|---------|
| `auth.test.ts` | Registration, login, session validation |
| `characters.test.ts` | Character creation, management |
| `combat.test.ts` | PvE and PvP combat |
| `economy.test.ts` | Marketplace, trading |
| `politics.test.ts` | Elections, governance |
| `progression.test.ts` | Leveling, XP, skills |
| `quests.test.ts` | Quest system |
| `social.test.ts` | Friends, guilds, messaging |

Test setup: `jest.setup.ts` and `setup.ts` configure the test environment.

### TypeScript Configuration

Root `tsconfig.json` sets base compiler options:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

Each workspace extends or overrides. The server uses `tsconfig-paths` for `@shared` alias resolution at runtime and `tsc-alias` for alias resolution at build time.

### Linting and Type Checking

```bash
npm run lint                    # ESLint across all .ts/.tsx files
npm run typecheck               # TypeScript compiler --noEmit check
```

### Adding a New Feature (Checklist)

1. **Schema:** Edit `database/prisma/schema.prisma`. Run `npm run db:migrate`.
2. **Shared types/data:** Add to `shared/src/types/` or `shared/src/data/`. Never hardcode game values elsewhere.
3. **Server route:** Create `server/src/routes/<feature>.ts`. Register in `server/src/routes/index.ts`.
4. **Server service:** Create `server/src/services/<feature>.ts` for business logic.
5. **Validation:** Define Zod schemas in the route file. Use `validate(schema)` middleware.
6. **Real-time events:** Add emit functions to `server/src/socket/events.ts`.
7. **Client page:** Create `client/src/pages/<Feature>Page.tsx`. Add lazy-loaded route to `App.tsx`.
8. **Client components:** Create in `client/src/components/<feature>/`.
9. **Client hooks:** Add real-time event listeners in `client/src/hooks/`.
10. **Seed data:** Add to `database/seeds/`. Register in `database/seeds/index.ts`.
11. **Tests:** Add to `server/src/__tests__/`.

### File Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Routes | `kebab-case.ts` | `combat-pve.ts` |
| Services | `kebab-case.ts` | `food-system.ts` |
| Middleware | `kebab-case.ts` | `daily-action.ts` |
| React components | `PascalCase.tsx` | `ChatPanel.tsx` |
| React pages | `PascalCase.tsx` + `Page` suffix | `TownPage.tsx` |
| React hooks | `camelCase.ts` + `use` prefix | `usePoliticalEvents.ts` |
| Shared data | `kebab-case.ts` or directories | `shared/src/data/races/` |
| Seeds | `kebab-case.ts` | `town-resources.ts` |
| Tests | `kebab-case.test.ts` | `auth.test.ts` |

---

## 11. Deployment

### Container Architecture

The application deploys as a four-container system via Docker Compose:

```
                    Port 80
                      |
           +----------v-----------+
           |    roc-client         |
           |    (Nginx:alpine)     |
           |    Static files +     |
           |    Reverse proxy      |
           +---+-------------+----+
               |             |
          /api/*         /socket.io/*
               |             |
           +---v-------------v----+
           |    roc-server         |
           |    (Node.js 20)       |
           |    Express + Socket.io|
           |    Port 4000          |
           +---+-------------+----+
               |             |
           +---v---+     +---v------+
           |roc-    |     |roc-      |
           |postgres|     |redis     |
           |:5432   |     |:6379     |
           +--------+     +---------+
```

### Server Dockerfile (`server/Dockerfile`)

Multi-stage build optimized for production:

**Stage 1 -- Builder (`node:20-alpine`):**
1. Install `openssl` (required by Prisma).
2. Copy all workspace `package.json` files and `package-lock.json`.
3. `npm ci` -- Full dependency install including devDependencies.
4. Copy source code for `shared/`, `database/`, `server/`, `client/`.
5. `npx prisma generate` -- Generate Prisma client.
6. Build: `shared` -> `server` -> `client` (Vite).

**Stage 2 -- Production (`node:20-alpine`):**
1. Install `openssl`.
2. Copy workspace `package.json` files.
3. `npm ci --omit=dev` -- Production dependencies only (server, shared, database workspaces).
4. Copy Prisma schema and regenerate client for production.
5. Copy built artifacts: `shared/dist/`, `server/dist/`, `client/dist/`.
6. Copy `tsconfig.production.json` for `tsconfig-paths` runtime path resolution.
7. Copy seed files for in-container seeding support.
8. Set `NODE_ENV=production`, expose port 4000.
9. Run: `node -r tsconfig-paths/register dist/index.js`.

The server serves the client's static files in production mode (SPA fallback in `app.ts`), so the separate Nginx container is optional if you want a single-server deployment.

### Client Dockerfile (`client/Dockerfile`)

Multi-stage build:

**Stage 1 -- Build (`node:20-alpine`):**
1. Install dependencies for `client` and `shared` workspaces.
2. Build `shared`, then `client` (`vite build`).

**Stage 2 -- Serve (`nginx:alpine`):**
1. Copy `client/dist/` to `/usr/share/nginx/html`.
2. Copy `client/nginx.conf` as the Nginx server configuration.
3. Expose port 80.

### Nginx Configuration (`client/nginx.conf`)

- **Gzip compression:** Enabled for text, CSS, JS, JSON, SVG (level 6, min 256 bytes).
- **Security headers:** X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy.
- **Reverse proxy:** `/api/*` -> `http://server:4000` (standard HTTP proxy).
- **WebSocket proxy:** `/socket.io/*` -> `http://server:4000` with `Upgrade` and `Connection` headers for WebSocket support.
- **Static asset caching:** `/assets/*` cached with `expires 1y` and `Cache-Control: public, immutable` (Vite content-hashes filenames).
- **SPA fallback:** `try_files $uri $uri/ /index.html` for all other routes.

### Docker Compose (`docker-compose.yml`)

| Service | Image | Port | Volumes | Health Check | Dependencies |
|---------|-------|------|---------|-------------|-------------|
| `postgres` | `postgres:15-alpine` | 5432 | `postgres_data` | `pg_isready` every 5s | None |
| `redis` | `redis:7-alpine` | 6379 | `redis_data` | `redis-cli ping` every 5s | None |
| `server` | Built from `server/Dockerfile` | 4000 | None | None | postgres (healthy), redis (healthy) |
| `client` | Built from `client/Dockerfile` | 80 | None | None | server |

Named volumes `postgres_data` and `redis_data` provide data persistence across container restarts.

### Development Docker Override (`docker-compose.dev.yml`)

When used with the base compose file:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

- `server` and `client` containers are gated behind the `full` profile (not started by default).
- Only `postgres` and `redis` containers start.
- The application runs locally with `npm run dev` for hot-reload development.

### Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | `postgresql://roc_user:roc_password@postgres:5432/realm_of_crowns` | Yes | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | No | Redis connection string (graceful degradation if absent) |
| `JWT_SECRET` | `change-this-to-a-random-secret-in-production` | Yes | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | `7d` | No | JWT token expiration duration |
| `PORT` | `4000` | No | Server listening port |
| `NODE_ENV` | `development` | No | Environment mode (`development` or `production`) |
| `CLIENT_URL` | `http://localhost:3000` | No | Allowed CORS origin |

### Production Deployment Commands

```bash
# Build all containers
docker compose build

# Start the full stack
docker compose up -d

# Run migrations inside the running server container
docker compose exec server npx prisma migrate deploy --schema=../database/prisma/schema.prisma

# Seed the database
docker compose exec server npm run db:seed --workspace=database

# View logs
docker compose logs -f server
```

### Target Infrastructure

The project is designed for deployment to container orchestration platforms such as Azure Container Apps with:
- Azure Container Registry for image storage
- Azure Database for PostgreSQL (managed)
- Azure Cache for Redis (managed)
- Or equivalent services on any cloud provider supporting Docker containers
