# Dual Housing System Audit
Date: 2026-03-12

## 1. Schema Comparison

| Feature | `houses` table | `buildings` table (HOUSE types) |
|---------|---------------|-------------------------------|
| **Primary key** | `id` (text) | `id` (text) |
| **Owner FK** | `characterId` → characters.id (CASCADE) | `ownerId` → characters.id (CASCADE) |
| **Town FK** | `townId` → towns.id (CASCADE) | `townId` → towns.id (CASCADE) |
| **Type** | N/A (always a cottage) | `type`: BuildingType enum (HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE) |
| **Level/Tier** | `tier` integer (default 1) | `level` integer (default 1, 0 = under construction, max 5) |
| **Name** | `name` text (nullable) | `name` text (not null) |
| **Storage capacity** | `storageSlots` integer (default 20) | Derived from `STORAGE_CAPACITY` map: SMALL=20, MEDIUM=50, LARGE=100 |
| **Item storage** | Separate `houseStorage` table (normalized rows: houseId + itemTemplateId + quantity) | Inline `storage` JSONB: `{ items: [{ itemId, itemName, quantity }], condition, rentalPrice, ... }` |
| **Uniqueness** | One per character per town (`characterId + townId` unique index) | One per type per character per town (validated in code, not schema) |
| **Timestamps** | createdAt, updatedAt | createdAt, updatedAt |

### Storage Item Model Comparison

| Aspect | `houseStorage` table | `buildings.storage` JSONB |
|--------|---------------------|---------------------------|
| **Item reference** | `itemTemplateId` FK → itemTemplates.id | `itemId` (string, references items.id — specific item instances) |
| **Stacking** | By template (unique per house+template pair) | By item ID (array of `{ itemId, itemName, quantity }`) |
| **Capacity unit** | Count of distinct item types ≤ `storageSlots` | Count of distinct items ≤ `STORAGE_CAPACITY[type]` |
| **Referential integrity** | FK enforced at DB level (RESTRICT on itemTemplate delete) | No FK — JSONB is unvalidated |
| **Query pattern** | JOIN houseStorage + itemTemplates for display | Parse JSONB, names embedded in the data |

**Critical difference**: `houseStorage` stores by **item template** (generic), `buildings.storage` stores by **item instance** (specific crafted items with quality/enchantments). These are fundamentally different storage models.

---

## 2. houses Table Usage Map

### Server — Routes

**`server/src/routes/houses.ts`** (477 lines, 7 endpoints)

| Endpoint | Lines | Purpose | buildings interaction? |
|----------|-------|---------|----------------------|
| `GET /houses/mine` | ~50-90 | List all houses owned by character (with storage counts) | NO |
| `GET /houses/town/:townId` | ~95-130 | Check if character has house in town | NO |
| `POST /houses/buy` | ~135 | DISABLED (410) — single-town residency | NO |
| `GET /houses/:houseId/storage` | ~140-200 | View storage contents (joins itemTemplates for display) | NO |
| `POST /houses/:houseId/storage/deposit` | ~205-290 | Deposit items from inventory → houseStorage | NO |
| `POST /houses/:houseId/storage/withdraw` | ~295-390 | Withdraw items from houseStorage → inventory (creates Item from template) | NO |
| `POST /houses/:houseId/storage/list` | ~395-470 | List storage items on market (remote OK) | NO |

### Server — Services

**`server/src/lib/starting-house.ts`** (37 lines)
- `giveStarterHouse(characterId, townId, characterName)` — idempotent, creates Tier 1 cottage with 20 storage slots
- Called on character creation and relocation

### Server — Character Lifecycle

**`server/src/routes/characters.ts`** (line 196)
- After character insert: `await giveStarterHouse(character.id, startingTown.id, name)`

**`server/src/routes/relocate.ts`** (lines 228-272)
- Preview: queries old house + houseStorage for warning display
- Confirm: deletes old houseStorage, deletes old house, creates new cottage in target town
- **All stored items in old house are LOST** (not transferred)

**`server/src/services/character-deletion.ts`** (line 10)
- Imports houses/houseStorage but relies on CASCADE deletes

### Server — Daily Tick

**`server/src/jobs/daily-tick.ts`** (lines 1853-1869)
- Rancher harvest: looks for house in asset's town, upserts houseStorage with harvest yield
- This is the ONLY tick logic that writes to houseStorage

### Server — Simulation

