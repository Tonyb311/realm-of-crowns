# Claude Code Agent Team Prompts — Races & Regions
## Phase 2B: The World and Its Peoples

> These prompts build the racial system, world regions, and geopolitics.
> Run AFTER Phase 1 (Prompts 0–8) is stable.
> Can run in PARALLEL with Economy prompts (9–14) since they're mostly independent.

---

## 🔧 PROMPT 15 — Race System Foundation

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates 
to build the race system foundation.

Context: The world of Aethermere has 7 playable races, each with a 
homeland region, unique stat modifiers, racial abilities that unlock 
as they level, and crafting/economy bonuses. Races shape gameplay 
significantly — they affect stats, what professions you're best at, 
how NPCs treat you, trade tariffs, and political options. A player 
picks their race at character creation and it's permanent.

The 7 races are:
- Humans (Verdant Heartlands) — Adaptive, +1 all stats, extra profession slot
- Elves (Silverwood Forest) — Graceful, DEX/INT/WIS, magic/nature masters
- Dwarves (Ironvault Mountains) — Stoneborn, STR/CON, mining/smithing masters
- Halflings (The Crossroads) — Lucky, DEX/CHA, trade/cooking masters
- Orcs (Ashenfang Wastes) — Savage Might, STR/CON, hunting/leather/combat masters
- Tieflings (Shadowmere Marshes) — Infernal Legacy, INT/CHA, alchemy/dark magic
- Dragonborn (Frozen Reaches) — Dragon Blood, STR/CON/WIS, elemental breath weapon

1. Teammate "race-schema" — Extend the Prisma schema with:
   - Race enum: HUMAN, ELF, DWARF, HALFLING, ORC, TIEFLING, DRAGONBORN
   - DraconicAncestry enum: RED, BLUE, WHITE, BLACK, GREEN, GOLD, SILVER 
     (only for Dragonborn, nullable for others)
   - RacialAbility model: (raceId, name, description, levelRequired, 
     effectType, effectValue, cooldown, duration)
   - RacialRelation model: (raceA, raceB, relationStatus, modifiedByPlayers)
   - RelationStatus enum: ALLIED, FRIENDLY, NEUTRAL, DISTRUSTFUL, 
     HOSTILE, BLOOD_FEUD
   - Update Character model to include: race, draconicAncestry (nullable), 
     unlockedRacialAbilities[]
   - PlayerRacialAbilityCooldown model: tracks when abilities were last used
   - Run migration

2. Teammate "race-data" — Create comprehensive race data files in /shared:
   - Full race definitions with:
     * Name, description, lore (2-3 paragraphs each)
     * Homeland region name
     * Stat modifiers: {STR, DEX, CON, INT, WIS, CHA}
     * Trait name and description
     * Racial abilities array: 6 abilities per race, unlocking at 
       levels 1, 5, 10, 15, 25, 40
     * Profession bonuses: map of professionType → percentage bonus
     * Crafting bonuses: map of specific crafting actions → bonus
     * Gathering bonuses: map of resource types → bonus in homeland
   - Dragonborn ancestry data:
     * Each ancestry: element, breath weapon shape (cone/line), 
       damage type, resistance type, damage dice
   - Default racial relations matrix:
     * Human-Elf: FRIENDLY, Human-Dwarf: FRIENDLY, Human-Halfling: ALLIED
     * Human-Orc: HOSTILE, Human-Tiefling: DISTRUSTFUL, Human-Dragonborn: NEUTRAL
     * Elf-Dwarf: NEUTRAL, Elf-Orc: HOSTILE, Elf-Tiefling: DISTRUSTFUL
     * Dwarf-Orc: BLOOD_FEUD, Dwarf-Halfling: FRIENDLY
     * Halfling-Orc: NEUTRAL, Halfling-Tiefling: NEUTRAL
     * Tiefling-Orc: NEUTRAL, Tiefling-Dragonborn: NEUTRAL
     * Dragonborn-Orc: NEUTRAL (WARY — use NEUTRAL mechanically)
   - Export everything as typed TypeScript constants

