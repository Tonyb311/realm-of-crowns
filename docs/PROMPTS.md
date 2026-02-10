# Realm of Crowns — All Agent Team Prompts

> A D&D-inspired, browser-based MMORPG inspired by Renaissance Kingdoms, featuring player-driven economies, politics, combat, magic, races, and classes.

---

## Phase 1 — Core Systems (Prompts 0-8)

### PROMPT 0 — Project Bootstrap (Run First)

```
You are the team lead for a large full-stack game project called "Realm of Crowns."
This is a browser-based fantasy MMORPG inspired by Renaissance Kingdoms but with
D&D-style races, classes, magic, and combat.

Before we begin development, I need you to set up the project foundation.
Use agent teams. Spawn a team of 3 teammates:

1. Teammate "project-scaffolder" — Create the monorepo folder structure:
   - /client (React + TypeScript frontend)
   - /server (Node.js + Express + TypeScript backend)
   - /shared (shared types, constants, enums used by both)
   - /database (migration files, seed data)
   - /docs (game design docs, architecture docs)
   Initialize package.json in each, set up TypeScript configs, and install
   core dependencies (React, Express, Prisma, Socket.io, Zod).

2. Teammate "schema-architect" — Create a comprehensive Prisma schema
   covering these core models:
   - Player (auth, profile, race, class, stats, level, XP, gold, location)
   - Kingdom (name, ruler, treasury, laws, tax rate)
   - Town (name, kingdom, mayor, population, buildings, resources)
   - Character (race, class, HP, MP, STR, DEX, CON, INT, WIS, CHA, inventory)
   - Building (type, town, owner, level, production, workers)
   - Item (name, type, rarity, stats, effects, craftable, recipe)
   - Quest (name, description, requirements, rewards, type)
   - Trade (buyer, seller, item, quantity, price, status)
   - Election (type, town/kingdom, candidates, votes, status, endDate)
   - CombatLog (attacker, defender, actions, outcome, loot)
   - Guild (name, leader, members, treasury, reputation)
   - Message (sender, recipient, subject, body, read)
   Use proper relations, indexes, and enums for things like Race, Class,
   BuildingType, ItemType, Rarity, ElectionType.

3. Teammate "doc-writer" — Create /docs/GAME_DESIGN.md with a full Game
   Design Document covering:
   - Core gameplay loop (work, earn, craft, trade, fight, govern)
   - Races: Human, Elf, Dwarf, Halfling, Orc, Tiefling (with stat bonuses)
   - Classes: Warrior, Mage, Rogue, Cleric, Ranger, Bard (with abilities)
   - Economy system (resources, crafting, trading, taxes, supply/demand)
   - Political system (town mayors, kingdom rulers, elections, laws)
   - Combat system (turn-based, D&D-style with dice rolls, abilities, spells)
   - Magic system (spell slots, schools of magic, mana)
   - Progression system (XP, leveling, skill trees)
   - Time system (real-time actions like travel, crafting, rest)
   - Social systems (guilds, messaging, reputation, alliances)

After all teammates complete and report back, give me a summary of what
was created and flag any decisions that need my input.
```

---

### PROMPT 1 — Authentication & Player System

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the authentication and player onboarding system:

1. Teammate "auth-backend" — Build the authentication system in /server:
   - POST /api/auth/register (email, username, password)
   - POST /api/auth/login (returns JWT)
   - POST /api/auth/logout
   - GET /api/auth/me (returns current user from JWT)
   - Middleware: authGuard that validates JWT on protected routes
   - Use bcrypt for passwords, jsonwebtoken for JWTs
   - Zod validation on all inputs
   - Proper error handling with consistent error response format

2. Teammate "character-creation-backend" — Build character creation API:
   - POST /api/characters/create
   - Player selects: name, race, class, starting town
   - Auto-generate starting stats based on race + class using D&D-style
     point-buy or standard array
   - Give starting equipment based on class
   - Give starting gold (varies by race)
   - Validate that player doesn't already have an active character
   - GET /api/characters/me — returns full character sheet

3. Teammate "auth-frontend" — Build React pages in /client:
   - /login page with email + password form
   - /register page with email, username, password, confirm password
   - Auth context provider that stores JWT and user state
   - Protected route wrapper component
   - Auto-redirect to /login if not authenticated
   - Use a clean dark fantasy UI theme (think parchment + dark stone)

4. Teammate "character-creation-frontend" — Build the character creation
   flow in /client:
   - Step 1: Choose Race (show each race with portrait, lore, stat bonuses)
   - Step 2: Choose Class (show each class with description, abilities)
   - Step 3: Allocate Stats (point-buy system with race bonuses applied)
   - Step 4: Choose Starting Town (show map or list of towns)
   - Step 5: Review & Confirm
   - Animated transitions between steps, fantasy UI styling

After all teammates complete and report back, integrate the pieces
together, make sure auth flows into character creation for new players,
and verify the full flow works end-to-end.
```

---

### PROMPT 2 — World, Towns & Navigation

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the world map and town systems:

1. Teammate "world-data" — Create seed data in /database for:
   - 3 Kingdoms (e.g., Valdris, Thornhold, Sylvane) each with lore
   - 4-5 Towns per kingdom with: name, description, population, coordinates,
     available buildings, local resources, ruling NPCs (until players take over)
   - Travel routes between towns with distances (in real-time minutes)
   - Resource distribution (forests have lumber, mountains have ore,
     plains have grain, coasts have fish)
   - Create a seed script that populates the database

2. Teammate "town-backend" — Build town & navigation APIs in /server:
   - GET /api/world/map — returns all towns, routes, kingdoms
   - GET /api/towns/:id — returns full town details, buildings, resources
   - POST /api/travel/start — begin travel to destination
     (calculates real-time duration, sets player state to "traveling")
   - GET /api/travel/status — check remaining travel time
   - POST /api/travel/arrive — complete travel (or auto-complete via cron)
   - Player location tracking and validation

3. Teammate "world-map-frontend" — Build an interactive world map in /client:
   - Canvas or SVG-based fantasy map showing all towns and routes
   - Towns shown as icons, color-coded by kingdom
   - Click a town to see info panel (name, kingdom, population, resources)
   - Click "Travel" to begin journey, show progress indicator
   - Show player's current location with a marker
   - Fantasy parchment/map aesthetic

4. Teammate "town-view-frontend" — Build the town view page in /client:
   - When player is in a town, show the town dashboard
   - List of buildings (market, tavern, blacksmith, barracks, church, etc.)
   - Town info sidebar (mayor, population, tax rate, resources)
   - Navigation to: Market, Tavern, Jobs Board, Town Hall, Training Grounds
   - Each building is a clickable card that routes to its own page
   - Show other players currently in this town

After all teammates complete and report back, wire everything together
so a player can log in, see their town, open the world map, travel to
another town, and see the new town's dashboard.
```

---

### PROMPT 3 — Economy, Crafting & Trading

```
You are the team lead. Use agent teams. Spawn a team of 5 teammates
to build the economy system:

1. Teammate "resource-system" — Build the resource & gathering backend:
   - Resources: Lumber, Stone, Iron, Gold Ore, Grain, Herbs, Leather,
     Gems, Arcane Dust, Fish
   - Daily work actions: player picks a job (lumberjack, miner, farmer,
     herbalist, fisherman) — takes real-time hours, yields resources
   - Yield affected by: character stats, tool quality, town bonuses,
     random D&D-style dice rolls
   - API: POST /api/work/start, GET /api/work/status, POST /api/work/collect

2. Teammate "crafting-system" — Build the crafting backend:
   - Crafting recipes stored in DB (e.g., Iron Sword = 3 Iron + 1 Leather + 1 Lumber)
   - Crafting takes real time based on complexity
   - Quality roll: d20 + skill modifier = item quality (Poor/Common/Fine/Superior/Masterwork)
   - API: GET /api/crafting/recipes, POST /api/crafting/start,
     GET /api/crafting/status, POST /api/crafting/collect
   - Crafting skill improves with use (XP per craft)

3. Teammate "market-system" — Build the player marketplace backend:
   - Players list items for sale at their price (free market)
   - API: POST /api/market/list, GET /api/market/browse (with filters),
     POST /api/market/buy, POST /api/market/cancel
   - Transaction fees (tax goes to town treasury)
   - Price history tracking for economic graphs
   - NPC merchants as price floor/ceiling safety valves

4. Teammate "inventory-frontend" — Build inventory & crafting UI in /client:
   - Inventory grid showing all items with icons, quantity, rarity color
   - Item detail popup (stats, description, sell value)
   - Crafting panel: browse recipes, see requirements, start craft
   - Work panel: choose a job, see progress, collect results
   - Equipment slots: head, chest, legs, feet, main hand, off hand,
     accessory x2

5. Teammate "market-frontend" — Build the marketplace UI in /client:
   - Browse listings with filters (item type, price range, rarity, seller)
   - Sort by price, date listed, rarity
   - Buy confirmation dialog with gold balance shown
   - "My Listings" tab to manage your own sales
   - Price history chart for popular items
   - Fantasy-themed shop/market aesthetic

After all teammates complete and report back, integrate the economy loop:
work -> gather resources -> craft items -> sell on market -> earn gold.
Verify the full economic cycle works end-to-end.
```

