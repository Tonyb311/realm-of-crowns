# Realm of Crowns -- Code Inventory

> Updated 2026-02-10. Covers every source file in the repository after Phase 2B completion + P0/P1/P2/P3 fix passes.

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
12. [Database Schema](#12-database-schema)
13. [Shared Data Files](#13-shared-data-files)
14. [Database Seeds](#14-database-seeds)
15. [Test Suites](#15-test-suites)
16. [Entry Points](#16-entry-points)
17. [Migrations](#17-migrations)

---

## 1. Project Structure

```
realm_of_crowns/
  client/
    src/
      components/          # 83 implemented components across 18 subdirectories
        ui/                # 8 reusable UI primitives
        professions/       # 3 profession UI components
        gathering/         # 3 gathering UI components
        crafting/          # 5 crafting UI components
        housing/           # 7 housing/building components
        trade/             # 7 trade/caravan components
        races/             # 5 race selection/display components
        map/               # 6 world map components
        diplomacy/         # 6 diplomacy UI components
        racial-abilities/  # 6 racial ability components
        daily-actions/     # 3 daily action components
        daily-report/      # 2 daily report components
        food/              # 3 food system components
        combat/            # 6 combat UI components
        travel/            # 2 travel components
        shared/            # 2 shared utility components
        admin/             # 1 admin layout component
      context/             # 1 context (AuthContext)
      hooks/               # 7 custom hooks
      pages/               # 24 page components + 6 admin pages (30 total)
      services/            # 3 service modules (api, socket, sounds)
      constants/           # 1 constants module
      App.tsx              # Root component, routing, global providers
      main.tsx             # React 18 entry point
  server/
    src/
      index.ts             # HTTP + Socket.io server, cron bootstrap
      app.ts               # Express app configuration
      routes/              # 40 route modules (33 root + 7 admin)
      services/            # 31 service modules
      jobs/                # 17 cron job modules
      middleware/           # 6 middleware modules
      lib/                 # 5 library modules
      socket/              # 4 socket handler/utility modules
      __tests__/           # 8 test suites + 2 setup files
  shared/
    src/
      types/               # 4 type definition files (index, combat, race, psion-perks)
      data/
        races/             # 21 files (7 core + 6 common + 7 exotic + index)
        skills/            # 9 files (7 class definitions + types + index)
        quests/            # 7 files (5 quest sets + types + index)
        professions/       # 7 files (gathering, crafting, service, tiers, xp-curve, types, index)
        recipes/           # 15 files (weapons, armor, consumables, smelter, tailor, woodworker, tanner, mason, ranged-weapons, accessories, enchantments, housing, mount-gear, types, index)
        resources/         # 9 files (ores, woods, grains, herbs, fish, stone, animal, types, index)
        buildings/         # 1 file (requirements)
        caravans/          # 1 file (types)
        tools/             # 1 file (index)
        progression/       # 2 files (xp-curve, index)
        achievements.ts    # Achievement definitions
      utils/               # 2 files (dice, bounded-accuracy)
      constants/           # 1 file (index)
  database/
    prisma/
      schema.prisma        # Prisma schema with 45+ models and 20+ enums
      migrations/          # 11 migrations (init through fix_cascade_deletes)
    seeds/                 # 18 seed files
```

---

## 2. API Endpoints

All routes are mounted under `/api` in `server/src/routes/index.ts`.

### Route Modules (40 total: 33 root + 7 admin)

**Root routes (33 files):**
`auth.ts`, `characters.ts`, `elections.ts`, `governance.ts`, `messages.ts`, `friends.ts`, `notifications.ts`, `profiles.ts`, `skills.ts`, `travel.ts`, `work.ts`, `crafting.ts`, `world.ts`, `towns.ts`, `market.ts`, `guilds.ts`, `quests.ts`, `combat-pve.ts`, `combat-pvp.ts`, `actions.ts`, `buildings.ts`, `caravans.ts`, `equipment.ts`, `food.ts`, `items.ts`, `professions.ts`, `races.ts`, `reports.ts`, `special-mechanics.ts`, `tools.ts`, `trade-analytics.ts`, `regions.ts`, `world-events.ts`, `loans.ts`, `service.ts`, `zones.ts`, `diplomacy.ts`, `petitions.ts`, `game.ts`, `index.ts`

**Admin routes (7 files in `admin/` subdirectory):**
`admin/index.ts`, `admin/stats.ts`, `admin/users.ts`, `admin/characters.ts`, `admin/world.ts`, `admin/economy.ts`, `admin/tools.ts`

---

## 3. Socket.io Events

Server listens on port 4000 with CORS enabled. JWT auth via socket middleware.

### Client -> Server

| Event | Payload | Source |
|-------|---------|--------|
| `chat:send` | `{ channelType, content, recipientId?, townId?, guildId? }` | ChatPanel |
| `chat:identify` | `{ characterId }` | SocialEventsProvider |

### Server -> Client

**Political Events (8):** `election:new`, `election:phase-changed`, `election:results`, `impeachment:resolved`, `governance:law-passed`, `governance:war-declared`, `governance:peace-proposed`, `governance:tax-changed`

**Social Events (12):** `chat:message`, `presence:online`, `presence:offline`, `presence:friends-online`, `player:enter-town`, `player:leave-town`, `guild:member-joined`, `guild:member-left`, `guild:dissolved`, `notification:new`, `combat:result`, `trade:completed`

**Progression Events (2):** `player:level-up`, `achievement:unlocked`

### Server-Side Emitters (`socket/events.ts`)

`emitElectionNew`, `emitElectionPhaseChanged`, `emitElectionResults`, `emitImpeachmentResolved`, `emitGovernanceEvent`, `emitCombatResult`, `emitTradeCompleted`, `emitNotification`, `emitPresenceUpdate`

### Socket Modules (4 files)

| File | Description |
|------|-------------|
| `chat-handlers.ts` | Chat message handling with XSS sanitization, ownership verification |
| `events.ts` | Server-side event emitters for all broadcast events |
| `middleware.ts` | JWT auth middleware, rate limiting (keyed by userId) |
| `presence.ts` | Online/offline tracking, friend presence |

---

## 4. Client Pages (30 total: 24 root + 6 admin)

### Root Pages (24 files)

| File | Route | Description |
|------|-------|-------------|
| `LoginPage.tsx` | `/login` | Email + password form |
| `RegisterPage.tsx` | `/register` | Account registration |
| `CharacterCreationPage.tsx` | `/create-character` | 4-step wizard: race, class, stats, name |
| `RaceSelectionPage.tsx` | `/race-selection` | Race browser with tier filtering |
| `TownPage.tsx` | `/town` | Town hub with buildings, players, info |
| `MarketPage.tsx` | `/market` | Buy/sell with dynamic tax rates |
| `CombatPage.tsx` | `/combat` | PvE + PvP with player search |
| `GuildPage.tsx` | `/guild` | Guild management |
| `QuestJournalPage.tsx` | `/quests` | Quest journal with tabs |
| `SkillTreePage.tsx` | `/skills` | Skill tree with specializations |
| `AchievementPage.tsx` | `/achievements` | Achievement grid by category |
| `CraftingPage.tsx` | `/crafting` | Recipe browser, crafting queue |
| `GovernancePage.tsx` | `/governance` | Laws, taxes, war/peace |
| `InventoryPage.tsx` | `/inventory` | Item grid with equipment |
| `KingdomPage.tsx` | `/kingdom` | Kingdom overview |
| `ElectionPage.tsx` | `/elections` | Election management |
| `ProfilePage.tsx` | `/profile/:characterId` | Character profile |
| `TownHallPage.tsx` | `/town-hall` | Town government display |
| `WorldMapPage.tsx` | `/map` | Interactive canvas world map |
| `ProfessionsPage.tsx` | `/professions` | Profession management |
| `HousingPage.tsx` | `/housing` | Building/housing system |
| `TradePage.tsx` | `/trade` | Caravan trade system |
| `DiplomacyPage.tsx` | `/diplomacy` | Racial relations, treaties |
| `DailyDashboard.tsx` | `/daily` | Daily action dashboard |

### Admin Pages (6 files in `admin/` subdirectory)

| File | Route | Description |
|------|-------|-------------|
| `AdminDashboardPage.tsx` | `/admin` | Admin overview dashboard |
| `AdminUsersPage.tsx` | `/admin/users` | User management |
| `AdminCharactersPage.tsx` | `/admin/characters` | Character management |
| `AdminWorldPage.tsx` | `/admin/world` | World/region management |
| `AdminEconomyPage.tsx` | `/admin/economy` | Economy monitoring |
| `AdminToolsPage.tsx` | `/admin/tools` | Admin tools |

---

## 5. Client Components (83 total)

### Application Components (13 root-level)

`ChatPanel.tsx`, `HUD.tsx`, `FriendsList.tsx`, `NotificationDropdown.tsx`, `QuestDialog.tsx`, `StatAllocation.tsx`, `PlayerSearch.tsx`, `LevelUpCelebration.tsx`, `PoliticalNotifications.tsx`, `XpBar.tsx`, `ProgressionEventsProvider.tsx`, `SocialEventsProvider.tsx`, `LoadingScreen.tsx`

### UI Primitives (`ui/` -- 8 files)

`ProtectedRoute.tsx`, `AdminRoute.tsx`, `Navigation.tsx`, `ErrorBoundary.tsx`, `ErrorMessage.tsx`, `Tooltip.tsx`, `LoadingSkeleton.tsx`, `PageLayout.tsx`

### Feature Components by Subdirectory

| Subdirectory | Count | Files |
|--------------|-------|-------|
| `professions/` | 3 | ProfessionCard, ProfessionDetail, LearnProfessionModal |
| `gathering/` | 3 | ToolSlot, ToolSelector, GatheringResults |
| `crafting/` | 5 | CraftingResults, CraftingQueue, RecipeList, WorkTab |
| `housing/` | 7 | BuildingCard, ConstructionProgress, BuildingDirectory, ConstructionFlow, BuildingInterior, WorkshopView, ShopView |
| `trade/` | 7 | CaravanCard, CargoLoader, AmbushEvent, CaravanManager, PriceCompare, BestTrades, MerchantDashboard |
| `races/` | 5 | RaceCard, RaceDetailPanel, RaceCompare, RaceInfoSheet, SubRaceSelector |
| `map/` | 6 | MapTooltip, TownMarker, ExclusiveZoneOverlay, MiniMap, TownInfoPanel, RegionOverlay |
| `diplomacy/` | 6 | ChangelingDiplomatBadge, DiplomacyOverlay, RulerDiplomacyPanel, CitizenDiplomacyPanel, WarDashboard, RelationsMatrix |
| `racial-abilities/` | 6 | RacialAbilitiesTab, AbilityUnlockCelebration, TransformationOverlay, ProfessionBonusDisplay, CombatAbilityMenu, SpecialMechanicHUD |
| `daily-actions/` | 3 | ActionTimer, ActionLockInPanel, CombatParameterPanel |
| `daily-report/` | 2 | DailyReportView, ReportHistoryPanel |
| `food/` | 3 | FoodInventoryPanel, FoodPreferencePanel, HungerStatusIndicator |
| `combat/` | 6 | CombatLogViewer, CombatLog, CombatantCard, CombatActions, LootPanel, CombatHeader |
| `travel/` | 2 | NodeMapView, TravelPlanner |
| `shared/` | 2 | GoldAmount, CountdownTimer |
| `admin/` | 1 | AdminLayout |

---

## 6. Client Hooks (7 files)

| File | Description |
|------|-------------|
| `usePoliticalEvents.ts` | 8 political socket event subscriptions |
| `useSocialEvents.ts` | 12 social socket event subscriptions |
| `useProgressionEvents.ts` | Level-up and achievement event handling |
| `useGatheringEvents.ts` | Gathering completion events |
| `useCraftingEvents.ts` | Crafting completion events |
| `useBuildingEvents.ts` | Building/construction events |
| `useTradeEvents.ts` | Trade and caravan events |

---

## 7. Client Services & Context

### Services (3 files)

| File | Description |
|------|-------------|
| `api.ts` | Axios instance with JWT interceptor, `roc:auth-expired` event on 401 |
| `socket.ts` | Socket.io singleton with reconnection handling, connection status tracking, room management |
| `sounds.ts` | Web Audio API sound engine (8 sounds) |

### Context (1 file)

| File | Description |
|------|-------------|
| `AuthContext.tsx` | Auth provider with login/register/logout, `roc:auth-expired` listener |

### Constants (1 file)

| File | Description |
|------|-------------|
| `constants/index.ts` | Shared client constants |

---

## 8. Server Services (31 files)

### Core Systems (7)

| File | Description |
|------|-------------|
| `progression.ts` | XP calculation, level-up, stat/skill point awards |
| `food-system.ts` | Spoilage, auto-consumption, hunger modifiers |
| `durability.ts` | Item wear tracking |
| `combat-presets.ts` | Pre-configured combat behavior |
| `action-lock-in.ts` | Daily action commitment logic |
| `profession-xp.ts` | Profession XP and tier advancement |
| `item-stats.ts` | Item stat calculations |

### Race-Specific Services (8)

| File | Description |
|------|-------------|
| `changeling-service.ts` | Disguise mechanics |
| `faefolk-service.ts` | Feywild interactions |
| `forgeborn-service.ts` | Maintenance kits, structural decay |
| `merfolk-service.ts` | Deep ocean mechanics |
| `nightborne-service.ts` | Underdark interactions |
| `revenant-service.ts` | Soul essence, soul fade |
| `psion-perks.ts` | Psion ability bonuses |
| `race-environment.ts` | Biome/environment effects per race |

### Racial Mechanics (6)

| File | Description |
|------|-------------|
| `racial-bonus-calculator.ts` | Composite racial bonus calculations |
| `racial-combat-abilities.ts` | 121 racial abilities across 20 races |
| `racial-passive-tracker.ts` | Persistent passive effect tracking |
| `racial-profession-bonuses.ts` | Gathering/crafting/material bonuses |
| `racial-special-profession-mechanics.ts` | Race-specific profession interactions |
| `regional-mechanics.ts` | Region-specific game rules |

### Combat & Travel (4)

| File | Description |
|------|-------------|
| `tick-combat-resolver.ts` | Daily tick PvE/PvP combat resolution |
| `travel-resolver.ts` | Travel resolution, node encounters |
| `border-crossing.ts` | Region border crossing mechanics |
| `diplomacy-engine.ts` | Treaty and war resolution |

### Social/World (6)

| File | Description |
|------|-------------|
| `herald.ts` | World announcement generation |
| `quest-triggers.ts` | Quest trigger checks (kill, gather, etc.) |
| `achievements.ts` | Achievement checking and unlocking |
| `daily-report.ts` | Daily report compilation |
| `diplomacy-reputation.ts` | Racial relation modifier tracking |
| `law-effects.ts` | Law effect application |

---

## 9. Server Middleware (6 files)

| File | Description |
|------|-------------|
| `auth.ts` | JWT Bearer token verification, attaches `req.user` |
| `validate.ts` | Zod schema validation for request body/query/params |
| `cache.ts` | Redis-backed response cache with per-user keys |
| `daily-action.ts` | One-major-action-per-day enforcement |
| `admin.ts` | Admin role verification |
| `character-guard.ts` | Character lookup and attachment to `req.character` |

---

## 10. Server Libraries (5 files)

| File | Description |
|------|-------------|
| `prisma.ts` | Singleton PrismaClient instance |
| `redis.ts` | ioredis singleton with SCAN-based cache invalidation |
| `combat-engine.ts` | Pure-function turn-based combat engine (d20 system) |
| `game-day.ts` | Game day utilities (epoch, tick times, day numbers) |
| `alt-guard.ts` | Multi-character abuse prevention |

---

## 11. Cron Jobs (17 files including index)

| File | Schedule | Description |
|------|----------|-------------|
| `index.ts` | -- | Job registry and startup |
| `election-lifecycle.ts` | Every 5 min | Election phase advancement |
| `tax-collection.ts` | Hourly | Treasury tracking (tax collected at purchase time) |
| `law-expiration.ts` | Every 15 min | Law expiration and deactivation |
| `daily-tick.ts` | Midnight UTC | Daily action processing, HP/MP regen |
| `resource-regeneration.ts` | Periodic | Town resource node regeneration |
| `construction-complete.ts` | Periodic | Building construction completion |
| `building-maintenance.ts` | Periodic | Building decay processing |
| `property-tax.ts` | Periodic | Property tax collection |
| `caravan-events.ts` | Periodic | Caravan travel events (ambushes, etc.) |
| `state-of-aethermere.ts` | Periodic | World state announcements |
| `gathering-autocomplete.ts` | Periodic | Gathering job auto-completion |
| `forgeborn-maintenance.ts` | Periodic | Warforged maintenance processing |
| `seer-premonition.ts` | Periodic | Psion Seer daily premonitions |
| `service-npc-income.ts` | Periodic | NPC service income processing |
| `loan-processing.ts` | Periodic | Loan interest and repayment |
| `reputation-decay.ts` | Periodic | Diplomacy reputation decay |

---

## 12. Database Schema

Source: `database/prisma/schema.prisma`

### Key Models (45+)

**Core:** User, Character, Town, Region, Kingdom, Guild, GuildMember
**Items:** Item, ItemTemplate, Inventory, CharacterEquipment, MarketListing, TradeTransaction
**Combat:** CombatSession, CombatParticipant, CombatLog, PvpChallenge
**Quests:** Quest, ActiveQuest, CompletedQuest, NPC
**Politics:** Election, ElectionCandidate, ElectionVote, Impeachment, Law, LawVote, War, CouncilMember, Treaty
**Social:** Message, Friendship, Notification
**Economy:** Profession, CraftingAction, GatheringAction, TravelState, DailyAction, Building, TownTreasury, TownPolicy, Caravan, CaravanCargo, Loan, ServiceAction, ServiceReputation
**Progression:** Skill, Specialization, Achievement, PlayerAchievement, RacialRelation

### Enums (20+)

`Race`, `CharacterClass`, `ItemType`, `ItemRarity`, `ActionStatus` (includes COLLECTED), `QuestType`, `QuestStatus`, `ElectionType`, `ElectionPhase`, `ImpeachmentPhase`, `LawType`, `LawStatus`, `WarStatus`, `CouncilRole`, `MessageChannelType`, `FriendshipStatus`, `NotificationType`, `CombatType`, `CombatStatus`, `ProfessionType`, `BiomeType`, `GuildRole`, `BuildingType`

---

## 13. Shared Data Files

### Races (`data/races/`) -- 21 files

7 core (human, elf, dwarf, harthfolk, orc, nethkin, drakonid) + 6 common (halfElf, halfOrc, gnome, merfolk, beastfolk, faefolk) + 7 exotic (goliath, nightborne, mosskin, forgeborn, elementari, revenant, changeling) + index.

Nightborne has 7 abilities (exception to the standard 6). Total: 121 racial abilities across 20 races.

### Skills (`data/skills/`) -- 9 files

7 classes (warrior, mage, rogue, cleric, ranger, bard, psion) + types + index.

`VALID_CLASSES`: `['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion']`

`SPECIALIZATIONS`: 21 total (3 per class)
- warrior: berserker, guardian, warlord
- mage: elementalist, necromancer, enchanter
- rogue: assassin, thief, swashbuckler
- cleric: healer, paladin, inquisitor
- ranger: beastmaster, sharpshooter, tracker
- bard: diplomat, battlechanter, lorekeeper
- psion: telepath, seer, nomad

Total: 126 class abilities (18 per class x 7 classes)

### Professions (`data/professions/`) -- 7 files

`gathering.ts` (7 professions), `crafting.ts` (15 professions), `service.ts` (7 professions), `tiers.ts`, `xp-curve.ts`, `types.ts`, `index.ts`.

Total: 28 professions (Rancher is one profession, not Rancher + Herder).

### Recipes (`data/recipes/`) -- 15 files

`weapons.ts`, `armor.ts`, `consumables.ts`, `smelter.ts`, `tailor.ts`, `woodworker.ts`, `tanner.ts`, `mason.ts`, `ranged-weapons.ts`, `accessories.ts`, `enchantments.ts`, `housing.ts`, `mount-gear.ts`, `types.ts`, `index.ts`

### Resources (`data/resources/`) -- 9 files

`ores.ts`, `woods.ts`, `grains.ts`, `herbs.ts`, `fish.ts`, `stone.ts`, `animal.ts` (includes Exotic Hide), `types.ts`, `index.ts`

### Quests (`data/quests/`) -- 7 files

`main-quests.ts` (8), `town-quests.ts` (15), `daily-quests.ts` (5), `guild-quests.ts` (3), `bounty-quests.ts` (3), `types.ts`, `index.ts`. Total: 34 quest definitions.

### Other Shared Data

| Directory | Files | Description |
|-----------|-------|-------------|
| `data/progression/` | 2 | XP curve formula, level rewards |
| `data/buildings/` | 1 | Building requirements |
| `data/caravans/` | 1 | Caravan types |
| `data/tools/` | 1 | Tool definitions |
| `data/achievements.ts` | 1 | 25 achievement definitions |
| `utils/` | 2 | Dice roller, bounded accuracy calculator |
| `types/` | 4 | combat.ts, race.ts, psion-perks.ts, index.ts |
| `constants/` | 1 | Shared constants |

---

## 14. Database Seeds (18 files)

| File | Description |
|------|-------------|
| `index.ts` | Seed pipeline orchestrator |
| `world.ts` | 21 regions, 68 towns |
| `kingdoms.ts` | 8 kingdoms with region assignments |
| `resources.ts` | Resource definitions |
| `town-resources.ts` | Town-resource availability mappings |
| `monsters.ts` | Monster definitions for PvE |
| `tools.ts` | Tool item templates |
| `recipes.ts` | Base recipe seeding |
| `weapon-recipes.ts` | Weapon recipe templates |
| `armor-recipes.ts` | Armor recipe templates |
| `accessory-recipes.ts` | Accessory recipe templates |
| `consumable-recipes.ts` | Consumable recipe templates |
| `food-items.ts` | Food item templates |
| `nodes.ts` | Travel nodes between towns |
| `quests.ts` | Quest seeding from shared data |
| `diplomacy.ts` | 20x20 racial relations matrix |
| `abilities.ts` | Racial and class abilities |
| `achievements.ts` | Achievement definitions |

Seed output: 20 regions, 69 towns, 51 resources, 220 item templates, 190 racial relations.

---

## 15. Test Suites (8 suites + 2 setup files)

| File | Description |
|------|-------------|
| `jest.setup.ts` | Jest configuration and environment setup |
| `setup.ts` | Test database setup and teardown |
| `auth.test.ts` | Authentication flow tests |
| `characters.test.ts` | Character creation and management tests |
| `combat.test.ts` | PvE and PvP combat tests |
| `economy.test.ts` | Marketplace and crafting tests |
| `politics.test.ts` | Election and governance tests |
| `quests.test.ts` | Quest system tests |
| `progression.test.ts` | Leveling and skill progression tests |
| `social.test.ts` | Messaging, friends, guild tests |

---

## 16. Entry Points

### Client

| File | Description |
|------|-------------|
| `client/src/main.tsx` | React 18 createRoot, QueryClientProvider, BrowserRouter |
| `client/src/App.tsx` | AuthProvider, ErrorBoundary, lazy-loaded routes, 404 catch-all |

### Server

| File | Description |
|------|-------------|
| `server/src/index.ts` | Express + HTTP + Socket.io server on port 4000, JWT validation, graceful shutdown, cron startup |
| `server/src/app.ts` | Express app: helmet, CORS, trust proxy, rate limiter, route mounting |

---

## 17. Migrations (11 total)

| Migration | Description |
|-----------|-------------|
| `20260207204007_init` | Initial schema |
| `20260208120000_add_friends` | Friendship model |
| `20260208182432_add_message_is_read` | Message read tracking |
| `20260208195206_add_class_abilities_progression` | Skills and progression |
| `20260208195306_add_npcs_and_quest_fields` | NPCs and quest system |
| `20260208210000_add_performance_indexes` | Performance indexes |
| `20260209000000_balance_patch_renames` | Race/ability renames |
| `20260209121626_extend_profession_system` | Extended profession system |
| `20260209144137_race_schema_v2` | Race schema v2 (20 races) |
| `20260210000000_six_systems_foundation` | Housing, caravans, food, services, diplomacy, daily actions |
| `20260210100000_add_inventory_unique_constraint` | Inventory dedup (P0 fix) |
| `20260210100100_add_law_vote_tracking` | LawVote model (P0 fix) |
| `20260210200000_add_kingdom_region_relation` | Kingdom-region FK (P1 fix) |
| `20260210200100_add_missing_indexes` | 4 performance indexes (P1 fix) |
| `20260210200200_fix_cascade_deletes` | FK cascade fixes (P1 fix) |

---

*End of inventory.*
