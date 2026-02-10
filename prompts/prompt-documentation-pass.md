# Prompt — Full Documentation Audit & Game Guide
# Dependencies: All prompts 00-08 complete
# Teammates: 6
# This audits the entire codebase, fills documentation gaps,
# and creates a comprehensive player game guide.
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

The entire Realm of Crowns codebase is built. Every system is implemented.
Now I need you to do a full documentation pass — audit everything,
fill in missing docs, update existing docs, create an API reference,
and write a detailed player-facing game guide.

Read CLAUDE.md first for project context. Then use agent teams.
Spawn a team of 6 teammates:


# ═══════════════════════════════════════
# TEAMMATE 1: "code-auditor"
# ═══════════════════════════════════════

Your job is to audit the ENTIRE codebase and produce a complete
inventory of what exists. Read every route file, page file, component,
service, engine, job, socket handler, seed file, and shared data file.

Create docs/CODE_INVENTORY.md containing:

## 1. API Endpoints
Read every file in server/src/routes/ and document EVERY endpoint:
- HTTP method + path
- Auth required? (yes/no)
- Request body/params (from Zod schemas or inline validation)
- Response shape
- Brief description of what it does

Organize by route group:
- Auth (/api/auth/*)
- Characters (/api/characters/*)
- World (/api/world/*)
- Towns (/api/towns/*)
- Travel (/api/travel/*)
- Market (/api/market/*)
- Work (/api/work/*)
- Crafting (/api/crafting/*)
- Combat PvE (/api/combat/pve/*)
- Combat PvP (/api/combat/pvp/*)
- Elections (/api/elections/*)
- Governance (/api/governance/*)
- Guilds (/api/guilds/*)
- Messages (/api/messages/*)
- Friends (/api/friends/*)
- Notifications (/api/notifications/*)
- Quests (/api/quests/*)
- Skills (/api/skills/*)

## 2. Socket.io Events
Read server/src/socket/ and document every event:
- Event name, direction (client→server or server→client), payload shape

## 3. Client Pages
Read every file in client/src/pages/ and document:
- Route path, page name, what it displays, key interactions

## 4. Client Components
Read client/src/components/ (all subdirectories) and list every component:
- Component name, what it renders, key props

## 5. Server Services & Engines
Read server/src/services/ and server/src/engines/ and document each:
- File name, what logic it contains, what routes use it

## 6. Cron Jobs
Read server/src/jobs/ and document:
- Job name, schedule, what it does

## 7. Database Models
Read database/prisma/schema.prisma and list every model with:
- Model name, key fields, relationships to other models

## 8. Shared Data Files
Read shared/src/data/ and document:
- What data exists (races, professions, recipes, resources, items,
  world, skills, quests, achievements)
- How many entries in each category

## 9. Middleware
Read server/src/middleware/ and document each middleware.

## 10. Missing or Incomplete Items
Flag anything that looks incomplete:
- Empty .gitkeep-only directories
- Placeholder/stub files
- Routes that reference missing services
- TODO comments in the code
- Any broken imports or references


# ═══════════════════════════════════════
# TEAMMATE 2: "api-doc-writer"
# ═══════════════════════════════════════

After teammate 1 finishes the inventory (or in parallel — read the route
files yourself), create a full API reference document.

Create docs/API_REFERENCE.md containing:

Start with an overview section explaining:
- Base URL: http://localhost:4000/api
- Authentication: Bearer token in Authorization header
- Error format: { error: string, details?: any }
- Rate limiting: 100 requests per 15 minutes

Then for EVERY endpoint in every route file, document it in this format:

```
### POST /api/auth/register
Create a new player account.

**Auth Required:** No

**Request Body:**
| Field    | Type   | Required | Validation           |
|----------|--------|----------|----------------------|
| email    | string | yes      | Valid email format    |
| username | string | yes      | 3-20 chars, alphanum  |
| password | string | yes      | Min 8 characters      |

**Success Response (201):**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "clx...",
    "email": "hero@example.com",
    "username": "HeroName"
  }
}
```

**Error Responses:**
- 400: Validation error (invalid email, short password, etc.)
- 409: Email or username already exists
```

Do this for EVERY single endpoint. Read the actual route handler code
to get the exact validation rules, response shapes, and error cases.
Don't guess — read the code.

Group endpoints by system:
1. Authentication
2. Characters
3. World & Navigation
4. Economy (Market + Work + Crafting)
5. Combat (PvE + PvP)
6. Politics (Elections + Governance)
7. Social (Guilds + Messages + Friends + Notifications)
8. Quests & Progression (Quests + Skills)


# ═══════════════════════════════════════
# TEAMMATE 3: "design-doc-updater"
# ═══════════════════════════════════════

Audit and update all existing design documents, and create any missing ones.

## Update existing docs:
Read the actual code implementation, then compare with the design docs.
Update each doc to reflect what was ACTUALLY built (not what was planned):

1. **docs/RACES.md** — Verify all 20 races match the data in
   shared/src/data/races/. Update any abilities, stats, or bonuses
   that were adjusted during implementation.

2. **docs/ECONOMY.md** — Verify professions, recipes, and crafting chains
   match what's in shared/src/data/professions/, recipes/, and resources/.
   Update with any changes made during implementation.

3. **docs/WORLD_MAP.md** — Verify regions and towns match
   shared/src/data/world/ and database/seeds/world.ts.
   Update town counts, region details, travel routes.

## Create missing docs:

4. **docs/COMBAT.md** — Read server/src/routes/combat-pve.ts,
   combat-pvp.ts, and any combat engine/service files. Document:
   - How combat initiates (PvE encounters, PvP challenges)
   - Turn structure and initiative system
   - Attack rolls, damage calculation, AC
   - Spell/ability system
   - Status effects
   - Death, respawn, and penalties
   - Monster encounter system
   - PvP rules (duels, arena)
   - War system (if implemented)
   - Racial abilities in combat
   - XP and loot rewards

5. **docs/POLITICS.md** — Read server/src/routes/elections.ts,
   governance.ts, and server/src/jobs/election-lifecycle.ts,
   law-expiration.ts, tax-collection.ts. Document:
   - Election system (mayor, ruler, guild leader)
   - Election lifecycle (nomination, campaigning, voting, results)
   - Governance powers (what mayors/rulers can do)
   - Law system (proposal, voting, enactment, effects)
   - Tax system (rates, collection, treasury)
   - Kingdom management
   - Diplomacy between kingdoms/races
   - How racial relations affect governance

6. **docs/SOCIAL.md** — Read guilds.ts, messages.ts, friends.ts,
   notifications.ts, and socket handlers. Document:
   - Guild creation, management, ranks, treasury
   - Messaging system (channels, whispers, guild chat)
   - Friends system (add, remove, online status)
   - Notification system (types, real-time delivery)
   - Chat system (Socket.io events)
   - Player profiles and search

7. **docs/QUESTS.md** — Read quests.ts, skills.ts,
   server/src/services/quest-triggers.ts, progression.ts,
   and shared/src/data/quests/ and skills/. Document:
   - Quest types (main, town, daily, guild, bounty, racial)
   - Quest structure (objectives, rewards, chains)
   - How quests are accepted, tracked, completed
   - Skill tree system (per-class trees)
   - XP and leveling system
   - Achievement system
   - Level-up rewards and unlocks

## Update CLAUDE.md:
Update the root CLAUDE.md to reflect the COMPLETED state of the project.
It should list all implemented systems, all route groups, all client pages,
and accurately describe what's been built. Remove any "planned" or "future"
language for systems that are now done.

## Update docs/PROMPT_QUEUE.md:
Mark ALL prompts 00-08 as ✅ Complete.


# ═══════════════════════════════════════
# TEAMMATE 4: "architecture-doc-writer"
# ═══════════════════════════════════════

Create docs/ARCHITECTURE.md — a comprehensive technical architecture
document. Read the actual codebase structure and document:

## 1. System Architecture Overview
- High-level diagram (ASCII art) showing: Client ↔ API Server ↔ Database
  with Socket.io and Redis connections
- Request/response flow from browser to database and back
- Real-time event flow (Socket.io)

## 2. Frontend Architecture
- React + Vite + TypeScript setup
- Routing structure (every route and which page it loads)
- State management approach (Zustand stores? React Query? Context?)
- Component organization pattern
- How auth state is managed
- How real-time updates are handled (Socket.io client)
- Styling approach (Tailwind + theme)

## 3. Backend Architecture
- Express app structure
- Middleware pipeline (order matters — document it)
- Route → Service → Database pattern
- Authentication flow (JWT lifecycle)
- Validation approach (Zod middleware)
- Error handling pattern
- How Socket.io is integrated with Express

## 4. Database Architecture
- Prisma ORM usage patterns
- Key model relationships (ERD in ASCII art or description)
- How migrations are managed
- Seeding strategy
- Index strategy

## 5. Shared Package
- What lives in shared/ and why
- How client and server both import from shared
- TypeScript path alias configuration

## 6. Real-Time System
- Socket.io event catalog
- How presence tracking works
- Chat system architecture
- How game notifications are pushed

## 7. Cron Job System
- What jobs run on schedule
- How election lifecycle works
- Tax collection timing
- Law expiration logic

## 8. Caching Strategy
- What Redis is used for
- Cache key naming conventions
- Cache invalidation approach

## 9. Security
- JWT token structure and validation
- Password hashing approach
- Rate limiting configuration
- CORS configuration
- Input validation strategy

## 10. Development Workflow
- How to start the dev environment
- How to run migrations
- How to seed the database
- How to add a new route/feature
- File naming conventions
- TypeScript configuration


# ═══════════════════════════════════════
# TEAMMATE 5: "game-guide-writer"
# ═══════════════════════════════════════

This is the BIG one. Create docs/GAME_GUIDE.md — a comprehensive,
detailed, player-facing guide that explains EVERY aspect of gameplay.

Read ALL route files, ALL shared data files, ALL design docs, and the
Prisma schema to understand every system. Then write a guide that a
brand new player could read to understand the entire game.

The tone should be immersive and engaging — like a real game manual,
not dry technical documentation. Use the game's fantasy flavor.
Include tips, strategies, and examples throughout.

Structure:

## Part 1: Welcome to the Realm
- What is Realm of Crowns? (overview, what makes it unique)
- Your first steps (register, create character, enter the world)
- The game world at a glance (what you can do)
- Key concepts every player needs to know:
  * Real-time actions (things take real-world time)
  * Player-driven economy (everything is crafted by players)
  * 3-profession limit (you NEED other players)
  * Racial identity matters (bonuses, zones, diplomacy)
  * Politics are real (elected leaders make real decisions)

## Part 2: Choosing Your Identity
- The 20 Races of Aethermere
  * For EACH race: 1-2 paragraph description, stat table,
    racial trait, standout abilities, recommended playstyle,
    starting towns, profession recommendations
  * Organize by tier with clear guidance on difficulty:
    - Core Races (recommended for new players): Human, Elf, Dwarf,
      Halfling, Orc, Tiefling, Dragonborn
    - Common Races (moderate complexity): Half-Elf, Half-Orc, Gnome,
      Merfolk, Beastfolk, Faefolk
    - Exotic Races (hard mode — unique mechanics): Goliath, Drow,
      Firbolg, Warforged, Genasi, Revenant, Changeling
  * Sub-race guide: Dragonborn ancestries, Beastfolk clans, Genasi elements
  * "Which race should I pick?" decision flowchart/guide
- The 6 Classes
  * For each: description, primary stats, HP/MP, playstyle, role in parties
  * Warrior, Mage, Rogue, Cleric, Ranger, Bard
  * Skill trees overview per class (read shared/src/data/skills/)
- Character Stats Explained
  * STR, DEX, CON, INT, WIS, CHA — what each does
  * How stats affect combat, crafting, gathering, social interactions
  * Derived stats: HP, MP, AC, Initiative, Carry Capacity

## Part 3: The World of Aethermere
- World overview and geography
  * The major regions and their characteristics
  * Biome types and what resources they contain
- Towns — your home base
  * What you can do in a town (work, craft, trade, rest, govern)
  * Town facilities (market, town hall, workshops, inn, etc.)
  * Town prosperity and how player activity affects it
- Travel system
  * How travel works (real-time, route-based)
  * Travel times between regions
  * Border crossings and racial relations affecting access
  * Dangers on the road
- Exclusive Zones
  * What they are and which races can access them
  * Resources unique to each zone
  * How non-native races can gain access (expensive gear)
  * List all 11 zones with what they contain

## Part 4: Making a Living — The Economy
- Professions overview
  * The 3-profession limit and why it matters
  * Gathering professions (7): what each gathers and where
  * Crafting professions (14): what each creates
  * Service professions (7): what each provides
  * Profession leveling: Apprentice → Grandmaster (levels 1-100)
- Gathering guide
  * How gathering works (pick a resource node, wait, collect)
  * Gathering times and yield factors
  * Tool quality affects results
  * Racial bonuses for gathering
  * Where to find each resource type
- Crafting guide
  * How crafting works (select recipe, provide materials, wait)
  * The quality roll: d20 + level/5 + tool + workshop + racial bonus
  * Quality tiers: Poor → Common → Fine → Superior → Masterwork → Legendary
  * How quality affects item stats and durability
  * Workshop bonuses
  * Example crafting chains (trace a sword from ore to finished weapon)
- The Marketplace
  * How to list items for sale
  * How to buy items
  * How prices work (pure supply and demand)
  * Regional price differences (why trade between towns matters)
  * Tax on transactions
- Item Durability
  * Weapons: 100 uses, Armor: 150 uses, Tools: 50 uses
  * Quality multipliers on durability
  * Why this drives the economy (constant demand)
  * Repair options (if any)
- Money and the Economy
  * How gold enters the economy (quest rewards, NPC bounties)
  * How gold leaves (taxes, fees, durability/replacement)
  * Treasury system and town funding
  * Tips for making gold as a new player

## Part 5: Combat
- Combat basics
  * How to encounter enemies (PvE)
  * Turn-based combat explained
  * Initiative and turn order
  * The attack roll: d20 + modifier vs AC
  * Damage rolls by weapon type
  * Critical hits (natural 20)
  * Missing (natural 1)
- Abilities and spells
  * How abilities work (racial + class)
  * Spell slots and mana system
  * Cooldowns on racial abilities
- PvE combat
  * Monster types and where to find them
  * Dungeon encounters
  * Loot and XP rewards
  * Death penalty (and how Revenants have it easier)
- PvP combat
  * Duels — how to challenge another player
  * Arena system
  * Rules and restrictions
  * Rewards
- Combat strategies
  * Tank/healer/DPS roles
  * When to use racial abilities
  * Class-specific combat tips

## Part 6: Leveling & Progression
- XP and leveling
  * How XP is earned (combat, quests, crafting, gathering)
  * XP curve (gets harder at higher levels)
  * Level cap
- Skill trees
  * How skill points are earned
  * Overview of each class's skill tree
  * Recommended builds for each class
- Racial ability unlocks
  * Abilities unlock at levels 1, 5, 10, 15, 25, 40
  * Why level 15 and 25 are major milestones
  * Notable game-changing abilities per race
- Achievements
  * Types of achievements
  * Rewards for completing achievements
- Quest system
  * Quest types: Main story, Town, Daily, Guild, Bounty, Racial
  * How to find and accept quests
  * Quest chains and storylines
  * Rewards

## Part 7: Politics & Power
- The political system
  * Why politics matter (real gameplay effects)
  * Town mayors — what they control
  * Kingdom rulers — what they control
- Elections
  * How to run for office
  * Nomination period
  * Campaigning
  * Voting (who can vote, how it works)
  * Terms and re-election
- Governance powers
  * Setting tax rates
  * Proposing and passing laws
  * Law effects on gameplay
  * Treasury management
  * Town improvements
- Diplomacy
  * Racial relations matrix explained
  * How relations affect tariffs, border access, NPC behavior
  * Treaties, alliances, and trade agreements
  * War — how it starts, how it's fought, how it ends
  * How players can influence diplomatic relations
  * The cost and time to change relations

## Part 8: Social Systems
- Guilds
  * Creating a guild
  * Guild ranks and permissions
  * Guild treasury
  * Guild quests
  * Benefits of guild membership
- Communication
  * Chat channels (global, town, guild, party, whisper, trade)
  * Messaging system
  * How to find other players
- Friends system
  * Adding friends, online status, quick messaging
- Player profiles
  * What others can see about you
  * Reputation and public achievements

## Part 9: Racial Deep Dives
For each of the 7 exotic races, write a detailed strategy guide:
- **Changeling**: How shapeshifting works, spy gameplay, social
  manipulation strategies, the Veil's Network, starting with no hometown
- **Warforged**: Maintenance system explained, how to manage Repair Kits,
  tireless crafting advantages, Overclock risk/reward
- **Merfolk**: Underwater economy monopoly, land speed penalty management,
  Deep Ocean exclusive resources, amphibious lifestyle
- **Drow**: Sunlight Sensitivity and how to work around it, Underdark
  exclusive resources, poison crafting specialty, nocturnal playstyle
- **Faefolk**: Flight advantages, fragile stats management, Feywild
  Gateway at Lvl40, wild magic gameplay
- **Revenant**: Death-defying dungeon strategies, reduced death penalty,
  Army of the Dead at Lvl40, necrotic resistance advantages
- **Firbolg**: Nature's Bounty gathering supremacy, druidic magic,
  Deepwood Grove exclusive resources, Guardian Form at Lvl40
- **Goliath**: Double carry capacity strategies, wielding 2H weapons
  in 1 hand, Sky Peaks exclusive zone, tank build guide

## Part 10: Tips, Tricks & Strategies
- New player checklist (first day, first week, first month)
- Best starting races for different playstyles:
  * Crafter: Dwarf, Gnome, Warforged
  * Fighter: Orc, Dragonborn, Goliath
  * Trader: Halfling, Changeling, Human
  * Politician: Human, Half-Elf, Tiefling
  * Explorer: Beastfolk, Ranger, Faefolk
  * Solo player: Human (4th profession), Warforged (tireless)
- Best profession combos (which 3 to pick)
- How to make gold fast as a new player
- Understanding the racial economy (who needs what from whom)
- Common mistakes to avoid
- Advanced strategies for experienced players

## Appendices
- A: Complete stat modifier table (all 20 races)
- B: All racial abilities reference table (120 abilities)
- C: Profession quick reference (all 28 with what they do)
- D: Complete town list (all 68 towns with region and specialty)
- E: Exclusive zone resource table
- F: Racial relations matrix (20x20 summary)
- G: Quality tier thresholds and effects
- H: XP curve table
- I: Glossary of game terms

This guide should be THOROUGH. We're talking 3000-5000 lines of
content. Read the actual code and data files to get precise numbers,
not estimates. Every stat, every ability, every recipe chain should
be accurate to what's implemented.


# ═══════════════════════════════════════
# TEAMMATE 6: "readme-updater"
# ═══════════════════════════════════════

Update the project's public-facing files to reflect the completed state:

1. **README.md** — Rewrite with:
   - Project description (what the game IS, not what it will be)
   - Screenshot placeholder sections
   - Feature list (every system that's built)
   - Tech stack
   - Quick start instructions
   - Link to docs/GAME_GUIDE.md for gameplay
   - Link to docs/API_REFERENCE.md for developers
   - Link to docs/ARCHITECTURE.md for contributors
   - Project structure overview
   - Contributing guidelines (basic)
   - License placeholder

2. **CLAUDE.md** — If teammate 3 hasn't updated it, update it now.
   Make sure it accurately lists every implemented system, every route
   group, every client page, and every shared data file. This file is
   what Claude Code reads for context, so it must be accurate.

3. **docs/CHANGELOG.md** — Create a changelog documenting what was
   built in each prompt phase:
   - Bootstrap: Project scaffold, configs, dependencies
   - Prompt 00: Infrastructure + Auth + Character Creation
   - Prompt 01: (if separate from 00)
   - Prompt 02: World & Navigation
   - Prompt 03: Economy & Trading
   - Prompt 04: Combat System
   - Prompt 05: Political System
   - Prompt 06: Social & Guilds
   - Prompt 07: Quests & Progression
   - Prompt 08: Polish & Testing
   - Azure Setup: Cloud infrastructure
   - Documentation Pass: This prompt (full docs + game guide)


# ═══════════════════════════════════════
# AFTER ALL 6 TEAMMATES COMPLETE
# ═══════════════════════════════════════

Give me a full summary:

1. List every document that was created or updated
2. Total line count of docs/GAME_GUIDE.md
3. Total number of API endpoints documented
4. Total number of Socket.io events documented
5. Any incomplete areas or gaps found during the audit
6. Any code issues discovered (broken imports, TODOs, stubs)
7. Confirmation that all docs are consistent with the actual codebase
