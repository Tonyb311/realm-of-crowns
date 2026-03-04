# Released Content Audit

## Summary

| Category | Released | Total | Mechanism |
|----------|----------|-------|-----------|
| **Races** | 7 core (auto) | 20 | `ContentRelease.isReleased` — enforced at character creation, API, Codex |
| **Classes** | 7 of 7 | 7 | None — all always available, hardcoded VALID_CLASSES |
| **Towns** | ~35 core (auto) | 69 | `Town.isReleased` + `TravelRoute.isReleased` — enforced at map, travel, market |
| **Professions** | 29 of 29 | 29 | None — all always available |
| **Monsters** | 21 of 21 | 21 | None — all spawn if biome reachable (all are) |
| **Items/Recipes** | All | 300+/26+ | None — all shown in Codex, all craftable |
| **Quests** | 8 of 8 | 8 | None — tutorial chain, all active |
| **Buildings** | 21 of 21 | 21 | None — all constructible |
| **Elections/Governance** | Always on | N/A | None — functional in all released towns |

**The game has a mature, database-backed content release system — but it only covers races and towns.** Everything else (classes, professions, monsters, items, recipes, quests, buildings, governance) is all-or-nothing with no release gating.

On a fresh database, `ensureCoreContentReleased()` auto-releases 7 core races + their ~35 home towns. Common (6) and exotic (7) races + their territories must be manually released by admins via the ContentRelease admin panel.

---

## Races

### Release Mechanism

**Database-driven gating via `ContentRelease` model + Redis cache.**

- `ContentRelease` table stores per-race `isReleased` boolean (schema line 2224)
- `isRaceReleased(raceKey)` in `server/src/lib/content-release.ts` (line 77) checks DB with 5-min Redis cache
- On fresh DB: `ensureCoreContentReleased()` in `server/src/lib/ensure-content-released.ts` auto-creates 20 rows, sets core=true, common/exotic=false
- Once any admin release occurs, the bootstrap becomes a no-op

**Enforcement points:**
- `POST /api/characters/create` — `server/src/routes/characters.ts` line 85: rejects if race not released
- `GET /api/races` — filters to released races only
- `GET /api/codex/races` — filters to released races only
- Frontend `CharacterCreationPage.tsx` lines 130-138: hides tier tabs if no races in that tier are released

### Released (available for character creation)

**7 Core Races — auto-released at startup:**

| Race ID | Display Name | Tier | Home Region |
|---------|-------------|------|-------------|
| `human` | Human | Core | Verdant Heartlands |
| `elf` | Elf | Core | Silverwood Forest |
| `dwarf` | Dwarf | Core | Ironvault Mountains |
| `harthfolk` | Halfling | Core | The Crossroads |
| `orc` | Orc | Core | Ashenfang Wastes |
| `nethkin` | Tiefling | Core | Shadowmere Marshes |
| `drakonid` | Dragonborn | Core | Frozen Reaches |

### Unreleased (exist in code but not player-accessible until admin releases)

**6 Common Races — `isReleased: false` by default:**

| Race ID | Display Name | Tier | Home Region |
|---------|-------------|------|-------------|
| `half_elf` | Half-Elf | Common | Twilight March |
| `half_orc` | Half-Orc | Common | Scarred Frontier |
| `gnome` | Gnome | Common | Cogsworth Warrens |
| `merfolk` | Merfolk | Common | Pelagic Depths |
| `beastfolk` | Beastfolk | Common | Thornwilds |
| `faefolk` | Faefolk | Common | Glimmerveil |

**7 Exotic Races — `isReleased: false` by default:**

| Race ID | Display Name | Tier | Home Region |
|---------|-------------|------|-------------|
| `goliath` | Goliath | Exotic | Skypeak Plateaus |
| `nightborne` | Drow | Exotic | Vel'Naris Underdark |
| `mosskin` | Firbolg | Exotic | Mistwood Glens |
| `forgeborn` | Warforged | Exotic | The Foundry |
| `elementari` | Genasi | Exotic | The Confluence |
| `revenant` | Revenant | Exotic | Ashenmoor |
| `changeling` | Changeling | Exotic | Nomadic (no home) |

### Evidence

- `RaceDefinition` interface (`shared/src/types/race.ts` line 43): has `tier` field but NO `released`/`enabled` field — release is external
- `ContentRelease` model (`database/prisma/schema.prisma` line 2224): `contentType`, `contentId`, `isReleased`, `releasedAt`, `releaseOrder`
- Character creation gate: `server/src/routes/characters.ts` line 85: `if (!(await isRaceReleased(registryKey))) return res.status(400)`
- Auto-release: `server/src/lib/ensure-content-released.ts` lines 14-66
- Admin UI: `client/src/pages/admin/ContentReleasePage.tsx` — per-race toggle, bulk release by tier
- Admin API: `server/src/routes/admin/contentRelease.ts` — PATCH release/unrelease, POST bulk-release

