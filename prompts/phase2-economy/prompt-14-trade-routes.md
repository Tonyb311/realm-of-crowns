# Prompt 14 — Trade Routes, Caravans & Merchant System
# Dependencies: 12
# Teammates: 3
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

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
     destination -> shows price difference, transport cost, estimated
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
