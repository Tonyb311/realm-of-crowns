# P1 Fix Log

## Crafting Chain Fixes

### P1 #14a -- Nails level requirement (CRITICAL-ECON-01)
**File changed:** `shared/src/data/recipes/smelter.ts`

**Problem:** The `forge-nails` recipe (Smelter L5) required `Iron Ingot`, but `smelt-iron` produces Iron Ingot at Smelter L10. A Smelter at L5-L9 could not craft Nails, blocking all building construction.

**Fix:** Changed `forge-nails` input from `Iron Ingot` to `Copper Ingot`. Copper Ingot is produced by `smelt-copper` at Smelter L1, so the chain is now valid at L5.

**Chain verification:** Miner (Copper Ore L1 + Coal L1) -> Smelter smelt-copper (L1) -> Copper Ingot -> Smelter forge-nails (L5) -> Nails -> Used by buildings, Woodworker, Leatherworker (studded).

---

### P1 #14b -- Silk Thread has no source (CRITICAL-ECON-02)
**File changed:** `shared/src/data/recipes/tailor.ts`

**Problem:** The `weave-silk` recipe required `Silk Thread` but nothing in the game produced it. Silk Cloth was unobtainable, blocking cloth armor tier 3+ and exotic leather armor.

**Fix:** Added `spin-silk-thread` recipe (Tailor L25): 2 Wool + 1 Flowers -> 2 Silk Thread. Placed at L25 to bridge the gap between Woven Wool (L10) and Silk Cloth (L40).

**Chain verification:** Rancher (Wool L1) + Herbalist (Flowers, Journeyman) -> Tailor spin-silk-thread (L25) -> Silk Thread -> Tailor weave-silk (L40) -> Silk Cloth -> Used by Leatherworker (exotic armor), Tailor (silk armor).

---

### P1 #14c -- Exotic Hide has no source (CRITICAL-ECON-03)
**File changed:** `shared/src/data/resources/animal.ts`

**Problem:** The `tan-exotic` recipe required `Exotic Hide` but it was not defined as a gatherable resource. Exotic Leather was unobtainable, blocking leather armor tier 4.

**Fix:** Added `Exotic Hide` resource definition (Hunter, tier 3, RARE rarity, biomes: FOREST/SWAMP/BADLANDS). The Hunter profession already listed `Exotic Hides` at the EXPERT tier unlock.

**Chain verification:** Hunter gathers Exotic Hide (tier 3) -> Tanner tan-exotic (L50) + Rare Herbs -> Exotic Leather -> Leatherworker (tier 4 armor), Blacksmith (Mithril weapons).

---

### P1 #14d -- No Bricks recipe (MAJOR-ECON-05)
**Status: NO CHANGE NEEDED**

The `fire-bricks` recipe already exists in `shared/src/data/recipes/mason.ts` at Mason L10 (5 Raw Stone + 1 Coal -> 4 Bricks). The systems review finding was incorrect.

---

### Major-ECON-04 / P2 #50 -- Copper weapon starter recipes
**File changed:** `shared/src/data/recipes/weapons.ts`

**Problem:** Copper weapons (Blacksmith L1) required `Hardwood Planks` (Woodworker L10). New Blacksmiths could not craft their first weapons without an experienced Woodworker.

**Fix:** Changed `Hardwood Planks` to `Softwood Planks` (Woodworker L1) in three copper weapon recipes:
- `forge-copper-mace` (L1)
- `forge-copper-axe` (L1)
- `forge-copper-spear` (L1)

Note: `forge-copper-dagger` and `forge-copper-sword` already used `Soft Leather` (no wood input), so no change was needed for those.

**Chain verification:** Lumberjack (Softwood L1) -> Woodworker mill-softwood (L1) -> Softwood Planks -> Blacksmith copper weapons (L1). All tier-1 materials.

---

### Major-ECON-06 -- No Cloth Padding recipe
**File changed:** `shared/src/data/recipes/tailor.ts`

**Problem:** ECONOMY.md describes `Cloth Padding` as a Tailor output needed by Armorer for plate armor. The Armorer profession definition lists `Cloth Padding` as an input. No recipe existed.

**Fix:** Added `make-cloth-padding` recipe (Tailor L3): 2 Cloth -> 1 Cloth Padding.

**Chain verification:** Farmer (Cotton L1) -> Tailor spin-cloth (L1) -> Cloth -> Tailor make-cloth-padding (L3) -> Cloth Padding. Available for Armorer plate armor integration in Phase 2A.

