# Claude Code Agent Team Prompts — Economy & Professions
## Phase 2: The Player-Driven Economy

> Run these AFTER Phase 1 (Prompts 0–8) is stable and working.

---

## 🔧 PROMPT 9 — Profession System Foundation

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates 
to build the profession system foundation.

Context: This game has a player-driven economy where NO item appears 
from nothing. Every finished item traces back through a chain of player 
professions. A single character can have a maximum of 3 professions 
(mix of Gathering, Crafting, and Service). Professions level from 1–100 
with tiers: Apprentice (1–10), Journeyman (11–25), Craftsman (26–50), 
Expert (51–75), Master (76–90), Grandmaster (91–100).

1. Teammate "profession-schema" — Extend the Prisma schema with:
   - PlayerProfession model (playerId, professionType, level, currentXP, 
     xpToNextLevel, tier, specialization)
   - Profession enum: FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER, 
     HERBALIST, HUNTER, SMELTER, BLACKSMITH, ARMORER, WOODWORKER, TANNER, 
     LEATHERWORKER, TAILOR, ALCHEMIST, ENCHANTER, COOK, BREWER, JEWELER, 
     FLETCHER, MASON, SCRIBE, MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, 
     BANKER, COURIER
   - ProfessionCategory enum: GATHERING, CRAFTING, SERVICE
   - ProfessionTier enum: APPRENTICE, JOURNEYMAN, CRAFTSMAN, EXPERT, 
     MASTER, GRANDMASTER
   - Validation: max 3 professions per character, with rules 
     (max 2 gathering, max 2 crafting, max 1 service)
   - ProfessionXPLog (track XP gains over time for analytics)
   - Run migration

2. Teammate "profession-backend" — Build profession management APIs:
   - POST /api/professions/learn — learn a new profession (validates 
     the 3-profession limit and category rules)
   - POST /api/professions/abandon — abandon a profession (confirms 
     with warning about losing all progress)
   - GET /api/professions/mine — get all my professions with levels
   - GET /api/professions/info/:type — get profession details, 
     description, tier unlocks, what it produces
   - Profession XP system: addProfessionXP(playerId, professionType, amount)
     — handles leveling up, tier promotions, notifications
   - Tier unlock checker: what recipes/abilities are available at current level
   - XP curve: each level requires progressively more XP 
     (level 1→2: 100xp, level 99→100: 50,000xp)

3. Teammate "profession-selection-frontend" — Build the profession 
   selection UI in /client:
   - Profession browser page: show all 28 professions organized by 
     category (Gathering, Crafting, Service)
   - Each profession card shows: icon, name, description, what it 
     produces, what it needs as input, which town types are best for it
   - "Learn Profession" flow with validation (shows remaining slots, 
     warns about limits)
   - My Professions dashboard: current professions, level bars, 
     tier badges, XP progress

4. Teammate "profession-data" — Create the profession data files 
   in /shared:
   - Full profession definitions (name, category, description, 
     stat that affects quality, related professions)
   - XP curve table (level → XP required)
   - Tier definitions (level range, title, perks description)
   - Profession compatibility rules (which combos are allowed)
   - Profession-to-town-type affinity map (miners do best in 
     mountain towns, farmers in plains, etc.)
   - Export as typed constants so both frontend and backend use 
     the same data

After all teammates complete and report back, verify that a player 
can browse professions, learn up to 3, see their profession dashboard, 
and that the XP system correctly levels them up through tiers. 
Summarize what was built and flag any design decisions that need my input.
```

---

## 🔧 PROMPT 10 — Raw Resources & Gathering System

```
You are the team lead. Use agent teams. Spawn a team of 4 teammates 
to build the resource gathering system.

Context: Gathering professions (Farmer, Rancher, Fisherman, Lumberjack, 
Miner, Herbalist, Hunter) produce raw materials. Gathering takes real 
time, yields are affected by profession level + character stats + tool 
quality + town type + a d20 dice roll. Resources are region-specific: 
mountain towns have ore, forest towns have wood, plains have grain, 
coastal towns have fish, swamps have rare herbs.

