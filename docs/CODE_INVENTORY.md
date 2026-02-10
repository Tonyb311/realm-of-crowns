# Realm of Crowns -- Code Inventory

> Generated 2026-02-08. Covers every source file in the repository.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [API Endpoints](#2-api-endpoints)
3. [Socket.io Events](#3-socketio-events)
4. [Client Pages](#4-client-pages)
5. [Client Components](#5-client-components)
6. [Client Hooks](#6-client-hooks)
7. [Client Services & Context](#7-client-services--context)
8. [Server Services](#8-server-services)
9. [Server Middleware](#9-server-middleware)
10. [Server Libraries](#10-server-libraries)
11. [Cron Jobs](#11-cron-jobs)
12. [Database Models](#12-database-models)
13. [Shared Data Files](#13-shared-data-files)
14. [Entry Points](#14-entry-points)
15. [Missing / Incomplete Items](#15-missing--incomplete-items)

---

## 1. Project Structure

```
realm_of_crowns/
  client/
    src/
      components/          # 19 implemented components + 20 empty .gitkeep dirs
        ui/                # 5 reusable UI primitives
      context/             # 1 context (AuthContext)
      hooks/               # 3 custom hooks
      pages/               # 18 page components
      services/            # 3 service modules
      App.tsx              # Root component, routing, global providers
      main.tsx             # React 18 entry point
  server/
    src/
      index.ts             # HTTP + Socket.io server, cron bootstrap
      routes/              # 20 route modules
      services/            # 4 service modules
      jobs/                # 3 cron job modules
      middleware/           # 3 middleware modules
      lib/                 # 3 library modules
      socket/              # 4 socket handler/utility modules
  shared/
    types/                 # 3 type definition files
    races/                 # 21 files (20 race definitions + index)
    skills/                # 8 files (6 class definitions + types + index)
    quests/                # 7 files (5 quest sets + types + index)
    achievements.ts        # 25 achievement definitions
    professions/           # .gitkeep only (empty)
    recipes/               # .gitkeep only (empty)
    resources/             # .gitkeep only (empty)
    items/                 # .gitkeep only (empty)
    world/                 # .gitkeep only (empty)
  database/
    prisma/
      schema.prisma        # 1477 lines, 45+ models, 20+ enums
```

---

## 2. API Endpoints

All routes are mounted under `/api` in `server/src/routes/index.ts`.

### Auth (`auth.ts`) -- 4 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account (username, email, password) |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/me` | Yes | Validate token, return user |
| POST | `/auth/logout` | Yes | Logout (server-side cleanup) |

### Characters (`characters.ts`) -- 4 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/characters/create` | Yes | Create character (name, race, class, stats) |
| GET | `/characters/me` | Yes | Get own character |
| GET | `/characters/:id` | Yes | Get character by ID |
| POST | `/characters/allocate-stats` | Yes | Spend stat points |

### Elections (`elections.ts`) -- 6 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/elections/nominate` | Yes | Self-nominate for election |
| POST | `/elections/vote` | Yes | Cast vote for candidate |
| GET | `/elections/current` | Yes | Get active elections |
| GET | `/elections/results` | Yes | Get completed election results |
| GET | `/elections/candidates` | Yes | Get candidates for an election |
| POST | `/elections/impeach` | Yes | Start impeachment |
| POST | `/elections/impeach/vote` | Yes | Vote on impeachment |

### Governance (`governance.ts`) -- 9 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/governance/propose-law` | Yes | Propose a new law |
| POST | `/governance/vote-law` | Yes | Vote on proposed law |
| POST | `/governance/set-tax` | Yes | Set town tax rate (mayor only) |
| GET | `/governance/laws` | Yes | Get active laws |
| GET | `/governance/town-info/:townId` | Yes | Get town governance info |
| POST | `/governance/appoint` | Yes | Appoint council member |
| POST | `/governance/allocate-treasury` | Yes | Allocate treasury funds |
| POST | `/governance/declare-war` | Yes | Declare war (ruler only) |
| POST | `/governance/propose-peace` | Yes | Propose peace treaty |
| GET | `/governance/kingdom/:kingdomId` | Yes | Get kingdom info |

### Messages (`messages.ts`) -- 6 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/messages/send` | Yes | Send message |
| GET | `/messages/inbox` | Yes | Get DM conversations list |
| GET | `/messages/conversation/:characterId` | Yes | Get conversation with character |
| GET | `/messages/channel/:channelType` | Yes | Get channel messages (town/kingdom/guild) |
| POST | `/messages/read` | Yes | Mark messages as read |
| DELETE | `/messages/delete` | Yes | Delete a message |

### Friends (`friends.ts`) -- 6 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/friends/request` | Yes | Send friend request |
| POST | `/friends/accept` | Yes | Accept friend request |
| POST | `/friends/decline` | Yes | Decline friend request |
| DELETE | `/friends/delete` | Yes | Remove friend |
| GET | `/friends/list` | Yes | Get friends list |
| GET | `/friends/requests` | Yes | Get pending requests |

### Notifications (`notifications.ts`) -- 4 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications/list` | Yes | Get notifications |
| POST | `/notifications/read` | Yes | Mark notification read |
| POST | `/notifications/read-all` | Yes | Mark all read |
| DELETE | `/notifications/delete` | Yes | Delete notification |

### Profiles (`profiles.ts`) -- 2 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/characters/:id/profile` | Yes | Get character profile |
| GET | `/characters/search` | Yes | Search characters by name |

### Skills (`skills.ts`) -- 4 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/skills/tree` | Yes | Get skill tree for character's class |
| POST | `/skills/specialize` | Yes | Choose specialization |
| POST | `/skills/unlock` | Yes | Unlock ability |
| GET | `/skills/abilities` | Yes | Get unlocked abilities |

### Travel (`travel.ts`) -- 3 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/travel/start` | Yes | Start travel to destination (1.5x in war zones) |
| GET | `/travel/status` | Yes | Check travel progress |
| POST | `/travel/arrive` | Yes | Complete arrival at destination |

### Work (`work.ts`) -- 4 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/work/start` | Yes | Start gathering/crafting job |
| GET | `/work/status` | Yes | Check job progress |
| POST | `/work/collect` | Yes | Collect completed job results |
| GET | `/work/professions` | Yes | Get character's professions (includes racial bonuses) |

### Crafting (`crafting.ts`) -- 4 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/crafting/recipes` | Yes | Get available recipes |
| POST | `/crafting/start` | Yes | Start crafting |
| GET | `/crafting/status` | Yes | Check crafting progress |
| POST | `/crafting/collect` | Yes | Collect crafted item |

### World (`world.ts`) -- 3 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/world/map` | Yes | Get world map data (cached 300s) |
| GET | `/world/regions` | Yes | Get all regions (cached 300s) |
| GET | `/world/regions/:id` | Yes | Get specific region |

### Towns (`towns.ts`) -- 3 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/towns/:id` | Yes | Get town info (cached 120s) |
| GET | `/towns/:id/buildings` | Yes | Get town buildings |
| GET | `/towns/:id/characters` | Yes | Get characters in town |

### Market (`market.ts`) -- 6 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/market/list` | Yes | Create market listing (10% tax) |
| GET | `/market/browse` | Yes | Browse listings (cached 30s) |
| POST | `/market/buy` | Yes | Purchase listing |
| POST | `/market/cancel` | Yes | Cancel own listing |
| GET | `/market/my-listings` | Yes | Get own active listings |
| GET | `/market/history` | Yes | Get purchase/sale history |

### Guilds (`guilds.ts`) -- 13 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/guilds/create` | Yes | Create guild (costs 500 gold) |
| GET | `/guilds/list` | Yes | List guilds (cached 60s) |
| GET | `/guilds/:id` | Yes | Get guild details |
| PUT | `/guilds/:id` | Yes | Update guild settings |
| DELETE | `/guilds/:id` | Yes | Delete guild |
| POST | `/guilds/:id/invite` | Yes | Invite character |
| POST | `/guilds/:id/join` | Yes | Join guild |
| POST | `/guilds/:id/kick` | Yes | Kick member |
| POST | `/guilds/:id/leave` | Yes | Leave guild |
| POST | `/guilds/:id/promote` | Yes | Promote member |
| POST | `/guilds/:id/donate` | Yes | Donate gold to guild |
| GET | `/guilds/:id/quests` | Yes | Get guild quests **[STUB: returns []]** |
| POST | `/guilds/:id/transfer` | Yes | Transfer leadership |

### Quests (`quests.ts`) -- 7 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/quests/available` | Yes | Get available quests for character |
| GET | `/quests/active` | Yes | Get active quests |
| GET | `/quests/completed` | Yes | Get completed quests |
| POST | `/quests/accept` | Yes | Accept a quest |
| POST | `/quests/progress` | Yes | Report quest progress |
| POST | `/quests/complete` | Yes | Turn in completed quest |
| POST | `/quests/abandon` | Yes | Abandon active quest |
| GET | `/quests/npcs/:townId` | Yes | Get quest NPCs in town |

### Combat PvE (`combat-pve.ts`) -- 3 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/combat-pve/start` | Yes | Start PvE encounter |
| POST | `/combat-pve/action` | Yes | Submit combat action |
| GET | `/combat-pve/state` | Yes | Get current combat state |

### Combat PvP (`combat-pvp.ts`) -- 6 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/combat-pvp/challenge` | Yes | Issue PvP challenge |
| POST | `/combat-pvp/accept` | Yes | Accept challenge |
| POST | `/combat-pvp/decline` | Yes | Decline challenge |
| POST | `/combat-pvp/action` | Yes | Submit combat action |
| GET | `/combat-pvp/state` | Yes | Get current combat state |
| GET | `/combat-pvp/challenges` | Yes | Get pending challenges |
| GET | `/combat-pvp/leaderboard` | Yes | Get PvP leaderboard |

**Total: 92 API endpoints across 20 route modules**

---

## 3. Socket.io Events

Server listens on port 4000 with CORS enabled. JWT auth via socket middleware.

### Client -> Server (Emitted)

| Event | Payload | Source |
|-------|---------|--------|
| `chat:send` | `{ channelType, content, recipientId?, townId?, guildId? }` | ChatPanel |
| `chat:identify` | `{ characterId }` | SocialEventsProvider |

### Server -> Client (Listened)

#### Political Events (8) -- `usePoliticalEvents.ts`

| Event | Payload | UI Effect |
|-------|---------|-----------|
| `election:new` | `{ electionId, type, townName?, kingdomName? }` | Toast notification, invalidate elections cache |
| `election:phase-changed` | `{ electionId, phase, type }` | Toast, invalidate elections cache |
| `election:results` | `{ electionId, type, winnerName, townName?, kingdomName? }` | Toast, invalidate elections + governance caches |
| `impeachment:resolved` | `{ targetName, success, townName? }` | Toast, invalidate governance cache |
| `governance:law-passed` | `{ lawTitle, townName?, kingdomName? }` | Toast, invalidate governance cache |
| `governance:war-declared` | `{ attackerName, defenderName }` | Toast, invalidate governance cache |
| `governance:peace-proposed` | `{ proposerName, targetName }` | Toast |
| `governance:tax-changed` | `{ townName, newRate }` | Toast, invalidate governance cache |

#### Social Events (12) -- `useSocialEvents.ts`

| Event | Payload | UI Effect |
|-------|---------|-----------|
| `chat:message` | `ChatMessage` | Append to chat messages / increment unread |
| `presence:online` | `{ characterId, characterName }` | Invalidate friends cache |
| `presence:offline` | `{ characterId, characterName }` | Invalidate friends cache |
| `presence:friends-online` | `{ friends: Array }` | Invalidate friends cache |
| `player:enter-town` | `{ characterId, characterName, townId }` | Invalidate town characters cache |
| `player:leave-town` | `{ characterId, characterName, townId }` | Invalidate town characters cache |
| `guild:member-joined` | `{ characterId, characterName, guildId }` | Invalidate guild cache |
| `guild:member-left` | `{ characterId, characterName, guildId }` | Invalidate guild cache |
| `guild:dissolved` | `{ guildId, guildName }` | Toast, invalidate guild cache |
| `notification:new` | `Notification` | Increment notification count |
| `combat:result` | `{ combatId, result, xpGained, goldGained }` | Toast notification |
| `trade:completed` | `{ tradeId, itemName, goldAmount }` | Toast notification |

#### Progression Events (2) -- `useProgressionEvents.ts`

| Event | Payload | UI Effect |
|-------|---------|-----------|
| `player:level-up` | `{ newLevel, statPoints, skillPoints, hpGain, mpGain }` | LevelUpCelebration modal (8s auto-dismiss) |
| `achievement:unlocked` | `{ achievementId, name, description }` | Toast notification |

### Server-Side Emitters (`socket/events.ts`) -- 9 functions

| Function | Event(s) Emitted | Target |
|----------|------------------|--------|
| `emitElectionNew` | `election:new` | Town/kingdom room |
| `emitElectionPhaseChanged` | `election:phase-changed` | Town/kingdom room |
| `emitElectionResults` | `election:results` | Town/kingdom room |
| `emitImpeachmentResolved` | `impeachment:resolved` | Town room |
| `emitGovernanceEvent` | Dynamic governance events | Town/kingdom room |
| `emitCombatResult` | `combat:result` | Specific user |
| `emitTradeCompleted` | `trade:completed` | Specific user |
| `emitNotification` | `notification:new` | Specific user |
| `emitPresenceUpdate` | `presence:online/offline` | Friends' rooms |

### Room Management

| Room Pattern | Joined When | Left When |
|--------------|-------------|-----------|
| `town:{townId}` | Character loads, political events hook mounts | Leave town, hook unmounts |
| `kingdom:{kingdomId}` | Political events hook mounts | Hook unmounts |
| `guild:{guildId}` | Guild page loads | Guild page unmounts |

---

## 4. Client Pages

All pages are lazy-loaded via `React.lazy` in `App.tsx`.

| File | Lines | Route | Description |
|------|-------|-------|-------------|
| `LoginPage.tsx` | 96 | `/login` | Email + password form, redirects to `/` on success |
| `RegisterPage.tsx` | 154 | `/register` | Username + email + password + confirm, auto-login on success |
| `CharacterCreationPage.tsx` | 673 | `/create-character` | 4-step wizard: race (20 races, 3 tiers) -> class (6 classes) -> stats (point-buy 27pts) -> name/bio. Local CLASSES array. |
| `TownPage.tsx` | 530 | `/town` | Town hub: buildings grid, online players, town info. Building actions (market/guild/crafting/work/quests/combat/town-hall) |
| `MarketPage.tsx` | 981 | `/market` | Buy/sell with filters (type/rarity/sort/search), price history, 10% listing fee, my listings management |
| `CombatPage.tsx` | 1256 | `/combat` | PvE + PvP combat UI. Monster select, turn-based actions (attack/cast/defend/item/flee), health bars, combat log, death penalty display, PvP challenge system |
| `GuildPage.tsx` | 583 | `/guild` | Guild management: create (500g), member list with roles, invite/kick/promote, treasury donations, guild quests tab, settings. No-guild state with browse. |
| `QuestJournalPage.tsx` | 456 | `/quests` | Quest journal with tabs (available/active/completed), quest cards with objective progress bars, accept/abandon actions, QuestDialog for details |
| `SkillTreePage.tsx` | 473 | `/skills` | Skill tree: specialization selection (3 per class), tiered ability grid (4 tiers), unlock with skill points, prerequisite chains |
| `AchievementPage.tsx` | 219 | `/achievements` | Achievement grid by category (9 categories), progress bars, completion percentages, reward display |
| `CraftingPage.tsx` | 915 | `/crafting` | Recipe browser with profession filter, material requirements check, crafting queue with timers, quality tiers (common->legendary) |
| `GovernancePage.tsx` | 713 | `/governance` | Mayor/ruler panel: propose laws, set tax, appoint officials, treasury allocation, war declaration, peace proposals |
| `InventoryPage.tsx` | 492 | `/inventory` | Item grid with type/rarity filters, equip/unequip, item detail panel with stats, equipment slots display |
| `KingdomPage.tsx` | 310 | `/kingdom` | Kingdom overview: ruler, treasury, royal council, active wars, active laws, elections link. Uses URL query param `?id=` |
| `ElectionPage.tsx` | 583 | `/elections` | Election management: nomination, voting, results display, candidate profiles with platforms, countdown timers, impeachment UI |
| `ProfilePage.tsx` | 242 | `/profile/:characterId` | Character profile: stats hexagon, bio, guild, level/XP progress, friend request + DM buttons. Uses `window.__chatOpenDM` |
| `TownHallPage.tsx` | 387 | `/town-hall` | Town government: mayor card, sheriff, town council, treasury/tax display, active elections with countdown timers |
| `WorldMapPage.tsx` | 866 | `/map` | Interactive canvas-drawn world map with zoom/pan, 70+ towns grouped by region, travel system with time estimates, region info panel. Hardcoded fallback data. |

---

## 5. Client Components

### Application Components

| File | Lines | Description |
|------|-------|-------------|
| `ChatPanel.tsx` | 401 | 4-channel chat (town/kingdom/guild/DMs). Minimizable floating panel. Real-time via socket + REST persist. DM inbox. Exposes `window.__chatOpenDM`. |
| `HUD.tsx` | 201 | Fixed top bar: portrait, name, level, HP/MP bars, XP bar, gold, location link, sound toggle. Polls every 15s. |
| `FriendsList.tsx` | 293 | Slide-out panel: online/offline sections, pending requests, add via PlayerSearch, message/profile/remove actions |
| `NotificationDropdown.tsx` | 183 | Bell icon with unread badge (99+ cap), dropdown list, mark read/delete. Polls 30s + socket listener |
| `QuestDialog.tsx` | 163 | Modal: quest details, objectives with verb mapping, rewards, accept/decline |
| `StatAllocation.tsx` | 150 | 6-stat allocation with +/- buttons, remaining points, confirm POST |
| `PlayerSearch.tsx` | 109 | Debounced search (300ms), dropdown results from `/characters/search` |
| `LevelUpCelebration.tsx` | 77 | Full-screen modal: level number, gains, auto-dismiss 8s, "Allocate Stats" button |
| `PoliticalNotifications.tsx` | 48 | Mounts react-hot-toast Toaster, delegates to `usePoliticalEvents` hook |
| `XpBar.tsx` | 43 | Level display + XP progress bar (formula: level * 100) |
| `ProgressionEventsProvider.tsx` | 33 | Renders LevelUpCelebration when `useProgressionEvents` fires level-up |
| `SocialEventsProvider.tsx` | 32 | Invisible; subscribes to social socket events, emits `chat:identify` |
| `LoadingScreen.tsx` | 11 | Full-screen spinner |

### UI Primitives (`components/ui/`)

| File | Lines | Description |
|------|-------|-------------|
| `Navigation.tsx` | 147 | Desktop bottom nav (9 items) + mobile hamburger slide-out. Hidden on auth routes. |
| `ErrorMessage.tsx` | 74 | Status-aware error display (401/403/404/network/general), optional retry |
| `Tooltip.tsx` | 74 | Hover tooltip with 4 positions, 200ms delay, arrow |
| `LoadingSkeleton.tsx` | 70 | 5 skeleton variants: Text, Avatar, Row, Card, Table |
| `PageLayout.tsx` | 59 | Reusable page wrapper with header and configurable max-width |
| `ProtectedRoute.tsx` | 23 | Auth guard, redirects to `/login` if unauthenticated |

---

## 6. Client Hooks

| File | Lines | Description |
|------|-------|-------------|
| `usePoliticalEvents.ts` | 229 | Subscribes to 8 political socket events. Shows toasts. Invalidates React Query caches. Manages town/kingdom room join/leave. |
| `useSocialEvents.ts` | 184 | Subscribes to 12 social socket events. Emits `chat:identify` on mount. Invalidates caches for friends, town, guild, notifications. |
| `useProgressionEvents.ts` | 76 | Subscribes to `player:level-up` and `achievement:unlocked`. Returns `levelUpData` state for LevelUpCelebration component. |

---

## 7. Client Services & Context

### Services

| File | Lines | Description |
|------|-------|-------------|
| `api.ts` | 32 | Axios instance, baseURL `/api`. Request interceptor attaches `Bearer` token from `localStorage('roc_token')`. Response interceptor clears token + redirects on 401. |
| `socket.ts` | 212 | Socket.io singleton (`getSocket`/`connectSocket`/`disconnectSocket`). Exports all event payload interfaces. Room management functions (`joinRooms`/`leaveRooms`/`joinGuildRoom`/`leaveGuildRoom`). WebSocket + polling transports. |
| `sounds.ts` | 131 | Web Audio API oscillator-based sound engine. 8 sounds: levelUp, goldEarned, combatHit, combatMiss, questComplete, notification, buttonClick, error. Volume/mute persisted in localStorage. Default volume 0.3. |

### Context

| File | Lines | Description |
|------|-------|-------------|
| `AuthContext.tsx` | 87 | `AuthProvider` with `login`/`register`/`logout`. Token in `localStorage('roc_token')`. Validates on mount via `GET /auth/me`. Exports `useAuth()` hook with `user`, `token`, `isAuthenticated`, `isLoading`, `login`, `register`, `logout`. |

---

## 8. Server Services

| File | Lines | Description |
|------|-------|-------------|
| `law-effects.ts` | -- | Calculates effective tax rates, applies trade restrictions, checks war status between kingdoms |
| `quest-triggers.ts` | -- | Event handlers: `onMonsterKill`, `onResourceGather`, `onVisitLocation`. Updates quest objective progress. |
| `achievements.ts` | -- | 10 achievement categories. `seedAchievements()` populates DB. Check/unlock functions for each category. |
| `progression.ts` | -- | Level-up logic. XP formula: `level * 100` XP per level. Awards stat points + skill points on level up. |

---

## 9. Server Middleware

| File | Description |
|------|-------------|
| `auth.ts` | JWT Bearer token verification. Attaches `req.user` with userId. Returns 401 on invalid/missing token. |
| `validate.ts` | Zod schema validation middleware. Validates `req.body`, `req.query`, or `req.params` against provided schema. Returns 400 with error details. |
| `cache.ts` | Redis-backed response caching with configurable TTL. Cache key derived from route + query params. Falls through on cache miss. |

---

## 10. Server Libraries

| File | Lines | Description |
|------|-------|-------------|
| `combat-engine.ts` | 965 | Pure-function turn-based combat engine. Handles attack/cast/defend/item/flee actions. 12 status effects (poison, burn, freeze, stun, bleed, slow, blind, silence, weakness, vulnerability, regeneration, shielded). Exploding crits, miss chance, spell resistance, flee probability. Death penalty calculation. |
| `redis.ts` | -- | ioredis singleton with retry strategy. Used for response caching and combat state storage. |
| `prisma.ts` | -- | PrismaClient singleton instance. |

---

## 11. Cron Jobs

| File | Schedule | Description |
|------|----------|-------------|
| `election-lifecycle.ts` | Every 5 minutes | Advances election phases (NOMINATIONS -> VOTING -> COMPLETED). Creates new elections when terms expire. Tallies votes and declares winners. |
| `tax-collection.ts` | Every hour | Collects taxes from all characters based on town tax rate. Deposits into town treasury. Applies law modifiers. |
| `law-expiration.ts` | Every 15 minutes | Checks law expiration dates. Deactivates expired laws. Removes effects of expired laws. |

---

## 12. Database Models

Source: `database/prisma/schema.prisma` (1477 lines)

### Core Models (45+)

| Model | Key Fields | Description |
|-------|------------|-------------|
| `User` | id, username, email, passwordHash, role | Account |
| `Character` | id, userId, name, race, class, level, xp, gold, stats (6), currentTownId, guildId, hp, maxHp, mp, maxMp, statPoints, skillPoints | Player character |
| `Town` | id, name, regionId, population, treasury, taxRate, mayorId | Game town |
| `Region` | id, name, description, kingdomId, biome | World region |
| `Kingdom` | id, name, rulerId, treasury | Kingdom |
| `Guild` | id, name, tag, leaderId, treasury, description, maxMembers | Player guild |
| `GuildMember` | id, guildId, characterId, role, joinedAt | Guild membership |
| `Item` | id, name, type, rarity, description, stats, value | Item definition |
| `InventoryItem` | id, characterId, itemId, quantity, isEquipped, slot | Character inventory |
| `MarketListing` | id, sellerId, itemId, price, quantity, status, listedAt, expiresAt | Market listing |
| `MarketTransaction` | id, listingId, buyerId, sellerId, price, quantity, transactedAt | Transaction record |
| `Quest` | id, type, title, description, level, objectives, rewards, prerequisites | Quest definition |
| `ActiveQuest` | id, characterId, questId, status, progress, startedAt | In-progress quest |
| `CompletedQuest` | id, characterId, questId, completedAt | Finished quest |
| `Election` | id, type, townId, kingdomId, phase, termNumber, startDate, endDate | Election |
| `ElectionCandidate` | id, electionId, characterId, platform, nominatedAt | Candidate |
| `ElectionVote` | id, electionId, voterId, candidateId | Vote |
| `Impeachment` | id, targetId, townId, reason, phase, votesFor, votesAgainst | Impeachment |
| `Law` | id, title, description, lawType, status, kingdomId, townId, proposedBy, votesFor, votesAgainst, enactedAt, expiresAt | Law |
| `War` | id, attackerId, defenderId, status, startedAt | War |
| `CouncilMember` | id, townId, kingdomId, characterId, role, appointedAt | Council position |
| `Message` | id, senderId, recipientId, channelType, content, townId, guildId, read, timestamp | Chat message |
| `Friendship` | id, requesterId, receiverId, status, createdAt | Friend relation |
| `Notification` | id, userId, type, title, body, read, data, createdAt | Notification |
| `CombatState` | id, type, participants, currentTurn, turnLog, status | Combat instance |
| `PvpChallenge` | id, challengerId, defenderId, status, createdAt | PvP challenge |
| `PvpLeaderboard` | id, characterId, wins, losses, rating | PvP ranking |
| `Skill` | id, characterId, abilityId, unlockedAt | Unlocked ability |
| `Specialization` | id, characterId, classType, specializationType, chosenAt | Chosen spec |
| `Achievement` | id, name, description, category, criteria, rewards | Achievement def |
| `PlayerAchievement` | id, characterId, achievementId, progress, unlockedAt | Player progress |
| `Profession` | id, characterId, type, level, xp | Profession level |
| `CraftingJob` | id, characterId, recipeId, status, startedAt, completesAt | Crafting queue |
| `GatheringJob` | id, characterId, type, townId, status, startedAt, completesAt | Gathering queue |
| `TravelState` | id, characterId, fromTownId, toTownId, startedAt, arrivesAt, status | Travel in progress |
| `Building` | id, townId, type, name, level | Town building |

### Enums (20+)

`Race`, `CharacterClass`, `ItemType`, `ItemRarity`, `MarketListingStatus`, `QuestType`, `QuestStatus`, `ElectionType`, `ElectionPhase`, `ImpeachmentPhase`, `LawType`, `LawStatus`, `WarStatus`, `CouncilRole`, `MessageChannelType`, `FriendshipStatus`, `NotificationType`, `CombatType`, `CombatStatus`, `ProfessionType`, `Biome`, `GuildRole`, `BuildingType`

---

## 13. Shared Data Files

### Races (`shared/races/`) -- 21 files

**Index** (`index.ts`): `RaceRegistry` map of all 20 races. Helpers: `getRace`, `getRacesByTier`, `getSubRaces`, `getStatModifiers`, `getAllRaces`.

**Types** (`types/race.ts`): `RaceDefinition`, `StatModifiers`, `RacialAbility`, `ProfessionBonus`, `SubRaceOption`.

| Tier | Race | File | Stat Mods | Homeland | Sub-races | Special |
|------|------|------|-----------|----------|-----------|---------|
| Core | Human | `human.ts` | +1 all | Heartlands | -- | Versatile |
| Core | Elf | `elf.ts` | +3 DEX | Silverwood | -- | |
| Core | Dwarf | `dwarf.ts` | +3 CON +2 STR | Ironvault | -- | Exclusive: Deep Mines |
| Core | Halfling | `halfling.ts` | +3 DEX +2 CHA | Crossroads | -- | |
| Core | Orc | `orc.ts` | +4 STR +3 CON | Ashenfang | -- | |
| Core | Tiefling | `tiefling.ts` | +3 INT +2 CHA | Shadowmere | -- | |
| Core | Dragonborn | `dragonborn.ts` | +3 STR +2 CON +2 WIS | Frozen Reaches | 7 (red/blue/white/black/green/gold/silver) | Exclusive: Dragon Lairs |
| Common | Half-Elf | `half-elf.ts` | +3 CHA | Twilight March | -- | |
| Common | Half-Orc | `half-orc.ts` | +3 STR | Scarred Frontier | -- | |
| Common | Gnome | `gnome.ts` | +4 INT | Cogsworth Warrens | -- | |
| Common | Merfolk | `merfolk.ts` | +2 DEX/CON/WIS | Pelagic Depths | -- | Underwater zones, exclusive resources |
| Common | Beastfolk | `beastfolk.ts` | +2 STR/DEX/CON/WIS | Thornwilds | 6 (wolf/bear/fox/hawk/panther/boar) | Exclusive: Deep Thornwilds |
| Common | Faefolk | `faefolk.ts` | +4 DEX +3 WIS/CHA -3 STR -2 CON | Glimmerveil | -- | Feywild access, crafting penalties ("hard mode") |
| Exotic | Goliath | `goliath.ts` | +4 STR/CON | Skypeak | -- | Exclusive: Sky Peaks |
| Exotic | Drow | `drow.ts` | +3 DEX | Underdark | -- | Underdark access, sunlight penalty |
| Exotic | Firbolg | `firbolg.ts` | +4 WIS | Mistwood | -- | Speak to animals/plants, Exclusive: Deepwood Groves |
| Exotic | Warforged | `warforged.ts` | +3 CON | Foundry | -- | No food/rest, requires maintenance, Exclusive: Foundry Core |
| Exotic | Genasi | `genasi.ts` | +2 INT | Confluence | 4 (fire/water/earth/air) | Exclusive: Elemental Rifts |
| Exotic | Revenant | `revenant.ts` | +3 CON | Ashenmoor | -- | 50% death penalty reduction, Exclusive: Deadlands |
| Exotic | Changeling | `changeling.ts` | +4 CHA | No homeland | -- | Start anywhere, spy network (lvl 25) |

Each race file defines: id, name, tier, lore paragraph, trait description, statModifiers, 6 racial abilities (unlocked at levels 1/5/10/20/30/40), professionBonuses, homelandRegion, startingTowns.

### Skills (`shared/skills/`) -- 8 files

**Types** (`types.ts`): `AbilityDefinition`, `SpecializationDefinition`, `ClassDefinition`.

**Index** (`index.ts`): `ALL_ABILITIES` (108 total), `ABILITIES_BY_CLASS`, `VALID_CLASSES`, `SPECIALIZATIONS` (18 total).

| Class | File | Specializations | Abilities |
|-------|------|-----------------|-----------|
| Warrior | `warrior.ts` | Berserker (damage/rage), Guardian (tank/shield), Warlord (buffs/leadership) | 18 |
| Mage | `mage.ts` | Elementalist (fire/ice/lightning), Necromancer (undead/drain), Enchanter (buffs/debuffs) | 18 |
| Rogue | `rogue.ts` | Assassin (stealth/crit), Thief (steal/lockpick), Swashbuckler (dodge/dual-wield) | 18 |
| Cleric | `cleric.ts` | Healer (heal/cure), Paladin (holy damage/armor), Inquisitor (smite/purge) | 18 |
| Ranger | `ranger.ts` | Beastmaster (pet/summon), Sharpshooter (ranged/crit), Tracker (traps/detection) | 18 |
| Bard | `bard.ts` | Diplomat (social/charm), Battlechanter (combat buffs/songs), Lorekeeper (knowledge/identify) | 18 |

Each ability has: id, name, description, class, specialization, tier (1-4), effects array, cooldown, manaCost, prerequisiteAbilityId, levelRequired.

### Quests (`shared/quests/`) -- 7 files

**Types** (`types.ts`): `QuestDefinition`, `QuestObjective`, `QuestRewards`. Types: MAIN, TOWN, DAILY, GUILD, BOUNTY, RACIAL. Objective types: KILL, GATHER, DELIVER, TALK, VISIT.

| File | Count | Description |
|------|-------|-------------|
| `main-quests.ts` | 8 | Story arc: "The Awakening" (lvl 1) through "The Final Stand" (lvl 16). Chained prerequisites. |
| `town-quests.ts` | 15 | Regional quests across Heartlands (5), Silverwood (3), Ironvault (3), Crossroads (3) |
| `daily-quests.ts` | 5 | Repeatable with 24h cooldown: hunt, gather, patrol, slayer, prospector |
| `guild-quests.ts` | 3 | Guild initiation, resource drive, expedition |
| `bounty-quests.ts` | 3 | Orc Raiders (lvl 5), Troll Menace (lvl 8), Dragon Slayer (lvl 12) |

**Total: 34 quest definitions**

### Achievements (`shared/achievements.ts`) -- 25 definitions

| Category | Count | Examples |
|----------|-------|---------|
| combat_pve | 4 | First Blood, Monster Slayer (100 kills), Veteran (500), Champion (1000) |
| combat_pvp | 3 | Duelist (1 win), Gladiator (50 wins), Warlord (200 wins) |
| crafting | 3 | Apprentice Crafter, Master Crafter, Legendary Artisan |
| social | 3 | Friendly (5 friends), Popular (20 friends), Beloved (50 friends) |
| exploration | 2 | Explorer (10 towns), Cartographer (all towns) |
| economy | 3 | Merchant (10 sales), Tycoon (100 sales), Magnate (1000 gold profit) |
| political | 2 | Elected (win election), Lawmaker (pass 5 laws) |
| leveling | 3 | Adventurer (lvl 10), Hero (lvl 25), Legend (lvl 50) |
| gathering | 2 | Gatherer (100 resources), Master Gatherer (1000) |

Rewards include XP, gold, and title strings.

### Types (`shared/types/`) -- 3 files

| File | Lines | Key Exports |
|------|-------|-------------|
| `race.ts` | 52 | `StatModifiers`, `RacialAbility`, `ProfessionBonus`, `SubRaceOption`, `RaceDefinition` |
| `combat.ts` | 243 | `CharacterStats`, `CombatAction`, `StatusEffect` (12 types), `Combatant`, `TurnResult`, `CombatState`, `DeathPenalty`, `SpellInfo`, `WeaponInfo`, `ItemInfo` |
| `index.ts` | 2 | Re-exports all combat types |

### Empty / Placeholder Directories

| Directory | Status |
|-----------|--------|
| `shared/professions/` | `.gitkeep` only |
| `shared/recipes/` | `.gitkeep` only |
| `shared/resources/` | `.gitkeep` only |
| `shared/items/` | `.gitkeep` only |
| `shared/world/` | `.gitkeep` only |

---

## 14. Entry Points

### Client

| File | Lines | Description |
|------|-------|-------------|
| `client/src/main.tsx` | 26 | React 18 `createRoot`, `StrictMode`, `QueryClientProvider` (staleTime 5min, 1 retry), `BrowserRouter` |
| `client/src/App.tsx` | 255 | `AuthProvider` wraps all. 7 always-mounted global components. 18 lazy-loaded routes. Inline `HomePage` component. |

### Server

| File | Lines | Description |
|------|-------|-------------|
| `server/src/index.ts` | 80 | Express + HTTP server on port 4000. Socket.io with CORS. Socket auth middleware. Event broadcaster. Presence setup. Guild room handlers. Chat handlers. 3 cron jobs started on `listen`. Exports `emitGovernanceEvent` and `io`. |

---

## 15. Missing / Incomplete Items

### Stub Endpoints

1. **Guild quests** -- `GET /guilds/:id/quests` returns `{ quests: [] }` (hardcoded empty array).
2. **Equip/unequip** -- `InventoryPage.tsx` calls `POST /characters/me/equip` and `POST /characters/me/unequip`, but these endpoints do not appear in any route file.

### Placeholder UI

3. **Guild Settings** -- `GuildPage.tsx` settings tab displays "Guild settings will be available in a future update."

### Empty Shared Data Directories

4. `shared/professions/` -- only `.gitkeep`
5. `shared/recipes/` -- only `.gitkeep`
6. `shared/resources/` -- only `.gitkeep`
7. `shared/items/` -- only `.gitkeep`
8. `shared/world/` -- only `.gitkeep`

### Empty Component Directories

9. **20 subdirectories** under `client/src/components/` contain only `.gitkeep` files (no implemented components).

### Data Gaps

10. **RACIAL quest type** -- Defined in `quests/types.ts` as a valid quest type but no data file exists with RACIAL quests.
11. **CharacterCreationPage local CLASSES** -- Class definitions (warrior/mage/rogue/cleric/ranger/bard with descriptions and stat bonuses) are defined locally in `CharacterCreationPage.tsx` rather than in `shared/skills/` or a dedicated shared file.

### Architecture Notes

12. **`window.__chatOpenDM` global** -- `ChatPanel.tsx` exposes `openDM` on `window` for cross-component DM opening. Used by `ProfilePage.tsx`. Works but is a non-React pattern.
13. **KingdomPage default ID** -- `KingdomPage.tsx` falls back to `'default'` kingdom ID when no `?id=` query parameter is provided.
14. **WorldMapPage hardcoded data** -- Contains hardcoded fallback data for 70+ towns used when the API is unavailable.

---

*End of inventory.*
