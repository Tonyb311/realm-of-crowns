# v21 Simulation Results — 50 bots x 50 ticks

## Summary

| Metric | v20 | v21 | Change |
|--------|-----|-----|--------|
| Total crafts | 14 | 14 | = (but composition improved) |
| SMELTER crafts | 0 | 5 | **FIXED** |
| Total market buys | ~506 fail | 1,177 (359 instant) | Instant-fulfill working |
| Market listings | 0 explicit | 751 surplus | Surplus listing active |
| Error rate | 11.6% | 18.5% | Regression (market exhaustion) |
| Cross-player trades | 14 | 359+ instant | Major improvement |

## P0-1 Verdict: SMELTER Auction Starvation — FIXED

**Instant-fulfill works.** SMELTERs crafted 5x "Smelt Ore Chunks" (was 0 in v20), with 3 via the P5.1 post-buy combo (buy + immediate craft in same tick). This proves materials now accumulate correctly.

The 359 instant buys show the system operating exactly as designed:
- `[INSTANT] Bought 1x Iron Ore Chunks for 17g from Borin Coppervein K`
- `[INSTANT] Bought 1x Coal for 14g from Aldric Ashford H`
- P5.1 immediately fires: `P5.1 post-buy craft: Smelt Ore Chunks (2x Iron Ore + 1x Coal)`

## P0-2 Verdict: Crafted Item Listing — PARTIALLY DIAGNOSED

**`listUnwantedItems` IS executing** (visible in container logs via `[LIST-DIAG]` output) but has two issues:

### Issue 1: Equipped items blocking listings
Container logs show:
```
[LIST-DIAG] Caswyn Mercer C To-list(3): [1x Rustic Dagger, 1x Rustic Leather Vest, 1x Iron Ore Chunks]
LIST-FAIL: 1x Rustic Dagger — HTTP 400: Cannot list an equipped item
LIST-FAIL: 1x Rustic Leather Vest — HTTP 400: Cannot list an equipped item
Listed 1: 1x Iron Ore Chunks @12g
```
The `item.equipped` filter in `listUnwantedItems` line 562 (`if (item.equipped) continue`) isn't catching these items. The API returns `equipped: true` but the inventory response format may use a different field name.

### Issue 2: Recipe `getCraftableRecipes` returns ALL 328 recipes
Container logs show:
```
[LIST-DIAG] Caswyn Mercer C Prof=[TAILOR:L3] Recipes: 328 total, 40 reachable
Needed: [Iron Ore Chunks:2, Raw Stone:1, Copper Ingot:3, Softwood Planks:2, ...]
```
A TAILOR bot with L3 has 40 "reachable" recipes that include ingredients for ALL professions (Iron Ore, Copper Ingot, Softwood Planks — none are TAILOR inputs). This means `getCraftableRecipes` is returning recipes for ALL professions, not filtered to the bot's own professions. The function needs profession filtering.

**Root cause:** `getCraftableRecipes` calls `/crafting/recipes` which returns all recipes in the game, not just the bot's profession recipes. The level filter at line 545 only filters by level, not by profession. So every bot thinks it "needs" ingredients for every recipe in the game.

### Impact
Because every item appears as "needed" by some reachable recipe, nothing is classified as "unwanted" — the function only lists surplus (qty > maxNeeded) which rarely happens for crafted outputs that appear in qty=1.

## Craft Breakdown (14 total)

| Recipe | Count | Notes |
|--------|-------|-------|
| Smelt Ore Chunks | 5 | 3 via P5.1, 2 via P3 |
| Antidote | 3 | ALCHEMIST |
| Make Apple Sauce | 2 | COOK |
| Craft Wooden Shield | 1 | WOODWORKER |
| Cut Stone | 2 | MASON (1 via P5.1) |
| Mill Flour | 1 | COOK |

## Instant Buy Breakdown (359 total)

| Item | Buys |
|------|------|
| Hardwood (various qty) | 175+ |
| Coal | 58 |
| Iron Ore Chunks | 31 |
| Arcane Reagents | 21 |
| Wood Logs | 19 |
| Wild Herbs | 25 |
| Softwood | 11 |
| Raw Fish | 9 |
| Apples | 8 |
| Stone Blocks | 4 |
| Animal Pelts | 4 |
| Clay | 2 |

**Hardwood hoarding**: Rurik Steelforge Q (36 buys) and Celeborn Thornveil C (36 buys) consumed disproportionate Hardwood supply. They're WOODWORKER-adjacent bots buying material but lacking other inputs to complete recipes.

## Supply Listing Breakdown (751 total, all from `listSurplusOnMarket`)

| Item | Listings |
|------|----------|
| Iron Ore Chunks | 337 |
| Apples | 167 |
| Stone Blocks | 116 |
| Softwood | 76 |
| Wood Logs | 55 |

## Gold Economy

| Metric | Value |
|--------|-------|
| Total gold | 2,756g |
| Average | 55g |
| Min | 0g |
| Max | 170g |
| Bots with 0g | 2 |
| Bots with <10g | 5 |

Starting gold was 100g per bot (5,000g total). Economy lost 2,244g to market fees/taxes — healthy gold sink.

## Next Steps for v22

### P0: Fix `getCraftableRecipes` profession filtering
The function returns ALL 328 game recipes, not filtered by bot profession. This makes `listUnwantedItems` think every item is "needed" and never lists crafted outputs as unwanted. Fix: filter recipes to bot's own professions in `getCraftableRecipes` or in `listUnwantedItems`.

### P1: Skip equipped items in listing
`listUnwantedItems` tries to list equipped Rustic Dagger/Leather Vest, which fails with HTTP 400. The `item.equipped` check at line 562 isn't matching the API response format. Need to check the actual field name returned by `/characters/me/inventory`.

### P2: Cap Hardwood buying per bot
Individual bots buying 36+ Hardwood in 50 ticks is wasteful when they can't use it all. Consider a per-item buy cap or inventory threshold check.

## Success Criteria Assessment

| Criteria | Target | v21 Result | Status |
|----------|--------|------------|--------|
| SMELTER crafts > 0 | 5+ | **5** | PASS |
| Iron Ingots on market | Yes | No (consumed immediately) | PARTIAL |
| Crafted goods listed | Yes | No (recipe filter bug) | FAIL |
| Total crafts > 40 | 40+ | 14 | FAIL |
| Cross-player trades | 14+ | 359+ | PASS |
