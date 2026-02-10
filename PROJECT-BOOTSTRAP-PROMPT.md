# ═══════════════════════════════════════════════════════════════════
# REALM OF CROWNS — PROJECT BOOTSTRAP PROMPT
# ═══════════════════════════════════════════════════════════════════
#
# HOW TO USE THIS:
#
# Step 1: Create a new empty folder called "realm-of-crowns"
# Step 2: Inside it, create a folder called "design-docs"
# Step 3: Place ALL of these files into design-docs/:
#
#    design-docs/
#    ├── claude-code-game-prompts.md        (Phase 1 prompts 0-8)
#    ├── economy-design-document.md          (Economy system design)
#    ├── economy-prompts-phase2.md           (Economy prompts 9-14)
#    ├── expanded-races-complete.md          (20-race compendium)
#    ├── expanded-races-prompts.md           (Race prompts 15-18)
#    ├── races-and-regions-design.md         (Original 7-race + regions)
#    └── races-regions-prompts.md            (Original race prompts)
#
# Step 4: Open Claude Code in the "realm-of-crowns" folder
# Step 5: Paste EVERYTHING below this line into Claude Code
#
# ═══════════════════════════════════════════════════════════════════


You are the team lead for "Realm of Crowns" — a browser-based fantasy MMORPG.
All of the game design documents already exist in the ./design-docs/ folder.
Your job is to read those documents, then scaffold the entire project and
organize everything so development can begin.

Use agent teams. Spawn a team of 6 teammates to do this in parallel.

IMPORTANT: The design documents in ./design-docs/ are the GAME BIBLE.
Every teammate MUST read the relevant documents before doing their work.
Do NOT invent or improvise game content — use what's in the documents.


# ═══════════════════════════
# TEAMMATE 1: "folder-builder"
# ═══════════════════════════

Create the complete monorepo folder structure. Create every directory
and placeholder file listed below. For empty directories, add a .gitkeep file.

```
realm-of-crowns/
│
├── client/
│   ├── public/
│   │   └── assets/
│   │       ├── images/.gitkeep
│   │       ├── icons/.gitkeep
│   │       ├── fonts/.gitkeep
│   │       └── sounds/.gitkeep
│   └── src/
│       ├── components/
│       │   ├── auth/.gitkeep
│       │   ├── character/.gitkeep
│       │   ├── combat/.gitkeep
│       │   ├── crafting/.gitkeep
│       │   ├── diplomacy/.gitkeep
│       │   ├── economy/.gitkeep
│       │   ├── gathering/.gitkeep
│       │   ├── guilds/.gitkeep
│       │   ├── housing/.gitkeep
│       │   ├── hud/.gitkeep
│       │   ├── inventory/.gitkeep
│       │   ├── map/.gitkeep
│       │   ├── messaging/.gitkeep
│       │   ├── politics/.gitkeep
│       │   ├── professions/.gitkeep
│       │   ├── quests/.gitkeep
│       │   ├── races/.gitkeep
│       │   ├── social/.gitkeep
│       │   ├── town/.gitkeep
│       │   └── ui/.gitkeep
│       ├── context/.gitkeep
│       ├── hooks/.gitkeep
│       ├── pages/.gitkeep
│       ├── services/.gitkeep
│       ├── styles/.gitkeep
│       ├── types/.gitkeep
│       └── utils/.gitkeep
│
├── server/
│   └── src/
│       ├── routes/.gitkeep
│       ├── services/.gitkeep
│       ├── engines/.gitkeep
│       ├── middleware/.gitkeep
│       ├── socket/.gitkeep
│       ├── jobs/.gitkeep
│       ├── types/.gitkeep
│       └── utils/.gitkeep
│
├── shared/
│   └── src/
│       ├── types/.gitkeep
│       ├── constants/.gitkeep
│       ├── utils/.gitkeep
│       └── data/
│           ├── races/
│           │   ├── core/.gitkeep
│           │   ├── common/.gitkeep
│           │   └── exotic/.gitkeep
│           ├── professions/.gitkeep
│           ├── recipes/.gitkeep
│           ├── resources/.gitkeep
│           ├── items/.gitkeep
│           └── world/.gitkeep
│
├── database/
│   ├── prisma/
│   │   └── migrations/.gitkeep
│   └── seeds/.gitkeep
│
├── docs/
│
└── prompts/
    ├── phase1/
    ├── phase2-economy/
    └── phase2-races/
```