---

### Major-ECON-07 -- Rancher output name mismatch
**File changed:** `shared/src/data/professions/gathering.ts`

**Problem:** Rancher `outputProducts` listed `Cattle`/`Pigs`/`Chickens` but the resource definitions in `animal.ts` and Cook recipes use `Beef`/`Pork`/`Chicken`.

**Fix:** Renamed in the Rancher profession definition:
- `Cattle` -> `Beef`
- `Pigs` -> `Pork`
- `Chickens` -> `Chicken`

Also updated `tierUnlocks` entries to match. The resource files (`animal.ts`) and Cook consumable recipes (`consumables.ts`) already used the correct names.

---

### Major-PROF-01 -- Missing Woodworker recipes
**File changed:** `shared/src/data/recipes/woodworker.ts`

**Problem:** Woodworker profession definition listed Barrels and Furniture as outputs, but no recipes existed. Brewers need Barrels for beer/wine production.

**Fix:** Added two recipes:
- `make-barrel` (Woodworker L10): 4 Softwood Planks + 10 Nails -> 1 Barrel
- `make-furniture` (Woodworker L15): 4 Hardwood Planks + 15 Nails -> 1 Furniture

**Chain verification:**
- Barrel: Lumberjack (Softwood L1) -> Woodworker mill-softwood (L1) -> Softwood Planks + Miner/Smelter -> Nails -> Woodworker make-barrel (L10) -> Barrel. Used by Brewers.
- Furniture: Lumberjack (Hardwood, Journeyman) -> Woodworker mill-hardwood (L10) -> Hardwood Planks + Nails -> Woodworker make-furniture (L15) -> Furniture. Used by housing.

---

## Build Verification

- **Shared build:** PASS (`npm run build --workspace=shared`)
- All 7 recipe/resource files compile cleanly.

## Remaining Known Broken Links

1. **Bowstring** -- Tailor lists Bowstring as output but no recipe exists. Fletcher may need this for bows. (MINOR-ECON-11)
2. **Glass Vial** -- Greater Healing Potion skips the Glass Vial container step per ECONOMY.md. (MINOR-ECON-10)
3. **Cloth Padding not yet referenced in armor recipes** -- Armorer recipes in `armor.ts` use Soft Leather for padding, not Cloth Padding. The recipe is ready but armor recipes need updating in Phase 2A.
4. **Barrel not yet referenced in Brewer recipes** -- Brewer consumable recipes in `consumables.ts` do not reference Barrels as input. The recipe is ready but Brewer recipes need updating in Phase 2A.

---

## Seed Data & Schema Fixes

### P1 #16 / Database MAJOR-01 -- Kingdom-Region relation
**Files changed:**
- `database/prisma/schema.prisma` (Region model, Kingdom model)
- `database/prisma/migrations/20260210200000_add_kingdom_region_relation/migration.sql`
- `database/seeds/kingdoms.ts` (new)
- `database/seeds/index.ts`

**Problem:** Kingdom model had no relation to Region or Town. No way to query "all towns in kingdom X". Governance, war embargoes, and diplomacy depend on knowing which territories belong to which kingdom.

