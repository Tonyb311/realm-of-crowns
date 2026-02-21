# Economy Simulation v7 — Fix Recommendations

**Grade:** B- | **Date:** 2026-02-21 | **Sim:** 50 bots, 50 ticks, 22 professions

---

## P0 — Blocking (must fix before next sim)

### P0-1: Arcane Reagents not gatherable
**Affected:** ENCHANTER (10% positive ticks), SCRIBE (30%)
**Root cause:** Arcane Reagents are not produced by any gathering spot. HERBALIST gathers herbs, but Arcane Reagents are classified as an exotic/zone-exclusive resource with no standard gathering source.
**Fix:** Either (a) add Arcane Reagents as a rare drop from HERBALIST gathering at herb spots (e.g., 15% chance alongside normal herbs), or (b) add a new gathering spot type `arcane_grove` to Silverwood/Shadowmere towns that yields Arcane Reagents.
**Impact:** Unblocks ENCHANTER and SCRIBE supply chains entirely.

### P0-2: Soft Leather pipeline broken — 41 failed buys
**Affected:** LEATHERWORKER (42%), ARMORER (22%)
**Root cause:** HUNTER produces Animal Pelts, but TANNER converts pelts to Cured Leather/Wolf Leather/Bear Leather — not Soft Leather. Soft Leather has no recipe source.
**Fix:** Add a TANNER recipe: `Animal Pelts → Soft Leather` (L1-L3 recipe, basic processing). Or rename "Soft Leather" references in LEATHERWORKER/ARMORER recipes to "Cured Leather" if they're equivalent.
**Impact:** Unblocks 41+ failed buy attempts per 50 ticks.

### P0-3: Copper Ore undersupplied — 16 failed Copper Ingot buys
**Affected:** BLACKSMITH (76%), ARMORER (22%), JEWELER (30%)
**Root cause:** MINER bots prioritize Iron Ore spots over Copper Ore spots. Few towns have copper mine spots.
**Fix:** (a) Add copper mine spots to more towns (at least 3-4 towns), and (b) teach bot AI to diversify — if Iron Ore is oversupplied, switch to Copper/Silver/Coal spots.
**Impact:** Fixes downstream Copper Ingot, Copper weapons, and jewelry supply.

---

## P1 — Economy Breaking

### P1-1: Cloth pipeline — 18 failed buys
**Affected:** TAILOR (12%), ARMORER (22%), LEATHERWORKER (42%)
**Root cause:** FARMER gathers grain/cotton, but Cotton yield is low and TAILOR Cloth production is too slow (only 2 TAILOR bots, both spending most ticks failing to buy inputs).
**Fix:** (a) Increase Cotton drop rate from farm spots, (b) ensure TAILOR has a simple `Cotton → Cloth` recipe at L1 (verify it exists and is seeded), (c) consider adding a 3rd TAILOR bot in next sim to increase Cloth throughput.
**Impact:** Cloth is an input for TAILOR, ARMORER, and potentially ENCHANTER/SCRIBE finished goods.

### P1-2: Fine Cloth, Silk Fabric, Glass never produced
**Affected:** Multiple downstream crafters
**Root cause:** These are tier-2 intermediates requiring tier-1 intermediates that are already undersupplied. Fine Cloth needs Cloth (undersupplied). Silk Fabric needs Silk Thread (exotic). Glass needs Sand + Smelter recipe.
**Fix:** Address P0/P1 supply issues first. Then verify recipes exist for Fine Cloth, Silk Fabric, and Glass in the seed pipeline. Add Glass smelting recipe if missing.
**Impact:** Enables higher-tier crafting for TAILOR, ENCHANTER, JEWELER, MASON.

### P1-3: Living Bark — 18 failed buys, no gatherer source
**Affected:** WOODWORKER (finished goods), ENCHANTER
**Root cause:** Living Bark is a Firbolg-exclusive Deepwood Groves resource. No standard gathering spot produces it.
**Fix:** Either (a) add Living Bark as a rare LUMBERJACK drop from forest spots (5-10% chance), or (b) replace Living Bark in non-exotic recipes with a standard wood material. Exotic resources should only appear in exotic-tier recipes.
**Impact:** Unblocks 18+ failed buys per 50 ticks.

