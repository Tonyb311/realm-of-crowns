# Jobs System Replacement Audit
Date: 2026-03-12

## 1. Schema

### jobListings Table
**File:** `database/schema/tables.ts:2162–2202`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | text | PK, NOT NULL | — |
| `assetId` | text | NOT NULL, FK → ownedAssets.id (CASCADE) | — |
| `ownerId` | text | NOT NULL, FK → characters.id (CASCADE) | — |
| `townId` | text | NOT NULL, FK → towns.id (CASCADE) | — |
| `wage` | integer | NOT NULL | — |
| `workerId` | text | NULL, FK → characters.id (CASCADE) | — |
| `jobType` | varchar(50) | NOT NULL | `'harvest_field'` |
| `status` | varchar(20) | NOT NULL | `'OPEN'` |
| `autoPosted` | boolean | NOT NULL | `false` |
| `productYield` | jsonb | NULL | — |
| `completedAt` | timestamp | NULL | — |
| `expiresAt` | integer | NULL | — (game day number) |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp | NOT NULL | $onUpdate |

**Indexes:**
| Name | Columns | Type |
|------|---------|------|
| `job_listings_asset_id_idx` | assetId | BTree |
| `job_listings_asset_id_key` | assetId | Unique (one OPEN job per asset) |
| `job_listings_owner_id_idx` | ownerId | BTree |
| `job_listings_town_id_status_idx` | townId, status | BTree |
| `job_listings_worker_id_idx` | workerId | BTree |

**Statuses:** `OPEN`, `COMPLETED`, `CANCELLED`, `EXPIRED`

**Job Types:** `harvest_field`, `plant_field`, `gather_eggs`, `milk_cows`, `shear_sheep`

### Relations
**File:** `database/schema/relations.ts:1135–1154`

```
jobListingsRelations:
  ownedAsset → ownedAssets.id (via assetId)
  character_ownerId → characters.id (via ownerId, named)
  town → towns.id (via townId)
  character_workerId → characters.id (via workerId, named)
```

Reverse relations:
- `charactersRelations` (lines 141–146): `jobListings_ownerId`, `jobListings_workerId`
- `ownedAssetsRelations` (line 1101): `jobListings: many(jobListings)`
- `townsRelations` (line 262): `jobListings: many(jobListings)`

### Related Tables
- `ownedAssets` — parent table, FK cascade. One job per asset (unique index).
- `dailyActions` — job acceptance creates a dailyAction with `actionType: 'JOB'`
- `houseStorage` — job completion puts harvest/collection items into owner's house storage
- No separate job-related tables exist beyond jobListings itself.

---

## 2. Server Routes

**File:** `server/src/routes/jobs.ts` (527 lines)
**Registration:** `server/src/routes/index.ts:49,104` — `router.use('/jobs', jobsRouter)`

### POST /api/jobs/post — Post a Job (lines 54–132)
- **Auth:** authGuard, characterGuard (no requireTown — works remotely, free action)
- **Body:** `{ assetId: string, jobType: enum, pay: number (min 1) }`
- **Validation:**
  1. Asset must exist and be owned by character
  2. Owner must have enough gold (character.gold >= pay)
  3. No existing OPEN job for this asset
  4. jobType must match asset: RANCHER assets use RANCHER_SPOT_TO_JOB mapping + pendingYield > 0; FARMER assets check cropState (READY for harvest, EMPTY for plant)
- **Gold flow:** Gold is NOT deducted at posting — only at acceptance
- **Returns:** 201 with created job

### POST /api/jobs/:id/accept — Accept + Execute Job (lines 138–416)
- **Auth:** authGuard, characterGuard, requireTown
- **Validation:**
  1. Job must be OPEN
  2. Worker must be in the same town
  3. Worker cannot be the job owner
  4. Worker must not have used daily action today
- **Profession match:** Checks worker's playerProfessions vs asset's profession. Match = 1.0x multiplier, no match = 0.5x yield & XP.
- **Transaction (lines 194–381):**
  - **Harvest:** Roll yield from ASSET_TIERS[tier] range × multiplier, create/find itemTemplate, upsert into owner's houseStorage, reset asset to EMPTY
  - **Plant:** Set cropState to GROWING with plantedAt/readyAt/witheringAt dates
  - **Rancher collection:** Apply multiplier to pendingYield, upsert into houseStorage, reset pendingYield to 0
  - **Gold transfer:** `actualPay = Math.min(job.wage, owner.gold)` — deduct from owner, add to worker
  - **Mark COMPLETED** with workerId, completedAt, productYield JSON
  - **Create dailyAction** with actionType: 'JOB', status: 'COMPLETED'