Create ALL directories. Confirm every path exists when done.


# ═══════════════════════════
# TEAMMATE 2: "config-builder"
# ═══════════════════════════

Create all configuration and infrastructure files:

### Root package.json
```json
{
  "name": "realm-of-crowns",
  "version": "0.1.0",
  "private": true,
  "description": "A browser-based fantasy MMORPG with 20 races, player-driven economy and politics",
  "workspaces": [
    "client",
    "server",
    "shared",
    "database"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "build": "npm run build --workspace=shared && npm run build --workspace=client && npm run build --workspace=server",
    "db:migrate": "npm run migrate --workspace=database",
    "db:seed": "npm run seed --workspace=database",
    "db:studio": "npm run studio --workspace=database",
    "db:reset": "npm run reset --workspace=database",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "typescript": "^5.4.0"
  }
}
```

### client/package.json
```json
{
  "name": "@realm-of-crowns/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "axios": "^1.7.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.50.0",
    "framer-motion": "^11.2.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.3.0"
  }
}
```

### server/package.json
```json
{
  "name": "@realm-of-crowns/server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.19.0",
    "@prisma/client": "^5.15.0",
    "socket.io": "^4.7.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.3.0",
    "node-cron": "^3.0.3",
    "ioredis": "^5.4.0",
    "dotenv": "^16.4.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/cors": "^2.8.0",
    "@types/node": "^20.14.0",
    "@types/node-cron": "^3.0.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.0"
  }
}
```

### shared/package.json
```json
{
  "name": "@realm-of-crowns/shared",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

### database/package.json
```json
{
  "name": "@realm-of-crowns/database",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "migrate": "prisma migrate dev",
    "generate": "prisma generate",
    "seed": "tsx seeds/index.ts",
    "studio": "prisma studio",
    "reset": "prisma migrate reset"
  },
  "dependencies": {
    "@prisma/client": "^5.15.0"
  },
  "devDependencies": {
    "prisma": "^5.15.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.0"
  }
}
```

### TypeScript configs

**Root tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**client/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/src/*"],
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

**server/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/src/*"],
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

**shared/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src"]
}
```

