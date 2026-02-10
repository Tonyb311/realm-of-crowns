# Claude Code Agent Team Prompts — Expanded Races (20 Races)
## Replaces Prompts 15–18 from Previous Race Document

> These prompts replace the earlier 7-race prompts. The system is now 
> 20 playable races across 3 tiers with 68 towns, exclusive resource 
> zones, sub-races, and unique mechanics per exotic race.

---

## 🔧 PROMPT 15 — Race System Foundation (20 Races)

```
You are the team lead. Use agent teams. Spawn a team of 5 teammates 
to build the expanded race system foundation for 20 playable races.

Context: Aethermere now has 20 playable races in 3 tiers:
- Core (7): Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn
- Common (6): Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk
- Exotic (7): Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling

Tiers affect starting conditions — Core races get 5-town homelands, 
Common get 2-3 towns, Exotic get 1-2 towns or none (Changelings are nomadic).
Some races have sub-races chosen at character creation:
- Dragonborn → Draconic Ancestry (Red/Blue/White/Black/Green/Gold/Silver)
- Beastfolk → Animal Clan (Wolf/Bear/Fox/Hawk/Panther/Boar)
- Genasi → Element (Fire/Water/Earth/Air)

1. Teammate "race-schema-v2" — Create the complete race schema in Prisma:
   - Race enum with all 20 races: HUMAN, ELF, DWARF, HALFLING, ORC, 
     TIEFLING, DRAGONBORN, HALF_ELF, HALF_ORC, GNOME, MERFOLK, 
     BEASTFOLK, FAEFOLK, GOLIATH, DROW, FIRBOLG, WARFORGED, GENASI, 
     REVENANT, CHANGELING
   - RaceTier enum: CORE, COMMON, EXOTIC
   - SubRace model for races with sub-choices:
     * DraconicAncestry: RED, BLUE, WHITE, BLACK, GREEN, GOLD, SILVER
     * BeastClan: WOLF, BEAR, FOX, HAWK, PANTHER, BOAR
     * ElementalType: FIRE, WATER, EARTH, AIR
   - RacialAbility model: raceId, name, description, levelRequired, 
     effectType, effectValue, cooldownSeconds, duration, isPassive, 
     targetType (SELF, PARTY, ENEMY, AOE)
   - RacialRelation model: raceA, raceB, defaultRelation, currentRelation,
     modifiedAt, modifiedByPlayerId
   - RelationStatus enum: ALLIED, FRIENDLY, NEUTRAL, DISTRUSTFUL, 
     HOSTILE, BLOOD_FEUD
   - ExclusiveZone model: raceId, zoneName, zoneType, resources[], 
     accessLevel, dangerLevel
   - Update Character model: race, raceTier, subRace (nullable JSON 
     for flexible sub-race storage), unlockedAbilities[], 
     currentAppearanceRace (for Changelings)
   - CharacterAppearance model: for Changeling shape tracking
   - Run migration

2. Teammate "race-data-core" — Create data files for all 7 Core races 
   in /shared/data/races/core/:
   - One file per race with FULL definitions:
     * name, tier, description, lore (2-3 paragraphs)
     * statModifiers: {STR, DEX, CON, INT, WIS, CHA}
     * trait: {name, description}
     * abilities: array of 6, each with {name, description, levelReq, 
       type, effect, cooldown, duration, isPassive}
     * professionBonuses: map of professionType → {speedBonus, 
       qualityBonus, yieldBonus, xpBonus} (percentages)
     * gatheringBonuses: map of resourceType → bonus% per biome
     * homelandRegion, startingTowns[]
   - Sub-race data for Dragonborn: 7 ancestries with element, 
     breathShape, damageDice, resistance
   - All data as typed TypeScript constants with proper interfaces
   - Export a RaceRegistry map for easy lookup

3. Teammate "race-data-common-exotic" — Create data files for all 
   13 Common + Exotic races in /shared/data/races/common/ and 
   /shared/data/races/exotic/:
   - Same structure as Core races
   - Sub-race data for:
     * Beastfolk: 6 clans with bonusStat, specialPerk
     * Genasi: 4 elements with bonusStat, resistance, craftingBonuses
   - Special mechanics flags per race:
     * Merfolk: {hasUnderwaterAccess: true, landSpeedPenalty: 0.85}
     * Drow: {hasUnderdarkAccess: true, sunlightPenalty: true}
     * Faefolk: {hasFeywildAccess: true, canFly: true, fragile: true}
     * Warforged: {noFood: true, noSleep: true, needsMaintenance: true}
     * Revenant: {reducedDeathPenalty: 0.5, fasterRespawn: 0.5}
     * Changeling: {canShapeshift: true, noHometown: true}
     * Goliath: {doubleCarryCapacity: true, coldImmune: true}
     * Firbolg: {canTalkToAnimals: true, canTalkToPlants: true}
   - Exclusive resource zone definitions per exotic race
   - All typed TypeScript constants

4. Teammate "race-backend-v2" — Build the expanded race API:
   - GET /api/races — list all 20 races grouped by tier
   - GET /api/races/:race — full race details including abilities, 
     bonuses, lore, sub-races if applicable
   - GET /api/races/:race/subraces — get sub-race options
   - Racial bonus calculator service: given race + subrace + 
     professionType + currentTown + currentBiome → compute all 
     active bonuses (speed, yield, quality, XP, trade modifiers)
   - Special mechanic handlers:
     * Changeling appearance manager: POST /api/race/changeling/shift 
       (change appearance), GET /api/race/changeling/trueform
     * Warforged maintenance tracker: GET /api/race/warforged/maintenance 
       (days since last maintenance, current degradation)
     * Merfolk zone access: GET /api/race/merfolk/underwater-nodes 
       (list available underwater resource nodes)
   - Character creation integration: apply stat modifiers, sub-race 
     bonuses, set starting town (Changeling picks any town), 
     flag special mechanics
   - GET /api/relations/matrix — full 20x20 racial relations matrix
   - Racial ability use: POST /api/abilities/racial/use with proper 
     cooldown tracking and effect application

5. Teammate "race-frontend-v2" — Build the expanded race selection UI:
   - Character creation race browser:
     * 3 tabs: Core, Common, Exotic (with "Recommended for new players" 
       on Core, "Experienced players" badge on Exotic)
     * Race card grid with portrait, name, tier badge, homeland
     * Click a race to expand: full lore panel, stat display with 
       +/- indicators, trait highlight, ability preview (greyed 
       with level requirements), profession affinity chart, 
       homeland map highlight
     * Sub-race selection step for Dragonborn/Beastfolk/Genasi:
       visual selector with each option's unique bonuses
     * Special mechanic warnings for exotic races:
       "Warforged don't eat but need maintenance"
       "Changelings have no hometown — you'll start wherever you choose"
       "Drow suffer penalties in sunlight"
     * Starting town selector: Core races start in homeland capital 
       by default, Changelings pick any town, others start in 
       their racial territory
   - Race comparison tool: select 2-3 races side-by-side, compare 
     stats, abilities, profession bonuses
   - In-game race info page on character sheet: current abilities 
     (locked/unlocked), active racial bonuses for current location, 
     racial relations affecting you

After all teammates complete and report back, verify: every race can 
be selected at character creation, sub-races work for Dragonborn/
Beastfolk/Genasi, stat modifiers apply correctly, Changeling can 
start in any town, Warforged gets flagged for maintenance tracking, 
and the racial bonus calculator properly handles all 20 races. 
Give me a full summary and flag any balance concerns.
```

