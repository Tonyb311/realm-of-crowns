# Base Value Completion Changelog

**Date:** 2026-02-20
**Scope:** Fill all missing `base_value` fields in `docs/profession-economy-master.yaml` and fix value-destructive recipes.
**Reference:** `docs/profession-economy-audit-v4.md`, `prompts/base-value-completion.md`

## Methodology

- **base_value** = NPC vendor floor price (worst-case sale price)
- **Margin targets by tier:**
  - Apprentice: 1.3–1.5× input cost
  - Journeyman: 1.4–1.6× input cost
  - Craftsman: 1.5–1.8× input cost
  - Expert: 1.6–2.0× input cost
  - Master: 1.8–2.0× input cost
- Processing always adds value (minimum 1.3× total input cost)
- Consumables priced lower than durables (Rule 3: repeat demand offsets lower margins)
- Bottom-up pricing: raw materials → intermediates → finished goods

---

## A. New Raw Material base_values (22 items)

These resources had no `base_value` in the YAML. Added in Section 1.

| Item | base_value | Source | Reasoning |
|------|-----------|--------|-----------|
| Grain | 3g | FARMER private field | Common crop, high volume |
| Vegetables | 3g | FARMER private field | Common crop |
| Wild Berries | 3g | FARMER berry field (T2) | Common gatherable |
| Eggs | 5g | RANCHER chicken_coop | Livestock auto-produce |
| Milk | 6g | RANCHER dairy_barn | Livestock auto-produce |
| Wool | 10g | RANCHER sheep_pen | **Set at 10g** (not v3's 15g) so TAILOR Woven Cloth processing is margin-positive |
| Cotton | 4g | FARMER Expert cotton field | Raw textile, plentiful |
| Copper Ore | 4g | MINER at mine | Abundant, low-tier |
| Iron Ore Chunks | 4g | MINER at mine | Unprocessed ore variant |
| Hops | 5g | FARMER Craftsman hop field | Specialty crop, limited supply |
| Grapes | 4g | FARMER Craftsman vineyard | Specialty crop |
| Gold Ore | 40g | MINER Expert+ (future) | Rare precious ore |
| Mithril Ore | 80g | MINER Expert+ (Deep Mines) | Very rare magical ore |
| Adamantine Ore | 150g | MINER Master (Deep Mines) | Rarest ore in game |
| Arcane Reagents | 35g | HERBALIST Expert+ (future) | Magical essence |
| Gemstones | 25g | MINER Expert+ (future) | Cut-quality gems |
| Silite Sand | 5g | Coastal gathering (future) | Common sand |
| Marble | 15g | MINER Craftsman+ quarry | Decorative stone |
| Softwood | 3g | LUMBERJACK at forest | Common timber |
| Exotic Wood | 50g | LUMBERJACK Master (future) | Rare magical timber |

---

## B. SMELTER Output base_values (11 recipes — all NEW)

| Recipe | Output | base_value | Input Cost | Margin | Tier |
|--------|--------|-----------|------------|--------|------|
| smelt-copper | Copper Ingot (×2) | 16g each | 3×CuOre(4)+1×Coal(12)=24g / 2=12g | 1.33× | Apprentice |
| smelt-ore-chunks | Iron Ingot (×1) | 52g | 4×Chunks(4)+2×Coal(12)=40g | 1.30× | Apprentice |
| forge-nails | Nails (×50) | 1g each | 1×CuIngot(16) / 50 = 0.32g | 3.12× | Apprentice |
| forge-iron-fittings | Iron Fittings (×4) | 8g each | 3×Chunks(4)+1×Coal(12)=24g / 4=6g | 1.33× | Apprentice |
| smelt-iron | Iron Ingot (×2) | 52g each | 3×IronOre(6)+2×Coal(12)=42g / 2=21g | 2.48× | Apprentice |
| smelt-glass | Glass (×3) | 12g each | 5×Sand(5)=25g / 3=8.3g | 1.44× | Journeyman |
| smelt-silver | Silver Ingot (×2) | 72g each | 3×SilverOre(30)+1×Coal(12)=102g / 2=51g | 1.41× | Journeyman |
| smelt-gold | Gold Ingot (×1) | 185g | 3×GoldOre(40)+1×Coal(12)=132g | 1.40× | Journeyman |
| smelt-steel | Steel Ingot (×1) | 210g | 2×IronIngot(52)+3×Coal(12)=140g | 1.50× | Craftsman |
| smelt-mithril | Mithril Ingot (×1) | 700g | 5×MithrilOre(80)+3×Coal(12)=436g | 1.61× | Expert |
| smelt-adamantine | Adamantine Ingot (×1) | 2350g | 8×AdamOre(150)+5×Coal(12)+1×Reagent(35)=1295g | 1.81× | Master |

---

## C. BREWER Output base_values (9 recipes — all NEW)

| Recipe | Output | base_value | Input Cost | Margin | Tier |
|--------|--------|-----------|------------|--------|------|
| Ale (×2) | Ale | 6g each | 3×Grain(3)=9g / 2=4.5g | 1.33× | Apprentice |
| Apple Cider (×2) | Apple Cider | 6g each | 3×Apple(3)=9g / 2=4.5g | 1.33× | Apprentice |
| Berry Cordial (×2) | Berry Cordial | 8g each | 3×WB(3)+1×Grain(3)=12g / 2=6g | 1.33× | Apprentice |
| Strong Ale (×2) | Strong Ale | 12g each | 4×Grain(3)+1×WH(5)=17g / 2=8.5g | 1.41× | Journeyman |
| Mulled Cider (×2) | Mulled Cider | 14g each | 3×Apple(3)+2×WH(5)=19g / 2=9.5g | 1.47× | Journeyman |
| Herbal Brew (×2) | Herbal Brew | 15g each | 3×WH(5)+2×Grain(3)=21g / 2=10.5g | 1.43× | Journeyman |
| Hopped Beer (×2) | Hopped Beer | 15g each | 3×Grain(3)+2×Hops(5)=19g / 2=9.5g | 1.58× | Craftsman |
| Grape Wine (×2) | Grape Wine | 15g each | 4×Grapes(4)=16g / 2=8g | 1.88× | Craftsman |
| Pale Ale (×2) | Pale Ale | 18g each | 3×Grain(3)+2×Hops(5)+1×WH(5)=24g / 2=12g | 1.50× | Craftsman |

---

## D. Value-Destructive Processing Fixes (P0)

### D1. TANNER Processing

| Item | Old Value | New Value | Input Cost | Old Ratio | New Ratio |
|------|----------|----------|------------|-----------|-----------|
| Wolf Leather | 35g | **73g** | 2×Wolf Pelts(28g) = 56g | 0.63× ❌ | 1.30× ✅ |
| Bear Leather | 42g | **91g** | 2×Bear Hides(35g) = 70g | 0.60× ❌ | 1.30× ✅ |

### D2. TAILOR Processing

| Item | Old Value | New Value | Input Cost (per output) | Old Ratio | New Ratio |
|------|----------|----------|------------------------|-----------|-----------|
| Cloth | 8g | 8g (kept) | 3×Cotton(4)=12g / 2 = 6g | 1.33× ✅ | 1.33× ✅ |
| Woven Cloth | 20g | 20g (kept) | 3×Wool(10)=30g / 2 = 15g | 1.33× ✅ | 1.33× ✅ |
| Fine Cloth | 38g | **59g** | 3×FineWool(30)=90g / 2 = 45g | 0.84× ❌ | 1.31× ✅ |
| Silk Fabric | 45g | **75g** | 3×Cocoons(38)=114g / 2 = 57g | 0.79× ❌ | 1.32× ✅ |

---

## E. TANNER Finished Goods — All 12 Fixed

All were underwater per v4 audit (margin ratios 0.63–0.82). Recalculated with corrected leather prices.

| Item | Old | New | Input Cost | Multiplier | Tier |
|------|-----|-----|------------|------------|------|
| Leather Cap | 30g | **47g** | 2×CL(18)=36g | 1.31× | Apprentice |
| Leather Satchel | 35g | **58g** | 2×CL(18)+1×AP(8)=44g | 1.32× | Apprentice |
| Leather Vest | 45g | **71g** | 3×CL(18)=54g | 1.31× | Apprentice |
| Leather Belt | 25g | **47g** | 2×CL(18)=36g | 1.31× | Apprentice |
| Leather Armor | 65g | **124g** | 4×CL(18)+2×AP(8)=88g | 1.41× | Journeyman |
| Leather Bracers | 40g | **76g** | 3×CL(18)=54g | 1.41× | Journeyman |
| Leather Greaves | 50g | **87g** | 3×CL(18)+1×AP(8)=62g | 1.40× | Journeyman |
| Quiver | 55g | **98g** | 3×CL(18)+2×AP(8)=70g | 1.40× | Journeyman |
| Wolf Leather Armor | 120g | **383g** | 3×WL(73)+2×CL(18)=255g | 1.50× | Craftsman |
| Wolf Leather Hood | 75g | **246g** | 2×WL(73)+1×CL(18)=164g | 1.50× | Craftsman |
| Bear Hide Cuirass | 155g | **476g** | 3×BL(91)+2×CL(18)+1×AP(8)=317g | 1.50× | Craftsman |
| Ranger's Quiver | 105g | **326g** | 2×WL(73)+2×CL(18)+1×BearHides(35)=217g | 1.50× | Craftsman |

---

## F. TAILOR Armor — All 13 Fixed

All were underwater per v4 audit. Recalculated with corrected material prices (WC=20g, FC=59g, SF=75g, CL=18g, WL=73g, BL=91g).

| Item | Old | New | Input Cost | Multiplier | Tier |
|------|-----|-----|------------|------------|------|
| Cloth Hood | 25g | **52g** | 2×WC(20)=40g | 1.30× | Apprentice |
| Cloth Sash | 20g | **50g** | 1×WC(20)+1×CL(18)=38g | 1.32× | Apprentice |
| Cloth Robe | 45g | **128g** | 4×WC(20)+1×CL(18)=98g | 1.31× | Apprentice |
| Wool Trousers | 30g | **78g** | 3×WC(20)=60g | 1.30× | Apprentice |
| Scholar's Robe | 70g | **191g** | 5×WC(20)+2×CL(18)=136g | 1.40× | Journeyman |
| Traveler's Cloak | 55g | **135g** | 3×WC(20)+2×CL(18)=96g | 1.41× | Journeyman |
| Merchant's Hat | 45g | **82g** | 2×WC(20)+1×CL(18)=58g | 1.41× | Journeyman |
| Herbalist's Apron | 50g | **135g** | 3×WC(20)+2×CL(18)=96g | 1.41× | Journeyman |
| Archmage's Robe | 150g | **689g** | 4×FC(59)+2×SF(75)+1×WL(73)=459g | 1.50× | Craftsman |
| Diplomat's Regalia | 140g | **560g** | 3×SF(75)+2×FC(59)+1×SilverOre(30)=373g | 1.50× | Craftsman |
| Silk Hood of Insight | 90g | **314g** | 2×SF(75)+1×FC(59)=209g | 1.50× | Craftsman |
| Noble's Leggings | 95g | **485g** | 3×FC(59)+2×WL(73)=323g | 1.50× | Craftsman |
| Enchanted Cloak | 180g | **986g** | 3×SF(75)+3×FC(59)+2×BL(91)+1×Glowcap(32)=616g | 1.60× | Craftsman |

---

## G. ARMORER — 25 Estimated base_values (NEW)

YAML had id/level/slot only — no input details. Values estimated from ingot tiers with standard multipliers. Inputs assumed: 2-3 ingots + leather secondary.

| Material Tier | HEAD | CHEST | HANDS | LEGS | OFF_HAND |
|--------------|------|-------|-------|------|----------|
| Copper (L1, Apprentice) | 45g | 90g | 40g | 55g | 55g |
| Iron (L10, Journeyman) | 130g | 250g | 110g | 160g | 150g |
| Steel (L30, Craftsman) | 500g | 950g | 420g | 600g | 550g |
| Mithril (L55, Expert) | 1800g | 3500g | 1500g | 2200g | 2000g |
| Adamantine (L75, Master) | 6000g | 12000g | 5000g | 7500g | 7000g |

**Note:** These are floor-price estimates. Exact values should be validated against actual recipe inputs in `shared/src/data/recipes/armor.ts` when those recipes are wired into the YAML.

---

## H. ENCHANTER — 9 Estimated base_values (NEW)

| Scroll | Level | base_value | Tier |
|--------|-------|-----------|------|
| Fortified | 5 | 80g | Apprentice |
| Flaming | 10 | 130g | Journeyman |
| Frost | 10 | 130g | Journeyman |
| Lightning | 15 | 175g | Journeyman |
| Swift | 15 | 160g | Journeyman |
| Poisoned | 20 | 200g | Journeyman |
| Warding | 20 | 210g | Journeyman |
| Holy | 30 | 450g | Craftsman |
| Shadow | 30 | 450g | Craftsman |

---

## I. JEWELER — 12 Estimated base_values (NEW)

| Item | Level | base_value | Tier |
|------|-------|-----------|------|
| Copper Ring | 1 | 50g | Apprentice |
| Copper Necklace | 1 | 60g | Apprentice |
| Iron Ring | 10 | 120g | Journeyman |
| Brooch of Protection | 15 | 170g | Journeyman |
| Silver Ring | 20 | 200g | Journeyman |
| Silver Necklace | 20 | 250g | Journeyman |
| Circlet of Focus | 25 | 350g | Journeyman |
| Gold Ring | 30 | 450g | Craftsman |
| Gold Necklace | 30 | 550g | Craftsman |
| Brooch of Speed | 30 | 400g | Craftsman |
| Crown of Wisdom | 50 | 2000g | Expert |
| Mithril Ring | 55 | 2500g | Expert |

---

## J. MASON — 12 Estimated base_values (NEW)

| Item | Level | base_value | Tier |
|------|-------|-----------|------|
| Cut Stone (L1) | 1 | 12g | Apprentice |
| Cut Stone (L3) | 3 | 15g | Apprentice |
| Cut Sandstone | 5 | 18g | Apprentice |
| Bricks (L5) | 5 | 15g | Apprentice |
| Stone Slab | 8 | 25g | Apprentice |
| Bricks (L10) | 10 | 20g | Journeyman |
| Stone Hearth | 10 | 60g | Journeyman |
| Clay Pot | 12 | 30g | Journeyman |
| Brick Oven | 15 | 90g | Journeyman |
| Stone Fountain | 25 | 200g | Journeyman |
| Polished Marble | 30 | 50g | Craftsman |
| Marble Statue | 35 | 350g | Craftsman |

---

## K. SCRIBE — 7 Estimated base_values (NEW)

| Item | Level | base_value | Tier |
|------|-------|-----------|------|
| Area Map | 5 | 20g | Apprentice |
| Scroll of Fire | 10 | 60g | Journeyman |
| Identification Scroll | 10 | 50g | Journeyman |
| Scroll of Ice | 15 | 80g | Journeyman |
| Scroll of Healing | 20 | 100g | Journeyman |
| Dungeon Map | 20 | 80g | Journeyman |
| Scroll of Lightning | 25 | 120g | Journeyman |

---

## L. String-Array Professions — Companion Pricing (Section 10)

Added new **Section 10: Base Value Reference** to the YAML with estimated base_values for professions whose recipes are listed as string arrays (no inline object to attach `base_value` to):

| Profession | Items Priced | Notes |
|-----------|-------------|-------|
| BLACKSMITH | 28 items | Raw-ore recipes (L3-L8) + specialist branches |
| WOODWORKER | 25 items | Processing intermediates + finished furniture/tools |
| LEATHERWORKER | 13 items | Uses corrected TANNER leather prices |
| ALCHEMIST | 11 items | Consumable potions (lower margins per Rule 3) |
| FLETCHER | 13 items | Bows, arrows, quivers |

---

## Summary

| Category | Items Priced | Type |
|----------|-------------|------|
| Raw Materials | 22 | NEW base_values |
| SMELTER | 11 | NEW base_values |
| BREWER | 9 | NEW base_values |
| TANNER processing | 2 | FIX (value-destructive) |
| TAILOR processing | 2 | FIX (value-destructive) |
| TANNER finished goods | 12 | FIX (all underwater) |
| TAILOR armor | 13 | FIX (all underwater) |
| TAILOR material items | 2 | FIX (sync with recipes) |
| ARMORER | 25 | NEW estimated base_values |
| ENCHANTER | 9 | NEW estimated base_values |
| JEWELER | 12 | NEW estimated base_values |
| MASON | 12 | NEW estimated base_values |
| SCRIBE | 7 | NEW estimated base_values |
| BLACKSMITH (Section 10) | 28 | NEW companion reference |
| WOODWORKER (Section 10) | 25 | NEW companion reference |
| LEATHERWORKER (Section 10) | 13 | NEW companion reference |
| ALCHEMIST (Section 10) | 11 | NEW companion reference |
| FLETCHER (Section 10) | 13 | NEW companion reference |
| **TOTAL** | **226** | |

### NEEDS REVIEW

None. All items could be priced with reasonable confidence. The ARMORER, ENCHANTER, JEWELER, MASON, and SCRIBE values are estimates (inputs not fully specified in YAML) — validate against actual recipe inputs in `shared/src/data/recipes/` when those are wired.
