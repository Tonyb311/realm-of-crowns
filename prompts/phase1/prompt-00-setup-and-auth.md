# Prompt 00 — Infrastructure Setup + Authentication & Players
# Dependencies: Bootstrap complete
# Teammates: 5
# This prompt starts the database, installs deps, runs migrations,
# then builds the first feature (auth + character creation).
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

Before building any features, set up the development environment and
verify everything works. Then build the first feature: authentication
and character creation.

STEP 1 — INFRASTRUCTURE SETUP (do this yourself, no teammates needed):

1. Start Docker containers:
   ```
   docker-compose up -d
   ```
   Wait for PostgreSQL and Redis to be healthy.

2. Install all workspace dependencies:
   ```
   npm install
   ```
   Fix any dependency issues or version conflicts that come up.

3. Copy .env.example to .env if .env doesn't already exist:
   ```
   cp .env.example .env
   ```

4. Generate the Prisma client:
   ```
   cd database && npx prisma generate && cd ..
   ```

5. Run the initial database migration:
   ```
   cd database && npx prisma migrate dev --name init && cd ..
   ```
   If the migration fails, fix the schema issues and retry.

6. Verify the server starts:
   ```
   cd server && npx tsx src/index.ts
   ```
   Confirm it logs the "Realm of Crowns" banner and shows the port.
   Then stop it (Ctrl+C).

7. Verify the client starts:
   ```
   cd client && npx vite
   ```
   Confirm it serves on localhost:3000.
   Then stop it (Ctrl+C).

8. Quick health check:
   Start both with `npm run dev` from the root, then:
   ```
   curl http://localhost:4000/api/health
   ```
   Should return `{"status":"ok","game":"Realm of Crowns",...}`

If ANY step above fails, fix it before moving on. The foundation must
be solid.

STEP 2 — BUILD AUTHENTICATION & CHARACTER CREATION

Now that infrastructure is running, use agent teams. Spawn a team of
5 teammates to build the authentication and player onboarding system.

Read CLAUDE.md and docs/RACES.md before starting so you have full
context on the 20 races, their stats, abilities, and starting towns.

1. Teammate "auth-backend" — Build the authentication system in /server:
   - Create server/src/routes/auth.ts:
     * POST /api/auth/register (email, username, password)
       - Validate with Zod: email format, username 3-20 chars alphanumeric,
         password min 8 chars
       - Hash password with bcrypt (12 rounds)
       - Create User record in database
       - Return JWT token
     * POST /api/auth/login (email, password)
       - Validate credentials
       - Return JWT with userId and username in payload
       - Set token expiry from JWT_EXPIRES_IN env var
     * GET /api/auth/me (protected)
       - Return current user profile from JWT
     * POST /api/auth/logout
       - Client-side only (remove token), but acknowledge the request
   - Create server/src/middleware/auth.ts:
     * authGuard middleware that validates JWT on protected routes
     * Extracts userId from token and attaches to req object
     * Returns 401 with clear error message if invalid/expired
   - Create server/src/middleware/validate.ts:
     * Generic Zod validation middleware factory
     * validate(schema) returns middleware that validates req.body
   - Create proper TypeScript types for Request with user attached
   - Register auth routes in server/src/routes/index.ts
   - Error handling: consistent JSON error format
     { error: string, details?: any }

2. Teammate "character-backend" — Build character creation API in /server:
   - Create server/src/routes/characters.ts:
     * POST /api/characters/create (protected)
       - Input: name, race, subRace (optional), class, startingTownId
       - Validate race is one of the 20 valid races
       - Validate subRace matches race (Dragonborn needs ancestry,
         Beastfolk needs clan, Genasi needs element, others null)
       - Validate class is valid
       - Validate startingTownId:
         * Core races: must be a town in their homeland region
         * Common races: must be in their territory
         * Exotic races: must be in their territory
         * Changelings: can pick ANY town
       - Calculate starting stats using race stat modifiers from
         shared/src/data/races/ — load the correct race file and
         apply its statModifiers to base stats of 10
       - Set starting HP = 10 + CON modifier + class HP bonus
       - Set starting MP based on class (mage/cleric get more)
       - Set starting gold: Core races 100g, Common 75g, Exotic 50g
       - Create Character record linked to User
       - Return full character data
     * GET /api/characters/me (protected)
       - Return current user's character with full details
       - Include: stats, equipment, profession list, current town,
         racial abilities (locked/unlocked based on level)
     * GET /api/characters/:id (protected)
       - Return public view of another player's character
       - Hide sensitive info (gold amount, exact inventory)
   - Validate one character per user (for now)
   - Register character routes

