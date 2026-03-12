# Tavern/INN System Audit
Date: 2026-03-12

## 1. INN Building Current State

### Classification
- **Category:** Service Building (not workshop, not storage)
- **Wood building:** Firbolg racial bonus applies (-25% materials) — `shared/src/data/building-config.ts:26`
- **NOT in WORKSHOP_TYPES** — cannot be rented via workshop rental system (`building-config.ts:8-12`)
- **NOT in STORAGE_TYPES** — does not support building item storage (`building-config.ts:15-17`)
- **NOT in STONE_BUILDINGS** — no Dwarf bonus

### Construction Requirements (`shared/src/data/buildings/requirements.ts:163-172`)
| Material | Quantity |
|----------|----------|
| Hardwood Planks | 30 |
| Beams | 10 |
| Nails | 100 |
| Cut Stone | 20 |
| Glass | 8 |
| **Construction Time** | **72 hours** |

### Tax Rate
- **25g/day** base — same tier as WAREHOUSE and BANK (`server/src/jobs/property-tax.ts:29`)
- Formula: `baseTax × level × (1 + townPolicyRate)`
- Daily tick duplicate: `server/src/jobs/daily-tick.ts` has same rate in BASE_PROPERTY_TAX_RATES

### INN-Specific Logic
- **Innkeeper income in daily tick** (`server/src/jobs/daily-tick.ts:858-885`): Innkeepers earn 5g per resting character in their town, split among all innkeepers. This is tied to the INNKEEPER *profession*, NOT to INN building ownership.
- **No INN-specific routes** in `server/src/routes/buildings.ts`
- **No INN-specific client components** — treated generically

### Building Level Bonuses
- INN is not a workshop, so no speed/quality bonuses apply
- Condition degradation: 5 points/week (same as all buildings)
- Condition tiers: FULL (75-100%), DEGRADED (50-74%, 0.90×), POOR (25-49%, 0.75×), CONDEMNED (1-24%, 0.50×), NON_FUNCTIONAL (0%, 0×)

### Rental
- **Not rentable.** Only WORKSHOP_TYPES support the rental system. INN is excluded.

---

## 2. Building Storage Mechanics

### Schema (`database/schema/tables.ts:1855`)
- Column: `storage: jsonb().default({}).notNull()` on `buildings` table
- Generic JSONB — used for multiple purposes depending on building type

### What lives in `buildings.storage` JSONB
- **Condition tracking:** `condition` (number, 0-100)
- **Workshop rental:** `rentalPrice` (number), `rentalLog` (array of up to 100 transactions)
- **Warehouse items:** `items: [{ itemId, itemName, quantity }, ...]`
- **Tax delinquency:** `taxDelinquentSince` (ISO date string)

### Storage-Supporting Types
- **STORAGE_TYPES = `['WAREHOUSE']`** only (`shared/src/data/building-config.ts:15-17`)
- STORAGE_CAPACITY: WAREHOUSE = 200 slots (`shared/src/data/buildings/requirements.ts:213`)
- INN does NOT support storage deposit/withdraw

### Building Storage Routes (`server/src/routes/buildings.ts`)
| Route | Lines | Purpose |
|-------|-------|---------|
| `GET /:buildingId/storage` | 988-1024 | Fetch stored items and capacity |
| `POST /:buildingId/storage/deposit` | 820-905 | Deposit item from inventory |
| `POST /:buildingId/storage/withdraw` | 910-983 | Withdraw item to inventory |

All routes gate on `hasStorage(building.type)` which checks STORAGE_TYPES.

### Building Storage vs Cottage Storage
| Aspect | Building (Warehouse) | Cottage (houseStorage) |
|--------|---------------------|----------------------|
| Data model | JSONB field on buildings row | Separate `houseStorage` table |
| Item reference | itemId (instance) | itemTemplateId (template-level) |
| Capacity | Slot count (200 for warehouse) | Slot count (20-100 by tier) |
| Stacking | By itemId (instance) | By itemTemplateId (template) |
| Remote listing | No | Yes (market listing from storage) |