3. Teammate "race-backend" — Build race system APIs in /server:
   - GET /api/races — list all races with full details
   - GET /api/races/:race — get single race with abilities, bonuses, lore
   - GET /api/races/:race/abilities — get racial abilities for a race
   - Racial ability activation: POST /api/abilities/racial/use 
     (validates: player has this race, meets level requirement, 
     ability is off cooldown)
   - Racial bonus calculator service: given a player's race, profession, 
     and current location, calculate all active bonuses 
     (profession speed, yield, quality, trade, XP modifiers)
   - Integrate racial stat modifiers into character creation — when 
     player picks a race, apply stat modifiers to their base stats
   - Integrate racial bonuses into existing crafting/gathering systems 
     (if they exist yet — otherwise create hooks for future integration)
   - GET /api/relations/racial — get the full racial relations matrix
   - GET /api/relations/racial/:raceA/:raceB — get specific relationship

4. Teammate "race-frontend" — Build race selection and display UI:
   - Enhanced character creation race selection screen:
     * Large race portrait/illustration area for each race
     * Race lore panel (scrollable backstory text)
     * Stat modifier display (+/- indicators, color coded)
     * Racial trait highlight box
     * Preview of racial abilities (greyed out with level unlock shown)
     * Profession affinity display (shows which professions this race 
       excels at with percentage bonuses)
     * Homeland description and map highlight
     * For Dragonborn: secondary selection for Draconic Ancestry 
       with element/breath weapon preview
   - Race info page accessible from character sheet:
     * Current racial abilities (unlocked and locked with level needed)
     * Active racial bonuses based on current location
     * Racial relations chart showing how your race relates to others
   - Race comparison tool: side-by-side compare 2 races

