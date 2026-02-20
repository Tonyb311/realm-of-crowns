# Encounter Loot Table Design — Phase 1

**Generated:** 2026-02-20
**Basis:** `profession-economy-master.yaml`, `profession-economy-analysis-v3.md`, `tax-system-design.md`, existing monster seeds
**Scope:** Phase 1 — basic crafting materials and small gold only. No rare/legendary items. No boss loot.

---

## Locked Design Decisions

| Decision | Rule |
|----------|------|
| Quantities vs. gatherers | Encounter drops < dedicated gatherer output |
| Drop guarantee | Percentage-chance, not guaranteed |
| Distribution | Random party member. Solo gets everything. |
| Gold from animals | **Never.** Animals don't carry gold. |
| Gold from humanoids | Small amounts (pocket change, not a career) |
| Thematic consistency | Every drop must make in-world sense |
| Quality tier | Common only. Quality tiers added in Phase 2. |

---

## Part 1: Monster Roster (Phase 1)

### Selection Criteria

Phase 1 uses **10 encounter types** built from the existing 15-monster seed roster, plus 2 new additions (Wild Boar, Brown Bear) that fill critical loot gaps for TANNER/ARMORER supply chains.

### 1A. Wildlife (6 types) — No gold drops

| Monster | Level | Biome | Region | Frequency | Pack? | Description |
|---------|------:|-------|--------|:---------:|:-----:|-------------|
| **Giant Rat** | 1 | Underground, Swamp | Vel'Naris, Shadowmere | Common | Pack (2-4) | Swarming rodents in dark places. Nuisance, not threat. |
| **Wolf** | 2 | Forest | Silverwood, Thornwilds | Common | Pack (2-3) | Territorial predators on forest roads. |
| **Wild Boar** | 3 | Plains, Forest, Hills | Heartlands, Crossroads | Common | Solo or Pair | Aggressive when startled. Charges travelers. |
| **Brown Bear** | 5 | Forest, Mountain | Silverwood, Ironvault, Mistwood | Uncommon | Solo | Powerful but avoidable. Attacks when provoked. |
| **Giant Spider** | 7 | Underground, Forest | Vel'Naris, Thornwilds | Uncommon | Solo or Pack (2-3) | Web-spinning ambush predators. |
| **Dire Wolf** | 8 | Tundra, Mountain | Frozen Reaches, Skypeak | Uncommon | Pack (2-4) | Massive wolves hunting in harsh terrain. |

### 1B. Humanoids (3 types) — Small gold drops

| Monster | Level | Biome | Region | Frequency | Pack? | Description |
|---------|------:|-------|--------|:---------:|:-----:|-------------|
| **Goblin** | 1 | Hills, Forest | Crossroads, Cogsworth | Common | Pack (3-5) | Petty thieves who ambush travelers for scraps. |
| **Bandit** | 3 | Plains, Roads | Heartlands, Suncoast, Scarred Frontier | Common | Pack (2-4) | Highway robbers targeting merchants and caravans. |
| **Orc Warrior** | 6 | Badlands, Frontier | Ashenfang, Scarred Frontier | Uncommon | Solo or Pair | Raiding parties from the wastes. |

### 1C. Undead (1 type) — Minimal gold

| Monster | Level | Biome | Region | Frequency | Pack? | Description |
|---------|------:|-------|--------|:---------:|:-----:|-------------|
| **Skeleton Warrior** | 5 | Swamp, Ruins | Ashenmoor, Shadowmere | Uncommon | Solo or Pack (2-3) | Remnants of fallen soldiers, haunting old battlefields. |

### New Additions (not in current seed data)

| Monster | Why Added |
|---------|-----------|
| **Wild Boar** (L3) | Fills the L3 wildlife gap. Drops Animal Pelts + Wild Game Meat — feeds TANNER supply chain. Common on plains roads where most early players travel. |
| **Brown Bear** (L5) | **Critical for ARMORER.** Bear Hides are the primary leather input for Mithril-tier armor. Currently only obtainable from HUNTER. Bear encounters provide a small supplemental supply. |

---

## Part 2: Loot Tables

### Key: All items map to existing YAML materials unless marked `[NEW]`.

---

