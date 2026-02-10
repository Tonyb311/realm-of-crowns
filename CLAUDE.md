# Realm of Crowns -- Claude Code Project Context

## Game Overview
Browser-based fantasy MMORPG. Renaissance Kingdoms meets D&D.
20 playable races, 28 professions, 68 towns, player-driven everything.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Query
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 15 + Prisma ORM
- **Real-time:** Socket.io
- **Cache:** Redis 7
- **Auth:** JWT + bcrypt
- **Validation:** Zod
- **Deployment:** Docker Compose
- **Monorepo:** npm workspaces (client, server, shared, database)

## Project Structure
```
/client          -- React frontend (Vite, Tailwind, Zustand)
/server          -- Express API + Socket.io backend
/shared          -- Shared types, constants, and game data
/database        -- Prisma schema, migrations, seed data
/docs            -- Game design documents (THE GAME BIBLE)
/prompts         -- Claude Code agent team prompts by phase
/design-docs     -- Original source design documents
```

## Design Documents -- READ THESE FIRST
- `docs/RACES.md` -- Complete 20-race compendium (stats, abilities, towns, relations)
- `docs/ECONOMY.md` -- Economy system design (28 professions, crafting chains, marketplace)
- `docs/WORLD_MAP.md` -- All 21 regions, 68 towns, geography, biomes, level ranges
- `docs/COMBAT.md` -- Combat system (PvE, PvP duels, damage, rewards, death penalties)
- `docs/POLITICS.md` -- Political system (elections, governance, laws, taxes, diplomacy)
- `docs/SOCIAL.md` -- Social systems (guilds, messaging, friends, notifications)
- `docs/QUESTS.md` -- Quests, skills, specializations, leveling, progression
- `docs/PROMPTS.md` -- All agent team prompts consolidated
- `docs/PROMPT_QUEUE.md` -- Build phases and completion status

## 20 Playable Races
### Core (7) -- 5 towns each, easy start
Human (Heartlands), Elf (Silverwood), Dwarf (Ironvault), Halfling (Crossroads),
Orc (Ashenfang), Tiefling (Shadowmere), Dragonborn (Frozen Reaches)

### Common (6) -- 2-3 towns, moderate start
Half-Elf (Twilight March), Half-Orc (Scarred Frontier), Gnome (Cogsworth),
Merfolk (Pelagic Depths), Beastfolk (Thornwilds), Faefolk (Glimmerveil)

