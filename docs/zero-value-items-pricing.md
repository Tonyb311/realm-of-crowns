# Zero-Value Items Pricing Reference

**Generated**: 2026-02-20
**Purpose**: Assign base_value prices to all 258 items currently at baseValue=0 in production.

## Pricing Methodology

All prices use the YAML-established multiplier framework:

| Tier | Multiplier Range |
|------|-----------------|
| Apprentice (T1) | 1.3-1.5x input cost |
| Journeyman (T2) | 1.4-1.6x input cost |
| Craftsman (T3) | 1.5-1.8x input cost |
| Expert (T4) | 1.6-2.0x input cost |
| Master (T5) | 1.8-2.0x input cost |

**Methods Used**:
- **Method A**: Direct recipe cost calculation (sum inputs x multiplier)
- **Method B**: Material tier ratio (anchor from YAML known prices)
- **Method C**: Category parallel (match similar items at same tier)
- **Method D**: Starter/vendor (near-worthless starter gear, 2-5g)

## Reference Material Prices (from YAML)

| Material | base_value |
|----------|-----------|
| Copper Ore | 4g |
| Iron Ore Chunks | 4g |
| Iron Ore | 6g |
| Coal | 12g |
| Silver Ore | 30g |
| Gold Ore | 40g |
| Mithril Ore | 80g |
| Adamantine Ore | 150g |
| Copper Ingot | 16g |
| Iron Ingot | 52g |
| Steel Ingot | 210g |
| Silver Ingot | 72g |
| Gold Ingot | 185g |
| Mithril Ingot | 700g |
| Adamantine Ingot | 2350g |
| Nails | 1g |
| Iron Fittings | 8g |
| Softwood | 3g |
| Wood Logs | 5g |
| Hardwood | 25g |
| Exotic Wood | 50g |
| Softwood Planks | 3g |
| Rough Planks | 4g |
| Hardwood Planks | 18g |
| Exotic Planks | 40g |
| Wooden Dowels | 4g |
| Wooden Handle | 5g |
| Bow Stave | 11g |
| Wooden Frame | 58g |
| Beams | 17g |
| Animal Pelts | 8g |
| Wolf Pelts | 28g |
| Bear Hides | 35g |
| Cured Leather | 18g |
| Wolf Leather | 73g |
| Bear Leather | 91g |
| Soft Leather | 14g |
| Exotic Leather | 120g |
| Cotton | 4g |
| Wool | 10g |
| Fine Wool | 35g |
| Silkworm Cocoons | 40g |
| Cloth | 8g |
| Woven Cloth | 18g |
| Fine Cloth | 59g |
| Silk Fabric | 75g |
| Arcane Reagents | 35g |
| Gemstones | 25g |
| Wild Herbs | 5g |
| Wild Berries | 3g |
| Clay | 4g |
| Medicinal Herbs | 28g |
| Glowcap Mushrooms | 32g |
| Grain | 3g |
| Vegetables | 3g |
| Apples | 3g |
| Salt | 2g |
| Spices | 8g |
| Eggs | 5g |
| Milk | 6g |
| Hops | 5g |
| Grapes | 4g |
| Raw Fish | 4g |
| River Trout | 22g |
| Lake Perch | 25g |
| Wild Game Meat | 5g |
| Wheat | 3g |
| Stone Blocks | 7g |
| Marble | 15g |
| Silite Sand | 5g |
| Flowers | 3g |

---

## SECTION 1: WEAPONS (39 items)

### Copper Weapons (L1, T1) -- BLACKSMITH weapon recipes

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Copper Dagger | copper-dagger | WEAPON | 20 | A | 1xCI(16)+1xSL(14)=30g; compact dagger ~0.67x; starter |
| Copper Sword | copper-sword | WEAPON | 28 | A | 2xCI(32)+1xSL(14)=46g; 0.61x; starter value |
| Copper Mace | copper-mace | WEAPON | 28 | A | 2xCI(32)+1xSWP(3)=35g; ~0.80x; starter |
| Copper Axe | copper-axe | WEAPON | 28 | A | 2xCI(32)+1xSWP(3)=35g; ~0.80x; starter |
| Copper Spear | copper-spear | WEAPON | 22 | A | 1xCI(16)+2xSWP(6)=22g; ~1.0x; starter |

### Iron Weapons (L10, T2) -- BLACKSMITH weapon recipes

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Iron Dagger | iron-dagger | WEAPON | 48 | A | 1xII(52)+1xSL(14)=66g; T2 ~0.73x; economy weapon |
| Iron Sword | iron-sword | WEAPON | 60 | A | 3xII(156)+1xSL(14)+1xHP(18)=188g; set at 60 for game balance (BS recipe already priced at 23g for the simpler BS recipe) |
| Iron Longsword | iron-longsword | WEAPON | 75 | A | 4xII(208)+1xSL(14)=222g; reduced for T2 ratio |
| Iron Axe | iron-axe | WEAPON | 55 | A | 3xII(156)+1xHP(18)=174g; T2 weapon tier |
| Iron Battleaxe | iron-battleaxe | WEAPON | 85 | A | 5xII(260)+2xHP(36)=296g; 2H premium; T2 |
| Iron Mace | iron-mace | WEAPON | 55 | A | 3xII(156)+1xHP(18)=174g; T2 match Iron Axe |
| Iron Warhammer | iron-warhammer | WEAPON | 90 | A | 5xII(260)+2xHP(36)=296g; 2H; T2 |
| Iron Spear | iron-spear | WEAPON | 50 | A | 2xII(104)+2xHP(36)=140g; T2 |

### Steel Weapons (L30, T3) -- BLACKSMITH weapon recipes

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Steel Dagger | steel-dagger | WEAPON | 150 | A | 1xStI(210)+1xSL(14)=224g; T3 ~0.67x |
| Steel Sword | steel-sword | WEAPON | 200 | A | 3xStI(630)+1xSL(14)+1xHP(18)=662g; set for balance |
| Steel Longsword | steel-longsword | WEAPON | 250 | A | 4xStI(840)+1xSL(14)=854g; T3 |
| Steel Greatsword | steel-greatsword | WEAPON | 350 | A | 6xStI(1260)+2xSL(28)=1288g; 2H premium |
| Steel Axe | steel-axe | WEAPON | 190 | A | 3xStI(630)+1xHP(18)=648g; T3 |
| Steel Battleaxe | steel-battleaxe | WEAPON | 310 | A | 5xStI(1050)+2xHP(36)=1086g; 2H; T3 |
| Steel Mace | steel-mace | WEAPON | 190 | A | 3xStI(630)+1xHP(18)=648g; T3 |
| Steel Warhammer | steel-warhammer | WEAPON | 320 | A | 5xStI(1050)+2xHP(36)=1086g; 2H; T3 |
| Steel Halberd | steel-halberd | WEAPON | 300 | A | 4xStI(840)+3xHP(54)=894g; 2H; T3 |
| Steel Spear | steel-spear | WEAPON | 160 | A | 2xStI(420)+2xHP(36)=456g; T3 |

### Mithril Weapons (L55, T4)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Mithril Sword | mithril-sword | WEAPON | 750 | A | 3xMI(2100)+1xEL(120)+1xHP(18)=2238g; T4 |
| Mithril Longsword | mithril-longsword | WEAPON | 900 | A | 4xMI(2800)+1xEL(120)=2920g; T4 |
| Mithril Greatsword | mithril-greatsword | WEAPON | 1200 | A | 6xMI(4200)+2xEL(240)=4440g; 2H; T4 |
| Mithril Battleaxe | mithril-battleaxe | WEAPON | 1100 | A | 5xMI(3500)+2xEP(80)=3580g; 2H; T4 |
| Mithril Warhammer | mithril-warhammer | WEAPON | 1100 | A | 5xMI(3500)+2xEP(80)=3580g; 2H; T4 |
| Mithril Halberd | mithril-halberd | WEAPON | 1000 | A | 4xMI(2800)+3xEP(120)=2920g; 2H; T4 |

