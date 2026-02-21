# Frontend Integrity Audit Report
Generated: 2026-02-21

## Summary
- Total issues found: 26
- Critical (broken functionality): 3
- Warning (drift risk): 10
- Info (dead code / unused): 13

---

## Layer 1: API Endpoint Alignment

### Broken Calls (client → nonexistent route)

| # | File | Line | Client Call | Issue |
|---|------|------|-------------|-------|
| 1 | `client/src/pages/MarketPage.tsx` | 125 | `GET /characters/current` | **Route does not exist.** Server has `/characters/me` only. No `/current` endpoint in `characters.ts`. |
| 2 | `client/src/components/market/BidModal.tsx` | 61 | `GET /characters/current` | Same as above — second caller of nonexistent `/characters/current`. |

**Severity:** CRITICAL — MarketPage and BidModal will get 404 errors when fetching character data.

### Dead Routes (server route → zero client callers)

These server endpoints have no client-side callers. They may be used by admin pages, external tools, or are genuinely dead.

| Route File | Path | Method | Notes |
|-----------|------|--------|-------|
| `routes/friends.ts` | `/api/friends/request` | POST | Socket event `friend:request` is emitted but never listened to |
| `routes/friends.ts` | `/api/friends/accept` | POST | Socket event `friend:accepted` is emitted but never listened to |
| `routes/service.ts` | `/api/service/innkeeper/*` | POST | Multiple innkeeper service endpoints |
| `routes/service.ts` | `/api/service/stable-master/*` | POST | Stable master service endpoints |
| `routes/service.ts` | `/api/service/courier/*` | POST | Courier service endpoints |
| `routes/loans.ts` | `/api/loans/*` | GET/POST | Full banker loan system |
| `routes/rancher.ts` | `/api/rancher/*` | GET/POST | Rancher-specific endpoints |
| `routes/relocate.ts` | `/api/relocate/*` | POST | Town relocation |
| `routes/parties.ts` | `/api/parties/*` | GET/POST | Party management |
| `routes/houses.ts` | `/api/houses/*` | GET/POST | May overlap with buildings.ts |
| `routes/reports.ts` | `/api/reports/mayor-dashboard` | GET | Mayor dashboard data |

**Note:** Most "dead routes" serve admin pages, future features, or are called indirectly. The core game routes are well-covered.

---

## Layer 2: Response Shape Drift

### Critical Mismatches (will cause runtime errors)

#### 1. ProfilePage — Stat key mismatch (all stats display as 0)

- **Client:** `client/src/pages/ProfilePage.tsx:29-36`
- **Interface:** `CharacterProfile.stats` expects `{ strength, dexterity, constitution, intelligence, wisdom, charisma }`
- **STAT_CONFIG keys (line 44-51):** `'strength'`, `'dexterity'`, `'constitution'`, `'intelligence'`, `'wisdom'`, `'charisma'`
- **Usage (line 218):** `profile.stats?.[stat.key] ?? 0` — accesses `stats.strength`, `stats.dexterity`, etc.
- **Server:** `server/src/routes/characters.ts:133-139` stores stats as `{ str, dex, con, int, wis, cha }`
- **Server response (line 308):** `stats: typeof rest.stats === 'string' ? JSON.parse(rest.stats) : rest.stats` — returns `{ str, dex, con, int, wis, cha }`
- **Impact:** All 6 stat values render as `0` on every profile page. The `?? 0` fallback silently hides the bug.

### Warnings (fields exist but types differ)

#### 1. MarketPage — `/characters/current` endpoint doesn't exist
- **Client:** `client/src/pages/MarketPage.tsx:125` and `client/src/components/market/BidModal.tsx:61`
- **Expected:** `GET /characters/current` returning `CharacterData`
- **Actual:** Server only has `GET /characters/me` — no `/current` route exists
- **Impact:** 404 error when loading MarketPage character data. Already flagged in Layer 1.

#### 2. TownPage — Region type union inconsistency
- **Client:** `client/src/pages/TownPage.tsx:40-52`
- **Type:** `region: { id: string; name: string; biome: string } | string`
- **Server:** `server/src/routes/towns.ts` always returns region as object `{ id, name, biome }`
- **Impact:** No runtime error (server shape matches), but the `| string` union is misleading dead code.

#### 3. CombatPage — PvP state defensive normalization
- **Client:** `client/src/pages/CombatPage.tsx:414-447`
- **Pattern:** `c.id ?? c.characterId ?? ''` — double-fallback field access
- **Implication:** Response shape was uncertain when written. Works today via fallback, but fragile.

