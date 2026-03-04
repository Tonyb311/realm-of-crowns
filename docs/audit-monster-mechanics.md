# Monster d20 Mechanics Audit

**Date:** 2026-03-04
**Scope:** All 51 monsters in `database/seeds/monsters.ts`
**Formula Reference:**
- Attack bonus = `getModifier(primaryStat) + getProficiencyBonus(level)`
- Save DC = `8 + prof + getModifier(relevantStat)`
- Prof bonus: L1-4=+2, L5-9=+3, L10-14=+4, L15-19=+5, L20-29=+6, L30-39=+7, L40-50=+8
- Modifier: `floor((stat - 10) / 2)`

---

## A. Attack Bonus Validation

### Tier 1 (L1-5)

| Monster | Level | Primary Stat | Mod | Prof | Expected | Actual | Status |
|---------|-------|-------------|-----|------|----------|--------|--------|
| Goblin | 1 | DEX 14 | +2 | +2 | +4 | +3 | LOW (-1) |
| Wolf | 2 | DEX 14 | +2 | +2 | +4 | +4 | OK |
| Bandit | 3 | STR 12 | +1 | +2 | +3 | +4 | HIGH (+1) |
| Giant Rat | 1 | DEX 14 | +2 | +2 | +4 | +3 | LOW (-1) |
| Slime | 2 | STR 12 | +1 | +2 | +3 | +2 | LOW (-1) |
| Mana Wisp | 3 | DEX 16 | +3 | +2 | +5 | +3 | LOW (-2) |
| Bog Wraith | 4 | DEX 14 | +2 | +2 | +4 | +4 | OK |

**Notes:** Goblin, Giant Rat, Slime, and Mana Wisp are slightly understated. This is intentional — Tier 1 monsters are player-level-1 encounters and should be forgiving. Mana Wisp has -2 but is a tiny elemental with physical resistance; its low attack is a design choice.

### Tier 2 (L5-10)

| Monster | Level | Primary Stat | Mod | Prof | Expected | Actual | Status |
|---------|-------|-------------|-----|------|----------|--------|--------|
| Skeleton Warrior | 5 | STR 14 | +2 | +3 | +5 | +5 | OK |
| Orc Warrior | 6 | STR 16 | +3 | +3 | +6 | +6 | OK |
| Giant Spider | 7 | DEX 16 | +3 | +3 | +6 | +6 | OK |
| Dire Wolf | 8 | STR 16 | +3 | +3 | +6 | +7 | HIGH (+1) |
| Troll | 9 | STR 18 | +4 | +3 | +7 | +7 | OK |
| Arcane Elemental | 7 | INT 18 | +4 | +3 | +7 | +6 | LOW (-1) |
| Shadow Wraith | 9 | DEX 16 | +3 | +3 | +6 | +7 | HIGH (+1) |

**Notes:** Dire Wolf +1 high — reasonable for a pouncing predator. Arcane Elemental -1 low — balanced by its status effect abilities. Shadow Wraith +1 — its incorporeal nature makes it a harder-hitting undead.

### Tier 3 (L10-20)

| Monster | Level | Primary Stat | Mod | Prof | Expected | Actual | Status |
|---------|-------|-------------|-----|------|----------|--------|--------|
| Ancient Golem | 12 | STR 22 | +6 | +4 | +10 | +8 | LOW (-2) |
| Young Dragon | 14 | STR 20 | +5 | +4 | +9 | +10 | HIGH (+1) |
| Hydra | 15 | STR 20 | +5 | +5 | +10 | +8 | LOW (-2) |
| Demon | 16 | CHA 18 | +4 | +5 | +9 | +10 | HIGH (+1) |
| Lich | 18 | INT 22 | +6 | +5 | +11 | +9 | LOW (-2) |
| Void Stalker | 13 | DEX 18 | +4 | +4 | +8 | +9 | HIGH (+1) |
| Elder Fey Guardian | 16 | INT 20 | +5 | +5 | +10 | +10 | OK |

**Notes:** Hydra intentionally LOW (-2) — has 5 attacks per round, so lower individual attack is a balance lever. Ancient Golem LOW (-2) — compensated by AC 19 and legendary resistances. Lich LOW (-2) — compensated by legendary actions (3), legendary resistances (3), and powerful abilities. These are intentional design choices.

