# Prompt 16 — World Map V2 (68 Towns, All Regions)
# Dependencies: 15
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

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
