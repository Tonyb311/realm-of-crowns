# Post-Rebalance Sim Results (v2 — Weapon Tier Fix + Monster Rebalance)

**Run ID:** `cmmfo9g9y00005sr575hm173j`
**Date:** 2026-03-07
**Config:** 20 monsters x 7 classes x 200 iterations = 25,200 encounters (126 matchups; 18 monsters matched from DB)
**Changes tested:** Fixed `getTierIndex()` weapon tiers + full 129-monster rebalance (HP -50-70%, AC capped, damage scaled, ability nerfs)

---

## 1. Overall Win Rate

**27.7%** (target: 40-50%)

Still below target. T1-T2 are in range but T3+ collapses. The balance cliff moved from L13 (pre-rebalance) to roughly the same spot, though T1-T2 improved significantly.

---

## 2. Win Rate by Class

| Class | Win Rate | Assessment |
|-------|----------|------------|
| Ranger | 51.0% | Good |
| Warrior | 50.3% | Good |
| Cleric | 36.3% | Slightly low |
| Rogue | 28.1% | Low |
| Bard | 13.6% | Very low |
| Mage | 7.2% | Critical |
| Psion | 7.2% | Critical |

Warrior and Ranger are balanced. Cleric is acceptable. Rogue, Bard, Mage, and Psion are underperforming — this is a **class balance problem**, not a monster problem.

---

## 3. Win Rate by Level Bracket

| Bracket | Win Rate | Matchups | Assessment |
|---------|----------|----------|------------|
| T1 (L1-5) | 44.5% | 42 | In range |
| T2 (L6-10) | 50.8% | 21 | Good |
| T3 (L11-20) | 24.0% | 21 | Low — Hydra/Void Stalker too hard |
| T4 (L21-30) | 0.2% | 14 | Critical — 0% wall |
| T5 (L31-40) | 3.1% | 14 | Critical |
| T6 (L41-50) | 0.0% | 14 | Critical |

---

## 4. Win Rate Heat Map (Class x Level Bracket)

| Class | T1 (L1-5) | T2 (L6-10) | T3 (L11-20) | T4 (L21-30) | T5 (L31-40) | T6 (L41-50) |
|-------|-----------|------------|-------------|-------------|-------------|-------------|
| **Warrior** | 85% | 93% | 38% | 0% | 0% | 0% |
| **Ranger** | 73% | 93% | 54% | 0% | 22% | 0% |
| **Cleric** | 56% | 74% | 32% | 0% | 0% | 0% |
| **Rogue** | 42% | 62% | 23% | 0% | 0% | 0% |
| **Bard** | 23% | 18% | 18% | 0% | 0% | 0% |
| **Mage** | 18% | 7% | 0% | 0% | 0% | 0% |
| **Psion** | 15% | 10% | 2% | 1% | 0% | 0% |

**Key observations:**
- Warrior & Ranger are healthy through T2, viable at T3
- Every class hits 0% by T4 (L21-30)
- Mage and Psion are essentially non-functional at all tiers
- The 0% cliff at T4+ is the primary problem

---

## 5. Monsters Still Overtuned (Warrior Win% < 30% at bracket)

| Monster | Level | Warrior Win% | Issue |
|---------|-------|-------------|-------|
| Hydra | 15 | 5% | Monster DPR 75/round kills warrior in ~3 rounds. Multihead attack too strong. |
| Purple Worm | 25 | 0% | 116 mDmg in 4.3 rounds = ~27 DPR. Warrior pDmg only 36 total. HP or damage still too high. |
| Storm Giant | 30 | 0% | 137 mDmg in 3.4 rounds = ~40 DPR. Player dead in 3 rounds. Massive damage/round. |
| Basilisk King | 35 | 0% | 157 mDmg, player manages 56 pDmg total. Monster kills in ~4 rounds. |
| Archlich | 40 | 0% | Warrior survives 11.4 rounds but deals only 66 damage total (6 DPR). Monster too tanky or player DPR too low. |
| Blight Dragon | 45 | 0% | 184 mDmg in 6 rounds = 31 DPR vs warrior. |
| Void Emperor | 50 | 0% | 214 mDmg in 7.3 rounds = 29 DPR. Player deals only 29 total damage. |
| Void Stalker | 13 | 17% | Borderline. 66 mDmg in 4.2 rounds = 16 DPR vs warrior. |

---

## 6. Monsters Now Too Easy (Warrior Win% > 80%)