### Adamantine Weapons (L75, T5)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Adamantine Greatsword | adamantine-greatsword | WEAPON | 2500 | A | 6xAdI(14100)+2xEL(240)+1xAR(35)=14375g; T5 flagship |
| Adamantine Battleaxe | adamantine-battleaxe | WEAPON | 2200 | A | 5xAdI(11750)+2xEP(80)+1xAR(35)=11865g; T5 |
| Adamantine Warhammer | adamantine-warhammer | WEAPON | 2200 | A | 5xAdI(11750)+2xEP(80)+1xAR(35)=11865g; T5 |
| Adamantine Halberd | adamantine-halberd | WEAPON | 2000 | A | 4xAdI(9400)+3xEP(120)+1xAR(35)=9555g; T5 |

---

## SECTION 2: ARMORER ARMOR (25 items)

### Copper Armor (L1, T1) -- ARMORER

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Copper Helm | copper-helm | ARMOR | 45 | B | YAML: 45g |
| Copper Chestplate | copper-chestplate | ARMOR | 90 | B | YAML: 90g |
| Copper Gauntlets | copper-gauntlets | ARMOR | 45 | B | YAML: 45g |
| Copper Greaves | copper-greaves | ARMOR | 55 | B | YAML: 55g |
| Copper Shield | copper-shield | ARMOR | 55 | B | YAML: 55g |

### Iron Armor (L10, T2) -- ARMORER

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Iron Helm | iron-helm | ARMOR | 130 | B | YAML: 130g |
| Iron Chestplate | iron-chestplate | ARMOR | 250 | B | YAML: 250g |
| Iron Gauntlets | iron-gauntlets | ARMOR | 110 | B | YAML: 110g |
| Iron Greaves | iron-greaves | ARMOR | 175 | B | YAML: 175g |
| Iron Shield | iron-shield | ARMOR | 150 | B | YAML: 150g |

### Steel Armor (L30, T3) -- ARMORER

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Steel Helm | steel-helm | ARMOR | 500 | B | YAML: 500g |
| Steel Chestplate | steel-chestplate | ARMOR | 1000 | B | YAML: 1000g |
| Steel Gauntlets | steel-gauntlets | ARMOR | 420 | B | YAML: 420g |
| Steel Greaves | steel-greaves | ARMOR | 700 | B | YAML: 700g |
| Steel Shield | steel-shield | ARMOR | 550 | B | YAML: 550g |

### Mithril Armor (L55, T4) -- ARMORER

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Mithril Helm | mithril-helm | ARMOR | 1800 | B | YAML: 1800g |
| Mithril Chestplate | mithril-chestplate | ARMOR | 3500 | B | YAML: 3500g |
| Mithril Gauntlets | mithril-gauntlets | ARMOR | 1500 | B | YAML: 1500g |
| Mithril Greaves | mithril-greaves | ARMOR | 2200 | B | YAML: 2200g |
| Mithril Shield | mithril-shield | ARMOR | 2000 | B | YAML: 2000g |

### Adamantine Armor (L75, T5) -- ARMORER

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Adamantine Helm | adamantine-helm | ARMOR | 6000 | B | YAML: 6000g |
| Adamantine Chestplate | adamantine-chestplate | ARMOR | 12000 | B | YAML: 12000g |
| Adamantine Gauntlets | adamantine-gauntlets | ARMOR | 5000 | B | YAML: 5000g |
| Adamantine Greaves | adamantine-greaves | ARMOR | 8000 | B | YAML: 8000g |
| Adamantine Shield | adamantine-shield | ARMOR | 8500 | B | YAML: 8500g |

---

## SECTION 3: TANNER ARMOR (12 items)

### Tanner Processing Outputs (already priced in YAML)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Cured Leather | cured-leather | MATERIAL | 18 | B | YAML: 18g |
| Wolf Leather | wolf-leather | MATERIAL | 73 | B | YAML: 73g |
| Bear Leather | bear-leather | MATERIAL | 91 | B | YAML: 91g |

### Tanner Finished Goods -- Apprentice (L3-4)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Leather Cap | leather-cap | ARMOR | 28 | A | 2xCL(36)=36g; 0.78x; starter leather |
| Leather Vest | leather-vest | ARMOR | 50 | A | 4xCL(72)=72g; 0.69x; core piece |
| Leather Belt | leather-belt | ARMOR | 30 | A | 2xCL(36)+1xIOC(4)=40g; 0.75x |

### Tanner Finished Goods -- Journeyman (L5-6)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Leather Armor | leather-armor | ARMOR | 65 | A | 5xCL(90)+1xIOC(4)=94g; 0.69x; mid leather |
| Leather Bracers | leather-bracers | ARMOR | 35 | A | 2xCL(36)+1xIOC(4)=40g; 0.88x |
| Leather Greaves | leather-greaves | ARMOR | 50 | A | 3xCL(54)+1xIOC(4)=58g; 0.86x |
| Quiver | quiver | TOOL | 45 | B | YAML: 45g (Fletcher section) |

### Tanner Finished Goods -- Craftsman (L7-8)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Wolf Leather Armor | wolf-leather-armor | ARMOR | 200 | A | 4xWL(292)+2xCL(36)+1xSO(30)=358g; 0.56x; premium |
| Wolf Leather Hood | wolf-leather-hood | ARMOR | 125 | A | 2xWL(146)+1xCL(18)=164g; 0.76x |
| Bear Hide Cuirass | bear-hide-cuirass | ARMOR | 340 | A | 5xBL(455)+2xCL(36)+2xSO(60)=551g; 0.62x |
| Ranger's Quiver | rangers-quiver | TOOL | 175 | B | YAML: 175g |

---

## SECTION 4: TAILOR ARMOR (13 items)

### Apprentice (L3-4)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Cloth Hood | cloth-hood | ARMOR | 25 | A | 2xWC(36)=36g; 0.69x; cheapest cloth |
| Cloth Sash | cloth-sash | ARMOR | 25 | A | 1xWC(18)+1xCL(18)=36g; 0.69x |
| Cloth Robe | cloth-robe | ARMOR | 55 | A | 4xWC(72)+1xCL(18)=90g; 0.61x |
| Wool Trousers | wool-trousers | ARMOR | 38 | A | 3xWC(54)=54g; 0.70x |

### Journeyman (L5-6)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Scholar's Robe | scholars-robe | ARMOR | 80 | A | 5xWC(90)+2xCL(36)=126g; 0.63x |
| Traveler's Cloak | travelers-cloak | ARMOR | 65 | A | 3xWC(54)+2xCL(36)=90g; 0.72x |
| Merchant's Hat | merchants-hat | ARMOR | 40 | A | 2xWC(36)+1xCL(18)=54g; 0.74x |
| Herbalist's Apron | herbalists-apron | ARMOR | 60 | A | 3xWC(54)+2xCL(36)=90g; 0.67x |

### Craftsman (L7-8)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Archmage's Robe | archmages-robe | ARMOR | 250 | A | 4xFC(236)+2xSF(150)+1xWL(73)=459g; 0.54x; endgame cloth |
| Diplomat's Regalia | diplomats-regalia | ARMOR | 230 | A | 3xSF(225)+2xFC(118)+1xSO(30)=373g; 0.62x |
| Silk Hood of Insight | silk-hood-of-insight | ARMOR | 155 | A | 2xSF(150)+1xFC(59)=209g; 0.74x |
| Noble's Leggings | nobles-leggings | ARMOR | 200 | A | 3xFC(177)+2xWL(146)=323g; 0.62x |
| Enchanted Cloak | enchanted-cloak | ARMOR | 350 | A | 3xSF(225)+3xFC(177)+2xBL(182)+1xGM(32)=616g; 0.57x |

