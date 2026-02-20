# Complete Recipe Crafting Pass — All Professions, All Recipes

**Date:** 2026-02-20
**Source:** `profession-economy-master.yaml` — all numbers trace to YAML
**Status:** Design only — YAML not modified

---

## Methodology

### Margin Targets (base_value ÷ total input cost)

| Tier | Target | Philosophy |
|------|--------|------------|
| Apprentice | 1.3–1.5× | Simple, accessible, no cross-crafter deps |
| Journeyman | 1.4–1.6× | Cross-profession trade begins |
| Craftsman | 1.5–1.8× | Specialist materials, planning required |
| Expert | 1.6–2.0× | Rare materials from 3+ professions |
| Master | 1.6–2.0× | Pinnacle crafting, encounter/magical components |

### Key Material Costs (from YAML)

**Raw (Gathering):** Iron Ore Chunks 4g, Iron Ore 6g, Copper Ore 4g, Coal 12g, Silver Ore 30g, Gold Ore 40g, Mithril Ore 80g, Adamantine Ore 150g, Wood Logs 5g, Softwood 3g, Hardwood 25g, Exotic Wood 50g, Stone Blocks 7g, Clay 4g, Marble 15g, Silite Sand 5g, Wild Herbs 5g, Medicinal Herbs 28g, Glowcap Mushrooms 32g, Arcane Reagents 35g, Gemstones 25g, Animal Pelts 8g, Wolf Pelts 28g, Bear Hides 35g, Cotton 4g, Wool 10g, Fine Wool 30g, Silkworm Cocoons 38g, Grain 3g, Apple 3g, Wild Berries 3g, Raw Fish 4g, River Trout 22g, Lake Perch 25g, Eggs 5g, Milk 6g, Hops 5g, Grapes 4g

**Ingots (SMELTER):** Copper 16g, Iron 52g, Silver 72g, Gold 185g, Steel 210g, Mithril 700g, Adamantine 2350g

**Intermediates:** Nails 1g, Iron Fittings 8g, Glass 12g, Cured Leather 18g, Wolf Leather 73g, Bear Leather 91g, Cloth 8g, Woven Cloth 20g, Fine Cloth 59g, Silk Fabric 75g, Rough Planks 4g, Softwood Planks 3g, Hardwood Planks 18g, Wooden Dowels 4g, Wooden Handle 5g, Bow Stave 8g, Wooden Beams 12g, Wooden Frame 20g, Exotic Planks 40g, Flour 5g, Berry Jam 6g, Bowstring 6g

**Encounter Drops:** Wolf Fang 3g, Boar Tusk 5g, Bear Claw 6g, Spider Silk 6g, Spider Venom 12g, Rat Tail 2g, Bone Fragments 4g, Orc War Paint 8g

**Magical Components:** Wisp Mote 8g, Living Bark 8g, Heartwood Sap 10g, Spectral Dust 10g, Earth Crystal 12g, Ogre Sinew 12g, Wind Mote 12g, Spider Venom 12g, Ember Core 15g, Frost Essence 15g, Storm Feather 15g, Troll Blood 15g, Dryad Blossom 15g, Basilisk Eye 20g, Basilisk Scale 25g, Shadow Essence 30g, Fey Tear 35g, Wyvern Scale 45g

---

## 1. SMELTER (11 recipes — Review)

**Role:** Ore→ingot processing hub. Bottleneck supplier for BLACKSMITH, ARMORER, JEWELER, WOODWORKER (nails).
**Buys from:** MINER (all ores, coal), HERBALIST (Arcane Reagents for adamantine)
**Sells to:** BLACKSMITH, ARMORER, JEWELER, MASON, WOODWORKER (nails/fittings)

| # | Recipe | Tier | Inputs | In$ | BV | Out Qty | Out$ | Ratio | Status |
|---|--------|------|--------|-----|-----|---------|------|-------|--------|
| 1 | Copper Ingot | App L1 | 3× Copper Ore (12), 1× Coal (12) | 24 | 16 | 2 | 32 | 1.33× | ✅ |
| 2 | Iron Ingot (chunks) | App L3 | 4× Iron Ore Chunks (16), 2× Coal (24) | 40 | 52 | 1 | 52 | 1.30× | ✅ |
| 3 | Nails | App L5 | 1× Copper Ingot (16) | 16 | 1 | 50 | 50 | 3.13× | ✅ ¹ |
| 4 | Iron Fittings | App L8 | 3× Iron Ore Chunks (12), 1× Coal (12) | 24 | 8 | 4 | 32 | 1.33× | ✅ |
| 5 | Iron Ingot (ore) | App L10 | 3× Iron Ore (18), 2× Coal (24) | 42 | 52 | 2 | 104 | 2.48× | ⚠️ ² |
| 6 | Glass | Jour L15 | 5× Silite Sand (25) | 25 | 12 | 3 | 36 | 1.44× | ✅ |
| 7 | Silver Ingot | Jour L20 | 3× Silver Ore (90), 1× Coal (12) | 102 | 72 | 2 | 144 | 1.41× | ✅ |
| 8 | Gold Ingot | Jour L25 | 3× Gold Ore (120), 1× Coal (12) | 132 | 185 | 1 | 185 | 1.40× | ✅ |
| 9 | Steel Ingot | Craft L30 | 2× Iron Ingot (104), 3× Coal (36) | 140 | 210 | 1 | 210 | 1.50× | ✅ |
| 10 | Mithril Ingot | Expert L55 | 5× Mithril Ore (400), 3× Coal (36) | 436 | 700 | 1 | 700 | 1.61× | ✅ |
| 11 | Adamantine Ingot | Master L75 | 8× Adamantine Ore (1200), 5× Coal (60), 1× Arcane Reagents (35) | 1295 | 2350 | 1 | 2350 | 1.81× | ✅ |

¹ Nails intentionally generous — economy filler item, bulk output (50 per craft), individually low-value
² smelt-iron L10 at 2.48× is significantly above Apprentice ceiling (1.5×). This is a progression reward (L10 recipe is strictly better than L3). Consider reducing output to 1 ingot or increasing Iron Ore base_value. **Recommend reviewing in next economy pass.**

**Crafting Stories:**
1. *Three copper chunks melted down and poured into ingot molds. Coal fuels the furnace.*
2. *Raw ore chunks hammered and heated — crude but functional iron. The beginner's path.*
3. *A single copper ingot drawn into wire, cut, and pointed — fifty nails, the economy's fastener.*
4. *Iron chunks shaped into hinges, buckles, and brackets. Essential hardware.*
5. *Refined ore smelted properly — double yield rewards the experienced smelter.*
6. *Coastal sand heated until it flows clear. Glass for windows, bottles, and lenses.*
7. *Silver ore purified in hot coal. Two gleaming ingots emerge from three crude veins.*
8. *Gold ore carefully separated from rock. One precious ingot per batch.*
9. *Iron ingots reforged with coal carbon. Steel — stronger, harder, better.*
10. *Magical ore melted at extreme temperature. The lightest, strongest metal known.*
11. *Adamantine requires arcane reagents to reach forging temperature. The ultimate metal.*

**Trade Map:** MINER → SMELTER → {BLACKSMITH, ARMORER, JEWELER, MASON, WOODWORKER (nails)}

**Verdict:** 9/11 ✅, 1 intentional outlier (Nails), 1 flagged (Iron L10). SMELTER is healthy.

---

## 2. BLACKSMITH (28 recipes — All New 🆕)

**Role:** Forges weapons, tools, and armor from RAW ORE (not ingots). The raw-ore crafting path for L3-L8.
**Buys from:** MINER (Iron Ore Chunks, Coal, Silver Ore), LUMBERJACK (Wood Logs, Hardwood)
**Sells to:** Players (combat gear, tools), FLETCHER (crossbow bolts future)

### Apprentice (7 recipes, L3-L4) — Iron Ore Chunks + Wood Logs

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Iron Pickaxe | 2× Iron Ore Chunks (8), 1× Wood Logs (5) | 13 | 18 | 1.38× | 🆕 |
| 2 | Iron Hatchet | 2× Iron Ore Chunks (8), 1× Wood Logs (5) | 13 | 18 | 1.38× | 🆕 |
| 3 | Iron Dagger | 2× Iron Ore Chunks (8), 1× Wood Logs (5) | 13 | 15 | 1.15× | ⚠️ BV 15→17 |
| 4 | Iron Sword | 3× Iron Ore Chunks (12), 1× Wood Logs (5) | 17 | 22 | 1.29× | ⚠️ BV 22→23 |
| 5 | Iron Shield | 2× Iron Ore Chunks (8), 2× Wood Logs (10) | 18 | 25 | 1.39× | 🆕 |
| 6 | Iron Helm | 2× Iron Ore Chunks (8), 1× Wood Logs (5) | 13 | 20 | 1.54× | 🆕 |
| 7 | Copper Hoe | 2× Copper Ore (8), 1× Wood Logs (5) | 13 | 14 | 1.08× | ⚠️ BV 14→17 |

**Apprentice Stories:**
1. *Iron head hammered to shape, wedged onto a wooden haft. The miner's best friend.*
2. *Iron blade hot-fitted into a split wooden handle. Fells trees and enemies alike.*
3. *A short blade drawn from raw ore, simple wooden grip. Every adventurer's first weapon.*
4. *Longer blade forged from three ore chunks. Wooden grip wrapped in cord.*
5. *Iron boss and rim nailed to planked wooden boards. Basic but reliable defense.*
6. *Iron cap shaped over a wooden form with padded interior. Keeps your skull intact.*
7. *Copper blade fitted to a wooden shaft. The farmer's essential tool.*

### Journeyman (9 recipes, L5-L6) — Adds Coal for tempering

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 8 | Steel Pickaxe | 2× Iron Ore Chunks (8), 1× Coal (12), 1× Wood Logs (5) | 25 | 38 | 1.52× | 🆕 |
| 9 | Steel Hatchet | 2× Iron Ore Chunks (8), 1× Coal (12), 1× Wood Logs (5) | 25 | 38 | 1.52× | 🆕 |
| 10 | Steel Dagger | 1× Iron Ore Chunks (4), 1× Coal (12), 1× Wood Logs (5) | 21 | 32 | 1.52× | 🆕 |
| 11 | Steel Sword | 3× Iron Ore Chunks (12), 1× Coal (12), 1× Wood Logs (5) | 29 | 45 | 1.55× | 🆕 |
| 12 | Iron Battleaxe | 3× Iron Ore Chunks (12), 1× Coal (12), 1× Wood Logs (5) | 29 | 40 | 1.38× | ⚠️ BV 40→42 |
| 13 | Reinforced Shield | 2× Iron Ore Chunks (8), 1× Coal (12), 2× Wood Logs (10) | 30 | 42 | 1.40× | 🆕 |
| 14 | Iron Chainmail | 4× Iron Ore Chunks (16), 1× Coal (12), 1× Wood Logs (5) | 33 | 48 | 1.45× | 🆕 |
| 15 | Iron Fishing Spear | 1× Iron Ore Chunks (4), 1× Coal (12), 1× Wood Logs (5) | 21 | 30 | 1.43× | 🆕 |
| 16 | Reinforced Helm | 2× Iron Ore Chunks (8), 1× Coal (12), 1× Wood Logs (5) | 25 | 35 | 1.40× | 🆕 |

**Journeyman Stories:**
8. *Coal-hardened iron pickaxe head. Stronger edge than raw iron.*
9. *Iron blade tempered with coal fire. Cuts hardwood without dulling.*
10. *Small blade hardened in coal forge. Holds a keener edge than raw iron.*
11. *Proper coal-forged sword. The standard military sidearm across Aethermere.*
12. *Heavy double-headed axe, coal-tempered for durability. Cleaves armor and bone.*
13. *Iron-banded wooden shield with coal-hardened rim. Holds against steel blows.*
14. *Hundreds of interlocking iron rings, each coal-tempered. Tedious but effective protection.*
15. *Barbed iron prong on a hardened shaft. Purpose-built for river and lake fishing.*
16. *Coal-tempered iron helm with nose guard. Better protection than raw iron.*

### Specialist — Toolsmith (4 recipes, L7-L8) — Silver Ore + Hardwood

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 17 | Silver Pickaxe | 1× Silver Ore (30), 2× Iron Ore Chunks (8), 1× Coal (12), 1× Wood Logs (5) | 55 | 95 | 1.73× | 🆕 |
| 18 | Hardwood Hatchet | 2× Iron Ore Chunks (8), 1× Coal (12), 1× Hardwood (25) | 45 | 80 | 1.78× | 🆕 |
| 19 | Hunter's Knife | 1× Silver Ore (30), 1× Iron Ore Chunks (4), 1× Coal (12), 1× Wood Logs (5) | 51 | 85 | 1.67× | 🆕 |
| 20 | Reinforced Hoe | 2× Iron Ore Chunks (8), 1× Coal (12), 1× Hardwood (25) | 45 | 75 | 1.67× | 🆕 |

**Toolsmith Stories:**
17. *Silver-tipped iron pick on a sturdy shaft. Silver stays sharp in stone far longer.*
18. *Coal-forged iron blade set in dense hardwood. Won't splinter on the hardest timber.*
19. *Silver-edged skinning knife. The silver prevents tainting of pelts during processing.*
20. *Heavy-duty farming tool. Hardwood shaft absorbs shock, coal-tempered blade cuts deep.*

