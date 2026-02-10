# Prompt 10 — Raw Resources & Gathering System
# Dependencies: 09
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

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
     * Stone: Raw Stone, Sandstone, Marble, Silite Sand
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