### What would INN need for storage
- Either add 'INN' to STORAGE_TYPES (uses existing JSONB warehouse pattern)
- Or create a new INN-specific storage model (e.g., a "menu" concept with template-level items + prices)

---

## 3. Selling From Buildings

### Existing Sell Mechanics
- **Market system** (`server/src/routes/market.ts`): Players list items for sale from personal inventory
  - `POST /market/list` — create listing with price, quantity, item
  - Listings tied to a town (`townId`) with expiration (`LISTING_DURATION_DAYS`)
  - Buyers use `POST /market/buy` to purchase

- **Cottage storage → market** (`server/src/routes/houses.ts`): Players can list items from cottage storage directly on the market without withdrawing to inventory first
  - `POST /houses/:houseId/storage/list` — remote listing from cottage storage

- **NO building storage → market listing exists.** Warehouse items must be withdrawn to inventory first, then listed on market.

### Workshop Rental System (closest analog to "pay at building")
| Route | Purpose |
|-------|---------|
| `POST /:buildingId/rent/set-price` | Owner sets usage price |
| `POST /:buildingId/rent/use` | Renter pays to use workshop |
| `GET /:buildingId/rent` | View rental info |
| `GET /:buildingId/rent/income` | View income history |

- Owner uses own workshop free
- Renter pays → gold splits: owner share + town tax cut
- Rental log stored in `buildings.storage.rentalLog` (last 100)

### ShopView Component (`client/src/components/housing/ShopView.tsx`)
- Shows **placeholder text**: "Marketplace listing coming soon. Use the Market page to buy and sell."
- No actual sell-from-building functionality implemented

### What's missing for INN item sales
- No concept of a "building menu" (items + prices set by owner)
- No "buy from building" endpoint
- No building-level item inventory separate from warehouse storage
- The cottage storage → market listing pattern is the closest analog but is owner-only

---

## 4. Player Presence System

### Current Location Model (`database/schema/tables.ts`)
| Field | Line | Purpose |
|-------|------|---------|
| `currentTownId` | 439 | Which town the player is in (null = traveling) |
| `travelStatus` | 468 | 'idle' or 'traveling' |
| `homeTownId` | 470 | Home town for cottage/housing |

### Sub-Town Location
- **Does not exist.** There is no concept of being "at" a specific building within a town.
- No "check in", "visit", "presence" tracking anywhere in the codebase.
- Players are either in a town or traveling — that's it.
- Combat sessions record `locationTownId` but that's just which town the combat is near.

### Travel State (`characterTravelStates` table, line 527)
- Tracks position along routes: `routeId`, `currentNodeIndex`, `direction`, `speedModifier`
- No intermediate "building visit" state

### What would INN presence need
- A new field on characters (e.g., `checkedInBuildingId`) or a separate `building_visits` table
- Check-in / check-out endpoints
- Presence query: "who is at this INN?"
- Automatic checkout on travel/disconnect/tick

---

## 5. Buff System

### Active Effects Table (`database/schema/tables.ts:506`)
```
characterActiveEffects {
  id, characterId, sourceType, effectType, magnitude,
  effectType2, magnitude2, itemName, createdAt, expiresAt
}
```
- `sourceType`: ConsumableSourceType enum = `POTION | FOOD | SCROLL`
- Effects expire after 24 hours
- Expired effects auto-deleted in daily tick Step 0

### Daily Consumable Limits (`database/schema/tables.ts:476-478`)
- `potionBuffUsedToday: boolean` — 1 stat buff potion per day
- `foodUsedToday: boolean` — 1 food per day
- `scrollUsedToday: boolean` — 1 scroll per day
- All reset to false in daily tick Step 0

### Consumable Usage (`server/src/routes/items.ts:318`)
- `POST /items/use-consumable` — use a consumable item
- Only when idle (not traveling)
- Creates `characterActiveEffects` row with effect type + magnitude
- Supported buff types: `buff_strength`, `buff_dexterity`, `buff_constitution`, `buff_intelligence`, `buff_wisdom`, `buff_charisma`