### Wolf (Level 2, Common, Forest)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Animal Pelts | 25% | 1 | `Animal Pelts` | TANNER → Cured Leather | 8g |
| Wild Game Meat | 10% | 1 | `Wild Game Meat` | COOK | 5g |
| Wolf Fang | 8% | 1-2 | `[NEW]` Crafting component | JEWELER, FLETCHER (arrow tips) | 3g |

**Expected value per kill:** 0.25×8 + 0.10×5 + 0.08×4.5 = **2.86g** in materials

---

### Dire Wolf (Level 8, Uncommon, Tundra/Mountain)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Wolf Pelts | 20% | 1 | `Wolf Pelts` | TANNER → Wolf Leather | 28g |
| Animal Pelts | 30% | 1 | `Animal Pelts` | TANNER → Cured Leather | 8g |
| Wild Game Meat | 15% | 1-2 | `Wild Game Meat` | COOK | 5g |
| Wolf Fang | 12% | 1-3 | `[NEW]` | JEWELER, FLETCHER | 3g |

**Expected value per kill:** 0.20×28 + 0.30×8 + 0.15×7.5 + 0.12×6 = **10.65g** in materials

---

### Wild Boar (Level 3, Common, Plains/Forest) `[NEW MONSTER]`

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Animal Pelts | 20% | 1 | `Animal Pelts` | TANNER | 8g |
| Wild Game Meat | 20% | 1-2 | `Wild Game Meat` | COOK | 5g |
| Boar Tusk | 6% | 1 | `[NEW]` Decorative/crafting | JEWELER, SCRIBE (ink component) | 5g |

**Expected value per kill:** 0.20×8 + 0.20×7.5 + 0.06×5 = **3.40g**

---

### Brown Bear (Level 5, Uncommon, Forest/Mountain) `[NEW MONSTER]`

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Bear Hides | 10% | 1 | `Bear Hides` | TANNER → Bear Leather → ARMORER | 35g |
| Animal Pelts | 25% | 1 | `Animal Pelts` | TANNER | 8g |
| Wild Game Meat | 15% | 1-2 | `Wild Game Meat` | COOK | 5g |
| Bear Claw | 8% | 1-2 | `[NEW]` Decorative/crafting | JEWELER (necklace component) | 6g |

**Expected value per kill:** 0.10×35 + 0.25×8 + 0.15×7.5 + 0.08×9 = **7.34g**

Bear Hide drop rate intentionally low (10%) — this is a premium material. Higher drop rates would undercut HUNTER.

---

### Giant Rat (Level 1, Common, Underground/Swamp)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Animal Pelts | 10% | 1 | `Animal Pelts` (low quality) | TANNER | 8g |
| Rat Tail | 5% | 1 | `[NEW]` Alchemical ingredient | ALCHEMIST | 2g |

**Expected value per kill:** 0.10×8 + 0.05×2 = **0.90g** — intentionally low. Giant Rats are weak filler encounters.

---

### Giant Spider (Level 7, Uncommon, Underground/Forest)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Spider Silk | 25% | 1-2 | `[NEW]` Fiber material | TAILOR (spin into thread/cloth) | 6g |
| Spider Venom | 12% | 1 | `[NEW]` Alchemical ingredient | ALCHEMIST (poisons, antidotes) | 12g |

**Expected value per kill:** 0.25×9 + 0.12×12 = **3.69g**

**Spider Silk is the key TAILOR material.** It provides an alternative fiber source alongside Cotton and Wool. TAILOR can spin Spider Silk into thread at the same ratios as Cotton. This supplements TAILOR's material supply without requiring RANCHER wool.

---

### Goblin (Level 1, Common, Hills/Forest)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Gold coins | 60% | 1-3 | Gold | — | 1-3g |
| Scrap Iron | 15% | 1 | `Iron Ore` (crude equipment salvage) | SMELTER | 6g |
| Stolen Cloth | 10% | 1 | `Cotton` (stolen from travelers) | TAILOR | ~4g |
| Crude Weapon | 5% | 1 | Vendor trash (sell to NPC for 2g) | None | 2g |

**Expected gold per kill:** 0.60 × 2.0 = **1.20g** direct gold
**Expected material value:** 0.15×6 + 0.10×4 + 0.05×2 = **1.40g**

---

