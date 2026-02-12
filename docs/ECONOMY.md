# Realm of Crowns — Economy & Profession System Design
## "Everything Connects to Everything"

> Updated 2026-02-10. This document describes the economy system design.
> The marketplace, taxes, and basic item/gold systems are implemented in Phase 1.
> Profession definitions are fully implemented in `shared/src/data/professions/` with
> complete TypeScript data for all 29 professions (7 gathering + 15 crafting + 7 service),
> including tier unlock descriptions, primary stats, related professions, and town affinities.
> Resources, recipes, and crafting chain mechanics are **Phase 2A** (Prompts 09-14)
> and have not yet been built as interactive gameplay systems.

---

## Core Philosophy

Every item in the game should trace back to **raw materials gathered by players**.
No NPC shortcuts. No spawning gear from nothing. If a knight wears plate armor,
someone mined the ore, someone smelted it into ingots, someone forged it into plates,
and someone assembled it into armor. Every step is a player. Every step earns gold.

> **Daily action model:** The economy is paced around **1 major action per day** (one gathering run, one crafting batch, one combat encounter, etc.). XP curves, profession XP, crafting times, and quest objective quantities are all calibrated for this cadence. Players who log in for 10--20 minutes daily should see steady, meaningful progression.

---

## 📊 PROFESSION OVERVIEW

Professions have **levels 1–100** and fall into two categories:

### 🌿 Gathering Professions (Raw Materials)
| Profession | What They Produce | Where They Work |
|-----------|-------------------|-----------------|
| **Farmer** | Wheat, Vegetables, Corn, Hops, Cotton, Flax, Apples, Grapes | Farms (plains towns) |
| **Rancher** | Beef, Sheep, Pork, Chicken, Horses, Wool, Milk, Eggs | Ranches (plains/hill towns) |
| **Fisherman** | Common Fish, Rare Fish, Shellfish, Pearls, Seaweed | Docks (coastal towns) |
| **Lumberjack** | Softwood, Hardwood, Exotic Wood, Bark, Sap, Resin | Forests (forest towns) |
| **Miner** | Copper Ore, Iron Ore, Silver Ore, Gold Ore, Gemstones, Coal, Stone | Mines (mountain towns) |
| **Herbalist** | Common Herbs, Medicinal Herbs, Rare Herbs, Mushrooms, Flowers, Arcane Reagents | Wilds (forest/swamp towns) |
| **Hunter** | Leather (Raw), Pelts, Bone, Antlers, Feathers, Wild Game Meat | Wilds (forest/mountain towns) |

### ⚒️ Crafting/Processing Professions (Turn Raw → Refined → Finished)
| Profession | What They Do | Key Inputs → Outputs |
|-----------|-------------|---------------------|
| **Smelter** | Processes raw ore into usable metals | Ore + Coal → Ingots (Copper, Iron, Steel, Silver, Gold) |
| **Blacksmith** | Forges weapons | Metal Ingots + Leather + Wood → Swords, Axes, Maces, Daggers |
| **Armorer** | Forges armor | Metal Ingots + Leather + Padding → Helmets, Chestplates, Shields, Gauntlets |
| **Woodworker/Carpenter** | Makes wooden items & buildings | Wood + Nails + Glue → Bows, Staves, Furniture, Barrels, Building Materials |
| **Tanner** | Processes raw hides into leather | Raw Leather + Bark (tanning agent) → Soft Leather, Hard Leather, Studded Leather |
| **Leatherworker** | Makes leather goods | Tanned Leather → Leather Armor, Boots, Belts, Bags, Saddles |
| **Tailor/Weaver** | Makes cloth and clothing | Cotton/Flax/Wool → Cloth → Robes, Cloaks, Tunics, Bags, Banners |
| **Alchemist** | Brews potions and elixirs | Herbs + Reagents + Vials → Health Potions, Mana Potions, Poisons, Buffs |
| **Enchanter** | Adds magical properties to items | Finished Item + Arcane Reagents + Gems → Enchanted Item |
| **Cook/Baker** | Makes food (buffs and healing) | Grain + Meat + Vegetables + Spices → Meals, Bread, Rations, Feast Platters |
| **Brewer** | Makes drinks (buffs and trade goods) | Hops + Grain + Water + Fruit → Ale, Wine, Mead, Spirits |
| **Jeweler** | Makes rings, amulets, circlets | Gems + Metal Ingots → Rings, Necklaces, Circlets, Enchanting Focuses |
| **Fletcher** | Makes arrows, bolts, ranged ammo | Wood + Feathers + Metal Tips → Arrows, Bolts, Throwing Knives |
| **Mason** | Processes stone for buildings | Raw Stone → Cut Stone, Bricks → Building Materials |
| **Scribe** | Makes scrolls, spell books, maps | Paper (from wood pulp) + Ink (from herbs) → Spell Scrolls, Maps, Books |

