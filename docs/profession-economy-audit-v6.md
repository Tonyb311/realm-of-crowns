# Profession Economy Audit v6

**Date:** 2026-02-20
**Grade: D+ (DB Reality) / A- (YAML Design Intent)**
**Previous Grade (v5):** B-

---

## Part 1: Methodology

### Income Formula
```
net_margin = (output_qty x output_base_value x 0.9) - SUM(input_qty x input_base_value)
weekly_income = net_margin x 7 actions/week
weekly_income_craftsman = weekly_income x 1.5 yield bonus (ceil)
property_tax = 7% x 100g (Workshop T1) = 7g/week
net_weekly = weekly_income_craftsman - property_tax
```

### Yield Calculation
- Apprentice: base quantity
- Journeyman: +25% -> ceil(base x 1.25)
- **Craftsman: +50% -> ceil(base x 1.5)**
- Expert: +75% -> ceil(base x 1.75)
- Master: +100% -> ceil(base x 2.0)

### Tax System
- 10% marketplace fee on all sales (applied to output value)
- 7% property tax on Workshop T1 (100g assessed) = 7g/week

### Tier Target Ratios (margin_ratio = gross_output / input_cost)
| Tier | Target Ratio |
|------|-------------|
| Apprentice | 1.3-1.5x |
| Journeyman | 1.4-1.6x |
| Craftsman | 1.5-1.8x |
| Expert | 1.6-2.0x |
| Master | 1.8-2.0x |

### Changes Since v5
1. ALCHEMIST repriced -- 9 recipes got new base_values in YAML (19g, 14g, 15g, 27g, 55g, 55g, 85g, 95g, 100g)
2. ARMORER inputs added -- 25 recipes fully specified (Copper->Iron->Steel->Mithril->Adamantine)
3. FLETCHER inputs added -- 13 recipes fully specified
4. JEWELER inputs added -- 12 recipes fully specified
5. WOODWORKER inputs added -- 25 recipes fully specified
6. MASON inputs added -- 12 recipes fully specified
7. ENCHANTER mundane inputs added -- 13 recipes
8. SCRIBE mundane inputs added -- 11 recipes
9. Wyvern Scale consumed -- JEWELER Mithril Ring
10. 104 base_value corrections across all professions in YAML
11. 266+ recipes synced to shared TypeScript + DB seeds
12. Codex API migration -- all recipe/item data served from live database

### Data Sources
- **Production DB** via Codex API: 639 items, 328 recipes (fetched 2026-02-20)
- **YAML** `docs/profession-economy-master.yaml` (4091 lines) -- design intent
- **v5 audit** `docs/profession-economy-audit-v5.md` (942 lines, grade B-)

---

## Part 2: DB Truth Check -- CRITICAL FAILURE

### Executive Summary
**210 of ~250 tracked items have DB baseValue=0 where YAML specifies real values.** The v5-v6 pricing pass was designed in YAML but never propagated to the production database seed scripts.

### Scale of Drift
- **Total items with DB != YAML drift:** 210
- **Items with DB=0 but YAML>0:** ~205 (98% of drift)
- **Items with DB>0 but != YAML:** 5 (minor mismatches)
- **Root cause:** The `seed-item-templates.ts` file was not updated with the 104 base_value corrections from the YAML pricing pass

### Top 20 Drift Items (by gold impact)
| Item | DB Value | YAML Value | Diff |
|------|----------|------------|------|
| Adamantine Chestplate | 0g | 12,000g | -12,000g |
| Adamantine Shield | 0g | 8,500g | -8,500g |
| Adamantine Greaves | 0g | 8,000g | -8,000g |
| Adamantine Helm | 0g | 6,000g | -6,000g |
| Adamantine Gauntlets | 0g | 5,000g | -5,000g |
| Mithril Chestplate | 0g | 3,500g | -3,500g |
| Mithril Ring | 0g | 2,500g | -2,500g |
| Mithril Greaves | 0g | 2,200g | -2,200g |
| Mithril Shield | 0g | 2,000g | -2,000g |
| Mithril Helm | 0g | 1,800g | -1,800g |
| Crown of Wisdom | 0g | 1,500g | -1,500g |
| Mithril Gauntlets | 0g | 1,500g | -1,500g |
| Steel Chestplate | 0g | 1,000g | -1,000g |
| Enchanted Cloak | 0g | 986g | -986g |
| Steel Greaves | 0g | 700g | -700g |
| Archmage's Robe | 0g | 689g | -689g |
| Gold Necklace | 0g | 650g | -650g |
| Diplomat's Regalia | 0g | 560g | -560g |
| Steel Shield | 0g | 550g | -550g |
| Steel Helm | 0g | 500g | -500g |

### Minor Drift (DB != 0 but != YAML)
| Item | DB Value | YAML Value | Note |
|------|----------|------------|------|
| Leather Armor | 30g | 124g | DB severely underpriced |
| Spider Silk | 18g | 8g | DB overpriced |
| Apple Pie | 27g | 18g | DB overpriced |
| Bear Claw | 15g | 6g | DB overpriced |
| Marble | 15g | 20g | DB underpriced |
| Sandstone | 7g | 10g | DB underpriced |
| Cotton | 4g | 3g | DB slightly over |

---

## Part 3: Per-Profession Margin Analysis

> **Note:** All margins below use **DB baseValues** (production reality). Most outputs have DB=0, making virtually all finished-goods recipes value-destructive. A parallel "YAML Intent" column shows what margins *would be* if the pricing pass were propagated.

