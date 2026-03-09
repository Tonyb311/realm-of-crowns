# Item Weight Rules — Reference Document

> This document is the source of truth for item weights in Realm of Crowns.
> Every prompt that adds new items MUST reference this document.
> Updated: 2026-03-09

## Core Principles
- All weights in pounds (lbs)
- Weights rounded to 1 decimal place
- Gold coins are weightless
- Furniture items use reduced "flat-pack" weight (5 lbs)
- Equipped gear counts against carry capacity

## Material Multipliers (Metal Items Only)
| Tier | Material | Multiplier | Notes |
|------|----------|-----------|-------|
| T1 | Copper | x0.8 | Flavor name — uses Iron materials |
| T2 | Iron | x1.0 | Baseline |
| T3 | Steel | x1.0 | Same density as iron |
| T4 | Mithril | x0.6 | Fantasy-light metal — major carry advantage |
| T5 | Adamantine | x1.3 | Fantasy-dense metal — heaviest |

**Does NOT apply to:** Cloth, leather, wood, crystal, or magical items. These use flat weights.

## Weapon Weights

### Melee (Base weights — apply material multiplier)
| Weapon Type | Hands | Base Weight |
|-------------|-------|-------------|
| Dagger | 1H | 1.0 |
| Sword | 1H | 3.0 |
| Longsword | 1H | 4.0 |
| Rapier | 1H | 2.0 |
| Axe | 1H | 3.0 |
| Spear | 1H | 3.0 |
| Mace | 1H | 4.0 |
| Greatsword | 2H | 6.0 |
| Battleaxe | 2H | 5.0 |
| Warhammer | 2H | 8.0 |
| Halberd | 2H | 6.0 |

### Caster (Flat weights — NO material multiplier)
| Weapon Type | Hands | Weight |
|-------------|-------|--------|
| Staff | 2H | 4.0 |
| Wand | 1H | 0.5 |
| Orb | 1H | 2.0 |
| Crystal Staff | 2H | 4.0 |
| Holy Symbol | 1H | 1.0 |
| Instrument (Lute/Harp) | 2H | 3.0 |
| Instrument (Drum) | 1H | 2.0 |
| Blessed Mace | 1H | 4.0 x material mult (metal item) |

### Ranged (Base weights)
| Weapon Type | Hands | Base Weight | Notes |
|-------------|-------|-------------|-------|
| Shortbow | 2H | 2.0 | T1 flat |
| Hunting Bow | 2H | 2.5 | T1 flat |
| Longbow | 2H | 3.0 | T1-T3 flat; T4-T5 apply material mult |
| War Bow | 2H | 3.5 | T2 flat; T5 applies material mult |
| Composite Bow | 2H | 3.0 | T3 flat; T4 applies material mult |
| Ranger's Longbow | 2H | 3.0 | T3 flat |
| Arrows (per unit) | -- | 0.05 | All tiers |
| Throwing Knives (per unit) | -- | 0.5 | |
| Bowstring | -- | 0.1 | Component |
| Quiver | BACK | 1.0 | All tiers |

## Armor Weights

### Plate (ARMORER) — Apply material multiplier
| Slot | Base Weight |
|------|-------------|
| HEAD | 5.0 |
| CHEST | 20.0 |
| HANDS | 3.0 |
| LEGS | 8.0 |
| FEET | 4.0 |
| OFF_HAND (shield) | 6.0 |

### Leather (LEATHERWORKER) — Progressive by hide tier, flat weights
| Slot | T1 Basic | T2 Wolf | T3 Bear | T4 Exotic | T5 Dragonscale |
|------|----------|---------|---------|-----------|----------------|
| HEAD | -- | -- | -- | 2.0 | 2.5 |
| CHEST | -- | -- | -- | 8.0 | 10.0 |
| HANDS | 0.5 | 0.5 | 1.0 | 1.0 | 1.5 |
| LEGS | -- | -- | -- | 4.5 | 5.0 |
| FEET | 2.0 | 2.0 | 2.5 | 3.0 | 3.5 |
| OFF_HAND | -- | -- | -- | 2.0 | 2.0 |
| BACK (pack) | 2.0 | 2.0 | 2.0 | -- | -- |

