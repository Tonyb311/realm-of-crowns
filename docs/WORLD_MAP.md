# Realm of Crowns — Races, Regions & Territories
## "The World and Its Peoples"

> Updated 2026-02-08 to reflect all 20 implemented races and 68 seeded towns.

---

## Core Philosophy

Every race has a **homeland** -- a region they historically control. But this is a
player-driven world, so borders shift. A Dwarf can live in Elf lands. An Orc can
become mayor of a Human town. But racial tensions, bonuses, and regional advantages
mean that where you live and what you are MATTERS. Your race isn't just cosmetic --
it shapes your stats, your abilities, your crafting bonuses, how NPCs treat you,
and the political landscape around you.

---

## WORLD MAP OVERVIEW

The world is called **Aethermere** -- a continent divided into **21 territories**
(8 core regions + 6 common race territories + 7 exotic race territories),
containing a total of **68 towns**.

### Implementation Status

All 20 races are fully implemented in `shared/src/data/races/` with:
- TypeScript interfaces (`shared/src/types/race.ts`): `RaceDefinition`, `StatModifiers`, `RacialAbility`, `SubRaceOption`
- Registry (`shared/src/data/races/index.ts`): `getRace()`, `getRacesByTier()`, `getSubRaces()`, `getStatModifiers()`, `getAllRaces()`
- Individual race files in `shared/src/data/races/core/`, `common/`, `exotic/`

All 21 regions and 68 towns are seeded in `database/seeds/world.ts` with biome types, level ranges, population, descriptions, and building features.

### ASCII Map (All Territories)

```
                         +----------------------+
                         |   FROZEN REACHES     |
                         |   (Dragonborn)        |
                         |   +--Skypeak--+       |
                         |   |(Goliath)  |       |
                         +---+----+------+-------+
                                  |
          +-----------------------+----------------------------+
          |                       |                            |
    +-----+------+      +--------+--------+        +----------+-------+
    | IRONVAULT   |      |    VERDANT      |        |  SHADOWMERE      |
    | MOUNTAINS   |      |   HEARTLANDS    |        |   MARSHES        |
    |  (Dwarf)    |      |    (Human)      |        |  (Tiefling)      |
    | +Cogsworth+ |      |  +Twilight +    |        |  +Vel'Naris+     |
    | |(Gnome)  | |      |  | March   |    |        |  |(Drow)   |     |
    +-+----+----+-+      |  |(Half-Elf)|   |        +--+----+----+-----+
          |              +--+----+----+----+                |
          |                      |                          |
    +-----+------+      +-------+--------+        +--------+------+
    | ASHENFANG   |      |  CROSSROADS    |        |  SILVERWOOD    |
    |  WASTES     |      |  (Halfling)    |        |   FOREST       |
    |  (Orc)      |      |               |        |   (Elf)         |
    |+Scarred  +  |      +-------+-------+        | +Mistwood  +   |
    ||Frontier |  |              |                 | |(Firbolg) |   |
    ||(Half-Orc)| |              |                 | +----------+   |
    |+---------+  |      +-------+-------+        | +Glimmerveil+  |
    +-------------+      |   SUNCOAST    |        | |(Faefolk)  |  |
                         | (Free Cities) |        +-+----------+---+
    +----------+         |               |
    |THORNWILDS|         |  +Confluence+ |        +------------+
    |(Beastfolk)|        |  |(Genasi)  | |        | ASHENMOOR  |
    +----------+         +--+----------+-+        |(Revenant)  |
                                                   +------------+
    +----------+         +----------+
    |FOUNDRY   |         |PELAGIC   |
    |(Warforged)|        |DEPTHS    |
    +----------+         |(Merfolk) |
                         +----------+
```

---

## COMPLETE REGION TABLE

### Core Regions (8) -- 5 towns each

| Region | Race | Biome | Level Range | Towns |
|--------|------|-------|-------------|-------|
| Verdant Heartlands | Human | Plains | 1-50 | Kingshold, Millhaven, Bridgewater, Ironford, Whitefield |
| Silverwood Forest | Elf | Forest | 1-50 | Aelindra, Moonhaven, Thornwatch, Willowmere, Eldergrove |
| Ironvault Mountains | Dwarf | Mountain | 1-50 | Kazad-Vorn, Deepvein, Hammerfall, Gemhollow, Alehearth |
| The Crossroads | Halfling | Hills | 1-50 | Hearthshire, Greenhollow, Peddler's Rest, Bramblewood, Riverside |
| Ashenfang Wastes | Orc | Badlands | 1-50 | Grakthar, Bonepile, Ironfist Hold, Thornback Camp, Ashen Market |
| Shadowmere Marshes | Tiefling | Swamp | 1-50 | Nethermire, Boghollow, Mistwatch, Cinderkeep, Whispering Docks |
| Frozen Reaches | Dragonborn | Tundra | 1-50 | Drakenspire, Frostfang, Emberpeak, Scalehaven, Wyrmrest |
| The Suncoast | Neutral (Free Cities) | Coastal | 1-50 | Porto Sole, Coral Bay, Sandrift, Libertad, Beacon's End |