---

## Classes

### Release Mechanism

**NONE.** All 7 classes are always available. No ContentRelease check, no `isClassReleased()` function, no admin toggle.

### Released

All 7 — no gating:

| Class | Primary Stat | HP Bonus | Specializations |
|-------|-------------|----------|-----------------|
| Warrior | STR | +10 | 3 |
| Mage | INT | +4 | 3 |
| Rogue | DEX | +6 | 3 |
| Cleric | WIS | +8 | 3 |
| Ranger | DEX | +8 | 3 |
| Bard | CHA | +6 | 3 |
| Psion | INT | +4 | 3 |

### Unreleased

None. All 7 are selectable.

### Evidence

- `VALID_CLASSES` hardcoded in `server/src/routes/characters.ts` lines 23-24: `['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion']`
- Character creation Zod schema validates against this list — no DB/release check
- Frontend `CharacterCreationPage.tsx` lines 22-30: hardcoded `CLASSES` array with all 7
- `shared/src/data/skills/index.ts` line 39: exports `VALID_CLASSES` with all 7
- Skill tree definitions in `shared/src/data/skills/*.ts`: no `released` or `enabled` fields
- `AbilityDefinition` and `ClassDefinition` types in `shared/src/data/skills/types.ts`: no release fields
- No `contentType: 'class'` support in ContentRelease system

---

## Towns & Cities

### Release Mechanism

**Database-driven gating via `Town.isReleased` boolean + `TravelRoute.isReleased`.**

- `Town` model has `isReleased Boolean @default(false)` (schema line ~711)
- `TravelRoute` model has `isReleased Boolean @default(false)` (schema line ~699)
- `isTownReleased(townId)` in `server/src/lib/content-release.ts` checks with Redis cache
- On fresh DB: core race home towns auto-released (~35 towns)
- All other towns default to `isReleased: false`

**Enforcement points:**
- `GET /api/world/map` (`server/src/routes/world.ts` line 91-106): filters `where: { isReleased: true }` for both towns and routes
- `GET /api/travel/routes` (`server/src/routes/travel.ts` line 81-93): filters `where: { isReleased: true }`
- `GET /api/market/browse`: rejects if current town not released
- `POST /api/caravans`: rejects if destination town not released
- `GET /api/elections`: filters to released towns only

### Released (accessible via travel)

**~35 core race home towns — auto-released at startup:**

| Region | Towns (5 each) |
|--------|---------------|
| Verdant Heartlands | Kingshold, Millhaven, Bridgewater, Ironford, Whitefield |
| Silverwood Forest | Aelindra, Moonhaven, Thornwatch, Willowmere, Eldergrove |
| Ironvault Mountains | Kazad-Vorn, Deepvein, Hammerfall, Gemhollow, Alehearth |
| The Crossroads | Hearthshire, Greenhollow, Bramblewood, Riverside, Peddler's Rest |
| Ashenfang Wastes | Grakthar, Bonepile, Ironfist Hold, Thornback Camp, Ashen Market |
| Shadowmere Marshes | Nethermire, Boghollow, Mistwatch, Cinderkeep, Whispering Docks |
| Frozen Reaches | Drakenspire, Frostfang, Emberpeak, Scalehaven, Wyrmrest |

### Unreleased (in data but not accessible until admin releases)

**~34 common/exotic race towns + Suncoast neutral towns:**

| Region | Towns | Race |
|--------|-------|------|
| The Suncoast | Porto Sole, Coral Bay, Sandrift, Libertad, The Crosswinds Inn, Beacon's End | Neutral |
| Twilight March | Dawnmere, Twinvale, Harmony Point | Half-Elf |
| Scarred Frontier | Scarwatch, Tuskbridge, Proving Grounds | Half-Orc |
| Cogsworth Warrens | Cogsworth, Sparkhollow, Fumblewick | Gnome |
| Pelagic Depths | Coralspire, Shallows End, Abyssal Reach | Merfolk |
| Thornwilds | Thornden, Clawridge, Windrun | Beastfolk |
| Glimmerveil | Glimmerheart, Dewdrop Hollow, Moonpetal Grove | Faefolk |
| Skypeak Plateaus | Skyhold, Windbreak | Goliath |
| Vel'Naris Underdark | Vel'Naris, Gloom Market | Drow |
| Mistwood Glens | Misthaven, Rootholme | Firbolg |
| The Foundry | The Foundry | Warforged |
| The Confluence | The Confluence, Emberheart | Genasi |
| Ashenmoor | Ashenmoor | Revenant |

