# Realm of Crowns

A browser-based fantasy MMORPG set in the world of Aethermere. 20 playable races, 29 professions, 68 towns, a fully player-driven economy, D&D-style turn-based combat, democratic governance, racial diplomacy, trade caravans, player housing, and real-time social systems. Built as a modern full-stack TypeScript monorepo.

<!-- Screenshots -->
<!-- ![World Map](docs/screenshots/world-map.png) -->
<!-- ![Character Creation](docs/screenshots/character-creation.png) -->
<!-- ![Combat](docs/screenshots/combat.png) -->
<!-- ![Marketplace](docs/screenshots/marketplace.png) -->

## Features

### 20 Playable Races
Seven core races (Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn), six common races (Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk), and seven exotic races (Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling). Sub-races include Dragonborn ancestries, Beastfolk clans, and Genasi elements. Each race has unique stat modifiers, 6 racial abilities unlocked at levels 1/5/10/15/25/40 (Nightborne has 7), profession bonuses, and exclusive resource zones. 121 racial abilities total with full combat and profession integration.

### Player-Driven Economy
No NPC-created items -- every sword, potion, and meal is player-crafted. 29 professions across gathering (7), crafting (15), and service (7) categories, each with 100 levels and 6 mastery tiers (Apprentice through Grandmaster). Complete multi-step crafting chains: miners produce ore, smelters refine it into ingots, blacksmiths forge weapons, enchanters add magical effects. Item quality from Poor to Legendary determined by a d20 roll plus modifiers. Item durability (weapons 100 uses, armor 150, tools 50) creates constant replacement demand. Free-market player marketplace with supply/demand pricing, town taxes, and price history tracking.

### Gathering and Resource System
Seven gathering professions harvest raw materials from biome-specific resource nodes. Real-time gathering with timers, d20-based quality rolls, tool bonuses, and town abundance levels. Resource depletion and regeneration cycles. 60+ distinct raw resources across ores, woods, grains, herbs, animal products, fish, and stone categories.

### Processing and Crafting Chains
Full intermediate processing layer: smelters refine ores into ingots, tanners cure leather, tailors spin cloth, masons cut stone, woodworkers mill planks. Cascading quality system where fine ingredients improve final product quality. Batch crafting queues. Workshop bonuses from player-built buildings. Hundreds of recipes spanning weapons, armor, consumables, accessories, enchantments, furniture, and mount gear.

### Player Housing and Buildings
Players own houses, workshops, and shops in towns. Construction requires player-crafted materials (planks, stone, nails) and real-time build timers. Buildings level 1-5 with upgrades. Houses provide personal storage and rested XP buffs. Workshops grant crafting speed and quality bonuses. Shops enable persistent offline sales. Property tax flows to town treasury. Building maintenance and town lot scarcity create a real estate economy.

### Trade Routes and Caravans
Geographic resource scarcity drives inter-town trade. Merchants load cargo into caravans (handcart, wagon, large wagon, trade convoy) and ship goods between towns. Bandit ambush events during transit. Caravan escorts and cargo insurance. Per-item per-town price history tracking, cross-town price comparison, trade route profitability calculator, and supply/demand indicators. Merchant profession XP earned from profitable trades.

### D&D-Style Combat
Turn-based combat with initiative rolls (d20 + DEX), attack rolls vs AC, damage dice by weapon type, critical hits, spell slots, and status effects. 121 racial abilities integrated into the combat engine (Dragonborn breath weapons, Orc blood fury, Changeling mid-combat shifting, Beastfolk beast form, and more). PvE encounters with level-appropriate monsters, multi-room dungeons with bosses, and loot tables. PvP duels with wager system, arena rankings, and anti-grief protections. Death penalties: 5% gold loss, 15 x level XP loss, 5 durability damage to equipped gear (Revenants get half).

### Democratic Governance
Elected town mayors set tax rates, build infrastructure, appoint officials, and manage treasuries. Kingdom rulers declare war or peace, pass kingdom-wide laws, and negotiate treaties. Full election lifecycle with nominations, campaigning, and voting periods. Laws have real gameplay effects on trade fees, military funding, and item access. Citizen petition system to influence diplomatic decisions.

