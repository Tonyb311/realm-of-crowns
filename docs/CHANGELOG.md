# Changelog

All development phases for Realm of Crowns, documenting what was built in each prompt.

---

## Phase 1: Core Systems (Prompts 00-08) -- COMPLETE

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

---

## Phase 2A: Economy Expansion (Prompts 09-14) -- COMPLETE

### Prompt 09 -- Profession System Foundation

- Extended Prisma schema with PlayerProfession model, ProfessionCategory/Tier/Type enums, and ProfessionXPLog
- Built profession management APIs:
  - `POST /api/professions/learn` -- learn a new profession (validates 3-profession limit and category rules: max 2 gathering, max 2 crafting, max 1 service)
  - `POST /api/professions/abandon` -- abandon a profession with progress loss warning
  - `GET /api/professions/mine` -- all player professions with levels and XP
  - `GET /api/professions/info/:type` -- profession details, tier unlocks, production info
- Built profession XP system (`server/src/services/profession-xp.ts`):
  - `addProfessionXP()` with leveling, tier promotions, and notifications
  - XP curve: escalating from 100 XP (level 1-2) to 50,000 XP (level 99-100)
  - 6 tiers: Apprentice (1-10), Journeyman (11-25), Craftsman (26-50), Expert (51-75), Master (76-90), Grandmaster (91-100)
- Created profession data files in `shared/src/data/professions/`:
  - All 28 profession definitions (gathering.ts, crafting.ts, service.ts)
  - XP curve table (xp-curve.ts)
  - Tier definitions (tiers.ts)
  - Profession types and interfaces (types.ts)
  - Profession-to-town-type affinity map
- Built profession UI (`ProfessionsPage`):
  - Profession browser with 3 category tabs (Gathering, Crafting, Service)
  - Profession cards with icon, description, production info, town affinity
  - "Learn Profession" flow with slot validation
  - My Professions dashboard with level bars, tier badges, XP progress

### Prompt 10 -- Raw Resources & Gathering System

- Extended Prisma schema with Resource model, ResourceType enum, GatheringAction model, TownResource model (abundance 1-5, depletion tracking)
- Seeded 60+ raw resources across 8 categories (ores, woods, grains, herbs, animal products, fish, stone, fibers)
- Assigned resources to towns by biome with abundance levels
- Built gathering engine:
  - `POST /api/gathering/start` -- validates profession, town type, tool, no concurrent action
  - `GET /api/gathering/status` -- check gathering progress
  - `POST /api/gathering/collect` -- yield calculation with d20 quality roll, profession XP grant
  - `POST /api/gathering/cancel` -- cancel with partial yield
  - Gather time formula: baseTime / (1 + professionLevel/100) / toolSpeedBonus / townAbundanceBonus
  - Yield formula: baseYield * (1 + professionLevel/50) * toolYieldBonus * townAbundanceBonus
- Built resource depletion and regeneration system with cron job (`resource-regeneration.ts`)
- Built gathering autocomplete cron job (`gathering-autocomplete.ts`)
- Built tool system:
  - Tool items: Pickaxe, Axe, Hoe, Rod, Sickle, Knife
  - Tool tiers: Crude, Copper, Iron, Steel, Mithril, Adamantine
  - Speed bonus + yield bonus + durability per tier
  - Tools degrade with each use, break at 0 durability
  - Tool equip/unequip API
  - Seeded Crude starter tools for new players
  - Tool data in `shared/src/data/tools/`
- Built gathering UI:
  - Gathering panel in town view with available resources and abundance indicators
  - "Start Gathering" button with estimated time and yield
  - Progress bar with real-time countdown
  - Collect results popup with d20 animation, resources gained, XP earned
  - Tool slot display with equipped tool and its bonuses

### Prompt 11 -- Smelting, Processing & Refined Materials

- Created full processing recipe database in `shared/src/data/recipes/`:
  - Smelter recipes (smelter.ts): Copper/Iron/Steel/Silver/Gold/Mithril/Adamantine Ingots, Glass, Nails
  - Tanner recipes (tanner.ts): Soft/Hard/Fur/Exotic/Dragonscale Leather
  - Tailor spinning/weaving recipes (tailor.ts): Cloth, Linen, Woven Wool, Silk Cloth
  - Mason recipes (mason.ts): Cut Stone, Bricks, Polished Marble, Cut Sandstone
  - Woodworker processing recipes (woodworker.ts): Softwood/Hardwood/Exotic Planks, Beams
