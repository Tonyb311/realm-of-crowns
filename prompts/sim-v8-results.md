# Simulation v8 Results

## Parameters
- **Bots:** 50
- **Ticks:** 50
- **Starting Gold:** 100g each (5,000g total)
- **Level Distribution:** Diverse (L1-L7, rotating: 8 at L1, 7 each at L2-L7)
- **Profession Assignment:** Auto-assigned at L3+ (35 bots started with professions, all 50 had one by tick 50)
- **Run Date:** 2026-02-21
- **Total Duration:** ~50 minutes (server-side, ~60s per tick)

## Executive Summary

**The combat loot pipeline is completely broken.** Zero items dropped from 76 combat victories across 50 ticks. Gold and XP are awarded correctly, but `processItemDrops()` is either not being called or is silently failing. Additionally, **no ENCHANTER or SCRIBE** was assigned by the diverse seeding — making it impossible to test the Arcane Reagent crafting chain even if loot had dropped. P6 combat travel registered zero uses, which is expected since no bot had recipes requiring combat-exclusive materials.

**Verdict: ENCHANTER/SCRIBE crafting pipeline is untestable in current state. Two critical failures must be fixed first.**

---

## Combat & Loot Pipeline

### A. Combat Encounter Validation

| Metric | Value |
|--------|-------|
| Total road encounters | 120 |
| Combat victories | 76 (63.3%) |
| Combat losses | 44 (36.7%) |
| Ticks with encounters | 46 of 50 (92%) |
| Encounters per tick (avg) | 2.4 |
| Encounter rate per arrival | ~32.7% (120 encounters / 367 arrivals) |

**Monsters encountered (14 of 21 total):**

| Monster | Encounters | Wins | Losses | Win Rate |
|---------|-----------|------|--------|----------|
| Bandit | 56 | 38 | 18 | 67.9% |
| Wolf | 12 | 12 | 0 | 100% |
| Arcane Elemental (L7) | 11 | 2 | 9 | 18.2% |
| Slime | 8 | 8 | 0 | 100% |
| Orc Warrior | 7 | 0 | 7 | 0% |
| Skeleton Warrior | 6 | 4 | 2 | 66.7% |
| Bog Wraith (L4, arcane) | 5 | 5 | 0 | 100% |
| Goblin | 3 | 3 | 0 | 100% |
| Troll | 3 | 0 | 3 | 0% |
| Mana Wisp (L3, arcane) | 2 | 2 | 0 | 100% |
| Giant Spider | 2 | 0 | 2 | 0% |
| Shadow Wraith (L9, arcane) | 2 | 1 | 1 | 50% |
| Dire Wolf | 2 | 0 | 2 | 0% |
| Giant Rat | 1 | 1 | 0 | 100% |

**Arcane monster encounters: 20 total** (Mana Wisp 2, Bog Wraith 5, Arcane Elemental 11, Shadow Wraith 2). 10 victories against arcane monsters. **Zero Arcane Reagent drops from any of them.**

**Not encountered (7 monsters):** Void Stalker, Elder Fey Guardian, Mountain Lion, Cave Bear, Rock Golem, Frost Wyvern, Fire Salamander. These likely live in biomes bots didn't travel through frequently enough.

**CRITICAL FINDING: Zero loot drops from ALL 76 victories.** The `lootDropped` field is empty string on every single combat record. Gold (2,106g total) and XP (1,845 total) were awarded correctly — so combat resolution works, but the item drop pipeline is broken. Either `processItemDrops()` is not being called after road encounter victories, or it's silently failing.

### B. P6 Combat Travel Validation

| Metric | Value |
|--------|-------|
| P6 combat travel uses | **0** |
| P7 general travel uses | 1,139 |
| Travel arrivals | 367 |

**P6 never triggered.** Root cause: The P6 priority checks if a crafting bot needs items in the `MONSTER_DROP_ITEMS` map (currently only "Arcane Reagents"). Since no ENCHANTER or SCRIBE was assigned, no bot had recipes requiring Arcane Reagents, so P6 never activated.

This is not a code bug in P6 itself — it's a precondition failure (no qualifying bots). Cannot validate P6 logic without ENCHANTER/SCRIBE bots in the simulation.