### 🏛️ Service Professions (Player-Run Services)
| Profession | What They Do |
|-----------|-------------|
| **Merchant/Trader** | Runs a shop or market stall, can set up trade caravans between towns |
| **Innkeeper** | Runs a tavern/inn — players can rest here for buffs, buy food/drink |
| **Healer** | Provides healing services, removes curses/debuffs, resurrection |
| **Stable Master** | Breeds, trains, and sells mounts |
| **Banker** | Runs a player bank — secure storage, loans with interest |
| **Courier** | Delivers items between towns for a fee (faster than player travel) |
| **Mercenary Captain** | Organizes and sells NPC guard contracts, escorts for caravans |

---

## 🔗 RESOURCE CHAIN MAPS

### ⚔️ Chain: Iron Sword
```
Miner (mines Iron Ore + Coal)
    ↓
Smelter (smelts Iron Ore + Coal → Iron Ingots)
    ↓
Lumberjack (cuts Hardwood for handle)
    ↓
Hunter (hunts for Raw Leather for grip)
    ↓
Tanner (tans Raw Leather → Soft Leather)
    ↓
Blacksmith (forges Iron Ingots + Hardwood + Soft Leather → Iron Sword)
    ↓
[OPTIONAL] Enchanter (enchants Iron Sword + Arcane Reagents + Gem → Flaming Iron Sword)
```
**Players involved: 5–6 different professions**

---

### 🛡️ Chain: Steel Plate Armor
```
Miner (mines Iron Ore + Coal)
    ↓
Smelter (smelts Iron Ore + Coal → Iron Ingots)
    ↓
Smelter (refines Iron Ingots + More Coal → Steel Ingots)  [Requires Smelter Lvl 30+]
    ↓
Farmer (grows Cotton)
    ↓
Tailor (weaves Cotton → Cloth Padding)
    ↓
Hunter (hunts for Raw Leather)
    ↓
Tanner (tans Raw Leather → Hard Leather for straps)
    ↓
Armorer (forges Steel Ingots + Cloth Padding + Hard Leather → Steel Plate Armor)
    ↓
[OPTIONAL] Enchanter (enchants → Warded Steel Plate Armor)
```
**Players involved: 6–7 different professions**

---

### 🧪 Chain: Greater Healing Potion
```
Herbalist (gathers Medicinal Herbs + Rare Herbs)
    ↓
Miner (mines Silite Sand — for glass)  OR  Woodworker (carves Wooden Vials at low level)
    ↓
Smelter (smelts sand → Glass Vials)  [Requires Smelter Lvl 15+]
    ↓
Alchemist (brews Medicinal Herbs + Rare Herbs + Glass Vial → Greater Healing Potion)
```
**Players involved: 3–4 different professions**

---

### 🍞 Chain: Hearty Feast (Party Buff Food)
```
Farmer (grows Wheat + Vegetables)
    ↓
Rancher (raises Cattle → Beef, Chickens → Eggs)
    ↓
Herbalist (gathers Spices/Herbs for seasoning)
    ↓
Cook (bakes Wheat → Bread, cooks Beef + Vegetables + Spices → Roast)
    ↓
Cook (assembles Bread + Roast + Eggs + Spices → Hearty Feast)
    [Grants +5 STR, +5 CON buff for 4 hours to entire party]
```
**Players involved: 4 different professions**