After all teammates complete and report back, verify: a new player 
can select each of the 7 races, see their stats change based on race, 
Dragonborn can pick an ancestry, racial abilities are tracked correctly, 
and the racial bonus calculator properly computes bonuses. Summarize 
any integration points needed with the economy system.
```

---

## 🔧 PROMPT 16 — World Regions & Towns

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates 
to build the full world map with all regions and towns.

Context: Aethermere has 8 regions, each controlled by a race (plus 
the neutral Suncoast). Each region has 5 towns. Towns have resource 
distributions based on their biome and region. Geography drives the 
economy — mountain towns have ore but no food, plains have grain but 
no ore. There are 40 towns total across the continent.

The 8 regions:
- Verdant Heartlands (Human) — fertile plains, rolling hills
- Silverwood Forest (Elf) — ancient forest, magical glades
- Ironvault Mountains (Dwarf) — underground halls, deep mines
- The Crossroads (Halfling) — rolling hills, trade intersection
- Ashenfang Wastes (Orc) — badlands, volcanic edges
- Shadowmere Marshes (Tiefling) — swamps, bogs, mist
- Frozen Reaches (Dragonborn) — tundra, volcanic peaks
- The Suncoast (Free Cities) — warm coastline, diverse ports

1. Teammate "region-schema" — Extend the Prisma schema with:
   - Region model: (id, name, controllingRace, biomeType, description, 
     lore, dangerLevel, coordinates for map placement)
   - BiomeType enum: PLAINS, FOREST, MOUNTAIN, HILLS, BADLANDS, SWAMP, 
     TUNDRA, VOLCANIC, COASTAL, DESERT, RIVER
   - Update Town model: add regionId, biomeType, coordinates (x,y for 
     map placement), racialMajority, population, prosperityLevel
   - TownResource model update: add abundanceLevel (1-5), 
     depletionRate, regenerationRate, isSeasonallyAvailable
   - TravelRoute model: townA, townB, distance, travelTimeMinutes, 
     dangerLevel, terrainType, blocked (boolean for wars/disasters)
   - RegionBorder model: regionA, regionB, borderType (OPEN, GUARDED, 
     HOSTILE, CLOSED), tariffRate
   - Run migration

2. Teammate "world-seed-data" — Create the complete world seed data:
   
   VERDANT HEARTLANDS (Human):
   - Kingshold (Capital) — Plains, Trade/Politics hub, population 5000
   - Millhaven — Plains, Farming/Ranching, population 2000
   - Bridgewater — River, Trade/Fishing, population 2500
   - Ironford — Hills, Limited Mining/Smithing, population 1800
   - Whitefield — Plains, Cotton/Textiles, population 1500
   
   SILVERWOOD FOREST (Elf):
   - Aelindra (Capital, Treetop) — Forest, Magic/Enchanting, population 3000
   - Moonhaven — Deep Forest, Herbalism/Alchemy, population 1200
   - Thornwatch — Forest Edge, Archery/Fletcher, population 1000
   - Willowmere — Lakeside, Fishing/Scribing, population 1500
   - Eldergrove — Sacred Grove, Religion/Healing, population 800
   
   IRONVAULT MOUNTAINS (Dwarf):
   - Kazad-Vorn (Capital, Underground) — Mountain, Smithing/Politics, pop 4000
   - Deepvein — Deep Mine, Mining/Smelting, population 1500
   - Hammerfall — Mountain Pass, Military/Armoring, population 2000
   - Gemhollow — Cavern, Jeweling/Gems, population 1200
   - Alehearth — Mountain Valley, Brewing/Trade, population 1800
   
   CROSSROADS (Halfling):
   - Hearthshire (Capital) — Hills, Trade/Banking, population 3500
   - Greenhollow — Farm Village, Farming/Cooking, population 2000
   - Peddler's Rest — Trade Hub, Caravans/Merchant, population 2500
   - Bramblewood — Forest Edge, Herbalism/Brewing, population 1200
   - Riverside — River, Fishing/Inns, population 1500
   
   ASHENFANG WASTES (Orc):
   - Grakthar (Capital, Fortress) — Badlands, Military/Politics, pop 3500
   - Bonepile — Badlands, Hunting/Tanning, population 1800
   - Ironfist Hold — Volcanic Edge, Mining/Smelting, population 1500
   - Thornback Camp — Plains Edge, Ranching/Raiding, population 2000
   - Ashen Market — Badlands, Trade/Mercenary, population 1200
   
   SHADOWMERE MARSHES (Tiefling):
   - Nethermire (Capital, Hidden) — Swamp, Alchemy/Politics, pop 2500
   - Boghollow — Deep Swamp, Herbalism/Alchemy, population 1000
   - Mistwatch — Marsh Edge, Trade/Espionage, population 1500
   - Cinderkeep — Volcanic Swamp, Enchanting/Smelting, population 1200
   - Whispering Docks — Coastal Swamp, Fishing/Smuggling, pop 1800
   
   FROZEN REACHES (Dragonborn):
   - Drakenspire (Capital, Mountain Peak) — Tundra/Volcanic, Military, pop 2000
   - Frostfang — Tundra, Hunting/Leatherwork, population 1000
   - Emberpeak — Volcanic, Mining/Smelting, population 1200
   - Scalehaven — Coastal Tundra, Fishing/Trade, population 1500
   - Wyrmrest — Ancient Ruins, Magic/Lore, population 600
   
   THE SUNCOAST (Free Cities):
   - Porto Sole (Capital Free City) — Coastal, Trade/Everything, pop 6000
   - Coral Bay — Coastal, Fishing/Shipbuilding, population 2500
   - Sandrift — Desert Edge, Gems/Glass/Exotic Goods, population 1500
   - Libertad — Coastal, Trade/Entertainment, population 3000
   - Beacon's End — Coastal, Navigation/Cartography, population 1200
   
   For EVERY town, seed:
   - Available resources with abundance levels (1-5)
   - Available building types
   - Starting NPC officials (until players take over)
   - Town description and lore flavor text
   
   Travel routes between all connected towns with:
   - Distance in real-time minutes (15 min for nearby, up to 120 min 
     for cross-region)
   - Danger level (affects bandit ambush chance for caravans)
   - Terrain type (affects travel speed modifiers)
   
   Create comprehensive seed script that populates everything

3. Teammate "world-map-v2" — Rebuild the world map frontend:
   - Full continent map of Aethermere showing all 8 regions
   - Regions color-coded by controlling race with racial crest/emblem
   - Region borders drawn clearly (use dotted lines for contested, 
     red lines for hostile borders, green for allied)
   - All 40 towns shown as icons (size based on population)
   - Town icons reflect type: castle for capitals, pickaxe for mining, 
     wheat for farming, anchor for coastal, tree for forest, etc.
   - Travel routes shown as paths between towns (color coded by 
     danger level: green safe, yellow moderate, red dangerous)
   - Click a region to zoom in and see its towns
   - Click a town to see info panel: name, region, race majority, 
     population, resources, buildings, current mayor
   - Player location marker with "Travel Here" button
   - Region info overlay: race that controls it, lore summary, 
     key resources, relation to player's race
   - Visual style: fantasy parchment map with illustrated terrain 
     (mountains look like mountains, forests like forests)
   - Mini-map always visible in the HUD

4. Teammate "region-mechanics" — Build the regional gameplay mechanics:
   - Racial majority system: track what % of a town's players are 
     each race, determine majority
   - Majority bonuses: if your race is the majority in your town, 
     +10% all profession bonuses
   - Foreign race penalties: calculate trade tariffs, NPC price 
     adjustments, and profession penalties based on racial relations 
     and player's race vs town's racial majority
   - Border crossing system: when traveling between regions, check 
     racial relations:
     * ALLIED/FRIENDLY: pass freely
     * NEUTRAL: small tariff on carried trade goods
     * DISTRUSTFUL: tariff + "watched" status (guards patrol)
     * HOSTILE: high tariff + combat encounter chance at border
     * BLOOD_FEUD: may be refused entry, very high tariff, 
       guaranteed combat encounter chance
   - API: GET /api/regions/:id/bonuses?race=X — calculate all regional 
     bonuses/penalties for a race
   - API: GET /api/borders/:regionA/:regionB — get border status and costs
   - Hook into travel system: border checks happen during travel
   - Hook into marketplace: apply racial tariff to trades

After all teammates complete and report back, verify: the full world 
map renders with all 40 towns across 8 regions, a player can see 
regional info, travel between towns works with border checks and 
tariffs, racial majority bonuses apply correctly, and an Orc trying 
to enter a Dwarven town during a Blood Feud faces appropriate penalties. 
Give me a summary of all integration points with combat, economy, 
and political systems.
```