### Specialist — Weaponsmith (4 recipes, L7-L8)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 21 | Silver Longsword | 2× Silver Ore (60), 1× Coal (12), 1× Wood Logs (5) | 77 | 110 | 1.43× | ⚠️ BV 110→120 |
| 22 | Silver Dagger | 1× Silver Ore (30), 1× Iron Ore Chunks (4), 1× Coal (12), 1× Wood Logs (5) | 51 | 90 | 1.76× | 🆕 |
| 23 | Silver Battleaxe | 2× Silver Ore (60), 1× Iron Ore Chunks (4), 1× Coal (12), 1× Wood Logs (5) | 81 | 120 | 1.48× | ⚠️ BV 120→125 |
| 24 | War Pick | 1× Silver Ore (30), 2× Iron Ore Chunks (8), 1× Coal (12), 1× Wood Logs (5) | 55 | 100 | 1.82× | 🆕 |

**Weaponsmith Stories:**
21. *Long silver blade forged from two veins of ore. The knight's weapon of choice.*
22. *Silver-iron alloy blade — compact, deadly, and beautiful. An assassin's prize.*
23. *Massive silver-alloyed axehead that gleams in battle. Intimidation and power.*
24. *Armor-piercing spike backed by a hammer head. Silver tip punches through plate.*

### Specialist — Armorer (4 recipes, L7-L8)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 25 | Silver-Studded Plate | 2× Silver Ore (60), 2× Iron Ore Chunks (8), 1× Coal (12), 1× Wood Logs (5) | 85 | 130 | 1.53× | 🆕 |
| 26 | Silver Helm | 1× Silver Ore (30), 2× Iron Ore Chunks (8), 1× Coal (12), 1× Wood Logs (5) | 55 | 95 | 1.73× | 🆕 |
| 27 | Hardwood Tower Shield | 2× Iron Ore Chunks (8), 1× Coal (12), 2× Hardwood (50) | 70 | 100 | 1.43× | ⚠️ BV 100→108 |
| 28 | Reinforced Chain Leggings | 1× Silver Ore (30), 3× Iron Ore Chunks (12), 1× Coal (12), 1× Wood Logs (5) | 59 | 105 | 1.78× | 🆕 |

**Armorer Stories:**
25. *Iron plate armor studded with silver rivets. Impressive defense and a status symbol.*
26. *Silver-capped iron helm with cheek guards. Marks the wearer as someone of means.*
27. *Full-body hardwood shield with iron banding. Dense enough to stop a charging boar.*
28. *Chainmail leggings reinforced with silver knee caps. Mobility meets protection.*

### BLACKSMITH Summary

- **28 recipes designed:** 7 Apprentice, 9 Journeyman, 12 Specialist (4 per branch)
- **22/28 within target** (79%)
- **6 base_value adjustments flagged:** Iron Dagger (15→17), Iron Sword (22→23), Copper Hoe (14→17), Iron Battleaxe (40→42), Silver Longsword (110→120), Silver Battleaxe (120→125), Hardwood Tower Shield (100→108)
- **0 new materials needed** — all inputs exist in YAML
- **Cross-profession buys:** MINER (ores, coal), LUMBERJACK (wood, hardwood)
- **Note:** BLACKSMITH raw-ore path is separate from ingot-based weapon recipes (already in weapons.ts). These 28 recipes use raw ore directly — the crude but accessible path.

---

## 3. ARMORER (25 recipes — All New 🆕)

**Role:** Crafts metal plate armor and shields from SMELTER ingots + TANNER leather.
**Buys from:** SMELTER (ingots), TANNER (Cured Leather, Bear Leather)
**Sells to:** Players (heavy armor sets, shields)

### Apprentice — Copper (5 recipes, L1)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Copper Helm | 2× Copper Ingot (32), 2× Nails (2) | 34 | 45 | 1.32× | 🆕 |
| 2 | Copper Chestplate | 3× Copper Ingot (48), 1× Cured Leather (18) | 66 | 90 | 1.36× | 🆕 |
| 3 | Copper Gauntlets | 1× Copper Ingot (16), 1× Cured Leather (18) | 34 | 40 | 1.18× | ⚠️ BV 40→45 |
| 4 | Copper Greaves | 2× Copper Ingot (32), 5× Nails (5) | 37 | 55 | 1.49× | 🆕 |
| 5 | Copper Shield | 2× Copper Ingot (32), 5× Nails (5) | 37 | 55 | 1.49× | 🆕 |

### Journeyman — Iron (5 recipes, L10)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 6 | Iron Helm | 1× Iron Ingot (52), 1× Cured Leather (18), 2× Iron Fittings (16) | 86 | 130 | 1.51× | 🆕 |
| 7 | Iron Chestplate | 3× Iron Ingot (156), 1× Cured Leather (18) | 174 | 250 | 1.44× | 🆕 |
| 8 | Iron Gauntlets | 1× Iron Ingot (52), 1× Cured Leather (18) | 70 | 110 | 1.57× | 🆕 |
| 9 | Iron Greaves | 2× Iron Ingot (104), 1× Cured Leather (18) | 122 | 160 | 1.31× | ⚠️ BV 160→175 |
| 10 | Iron Shield | 1× Iron Ingot (52), 1× Cured Leather (18), 3× Iron Fittings (24) | 94 | 150 | 1.60× | 🆕 |

### Craftsman — Steel (5 recipes, L30)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 11 | Steel Helm | 1× Steel Ingot (210), 2× Cured Leather (36), 4× Iron Fittings (32) | 278 | 500 | 1.80× | 🆕 |
| 12 | Steel Chestplate | 3× Steel Ingot (630), 2× Cured Leather (36) | 666 | 950 | 1.43× | ⚠️ BV 950→1000 |
| 13 | Steel Gauntlets | 1× Steel Ingot (210), 1× Cured Leather (18), 2× Iron Fittings (16) | 244 | 420 | 1.72× | 🆕 |
| 14 | Steel Greaves | 2× Steel Ingot (420), 1× Cured Leather (18), 2× Iron Fittings (16) | 454 | 600 | 1.32× | ⚠️ BV 600→700 |
| 15 | Steel Shield | 1× Steel Ingot (210), 1× Iron Ingot (52), 2× Cured Leather (36) | 298 | 550 | 1.85× | 🆕 |

### Expert — Mithril (5 recipes, L55)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 16 | Mithril Helm | 1× Mithril Ingot (700), 1× Bear Leather (91), 1× Steel Ingot (210) | 1001 | 1800 | 1.80× | 🆕 |
| 17 | Mithril Chestplate | 2× Mithril Ingot (1400), 1× Bear Leather (91), 2× Steel Ingot (420) | 1911 | 3500 | 1.83× | 🆕 |
| 18 | Mithril Gauntlets | 1× Mithril Ingot (700), 1× Bear Leather (91) | 791 | 1500 | 1.90× | 🆕 |
| 19 | Mithril Greaves | 1× Mithril Ingot (700), 1× Bear Leather (91), 2× Steel Ingot (420) | 1211 | 2200 | 1.82× | 🆕 |
| 20 | Mithril Shield | 1× Mithril Ingot (700), 1× Bear Leather (91), 1× Steel Ingot (210) | 1001 | 2000 | 2.00× | 🆕 |

### Master — Adamantine (5 recipes, L75)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 21 | Adamantine Helm | 1× Adamantine Ingot (2350), 1× Bear Leather (91), 1× Mithril Ingot (700) | 3141 | 6000 | 1.91× | 🆕 |
| 22 | Adamantine Chestplate | 2× Adamantine Ingot (4700), 1× Bear Leather (91), 2× Mithril Ingot (1400) | 6191 | 12000 | 1.94× | 🆕 |
| 23 | Adamantine Gauntlets | 1× Adamantine Ingot (2350), 1× Bear Leather (91), 1× Steel Ingot (210) | 2651 | 5000 | 1.89× | 🆕 |
| 24 | Adamantine Greaves | 2× Adamantine Ingot (4700), 1× Bear Leather (91) | 4791 | 7500 | 1.57× | ⚠️ BV 7500→8000 |
| 25 | Adamantine Shield | 2× Adamantine Ingot (4700), 1× Bear Leather (91), 1× Steel Ingot (210) | 5001 | 7000 | 1.40× | ⚠️ BV 7000→8500 |

**Crafting Stories (Copper):**
1. *Copper cap riveted together. Simple but better than bare skull.*
2. *Three copper plates hammered and joined over leather padding. Entry-level protection.*
3. *Articulated copper finger plates riveted to leather gloves.*
4. *Copper shin guards riveted to knee-length greaves.*
5. *Round copper shield — nailed plates over a wooden core.*

**Crafting Stories (Iron):**
6. *Iron helm with leather lining and iron-fitted cheek guards. Professional military gear.*
7. *Three iron ingots beaten into front and back plates. Leather straps hold it together.*
8. *Iron gauntlets over leather gloves. Protects the hands without sacrificing grip.*
9. *Iron leg plates joined by leather straps. Heavy but dependable.*
10. *Iron-faced shield — ingot boss, leather backing, iron fittings for reinforcement.*

**Crafting Stories (Steel):**
11. *Steel helm with articulated visor, double-leather lining, iron fittings throughout.*
12. *Three steel plates — front, back, and gorget — joined with leather and riveted.*
13. *Articulated steel fingers over padded leather. A craftsman's finest hand protection.*
14. *Overlapping steel plates protect thigh to ankle. Leather straps distribute weight.*
15. *Steel-faced kite shield backed with iron reinforcement and double leather padding.*

**Crafting Stories (Mithril):**
16. *Mithril cap with steel reinforcing band and bear leather lining. Light as a feather.*
17. *Two mithril plates over a steel frame, bear leather straps. Weighs half what steel does.*
18. *Mithril gauntlets lined with bear leather. Impossibly light, impossibly strong.*
19. *Mithril greaves over a steel subframe. The wearer can sprint in full armor.*
20. *Mithril shield with steel rim and bear leather grip. You can hold it all day.*

**Crafting Stories (Adamantine):**
21. *Adamantine helm with mithril inner frame and bear leather padding. Indestructible.*
22. *Two adamantine plates over mithril skeleton. The ultimate in mortal armor.*
23. *Adamantine gauntlets with steel joints. Punching through walls is ill-advised but possible.*
24. *Adamantine leg armor. Nothing short of dragonfire gets through.*
25. *Adamantine shield reinforced with steel ribs. A wall you carry into battle.*

### ARMORER Summary

- **25 recipes designed:** 5 per tier (Copper/Iron/Steel/Mithril/Adamantine)
- **19/25 within target** (76%)
- **6 base_value adjustments flagged:**
  - Copper Gauntlets: 40→45g
  - Iron Greaves: 160→175g
  - Steel Chestplate: 950→1000g
  - Steel Greaves: 600→700g
  - Adamantine Greaves: 7500→8000g
  - Adamantine Shield: 7000→8500g
- **0 new materials needed**
- **Cross-profession buys:** SMELTER (6 ingot types), TANNER (Cured Leather, Bear Leather)
- **Design note:** Each tier uses material from current + previous tier (Steel armor uses Iron Fittings, Mithril uses Steel Ingots, Adamantine uses Mithril Ingots). This creates cascading demand through the entire SMELTER pipeline.

---

## 4. WOODWORKER (25 recipes — All New 🆕)

**Role:** Central wood processing hub + finished goods (furniture, shields, bows, tools).
**Buys from:** LUMBERJACK (Wood Logs, Softwood, Hardwood, Exotic Wood), SMELTER (Nails)
**Sells to:** FLETCHER (Bow Stave, Dowels, Planks), TANNER (Tanning Rack), LEATHERWORKER (Frames, Handles), BLACKSMITH (handles), MASON (beams), Players (furniture, tools)

### Apprentice — Processing (5 recipes, L3-L10)

| # | Recipe | Inputs | In$ | BV | Out Qty | Out$ | Ratio | Status |
|---|--------|--------|-----|-----|---------|------|-------|--------|
| 1 | Rough Planks | 1× Wood Logs (5) | 5 | 4 | 2 | 8 | 1.60× | 🆕 |
| 2 | Softwood Planks | 1× Softwood (3) | 3 | 3 | 2 | 6 | 2.00× | ⚠️ ¹ |
| 3 | Wooden Dowels | 1× Softwood (3), 1× Wood Logs (5) | 8 | 4 | 3 | 12 | 1.50× | 🆕 |
| 4 | Wooden Handle | 1× Wood Logs (5), 2× Nails (2) | 7 | 5 | 2 | 10 | 1.43× | 🆕 |
| 5 | Bow Stave | 1× Wood Logs (5), 1× Softwood (3) | 8 | 8 | 1 | 8 | 1.00× | ⚠️ BV 8→11 |

¹ Softwood Planks at 2.00× is above ceiling but processing is intentionally generous — it's a basic step. Or adjust: 2× Softwood (6) → 2 planks (6) = 1.00× which is underwater. Keep as-is.

### Apprentice — Finished Goods (4 recipes, L3-L10)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 6 | Wooden Pickaxe | 2× Wood Logs (10), 4× Nails (4) | 14 | 12 | 0.86× | ⚠️ BV 12→19 |
| 7 | Fishing Rod | 1× Softwood (3), 1× Wood Logs (5), 2× Nails (2) | 10 | 14 | 1.40× | 🆕 |
| 8 | Carving Knife | 1× Wood Logs (5), 1× Iron Ore Chunks (4) | 9 | 10 | 1.11× | ⚠️ BV 10→12 |
| 9 | Wooden Chair | 2× Wood Logs (10), 4× Nails (4) | 14 | 15 | 1.07× | ⚠️ BV 15→19 |

### Journeyman — Processing (5 recipes, L11-L25)

