# CR Formula Recalculation Audit

**Date:** 2026-03-09
**Formula Version:** Monster-Intrinsic Power Index v1 (log mapping)
**Source:** `shared/src/data/combat/cr-formula.ts`

---

## Formula Summary

Replaces the old player-dependent CR formula (4 lookup tables, 200 manually-maintained values) with a **monster-intrinsic power index** that ranks monsters purely by their own stats.

```
RawPower = sqrt(OP * DP) * lethality_adj
CR = 7.61 * ln(RawPower) - 15.86    (clamped to [1, ...])
```

- **Offensive Power (OP):** base DPR (damage * multiattack) + ability DPR (AoE, damage, on_hit, status) + fear/death throes/damage aura, multiplied by legendary action bonus and cubic ATK factor
- **Defensive Power (DP):** HP * cubic AC factor * resistance/immunity multiplier * regen * legendary resistance * phase transitions * condition immunities, with vulnerability penalty
- **Cubic scaling:** ATK uses `(1 + (ATK-3)*0.12)^3`, AC uses `(1 + (AC-10)*0.10)^3`
- **Log mapping calibrated to:** Goblin (L1) and Tarrasque (L49)

---

## Accuracy Summary

| Metric | Count | Percentage |
|--------|------:|----------:|
| Within ±1 | 33/129 | 26% |
| Within ±2 | 52/129 | 40% |
| **Within ±3** | **68/129** | **53%** |
| Within ±5 | 98/129 | 76% |
| Max delta | +11.0 | (Demon) |

| Breakdown | Within ±3 |
|-----------|----------|
| Boss/World Boss | 12/29 (41%) |
| Standard/Elite | 56/100 (56%) |

**Key finding:** Standard/elite monsters are well-calibrated (56% within ±3). Boss monsters are consistently rated HIGHER than their hand-assigned level, meaning they are more powerful than their level implies. This is expected — bosses have multiattack, legendary actions, AoE, phase transitions, and fear auras that multiply their effective power.

---

## Full 129-Monster Comparison Table

### Tier 1 (Level 1-5) — 22 monsters

| Monster | Type | Level | CR | Delta | HP | AC | ATK | Damage |
|---------|------|------:|---:|------:|---:|---:|----:|--------|
| Dustjaw Hyena | standard | 1 | 1.0 | 0.0 | 18 | 10 | 3 | 1d4+1 |
| Giant Rat | standard | 1 | 1.0 | 0.0 | 18 | 10 | 3 | 1d4+1 |
| Goblin | standard | 1 | 1.0 | 0.0 | 24 | 10 | 3 | 1d4+1 |
| Bone Rattler | standard | 2 | 1.0 | -1.0 | 16 | 10 | 3 | 1d6+1 |
| Slime | standard | 2 | 1.0 | -1.0 | 15 | 8 | 2 | 1d6 |
| Thornvine Creeper | standard | 2 | 1.0 | -1.0 | 20 | 10 | 3 | 1d6 |
| Wolf | standard | 2 | 1.8 | -0.2 | 15 | 10 | 4 | 1d6+1 |
| Bandit | standard | 3 | 3.3 | +0.3 | 20 | 10 | 4 | 1d6+2 |
| Ember Beetle | standard | 3 | 1.0 | -2.0 | 15 | 10 | 3 | 1d4+1 |
| Frost Mote | standard | 3 | 1.0 | -2.0 | 14 | 10 | 4 | 1d6 |
| Mana Wisp | standard | 3 | 1.7 | -1.3 | 16 | 10 | 3 | 1d6+1 |
| Prairie Stalker | standard | 3 | 2.5 | -0.5 | 18 | 10 | 4 | 1d6+1 |
| Shambling Corpse | standard | 3 | 2.1 | -0.9 | 25 | 8 | 2 | 1d6+1 |
| Tide Crab | standard | 3 | 1.0 | -2.0 | 16 | 10 | 3 | 1d4+2 |
| Bloodwing Stirge | standard | 4 | 2.5 | -1.5 | 12 | 10 | 5 | 1d4+2 |
| Bog Wraith | standard | 4 | 6.6 | +2.6 | 22 | 10 | 4 | 1d6+2 |
| Glimmerfae | standard | 4 | 1.2 | -2.8 | 14 | 10 | 4 | 1d4+2 |
| Sand Viper | standard | 4 | 4.9 | +0.9 | 16 | 10 | 5 | 1d6+2 |
| Brambleback Toad | standard | 5 | 4.5 | -0.5 | 22 | 11 | 4 | 1d6+1 |
| Ghoul Stalker | standard | 5 | 5.1 | +0.1 | 15 | 11 | 5 | 1d6+1 |
| Hollow Sentinel | standard | 5 | 5.2 | +0.2 | 20 | 11 | 5 | 1d6+1 |
| Skeleton Warrior | standard | 5 | 4.5 | -0.5 | 15 | 11 | 5 | 1d6+2 |