### Bandit (Level 3, Common, Plains/Roads)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Gold coins | 70% | 2-8 | Gold | — | 2-8g |
| Stolen Goods | 15% | 1 | Random: Animal Pelts OR Wool OR Iron Ore OR Grain OR Cotton | Various | 3-15g |
| Animal Pelts | 10% | 1 | `Animal Pelts` (wearing crude leather) | TANNER | 8g |
| Bandit's Dagger | 3% | 1 | Vendor trash (sell for 5g) | None | 5g |

**Expected gold per kill:** 0.70 × 5.0 = **3.50g** direct gold
**Stolen Goods breakdown:** 15% × (equal chance of 5 items) = 3% each of Animal Pelts (8g), Wool (15g), Iron Ore (6g), Grain (3g), Cotton (4g)

---

### Orc Warrior (Level 6, Uncommon, Badlands/Frontier)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Gold coins | 50% | 3-12 | Gold | — | 3-12g |
| Iron Ore | 20% | 1-2 | `Iron Ore` (crude weapon salvage) | SMELTER | 6g |
| Animal Pelts | 15% | 1 | `Animal Pelts` (wearing crude armor) | TANNER | 8g |
| Orc War Paint | 5% | 1 | `[NEW]` Cosmetic/alchemical | ALCHEMIST | 8g |

**Expected gold per kill:** 0.50 × 7.5 = **3.75g** direct gold
**Expected material value:** 0.20×9 + 0.15×8 + 0.05×8 = **3.40g**

---

### Skeleton Warrior (Level 5, Uncommon, Swamp/Ruins)

| Drop | Chance | Qty | Maps To | Used By | Base Value |
|------|-------:|----:|---------|---------|----------:|
| Gold coins | 40% | 1-5 | Gold (ancient coins on corpse) | — | 1-5g |
| Bone Fragments | 20% | 1-3 | `[NEW]` Crafting material | JEWELER (bone jewelry), FLETCHER (bone arrowheads) | 4g |
| Rusted Iron | 15% | 1 | `Iron Ore` (salvageable metal) | SMELTER | 6g |

**Expected gold per kill:** 0.40 × 3.0 = **1.20g**
**Expected material value:** 0.20×8 + 0.15×6 = **2.50g**

---

### New Materials Summary

| Material | Dropped By | Base Value | Primary Consumer | Existing Equivalent |
|----------|-----------|----------:|-----------------|-------------------|
| Wolf Fang | Wolf, Dire Wolf | 3g | JEWELER (fang jewelry), FLETCHER (arrow component) | None — new niche |
| Boar Tusk | Wild Boar | 5g | JEWELER (tusk carvings), SCRIBE (ink pigment) | None — new niche |
| Bear Claw | Brown Bear | 6g | JEWELER (claw necklace), decorative | None — new niche |
| Spider Silk | Giant Spider | 6g | TAILOR (spin into thread, Cotton equivalent) | Cotton (~4g) — premium fiber |
| Spider Venom | Giant Spider | 12g | ALCHEMIST (poison/antidote recipes) | Wild Herbs (5g) — higher value |
| Rat Tail | Giant Rat | 2g | ALCHEMIST (low-tier potion ingredient) | None — low value filler |
| Bone Fragments | Skeleton Warrior | 4g | JEWELER (bone jewelry), FLETCHER (bone arrows) | None — new niche |
| Orc War Paint | Orc Warrior | 8g | ALCHEMIST (cosmetic/buff ingredient) | None — rare flavor material |

**8 new materials total.** 5 of 8 serve JEWELER, ALCHEMIST, or FLETCHER — professions that were marginal in v3 analysis and benefit from new material sources. Spider Silk specifically targets TAILOR's supply chain.

---

## Part 3: Economy Impact Analysis

### Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Active players | 100 | Mid-size server |
| Encounters per player per week | 3 | ~2 travel actions/week, 1.5 encounters per travel |
| Total encounters/week (server) | 300 | 100 × 3 |
| Dedicated gatherers per profession | 10-15 | ~35-50% of players are gatherers |
| Gatherer output per week | 14 items/gatherer | 2 avg yield × 7 days |

### Encounter Distribution (of 300 weekly encounters)

| Monster | % of Encounters | Encounters/Week |
|---------|:--------------:|:--------------:|
| Goblin | 15% | 45 |
| Wolf | 15% | 45 |
| Bandit | 15% | 45 |
| Wild Boar | 10% | 30 |
| Giant Rat | 10% | 30 |
| Brown Bear | 7% | 21 |
| Skeleton Warrior | 8% | 24 |
| Giant Spider | 8% | 24 |
| Dire Wolf | 6% | 18 |
| Orc Warrior | 6% | 18 |