### Isolated Towns (no travel routes — would strand players if released)

3 towns have no routes in `database/seeds/world.ts`:
1. **Beacon's End** (The Suncoast) — not in any route definition
2. **Peddler's Rest** (The Crossroads) — not in any route definition
3. **Vel'Naris** (Vel'Naris Underdark) — not in any route definition

**These must have routes added BEFORE being released or players will be trapped.**

### Evidence

- Town model: `database/prisma/schema.prisma` ~line 711: `isReleased Boolean @default(false)`
- TravelRoute model: `database/prisma/schema.prisma` ~line 699: `isReleased Boolean @default(false)`
- World map filter: `server/src/routes/world.ts` lines 91-106: `where: { isReleased: true }`
- Travel filter: `server/src/routes/travel.ts` lines 81-93: `where: { isReleased: true }`
- Auto-release: `server/src/lib/ensure-content-released.ts` — releases core race home towns
- Town seeds: `database/seeds/world.ts` — 69 towns, all default `isReleased: false`
- Route seeds: `database/seeds/world.ts` lines 1048-1139 — ~100+ routes, all default `isReleased: false`

---

## Professions

### Release Mechanism

**NONE.** All 29 professions are always available. No `released`/`enabled` field exists.

### Released

All 29:

| Category | Professions |
|----------|------------|
| Gathering (7) | Farmer, Rancher, Fisherman, Lumberjack, Miner, Herbalist, Hunter |
| Crafting (15) | Smelter, Blacksmith, Armorer, Woodworker, Tanner, Leatherworker, Tailor, Alchemist, Enchanter, Cook, Brewer, Jeweler, Fletcher, Mason, Scribe |
| Service (7) | Merchant, Innkeeper, Healer, Stable Master, Banker, Courier, Mercenary Captain |

### Unreleased

None.

### Evidence

- Profession enum: `database/prisma/schema.prisma` lines 83-113: all 29, no release fields
- Profession definitions: `shared/src/data/professions/gathering.ts`, `crafting.ts`, `service.ts` — no `released`/`enabled` fields
- Profession route: `server/src/routes/professions.ts` line 387: `GET /api/professions/available` returns all, status based on player progress (learned/available/locked), not content release
- No `contentType: 'profession'` in ContentRelease system
- No `isProfessionReleased()` function exists

---

## Monsters

### Release Mechanism

**NONE.** All 21 monsters spawn based on biome matching from route terrain. No `active`/`enabled` flag.

### Encounter-able

All 21 monsters are encounter-able via road travel:

| Monster | Level | Biome | Reachable? |
|---------|-------|-------|-----------|
| Goblin | 1 | HILLS | Yes |
| Giant Rat | 1 | UNDERGROUND | Yes |
| Slime | 2 | SWAMP | Yes |
| Wolf | 2 | FOREST | Yes |
| Mana Wisp | 3 | SWAMP | Yes |
| Bandit | 3 | PLAINS | Yes |
| Bog Wraith | 4 | SWAMP | Yes |
| Skeleton Warrior | 5 | SWAMP | Yes |
| Orc Warrior | 6 | BADLANDS | Yes |
| Arcane Elemental | 7 | VOLCANIC | Yes |
| Giant Spider | 7 | UNDERGROUND | Yes |
| Dire Wolf | 8 | TUNDRA | Yes |
| Shadow Wraith | 9 | UNDERGROUND | Yes |
| Troll | 9 | SWAMP | Yes |
| Ancient Golem | 12 | MOUNTAIN | Yes |
| Void Stalker | 13 | UNDERGROUND | Yes |
| Young Dragon | 14 | TUNDRA | Yes |
| Hydra | 15 | COASTAL | Yes |
| Demon | 16 | VOLCANIC | Yes |
| Elder Fey Guardian | 16 | FOREST | Yes |
| Lich | 18 | UNDERGROUND | Yes |

### Not encounter-able (biomes with no monsters)

- **RIVER** — no route terrain maps here, no monsters assigned
- **UNDERWATER** — no route terrain maps here, no monsters assigned
- **DESERT** — no route terrain maps to "desert" (though "arid"/"sand"/"rift" map here per regex, no monsters assigned)

These are effectively unreleased biomes with no content.