**database/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/src/*"]
    }
  },
  "include": ["seeds", "prisma"]
}
```

### Vite config — client/vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
```

### Tailwind config — client/tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark fantasy parchment theme
        primary: {
          50: '#FDF8E8',
          100: '#F5EBCB',
          200: '#E8D49A',
          300: '#D4BA6A',
          400: '#C9A461',  // Main gold
          500: '#B8913A',
          600: '#9A7830',
          700: '#7C5F26',
          800: '#5E471C',
          900: '#402F12',
        },
        dark: {
          50: '#4A4A6E',
          100: '#3D3D5C',
          200: '#33334E',
          300: '#2D2D44',  // Surface
          400: '#252538',
          500: '#1A1A2E',  // Background
          600: '#141424',
          700: '#0E0E1A',
          800: '#080810',
          900: '#040408',
        },
        parchment: {
          50: '#F5F0E4',
          100: '#EDE5D4',
          200: '#E8E0D0',  // Main text color
          300: '#D4C9B4',
          400: '#BFB49E',
          500: '#A89A80',
        },
        blood: {
          DEFAULT: '#8B0000',
          light: '#B22222',
          dark: '#5C0000',
        },
        forest: {
          DEFAULT: '#2D5A27',
          light: '#4A8C3F',
          dark: '#1A3A17',
        },
      },
      fontFamily: {
        display: ['MedievalSharp', 'serif'],
        body: ['Crimson Text', 'Georgia', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
      backgroundImage: {
        'parchment-texture': "url('/assets/images/parchment-bg.png')",
        'dark-stone': "url('/assets/images/stone-bg.png')",
      },
    },
  },
  plugins: [],
};
```

### PostCSS — client/postcss.config.js
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Docker Compose — docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: roc-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: roc_user
      POSTGRES_PASSWORD: roc_password
      POSTGRES_DB: realm_of_crowns
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: roc-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### .env.example
```
# Database
DATABASE_URL="postgresql://roc_user:roc_password@localhost:5432/realm_of_crowns"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="change-this-to-a-random-secret-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development

# Client
CLIENT_URL="http://localhost:3000"
```

Also create the actual `.env` file with the same contents as .env.example
so development can start immediately.

### .gitignore
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# Database
database/prisma/migrations/*_migration_lock.toml

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/

# Docker
docker-compose.override.yml
```

### client/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Realm of Crowns</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=MedievalSharp&display=swap" rel="stylesheet">
  </head>
  <body class="bg-dark-500 text-parchment-200 font-body">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### client/src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-dark-500 text-parchment-200 font-body antialiased;
    min-height: 100vh;
  }

  h1, h2, h3, h4 {
    @apply font-display text-primary-400;
  }

  a {
    @apply text-primary-400 hover:text-primary-300 transition-colors;
  }

  /* Scrollbar styling for fantasy theme */
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-dark-400;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-dark-50 rounded;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-primary-700;
  }
}
```


# ═══════════════════════════
# TEAMMATE 3: "doc-organizer"
# ═══════════════════════════

Read ALL files in the ./design-docs/ folder. Then organize them into
the project as follows:

1. Copy `design-docs/expanded-races-complete.md` → `docs/RACES.md`
2. Copy `design-docs/economy-design-document.md` → `docs/ECONOMY.md`
3. Copy `design-docs/races-and-regions-design.md` → `docs/WORLD_MAP.md`

4. Merge all prompt files into a single `docs/PROMPTS.md` in this order:
   - Start with a header: "# Realm of Crowns — All Agent Team Prompts"
   - Section 1: "## Phase 1 — Core Systems (Prompts 0-8)"
     Content from: `design-docs/claude-code-game-prompts.md`
   - Section 2: "## Phase 2A — Economy Expansion (Prompts 9-14)"
     Content from: `design-docs/economy-prompts-phase2.md`
   - Section 3: "## Phase 2B — Race Expansion (Prompts 15-18)"
     Content from: `design-docs/expanded-races-prompts.md`

5. Also split each individual prompt into its own file in /prompts/:
   - Read through claude-code-game-prompts.md and extract each
     numbered prompt (Prompt 0 through Prompt 8) into separate files:
     `prompts/phase1/prompt-00-scaffold.md` through
     `prompts/phase1/prompt-08-polish.md`
   - Read through economy-prompts-phase2.md and extract each prompt:
     `prompts/phase2-economy/prompt-09-professions.md` through
     `prompts/phase2-economy/prompt-14-trade-routes.md`
   - Read through expanded-races-prompts.md and extract each prompt:
     `prompts/phase2-races/prompt-15-race-foundation.md` through
     `prompts/phase2-races/prompt-18-abilities.md`

   Each extracted prompt file should contain ONLY the prompt text that
   you would paste into Claude Code — the part between the ``` markers.
   Include a comment at the top of each file:
   ```
   # Prompt XX — [Name]
   # Dependencies: [list which prompts must be done first]
   # Teammates: [number]
   # Paste everything below this line into Claude Code
   # ─────────────────────────────────────────────────
   ```