### Common Race Territories (6) -- 2-3 towns each

| Territory | Race | Biome | Level Range | Towns |
|-----------|------|-------|-------------|-------|
| Twilight March | Half-Elf | Forest | 1-40 | Dawnmere, Twinvale, Harmony Point |
| Scarred Frontier | Half-Orc | Badlands | 5-45 | Scarwatch, Tuskbridge, Proving Grounds |
| Cogsworth Warrens | Gnome | Hills | 1-40 | Cogsworth, Sparkhollow, Fumblewick |
| Pelagic Depths | Merfolk | Underwater | 1-45 | Coralspire, Shallows End, Abyssal Reach |
| Thornwilds | Beastfolk | Forest | 5-45 | Thornden, Clawridge, Windrun |
| Glimmerveil | Faefolk | Feywild | 1-50 | Glimmerheart, Dewdrop Hollow, Moonpetal Grove |

### Exotic Race Territories (7) -- 0-2 towns each

| Territory | Race | Biome | Level Range | Towns |
|-----------|------|-------|-------------|-------|
| Skypeak Plateaus | Goliath | Mountain | 10-50 | Skyhold, Windbreak |
| Vel'Naris Underdark | Drow | Underground | 10-50 | Vel'Naris, Gloom Market |
| Mistwood Glens | Firbolg | Forest | 10-50 | Misthaven, Rootholme |
| The Foundry | Warforged | Mountain | 10-50 | The Foundry |
| The Confluence | Genasi | Volcanic | 10-50 | The Confluence, Emberheart |
| Ashenmoor | Revenant | Swamp | 15-50 | Ashenmoor |
| Everywhere | Changeling | -- | -- | (Nomadic -- start anywhere) |

**Total: 68 towns across 21 territories**

---

## BIOME TYPES (from Prisma schema)

| Biome | Regions Using It |
|-------|-----------------|
| PLAINS | Verdant Heartlands |
| FOREST | Silverwood Forest, Twilight March, Thornwilds, Mistwood Glens |
| MOUNTAIN | Ironvault Mountains, Skypeak Plateaus, The Foundry |
| HILLS | The Crossroads, Cogsworth Warrens |
| BADLANDS | Ashenfang Wastes, Scarred Frontier |
| SWAMP | Shadowmere Marshes, Ashenmoor |
| TUNDRA | Frozen Reaches |
| COASTAL | The Suncoast |
| UNDERWATER | Pelagic Depths |
| FEYWILD | Glimmerveil |
| UNDERGROUND | Vel'Naris Underdark |
| VOLCANIC | The Confluence |

---

## RACIAL RELATIONS & DIPLOMACY

### Default Relations (Starting State)

Key: A=Allied, F=Friendly, N=Neutral, D=Distrustful, H=Hostile, BF=Blood Feud

**Core Race Relations (7x7)**

| Race | Humans | Elves | Dwarves | Halflings | Orcs | Tieflings | Dragonborn |
|------|--------|-------|---------|-----------|------|-----------|------------|
| **Humans** | -- | Friendly | Friendly | Allied | Hostile | Distrustful | Neutral |
| **Elves** | Friendly | -- | Neutral | Friendly | Hostile | Distrustful | Neutral |
| **Dwarves** | Friendly | Neutral | -- | Friendly | **Blood Feud** | Distrustful | Neutral |
| **Halflings** | Allied | Friendly | Friendly | -- | Neutral | Neutral | Neutral |
| **Orcs** | Hostile | Hostile | **Blood Feud** | Neutral | -- | Neutral | Wary |
| **Tieflings** | Distrustful | Distrustful | Distrustful | Neutral | Neutral | -- | Neutral |
| **Dragonborn** | Neutral | Neutral | Neutral | Neutral | Wary | Neutral | -- |

The full 20x20 matrix is documented in `docs/RACES.md`.

### Relation Effects on Gameplay

| Relation | Effect |
|----------|--------|
| **Allied** | Free trade, no tariffs, free town entry, shared military |
| **Friendly** | Reduced tariffs, welcome in towns, small trade bonus |
| **Neutral** | Normal tariffs, no bonuses or penalties |
| **Distrustful** | Higher tariffs, NPCs charge 10% more, some quests unavailable |
| **Hostile** | 25% tariff, guards watch you, PvP risk near borders |
| **Blood Feud** | 50% tariff, may be refused town entry, border PvP zones active |

