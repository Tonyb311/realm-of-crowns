# Backend Dependency Map

Reference document mapping every major entity to its dependencies. Use this when changing any entity to know what else must be updated.

**Generated:** 2026-02-20
**Schema:** ~70 models, 42 enums, 32 JSON fields

---

## Layer Architecture

```
Layer 1: YAML (Design Authority)
  docs/profession-economy-master.yaml (~4000 lines)
  ↓ items, recipes, base_values
Layer 2: TypeScript Data Files (Seed Source)
  database/seeds/recipes.ts         → ITEM_TEMPLATES, RESOURCE_ITEMS
  shared/src/data/gathering.ts      → GatheringItem objects
  shared/src/data/recipes/*.ts      → RecipeDefinition objects (17 files)
  shared/src/data/resources/*.ts    → Resource definitions
  shared/src/data/professions/*.ts  → Profession configs
  shared/src/data/races/**/*.ts     → Race definitions
  shared/src/data/skills/*.ts       → Skill trees
  ↓ seeded via database/seeds/index.ts (19 seed steps)
Layer 3: Database (Prisma + PostgreSQL)
  database/prisma/schema.prisma (2341 lines)
  ↓ queried by
Layer 4: API Routes + Services
  server/src/routes/*.ts (50 files)
  server/src/services/*.ts (30 files)
  server/src/jobs/*.ts (18 cron files)
```

---

## Chain 1: Player Data (Character Hub)

Character is the central entity with **63 relations**.

### Cascade on Delete (42 relations — healthy)
CharacterEquipment, Inventory, PlayerProfession, ProfessionXP, CharacterTravelState, TravelGroupMember, CraftingAction, GatheringAction, Building, MarketListing, Caravan, ElectionVote, ElectionCandidate, GuildMember, QuestProgress, CombatParticipant, CombatEncounterLog, Message(sender), Notification, RacialAbilityCooldown, ChangelingDisguise, ForgebornMaintenance, CharacterAppearance, PlayerAchievement, CharacterAbility, Friend(both), Petition, PetitionSignature, PartyMember, PartyInvitation(both), DailyAction, DailyReport, ServiceAction(provider), Loan(both), ServiceReputation, ImpeachmentVote, OwnedAsset, JobListing(owner), Livestock, House

### SetNull on Delete (7 relations — healthy)
Item(owner), Item(crafter), Town(mayor), Message(recipient), ServiceAction(client), JobListing(worker), Character(currentTown/homeTown)

### MISSING onDelete (14 relations — FIX NEEDED)

| Model | FK Field | Should Be | Impact |
|-------|----------|-----------|--------|
| TravelGroup | leaderId | Cascade | Orphaned travel groups |
| Party | leaderId | Cascade | Orphaned parties |
| LawVote | characterId | Cascade | Orphaned law votes |
| Law | enactedById | SetNull | Orphaned audit trail |
| CouncilMember | appointedById | SetNull | Orphaned audit trail |
| DiplomacyEvent | initiatorId | SetNull | Orphaned diplomacy events |
| DiplomacyEvent | targetId | SetNull | Orphaned diplomacy events |
| TradeTransaction | buyerId | SetNull | Orphaned trade history |
| TradeTransaction | sellerId | SetNull | Orphaned trade history |
| TradeTransaction | itemId | SetNull | Orphaned trade history |
| TradeTransaction | townId | SetNull | Orphaned trade history |
| Caravan | toTownId/fromTownId | SetNull | Orphaned caravans |
| MarketListing | townId | Cascade | Orphaned listings |
| Item | templateId | Restrict | Block template deletion |

### When You Change Character...
- [ ] Check all 63 relations cascade correctly
- [ ] Verify gold/escrowedGold consistency in transactions
- [ ] Clear Redis combat state (`combat:pve:{sessionId}`)
- [ ] Clear cached profile data

---

## Chain 2: Item Lifecycle

```
YAML item (base_value, category)
  → ITEM_TEMPLATES / RESOURCE_ITEMS in recipes.ts
  → ItemTemplate DB row (seeded by seedRecipes)
  → Item instance (created by crafting/gathering/loot)
    → Inventory (character owns it)
    → CharacterEquipment (if equipped)
    → MarketListing (if listed)
    → TradeTransaction (if sold)
    → PriceHistory (aggregated)
    → HouseStorage (if stored)
```

