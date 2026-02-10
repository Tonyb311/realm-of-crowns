# Prompt 15 — Race System Foundation (20 Races)
# Dependencies: 01
# Teammates: 5
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 5 teammates
to build the expanded race system foundation for 20 playable races.

Context: Aethermere now has 20 playable races in 3 tiers:
- Core (7): Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn
- Common (6): Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk
- Exotic (7): Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling

Tiers affect starting conditions — Core races get 5-town homelands,
Common get 2-3 towns, Exotic get 1-2 towns or none (Changelings are nomadic).
Some races have sub-races chosen at character creation:
- Dragonborn -> Draconic Ancestry (Red/Blue/White/Black/Green/Gold/Silver)
- Beastfolk -> Animal Clan (Wolf/Bear/Fox/Hawk/Panther/Boar)
- Genasi -> Element (Fire/Water/Earth/Air)

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
     * professionBonuses: map of professionType -> {speedBonus,
       qualityBonus, yieldBonus, xpBonus} (percentages)
     * gatheringBonuses: map of resourceType -> bonus% per biome
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
     professionType + currentTown + currentBiome -> compute all
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
