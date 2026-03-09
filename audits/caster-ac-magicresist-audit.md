# Caster AC & Equipment Audit

**Date:** 2026-03-09
**Context:** Post caster diagnostic (`audits/caster-diagnostic.md`) confirmed Mage/Psion have AC 10 at all levels in the sim. This audit traces the full AC pipeline, catalogs all caster-equippable armor, and proposes fixes.

---

## 1. Caster Equipment Catalog

### Best Cloth Armor by Slot and Sim Tier (Mage/Psion)

No cloth items have class restrictions — all classes can equip them.

#### Sim T1 (Levels 1-9)

| Slot | Best Item | Armor | magicResist | levelToEquip | Source |
|------|-----------|-------|-------------|--------------|--------|
| HEAD | Silk Hood of Insight | 2 | 10 | 7 | armor.ts:2289 |
| CHEST | Enchanted Cloak | 5 | 16 | 8 | armor.ts:2335 |
| HANDS | Cloth Gloves | 0 | 2 | 1 | armor.ts:1581 |
| LEGS | Noble's Leggings | 4 | 8 | 8 | armor.ts:2312 |
| FEET | Cloth/Linen Boots | 0 | 0-2 | 1-5 | armor.ts |
| OFF_HAND | Cloth Sash | 1 | 2 | 1 | armor.ts |
| BACK | — | — | — | — | No T1 BACK items |
| **TOTAL (L1)** | | **0** | | | Nothing equipped at start |
| **TOTAL (L4)** | | **5** | | | Hood+Robe+Trousers+Sash |
| **TOTAL (L8)** | | **12** | | | Best-in-slot per slot |

#### Sim T2 (Levels 10-29) — Woven Wool Set

| Slot | Best Item | Armor | magicResist | levelToEquip | Source |
|------|-----------|-------|-------------|--------------|--------|
| HEAD | Woven Wool Hood | 3 | 5 | 10 | armor.ts:1900 |
| CHEST | Woven Wool Robes | 5 | 10 | 10 | armor.ts:1922 |
| HANDS | Woven Wool Gloves | 2 | 4 | 10 | armor.ts:1944 |
| LEGS | Noble's Leggings | 4 | 8 | 8 | armor.ts:2312 (still best) |
| FEET | Woven Wool Boots | 3 | 5 | 10 | armor.ts:1966 |
| OFF_HAND | Cloth Sash | 1 | 2 | 1 | No Woven Wool OFF_HAND |
| BACK | Woven Wool Cloak | 2 | 6 | 10 | armor.ts:1988 |
| **TOTAL** | | **20** | **40** | | |

#### Sim T3 (Levels 30-54) — Silk Set

| Slot | Best Item | Armor | magicResist | levelToEquip | Source |
|------|-----------|-------|-------------|--------------|--------|
| HEAD | Silk Hood | 6 | 12 | 40 | armor.ts:2012 |
| CHEST | Silk Robes | 10 | 20 | 40 | armor.ts (not read, inferred from pattern) |
| HANDS | Silk Gloves | 4 | 8 | 40 | armor.ts:2056 (approx) |
| LEGS | Noble's Leggings | 4 | 8 | 8 | **GAP: No silk LEGS exist** |
| FEET | Silk Boots | 6 | 12 | 40 | armor.ts:2078 |
| OFF_HAND | Cloth Sash | 1 | 2 | 1 | **GAP: No silk OFF_HAND** |
| BACK | Silk Cloak | 4 | 14 | 40 | armor.ts:2100 |
| **TOTAL** | | **35** | **76** | | |

Elite option: Phoenix Silk Robe (CHEST armor=16, magicResist=22, L42, Mage/Cleric/Psion/Bard) → total=41.

#### Sim T4 (Levels 55+) — Enchanted Silk Set

| Slot | Best Item | Armor | magicResist | levelToEquip | Source |
|------|-----------|-------|-------------|--------------|--------|
| HEAD | Enchanted Silk Hood | 10 | 24 | 70 | armor.ts:2124 |
| CHEST | Enchanted Silk Robes | 16 | 40 | 70 | armor.ts:2147 |
| HANDS | Enchanted Silk Gloves | 8 | 18 | 70 | armor.ts:2170 |
| LEGS | Noble's Leggings | 4 | 8 | 8 | **STILL NO UPGRADE** |
| FEET | Enchanted Silk Boots | 10 | 24 | 70 | armor.ts:2193 |
| OFF_HAND | Cloth Sash | 1 | 2 | 1 | **STILL NO UPGRADE** |
| BACK | Enchanted Silk Cloak | 8 | 30 | 70 | armor.ts:2216 |
| **TOTAL** | | **57** | **146** | | |

