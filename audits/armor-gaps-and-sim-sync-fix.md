# Armor Gaps & Sim Sync Fix — Audit Report

**Date:** 2026-03-10
**Prompt:** `prompts/fix-armor-gaps-and-sim-sync.md`

---

## Fix 1: Cloth Armor — Added `armor` Values to TAILOR Recipes

All TAILOR armor recipes now have non-zero `armor` values matching the per-slot, per-tier target table.
All existing `magicResist` values are UNCHANGED.

### T1 Cloth Armor (target sum: 8)

| Recipe | Slot | Old Armor | New Armor | magicResist |
|--------|------|-----------|-----------|-------------|
| Cloth Robes | CHEST | 0 | **3** | 4 |
| Cloth Gloves | HANDS | 0 | **1** | 1 |
| Cloth Boots | FEET | 0 | **1** | 2 |
| Cloth Hood | HEAD | 1 | 1 (no change) | 3 |
| Cloth Sash | OFF_HAND | 1 | 1 (no change) | 2 |
| Cloth Robe | CHEST | 2 | **3** | 5 |
| Wool Trousers | LEGS | 1 | **2** | 3 |

**T1 5-slot sum: HEAD(1) + CHEST(3) + HANDS(1) + LEGS(2) + FEET(1) = 8** ✓

### T2 Linen Armor (target sum: 20, actual: 17 — missing LEGS piece)

| Recipe | Slot | Old Armor | New Armor | magicResist |
|--------|------|-----------|-----------|-------------|
| Linen Hood | HEAD | 0 | **3** | 3 |
| Linen Robes | CHEST | 0 | **7** | 6 |
| Linen Gloves | HANDS | 0 | **2** | 2 |
| Linen Boots | FEET | 0 | **3** | 3 |
| Scholar's Robe | CHEST | 3 | **7** | 8 |
| Traveler's Cloak | CHEST | 4 | **7** | 5 |
| Merchant's Hat | HEAD | 1 | **3** | 5 |
| Herbalist's Apron | CHEST | 2 | **7** | 4 |

**T2 5-slot sum: HEAD(3) + CHEST(7) + HANDS(2) + LEGS(T1 Wool=2) + FEET(3) = 17**
**Gap:** No T2 Linen Leggings recipe exists. Casters use T1 Wool Trousers (armor=2) at T2. Sim updated to 17 to match reality.

### T3 Woven Wool Armor (target sum: 35)

| Recipe | Slot | Old Armor | New Armor | magicResist |
|--------|------|-----------|-----------|-------------|
| Woven Wool Hood | HEAD | 3 | **6** | 5 |
| Woven Wool Robes | CHEST | 5 | **12** | 10 |
| Woven Wool Gloves | HANDS | 2 | **4** | 4 |
| Woven Wool Boots | FEET | 3 | **5** | 5 |
| Woven Wool Leggings | LEGS | 3 | **8** | 5 |
| Woven Wool Cloak | BACK | 2 | 2 (bonus, no change) | 6 |
| Woven Wool Sash | OFF_HAND | 2 | 2 (bonus, no change) | 4 |
| Archmage's Robe | CHEST | 4 | **12** | 14 |
| Diplomat's Regalia | CHEST | 3 | **12** | 12 |
| Silk Hood of Insight | HEAD | 2 | **6** | 10 |
| Noble's Leggings | LEGS | 4 | **8** | 8 |
| Enchanted Cloak | CHEST | 5 | **12** | 16 |

**T3 5-slot sum: HEAD(6) + CHEST(12) + HANDS(4) + LEGS(8) + FEET(5) = 35** ✓

### T4 Silk Armor (target sum: 57)

| Recipe | Slot | Old Armor | New Armor | magicResist |
|--------|------|-----------|-----------|-------------|
| Silk Hood | HEAD | 6 | **10** | 12 |
| Silk Robes | CHEST | 10 | **20** | 22 |
| Silk Gloves | HANDS | 4 | **6** | 8 |
| Silk Boots | FEET | 6 | **8** | 12 |
| Silk Leggings | LEGS | 8 | **13** | 14 |
| Silk Cloak | BACK | 4 | 4 (bonus, no change) | 14 |
| Silk Sash | OFF_HAND | 4 | 4 (bonus, no change) | 10 |

**T4 5-slot sum: HEAD(10) + CHEST(20) + HANDS(6) + LEGS(13) + FEET(8) = 57** ✓

### T5 Enchanted Silk (not tracked in sim T1-T4, no changes made)

Sum: HEAD(10) + CHEST(16) + HANDS(8) + LEGS(14) + FEET(10) = 58

---

## Fix 2: Leather Armor — 3 New Tanner T1 Recipes

### New Recipes Added

| Recipe | Slot | Tier | Armor | levelToEquip | dexBonus |
|--------|------|------|-------|-------------|----------|
| Cured Leather Cap | HEAD | 1 | 3 | 1 | 1 |
| Cured Leather Tunic | CHEST | 1 | 5 | 1 | 2 |
| Cured Leather Leggings | LEGS | 1 | 4 | 1 | 1 |

### Item Names Added to `item-names.ts`

- `CURED_LEATHER_CAP: 'Cured Leather Cap'`
- `CURED_LEATHER_TUNIC: 'Cured Leather Tunic'`
- `CURED_LEATHER_LEGGINGS: 'Cured Leather Leggings'`

### T1 Leather Total (best loadout for L1 rogue/ranger)

