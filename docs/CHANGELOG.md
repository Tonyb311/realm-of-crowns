# Changelog

All development phases for Realm of Crowns, documenting what was built in each prompt.

## Phase 1: Core Systems (Prompts 00-08)

### Bootstrap -- Project Scaffold

- Created npm workspaces monorepo: `client/`, `server/`, `shared/`, `database/`
- Set up TypeScript configs across all workspaces
- Installed core dependencies: React 18, Express, Prisma, Socket.io, Zod
- Created comprehensive Prisma schema covering all core models (User, Character, Kingdom, Town, Building, Item, Quest, Trade, Election, CombatLog, Guild, Message)
- Created initial game design document (`docs/GAME_DESIGN.md`)
- Defined enums: Race, Class, BuildingType, ItemType, Rarity, ElectionType

### Prompt 00 -- Infrastructure Setup + Authentication & Character Creation

- Set up Docker Compose for PostgreSQL 15 and Redis 7
- Created `.env.example` with documented environment variables
- Generated Prisma client and ran initial migration
- Built authentication system:
  - `POST /api/auth/register` -- account creation with Zod validation
  - `POST /api/auth/login` -- JWT token issuance
  - `GET /api/auth/me` -- current user profile from token
  - `POST /api/auth/logout` -- session acknowledgment
  - JWT auth guard middleware (`server/src/middleware/auth.ts`)
  - Generic Zod validation middleware (`server/src/middleware/validate.ts`)
- Built character creation system:
  - `POST /api/characters/create` -- multi-step validated creation (race, sub-race, class, starting town)
  - `GET /api/characters/me` -- full character sheet
  - `GET /api/characters/:id` -- public character profile
  - Starting stats calculated from race modifiers applied to base 10
  - Starting gold varies by race tier (Core 100g, Common 75g, Exotic 50g)
  - Sub-race validation (Dragonborn ancestries, Beastfolk clans, Genasi elements)
  - Starting town validation by race (Changelings can pick any town)
- Created typed race data files for all 20 races in `shared/src/data/races/`
  - `RaceDefinition` interface with stats, abilities, profession bonuses, lore
  - One file per race organized by tier (core/, common/, exotic/)
  - `RaceRegistry` index with lookup helpers
- Built React auth pages:
  - `LoginPage`, `RegisterPage` with dark fantasy styling
  - `AuthContext` provider with JWT persistence in localStorage
  - `ProtectedRoute` wrapper component
- Built character creation wizard:
  - 5-step flow: Race > Sub-Race (conditional) > Class > Stats Review > Starting Town > Confirm
  - Race cards organized by tier with stat modifiers, abilities, "Hard Mode" badge for exotic
  - Animated slide transitions, gold progress bar

### Prompt 01 -- Authentication & Characters (Alternate)

- Earlier version of auth + character creation prompt (superseded by Prompt 00 combined version)

### Prompt 02 -- World, Towns & Navigation

- Created world seed data:
  - 3 kingdoms (Valdris, Thornhold, Sylvane) with lore
  - Towns per kingdom with descriptions, coordinates, buildings, resources
  - Travel routes with real-time minute durations
  - Resource distribution by biome (forests/lumber, mountains/ore, plains/grain, coasts/fish)
- Built town and navigation APIs:
  - `GET /api/world/map` -- all towns, routes, kingdoms
  - `GET /api/towns/:id` -- full town details with buildings and resources
  - `POST /api/travel/start` -- begin travel (calculates real-time duration)
  - `GET /api/travel/status` -- check remaining travel time
  - `POST /api/travel/arrive` -- complete travel
  - Player location tracking and validation
- Built interactive world map (`WorldMapPage`):
  - Canvas/SVG fantasy map with towns color-coded by kingdom
  - Click-to-travel with progress indicator
  - Player location marker
- Built town view (`TownPage`):
  - Town dashboard with building cards (market, tavern, blacksmith, barracks, etc.)
  - Town info sidebar (mayor, population, tax rate, resources)
  - Other players currently in town

### Prompt 03 -- Economy, Crafting & Trading

- Built resource and gathering system:
  - 10 base resource types (Lumber, Stone, Iron, Gold Ore, Grain, Herbs, Leather, Gems, Arcane Dust, Fish)
  - Real-time work actions with job selection and duration
  - Yield affected by stats, tool quality, town bonuses, d20 dice rolls
  - `POST /api/work/start`, `GET /api/work/status`, `POST /api/work/collect`
- Built crafting system:
  - Recipes stored in database with material requirements
  - Real-time crafting duration based on complexity
  - Quality roll: d20 + skill modifier determines tier (Poor through Masterwork)
  - `GET /api/crafting/recipes`, `POST /api/crafting/start`, `GET /api/crafting/status`, `POST /api/crafting/collect`
  - Crafting XP earned per craft
- Built player marketplace:
  - `POST /api/market/list` -- list items at player-set prices
  - `GET /api/market/browse` -- browse with filters (type, price, rarity, seller)
  - `POST /api/market/buy` -- purchase with gold balance check
  - `POST /api/market/cancel` -- delist items
  - Transaction tax paid to town treasury
  - Price history tracking for economic graphs