### Relationship Alliances

- **Outcasts stick together**: Tieflings, Drow, Revenants, Changelings are Friendly with each other
- **Nature allies**: Elves, Firbolgs, Faefolk, Beastfolk tend Allied/Friendly
- **Craft allies**: Dwarves, Gnomes, Warforged share crafter respect
- **Everyone distrusts Changelings**: shapeshifters make people nervous
- **Everyone is uncomfortable around Revenants**: the undying are unsettling
- **Halflings are Neutral-to-Friendly with nearly everyone**: traders, not fighters
- **Dragonborn and Genasi respect each other**: elemental kinship

Players CAN change racial relations through diplomacy, treaties, and sustained effort.

---

## LIVING IN FOREIGN LANDS

A player of any race can live in any town, but there are consequences:

### Racial Majority Bonuses

- Living where your race is the majority: **+10% all profession bonuses**
- Living where your race is welcome (Friendly+): **Normal, no bonus**
- Living where your race is distrusted: **-5% profession yields, NPCs charge more**
- Living during a Blood Feud: **-15% everything, PvP risk, can't run for office**

### Racial Minority Opportunities

Being a minority is not all bad:
- A **Dwarf Blacksmith in a Human town** has less competition and can charge premiums
- An **Elf Enchanter in Orc lands** fills a unique niche Orcs can't fill themselves
- A **Tiefling Alchemist anywhere** commands high demand for superior potions

This creates a meaningful choice: stay home for bonuses, or move where your skills are rare?

---

## REGION RESOURCE SUMMARY

| Region | Primary Resources | Secondary Resources | Scarce Resources |
|--------|------------------|--------------------|-----------------|
| **Verdant Heartlands** (Human) | Grain, Cotton, Livestock | Herbs, Softwood | Ore, Gems, Exotic Materials |
| **Silverwood** (Elf) | Exotic Wood, Herbs, Arcane Reagents | Softwood, Leather | Ore, Stone, Grain |
| **Ironvault Mountains** (Dwarf) | All Ores, Gems, Stone, Coal | Limited Grain (mushroom farms) | Wood, Herbs, Fish, Livestock |
| **Crossroads** (Halfling) | Grain, Herbs, Vegetables | Fish (rivers), Softwood | Ore, Exotic Materials |
| **Ashenfang Wastes** (Orc) | Leather, Bone, Obsidian, War Beasts | Limited Iron, Stone | Wood, Grain, Herbs, Fish |
| **Shadowmere Marshes** (Tiefling) | Rare Herbs, Reagents, Mushrooms | Fish, Some Wood | Ore, Grain, Livestock |
| **Frozen Reaches** (Dragonborn) | Mithril, Adamantine, Exotic Furs | Fish (coastal), Stone | Wood, Grain, Most Herbs |
| **Suncoast** (Free Cities) | Fish, Salt, Sand/Glass, Gems (limited) | Trade goods (everything passes through) | Ore, Wood, Livestock |

This table IS the economy. Every race needs what another race has. **Trade is survival.**

---

## 11 EXCLUSIVE RESOURCE ZONES

| Zone | Race | Exclusive Resources |
|------|------|-------------------|
| Deep Ocean | Merfolk | Deep Sea Iron, Abyssal Pearl, Living Coral, Sea Silk |
| Underdark | Drow | Darksteel Ore, Spider Silk, Shadow Crystal |
| Feywild (Lvl 40) | Faefolk | Moonpetal, Dreamweave Silk, Starlight Dust, Fey Iron |
| Sky Peaks | Goliath | Sky Iron, Cloud Crystal, Giant Eagle Feather |
| Deepwood Groves | Firbolg | Heartwood, Living Bark, Elder Sap, Spirit Moss |
| Foundry Core | Warforged | Arcane Conduit, Soul Crystal, Living Metal |
| Elemental Rifts (x4) | Genasi | Pure Element Essences, Elemental Cores |
| Ashenmoor Deadlands | Revenant | Death Blossom, Soul Dust, Grave Iron |
| Deep Thornwilds | Beastfolk | Spirit Beast Hide, Primal Bone, Thornwood |
| Dragon Lairs | Dragonborn | Dragon Scale, Dragon Bone, Dragon Blood |
| Deep Mines | Dwarf | Mithril, Adamantine (deep veins) |

Every exotic race has access to something no one else can easily get -- this is their economic leverage and reason to be valued despite being rare and sometimes distrusted.

---

## Cross-Reference

- **Full 20-race compendium** (stats, abilities, profession bonuses, lore): `docs/RACES.md`
- **Economy system design** (professions, crafting chains, marketplace): `docs/ECONOMY.md`
- **Race implementation code**: `shared/src/data/races/`
- **World seed data**: `database/seeds/world.ts`