| # | Recipe | Inputs | In$ | BV | Out Qty | Out$ | Ratio | Status |
|---|--------|--------|-----|-----|---------|------|-------|--------|
| 10 | Hardwood Planks | 1× Hardwood (25) | 25 | 18 | 2 | 36 | 1.44× | 🆕 |
| 11 | Wooden Beams | 2× Wood Logs (10), 2× Nails (2) | 12 | 12 | 1 | 12 | 1.00× | ⚠️ BV 12→17 |
| 12 | Barrel | 3× Wood Logs (15), 6× Nails (6), 2× Iron Fittings (16) | 37 | 25 | 1 | 25 | 0.68× | ⚠️ BV 25→55 |
| 13 | Furniture (generic) | 2× Hardwood Planks (36), 6× Nails (6) | 42 | 40 | 1 | 40 | 0.95× | ⚠️ BV 40→63 |
| 14 | Wooden Frame | 2× Wood Logs (10), 1× Hardwood (25), 4× Nails (4) | 39 | 20 | 1 | 20 | 0.51× | ⚠️ BV 20→58 |

**Critical issue: 3 Journeyman processing recipes are UNDERWATER.** Wooden Beams, Barrel, and Wooden Frame produce items worth less than their inputs. This is a major problem because these are intermediate items consumed by LEATHERWORKER, BREWER, and others.

**Root cause:** Base values were set as intermediate prices without considering actual input costs. Barrels need iron fittings (8g each) which are expensive. Wooden Frames need hardwood (25g) which is premium.

**Proposed fixes:** See Base_Value Adjustments section at end of document.

### Journeyman — Finished Goods (6 recipes, L11-L25)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 15 | Tanning Rack | 2× Wood Logs (10), 1× Hardwood (25), 4× Nails (4) | 39 | 35 | 0.90× | ⚠️ BV 35→58 |
| 16 | Fine Fishing Rod | 1× Hardwood (25), 1× Softwood (3), 4× Nails (4) | 32 | 40 | 1.25× | ⚠️ BV 40→45 |
| 17 | Wooden Table | 2× Hardwood Planks (36), 6× Nails (6), 2× Wood Logs (10) | 52 | 30 | 0.58× | ⚠️ BV 30→78 |
| 18 | Storage Chest | 3× Hardwood Planks (54), 8× Nails (8), 2× Iron Fittings (16) | 78 | 45 | 0.58× | ⚠️ BV 45→117 |
| 19 | Wooden Bed Frame | 2× Hardwood Planks (36), 2× Wooden Beams (24), 8× Nails (8) | 68 | 50 | 0.74× | ⚠️ BV 50→100 |
| 20 | Wooden Shield | 2× Hardwood Planks (36), 4× Nails (4), 1× Cured Leather (18) | 58 | 35 | 0.60× | ⚠️ BV 35→87 |

**CRITICAL: 6/6 Journeyman finished goods are UNDERWATER.** WOODWORKER is the most broken profession in the game. Every furniture/goods recipe loses money because Hardwood Planks (18g each, from 25g Hardwood) are expensive and Nails add up fast.

**Root cause:** WOODWORKER base_values were set assuming cheap materials, but Hardwood is 25g (LUMBERJACK L7+ private grove) and Hardwood Planks at 18g each makes any multi-plank recipe expensive. Furniture that uses 2-3 planks + nails easily exceeds 40-80g in inputs, but base_values range from 30-50g.

### Craftsman — Processing (1 recipe, L26-L50)

| # | Recipe | Inputs | In$ | BV | Out Qty | Out$ | Ratio | Status |
|---|--------|--------|-----|-----|---------|------|-------|--------|
| 21 | Exotic Planks | 1× Exotic Wood (50) | 50 | 40 | 2 | 80 | 1.60× | 🆕 |

### Craftsman — Finished Goods (4 recipes, L26-L50)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 22 | Wooden Shelf | 2× Hardwood Planks (36), 4× Nails (4), 1× Iron Fittings (8) | 48 | 55 | 1.15× | ⚠️ BV 55→75 |
| 23 | Reinforced Crate | 3× Hardwood Planks (54), 8× Nails (8), 3× Iron Fittings (24) | 86 | 65 | 0.76× | ⚠️ BV 65→130 |
| 24 | Hardwood Tower Shield | 2× Exotic Planks (80), 1× Iron Ingot (52), 1× Cured Leather (18) | 150 | 80 | 0.53× | ⚠️ BV 80→230 |
| 25 | Practice Bow | 1× Bow Stave (8), 1× Bowstring (6), 1× Softwood (3) | 17 | 45 | 2.65× | 🆕 ² |

² Practice Bow at 2.65× is above ceiling, but materials are cheap and this is a starter bow. Could reduce BV to 28g (1.65×) for Craftsman target.

**Crafting Stories:**
1. *Logs split and planed into rough boards. The building block of all woodwork.*
2. *Soft timber planed smooth. Easy to work, light to carry.*
3. *Softwood and logs whittled into cylindrical pegs. The humble joint-maker.*
4. *Wood shaped and nailed into a tool grip. Sold to every profession.*
5. *A straight section of wood carefully shaped for bow-making. FLETCHER's key input.*
6. *Rough wooden pickaxe — functional but fragile. Better than bare hands.*
7. *Softwood rod with whittled tip and nail hook. Gets fish out of water.*
8. *Wooden handle with an iron ore blade wedged in. For carving, not combat.*
9. *Four legs, a seat, nailed together. Simple furniture for any home.*
10. *Dense hardwood split and planed. Premium boards for serious construction.*
11. *Load-bearing timber beams joined with nails. Structural backbone of buildings.*
12. *Coopered barrel with iron fittings. Holds ale, wine, fish, or grain.*
13. *Fine furniture shaped from hardwood planks. Status symbol for homeowners.*
14. *Rectangular frame of hardwood braced with nails. Base for leather stretching and pack-building.*
15. *Sturdy frame for stretching and curing hides. Essential TANNER equipment.*
16. *Hardwood rod with fine softwood tip. Superior flex for bigger catches.*
17. *Hardwood dining table. Seats four, built to last generations.*
18. *Iron-banded hardwood chest with hinged lid. Secure storage for valuables.*
19. *Hardwood planks and beams assembled into a sleeping frame. Rest well.*
20. *Hardwood planks faced with leather grip. Light defensive option.*
21. *Rare timber planed into exotic boards. For master-tier constructions.*
22. *Wall-mounted hardwood shelf with iron brackets. Displays goods in shops.*
23. *Triple-reinforced hardwood crate with iron bands. Caravan-grade cargo container.*
24. *Full-body exotic wood shield backed with iron and leather. Premium defense.*
25. *Simple bow from a stave and string. Training weapon, suitable for beginners.*

### WOODWORKER Summary

- **25 recipes designed:** 5+4 Apprentice, 5+6 Journeyman, 1+4 Craftsman
- **ONLY 7/25 within target (28%)** — WOODWORKER is severely broken
- **15 base_value adjustments needed** — most Journeyman+ recipes are underwater
- **Root cause:** Hardwood (25g) and Hardwood Planks (18g) make multi-plank recipes expensive, but base_values were set in the 15-50g range assuming cheaper materials
- **Fix strategy:** Significant BV increases needed across the board. See Base_Value Adjustments.
- **0 new materials needed**
- **Cross-profession buys:** LUMBERJACK (all wood), SMELTER (nails, fittings, Iron Ingot)
- **Sells to:** FLETCHER (staves, dowels, planks), TANNER (tanning rack), LEATHERWORKER (frames, handles), BREWER (barrels), Players (furniture, tools, shields)

---

## 5. FLETCHER (13 recipes — All New 🆕)

**Role:** Crafts bows, arrows, and quivers. The ranged weapon specialist.
**Buys from:** WOODWORKER (Bow Stave, Softwood Planks, Dowels, Hardwood Planks), TANNER (Cured Leather, Wolf Leather, Bear Leather)
**Sells to:** Players (ranged weapons, ammunition)

### Apprentice (4 recipes, L1-L10)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Bowstring | 1× Cured Leather (18) | 18 | 6 | 0.33× | ⚠️ BV 6→24 |
| 2 | Arrows (×10) | 2× Softwood Planks (6), 1× Iron Ore Chunks (4) | 10 | 2/ea=20 | 2.00× | 🆕 ¹ |
| 3 | Shortbow | 1× Bow Stave (8), 1× Bowstring (6) | 14 | 20 | 1.43× | 🆕 |
| 4 | Hunting Bow | 1× Bow Stave (8), 1× Bowstring (6), 1× Cured Leather (18) | 32 | 30 | 0.94× | ⚠️ BV 30→45 |

¹ Arrows are bulk ammo — 10 per craft at 2g each = 20g total output. Consumable, high demand.

**Bowstring problem:** Cured Leather (18g) as sole input makes Bowstring (6g) deeply underwater. Bowstring needs a much cheaper input or a higher BV. **Proposed fix:** Bowstring should use 1× Animal Pelts (8g) instead of Cured Leather → 6/8 = 0.75× still underwater. Or use 2× Spider Silk (12g) → 6/12 = 0.50×. **Best fix: BV 6→24g** with 1× Cured Leather (18g) = 1.33×. Bowstring is a specialized product requiring skill to make from leather strips.

### Journeyman (4 recipes, L11-L25)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 5 | Longbow | 1× Hardwood Planks (18), 1× Bowstring (6), 1× Cured Leather (18) | 42 | 55 | 1.31× | ⚠️ BV 55→60 |
| 6 | War Arrows (×10) | 2× Hardwood Planks (36), 2× Iron Ore Chunks (8) | 44 | 5/ea=50 | 1.14× | ⚠️ BV 5→7 |
| 7 | War Bow | 1× Hardwood Planks (18), 1× Bow Stave (8), 1× Bowstring (6), 1× Wolf Leather (73) | 105 | 70 | 0.67× | ⚠️ BV 70→155 |
| 8 | Quiver | 1× Cured Leather (18), 2× Wooden Dowels (8), 4× Nails (4) | 30 | 45 | 1.50× | 🆕 |

**War Bow problem:** Wolf Leather (73g) as a single input component makes this recipe deeply underwater at BV 70. Either drop Wolf Leather (use Cured Leather instead) or raise BV significantly.

### Craftsman (5 recipes, L26-L50)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 9 | Barbed Arrows (×10) | 2× Hardwood Planks (36), 2× Iron Fittings (16) | 52 | 8/ea=80 | 1.54× | 🆕 |
| 10 | Composite Bow | 1× Exotic Planks (40), 1× Bow Stave (8), 1× Bowstring (6), 1× Wolf Leather (73) | 127 | 150 | 1.18× | ⚠️ BV 150→200 |
| 11 | Ranger's Quiver | 1× Wolf Leather (73), 2× Hardwood Planks (36), 4× Nails (4) | 113 | 120 | 1.06× | ⚠️ BV 120→175 |
| 12 | Flight Arrows (×10) | 2× Softwood Planks (6), 1× Spider Silk (6) | 12 | 6/ea=60 | 5.00× | ⚠️ BV 6→2 ² |
| 13 | Ranger's Longbow | 1× Exotic Planks (40), 1× Bow Stave (8), 1× Bowstring (6), 1× Bear Leather (91), 1× Bear Claw (6) | 151 | 200 | 1.32× | ⚠️ BV 200→250 |

² Flight Arrows at 5.00× are wildly above target. Specialty lightweight arrows should be BV 2g each (20g per 10) → 20/12 = 1.67×. Still generous for Craftsman.

**Crafting Stories:**
1. *Leather strip twisted and waxed into a taut bowstring. Every archer needs spares.*
2. *Softwood shafts tipped with iron points, fletched with feathers. Basic but lethal.*
3. *Bow stave strung with leather cord. The simplest ranged weapon.*
4. *Better-made bow with leather grip. A hunter's everyday companion.*
5. *Hardwood stave with leather-wrapped grip. Greater range and power.*
6. *Hardwood shafts with iron broadhead tips. Punches through light armor.*
7. *Premium bow with wolf leather grip and hardwood core. Military grade.*
8. *Leather quiver with wooden spine and dowel dividers. Holds 20 arrows.*
9. *Barbed iron tips on hardwood shafts. Causes bleeding wounds.*
10. *Exotic wood limbs with wolf leather wrap. Fires further and truer.*
11. *Wolf leather quiver with hardwood frame. Holds 30 arrows, waterproof.*
12. *Ultralight softwood shafts with spider silk fletching. Maximum range.*
13. *Exotic wood bow with bear leather grip and bear claw nock tips. The ranger's masterwork.*

### FLETCHER Summary

- **13 recipes designed:** 4 Apprentice, 4 Journeyman, 5 Craftsman
- **5/13 within target (38%)** — FLETCHER has significant pricing issues
- **8 base_value adjustments needed** — mainly due to leather inputs being expensive
- **Root cause:** Wolf Leather (73g) and Bear Leather (91g) make Journeyman/Craftsman bows very expensive, but BVs were set low. Bowstring at 6g is deeply underwater when made from 18g leather.
- **1 encounter material used:** Bear Claw in Ranger's Longbow, Spider Silk in Flight Arrows
- **Cross-profession buys:** WOODWORKER (staves, planks, dowels), TANNER (leather), SMELTER (nails, fittings)

---

## 6. JEWELER (12 recipes — All New 🆕)

**Role:** Cuts gems and crafts jewelry — rings, necklaces, circlets, brooches, crowns.
**Buys from:** SMELTER (Copper/Iron/Silver/Gold/Mithril Ingots), MINER (Gemstones)
**Sells to:** Players (stat-boosting accessories)