**`server/src/lib/simulation/actions.ts`** (lines 2656-2743)
- Bot storage diagnostics: fetches houses, lists items on market from houseStorage
- Bot grain withdrawal: fetches houses, withdraws grain for rancher feeding

### Client

**`client/src/pages/HousingPage.tsx`**
- Fetches `GET /houses/mine` for "My Home" tab
- Displays cottage name, storage progress bar
- Click opens HouseView modal

**`client/src/components/housing/HouseView.tsx`** (418 lines)
- Full storage management modal: deposit, withdraw, list-on-market
- Fetches `GET /houses/:id/storage`
- Mutations: deposit, withdraw, list endpoints
- Shows weight impact preview on withdraw

**`client/src/pages/TownPage.tsx`** (lines 270-276)
- Fetches `GET /houses/town/:townId` (only in home town)
- Displays house card linking to `/housing`

### Database

**`database/schema/tables.ts`** (lines 1892-1935)
- `houses` table definition
- `houseStorage` table definition

**`database/schema/relations.ts`** (lines 1085-1106)
- houses → character, town, houseStorages
- houseStorage → house, itemTemplate
- characters → houses (many)
- towns → houses (many)

---

## 3. buildings Table Usage for HOUSE Types

### Construction

**`client/src/components/housing/ConstructionFlow.tsx`** (lines 44-51)
- ALL_BUILDING_TYPES includes HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE
- Now filtered by town's `availableBuildings` (as of latest commit)

**`server/src/routes/buildings.ts`** (line 188)
- `request-permit` creates building at level 0 with `storage: {}`
- No cross-check against `houses` table for existing cottage

### Construction Requirements

**`shared/src/data/buildings/requirements.ts`** (lines 18-46)
- HOUSE_SMALL: 20 Softwood Planks + 50 Nails + 10 Cut Stone, 24h
- HOUSE_MEDIUM: 30 Hardwood Planks + 100 Nails + 20 Cut Stone + 5 Glass, 72h
- HOUSE_LARGE: 50 Hardwood Planks + 20 Beams + 200 Nails + 40 Cut Stone + 10 Glass + 5 Polished Marble, 168h

### Storage Capacity

**`shared/src/data/buildings/requirements.ts`** (lines 243-248)
- HOUSE_SMALL: 20, HOUSE_MEDIUM: 50, HOUSE_LARGE: 100, WAREHOUSE: 200

### Storage Deposit/Withdraw

**`server/src/routes/buildings.ts`** (lines 818-1024)
- `POST /:buildingId/storage/deposit` — transfers item from inventory to `buildings.storage.items[]` JSONB
- `POST /:buildingId/storage/withdraw` — transfers from JSONB back to inventory
- `GET /:buildingId/storage` — lists items from JSONB
- Uses `STORAGE_TYPES` check to verify building supports storage

### Property Tax

**`server/src/jobs/property-tax.ts`** (lines 12-15)
- HOUSE_SMALL: 5g/day, HOUSE_MEDIUM: 15g/day, HOUSE_LARGE: 30g/day
- Tax scales with building level: `baseTax × level × (1 + townTaxRate)`
- 7-day delinquency → seizure (transferred to mayor)

### Maintenance/Condition

**`server/src/jobs/building-maintenance.ts`**
- Weekly -5 condition degradation applies to ALL buildings including houses
- Tracked in `buildings.storage.condition`

### UI — Building Interior

**`client/src/components/housing/BuildingInterior.tsx`**
- Shows storage UI for STORAGE_TYPES buildings
- Deposit/withdraw via buildings API endpoints

**`client/src/pages/HousingPage.tsx`** (line 59)
- `STORAGE_TYPES` array includes HOUSE_SMALL/MEDIUM/LARGE
- "Workshops" tab shows ALL owned buildings including houses
- Click routing: STORAGE_TYPES + owner → BuildingInterior modal

### Town Directory

**`server/src/routes/buildings.ts`** (GET /buildings/town/:townId)
- Returns all buildings level ≥ 1, including HOUSE types
- Visible to all players in town

### Relocation

**`server/src/routes/relocate.ts`** (lines 257-259)
- Deletes ALL buildings in old town including HOUSE types: `delete(buildings) where ownerId AND townId`

---

## 4. Character Creation & Relocation Flow

### Character Creation

1. `POST /characters/create` inserts character with `homeTownId` and `currentTownId`
2. Immediately calls `giveStarterHouse(characterId, townId, name)`
3. This inserts ONE row into the **`houses`** table: Tier 1, 20 slots, "{name}'s Cottage"
4. **No building is created** in the `buildings` table
5. No `homeHouseId` FK exists on the characters table — house is found via query