---

## SECTION 5: LEATHERWORKER ARMOR & ACCESSORIES (13 items)

Already priced in YAML Section 10. Confirming values:

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Leather Gloves | leather-gloves | ARMOR | 58 | B | YAML: 58g |
| Leather Boots | leather-boots | ARMOR | 58 | B | YAML: 58g |
| Leather Backpack | leather-backpack | ACCESSORY | 78 | B | YAML: 78g |
| Leather Waterskin | leather-waterskin | CONSUMABLE | 35 | B | YAML: 35g |
| Wolf Leather Gloves | wolf-leather-gloves | ARMOR | 145 | B | YAML: 145g |
| Wolf Leather Boots | wolf-leather-boots | ARMOR | 145 | B | YAML: 145g |
| Toolbelt | toolbelt | ACCESSORY | 140 | B | YAML: 140g |
| Leather Repair Kit | leather-repair-kit | TOOL | 80 | B | YAML: 80g |
| Ranger's Pack | rangers-pack | ACCESSORY | 240 | B | YAML: 240g |
| Bear Hide Vambraces | bear-hide-vambraces | ARMOR | 310 | B | YAML: 310g |
| Bear Leather Boots | bear-leather-boots | ARMOR | 260 | B | YAML: 260g |
| Hunter's Kit | hunters-kit | TOOL | 280 | B | YAML: 280g |
| Explorer's Pack | explorers-pack | ACCESSORY | 480 | B | YAML: 480g |

---

## SECTION 6: BLACKSMITH CRAFTED (28 items)

Already priced in YAML Section 10. Confirming values:

### Apprentice (shared, L3-4)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Iron Pickaxe | iron-pickaxe | TOOL | 18 | B | YAML: 18g |
| Iron Hatchet | iron-hatchet | TOOL | 18 | B | YAML: 18g |
| Iron Hoe | iron-hoe | TOOL | 17 | B | YAML: 17g |
| Iron Dagger (BS) | bs-iron-dagger | WEAPON | 17 | B | YAML: 17g (BS simple recipe) |
| Iron Sword (BS) | bs-iron-sword | WEAPON | 23 | B | YAML: 23g (BS simple recipe) |
| Iron Mace (BS) | bs-iron-mace | WEAPON | 22 | C | ~5xIOC(20)=20g; 1.10x |
| Iron Chain Shirt | iron-chain-shirt | ARMOR | 28 | A | 6xIOC(24)=24g; 1.17x |
| Wooden Shield (BS) | bs-wooden-shield | ARMOR | 22 | A | 4xWL(20)+1xIOC(4)=24g; 0.92x |

### Journeyman (shared, L5-6)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Steel Pickaxe | steel-pickaxe | TOOL | 38 | B | YAML: 38g |
| Steel Hatchet | steel-hatchet | TOOL | 38 | B | YAML: 38g |
| Steel Hoe | steel-hoe | TOOL | 38 | B | YAML: 38g (was unnamed in S10) |
| Herbalist's Sickle | herbalists-sickle | TOOL | 30 | B | YAML: 30g |
| Fishing Hook Set | fishing-hook-set | TOOL | 25 | A | 2xIOC(8)+1xCoal(12)=20g; 1.25x |
| Steel Sword (BS) | bs-steel-sword | WEAPON | 45 | B | YAML: 45g |
| Steel Warhammer (BS) | bs-steel-warhammer | WEAPON | 52 | A | 5xIOC(20)+3xCoal(36)+2xWL(10)=66g; 0.79x |
| Steel Chain Mail | steel-chain-mail | ARMOR | 48 | B | YAML: 48g (Iron Chainmail) |
| Steel Helmet | steel-helmet | ARMOR | 35 | B | YAML: 35g (Reinforced Helm) |

### Specialist -- Toolsmith (L7-8)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Silver Pickaxe | silver-pickaxe | TOOL | 95 | B | YAML: 95g |
| Hardwood Hatchet | hardwood-hatchet | TOOL | 80 | B | YAML: 80g |
| Hunter's Knife | hunters-knife | TOOL | 85 | B | YAML: 85g |
| Reinforced Hoe | reinforced-hoe | TOOL | 75 | B | YAML: 75g |

### Specialist -- Weaponsmith (L7-8)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Silver Longsword | silver-longsword | WEAPON | 120 | B | YAML: 120g |
| Silver Dagger | silver-dagger | WEAPON | 90 | B | YAML: 90g |
| Silver Battleaxe | silver-battleaxe | WEAPON | 125 | B | YAML: 125g |
| War Pick | war-pick | WEAPON | 100 | B | YAML: 100g |

### Specialist -- Armorer (L7-8)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Silver-Studded Plate | silver-studded-plate | ARMOR | 130 | B | YAML: 130g |
| Silver Helm | silver-helm | ARMOR | 95 | B | YAML: 95g |
| Hardwood Tower Shield | hardwood-tower-shield | ARMOR | 108 | B | YAML: 108g |
| Reinforced Chain Leggings | reinforced-chain-leggings | ARMOR | 105 | B | YAML: 105g |

---

## SECTION 7: WOODWORKER (25 items)

Already priced in YAML Section 10. Confirming values:

### Processing

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Rough Planks | rough-planks | MATERIAL | 4 | B | YAML: 4g |
| Softwood Planks | softwood-planks | MATERIAL | 3 | B | YAML: 3g |
| Hardwood Planks | hardwood-planks | MATERIAL | 18 | B | YAML: 18g |
| Exotic Planks | exotic-planks | MATERIAL | 40 | B | YAML: 40g |
| Wooden Dowels | wooden-dowels | MATERIAL | 4 | B | YAML: 4g |
| Wooden Handle | wooden-handle | MATERIAL | 5 | B | YAML: 5g |
| Bow Stave | bow-stave | MATERIAL | 11 | B | YAML: 11g |
| Beams (Wooden Beams) | beams | MATERIAL | 17 | B | YAML: 17g |
| Barrel | barrel | HOUSING | 55 | B | YAML: 55g |
| Wooden Frame | wooden-frame | MATERIAL | 58 | B | YAML: 58g |
| Furniture | furniture | HOUSING | 63 | B | YAML: 63g |

### Finished Goods

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Wooden Pickaxe | wooden-pickaxe | TOOL | 19 | B | YAML: 19g |
| Fishing Rod | fishing-rod | TOOL | 14 | B | YAML: 14g |
| Carving Knife | carving-knife | TOOL | 12 | B | YAML: 12g |
| Wooden Chair | wooden-chair | HOUSING | 19 | B | YAML: 19g |
| Tanning Rack | tanning-rack | TOOL | 58 | B | YAML: 58g |
| Fine Fishing Rod | fine-fishing-rod | TOOL | 45 | B | YAML: 45g |
| Wooden Table | wooden-table | HOUSING | 78 | B | YAML: 78g |
| Storage Chest | storage-chest | HOUSING | 117 | B | YAML: 117g |
| Wooden Bed Frame | wooden-bed-frame | HOUSING | 110 | B | YAML: 110g |
| Wooden Shield (WW) | ww-wooden-shield | ARMOR | 87 | B | YAML: 87g |
| Wooden Shelf | wooden-shelf | HOUSING | 75 | B | YAML: 75g |
| Reinforced Crate | reinforced-crate | HOUSING | 130 | B | YAML: 130g |
| Practice Bow | practice-bow | WEAPON | 45 | B | YAML: 45g |
| Hardwood Tower Shield (WW) | ww-hardwood-tower-shield | ARMOR | 230 | B | YAML: 230g |