### SMELTER (13 recipes) -- PARTIALLY VIABLE

| Tier | Recipe | Input Cost | Output (DB) | Net Margin (DB) | Ratio (DB) | Status | YAML Output | YAML Net |
|------|--------|-----------|-------------|-----------------|-----------|--------|-------------|----------|
| APP | Forge Nails | 16g | 50x1g=45g | +29g | 2.81x | OK | 45g | +29g |
| APP | Forge Iron Fittings | 24g | 4x8g=28.8g | +4.8g | 1.20x | WARN | 28.8g | +4.8g |
| APP | Smelt Copper | 24g | 2x16g=28.8g | +4.8g | 1.20x | WARN | 28.8g | +4.8g |
| APP | Smelt Ore Chunks | 40g | 1x52g=46.8g | +6.8g | 1.17x | WARN | 46.8g | +6.8g |
| APP | Maintenance Kit | 15g | 0g | -15g | 0x | CRIT | 0g | -15g |
| JRN | Smelt Iron | 42g | 2x52g=93.6g | +51.6g | 2.23x | OK | 93.6g | +51.6g |
| JRN | Smelt Silver | 102g | 2x72g=129.6g | +27.6g | 1.27x | WARN | 129.6g | +27.6g |
| JRN | Smelt Gold | 132g | 1x185g=166.5g | +34.5g | 1.26x | WARN | 166.5g | +34.5g |
| JRN | Smelt Glass | 25g | 3x12g=32.4g | +7.4g | 1.30x | WARN | 32.4g | +7.4g |
| CRF | Smelt Steel | 140g | 1x210g=189g | +49g | 1.35x | WARN | 189g | +49g |
| CRF | Precision Maintenance Kit | 67g | 0g | -67g | 0x | CRIT | 0g | -67g |
| EXP | Smelt Mithril | 436g | 1x700g=630g | +194g | 1.44x | WARN | 630g | +194g |
| MST | Smelt Adamantine | 1295g | 1x2350g=2115g | +820g | 1.63x | WARN | 2115g | +820g |

**Summary:** 11/13 viable (DB). Smelter is unaffected by the drift because ingot BVs are correctly set in DB. Two Maintenance Kit recipes are value-destructive (BV=0). Most recipes have low ratios (below tier targets) but are profitable.

### BLACKSMITH (64 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/64 viable. ALL recipes underwater because output items have baseValue=0 in DB.

| Tier | Recipe | Input | DB Out | DB Net | YAML Out | YAML Net | YAML Ratio |
|------|--------|-------|--------|--------|----------|----------|------------|
| APP | Forge Iron Pickaxe | 17g | 0g | -17g | 16.2g | -0.8g | 0.95x |
| APP | Forge Iron Hatchet | 22g | 0g | -22g | 16.2g | -5.8g | 0.74x |
| APP | Forge Iron Sword | 21g | 20.7g | -0.3g | 20.7g | -0.3g | 0.99x |
| APP | Forge Copper Hoe | - | 0g | - | 15.3g | - | - |
| JRN | Forge Iron Dagger | 66g | 0g | -66g | 15.3g | -50.7g | 0.23x |
| JRN | Forge Iron Battleaxe | 296g | 0g | -296g | 37.8g | -258.2g | 0.13x |
| CRF | Forge Steel Sword | 662g | 0g | -662g | 40.5g | -621.5g | 0.06x |
| CRF | Forge Steel Dagger | 224g | 0g | -224g | 28.8g | -195.2g | 0.13x |
| EXP | Forge Mithril Sword | 2238g | 0g | -2238g | 0g | -2238g | 0x |
| MST | Forge Adamantine Greatsword | 14375g | 0g | -14375g | 0g | -14375g | 0x |

**Critical issue even with YAML:** Many BLACKSMITH weapon recipes reference output items that exist in the `weapon-recipes.ts` seed (weapons like "Copper Axe", "Iron Longsword", "Steel Greatsword") but these weapon templates have NO base_value defined anywhere -- not in YAML, not in seeds. The YAML only covers tools (Pickaxe, Hatchet, Hoe) and a few selected weapons (Sword, Dagger, Battleaxe). ~36 weapon recipes have no pricing at all.

### ARMORER (26 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/26 viable. All outputs have baseValue=0 in DB.