### Coverage Gaps in Cloth Armor

1. **LEGS:** Only one cloth LEGS item exists — Noble's Leggings (armor=4, L8). No silk or enchanted silk LEGS. Casters are stuck with a T1 item in this slot forever.
2. **OFF_HAND:** Only Cloth Sash (armor=1, L1). No higher-tier cloth OFF_HAND. Casters who don't use an orb/focus have no off-hand armor progression.
3. **HANDS/FEET at T1:** Both have armor=0, contributing nothing early.

### Items from Other Recipe Files

| Source File | Armor Items? | Notes |
|-------------|-------------|-------|
| `accessories.ts` | **NO** | Rings, necklaces, circlets — stat bonuses only, zero armor |
| `caster-weapons.ts` | **NO** | Staves, wands, orbs — damage stats only, zero armor |
| `enchantments.ts` | **NO** | Consumable crafting inputs, not equipment |
| `elite-gear.ts` | **YES** | 3 elite cloth chests (see below) |

**Elite Tailor Items (Boss Drops):**

| Item | Armor | magicResist | levelToEquip | Classes |
|------|-------|-------------|--------------|---------|
| Fey-Touched Robe | 8 | 10 | 16 | Mage, Cleric, Psion, Bard |
| Death Knight's Mantle | 12 | 16 | 28 | Mage, Cleric, Psion, Bard |
| Phoenix Silk Robe | 16 | 22 | 42 | Mage, Cleric, Psion, Bard |

---

## 2. Comparison: Warrior & Rogue Equipment

### Warrior — Plate Armor (Warrior+Cleric restricted)

| Slot | T1 Copper (L1) | T2 Iron (L10) | T3 Steel (L30) | T4 Mithril (L55) | T5 Adamantine (L75) |
|------|---------------|---------------|-----------------|-------------------|---------------------|
| HEAD | 4 | 8 | 14 | 22 | 32 |
| CHEST | 8 | 16 | 26 | 38 | 52 |
| HANDS | 3 | 6 | 10 | 16 | 24 |
| LEGS | 5 | 10 | 18 | 28 | 40 |
| FEET | 4 | 8 | 14 | 22 | 32 |
| OFF_HAND (Shield) | 6 | 12 | 20 | 30 | 44 |
| **TOTAL** | **30** | **60** | **102** | **156** | **224** |

Elite plate chests (Warrior+Cleric): Dragonscale Plate (31, L14), Golem-Forged Plate (44, L23), Wyrm Scale Plate (61, L44), Tarrasque Shell shield (28, L46).

### Rogue — Leather Armor (Unrestricted)

| Slot | T1 (L1-8) | T2 (L10-25) | T3 Exotic (L40) | T4 Dragonscale (L55) |
|------|-----------|-------------|------------------|----------------------|
| HEAD | 2 (Leather Cap) | 3 (Hard Leather) | 8 (Exotic) | 12 (Dragonscale) |
| CHEST | 3→10 (Vest→Bear) | 10 (Bear Hide) | 14 (Exotic) | 22 (Dragonscale) |
| HANDS | 1 (Leather Gloves) | 3 (Wolf Leather) | 6 (Exotic) | 10 (Dragonscale) |
| LEGS | 1 (Leather Belt) | 3→7 (Greaves→Bear) | 12 (Exotic, L45) | 18 (Dragonscale, L60) |
| FEET | 2 (Leather Boots) | 4 (Wolf Leather) | 10 (Exotic) | 14 (Dragonscale) |
| OFF_HAND | — | 2 (Leather Bracers) | 8 (Exotic) | 12 (Dragonscale) |
| **TOTAL** | **9-16** | **25-29** | **46-58** | **70-88** |

Elite leather chests (Rogue/Ranger/Bard): Wyvern Scale Vest (18, L17), Vampire Hide Armor (26, L21), Wyrm Hide Armor (36, L42).

