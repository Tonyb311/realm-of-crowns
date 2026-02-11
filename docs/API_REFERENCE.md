# API Reference

**Base URL:** `http://localhost:4000/api`

## Overview

### Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained via `/api/auth/register` or `/api/auth/login` and expire after 7 days (configurable via `JWT_EXPIRES_IN`).

### Error Format

All errors follow a consistent JSON format:

```json
{
  "error": "Human-readable error message"
}
```

Validation errors (400) include additional detail:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad request / validation error |
| 401  | Unauthorized (missing or invalid token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Resource not found |
| 409  | Conflict (duplicate resource) |
| 500  | Internal server error |

### Caching

Some GET endpoints use server-side Redis caching. Cache durations are noted where applicable. Cached responses are automatically invalidated when related data changes.

---

## Authentication

### POST /api/auth/register

Create a new user account.

**Auth required:** No

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `username` | string | Yes | 3-20 chars, alphanumeric only (`/^[a-zA-Z0-9]+$/`) |
| `password` | string | Yes | Min 8 characters |

**Success Response (201):**

```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "clx...",
    "email": "player@example.com",
    "username": "Hero123"
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Validation failed |
| 409  | Email or username already exists |

---

### POST /api/auth/login

Authenticate with existing credentials.

**Auth required:** No

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 1 character |

**Success Response (200):**

```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "clx...",
    "email": "player@example.com",
    "username": "Hero123"
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Validation failed |
| 401  | Invalid email or password |

---

### GET /api/auth/me

Get the current authenticated user's info.

**Auth required:** Yes

**Request Body:** None

**Success Response (200):**

```json
{
  "user": {
    "id": "clx...",
    "email": "player@example.com",
    "username": "Hero123",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 401  | Unauthorized |
| 404  | User not found |

---

### POST /api/auth/logout

Log out (client-side token discard).

**Auth required:** No

**Request Body:** None

**Success Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Characters

### POST /api/characters/create

Create a new character for the authenticated user. One character per user.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 3-20 chars, alphanumeric + spaces (`/^[a-zA-Z0-9 ]+$/`) |
| `race` | string | Yes | Valid race enum (HUMAN, ELF, DWARF, HALFLING, ORC, TIEFLING, DRAGONBORN, HALF_ELF, HALF_ORC, GNOME, MERFOLK, BEASTFOLK, FAEFOLK, GOLIATH, DROW, FIRBOLG, WARFORGED, GENASI, REVENANT, CHANGELING) |
| `subRace` | string | No | Required for DRAGONBORN (draconic ancestry), BEASTFOLK (beast clan), GENASI (elemental type). Invalid for other races |
| `characterClass` | string | Yes | `warrior`, `mage`, `rogue`, `cleric`, `ranger`, `bard`, or `psion` |
| `startingTownId` | string | Yes | Valid town ID |

**Success Response (201):**

```json
{
  "character": {
    "id": "clx...",
    "userId": "clx...",
    "name": "Thorin",
    "race": "DWARF",
    "draconicAncestry": null,
    "beastClan": null,
    "elementalType": null,
    "class": "warrior",
    "level": 1,
    "stats": { "str": 12, "dex": 9, "con": 13, "int": 10, "wis": 10, "cha": 8 },
    "gold": 100,
    "health": 22,
    "maxHealth": 22,
    "mana": 20,
    "maxMana": 20,
    "currentTownId": "clx..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Validation failed, race data not found, invalid sub-race, race does not support sub-races |
| 409  | User already has a character |

---

### GET /api/characters/me

Get the authenticated user's own character (full details).

**Auth required:** Yes

**Request Body:** None

**Success Response (200):**

```json
{
  "character": {
    "id": "clx...",
    "name": "Thorin",
    "race": "DWARF",
    "class": "warrior",
    "level": 5,
    "stats": { "str": 14, "dex": 10, "con": 15, "int": 10, "wis": 10, "cha": 8 },
    "gold": 450,
    "health": 30,
    "maxHealth": 30,
    "mana": 20,
    "maxMana": 20,
    "xp": 1200,
    "currentTownId": "clx...",
    "unspentStatPoints": 2,
    "unspentSkillPoints": 1
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | No character found |

---

### GET /api/characters/:id

Get a character by ID (public view -- limited fields).

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Character ID |

**Success Response (200):**

```json
{
  "character": {
    "id": "clx...",
    "name": "Thorin",
    "race": "DWARF",
    "draconicAncestry": null,
    "beastClan": null,
    "elementalType": null,
    "level": 5,
    "currentTownId": "clx...",
    "health": 30,
    "maxHealth": 30
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Character not found |

---

### POST /api/characters/allocate-stats

Spend unspent stat points to increase attributes.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `str` | integer | No | Min 0, default 0 |
| `dex` | integer | No | Min 0, default 0 |
| `con` | integer | No | Min 0, default 0 |
| `int` | integer | No | Min 0, default 0 |
| `wis` | integer | No | Min 0, default 0 |
| `cha` | integer | No | Min 0, default 0 |

**Notes:** At least 1 total point must be allocated. Total points cannot exceed `unspentStatPoints`. CON increases grant +2 max HP per point. INT/WIS increases grant +1 max mana per point.

**Success Response (200):**

```json
{
  "stats": { "str": 14, "dex": 10, "con": 16, "int": 10, "wis": 10, "cha": 8 },
  "unspentStatPoints": 0,
  "maxHealth": 32,
  "maxMana": 20
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Must allocate at least 1 point; not enough stat points |
| 404  | No character found |

---

### GET /api/characters/search

Search characters by name.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `q` | string | Yes | Min 2 characters |
| `limit` | integer | No | 1-20, default 10 |

**Success Response (200):**

```json
{
  "results": [
    {
      "id": "clx...",
      "name": "Thorin",
      "race": "DWARF",
      "level": 5,
      "currentTownId": "clx...",
      "online": true
    }
  ]
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Search query must be at least 2 characters |

---

### GET /api/characters/:id/profile

Get a character's full public profile including guild, professions, PvP stats, and achievements.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Character ID |

**Success Response (200):**

```json
{
  "profile": {
    "id": "clx...",
    "name": "Thorin",
    "race": "DWARF",
    "draconicAncestry": null,
    "beastClan": null,
    "elementalType": null,
    "level": 5,
    "currentTown": { "id": "clx...", "name": "Ironforge" },
    "guild": { "id": "clx...", "name": "Iron Brotherhood", "tag": "IRON" },
    "professions": [
      { "professionType": "MINER", "tier": "JOURNEYMAN", "level": 8 }
    ],
    "pvp": { "wins": 3, "losses": 1 },
    "achievements": [
      { "name": "First Blood", "description": "Win your first PvP duel", "unlockedAt": "2026-01-20T..." }
    ],
    "online": true,
    "createdAt": "2026-01-15T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Character not found |

---

## World / Navigation

### GET /api/world/map

Get the full world map data: all regions, towns, and travel routes.

**Auth required:** No
**Cache:** 300 seconds

**Success Response (200):**

```json
{
  "regions": [
    { "id": "clx...", "name": "Verdant Plains", "biome": "GRASSLAND" }
  ],
  "towns": [
    {
      "id": "clx...",
      "name": "Millhaven",
      "regionId": "clx...",
      "regionName": "Verdant Plains",
      "population": 1200,
      "biome": "GRASSLAND",
      "coordinates": { "x": 100, "y": 200 }
    }
  ],
  "routes": [
    {
      "id": "clx...",
      "fromTownId": "clx...",
      "toTownId": "clx...",
      "distance": 15,
      "dangerLevel": 2,
      "terrain": "ROAD"
    }
  ]
}
```

---

### GET /api/world/regions

List all regions with town counts.

**Auth required:** No
**Cache:** 300 seconds

**Success Response (200):**

```json
{
  "regions": [
    {
      "id": "clx...",
      "name": "Verdant Plains",
      "description": "Gentle rolling grasslands...",
      "biome": "GRASSLAND",
      "levelMin": 1,
      "levelMax": 10,
      "townCount": 3
    }
  ]
}
```

---

### GET /api/world/regions/:id

Get a single region with its towns.

**Auth required:** No

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Region ID |

**Success Response (200):**

```json
{
  "region": {
    "id": "clx...",
    "name": "Verdant Plains",
    "description": "...",
    "biome": "GRASSLAND",
    "levelMin": 1,
    "levelMax": 10,
    "towns": [
      {
        "id": "clx...",
        "name": "Millhaven",
        "population": 1200,
        "biome": "GRASSLAND",
        "description": "...",
        "features": {}
      }
    ]
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Region not found |

---

### GET /api/towns/:id

Get full details for a town including resources, buildings, and characters present.

**Auth required:** No
**Cache:** 120 seconds

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Town ID |

**Success Response (200):**

```json
{
  "town": {
    "id": "clx...",
    "name": "Millhaven",
    "population": 1200,
    "biome": "GRASSLAND",
    "description": "...",
    "features": {},
    "region": { "id": "clx...", "name": "Verdant Plains", "biome": "GRASSLAND" },
    "resources": [
      { "id": "clx...", "resourceType": "WOOD", "abundance": 80, "respawnRate": 10 }
    ],
    "buildings": [
      { "id": "clx...", "type": "SMITHY", "name": "Iron Anvil", "level": 2, "owner": { "id": "clx...", "name": "Thorin" } }
    ],
    "characters": [
      { "id": "clx...", "name": "Thorin", "race": "DWARF", "level": 5 }
    ]
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Town not found |

---

### GET /api/towns/:id/buildings

List all buildings in a town.

**Auth required:** No

**Success Response (200):**

```json
{
  "buildings": [
    { "id": "clx...", "type": "SMITHY", "name": "Iron Anvil", "level": 2, "owner": { "id": "clx...", "name": "Thorin" } }
  ]
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Town not found |

---

### GET /api/towns/:id/characters

List all characters currently in a town.

**Auth required:** No

**Success Response (200):**

```json
{
  "characters": [
    { "id": "clx...", "name": "Thorin", "race": "DWARF", "level": 5 }
  ]
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Town not found |

---

### POST /api/travel/start

Begin traveling to a destination town. Requires a direct route. Travel time is based on route distance (1 minute per distance unit). Wars can block travel to enemy capitals or increase travel time by 50%.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `destinationTownId` | string | Yes | Non-empty |

**Success Response (201):**

```json
{
  "travel": {
    "id": "clx...",
    "route": {
      "id": "clx...",
      "from": { "id": "clx...", "name": "Millhaven" },
      "to": { "id": "clx...", "name": "Stonehold" },
      "distance": 15,
      "dangerLevel": 2,
      "terrain": "ROAD"
    },
    "departedAt": "2026-01-20T10:00:00.000Z",
    "arrivesAt": "2026-01-20T10:15:00.000Z",
    "distanceMinutes": 15,
    "warWarning": "War between Kingdom A and Kingdom B makes travel dangerous. Travel time increased by 50%."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Not in a town, already in that town, already traveling, no direct route |
| 403  | Travel blocked by war (enemy capital) |
| 404  | No character found |

---

### GET /api/travel/status

Check current travel status. Automatically completes travel if the time has elapsed.

**Auth required:** Yes

**Success Response (200) -- Not traveling:**

```json
{ "traveling": false }
```

**Success Response (200) -- Just arrived (auto-completed):**

```json
{
  "traveling": false,
  "arrivedAt": { "id": "clx...", "name": "Stonehold" }
}
```

**Success Response (200) -- In transit:**

```json
{
  "traveling": true,
  "route": {
    "id": "clx...",
    "from": { "id": "clx...", "name": "Millhaven" },
    "to": { "id": "clx...", "name": "Stonehold" },
    "distance": 15,
    "dangerLevel": 2,
    "terrain": "ROAD"
  },
  "departedAt": "2026-01-20T10:00:00.000Z",
  "arrivesAt": "2026-01-20T10:15:00.000Z",
  "remainingMinutes": 8
}
```

---

### POST /api/travel/arrive

Manually complete travel after the travel timer has elapsed.

**Auth required:** Yes

**Request Body:** None

**Success Response (200):**

```json
{
  "arrived": true,
  "town": { "id": "clx...", "name": "Stonehold" }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Not currently traveling, travel not yet complete |
| 404  | No character found |

---

## Economy

### Market

#### POST /api/market/list

List an item for sale on the town marketplace. Items are removed from inventory and listed for 7 days.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `itemId` | string | Yes | Non-empty |
| `price` | integer | Yes | Min 1 |
| `quantity` | integer | Yes | Min 1 |

**Success Response (201):**

```json
{
  "listing": {
    "id": "clx...",
    "sellerId": "clx...",
    "itemId": "clx...",
    "price": 50,
    "quantity": 3,
    "townId": "clx...",
    "listedAt": "2026-01-20T...",
    "expiresAt": "2026-01-27T...",
    "item": { "id": "clx...", "template": { "name": "Iron Ore", "type": "MATERIAL" } }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Not in a town, insufficient quantity |
| 404  | No character, item not in inventory |

---

#### GET /api/market/browse

Browse marketplace listings. Defaults to the character's current town.

**Auth required:** Yes
**Cache:** 30 seconds

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `townId` | string | No | Defaults to current town |
| `type` | string | No | Item type filter |
| `rarity` | string | No | Rarity filter |
| `minPrice` | integer | No | Minimum price |
| `maxPrice` | integer | No | Maximum price |
| `search` | string | No | Name search (case-insensitive) |
| `sort` | string | No | `newest` (default), `price_asc`, `price_desc`, `rarity` |
| `page` | integer | No | Page number, default 1 |
| `limit` | integer | No | 1-50, default 20 |

**Success Response (200):**

```json
{
  "listings": [
    {
      "id": "clx...",
      "price": 50,
      "quantity": 3,
      "listedAt": "2026-01-20T...",
      "expiresAt": "2026-01-27T...",
      "seller": { "id": "clx...", "name": "Thorin" },
      "item": {
        "id": "clx...",
        "templateId": "clx...",
        "name": "Iron Ore",
        "type": "MATERIAL",
        "rarity": "COMMON",
        "description": "...",
        "stats": null,
        "quality": "COMMON",
        "currentDurability": null
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

#### POST /api/market/buy

Purchase items from a marketplace listing. Tax is applied and deposited into the town treasury. Trade restrictions (embargoes, war) are checked.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `listingId` | string | Yes | Non-empty |
| `quantity` | integer | Yes | Min 1 |

**Success Response (200):**

```json
{
  "transaction": {
    "id": "clx...",
    "itemName": "Iron Ore",
    "quantity": 2,
    "pricePerUnit": 50,
    "subtotal": 100,
    "tax": 10,
    "totalCost": 110,
    "seller": { "id": "clx...", "name": "Thorin" },
    "timestamp": "2026-01-20T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Listing expired, buying own listing, not in same town, insufficient quantity available, insufficient gold |
| 403  | Trade restricted (embargo/war) |
| 404  | No character, listing not found |

---

#### POST /api/market/cancel

Cancel your own marketplace listing. Items are returned to inventory.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `listingId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{ "message": "Listing cancelled and item returned to inventory" }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Listing does not belong to you |
| 404  | No character, listing not found |

---

#### GET /api/market/my-listings

List the authenticated user's active marketplace listings.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "listings": [
    {
      "id": "clx...",
      "price": 50,
      "quantity": 3,
      "listedAt": "2026-01-20T...",
      "expiresAt": "2026-01-27T...",
      "town": { "id": "clx...", "name": "Millhaven" },
      "item": {
        "id": "clx...",
        "templateId": "clx...",
        "name": "Iron Ore",
        "type": "MATERIAL",
        "rarity": "COMMON",
        "stats": null,
        "quality": "COMMON"
      }
    }
  ]
}
```

---

#### GET /api/market/history

View price history for items across towns.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `itemTemplateId` | string | No | Filter by item template |
| `townId` | string | No | Filter by town |
| `days` | integer | No | 1-365, default 30 |

**Success Response (200):**

```json
{
  "history": [
    {
      "id": "clx...",
      "date": "2026-01-20",
      "avgPrice": 48,
      "volume": 15,
      "itemTemplate": { "id": "clx...", "name": "Iron Ore", "type": "MATERIAL", "rarity": "COMMON" },
      "town": { "id": "clx...", "name": "Millhaven" }
    }
  ]
}
```

---

### Work (Gathering)

#### POST /api/work/start

Start a gathering action. Character must be in a town and not traveling, gathering, or crafting.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `professionType` | string | Yes | `MINER`, `LUMBERJACK`, `FARMER`, `HERBALIST`, `FISHERMAN`, or `HUNTER` |
| `resourceId` | string | Yes | Non-empty |

**Profession-Resource Mapping:**

| Profession | Gathers |
|-----------|---------|
| MINER | ORE, STONE |
| LUMBERJACK | WOOD |
| FARMER | GRAIN, FIBER |
| HERBALIST | HERB, REAGENT |
| FISHERMAN | FISH |
| HUNTER | HIDE, ANIMAL_PRODUCT |

**Success Response (201):**

```json
{
  "action": {
    "id": "clx...",
    "resource": { "id": "clx...", "name": "Iron Ore", "type": "ORE" },
    "profession": { "type": "MINER", "level": 5 },
    "startedAt": "2026-01-20T10:00:00.000Z",
    "completesAt": "2026-01-20T10:08:00.000Z",
    "estimatedMinutes": 8
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Not in town, already traveling/gathering/crafting, profession cannot gather resource type, resource not available in town |
| 404  | No character, resource not found |

---

#### GET /api/work/status

Check current gathering action status.

**Auth required:** Yes

**Success Response (200) -- Not working:**

```json
{ "working": false }
```

**Success Response (200) -- Ready to collect:**

```json
{
  "working": true,
  "ready": true,
  "action": {
    "id": "clx...",
    "resource": { "id": "clx...", "name": "Iron Ore", "type": "ORE", "tier": 2 },
    "startedAt": "2026-01-20T10:00:00.000Z",
    "completesAt": "2026-01-20T10:08:00.000Z"
  }
}
```

**Success Response (200) -- In progress:**

```json
{
  "working": true,
  "ready": false,
  "action": {
    "id": "clx...",
    "resource": { "id": "clx...", "name": "Iron Ore", "type": "ORE", "tier": 2 },
    "startedAt": "2026-01-20T10:00:00.000Z",
    "completesAt": "2026-01-20T10:08:00.000Z",
    "remainingMinutes": 3
  },
  "profession": { "type": "MINER", "level": 5 }
}
```

---

#### POST /api/work/collect

Collect completed gathering results. Awards profession XP, character XP (half of profession XP), items, and checks achievements. Yield is affected by profession level, town resource abundance, and racial bonuses.

**Auth required:** Yes

**Request Body:** None

**Success Response (200):**

```json
{
  "collected": {
    "resource": "Iron Ore",
    "quantity": 4
  },
  "profession": {
    "type": "MINER",
    "level": 6,
    "xp": 115,
    "xpGained": 15,
    "tier": "JOURNEYMAN",
    "leveledUp": true
  },
  "characterXpGained": 7
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | No active gathering action, gathering not yet complete |
| 404  | No character found |

---

#### GET /api/work/professions

List the character's gathering professions with levels and XP.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "professions": [
    {
      "type": "MINER",
      "tier": "JOURNEYMAN",
      "level": 6,
      "xp": 115,
      "xpToNextLevel": 485
    }
  ]
}
```

---

### Crafting

#### GET /api/crafting/recipes

List available crafting recipes, filtered by profession and/or tier. Includes whether the character meets the profession requirement.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `profession` | string | No | Filter by profession type |
| `tier` | string | No | Filter by tier (APPRENTICE, JOURNEYMAN, CRAFTSMAN, EXPERT, MASTER, GRANDMASTER) |

**Success Response (200):**

```json
{
  "recipes": [
    {
      "id": "clx...",
      "name": "Iron Sword",
      "professionType": "BLACKSMITH",
      "tier": "JOURNEYMAN",
      "ingredients": [
        { "itemTemplateId": "clx...", "itemName": "Iron Ore", "quantity": 5 }
      ],
      "result": { "itemTemplateId": "clx...", "itemName": "Iron Sword" },
      "craftTime": 10,
      "xpReward": 25,
      "hasRequiredProfession": true
    }
  ]
}
```

---

#### POST /api/crafting/start

Begin crafting a recipe. Consumes ingredients immediately. Character must not be traveling or already crafting.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `recipeId` | string | Yes | Non-empty |

**Success Response (201):**

```json
{
  "crafting": {
    "recipeId": "clx...",
    "recipeName": "Iron Sword",
    "startedAt": "2026-01-20T10:00:00.000Z",
    "completesAt": "2026-01-20T10:10:00.000Z",
    "craftTimeMinutes": 10
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Missing profession, insufficient tier, already crafting, traveling, not enough ingredients |
| 404  | No character, recipe not found |

---

#### GET /api/crafting/status

Check current crafting action status.

**Auth required:** Yes

**Success Response (200) -- Not crafting:**

```json
{ "crafting": false }
```

**Success Response (200) -- Ready to collect:**

```json
{
  "crafting": true,
  "ready": true,
  "recipeId": "clx...",
  "recipeName": "Iron Sword",
  "startedAt": "2026-01-20T10:00:00.000Z",
  "completesAt": "2026-01-20T10:10:00.000Z"
}
```

**Success Response (200) -- In progress:**

```json
{
  "crafting": true,
  "ready": false,
  "recipeId": "clx...",
  "recipeName": "Iron Sword",
  "startedAt": "2026-01-20T10:00:00.000Z",
  "completesAt": "2026-01-20T10:10:00.000Z",
  "remainingMinutes": 5
}
```

---

#### POST /api/crafting/collect

Collect a completed crafting result. A quality roll determines item quality (Poor to Legendary) based on profession level. Awards profession XP and character XP.

**Auth required:** Yes

**Request Body:** None

**Success Response (200):**

```json
{
  "collected": true,
  "item": {
    "id": "clx...",
    "name": "Iron Sword",
    "type": "WEAPON",
    "quality": "FINE",
    "craftedBy": "Thorin"
  },
  "qualityRoll": {
    "roll": 14,
    "total": 19,
    "quality": "FINE"
  },
  "xpAwarded": 25,
  "profession": {
    "type": "BLACKSMITH",
    "level": 7,
    "tier": "JOURNEYMAN",
    "leveledUp": false
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | No active crafting action, crafting not yet complete |
| 404  | No character found |

---

## Combat

### PvE Combat

#### POST /api/combat-pve/start

Start a PvE combat encounter. A random monster near the character's level is selected from the current region.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `characterId` | string (UUID) | Yes | Must be the authenticated user's character |

**Success Response (201):**

```json
{
  "sessionId": "uuid...",
  "combat": {
    "round": 1,
    "turnOrder": ["char-id", "monster-id"],
    "currentTurn": "char-id",
    "combatants": [
      {
        "id": "char-id",
        "name": "Thorin",
        "entityType": "character",
        "team": 0,
        "currentHp": 30,
        "maxHp": 30,
        "ac": 14,
        "initiative": 15,
        "statusEffects": [],
        "isAlive": true
      },
      {
        "id": "monster-goblin-id",
        "name": "Goblin Scout",
        "entityType": "monster",
        "team": 1,
        "currentHp": 25,
        "maxHp": 25,
        "ac": 12,
        "initiative": 10,
        "statusEffects": [],
        "isAlive": true
      }
    ],
    "monster": {
      "id": "clx...",
      "name": "Goblin Scout",
      "level": 3
    }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Character not in a town, already in combat |
| 404  | Character not found, no suitable monsters |

---

#### POST /api/combat-pve/action

Submit a combat action. If it is the monster's turn, the monster acts automatically first. Combat ends when one side is eliminated.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sessionId` | string (UUID) | Yes | |
| `action.type` | string | Yes | `attack`, `cast`, `defend`, `item`, or `flee` |
| `action.targetId` | string | No | Target combatant ID |
| `action.resourceId` | string | No | Resource/spell/item ID |
| `action.spellSlotLevel` | integer | No | 1-9 |
| `weapon` | object | No | See weapon schema below |
| `spell` | object | No | See spell schema below |
| `item` | object | No | See item schema below |

**Weapon Schema:**

| Field | Type | Required |
|-------|------|----------|
| `id` | string | Yes |
| `name` | string | Yes |
| `diceCount` | integer (min 1) | Yes |
| `diceSides` | integer (min 1) | Yes |
| `damageModifierStat` | `str` or `dex` | Yes |
| `attackModifierStat` | `str` or `dex` | Yes |
| `bonusDamage` | integer | Yes |
| `bonusAttack` | integer | Yes |

**Spell Schema:**

| Field | Type | Required |
|-------|------|----------|
| `id` | string | Yes |
| `name` | string | Yes |
| `level` | integer (min 1) | Yes |
| `castingStat` | `int`, `wis`, or `cha` | Yes |
| `type` | `damage`, `heal`, `status`, or `damage_status` | Yes |
| `diceCount` | integer (min 1) | Yes |
| `diceSides` | integer (min 1) | Yes |
| `modifier` | integer | Yes |
| `statusEffect` | string | No |
| `statusDuration` | integer | No |
| `requiresSave` | boolean | Yes |
| `saveType` | `str`, `dex`, `con`, `int`, `wis`, or `cha` | No |

**Item Schema:**

| Field | Type | Required |
|-------|------|----------|
| `id` | string | Yes |
| `name` | string | Yes |
| `type` | `heal`, `damage`, `buff`, or `cleanse` | Yes |
| `diceCount` | integer | No |
| `diceSides` | integer | No |
| `flatAmount` | integer | No |
| `statusEffect` | string | No |
| `statusDuration` | integer | No |

**Success Response (200):**

```json
{
  "combat": {
    "sessionId": "uuid...",
    "status": "active",
    "type": "PVE",
    "round": 2,
    "currentTurn": "char-id",
    "winningTeam": null,
    "combatants": [ ... ],
    "log": [
      {
        "round": 1,
        "actorId": "char-id",
        "action": "attack",
        "result": { "hit": true, "damage": 8 },
        "statusTicks": []
      }
    ]
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Combat has ended, not your turn |
| 404  | Combat session not found, character not found |

---

#### GET /api/combat-pve/state

Get current PvE combat state. Falls back to DB records for completed sessions.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `sessionId` | string | Yes |

**Success Response (200):**

Same format as the `combat` object in action response.

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Missing sessionId |
| 404  | Combat session not found |

---

### PvP Combat

#### POST /api/combat-pvp/challenge

Challenge another player to a duel. Both players must be in the same town. Level difference cannot exceed 5.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `targetCharacterId` | string | Yes | Non-empty |
| `wager` | integer | No | Min 0 (gold bet) |

**Success Response (201):**

```json
{
  "session": {
    "id": "uuid...",
    "type": "DUEL",
    "status": "pending",
    "challenger": { "id": "clx...", "name": "Thorin", "level": 5 },
    "target": { "id": "clx...", "name": "Elara", "level": 4 },
    "wager": 100
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Self-challenge, not in same town, level difference > 5, already in combat/traveling/crafting, 30-min cooldown, insufficient gold for wager |
| 404  | No character, target not found |

---

#### POST /api/combat-pvp/accept

Accept a pending PvP challenge. Initiates combat with rolled initiative.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sessionId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{
  "session": {
    "id": "uuid...",
    "status": "active",
    "round": 1,
    "currentTurn": "char-id",
    "turnOrder": ["char-id-1", "char-id-2"],
    "combatants": [
      { "id": "clx...", "name": "Thorin", "team": 0, "hp": 30, "maxHp": 30, "initiative": 15, "isAlive": true },
      { "id": "clx...", "name": "Elara", "team": 1, "hp": 22, "maxHp": 22, "initiative": 12, "isAlive": true }
    ],
    "wager": 100
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Challenge no longer pending, challenger can't afford wager, you can't afford wager |
| 403  | Only the challenged player can accept |
| 404  | Session not found, no character |

---

#### POST /api/combat-pvp/decline

Decline a pending PvP challenge.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sessionId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{
  "session": { "id": "uuid...", "status": "cancelled" }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Challenge no longer pending |
| 403  | Only the challenged player can decline |
| 404  | Session not found |

---

#### POST /api/combat-pvp/action

Submit a PvP combat action. Same action/weapon/spell/item schema as PvE.

**Auth required:** Yes

**Request Body:** Same schema as PvE `/action` (sessionId, action, weapon, spell, item). Spell slot max is 5 instead of 9.

**Success Response (200):**

```json
{
  "session": {
    "id": "uuid...",
    "status": "active",
    "round": 2,
    "currentTurn": "char-id-2",
    "combatants": [
      { "id": "clx...", "name": "Thorin", "team": 0, "hp": 25, "maxHp": 30, "isAlive": true, "statusEffects": [] }
    ]
  },
  "turnResult": { "round": 1, "actorId": "clx...", "action": "attack", "result": { ... } },
  "result": null
}
```

When combat ends, `result` is included:

```json
{
  "result": {
    "winner": { "id": "clx...", "name": "Thorin" },
    "loser": { "id": "clx...", "name": "Elara" }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Not your turn, combat ended, combat state lost |
| 403  | Not a participant |
| 404  | Session not found, no character |

---

#### GET /api/combat-pvp/state

Get current PvP combat state for the authenticated player.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `sessionId` | string | No |

**Success Response (200) -- Not in combat:**

```json
{ "inCombat": false }
```

**Success Response (200) -- In combat:**

```json
{
  "inCombat": true,
  "session": {
    "id": "uuid...",
    "status": "active",
    "round": 3,
    "currentTurn": "char-id",
    "turnOrder": [...],
    "combatants": [...],
    "log": [...]
  }
}
```

---

#### GET /api/combat-pvp/challenges

List pending PvP challenges involving the authenticated player.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "challenges": [
    {
      "sessionId": "uuid...",
      "role": "target",
      "opponent": { "id": "clx...", "name": "Thorin", "level": 5 },
      "wager": 100,
      "town": { "id": "clx...", "name": "Millhaven" },
      "createdAt": "2026-01-20T..."
    }
  ]
}
```

---

#### GET /api/combat-pvp/leaderboard

Get the PvP leaderboard showing win/loss records.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "leaderboard": [
    {
      "id": "clx...",
      "name": "Thorin",
      "level": 10,
      "wins": 15,
      "losses": 3,
      "totalMatches": 18,
      "winRate": 83
    }
  ]
}
```

---

## Politics

### Elections

#### POST /api/elections/nominate

Nominate yourself as a candidate in an election. Mayor candidates must reside in the town. Ruler candidates must be a mayor. Maximum 3 consecutive terms.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `electionId` | string | Yes | Non-empty |
| `platform` | string | No | Max 2000 chars |

**Success Response (201):**

```json
{
  "candidate": {
    "id": "clx...",
    "electionId": "clx...",
    "characterId": "clx...",
    "platform": "Lower taxes, more trade routes!",
    "character": { "id": "clx...", "name": "Thorin", "level": 10, "race": "DWARF" }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Not in nomination phase, already nominated, term limit reached |
| 403  | Not a resident (mayor election), not a mayor (ruler election) |
| 404  | No character, election not found |

---

#### POST /api/elections/vote

Cast a vote for a candidate. One vote per election per character. Cannot vote for yourself.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `electionId` | string | Yes | Non-empty |
| `candidateId` | string | Yes | Non-empty (character ID) |

**Success Response (201):**

```json
{
  "vote": {
    "id": "clx...",
    "electionId": "clx...",
    "votedAt": "2026-01-20T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Not in voting phase, candidate not running, self-voting, already voted |
| 403  | Not a resident (mayor election) |
| 404  | No character, election not found |

---

#### GET /api/elections/current

List all active (non-completed) elections relevant to the character's town and kingdom.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "elections": [
    {
      "id": "clx...",
      "type": "MAYOR",
      "phase": "VOTING",
      "termNumber": 3,
      "startDate": "2026-01-15T...",
      "endDate": "2026-01-22T...",
      "town": { "id": "clx...", "name": "Millhaven" },
      "kingdom": null,
      "candidateCount": 3,
      "voteCount": 12,
      "candidates": [
        {
          "characterId": "clx...",
          "name": "Thorin",
          "level": 10,
          "race": "DWARF",
          "platform": "Lower taxes!",
          "nominatedAt": "2026-01-16T..."
        }
      ]
    }
  ]
}
```

---

#### GET /api/elections/results

Get past election results for a town.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `townId` | string | No | Defaults to current town |
| `limit` | integer | No | 1-50, default 10 |

**Success Response (200):**

```json
{
  "results": [
    {
      "id": "clx...",
      "type": "MAYOR",
      "termNumber": 2,
      "startDate": "2026-01-01T...",
      "endDate": "2026-01-08T...",
      "town": { "id": "clx...", "name": "Millhaven" },
      "kingdom": null,
      "winner": { "id": "clx...", "name": "Thorin", "level": 10, "race": "DWARF" },
      "totalVotes": 25,
      "candidates": [
        { "characterId": "clx...", "name": "Thorin", "platform": "...", "votes": 18 },
        { "characterId": "clx...", "name": "Elara", "platform": "...", "votes": 7 }
      ]
    }
  ]
}
```

---

#### GET /api/elections/candidates/:electionId

List candidates for a specific election. Includes vote counts if voting or completed.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `electionId` | Election ID |

**Success Response (200):**

```json
{
  "electionId": "clx...",
  "phase": "VOTING",
  "candidates": [
    {
      "characterId": "clx...",
      "name": "Thorin",
      "level": 10,
      "race": "DWARF",
      "platform": "Lower taxes!",
      "nominatedAt": "2026-01-16T...",
      "votes": 12
    }
  ]
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Election not found |

---

#### POST /api/elections/impeach

Start an impeachment proceeding against a mayor or ruler. Impeachment lasts 48 hours.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `targetId` | string | Yes | Non-empty (character ID of the official) |
| `townId` | string | No | Required for mayor impeachments |
| `kingdomId` | string | No | Required for ruler impeachments |

**Success Response (201):**

```json
{
  "impeachment": {
    "id": "clx...",
    "targetId": "clx...",
    "townId": "clx...",
    "kingdomId": null,
    "votesFor": 1,
    "votesAgainst": 0,
    "status": "ACTIVE",
    "startedAt": "2026-01-20T...",
    "endsAt": "2026-01-22T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Neither townId nor kingdomId provided, self-impeachment, target doesn't hold office, active impeachment already exists |
| 403  | Not a resident (town impeachment) |
| 404  | No character, town/kingdom not found |

---

#### POST /api/elections/impeach/vote

Vote on an active impeachment.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `impeachmentId` | string | Yes | Non-empty |
| `support` | boolean | Yes | true = in favor, false = against |

**Success Response (201):**

```json
{
  "impeachment": {
    "id": "clx...",
    "votesFor": 5,
    "votesAgainst": 2,
    "status": "ACTIVE",
    "endsAt": "2026-01-22T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Impeachment not active, voting period ended, voting on own impeachment, already voted |
| 403  | Not a resident (town impeachment) |
| 404  | No character, impeachment not found |

---

### Governance

#### POST /api/governance/propose-law

Propose a new law for a kingdom. Only rulers or mayors may propose.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `kingdomId` | string | Yes | Non-empty |
| `title` | string | Yes | 1-200 chars |
| `description` | string | No | |
| `effects` | object | No | Freeform JSON |
| `lawType` | string | No | `tax`, `trade`, `military`, `building`, or `general` (default `general`) |
| `expiresAt` | string (ISO datetime) | No | |

**Success Response (201):**

```json
{
  "law": {
    "id": "clx...",
    "kingdomId": "clx...",
    "title": "Trade Embargo on Darklands",
    "description": "...",
    "effects": {},
    "status": "proposed",
    "lawType": "trade",
    "enactedById": "clx...",
    "proposedAt": "2026-01-20T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not a ruler or mayor |
| 404  | No character, kingdom not found |

---

#### POST /api/governance/vote-law

Vote on a proposed law. Only council members and the ruler can vote. Auto-activates if majority reached with 3+ total votes.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `lawId` | string | Yes | Non-empty |
| `vote` | string | Yes | `for` or `against` |

**Success Response (200):**

```json
{
  "law": {
    "id": "clx...",
    "status": "voting",
    "votesFor": 3,
    "votesAgainst": 1
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Law not open for voting |
| 403  | Not a council member or ruler |
| 404  | No character, law not found |

---

#### POST /api/governance/set-tax

Set the tax rate for a town. Only the mayor can set taxes.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `townId` | string | Yes | Non-empty |
| `taxRate` | number | Yes | 0.00 to 0.25 (0% to 25%) |

**Success Response (200):**

```json
{
  "policy": {
    "townId": "clx...",
    "taxRate": 0.10
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not the mayor |
| 404  | No character, town not found |

---

#### GET /api/governance/laws

List laws for a kingdom, optionally filtered by status.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `kingdomId` | string | Yes | |
| `status` | string | No | `proposed`, `voting`, `active`, `expired`, `repealed` |

**Success Response (200):**

```json
{
  "laws": [
    {
      "id": "clx...",
      "title": "Trade Embargo",
      "status": "active",
      "lawType": "trade",
      "votesFor": 4,
      "votesAgainst": 1,
      "enactedBy": { "id": "clx...", "name": "Thorin" },
      "proposedAt": "2026-01-15T...",
      "enactedAt": "2026-01-16T..."
    }
  ]
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | kingdomId is required |

---

#### GET /api/governance/town-info/:townId

Get governance info for a town: mayor, treasury, policy, council.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `townId` | Town ID |

**Success Response (200):**

```json
{
  "town": {
    "id": "clx...",
    "name": "Millhaven",
    "population": 1200,
    "treasury": 5000,
    "taxRate": 0.10,
    "mayor": { "id": "clx...", "name": "Thorin", "level": 10 },
    "policy": { ... },
    "council": [
      { "id": "clx...", "role": "sheriff", "character": { "id": "clx...", "name": "Guard", "level": 8 }, "appointedAt": "..." }
    ]
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Town not found |

---

#### POST /api/governance/appoint

Appoint a character to a governance role (sheriff or council member).

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `characterId` | string | Yes | Non-empty |
| `role` | string | Yes | Role name (e.g., `sheriff`, `advisor`) |
| `townId` | string | No | Required for town appointments |
| `kingdomId` | string | No | Required for kingdom appointments |

**Success Response -- Sheriff (200):**

```json
{
  "message": "Guard appointed as sheriff",
  "policy": { "townId": "clx...", "sheriffId": "clx..." }
}
```

**Success Response -- Council (201):**

```json
{
  "councilMember": {
    "id": "clx...",
    "role": "advisor",
    "characterId": "clx...",
    "character": { "id": "clx...", "name": "Guard" }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Neither townId nor kingdomId, target not in town (sheriff) |
| 403  | Not the mayor (town), not the ruler (kingdom) |
| 404  | No character |

---

#### POST /api/governance/allocate-treasury

Allocate gold from a town or kingdom treasury for a specific purpose.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `townId` | string | No | One of townId/kingdomId required |
| `kingdomId` | string | No | One of townId/kingdomId required |
| `amount` | integer | Yes | Min 1 |
| `purpose` | string | Yes | `buildings`, `military`, `infrastructure`, or `events` |
| `details` | object | No | Freeform JSON |

**Success Response (200):**

```json
{
  "message": "Allocated 500 gold from town treasury for buildings",
  "remainingTreasury": 4500,
  "purpose": "buildings",
  "details": { ... }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Neither townId nor kingdomId, insufficient treasury |
| 403  | Not the mayor (town), not the ruler (kingdom) |
| 404  | No character, town/kingdom not found |

---

#### POST /api/governance/declare-war

Declare war on another kingdom. Only rulers can declare war.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `targetKingdomId` | string | Yes | Non-empty |
| `reason` | string | No | |

**Success Response (201):**

```json
{
  "war": {
    "id": "clx...",
    "status": "active",
    "attackerKingdom": { "id": "clx...", "name": "Northern Realm" },
    "defenderKingdom": { "id": "clx...", "name": "Darklands" }
  },
  "reason": "Border dispute"
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Self-war, already at war with target |
| 403  | Not a ruler |
| 404  | No character, target kingdom not found |

---

#### POST /api/governance/propose-peace

Propose peace to end an active war. Only rulers of the warring kingdoms may propose.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `warId` | string | Yes | Non-empty |
| `terms` | string | No | |

**Success Response (200):**

```json
{
  "war": {
    "id": "clx...",
    "status": "peace_proposed",
    "attackerKingdom": { "id": "clx...", "name": "Northern Realm" },
    "defenderKingdom": { "id": "clx...", "name": "Darklands" }
  },
  "terms": "Withdraw from border provinces"
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | War not active |
| 403  | Not a ruler of either kingdom |
| 404  | No character, war not found |

---

#### GET /api/governance/kingdom/:kingdomId

Get full kingdom information including ruler, active laws, active wars, and council.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `kingdomId` | Kingdom ID |

**Success Response (200):**

```json
{
  "kingdom": {
    "id": "clx...",
    "name": "Northern Realm",
    "treasury": 25000,
    "ruler": { "id": "clx...", "name": "Thorin", "level": 15 },
    "activeLaws": [ ... ],
    "activeWars": [
      { "id": "clx...", "role": "attacker", "opponent": { "id": "clx...", "name": "Darklands" }, "startedAt": "..." }
    ],
    "council": [
      { "id": "clx...", "role": "general", "character": { ... }, "appointedAt": "..." }
    ]
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Kingdom not found |

---

## Social

### Guilds

#### POST /api/guilds

Create a new guild. Costs 500 gold. Creator becomes the leader.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 3-30 chars |
| `tag` | string | Yes | 2-4 chars, alphanumeric, stored uppercase |
| `description` | string | No | Max 500 chars |

**Success Response (201):**

```json
{
  "guild": {
    "id": "clx...",
    "name": "Iron Brotherhood",
    "tag": "IRON",
    "leaderId": "clx...",
    "description": "...",
    "level": 1,
    "treasury": 0,
    "createdAt": "2026-01-20T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Insufficient gold (need 500), already lead a guild |
| 409  | Guild name or tag already exists |

---

#### GET /api/guilds

List guilds with pagination and search.

**Auth required:** Yes
**Cache:** 60 seconds

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by name or tag |
| `page` | integer | No | Default 1 |
| `limit` | integer | No | 1-50, default 20 |

**Success Response (200):**

```json
{
  "guilds": [
    {
      "id": "clx...",
      "name": "Iron Brotherhood",
      "tag": "IRON",
      "level": 3,
      "description": "...",
      "leader": { "id": "clx...", "name": "Thorin" },
      "memberCount": 12,
      "createdAt": "2026-01-20T..."
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

#### GET /api/guilds/:id

Get full guild details with member list.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "guild": {
    "id": "clx...",
    "name": "Iron Brotherhood",
    "tag": "IRON",
    "level": 3,
    "treasury": 2500,
    "description": "...",
    "leader": { "id": "clx...", "name": "Thorin", "level": 10, "race": "DWARF" },
    "createdAt": "2026-01-20T...",
    "members": [
      {
        "characterId": "clx...",
        "name": "Thorin",
        "level": 10,
        "race": "DWARF",
        "rank": "leader",
        "joinedAt": "2026-01-20T..."
      }
    ]
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Guild not found |

---

#### PATCH /api/guilds/:id

Update guild name or description. Requires officer rank or above.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | No | 3-30 chars |
| `description` | string | No | Max 500 chars |

**Success Response (200):**

```json
{ "guild": { "id": "clx...", "name": "Updated Name", "description": "..." } }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | No fields to update |
| 403  | Not an officer or above |
| 404  | Guild not found |
| 409  | Name already taken |

---

#### DELETE /api/guilds/:id

Disband a guild. Only the leader can disband. Treasury gold is returned to the leader.

**Auth required:** Yes

**Success Response (200):**

```json
{ "message": "Guild disbanded successfully" }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not the guild leader |
| 404  | Guild not found |

---

#### POST /api/guilds/:id/join

Join a guild (open join).

**Auth required:** Yes

**Success Response (201):**

```json
{
  "member": {
    "guildId": "clx...",
    "characterId": "clx...",
    "rank": "member",
    "character": { "id": "clx...", "name": "Elara" }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Guild not found |
| 409  | Already a member |

---

#### POST /api/guilds/:id/invite

Invite a player to the guild. Requires officer rank or above.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `characterId` | string | Yes | Non-empty |

**Success Response (201):**

```json
{
  "member": {
    "guildId": "clx...",
    "characterId": "clx...",
    "rank": "member",
    "character": { "id": "clx...", "name": "Elara" }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not an officer or above |
| 404  | Character not found |
| 409  | Already a member |

---

#### POST /api/guilds/:id/kick

Remove a member from the guild. Requires officer rank or above. Cannot kick higher-ranked members.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `characterId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{ "message": "Member kicked from guild" }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not officer+, target is leader, target is equal/higher rank |
| 404  | Target not a member |

---

#### POST /api/guilds/:id/leave

Leave a guild. Leaders must transfer leadership first.

**Auth required:** Yes

**Success Response (200):**

```json
{ "message": "You have left the guild" }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Leader cannot leave (must transfer first) |
| 404  | Not a member |

---

#### POST /api/guilds/:id/promote

Change a member's rank. Leader only.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `characterId` | string | Yes | Non-empty |
| `newRank` | string | Yes | `member`, `officer`, or `co-leader` |

**Success Response (200):**

```json
{
  "member": {
    "characterId": "clx...",
    "rank": "officer",
    "character": { "id": "clx...", "name": "Elara" }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Cannot change leader rank (use transfer) |
| 403  | Not the guild leader |
| 404  | Target not a member |

---

#### POST /api/guilds/:id/donate

Donate gold to the guild treasury.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `amount` | integer | Yes | Min 1 |

**Success Response (200):**

```json
{ "treasury": 3000, "donated": 500 }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Insufficient gold |
| 404  | Not a member, guild not found |

---

#### POST /api/guilds/:id/transfer

Transfer guild leadership to another member.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `characterId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{ "message": "Leadership transferred successfully" }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Already the leader |
| 403  | Not the guild leader |
| 404  | Guild not found, target not a member |

---

#### GET /api/guilds/:id/quests

List guild quests (placeholder -- currently returns empty array).

**Auth required:** Yes

**Success Response (200):**

```json
{ "quests": [] }
```

---

### Messages

#### POST /api/messages/send

Send a message to a channel. Channel-specific validation applies.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `channelType` | string | Yes | `GLOBAL`, `TOWN`, `GUILD`, `PARTY`, `WHISPER`, `TRADE`, or `SYSTEM` |
| `content` | string | Yes | 1-2000 chars |
| `recipientId` | string | No | Required for WHISPER |
| `guildId` | string | No | Required for GUILD |
| `townId` | string | No | For TOWN (auto-resolved from character location) |

**Channel Restrictions:**

| Channel | Restriction |
|---------|-------------|
| GLOBAL | Admin only |
| WHISPER | recipientId required, cannot whisper to self |
| GUILD | Must be a guild member |
| TOWN | Must be in a town |

**Success Response (201):**

```json
{
  "message": {
    "id": "clx...",
    "channelType": "WHISPER",
    "content": "Hello!",
    "senderId": "clx...",
    "recipientId": "clx...",
    "guildId": null,
    "townId": null,
    "isRead": false,
    "timestamp": "2026-01-20T...",
    "sender": { "id": "clx...", "name": "Thorin" },
    "recipient": { "id": "clx...", "name": "Elara" }
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Missing recipientId (whisper), missing guildId (guild), not in town (town), self-whisper |
| 403  | Not admin (global), not guild member (guild) |
| 404  | No character, recipient not found |

---

#### GET /api/messages/inbox

Get whisper messages (sent and received).

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | integer | No | Default 1 |
| `limit` | integer | No | 1-100, default 50 |

**Success Response (200):**

```json
{
  "messages": [ ... ],
  "pagination": { "page": 1, "limit": 50, "total": 120, "totalPages": 3 }
}
```

---

#### GET /api/messages/conversation/:characterId

Get whisper conversation with a specific character.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `characterId` | The other character's ID |

**Query Parameters:** Same pagination as inbox.

**Success Response (200):**

```json
{
  "messages": [ ... ],
  "pagination": { "page": 1, "limit": 50, "total": 45, "totalPages": 1 }
}
```

---

#### GET /api/messages/channel/:channelType

Get messages from a specific channel.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `channelType` | `GLOBAL`, `TOWN`, `GUILD`, `PARTY`, `TRADE`, or `SYSTEM` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `townId` | string | No | Required for TOWN if not in a town |
| `guildId` | string | No | Required for GUILD |
| `page` | integer | No | Default 1 |
| `limit` | integer | No | 1-100, default 50 |

**Success Response (200):**

```json
{
  "messages": [ ... ],
  "pagination": { "page": 1, "limit": 50, "total": 200, "totalPages": 4 }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Invalid channel type, missing townId/guildId |
| 403  | Not a guild member (guild channel) |

---

#### PATCH /api/messages/:id/read

Mark a received message as read.

**Auth required:** Yes

**Success Response (200):**

```json
{ "message": { ... } }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not the recipient |
| 404  | Message not found |

---

#### DELETE /api/messages/:id

Delete a message you sent.

**Auth required:** Yes

**Success Response (200):**

```json
{ "success": true }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not the sender |
| 404  | Message not found |

---

### Friends

#### POST /api/friends/request

Send a friend request.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `characterId` | string | Yes | Non-empty |

**Success Response (201):**

```json
{
  "friendship": {
    "id": "clx...",
    "recipientId": "clx...",
    "status": "PENDING",
    "createdAt": "2026-01-20T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Self-request, already friends, request already pending, blocked |
| 404  | No character, target not found |

---

#### POST /api/friends/:id/accept

Accept a pending friend request.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Friendship ID |

**Success Response (200):**

```json
{
  "friendship": {
    "id": "clx...",
    "status": "ACCEPTED",
    "friendId": "clx...",
    "friendName": "Thorin"
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Request no longer pending |
| 403  | Only the recipient can accept |
| 404  | Friend request not found |

---

#### POST /api/friends/:id/decline

Decline a pending friend request.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Friendship ID |

**Success Response (200):**

```json
{
  "friendship": { "id": "clx...", "status": "DECLINED" }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Request no longer pending |
| 403  | Only the recipient can decline |
| 404  | Friend request not found |

---

#### DELETE /api/friends/:id

Remove a friend or cancel a pending request. Either party can do this.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Friendship ID |

**Success Response (200):**

```json
{ "message": "Friend removed" }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not your friendship |
| 404  | Friendship not found |

---

#### GET /api/friends

List all accepted friends with online status.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "friends": [
    {
      "friendshipId": "clx...",
      "character": {
        "id": "clx...",
        "name": "Elara",
        "level": 8,
        "race": "ELF",
        "currentTownId": "clx..."
      },
      "online": true,
      "since": "2026-01-15T..."
    }
  ]
}
```

---

#### GET /api/friends/requests

List incoming and outgoing pending friend requests.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "incoming": [
    {
      "id": "clx...",
      "from": { "id": "clx...", "name": "Thorin", "level": 10, "race": "DWARF" },
      "createdAt": "2026-01-20T..."
    }
  ],
  "outgoing": [
    {
      "id": "clx...",
      "to": { "id": "clx...", "name": "Elara", "level": 8, "race": "ELF" },
      "createdAt": "2026-01-20T..."
    }
  ]
}
```

---

### Notifications

#### GET /api/notifications

List notifications for the character.

**Auth required:** Yes

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `unreadOnly` | string | No | `true` to filter unread only |
| `page` | integer | No | Default 1 |
| `limit` | integer | No | 1-50, default 20 |

**Success Response (200):**

```json
{
  "notifications": [
    {
      "id": "clx...",
      "characterId": "clx...",
      "type": "friend_request",
      "title": "Friend Request",
      "message": "Thorin wants to be your friend!",
      "data": { "friendshipId": "clx...", "requesterId": "clx..." },
      "read": false,
      "timestamp": "2026-01-20T..."
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

#### PATCH /api/notifications/:id/read

Mark a notification as read.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "notification": { "id": "clx...", "read": true, ... }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not your notification |
| 404  | Notification not found |

---

#### PATCH /api/notifications/read-all

Mark all unread notifications as read.

**Auth required:** Yes

**Success Response (200):**

```json
{ "updated": 5 }
```

---

#### DELETE /api/notifications/:id

Delete a notification.

**Auth required:** Yes

**Success Response (200):**

```json
{ "message": "Notification deleted" }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 403  | Not your notification |
| 404  | Notification not found |

---

## Quests / Progression

### Quests

#### GET /api/quests/available

List quests available to the character. Filters out active, completed (non-repeatable), cooldown-locked, and prerequisite-locked quests.

**Auth required:** Yes
**Cache:** 60 seconds

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `townId` | string | No | Filter by town's region |

**Success Response (200):**

```json
{
  "quests": [
    {
      "id": "clx...",
      "name": "Goblin Menace",
      "type": "BOUNTY",
      "description": "Clear the goblin camp...",
      "objectives": [
        { "type": "KILL", "target": "Goblin", "quantity": 5 }
      ],
      "rewards": { "xp": 100, "gold": 50 },
      "levelRequired": 3,
      "region": { "id": "clx...", "name": "Verdant Plains" },
      "isRepeatable": true,
      "npc": { "id": "clx...", "name": "Guard Captain", "townId": "clx..." }
    }
  ]
}
```

---

#### GET /api/quests/active

List the character's active quests with progress.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "quests": [
    {
      "questId": "clx...",
      "name": "Goblin Menace",
      "type": "BOUNTY",
      "description": "...",
      "objectives": [ ... ],
      "rewards": { "xp": 100, "gold": 50 },
      "region": { "id": "clx...", "name": "Verdant Plains" },
      "progress": { "0": 3 },
      "startedAt": "2026-01-20T..."
    }
  ]
}
```

---

#### GET /api/quests/completed

List the character's completed quests.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "quests": [
    {
      "questId": "clx...",
      "name": "First Steps",
      "type": "MAIN",
      "rewards": { "xp": 50, "gold": 25 },
      "completedAt": "2026-01-18T..."
    }
  ]
}
```

---

#### POST /api/quests/accept

Accept a quest. Validates level requirement, prerequisites, repeatability, and cooldowns.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `questId` | string | Yes | Non-empty |

**Success Response (201):**

```json
{
  "quest": {
    "questId": "clx...",
    "name": "Goblin Menace",
    "type": "BOUNTY",
    "description": "...",
    "objectives": [ ... ],
    "rewards": { "xp": 100, "gold": 50 },
    "progress": { "0": 0 },
    "startedAt": "2026-01-20T..."
  }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Level too low, prerequisite not met, already active, already completed (non-repeatable), on cooldown |
| 404  | No character, quest not found |

---

#### POST /api/quests/progress

Manually report progress on a quest objective.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `questId` | string | Yes | Non-empty |
| `objectiveIndex` | integer | Yes | Min 0 |
| `amount` | integer | No | Min 1, default 1 |

**Success Response (200):**

```json
{
  "questId": "clx...",
  "objectiveIndex": 0,
  "current": 4,
  "required": 5,
  "complete": false
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Invalid objective index |
| 404  | Active quest not found |

---

#### POST /api/quests/complete

Complete a quest and claim rewards. All objectives must be met.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `questId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{
  "completed": true,
  "quest": { "id": "clx...", "name": "Goblin Menace" },
  "rewards": { "xp": 100, "gold": 50 }
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Objectives not complete |
| 404  | Active quest not found |

---

#### POST /api/quests/abandon

Abandon an active quest. Progress is deleted.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `questId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{ "abandoned": true, "questId": "clx..." }
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | Active quest not found |

---

#### GET /api/quests/npcs/:townId

List NPCs in a town with their available quests and quest status relative to the character.

**Auth required:** Yes

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `townId` | Town ID |

**Success Response (200):**

```json
{
  "npcs": [
    {
      "id": "clx...",
      "name": "Guard Captain",
      "role": "quest_giver",
      "dialog": "Adventurer! We need your help...",
      "town": { "id": "clx...", "name": "Millhaven" },
      "quests": [
        {
          "id": "clx...",
          "name": "Goblin Menace",
          "type": "BOUNTY",
          "description": "...",
          "levelRequired": 3,
          "isRepeatable": true,
          "status": "available"
        }
      ]
    }
  ]
}
```

Quest `status` values: `available`, `active`, `completed`, `locked` (level too low).

---

### Skills

#### GET /api/skills/tree

Get the full skill tree for the character's class, showing which abilities are unlocked and which can be unlocked.

**Auth required:** Yes

**Success Response (200):**

```json
{
  "class": "warrior",
  "specialization": "berserker",
  "level": 12,
  "unspentSkillPoints": 2,
  "tree": [
    {
      "specialization": "berserker",
      "isActive": true,
      "abilities": [
        {
          "id": "warrior-berserker-rage",
          "name": "Berserker Rage",
          "description": "...",
          "tier": 1,
          "levelRequired": 1,
          "specialization": "berserker",
          "effects": { ... },
          "cooldown": 3,
          "manaCost": 10,
          "prerequisiteAbilityId": null,
          "unlocked": true,
          "canUnlock": false
        }
      ]
    }
  ]
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | No class assigned, unknown class |
| 404  | No character found |

---

#### POST /api/skills/specialize

Choose a specialization for your class. Requires level 10. Can only be done once.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `specialization` | string | Yes | Must be valid for the character's class |

**Success Response (200):**

```json
{
  "message": "Specialized as berserker",
  "class": "warrior",
  "specialization": "berserker"
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | No class, already specialized, below level 10, invalid specialization |
| 404  | No character found |

---

#### POST /api/skills/unlock

Unlock an ability from the skill tree. Costs 1 skill point.

**Auth required:** Yes

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `abilityId` | string | Yes | Non-empty |

**Success Response (200):**

```json
{
  "unlocked": {
    "id": "warrior-berserker-rage",
    "name": "Berserker Rage",
    "description": "...",
    "tier": 1,
    "effects": { ... }
  },
  "unspentSkillPoints": 1
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 400  | Wrong class, wrong specialization, level too low, no skill points, already unlocked, prerequisite not met |
| 404  | No character, ability not found |

---

#### GET /api/skills/abilities

Get the character's unlocked abilities (for combat integration).

**Auth required:** Yes

**Success Response (200):**

```json
{
  "abilities": [
    {
      "id": "warrior-berserker-rage",
      "name": "Berserker Rage",
      "description": "...",
      "class": "warrior",
      "specialization": "berserker",
      "tier": 1,
      "effects": { ... },
      "cooldown": 3,
      "manaCost": 10,
      "levelRequired": 1,
      "unlockedAt": "2026-01-18T..."
    }
  ]
}
```

**Error Responses:**

| Code | Condition |
|------|-----------|
| 404  | No character found |
