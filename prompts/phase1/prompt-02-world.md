# Prompt 02 — World, Towns & Navigation
# Dependencies: 01
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

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