### Armor Ratio by Tier

| Tier | Warrior (plate) | Rogue (leather) | Mage (cloth) | Cloth:Plate Ratio |
|------|----------------|-----------------|--------------|-------------------|
| T1 | 30 | 9-16 | 5-12 | 17-40% |
| T2 | 60 | 25-29 | 20 | 33% |
| T3 | 102 | 46-58 | 35 | 34% |
| T4 | 156 | 70-88 | 57 | 37% |

Cloth armor provides roughly **one-third** the raw armor values of plate, which is appropriate for a caster/martial split.

---

## 3. AC Pipeline Trace

### Real Game: `tick-combat-resolver.ts`

**The formula (line 1047):**
```typescript
const playerAC = 10 + getModifier(effectiveStats.dex) + getEquipmentAC(character.characterEquipments);
```

**`getEquipmentAC()` (lines 1528-1542):** Iterates all equipped items, calls `calculateItemStats()` on each, sums the `finalStats.armor` value directly. No conversion formula — raw armor values are added to AC.

**`calculateItemStats()` (item-stats.ts):** Applies quality multiplier to base stats:
```
finalStats = baseStats × QUALITY_MULTIPLIER + enchantmentBonuses
```
Quality multipliers: POOR 0.7, COMMON 1.0, FINE 1.15, SUPERIOR 1.3, MASTERWORK 1.5, LEGENDARY 1.8.

**Real-game AC for fully-geared characters (COMMON quality):**

| Class | T1 Armor Sum | Real AC | T2 Sum | Real AC | T3 Sum | Real AC | T4 Sum | Real AC |
|-------|-------------|---------|--------|---------|--------|---------|--------|---------|
| Warrior (DEX +0) | 30 | **40** | 60 | **70** | 102 | **112** | 156 | **166** |
| Rogue (DEX +1/+5) | 9 | **20** | 25 | **40** | 46 | **61** | 88 | **103** |
| Mage (DEX +0) | 5 | **15** | 20 | **30** | 35 | **45** | 57 | **67** |

### Combat Engine: `combat-engine.ts`

**`calculateAC()` (lines 200-241):** Uses `combatant.ac` directly if > 0, then adds status effects (shielded, blessed, etc.) and feat bonuses (Natural Armor). The raw AC value is expected to be pre-computed before combat begins.

**Hit formula:** `d20 + attackMod >= targetAC` (natural 20 always hits = 5% minimum, natural 1 always misses = 95% maximum).

### Sim: `combat-simulator.ts`

**`ARMOR_TIERS` (lines 280-288):** Hardcoded D&D-scale AC values per class per tier. These are NOT derived from recipe data — they're manually assigned approximations.

**`computeEquipmentAC()` (lines 345-360):**
```typescript
const baseAC = ARMOR_TIERS[className].ac[tierIndex];
const acBonus = baseAC - 10;
const scaledAC = 10 + Math.floor(acBonus * TIER_QUALITY[tierIndex]);
// Then adds DEX mod based on armor type:
// heavy: +0, medium: +min(DEX, 2), light/none: +full DEX
```

**TIER_QUALITY:** `[1.0, 1.0, 1.15, 1.5]` — amplifies AC bonus at T3 and T4.

### CRITICAL FINDING: Two Incompatible AC Systems

| System | Scale | Warrior T3 AC | Mage T3 AC | Source |
|--------|-------|---------------|------------|--------|
| **Real game** | Raw armor sum | 112 | 45 | Recipe values summed directly |
| **Sim** | D&D-scale | 19 | 10 | Hardcoded ARMOR_TIERS |
| **Monsters** | D&D-scale | N/A | N/A | attack +15-17 at L35-40 |

The real game sums raw armor values (giving AC 15-166), while monsters have D&D-scale attack mods (+3 to +17). This means:
- In the **real game**, a fully-geared Warrior with AC 112 is essentially unhittable (monsters need d20 roll of 95+ to hit, which is impossible — only natural 20 = 5% hit). A Mage with AC 45 is also nearly unhittable by most monsters.
- In the **sim**, the D&D-scale AC values create realistic hit chances against D&D-scale monster attacks.