- Built inventory UI (`InventoryPage`):
  - Item grid with icons, quantity, rarity color coding
  - Item detail popup with stats
  - Equipment slots (head, chest, legs, feet, main hand, off hand, accessory x2)
- Built crafting panel (`CraftingPage`):
  - Recipe browser with material requirements
  - Craft progress tracking
- Built marketplace UI (`MarketPage`):
  - Listing browser with filters and sorting
  - Buy confirmation with gold balance
  - "My Listings" tab
  - Price history charts (Recharts)

### Prompt 04 -- Combat System

- Built core combat engine:
  - Turn-based combat with initiative rolls (d20 + DEX modifier)
  - Action types: Attack, Cast Spell, Use Item, Defend, Flee
  - Attack rolls: d20 + modifiers vs target AC
  - Damage rolls: weapon die + STR/DEX modifier
  - Spell system with spell slots, save DCs, effects
  - Status effects: poisoned, stunned, blessed, burning, frozen, etc.
  - Death at 0 HP with respawn penalties (gold loss, XP loss, equipment damage)
  - Full combat log recording every action
- Built PvE system:
  - Monster database (Goblin, Wolf, Bandit, Skeleton, Dragon, etc.)
  - Level-appropriate encounter zones near towns
  - Multi-room dungeon system with boss encounters
  - Loot tables per monster (items, gold, XP)
  - `POST /api/combat/pve/start`, `POST /api/combat/pve/action`, `GET /api/combat/pve/state`
- Built PvP system:
  - Duel challenges with mutual acceptance
  - Arena system in towns with barracks
  - Gold wager system
  - Rankings and leaderboard
  - `POST /api/combat/pvp/challenge`, `POST /api/combat/pvp/accept`, `POST /api/combat/pvp/action`
  - Anti-grief: level difference limits, cooldowns
- Built combat UI (`CombatPage`):
  - Battle screen with portraits, HP/MP bars
  - Action menu (Attack, Spells, Items, Defend, Flee)
  - Animated combat log with dice roll display
  - Damage numbers and victory/defeat screens
  - Initiative order display

### Prompt 05 -- Political System & Governance

- Built election system:
  - Town mayor elections (any resident can run, all residents vote)
  - Kingdom ruler elections (mayors run, all citizens vote)
  - Full lifecycle: nominations > campaigning > voting > results
  - Real-time timers (configurable voting periods)
  - `POST /api/elections/nominate`, `POST /api/elections/vote`, `GET /api/elections/current`, `GET /api/elections/results`
  - Term limits and impeachment voting
- Built governance system:
  - Mayor powers: set tax rate, build/upgrade buildings, appoint sheriff, trade policies, treasury
  - Ruler powers: declare war/peace, kingdom laws, appoint council, kingdom treasury
  - Law proposal and council voting system
  - Laws affect gameplay: tax rates change trade fees, military funding, trade embargoes
  - Treasury management with income/spending tracking
  - `POST /api/governance/propose-law`, `POST /api/governance/vote-law`, `POST /api/governance/set-tax`, `GET /api/governance/laws`
- Built political UI:
  - `TownHallPage` -- mayor info, laws, treasury, elections
  - `ElectionPage` -- candidates, platforms, voting booth, results
  - `GovernancePage` -- law proposals, treasury management, official appointments
  - `KingdomPage` -- ruler, member towns, kingdom laws, diplomacy
  - Political notification system
- Created cron jobs:
  - `election-lifecycle.ts` -- advances election phases automatically
  - `tax-collection.ts` -- collects taxes on schedule
  - `law-expiration.ts` -- expires temporary laws

### Prompt 06 -- Social, Guilds & Real-Time

- Built messaging system:
  - Private messages between players
  - Town chat, kingdom chat, guild chat channels
  - Global announcements channel
  - Real-time delivery via Socket.io
  - `POST /api/messages/send`, `GET /api/messages/inbox`, `GET /api/messages/conversation/:id`
- Built guild system:
  - Guild creation (costs gold), name, crest, description
  - Member management with officer ranks and permissions
  - Guild treasury with member donations
  - Guild quests (cooperative objectives)
  - Guild hall building in towns
  - Guild reputation system
  - Full CRUD API for guilds, membership, treasury
- Built real-time event system:
  - Socket.io server integrated with Express
  - Events: player enters/leaves town, combat results, elections, trades, chat, travel
  - Presence system: online status, who is in your town
  - Toast notification system for relevant events
  - Rate limiting and JWT authentication on socket connections
  - Chat handlers (`server/src/socket/chat-handlers.ts`)
  - Presence tracking (`server/src/socket/presence.ts`)
- Built social UI:
  - `ChatPanel` component with tabbed channels (town, kingdom, guild, private)
  - `ProfilePage` -- character sheet, achievements, reputation
  - `GuildPage` -- members, treasury, quests, officer management
  - `FriendsList` component with online status
  - `NotificationDropdown` with recent events
  - `PlayerSearch` component

