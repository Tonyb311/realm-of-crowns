# Realm of Crowns

A browser-based fantasy MMORPG set in the world of Aethermere, featuring 20 playable races, 28 professions, a fully player-driven economy, D&D-style turn-based combat, democratic governance, and real-time social systems. Built as a modern full-stack TypeScript application.

<!-- Screenshots -->
<!-- ![World Map](docs/screenshots/world-map.png) -->
<!-- ![Character Creation](docs/screenshots/character-creation.png) -->
<!-- ![Combat](docs/screenshots/combat.png) -->
<!-- ![Marketplace](docs/screenshots/marketplace.png) -->

## Features

### 20 Playable Races
Seven core races (Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn), six common races (Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk), and seven exotic races (Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling). Sub-races include Dragonborn ancestries, Beastfolk clans, and Genasi elements. Each race has unique stat modifiers, 6 racial abilities unlocked at levels 1/5/10/15/25/40, profession bonuses, and exclusive resource zones. 120 racial abilities total.

### Player-Driven Economy
No NPC-created items -- every sword, potion, and meal is player-crafted. 28 professions across gathering (7), crafting (15), and service (7) categories, each with 100 levels and 6 mastery tiers (Apprentice through Grandmaster). Item quality from Poor to Legendary is determined by a d20 roll plus modifiers. Item durability creates constant replacement demand. Free-market player marketplace with supply/demand pricing, town taxes, and price history tracking.

### D&D-Style Combat
Turn-based combat with initiative rolls (d20 + DEX), attack rolls vs AC, damage dice by weapon type, critical hits, spell slots, and status effects. PvE encounters with level-appropriate monsters, multi-room dungeons with bosses, and loot tables. PvP duels with wager system, arena rankings, and anti-grief protections. Death incurs gold loss, XP loss, and equipment damage.

### Democratic Governance
Elected town mayors set tax rates, build infrastructure, appoint officials, and manage treasuries. Kingdom rulers declare war or peace, pass kingdom-wide laws, and negotiate treaties. Full election lifecycle with nominations, campaigning, and voting periods. Laws have real gameplay effects on trade fees, military funding, and item access.

### Social Systems
Real-time chat via Socket.io (town, kingdom, guild, private channels). Guild creation with officer ranks, shared treasury, cooperative quests, and guild halls. Friends list with online status. Player profiles, search, and reputation tracking. Notification system for political events, combat results, trade completions, and more.

### Quest System and Progression
Main story, town, daily, guild, bounty, and racial quest types. Quest chains with multi-objective tracking. XP from combat, quests, crafting, and gathering feeds into a leveling system with stat allocation, ability unlocks, and skill trees. Six class specializations per class (e.g., Warrior: Berserker / Guardian / Warlord). Achievement system with milestone rewards.

### World of Aethermere
68 towns across 21 territories spanning 8 major regions. Resource distribution by biome drives inter-regional trade. Real-time travel between towns. 11 exclusive resource zones accessible only by specific races. 20x20 racial diplomacy matrix affects tariffs, border access, and NPC behavior. Players can shift diplomatic relations through sustained effort.

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
| Deployment | Docker Compose, Nginx, GitHub Actions CI |
| Cloud | Azure PostgreSQL Flexible Server, Azure Cache for Redis (optional) |

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

### Game Design Documents

| Document | Description |
|---|---|
| [Races](docs/RACES.md) | All 20 races with stats, abilities, lore, and sub-races |
| [Economy](docs/ECONOMY.md) | 28 professions, crafting chains, marketplace mechanics |
| [World Map](docs/WORLD_MAP.md) | 8 regions, 68 towns, geography, travel routes |
| [Combat](docs/COMBAT.md) | Turn-based combat, PvE encounters, PvP duels |
| [Politics](docs/POLITICS.md) | Elections, governance, laws, diplomacy |
| [Social](docs/SOCIAL.md) | Guilds, messaging, friends, notifications |
| [Quests](docs/QUESTS.md) | Quest types, progression, skill trees, achievements |

## Project Structure

```
realm-of-crowns/
  client/              React + Vite frontend
    src/
      components/      UI components organized by system
      pages/           18 page components (login, world map, combat, etc.)
      context/         Auth context provider
      stores/          Zustand state stores
  server/              Express + Socket.io backend
    src/
      routes/          20 route files (auth, combat, economy, politics, etc.)
      services/        Business logic (achievements, progression, quest triggers)
      middleware/      Auth guard, Redis cache, Zod validation
      socket/          Chat handlers, presence tracking, real-time events
      jobs/            Cron jobs (elections, tax collection, law expiration)
      __tests__/       Integration tests (auth, combat, economy, politics, etc.)
  shared/              Shared types, constants, and game data
    src/
      data/            Typed game data (20 races, 28 professions, recipes, etc.)
      types/           Shared TypeScript interfaces
  database/            Prisma schema, migrations, and seed data
    prisma/            Schema and migrations
    seeds/             Database seed scripts
  docs/                Game design and technical documentation
  prompts/             Development phase prompts
  scripts/             Utility scripts (setup.sh)
  .github/workflows/   CI/CD pipeline (ci.yml)
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

### Production

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

### Azure (Optional)

The project supports Azure PostgreSQL Flexible Server and Azure Cache for Redis as an alternative to local Docker containers. See `prompts/phase1/prompt-azure-setup.md` for setup instructions. Update `.env` with Azure connection strings.

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

## License

This project is not yet licensed. A license will be added before public release.