### Racial Diplomacy
Full 20x20 racial relations matrix (190 unique pairings) with six relation tiers: Allied, Friendly, Neutral, Distrustful, Hostile, Blood Feud. Relations affect tariffs, border access, NPC prices, and guard behavior. Rulers can propose treaties, declare war, form alliances, and sign trade agreements. Changing relations costs gold, time, and sustained effort. War system with war score, battle tracking, and peace negotiation. Herald announcements for diplomatic events. Monthly "State of Aethermere" reports.

### 11 Exclusive Resource Zones
Race-locked zones with unique resources: Deep Ocean (Merfolk), Underdark (Drow), Feywild (Faefolk), Sky Peaks (Goliath), Deepwood Groves (Firbolg), Foundry Core (Warforged), Elemental Rifts (Genasi), Ashenmoor Deadlands (Revenant), Deep Thornwilds (Beastfolk), Dragon Lairs (Dragonborn), Deep Mines (Dwarf). Non-native races can gain access through expensive crafted gear, creating additional trade dependencies.

### Exotic Race Special Mechanics
Changeling shapeshifting (change visible race, fool NPCs, copy player appearances). Warforged maintenance system (no food needed but requires Repair Kits every 7 days). Merfolk amphibious movement (3x water speed, 85% land speed, underwater resource access). Drow sunlight sensitivity (day/night cycle penalties). Faefolk flight (bypass ground obstacles, dodge traps). Revenant reduced death penalties (half gold/XP loss, half respawn timer). Goliath double carry capacity. Firbolg animal/plant communication.

### Social Systems
Real-time chat via Socket.io (town, kingdom, guild, private, trade channels). Guild creation with officer ranks, shared treasury, cooperative quests, and guild halls. Friends list with online status. Player profiles, search, and reputation tracking. Notification system for political events, combat results, trade completions, and more.

### Quest System and Progression
Main story, town, recurring (72h cooldown), guild, and bounty quest types -- 49 quests total. Quest chains with multi-objective tracking. XP from combat, quests, crafting, and gathering feeds into a leveling system (XP per level: `floor(10 * level^1.15) + 30`) with stat allocation, ability unlocks, and skill trees. Seven classes (Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion) with 3 specializations each (21 total). 27 achievements with milestone rewards. Daily action economy: 1 major action per day (Work or Travel) paces progression deliberately.

### World of Aethermere
68 towns across 21 territories spanning 8 major regions. Resource distribution by biome drives inter-regional trade. Real-time travel between towns with border crossing checks, racial tariffs, and danger encounters. Interactive zoomable fantasy map with region overlays, town icons by type, travel routes, and diplomatic border coloring.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Query, Framer Motion |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Database | PostgreSQL 15, Prisma ORM |
| Cache | Redis 7 |
| Auth | JWT (jsonwebtoken), bcrypt |
| Validation | Zod (shared between client and server) |
| Testing | Jest, Supertest |
| Deployment | Docker Compose (local), Azure Container Apps (production), Nginx, GitHub Actions CI |
| Cloud | Azure Container Apps (eastus), Azure PostgreSQL Flexible Server, Azure Cache for Redis, ACR (rocregistry.azurecr.io) |

## Quick Start

### Prerequisites

- **Node.js** 20+
- **npm** 9+
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)

### Option A: Full Docker (production-like)

```bash
docker compose up --build
```

Open http://localhost. The client runs on port 80 (Nginx), the server on port 4000.

### Option B: Local Development (recommended)

```bash
# Run the automated setup script:
./scripts/setup.sh

# Or do it manually:
cp .env.example .env
npm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
npx prisma migrate deploy --schema=database/prisma/schema.prisma
npm run db:seed
npm run dev
```

Client: http://localhost:3000
Server: http://localhost:4000
Prisma Studio: `npm run db:studio`

## Documentation