- Rebuilt crafting backend to support full recipe chain system:
  - Recipe registry loading from shared data files
  - Workshop bonus system: crafting in correct building type gives speed + quality bonus based on building level
  - Quality roll: d20 + (professionLevel / 5) + toolBonus + workshopBonus
  - Cascading quality: fine ingredients grant bonus to final quality roll
  - Batch crafting queue: `POST /api/crafting/queue`, `GET /api/crafting/queue`
  - Profession XP per craft scaled by recipe difficulty
- Rebuilt crafting UI:
  - Recipe browser with search/filter by profession, tier, output type
  - Recipe detail view showing full ingredient chain visually
  - "What can I make?" button scanning inventory for craftable recipes
  - Craft queue display with progress bars
  - Quality result popup with dice animation
  - Workshop indicator showing bonus from current building
  - Batch crafting UI with total time estimates

### Prompt 12 -- Finished Goods Crafting (Weapons, Armor, Gear)

- Created weapon recipe database (`shared/src/data/recipes/weapons.ts`):
  - Blacksmith weapons by tier: Daggers, Swords, Longswords, Greatswords, Axes, Battleaxes, Maces, Warhammers, Halberds, Spears
  - Material tiers: Copper, Iron, Steel, Mithril, Adamantine
  - Weapon stats: base damage, damage type, speed, required STR/DEX, durability, equip level
  - Quality multiplier on all stats (Poor 0.7x through Legendary 1.5x)
  - Fletcher/Woodworker ranged weapons (`shared/src/data/recipes/ranged-weapons.ts`): Shortbow, Longbow, Crossbow, arrows, bolts
- Created armor recipe database (`shared/src/data/recipes/armor.ts`):
  - Armorer metal armor: Helmets, Chestplates, Gauntlets, Greaves, Shields (Copper through Adamantine)
  - Leatherworker leather armor: Cap, Vest, Gloves, Boots, Bracers (Soft through Dragonscale)
  - Tailor cloth armor: Hood, Robes, Gloves, Boots, Cloak (Cotton through Enchanted Silk)
  - 10 equipment slots: Head, Chest, Hands, Legs, Feet, Main Hand, Off Hand, Accessory 1, Accessory 2, Back
- Created consumable recipe database (`shared/src/data/recipes/consumables.ts`):
  - Alchemist potions: Healing, Mana, Stat buffs, Antidotes, Poisons, Bombs
  - Cook food: Bread, Rations, Roast Meat, Fish Stew, Hearty Feast, Royal Banquet (timed buffs)
  - Brewer drinks: Ale, Wine, Mead, Spirits, Elven Wine
  - Scribe scrolls: Spell Scrolls, Maps, Identification Scrolls
- Created accessory recipe database (`shared/src/data/recipes/accessories.ts`):
  - Jeweler: Rings, Necklaces, Circlets, Brooches (Copper+Quartz through Mithril+Diamond)
  - Enchantments (`shared/src/data/recipes/enchantments.ts`): Flaming, Frost, Lightning, Holy, Shadow, Fortified, Swift, Warding
  - Housing items (`shared/src/data/recipes/housing.ts`): Furniture, storage, crafting stations, building materials
  - Mount gear (`shared/src/data/recipes/mount-gear.ts`): Saddle, Horseshoes, Horse Armor, Saddlebags
