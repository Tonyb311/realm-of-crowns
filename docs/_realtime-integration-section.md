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