---

## 🔧 PROMPT 17 — Racial Diplomacy & Player-Driven Relations

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates 
to build the racial diplomacy system that lets players change the 
world's political landscape.

Context: Racial relations start at predetermined defaults (e.g., 
Dwarf-Orc is BLOOD_FEUD, Human-Halfling is ALLIED) but PLAYERS 
can change these over time through political actions, treaties, wars, 
and sustained effort. This is one of the most powerful player-driven 
systems in the game — imagine players organizing a peace treaty 
between Dwarves and Orcs after months of real-time diplomacy.

1. Teammate "diplomacy-backend" — Build the racial diplomacy system:
   - Diplomatic actions that kingdom rulers can take:
     * PROPOSE_TREATY — propose improving relations by one step 
       (e.g., Hostile → Distrustful). Requires approval from the 
       other race's ruler. Costs gold from kingdom treasury.
     * DECLARE_WAR — worsen relations by one step (or declare open war). 
       Unilateral — doesn't need approval. Has consequences.
     * TRADE_AGREEMENT — special pact that reduces tariffs between 
       two specific kingdoms regardless of racial relation
     * NON_AGGRESSION_PACT — prevents PvP between the two kingdoms' 
       players for a set duration
     * ALLIANCE — full military alliance (shared defense, free trade). 
       Only possible at FRIENDLY or better.
     * BREAK_TREATY — cancel an existing agreement (reputation penalty)
   - Diplomacy model: (proposingKingdom, targetKingdom, actionType, 
     status, terms, proposedAt, respondedAt, expiresAt)
   - Relation change requirements:
     * Each step change takes real-time DAYS to take effect
     * Moving from BLOOD_FEUD → HOSTILE requires: treaty + 10,000 gold 
       + 7 real days + both rulers agree + no PvP incidents during waiting
     * Moving from HOSTILE → DISTRUSTFUL: treaty + 5,000 gold + 5 days
     * Moving from DISTRUSTFUL → NEUTRAL: treaty + 2,000 gold + 3 days
     * Moving from NEUTRAL → FRIENDLY: treaty + 5,000 gold + 5 days
     * Moving from FRIENDLY → ALLIED: treaty + 10,000 gold + 7 days + 
       trade agreement must be active for 14+ days first
     * Worsening is always easier and faster than improving
   - Relation change REVERSAL triggers:
     * PvP kills between races during a peace process → reset timer
     * Raided caravan → relation penalty
     * Ruler impeached who signed the treaty → treaty at risk
   - War system:
     * War declared → border PvP zones activate, caravan raids allowed, 
       tariffs spike to maximum, special war quests unlock
     * War score tracked: PvP kills, caravan raids, territory capture
     * War ends when: rulers agree to peace, one side surrenders, 
       or a set real-time duration passes
     * War reparations: losing side pays gold to winner
   - API: POST /api/diplomacy/propose, POST /api/diplomacy/respond, 
     POST /api/diplomacy/declare-war, GET /api/diplomacy/active, 
     GET /api/diplomacy/history, GET /api/diplomacy/war-score