### Cloth (TAILOR) — Flat weights, no tier scaling
| Slot | Weight |
|------|--------|
| HEAD (hood/hat) | 0.5 |
| CHEST (robes) | 3.0 |
| CHEST (cloak) | 2.0 |
| CHEST (apron) | 1.0 |
| HANDS (gloves) | 0.2 |
| LEGS (trousers) | 1.5 |
| FEET (boots) | 1.0 |
| BACK (cloak) | 2.0 |
| OFF_HAND (sash) | 0.3 |

## Accessories
| Type | Weight |
|------|--------|
| Ring | 0.1 |
| Necklace/Amulet/Pendant | 0.3 |
| Brooch | 0.2 |
| Circlet/Crown | 1.0 |

## Bags & Carry Capacity

Bags occupy the dedicated **BAG** equip slot (13th slot). One bag can be equipped at a time. The equipped bag's `carryBonus` is added to carry capacity.

### Regular Bags (LEATHERWORKER)

| Bag | Size | Crafting Lvl | Equip Lvl | carryBonus | Weight | Rarity |
|-----|------|-------------|-----------|-----------|--------|--------|
| Leather Pouch | XS | 1 | 1 | +10 lbs | 1 | COMMON |
| Leather Backpack | S | 8 | 3 | +15 lbs | 2 | COMMON |
| Ranger's Pack | M | 20 | 15 | +30 lbs | 2 | FINE |
| Explorer's Pack | L | 40 | 30 | +50 lbs | 2 | SUPERIOR |
| Adventurer's Haversack | XL | 55 | 45 | +70 lbs | 3 | MASTERWORK |

### Magical Bags of Holding (ENCHANTER)

| Bag | Crafting Lvl | Equip Lvl | carryBonus | Weight | Base Ingredient |
|-----|-------------|-----------|-----------|--------|-----------------|
| Minor Bag of Holding | 30 | 25 | +40 lbs | 2 | Leather Backpack |
| Bag of Holding | 45 | 40 | +80 lbs | 2 | Ranger's Pack |
| Greater Bag of Holding | 60 | 55 | +120 lbs | 2 | Explorer's Pack |
| Grand Bag of Holding | 75 | 70 | +175 lbs | 2 | Adventurer's Haversack |

### Rules
- Only the equipped bag's carryBonus applies (bags don't stack)
- Bag weight counts against carry capacity (but net effect is always positive)
- Carry capacity formula: `STR × 10 × (1 + racialMod) + bagBonus`
- Magical bags always weigh 2 lbs regardless of contents (dimensional magic)

## Consumables
| Type | Weight/Unit |
|------|------------|
| All potions/elixirs/tonics | 0.5 |
| Bread/Rations/Jam | 0.5 |
| Roast Meat/Fish/Smoked items | 1.0 |
| Soups/Stews/Pies/Tarts/Meals | 1.5 |
| Feasts/Banquets | 3.0 |
| Ale/Cider/Wine/Beer | 1.0 |
| All scrolls/maps | 0.1 |
| Maintenance Kit | 2.0 |
| Leather Satchel | 0.5 |

## Processed Materials (from seeds)
| Material | Weight/Unit |
|----------|------------|
| All metal ingots (Iron/Steel/Silver/Gold/Mithril/Adamantine) | 1.0 |
| Glass | 0.5 |
| Nails (x50) | 1.0 |
| Iron Fittings | 1.0 |
| All leather types (Basic/Wolf/Bear/Exotic/Dragonscale) | 1.0 |
| All cloth types (Cloth/Woven/Fine Cloth/Silk Fabric) | 0.3 |
| All plank types (Softwood/Hardwood/Exotic/Rough) | 1.0 |
| Beams | 2.0 |
| Barrel | 5.0 |
| Furniture | 5.0 |
| Wooden Dowels | 0.3 |
| Wooden Handle | 0.5 |
| Bow Stave | 1.0 |
| Wooden Frame | 2.0 |
| Cut Stone / Cut Sandstone | 2.0 |
| Bricks | 2.0 |
| Stone Slab | 8.0 |
| Clay Pot | 2.0 |
| Polished Marble | 5.0 |
| Flour | 1.0 |
| Arcane Reagents | 0.1 |
| Gemstones | 0.3 |