**Fix:** Added `kingdomId` nullable FK on Region model pointing to Kingdom. Added `regions` relation to Kingdom model. Created migration SQL. Created Kingdom seed data with 8 kingdoms:
- Kingdom of the Heartlands (Verdant Heartlands, Twilight March)
- Silverwood Dominion (Silverwood Forest, Mistwood Glens, Glimmerveil)
- Ironvault Thanedom (Ironvault Mountains, Cogsworth Warrens, Skypeak Plateaus)
- Crossroads Confederacy (The Crossroads)
- Ashenfang Dominion (Ashenfang Wastes, Scarred Frontier)
- Shadowmere Conclave (Shadowmere Marshes, Vel'Naris Underdark, Ashenmoor)
- Frozen Reaches Clans (Frozen Reaches)
- Suncoast Free Cities (The Suncoast, The Confluence)

Thornwilds (Beastfolk) and The Foundry (Warforged) remain independent (kingdomId = null).

---

### P1 #17 / Database MAJOR-04/05 -- Seed Kingdoms, Abilities, Achievements
**Files changed:**
- `database/seeds/kingdoms.ts` (new -- see above)
- `database/seeds/abilities.ts` (new)
- `database/seeds/achievements.ts` (new)
- `database/seeds/index.ts`

**Problem:** Abilities and achievements had standalone seed scripts in `server/src/scripts/` but were not called from the main seed pipeline. A fresh database had empty `abilities` and `achievements` tables, making the skill system and achievement system nonfunctional. Also, `weapon-recipes.ts` and `accessory-recipes.ts` existed in the seeds directory but were not wired into the pipeline (MINOR-07).

**Fix:** Created `abilities.ts` and `achievements.ts` seed functions in `database/seeds/` that import from `@shared/data/skills` and `@shared/data/achievements` respectively. Added all four missing seed calls to `database/seeds/index.ts`:
- `seedKingdoms` (after seedWorld, before resources)
- `seedWeaponRecipes` (after seedFoodItems)
- `seedAccessoryRecipes` (after weapon recipes)
- `seedAbilities` (after accessory recipes)
- `seedAchievements` (last, after abilities)

---

### Database MAJOR-06 / P2 #40 -- Missing database indexes
**Files changed:**
- `database/prisma/schema.prisma` (CombatLog, Notification, TradeTransaction models)
- `database/prisma/migrations/20260210200100_add_missing_indexes/migration.sql`

**Problem:** Missing indexes for hot query paths: CombatLog had no index on actorId (combat history per character), Notification had no composite for unread+date queries, TradeTransaction had no composite for buyer/seller history by date.

**Fix:** Added 4 indexes:
- `CombatLog`: `@@index([actorId])` -- combat history lookups per character
- `Notification`: `@@index([characterId, read, createdAt])` -- efficient "unread notifications, newest first"
- `TradeTransaction`: `@@index([buyerId, createdAt])` -- buyer trade history
- `TradeTransaction`: `@@index([sellerId, createdAt])` -- seller trade history

---

### Database MAJOR-08/09 / P2 #44 -- Fix cascade deletes
**Files changed:**
- `database/prisma/schema.prisma` (Loan, ServiceAction, ServiceReputation models)
- `database/prisma/migrations/20260210200200_fix_cascade_deletes/migration.sql`

**Problem:** Loan, ServiceAction, and ServiceReputation models had character FK relations without `onDelete` behavior. Deleting a character with loans/services would cause FK violation errors and block the deletion.

**Fix:** Added cascade behavior:
- `ServiceAction.provider`: `onDelete: Cascade` (service is meaningless without provider)
- `ServiceAction.client`: `onDelete: SetNull` (preserve service record, nullify client)
- `Loan.banker`: `onDelete: Cascade`
- `Loan.borrower`: `onDelete: Cascade`
- `ServiceReputation.character`: `onDelete: Cascade`

---

### Major-ECON-08/09 -- Desert and River biome references
**Status: NO CHANGE NEEDED**

The BiomeType enum in `database/prisma/schema.prisma` already includes both `DESERT` (line 140) and `RIVER` (line 141). The world seed data uses both biomes for towns (Bridgewater, Riverside, Tuskbridge use RIVER; Sandrift uses DESERT). The resource definitions in `shared/src/data/resources/` reference these biomes correctly. No action required.

---

## Migration Summary

Three migrations generated (NOT applied -- lead handles deployment):
1. `20260210200000_add_kingdom_region_relation` -- adds `kingdom_id` to regions table
2. `20260210200100_add_missing_indexes` -- adds 4 performance indexes
3. `20260210200200_fix_cascade_deletes` -- fixes FK cascade behavior on 5 relations

---

## Frontend Fixes

### P1 #22 -- Add Error Boundaries
**Files changed:**
- `client/src/components/ui/ErrorBoundary.tsx` (NEW)
- `client/src/App.tsx`

**Problem:** No React Error Boundaries anywhere in the application. A rendering error in any component crashes the entire app with a blank white screen and no recovery option.

**Fix:**
- Created a reusable `ErrorBoundary` class component with `componentDidCatch` that logs errors and displays a user-friendly fallback with a "Reload" button.
- Wrapped the `<Routes>` element in `App.tsx` with `<ErrorBoundary>` so any page-level rendering error is caught and shows the recovery UI instead of a white screen.

---

### P1 #23 -- Fix 401 interceptor (full page reload)
**Files changed:**
- `client/src/services/api.ts`
- `client/src/context/AuthContext.tsx`

**Problem:** The Axios 401 interceptor used `window.location.href = '/login'`, which triggers a full browser page reload. This destroys all in-memory React state, React Query cache, and socket connections.

**Fix:**
- Replaced `window.location.href = '/login'` with `window.dispatchEvent(new Event('roc:auth-expired'))`.
- The interceptor still clears `localStorage` token.
- Added a `roc:auth-expired` event listener in `AuthContext` that sets user/token to null, which triggers React Router's `<Navigate to="/login">` in `ProtectedRoute` naturally -- no full page reload.

---

### P1 #24 -- Fix hardcoded tax rates
**Files changed:**
- `client/src/pages/MarketPage.tsx`
- `client/src/pages/TownPage.tsx`
- `server/src/routes/towns.ts`

**Problem:** MarketPage hardcoded `TAX_RATE = 0.1` and TownPage displayed "Tax Rate: 10%" as a literal string. The actual rate is set by mayors and can be 0-25%.

**Fix:**
- **Server:** Added `treasury: { select: { taxRate: true } }` to the `/api/towns/:id` endpoint include. Added `taxRate` field to the response JSON.
- **TownPage:** Added `taxRate` to the `Town` interface. Replaced hardcoded "10%" with `Math.round((town.taxRate ?? 0.10) * 100) + '%'`.
- **MarketPage:** Removed the `TAX_RATE = 0.1` constant. Added queries for `/characters/me` and `/towns/:id` to fetch the actual tax rate from the player's current town. All `TAX_RATE` references replaced with the fetched `taxRate` variable. Updated the "Tax (10%)" display label to show the actual percentage.

---

### P1 #25 -- Fix GovernancePage hardcoded kingdomId
**Files changed:**
- `client/src/pages/GovernancePage.tsx`
- `server/src/routes/governance.ts`

**Problem:** The laws query and propose-law mutation both used `kingdomId: 'default'`, which would break for any kingdom that doesn't have that ID.

**Fix:**
- **Server:** Added `region: { select: { kingdomId: true } }` to the `/governance/town-info/:townId` endpoint. Added `kingdomId` field to the response.
- **Client:** Added `kingdomId` to `TownInfo` interface. Derived `kingdomId` from `town.kingdomId`. Updated the laws query to use actual `kingdomId` (disabled when null). Updated propose-law mutation to use actual `kingdomId`. Added fallback message when no kingdom is associated with the town.

---

### MAJ-13 -- Fix ChatPanel duplicate messages
**Files changed:**
- `client/src/components/ChatPanel.tsx`

**Problem:** When sending a chat message, ChatPanel emitted via Socket.io AND sent a REST POST simultaneously, causing duplicate messages on the server.

**Fix:**
- Removed the `api.post('/messages/send', payload).catch(() => {})` REST call.
- Chat now sends exclusively through Socket.io. The server persists messages on socket receipt.

---

### MAJ-15 / P2 #46 -- Add socket reconnection handling
**Files changed:**
- `client/src/services/socket.ts`
- `client/src/components/HUD.tsx`

**Problem:** No reconnection handling. If the server restarts or network drops, the socket silently fails with no user feedback and no automatic recovery. Rooms are not rejoined.

**Fix:**
- **socket.ts:** Added explicit reconnection config (`reconnection: true`, exponential backoff up to 10s). Added connection status tracking (`connected`/`disconnected`/`reconnecting`) with listener subscription pattern. Added `connect_error` and `reconnect_attempt` handlers. Tracks last joined town/kingdom rooms and auto-rejoins on reconnect.
- **HUD.tsx:** Added socket connection status indicator. When disconnected, shows a red dot; when reconnecting, shows an amber pulsing dot. Hidden when connected (normal state). Uses Tooltip to show status text on hover.

---

### MAJ-18 / P2 #45 -- Add 404 catch-all route
**Files changed:**
- `client/src/App.tsx`

**Problem:** No `<Route path="*">` catch-all route. Navigating to undefined paths shows a blank page.

**Fix:**
- Added `<Route path="*" element={<NotFoundPage />} />` at the end of the Routes config.
- Added `NotFoundPage` component with themed 404 message and a "Return Home" link.
- Imported `Link` from `react-router-dom` for the home link.

---

### MAJ-20 -- PvP challenge player search
**Files changed:**
- `client/src/pages/CombatPage.tsx`

**Problem:** The PvP challenge modal required typing a raw character UUID. No search-by-name functionality existed.

**Fix:**
- Replaced the raw text input in `ChallengeModal` with the existing `PlayerSearch` component (already at `components/PlayerSearch.tsx`).
- Players can now search by name, see matching results in a dropdown, and select a target.
- Selected player shows their name with an X button to clear and re-search.
- Added `PlayerSearch` import to CombatPage.

---

## Backend Logic Fixes

### P1 #27 -- Implement Human 4th profession slot
**File changed:** `server/src/routes/professions.ts`

**Problem:** The profession system hard-coded `MAX_ACTIVE_PROFESSIONS = 3` for all races. Per the design docs (CLAUDE.md and ECONOMY.md), Humans should get a 4th profession slot at Level 15.

**Fix:** Replaced the static constant with a `getMaxProfessions(race, level)` function that returns 4 if race is `HUMAN` and `level >= 15`, otherwise 3. Updated all 4 usage sites: reactivation check, new-profession check, available-professions display, and the limits response.

---

### P1 #21 -- Fix PvP leaderboard OOM risk
**File changed:** `server/src/routes/combat-pvp.ts`

**Problem:** The leaderboard endpoint loaded ALL completed PvP sessions with participants into memory using `findMany()` with no `take` limit.

**Fix:** Replaced with three targeted queries:
1. `groupBy` on `combatParticipant.characterId` where `currentHp > 0` (winners), ordered by count desc, with pagination.
2. A second `groupBy` for total match counts.
3. `findMany` for character names/levels.
Added `page`/`limit` query params (default 50, max 100). Memory now O(limit) instead of O(total_sessions).

---

### P1 #32 -- Fix caravan collect location validation
**File changed:** `server/src/routes/caravans.ts`

**Problem:** `POST /:caravanId/collect` deposited cargo without checking if the character was in the destination town.

**Fix:** Added `if (character.currentTownId !== caravan.toTownId)` check returning HTTP 400.

---

### Major-QUEST-01 / P2 #47 -- Add quest progress validation
**File changed:** `server/src/routes/quests.ts`

**Problem:** The `POST /progress` endpoint accepted arbitrary `amount` values. A player could send `amount: 999` to instantly complete objectives.

**Fix:** Added `const safeAmount = Math.min(amount, 1)` to cap increment to 1 per request.

---

### Major-B12 / Database MAJOR-12 -- Fix getCharacter non-deterministic result
**Files changed:** 30+ route files in `server/src/routes/`

**Problem:** Every `getCharacterForUser()` helper used `findFirst({ where: { userId } })` without `orderBy`, returning non-deterministic results if a user had multiple characters.

**Fix:** Added `orderBy: { createdAt: 'asc' }` to all `findFirst` calls across 30+ route files. Ensures the oldest character is always returned.

---

### P2 #51 -- Fix quest item rewards
**File changed:** `server/src/routes/quests.ts`

**Problem:** Quest completion granted XP and gold but silently ignored `rewards.items`. Item rewards were never delivered.

**Fix:** Added item reward granting inside the completion transaction: for each item name, look up `ItemTemplate` by name, create an `Item` instance, and upsert an `Inventory` record. Updated response to include `items` array.

---

### P2 #52 -- Fix flee action death penalty
**Files changed:**
- `shared/src/types/combat.ts`
- `server/src/lib/combat-engine.ts`
- `server/src/routes/combat-pve.ts`
- `server/src/socket/events.ts`

**Problem:** Successful flee set `isAlive: false`, causing `finishCombat` to apply full death penalties (gold loss, XP loss, durability damage).

**Fix:**
- Added `hasFled?: boolean` to `Combatant` interface.
- `resolveFlee()` now sets `{ isAlive: false, hasFled: true }` on success.
- `finishCombat()` checks `hasFled` first: applies minor penalty (half XP loss, 50% HP, no gold/durability loss) instead of full death penalties.
- Added `'fled'` to `emitCombatResult` result type union.

---

## Verification Summary

### P1 Items

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 14a | Nails level requirement | FIXED | Input changed to Copper Ingot (L1) |
| 14b | Silk Thread no source | FIXED | Added spin-silk-thread recipe (Tailor L25) |
| 14c | Exotic Hide no source | FIXED | Added resource definition (Hunter tier 3) |
| 14d | No Bricks recipe | NO CHANGE | Already existed as fire-bricks in mason.ts |
| 15 | War trade embargo | FIXED | Kingdom resolution via town→region→kingdom chain |
| 16 | Seed Kingdom data | FIXED | 8 kingdoms with region assignments, migration ready |
| 17 | Seed Abilities/Achievements | FIXED | Wired into main seed pipeline |
| 21 | PvP leaderboard OOM | FIXED | Replaced with groupBy aggregation + pagination |
| 22 | Error Boundaries | FIXED | Reusable component wrapping App routes |
| 23 | 401 interceptor | FIXED | Custom event replaces window.location.href |
| 24 | Hardcoded tax rates | FIXED | Fetches actual rate from server |
| 25 | GovernancePage kingdomId | FIXED | Derived from town→region→kingdom |
| 27 | Human 4th profession | FIXED | getMaxProfessions() returns 4 for HUMAN L15+ |
| 32 | Caravan collect location | FIXED | Added destination town check |
| 33 | Election lifecycle empty towns | FIXED | MIN_ELECTION_POPULATION = 3 threshold |
| 35 | Tax rate source inconsistency | ALREADY FIXED | Confirmed fixed in P0 pass |

### Additional Items Attempted

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| Major-ECON-04 | Copper weapon starter recipes | FIXED | Hardwood→Softwood Planks |
| Major-ECON-06 | Cloth Padding recipe | FIXED | Added Tailor L3 recipe |
| Major-ECON-07 | Rancher output names | FIXED | Cattle→Beef, Pigs→Pork, Chickens→Chicken |
| Major-PROF-01 | Woodworker Barrel/Furniture | FIXED | L10 and L15 recipes |
| Major-POLI-02 | Impeachment threshold | FIXED | Majority of eligible voters required |
| Major-B03 | Treaty gold timing | FIXED | Treasury check inside transaction |
| Major-B12 | getCharacter non-deterministic | FIXED | orderBy createdAt asc across 30+ files |
| Major-MAJ-13 | ChatPanel duplicate messages | FIXED | Removed REST call, socket-only |
| Major-MAJ-15 | Socket reconnection | FIXED | Auto-reconnect, status indicator, room rejoin |
| Major-MAJ-18 | 404 catch-all route | FIXED | NotFoundPage with Return Home link |
| Major-MAJ-20 | PvP player search | FIXED | PlayerSearch component replaces UUID input |
| Major-QUEST-01 | Quest progress validation | FIXED | Capped increment to 1 per request |
| P2 #40 | Missing database indexes | FIXED | 4 indexes added, migration ready |
| P2 #44 | Cascade deletes | FIXED | 5 FK relations fixed, migration ready |
| P2 #47 | Quest progress validation | FIXED | (same as Major-QUEST-01) |
| P2 #51 | Quest item rewards | FIXED | Item reward granting in completion tx |
| P2 #52 | Flee death penalty | FIXED | Minor penalty instead of full death |
| ECON-08/09 | Desert/River biomes | NO CHANGE | Already exist in BiomeType enum |

### Build Results

- **Prisma client:** Regenerated successfully (v5.22.0)
- **Shared build:** PASS
- **Server build:** PASS (tsc + tsc-alias)
- **Client build:** PASS (2,914 modules, 39 chunks)
- **Tests:** Not runnable (DB credentials rotated to placeholders in P0 pass)

### Migrations Ready (NOT applied)

1. `20260210200000_add_kingdom_region_relation` — adds kingdomId to regions table
2. `20260210200100_add_missing_indexes` — 4 performance indexes
3. `20260210200200_fix_cascade_deletes` — FK cascade behavior on 5 relations

### Conflict Check

- **schema.prisma** — Modified by seed-data-fixer (kingdom relation, indexes, cascades). No other agents touched it. Clean.
- **governance.ts** — Modified by both politics-governance-fixer (treaty gold) and frontend-fixer (kingdomId in response). Different endpoints — no conflict.
- **combat-pve.ts** — Modified by backend-logic-fixer (flee penalty, getCharacter ordering). Single agent — clean.
- **socket/events.ts** — Modified by backend-logic-fixer (fled result type). Single agent — clean.
- **All 30+ route files** — Modified by backend-logic-fixer (getCharacter ordering). Single agent — clean.

**No merge conflicts detected.**

### Remaining Known Issues (P2+)

1. Bowstring recipe missing (MINOR-ECON-11)
2. Glass Vial chain incomplete (MINOR-ECON-10)
3. Cloth Padding not yet referenced in armor recipes (Phase 2A integration)
4. Barrel not yet referenced in Brewer recipes (Phase 2A integration)
5. P1 #20 — Remote marketplace buy inventory upsert (skipped in P0, not in P1 scope)
6. P1 #30 — Docker entrypoint prisma migrate deploy (deferred)
7. PvP finishCombat transaction wrapper (only PvE was wrapped in P0)