2. Teammate "diplomacy-events" — Build the world events and 
   notification system for diplomacy:
   - Global announcements for major diplomatic events:
     * "The Kingdom of Kazad-Vorn has declared WAR on Grakthar!"
     * "A peace treaty has been proposed between Elves and Orcs!"
     * "The Human-Halfling Alliance has been renewed for another term!"
   - Diplomatic event log: permanent record of all treaties, wars, 
     and relation changes (the game's "history book")
   - War bulletin board: during active wars, show ongoing war score, 
     recent battles, territory status
   - Diplomacy notification system:
     * Rulers get notified of incoming proposals
     * All citizens notified of wars and treaties affecting their kingdom
     * Border town residents warned of relation changes
   - Diplomatic reputation tracking per kingdom:
     * Kingdoms that honor treaties build reputation
     * Treaty-breakers get "Oathbreaker" status (other kingdoms 
       less likely to trust them)
   - Seasonal diplomacy summary: monthly "State of the World" report 
     showing all current relations, active treaties, ongoing wars

3. Teammate "diplomacy-frontend" — Build the diplomacy UI:
   - World Diplomacy Map: overlay on world map showing:
     * Color-coded borders (green=allied, blue=friendly, grey=neutral, 
       yellow=distrustful, orange=hostile, red=blood feud/war)
     * Active treaty icons between kingdoms
     * War indicators (crossed swords) on contested borders
     * Click between two regions to see their full diplomatic history
   - Diplomacy Panel (for kingdom rulers):
     * Propose treaty interface (select target kingdom, select action, 
       set terms, submit)
     * Incoming proposals with accept/reject/counter buttons
     * Active agreements list with expiration dates
     * War management panel: declare war, view war score, sue for peace
   - Diplomacy Panel (for all citizens):
     * View current relations affecting your race/kingdom
     * See active treaties and wars
     * Diplomatic history timeline
     * Petition system: citizens can petition their ruler to pursue 
       specific diplomatic actions (enough signatures = ruler notified)
   - War Dashboard (during active wars):
     * War score (kills, raids, territory)
     * Recent battle log
     * "Enlist" button for war quests and border patrols
     * Enemy kingdom intelligence (if Tiefling spy network active)

After all teammates complete and report back, verify the full 
diplomacy loop: a kingdom ruler proposes a treaty, the other ruler 
accepts, relations begin shifting over real-time days, border tariffs 
update, and the whole server gets notified. Also test: war declaration, 
war score tracking, and peace negotiation. Flag any balance issues 
with the war system.
```

---

## 🔧 PROMPT 18 — Racial Abilities in Combat & Professions

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates 
to integrate racial abilities into combat and profession systems.

Context: Every race has 6 abilities that unlock at character levels 
1, 5, 10, 15, 25, and 40. Some are combat abilities (Orc's Blood Fury, 
Dragonborn's Breath Weapon), some are profession abilities (Dwarf's 
Master Forger, Elf's Communion with Nature), and some are utility 
(Halfling's Luck, Tiefling's Infernal Sight). These need to be wired 
into the actual combat engine, crafting system, and gathering system.

1. Teammate "racial-combat-abilities" — Integrate racial abilities 
   into the combat engine:
   
   Implement these combat abilities:
   
   HUMAN:
   - Rally the People (Lvl 10): active, party buff +2 all stats 1hr, 
     24hr cooldown
   - Indomitable Will (Lvl 40): passive, once per combat reroll failed save
   
   ELF:
   - Elven Accuracy (Lvl 5): passive, advantage (2d20 take higher) 
     on all ranged attacks
   - Spirit Walk (Lvl 40): active, 30sec invisibility, 24hr cooldown
   
   DWARF:
   - Dwarven Resilience (Lvl 5): passive, poison resistance + save bonus
   - Ancestral Fury (Lvl 40): passive, below 25% HP gain +5 STR/CON
   
   HALFLING:
   - Halfling Luck (Lvl 1): active, reroll any d20 once/day
   - Small and Sneaky (Lvl 5): passive, +20% stealth success
   
   ORC:
   - Intimidating Presence (Lvl 1): passive, enemies -1 first attack
   - Relentless Endurance (Lvl 5): passive, survive lethal blow at 1HP once/combat
   - Blood Fury (Lvl 10): passive, +25% damage below 50% HP
   - Orcish Rampage (Lvl 40): passive, bonus attack after killing enemy
   
   TIEFLING:
   - Hellish Resistance (Lvl 1): passive, fire damage halved
   - Infernal Rebuke (Lvl 25): passive, melee attackers take 1d6 fire
   - Soul Bargain (Lvl 40): active, sacrifice 25% HP for double next spell damage
   
   DRAGONBORN:
   - Breath Weapon (Lvl 1): active, 2d6 AoE elemental, once/combat, 
     scales with ancestry type (cone vs line, element)
   - Draconic Scales (Lvl 5): passive, +2 natural AC
   - Frightful Presence (Lvl 15): active, WIS save or frightened
   - Ancient Wrath (Lvl 40): upgrade breath to 4d8, twice/combat
   
   Each ability needs: activation logic, effect application, 
   duration tracking, cooldown management, combat log entries

2. Teammate "racial-profession-abilities" — Integrate racial bonuses 
   into crafting and gathering:
   
   Implement these profession-affecting abilities and bonuses:
   
   HUMAN:
   - Versatile Learner (Lvl 1): +10% profession XP gain (all professions)
   - Diplomatic Tongue (Lvl 5): +15% reputation gain with all races
   - Adaptable Crafter (Lvl 15): allows 4th profession slot
   - Empire Builder (Lvl 25): -10% building construction materials
   - Passive: +5% crafting speed all professions
   - Passive: +10% farming yield in Heartlands
   - Passive: +15% trade profit when selling cross-race
   
   ELF:
   - Keen Senses (Lvl 1): +20% rare resource chance while gathering
   - Communion with Nature (Lvl 10): -25% gathering time in forests
   - Arcane Affinity (Lvl 15): +2 to Enchanting quality rolls
   - Ageless Knowledge (Lvl 25): +15% XP for Enchanter/Herbalist/Scribe
   - Passive: +25% herbalism yield in forest regions
   - Passive: +20% enchanting quality
   - Passive: +15% woodworking quality in Silverwood
   
   DWARF:
   - Darkvision (Lvl 1): access to deep mine nodes others can't reach
   - Master Forger (Lvl 10): +3 to Blacksmith/Armorer quality rolls
   - Stonecunning (Lvl 15): +25% mining yield, +10% gem chance
   - Clan Loyalty (Lvl 25): same-race guild members +5% craft bonus
   - Passive: +30% mining yield in mountains
   - Passive: +25% blacksmithing and armoring quality
   - Passive: +20% smelting efficiency
   
   (Continue pattern for Halfling, Orc, Tiefling, Dragonborn)
   
   Hook each bonus into the actual calculation functions:
   - Gathering yield calculator: add racial bonus
   - Crafting quality roll: add racial bonus
   - Crafting speed calculator: add racial bonus
   - Profession XP gain: add racial multiplier
   - Trade price calculator: add racial trade bonus
   - Building cost calculator: add racial construction bonus

3. Teammate "racial-ability-frontend" — Build the racial ability UI:
   - Racial Abilities tab on character sheet:
     * Show all 6 abilities for player's race in a vertical list
     * Unlocked abilities: full color, icon, name, description, 
       effect details, cooldown indicator (if applicable)
     * Locked abilities: greyed out with "Unlocks at Level X"
     * Active abilities have a "Use" button (greyed when on cooldown)
     * Cooldown timer displayed on active abilities
   - Combat integration:
     * Racial abilities appear in the combat action menu alongside 
       regular actions
     * Breath Weapon shows targeting area (cone/line)
     * Passive abilities shown as buff icons on character portrait
   - Profession integration:
     * When crafting, show racial bonus as a separate line item 
       in the quality calculation preview
       ("Base: d20 | + Prof Level: +8 | + Dwarven Forger: +3 | = ...")
     * When gathering, show racial yield bonus
       ("Base Yield: 5 | + Stonecunning: +25% | = 6")
   - Level up celebration for racial ability unlocks:
     * Special notification: "You have unlocked Ancestral Fury!"
     * Animated reveal of the new ability with full description
   - Dragonborn breath weapon element display on character portrait 
     (subtle glow matching ancestry color)

After all teammates complete and report back, verify: a Dwarf gets 
+3 quality when smithing, an Elf gathers herbs faster in forests, 
an Orc's Blood Fury activates in combat when below 50% HP, a 
Dragonborn's Breath Weapon deals the correct element damage based 
on ancestry, and a Human can learn a 4th profession at level 15. 
Test at least 3 different races through both combat and crafting 
to confirm bonuses apply correctly.
```

---

## 📋 PROMPT SUMMARY — Races & Regions Phase

| Prompt | System | Teammates | Depends On |
|--------|--------|-----------|-----------|
| 15 | Race Foundation (schema, data, APIs, character creation) | 4 | Phase 1 complete |
| 16 | World Regions (40 towns, map, resources, border mechanics) | 4 | Prompt 15 |
| 17 | Racial Diplomacy (treaties, wars, player-driven relations) | 3 | Prompt 16 + Politics (Prompt 5) |
| 18 | Racial Abilities (combat integration, profession bonuses) | 3 | Prompt 15 + Combat (Prompt 4) + Economy (Prompt 9-12) |

**Total teammates across race/region phase: 14**

### Run Order:
```
15 → 16 → 17 (needs politics system from Prompt 5)
         → 18 (needs combat from Prompt 4, can run parallel with 17)
```

### Integration Notes:
- Prompt 16 UPDATES the travel system built in Prompt 2 (adds border checks)
- Prompt 17 EXTENDS the politics system from Prompt 5 (adds inter-kingdom diplomacy)
- Prompt 18 HOOKS INTO combat (Prompt 4) and economy (Prompts 9-12)
- The world seed data from Prompt 16 REPLACES the simpler seed from Prompt 2
- Racial profession bonuses from Prompt 18 MODIFY the gathering/crafting 
  engines built in Prompts 10-12

### Recommended Parallel Execution:
```
Phase 1 (Prompts 0-8) — BUILD FIRST, STABILIZE

Then run in parallel tracks:
  Track A: Economy (9 → 10 → 11 → 12 → 13 → 14)
  Track B: Races  (15 → 16 → 17)

Then integration:
  Prompt 18 (needs both tracks done)
```