6. Create `docs/PROMPT_QUEUE.md`:
```markdown
# Realm of Crowns — Prompt Execution Queue

## Status Key
- ⬜ Not started
- 🔨 In progress
- ✅ Complete
- ❌ Blocked

## Phase 1 — Core Systems (Run in Order)
| # | Prompt | Teammates | Dependencies | Status |
|---|--------|-----------|-------------|--------|
| 00 | Project Scaffold | 3 | None (or use bootstrap) | ⬜ |
| 01 | Authentication & Players | 4 | 00 | ⬜ |
| 02 | World, Towns & Navigation | 4 | 01 | ⬜ |
| 03 | Economy & Trading (basic) | 4 | 02 | ⬜ |
| 04 | Combat System | 5 | 03 | ⬜ |
| 05 | Political System | 4 | 02 | ⬜ |
| 06 | Social & Guilds | 3 | 01 | ⬜ |
| 07 | Quests & Progression | 4 | 04 | ⬜ |
| 08 | Polish & Testing | 4 | All above | ⬜ |

## Phase 2A — Economy Expansion
| # | Prompt | Teammates | Dependencies | Status |
|---|--------|-----------|-------------|--------|
| 09 | Profession Foundation | 4 | 03 | ⬜ |
| 10 | Gathering & Resources | 4 | 09 | ⬜ |
| 11 | Processing & Refining | 3 | 10 | ⬜ |
| 12 | Finished Goods Crafting | 5 | 11 | ⬜ |
| 13 | Player Housing & Buildings | 3 | 09 (parallel w/ 12) | ⬜ |
| 14 | Trade Routes & Caravans | 3 | 12 | ⬜ |

## Phase 2B — Race Expansion (Can parallel with 2A)
| # | Prompt | Teammates | Dependencies | Status |
|---|--------|-----------|-------------|--------|
| 15 | Race Foundation (20 races) | 5 | 01 | ⬜ |
| 16 | World Map V2 (68 towns) | 4 | 15 | ⬜ |
| 17 | Racial Diplomacy | 3 | 16, 05 | ⬜ |
| 18 | Racial Abilities | 4 | 17, 04, 12 | ⬜ |

## Parallel Execution Map
```
Phase 1:  00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08
                              ↓
Phase 2A: .................. 09 → 10 → 11 → 12 → 14
                              ↓              ↑
                              13 ─────────────┘
Phase 2B: ............. 15 → 16 → 17
                                    ↓
Merge:   .......................... 18 (needs 2A + 2B done)
```

## Totals
- 19 prompts
- ~70 agent teammates across all prompts
- 20 races, 28 professions, 68 towns, 120 racial abilities
```