**The sim is the calibrated system.** The real game has a deeper armor scaling issue that's out of scope for this audit but should be addressed separately.

---

## 4. Sim Accuracy Check

### ARMOR_TIERS vs What "Should" Be True

The sim's values are D&D-inspired approximations, not derived from recipes. Here's whether they make thematic sense:

| Class | Sim Type | Sim AC [T1,T2,T3,T4] | After Quality Mult + DEX | Thematically Correct? |
|-------|----------|----------------------|--------------------------|----------------------|
| Warrior | heavy | [14, 16, 18, 21] | [14, 16, 19, 26] | YES — plate armor, no DEX |
| Cleric | medium | [13, 15, 17, 19] | [13+0, 15+0, 17+0, 19+0] | Mostly — medium+shield, DEX low |
| Ranger | medium | [12, 14, 16, 18] | [12+1, 14+2, 16+2, 18+2] = [13,16,18,20] | YES — leather+DEX focus |
| Rogue | light | [11, 13, 14, 16] | [11+1, 13+5, 14+5, 16+5] = [12,18,19,21] | QUESTIONABLE — Rogue T2+ AC matches Warrior? |
| Bard | light | [11, 13, 14, 16] | [11+0, 13+0, 14+2, 16+3] = [11,13,16,19] | WRONG — Bard wears cloth, not leather |
| Mage | none | [10, 10, 10, 10] | [10, 10, 10, 10] | **WRONG — cloth armor provides 5-57 raw armor** |
| Psion | none | [10, 10, 10, 10] | [10, 10, 10, 10] | **WRONG — same as mage** |

### Specific Mismatches

1. **Mage/Psion AC = 10 at all tiers** — The sim treats mages as having NO armor at any level. In reality, cloth armor provides non-zero armor values at every tier. Even in D&D terms, Mage Armor spell gives AC 13. The sim should reflect cloth armor's contribution.

2. **Bard typed as 'light' (leather)** — Bards wear cloth, same as Mages. Giving Bard the same armor category as Rogue (leather) inflates Bard AC. This should be 'none' with cloth-equivalent base values slightly above Mage (Bards are more martial than Mages but less than Rogues).

3. **Rogue AC at T2+ approaches Warrior** — After DEX (+5), Rogue T2 AC = 18, T3 = 19, nearly matching Warrior's 16-19. This may be intentional (Rogues dodge) but worth flagging.

4. **Cleric DEX mod** — Cleric has medium armor (max DEX +2) but DEX is 5th priority. At T2+, Cleric DEX mod = 0, so the medium armor classification adds nothing. Consider switching to heavy (they can wear plate + shield).

---

## 5. magicResist Status

### Confirmed: INERT in Combat Engine

**Search results for `magicResist` in combat code:**

| File | Present? | Usage |
|------|----------|-------|
| `server/src/lib/combat-engine.ts` | **NO** | Not referenced |
| `server/src/lib/class-ability-resolver.ts` | **NO** | Not referenced |
| `server/src/lib/monster-ability-resolver.ts` | **NO** | Not referenced |
| `server/src/services/tick-combat-resolver.ts` | **NO** | Not referenced |
| `shared/src/types/combat.ts` | **NO** | Not on Combatant interface |

**Where magicResist DOES exist:**
- `server/src/services/item-stats.ts` — Included in `NUMERIC_STAT_KEYS`, summed when calculating equipment totals. But the total is never read by combat code.
- `shared/src/data/recipes/armor.ts` — Present on nearly all cloth and some plate items as output stats.
- `server/src/services/enchantment-effects.ts` — Can be added via enchantments but still not read in combat.

**Conclusion:** `magicResist` is a completely inert stat. It exists in recipe data and gets summed by item-stats, but no combat system reads or uses it. It has zero effect on gameplay. Per the design decision, this is correct — magic resistance should NOT be a general combat stat.

---

## 6. Proposed Fix: New Cloth Armor Values

### Design Targets (from project owner)

- Mage AC: 11-12 at T1, 12-13 at T2, 13-14 at T3, 14-15 at T4
- Mage solo win rate target: 10-25% (not 50%)
- Fix through ARMOR_TIERS update, not new mechanics

### Proposed ARMOR_TIERS Update