- **Post-transaction:** Award profession XP: `baseXp = 10 + (tier * 5)` × xpMultiplier
- **Returns:** success with gold, items, xp, professionMatch

### GET /api/jobs/town/:townId — Browse Open Jobs (lines 422–457)
- **Auth:** authGuard, characterGuard
- Lists all OPEN jobs for the town, ordered by wage DESC
- Includes ownedAsset and owner data
- Returns job metadata including autoPosted flag

### POST /api/jobs/:id/cancel — Cancel a Job (lines 463–489)
- **Auth:** authGuard, characterGuard
- Only owner can cancel; must be OPEN
- Sets status to CANCELLED. No gold movement (gold was never deducted).

### GET /api/jobs/mine — List Own Jobs (lines 495–525)
- **Auth:** authGuard, characterGuard
- Lists all OPEN jobs posted by current character

---

## 3. Daily Tick Integration

**File:** `server/src/jobs/daily-tick.ts`

### Step 4.8: Job Auto-Posting & Expiry (lines 900–919)
```typescript
const expired = await db.update(jobListings)
  .set({ status: 'EXPIRED' })
  .where(and(
    eq(jobListings.status, 'OPEN'),
    sql`${jobListings.expiresAt} IS NOT NULL`,
    lte(jobListings.expiresAt, currentDay),
  ));
```
- Expires OPEN jobs where `expiresAt <= currentGameDay`
- Line 918: Comment confirms "Auto-posting removed — job posting is always a deliberate player/bot choice"

### Asset Harvest Cancellation (lines 2017–2020)
When a character harvests their own asset directly in the daily tick, any OPEN job for that asset is cancelled:
```typescript
await tx.update(jobListings)
  .set({ status: 'CANCELLED' })
  .where(and(eq(jobListings.assetId, asset.id), eq(jobListings.status, 'OPEN')));
```

### Import (line 16)
`jobListings` imported from `@database/tables`

---

## 4. Client Components

### JobsBoardPage.tsx
**File:** `client/src/pages/JobsBoardPage.tsx`
**Route:** `/jobs` (App.tsx line 46 lazy import, line 115 route)

**Endpoints called:**
- `GET /api/jobs/town/{townId}` — fetch open jobs for current town
- `GET /api/game/action-status` — check if daily action already used
- `POST /api/jobs/{jobId}/accept` — accept and complete job

**UI structure:**
- Page header with town name
- Success toast with gold/items/XP rewards after acceptance
- Warning banner if daily action used
- Job list sorted by wage DESC: icon, job label, tier badge, asset name, owner, pay, profession type, accept button
- Accept button disabled if: action used, is own job, pending mutation

**Types defined inline:**
- `JobListing`: id, jobType, jobLabel, pay, assetId, assetName, assetType, assetTier, professionType, ownerName, ownerId, autoPosted, createdAt
- `JobsResponse`: { jobs: JobListing[] }
- `AcceptResult`: { success, job, reward: { gold, items, xp, professionMatch } }

### AssetPanel.tsx
**File:** `client/src/components/assets/AssetPanel.tsx`

**Job posting UI (lines 278–366):**
- Per-asset job section in the asset management panel
- `canPostJob(asset)`: checks no existing open jobs + correct cropState/pendingYield
- `getJobType(asset)`: determines job type from asset state
- Shows existing open job with wage + cancel button, or pay input form + post button
- Endpoints: `POST /api/jobs/post`, `POST /api/jobs/{id}/cancel`

**OwnedAsset type (lines 39–50):**
```typescript
jobListings: { id: string; wage: number; jobType: string; status: string; createdAt: string; }[]
```

### TownPage.tsx
- Jobs Board building tile routes to `/jobs` (around line 135)

---

## 5. Shared Config

### Assets Config
**File:** `shared/src/data/assets.ts`

**ASSET_TIERS (lines 8–19):**
| Tier | Level Req | Cost | Growth Ticks | Min Yield | Max Yield | Label |
|------|-----------|------|-------------|-----------|-----------|-------|
| 1 | 3 | 100g | 3 | 3 | 5 | Apprentice |
| 2 | 7 | 200g | 5 | 5 | 8 | Craftsman |
| 3 | 11 | 300g | 8 | 8 | 12 | Master |

**PROFESSION_ASSET_TYPES (lines 33–68):**
Maps professions → available asset spot types (FARMER, MINER, LUMBERJACK, FISHERMAN, HERBALIST, RANCHER, HUNTER).

