# Item Weight Audit

## Summary
**~310 items audited, 18 issues found** (7 P1, 6 P2, 3 P3, 2 P4)

Audit covers: melee weapons (38), caster weapons (34), ranged weapons/ammo (21), plate armor (30+boots), leather armor (24), cloth armor (35+), accessories (20), consumables (56), materials/processing (~60+), tools (36+crafted), starter weapons (7+1 armor), elite gear (26), housing/furniture (7).

## Issues Found

### P1 -- Missing or Zero Weight
Items with no `weight` field defined in `outputStats`:

1. **Wooden Pickaxe** (`ww-wooden-pickaxe`) -- TOOL, no weight in outputStats
2. **Fishing Rod** (`ww-fishing-rod`) -- TOOL, no weight in outputStats
3. **Carving Knife** (`ww-carving-knife`) -- TOOL, no weight in outputStats
4. **Wooden Shield** (`ww-wooden-shield`) -- ARMOR OFF_HAND, no weight in outputStats
5. **Practice Bow** (`ww-practice-bow`) -- WEAPON, no weight in outputStats
6. **Hardwood Tower Shield** (`ww-hardwood-tower-shield`) -- ARMOR OFF_HAND, no weight in outputStats
7. **All Housing Items** (Wooden Chair, Wooden Table, Storage Chest, Wooden Bed Frame, Wooden Shelf, Reinforced Crate) -- HOUSING type, `outputStats: {}` entirely empty; no weight defined. **Per rules these should be 5 lbs flat.**

Note: Tanning Rack (`ww-tanning-rack`), Fine Fishing Rod (`ww-fine-fishing-rod`) -- TOOL type, no weight in outputStats either. Similar to other WW tools above.

**Total P1: 7 unique non-housing items + 6 housing items = 13 items missing weight.**

### P2 -- Weight Doesn't Make Sense

1. **Copper Axe (2.4 lbs)** -- Same weight as Copper Sword. Axes are generally heavier than swords. Expected ~3.2 (matching Copper Mace at 3.2). Minor issue since this is flavor tier.
2. **Mithril Battleaxe (3.0 lbs)** -- Expected 3.0 via multiplier (5 base x 0.6 = 3.0). Correct by formula but lighter than Mithril Sword (1.8). Actually this IS correct: battleaxe base 5 x 0.6 = 3.0. OK on re-check.
3. **Mithril Blessed Mace (2.4 lbs)** -- Caster weapon that DOES use material multiplier (mace base 4 x 0.6 = 2.4). Blessed Maces are Blacksmith-crafted physical items, so multiplier makes sense. However, Iron Blessed Mace is 4 lbs (flat, not 4x1.0=4.0 -- coincidence) and Steel Blessed Mace is 4 lbs (should be 4x1.0=4.0, correct). Mithril breaks to 2.4 which IS 4x0.6. **Consistent -- not an issue after all.**
4. **Adamantine Longbow (3.9 lbs) vs Adamantine War Bow (4.6 lbs)** -- Longbows at T5 weigh 3.9 (via multiplier on 3.0 base x 1.3 = 3.9). War bows at T5 weigh 4.6 (via multiplier on 3.5 base x 1.3 = 4.55 rounded to 4.6). These use material multipliers despite being primarily wood bows. **ISSUE: Bows are wood+leather, not metal. Should not use metal multiplier.** However, these specific bows DO incorporate Adamantine Ingots in their recipes, so a partial multiplier may be intentional. **Flag as design question.**
5. **Stormforged Warhammer (10.4 lbs)** -- Elite T4, uses mithril. Base warhammer is 8 lbs, mithril multiplier would give 4.8. But this is 10.4 (= 8 x 1.3 adamantine mult). This item uses Mithril Ingots, not Adamantine. Weight should be 4.8 if using mithril mult. **ISSUE: Uses adamantine multiplier but recipe uses mithril materials.**
6. **Mithril Longbow (1.8 lbs) & Mithril Composite Bow (1.8 lbs)** -- Both T4 bows weigh 1.8. Longbow base 3.0 x 0.6 = 1.8. Composite base 3.0 x 0.6 = 1.8. These bows contain 1-2 Mithril Ingots in their recipe. Same concern as adamantine bows above re: whether wood-primary items should use metal multiplier.

### P3 -- Material Multiplier Incorrect

1. **Stormforged Warhammer (10.4 lbs)** -- Recipe uses Mithril Ingot x3, yet weight is 8 x 1.3 = 10.4 (Adamantine formula). Should be 8 x 0.6 = 4.8 if following mithril multiplier. **Likely intentional (elite boss-material item may use its own weight), but inconsistent with the system.**
2. **Tarrasque Cleaver (6.5 lbs)** -- Elite T5 2H weapon using Adamantine Ingot x3 + Tarrasque Plate. If base battleaxe (5) x 1.3 = 6.5. OK. But the weapon description implies it's a greatsword-class weapon (cleaver). If greatsword base (6) x 1.3 = 7.8, not 6.5. **Weight matches battleaxe base, not greatsword base.**
3. **Dragonscale Longsword (5.2 lbs)** -- Elite T3 using Steel Ingot x3 + Dragon Scale. Steel multiplier is x1.0, so longsword base 4 x 1.0 = 4.0, not 5.2. The 5.2 = 4 x 1.3 (adamantine mult). **Uses wrong multiplier -- should be 4.0 for steel-based.**