---

## 🔧 PROMPT 16 — World Map V2 (68 Towns, All Regions)

```
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
     * Zoom levels: continent → region → town detail
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
```

---

## 🔧 PROMPT 17 — Racial Diplomacy V2 (20-Race Relations)

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates 
to build the diplomacy system for 20 races.

Context: With 20 races, the diplomacy matrix is 20x20 (190 unique 
pairings). Most start at Neutral, but there are significant 
predefined relationships: Dwarf-Orc Blood Feud, Elf-Faefolk-Firbolg 
Alliance, Outcast solidarity (Tiefling-Drow-Revenant-Changeling 
Friendly), Crafter alliance (Dwarf-Gnome-Warforged), etc. Players 
can shift these over time through political actions.

Use the complete 20x20 racial relations matrix from the design 
document as the starting state.

1. Teammate "diplomacy-engine-v2" — Build the expanded diplomacy backend:
   - Seed the full 20x20 relations matrix (190 unique pairings) with 
     default values from the design document
   - Diplomatic action system for kingdom/region rulers:
     * PROPOSE_TREATY: improve relations one step (needs other side approval)
     * DECLARE_WAR: worsen relations (unilateral)
     * TRADE_AGREEMENT: reduce tariffs between two kingdoms
     * NON_AGGRESSION_PACT: prevent PvP between kingdoms' players
     * ALLIANCE: full military alliance (requires FRIENDLY+ status)
     * BREAK_TREATY: cancel agreement (reputation penalty)
   - Relation change requirements scale with how deep the change is:
     * BLOOD_FEUD → HOSTILE: 15,000 gold + 10 real days + both agree + zero PvP incidents
     * HOSTILE → DISTRUSTFUL: 8,000 gold + 7 days
     * DISTRUSTFUL → NEUTRAL: 3,000 gold + 4 days
     * NEUTRAL → FRIENDLY: 5,000 gold + 5 days
     * FRIENDLY → ALLIED: 10,000 gold + 10 days + active trade agreement 14+ days
     * Worsening is always instant and free
   - Exotic race diplomacy: exotic races with only 1-2 towns can 
     still participate in diplomacy through their regional leader
   - Changeling special: Changelings can serve as neutral diplomatic 
     intermediaries, reducing treaty costs by 20%
   - War system: declaration, war score (PvP kills, raids, territory), 
     peace negotiation, reparations
   - Treaty history log: permanent record of all diplomatic actions
   - API: full diplomacy CRUD + war management + treaty history