---

### 🏠 Chain: Player House (Small Cottage)
```
Lumberjack (cuts Softwood + Hardwood)
    ↓
Woodworker (processes into Planks + Beams)
    ↓
Miner (mines Stone)
    ↓
Mason (cuts Stone → Cut Stone Blocks + Bricks)
    ↓
Smelter (makes Iron Nails from Iron Ore)
    ↓
Tailor (weaves Cloth for curtains/bedding)
    ↓
Carpenter/Woodworker (builds Furniture: bed, table, chairs, storage chest)
    ↓
[Construction] Requires: 50 Planks, 20 Beams, 100 Cut Stone, 200 Nails, 
              Furniture Set, Cloth Set → Small Cottage
```
**Players involved: 6+ different professions**

---

### 🏹 Chain: Enchanted Elven Longbow
```
Lumberjack (harvests Exotic Wood — requires Lvl 50+, only in Elven forests)
    ↓
Woodworker (shapes Exotic Wood → Bow Stave — requires Lvl 40+)
    ↓
Rancher (raises Sheep → Wool) + Tailor (spins Wool → Bowstring)
    ↓  
Hunter (hunts rare creatures → Exotic Feathers)
    ↓
Fletcher (assembles Bow Stave + Bowstring → Elven Longbow — requires Lvl 45+)
    ↓
Herbalist (gathers Arcane Reagents — Lvl 40+)
    ↓
Jeweler (cuts raw Gem → Polished Emerald)
    ↓
Enchanter (enchants Elven Longbow + Arcane Reagents + Emerald → 
          Enchanted Elven Longbow of Piercing — requires Lvl 50+)
```
**Players involved: 8 different professions — this is endgame crafting**

---

### 🐴 Chain: War Horse (Combat Mount)
```
Farmer (grows Grain + Apples for feed)
    ↓
Rancher (breeds Horses — takes real-time DAYS)
    ↓
Stable Master (trains Horse → War Horse — takes real-time days, requires Lvl 40+)
    ↓
Tanner (tans Leather → Hard Leather)
    ↓
Leatherworker (crafts Hard Leather → Saddle)
    ↓
Blacksmith (forges Iron Ingots → Horseshoes + Horse Armor)
    ↓
[Assembly] Stable Master equips War Horse with Saddle + Horseshoes + Horse Armor
          → Armored War Horse (combat mount with charge ability)
```
**Players involved: 6 different professions**

---

## 📈 PROFESSION LEVELING SYSTEM

### How Leveling Works
- Every action gives Profession XP (not character XP — these are separate)
- Higher level = access to better recipes, higher quality results, faster work
- Quality system on everything crafted (like the d20 roll but profession-modified)

### Level Tiers & Unlocks
| Level Range | Tier | What Unlocks |
|------------|------|-------------|
| 1–10 | **Apprentice** | Basic recipes, common materials, slow work speed |
| 11–25 | **Journeyman** | Intermediate recipes, uncommon materials, normal speed |
| 26–50 | **Craftsman** | Advanced recipes, rare materials, faster speed, quality bonus |
| 51–75 | **Expert** | Expert recipes, exotic materials, much faster, higher quality |
| 76–90 | **Master** | Master recipes, legendary materials, can teach apprentices |
| 91–100 | **Grandmaster** | Legendary recipes, unique items, title + cosmetic rewards, can create custom recipes |

### Quality Roll System
When crafting, the game rolls:
```
Quality Score = d20 + (Profession Level / 5) + Tool Bonus + Workshop Bonus

1–5:   Poor Quality      (reduced stats, ugly appearance)
6–10:  Common Quality    (base stats)
11–15: Fine Quality      (slightly better stats, nicer look)
16–20: Superior Quality  (noticeably better stats)
21–25: Masterwork        (excellent stats, unique appearance)
26+:   Legendary         (best possible stats, glowing effects, named item)
```

A Level 1 Blacksmith can only make Poor–Common items.
A Level 100 Grandmaster Blacksmith regularly produces Masterwork and occasionally Legendary.