### Apprentice (2 recipes, L1)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Copper Ring | 1× Copper Ingot (16), 1× Gemstones (25) | 41 | 50 | 1.22× | ⚠️ BV 50→55 |
| 2 | Copper Necklace | 2× Copper Ingot (32), 1× Gemstones (25) | 57 | 60 | 1.05× | ⚠️ BV 60→75 |

### Journeyman (5 recipes, L10-L25)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 3 | Iron Ring | 1× Iron Ingot (52), 1× Gemstones (25) | 77 | 120 | 1.56× | 🆕 |
| 4 | Brooch of Protection | 1× Silver Ingot (72), 2× Gemstones (50) | 122 | 170 | 1.39× | ⚠️ BV 170→180 |
| 5 | Silver Ring | 1× Silver Ingot (72), 1× Gemstones (25) | 97 | 200 | 2.06× | ⚠️ ¹ |
| 6 | Silver Necklace | 2× Silver Ingot (144), 2× Gemstones (50) | 194 | 250 | 1.29× | ⚠️ BV 250→290 |
| 7 | Circlet of Focus | 1× Silver Ingot (72), 2× Gemstones (50), 1× Arcane Reagents (35) | 157 | 350 | 2.23× | ⚠️ ² |

¹ Silver Ring at 2.06× is above Journeyman ceiling (1.6×). Reduce BV to 155g (1.60×) or add inputs.
² Circlet of Focus at 2.23× is above ceiling. Add inputs: 2× Silver Ingot (144) + 2× Gemstones (50) + 1× Arcane Reagents (35) = 229g → 350/229 = 1.53× ✅

### Craftsman (3 recipes, L30)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 8 | Gold Ring | 1× Gold Ingot (185), 1× Gemstones (25) | 210 | 450 | 2.14× | ⚠️ ³ |
| 9 | Gold Necklace | 2× Gold Ingot (370), 2× Gemstones (50) | 420 | 550 | 1.31× | ⚠️ BV 550→650 |
| 10 | Brooch of Speed | 1× Gold Ingot (185), 2× Gemstones (50), 1× Wind Mote (12) | 247 | 400 | 1.62× | 🆕 |

³ Gold Ring at 2.14× above Craftsman ceiling. Use: 1× Gold Ingot (185) + 2× Gemstones (50) = 235g → 450/235 = 1.91× still high. Flag BV 450→380g → 380/235 = 1.62× ✅

### Expert (2 recipes, L50-L55)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 11 | Crown of Wisdom | 2× Gold Ingot (370), 3× Gemstones (75), 1× Fey Tear (35), 1× Arcane Reagents (35) | 515 | 2000 | 3.88× | ⚠️ ⁴ |
| 12 | Mithril Ring | 1× Mithril Ingot (700), 2× Gemstones (50), 1× Wyvern Scale (45) | 795 | 2500 | 3.14× | ⚠️ ⁵ |

⁴ Crown of Wisdom at 3.88× is wildly above Expert ceiling (2.0×). Needs many more inputs: 3× Gold Ingot (555) + 4× Gemstones (100) + 2× Fey Tear (70) + 1× Arcane Reagents (35) + 1× Silk Fabric (75) = 835g → 2000/835 = 2.40× — still above. Flag BV 2000→1500g → 1500/835 = 1.80× ✅

⁵ Mithril Ring at 3.14× way above ceiling. Add inputs: 1× Mithril Ingot (700) + 3× Gemstones (75) + 1× Wyvern Scale (45) + 1× Arcane Reagents (35) = 855g → 2500/855 = 2.92× — still above. Flag BV 2500→1550g → 1550/855 = 1.81× ✅. Alternatively, 2× Mithril Ingot → 1475g input → 2500/1475 = 1.69× ✅ (keeps high BV, more mithril needed).

**Crafting Stories:**
1. *A copper band set with a small gemstone. Apprentice work, but genuine.*
2. *Copper chain links with a pendant gem. A first foray into fine work.*
3. *Iron ring polished smooth with an inset gem. Sturdy and subtle.*
4. *Silver brooch set with protective wards in gem. Grants minor defense.*
5. *Silver band with a precision-cut gemstone. The classic ring.*
6. *Double-length silver chain with twin gems. Catches the light beautifully.*
7. *Silver circlet with gem-focused arcane lens. Sharpens the mind.*
8. *Gold ring with a flawless gem. Wealth made wearable.*
9. *Heavy gold chain draped with matched gems. Nobility personified.*
10. *Gold brooch with a wind-touched gem. The wearer feels lighter on their feet.*
11. *A crown of gold and gems infused with fey magic. Grants supernatural wisdom.*
12. *Mithril ring set with gemstones and a wyvern scale shard. Near-indestructible.*

### JEWELER Summary

- **12 recipes designed:** 2 Apprentice, 5 Journeyman, 3 Craftsman, 2 Expert
- **3/12 within target (25%)** — JEWELER has major pricing issues
- **9 base_value adjustments needed** — mix of too low (Copper Necklace, Silver Necklace, Gold Necklace) and too high (Silver Ring, Circlet, Gold Ring, Crown, Mithril Ring)
- **Root cause:** Ingot costs create unpredictable margins. Gold Ingot (185g) is very expensive making gold recipes need high BVs. Meanwhile, simple recipes (Silver Ring: 1 ingot + 1 gem = 97g) have inflated BVs (200g = 2.06×).
- **2 magical components used:** Wind Mote (Brooch of Speed), Fey Tear (Crown of Wisdom), Wyvern Scale (Mithril Ring) — gives the Wyvern Scale orphan a home
- **Cross-profession buys:** SMELTER (ingots), MINER (Gemstones), HERBALIST (Arcane Reagents), TAILOR (Silk Fabric for Crown), Encounters (magical components)

---

## 7. LEATHERWORKER (13 recipes — All New 🆕)

**Role:** Crafts leather armor, bags, belts, and gear from TANNER leather + WOODWORKER parts.
**Buys from:** TANNER (Cured Leather, Wolf Leather, Bear Leather), WOODWORKER (Frames, Handles), SMELTER (Nails)
**Sells to:** Players (leather armor, utility gear)

### Apprentice (4 recipes)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Leather Gloves | 2× Cured Leather (36), 1× Animal Pelts (8) | 44 | 52 | 1.18× | ⚠️ BV 52→58 |
| 2 | Leather Boots | 2× Cured Leather (36), 1× Animal Pelts (8) | 44 | 52 | 1.18× | ⚠️ BV 52→58 |
| 3 | Leather Backpack | 3× Cured Leather (54), 4× Nails (4) | 58 | 60 | 1.03× | ⚠️ BV 60→78 |
| 4 | Leather Waterskin | 1× Cured Leather (18), 1× Animal Pelts (8) | 26 | 30 | 1.15× | ⚠️ BV 30→35 |

### Journeyman (5 recipes)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 5 | Wolf Leather Gloves | 1× Wolf Leather (73), 1× Cured Leather (18) | 91 | 145 | 1.59× | 🆕 |
| 6 | Wolf Leather Boots | 1× Wolf Leather (73), 1× Cured Leather (18) | 91 | 145 | 1.59× | 🆕 |
| 7 | Toolbelt | 2× Cured Leather (36), 1× Wooden Frame (20), 4× Nails (4) | 60 | 130 | 2.17× | ⚠️ ¹ |
| 8 | Leather Repair Kit | 2× Cured Leather (36), 10× Nails (10) | 46 | 80 | 1.74× | 🆕 |
| 9 | Ranger's Pack | 1× Wolf Leather (73), 2× Cured Leather (36), 1× Wooden Frame (20) | 129 | 180 | 1.40× | 🆕 |

¹ Toolbelt at 2.17× is above Journeyman ceiling. BV 130 with 60g input is generous. Reduce BV to 90g → 90/60 = 1.50× ✅. Or add Wolf Leather: 1× WoL (73) + 1× CL (18) + 4× Nails (4) = 95g → 130/95 = 1.37× ⚠️. Best fix: BV 130→90g.

### Craftsman (4 recipes)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 10 | Bear Hide Vambraces | 2× Bear Leather (182), 1× Cured Leather (18) | 200 | 250 | 1.25× | ⚠️ BV 250→310 |
| 11 | Bear Leather Boots | 1× Bear Leather (91), 1× Wolf Leather (73) | 164 | 230 | 1.40× | ⚠️ BV 230→260 |
| 12 | Hunter's Kit | 1× Wolf Leather (73), 1× Bear Leather (91), 10× Nails (10) | 174 | 200 | 1.15× | ⚠️ BV 200→280 |
| 13 | Explorer's Pack | 2× Bear Leather (182), 1× Wolf Leather (73), 1× Wooden Frame (20) | 275 | 320 | 1.16× | ⚠️ BV 320→440 |

**Crafting Stories:**
1. *Two pieces of cured leather stitched into fitted gloves. Animal pelt lining for warmth.*
2. *Cured leather boots with pelt lining. Keeps feet dry and warm on the road.*
3. *Three-panel leather backpack riveted shut. Holds a day's supplies and more.*
4. *Leather pouch stitched watertight with pelt cord. Carries a day's water.*
5. *Wolf leather gloves lined with cured leather. Superior grip and protection.*
6. *Wolf leather boots with cured leather inner. Tough enough for rough terrain.*
7. *Multi-pocket belt on a wooden frame. Holds tools within easy reach.*
8. *Kit of leather patches, nails, and tools. For field repairs to leather gear.*
9. *Large wolf leather pack with cured leather compartments and wooden frame. The adventurer's home on their back.*
10. *Forearm guards of thick bear hide. Turns aside claws and blades alike.*
11. *Bear leather boots with wolf leather reinforcement. Built for the deepest wilderness.*
12. *A complete kit: skinning tools, repair supplies, trap components. The hunter's trade in a bag.*
13. *Massive bear leather pack with wolf leather straps, wooden frame. Carries everything.*

### LEATHERWORKER Summary

- **13 recipes designed:** 4 Apprentice, 5 Journeyman, 4 Craftsman
- **4/13 within target (31%)** — LEATHERWORKER has pricing issues
- **9 base_value adjustments needed** — Apprentice BVs too low, Craftsman BVs too low
- **Root cause:** Cured Leather (18g) and Bear Leather (91g) are expensive intermediates. Base_values were set with approximate input costs in the YAML comments but several are still underwater.
- **0 new materials, 0 encounter drops**
- **Cross-profession buys:** TANNER (all 3 leather types), WOODWORKER (Wooden Frame), SMELTER (Nails), HUNTER (Animal Pelts)
- **Note:** Wooden Frame BV itself needs adjustment (currently 20g, proposed 58g). If WF rises, LEATHERWORKER input costs rise too — BVs here assume current WF at 20g. Recalculate after WOODWORKER BV fixes.

---

## 8. MASON (12 recipes — Review/New)

**Role:** Stone processing + housing construction. Supplies building materials.
**Buys from:** MINER (Stone Blocks, Clay, Marble, Coal), SMELTER (Iron Ingot)
**Sells to:** Players (housing items), BUILDER (future)

### Apprentice (5 recipes)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Cut Stone (raw) | 2× Stone Blocks (14) | 14 | 12 | 0.86× | ⚠️ BV 12→19 |
| 2 | Cut Stone (blocks) | 3× Stone Blocks (21) | 21 | 15 | 0.71× | ⚠️ BV 15→28 |
| 3 | Cut Sandstone | 3× Stone Blocks (21), 1× Coal (12) | 33 | 18 | 0.55× | ⚠️ BV 18→50 |
| 4 | Bricks (clay) | 3× Clay (12), 1× Coal (12) | 24 | 15 | 0.63× | ⚠️ BV 15→33 |
| 5 | Stone Slab | 4× Stone Blocks (28), 1× Coal (12) | 40 | 25 | 0.63× | ⚠️ BV 25→55 |

**CRITICAL: ALL 5 Apprentice recipes are UNDERWATER.** Stone Blocks (7g) are expensive for bulk processing, and Coal (12g) as fuel adds up. Base_values were set far too low.

### Journeyman (5 recipes)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 6 | Bricks (fired) | 5× Clay (20), 2× Coal (24) | 44 | 20 | 0.45× | ⚠️ BV 20→65 |
| 7 | Stone Hearth | 4× Stone Blocks (28), 2× Iron Fittings (16), 1× Coal (12) | 56 | 60 | 1.07× | ⚠️ BV 60→82 |
| 8 | Clay Pot | 2× Clay (8), 1× Coal (12) | 20 | 30 | 1.50× | 🆕 |
| 9 | Brick Oven | 8× Clay (32), 3× Iron Fittings (24), 2× Coal (24) | 80 | 90 | 1.13× | ⚠️ BV 90→120 |
| 10 | Stone Fountain | 8× Stone Blocks (56), 2× Iron Ingot (104), 3× Coal (36) | 196 | 200 | 1.02× | ⚠️ BV 200→295 |

### Craftsman (2 recipes)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 11 | Polished Marble | 2× Marble (30), 1× Coal (12) | 42 | 50 | 1.19× | ⚠️ BV 50→65 |
| 12 | Marble Statue | 4× Marble (60), 2× Iron Fittings (16), 2× Coal (24) | 100 | 350 | 3.50× | ⚠️ ¹ |

¹ Marble Statue at 3.50× is wildly above Craftsman ceiling (1.8×). Add inputs: 6× Marble (90) + 2× Iron Fittings (16) + 3× Coal (36) + 1× Gemstones (25) = 167g → 350/167 = 2.10× — still above. Flag BV 350→280g → 280/167 = 1.68× ✅