2. Teammate "diplomacy-events-v2" — Build the world events system:
   - Global announcement system for diplomatic events:
     * War declarations, peace treaties, alliance formations
     * Border status changes, trade agreement signings
     * Formatted as in-game "Herald" messages with flavor text
   - War bulletin board during active conflicts
   - Diplomatic reputation per kingdom (treaty-keepers vs oathbreakers)
   - Monthly "State of Aethermere" report: all current relations, 
     active treaties, ongoing wars, recent changes
   - Citizen petition system: players can petition their ruler for 
     specific diplomatic actions (threshold of signatures triggers 
     ruler notification)
   - Integration with notification/socket system for real-time alerts

3. Teammate "diplomacy-frontend-v2" — Build the diplomacy UI:
   - World Diplomacy overlay on the map:
     * Color-coded borders between all 21 regions
     * Active treaty icons, war indicators (crossed swords)
     * Click between two regions for full diplomatic history
   - Diplomacy panel for rulers: propose treaties, respond to proposals, 
     manage wars, view active agreements
   - Diplomacy panel for citizens: view current relations, active 
     treaties/wars, petition system, diplomatic history timeline
   - War dashboard: war score, battle log, enlist button for war quests
   - 20x20 relations matrix view: interactive grid showing all 
     racial relationships with color coding, click any cell for details
   - Changeling diplomat bonus indicator when applicable

