# Magical Crafting Components & Monster Sources — Phase 2 Encounter Design

**Generated:** 2026-02-20
**Basis:** `profession-economy-master.yaml`, `encounter-loot-design-phase1.md`, `profession-economy-audit-v4.md`
**Scope:** 18 magical components, 12 new monsters, recipe integration for ENCHANTER (9 existing + 4 new) and SCRIBE (7 existing + 4 new)

---

## Section 1: Magical Component Catalog

### Design Logic

Every component follows three rules:
1. **Name telegraphs effect** — a player can guess the enchantment from the ingredient
2. **Monster-only source** — no gathering profession collects these; fighters supply crafters
3. **Difficulty = rarity** — harder monsters drop components for more powerful enchantments

Components are priced so they represent **20-40% of total recipe input cost** for the recipes that use them. ENCHANTER recipes use 2-3× of a component (permanent enchantments need more essence). SCRIBE recipes use 1× (single-use scrolls need less).

---

### 1A. Elemental School (Fire, Ice, Lightning, Earth)

| # | Component | Description | Property | Source Monster | Drop % | Qty | Base Value | Used By |
|:-:|-----------|-------------|----------|---------------|:------:|:---:|----------:|---------|
| 1 | **Ember Core** | A fist-sized sphere of solidified flame, warm to the touch and faintly glowing. Harvested from the chest cavity of slain fire elementals. | Fire | Fire Elemental | 15% | 1 | 15g | Both |
| 2 | **Frost Essence** | A crystalline shard of pure cold, perpetually rimmed in ice. Condenses from the remains of destroyed ice wraiths. | Ice | Ice Wraith | 20% | 1 | 15g | Both |
| 3 | **Storm Feather** | An iridescent feather that crackles with static. Plucked from the wings of storm hawks after they fall. | Lightning | Storm Hawk | 20% | 1 | 15g | Both |
| 4 | **Earth Crystal** | A dense, geometric crystal that hums when struck. Found in the rubble of shattered stone golems. | Earth | Stone Golem | 20% | 1 | 12g | Both |

**Recipes served:**
- Ember Core → Flaming Enchantment (ENCH), Scroll of Fire (SCRIBE)
- Frost Essence → Frost Enchantment (ENCH), Scroll of Ice (SCRIBE)
- Storm Feather → Lightning Enchantment (ENCH), Scroll of Lightning (SCRIBE)
- Earth Crystal → *NEW* Earthen Enchantment (ENCH), *NEW* Scroll of Stone Skin (SCRIBE)

---

### 1B. Life School (Healing, Regeneration, Vitality)

| # | Component | Description | Property | Source Monster | Drop % | Qty | Base Value | Used By |
|:-:|-----------|-------------|----------|---------------|:------:|:---:|----------:|---------|
| 5 | **Troll Blood** | Thick, dark-green ichor that writhes and tries to congeal. Must be bottled quickly before it regenerates back toward the corpse. | Regeneration | Troll | 18% | 1 | 15g | Both |
| 6 | **Fey Tear** | A single luminous droplet, cool as spring water, that falls from a corrupted dryad's eyes upon death. Radiates gentle warmth. | Holy/Healing | Corrupted Dryad | 10% | 1 | 35g | Both |
| 7 | **Heartwood Sap** | Amber-gold sap that seeps from treant heartwood. Smells of deep forest and old growth. Sticky, warm, faintly alive. | Vitality | Treant | 15% | 1 | 10g | Both |

**Recipes served:**
- Troll Blood → Scroll of Healing (SCRIBE), *NEW* Scroll of Restoration (SCRIBE)
- Fey Tear → Holy Enchantment (ENCH), *NEW* Scroll of Restoration (SCRIBE)
- Heartwood Sap → *NEW* Nature's Ward Enchantment (ENCH), *NEW* Vitality Enchantment (ENCH)

---

### 1C. Protection School (Shielding, Resistance, Warding)

| # | Component | Description | Property | Source Monster | Drop % | Qty | Base Value | Used By |
|:-:|-----------|-------------|----------|---------------|:------:|:---:|----------:|---------|
| 8 | **Basilisk Scale** | A thick, stone-grey scale with a pearlescent sheen. Unnervingly heavy for its size. Retains the creature's petrifying resilience. | Fortification | Basilisk | 12% | 1 | 25g | ENCHANTER |
| 9 | **Wyvern Scale** | A broad, iridescent scale from the underbelly of a wyvern. Tough as steel, light as leather. The gold standard of protective components. | Warding | Wyvern | 10% | 1 | 45g | ENCHANTER |

**Recipes served:**
- Basilisk Scale → Fortified Enchantment (ENCH), Warding Enchantment (ENCH)
- Wyvern Scale → Warding Enchantment (ENCH, alternate high-tier input)

---

### 1D. Enhancement School (Strength, Speed, Perception)

| # | Component | Description | Property | Source Monster | Drop % | Qty | Base Value | Used By |
|:-:|-----------|-------------|----------|---------------|:------:|:---:|----------:|---------|
| 10 | **Ogre Sinew** | A thick, fibrous tendon strip from an ogre's arm. Impossibly strong — a single strand can support a man's weight. | Strength | Ogre | 18% | 1 | 12g | Both |
| 11 | **Wind Mote** | A captured wisp of living wind, bottled from the updraft left by a storm hawk's death spiral. Trembles and tries to escape its container. | Speed | Storm Hawk | 15% | 1 | 12g | ENCHANTER |
| 12 | **Basilisk Eye** | The petrifying eye of a basilisk, carefully extracted and preserved in oil. Still seems to watch you. | Perception | Basilisk | 8% | 1 | 20g | Both |

**Recipes served:**
- Ogre Sinew → Swift Enchantment (ENCH), *NEW* Scroll of Might (SCRIBE)
- Wind Mote → Swift Enchantment (ENCH)
- Basilisk Eye → *NEW* True Sight Enchantment (ENCH), *NEW* Scroll of True Sight (SCRIBE)

---

### 1E. Shadow & Arcane School (Stealth, Illusion, Raw Magic)

| # | Component | Description | Property | Source Monster | Drop % | Qty | Base Value | Used By |
|:-:|-----------|-------------|----------|---------------|:------:|:---:|----------:|---------|
| 13 | **Shadow Essence** | A vial of liquid darkness that absorbs light around it. Extracted from the dissipating form of a slain shadow stalker. | Shadow/Stealth | Shadow Stalker | 12% | 1 | 30g | ENCHANTER |
| 14 | **Wisp Mote** | A faintly glowing orb no larger than a marble. Captured from the remnants of a will-o'-wisp. Flickers between visible and invisible. | Illusion/Arcane | Will-o'-Wisp | 25% | 1 | 8g | SCRIBE |
| 15 | **Spectral Dust** | Fine, silvery powder that shimmers with faint ghostly light. Scraped from the armor of a destroyed grave wight. | Divination | Grave Wight | 20% | 1 | 10g | SCRIBE |

**Recipes served:**
- Shadow Essence → Shadow Enchantment (ENCH)
- Wisp Mote → Identification Scroll (SCRIBE), Dungeon Map (SCRIBE)
- Spectral Dust → Identification Scroll (SCRIBE), Dungeon Map (SCRIBE)

---

### 1F. Nature School (Growth, Plant, Animal)

| # | Component | Description | Property | Source Monster | Drop % | Qty | Base Value | Used By |
|:-:|-----------|-------------|----------|---------------|:------:|:---:|----------:|---------|
| 16 | **Living Bark** | A section of bark that still pulses with green energy. Slowly tries to grow roots if left on soil. | Nature/Shield | Treant | 20% | 1-2 | 8g | Both |
| 17 | **Dryad Blossom** | A dark flower with petals that shift between purple and green. Beautiful but unsettling — smells of wildflowers and decay. | Nature/Growth | Corrupted Dryad | 15% | 1 | 15g | SCRIBE |