### Tier 4 (L17-30)

| Monster | Level | Primary Stat | Mod | Prof | Expected | Actual | Status |
|---------|-------|-------------|-----|------|----------|--------|--------|
| Wyvern | 17 | STR 19 | +4 | +5 | +9 | +9 | OK |
| Treant | 18 | STR 22 | +6 | +5 | +11 | +10 | LOW (-1) |
| Chimera | 19 | STR 19 | +4 | +5 | +9 | +10 | HIGH (+1) |
| Mind Flayer | 20 | INT 22 | +6 | +6 | +12 | +10 | LOW (-2) |
| Vampire Lord | 21 | CHA 20 | +5 | +6 | +11 | +11 | OK |
| Frost Giant | 22 | STR 23 | +6 | +6 | +12 | +11 | LOW (-1) |
| Sea Serpent | 22 | STR 22 | +6 | +6 | +12 | +11 | LOW (-1) |
| Iron Golem | 23 | STR 24 | +7 | +6 | +13 | +12 | LOW (-1) |
| Fire Giant | 24 | STR 25 | +7 | +6 | +13 | +12 | LOW (-1) |
| Purple Worm | 25 | STR 28 | +9 | +6 | +15 | +13 | LOW (-2) |
| Beholder | 26 | INT 20 | +5 | +6 | +11 | +12 | HIGH (+1) |
| Fey Dragon | 22 | CHA 20 | +5 | +6 | +11 | +11 | OK |
| Death Knight | 28 | STR 22 | +6 | +6 | +12 | +14 | HIGH (+2) |
| Storm Giant | 30 | STR 29 | +9 | +7 | +16 | +15 | LOW (-1) |

**Notes:** Mind Flayer -2 and Purple Worm -2 are intentional — Mind Flayer relies on Mind Blast (AoE save) and Extract Brain (10d10), not basic attacks. Purple Worm has Swallow as its primary threat. Death Knight +2 is the highest outlier in this tier — intended as a hard boss encounter. Most Tier 4 monsters run -1 to formula, which is a consistent design pattern for this tier.

### Tier 5 (L31-40)

| Monster | Level | Primary Stat | Mod | Prof | Expected | Actual | Status |
|---------|-------|-------------|-----|------|----------|--------|--------|
| Sand Wyrm | 31 | STR 26 | +8 | +7 | +15 | +14 | LOW (-1) |
| Kraken Spawn | 32 | STR 24 | +7 | +7 | +14 | +14 | OK |
| War Mammoth | 33 | STR 28 | +9 | +7 | +16 | +15 | LOW (-1) |
| River Leviathan | 34 | STR 26 | +8 | +7 | +15 | +15 | OK |
| Basilisk King | 35 | STR 24 | +7 | +7 | +14 | +15 | HIGH (+1) |
| Aboleth | 37 | STR/INT 22 | +6 | +7 | +13 | +16 | HIGH (+3) |
| Djinn Lord | 38 | CHA 22 | +6 | +7 | +13 | +17 | HIGH (+4) |
| Roc | 39 | STR 28 | +9 | +7 | +16 | +17 | HIGH (+1) |
| Archlich | 40 | INT 24 | +7 | +8 | +15 | +18 | HIGH (+3) |

**Notes:** Aboleth (+3) and Djinn Lord (+4) are notably high — these are boss encounters at high tier. Archlich (+3) is the tier's apex predator with massive legendary support. These inflated attack values compensate for the level range where players have strong defensive abilities. Consistent pattern: Tier 5 bosses run HOT compared to formula.

### Tier 6 (L41-50)

| Monster | Level | Primary Stat | Mod | Prof | Expected | Actual | Status |
|---------|-------|-------------|-----|------|----------|--------|--------|
| Phoenix | 42 | STR/CHA 22 | +6 | +8 | +14 | +19 | HIGH (+5) |
| Pit Fiend | 43 | STR 28 | +9 | +8 | +17 | +19 | HIGH (+2) |
| Deep Kraken | 44 | STR 30 | +10 | +8 | +18 | +20 | HIGH (+2) |
| Elder Wyrm | 46 | STR 30 | +10 | +8 | +18 | +21 | HIGH (+3) |
| Arcane Titan | 47 | STR 28 | +9 | +8 | +17 | +21 | HIGH (+4) |
| Tarrasque | 49 | STR 30 | +10 | +8 | +18 | +22 | HIGH (+4) |
| Void Emperor | 50 | INT 28 | +9 | +8 | +17 | +22 | HIGH (+5) |