### Profession Limits
- A single character can have **1 Gathering profession + 1 Crafting profession + 1 Service profession**
- OR **2 Gathering + 1 Crafting** (no service)
- OR **1 Gathering + 2 Crafting** (no service)
- Maximum of **3 professions** per character
- This FORCES player interdependence — you literally cannot do everything yourself

---

## 💰 ECONOMIC MECHANICS

### Supply & Demand
- No NPC vendors sell crafted goods (only very basic supplies like empty vials, basic tools)
- All real gear, potions, food, building materials = player crafted
- Prices set entirely by players on the marketplace
- Towns with mines near them will have cheaper ore; towns far from mines will pay more
- This creates natural **trade routes** — buy cheap in the source town, sell high elsewhere

### Resource Scarcity by Region
| Town Type | Abundant Resources | Scarce Resources |
|-----------|-------------------|-----------------|
| Mountain Town | Ore, Stone, Gems, Coal | Wood, Food, Herbs |
| Forest Town | Wood, Herbs, Leather, Game | Ore, Stone, Fish |
| Plains Town | Grain, Cotton, Livestock, Horses | Ore, Wood, Fish |
| Coastal Town | Fish, Pearls, Shellfish, Salt | Ore, Livestock, Herbs |
| Swamp Town | Rare Herbs, Reagents, Mushrooms, Exotic Leather | Grain, Ore, Clean Water |
| Desert Town | Gems, Exotic Spices, Sandstone, Glass (sand) | Wood, Water, Most Food |

### Trade Caravans
- Merchants can hire a caravan (costs gold, requires goods to transport)
- Caravans travel in real-time between towns
- Risk: caravans can be raided by bandits (PvE) or enemy kingdom players (PvP)
- Hire mercenary escorts for protection
- Profit margins = price difference between towns minus transport cost and risk

### Taxes & Town Economy
- Town mayor sets tax rate (5–25%) on all marketplace transactions
- Tax revenue goes to **Town Treasury**
- Treasury funds: building construction, town guards, road maintenance, public projects
- A well-managed town attracts more players → more economic activity → more tax revenue
- A poorly managed town loses players → economy dies → town declines

### Item Durability & Consumption
**THIS IS CRITICAL FOR A HEALTHY ECONOMY**
- Weapons and armor **degrade with use** and eventually break
- Players need to buy replacements or pay a Blacksmith/Armorer for repairs
- Food and potions are **consumed** (single use)
- Arrows/bolts are consumed in combat
- Building materials are consumed in construction
- This creates **constant demand** — the economy never stagnates

### Item Decay Rates
| Item Type | Durability | Typical Lifespan |
|-----------|-----------|-----------------|
| Weapons | 100 uses | ~2-3 weeks of regular play |
| Armor | 150 uses | ~3-4 weeks of regular play |
| Tools (gathering) | 50 uses | ~1 week of regular play |
| Food | Single use | Consumed on eat |
| Potions | Single use | Consumed on use |
| Arrows/Ammo | Single use | Consumed per shot |
| Buildings | Decay over time | Require maintenance materials monthly |
| Mounts | Need feeding daily | Starving mount = stat penalties, eventual loss |

Higher quality items have MORE durability:
- Poor: 60% durability
- Common: 100% durability  
- Fine: 130% durability
- Superior: 160% durability
- Masterwork: 200% durability
- Legendary: 300% durability + can be repaired indefinitely

---

## 🏗️ BUILDINGS & WORKSHOPS

Players work faster and produce higher quality when using proper workshops.