### C. Arcane Reagent Supply Chain

**Pipeline status: BROKEN at step 1.**

```
Step 1: Combat drop → inventory          ❌ BROKEN (zero drops from all victories)
Step 2: Inventory → crafting recipe       ⚠️ UNTESTABLE (no drops to test with)
Step 3: ENCHANTER/SCRIBE craft            ⚠️ UNTESTABLE (no ENCHANTER/SCRIBE bots exist)
```

**Where the chain breaks:**
1. **Primary failure:** `processItemDrops()` is not awarding items after road encounter victories. Gold and XP work, but items don't drop. This affects ALL monsters, not just arcane ones.
2. **Secondary failure:** Diverse seeding doesn't assign ENCHANTER or SCRIBE professions. The seeding distributes across 18 professions but skips ENCHANTER, SCRIBE, FLETCHER, MASON, and all 7 service professions.
3. **P6 combat travel** cannot activate without ENCHANTER/SCRIBE bots needing arcane materials.

---

## Economy Overview

### D. General Economy Health

| Metric | Value |
|--------|-------|
| Starting gold | 5,000g (50 × 100g) |
| Total gold earned | 8,003g |
| Total gold spent | 2,878g |
| Net gold change | +5,125g |
| Ending gold in circulation | 10,110g |
| Gold inflation rate | 102.2% (doubled over 50 ticks) |
| Gold from combat | 2,106g (26.3% of earnings) |
| XP from combat | 1,845 |

**Gold sources:** Gathering sales (primary), combat victories (secondary), market trading.

### Gathering Activity

| Metric | Value |
|--------|-------|
| Total gather actions | 1,092 |
| Gather per tick (avg) | 21.8 |
| Gather success rate | ~100% (no gather errors reported) |

Gathering is the primary economic activity. All 50 bots gather regularly, even those with crafting professions.

### Market Activity

| Metric | Value |
|--------|-------|
| Market listings | 834 |
| Market buy attempts | 666 |
| Market auctions won | 146 |
| MarketBuy errors | 222 (33.3% failure rate) |

All 222 errors are "nothing available on market" — bots trying to buy materials that haven't been listed yet. This is expected early-game behavior and not a bug.

### Crafting Activity

| Metric | Value |
|--------|-------|
| Total crafts | 32 |
| Crafts per tick (avg) | 0.64 |
| Crafting success rate | 100% (all 32 succeeded) |

**Crafting by profession:**

| Profession | Crafts | Recipes Used |
|-----------|--------|-------------|
| COOK | 14 | Bake Bread (9), Pan-Seared Trout (5) |
| BREWER | 7 | Apple Cider (7) |
| WOODWORKER | 4 | Saw Rough Planks (4) |
| TANNER | 2 | Cure Leather (1), Tan Bear Leather (1) |
| ALCHEMIST | 1 | Antidote (1) |
| **BLACKSMITH** | **0** | — |
| **TAILOR** | **0** | — |
| **ARMORER** | **0** | — |
| **LEATHERWORKER** | **0** | — |
| **SMELTER** | **0** | — |
| **JEWELER** | **0** | — |

**6 of 12 assigned crafting professions never crafted.** These professions likely couldn't gather or buy their required inputs in 50 ticks. The supply chain is too shallow — SMELTER needs ores from MINER, BLACKSMITH needs ingots from SMELTER, ARMORER needs both ingots and leather, etc. Multi-hop chains don't complete in 50 ticks.

### Profession Distribution

| Profession | Count | Type |
|-----------|-------|------|
| FARMER | 6 | Gathering |
| MINER | 5 | Gathering |
| BREWER | 4 | Crafting |
| HERBALIST | 4 | Gathering |
| LUMBERJACK | 3 | Gathering |
| TAILOR | 3 | Crafting |
| ALCHEMIST | 3 | Crafting |
| BLACKSMITH | 3 | Crafting |
| FISHERMAN | 2 | Gathering |
| HUNTER | 2 | Gathering |
| RANCHER | 2 | Gathering |
| SMELTER | 2 | Crafting |
| WOODWORKER | 2 | Crafting |
| TANNER | 2 | Crafting |
| ARMORER | 2 | Crafting |
| LEATHERWORKER | 2 | Crafting |
| COOK | 2 | Crafting |
| JEWELER | 1 | Crafting |