1. Teammate "resource-schema" — Extend the Prisma schema with:
   - Resource model (id, name, type, rarity, description, icon, 
     baseGatherTime, baseYield, regionTypes where found)
   - ResourceType enum: ORE, WOOD, GRAIN, HERB, FISH, HIDE, STONE, 
     FIBER, ANIMAL_PRODUCT, REAGENT
   - Rarity enum: COMMON, UNCOMMON, RARE, EXOTIC, LEGENDARY
   - GatheringAction model (playerId, professionType, resourceId, 
     townId, startedAt, completesAt, toolId, status)
   - TownResource model (townId, resourceId, abundance level 1-5, 
     depletion tracker)
   - Seed all resources into the database:
     * Ores: Copper, Iron, Silver, Gold, Mithril, Adamantine, Coal, Gems
     * Woods: Softwood, Hardwood, Exotic Wood, Bark, Sap, Resin
     * Grains: Wheat, Corn, Vegetables, Cotton, Flax, Hops, Apples, Grapes
     * Herbs: Common Herbs, Medicinal Herbs, Rare Herbs, Mushrooms, 
       Flowers, Arcane Reagents, Spices
     * Animal: Raw Leather, Pelts, Bone, Antlers, Feathers, Wool, 
       Milk, Eggs, Wild Game Meat, Beef, Pork, Chicken
     * Fish: Common Fish, Rare Fish, Shellfish, Pearls, Seaweed, Salt
     * Stone: Raw Stone, Sandstone, Marble,Ite Sand
   - Assign resources to town types with abundance levels
   - Run migration and seed

2. Teammate "gathering-engine" — Build the gathering action backend:
   - POST /api/gathering/start — start a gathering action
     * Validates: player is in correct town type, has correct profession, 
       has required tool (or bare hands for penalty), isn't already 
       doing another action
     * Calculates gather time: baseTime / (1 + professionLevel/100) 
       / toolSpeedBonus / townAbundanceBonus
     * Sets completesAt timestamp
   - GET /api/gathering/status — check current gathering progress
   - POST /api/gathering/collect — collect results when timer is done
     * Yield calculation: baseYield * (1 + professionLevel/50) 
       * toolYieldBonus * townAbundanceBonus
     * Quality/rarity roll: d20 + professionLevel/5 
       (higher rolls = chance of rarer resources)
     * Grant profession XP based on resource rarity and quantity
     * Add resources to player inventory
   - POST /api/gathering/cancel — cancel in progress (lose time, 
     get partial yield)
   - Cron job / scheduler that auto-completes gathering actions 
     and notifies players
   - Resource depletion: heavy gathering in one area temporarily 
     reduces yields (regenerates over real time)

