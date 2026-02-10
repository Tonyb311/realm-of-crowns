# Prompt 11 — Smelting, Processing & Refined Materials
# Dependencies: 10
# Teammates: 3
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

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
   - Copper Ore x3 + Coal x1 -> Copper Ingot x2 (Lvl 1)
   - Iron Ore x3 + Coal x2 -> Iron Ingot x2 (Lvl 10)
   - Iron Ingot x2 + Coal x3 -> Steel Ingot x1 (Lvl 30)
   - Silver Ore x3 + Coal x1 -> Silver Ingot x2 (Lvl 20)
   - Gold Ore x3 + Coal x1 -> Gold Ingot x1 (Lvl 25)
   - Mithril Ore x5 + Coal x3 -> Mithril Ingot x1 (Lvl 55)
   - Adamantine Ore x8 + Coal x5 + Arcane Reagent x1 -> Adamantine Ingot x1 (Lvl 75)
   - Sand x5 -> Glass x3 (Lvl 15)
   - Iron Ingot x1 -> Nails x50 (Lvl 5)

   TANNER recipes:
   - Raw Leather x2 + Bark x1 -> Soft Leather x1 (Lvl 1)
   - Raw Leather x3 + Bark x2 + Salt x1 -> Hard Leather x1 (Lvl 15)
   - Pelts x2 + Bark x1 -> Fur Leather x1 (Lvl 10)
   - Exotic Hide x2 + Rare Herbs x1 -> Exotic Leather x1 (Lvl 50)
   - Dragon Hide x1 + Arcane Reagent x3 -> Dragonscale Leather x1 (Lvl 80)

   TAILOR (spinning/weaving only — clothing is separate):
   - Cotton x3 -> Cloth x2 (Lvl 1)
   - Flax x3 -> Linen x2 (Lvl 5)
   - Wool x2 -> Woven Wool x1 (Lvl 10)
   - Silk Thread x3 -> Silk Cloth x1 (Lvl 40)

   MASON recipes:
   - Raw Stone x3 -> Cut Stone x2 (Lvl 1)
   - Raw Stone x5 + Coal x1 -> Bricks x4 (Lvl 10)
   - Marble x3 -> Polished Marble x1 (Lvl 30)
   - Sandstone x3 -> Cut Sandstone x2 (Lvl 5)

   WOODWORKER (processing only — furniture/items separate):
   - Softwood Log x2 -> Softwood Planks x4 (Lvl 1)
   - Hardwood Log x2 -> Hardwood Planks x3 (Lvl 10)
   - Hardwood Log x3 -> Beams x2 (Lvl 15)
   - Exotic Wood Log x2 -> Exotic Planks x2 (Lvl 40)

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
     toolBonus + workshopBonus -> determines output quality
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
