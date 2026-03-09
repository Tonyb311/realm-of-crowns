# Item Weight & Carry Capacity System -- Design Document

## 1. Current State Summary

### 1.1 Item Counts by Category

| Category | Count | Sources |
|----------|-------|---------|
| **Weapons (Melee)** | 38 | `recipes/weapons.ts` -- Blacksmith, 5 tiers (Copper/Iron/Steel/Mithril/Adamantine) |
| **Weapons (Caster)** | 28 | `recipes/caster-weapons.ts` -- Staves, wands, orbs, holy symbols, instruments |
| **Weapons (Ranged)** | 16 | `recipes/ranged-weapons.ts` -- Bows, arrows, throwing knives |
| **Weapons (Elite)** | 18 | `recipes/elite-gear.ts` -- Boss-drop weapons |
| **Weapons (Starter)** | 7 | `data/starter-weapons.ts` -- 1 per class |
| **Armor (Plate/Metal)** | 30 | `recipes/armor.ts` -- ARMORER, 5 tiers |
| **Armor (Leather)** | 37 | `recipes/armor.ts` -- LEATHERWORKER |
| **Armor (Cloth)** | 49 | `recipes/armor.ts` -- TAILOR |
| **Armor (Cured Leather)** | 14 | `recipes/armor.ts` -- TANNER |
| **Armor (Elite)** | 11 | `recipes/elite-gear.ts` |
| **Accessories** | 16 | `recipes/accessories.ts` (12) + `elite-gear.ts` (4) |
| **Consumables** | 56 | `recipes/consumables.ts` -- Potions, food, scrolls, kits |
| **Tools** | 36 | `data/tools/index.ts` -- 6 types x 6 tiers |
| **Processing Outputs** | 66 | smelter (10) + tanner (5) + tailor (5) + woodworker (25) + mason (12) + cook (9) |
| **Raw Resources** | 32 | `data/gathering.ts` -- Ore, herbs, wood, fish, etc. |
| **Total in Registry** | **556** | `data/items/item-names.ts` |

### 1.2 Character Stat Ranges

From `utils/bounded-accuracy.ts`:

| Stat Context | STR Value | Modifier |
|-------------|-----------|----------|
| Minimum possible | 8 | -1 |
| Starting base (no investment) | 10 | +0 |
| Typical L1 Warrior | 14 | +2 |
| Typical L1 Mage | 8-10 | -1 to +0 |
| Typical L1 Ranger/Rogue | 10-12 | +0 to +1 |
| Mid-game Warrior (L20-30) | 16-18 | +3 to +4 |
| End-game Warrior (L40+) | 18-20 | +4 to +5 |
| Hard cap | 20 | +5 |

**Modifier formula:** `floor((stat - 10) / 2)`

**Stat allocation:** Characters get ~50 stat points over 50 levels. Cost escalates: 11-14 cost 1pt each, 15-17 cost 2pt each, 18-19 cost 3pt each, 20 costs 4pt. Racial mods apply on top.

### 1.3 Current Inventory Model

**No capacity limits exist.** The inventory system is purely slot-based:

- `inventories` table: `characterId + itemId + quantity` (unique per character+item pair)
- No max slots, no weight column, no capacity field
- Stackable items increment `quantity` on the same row
- `itemTemplates` table: no `weight` column
- `items` table: no `weight` column
- House storage: slot-based (`storageSlots` default 20), no weight tracking

**Critical gap:** A player can currently carry unlimited items with no consequences.

---

## 2. Weight Values

All weights in **pounds (lbs)**. Designed around real-world analogues scaled for gameplay.

### 2.1 Melee Weapons (Blacksmith)

Material affects weight for metal weapons. Mithril is fantasy-light; adamantine is fantasy-dense.

**Material multiplier:**
- T1 Copper: x0.8
- T2 Iron: x1.0 (baseline)
- T3 Steel: x1.0
- T4 Mithril: x0.6
- T5 Adamantine: x1.3

| Weapon Type | Base (lbs) | T1 | T2 | T3 | T4 | T5 |
|-------------|-----------|-----|-----|-----|-----|-----|
| Dagger | 1 | 0.8 | 1 | 1 | 0.6 | 1.3 |
| Sword | 3 | 2.4 | 3 | 3 | 1.8 | 3.9 |
| Longsword | 4 | -- | 4 | 4 | 2.4 | 5.2 |
| Axe | 3 | 2.4 | 3 | 3 | -- | -- |
| Spear | 3 | 2.4 | 3 | 3 | -- | -- |
| Mace | 4 | 3.2 | 4 | 4 | -- | -- |
| Rapier | 2 | -- | -- | -- | 1.2 | 2.6 |
| Greatsword (2H) | 6 | -- | -- | 6 | 3.6 | 7.8 |
| Battleaxe (2H) | 5 | -- | 5 | 5 | 3 | 6.5 |
| Warhammer (2H) | 8 | -- | 8 | 8 | 4.8 | 10.4 |
| Halberd (2H) | 6 | -- | -- | 6 | 3.6 | 7.8 |