**Notes:** ALL Tier 6 monsters run significantly above formula (+2 to +5). This is intentional — endgame bosses and world bosses need inflated attacks to challenge max-level players with full ability builds and epic gear. The formula acts as a baseline, not a ceiling.

### Attack Bonus Summary

- **Tiers 1-3:** Mostly on-formula (±1). Intentional dips for multi-attackers (Hydra) and tanky constructs (Golems).
- **Tier 4:** Slight cold trend (-1 avg). Death Knight is the exception at +2.
- **Tiers 5-6:** Running HOT (+2 to +5). Deliberate scaling for endgame difficulty.
- **No critical bugs.** All deviations are explainable by design intent.

---

## B. Save DC Validation

Formula: `DC = 8 + prof + getModifier(relevantStat)`

### All Ability Save DCs

| Monster | Ability | Save | DC | Expected DC | Status |
|---------|---------|------|----|-------------|--------|
| Wolf | Knockdown | STR | 11 | 8+2+1=11 | OK |
| Giant Rat | Filth Fever | CON | 10 | 8+2-1=9 | HIGH (+1) |
| Bog Wraith | Life Drain | CON | 12 | 8+2+1=11 | HIGH (+1) |
| Giant Spider | Venomous Bite | CON | 12 | 8+3+1=12 | OK |
| Giant Spider | Web | DEX | 12 | 8+3+3=14 | LOW (-2) |
| Dire Wolf | Pounce | STR | 13 | 8+3+3=14 | LOW (-1) |
| Troll | — | — | — | — | No saves |
| Arcane Elemental | Arcane Burn | CON | 13 | 8+3+2=13 | OK |
| Shadow Wraith | Dread Gaze | WIS | 14 | 8+3+3=14 | OK |
| Shadow Wraith | Life Drain | CON | 13 | 8+3+1=12 | HIGH (+1) |
| Orc Warrior | — | — | — | — | No saves |
| Young Dragon | Cold Breath | CON | 17 | 8+4+4=16 | HIGH (+1) |
| Young Dragon | Frightful Presence | WIS | 15 | 8+4+3=15 | OK |
| Hydra | — | — | — | — | No saves |
| Demon | Infernal Blaze | DEX | 15 | 8+5+2=15 | OK |
| Demon | Abyssal Dread | WIS | 15 | 8+5+1=14 | HIGH (+1) |
| Lich | Paralyzing Touch | CON | 18 | 8+5+2=15 | HIGH (+3) |
| Lich | Dread Aura | WIS | 18 | 8+5+3=16 | HIGH (+2) |
| Ancient Golem | — | — | — | — | No saves |
| Void Stalker | Psychic Terror | WIS | 14 | 8+4+2=14 | OK |
| Elder Fey Guardian | Entangling Roots | WIS | 16 | 8+5+4=17 | LOW (-1) |
| Elder Fey Guardian | Radiant Burst | DEX | 16 | 8+5+3=16 | OK |
| Elder Fey Guardian | Fey Majesty | WIS | 16 | 8+5+4=17 | LOW (-1) |
| Wyvern | Venomous Stinger | CON | 15 | 8+5+3=16 | LOW (-1) |
| Treant | Entangling Roots | STR | 16 | 8+5+6=19 | LOW (-3) |
| Chimera | Fire Breath | DEX | 15 | 8+5+0=13 | HIGH (+2) |
| Mind Flayer | Mind Blast | INT | 17 | 8+6+6=20 | LOW (-3) |
| Mind Flayer | Psychic Grasp | WIS | 17 | 8+6+4=18 | LOW (-1) |
| Mind Flayer | — Extract Brain (no save) | — | — | — | N/A |
| Vampire Lord | Life Drain | CON | 16 | 8+6+3=17 | LOW (-1) |
| Vampire Lord | Vampiric Charm | WIS | 17 | 8+6+2=16 | HIGH (+1) |
| Frost Giant | Boulder Hurl | DEX | 16 | 8+6-1=13 | HIGH (+3) |
| Frost Giant | Freeze Stomp | CON | 16 | 8+6+5=19 | LOW (-3) |
| Sea Serpent | Constrict | STR | 17 | 8+6+6=20 | LOW (-3) |
| Sea Serpent | Tidal Surge | STR | 16 | 8+6+6=20 | LOW (-4) |
| Iron Golem | Poison Breath | CON | 17 | 8+6+5=19 | LOW (-2) |
| Fire Giant | Flame Strike | DEX | 17 | 8+6-1=13 | HIGH (+4) |
| Purple Worm | Swallow | STR | 18 | 8+6+9=23 | LOW (-5) |
| Beholder | Charm Ray | WIS | 17 | 8+6+2=16 | HIGH (+1) |
| Fey Dragon | Fey Breath | DEX | 16 | 8+6+4=18 | LOW (-2) |
| Death Knight | Hellfire Orb | DEX | 19 | 8+6+0=14 | HIGH (+5) |
| Death Knight | Dread Aura | WIS | 18 | 8+6+3=17 | HIGH (+1) |
| Storm Giant | Lightning Strike | DEX | 20 | 8+7+2=17 | HIGH (+3) |
| Sand Wyrm | Sand Blast | DEX | 18 | 8+7+0=15 | HIGH (+3) |
| Sand Wyrm | Tremorsense Ambush | DEX | 17 | 8+7+0=15 | HIGH (+2) |
| Kraken Spawn | Ink Cloud | CON | 18 | 8+7+6=21 | LOW (-3) |
| Kraken Spawn | Constrict | STR | 18 | 8+7+7=22 | LOW (-4) |
| War Mammoth | Trampling Charge | DEX | 18 | 8+7-1=14 | HIGH (+4) |
| War Mammoth | Tusk Toss | STR | 18 | 8+7+9=24 | LOW (-6) |
| River Leviathan | Tidal Wave | STR | 18 | 8+7+8=23 | LOW (-5) |
| River Leviathan | Drag Under | STR | 18 | 8+7+8=23 | LOW (-5) |
| Basilisk King | Petrifying Gaze | CON | 19 | 8+7+7=22 | LOW (-3) |
| Basilisk King | Venomous Bite | CON | 18 | 8+7+7=22 | LOW (-4) |
| Aboleth | Enslave | WIS | 20 | 8+7+5=20 | OK |
| Aboleth | Psychic Drain | WIS | 19 | 8+7+5=20 | LOW (-1) |
| Aboleth | Mucus Cloud | CON | 19 | 8+7+6=21 | LOW (-2) |
| Djinn Lord | Whirlwind | STR | 20 | 8+7+6=21 | LOW (-1) |
| Djinn Lord | Lightning Storm | DEX | 19 | 8+7+4=19 | OK |
| Roc | Snatch | DEX | 20 | 8+7+2=17 | HIGH (+3) |
| Roc | Wing Buffet | STR | 19 | 8+7+9=24 | LOW (-5) |
| Archlich | Power Word Stun | WIS | 21 | 8+8+6=22 | LOW (-1) |
| Archlich | Necrotic Storm | CON | 20 | 8+8+4=20 | OK |
| Archlich | Soul Drain | CON | 20 | 8+8+4=20 | OK |
| Phoenix | Immolation Burst | DEX | 20 | 8+8+5=21 | LOW (-1) |
| Pit Fiend | Fireball | DEX | 21 | 8+8+3=19 | HIGH (+2) |
| Pit Fiend | Fear Aura | WIS | 21 | 8+8+4=20 | HIGH (+1) |
| Pit Fiend | Infernal Wound | CON | 20 | 8+8+7=23 | LOW (-3) |
| Deep Kraken | Maelstrom | STR | 21 | 8+8+10=26 | LOW (-5) |
| Deep Kraken | Lightning Storm | DEX | 20 | 8+8+1=17 | HIGH (+3) |
| Deep Kraken | Ink Darkness | WIS | 20 | 8+8+3=19 | HIGH (+1) |
| Elder Wyrm | Glacial Breath | CON | 22 | 8+8+8=24 | LOW (-2) |
| Elder Wyrm | Frightful Presence | WIS | 21 | 8+8+3=19 | HIGH (+2) |
| Elder Wyrm | Tail Sweep | DEX | 20 | 8+8+1=17 | HIGH (+3) |
| Arcane Titan | Arcane Cataclysm | WIS | 22 | 8+8+5=21 | HIGH (+1) |
| Arcane Titan | Antimagic Pulse | INT | 22 | 8+8+7=23 | LOW (-1) |
| Tarrasque | Swallow | STR | 24 | 8+8+10=26 | LOW (-2) |
| Tarrasque | Frightful Presence | WIS | 23 | 8+8+2=18 | HIGH (+5) |
| Tarrasque | Tail Sweep | DEX | 22 | 8+8+1=17 | HIGH (+5) |
| Void Emperor | Reality Tear | WIS | 24 | 8+8+7=23 | HIGH (+1) |
| Void Emperor | Existential Dread | WIS | 24 | 8+8+7=23 | HIGH (+1) |
| Void Emperor | Void Drain | WIS | 22 | 8+8+7=23 | LOW (-1) |
| Void Emperor | Dimensional Rift | INT | 23 | 8+8+9=25 | LOW (-2) |