### 3A. Material Supply from Encounters vs. Gathering

| Material | Gatherer Prof. | Gatherer Weekly (est.) | Encounter Weekly | Supplement % | Risk? |
|----------|---------------|----------------------:|------------------:|:------------:|:-----:|
| **Animal Pelts** | HUNTER (×15) | 210 | 26.5 | **12.6%** | Low |
| **Wolf Pelts** | HUNTER (×5 high-lvl) | 25 | 3.6 | **14.4%** | Low |
| **Bear Hides** | HUNTER (×5 high-lvl) | 15 | 2.1 | **14.0%** | Low |
| **Wild Game Meat** | HUNTER (×15) | 105 | 15.5 | **14.8%** | Low |
| **Iron Ore** | MINER (×12) | 168 | 11.9 | **7.1%** | None |
| **Cotton** | FARMER (×10) | 70 | 4.5 | **6.4%** | None |
| **Wool** | RANCHER (×8) | 56 | 1.0 | **1.8%** | None |
| **Grain** | FARMER (×10) | 140 | 1.0 | **0.7%** | None |
| **Spider Silk** `[NEW]` | None (encounter-only) | 0 | 9.0 | N/A | N/A |
| **Bone Fragments** `[NEW]` | None (encounter-only) | 0 | 9.6 | N/A | N/A |
| **Wolf Fang** `[NEW]` | None (encounter-only) | 0 | 5.7 | N/A | N/A |

**Calculation details:**

*Animal Pelts from encounters:*
- Wolf: 45 × 0.25 = 11.25
- Wild Boar: 30 × 0.20 = 6.0
- Giant Rat: 30 × 0.10 = 3.0
- Bandit: 45 × 0.10 = 4.5
- Orc Warrior: 18 × 0.15 = 2.7
- Bandit stolen goods: 45 × 0.15 × 0.20 = 1.35 (20% of stolen goods = pelts, but already counted above as Bandit wearing crude leather)
- **Total: ~26.5/week**

*Iron Ore from encounters:*
- Goblin scrap: 45 × 0.15 = 6.75
- Orc Warrior: 18 × 0.20 × 1.5 = 5.4
- Skeleton Warrior rusted: 24 × 0.15 = 3.6
- Bandit stolen: 45 × 0.15 × 0.20 = 1.35
- **Total: ~11.9/week** (some as "Scrap Iron" / "Rusted Iron" mapping to Iron Ore)

### 3B. Impact on Underwater Professions

**ARMORER (Underwater — negative pre-tax income):**

ARMORER's core bottleneck is not material supply — it's negative recipe margins. Encounter drops of Animal Pelts, Bear Hides, and Iron Ore reduce ARMORER's input costs slightly, but the fundamental issue is output base_value < input base_total.

- Bear Hides from encounters: ~2.1/week. ARMORER T4 recipes need 1-2 Bear Leather each. At TANNER conversion (2 hides → 1 leather), encounters provide ~1 extra Bear Leather/week. Value: ~42g saved for the ARMORER who gets it.
- Iron Ore from encounters: ~11.9/week. Feeds SMELTER who makes ingots for ARMORER. Indirect benefit.
- **Verdict: Encounter drops provide a ~5-10% material cost reduction for ARMORER. This does NOT fix the profession — recipe margins are still deeply negative. ARMORER needs a commission/fee system or recipe rebalance.**

**TAILOR (Underwater on armor recipes):**

TAILOR's core bottleneck is the cloth → armor conversion ratio (4× Woven Cloth + 1× Cured Leather → 45g Cloth Robe on 98g of inputs). Encounter drops help TAILOR in two ways:

1. **Spider Silk (NEW, encounter-only):** ~9 units/week at 6g each. TAILOR can spin Spider Silk into Cloth at the same ratio as Cotton (3× Spider Silk → 2× Cloth). This provides **a free material channel** — Spider Silk costs 0g to the player who looted it. If a TAILOR kills spiders, their Cloth cost drops from 12g (3× Cotton at 4g) to 0g (self-looted Spider Silk). This doesn't fix the armor margin, but it improves Spin Cloth profitability.