**Current:**
```typescript
mage:  { type: 'none', ac: [10, 10, 10, 10] },
psion: { type: 'none', ac: [10, 10, 10, 10] },
```

**Proposed:**
```typescript
mage:  { type: 'none', ac: [11, 12, 13, 13] },
psion: { type: 'none', ac: [11, 12, 13, 13] },
```

**After quality multiplier (`TIER_QUALITY: [1.0, 1.0, 1.15, 1.5]`) + DEX mod (0 for both):**

| Tier | Base AC | acBonus | × Quality | Final AC | Target |
|------|---------|---------|-----------|----------|--------|
| T1 (L1-9) | 11 | 1 | × 1.0 = 1 | **11** | 11-12 ✓ |
| T2 (L10-29) | 12 | 2 | × 1.0 = 2 | **12** | 12-13 ✓ |
| T3 (L30-54) | 13 | 3 | × 1.15 = 3 | **13** | 13-14 ✓ |
| T4 (L55+) | 13 | 3 | × 1.5 = 4 | **14** | 14-15 ✓ |

### Survivability Math

#### L5 Mage vs Bandit (L3, attack +4, damage 1d6+2 avg 5.5)

Mage HP at L5: ~20 (10 base + 2 HP/level × 5)

| AC | Hit Chance | Damage/Round | Rounds Alive |
|----|-----------|-------------|--------------|
| 10 (current) | 75% | 4.1 | ~4.9 |
| 11 (proposed) | 70% | 3.9 | ~5.2 (+6%) |

**Impact at L5:** Marginal. One extra hit's worth of survival over the fight. Helps slightly against easy monsters where attack mods are low.

#### L5 Mage vs Hollow Sentinel (L5, attack +5, damage 1d6+1 avg 4.5)

| AC | Hit Chance | Damage/Round | Rounds Alive |
|----|-----------|-------------|--------------|
| 10 (current) | 80% | 3.6 | ~5.6 |
| 11 (proposed) | 75% | 3.4 | ~5.9 (+6%) |

**Impact:** -5pp hit chance, ~0.3 fewer hits over 6 rounds ≈ 1.4 HP saved.

#### L40 Mage vs Djinn Lord (L38, attack +17, damage 2d8+5 avg 14)

Mage HP at L40: ~92

| AC | Hit Chance | Damage/Round | Rounds Alive |
|----|-----------|-------------|--------------|
| 10 (current) | 95% (capped) | 13.3 | ~6.9 theoretical |
| 13 (proposed) | 95% (capped) | 13.3 | ~6.9 (IDENTICAL) |

**Impact at L40: ZERO.** Monster attack of +17 means ANY AC below 18 results in 95% hit chance (the cap). AC 13 vs AC 10 makes absolutely no difference against high-level monsters.

To reduce hit chance below 95% against Djinn Lord (+17 attack):
- Need AC ≥ 18: hit chance = (21-(18-17))/20 = 20/20 = 100%... wait
- Formula: hit% = (21 - (AC - atkMod)) / 20
- For +17 attack: hit% = (21 - AC + 17) / 20 = (38 - AC) / 20
- For hit% < 0.95: (38 - AC)/20 < 0.95 → 38 - AC < 19 → AC > 19
- You need **AC 20+** to drop below 95% hit chance vs +17 attack

At AC 20: hit% = 18/20 = 90%. At AC 23: hit% = 15/20 = 75%.

No reasonable cloth AC (11-15) makes a meaningful difference at this level.

#### L25 Mage vs Lich (L25, attack ~+12, damage ~1d10+4 avg 9.5)

Mage HP at L25: ~60

| AC | Hit Chance | Damage/Round | Rounds Alive |
|----|-----------|-------------|--------------|
| 10 (current) | 95% (capped) | 9.0 | ~6.7 |
| 12 (proposed) | 95% (capped) | 9.0 | ~6.7 (IDENTICAL) |

For +12 attack: hit% = (33 - AC)/20. Need AC > 14 to drop below 95%.
At AC 12: (33-12)/20 = 1.05 → capped at 95%. Still no difference.

### Honest Assessment

**AC changes alone will NOT fix caster viability at L25+.** Monster attack mods at these levels are so high (+12 to +17) that cloth AC in the 11-14 range still results in 95% hit chance. The AC fix only provides meaningful benefit at **L1-9** where monster attack mods are +3 to +7.