**Crafting Stories:**
1. *Raw stone chipped and squared. The most basic building material.*
2. *Stone blocks precisely cut to uniform size. For walls and foundations.*
3. *Stone heated with coal and sanded smooth. Warm golden finish.*
4. *Clay formed into bricks and kiln-dried. Strong, stackable, cheap.*
5. *Thick stone slab leveled and polished. Flooring, countertops, gravestones.*
6. *Clay bricks fired at high temperature. Premium building material.*
7. *Stone hearth with iron grate and chimney fittings. Warms a home, cooks meals.*
8. *Simple clay pot thrown on a wheel and fired. Holds water, soup, or flowers.*
9. *A brick oven with iron door and chimney fittings. Essential for any bakery or kitchen.*
10. *Carved stone basin with iron plumbing. A town square centerpiece.*
11. *Marble polished to a mirror shine. For luxury construction and decoration.*
12. *A marble figure with iron armature, gem-inset eyes. Artistry in stone.*

### MASON Summary

- **12 recipes designed:** 5 Apprentice, 5 Journeyman, 2 Craftsman
- **ONLY 1/12 within target (8%)** — MASON is THE most broken profession
- **11 base_value adjustments needed** — all Apprentice and most Journeyman underwater
- **Root cause:** Stone Blocks (7g) and Coal (12g) make bulk processing expensive, but BVs were set in the 12-25g range for processed stone. A recipe needing 3 stone blocks + 1 coal = 33g minimum, but output BVs are 15-25g.
- **Fix strategy:** Massive BV increases needed. Cut Stone should be ~19-28g, Bricks ~33-65g, Stone Slab ~55g. Housing items need 1.4-1.8× their input costs.
- **Cross-profession buys:** MINER (stone, clay, marble, coal), SMELTER (Iron Ingot, Iron Fittings)

---

## 9. ALCHEMIST (11 recipes — P0 Fix Required)

**Role:** Brews potions and elixirs from herbs and minerals. THE underwater profession.
**Buys from:** HERBALIST (Wild Herbs, Medicinal Herbs, Glowcap Mushrooms), FARMER (Wild Berries), MINER (Clay)
**Sells to:** Players (consumable potions, combat buffs)

**v5 Audit Status:** 8/11 recipes underwater. P0 priority fix.

### Apprentice (3 recipes, L3-L4)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Minor Healing Potion | 2× Wild Herbs (10), 1× Clay (4) | 14 | 12 | 0.86× | ⚠️ BV 12→19 |
| 2 | Antidote | 2× Wild Herbs (10) | 10 | 10 | 1.00× | ⚠️ BV 10→14 |
| 3 | Berry Salve | 2× Wild Berries (6), 1× Wild Herbs (5) | 11 | 10 | 0.91× | ⚠️ BV 10→15 |

### Journeyman (4 recipes, L5-L6)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 4 | Healing Potion | 3× Wild Herbs (15), 1× Clay (4) | 19 | 22 | 1.16× | ⚠️ BV 22→27 |
| 5 | Elixir of Strength | 2× Wild Herbs (10), 1× Medicinal Herbs (28) | 38 | 25 | 0.66× | ⚠️ BV 25→55 |
| 6 | Elixir of Wisdom | 2× Wild Herbs (10), 1× Medicinal Herbs (28) | 38 | 25 | 0.66× | ⚠️ BV 25→55 |
| 7 | Poison Resistance Tonic | 2× Wild Herbs (10), 1× Wild Berries (3) | 13 | 20 | 1.54× | ✅ |

### Craftsman (4 recipes, L7-L8)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 8 | Greater Healing Potion | 2× Medicinal Herbs (56), 1× Clay (4) | 60 | 55 | 0.92× | ⚠️ BV 55→85 |
| 9 | Elixir of Fortitude | 1× Medicinal Herbs (28), 1× Glowcap Mushrooms (32), 1× Clay (4) | 64 | 60 | 0.94× | ⚠️ BV 60→95 |
| 10 | Glowcap Extract | 2× Glowcap Mushrooms (64) | 64 | 50 | 0.78× | ⚠️ BV 50→95 |
| 11 | Universal Antidote | 1× Medicinal Herbs (28), 1× Glowcap Mushrooms (32), 1× Wild Herbs (5) | 65 | 65 | 1.00× | ⚠️ BV 65→100 |

**Crafting Stories:**
1. *Wild herbs steeped and strained into a clay vial. Heals minor wounds.*
2. *Herb-based antidote. Neutralizes common poisons. Every adventurer carries one.*
3. *Crushed berries mixed with healing herbs. Applied topically to burns and cuts.*
4. *Concentrated herbal solution in a clay flask. Proper battlefield medicine.*
5. *Rare medicinal herbs brewed into a muscle-enhancing elixir. Grants temporary strength.*
6. *Medicinal brew that sharpens the mind. Wizards swear by it before spellcasting.*
7. *Simple herbal tonic that builds poison resistance. Cheap but effective.*
8. *Concentrated medicinal extract in a clay flask. Heals serious combat wounds.*
9. *Glowcap mushroom essence combined with medicinal herbs. Grants physical endurance.*
10. *Pure glowcap concentrate. Luminescent and potent — a reagent for higher alchemy.*
11. *Universal cure combining three rare herb types. Cures any natural poison or disease.*

### ALCHEMIST Fix Plan

**Problem:** 8/11 recipes are at or below break-even. Medicinal Herbs (28g) and Glowcap Mushrooms (32g) are expensive inputs. Craftsman recipes require 60-65g in inputs but output 50-65g. Even Apprentice recipes with Wild Herbs (5g each) only produce 10-12g output.

**Root cause:** Potions were priced as cheap consumables (10-65g range) without considering that their herbal inputs are expensive. Medicinal Herbs at 28g means any recipe using them needs 40g+ output minimum.

**Proposed base_value adjustments:**

| Recipe | Current BV | Input Cost | Current Ratio | Proposed BV | New Ratio |
|--------|-----------|-----------|---------------|-------------|-----------|
| Minor Healing Potion | 12 | 14 | 0.86× | 19 | 1.36× |
| Antidote | 10 | 10 | 1.00× | 14 | 1.40× |
| Berry Salve | 10 | 11 | 0.91× | 15 | 1.36× |
| Healing Potion | 22 | 19 | 1.16× | 27 | 1.42× |
| Elixir of Strength | 25 | 38 | 0.66× | 55 | 1.45× |
| Elixir of Wisdom | 25 | 38 | 0.66× | 55 | 1.45× |
| Greater Healing Potion | 55 | 60 | 0.92× | 85 | 1.42× |
| Elixir of Fortitude | 60 | 64 | 0.94× | 95 | 1.48× |
| Glowcap Extract | 50 | 64 | 0.78× | 95 | 1.48× |
| Universal Antidote | 65 | 65 | 1.00× | 100 | 1.54× |

**After fix:** 10/11 profitable (Poison Resistance Tonic was already fine), 1 adjusted to 1.36× (Minor HP). ALCHEMIST becomes a viable consumables profession. Average margin rises from 0.90× to 1.43×.

**Additional recommendation:** Consider adding Spider Venom (12g, encounter drop) as optional Craftsman input to give ALCHEMIST an encounter-material recipe. Example: "Venom Antidote" — 1× Spider Venom (12) + 1× Medicinal Herbs (28) + 1× Wild Herbs (5) = 45g → BV 70g = 1.56×.

### ALCHEMIST Summary

- **11 recipes reviewed:** 3 Apprentice, 4 Journeyman, 4 Craftsman
- **1/11 within target (9%)** — ALCHEMIST is critically underwater (P0)
- **10 base_value adjustments needed** — across all tiers
- **0 new materials, 0 encounter drops** (recommend adding Spider Venom recipe)
- **Cross-profession buys:** HERBALIST (herbs, mushrooms), FARMER (berries), MINER (clay)

---

## 10. ENCHANTER (13 recipes — Review/Enhance)

**Role:** Imbues items with magical properties via enchantment scrolls. Requires magical components.
**Buys from:** HERBALIST (Arcane Reagents), MINER (Coal, Gemstones), SMELTER (Iron/Silver Ingots), Monster Encounters (magical components)
**Sells to:** Players (enchantment scrolls to apply to weapons/armor)

### Apprentice (1 recipe)

| # | Recipe | Magical Inputs | Mundane Inputs | Mag$ | Mun$ | Total | BV | Ratio | Status |
|---|--------|---------------|----------------|------|------|-------|-----|-------|--------|
| 1 | Fortified Scroll | 2× Living Bark (16) | 1× Iron Ingot (52), 1× Coal (12) | 16 | 64 | 80 | 80 | 1.00× | ⚠️ BV 80→110 |

**Note:** Mundane inputs not specified in YAML for original 9 recipes. Design proposed here.

### Journeyman (6 recipes)

| # | Recipe | Magical Inputs | Mundane Inputs | Mag$ | Mun$ | Total | BV | Ratio | Status |
|---|--------|---------------|----------------|------|------|-------|-----|-------|--------|
| 2 | Flaming Scroll | 2× Ember Core (30) | 1× Iron Ingot (52), 2× Coal (24) | 30 | 76 | 106 | 130 | 1.23× | ⚠️ BV 130→155 |
| 3 | Frost Scroll | 2× Frost Essence (30) | 1× Iron Ingot (52), 2× Coal (24) | 30 | 76 | 106 | 130 | 1.23× | ⚠️ BV 130→155 |
| 4 | Lightning Scroll | 2× Storm Feather (30) | 1× Silver Ingot (72), 1× Coal (12) | 30 | 84 | 114 | 175 | 1.54× | 🔧 |
| 5 | Swift Scroll | 1× Ogre Sinew (12), 1× Wind Mote (12) | 1× Silver Ingot (72), 1× Arcane Reagents (35) | 24 | 107 | 131 | 160 | 1.22× | ⚠️ BV 160→195 |
| 6 | Poisoned Scroll | 3× Spider Venom (36) | 1× Iron Ingot (52), 1× Arcane Reagents (35) | 36 | 87 | 123 | 200 | 1.63× | 🔧 |
| 7 | Warding Scroll | 1× Basilisk Scale (25) | 1× Silver Ingot (72), 1× Arcane Reagents (35), 1× Coal (12) | 25 | 119 | 144 | 210 | 1.46× | 🔧 |

### Craftsman (4 recipes — 2 original + 2 new with mundane_inputs)

| # | Recipe | Magical Inputs | Mundane Inputs | Mag$ | Mun$ | Total | BV | Ratio | Status |
|---|--------|---------------|----------------|------|------|-------|-----|-------|--------|
| 8 | Holy Scroll | 2× Fey Tear (70) | 1× Silver Ingot (72), 1× Arcane Reagents (35), 2× Coal (24) | 70 | 131 | 201 | 450 | 2.24× | ⚠️ ¹ |
| 9 | Shadow Scroll | 2× Shadow Essence (60) | 1× Silver Ingot (72), 1× Arcane Reagents (35), 1× Gemstones (25) | 60 | 132 | 192 | 450 | 2.34× | ⚠️ ¹ |
| 10 | Earthen Scroll | 3× Earth Crystal (36) | 1× Iron Ingot (52), 1× Arcane Reagents (35), 2× Coal (24) | 36 | 111 | 147 | 250 | 1.70× | ✅ |
| 11 | Vitality Scroll | 2× Heartwood Sap (20), 1× Troll Blood (15) | 1× Arcane Reagents (35), 1× Silver Ingot (72) | 35 | 107 | 142 | 220 | 1.55× | ✅ |

¹ Holy and Shadow scrolls at 2.24–2.34× are above Craftsman ceiling. Add more inputs or reduce BV. Propose BV 450→340g → 340/201 = 1.69× ✅ for Holy; BV 450→330g → 330/192 = 1.72× ✅ for Shadow.

### Expert (2 recipes — new, already have mundane_inputs in YAML)

| # | Recipe | Magical Inputs | Mundane Inputs | Mag$ | Mun$ | Total | BV | Ratio | Status |
|---|--------|---------------|----------------|------|------|-------|-----|-------|--------|
| 12 | Nature's Ward Scroll | 2× Living Bark (16), 1× Heartwood Sap (10), 1× Fey Tear (35) | 1× Arcane Reagents (35), 1× Silver Ingot (72) | 61 | 107 | 168 | 300 | 1.79× | ✅ |
| 13 | True Sight Scroll | 2× Basilisk Eye (40) | 1× Gemstones (25), 1× Arcane Reagents (35), 1× Silver Ingot (72), 2× Coal (24) | 40 | 156 | 196 | 350 | 1.79× | ✅ |

**Crafting Stories:**
1. *Living bark ground into the ink, iron dust for binding. Fortifies the enchanted item's structure.*
2. *Ember cores crushed and mixed with iron shavings. Fire leaps from the scroll when applied.*
3. *Frost essence crystallized onto an iron plate. Freezing magic trapped in parchment.*
4. *Storm feathers dissolved in silver solution. Lightning crackles within the sealed scroll.*
5. *Ogre sinew and wind mote woven into silver thread. Grants supernatural speed.*
6. *Spider venom distilled with arcane reagents. A cruel enchantment for cruel weapons.*
7. *Basilisk scale dissolved in silver and reagents. Creates a protective ward on equipment.*
8. *Fey tears mixed with silver in a sacred ritual. Holy radiance infuses the target.*
9. *Shadow essence swirled with silver and gemstone dust. Darkness clings to the enchanted item.*
10. *Earth crystals melted into iron. Grants the resilience of stone itself.*
11. *Heartwood sap and troll blood preserve the body. Vitality courses through the enchanted item.*
12. *Ancient fey magic woven with living bark. Nature itself shields the bearer.*
13. *Basilisk eyes ground with gems and silver. Reveals hidden truths and unseen foes.*

