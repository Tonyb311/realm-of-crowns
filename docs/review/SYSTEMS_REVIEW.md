# Realm of Crowns -- Systems Review

> **Reviewer:** systems-reviewer (Claude)
> **Date:** 2026-02-10
> **Scope:** Economy, Combat, Politics, Professions, Races, Quests, Travel/World Map, Housing/Construction
> **Methodology:** Cross-referenced all design docs (`docs/*.md`) against source code in `shared/src/data/`, `server/src/routes/`, `server/src/services/`, `server/src/jobs/`, and `server/src/lib/`.

---

## Severity Definitions

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | System-breaking: will cause runtime errors, data corruption, or completely block player progression |
| **MAJOR** | Significant gameplay impact: broken crafting chains, incorrect calculations, or logic flaws that degrade the experience |
| **MINOR** | Inconsistencies or cosmetic issues that cause confusion but do not block functionality |
| **SUGGESTION** | Design improvements or optimizations that would strengthen the system |

---

## Table of Contents

1. [Economy & Crafting Chains](#1-economy--crafting-chains)
2. [Professions](#2-professions)
3. [Combat](#3-combat)
4. [Politics & Governance](#4-politics--governance)
5. [Races](#5-races)
6. [Quests](#6-quests)
7. [Travel & World Map](#7-travel--world-map)
8. [Housing & Construction](#8-housing--construction)
9. [Cross-System Issues](#9-cross-system-issues)
10. [Summary Statistics](#10-summary-statistics)

---

## 1. Economy & Crafting Chains

### CRITICAL-ECON-01: Smelter Nails Recipe Requires Unreachable Iron Ingot

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\smelter.ts` (forge-nails recipe)
- **Description:** The `forge-nails` recipe requires `Iron Ingot` and is unlocked at Smelter level 5. However, the `smelt-iron` recipe that produces `Iron Ingot` requires Smelter level 10. A Smelter at level 5-9 cannot produce the input their own recipe demands. Nails are a foundational building material used in nearly every building construction recipe (see `BUILDING_REQUIREMENTS` in `shared/src/data/buildings/requirements.ts`). This blocks the entire construction chain for new players.
- **Impact:** No player can craft Nails until Smelter level 10, even though the recipe claims level 5. The entire building construction pipeline depends on Nails.

### CRITICAL-ECON-02: Tailor "Silk Cloth" Recipe Has No Source for "Silk Thread"

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\tailor.ts` (line ~28, weave-silk recipe)
- **Description:** The `weave-silk` recipe requires `Silk Thread` as input, but no gathering profession, recipe, or resource definition produces `Silk Thread`. The resource files (`shared/src/data/resources/`) contain no `Silk Thread` entry. No Rancher or Herbalist outputs it. Silk Cloth is required by high-tier Tailor armor recipes (cloth armor line in `shared/src/data/recipes/armor.ts`).
- **Impact:** Silk Cloth cannot be produced, blocking the entire cloth armor crafting chain above tier 3.

### CRITICAL-ECON-03: Tanner "Exotic Leather" Requires Undefined "Exotic Hide"

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\tanner.ts` (tan-exotic recipe)
- **Description:** The `tan-exotic` recipe requires `Exotic Hide` as input. No gathering profession or resource definition produces `Exotic Hide`. The animal products in `shared/src/data/resources/animal.ts` define `Raw Leather`, `Pelts`, `Bone`, `Antlers`, `Feathers`, and `Wool` -- but no `Exotic Hide`. Without a source, Exotic Leather cannot be crafted.
- **Impact:** Exotic Leather is needed for tier-4 Leatherworker armor. This blocks the leather armor crafting chain at higher tiers.

### MAJOR-ECON-04: Copper Weapons Require Hardwood Planks (Woodworker Level 10) at Blacksmith Level 1

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\weapons.ts` (copper tier weapons)
- **Description:** Copper-tier weapons (Copper Sword, Copper Axe, Copper Mace) are Blacksmith level 1 recipes that require `Hardwood Planks`. However, `Hardwood Planks` are produced by the Woodworker `plane-hardwood` recipe at level 10. A brand new player choosing Blacksmith cannot craft their first weapon without a Woodworker who is already level 10.
- **Impact:** New Blacksmiths cannot craft their starter weapons without help from an experienced Woodworker. While the game intentionally promotes interdependence, the very first tier of weapons should be achievable with tier-1 materials. `Softwood Planks` (Woodworker level 1) would be a more appropriate requirement for copper-tier weapons.

### MAJOR-ECON-05: Missing "Bricks" Recipe

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\shared\src\data\buildings\requirements.ts` (SMELTERY and KITCHEN both require `Bricks`)
- **Description:** Building construction requirements for SMELTERY (line 63) and KITCHEN (line 106) require `Bricks`. However, no recipe in the Mason recipes (`shared/src/data/recipes/mason.ts`) produces `Bricks`. Mason produces `Cut Stone`, `Polished Marble`, `Stone Blocks`, and `Flagstones`. The resource `Bricks` is never defined as a gatherable item either.
- **Impact:** Two building types cannot be constructed due to an unreachable material requirement.

### MAJOR-ECON-06: Missing "Cloth Padding" Recipe for Armorer

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docs\ECONOMY.md` (crafting chain documentation)
- **Description:** The ECONOMY.md design document describes `Cloth Padding` as a Tailor output needed by the Armorer for plate armor. The Tailor recipes (`shared/src/data/recipes\tailor.ts`) produce `Cloth`, `Linen`, `Woven Wool`, and `Silk Cloth` -- but no `Cloth Padding`. Armor recipes in `shared/src/data/recipes/armor.ts` reference `Cloth Padding` (or similar) as an ingredient for plate armor. Without this recipe, the Tailor-to-Armorer supply chain is broken.
- **Impact:** Plate armor crafting chain may be incomplete depending on which armor recipes reference Cloth Padding.

### MAJOR-ECON-07: Resource Type Mismatches in Animal Products

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\shared\src\data\resources\animal.ts` (lines 101-147)
- **Description:** The resource definitions include `Beef` (id: `beef`), `Pork` (id: `pork`), and `Chicken` (id: `chicken`) as Rancher outputs. The profession definition for Rancher in `shared/src/data/professions/gathering.ts` lists `outputProducts` as `['Cattle', 'Sheep', 'Pigs', 'Chickens', 'Wool', 'Milk', 'Eggs']`. The mismatch between `Cattle` vs `Beef`, `Pigs` vs `Pork`, and `Chickens` vs `Chicken` means the profession's documented outputs do not match the actual resource names. Cook recipes in `shared/src/data/recipes/consumables.ts` reference `Beef`, `Pork`, and `Chicken` -- the resource file names.
- **Impact:** If the profession output description is used anywhere in logic (not just display), it will fail to match the actual resource IDs. This is a naming consistency issue across the data layer. The Cook recipes will work correctly because they match the resource file names, but the Rancher profession definition is misleading.

### MAJOR-ECON-08: Biome "DESERT" Referenced but Not Defined in Prisma Schema

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\shared\src\data\resources\stone.ts` (sandstone biome: `['DESERT', 'COASTAL', 'BADLANDS']`), `shared/src/data/resources/herbs.ts` (spices biome: `['FOREST', 'COASTAL', 'DESERT']`), `shared/src/data/resources/fish.ts` (salt biome: `['COASTAL', 'DESERT']`)
- **Description:** Multiple resource definitions reference a `DESERT` biome, but the WORLD_MAP.md biome table does not include `DESERT` as a valid biome type. The valid biomes are: PLAINS, FOREST, MOUNTAIN, HILLS, BADLANDS, SWAMP, TUNDRA, COASTAL, UNDERWATER, FEYWILD, UNDERGROUND, VOLCANIC. No region uses the DESERT biome.
- **Impact:** Resources that are only available in DESERT biomes (e.g., Sandstone in DESERT/COASTAL/BADLANDS) will never appear in DESERT regions because no such region exists. Sandstone has a fallback to COASTAL and BADLANDS, but the DESERT reference is misleading. Spices and Salt also reference DESERT.

### MAJOR-ECON-09: Biome "RIVER" Referenced but Not Defined

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\shared\src\data\resources\grains.ts` (wheat biome: `['PLAINS', 'HILLS', 'RIVER']`), `shared/src/data/resources/fish.ts` (common fish biome: `['RIVER', 'COASTAL', 'UNDERWATER']`)
- **Description:** Multiple resources reference a `RIVER` biome that does not exist in the world biome definitions. No region uses the `RIVER` biome.
- **Impact:** Wheat has PLAINS and HILLS as fallbacks so it will still appear, but Common Fish lists RIVER first, meaning fish availability depends on COASTAL and UNDERWATER regions only. The RIVER biome should either be added or these resources should use existing biome types.

### MINOR-ECON-10: Greater Healing Potion Missing Glass Vial Ingredient

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\consumables.ts` (greater-healing-potion recipe)
- **Description:** ECONOMY.md specifies that potion crafting requires Glass Vials as containers. The Greater Healing Potion recipe does not include Glass Vial or Glass as an ingredient. The Smelter has a `smelt-glass` recipe that produces Glass, but no recipe produces Glass Vials from Glass.
- **Impact:** Potions are easier to craft than designed because they skip the glass container step. This reduces the economic dependency chain.

### MINOR-ECON-11: "Bowstring" Listed as Tailor Output but No Recipe Exists

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\shared\src\data\professions\crafting.ts` (Tailor profession definition)
- **Description:** The Tailor profession lists `Bowstring` in its `outputProducts` array, but no recipe in `shared/src/data/recipes/tailor.ts` produces Bowstring. Fletcher recipes may need this as input for bow crafting.
- **Impact:** Bowstrings cannot be crafted, potentially blocking bow/crossbow production.

### MINOR-ECON-12: Profession Count Discrepancy in Documentation

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\CLAUDE.md` (says "28 professions"), `D:\realm_of_crowns\docs\ECONOMY.md`
- **Description:** CLAUDE.md states "28 professions" but the ProfessionType union in `shared/src/data/professions/types.ts` defines 29 types (7 gathering + 15 crafting + 7 service). The actual count in the code is 29.
- **Impact:** Documentation inconsistency. No runtime impact.

### SUGGESTION-ECON-13: Recipe Inputs Use Free-Text Strings Instead of Typed References

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\types.ts`
- **Description:** Recipe inputs and outputs use `itemName: string` rather than typed references to resource IDs or item template IDs. This makes it impossible for the type system to catch mismatches between what a recipe requires and what another recipe or gathering profession produces. A typed reference system (using resource IDs or item template IDs) would catch broken chains at compile time.

---

## 2. Professions

### MAJOR-PROF-01: No Furniture or Barrel Recipes for Woodworker

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\woodworker.ts`
- **Description:** The Woodworker profession definition lists `Barrels`, `Furniture`, and `Handles` among its output products, but the recipe file only contains 4 recipes: `Softwood Planks`, `Hardwood Planks`, `Beams`, and `Exotic Planks`. Brewers need barrels for beer/wine production. The missing recipes reduce the Woodworker's economic role.
- **Impact:** Brewers cannot get barrels from Woodworkers. Woodworker has limited economic utility beyond planks and beams.

### MAJOR-PROF-02: CraftingProfession Type Includes STABLE_MASTER

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\shared\src\data\recipes\types.ts` (CraftingProfession type union)
- **Description:** The `CraftingProfession` type includes `STABLE_MASTER`, which is categorized as a Service profession in `shared/src/data/professions/service.ts`, not a Crafting profession. If recipe lookup logic uses `CraftingProfession` for validation, Stable Master recipes would incorrectly be treated as crafting recipes.
- **Impact:** Possible type confusion when validating profession-recipe relationships.

### MINOR-PROF-03: Profession Level Cap (100) vs Character Level Cap (50)

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\shared\src\data\professions\types.ts`, `D:\realm_of_crowns\docs\QUESTS.md`
- **Description:** Profession levels go up to 100 (6 tiers from Apprentice to Grandmaster) while character level caps at 50. These are independent progression systems, which is fine, but it means a level 50 character can still be progressing their professions. The interaction between these two caps is not documented in any design doc.
- **Impact:** Confusion potential for developers working on progression systems.

---

## 3. Combat

### MINOR-COMB-01: Flee Action Marks Character as Dead Instead of Fled

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\lib\combat-engine.ts` (line ~806, resolveFlee function)
- **Description:** When a flee attempt succeeds, the combatant's `isAlive` is set to `false`. This is a simplification to remove them from combat, but it means the combat end check (`checkCombatEnd`) will count a fled character as dead. In PvE, the `finishCombat` function in `combat-pve.ts` (line ~530) checks `playerCombatant.isAlive` to determine if the player won or lost. A successful flee would be treated as a defeat, applying death penalties (gold loss, XP loss, durability damage).
- **Impact:** Players who successfully flee PvE combat will be penalized as if they died, which contradicts the purpose of fleeing.

### MINOR-COMB-02: Monster AI is Simple Random Target Selection

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\combat-pve.ts` (lines 492-514, resolveMonsterTurn)
- **Description:** Monster AI always chooses a random living enemy and performs a basic attack. There is no consideration of monster type (e.g., a spellcaster monster should cast spells), low-HP tactical behavior, or status effects. The combat engine supports spell casting, item usage, and status effects, but the monster AI never uses them.
- **Impact:** Combat encounters are less interesting and strategic than the combat engine supports.

### MINOR-COMB-03: PvE Combat Requires Character to Be in a Town

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\combat-pve.ts` (line 176)
- **Description:** The PvE combat start endpoint requires `character.currentTown` to be set. With the node-based travel system in `travel.ts`, characters can be on wilderness nodes (not in towns). Characters traveling between towns on wilderness nodes cannot initiate combat, even though wilderness is where random encounters should occur.
- **Impact:** The PvE combat system is incompatible with the node-based travel system for wilderness encounters.

### SUGGESTION-COMB-04: Combat Engine is Comprehensive and Well-Structured

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\server\src\lib\combat-engine.ts`
- **Description:** The combat engine is a pure-function design with 2000+ lines implementing D&D-style mechanics correctly: d20 attack rolls, AC calculation with status effects, spell save DCs, 16 status effects, racial ability integration, Psion abilities (18 abilities across 3 specializations), death prevention mechanics, and psychic damage resistance. This is a well-designed system. The Psion combat integration is particularly thorough with proper save mechanics, AoE handling, and domination control.

---

## 4. Politics & Governance

### MAJOR-POLI-01: Election Lifecycle Creates Infinite Elections for Empty Towns

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\jobs\election-lifecycle.ts` (autoCreateElections function)
- **Description:** The `autoCreateElections` function runs every 5 minutes and creates a new election for every town that does not have an active election AND does not have a mayor. When the voting phase ends with zero votes (no candidates), `transitionVotingToCompleted` sets the election as completed with no winner. The town still has no mayor, so the next cycle creates another election. This creates an infinite loop of empty elections for unpopulated towns.
- **Impact:** With 68 seeded towns and potentially few players, most towns will generate endless empty elections, creating database bloat and unnecessary processing.

### MAJOR-POLI-02: Impeachment Uses Simple Vote Count, Not Majority of Eligible Voters

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\jobs\election-lifecycle.ts` (resolveExpiredImpeachments function), `D:\realm_of_crowns\docs\POLITICS.md` (line 58)
- **Description:** POLITICS.md states: "If a majority of voters support removal, the mayor is removed." The actual implementation in `resolveExpiredImpeachments` uses `votesFor > votesAgainst` (simple plurality of actual votes cast). This means 2 votes for and 1 vote against would impeach a mayor, even if the town has 100 residents. The design intent was a majority of eligible voters, not a majority of actual votes.
- **Impact:** Mayors can be impeached by a tiny minority of residents. Three players could coordinate to impeach a mayor in a town of hundreds.

### MAJOR-POLI-03: Law Voting Has No Duplicate Vote Prevention

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\routes\governance.ts` (lines 112-181, vote-law endpoint)
- **Description:** The `vote-law` endpoint increments `votesFor` or `votesAgainst` on the Law record but does not check if the character has already voted on this law. There is no `LawVote` tracking table or unique constraint check. A council member can vote multiple times on the same law, inflating the vote count.
- **Impact:** A single council member can spam the vote endpoint to auto-activate any law by reaching the 3-vote threshold alone.

### MINOR-POLI-04: Peace Proposal Immediately Changes War Status Without Acceptance

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\governance.ts` (lines 523-588, propose-peace endpoint)
- **Description:** The `propose-peace` endpoint changes the war status to `peace_proposed` immediately upon a single ruler's request. There is no acceptance step by the opposing ruler. The code comment says "For simplicity, peace proposal immediately ends the war" but the status is `peace_proposed` not `ended`, so it is unclear whether the `getWarStatus` function (which checks for `status: 'active'`) would still consider the war active.
- **Impact:** A losing kingdom ruler can unilaterally end a war by proposing peace, bypassing the opposing ruler's consent. The trade embargo check in `law-effects.ts` looks for `status: 'active'` so trade would resume immediately after a unilateral peace proposal.

### MINOR-POLI-05: Town-Info Endpoint Returns taxRate from Wrong Source

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\governance.ts` (line 285)
- **Description:** The `town-info` endpoint returns `taxRate: town.treasury?.taxRate ?? 0.10`, reading from `TownTreasury.taxRate`. However, tax rates are set via `TownPolicy.taxRate` (in the `set-tax` endpoint, line 205). The `TownTreasury` model may have a stale or default `taxRate` field that is never updated by the `set-tax` endpoint.
- **Impact:** Players and mayors may see an incorrect tax rate on the town info page.

---

## 5. Races

### MINOR-RACE-01: Race Registry Has 20 Races as Documented

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\shared\src\data\races\index.ts`
- **Description:** The RaceRegistry correctly registers all 20 races with proper keys matching the documented lore names (harthfolk, nethkin, drakonid, nightborne, mosskin, forgeborn, elementari). All lookup functions (`getRace`, `getRacesByTier`, `getSubRaces`, `getStatModifiers`, `getAllRaces`) are correctly implemented. This is well-structured.

### MINOR-RACE-02: Building Route Uses Uppercase Race Names, Registry Uses Lowercase

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\buildings.ts` (lines 94-108, getRacialConstructionBonus), `D:\realm_of_crowns\shared\src\data\races\index.ts`
- **Description:** The `getRacialConstructionBonus` function in buildings.ts uses uppercase race names (`'HUMAN'`, `'DWARF'`, `'GNOME'`, `'FORGEBORN'`, `'FIRBOLG'`) while the race registry uses lowercase keys (`'human'`, `'dwarf'`, `'gnome'`, `'forgeborn'`). The character's `race` field stored in the database determines which format is used. If the database stores lowercase (matching the registry), the construction bonuses will never match.
- **Impact:** Racial construction bonuses (Dwarf -15% time for stone buildings, Gnome -10% materials for workshops, Forgeborn -20% build time, Firbolg -25% materials for wood buildings) may never apply if the case does not match.

### MINOR-RACE-03: Crafting Route Uses Correct getRacialCraftSpeedBonus but Building Route Has Hardcoded Races

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\buildings.ts` vs `D:\realm_of_crowns\server\src\routes\crafting.ts`
- **Description:** The crafting route imports racial bonus functions from a shared service (`getRacialCraftSpeedBonus`, `getRacialCraftQualityBonus`, `getRacialMaterialReduction`) which likely handle case-insensitive matching. The buildings route has a hardcoded `switch` statement on race strings. This inconsistency means one system handles race name casing correctly while the other may not.
- **Impact:** Inconsistent racial bonus application between crafting and construction.

---

## 6. Quests

### MAJOR-QUEST-01: Quest Progress Endpoint Allows Manual Progress Reporting Without Validation

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\routes\quests.ts` (lines 340-387, POST /progress)
- **Description:** The quest progress endpoint accepts arbitrary `objectiveIndex` and `amount` values and updates quest progress without validating that the character actually performed the action. A player can call `POST /api/quests/progress` with `{ questId, objectiveIndex: 0, amount: 100 }` to instantly complete any quest objective. There is no server-side validation that a KILL objective was triggered by an actual monster kill, or that a GATHER objective corresponds to actual resource gathering.
- **Impact:** Players can cheat quest completion by directly calling the progress API. The `onMonsterKill` trigger in `combat-pve.ts` (line 599) is a separate trigger mechanism, but the manual endpoint circumvents it entirely.

### MINOR-QUEST-02: Quest Reward Items Not Granted

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\quests.ts` (lines 425-445, complete quest transaction)
- **Description:** The quest completion handler grants `rewards.xp` and `rewards.gold` but ignores `rewards.items` (line 425: `rewards` is typed as `{ xp: number; gold: number; items?: string[] }`). If a quest has item rewards, they are silently not granted.
- **Impact:** Quests with item rewards will not deliver those items to the player.

### MINOR-QUEST-03: Available Quests Uses O(n) Array.find for Quest Lookup

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\shared\src\data\quests\index.ts`
- **Description:** The `getQuestById` function in the quest index uses `ALL_QUESTS.find()` which is O(n) per lookup. For a small quest list this is fine, but as the quest database grows, a Map-based lookup would be more efficient.
- **Impact:** Performance concern at scale only. Currently negligible.

---

## 7. Travel & World Map

### MAJOR-TRVL-01: Travel System Uses Raw SQL Queries for Non-Schema Fields

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\routes\travel.ts` (lines 78-93, position endpoint)
- **Description:** The travel route uses `prisma.$queryRaw` for multiple queries because the `current_node_id` field on characters and the `nodes`/`node_connections` tables appear to not be part of the standard Prisma schema (the comment on line 77 says "field being added by schema teammate"). This means these queries bypass Prisma's type safety, and if the schema migration has not been applied, these queries will fail at runtime with SQL errors.
- **Impact:** If the nodes schema has not been migrated, all travel endpoints will fail. The extensive use of raw SQL also makes these queries fragile and harder to maintain.

### MINOR-TRVL-02: Node-Map Endpoint Uses RegionBorder Table Not Defined in Design Docs

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\travel.ts` (lines 326-337)
- **Description:** The `node-map` endpoint queries `prisma.regionBorder.findMany()` to find adjacent regions. This `RegionBorder` table is not mentioned in any design document. If it was not seeded, the map will only show the current region's nodes.
- **Impact:** Map rendering may be limited to single regions if adjacency data is missing.

### MINOR-TRVL-03: No Actual Travel/Move Endpoint

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\travel.ts`
- **Description:** The travel routes include position checking, connected node listing, route finding, border checking, and combat presets. However, there is no endpoint to actually move a character from one node to another (e.g., `POST /api/travel/move`). The comment at the top of the file says "Travel is now resolved during the daily tick, not in real-time" but there is no endpoint to queue a travel action for the daily tick.
- **Impact:** Characters cannot actually move between locations using the travel API. The daily tick resolver would need an endpoint to receive movement commands.

### SUGGESTION-TRVL-04: World Data Only in Database Seeds, Not in Shared Data Layer

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\database\seeds\world.ts` (referenced in WORLD_MAP.md)
- **Description:** All 21 regions and 68 towns exist only as database seed data. Unlike races, professions, and recipes which are defined as TypeScript constants in `shared/src/data/`, the world geography has no shared data representation. This means the client cannot access region/town data without an API call, and there is no compile-time verification of world data correctness.

---

## 8. Housing & Construction

### MAJOR-BLDG-01: Building Condition Stored in JSON `storage` Field

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\routes\buildings.ts` (lines 799, 1138-1145, 1307-1308)
- **Description:** Building condition, rental price, and rental log are all stored inside the `storage` JSON field of the Building model (e.g., `storageData.condition`, `storageData.rentalPrice`, `storageData.rentalLog`). This mixes gameplay state (condition, economics) with inventory storage in a single untyped JSON blob. There is no schema validation on this JSON, so any code path could corrupt the data structure. The condition degradation mechanism is not implemented anywhere -- there is no cron job or event that reduces building condition over time.
- **Impact:** Building condition will always be 100 (default) because nothing degrades it. The repair system exists but has nothing to repair. The JSON blob approach makes debugging and querying building state difficult.

### MINOR-BLDG-02: No Building Condition Degradation Mechanism

- **Severity:** MINOR
- **File:** N/A (missing implementation)
- **Description:** The building detail endpoint returns `condition` and `conditionEffects` (FULL/DEGRADED/POOR/CONDEMNED/NON_FUNCTIONAL), and the repair endpoint allows restoring condition to 100. However, there is no mechanism (cron job, usage counter, time-based decay) that reduces condition from 100. The `getConditionEffects` function is implemented but can never return anything other than FULL because condition never decreases.
- **Impact:** The building maintenance economy (repair costs, Mason profession demand) is non-functional.

### MINOR-BLDG-03: Town Building Capacity Formula May Be Too Restrictive

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\server\src\routes\buildings.ts` (line 148)
- **Description:** Town building capacity is calculated as `Math.max(20, Math.floor(town.population / 100))`. For a town with population 500, the max buildings is 20 (the minimum). For a town with population 5000, the max is 50. This is quite restrictive if each player needs multiple buildings (house + workshop + storage).
- **Impact:** In populated towns, building slots may fill up quickly, preventing new players from building.

---

## 9. Cross-System Issues

### CRITICAL-XSYS-01: Trade Restriction Check Only Works Between Kingdom Rulers

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\server\src\services\law-effects.ts` (lines 165-190, getWarBetweenCharacters)
- **Description:** The `getWarBetweenCharacters` function checks for wars between kingdoms by looking up kingdoms where `rulerId` matches the buyer or seller character ID. If neither the buyer nor the seller is a kingdom ruler, the function returns `null` (no war detected), even if their respective kingdoms are at war. The function acknowledges this limitation in a comment (line 179: "For a broader approach, get the kingdoms that own the towns these characters are in -- Since there's no direct town->kingdom FK, we skip this deeper check for now").
- **Impact:** Trade embargoes during wartime only apply when one of the trading parties is literally the king/queen. All other citizens can trade freely across warring kingdoms, completely undermining the diplomatic warfare system.

### MAJOR-XSYS-02: Tax Rate Stored in Two Places (TownPolicy and TownTreasury)

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\routes\governance.ts` (set-tax writes to TownPolicy.taxRate), `D:\realm_of_crowns\server\src\routes\governance.ts` (town-info reads from TownTreasury.taxRate)
- **Description:** The `set-tax` endpoint writes tax rates to `TownPolicy.taxRate` (line 205), but the `town-info` endpoint reads from `town.treasury?.taxRate` (line 285). The `getEffectiveTaxRate` in `law-effects.ts` reads from `TownPolicy.taxRate` (correct). This means the governance info page shows one tax rate while marketplace transactions use a different one.
- **Impact:** Confusing UI: mayors set a tax rate, the marketplace applies it correctly, but the town info page shows a different (potentially default) value.

### MAJOR-XSYS-03: Crafting Route References Recipe Table in Database, Not Shared Data Constants

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\server\src\routes\crafting.ts` (line 342: `prisma.recipe.findUnique`)
- **Description:** The crafting route queries recipes from a `Recipe` database table (`prisma.recipe`), not from the shared data constants in `shared/src/data/recipes/`. The shared recipe definitions (smelter.ts, weapons.ts, armor.ts, consumables.ts, etc.) define recipes as TypeScript objects, but the crafting system uses a database table. This means the shared recipe data is documentation/reference only and the actual game recipes are whatever is seeded into the database.
- **Impact:** If the database seed does not exactly match the shared data, the game will use different recipe definitions than what the shared data files describe. Any analysis of crafting chains based on the shared data files may not reflect the actual game state.

### MINOR-XSYS-04: Character First-Load Queries Are Individually Queried Per Endpoint

- **Severity:** SUGGESTION
- **File:** Multiple route files (`elections.ts`, `governance.ts`, `quests.ts`, `buildings.ts`, `market.ts`, `crafting.ts`, `combat-pve.ts`, `travel.ts`)
- **Description:** Every endpoint independently calls `prisma.character.findFirst({ where: { userId } })` to load the character. There is no middleware or shared session context that loads the character once and makes it available to all endpoints. This means every API call triggers an additional database query.
- **Impact:** Performance: each request includes a redundant character lookup. Not critical at low traffic but becomes significant at scale.

---

## 10. Summary Statistics

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| MAJOR | 15 |
| MINOR | 15 |
| SUGGESTION | 5 |
| **Total** | **39** |

### By System

| System | CRITICAL | MAJOR | MINOR | SUGGESTION | Total |
|--------|----------|-------|-------|------------|-------|
| Economy & Crafting Chains | 3 | 4 | 3 | 1 | 11 |
| Professions | 0 | 2 | 1 | 0 | 3 |
| Combat | 0 | 0 | 3 | 1 | 4 |
| Politics & Governance | 0 | 3 | 2 | 0 | 5 |
| Races | 0 | 0 | 2 | 1 | 3 |
| Quests | 0 | 1 | 2 | 0 | 3 |
| Travel & World Map | 0 | 1 | 2 | 1 | 4 |
| Housing & Construction | 0 | 1 | 2 | 0 | 3 |
| Cross-System | 1 | 3 | 0 | 1 | 5 |

### Top Priority Items

1. **CRITICAL-ECON-01**: Nails recipe requires Iron Ingot at level 5, but Iron Ingot production requires level 10. Blocks all building construction.
2. **CRITICAL-ECON-02**: Silk Thread has no production source. Blocks cloth armor tier 3+.
3. **CRITICAL-ECON-03**: Exotic Hide has no production source. Blocks leather armor tier 4.
4. **CRITICAL-XSYS-01**: War trade embargoes only apply to kingdom rulers, not their citizens.
5. **MAJOR-POLI-01**: Infinite empty elections for unpopulated towns.
6. **MAJOR-POLI-03**: Law voting allows unlimited duplicate votes.
7. **MAJOR-ECON-04**: Copper weapons require level 10 Woodworker material at Blacksmith level 1.
8. **MAJOR-ECON-05**: Missing Bricks recipe blocks SMELTERY and KITCHEN construction.
9. **MAJOR-QUEST-01**: Quest progress can be manually inflated without actual gameplay validation.
10. **MAJOR-BLDG-01**: Building condition stored in untyped JSON blob, never degrades.