**Rounding rule:** Display to 1 decimal place. Round to nearest 0.1 in storage.

### 2.2 Caster Weapons

Caster weapons are lighter (wood, crystal, cloth) and NOT affected by material multiplier.

| Weapon Type | Weight (lbs) | Notes |
|-------------|-------------|-------|
| Staff (2H) | 4 | Wood + crystal |
| Wand (1H) | 0.5 | Small, light |
| Orb (1H) | 2 | Crystal sphere |
| Holy Symbol (1H) | 1 | Metal pendant/disc |
| Blessed Mace (1H) | 4 | Metal -- follows melee multiplier |
| Instrument - Lute (2H) | 3 | Wood + strings |
| Instrument - Drum (1H) | 2 | Leather + wood |

### 2.3 Ranged Weapons

| Weapon Type | Weight (lbs) | Notes |
|-------------|-------------|-------|
| Shortbow (2H) | 2 | Light wood |
| Hunting Bow (2H) | 2.5 | Reinforced |
| Longbow (2H) | 3 | Full-size |
| War Bow (2H) | 3.5 | Heavy draw |
| Composite Bow (2H) | 3 | Laminated, compact |
| Arrows (per unit) | 0.05 | 20 arrows = 1 lb |
| Bowstring | 0.1 | Negligible |
| Quiver (accessory) | 1 | Empty |
| Throwing Knives (per unit) | 0.5 | Stackable |

**Mithril/Adamantine ranged:** Apply material multiplier to bow base weight only for T4-T5 bows.

### 2.4 Armor -- Plate (ARMORER)

Full plate is the heaviest equipment in the game. Material multiplier applies.

| Slot | Base (lbs) | T1 | T2 | T3 | T4 | T5 |
|------|-----------|-----|-----|-----|-----|-----|
| Helm (HEAD) | 5 | 4 | 5 | 5 | 3 | 6.5 |
| Chestplate (CHEST) | 20 | 16 | 20 | 20 | 12 | 26 |
| Gauntlets (HANDS) | 3 | 2.4 | 3 | 3 | 1.8 | 3.9 |
| Greaves (LEGS) | 8 | 6.4 | 8 | 8 | 4.8 | 10.4 |
| Boots (FEET) | 4 | 3.2 | 4 | 4 | 2.4 | 5.2 |
| Shield (OFF_HAND) | 6 | 4.8 | 6 | 6 | 3.6 | 7.8 |

**Full plate set (no shield):** T2 = 40 lbs, T3 = 40 lbs, T4 = 24 lbs, T5 = 52 lbs

### 2.5 Armor -- Leather (TANNER + LEATHERWORKER)

Leather armor is lighter. Material tier is hide type, not metal.

| Slot | T1-2 Leather | T3 Wolf/Bear | T4 Exotic | T5 Dragonscale |
|------|-------------|-------------|-----------|----------------|
| Cap/Helm (HEAD) | 1 | 1.5 | 2 | 2.5 |
| Vest/Cuirass (CHEST) | 5 | 7 | 8 | 10 |
| Gloves/Vambraces (HANDS) | 0.5 | 1 | 1 | 1.5 |
| Leggings (LEGS) | 3 | 4 | 4.5 | 5 |
| Boots (FEET) | 2 | 2.5 | 3 | 3.5 |
| Bracers (OFF_HAND) | 1 | 1.5 | 2 | 2 |

**Full leather set:** T1-2 = ~12 lbs, T4 Exotic = ~19 lbs, T5 Dragonscale = ~23 lbs

### 2.6 Armor -- Cloth (TAILOR)

Cloth is the lightest armor category.

| Slot | T1-2 Cloth/Linen | T3 Woven Wool | T4 Silk | T5 Enchanted Silk |
|------|-----------------|---------------|---------|-------------------|
| Hood (HEAD) | 0.5 | 0.5 | 0.5 | 0.5 |
| Robes (CHEST) | 3 | 3.5 | 3 | 3 |
| Gloves (HANDS) | 0.2 | 0.3 | 0.2 | 0.2 |
| Boots (FEET) | 1 | 1.5 | 1 | 1 |
| Cloak (BACK) | 2 | 2.5 | 2 | 2 |
| Sash (OFF_HAND) | 0.3 | 0.5 | 0.3 | 0.3 |
| Trousers (LEGS) | 1.5 | 2 | 1.5 | 1.5 |