| Building | Built By | Used By | Bonus |
|----------|---------|---------|-------|
| Farm | Mayor/Player | Farmers | +yield, grow more crop types |
| Ranch | Mayor/Player | Ranchers | +animal capacity, breeding speed |
| Mine | Mayor | Miners | +yield, access deeper veins |
| Lumber Mill | Mayor/Player | Lumberjacks | +yield, process logs faster |
| Smithy | Mayor/Player | Blacksmiths, Armorers | +quality bonus, advanced recipes |
| Smeltery | Mayor/Player | Smelters | +speed, higher purity metals |
| Tannery | Mayor/Player | Tanners | +speed, +quality |
| Tailor Shop | Mayor/Player | Tailors | +speed, +quality, dye options |
| Alchemy Lab | Mayor/Player | Alchemists | +potency, rare recipe access |
| Enchanting Tower | Mayor | Enchanters | Required for enchanting, +power |
| Kitchen/Bakery | Mayor/Player | Cooks | +buff duration, advanced recipes |
| Brewery | Mayor/Player | Brewers | +batch size, rare recipes |
| Jeweler's Workshop | Mayor/Player | Jewelers | +quality, gem cutting precision |
| Fletcher's Bench | Player | Fletchers | +speed, special ammo types |
| Scribe's Study | Player | Scribes | +scroll power, map accuracy |
| Stable | Mayor/Player | Stable Masters | Horse capacity, training speed |
| Warehouse | Mayor | Merchants | Bulk storage, trade caravan launch |
| Bank | Mayor | Bankers | Secure storage, loan management |
| Inn/Tavern | Player | Innkeepers | Rest buffs, social hub, room rental |

### Building Levels
Buildings can be upgraded (Level 1–5):
- Level 1: Basic functionality
- Level 2: +20% speed, slight quality bonus
- Level 3: +40% speed, moderate quality bonus, new recipes
- Level 4: +60% speed, large quality bonus, rare recipes
- Level 5: +80% speed, maximum quality, legendary recipes, unique building appearance

Upgrading requires materials (from players!) + gold from treasury + real time.

---

## 🔄 DAILY ECONOMIC LOOP (Example Player Day)

### "A Day in the Life of a Blacksmith"

**Morning (real-time: log in for 5 min)**
1. Check marketplace for Iron Ingots — buy 20 from a Smelter at 5g each (100g spent)
2. Check for Hardwood — buy 10 from a Lumberjack at 3g each (30g spent)
3. Check for Soft Leather — buy 5 from a Tanner at 8g each (40g spent)
4. Start crafting: queue up 5 Iron Swords (takes 2 real hours each)

**Afternoon (come back, 5 min)**
5. Collect 5 Iron Swords from the forge
6. Quality results: 1 Poor, 2 Common, 1 Fine, 1 Superior
7. Scrap the Poor one (get back some materials)
8. List on marketplace: Common @ 80g, Fine @ 120g, Superior @ 200g
9. Start next batch — maybe Iron Shields this time

**Evening (come back, 5 min)**
10. Check sales — 2 swords sold! 
11. Collect gold (minus 10% town tax)
12. Check if anyone's selling cheap ore — stock up for tomorrow
13. Spend 30 min doing some combat quests with the gear you kept for yourself

**Total active play: ~15-20 minutes across the day**
**Gold flow: Spent 170g on materials → Sold goods for ~360g → Profit: ~190g minus tax**

THIS is the kind of gameplay loop that keeps players coming back daily.

---

## 🎯 WHY THIS WORKS

1. **No one is self-sufficient** — 3 profession limit means you NEED other players
2. **Geography matters** — resource scarcity creates real trade routes
3. **Items break** — constant demand keeps crafters employed forever
4. **Quality matters** — high-level crafters command premium prices
5. **Politics affect economy** — tax rates, trade laws, wars all impact prices
6. **Real-time pacing** — can't rush, creates natural daily engagement rhythm
7. **Every profession feeds into others** — removing any one profession collapses the chain
8. **Player-set prices** — true supply and demand, no artificial price floors

---

## 📋 FULL RECIPE DATABASE (Sample — Blacksmith)

### Apprentice (Lvl 1–10)
| Recipe | Ingredients | Craft Time | Min Level |
|--------|-----------|------------|-----------|
| Copper Dagger | 2 Copper Ingots + 1 Softwood | 30 min | 1 |
| Copper Sword | 3 Copper Ingots + 1 Softwood + 1 Soft Leather | 1 hr | 3 |
| Copper Axe | 4 Copper Ingots + 2 Softwood | 1 hr | 5 |
| Copper Mace | 3 Copper Ingots + 1 Softwood | 45 min | 4 |
| Nails (x50) | 1 Copper Ingot | 15 min | 5 |
| Horseshoes | 2 Iron Ingots | 30 min | 8 |