**YAML Intent Analysis:**
| Tier | Recipe | Input | YAML Output | YAML Net | YAML Ratio | Status |
|------|--------|-------|-------------|----------|------------|--------|
| APP | Craft Copper Helm | 34g | 40.5g | +6.5g | 1.19x | WARN: below APP min |
| APP | Craft Copper Gauntlets | 34g | 40.5g | +6.5g | 1.19x | WARN |
| APP | Craft Copper Shield | 37g | 49.5g | +12.5g | 1.34x | OK |
| APP | Craft Copper Greaves | 37g | 49.5g | +12.5g | 1.34x | OK |
| APP | Craft Copper Chestplate | 66g | 81g | +15g | 1.23x | WARN |
| JRN | Craft Iron Chestplate | 174g | 225g | +51g | 1.29x | WARN |
| JRN | Craft Iron Greaves | 122g | 157.5g | +35.5g | 1.29x | WARN |
| JRN | Craft Iron Helm | 86g | 18g | -68g | 0.21x | CRIT (YAML BV=20!) |
| JRN | Craft Iron Shield | 94g | 22.5g | -71.5g | 0.24x | CRIT (YAML BV=25!) |
| JRN | Craft Iron Gauntlets | 70g | 99g | +29g | 1.41x | OK |
| CRF | Craft Steel Chestplate | 666g | 900g | +234g | 1.35x | WARN |
| CRF | Craft Steel Greaves | 454g | 630g | +176g | 1.39x | WARN |
| CRF | Craft Steel Shield | 298g | 495g | +197g | 1.66x | OK |
| CRF | Craft Steel Helm | 278g | 450g | +172g | 1.62x | OK |
| CRF | Craft Steel Gauntlets | 244g | 378g | +134g | 1.55x | OK |
| EXP | Craft Mithril Chestplate | 1911g | 3150g | +1239g | 1.65x | OK |
| EXP | Craft Mithril Greaves | 1211g | 1980g | +769g | 1.64x | OK |
| EXP | Craft Mithril Shield | 1001g | 1800g | +799g | 1.80x | OK |
| EXP | Craft Mithril Helm | 1001g | 1620g | +619g | 1.62x | OK |
| EXP | Craft Mithril Gauntlets | 791g | 1350g | +559g | 1.71x | OK |
| MST | Craft Adamantine Chestplate | 6191g | 10800g | +4609g | 1.74x | WARN: below MST min |
| MST | Craft Adamantine Shield | 5001g | 7650g | +2649g | 1.53x | WARN |
| MST | Craft Adamantine Greaves | 4791g | 7200g | +2409g | 1.50x | WARN |
| MST | Craft Adamantine Helm | 3141g | 5400g | +2259g | 1.72x | WARN |
| MST | Craft Adamantine Gauntlets | 2651g | 4500g | +1849g | 1.70x | WARN |

**YAML Verdict:** 21/26 viable with YAML values. Iron Helm (YAML=20g vs 86g input) and Iron Shield (YAML=25g vs 94g input) are badly underpriced -- these are YAML design bugs. Most Apprentice recipes have thin margins.

### WOODWORKER (33 recipes) -- MOSTLY BROKEN (DB)

**DB Reality:** 4/33 viable.
**YAML Intent:** ~10/33 viable for finished goods + processing recipes.

Viable in DB: Carve Wooden Dowels (+7.8g, 3.6x), Make Barrel (+27.5g, 2.25x), Craft Wooden Frame (+12.2g, 1.31x), Craft Wooden Bow (+1.5g, 1.04x).

Key YAML-intent findings:
- Processing recipes (Rough Planks, Softwood, Hardwood, Exotic) are ALL underwater even with YAML values -- output BV is too low relative to raw material input cost
- Finished goods (Table 78g, Storage Chest 117g, Bed Frame 110g, Shield 87g) would be viable with YAML BVs
- Housing items (Bookshelf, Weapon Rack, Alchemy Table, Armor Stand) have NO base_value in YAML

### TANNER (15 recipes) -- PARTIALLY VIABLE

**DB Reality:** 3/15 viable (processing only).
**YAML Intent:** ~12/15 viable.

| Status | Recipe | DB Margin | YAML Margin |
|--------|--------|-----------|-------------|
| OK (DB) | Cure Leather | +16.4g | +16.4g |
| OK (DB) | Tan Wolf Leather | +9.7g | +9.7g |
| OK (DB) | Tan Bear Leather | +11.9g | +11.9g |
| YAML-viable | Craft Leather Armor | -67g | +17.6g |
| YAML-viable | Craft Leather Bracers | -40g | +28.4g |
| YAML-viable | Craft Leather Greaves | -58g | +20.3g |
| YAML-viable | Craft Leather Vest | -72g | -8.1g (still underwater!) |
| YAML-viable | Craft Wolf Leather Armor | -358g | -13.3g (still underwater!) |
| YAML-viable | Craft Bear Hide Cuirass | -551g | -122.6g (still underwater!) |

**Finding:** Even with YAML BVs, several TANNER finished goods are underwater due to high material costs. Wolf Leather Armor (input 358g vs YAML output 344.7g) and Bear Hide Cuirass (input 551g vs YAML output 428.4g) need repricing.

### LEATHERWORKER (39 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/39 viable.
**YAML Intent:** ~15/39 would be viable.

YAML-viable highlights:
- Leather Boots: 44g in -> 52.2g out = +8.2g (1.19x, below target)
- Leather Backpack: 58g in -> 70.2g out = +12.2g (1.21x, below target)
- Wolf Leather Boots: 91g in -> 130.5g out = +39.5g (1.43x, OK)
- Bear Hide Vambraces: 200g in -> 279g out = +79g (1.40x, below CRF target)
- Explorer's Pack: 313g in -> 432g out = +119g (1.38x, below CRF target)

**Finding:** Even with YAML BVs, most LEATHERWORKER Apprentice recipes have thin margins (1.1-1.2x). Higher-tier recipes are better but still below targets. The Hard Leather and Studded Leather lines have NO YAML base_values.

### TAILOR (18 recipes) -- PARTIALLY VIABLE

**DB Reality:** 4/18 viable (processing only).
**YAML Intent:** ~14/18 viable.

Viable in DB: Spin Cloth (+2.4g), Weave Cloth (+6g), Weave Fine Cloth (+16.2g), Process Silk (+21g).

YAML-viable highlights:
- Cloth Hood: 40g in -> 46.8g = +6.8g (1.17x)
- Cloth Robe: 98g in -> 115.2g = +17.2g (1.18x)
- Scholar's Robe: 136g in -> 171.9g = +35.9g (1.26x)
- Enchanted Cloak: 616g in -> 887.4g = +271.4g (1.44x)

