# Prompt 13 — Player Housing & Buildings
# Dependencies: 09 (parallel with 12)
# Teammates: 3
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

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