### Journeyman (Lvl 11–25)
| Recipe | Ingredients | Craft Time | Min Level |
|--------|-----------|------------|-----------|
| Iron Sword | 3 Iron Ingots + 1 Hardwood + 1 Soft Leather | 2 hr | 11 |
| Iron Battleaxe | 5 Iron Ingots + 2 Hardwood + 1 Soft Leather | 2.5 hr | 15 |
| Iron Warhammer | 4 Iron Ingots + 2 Hardwood | 2 hr | 13 |
| Iron Shield Frame | 3 Iron Ingots + 2 Hardwood + 1 Hard Leather | 2 hr | 18 |
| Steel Dagger | 2 Steel Ingots + 1 Hardwood + 1 Soft Leather | 1.5 hr | 22 |

### Craftsman (Lvl 26–50)
| Recipe | Ingredients | Craft Time | Min Level |
|--------|-----------|------------|-----------|
| Steel Longsword | 4 Steel Ingots + 1 Exotic Wood + 1 Hard Leather | 3 hr | 26 |
| Steel Greatsword | 7 Steel Ingots + 2 Exotic Wood + 2 Hard Leather | 4 hr | 35 |
| Steel Halberd | 5 Steel Ingots + 3 Hardwood + 1 Hard Leather | 3.5 hr | 30 |
| Mithril Dagger | 2 Mithril Ingots + 1 Exotic Wood + 1 Soft Leather | 2 hr | 45 |

### Expert (Lvl 51–75)
| Recipe | Ingredients | Craft Time | Min Level |
|--------|-----------|------------|-----------|
| Mithril Longsword | 5 Mithril Ingots + 1 Exotic Wood + 1 Hard Leather + 1 Gem | 5 hr | 55 |
| Adamantine Axe | 6 Adamantine Ingots + 2 Exotic Wood + 2 Hard Leather | 6 hr | 65 |
| Dwarven Warblade | 8 Steel Ingots + 3 Mithril Ingots + Exotic Wood + Gem | 7 hr | 70 |

### Master (Lvl 76–90)
| Recipe | Ingredients | Craft Time | Min Level |
|--------|-----------|------------|-----------|
| Dragonbone Greatsword | 5 Adamantine Ingots + 3 Dragon Bone + Exotic Wood + Rare Gem | 10 hr | 80 |
| Phoenix Blade | 4 Mithril Ingots + Phoenix Feather + Fire Ruby + Arcane Reagent x5 | 12 hr | 85 |

### Grandmaster (Lvl 91–100)
| Recipe | Ingredients | Craft Time | Min Level |
|--------|-----------|------------|-----------|
| Legendary Custom Weapon | Grandmasters can design ONE unique recipe using any materials | 24 hr | 95 |
| World Boss Weapon | Rare drop materials from world bosses + 10 Adamantine + 5 Rare Gems | 48 hr | 100 |

---

## 🚀 EXPANSION IDEAS (Future Phases)

- **Farming Seasons** — crops only grow in certain seasons, creating seasonal price swings
- **Weather Effects** — storms slow fishing, droughts reduce farming, snow blocks mountain passes
- **Black Market** — smuggling system for tax-free trade (risky, illegal)
- **Economic Advisors** — service profession that analyzes price trends for clients
- **Auction House** — timed bidding for rare items alongside the fixed-price marketplace
- **Crafting Guilds** — profession-specific guilds with shared recipes and bonuses
- **Apprenticeship System** — Masters can take Apprentices, both get XP bonuses
- **Custom Item Naming** — Masterwork+ items can be named by the crafter ("Gundrik's Fury")
- **Maker's Mark** — every crafted item shows who made it (reputation system)
- **Economic Crises** — random events (plague kills livestock, mine collapse, drought)