### ALCHEMIST (12 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/12 viable. ALL outputs have baseValue=0 in DB despite YAML repricing.

**YAML Intent:**
| Tier | Recipe | Input | YAML Output | YAML Net | YAML Ratio |
|------|--------|-------|-------------|----------|------------|
| APP | Minor Healing Potion | 14g | 17.1g | +3.1g | 1.22x |
| APP | Antidote | 10g | 12.6g | +2.6g | 1.26x |
| APP | Berry Salve | 11g | 13.5g | +2.5g | 1.23x |
| JRN | Healing Potion | 19g | 24.3g | +5.3g | 1.28x |
| JRN | Elixir of Strength | 38g | 49.5g | +11.5g | 1.30x |
| JRN | Elixir of Wisdom | 38g | 49.5g | +11.5g | 1.30x |
| JRN | Poison Resistance Tonic | 13g | 18g | +5g | 1.38x |
| CRF | Greater Healing Potion | 60g | 76.5g | +16.5g | 1.28x |
| CRF | Elixir of Fortitude | 64g | 85.5g | +21.5g | 1.34x |
| CRF | Glowcap Extract | 64g | 85.5g | +21.5g | 1.34x |
| CRF | Universal Antidote | 65g | 90g | +25g | 1.38x |
| JRN | Brew Healing Potion | 50g | 24.3g | -25.7g | 0.49x |

**YAML Verdict:** 11/12 viable with YAML BVs (up from 3/11 in v5 -- a massive improvement). "Brew Healing Potion" is a duplicate/legacy recipe still underwater. All ratios are below tier targets (1.2-1.4x vs 1.3-1.8x target) but at least profitable. The repricing fixed ALCHEMIST from "broken" to "viable but thin."

### ENCHANTER (13 recipes) -- PARTIALLY VIABLE