| Monster | Level | Warrior Win% | Notes |
|---------|-------|-------------|-------|
| Skeleton Warrior | 5 | 99% | T1 low end — acceptable. |
| Ghoul Stalker | 5 | 95% | T1/T2 transition — acceptable. |
| Dire Wolf | 8 | 98% | T2 warrior dominance expected. |
| Sandscale Basilisk | 10 | 97% | T3 entry point, warrior dominance expected. |

These are acceptable — warriors should dominate T1-T2 monsters.

---

## 7. Class Balance Assessment

### Warrior vs Mage divergence by bracket:

| Bracket | Warrior | Mage | Gap |
|---------|---------|------|-----|
| T1 | 85% | 18% | 67 pts |
| T2 | 93% | 7% | 86 pts |
| T3 | 38% | 0% | 38 pts |
| T4+ | 0% | 0% | 0 pts (both dead) |

**The warrior-mage gap is catastrophic.** Even at T1, mages win only 18% vs warrior's 85%. This is NOT a monster balance issue — it's a class design/sim issue:

1. **Mage deals 0 damage vs Mind Flayer** — 0 pDmg in 200 fights suggests Mind Flayer may be immune/resistant to magic damage, or mage attacks are failing to resolve
2. **Psion deals 0 damage vs Archlich and Void Emperor** — same issue, likely magic resistance or save-based abilities auto-failing
3. **Bard underperforms** — support class without party = no value from buffs/debuffs

---

## 8. DPR Analysis Per Class Per Bracket

Average player damage dealt (total per fight, not per-round) by class across brackets:

| Class | T1 avg | T2 avg | T3 avg | T4 avg | T5+ avg |
|-------|--------|--------|--------|--------|---------|
| Warrior | 18.5 | 18.6 | 39.4 | 32.3 | 46.1 |
| Ranger | 17.6 | 18.4 | 39.4 | 8.7 | 74.4 |
| Cleric | 15.3 | 16.2 | 31.6 | 9.8 | 31.0 |
| Rogue | 14.0 | 15.6 | 28.3 | 20.7 | 59.1 |
| Bard | 12.0 | 14.2 | 24.1 | 17.3 | 38.5 |
| Mage | 11.2 | 10.3 | 3.0 | 9.6 | 29.5 |
| Psion | 10.0 | 9.7 | 13.5 | 22.7 | 11.3 |

**Mage total damage at T3 = 3.0** — this is broken. Either mage attacks are being nullified or mage weapon/spell damage is negligible.

---

## 9. Comparison: Pre-Rebalance (v1) vs Post-Rebalance (v2)

| Metric | v1 (pre-rebalance) | v2 (weapon fix + rebalance) | Change |
|--------|---------------------|----------------------------|--------|
| Overall win rate | 8.8% | 27.7% | +18.9 pts |
| Warrior win rate | ~15% | 50.3% | +35 pts |
| T1 bracket | ~25% | 44.5% | +19.5 pts |
| T2 bracket | ~15% | 50.8% | +36 pts |
| T3 bracket | ~5% | 24.0% | +19 pts |
| T4+ bracket | 0% | 0.7% | +0.7 pts |
| Level at which 0% cliff starts | L13 | L25 (warrior), L13 (caster) | Improved for melee |

---

## 10. Per-Monster Detail (All Classes)

### T1: Giant Rat (L1)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 85% | 9.3 | 17 | 8 |
| ranger | 73% | 10.0 | 16 | 10 |
| cleric | 46% | 13.7 | 14 | 13 |
| rogue | 31% | 12.3 | 12 | 13 |
| bard | 31% | 12.2 | 12 | 13 |
| psion | 30% | 10.7 | 12 | 12 |
| mage | 28% | 10.7 | 11 | 12 |

### T1: Goblin (L1)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 84% | 9.0 | 23 | 11 |
| ranger | 67% | 8.2 | 22 | 13 |
| cleric | 48% | 11.2 | 20 | 15 |
| rogue | 24% | 9.2 | 17 | 15 |
| bard | 24% | 9.5 | 17 | 15 |
| psion | 18% | 8.0 | 15 | 13 |
| mage | 16% | 8.3 | 16 | 13 |