**Missing from seeding:** ENCHANTER, SCRIBE, FLETCHER, MASON, MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN (11 professions never assigned).

---

## Identified Issues

### P0 — Critical (blocks core pipeline validation)

1. **P0-1: Zero item drops from combat victories.** All 76 wins award gold and XP but `lootDropped` is always empty. The `processItemDrops()` function in `loot-items.ts` is either not called during road encounter resolution, or is silently failing. This breaks the entire combat loot pipeline — not just arcane items, but ALL monster drops (Animal Pelts, Bones, etc.).

2. **P0-2: ENCHANTER and SCRIBE never assigned by diverse seeding.** The profession distribution algorithm skips these two professions entirely. Without them, the Arcane Reagent → crafting pipeline cannot be tested. 11 of 29 professions are never assigned.

### P1 — High (impacts simulation quality)

3. **P1-1: P6 combat travel untested.** Zero P6 actions due to P0-2 (no qualifying bots). The P6 code path is entirely unexercised. Need forced ENCHANTER/SCRIBE seeding to validate.

4. **P1-2: 6 crafting professions never craft.** BLACKSMITH, TAILOR, ARMORER, LEATHERWORKER, SMELTER, JEWELER all had bots assigned but zero crafts completed. Multi-hop supply chains (Miner→Smelter→Blacksmith) don't complete in 50 ticks because intermediate materials aren't available on the market.

### P2 — Medium (balance/quality issues)

5. **P2-1: Gold inflation at 102%.** Gold doubled from 5,000g to 10,110g in 50 ticks. Combat gold (2,106g) is a significant contributor. May need gold sinks or combat gold rebalancing.

6. **P2-2: Bandit dominance.** Bandits represent 46.7% of all encounters (56 of 120). Many unique monsters never appeared. Route biome diversity and travel patterns affect monster variety.

7. **P2-3: High-level monster win rate too low for bots.** Arcane Elemental (L7): 18.2% win rate. Orc Warrior: 0% win rate. Troll: 0% win rate. Bots at L3-L7 struggle against L7+ monsters, which limits arcane material farming viability.

### P3 — Low (cosmetic/minor)

8. **P3-1: MarketBuy error spam.** 222 identical "nothing on market" errors. Not a bug, but clutters logs. Could suppress after first occurrence per bot per tick.

---

## Recommendations

### Immediate (fix before re-running sim v8)

1. **Fix P0-1: Debug `processItemDrops()` in road encounters.** Trace through `road-encounter.ts` → `resolveRoadEncounter()` after combat victory. Check if `processItemDrops()` is called. If called, check if monster's `lootTableEntries` / `itemTemplateName` are being read correctly. This is the #1 blocker.

2. **Fix P0-2: Force ENCHANTER/SCRIBE in simulation seeding.** Either:
   - Add a `professionDistribution` option to force specific professions
   - Or ensure the diverse assignment algorithm includes ALL 15 crafting professions (at minimum)
   - Recommend: seed at least 2 ENCHANTER and 2 SCRIBE bots at L5+ to test Arcane Reagent crafting

### After pipeline fixes

3. **Re-run sim v8** with same parameters (50 bots, 50 ticks, diverse levels) but with forced ENCHANTER/SCRIBE representation. This time should be able to validate the full Arcane Reagent pipeline.

4. **Consider longer runs (100 ticks)** or higher starting levels to let multi-hop supply chains develop. 50 ticks is barely enough for single-hop crafting (COOK, BREWER).

5. **Add item drop logging** to the simulation history — track which items drop from which monsters, per tick, so pipeline analysis doesn't depend on the (currently broken) `lootDropped` field.

### Future balance

6. **Reduce gold from combat** or add gold sinks to control inflation.
7. **Rebalance encounter difficulty** — L7 Arcane Elemental at 18% win rate makes arcane farming impractical for the bots that need those drops.
8. **Increase monster variety** — Bandits dominating 47% of encounters limits the ecosystem.