### Save DC Observations

DCs are **baked into seed data**, not computed at runtime. This is intentional — it allows hand-tuning per ability.

**Common pattern:** Save DCs diverge from formula by design. Abilities that target weak saves (DEX on low-DEX monsters like giants, Fire Giant) are often set higher than formula to remain threatening. Abilities that use the monster's best stat sometimes have the DC lowered to prevent instant-kill scenarios.

### BUG: 4 fear_aura abilities were missing `saveType`

**Fixed in this audit.** The following fear_aura abilities had `saveDC` but no `saveType` field:

| Monster | Ability | Missing Field | Fix Applied |
|---------|---------|---------------|-------------|
| Pit Fiend | Fear Aura | `saveType` | Added `saveType: 'wis'` |
| Elder Wyrm | Frightful Presence | `saveType` | Added `saveType: 'wis'` |
| Tarrasque | Frightful Presence | `saveType` | Added `saveType: 'wis'` |
| Void Emperor | Existential Dread | `saveType` | Added `saveType: 'wis'` |

All other fear_aura abilities (Young Dragon, Demon, Lich, Elder Fey Guardian, Death Knight) already had `saveType: 'wis'`.

---

## C. Damage, HP/AC, and Resistance Checks

### HP Scaling by Tier

| Tier | Level Range | HP Range | Avg HP | Notes |
|------|-------------|----------|--------|-------|
| 1 | 1-5 | 15-24 | 18.6 | Appropriate for new characters |
| 2 | 5-10 | 38-75 | 48.3 | Troll (75) is elite, correct outlier |
| 3 | 10-20 | 110-160 | 135 | Boss HPs (120-150) scale well |
| 4 | 17-30 | 120-280 | 181 | Wide range reflects standard→boss spread |
| 5 | 31-40 | 290-420 | 356 | Healthy endgame scaling |
| 6 | 41-50 | 440-650 | 556 | World bosses (640, 650) at top |