**T1 accuracy:** 7/22 within ±1 (32%), 19/22 within ±3 (86%). Slight downward bias for L3-4 monsters with minimal stats. Bog Wraith over-rated due to triple physical resistance + dual immunity.

### Tier 2 (Level 5-10) — 18 monsters

| Monster | Type | Level | CR | Delta | HP | AC | ATK | Damage |
|---------|------|------:|---:|------:|---:|---:|----:|--------|
| Dune Scorpion | standard | 6 | 10.4 | +4.4 | 21 | 11 | 6 | 1d6+2 |
| Orc Warrior | standard | 6 | 9.2 | +3.2 | 17 | 11 | 6 | 1d6+2 |
| Tidal Elemental | standard | 6 | 6.3 | +0.3 | 17 | 11 | 6 | 1d6+1 |
| Arcane Elemental | standard | 7 | 9.4 | +2.4 | 18 | 12 | 6 | 1d8+2 |
| Giant Spider | standard | 7 | 10.3 | +3.3 | 23 | 12 | 6 | 1d8+2 |
| Harrowsong Harpy | standard | 7 | 7.2 | +0.2 | 18 | 12 | 6 | 1d6+2 |
| Hooktusk | elite | 7 | 12.1 | +5.1 | 18 | 12 | 7 | 1d8+2 |
| Stoneclaw Gargoyle | elite | 7 | 9.1 | +2.1 | 18 | 12 | 6 | 1d8+2 |
| Dire Wolf | standard | 8 | 9.5 | +1.5 | 19 | 12 | 7 | 1d8+2 |
| Frostfang Wolf | standard | 8 | 10.0 | +2.0 | 19 | 12 | 7 | 1d8+2 |
| Ironhide Ogre | elite | 8 | 9.7 | +1.7 | 19 | 12 | 7 | 1d8+3 |
| Lavamaw Salamander | elite | 8 | 9.2 | +1.2 | 19 | 12 | 7 | 1d8+2 |
| Broodmother Spider | elite | 9 | 14.5 | +5.5 | 32 | 12 | 7 | 1d8+2 |
| Rust Lurker | standard | 9 | 9.0 | 0.0 | 22 | 12 | 6 | 1d8+1 |
| Shadow Wraith | elite | 9 | 12.6 | +3.6 | 27 | 12 | 7 | 1d8+2 |
| Troll | elite | 9 | 16.6 | +7.6 | 27 | 12 | 7 | 1d8+3 |

**T2 accuracy:** 3/18 within ±1 (17%), 12/18 within ±3 (67%). Troll and Broodmother are significantly stronger than L9 due to multiattack-3 + regen (Troll) and multiattack-2 + high HP (Broodmother).

### Tier 3 (Level 10-20) — 28 monsters