### ENCHANTER Summary

- **13 recipes reviewed:** 1 Apprentice, 6 Journeyman, 4 Craftsman, 2 Expert
- **6/13 within target (46%)** — mid-range viability
- **7 recipes need adjustment:** 5 need BV increases (mundane inputs make them expensive), 2 need BV decreases (Holy/Shadow too generous)
- **Mundane inputs designed for 9 original recipes** — these were missing from YAML. Each uses 1× ingot + coal/reagents as base mundane materials.
- **Magical component cost as % of total:** ranges from 18% (Warding) to 34% (Earthen), averaging ~25%. This means 75% of enchanting cost is mundane materials, with magical components as the special ingredient.
- **Cross-profession buys:** SMELTER (ingots), HERBALIST (Arcane Reagents), MINER (Coal, Gemstones), Monster Encounters (10 different magical components)

---

## 11. SCRIBE (11 recipes — Review/Enhance)

**Role:** Creates scrolls, maps, and books. Magical scrolls are single-use combat items.
**Buys from:** WOODWORKER (Softwood Planks), HERBALIST (herbs, reagents, Medicinal Herbs), Monster Encounters (magical components)
**Sells to:** Players (combat scrolls, maps)

### Apprentice (1 recipe)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Area Map | 2× Softwood Planks (6), 1× Wild Herbs (5) | 11 | 20 | 1.82× | ⚠️ ¹ |

¹ Area Map at 1.82× above Apprentice ceiling. Add input: 2× Softwood Planks (6) + 1× Wild Herbs (5) + 1× Wood Logs (5) = 16g → 20/16 = 1.25× ⚠️ below. Best to keep simple inputs and flag BV 20→15g → 15/11 = 1.36× ✅.

### Journeyman (6 recipes — each has 1 magical component + mundane inputs)

| # | Recipe | Magical Input | Mundane Inputs | Mag$ | Mun$ | Total | BV | Ratio | Status |
|---|--------|-------------|----------------|------|------|-------|-----|-------|--------|
| 2 | Scroll of Fire | 1× Ember Core (15) | 2× Softwood Planks (6), 1× Arcane Reagents (35) | 15 | 41 | 56 | 60 | 1.07× | ⚠️ BV 60→82 |
| 3 | Identification Scroll | 1× Wisp Mote (8) | 2× Softwood Planks (6), 1× Wild Herbs (5) | 8 | 11 | 19 | 50 | 2.63× | ⚠️ ² |
| 4 | Scroll of Ice | 1× Frost Essence (15) | 2× Softwood Planks (6), 1× Arcane Reagents (35) | 15 | 41 | 56 | 80 | 1.43× | 🔧 |
| 5 | Scroll of Healing | 1× Troll Blood (15) | 2× Softwood Planks (6), 1× Medicinal Herbs (28) | 15 | 34 | 49 | 100 | 2.04× | ⚠️ BV 100→75 |
| 6 | Dungeon Map | 1× Spectral Dust (10) | 2× Softwood Planks (6), 1× Arcane Reagents (35) | 10 | 41 | 51 | 80 | 1.57× | 🔧 |
| 7 | Scroll of Lightning | 1× Storm Feather (15) | 2× Softwood Planks (6), 1× Arcane Reagents (35) | 15 | 41 | 56 | 120 | 2.14× | ⚠️ BV 120→85 |

² Identification Scroll at 2.63× is wildly above target. Input of just 1 Wisp Mote + 2 planks + herbs = 19g for a 50g scroll. Add: 1× Arcane Reagents (35) to inputs → 54g → 50/54 = 0.93× ⚠️ now underwater. Best: keep mundane inputs cheap, flag BV 50→28g → 28/19 = 1.47× ✅.

### Craftsman (4 recipes — new, already have mundane_inputs in YAML)

| # | Recipe | Magical Inputs | Mundane Inputs | Mag$ | Mun$ | Total | BV | Ratio | Status |
|---|--------|---------------|----------------|------|------|-------|-----|-------|--------|
| 8 | Scroll of Stone Skin | 1× Earth Crystal (12) | 1× Arcane Reagents (35), 2× Softwood Planks (6) | 12 | 41 | 53 | 90 | 1.70× | ✅ |
| 9 | Scroll of Might | 1× Ogre Sinew (12) | 1× Arcane Reagents (35), 2× Softwood Planks (6) | 12 | 41 | 53 | 85 | 1.60× | ✅ |
| 10 | Scroll of Entangle | 1× Living Bark (8), 1× Dryad Blossom (15) | 1× Medicinal Herbs (28), 1× Softwood Planks (3) | 23 | 31 | 54 | 100 | 1.85× | ✅ |
| 11 | Scroll of Restoration | 1× Fey Tear (35), 1× Troll Blood (15) | 1× Medicinal Herbs (28), 1× Softwood Planks (3) | 50 | 31 | 81 | 130 | 1.60× | ✅ |

**Crafting Stories:**
1. *Herb-ink map of the local area on softwood parchment. Invaluable for newcomers.*
2. *Ember Core ash mixed with reagent ink on wooden scroll. Unleashes a burst of flame.*
3. *Wisp-light ink on softwood parchment. Reveals an item's true properties.*
4. *Frost essence crystallized into scroll ink. Freezes foes on impact.*
5. *Troll blood mixed with medicinal herb paste. Scroll heals wounds when read aloud.*
6. *Spectral dust traces invisible dungeon paths. Reveals hidden rooms and traps.*
7. *Storm feather quill writes its own lightning. Scroll crackles with electrical power.*
8. *Earth crystal ink hardens the reader's skin to stone. Temporary but potent armor.*
9. *Ogre sinew ground into the ink. Grants supernatural muscular strength.*
10. *Living bark and dryad blossom ink. Vines erupt from the ground, entangling foes.*
11. *Fey tear and troll blood — life restored through two magics. The most potent healing scroll.*

### SCRIBE Summary

- **11 recipes reviewed:** 1 Apprentice, 6 Journeyman, 4 Craftsman
- **6/11 within target (55%)** — best of the review professions
- **5 adjustments needed:** Area Map and Identification Scroll BVs too high, Scroll of Fire too low, Scroll of Healing and Lightning too high
- **Mundane inputs designed for 7 original recipes** — 2× Softwood Planks + 1× Arcane Reagents (or herbs) as standard base
- **Magical component cost as % of total:** 15–62%, averaging ~30%
- **Cross-profession buys:** WOODWORKER (Softwood Planks), HERBALIST (herbs, reagents, Medicinal Herbs), Monster Encounters (8 magical components)

---

## 12. COOK (25 recipes — Review)

**Role:** Transforms raw ingredients into HP-restoring meals and buff food. Most connected crafter.
**Buys from:** FARMER (Grain, Apples, Berries, Vegetables), FISHERMAN (Fish, Trout, Perch), HERBALIST (Wild Herbs), RANCHER (Eggs, Milk), HUNTER (Game Meat), LUMBERJACK (Wood Logs for fuel)
**Sells to:** Players (consumable food), INNKEEPER

### Apprentice (8 recipes, L3-L4)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 1 | Flour | 2× Grain (6), 1× Wood Logs (5) | 11 | 5 | 0.45× | ⚠️ ¹ |
| 2 | Apple Sauce | 3× Apple (9), 1× Wood Logs (5) | 14 | 8 | 0.57× | ⚠️ BV 8→19 |
| 3 | Porridge | 2× Grain (6), 1× Wood Logs (5) | 11 | 7 | 0.64× | ⚠️ BV 7→15 |
| 4 | Berry Jam | 3× Wild Berries (9), 1× Wood Logs (5) | 14 | 6 | 0.43× | ⚠️ ² |
| 5 | Grilled Fish | 2× Raw Fish (8), 1× Wood Logs (5) | 13 | 10 | 0.77× | ⚠️ BV 10→17 |
| 6 | Herbal Tea | 2× Wild Herbs (10), 1× Wood Logs (5) | 15 | 10 | 0.67× | ⚠️ BV 10→20 |
| 7 | Vegetable Stew | 3× Vegetables (9), 1× Wood Logs (5) | 14 | 8 | 0.57× | ⚠️ BV 8→19 |
| 8 | Scrambled Eggs | 3× Eggs (15), 1× Wood Logs (5) | 20 | 12 | 0.60× | ⚠️ BV 12→27 |

¹ Flour is an intermediate — consumed by higher-tier recipes. Value is in enabling Bread/Pie/Feast, not resale. 0.45× is intentional — accept as processing step.
² Berry Jam is also an intermediate — consumed by Berry Tart, Fisherman's Banquet. Accept 0.43× as processing step. But note: if COOK sells Flour or Berry Jam on market, they lose money. This is by design — intermediates should be used, not sold.

**COOK Apprentice is problematic:** Even finished goods (Apple Sauce, Porridge, Stew) are underwater because Wood Logs at 5g add up and raw ingredient costs (3-5g each × 2-3) total 11-20g while output BVs are 6-12g. Food was priced as cheap consumables without factoring in actual ingredient costs.

### Journeyman (8 recipes, L5-L6)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 9 | Bread Loaf | 2× Flour (10), 1× Wood Logs (5) | 15 | 12 | 0.80× | ⚠️ BV 12→20 |
| 10 | Apple Pie | 1× Flour (5), 3× Apple (9), 1× Wood Logs (5) | 19 | 18 | 0.95× | ⚠️ BV 18→27 |
| 11 | Fish Stew | 2× Raw Fish (8), 1× Wild Herbs (5), 1× Wood Logs (5) | 18 | 16 | 0.89× | ⚠️ BV 16→25 |
| 12 | Smoked Fish | 3× Raw Fish (12), 2× Wood Logs (10) | 22 | 18 | 0.82× | ⚠️ BV 18→31 |
| 13 | Seasoned Roast Veg | 2× Vegetables (6), 1× Wild Herbs (5), 1× Wood Logs (5) | 16 | 14 | 0.88× | ⚠️ BV 14→23 |
| 14 | Berry Tart | 1× Flour (5), 1× Berry Jam (6), 1× Wood Logs (5) | 16 | 16 | 1.00× | ⚠️ BV 16→23 |
| 15 | Creamy Porridge | 2× Grain (6), 1× Milk (6), 1× Wood Logs (5) | 17 | 14 | 0.82× | ⚠️ BV 14→24 |
| 16 | Farm Breakfast | 2× Eggs (10), 1× Milk (6), 1× Wood Logs (5) | 21 | 22 | 1.05× | ⚠️ BV 22→30 |

### Craftsman (9 recipes, L7+)

| # | Recipe | Inputs | In$ | BV | Ratio | Status |
|---|--------|--------|-----|-----|-------|--------|
| 17 | Harvest Feast | 1× Bread Loaf (12), 2× Apple (6), 2× Wild Herbs (10), 1× Wood Logs (5) | 33 | 35 | 1.06× | ⚠️ BV 35→50 |
| 18 | Fisherman's Banquet | 1× Grilled Fish (10), 1× Bread Loaf (12), 1× Berry Jam (6), 1× Wood Logs (5) | 33 | 32 | 0.97× | ⚠️ BV 32→50 |
| 19 | Spiced Pastry | 2× Flour (10), 1× Wild Herbs (5), 1× Wild Berries (3), 1× Wood Logs (5) | 23 | 40 | 1.74× | ✅ |
| 20 | Pan-Seared Trout | 1× River Trout (22), 1× Wild Herbs (5), 1× Wood Logs (5) | 32 | 45 | 1.41× | ⚠️ BV 45→50 |
| 21 | Perch Feast | 1× Lake Perch (25), 2× Wild Herbs (10), 1× Wood Logs (5) | 40 | 50 | 1.25× | ⚠️ BV 50→62 |
| 22 | Fisherman's Pie | 1× River Trout (22), 1× Flour (5), 1× Wild Herbs (5), 1× Wood Logs (5) | 37 | 55 | 1.49× | ✅ |
| 23 | Smoked Trout Rations | 2× River Trout (44), 2× Wood Logs (10) | 54 | 40 | 0.74× | ⚠️ BV 40→80 |
| 24 | MISSING: Game Roast | 2× Wild Game Meat (10), 1× Wild Herbs (5), 1× Wood Logs (5) | 20 | — | — | PROPOSED: BV 30 (1.50×) |
| 25 | MISSING: Egg Custard | 3× Eggs (15), 1× Milk (6), 1× Flour (5) | 26 | — | — | PROPOSED: BV 40 (1.54×) |

**Notes on recipes 24-25:** The YAML lists 25 COOK recipes but only 23 have full specifications in the cook_recipes section. I've proposed two additional recipes using underutilized ingredients (Wild Game Meat from HUNTER, and Eggs/Milk from RANCHER) to reach the stated count.

**Crafting Stories (selected):**
- *Flour: Grain ground between stones. The foundation of all baking.*
- *Grilled Fish: Simply grilled over an open flame. Much better than raw.*
- *Bread Loaf: A crusty golden loaf. The staff of life.*
- *Apple Pie: Warm pie with flaky crust. A countryside classic.*
- *Harvest Feast: Grand platter of bread, roasted fruit, and herbs. Fit for a lord.*
- *Spiced Pastry: Delicate pastry layered with herbed honey and berry filling.*
- *Pan-Seared Trout: Premium freshwater trout seared with herbs. A delicacy.*
- *Smoked Trout Rations: Trail food that lasts. Essential for long journeys.*

### COOK Summary

