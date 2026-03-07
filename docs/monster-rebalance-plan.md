# Monster Rebalance Plan — All 129 Monsters

**Date:** 2026-03-06
**Based on:** `docs/audit-monster-balance.md` + corrected weapon tier mapping

---

## Corrected Warrior Stats (Human, STR priority)

Weapon tiers now match real game: Copper(L1) → Iron(L10) → Steel(L30) → Mithril(L55)

| Level | STR Mod | Prof | Weapon | Atk Bonus | Attacks | Avg Dmg/Hit | HP | AC |
|------:|--------:|-----:|--------:|----------:|--------:|------------:|---:|---:|
| 1 | 0 | 2 | 1d6+0 | +2 | 1 | 3.5 | 20 | 14 |
| 3 | 0 | 2 | 1d6+0 | +2 | 1 | 3.5 | 28 | 14 |
| 5 | 0 | 3 | 1d6+0 | +3 | 1 | 3.5 | 36 | 14 |
| 8 | 1 | 3 | 1d6+0 | +4 | 1 | 4.5 | 48 | 14 |
| 10 | 1 | 4 | 1d8+1 | +6 | 1 | 6.5 | 56 | 16 |
| 13 | 2 | 4 | 1d8+1 | +7 | 2 | 7.5 | 68 | 16 |
| 15 | 2 | 5 | 1d8+1 | +8 | 2 | 7.5 | 76 | 16 |
| 20 | 3 | 6 | 1d8+1 | +10 | 2 | 8.5 | 96 | 16 |
| 25 | 4 | 6 | 1d8+1 | +11 | 2 | 9.5 | 116 | 16 |
| 30 | 5 | 7 | 1d10+2 | +14 | 2 | 12.5 | 136 | 18 |
| 35 | 5 | 7 | 1d10+2 | +14 | 3 | 12.5 | 156 | 18 |
| 40 | 5 | 8 | 1d10+2 | +15 | 3 | 12.5 | 177 | 18 |
| 45 | 5 | 8 | 1d10+2 | +15 | 4 | 12.5 | 198 | 18 |
| 50 | 5 | 8 | 1d10+2 | +15 | 4 | 12.5 | 219 | 18 |

### Effective DPR (accounts for ability tax)

Single-attack levels (L1-12): eDPR ≈ raw DPR × 1.1
Multi-attack levels (L13+): eDPR ≈ raw DPR × 0.45

| Level | vs AC 12 | vs AC 14 | vs AC 16 | vs AC 18 | vs AC 20 | vs AC 22 | vs AC 24 |
|------:|---------:|---------:|---------:|---------:|---------:|---------:|---------:|
| 1 | 2.1 | 1.7 | 1.3 | — | — | — | — |
| 3 | 2.1 | 1.7 | 1.3 | — | — | — | — |
| 5 | 2.3 | 1.9 | 1.5 | — | — | — | — |
| 8 | 3.2 | 2.7 | 2.2 | 1.7 | — | — | — |
| 10 | 5.4 | 4.6 | 3.9 | 3.2 | 2.5 | — | — |
| 13 | — | — | 4.1 | 3.4 | 2.7 | — | — |
| 15 | — | — | 4.4 | 3.7 | 3.1 | 2.4 | — |
| 20 | — | — | 5.8 | 5.0 | 4.2 | 3.5 | — |
| 25 | — | — | 6.8 | 6.0 | 5.1 | 4.3 | 3.4 |
| 30 | — | — | — | 9.6 | 8.4 | 7.3 | 6.2 |
| 35 | — | — | — | 14.3 | 12.7 | 11.0 | 9.3 |
| 40 | — | — | — | 15.2 | 13.5 | 11.8 | 10.1 |
| 45 | — | — | — | 20.3 | 18.0 | 15.8 | 13.5 |
| 50 | — | — | — | 20.3 | 18.0 | 15.8 | 13.5 |

---

## Design Rules

| Tier | Level | Mid Rounds | Hit% Target | AC Cap |
|------|:-----:|:----------:|:-----------:|:------:|
| T1 | 1-5 | 8 | 65% | atkBonus + 8 |
| T2 | 5-10 | 9 | 65% | atkBonus + 8 |
| T3 | 10-20 | 10 | 60% | atkBonus + 9 |
| T4 | 17-30 | 10.5 | 60% | atkBonus + 9 |
| T5 | 31-40 | 11.5 | 55% | atkBonus + 10 |
| T6 | 41-50 | 12.5 | 55% | atkBonus + 10 |

Role multiplier: grunt(0-1 abilities) ×0.8, elite(2-3) ×1.0, boss(4+ or legendary) ×1.2

**Monster HP formula:** eDPR_at_level_vs_newAC × midRounds × roleMult

**Damage scaling:** Only reduce if monster kills warrior in < targetSurvival rounds (T1: 8-14, T2: 7-12, T3: 6-10, T4: 5-9, T5: 5-8, T6: 4-7).