### T1: Bandit (L3)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 77% | 5.0 | 19 | 18 |
| ranger | 55% | 4.5 | 17 | 21 |
| cleric | 41% | 5.3 | 15 | 21 |
| rogue | 30% | 4.4 | 14 | 20 |
| bard | 7% | 4.8 | 10 | 22 |
| psion | 4% | 3.9 | 8 | 18 |
| mage | 3% | 3.7 | 8 | 18 |

### T1: Prairie Stalker (L3)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 74% | 4.6 | 16 | 19 |
| ranger | 61% | 4.3 | 16 | 20 |
| cleric | 35% | 4.9 | 14 | 21 |
| rogue | 28% | 4.2 | 13 | 20 |
| mage | 4% | 3.7 | 8 | 18 |
| bard | 4% | 4.4 | 9 | 22 |
| psion | 2% | 3.5 | 7 | 18 |

### T1/T2: Skeleton Warrior (L5)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 99% | 3.0 | 15 | 13 |
| ranger | 99% | 2.8 | 15 | 13 |
| cleric | 94% | 3.1 | 15 | 15 |
| rogue | 85% | 3.3 | 14 | 18 |
| bard | 49% | 4.5 | 13 | 24 |
| mage | 39% | 3.2 | 12 | 19 |
| psion | 27% | 3.4 | 11 | 20 |

### T1/T2: Ghoul Stalker (L5)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 95% | 3.9 | 15 | 16 |
| ranger | 82% | 3.9 | 14 | 18 |
| cleric | 74% | 4.1 | 13 | 19 |
| rogue | 54% | 4.3 | 12 | 22 |
| mage | 22% | 3.8 | 8 | 21 |
| bard | 22% | 5.3 | 9 | 26 |
| psion | 11% | 4.0 | 7 | 21 |

### T2: Dire Wolf (L8)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 98% | 3.4 | 19 | 23 |
| ranger | 94% | 3.2 | 18 | 24 |
| cleric | 80% | 3.5 | 18 | 28 |
| rogue | 67% | 3.7 | 17 | 31 |
| bard | 40% | 4.2 | 16 | 34 |
| mage | 15% | 3.3 | 11 | 27 |
| psion | 9% | 3.4 | 11 | 27 |

### T2: Ironhide Ogre (L8)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 84% | 3.4 | 18 | 32 |
| ranger | 84% | 3.1 | 18 | 31 |
| cleric | 56% | 3.3 | 16 | 33 |
| rogue | 38% | 3.3 | 14 | 34 |
| bard | 12% | 3.5 | 12 | 36 |
| mage | 6% | 2.8 | 9 | 28 |
| psion | 4% | 2.9 | 9 | 28 |

### T3: Sandscale Basilisk (L10)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| ranger | 100% | 3.1 | 34 | 20 |
| warrior | 97% | 4.5 | 34 | 32 |
| cleric | 85% | 5.7 | 32 | 30 |
| rogue | 82% | 4.2 | 33 | 32 |
| psion | 18% | 4.4 | 23 | 31 |
| bard | 2% | 5.3 | 18 | 43 |
| mage | 0% | 3.9 | 9 | 32 |

### T3: Void Stalker (L13)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| ranger | 66% | 3.6 | 38 | 56 |
| warrior | 17% | 4.2 | 29 | 66 |
| cleric | 0% | 3.9 | 15 | 54 |
| rogue | 0% | 3.3 | 15 | 52 |
| bard | 0% | 3.1 | 5 | 52 |
| mage | 0% | 2.3 | 4 | 38 |
| psion | 0% | 2.3 | 4 | 38 |

### T3: Hydra (L15)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 5% | 3.3 | 20 | 75 |
| ranger | 0% | 3.0 | 10 | 74 |
| cleric | 0% | 2.9 | 10 | 60 |
| bard | 0% | 2.1 | 6 | 58 |
| rogue | 0% | 2.1 | 5 | 58 |
| mage | 0% | 1.8 | 5 | 42 |
| psion | 0% | 1.9 | 4 | 42 |

### T3/T4: Mind Flayer (L20)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| cleric | 97% | 8.9 | 70 | 41 |
| ranger | 96% | 8.4 | 70 | 54 |
| warrior | 94% | 7.9 | 69 | 62 |
| rogue | 70% | 9.2 | 65 | 60 |
| bard | 54% | 8.0 | 61 | 65 |
| psion | 6% | 9.2 | 34 | 51 |
| mage | 0% | 7.3 | 0 | 52 |