7. Keep the original design-docs/ folder intact (don't delete it).


# ═══════════════════════════
# TEAMMATE 4: "claude-md-writer"
# ═══════════════════════════

Read ALL design documents in ./design-docs/ to understand the full game.
Then create the CLAUDE.md file in the project root.

This file is CRITICAL — Claude Code reads it automatically on every
interaction. It gives full project context. The file must accurately
reflect what's in the design documents.

Create ./CLAUDE.md with this content (fill in details from the docs):

```markdown
# Realm of Crowns — Claude Code Project Context

## Game Overview
Browser-based fantasy MMORPG. Renaissance Kingdoms meets D&D.
20 playable races, 28 professions, 68 towns, player-driven everything.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Query
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 15 + Prisma ORM
- **Real-time:** Socket.io
- **Cache:** Redis 7
- **Auth:** JWT + bcrypt
- **Validation:** Zod
- **Deployment:** Docker Compose
- **Monorepo:** npm workspaces (client, server, shared, database)

## Project Structure
```
/client          — React frontend (Vite, Tailwind, Zustand)
/server          — Express API + Socket.io backend
/shared          — Shared types, constants, and game data
/database        — Prisma schema, migrations, seed data
/docs            — Game design documents (THE GAME BIBLE)
/prompts         — Claude Code agent team prompts by phase
/design-docs     — Original source design documents
```

## Design Documents — READ THESE FIRST
- `docs/RACES.md` — Complete 20-race compendium (stats, abilities, towns, relations)
- `docs/ECONOMY.md` — Economy system (28 professions, crafting chains, marketplace)
- `docs/WORLD_MAP.md` — All regions, 68 towns, geography
- `docs/PROMPTS.md` — All agent team prompts consolidated
- `docs/PROMPT_QUEUE.md` — What to build next, in order

## 20 Playable Races
### Core (7) — 5 towns each, easy start
Human (Heartlands), Elf (Silverwood), Dwarf (Ironvault), Halfling (Crossroads),
Orc (Ashenfang), Tiefling (Shadowmere), Dragonborn (Frozen Reaches)

### Common (6) — 2-3 towns, moderate start
Half-Elf (Twilight March), Half-Orc (Scarred Frontier), Gnome (Cogsworth),
Merfolk (Pelagic Depths), Beastfolk (Thornwilds), Faefolk (Glimmerveil)

### Exotic (7) — 0-2 towns, hard mode
Goliath (Skypeak), Drow (Vel'Naris/Underdark), Firbolg (Mistwood),
Warforged (The Foundry), Genasi (The Confluence), Revenant (Ashenmoor),
Changeling (Nomadic — no hometown)

### Sub-races
- Dragonborn: 7 Draconic Ancestries (Red, Blue, White, Black, Green, Gold, Silver)
- Beastfolk: 6 Animal Clans (Wolf, Bear, Fox, Hawk, Panther, Boar)
- Genasi: 4 Elements (Fire, Water, Earth, Air)

## 28 Professions
### Gathering (7): Farmer, Rancher, Fisherman, Lumberjack, Miner, Herbalist, Hunter
### Crafting (14): Smelter, Blacksmith, Armorer, Woodworker, Tanner, Leatherworker,
    Tailor, Alchemist, Enchanter, Cook, Brewer, Jeweler, Fletcher, Mason, Scribe
### Service (7): Merchant, Innkeeper, Healer, Stable Master, Banker, Courier, Mercenary Captain

- Max 3 professions per character (Humans get 4th at Level 15)
- Levels 1-100 with 6 tiers: Apprentice → Journeyman → Craftsman → Expert → Master → Grandmaster
- Quality roll: d20 + (professionLevel/5) + toolBonus + workshopBonus + racialBonus

## Key Design Principles
1. **Player-driven economy** — No NPC-created items. Every sword, potion, and meal is player-crafted
2. **Real-time actions** — Gathering, crafting, travel take real-world time (minutes to hours)
3. **Item durability** — Weapons (100 uses), armor (150 uses), tools (50 uses) break → constant demand
4. **3-profession limit** — Forces interdependence, nobody is self-sufficient
5. **Geographic scarcity** — Resources tied to biomes/regions → trade is necessary
6. **D&D mechanics** — d20 rolls, ability scores (STR/DEX/CON/INT/WIS/CHA), AC, spell slots
7. **Player politics** — Elected mayors and rulers with real governance power
8. **Racial relations** — 20×20 diplomacy matrix affects tariffs, access, NPC behavior
9. **Exclusive zones** — 11 zones only certain races can access (Underdark, Deep Ocean, Feywild, etc.)

## Game Data Location
All static game data → `/shared/src/data/` as typed TypeScript constants
Database schema → `/database/prisma/schema.prisma`
**Never hardcode game values in server or client — always reference shared data.**

## Development Phases
- Phase 1 (Prompts 00-08): Core systems foundation
- Phase 2A (Prompts 09-14): Economy & professions expansion
- Phase 2B (Prompts 15-18): 20 races & world expansion
- Phase 3 (Prompts 19+): Future features (mounts, religion, naval, guilds, seasons)
```

Also create a **README.md** in the project root:
```markdown
# ⚔️ Realm of Crowns

A browser-based fantasy MMORPG with 20 playable races, a player-driven
economy, D&D-style combat, and political systems.

## Quick Start

```bash
# 1. Start database and cache
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Run database migrations
npm run db:migrate

# 5. Seed the database
npm run db:seed

# 6. Start development servers
npm run dev
```

Client runs on http://localhost:3000
Server runs on http://localhost:4000

## Documentation
See `/docs` for complete game design documents.

## Tech Stack
React + TypeScript + Vite | Express + Socket.io | PostgreSQL + Prisma | Redis
```


# ═══════════════════════════
# TEAMMATE 5: "schema-writer"
# ═══════════════════════════

Read the design documents (especially expanded-races-complete.md and
economy-design-document.md) to understand all the game entities. Then
create the complete Prisma schema at `database/prisma/schema.prisma`.

The schema must cover EVERY system described in the design documents.
Include all models, enums, relations, and indexes.

Required enums (at minimum):
- Race (all 20: HUMAN, ELF, DWARF, HALFLING, ORC, TIEFLING, DRAGONBORN,
  HALF_ELF, HALF_ORC, GNOME, MERFOLK, BEASTFOLK, FAEFOLK, GOLIATH, DROW,
  FIRBOLG, WARFORGED, GENASI, REVENANT, CHANGELING)
- RaceTier (CORE, COMMON, EXOTIC)
- DraconicAncestry (RED, BLUE, WHITE, BLACK, GREEN, GOLD, SILVER)
- BeastClan (WOLF, BEAR, FOX, HAWK, PANTHER, BOAR)
- ElementalType (FIRE, WATER, EARTH, AIR)
- RelationStatus (ALLIED, FRIENDLY, NEUTRAL, DISTRUSTFUL, HOSTILE, BLOOD_FEUD)
- ProfessionType (all 28 professions)
- ProfessionCategory (GATHERING, CRAFTING, SERVICE)
- ProfessionTier (APPRENTICE, JOURNEYMAN, CRAFTSMAN, EXPERT, MASTER, GRANDMASTER)
- BiomeType (PLAINS, FOREST, MOUNTAIN, HILLS, BADLANDS, SWAMP, TUNDRA,
  VOLCANIC, COASTAL, DESERT, RIVER, UNDERGROUND, UNDERWATER, FEYWILD)
- ItemType (WEAPON, ARMOR, TOOL, CONSUMABLE, MATERIAL, ACCESSORY, QUEST, HOUSING)
- ItemRarity (POOR, COMMON, FINE, SUPERIOR, MASTERWORK, LEGENDARY)
- ResourceType (ORE, WOOD, GRAIN, HERB, FISH, HIDE, STONE, FIBER, ANIMAL_PRODUCT, REAGENT, EXOTIC)
- EquipSlot (HEAD, CHEST, HANDS, LEGS, FEET, MAIN_HAND, OFF_HAND, RING_1, RING_2, NECK, BACK)
- BuildingType (HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE, SMITHY, SMELTERY,
  TANNERY, TAILOR_SHOP, ALCHEMY_LAB, ENCHANTING_TOWER, KITCHEN, BREWERY,
  JEWELER_WORKSHOP, FLETCHER_BENCH, MASON_YARD, LUMBER_MILL, SCRIBE_STUDY,
  STABLE, WAREHOUSE, BANK, INN, MARKET_STALL, FARM, RANCH, MINE)
- ActionStatus (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- CombatType (PVE, PVP, DUEL, ARENA, WAR)
- ElectionType (MAYOR, RULER, GUILD_LEADER)
- DiplomacyActionType (PROPOSE_TREATY, DECLARE_WAR, TRADE_AGREEMENT,
  NON_AGGRESSION_PACT, ALLIANCE, BREAK_TREATY)
- QuestType (MAIN, TOWN, DAILY, GUILD, BOUNTY, RACIAL)
- MessageChannel (GLOBAL, TOWN, GUILD, PARTY, WHISPER, TRADE, SYSTEM)

Required models (at minimum):
- User, Character, CharacterEquipment, Inventory
- PlayerProfession, ProfessionXP
- Region, Town, TownResource, TravelRoute, TravelAction, RegionBorder
- RacialRelation, DiplomacyEvent, War
- ExclusiveZone
- Resource, ItemTemplate, Item, Recipe
- CraftingAction, GatheringAction
- Building, BuildingConstruction
- MarketListing, TradeTransaction, PriceHistory, Caravan
- Election, ElectionVote, Law, Kingdom
- Guild, GuildMember
- Quest, QuestProgress
- CombatSession, CombatLog, CombatParticipant, Monster
- Message, Notification
- RacialAbilityCooldown, ChangelingDisguise, WarforgedMaintenance
- Achievement, PlayerAchievement

Every model needs:
- Proper id fields (String @id @default(cuid()) or Int @id @default(autoincrement()))
- Proper relations with foreign keys
- Proper indexes on frequently queried fields
- createdAt/updatedAt timestamps where appropriate
- JSON fields for flexible data (stats, effects, lootTables, etc.)

After creating the schema, run `npx prisma validate` to verify it's valid.
Do NOT run migrate (no database running yet).


# ═══════════════════════════
# TEAMMATE 6: "starter-code"
# ═══════════════════════════

Create the minimal starter code files so the app can actually boot
once dependencies are installed and the database is running.

### server/src/index.ts
```typescript
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';

const PORT = process.env.PORT || 4000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`⚔️  Player connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🏃 Player disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`
  ⚔️  ═══════════════════════════════════════ ⚔️
  ║                                           ║
  ║        REALM OF CROWNS SERVER              ║
  ║        Running on port ${PORT}                ║
  ║                                           ║
  ⚔️  ═══════════════════════════════════════ ⚔️
  `);
});