#### 4. CraftingPage — TownResource schema discrepancy
- **Client:** `client/src/pages/CraftingPage.tsx` `TownResource` interface
- **Issue:** Client defines `resource: { name, type }` but gathering endpoints return `resource` with additional fields (`tier`, `rarity`, `baseGatherTime`, `baseYield`, `description`).
- **Impact:** No error (extra fields ignored), but client misses useful data.

#### 5. CraftingPage — profession wrapping inconsistency
- **Client:** CraftingPage expects profession data at `data.professions` array
- **Server:** Some crafting endpoints wrap profession in `data.profession` (singular)
- **Impact:** Potential undefined access if client reads wrong key.

#### 6. InventoryPage — Template stats structure
- **Client:** `InventoryPage.tsx` `ItemTemplate.stats` typed as `Record<string, unknown>`
- **Server:** Returns `stats` as JSON blob parsed from Prisma — shape varies by item type
- **Impact:** No type safety on stat access. Works but fragile.

### Missing Fields (server sends, client ignores — OK but noted)

| Server Field | Route | Client Page | Notes |
|-------------|-------|-------------|-------|
| `baseStats`, `qualityMultiplier`, `enchantmentBonuses` | equipment.ts | InventoryPage | Client only uses computed `stats` |
| `totalResistances` | equipment.ts:291 | InventoryPage | New feature, client not using yet |
| `craftedByName` on inventory items | characters.ts:260 | InventoryPage | Available but unused in grid view |

---

## Layer 3: Enum & Constant Sync

### Mismatched Values

#### 1. BestTrades.tsx — Wrong rarity enum (CRITICAL)