---

## SECTION 8: ALCHEMIST CONSUMABLES (11 items)

Already priced in YAML Section 10:

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Minor Healing Potion | minor-healing-potion | CONSUMABLE | 19 | B | YAML: 19g |
| Antidote | antidote | CONSUMABLE | 14 | B | YAML: 14g |
| Berry Salve | berry-salve | CONSUMABLE | 15 | B | YAML: 15g |
| Healing Potion | healing-potion | CONSUMABLE | 27 | B | YAML: 27g |
| Elixir of Strength | elixir-of-strength | CONSUMABLE | 55 | B | YAML: 55g |
| Elixir of Wisdom | elixir-of-wisdom | CONSUMABLE | 55 | B | YAML: 55g |
| Poison Resistance Tonic | poison-resistance-tonic | CONSUMABLE | 20 | B | YAML: 20g |
| Greater Healing Potion | greater-healing-potion | CONSUMABLE | 85 | B | YAML: 85g |
| Elixir of Fortitude | elixir-of-fortitude | CONSUMABLE | 95 | B | YAML: 95g |
| Glowcap Extract | glowcap-extract | CONSUMABLE | 95 | B | YAML: 95g |
| Universal Antidote | universal-antidote | CONSUMABLE | 100 | B | YAML: 100g |

---

## SECTION 9: COOK CONSUMABLES (24 items)

### Cook Processing Recipes (cook.ts)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Flour | flour | MATERIAL | 8 | A | 2xGrain(6)+1xWL(5)=11g; 0.73x; staple |
| Apple Sauce | apple-sauce | CONSUMABLE | 9 | A | 3xApples(9)+1xWL(5)=14g; 0.64x |
| Porridge | porridge | CONSUMABLE | 8 | A | 2xGrain(6)+1xWL(5)=11g; 0.73x |
| Vegetable Stew | vegetable-stew | CONSUMABLE | 10 | A | 3xVeg(9)+1xWL(5)=14g; 0.71x |
| Bread Loaf | bread-loaf | CONSUMABLE | 15 | A | 2xFlour(16)+1xWL(5)=21g; 0.71x |
| Seasoned Roast Vegetables | seasoned-roast-vegetables | CONSUMABLE | 14 | A | 2xVeg(6)+1xWH(5)+1xWL(5)=16g; 0.88x |
| Harvest Feast | harvest-feast | CONSUMABLE | 40 | A | 1xBL(15)+2xApples(6)+2xWH(10)+1xWL(5)=36g; 1.11x |
| Fisherman's Banquet | fishermans-banquet | CONSUMABLE | 42 | A | 1xGF(12)+1xBL(15)+1xBJ(8)+1xWL(5)=40g; 1.05x |
| Spiced Pastry | spiced-pastry | CONSUMABLE | 35 | A | 2xFlour(16)+2xWH(10)+1xBJ(8)+1xWL(5)=39g; 0.90x |

### Cook Consumable Recipes (consumables.ts)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Bread | bread | CONSUMABLE | 5 | A | 2xWheat(6)=6g; output 3 => 2g/unit; base=5 per stack convention |
| Rations | rations | CONSUMABLE | 3 | A | 1xWheat(3)+1xSalt(2)=5g; output 3; starter food |
| Roast Meat | roast-meat | CONSUMABLE | 12 | A | 2xWGM(10)+1xSpices(8)=18g; output 2; 9g/unit |
| Vegetable Soup | vegetable-soup | CONSUMABLE | 8 | A | 3xVeg(9)+1xSalt(2)=11g; output 2; 5.5g/unit |
| Berry Jam | berry-jam | CONSUMABLE | 8 | A | 4xWB(12)+1xWheat(3)=15g; output 2; 7.5g/unit |
| Herbal Tea | herbal-tea | CONSUMABLE | 10 | A | 2xWH(10)+1xSalt(2)=12g; output 2; 6g/unit |
| Smoked Meat | smoked-meat | CONSUMABLE | 12 | A | 2xWGM(10)+1xWL(5)+1xSalt(2)=17g; output 3; 5.7g/unit |
| Apple Pie | apple-pie | CONSUMABLE | 14 | A | 3xApples(9)+2xWheat(6)=15g; output 2; 7.5g/unit |
| Berry Tart | berry-tart | CONSUMABLE | 18 | A | 3xWB(9)+2xWheat(6)+1xApples(3)=18g; output 2; 9g/unit |
| Seasoned Fish Platter | seasoned-fish-platter | CONSUMABLE | 20 | A | 3xRF(12)+1xSpices(8)+1xWH(5)=25g; output 2; 12.5g/unit |
| Scrambled Eggs | scrambled-eggs | CONSUMABLE | 8 | A | 3xEggs(15)=15g; output 2; 7.5g/unit |
| Creamy Porridge | creamy-porridge | CONSUMABLE | 8 | A | 2xGrain(6)+1xMilk(6)=12g; output 2; 6g/unit |
| Farm Breakfast | farm-breakfast | CONSUMABLE | 12 | A | 2xEggs(10)+1xMilk(6)+1xGrain(3)=19g; output 2; 9.5g/unit |
| Hearty Feast | hearty-feast | CONSUMABLE | 55 | A | 3xBeef(30)+2xVeg(6)+2xWheat(6)+2xSpices(16)=58g; output 4; 14.5g/unit |
| Royal Banquet | royal-banquet | CONSUMABLE | 120 | A | 3xBeef(30)+2xPork(20)+2xChicken(14)+3xVeg(9)+3xSpices(24)+1xRH(15)=112g; output 6; T5 premium |
| Grilled Fish | grilled-fish | CONSUMABLE | 12 | A | 2xRF(8)+1xWH(5)=13g; output 2; 6.5g/unit |
| Fish Stew | fish-stew | CONSUMABLE | 15 | A | 3xRF(12)+1xGrain(3)+1xWH(5)=20g; output 2; 10g/unit |
| Smoked Fish | smoked-fish | CONSUMABLE | 10 | A | 3xRF(12)+1xWL(5)=17g; output 3; 5.7g/unit |
| Pan-Seared Trout | pan-seared-trout | CONSUMABLE | 40 | A | 2xRT(44)+1xWH(5)+1xApples(3)=52g; output 2; 26g/unit |
| Perch Feast | perch-feast | CONSUMABLE | 50 | A | 3xLP(75)+2xGrain(6)+1xWH(5)=86g; output 2; 43g/unit |
| Fisherman's Pie | fishermans-pie | CONSUMABLE | 60 | A | 2xRT(44)+2xLP(50)+2xGrain(6)+1xEggs(5)=105g; output 2; 52.5g/unit |
| Smoked Trout Rations | smoked-trout-rations | CONSUMABLE | 25 | A | 3xRT(66)+2xWL(10)=76g; output 4; 19g/unit |

---

## SECTION 10: BREWER CONSUMABLES (9 items)

Already priced in YAML:

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Ale | ale | CONSUMABLE | 6 | B | YAML: 6g |
| Apple Cider | apple-cider | CONSUMABLE | 6 | B | YAML: 6g |
| Berry Cordial | berry-cordial | CONSUMABLE | 8 | B | YAML: 8g |
| Strong Ale | strong-ale | CONSUMABLE | 12 | B | YAML: 12g |
| Mulled Cider | mulled-cider | CONSUMABLE | 14 | B | YAML: 14g |
| Herbal Brew | herbal-brew | CONSUMABLE | 15 | B | YAML: 15g |
| Hopped Beer | hopped-beer | CONSUMABLE | 15 | B | YAML: 15g |
| Grape Wine | grape-wine | CONSUMABLE | 15 | B | YAML: 15g |
| Pale Ale | pale-ale | CONSUMABLE | 18 | B | YAML: 18g |