| Document | Description |
|---|---|
| [Game Guide](docs/GAME_GUIDE.md) | Comprehensive player-facing guide covering all gameplay systems |
| [API Reference](docs/API_REFERENCE.md) | Full REST API and Socket.io event documentation |
| [Architecture](docs/ARCHITECTURE.md) | Technical architecture, data flow, and system design |
| [Changelog](docs/CHANGELOG.md) | What was built in each development phase |
| [Code Inventory](docs/CODE_INVENTORY.md) | Complete audit of every file, endpoint, component, and model |

### Game Design Documents

| Document | Description |
|---|---|
| [Races](docs/RACES.md) | All 20 races with stats, abilities, lore, and sub-races |
| [Economy](docs/ECONOMY.md) | 29 professions, crafting chains, marketplace mechanics |
| [World Map](docs/WORLD_MAP.md) | 8 regions, 21 territories, 68 towns, geography, travel routes |
| [Combat](docs/COMBAT.md) | Turn-based combat, PvE encounters, PvP duels, racial abilities |
| [Politics](docs/POLITICS.md) | Elections, governance, laws, diplomacy, war system |
| [Social](docs/SOCIAL.md) | Guilds, messaging, friends, notifications |
| [Quests](docs/QUESTS.md) | Quest types, progression, skill trees, achievements |
| [Daily Action Rebalance](docs/DAILY_ACTION_REBALANCE.md) | Daily action economy rebalance design |
| [Rebalance Checklist](docs/REBALANCE_INTEGRATION_CHECKLIST.md) | Rebalance implementation checklist |

## Project Structure

```
realm-of-crowns/
  client/                React + Vite frontend
    src/
      components/        60+ UI components organized by system
        auth/            Login/register forms
        character/       Character creation wizard
        combat/          Battle screen, action menus, dice rolls
        crafting/        Recipe browser, craft queue, quality results
        daily-actions/   Daily action dashboard
        diplomacy/       Relations matrix, treaty panels, war dashboard
        economy/         Price charts, trade analytics
        food/            Food buff system
        gathering/       Resource nodes, gathering progress
        guilds/          Guild management, treasury, ranks
        housing/         Building construction, property management
        hud/             Main game HUD overlay
        inventory/       Item grid, equipment slots
        map/             Interactive world map with zoom
        messaging/       Chat panel, message compose
        politics/        Election booth, governance panels
        professions/     Profession browser, XP progress
        quests/          Quest journal, objective tracking
        races/           Race browser, comparison tool
        racial-abilities/ Ability cards, cooldown timers
        social/          Friends list, player search
        town/            Town dashboard, building directory
        trade/           Caravan management, price comparison
        travel/          Travel progress, route selection
        ui/              18 Realm* primitives + utility components (ErrorBoundary, ProtectedRoute, etc.)
        layout/          6 layout components (GameShell, HudBar, Sidebar, BottomNav, PageHeader, PageLoader)
      context/           Auth context provider
      hooks/             Custom React hooks (useSocket, useApi, useAuth)
      pages/             26 game pages + 9 admin pages (35 total)
        admin/           Admin dashboard, users, characters, economy, world, error logs, simulation, content release
      services/          API client, socket client, utility services
      App.tsx            Root component with routing
      main.tsx           React 18 entry point
  server/                Express + Socket.io backend
    src/
      routes/            40 game route files + 12 admin route files (52 total)
      services/          31 service modules (combat abilities, racial bonuses, etc.)
      middleware/        6 middleware modules (auth, cache, validation, daily-action, admin, character-guard)
      socket/            4 socket modules (chat, events, presence, middleware)
      jobs/              18 cron jobs (elections, taxes, caravans, maintenance, travel-tick, etc.)
      lib/               5 library modules (prisma, redis, combat-engine, game-day, alt-guard)
      __tests__/         8 integration test suites
  shared/                Shared types, constants, and game data
    src/
      data/
        races/           20 race definition files (core/common/exotic)
        professions/     29 profession definitions, XP curves, tiers
        recipes/         15 recipe files (weapons, armor, consumables, etc.)
        resources/       8 resource category files (ores, woods, herbs, etc.)
        skills/          8 skill tree files (7 classes + types)
        quests/          5 quest category files + types
        tools/           Tool tier definitions
        buildings/       Building requirements data
        caravans/        Caravan type definitions
        items/           Item data
        world/           World/region/town definitions
        achievements.ts  Achievement definitions
        progression/     XP curves, level-up rewards
      types/             Shared TypeScript interfaces
  database/              Prisma schema, migrations, and seed data
    prisma/              Schema and migrations
    seeds/               Database seed scripts
  docs/                  Game design and technical documentation
  prompts/               Development phase prompts (19 prompts across 3 phases)
  scripts/               Utility scripts (setup.sh)
  .github/workflows/     CI/CD pipeline (ci.yml)
```

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client and server in dev mode with hot-reload |
| `npm run dev:client` | Start only the Vite dev server |
| `npm run dev:server` | Start only the Express server (tsx watch) |
| `npm run build` | Build all workspaces for production |
| `npm run test` | Run server integration tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database with game data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | Reset database (drop + migrate + seed) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://roc_user:roc_password@localhost:5432/realm_of_crowns` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | *(change in production)* | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration |
| `PORT` | `4000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `CLIENT_URL` | `http://localhost:3000` | Client origin for CORS |