2. **Stolen Cotton (from Goblins):** ~4.5/week. Small supplement to Cotton supply.

- **Verdict: Spider Silk helps TAILOR processing margins. Does NOT fix armor recipe margins. Armor still needs recipe rebalance.**

**JEWELER (Marginal — 19.3g/week):**

New materials (Wolf Fang 5.7/week, Boar Tusk 1.8/week, Bear Claw 1.7/week, Bone Fragments 9.6/week) create new recipe possibilities for JEWELER. These are low-cost inputs (encounter-sourced) that JEWELER can craft into items with better margins than precious metal jewelry.

- **Verdict: New encounter materials could give JEWELER 3-5 new recipes with better margins. This is a meaningful improvement if recipes are designed in Phase 2.**

**ALCHEMIST (Viable — 37.9g/week):**

Spider Venom (~2.9/week at 12g each) and Orc War Paint (~0.9/week at 8g) provide high-value ingredients for new potion recipes. Rat Tail (~1.5/week) provides a cheap filler ingredient.

- **Verdict: New ingredients enable new recipe development. ALCHEMIST is already viable — this expands their recipe diversity, not their core viability.**

### 3C. Gatherer Protection Check

**Does any material exceed the 20% supplement threshold?**

| Material | Supplement % | Status |
|----------|:-----------:|:------:|
| Animal Pelts | 12.6% | Safe |
| Wolf Pelts | 14.4% | Safe |
| Bear Hides | 14.0% | Safe |
| Wild Game Meat | 14.8% | Safe (meat is less economically critical) |
| Iron Ore | 7.1% | Safe |
| Cotton | 6.4% | Safe |
| Wool | 1.8% | Safe |

**All materials within the 5-15% supplement target.** No gatherer profession is threatened by encounter drops.

**HUNTER is the most affected gatherer** (all animal drops compete with HUNTER output). At 12-15% supplement across their products, HUNTER's market price may dip slightly. But HUNTER already has the highest gathering income (80.2g/week after tax), so a 10-15% price reduction still leaves them well above break-even.

---

## Part 4: Supply Channel Comparison

### Full Comparison Table

| Material | Base Value | Gatherer Prof. | Gatherer Weekly | Encounter Weekly | Supplement % | Encounter Source | Risk to Gatherer? |
|----------|----------:|---------------|:--------------:|:---------------:|:------------:|-----------------|:-----------------:|
| Animal Pelts | 8g | HUNTER | 210 | 26.5 | 12.6% | Wolf, Boar, Rat, Bandit, Orc | Low — HUNTER still dominant |
| Wolf Pelts | 28g | HUNTER | 25 | 3.6 | 14.4% | Dire Wolf | Low — small volume |
| Bear Hides | 35g | HUNTER | 15 | 2.1 | 14.0% | Brown Bear | Low — rare encounters |
| Wild Game Meat | 5g | HUNTER | 105 | 15.5 | 14.8% | Wolf, Boar, Bear, Dire Wolf | Low — meat is cheap |
| Iron Ore | 6g | MINER | 168 | 11.9 | 7.1% | Goblin, Orc, Skeleton | None — MINER output is vast |
| Cotton | ~4g | FARMER | 70 | 4.5 | 6.4% | Goblin (stolen) | None — tiny volume |
| Wool | 15g | RANCHER | 56 | 1.0 | 1.8% | Bandit (stolen, rare) | None — negligible |
| Grain | 3g | FARMER | 140 | 1.0 | 0.7% | Bandit (stolen, rare) | None — negligible |
| Spider Silk | 6g | **None** | 0 | 9.0 | N/A | Giant Spider | N/A — encounter-exclusive |
| Bone Fragments | 4g | **None** | 0 | 9.6 | N/A | Skeleton Warrior | N/A — encounter-exclusive |
| Wolf Fang | 3g | **None** | 0 | 5.7 | N/A | Wolf, Dire Wolf | N/A — encounter-exclusive |
| Boar Tusk | 5g | **None** | 0 | 1.8 | N/A | Wild Boar | N/A — encounter-exclusive |
| Bear Claw | 6g | **None** | 0 | 1.7 | N/A | Brown Bear | N/A — encounter-exclusive |
| Spider Venom | 12g | **None** | 0 | 2.9 | N/A | Giant Spider | N/A — encounter-exclusive |
| Rat Tail | 2g | **None** | 0 | 1.5 | N/A | Giant Rat | N/A — encounter-exclusive |
| Orc War Paint | 8g | **None** | 0 | 0.9 | N/A | Orc Warrior | N/A — encounter-exclusive |