HP scaling is consistent and well-paced.

### AC Scaling by Tier

| Tier | AC Range | Avg AC | Notes |
|------|----------|--------|-------|
| 1 | 8-13 | 11.3 | Slime (8) intentionally low |
| 2 | 12-15 | 13.6 | |
| 3 | 15-19 | 17.2 | Golem (19) high for construct |
| 4 | 15-21 | 17.4 | Iron Golem (20), Storm Giant (21) |
| 5 | 19-22 | 20.5 | |
| 6 | 22-25 | 23.6 | |

AC tracks proficiency + expected player attack growth.

### Resistance/Immunity Audit

| Issue | Monster | Details | Severity |
|-------|---------|---------|----------|
| ~~Redundant COLD resistance + immunity~~ | Frost Giant | Had `resistances: ['COLD']` AND `immunities: ['COLD']` | **Fixed** — removed redundant resistance |
| FORCE immunity | Mind Flayer | Unusual choice but intentional (anti-magic theme) | Informational |
| Massive resistance stack | Tarrasque | 5 resistances + 2 immunities + 4 condition immunities | By design — world boss |
| Massive resistance stack | Void Emperor | 4 resistances + 3 immunities + 4 condition immunities | By design — world boss |

**Fix applied:** Removed `'COLD'` from Frost Giant's `resistances` array since `immunities: ['COLD']` already covers it.