---

### PROMPT 4 — Combat System

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the D&D-inspired combat system:

1. Teammate "combat-engine" — Build the core combat engine in /server:
   - Turn-based combat using initiative rolls (d20 + DEX modifier)
   - Action types: Attack, Cast Spell, Use Item, Defend, Flee
   - Attack rolls: d20 + modifiers vs target AC
   - Damage rolls: weapon die + STR/DEX modifier
   - Spell system: spell slots per level, save DCs, spell effects
   - Status effects: poisoned, stunned, blessed, burning, frozen, etc.
   - Death at 0 HP -> player respawns in town with penalties
     (gold loss, XP loss, equipment damage)
   - Combat log recording every action for replay

2. Teammate "pve-system" — Build PvE encounters:
   - Monster database with stats (Goblin, Wolf, Bandit, Skeleton, Dragon, etc.)
   - Encounter zones near each town with level-appropriate monsters
   - Dungeon system: multi-room encounters with boss at the end
   - Loot tables per monster (items, gold, XP)
   - API: POST /api/combat/pve/start, POST /api/combat/pve/action,
     GET /api/combat/pve/state
   - Quest-linked encounters

3. Teammate "pvp-system" — Build PvP combat:
   - Challenge another player to a duel (both must accept)
   - Arena system in towns with barracks
   - Wager system (bet gold on the outcome)
   - Rankings/leaderboard based on PvP wins
   - API: POST /api/combat/pvp/challenge, POST /api/combat/pvp/accept,
     POST /api/combat/pvp/action
   - Anti-grief: level difference limits, cooldowns

4. Teammate "combat-frontend" — Build the combat UI in /client:
   - Battle screen with player and enemy portraits, HP/MP bars
   - Action menu: Attack, Spells (expandable list), Items, Defend, Flee
   - Animated combat log showing each action and result
   - Dice roll animations (show the d20 rolling)
   - Damage numbers floating up
   - Victory/defeat screen with loot summary
   - Turn indicator and initiative order display

After all teammates complete and report back, connect combat to the
world — players can enter encounter zones from the town view, fight
monsters, earn loot and XP, level up, and challenge other players.
```

---

### PROMPT 5 — Political System & Governance

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build the political and governance system:

1. Teammate "election-system" — Build elections backend in /server:
   - Town Mayor elections: any resident can run, all residents vote
   - Kingdom Ruler elections: only mayors can run, all citizens vote
   - Election cycle: nominations open -> campaigning period -> voting -> results
   - Real-time timers (e.g., voting lasts 48 real hours)
   - API: POST /api/elections/nominate, POST /api/elections/vote,
     GET /api/elections/current, GET /api/elections/results
   - Term limits and impeachment voting

2. Teammate "governance-system" — Build laws & governance backend:
   - Mayor powers: set tax rate, build/upgrade buildings, appoint
     sheriff, set trade policies, allocate treasury
   - Ruler powers: declare war/peace, set kingdom-wide laws,
     appoint council, manage kingdom treasury
   - Law system: mayors/rulers propose laws, council votes
   - Laws affect gameplay: tax rates change trade fees, military
     funding affects town guards, trade embargoes block certain items
   - Treasury management: income from taxes, spending on buildings/military
   - API: POST /api/governance/propose-law, POST /api/governance/vote-law,
     POST /api/governance/set-tax, GET /api/governance/laws

3. Teammate "politics-frontend" — Build the political UI in /client:
   - Town Hall page: current mayor, active laws, treasury balance,
     upcoming elections
   - Election page: candidates with platforms, voting booth, results
   - Governance panel (for mayors/rulers): propose laws, manage treasury,
     appoint officials
   - Kingdom overview: ruler, member towns, kingdom laws, diplomacy status
   - Notification system for political events (new election, law passed,
     war declared)

After all teammates complete and report back, integrate politics with
the economy — tax rates should actually affect marketplace fees,
building construction should cost from treasury, and wars between
kingdoms should affect travel and trade.
```

---

### PROMPT 6 — Social, Guilds & Real-Time

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build social and real-time systems:

1. Teammate "messaging-system" — Build messaging backend:
   - Private messages between players
   - Town chat (all players in same town)
   - Kingdom chat (all players in same kingdom)
   - Guild chat
   - Global announcements channel (political events, wars, etc.)
   - Use Socket.io for real-time delivery
   - API: POST /api/messages/send, GET /api/messages/inbox,
     GET /api/messages/conversation/:id

2. Teammate "guild-system" — Build guild backend:
   - Create guild (costs gold), set name, crest, description
   - Invite/kick members, officer ranks with permissions
   - Guild treasury (members can donate)
   - Guild quests (cooperative objectives)
   - Guild hall building in towns (unlocks perks)
   - Guild reputation earned through member actions
   - API: full CRUD for guilds, membership management, treasury

3. Teammate "realtime-engine" — Build the real-time event system:
   - Socket.io server integrated with Express
   - Events: player enters/leaves town, combat results, elections,
     trade completed, chat messages, travel updates
   - Presence system: show who's online, who's in your town
   - Notification system: toast notifications for relevant events
   - Rate limiting and authentication on socket connections

4. Teammate "social-frontend" — Build social UI in /client:
   - Chat panel (tabbed: town, kingdom, guild, private)
   - Player profile pages (character sheet, achievements, reputation)
   - Guild page (members, treasury, quests, management for officers)
   - Friends list and online status
   - Notification dropdown with recent events
   - Player search/lookup

After all teammates complete and report back, integrate real-time
features across the entire app — chat should work everywhere,
notifications should fire for political, economic, and combat events,
and player presence should show on town views.
```

---

### PROMPT 7 — Quest System & Progression

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build quests and progression:

1. Teammate "quest-engine" — Build the quest system backend:
   - Quest types: Main Story, Town Quests, Daily Quests, Guild Quests,
     Bounty Hunts
   - Quest structure: objectives (kill X, gather Y, deliver Z, talk to NPC),
     requirements (level, class, items), rewards (XP, gold, items, reputation)
   - Quest chains (completing one unlocks the next)
   - NPC quest givers in each town
   - Quest journal tracking active/completed quests
   - API: GET /api/quests/available, POST /api/quests/accept,
     POST /api/quests/progress, POST /api/quests/complete

2. Teammate "progression-engine" — Build the leveling and skill system:
   - XP from: combat, quests, crafting, work, political actions
   - Level up: increase HP/MP, gain stat points, unlock abilities
   - Skill trees per class (3 specializations each):
     Warrior: Berserker / Guardian / Warlord
     Mage: Elementalist / Necromancer / Enchanter
     Rogue: Assassin / Thief / Swashbuckler
     Cleric: Healer / Paladin / Inquisitor
     Ranger: Beastmaster / Sharpshooter / Tracker
     Bard: Diplomat / Battlechanter / Lorekeeper
   - Each spec has 10-15 abilities/passives in a tree
   - Achievements system (milestones that grant titles and bonuses)

3. Teammate "quest-progression-frontend" — Build quest & progression UI:
   - Quest journal page: active quests with progress bars, completed log
   - Quest dialog when talking to NPC quest givers
   - Level up celebration screen with stat allocation
   - Skill tree page: visual tree with nodes, spend points, preview abilities
   - Achievement gallery with locked/unlocked states
   - XP bar always visible in the main HUD

After all teammates complete and report back, connect quests to combat
(kill quests trigger from combat victories), economy (gather quests
trigger from work), and politics (political quests from town hall).
Verify a player can accept a quest, complete objectives, and receive rewards.
```

---