**Recipes served:**
- Living Bark → Fortified Enchantment (ENCH, low-tier alt), *NEW* Nature's Ward Enchantment (ENCH), *NEW* Scroll of Entangle (SCRIBE)
- Dryad Blossom → *NEW* Scroll of Entangle (SCRIBE)

---

### 1G. Phase 1 Material Promotion

| # | Component | Description | Property | Source Monster | Drop % | Qty | Base Value | Used By |
|:-:|-----------|-------------|----------|---------------|:------:|:---:|----------:|---------|
| 18 | **Spider Venom** *(existing)* | Already drops from Giant Spider (Phase 1). Viscous green liquid with paralytic properties. Currently ALCHEMIST-only. | Poison | Giant Spider | 12% | 1 | 12g | ENCH + ALCH |

Spider Venom is promoted from mundane ALCHEMIST ingredient to dual-use: ALCHEMIST (poisons/antidotes) + ENCHANTER (Poisoned Enchantment). No changes to Giant Spider's loot table needed — just expanding which professions consume it.

---

### Component Summary Table

| # | Component | School | Base Value | Source | Threat | ENCH | SCRIBE | Existing Recipe | New Recipe |
|:-:|-----------|--------|----------:|--------|:------:|:----:|:------:|:-:|:-:|
| 1 | Ember Core | Elemental | 15g | Fire Elemental | High | Yes | Yes | Flaming, Scroll of Fire | — |
| 2 | Frost Essence | Elemental | 15g | Ice Wraith | Medium | Yes | Yes | Frost, Scroll of Ice | — |
| 3 | Storm Feather | Elemental | 15g | Storm Hawk | Low | Yes | Yes | Lightning, Scroll of Lightning | — |
| 4 | Earth Crystal | Elemental | 12g | Stone Golem | Medium | Yes | Yes | — | Earthen Ench., Scroll of Stone Skin |
| 5 | Troll Blood | Life | 15g | Troll | Medium | — | Yes | Scroll of Healing | Scroll of Restoration |
| 6 | Fey Tear | Life | 35g | Corrupted Dryad | High | Yes | Yes | Holy Ench. | Scroll of Restoration |
| 7 | Heartwood Sap | Life | 10g | Treant | Medium | Yes | — | — | Vitality Ench. |
| 8 | Basilisk Scale | Protection | 25g | Basilisk | High | Yes | — | Fortified, Warding | — |
| 9 | Wyvern Scale | Protection | 45g | Wyvern | Elite | Yes | — | Warding (alt) | — |
| 10 | Ogre Sinew | Enhancement | 12g | Ogre | Medium | Yes | Yes | Swift Ench. | Scroll of Might |
| 11 | Wind Mote | Enhancement | 12g | Storm Hawk | Low | Yes | — | Swift Ench. | — |
| 12 | Basilisk Eye | Enhancement | 20g | Basilisk | High | Yes | Yes | — | True Sight Ench., Scroll of True Sight |
| 13 | Shadow Essence | Shadow | 30g | Shadow Stalker | High | Yes | — | Shadow Ench. | — |
| 14 | Wisp Mote | Arcane | 8g | Will-o'-Wisp | Low | — | Yes | ID Scroll, Dungeon Map | — |
| 15 | Spectral Dust | Arcane | 10g | Grave Wight | Medium | — | Yes | ID Scroll, Dungeon Map | — |
| 16 | Living Bark | Nature | 8g | Treant | Medium | Yes | Yes | Fortified (alt) | Nature's Ward, Scroll of Entangle |
| 17 | Dryad Blossom | Nature | 15g | Corrupted Dryad | High | — | Yes | — | Scroll of Entangle |
| 18 | Spider Venom | Poison | 12g | Giant Spider | Low | Yes | — | Poisoned Ench. | — |

**Totals:** 18 components. 12 used by ENCHANTER, 11 used by SCRIBE, 5 shared. Every component has at least one recipe.

---

## Section 2: New Monster Roster

### Threat Level Key

| Threat | Party Size | Typical Level Range | Component Value |
|--------|:----------:|:-------------------:|:-:|
| **Low** | Solo player | L6-8 | 8-15g (cheap, accessible) |
| **Medium** | 2-3 players | L9-11 | 10-25g (moderate) |
| **High** | 4-5 players | L12-14 | 20-45g (expensive, scarce) |
| **Elite** | Organized group | L15+ | 45g+ (rare, premium) |

---

### Monster 1: Storm Hawk

| Field | Value |
|-------|-------|
| **Type** | Beast (Elemental) |
| **Level** | 6 |
| **Threat** | Low |
| **Description** | Large raptors infused with storm energy, nesting on mountain peaks and coastal cliffs. Their feathers crackle with static, and they dive-bomb prey with lightning speed. Territorial but avoidable — they attack only those who enter their nesting grounds. |
| **Where** | Mountain, Coastal cliffs — Frozen Reaches, Skypeak, Suncoast |
| **Conditions** | More active during storms; common during day |
| **Frequency** | Common |
| **Pack** | Solo or Pair |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Storm Feather | 20% | 1 | 15g | ENCHANTER, SCRIBE |
| Wind Mote | 15% | 1 | 12g | ENCHANTER |
| Wild Game Meat | 10% | 1 | 5g | COOK |

**Expected value per kill:** 0.20×15 + 0.15×12 + 0.10×5 = **5.30g**

---

### Monster 2: Will-o'-Wisp

| Field | Value |
|-------|-------|
| **Type** | Fey |
| **Level** | 7 |
| **Threat** | Low |
| **Description** | Eerie floating lights that drift through marshes and dark forests, luring travelers off safe paths. Insubstantial and hard to hit — they deal lightning damage on touch but have very low HP. More nuisance than menace when alone. |
| **Where** | Swamp, Deep forest — Shadowmere, Glimmerveil, Thornwilds |
| **Conditions** | **Night only.** Disappear at dawn. |
| **Frequency** | Uncommon |
| **Pack** | Solo (occasionally clusters of 2-3) |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Wisp Mote | 25% | 1 | 8g | SCRIBE |
| Gold coins | 30% | 1-3g | — | — |

**Expected value per kill:** 0.25×8 + 0.30×2 = **2.60g**

*Note: Will-o'-Wisps are ethereal — no pelts, meat, or physical drops. The mote IS the creature's remains.*

---

### Monster 3: Treant

| Field | Value |
|-------|-------|
| **Type** | Plant |
| **Level** | 8 |
| **Threat** | Medium |
| **Description** | Ancient trees awakened by old magic. Slow but incredibly tough, with bark like stone and branches that swing like clubs. Generally dormant — they only attack those who damage the forest (lumberjacks beware). |
| **Where** | Deep forest — Silverwood, Mistwood, Thornwilds |
| **Conditions** | Forest only; more common near groves and old-growth areas |
| **Frequency** | Uncommon |
| **Pack** | Solo |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Living Bark | 20% | 1-2 | 8g | ENCHANTER, SCRIBE |
| Heartwood Sap | 15% | 1 | 10g | ENCHANTER |
| Wood Logs | 30% | 2-4 | 5g | WOODWORKER |
| Hardwood | 10% | 1 | 25g | WOODWORKER |

**Expected value per kill:** 0.20×12 + 0.15×10 + 0.30×15 + 0.10×25 = **11.90g**

---

### Monster 4: Ogre