---

## SECTION 11: SMELTER PROCESSING (11 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Copper Ingot | copper-ingot | MATERIAL | 16 | B | YAML: 16g |
| Iron Ingot | iron-ingot | MATERIAL | 52 | B | YAML: 52g |
| Steel Ingot | steel-ingot | MATERIAL | 210 | B | YAML: 210g |
| Silver Ingot | silver-ingot | MATERIAL | 72 | B | YAML: 72g |
| Gold Ingot | gold-ingot | MATERIAL | 185 | B | YAML: 185g |
| Mithril Ingot | mithril-ingot | MATERIAL | 700 | B | YAML: 700g |
| Adamantine Ingot | adamantine-ingot | MATERIAL | 2350 | B | YAML: 2350g |
| Glass | glass | MATERIAL | 12 | B | YAML: 12g |
| Nails | nails | MATERIAL | 1 | B | YAML: 1g |
| Iron Fittings | iron-fittings | MATERIAL | 8 | B | YAML: 8g |
| Maintenance Kit | maintenance-kit | CONSUMABLE | 12 | A | 2xCO(8)+1xRS(5)=13g; Forgeborn utility |
| Precision Maintenance Kit | precision-maintenance-kit | CONSUMABLE | 55 | A | 3xIO(18)+2xRS(10)+1xAR(35)=63g; 0.87x |

---

## SECTION 12: MASON PROCESSING & HOUSING (12 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Cut Stone | cut-stone | MATERIAL | 19 | B | YAML: 19g |
| Cut Sandstone | cut-sandstone | MATERIAL | 50 | B | YAML: 50g |
| Bricks | bricks | MATERIAL | 33 | B | YAML: 33g (fire-clay) |
| Stone Slab | stone-slab | MATERIAL | 55 | B | YAML: 55g |
| Stone Hearth | stone-hearth | HOUSING | 82 | B | YAML: 82g |
| Clay Pot | clay-pot | MATERIAL | 30 | B | YAML: 30g |
| Brick Oven | brick-oven | HOUSING | 120 | B | YAML: 120g |
| Stone Fountain | stone-fountain | HOUSING | 295 | B | YAML: 295g |
| Polished Marble | polished-marble | MATERIAL | 65 | B | YAML: 65g |
| Marble Statue | marble-statue | HOUSING | 365 | B | YAML: 365g |

---

## SECTION 13: ENCHANTER SCROLLS (13 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Fortified Enchantment Scroll | fortified-enchantment-scroll | ENCHANTMENT | 110 | B | YAML: 110g |
| Flaming Enchantment Scroll | flaming-enchantment-scroll | ENCHANTMENT | 155 | B | YAML: 155g |
| Frost Enchantment Scroll | frost-enchantment-scroll | ENCHANTMENT | 155 | B | YAML: 155g |
| Lightning Enchantment Scroll | lightning-enchantment-scroll | ENCHANTMENT | 175 | B | YAML: 175g |
| Swift Enchantment Scroll | swift-enchantment-scroll | ENCHANTMENT | 195 | B | YAML: 195g |
| Poisoned Enchantment Scroll | poisoned-enchantment-scroll | ENCHANTMENT | 200 | B | YAML: 200g |
| Warding Enchantment Scroll | warding-enchantment-scroll | ENCHANTMENT | 210 | B | YAML: 210g |
| Holy Enchantment Scroll | holy-enchantment-scroll | ENCHANTMENT | 340 | B | YAML: 340g |
| Shadow Enchantment Scroll | shadow-enchantment-scroll | ENCHANTMENT | 330 | B | YAML: 330g |
| Earthen Enchantment Scroll | earthen-enchantment-scroll | ENCHANTMENT | 250 | B | YAML: 250g |
| Vitality Enchantment Scroll | vitality-enchantment-scroll | ENCHANTMENT | 220 | B | YAML: 220g |
| Nature's Ward Enchantment Scroll | natures-ward-enchantment-scroll | ENCHANTMENT | 300 | B | YAML: 300g |
| True Sight Enchantment Scroll | true-sight-enchantment-scroll | ENCHANTMENT | 350 | B | YAML: 350g |

---

## SECTION 14: SCRIBE SCROLLS & MAPS (11 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Area Map | area-map | CONSUMABLE | 15 | B | YAML: 15g |
| Scroll of Fire | scroll-of-fire | CONSUMABLE | 82 | B | YAML: 82g |
| Identification Scroll | identification-scroll | CONSUMABLE | 28 | B | YAML: 28g |
| Scroll of Ice | scroll-of-ice | CONSUMABLE | 80 | B | YAML: 80g |
| Scroll of Healing | scroll-of-healing | CONSUMABLE | 75 | B | YAML: 75g |
| Dungeon Map | dungeon-map | CONSUMABLE | 80 | B | YAML: 80g |
| Scroll of Lightning | scroll-of-lightning | CONSUMABLE | 85 | B | YAML: 85g |
| Scroll of Stone Skin | scroll-of-stone-skin | CONSUMABLE | 90 | B | YAML: 90g |
| Scroll of Might | scroll-of-might | CONSUMABLE | 85 | B | YAML: 85g |
| Scroll of Entangle | scroll-of-entangle | CONSUMABLE | 100 | B | YAML: 100g |
| Scroll of Restoration | scroll-of-restoration | CONSUMABLE | 130 | B | YAML: 130g |

---

## SECTION 15: JEWELER ACCESSORIES (12 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Copper Ring | copper-ring | ACCESSORY | 55 | B | YAML: 55g |
| Copper Necklace | copper-necklace | ACCESSORY | 75 | B | YAML: 75g |
| Iron Ring | iron-ring | ACCESSORY | 120 | B | YAML: 120g |
| Silver Ring | silver-ring | ACCESSORY | 155 | B | YAML: 155g |
| Gold Ring | gold-ring | ACCESSORY | 380 | B | YAML: 380g |
| Mithril Ring | mithril-ring | ACCESSORY | 2500 | B | YAML: 2500g |
| Silver Necklace | silver-necklace | ACCESSORY | 290 | B | YAML: 290g |
| Gold Necklace | gold-necklace | ACCESSORY | 650 | B | YAML: 650g |
| Circlet of Focus | circlet-of-focus | ACCESSORY | 350 | B | YAML: 350g |
| Crown of Wisdom | crown-of-wisdom | ACCESSORY | 1500 | B | YAML: 1500g |
| Brooch of Protection | brooch-of-protection | ACCESSORY | 180 | B | YAML: 180g |
| Brooch of Speed | brooch-of-speed | ACCESSORY | 400 | B | YAML: 400g |

---

## SECTION 16: FLETCHER (13 items)

Already priced in YAML Section 10:

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Bowstring | bowstring | MATERIAL | 24 | B | YAML: 24g |
| Arrows | arrows | CONSUMABLE | 2 | B | YAML: 2g per arrow |
| Shortbow | shortbow | WEAPON | 46 | B | YAML: 46g |
| Hunting Bow | hunting-bow | WEAPON | 70 | B | YAML: 70g |
| Longbow | longbow | WEAPON | 85 | B | YAML: 85g |
| War Arrows | war-arrows | CONSUMABLE | 7 | B | YAML: 7g per arrow |
| War Bow | war-bow | WEAPON | 180 | B | YAML: 180g |
| Quiver (Fletcher) | fletch-quiver | TOOL | 45 | B | YAML: 45g |
| Barbed Arrows | barbed-arrows | CONSUMABLE | 8 | B | YAML: 8g per arrow |
| Composite Bow | composite-bow | WEAPON | 225 | B | YAML: 225g |
| Ranger's Quiver (Fletcher) | fletch-rangers-quiver | TOOL | 175 | B | YAML: 175g |
| Flight Arrows | flight-arrows | CONSUMABLE | 2 | B | YAML: 2g per arrow |
| Ranger's Longbow | rangers-longbow | WEAPON | 260 | B | YAML: 260g |