### Exotic (7) -- 0-2 towns, hard mode
Goliath (Skypeak), Drow (Vel'Naris/Underdark), Firbolg (Mistwood),
Warforged (The Foundry), Genasi (The Confluence), Revenant (Ashenmoor),
Changeling (Nomadic -- no hometown)

### Sub-races
- Dragonborn: 7 Draconic Ancestries (Red, Blue, White, Black, Green, Gold, Silver)
- Beastfolk: 6 Animal Clans (Wolf, Bear, Fox, Hawk, Panther, Boar)
- Genasi: 4 Elements (Fire, Water, Earth, Air)

## 28 Professions
### Gathering (7): Farmer, Rancher, Fisherman, Lumberjack, Miner, Herbalist, Hunter
### Crafting (15): Smelter, Blacksmith, Armorer, Woodworker, Tanner, Leatherworker, Tailor, Alchemist, Enchanter, Cook, Brewer, Jeweler, Fletcher, Mason, Scribe
### Service (7): Merchant, Innkeeper, Healer, Stable Master, Banker, Courier, Mercenary Captain

- Max 3 professions per character (Humans get 4th at Level 15)
- Levels 1-100 with 6 tiers: Apprentice -> Journeyman -> Craftsman -> Expert -> Master -> Grandmaster
- Quality roll: d20 + (professionLevel/5) + toolBonus + workshopBonus + racialBonus

## Key Design Principles
1. **Player-driven economy** -- No NPC-created items. Every sword, potion, and meal is player-crafted
2. **Real-time actions** -- Gathering, crafting, travel take real-world time (minutes to hours)
3. **Item durability** -- Weapons (100 uses), armor (150 uses), tools (50 uses) break -> constant demand
4. **3-profession limit** -- Forces interdependence, nobody is self-sufficient
5. **Geographic scarcity** -- Resources tied to biomes/regions -> trade is necessary
6. **D&D mechanics** -- d20 rolls, ability scores (STR/DEX/CON/INT/WIS/CHA), AC, spell slots
7. **Player politics** -- Elected mayors and rulers with real governance power
8. **Racial relations** -- 20x20 diplomacy matrix affects tariffs, access, NPC behavior
9. **Exclusive zones** -- 11 zones only certain races can access (Underdark, Deep Ocean, Feywild, etc.)

## The World of Aethermere -- 8 Major Regions + Sub-regions

### Core Regions (5 towns each)
| Region | Race | Biome | Key Resources |
|--------|------|-------|---------------|
| Verdant Heartlands | Human | Plains/Hills | Grain, Cotton, Livestock |
| Silverwood Forest | Elf | Ancient Forest | Exotic Wood, Herbs, Arcane Reagents |
| Ironvault Mountains | Dwarf | Mountains/Underground | All Ores, Gems, Stone, Coal |
| The Crossroads | Halfling | Rolling Hills | Grain, Herbs, Vegetables |
| Ashenfang Wastes | Orc | Badlands/Volcanic | Leather, Bone, Obsidian, War Beasts |
| Shadowmere Marshes | Tiefling | Swamps/Bogs | Rare Herbs, Reagents, Mushrooms |
| Frozen Reaches | Dragonborn | Tundra/Volcanic | Mithril, Adamantine, Exotic Furs |
| The Suncoast | Neutral (Free Cities) | Coastal | Fish, Salt, Sand/Glass, Trade Goods |

### Common Race Territories (2-3 towns each)
| Territory | Race | Towns |
|-----------|------|-------|
| Twilight March | Half-Elf | Dawnmere, Twinvale, Harmony Point |
| Scarred Frontier | Half-Orc | Scarwatch, Tuskbridge, Proving Grounds |
| Cogsworth Warrens | Gnome | Cogsworth, Sparkhollow, Fumblewick |
| Pelagic Depths | Merfolk | Coralspire, Shallows End, Abyssal Reach |
| Thornwilds | Beastfolk | Thornden, Clawridge, Windrun |
| Glimmerveil | Faefolk | Glimmerheart, Dewdrop Hollow, Moonpetal Grove |

### Exotic Race Settlements (0-2 towns each)
| Territory | Race | Towns |
|-----------|------|-------|
| Skypeak Plateaus | Goliath | Skyhold, Windbreak |
| Vel'Naris Underdark | Drow | Vel'Naris, Gloom Market |
| Mistwood Glens | Firbolg | Misthaven, Rootholme |
| The Foundry | Warforged | The Foundry |
| The Confluence | Genasi | The Confluence, Emberheart |
| Ashenmoor | Revenant | Ashenmoor |
| Everywhere | Changeling | (Nomadic -- start anywhere) |

**Total: 68 towns across 21 territories**

## Racial Relations Matrix (Default Starting State)
Key: A=Allied, F=Friendly, N=Neutral, D=Distrustful, H=Hostile, BF=Blood Feud

Notable relationships:
- **Dwarf-Orc: Blood Feud** -- deepest hostility, hardest to change
- **Human-Halfling: Allied** -- strongest alliance
- **Elf-Faefolk-Firbolg: Allied** -- nature alliance
- **Dwarf-Gnome-Warforged: Friendly** -- crafter alliance
- **Tiefling-Drow-Revenant-Changeling: Friendly** -- outcast solidarity
- **Halflings: Neutral-to-Friendly with nearly everyone** -- traders, not fighters
- Players CAN change relations through diplomacy, treaties, and sustained effort

## 11 Exclusive Resource Zones
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

## Crafting Chains (Examples)
**Iron Sword (5-6 players involved):**
Miner -> Smelter -> Lumberjack -> Hunter -> Tanner -> Blacksmith -> [Enchanter]

**Steel Plate Armor (6-7 players):**
Miner -> Smelter -> Farmer -> Tailor -> Hunter -> Tanner -> Armorer -> [Enchanter]

**Greater Healing Potion (3-4 players):**
Herbalist -> Miner/Woodworker -> Smelter -> Alchemist

## Economy Mechanics
- **No NPC vendors** for crafted goods -- all real gear is player-made
- **Player-set prices** on marketplace with town tax (5-25%, set by mayor)
- **Item durability** creates constant replacement demand
- **Resource scarcity by biome** creates trade routes between regions
- **Trade caravans** can be raided (PvE bandits or PvP in wartime)
- **Quality tiers:** Poor -> Common -> Fine -> Superior -> Masterwork -> Legendary

## Combat System
- Turn-based, D&D-style with initiative rolls (d20 + DEX)
- Attack rolls: d20 + modifiers vs target AC
- 120 racial abilities across 20 races (6 per race, unlock at levels 1/5/10/15/25/40)
- PvE encounters, dungeons with bosses, PvP duels, arena, kingdom wars

## Political System
- Elected town mayors (set taxes, build, appoint officials)
- Elected kingdom rulers (declare war/peace, kingdom laws, treaties)
- Law system: propose -> council vote -> enact
- Diplomatic actions: treaties, trade agreements, alliances, wars

## Game Data Location
All static game data -> `/shared/src/data/` as typed TypeScript constants
Database schema -> `/database/prisma/schema.prisma`
**Never hardcode game values in server or client -- always reference shared data.**

## Development Phases
- Phase 1 (Prompts 00-08): Core systems foundation -- **COMPLETE**
- Phase 2A (Prompts 09-14): Economy & professions expansion -- Not started
- Phase 2B (Prompts 15-18): 20 races & world expansion -- Not started
- Phase 3 (Prompts 19+): Future features (mounts, religion, naval, guilds, seasons)

## Phase 1 Completion Summary
All 9 prompts (00-08) are complete. Implemented systems:
- Auth (JWT + bcrypt), character creation with all 20 races
- World navigation with 68 seeded towns across 21 regions
- Basic marketplace with player-set prices and town taxes
- Turn-based PvE combat (Redis state, monster AI, loot, XP)
- PvP duels (challenge/accept, wagers, leaderboard)
- Elections (nominations, voting, impeachment, auto-lifecycle cron)
- Governance (laws, taxes, treasury, appointments, war/peace)
- Guilds (ranks, invites, donations, leadership transfer)
- Multi-channel messaging (7 channel types), friends, notifications
- Quest system (5 types, auto-triggers, NPC quest givers)
- Skill trees (6 classes, 18 specializations, ability unlock)
- Leveling (XP formula, stat/skill points, HP/MP growth)
- Socket.io real-time events throughout
- Zod validation on all endpoints