## Raw Gathering Resources
| Resource | Weight/Unit |
|----------|------------|
| Iron Ore / Silver Ore / Adamantine Ore | 3.0 |
| Gold Ore | 3.0 |
| Mithril Ore | 2.0 |
| Coal | 2.0 |
| Raw Stone | 5.0 |
| Stone Blocks | 5.0 |
| Marble | 6.0 |
| Clay | 3.0 |
| Wood Logs | 4.0 |
| Softwood | 2.0 |
| Hardwood / Exotic Wood | 3.0 |
| Animal Pelts | 1.0 |
| Wolf Pelts | 1.5 |
| Bear Hides | 2.0 |
| Exotic Hide | 2.0 |
| Dragon Hide | 3.0 |
| Fish (all types: Raw Fish, River Trout, Lake Perch) | 1.0 |
| Wild Game Meat | 2.0 |
| Grain / Vegetables | 0.5 |
| Hops / Grapes | 0.5 |
| Apples / Wild Berries | 0.3 |
| Cotton / Eggs | 0.3 |
| Wild Herbs / Medicinal Herbs / Glowcap Mushrooms | 0.1 |
| Silkworm Cocoons | 0.1 |
| Milk | 1.0 |
| Wool / Fine Wool | 0.5 |

## Boss Drop Materials
| Material | Weight |
|----------|--------|
| Dragon Scale | 0.5 |
| Wyvern Scale | 0.3 |
| Spider Silk | 0.1 |
| Troll Blood | 0.5 |
| Demon Heart | 0.5 |
| Lich Dust | 0.1 |
| Void Fragment | 0.1 |
| Phoenix Feather | 0.1 |
| Tarrasque Plate | 15.0 |
| Storm Giant's Heart | 10.0 |
| Titan Shard | 5.0 |
| Rare Herbs / Spices | 0.1 |
| Salt | 0.5 |

## Tools (Base weights — apply material multiplier by tier)
| Tool Type | Profession | Base Weight |
|-----------|-----------|-------------|
| Pickaxe | MINER | 4.0 |
| Axe | LUMBERJACK | 3.0 |
| Hoe | FARMER | 3.0 |
| Fishing Rod | FISHERMAN | 2.0 |
| Sickle | HERBALIST | 1.5 |
| Skinning Knife | HUNTER | 1.0 |

Tool tier multipliers: CRUDE x0.8, COPPER x0.8, IRON x1.0, STEEL x1.0, MITHRIL x0.6, ADAMANTINE x1.3

## Misc Utility Items
| Item | Weight |
|------|--------|
| Toolbelt | 1.0 |
| Leather Repair Kit | 2.0 |
| Hunter's Kit | 2.0 |
| Leather Waterskin | 1.0 |

## Furniture & Housing Items
All furniture: **5.0 lbs flat** (reduced "flat-pack" weight regardless of type)

Applies to: Wooden Chair, Wooden Table, Storage Chest, Wooden Bed Frame, Wooden Shelf, Reinforced Crate, and any future furniture items.

## Building Materials (Mason/Woodworker output)
| Item | Weight |
|------|--------|
| Stone Hearth | 5.0 |
| Brick Oven | 5.0 |
| Stone Fountain | 5.0 |
| Marble Statue | 5.0 |

## Starter Equipment
| Item | Class | Weight |
|------|-------|--------|
| Rustic Shortsword | Warrior | 2.4 |
| Rustic Shortbow | Ranger | 1.6 |
| Rustic Dagger | Rogue | 0.8 |
| Rustic Staff | Mage | 4.0 |
| Rustic Crystal Focus | Psion | 2.0 |
| Rustic Lute Blade | Bard | 3.0 |
| Rustic Mace | Cleric | 3.2 |
| Rustic Leather Vest | All | 5.0 |

## Elite / Boss-Drop Gear
- Use the base type weight with the material multiplier matching the recipe's primary metal ingredient
- Elite caster weapons use standard flat caster weights
- Elite accessories use standard accessory weights
- Elite leather/cloth armor uses highest-tier weight for that category

**Known issues (from audit 2026-03-09):**
- Dragonscale Longsword: 5.2 (should be 4.0 for steel base x1.0)
- Stormforged Warhammer: 10.4 (should be 4.8 for mithril 8.0 x0.6)
- T4-T5 bows apply metal multiplier despite being wood-primary (design question)

## Rules for New Items
When adding ANY new item to the game:
1. Identify the item's category from the tables above
2. Look up the base weight for that category
3. If it's a metal item, apply the material multiplier for its tier
4. If it's a new category not listed here, find the closest real-world analogue and assign weight accordingly
5. Document the weight choice in the recipe/seed file with a comment
6. Weight MUST be > 0 for all items (the `itemTemplates.weight` column defaults to 0 -- this default should only exist for the brief moment between migration and seed)
