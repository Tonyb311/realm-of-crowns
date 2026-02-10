# Claude Code Agent Team Prompts
## Project: Realm of Crowns — A Fantasy Kingdom MMORPG

> A D&D-inspired, browser-based MMORPG inspired by Renaissance Kingdoms, featuring player-driven economies, politics, combat, magic, races, and classes.

---

## 🔧 PROMPT 0 — Project Bootstrap (Run First)

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

## 🔧 PROMPT 1 — Authentication & Player System

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

## 🔧 PROMPT 2 — World, Towns & Navigation

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

## 🔧 PROMPT 3 — Economy, Crafting & Trading

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
work → gather resources → craft items → sell on market → earn gold. 
Verify the full economic cycle works end-to-end.
```

---

## 🔧 PROMPT 4 — Combat System

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
   - Death at 0 HP → player respawns in town with penalties 
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

## 🔧 PROMPT 5 — Political System & Governance

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates 
to build the political and governance system:

1. Teammate "election-system" — Build elections backend in /server:
   - Town Mayor elections: any resident can run, all residents vote
   - Kingdom Ruler elections: only mayors can run, all citizens vote
   - Election cycle: nominations open → campaigning period → voting → results
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

## 🔧 PROMPT 6 — Social, Guilds & Real-Time

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

## 🔧 PROMPT 7 — Quest System & Progression

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

## 🔧 PROMPT 8 — Polish, Testing & Deployment

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

## 📋 CLAUDE.md — Project Context File

Save this as `CLAUDE.md` in your project root so Claude Code always has context:

```markdown
# Realm of Crowns — Project Context

## What Is This?
A browser-based fantasy MMORPG inspired by Renaissance Kingdoms, reimagined with 
D&D-style mechanics (races, classes, dice-based combat, magic, skill trees).

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma ORM
- Real-time: Socket.io
- Cache: Redis
- Auth: JWT + bcrypt
- Validation: Zod
- Testing: Jest + Supertest
- Deployment: Docker Compose

## Core Systems
1. **Auth & Characters** — Registration, login, character creation with race/class
2. **World & Navigation** — Kingdom map, towns, real-time travel
3. **Economy** — Resource gathering, crafting, player marketplace, taxes
4. **Combat** — Turn-based D&D-style PvE and PvP with dice rolls
5. **Politics** — Elections, laws, governance, diplomacy, war
6. **Social** — Guilds, messaging, real-time chat, presence
7. **Quests & Progression** — Quest journal, XP/leveling, skill trees, achievements

## Architecture
- /client — React frontend (Vite)
- /server — Express API server
- /shared — Shared TypeScript types and constants
- /database — Prisma schema, migrations, seed data
- /docs — Game design document, architecture docs

## Key Design Principles
- Real-time actions (travel, crafting, work take real-world time)
- Player-driven economy (no NPC price fixing, supply/demand)
- Player-driven politics (elected mayors and rulers with real power)
- D&D mechanics (d20 rolls, ability scores, AC, spell slots)
- Fantasy aesthetic (dark parchment UI, medieval fonts, gold accents)
```

---

## 💡 Tips for Using These Prompts

1. **Run Prompt 0 first** — it sets up the project structure everything else depends on
2. **Run prompts 1-7 in order** — each builds on the previous
3. **Prompt 8 is for polish** — run it last
4. **Between prompts**, review what was built and fix any issues before moving on
5. **Customize freely** — add/remove races, classes, features as you like
6. **The CLAUDE.md file** should live in your repo root so Claude Code always has context
7. **Each prompt is designed to produce ~4-8 hours of parallel agent work** — 
   expect to iterate and fix issues after each phase