---

## SECTION 17: TAILOR PROCESSING (5 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Cloth | cloth | MATERIAL | 8 | B | 3xCotton(12)=>2xCloth; 6g/unit input; legacy ARMORER chain |
| Woven Cloth | woven-cloth | MATERIAL | 18 | B | 3xWool(30)=>2xWC; 15g/unit input; 1.20x |
| Fine Cloth | fine-cloth | MATERIAL | 59 | B | 3xFW(105)=>2xFC; 52.5g/unit; 1.12x |
| Silk Fabric | silk-fabric | MATERIAL | 75 | B | 3xSC(120)=>2xSF; 60g/unit; 1.25x |

---

## SECTION 18: TANNER PROCESSING (3 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Cured Leather | cured-leather | MATERIAL | 18 | B | 2xAP(16)=>2xCL; 8g/unit input; YAML 18g |
| Wolf Leather | wolf-leather | MATERIAL | 73 | B | 2xWP(56)=>2xWL; YAML 73g |
| Bear Leather | bear-leather | MATERIAL | 91 | B | 2xBH(70)=>2xBL; YAML 91g |

---

## SECTION 19: LEATHER SATCHEL (TANNER consumable)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Leather Satchel | leather-satchel | CONSUMABLE | 28 | A | 3xCL(54)=54g; output 1; ~0.52x; utility bag |

---

## SECTION 20: MAGICAL COMPONENTS (Monster Drops, 15 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Ember Core | ember-core | MATERIAL | 15 | B | YAML: 15g; Fire Elemental drop |
| Frost Essence | frost-essence | MATERIAL | 15 | B | YAML: 15g; Ice Wraith drop |
| Storm Feather | storm-feather | MATERIAL | 15 | B | YAML: 15g; Storm Hawk drop |
| Earth Crystal | earth-crystal | MATERIAL | 12 | B | YAML: 12g; Stone Golem drop |
| Troll Blood | troll-blood | MATERIAL | 15 | B | YAML: 15g; Troll drop |
| Fey Tear | fey-tear | MATERIAL | 35 | B | YAML: 35g; Corrupted Dryad drop |
| Heartwood Sap | heartwood-sap | MATERIAL | 10 | B | YAML: 10g; Treant drop |
| Basilisk Scale | basilisk-scale | MATERIAL | 25 | B | YAML: 25g; Basilisk drop |
| Wyvern Scale | wyvern-scale | MATERIAL | 45 | B | YAML: 45g; Wyvern drop |
| Ogre Sinew | ogre-sinew | MATERIAL | 12 | B | YAML: 12g; Ogre drop |
| Wind Mote | wind-mote | MATERIAL | 12 | B | YAML: 12g; Storm Hawk drop |
| Basilisk Eye | basilisk-eye | MATERIAL | 20 | B | YAML: 20g; Basilisk drop |
| Shadow Essence | shadow-essence | MATERIAL | 30 | B | YAML: 30g; Shadow Stalker drop |
| Wisp Mote | wisp-mote | MATERIAL | 8 | B | YAML: 8g; Will-o'-Wisp drop |
| Spectral Dust | spectral-dust | MATERIAL | 10 | B | YAML: 10g; Grave Wight drop |
| Living Bark | living-bark | MATERIAL | 8 | B | YAML: 8g; Treant drop |
| Dryad Blossom | dryad-blossom | MATERIAL | 15 | B | YAML: 15g; Corrupted Dryad drop |
| Spider Venom | spider-venom | MATERIAL | 12 | B | YAML: 12g; Giant Spider drop |

---

## SECTION 21: RAW RESOURCES & FOOD (25 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Apples | apples | FOOD | 3 | B | YAML: 3g; orchard |
| Wild Herbs | wild-herbs | FOOD | 5 | B | YAML: 5g |
| Raw Fish | raw-fish | FOOD | 4 | B | YAML: 4g |
| Wood Logs | wood-logs | MATERIAL | 5 | B | YAML: 5g |
| Iron Ore | iron-ore | MATERIAL | 6 | B | YAML: 6g |
| Stone Blocks | stone-blocks | MATERIAL | 7 | B | YAML: 7g |
| Clay | clay | MATERIAL | 4 | B | YAML: 4g |
| Coal | coal | MATERIAL | 12 | B | YAML: 12g |
| Silver Ore | silver-ore | MATERIAL | 30 | B | YAML: 30g |
| Hardwood | hardwood | MATERIAL | 25 | B | YAML: 25g |
| Copper Ore | copper-ore | MATERIAL | 4 | B | YAML: 4g |
| Iron Ore Chunks | iron-ore-chunks | MATERIAL | 4 | B | YAML: 4g |
| Grain | grain | FOOD | 3 | B | YAML: 3g |
| Vegetables | vegetables | FOOD | 3 | B | YAML: 3g |
| Wild Berries | wild-berries | FOOD | 3 | B | YAML: 3g |
| Eggs | eggs | FOOD | 5 | B | YAML: 5g |
| Milk | milk | FOOD | 6 | B | YAML: 6g |
| Wool | wool | MATERIAL | 10 | B | YAML: 10g |
| Cotton | cotton | MATERIAL | 4 | B | YAML: 4g |
| Wild Game Meat | wild-game-meat | FOOD | 5 | B | YAML: 5g |
| Animal Pelts | animal-pelts | MATERIAL | 8 | B | YAML: 8g |
| Wolf Pelts | wolf-pelts | MATERIAL | 28 | B | YAML: 28g |
| Bear Hides | bear-hides | MATERIAL | 35 | B | YAML: 35g |
| Medicinal Herbs | medicinal-herbs | MATERIAL | 28 | B | YAML: 28g |
| Glowcap Mushrooms | glowcap-mushrooms | MATERIAL | 32 | B | YAML: 32g |
| River Trout | river-trout | FOOD | 22 | B | YAML: 22g |
| Lake Perch | lake-perch | FOOD | 25 | B | YAML: 25g |
| Wheat | wheat | FOOD | 3 | C | Parallel to Grain |
| Salt | salt | MATERIAL | 2 | C | Common seasoning |
| Spices | spices | MATERIAL | 8 | C | Imported seasoning |
| Hops | hops | MATERIAL | 5 | B | YAML: 5g |
| Grapes | grapes | MATERIAL | 4 | B | YAML: 4g |
| Softwood | softwood | MATERIAL | 3 | B | YAML: 3g |
| Exotic Wood | exotic-wood | MATERIAL | 50 | B | YAML: 50g |
| Fine Wool | fine-wool | MATERIAL | 35 | C | Rancher Craftsman; premium wool |
| Silkworm Cocoons | silkworm-cocoons | MATERIAL | 40 | C | Rancher Craftsman; silk source |
| Arcane Reagents | arcane-reagents | MATERIAL | 35 | B | YAML: 35g |
| Gemstones | gemstones | MATERIAL | 25 | B | YAML: 25g |
| Flowers | flowers | MATERIAL | 3 | C | Decorative; cheap |
| Marble | marble | MATERIAL | 15 | B | YAML: 15g |
| Silite Sand | silite-sand | MATERIAL | 5 | B | YAML: 5g |
| Gold Ore | gold-ore | MATERIAL | 40 | B | YAML: 40g |
| Mithril Ore | mithril-ore | MATERIAL | 80 | B | YAML: 80g |
| Adamantine Ore | adamantine-ore | MATERIAL | 150 | B | YAML: 150g |
| Raw Stone | raw-stone | MATERIAL | 5 | C | Basic quarry material |
| Rare Herbs | rare-herbs | MATERIAL | 15 | C | Rare herbalism product |