## Docker

### Local Production-Like

```bash
docker compose up --build
```

This starts four services:
- **postgres** (port 5432) -- PostgreSQL 15 with persistent volume
- **redis** (port 6379) -- Redis 7 with persistent volume
- **server** (port 4000) -- Node.js Express server
- **client** (port 80) -- Nginx serving the React build, proxying `/api` and `/socket.io` to the server

### Development

```bash
# Start only database and cache containers:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Run the app locally for hot-reload:
npm run dev
```

### Production (Azure Container Apps)

The live deployment runs on Azure Container Apps in East US:
- **Container App:** `realm-of-crowns` in `roc-env` (0.5 CPU / 1GB RAM)
- **Container Registry:** `rocregistry.azurecr.io` (built via `az acr build`)
- **PostgreSQL:** Azure Flexible Server (`roc-db-server`, Standard_B1ms, v15)
- **Redis:** Azure Cache for Redis (`roc-redis-cache`, Basic C0)
- **Live URL:** https://realm-of-crowns.ambitioustree-37a1315e.eastus.azurecontainerapps.io

Docker images are built with `az acr build --no-logs` (avoids Windows Unicode crash). The `server/Dockerfile` builds both client (Vite) and server (tsc). Alpine requires `apk add --no-cache openssl` for Prisma.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes to main/master and on pull requests:

1. **Type Check** -- TypeScript compilation check for all workspaces
2. **Test** -- Runs server integration tests with PostgreSQL and Redis service containers
3. **Build** -- Builds all workspaces
4. **Docker Build** -- Builds server and client Docker images

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run the dev environment (`npm run dev`) and verify changes work
4. Run tests (`npm run test`) and type checking (`npm run typecheck`)
5. Commit your changes and open a pull request

### Adding a New Feature

1. Define shared types/constants in `shared/src/`
2. Add Prisma models in `database/prisma/schema.prisma` and run `npm run db:migrate`
3. Create route handlers in `server/src/routes/`
4. Add business logic in `server/src/services/`
5. Build UI pages in `client/src/pages/` and components in `client/src/components/`
6. Write integration tests in `server/src/__tests__/`

### Code Conventions

- All game data lives in `shared/src/data/` as typed TypeScript constants -- never hardcode game values in server or client
- Zod validation on all API endpoints
- Route handlers delegate to services for business logic
- Socket.io events for all real-time updates
- Tailwind CSS with Arcane-inspired design system: `realm-*` tokens (realm-bg, realm-gold, realm-bronze, realm-teal, realm-purple), Cinzel (display) + Inter (body) typography, Realm* UI components

## License

This project is not yet licensed. A license will be added before public release.