### P4 -- Category Inconsistencies

1. **Potions weight inconsistency** -- All alchemist potions are 0.5 lbs. All brewer drinks are 1.0 lbs. All scrolls are 0.1 lbs. All cook items vary (0.5-3.0). **Potions and scrolls are consistent within their category.** However, Maintenance Kit (Smelter consumable) weighs 2.0 lbs which is heavier than any potion. **Flagged as intentional (it's a toolkit, not a potion).**
2. **Quiver vs Ranger's Quiver** -- Both weigh 1.0 lbs despite different tiers (T2 vs T3). **Should Ranger's Quiver be slightly lighter or heavier? Both at 1.0 is fine for balance but noted.**

---

## Weight Reference Table (Verified Correct)

### Melee Weapons

#### Daggers
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Dagger | T1 | x0.8 | 0.8 | 0.8 | OK |
| Iron Dagger | T2 | x1.0 | 1.0 | 1.0 | OK |
| Steel Dagger | T3 | x1.0 | 1.0 | 1.0 | OK |
| Mithril Dagger | T4 | x0.6 | 0.6 | 0.6 | OK |
| Adamantine Dagger | T5 | x1.3 | 1.3 | 1.3 | OK |

Base weight: 1.0 lbs. All correct.

#### Swords
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Sword | T1 | x0.8 | 2.4 | 2.4 | OK |
| Iron Sword | T2 | x1.0 | 3.0 | 3.0 | OK |
| Steel Sword | T3 | x1.0 | 3.0 | 3.0 | OK |
| Mithril Sword | T4 | x0.6 | 1.8 | 1.8 | OK |
| Adamantine Sword | T5 | x1.3 | 3.9 | 3.9 | OK |

Base weight: 3.0 lbs. All correct.

#### Longswords
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Iron Longsword | T2 | x1.0 | 4.0 | 4.0 | OK |
| Steel Longsword | T3 | x1.0 | 4.0 | 4.0 | OK |
| Mithril Longsword | T4 | x0.6 | 2.4 | 2.4 | OK |
| Adamantine Longsword | T5 | x1.3 | 5.2 | 5.2 | OK |

Base weight: 4.0 lbs. All correct.

#### Axes
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Axe | T1 | x0.8 | 2.4 | 2.4 | OK (but same as sword) |
| Iron Axe | T2 | x1.0 | 3.0 | 3.0 | OK |
| Steel Axe | T3 | x1.0 | 3.0 | 3.0 | OK |

Base weight: 3.0 lbs (same as sword). One-handed axes.

#### Spears
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Spear | T1 | x0.8 | 2.4 | 2.4 | OK |
| Iron Spear | T2 | x1.0 | 3.0 | 3.0 | OK |
| Steel Spear | T3 | x1.0 | 3.0 | 3.0 | OK |

Base weight: 3.0 lbs. All correct.

#### Maces
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Mace | T1 | x0.8 | 3.2 | 3.2 | OK |
| Iron Mace | T2 | x1.0 | 4.0 | 4.0 | OK |
| Steel Mace | T3 | x1.0 | 4.0 | 4.0 | OK |

Base weight: 4.0 lbs. All correct.

#### Rapiers
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Mithril Rapier | T4 | x0.6 | 1.2 | 1.2 | OK |
| Adamantine Rapier | T5 | x1.3 | 2.6 | 2.6 | OK |

Base weight: 2.0 lbs. All correct.

#### Greatswords (2H)
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Steel Greatsword | T3 | x1.0 | 6.0 | 6.0 | OK |
| Mithril Greatsword | T4 | x0.6 | 3.6 | 3.6 | OK |
| Adamantine Greatsword | T5 | x1.3 | 7.8 | 7.8 | OK |

Base weight: 6.0 lbs. All correct.

#### Battleaxes (2H)
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Iron Battleaxe | T2 | x1.0 | 5.0 | 5.0 | OK |
| Steel Battleaxe | T3 | x1.0 | 5.0 | 5.0 | OK |
| Mithril Battleaxe | T4 | x0.6 | 3.0 | 3.0 | OK |
| Adamantine Battleaxe | T5 | x1.3 | 6.5 | 6.5 | OK |

Base weight: 5.0 lbs. All correct.

#### Warhammers (2H)
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Iron Warhammer | T2 | x1.0 | 8.0 | 8.0 | OK |
| Steel Warhammer | T3 | x1.0 | 8.0 | 8.0 | OK |
| Mithril Warhammer | T4 | x0.6 | 4.8 | 4.8 | OK |
| Adamantine Warhammer | T5 | x1.3 | 10.4 | 10.4 | OK |

Base weight: 8.0 lbs. All correct.

#### Halberds (2H)
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Steel Halberd | T3 | x1.0 | 6.0 | 6.0 | OK |
| Mithril Halberd | T4 | x0.6 | 3.6 | 3.6 | OK |
| Adamantine Halberd | T5 | x1.3 | 7.8 | 7.8 | OK |

Base weight: 6.0 lbs. All correct.

### Caster Weapons

#### Mage Staves (2H) -- FLAT weight, no material multiplier
| Item | Tier | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Ashwood Staff | T1 | 4.0 | 4.0 | OK |
| Ironwood Staff | T2 | 4.0 | 4.0 | OK |
| Ebonwood Staff | T3 | 4.0 | 4.0 | OK |
| Starwood Staff | T4 | 4.0 | 4.0 | OK |
| Worldtree Staff | T5 | 4.0 | 4.0 | OK |

Flat 4.0 lbs across all tiers. Correct.

#### Mage Wands (1H) -- FLAT weight
| Item | Tier | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Bone Wand | T1 | 0.5 | 0.5 | OK |
| Silver Wand | T2 | 0.5 | 0.5 | OK |
| Gold Wand | T3 | 0.5 | 0.5 | OK |
| Mithril Wand | T4 | 0.5 | 0.5 | OK |
| Adamantine Wand | T5 | 0.5 | 0.5 | OK |

Flat 0.5 lbs across all tiers. Correct.

#### Cleric Holy Symbols (1H) -- FLAT weight
| Item | Tier | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Wooden Holy Symbol | T1 | 1.0 | 1.0 | OK |
| Iron Holy Symbol | T2 | 1.0 | 1.0 | OK |
| Silver Holy Symbol | T3 | 1.0 | 1.0 | OK |
| Gold Holy Symbol | T4 | 1.0 | 1.0 | OK |
| Adamantine Holy Symbol | T5 | 1.0 | 1.0 | OK |

Flat 1.0 lbs across all tiers. Correct.

#### Cleric Blessed Maces (1H) -- MIXED: uses material mult for metal maces
| Item | Tier | Material | Expected | Actual | Status |
|------|------|----------|----------|--------|--------|
| Iron Blessed Mace | T2 | Iron x1.0 | 4.0 | 4.0 | OK |
| Steel Blessed Mace | T3 | Steel x1.0 | 4.0 | 4.0 | OK |
| Mithril Blessed Mace | T4 | Mithril x0.6 | 2.4 | 2.4 | OK |

Base 4.0 lbs (same as regular mace). Uses material multiplier since it's a physical mace. Correct.

#### Psion Orbs (1H) -- FLAT weight
| Item | Tier | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Quartz Orb | T1 | 2.0 | 2.0 | OK |
| Amethyst Orb | T2 | 2.0 | 2.0 | OK |
| Sapphire Orb | T3 | 2.0 | 2.0 | OK |
| Arcane Orb | T4 | 2.0 | 2.0 | OK |
| Void Crystal | T5 | 2.0 | 2.0 | OK |

Flat 2.0 lbs across all tiers. Correct.

#### Psion Crystal Staves (2H) -- FLAT weight
| Item | Tier | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Crystal Staff | T3 | 4.0 | 4.0 | OK |
| Arcane Crystal Staff | T4 | 4.0 | 4.0 | OK |
| Void Staff | T5 | 4.0 | 4.0 | OK |

Flat 4.0 lbs across all tiers. Correct.

#### Bard Instruments (2H) -- FLAT weight
| Item | Tier | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Traveler's Lute | T1 | 3.0 | 3.0 | OK |
| Fine Lute | T2 | 3.0 | 3.0 | OK |
| Master's Lute | T3 | 3.0 | 3.0 | OK |
| Enchanted Harp | T4 | 3.0 | 3.0 | OK |
| Legendary Songblade | T5 | 3.0 | 3.0 | OK |

Flat 3.0 lbs across all tiers. Correct.

#### Bard Hand Drums (1H) -- FLAT weight
| Item | Tier | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Wooden Drum | T1 | 2.0 | 2.0 | OK |
| War Drum | T2 | 2.0 | 2.0 | OK |
| Battle Drum | T3 | 2.0 | 2.0 | OK |

Flat 2.0 lbs across all tiers. Correct.

### Ranged Weapons

#### Bows (2H)
| Item | Tier | Base | Mult | Expected | Actual | Status |
|------|------|------|------|----------|--------|--------|
| Shortbow | T1 | 2.0 | flat | 2.0 | 2.0 | OK |
| Hunting Bow | T1 | 2.5 | flat | 2.5 | 2.5 | OK |
| Longbow | T2 | 3.0 | flat | 3.0 | 3.0 | OK |
| War Bow | T2 | 3.5 | flat | 3.5 | 3.5 | OK |
| Composite Bow | T3 | 3.0 | flat | 3.0 | 3.0 | OK |
| Ranger's Longbow | T3 | 3.0 | flat | 3.0 | 3.0 | OK |
| Mithril Longbow | T4 | 3.0 | x0.6 | 1.8 | 1.8 | FLAG |
| Mithril Composite | T4 | 3.0 | x0.6 | 1.8 | 1.8 | FLAG |
| Adamantine Longbow | T5 | 3.0 | x1.3 | 3.9 | 3.9 | FLAG |
| Adamantine War Bow | T5 | 3.5 | x1.3 | 4.55 | 4.6 | FLAG |

T1-T3 bows use flat weights. T4-T5 bows apply metal material multiplier (because recipe includes metal ingots). This is a design choice.

#### Ammunition (Consumable)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Arrows (x10) | T1 | 0.05 each | OK |
| War Arrows (x10) | T2 | 0.05 each | OK |
| Barbed Arrows (x10) | T3 | 0.05 each | OK |
| Flight Arrows (x10) | T3 | 0.05 each | OK |
| Mithril-Tipped Arrows (x10) | T4 | 0.05 each | OK |
| Adamantine Arrows (x10) | T5 | 0.05 each | OK |
| Throwing Knives (x10) | T2 | 0.5 each | OK |

All arrows at 0.05 lbs each. Consistent.

#### Quivers (Accessory, BACK slot)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Quiver | T2 | 1.0 | OK |
| Ranger's Quiver | T3 | 1.0 | OK |

Both at 1.0 lbs. Consistent.

#### Bowstring (Component)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Bowstring | T1 | 0.1 | OK |

### Plate Armor (by slot)

#### HEAD
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Helm | T1 | x0.8 | 4.0 | 4.0 | OK (base 5) |
| Iron Helm | T2 | x1.0 | 5.0 | 5.0 | OK |
| Steel Helm | T3 | x1.0 | 5.0 | 5.0 | OK |
| Mithril Helm | T4 | x0.6 | 3.0 | 3.0 | OK |
| Adamantine Helm | T5 | x1.3 | 6.5 | 6.5 | OK |

Base weight: 5.0 lbs. All correct.

#### CHEST
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Chestplate | T1 | x0.8 | 16.0 | 16.0 | OK (base 20) |
| Iron Chestplate | T2 | x1.0 | 20.0 | 20.0 | OK |
| Steel Chestplate | T3 | x1.0 | 20.0 | 20.0 | OK |
| Mithril Chestplate | T4 | x0.6 | 12.0 | 12.0 | OK |
| Adamantine Chestplate | T5 | x1.3 | 26.0 | 26.0 | OK |

Base weight: 20.0 lbs. All correct.

#### HANDS
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Gauntlets | T1 | x0.8 | 2.4 | 2.4 | OK (base 3) |
| Iron Gauntlets | T2 | x1.0 | 3.0 | 3.0 | OK |
| Steel Gauntlets | T3 | x1.0 | 3.0 | 3.0 | OK |
| Mithril Gauntlets | T4 | x0.6 | 1.8 | 1.8 | OK |
| Adamantine Gauntlets | T5 | x1.3 | 3.9 | 3.9 | OK |

Base weight: 3.0 lbs. All correct.

#### LEGS
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Greaves | T1 | x0.8 | 6.4 | 6.4 | OK (base 8) |
| Iron Greaves | T2 | x1.0 | 8.0 | 8.0 | OK |
| Steel Greaves | T3 | x1.0 | 8.0 | 8.0 | OK |
| Mithril Greaves | T4 | x0.6 | 4.8 | 4.8 | OK |
| Adamantine Greaves | T5 | x1.3 | 10.4 | 10.4 | OK |

Base weight: 8.0 lbs. All correct.

#### FEET
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Boots | T1 | x0.8 | 3.2 | 3.2 | OK (base 4) |
| Iron Boots | T2 | x1.0 | 4.0 | 4.0 | OK |
| Steel Boots | T3 | x1.0 | 4.0 | 4.0 | OK |
| Mithril Boots | T4 | x0.6 | 2.4 | 2.4 | OK |
| Adamantine Boots | T5 | x1.3 | 5.2 | 5.2 | OK |

Base weight: 4.0 lbs. All correct.

#### OFF_HAND (Shields)
| Item | Tier | Material Mult | Expected | Actual | Status |
|------|------|--------------|----------|--------|--------|
| Copper Shield | T1 | x0.8 | 4.8 | 4.8 | OK (base 6) |
| Iron Shield | T2 | x1.0 | 6.0 | 6.0 | OK |
| Steel Shield | T3 | x1.0 | 6.0 | 6.0 | OK |
| Mithril Shield | T4 | x0.6 | 3.6 | 3.6 | OK |
| Adamantine Shield | T5 | x1.3 | 7.8 | 7.8 | OK |

Base weight: 6.0 lbs. All correct.

### Leather Armor (Leatherworker)

#### HANDS
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Leather Gloves | T1 | 0.5 | OK |
| Wolf Leather Gloves | T2 | 0.5 | OK |
| Bear Hide Vambraces | T3 | 1.0 | OK |
| Exotic Leather Gloves | T4 | 1.0 | OK |
| Dragonscale Gloves | T5 | 1.5 | OK |

Progressive increase across tiers. Flat weights (no material multiplier). Correct.

#### FEET
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Leather Boots | T1 | 2.0 | OK |
| Wolf Leather Boots | T2 | 2.0 | OK |
| Bear Leather Boots | T3 | 2.5 | OK |
| Exotic Leather Boots | T4 | 3.0 | OK |
| Dragonscale Boots | T5 | 3.5 | OK |

Progressive. Correct.

#### CHEST
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Exotic Leather Vest | T4 | 8.0 | OK |
| Dragonscale Vest | T5 | 10.0 | OK |

Progressive. Correct.

#### HEAD
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Exotic Leather Cap | T4 | 2.0 | OK |
| Dragonscale Helm | T5 | 2.5 | OK |

Progressive. Correct.

#### OFF_HAND
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Exotic Leather Bracers | T4 | 2.0 | OK |
| Dragonscale Bracers | T5 | 2.0 | OK |

Flat across T4-T5. Acceptable.

#### LEGS
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Exotic Leather Leggings | T4 | 4.5 | OK |
| Dragonscale Leggings | T5 | 5.0 | OK |

Progressive. Correct.

#### BACK (Packs)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Leather Backpack | T1 | 2.0 | OK |
| Ranger's Pack | T2 | 2.0 | OK |
| Explorer's Pack | T3 | 2.0 | OK |

All 2.0 lbs. Consistent.

#### Tools (Leatherworker)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Toolbelt | T2 | 1.0 | OK |
| Leather Repair Kit | T2 | 2.0 | OK |
| Hunter's Kit | T3 | 2.0 | OK |
| Leather Waterskin | T1 | 1.0 | OK |

### Cloth Armor (Tailor)

#### HEAD
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Cloth Hood | T1 | 0.5 | OK |
| Linen Hood | T2 | 0.5 | OK |
| Merchant's Hat | T2 | 0.5 | OK |
| Woven Wool Hood | T3 | 0.5 | OK |
| Silk Hood | T4 | 0.5 | OK |
| Enchanted Silk Hood | T5 | 0.5 | OK |

Flat 0.5 lbs across all tiers. Correct per cloth rules.

#### CHEST
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Cloth Robes | T1 | 3.0 | OK |
| Cloth Robe | T1 | 3.0 | OK |
| Linen Robes | T2 | 3.0 | OK |
| Scholar's Robe | T2 | 3.0 | OK |
| Traveler's Cloak | T2 | 2.0 | OK (lighter cloak) |
| Herbalist's Apron | T2 | 1.0 | OK (light apron) |
| Woven Wool Robes | T3 | 3.0 | OK |
| Silk Robes | T4 | 3.0 | OK |
| Enchanted Silk Robes | T5 | 3.0 | OK |

Robes at flat 3.0 lbs. Correct.

#### HANDS
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Cloth Gloves | T1 | 0.2 | OK |
| Linen Gloves | T2 | 0.2 | OK |
| Woven Wool Gloves | T3 | 0.2 | OK |
| Silk Gloves | T4 | 0.2 | OK |
| Enchanted Silk Gloves | T5 | 0.2 | OK |

Flat 0.2 lbs across all tiers. Correct.

#### FEET
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Cloth Boots | T1 | 1.0 | OK |
| Linen Boots | T2 | 1.0 | OK |
| Woven Wool Boots | T3 | 1.0 | OK |
| Silk Boots | T4 | 1.0 | OK |
| Enchanted Silk Boots | T5 | 1.0 | OK |

Flat 1.0 lbs across all tiers. Correct.

#### LEGS
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Wool Trousers | T1 | 1.5 | OK |

#### OFF_HAND (Sashes)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Cloth Sash | T1 | 0.3 | OK |

#### BACK (Cloaks)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Woven Wool Cloak | T3 | 2.0 | OK |
| Silk Cloak | T4 | 2.0 | OK |
| Enchanted Silk Cloak | T5 | 2.0 | OK |

Flat 2.0 lbs across tiers. Correct.

### Accessories

#### Rings
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Copper Ring | T1 | 0.1 | OK |
| Iron Ring | T1 | 0.1 | OK |
| Silver Ring | T2 | 0.1 | OK |
| Gold Ring | T3 | 0.1 | OK |
| Mithril Ring | T4 | 0.1 | OK |
| Adamantine Ring | T5 | 0.1 | OK |

All rings at 0.1 lbs. Correct.

#### Necklaces
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Copper Necklace | T1 | 0.3 | OK |
| Silver Necklace | T2 | 0.3 | OK |
| Gold Necklace | T3 | 0.3 | OK |
| Mithril Necklace | T4 | 0.3 | OK |
| Adamantine Necklace | T5 | 0.3 | OK |

All necklaces at 0.3 lbs. Correct.

#### Brooches
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Brooch of Protection | T2 | 0.2 | OK |
| Brooch of Speed | T3 | 0.2 | OK |

#### Circlets/Crowns (HEAD accessory)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Circlet of Focus | T3 | 1.0 | OK |
| Crown of Wisdom | T4 | 1.0 | OK |

### Consumables

#### Potions (Alchemist)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Minor Healing Potion | T1 | 0.5 | OK |
| Antidote | T1 | 0.5 | OK |
| Berry Salve | T1 | 0.5 | OK |
| Healing Potion | T2 | 0.5 | OK |
| Elixir of Strength | T2 | 0.5 | OK |
| Elixir of Wisdom | T2 | 0.5 | OK |
| Poison Resistance Tonic | T2 | 0.5 | OK |
| Greater Healing Potion | T3 | 0.5 | OK |
| Elixir of Fortitude | T3 | 0.5 | OK |
| Glowcap Extract | T3 | 0.5 | OK |
| Universal Antidote | T3 | 0.5 | OK |

All potions at 0.5 lbs. Perfectly consistent.

#### Food (Cook)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Bread | T1 | 0.5 | OK |
| Rations | T1 | 0.5 | OK |
| Berry Jam | T1 | 0.5 | OK |
| Herbal Tea | T1 | 0.5 | OK |
| Scrambled Eggs | T1 | 1.5 | OK |
| Creamy Porridge | T1 | 1.5 | OK |
| Roast Meat | T1 | 1.0 | OK |
| Vegetable Soup | T1 | 1.5 | OK |
| Smoked Meat | T1 | 1.0 | OK |
| Grilled Fish | T2 | 1.0 | OK |
| Fish Stew | T2 | 1.5 | OK |
| Smoked Fish | T2 | 1.0 | OK |
| Apple Pie | T2 | 1.5 | OK |
| Berry Tart | T2 | 1.5 | OK |
| Seasoned Fish Platter | T2 | 1.5 | OK |
| Farm Breakfast | T1 | 1.5 | OK |
| Pan-Seared Trout | T3 | 1.5 | OK |
| Perch Feast | T3 | 1.5 | OK |
| Fisherman's Pie | T3 | 1.5 | OK |
| Smoked Trout Rations | T3 | 1.5 | OK |
| Hearty Feast | T3 | 3.0 | OK |
| Royal Banquet | T5 | 3.0 | OK |

Food weight pattern: simple items 0.5, moderate meals 1.0-1.5, feasts 3.0. Reasonable.

#### Drinks (Brewer)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Ale | T1 | 1.0 | OK |
| Apple Cider | T1 | 1.0 | OK |
| Berry Cordial | T1 | 1.0 | OK |
| Strong Ale | T2 | 1.0 | OK |
| Mulled Cider | T2 | 1.0 | OK |
| Herbal Brew | T2 | 1.0 | OK |
| Hopped Beer | T3 | 1.0 | OK |
| Grape Wine | T3 | 1.0 | OK |
| Pale Ale | T3 | 1.0 | OK |

All drinks at 1.0 lbs. Perfectly consistent.

#### Scrolls (Scribe)
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Scroll of Fire | T2 | 0.1 | OK |
| Scroll of Ice | T2 | 0.1 | OK |
| Scroll of Lightning | T3 | 0.1 | OK |
| Scroll of Healing | T2 | 0.1 | OK |
| Area Map | T1 | 0.1 | OK |
| Dungeon Map | T2 | 0.1 | OK |
| Identification Scroll | T1 | 0.1 | OK |
| Scroll of Stone Skin | T3 | 0.1 | OK |
| Scroll of Might | T3 | 0.1 | OK |
| Scroll of Entangle | T3 | 0.1 | OK |
| Scroll of Restoration | T3 | 0.1 | OK |

All scrolls at 0.1 lbs. Perfectly consistent.

#### Utility Consumables
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Maintenance Kit | T1 | 2.0 | OK (toolkit) |
| Precision Maintenance Kit | T3 | 2.0 | OK (toolkit) |
| Leather Satchel | T1 | 0.5 | OK |

### Materials (Processed -- from Smelter/Tanner/Tailor/Woodworker/Mason)

Processing recipes don't produce items with `outputStats` (no weight field on the recipe), so processed material weights come from the seed file `database/seeds/recipes.ts` ITEM_TEMPLATES:

From seeds (verified via grep):
| Item | Weight | Status |
|------|--------|--------|
| Iron Ingot | 1.0 | OK |
| Steel Ingot | 1.0 | OK |
| Silver Ingot | 1.0 | OK |
| Gold Ingot | 1.0 | OK |
| Mithril Ingot | 1.0 | OK |
| Adamantine Ingot | 1.0 | OK |
| Glass | 0.5 | OK |
| Nails (x50) | 1.0 | OK |
| Iron Fittings | 1.0 | OK |
| Leather | 1.0 | OK |
| Wolf Leather | 1.0 | OK |
| Bear Leather | 1.0 | OK |
| Exotic Leather | 1.0 | OK |
| Dragonscale Leather | 1.0 | OK |
| Cloth | 0.3 | OK |
| Woven Cloth | 0.3 | OK |
| Fine Cloth | 0.3 | OK |
| Silk Fabric | 0.3 | OK |
| Softwood Planks | 1.0 | OK |
| Hardwood Planks | 1.0 | OK |
| Exotic Planks | 1.0 | OK |
| Rough Planks | 1.0 | OK |
| Beams | 2.0 | OK |
| Barrel | 5.0 | OK |
| Furniture | 5.0 | OK |
| Wooden Dowels | 0.3 | OK |
| Wooden Handle | 0.5 | OK |
| Bow Stave | 1.0 | OK |
| Wooden Frame | 2.0 | OK |
| Cut Stone | 2.0 | OK |
| Cut Sandstone | 2.0 | OK |
| Bricks | 2.0 | OK |
| Stone Slab | 8.0 | OK |
| Clay Pot | 2.0 | OK |
| Polished Marble | 5.0 | OK |

### Materials (Raw/Gathered)

From `shared/src/data/gathering.ts`:
| Item | Weight | Status |
|------|--------|--------|
| Apples | 0.3 | OK |
| Raw Fish | 1.0 | OK |
| River Trout | 1.0 | OK |
| Lake Perch | 1.0 | OK |
| Wild Berries | 0.3 | OK |
| Wild Herbs | 0.1 | OK |
| Iron Ore Chunks | 3.0 | OK |
| Wood Logs | 4.0 | OK |
| Stone Blocks | 5.0 | OK |
| Clay | 3.0 | OK |
| Grain | 0.5 | OK |
| Vegetables | 0.5 | OK |
| Wild Game Meat | 2.0 | OK |
| Animal Pelts | 1.0 | OK |
| Wolf Pelts | 1.5 | OK |
| Bear Hides | 2.0 | OK |
| Hops | 0.5 | OK |
| Grapes | 0.5 | OK |
| Cotton | 0.3 | OK |
| Coal | 2.0 | OK |
| Silver Ore | 3.0 | OK |
| Softwood | 2.0 | OK |
| Hardwood | 3.0 | OK |
| Medicinal Herbs | 0.1 | OK |
| Glowcap Mushrooms | 0.1 | OK |
| Eggs | 0.3 | OK |
| Milk | 1.0 | OK |
| Wool | 0.5 | OK |
| Fine Wool | 0.5 | OK |
| Silkworm Cocoons | 0.1 | OK |

### Tools (from tools/index.ts)

Tool weights are auto-generated: `base_weight * tier_multiplier`

Base weights: Pickaxe=4, Axe=3, Hoe=3, Fishing Rod=2, Sickle=1.5, Skinning Knife=1

Tier multipliers: Crude=0.8, Copper=0.8, Iron=1.0, Steel=1.0, Mithril=0.6, Adamantine=1.3

| Tool | Crude | Copper | Iron | Steel | Mithril | Adamantine |
|------|-------|--------|------|-------|---------|------------|
| Pickaxe | 3.2 | 3.2 | 4.0 | 4.0 | 2.4 | 5.2 |
| Axe | 2.4 | 2.4 | 3.0 | 3.0 | 1.8 | 3.9 |
| Hoe | 2.4 | 2.4 | 3.0 | 3.0 | 1.8 | 3.9 |
| Fishing Rod | 1.6 | 1.6 | 2.0 | 2.0 | 1.2 | 2.6 |
| Sickle | 1.2 | 1.2 | 1.5 | 1.5 | 0.9 | 2.0 |
| Skinning Knife | 0.8 | 0.8 | 1.0 | 1.0 | 0.6 | 1.3 |

All 36 tool templates auto-generated correctly. Multipliers match weapon system.

### Starter Weapons

| Item | Class | Actual | Status |
|------|-------|--------|--------|
| Rustic Shortsword | Warrior | 2.4 | OK (copper sword weight) |
| Rustic Shortbow | Ranger | 1.6 | OK |
| Rustic Dagger | Rogue | 0.8 | OK (copper dagger weight) |
| Rustic Staff | Mage | 4.0 | OK (staff flat weight) |
| Rustic Crystal Focus | Psion | 2.0 | OK (orb flat weight) |
| Rustic Lute Blade | Bard | 3.0 | OK (instrument flat weight) |
| Rustic Mace | Cleric | 3.2 | OK (copper mace weight) |
| Rustic Leather Vest | All | 5.0 | OK (starter armor) |

### Elite Gear

#### Elite Melee Weapons
| Item | Tier | Base Type | Actual | Status |
|------|------|-----------|--------|--------|
| Dragonscale Longsword | T3 | Longsword | 5.2 | P3 (steel=4.0, not 5.2) |
| Hellforged Greatsword | T3 | Greatsword | 7.8 | OK (6x1.3=7.8) |
| Soulreaper Blade | T3 | Longsword | 5.2 | Same as Dragonscale |
| Stormforged Warhammer | T4 | Warhammer | 10.4 | P3 (mithril=4.8, not 10.4) |
| Voidsteel Greatsword | T5 | Greatsword | 7.8 | OK (6x1.3=7.8) |
| Tarrasque Cleaver | T5 | Battleaxe? | 6.5 | OK if battleaxe base (5x1.3) |

#### Elite Plate Armor
| Item | Tier | Slot | Actual | Status |
|------|------|------|--------|--------|
| Dragonscale Plate | T3 | CHEST | 26.0 | OK (20x1.3=26) |
| Golem-Forged Plate | T4 | CHEST | 26.0 | NOTE: mithril recipe but adamantine weight |
| Wyrm Scale Plate | T5 | CHEST | 26.0 | OK (20x1.3=26) |
| Tarrasque Shell | T5 | OFF_HAND | 7.8 | OK (6x1.3=7.8) |

#### Elite Caster Weapons
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Feywood Staff | T3 | 4.0 | OK (staff flat) |
| Mindshatter Orb | T4 | 2.0 | OK (orb flat) |
| Phoenix Staff | T5 | 4.0 | OK (staff flat) |
| Titan's Focus | T5 | 2.0 | OK (orb-class flat) |

#### Elite Accessories
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Hydra Fang Amulet | T3 | 0.3 | OK (necklace) |
| Beholder Lens Ring | T4 | 0.1 | OK (ring) |
| Phylactery Amulet | T5 | 0.3 | OK (necklace) |
| Void Crystal Ring | T5 | 0.1 | OK (ring) |

#### Elite Leather Armor
| Item | Tier | Slot | Actual | Status |
|------|------|------|--------|--------|
| Wyvern Scale Vest | T3 | CHEST | 10.0 | OK |
| Vampire Hide Armor | T4 | CHEST | 10.0 | OK |
| Wyrm Hide Armor | T5 | CHEST | 10.0 | OK |

#### Elite Cloth Armor
| Item | Tier | Slot | Actual | Status |
|------|------|------|--------|--------|
| Fey-Touched Robe | T3 | CHEST | 3.0 | OK (robe flat) |
| Death Knight's Mantle | T4 | CHEST | 3.0 | OK |
| Phoenix Silk Robe | T5 | CHEST | 3.0 | OK |

#### Elite Instruments
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Feywood Lute | T3 | 3.0 | OK (instrument flat) |
| Stormsong Harp | T4 | 3.0 | OK |

#### Elite Bows
| Item | Tier | Actual | Status |
|------|------|--------|--------|
| Dragonbone Bow | T3 | 3.0 | OK (bow flat) |
| Wyrm Sinew Bow | T5 | 3.9 | OK (3.0x1.3) |

### Seed-Only Items (from database/seeds/recipes.ts ITEM_TEMPLATES)

These items are defined in the seed file with weights, not in recipe data files. Includes processed materials, monster drops, and miscellaneous items. All have weight > 0 defined. Sample:

| Category | Item | Weight |
|----------|------|--------|
| Monster Drop | Dragon Scale | 0.5 |
| Monster Drop | Spider Silk | 0.1 |
| Monster Drop | Troll Blood | 0.5 |
| Monster Drop | Wyvern Scale | 0.3 |
| Building Mat | Stone Hearth | 5.0 |
| Building Mat | Brick Oven | 5.0 |
| Building Mat | Stone Fountain | 5.0 |
| Building Mat | Marble Statue | 5.0 |
| Reagent | Arcane Reagents | 0.1 |
| Reagent | Gemstones | 0.3 |
| Ore | Iron Ore | 3.0 |
| Ore | Gold Ore | 3.0 |
| Ore | Mithril Ore | 2.0 |
| Ore | Adamantine Ore | 3.0 |
| Misc | Raw Stone | 5.0 |
| Misc | Marble | 6.0 |
| Misc | Exotic Wood | 3.0 |
| Misc | Exotic Hide | 2.0 |
| Misc | Dragon Hide | 3.0 |
| Food (seed) | Flour | 1.0 |
| Food (seed) | Apple Sauce | 1.0 |
| Food (seed) | Porridge | 1.0 |
| Food (seed) | Vegetable Stew | 1.0 |
| Food (seed) | Bread Loaf | 1.0 |
| Rancher | Beef | 1.5 |
| Rancher | Pork | 1.5 |
| Rancher | Chicken | 1.5 |
| Rancher | Rare Herbs | 0.1 |
| Rancher | Spices | 0.1 |
| Rancher | Salt | 0.5 |
| Boss Drop | Demon Heart | 0.5 |
| Boss Drop | Lich Dust | 0.1 |
| Boss Drop | Void Fragment | 0.1 |
| Boss Drop | Phoenix Feather | 0.1 |
| Boss Drop | Tarrasque Plate | 15.0 |
| Boss Drop | Storm Giant's Heart | 10.0 |
| Boss Drop | Titan Shard | 5.0 |