**Key design choice:** 8 of 16 droppable materials are **encounter-exclusive** (no gatherer produces them). This means encounters create NEW supply channels rather than competing with existing ones. The 8 existing materials that also drop from encounters are kept at 5-15% supplement to protect gatherer income.

---

## Part 5: Humanoid Gold Drops

### Gold Drop Rates

| Monster | Drop Chance | Gold Range | Expected Gold/Kill | Description |
|---------|:----------:|:----------:|:------------------:|-------------|
| Goblin | 60% | 1-3g | **1.20g** | Pocket scraps. Goblins are poor. |
| Bandit | 70% | 2-8g | **3.50g** | Stolen coin purses. Moderate haul. |
| Skeleton Warrior | 40% | 1-5g | **1.20g** | Ancient coins on old corpses. |
| Orc Warrior | 50% | 3-12g | **3.75g** | Raid spoils. More organized. |

### Weekly Gold Injection from Encounters

Per player (3 encounters/week, ~40% chance of humanoid):
- Avg humanoid encounters/week: 1.2
- Avg gold per humanoid: ~2.5g
- **Weekly gold from encounters per player: ~3g**

Server-wide (100 players):
- 300 encounters/week × ~42% humanoid × avg gold = **~315g/week new gold entering economy**

### Is This Exploitable?

| Scenario | Encounters/Week | Gold/Week | vs. Worst Profession | Verdict |
|----------|:--------------:|:---------:|:--------------------:|---------|
| Normal player (2 travels) | 3 | ~3g | FARMER earns 36g/week | Not exploitable |
| Heavy traveler (daily travel) | 7 | ~7g | Still 80% less than FARMER | Not exploitable |
| Grind attempt (travel every action) | 7 | ~7g + materials ~15g = 22g | Below median profession income | Not exploitable |

**Gold from encounters is flavor income, not a career.** Even a dedicated encounter grinder earns less than the worst gathering profession. The 315g/week server-wide injection is modest compared to profession income (~3,000-5,000g/week server-wide from all professions).

### Gold Inflation Check

- New gold entering from encounters: ~315g/week
- Gold removed by market fees (10% on ~4,000g weekly trade volume): ~400g/week
- Gold removed by weekly property taxes: ~500g/week
- **Net: encounters add less gold than taxes and fees remove.** No inflation risk.

---

## Part 6: Party Distribution Mechanics

### Loot Distribution Rules

| Rule | Detail |
|------|--------|
| **Item drops** | Randomly assigned to one party member (equal probability per member) |
| **Gold drops** | Split evenly. Remainder goes to random member. Example: 7g ÷ 3 players = 2g each + 1g to random. |
| **Solo players** | Get everything (trivial case) |
| **Inventory full** | Item is sent to player's **house storage** in home town. If house storage is also full, item is **lost** with notification: "Your inventory and storage are full. A [Wolf Pelt] was lost." |
| **Notification** | All players in the party see: "[PlayerName] received [Item] × [Qty]" |
| **No need/greed** | No rolling, no bidding, no trade window. Pure random. Fast and frictionless. |

### Inventory Overflow Justification

"Lost if everything full" is harsh but intentional:
- Creates incentive to manage storage (sell, craft, or discard low-value items)
- Prevents infinite item accumulation exploits
- Simple to implement — no overflow queue, no mailbox system
- Player warning appears in notification log: they know what they missed
- Lost items do NOT go to another party member — this prevents "inventory manipulation" exploits where a player empties inventory to grab all loot

### Party Size Effect on Loot

| Party Size | Chance of Getting Item | Avg Gold per Person (Bandit kill, 5g drop) |
|:----------:|:---------------------:|:------------------------------------------:|
| Solo | 100% | 5.0g |
| 2 players | 50% | 2.5g |
| 3 players | 33% | 1.7g |
| 4 players | 25% | 1.3g |

Solo play is more rewarding per encounter, but parties can fight stronger monsters. This is a natural tradeoff that doesn't need additional balancing.

---

## Part 7: Future-Proofing Notes