- Rebuilt item system backend:
  - Extended Item model: quality tier, durability (current/max), crafted_by (maker's mark), enchantments, calculated stat bonuses
  - Equipment system (`server/src/routes/equipment.ts`): equip/unequip with class restriction validation and total stat calculation
  - Durability system (`server/src/services/durability.ts`): -1 durability per use, break at 0, repair by appropriate crafter
  - Item stat calculation engine (`server/src/services/item-stats.ts`): base + material + quality + enchantment + set bonus
  - Item comparison: `GET /api/items/compare`
  - Repair API: `POST /api/items/repair`

### Prompt 13 -- Player Housing & Buildings

- Built housing and building system:
  - Building types: House (Small/Medium/Large), Workshop (per profession), Shop, Warehouse, Inn/Tavern
  - Construction system: building permit (auto or mayor-approved), player supplies materials, real-time construction timer
  - Building levels 1-5 with material + time upgrades
  - Building requirements data in `shared/src/data/buildings/requirements.ts`
- House features:
  - Personal storage scaling with house size
  - Display room for trophies and rare items
  - Rest bonus (rested XP buff from logging out in own house)
  - Roommate system (share house with guild members)
- Workshop features:
  - Required for advanced crafting recipes
  - Workshop level affects crafting speed and quality bonus
  - Rental system for other players
- Shop features:
  - Persistent marketplace stall (items for sale even when offline)
  - Customizable shop name and display
- Building economy:
  - Property tax to town treasury (set by mayor) with cron job (`property-tax.ts`)
  - Rent system for workshops and shops
  - Building maintenance degradation with cron job (`building-maintenance.ts`)
  - Town building lot capacity (real estate scarcity)
  - Building destruction in wars, requiring repair materials
  - Construction completion cron job (`construction-complete.ts`)
- Built housing UI (`HousingPage`):
  - "My Properties" page with all owned buildings
  - Building interior view with furniture placement
  - Construction progress panel with material requirements checklist and timer
  - Workshop view with crafting station bonuses
  - Shop management view
  - Town building directory
  - "Build New" flow: select lot, choose building type, see requirements, deposit materials, start construction

### Prompt 14 -- Trade Routes, Caravans & Merchant System

- Built trade caravan system:
  - Caravan model: owner, origin, destination, cargo manifest, departure/arrival time, escort slots, status
  - Caravan sizes: Handcart (cheap, small, slow), Wagon (medium), Large Wagon (expensive, large), Trade Convoy (huge, Merchant Lvl 50+)
  - Weight/volume cargo limits based on caravan size
  - Travel time matches inter-town distances
  - `POST /api/caravans/create`, `POST /api/caravans/load-cargo`, `POST /api/caravans/depart`
  - `GET /api/caravans/status`, `POST /api/caravans/hire-escort`
  - Caravan data in `shared/src/data/caravans/`
- Built caravan risk system:
  - Random bandit ambush events during transit (PvE combat)
  - Wartime PvP caravan raids by enemy kingdom players
  - NPC escort hiring (costs gold) and player mercenary recruitment
  - Cargo insurance (optional, percentage of cargo value)
  - Caravan events cron job (`caravan-events.ts`)
- Built trade analytics (`server/src/routes/trade-analytics.ts`):
  - Per-item per-town price history tracking
  - Cross-town price comparison: `GET /api/market/prices/:itemId`
  - Trade route profitability calculator
  - Supply/demand indicators per town
  - Merchant profession XP from profitable trades
  - Town economic dashboard: most traded items, trade volume, price trends
- Built trade UI (`TradePage`):
  - Trade route map overlay with profit indicators
  - Caravan management page: create, load cargo, track in-transit, history
  - Price comparison tool: prices across all towns in table/chart
  - "Best Trades" panel: most profitable trade routes
  - Merchant dashboard: profit history, trade volume, reputation
  - Ambush event screen: combat, pay ransom, or flee

---

## Phase 2B: Race Expansion (Prompts 15-18) -- COMPLETE

### Prompt 15 -- Race System Foundation (20 Races)

- Extended Prisma schema with:
  - Full Race enum (20 races), RaceTier enum (Core/Common/Exotic)
  - SubRace model: DraconicAncestry (7), BeastClan (6), ElementalType (4)
  - RacialAbility model: name, description, levelRequired, effectType, effectValue, cooldown, duration, isPassive, targetType
  - RacialRelation model: raceA, raceB, defaultRelation, currentRelation, modifiedAt
  - RelationStatus enum: Allied, Friendly, Neutral, Distrustful, Hostile, Blood Feud
  - ExclusiveZone model: raceId, zoneName, zoneType, resources, accessLevel, dangerLevel
  - CharacterAppearance model for Changeling shape tracking
- Created race data files for all 20 races:
  - Core races (`shared/src/data/races/core/`): human.ts, elf.ts, dwarf.ts, harthfolk.ts (Halfling), orc.ts, nethkin.ts (Tiefling), drakonid.ts (Dragonborn)
  - Common races (`shared/src/data/races/common/`): halfElf.ts, halfOrc.ts, gnome.ts, merfolk.ts, beastfolk.ts, faefolk.ts
  - Exotic races (`shared/src/data/races/exotic/`): goliath.ts, nightborne.ts (Drow), mosskin.ts (Firbolg), forgeborn.ts (Warforged), elementari.ts (Genasi), revenant.ts, changeling.ts
  - RaceRegistry index (`shared/src/data/races/index.ts`) with lookup helpers
  - Full RaceDefinition interface: statModifiers, trait, 6 abilities per race (120 total), professionBonuses, gatheringBonuses, homelandRegion, startingTowns, specialMechanics flags
  - Sub-race data: 7 Dragonborn ancestries (element, breathShape, damageDice, resistance), 6 Beastfolk clans (bonusStat, specialPerk), 4 Genasi elements (bonusStat, resistance, craftingBonuses)
- Built expanded race API (`server/src/routes/races.ts`):
  - `GET /api/races` -- all 20 races grouped by tier
  - `GET /api/races/:race` -- full race details with abilities, bonuses, lore, sub-races
  - `GET /api/races/:race/subraces` -- sub-race options
  - Racial bonus calculator service (`server/src/services/racial-bonus-calculator.ts`)
- Built expanded race selection UI (`RaceSelectionPage`):
  - 3 tabs: Core, Common, Exotic with difficulty badges
  - Race card grid with portrait, name, tier badge, homeland
  - Full race detail panel with lore, stats, abilities, profession affinity
  - Sub-race visual selector for Dragonborn/Beastfolk/Genasi
  - Special mechanic warnings for exotic races
  - Race comparison tool (2-3 races side-by-side)

### Prompt 16 -- World Map V2 (68 Towns, All Regions)

- Created complete world seed data:
  - All 68 towns with name, region, controllingRace, biome, coordinates, population, prosperity, description, specialty, buildings
  - All resources per town with abundance levels (1-5)
  - All travel routes: within-region (15-30 min), cross-region (30-60 min), long-distance (60-120 min) with distance, travelTime, dangerLevel, terrainType
  - 21 region definitions with name, controllingRace, biome, borders, lore, dangerLevel
  - Border definitions between adjacent regions with racial relation-based default status
  - Starting NPC officials for each town
- Built exclusive zone access system (`server/src/routes/zones.ts`):
  - 11 exclusive zones: Deep Ocean, Underdark, Feywild, Sky Peaks, Deepwood Groves, Foundry Core, Elemental Rifts (x4), Ashenmoor Deadlands, Deep Thornwilds, Dragon Lairs, Deep Mines
  - Native race: free entry. Others need crafted access gear (Underwater Breathing Helm, Darkvision Goggles, Fey Compass, Elemental Protection Amulet, Altitude Elixir, etc.)
  - `GET /api/zones/exclusive`, `GET /api/zones/:id/access`, `POST /api/zones/:id/enter`
  - Exclusive resources only gatherable inside these zones
- Built interactive world map V3 (`WorldMapPage`):
  - Full Aethermere continent with all 21 regions color-coded by controlling race
  - 68 town icons scaled by population (capital, major, small, underwater, underground)
  - Region borders color-coded by diplomatic status (green=Allied through red=Blood Feud)
  - Travel routes as paths between connected towns
  - Exclusive zones as overlay areas with race emblem and lock icon
  - Zoom levels: continent, region, town detail
  - Click region for race info, towns list, resources, relations
  - Click town for full info panel with "Travel Here"
  - Player location marker and other players as dots
  - Mini-map in HUD showing current region
- Built expanded regional mechanics (`server/src/routes/regions.ts`, `server/src/services/regional-mechanics.ts`):
  - Racial majority tracker per town (live player demographics)
  - Bonus/penalty calculator by race vs town majority (+10% same race, -5% distrustful, -15% blood feud, etc.)
  - Border crossing system: tariff on trade goods, encounters for hostile crossings
  - Changeling exception: no racial penalties anywhere
  - Merfolk land/water speed transition
  - Drow sunlight tracking: penalties during daytime surface, none underground/nighttime
  - Day/night cycle integration

### Prompt 17 -- Racial Diplomacy V2 (20-Race Relations)

- Seeded full 20x20 relations matrix (190 unique pairings) from design document:
  - Dwarf-Orc Blood Feud, Human-Halfling Allied, Elf-Faefolk-Firbolg Allied, Dwarf-Gnome-Warforged Friendly, Tiefling-Drow-Revenant-Changeling Friendly, etc.
- Built expanded diplomacy engine (`server/src/services/diplomacy-engine.ts`, `server/src/routes/diplomacy.ts`):
  - Diplomatic actions for rulers: PROPOSE_TREATY, DECLARE_WAR, TRADE_AGREEMENT, NON_AGGRESSION_PACT, ALLIANCE, BREAK_TREATY
  - Relation change requirements: Blood Feud->Hostile (15,000g + 10 days + both agree), Hostile->Distrustful (8,000g + 7 days), etc.
  - Worsening relations is instant and free
  - War system: declaration, war score (PvP kills, raids, territory), peace negotiation, reparations
  - Treaty history log
  - Changeling diplomatic intermediary bonus (20% treaty cost reduction)
  - Diplomacy reputation per kingdom (`server/src/services/diplomacy-reputation.ts`)
  - Reputation decay cron job (`reputation-decay.ts`)
- Built world events system:
  - Herald service (`server/src/services/herald.ts`) for global diplomatic announcements
  - War bulletin board during active conflicts
  - Monthly "State of Aethermere" report cron job (`state-of-aethermere.ts`)
  - Citizen petition system (`server/src/routes/petitions.ts`)
  - World events route (`server/src/routes/world-events.ts`)
  - Integration with Socket.io for real-time diplomatic alerts
- Built diplomacy UI (`DiplomacyPage`):
  - World diplomacy overlay on map with color-coded borders and treaty icons
  - Diplomacy panel for rulers: propose treaties, respond to proposals, manage wars
  - Diplomacy panel for citizens: view relations, treaties, petition system, history timeline
  - War dashboard: war score, battle log, enlistment
  - 20x20 relations matrix view: interactive grid with color coding
  - Changeling diplomat bonus indicator

### Prompt 18 -- All 20 Race Abilities in Combat & Professions

- Implemented all 120 combat-relevant racial abilities (`server/src/services/racial-combat-abilities.ts`):
  - Human: Rally the People, Indomitable Will
  - Elf: Elven Accuracy, Spirit Walk
  - Dwarf: Dwarven Resilience, Ancestral Fury
  - Halfling: Halfling Luck (d20 reroll)
  - Orc: Intimidating Presence, Relentless Endurance, Blood Fury, Orcish Rampage
  - Tiefling: Hellish Resistance, Infernal Rebuke, Soul Bargain
  - Dragonborn: 7-element Breath Weapon, Draconic Scales, Frightful Presence, Ancient Wrath
  - Half-Elf: Fey Ancestry, Inspiring Presence
  - Half-Orc: Savage Attacks, Unstoppable Force
  - Gnome: Gnome Cunning
  - Merfolk: Tidal Healing, Call of the Deep, Tsunami Strike
  - Beastfolk: Natural Weapons, Beast Form, Alpha's Howl, Apex Predator + 6 clan perks
  - Faefolk: Flutter (flying), Wild Magic Surge, Nature's Wrath
  - Goliath: Stone's Endurance, Earthshaker, Titan's Grip
  - Drow: Drow Magic (darkness), Poison Mastery, Shadow Step, Dominate
  - Firbolg: Hidden Step, Druidic Magic, Guardian Form
  - Warforged: Integrated Armor, Self-Repair, Siege Mode
  - Genasi: Elemental Cantrip, Elemental Burst (4 variants), Primordial Awakening
  - Revenant: Life Drain, Undying Fortitude, Army of the Dead
  - Changeling: Unsettling Visage, Thousand Faces
  - Each ability: activation trigger, effect calculation, duration/cooldown, combat log entry
- Integrated all profession-affecting racial bonuses (`server/src/services/racial-profession-bonuses.ts`):
  - All 20 races have specific profession speed/quality/yield/XP bonuses
  - Bonuses hooked into gathering yield calculator, crafting quality calculator, profession XP system
  - Racial passive tracker (`server/src/services/racial-passive-tracker.ts`)
- Implemented special profession mechanics (`server/src/services/racial-special-profession-mechanics.ts`):
  - Human Adaptable Crafter: 4th profession slot at Level 15
  - Gnome Efficient Engineering: 10% material reduction
  - Gnome Eureka Moment: instant craft completion
  - Warforged Overclock: double craft speed temporarily
  - Warforged Tireless Worker: 50% more queue slots
- Built exotic race special mechanics:
  - Changeling shapeshifting (`server/src/services/changeling-service.ts`): visible race change, NPC deception at Lvl 10, copy player appearance at Lvl 15, Veil Network at Lvl 25
  - Warforged maintenance (`server/src/services/forgeborn-service.ts`, `server/src/jobs/forgeborn-maintenance.ts`): 7-day Repair Kit cycle, -1% stats per day overdue, Self-Repair ability
  - Merfolk amphibious (`server/src/services/merfolk-service.ts`): 3x water speed, 85% land speed, underwater resource access
  - Drow sunlight sensitivity (`server/src/services/nightborne-service.ts`): day/night tracking, -2 attack/-2 perception in daytime surface
  - Faefolk flight (`server/src/services/faefolk-service.ts`): bypass ground obstacles, dodge traps, can't fly with heavy loads
  - Revenant reduced death (`server/src/services/revenant-service.ts`): halved death penalties and respawn timer
  - Race environment service (`server/src/services/race-environment.ts`) for biome-based bonuses
- Built racial ability UI:
  - Character sheet Racial Abilities tab with all 6 abilities (locked/unlocked by level)
  - Active ability "Use" button with cooldown timer
  - Passive abilities as always-on buff icons
  - Combat integration: racial abilities in action menu, breath weapon targeting overlay, beast form animation, Changeling mid-combat shift
  - Profession integration: racial bonuses shown in crafting preview, gathering yield bonus, Warforged maintenance indicator, Merfolk water/land speed, Drow sunlight warning
  - Special mechanic HUD elements per race

---

## Azure Setup

- Provisioned Azure PostgreSQL Flexible Server (Burstable B1ms tier)
- Provisioned Azure Cache for Redis (Basic C0 tier)
- Configured firewall rules and SSL settings
- Updated `.env.example` with Azure connection string format
- Verified Prisma migrations against Azure PostgreSQL
- End-to-end verification: health check, auth flow, client rendering

---

## Documentation Pass -- COMPLETE

- **docs/CODE_INVENTORY.md** -- Full codebase audit: every API endpoint, Socket.io event, client page, component, service, cron job, database model, shared data file, and middleware
- **docs/API_REFERENCE.md** -- Comprehensive API reference for all endpoints with request/response shapes, validation rules, and error codes
- **docs/ARCHITECTURE.md** -- Technical architecture document covering system design, frontend/backend architecture, database design, caching, security, and development workflow
- **docs/GAME_GUIDE.md** -- Player-facing game guide covering all 20 races, 7 classes, 29 professions, economy, combat, politics, social systems, quests, and progression
- **docs/COMBAT.md** -- Combat system design document
- **docs/POLITICS.md** -- Political system design document
- **docs/SOCIAL.md** -- Social systems design document
- **docs/QUESTS.md** -- Quest and progression design document
- Updated existing design docs (RACES.md, ECONOMY.md, WORLD_MAP.md) to reflect implemented state
- Updated **README.md** with complete feature list, documentation links, and project structure
- Created **docs/CHANGELOG.md** (this file)

---

## P0 Fix Pass (2026-02-10) -- COMPLETE

13 security and data integrity fixes:

**Security (5):**
- Rotated leaked credentials to placeholders
- Removed hardcoded secrets from docker-compose.yml (uses env_file)
- Docker non-root user in Dockerfile
- JWT_SECRET validation at startup (exits on missing/placeholder)
- XSS sanitization on chat messages (sanitizeText strips HTML)

**Combat & Economy (3):**
- Server-side weapon validation (getEquippedWeapon from DB, no client-sent stats)
- Crafting collect race condition fix (atomic updateMany with COLLECTED status)
- Double taxation fix (tax collected at purchase, cron only tracks timestamps)

**Data Integrity (3):**
- PvE combat resolution wrapped in prisma.$transaction
- Inventory unique constraint @@unique([characterId, itemId])
- LawVote model with @@unique([lawId, characterId]) for vote deduplication

**Infrastructure (2):**
- Per-user cache keys (cache:{userId}:{url})
- Chat character ownership verification on chat:identify
- Graceful shutdown handlers (SIGTERM/SIGINT, 10s timeout)
- Trust proxy for rate limiter behind reverse proxy
- Socket rate limiter keyed by userId instead of socket.id
- Notification route ordering fix (/read-all before /:id/read)

---

## P1 Fix Pass (2026-02-10) -- COMPLETE

### Crafting Chain Fixes (7)
- Nails recipe input: Iron Ingot -> Copper Ingot (Smelter L5 can now craft)
- Added spin-silk-thread recipe (Tailor L25): 2 Wool + 1 Flowers -> 2 Silk Thread
- Added Exotic Hide resource (Hunter tier 3, FOREST/SWAMP/BADLANDS biomes)
- Copper weapons: Hardwood Planks -> Softwood Planks (all L1 materials)
- Added Cloth Padding recipe (Tailor L3): 2 Cloth -> 1 Cloth Padding
- Rancher outputs renamed: Cattle->Beef, Pigs->Pork, Chickens->Chicken
- Added Woodworker recipes: Barrel (L10), Furniture (L15)

### Frontend Fixes (8)
- Error boundaries wrapping Routes in App.tsx
- 401 interceptor uses roc:auth-expired event (no page reload)
- Dynamic tax rates from server (replaces hardcoded 10%)
- GovernancePage derives kingdomId from town->region->kingdom
- Socket reconnection with status indicator and room rejoin
- 404 catch-all route with NotFoundPage
- ChatPanel socket-only (removed duplicate REST call)
- PvP challenge uses PlayerSearch component (replaces UUID input)

### Backend Logic Fixes (7)
- Human 4th profession slot: getMaxProfessions() returns 4 for HUMAN L15+
- PvP leaderboard: groupBy aggregation + pagination (replaces unbounded findMany)
- Caravan collect validates character is in destination town
- Quest progress capped to 1 per request
- Quest item rewards now granted on completion
- Flee action: FLED status with minor penalty (not full death)
- getCharacterForUser orderBy createdAt asc across 30+ files

### Database & Seed Fixes (6)
- Kingdom seed data: 8 kingdoms with region assignments
- Kingdom-region FK (Region.kingdomId)
- Abilities and achievements wired into seed pipeline
- 4 performance indexes (CombatLog, Notification, TradeTransaction x2)
- Cascade delete fixes on Loan, ServiceAction, ServiceReputation
- Spar cooldowns moved to Redis with TTL

---

## P2/P3 Fix Pass (2026-02-10) -- COMPLETE

### Documentation Sync
- Updated GAME_GUIDE.md: added Psion class (7th class), fixed region count (21 territories)
- Updated API_REFERENCE.md: added psion to character class validation, fixed combat endpoint paths
- Updated ARCHITECTURE.md: version 0.3.0 reflecting Phase 2B + fix passes, corrected middleware/lib counts
- Complete CODE_INVENTORY.md rebuild: accurate counts for all files, services, pages, components
- Fixed specialization names in QUESTS.md (10 incorrect names corrected)
- Updated CLAUDE.md: 7 classes, 29 professions, correct middleware/lib counts, combat Redis key, P0/P1 summary
- Updated COMBAT.md: correct Redis key pattern, weapon validation, transaction wrapper, flee action
- Updated ECONOMY.md: Rancher output names, Nails recipe fix, profession count
- Updated RACES.md: Nightborne ability names (Superior Deepsight, Nightborne Magic), 7-ability note
- Updated POLITICS.md: implementation notes for LawVote, election threshold, impeachment, treaty gold, tax sync
- Updated _gameplay-section.md: 7 classes, 68 towns (not 69)

---

## Quest & Progression Rebalance (2026-02-11) -- COMPLETE

Full rebalance of XP curves, quests, achievements, and death penalties to align with a daily-action economy pacing model.

### XP Curve Overhaul
- New XP formula: `floor(10 * level^1.15) + 30` (ranges from 40 XP at level 1 to ~929 XP at level 50)
- PvE combat XP: `5 * monster.level` (was `25 * monster.level`)
- Gathering and crafting XP adjusted for 1-action-per-day model

### Quest Rebalance (49 quests)
- All 49 quests rebalanced for daily-action economy pacing
- Kill objectives reduced: 1-3 (was 5-10)
- Gather objectives reduced: 2-5 (was 8-15)
- "Daily Quests" renamed to "Recurring Quests" with 72-hour cooldown

### Achievement Rebalance (27 achievements)
- 27 achievements rebalanced with lower thresholds to match new pacing

### Death Penalty Softened
- Gold loss: 5% (was 10%)
- XP loss: `15 * level` (was `50 * level`)
- Durability loss: 5 (was 10)

### Documentation
- Created `docs/DAILY_ACTION_REBALANCE.md` -- full rebalance specification
- Created `docs/REBALANCE_INTEGRATION_CHECKLIST.md` -- integration verification checklist

---

## Arcane Visual Overhaul (2026-02-11 to 2026-02-12) -- COMPLETE

Complete visual redesign of the entire frontend with a cohesive arcane fantasy theme. 143+ files touched across 6 phases.

### Phase 1 -- Design System
- Extended Tailwind theme with `realm-*` tokens: navy backgrounds (`realm-dark`, `realm-darker`), gold accents (`realm-gold`, `realm-gold-light`), warm cream text (`realm-text`, `realm-text-muted`)
- Typography system: Cinzel (display/headings) + Inter (body text)
- Created 9 reusable UI components in `client/src/components/ui/`:
  - `RealmButton` -- themed button with variant and size props
  - `RealmPanel` -- container panel with arcane border styling
  - `RealmCard` -- content card with hover effects
  - `RealmModal` -- modal dialog with backdrop blur
  - `RealmInput` -- form input with label and validation states
  - `RealmBadge` -- status/category badge with color variants
  - `RealmProgress` -- progress bar with animated fill
  - `RealmTooltip` -- hover tooltip with delay
  - `RealmSkeleton` -- loading placeholder with shimmer animation
- Built landing page with hero section, feature showcase, and race gallery
- Themed auth pages (Login + Register) with arcane visual treatment

### Phase 2 -- Game Shell
- `HudBar` -- top navigation bar with character stats, gold, location
- `Sidebar` -- desktop sidebar navigation with icon + label links
- `BottomNav` -- mobile bottom navigation bar
- `GameShell` -- wrapper component combining HudBar + Sidebar + BottomNav + content area
- `PageHeader` -- consistent page title and breadcrumb component
- `PageLoader` -- full-page loading state with themed spinner

### Phase 3a -- Core Pages
- Town page rethemed with realm tokens and RealmPanel/RealmCard components
- Profile page rethemed with stat blocks and achievement display
- Character Creation page rethemed with step wizard styling

### Phase 3b -- Combat & Inventory
- Inventory page rethemed with rarity-coded item cards and equipment slot grid
- Combat page rethemed with 5 sub-components (battle view, action menu, combat log, HP/MP bars, initiative tracker)
- Created rarity display utilities in `client/src/constants/index.ts` (color mapping, label formatting)

### Phase 3c -- Skills & Quests
- SkillTree page rethemed with node graph styling and specialization panels
- StatAllocation component rethemed with point distribution controls
- QuestJournal page rethemed with quest cards, progress bars, and objective lists
- CombatLogViewer rethemed with styled log entries
- Added `pulse-subtle` CSS animation for active/highlighted elements

### Phase 3d -- Final Sweep
- 100+ remaining files rethemed across all game systems:
  - Politics: TownHall, Election, Governance, Kingdom pages and components
  - Market: MarketPage, listing cards, price history charts
  - Crafting: CraftingPage, recipe browser, craft queue, quality results
  - Trade: TradePage, caravan management, price comparison, merchant dashboard
  - Housing: HousingPage, building cards, construction progress
  - Map: WorldMapPage, region overlays, town info panels, mini-map
  - Travel: travel progress, route selection
  - Race: RaceSelectionPage, race cards, comparison tool, sub-race selector
  - Social: GuildPage, messaging, friends list, notifications
  - Daily: DailyDashboard, daily action widgets, daily report
  - Racial: racial ability cards, cooldown timers, special mechanic indicators
  - Food: food buff display, consumption UI
  - Admin: all admin pages and components
- Zero old color tokens remaining after sweep -- full consistency across 143+ files

---

## Summary

| Metric | Count |
|--------|-------|
| Development prompts executed | 19 (00-08, 09-14, 15-18) |
| Server route files | 52 (includes 12 admin route files) |
| Server service modules | 31 |
| Cron jobs | 18 (includes travel-tick.ts) |
| Server middleware | 6 |
| Server libraries | 5 |
| Client pages | 35 (26 game + 9 admin) |
| Client UI components | 18 files (RealmButton, RealmPanel, RealmCard, etc.) |
| Client layout components | 6 files (HudBar, Sidebar, BottomNav, GameShell, PageHeader, PageLoader) |
| Client components | 83 across 18 subdirectories |
| Client hooks | 7 |
| Shared data files | 80+ |
| Integration test suites | 8 |
| Database migrations | 15 |
| Database seed files | 18 |
| Playable races | 20 (7 core, 6 common, 7 exotic) |
| Sub-race options | 17 (7 ancestries + 6 clans + 4 elements) |
| Racial abilities | 121 (6 per race, Nightborne has 7) |
| Professions | 29 (7 gathering + 15 crafting + 7 service) |
| Quests | 49 (rebalanced for daily-action pacing) |
| Achievements | 28 (rebalanced with lower thresholds) |
| Towns | 68 across 21 territories |
| Exclusive resource zones | 11 |
| Recipe files | 15 |
| Raw resource categories | 8 (60+ individual resources) |
| Death penalty | 5% gold, 15*level XP, 5 durability |