**Full cloth set:** ~8-10 lbs regardless of tier (cloth doesn't get heavier when it gets better)

### 2.7 Accessories

| Item Type | Weight (lbs) | Notes |
|-----------|-------------|-------|
| Ring (any tier) | 0.1 | Negligible |
| Necklace/Amulet | 0.3 | Chain + pendant |
| Brooch | 0.2 | Pin + gem |
| Circlet/Crown | 1 | Metal band |
| Backpack (BACK) | 2 | Empty -- provides carry bonus (see Section 4) |
| Toolbelt | 1 | Utility |

### 2.8 Consumables

| Item Type | Weight per Unit (lbs) | Stack Size | Max Stack Weight |
|-----------|----------------------|------------|-----------------|
| Minor Healing Potion | 0.5 | 10 | 5 |
| Healing Potion | 0.5 | 10 | 5 |
| Greater Healing Potion | 0.5 | 10 | 5 |
| Elixirs (all) | 0.5 | 10 | 5 |
| Antidote/Tonic | 0.5 | 10 | 5 |
| Bread/Rations | 0.5 | 20 | 10 |
| Roast Meat/Fish | 1 | 10 | 10 |
| Cooked Meals (soups, stews) | 1.5 | 10 | 15 |
| Feast (Hearty Feast, Royal Banquet) | 3 | 5 | 15 |
| Ale/Cider/Cordial | 1 | 10 | 10 |
| Strong Ale/Wine | 1 | 10 | 10 |
| Scrolls (all) | 0.1 | 10 | 1 |
| Maintenance Kit | 2 | 20 | 40 |
| Area Map / Dungeon Map | 0.1 | 10 | 1 |
| Leather Satchel | 0.5 | 1 | 0.5 |

### 2.9 Materials & Resources

#### Raw Gathering Resources

| Resource | Weight per Unit (lbs) | Category |
|----------|----------------------|----------|
| Iron Ore Chunks | 3 | Heavy mineral |
| Silver Ore | 3 | Heavy mineral |
| Coal | 2 | Mineral |
| Stone Blocks | 5 | Very heavy |
| Clay | 3 | Heavy |
| Wood Logs | 4 | Heavy |
| Softwood | 2 | Light wood |
| Hardwood | 3 | Dense wood |
| Animal Pelts | 1 | Light |
| Wolf Pelts | 1.5 | Medium |
| Bear Hides | 2 | Heavy hide |
| Raw Fish / River Trout / Lake Perch | 1 | Perishable |
| Wild Game Meat | 2 | Heavy |
| Grain / Vegetables | 0.5 | Light |
| Apples / Wild Berries | 0.3 | Light |
| Wild Herbs / Medicinal Herbs | 0.1 | Very light |
| Glowcap Mushrooms | 0.1 | Very light |
| Hops / Grapes | 0.5 | Light produce |
| Cotton | 0.3 | Light fiber |
| Eggs | 0.3 | Fragile |
| Milk | 1 | Liquid |
| Wool / Fine Wool | 0.5 | Fiber |
| Silkworm Cocoons | 0.1 | Very light |

#### Processed Materials

| Material | Weight per Unit (lbs) | Notes |
|----------|----------------------|-------|
| Iron Ingot | 1 | Smelted, compact |
| Steel Ingot | 1 | Alloyed |
| Silver Ingot | 1 | Precious metal |
| Gold Ingot | 1.5 | Dense |
| Mithril Ingot | 0.5 | Fantasy light |
| Adamantine Ingot | 2 | Fantasy dense |
| Glass | 0.5 | Fragile |
| Nails | 0.3 | Small hardware |
| Iron Fittings | 1 | Hardware |
| Leather | 0.5 | Processed hide |
| Wolf Leather | 0.5 | Processed hide |
| Bear Leather | 0.5 | Processed hide |
| Exotic Leather | 0.5 | Processed hide |
| Dragonscale Leather | 1 | Dense scales |
| Cloth | 0.2 | Woven fabric |
| Woven Cloth | 0.2 | Better fabric |
| Fine Cloth | 0.2 | Luxury fabric |
| Silk Fabric | 0.1 | Very light |
| Softwood Planks | 1.5 | Processed lumber |
| Hardwood Planks | 2 | Dense lumber |
| Exotic Planks | 2 | Premium wood |
| Beams | 4 | Structural |
| Cut Stone / Cut Sandstone | 4 | Masonry |
| Bricks | 3 | Building material |
| Stone Slab | 6 | Very heavy |
| Polished Marble | 8 | Very heavy |
| Flour | 1 | Cooking staple |
| Arcane Reagents | 0.1 | Magical dust |
| Gemstones | 0.1 | Tiny, precious |
| Boss Drop Materials | 0.5 | Dragon Scale, Demon Heart, etc. |

### 2.10 Tools

| Tool Type | Weight (lbs) | Notes |
|-----------|-------------|-------|
| Pickaxe (MINER) | 4 | Heavy metal head |
| Axe (LUMBERJACK) | 3 | Wood + metal |
| Hoe (FARMER) | 3 | Long handle |
| Fishing Rod (FISHERMAN) | 2 | Light, flexible |
| Sickle (HERBALIST) | 1.5 | Small curved blade |
| Skinning Knife (HUNTER) | 1 | Small blade |

**Tier multiplier for tools:** Same as melee weapons (Crude x0.8 through Adamantine x1.3). The material affects the head weight.

### 2.11 Elite / Boss-Drop Gear

Elite gear follows the same weight rules as its base category:
- Elite weapons: use the corresponding weapon type weight at T5 multiplier (these are late-game)
- Elite armor: use the corresponding armor category weight at the highest tier for that category
- Elite accessories: use standard accessory weights

### 2.12 Gold

**Recommendation: Gold is WEIGHTLESS.**

Rationale:
- D&D's 50 coins = 1 lb makes sense in tabletop where you carry hundreds. In an MMO where you accumulate thousands, it's tedious.
- Every MMORPG makes gold weightless. Players expect it.
- Weighted gold punishes economic players (merchants, crafters) who hold gold for trading -- the opposite of what we want to encourage.
- The weight system has enough bite from items and materials. Gold weight would be annoying without adding meaningful decisions.
- If gold weight is desired later, it's easy to add retroactively.

---

## 3. Carry Capacity

### 3.1 Formula

```
carryCapacity = STR * 10 (lbs)
```

**Why STR x 10 instead of D&D's STR x 15:**
- Our stat range tops out at 20, giving 200 lbs max base capacity. STR x 15 would give 300 lbs, which is too generous -- a player would rarely feel the system.
- STR x 10 creates meaningful decisions at every STR level:
  - A STR 8 mage (80 lbs) has to choose: carry materials or carry potions? Light armor is a must.
  - A STR 14 warrior (140 lbs) can wear full iron plate (40 lbs) + sword (3 lbs) + shield (6 lbs) + consumables (10 lbs) + materials (30 lbs) = 89 lbs. Comfortable, but can't hoard unlimited ore.
  - A STR 20 warrior (200 lbs) can haul serious weight but still feels limits when trading in bulk.

### 3.2 Encumbrance — Sliding Penalty Scale (No Hard Blocks)

**Design philosophy:** Never hard-block a player from acting. Instead, progressively punish overloading so players *choose* to manage weight rather than being forced to. A player CAN travel at 200% capacity — it'll just take 4× as long and they'll be miserable in combat.

| Load Range | Status | Travel Penalty | Combat Penalty | Other Penalties |
|-----------|--------|---------------|----------------|-----------------|
| 0-60% | **Normal** | None | None | None |
| 60-80% | **Burdened** | +50% travel time (+1 tick per 2 base ticks) | -1 to all attack rolls | Gathering yields -25% |
| 80-100% | **Encumbered** | +100% travel time (double) | -2 attack, -1 AC | Gathering yields -50% |
| 100-130% | **Heavily Encumbered** | +200% travel time (triple) | -3 attack, -2 AC, -1 save DCs | Cannot initiate PvP, gathering yields -75% |
| 130-160% | **Severely Overloaded** | +300% travel time (quadruple) | -5 attack, -3 AC, -2 save DCs | Cannot gather, crafting time +100% |
| 160%+ | **Crushed** | +500% travel time (6× normal) | -7 attack, -5 AC, -3 save DCs, half damage dealt | Cannot gather, cannot craft |

**Key design points:**
- **No hard blocks on travel.** A 1-tick journey becomes 2, 3, 4, or 6 ticks depending on load. Players always *can* move — it just hurts.
- **Combat penalties scale with overload.** Attack/AC/save penalties make fighting while overloaded dangerous but not impossible. Players might accept penalties for a short trip to the market.
- **Gathering degrades then stops.** Gathering is the primary source of more weight, so it throttles first (-25%, -50%, -75%) then cuts off at 130%.
- **Combat loot and quest rewards always delivered** regardless of load — the penalties kick in afterward.
- **Drop items (with 5-min recovery window)** is the escape valve for players who want to shed weight immediately on the road.

**Why 60% not 50% for first threshold:**
- 50% is too aggressive. A warrior at STR 14 (140 lbs capacity) in full iron plate (40 lbs) + weapon + shield + potions (59 lbs) would hit 42% just from basic equipment.
- 60% means equipment + basic supplies never triggers penalties. You only get Burdened when carrying significant extra cargo.

### 3.3 Example Calculations

#### Level 1 Warrior (STR 14, Capacity: 140 lbs)

| Item | Weight |
|------|--------|
| Iron Chestplate (T2) | 20 |
| Iron Helm | 5 |
| Iron Greaves | 8 |
| Iron Gauntlets | 3 |
| Iron Boots | 4 |
| Iron Shield | 6 |
| Iron Sword | 3 |
| 5x Healing Potions | 2.5 |
| 5x Rations | 2.5 |
| Iron Pickaxe (tool) | 4 |
| **Total equipped + supplies** | **58 lbs** |

**Load: 41% -- Normal.** Has 82 lbs remaining for materials and trade goods. Can carry ~27 iron ore (81 lbs) before hitting 100%.

At 60% threshold (84 lbs): 26 lbs of cargo before Burdened.
At 80% threshold (112 lbs): 54 lbs of cargo before Encumbered.

#### Level 1 Mage (STR 8, Capacity: 80 lbs)

| Item | Weight |
|------|--------|
| Cloth Robes | 3 |
| Cloth Hood | 0.5 |
| Cloth Gloves | 0.2 |
| Cloth Boots | 1 |
| Ashwood Staff | 4 |
| 5x Healing Potions | 2.5 |
| 5x Scrolls | 0.5 |
| 3x Rations | 1.5 |
| **Total** | **13.2 lbs** |

**Load: 17% -- Normal.** Has 66.8 lbs free. Mages have plenty of room for reagents (lightweight) but will feel the pinch if hauling ore or stone.

If this mage picks up 20 iron ore (60 lbs): total 73.2 lbs = 92% = **Encumbered**. They'd need to store or sell before traveling efficiently.

#### Level 30 Warrior (STR 18, Capacity: 180 lbs)

| Item | Weight |
|------|--------|
| Steel Chestplate (T3) | 20 |
| Steel Helm | 5 |
| Steel Greaves | 8 |
| Steel Gauntlets | 3 |
| Steel Boots | 4 |
| Steel Shield | 6 |
| Steel Longsword | 4 |
| 10x Greater Healing Potions | 5 |
| 10x Rations | 5 |
| Steel Pickaxe (tool) | 4 |
| Bag of Holding (+60 lbs) | 2 |
| **Total** | **66 lbs** |

**Load: 66/240 (with bag) = 28% -- Normal.** The bag of holding dramatically extends this warrior's hauling power. Effective capacity 240 lbs means they can carry 174 lbs of cargo.

#### Full Adamantine Plate Warrior (STR 20, Capacity: 200 lbs)

| Item | Weight |
|------|--------|
| Adamantine Chestplate (T5) | 26 |
| Adamantine Helm | 6.5 |
| Adamantine Greaves | 10.4 |
| Adamantine Gauntlets | 3.9 |
| Adamantine Boots | 5.2 |
| Adamantine Shield | 7.8 |
| Adamantine Longsword | 5.2 |
| **Equipment subtotal** | **65 lbs** |

**Equipment alone = 33% capacity.** Even at T5 full plate, equipment is manageable. This warrior has 135 lbs for supplies and cargo. With a Greater Bag of Holding (+100), effective capacity = 300 lbs and equipment is only 22%.

**Key insight:** Mithril armor is a game-changer for carry capacity. Full Mithril plate = 24 lbs (vs 52 lbs Adamantine). A Mithril-armored warrior trades some armor for dramatically better mobility and carry capacity. This creates a genuine equipment choice beyond raw stats.

### 3.4 Equipment Weight Rules

**Equipped gear counts against carry capacity.** You're physically wearing it -- it has weight.

This is intentional and creates the following design dynamics:
1. **Armor class choice matters beyond stats.** Cloth mages can carry more materials than plate warriors.
2. **Mithril is a lifestyle choice**, not just a stat upgrade. Its 0.6x weight multiplier makes it the "traveler's metal."
3. **Off-duty optimization.** Players might unequip heavy armor while crafting/gathering in town (no combat risk). This is emergent behavior, not a bug.

---

## 4. Capacity Expansion

### 4.1 Bags of Holding

Bags are passive inventory upgrades, not equipment slot items. A character can have **one bag active at a time**. Bags are items in inventory that provide a capacity bonus while carried.

| Bag | Capacity Bonus | Source | Level Req |
|-----|---------------|--------|-----------|
| Leather Satchel | +15 lbs | LEATHERWORKER T1 craft | 1 |
| Traveler's Pack | +30 lbs | LEATHERWORKER T2 craft | 10 |
| Bag of Holding | +60 lbs | LEATHERWORKER T3 + Arcane Reagents | 30 |
| Greater Bag of Holding | +100 lbs | LEATHERWORKER T5 + ENCHANTER enchantment | 55 |

**Implementation:** Bags are items of type `ACCESSORY` (or a new `BAG` type) with a `carryBonus` stat. The capacity calculation scans inventory for the highest-bonus bag and applies it. Only the best one counts (no stacking).

**The bag itself has weight:** 1-3 lbs. The bonus is net positive by design.

### 4.2 Carts & Pack Animals

**Carts:**
- Town-bound. A cart is tied to a player's house storage, not carried.
- Carts increase **house storage capacity** (slot-based today, could add weight later).
- NOT a travel companion. Carts don't follow players on roads.
- Rationale: Road travel is dangerous (monsters). Carts on roads would need escort mechanics, cart HP, cart loss on death -- massive scope creep. Save for a future Caravan expansion.

**Pack Animals:**
- Mounts are not yet implemented. When they are, a mount could provide +50-100 lbs carry capacity while traveling.
- Design space reserved but not specced here.

### 4.3 Racial Bonuses

| Race | Carry Modifier | Rationale |
|------|---------------|-----------|
| Orc | +20% | Strong laborers, physically imposing |
| Dwarf | +15% | Stocky, miners, dense muscle |
| Drakonid | +15% | Large, powerful frame |
| Goliath (unreleased) | +30% | Largest playable race, beast of burden |
| Harthfolk (Halfling) | -15% | Small frame |

**Formula with racial modifier:**
```
carryCapacity = STR * 10 * (1 + racialModifier)
```

Examples:
- Orc Warrior STR 14: 14 * 10 * 1.2 = **168 lbs** (vs 140 base)
- Dwarf Warrior STR 14: 14 * 10 * 1.15 = **161 lbs**
- Harthfolk Rogue STR 10: 10 * 10 * 0.85 = **85 lbs** (vs 100 base)

**No modifier (x1.0):** Human, Elf, Nethkin (Tiefling), all other races.

### 4.4 Feats & Abilities

Check existing feats in `characters.feats` jsonb array:

| Source | Effect | Notes |
|--------|--------|-------|
| **Tough feat** (existing) | No carry effect | HP-focused, leave unchanged |
| **New feat: "Pack Mule"** | +25% carry capacity | For crafters/gatherers who haul materials |
| **New feat: "Light Traveler"** | Remove first encumbrance tier (Burdened) | For scouts/travelers -- still Encumbered at 80% |
| **Warrior passive ability** | Consider a T0 ability option that gives +20% carry | Reinforces STR warrior identity |

**These are suggestions for future implementation.** Don't add them in Phase 1.

---

## 5. Enforcement Points

Every location where items enter a player's inventory needs a weight check.

| Action | Route File | Endpoint | Check Needed |
|--------|-----------|----------|-------------|
| **Equip item** | `server/src/routes/equipment.ts` | POST /equipment/equip | Swap returns item to inventory — recalculate encumbrance tier. Allow equip always (changing equipment shouldn't be blocked) |
| **Unequip item** | `server/src/routes/equipment.ts` | POST /equipment/unequip | Returns item to inventory — recalculate encumbrance tier. Always succeeds |
| **Collect crafted item** | `server/src/routes/crafting.ts` | POST /crafting/collect | Output items added to inventory. Always succeeds but return new encumbrance tier to client |
| **Buy from market** | `server/src/lib/auction-engine.ts` | `resolveAuctionCycle()` | Settlement adds items to buyer inventory. Always delivers. Return updated weight |
| **Withdraw from storage** | `server/src/routes/houses.ts` | POST /houses/:id/storage/withdraw | Always succeeds. Return new encumbrance tier so UI can warn player |
| **Collect gathered resources** | `server/src/routes/work.ts` | POST /work/collect | Always succeeds. Return new encumbrance tier |
| **Combat loot drops** | `server/src/lib/loot-items.ts` | `processItemDrops()` | Auto-add loot. No block. Return encumbrance tier |
| **Quest rewards** | `server/src/routes/quests.ts` | POST /quests/complete | Auto-grant rewards. No block. Return encumbrance tier |
| **Travel** | `server/src/routes/travel.ts` | POST /travel/start | Calculate encumbrance tier, apply travel time multiplier (1×, 1.5×, 2×, 3×, 4×, or 6×) |
| **Gathering start** | `server/src/routes/gathering.ts` | POST /gathering/gather | Apply gathering yield penalty based on encumbrance tier. Block only at 130%+ (Severely Overloaded) |

**Design principle:** No action is ever hard-blocked by weight except gathering at extreme overload (130%+). Everything else always succeeds but with escalating penalties. The player always has agency.

---

## 6. UI Touchpoints

### 6.1 Inventory Page (`client/src/pages/InventoryPage.tsx`)

- **Weight bar** below the Equipment section header, same style as house storage progress bar:
  - `Current Weight / Carry Capacity (X lbs / Y lbs)`
  - Color coding: green (0-60%), yellow (60-80%), orange (80-100%), red (100%+)
  - Encumbrance tier label next to the bar: "Normal" / "Burdened" / "Encumbered" / "Overloaded"
- **Per-item weight** in the inventory grid: small text below item name showing weight (e.g., "3 lbs" or "0.5 lbs x 20 = 10 lbs" for stacks)
- **Per-item weight** in the `ItemDetailPanel` and `EquippedDetailPanel`: new stats row showing weight

### 6.2 Equipment Panel

- **Equipment weight subtotal** below the equipment grid: "Equipment: 45 lbs"
- Individual slot weight shown in the equipped slot tooltip/card

### 6.3 Item Tooltips (Everywhere)

- Add weight to item tooltip wherever items are displayed: inventory, market, crafting, storage
- Format: "Weight: 3 lbs" or "Weight: 0.5 lbs each (x20 = 10 lbs)"

### 6.4 Market Listings

- Show item weight in listing cards so buyers can check before purchasing
- Consider a "Weight if purchased" preview on the buy confirmation dialog

### 6.5 Crafting UI

- Show output item weight in recipe details
- Warning if crafting output would exceed carry capacity: "You will be Overloaded after crafting this"

### 6.6 Character Sheet / Profile (`ProfilePage.tsx`)

- New stat row: "Carry Capacity: 140 lbs" (under character stats section)
- If viewing own profile: show current load percentage

### 6.7 Travel Page

- Encumbrance warning if Burdened or Encumbered: "You are Burdened. Travel will take X extra ticks."
- Block travel button if Overloaded with message: "You are Overloaded and cannot travel. Sell, store, or drop items first."

### 6.8 HUD / Persistent Indicator

- **Only show when relevant.** A persistent weight bar would be noise for most players.
- Show a small warning icon/badge on the inventory nav link when Burdened or worse.
- Toast notification when crossing an encumbrance threshold: "You are now Encumbered."

---

## 7. Implementation Phases

### Phase 1: Data Layer (Complexity: Medium)

**Goal:** Add weight to all item templates. No enforcement yet -- purely data.

**Files to modify:**
| File | Change |
|------|--------|
| `database/schema/tables.ts` | Add `weight` column (doublePrecision, default 0) to `itemTemplates` table |
| `database/drizzle-migrations/` | New migration for the column |
| `shared/src/data/recipes/types.ts` | Add `weight: number` to `WeaponStats`, `ArmorStats`, `ConsumableStats` |
| `shared/src/data/recipes/weapons.ts` | Add weight to all 38 weapon recipes |
| `shared/src/data/recipes/armor.ts` | Add weight to all 130 armor recipes |
| `shared/src/data/recipes/accessories.ts` | Add weight to all 12 accessory recipes |
| `shared/src/data/recipes/consumables.ts` | Add weight to all 56 consumable recipes |
| `shared/src/data/recipes/caster-weapons.ts` | Add weight to all 28 caster weapon recipes |
| `shared/src/data/recipes/ranged-weapons.ts` | Add weight to all 16 ranged weapon recipes |
| `shared/src/data/recipes/elite-gear.ts` | Add weight to all 31 elite gear recipes |
| `shared/src/data/recipes/smelter.ts` | Add weight to processing outputs |
| `shared/src/data/recipes/tanner.ts` | Add weight to processing outputs |
| `shared/src/data/recipes/tailor.ts` | Add weight to processing outputs |
| `shared/src/data/recipes/woodworker.ts` | Add weight to all outputs |
| `shared/src/data/recipes/mason.ts` | Add weight to all outputs |
| `shared/src/data/recipes/cook.ts` | Add weight to all outputs |
| `shared/src/data/gathering.ts` | Add weight to all 32 gathering resources |
| `shared/src/data/tools/index.ts` | Add weight to tool template generation |
| `shared/src/data/starter-weapons.ts` | Add weight to starter items |
| `database/seeds/*.ts` | Update seed files to write weight into itemTemplate stats JSON |

**Estimated scope:** ~20 files, mostly adding `weight: X` to existing data objects. The migration is 1 new column. Medium because of the sheer number of items.

### Phase 2: Carry Capacity + Enforcement (Complexity: High)

**Goal:** Characters have carry capacity. Key actions check weight.

**Files to modify:**
| File | Change |
|------|--------|
| `shared/src/utils/bounded-accuracy.ts` | Add `calculateCarryCapacity(str, race)` function |
| `shared/src/types/` or `shared/src/enums.ts` | Add `EncumbranceTier` type |
| `server/src/routes/equipment.ts` | Add weight check on equip (swap case) |
| `server/src/routes/crafting.ts` | Add weight check on collect |
| `server/src/routes/houses.ts` | Add weight check on withdraw |
| `server/src/routes/work.ts` | Add weight check on collect |
| `server/src/routes/travel.ts` | Add encumbrance check, modify `calculateEtaTicks()` |
| `server/src/routes/gathering.ts` | Block gathering if Overloaded |
| `server/src/lib/loot-items.ts` | No block, but flag overload |
| `server/src/routes/quests.ts` | No block, but flag overload |
| `server/src/lib/auction-engine.ts` | No block, deliver anyway |
| New: `server/src/lib/weight-calculator.ts` | Utility: `calculateInventoryWeight(characterId)` -- queries inventory + equipment and sums weights |

**Estimated scope:** ~12 files, new utility service, moderate complexity. The weight calculator needs to join `inventories` -> `items` -> `itemTemplates` and sum `weight * quantity`.

### Phase 3: UI Updates (Complexity: Medium)

**Goal:** Players can see weights and capacity in the UI.

**Files to modify:**
| File | Change |
|------|--------|
| `client/src/pages/InventoryPage.tsx` | Weight bar, per-item weights, encumbrance status |
| `client/src/components/character-sheet/` | Carry capacity stat display |
| `client/src/pages/ProfilePage.tsx` | Show carry capacity |
| `client/src/pages/TravelPage.tsx` (or travel component) | Encumbrance warning |
| `client/src/pages/CraftingPage.tsx` (or crafting component) | Output weight preview |
| `server/src/routes/characters.ts` | Include `carryCapacity` and `currentWeight` in character response |
| `server/src/routes/equipment.ts` | Include weight info in equipped response |
| API responses | Add `weight` field to item data shapes |

**Estimated scope:** ~8-10 files. Mostly rendering weight data that Phase 2 already calculates.

### Phase 4: Capacity Expansion Items (Complexity: Low-Medium)

**Goal:** Bags of Holding, racial bonuses, quality-of-life.

**Files to modify:**
| File | Change |
|------|--------|
| `shared/src/data/recipes/accessories.ts` or new `bags.ts` | Bag recipes (4 tiers) |
| `server/src/lib/weight-calculator.ts` | Account for bag carry bonus |
| `shared/src/utils/bounded-accuracy.ts` | Add racial carry modifiers |
| `shared/src/data/races/` | Add `carryModifier` to race definitions |
| `database/seeds/` | Seed bag item templates |

**Estimated scope:** ~6 files. Small feature addition on top of Phase 2 infrastructure.

### Phase 5: Travel & Encumbrance Effects (Complexity: Low)

**Goal:** Encumbrance affects travel time.

**Files to modify:**
| File | Change |
|------|--------|
| `server/src/routes/travel.ts` | Pass encumbrance tier to `calculateEtaTicks()` |
| `server/src/lib/simulation/actions.ts` | Bot travel accounts for weight (or bots auto-manage inventory) |
| `server/src/lib/simulation/engine.ts` | Bot priority chain considers weight management |

**Estimated scope:** ~3 files. Mostly wiring the encumbrance tier into the existing speed modifier system.

---

## 8. Open Questions — RESOLVED

1. **Bots and weight:** **DECIDED — Bots exempt from weight.** No weight checks in the sim engine. Bots carry unlimited items. This avoids needing bot "inventory management" AI.

2. **Drop items:** **DECIDED — Yes, with confirmation + 5-minute recovery window.** Players can "drop" (destroy) items to free weight. A confirmation dialog prevents accidents. Dropped items enter a 5-minute recovery queue (like a trash can) — the player can undo within 5 minutes. After 5 minutes, the item is permanently destroyed. This is the escape valve for players stuck Overloaded in the wilderness.

3. **Death/PvP loot:** **DECIDED — Winners auto-receive loot regardless of weight.** Same rule as PvE. Consistency over edge-case enforcement.

4. **Consumable use weight:** **Non-issue.** Weight is calculated dynamically from inventory state. Using a potion removes it from inventory, which automatically reduces weight.

5. **Storage weight vs slots:** **DECIDED — Storage stays slot-based.** No weight tracking for house storage. Keep it simple. Convert to weight-based in a future pass if desired.

6. **Furniture weight:** **DECIDED — Reduced "flat-pack" weight.** Furniture items get reduced weight (~5 lbs for a table instead of 30 lbs). Rationale: furniture is crafted and placed, not hauled across the map. Realistic furniture weight would punish woodworkers disproportionately without adding fun decisions.

7. **Stack splitting:** **Non-issue.** Weight = `perUnit × quantity`. The existing quantity system handles this automatically.

8. **Mithril flavor text:** **DECIDED — Yes.** Add weight advantage to Mithril item descriptions and codex entries. "Forged from Mithril — remarkably light for its strength." Players should understand the weight tradeoff as a feature.
