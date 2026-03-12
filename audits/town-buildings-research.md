# Town Buildings Research Audit
Date: 2026-03-12

## 1. Schema Findings

### Tables

**buildings** (`database/schema/tables.ts` lines 1848-1871)
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| ownerId | text FK→characters.id | CASCADE. All buildings are player-owned. |
| townId | text FK→towns.id | CASCADE |
| type | BuildingType enum | 24 values |
| name | text | Player-chosen name |
| level | integer (default 1) | 0 = under construction, max 5 |
| storage | jsonb (default {}) | Stores condition, rentalPrice, rentalLog[], taxDelinquentSince, items[] |
| createdAt, updatedAt | timestamp | |

**buildingConstructions** (`database/schema/tables.ts` lines 1873-1890)
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| buildingId | text FK→buildings.id | CASCADE |
| status | actionStatus enum | PENDING → IN_PROGRESS → COMPLETED |
| materialsUsed | jsonb (default {}) | {itemName: qty} |
| startedAt, completesAt | timestamp | completesAt set on start-construction |
| createdAt, updatedAt | timestamp | |

**houses** (`database/schema/tables.ts` lines 1892-1915) — Legacy/parallel personal housing system
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| characterId | text FK→characters.id | CASCADE, unique per town |
| townId | text FK→towns.id | CASCADE |
| tier | integer (default 1) | |
| name | text | |
| storageSlots | integer (default 20) | |

**houseStorage** (`database/schema/tables.ts` lines 1917-1935) — Storage items in houses
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| houseId | text FK→houses.id | CASCADE |
| itemTemplateId | text FK→itemTemplates.id | RESTRICT |
| quantity | integer (default 0) | Unique per house+item pair |

**livestock** (`database/schema/tables.ts` lines 2100-2130) — Ranch animals
- Links to `ownedAssets.id` (NOT buildings.id)
- Tracks animalType, age, hunger, health, isAlive, deathCause

**ownedAssets** (`database/schema/tables.ts` lines 2175-2208) — Farm/ranch profession slots
- Separate from buildings table — economy asset slots (CROP_SPOT, LIVESTOCK_SPOT)

**towns.features** (`database/schema/tables.ts` line ~115) — jsonb field storing `availableBuildings[]` per town

### Relations (`database/schema/relations.ts`)
- `buildings → characters` (owner, line ~328)
- `buildings → towns` (location, line ~332)
- `buildings → buildingConstructions` (1:many, line ~335)
- `buildingConstructions → buildings` (line ~340)
- `houses → characters`, `houses → towns`, `houses → houseStorage`

### Enums

**BuildingType** — 24 values (`database/schema/enums.ts` line 6, `shared/src/enums.ts` lines 109-116)
```
HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE,
SMITHY, SMELTERY, TANNERY, TAILOR_SHOP, ALCHEMY_LAB, ENCHANTING_TOWER,
KITCHEN, BREWERY, JEWELER_WORKSHOP, FLETCHER_BENCH, MASON_YARD, LUMBER_MILL, SCRIBE_STUDY,
STABLE, WAREHOUSE, BANK, INN, MARKET_STALL,
FARM, RANCH, MINE
```

**No public/town-owned vs player-owned distinction** — All buildings in the `buildings` table have an `ownerId` FK to characters. There is no mechanism for town-owned public buildings in the schema.

---

## 2. Seed Data Findings

### Town Seeding (`database/seeds/world.ts` lines 180-1050)

Each of the 66 towns is seeded with an `availableBuildings: string[]` array in the `TownDef` interface. This array is stored in the `towns.features` JSONB field.

**No actual building rows are seeded.** The `buildings` table starts empty. Buildings are entirely player-created via the permit system.

### Building Availability by Prosperity Level

| Prosperity | Typical Building Count | Profile |
|------------|----------------------|---------|
| 5 | 9-16 | All professions, full housing tiers |
| 4 | 7-8 | Regional centers, diverse workshops |
| 3 | 5-7 | Specialty + basic services |
| 2 | 4-5 | Minimal: 1-2 workshops + MARKET_STALL + INN + HOUSE_SMALL |

### Universal Buildings (present in all/most towns)
- `MARKET_STALL` — all 66 towns
- `INN` — 60+ towns
- `HOUSE_SMALL` — all towns

### Example Configurations