export { io };
```

### server/src/app.ts
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Realm of Crowns',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Route placeholder — routes will be added by feature prompts
app.get('/api', (_req, res) => {
  res.json({
    message: 'Welcome to the Realm of Crowns API',
    endpoints: {
      health: '/api/health',
      // Routes added as features are built
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});
```

### client/src/main.tsx
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

### client/src/App.tsx
```tsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-dark-500">
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  );
}

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-display text-primary-400 mb-4">
        ⚔️ Realm of Crowns
      </h1>
      <p className="text-xl text-parchment-300 mb-8 text-center max-w-2xl">
        A fantasy MMORPG with 20 playable races, player-driven economy,
        and D&D-style adventure. Your kingdom awaits.
      </p>
      <div className="flex gap-4">
        <button className="px-8 py-3 bg-primary-400 text-dark-500 font-display text-lg rounded hover:bg-primary-300 transition-colors">
          Begin Your Journey
        </button>
        <button className="px-8 py-3 border border-primary-400 text-primary-400 font-display text-lg rounded hover:bg-dark-300 transition-colors">
          Learn More
        </button>
      </div>
      <div className="mt-16 text-parchment-500 text-sm">
        <p>20 Races • 28 Professions • 68 Towns • Your Story</p>
      </div>
    </div>
  );
}

export default App;
```