### PROMPT 8 — Polish, Testing & Deployment

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
for final integration, polish, and deployment prep:

1. Teammate "integration-tester" — Write comprehensive tests:
   - API integration tests for all routes (auth, character, combat,
     economy, politics, quests)
   - Test the full gameplay loops end-to-end
   - Test edge cases: insufficient gold, duplicate votes, travel while
     in combat, crafting without materials
   - Socket.io event tests
   - Use Jest + Supertest

2. Teammate "ui-polish" — Polish the frontend:
   - Consistent fantasy theme across all pages (dark backgrounds,
     parchment textures, medieval fonts, gold accents)
   - Responsive design (desktop primary, tablet secondary)
   - Loading states and skeleton screens everywhere
   - Error handling with user-friendly messages
   - Tooltips on all interactive elements
   - Sound effects for key actions (combat hit, level up, gold earned)
   - Main HUD: character portrait, HP/MP bars, gold, XP bar,
     location, notifications

3. Teammate "performance-optimizer" — Optimize for multiplayer:
   - Database query optimization (add indexes, eager loading)
   - Redis caching for frequently accessed data (town info, market prices)
   - Rate limiting on all API routes
   - Socket.io room management (don't broadcast to everyone)
   - Lazy loading for frontend routes
   - Image optimization and CDN-ready asset pipeline

4. Teammate "deployment-setup" — Prepare deployment:
   - Docker Compose setup: app server, PostgreSQL, Redis
   - Environment variable configuration (.env.example)
   - Database migration and seed scripts
   - README.md with full setup instructions
   - CI/CD pipeline config (GitHub Actions)
   - Nginx reverse proxy config
   - SSL/HTTPS setup guide

After all teammates complete and report back, do a final review of the
entire codebase. Make sure all systems are connected, all APIs work,
the database schema is consistent, and the app can be started with a
single docker-compose up command. Give me a final status report.
```

---

## Phase 2A — Economy Expansion (Prompts 9-14)

### PROMPT 9 — Profession System Foundation

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the profession system foundation.

Context: This game has a player-driven economy where NO item appears
from nothing. Every finished item traces back through a chain of player
professions. A single character can have a maximum of 3 professions
(mix of Gathering, Crafting, and Service). Professions level from 1-100
with tiers: Apprentice (1-10), Journeyman (11-25), Craftsman (26-50),
Expert (51-75), Master (76-90), Grandmaster (91-100).

1. Teammate "profession-schema" — Extend the Prisma schema with:
   - PlayerProfession model (playerId, professionType, level, currentXP,
     xpToNextLevel, tier, specialization)
   - Profession enum: FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER,
     HERBALIST, HUNTER, SMELTER, BLACKSMITH, ARMORER, WOODWORKER, TANNER,
     LEATHERWORKER, TAILOR, ALCHEMIST, ENCHANTER, COOK, BREWER, JEWELER,
     FLETCHER, MASON, SCRIBE, MERCHANT, INNKEEPER, HEALER, STABLE_MASTER,
     BANKER, COURIER
   - ProfessionCategory enum: GATHERING, CRAFTING, SERVICE
   - ProfessionTier enum: APPRENTICE, JOURNEYMAN, CRAFTSMAN, EXPERT,
     MASTER, GRANDMASTER
   - Validation: max 3 professions per character, with rules
     (max 2 gathering, max 2 crafting, max 1 service)
   - ProfessionXPLog (track XP gains over time for analytics)
   - Run migration

2. Teammate "profession-backend" — Build profession management APIs:
   - POST /api/professions/learn — learn a new profession (validates
     the 3-profession limit and category rules)
   - POST /api/professions/abandon — abandon a profession (confirms
     with warning about losing all progress)
   - GET /api/professions/mine — get all my professions with levels
   - GET /api/professions/info/:type — get profession details,
     description, tier unlocks, what it produces
   - Profession XP system: addProfessionXP(playerId, professionType, amount)
     — handles leveling up, tier promotions, notifications
   - Tier unlock checker: what recipes/abilities are available at current level
   - XP curve: each level requires progressively more XP
     (level 1->2: 100xp, level 99->100: 50,000xp)

3. Teammate "profession-selection-frontend" — Build the profession
   selection UI in /client:
   - Profession browser page: show all 28 professions organized by
     category (Gathering, Crafting, Service)
   - Each profession card shows: icon, name, description, what it
     produces, what it needs as input, which town types are best for it
   - "Learn Profession" flow with validation (shows remaining slots,
     warns about limits)
   - My Professions dashboard: current professions, level bars,
     tier badges, XP progress

4. Teammate "profession-data" — Create the profession data files
   in /shared:
   - Full profession definitions (name, category, description,
     stat that affects quality, related professions)
   - XP curve table (level -> XP required)
   - Tier definitions (level range, title, perks description)
   - Profession compatibility rules (which combos are allowed)
   - Profession-to-town-type affinity map (miners do best in
     mountain towns, farmers in plains, etc.)
   - Export as typed constants so both frontend and backend use
     the same data

After all teammates complete and report back, verify that a player
can browse professions, learn up to 3, see their profession dashboard,
and that the XP system correctly levels them up through tiers.
Summarize what was built and flag any design decisions that need my input.
```

---

### PROMPT 10 — Raw Resources & Gathering System

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the resource gathering system.

Context: Gathering professions (Farmer, Rancher, Fisherman, Lumberjack,
Miner, Herbalist, Hunter) produce raw materials. Gathering takes real
time, yields are affected by profession level + character stats + tool
quality + town type + a d20 dice roll. Resources are region-specific:
mountain towns have ore, forest towns have wood, plains have grain,
coastal towns have fish, swamps have rare herbs.

1. Teammate "resource-schema" — Extend the Prisma schema with:
   - Resource model (id, name, type, rarity, description, icon,
     baseGatherTime, baseYield, regionTypes where found)
   - ResourceType enum: ORE, WOOD, GRAIN, HERB, FISH, HIDE, STONE,
     FIBER, ANIMAL_PRODUCT, REAGENT
   - Rarity enum: COMMON, UNCOMMON, RARE, EXOTIC, LEGENDARY
   - GatheringAction model (playerId, professionType, resourceId,
     townId, startedAt, completesAt, toolId, status)
   - TownResource model (townId, resourceId, abundance level 1-5,
     depletion tracker)
   - Seed all resources into the database:
     * Ores: Copper, Iron, Silver, Gold, Mithril, Adamantine, Coal, Gems
     * Woods: Softwood, Hardwood, Exotic Wood, Bark, Sap, Resin
     * Grains: Wheat, Corn, Vegetables, Cotton, Flax, Hops, Apples, Grapes
     * Herbs: Common Herbs, Medicinal Herbs, Rare Herbs, Mushrooms,
       Flowers, Arcane Reagents, Spices
     * Animal: Raw Leather, Pelts, Bone, Antlers, Feathers, Wool,
       Milk, Eggs, Wild Game Meat, Beef, Pork, Chicken
     * Fish: Common Fish, Rare Fish, Shellfish, Pearls, Seaweed, Salt
     * Stone: Raw Stone, Sandstone, Marble, Silite Sand
   - Assign resources to town types with abundance levels
   - Run migration and seed

2. Teammate "gathering-engine" — Build the gathering action backend:
   - POST /api/gathering/start — start a gathering action
     * Validates: player is in correct town type, has correct profession,
       has required tool (or bare hands for penalty), isn't already
       doing another action
     * Calculates gather time: baseTime / (1 + professionLevel/100)
       / toolSpeedBonus / townAbundanceBonus
     * Sets completesAt timestamp
   - GET /api/gathering/status — check current gathering progress
   - POST /api/gathering/collect — collect results when timer is done
     * Yield calculation: baseYield * (1 + professionLevel/50)
       * toolYieldBonus * townAbundanceBonus
     * Quality/rarity roll: d20 + professionLevel/5
       (higher rolls = chance of rarer resources)
     * Grant profession XP based on resource rarity and quantity
     * Add resources to player inventory
   - POST /api/gathering/cancel — cancel in progress (lose time,
     get partial yield)
   - Cron job / scheduler that auto-completes gathering actions
     and notifies players
   - Resource depletion: heavy gathering in one area temporarily
     reduces yields (regenerates over real time)

3. Teammate "gathering-frontend" — Build the gathering UI in /client:
   - Gathering panel accessible from town view
   - Shows available resources in current town with abundance indicators
   - "Start Gathering" button per resource with estimated time and yield
   - Progress bar with real-time countdown
   - "Collect" button when done with results popup showing:
     * Resources gained (with rarity colors)
     * Quality roll result (show the d20 animation)
     * XP earned
     * Profession level progress
   - Tool slot display (shows equipped gathering tool and its bonus)
   - Resource history log (what you've gathered recently)

4. Teammate "tool-system" — Build the gathering tools system:
   - Tool items in the database (Pickaxe for mining, Axe for lumber,
     Hoe for farming, Rod for fishing, Sickle for herbs, Knife for hunting)
   - Tool tiers: Crude (no profession needed to use), Copper, Iron,
     Steel, Mithril, Adamantine
   - Each tier gives: speed bonus + yield bonus + durability
   - Tools have durability — degrade with each use, break when depleted
   - Tools are CRAFTED by Blacksmiths (this creates demand for
     blacksmith profession!)
   - API: equip tool to gathering profession slot, track durability,
     break notification
   - Seed basic Crude tools that new players start with (low stats,
     break fast)

After all teammates complete and report back, verify the full gathering
loop: player with a mining profession goes to a mountain town, equips
a pickaxe, starts mining iron ore, waits for the timer, collects ore +
XP, and the tool loses durability. Flag any balance concerns.
```

---

### PROMPT 11 — Smelting, Processing & Refined Materials

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build the intermediate processing layer — the professions that turn
raw materials into usable crafting components.

Context: Raw resources can't be used directly for most crafting.
Ore must be smelted into ingots, raw leather must be tanned, raw
cotton must be spun into cloth, stone must be cut, wood must be
processed into planks. These "processing" professions are the critical
middle link in every crafting chain.

1. Teammate "processing-recipes" — Create the full processing recipe
   database in /shared and /database:

   SMELTER recipes:
   - Copper Ore x3 + Coal x1 -> Copper Ingot x2 (Lvl 1)
   - Iron Ore x3 + Coal x2 -> Iron Ingot x2 (Lvl 10)
   - Iron Ingot x2 + Coal x3 -> Steel Ingot x1 (Lvl 30)
   - Silver Ore x3 + Coal x1 -> Silver Ingot x2 (Lvl 20)
   - Gold Ore x3 + Coal x1 -> Gold Ingot x1 (Lvl 25)
   - Mithril Ore x5 + Coal x3 -> Mithril Ingot x1 (Lvl 55)
   - Adamantine Ore x8 + Coal x5 + Arcane Reagent x1 -> Adamantine Ingot x1 (Lvl 75)
   - Sand x5 -> Glass x3 (Lvl 15)
   - Iron Ingot x1 -> Nails x50 (Lvl 5)

   TANNER recipes:
   - Raw Leather x2 + Bark x1 -> Soft Leather x1 (Lvl 1)
   - Raw Leather x3 + Bark x2 + Salt x1 -> Hard Leather x1 (Lvl 15)
   - Pelts x2 + Bark x1 -> Fur Leather x1 (Lvl 10)
   - Exotic Hide x2 + Rare Herbs x1 -> Exotic Leather x1 (Lvl 50)
   - Dragon Hide x1 + Arcane Reagent x3 -> Dragonscale Leather x1 (Lvl 80)

   TAILOR (spinning/weaving only — clothing is separate):
   - Cotton x3 -> Cloth x2 (Lvl 1)
   - Flax x3 -> Linen x2 (Lvl 5)
   - Wool x2 -> Woven Wool x1 (Lvl 10)
   - Silk Thread x3 -> Silk Cloth x1 (Lvl 40)

   MASON recipes:
   - Raw Stone x3 -> Cut Stone x2 (Lvl 1)
   - Raw Stone x5 + Coal x1 -> Bricks x4 (Lvl 10)
   - Marble x3 -> Polished Marble x1 (Lvl 30)
   - Sandstone x3 -> Cut Sandstone x2 (Lvl 5)

   WOODWORKER (processing only — furniture/items separate):
   - Softwood Log x2 -> Softwood Planks x4 (Lvl 1)
   - Hardwood Log x2 -> Hardwood Planks x3 (Lvl 10)
   - Hardwood Log x3 -> Beams x2 (Lvl 15)
   - Exotic Wood Log x2 -> Exotic Planks x2 (Lvl 40)

   Store all recipes as structured data (JSON/TypeScript constants) with:
   - recipeId, professionRequired, levelRequired, inputs[], outputs[],
     craftTime, xpReward, tier

2. Teammate "crafting-engine-v2" — Rebuild the crafting backend to
   support the full recipe chain system:
   - Recipe registry: load all recipes from the data files
   - POST /api/crafting/start — validate player has profession + level,
     has all input materials in inventory, has access to correct
     workshop building (or can do basic recipes without one)
   - Workshop bonus: crafting in the correct building type gives
     speed + quality bonuses based on building level
   - Quality roll on every craft: d20 + (professionLevel / 5) +
     toolBonus + workshopBonus -> determines output quality
   - Quality affects the PRODUCT: a "Fine" Iron Ingot is worth more
     and gives bonuses when used in further crafting
   - Cascading quality: using Fine ingredients in a recipe gives
     a bonus to the final quality roll
   - Batch crafting: craft multiple of the same recipe in queue
   - POST /api/crafting/queue — add multiple crafts to queue
   - GET /api/crafting/queue — see current queue and progress
   - Grant profession XP per craft, scaled by recipe difficulty

3. Teammate "crafting-frontend-v2" — Rebuild the crafting UI to
   support the full system:
   - Crafting panel shows: current profession, level, available recipes
     (greyed out if too low level or missing materials)
   - Recipe browser with search/filter by: profession, tier, output type
   - Recipe detail view: shows full ingredient chain visually
     ("To make Steel Plate Armor you need Steel Ingots which need
     Iron Ingots which need Iron Ore + Coal")
   - "What can I make?" button — scans inventory and highlights
     craftable recipes
   - Craft queue display with progress bars for each item
   - Quality result popup with dice animation
   - Workshop indicator: "Crafting in Level 3 Smithy (+40% speed,
     +3 quality bonus)" or "No workshop available (slower, no bonus)"
   - Batch crafting UI: "Craft 5x Iron Ingots" with total time estimate

After all teammates complete and report back, verify the processing
chain works: a Miner's ore can be bought by a Smelter, smelted into
ingots, and those ingots appear in the Smelter's inventory ready to
be sold to a Blacksmith. Test cascading quality bonuses.
```

---

### PROMPT 12 — Finished Goods Crafting (Weapons, Armor, Gear)

```
You are the team lead. Use agent teams. Spawn a team of 5 teammates
to build all finished goods crafting — the final products players
actually use.

Context: These are the END of the crafting chain. Every item here
requires refined materials from processing professions. Items have
quality tiers (Poor through Legendary), durability that degrades
with use, and stats that matter in combat. Item demand is constant
because items break.

1. Teammate "weapon-recipes" — Create the full weapon recipe database:
   - BLACKSMITH weapons by tier (Apprentice through Grandmaster):
     Daggers, Swords, Longswords, Greatswords, Axes, Battleaxes,
     Maces, Warhammers, Halberds, Spears
   - Material tiers: Copper -> Iron -> Steel -> Mithril -> Adamantine
   - Each weapon has: base damage, damage type (slashing/piercing/bludgeoning),
     speed, required STR/DEX, durability, level requirement to equip
   - Higher material tier = better base stats
   - Quality multiplier on all stats (Poor 0.7x through Legendary 1.5x)
   - WOODWORKER/FLETCHER ranged weapons:
     Shortbow, Longbow, Crossbow, Elven Longbow
     + Arrows, Bolts, Throwing Knives (consumable ammo)
   - Store as typed recipe data with full ingredient lists and craft times

2. Teammate "armor-recipes" — Create the full armor recipe database:
   - ARMORER metal armor:
     Helmets, Chestplates, Gauntlets, Greaves, Shields
     Material tiers: Copper -> Iron -> Steel -> Mithril -> Adamantine
   - LEATHERWORKER leather armor:
     Leather Cap, Leather Vest, Leather Gloves, Leather Boots,
     Leather Bracers
     Material tiers: Soft Leather -> Hard Leather -> Studded -> Exotic -> Dragonscale
   - TAILOR cloth armor (robes for mages):
     Cloth Hood, Robes, Cloth Gloves, Cloth Boots, Cloak
     Material tiers: Cotton Cloth -> Linen -> Woven Wool -> Silk -> Enchanted Silk
   - Equipment slots: Head, Chest, Hands, Legs, Feet, Main Hand,
     Off Hand, Accessory 1, Accessory 2, Back (cloak)
   - Each armor piece has: AC bonus, stat bonuses, weight, durability,
     class restrictions, level requirement
   - Quality multiplier on AC and durability

3. Teammate "consumable-recipes" — Create all consumable item recipes:
   - ALCHEMIST potions:
     Minor/Standard/Greater/Supreme Healing Potion
     Minor/Standard/Greater/Supreme Mana Potion
     Potion of Strength, Dexterity, Intelligence, etc. (buff potions)
     Antidotes, Cure Poison, Cure Disease
     Poisons (applied to weapons — rogues love these)
     Fire Bomb, Smoke Bomb, Flash Bomb
   - COOK food (buff items):
     Bread, Rations (basic, cheap)
     Roast Meat, Fish Stew, Vegetable Soup (moderate buffs)
     Hearty Feast, Royal Banquet (party-wide buffs, expensive)
     Each food gives a specific buff for a real-time duration
   - BREWER drinks:
     Ale (cheap, small buff), Wine (moderate), Mead (good),
     Spirits (strong but penalties), Elven Wine (rare, excellent buffs)
   - SCRIBE scrolls:
     Spell Scrolls (single-use spells anyone can use)
     Maps (reveal hidden areas), Identification Scrolls
   - All consumables: single use, stack in inventory, have shelf life

4. Teammate "accessory-recipes" — Create accessory and housing recipes:
   - JEWELER accessories:
     Rings (stat bonuses), Necklaces (resistances),
     Circlets (mana bonuses), Brooches (special effects)
     Material tiers: Copper + Quartz -> Silver + Amethyst ->
     Gold + Ruby -> Mithril + Diamond
   - ENCHANTER enchantments (applied to existing finished items):
     Flaming (fire damage), Frost (cold damage),
     Lightning, Poisoned, Holy, Shadow
     Fortified (extra durability), Swift (attack speed),
     Warding (magic resistance)
     Requires: finished item + arcane reagents + specific gem
   - WOODWORKER/MASON housing items:
     Furniture: Bed, Table, Chairs, Storage Chest, Bookshelf,
     Weapon Rack, Armor Stand, Alchemy Table
     Building materials: Planks, Beams, Cut Stone, Bricks,
     Nails, Glass Panes
   - STABLE MASTER mount gear:
     Saddle, Horseshoes, Horse Armor, Saddlebags

5. Teammate "item-system-v2" — Rebuild the item system backend to
   support all of this:
   - Item model extended: quality tier, durability (current/max),
     crafted_by (player ID — maker's mark!), crafted_at, enchantments,
     stat bonuses calculated from base + material + quality + enchantment
   - Equipment system: equip/unequip items to character slots,
     validate class restrictions, calculate total stat bonuses
   - Durability system: items lose 1 durability per use (combat action,
     gathering action), break at 0, can be repaired by appropriate
     crafter for materials + gold
   - Repair API: POST /api/items/repair (crafter profession required,
     costs materials based on item)
   - Item comparison: GET /api/items/compare?equipped=X&candidate=Y
   - Full item stat calculation engine that accounts for:
     base stats + material tier + quality multiplier + enchantments +
     set bonuses (if we add item sets later)

After all teammates complete and report back, verify the FULL chain:
Miner mines ore -> Smelter makes ingots -> Blacksmith forges a sword ->
the sword has proper stats based on material and quality -> a player
equips it -> the sword affects their combat stats -> using it in combat
reduces durability -> at 0 durability it breaks. Test with at least
3 different crafting chains.
```

---

### PROMPT 13 — Player Housing & Buildings

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build the player housing and building construction system.

Context: Players can own buildings in towns — houses for personal
storage and decoration, and workshops/shops for their professions.
Buildings require construction materials crafted by players (Masons,
Woodworkers, etc.). Building ownership ties into the economy and
politics — mayors control building permits, and buildings generate
value for the town.

1. Teammate "housing-backend" — Build the housing and building system:
   - Building ownership model: player can own buildings in towns
   - Building types: House (Small/Medium/Large), Workshop (per profession),
     Shop (marketplace stall), Warehouse, Inn/Tavern
   - Construction system:
     * Player requests building permit from town (auto-approved or
       mayor-approved based on town law)
     * Player must supply all construction materials (planks, stone,
       nails, etc.) — deposited into a construction site
     * Construction takes real time (days) based on building size
     * Building levels 1-5, each upgrade requires more materials + time
   - House features:
     * Personal storage (scales with house size)
     * Display room (show off trophies, rare items)
     * Rest bonus (logging out in your house gives rested XP buff)
     * Roommate system (share house with guild members)
   - Workshop features:
     * Required for advanced crafting recipes
     * Workshop level affects crafting speed and quality bonus
     * Can be rented to other players for income
   - Shop features:
     * Persistent marketplace stall (items for sale even when offline)
     * Customizable shop name and display
   - API: full CRUD for buildings, construction start/progress/complete,
     upgrade, rent/lease system, storage management

2. Teammate "housing-frontend" — Build the housing UI:
   - "My Properties" page showing all owned buildings
   - Building interior view for houses (furniture placement grid)
   - Construction progress panel with material requirements checklist
     and timer
   - Workshop view showing crafting stations and bonuses
   - Shop management view for listing items
   - Town building directory (see all buildings, who owns what)
   - "Build New" flow: select lot -> choose building type ->
     see material requirements -> deposit materials -> start construction

3. Teammate "building-economy" — Wire buildings into the economy:
   - Property tax: building owners pay monthly tax to town treasury
     (set by mayor)
   - Rent system: workshop/shop owners can charge other players rent
     to use their facilities
   - Building maintenance: buildings slowly degrade and require
     materials to maintain (creates ongoing demand for construction materials)
   - Town capacity: each town has limited building lots (creates
     real estate scarcity and value)
   - Building destruction: buildings can be damaged in wars,
     require repair materials
   - Economic reports for mayors: which buildings generate most tax,
     occupancy rates, construction activity

After all teammates complete and report back, verify: a player can
request a building permit, supply construction materials, wait for
construction, enter their new house, store items, and a workshop owner
can rent their smithy to a Blacksmith who then gets crafting bonuses
from it. Verify property taxes flow to town treasury.
```

---

### PROMPT 14 — Trade Routes, Caravans & Merchant System

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build the inter-town trade and merchant system.

Context: Resources are geographically scarce — mountain towns have ore
but no grain, plains have grain but no ore. This creates natural trade
routes. The Merchant profession specializes in buying low in one town
and selling high in another, using trade caravans to move goods.

1. Teammate "caravan-system" — Build the trade caravan backend:
   - Caravan model: owner, origin town, destination town, cargo manifest,
     departure time, arrival time, escort slots, status
   - Starting a caravan:
     * Player loads cargo from inventory (weight/volume limits based
       on caravan size)
     * Caravan sizes: Handcart (cheap, small, slow), Wagon (medium),
       Large Wagon (expensive, large, moderate), Trade Convoy (very
       expensive, huge capacity, requires Merchant Lvl 50+)
     * Travel time based on distance between towns (same as player travel)
   - Caravan risks:
     * Random bandit ambush events during transit (PvE combat)
     * Enemy kingdom players can raid caravans during wartime (PvP)
     * Escorts: hire NPC guards (costs gold) or recruit player mercenaries
     * Cargo insurance (optional, costs % of cargo value, pays out on loss)
   - Arrival: cargo deposited in destination town, player can sell
     there on marketplace
   - API: POST /api/caravans/create, POST /api/caravans/load-cargo,
     POST /api/caravans/depart, GET /api/caravans/status,
     POST /api/caravans/hire-escort, event system for ambushes

2. Teammate "trade-analytics" — Build economic analytics and price system:
   - Price history tracking per item per town (every marketplace sale
     recorded with timestamp, price, quantity)
   - Price comparison across towns: GET /api/market/prices/:itemId
     (shows current average price in every town)
   - Trade route profitability calculator: input item + origin +
     destination -> shows price difference, transport cost, estimated
     profit margin
   - Town economic dashboard: most traded items, total trade volume,
     price trends (charts)
   - Supply/demand indicators per town: if an item is being bought
     faster than supplied, show "High Demand" badge
   - Merchant profession XP: earned from successful trades, scaled
     by profit margin and distance
   - Weekly/monthly economic reports for mayors

3. Teammate "trade-frontend" — Build the trade and merchant UI:
   - Trade route map overlay: show trade routes between towns with
     profit indicators (green = profitable, red = not worth it)
   - Caravan management page: create caravan, load cargo, track
     in-transit caravans, view history
   - Price comparison tool: select an item, see prices across all
     towns in a table/chart
   - "Best Trades" panel: AI-calculated suggestions for most
     profitable trade routes right now
   - Merchant dashboard: total trades, profit history, trade volume,
     reputation as a trader
   - Ambush event screen (if caravan is attacked): combat or pay
     ransom or flee (lose some cargo)

After all teammates complete and report back, verify the full trade
loop: a Merchant buys cheap Iron Ingots in a mountain town, loads
them into a caravan, sends it to a plains town where Iron is scarce,
sells at a markup, and earns profit + Merchant XP. Test the ambush
event system. Verify price tracking records all transactions.
```

---

## Phase 2B — Race Expansion (Prompts 15-18)

### PROMPT 15 — Race System Foundation (20 Races)

```
You are the team lead. Use agent teams. Spawn a team of 5 teammates
to build the expanded race system foundation for 20 playable races.

Context: Aethermere now has 20 playable races in 3 tiers:
- Core (7): Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn
- Common (6): Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk
- Exotic (7): Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling

Tiers affect starting conditions — Core races get 5-town homelands,
Common get 2-3 towns, Exotic get 1-2 towns or none (Changelings are nomadic).
Some races have sub-races chosen at character creation:
- Dragonborn -> Draconic Ancestry (Red/Blue/White/Black/Green/Gold/Silver)
- Beastfolk -> Animal Clan (Wolf/Bear/Fox/Hawk/Panther/Boar)
- Genasi -> Element (Fire/Water/Earth/Air)

1. Teammate "race-schema-v2" — Create the complete race schema in Prisma:
   - Race enum with all 20 races: HUMAN, ELF, DWARF, HALFLING, ORC,
     TIEFLING, DRAGONBORN, HALF_ELF, HALF_ORC, GNOME, MERFOLK,
     BEASTFOLK, FAEFOLK, GOLIATH, DROW, FIRBOLG, WARFORGED, GENASI,
     REVENANT, CHANGELING
   - RaceTier enum: CORE, COMMON, EXOTIC
   - SubRace model for races with sub-choices:
     * DraconicAncestry: RED, BLUE, WHITE, BLACK, GREEN, GOLD, SILVER
     * BeastClan: WOLF, BEAR, FOX, HAWK, PANTHER, BOAR
     * ElementalType: FIRE, WATER, EARTH, AIR
   - RacialAbility model: raceId, name, description, levelRequired,
     effectType, effectValue, cooldownSeconds, duration, isPassive,
     targetType (SELF, PARTY, ENEMY, AOE)
   - RacialRelation model: raceA, raceB, defaultRelation, currentRelation,
     modifiedAt, modifiedByPlayerId
   - RelationStatus enum: ALLIED, FRIENDLY, NEUTRAL, DISTRUSTFUL,
     HOSTILE, BLOOD_FEUD
   - ExclusiveZone model: raceId, zoneName, zoneType, resources[],
     accessLevel, dangerLevel
   - Update Character model: race, raceTier, subRace (nullable JSON
     for flexible sub-race storage), unlockedAbilities[],
     currentAppearanceRace (for Changelings)
   - CharacterAppearance model: for Changeling shape tracking
   - Run migration

2. Teammate "race-data-core" — Create data files for all 7 Core races
   in /shared/data/races/core/:
   - One file per race with FULL definitions:
     * name, tier, description, lore (2-3 paragraphs)
     * statModifiers: {STR, DEX, CON, INT, WIS, CHA}
     * trait: {name, description}
     * abilities: array of 6, each with {name, description, levelReq,
       type, effect, cooldown, duration, isPassive}
     * professionBonuses: map of professionType -> {speedBonus,
       qualityBonus, yieldBonus, xpBonus} (percentages)
     * gatheringBonuses: map of resourceType -> bonus% per biome
     * homelandRegion, startingTowns[]
   - Sub-race data for Dragonborn: 7 ancestries with element,
     breathShape, damageDice, resistance
   - All data as typed TypeScript constants with proper interfaces
   - Export a RaceRegistry map for easy lookup

3. Teammate "race-data-common-exotic" — Create data files for all
   13 Common + Exotic races in /shared/data/races/common/ and
   /shared/data/races/exotic/:
   - Same structure as Core races
   - Sub-race data for:
     * Beastfolk: 6 clans with bonusStat, specialPerk
     * Genasi: 4 elements with bonusStat, resistance, craftingBonuses
   - Special mechanics flags per race:
     * Merfolk: {hasUnderwaterAccess: true, landSpeedPenalty: 0.85}
     * Drow: {hasUnderdarkAccess: true, sunlightPenalty: true}
     * Faefolk: {hasFeywildAccess: true, canFly: true, fragile: true}
     * Warforged: {noFood: true, noSleep: true, needsMaintenance: true}
     * Revenant: {reducedDeathPenalty: 0.5, fasterRespawn: 0.5}
     * Changeling: {canShapeshift: true, noHometown: true}
     * Goliath: {doubleCarryCapacity: true, coldImmune: true}
     * Firbolg: {canTalkToAnimals: true, canTalkToPlants: true}
   - Exclusive resource zone definitions per exotic race
   - All typed TypeScript constants

4. Teammate "race-backend-v2" — Build the expanded race API:
   - GET /api/races — list all 20 races grouped by tier
   - GET /api/races/:race — full race details including abilities,
     bonuses, lore, sub-races if applicable
   - GET /api/races/:race/subraces — get sub-race options
   - Racial bonus calculator service: given race + subrace +
     professionType + currentTown + currentBiome -> compute all
     active bonuses (speed, yield, quality, XP, trade modifiers)
   - Special mechanic handlers:
     * Changeling appearance manager: POST /api/race/changeling/shift
       (change appearance), GET /api/race/changeling/trueform
     * Warforged maintenance tracker: GET /api/race/warforged/maintenance
       (days since last maintenance, current degradation)
     * Merfolk zone access: GET /api/race/merfolk/underwater-nodes
       (list available underwater resource nodes)
   - Character creation integration: apply stat modifiers, sub-race
     bonuses, set starting town (Changeling picks any town),
     flag special mechanics
   - GET /api/relations/matrix — full 20x20 racial relations matrix
   - Racial ability use: POST /api/abilities/racial/use with proper
     cooldown tracking and effect application

5. Teammate "race-frontend-v2" — Build the expanded race selection UI:
   - Character creation race browser:
     * 3 tabs: Core, Common, Exotic (with "Recommended for new players"
       on Core, "Experienced players" badge on Exotic)
     * Race card grid with portrait, name, tier badge, homeland
     * Click a race to expand: full lore panel, stat display with
       +/- indicators, trait highlight, ability preview (greyed
       with level requirements), profession affinity chart,
       homeland map highlight
     * Sub-race selection step for Dragonborn/Beastfolk/Genasi:
       visual selector with each option's unique bonuses
     * Special mechanic warnings for exotic races:
       "Warforged don't eat but need maintenance"
       "Changelings have no hometown — you'll start wherever you choose"
       "Drow suffer penalties in sunlight"
     * Starting town selector: Core races start in homeland capital
       by default, Changelings pick any town, others start in
       their racial territory
   - Race comparison tool: select 2-3 races side-by-side, compare
     stats, abilities, profession bonuses
   - In-game race info page on character sheet: current abilities
     (locked/unlocked), active racial bonuses for current location,
     racial relations affecting you

After all teammates complete and report back, verify: every race can
be selected at character creation, sub-races work for Dragonborn/
Beastfolk/Genasi, stat modifiers apply correctly, Changeling can
start in any town, Warforged gets flagged for maintenance tracking,
and the racial bonus calculator properly handles all 20 races.
Give me a full summary and flag any balance concerns.
```

---

### PROMPT 16 — World Map V2 (68 Towns, All Regions)

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the complete world with 68 towns across all regions.

Context: The world now has 21 distinct regions/territories housing
20 races plus a neutral zone. 68 total towns ranging from 5-town
Core race capitals to single-settlement Exotic race outposts. Each
town has resources based on its biome. Some races have exclusive
resource zones (Underdark, Deep Ocean, Feywild, Elemental Rifts, etc).

Refer to the full town list in the race design document for all 68
towns with their types, specialties, and populations.

1. Teammate "world-seed-v2" — Create the COMPLETE world seed data:
   - All 68 towns with: name, region, controllingRace, biomeType,
     coordinates (x,y on world map), population, prosperityLevel,
     description, specialty, availableBuildings[]
   - All resources per town with abundance levels (1-5)
   - All travel routes between connected towns:
     * Within-region routes (short: 15-30 min)
     * Cross-region routes (medium: 30-60 min)
     * Long-distance routes (60-120 min)
     * Each route: distance, travelTimeMinutes, dangerLevel, terrainType
   - Region definitions: name, controllingRace, biomeType, borders[],
     description, lore, dangerLevel
   - Border definitions between all adjacent regions with default
     status based on racial relations
   - Exclusive resource zones: 11 zones (one per exotic race +
     Dwarven deep mines + Dragonborn lairs)
   - Starting NPC officials for each town
   - Create comprehensive seed script

2. Teammate "exclusive-zones" — Build the exclusive zone access system:
   - ExclusiveZone backend:
     * Each zone has: owning race, required level, entry requirements,
       available resources, danger level, special mechanics
     * Zones: Deep Ocean (Merfolk), Underdark (Drow), Feywild (Faefolk Lvl40),
       Sky Peaks (Goliath), Deepwood Groves (Firbolg), Foundry Core (Warforged),
       Elemental Rifts x4 (Genasi by element), Ashenmoor Deadlands (Revenant),
       Deep Thornwilds (Beastfolk), Dragon Lairs (Dragonborn), Deep Mines (Dwarf)
   - Access rules:
     * Native race: free entry
     * Other races: need expensive magical gear (crafted by appropriate
       races — creating MORE trade dependencies):
       - Underwater Breathing Helm (Enchanter + Alchemist) for Deep Ocean
       - Darkvision Goggles + Underdark Survival Kit for Underdark
       - Fey Compass (Enchanter Lvl 60+) for Feywild
       - Elemental Protection Amulet for Elemental Rifts
       - Altitude Elixir for Sky Peaks
       - etc.
   - API: GET /api/zones/exclusive — list all exclusive zones
     GET /api/zones/:id/access?playerId=X — check if player can enter
     POST /api/zones/:id/enter — enter zone (validate access)
   - Exclusive resources only gatherable inside these zones
   - Resource data seeded for all exclusive zones

3. Teammate "world-map-v3" — Build the massive world map frontend:
   - Full continent map of Aethermere showing ALL regions
   - Regions color-coded by controlling race with race emblems
   - All 68 towns as icons (size scaled by population tier):
     * Capital: large castle icon
     * Major town: medium building icon
     * Small settlement: small hut icon
     * Underwater (Merfolk): bubble/coral icon
     * Underground (Drow/Dwarf deep): cavern icon
     * Floating/treetop (Elf/Faefolk): elevated icon
   - Town icons styled by type: pickaxe for mining, wheat for farming,
     anchor for coastal, sword for military, etc.
   - Region borders with color coding:
     * Green: Allied
     * Blue: Friendly
     * Grey: Neutral
     * Yellow: Distrustful
     * Orange: Hostile
     * Red: Blood Feud / Active War
   - Travel routes shown as paths between connected towns
   - Exclusive zones shown as special overlay areas with race emblem
     and lock icon (unlocked if player has access)
   - Interactive features:
     * Zoom levels: continent -> region -> town detail
     * Click region: show race info, towns list, resources, relations
     * Click town: show full info panel, "Travel Here" button
     * Click exclusive zone: show access requirements, resources available
     * Player location marker
     * Other players visible as dots in their towns (if not hidden)
   - Mini-map in HUD showing current region
   - Visual style: hand-drawn fantasy parchment map with illustrated
     terrain features

4. Teammate "region-mechanics-v2" — Build expanded regional mechanics:
   - Racial majority tracker per town (live calculation of player demographics)
   - Bonus/penalty calculator based on race vs town majority:
     * Same race majority: +10% all profession bonuses
     * Friendly race majority: no penalty
     * Neutral: no bonus or penalty
     * Distrustful: -5% yields, NPCs charge 10% more
     * Hostile: -10% yields, NPCs charge 25% more, guard harassment events
     * Blood Feud: -15% yields, 50% tariff, may be refused service,
       risk of PvP flagging near border
   - Border crossing system integrated with travel:
     * Check racial relation when crossing between regions
     * Apply tariffs to carried trade goods
     * Trigger border encounters for hostile/blood feud crossings
   - Changeling exception: no racial penalties anywhere (they blend in)
   - Merfolk land/water transition: speed changes when entering/leaving
     water-adjacent towns
   - Drow sunlight tracking: apply penalties during daytime surface
     activities, remove during nighttime or underground
   - Day/night cycle integration for Drow sunlight sensitivity
   - API endpoints for all regional calculations

After all teammates complete and report back, verify: the full 68-town
world renders on the map, exclusive zones are shown, a player can
travel between towns with proper border checks, racial majority
bonuses apply, Drow penalties apply in sunlight, and Merfolk can
access underwater nodes. Summary of all integration points needed.
```

---

### PROMPT 17 — Racial Diplomacy V2 (20-Race Relations)

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build the diplomacy system for 20 races.

Context: With 20 races, the diplomacy matrix is 20x20 (190 unique
pairings). Most start at Neutral, but there are significant
predefined relationships: Dwarf-Orc Blood Feud, Elf-Faefolk-Firbolg
Alliance, Outcast solidarity (Tiefling-Drow-Revenant-Changeling
Friendly), Crafter alliance (Dwarf-Gnome-Warforged), etc. Players
can shift these over time through political actions.

Use the complete 20x20 racial relations matrix from the design
document as the starting state.

1. Teammate "diplomacy-engine-v2" — Build the expanded diplomacy backend:
   - Seed the full 20x20 relations matrix (190 unique pairings) with
     default values from the design document
   - Diplomatic action system for kingdom/region rulers:
     * PROPOSE_TREATY: improve relations one step (needs other side approval)
     * DECLARE_WAR: worsen relations (unilateral)
     * TRADE_AGREEMENT: reduce tariffs between two kingdoms
     * NON_AGGRESSION_PACT: prevent PvP between kingdoms' players
     * ALLIANCE: full military alliance (requires FRIENDLY+ status)
     * BREAK_TREATY: cancel agreement (reputation penalty)
   - Relation change requirements scale with how deep the change is:
     * BLOOD_FEUD -> HOSTILE: 15,000 gold + 10 real days + both agree + zero PvP incidents
     * HOSTILE -> DISTRUSTFUL: 8,000 gold + 7 days
     * DISTRUSTFUL -> NEUTRAL: 3,000 gold + 4 days
     * NEUTRAL -> FRIENDLY: 5,000 gold + 5 days
     * FRIENDLY -> ALLIED: 10,000 gold + 10 days + active trade agreement 14+ days
     * Worsening is always instant and free
   - Exotic race diplomacy: exotic races with only 1-2 towns can
     still participate in diplomacy through their regional leader
   - Changeling special: Changelings can serve as neutral diplomatic
     intermediaries, reducing treaty costs by 20%
   - War system: declaration, war score (PvP kills, raids, territory),
     peace negotiation, reparations
   - Treaty history log: permanent record of all diplomatic actions
   - API: full diplomacy CRUD + war management + treaty history

2. Teammate "diplomacy-events-v2" — Build the world events system:
   - Global announcement system for diplomatic events:
     * War declarations, peace treaties, alliance formations
     * Border status changes, trade agreement signings
     * Formatted as in-game "Herald" messages with flavor text
   - War bulletin board during active conflicts
   - Diplomatic reputation per kingdom (treaty-keepers vs oathbreakers)
   - Monthly "State of Aethermere" report: all current relations,
     active treaties, ongoing wars, recent changes
   - Citizen petition system: players can petition their ruler for
     specific diplomatic actions (threshold of signatures triggers
     ruler notification)
   - Integration with notification/socket system for real-time alerts

3. Teammate "diplomacy-frontend-v2" — Build the diplomacy UI:
   - World Diplomacy overlay on the map:
     * Color-coded borders between all 21 regions
     * Active treaty icons, war indicators (crossed swords)
     * Click between two regions for full diplomatic history
   - Diplomacy panel for rulers: propose treaties, respond to proposals,
     manage wars, view active agreements
   - Diplomacy panel for citizens: view current relations, active
     treaties/wars, petition system, diplomatic history timeline
   - War dashboard: war score, battle log, enlist button for war quests
   - 20x20 relations matrix view: interactive grid showing all
     racial relationships with color coding, click any cell for details
   - Changeling diplomat bonus indicator when applicable

After all teammates complete and report back, verify: the full 20x20
matrix is seeded correctly, rulers can propose and accept treaties,
war can be declared and tracked, border statuses update based on
relations, and the diplomacy map overlay reflects current state.
Test changing Dwarf-Orc relations from Blood Feud toward Hostile
to verify the full process works.
```

---

### PROMPT 18 — All 20 Race Abilities in Combat & Professions

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates
to integrate ALL 20 races' abilities into combat and profession systems.

Context: Each race has 6 abilities (120 total abilities across 20 races).
Some are combat (Orc's Blood Fury, Dragonborn's Breath Weapon), some
affect professions (Dwarf's Master Forger, Gnome's Efficient Engineering),
and some are utility (Halfling's Luck, Changeling's shapeshifting).
All need to work in the actual game systems.

1. Teammate "combat-abilities-all" — Implement ALL combat-relevant
   racial abilities across 20 races:

   This includes (but is not limited to):
   - Human: Rally the People (party buff), Indomitable Will (save reroll)
   - Elf: Elven Accuracy (ranged advantage), Spirit Walk (invisibility)
   - Dwarf: Dwarven Resilience (poison resist), Ancestral Fury (low HP buff)
   - Halfling: Halfling Luck (d20 reroll)
   - Orc: Intimidating Presence, Relentless Endurance, Blood Fury, Orcish Rampage
   - Tiefling: Hellish Resistance, Infernal Rebuke, Soul Bargain
   - Dragonborn: Breath Weapon (7 elements), Draconic Scales, Frightful Presence, Ancient Wrath
   - Half-Elf: Fey Ancestry (charm immune), Inspiring Presence
   - Half-Orc: Savage Attacks (extra crit die), Unstoppable Force
   - Gnome: Gnome Cunning (magic save advantage)
   - Merfolk: Tidal Healing, Call of the Deep (water elemental), Tsunami Strike
   - Beastfolk: Natural Weapons, Beast Form (transformation), Alpha's Howl,
     Apex Predator, plus 6 clan-specific perks
   - Faefolk: Flutter (flying), Wild Magic Surge, Nature's Wrath (entangle)
   - Goliath: Stone's Endurance, Earthshaker (AoE prone), Titan's Grip
   - Drow: Drow Magic (darkness), Poison Mastery, Shadow Step, Dominate
   - Firbolg: Hidden Step, Druidic Magic buffs, Guardian Form (treant)
   - Warforged: Integrated Armor, Self-Repair, Siege Mode
   - Genasi: Elemental Cantrip, Elemental Burst (4 element variants),
     Primordial Awakening (elemental form)
   - Revenant: Life Drain, Undying Fortitude, Army of the Dead
   - Changeling: Unsettling Visage, Thousand Faces (combat shifting)

   Each ability needs: activation trigger, effect calculation,
   duration/cooldown tracking, combat log entry, interaction with
   existing combat engine (turn order, damage calculation, status effects)

2. Teammate "profession-abilities-all" — Integrate ALL profession-
   affecting racial bonuses for 20 races:

   Hook into existing gathering yield calculator:
   - Human +10% farming in Heartlands, +5% all craft speed
   - Elf +25% herbalism forests, +20% enchanting quality
   - Dwarf +30% mining mountains, +25% smithing quality, +20% smelting
   - Halfling +25% cooking, +20% brewing/trade, +15% farming, +10% gather speed
   - Orc +30% hunting, +20% tanning/leatherworking
   - Tiefling +30% alchemy, +25% herbalism swamps, +20% enchanting
   - Dragonborn +20% mining volcanic, +20% smelting
   - Half-Elf +20% one chosen profession
   - Half-Orc +20% hunting, +15% smithing/tanning
   - Gnome +15% tinker quality, +10% craft speed, +10% fewer materials
   - Merfolk +40% fishing, +30% pearl/coral, -15% land gathering
   - Beastfolk +35% hunting, +25% tanning, -20% enchanting
   - Faefolk +35% enchanting, +30% herbalism, -25% physical crafting
   - Goliath +35% extreme mining, +25% masonry, -20% finesse crafting
   - Drow +30% alchemy (poison), +25% spider-silk tailoring, -10% daytime
   - Firbolg +40% herbalism, +30% farming, -25% mining/building
   - Warforged +25% smelting, +25% craft speed, -30% cooking, -20% herbalism
   - Genasi per-element crafting bonuses (Fire->smelting, Water->alchemy, etc.)
   - Revenant +25% death-herbs, +15% mining (no air needed), -25% cooking
   - Changeling +30% merchant, +25% courier, +20% innkeeper

   Also implement special profession mechanics:
   - Human Adaptable Crafter: allow 4th profession slot
   - Gnome Efficient Engineering: 10% material reduction
   - Gnome Eureka Moment: instant craft completion
   - Warforged Overclock: double craft speed temporarily
   - Warforged Tireless Worker: 50% more queue slots

3. Teammate "special-mechanics" — Build the unique mechanics for
   exotic races:

   CHANGELING SHAPESHIFTING:
   - Can change visible race at will (cosmetic + NPC interaction)
   - Level 10: fools racial detection (treated as displayed race for tariffs/penalties)
   - Level 15: can copy specific player's appearance
   - Level 25: Veil Network access (spy intelligence marketplace)
   - Track true race vs displayed race, handle edge cases

   WARFORGED MAINTENANCE:
   - No food/rest needed (save gold on food, no inn costs)
   - Maintenance system: need Repair Kit every 7 days
   - Without maintenance: -1% all stats per day overdue
   - Repair Kits crafted by Blacksmith (Metal Ingots + Arcane Components)
   - Self-Repair ability: partial heal without kits

   MERFOLK AMPHIBIOUS:
   - 3x movement speed in water zones
   - 85% movement speed on land
   - Access underwater resource nodes exclusively
   - Water-adjacent town bonus: can fish from anywhere

   DROW SUNLIGHT SENSITIVITY:
   - Day/night cycle tracking (or simplified: surface vs underground)
   - Daytime surface: -2 attack, -2 perception
   - Nighttime or underground: no penalty
   - Incentivizes nocturnal play pattern or underground living

   FAEFOLK FLIGHT:
   - Can bypass ground-level obstacles
   - Dodge ground traps in combat
   - Cross water/gaps without bridge
   - Can't fly while carrying heavy loads

   REVENANT REDUCED DEATH:
   - Death penalty halved (gold loss, XP loss, durability loss)
   - Respawn timer halved
   - Makes them ideal for dangerous/experimental content

   API endpoints for each special mechanic

4. Teammate "racial-frontend-v2" — Build the complete racial ability UI:
   - Character sheet Racial Abilities tab:
     * All 6 abilities displayed, locked/unlocked by level
     * Active abilities have "Use" button with cooldown timer
     * Passive abilities show as always-on buff icons
     * Sub-race abilities highlighted (clan perks, element perks)
   - Combat integration:
     * Racial abilities in combat action menu
     * Breath weapon targeting overlay (cone/line based on ancestry)
     * Beast Form transformation animation
     * Dragonborn elemental glow on portrait
     * Changeling mid-combat shift visual
   - Profession integration:
     * Show racial bonuses as line items in crafting preview
     * Gathering UI shows racial yield bonus
     * Warforged maintenance indicator in HUD
     * Merfolk water/land speed indicator
     * Drow sunlight warning indicator
   - Level-up racial ability unlock celebration screen
   - Special mechanic HUD elements:
     * Changeling: current appearance indicator + "True Form" toggle
     * Warforged: maintenance status bar
     * Drow: sun/shade indicator
     * Merfolk: water proximity indicator

After all teammates complete and report back, test at LEAST one race
from each tier through both combat and crafting:
- Core: test Dragonborn Breath Weapon (Red vs Blue ancestry) in combat
- Common: test Gnome Efficient Engineering reducing craft materials
- Exotic: test Changeling shapeshifting fooling a merchant NPC in
  a Distrustful town, test Warforged maintenance degradation
Give me a full status report and flag any abilities that seem
over/underpowered.
```