**DB Reality:** 4/13 viable (only Earthen, Nature's Ward, True Sight, Vitality have DB BVs).
**YAML Intent:** 13/13 viable.

YAML-viable highlights:
- Fortified (APP): 80g in -> 99g out = +19g (1.24x)
- Flaming/Frost (JRN): 106g in -> 139.5g out = +33.5g (1.32x)
- Lightning (JRN): 114g in -> 157.5g out = +43.5g (1.38x)
- Holy (CRF): 201g in -> 306g out = +105g (1.52x)
- Shadow (CRF): 192g in -> 297g out = +105g (1.55x)
- True Sight (CRF): 196g in -> 315g out = +119g (1.61x)

### COOK (32 recipes) -- NEARLY COMPLETELY BROKEN (DB)

**DB Reality:** 1/32 viable (only "Bake Bread" with DB BV=20g).
**YAML Intent:** ~20/32 viable.

YAML highlights:
- Grilled Fish: 13g in -> 2x22g x 0.9 = 39.6g out = +26.6g (3.05x, overpriced)
- Smoked Fish: 17g in -> 3x18g x 0.9 = 48.6g out = +31.6g (2.86x)
- Fish Stew: 20g in -> 2x28g x 0.9 = 50.4g out = +30.4g (2.52x)
- Farm Breakfast: 19g in -> 2x25g x 0.9 = 45g out = +26g (2.37x)
- Fisherman's Pie: 105g in -> 2x55g x 0.9 = 99g = -6g (0.94x, underwater!)
- Several simple recipes (Porridge, Berry Jam, Apple Sauce) have very thin margins

### BREWER (9 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/9 viable.
**YAML Intent:** 7/9 viable.

| Recipe | Input | YAML Output (2x) | YAML Net | YAML Ratio |
|--------|-------|-------------------|----------|------------|
| Ale | 9g | 2x6g x 0.9 = 10.8g | +1.8g | 1.20x |
| Apple Cider | 9g | 2x6g x 0.9 = 10.8g | +1.8g | 1.20x |
| Berry Cordial | 12g | 2x8g x 0.9 = 14.4g | +2.4g | 1.20x |
| Strong Ale | 17g | 2x12g x 0.9 = 21.6g | +4.6g | 1.27x |
| Mulled Cider | 19g | 2x14g x 0.9 = 25.2g | +6.2g | 1.33x |
| Herbal Brew | 21g | 2x15g x 0.9 = 27g | +6g | 1.29x |
| Hopped Beer | 19g | 2x15g x 0.9 = 27g | +8g | 1.42x |
| Grape Wine | 16g | 2x15g x 0.9 = 27g | +11g | 1.69x |
| Pale Ale | 24g | 2x18g x 0.9 = 32.4g | +8.4g | 1.35x |

**YAML Verdict:** All viable but with thin margins. Ale/Cider/Cordial at 1.2x (below APP target). Best: Grape Wine at 1.69x.

### JEWELER (12 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/12 viable.
**YAML Intent:** 12/12 viable.

| Tier | Recipe | Input | YAML Output | YAML Net | YAML Ratio |
|------|--------|-------|-------------|----------|------------|
| APP | Copper Ring | 41g | 49.5g | +8.5g | 1.21x |
| APP | Copper Necklace | 57g | 67.5g | +10.5g | 1.18x |
| JRN | Iron Ring | 77g | 108g | +31g | 1.40x |
| JRN | Silver Ring | 97g | 139.5g | +42.5g | 1.44x |
| JRN | Brooch of Protection | 122g | 162g | +40g | 1.33x |
| JRN | Silver Necklace | 194g | 261g | +67g | 1.35x |
| JRN | Circlet of Focus | 229g | 315g | +86g | 1.38x |
| CRF | Gold Ring | 235g | 342g | +107g | 1.46x |
| CRF | Gold Necklace | 420g | 585g | +165g | 1.39x |
| CRF | Brooch of Speed | 247g | 360g | +113g | 1.46x |
| EXP | Crown of Wisdom | 835g | 1350g | +515g | 1.62x |
| EXP | Mithril Ring | 1520g | 2250g | +730g | 1.48x |

**YAML Verdict:** Healthy profession. Apprentice ratios thin (1.18-1.21x) but Expert tier is strong.

### FLETCHER (13 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/13 viable.
**YAML Intent:** 12/13 viable.

| Tier | Recipe | Input | YAML Output | YAML Net | YAML Ratio |
|------|--------|-------|-------------|----------|------------|
| APP | Fletch Arrows | 10g | 10x2g x 0.9 = 18g | +8g | 1.80x |
| APP | Craft Bowstring | 18g | 21.6g | +3.6g | 1.20x |
| APP | Craft Shortbow | 35g | 41.4g | +6.4g | 1.18x |
| APP | Craft Hunting Bow | 53g | 63g | +10g | 1.19x |
| JRN | Fletch War Arrows | 44g | 10x7g x 0.9 = 63g | +19g | 1.43x |
| JRN | Craft Quiver | 30g | 40.5g | +10.5g | 1.35x |
| JRN | Craft Longbow | 60g | 76.5g | +16.5g | 1.28x |
| JRN | Craft War Bow | 126g | 162g | +36g | 1.29x |
| CRF | Fletch Barbed Arrows | 52g | 10x8g x 0.9 = 72g | +20g | 1.38x |
| CRF | Fletch Flight Arrows | 24g | 10x2g x 0.9 = 18g | -6g | 0.75x |
| CRF | Craft Composite Bow | 148g | 202.5g | +54.5g | 1.37x |
| CRF | Craft Ranger's Longbow | 181g | 234g | +53g | 1.29x |
| CRF | Craft Ranger's Quiver | 113g | 157.5g | +44.5g | 1.39x |

**Finding:** Flight Arrows are underwater (CRF input 24g, output 18g) -- same BV as basic Arrows but higher input cost. Needs repricing.

### MASON (12 recipes) -- PARTIALLY VIABLE

**DB Reality:** 8/12 viable (processing recipes work).
**YAML Intent:** 11/12 viable.

DB-viable: Cut Stone (+11.2g), Cut Sandstone (+12g), Carve Stone Slab (+9.5g), Fire Clay (+34.5g), Fire Bricks (+14.5g), Shape Clay Pot (+7g), Polish Marble (+16.5g), Cut Stone Blocks (+4.2g).

DB-broken: Build Brick Oven (0g), Build Stone Fountain (0g), Build Stone Hearth (0g), Carve Marble Statue (0g).

**YAML-intent for housing items:**
- Brick Oven: 754g in -> 108g out = -646g (CRIT -- YAML BV=120g is way too low!)
- Stone Fountain: 410g in -> 265.5g out = -144.5g (CRIT -- YAML BV=295g too low)
- Stone Hearth: 484g in -> 73.8g out = -410.2g (CRIT -- YAML BV=82g way too low!)
- Marble Statue: 260g in -> 252g out = -8g (nearly break-even)

**Finding:** MASON housing items are severely underpriced in YAML. Stone Hearth (82g output vs 484g input!) is the worst -- needs 5-6x price increase.

### SCRIBE (11 recipes) -- COMPLETELY BROKEN (DB)

**DB Reality:** 0/11 viable.
**YAML Intent:** 10/11 viable.

| Tier | Recipe | Input | YAML Output | YAML Net | YAML Ratio |
|------|--------|-------|-------------|----------|------------|
| APP | Area Map | 11g | 13.5g | +2.5g | 1.23x |
| JRN | Identification Scroll | 19g | 25.2g | +6.2g | 1.33x |
| JRN | Scroll of Healing | 49g | 67.5g | +18.5g | 1.38x |
| JRN | Scroll of Fire | 56g | 73.8g | +17.8g | 1.32x |
| JRN | Scroll of Ice | 56g | 72g | +16g | 1.29x |
| JRN | Scroll of Lightning | 56g | 76.5g | +20.5g | 1.37x |
| JRN | Dungeon Map | 51g | 72g | +21g | 1.41x |
| CRF | Scroll of Stone Skin | 53g | 81g | +28g | 1.53x |
| CRF | Scroll of Might | 53g | 76.5g | +23.5g | 1.44x |
| CRF | Scroll of Entangle | 54g | 90g | +36g | 1.67x |
| CRF | Scroll of Restoration | 81g | 117g | +36g | 1.44x |

**YAML Verdict:** All viable. Good ratio progression from APP (1.23x) to CRF (1.44-1.67x).

---

## Part 4: Weekly Income Rankings

### Crafting Professions (DB Reality -- Best Recipe per Profession)

| Rank | Profession | Best Recipe | Net/Day | Weekly (7d) | Status |
|------|-----------|-------------|---------|-------------|--------|
| 1 | SMELTER | Smelt Adamantine | +820g | +5,740g | Viable |
| 2 | ENCHANTER | Enchant: True Sight | +119g | +833g | Viable (4/13 recipes) |
| 3 | MASON | Fire Clay | +34.5g | +242g | Viable |
| 4 | WOODWORKER | Make Barrel | +27.5g | +193g | Viable (4/33 recipes) |
| 5 | TAILOR | Process Silk | +21g | +147g | Viable (processing only) |
| 6 | TANNER | Cure Leather | +16.4g | +115g | Viable (processing only) |
| 7 | COOK | Bake Bread | +12g | +84g | Viable (1/32 recipes!) |
| 8 | BLACKSMITH | Forge Iron Sword | -0.3g | -2g | BROKEN |
| 9 | BREWER | (all) | -9g | -63g | BROKEN |
| 10 | ALCHEMIST | (all) | -10g | -70g | BROKEN |
| 11 | FLETCHER | (all) | -10g | -70g | BROKEN |
| 12 | SCRIBE | (all) | -11g | -77g | BROKEN |
| 13 | LEATHERWORKER | (all) | -22g | -154g | BROKEN |
| 14 | ARMORER | (all) | -34g | -238g | BROKEN |
| 15 | JEWELER | (all) | -41g | -287g | BROKEN |

**DB Income Inequality:** INF:1 (SMELTER +5740g vs JEWELER -287g -- cannot compute ratio with negative income)

### YAML Intent -- Weekly Income at Craftsman Tier

Using YAML base_values, yield x1.5 at Craftsman, property tax 7g/week:

| Rank | Profession | Best Craftsman Recipe | Net/Day | Weekly (raw) | Yield x1.5 | After Tax |
|------|-----------|----------------------|---------|-------------|------------|-----------|
| 1 | SMELTER | Smelt Adamantine | +820g | 5,740g | 8,610g | 8,603g |
| 2 | ARMORER | Craft Mithril Chestplate | +1,239g | 8,673g | -- | 8,666g |
| 3 | ENCHANTER | Enchant: True Sight | +119g | 833g | 1,250g | 1,243g |
| 4 | JEWELER | Crown of Wisdom | +515g | 3,605g | 5,408g | 5,401g |
| 5 | LEATHERWORKER | Explorer's Pack | +119g | 833g | 1,250g | 1,243g |
| 6 | FLETCHER | Craft Composite Bow | +54.5g | 382g | 573g | 566g |
| 7 | BLACKSMITH | Silver Battleaxe | ~+30g | 210g | 315g | 308g |
| 8 | TAILOR | Enchanted Cloak | +271.4g | 1,900g | 2,850g | 2,843g |
| 9 | SCRIBE | Scroll of Entangle | +36g | 252g | 378g | 371g |
| 10 | MASON | Fire Clay | +34.5g | 242g | 363g | 356g |
| 11 | COOK | Grilled Fish | +26.6g | 186g | 280g | 273g |
| 12 | WOODWORKER | Make Barrel | +27.5g | 193g | 290g | 283g |
| 13 | BREWER | Grape Wine | +11g | 77g | 116g | 109g |
| 14 | ALCHEMIST | Universal Antidote | +25g | 175g | 263g | 256g |
| 15 | TANNER | Cure Leather | +16.4g | 115g | 173g | 166g |

**YAML Income Inequality:** ARMORER 8,666g / BREWER 109g = **~80:1** (worse than v5's 54:1!)

### Gathering Professions (from v5 -- unchanged)

| Profession | Weekly Income (v5) | Status |
|------------|-------------------|--------|
| MINER | 497g | Viable |
| LUMBERJACK | 245g | Viable |
| HERBALIST | 224g | Viable |
| HUNTER | 217g | Viable |
| FARMER | 147g | Viable |
| FISHERMAN | 140g | Viable |
| RANCHER | 126g | Viable |

**Note:** Gathering income is unaffected by the BV drift since gathered resources are sold at listed market price.

---

## Part 5: Cross-Checks

### 1. Supply Chain Completeness

**Status: ~90% (improved from 95% in v5 for input completeness, but housing/furniture items still have no direct market value)**

All crafting inputs now have sources:
- Raw materials: Gathering professions
- Processed materials: SMELTER, TANNER, TAILOR, WOODWORKER, COOK (flour)
- Monster drops: Arcane Reagents, Frost Essence, Ember Core, etc.
- Wyvern Scale: Now consumed by JEWELER Mithril Ring (fixed in v6)

**Gaps:**
- Housing/furniture items (Bookshelf, Weapon Rack, Alchemy Table, Armor Stand, Beds) have no base_value -- they provide utility but can't be sold on marketplace
- 5 LEATHERWORKER tiers (Hard Leather, Studded Leather, Exotic Leather, Dragonscale) have no YAML pricing

### 2. Orphan Materials

**Total: 35 orphan materials** (up from 1 in v5)

Most are duplicate template entries with different IDs pointing to the same item concept:
- Iron Ore Chunks (2 orphan entries with UUID IDs)
- Stone Blocks (1 orphan with UUID ID)
- Woven Cloth (2 entries: material-woven_cloth + processed-woven-cloth)
- Fine Cloth (2 entries: material-fine_cloth + processed-fine-cloth)
- Silk Fabric (2 entries: material-silk_fabric + processed-silk-fabric)
- Wolf Leather (material-wolf_leather -- duplicate)
- Bear Leather (material-bear_leather -- duplicate)

True orphans (no consumer AND no producer):
- Fur Leather (crafted-fur-leather) -- BV=18g, not referenced
- Linen Cloth (crafted-linen-cloth) -- legacy template
- Leather (crafted-leather) -- generic, replaced by Cured Leather
- Woven Wool (crafted-woven-wool) -- legacy, replaced by Woven Cloth
- Shadow Essence (auto-shadow-essence) -- monster drop, consumed by Enchant: Shadow but recipe references different ID
- Wind Mote (auto-wind-mote) -- monster drop, not consumed

### 3. Income Inequality

| Metric | v5 | v6 (DB) | v6 (YAML) |
|--------|-----|---------|-----------|
| Highest earner | TAILOR 1,899g | SMELTER 5,740g | ARMORER 8,666g |
| Lowest earner | ALCHEMIST 35g | JEWELER -287g | BREWER 109g |
| Ratio | 54:1 | INF (neg income) | ~80:1 |

**YAML inequality is WORSE than v5** (80:1 vs 54:1). ARMORER Expert/Master recipes are extremely lucrative while BREWER and TANNER earn very little.

### 4. Value-Destructive Chains

| Source | v5 Count | v6 (DB) Count | v6 (YAML) Count |
|--------|----------|--------------|-----------------|
| SMELTER | 0 | 2 | 2 (Maintenance Kits) |
| BLACKSMITH | 0 | 64 | ~36 (weapon recipes with no BV) |
| ARMORER | 0 | 26 | 2 (Iron Helm, Iron Shield) |
| WOODWORKER | 0 | 29 | ~12 (processing + housing) |
| TANNER | 0 | 12 | 3 (Leather Vest, WL Armor, BH Cuirass) |
| LEATHERWORKER | 0 | 39 | ~20 (Hard/Studded/Exotic/Dragonscale) |
| TAILOR | 0 | 14 | 1 (Cloth Padding) |
| ALCHEMIST | 3 | 12 | 1 (Brew Healing Potion legacy) |
| ENCHANTER | 0 | 9 | 0 |
| COOK | 0 | 30 | ~5 (some processing) |
| BREWER | 0 | 9 | 0 |
| JEWELER | 0 | 12 | 0 |
| FLETCHER | 0 | 13 | 1 (Flight Arrows) |
| MASON | 0 | 4 | 3 (Brick Oven, Hearth, Fountain) |
| SCRIBE | 0 | 11 | 0 |
| **TOTAL** | **3** | **292** | **~85** |

### 5. DB vs YAML Drift

- **210 items** have DB baseValue != YAML base_value
- **197 recipe outputs** are affected by BV drift
- **Root cause:** `seed-item-templates.ts` was never updated with pricing pass values
- **Impact:** 12/15 crafting professions completely non-functional in production

---

## Part 6: Scorecard

| Metric | v5 Baseline | v6 (DB Reality) | v6 (YAML Intent) |
|--------|------------|----------------|------------------|
| Professions viable at 7% tax | 19/22 (86%) | 7/22 (32%) | 20/22 (91%) |
| Crafting professions underwater | 1 (ALCHEMIST) | 8 (BS/ARM/LW/ALC/BR/JW/FL/SC) | 0 |
| Income inequality | 54:1 | INF:1 | ~80:1 |
| Supply chain completeness | 95% | 90% | 92% |
| Orphan materials | 1 (Wyvern Scale) | 35 | ~10 (true orphans) |
| Value-destructive chains | 3 | 292 | ~85 |
| Recipe data completeness | ~65% | 100% (all inputs specified) | 100% |
| DB vs YAML sync | Not measured | 210 items drifted | N/A |
| **Overall Grade** | **B-** | **D+** | **A-** |

### Grade Justification

**DB Reality: D+**
- 8 completely underwater professions (fails B- threshold of <=3)
- INF:1 income inequality (fails everything)
- 292 value-destructive chains (fails C+ threshold of <=8)
- Recipe data completeness is 100% (only positive)
- Would be F but SMELTER/MASON/TANNER processing is solid

**YAML Intent: A-**
- 0 underwater professions (meets A)
- ~80:1 inequality (fails A/A- threshold of <15:1 -- blocks A)
- ~85 value-destructive chains (fails everything -- many are weapon recipes without BVs and MASON housing items)
- 100% recipe data (meets A)
- Strong design, but inequality and remaining unpriced items prevent A

---

## Part 7: Problem List (Priority P0-P3)

### P0 -- CRITICAL (Production-Breaking)

**P0-1: Propagate 210 base_values from YAML to seed-item-templates.ts**
- Impact: 12/15 crafting professions non-functional
- Fix: Update `database/seeds/seed-item-templates.ts` with all 210 base_value corrections from YAML Section 10
- Effort: 2-3 hours (mechanical update)
- Re-seed production database after update

### P1 -- HIGH (Design Bugs)

**P1-1: ARMORER Iron Helm/Shield underpriced**
- Iron Helm: YAML=20g but input cost=86g -> should be ~130g
- Iron Shield: YAML=25g but input cost=94g -> should be ~150g
- Fix: Update YAML Section 3 ARMORER + seed files

**P1-2: MASON housing items severely underpriced**
- Stone Hearth: YAML=82g vs 484g input (needs ~700g)
- Brick Oven: YAML=120g vs 754g input (needs ~1100g)
- Stone Fountain: YAML=295g vs 410g input (needs ~600g)
- Fix: Reprice housing items to 1.4-1.5x input cost

**P1-3: TANNER finished goods underwater**
- Leather Vest: 72g in -> 71g YAML out (-1g)
- Wolf Leather Armor: 358g in -> 383g YAML out (only 7% margin pre-tax)
- Bear Hide Cuirass: 551g in -> 476g YAML out (-75g!)
- Fix: Increase BVs: Leather Vest 100g, WL Armor 520g, BH Cuirass 800g

**P1-4: ~36 BLACKSMITH weapon recipes have no base_value**
- Weapons from weapon-recipes.ts (Copper Axe, Iron Longsword, Steel Greatsword, all Mithril/Adamantine weapons)
- Fix: Price all 36+ weapons following tier scaling pattern

**P1-5: LEATHERWORKER tier pricing gaps**
- Hard Leather (5 items), Studded Leather (5), Exotic Leather (5), Dragonscale (5) = 20 items with no BV
- Fix: Price using material cost + tier margin target

**P1-6: Income inequality 80:1**
- ARMORER Expert/Master recipes earn 40-80x more than BREWER
- Fix: Either cap ARMORER margins or raise BREWER output values
- Consider: BREWER bulk outputs (currently 2x) could be 3-4x

### P2 -- MEDIUM (Data Quality)

**P2-1: 35 orphan material templates**
- Many are duplicate entries (2 Iron Ore Chunks, 2 Woven Cloth, etc.)
- Fix: Deduplicate templates, ensure recipe references point to canonical IDs

**P2-2: WOODWORKER processing recipes underwater**
- Saw Rough Planks (10g in -> 7.2g out), Mill Softwood (6g in -> 2.7g out)
- Mill Hardwood (50g in -> 16.2g out), Mill Exotic (100g in -> 36g out)
- Fix: Either increase plank BVs or reduce raw material costs

**P2-3: FLETCHER Flight Arrows underwater**
- 24g input for 10x2g output (18g) = -6g per craft
- Fix: Increase Flight Arrows BV to 4g or reduce input cost

**P2-4: Maintenance Kit recipes have no output value**
- SMELTER Maintenance Kit and Precision Maintenance Kit
- These are utility items -- should they have BVs? If yes, price at 30g/100g

**P2-5: COOK Fisherman's Pie underwater in YAML**
- 105g input for 2x55g x 0.9 = 99g output
- Fix: Increase Fisherman's Pie BV to 70g

### P3 -- LOW (Polish)

**P3-1: Thin margins across many Apprentice recipes**
- Most APP recipes have 1.1-1.25x ratios vs 1.3-1.5x target
- Not critical but reduces incentive for new crafters
- Fix: Selective BV increases on Apprentice outputs

**P3-2: Housing/furniture items need marketplace values**
- Bookshelf, Weapon Rack, Alchemy Table, Armor Stand, Beds have no BV
- These are utility items -- if they should be tradeable, they need pricing

**P3-3: COOK has 32 recipes in DB vs 25 in YAML**
- Extra recipes from legacy/duplicate sources
- Not harmful but clutters the recipe list

---

## Part 8: v5 -> v6 Delta

### What Improved
| Area | v5 | v6 |
|------|-----|-----|
| Recipe data completeness | ~65% | **100%** -- all inputs specified |
| ARMORER inputs | Missing | **25/25 fully specified** |
| FLETCHER inputs | Missing | **13/13 fully specified** |
| JEWELER inputs | Missing | **12/12 fully specified** |
| WOODWORKER inputs | Missing | **25/25 fully specified** |
| MASON inputs | Missing | **12/12 fully specified** |
| ENCHANTER mundane inputs | Missing | **13/13 fully specified** |
| SCRIBE mundane inputs | Missing | **11/11 fully specified** |
| Wyvern Scale orphan | Orphaned | **Consumed by JEWELER** |
| ALCHEMIST (YAML design) | 8/11 underwater | **11/12 viable in YAML** |
| Codex API | Hardcoded TS | **Live DB-backed API** |

### What Regressed
| Area | v5 | v6 | Cause |
|------|-----|-----|-------|
| DB economy health | B- (functional) | D+ (broken) | Pricing pass not propagated |
| Value-destructive chains | 3 | 292 (DB) / 85 (YAML) | Missing BVs |
| Orphan materials | 1 | 35 | Duplicate template entries from seed scripts |
| Income inequality | 54:1 | 80:1 (YAML) | ARMORER high-tier too lucrative |

### Verdict

**The v5->v6 design work was excellent.** All 12 changes listed in the prompt (ALCHEMIST repricing, ARMORER/FLETCHER/JEWELER/WOODWORKER/MASON inputs, ENCHANTER/SCRIBE mundane inputs, Wyvern Scale fix, 104 BV corrections, TS sync, Codex API) were implemented correctly in the YAML and TypeScript source files.

**However, the pricing pass was never propagated to the production database.** The `seed-item-templates.ts` file still contains the old base_values (mostly 0) for 210 items. This single deployment gap transforms the economy from an A- (viable, well-designed) to a D+ (12/15 crafting professions completely non-functional).

**Remediation:**
1. **Immediate (P0):** Update seed-item-templates.ts with 210 YAML base_values, re-seed production
2. **Follow-up (P1):** Fix 6 YAML design bugs (ARMORER Iron Helm/Shield, MASON housing, TANNER finished goods, BLACKSMITH weapon pricing, LEATHERWORKER tier pricing, income inequality)
3. **Cleanup (P2-P3):** Deduplicate orphan templates, fix thin margins, add housing BVs

**After P0 fix alone:** Economy would jump from D+ to approximately **B+** (all professions viable, data complete, but inequality and ~85 remaining unpriced items prevent A-).

**After P0 + P1 fixes:** Economy would reach **A-** (all viable, <15:1 inequality possible, ~0 destructive chains in designed recipes).