- **File:** `client/src/components/trade/BestTrades.tsx:37-43`
- **Constant:** `RARITY_COLORS`
- **Has:** `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `LEGENDARY`
- **Backend ItemRarity enum:** `POOR`, `COMMON`, `FINE`, `SUPERIOR`, `MASTERWORK`, `LEGENDARY`
- **Impact:** Items with rarity POOR, FINE, SUPERIOR, MASTERWORK will get no color styling. UNCOMMON, RARE, EPIC keys will never match any server data.

#### 2. PriceCompare.tsx — Wrong rarity enum (CRITICAL)

- **File:** `client/src/components/trade/PriceCompare.tsx:43-49`
- **Constant:** `RARITY_COLORS`
- **Same issue as BestTrades.tsx** — uses `UNCOMMON`/`RARE`/`EPIC` instead of `FINE`/`SUPERIOR`/`MASTERWORK`
- **Impact:** Identical broken styling for item rarity display in price comparison view.

#### 3. GatheringResults.tsx — Uses ResourceRarity (correct for context)

- **File:** `client/src/components/gathering/GatheringResults.tsx:33-38`
- **Constant:** `RARITY_COLORS`
- **Has:** `COMMON`, `UNCOMMON`, `RARE`, `EXOTIC`, `LEGENDARY`
- **Matches:** `shared/src/data/resources/types.ts` `ResourceRarity` type
- **Status:** CORRECT — this component displays gathered resources, not crafted items.
- **Note:** Two distinct rarity systems exist: `ItemRarity` (Prisma: POOR→LEGENDARY) and `ResourceRarity` (shared: COMMON→LEGENDARY). The trade components incorrectly use ResourceRarity-style keys for ItemRarity data.

### Missing Entries

#### 4. RecipeList.tsx PROFESSION_LABELS — Missing 7 service professions

- **File:** `client/src/components/crafting/RecipeList.tsx:46-69`
- **Has (22):** BLACKSMITH, ARMORER, LEATHERWORKER, TAILOR, WOODWORKER, ALCHEMIST, COOK, BREWER, SMELTER, TANNER, FLETCHER, JEWELER, ENCHANTER, SCRIBE, MASON, FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER
- **Missing (7):** MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN
- **Backend ProfessionType enum:** 29 total values (22 + 7 service)
- **Impact:** Low — service professions don't have crafting recipes, so they won't appear in the RecipeList. The fallback at line 72 produces acceptable formatting. Info-level issue.

### Extra Entries (client has values not in backend enum)

| File | Constant | Extra Keys | Notes |
|------|----------|-----------|-------|
| `BestTrades.tsx` | RARITY_COLORS | UNCOMMON, RARE, EPIC | Not in ItemRarity Prisma enum |
| `PriceCompare.tsx` | RARITY_COLORS | UNCOMMON, RARE, EPIC | Not in ItemRarity Prisma enum |

### Hardcoded Strings

- **`client/src/constants/index.ts`** — RARITY_COLORS, RARITY_BADGE_COLORS, RARITY_TEXT_COLORS all use correct 6-value ItemRarity keys (POOR, COMMON, FINE, SUPERIOR, MASTERWORK, LEGENDARY). ✓ Clean.
- **`CraftingResults.tsx`** — QUALITY_COLORS uses correct 6-value keys. ✓ Clean.

---

## Layer 4: Socket Event Alignment

### Orphaned Listeners (client listens, server never emits)

| # | Event | Client File | Expected Payload | Root Cause |
|---|-------|-------------|------------------|------------|
| 1 | `caravan:departed` | `useTradeEvents.ts` | `{ caravanId, toTownId, arrivesAt }` | Server sends caravan events via `emitNotification()` with type metadata, not as direct socket events |
| 2 | `caravan:arrived` | `useTradeEvents.ts` | `{ caravanId, toTownId, cargoValue, xpAmount }` | Same — wrapped in notification:new |
| 3 | `caravan:ambushed` | `useTradeEvents.ts` | `{ caravanId, caravanName, routeDescription }` | Same — wrapped in notification:new |
| 4 | `profession:level-up` | `useProgressionEvents.ts` | `{ characterId, professionType, newLevel, newTier }` | Server sends this as notification:new with profession data in metadata, not as a direct socket event |
| 5 | `tick:processing` | `DailyDashboard.tsx` | None (no payload) | Server emits `tick:complete` but never `tick:processing`. No pre-tick signal exists. |

**Impact:**
- Issues 1-4: Toast notifications from `useTradeEvents` and `useProgressionEvents` will never fire. Users DO still see these events via the notification dropdown (notification:new channel works), but the real-time toast/sound effects are broken.
- Issue 5: DailyDashboard "processing" spinner will never activate.

### Orphaned Emitters (server emits, nobody listens)

| # | Event | Server File | Emit Pattern | Notes |
|---|-------|------------|--------------|-------|
| 1 | `travel:tick-processed` | `socket/events.ts`, `jobs/travel-tick.ts` | `io.emit` (broadcast) | No client listener — travel UI polls via React Query |
| 2 | `travel:group-update` | `socket/events.ts` | `io.to(user:${id})` | No client listener |
| 3 | `travel:player-entered` | `socket/events.ts` | `io.to(node:${id})` | No client listener |
| 4 | `travel:player-left` | `socket/events.ts` | `io.to(node:${id})` | No client listener |
| 5 | `item:lowDurability` | `socket/events.ts` | `io.to(user:${id})` | No client listener — durability warnings not shown |
| 6 | `item:broken` | `socket/events.ts` | `io.to(user:${id})` | No client listener — item break not shown in real-time |
| 7 | `building:taxDue` | `socket/events.ts` | `io.to(user:${id})` | No client listener |
| 8 | `building:delinquent` | `socket/events.ts` | `io.to(user:${id})` | No client listener |
| 9 | `building:seized` | `socket/events.ts` | `io.to(user:${id})` | No client listener |
| 10 | `building:damaged` | `socket/events.ts` | `io.to(user:${id})` | No client listener |
| 11 | `building:conditionLow` | `socket/events.ts` | `io.to(user:${id})` | No client listener |
| 12 | `action:cancelled` | `socket/events.ts` | `io.to(user:${id})` | No client listener — action cancellation not shown |
| 13 | `friend:request` | `socket/events.ts` | `io.to(user:${id})` | No client listener — friend requests not shown in real-time |
| 14 | `friend:accepted` | `socket/events.ts` | `io.to(user:${id})` | No client listener |
| 15 | `system:broadcast` | `routes/admin/tools.ts` | `io.emit` | Admin broadcast, no handler |
| 16 | `chat:error` | `socket/chat-handlers.ts` | `socket.emit` | No client handler for chat errors |
| 17 | `admin:error-log` | `lib/error-logger.ts` | via setAdminEmitter callback | ErrorLogDashboardPage listens — but event name in socket.ts types is not registered. Ambiguous. |

**Note:** Items 1-4 (travel events) and 5-6 (durability events) represent the biggest missed UX opportunities. Building events (7-11) and friend events (13-14) are also user-facing features with no real-time display.

### Payload Shape Mismatches

| # | Event | Client Type | Server Sends | Issue |
|---|-------|-------------|-------------|-------|
| 1 | `trade:completed` | `{ listingId, buyerName, itemName }` (from socket.ts types) | `{ buyerId, itemName, quantity, price }` (emitTradeCompleted) | Client expects `listingId` + `buyerName`; server sends `buyerId` + `quantity` + `price` |
| 2 | `player:enter-town` | `{ characterId, characterName, townId }` | `{ characterId, characterName }` | Server omits `townId` — client expects it for conditional rendering |
| 3 | `player:leave-town` | `{ characterId, characterName, townId }` | `{ characterId, characterName, destinationTownId }` | Field name mismatch: client expects `townId`, server sends `destinationTownId` |
| 4 | `presence:friends-online` | `PresencePayload` (single object) | `{ friends: [{characterId, characterName}] }` | Shape mismatch: client type implies single payload, server sends array wrapper |

---

## Recommended Fixes (ordered by severity)

### Critical (3)

**Fix 1: ProfilePage stat key mismatch — ALL stats show as 0**
- **File:** `client/src/pages/ProfilePage.tsx:44-51`
- **Change:** Update STAT_CONFIG keys from `'strength'`→`'str'`, `'dexterity'`→`'dex'`, `'constitution'`→`'con'`, `'intelligence'`→`'int'`, `'wisdom'`→`'wis'`, `'charisma'`→`'cha'`
- **Why:** Server stores and returns stats with abbreviated keys. Every profile page currently shows all stats as 0.

**Fix 2: MarketPage `/characters/current` → `/characters/me`**
- **Files:** `client/src/pages/MarketPage.tsx:125`, `client/src/components/market/BidModal.tsx:61`
- **Change:** Replace `/characters/current` with `/characters/me`
- **Why:** Route doesn't exist, causing 404. MarketPage cannot load character gold/location data.

**Fix 3: Trade component rarity enums — broken styling**
- **Files:** `client/src/components/trade/BestTrades.tsx:37-43`, `client/src/components/trade/PriceCompare.tsx:43-49`
- **Change:** Replace `UNCOMMON`→`FINE`, `RARE`→`SUPERIOR`, `EPIC`→`MASTERWORK`, and add missing `POOR` key
- **Why:** Items from the server use ItemRarity enum (POOR/COMMON/FINE/SUPERIOR/MASTERWORK/LEGENDARY). Current keys never match, so items get no color styling.

### Warning (5 — recommend fixing)

**Fix 4: Socket — add caravan direct events or wire useTradeEvents to notification:new**
- **Files:** `server/src/routes/caravans.ts` or `client/src/hooks/useTradeEvents.ts`
- **Option A:** Server: emit `caravan:departed/arrived/ambushed` as direct socket events alongside notifications
- **Option B:** Client: listen for `notification:new` with type filtering instead of dedicated caravan events
- **Why:** Caravan toast notifications never fire.

**Fix 5: Socket — add profession:level-up direct event or wire to notification:new**
- **Files:** Server: wherever profession XP is awarded, or Client: `useProgressionEvents.ts`
- **Why:** Profession level-up toast never fires.

**Fix 6: Socket — fix trade:completed payload shape**
- **Files:** `server/src/socket/events.ts` (emitTradeCompleted) or `client/src/services/socket.ts`
- **Change:** Align field names — either server adds `listingId`/`buyerName` or client expects `buyerId`/`quantity`/`price`
- **Why:** Trade completion listener may crash or display wrong data.

**Fix 7: Socket — fix player:enter-town / player:leave-town payload**
- **Files:** `server/src/socket/events.ts` (emitPlayerEnterTown, emitPlayerLeaveTown)
- **Change:** Include `townId` in enter-town payload; rename `destinationTownId` to `townId` in leave-town (or update client)
- **Why:** Client-side town presence display may not update correctly.

**Fix 8: Socket — fix presence:friends-online payload shape**
- **Files:** `server/src/socket/presence.ts` or `client/src/services/socket.ts`
- **Change:** Align array wrapper vs single object expectation
- **Why:** Friends list online status may not populate correctly.

### Info (5 — note for future work)

**Info 1:** 17 server socket events have no client listeners (travel tracking, durability warnings, building maintenance alerts, friend events). These represent feature gaps where real-time UX could be added.

**Info 2:** PROFESSION_LABELS in RecipeList.tsx missing 7 service professions. Low impact since service professions don't craft, but fallback formatting is imperfect.

**Info 3:** TownPage region type includes unnecessary `| string` union — server always returns object.

**Info 4:** CombatPage PvP state normalization uses double-fallback (`c.id ?? c.characterId ?? ''`), suggesting response shape uncertainty.

**Info 5:** `tick:processing` event listened for in DailyDashboard but never emitted — "processing" spinner is dead code.

---

## Cross-Reference with Backend Audit

The backend integrity audit (commit 159ba24) confirmed:
- 42 enums consistent across schema/seeds/routes ✓
- 127 item templates, 200+ recipes valid ✓
- All API routes reference valid models ✓
- 14 missing `onDelete: Cascade` rules fixed ✓
- Combat race propagation fixed in road-encounter.ts and combat-pvp.ts ✓

This frontend audit confirms the **backend is source of truth** — all issues found are client-side drift from the verified backend.
