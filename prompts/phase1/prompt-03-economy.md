# Prompt 03 — Economy, Crafting & Trading
# Dependencies: 02
# Teammates: 5
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 5 teammates
to build the economy system:

1. Teammate "resource-system" — Build the resource & gathering backend:
   - Resources: Lumber, Stone, Iron, Gold Ore, Grain, Herbs, Leather,
     Gems, Arcane Dust, Fish
   - Daily work actions: player picks a job (lumberjack, miner, farmer,
     herbalist, fisherman) — takes real-time hours, yields resources
   - Yield affected by: character stats, tool quality, town bonuses,
     random D&D-style dice rolls
   - API: POST /api/work/start, GET /api/work/status, POST /api/work/collect

2. Teammate "crafting-system" — Build the crafting backend:
   - Crafting recipes stored in DB (e.g., Iron Sword = 3 Iron + 1 Leather + 1 Lumber)
   - Crafting takes real time based on complexity
   - Quality roll: d20 + skill modifier = item quality (Poor/Common/Fine/Superior/Masterwork)
   - API: GET /api/crafting/recipes, POST /api/crafting/start,
     GET /api/crafting/status, POST /api/crafting/collect
   - Crafting skill improves with use (XP per craft)

3. Teammate "market-system" — Build the player marketplace backend:
   - Players list items for sale at their price (free market)
   - API: POST /api/market/list, GET /api/market/browse (with filters),
     POST /api/market/buy, POST /api/market/cancel
   - Transaction fees (tax goes to town treasury)
   - Price history tracking for economic graphs
   - NPC merchants as price floor/ceiling safety valves

4. Teammate "inventory-frontend" — Build inventory & crafting UI in /client:
   - Inventory grid showing all items with icons, quantity, rarity color
   - Item detail popup (stats, description, sell value)
   - Crafting panel: browse recipes, see requirements, start craft
   - Work panel: choose a job, see progress, collect results
   - Equipment slots: head, chest, legs, feet, main hand, off hand,
     accessory x2

5. Teammate "market-frontend" — Build the marketplace UI in /client:
   - Browse listings with filters (item type, price range, rarity, seller)
   - Sort by price, date listed, rarity
   - Buy confirmation dialog with gold balance shown
   - "My Listings" tab to manage your own sales
   - Price history chart for popular items
   - Fantasy-themed shop/market aesthetic

After all teammates complete and report back, integrate the economy loop:
work -> gather resources -> craft items -> sell on market -> earn gold.
Verify the full economic cycle works end-to-end.