### Food Auto-Consumption (`server/src/services/food-system.ts:121`)
- Daily tick Step 1: auto-consumes food based on priority setting
- Priority options: EXPIRING_FIRST, BEST_FIRST, SPECIFIC_ITEM, CATEGORY_ONLY
- Food buff applied when consumed: `{ effectType, magnitude, effectType2?, magnitude2? }`

### Well Rested Flag
- `wellRested: boolean` on characters table (line 467)
- Set to `true` when character rests with FED hunger state (daily tick line ~1077)
- Set to `false` when character rests while hungry
- REST action grants 15% max HP recovery when FED
- **wellRested is NOT currently integrated into combat calculations or any other system** — it's a flag with no mechanical effect beyond being set

### What INN rest bonus would need
- Either extend `wellRested` to carry a magnitude (e.g., inn tier bonus)
- Or create a new active effect with sourceType like 'INN_REST'
- Would need to add 'INN_REST' to ConsumableSourceType enum or use a separate mechanism
- Integration point: daily tick REST action processing would check if character is checked into an INN

---

## 6. Current TavernPage Analysis

### File: `client/src/pages/TavernPage.tsx` (229 lines)

### What it does
- Renders a "Drinks Menu" page themed like a tavern
- Fetches character data (currentTownId, gold)
- Calls `GET /market/browse?isBeverage=true` to fetch beverage listings from the town market
- Displays listings with: seller name, price, quantity, description
- Buy button calls `POST /market/buy` (standard market purchase)
- Shows loading/error states

### Route Registration
- `client/src/App.tsx:115` — `/tavern` route, lazy-loaded

### Connection to INN Buildings
- **ZERO.** TavernPage is a pure market filter view for beverages. It does not reference INN buildings, INNKEEPER profession, or any building system. It's the equivalent of going to the market and filtering by "beverages".

### API Endpoints Used
- `GET /characters/me` — character info
- `GET /market/browse?isBeverage=true` — beverage listings
- `POST /market/buy` — purchase

---

## 7. Food & Beverage Item Catalog

### Item Template Flags (`database/schema/tables.ts`)
- `isFood: boolean` — marks food items
- `isBeverage: boolean` — marks beverage items
- `isPotion: boolean` — marks potion items
- `isPerishable: boolean` — marks perishable items
- `shelfLifeDays: integer` — days before spoilage
- `foodBuff: jsonb` — stat buff when consumed

### Food Items Seed (`database/seeds/food-items.ts`, 27 items)

**Raw Ingredients (6):** Raw Fish (1d), Raw Meat (2d), Fresh Dairy (2d), Fresh Herbs (2d), Fresh Produce (3d), Grain Sack (7d)

**Basic Prepared (6):** Bread Loaf (4d), Porridge (3d), Cooked Meat (3d), Stew (3d), Grilled Fish (3d), Cheese Wheel (5d)

**Preserved (5):** Jerky (10d), Smoked Fish (10d), Salted Provisions (12d), Pickled Vegetables (14d), Hardtack (14d)

**Quality Meals (5, with buffs):**
| Item | Buff | Shelf Life |
|------|------|------------|
| Hearty Stew | +1 STR | perishable |
| Fisherman's Feast | +1 DEX | perishable |
| Herbalist Salad | +1 WIS | perishable |
| Miner's Pie | +5% gather | perishable |
| Scholar's Broth | +5% craft | perishable |

**Fine Cuisine (5, powerful buffs):**
| Item | Buff | Shelf Life |
|------|------|------------|
| Royal Feast | +2 chosen stat | perishable |
| Warrior's Banquet | +10% combat dmg | perishable |
| Artisan's Delight | +10% craft quality | perishable |
| Explorer's Rations | +1 all stats | perishable |
| Elixir-Infused Meal | +15% profession bonus | perishable |

**Beverages (5):**
| Item | Buff | Shelf Life |
|------|------|------------|
| Ale | +1 CHA | 14d |
| Wine | +1 CHA | 30d (FINE) |
| Mead | +1 CON | 21d |
| Spirits | +2 CHA, -1 WIS | 60d (FINE) |
| Healing Draught | +10% HP recovery | 7d (FINE) |