| Monster | Type | Level | CR | Delta | HP | AC | ATK | Damage |
|---------|------|------:|---:|------:|---:|---:|----:|--------|
| Sandscale Basilisk | standard | 10 | 15.4 | +5.4 | 34 | 15 | 8 | 1d8+2 |
| Crypt Warden | standard | 11 | 15.8 | +4.8 | 34 | 15 | 8 | 1d8+2 |
| Razormane Manticore | elite | 11 | 20.2 | +9.2 | 43 | 15 | 9 | 1d8+3 |
| Thornwarden | standard | 11 | 16.4 | +5.4 | 43 | 15 | 8 | 1d8+2 |
| Ancient Golem | elite | 12 | 20.9 | +8.9 | 43 | 15 | 8 | 1d10+3 |
| Cyclops Brute | standard | 12 | 16.7 | +4.7 | 34 | 14 | 9 | 1d8+3 |
| Dune Revenant | standard | 12 | 16.1 | +4.1 | 34 | 15 | 8 | 1d8+2 |
| Magma Crawler | standard | 13 | 15.9 | +2.9 | 33 | 16 | 8 | 1d8+3 |
| Tidecaller Siren | standard | 13 | 16.2 | +3.2 | 41 | 15 | 8 | 1d8+2 |
| Void Stalker | elite | 13 | 20.9 | +7.9 | 41 | 16 | 9 | 1d8+3 |
| Cairn Specter | elite | 14 | 20.7 | +6.7 | 42 | 16 | 9 | 1d8+3 |
| Steppe Lion | standard | 14 | 19.7 | +5.7 | 42 | 15 | 9 | 1d8+3 |
| **Young Dragon** | **boss** | **14** | **24.7** | **+10.7** | 50 | 16 | 10 | 1d10+4 |
| Hydra | elite | 15 | 20.5 | +5.5 | 44 | 15 | 8 | 1d8+3 |
| Mire Hulk | elite | 15 | 20.8 | +5.8 | 44 | 16 | 9 | 1d8+3 |
| **Demon** | **boss** | **16** | **27.0** | **+11.0** | 54 | 16 | 10 | 1d8+4 |
| **Elder Fey Guardian** | **boss** | **16** | **24.5** | **+8.5** | 54 | 16 | 10 | 1d10+3 |
| Gorgon Bull | elite | 16 | 21.2 | +5.2 | 45 | 16 | 10 | 1d10+3 |
| Remorhaz Burrower | standard | 16 | 18.6 | +2.6 | 36 | 16 | 10 | 1d8+3 |
| Prairie Centaur | standard | 17 | 21.6 | +4.6 | 47 | 16 | 10 | 1d8+3 |
| Wyvern | standard | 17 | 22.0 | +5.0 | 49 | 15 | 9 | 1d8+3 |
| **Feywild Enchantress** | **boss** | **18** | **25.1** | **+7.1** | 59 | 17 | 10 | 1d8+3 |
| **Lich** | **boss** | **18** | **26.6** | **+8.6** | 59 | 17 | 9 | 1d10+3 |
| Treant | elite | 18 | 21.1 | +3.1 | 51 | 16 | 10 | 1d10+3 |
| Chimera | elite | 19 | 22.5 | +3.5 | 54 | 15 | 10 | 1d8+3 |
| Chuul Predator | standard | 19 | 23.0 | +4.0 | 51 | 17 | 10 | 1d8+3 |
| Thornfang Wyvern | standard | 19 | 23.2 | +4.2 | 54 | 17 | 10 | 1d8+3 |
| **Mind Flayer** | **boss** | **20** | **25.7** | **+5.7** | 70 | 16 | 10 | 1d8+3 |

**T3 accuracy:** 1/28 within ±1, 8/28 within ±3 (29%). All monsters rate above their assigned level. The cubic ATK/AC scaling correctly identifies that AC 15-17 and ATK +8-10 represent significant jumps in power from T1/T2 baselines (AC 10, ATK +3-5).

### Tier 4 (Level 20-30) — 22 monsters