### Gathering Config
**File:** `shared/src/data/gathering.ts`

**GATHER_SPOT_PROFESSION_MAP (lines 456–479):** Maps resourceType → profession. Used in job accept for profession match detection.

**RESOURCE_MAP:** Maps spotType → item template name for yield calculation.

### No job-specific shared config files exist.
Job types, labels, and validation are hardcoded in `server/src/routes/jobs.ts` and `client/src/components/assets/AssetPanel.tsx`.

---

## 6. Related Systems

### Recipe/Crafting System

**Schema:** `database/schema/tables.ts` — `recipes` (line 597), `craftingActions` (line 615)

**Recipe structure:**
- `professionType` (enum), `tier` (enum), `ingredients` (jsonb array), `result` (itemTemplateId)
- `craftTime` (minutes), `xpReward`, `specialization` (nullable), `levelRequired` (nullable override)

**Shared types:** `shared/src/data/recipes/types.ts` — `RecipeDefinition`, `FinishedGoodsRecipe` with outputs, stats, equipSlot, classRestrictions

**Crafting endpoints:** `server/src/routes/crafting.ts` (922 lines)
- `POST /crafting/queue` — queue 1–10 crafts (consumes ingredients, creates craftingAction)
- `POST /crafting/collect` — collect completed items (quality roll at collection)
- Workshop required for JOURNEYMAN+ tier recipes

**Daily tick crafting (lines 359–387, 2040–2248):**
- Processes LOCKED_IN CRAFT dailyActions in batches
- Consumes ingredients, performs quality roll, creates items, awards XP
- Workshop bonus: +level to quality roll, 10% speed reduction per level

### Travel System

**Schema:** `travelRoutes` (line 132), `travelNodes` (line 199), `characterTravelStates` (line 529)

**Key mechanics:**
- Routes have `nodeCount` (determines duration), `dangerLevel`, `terrain`
- Travel duration: `nodeCount - 1` ticks base, modified by `speedModifier`
- Character `travelStatus` toggles between `'idle'` and `'traveling'`
- `currentTownId` changes on arrival
- **Cannot access inventory, market, house storage, or craft while traveling**
- Items stay with character during travel (weight matters for speed)

**Endpoints:** `server/src/routes/travel.ts`
- `POST /travel/start` — begin travel on a route
- `POST /travel/abandon` — cancel ongoing travel

### House Storage

**Schema:** `houses` (line 1894), `houseStorage` (line 1920)

**Key mechanics:**
- One house per character per town (unique constraint)
- Storage is template-based: one row per (houseId, itemTemplateId) with quantity
- `storageSlots` limits unique item types (not total quantity)
- Tier upgrades increase storage slots
- **Must be in the same town + not traveling to access storage**

**Endpoints:** `server/src/routes/houses.ts`
- `POST /houses/:id/storage/deposit` — inventory → storage (FIFO consumption)
- `POST /houses/:id/storage/withdraw` — storage → inventory (creates new item)

**Programmatic access:** Jobs and assets use direct DB operations:
```typescript
// Upsert pattern used in job accept and asset harvest:
await tx.insert(houseStorage).values({ id, houseId, itemTemplateId, quantity })
  .onConflictDoUpdate({ target: [houseStorage.houseId, houseStorage.itemTemplateId],
    set: { quantity: sql`${houseStorage.quantity} + ${quantity}` } });
```

---

## 7. Workshop System

**File:** `shared/src/data/crafting-config.ts:30–47`

**PROFESSION_WORKSHOP_MAP:**
| Profession | Building Type |
|-----------|---------------|
| SMELTER | SMELTERY |
| BLACKSMITH | SMITHY |
| TANNER | TANNERY |
| TAILOR | TAILOR_SHOP |
| MASON | MASON_YARD |
| WOODWORKER | LUMBER_MILL |
| ALCHEMIST | ALCHEMY_LAB |
| ENCHANTER | ENCHANTING_TOWER |
| COOK | KITCHEN |
| BREWER | BREWERY |
| JEWELER | JEWELER_WORKSHOP |
| FLETCHER | FLETCHER_BENCH |
| LEATHERWORKER | TANNERY |
| ARMORER | SMITHY |
| SCRIBE | SCRIBE_STUDY |

**Workshop lookup** (crafting.ts:73–80): Queries buildings table for matching type in current town. Any workshop in town works — no ownership/rental check enforced in current crafting code.

**Workshop bonuses:**
- Speed: `workshopLevel × 10%` reduction to craft time
- Quality: `+workshopLevel` to quality roll
- Required for JOURNEYMAN+ tier recipes (APPRENTICE can craft anywhere)

