# Prompt 01 — Authentication & Player System
# Dependencies: 00
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

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
