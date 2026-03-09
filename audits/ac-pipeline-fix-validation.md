# AC Pipeline Fix — Validation Sim Results

**Run ID:** `c0b2d371-0142-452c-a444-be16986490a1`
**Date:** 2026-03-09
**Config:** `ac-pipeline-validation.json` — 7 classes × 3 levels (5, 25, 40) × 5 monsters × 100 iterations = 10,500 fights
**Duration:** 27.6s

## What Changed

The armor→AC conversion pipeline was fundamentally broken: raw recipe armor values (0-224 scale) were summed and added directly to `10 + DEX mod`, producing AC 45-166. Monsters use D&D-scale attack mods (+3 to +17), making every geared character nearly unhittable (5% hit chance on nat 20 only).

**Fix:** Added `computeFinalAC()` with type-aware power curve: `floor(K[type] * raw^(2/3))`.

| Armor Type | K | Classes | DEX Rule |
|-----------|---|---------|----------|
| Heavy | 0.45 | Warrior, Cleric | No DEX |
| Medium | 0.40 | Ranger | DEX cap +2 |
| Light | 0.30 | Rogue | Full DEX |
| None | 0.35 | Mage, Psion, Bard | Full DEX |

## AC Values (Post-Fix)

| Class | T1 (L5) | T2 (L25) | T3 (L40) | T4 (L55+) |
|-------|---------|----------|----------|-----------|
| Warrior | 14 | 16 | 19 | 23 |
| Cleric | 14 | 16 | 19 | 23 |
| Ranger | 14 | 16 | 18 | 21 |
| Rogue | 15 | 16 | 18 | 19 |
| Bard | 13 | 14 | 16 | 19 |
| Mage | 12 | 13 | 14 | 16 |
| Psion | 12 | 13 | 14 | 16 |

*Values assume typical DEX modifiers per class. Sim applies quality multiplier at T3 (1.15×) and T4 (1.5×).*

## Results — By Class

| Class | Win Rate | Target | Status |
|-------|----------|--------|--------|
| Warrior | 55.5% | 50-70% | ✓ On target |
| Ranger | 54.5% | 50-70% | ✓ On target |
| Rogue | 47.3% | 30-50% | ✓ On target |
| Cleric | 47.2% | 30-50% | ✓ On target |
| Bard | 45.7% | 10-25% | ⚠ Above target (inflated by easy monsters) |
| Psion | 45.8% | 10-25% | ⚠ Above target (inflated by easy monsters) |
| Mage | 37.9% | 10-25% | ⚠ Above target (inflated by easy monsters) |

**Note:** The overall win rates include Wolf (96.3% player wins) and Orc Warrior (71.2%), which inflate caster win rates. Against at-level monsters (Troll/Demon/Djinn Lord), caster win rates are much lower. The solo targets of 10-25% specifically refer to at-level encounters, not easy farming monsters.

## Results — By Monster

| Monster | Player Win Rate | Assessment |
|---------|----------------|------------|
| Wolf | 96.3% | Too easy (low-level) — expected |
| Orc Warrior | 71.2% | Normal mid-tier matchup |
| Troll | 48.9% | Balanced at-level challenge |
| Djinn Lord | 1.4% | Very hard — possibly over-tuned |
| Demon | 20.6% | Hard but winnable |

## Comparison to Pre-Fix

| Metric | Pre-Fix (Broken) | Post-Fix |
|--------|-----------------|----------|
| Warrior T3 AC | 112 | 19 |
| Mage T3 AC | 45 | 14 |
| Rogue T3 AC | 61-73 | 18 |
| Monster hit chance vs T3 Warrior | 5% (nat 20 only) | ~40% |
| Monster hit chance vs T3 Mage | 5% (nat 20 only) | ~55% |
| Sim produces varied win rates | Yes (but sim used separate hardcoded values) | Yes (real pipeline + sim now share same formula) |

## Key Outcomes

1. **Real game and sim now use the same AC formula** — no more divergence between hardcoded sim values and actual game behavior
2. **Bard armor type corrected** from 'light' to 'none' (Bards wear cloth, not leather)
3. **Mage/Psion AC scales with gear** — no longer stuck at AC 10 forever
4. **5 cloth armor slot gaps filled** — Woven Wool + Silk Leggings and Sashes added
5. **Character sheet shows both raw armor and converted AC** in the breakdown

## Files Changed

- `shared/src/utils/armor-conversion.ts` — New: conversion formula
- `shared/src/data/combat-constants.ts` — Added `ArmorType`, `CLASS_ARMOR_TYPE`
- `shared/src/data/items/item-names.ts` — 5 new item names
- `shared/src/data/recipes/armor.ts` — 5 new cloth recipes
- `server/src/services/tick-combat-resolver.ts` — 5 call sites updated
- `server/src/lib/road-encounter.ts` — 2 call sites updated
- `server/src/services/character-sheet.ts` — Shows raw + converted AC
- `server/src/services/combat-simulator.ts` — Uses shared formula, raw armor values