- **25 recipes reviewed:** 8 Apprentice, 8 Journeyman, 9 Craftsman
- **3/25 within target (12%)** — COOK is severely underwater across the board
- **20 base_value adjustments needed** — nearly every recipe
- **Root cause:** Food was priced as cheap consumables (6-55g) without factoring in ingredient costs. Wood Logs (5g) as mandatory fuel in every recipe adds up. Even cheap ingredients (3g each × 3 = 9g) + fuel (5g) = 14g, but Apprentice output BVs are 6-12g.
- **Mitigating factor:** Food grants HP restoration and buffs. The "value" to players exceeds base_value — players buy food for the combat/healing utility, not resale. However, COOKs still need to be profitable or nobody will choose the profession.
- **Fix strategy:** Raise BVs across the board. Apprentice food should be 15-27g, Journeyman 20-31g, Craftsman 40-80g. This makes food more expensive for players but makes COOK viable as a profession.
- **2 new recipes proposed** (Game Roast, Egg Custard) to reach stated 25 count

---

## 13. BREWER (9 recipes — Review)

**Role:** Brews ales, ciders, wines, and cordials. Beverages grant stat buffs.
**Buys from:** FARMER (Grain, Apples, Berries, Hops, Grapes), HERBALIST (Wild Herbs)
**Sells to:** Players (buff drinks), INNKEEPER

| # | Recipe | Tier | Inputs | In$ | BV | Out Qty | Out$ | Ratio | Status |
|---|--------|------|--------|-----|-----|---------|------|-------|--------|
| 1 | Ale | App L3 | 3× Grain (9) | 9 | 6 | 2 | 12 | 1.33× | ✅ |
| 2 | Apple Cider | App L3 | 3× Apple (9) | 9 | 6 | 2 | 12 | 1.33× | ✅ |
| 3 | Berry Cordial | App L4 | 3× Wild Berries (9), 1× Grain (3) | 12 | 8 | 2 | 16 | 1.33× | ✅ |
| 4 | Strong Ale | Jour L5 | 4× Grain (12), 1× Wild Herbs (5) | 17 | 12 | 2 | 24 | 1.41× | ✅ |
| 5 | Mulled Cider | Jour L5 | 3× Apple (9), 2× Wild Herbs (10) | 19 | 14 | 2 | 28 | 1.47× | ✅ |
| 6 | Herbal Brew | Jour L6 | 3× Wild Herbs (15), 2× Grain (6) | 21 | 15 | 2 | 30 | 1.43× | ✅ |
| 7 | Hopped Beer | Craft L7 | 3× Grain (9), 2× Hops (10) | 19 | 15 | 2 | 30 | 1.58× | ✅ |
| 8 | Grape Wine | Craft L7 | 4× Grapes (16) | 16 | 15 | 2 | 30 | 1.88× | ⚠️ ¹ |
| 9 | Pale Ale | Craft L8 | 3× Grain (9), 2× Hops (10), 1× Wild Herbs (5) | 24 | 18 | 2 | 36 | 1.50× | ✅ |

¹ Grape Wine at 1.88× is slightly above Craftsman ceiling (1.8×). Grapes at 4g each are very cheap. Add 1× Wild Herbs (5) to input → 21g → 30/21 = 1.43× ✅.

### BREWER Summary

- **9 recipes reviewed:** 3 Apprentice, 3 Journeyman, 3 Craftsman
- **8/9 within target (89%)** — BREWER is the healthiest profession in the game
- **1 minor adjustment:** Grape Wine slightly above ceiling
- **Key insight:** BREWER works because all outputs are 2× quantity per craft. This doubles effective revenue. Also, BREWER inputs are the cheapest in the game (Grain 3g, Apple 3g, Berries 3g, Grapes 4g). No expensive intermediates.
- **Cross-profession buys:** FARMER (5 ingredients), HERBALIST (Wild Herbs)

---

## 14. TANNER (15 recipes — Review)

**Role:** Two-step pipeline: pelts → leather → finished goods. Central leather supplier.
**Buys from:** HUNTER (Animal Pelts, Wolf Pelts, Bear Hides), WOODWORKER (Tanning Rack as tool)
**Sells to:** LEATHERWORKER, ARMORER, TAILOR, FLETCHER, Players

TANNER has full inputs specified in YAML. Quick verification:

| # | Recipe | Tier | Inputs | In$ | BV | Ratio | Status |
|---|--------|------|--------|-----|-----|-------|--------|
| 1 | Cured Leather | Processing | 2× Animal Pelts (16), 1× Wood Logs (5) | 21 | 18 | 0.86× | ⚠️ ¹ |
| 2 | Wolf Leather | Processing | 2× Wolf Pelts (56), 1× Wood Logs (5) | 61 | 73 | 1.20× | ⚠️ BV 73→82 |
| 3 | Bear Leather | Processing | 2× Bear Hides (70), 1× Wood Logs (5) | 75 | 91 | 1.21× | ⚠️ BV 91→100 |
| 4-15 | (12 finished goods) | App-Craft | Various leather + wood/nails | — | — | — | See v5 audit |

¹ Cured Leather at 0.86× is underwater — this was flagged in v5 audit but accepted because Cured Leather is a processing intermediate consumed by 4 professions. Its value is in enabling downstream recipes. However, a TANNER who only processes pelts into leather loses money. **Recommend BV 18→28g** for market viability, or accept that processing is a loss-leader offset by finished goods margins.

**TANNER v5 audit verdict:** Fixed in v4→v5. 12/15 finished goods are profitable after TANNER rebalance. Processing (3 recipes) is thin/underwater but offset by finished goods. Overall: **Viable**.

### TANNER Summary

- **15 recipes verified:** 3 processing + 12 finished goods
- **Processing margin thin** (0.86–1.21×) — by design, intermediates feed downstream
- **Finished goods healthy** — per v5 audit
- **No changes recommended beyond minor BV bumps to processing**

---

## 15. TAILOR (17 recipes — Review)

**Role:** Spins fibers into cloth, then crafts cloth armor (magicResist specialization).
**Buys from:** RANCHER (Wool, Fine Wool, Silkworm Cocoons), FARMER (Cotton)
**Sells to:** Players (cloth armor with magicResist), ENCHANTER (cloth for padding)

TAILOR has full inputs specified in YAML. Quick verification:

| # | Recipe | Tier | Type | In$ | BV | Ratio | Status |
|---|--------|------|------|-----|-----|-------|--------|
| 1 | Cloth | Processing | 2× Cotton (8) | 8 | 8 | 1.00× | ⚠️ BV-even ¹ |
| 2 | Woven Cloth | Processing | 2× Wool (20) | 20 | 20 | 1.00× | ⚠️ BV-even ¹ |
| 3 | Fine Cloth | Processing | 2× Fine Wool (60) | 60 | 59 | 0.98× | ⚠️ underwater |
| 4 | Silk Fabric | Processing | 2× Silkworm Cocoons (76) | 76 | 75 | 0.99× | ⚠️ underwater |
| 5-17 | (13 armor pieces) | App-Expert | Various cloth + leather | — | — | — | See v5 audit |

¹ TAILOR processing is intentionally break-even — value created in finished goods. This was addressed in v5 audit: Fine Cloth and Silk Fabric are slightly underwater (0.98-0.99×) but margins are razor-thin. Could bump BVs by 1-2g each.

**TAILOR v5 audit verdict:** Fixed in v4→v5 (Wool repriced 15→10g). Processing is break-even by design. Finished cloth armor is profitable. Overall: **Viable**.

### TAILOR Summary

- **17 recipes verified:** 4-5 processing + 12-13 armor
- **Processing break-even** (0.98–1.00×) — by design
- **Finished goods healthy** — cloth armor with magicResist fills a unique niche
- **No changes recommended beyond optional 1-2g bumps to Fine Cloth and Silk Fabric BVs**

---
---

# SUMMARY SECTIONS

---

## A. Cross-Profession Trade Web

```
GATHERING PROFESSIONS (raw material suppliers)
├── MINER → SMELTER (ores, coal) → {BLACKSMITH, ARMORER, JEWELER, MASON, WOODWORKER(nails)}
├── MINER → MASON (stone, clay, marble)
├── MINER → JEWELER (gemstones)
├── MINER → ALCHEMIST (clay)
├── LUMBERJACK → WOODWORKER (all wood) → {FLETCHER, TANNER, LEATHERWORKER, BREWER(barrels)}
├── LUMBERJACK → COOK (wood logs as fuel)
├── LUMBERJACK → SCRIBE (via WOODWORKER softwood planks)
├── HERBALIST → ALCHEMIST (herbs, mushrooms)
├── HERBALIST → COOK (wild herbs)
├── HERBALIST → BREWER (wild herbs)
├── HERBALIST → ENCHANTER (arcane reagents)
├── HERBALIST → SCRIBE (herbs, reagents)
├── HUNTER → TANNER (pelts) → {LEATHERWORKER, ARMORER, FLETCHER, TAILOR}
├── HUNTER → COOK (game meat)
├── FARMER → COOK (grain, apples, berries, vegetables)
├── FARMER → BREWER (grain, apples, berries, hops, grapes)
├── FARMER → TAILOR (cotton)
├── FARMER → ALCHEMIST (berries)
├── RANCHER → COOK (eggs, milk)
├── RANCHER → TAILOR (wool, fine wool, silkworm cocoons)
├── FISHERMAN → COOK (fish, trout, perch)
└── Monster Encounters → ENCHANTER + SCRIBE (magical components)

CROSS-CRAFTER DEPENDENCIES (crafter → crafter)
├── SMELTER → ARMORER (ingots)
├── SMELTER → JEWELER (ingots)
├── SMELTER → MASON (iron fittings)
├── SMELTER → WOODWORKER (nails, iron fittings)
├── SMELTER → ENCHANTER (ingots)
├── TANNER → ARMORER (leather)
├── TANNER → LEATHERWORKER (leather)
├── TANNER → FLETCHER (leather)
├── TANNER → TAILOR (shared intermediate: Cured Leather)
├── WOODWORKER → FLETCHER (staves, planks, dowels)
├── WOODWORKER → LEATHERWORKER (frames, handles)
├── WOODWORKER → TANNER (tanning rack as tool)
├── WOODWORKER → SCRIBE (softwood planks)
├── COOK → COOK (flour, berry jam intermediates)
└── FLETCHER → FLETCHER (bowstring intermediate)
```

**Trade Web Density Score:**
- Every gathering profession feeds 2-6 crafting professions ✅
- Every crafter buys from 2+ professions ✅
- SMELTER is the #1 bottleneck (feeds 5 professions)
- WOODWORKER is #2 (feeds 5 professions: FLETCHER, TANNER, LEATHERWORKER, SCRIBE, BREWER)
- TANNER is #3 (feeds 4 professions: LEATHERWORKER, ARMORER, FLETCHER, TAILOR)
- Monster encounters feed 2 professions (ENCHANTER, SCRIBE) — keeps magical items special

---

## B. New Materials List

| Material | Type | BV | Source | Used By | Notes |
|----------|------|-----|--------|---------|-------|
| — | — | — | — | — | **No new materials needed** |

All 200+ recipes were designed using existing materials from the YAML. The existing material set (51 raw resources, 18 magical components, ~20 intermediates) is comprehensive enough to support all recipes with thematic variety.

---

## C. Base_Value Adjustments

### Critical (Currently Underwater — Must Fix)