| Field | Value |
|-------|-------|
| **Type** | Giant |
| **Level** | 9 |
| **Threat** | Medium |
| **Description** | Massive, dim-witted brutes who live in caves and under bridges. Enormously strong — a single blow can crush a man in armor. They hoard stolen goods and eat anything they catch. Lazy but aggressive when disturbed. |
| **Where** | Hills, Caves, under bridges — Ashenfang, Scarred Frontier, Ironvault foothills |
| **Conditions** | Any terrain with caves; often near roads (ambush predators) |
| **Frequency** | Uncommon |
| **Pack** | Solo or Pair |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Ogre Sinew | 18% | 1 | 12g | ENCHANTER, SCRIBE |
| Gold coins | 50% | 3-10g | — | — |
| Animal Pelts | 15% | 1 | 8g | TANNER |
| Wild Game Meat | 10% | 1-2 | 5g | COOK |

**Expected value per kill:** 0.18×12 + 0.50×6.5 + 0.15×8 + 0.10×7.5 = **7.41g** + 3.25g gold

---

### Monster 5: Stone Golem

| Field | Value |
|-------|-------|
| **Type** | Construct |
| **Level** | 10 |
| **Threat** | Medium |
| **Description** | Ancient guardians of long-abandoned ruins and dwarven vaults. Animated stone given purpose by residual enchantment. Immune to poison and mental effects. Hits like a landslide but moves slowly. They don't pursue — flee and they stop. |
| **Where** | Ruins, Mountains, Dwarven ruins — Ironvault, Ashenmoor, Vel'Naris outskirts |
| **Conditions** | Underground/ruins only; guard specific locations |
| **Frequency** | Rare |
| **Pack** | Solo |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Earth Crystal | 20% | 1 | 12g | ENCHANTER, SCRIBE |
| Stone Blocks | 30% | 2-3 | 7g | MASON |
| Iron Ore | 15% | 1-2 | 6g | SMELTER |

**Expected value per kill:** 0.20×12 + 0.30×17.5 + 0.15×9 = **9.00g**

*Note: Constructs carry no gold, meat, or organic material. They crumble into stone and metal.*

---

### Monster 6: Troll

| Field | Value |
|-------|-------|
| **Type** | Giant |
| **Level** | 10 |
| **Threat** | Medium |
| **Description** | Lanky, green-skinned regenerators that haunt swamps and caves. Wounds close before your eyes — must be killed with fire or acid to prevent regeneration. Vicious hunters who eat anything, including each other. |
| **Where** | Swamp, Caves — Shadowmere, Ashenfang, Scarred Frontier |
| **Conditions** | Prefers dark, damp environments; wanders at night |
| **Frequency** | Uncommon |
| **Pack** | Solo (rarely pair) |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Troll Blood | 18% | 1 | 15g | SCRIBE |
| Animal Pelts | 20% | 1 | 8g | TANNER |
| Wild Game Meat | 15% | 1-2 | 5g | COOK |
| Gold coins | 30% | 2-5g | — | — |

**Expected value per kill:** 0.18×15 + 0.20×8 + 0.15×7.5 + 0.30×3.5 = **6.98g** + 1.05g gold

---

### Monster 7: Ice Wraith

| Field | Value |
|-------|-------|
| **Type** | Undead (Elemental) |
| **Level** | 10 |
| **Threat** | Medium |
| **Description** | Spectral forms of those who froze to death in the tundra, now animate with bitter cold. They drain warmth from the living — proximity alone causes frostbite. Incorporeal, so physical attacks are less effective without enchanted weapons. |
| **Where** | Tundra, Frozen caves — Frozen Reaches, Skypeak, Ironvault (high elevations) |
| **Conditions** | Winter/cold biomes; more common at night |
| **Frequency** | Uncommon |
| **Pack** | Solo or Pair |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Frost Essence | 20% | 1 | 15g | ENCHANTER, SCRIBE |
| Bone Fragments | 25% | 1-2 | 4g | JEWELER, FLETCHER |
| Gold coins | 20% | 1-4g | — | — |

**Expected value per kill:** 0.20×15 + 0.25×6 + 0.20×2.5 = **5.00g**

---

### Monster 8: Grave Wight

| Field | Value |
|-------|-------|
| **Type** | Undead |
| **Level** | 11 |
| **Threat** | Medium |
| **Description** | Intelligent undead — former warriors or nobles who refused death. They retain combat skill and carry ancient equipment. Command lesser undead (skeletons, zombies). The most dangerous common undead — they think, plan, and ambush. |
| **Where** | Ruins, Graveyards, Ancient battlefields — Ashenmoor, Shadowmere, old Heartlands ruins |
| **Conditions** | Night preferred; can appear day in underground tombs |
| **Frequency** | Uncommon |
| **Pack** | Solo (often with 2-3 Skeleton Warriors as minions) |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Spectral Dust | 20% | 1 | 10g | SCRIBE |
| Bone Fragments | 20% | 1-2 | 4g | JEWELER, FLETCHER |
| Gold coins | 50% | 3-8g | — | — |
| Rusted Iron | 10% | 1 | 6g | SMELTER (as Iron Ore) |

**Expected value per kill:** 0.20×10 + 0.20×6 + 0.50×5.5 + 0.10×6 = **6.55g** + 2.75g gold

---

### Monster 9: Fire Elemental

| Field | Value |
|-------|-------|
| **Type** | Elemental |
| **Level** | 12 |
| **Threat** | High |
| **Description** | A living column of flame summoned by residual volcanic magic. Burns everything it touches. Immune to fire, vulnerable to ice and water. The area around a fire elemental becomes scorched earth — follow the burn marks to find one. |
| **Where** | Volcanic, Ashenfang wastes, near hot springs — Ashenfang, The Confluence (Emberheart) |
| **Conditions** | Volcanic/hot areas only; active during day |
| **Frequency** | Rare |
| **Pack** | Solo |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Ember Core | 15% | 1 | 15g | ENCHANTER, SCRIBE |
| Coal | 30% | 2-3 | 12g | SMELTER, BLACKSMITH |
| Gold coins | 20% | 2-5g | — | — |

**Expected value per kill:** 0.15×15 + 0.30×30 + 0.20×3.5 = **11.95g**

*Note: Fire Elementals leave no organic material. Coal is crystallized from their cooling remains.*

---

### Monster 10: Basilisk

| Field | Value |
|-------|-------|
| **Type** | Beast (Magical) |
| **Level** | 13 |
| **Threat** | High |
| **Description** | An eight-legged reptile with a petrifying gaze. Approach wrong and you become a statue before you draw your sword. Experienced hunters use mirrors or approach from behind. Their scales are prized for protective enchantments, their eyes for divination. |
| **Where** | Caves, Underground passages — Vel'Naris outskirts, Ironvault deep, Ashenfang caves |
| **Conditions** | Underground/caves only; guard their lair |
| **Frequency** | Rare |
| **Pack** | Solo (territorial — only one per cave system) |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Basilisk Scale | 12% | 1 | 25g | ENCHANTER |
| Basilisk Eye | 8% | 1 | 20g | ENCHANTER, SCRIBE |
| Animal Pelts | 20% | 1-2 | 8g | TANNER |

**Expected value per kill:** 0.12×25 + 0.08×20 + 0.20×12 = **7.00g**

*Low expected value despite high difficulty — the valuable drops (Scale, Eye) are rare. This is intentional: basilisks are dangerous enough that you fight them for the big payoff, not the average payoff.*

---

### Monster 11: Corrupted Dryad