### Validated Cross-References
- 127 item templates (79 crafted + 48 raw materials) — ALL match YAML
- 29 gathering items — ALL have templates
- All recipe inputs/outputs reference valid template names
- Monster loot is gold-only (no item name references)
- YAML sync validator (`npm run validate:economy`) passes clean

### When You Change an Item Template...
- [ ] Update YAML first (source of truth)
- [ ] Update `ITEM_TEMPLATES` or `RESOURCE_ITEMS` in recipes.ts
- [ ] If gathering item: update `gathering.ts`
- [ ] Check all recipe inputs/outputs that reference this item name
- [ ] Run `npm run validate:economy` to verify sync
- [ ] Re-seed (`npm run db:seed` or `seed-recipes-only.ts`)

---

## Chain 3: Recipe/Crafting Chain

```
YAML recipe
  → RecipeDefinition in shared/src/data/recipes/*.ts
  → Recipe DB row (seeded by various seed functions)
  → CraftingAction (player initiates)
  → Item output (created on completion)
  → Inventory (given to player)
  → ProfessionXP (XP awarded)
```

### Recipe Seed Functions (in execution order)
1. `seedRecipes` — processing recipes (smelter, tanner, etc.)
2. `seedConsumableRecipes` — potions, food, drinks, scrolls
3. `seedArmorRecipes` — armorer, leatherworker, tailor, tanner armor
4. `seedWeaponRecipes` — blacksmith + fletcher weapons
5. `seedCraftedGoodsRecipes` — woodworker goods + blacksmith specializations
6. `seedAccessoryRecipes` — accessories, enchantments, housing, mount gear

### Recipe Files (17 in shared/src/data/recipes/)
blacksmith.ts, weapons.ts, armor.ts, consumables.ts, cook.ts, smelter.ts, tanner.ts, tailor.ts, mason.ts, woodworker.ts, ranged-weapons.ts, accessories.ts, enchantments.ts, housing.ts, mount-gear.ts, types.ts, index.ts

### JSON Integrity Risk
Recipe ingredients stored as `{itemName: string, quantity: number}[]` — NO foreign key to ItemTemplate. Renaming a template breaks recipes silently.