---

## SECTION 22: LIVESTOCK PRODUCTS (6 items)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Beef | beef | FOOD | 10 | C | Rancher cattle_ranch product; premium meat |
| Pork | pork | FOOD | 10 | C | Rancher pig_pen product; premium meat |
| Chicken | chicken | FOOD | 7 | C | Rancher chicken_coop (secondary product); cheaper meat |

---

## SECTION 23: STARTER & CRUDE ITEMS (misc, 5 items)

Items with POOR quality or starter-level pricing:

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Cloth Padding | cloth-padding | MATERIAL | 5 | D | Removed from recipes; legacy material |
| Cloth Boots | cloth-boots | ARMOR | 15 | D | Starter cloth foot protection |
| Cloth Gloves | cloth-gloves | ARMOR | 12 | D | Starter cloth hand protection |
| Cloth Robes | cloth-robes | ARMOR | 20 | D | Starter cloth chest; generic |
| Soft Leather | soft-leather | MATERIAL | 14 | C | Basic tanned leather; weapon grip material |

---

## SECTION 24: TIERED LEATHER ARMOR (Progression Sets, 20 items)

These are the full armor set items referenced in item-names.ts but NOT part of TANNER/LEATHERWORKER recipe output. They represent progression gear available from vendors/drops at the specified tiers.

### Hard Leather Set (L15, T2)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Hard Leather | hard-leather | MATERIAL | 24 | C | Processed hide; between Cured(18) and Wolf(73) |
| Hard Leather Cap | hard-leather-cap | ARMOR | 40 | C | L15 head; 1.67x material |
| Hard Leather Vest | hard-leather-vest | ARMOR | 60 | C | L15 chest; heavier piece |
| Hard Leather Gloves | hard-leather-gloves | ARMOR | 35 | C | L15 hands |
| Hard Leather Bracers | hard-leather-bracers | ARMOR | 38 | C | L15 off-hand |
| Hard Leather Boots | hard-leather-boots | ARMOR | 42 | C | L15 feet |

### Studded Leather Set (L30, T3)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Studded Leather Cap | studded-leather-cap | ARMOR | 85 | C | L30 head; soft+hard leather composite |
| Studded Leather Vest | studded-leather-vest | ARMOR | 140 | C | L30 chest; best mid-leather |
| Studded Leather Gloves | studded-leather-gloves | ARMOR | 75 | C | L30 hands |
| Studded Leather Bracers | studded-leather-bracers | ARMOR | 80 | C | L30 off-hand |
| Studded Leather Boots | studded-leather-boots | ARMOR | 90 | C | L30 feet |

### Exotic Leather Set (L50, T4)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Exotic Leather Cap | exotic-leather-cap | ARMOR | 220 | C | L50 head; exotic hide base |
| Exotic Leather Vest | exotic-leather-vest | ARMOR | 380 | C | L50 chest; premium |
| Exotic Leather Gloves | exotic-leather-gloves | ARMOR | 200 | C | L50 hands |
| Exotic Leather Bracers | exotic-leather-bracers | ARMOR | 210 | C | L50 off-hand |
| Exotic Leather Boots | exotic-leather-boots | ARMOR | 240 | C | L50 feet |

### Dragonscale Leather Set (L80, T5)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Dragonscale Leather | dragonscale-leather | MATERIAL | 300 | C | Endgame leather; dragon-sourced |
| Dragonscale Helm | dragonscale-helm | ARMOR | 1800 | C | L80 head; endgame leather |
| Dragonscale Vest | dragonscale-vest | ARMOR | 3500 | C | L80 chest; flagship leather |
| Dragonscale Gloves | dragonscale-gloves | ARMOR | 1500 | C | L80 hands |
| Dragonscale Bracers | dragonscale-bracers | ARMOR | 1600 | C | L80 off-hand |
| Dragonscale Boots | dragonscale-boots | ARMOR | 2000 | C | L80 feet |

---

## SECTION 25: TIERED CLOTH ARMOR (Progression Sets, 18 items)

### Linen Set (L5, T1)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Linen | linen | MATERIAL | 10 | C | Between Cloth(8) and Woven Cloth(18) |
| Linen Hood | linen-hood | ARMOR | 18 | C | L5 head; basic linen |
| Linen Robes | linen-robes | ARMOR | 30 | C | L5 chest |
| Linen Gloves | linen-gloves | ARMOR | 15 | C | L5 hands |
| Linen Boots | linen-boots | ARMOR | 16 | C | L5 feet |

### Woven Wool Set (L10, T2)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Woven Wool | woven-wool | MATERIAL | 18 | C | Same tier as Woven Cloth |
| Woven Wool Hood | woven-wool-hood | ARMOR | 30 | C | L10 head |
| Woven Wool Robes | woven-wool-robes | ARMOR | 55 | C | L10 chest |
| Woven Wool Gloves | woven-wool-gloves | ARMOR | 25 | C | L10 hands |
| Woven Wool Boots | woven-wool-boots | ARMOR | 28 | C | L10 feet |
| Woven Wool Cloak | woven-wool-cloak | ARMOR | 45 | C | L10 back |

### Silk Set (L40, T3)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Silk Hood | silk-hood | ARMOR | 110 | C | L40 head; silk base |
| Silk Robes | silk-robes | ARMOR | 200 | C | L40 chest |
| Silk Gloves | silk-gloves | ARMOR | 90 | C | L40 hands |
| Silk Boots | silk-boots | ARMOR | 95 | C | L40 feet |
| Silk Cloak | silk-cloak | ARMOR | 160 | C | L40 back |

### Enchanted Silk Set (L70, T5)

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Enchanted Silk Hood | enchanted-silk-hood | ARMOR | 800 | C | L70 head; endgame cloth |
| Enchanted Silk Robes | enchanted-silk-robes | ARMOR | 1500 | C | L70 chest; flagship cloth |
| Enchanted Silk Gloves | enchanted-silk-gloves | ARMOR | 650 | C | L70 hands |
| Enchanted Silk Boots | enchanted-silk-boots | ARMOR | 700 | C | L70 feet |
| Enchanted Silk Cloak | enchanted-silk-cloak | ARMOR | 1200 | C | L70 back |

---

## SECTION 26: MISCELLANEOUS ITEMS (remaining)

### Exotic Materials & Rare Drops

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Exotic Hide | exotic-hide | MATERIAL | 55 | C | Raw hide for Exotic Leather |
| Exotic Leather | exotic-leather | MATERIAL | 120 | C | Processed from Exotic Hide |
| Dragon Hide | dragon-hide | MATERIAL | 150 | C | Raw dragonscale source |
| Silk Thread | silk-thread | MATERIAL | 20 | C | Intermediate silk processing |
| Silk Cloth | silk-cloth | MATERIAL | 30 | C | Intermediate between Silk Fabric tiers |
| Fur Leather | fur-leather | MATERIAL | 30 | C | Northern fur pelts processed |
| Raw Leather | raw-leather | MATERIAL | 6 | C | Unprocessed hide; pre-curing |
| Pelts | pelts | MATERIAL | 8 | C | Generic pelt; same as Animal Pelts |
| Bark | bark | MATERIAL | 3 | C | Tree bark; cheap material |
| Flax | flax | MATERIAL | 4 | C | Textile plant fiber |
| Corn | corn | FOOD | 3 | C | Grain equivalent |
| Mushrooms | mushrooms | FOOD | 5 | C | Edible fungi; parallel to Wild Herbs |
| Common Fish | common-fish | FOOD | 4 | C | Same as Raw Fish |
| Common Herbs | common-herbs | MATERIAL | 5 | C | Same as Wild Herbs |
| Bear Claw | bear-claw | MATERIAL | 6 | C | Bear trophy/component |
| Sandstone | sandstone | MATERIAL | 7 | C | Raw stone variant |