| Slot | Source | Armor |
|------|--------|-------|
| HEAD | Cured Leather Cap (new) | 3 |
| CHEST | Cured Leather Tunic (new) | 5 |
| LEGS | Cured Leather Leggings (new) | 4 |
| HANDS | Leather Gloves (LW, existing) | 1 |
| FEET | Leather Boots (LW, existing) | 2 |
| **Total** | | **15** |

Sim updated: rogue T1 = 15 (was 12), ranger T1 = 15 (was 20).

### Leather Coverage Gaps at Higher Tiers (noted, not fixed)

| Tier | HEAD | CHEST | HANDS | LEGS | FEET | Sum | Old Sim Rogue | Old Sim Ranger |
|------|------|-------|-------|------|------|-----|---------------|----------------|
| T1 | 3 | 5 | 1 | 4 | 2 | **15** | 12 | 20 |
| T2 | 3 | 5 | 3 | 3 | 4 | **18** | 27 | 40 |
| T3 | 4 | 10 | 5 | 7 | 6 | **32** | 52 | 70 |
| T4 | 8 | 14 | 6 | 12 | 10 | **50** | 80 | 110 |

The old sim values were aspirational — T2-T4 had double or more the actual recipe sums. Updated to match reality. Both rogue and ranger equip the same leather gear; the AC formula handles the difference via light/medium K coefficients.

---

## Fix 3: Sim Weapon Tiers & Armor Values Updated

### WEAPON_TIERS Changes (caster weapons synced to actual recipes)

| Weapon | Tier | Old Dice | New Dice | Old Atk | New Atk |
|--------|------|----------|----------|---------|---------|
| staff | T1 | 1d4+0 | **1d6+0** | +0 | +0 |
| staff | T2 | 1d6+1 | **1d8+1** | +1 | +1 |
| staff | T3 | 1d6+2 | **1d8+2** | +2 | **+3** |
| staff | T4 | 1d8+3 | **1d10+3** | +3 | **+4** |
| holy_symbol | T1 | 1d4+0 | 1d4+0 | +0 | +0 |
| holy_symbol | T2 | 1d4+1 | **1d6+1** | +1 | +1 |
| holy_symbol | T3 | 1d6+2 | 1d6+2 | +2 | +2 |
| holy_symbol | T4 | 1d6+3 | **1d8+3** | +3 | +3 |
| instrument | T1 | 1d4+0 | **1d6+0** | +0 | +0 |
| instrument | T2 | 1d6+1 | **1d8+1** | +1 | +1 |
| instrument | T3 | 1d6+2 | **1d8+2** | +2 | **+3** |
| instrument | T4 | 1d8+3 | **1d10+3** | +3 | **+4** |
| orb | T1 | 1d4+0 | 1d4+0 | +0 | +0 |
| orb | T2 | 1d4+1 | **1d6+1** | +1 | +1 |
| orb | T3 | 1d6+2 | 1d6+2 | +2 | +2 |
| orb | T4 | 1d6+3 | **1d8+3** | +3 | +3 |

**Pattern:** Staff and instrument (2H) now have larger dice than orb and holy_symbol (1H), matching recipe design.

### RAW_ARMOR_BY_CLASS_TIER Changes

| Class | T1 | T2 | T3 | T4 | Notes |
|-------|----|----|----|----|-------|
| warrior | 30→30 | 60→60 | 102→102 | 156→156 | No change |
| cleric | 30→30 | 60→60 | 102→102 | 156→156 | No change |
| ranger | 20→**15** | 40→**18** | 70→**32** | 110→**50** | Synced to actual leather recipe sums |
| rogue | 12→**15** | 27→**18** | 52→**32** | 80→**50** | Synced to actual leather recipe sums |
| bard | 8→8 | 20→**17** | 37→**35** | 60→**57** | Synced to actual cloth recipe sums |
| mage | 8→8 | 20→**17** | 35→35 | 57→57 | T2 gap: no Linen Leggings |
| psion | 8→8 | 20→**17** | 35→35 | 57→57 | T2 gap: no Linen Leggings |

---

## Remaining Coverage Gaps (future work via profession-economy-master.yaml)

1. **No T2 Linen Leggings** — Casters use T1 Wool Trousers at T2. Creates a 3-point gap (17 vs 20 target). Recommend adding `Linen Leggings` recipe to TAILOR at L5-6.
2. **Leather T2-T4 sums much lower than old aspirational values** — The original sim values assumed armor that doesn't exist in recipes. Now synced to reality. If leather classes feel too squishy, create more leather armor recipes rather than inflating sim values.
3. **Rogue and ranger use identical raw armor** — They equip the same gear; the AC formula handles the difference via armor type K coefficients (light=0.30 vs medium=0.40).

---

## Files Modified

| File | Changes |
|------|---------|
| `shared/src/data/recipes/armor.ts` | 25 TAILOR armor values updated, 3 new TANNER recipes added |
| `shared/src/data/items/item-names.ts` | 3 new item names (CURED_LEATHER_CAP/TUNIC/LEGGINGS) |
| `server/src/services/combat-simulator.ts` | WEAPON_TIERS (4 weapon types), RAW_ARMOR_BY_CLASS_TIER (5 classes) |

## Verification

- `npx tsc --build shared/tsconfig.json` ✓
- `npx tsc -p server/tsconfig.build.json --noEmit` ✓
- `cd client && npx tsc --noEmit` ✓