### Prompt 07 -- Quest System & Progression

- Built quest engine:
  - Quest types: Main Story, Town Quests, Daily Quests, Guild Quests, Bounty Hunts
  - Quest structure: objectives (kill X, gather Y, deliver Z, talk to NPC), requirements, rewards
  - Quest chains (completing one unlocks the next)
  - NPC quest givers per town
  - Quest journal tracking active/completed quests
  - `GET /api/quests/available`, `POST /api/quests/accept`, `POST /api/quests/progress`, `POST /api/quests/complete`
  - Quest triggers service (`server/src/services/quest-triggers.ts`)
- Built progression engine:
  - XP from combat, quests, crafting, work, political actions
  - Level-up: HP/MP increase, stat points, ability unlocks
  - Skill trees per class with 3 specializations each:
    - Warrior: Berserker / Guardian / Warlord
    - Mage: Elementalist / Necromancer / Enchanter
    - Rogue: Assassin / Thief / Swashbuckler
    - Cleric: Healer / Paladin / Inquisitor
    - Ranger: Beastmaster / Sharpshooter / Tracker
    - Bard: Diplomat / Battlechanter / Lorekeeper
  - 10-15 abilities/passives per specialization tree
  - Achievement system with titles and bonuses
  - `GET /api/skills/*`, progression service (`server/src/services/progression.ts`)
  - Achievements service (`server/src/services/achievements.ts`)
- Built quest and progression UI:
  - `QuestJournalPage` -- active quests with progress bars, completed log
  - `QuestDialog` component for NPC quest givers
  - `LevelUpCelebration` component with stat allocation
  - `SkillTreePage` -- visual skill tree with nodes, point spending, ability preview
  - `AchievementPage` -- gallery with locked/unlocked states
  - `XpBar` component in main HUD

### Prompt 08 -- Polish, Testing & Deployment

- Integration tests:
  - `auth.test.ts` -- registration, login, JWT validation, protected routes
  - `characters.test.ts` -- character creation, validation, race/class combos
  - `combat.test.ts` -- PvE and PvP combat flows
  - `economy.test.ts` -- work, crafting, marketplace transactions
  - `politics.test.ts` -- elections, governance, law system
  - `social.test.ts` -- guilds, messaging, friends
  - `quests.test.ts` -- quest acceptance, progress, completion
  - `progression.test.ts` -- XP, leveling, skill trees
  - Jest + Supertest with test setup and teardown
- UI polish:
  - Dark fantasy theme (dark backgrounds, gold accents, medieval styling)
  - Responsive design (desktop primary, tablet secondary)
  - Loading states and skeleton screens
  - Error handling with user-friendly messages
  - Tooltips on interactive elements
  - Main HUD (`HUD.tsx`) with character portrait, HP/MP bars, gold, XP, location, notifications
  - `LoadingScreen` component
- Performance optimization:
  - Database query optimization with indexes and eager loading
  - Redis caching middleware (`server/src/middleware/cache.ts`)
  - Rate limiting on API routes (express-rate-limit)
  - Socket.io room management
  - Lazy loading for frontend routes
- Deployment setup:
  - Docker Compose with 4 services (postgres, redis, server, client)
  - `docker-compose.dev.yml` override for development
  - `server/Dockerfile` and `client/Dockerfile`
  - Nginx reverse proxy config (client container)
  - `scripts/setup.sh` automated setup script
  - `.env.example` with documented variables
  - GitHub Actions CI/CD (`.github/workflows/ci.yml`): type check, test, build, Docker build
  - Helmet security headers

## Azure Setup

- Provisioned Azure PostgreSQL Flexible Server (Burstable B1ms tier)
- Provisioned Azure Cache for Redis (Basic C0 tier)
- Configured firewall rules and SSL settings
- Updated `.env.example` with Azure connection string format
- Verified Prisma migrations against Azure PostgreSQL
- End-to-end verification: health check, auth flow, client rendering

## Documentation Pass

- **docs/CODE_INVENTORY.md** -- Full codebase audit: every API endpoint, Socket.io event, client page, component, service, cron job, database model, shared data file, and middleware
- **docs/API_REFERENCE.md** -- Comprehensive API reference for all endpoints with request/response shapes, validation rules, and error codes
- **docs/ARCHITECTURE.md** -- Technical architecture document covering system design, frontend/backend architecture, database design, caching, security, and development workflow
- **docs/GAME_GUIDE.md** -- Player-facing game guide covering all 20 races, 6 classes, 28 professions, economy, combat, politics, social systems, quests, and progression
- **docs/COMBAT.md** -- Combat system design document
- **docs/POLITICS.md** -- Political system design document
- **docs/SOCIAL.md** -- Social systems design document
- **docs/QUESTS.md** -- Quest and progression design document
- Updated existing design docs (RACES.md, ECONOMY.md, WORLD_MAP.md) to reflect implemented state
- Updated **README.md** with complete feature list, documentation links, and project structure
- Created **docs/CHANGELOG.md** (this file)