### Relocation

1. `POST /relocate/preview` queries old house (houses table) + storage + owned buildings
2. `POST /relocate/confirm` in a transaction:
   - Deletes houseStorage rows for old house
   - Deletes old house row (houses table)
   - Deletes all owned buildings in old town (buildings table) — including any HOUSE_SMALL/MEDIUM/LARGE
   - Deletes livestock and owned assets
   - Updates character's homeTownId, deducts 500g
3. After transaction: `giveStarterHouse(characterId, targetTownId, name)` creates new cottage (houses table)

**Result**: Player starts fresh in new town with a free cottage. All old storage items (both house and building storage) are lost.

---

## 5. Storage System Comparison

### How Items Are Stored

| Aspect | houses system | buildings system |
|--------|--------------|-----------------|
| **Table** | `houseStorage` (normalized, separate rows) | `buildings.storage` JSONB `items[]` array |
| **Item reference** | `itemTemplateId` (template-level, generic) | `itemId` (instance-level, specific item) |
| **Stacking** | One row per template, quantity incremented | One entry per item ID, quantity tracked |
| **Capacity** | `storageSlots` column (20 for starter) | `STORAGE_CAPACITY` map (20/50/100/200) |
| **Referential integrity** | FK → itemTemplates (RESTRICT delete) | None — JSONB is unvalidated |
| **Query cost** | SQL JOIN with itemTemplates for display | JSON parse, names embedded inline |

### Deposit/Withdraw Flow

**houses system** (`/houses/:id/storage/deposit`):
1. Find inventory entry by itemId
2. Look up itemTemplateId from the item
3. Upsert houseStorage row (houseId + itemTemplateId unique pair)
4. Decrease/delete inventory entry

**buildings system** (`/buildings/:id/storage/deposit`):
1. Find inventory entry by itemId
2. Parse `buildings.storage.items[]` JSONB
3. Push or increment entry in array
4. Write entire modified JSONB back to column
5. Decrease/delete inventory entry

### Can Items Exist in Both?

**Yes.** There is no cross-validation. A player could have Iron Ingots in their cottage (houseStorage) AND in a HOUSE_SMALL building (buildings.storage.items). These are completely independent systems.

### Which UI Components Read From Which?

| Component | houses system | buildings system |
|-----------|--------------|-----------------|
| HouseView.tsx | YES — primary storage UI | NO |
| BuildingInterior.tsx | NO | YES — storage for STORAGE_TYPES buildings |
| HousingPage.tsx "My Home" tab | YES — displays cottage | NO |
| HousingPage.tsx "Workshops" tab | NO | YES — displays owned buildings |

---

## 6. Feature Matrix