**Ability rules:**
- Multiattack cd:0 → cd:1 (except T1-T2 where it's 2-attack only)
- Damage auras: remove from T1-T3, keep in T4+ but reduce dice
- Regen: cap at 50% of eDPR at that level
- Save DCs: cap at warrior save + 10 (= prof + 0 WIS + 10 at most levels)

---

## Tier 1 (Level 1-5) — 20 monsters

L1 balance is already good (83% warrior win). Light AC adjustments only for L3-5 monsters with AC > atkBonus+8.

AC caps: L1-3(+2)→10, L4(+2)→10, L5(+3)→11.

| # | Monster | Lvl | Role | Old HP | New HP | Old AC | New AC | Old Dmg | New Dmg | Ability Changes |
|---|---------|----:|:----:|-------:|-------:|-------:|-------:|---------|---------|-----------------|
| 1 | Goblin | 1 | grunt | 24 | 24 | 12 | 10 | 1d4+1 | 1d4+1 | — |
| 2 | Giant Rat | 1 | grunt | 18 | 18 | 12 | 10 | 1d4+1 | 1d4+1 | — |
| 3 | Dustjaw Hyena | 1 | grunt | 18 | 18 | 11 | 10 | 1d4+1 | 1d4+1 | — |
| 4 | Wolf | 2 | grunt | 15 | 15 | 11 | 10 | 1d6+1 | 1d6+1 | — |
| 5 | Slime | 2 | grunt | 15 | 15 | 8 | 8 | 1d6 | 1d6 | — |
| 6 | Bone Rattler | 2 | grunt | 16 | 16 | 11 | 10 | 1d6+1 | 1d6+1 | — |
| 7 | Thornvine Creeper | 2 | grunt | 20 | 20 | 10 | 10 | 1d6 | 1d6 | — |
| 8 | Bandit | 3 | grunt | 20 | 20 | 12 | 10 | 1d6+2 | 1d6+2 | — |
| 9 | Mana Wisp | 3 | grunt | 16 | 16 | 13 | 10 | 1d6+1 | 1d6+1 | — |
| 10 | Tide Crab | 3 | grunt | 16 | 16 | 14 | 10 | 1d4+2 | 1d4+2 | — |
| 11 | Ember Beetle | 3 | grunt | 15 | 15 | 13 | 10 | 1d4+1 | 1d4+1 | — |
| 12 | Frost Mote | 3 | grunt | 14 | 14 | 13 | 10 | 1d6 | 1d6 | — |
| 13 | Shambling Corpse | 3 | grunt | 25 | 25 | 8 | 8 | 1d6+1 | 1d6+1 | — |
| 14 | Prairie Stalker | 3 | grunt | 18 | 18 | 12 | 10 | 1d6+1 | 1d6+1 | — |
| 15 | Bog Wraith | 4 | grunt | 22 | 22 | 12 | 10 | 1d6+2 | 1d6+2 | — |
| 16 | Glimmerfae | 4 | grunt | 14 | 14 | 14 | 10 | 1d4+2 | 1d4+2 | — |
| 17 | Bloodwing Stirge | 4 | grunt | 12 | 12 | 13 | 10 | 1d4+2 | 1d4+2 | — |
| 18 | Sand Viper | 4 | grunt | 16 | 16 | 13 | 10 | 1d6+2 | 1d6+2 | — |
| 19 | Hollow Sentinel | 5 | grunt | 28 | 20 | 15 | 11 | 1d8+2 | 1d6+1 | — |
| 20 | Brambleback Toad | 5 | elite | 30 | 22 | 11 | 11 | 1d8+2 | 1d6+1 | — |

Notes: HP kept at current for L1-4 (already balanced). L5 Hollow Sentinel/Brambleback reduced. AC reduced to cap for several mid-T1 monsters. Damage reduced for L5 monsters to extend fight length.

---

## Tier 2 (Level 5-10) — 18 monsters

L5 warrior: +3 atk, 1d6, 1 attack, eDPR ~2.1 vs AC 11. AC cap = 11.
L8 warrior: +4 atk, 1d6, 1 attack, eDPR ~2.7 vs AC 12. AC cap = 12.

HP targets: eDPR × 9 × roleMult
- L5 grunt: 2.1 × 9 × 0.8 = 15
- L5 elite: 2.1 × 9 × 1.0 = 19
- L6 grunt: ~2.3 × 9 × 0.8 = 17
- L7 grunt: ~2.5 × 9 × 0.8 = 18
- L7 elite: ~2.5 × 9 × 1.0 = 23
- L8 grunt: ~2.7 × 9 × 0.8 = 19
- L8 elite: ~2.7 × 9 × 1.0 = 24
- L9 elite: ~3.0 × 9 × 1.0 = 27
- L9 grunt: ~3.0 × 9 × 0.8 = 22

| # | Monster | Lvl | Role | Old HP | New HP | Old AC | New AC | Old Dmg | New Dmg | Ability Changes |
|---|---------|----:|:----:|-------:|-------:|-------:|-------:|---------|---------|-----------------|
| 21 | Skeleton Warrior | 5 | grunt | 40 | 15 | 15 | 11 | 1d10+3 | 1d6+2 | — |
| 22 | Ghoul Stalker | 5 | grunt | 38 | 15 | 13 | 11 | 1d8+2 | 1d6+1 | — |
| 23 | Orc Warrior | 6 | grunt | 46 | 17 | 15 | 11 | 1d10+3 | 1d6+2 | Multiattack cd 1 → NO CHANGE (already cd:1) |
| 24 | Dune Scorpion | 6 | elite | 45 | 21 | 14 | 11 | 1d10+3 | 1d6+2 | — |
| 25 | Tidal Elemental | 6 | grunt | 48 | 17 | 13 | 11 | 1d10+2 | 1d6+1 | — |
| 26 | Giant Spider | 7 | elite | 38 | 23 | 13 | 12 | 1d10+3 | 1d8+2 | — |
| 27 | Arcane Elemental | 7 | grunt | 48 | 18 | 14 | 12 | 1d10+3 | 1d8+2 | — |
| 28 | Stoneclaw Gargoyle | 7 | grunt | 55 | 18 | 16 | 12 | 1d10+3 | 1d8+2 | — |
| 29 | Hooktusk | 7 | grunt | 60 | 18 | 14 | 12 | 2d6+3 | 1d8+2 | Multiattack cd 0 → cd 1 |
| 30 | Harrowsong Harpy | 7 | grunt | 42 | 18 | 13 | 12 | 1d8+3 | 1d6+2 | — |
| 31 | Dire Wolf | 8 | grunt | 45 | 19 | 14 | 12 | 2d8+3 | 1d8+2 | — |
| 32 | Lavamaw Salamander | 8 | grunt | 65 | 19 | 14 | 12 | 2d6+4 | 1d8+2 | Remove damage aura (Heat Aura) |
| 33 | Frostfang Wolf | 8 | grunt | 55 | 19 | 14 | 12 | 2d6+3 | 1d8+2 | — |
| 34 | Ironhide Ogre | 8 | grunt | 70 | 19 | 13 | 12 | 2d8+4 | 1d8+3 | — |
| 35 | Troll | 9 | elite | 75 | 27 | 12 | 12 | 2d6+4 | 1d8+3 | Rend multiattack cd 0 → cd 1. Regen 10→5 hp/turn |
| 36 | Shadow Wraith | 9 | elite | 45 | 27 | 15 | 12 | 2d6+3 | 1d8+2 | — |
| 37 | Broodmother Spider | 9 | boss | 68 | 32 | 14 | 12 | 2d6+3 | 1d8+2 | Frenzy multiattack cd 0 → cd 1, attacks 3→2 |
| 38 | Rust Lurker | 9 | grunt | 50 | 22 | 14 | 12 | 2d6+2 | 1d8+1 | — |

Notes: Massive HP reductions across the board. T2 monsters had 2-4x too much HP. AC universally reduced to allow 65% hit rate. Damage reduced to 1d6-1d8 range. Multiattack cooldown 0 changed to 1.

---

## Tier 3 (Level 10-20) — 24 monsters

L10: +6 atk, 1d8+1, 1 attack, eDPR vs AC 15 = 3.9×1.1 = 4.3. AC cap = 15.
L13: +7 atk, 1d8+1, 2 attacks, eDPR vs AC 16 = 9.0×0.45 = 4.1. AC cap = 16.
L15: +8 atk, 2 attacks, eDPR vs AC 16 = 9.8×0.45 = 4.4. AC cap = 17.
L20: +10 atk, 2 attacks, eDPR vs AC 16 = 12.8×0.45 = 5.8. AC cap = 19.

HP targets: eDPR × 10 × roleMult
- L10 grunt: 4.3 × 10 × 0.8 = 34
- L10 elite: 4.3 × 10 × 1.0 = 43
- L11 grunt: ~4.3 × 10 × 0.8 = 34
- L11 elite: ~4.3 × 10 × 1.0 = 43
- L12 grunt: ~4.3 × 10 × 0.8 = 34
- L12 elite: ~4.3 × 10 × 1.0 = 43
- L13 grunt: 4.1 × 10 × 0.8 = 33
- L13 elite: 4.1 × 10 × 1.0 = 41
- L14 grunt: ~4.2 × 10 × 0.8 = 34
- L14 elite: ~4.2 × 10 × 1.0 = 42
- L14 boss: ~4.2 × 10 × 1.2 = 50
- L15 grunt: 4.4 × 10 × 0.8 = 35
- L15 elite: 4.4 × 10 × 1.0 = 44
- L16 grunt: ~4.5 × 10 × 0.8 = 36
- L16 elite: ~4.5 × 10 × 1.0 = 45
- L16 boss: ~4.5 × 10 × 1.2 = 54
- L17 grunt: ~4.7 × 10 × 0.8 = 38
- L18 grunt: ~4.9 × 10 × 0.8 = 39
- L18 boss: ~4.9 × 10 × 1.2 = 59
- L19 grunt: ~5.1 × 10 × 0.8 = 41
- L20 boss: 5.8 × 10 × 1.2 = 70

| # | Monster | Lvl | Role | Old HP | New HP | Old AC | New AC | Old Dmg | New Dmg | Ability Changes |
|---|---------|----:|:----:|-------:|-------:|-------:|-------:|---------|---------|-----------------|
| 39 | Sandscale Basilisk | 10 | grunt | 110 | 34 | 15 | 15 | 2d8+3 | 1d8+2 | — |
| 40 | Thornwarden | 11 | elite | 115 | 43 | 15 | 15 | 2d8+3 | 1d8+2 | Regen 8→3 hp/turn |
| 41 | Razormane Manticore | 11 | elite | 145 | 43 | 16 | 15 | 2d8+4 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 42 | Crypt Warden | 11 | grunt | 115 | 34 | 16 | 15 | 2d8+3 | 1d8+2 | — |
| 43 | Dune Revenant | 12 | grunt | 120 | 34 | 15 | 15 | 2d8+3 | 1d8+2 | — |
| 44 | Ancient Golem | 12 | elite | 140 | 43 | 19 | 15 | 2d10+5 | 1d10+3 | Multiattack cd 0 → cd 1. LegendaryActions 2→0, LegendaryResistances 2→0 |
| 45 | Cyclops Brute | 12 | grunt | 125 | 34 | 14 | 14 | 2d8+4 | 1d8+3 | — |
| 46 | Tidecaller Siren | 13 | elite | 115 | 41 | 15 | 15 | 2d8+3 | 1d8+2 | — |
| 47 | Magma Crawler | 13 | grunt | 125 | 33 | 16 | 16 | 2d8+4 | 1d8+3 | Remove damage aura (Molten Shell) |
| 48 | Void Stalker | 13 | elite | 110 | 41 | 17 | 16 | 2d8+5 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 49 | Young Dragon | 14 | boss | 150 | 50 | 18 | 16 | 2d10+6 | 1d10+4 | Multiattack cd 0 → cd 1, attacks 3→2. LegendaryActions 1→0, LegendaryResistances 1→0. Cold Breath 12d6→6d6 |
| 50 | Steppe Lion | 14 | elite | 130 | 42 | 15 | 15 | 2d8+4 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 51 | Cairn Specter | 14 | elite | 150 | 42 | 16 | 16 | 2d8+4 | 1d8+3 | — |
| 52 | Hydra | 15 | elite | 160 | 44 | 15 | 15 | 3d6+4 | 1d8+3 | Multiattack 5 heads → 3, cd 0 → cd 1 |
| 53 | Mire Hulk | 15 | elite | 170 | 44 | 16 | 16 | 2d8+4 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 54 | Demon | 16 | boss | 130 | 54 | 17 | 16 | 2d8+6 | 1d8+4 | Multiattack cd 0 → cd 1. Remove Fire Aura (damage_aura). Infernal Blaze 8d6→4d6. LegendaryActions 2→1, LegendaryResistances 1→0 |
| 55 | Gorgon Bull | 16 | elite | 180 | 45 | 17 | 16 | 2d10+5 | 1d10+3 | — |
| 56 | Remorhaz Burrower | 16 | grunt | 150 | 36 | 17 | 16 | 2d8+5 | 1d8+3 | Remove damage aura (Heated Body) |
| 57 | Elder Fey Guardian | 16 | boss | 135 | 54 | 17 | 16 | 2d10+5 | 1d10+3 | Radiant Burst 6d8→3d8. LegendaryActions 2→1, LegendaryResistances 1→0 |
| 58 | Prairie Centaur | 17 | elite | 145 | 47 | 16 | 16 | 2d8+5 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 59 | Lich | 18 | boss | 120 | 59 | 17 | 17 | 3d6+5 | 1d10+3 | Para Touch DC 18→15. Necrotic Bolt 4d8+5→2d8+3. LegendaryActions 3→1, LegendaryResistances 3→1. Phase transitions: keep 1, remove 2 and 3 |
| 60 | Feywild Enchantress | 18 | boss | 200 | 59 | 17 | 17 | 2d8+5 | 1d8+3 | LegendaryActions 2→1, LegendaryResistances 1→0 |
| 61 | Chuul Predator | 19 | elite | 155 | 51 | 17 | 17 | 3d6+5 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 62 | Mind Flayer | 20 | boss | 120 | 70 | 16 | 16 | 2d8+4 | 1d8+3 | Mind Blast 6d8→3d8, DC 17→14. Extract Brain 10d10→5d8. Psychic Grasp DC 17→14 |

Notes: Huge HP reductions (60-75%). AC capped to ensure 60% hit rate. All multiattack cd:0 → cd:1. Legendary actions/resistances drastically reduced at T3 (these are mid-game monsters, not endgame). Damage auras removed from T3. Boss ability damage halved.

---

## Tier 4 (Level 17-30) — 28 monsters

L20: eDPR 5.8 vs AC 16, AC cap 19
L25: eDPR 6.0 vs AC 18, AC cap 20
L30: eDPR 8.4 vs AC 20, AC cap 23

HP targets: eDPR × 10.5 × roleMult
- L17 grunt: ~4.7 × 10.5 × 0.8 = 39
- L19 grunt: ~5.1 × 10.5 × 0.8 = 43
- L19 elite: ~5.1 × 10.5 × 1.0 = 54
- L20 elite: 5.8 × 10.5 × 1.0 = 61
- L20 boss: 5.8 × 10.5 × 1.2 = 73
- L21 grunt: ~5.8 × 10.5 × 0.8 = 49
- L21 boss: ~5.8 × 10.5 × 1.2 = 73
- L22 elite: ~6.0 × 10.5 × 1.0 = 63
- L22 boss: ~6.0 × 10.5 × 1.2 = 76
- L23 elite: ~6.2 × 10.5 × 1.0 = 65
- L23 boss: ~6.2 × 10.5 × 1.2 = 78
- L24 elite: ~6.4 × 10.5 × 1.0 = 67
- L24 boss: ~6.4 × 10.5 × 1.2 = 81
- L25 grunt: ~6.0 × 10.5 × 0.8 = 50
- L25 boss: ~6.0 × 10.5 × 1.2 = 76
- L26 grunt: ~6.2 × 10.5 × 0.8 = 52
- L26 boss: ~6.2 × 10.5 × 1.2 = 78
- L27 grunt: ~6.4 × 10.5 × 0.8 = 54
- L27 elite: ~6.4 × 10.5 × 1.0 = 67
- L28 grunt: ~6.6 × 10.5 × 0.8 = 55
- L28 boss: ~6.6 × 10.5 × 1.2 = 83
- L29 grunt: ~6.8 × 10.5 × 0.8 = 57
- L29 boss: ~6.8 × 10.5 × 1.2 = 86
- L30 boss: 8.4 × 10.5 × 1.2 = 106

| # | Monster | Lvl | Role | Old HP | New HP | Old AC | New AC | Old Dmg | New Dmg | Ability Changes |
|---|---------|----:|:----:|-------:|-------:|-------:|-------:|---------|---------|-----------------|
| 63 | Wyvern | 17 | elite | 130 | 49 | 15 | 15 | 2d8+5 | 1d8+3 | — |
| 64 | Thornfang Wyvern | 19 | elite | 160 | 54 | 17 | 17 | 3d6+5 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 65 | Treant | 18 | elite | 150 | 51 | 16 | 16 | 2d10+5 | 1d10+3 | Regen 8→4 hp/turn |
| 66 | Chimera | 19 | elite | 140 | 54 | 15 | 15 | 2d8+5 | 1d8+3 | Triple Maw multiattack attacks 3→2, cd 0 → cd 1 |
| 67 | Sandstorm Djinn | 20 | elite | 210 | 61 | 18 | 18 | 2d10+5 | 1d10+3 | — |
| 68 | Mind Flayer | 20 | boss | — | — | — | — | — | — | (already in T3 list above) |
| 69 | Bone Fiend | 21 | elite | 175 | 61 | 18 | 18 | 2d10+5 | 1d10+3 | — |
| 70 | Vampire Lord | 21 | boss | 155 | 73 | 17 | 17 | 2d8+5 | 1d8+3 | Vampiric Charm DC 17→14 |
| 71 | Hill Ettin | 21 | grunt | 180 | 49 | 17 | 17 | 2d10+5 | 1d10+3 | — |
| 72 | Frost Giant | 22 | boss | 175 | 76 | 16 | 16 | 3d8+6 | 2d8+4 | LegendaryActions 1→0. Freeze Stomp dc→13 |
| 73 | Sea Serpent | 22 | elite | 165 | 63 | 16 | 16 | 2d10+5 | 1d10+3 | — |
| 74 | Fey Dragon | 22 | elite | 145 | 63 | 17 | 17 | 2d8+5 | 1d8+3 | Multiattack cd 0 → cd 1 |
| 75 | Iron Golem | 23 | boss | 200 | 78 | 20 | 18 | 3d8+6 | 2d8+4 | AC 20→18. LegendaryResistances 2→1. critImmunity kept |
| 76 | Coastal Behemoth | 23 | elite | 240 | 65 | 18 | 18 | 3d8+5 | 2d8+3 | Multiattack cd 0 → cd 1 |
| 77 | Fire Giant | 24 | boss | 185 | 81 | 17 | 17 | 3d8+7 | 2d8+4 | Remove damage aura (Heated Body 2d6). LegendaryActions 1→0 |
| 78 | Obsidian Golem | 24 | elite | 250 | 67 | 19 | 18 | 3d8+6 | 2d8+4 | — |
| 79 | Purple Worm | 25 | boss | 210 | 76 | 18 | 18 | 3d8+7 | 2d8+4 | Swallow escape threshold 25→15, DC 18→15. Multiattack cd 0 → cd 1. Phase stat boost: atk +3/dmg +3 → +2/+2 |
| 80 | Ashlands Wyrm | 25 | elite | 220 | 63 | 18 | 18 | 3d8+5 | 2d8+3 | Multiattack cd 0 → cd 1 |
| 81 | Feywood Archon | 25 | boss | 320 | 76 | 20 | 19 | 3d8+6 | 2d8+4 | LegendaryActions 2→1, LegendaryResistances 2→1 |
| 82 | Beholder | 26 | boss | 180 | 78 | 18 | 18 | 2d10+5 | 1d10+3 | Eye Rays multiattack attacks 3→2, cd 0 → cd 1. Disintegration Ray 10d8→5d8. LegendaryActions 2→1, LegendaryResistances 2→1 |
| 83 | Wasteland Behir | 26 | elite | 230 | 65 | 18 | 18 | 3d8+5 | 2d8+3 | Multiattack cd 0 → cd 1 |
| 84 | Reef Terror | 27 | elite | 235 | 67 | 18 | 18 | 3d8+5 | 2d8+3 | Multiattack cd 0 → cd 1 |
| 85 | Frost Revenant | 27 | grunt | 270 | 54 | 19 | 18 | 3d8+6 | 2d8+3 | — |
| 86 | Death Knight | 28 | boss | 230 | 83 | 20 | 19 | 3d8+7 | 2d8+4 | LegendaryActions 2→1, LegendaryResistances 2→1. Hellfire Orb 8d6→4d6 |
| 87 | Infernal Ravager | 28 | elite | 240 | 69 | 19 | 19 | 3d8+6 | 2d8+3 | Remove damage aura (Hellfire Cloak 1d8 FIRE) |
| 88 | Dread Colossus | 29 | boss | 380 | 86 | 21 | 20 | 3d10+7 | 2d10+4 | LegendaryActions 2→1, LegendaryResistances 2→1. Multiattack attacks 3→2. Earthquake Slam cd 3 no change |
| 89 | Moonveil Stalker | 29 | elite | 210 | 67 | 19 | 19 | 3d8+6 | 2d8+3 | — |
| 90 | Storm Giant | 30 | boss | 280 | 106 | 21 | 20 | 3d10+8 | 2d10+5 | Remove Storm Aura (damage_aura 2d8). Lightning Strike 8d8→4d8, DC 20→17. LegendaryActions 3→1, LegendaryResistances 2→1. Phase: stat boost atk+3/ac+2/dmg+4→+2/+1/+2, AoE 8d6→4d6 |

---

## Tier 5 (Level 31-40) — 23 monsters

L35: eDPR 12.7 vs AC 19, AC cap 24
L40: eDPR 13.5 vs AC 20, AC cap 25

HP targets: eDPR × 11.5 × roleMult
- L31 grunt: ~9.0 × 11.5 × 0.8 = 83
- L31 elite: ~9.0 × 11.5 × 1.0 = 104
- L32 grunt: ~9.2 × 11.5 × 0.8 = 85
- L32 elite: ~9.2 × 11.5 × 1.0 = 106
- L33 grunt: ~9.5 × 11.5 × 0.8 = 87
- L33 elite: ~9.5 × 11.5 × 1.0 = 109
- L34 grunt: ~10.0 × 11.5 × 0.8 = 92
- L34 elite: ~10.0 × 11.5 × 1.0 = 115
- L35 grunt: 12.7 × 11.5 × 0.8 = 117
- L35 boss: 12.7 × 11.5 × 1.2 = 175
- L36 grunt: ~12.9 × 11.5 × 0.8 = 119
- L36 elite: ~12.9 × 11.5 × 1.0 = 148
- L37 grunt: ~13.0 × 11.5 × 0.8 = 120
- L37 boss: ~13.0 × 11.5 × 1.2 = 179
- L38 elite: ~13.2 × 11.5 × 1.0 = 152
- L38 boss: ~13.2 × 11.5 × 1.2 = 182
- L39 elite: ~13.4 × 11.5 × 1.0 = 154
- L39 boss: ~13.4 × 11.5 × 1.2 = 185
- L40 boss: 13.5 × 11.5 × 1.2 = 186

| # | Monster | Lvl | Role | Old HP | New HP | Old AC | New AC | Old Dmg | New Dmg | Ability Changes |
|---|---------|----:|:----:|-------:|-------:|-------:|-------:|---------|---------|-----------------|
| 91 | Ironbark Treant | 31 | grunt | 290 | 83 | 19 | 19 | 3d8+8 | 2d8+4 | Regen 15→6 hp/turn |
| 92 | Sand Wyrm | 31 | elite | 290 | 104 | 20 | 20 | 3d10+8 | 2d10+4 | Multiattack cd 0 → cd 1 |
| 93 | Steppe Behemoth | 32 | grunt | 300 | 85 | 19 | 19 | 3d8+8 | 2d8+4 | Multiattack cd 0 → cd 1 |
| 94 | Dune Colossus | 32 | grunt | 310 | 85 | 20 | 20 | 3d8+8 | 2d8+4 | Multiattack cd 0 → cd 1 |
| 95 | Kraken Spawn | 32 | elite | 310 | 106 | 20 | 20 | 3d8+8 | 2d8+4 | Tentacle Slam attacks 3→2, cd 0 → cd 1 |
| 96 | War Mammoth | 33 | elite | 330 | 109 | 20 | 20 | 3d10+8 | 2d10+4 | Multiattack cd 0 → cd 1. Trampling Charge 6d10→3d10 |
| 97 | Nightwalker | 33 | elite | 340 | 109 | 20 | 20 | 3d10+8 | 2d10+4 | Remove damage aura (Annihilating Aura 2d6). Multiattack cd 0 → cd 1. Life Eater 5d8→3d8 |
| 98 | River Leviathan | 34 | elite | 320 | 115 | 19 | 19 | 3d10+8 | 2d10+4 | Multiattack cd 0 → cd 1. Tidal Wave 5d10→3d10 |
| 99 | Volcanic Drake | 34 | grunt | 310 | 92 | 20 | 20 | 3d8+8 | 2d8+4 | Multiattack cd 0 → cd 1 |
| 100 | Thornbloom Horror | 34 | elite | 340 | 115 | 19 | 19 | 3d8+8 | 2d8+4 | Multiattack cd 0 → cd 1. Spore Cloud 4d8→2d8 |
| 101 | Basilisk King | 35 | boss | 340 | 175 | 21 | 21 | 4d8+9 | 2d8+5 | Multiattack cd 0 → cd 1. Petrifying Gaze DC stays (it's a boss). LegendaryResistances 1→1 |
| 102 | Dust Devil | 35 | grunt | 300 | 117 | 19 | 19 | 3d8+8 | 2d8+4 | Remove damage aura (Scouring Winds 1d8) |
| 103 | Spectral Knight | 35 | grunt | 300 | 117 | 20 | 20 | 3d8+8 | 2d8+4 | Multiattack cd 0 → cd 1 |
| 104 | Coastal Wyrm | 36 | grunt | 330 | 119 | 20 | 20 | 3d10+8 | 2d10+4 | Multiattack cd 0 → cd 1 |
| 105 | Infernal Bladedancer | 36 | elite | 360 | 148 | 21 | 21 | 3d8+8 | 2d8+4 | Blade Flurry attacks 4→2, cd 0 → cd 1 |
| 106 | Feywild Warden | 37 | grunt | 330 | 120 | 20 | 20 | 3d8+8 | 2d8+4 | Multiattack cd 0 → cd 1 |
| 107 | Frost Wyrm | 37 | grunt | 340 | 120 | 20 | 20 | 3d10+8 | 2d10+4 | Multiattack cd 0 → cd 1 |
| 108 | Aboleth | 37 | boss | 370 | 179 | 21 | 21 | 3d10+9 | 2d10+5 | Tentacle Lash attacks 3→2, cd 0 → cd 1. Psychic Drain 6d8→3d8. LegendaryActions 2→1, LegendaryResistances 2→1 |
| 109 | Hill Giant Warlord | 38 | elite | 380 | 152 | 21 | 21 | 4d8+9 | 2d8+5 | Multiattack cd 0 → cd 1. Boulder Barrage 5d8→3d8 |
| 110 | Djinn Lord | 38 | boss | 380 | 182 | 22 | 22 | 4d8+9 | 2d8+5 | Whirlwind 8d8→4d8. Lightning Storm 6d10→3d10. LegendaryActions 2→1, LegendaryResistances 1→1 |
| 111 | Roc | 39 | elite | 400 | 154 | 21 | 21 | 4d10+9 | 2d10+5 | Multiattack cd 0 → cd 1. Wing Buffet 6d8→3d8 |
| 112 | Dracolich | 39 | boss | 420 | 185 | 22 | 22 | 4d8+9 | 2d8+5 | Remove Death Shroud damage aura. Necrotic Breath 8d8→4d8. Multiattack attacks 3→2, cd 0 → cd 1. LegendaryActions 2→1, LegendaryResistances 2→1 |
| 113 | Archlich | 40 | boss | 420 | 186 | 23 | 22 | 4d8+10 | 2d8+5 | Remove Death Aura. Power Word Stun DC 21→17. Necrotic Storm 8d8→4d8, DC 20→17. Remove phase 2 (Undying Will / Mass Raise Dead regen). LegendaryActions 3→1, LegendaryResistances 3→1. Phase 1 (Phylactery Surge): stat boost +3/+3→+2/+2, AoE 6d8→3d8 |

---

## Tier 6 (Level 41-50) — 17 monsters

L45: eDPR 18.0 vs AC 22, AC cap 25
L50: eDPR 18.0 vs AC 22, AC cap 25

HP targets: eDPR × 12.5 × roleMult
- L41 grunt: ~15.5 × 12.5 × 0.8 = 155
- L41 elite: ~15.5 × 12.5 × 1.0 = 194
- L42 boss: ~16.0 × 12.5 × 1.2 = 240
- L43 grunt: ~16.5 × 12.5 × 0.8 = 165
- L43 boss: ~16.5 × 12.5 × 1.2 = 248
- L44 grunt: ~17.0 × 12.5 × 0.8 = 170
- L44 boss: ~17.0 × 12.5 × 1.2 = 255
- L45 grunt: 18.0 × 12.5 × 0.8 = 180
- L45 boss: 18.0 × 12.5 × 1.2 = 270
- L46 grunt: 18.0 × 12.5 × 0.8 = 180
- L46 boss: 18.0 × 12.5 × 1.2 = 270
- L47 boss: 18.0 × 12.5 × 1.2 = 270
- L48 grunt: 18.0 × 12.5 × 0.8 = 180
- L48 elite: 18.0 × 12.5 × 1.0 = 225
- L49 boss: 18.0 × 12.5 × 1.2 = 270
- L50 boss: 18.0 × 12.5 × 1.2 = 270

| # | Monster | Lvl | Role | Old HP | New HP | Old AC | New AC | Old Dmg | New Dmg | Ability Changes |
|---|---------|----:|:----:|-------:|-------:|-------:|-------:|---------|---------|-----------------|
| 114 | Ember Titan | 41 | grunt | 460 | 155 | 22 | 22 | 4d8+10 | 2d8+5 | Remove Magma Skin damage aura. Multiattack cd 0 → cd 1. Eruption 6d8→3d8 |
| 115 | Ancient Forest Guardian | 41 | elite | 500 | 194 | 22 | 22 | 4d10+10 | 2d10+5 | Regen 20→8 hp/turn. Multiattack cd 0 → cd 1. Root Eruption 6d8→3d8 |
| 116 | Phoenix | 42 | boss | 440 | 240 | 22 | 22 | 4d10+10 | 2d10+5 | Remove Fire Aura (damage_aura 3d6). Regen 25→8 hp/turn. Immolation Burst 8d8→4d8. LegendaryActions 2→1, LegendaryResistances 1→1 |
| 117 | Swamp Hydra | 43 | grunt | 480 | 165 | 22 | 22 | 4d8+10 | 2d8+5 | Multiattack 4 heads → 2, cd 0 → cd 1. Regen 15→7 hp/turn |
| 118 | Pit Fiend | 43 | boss | 500 | 248 | 23 | 23 | 4d10+11 | 2d10+5 | Fireball 10d6→5d6. LegendaryActions 2→1, LegendaryResistances 2→1 |
| 119 | Mind Reaver | 44 | grunt | 470 | 170 | 22 | 22 | 4d8+10 | 2d8+5 | Multiattack cd 0 → cd 1. Mind Blast DC→16 |
| 120 | Tundra Sentinel | 44 | grunt | 480 | 170 | 23 | 22 | 4d8+10 | 2d8+5 | Multiattack cd 0 → cd 1. Frost Nova 5d8→3d8 |
| 121 | Deep Kraken | 44 | boss | 520 | 255 | 22 | 22 | 4d10+11 | 2d10+5 | Tentacle Lash attacks 4→2, cd 0 → cd 1. Maelstrom 8d10→4d10. Lightning Storm 8d8→4d8. LegendaryActions 3→1, LegendaryResistances 2→1 |
| 122 | Blight Dragon | 45 | boss | 540 | 270 | 23 | 23 | 5d8+11 | 2d8+6 | Multiattack cd 0 → cd 1. Plague Breath 8d8→4d8. LegendaryActions 2→1, LegendaryResistances 1→1 |
| 123 | Plains Thunderherd | 45 | grunt | 490 | 180 | 22 | 22 | 4d10+10 | 2d10+5 | Multiattack attacks 3→2, cd 0 → cd 1. Stampede 6d10→3d10 |
| 124 | Granite Warden | 46 | grunt | 520 | 180 | 24 | 23 | 4d10+11 | 2d10+5 | Multiattack cd 0 → cd 1 |
| 125 | Elder Wyrm | 46 | boss | 560 | 270 | 24 | 23 | 5d8+12 | 2d8+6 | Multiattack attacks 3→2, cd 0 → cd 1. Glacial Breath 14d6→7d6. Tail Sweep 6d8→3d8. LegendaryActions 3→1, LegendaryResistances 3→1 |
| 126 | Arcane Titan | 47 | boss | 580 | 270 | 24 | 23 | 5d8+12 | 2d8+6 | Arcane Cataclysm 10d8→5d8. LegendaryActions 2→1, LegendaryResistances 2→1 |
| 127 | Siege Wurm | 48 | grunt | 540 | 180 | 23 | 23 | 5d8+12 | 2d8+6 | Multiattack cd 0 → cd 1. Burrowing Eruption 7d8→4d8 |
| 128 | Abyssal Ravager | 48 | elite | 560 | 225 | 23 | 23 | 5d8+12 | 2d8+6 | Remove Brimstone Cloak damage aura. Multiattack cd 0 → cd 1. Hellfire Wave 7d8→4d8 |
| 129 | Tarrasque | 49 | boss | 640 | 270 | 25 | 24 | 5d10+14 | 3d10+7 | Multiattack attacks 4→2, cd 0 → cd 1. Swallow DC/escape threshold unchanged (boss). Tail Sweep 8d8→4d8. LegendaryActions 3→1, LegendaryResistances 3→1. Phase transitions: keep 1, remove 2 |
| 130 | Void Emperor | 50 | boss | 650 | 270 | 25 | 24 | 5d10+14 | 3d10+7 | Multiattack attacks 3→2, cd 0 → cd 1. Reality Tear 12d8→6d8, DC 24→19. Existential Dread DC 24→19. Void Drain DC 22→17. Dimensional Rift DC 23→18. LegendaryActions 3→1, LegendaryResistances 3→1. Phase 1: stat boost +4/+4→+2/+2, AoE 10d8→5d8. Remove phase 2 (Event Horizon / Dimensional Collapse) |

---

## Summary Statistics

| Tier | Monsters | Avg Old HP | Avg New HP | HP Reduction | AC Changes |
|------|:--------:|-----------:|-----------:|:------------:|:----------:|
| T1 | 20 | 18 | 17 | -6% | Several reduced to 10 |
| T2 | 18 | 52 | 20 | -62% | All capped at 11-12 |
| T3 | 24 | 136 | 44 | -68% | Capped at 15-17 |
| T4 | 28 | 208 | 68 | -67% | Capped at 15-20 |
| T5 | 23 | 347 | 131 | -62% | Mostly unchanged (19-22) |
| T6 | 17 | 524 | 219 | -58% | Capped at 22-24 |

### Ability Changes Applied Across All Tiers
- **Multiattack cd:0 → cd:1:** 60+ monsters affected
- **Damage auras removed:** 10 monsters (all T1-T3 auras removed, T4+ auras reduced or removed)
- **Regen capped:** 6 monsters (reduced to 3-8 hp/turn based on level)
- **Legendary actions reduced:** 15+ monsters (most reduced to 0-1)
- **Legendary resistances reduced:** 15+ monsters (most reduced to 0-1)
- **AoE ability damage halved:** 25+ monsters
- **Save DCs reduced:** 10+ monsters (bosses at high levels)
- **Phase transitions pruned:** 5 monsters lost their most oppressive phases