3. Teammate "race-data-loader" — Create the race data files that the
   backend needs. Read docs/RACES.md (which came from
   design-docs/expanded-races-complete.md) and create typed data files:

   - Create shared/src/types/race.ts with these interfaces:
     ```typescript
     interface StatModifiers {
       str: number; dex: number; con: number;
       int: number; wis: number; cha: number;
     }

     interface RacialAbility {
       name: string;
       description: string;
       levelRequired: number;
       type: 'active' | 'passive';
       effectType: string;
       effectValue: any;
       cooldownSeconds?: number;
       duration?: number;
       targetType: 'self' | 'party' | 'enemy' | 'aoe';
     }

     interface ProfessionBonus {
       professionType: string;
       speedBonus: number;      // percentage
       qualityBonus: number;    // percentage
       yieldBonus: number;      // percentage
       xpBonus: number;         // percentage
     }

     interface SubRaceOption {
       id: string;
       name: string;
       description: string;
       bonusStat?: string;
       bonusValue?: number;
       specialPerk?: string;
       element?: string;
       resistance?: string;
     }

     interface RaceDefinition {
       id: string;
       name: string;
       tier: 'core' | 'common' | 'exotic';
       lore: string;
       trait: { name: string; description: string };
       statModifiers: StatModifiers;
       abilities: RacialAbility[];
       professionBonuses: ProfessionBonus[];
       subRaces?: SubRaceOption[];
       homelandRegion: string;
       startingTowns: string[];
       specialMechanics?: Record<string, any>;
       exclusiveZone?: string;
     }
     ```

   - Create one file per race in shared/src/data/races/:
     * core/human.ts, core/elf.ts, core/dwarf.ts, core/halfling.ts,
       core/orc.ts, core/tiefling.ts, core/dragonborn.ts
     * common/halfElf.ts, common/halfOrc.ts, common/gnome.ts,
       common/merfolk.ts, common/beastfolk.ts, common/faefolk.ts
     * exotic/goliath.ts, exotic/drow.ts, exotic/firbolg.ts,
       exotic/warforged.ts, exotic/genasi.ts, exotic/revenant.ts,
       exotic/changeling.ts

   - Each file exports a RaceDefinition constant with ALL the data
     from docs/RACES.md — stats, abilities, bonuses, lore, everything.
     Do NOT make up data. Use the exact values from the design doc.

   - Create shared/src/data/races/index.ts that exports:
     * A RaceRegistry: Record<string, RaceDefinition> map of all 20 races
     * Helper functions: getRace(id), getRacesByTier(tier),
       getSubRaces(raceId), getStatModifiers(raceId)

4. Teammate "auth-frontend" — Build React auth pages in /client:
   - Create client/src/context/AuthContext.tsx:
     * React context providing: user, token, isAuthenticated, isLoading
     * login(email, password), register(email, username, password),
       logout() functions
     * Store JWT in localStorage as 'roc_token'
     * On mount, check for existing token and validate with /api/auth/me
     * Wrap the entire app with AuthProvider

   - Create client/src/pages/LoginPage.tsx:
     * Email + password form
     * "Don't have an account? Register" link
     * Error display for invalid credentials
     * Dark fantasy styled: dark card on darker background,
       gold borders, parchment-colored text, medieval font headers
     * Loading state on submit button

   - Create client/src/pages/RegisterPage.tsx:
     * Email, username, password, confirm password form
     * Inline validation (password match, email format, username length)
     * "Already have an account? Login" link
     * Same dark fantasy styling

   - Create client/src/components/ui/ProtectedRoute.tsx:
     * Wraps routes that require authentication
     * Redirects to /login if not authenticated
     * Shows loading spinner while checking auth

   - Update client/src/App.tsx:
     * Wrap with AuthProvider
     * Add routes: /login, /register, / (protected home),
       /create-character (protected)
     * Redirect authenticated users away from login/register

5. Teammate "character-creation-frontend" — Build the character creation
   flow in /client:
   - Create client/src/pages/CharacterCreationPage.tsx:
     * Multi-step wizard with progress indicator

   - Step 1: Race Selection
     * Three tabs/sections: Core, Common, Exotic
     * Each race shown as a card with: name, trait name, stat modifiers
       displayed as colored +/- numbers, 1-line description
     * Click a race to see expanded panel: full lore, all 6 abilities
       (greyed with level requirements), profession bonuses
     * Exotic races show a "Hard Mode" badge with warning tooltip
     * "Recommended for new players" badge on Human
     * Selected race highlighted with gold border

   - Step 1b: Sub-Race Selection (conditional)
     * Only shows if selected race has sub-races
     * Dragonborn: 7 ancestry cards with element icon, breath shape,
       resistance type
     * Beastfolk: 6 clan cards with animal icon, bonus stat, perk
     * Genasi: 4 element cards with visual styling per element

   - Step 2: Class Selection
     * Show available classes: Warrior, Mage, Rogue, Cleric, Ranger, Bard
     * Each with: description, primary stat, HP bonus, starting gear preview
     * Selected class highlighted

   - Step 3: Stat Review
     * Show base 10 + race modifiers + sub-race modifier applied
     * Final stat block displayed prominently
     * Show derived stats: HP, MP, AC, initiative modifier
     * No manual allocation (stats come from race + class for now)

   - Step 4: Starting Town
     * Show the valid starting towns for the chosen race
     * Each town card: name, region, specialty, description
     * Changelings see ALL towns grouped by region
     * Map view (or list view) with town markers

   - Step 5: Review & Confirm
     * Full character summary: name input field, race, sub-race,
       class, stats, starting town
     * Character name validation (3-20 chars, alphanumeric + spaces)
     * "Create Character" button
     * On success: redirect to game dashboard (or home page placeholder)

   - Styling:
     * Dark fantasy theme throughout
     * Animated slide transitions between steps
     * Gold progress bar at top showing current step
     * Back/Next navigation buttons styled as medieval buttons
     * Hover effects on race/class cards

After all teammates complete and report back:

1. Verify the full flow end-to-end:
   - Register a new account
   - Login with that account
   - Create a character (test at least 3 races: one Core, one Common
     with sub-race like Beastfolk, one Exotic like Changeling)
   - Verify character appears on /api/characters/me
   - Verify auth middleware blocks unauthenticated requests
   - Verify Changeling can pick any town, others are restricted

2. Fix any TypeScript errors across all workspaces

3. Make sure `npm run dev` starts both client and server without errors

4. Give me a full summary: what was built, what endpoints exist,
   any known issues, and confirmation that the next prompt
   (Prompt 02 — World & Navigation) can proceed.