| Profession | Recipe | Current BV | Input Cost | Proposed BV | New Ratio | Priority |
|-----------|--------|-----------|-----------|-------------|-----------|----------|
| **MASON** | Cut Stone (raw) | 12 | 14 | 19 | 1.36× | P0 |
| **MASON** | Cut Stone (blocks) | 15 | 21 | 28 | 1.33× | P0 |
| **MASON** | Cut Sandstone | 18 | 33 | 50 | 1.52× | P0 |
| **MASON** | Bricks (clay) | 15 | 24 | 33 | 1.38× | P0 |
| **MASON** | Stone Slab | 25 | 40 | 55 | 1.38× | P0 |
| **MASON** | Bricks (fired) | 20 | 44 | 65 | 1.48× | P0 |
| **MASON** | Stone Hearth | 60 | 56 | 82 | 1.46× | P1 |
| **MASON** | Brick Oven | 90 | 80 | 120 | 1.50× | P1 |
| **MASON** | Stone Fountain | 200 | 196 | 295 | 1.51× | P1 |
| **MASON** | Polished Marble | 50 | 42 | 65 | 1.55× | P1 |
| **ALCHEMIST** | Minor Healing Potion | 12 | 14 | 19 | 1.36× | P0 |
| **ALCHEMIST** | Antidote | 10 | 10 | 14 | 1.40× | P0 |
| **ALCHEMIST** | Berry Salve | 10 | 11 | 15 | 1.36× | P0 |
| **ALCHEMIST** | Healing Potion | 22 | 19 | 27 | 1.42× | P0 |
| **ALCHEMIST** | Elixir of Strength | 25 | 38 | 55 | 1.45× | P0 |
| **ALCHEMIST** | Elixir of Wisdom | 25 | 38 | 55 | 1.45× | P0 |
| **ALCHEMIST** | Greater Healing Potion | 55 | 60 | 85 | 1.42× | P0 |
| **ALCHEMIST** | Elixir of Fortitude | 60 | 64 | 95 | 1.48× | P0 |
| **ALCHEMIST** | Glowcap Extract | 50 | 64 | 95 | 1.48× | P0 |
| **ALCHEMIST** | Universal Antidote | 65 | 65 | 100 | 1.54× | P0 |
| **WOODWORKER** | Wooden Beams | 12 | 12 | 17 | 1.42× | P0 |
| **WOODWORKER** | Barrel | 25 | 37 | 55 | 1.49× | P0 |
| **WOODWORKER** | Furniture | 40 | 42 | 63 | 1.50× | P0 |
| **WOODWORKER** | Wooden Frame | 20 | 39 | 58 | 1.49× | P0 |
| **WOODWORKER** | Tanning Rack | 35 | 39 | 58 | 1.49× | P0 |
| **WOODWORKER** | Wooden Table | 30 | 52 | 78 | 1.50× | P0 |
| **WOODWORKER** | Storage Chest | 45 | 78 | 117 | 1.50× | P0 |
| **WOODWORKER** | Wooden Bed Frame | 50 | 68 | 100 | 1.47× | P0 |
| **WOODWORKER** | Wooden Shield | 35 | 58 | 87 | 1.50× | P0 |
| **WOODWORKER** | Wooden Pickaxe | 12 | 14 | 19 | 1.36× | P1 |
| **WOODWORKER** | Wooden Shelf | 55 | 48 | 75 | 1.56× | P1 |
| **WOODWORKER** | Reinforced Crate | 65 | 86 | 130 | 1.51× | P1 |
| **WOODWORKER** | Hardwood Tower Shield | 80 | 150 | 230 | 1.53× | P1 |
| **COOK** | Apple Sauce | 8 | 14 | 19 | 1.36× | P1 |
| **COOK** | Porridge | 7 | 11 | 15 | 1.36× | P1 |
| **COOK** | Grilled Fish | 10 | 13 | 17 | 1.31× | P1 |
| **COOK** | Herbal Tea | 10 | 15 | 20 | 1.33× | P1 |
| **COOK** | Vegetable Stew | 8 | 14 | 19 | 1.36× | P1 |
| **COOK** | Scrambled Eggs | 12 | 20 | 27 | 1.35× | P1 |
| **COOK** | Bread Loaf | 12 | 15 | 20 | 1.33× | P1 |
| **COOK** | Apple Pie | 18 | 19 | 27 | 1.42× | P1 |
| **COOK** | Fish Stew | 16 | 18 | 25 | 1.39× | P1 |
| **COOK** | Smoked Fish | 18 | 22 | 31 | 1.41× | P1 |
| **COOK** | Seasoned Roast Veg | 14 | 16 | 23 | 1.44× | P1 |
| **COOK** | Berry Tart | 16 | 16 | 23 | 1.44× | P1 |
| **COOK** | Creamy Porridge | 14 | 17 | 24 | 1.41× | P1 |
| **COOK** | Farm Breakfast | 22 | 21 | 30 | 1.43× | P1 |
| **COOK** | Harvest Feast | 35 | 33 | 50 | 1.52× | P1 |
| **COOK** | Fisherman's Banquet | 32 | 33 | 50 | 1.52× | P1 |
| **COOK** | Pan-Seared Trout | 45 | 32 | 50 | 1.56× | P2 |
| **COOK** | Perch Feast | 50 | 40 | 62 | 1.55× | P2 |
| **COOK** | Smoked Trout Rations | 40 | 54 | 80 | 1.48× | P1 |

### Moderate (Above Ceiling — Reduce)

| Profession | Recipe | Current BV | Input Cost | Proposed BV | New Ratio | Priority |
|-----------|--------|-----------|-----------|-------------|-----------|----------|
| **JEWELER** | Silver Ring | 200 | 97 | 155 | 1.60× | P1 |
| **JEWELER** | Circlet of Focus | 350 | 229¹ | 350 | 1.53× | P1 |
| **JEWELER** | Gold Ring | 450 | 235² | 380 | 1.62× | P1 |
| **JEWELER** | Crown of Wisdom | 2000 | 835³ | 1500 | 1.80× | P2 |
| **JEWELER** | Mithril Ring | 2500 | 1475⁴ | 2500 | 1.69× | P2 |
| **ENCHANTER** | Holy Scroll | 450 | 201 | 340 | 1.69× | P1 |
| **ENCHANTER** | Shadow Scroll | 450 | 192 | 330 | 1.72× | P1 |
| **SCRIBE** | Area Map | 20 | 11 | 15 | 1.36× | P2 |
| **SCRIBE** | Identification Scroll | 50 | 19 | 28 | 1.47× | P2 |
| **SCRIBE** | Scroll of Healing | 100 | 49 | 75 | 1.53× | P2 |
| **SCRIBE** | Scroll of Lightning | 120 | 56 | 85 | 1.52× | P2 |
| **MASON** | Marble Statue | 350 | 167⁵ | 280 | 1.68× | P2 |

¹ With revised inputs: 2× Silver Ingot + 2× Gemstones + 1× Arcane Reagents
² With revised inputs: 1× Gold Ingot + 2× Gemstones
³ With revised inputs: 3× Gold Ingot + 4× Gemstones + 2× Fey Tear + 1× Arcane Reagents + 1× Silk Fabric
⁴ With revised inputs: 2× Mithril Ingot + 3× Gemstones + 1× Wyvern Scale
⁵ With revised inputs: 6× Marble + 2× Iron Fittings + 3× Coal + 1× Gemstones

### Minor (BLACKSMITH/ARMORER/FLETCHER adjustments)

| Profession | Recipe | Current BV | Proposed BV | Priority |
|-----------|--------|-----------|-------------|----------|
| BLACKSMITH | Iron Dagger | 15 | 17 | P2 |
| BLACKSMITH | Iron Sword | 22 | 23 | P2 |
| BLACKSMITH | Copper Hoe | 14 | 17 | P2 |
| BLACKSMITH | Iron Battleaxe | 40 | 42 | P2 |
| BLACKSMITH | Silver Longsword | 110 | 120 | P2 |
| BLACKSMITH | Silver Battleaxe | 120 | 125 | P2 |
| BLACKSMITH | Hardwood Tower Shield (BS) | 100 | 108 | P2 |
| ARMORER | Copper Gauntlets | 40 | 45 | P2 |
| ARMORER | Iron Greaves | 160 | 175 | P2 |
| ARMORER | Steel Chestplate | 950 | 1000 | P2 |
| ARMORER | Steel Greaves | 600 | 700 | P2 |
| ARMORER | Adamantine Greaves | 7500 | 8000 | P2 |
| ARMORER | Adamantine Shield | 7000 | 8500 | P2 |
| FLETCHER | Bowstring | 6 | 24 | P1 |
| FLETCHER | Hunting Bow | 30 | 45 | P1 |
| FLETCHER | War Arrows | 5 | 7 | P2 |
| FLETCHER | War Bow | 70 | 155 | P1 |
| FLETCHER | Longbow | 55 | 60 | P2 |
| FLETCHER | Composite Bow | 150 | 200 | P1 |
| FLETCHER | Ranger's Quiver | 120 | 175 | P1 |
| FLETCHER | Ranger's Longbow | 200 | 250 | P1 |
| FLETCHER | Flight Arrows | 6 | 2 | P2 |
| WOODWORKER | Bow Stave | 8 | 11 | P2 |
| WOODWORKER | Carving Knife | 10 | 12 | P2 |
| WOODWORKER | Wooden Chair | 15 | 19 | P2 |
| LEATHERWORKER | Leather Gloves | 52 | 58 | P2 |
| LEATHERWORKER | Leather Boots | 52 | 58 | P2 |
| LEATHERWORKER | Leather Backpack | 60 | 78 | P2 |
| LEATHERWORKER | Leather Waterskin | 30 | 35 | P2 |
| LEATHERWORKER | Toolbelt | 130 | 90 | P2 |
| LEATHERWORKER | Bear Hide Vambraces | 250 | 310 | P2 |
| LEATHERWORKER | Bear Leather Boots | 230 | 260 | P2 |
| LEATHERWORKER | Hunter's Kit | 200 | 280 | P2 |
| LEATHERWORKER | Explorer's Pack | 320 | 440 | P2 |
| JEWELER | Copper Ring | 50 | 55 | P2 |
| JEWELER | Copper Necklace | 60 | 75 | P2 |
| JEWELER | Brooch of Protection | 170 | 180 | P2 |
| JEWELER | Silver Necklace | 250 | 290 | P2 |
| JEWELER | Gold Necklace | 550 | 650 | P2 |
| ENCHANTER | Fortified Scroll | 80 | 110 | P1 |
| ENCHANTER | Flaming Scroll | 130 | 155 | P1 |
| ENCHANTER | Frost Scroll | 130 | 155 | P1 |
| ENCHANTER | Swift Scroll | 160 | 195 | P1 |
| SCRIBE | Scroll of Fire | 60 | 82 | P1 |

**Total BV adjustments: 83 recipes** (across all professions)
- P0 (underwater, must fix): 30 recipes (MASON 10, ALCHEMIST 10, WOODWORKER 10)
- P1 (viability impact): 28 recipes
- P2 (minor tuning): 25 recipes

---

## D. Wyvern Scale Recipe Destination

**Problem:** Wyvern Scale (45g, from Wyvern encounter L18) was an orphan — no recipe consumed it.

**Solution:** Wyvern Scale is now used in **Mithril Ring** (JEWELER Expert):
- Inputs: 2× Mithril Ingot (1400), 3× Gemstones (75), 1× Wyvern Scale (45)
- Total: 1520g → BV 2500g → 1.64× ✅

The wyvern scale serves as the "dragon-touched" element that makes the Mithril Ring extraordinary — a shard of wyvern scale set into the band gives the ring its legendary durability. This is thematically appropriate (wyverns are dragonkin) and economically sound (45g is a meaningful but not dominant cost in a 1520g recipe).

---

## E. YAML Change Summary

### By Change Type

| Type | Count | Details |
|------|-------|---------|
| **New recipe inputs designed** | 73 | BLACKSMITH (28), WOODWORKER (25), FLETCHER (13), JEWELER (12), LEATHERWORKER (13) — note: some overlap with ARMORER |
| **New recipe inputs designed (ARMORER)** | 25 | Full 5-tier armor set with inputs |
| **Mundane inputs designed** | 15 | ENCHANTER 9 original + SCRIBE 6 original (mundane inputs were missing) |
| **Recipes reviewed** | 89 | COOK (25), BREWER (9), SMELTER (11), TANNER (15), TAILOR (17), MASON (12) |
| **Base_value adjustments** | 83 | See section C above |
| **New recipes proposed** | 2 | COOK: Game Roast, Egg Custard |
| **New materials** | 0 | All recipes use existing YAML materials |
| **Encounter drops used** | 3 recipes | Bear Claw (Ranger's Longbow), Spider Silk (Flight Arrows), Wind Mote (Brooch of Speed) |
| **Magical components used** | ~18 recipes | Across ENCHANTER (13), SCRIBE (10), JEWELER (3) |

### By Profession Health

| Profession | Recipes | In Target | Needs BV Fix | Verdict |
|-----------|---------|-----------|-------------|---------|
| SMELTER | 11 | 9 (82%) | 1 flag | ✅ Healthy |
| BREWER | 9 | 8 (89%) | 1 minor | ✅ Healthy |
| TANNER | 15 | 12 (80%) | 3 processing | ✅ Viable (processing thin by design) |
| TAILOR | 17 | 13 (76%) | 4 processing | ✅ Viable (processing break-even by design) |
| BLACKSMITH | 28 | 22 (79%) | 6 minor | ✅ Viable after minor BV tweaks |
| ARMORER | 25 | 19 (76%) | 6 moderate | 🔧 Viable after BV tweaks |
| ENCHANTER | 13 | 6 (46%) | 7 mixed | 🔧 Needs mundane inputs + BV rebalance |
| SCRIBE | 11 | 6 (55%) | 5 mixed | 🔧 Needs mundane inputs + BV rebalance |
| LEATHERWORKER | 13 | 4 (31%) | 9 | ⚠️ Needs BV increases |
| FLETCHER | 13 | 5 (38%) | 8 | ⚠️ Needs BV increases (leather costs) |
| JEWELER | 12 | 3 (25%) | 9 mixed | ⚠️ Needs BV rebalance (both up and down) |
| WOODWORKER | 25 | 7 (28%) | 15 | 🔴 Severely broken — most recipes underwater |
| COOK | 25 | 3 (12%) | 20 | 🔴 Severely broken — food BVs too low |
| MASON | 12 | 1 (8%) | 11 | 🔴 Most broken profession — all stone processing underwater |
| ALCHEMIST | 11 | 1 (9%) | 10 | 🔴 P0 critical — 8/11 underwater |

### Top Priority Fix Order

1. **P0 — MASON** (11 BV fixes): Stone processing is fundamentally broken. Nothing a MASON makes is profitable.
2. **P0 — ALCHEMIST** (10 BV fixes): 8/11 potions underwater. No player will choose ALCHEMIST.
3. **P0 — WOODWORKER** (10 BV fixes): Intermediate items (Barrel, Frame, Beams) are underwater, cascading to LEATHERWORKER and BREWER.
4. **P1 — COOK** (20 BV fixes): Food is core gameplay but COOKs lose money. Raising food prices makes COOK viable but food more expensive.
5. **P1 — FLETCHER** (8 BV fixes): Leather input costs make bows expensive. Bowstring especially needs fixing.
6. **P1 — ENCHANTER/SCRIBE** (12 BV fixes): Mundane inputs now specified but some BVs need rebalancing.
7. **P2 — BLACKSMITH/ARMORER/JEWELER/LEATHERWORKER** (30 minor BV fixes): Mostly small adjustments.

---

*End of Complete Recipe Crafting Pass*
*Total recipes analyzed: 204 across 15 professions*
*Design-only document — no YAML modifications made*