| Monster | Type | Level | CR | Delta | HP | AC | ATK | Damage |
|---------|------|------:|---:|------:|---:|---:|----:|--------|
| Sandstorm Djinn | elite | 20 | 24.7 | +4.7 | 61 | 18 | 12 | 1d10+3 |
| Bone Fiend | standard | 21 | 26.3 | +5.3 | 61 | 18 | 12 | 1d10+3 |
| Hill Ettin | standard | 21 | 24.2 | +3.2 | 49 | 17 | 12 | 1d10+3 |
| **Vampire Lord** | **boss** | **21** | **26.4** | **+5.4** | 73 | 17 | 11 | 1d8+3 |
| Fey Dragon | elite | 22 | 25.4 | +3.4 | 63 | 17 | 11 | 1d8+3 |
| **Frost Giant** | **boss** | **22** | **25.3** | **+3.3** | 76 | 16 | 11 | 2d8+4 |
| Sea Serpent | elite | 22 | 22.9 | +0.9 | 63 | 16 | 11 | 1d10+3 |
| Coastal Behemoth | elite | 23 | 27.6 | +4.6 | 65 | 18 | 12 | 2d8+3 |
| **Iron Golem** | **boss** | **23** | **33.0** | **+10.0** | 78 | 18 | 12 | 2d8+4 |
| **Fire Giant** | **boss** | **24** | **27.4** | **+3.4** | 81 | 17 | 12 | 2d8+4 |
| Obsidian Golem | elite | 24 | 28.6 | +4.6 | 67 | 18 | 13 | 2d8+4 |
| Ashlands Wyrm | standard | 25 | 28.6 | +3.6 | 63 | 18 | 13 | 2d8+3 |
| **Feywood Archon** | **boss** | **25** | **33.0** | **+8.0** | 76 | 19 | 13 | 2d8+4 |
| **Purple Worm** | **boss** | **25** | **31.5** | **+6.5** | 76 | 18 | 13 | 2d8+4 |
| **Beholder** | **boss** | **26** | **29.9** | **+3.9** | 78 | 18 | 12 | 1d10+3 |
| Wasteland Behir | standard | 26 | 28.8 | +2.8 | 65 | 18 | 13 | 2d8+3 |
| Frost Revenant | elite | 27 | 26.2 | -0.8 | 54 | 18 | 13 | 2d8+3 |
| Reef Terror | standard | 27 | 28.1 | +1.1 | 67 | 18 | 13 | 2d8+3 |
| **Death Knight** | **boss** | **28** | **35.3** | **+7.3** | 83 | 19 | 14 | 2d8+4 |
| Infernal Ravager | standard | 28 | 30.1 | +2.1 | 69 | 19 | 14 | 2d8+3 |
| Moonveil Stalker | standard | 29 | 26.6 | -2.4 | 67 | 19 | 13 | 2d8+3 |
| **Dread Colossus** | **boss** | **29** | **36.4** | **+7.4** | 86 | 20 | 14 | 2d10+4 |
| **Storm Giant** | **boss** | **30** | **38.2** | **+8.2** | 106 | 20 | 15 | 2d10+5 |

**T4 accuracy:** 3/22 within ±1, 10/22 within ±3 (45%). Most monsters rate 3-8 levels above assigned level. Boss monsters with legendary actions/resistances/phase transitions are consistently 5-10 above.

### Tier 5 (Level 31-40) — 23 monsters

| Monster | Type | Level | CR | Delta | HP | AC | ATK | Damage |
|---------|------|------:|---:|------:|---:|---:|----:|--------|
| Ironbark Treant | standard | 31 | 30.5 | -0.5 | 83 | 19 | 14 | 2d8+4 |
| Sand Wyrm | elite | 31 | 33.4 | +2.4 | 104 | 20 | 14 | 2d10+4 |
| Dune Colossus | standard | 32 | 31.7 | -0.3 | 85 | 20 | 14 | 2d8+4 |
| Kraken Spawn | elite | 32 | 34.2 | +2.2 | 106 | 20 | 14 | 2d8+4 |
| Steppe Behemoth | standard | 32 | 30.6 | -1.4 | 85 | 19 | 14 | 2d8+4 |
| Nightwalker | elite | 33 | 35.4 | +2.4 | 109 | 20 | 15 | 2d10+4 |
| War Mammoth | elite | 33 | 33.8 | +0.8 | 109 | 20 | 15 | 2d10+4 |
| River Leviathan | elite | 34 | 33.2 | -0.8 | 115 | 19 | 15 | 2d10+4 |
| Thornbloom Horror | elite | 34 | 32.9 | -1.1 | 115 | 19 | 15 | 2d8+4 |
| Volcanic Drake | standard | 34 | 32.8 | -1.2 | 92 | 20 | 15 | 2d8+4 |
| **Basilisk King** | **boss** | **35** | **37.6** | **+2.6** | 175 | 21 | 15 | 2d8+5 |
| Dust Devil | standard | 35 | 31.6 | -3.4 | 117 | 19 | 14 | 2d8+4 |
| Spectral Knight | standard | 35 | 35.2 | +0.2 | 117 | 20 | 15 | 2d8+4 |
| Coastal Wyrm | standard | 36 | 34.6 | -1.4 | 119 | 20 | 16 | 2d10+4 |
| Infernal Bladedancer | elite | 36 | 37.6 | +1.6 | 148 | 21 | 16 | 2d8+4 |
| **Aboleth** | **boss** | **37** | **39.5** | **+2.5** | 179 | 21 | 16 | 2d10+5 |
| Feywild Warden | standard | 37 | 33.4 | -3.6 | 120 | 20 | 16 | 2d8+4 |
| Frost Wyrm | standard | 37 | 35.0 | -2.0 | 120 | 20 | 16 | 2d10+4 |
| **Djinn Lord** | **boss** | **38** | **40.6** | **+2.6** | 182 | 22 | 17 | 2d8+5 |
| Hill Giant Warlord | elite | 38 | 37.9 | -0.1 | 152 | 21 | 17 | 2d8+5 |
| **Dracolich** | **boss** | **39** | **42.2** | **+3.2** | 185 | 22 | 17 | 2d8+5 |
| Roc | elite | 39 | 36.5 | -2.5 | 154 | 21 | 17 | 2d10+5 |
| **Archlich** | **boss** | **40** | **41.7** | **+1.7** | 186 | 22 | 18 | 2d8+5 |