| Field | Value |
|-------|-------|
| **Type** | Fey |
| **Level** | 13 |
| **Threat** | High |
| **Description** | A dryad whose grove was destroyed or poisoned, now twisted by grief into a predator. Uses entangling vines, poison thorns, and nature magic offensively. Hauntingly beautiful and deeply hostile. The most tragic of Phase 2 monsters. |
| **Where** | Corrupted/dead forest groves — Thornwilds, Mistwood edges, Shadowmere forest |
| **Conditions** | Forest only; found at sites of logging or fire damage |
| **Frequency** | Rare |
| **Pack** | Solo |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Fey Tear | 10% | 1 | 35g | ENCHANTER, SCRIBE |
| Dryad Blossom | 15% | 1 | 15g | SCRIBE |
| Wild Herbs | 25% | 1-2 | 5g | COOK, ALCHEMIST |
| Medicinal Herbs | 10% | 1 | 28g | ALCHEMIST |

**Expected value per kill:** 0.10×35 + 0.15×15 + 0.25×7.5 + 0.10×28 = **10.63g**

---

### Monster 12: Shadow Stalker

| Field | Value |
|-------|-------|
| **Type** | Aberration |
| **Level** | 14 |
| **Threat** | High |
| **Description** | A creature of living darkness — vaguely humanoid, with too-long limbs and eyes like cold stars. Phases through walls, strikes from behind, and retreats into shadow. Nearly invisible in the dark. Requires light sources or magical detection to fight effectively. |
| **Where** | Underground, Night surface — Vel'Naris, Ashenmoor, any ruins at night |
| **Conditions** | **Night or underground only.** Cannot exist in direct sunlight. |
| **Frequency** | Rare |
| **Pack** | Solo |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Shadow Essence | 12% | 1 | 30g | ENCHANTER |
| Gold coins | 40% | 5-15g | — | — |

**Expected value per kill:** 0.12×30 + 0.40×10 = **7.60g** (incl. gold)

*Shadow Stalkers leave almost no physical remains. The essence is all that can be harvested.*

---

### Monster 13: Wyvern

| Field | Value |
|-------|-------|
| **Type** | Dragon-kin |
| **Level** | 16 |
| **Threat** | Elite |
| **Description** | A two-legged winged predator — smaller and less intelligent than true dragons, but still deadly. Venomous tail stinger, powerful bite, and devastating dive attacks. Nests on high cliffs and raids livestock from nearby towns. The apex predator of Phase 2. |
| **Where** | Mountain peaks, High cliffs — Frozen Reaches, Skypeak, Ashenfang highlands |
| **Conditions** | Mountain/cliff terrain; guards nest aggressively |
| **Frequency** | Rare |
| **Pack** | Solo |

**Loot Table:**

| Drop | Chance | Qty | Base Value | Consumer |
|------|:------:|:---:|----------:|----------|
| Wyvern Scale | 10% | 1 | 45g | ENCHANTER |
| Animal Pelts | 25% | 1-2 | 8g | TANNER |
| Wild Game Meat | 15% | 1-2 | 5g | COOK |
| Gold coins | 50% | 5-20g | — | — |

**Expected value per kill:** 0.10×45 + 0.25×12 + 0.15×7.5 + 0.50×12.5 = **14.88g** (incl. gold)

---

### Monster Roster Summary

| # | Monster | Level | Threat | Type | Frequency | Biome | Unique Components |
|:-:|---------|:-----:|:------:|------|:---------:|-------|-------------------|
| 1 | Storm Hawk | 6 | Low | Beast | Common | Mountain, Coast | Storm Feather, Wind Mote |
| 2 | Will-o'-Wisp | 7 | Low | Fey | Uncommon | Swamp, Forest (night) | Wisp Mote |
| 3 | Treant | 8 | Medium | Plant | Uncommon | Deep Forest | Living Bark, Heartwood Sap |
| 4 | Ogre | 9 | Medium | Giant | Uncommon | Hills, Caves | Ogre Sinew |
| 5 | Stone Golem | 10 | Medium | Construct | Rare | Ruins, Mountains | Earth Crystal |
| 6 | Troll | 10 | Medium | Giant | Uncommon | Swamp, Caves | Troll Blood |
| 7 | Ice Wraith | 10 | Medium | Undead | Uncommon | Tundra, Frozen caves | Frost Essence |
| 8 | Grave Wight | 11 | Medium | Undead | Uncommon | Ruins, Graveyards | Spectral Dust |
| 9 | Fire Elemental | 12 | High | Elemental | Rare | Volcanic, Ashenfang | Ember Core |
| 10 | Basilisk | 13 | High | Beast | Rare | Caves, Underground | Basilisk Scale, Basilisk Eye |
| 11 | Corrupted Dryad | 13 | High | Fey | Rare | Corrupted Forest | Fey Tear, Dryad Blossom |
| 12 | Shadow Stalker | 14 | High | Aberration | Rare | Underground, Night | Shadow Essence |
| 13 | Wyvern | 16 | Elite | Dragon-kin | Rare | Mountain peaks | Wyvern Scale |

**Combined Phase 1 + Phase 2: 23 monster types total** (10 Phase 1 + 13 Phase 2).

---

## Section 3: Component-to-Recipe Mapping

### 3A. Existing ENCHANTER Recipes — Add Magical Component Inputs

For each recipe, the magical component is added to the EXISTING mundane inputs (Arcane Reagents, Coal, Gemstones, etc. per YAML). The component quantity is set to keep the component at 20-40% of total input cost.

| Recipe | Level | Tier | Output (base_value) | Component Added | Qty | Component Cost | Est. Mundane Cost | Total Input | Component % | Margin Ratio |
|--------|:-----:|------|:-:|:---|:-:|:-:|:-:|:-:|:-:|:-:|
| Fortified | 5 | Apprentice | 80g | Living Bark | 2 | 16g | 38g | 54g | 30% | 1.48× |
| Flaming | 10 | Journeyman | 130g | Ember Core | 2 | 30g | 65g | 95g | 32% | 1.37× |
| Frost | 10 | Journeyman | 130g | Frost Essence | 2 | 30g | 65g | 95g | 32% | 1.37× |
| Lightning | 15 | Journeyman | 175g | Storm Feather | 2 | 30g | 95g | 125g | 24% | 1.40× |
| Swift | 15 | Journeyman | 160g | Ogre Sinew + Wind Mote | 1+1 | 24g | 90g | 114g | 21% | 1.40× |
| Poisoned | 20 | Journeyman | 200g | Spider Venom | 3 | 36g | 110g | 146g | 25% | 1.37× |
| Warding | 20 | Journeyman | 210g | Basilisk Scale | 1 | 25g | 130g | 155g | 16%→ | 1.35× |
| Holy | 30 | Craftsman | 450g | Fey Tear | 2 | 70g | 240g | 310g | 23% | 1.45× |
| Shadow | 30 | Craftsman | 450g | Shadow Essence | 2 | 60g | 245g | 305g | 20% | 1.48× |

**Notes:**
- Warding at 16% is below the 20% target. Acceptable because Basilisk Scale is a High-threat drop — scarcity inflates market price above base_value, so real component % will be higher.
- Spider Venom uses 3× quantity because its 12g base_value is low (Phase 1 pricing). This is intentional — the venom is common, so enchanters need more of it.
- Mundane input estimates based on YAML-listed intermediates (Coal 12g, Arcane Reagents 35g, Gemstones 25g, Iron/Silver Ingots). Exact mundane inputs per recipe TBD in YAML update pass.

---

### 3B. Existing SCRIBE Recipes — Add Magical Component Inputs

SCRIBE uses 1× component per recipe (scrolls are single-use, need less essence than permanent enchantments).

