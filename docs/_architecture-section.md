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