### Evidence

- Monster seeds: `database/seeds/monsters.ts` — 21 monsters, no `active`/`enabled` field
- Biome mapping: `server/src/lib/road-encounter.ts` lines 72-85: `TERRAIN_TO_BIOME` regex mapping
- Route terrain: `database/seeds/world.ts` lines 1048-1139: all route terrain strings
- All 10 monster biomes (HILLS, FOREST, PLAINS, UNDERGROUND, SWAMP, BADLANDS, TUNDRA, VOLCANIC, COASTAL, MOUNTAIN) are reachable via at least one route

---

## Items & Recipes

### Gating mechanism

**NONE.** All items and recipes are visible in Codex and craftable with no release filtering.

### Any unreleased items/recipes

No. All ~300+ ItemTemplates and 26+ recipe definitions are available.

**Indirect gating:** Items requiring materials from unreleased towns/zones may be uncraftable in practice (e.g., exclusive zone resources like Deep Sea Iron, Spider Silk), but this is geographic scarcity, not a release flag.

### Evidence

- Codex items endpoint: `server/src/routes/codex.ts` lines 113-137: `GET /api/codex/items` returns ALL ItemTemplate records, no filtering
- Codex recipes endpoint: `server/src/routes/codex.ts` lines 191-215: `GET /api/codex/recipes` returns ALL recipes, no filtering
- No `released`/`enabled` field on ItemTemplate or Recipe models
- Recipe definitions in `shared/src/data/recipes/*.ts`: no release fields
- Item definitions in `shared/src/data/items/`: no release fields

---

## Other Content

### Quests

**No release gating.** 8 tutorial quests always available.
- `shared/src/data/quests/tutorial-quests.ts`: 8-quest chain, no `released` field
- `shared/src/data/quests/index.ts`: exports all quests with no filtering
- The 49 quests mentioned in CLAUDE.md (12 main + 20 town + 8 recurring + 3 guild + 6 bounty) appear to be defined in shared data but only the tutorial chain is actively used

### Buildings

**No release gating.** 21 building types always constructible.
- `shared/src/data/buildings/requirements.ts`: 21 types, no `released`/`enabled` field
- Building construction routes have no release checks

### Elections & Governance

**No release gating.** Functional in all released towns.
- Elections, laws, treasury, appointments — all always enabled
- Only indirectly gated: elections only matter in released towns where players exist

### Enchantments

**No release gating.** All enchantment recipes available.
- `shared/src/data/recipes/enchantments.ts`: no release fields

### Housing

**No release gating.** All housing types available.
- Construction gated by level, gold, and materials — not by release flag

---

## Release Flag Recommendations

### Current State: Two-Tier System

The game has a **well-implemented release system for races and towns** but **nothing else**. This creates an asymmetry:

| Has Release Gating | No Release Gating |
|---|---|
| Races (20) | Classes (7) |
| Towns (69) | Professions (29) |
| Travel Routes (~100+) | Monsters (21) |
| | Items (300+) |
| | Recipes (26+) |
| | Quests (8) |
| | Buildings (21) |

### Is This a Problem?

**For the current game state: mostly fine.** The race+town gating is the highest-impact control:
- Releasing a race automatically makes its home region relevant
- Town release controls geographic access, which indirectly gates region-specific resources, monsters, and trade routes
- Classes, professions, and monsters don't need individual release gates if they're all mechanically sound

### Where It Matters

1. **Classes: Bard and Psion are combat-non-viable** (per balance audit: 0-5% win rates). They're selectable but broken. A class release flag would let you hide them until balanced. Currently the only option is to hardcode them out of `VALID_CLASSES`.

2. **Codex exposes everything:** Players can see ALL items, recipes, and monsters in the Codex — including materials from unreleased zones they can't access. This could be confusing. A `released` filter on Codex endpoints would help.

3. **Monsters in unreleased regions:** If a common/exotic town's routes are released, monsters in those biomes become encounter-able. This is fine as a cascading release — just be aware.

### Recommendation

**Don't add release flags to everything.** The current race+town system provides sufficient control for phased content rollout. Instead:

1. **Add class release gating** — extend `ContentRelease` with `contentType: 'class'`, add `isClassReleased()` check in character creation. This is the most impactful gap.
2. **Add Codex filtering** — respect release status when displaying items/recipes/monsters. Don't show content players can't access yet.
3. **Fix isolated towns** — add routes for Beacon's End, Peddler's Rest, and Vel'Naris before releasing them.
4. **Leave professions/monsters/buildings ungated** — they cascade naturally from town releases.