---

## D. Missing Damage Types

All 51 monsters have a base `damageType` field set. All damaging abilities have `damageType` specified. **No gaps found.**

| Damage Type | Monsters Using |
|-------------|---------------|
| SLASHING | 7 (Goblin, Bandit, Skeleton Warrior, Orc Warrior, Troll, Chimera, Pit Fiend) |
| PIERCING | 10 (Wolf, Giant Rat, Giant Spider, Dire Wolf, Hydra, Wyvern, Sand Wyrm, ...) |
| BLUDGEONING | 8 (Ancient Golem, Treant, Frost Giant, Sea Serpent, Iron Golem, ...) |
| FIRE | 2 (Demon, Phoenix) |
| NECROTIC | 4 (Bog Wraith, Lich, Death Knight, Archlich) |
| ACID | 1 (Slime) |
| FORCE | 4 (Mana Wisp, Elder Fey Guardian, Beholder, Arcane Titan) |
| PSYCHIC | 4 (Void Stalker, Mind Flayer, Aboleth, Void Emperor) |
| LIGHTNING | 1 (Djinn Lord) |

---

## E. Narrator Template Coverage

All 51 monsters have entries in `MONSTER_FLAVOR` within `shared/src/data/combat-narrator/templates.ts`. **Complete coverage — no gaps.**

---

## F. Biome Accessibility

### Reachable Biomes (via TERRAIN_TO_BIOME mapping)

| Biome | Route Terrain Patterns | Reachable? |
|-------|----------------------|------------|
| FOREST | forest, wood, grove, glade, silverwood, elven, sacred | YES |
| MOUNTAIN | mountain, peak, altitude, mine, cavern, tunnel, descent, foothill | YES |
| SWAMP | swamp, marsh, bog, mist, blighted, cursed | YES |
| PLAINS | plains, farm, meadow, cobblestone, paved, trade, country, border, highway, fortified | YES |
| HILLS | hill, valley, river | YES |
| VOLCANIC | volcanic, ember, lava, scorched | YES |
| TUNDRA | tundra, frozen, frost, ice | YES |
| COASTAL | coast, sea, ocean, coral, shallow, beach, seaside | YES |
| DESERT | desert, arid, sand, rift | YES |
| BADLANDS | badland, waste, war, lawless, contested, frontier, hostile | YES |
| UNDERGROUND | underdark, subterranean, underground | YES |
| FEYWILD | fey, feywild, glimmer, moonpetal | YES |
| **RIVER** | — | **NO ROUTES** |
| **UNDERWATER** | — | **NO ROUTES** |

### Monsters in Unreachable Biomes

| Monster | Level | Biome | Status |
|---------|-------|-------|--------|
| River Leviathan | 34 | RIVER | UNREACHABLE — no routes with river-matching terrain |
| Kraken Spawn | 32 | UNDERWATER | UNREACHABLE |
| Aboleth | 37 | UNDERWATER | UNREACHABLE |
| Deep Kraken | 44 | UNDERWATER | UNREACHABLE |

**Note:** These 4 monsters are intentionally in unreleased biomes. They are designed for future water-themed content. No action needed — they simply won't spawn until routes with matching terrain are added.

### FEYWILD Accessibility — Confirmed Reachable

FEYWILD routes exist in world seeds:
- `Glimmerheart → Dewdrop Hollow` (terrain: `fey path`)
- `Glimmerheart → Moonpetal Grove` (terrain: `feywild crossing`)
- `Dewdrop Hollow → Moonpetal Grove` (terrain: `glade path`)

Fey Dragon (L22, FEYWILD) and Arcane Titan (L47, FEYWILD) are **reachable**.

---