| Recipe | Level | Tier | Output (base_value) | Component Added | Qty | Component Cost | Est. Mundane Cost | Total Input | Component % | Margin Ratio |
|--------|:-----:|------|:-:|:---|:-:|:-:|:-:|:-:|:-:|:-:|
| Area Map | 5 | Apprentice | 20g | *None* | — | 0g | 12g | 12g | 0% | 1.67× |
| Scroll of Fire | 10 | Journeyman | 60g | Ember Core | 1 | 15g | 28g | 43g | 35% | 1.40× |
| Identification Scroll | 10 | Journeyman | 50g | Wisp Mote | 1 | 8g | 28g | 36g | 22% | 1.39× |
| Scroll of Ice | 15 | Journeyman | 80g | Frost Essence | 1 | 15g | 43g | 58g | 26% | 1.38× |
| Scroll of Healing | 20 | Journeyman | 100g | Troll Blood | 1 | 15g | 56g | 71g | 21% | 1.41× |
| Dungeon Map | 20 | Journeyman | 80g | Spectral Dust | 1 | 10g | 48g | 58g | 17%→ | 1.38× |
| Scroll of Lightning | 25 | Journeyman | 120g | Storm Feather | 1 | 15g | 73g | 88g | 17%→ | 1.36× |

**Notes:**
- Area Map stays mundane — it's a simple cartography product, no magic needed.
- Dungeon Map and Scroll of Lightning are slightly below the 20% target (17%). Acceptable — these recipes have significant mundane input costs (parchment, ink, Arcane Reagents).

---

### 3C. New ENCHANTER Recipes (4)

Components that don't map to existing recipes need new recipes. These are Expert-tier ENCHANTER recipes:

**Recipe: Earthen Enchantment Scroll**
```
id: ench-earthen
level: 35
tier: Craftsman
output: Earthen Enchantment Scroll (grants earth resistance to equipment)
base_value: 250g
inputs:
  - 3× Earth Crystal (36g)
  - 1× Iron Ingot (52g)
  - 1× Arcane Reagents (35g)
  - 2× Coal (24g)
total_input: 147g
component_cost: 36g (24%)
margin: 1.70×
crafting_time: 60 min
```

**Recipe: Vitality Enchantment Scroll**
```
id: ench-vitality
level: 35
tier: Craftsman
output: Vitality Enchantment Scroll (grants HP regeneration to equipment)
base_value: 220g
inputs:
  - 2× Heartwood Sap (20g)
  - 1× Troll Blood (15g)
  - 1× Arcane Reagents (35g)
  - 1× Silver Ingot (72g)
total_input: 142g
component_cost: 35g (25%)
margin: 1.55×
crafting_time: 60 min
```

**Recipe: Nature's Ward Enchantment Scroll**
```
id: ench-natures-ward
level: 40
tier: Expert
output: Nature's Ward Enchantment Scroll (grants poison + nature resistance)
base_value: 300g
inputs:
  - 2× Living Bark (16g)
  - 1× Heartwood Sap (10g)
  - 1× Fey Tear (35g)
  - 1× Arcane Reagents (35g)
  - 1× Silver Ingot (72g)
total_input: 168g
component_cost: 61g (36%)
margin: 1.79×
crafting_time: 90 min
```

**Recipe: True Sight Enchantment Scroll**
```
id: ench-true-sight
level: 45
tier: Expert
output: True Sight Enchantment Scroll (grants perception bonus, reveals hidden/invisible)
base_value: 350g
inputs:
  - 2× Basilisk Eye (40g)
  - 1× Gemstones (25g)
  - 1× Arcane Reagents (35g)
  - 1× Silver Ingot (72g)
  - 2× Coal (24g)
total_input: 196g
component_cost: 40g (20%)
margin: 1.79×
crafting_time: 90 min
```

---

### 3D. New SCRIBE Recipes (4)

New Craftsman-tier SCRIBE recipes for remaining components:

**Recipe: Scroll of Stone Skin**
```
id: scribe-scroll-stone-skin
level: 30
tier: Craftsman
output: Scroll of Stone Skin (single-use: +5 AC for 3 combat rounds)
base_value: 90g
inputs:
  - 1× Earth Crystal (12g)
  - 1× Arcane Reagents (35g)
  - 2× Softwood Planks (6g est.)
total_input: 53g
component_cost: 12g (23%)
margin: 1.70×
crafting_time: 45 min
```

**Recipe: Scroll of Might**
```
id: scribe-scroll-might
level: 30
tier: Craftsman
output: Scroll of Might (single-use: +3 STR for 5 combat rounds)
base_value: 85g
inputs:
  - 1× Ogre Sinew (12g)
  - 1× Arcane Reagents (35g)
  - 2× Softwood Planks (6g est.)
total_input: 53g
component_cost: 12g (23%)
margin: 1.60×
crafting_time: 45 min
```

**Recipe: Scroll of Entangle**
```
id: scribe-scroll-entangle
level: 35
tier: Craftsman
output: Scroll of Entangle (single-use: roots target for 2 combat rounds)
base_value: 100g
inputs:
  - 1× Living Bark (8g)
  - 1× Dryad Blossom (15g)
  - 1× Medicinal Herbs (28g)
  - 1× Softwood Planks (3g est.)
total_input: 54g
component_cost: 23g (43%) → slightly over 40% target
margin: 1.85×
crafting_time: 45 min
```

**Recipe: Scroll of Restoration**
```
id: scribe-scroll-restoration
level: 35
tier: Craftsman
output: Scroll of Restoration (single-use: full HP heal + cure poison/disease)
base_value: 130g
inputs:
  - 1× Fey Tear (35g)
  - 1× Troll Blood (15g)
  - 1× Medicinal Herbs (28g)
  - 1× Softwood Planks (3g est.)
total_input: 81g
component_cost: 50g (62%) → over target; acceptable for a premium healing scroll
margin: 1.60×
crafting_time: 60 min
notes: "High component % intentional — this is the strongest healing scroll in the game, requiring two rare magical components. The Fey Tear alone makes it expensive and scarce."
```

---

### 3E. Recipe Impact Summary

| Category | Count | Action |
|----------|:-----:|--------|
| Existing ENCHANTER recipes modified | 9 | Add 1-3 magical component inputs each |
| Existing SCRIBE recipes modified | 6 | Add 1 magical component input each (Area Map unchanged) |
| New ENCHANTER recipes | 4 | Earthen, Vitality, Nature's Ward, True Sight |
| New SCRIBE recipes | 4 | Stone Skin, Might, Entangle, Restoration |
| **Total recipe changes** | **23** | 15 modified + 8 new |

**Input cost increase for existing recipes:**
- ENCHANTER average input cost increase: +25-65g per recipe (component cost)
- SCRIBE average input cost increase: +8-15g per recipe (component cost)
- All existing recipes maintain ≥1.3× margin after component addition — no base_value adjustments needed for existing outputs.

---

## Section 4: Economy Impact

### 4A. Component Supply Modeling

Using the same encounter model as Phase 1 (100 active players, 3 encounters/week each = 300 total encounters/week):