### client/src/services/api.ts
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('roc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('roc_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### shared/src/index.ts
```typescript
// Realm of Crowns — Shared Module
// Types, constants, and game data used by both client and server

export * from './types';
export * from './constants';
```

### shared/src/types/index.ts
```typescript
// Type exports — will be populated as features are built
export {};
```

### shared/src/constants/index.ts
```typescript
// Constant exports — will be populated as features are built
export {};
```

### shared/src/utils/dice.ts
```typescript
/**
 * D&D-style dice rolling utilities for Realm of Crowns
 */

/** Roll a single die with N sides */
export function roll(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll multiple dice: e.g., rollMultiple(2, 6) = 2d6 */
export function rollMultiple(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += roll(sides);
  }
  return total;
}

/** Roll with modifier: e.g., d20 + 5 */
export function rollWithModifier(sides: number, modifier: number): number {
  return roll(sides) + modifier;
}

/** Roll with advantage (roll 2, take higher) */
export function advantage(sides: number = 20): number {
  return Math.max(roll(sides), roll(sides));
}

/** Roll with disadvantage (roll 2, take lower) */
export function disadvantage(sides: number = 20): number {
  return Math.min(roll(sides), roll(sides));
}

/** Roll a standard D&D ability score: 4d6, drop lowest */
export function rollAbilityScore(): number {
  const rolls = [roll(6), roll(6), roll(6), roll(6)];
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

/** Quality roll for crafting: d20 + (profLevel/5) + toolBonus + workshopBonus + racialBonus */
export function qualityRoll(
  professionLevel: number,
  toolBonus: number = 0,
  workshopBonus: number = 0,
  racialBonus: number = 0
): { roll: number; total: number; quality: string } {
  const d20 = roll(20);
  const levelBonus = Math.floor(professionLevel / 5);
  const total = d20 + levelBonus + toolBonus + workshopBonus + racialBonus;

  let quality: string;
  if (total <= 5) quality = 'Poor';
  else if (total <= 10) quality = 'Common';
  else if (total <= 15) quality = 'Fine';
  else if (total <= 20) quality = 'Superior';
  else if (total <= 25) quality = 'Masterwork';
  else quality = 'Legendary';

  return { roll: d20, total, quality };
}

/** Initiative roll: d20 + DEX modifier */
export function initiativeRoll(dexModifier: number): number {
  return rollWithModifier(20, dexModifier);
}

/** Attack roll: d20 + attack modifier vs AC */
export function attackRoll(
  attackModifier: number,
  targetAC: number
): { roll: number; total: number; hit: boolean; critical: boolean } {
  const d20 = roll(20);
  const total = d20 + attackModifier;
  return {
    roll: d20,
    total,
    hit: d20 === 20 || (d20 !== 1 && total >= targetAC),
    critical: d20 === 20,
  };
}
```

### database/seeds/index.ts
```typescript
/**
 * Master seed script for Realm of Crowns
 *
 * Run with: npm run db:seed
 *
 * Seeds are added as features are built.
 * Each seed file exports an async function that receives the Prisma client.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚔️  Seeding the Realm of Crowns database...');
  console.log('');

  // Seeds will be added here as features are built:
  // await seedRaces(prisma);
  // await seedRegions(prisma);
  // await seedTowns(prisma);
  // await seedResources(prisma);
  // await seedRecipes(prisma);
  // await seedRelations(prisma);
  // await seedMonsters(prisma);

  console.log('');
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```


# ═══════════════════════════════════════════════
# AFTER ALL 6 TEAMMATES COMPLETE AND REPORT BACK
# ═══════════════════════════════════════════════

Give me a FULL STATUS REPORT:

1. ✅/❌ All directories created (list count)
2. ✅/❌ All config files created (package.json × 5, tsconfig × 4, etc.)
3. ✅/❌ Design docs organized into /docs/ (list each file)
4. ✅/❌ Individual prompts extracted into /prompts/ (list each file)
5. ✅/❌ CLAUDE.md exists at project root
6. ✅/❌ README.md exists at project root
7. ✅/❌ Prisma schema created and validated
8. ✅/❌ Starter code files created (server boots, client boots)
9. ✅/❌ docker-compose.yml exists
10. ✅/❌ .env and .env.example exist

Then tell me:
- Total files created
- Total directories created
- Any issues or warnings
- **The exact next step** (which prompt to run first)

The project should be in a state where after running
`docker-compose up -d && npm install`, both the client and server
can start with `npm run dev`.
