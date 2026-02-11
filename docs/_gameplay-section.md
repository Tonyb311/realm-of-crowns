# Gameplay Systems Reference

> Complete documentation of every gameplay system in Realm of Crowns.
> Each section contains both a **player-friendly guide** and a **technical breakdown** with file paths, endpoints, and data flow.

---

## Table of Contents

- [A. Character System](#a-character-system)
  - [A.1 Races Overview](#a1-races-overview)
  - [A.2 Race Stat Comparison](#a2-race-stat-comparison)
  - [A.3 Core Races (7)](#a3-core-races-7)
  - [A.4 Common Races (6)](#a4-common-races-6)
  - [A.5 Exotic Races (7)](#a5-exotic-races-7)
  - [A.6 Sub-Races](#a6-sub-races)
  - [A.7 Classes & Specializations](#a7-classes--specializations)
  - [A.8 Technical: Character System](#a8-technical-character-system)
- [B. World & Travel](#b-world--travel)
  - [B.1 Regions](#b1-regions)
  - [B.2 Towns](#b2-towns)
  - [B.3 Travel System](#b3-travel-system)
  - [B.4 Technical: World & Travel](#b4-technical-world--travel)
- [C. Economy & Professions](#c-economy--professions)
  - [C.1 Profession Overview](#c1-profession-overview)
  - [C.2 Profession Tiers](#c2-profession-tiers)
  - [C.3 Gathering Professions (7)](#c3-gathering-professions-7)
  - [C.4 Crafting Professions (15)](#c4-crafting-professions-15)
  - [C.5 Service Professions (7)](#c5-service-professions-7)
  - [C.6 Quality System](#c6-quality-system)
  - [C.7 Marketplace](#c7-marketplace)
  - [C.8 Racial Profession Bonuses](#c8-racial-profession-bonuses)
  - [C.9 Technical: Economy](#c9-technical-economy)
- [D. Combat System](#d-combat-system)
  - [D.1 Combat Overview](#d1-combat-overview)
  - [D.2 Core Formulas](#d2-core-formulas)
  - [D.3 Status Effects](#d3-status-effects)
  - [D.4 PvE Combat](#d4-pve-combat)
  - [D.5 PvP Combat](#d5-pvp-combat)
  - [D.6 Death & Penalties](#d6-death--penalties)
  - [D.7 Racial Combat Abilities](#d7-racial-combat-abilities)
  - [D.8 Technical: Combat](#d8-technical-combat)

---

# A. Character System

## A.1 Races Overview

Realm of Crowns features **20 playable races** organized into three tiers that determine starting gold and overall complexity:

| Tier | Starting Gold | Races | Playstyle |
|------|--------------|-------|-----------|
| **Core** (7) | 100g | Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn | Straightforward, strong racial identity |
| **Common** (6) | 75g | Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk | Hybrid mechanics, some trade-offs |
| **Exotic** (7) | 50g | Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling | High complexity, unique mechanics, lower starting gold |

Every character begins with **base 10 in all six stats** (STR, DEX, CON, INT, WIS, CHA), modified by racial bonuses. Each race provides:

- **6 racial abilities** that unlock at levels 1, 5, 10, 15, 25, and 40
- **Profession bonuses** (speed, quality, yield, or XP multipliers for specific trades)
- **Gathering bonuses** (percentage yield bonuses for specific resource types in specific biomes)
- **A homeland region** and **starting towns** (3-5 towns per race)
- Some races have **sub-races**, **exclusive zones**, or **special mechanics**

---

## A.2 Race Stat Comparison

All values are modifiers applied to the base 10 in each stat. Positive = bonus, negative = penalty.

### Core Races

| Race | STR | DEX | CON | INT | WIS | CHA | Net | Homeland |
|------|-----|-----|-----|-----|-----|-----|-----|----------|
| **Human** | +1 | +1 | +1 | +1 | +1 | +1 | +6 | The Verdant Heartlands |
| **Elf** | 0 | +3 | -1 | +2 | +2 | +1 | +7 | The Silverwood Forest |
| **Dwarf** | +2 | -1 | +3 | +1 | +1 | 0 | +6 | The Ironvault Mountains |
| **Halfling** | -1 | +3 | +1 | +1 | +1 | +2 | +7 | The Crossroads |
| **Orc** | +4 | 0 | +3 | -1 | 0 | -1 | +5 | The Ashenfang Wastes |
| **Tiefling** | 0 | +1 | 0 | +3 | +1 | +2 | +7 | Shadowmere Marshes |
| **Dragonborn** | +3 | -1 | +2 | +1 | +2 | 0 | +7 | The Frozen Reaches |

### Common Races

| Race | STR | DEX | CON | INT | WIS | CHA | Net | Homeland |
|------|-----|-----|-----|-----|-----|-----|-----|----------|
| **Half-Elf** | 0 | +2 | +1 | +1 | +1 | +3 | +8 | The Twilight March |
| **Half-Orc** | +3 | +1 | +2 | 0 | +1 | 0 | +7 | The Scarred Frontier |
| **Gnome** | -2 | +2 | +1 | +4 | +1 | +1 | +7 | The Clockwork Warrens |
| **Merfolk** | +1 | +2 | +2 | 0 | +2 | +1 | +8 | The Pelagic Depths |
| **Beastfolk** | +2 | +2 | +2 | -1 | +2 | -1 | +6 | The Thornwilds |
| **Faefolk** | -3 | +4 | -2 | +2 | +3 | +3 | +7 | The Feywild Threshold |

### Exotic Races

| Race | STR | DEX | CON | INT | WIS | CHA | Net | Homeland |
|------|-----|-----|-----|-----|-----|-----|-----|----------|
| **Goliath** | +4 | 0 | +4 | -1 | +1 | -2 | +6 | The Skyspire Peaks |
| **Drow** | 0 | +3 | 0 | +2 | +1 | +2 | +8 | The Underdark |
| **Firbolg** | +2 | 0 | +2 | 0 | +4 | 0 | +8 | The Eldergrove |
| **Warforged** | +2 | 0 | +3 | +2 | 0 | -2 | +5 | The Foundry |
| **Genasi** | +1 | +1 | +1 | +2 | +1 | +1 | +7 | The Confluence |
| **Revenant** | +2 | 0 | +3 | +1 | +2 | -2 | +6 | The Ashenmoor |
| **Changeling** | 0 | +2 | 0 | +2 | +1 | +4 | +9 | None (start anywhere) |

> **Tip**: Changeling has the highest net stat total (+9) but the lowest starting gold (50g) and no hometown. Faefolk have extreme highs (+4 DEX, +3 WIS/CHA) and extreme lows (-3 STR, -2 CON) -- the game's "hard mode" for physical activities.

---

## A.3 Core Races (7)

### Human
*"Humans build empires, and their kingdoms have risen and fallen more times than any scholar can count."*

- **Trait**: Adaptive -- +1 to ALL stats
- **Starting Towns**: Kingshold, Millhaven, Bridgewater, Ironford, Whitefield

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Versatile Learner | Passive | +10% XP gain for ALL professions |
| 5 | Diplomatic Tongue | Passive | +15% reputation gain with all races |
| 10 | Rally the People | Active (24h CD) | Party buff: +2 all stats for 1 hour |
| 15 | Adaptable Crafter | Passive | Can learn a 4th profession (normally max 3) |
| 25 | Empire Builder | Passive | Buildings cost 10% fewer materials |
| 40 | Indomitable Will | Passive | Once per combat, reroll a failed saving throw |

**Profession Bonuses**: +10% farming yield, +5% all crafting speed, +15% trading yield
**Gathering Bonuses**: +5% across all resource types (generalist)

---

### Elf
*"What can a creature that lives 80 years truly understand?"*

- **Trait**: Graceful -- high DEX and mental stats, physically frail
- **Starting Towns**: Aelindra, Moonhaven, Thornwatch, Willowmere, Eldergrove

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Keen Senses | Passive | +20% chance to find rare resources while gathering |
| 5 | Elven Accuracy | Passive | Advantage (roll 2d20, take higher) on ranged attacks |
| 10 | Communion with Nature | Passive | Gathering in forests takes 25% less time |
| 15 | Arcane Affinity | Passive | +2 bonus to Enchanting quality rolls |
| 25 | Ageless Knowledge | Passive | +15% XP for Enchanter, Herbalist, Scribe |
| 40 | Spirit Walk | Active (24h CD) | Invisibility for 30 seconds |

**Profession Bonuses**: +25% herbalism yield, +20% enchanting quality, +15% woodworking quality, +10% alchemy quality
**Gathering Bonuses**: +15% HERB (forest), +10% WOOD (forest), +5% FIBER (any)

---

### Dwarf
*"A Dwarven blade is worth three Human-made ones."*

- **Trait**: Stoneborn -- incredibly tough but slow
- **Starting Towns**: Kazad-Vorn, Deepvein, Hammerfall, Gemhollow, Alehearth
- **Exclusive Zone**: Deep Mines (accessible only to Dwarves)

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Darkvision | Passive | Access deep mine nodes others cannot reach |
| 5 | Dwarven Resilience | Passive | Poison resistance, +3 to poison saving throws |
| 10 | Master Forger | Passive | +3 to Blacksmith/Armorer quality rolls |
| 15 | Stonecunning | Passive | +25% mining yield, +10% gem discovery |
| 25 | Clan Loyalty | Passive | Same-race guild members get +5% crafting bonus |
| 40 | Ancestral Fury | Passive | Below 25% HP: +5 STR and +5 CON |

**Profession Bonuses**: +30% mining yield, +25% blacksmithing quality, +25% armoring quality, +20% smelting speed, +15% masonry quality
**Gathering Bonuses**: +20% ORE (mountain), +15% STONE (mountain), +15% ORE (underground)

---

### Halfling
*"Small in stature, enormous in influence."*

- **Trait**: Lucky -- quick, charming, impossibly fortunate
- **Starting Towns**: Hearthshire, Greenhollow, Peddler's Rest, Bramblewood, Riverside

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Halfling Luck | Active (24h CD) | Reroll any single d20 roll |
| 5 | Small and Sneaky | Passive | +20% stealth success rate |
| 10 | Silver Tongue | Passive | Buy for 5% less, sell for 5% more on marketplace |
| 15 | Nimble Fingers | Passive | +15% speed on all crafting and gathering |
| 25 | Trade Network | Passive | See marketplace prices in ALL towns (global visibility) |
| 40 | Feast Master | Passive | Food you cook gives double buff duration |

**Profession Bonuses**: +25% cooking quality, +20% brewing quality, +20% trading yield, +15% farming yield, +10% all gathering speed
**Gathering Bonuses**: +10% HERB (plains), +10% FIBER (plains), +10% FISH (coast)

---

### Orc
*"Orc society is built on strength, combat honor, and the clan."*

- **Trait**: Savage Might -- raw physical power, unmatched in melee
- **Starting Towns**: Grakthar, Bonepile, Ironfist Hold, Thornback Camp, Ashen Market

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Intimidating Presence | Passive | Enemies -1 to first attack roll against you |
| 5 | Relentless Endurance | Passive | Once per combat, survive lethal blow at 1 HP |
| 10 | Blood Fury | Passive | +25% damage when below 50% HP |
| 15 | Warbeast Bond | Passive | Mounts get +20% combat stats |
| 25 | Clan Warhorn | Active (24h CD) | Party: +3 STR for 1 hour |
| 40 | Orcish Rampage | Passive | Bonus attack after killing an enemy |

**Profession Bonuses**: +30% hunting yield, +20% tanning quality, +20% leatherworking quality, +15% ranching speed, +10% combat loot yield
**Gathering Bonuses**: +15% HIDE (any), +10% ORE (mountain), +5% WOOD (any)

---

### Tiefling
*"Secrets are currency."*

- **Trait**: Infernal Legacy -- magically gifted with a dark edge
- **Starting Towns**: Nethermire, Boghollow, Mistwatch, Cinderkeep, Whispering Docks

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Hellish Resistance | Passive | Fire damage halved |
| 5 | Infernal Sight | Passive | See hidden/invisible players and traps |
| 10 | Dark Knowledge | Passive | +20% XP for Alchemy and Enchanting |
| 15 | Whispers of the Damned | Active (1h CD) | Read another player's equipment and stats |
| 25 | Infernal Rebuke | Passive | Melee attackers take 1d6 fire damage |
| 40 | Soul Bargain | Active (24h CD) | Sacrifice 25% HP for double next spell damage |

**Profession Bonuses**: +30% alchemy quality, +20% enchanting quality, +25% herbalism yield, +15% scribing quality
**Gathering Bonuses**: +15% ORE (underground), +10% HERB (underground), +5% STONE (underground)

---

### Dragonborn
*"Rare, respected, and feared."*

- **Trait**: Dragon Blood -- physically powerful with innate elemental magic
- **Starting Towns**: Drakenspire, Frostfang, Emberpeak, Scalehaven, Wyrmrest
- **Exclusive Zone**: Dragon Lairs
- **Sub-Races**: 7 draconic ancestries (see [Sub-Races](#a6-sub-races))

| Lvl | Ability | Type | Effect |
|-----|---------|------|--------|
| 1 | Breath Weapon | Active (1/combat) | 2d6 AoE elemental damage (ancestry type) |
| 5 | Draconic Scales | Passive | +2 natural AC |
| 10 | Elemental Resistance | Passive | Half damage from ancestry element |
| 15 | Frightful Presence | Active (1/combat) | WIS save or enemies frightened |
| 25 | Dragon's Hoard | Passive | +20% gold from all sources |
| 40 | Ancient Wrath | Passive | Breath Weapon upgrades to 4d8, usable 2x per combat |

**Profession Bonuses**: +20% mining yield, +20% smelting quality, +15% hunting yield, +15% enchanting quality, +25% combat loot yield
**Gathering Bonuses**: +10% ORE (any), +10% STONE (mountain), +5% HIDE (any)

---

## A.4 Common Races (6)

### Half-Elf
*"Bridges across racial divides."*

- **Trait**: Dual Heritage -- exceptional charisma and social grace
- **Homeland**: The Twilight March
- **Key Abilities**: Fey Ancestry (sleep immune), Versatile Heritage (choose elf OR human ability), Paragon of Two Worlds (both at lvl 40)

### Half-Orc
*"What you DO matters more than what you ARE."*

- **Trait**: Relentless -- strong and surprisingly quick
- **Homeland**: The Scarred Frontier
- **Key Abilities**: Savage Attacks (extra crit die), Unstoppable Force (3 auto-hit attacks at lvl 40)

### Gnome
*"Endlessly curious people who live in elaborate burrow-cities."*

- **Trait**: Inventive Mind -- brilliant intellect, tiny stature
- **Homeland**: The Clockwork Warrens
- **Key Abilities**: Tinker's Insight (+15% quality tier upgrade chance), Eureka Moment (instant craft), Grand Innovation (weekly unique bonus property at lvl 40)

### Merfolk
*"In water, they are unmatched."*

- **Trait**: Amphibious -- breathes water and air, slower on land
- **Homeland**: The Pelagic Depths
- **Special Mechanics**: 15% land speed penalty, access to underwater zones with exclusive resources (Deep Sea Iron, Abyssal Pearls, Living Coral, Sea Silk, Leviathan Bone, Tideweave Kelp)
- **Key Abilities**: Waterborne (underwater zone access), Tidal Surge (water AoE), Abyssal Harvest (exclusive deep-sea gathering at lvl 40)

### Beastfolk
*"Hunters, trackers, and rangers without equal."*

- **Trait**: Primal Instinct -- physically gifted with supernatural senses
- **Homeland**: The Thornwilds
- **Exclusive Zone**: Deep Thornwilds
- **Sub-Races**: 6 clans (Wolf, Bear, Fox, Hawk, Panther, Boar) with different bonuses
- **Key Abilities**: Predator's Senses (detect hidden resources), Beast Form (transform for combat bonuses), Alpha Pack (party hunting buff at lvl 40)

### Faefolk
*"Playing as Faefolk is the game's hard mode."*

- **Trait**: Fey Nature -- impossibly agile and magically gifted, fragile as glass
- **Homeland**: The Feywild Threshold
- **Special Mechanics**: Access to Feywild zones (Moonpetal Flowers, Dreamweave Silk, Starlight Dust, Fey Iron), NEGATIVE profession bonuses for physical crafting (blacksmithing, armoring, mining, masonry)
- **Key Abilities**: Flutter (bypass terrain), Glamour (shape perception), Feywild Step (teleport), Wild Magic Surge (random powerful effect at lvl 40)

---

## A.5 Exotic Races (7)

### Goliath
*"In the merciless heights, only the strong survive."*

- **Trait**: Mountain Born -- immense physical power
- **Homeland**: The Skyspire Peaks
- **Key Abilities**: Stone's Endurance (1d12+CON damage reduction), Powerful Build (double carry weight, wield 2H weapons in 1 hand), Titan's Grip (+1d8 melee damage at lvl 40)

### Drow (Dark Elf)
*"Master poisoners, shadow mages, and the finest spider-silk weavers."*

- **Trait**: Shadowborn -- agile and magically potent, weakened by direct sunlight
- **Homeland**: The Underdark
- **Special Mechanics**: Sunlight Sensitivity (penalties during daytime on surface), access to Underdark zones with exclusive resources (Darksteel Ore, Spider Silk, Gloomcap Mushrooms, Shadow Crystals, Underdark Pearls)
- **Key Abilities**: Superior Darkvision, Shadow Step, Matriarch's Command (mass fear at lvl 40)

### Firbolg
*"They can speak to plants and animals."*

- **Trait**: Nature's Guardian -- immense wisdom and nature connection
- **Homeland**: The Eldergrove
- **Key Abilities**: Speech of Beast and Leaf (animal/plant intel), Nature's Bounty (+30% gathering yield), Guardian Form (treant transformation at lvl 40)
- **Trade-off**: Negative bonuses for mining, smelting, and building professions

### Warforged
*"They don't eat, sleep, or breathe -- but they do need maintenance."*

- **Trait**: Living Construct -- repaired, not healed
- **Homeland**: The Foundry
- **Special Mechanics**: No food or rest required, but needs daily maintenance (1% stat degradation per day without), cannot be a Healer profession
- **Key Abilities**: Constructed Resilience (disease/poison immune), Tireless Worker (+50% crafting queue capacity), Overclock (2x crafting speed with breakdown risk), Siege Mode (massive combat form at lvl 40)

### Genasi
*"Walking fonts of elemental magic."*

- **Trait**: Elemental Soul -- balanced with strong elemental affinity
- **Homeland**: The Confluence
- **Sub-Races**: 4 elements (Fire, Water, Earth, Air) with element-specific profession and combat bonuses
- **Key Abilities**: Elemental Resistance, Elemental Crafting (+quality for element-matching items), Primordial Awakening (major elemental transformation at lvl 40)

### Revenant
*"Fully conscious, fully sentient, and fully annoyed at being perpetually stuck."*

- **Trait**: Deathless -- extraordinarily hard to kill
- **Homeland**: The Ashenmoor
- **Special Mechanics**: 50% reduced death penalty (gold/XP loss), 50% faster respawn
- **Key Abilities**: Undying (auto-revive once per combat), Life Drain (heal from damage dealt), Army of the Dead (summon fallen enemies at lvl 40)

### Changeling
*"If you need to know something, find a Changeling. If you can."*

- **Trait**: Shapechanger -- supreme social manipulators
- **Homeland**: None (no starting towns -- can start in any race's town with no racial penalties)
- **Special Mechanics**: The Veil Network (unlocked at lvl 25 -- buy and sell intelligence)
- **Key Abilities**: Change Appearance (impersonate any race), Read Person (see NPC disposition), Master of Many Faces (assume racial abilities of impersonated race at lvl 40)

---

## A.6 Sub-Races

### Dragonborn Ancestries (7)

| Ancestry | Element | Resistance | Breath Shape |
|----------|---------|------------|--------------|
| Red | Fire | Fire | 15ft Cone |
| Blue | Lightning | Lightning | 30ft Line |
| White | Cold | Cold | 15ft Cone |
| Black | Acid | Acid | 30ft Line |
| Green | Poison | Poison | 15ft Cone |
| Gold | Radiant | Radiant | 15ft Cone |
| Silver | Cold | Cold | 30ft Line |

### Beastfolk Clans (6)
Wolf, Bear, Fox, Hawk, Panther, Boar -- each grants different stat emphasis and Beast Form transformation bonuses.

### Genasi Elements (4)
Fire, Water, Earth, Air -- each provides element-specific crafting bonuses, combat abilities, and gathering advantages.

---

## A.7 Classes & Specializations

There are **7 classes** (Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion), each with **3 specializations** (chosen at level 10, permanent). Each specialization has **6 abilities** unlocked through a skill tree using skill points. **126 total abilities** across all classes.

### Warrior
> Melee powerhouse. Choose between raw damage, tanking, or group support.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Berserker** | DPS (rage/damage) | Reckless Strike, Blood Rage, Cleave, Frenzy, Berserker Rage, Undying Fury |
| **Guardian** | Tank (shield) | Shield Bash, Fortify, Taunt, Shield Wall, Iron Bulwark, Unbreakable |
| **Warlord** | Support (buffs) | Rally Cry, Commanding Strike, Tactical Advance, Inspiring Presence, Warlord's Decree, Legendary Commander |

### Mage
> Ranged spellcaster. Choose between elemental destruction, death magic, or crowd control.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Elementalist** | AoE DPS | Fireball, Frost Lance, Chain Lightning, Elemental Shield, Meteor Strike, Arcane Mastery |
| **Necromancer** | DoT/Drain | Life Drain, Shadow Bolt, Corpse Explosion, Bone Armor, Soul Harvest, Lichdom |
| **Enchanter** | Control/Debuff | Arcane Bolt, Enfeeble, Haste, Mana Siphon, Polymorph, Spell Weaver |

### Rogue
> Agile striker. Choose between burst assassination, resource theft, or sustained melee.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Assassin** | Burst DPS | Backstab, Vanish, Poison Blade, Ambush, Death Mark, Shadow Mastery |
| **Thief** | Utility/Economy | Pilfer, Smoke Bomb, Quick Fingers, Disengage, Mug, Treasure Sense |
| **Swashbuckler** | Sustained Melee | Riposte, Dual Strike, Evasion, Flurry of Blades, Dance of Steel, Untouchable |

### Cleric
> Divine caster. Choose between healing, holy combat, or punishing magic.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Healer** | Healing/Support | Healing Light, Purify, Regeneration, Divine Shield, Resurrection, Miracle |
| **Paladin** | Holy Tank/DPS | Smite, Holy Armor, Consecrate, Judgment, Divine Wrath, Avatar of Light |
| **Inquisitor** | Offensive Caster | Denounce, Penance, Silence, Purging Flame, Excommunicate, Inquisitor's Verdict |

### Ranger
> Ranged/nature hybrid. Choose between pet combat, marksmanship, or trap control.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Beastmaster** | Pet DPS | Call Companion, Wild Bond, Pack Tactics, Bestial Fury, Alpha Predator, Spirit Bond |
| **Sharpshooter** | Ranged DPS | Aimed Shot, Multi-Shot, Piercing Arrow, Headshot, Rain of Arrows, Eagle's Eye |
| **Tracker** | Control/Traps | Lay Trap, Snare, Hunter's Mark, Explosive Trap, Predator Instinct, Master Tracker |

### Bard
> Social/hybrid class. Choose between diplomacy, combat support, or knowledge.

| Specialization | Role | Abilities |
|---------------|------|-----------|
| **Diplomat** | Social/Buff | Charming Words, Silver Tongue, Soothing Presence, Diplomat's Gambit, Enthrall, Legendary Charisma |
| **Battlechanter** | Combat Support | War Song, Discordant Note, Marching Cadence, Shatter, Crescendo, Epic Finale |
| **Lorekeeper** | Intel/Debuff | Analyze, Recall Lore, Exploit Weakness, Arcane Insight, Tome of Secrets, Omniscient |

---

## A.8 Technical: Character System

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `shared/src/data/races/index.ts` | 71 | Race registry, helper functions (getRace, getRacesByTier, etc.) |
| `shared/src/data/races/core/*.ts` | 7 files | Core race definitions (human, elf, dwarf, halfling, orc, tiefling, dragonborn) |
| `shared/src/data/races/common/*.ts` | 6 files | Common race definitions (halfElf, halfOrc, gnome, merfolk, beastfolk, faefolk) |
| `shared/src/data/races/exotic/*.ts` | 7 files | Exotic race definitions (goliath, drow, firbolg, warforged, genasi, revenant, changeling) |
| `shared/src/types/race.ts` | ~60 | Type definitions: RaceDefinition, StatModifiers, RacialAbility, SubRaceOption |
| `shared/src/data/skills/index.ts` | 45 | Class ability registry, VALID_CLASSES, SPECIALIZATIONS map |
| `shared/src/data/skills/warrior.ts` | ~180 | 18 warrior abilities across 3 specializations |
| `shared/src/data/skills/mage.ts` | ~180 | 18 mage abilities across 3 specializations |
| `shared/src/data/skills/rogue.ts` | ~180 | 18 rogue abilities across 3 specializations |
| `shared/src/data/skills/cleric.ts` | ~180 | 18 cleric abilities across 3 specializations |
| `shared/src/data/skills/ranger.ts` | ~180 | 18 ranger abilities across 3 specializations |
| `shared/src/data/skills/bard.ts` | ~180 | 18 bard abilities across 3 specializations |
| `server/src/routes/characters.ts` | 311 | Character creation/management API |
| `server/src/routes/skills.ts` | 292 | Skill tree/specialization API |

### API Endpoints

**Character Management** (`server/src/routes/characters.ts`)
- `POST /characters/create` -- Create character (name 3-20 chars, race, class, subRace?, startingTown). Base stats = 10 + race modifiers. HP = 10 + CON modifier + class bonus. Starting gold: core=100, common=75, exotic=50.
- `GET /characters/me` -- Get authenticated player's character
- `GET /characters/:id` -- Get public character view
- `POST /characters/allocate-stats` -- Spend unspentStatPoints. CON gives +2 HP per point, INT/WIS gives +1 mana.

**Skill System** (`server/src/routes/skills.ts`)
- `GET /skills/tree` -- Full skill tree with unlocked/canUnlock status per ability
- `POST /skills/specialize` -- Choose specialization (requires level 10, one-time only)
- `POST /skills/unlock` -- Unlock ability (validates class, specialization, prerequisites, level, skill points)
- `GET /skills/abilities` -- Get unlocked abilities for use in combat

### Data Flow
1. Client sends `POST /characters/create` with `{ name, race, class, subRace?, startingTown }`
2. Server validates race exists in `RaceRegistry`, validates startingTown is in race's `startingTowns` array
3. Stats computed: base 10 + `RaceRegistry[race].statModifiers`
4. HP computed: `10 + getModifier(stats.con) + CLASS_HP_BONUS[class]`
5. Character saved to database with starting gold based on tier
6. At level 10, `POST /skills/specialize` locks in specialization permanently
7. Skill points earned per level are spent via `POST /skills/unlock` following prerequisite chains

---

# B. World & Travel

## B.1 Regions

The world of Aethermere contains **21 regions** organized by race tier affinity:

### Core Regions (8)

| Region | Biome | Levels | Primary Race |
|--------|-------|--------|-------------|
| The Verdant Heartlands | Temperate Plains | 1-15 | Human |
| The Silverwood Forest | Ancient Forest | 1-15 | Elf |
| The Ironvault Mountains | Mountain/Underground | 1-15 | Dwarf |
| The Crossroads | Rolling Hills | 1-15 | Halfling |
| The Ashenfang Wastes | Volcanic Badlands | 5-20 | Orc |
| Shadowmere Marshes | Swamp/Bog | 5-20 | Tiefling |
| The Frozen Reaches | Arctic Tundra | 5-20 | Dragonborn |
| The Shattered Coast | Coastal | 1-10 | Neutral |

### Common Regions (6)

| Region | Biome | Levels | Primary Race |
|--------|-------|--------|-------------|
| The Twilight March | Border Forest | 5-20 | Half-Elf |
| The Scarred Frontier | War-torn Plains | 10-25 | Half-Orc |
| The Clockwork Warrens | Underground/Hills | 5-20 | Gnome |
| The Pelagic Depths | Ocean/Coastal | 10-30 | Merfolk |
| The Thornwilds | Dense Wilderness | 10-30 | Beastfolk |
| The Feywild Threshold | Magical Forest | 15-35 | Faefolk |

### Exotic Regions (7)

| Region | Biome | Levels | Primary Race |
|--------|-------|--------|-------------|
| The Skyspire Peaks | Extreme Mountain | 20-40 | Goliath |
| The Underdark | Deep Underground | 20-40 | Drow |
| The Eldergrove | Primeval Forest | 15-35 | Firbolg |
| The Foundry | Ancient Ruins/Industrial | 20-40 | Warforged |
| The Confluence | Elemental Nexus | 20-40 | Genasi |
| The Ashenmoor | Deathlands | 25-45 | Revenant |
| The Wandering Paths | Varies | 10-50 | Changeling |

---

## B.2 Towns

The world contains **68 towns** spread across all 21 regions. Each town has:

- **Population**: Affects marketplace activity and available NPCs
- **Biome**: Determines which resources can be gathered nearby
- **Specialty**: Unique economic focus (e.g., "Mining", "Enchanting", "Trade Hub")
- **Available Buildings**: Determines which crafting workshops and services exist
- **Prosperity Level** (1-5): Affects resource availability and tax rates
- **Coordinates** (x, y): Used for travel distance calculation

### Starting Towns by Race

| Race | Towns |
|------|-------|
| Human | Kingshold, Millhaven, Bridgewater, Ironford, Whitefield |
| Elf | Aelindra, Moonhaven, Thornwatch, Willowmere, Eldergrove |
| Dwarf | Kazad-Vorn, Deepvein, Hammerfall, Gemhollow, Alehearth |
| Halfling | Hearthshire, Greenhollow, Peddler's Rest, Bramblewood, Riverside |
| Orc | Grakthar, Bonepile, Ironfist Hold, Thornback Camp, Ashen Market |
| Tiefling | Nethermire, Boghollow, Mistwatch, Cinderkeep, Whispering Docks |
| Dragonborn | Drakenspire, Frostfang, Emberpeak, Scalehaven, Wyrmrest |
| Changeling | *(None -- can start in any town)* |

> Common and Exotic races have 3-5 starting towns each in their homeland regions.

### Town Buildings

Towns may contain any combination of: Forge, Workshop, Tannery, Alchemy Lab, Enchanting Tower, Kitchen, Brewery, Jeweler's Bench, Fletcher's Table, Mason's Yard, Scribe's Desk, Market, Bank, Stables, Inn, Healer's Ward, Courier Post.

---

## B.3 Travel System

Travel between towns follows established routes with real-time duration:

- **Base travel time**: `route.distance * 60 * 1000` milliseconds (distance in minutes)
- **War multiplier**: Travel near warring faction capitals takes 50% longer (`*1.5`)
- **Capital blocking**: Cannot travel to a capital that is currently under siege

### Travel Flow
1. Player initiates travel via `POST /travel/start` with destination town ID
2. Server validates route exists between current town and destination
3. Server checks active wars -- blocks travel to besieged capitals, applies 50% penalty near conflict zones
4. A TravelAction record is created with start time and calculated arrival time
5. Socket.io emits `player:leave-town` to notify other players
6. Player can check progress via `GET /travel/status` which auto-completes if time has elapsed
7. On arrival, server triggers quest VISIT objective checks
8. If the destination is in a new region, a border crossing event may trigger

> **Tip**: Plan routes carefully during wartime. The 50% travel penalty can add significant time, and besieged capitals are completely inaccessible.

---

## B.4 Technical: World & Travel

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `database/seeds/world.ts` | ~1200 | All 21 regions, 68 towns, and route definitions |
| `server/src/routes/travel.ts` | 365 | Travel initiation, status, arrival, border checks |
| `server/src/routes/world.ts` | 132 | Map data, region listings, game time |
| `server/src/routes/towns.ts` | 113 | Town details, buildings, characters in town |

### API Endpoints

**World Data** (`server/src/routes/world.ts`)
- `GET /world/map` -- All regions + towns + routes (cached 300s)
- `GET /world/regions` -- Region list with town counts (cached 300s)
- `GET /world/regions/:id` -- Single region with towns
- `GET /world/time` -- Game day/night cycle via `getGameTime()`

**Town Data** (`server/src/routes/towns.ts`)
- `GET /towns/:id` -- Town with region, resources, buildings, characters (cached 120s)
- `GET /towns/:id/buildings` -- Building list
- `GET /towns/:id/characters` -- Characters currently in town

**Travel** (`server/src/routes/travel.ts`)
- `POST /travel/start` -- Begin travel (validates route, checks war status)
- `GET /travel/status` -- Check progress (auto-completes if time elapsed)
- `POST /travel/arrive` -- Manual arrival completion
- `POST /travel/border-check` -- Border crossing event

### Travel Time Formula
```
travelTime = route.distance * 60 * 1000  (base, in ms)
warMultiplier = 1.5 if near warring capital, else 1.0
finalTime = travelTime * warMultiplier
```

---

# C. Economy & Professions

## C.1 Profession Overview

Every character can learn up to **3 professions** (Humans get a 4th via the Adaptable Crafter racial ability). There are **29 professions** across three categories:

| Category | Count | Professions |
|----------|-------|-------------|
| **Gathering** (7) | 7 | Farmer, Rancher, Fisherman, Lumberjack, Miner, Herbalist, Hunter |
| **Crafting** (15) | 15 | Smelter, Blacksmith, Armorer, Woodworker, Tanner, Leatherworker, Tailor, Alchemist, Enchanter, Cook, Brewer, Jeweler, Fletcher, Mason, Scribe |
| **Service** (7) | 7 | Merchant, Innkeeper, Healer, Stable Master, Banker, Courier, Mercenary Captain |

Professions level from 1-100 through XP earned by performing profession activities. Each profession has a **primary stat** that affects performance.

---

## C.2 Profession Tiers

As professions level up, they progress through 6 tiers that unlock new recipes, materials, and quality bonuses:

| Tier | Level Range | Title | Quality Bonus | Key Perks |
|------|------------|-------|---------------|-----------|
| **Apprentice** | 1-10 | Apprentice | +0 | Basic recipes, common materials, slow speed, Poor/Common quality |
| **Journeyman** | 11-25 | Journeyman | +0 | Intermediate recipes, uncommon materials, normal speed, can work independently |
| **Craftsman** | 26-50 | Craftsman | +2 | Advanced recipes, rare materials, faster speed |
| **Expert** | 51-75 | Expert | +5 | Expert recipes, exotic materials, much faster speed |
| **Master** | 76-90 | Master | +8 | Master recipes, legendary materials, can teach apprentices (XP bonus for both) |
| **Grandmaster** | 91-100 | Grandmaster | +12 | Legendary recipes, can create custom recipes, unique title and cosmetics |

> **Tip**: The jump from Expert (+5) to Master (+8) and then Grandmaster (+12) is where crafting quality really takes off. Master-tier crafters can also mentor Apprentices for mutual XP gain.

---

## C.3 Gathering Professions (7)

Gatherers extract raw resources from the world. Each profession targets specific resource types and benefits from certain biomes.

| Profession | Primary Stat | Resources | Preferred Biomes |
|-----------|-------------|-----------|-----------------|
| **Farmer** | CON | GRAIN, FIBER | Plains, Hills |
| **Rancher** | CON | ANIMAL_PRODUCT | Plains, Hills |
| **Fisherman** | DEX | FISH | Coastal, River |
| **Lumberjack** | STR | WOOD | Forest |
| **Miner** | STR | ORE, STONE | Mountain, Underground |
| **Herbalist** | WIS | HERB, REAGENT | Forest, Swamp |
| **Hunter** | DEX | HIDE, ANIMAL_PRODUCT | Forest, Mountain |

### Gathering Mechanics

1. Player starts gathering via `POST /work/start` at a town with the target resource
2. Town must have resource abundance >= 10 (depleted resources cannot be gathered)
3. **Gather time** is reduced by: profession level, racial bonuses, and tool quality
4. On collection (`POST /work/collect`):
   - **Base yield**: 1-3 units
   - **d20 roll** scaled by profession level determines bonus yield
   - **Modifiers**: racial gathering bonuses, tool bonuses, resource abundance
   - **XP earned**: `10 + (tier - 1) * 5`
   - Town resource depleted by 2 per gather (regenerates over time)
   - Tool durability decremented
5. If cancelled after 50%+ completion, player gets partial yield

### Resource-to-Profession Map

| Profession | Resource Types |
|-----------|---------------|
| Miner | ORE, STONE |
| Lumberjack | WOOD |
| Farmer | GRAIN, FIBER |
| Herbalist | HERB, REAGENT |
| Fisherman | FISH |
| Hunter | HIDE, ANIMAL_PRODUCT |

---

## C.4 Crafting Professions (15)

Crafters transform raw materials into finished goods. Each requires specific input resources and produces specific outputs.

| Profession | Stat | Inputs | Outputs |
|-----------|------|--------|---------|
| **Smelter** | CON | ORE | INGOT, ALLOY |
| **Blacksmith** | STR | INGOT | WEAPON, TOOL |
| **Armorer** | STR | INGOT, LEATHER | ARMOR, SHIELD |
| **Woodworker** | DEX | WOOD | BOW, STAFF, FURNITURE |
| **Tanner** | CON | HIDE | LEATHER |
| **Leatherworker** | DEX | LEATHER | LIGHT_ARMOR, BAGS |
| **Tailor** | DEX | FIBER, SILK | CLOTH_ARMOR, CLOTHING |
| **Alchemist** | INT | HERB, REAGENT | POTION, ELIXIR |
| **Enchanter** | INT | REAGENT, GEM | ENCHANTMENT, SCROLL |
| **Cook** | WIS | GRAIN, FISH, ANIMAL_PRODUCT | FOOD (buff items) |
| **Brewer** | WIS | GRAIN, HERB | DRINK (buff items) |
| **Jeweler** | DEX | GEM, INGOT | RING, AMULET, CIRCLET |
| **Fletcher** | DEX | WOOD, FEATHER | ARROW, BOLT, BOW |
| **Mason** | STR | STONE, INGOT | BUILDING_MATERIAL |
| **Scribe** | INT | REAGENT, FIBER | SCROLL, BOOK, MAP |

### Crafting Mechanics

1. Player views available recipes via `GET /crafting/recipes` (shows canCraft flag and missing ingredients)
2. Start crafting via `POST /crafting/start`:
   - Validates profession tier meets recipe requirements
   - Workshop building required for Journeyman+ tier recipes (specific building type per profession)
   - Racial material reduction may apply (e.g., Dwarf uses fewer ingots for blacksmithing)
   - Ingredient quality bonus cascades into the craft
   - Craft time reduced by: profession level, workshop tier, racial speed bonuses, Warforged Overclock ability
3. Collect via `POST /crafting/collect`:
   - **Quality roll** = profession level + tool bonus + workshop bonus + racial quality bonus + tier quality bonus
   - Roll determines item quality: POOR, COMMON, FINE, SUPERIOR, MASTERWORK, or LEGENDARY
   - Item created in inventory, XP awarded, achievement checks triggered
4. **Batch crafting** via `POST /crafting/queue`: Queue 1-10 items, processed sequentially. Queue slot limits apply (Warforged get bonus slots via Tireless Worker).

---

## C.5 Service Professions (7)

Service professions interact with game systems rather than creating items.

| Profession | Stat | Service |
|-----------|------|---------|
| **Merchant** | CHA | Better marketplace rates, bulk trading, caravan routes |
| **Innkeeper** | CHA | Rest bonuses, room rental income, tavern events |
| **Healer** | WIS | Healing services, cure ailments, resurrection assistance |
| **Stable Master** | WIS | Mount care, speed bonuses, breeding |
| **Banker** | INT | Interest income, loans, secure storage |
| **Courier** | DEX | Faster travel, mail delivery, item transport |
| **Mercenary Captain** | CHA | Hire NPCs, bounty hunting, protection contracts |

### Tier Progression Examples (Service)

**Merchant**: Apprentice (basic sales) -> Journeyman (bulk deals) -> Craftsman (trade routes) -> Expert (import/export) -> Master (monopolies) -> Grandmaster (trade empires)

**Healer**: Apprentice (bandaging) -> Journeyman (herbal remedies) -> Craftsman (magical healing) -> Expert (cure diseases) -> Master (resurrection) -> Grandmaster (divine miracles)

---

## C.6 Quality System

Crafted items have one of six quality tiers that affect their stats:

| Quality | Rarity | Effect |
|---------|--------|--------|
| **Poor** | Common | Below-average stats |
| **Common** | Common | Baseline stats |
| **Fine** | Uncommon | Slightly above average |
| **Superior** | Rare | Noticeably better |
| **Masterwork** | Very Rare | Significantly enhanced |
| **Legendary** | Legendary | Best possible stats, may have unique properties |

### Quality Roll Factors

The quality of a crafted item is determined by a composite roll:

```
qualityScore = professionLevel
             + toolQualityBonus
             + workshopTierBonus
             + racialQualityBonus
             + professionTierBonus (0/0/+2/+5/+8/+12)
             + ingredientQualityBonus (cascading from input quality)
```

Higher-quality ingredients produce higher-quality outputs -- creating valuable supply chains where a Master Smelter producing Superior ingots feeds a Grandmaster Blacksmith making Legendary weapons.

---

## C.7 Marketplace

Every town with a Market building allows player-to-player trading.

### Listing Items
- List via `POST /market/list` -- items have a 7-day listing duration
- Listed items are removed from inventory until sold or cancelled
- Cancel via `POST /market/cancel` (items returned to inventory)

### Buying Items
- Browse via `GET /market/browse` -- filterable by item type, price range, rarity, and search text
- Results are paginated, sortable, and cached for 30 seconds
- **Tax rate** is calculated via `getEffectiveTaxRate()` (based on town prosperity and political factors)
- Tax is deposited into the town treasury (fuels building upgrades and NPC services)

### Trade Restrictions
- Certain faction relationships create **embargoes** blocking trade
- Halfling racial ability "Trade Network" grants global price visibility across all towns
- Halfling racial ability "Silver Tongue" gives 5% buy discount and 5% sell premium

### Price History
- `GET /market/history` provides price history up to 365 days for economic analysis
- `GET /market/my-listings` shows active listings for the authenticated player

---

## C.8 Racial Profession Bonuses

Every race has innate bonuses to specific professions. Below are the strongest racial-profession synergies:

| Race | Best Profession Synergy | Bonus |
|------|------------------------|-------|
| **Human** | All professions | +10% XP, +5% crafting speed (generalist) |
| **Elf** | Herbalism | +25% yield |
| **Elf** | Enchanting | +20% quality |
| **Dwarf** | Mining | +30% yield |
| **Dwarf** | Blacksmithing / Armoring | +25% quality |
| **Halfling** | Cooking | +25% quality |
| **Orc** | Hunting | +30% yield |
| **Tiefling** | Alchemy | +30% quality |
| **Dragonborn** | Combat Loot | +25% yield |
| **Gnome** | *(all crafting via Tinker's Insight)* | +15% quality tier upgrade chance |
| **Merfolk** | Fishing (exclusive deep-sea resources) | Underwater access |
| **Firbolg** | Gathering (Nature's Bounty) | +30% all gathering yield |
| **Warforged** | Crafting queue | +50% capacity (Tireless Worker) |
| **Faefolk** | Magic crafting (Enchanting, Alchemy) | High quality, but negative physical crafting |

---

## C.9 Technical: Economy

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `shared/src/data/professions/types.ts` | 39 | ProfessionType union (29 types), ProfessionDefinition interface |
| `shared/src/data/professions/tiers.ts` | 75 | 6-tier progression definitions with perks |
| `shared/src/data/professions/gathering.ts` | ~200 | 7 gathering profession definitions |
| `shared/src/data/professions/crafting.ts` | ~400 | 15 crafting profession definitions |
| `shared/src/data/professions/service.ts` | ~200 | 7 service profession definitions |
| `server/src/routes/work.ts` | 767 | Gathering system (start, status, collect, cancel, professions) |
| `server/src/routes/crafting.ts` | 920 | Crafting system (recipes, start, status, collect, queue) |
| `server/src/routes/market.ts` | 542 | Marketplace (list, browse, buy, cancel, history) |

### API Endpoints

**Gathering** (`server/src/routes/work.ts`)
- `POST /work/start` -- Begin gathering (checks travel/gather/craft conflicts, validates resource in town, checks abundance >= 10, applies time bonuses)
- `GET /work/status` -- Check gathering progress
- `POST /work/collect` -- Complete gathering (yield calculation, XP award, resource depletion, tool durability, quest/achievement checks)
- `POST /work/cancel` -- Cancel (50%+ = partial yield)
- `GET /work/professions` -- List character's professions

**Crafting** (`server/src/routes/crafting.ts`)
- `GET /crafting/recipes` -- Available recipes with canCraft/missingIngredients check
- `POST /crafting/start` -- Begin crafting (tier validation, workshop requirement, racial material reduction, quality bonuses, time bonuses)
- `GET /crafting/status` -- Check craft progress
- `POST /crafting/collect` -- Complete craft (quality roll, item creation, XP, achievements)
- `POST /crafting/queue` -- Batch craft 1-10 items (queue slot limits, sequential processing)
- `GET /crafting/queue` -- View craft queue

**Marketplace** (`server/src/routes/market.ts`)
- `POST /market/list` -- List item for sale (7-day duration, removed from inventory)
- `GET /market/browse` -- Search listings (type, price, rarity, search; paginated, cached 30s)
- `POST /market/buy` -- Purchase (embargo check, tax calc, atomic gold transfer + inventory + price history + treasury)
- `POST /market/cancel` -- Cancel listing (items returned)
- `GET /market/my-listings` -- Active listings
- `GET /market/history` -- Price history (up to 365 days)

### Yield Calculation (Gathering)
```
baseYield = random(1, 3)
d20Roll = d20() + (professionLevel / 5)
bonusYield = floor(d20Roll / 5)
racialBonus = race.gatheringBonuses[resourceType][biome] / 100
toolBonus = tool?.gatheringBonus ?? 0
abundanceMultiplier = townResourceAbundance / 100
finalYield = floor((baseYield + bonusYield) * (1 + racialBonus + toolBonus) * abundanceMultiplier)
XP = 10 + (resourceTier - 1) * 5
townResourceAbundance -= 2  // depletion
```

---

# D. Combat System

## D.1 Combat Overview

Realm of Crowns uses a **turn-based combat engine** with **d20 mechanics**. Combat is resolved through pure functions -- no database calls during resolution. All state is passed in and returned.

### Combat Types

| Type | Description |
|------|-------------|
| **PVE** | Player vs. Environment (monsters) |
| **PVP** | Player vs. Player (1v1 duels) |
| **DUEL** | Formal duel with stakes |
| **ARENA** | Tournament combat |
| **WAR** | Faction warfare |

### Combat Flow
1. **Initiative**: All combatants roll 1d20 + DEX modifier. Sorted descending. DEX breaks ties, then random.
2. **Turn order**: Each combatant acts in initiative order. One action per turn.
3. **Actions available**: Attack, Cast, Defend, Item, Flee, Racial Ability
4. **Status effects**: Processed at the start of each combatant's turn (DoT/HoT damage, duration countdown)
5. **Combat ends** when one team is eliminated or all members of a team have fled

---

## D.2 Core Formulas

### Attack Roll
```
attackRoll = d20()
attackTotal = attackRoll + getModifier(attacker.stats[weapon.attackModifierStat]) + weapon.bonusAttack + statusEffectModifiers + racialAttackBonus
hit = attackTotal >= targetAC
critical = attackRoll == 20  (natural 20 always hits)
```

### Armor Class (AC)
```
AC = BASE_AC(10) + getModifier(stats.dex)    // or equipment AC if higher
   + DEFEND_BONUS(+2 if defending)
   + sum(statusEffect.acModifier for each active effect)
   + racialPassive.acBonus
```

### Damage
```
damage = roll(weapon.diceCount * weapon.diceSides) + getModifier(stats[weapon.damageModifierStat]) + weapon.bonusDamage
criticalDamage = damage * 2  (double dice)
```

### Stat Modifier
```
modifier = floor((stat - 10) / 2)
// Examples: stat 10 = +0, stat 14 = +2, stat 18 = +4, stat 8 = -1
```

### Spell Save DC
```
saveDC = 8 + getModifier(caster.stats[spell.castingStat]) + proficiencyBonus
saveRoll = d20() + getModifier(target.stats[spell.saveType]) + statusSaveModifiers
saved = saveRoll >= saveDC
```

### Flee Check
```
fleeRoll = d20() + getModifier(stats.dex)
success = fleeRoll >= DEFAULT_FLEE_DC(10)
```

---

## D.3 Status Effects

There are **12 status effects** in the combat system. Effects are processed at the start of each combatant's turn.

| Effect | Prevents Action | DoT/HoT | ATK Mod | AC Mod | Save Mod | Description |
|--------|:-:|:-:|:-:|:-:|:-:|-------------|
| **Poisoned** | No | 3 dmg/rd | -2 | 0 | 0 | Ongoing poison damage, weakened attacks |
| **Stunned** | **Yes** | 0 | 0 | -2 | -4 | Cannot act, vulnerable |
| **Blessed** | No | 0 | +2 | 0 | +2 | Enhanced accuracy and resilience |
| **Burning** | No | 5 dmg/rd | 0 | 0 | 0 | Fire damage each round |
| **Frozen** | **Yes** | 0 | 0 | -4 | -2 | Cannot act, very vulnerable to attacks |
| **Paralyzed** | **Yes** | 0 | 0 | -4 | -4 | Cannot act, extremely vulnerable |
| **Blinded** | No | 0 | -4 | -2 | 0 | Severely reduced accuracy |
| **Shielded** | No | 0 | 0 | +4 | 0 | Major AC boost |
| **Weakened** | No | 0 | -3 | 0 | -2 | Reduced attack and saves |
| **Hasted** | No | 0 | +2 | +2 | 0 | Faster: better accuracy and evasion |
| **Slowed** | No | 0 | -2 | -2 | -2 | Debuff to everything |
| **Regenerating** | No | +5 heal/rd | 0 | 0 | 0 | Heal 5 HP each round |

> **Key interactions**: Stunned, Frozen, and Paralyzed all prevent actions -- CC chains are devastating. Poisoned has DoT plus an attack penalty. Burning does the most DoT damage (5/rd vs poison's 3/rd) but has no other penalties. Shielded (+4 AC) is the strongest defensive buff.

---

## D.4 PvE Combat

### Encounter Generation
When a player initiates PvE combat (`POST /combat-pve/start`), the server:
1. Selects a random monster from the player's current region
2. Monster level is within +/- 3 of the player's level
3. Builds a CombatState with player and monster as combatants
4. State is stored in **Redis** (key: `combat:pve:{sessionId}`, TTL: 1 hour) with an in-memory Map fallback

### Monster AI
Monster behavior is simple: attack a random living enemy each turn. Monsters do not use special abilities, items, or flee.

### Turn Resolution
1. Player submits action via `POST /combat-pve/action`
2. Server auto-resolves all monster turns that precede the player in initiative order
3. Player's action is resolved
4. Server checks if combat has ended (one side eliminated)
5. Updated state returned to client

### PvE Rewards (Victory)
| Reward | Formula |
|--------|---------|
| **XP** | `monster.level * 25` |
| **Gold** | Random from monster's loot table |
| **Items** | Random drops based on monster type and level |
| **Quest Progress** | KILL objective checks triggered |

---

## D.5 PvP Combat

### PvP Rules and Restrictions

| Rule | Value |
|------|-------|
| Maximum level difference | 5 levels |
| Challenge cooldown | 30 minutes |
| Wager tax rate | 5% |
| XP per opponent level | 50 |
| Must be in same town | Yes |
| Both players must be active | Yes |

### PvP Flow
1. **Challenge**: Player A sends challenge (`POST /combat-pvp/challenge`) to Player B. Can include a gold wager.
2. **Accept/Decline**: Player B accepts (`POST /combat-pvp/accept`) or declines (`POST /combat-pvp/decline`).
3. **Combat**: Turn-based combat identical to PvE mechanics. State stored in Redis (key: `combat:pvp:{sessionId}`).
4. **Resolution**: Each action submitted via `POST /combat-pvp/action`. Turns are logged to the database.
5. **Finalize**: Winner receives XP + wager winnings (minus 5% tax). Both players heal to full HP after combat.

### Leaderboard
`GET /combat-pvp/leaderboard` returns player rankings sorted by win rate (wins, losses, winRate).

---

## D.6 Death & Penalties

When a player character dies in PvE combat:

| Penalty | Value |
|---------|-------|
| **Gold lost** | 10% of current gold |
| **XP lost** | 50 XP per character level |
| **Equipment durability** | 10 durability damage to ALL equipped items |
| **Respawn** | Teleported to nearest town |

```
Constants from combat-engine.ts:
DEATH_GOLD_LOSS_PERCENT = 10
DEATH_XP_LOSS_PER_LEVEL = 50
DEATH_DURABILITY_DAMAGE = 10
```

**Revenant racial bonus**: 50% reduced death penalty (5% gold, 25 XP/level, 5 durability) and 50% faster respawn time.

> **Tip**: Keep your equipment repaired and avoid fighting monsters more than 3 levels above you. The XP and durability penalties scale with level and can set you back significantly at higher levels.

---

## D.7 Racial Combat Abilities

Several races have abilities that integrate directly into the combat engine:

| Race | Ability | Combat Effect |
|------|---------|--------------|
| **Orc** | Intimidating Presence | Enemies -1 to first attack roll |
| **Orc** | Relentless Endurance | Survive lethal blow at 1 HP (1/combat) |
| **Orc** | Blood Fury | +25% damage below 50% HP |
| **Orc** | Orcish Rampage | Bonus attack on kill |
| **Elf** | Elven Accuracy | Advantage on ranged attacks (2d20 take higher) |
| **Dwarf** | Dwarven Resilience | +3 to poison saving throws |
| **Dwarf** | Ancestral Fury | Below 25% HP: +5 STR, +5 CON |
| **Human** | Indomitable Will | Reroll failed saving throw (1/combat) |
| **Halfling** | Halfling Luck | Reroll any d20 (1/day) |
| **Tiefling** | Hellish Resistance | Fire damage halved |
| **Tiefling** | Infernal Rebuke | Melee attackers take 1d6 fire |
| **Tiefling** | Soul Bargain | Sacrifice 25% HP for 2x spell damage |
| **Dragonborn** | Breath Weapon | 2d6 AoE (upgrades to 4d8 at lvl 40) |
| **Dragonborn** | Draconic Scales | +2 natural AC |
| **Dragonborn** | Frightful Presence | AoE frighten (WIS save) |
| **Goliath** | Stone's Endurance | Reduce damage by 1d12+CON |
| **Goliath** | Powerful Build | Wield 2H weapons in 1 hand |
| **Goliath** | Titan's Grip | +1d8 melee damage |
| **Half-Orc** | Savage Attacks | Extra die on critical hits |
| **Half-Orc** | Unstoppable Force | 3 auto-hit attacks |
| **Beastfolk** | Beast Form | Combat transformation (clan-specific) |
| **Revenant** | Undying | Auto-revive once per combat |
| **Revenant** | Life Drain | Heal from damage dealt |

The combat engine integrates racial abilities through the `racial-combat-abilities` service, which provides:
- `getPassiveModifiers()` -- AC, attack, and damage bonuses from racial passives
- `resolveRacialAbility()` -- Active racial ability resolution
- `checkDeathPrevention()` -- Orc Relentless Endurance / Revenant Undying
- `checkBonusAttackOnKill()` -- Orc Rampage
- `checkMeleeReflect()` -- Tiefling Infernal Rebuke
- `checkAutoHit()` -- Half-Orc Unstoppable Force

---

## D.8 Technical: Combat

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `shared/src/types/combat.ts` | 263 | All combat type definitions (shared between server and client) |
| `server/src/lib/combat-engine.ts` | ~600 | Pure-function combat engine (initiative, AC, damage, status effects, action resolvers) |
| `server/src/routes/combat-pve.ts` | 669 | PvE combat routes (start, action, state) |
| `server/src/routes/combat-pvp.ts` | 938 | PvP combat routes (challenge, accept, decline, action, state, leaderboard) |
| `server/src/services/racial-combat-abilities.ts` | ~400 | Racial ability integration (passives, actives, death prevention) |
| `server/src/services/racial-passive-tracker.ts` | ~100 | Beastfolk natural weapons, passive tracking |

### API Endpoints

**PvE Combat** (`server/src/routes/combat-pve.ts`)
- `POST /combat-pve/start` -- Initiate PvE encounter (random monster from region, +/-3 levels)
- `POST /combat-pve/action` -- Submit player action (auto-resolves preceding monster turns)
- `GET /combat-pve/state` -- Get current combat state

**PvP Combat** (`server/src/routes/combat-pvp.ts`)
- `POST /combat-pvp/challenge` -- Challenge player (same town, level diff <=5, cooldown check, optional wager)
- `POST /combat-pvp/accept` -- Accept challenge (re-validates wager gold, builds combatants)
- `POST /combat-pvp/decline` -- Decline challenge
- `POST /combat-pvp/action` -- Submit action (turn-based, logged to DB)
- `GET /combat-pvp/state` -- Current combat state
- `GET /combat-pvp/challenges` -- Pending challenges
- `GET /combat-pvp/leaderboard` -- Win/loss rankings

### Combat State Storage
- **Redis** primary: key `combat:pve:{sessionId}` or `combat:pvp:{sessionId}`, TTL 1 hour
- **In-memory Map** fallback: used when Redis is unavailable
- State includes: session ID, type, status, round number, turn index, all combatants, turn order, full log, winning team

### Architecture: Pure Function Design
The combat engine (`combat-engine.ts`) is designed as pure functions:
- All functions take state as input and return new state as output
- No side effects, no database calls, no external service calls
- This makes the engine testable, deterministic (given dice rolls), and reusable across PvE/PvP/Arena/War
- Racial abilities are injected via the `RacialCombatTracker` parameter, keeping the core engine race-agnostic

---

*Document generated from source audit of the Realm of Crowns codebase.*
*Files audited: 40+ source files across shared/src/data/, shared/src/types/, server/src/routes/, server/src/lib/, server/src/services/, database/seeds/.*