**Porto Sole (Prosperity 5)** — 16 building types
```
SMITHY, SMELTERY, TANNERY, TAILOR_SHOP, ALCHEMY_LAB, ENCHANTING_TOWER,
KITCHEN, BREWERY, JEWELER_WORKSHOP, MARKET_STALL, BANK, INN, STABLE,
WAREHOUSE, HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE
```

**Kingshold (Prosperity 5)** — 10 building types
```
SMITHY, MARKET_STALL, BANK, INN, STABLE, WAREHOUSE,
TAILOR_SHOP, HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE
```

**Eldergrove (Prosperity 2)** — 4 building types
```
ALCHEMY_LAB, MARKET_STALL, INN, HOUSE_SMALL
```

### Specialties align with available buildings
- Kazad-Vorn ("Forging and Mining") → SMITHY, SMELTERY, MINE
- Aelindra ("Enchanting and Lore") → ENCHANTING_TOWER, ALCHEMY_LAB, SCRIBE_STUDY
- Eldergrove ("Herbalism") → ALCHEMY_LAB only

### No `seedBuildings()` function exists
The seed orchestration in `database/seeds/index.ts` calls `seedWorld()` for towns/regions but has no building-specific seeder. The buildings table remains empty until players build.

---

## 3. Server-Side Findings

### API Routes (`server/src/routes/buildings.ts` ~1448 lines, 18 endpoints)

**Construction:**
| Endpoint | Purpose |
|----------|---------|
| `POST /buildings/request-permit` | Create building at level 0, check town capacity (pop/100, min 20) |
| `POST /buildings/deposit-materials` | Transfer materials from inventory to construction |
| `POST /buildings/start-construction` | Begin timer (requires all materials deposited) |
| `GET /buildings/construction-status?buildingId=` | Check progress (% complete, remaining minutes) |
| `POST /buildings/complete-construction` | Finish construction, increment level |
| `POST /buildings/upgrade` | Start upgrade (level < 5, no active construction) |

**Ownership & Directory:**
| Endpoint | Purpose |
|----------|---------|
| `GET /buildings/mine` | All player's buildings across towns |
| `GET /buildings/town/:townId` | Town building directory (level >= 1 only) |
| `GET /buildings/:buildingId` | Building detail (condition, storage, rental info) |

**Storage:**
| Endpoint | Purpose |
|----------|---------|
| `POST /buildings/:buildingId/storage/deposit` | Add items to building storage |
| `POST /buildings/:buildingId/storage/withdraw` | Remove items from storage |
| `GET /buildings/:buildingId/storage` | List stored items + capacity |

**Rental (workshops):**
| Endpoint | Purpose |
|----------|---------|
| `POST /buildings/:buildingId/rent/set-price` | Owner sets rental price per use |
| `POST /buildings/:buildingId/rent/use` | Pay to use workshop (condition >= 25 required) |
| `GET /buildings/:buildingId/rent` | Get rental details |
| `GET /buildings/:buildingId/rent/income` | Rental income history (last 50) |

**Maintenance & Economics:**
| Endpoint | Purpose |
|----------|---------|
| `POST /buildings/:buildingId/repair` | Restore condition (cost: level*2 gold per point) |
| `GET /buildings/town/:townId/economics` | Mayor-only economic report |

### Cron Jobs

**construction-complete.ts** — `*/5 * * * *` (every 5 minutes)
- Finds IN_PROGRESS constructions with completesAt <= now
- Emits `building:constructed` socket event (player must still call complete-construction)

**building-maintenance.ts** — `0 3 * * 1` (weekly Monday 03:00)
- Degrades all buildings by 5 condition points
- Notifications at thresholds: <50, <25, <=0
- `applyWarDamage(townId)`: 1-3 random buildings take 20-50 damage

**property-tax.ts** — `0 0 * * *` (daily midnight)
- Daily tax = baseTax × level × (1 + townPolicyTaxRate)
- Base rates defined for all 24 types (e.g., HOUSE_SMALL: 5g, SMITHY: 20g, WAREHOUSE: 25g)
- 7-day delinquency → building seized, transferred to mayor

### Crafting Integration (`server/src/routes/crafting.ts` lines 73-79)