3. Teammate "gathering-frontend" — Build the gathering UI in /client:
   - Gathering panel accessible from town view
   - Shows available resources in current town with abundance indicators
   - "Start Gathering" button per resource with estimated time and yield
   - Progress bar with real-time countdown
   - "Collect" button when done with results popup showing:
     * Resources gained (with rarity colors)
     * Quality roll result (show the d20 animation)
     * XP earned
     * Profession level progress
   - Tool slot display (shows equipped gathering tool and its bonus)
   - Resource history log (what you've gathered recently)

4. Teammate "tool-system" — Build the gathering tools system:
   - Tool items in the database (Pickaxe for mining, Axe for lumber, 
     Hoe for farming, Rod for fishing, Sickle for herbs, Knife for hunting)
   - Tool tiers: Crude (no profession needed to use), Copper, Iron, 
     Steel, Mithril, Adamantine
   - Each tier gives: speed bonus + yield bonus + durability
   - Tools have durability — degrade with each use, break when depleted
   - Tools are CRAFTED by Blacksmiths (this creates demand for 
     blacksmith profession!)
   - API: equip tool to gathering profession slot, track durability, 
     break notification
   - Seed basic Crude tools that new players start with (low stats, 
     break fast)

After all teammates complete and report back, verify the full gathering 
loop: player with a mining profession goes to a mountain town, equips 
a pickaxe, starts mining iron ore, waits for the timer, collects ore + 
XP, and the tool loses durability. Flag any balance concerns.
```

---

## 🔧 PROMPT 11 — Smelting, Processing & Refined Materials

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates 
to build the intermediate processing layer — the professions that turn 
raw materials into usable crafting components.

Context: Raw resources can't be used directly for most crafting. 
Ore must be smelted into ingots, raw leather must be tanned, raw 
cotton must be spun into cloth, stone must be cut, wood must be 
processed into planks. These "processing" professions are the critical 
middle link in every crafting chain.

1. Teammate "processing-recipes" — Create the full processing recipe 
   database in /shared and /database:
   
   SMELTER recipes:
   - Copper Ore x3 + Coal x1 → Copper Ingot x2 (Lvl 1)
   - Iron Ore x3 + Coal x2 → Iron Ingot x2 (Lvl 10)
   - Iron Ingot x2 + Coal x3 → Steel Ingot x1 (Lvl 30)
   - Silver Ore x3 + Coal x1 → Silver Ingot x2 (Lvl 20)
   - Gold Ore x3 + Coal x1 → Gold Ingot x1 (Lvl 25)
   - Mithril Ore x5 + Coal x3 → Mithril Ingot x1 (Lvl 55)
   - Adamantine Ore x8 + Coal x5 + Arcane Reagent x1 → Adamantine Ingot x1 (Lvl 75)
   - Sand x5 → Glass x3 (Lvl 15)
   - Iron Ingot x1 → Nails x50 (Lvl 5)
   
   TANNER recipes:
   - Raw Leather x2 + Bark x1 → Soft Leather x1 (Lvl 1)
   - Raw Leather x3 + Bark x2 + Salt x1 → Hard Leather x1 (Lvl 15)
   - Pelts x2 + Bark x1 → Fur Leather x1 (Lvl 10)
   - Exotic Hide x2 + Rare Herbs x1 → Exotic Leather x1 (Lvl 50)
   - Dragon Hide x1 + Arcane Reagent x3 → Dragonscale Leather x1 (Lvl 80)
   
   TAILOR (spinning/weaving only — clothing is separate):
   - Cotton x3 → Cloth x2 (Lvl 1)
   - Flax x3 → Linen x2 (Lvl 5)
   - Wool x2 → Woven Wool x1 (Lvl 10)
   - Silk Thread x3 → Silk Cloth x1 (Lvl 40)
   
   MASON recipes:
   - Raw Stone x3 → Cut Stone x2 (Lvl 1)
   - Raw Stone x5 + Coal x1 → Bricks x4 (Lvl 10)
   - Marble x3 → Polished Marble x1 (Lvl 30)
   - Sandstone x3 → Cut Sandstone x2 (Lvl 5)
   
   WOODWORKER (processing only — furniture/items separate):
   - Softwood Log x2 → Softwood Planks x4 (Lvl 1)
   - Hardwood Log x2 → Hardwood Planks x3 (Lvl 10)
   - Hardwood Log x3 → Beams x2 (Lvl 15)
   - Exotic Wood Log x2 → Exotic Planks x2 (Lvl 40)
   
   Store all recipes as structured data (JSON/TypeScript constants) with:
   - recipeId, professionRequired, levelRequired, inputs[], outputs[], 
     craftTime, xpReward, tier

2. Teammate "crafting-engine-v2" — Rebuild the crafting backend to 
   support the full recipe chain system:
   - Recipe registry: load all recipes from the data files
   - POST /api/crafting/start — validate player has profession + level, 
     has all input materials in inventory, has access to correct 
     workshop building (or can do basic recipes without one)
   - Workshop bonus: crafting in the correct building type gives 
     speed + quality bonuses based on building level
   - Quality roll on every craft: d20 + (professionLevel / 5) + 
     toolBonus + workshopBonus → determines output quality
   - Quality affects the PRODUCT: a "Fine" Iron Ingot is worth more 
     and gives bonuses when used in further crafting
   - Cascading quality: using Fine ingredients in a recipe gives 
     a bonus to the final quality roll
   - Batch crafting: craft multiple of the same recipe in queue
   - POST /api/crafting/queue — add multiple crafts to queue
   - GET /api/crafting/queue — see current queue and progress
   - Grant profession XP per craft, scaled by recipe difficulty

3. Teammate "crafting-frontend-v2" — Rebuild the crafting UI to 
   support the full system:
   - Crafting panel shows: current profession, level, available recipes 
     (greyed out if too low level or missing materials)
   - Recipe browser with search/filter by: profession, tier, output type
   - Recipe detail view: shows full ingredient chain visually 
     ("To make Steel Plate Armor you need Steel Ingots which need 
     Iron Ingots which need Iron Ore + Coal")
   - "What can I make?" button — scans inventory and highlights 
     craftable recipes
   - Craft queue display with progress bars for each item
   - Quality result popup with dice animation
   - Workshop indicator: "Crafting in Level 3 Smithy (+40% speed, 
     +3 quality bonus)" or "No workshop available (slower, no bonus)"
   - Batch crafting UI: "Craft 5x Iron Ingots" with total time estimate

After all teammates complete and report back, verify the processing 
chain works: a Miner's ore can be bought by a Smelter, smelted into 
ingots, and those ingots appear in the Smelter's inventory ready to 
be sold to a Blacksmith. Test cascading quality bonuses.
```

---

## 🔧 PROMPT 12 — Finished Goods Crafting (Weapons, Armor, Gear)

```
You are the team lead. Use agent teams. Spawn a team of 5 teammates 
to build all finished goods crafting — the final products players 
actually use.

Context: These are the END of the crafting chain. Every item here 
requires refined materials from processing professions. Items have 
quality tiers (Poor through Legendary), durability that degrades 
with use, and stats that matter in combat. Item demand is constant 
because items break.

1. Teammate "weapon-recipes" — Create the full weapon recipe database:
   - BLACKSMITH weapons by tier (Apprentice through Grandmaster):
     Daggers, Swords, Longswords, Greatswords, Axes, Battleaxes, 
     Maces, Warhammers, Halberds, Spears
   - Material tiers: Copper → Iron → Steel → Mithril → Adamantine
   - Each weapon has: base damage, damage type (slashing/piercing/bludgeoning),
     speed, required STR/DEX, durability, level requirement to equip
   - Higher material tier = better base stats
   - Quality multiplier on all stats (Poor 0.7x through Legendary 1.5x)
   - WOODWORKER/FLETCHER ranged weapons:
     Shortbow, Longbow, Crossbow, Elven Longbow
     + Arrows, Bolts, Throwing Knives (consumable ammo)
   - Store as typed recipe data with full ingredient lists and craft times

2. Teammate "armor-recipes" — Create the full armor recipe database:
   - ARMORER metal armor:
     Helmets, Chestplates, Gauntlets, Greaves, Shields
     Material tiers: Copper → Iron → Steel → Mithril → Adamantine
   - LEATHERWORKER leather armor:
     Leather Cap, Leather Vest, Leather Gloves, Leather Boots, 
     Leather Bracers
     Material tiers: Soft Leather → Hard Leather → Studded → Exotic → Dragonscale
   - TAILOR cloth armor (robes for mages):
     Cloth Hood, Robes, Cloth Gloves, Cloth Boots, Cloak
     Material tiers: Cotton Cloth → Linen → Woven Wool → Silk → Enchanted Silk
   - Equipment slots: Head, Chest, Hands, Legs, Feet, Main Hand, 
     Off Hand, Accessory 1, Accessory 2, Back (cloak)
   - Each armor piece has: AC bonus, stat bonuses, weight, durability, 
     class restrictions, level requirement
   - Quality multiplier on AC and durability

3. Teammate "consumable-recipes" — Create all consumable item recipes:
   - ALCHEMIST potions:
     Minor/Standard/Greater/Supreme Healing Potion
     Minor/Standard/Greater/Supreme Mana Potion
     Potion of Strength, Dexterity, Intelligence, etc. (buff potions)
     Antidotes, Cure Poison, Cure Disease
     Poisons (applied to weapons — rogues love these)
     Fire Bomb, Smoke Bomb, Flash Bomb
   - COOK food (buff items):
     Bread, Rations (basic, cheap)
     Roast Meat, Fish Stew, Vegetable Soup (moderate buffs)
     Hearty Feast, Royal Banquet (party-wide buffs, expensive)
     Each food gives a specific buff for a real-time duration
   - BREWER drinks:
     Ale (cheap, small buff), Wine (moderate), Mead (good), 
     Spirits (strong but penalties), Elven Wine (rare, excellent buffs)
   - SCRIBE scrolls:
     Spell Scrolls (single-use spells anyone can use)
     Maps (reveal hidden areas), Identification Scrolls
   - All consumables: single use, stack in inventory, have shelf life

4. Teammate "accessory-recipes" — Create accessory and housing recipes:
   - JEWELER accessories:
     Rings (stat bonuses), Necklaces (resistances), 
     Circlets (mana bonuses), Brooches (special effects)
     Material tiers: Copper + Quartz → Silver + Amethyst → 
     Gold + Ruby → Mithril + Diamond
   - ENCHANTER enchantments (applied to existing finished items):
     Flaming (fire damage), Frost (cold damage), 
     Lightning, Poisoned, Holy, Shadow
     Fortified (extra durability), Swift (attack speed), 
     Warding (magic resistance)
     Requires: finished item + arcane reagents + specific gem
   - WOODWORKER/MASON housing items:
     Furniture: Bed, Table, Chairs, Storage Chest, Bookshelf, 
     Weapon Rack, Armor Stand, Alchemy Table
     Building materials: Planks, Beams, Cut Stone, Bricks, 
     Nails, Glass Panes
   - STABLE MASTER mount gear:
     Saddle, Horseshoes, Horse Armor, Saddlebags

5. Teammate "item-system-v2" — Rebuild the item system backend to 
   support all of this:
   - Item model extended: quality tier, durability (current/max), 
     crafted_by (player ID — maker's mark!), crafted_at, enchantments, 
     stat bonuses calculated from base + material + quality + enchantment
   - Equipment system: equip/unequip items to character slots, 
     validate class restrictions, calculate total stat bonuses
   - Durability system: items lose 1 durability per use (combat action, 
     gathering action), break at 0, can be repaired by appropriate 
     crafter for materials + gold
   - Repair API: POST /api/items/repair (crafter profession required, 
     costs materials based on item)
   - Item comparison: GET /api/items/compare?equipped=X&candidate=Y
   - Full item stat calculation engine that accounts for: 
     base stats + material tier + quality multiplier + enchantments + 
     set bonuses (if we add item sets later)

After all teammates complete and report back, verify the FULL chain: 
Miner mines ore → Smelter makes ingots → Blacksmith forges a sword → 
the sword has proper stats based on material and quality → a player 
equips it → the sword affects their combat stats → using it in combat 
reduces durability → at 0 durability it breaks. Test with at least 
3 different crafting chains.
```

---

## 🔧 PROMPT 13 — Player Housing & Buildings

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates 
to build the player housing and building construction system.

Context: Players can own buildings in towns — houses for personal 
storage and decoration, and workshops/shops for their professions. 
Buildings require construction materials crafted by players (Masons, 
Woodworkers, etc.). Building ownership ties into the economy and 
politics — mayors control building permits, and buildings generate 
value for the town.

1. Teammate "housing-backend" — Build the housing and building system:
   - Building ownership model: player can own buildings in towns
   - Building types: House (Small/Medium/Large), Workshop (per profession), 
     Shop (marketplace stall), Warehouse, Inn/Tavern
   - Construction system: 
     * Player requests building permit from town (auto-approved or 
       mayor-approved based on town law)
     * Player must supply all construction materials (planks, stone, 
       nails, etc.) — deposited into a construction site
     * Construction takes real time (days) based on building size
     * Building levels 1–5, each upgrade requires more materials + time
   - House features:
     * Personal storage (scales with house size)
     * Display room (show off trophies, rare items)
     * Rest bonus (logging out in your house gives rested XP buff)
     * Roommate system (share house with guild members)
   - Workshop features:
     * Required for advanced crafting recipes
     * Workshop level affects crafting speed and quality bonus
     * Can be rented to other players for income
   - Shop features:
     * Persistent marketplace stall (items for sale even when offline)
     * Customizable shop name and display
   - API: full CRUD for buildings, construction start/progress/complete,
     upgrade, rent/lease system, storage management

2. Teammate "housing-frontend" — Build the housing UI:
   - "My Properties" page showing all owned buildings
   - Building interior view for houses (furniture placement grid)
   - Construction progress panel with material requirements checklist 
     and timer
   - Workshop view showing crafting stations and bonuses
   - Shop management view for listing items
   - Town building directory (see all buildings, who owns what)
   - "Build New" flow: select lot → choose building type → 
     see material requirements → deposit materials → start construction

3. Teammate "building-economy" — Wire buildings into the economy:
   - Property tax: building owners pay monthly tax to town treasury 
     (set by mayor)
   - Rent system: workshop/shop owners can charge other players rent 
     to use their facilities
   - Building maintenance: buildings slowly degrade and require 
     materials to maintain (creates ongoing demand for construction materials)
   - Town capacity: each town has limited building lots (creates 
     real estate scarcity and value)
   - Building destruction: buildings can be damaged in wars, 
     require repair materials
   - Economic reports for mayors: which buildings generate most tax, 
     occupancy rates, construction activity

After all teammates complete and report back, verify: a player can 
request a building permit, supply construction materials, wait for 
construction, enter their new house, store items, and a workshop owner 
can rent their smithy to a Blacksmith who then gets crafting bonuses 
from it. Verify property taxes flow to town treasury.
```

---

## 🔧 PROMPT 14 — Trade Routes, Caravans & Merchant System

```
You are the team lead. Use agent teams. Spawn a team of 3 teammates 
to build the inter-town trade and merchant system.

Context: Resources are geographically scarce — mountain towns have ore 
but no grain, plains have grain but no ore. This creates natural trade 
routes. The Merchant profession specializes in buying low in one town 
and selling high in another, using trade caravans to move goods.

1. Teammate "caravan-system" — Build the trade caravan backend:
   - Caravan model: owner, origin town, destination town, cargo manifest, 
     departure time, arrival time, escort slots, status
   - Starting a caravan: 
     * Player loads cargo from inventory (weight/volume limits based 
       on caravan size)
     * Caravan sizes: Handcart (cheap, small, slow), Wagon (medium), 
       Large Wagon (expensive, large, moderate), Trade Convoy (very 
       expensive, huge capacity, requires Merchant Lvl 50+)
     * Travel time based on distance between towns (same as player travel)
   - Caravan risks:
     * Random bandit ambush events during transit (PvE combat)
     * Enemy kingdom players can raid caravans during wartime (PvP)
     * Escorts: hire NPC guards (costs gold) or recruit player mercenaries
     * Cargo insurance (optional, costs % of cargo value, pays out on loss)
   - Arrival: cargo deposited in destination town, player can sell 
     there on marketplace
   - API: POST /api/caravans/create, POST /api/caravans/load-cargo, 
     POST /api/caravans/depart, GET /api/caravans/status, 
     POST /api/caravans/hire-escort, event system for ambushes

2. Teammate "trade-analytics" — Build economic analytics and price system:
   - Price history tracking per item per town (every marketplace sale 
     recorded with timestamp, price, quantity)
   - Price comparison across towns: GET /api/market/prices/:itemId 
     (shows current average price in every town)
   - Trade route profitability calculator: input item + origin + 
     destination → shows price difference, transport cost, estimated 
     profit margin
   - Town economic dashboard: most traded items, total trade volume, 
     price trends (charts)
   - Supply/demand indicators per town: if an item is being bought 
     faster than supplied, show "High Demand" badge
   - Merchant profession XP: earned from successful trades, scaled 
     by profit margin and distance
   - Weekly/monthly economic reports for mayors

3. Teammate "trade-frontend" — Build the trade and merchant UI:
   - Trade route map overlay: show trade routes between towns with 
     profit indicators (green = profitable, red = not worth it)
   - Caravan management page: create caravan, load cargo, track 
     in-transit caravans, view history
   - Price comparison tool: select an item, see prices across all 
     towns in a table/chart
   - "Best Trades" panel: AI-calculated suggestions for most 
     profitable trade routes right now
   - Merchant dashboard: total trades, profit history, trade volume, 
     reputation as a trader
   - Ambush event screen (if caravan is attacked): combat or pay 
     ransom or flee (lose some cargo)

After all teammates complete and report back, verify the full trade 
loop: a Merchant buys cheap Iron Ingots in a mountain town, loads 
them into a caravan, sends it to a plains town where Iron is scarce, 
sells at a markup, and earns profit + Merchant XP. Test the ambush 
event system. Verify price tracking records all transactions.
```

---

## 📋 PROMPT SUMMARY — Economy Phase

| Prompt | System | Teammates | Depends On |
|--------|--------|-----------|-----------|
| 9 | Profession Foundation | 4 | Phase 1 complete |
| 10 | Gathering & Raw Resources | 4 | Prompt 9 |
| 11 | Processing & Refining | 3 | Prompt 10 |
| 12 | Finished Goods (Weapons, Armor, etc.) | 5 | Prompt 11 |
| 13 | Housing & Buildings | 3 | Prompt 11 |
| 14 | Trade Routes & Merchants | 3 | Prompt 10 + 12 |

**Total new teammates across economy phase: 22**

### Run Order:
```
9 → 10 → 11 → 12 (and 13 can run parallel with 12) → 14
```