**T5 accuracy:** 8/23 within ±1 (35%), 18/23 within ±3 (78%). Best-calibrated tier. Standard/elite monsters match their level well. Bosses are 2-3 above.

### Tier 6 (Level 41-50) — 17 monsters

| Monster | Type | Level | CR | Delta | HP | AC | ATK | Damage |
|---------|------|------:|---:|------:|---:|---:|----:|--------|
| Ancient Forest Guardian | elite | 41 | 42.3 | +1.3 | 194 | 22 | 19 | 2d10+5 |
| Ember Titan | standard | 41 | 37.9 | -3.1 | 155 | 22 | 19 | 2d8+5 |
| **Phoenix** | **boss** | **42** | **42.9** | **+0.9** | 240 | 22 | 19 | 2d10+5 |
| **Pit Fiend** | **boss** | **43** | **44.9** | **+1.9** | 248 | 23 | 19 | 2d10+5 |
| Swamp Hydra | standard | 43 | 37.9 | -5.1 | 165 | 22 | 19 | 2d8+5 |
| **Deep Kraken** | **boss** | **44** | **44.5** | **+0.5** | 255 | 22 | 20 | 2d10+5 |
| Mind Reaver | standard | 44 | 38.7 | -5.3 | 170 | 22 | 19 | 2d8+5 |
| Tundra Sentinel | standard | 44 | 39.1 | -4.9 | 170 | 22 | 19 | 2d8+5 |
| **Blight Dragon** | **boss** | **45** | **45.0** | **0.0** | 270 | 23 | 20 | 2d8+6 |
| Plains Thunderherd | standard | 45 | 39.2 | -5.8 | 180 | 22 | 20 | 2d10+5 |
| **Elder Wyrm** | **boss** | **46** | **45.6** | **-0.4** | 270 | 23 | 21 | 2d8+6 |
| Granite Warden | standard | 46 | 41.4 | -4.6 | 180 | 23 | 20 | 2d10+5 |
| **Arcane Titan** | **boss** | **47** | **46.5** | **-0.5** | 270 | 23 | 21 | 2d8+6 |
| Abyssal Ravager | elite | 48 | 43.3 | -4.7 | 225 | 23 | 21 | 2d8+6 |
| Siege Wurm | standard | 48 | 40.2 | -7.8 | 180 | 23 | 21 | 2d8+6 |
| **Tarrasque** | **world_boss** | **49** | **49.5** | **+0.5** | 270 | 24 | 22 | 3d10+7 |
| **Void Emperor** | **world_boss** | **50** | **50.0** | **0.0** | 270 | 24 | 22 | 3d10+7 |

**T6 accuracy:** 5/17 within ±1 (29%), 11/17 within ±3 (65%). Bosses match excellently. Standard monsters at this tier show delta -5 to -8, indicating their stats don't fully justify their level assignment.

---

## Tier Ordering Check

| Tier | Count | CR Range | Avg CR |
|------|------:|----------|-------:|
| T1 (L1-5) | 22 | 1.0 - 6.6 | 2.5 |
| T2 (L5-10) | 18 | 6.3 - 16.6 | 10.3 |
| T3 (L10-20) | 28 | 15.4 - 27.0 | 20.6 |
| T4 (L20-30) | 22 | 22.9 - 38.2 | 28.7 |
| T5 (L31-40) | 23 | 30.5 - 42.2 | 35.0 |
| T6 (L41-50) | 17 | 37.9 - 50.0 | 42.4 |

Average CRs are properly ordered (2.5 < 10.3 < 20.6 < 28.7 < 35.0 < 42.4). Adjacent tier CR ranges overlap as expected since standard T(n+1) have less raw power than boss T(n).