`findWorkshop(characterId, currentTownId, professionType)`:
- Queries buildings by town + type matching `PROFESSION_WORKSHOP_MAP`
- APPRENTICE tier: no workshop required
- JOURNEYMAN+ tiers: require matching workshop in current town
- Workshop level applies speed bonus: `(1 + 0.1 × level)%`

### Daily Tick Integration (`server/src/jobs/daily-tick.ts`)
- Livestock production for RANCHER buildings (lines 522-727)
- Workshop lookup for crafting actions (line 1952)
- Property tax collection (lines 2147-2270) — mirrors property-tax.ts job

### Racial Construction Bonuses (`server/src/routes/buildings.ts` lines 84-100)
| Race | Bonus |
|------|-------|
| Human | -10% materials |
| Dwarf | -15% construction days (stone buildings only) |
| Gnome | -10% materials (workshops only) |
| Forgeborn | -20% construction days |
| Firbolg/Mosskin | -25% materials (wood buildings only) |

### Governance (`server/src/routes/governance.ts`)
- `'building'` is one of 5 law categories — laws can affect building policies/taxes

---

## 4. Client-Side Findings

### Pages

**HousingPage** (`client/src/pages/HousingPage.tsx` — 492 lines)
- 3 tabs: "My Home" (cottage + storage), "Workshops" (owned buildings), "Town Buildings" (directory)
- Routing: `/housing` (lazy-loaded from App.tsx line 41)
- Only visible in player's current town

**TownPage** (`client/src/pages/TownPage.tsx` — 757 lines)
- **9 hardcoded static town buildings** (lines 131-141): Market, Tavern, Apothecary, Blacksmith, Town Hall, Notice Board, Temple, Jobs Board, Stable
- These are NOT player-owned — they're static navigation links to existing pages
- Housing tile links to `/housing` (only in home town)

### Housing Components (`client/src/components/housing/`)

| Component | Lines | Purpose |
|-----------|-------|---------|
| BuildingCard.tsx | 177 | Reusable card with type labels (23 types), icons, level stars, status badges |
| BuildingDirectory.tsx | 144 | Filterable grid of town buildings (fetches from `/buildings/town/{townId}`) |
| BuildingInterior.tsx | 337 | Storage & upgrade management modal |
| WorkshopView.tsx | 260 | Rental management, bonus display (speed: level×10%, quality: level) |
| ShopView.tsx | 82 | Market stall placeholder ("Marketplace listing coming soon") |
| ConstructionFlow.tsx | 395 | 4-step construction: Select → Materials → Building → Done |
| ConstructionProgress.tsx | 152 | Material checklist + live countdown timer |
| HouseView.tsx | 418 | Cottage storage, deposit/withdraw, market listing, weight system |

### Socket Events (`client/src/hooks/useBuildingEvents.ts` — 173 lines)
6 real-time event handlers:
- `building:constructed` — completion notification
- `building:taxDue` — tax payment due
- `building:delinquent` — overdue taxes warning
- `building:seized` — building seized for non-payment
- `building:damaged` — war damage notification
- `building:conditionLow` — needs repair warning

### Navigation
- "Housing" entry in Navigation.tsx, Sidebar.tsx, BottomNav.tsx
- Icon: `Building2` (lucide-react), Route: `/housing`, Category: "Economy", `townOnly: true`

### Building Icons
All from lucide-react — no custom building image assets:
- HOME for house types
- WAREHOUSE for warehouses
- STORE for market stalls
- WRENCH for workshops
- BUILDING2 fallback

### Hardcoded Building Lists
- TownPage.tsx: 9 static town buildings (Market, Tavern, etc.) — navigation links, NOT player buildings
- HousingPage.tsx: `WORKSHOP_TYPES` (14 types) and `STORAGE_TYPES` (4 types) imported from shared
- BuildingCard.tsx: 23 building type → display label mapping
- ConstructionFlow.tsx: all 24 building types defined for selection

---

## 5. Shared Type Findings

### Enums (`shared/src/enums.ts` lines 109-116)
```typescript
export const BUILDING_TYPES = [
  'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE',
  'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB',
  'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP',
  'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY',
  'STABLE', 'WAREHOUSE', 'BANK', 'INN', 'MARKET_STALL',
  'FARM', 'RANCH', 'MINE'
] as const;
export type BuildingType = typeof BUILDING_TYPES[number];
```

