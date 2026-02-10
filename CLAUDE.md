# Realm of Crowns -- Claude Code Project Context

## Game Overview
Browser-based fantasy MMORPG. Renaissance Kingdoms meets D&D.
20 playable races, 28 professions, 68 towns, player-driven everything.
All systems implemented across Phase 1 (core), Phase 2A (economy), and Phase 2B (races).

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Query + Framer Motion
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 15 + Prisma ORM
- **Real-time:** Socket.io
- **Cache:** Redis 7
- **Auth:** JWT + bcrypt
- **Validation:** Zod
- **Testing:** Jest + Supertest
- **Deployment:** Docker Compose + Nginx + GitHub Actions CI
- **Monorepo:** npm workspaces (client, server, shared, database)

## Project Structure
```
/client          -- React frontend (Vite, Tailwind, Zustand)
/server          -- Express API + Socket.io backend
/shared          -- Shared types, constants, and game data
/database        -- Prisma schema, migrations, seed data
/docs            -- Game design + technical documentation
/prompts         -- Claude Code agent team prompts by phase
/design-docs     -- Original source design documents
/scripts         -- Utility scripts (setup.sh)
/.github         -- CI/CD workflow
```

## Documentation
- `docs/GAME_GUIDE.md` -- Comprehensive player-facing game guide
- `docs/API_REFERENCE.md` -- Full REST API and Socket.io event documentation
- `docs/ARCHITECTURE.md` -- Technical architecture, data flow, system design
- `docs/CODE_INVENTORY.md` -- Complete audit of every file, endpoint, component, model
- `docs/CHANGELOG.md` -- What was built in each development phase
- `docs/RACES.md` -- Complete 20-race compendium (stats, abilities, towns, relations)
- `docs/ECONOMY.md` -- Economy system (28 professions, crafting chains, marketplace)
- `docs/WORLD_MAP.md` -- All 21 regions, 68 towns, geography, biomes, level ranges
- `docs/COMBAT.md` -- Combat system (PvE, PvP duels, damage, rewards, death penalties)
- `docs/POLITICS.md` -- Political system (elections, governance, laws, taxes, diplomacy)
- `docs/SOCIAL.md` -- Social systems (guilds, messaging, friends, notifications)
- `docs/QUESTS.md` -- Quests, skills, specializations, leveling, progression
- `docs/PROMPTS.md` -- All agent team prompts consolidated
- `docs/PROMPT_QUEUE.md` -- Build phases and completion status

## 20 Playable Races
### Core (7) -- 5 towns each, easy start
Human (Heartlands), Elf (Silverwood), Dwarf (Ironvault), Halfling (Crossroads),
Orc (Ashenfang), Tiefling (Shadowmere), Dragonborn (Frozen Reaches)

### Common (6) -- 2-3 towns, moderate start
Half-Elf (Twilight March), Half-Orc (Scarred Frontier), Gnome (Cogsworth),
Merfolk (Pelagic Depths), Beastfolk (Thornwilds), Faefolk (Glimmerveil)