### P1-4: Coal undersupplied — 8 failed buys
**Affected:** SMELTER (Steel Ingot recipes need Coal)
**Root cause:** Coal is a mine spot product, but MINER bots prioritize ore over coal. Coal is needed for Steel Ingot smelting.
**Fix:** (a) Add Coal as a secondary drop from mine spots (alongside ore), or (b) teach bot AI to gather Coal when SMELTER bots need it for Steel recipes, (c) ensure enough mine-type spots exist that produce Coal.
**Impact:** Steel Ingot supply → BLACKSMITH/ARMORER weapons and armor.

---

## P2 — Balance Issues

### P2-1: MASON at 40% positive ticks — borderline broken
**Affected:** MASON
**Root cause:** Stone Blocks are gathered by MINER, but Mason needs processed stone (Cut Stone, Stone Bricks) which require intermediate recipes. Bot AI may not prioritize these intermediates.
**Fix:** (a) Verify MASON intermediate recipes are in `INTERMEDIATE_RECIPE_IDS` set in engine.ts, (b) add MASON intermediates if missing (Cut Stone, Stone Bricks from Stone Blocks).
**Impact:** Moves MASON from Broken to Low/OK.

### P2-2: JEWELER at 30% — needs gemstone supply
**Affected:** JEWELER
**Root cause:** Gemstones are a rare MINER drop. Only 3 MINER bots, and they prioritize ore. Gemstone supply is structurally too low.
**Fix:** (a) Increase gemstone drop rate from mine spots, or (b) add a dedicated "gem mine" spot type to select Ironvault/mountain towns, (c) ensure JEWELER recipes accept the gemstone types that MINER actually produces (name alignment).
**Impact:** JEWELER viability from 30% → 50%+.

### P2-3: FISHERMAN at 12% positive ticks — worst gathering profession
**Affected:** FISHERMAN (3 bots)
**Root cause:** Fish products have very low demand — only COOK buys fish, and COOK preferentially uses grain/vegetables which are easier to source. FISHERMAN sells little.
**Fix:** (a) Add more fish-consuming recipes (Fish Oil for ALCHEMIST, Fishbone Meal for FARMER), (b) increase fish baseValue to make listings more profitable, (c) reduce FISHERMAN bot count to 2 in next sim.
**Impact:** Better gold balance for gathering professions.

### P2-4: Bot AI doesn't diversify gathering
**Affected:** All gathering professions
**Root cause:** Bot AI gathers the first available resource at current spot. Doesn't check what's undersupplied on market.
**Fix:** Add market-aware gathering: before gathering, check which of the spot's possible outputs has the fewest market listings, and gather that. This would naturally balance Copper Ore vs Iron Ore, Coal vs Ore, etc.
**Impact:** Addresses root cause of P0-3, P1-4, P2-2 simultaneously.

---

## P3 — Polish

### P3-1: Bot AI should pre-stock ingredients before crafting
**Current:** Bots try to buy 1 ingredient at a time, craft, repeat.
**Better:** Bots should buy ALL ingredients for a recipe before attempting to craft, reducing wasted ticks on partial ingredient sets.

### P3-2: Auction resolution rate is low (138/817 = 17%)
**Current:** 817 items listed, only 138 sold. Most listings expire.
**Fix:** Bots should price items closer to baseValue (currently may be overpricing). Add price-awareness to bot listing logic.

### P3-3: Gathering professions all show net gold drain
**Expected behavior** in a bot-only economy, but in a real game, gatherers should profit.
**Fix:** In next sim, consider giving gatherer bots slightly more starting gold (300g vs 200g) to sustain them longer, or add NPC buy orders for raw materials at baseValue.

### P3-4: Wild Herbs — 10 failed buys
**Root cause:** HERBALIST supply is split across many herb types. Specific herbs (Wild Herbs) may not be the ones HERBALIST gathers.
**Fix:** Verify HERBALIST gathering spot output includes "Wild Herbs" specifically. If it outputs "Healing Herbs" or "Common Herbs" instead, update recipe inputs to match.

---

## Fix Priority Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P0 | 3 | Missing supply sources (Arcane Reagents, Soft Leather, Copper Ore) |
| P1 | 4 | Undersupplied intermediates (Cloth, Fine Cloth, Living Bark, Coal) |
| P2 | 4 | Balance (MASON, JEWELER, FISHERMAN, bot AI gathering) |
| P3 | 4 | Polish (pre-stocking, auction rates, pricing, herb naming) |

**Recommended next steps:**
1. Fix P0-1 through P0-3 (supply sources)
2. Fix P2-4 (smart gathering AI) — this alone would fix P0-3, P1-4, and P2-2
3. Re-run sim v8 with 50 bots, 50 ticks to validate
4. Target grade: B+ or A-