### Building Config (`shared/src/data/building-config.ts`)
- `WORKSHOP_TYPES`: 13 crafting workshop types
- `STORAGE_TYPES`: 4 storage building types (HOUSE_SMALL/MEDIUM/LARGE, WAREHOUSE)
- `STONE_BUILDINGS`: 7 types (dwarf racial bonus targets)
- `WOOD_BUILDINGS`: 10 types (firbolg racial bonus targets)
- `CONDITION_TIERS`: 5 tiers with effectiveness multipliers (1.0 → 0.90 → 0.75 → 0.50 → 0)

### Building Requirements (`shared/src/data/buildings/requirements.ts`)
- `BUILDING_REQUIREMENTS`: All 24 types with materials[] and constructionTimeHours
- `STORAGE_CAPACITY`: HOUSE_SMALL=20, HOUSE_MEDIUM=50, HOUSE_LARGE=100, WAREHOUSE=200
- `getMaterialsForLevel(type, level)`: Materials × 1.5^(level-1)
- `getConstructionTimeForLevel(type, level)`: Hours × 1.5^(level-1)

### Crafting Config (`shared/src/data/crafting-config.ts` lines 31-47)
```typescript
PROFESSION_WORKSHOP_MAP: {
  SMELTER→SMELTERY, BLACKSMITH→SMITHY, TANNER→TANNERY,
  TAILOR→TAILOR_SHOP, MASON→MASON_YARD, WOODWORKER→LUMBER_MILL,
  ALCHEMIST→ALCHEMY_LAB, ENCHANTER→ENCHANTING_TOWER,
  COOK→KITCHEN, BREWER→BREWERY, JEWELER→JEWELER_WORKSHOP,
  FLETCHER→FLETCHER_BENCH, LEATHERWORKER→TANNERY, ARMORER→SMITHY,
  SCRIBE→SCRIBE_STUDY
}
```
Note: LEATHERWORKER shares TANNERY with TANNER; ARMORER shares SMITHY with BLACKSMITH.

### Housing Recipes (`shared/src/data/recipes/housing.ts`)
~20 furniture recipes (WOODWORKER/MASON) — separate from buildings, placed inside houses for decoration/buffs.

---

## 6. Design Doc Findings

### Economy YAML (`docs/profession-economy-master.yaml` lines 321-357)
- Section "BUILDINGS & WORKSHOPS" lists 18 building types with built-by/used-by/bonus
- Categories: Gathering (Farm, Ranch, Mine, Lumber Mill), Crafting (13 workshops), Service (Stable, Warehouse, Bank, Inn/Tavern)
- Building levels 1-5, upgrades require materials + gold + time

### ECONOMY.md (`docs/ECONOMY.md` lines 322-356)
- Workshop bonuses by level: L1 basic → L5 +80% speed, max quality, legendary recipes
- Quality formula includes workshop bonus: d20 + (ProfLevel/5) + ToolBonus + **WorkshopBonus**
- APPRENTICE tier doesn't require workshop; JOURNEYMAN+ does

### Tax System Design (`docs/tax-system-design.md`)
- Weekly property tax on all buildings
- Assessed values by tier (T1 workshop: 100g, T2: 200g, T3: 350g)
- Maintenance creates ongoing material demand

### Economy Prompts (`design-docs/economy-prompts-phase2.md` lines 387-456)
- Prompt 13 spec: House features (storage, display room, rest bonus, roommate), workshop features (rental, speed/quality), shop features (persistent stall), building destruction in wars

### CHANGELOG.md
- Prompt 07: Workshop bonus system implementation
- Prompt 11: Full housing/building system — construction, maintenance, town directory, lot capacity

### WORLD_MAP.md (line 39)
- Confirms 68 towns seeded with building features

### GAME_GUIDE.md
- Brief mention of buildings as part of economy/crafting system

---

## 7. Town Data Summary

### Buildings Per Prosperity Level

**Prosperity 5 Towns (5 total):**
| Town | Region | Building Count | Notable |
|------|--------|---------------|---------|
| Kingshold | Verdant Heartlands | 10 | Capital: SMITHY, BANK, STABLE, WAREHOUSE, housing tiers |
| Porto Sole | The Suncoast | 16 | Largest: all workshops + services |
| Aelindra | Silverwood Forest | 9 | Arcane focus: ENCHANTING_TOWER, ALCHEMY_LAB, SCRIBE_STUDY |
| Kazad-Vorn | Ironvault Mountains | ~10 | Mining/forging: SMITHY, SMELTERY, MINE |
| Hearthshire | The Crossroads | ~9 | Trade hub |

