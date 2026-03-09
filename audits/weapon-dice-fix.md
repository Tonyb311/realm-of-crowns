# Weapon Dice Fix Audit

**Date:** 2026-03-09
**Bug:** All blacksmith/ranged weapons fell back to 1d4 because `diceCount`/`diceSides` fields were missing from recipe `outputStats`. The combat engine (`road-encounter.ts:310-311`) defaults to 1d4 when these fields are absent.

**Fix:** Added `diceCount`, `diceSides`, `bonusDamage`, `bonusAttack` to all 40 blacksmith weapon recipes and 6 ranged bow recipes. Kept `baseDamage` for backward compat.

**Caster weapons:** Already had dice fields — verified correct, no changes.
**Ammo/consumables:** Use flat `baseDamage` as intended — no changes.
**Starter weapons:** Already had dice fields — no changes.

---

## Blacksmith Weapons (weapons.ts) — 40 recipes

### Tier 1 — Copper (Level 1)

| Weapon | Type | Old baseDmg | New Dice | Avg Dice | +Dmg | +Atk | Total Avg |
|--------|------|-------------|----------|----------|------|------|-----------|
| Copper Dagger | 1H | 4 | 1d4 | 2.5 | 0 | 0 | 2.5 |
| Copper Sword | 1H | 6 | 1d6 | 3.5 | 0 | 0 | 3.5 |
| Copper Mace | 1H | 7 | 1d6 | 3.5 | 0 | 0 | 3.5 |
| Copper Axe | 1H | 7 | 1d6 | 3.5 | 0 | 0 | 3.5 |
| Copper Spear | 1H | 6 | 1d6 | 3.5 | 0 | 0 | 3.5 |

### Tier 2 — Iron (Level 10)

| Weapon | Type | Old baseDmg | New Dice | Avg Dice | +Dmg | +Atk | Total Avg |
|--------|------|-------------|----------|----------|------|------|-----------|
| Iron Dagger | 1H | 8 | 1d6 | 3.5 | 1 | 1 | 4.5 |
| Iron Sword | 1H | 12 | 1d8 | 4.5 | 1 | 1 | 5.5 |
| Iron Longsword | 1H | 14 | 1d8 | 4.5 | 1 | 1 | 5.5 |
| Iron Axe | 1H | 13 | 1d8 | 4.5 | 1 | 1 | 5.5 |
| Iron Mace | 1H | 13 | 1d8 | 4.5 | 1 | 1 | 5.5 |
| Iron Spear | 1H | 11 | 1d8 | 4.5 | 1 | 1 | 5.5 |
| Iron Battleaxe | 2H | 18 | 1d10 | 5.5 | 1 | 1 | 6.5 |
| Iron Warhammer | 2H | 20 | 1d10 | 5.5 | 1 | 1 | 6.5 |

### Tier 3 — Steel (Level 30)

| Weapon | Type | Old baseDmg | New Dice | Avg Dice | +Dmg | +Atk | Total Avg |
|--------|------|-------------|----------|----------|------|------|-----------|
| Steel Dagger | 1H | 14 | 1d8 | 4.5 | 2 | 2 | 6.5 |
| Steel Sword | 1H | 20 | 1d10 | 5.5 | 2 | 2 | 7.5 |
| Steel Longsword | 1H | 24 | 1d10 | 5.5 | 2 | 2 | 7.5 |
| Steel Axe | 1H | 22 | 1d10 | 5.5 | 2 | 2 | 7.5 |
| Steel Mace | 1H | 22 | 1d10 | 5.5 | 2 | 2 | 7.5 |
| Steel Spear | 1H | 18 | 1d10 | 5.5 | 2 | 2 | 7.5 |
| Steel Greatsword | 2H | 32 | 2d6 | 7.0 | 3 | 2 | 10.0 |
| Steel Battleaxe | 2H | 30 | 1d12 | 6.5 | 2 | 2 | 8.5 |
| Steel Warhammer | 2H | 34 | 1d12 | 6.5 | 2 | 2 | 8.5 |
| Steel Halberd | 2H | 28 | 1d12 | 6.5 | 2 | 2 | 8.5 |

### Tier 4 — Mithril (Level 55)

| Weapon | Type | Old baseDmg | New Dice | Avg Dice | +Dmg | +Atk | Total Avg |
|--------|------|-------------|----------|----------|------|------|-----------|
| Mithril Dagger | 1H | 28 | 1d10 | 5.5 | 3 | 3 | 8.5 |
| Mithril Sword | 1H | 30 | 1d12 | 6.5 | 3 | 3 | 9.5 |
| Mithril Longsword | 1H | 36 | 1d12 | 6.5 | 3 | 3 | 9.5 |
| Mithril Rapier | 1H | 34 | 1d12 | 6.5 | 3 | 3 | 9.5 |
| Mithril Greatsword | 2H | 46 | 2d8 | 9.0 | 4 | 3 | 13.0 |
| Mithril Battleaxe | 2H | 44 | 2d6 | 7.0 | 3 | 3 | 10.0 |
| Mithril Warhammer | 2H | 48 | 2d6 | 7.0 | 3 | 3 | 10.0 |
| Mithril Halberd | 2H | 42 | 2d6 | 7.0 | 3 | 3 | 10.0 |