After all teammates complete and report back, verify: the full 20x20 
matrix is seeded correctly, rulers can propose and accept treaties, 
war can be declared and tracked, border statuses update based on 
relations, and the diplomacy map overlay reflects current state. 
Test changing Dwarf-Orc relations from Blood Feud toward Hostile 
to verify the full process works.
```

---

## 🔧 PROMPT 18 — All 20 Race Abilities in Combat & Professions

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates 
to integrate ALL 20 races' abilities into combat and profession systems.

Context: Each race has 6 abilities (120 total abilities across 20 races). 
Some are combat (Orc's Blood Fury, Dragonborn's Breath Weapon), some 
affect professions (Dwarf's Master Forger, Gnome's Efficient Engineering), 
and some are utility (Halfling's Luck, Changeling's shapeshifting). 
All need to work in the actual game systems.

1. Teammate "combat-abilities-all" — Implement ALL combat-relevant 
   racial abilities across 20 races:
   
   This includes (but is not limited to):
   - Human: Rally the People (party buff), Indomitable Will (save reroll)
   - Elf: Elven Accuracy (ranged advantage), Spirit Walk (invisibility)
   - Dwarf: Dwarven Resilience (poison resist), Ancestral Fury (low HP buff)
   - Halfling: Halfling Luck (d20 reroll)
   - Orc: Intimidating Presence, Relentless Endurance, Blood Fury, Orcish Rampage
   - Tiefling: Hellish Resistance, Infernal Rebuke, Soul Bargain
   - Dragonborn: Breath Weapon (7 elements), Draconic Scales, Frightful Presence, Ancient Wrath
   - Half-Elf: Fey Ancestry (charm immune), Inspiring Presence
   - Half-Orc: Savage Attacks (extra crit die), Unstoppable Force
   - Gnome: Gnome Cunning (magic save advantage)
   - Merfolk: Tidal Healing, Call of the Deep (water elemental), Tsunami Strike
   - Beastfolk: Natural Weapons, Beast Form (transformation), Alpha's Howl, 
     Apex Predator, plus 6 clan-specific perks
   - Faefolk: Flutter (flying), Wild Magic Surge, Nature's Wrath (entangle)
   - Goliath: Stone's Endurance, Earthshaker (AoE prone), Titan's Grip
   - Drow: Drow Magic (darkness), Poison Mastery, Shadow Step, Dominate
   - Firbolg: Hidden Step, Druidic Magic buffs, Guardian Form (treant)
   - Warforged: Integrated Armor, Self-Repair, Siege Mode
   - Genasi: Elemental Cantrip, Elemental Burst (4 element variants), 
     Primordial Awakening (elemental form)
   - Revenant: Life Drain, Undying Fortitude, Army of the Dead
   - Changeling: Unsettling Visage, Thousand Faces (combat shifting)
   
   Each ability needs: activation trigger, effect calculation, 
   duration/cooldown tracking, combat log entry, interaction with 
   existing combat engine (turn order, damage calculation, status effects)

2. Teammate "profession-abilities-all" — Integrate ALL profession-
   affecting racial bonuses for 20 races:
   
   Hook into existing gathering yield calculator:
   - Human +10% farming in Heartlands, +5% all craft speed
   - Elf +25% herbalism forests, +20% enchanting quality
   - Dwarf +30% mining mountains, +25% smithing quality, +20% smelting
   - Halfling +25% cooking, +20% brewing/trade, +15% farming, +10% gather speed
   - Orc +30% hunting, +20% tanning/leatherworking
   - Tiefling +30% alchemy, +25% herbalism swamps, +20% enchanting
   - Dragonborn +20% mining volcanic, +20% smelting
   - Half-Elf +20% one chosen profession
   - Half-Orc +20% hunting, +15% smithing/tanning
   - Gnome +15% tinker quality, +10% craft speed, +10% fewer materials
   - Merfolk +40% fishing, +30% pearl/coral, -15% land gathering
   - Beastfolk +35% hunting, +25% tanning, -20% enchanting
   - Faefolk +35% enchanting, +30% herbalism, -25% physical crafting
   - Goliath +35% extreme mining, +25% masonry, -20% finesse crafting
   - Drow +30% alchemy (poison), +25% spider-silk tailoring, -10% daytime
   - Firbolg +40% herbalism, +30% farming, -25% mining/building
   - Warforged +25% smelting, +25% craft speed, -30% cooking, -20% herbalism
   - Genasi per-element crafting bonuses (Fire→smelting, Water→alchemy, etc.)
   - Revenant +25% death-herbs, +15% mining (no air needed), -25% cooking
   - Changeling +30% merchant, +25% courier, +20% innkeeper
   
   Also implement special profession mechanics:
   - Human Adaptable Crafter: allow 4th profession slot
   - Gnome Efficient Engineering: 10% material reduction
   - Gnome Eureka Moment: instant craft completion
   - Warforged Overclock: double craft speed temporarily
   - Warforged Tireless Worker: 50% more queue slots

3. Teammate "special-mechanics" — Build the unique mechanics for 
   exotic races:
   
   CHANGELING SHAPESHIFTING:
   - Can change visible race at will (cosmetic + NPC interaction)
   - Level 10: fools racial detection (treated as displayed race for tariffs/penalties)
   - Level 15: can copy specific player's appearance
   - Level 25: Veil Network access (spy intelligence marketplace)
   - Track true race vs displayed race, handle edge cases
   
   WARFORGED MAINTENANCE:
   - No food/rest needed (save gold on food, no inn costs)
   - Maintenance system: need Repair Kit every 7 days
   - Without maintenance: -1% all stats per day overdue
   - Repair Kits crafted by Blacksmith (Metal Ingots + Arcane Components)
   - Self-Repair ability: partial heal without kits
   
   MERFOLK AMPHIBIOUS:
   - 3x movement speed in water zones
   - 85% movement speed on land
   - Access underwater resource nodes exclusively
   - Water-adjacent town bonus: can fish from anywhere
   
   DROW SUNLIGHT SENSITIVITY:
   - Day/night cycle tracking (or simplified: surface vs underground)
   - Daytime surface: -2 attack, -2 perception
   - Nighttime or underground: no penalty
   - Incentivizes nocturnal play pattern or underground living
   
   FAEFOLK FLIGHT:
   - Can bypass ground-level obstacles
   - Dodge ground traps in combat
   - Cross water/gaps without bridge
   - Can't fly while carrying heavy loads
   
   REVENANT REDUCED DEATH:
   - Death penalty halved (gold loss, XP loss, durability loss)
   - Respawn timer halved
   - Makes them ideal for dangerous/experimental content
   
   API endpoints for each special mechanic

4. Teammate "racial-frontend-v2" — Build the complete racial ability UI:
   - Character sheet Racial Abilities tab:
     * All 6 abilities displayed, locked/unlocked by level
     * Active abilities have "Use" button with cooldown timer
     * Passive abilities show as always-on buff icons
     * Sub-race abilities highlighted (clan perks, element perks)
   - Combat integration:
     * Racial abilities in combat action menu
     * Breath weapon targeting overlay (cone/line based on ancestry)
     * Beast Form transformation animation
     * Dragonborn elemental glow on portrait
     * Changeling mid-combat shift visual
   - Profession integration:
     * Show racial bonuses as line items in crafting preview
     * Gathering UI shows racial yield bonus
     * Warforged maintenance indicator in HUD
     * Merfolk water/land speed indicator
     * Drow sunlight warning indicator
   - Level-up racial ability unlock celebration screen
   - Special mechanic HUD elements:
     * Changeling: current appearance indicator + "True Form" toggle
     * Warforged: maintenance status bar
     * Drow: sun/shade indicator
     * Merfolk: water proximity indicator

After all teammates complete and report back, test at LEAST one race 
from each tier through both combat and crafting:
- Core: test Dragonborn Breath Weapon (Red vs Blue ancestry) in combat
- Common: test Gnome Efficient Engineering reducing craft materials
- Exotic: test Changeling shapeshifting fooling a merchant NPC in 
  a Distrustful town, test Warforged maintenance degradation
Give me a full status report and flag any abilities that seem 
over/underpowered.
```