### T4: Purple Worm (L25)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| psion | 3% | 4.8 | 41 | 62 |
| warrior | 0% | 4.3 | 36 | 116 |
| bard | 0% | 3.3 | 24 | 88 |
| mage | 0% | 2.9 | 14 | 62 |
| cleric | 0% | 3.5 | 13 | 90 |
| ranger | 0% | 4.4 | 13 | 114 |
| rogue | 0% | 3.3 | 9 | 88 |

### T4: Storm Giant (L30) — 0% all classes
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| warrior | 0% | 3.4 | 29 | 137 |
| rogue | 0% | 2.5 | 32 | 103 |
| bard | 0% | 2.6 | 10 | 103 |
| cleric | 0% | 2.8 | 6 | 106 |
| mage | 0% | 2.1 | 5 | 72 |
| ranger | 0% | 3.4 | 5 | 134 |
| psion | 0% | 2.1 | 4 | 72 |

### T5: Basilisk King (L35) — 0% except ranger 3%
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| ranger | 3% | 6.5 | 103 | 154 |
| warrior | 0% | 6.4 | 56 | 157 |
| rogue | 0% | 4.7 | 41 | 118 |
| cleric | 0% | 5.9 | 30 | 121 |
| bard | 0% | 4.7 | 29 | 118 |
| mage | 0% | 3.6 | 24 | 82 |
| psion | 0% | 3.4 | 9 | 82 |

### T5: Archlich (L40)
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| ranger | 41% | 8.2 | 158 | 160 |
| warrior | 0% | 11.4 | 66 | 178 |
| rogue | 0% | 6.7 | 68 | 133 |
| bard | 0% | 6.4 | 58 | 133 |
| cleric | 0% | 9.5 | 44 | 137 |
| mage | 0% | 5.0 | 44 | 92 |
| psion | 0% | 4.6 | 0 | 92 |

### T6: Blight Dragon (L45) — 0% all classes
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| ranger | 0% | 4.4 | 72 | 163 |
| warrior | 0% | 6.0 | 40 | 184 |
| rogue | 0% | 3.6 | 29 | 129 |
| bard | 0% | 3.4 | 26 | 138 |
| psion | 0% | 3.9 | 25 | 95 |
| mage | 0% | 2.9 | 21 | 100 |
| cleric | 0% | 5.3 | 18 | 147 |

### T6: Void Emperor (L50) — 0% all classes
| Class | Win% | Rounds | pDmg | mDmg |
|-------|------|--------|------|------|
| ranger | 0% | 5.5 | 48 | 208 |
| rogue | 0% | 4.1 | 30 | 154 |
| warrior | 0% | 7.3 | 29 | 214 |
| cleric | 0% | 6.4 | 13 | 168 |
| bard | 0% | 3.7 | 13 | 161 |
| mage | 0% | 3.1 | 9 | 110 |
| psion | 0% | 3.0 | 0 | 109 |

---

## 11. Root Cause Summary

### Problem 1: Monster damage scales too fast relative to player HP
At T4+ (L25+), monsters deal 88-214 total damage in 3-7 rounds. Players die before dealing meaningful damage.
- Purple Worm (L25): kills warrior in 4.3 rounds dealing 116 damage
- Storm Giant (L30): kills in 3.4 rounds dealing 137 damage

### Problem 2: Player DPR doesn't scale with monster HP at T4+
Warrior at L40 deals only 66 total damage vs Archlich in 11.4 rounds = **5.8 DPR**. This is drastically below the theoretical ~13.5 eDPR used for the rebalance plan. The ability tax is consuming more DPR than the 0.45x multiplier assumed.

### Problem 3: Caster classes are non-functional
Mage and Psion deal 0 damage in some matchups (Mind Flayer, Archlich, Void Emperor). This suggests monster magic resistance, spell attacks missing vs high AC, or a sim bug in caster damage resolution.

### Problem 4: Weapon tier plateau
Iron weapons (1d8+1) cover L10-29. Steel (1d10+2) covers L30-54. That's a 20-level plateau for each tier.

---

## 12. Recommended Next Steps

1. **Audit combat logs** for L25+ warrior to understand the DPR gap (theoretical 13.5 vs actual 5.8)
2. **Audit mage/psion combat logs** to find why damage is 0 in some matchups
3. **Further reduce T4-T6 monster HP and damage** — need another 50-60% reduction at T4+
4. **Consider player-side DPR buffs** for high levels
5. **Fix class balance** as a separate workstream from monster tuning