### Tier 5 — Adamantine (Level 75)

| Weapon | Type | Old baseDmg | New Dice | Avg Dice | +Dmg | +Atk | Total Avg |
|--------|------|-------------|----------|----------|------|------|-----------|
| Adamantine Dagger | 1H | 36 | 1d10 | 5.5 | 4 | 4 | 9.5 |
| Adamantine Sword | 1H | 38 | 2d6 | 7.0 | 4 | 4 | 11.0 |
| Adamantine Longsword | 1H | 45 | 2d6 | 7.0 | 4 | 4 | 11.0 |
| Adamantine Rapier | 1H | 44 | 2d6 | 7.0 | 4 | 4 | 11.0 |
| Adamantine Greatsword | 2H | 60 | 2d8 | 9.0 | 5 | 4 | 14.0 |
| Adamantine Battleaxe | 2H | 58 | 2d6 | 7.0 | 5 | 4 | 12.0 |
| Adamantine Warhammer | 2H | 62 | 2d6 | 7.0 | 5 | 4 | 12.0 |
| Adamantine Halberd | 2H | 56 | 2d6 | 7.0 | 5 | 4 | 12.0 |

---

## Ranged Weapons (ranged-weapons.ts) — 6 bows fixed

| Weapon | Tier | Old baseDmg | New Dice | Avg Dice | +Dmg | +Atk | Total Avg |
|--------|------|-------------|----------|----------|------|------|-----------|
| Shortbow | T1 | 6 | 1d6 | 3.5 | 0 | 0 | 3.5 |
| Hunting Bow | T1 | 8 | 1d8 | 4.5 | 0 | 0 | 4.5 |
| Longbow | T2 | 14 | 1d8 | 4.5 | 2 | 1 | 6.5 |
| War Bow | T2 | 16 | 1d10 | 5.5 | 1 | 1 | 6.5 |
| Composite Bow | T3 | 22 | 1d10 | 5.5 | 3 | 2 | 8.5 |
| Ranger's Longbow | T3 | 26 | 1d10 | 5.5 | 3 | 3 | 8.5 |

### Already had dice (unchanged)

| Weapon | Tier | Dice | +Dmg | +Atk |
|--------|------|------|------|------|
| Mithril Longbow | T4 | 1d10 | 3 | 4 |
| Mithril Composite Bow | T4 | 1d12 | 3 | 4 |
| Adamantine Longbow | T5 | 1d12 | 4 | 5 |
| Adamantine War Bow | T5 | 2d6 | 4 | 5 |

### Ammo (unchanged — flat baseDamage as intended)

| Ammo | Tier | baseDamage | Notes |
|------|------|-----------|-------|
| Arrows | T1 | 2 | Flat bonus to bow damage |
| War Arrows | T2 | 4 | Flat bonus to bow damage |
| Barbed Arrows | T3 | 6 | Flat bonus to bow damage |
| Flight Arrows | T3 | 8 | Flat bonus to bow damage |
| Mithril-Tipped Arrows | T4 | 10 | Has bonusDamage: 3 |
| Adamantine Arrows | T5 | 14 | Has bonusDamage: 4 |
| Throwing Knives | T2 | 6 | Consumable, flat damage |

---

## Design Hierarchy Verification

**Daggers < Swords < Greatswords at every tier:** ✅
- T3: 1d8+2 (6.5) < 1d10+2 (7.5) < 2d6+3 (10.0)
- T5: 1d10+4 (9.5) < 2d6+4 (11.0) < 2d8+5 (14.0)

**Two-handed > One-handed at same tier:** ✅
- T2: Battleaxe 1d10+1 (6.5) > Sword 1d8+1 (5.5)
- T4: Greatsword 2d8+4 (13.0) > Sword 1d12+3 (9.5)

**Higher tier > Lower tier for same weapon:** ✅
- Sword: 1d6 (3.5) → 1d8+1 (5.5) → 1d10+2 (7.5) → 1d12+3 (9.5) → 2d6+4 (11.0)

**T1 values match sim WEAPON_TIERS:** ✅
- Copper Sword: 1d6+0/0 matches sim sword T1
- Copper Dagger: 1d4+0/0 matches sim dagger T1
- Shortbow: 1d6+0/0 matches sim bow T1