---

## 📋 PROMPT SUMMARY — Expanded Races Phase

| Prompt | System | Teammates | Total Abilities |
|--------|--------|-----------|----------------|
| 15 | Race foundation (20 races, schema, data, APIs) | 5 | 120 racial abilities defined |
| 16 | World map (68 towns, exclusive zones, borders) | 4 | 11 exclusive resource zones |
| 17 | Diplomacy (20x20 matrix, treaties, wars) | 3 | 190 unique race pairings |
| 18 | Combat + profession integration + special mechanics | 4 | All 120 abilities implemented |

**Total teammates: 16**
**Total races: 20**
**Total towns: 68**
**Total racial abilities: 120**
**Total exclusive zones: 11**
**Total racial relation pairings: 190**

### Run Order:
```
15 (foundation) → 16 (world) → 17 (diplomacy, needs politics from Prompt 5)
                             → 18 (abilities, needs combat from Prompt 4 + economy from 9-12)
```

### Full Project Prompt Map (Updated):
```
Phase 1 — Core Systems:
  0 (scaffold) → 1 (auth) → 2 (world basic) → 3 (economy basic) → 
  4 (combat) → 5 (politics) → 6 (social) → 7 (quests) → 8 (polish)

Phase 2A — Economy Expansion:
  9 (professions) → 10 (gathering) → 11 (processing) → 12 (finished goods) → 
  13 (housing) → 14 (trade routes)

Phase 2B — Race Expansion:
  15 (20 races) → 16 (68 towns) → 17 (diplomacy) → 18 (abilities)

Phase 2C — Future Features:
  19+ (mounts, religion, naval, guilds expanded, seasons, etc.)
```