**Prosperity 4 Towns (11 total):**
Millhaven, Bridgewater, Deepvein, Gemhollow, Peddler's Rest, Nethermire, Drakenspire, Libertad, Dawnmere, Tuskbridge, Cogsworth, Coralspire, Skyholm — 7-8 building types each

**Prosperity 3 Towns (22 total):**
Ironford, Whitefield, Moonhaven, Thornwatch, Willowmere, Greenhollow, Ashen Market, Mistwatch, Cinderkeep, Whispering Docks, Emberpeak, Scalehaven, Coral Bay, Sandrift, Twinvale, Harmony Point, Scarwatch, Proving Grounds, Sparkhollow, Tideholm, Beastholm, Starlight Vale, Nethermere, The Anvil, Elemental Nexus — 5-7 building types each

**Prosperity 2 Towns (12 total):**
Eldergrove, Bramblewood, Bonepile, Ironfist Hold, Thornback Camp, Boghollow, Frostfang, Wyrmrest, Fumblewick, Fangcrest, Moonwhisper Glade, Windpeak, Obsidian Court, Elderwood Sanctuary, Gravehollow — 3-5 building types each

### All towns differ in building availability. No two prosperity-5 towns have identical configurations.

---

## 8. Gap Analysis

### Buildings in schema but not seeded
All 24 building types exist in the enum and requirements data but **zero building rows are seeded**. The `buildings` table starts empty — all buildings are player-created. This is by design (player-driven economy), not a gap.

### Buildings referenced in UI but not in database
- **9 static town buildings** in TownPage.tsx (Market, Tavern, Apothecary, Blacksmith, Town Hall, Notice Board, Temple, Jobs Board, Stable) are hardcoded navigation links to pages, NOT entries in the buildings table. These represent public infrastructure, not player buildings.
- **ShopView.tsx** (MARKET_STALL) is a placeholder — "Marketplace listing coming soon."

### Buildings in design docs but not implemented
- **Display rooms** for house decoration (Prompt 13 spec) — not implemented
- **Rest bonus** from housing — not implemented
- **Roommate system** — not implemented
- **Mayor-controlled building permits** — currently auto-approved (API checks `buildingPermits` boolean on town but defaults true)
- **Legendary recipes** unlocked at workshop level 5 — not implemented (speed/quality bonuses work, but no level-gated recipes)

### Public vs player-owned building distinction
- **No schema distinction.** All entries in `buildings` table are player-owned (have `ownerId`).
- The 9 static town buildings in TownPage.tsx are a separate concept — hardcoded navigation, not database entities.
- There is no `publicBuildings` table or `isPublic` flag. If public buildings are desired, they'd need schema changes.

### Dual housing systems
- **`buildings` table**: Player-owned economy buildings (workshops, storage, etc.) with construction/rental/tax
- **`houses` table**: Legacy personal housing with simple storage slots
- These overlap for HOUSE_SMALL/MEDIUM/LARGE types. The `buildings` table handles these via STORAGE_TYPES, while `houses` has its own separate system with `houseStorage`. This is a potential source of confusion.

### availableBuildings not enforced
- Towns have `availableBuildings` in their features JSONB, but the `request-permit` endpoint does **not** validate that the requested building type is in the town's available list. Any building type can be built in any town.

### Hardcoded building lists
- TownPage.tsx line 131-141: 9 static buildings hardcoded (appropriate — these are pages, not DB entities)
- BuildingCard.tsx line 40-65: 23 type→label mapping (should track BUILDING_TYPES enum)
- ConstructionFlow.tsx line 44-51: 24 building types listed (duplicates enum)

---

## 9. Raw Reference List

Every building name/type found in the codebase, deduplicated:

### Building Type Enum Values (24)
| Type | Found In |
|------|----------|
| HOUSE_SMALL | schema/enums, shared/enums, building-config, requirements, seeds/world, HousingPage, BuildingCard, ConstructionFlow |
| HOUSE_MEDIUM | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |
| HOUSE_LARGE | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |
| SMITHY | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, HousingPage, BuildingCard, ConstructionFlow |
| SMELTERY | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| TANNERY | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| TAILOR_SHOP | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| ALCHEMY_LAB | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| ENCHANTING_TOWER | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| KITCHEN | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| BREWERY | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| JEWELER_WORKSHOP | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| FLETCHER_BENCH | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| MASON_YARD | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| LUMBER_MILL | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| SCRIBE_STUDY | schema/enums, shared/enums, building-config, requirements, crafting-config, seeds/world, BuildingCard, ConstructionFlow |
| STABLE | schema/enums, shared/enums, requirements, seeds/world, BuildingCard, ConstructionFlow, TownPage (hardcoded) |
| WAREHOUSE | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |
| BANK | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |
| INN | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |
| MARKET_STALL | schema/enums, shared/enums, requirements, seeds/world, HousingPage, ShopView, BuildingCard, ConstructionFlow |
| FARM | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |
| RANCH | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |
| MINE | schema/enums, shared/enums, building-config, requirements, seeds/world, BuildingCard, ConstructionFlow |

### Static Town Buildings (TownPage.tsx — not in buildings table)
| Name | Route | Icon |
|------|-------|------|
| Market | /market | Store |
| Tavern | /tavern | Beer |
| Apothecary | /apothecary | FlaskConical |
| Blacksmith | /blacksmith | Hammer |
| Town Hall | /town-hall | Castle |
| Notice Board | /notice-board | ScrollText |
| Temple | /temple | Church |
| Jobs Board | /jobs | Briefcase |
| Stable | /stable | Horse |

### Building-Adjacent Systems
| System | Table | Relation to Buildings |
|--------|-------|-----------------------|
| Houses | houses | Parallel personal housing (legacy?) |
| House Storage | houseStorage | Items stored in houses |
| Livestock | livestock | Links to ownedAssets (not buildings) |
| Owned Assets | ownedAssets | Farm/ranch profession slots (separate system) |
| Furniture/Recipes | recipes/housing.ts | Decorative items for houses (WOODWORKER/MASON) |

### Socket Events
| Event | Emitter |
|-------|---------|
| building:constructed | construction-complete.ts job |
| building:taxDue | property-tax.ts job |
| building:delinquent | property-tax.ts job |
| building:seized | property-tax.ts job |
| building:damaged | building-maintenance.ts (war damage) |
| building:conditionLow | building-maintenance.ts (degradation) |

### Key File Index
| File | Purpose |
|------|---------|
| database/schema/enums.ts:6 | BuildingType pgEnum (24 values) |
| database/schema/tables.ts:1848-1935 | buildings, buildingConstructions, houses, houseStorage tables |
| database/schema/relations.ts:328-345 | Building relations |
| database/seeds/world.ts:180-1050 | 66 town definitions with availableBuildings[] |
| shared/src/enums.ts:109-116 | BUILDING_TYPES const array + type |
| shared/src/data/building-config.ts | WORKSHOP_TYPES, STORAGE_TYPES, STONE/WOOD_BUILDINGS, CONDITION_TIERS |
| shared/src/data/buildings/requirements.ts | Construction materials, time, storage capacity for all 24 types |
| shared/src/data/crafting-config.ts:31-47 | PROFESSION_WORKSHOP_MAP (15 profession→workshop mappings) |
| shared/src/data/recipes/housing.ts | ~20 furniture recipes |
| server/src/routes/buildings.ts | 18 API endpoints (~1448 lines) |
| server/src/jobs/construction-complete.ts | Every-5-min completion check |
| server/src/jobs/building-maintenance.ts | Weekly degradation + war damage |
| server/src/jobs/property-tax.ts | Daily tax collection + seizure |
| server/src/routes/crafting.ts:73-79 | findWorkshop() for profession crafting |
| server/src/jobs/daily-tick.ts | Livestock production, workshop lookup, tax collection |
| server/src/socket/events.ts:246-315 | 6 building socket event emitters |
| client/src/pages/HousingPage.tsx | Main housing hub (492 lines) |
| client/src/pages/TownPage.tsx:131-141 | 9 hardcoded static town buildings |
| client/src/components/housing/*.tsx | 8 building UI components |
| client/src/hooks/useBuildingEvents.ts | Socket event listeners (6 events) |
| docs/ECONOMY.md:322-356 | Building/workshop level bonuses |
| docs/profession-economy-master.yaml:321-357 | Building types master list |
| docs/tax-system-design.md | Property tax assessed values |