### How Phase 2+ Features Plug Into Phase 1 Structure

| Future Feature | Where It Plugs In | Phase 1 Preparation |
|----------------|-------------------|-------------------|
| **Quality tiers** (Common → Legendary) | Add `quality` field to drop table entries. Phase 1 drops are all `quality: "COMMON"`. Phase 2 adds `quality: "FINE"` with lower drop chances. | Drop table structure supports a `quality` field — just add it. |
| **Boss monsters** | New monster entries with `isBoss: true`. Boss loot tables have guaranteed drops (100% chance) plus bonus roll table. | Phase 1 monsters all have `isBoss: false`. Boss flag is a simple boolean addition. |
| **Region-specific loot** | Add `regionId` filter to monster spawn tables. Phase 1 already assigns biomes. Region specificity is a refinement of biome. | Biome → Region is a narrowing, not a restructure. |
| **Level-scaling drops** | Add level ranges to drop entries: `{ drop: "Wolf Pelt", chance: 0.25, minLevel: 1, maxLevel: 10 }`. Higher-level wolves drop higher-quality pelts. | Drop table entries can accept `minLevel`/`maxLevel` fields. Phase 1 entries have no level filter (all levels). |
| **Rare encounter-only materials** | New drop entries on existing monsters: `{ drop: "Pristine Wolf Pelt", chance: 0.03, quality: "RARE" }`. | Phase 1 drop tables are arrays — appending rare entries doesn't affect existing drops. |
| **Monster abilities** | Add `abilities` array to monster stat blocks. Phase 1 monsters are pure stat blocks (HP/AC/ATK). | Abilities are additive — no restructure needed. |
| **Dungeon loot** | Dungeon bosses get dedicated loot tables separate from travel encounter tables. Phase 1 tables are `encounterType: "travel"`. | Add `encounterType` field to loot system. Phase 1 is all `"travel"`. |

### Data Structure Recommendation

```typescript
interface LootEntry {
  itemId: string;          // Maps to ItemTemplate.id or new material ID
  dropChance: number;      // 0.0 - 1.0
  minQty: number;
  maxQty: number;
  // Phase 2 additions:
  quality?: string;        // "COMMON" | "FINE" | "SUPERIOR" | "MASTERWORK" | "LEGENDARY"
  minPlayerLevel?: number; // Only drops if player is >= this level
  maxPlayerLevel?: number; // Only drops if player is <= this level
  isBossOnly?: boolean;    // Only drops from boss variant
}

interface MonsterLootTable {
  monsterId: string;
  encounterType: "travel" | "dungeon" | "caravan" | "arena";
  goldDrop?: {
    chance: number;
    minGold: number;
    maxGold: number;
  };
  items: LootEntry[];
}
```

This structure supports all Phase 2+ features without restructuring Phase 1 data.

---

## Appendix A: Per-Player Weekly Encounter Loot Estimate

Average player (3 encounters/week, random monster distribution):

| Category | Expected Weekly Haul |
|----------|---------------------|
| Gold (from humanoids) | ~3g |
| Animal Pelts | ~0.8 (sell for ~6g) |
| Wild Game Meat | ~0.5 (sell for ~3g) |
| Wolf Pelts | ~0.1 (sell for ~3g) |
| Iron Ore (salvage) | ~0.4 (sell for ~2g) |
| New materials (fangs, silk, etc.) | ~0.5 (sell for ~3g) |
| **Total weekly encounter income** | **~17g** |

At 17g/week, encounter loot is **~10-30% of profession income** depending on profession. A nice supplement, not a replacement. This matches the design goal perfectly.

## Appendix B: Monster Seed Data for Wild Boar and Brown Bear

These monsters need to be added to `database/seeds/monsters.ts`:

```
Wild Boar
  Level: 3, Biome: PLAINS
  STR 14, DEX 10, CON 14, INT 2, WIS 10, CHA 4
  HP: 22, AC: 11, Attack: +4, Damage: 1d6+2 (PIERCING)
  Speed: 40, Region: Verdant Heartlands

Brown Bear
  Level: 5, Biome: FOREST
  STR 18, DEX 10, CON 16, INT 2, WIS 12, CHA 6
  HP: 42, AC: 11, Attack: +6, Damage: 2d6+4 (SLASHING)
  Speed: 40, Region: Silverwood Forest
```