**Phase 2 Encounter Distribution** (these are ADDITIONAL encounters beyond Phase 1's 300/week)

Phase 2 monsters are harder and rarer than Phase 1. Assume Phase 2 encounters make up ~40% of total encounters for players L6+ (roughly half the server):

| Monster | % of Phase 2 Encounters | Encounters/Week (of ~120) |
|---------|:-----------------------:|:-------------------------:|
| Storm Hawk | 15% | 18 |
| Will-o'-Wisp | 10% | 12 |
| Treant | 8% | 10 |
| Ogre | 10% | 12 |
| Stone Golem | 5% | 6 |
| Troll | 10% | 12 |
| Ice Wraith | 10% | 12 |
| Grave Wight | 8% | 10 |
| Fire Elemental | 6% | 7 |
| Basilisk | 5% | 6 |
| Corrupted Dryad | 5% | 6 |
| Shadow Stalker | 5% | 6 |
| Wyvern | 3% | 4 |

### 4B. Weekly Component Supply (Server-Wide)

| Component | Source | Encounters/Wk | Drop % | Qty | Weekly Supply | Base Value | Weekly Market Value |
|-----------|--------|:-------------:|:------:|:---:|:------------:|----------:|-------------------:|
| Storm Feather | Storm Hawk | 18 | 20% | 1 | 3.6 | 15g | 54g |
| Wind Mote | Storm Hawk | 18 | 15% | 1 | 2.7 | 12g | 32g |
| Wisp Mote | Will-o'-Wisp | 12 | 25% | 1 | 3.0 | 8g | 24g |
| Living Bark | Treant | 10 | 20% | 1.5 | 3.0 | 8g | 24g |
| Heartwood Sap | Treant | 10 | 15% | 1 | 1.5 | 10g | 15g |
| Ogre Sinew | Ogre | 12 | 18% | 1 | 2.2 | 12g | 26g |
| Earth Crystal | Stone Golem | 6 | 20% | 1 | 1.2 | 12g | 14g |
| Troll Blood | Troll | 12 | 18% | 1 | 2.2 | 15g | 33g |
| Frost Essence | Ice Wraith | 12 | 20% | 1 | 2.4 | 15g | 36g |
| Spectral Dust | Grave Wight | 10 | 20% | 1 | 2.0 | 10g | 20g |
| Ember Core | Fire Elemental | 7 | 15% | 1 | 1.1 | 15g | 16g |
| Basilisk Scale | Basilisk | 6 | 12% | 1 | 0.7 | 25g | 18g |
| Basilisk Eye | Basilisk | 6 | 8% | 1 | 0.5 | 20g | 10g |
| Fey Tear | Corrupted Dryad | 6 | 10% | 1 | 0.6 | 35g | 21g |
| Dryad Blossom | Corrupted Dryad | 6 | 15% | 1 | 0.9 | 15g | 14g |
| Shadow Essence | Shadow Stalker | 6 | 12% | 1 | 0.7 | 30g | 21g |
| Wyvern Scale | Wyvern | 4 | 10% | 1 | 0.4 | 45g | 18g |
| Spider Venom | Giant Spider (P1) | 24 | 12% | 1 | 2.9 | 12g | 35g |

**Total weekly component supply: ~30 components entering the economy**
**Total weekly component market value: ~431g at base_value (NPC floor)**

### 4C. Component Demand vs. Supply

**ENCHANTER demand** (assuming 5 active ENCHANTERs crafting daily):
- 5 ENCHANTERs × 7 days × 2 avg components per recipe = **70 components/week needed**

**SCRIBE demand** (assuming 5 active SCRIBEs crafting daily):
- 5 SCRIBEs × 7 days × 1 component per recipe = **35 components/week needed**

**Total demand: ~105 components/week** vs **~30 supply/week**

**Supply is constrained. Demand outstrips supply by ~3.5×.** This is intentional and healthy:
- Components will trade above base_value on the player market (supply scarcity drives price up)
- Not every craft uses a magical component (Area Map, some intermediate processing)
- ENCHANTERs/SCRIBEs will mix magical and non-magical recipes
- Realistic demand is probably 40-50/week (not every crafter crafts every day, and they alternate recipes)

**At realistic demand (~45/week) vs supply (~30/week), the deficit is moderate (1.5×).** This means:
- Components are available but not cheap — fighters can reliably sell what they find
- ENCHANTERs/SCRIBEs may need to wait a day or two for specific rare components
- Market prices settle at roughly 1.5-2× base_value (supply/demand equilibrium)

### 4D. Component Cost as % of Recipe Input

At market equilibrium prices (~1.5× base_value):

| Recipe Tier | Component Cost (Market) | Mundane Cost | Total | Component % | Target Range |
|-------------|:-----------------------:|:------------:|:-----:|:-----------:|:------------:|
| Apprentice ENCH | 24g (2× Living Bark) | 38g | 62g | 39% | 20-40% ✓ |
| Journeyman ENCH | 45g (2× Ember Core) | 65g | 110g | 41% | 20-40% ≈ |
| Craftsman ENCH | 105g (2× Fey Tear) | 240g | 345g | 30% | 20-40% ✓ |
| Journeyman SCRIBE | 23g (1× Ember Core) | 28g | 51g | 45% | 20-40% ↑ |
| Craftsman SCRIBE | 53g (1× Fey Tear) | 28g | 81g | 65% | 20-40% ↑↑ |

**Finding:** At market prices, SCRIBE Craftsman recipes exceed the 40% target significantly. This is because SCRIBE mundane inputs (Softwood Planks, herbs) are cheap, so even a single expensive component dominates.

**Recommended adjustment:** For high-tier SCRIBE recipes, increase mundane input requirements (more Arcane Reagents, more parchment/planks) to dilute the component percentage. Alternatively, accept higher component % for SCRIBE as a class identity — SCRIBEs are more dependent on the combat economy than ENCHANTERs, who use expensive metals.

### 4E. Price Sensitivity Analysis

**Scenario: Few Hunters (5 combat players selling components)**
- Supply: ~15 components/week (half the baseline)
- Market price: ~2.5-3× base_value
- ENCHANTER Flaming input cost: Ember Core at 38g × 2 = 76g + 65g mundane = 141g. Output 130g. **Margin negative!**
- **Risk: Low component supply makes some recipes unprofitable.** ENCHANTERs shift to non-magical recipes or wait for cheaper supply.

**Scenario: Many Hunters (20 combat players selling components)**
- Supply: ~60 components/week
- Market price: ~1.0-1.2× base_value (near NPC floor)
- ENCHANTER Flaming: Ember Core at 18g × 2 = 36g + 65g = 101g. Output 130g. Margin: 1.29×. **Tight but positive.**
- All recipes profitable. Components are affordable. Healthy market.

**Scenario: Component Oversupply**
- If supply exceeds demand, components fall to base_value (NPC vendor floor)
- Fighters still earn money from vendoring — components are never worthless
- ENCHANTERs/SCRIBEs get cheap inputs — their margins improve

**Verdict:** The system self-balances. Scarcity raises prices → fighters hunt more → supply increases → prices normalize. The NPC vendor floor prevents collapse.

---

## Section 5: Combat-Crafter Economy Loop

### 5A. The Core Loop

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  FIGHTERS kill monsters ──→ COMPONENTS drop                     │
│       ↑                          │                               │
│       │                          ↓                               │
│  Use enchanted items       Sold on MARKET                        │
│       ↑                          │                               │
│       │                          ↓                               │
│  Buy from market ←── ENCHANTER/SCRIBE craft enchanted items     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5B. Loop Health Analysis

**Does the loop work?** Yes, with caveats.

| Question | Answer |
|----------|--------|
| Do fighters have incentive to kill magical monsters? | **Yes.** XP, gold, mundane loot, AND magical components. A L10 Troll gives combat XP + gold + meat + pelts + Troll Blood (15-30g market). Better returns than Phase 1 monsters. |
| Do fighters need enchanted items? | **Yes.** Phase 2 monsters are harder than Phase 1. Ice Wraiths, basilisks, and wyverns are designed to be difficult without enchantments. A Flaming weapon vs. a Treant, a Frost weapon vs. a Fire Elemental — these are meaningful tactical advantages. |
| Can ENCHANTERs/SCRIBEs survive without components? | **Partially.** They can still craft non-magical items (maps, mundane scrolls), but their most profitable recipes require components. They're incentivized to participate in the combat-crafter market. |
| What if no one fights magical monsters? | **Components dry up, enchanted item prices spike, which incentivizes fighters to hunt more.** Self-correcting. Meanwhile, ENCHANTERs/SCRIBEs fall back to mundane recipes. |
| What if no ENCHANTERs/SCRIBEs exist in a town? | **Components pile up unsold.** Fighters can still vendor them for base_value (8-45g). Not ideal revenue, but never zero. Smart fighters will transport components to towns with active crafters. Creates a trade caravan incentive. |
| Minimum viable player count? | **~20 active players:** 5 fighters (supply components), 2 ENCHANTERs, 2 SCRIBEs, 11 other professions. The loop is thin but functional. Below 10 players, the loop breaks — not enough encounters to generate steady supply. |

### 5C. Bottleneck Analysis

| Potential Bottleneck | Severity | Mitigation |
|---------------------|:--------:|------------|
| **Rare components (Fey Tear, Shadow Essence, Wyvern Scale)** | Medium | These feed high-tier recipes. Scarcity is a feature, not a bug — Holy/Shadow enchantments SHOULD be rare. Market price will be 3-5× base_value. |
| **Single-source components (Shadow Essence only from Shadow Stalker)** | Low | All components have exactly one source monster. If that monster is region-locked, components become regional specialties. This creates inter-town trade — intended behavior. |
| **Ember Core bottleneck (Fire Elemental is Rare + region-locked to Ashenfang)** | Medium | Both ENCHANTER (Flaming) and SCRIBE (Scroll of Fire) need Ember Cores. Fire is the most popular enchantment school. Consider adding a second fire-related drop source in a future phase (e.g., Salamander, Fire Beetle). |
| **Spider Venom (shared with ALCHEMIST)** | Low | Already has steady supply from Phase 1 Giant Spiders (2.9/week). Adding ENCHANTER as a second consumer increases demand but Spider Venom supply is the most reliable of any component. |

### 5D. Economic Feedback Loops

**Positive feedback (growth spiral):**
1. More fighters → more components → cheaper components → more enchanted items → more fighters
2. More enchanters → more demand → higher component prices → more fighters hunting → more supply

**Negative feedback (self-correction):**
1. Too many fighters → oversupply → component prices crash → some fighters switch to gathering → supply normalizes
2. Too few fighters → scarcity → prices spike → profit motive attracts fighters → supply increases

**The system has robust self-correction.** Neither oversupply nor undersupply is permanent. The NPC vendor floor prevents death spirals, and market pricing prevents exploitation.

---

## Section 6: Integration with Phase 1 Loot System

### 6A. Phase 1 Monster Upgrades

**Spider Venom promotion:** Giant Spider (Phase 1, L7) already drops Spider Venom at 12% / 1 qty / 12g base_value. No changes to the Spider's loot table. Just add ENCHANTER as a consumer profession alongside ALCHEMIST. Spider Venom becomes dual-use.

**No other Phase 1 monsters drop magical components.** Phase 1 materials remain mundane:
- Wolf Fang, Boar Tusk, Bear Claw → JEWELER/FLETCHER crafting, not magical
- Bone Fragments → JEWELER/FLETCHER, not magical
- Spider Silk → TAILOR fiber, not magical
- Rat Tail, Orc War Paint → ALCHEMIST ingredients, not magical

This is intentional. Phase 1 monsters are mundane wildlife and humanoids. Phase 2 introduces fantastical creatures with magical properties. The two tiers are distinct.

### 6B. Combined Monster Roster (Phase 1 + Phase 2)

| # | Monster | Level | Phase | Type | Threat | Magical Drops? |
|:-:|---------|:-----:|:-----:|------|:------:|:-:|
| 1 | Giant Rat | 1 | P1 | Beast | Low | No |
| 2 | Goblin | 1 | P1 | Humanoid | Low | No |
| 3 | Wolf | 2 | P1 | Beast | Low | No |
| 4 | Wild Boar | 3 | P1 | Beast | Low | No |
| 5 | Bandit | 3 | P1 | Humanoid | Low | No |
| 6 | Brown Bear | 5 | P1 | Beast | Low | No |
| 7 | Skeleton Warrior | 5 | P1 | Undead | Low | No |
| 8 | Storm Hawk | 6 | **P2** | Beast | Low | **Storm Feather, Wind Mote** |
| 9 | Orc Warrior | 6 | P1 | Humanoid | Low | No |
| 10 | Will-o'-Wisp | 7 | **P2** | Fey | Low | **Wisp Mote** |
| 11 | Giant Spider | 7 | P1 | Beast | Low | **Spider Venom** (promoted) |
| 12 | Treant | 8 | **P2** | Plant | Medium | **Living Bark, Heartwood Sap** |
| 13 | Dire Wolf | 8 | P1 | Beast | Low | No |
| 14 | Ogre | 9 | **P2** | Giant | Medium | **Ogre Sinew** |
| 15 | Stone Golem | 10 | **P2** | Construct | Medium | **Earth Crystal** |
| 16 | Troll | 10 | **P2** | Giant | Medium | **Troll Blood** |
| 17 | Ice Wraith | 10 | **P2** | Undead | Medium | **Frost Essence** |
| 18 | Grave Wight | 11 | **P2** | Undead | Medium | **Spectral Dust** |
| 19 | Fire Elemental | 12 | **P2** | Elemental | High | **Ember Core** |
| 20 | Basilisk | 13 | **P2** | Beast | High | **Basilisk Scale, Basilisk Eye** |
| 21 | Corrupted Dryad | 13 | **P2** | Fey | High | **Fey Tear, Dryad Blossom** |
| 22 | Shadow Stalker | 14 | **P2** | Aberration | High | **Shadow Essence** |
| 23 | Wyvern | 16 | **P2** | Dragon-kin | Elite | **Wyvern Scale** |

**Total: 23 monsters.** Level range 1-16. Smooth difficulty curve from Giant Rat to Wyvern.

### 6C. Changes to Phase 1 Loot Tables

**No changes to any Phase 1 monster loot tables.** All Phase 1 drop rates, quantities, and materials remain exactly as specified in `encounter-loot-design-phase1.md`.

The only Phase 1 change is adding ENCHANTER as a consumer of Spider Venom alongside ALCHEMIST. This is a consumer-side change, not a loot table change.

### 6D. Encounter System Integration

Phase 2 monsters use the same encounter system as Phase 1:
- Same `LootEntry` / `MonsterLootTable` TypeScript interfaces
- Same percentage-chance drops with random party member assignment
- Same loot distribution rules (solo gets all, party random assignment)
- Same gold-from-humanoids convention (giants carry gold, elementals/plants don't)

New monster types (Construct, Elemental, Plant, Fey, Aberration) add the `monsterType` field to combat presets. No structural changes to the encounter engine needed — just new monster entries in the seed data.

---

## Section 7: YAML Update Plan

**Target file:** `docs/profession-economy-master.yaml`
**Action:** List only — do NOT modify the YAML in this prompt.

### 7A. New Materials to Add (18 entries)

Add to Section 1 (gathering_spot_types) under a new subsection `magical_components`:

| Material | item_id | Category | Base Value | Source | Consumers |
|----------|---------|----------|----------:|--------|-----------|
| Ember Core | ember_core | MATERIAL | 15g | Fire Elemental (encounter) | ENCHANTER, SCRIBE |
| Frost Essence | frost_essence | MATERIAL | 15g | Ice Wraith (encounter) | ENCHANTER, SCRIBE |
| Storm Feather | storm_feather | MATERIAL | 15g | Storm Hawk (encounter) | ENCHANTER, SCRIBE |
| Earth Crystal | earth_crystal | MATERIAL | 12g | Stone Golem (encounter) | ENCHANTER, SCRIBE |
| Troll Blood | troll_blood | MATERIAL | 15g | Troll (encounter) | SCRIBE |
| Fey Tear | fey_tear | MATERIAL | 35g | Corrupted Dryad (encounter) | ENCHANTER, SCRIBE |
| Heartwood Sap | heartwood_sap | MATERIAL | 10g | Treant (encounter) | ENCHANTER |
| Basilisk Scale | basilisk_scale | MATERIAL | 25g | Basilisk (encounter) | ENCHANTER |
| Wyvern Scale | wyvern_scale | MATERIAL | 45g | Wyvern (encounter) | ENCHANTER |
| Ogre Sinew | ogre_sinew | MATERIAL | 12g | Ogre (encounter) | ENCHANTER, SCRIBE |
| Wind Mote | wind_mote | MATERIAL | 12g | Storm Hawk (encounter) | ENCHANTER |
| Basilisk Eye | basilisk_eye | MATERIAL | 20g | Basilisk (encounter) | ENCHANTER, SCRIBE |
| Shadow Essence | shadow_essence | MATERIAL | 30g | Shadow Stalker (encounter) | ENCHANTER |
| Wisp Mote | wisp_mote | MATERIAL | 8g | Will-o'-Wisp (encounter) | SCRIBE |
| Spectral Dust | spectral_dust | MATERIAL | 10g | Grave Wight (encounter) | SCRIBE |
| Living Bark | living_bark | MATERIAL | 8g | Treant (encounter) | ENCHANTER, SCRIBE |
| Dryad Blossom | dryad_blossom | MATERIAL | 15g | Corrupted Dryad (encounter) | SCRIBE |
| Spider Venom | spider_venom | — | 12g | (already exists) | Add ENCHANTER as consumer |

### 7B. Existing Recipes to Modify (15 recipes)

**ENCHANTER — add component inputs to 9 existing recipes:**

| Recipe ID | Add Input | Qty |
|-----------|-----------|:---:|
| ench-fortified | Living Bark | 2 |
| ench-flaming | Ember Core | 2 |
| ench-frost | Frost Essence | 2 |
| ench-lightning | Storm Feather | 2 |
| ench-swift | Ogre Sinew + Wind Mote | 1+1 |
| ench-poisoned | Spider Venom | 3 |
| ench-warding | Basilisk Scale | 1 |
| ench-holy | Fey Tear | 2 |
| ench-shadow | Shadow Essence | 2 |

**SCRIBE — add component inputs to 6 existing recipes:**

| Recipe ID | Add Input | Qty |
|-----------|-----------|:---:|
| scribe-scroll-fire | Ember Core | 1 |
| scribe-identification-scroll | Wisp Mote | 1 |
| scribe-scroll-ice | Frost Essence | 1 |
| scribe-scroll-healing | Troll Blood | 1 |
| scribe-dungeon-map | Spectral Dust | 1 |
| scribe-scroll-lightning | Storm Feather | 1 |

No changes to `scribe-area-map` (stays mundane).

### 7C. New Recipes to Create (8 recipes)

**4 new ENCHANTER recipes:**

| Recipe ID | Level | Tier | Output | Base Value |
|-----------|:-----:|------|--------|----------:|
| ench-earthen | 35 | Craftsman | Earthen Enchantment Scroll | 250g |
| ench-vitality | 35 | Craftsman | Vitality Enchantment Scroll | 220g |
| ench-natures-ward | 40 | Expert | Nature's Ward Enchantment Scroll | 300g |
| ench-true-sight | 45 | Expert | True Sight Enchantment Scroll | 350g |

**4 new SCRIBE recipes:**

| Recipe ID | Level | Tier | Output | Base Value |
|-----------|:-----:|------|--------|----------:|
| scribe-scroll-stone-skin | 30 | Craftsman | Scroll of Stone Skin | 90g |
| scribe-scroll-might | 30 | Craftsman | Scroll of Might | 85g |
| scribe-scroll-entangle | 35 | Craftsman | Scroll of Entangle | 100g |
| scribe-scroll-restoration | 35 | Craftsman | Scroll of Restoration | 130g |

### 7D. Base Value Adjustments

**No existing base_value adjustments needed.** All existing ENCHANTER and SCRIBE recipes maintain ≥1.3× margin after adding component inputs. The components increase input costs but remain within the margin targets at the current output base_values.

### 7E. New Monster Seed Data (13 entries)

Add to combat presets / monster seed data:

| Monster | Level | HP | AC | Damage | Type | XP Reward |
|---------|:-----:|:--:|:--:|:------:|------|:---------:|
| Storm Hawk | 6 | 30 | 13 | 4-8 | BEAST | 30 |
| Will-o'-Wisp | 7 | 20 | 16 | 5-10 (lightning) | FEY | 35 |
| Treant | 8 | 65 | 15 | 8-14 | PLANT | 40 |
| Ogre | 9 | 70 | 11 | 10-18 | GIANT | 45 |
| Stone Golem | 10 | 80 | 17 | 8-16 | CONSTRUCT | 50 |
| Troll | 10 | 60 | 13 | 8-14 | GIANT | 50 |
| Ice Wraith | 10 | 45 | 14 | 6-12 (cold) | UNDEAD | 50 |
| Grave Wight | 11 | 55 | 15 | 8-14 | UNDEAD | 55 |
| Fire Elemental | 12 | 70 | 14 | 10-18 (fire) | ELEMENTAL | 60 |
| Basilisk | 13 | 75 | 16 | 10-16 + petrify | BEAST | 65 |
| Corrupted Dryad | 13 | 65 | 15 | 8-14 + entangle | FEY | 65 |
| Shadow Stalker | 14 | 60 | 17 | 12-20 | ABERRATION | 70 |
| Wyvern | 16 | 110 | 16 | 14-24 + poison | DRAGON | 80 |

*Note: These are initial stat blocks. Balancing will happen during implementation when combat testing is available. XP follows the Phase 1 formula: `5 × monster.level`.*

### 7F. Change Summary

| Category | Items | YAML Section |
|----------|:-----:|:------------:|
| New materials | 17 (+ 1 consumer update) | Section 1 |
| Modified ENCHANTER recipes | 9 | Section 3 (ENCHANTER) |
| Modified SCRIBE recipes | 6 | Section 3 (SCRIBE) |
| New ENCHANTER recipes | 4 | Section 3 (ENCHANTER) |
| New SCRIBE recipes | 4 | Section 3 (SCRIBE) |
| New monster entries | 13 | Combat presets (separate file) |
| Base value adjustments | 0 | — |
| **Total YAML changes** | **53 items** | — |

---

## Appendix: Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| 18 components (not 25) | Every component has ≥1 recipe. No orphans. Adding more would create inventory bloat with no purpose. |
| 12 new monsters (not 8) | Need enough monster variety to spread across biomes and threat levels. 12 covers all 6 magical schools with 2-3 options per tier. |
| Spider Venom promoted (not replaced) | Reusing an existing Phase 1 material avoids adding yet another poison component. Giant Spiders are already the poison monster. |
| SCRIBE uses 1× component, ENCHANTER uses 2-3× | Scrolls are single-use (less magic needed). Enchantments are permanent (more magic needed). This creates a natural price differentiation. |
| Wyvern is Elite, not High | Wyverns are the hardest Phase 2 content. They guard the most valuable component (45g Wyvern Scale). Keeping them rare prevents Warding Enchantment from being too accessible. |
| No dragons, liches, or demon lords | Per prompt: those are endgame content (Phase 3+). Phase 2 caps at wyvern-level difficulty. |
| Night-only monsters (Will-o'-Wisp, Shadow Stalker) | Adds tactical variety. Players must plan encounters around time of day. Creates scarcity for Wisp Mote and Shadow Essence — only available to night hunters. |
| Area Map stays mundane | A simple map doesn't require magical components. Keeping one non-magical recipe gives SCRIBE a fallback when components are scarce. |
| Components are tradeable | Core design principle. Creates the fighter→crafter market relationship. If components were untradeable, ENCHANTERs would need to fight their own monsters, defeating the interdependence design. |