### Producing Professions
- **COOK:** Bread, meals, feasts — 6 recipes in `shared/src/data/recipes/cook.ts`
- **BREWER:** Ale, cider, wine, beer, cordials — 9 recipes in `shared/src/data/recipes/consumables.ts:698-904`
  - Tier 1 (L3-4): Ale, Apple Cider, Berry Cordial
  - Tier 2 (L5-6): Strong Ale, Mulled Cider, Herbal Brew
  - Tier 3 (L7-8): Hopped Beer, Grape Wine, Pale Ale

### Market Beverage Filter
- `server/src/routes/market.ts:229,268-269` — `isBeverage=true` query param filters `itemTemplate.isBeverage`

---

## 8. Innkeeper Profession

### Definition (`shared/src/data/professions/service.ts:23-41`)
```
type: INNKEEPER
category: SERVICE
primaryStat: CHA
relatedProfessions: COOK, BREWER, MERCHANT
```

### Tier Unlocks (design doc only, NOT implemented)
| Tier | Described Feature |
|------|-------------------|
| APPRENTICE | Basic room rental, simple rest buff |
| JOURNEYMAN | Better rooms, food/drink service, minor rest buffs |
| CRAFTSMAN | Quality inn, moderate rest buffs, rumor network |
| EXPERT | Grand inn, strong rest buffs, private meeting rooms |
| MASTER | Legendary establishment, superior buffs, VIP services |
| GRANDMASTER | Mythical inn (unique rest buffs), cross-town reputation |

### Mechanical Implementation
- **Innkeeper income in daily tick** (`server/src/jobs/daily-tick.ts:858-885`):
  - 5g per resting character in town, split among all active innkeepers
  - This is profession-based income, NOT building-based
- **No room rental mechanic exists**
- **No rest buff mechanic exists**
- **No rumor network or social hub features exist**
- **No INN ↔ INNKEEPER profession link** — owning an INN building gives no benefit to the Innkeeper profession and vice versa

### Profession-Workshop Mapping
- `shared/src/data/crafting-config.ts:31-47` — maps profession → required workshop building
- **INNKEEPER is NOT in this mapping.** The INN building type has no linked profession for crafting purposes.

---

## 9. Infrastructure Gap Analysis

| Feature | What Exists | What's Missing |
|---------|------------|----------------|
| **Tavern directory (list INNs in town)** | Building directory component shows all town buildings including INNs | No INN-specific directory/listing; no occupancy or rating info |
| **INN-specific item menu with prices** | Nothing. ShopView is a placeholder. | Entire concept: menu data model, owner price setting, buyer browsing |
| **Inn owner stocks items into building** | Warehouse storage deposit exists; cottage storage exists | INN not in STORAGE_TYPES; would need storage support or new "menu" model |
| **Player check-in to specific inn** | Nothing. Only town-level location tracking. | Entire concept: check-in/out endpoints, sub-town presence field, auto-checkout |
| **Player count per inn** | Nothing. | Presence tracking table/field, query endpoint, real-time count via socket |
| **Rest bonus from check-in** | `wellRested` flag exists (set on REST action). Active effects table exists. 1 food + 1 potion + 1 scroll daily limit. | No INN-specific rest bonus. wellRested has no mechanical effect. No link between REST action and INN check-in. |
| **Social visibility (who's checked in)** | Nothing. No sub-town presence. | Presence tracking, public query endpoint, client UI for "who's here" |
| **Buy food/drinks from inn menu** | Market buy exists. TavernPage filters beverages from market. | No building-specific purchase. No inn menu. No owner-set prices separate from market. |

### Closest Existing Patterns for Each Feature
| Feature | Closest Analog |
|---------|---------------|
| Inn menu (items + prices) | Workshop rental (owner sets price, others pay to use) |
| Stocking items into inn | Cottage storage deposit (template-level, quantity-based) |
| Buying from inn | Market purchase (POST /market/buy) |
| Check-in | Nothing — would be new system |
| Rest bonus | Active effects table (characterActiveEffects) + wellRested flag |
| Social presence | Nothing — would be new system |
| Tavern directory | BuildingDirectory component (already lists all buildings in town) |