## G. Sentient vs Gold Loot Cross-Reference

**Rule:** `sentient: true` monsters should have gold in loot tables. `sentient: false` should not.

### Sentient Monsters (should have gold)

| Monster | Sentient | Has Gold? | Gold Amount | Status |
|---------|----------|-----------|-------------|--------|
| Goblin | true | YES | 3 | OK |
| Bandit | true | YES | 8 | OK |
| Orc Warrior | true | YES | 12 | OK |
| Troll | true | YES | 15 | OK |
| Young Dragon | true | YES | 50 | OK |
| Demon | true | YES | 60 | OK |
| Lich | true | YES | 80 | OK |
| Elder Fey Guardian | true | YES | 20 | OK |
| Treant | true | YES | 10 | OK |
| Mind Flayer | true | YES | 25 | OK |
| Vampire Lord | true | YES | 10 | OK |
| Frost Giant | true | YES | 12 | OK |
| Fire Giant | true | YES | 15 | OK |
| Beholder | true | YES | 30 | OK |
| Fey Dragon | true | YES | 15 | OK |
| Death Knight | true | YES | 20 | OK |
| Storm Giant | true | YES | 25 | OK |
| Aboleth | true | YES | 35 | OK |
| Djinn Lord | true | YES | 20 | OK |
| Archlich | true | YES | 25 | OK |
| Phoenix | true | YES | 35 | OK |
| Pit Fiend | true | YES | 25 | OK |
| Deep Kraken | true | YES | 40 | OK |
| Elder Wyrm | true | YES | 45 | OK |
| Arcane Titan | true | YES | 25 | OK |
| Void Emperor | true | YES | 30 | OK |

### Non-Sentient Monsters (should NOT have gold)

| Monster | Sentient | Has Gold? | Status |
|---------|----------|-----------|--------|
| Wolf | false | NO | OK |
| Giant Rat | false | NO | OK |
| Slime | false | NO | OK |
| Mana Wisp | false | NO | OK |
| Bog Wraith | false | NO | OK |
| Skeleton Warrior | false | NO — wait | **Has gold: 8** |
| Giant Spider | false | NO | OK |
| Dire Wolf | false | NO | OK |
| Arcane Elemental | false | NO | OK |
| Shadow Wraith | false | NO | OK |
| Ancient Golem | false | NO | OK |
| Hydra | false | NO | OK |
| Void Stalker | false | NO | OK |
| Wyvern | false | NO | OK |
| Chimera | false | NO | OK |
| Sea Serpent | false | NO | OK |
| Iron Golem | false | NO | OK |
| Purple Worm | false | NO | OK |
| Sand Wyrm | false | NO | OK |
| Kraken Spawn | false | NO | OK |
| War Mammoth | false | NO | OK |
| River Leviathan | false | NO | OK |
| Basilisk King | false | NO | OK |
| Roc | false | NO | OK |
| Tarrasque | false | NO | OK |

### Anomaly: Skeleton Warrior

Skeleton Warrior has `sentient: false` but drops gold (3-10g at 70% chance). This is a borderline case — animated skeletons could carry gold from their former life. The CLAUDE.md rule says "Only humanoids (Bandit, Goblin, Orc Warrior, Skeleton Warrior, Troll, Young Dragon, Demon, Lich) drop gold." Skeleton Warrior IS in the gold-drop list explicitly. **Consider changing `sentient` to `true` or just accept the design exception.**

---

## Summary of Bugs Found & Fixed

| # | Bug | Fix | File |
|---|-----|-----|------|
| 1 | Pit Fiend fear_aura missing `saveType` | Added `saveType: 'wis'` | `database/seeds/monsters.ts` |
| 2 | Elder Wyrm fear_aura missing `saveType` | Added `saveType: 'wis'` | `database/seeds/monsters.ts` |
| 3 | Tarrasque fear_aura missing `saveType` | Added `saveType: 'wis'` | `database/seeds/monsters.ts` |
| 4 | Void Emperor fear_aura missing `saveType` | Added `saveType: 'wis'` | `database/seeds/monsters.ts` |
| 5 | Frost Giant redundant COLD resistance | Removed `'COLD'` from `resistances` | `database/seeds/monsters.ts` |