The caster survivability gap at high levels is driven by:
1. **HP:** Mage 92 HP vs Warrior 178 HP at L40 (2.16× ratio)
2. **DPR:** Warrior 30+ DPR (3 attacks) vs Mage 8-12 DPR (no extra attacks)
3. **Rounds alive:** Warrior ~9 rounds vs Mage ~3 rounds (from diagnostic)

AC is not the primary lever. The main fix vectors are:
- **HP scaling** (increase CLASS_HP_PER_LEVEL for mage/psion from 2 to 3)
- **Damage output** (class ability damage scaling, ability cooldown reduction)
- **Extra attacks** (Warrior gets 3-4, casters get 1 — this alone is a 3× DPR multiplier)

However, the ARMOR_TIERS fix should still be applied because:
1. It's factually wrong to have AC 10 when cloth armor provides non-zero armor
2. It helps at low levels (T1) where most new-player experiences happen
3. It correctly represents the relative armor hierarchy (cloth < leather < plate)

### Proposed Recipe Changes (Optional)

The recipe armor values are actually reasonable for the cloth tier. The problem is the sim ignoring them. However, two slot gaps should be filled:

**New items needed:**

| Item | Tier | Slot | Armor | magicResist | levelToEquip | Rationale |
|------|------|------|-------|-------------|--------------|-----------|
| Silk Leggings | 4 | LEGS | 8 | 14 | 40 | Fill LEGS gap for T3 |
| Enchanted Silk Leggings | 5 | LEGS | 14 | 28 | 70 | Fill LEGS gap for T4 |
| Woven Wool Sash | 3 | OFF_HAND | 2 | 4 | 10 | Fill OFF_HAND gap for T2+ |
| Silk Sash | 4 | OFF_HAND | 4 | 10 | 40 | Fill OFF_HAND gap for T3 |

These would increase cloth armor totals by ~6-18 across tiers, but this only matters for the real game (not the sim, which uses hardcoded values).

---

## 7. Summary

### What Needs to Change

#### In `combat-simulator.ts` (sim fix):
```typescript
// BEFORE:
mage:  { type: 'none', ac: [10, 10, 10, 10] },
psion: { type: 'none', ac: [10, 10, 10, 10] },

// AFTER:
mage:  { type: 'none', ac: [11, 12, 13, 13] },
psion: { type: 'none', ac: [11, 12, 13, 13] },
```

This gives final AC [11, 12, 13, 14] after quality multiplier, matching the design target.

#### In `shared/src/data/recipes/armor.ts` (optional, fills slot gaps):
- Add Silk Leggings (LEGS, armor=8, L40)
- Add Enchanted Silk Leggings (LEGS, armor=14, L70)
- Add Woven Wool Sash (OFF_HAND, armor=2, L10)
- Add Silk Sash (OFF_HAND, armor=4, L40)

### What Does NOT Need to Change
- **Combat engine** (`combat-engine.ts`) — AC formula works correctly
- **Class ability resolver** — Abilities fire correctly (confirmed in diagnostic)
- **HP per level** — Out of scope for this AC audit (but IS the primary lever for caster viability)
- **magicResist** — Correctly inert, should stay that way
- **Recipe armor values for existing items** — Already reasonable

### Known Issues Beyond This Audit's Scope

1. **Real-game AC scale mismatch:** The real game sums raw armor directly (AC 15-166), while monsters use D&D-scale attack values (+3 to +17). In the real game, fully-geared characters of ANY class are nearly unhittable. This is a fundamental system design issue requiring either: (a) armor-to-AC conversion formula, (b) rescaled monster attack values, or (c) armor as damage reduction instead of AC.

2. **Bard typed as 'light' in sim:** Bards wear cloth, not leather. The sim gives Bard the Rogue's armor category, inflating Bard AC. Should be type 'none' with base AC slightly above Mage.

3. **AC alone won't fix L25+ caster viability:** The math proves that any cloth AC (11-15) still results in 95% hit chance against L25+ monsters with +12 to +17 attack. HP scaling and DPR are the real levers. See `audits/caster-diagnostic.md` Section 5 for the full diagnosis.