**Rental fields on buildings table:** `rentable` (boolean), `rentalPrice` (integer per tick), `maxWorkers` (capacity). These exist in schema but rental enforcement is not implemented in the crafting route — any player can use any workshop in their current town regardless of ownership.

---

## 8. Complete File List

| File | Lines | Usage |
|------|-------|-------|
| `database/schema/tables.ts` | 2162–2202 | `jobListings` table definition |
| `database/schema/relations.ts` | 141–146, 262, 1101, 1135–1154 | Relations (characters, towns, ownedAssets, jobListings) |
| `database/drizzle-migrations/meta/0000_snapshot.json` | — | Initial migration snapshot includes jobListings |
| `database/drizzle-migrations/relations.ts` | — | Compiled relations (generated) |
| `database/drizzle-migrations/schema.ts` | — | Compiled schema (generated) |
| `server/src/routes/jobs.ts` | 1–527 | All 5 API endpoints |
| `server/src/routes/index.ts` | 49, 104 | Import + registration |
| `server/src/routes/assets.ts` | 9, 54, 59, 62, 382–384, 514–516 | Import, /mine includes jobListings, harvest/sell cancels OPEN jobs |
| `server/src/routes/relocate.ts` | 9, 248–250 | Import, batch-delete jobs when assets deleted on relocation |
| `server/src/jobs/daily-tick.ts` | 16, 900–919, 2017–2020 | Import, step 4.8 expiration, asset harvest cancellation |
| `server/src/jobs/__tests__/daily-tick.test.ts` | 45 | Mock: `jobListings: { findMany: jest.fn() }` |
| `server/src/services/character-deletion.ts` | 16 | Import (cascade via FK handles deletion) |
| `server/src/lib/simulation/actions.ts` | 1960–1979 | Bot P5.5: auto-post jobs for assets |
| `server/src/lib/simulation/types.ts` | 253, 258–268 | `ApiAsset.jobListings`, `ApiJob` interface |
| `client/src/pages/JobsBoardPage.tsx` | 1–287 | Full jobs board UI |
| `client/src/components/assets/AssetPanel.tsx` | 39–50, 86–107, 278–366 | Asset job posting/cancellation UI |
| `client/src/App.tsx` | 46, 115 | Lazy import + route registration |
| `docs/backend-dependency-map.md` | — | Documentation reference |

---

## 9. Migration Considerations

### Current Data
- **Probably zero rows in production** — jobs are ephemeral (created, completed or expired within hours/days). No persistent data that needs migration.

### Foreign Keys Pointing TO jobListings
- **None.** No other table references jobListings.id. The table is a leaf node in the FK graph.

### What Would Break If We Dropped jobListings
1. **Server routes:** `server/src/routes/jobs.ts` — all 5 endpoints
2. **Server routes:** `server/src/routes/assets.ts` — 3 references (mine listing, harvest cancel, sell cancel)
3. **Server routes:** `server/src/routes/relocate.ts` — asset deletion cleanup
4. **Daily tick:** `server/src/jobs/daily-tick.ts` — step 4.8 expiration + harvest cancel
5. **Bot simulation:** `server/src/lib/simulation/actions.ts` — P5.5 auto-posting
6. **Bot types:** `server/src/lib/simulation/types.ts` — ApiAsset.jobListings, ApiJob
7. **Character deletion:** `server/src/services/character-deletion.ts` — import
8. **Tests:** `server/src/jobs/__tests__/daily-tick.test.ts` — mock
9. **Client page:** `client/src/pages/JobsBoardPage.tsx` — entire page
10. **Client component:** `client/src/components/assets/AssetPanel.tsx` — job section
11. **Client route:** `client/src/App.tsx` — /jobs route + lazy import
12. **Schema/relations:** `database/schema/tables.ts` + `relations.ts` — table + 6 relation entries
13. **Route index:** `server/src/routes/index.ts` — import + registration

### Safe Replacement Strategy
- The table has no inbound FKs — it can be dropped and replaced without cascading schema changes.
- The `ownedAssets` relation to jobListings would need updating (remove `many(jobListings)` from ownedAssetsRelations).
- The `characters` and `towns` relation entries would need cleanup.
- The `assets.ts` route's inclusion of `jobListings` in the /mine query response would need updating.
- The bot simulation P5.5 priority step references the jobs API and would need rewriting for the new job model.
- The daily tick step 4.8 would need replacement/removal.
- The TownPage building tile for "Jobs Board" routes to `/jobs` — would need updating if route changes.