| Feature | houses table | buildings table (HOUSE types) |
|---------|:-----------:|:-----------------------------:|
| Personal storage | YES (houseStorage table) | YES (storage JSONB items[]) |
| Storage deposit/withdraw | YES (/houses/:id/storage/*) | YES (/buildings/:id/storage/*) |
| Market listing from storage | YES (/houses/:id/storage/list) | NO |
| Construction/building flow | NO (auto-granted) | YES (permit → materials → timer) |
| Property tax | NO | YES (daily, scales with level) |
| Condition/maintenance | NO | YES (weekly -5, war damage) |
| Upgrades/levels | NO (tier field exists but unused) | YES (level 1-5 via construction) |
| Rental | NO | NO (rental is workshop-only) |
| Display in town directory | NO (private) | YES (visible to all players) |
| Auto-created at char creation | YES (giveStarterHouse) | NO (player must request permit) |
| Relocation handling | Deleted + recreated | Deleted (not recreated) |
| Weight system integration | YES (withdraw shows weight preview) | NO |
| Rancher harvest auto-deposit | YES (daily tick upserts houseStorage) | NO |
| Bot simulation support | YES (list items, withdraw grain) | NO |

---

## 7. Conflict Points

### 1. A player CAN have both a cottage AND a HOUSE_SMALL in the same town
- `giveStarterHouse` only checks `houses` table for existing row
- `request-permit` only checks `buildings` table for duplicate type
- No cross-table validation exists
- **Result**: Player has two parallel storage locations in one town with different APIs and UIs

### 2. Storage models are incompatible
- `houseStorage` references `itemTemplateId` (generic: "Iron Ingot" template)
- `buildings.storage.items[]` references `itemId` (specific: a particular crafted Iron Ingot with quality)
- Merging data would require mapping templates ↔ instances

### 3. Rancher harvest goes to houses only
- Daily tick deposits rancher products into `houseStorage`
- If player only has a buildings-system house (no cottage), rancher products have nowhere to go
- Currently impossible because every character gets a cottage, but fragile

### 4. Market listing only from houses
- `POST /houses/:id/storage/list` exists for listing cottage items on market
- No equivalent endpoint exists for buildings system storage
- Player with items in a HOUSE_SMALL building cannot list them on market without withdrawing first

### 5. Weight system only in houses
- `HouseView.tsx` withdraw shows weight impact preview via `GET /equipment/stats`
- `BuildingInterior.tsx` withdraw does NOT show weight preview
- Inconsistent UX for the same action

### 6. Tax on buildings-houses but not cottage
- Player pays daily tax on HOUSE_SMALL/MEDIUM/LARGE in buildings table
- Player pays NOTHING for the auto-granted cottage in houses table
- The free cottage is strictly superior to a HOUSE_SMALL building (same 20 slots, no tax, no construction cost)

### 7. Condition degradation on buildings-houses but not cottage
- Buildings-system houses lose 5 condition/week, eventually becoming non-functional
- Cottage never degrades
- Another way the free cottage is strictly superior

### 8. No data integrity for JSONB storage
- `houseStorage` has FK constraints preventing orphaned references
- `buildings.storage.items[]` has no constraints — if an item is deleted, the JSONB reference becomes stale

---

## 8. Consolidation Recommendation

### Which system is more complete/mature?

**`houses` table** is the actively-used personal housing system:
- Auto-granted on character creation
- Integrated with rancher harvest, bot simulation, market listing, weight system
- Every player has exactly one
- Clean normalized storage model with FK integrity

**`buildings` table HOUSE types** are the aspirational upgrade path:
- Requires construction (materials + time + gold for tax)
- Has property tax, condition, upgrades, town directory visibility
- More game-design-rich but less integrated
- JSONB storage model is less robust

### Which has more code depending on it?

- **houses**: ~1,200 lines (routes/houses.ts 477 + HouseView.tsx 418 + starting-house.ts 37 + relocate integration + daily-tick rancher + sim actions)
- **buildings HOUSE types**: Shared with the broader buildings system (~1,448 lines for ALL building types). HOUSE-specific code is minimal — just STORAGE_TYPES checks and tax rates.

### Minimum Viable Consolidation

**Option A: Keep houses, remove HOUSE types from buildings** (simplest)
- Remove HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_LARGE from `BUILDING_TYPES` enum
- Remove from `availableBuildings` seed data
- Remove from STORAGE_TYPES, tax rates, building requirements
- Add upgrade mechanic to houses table (tier 1→2→3 for more storage slots)
- ~15 files changed, no data migration (nobody has built HOUSE buildings yet in production since buildings table starts empty)
- **Risk**: Loses the material-cost upgrade path for housing

**Option B: Keep buildings, migrate houses to buildings** (more complete but harder)
- On character creation, auto-create a HOUSE_SMALL building instead of a houses row
- Migrate houseStorage data → buildings.storage JSONB
- Add market listing endpoint to buildings storage
- Add weight preview to BuildingInterior
- Add rancher harvest → buildings storage
- Delete houses table, houseStorage table, houses routes, HouseView.tsx, starting-house.ts
- ~25+ files changed, requires data migration for existing players
- **Risk**: Loses FK integrity of houseStorage, loses template-level stacking

**Option C: Clarify roles — cottage is personal, buildings are commercial** (design fix, not code consolidation)
- Keep both systems but make them non-overlapping
- Remove HOUSE_SMALL/MEDIUM/LARGE from BuildingType enum (no player-built houses)
- Add upgrade tiers to the cottage (houses.tier 1→3, increasing storageSlots)
- Upgrade costs materials like buildings but uses houses-specific endpoint
- Cottage remains free, tax-free, maintenance-free personal storage
- Buildings remain commercial: workshops, warehouses, stables, etc.
- WAREHOUSE stays in buildings for commercial bulk storage (taxed, condition)
- ~10 files changed, no data migration

### Recommendation

**Option C** is the cleanest path. It respects the design intent (every player gets a free home) while eliminating the confusing overlap. HOUSE types become cottage upgrade tiers rather than a parallel building system. The two storage models stay separate but serve different purposes: cottage for personal items, WAREHOUSE for commercial bulk storage.