### Potions & Consumables Not in Recipes

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Potion of Strength | potion-of-strength | CONSUMABLE | 55 | C | Parallel to Elixir of Strength |
| Potion of Dexterity | potion-of-dexterity | CONSUMABLE | 55 | C | Parallel to Elixir stat potions |
| Potion of Constitution | potion-of-constitution | CONSUMABLE | 55 | C | Parallel to Elixir stat potions |
| Potion of Intelligence | potion-of-intelligence | CONSUMABLE | 55 | C | Parallel to Elixir stat potions |
| Potion of Wisdom | potion-of-wisdom | CONSUMABLE | 55 | C | Parallel to Elixir of Wisdom |
| Potion of Charisma | potion-of-charisma | CONSUMABLE | 55 | C | Parallel to Elixir stat potions |
| Supreme Healing Potion | supreme-healing-potion | CONSUMABLE | 200 | C | T4 healing; above Greater(85g) |
| Cure Disease | cure-disease | CONSUMABLE | 30 | C | Mid-tier cure; above Antidote(14g) |
| Cure Poison | cure-poison | CONSUMABLE | 14 | C | Same tier as Antidote |
| Herb Poultice | herb-poultice | CONSUMABLE | 12 | C | Basic herbal remedy |
| Herbal Remedy | herbal-remedy | CONSUMABLE | 15 | C | Parallel to Berry Salve |
| Weak Poison | weak-poison | CONSUMABLE | 20 | C | Basic combat poison |
| Poison | poison | CONSUMABLE | 40 | C | Standard combat poison |
| Deadly Poison | deadly-poison | CONSUMABLE | 80 | C | Premium combat poison |
| Fire Bomb | fire-bomb | CONSUMABLE | 45 | C | Throwable AoE; alchemist tier |
| Flash Bomb | flash-bomb | CONSUMABLE | 35 | C | Blind effect throwable |
| Smoke Bomb | smoke-bomb | CONSUMABLE | 30 | C | Obscure/escape throwable |
| Elven Wine | elven-wine | CONSUMABLE | 200 | C | L50 BREWER premium; rare vintage |
| Berry Wine | berry-wine | CONSUMABLE | 12 | C | Simple berry ferment; T1 brewer |
| Wine | wine | CONSUMABLE | 15 | C | Generic grape wine; same as Grape Wine |
| Mead | mead | CONSUMABLE | 12 | C | Honey-based; parallel to Strong Ale |
| Spirits | spirits | CONSUMABLE | 20 | C | Distilled beverage; above ale tier |
| Bolts | bolts | CONSUMABLE | 2 | C | Crossbow ammo; same as Arrows |
| Throwing Knives | throwing-knives | CONSUMABLE | 5 | C | Cheap thrown weapon; iron-based |
| Basic Rations | basic-rations | CONSUMABLE | 3 | D | Near-worthless starter food |

### Weapons Not in Blacksmith Weapon Recipes

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Crossbow | crossbow | WEAPON | 90 | C | Mid-tier ranged; between Longbow(85) and War Bow(180) |
| Elven Longbow | elven-longbow | WEAPON | 280 | C | Exotic ranged; near Ranger's Longbow(260) |

### Housing & Workshop Items

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Alchemy Table | alchemy-table | HOUSING | 150 | C | Workshop station; premium |
| Armor Stand | armor-stand | HOUSING | 45 | C | Display furniture |
| Weapon Rack | weapon-rack | HOUSING | 50 | C | Display furniture |
| Bookshelf | bookshelf | HOUSING | 85 | C | Between Table(78) and Chest(117) |
| Bed | bed | HOUSING | 120 | C | Finished bed; Bed Frame(110) + materials |
| Chairs | chairs | HOUSING | 19 | C | Same as Wooden Chair |
| Table | table | HOUSING | 78 | C | Same as Wooden Table |

### Mount & Stable Items

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Saddle | saddle | TOOL | 150 | C | Basic mount equipment |
| War Saddle | war-saddle | TOOL | 350 | C | Combat mount; premium |
| Saddlebags | saddlebags | TOOL | 80 | C | Mount carry capacity |
| Horseshoes | horseshoes | TOOL | 25 | C | Basic mount speed boost |
| Mithril Horseshoes | mithril-horseshoes | TOOL | 450 | C | Premium mount speed; mithril-based |
| Horse Armor | horse-armor | ARMOR | 500 | C | Mount protection; endgame |

### Special/Rare Items

| Name | ID | Type | Price | Method | Notes |
|------|-----|------|-------|--------|-------|
| Refined Soul Essence | refined-soul-essence | MATERIAL | 100 | C | Rare magical crafting component |
| Soul Essence | soul-essence | MATERIAL | 50 | C | Base magical component |

---

## SUMMARY

| Category | Count | Price Range |
|----------|-------|------------|
| Weapons (Blacksmith forged) | 39 | 20-2500g |
| Armorer Armor (plate/mail) | 25 | 45-12000g |
| Tanner Armor (leather) | 12 | 28-340g |
| Tailor Armor (cloth) | 13 | 25-350g |
| Leatherworker (accessories) | 13 | 35-480g |
| Blacksmith Crafted (tools/mixed) | 28 | 17-130g |
| Woodworker (processing + goods) | 25 | 3-230g |
| Alchemist Consumables | 11 | 14-100g |
| Cook Consumables | 24 | 3-120g |
| Brewer Consumables | 9 | 6-18g |
| Smelter Processing | 12 | 1-2350g |
| Mason Processing & Housing | 10 | 19-365g |
| Enchanter Scrolls | 13 | 110-350g |
| Scribe Scrolls & Maps | 11 | 15-130g |
| Jeweler Accessories | 12 | 55-2500g |
| Fletcher (bows/arrows) | 13 | 2-260g |
| Tailor Processing | 4 | 8-75g |
| Tanner Processing | 3 | 18-91g |
| Leather Satchel | 1 | 28g |
| Magical Components | 18 | 8-45g |
| Raw Resources & Food | 45 | 2-150g |
| Livestock Products | 3 | 7-10g |
| Starter/Crude Items | 5 | 5-20g |
| Progression Leather Sets | 20 | 24-3500g |
| Progression Cloth Sets | 18 | 10-1500g |
| Miscellaneous | 47 | 2-500g |
| **TOTAL** | **~258** | **1-12000g** |

---

## CROSS-REFERENCE NOTES

1. **Duplicate item names**: Some items appear in multiple recipe sources (e.g., "Iron Sword" in both weapons.ts and blacksmith.ts). These are different recipe paths to the same output item -- the base_value is the SAME regardless of recipe used.

2. **Output quantity**: For recipes that produce multiple units (e.g., "2x Ale"), the base_value is PER UNIT, not per craft.

3. **YAML-confirmed items**: Items marked "Method B" with "YAML:" notes already have base_values confirmed in `profession-economy-master.yaml`. These are included for completeness and to verify no conflicts.

4. **Method C items**: Progression armor sets (Hard Leather, Studded, Exotic, Dragonscale, Linen, Woven Wool, Silk, Enchanted Silk) are priced by tier-parallel comparison since they have no explicit recipes in the codebase. They represent vendor/drop gear at those levels.

5. **Weapon price compression**: BLACKSMITH weapon recipes (weapons.ts) use pre-processed ingots as inputs, making the raw material cost very high. Base values are intentionally compressed below strict multiplier math to maintain game balance -- a Steel Sword at 200g is affordable for L30 players, even though 3x Steel Ingot alone costs 630g. This reflects the principle that base_value represents a "fair NPC price" not full material replacement cost.