### Exotic (7) -- 0-2 towns, hard mode
Goliath (Skypeak), Drow (Vel'Naris/Underdark), Firbolg (Mistwood),
Warforged (The Foundry), Genasi (The Confluence), Revenant (Ashenmoor),
Changeling (Nomadic -- no hometown)

### Sub-races
- Dragonborn: 7 Draconic Ancestries (Red, Blue, White, Black, Green, Gold, Silver)
- Beastfolk: 6 Animal Clans (Wolf, Bear, Fox, Hawk, Panther, Boar)
- Genasi: 4 Elements (Fire, Water, Earth, Air)

### Race Data Files (in-game names may differ)
- Core: human.ts, elf.ts, dwarf.ts, harthfolk.ts, orc.ts, nethkin.ts, drakonid.ts
- Common: halfElf.ts, halfOrc.ts, gnome.ts, merfolk.ts, beastfolk.ts, faefolk.ts
- Exotic: goliath.ts, nightborne.ts, mosskin.ts, forgeborn.ts, elementari.ts, revenant.ts, changeling.ts

## 28 Professions
### Gathering (7): Farmer, Rancher, Fisherman, Lumberjack, Miner, Herbalist, Hunter
### Crafting (15): Smelter, Blacksmith, Armorer, Woodworker, Tanner, Leatherworker, Tailor, Alchemist, Enchanter, Cook, Brewer, Jeweler, Fletcher, Mason, Scribe
### Service (7): Merchant, Innkeeper, Healer, Stable Master, Banker, Courier, Mercenary Captain

- Max 3 professions per character (Humans get 4th at Level 15)
- Levels 1-100 with 6 tiers: Apprentice -> Journeyman -> Craftsman -> Expert -> Master -> Grandmaster
- Quality roll: d20 + (professionLevel/5) + toolBonus + workshopBonus + racialBonus

## Implemented Server Routes (41 files)
All routes in `server/src/routes/`:
- `auth.ts` -- Registration, login, logout, current user (JWT)
- `characters.ts` -- Character creation, character sheet, public profiles
- `world.ts` -- World map data, kingdoms, regions
- `towns.ts` -- Town details, buildings, resources, residents
- `travel.ts` -- Start travel, check status, arrive, border crossing
- `regions.ts` -- Regional mechanics, racial majority, bonuses/penalties
- `zones.ts` -- Exclusive zone access, entry validation, zone resources
- `market.ts` -- Marketplace browse, list, buy, cancel, price history
- `trade-analytics.ts` -- Cross-town prices, profitability, supply/demand
- `work.ts` -- Basic work actions (legacy gathering)
- `professions.ts` -- Learn, abandon, list professions, info, XP
- `crafting.ts` -- Recipes, start craft, craft queue, collect, batch
- `equipment.ts` -- Equip, unequip, compare items, stat calculation
- `items.ts` -- Item details, repair, durability tracking
- `tools.ts` -- Tool equip/unequip, durability, tier info
- `buildings.ts` -- Housing CRUD, construction, upgrade, rent, storage
- `caravans.ts` -- Create caravan, load cargo, depart, escorts, status
- `combat-pve.ts` -- PvE start, action, state, loot, dungeons
- `combat-pvp.ts` -- PvP challenge, accept, action, rankings, wagers
- `elections.ts` -- Nominate, vote, current election, results, impeach
- `governance.ts` -- Propose law, vote law, set tax, appointments, treasury
- `diplomacy.ts` -- Treaty proposals, war declaration, alliance, relations matrix
- `petitions.ts` -- Citizen petitions for diplomatic actions
- `world-events.ts` -- Herald announcements, State of Aethermere reports
- `guilds.ts` -- Guild CRUD, members, ranks, treasury, donations
- `messages.ts` -- Send, inbox, conversation, channels (town/kingdom/guild/private)
- `friends.ts` -- Add, remove, list friends, online status
- `notifications.ts` -- List, mark read, notification preferences
- `quests.ts` -- Available, accept, progress, complete, quest chains
- `skills.ts` -- Skill trees, spend points, specializations, ability unlocks
- `races.ts` -- Race list, details, sub-races, racial bonus calculator
- `special-mechanics.ts` -- Changeling shift, Warforged maintenance, Merfolk zones, Drow sunlight
- `profiles.ts` -- Player profiles, search, reputation
- `actions.ts` -- Real-time action system (gathering, crafting, travel)
- `food.ts` -- Food consumption, buff system
- `service.ts` -- Service profession actions (merchant, innkeeper, healer, etc.)
- `loans.ts` -- Banker loan system
- `reports.ts` -- Economic reports, mayor dashboards
- `admin.ts` -- Admin tools
- `game.ts` -- Game state, server status
- `index.ts` -- Route aggregator

## Implemented Server Services (31 files)
All services in `server/src/services/`:
- `achievements.ts` -- Achievement tracking and milestone rewards
- `action-lock-in.ts` -- Prevent concurrent actions per player
- `border-crossing.ts` -- Tariff and encounter checks at region borders
- `changeling-service.ts` -- Shapeshifting, NPC deception, appearance copying
- `combat-presets.ts` -- Monster stat blocks, encounter templates
- `daily-report.ts` -- Daily activity summaries
- `diplomacy-engine.ts` -- Treaty processing, war score, relation changes
- `diplomacy-reputation.ts` -- Kingdom diplomatic reputation tracking
- `durability.ts` -- Item durability degradation and break handling
- `faefolk-service.ts` -- Flight mechanics, ground bypass, trap dodging
- `food-system.ts` -- Food buff application and expiration
- `forgeborn-service.ts` -- Warforged maintenance and Repair Kit tracking
- `herald.ts` -- Global diplomatic announcement formatting
- `item-stats.ts` -- Item stat calculation (base + material + quality + enchant)
- `law-effects.ts` -- Applying law effects to gameplay
- `merfolk-service.ts` -- Amphibious movement, underwater resource access
- `nightborne-service.ts` -- Drow sunlight sensitivity, day/night tracking
- `profession-xp.ts` -- Profession XP grants, leveling, tier promotions
- `progression.ts` -- Character XP, level-up, stat point allocation
- `psion-perks.ts` -- Psion class special abilities
- `quest-triggers.ts` -- Automatic quest progress from game events
- `race-environment.ts` -- Biome-based racial bonuses
- `racial-bonus-calculator.ts` -- Combined racial bonus computation
- `racial-combat-abilities.ts` -- 120 racial abilities in combat engine
- `racial-passive-tracker.ts` -- Always-on racial passive effects
- `racial-profession-bonuses.ts` -- Race-specific profession speed/quality/yield/XP
- `racial-special-profession-mechanics.ts` -- Human 4th slot, Gnome efficiency, Warforged overclock
- `regional-mechanics.ts` -- Town majority tracking, bonus/penalty calculation
- `revenant-service.ts` -- Reduced death penalties, faster respawn
- `tick-combat-resolver.ts` -- Combat tick resolution engine
- `travel-resolver.ts` -- Travel time calculation and completion

## Implemented Cron Jobs (17 files)
All jobs in `server/src/jobs/`:
- `election-lifecycle.ts` -- Advance election phases automatically
- `tax-collection.ts` -- Collect player and town taxes on schedule
- `law-expiration.ts` -- Expire temporary laws when their duration ends
- `property-tax.ts` -- Collect building property taxes for town treasury
- `building-maintenance.ts` -- Degrade buildings over time, require repairs
- `construction-complete.ts` -- Complete building construction when timer finishes
- `caravan-events.ts` -- Trigger bandit ambushes and events for in-transit caravans
- `gathering-autocomplete.ts` -- Auto-complete gathering actions when timer finishes
- `resource-regeneration.ts` -- Regenerate depleted resource nodes over time
- `forgeborn-maintenance.ts` -- Degrade Warforged stats when maintenance overdue
- `reputation-decay.ts` -- Diplomatic reputation decay over time
- `state-of-aethermere.ts` -- Generate monthly world state report
- `daily-tick.ts` -- Daily game tick (various housekeeping)
- `loan-processing.ts` -- Process banker loan interest and payments
- `service-npc-income.ts` -- NPC service income generation
- `seer-premonition.ts` -- Seer class event generation
- `index.ts` -- Job scheduler aggregator

## Implemented Client Pages (24 files)
All pages in `client/src/pages/`:
- `LoginPage.tsx` -- Account login
- `RegisterPage.tsx` -- Account registration
- `CharacterCreationPage.tsx` -- 5-step character creation wizard
- `RaceSelectionPage.tsx` -- Race browser with tier tabs, comparison tool, sub-race selection
- `WorldMapPage.tsx` -- Interactive zoomable world map with 68 towns, regions, travel routes
- `TownPage.tsx` -- Town dashboard with buildings, resources, residents, gathering access
- `InventoryPage.tsx` -- Item grid, equipment slots, item details
- `CraftingPage.tsx` -- Recipe browser, craft queue, quality results, workshop bonus
- `MarketPage.tsx` -- Marketplace with browse, list, buy, price history charts
- `ProfessionsPage.tsx` -- Profession browser, learn/abandon, level progress
- `HousingPage.tsx` -- Properties, construction, furniture, workshops, shops
- `TradePage.tsx` -- Caravan management, price comparison, trade routes, merchant dashboard
- `CombatPage.tsx` -- Battle screen, action menus, dice rolls, combat log
- `TownHallPage.tsx` -- Mayor info, laws, treasury, elections
- `ElectionPage.tsx` -- Candidates, voting booth, results
- `GovernancePage.tsx` -- Law proposals, treasury, appointments
- `KingdomPage.tsx` -- Ruler, member towns, kingdom laws
- `DiplomacyPage.tsx` -- Relations matrix, treaties, war dashboard, petitions
- `GuildPage.tsx` -- Members, treasury, quests, officer management
- `QuestJournalPage.tsx` -- Active quests, progress bars, completed log
- `SkillTreePage.tsx` -- Visual skill tree, point spending, ability preview
- `AchievementPage.tsx` -- Achievement gallery with locked/unlocked states
- `ProfilePage.tsx` -- Character sheet, achievements, reputation
- `DailyDashboard.tsx` -- Daily action overview and summary

## Implemented Client Components (30+ directories)
Key component directories in `client/src/components/`:
- `auth/` -- Login/register forms
- `character/` -- Character creation wizard steps
- `combat/` -- Battle screen, action menus, dice roll animations
- `crafting/` -- Recipe browser, craft queue, quality results
- `daily-actions/` -- Daily action dashboard widgets
- `daily-report/` -- Daily activity report display
- `diplomacy/` -- Relations matrix, treaty panels, war dashboard
- `economy/` -- Price charts, trade analytics
- `food/` -- Food buff system display
- `gathering/` -- Resource nodes, gathering progress bars
- `guilds/` -- Guild management panels
- `housing/` -- Building construction, property management
- `hud/` -- Main game HUD overlay elements
- `inventory/` -- Item grid, equipment slots
- `map/` -- Interactive world map, region overlays, mini-map
- `messaging/` -- Chat panel, message compose
- `politics/` -- Election booth, governance controls
- `professions/` -- Profession browser, XP progress bars
- `quests/` -- Quest journal, objective tracking
- `races/` -- Race browser cards, comparison tool
- `racial-abilities/` -- Ability cards, cooldown timers
- `social/` -- Friends list, player search
- `town/` -- Town dashboard, building directory
- `trade/` -- Caravan management, price comparison tables
- `travel/` -- Travel progress, route selection
- `ui/` -- Reusable primitives (buttons, modals, tooltips, etc.)
- Standalone: `HUD.tsx`, `ChatPanel.tsx`, `FriendsList.tsx`, `NotificationDropdown.tsx`, `PlayerSearch.tsx`, `PoliticalNotifications.tsx`, `QuestDialog.tsx`, `LevelUpCelebration.tsx`, `LoadingScreen.tsx`, `XpBar.tsx`, `StatAllocation.tsx`, `ProgressionEventsProvider.tsx`, `SocialEventsProvider.tsx`

## Shared Data Files
All static game data in `shared/src/data/`:
- `races/` -- 20 race definition files organized by tier (core/, common/, exotic/) + index.ts
- `professions/` -- 28 profession definitions (gathering.ts, crafting.ts, service.ts), XP curves, tiers, types
- `recipes/` -- 15 recipe files: weapons.ts, armor.ts, consumables.ts, accessories.ts, enchantments.ts, ranged-weapons.ts, smelter.ts, tanner.ts, tailor.ts, mason.ts, woodworker.ts, housing.ts, mount-gear.ts, index.ts, types.ts
- `resources/` -- 8 resource category files: ores.ts, woods.ts, grains.ts, herbs.ts, animal.ts, fish.ts, stone.ts + index.ts, types.ts
- `skills/` -- 8 skill tree files: warrior.ts, mage.ts, rogue.ts, cleric.ts, ranger.ts, bard.ts, psion.ts + index.ts, types.ts
- `quests/` -- 5 quest files: main-quests.ts, town-quests.ts, daily-quests.ts, guild-quests.ts, bounty-quests.ts + index.ts, types.ts
- `tools/` -- Tool tier definitions (index.ts)
- `buildings/` -- Building requirements (requirements.ts)
- `caravans/` -- Caravan type definitions (types.ts)
- `items/` -- Item data
- `world/` -- World/region/town definitions
- `achievements.ts` -- Achievement definitions
- `progression/` -- XP curves, level-up rewards

**Never hardcode game values in server or client -- always reference shared data.**

## Server Middleware (4 files)
- `auth.ts` -- JWT token verification, attaches user to request
- `cache.ts` -- Redis caching middleware with configurable TTL
- `validate.ts` -- Generic Zod schema validation middleware
- `daily-action.ts` -- Daily action tracking/limiting middleware

## Socket.io System (4 files in server/src/socket/)
- `chat-handlers.ts` -- Chat message handling across all channel types
- `events.ts` -- Game event emission (combat, trades, travel, politics)
- `presence.ts` -- Online status tracking, who is in each town
- `middleware.ts` -- JWT authentication on socket connections

## Server Libraries (server/src/lib/)
- `prisma.ts` -- Prisma client singleton
- `redis.ts` -- Redis client singleton
- `socket.ts` -- Socket.io server instance

## Integration Tests (8 suites in server/src/__tests__/)
- `auth.test.ts` -- Registration, login, JWT validation
- `characters.test.ts` -- Character creation, race/class validation
- `combat.test.ts` -- PvE and PvP combat flows
- `economy.test.ts` -- Work, crafting, marketplace
- `politics.test.ts` -- Elections, governance, laws
- `social.test.ts` -- Guilds, messaging, friends
- `quests.test.ts` -- Quest acceptance, progress, completion
- `progression.test.ts` -- XP, leveling, skill trees

## Key Design Principles
1. **Player-driven economy** -- No NPC-created items. Every sword, potion, and meal is player-crafted
2. **Real-time actions** -- Gathering, crafting, travel take real-world time (minutes to hours)
3. **Item durability** -- Weapons (100 uses), armor (150 uses), tools (50 uses) break -> constant demand
4. **3-profession limit** -- Forces interdependence, nobody is self-sufficient
5. **Geographic scarcity** -- Resources tied to biomes/regions -> trade is necessary
6. **D&D mechanics** -- d20 rolls, ability scores (STR/DEX/CON/INT/WIS/CHA), AC, spell slots
7. **Player politics** -- Elected mayors and rulers with real governance power
8. **Racial relations** -- 20x20 diplomacy matrix affects tariffs, access, NPC behavior
9. **Exclusive zones** -- 11 zones only certain races can access (Underdark, Deep Ocean, Feywild, etc.)

## The World of Aethermere -- 8 Major Regions + Sub-regions

### Core Regions (5 towns each)
| Region | Race | Biome | Key Resources |
|--------|------|-------|---------------|
| Verdant Heartlands | Human | Plains/Hills | Grain, Cotton, Livestock |
| Silverwood Forest | Elf | Ancient Forest | Exotic Wood, Herbs, Arcane Reagents |
| Ironvault Mountains | Dwarf | Mountains/Underground | All Ores, Gems, Stone, Coal |
| The Crossroads | Halfling | Rolling Hills | Grain, Herbs, Vegetables |
| Ashenfang Wastes | Orc | Badlands/Volcanic | Leather, Bone, Obsidian, War Beasts |
| Shadowmere Marshes | Tiefling | Swamps/Bogs | Rare Herbs, Reagents, Mushrooms |
| Frozen Reaches | Dragonborn | Tundra/Volcanic | Mithril, Adamantine, Exotic Furs |
| The Suncoast | Neutral (Free Cities) | Coastal | Fish, Salt, Sand/Glass, Trade Goods |

### Common Race Territories (2-3 towns each)
| Territory | Race | Towns |
|-----------|------|-------|
| Twilight March | Half-Elf | Dawnmere, Twinvale, Harmony Point |
| Scarred Frontier | Half-Orc | Scarwatch, Tuskbridge, Proving Grounds |
| Cogsworth Warrens | Gnome | Cogsworth, Sparkhollow, Fumblewick |
| Pelagic Depths | Merfolk | Coralspire, Shallows End, Abyssal Reach |
| Thornwilds | Beastfolk | Thornden, Clawridge, Windrun |
| Glimmerveil | Faefolk | Glimmerheart, Dewdrop Hollow, Moonpetal Grove |

### Exotic Race Settlements (0-2 towns each)
| Territory | Race | Towns |
|-----------|------|-------|
| Skypeak Plateaus | Goliath | Skyhold, Windbreak |
| Vel'Naris Underdark | Drow | Vel'Naris, Gloom Market |
| Mistwood Glens | Firbolg | Misthaven, Rootholme |
| The Foundry | Warforged | The Foundry |
| The Confluence | Genasi | The Confluence, Emberheart |
| Ashenmoor | Revenant | Ashenmoor |
| Everywhere | Changeling | (Nomadic -- start anywhere) |

**Total: 68 towns across 21 territories**

## Racial Relations Matrix (Default Starting State)
Key: A=Allied, F=Friendly, N=Neutral, D=Distrustful, H=Hostile, BF=Blood Feud

Notable relationships:
- **Dwarf-Orc: Blood Feud** -- deepest hostility, hardest to change
- **Human-Halfling: Allied** -- strongest alliance
- **Elf-Faefolk-Firbolg: Allied** -- nature alliance
- **Dwarf-Gnome-Warforged: Friendly** -- crafter alliance
- **Tiefling-Drow-Revenant-Changeling: Friendly** -- outcast solidarity
- **Halflings: Neutral-to-Friendly with nearly everyone** -- traders, not fighters
- Players CAN change relations through diplomacy, treaties, and sustained effort

## 11 Exclusive Resource Zones
| Zone | Race | Exclusive Resources |
|------|------|-------------------|
| Deep Ocean | Merfolk | Deep Sea Iron, Abyssal Pearl, Living Coral, Sea Silk |
| Underdark | Drow | Darksteel Ore, Spider Silk, Shadow Crystal |
| Feywild (Lvl 40) | Faefolk | Moonpetal, Dreamweave Silk, Starlight Dust, Fey Iron |
| Sky Peaks | Goliath | Sky Iron, Cloud Crystal, Giant Eagle Feather |
| Deepwood Groves | Firbolg | Heartwood, Living Bark, Elder Sap, Spirit Moss |
| Foundry Core | Warforged | Arcane Conduit, Soul Crystal, Living Metal |
| Elemental Rifts (x4) | Genasi | Pure Element Essences, Elemental Cores |
| Ashenmoor Deadlands | Revenant | Death Blossom, Soul Dust, Grave Iron |
| Deep Thornwilds | Beastfolk | Spirit Beast Hide, Primal Bone, Thornwood |
| Dragon Lairs | Dragonborn | Dragon Scale, Dragon Bone, Dragon Blood |
| Deep Mines | Dwarf | Mithril, Adamantine (deep veins) |

## Crafting Chains (Examples)
**Iron Sword (5-6 players involved):**
Miner -> Smelter -> Lumberjack -> Hunter -> Tanner -> Blacksmith -> [Enchanter]

**Steel Plate Armor (6-7 players):**
Miner -> Smelter -> Farmer -> Tailor -> Hunter -> Tanner -> Armorer -> [Enchanter]

**Greater Healing Potion (3-4 players):**
Herbalist -> Miner/Woodworker -> Smelter -> Alchemist

## Economy Mechanics
- **No NPC vendors** for crafted goods -- all real gear is player-made
- **Player-set prices** on marketplace with town tax (5-25%, set by mayor)
- **Item durability** creates constant replacement demand
- **Resource scarcity by biome** creates trade routes between regions
- **Trade caravans** can be raided (PvE bandits or PvP in wartime)
- **Quality tiers:** Poor -> Common -> Fine -> Superior -> Masterwork -> Legendary
- **Workshop bonuses** from player-built buildings affect crafting speed and quality
- **Cascading quality** -- fine ingredients improve final product quality rolls
- **Batch crafting** -- queue multiple crafts with total time estimates
- **Trade analytics** -- per-item per-town price tracking, profitability calculator

## Combat System
- Turn-based, D&D-style with initiative rolls (d20 + DEX)
- Attack rolls: d20 + modifiers vs target AC
- 120 racial abilities across 20 races (6 per race, unlock at levels 1/5/10/15/25/40)
- PvE encounters, dungeons with bosses, PvP duels, arena, kingdom wars
- Status effects: poisoned, stunned, blessed, burning, frozen, etc.
- Death penalties: gold loss, XP loss, equipment durability damage
- Revenant reduced death penalty (halved)

## Political System
- Elected town mayors (set taxes, build, appoint officials)
- Elected kingdom rulers (declare war/peace, kingdom laws, treaties)
- Law system: propose -> council vote -> enact
- Diplomatic actions: treaties, trade agreements, alliances, wars
- Citizen petition system for diplomatic actions
- Herald announcements for diplomatic events
- Monthly "State of Aethermere" world reports

## Exotic Race Special Mechanics
- **Changeling**: Shapeshifting (visible race change, NPC deception Lvl 10, copy appearance Lvl 15, Veil Network Lvl 25)
- **Warforged**: Maintenance (no food, 7-day Repair Kit cycle, -1%/day overdue, Self-Repair)
- **Merfolk**: Amphibious (3x water speed, 85% land speed, underwater resources)
- **Drow**: Sunlight Sensitivity (day/night tracking, -2 attack/-2 perception daytime surface)
- **Faefolk**: Flight (bypass ground obstacles, dodge traps, no heavy loads)
- **Revenant**: Reduced Death (half gold/XP/durability loss, half respawn timer)
- **Goliath**: Double carry capacity, cold immunity
- **Firbolg**: Animal/plant communication, nature gathering supremacy

## Game Data Location
All static game data -> `/shared/src/data/` as typed TypeScript constants
Database schema -> `/database/prisma/schema.prisma`
**Never hardcode game values in server or client -- always reference shared data.**

## Development Phases -- ALL COMPLETE
- Phase 1 (Prompts 00-08): Core systems foundation -- **COMPLETE**
- Phase 2A (Prompts 09-14): Economy & professions expansion -- **COMPLETE**
- Phase 2B (Prompts 15-18): 20 races & world expansion -- **COMPLETE**
- Documentation Pass: Full docs, game guide, API reference -- **COMPLETE**
- Phase 3 (Prompts 19+): Future features (mounts, religion, naval, seasons) -- Not started

## Completion Summary
All 19 prompts (00-18) across 3 phases are complete. Implemented systems:

**Phase 1 -- Core Systems:**
- Auth (JWT + bcrypt), character creation with all 20 races
- World navigation with 68 seeded towns across 21 regions
- Basic marketplace with player-set prices and town taxes
- Turn-based PvE combat (Redis state, monster AI, loot, XP)
- PvP duels (challenge/accept, wagers, leaderboard)
- Elections (nominations, voting, impeachment, auto-lifecycle cron)
- Governance (laws, taxes, treasury, appointments, war/peace)
- Guilds (ranks, invites, donations, leadership transfer)
- Multi-channel messaging (7 channel types), friends, notifications
- Quest system (5 types, auto-triggers, NPC quest givers)
- Skill trees (7 classes, 21 specializations, ability unlock)
- Leveling (XP formula, stat/skill points, HP/MP growth)
- Socket.io real-time events throughout
- Zod validation on all endpoints
- Integration tests, Docker Compose, CI/CD

**Phase 2A -- Economy Expansion:**
- 28 profession system with learn/abandon, XP curves, 6 tiers
- Resource gathering engine with d20 rolls, tool bonuses, depletion
- 60+ raw resources across 8 categories assigned to towns by biome
- Tool system (6 types, 6 material tiers, durability)
- Full processing chain (smelting, tanning, spinning, masonry, milling)
- Finished goods crafting (weapons, armor, consumables, accessories, enchantments)
- Batch crafting queues with workshop bonuses and cascading quality
- Item durability and repair system
- Player housing (houses, workshops, shops) with construction and maintenance
- Trade caravans with cargo, escorts, bandit ambushes, insurance
- Trade analytics (cross-town prices, profitability calculator, supply/demand)

**Phase 2B -- Race Expansion:**
- Full 20-race data with stat modifiers, traits, 120 abilities, profession bonuses
- Sub-race systems (7 ancestries, 6 clans, 4 elements)
- 68-town world map with 21 regions, travel routes, border mechanics
- 11 exclusive resource zones with access requirements
- Regional mechanics (racial majority, border tariffs, environmental effects)
- 20x20 racial diplomacy matrix (190 pairings) with treaty/war system
- Herald announcements, State of Aethermere reports, citizen petitions
- All 120 racial combat abilities integrated into combat engine
- All racial profession bonuses integrated into gathering/crafting
- Special exotic race mechanics (Changeling shapeshifting, Warforged maintenance, Merfolk amphibious, Drow sunlight, Faefolk flight, Revenant reduced death)