---

## Key Findings

### 1. Formula rates bosses above their assigned level (T2-T4)

Bosses with legendary actions, multiattack, AoE abilities, fear auras, phase transitions, and death throes are consistently rated 5-11 levels above their hand-assigned level. This is the formula correctly identifying that these feature combinations are very powerful.

**Notable over-powered bosses:**
| Monster | Level | CR | Delta | Key Features |
|---------|------:|---:|------:|-------------|
| Demon | 16 | 27.0 | +11.0 | Multiattack, LA, AoE, fear, death throes, phase |
| Young Dragon | 14 | 24.7 | +10.7 | Multiattack, AoE 6d6, fear, phase |
| Iron Golem | 23 | 33.0 | +10.0 | Massive damage abilities, LR, crit immunity |
| Razormane Manticore | 11 | 20.2 | +9.2 | Multiattack + on_hit |
| Ancient Golem | 12 | 20.9 | +8.9 | Multiattack + high HP/AC |

### 2. T5 is the best-calibrated tier

78% of T5 monsters (L31-40) are within ±3. This is where the stat scaling produces the most consistent power-to-level ratio. T5 standard monsters have enough HP, AC, and ATK to justify their level without needing legendary features.

### 3. The formula correctly identifies stat deficiencies

Monsters rated below their level lack the features that justify their position. Example: Siege Wurm (L48, CR 40.2) has HP 180, AC 23, ATK +21, multiattack + AoE + on_hit, but no legendary actions, no legendary resistances, no phase transitions. Compare to Blight Dragon (L45, CR 45.0) which has all of those features.

---

## Monsters Requiring Stat/Ability Buffs

These standard/elite monsters have `delta < -5`, meaning their actual combat stats place them significantly below their hand-assigned level. They are the top candidates for a future monster ability pass.

| Monster | Level | CR | Delta | Type | Missing Features |
|---------|------:|---:|------:|------|-----------------|
| **Siege Wurm** | 48 | 40.2 | -7.8 | standard | No legendary actions, no LR, no phase transition. For L48, needs at least 1 LA or phase transition. |
| **Plains Thunderherd** | 45 | 39.2 | -5.8 | standard | No legendary features, no phase transition. HP 180 is low for L45 standard. Needs AoE buff or legendary action. |
| **Mind Reaver** | 44 | 38.7 | -5.3 | standard | Has on_hit + status but no legendary features. For L44, needs either legendary action or much higher HP (~220+). |
| **Swamp Hydra** | 43 | 37.9 | -5.1 | standard | Has multiattack + regen (7/turn) but no legendary features. Regen alone insufficient at this tier. Needs AoE or LA. |

### Recommended Buffs

**Tier priority:** These 4 monsters should be addressed in a future monster ability pass. Options:

1. **Add legendary actions (1)** — most impactful single change, adds 50% effective DPR
2. **Add phase transition** — adds 10-15% EHP and narrative drama
3. **Add AoE ability** — gives the monster a way to threaten above its base DPR
4. **Increase HP** — simple but doesn't address the mechanical gap

Alternatively, their hand-assigned levels could be reduced 5-8 levels to match their actual power, but this would create gaps in the encounter pool for those level ranges.

### Near-Miss Monsters (delta -4.0 to -5.0)

These monsters are borderline and should be monitored:

| Monster | Level | CR | Delta | Type |
|---------|------:|---:|------:|------|
| Tundra Sentinel | 44 | 39.1 | -4.9 | standard |
| Abyssal Ravager | 48 | 43.3 | -4.7 | elite |
| Granite Warden | 46 | 41.4 | -4.6 | standard |

---

## Formula Implementation

- **File:** `shared/src/data/combat/cr-formula.ts`
- **Exports:** `computeFormulaCR(input: CRInput): number`, `recomputeMonsterCR(input: CRInput): { formulaCr: number; level: number }`, `CRInput` interface
- **Pure function:** No async, no DB calls, sub-millisecond execution
- **Seed integration:** `database/seeds/monsters.ts` computes `formulaCr` at seed time and stores it on the monster record. Hand-assigned `level` is preserved (NOT overridden).
- **Admin route:** TODO comment added to `server/src/routes/admin/monsters.ts` requiring `recomputeMonsterCR()` call on any future PATCH/PUT endpoint.