### When You Add/Change a Recipe...
- [ ] Update YAML first
- [ ] Add RecipeDefinition to appropriate shared/src/data/recipes/*.ts file
- [ ] Ensure output itemName matches an ITEM_TEMPLATES entry exactly
- [ ] Ensure all input itemNames have matching templates
- [ ] Wire into the correct seed function (check database/seeds/index.ts)
- [ ] Verify profession tier matches YAML

---

## Chain 4: Gathering Chain

```
ResourceType enum (11 values in schema)
  → Resource DB rows (51, seeded from shared/src/data/resources/)
  → TownResource (which towns have which resources)
  → GatheringAction (player gathers)
  → GatheringItem → ItemTemplate mapping
  → Item output → Inventory
```

### Resource Categories
ORE (7), WOOD (4), GRAIN (3), HERB (6), ANIMAL_PRODUCT (8), FISH (8), STONE (7), FIBER, REAGENT, EXOTIC = 51 total

### When You Add a Resource...
- [ ] Add to shared/src/data/resources/*.ts
- [ ] Add ResourceType enum value if new category
- [ ] Add GatheringItem to gathering.ts with baseValue
- [ ] Add RESOURCE_ITEMS template to recipes.ts
- [ ] Assign to towns via TownResource biome mapping
- [ ] Run seed to populate

---

## Chain 5: Monster/Combat Chain

```
Monster DB row (15 monsters, seeded from monsters.ts)
  → lootTable: JSON { dropChance, minQty, maxQty, gold }[]
  → CombatSession → CombatParticipant → CombatLog
  → CombatEncounterLog (denormalized result)
  → Gold awards → Character.gold
  → XP awards → Character.xp (5 * monster.level)
```

### Combat Entry Points
1. **Road encounters** (`lib/road-encounter.ts`) — auto-resolved during travel
2. **Tick combat** (`services/tick-combat-resolver.ts`) — daily tick system
3. **PvP duels** (`routes/combat-pvp.ts`) — player challenges
4. **PvE start** (`routes/combat-pve.ts`) — DISABLED (returns 400)

### Combat State
- Stored in Redis: `combat:pve:{sessionId}` / `combat:pvp:{sessionId}`
- TTL: 3600s (1 hour)
- State includes: combatants array, turn order, log, round counter

### CRITICAL BUG FOUND: Race Not Set on Combatants
- `tick-combat-resolver.ts`: Sets `.race = character.race.toLowerCase()` — WORKS
- `road-encounter.ts`: Does NOT set .race — racial abilities NEVER fire
- `combat-pvp.ts`: Does NOT set .race — racial abilities NEVER fire

### When You Change Monster/Combat...
- [ ] Monster stats are JSON — no type safety
- [ ] Loot is gold-only (no item references to break)
- [ ] Combat engine in `lib/combat-engine.ts` is pure functions
- [ ] Race must be set on Combatant for racial abilities to work

---

## Chain 6: Profession System

```
ProfessionType enum (30 values)
  → ProfessionCategory (GATHERING, CRAFTING, SERVICE)
  → shared/src/data/professions/ (configs, tiers, XP curves)
  → PlayerProfession DB rows (max 3, Humans get 4th at L15)
  → Recipe.professionType
  → GatheringAction (gathering professions)
  → CraftingAction (crafting professions)
  → ServiceAction (service professions)
  → Building.type ↔ profession workshop mapping
  → OwnedAsset.professionType
```

### Profession Count: 30
- Gathering (7): FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, HERBALIST, HUNTER
- Crafting (15): SMELTER, BLACKSMITH, ARMORER, WOODWORKER, TANNER, LEATHERWORKER, TAILOR, ALCHEMIST, ENCHANTER, COOK, BREWER, JEWELER, FLETCHER, MASON, SCRIBE
- Service (8): MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN, FARMER (note: FARMER appears in both gathering AND service in some contexts)

### Enum Validation: PASSED
All 30 ProfessionType values used in seeds, recipes, and routes.

### When You Add a Profession...
- [ ] Add to ProfessionType enum in schema.prisma
- [ ] Add profession config to shared/src/data/professions/
- [ ] Create recipe file in shared/src/data/recipes/ if crafting
- [ ] Wire seed function for its recipes
- [ ] Add profession-specific route handlers
- [ ] Run migration + re-seed

---

## Chain 7: World/Geography

```
Region (20) → Kingdom (8)
Region → Town (68) → {
  TownResource, Building, MarketListing, TradeTransaction,
  PriceHistory, GatheringAction, CombatSession, Election,
  TownTreasury, TownPolicy, NPC, Party, House, OwnedAsset
}
TravelRoute (town-to-town) → TravelNode
```

### When You Add a Town...
- [ ] Add to world seed data
- [ ] Assign to Region and Kingdom
- [ ] Set up TownResources by biome
- [ ] Create TravelRoutes to neighboring towns
- [ ] Seed TravelNodes on each route

---

## Chain 8: Economy

```
ItemTemplate.baseValue (source of truth)
  → Recipe input costs (sum of ingredient baseValues)
  → Recipe output value (should exceed input cost)
  → MarketListing.price (player-set, baseValue as reference)
  → TradeTransaction.price (actual sale)
  → PriceHistory (daily aggregation)
  → TownTreasury (tax from trades)
  → Character.gold / Character.escrowedGold
```

### Economy Validation
- `npm run validate:economy` checks YAML↔TS baseValue sync
- 0 drift, 0 missing items as of last run
- All recipe output values exceed input costs

---

## Enum Consistency Matrix

| Enum | Values | Status |
|------|--------|--------|
| ProfessionType | 30 | PASS — all used in seeds + recipes |
| ItemType | 8 (WEAPON, ARMOR, TOOL, CONSUMABLE, MATERIAL, ACCESSORY, QUEST, HOUSING) | PASS |
| ItemRarity | 6 (POOR, COMMON, FINE, SUPERIOR, MASTERWORK, LEGENDARY) | PASS |
| Race | 20 | PASS — all used in race definitions |
| BiomeType | 14 | PASS — all used in region seeds |
| ResourceType | 11 | PASS — all 51 resources use valid types |
| BuildingType | 24 | PASS — note: 21 in docs but 24 in schema (FARM, RANCH, MINE added) |
| QuestType | 7 | NOTE: RACIAL and TUTORIAL defined but not confirmed in use |
| DailyActionType | 12 | PASS |
| ActionStatus | 6 | PASS |

---

## Known Fragile Coupling Points

### 1. JSON Fields — No Referential Integrity
32 JSON fields across the schema bypass FK constraints:
- **Recipe.ingredients** — `{itemName, quantity}[]` — rename breaks silently
- **Monster.lootTable** — gold-only (safe currently)
- **Character.stats** — `{str, dex, con, int, wis, cha}`
- **ItemTemplate.stats** — weapon/armor stats, flexible schema
- **Quest.rewards** — `{xp, gold, items}`
- **DailyAction.result** — tick resolution output

### 2. Race String Propagation in Combat
Combatant.race is `string | undefined`. Must be explicitly set by each combat entry point. Currently only tick-combat-resolver sets it.

### 3. Item Name Matching
Recipes, seeds, and gathering all reference items by string name. A single character difference breaks the chain. The ITEMS constants in `shared/src/data/items/item-names.ts` mitigate this but only for recipe files that use them.

### 4. Seed Execution Order
Seeds must run in dependency order (see Chain 3). Out-of-order execution causes FK violations. The pipeline in `database/seeds/index.ts` enforces this.

---

## Issues Found & Fixes Applied

### CRITICAL: Race Not Propagated to Combat (2 locations)
- `road-encounter.ts`: Missing `.race` and `.subRace` on player combatant
- `combat-pvp.ts`: Missing `.race` and `.subRace` on combatants
- **Fix**: Set race/subRace after createCharacterCombatant() call

### CRITICAL: 14 Missing onDelete Cascades
See Chain 1 table above. These need schema migration to fix.
- **Priority 1**: TravelGroup.leaderId, Party.leaderId, LawVote.characterId (Cascade)
- **Priority 2**: Law.enactedById, CouncilMember.appointedById, DiplomacyEvent.* (SetNull)
- **Priority 3**: TradeTransaction.*, MarketListing.townId, Caravan.* (SetNull)

### MEDIUM: Hardcoded Profession/Race Strings
15+ files use string literals for profession types. All values are CORRECT but not type-safe. Documented as technical debt.

### CLEAN: Seed Pipeline
Zero broken links. All 127 templates, 200+ recipes, 51 resources validated.

### CLEAN: Import Health
All imports valid. No stale references. No dead routes.

---

## Orphaned Debug Scripts (Intentional)
These standalone seed scripts exist for targeted re-seeding but are NOT called by the main pipeline:
- `run-tanner.ts`, `run-tailor.ts`, `run-recipes.ts`
- `run-pipeline-fixes.ts`, `seed-recipes-only.ts`, `seed-supply-chain.ts`

---

## Quick Reference: "When You Change X, Update Y"

| Change | Also Update |
|--------|-------------|
| YAML item base_value | recipes.ts (ITEM_TEMPLATES or RESOURCE_ITEMS), run validate:economy |
| YAML recipe | shared/src/data/recipes/*.ts, re-seed |
| Item template name | ALL recipe inputs/outputs referencing old name, gathering.ts if applicable |
| Prisma enum value | shared/src/data/ definitions, all routes using that enum |
| Character model fields | 63 related models, Redis combat state shape, API response DTOs |
| Town deletion | MarketListing, TradeTransaction, Caravan, PriceHistory (need onDelete fix) |
| Monster stats | JSON field — no FK, just update monsters.ts and re-seed |
| Profession addition | Enum, profession config, recipe file, seed wiring, route handlers |
| Race addition | Enum, race definition, racial abilities, combat engine, passive tracker |
