# Realm of Crowns — Complete Project Reference
## Technical Architecture & Game Systems Documentation

> **Generated**: 2026-02-09 | **Version**: 2.0 (Post Phase 2B) | **Audited from source code**
>
> This document serves two audiences: **Developers** (architecture, endpoints, data flow) and **Players** (game guide, tips, system explanations). Each gameplay section includes both perspectives.

---

## TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture) — Stack, startup, middleware, dependencies
3. [Database & Data Model](#b-database-schema) — 47 models, 24 enums, indexes
4. [Character System](#a-character-system) — 20 races, 6 classes, 120 racial abilities
5. [The World of Aethermere](#b-world--travel) — 21 regions, 68+ towns, travel
6. [Economy & Professions](#c-economy--professions) — 29 professions, marketplace, quality system
7. [Combat System](#d-combat-system) — PvE, PvP, status effects, death penalties
8. [Political System & Governance](#a-political-system) — Elections, laws, diplomacy, war
9. [Social Systems](#b-social-systems) — Guilds, messaging, friends, petitions
10. [Quest & Progression System](#c-quest--progression-system) — 34 quests, 26 achievements, leveling
11. [Real-Time Infrastructure](#section-6-socketio-realtime-layer) — Socket.io, 20 events, presence
12. [Background Jobs & Automation](#section-7-background-jobs-11-cron-jobs) — 11 cron jobs
13. [Cross-System Integration Map](#section-8-cross-system-integration-map)
14. [API Surface Summary](#section-9-api-surface-summary) — 207 endpoints across 33 routes
15. [Caching & State](#c-caching--state) — Redis, 11 cached endpoints
16. [Security & Auth](#d-security--auth) — JWT, rate limiting, validation
17. [Missing/Incomplete Items](#e-missingincomplete-items) — Quirks, stubs, security notes

---

# 1. PROJECT OVERVIEW

## What is Realm of Crowns?

Realm of Crowns is a browser-based fantasy MMORPG where players forge their destiny in the world of Aethermere. Choose from 20 distinct races — from stalwart Dwarves to shape-shifting Changelings — and 6 classes with 18 specializations. Build your fortune through 29 professions, from mining ore in volcanic mountains to enchanting legendary weapons. Rise to political power through democratic elections, forge alliances between kingdoms, or declare war on your rivals.

## Design Pillars

- **Player-Driven Economy**: Every item is crafted by players from gathered resources. No NPC vendors selling equipment. The marketplace is entirely player-to-player with dynamic pricing.
- **Meaningful Politics**: Real elections, real laws, real consequences. Mayors set tax rates, rulers declare wars, and citizens can impeach corrupt leaders.
- **Race Matters**: Your race choice affects gameplay deeply — from exclusive resource zones and profession bonuses to diplomatic relations and unique mechanics (Changeling shapeshifting, Warforged maintenance, Merfolk underwater access).
- **Interconnected Systems**: Combat victories trigger quest progress. Marketplace transactions generate taxes for town treasuries. War declarations affect travel times and trade routes. Everything connects.

## Project Statistics

| Metric | Count |
|--------|------:|
| Playable Races | 20 (7 Core, 6 Common, 7 Exotic) |
| Classes | 6 (18 specializations) |
| Racial Abilities | 120 (6 per race) |
| Class Abilities | 108 (18 per class) |
| Professions | 29 (7 gathering, 15 crafting, 7 service) |
| Regions | 21 |
| Towns | 68+ |
| Quests | 34 |
| Achievements | 26 |
| Database Models | 47 |
| Enums | 24 |
| API Endpoints | 207 |
| Socket.io Events | 20+ server-side |
| Background Cron Jobs | 11 |
| Route Files | 33 (~15,600 lines) |

---

# Technical Architecture

## A. System Architecture

### A.1 Monorepo Workspace Structure

Realm of Crowns is a TypeScript monorepo managed via npm workspaces, defined in the root `package.json`:

| Workspace | Package Name | Purpose |
|-----------|-------------|---------|
| `client/` | `@realm-of-crowns/client` | React 18 SPA (Vite + TailwindCSS) |
| `server/` | `@realm-of-crowns/server` | Express 4 REST API + Socket.io realtime server |
| `shared/` | `@realm-of-crowns/shared` | Shared types, constants, and game data (Zod schemas) |
| `database/` | `@realm-of-crowns/database` | Prisma ORM schema, migrations, and seed scripts |

**Build order** (defined in root `package.json`): `shared` -> `client` -> `server`

**Dev command**: `concurrently "npm run dev:server" "npm run dev:client"` runs both the Vite dev server (port 3000) and the Express server (port 4000) in parallel.

### A.2 Server Startup Sequence

**File**: `server/src/index.ts` (95 lines) + `server/src/app.ts` (62 lines)

The server starts in this order:

1. **Environment loading**: `dotenv/config` loads `.env` variables
2. **Express app creation** (`app.ts`):
   - `helmet()` — security headers (CSP, HSTS, X-Frame-Options, etc.)
   - `cors()` — origin restricted to `CLIENT_URL` env var (default `http://localhost:3000`), credentials enabled
   - `express.json()` — JSON body parser
   - `express.urlencoded({ extended: true })` — URL-encoded body parser
   - **Rate limiter** — 100 requests per 15-minute window on all `/api/` routes (via `express-rate-limit`)
   - **Health check endpoint** — `GET /api/health` returns `{ status: 'ok', game, version, timestamp }`
   - **API root** — `GET /api` returns welcome message
   - **Route mounting** — `app.use('/api', router)` mounts all 32 route modules
   - **404 handler** — catches unmatched routes
   - **Global error handler** — logs and returns 500 (exposes `err.message` in development mode only)
3. **HTTP server creation**: `createServer(app)` wraps Express in a Node HTTP server
4. **Socket.io server creation**: `new Server(httpServer)` with CORS matching the Express CORS config
5. **Socket.io middleware**: `io.use(socketAuthMiddleware)` — JWT verification on every socket connection
6. **Event broadcaster init**: `initEventBroadcaster(io)` stores a singleton reference for route handlers to emit events
7. **Presence system setup**: `setupPresence(io)` — registers connection/disconnect handlers for online status tracking
8. **Connection handler**: `io.on('connection', ...)` — guild room join/leave + chat handler registration + disconnect cleanup
9. **HTTP server listen**: `httpServer.listen(PORT)` on port 4000 (configurable via `PORT` env var)
10. **Background job startup** (11 cron jobs started after listen):

| Job | File | Purpose |
|-----|------|---------|
| `startElectionLifecycle` | `jobs/election-lifecycle.ts` | Advances election phases (nominations -> campaigning -> voting -> completed) |
| `startTaxCollectionJob` | `jobs/tax-collection.ts` | Collects town taxes from market transactions |
| `startLawExpirationJob` | `jobs/law-expiration.ts` | Expires time-limited laws |
| `startResourceRegenerationJob` | `jobs/resource-regeneration.ts` | Restores town resource abundance over time |
| `startGatheringAutocompleteJob` | `jobs/gathering-autocomplete.ts` | Auto-completes expired gathering actions |
| `startConstructionCompleteJob` | `jobs/construction-complete.ts` | Finalizes building construction when timer expires |
| `startPropertyTaxJob` | `jobs/property-tax.ts` | Levies property taxes on building owners |
| `startBuildingMaintenanceJob` | `jobs/building-maintenance.ts` | Degrades building condition over time |
| `startCaravanEventsJob` | `jobs/caravan-events.ts` | Processes caravan arrivals and random events |
| `startStateOfAethermereJob` | `jobs/state-of-aethermere.ts` | Generates periodic world state reports |
| `startWarforgedMaintenanceJob` | `jobs/warforged-maintenance.ts` | Race-specific: degrades Warforged condition |

### A.3 Frontend Entry Point & Provider Hierarchy

**File**: `client/src/main.tsx` (25 lines) + `client/src/App.tsx` (290 lines)

Provider hierarchy (outermost to innermost):

```
React.StrictMode
  QueryClientProvider (React Query — staleTime: 5 min, retry: 1)
    BrowserRouter
      AuthProvider (custom — JWT token in localStorage under key 'roc_token')
        PoliticalNotifications (global Socket.io listener)
        SocialEventsProvider (global Socket.io listener)
        ProgressionEventsProvider (global Socket.io listener)
        NotificationDropdown
        ChatPanel
        HUD
        Navigation
        Suspense (fallback: LoadingScreen)
          Routes (22 routes)
```

**Lazy-loaded page components** (22 pages via `React.lazy`):

| Route | Component | Auth Required |
|-------|-----------|:---:|
| `/` | `HomePage` (inline) | Yes |
| `/login` | `LoginPage` | No |
| `/register` | `RegisterPage` | No |
| `/create-character` | `CharacterCreationPage` | Yes |
| `/town` | `TownPage` | Yes |
| `/market` | `MarketPage` | Yes |
| `/inventory` | `InventoryPage` | Yes |
| `/crafting` | `CraftingPage` | Yes |
| `/combat` | `CombatPage` | Yes |
| `/map` | `WorldMapPage` | Yes |
| `/town-hall` | `TownHallPage` | Yes |
| `/elections` | `ElectionPage` | Yes |
| `/governance` | `GovernancePage` | Yes |
| `/kingdom` | `KingdomPage` | Yes |
| `/guild` | `GuildPage` | Yes |
| `/profile/:characterId` | `ProfilePage` | Yes |
| `/quests` | `QuestJournalPage` | Yes |
| `/skills` | `SkillTreePage` | Yes |
| `/achievements` | `AchievementPage` | Yes |
| `/professions` | `ProfessionsPage` | Yes |
| `/housing` | `HousingPage` | Yes |
| `/trade` | `TradePage` | Yes |
| `/diplomacy` | `DiplomacyPage` | Yes |

**Note**: `RaceSelectionPage.tsx` exists in `client/src/pages/` but is NOT referenced in the router.

**Always-loaded global components**: `PoliticalNotifications`, `SocialEventsProvider`, `ProgressionEventsProvider`, `NotificationDropdown`, `ChatPanel`, `HUD`, `Navigation`

### A.4 Vite Build Configuration

**File**: `client/vite.config.ts` (38 lines)

| Setting | Value |
|---------|-------|
| **Dev server port** | 3000 |
| **API proxy** | `/api` -> `http://localhost:4000` (changeOrigin) |
| **WebSocket proxy** | `/socket.io` -> `http://localhost:4000` (ws: true) |
| **Path alias** `@` | `./src` |
| **Path alias** `@shared` | `../shared/src` |
| **Manual chunks** (code splitting) | `vendor` (react, react-dom, react-router-dom), `query` (@tanstack/react-query, axios), `ui` (framer-motion, lucide-react), `socket` (socket.io-client) |

### A.5 Complete Dependency Inventory

#### Root (`package.json`)

| Dependency | Version | Category |
|-----------|---------|----------|
| `concurrently` | ^8.2.0 | devDependency — parallel script runner |
| `typescript` | ^5.4.0 | devDependency — TypeScript compiler |

#### Client (`@realm-of-crowns/client`)

| Dependency | Version | Category |
|-----------|---------|----------|
| `@tanstack/react-query` | ^5.50.0 | Data fetching/caching |
| `axios` | ^1.7.0 | HTTP client |
| `clsx` | ^2.1.0 | Conditional CSS classes |
| `date-fns` | ^3.6.0 | Date formatting |
| `framer-motion` | ^11.2.0 | Animations |
| `lucide-react` | ^0.400.0 | Icon library |
| `react` | ^18.3.0 | UI framework |
| `react-dom` | ^18.3.0 | React DOM renderer |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `react-router-dom` | ^6.23.0 | Client-side routing |
| `recharts` | ^2.12.0 | Charts/graphs |
| `socket.io-client` | ^4.7.0 | WebSocket client |
| `zustand` | ^4.5.0 | State management |
| `@types/react` | ^18.3.0 | devDependency |
| `@types/react-dom` | ^18.3.0 | devDependency |
| `@vitejs/plugin-react` | ^4.3.0 | devDependency |
| `autoprefixer` | ^10.4.0 | devDependency |
| `postcss` | ^8.4.0 | devDependency |
| `tailwindcss` | ^3.4.0 | devDependency — CSS framework |
| `typescript` | ^5.4.0 | devDependency |
| `vite` | ^5.3.0 | devDependency — build tool |

#### Server (`@realm-of-crowns/server`)

| Dependency | Version | Category |
|-----------|---------|----------|
| `@prisma/client` | ^5.15.0 | Database ORM client |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `cors` | ^2.8.5 | CORS middleware |
| `dotenv` | ^16.4.0 | Environment variables |
| `express` | ^4.19.0 | HTTP framework |
| `express-rate-limit` | ^7.3.0 | Rate limiting |
| `helmet` | ^7.1.0 | Security headers |
| `ioredis` | ^5.4.0 | Redis client |
| `jsonwebtoken` | ^9.0.0 | JWT auth tokens |
| `node-cron` | ^3.0.3 | Cron job scheduling |
| `socket.io` | ^4.7.0 | WebSocket server |
| `uuid` | ^10.0.0 | UUID generation |
| `zod` | ^3.23.0 | Request validation |
| `@types/bcryptjs` | ^2.4.0 | devDependency |
| `@types/cors` | ^2.8.0 | devDependency |
| `@types/express` | ^4.17.0 | devDependency |
| `@types/jest` | ^30.0.0 | devDependency |
| `@types/jsonwebtoken` | ^9.0.0 | devDependency |
| `@types/node` | ^20.14.0 | devDependency |
| `@types/node-cron` | ^3.0.0 | devDependency |
| `@types/supertest` | ^6.0.3 | devDependency |
| `@types/uuid` | ^10.0.0 | devDependency |
| `jest` | ^30.2.0 | devDependency — test runner |
| `supertest` | ^7.2.2 | devDependency — HTTP test assertions |
| `ts-jest` | ^29.4.6 | devDependency — TS Jest transformer |
| `tsx` | ^4.15.0 | devDependency — TypeScript execution |
| `typescript` | ^5.4.0 | devDependency |

#### Shared (`@realm-of-crowns/shared`)

| Dependency | Version | Category |
|-----------|---------|----------|
| `zod` | ^3.23.0 | Validation schemas |
| `typescript` | ^5.4.0 | devDependency |

#### Database (`@realm-of-crowns/database`)

| Dependency | Version | Category |
|-----------|---------|----------|
| `@prisma/client` | ^5.15.0 | ORM client |
| `prisma` | ^5.15.0 | devDependency — Prisma CLI |
| `tsx` | ^4.15.0 | devDependency — TS execution for seeds |
| `typescript` | ^5.4.0 | devDependency |

---

## B. Database Schema

### B.1 Overview

**File**: `database/prisma/schema.prisma` (1,616 lines)
**Database**: PostgreSQL via Prisma ORM
**Total models**: 47
**Total enums**: 24

### B.2 Enum Inventory

| Enum | Values | Used By |
|------|--------|---------|
| `Race` | HUMAN, ELF, DWARF, HALFLING, ORC, TIEFLING, DRAGONBORN, HALF_ELF, HALF_ORC, GNOME, MERFOLK, BEASTFOLK, FAEFOLK, GOLIATH, DROW, FIRBOLG, WARFORGED, GENASI, REVENANT, CHANGELING (20 values) | Character.race, RacialRelation, ExclusiveZone, ChangelingDisguise, CharacterAppearance |
| `RaceTier` | CORE, COMMON, EXOTIC | Character.raceTier |
| `DraconicAncestry` | RED, BLUE, WHITE, BLACK, GREEN, GOLD, SILVER | Character.draconicAncestry (Dragonborn only) |
| `BeastClan` | WOLF, BEAR, FOX, HAWK, PANTHER, BOAR | Character.beastClan (Beastfolk only) |
| `ElementalType` | FIRE, WATER, EARTH, AIR | Character.elementalType (Genasi only) |
| `RelationStatus` | ALLIED, FRIENDLY, NEUTRAL, DISTRUSTFUL, HOSTILE, BLOOD_FEUD | RacialRelation.status |
| `ProfessionType` | FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER, SMELTER, BLACKSMITH, ARMORER, WOODWORKER, TANNER, LEATHERWORKER, TAILOR, ALCHEMIST, ENCHANTER, COOK, BREWER, JEWELER, FLETCHER, MASON, SCRIBE, MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN (29 values) | PlayerProfession, ProfessionXP, Recipe, ItemTemplate |
| `ProfessionCategory` | GATHERING, CRAFTING, SERVICE | Application-layer categorization |
| `ProfessionTier` | APPRENTICE, JOURNEYMAN, CRAFTSMAN, EXPERT, MASTER, GRANDMASTER (6 tiers) | PlayerProfession.tier, Recipe.tier |
| `BiomeType` | PLAINS, FOREST, MOUNTAIN, HILLS, BADLANDS, SWAMP, TUNDRA, VOLCANIC, COASTAL, DESERT, RIVER, UNDERGROUND, UNDERWATER, FEYWILD (14 values) | Region.biome, Town.biome, Resource.biome, Monster.biome |
| `ItemType` | WEAPON, ARMOR, TOOL, CONSUMABLE, MATERIAL, ACCESSORY, QUEST, HOUSING | ItemTemplate.type |
| `ItemRarity` | POOR, COMMON, FINE, SUPERIOR, MASTERWORK, LEGENDARY | ItemTemplate.rarity, Item.quality, CraftingAction.quality |
| `ResourceType` | ORE, WOOD, GRAIN, HERB, FISH, HIDE, STONE, FIBER, ANIMAL_PRODUCT, REAGENT, EXOTIC (11 values) | TownResource.resourceType, Resource.type |
| `EquipSlot` | HEAD, CHEST, HANDS, LEGS, FEET, MAIN_HAND, OFF_HAND, RING_1, RING_2, NECK, BACK (11 slots) | CharacterEquipment.slot |
| `BuildingType` | HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE, SMITHY, SMELTERY, TANNERY, TAILOR_SHOP, ALCHEMY_LAB, ENCHANTING_TOWER, KITCHEN, BREWERY, JEWELER_WORKSHOP, FLETCHER_BENCH, MASON_YARD, LUMBER_MILL, SCRIBE_STUDY, STABLE, WAREHOUSE, BANK, INN, MARKET_STALL, FARM, RANCH, MINE (24 values) | Building.type |
| `ActionStatus` | PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED | TravelAction, CraftingAction, GatheringAction, BuildingConstruction, Caravan, QuestProgress |
| `CombatType` | PVE, PVP, DUEL, ARENA, WAR | CombatSession.type |
| `ElectionType` | MAYOR, RULER, GUILD_LEADER | Election.type |
| `ElectionPhase` | NOMINATIONS, CAMPAIGNING, VOTING, COMPLETED | Election.phase |
| `ImpeachmentStatus` | ACTIVE, PASSED, FAILED | Impeachment.status |
| `DiplomacyActionType` | PROPOSE_TREATY, DECLARE_WAR, TRADE_AGREEMENT, NON_AGGRESSION_PACT, ALLIANCE, BREAK_TREATY | DiplomacyEvent.type |
| `QuestType` | MAIN, TOWN, DAILY, GUILD, BOUNTY, RACIAL | Quest.type |
| `FriendStatus` | PENDING, ACCEPTED, DECLINED, BLOCKED | Friend.status |
| `MessageChannel` | GLOBAL, TOWN, GUILD, PARTY, WHISPER, TRADE, SYSTEM | Message.channelType |
| `TreatyType` | TRADE_AGREEMENT, NON_AGGRESSION_PACT, ALLIANCE | Treaty.type |
| `TreatyStatus` | PENDING, ACTIVE, EXPIRED, BROKEN | Treaty.status |
| `NpcRole` | QUEST_GIVER, MERCHANT, TRAINER, GUARD | Npc.role |
| `PetitionStatus` | ACTIVE, FULFILLED, EXPIRED, REJECTED | Petition.status |

### B.3 Model Inventory by Domain

#### Player / Character (8 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `User` | id (UUID), email (unique), username (unique), passwordHash, role | -> Character[] | Authentication account |
| `Character` | id, userId, name, race, level, xp, stats (JSON), currentTownId, health, mana, gold | -> User, Town, 30+ relations | Player's in-game avatar |
| `CharacterEquipment` | characterId, slot (enum), itemId | -> Character, Item | Equipment slot mapping |
| `Inventory` | characterId, itemId, quantity, slotPosition | -> Character, Item | Bag/inventory items |
| `CharacterAppearance` | characterId, apparentRace, apparentName, features (JSON) | -> Character | Visual appearance (Changeling disguises) |
| `CharacterAbility` | characterId, abilityId, unlockedAt | -> Character, Ability | Unlocked skill tree abilities |
| `PlayerAchievement` | characterId, achievementId, unlockedAt | -> Character, Achievement | Earned achievements |
| `Achievement` | name (unique), description, criteria (JSON), reward (JSON) | -> PlayerAchievement[] | Achievement definitions |

**Unique constraints**: `CharacterEquipment(characterId, slot)`, `CharacterAbility(characterId, abilityId)`, `PlayerAchievement(characterId, achievementId)`
**Indexes**: `Character(userId)`, `Character(currentTownId)`, `Character(race)`

#### World / Geography (7 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Region` | name (unique), biome, levelMin, levelMax | -> Town[], ExclusiveZone[], Quest[], Monster[] | World map regions |
| `Town` | name (unique), regionId, population, biome, mayorId, features (JSON) | -> Region, Character (mayor), 15+ relations | Settlements — primary gameplay hub |
| `TownResource` | townId, resourceType, abundance, respawnRate | -> Town | Resource nodes per town |
| `TravelRoute` | fromTownId, toTownId, distance, dangerLevel, terrain | -> Town (from/to) | Travel connections between towns |
| `TravelAction` | characterId, routeId, status, startedAt, completesAt | -> Character, TravelRoute | In-progress travel |
| `RegionBorder` | regionId1, regionId2, type | -> Region (x2) | Region adjacency |
| `ExclusiveZone` | name, requiredRaces (JSON), owningRace, regionId, dangerLevel, specialMechanics (JSON) | -> Region | Race-gated zones |

**Unique constraints**: `TownResource(townId, resourceType)`, `TravelRoute(fromTownId, toTownId)`, `RegionBorder(regionId1, regionId2)`

#### Economy / Market (5 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `MarketListing` | sellerId, itemId, price, quantity, townId, expiresAt | -> Character, Item, Town | Active market listings |
| `TradeTransaction` | buyerId, sellerId, itemId, price, quantity, townId, timestamp | -> Character (buyer/seller), Item, Town | Completed trades (ledger) |
| `PriceHistory` | itemTemplateId, townId, avgPrice, volume, date | -> ItemTemplate, Town | Daily price aggregates |
| `Caravan` | ownerId, fromTownId, toTownId, cargo (JSON), status, departedAt, arrivesAt | -> Character, Town (from/to) | Inter-town trade caravans |
| `TownTreasury` | townId (unique), balance, taxRate, lastCollectedAt | -> Town | Town treasury/tax config |

**Unique constraints**: `PriceHistory(itemTemplateId, townId, date)`, `TownTreasury(townId)`

#### Items / Crafting (6 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Resource` | name (unique), type, biome, tier, baseGatherTime | -> GatheringAction[] | Gatherable resource definitions |
| `ItemTemplate` | name, type, rarity, stats (JSON), professionRequired, levelRequired | -> Item[], PriceHistory[] | Item blueprints |
| `Item` | templateId, ownerId, currentDurability, quality, craftedById, enchantments (JSON) | -> ItemTemplate, Character (owner/crafter) | Instantiated items |
| `Recipe` | name, professionType, tier, ingredients (JSON), result, craftTime, xpReward | -> CraftingAction[] | Crafting recipes |
| `CraftingAction` | characterId, recipeId, status, quality, startedAt, completesAt | -> Character, Recipe | In-progress crafts |
| `GatheringAction` | characterId, resourceId, townId, status, quantity, startedAt, completesAt | -> Character, Resource, Town | In-progress gathering |

#### Professions (2 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `PlayerProfession` | characterId, professionType, tier, level, xp, specialization, isActive | -> Character | Active professions per character (max 3) |
| `ProfessionXP` | characterId, professionType, xpGained, source, timestamp | -> Character | XP gain history/audit trail |

**Unique constraints**: `PlayerProfession(characterId, professionType)`
**Business rule (app-layer)**: Max 3 professions (2 gathering, 2 crafting, 1 service)

#### Combat (4 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `CombatSession` | type, status, locationTownId, startedAt, endedAt, log (JSON) | -> Town, CombatLog[], CombatParticipant[] | Combat encounters |
| `CombatLog` | sessionId, round, actorId, action, result (JSON) | -> CombatSession | Per-round combat log |
| `CombatParticipant` | sessionId, characterId, team, initiative, currentHp | -> CombatSession, Character | Fighters in a session |
| `Monster` | name, level, stats (JSON), lootTable (JSON), regionId, biome | -> Region | PvE enemy definitions |

**Unique constraints**: `CombatParticipant(sessionId, characterId)`

#### Politics / Governance (7 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Kingdom` | name (unique), rulerId (unique), capitalTownId (unique), treasury, laws (JSON) | -> Character (ruler), Election[], Law[], War[], Treaty[] | Kingdom entity |
| `Election` | townId, kingdomId, type, phase, termNumber, startDate, endDate, winnerId | -> Town, Kingdom, Character (winner), ElectionVote[], ElectionCandidate[] | Election lifecycle |
| `ElectionVote` | electionId, voterId, candidateId | -> Election, Character | Individual votes |
| `ElectionCandidate` | electionId, characterId, platform | -> Election, Character | Declared candidates |
| `Impeachment` | targetId, townId, kingdomId, votesFor, votesAgainst, status, endsAt | -> Character, Town, Kingdom | Impeachment proceedings |
| `ImpeachmentVote` | impeachmentId, voterId, support | -> Impeachment, Character | Impeachment ballots |
| `Law` | kingdomId, title, effects (JSON), enactedById, status, votesFor, votesAgainst, lawType, expiresAt | -> Kingdom, Character | Enacted/proposed laws |

**Unique constraints**: `ElectionVote(electionId, voterId)`, `ElectionCandidate(electionId, characterId)`, `ImpeachmentVote(impeachmentId, voterId)`

#### Governance / Council (2 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `CouncilMember` | kingdomId, townId, characterId, role, appointedById | -> Kingdom, Town, Character (member/appointer) | Appointed council members |
| `TownPolicy` | townId (unique), taxRate, tradePolicy (JSON), buildingPermits, sheriffId | -> Town, Character (sheriff) | Per-town policy settings |

#### Social (3 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Guild` | name (unique), tag (unique), leaderId (unique), level, treasury | -> Character (leader), GuildMember[], Message[] | Player guilds |
| `GuildMember` | guildId, characterId, rank, joinedAt | -> Guild, Character | Guild membership |
| `Friend` | requesterId, recipientId, status | -> Character (requester/recipient) | Friend relationships |

**Unique constraints**: `GuildMember(guildId, characterId)`, `Friend(requesterId, recipientId)`

#### Communication (2 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Message` | channelType, content, senderId, recipientId, guildId, townId, isRead, timestamp | -> Character (sender/recipient), Guild, Town | Chat messages across all channels |
| `Notification` | characterId, type, title, message, read, data (JSON), timestamp | -> Character | Push notifications |

#### Diplomacy (4 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `RacialRelation` | race1, race2, status, modifier | (standalone) | Racial diplomacy standings |
| `DiplomacyEvent` | type, initiatorId, targetId, details (JSON) | -> Character (initiator/target) | Diplomacy action log |
| `War` | attackerKingdomId, defenderKingdomId, status, attackerScore, defenderScore | -> Kingdom (attacker/defender) | Active/historical wars |
| `Treaty` | type, proposerKingdomId, receiverKingdomId, proposedById, status, goldCost, expiresAt | -> Kingdom (proposer/receiver), Character | Inter-kingdom treaties |

**Unique constraints**: `RacialRelation(race1, race2)`

#### Race-Specific Mechanics (3 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `RacialAbilityCooldown` | characterId, abilityName, lastUsed, cooldownEnds | -> Character | Racial ability cooldown tracking |
| `ChangelingDisguise` | characterId (unique), disguisedAs, disguiseRace | -> Character | Changeling-specific disguise state |
| `WarforgedMaintenance` | characterId (unique), lastMaintenance, condition, nextRequired | -> Character | Warforged-specific maintenance decay |

#### Quests (1 model)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Quest` | name, type, objectives (JSON), rewards (JSON), levelRequired, regionId, prerequisiteQuestId, isRepeatable | -> Region, Quest (prerequisite), QuestProgress[] | Quest definitions (self-referential for chains) |
| `QuestProgress` | characterId, questId, status, progress (JSON), startedAt, completedAt | -> Character, Quest | Per-player quest state |

**Unique constraints**: `QuestProgress(characterId, questId)`

#### Skills (1 model)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Ability` | name (unique), class, specialization, tier, effects (JSON), cooldown, manaCost, prerequisiteAbilityId, levelRequired | -> Ability (prerequisite, self-ref), CharacterAbility[] | Skill tree node definitions |

#### Buildings (2 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Building` | ownerId, townId, type, name, level, storage (JSON) | -> Character, Town | Player-owned buildings |
| `BuildingConstruction` | buildingId, status, materialsUsed (JSON), startedAt, completesAt | -> Building | Construction queue |

#### NPCs (1 model)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `Npc` | name, townId, role, dialog (JSON), questIds (String[]) | -> Town | Static town NPCs |

#### World Events & Petitions (3 models)

| Model | Key Fields | Relationships | Purpose |
|-------|-----------|---------------|---------|
| `WorldEvent` | eventType, title, description, metadata (JSON) | (standalone) | Global event log |
| `Petition` | creatorId, petitionType, title, status, signatureGoal, expiresAt | -> Character, PetitionSignature[] | Player-created petitions |
| `PetitionSignature` | petitionId, characterId | -> Petition, Character | Petition signatures |

**Unique constraints**: `PetitionSignature(petitionId, characterId)`

---

## C. Caching & State

### C.1 Redis Configuration

**File**: `server/src/lib/redis.ts` (41 lines)

Redis is **optional** — the server runs without it if `REDIS_URL` is not set. When available:

- **Client**: `ioredis` with retry strategy (max 5 attempts, exponential backoff up to 2 seconds)
- **Fallback**: All Redis-dependent features silently degrade (cache middleware passes through, presence falls back to in-memory Map)
- **Utility**: `invalidateCache(pattern)` — deletes all keys matching a glob pattern (used by guilds route after mutations)

### C.2 Response Cache Middleware

**File**: `server/src/middleware/cache.ts` (43 lines)

A generic `cache(ttlSeconds)` middleware factory:

- **Cache key**: `cache:{originalUrl}` (includes path + query string)
- **Behavior**: On cache hit, returns JSON with `X-Cache: HIT` header. On miss, intercepts `res.json()` to cache the response body with `setex`.
- **Only caches** successful responses (2xx status codes)
- **Sets** `Cache-Control: public, max-age={ttl}` header on both hits and misses
- **Graceful degradation**: If Redis is unavailable, calls `next()` (no caching)

### C.3 Cached Endpoints

| Route | Endpoint | TTL (seconds) | Purpose |
|-------|----------|:---:|---------|
| `guilds.ts` | `GET /api/guilds` | 60 | Guild list |
| `market.ts` | `GET /api/market/browse` | 30 | Market listing browser |
| `quests.ts` | `GET /api/quests/available` | 60 | Available quests |
| `towns.ts` | `GET /api/towns/:id` | 120 | Individual town data |
| `trade-analytics.ts` | `GET /api/trade/prices/:itemTemplateId` | 60 | Current item prices |
| `trade-analytics.ts` | `GET /api/trade/price-history/:itemTemplateId` | 60 | Historical price data |
| `trade-analytics.ts` | `GET /api/trade/best-routes` | 120 | Best trade routes |
| `trade-analytics.ts` | `GET /api/trade/town/:townId/dashboard` | 60 | Town trade dashboard |
| `trade-analytics.ts` | `GET /api/trade/merchant/:characterId/stats` | 30 | Merchant stats |
| `world.ts` | `GET /api/world/map` | 300 | Full world map |
| `world.ts` | `GET /api/world/regions` | 300 | All regions |

**Cache invalidation**: Currently only used in `guilds.ts` (calls `invalidateCache('cache:/api/guilds*')` after guild mutations). Other routes do **not** invalidate their cached data — stale data will persist until TTL expires.

### C.4 Presence State (Redis + In-Memory Hybrid)

**File**: `server/src/socket/presence.ts` (202 lines)

| Data Store | Key/Structure | TTL | Purpose |
|-----------|--------------|-----|---------|
| In-memory `Map<string, PresenceEntry>` | characterId -> { userId, characterId, characterName, currentTownId, socketId, connectedAt } | Until disconnect | Fast local presence lookups |
| In-memory `Map<string, string>` | socketId -> characterId | Until disconnect | Reverse lookup for cleanup |
| Redis Hash | `presence:online` / field: characterId / value: JSON(PresenceEntry) | None (removed on disconnect) | Cross-instance presence (currently unused — single-instance design) |

**Note**: The `PRESENCE_TTL` constant (3600s) is defined but never used — there is no periodic TTL expiration set on the Redis hash. Entries are only removed on explicit disconnect.

---

## D. Security & Auth

### D.1 Authentication Flow

**JWT-based stateless authentication** — no session storage.

#### Registration (`POST /api/auth/register`)
1. Zod validation: email (valid format), username (3-20 chars, alphanumeric only), password (8+ chars)
2. Duplicate check: `findFirst` with `OR [email, username]`
3. Password hashing: `bcrypt.hash(password, 12)` — cost factor 12
4. User creation via Prisma
5. JWT generation: signs `{ userId, username }` with `JWT_SECRET`, expires in `JWT_EXPIRES_IN` (default: 7 days)

#### Login (`POST /api/auth/login`)
1. Zod validation: email (valid format), password (non-empty)
2. User lookup by email
3. Password comparison: `bcrypt.compare()`
4. JWT generation (same as registration)

#### Token Verification (`authGuard` middleware)
**File**: `server/src/middleware/auth.ts` (29 lines)

1. Extracts `Authorization: Bearer <token>` header
2. `jwt.verify(token, JWT_SECRET)` — decodes `{ userId, username }`
3. Attaches `req.user = { userId, username }` for downstream handlers
4. Returns 401 on missing/invalid token

#### Logout (`POST /api/auth/logout`)
**Stateless**: Simply returns `{ message: 'Logged out successfully' }`. Token invalidation relies on client-side deletion from `localStorage`. There is no server-side token blacklist.

### D.2 Socket.io Authentication

**File**: `server/src/socket/middleware.ts` (70 lines)

- Socket connections require `socket.handshake.auth.token`
- Same JWT verification as HTTP auth (`jwt.verify` with `JWT_SECRET`)
- Attaches `socket.data.userId` and `socket.data.username` on success
- Rejects unauthenticated connections with `Error('Authentication required')`

### D.3 Rate Limiting

| Layer | Scope | Limit | Window |
|-------|-------|-------|--------|
| HTTP (`express-rate-limit`) | All `/api/` routes | 100 requests | 15 minutes |
| WebSocket (custom in-memory) | Per socket connection | 30 messages | 60 seconds |

**HTTP rate limiting**: Uses `standardHeaders` (RateLimit-* headers), no legacy headers. Applied globally to all API routes.

**Socket rate limiting**: In-memory Map keyed by `socket.id`. The `socketRateLimitMiddleware` function is exported but is **not currently applied** as Socket.io middleware — it exists but is unused. Rate limiting for sockets is only enforced through the in-memory map cleanup on disconnect via `cleanupRateLimit`.

### D.4 Security Headers

**Helmet** (defaults): Adds Content-Security-Policy, X-Content-Type-Options (nosniff), X-Frame-Options (SAMEORIGIN), Strict-Transport-Security, X-XSS-Protection, and other standard security headers.

### D.5 CORS Configuration

| Setting | Value |
|---------|-------|
| **Origin** | `CLIENT_URL` env var (default: `http://localhost:3000`) |
| **Credentials** | `true` |
| **Methods** (Socket.io) | `GET`, `POST` |

CORS is configured identically on both Express and Socket.io.

### D.6 Input Validation

**File**: `server/src/middleware/validate.ts` (22 lines)

- Generic `validate(schema)` middleware factory using Zod
- Parses `req.body` against the provided Zod schema
- Returns 400 with structured error details on validation failure: `{ error: 'Validation failed', details: [{ field, message }] }`
- Used consistently across auth, guilds, governance, and other routes that accept POST/PUT bodies

### D.7 Client-Side Auth

**File**: `client/src/context/AuthContext.tsx` (87 lines) + `client/src/services/api.ts` (31 lines)

- Token stored in `localStorage` under key `roc_token`
- Axios request interceptor attaches `Authorization: Bearer <token>` to every request
- Axios response interceptor: on 401, clears token and redirects to `/login`
- `ProtectedRoute` component wraps 20 of 22 routes (all except `/login` and `/register`)

---

## E. Missing/Incomplete Items

### E.1 Stub Endpoints

| Route File | Endpoint | Issue |
|-----------|----------|-------|
| `guilds.ts:520` | `GET /api/guilds/:id/quests` | Returns `{ quests: [] }` — explicitly marked as "placeholder" |

### E.2 Empty Placeholder Directories (`.gitkeep` only)

**Client** (34 `.gitkeep` files in component/feature directories):
- `client/src/components/auth/`, `character/`, `combat/`, `crafting/`, `diplomacy/`, `economy/`, `gathering/`, `guilds/`, `housing/`, `hud/`, `inventory/`, `map/`, `messaging/`, `politics/`, `quests/`, `races/`, `social/`, `town/`, `ui/`
- `client/src/context/`, `hooks/`, `pages/`, `services/`, `styles/`, `types/`, `utils/`
- `client/public/assets/images/`, `icons/`, `fonts/`, `sounds/`

**Server** (7 `.gitkeep` files):
- `server/src/routes/`, `services/`, `engines/`, `middleware/`, `socket/`, `jobs/`, `types/`, `utils/`

**Shared** (10 `.gitkeep` files):
- `shared/src/types/`, `constants/`, `data/races/core/`, `data/races/common/`, `data/races/exotic/`, `data/professions/`, `data/recipes/`, `data/resources/`, `data/items/`, `data/world/`

**Database**: `database/prisma/migrations/`, `database/seeds/`

**Note**: Many of these directories now contain actual files alongside the `.gitkeep`. The `.gitkeep` files are vestigial from initial scaffolding and can be removed.

### E.3 Architectural Quirks

1. **Circular import pattern**: `server/src/routes/governance.ts` imports `emitGovernanceEvent` from `../index` (the server entry point). `server/src/routes/guilds.ts` imports `io` from `../index`. This creates a circular dependency between the route modules and the server entry point. The `events.ts` broadcaster module was created to solve this for other routes, but governance/guilds still use the legacy pattern.

2. **Unused socket rate limiter**: `socketRateLimitMiddleware` is exported from `server/src/socket/middleware.ts` but never applied. The `cleanupRateLimit` function IS used on disconnect, but the actual rate checking middleware is not registered.

3. **Shared constants empty**: `shared/src/constants/index.ts` contains only `export {};` — game constants are defined inline in individual route/service files instead of being centralized.

4. **Shared `engines/` directory empty**: The `server/src/engines/` directory contains only `.gitkeep` — game logic (combat, crafting, profession calculations) lives in route handlers and services instead of dedicated engine modules.

5. **PRESENCE_TTL unused**: `server/src/socket/presence.ts` defines `const PRESENCE_TTL = 3600` but never uses it. Redis presence entries have no expiration — if a server crashes without clean disconnects, stale entries persist indefinitely.

6. **Logout is a no-op**: `POST /api/auth/logout` returns success without any server-side action. JWTs remain valid until expiration (default 7 days). No token blacklist or revocation mechanism exists.

7. **Token in localStorage**: JWT stored in `localStorage` is accessible to XSS attacks. HttpOnly cookies would be more secure.

8. **`invalidateCache` uses `KEYS` command**: `server/src/lib/redis.ts` line 34 uses `redis.keys(pattern)` for cache invalidation, which is O(N) and blocks the Redis server. `SCAN` would be preferable in production.

9. **Missing `RaceSelectionPage` route**: `client/src/pages/RaceSelectionPage.tsx` exists but is not referenced in the App.tsx router.

10. **No database migrations directory contents**: `database/prisma/migrations/` contains only `.gitkeep` — Prisma migrations have not been generated yet (the schema is present but unmigrated).

11. **No test files found**: Despite Jest being configured in `server/package.json`, no test files were found in the codebase.

### E.4 Security Concerns

1. **`JWT_SECRET!` non-null assertion**: Both `auth.ts` and `socket/middleware.ts` use `process.env.JWT_SECRET!` without checking if it's defined. If `JWT_SECRET` is unset, this will throw a runtime error on first auth attempt rather than failing at startup.

2. **Rate limiter is per-IP only**: The Express rate limiter does not distinguish between authenticated users — a single IP can exhaust the limit for all users behind a shared NAT.

3. **No CSRF protection**: The application uses JWT in `Authorization` headers (not cookies), so CSRF is not a concern for API calls. However, the `credentials: true` CORS setting combined with the potential future addition of cookies would require CSRF tokens.

4. **Chat content unescaped**: Chat messages are stored and returned as-is. If the client renders them as HTML (rather than text), this could lead to XSS. The client likely uses React's default escaping, but this is worth verifying.

### E.5 TODO/FIXME Count

**No TODO, FIXME, HACK, or XXX comments** were found in any source files under `server/src/`, `client/src/`, or `shared/src/`. The codebase is clean of code-level technical debt markers.

### E.6 Route File Size Reference

| File | Lines | Notes |
|------|------:|-------|
| `buildings.ts` | 1,451 | Largest — housing, construction, maintenance, property tax |
| `combat-pvp.ts` | 937 | PvP combat engine |
| `crafting.ts` | 919 | Crafting system with queues |
| `caravans.ts` | 827 | Trade caravan system |
| `trade-analytics.ts` | 799 | Price tracking, merchant stats, best routes |
| `work.ts` | 766 | Gathering/work system |
| `diplomacy.ts` | 761 | Inter-kingdom diplomacy |
| `combat-pve.ts` | 668 | PvE combat engine |
| `governance.ts` | 665 | Laws, taxes, war declarations |
| `elections.ts` | 592 | Election lifecycle |
| `guilds.ts` | 586 | Guild CRUD + management |
| `races.ts` | 563 | Race data endpoints |
| `quests.ts` | 567 | Quest system |
| `market.ts` | 541 | Marketplace buy/sell |
| `professions.ts` | 477 | Profession management |
| `travel.ts` | 364 | Town-to-town travel |
| `special-mechanics.ts` | 358 | Racial special abilities |
| `zones.ts` | 343 | Exclusive zones |
| `friends.ts` | 341 | Friend system |
| `messages.ts` | 323 | REST chat/messages |
| `equipment.ts` | 311 | Equipment management |
| `characters.ts` | 310 | Character CRUD |
| `skills.ts` | 291 | Skill tree |
| `petitions.ts` | 295 | Player petitions |
| `items.ts` | 275 | Item management |
| `tools.ts` | 272 | Tool equipping/durability |
| `regions.ts` | 189 | Region data |
| `notifications.ts` | 138 | Notification CRUD |
| `auth.ts` | 138 | Authentication |
| `world.ts` | 131 | World map/regions |
| `profiles.ts` | 127 | Public profiles |
| `world-events.ts` | 121 | World events feed |
| `towns.ts` | 112 | Town data |
| **Total** | **15,631** | Across 34 route files |
# Gameplay Systems Reference

> Complete documentation of every gameplay system in Realm of Crowns.
> Each section contains both a **player-friendly guide** and a **technical breakdown** with file paths, endpoints, and data flow.

---

## Table of Contents

- [A. Character System](#a-character-system)
  - [A.1 Races Overview](#a1-races-overview)
  - [A.2 Race Stat Comparison](#a2-race-stat-comparison)
  - [A.3 Core Races (7)](#a3-core-races-7)
  - [A.4 Common Races (6)](#a4-common-races-6)
  - [A.5 Exotic Races (7)](#a5-exotic-races-7)
  - [A.6 Sub-Races](#a6-sub-races)
  - [A.7 Classes & Specializations](#a7-classes--specializations)
  - [A.8 Technical: Character System](#a8-technical-character-system)
- [B. World & Travel](#b-world--travel)
  - [B.1 Regions](#b1-regions)
  - [B.2 Towns](#b2-towns)
  - [B.3 Travel System](#b3-travel-system)
  - [B.4 Technical: World & Travel](#b4-technical-world--travel)
- [C. Economy & Professions](#c-economy--professions)
  - [C.1 Profession Overview](#c1-profession-overview)
  - [C.2 Profession Tiers](#c2-profession-tiers)
  - [C.3 Gathering Professions (7)](#c3-gathering-professions-7)
  - [C.4 Crafting Professions (15)](#c4-crafting-professions-15)
  - [C.5 Service Professions (7)](#c5-service-professions-7)
  - [C.6 Quality System](#c6-quality-system)
  - [C.7 Marketplace](#c7-marketplace)
  - [C.8 Racial Profession Bonuses](#c8-racial-profession-bonuses)
  - [C.9 Technical: Economy](#c9-technical-economy)
- [D. Combat System](#d-combat-system)
  - [D.1 Combat Overview](#d1-combat-overview)
  - [D.2 Core Formulas](#d2-core-formulas)
  - [D.3 Status Effects](#d3-status-effects)
  - [D.4 PvE Combat](#d4-pve-combat)
  - [D.5 PvP Combat](#d5-pvp-combat)
  - [D.6 Death & Penalties](#d6-death--penalties)
  - [D.7 Racial Combat Abilities](#d7-racial-combat-abilities)
  - [D.8 Technical: Combat](#d8-technical-combat)

---

# A. Character System

## A.1 Races Overview

Realm of Crowns features **20 playable races** organized into three tiers that determine starting gold and overall complexity:

| Tier | Starting Gold | Races | Playstyle |
|------|--------------|-------|-----------|
| **Core** (7) | 100g | Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn | Straightforward, strong racial identity |
| **Common** (6) | 75g | Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk | Hybrid mechanics, some trade-offs |
| **Exotic** (7) | 50g | Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling | High complexity, unique mechanics, lower starting gold |

Every character begins with **base 10 in all six stats** (STR, DEX, CON, INT, WIS, CHA), modified by racial bonuses. Each race provides:

- **6 racial abilities** that unlock at levels 1, 5, 10, 15, 25, and 40
- **Profession bonuses** (speed, quality, yield, or XP multipliers for specific trades)
- **Gathering bonuses** (percentage yield bonuses for specific resource types in specific biomes)
- **A homeland region** and **starting towns** (3-5 towns per race)
- Some races have **sub-races**, **exclusive zones**, or **special mechanics**

---

## A.2 Race Stat Comparison

All values are modifiers applied to the base 10 in each stat. Positive = bonus, negative = penalty.

### Core Races

| Race | STR | DEX | CON | INT | WIS | CHA | Net | Homeland |
|------|-----|-----|-----|-----|-----|-----|-----|----------|
| **Human** | +1 | +1 | +1 | +1 | +1 | +1 | +6 | The Verdant Heartlands |
| **Elf** | 0 | +3 | -1 | +2 | +2 | +1 | +7 | The Silverwood Forest |
| **Dwarf** | +2 | -1 | +3 | +1 | +1 | 0 | +6 | The Ironvault Mountains |
| **Halfling** | -1 | +3 | +1 | +1 | +1 | +2 | +7 | The Crossroads |
| **Orc** | +4 | 0 | +3 | -1 | 0 | -1 | +5 | The Ashenfang Wastes |
| **Tiefling** | 0 | +1 | 0 | +3 | +1 | +2 | +7 | Shadowmere Marshes |
| **Dragonborn** | +3 | -1 | +2 | +1 | +2 | 0 | +7 | The Frozen Reaches |

### Common Races

| Race | STR | DEX | CON | INT | WIS | CHA | Net | Homeland |
|------|-----|-----|-----|-----|-----|-----|-----|----------|
| **Half-Elf** | 0 | +2 | +1 | +1 | +1 | +3 | +8 | The Twilight March |
| **Half-Orc** | +3 | +1 | +2 | 0 | +1 | 0 | +7 | The Scarred Frontier |
| **Gnome** | -2 | +2 | +1 | +4 | +1 | +1 | +7 | The Clockwork Warrens |
| **Merfolk** | +1 | +2 | +2 | 0 | +2 | +1 | +8 | The Pelagic Depths |
| **Beastfolk** | +2 | +2 | +2 | -1 | +2 | -1 | +6 | The Thornwilds |
| **Faefolk** | -3 | +4 | -2 | +2 | +3 | +3 | +7 | The Feywild Threshold |

### Exotic Races

| Race | STR | DEX | CON | INT | WIS | CHA | Net | Homeland |
|------|-----|-----|-----|-----|-----|-----|-----|----------|
| **Goliath** | +4 | 0 | +4 | -1 | +1 | -2 | +6 | The Skyspire Peaks |
| **Drow** | 0 | +3 | 0 | +2 | +1 | +2 | +8 | The Underdark |
| **Firbolg** | +2 | 0 | +2 | 0 | +4 | 0 | +8 | The Eldergrove |
| **Warforged** | +2 | 0 | +3 | +2 | 0 | -2 | +5 | The Foundry |
| **Genasi** | +1 | +1 | +1 | +2 | +1 | +1 | +7 | The Confluence |
| **Revenant** | +2 | 0 | +3 | +1 | +2 | -2 | +6 | The Ashenmoor |
| **Changeling** | 0 | +2 | 0 | +2 | +1 | +4 | +9 | None (start anywhere) |

> **Tip**: Changeling has the highest net stat total (+9) but the lowest starting gold (50g) and no hometown. Faefolk have extreme highs (+4 DEX, +3 WIS/CHA) and extreme lows (-3 STR, -2 CON) -- the game's "hard mode" for physical activities.

---

## A.3 Core Races (7)

### Human
*"Humans build empires, and their kingdoms have risen and fallen more times than any scholar can count."*

- **Trait**: Adaptive -- +1 to ALL stats
- **Starting Towns**: Kingshold, Millhaven, Bridgewater, Ironford, Whitefield

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Versatile Learner | Passive | +10% XP gain for ALL professions |
| 5 | Diplomatic Tongue | Passive | +15% reputation gain with all races |
| 10 | Rally the People | Active (24h CD) | Party buff: +2 all stats for 1 hour |
| 15 | Adaptable Crafter | Passive | Can learn a 4th profession (normally max 3) |
| 25 | Empire Builder | Passive | Buildings cost 10% fewer materials |
| 40 | Indomitable Will | Passive | Once per combat, reroll a failed saving throw |

**Profession Bonuses**: +10% farming yield, +5% all crafting speed, +15% trading yield
**Gathering Bonuses**: +5% across all resource types (generalist)

---

### Elf
*"What can a creature that lives 80 years truly understand?"*

- **Trait**: Graceful -- high DEX and mental stats, physically frail
- **Starting Towns**: Aelindra, Moonhaven, Thornwatch, Willowmere, Eldergrove

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Keen Senses | Passive | +20% chance to find rare resources while gathering |
| 5 | Elven Accuracy | Passive | Advantage (roll 2d20, take higher) on ranged attacks |
| 10 | Communion with Nature | Passive | Gathering in forests takes 25% less time |
| 15 | Arcane Affinity | Passive | +2 bonus to Enchanting quality rolls |
| 25 | Ageless Knowledge | Passive | +15% XP for Enchanter, Herbalist, Scribe |
| 40 | Spirit Walk | Active (24h CD) | Invisibility for 30 seconds |

**Profession Bonuses**: +25% herbalism yield, +20% enchanting quality, +15% woodworking quality, +10% alchemy quality
**Gathering Bonuses**: +15% HERB (forest), +10% WOOD (forest), +5% FIBER (any)

---

### Dwarf
*"A Dwarven blade is worth three Human-made ones."*

- **Trait**: Stoneborn -- incredibly tough but slow
- **Starting Towns**: Kazad-Vorn, Deepvein, Hammerfall, Gemhollow, Alehearth
- **Exclusive Zone**: Deep Mines (accessible only to Dwarves)

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Darkvision | Passive | Access deep mine nodes others cannot reach |
| 5 | Dwarven Resilience | Passive | Poison resistance, +3 to poison saving throws |
| 10 | Master Forger | Passive | +3 to Blacksmith/Armorer quality rolls |
| 15 | Stonecunning | Passive | +25% mining yield, +10% gem discovery |
| 25 | Clan Loyalty | Passive | Same-race guild members get +5% crafting bonus |
| 40 | Ancestral Fury | Passive | Below 25% HP: +5 STR and +5 CON |

**Profession Bonuses**: +30% mining yield, +25% blacksmithing quality, +25% armoring quality, +20% smelting speed, +15% masonry quality
**Gathering Bonuses**: +20% ORE (mountain), +15% STONE (mountain), +15% ORE (underground)

---

### Halfling
*"Small in stature, enormous in influence."*

- **Trait**: Lucky -- quick, charming, impossibly fortunate
- **Starting Towns**: Hearthshire, Greenhollow, Peddler's Rest, Bramblewood, Riverside

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Halfling Luck | Active (24h CD) | Reroll any single d20 roll |
| 5 | Small and Sneaky | Passive | +20% stealth success rate |
| 10 | Silver Tongue | Passive | Buy for 5% less, sell for 5% more on marketplace |
| 15 | Nimble Fingers | Passive | +15% speed on all crafting and gathering |
| 25 | Trade Network | Passive | See marketplace prices in ALL towns (global visibility) |
| 40 | Feast Master | Passive | Food you cook gives double buff duration |

**Profession Bonuses**: +25% cooking quality, +20% brewing quality, +20% trading yield, +15% farming yield, +10% all gathering speed
**Gathering Bonuses**: +10% HERB (plains), +10% FIBER (plains), +10% FISH (coast)

---

### Orc
*"Orc society is built on strength, combat honor, and the clan."*

- **Trait**: Savage Might -- raw physical power, unmatched in melee
- **Starting Towns**: Grakthar, Bonepile, Ironfist Hold, Thornback Camp, Ashen Market

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Intimidating Presence | Passive | Enemies -1 to first attack roll against you |
| 5 | Relentless Endurance | Passive | Once per combat, survive lethal blow at 1 HP |
| 10 | Blood Fury | Passive | +25% damage when below 50% HP |
| 15 | Warbeast Bond | Passive | Mounts get +20% combat stats |
| 25 | Clan Warhorn | Active (24h CD) | Party: +3 STR for 1 hour |
| 40 | Orcish Rampage | Passive | Bonus attack after killing an enemy |

**Profession Bonuses**: +30% hunting yield, +20% tanning quality, +20% leatherworking quality, +15% ranching speed, +10% combat loot yield
**Gathering Bonuses**: +15% HIDE (any), +10% ORE (mountain), +5% WOOD (any)

---

### Tiefling
*"Secrets are currency."*

- **Trait**: Infernal Legacy -- magically gifted with a dark edge
- **Starting Towns**: Nethermire, Boghollow, Mistwatch, Cinderkeep, Whispering Docks

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Hellish Resistance | Passive | Fire damage halved |
| 5 | Infernal Sight | Passive | See hidden/invisible players and traps |
| 10 | Dark Knowledge | Passive | +20% XP for Alchemy and Enchanting |
| 15 | Whispers of the Damned | Active (1h CD) | Read another player's equipment and stats |
| 25 | Infernal Rebuke | Passive | Melee attackers take 1d6 fire damage |
| 40 | Soul Bargain | Active (24h CD) | Sacrifice 25% HP for double next spell damage |

**Profession Bonuses**: +30% alchemy quality, +20% enchanting quality, +25% herbalism yield, +15% scribing quality
**Gathering Bonuses**: +15% ORE (underground), +10% HERB (underground), +5% STONE (underground)

---

### Dragonborn
*"Rare, respected, and feared."*

- **Trait**: Dragon Blood -- physically powerful with innate elemental magic
- **Starting Towns**: Drakenspire, Frostfang, Emberpeak, Scalehaven, Wyrmrest
- **Exclusive Zone**: Dragon Lairs
- **Sub-Races**: 7 draconic ancestries (see [Sub-Races](#a6-sub-races))

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Breath Weapon | Active (1/combat) | 2d6 AoE elemental damage (ancestry type) |
| 5 | Draconic Scales | Passive | +2 natural AC |
| 10 | Elemental Resistance | Passive | Half damage from ancestry element |
| 15 | Frightful Presence | Active (1/combat) | WIS save or enemies frightened |
| 25 | Dragon's Hoard | Passive | +20% gold from all sources |
| 40 | Ancient Wrath | Passive | Breath Weapon upgrades to 4d8, usable 2x per combat |

**Profession Bonuses**: +20% mining yield, +20% smelting quality, +15% hunting yield, +15% enchanting quality, +25% combat loot yield
**Gathering Bonuses**: +10% ORE (any), +10% STONE (mountain), +5% HIDE (any)

---

## A.4 Common Races (6)

### Half-Elf
*"Bridges across racial divides."*

- **Trait**: Dual Heritage -- exceptional charisma and social grace
- **Homeland**: The Twilight March
- **Key Abilities**: Fey Ancestry (sleep immune), Versatile Heritage (choose elf OR human ability), Paragon of Two Worlds (both at lvl 40)

### Half-Orc
*"What you DO matters more than what you ARE."*

- **Trait**: Relentless -- strong and surprisingly quick
- **Homeland**: The Scarred Frontier
- **Key Abilities**: Savage Attacks (extra crit die), Unstoppable Force (3 auto-hit attacks at lvl 40)

### Gnome
*"Endlessly curious people who live in elaborate burrow-cities."*

- **Trait**: Inventive Mind -- brilliant intellect, tiny stature
- **Homeland**: The Clockwork Warrens
- **Key Abilities**: Tinker's Insight (+15% quality tier upgrade chance), Eureka Moment (instant craft), Grand Innovation (weekly unique bonus property at lvl 40)

### Merfolk
*"In water, they are unmatched."*

- **Trait**: Amphibious -- breathes water and air, slower on land
- **Homeland**: The Pelagic Depths
- **Special Mechanics**: 15% land speed penalty, access to underwater zones with exclusive resources (Deep Sea Iron, Abyssal Pearls, Living Coral, Sea Silk, Leviathan Bone, Tideweave Kelp)
- **Key Abilities**: Waterborne (underwater zone access), Tidal Surge (water AoE), Abyssal Harvest (exclusive deep-sea gathering at lvl 40)

### Beastfolk
*"Hunters, trackers, and rangers without equal."*

- **Trait**: Primal Instinct -- physically gifted with supernatural senses
- **Homeland**: The Thornwilds
- **Exclusive Zone**: Deep Thornwilds
- **Sub-Races**: 6 clans (Wolf, Bear, Fox, Hawk, Panther, Boar) with different bonuses
- **Key Abilities**: Predator's Senses (detect hidden resources), Beast Form (transform for combat bonuses), Alpha Pack (party hunting buff at lvl 40)

### Faefolk
*"Playing as Faefolk is the game's hard mode."*

- **Trait**: Fey Nature -- impossibly agile and magically gifted, fragile as glass
- **Homeland**: The Feywild Threshold
- **Special Mechanics**: Access to Feywild zones (Moonpetal Flowers, Dreamweave Silk, Starlight Dust, Fey Iron), NEGATIVE profession bonuses for physical crafting (blacksmithing, armoring, mining, masonry)
- **Key Abilities**: Flutter (bypass terrain), Glamour (shape perception), Feywild Step (teleport), Wild Magic Surge (random powerful effect at lvl 40)

---

## A.5 Exotic Races (7)

### Goliath
*"In the merciless heights, only the strong survive."*

- **Trait**: Mountain Born -- immense physical power
- **Homeland**: The Skyspire Peaks
- **Key Abilities**: Stone's Endurance (1d12+CON damage reduction), Powerful Build (double carry weight, wield 2H weapons in 1 hand), Titan's Grip (+1d8 melee damage at lvl 40)

### Drow (Dark Elf)
*"Master poisoners, shadow mages, and the finest spider-silk weavers."*

- **Trait**: Shadowborn -- agile and magically potent, weakened by direct sunlight
- **Homeland**: The Underdark
- **Special Mechanics**: Sunlight Sensitivity (penalties during daytime on surface), access to Underdark zones with exclusive resources (Darksteel Ore, Spider Silk, Gloomcap Mushrooms, Shadow Crystals, Underdark Pearls)
- **Key Abilities**: Superior Darkvision, Shadow Step, Matriarch's Command (mass fear at lvl 40)

### Firbolg
*"They can speak to plants and animals."*

- **Trait**: Nature's Guardian -- immense wisdom and nature connection
- **Homeland**: The Eldergrove
- **Key Abilities**: Speech of Beast and Leaf (animal/plant intel), Nature's Bounty (+30% gathering yield), Guardian Form (treant transformation at lvl 40)
- **Trade-off**: Negative bonuses for mining, smelting, and building professions

### Warforged
*"They don't eat, sleep, or breathe -- but they do need maintenance."*

- **Trait**: Living Construct -- repaired, not healed
- **Homeland**: The Foundry
- **Special Mechanics**: No food or rest required, but needs daily maintenance (1% stat degradation per day without), cannot be a Healer profession
- **Key Abilities**: Constructed Resilience (disease/poison immune), Tireless Worker (+50% crafting queue capacity), Overclock (2x crafting speed with breakdown risk), Siege Mode (massive combat form at lvl 40)

### Genasi
*"Walking fonts of elemental magic."*

- **Trait**: Elemental Soul -- balanced with strong elemental affinity
- **Homeland**: The Confluence
- **Sub-Races**: 4 elements (Fire, Water, Earth, Air) with element-specific profession and combat bonuses
- **Key Abilities**: Elemental Resistance, Elemental Crafting (+quality for element-matching items), Primordial Awakening (major elemental transformation at lvl 40)

### Revenant
*"Fully conscious, fully sentient, and fully annoyed at being perpetually stuck."*

- **Trait**: Deathless -- extraordinarily hard to kill
- **Homeland**: The Ashenmoor
- **Special Mechanics**: 50% reduced death penalty (gold/XP loss), 50% faster respawn
- **Key Abilities**: Undying (auto-revive once per combat), Life Drain (heal from damage dealt), Army of the Dead (summon fallen enemies at lvl 40)

### Changeling
*"If you need to know something, find a Changeling. If you can."*

- **Trait**: Shapechanger -- supreme social manipulators
- **Homeland**: None (no starting towns -- can start in any race's town with no racial penalties)
- **Special Mechanics**: The Veil Network (unlocked at lvl 25 -- buy and sell intelligence)
- **Key Abilities**: Change Appearance (impersonate any race), Read Person (see NPC disposition), Master of Many Faces (assume racial abilities of impersonated race at lvl 40)

---

## A.6 Sub-Races

### Dragonborn Ancestries (7)

| Ancestry | Element | Resistance | Breath Shape |
|----------|---------|------------|--------------|
| Red | Fire | Fire | 15ft Cone |
| Blue | Lightning | Lightning | 30ft Line |
| White | Cold | Cold | 15ft Cone |
| Black | Acid | Acid | 30ft Line |
| Green | Poison | Poison | 15ft Cone |
| Gold | Radiant | Radiant | 15ft Cone |
| Silver | Cold | Cold | 30ft Line |

### Beastfolk Clans (6)
Wolf, Bear, Fox, Hawk, Panther, Boar -- each grants different stat emphasis and Beast Form transformation bonuses.

### Genasi Elements (4)
Fire, Water, Earth, Air -- each provides element-specific crafting bonuses, combat abilities, and gathering advantages.

---

## A.7 Classes & Specializations

There are **6 classes**, each with **3 specializations** (chosen at level 10, permanent). Each specialization has **6 abilities** unlocked through a skill tree using skill points. **108 total abilities** across all classes.

### Warrior
> Melee powerhouse. Choose between raw damage, tanking, or group support.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Berserker** | DPS (rage/damage) | Reckless Strike, Blood Rage, Cleave, Frenzy, Berserker Rage, Undying Fury |
| **Guardian** | Tank (shield) | Shield Bash, Fortify, Taunt, Shield Wall, Iron Bulwark, Unbreakable |
| **Warlord** | Support (buffs) | Rally Cry, Commanding Strike, Tactical Advance, Inspiring Presence, Warlord's Decree, Legendary Commander |

### Mage
> Ranged spellcaster. Choose between elemental destruction, death magic, or crowd control.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Elementalist** | AoE DPS | Fireball, Frost Lance, Chain Lightning, Elemental Shield, Meteor Strike, Arcane Mastery |
| **Necromancer** | DoT/Drain | Life Drain, Shadow Bolt, Corpse Explosion, Bone Armor, Soul Harvest, Lichdom |
| **Enchanter** | Control/Debuff | Arcane Bolt, Enfeeble, Haste, Mana Siphon, Polymorph, Spell Weaver |

### Rogue
> Agile striker. Choose between burst assassination, resource theft, or sustained melee.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Assassin** | Burst DPS | Backstab, Vanish, Poison Blade, Ambush, Death Mark, Shadow Mastery |
| **Thief** | Utility/Economy | Pilfer, Smoke Bomb, Quick Fingers, Disengage, Mug, Treasure Sense |
| **Swashbuckler** | Sustained Melee | Riposte, Dual Strike, Evasion, Flurry of Blades, Dance of Steel, Untouchable |

### Cleric
> Divine caster. Choose between healing, holy combat, or punishing magic.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Healer** | Healing/Support | Healing Light, Purify, Regeneration, Divine Shield, Resurrection, Miracle |
| **Paladin** | Holy Tank/DPS | Smite, Holy Armor, Consecrate, Judgment, Divine Wrath, Avatar of Light |
| **Inquisitor** | Offensive Caster | Denounce, Penance, Silence, Purging Flame, Excommunicate, Inquisitor's Verdict |

### Ranger
> Ranged/nature hybrid. Choose between pet combat, marksmanship, or trap control.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Beastmaster** | Pet DPS | Call Companion, Wild Bond, Pack Tactics, Bestial Fury, Alpha Predator, Spirit Bond |
| **Sharpshooter** | Ranged DPS | Aimed Shot, Multi-Shot, Piercing Arrow, Headshot, Rain of Arrows, Eagle's Eye |
| **Tracker** | Control/Traps | Lay Trap, Snare, Hunter's Mark, Explosive Trap, Predator Instinct, Master Tracker |

### Bard
> Social/hybrid class. Choose between diplomacy, combat support, or knowledge.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Diplomat** | Social/Buff | Charming Words, Silver Tongue, Soothing Presence, Diplomat's Gambit, Enthrall, Legendary Charisma |
| **Battlechanter** | Combat Support | War Song, Discordant Note, Marching Cadence, Shatter, Crescendo, Epic Finale |
| **Lorekeeper** | Intel/Debuff | Analyze, Recall Lore, Exploit Weakness, Arcane Insight, Tome of Secrets, Omniscient |

---

## A.8 Technical: Character System

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `shared/src/data/races/index.ts` | 71 | Race registry, helper functions (getRace, getRacesByTier, etc.) |
| `shared/src/data/races/core/*.ts` | 7 files | Core race definitions (human, elf, dwarf, halfling, orc, tiefling, dragonborn) |
| `shared/src/data/races/common/*.ts` | 6 files | Common race definitions (halfElf, halfOrc, gnome, merfolk, beastfolk, faefolk) |
| `shared/src/data/races/exotic/*.ts` | 7 files | Exotic race definitions (goliath, drow, firbolg, warforged, genasi, revenant, changeling) |
| `shared/src/types/race.ts` | ~60 | Type definitions: RaceDefinition, StatModifiers, RacialAbility, SubRaceOption |
| `shared/src/data/skills/index.ts` | 45 | Class ability registry, VALID_CLASSES, SPECIALIZATIONS map |
| `shared/src/data/skills/warrior.ts` | ~180 | 18 warrior abilities across 3 specializations |
| `shared/src/data/skills/mage.ts` | ~180 | 18 mage abilities across 3 specializations |
| `shared/src/data/skills/rogue.ts` | ~180 | 18 rogue abilities across 3 specializations |
| `shared/src/data/skills/cleric.ts` | ~180 | 18 cleric abilities across 3 specializations |
| `shared/src/data/skills/ranger.ts` | ~180 | 18 ranger abilities across 3 specializations |
| `shared/src/data/skills/bard.ts` | ~180 | 18 bard abilities across 3 specializations |
| `server/src/routes/characters.ts` | 311 | Character creation/management API |
| `server/src/routes/skills.ts` | 292 | Skill tree/specialization API |

### API Endpoints

**Character Management** (`server/src/routes/characters.ts`)
- `POST /characters/create` -- Create character (name 3-20 chars, race, class, subRace?, startingTown). Base stats = 10 + race modifiers. HP = 10 + CON modifier + class bonus. Starting gold: core=100, common=75, exotic=50.
- `GET /characters/me` -- Get authenticated player's character
- `GET /characters/:id` -- Get public character view
- `POST /characters/allocate-stats` -- Spend unspentStatPoints. CON gives +2 HP per point, INT/WIS gives +1 mana.

**Skill System** (`server/src/routes/skills.ts`)
- `GET /skills/tree` -- Full skill tree with unlocked/canUnlock status per ability
- `POST /skills/specialize` -- Choose specialization (requires level 10, one-time only)
- `POST /skills/unlock` -- Unlock ability (validates class, specialization, prerequisites, level, skill points)
- `GET /skills/abilities` -- Get unlocked abilities for use in combat

### Data Flow
1. Client sends `POST /characters/create` with `{ name, race, class, subRace?, startingTown }`
2. Server validates race exists in `RaceRegistry`, validates startingTown is in race's `startingTowns` array
3. Stats computed: base 10 + `RaceRegistry[race].statModifiers`
4. HP computed: `10 + getModifier(stats.con) + CLASS_HP_BONUS[class]`
5. Character saved to database with starting gold based on tier
6. At level 10, `POST /skills/specialize` locks in specialization permanently
7. Skill points earned per level are spent via `POST /skills/unlock` following prerequisite chains

---

# B. World & Travel

## B.1 Regions

The world of Aethermere contains **21 regions** organized by race tier affinity:

### Core Regions (8)

| Region | Biome | Levels | Primary Race |
|--------|-------|--------|-------------|
| The Verdant Heartlands | Temperate Plains | 1-15 | Human |
| The Silverwood Forest | Ancient Forest | 1-15 | Elf |
| The Ironvault Mountains | Mountain/Underground | 1-15 | Dwarf |
| The Crossroads | Rolling Hills | 1-15 | Halfling |
| The Ashenfang Wastes | Volcanic Badlands | 5-20 | Orc |
| Shadowmere Marshes | Swamp/Bog | 5-20 | Tiefling |
| The Frozen Reaches | Arctic Tundra | 5-20 | Dragonborn |
| The Shattered Coast | Coastal | 1-10 | Neutral |

### Common Regions (6)

| Region | Biome | Levels | Primary Race |
|--------|-------|--------|-------------|
| The Twilight March | Border Forest | 5-20 | Half-Elf |
| The Scarred Frontier | War-torn Plains | 10-25 | Half-Orc |
| The Clockwork Warrens | Underground/Hills | 5-20 | Gnome |
| The Pelagic Depths | Ocean/Coastal | 10-30 | Merfolk |
| The Thornwilds | Dense Wilderness | 10-30 | Beastfolk |
| The Feywild Threshold | Magical Forest | 15-35 | Faefolk |

### Exotic Regions (7)

| Region | Biome | Levels | Primary Race |
|--------|-------|--------|-------------|
| The Skyspire Peaks | Extreme Mountain | 20-40 | Goliath |
| The Underdark | Deep Underground | 20-40 | Drow |
| The Eldergrove | Primeval Forest | 15-35 | Firbolg |
| The Foundry | Ancient Ruins/Industrial | 20-40 | Warforged |
| The Confluence | Elemental Nexus | 20-40 | Genasi |
| The Ashenmoor | Deathlands | 25-45 | Revenant |
| The Wandering Paths | Varies | 10-50 | Changeling |

---

## B.2 Towns

The world contains **69 towns** spread across all 21 regions. Each town has:

- **Population**: Affects marketplace activity and available NPCs
- **Biome**: Determines which resources can be gathered nearby
- **Specialty**: Unique economic focus (e.g., "Mining", "Enchanting", "Trade Hub")
- **Available Buildings**: Determines which crafting workshops and services exist
- **Prosperity Level** (1-5): Affects resource availability and tax rates
- **Coordinates** (x, y): Used for travel distance calculation

### Starting Towns by Race

| Race | Towns |
|------|-------|
| Human | Kingshold, Millhaven, Bridgewater, Ironford, Whitefield |
| Elf | Aelindra, Moonhaven, Thornwatch, Willowmere, Eldergrove |
| Dwarf | Kazad-Vorn, Deepvein, Hammerfall, Gemhollow, Alehearth |
| Halfling | Hearthshire, Greenhollow, Peddler's Rest, Bramblewood, Riverside |
| Orc | Grakthar, Bonepile, Ironfist Hold, Thornback Camp, Ashen Market |
| Tiefling | Nethermire, Boghollow, Mistwatch, Cinderkeep, Whispering Docks |
| Dragonborn | Drakenspire, Frostfang, Emberpeak, Scalehaven, Wyrmrest |
| Changeling | *(None -- can start in any town)* |

> Common and Exotic races have 3-5 starting towns each in their homeland regions.

### Town Buildings

Towns may contain any combination of: Forge, Workshop, Tannery, Alchemy Lab, Enchanting Tower, Kitchen, Brewery, Jeweler's Bench, Fletcher's Table, Mason's Yard, Scribe's Desk, Market, Bank, Stables, Inn, Healer's Ward, Courier Post.

---

## B.3 Travel System

Travel between towns follows established routes with real-time duration:

- **Base travel time**: `route.distance * 60 * 1000` milliseconds (distance in minutes)
- **War multiplier**: Travel near warring faction capitals takes 50% longer (`*1.5`)
- **Capital blocking**: Cannot travel to a capital that is currently under siege

### Travel Flow
1. Player initiates travel via `POST /travel/start` with destination town ID
2. Server validates route exists between current town and destination
3. Server checks active wars -- blocks travel to besieged capitals, applies 50% penalty near conflict zones
4. A TravelAction record is created with start time and calculated arrival time
5. Socket.io emits `player:leave-town` to notify other players
6. Player can check progress via `GET /travel/status` which auto-completes if time has elapsed
7. On arrival, server triggers quest VISIT objective checks
8. If the destination is in a new region, a border crossing event may trigger

> **Tip**: Plan routes carefully during wartime. The 50% travel penalty can add significant time, and besieged capitals are completely inaccessible.

---

## B.4 Technical: World & Travel

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `database/seeds/world.ts` | ~1200 | All 21 regions, 69 towns, and route definitions |
| `server/src/routes/travel.ts` | 365 | Travel initiation, status, arrival, border checks |
| `server/src/routes/world.ts` | 132 | Map data, region listings, game time |
| `server/src/routes/towns.ts` | 113 | Town details, buildings, characters in town |

### API Endpoints

**World Data** (`server/src/routes/world.ts`)
- `GET /world/map` -- All regions + towns + routes (cached 300s)
- `GET /world/regions` -- Region list with town counts (cached 300s)
- `GET /world/regions/:id` -- Single region with towns
- `GET /world/time` -- Game day/night cycle via `getGameTime()`

**Town Data** (`server/src/routes/towns.ts`)
- `GET /towns/:id` -- Town with region, resources, buildings, characters (cached 120s)
- `GET /towns/:id/buildings` -- Building list
- `GET /towns/:id/characters` -- Characters currently in town

**Travel** (`server/src/routes/travel.ts`)
- `POST /travel/start` -- Begin travel (validates route, checks war status)
- `GET /travel/status` -- Check progress (auto-completes if time elapsed)
- `POST /travel/arrive` -- Manual arrival completion
- `POST /travel/border-check` -- Border crossing event

### Travel Time Formula
```
travelTime = route.distance * 60 * 1000  (base, in ms)
warMultiplier = 1.5 if near warring capital, else 1.0
finalTime = travelTime * warMultiplier
```

---

# C. Economy & Professions

## C.1 Profession Overview

Every character can learn up to **3 professions** (Humans get a 4th via the Adaptable Crafter racial ability). There are **29 professions** across three categories:

| Category | Count | Professions |
|----------|-------|-------------|
| **Gathering** (7) | 7 | Farmer, Rancher, Fisherman, Lumberjack, Miner, Herbalist, Hunter |
| **Crafting** (15) | 15 | Smelter, Blacksmith, Armorer, Woodworker, Tanner, Leatherworker, Tailor, Alchemist, Enchanter, Cook, Brewer, Jeweler, Fletcher, Mason, Scribe |
| **Service** (7) | 7 | Merchant, Innkeeper, Healer, Stable Master, Banker, Courier, Mercenary Captain |

Professions level from 1-100 through XP earned by performing profession activities. Each profession has a **primary stat** that affects performance.

---

## C.2 Profession Tiers

As professions level up, they progress through 6 tiers that unlock new recipes, materials, and quality bonuses:

| Tier | Level Range | Title | Quality Bonus | Key Perks |
|------|------------|-------|---------------|-----------|
| **Apprentice** | 1-10 | Apprentice | +0 | Basic recipes, common materials, slow speed, Poor/Common quality |
| **Journeyman** | 11-25 | Journeyman | +0 | Intermediate recipes, uncommon materials, normal speed, can work independently |
| **Craftsman** | 26-50 | Craftsman | +2 | Advanced recipes, rare materials, faster speed |
| **Expert** | 51-75 | Expert | +5 | Expert recipes, exotic materials, much faster speed |
| **Master** | 76-90 | Master | +8 | Master recipes, legendary materials, can teach apprentices (XP bonus for both) |
| **Grandmaster** | 91-100 | Grandmaster | +12 | Legendary recipes, can create custom recipes, unique title and cosmetics |

> **Tip**: The jump from Expert (+5) to Master (+8) and then Grandmaster (+12) is where crafting quality really takes off. Master-tier crafters can also mentor Apprentices for mutual XP gain.

---

## C.3 Gathering Professions (7)

Gatherers extract raw resources from the world. Each profession targets specific resource types and benefits from certain biomes.

| Profession | Primary Stat | Resources | Preferred Biomes |
|-----------|-------------|-----------|-----------------|
| **Farmer** | CON | GRAIN, FIBER | Plains, Hills |
| **Rancher** | CON | ANIMAL_PRODUCT | Plains, Hills |
| **Fisherman** | DEX | FISH | Coastal, River |
| **Lumberjack** | STR | WOOD | Forest |
| **Miner** | STR | ORE, STONE | Mountain, Underground |
| **Herbalist** | WIS | HERB, REAGENT | Forest, Swamp |
| **Hunter** | DEX | HIDE, ANIMAL_PRODUCT | Forest, Mountain |

### Gathering Mechanics

1. Player starts gathering via `POST /work/start` at a town with the target resource
2. Town must have resource abundance >= 10 (depleted resources cannot be gathered)
3. **Gather time** is reduced by: profession level, racial bonuses, and tool quality
4. On collection (`POST /work/collect`):
   - **Base yield**: 1-3 units
   - **d20 roll** scaled by profession level determines bonus yield
   - **Modifiers**: racial gathering bonuses, tool bonuses, resource abundance
   - **XP earned**: `10 + (tier - 1) * 5`
   - Town resource depleted by 2 per gather (regenerates over time)
   - Tool durability decremented
5. If cancelled after 50%+ completion, player gets partial yield

### Resource-to-Profession Map

| Profession | Resource Types |
|-----------|---------------|
| Miner | ORE, STONE |
| Lumberjack | WOOD |
| Farmer | GRAIN, FIBER |
| Herbalist | HERB, REAGENT |
| Fisherman | FISH |
| Hunter | HIDE, ANIMAL_PRODUCT |

---

## C.4 Crafting Professions (15)

Crafters transform raw materials into finished goods. Each requires specific input resources and produces specific outputs.

| Profession | Stat | Inputs | Outputs |
|-----------|------|--------|---------|
| **Smelter** | CON | ORE | INGOT, ALLOY |
| **Blacksmith** | STR | INGOT | WEAPON, TOOL |
| **Armorer** | STR | INGOT, LEATHER | ARMOR, SHIELD |
| **Woodworker** | DEX | WOOD | BOW, STAFF, FURNITURE |
| **Tanner** | CON | HIDE | LEATHER |
| **Leatherworker** | DEX | LEATHER | LIGHT_ARMOR, BAGS |
| **Tailor** | DEX | FIBER, SILK | CLOTH_ARMOR, CLOTHING |
| **Alchemist** | INT | HERB, REAGENT | POTION, ELIXIR |
| **Enchanter** | INT | REAGENT, GEM | ENCHANTMENT, SCROLL |
| **Cook** | WIS | GRAIN, FISH, ANIMAL_PRODUCT | FOOD (buff items) |
| **Brewer** | WIS | GRAIN, HERB | DRINK (buff items) |
| **Jeweler** | DEX | GEM, INGOT | RING, AMULET, CIRCLET |
| **Fletcher** | DEX | WOOD, FEATHER | ARROW, BOLT, BOW |
| **Mason** | STR | STONE, INGOT | BUILDING_MATERIAL |
| **Scribe** | INT | REAGENT, FIBER | SCROLL, BOOK, MAP |

### Crafting Mechanics

1. Player views available recipes via `GET /crafting/recipes` (shows canCraft flag and missing ingredients)
2. Start crafting via `POST /crafting/start`:
   - Validates profession tier meets recipe requirements
   - Workshop building required for Journeyman+ tier recipes (specific building type per profession)
   - Racial material reduction may apply (e.g., Dwarf uses fewer ingots for blacksmithing)
   - Ingredient quality bonus cascades into the craft
   - Craft time reduced by: profession level, workshop tier, racial speed bonuses, Warforged Overclock ability
3. Collect via `POST /crafting/collect`:
   - **Quality roll** = profession level + tool bonus + workshop bonus + racial quality bonus + tier quality bonus
   - Roll determines item quality: POOR, COMMON, FINE, SUPERIOR, MASTERWORK, or LEGENDARY
   - Item created in inventory, XP awarded, achievement checks triggered
4. **Batch crafting** via `POST /crafting/queue`: Queue 1-10 items, processed sequentially. Queue slot limits apply (Warforged get bonus slots via Tireless Worker).

---

## C.5 Service Professions (7)

Service professions interact with game systems rather than creating items.

| Profession | Stat | Service |
|-----------|------|---------|
| **Merchant** | CHA | Better marketplace rates, bulk trading, caravan routes |
| **Innkeeper** | CHA | Rest bonuses, room rental income, tavern events |
| **Healer** | WIS | Healing services, cure ailments, resurrection assistance |
| **Stable Master** | WIS | Mount care, speed bonuses, breeding |
| **Banker** | INT | Interest income, loans, secure storage |
| **Courier** | DEX | Faster travel, mail delivery, item transport |
| **Mercenary Captain** | CHA | Hire NPCs, bounty hunting, protection contracts |

### Tier Progression Examples (Service)

**Merchant**: Apprentice (basic sales) -> Journeyman (bulk deals) -> Craftsman (trade routes) -> Expert (import/export) -> Master (monopolies) -> Grandmaster (trade empires)

**Healer**: Apprentice (bandaging) -> Journeyman (herbal remedies) -> Craftsman (magical healing) -> Expert (cure diseases) -> Master (resurrection) -> Grandmaster (divine miracles)

---

## C.6 Quality System

Crafted items have one of six quality tiers that affect their stats:

| Quality | Rarity | Effect |
|---------|--------|--------|
| **Poor** | Common | Below-average stats |
| **Common** | Common | Baseline stats |
| **Fine** | Uncommon | Slightly above average |
| **Superior** | Rare | Noticeably better |
| **Masterwork** | Very Rare | Significantly enhanced |
| **Legendary** | Legendary | Best possible stats, may have unique properties |

### Quality Roll Factors

The quality of a crafted item is determined by a composite roll:

```
qualityScore = professionLevel
             + toolQualityBonus
             + workshopTierBonus
             + racialQualityBonus
             + professionTierBonus (0/0/+2/+5/+8/+12)
             + ingredientQualityBonus (cascading from input quality)
```

Higher-quality ingredients produce higher-quality outputs -- creating valuable supply chains where a Master Smelter producing Superior ingots feeds a Grandmaster Blacksmith making Legendary weapons.

---

## C.7 Marketplace

Every town with a Market building allows player-to-player trading.

### Listing Items
- List via `POST /market/list` -- items have a 7-day listing duration
- Listed items are removed from inventory until sold or cancelled
- Cancel via `POST /market/cancel` (items returned to inventory)

### Buying Items
- Browse via `GET /market/browse` -- filterable by item type, price range, rarity, and search text
- Results are paginated, sortable, and cached for 30 seconds
- **Tax rate** is calculated via `getEffectiveTaxRate()` (based on town prosperity and political factors)
- Tax is deposited into the town treasury (fuels building upgrades and NPC services)

### Trade Restrictions
- Certain faction relationships create **embargoes** blocking trade
- Halfling racial ability "Trade Network" grants global price visibility across all towns
- Halfling racial ability "Silver Tongue" gives 5% buy discount and 5% sell premium

### Price History
- `GET /market/history` provides price history up to 365 days for economic analysis
- `GET /market/my-listings` shows active listings for the authenticated player

---

## C.8 Racial Profession Bonuses

Every race has innate bonuses to specific professions. Below are the strongest racial-profession synergies:

| Race | Best Profession Synergy | Bonus |
|------|------------------------|-------|
| **Human** | All professions | +10% XP, +5% crafting speed (generalist) |
| **Elf** | Herbalism | +25% yield |
| **Elf** | Enchanting | +20% quality |
| **Dwarf** | Mining | +30% yield |
| **Dwarf** | Blacksmithing / Armoring | +25% quality |
| **Halfling** | Cooking | +25% quality |
| **Orc** | Hunting | +30% yield |
| **Tiefling** | Alchemy | +30% quality |
| **Dragonborn** | Combat Loot | +25% yield |
| **Gnome** | *(all crafting via Tinker's Insight)* | +15% quality tier upgrade chance |
| **Merfolk** | Fishing (exclusive deep-sea resources) | Underwater access |
| **Firbolg** | Gathering (Nature's Bounty) | +30% all gathering yield |
| **Warforged** | Crafting queue | +50% capacity (Tireless Worker) |
| **Faefolk** | Magic crafting (Enchanting, Alchemy) | High quality, but negative physical crafting |

---

## C.9 Technical: Economy

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `shared/src/data/professions/types.ts` | 39 | ProfessionType union (29 types), ProfessionDefinition interface |
| `shared/src/data/professions/tiers.ts` | 75 | 6-tier progression definitions with perks |
| `shared/src/data/professions/gathering.ts` | ~200 | 7 gathering profession definitions |
| `shared/src/data/professions/crafting.ts` | ~400 | 15 crafting profession definitions |
| `shared/src/data/professions/service.ts` | ~200 | 7 service profession definitions |
| `server/src/routes/work.ts` | 767 | Gathering system (start, status, collect, cancel, professions) |
| `server/src/routes/crafting.ts` | 920 | Crafting system (recipes, start, status, collect, queue) |
| `server/src/routes/market.ts` | 542 | Marketplace (list, browse, buy, cancel, history) |

### API Endpoints

**Gathering** (`server/src/routes/work.ts`)
- `POST /work/start` -- Begin gathering (checks travel/gather/craft conflicts, validates resource in town, checks abundance >= 10, applies time bonuses)
- `GET /work/status` -- Check gathering progress
- `POST /work/collect` -- Complete gathering (yield calculation, XP award, resource depletion, tool durability, quest/achievement checks)
- `POST /work/cancel` -- Cancel (50%+ = partial yield)
- `GET /work/professions` -- List character's professions

**Crafting** (`server/src/routes/crafting.ts`)
- `GET /crafting/recipes` -- Available recipes with canCraft/missingIngredients check
- `POST /crafting/start` -- Begin crafting (tier validation, workshop requirement, racial material reduction, quality bonuses, time bonuses)
- `GET /crafting/status` -- Check craft progress
- `POST /crafting/collect` -- Complete craft (quality roll, item creation, XP, achievements)
- `POST /crafting/queue` -- Batch craft 1-10 items (queue slot limits, sequential processing)
- `GET /crafting/queue` -- View craft queue

**Marketplace** (`server/src/routes/market.ts`)
- `POST /market/list` -- List item for sale (7-day duration, removed from inventory)
- `GET /market/browse` -- Search listings (type, price, rarity, search; paginated, cached 30s)
- `POST /market/buy` -- Purchase (embargo check, tax calc, atomic gold transfer + inventory + price history + treasury)
- `POST /market/cancel` -- Cancel listing (items returned)
- `GET /market/my-listings` -- Active listings
- `GET /market/history` -- Price history (up to 365 days)

### Yield Calculation (Gathering)
```
baseYield = random(1, 3)
d20Roll = d20() + (professionLevel / 5)
bonusYield = floor(d20Roll / 5)
racialBonus = race.gatheringBonuses[resourceType][biome] / 100
toolBonus = tool?.gatheringBonus ?? 0
abundanceMultiplier = townResourceAbundance / 100
finalYield = floor((baseYield + bonusYield) * (1 + racialBonus + toolBonus) * abundanceMultiplier)
XP = 10 + (resourceTier - 1) * 5
townResourceAbundance -= 2  // depletion
```

---

# D. Combat System

## D.1 Combat Overview

Realm of Crowns uses a **turn-based combat engine** with **d20 mechanics**. Combat is resolved through pure functions -- no database calls during resolution. All state is passed in and returned.

### Combat Types

| Type | Description |
|------|-------------|
| **PVE** | Player vs. Environment (monsters) |
| **PVP** | Player vs. Player (1v1 duels) |
| **DUEL** | Formal duel with stakes |
| **ARENA** | Tournament combat |
| **WAR** | Faction warfare |

### Combat Flow
1. **Initiative**: All combatants roll 1d20 + DEX modifier. Sorted descending. DEX breaks ties, then random.
2. **Turn order**: Each combatant acts in initiative order. One action per turn.
3. **Actions available**: Attack, Cast, Defend, Item, Flee, Racial Ability
4. **Status effects**: Processed at the start of each combatant's turn (DoT/HoT damage, duration countdown)
5. **Combat ends** when one team is eliminated or all members of a team have fled

---

## D.2 Core Formulas

### Attack Roll
```
attackRoll = d20()
attackTotal = attackRoll + getModifier(attacker.stats[weapon.attackModifierStat]) + weapon.bonusAttack + statusEffectModifiers + racialAttackBonus
hit = attackTotal >= targetAC
critical = attackRoll == 20  (natural 20 always hits)
```

### Armor Class (AC)
```
AC = BASE_AC(10) + getModifier(stats.dex)    // or equipment AC if higher
   + DEFEND_BONUS(+2 if defending)
   + sum(statusEffect.acModifier for each active effect)
   + racialPassive.acBonus
```

### Damage
```
damage = roll(weapon.diceCount * weapon.diceSides) + getModifier(stats[weapon.damageModifierStat]) + weapon.bonusDamage
criticalDamage = damage * 2  (double dice)
```

### Stat Modifier
```
modifier = floor((stat - 10) / 2)
// Examples: stat 10 = +0, stat 14 = +2, stat 18 = +4, stat 8 = -1
```

### Spell Save DC
```
saveDC = 8 + getModifier(caster.stats[spell.castingStat]) + proficiencyBonus
saveRoll = d20() + getModifier(target.stats[spell.saveType]) + statusSaveModifiers
saved = saveRoll >= saveDC
```

### Flee Check
```
fleeRoll = d20() + getModifier(stats.dex)
success = fleeRoll >= DEFAULT_FLEE_DC(10)
```

---

## D.3 Status Effects

There are **12 status effects** in the combat system. Effects are processed at the start of each combatant's turn.

| Effect | Prevents Action | DoT/HoT | ATK Mod | AC Mod | Save Mod | Description |
|--------|:-:|:-:|:-:|:-:|:-:|-------------|
| **Poisoned** | No | 3 dmg/rd | -2 | 0 | 0 | Ongoing poison damage, weakened attacks |
| **Stunned** | **Yes** | 0 | 0 | -2 | -4 | Cannot act, vulnerable |
| **Blessed** | No | 0 | +2 | 0 | +2 | Enhanced accuracy and resilience |
| **Burning** | No | 5 dmg/rd | 0 | 0 | 0 | Fire damage each round |
| **Frozen** | **Yes** | 0 | 0 | -4 | -2 | Cannot act, very vulnerable to attacks |
| **Paralyzed** | **Yes** | 0 | 0 | -4 | -4 | Cannot act, extremely vulnerable |
| **Blinded** | No | 0 | -4 | -2 | 0 | Severely reduced accuracy |
| **Shielded** | No | 0 | 0 | +4 | 0 | Major AC boost |
| **Weakened** | No | 0 | -3 | 0 | -2 | Reduced attack and saves |
| **Hasted** | No | 0 | +2 | +2 | 0 | Faster: better accuracy and evasion |
| **Slowed** | No | 0 | -2 | -2 | -2 | Debuff to everything |
| **Regenerating** | No | +5 heal/rd | 0 | 0 | 0 | Heal 5 HP each round |

> **Key interactions**: Stunned, Frozen, and Paralyzed all prevent actions -- CC chains are devastating. Poisoned has DoT plus an attack penalty. Burning does the most DoT damage (5/rd vs poison's 3/rd) but has no other penalties. Shielded (+4 AC) is the strongest defensive buff.

---

## D.4 PvE Combat

### Encounter Generation
When a player initiates PvE combat (`POST /combat-pve/start`), the server:
1. Selects a random monster from the player's current region
2. Monster level is within +/- 3 of the player's level
3. Builds a CombatState with player and monster as combatants
4. State is stored in **Redis** (key: `combat:pve:{sessionId}`, TTL: 1 hour) with an in-memory Map fallback

### Monster AI
Monster behavior is simple: attack a random living enemy each turn. Monsters do not use special abilities, items, or flee.

### Turn Resolution
1. Player submits action via `POST /combat-pve/action`
2. Server auto-resolves all monster turns that precede the player in initiative order
3. Player's action is resolved
4. Server checks if combat has ended (one side eliminated)
5. Updated state returned to client

### PvE Rewards (Victory)
| Reward | Formula |
|--------|---------|
| **XP** | `monster.level * 25` |
| **Gold** | Random from monster's loot table |
| **Items** | Random drops based on monster type and level |
| **Quest Progress** | KILL objective checks triggered |

---

## D.5 PvP Combat

### PvP Rules and Restrictions

| Rule | Value |
|------|-------|
| Maximum level difference | 5 levels |
| Challenge cooldown | 30 minutes |
| Wager tax rate | 5% |
| XP per opponent level | 50 |
| Must be in same town | Yes |
| Both players must be active | Yes |

### PvP Flow
1. **Challenge**: Player A sends challenge (`POST /combat-pvp/challenge`) to Player B. Can include a gold wager.
2. **Accept/Decline**: Player B accepts (`POST /combat-pvp/accept`) or declines (`POST /combat-pvp/decline`).
3. **Combat**: Turn-based combat identical to PvE mechanics. State stored in Redis (key: `combat:pvp:{sessionId}`).
4. **Resolution**: Each action submitted via `POST /combat-pvp/action`. Turns are logged to the database.
5. **Finalize**: Winner receives XP + wager winnings (minus 5% tax). Both players heal to full HP after combat.

### Leaderboard
`GET /combat-pvp/leaderboard` returns player rankings sorted by win rate (wins, losses, winRate).

---

## D.6 Death & Penalties

When a player character dies in PvE combat:

| Penalty | Value |
|---------|-------|
| **Gold lost** | 10% of current gold |
| **XP lost** | 50 XP per character level |
| **Equipment durability** | 10 durability damage to ALL equipped items |
| **Respawn** | Teleported to nearest town |

```
Constants from combat-engine.ts:
DEATH_GOLD_LOSS_PERCENT = 10
DEATH_XP_LOSS_PER_LEVEL = 50
DEATH_DURABILITY_DAMAGE = 10
```

**Revenant racial bonus**: 50% reduced death penalty (5% gold, 25 XP/level, 5 durability) and 50% faster respawn time.

> **Tip**: Keep your equipment repaired and avoid fighting monsters more than 3 levels above you. The XP and durability penalties scale with level and can set you back significantly at higher levels.

---

## D.7 Racial Combat Abilities

Several races have abilities that integrate directly into the combat engine:

| Race | Ability | Combat Effect |
|------|---------|--------------|
| **Orc** | Intimidating Presence | Enemies -1 to first attack roll |
| **Orc** | Relentless Endurance | Survive lethal blow at 1 HP (1/combat) |
| **Orc** | Blood Fury | +25% damage below 50% HP |
| **Orc** | Orcish Rampage | Bonus attack on kill |
| **Elf** | Elven Accuracy | Advantage on ranged attacks (2d20 take higher) |
| **Dwarf** | Dwarven Resilience | +3 to poison saving throws |
| **Dwarf** | Ancestral Fury | Below 25% HP: +5 STR, +5 CON |
| **Human** | Indomitable Will | Reroll failed saving throw (1/combat) |
| **Halfling** | Halfling Luck | Reroll any d20 (1/day) |
| **Tiefling** | Hellish Resistance | Fire damage halved |
| **Tiefling** | Infernal Rebuke | Melee attackers take 1d6 fire |
| **Tiefling** | Soul Bargain | Sacrifice 25% HP for 2x spell damage |
| **Dragonborn** | Breath Weapon | 2d6 AoE (upgrades to 4d8 at lvl 40) |
| **Dragonborn** | Draconic Scales | +2 natural AC |
| **Dragonborn** | Frightful Presence | AoE frighten (WIS save) |
| **Goliath** | Stone's Endurance | Reduce damage by 1d12+CON |
| **Goliath** | Powerful Build | Wield 2H weapons in 1 hand |
| **Goliath** | Titan's Grip | +1d8 melee damage |
| **Half-Orc** | Savage Attacks | Extra die on critical hits |
| **Half-Orc** | Unstoppable Force | 3 auto-hit attacks |
| **Beastfolk** | Beast Form | Combat transformation (clan-specific) |
| **Revenant** | Undying | Auto-revive once per combat |
| **Revenant** | Life Drain | Heal from damage dealt |

The combat engine integrates racial abilities through the `racial-combat-abilities` service, which provides:
- `getPassiveModifiers()` -- AC, attack, and damage bonuses from racial passives
- `resolveRacialAbility()` -- Active racial ability resolution
- `checkDeathPrevention()` -- Orc Relentless Endurance / Revenant Undying
- `checkBonusAttackOnKill()` -- Orc Rampage
- `checkMeleeReflect()` -- Tiefling Infernal Rebuke
- `checkAutoHit()` -- Half-Orc Unstoppable Force

---

## D.8 Technical: Combat

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `shared/src/types/combat.ts` | 263 | All combat type definitions (shared between server and client) |
| `server/src/lib/combat-engine.ts` | ~600 | Pure-function combat engine (initiative, AC, damage, status effects, action resolvers) |
| `server/src/routes/combat-pve.ts` | 669 | PvE combat routes (start, action, state) |
| `server/src/routes/combat-pvp.ts` | 938 | PvP combat routes (challenge, accept, decline, action, state, leaderboard) |
| `server/src/services/racial-combat-abilities.ts` | ~400 | Racial ability integration (passives, actives, death prevention) |
| `server/src/services/racial-passive-tracker.ts` | ~100 | Beastfolk natural weapons, passive tracking |

### API Endpoints

**PvE Combat** (`server/src/routes/combat-pve.ts`)
- `POST /combat-pve/start` -- Initiate PvE encounter (random monster from region, +/-3 levels)
- `POST /combat-pve/action` -- Submit player action (auto-resolves preceding monster turns)
- `GET /combat-pve/state` -- Get current combat state

**PvP Combat** (`server/src/routes/combat-pvp.ts`)
- `POST /combat-pvp/challenge` -- Challenge player (same town, level diff <=5, cooldown check, optional wager)
- `POST /combat-pvp/accept` -- Accept challenge (re-validates wager gold, builds combatants)
- `POST /combat-pvp/decline` -- Decline challenge
- `POST /combat-pvp/action` -- Submit action (turn-based, logged to DB)
- `GET /combat-pvp/state` -- Current combat state
- `GET /combat-pvp/challenges` -- Pending challenges
- `GET /combat-pvp/leaderboard` -- Win/loss rankings

### Combat State Storage
- **Redis** primary: key `combat:pve:{sessionId}` or `combat:pvp:{sessionId}`, TTL 1 hour
- **In-memory Map** fallback: used when Redis is unavailable
- State includes: session ID, type, status, round number, turn index, all combatants, turn order, full log, winning team

### Architecture: Pure Function Design
The combat engine (`combat-engine.ts`) is designed as pure functions:
- All functions take state as input and return new state as output
- No side effects, no database calls, no external service calls
- This makes the engine testable, deterministic (given dice rolls), and reusable across PvE/PvP/Arena/War
- Racial abilities are injected via the `RacialCombatTracker` parameter, keeping the core engine race-agnostic

---

*Document generated from source audit of the Realm of Crowns codebase.*
*Files audited: 40+ source files across shared/src/data/, shared/src/types/, server/src/routes/, server/src/lib/, server/src/services/, database/seeds/.*
# Part 3: Political, Social, Quest & Progression Systems

---

## A. Political System

### A.1 Election System

**Source**: `server/src/routes/elections.ts` (593 lines), `server/src/jobs/election-lifecycle.ts` (319 lines)

#### Player Guide: Running for Office

Elections in Realm of Crowns are automatic and cyclical. Every town holds periodic mayor elections, and kingdoms hold ruler elections. Here is how the full lifecycle works from a player's perspective:

1. **Nomination Phase (24 hours)**: When an election opens, any eligible resident can nominate themselves. You can submit an optional campaign platform (up to 2,000 characters). You must be a resident of the town to run for mayor, or already be a mayor to run for kingdom ruler.
2. **Voting Phase (48 hours from election start)**: After nominations close, voting opens. Each character gets exactly one vote per election. You cannot vote for yourself. You must be a resident of the town to vote in its mayor election.
3. **Results**: The candidate with the most votes wins. Ties are broken by earliest nomination time (first to nominate wins). If no one nominated, the election completes with no winner and a new cycle begins.
4. **Term Limits**: A character can hold the same office for a maximum of 3 consecutive terms. After 3 terms, they must sit out at least one term before running again.

#### Technical Breakdown: Election Lifecycle

| Aspect | Detail |
|---|---|
| **Cron Schedule** | Every 5 minutes (`*/5 * * * *`) |
| **Election Types** | `MAYOR` (town-level), `RULER` (kingdom-level) |
| **Phases** | `NOMINATIONS` -> `VOTING` -> `COMPLETED` |
| **Nomination Duration** | 24 hours (`NOMINATION_DURATION_HOURS = 24`) |
| **Voting Duration** | 24 hours after nomination ends (total 48h from start) |
| **Term Limit** | 3 consecutive terms (`MAX_CONSECUTIVE_TERMS = 3`) |
| **Tie-Breaking** | Earliest `nominatedAt` timestamp wins |
| **Auto-Creation** | Towns without an active election automatically get a new MAYOR election created |
| **No-Candidate Handling** | Election immediately moves to COMPLETED with no winner |

**Cron Job Steps** (`election-lifecycle.ts`):

1. `autoCreateElections()` -- Finds all towns that lack a non-COMPLETED election. Creates a new MAYOR election for each, incrementing `termNumber` from the last election. Emits `election:new` socket event.
2. `transitionNominationsToVoting()` -- Finds elections in NOMINATIONS phase where `startDate` is older than 24 hours. If zero candidates, skips directly to COMPLETED (emits `election:results` with `reason: 'no_candidates'`). Otherwise transitions to VOTING phase and emits `election:phase-changed`.
3. `transitionVotingToCompleted()` -- Finds elections in VOTING phase where `endDate <= now`. Tallies votes per candidate via `groupBy`, identifies winner (most votes, tie = earliest nomination). Updates election to COMPLETED, sets `winnerId`. Appoints winner as mayor (`town.mayorId`) or ruler (`kingdom.rulerId`). Emits `election:results`.
4. `resolveExpiredImpeachments()` -- See impeachment section below.

**API Endpoints**:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/elections/nominate` | Yes | Nominate yourself for an election |
| POST | `/api/elections/vote` | Yes | Cast a vote for a candidate |
| GET | `/api/elections/current` | Yes | List active (non-completed) elections for your town/kingdom |
| GET | `/api/elections/results` | Yes | Historical election results (paginated, max 50) |
| GET | `/api/elections/candidates/:electionId` | Yes | List candidates for an election (includes vote counts if voting/completed) |
| POST | `/api/elections/impeach` | Yes | Initiate an impeachment |
| POST | `/api/elections/impeach/vote` | Yes | Vote on an active impeachment |

#### Impeachment System

**Player Guide**: Any resident can initiate an impeachment against their town's mayor or their kingdom's ruler. The impeachment lasts 48 hours. During this time, other residents can vote for or against. If the impeachment passes (more votes for than against), the official is removed from office immediately, and a new election cycle begins automatically on the next cron tick.

| Aspect | Detail |
|---|---|
| **Duration** | 48 hours (`IMPEACHMENT_DURATION_HOURS = 48`) |
| **Initiation** | Any resident (cannot impeach yourself) |
| **Voting** | One vote per character, for or against |
| **Resolution** | `votesFor > votesAgainst` = PASSED (official removed), else FAILED |
| **Residency Check** | Must be a town resident for town impeachments |
| **Duplicate Check** | Only one active impeachment per target per scope at a time |
| **Auto-Vote** | Initiator automatically counts as 1 vote in favor |

---

### A.2 Governance System

**Source**: `server/src/routes/governance.ts` (665 lines)

#### Player Guide: Governance Powers

Once elected, mayors and rulers gain significant powers:

- **Mayors** can: set tax rates, appoint a sheriff, appoint town council members, allocate town treasury funds, propose laws.
- **Rulers** can: appoint kingdom council members, allocate kingdom treasury, declare war, propose peace, propose laws.
- **Council members** and rulers can vote on proposed laws.

#### Law System

**5 Law Types**: `tax`, `trade`, `military`, `building`, `general`

| Aspect | Detail |
|---|---|
| **Who Can Propose** | Rulers or mayors (for their kingdom) |
| **Who Can Vote** | Council members + the kingdom ruler |
| **Activation** | Simple majority: `votesFor > votesAgainst` AND at least 3 total votes |
| **Statuses** | `proposed` -> `voting` -> `active` / `expired` |
| **Expiration** | Optional `expiresAt` datetime; checked every 15 min by cron |
| **Effects** | JSON object stored in `effects` column -- interpreted by `law-effects.ts` |
| **Socket Event** | `governance:law-passed` emitted when activated |

**API Endpoints**:

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/api/governance/propose-law` | Yes | Ruler/Mayor | Propose a new law |
| POST | `/api/governance/vote-law` | Yes | Council/Ruler | Vote for or against a proposed law |
| GET | `/api/governance/laws` | Yes | Any | List laws for a kingdom (filterable by status) |
| POST | `/api/governance/set-tax` | Yes | Mayor only | Set town tax rate (0-25%) |
| GET | `/api/governance/town-info/:townId` | Yes | Any | Town details: mayor, sheriff, council, treasury, tax rate |
| POST | `/api/governance/appoint` | Yes | Mayor/Ruler | Appoint sheriff or council member |
| POST | `/api/governance/allocate-treasury` | Yes | Mayor/Ruler | Spend treasury on buildings/military/infrastructure/events |
| GET | `/api/governance/kingdom/:kingdomId` | Yes | Any | Kingdom overview: ruler, laws, wars, council, treasury |
| POST | `/api/governance/declare-war` | Yes | Ruler only | Declare war on another kingdom |
| POST | `/api/governance/propose-peace` | Yes | Ruler only | Propose peace (ends war immediately) |

#### Tax System

**Source**: `server/src/routes/governance.ts` (set-tax), `server/src/services/law-effects.ts` (210 lines), `server/src/jobs/tax-collection.ts` (64 lines)

**Player Guide**: Each town has a tax rate set by its mayor. Taxes are collected automatically every hour from marketplace transactions. The effective tax rate combines the mayor's base rate with any active kingdom-level tax laws.

| Aspect | Detail |
|---|---|
| **Mayor Tax Rate** | 0% to 25% (hard cap at 0.25 in Zod validation) |
| **Law Tax Modifier** | Active `tax` type laws add `effects.taxModifier` to the rate |
| **Effective Tax Cap** | 0% to 50% (clamped in `getEffectiveTaxRate`) |
| **Collection Frequency** | Hourly cron (`0 * * * *`) |
| **Collection Source** | `tradeTransaction` records since `lastCollectedAt` |
| **Tax Formula** | `floor(price * quantity * taxRate)` per transaction |
| **Deposit Target** | `townTreasury.balance` |
| **Socket Event** | `governance:tax-changed` on rate change |

#### Treasury Allocation

Mayors and rulers can allocate treasury funds to 4 purposes:

| Purpose | Description |
|---|---|
| `buildings` | Town/kingdom construction projects |
| `military` | Defense and military spending |
| `infrastructure` | Roads, walls, utilities |
| `events` | Community events and festivals |

The system validates sufficient balance before deducting.

#### Official Appointments

| Role | Appointed By | Scope |
|---|---|---|
| Sheriff | Mayor | Town-level; target must be a town resident |
| Council Member | Mayor (town) or Ruler (kingdom) | Town or Kingdom level |

---

### A.3 Law Effects Service

**Source**: `server/src/services/law-effects.ts` (210 lines)

5 exported service functions:

| Function | Purpose |
|---|---|
| `getEffectiveTaxRate(townId)` | Combines base TownPolicy rate + active tax law modifiers. Clamps 0-50%. |
| `getTradeRestrictions(townId, buyerId, sellerId)` | Checks for trade embargo laws and active wars between kingdoms. Returns `{ blocked, reason }`. |
| `getWarStatus(kingdomId1, kingdomId2)` | Checks if two kingdoms are actively at war. Returns `{ atWar, war? }`. |
| `isLawActive(lawId)` | Checks if a specific law is active and not expired. |
| `getActiveWarsForKingdom(kingdomId)` | Returns all active wars for a kingdom (both attacking and defending). |

---

### A.4 Law Expiration Job

**Source**: `server/src/jobs/law-expiration.ts` (40 lines)

| Aspect | Detail |
|---|---|
| **Schedule** | Every 15 minutes (`*/15 * * * *`) |
| **Logic** | `UPDATE law SET status='expired' WHERE status='active' AND expiresAt <= now()` |
| **Bulk Update** | Uses `prisma.law.updateMany` for efficiency |

---

### A.5 Diplomacy System (Advanced)

**Source**: `server/src/routes/diplomacy.ts` (761 lines), `server/src/services/diplomacy-engine.ts` (227 lines)

#### Player Guide: Diplomacy

The diplomacy system tracks relationships between all 20 races on a matrix, manages treaties between kingdoms, and handles inter-kingdom wars with scoring.

**Racial Relations**: Every pair of the 20 races has a relation status on a 6-tier scale:

| Rank | Status | Description |
|---|---|---|
| 0 | BLOOD_FEUD | Worst possible; deep-rooted hatred |
| 1 | HOSTILE | Active aggression |
| 2 | DISTRUSTFUL | Suspicious, wary interactions |
| 3 | NEUTRAL | Default starting position |
| 4 | FRIENDLY | Cooperative, amicable |
| 5 | ALLIED | Best possible; deep mutual trust |

**Improving relations costs gold and time**:

| Transition | Gold Cost | Days Required |
|---|---|---|
| BLOOD_FEUD -> HOSTILE | 15,000 | 10 |
| HOSTILE -> DISTRUSTFUL | 8,000 | 7 |
| DISTRUSTFUL -> NEUTRAL | 3,000 | 4 |
| NEUTRAL -> FRIENDLY | 5,000 | 5 |
| FRIENDLY -> ALLIED | 10,000 | 10 (requires 14-day trade agreement) |

**Changeling Diplomat Bonus**: If either kingdom's ruler is a Changeling race, all gold costs for diplomacy are reduced by 20%.

**Worsening is always instant and free.** War declaration worsens relations by 2 steps.

#### Treaties

3 treaty types with different requirements:

| Treaty Type | Min Relation | Gold Cost | Days | Special |
|---|---|---|---|---|
| TRADE_AGREEMENT | NEUTRAL | 2,000 | 3 | -- |
| NON_AGGRESSION_PACT | DISTRUSTFUL | 1,500 | 2 | -- |
| ALLIANCE | FRIENDLY | 10,000 | 7 | Requires 14-day active TRADE_AGREEMENT |

- **Proposal Flow**: Ruler proposes -> Receiver's ruler accepts or rejects. Gold deducted from proposer on acceptance.
- **Duration**: Non-alliance treaties expire after 30 days. Alliances have no expiration.
- **Breaking Treaties**: Either ruler can break an active treaty, but it incurs penalties:

| Treaty Broken | Relation Worsened By | Gold Penalty |
|---|---|---|
| ALLIANCE | 3 steps | 5,000 |
| NON_AGGRESSION_PACT | 2 steps | 2,000 |
| TRADE_AGREEMENT | 1 step | 1,000 |

#### War System (Diplomacy Routes)

| Aspect | Detail |
|---|---|
| **Declaration** | Ruler only; cannot declare on self or if already at war |
| **On Declaration** | All active treaties between the kingdoms are set to BROKEN; racial relation worsens by 2 steps |
| **War Scoring** | PvP kills (10 pts each), Raids (25 pts each), Territory net (50 pts each) |
| **Peace Negotiation** | Either ruler can negotiate; immediately ends the war |
| **History Log** | All diplomatic events logged in `diplomacyEvent` table with initiator, target, details |

**API Endpoints**:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/diplomacy/relations` | No | Full 20x20 racial relations matrix |
| GET | `/api/diplomacy/relations/:race1/:race2` | No | Specific pair's relation |
| POST | `/api/diplomacy/propose-treaty` | Yes | Propose treaty (ruler only) |
| POST | `/api/diplomacy/respond-treaty/:proposalId` | Yes | Accept/reject treaty (receiver ruler only) |
| POST | `/api/diplomacy/declare-war` | Yes | Declare war (ruler only) |
| POST | `/api/diplomacy/break-treaty/:treatyId` | Yes | Cancel active treaty (ruler only) |
| GET | `/api/diplomacy/treaties` | No | List all active treaties |
| GET | `/api/diplomacy/wars` | No | List all active wars |
| GET | `/api/diplomacy/wars/:id` | No | War details with scoring breakdown |
| POST | `/api/diplomacy/wars/:id/negotiate-peace` | Yes | End a war (ruler only) |
| GET | `/api/diplomacy/history` | No | Paginated diplomacy event history |

---

### A.6 Kingdom Reputation

**Source**: `server/src/services/diplomacy-reputation.ts` (98 lines)

A kingdom's reputation is calculated from its diplomatic history:

| Factor | Points |
|---|---|
| Each treaty kept (ACTIVE or EXPIRED) | +2 |
| Each treaty BROKEN | -5 |
| Each war declared (as attacker) | -2 |
| Each peace treaty reached (war ended) | +3 |

**Reputation Tiers**:

| Score Range | Tier | Treaty Cost Multiplier |
|---|---|---|
| >= 50 | Honored | 0.90x (10% discount) |
| >= 20 | Respected | 0.95x (5% discount) |
| >= -10 | Neutral | 1.00x (no change) |
| >= -30 | Suspect | 1.25x (25% surcharge) |
| < -30 | Oathbreaker | 1.50x (50% surcharge) |

---

### A.7 Herald Announcement System

**Source**: `server/src/services/herald.ts` (192 lines)

The Herald generates immersive, lore-flavored world event announcements for major diplomatic actions. Each announcement is persisted as a `WorldEvent` record and broadcast via Socket.io.

**20 Supported Races** (all with flavor names): Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn, Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk, Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling.

| Generator Function | Event Type | Trigger |
|---|---|---|
| `generateWarDeclaration` | WAR_DECLARATION | War declared |
| `generatePeaceTreaty` | PEACE_TREATY | War ended |
| `generateAllianceFormed` | ALLIANCE_FORMED | Alliance treaty activated |
| `generateTradeAgreement` | TRADE_AGREEMENT | Trade agreement activated |
| `generateBorderChange` | BORDER_CHANGE | Racial relation status changes |
| `generateTreatyBroken` | TREATY_BROKEN | Treaty broken by a kingdom |
| `generateStateReport` | STATE_REPORT | Monthly world state summary |

---

## B. Social Systems

### B.1 Guild System

**Source**: `server/src/routes/guilds.ts` (587 lines)

#### Player Guide: Guilds

Guilds are player-created organizations with shared treasury, ranks, and social features.

- **Creation Cost**: 500 gold
- **Name**: 3-30 characters
- **Tag**: 2-4 alphanumeric characters (stored uppercase)
- **Description**: Up to 500 characters (optional)
- **You can only lead one guild at a time**

**Rank Hierarchy** (lowest to highest):

| Rank | Level | Permissions |
|---|---|---|
| Member | 0 | Basic membership, donate to treasury |
| Officer | 1 | Invite players, kick members (lower rank only), update guild info |
| Co-Leader | 2 | Same as officer |
| Leader | 3 | All permissions: promote, transfer leadership, disband |

**Key Rules**:
- Leaders cannot leave -- they must transfer leadership first or disband the guild
- Officers can only kick members of lower rank
- When leadership is transferred, the old leader is demoted to co-leader
- When a guild is disbanded, the entire treasury is returned to the leader
- Guild names and tags must be unique (409 conflict on duplicate)

**API Endpoints**:

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/api/guilds` | Yes | Any | Create a new guild (costs 500g) |
| GET | `/api/guilds` | Yes | Any | List guilds (paginated, searchable) -- cached 60s |
| GET | `/api/guilds/:id` | Yes | Any | Guild details with full member list |
| PATCH | `/api/guilds/:id` | Yes | Officer+ | Update guild name/description |
| DELETE | `/api/guilds/:id` | Yes | Leader | Disband guild (treasury returned) |
| POST | `/api/guilds/:id/invite` | Yes | Officer+ | Invite a character to the guild |
| POST | `/api/guilds/:id/join` | Yes | Any | Open-join a guild |
| POST | `/api/guilds/:id/kick` | Yes | Officer+ | Kick a lower-rank member |
| POST | `/api/guilds/:id/leave` | Yes | Non-leader | Leave the guild |
| POST | `/api/guilds/:id/promote` | Yes | Leader | Change a member's rank |
| POST | `/api/guilds/:id/donate` | Yes | Member+ | Donate gold to guild treasury |
| GET | `/api/guilds/:id/quests` | Yes | Any | List guild quests (placeholder, returns `[]`) |
| POST | `/api/guilds/:id/transfer` | Yes | Leader | Transfer leadership to another member |

**Socket Events**: `guild:dissolved`, `guild:member-joined`, `guild:member-left`

---

### B.2 Messaging System

**Source**: `server/src/routes/messages.ts` (323 lines)

#### Player Guide: Chat Channels

The game supports 7 chat channel types with different scoping and permissions:

| Channel | Scope | Permission | Requires |
|---|---|---|---|
| GLOBAL | Server-wide | Admin only | Admin user role |
| TOWN | Town residents | Must be in a town | `currentTownId` auto-resolved |
| GUILD | Guild members | Must be a guild member | `guildId` parameter |
| PARTY | Party members | Any | -- |
| WHISPER | Direct message | Any | `recipientId` parameter (cannot whisper self) |
| TRADE | Trade channel | Any | -- |
| SYSTEM | System messages | Any | -- |

- **Max message length**: 2,000 characters
- **Pagination**: Default 50 per page, max 100

**API Endpoints**:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/messages/send` | Yes | Send a message to a channel |
| GET | `/api/messages/inbox` | Yes | Whisper inbox (sent + received) |
| GET | `/api/messages/conversation/:characterId` | Yes | Whisper thread with a specific character |
| GET | `/api/messages/channel/:channelType` | Yes | Read messages from a channel |
| PATCH | `/api/messages/:id/read` | Yes | Mark a whisper as read |
| DELETE | `/api/messages/:id` | Yes | Delete your own message |

---

### B.3 Friends System

**Source**: `server/src/routes/friends.ts` (341 lines)

#### Player Guide: Friends

- Send a friend request to any character. They can accept, decline, or block.
- If declined, you can re-request later (old record is deleted and a new one created).
- Either party can unfriend at any time.
- Your friends list shows their online status, level, race, and current town.
- Friend requests trigger real-time socket notifications.

**Friendship States**: `PENDING` -> `ACCEPTED` / `DECLINED` / `BLOCKED`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/friends/request` | Yes | Send friend request |
| POST | `/api/friends/:id/accept` | Yes | Accept a pending request |
| POST | `/api/friends/:id/decline` | Yes | Decline a pending request |
| DELETE | `/api/friends/:id` | Yes | Remove a friend / cancel request |
| GET | `/api/friends` | Yes | List all accepted friends (with online status) |
| GET | `/api/friends/requests` | Yes | List incoming + outgoing pending requests |

**Real-time Events**: `emitFriendRequest`, `emitFriendAccepted`, notifications for both parties.

**Online Tracking**: The friends list calls `isOnline(characterId)` from `server/src/socket/presence.ts` to show live online status.

---

### B.4 Notifications System

**Source**: `server/src/routes/notifications.ts` (138 lines)

#### Player Guide

Notifications are server-generated alerts for game events. They appear in your notification panel and can be marked as read or deleted.

**Known Notification Types** (from code analysis):
- `friend_request` -- Someone wants to be your friend
- `friend_accepted` -- Your friend request was accepted
- `petition_fulfilled` -- Your petition reached its signature goal
- `quest_ready` -- All objectives for a quest are complete

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Yes | List notifications (paginated, filterable by unread) |
| PATCH | `/api/notifications/:id/read` | Yes | Mark single notification as read |
| PATCH | `/api/notifications/read-all` | Yes | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Yes | Delete a notification |

---

### B.5 Citizen Petition System

**Source**: `server/src/routes/petitions.ts` (295 lines)

#### Player Guide: Petitions

Citizens can create petitions to pressure rulers into diplomatic actions. Petitions have a signature goal (default 10, configurable 3-100) and expire after 7 days.

**4 Petition Types**:

| Type | Description |
|---|---|
| DECLARE_WAR | Citizens demand war on another kingdom |
| PROPOSE_TREATY | Citizens request a treaty with another kingdom |
| BREAK_TREATY | Citizens demand breaking an existing treaty |
| CHANGE_RELATIONS | Citizens want diplomatic relations changed |

**Lifecycle**:
1. Creator submits petition with title, description, type, and optional `targetData`
2. Creator automatically signs their own petition (count starts at 1)
3. Other players sign the petition
4. When signature goal is reached, status changes to `FULFILLED` and the creator receives a notification
5. Petitions not fulfilled within 7 days expire

**Rules**:
- One active petition per type per creator
- Each character can only sign a petition once
- Expired petitions cannot be signed

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/petitions` | Yes | Create a petition |
| POST | `/api/petitions/:id/sign` | Yes | Sign a petition |
| GET | `/api/petitions` | Yes | List petitions (filterable by status, paginated) |
| GET | `/api/petitions/:id` | Yes | Petition details with all signatures |

---

### B.6 World Events API

**Source**: `server/src/routes/world-events.ts` (121 lines)

World events are global announcements generated by the Herald service and other systems. Players can browse them as a news feed.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/world-events` | Yes | List recent world events (paginated, filterable by `eventType`) |
| GET | `/api/world-events/war-bulletin` | Yes | Active wars + 10 most recent war-related events |
| GET | `/api/world-events/state-report` | Yes | Latest "State of Aethermere" monthly report |

**Event Types**: WAR_DECLARATION, PEACE_TREATY, ALLIANCE_FORMED, TRADE_AGREEMENT, BORDER_CHANGE, TREATY_BROKEN, STATE_REPORT

---

## C. Quest & Progression System

### C.1 Quest Type Definitions

**Source**: `shared/src/data/quests/types.ts` (30 lines)

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique quest identifier |
| `name` | string | Display name |
| `type` | enum | MAIN, TOWN, DAILY, GUILD, BOUNTY, RACIAL |
| `description` | string | Quest narrative text |
| `objectives` | QuestObjective[] | Array of objectives |
| `rewards` | QuestRewards | XP, gold, items, reputation |
| `levelRequired` | number | Minimum character level |
| `prerequisiteQuestId` | string? | Must complete this quest first |
| `regionId` | string? | Region association |
| `townId` | string? | Town association |
| `npcGiverId` | string? | NPC quest giver |
| `isRepeatable` | boolean? | Can be repeated after completion |
| `cooldownHours` | number? | Hours between repeats |

**5 Objective Types**: `KILL`, `GATHER`, `DELIVER`, `TALK`, `VISIT`

**Reward Structure**: `{ xp: number, gold: number, items?: string[], reputation?: number }`

---

### C.2 Complete Quest Catalog

**Source**: `shared/src/data/quests/` (7 files)

#### Main Story Quests (8 quests)

**Source**: `shared/src/data/quests/main-quests.ts` (107 lines)

These form a linear story chain. Each requires completing the previous quest.

| ID | Name | Level | Objectives | Rewards (XP/Gold) |
|---|---|---|---|---|
| main-01-awakening | The Awakening | 1 | Talk to Elder Tomas | 100 / 25 |
| main-02-proving-ground | Proving Ground | 1 | Kill 5 Goblins, Kill 3 Giant Rats | 250 / 50 |
| main-03-gathering-supplies | Gathering Supplies | 2 | Gather 5 ORE, Gather 5 WOOD | 300 / 75 |
| main-04-the-road-ahead | The Road Ahead | 3 | Visit Hearthshire, Kill 5 Bandits | 500 / 100 |
| main-05-shadows-stir | Shadows Stir | 5 | Visit Nethermire, Kill 5 Skeleton Warriors | 750 / 150 |
| main-06-into-the-depths | Into the Depths | 7 | Visit Kazad-Vorn, Kill 8 Giant Spiders | 1000 / 200 |
| main-07-dragon-rumor | Rumors of Dragonfire | 12 | Visit Drakenspire, Kill 5 Dire Wolves, Kill 1 Young Dragon | 2000 / 500 |
| main-08-final-stand | The Final Stand | 16 | Visit Ashenmoor, Kill 1 Lich | 5000 / 1000 |

**Total main quest rewards**: 9,900 XP, 2,100 gold

#### Town Quests (15 quests across 4 regions)

**Source**: `shared/src/data/quests/town-quests.ts` (179 lines)

**Verdant Heartlands (Kingshold/Millhaven)** -- 5 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-heartlands-01 | Rat Infestation | 1 | Kingshold | Kill 5 Giant Rats | 100 / 30 |
| town-heartlands-02 | Harvest Protection | 2 | Kingshold | Kill 4 Wolves | 150 / 40 |
| town-heartlands-03 | Blacksmith's Request | 2 | Kingshold | Gather 8 ORE | 150 / 50 |
| town-heartlands-04 | Bandit Highway | 3 | Kingshold | Kill 6 Bandits, Visit Bridgewater | 250 / 75 |
| town-heartlands-05 | Timber for the Mill | 1 | Millhaven | Gather 10 WOOD | 120 / 40 |

**Silverwood Forest (Aelindra)** -- 3 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-silverwood-01 | Wolf Pack Cull | 2 | Aelindra | Kill 6 Wolves | 150 / 35 |
| town-silverwood-02 | Herbal Remedy | 2 | Aelindra | Gather 8 HERB | 175 / 45 |
| town-silverwood-03 | Enchanted Wood | 3 | Aelindra | Gather 12 WOOD | 200 / 55 |

**Ironvault Mountains (Kazad-Vorn)** -- 3 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-ironvault-01 | Mine Clearance | 5 | Kazad-Vorn | Kill 5 Giant Spiders | 200 / 60 |
| town-ironvault-02 | Ore Requisition | 5 | Kazad-Vorn | Gather 15 ORE | 250 / 80 |
| town-ironvault-03 | Stone Guardian | 10 | Kazad-Vorn | Kill 1 Ancient Golem | 400 / 120 |

**The Crossroads (Hearthshire)** -- 3 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-crossroads-01 | Goblin Trouble | 1 | Hearthshire | Kill 8 Goblins | 120 / 35 |
| town-crossroads-02 | Grain for the Market | 1 | Hearthshire | Gather 10 GRAIN | 130 / 40 |
| town-crossroads-03 | Trade Route Patrol | 2 | Hearthshire | Visit Greenhollow, Visit Peddler's Rest | 200 / 60 |

#### Daily Quests (5 quests, all repeatable)

**Source**: `shared/src/data/quests/daily-quests.ts` (59 lines)

All daily quests have a **24-hour cooldown** and use wildcard (`*`) targets where applicable.

| ID | Name | Level | Objectives | XP / Gold |
|---|---|---|---|---|
| daily-hunt | Daily Hunt | 1 | Kill 5 any monsters | 150 / 30 |
| daily-gather | Daily Gathering | 1 | Gather 5 any resources | 125 / 25 |
| daily-patrol | Daily Patrol | 1 | Visit 2 any towns | 100 / 20 |
| daily-slayer | Monster Slayer | 3 | Kill 10 any monsters | 300 / 60 |
| daily-prospector | Prospector | 3 | Gather 10 ORE | 200 / 45 |

**Max daily XP from dailies**: 875 XP (all 5 completed)

#### Guild Quests (3 quests)

**Source**: `shared/src/data/quests/guild-quests.ts` (42 lines)

| ID | Name | Level | Objectives | XP / Gold / Rep |
|---|---|---|---|---|
| guild-01-initiation | Guild Initiation | 3 | Kill 10 Goblins, Kill 10 Wolves | 500 / 100 / 25 |
| guild-02-resource-drive | Guild Resource Drive | 5 | Gather 20 ORE, 20 WOOD, 10 HERB | 600 / 150 / 30 |
| guild-03-expedition | Guild Expedition | 7 | Visit Nethermire, Kazad-Vorn, Drakenspire | 800 / 200 / 40 |

#### Bounty Quests (3 quests)

**Source**: `shared/src/data/quests/bounty-quests.ts` (34 lines)

| ID | Name | Level | Region | Objectives | XP / Gold |
|---|---|---|---|---|---|
| bounty-orc-raiders | Bounty: Orc Raiders | 5 | Ashenfang Wastes | Kill 8 Orc Warriors | 400 / 120 |
| bounty-troll-menace | Bounty: Troll Menace | 8 | Shadowmere Marshes | Kill 4 Trolls | 600 / 180 |
| bounty-dragon-slayer | Bounty: Dragon Slayer | 12 | Frozen Reaches | Kill 2 Young Dragons | 2000 / 500 |

#### Quest Summary

| Type | Count | Level Range | Total XP | Total Gold |
|---|---|---|---|---|
| MAIN | 8 | 1-16 | 9,900 | 2,100 |
| TOWN | 15 | 1-10 | 2,595 | 765 |
| DAILY | 5 (repeatable) | 1-3 | 875/day | 180/day |
| GUILD | 3 | 3-7 | 1,900 | 450 |
| BOUNTY | 3 | 5-12 | 3,000 | 800 |
| **Total (one-time)** | **29** | -- | **17,395** | **4,115** |

---

### C.3 Quest Lifecycle API

**Source**: `server/src/routes/quests.ts` (567 lines)

#### Player Guide: Quest Lifecycle

1. **Browse**: Check `/api/quests/available` to see quests you qualify for. The system filters by level, prerequisite completion, cooldown, and repeatability.
2. **Accept**: POST to `/api/quests/accept`. Progress is initialized at 0 for each objective.
3. **Auto-Progress**: Combat, gathering, and travel automatically update quest objectives via triggers (no manual reporting needed for most actions).
4. **Manual Progress**: POST to `/api/quests/progress` if needed (e.g., for custom objectives).
5. **Complete**: When all objectives are met, POST to `/api/quests/complete` to claim rewards (XP + gold added atomically in a transaction).
6. **Abandon**: POST to `/api/quests/abandon` to delete progress and give up the quest.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/quests/available` | Yes | Available quests for your level (cached 60s) |
| GET | `/api/quests/active` | Yes | Your active quests with current progress |
| GET | `/api/quests/completed` | Yes | Your completed quest history |
| POST | `/api/quests/accept` | Yes | Accept a quest |
| POST | `/api/quests/progress` | Yes | Manually report objective progress |
| POST | `/api/quests/complete` | Yes | Turn in completed quest for rewards |
| POST | `/api/quests/abandon` | Yes | Abandon an active quest |
| GET | `/api/quests/npcs/:townId` | Yes | List NPCs in a town with their quests and your status |

---

### C.4 Quest Trigger Service

**Source**: `server/src/services/quest-triggers.ts` (205 lines)

This service enables **automatic quest progression**. Game events call these trigger functions, which scan all active quests for matching objectives and update progress accordingly.

| Trigger Function | Called By | Matches Objective Type | Wildcard Support |
|---|---|---|---|
| `onMonsterKill(characterId, monsterType, count)` | PvE combat routes | KILL | Yes (`*` = any monster) |
| `onResourceGather(characterId, resourceType, count)` | Gathering/work routes | GATHER | Yes (`*` = any resource) |
| `onVisitLocation(characterId, townId)` | Travel routes | VISIT | Yes (`*` = any town) |

**When all objectives are met**, the trigger automatically sends a real-time `quest_ready` notification to the player: "All objectives for [quest name] are complete. Turn it in to claim your reward!"

**Pattern**: Each trigger loads all `IN_PROGRESS` quests for the character, iterates objectives, updates progress (capped at `quantity`), and writes back to the database. This runs on every combat kill, gather, and travel event.

---

### C.5 Progression System

**Source**: `server/src/services/progression.ts` (114 lines)

#### XP Formula

```
XP required for level N -> N+1 = N * 100
```

| Level | XP to Next Level | Cumulative XP |
|---|---|---|
| 1 | 100 | 0 |
| 2 | 200 | 100 |
| 3 | 300 | 300 |
| 5 | 500 | 1,000 |
| 10 | 1,000 | 4,500 |
| 15 | 1,500 | 10,500 |
| 20 | 2,000 | 19,000 |
| 25 | 2,500 | 30,000 |
| 30 | 3,000 | 43,500 |
| 40 | 4,000 | 78,000 |
| 50 | 5,000 | 122,500 |

**Cumulative formula**: `totalXP = 100 * (level - 1) * level / 2`

#### Level-Up Rewards

Each level grants:

| Reward | Amount Per Level |
|---|---|
| Stat Points | 2 |
| Skill Points | 1 |
| Max Health | +10 |
| Max Mana | +5 |
| Full Heal | HP and Mana restored to new max |

**Multi-level handling**: If a character gains enough XP to skip levels (e.g., a large quest reward), all intermediate levels are granted at once. A character going from level 5 to 8 gets 6 stat points, 3 skill points, +30 HP, +15 MP.

**On Level-Up**:
1. Character stats updated in database
2. Achievement check runs (`checkAchievements(characterId, 'leveling', { level })`)
3. Socket.io `levelUp` event emitted with full reward breakdown

#### Player Guide: XP Sources and Leveling Path

**XP Sources**:
- Main quests (100-5000 XP per quest)
- Town quests (100-400 XP per quest)
- Daily quests (100-300 XP per day, repeatable)
- Guild quests (500-800 XP)
- Bounty quests (400-2000 XP)
- PvE combat victories
- Achievement rewards (25-2000 XP)

**Leveling Path Milestones**:

| Level | Cumulative XP | Milestone |
|---|---|---|
| 1 | 0 | Starting level |
| 5 | 1,000 | Access to mid-tier town quests |
| 10 | 4,500 | Specialization unlocked (via achievement system) |
| 15 | 10,500 | High-level quests available |
| 25 | 30,000 | "Hero" title achievement |
| 30 | 43,500 | Endgame content begins |
| 40 | 78,000 | Veteran player territory |
| 50 | 122,500 | "Legend" title achievement |

**XP Boosting Strategy**: Focus on daily quests (875 XP/day guaranteed), main story chain for one-time bonuses, and grinding bounties for repeatable high-XP content. Guild quests provide reputation alongside XP.

---

### C.6 Achievement System

**Source**: `shared/src/data/achievements.ts` (64 lines)

26 achievements across 9 categories:

#### Combat (PvE) -- 4 achievements

| Name | Requirement | Rewards |
|---|---|---|
| First Blood | Win 1 PvE combat | 50 XP |
| Monster Slayer | Win 10 PvE combats | 200 XP, 50g |
| Veteran Warrior | Win 50 PvE combats | 500 XP, 200g, "Veteran" title |
| Champion of the Realm | Win 200 PvE combats | 2000 XP, 1000g, "Champion" title |

#### Combat (PvP) -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Duelist | Win 1 PvP duel | 100 XP |
| Gladiator | Win 10 PvP duels | 500 XP, 100g, "Gladiator" title |
| Warlord | Win 50 PvP duels | 2000 XP, 500g, "Warlord" title |

#### Crafting -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Apprentice Crafter | Craft 10 items | 100 XP |
| Journeyman Crafter | Craft 50 items | 300 XP, 100g |
| Master Artisan | Reach Expert tier in any profession | 500 XP, 200g, "Master Artisan" title |

#### Social -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Making Friends | Have 1 friend | 25 XP |
| Social Butterfly | Have 10 friends | 200 XP, "Social Butterfly" title |
| Guild Founder | Create or lead a guild | 300 XP, 100g |

#### Exploration -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Explorer | Visit 5 towns | 150 XP |
| World Traveler | Visit 15 towns | 500 XP, 200g, "World Traveler" title |

#### Economy -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| First Sale | 1 market sale | 50 XP |
| Merchant | 20 market sales | 300 XP, 100g |
| Merchant Prince | Earn 10,000g from sales | 1000 XP, "Merchant Prince" title |

#### Political -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Elected Official | Win 1 election | 500 XP, 200g |
| Lawmaker | Enact 1 law | 300 XP |

#### Leveling -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Adventurer | Reach level 10 | 200 XP, "Adventurer" title |
| Seasoned Hero | Reach level 25 | 500 XP, 500g, "Hero" title |
| Legend | Reach level 50 | 2000 XP, 2000g, "Legend" title |

#### Gathering -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Gatherer | 25 gathering actions | 150 XP |
| Resource Baron | 100 gathering actions | 500 XP, 300g, "Resource Baron" title |

#### Progression -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Specialized | Choose a class specialization | 200 XP |
| Skill Master | Unlock 10 abilities | 500 XP, "Skill Master" title |

#### Achievement Summary

| Category | Count | Total XP | Total Gold | Titles |
|---|---|---|---|---|
| Combat (PvE) | 4 | 2,750 | 1,250 | Veteran, Champion |
| Combat (PvP) | 3 | 2,600 | 600 | Gladiator, Warlord |
| Crafting | 3 | 900 | 300 | Master Artisan |
| Social | 3 | 525 | 100 | Social Butterfly |
| Exploration | 2 | 650 | 200 | World Traveler |
| Economy | 3 | 1,350 | 100 | Merchant Prince |
| Political | 2 | 800 | 200 | -- |
| Leveling | 3 | 2,700 | 2,500 | Adventurer, Hero, Legend |
| Gathering | 2 | 650 | 300 | Resource Baron |
| Progression | 2 | 700 | 0 | Skill Master |
| **Total** | **26** | **13,625** | **5,550** | **11 unique titles** |

---

## File Index

| File | Lines | Section |
|---|---|---|
| `server/src/routes/elections.ts` | 593 | A.1 Election System |
| `server/src/jobs/election-lifecycle.ts` | 319 | A.1 Election Lifecycle Cron |
| `server/src/routes/governance.ts` | 665 | A.2 Governance System |
| `server/src/services/law-effects.ts` | 210 | A.3 Law Effects Service |
| `server/src/jobs/tax-collection.ts` | 64 | A.2 Tax Collection |
| `server/src/jobs/law-expiration.ts` | 40 | A.4 Law Expiration |
| `server/src/routes/diplomacy.ts` | 761 | A.5 Diplomacy System |
| `server/src/services/diplomacy-engine.ts` | 227 | A.5 Diplomacy Engine |
| `server/src/services/herald.ts` | 192 | A.7 Herald System |
| `server/src/services/diplomacy-reputation.ts` | 98 | A.6 Kingdom Reputation |
| `server/src/routes/guilds.ts` | 587 | B.1 Guild System |
| `server/src/routes/messages.ts` | 323 | B.2 Messaging System |
| `server/src/routes/friends.ts` | 341 | B.3 Friends System |
| `server/src/routes/notifications.ts` | 138 | B.4 Notifications |
| `server/src/routes/petitions.ts` | 295 | B.5 Petition System |
| `server/src/routes/world-events.ts` | 121 | B.6 World Events |
| `shared/src/data/quests/types.ts` | 30 | C.1 Quest Types |
| `shared/src/data/quests/main-quests.ts` | 107 | C.2 Main Quests |
| `shared/src/data/quests/town-quests.ts` | 179 | C.2 Town Quests |
| `shared/src/data/quests/daily-quests.ts` | 59 | C.2 Daily Quests |
| `shared/src/data/quests/guild-quests.ts` | 42 | C.2 Guild Quests |
| `shared/src/data/quests/bounty-quests.ts` | 34 | C.2 Bounty Quests |
| `shared/src/data/quests/index.ts` | 26 | C.2 Quest Index |
| `server/src/routes/quests.ts` | 567 | C.3 Quest API |
| `server/src/services/quest-triggers.ts` | 205 | C.4 Quest Triggers |
| `server/src/services/progression.ts` | 114 | C.5 Progression |
| `shared/src/data/achievements.ts` | 64 | C.6 Achievements |
| **Total** | **5,999** | -- |
## Section 6: Socket.io Realtime Layer

### Architecture
- **Server**: Socket.io v4.7 on top of Node HTTP server (`server/src/index.ts`)
- **Client**: `socket.io-client` v4.7 singleton in `client/src/services/socket.ts`
- **Transport**: WebSocket primary, polling fallback (`transports: ['websocket', 'polling']`)

### Authentication & Security
- **JWT auth middleware** (`socket/middleware.ts`): Verifies `socket.handshake.auth.token` using `jwt.verify()` against `JWT_SECRET`. Rejects unauthenticated connections.
- **Rate limiting** (`socket/middleware.ts`): Per-socket, 30 messages/60 seconds. In-memory `Map<socketId, {count, resetAt}>`. Cleaned up on disconnect via `cleanupRateLimit()`.

### Room Architecture (5 room types)
| Room Pattern | Join Trigger | Used For |
|---|---|---|
| `user:{characterId}` | Auto on connect | Direct notifications, whispers, friend presence |
| `town:{townId}` | Auto on connect if in town + `join:town` event | Town chat, player enter/leave, local events |
| `guild:{guildId}` | `join:guild` event | Guild chat, member events, guild dissolution |
| `kingdom:{kingdomId}` | `join:kingdom` event | Political events (elections, laws, wars, taxes) |
| Global (no room) | Always | World events, state reports, herald announcements, global/trade/system chat |

### Server-Side Event Emitters (`socket/events.ts`) -- 20 event types
| Category | Events |
|---|---|
| Travel | `player:enter-town`, `player:leave-town` |
| Combat | `combat:result` (to each participant) |
| Trade | `trade:completed` (to seller) |
| Friends | `friend:request`, `friend:accepted` |
| Progression | `player:level-up`, `achievement:unlocked` |
| Notifications | `notification:new` |
| Tools | `tool:broken` |
| Gathering | `gathering:ready`, `gathering:depleted` |
| Crafting | `crafting:ready` |
| Item Durability | `item:lowDurability`, `item:broken` |
| Buildings | `building:constructed`, `building:taxDue`, `building:delinquent`, `building:seized`, `building:damaged`, `building:conditionLow` |
| World Events | `world-event:new` (global), `world-event:state-report` (global), `herald:announcement` (global), `war:bulletin-update` (global) |

### Chat System (`socket/chat-handlers.ts`)
- **Channels**: GLOBAL, TOWN, GUILD, PARTY, WHISPER, TRADE, SYSTEM (7 types)
- **Max message length**: 2,000 characters
- **Persistence**: Messages saved to `prisma.message` table
- **Validation**: Channel-specific (whisper requires recipientId, guild requires membership check via `guildMember` lookup, town requires `currentTownId`)
- **Routing**: Whisper uses `fetchSockets()` loop (works but O(n) -- could use `user:` room instead); Town/Guild use room broadcast; Global/Trade/System broadcast to all

### Presence System (`socket/presence.ts`)
- **Dual storage**: In-memory `Map` (fast lookups) + Redis hash `presence:online` (cross-instance, optional)
- **Friend notifications**: On connect, broadcasts `presence:online` to each online friend; on disconnect, broadcasts `presence:offline`
- **On connect**: Sends `presence:friends-online` list to the connecting user
- **Town tracking**: `updatePresenceTown()` updates both in-memory and Redis when player changes towns
- **Public API**: `getOnlineUsers(townId?)`, `isOnline(characterId)`, `getPresenceEntry(characterId)`

### Client-Side Hooks (7 hooks)
| Hook | Events Listened | React Query Invalidations | Toast Notifications |
|---|---|---|---|
| `usePoliticalEvents` | 8 events (election:new, election:phase-changed, election:results, impeachment:resolved, governance:law-passed/war-declared/peace-proposed/tax-changed) | elections, governance, governance/laws, governance/kingdom, governance/town-info | Yes (all 8) |
| `useSocialEvents` | 12 events (chat:message, presence:online/offline/friends-online, player:enter/leave-town, guild:member-joined/left/dissolved, notification:new, combat:result, trade:completed) | friends, town/characters, guild, guilds, character/me, notifications, combat, market, inventory | Yes (guild join, guild dissolved, notification, trade) |
| `useProgressionEvents` | 3 events (player:level-up, achievement:unlocked, profession:level-up) | character/me, skills, achievements, professions | Yes (achievement, profession) + Level-up modal state |
| `useGatheringEvents` | 3 events (gathering:ready, gathering:depleted, tool:broken) | work/status, town/resources, tools/equipped, character/me | Yes (all 3, with warning/danger styles) |
| `useCraftingEvents` | 1 event (crafting:ready) | crafting/status, crafting/queue | Yes |
| `useBuildingEvents` | 1 event (building:constructed) | buildings/mine, buildings/town, building/{id} | Yes |
| `useTradeEvents` | 3 events (caravan:departed, caravan:arrived, caravan:ambushed) | caravans/mine | Yes (all 3) + Ambush state |

**Total client-side event subscriptions: 31 unique event listeners across 7 hooks**

### Governance Event Helper (`server/src/index.ts:87-93`)
- `emitGovernanceEvent()` exported for route handlers to emit political events to specific rooms
- Supports: `governance:law-passed`, `governance:war-declared`, `governance:peace-proposed`, `governance:tax-changed`

---

## Section 7: Background Jobs (11 cron jobs)

| Job | File | Schedule | Description |
|---|---|---|---|
| Election Lifecycle | `jobs/election-lifecycle.ts` | Every 5 min | Auto-create elections, transition nomination->voting->completed, resolve impeachments |
| Tax Collection | `jobs/tax-collection.ts` | Periodic | Collect taxes from residents |
| Law Expiration | `jobs/law-expiration.ts` | Periodic | Expire time-limited laws |
| Resource Regeneration | `jobs/resource-regeneration.ts` | Periodic | Regenerate gathering nodes |
| Gathering Autocomplete | `jobs/gathering-autocomplete.ts` | Periodic | Complete timed gathering actions |
| Construction Complete | `jobs/construction-complete.ts` | Periodic | Complete timed construction |
| Property Tax | `jobs/property-tax.ts` | Periodic | Assess building property taxes |
| Building Maintenance | `jobs/building-maintenance.ts` | Periodic | Degrade building condition |
| Caravan Events | `jobs/caravan-events.ts` | Periodic | Process caravan arrivals, ambushes |
| State of Aethermere | `jobs/state-of-aethermere.ts` | 1st of month, midnight | Generate monthly world summary report |
| Warforged Maintenance | `jobs/warforged-maintenance.ts` | Periodic | Race-specific maintenance decay |

All jobs use `node-cron` and are started after HTTP server listens.

---

## Section 8: Cross-System Integration Map

```
Client (React 18 + Vite 5)
  |-- axios -> REST API (Express 4.19)
  |-- socket.io-client -> Socket.io (v4.7)
  |-- @tanstack/react-query -> Cache invalidation on socket events
  |-- zustand -> Client state management
  |-- framer-motion -> Animations
  |-- recharts -> Trade analytics charts
  |-- react-hot-toast -> All socket event notifications
  |-- Web Audio API -> Sound effects (oscillator-based, 8 sound events)

Server (Node.js + Express)
  |-- Prisma ORM -> PostgreSQL
  |-- ioredis -> Redis (optional, graceful fallback)
  |-- socket.io -> Realtime events
  |-- node-cron -> 11 background jobs
  |-- jsonwebtoken -> JWT auth (shared between REST + Socket)
  |-- helmet -> Security headers
  |-- express-rate-limit -> REST rate limiting (100 req/15 min)
  |-- zod -> Request validation
  |-- bcryptjs -> Password hashing
```

### Data Flow Patterns
1. **REST -> DB -> Socket**: Route handler writes to DB via Prisma, then calls `events.ts` emitter to push realtime update (e.g., trade completion, friend request)
2. **Socket -> DB -> Socket**: Chat messages received via socket, persisted to DB, broadcast to room
3. **Cron -> DB -> Socket**: Background jobs query/update DB, emit socket events for state changes (election transitions, construction complete, caravan arrivals)
4. **REST -> Redis -> REST**: Cache middleware intercepts responses, stores in Redis with TTL, serves cached responses with `X-Cache: HIT` header

---

## Section 9: API Endpoint Summary

**Total REST endpoints: 207** across 33 route files mounted under `/api`

| Route Module | Mount Path | Endpoints | Methods |
|---|---|---|---|
| auth | `/api/auth` | 4 | POST register, POST login, GET me, POST logout |
| characters | `/api/characters` | 4 | POST create, GET me, GET :id, POST allocate-stats |
| profiles | `/api/characters` | 2 | GET :id/profile, GET search |
| world | `/api/world` | 4 | GET map, GET regions, GET regions/:id, GET time |
| towns | `/api/towns` | 3 | GET :id, GET :id/buildings, GET :id/characters |
| travel | `/api/travel` | 4 | POST start, GET status, POST arrive, POST border-check |
| market | `/api/market` | 6 | POST list, GET browse, POST buy, POST cancel, GET my-listings, GET history |
| work | `/api/work` | 5 | POST start, GET status, POST collect, POST cancel, GET professions |
| crafting | `/api/crafting` | 6 | GET recipes, POST start, GET status, POST collect, POST queue, GET queue |
| combat/pve | `/api/combat/pve` | 3 | POST start, POST action, GET state |
| combat/pvp | `/api/combat/pvp` | 7 | 4 POST + 3 GET |
| elections | `/api/elections` | 7 | POST nominate, POST vote, GET current, GET results, GET candidates/:id, POST impeach, POST impeach/vote |
| governance | `/api/governance` | 10 | POST propose-law, POST vote-law, POST set-tax, GET laws, GET town-info/:id, POST appoint, POST allocate-treasury, POST declare-war, POST propose-peace, GET kingdom/:id |
| guilds | `/api/guilds` | 13 | POST create, GET list, GET :id, PATCH :id, DELETE :id, POST invite/join/kick/leave/promote/donate/transfer, GET :id/quests |
| messages | `/api/messages` | 6 | POST send, GET inbox, GET conversation/:id, GET channel/:type, PATCH :id/read, DELETE :id |
| friends | `/api/friends` | 6 | POST request, POST :id/accept, POST :id/decline, DELETE :id, GET list, GET requests |
| notifications | `/api/notifications` | 4 | GET list, PATCH :id/read, PATCH read-all, DELETE :id |
| quests | `/api/quests` | 8 | GET available, GET active, GET completed, POST accept, POST progress, POST complete, POST abandon, GET npcs/:townId |
| skills | `/api/skills` | 4 | GET tree, POST specialize, POST unlock, GET abilities |
| professions | `/api/professions` | 5 | POST learn, POST abandon, GET mine, GET info/:type, GET available |
| tools | `/api/tools` | 4 | POST equip, POST unequip, GET equipped, GET inventory |
| equipment | `/api/equipment` | 4 | POST equip, POST unequip, GET equipped, GET stats |
| items | `/api/items` | 3 | POST repair, GET details/:id, GET compare |
| buildings | `/api/buildings` | 18 | 8 POST + 10 GET (permits, construction, upgrade, storage, rent, repair, economics) |
| trade-analytics | `/api/trade` | 6 | GET prices/:id, GET price-history/:id, GET best-routes, GET profitability, GET town/:id/dashboard, GET merchant/:id/stats |
| caravans | `/api/caravans` | 10 | POST create, POST load/unload/hire-escort/insure/depart/collect/resolve-ambush, GET mine, GET :id |
| races | `/api/races` | 14 | GET all, GET :race, GET :race/subraces, GET relations/matrix, POST racial ability use, POST changeling shift, GET changeling trueform, GET warforged maintenance, GET merfolk underwater-nodes, GET profession-bonuses/:race, POST half-elf-chosen-profession, POST gnome-eureka, POST warforged-overclock, GET bonuses/calculate |
| zones | `/api/zones` | 4 | GET exclusive, GET :id/access, POST :id/enter, GET :id/resources |
| regions | `/api/regions` | 4 | GET list, GET :id, GET :id/demographics, GET :id/bonuses |
| diplomacy | `/api/diplomacy` | 11 | GET relations, GET relations/:r1/:r2, POST propose-treaty, POST respond-treaty/:id, POST declare-war, POST break-treaty/:id, GET treaties, GET wars, GET wars/:id, POST wars/:id/negotiate-peace, GET history |
| petitions | `/api/petitions` | 4 | POST create, POST :id/sign, GET list, GET :id |
| world-events | `/api/world-events` | 3 | GET list, GET war-bulletin, GET state-report |
| special-mechanics | `/api/special-mechanics` | 12 | Race-specific status + actions for Changeling, Warforged, Merfolk, Drow, Faefolk, Revenant + environment check |

### Cached Endpoints (Redis TTLs)
| Endpoint | TTL |
|---|---|
| GET /guilds (list) | 60s |
| GET /quests/available | 60s |
| GET /market/browse | 30s |
| GET /trade/prices/:id | 60s |
| GET /trade/price-history/:id | 60s |
| GET /trade/best-routes | 120s |
| GET /trade/town/:id/dashboard | 60s |
| GET /trade/merchant/:id/stats | 30s |
| GET /towns/:id | 120s |
| GET /world/map | 300s |
| GET /world/regions | 300s |

---

## Section 10: Test Coverage

**8 test suites** in `server/src/__tests__/`:
- `auth.test.ts` -- Authentication flows
- `characters.test.ts` -- Character creation and management
- `economy.test.ts` -- Market, trading, gold
- `combat.test.ts` -- PvE/PvP combat
- `politics.test.ts` -- Elections, governance
- `quests.test.ts` -- Quest lifecycle
- `progression.test.ts` -- XP, leveling, skills
- `social.test.ts` -- Friends, messages, guilds

Test runner: Jest 30 with `ts-jest`, `supertest` for HTTP integration tests.

---

## Section 11: Client Pages & Components

### Pages (23)
LoginPage, RegisterPage, CharacterCreationPage, TownPage, MarketPage, CombatPage, GuildPage, QuestJournalPage, SkillTreePage, AchievementPage, GovernancePage, InventoryPage, KingdomPage, ElectionPage, ProfilePage, TownHallPage, ProfessionsPage, CraftingPage, HousingPage, TradePage, RaceSelectionPage, WorldMapPage, DiplomacyPage

### Component Groups
- **UI**: ProtectedRoute, LoadingSkeleton, LoadingScreen, Tooltip, ErrorMessage, PageLayout, Navigation, HUD, ChatPanel (9)
- **Social**: PlayerSearch, FriendsList, SocialEventsProvider, NotificationDropdown, PoliticalNotifications (5)
- **Progression**: XpBar, LevelUpCelebration, StatAllocation, ProgressionEventsProvider (4)
- **Quests**: QuestDialog (1)
- **Professions**: ProfessionCard, ProfessionDetail, LearnProfessionModal (3)
- **Gathering**: ToolSlot, ToolSelector, GatheringResults (3)
- **Crafting**: CraftingResults (1)
- **Housing**: BuildingCard, ConstructionProgress, BuildingDirectory, ConstructionFlow, BuildingInterior, WorkshopView, ShopView (7)
- **Trade**: CaravanCard, CargoLoader, AmbushEvent, CaravanManager, PriceCompare, BestTrades, MerchantDashboard (7)
- **Races**: RaceCard, RaceDetailPanel, SubRaceSelector, RaceCompare, RaceInfoSheet (5)
- **Map**: MapTooltip, TownMarker, RegionOverlay, ExclusiveZoneOverlay, MiniMap, TownInfoPanel (6)
- **Diplomacy**: ChangelingDiplomatBadge, RelationsMatrix, DiplomacyOverlay, RulerDiplomacyPanel, CitizenDiplomacyPanel, WarDashboard (6)
- **Racial Abilities**: RacialAbilitiesTab, CombatAbilityMenu, ProfessionBonusDisplay, SpecialMechanicHUD, AbilityUnlockCelebration, TransformationOverlay (6)

**Total: 63 components across 13 groups + 23 pages = 86 React files**

---

## Section 12: Key Files Reference

### Server
| File | Purpose |
|---|---|
| `server/src/index.ts` | Server bootstrap, Socket.io setup, job startup |
| `server/src/app.ts` | Express app config (helmet, cors, rate limit, routes) |
| `server/src/routes/index.ts` | Route registry (33 route modules) |
| `server/src/socket/events.ts` | 20 server-side event emitters |
| `server/src/socket/chat-handlers.ts` | Chat message handling (7 channel types) |
| `server/src/socket/presence.ts` | Presence tracking (in-memory + Redis) |
| `server/src/socket/middleware.ts` | Socket JWT auth + rate limiting |
| `server/src/lib/prisma.ts` | Prisma client singleton |
| `server/src/lib/redis.ts` | Redis client (optional) |
| `server/src/lib/combat-engine.ts` | Combat calculation engine |
| `server/src/middleware/auth.ts` | REST JWT auth guard |
| `server/src/middleware/validate.ts` | Zod request validation |
| `server/src/middleware/cache.ts` | Redis response cache |
| `server/src/jobs/*.ts` | 11 background cron jobs |

### Client
| File | Purpose |
|---|---|
| `client/src/services/socket.ts` | Socket.io singleton + all event type definitions |
| `client/src/services/api.ts` | Axios instance with auth interceptors |
| `client/src/services/sounds.ts` | Web Audio oscillator sound effects (8 events) |
| `client/src/hooks/*.ts` | 7 realtime event hooks |

### Database
| File | Purpose |
|---|---|
| `database/prisma/schema.prisma` | Prisma schema (PostgreSQL) |

### Monorepo Root
| File | Purpose |
|---|---|
| `package.json` | Workspace config (client, server, shared, database) |
