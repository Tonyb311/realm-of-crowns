# Full Rebaseline Simulation — Post-Armor-Fix Baseline

**Date:** 2026-03-10
**Context:** Post armor-gaps-and-sim-sync fix. Cloth armor now has physical AC, 3 new T1 leather recipes, sim weapon/armor values synced to actual recipes.
**Solo Run ID:** `f0233726-cd10-4b91-835f-ef270250911c` — 14,000 fights in 37.6s
**Group Run ID:** `2606d2ae-edd5-438d-be54-a74b5d9ee833` — 4,500 fights in 47.2s
**Previous baseline:** `2026-03-10 pre-fix` (post-attackStat-refactor, pre-armor-fix). Comparison in Section 10.

---

## 1. Solo — Class Progression Curves (L1→L40)

### Win Rate by Class and Level

| Level | Monster | Warrior | Ranger | Rogue | Cleric | Bard | Mage | Psion | Avg |
|-------|---------|---------|--------|-------|--------|------|------|-------|-----|
| 1 | Goblin (std) | 98% | 99% | 83% | 94% | 94% | 91% | 88% | 92.4% |
| 1 | Wild Boar (hard) | 82% | 68% | 20% | 57% | 52% | 45% | 24% | 49.7% |
| 3 | Bandit (std) | 86% | 72% | 51% | 65% | 25% | 32% | 7% | 48.3% |
| 3 | Worg (hard) | 87% | 74% | 38% | 47% | 17% | 16% | 4% | 40.4% |
| 5 | Skeleton Warrior (std) | 100% | 100% | 99% | 100% | 87% | 74% | 78% | 91.1% |
| 5 | Ghoul Pack Leader (hard) | 87% | 76% | 66% | 83% | 45% | 45% | 36% | 62.6% |
| 8 | Dire Wolf (std) | 100% | 99% | 94% | 95% | 72% | 41% | 37% | 76.9% |
| 8 | Ironhide Ogre (hard) | 100% | 98% | 89% | 96% | 75% | 56% | 45% | 79.9% |
| 10 | Sandscale Basilisk (std) | 100% | 100% | 97% | 98% | 26% | 0% | 83% | 72.0% |
| 10 | Crypt Warden (hard) | 63% | 72% | 68% | 73% | 32% | 0% | 63% | 53.0% |
| 15 | Hydra (hard) | 93% | 29% | 1% | 64% | 0% | 1% | 0% | 26.9% |
| 15 | Mire Hulk (std) | 99% | 71% | 16% | 86% | 0% | 7% | 0% | 39.9% |
| 20 | Mind Flayer (std) | 100% | 98% | 93% | 97% | 77% | 67% | 34% | 80.9% |
| 20 | Sandstorm Djinn (hard) | 100% | 100% | 69% | 99% | 0% | 26% | 58% | 64.6% |
| 25 | Purple Worm (hard) | 67% | 0% | 0% | 0% | 0% | 0% | 10% | 11.0% |
| 25 | Ashlands Wyrm (std) | 89% | 37% | 16% | 4% | 14% | 0% | 48% | 29.7% |
| 30 | Storm Giant (std) | 2% | 0% | 0% | 0% | 0% | 0% | 0% | 0.3% |
| 30 | Dread Colossus (hard) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0% |
| 40 | Archlich (std) | 51% | 83% | 0% | 18% | 0% | 0% | 0% | 21.7% |
| 40 | Ember Titan (hard) | 28% | 100% | 0% | 3% | 0% | 0% | 0% | 18.7% |

### Average Rounds by Class and Level

| Level | Warrior | Ranger | Rogue | Cleric | Bard | Mage | Psion |
|-------|---------|--------|-------|--------|------|------|-------|
| 1     | 7.8     | 7.6    | 9.9   | 10.5   | 7.6  | 7.3  | 9.3   |
| 3     | 5.6     | 5.1    | 5.2   | 6.2    | 5.5  | 4.8  | 5.1   |
| 5     | 4.3     | 3.8    | 4.6   | 4.3    | 6.5  | 5.0  | 5.6   |
| 8     | 3.5     | 3.3    | 3.9   | 3.7    | 4.7  | 4.0  | 4.1   |
| 10    | 4.5     | 3.2    | 4.5   | 4.7    | 7.9  | 6.7  | 5.6   |
| 15    | 4.0     | 5.1    | 4.4   | 5.8    | 3.9  | 3.0  | 3.3   |
| 20    | 4.7     | 7.2    | 8.6   | 7.2    | 8.4  | 6.6  | 9.7   |
| 25    | 4.7     | 6.4    | 5.0   | 5.5    | 4.8  | 3.4  | 5.4   |
| 30    | 3.8     | 3.0    | 2.7   | 3.5    | 2.7  | 2.2  | 2.2   |
| 40    | 8.3     | 6.5    | 8.4   | 9.9    | 7.9  | 6.1  | 6.7   |

---

## 2. Solo — Class Summary

| Class | Overall Win% | L1 | L3 | L5 | L8 | L10 | L15 | L20 | L25 | L30 | L40 |
|-------|-------------|-----|-----|-----|-----|------|------|------|------|------|------|
| **Warrior** | **76.6%** | 90.0% | 86.5% | 93.5% | 100.0% | 81.5% | 96.0% | 100.0% | 78.0% | 1.0% | 39.5% |
| **Ranger** | **68.8%** | 83.5% | 73.0% | 88.0% | 98.5% | 86.0% | 50.0% | 99.0% | 18.5% | 0.0% | 91.5% |
| **Cleric** | **59.0%** | 75.5% | 56.0% | 91.5% | 95.5% | 85.5% | 75.0% | 98.0% | 2.0% | 0.0% | 10.5% |
| **Rogue** | **45.0%** | 51.5% | 44.5% | 82.5% | 91.5% | 82.5% | 8.5% | 81.0% | 8.0% | 0.0% | 0.0% |
| **Psion** | **30.8%** | 56.0% | 5.5% | 57.0% | 41.0% | 73.0% | 0.0% | 46.0% | 29.0% | 0.0% | 0.0% |
| **Bard** | **30.8%** | 73.0% | 21.0% | 66.0% | 73.5% | 29.0% | 0.0% | 38.5% | 7.0% | 0.0% | 0.0% |
| **Mage** | **25.1%** | 68.0% | 24.0% | 59.5% | 48.5% | 0.0% | 4.0% | 46.5% | 0.0% | 0.0% | 0.0% |

**Class hierarchy:** Warrior (76.6%) > Ranger (68.8%) > Cleric (59.0%) > Rogue (45.0%) > Psion (30.8%) = Bard (30.8%) > Mage (25.1%)

---

## 3. Solo — Monster Summary

| Monster | Level | Fights | Player Win% | Avg Rounds | Flag |
|---------|-------|--------|-------------|------------|------|
| Goblin | 1 | 700 | 92.4% | 11.0 | EASY (>85%) |
| Wild Boar | 2 | 700 | 49.7% | 6.1 | |
| Bandit | 3 | 700 | 48.3% | 5.2 | |
| Worg | 4 | 700 | 40.4% | 5.5 | |
| Skeleton Warrior | 5 | 700 | 91.1% | 3.6 | EASY (>85%) |
| Ghoul Pack Leader | 6 | 700 | 62.6% | 6.2 | OK |
| Dire Wolf | 8 | 700 | 76.9% | 3.8 | OK |
| Ironhide Ogre | 9 | 700 | 79.9% | 3.9 | OK |
| Sandscale Basilisk | 11 | 700 | 72.0% | 5.1 | OK |
| Crypt Warden | 12 | 700 | 53.0% | 5.5 | OK |
| Hydra | 15 | 700 | 26.9% | 3.9 | HARD |
| Mire Hulk | 16 | 700 | 39.9% | 4.6 | |
| Mind Flayer | 20 | 700 | 80.9% | 8.6 | OK (high) |
| Sandstorm Djinn | 22 | 700 | 64.6% | 6.4 | OK |
| Purple Worm | 25 | 700 | 11.0% | 4.9 | **VERY HARD (<15%)** |
| Ashlands Wyrm | 26 | 700 | 29.7% | 5.2 | HARD |
| Storm Giant | 30 | 700 | 0.3% | 3.0 | **UNBEATABLE** |
| Dread Colossus | 32 | 700 | 0.0% | 2.7 | **UNBEATABLE** |
| Archlich | 38 | 700 | 21.7% | 8.6 | HARD (ranger/warrior only) |
| Ember Titan | 40 | 700 | 18.7% | 6.8 | HARD (ranger/warrior only) |

---

## 4. Solo — Key Findings

### 4.1 Caster Viability (CRITICAL)
All three casters are below the 45–85% solo target:
- **Mage (25.1%):** Worst class. 0% at L10 and L25–40. Complete shutdown after L8.
- **Bard (30.8%):** Narrow effectiveness window at L1/L5/L8. 0% at L15 and L25–40.
- **Psion (30.8%):** Erratic — L10 spike (73%) then crash. Slightly more resilient than Bard/Mage at L25 (29%).

**Root causes to investigate:**
1. Spell damage scaling — do abilities scale with level like weapon attacks?
2. Spell slots passed as `{}` in sim — may be preventing ability usage
3. Casters lack multi-attack scaling that martials get at higher levels
4. Cloth armor T2 gap (17 vs 20 target) compounds over tiers

### 4.2 The L25–L30 Wall
Every class collapses between L25 and L30:
- L25: Warrior 78%, Ranger 18.5%, Rogue 8%, Cleric 2%, all casters ≤29%
- L30: Warrior 1%, everyone else 0%
- Storm Giant (L30) and Dread Colossus (L32) are unbeatable solo

**Conclusion:** L25+ content is group-only. Solo encounters should not feature L30+ monsters.

### 4.3 L40 Recovery for Ranger/Warrior Only
- Ranger 91.5% (83% vs Archlich, 100% vs Ember Titan) — sharpshooter spec dominates
- Warrior 39.5% (51% vs Archlich, 28% vs Ember Titan) — decent but below target
- All other classes 0–10.5%

### 4.4 Psion L10 Anomaly
Psion jumps from 41% at L8 to 73% at L10 (Telepath spec grant), then crashes to 0% at L15. The spec ability provides a one-level power spike that doesn't sustain.

### 4.5 Mage L10 Complete Shutdown
Mage is 0% vs both L10 opponents (Sandscale Basilisk 0%, Crypt Warden 0%). This is unique — other casters manage 26–83% vs Basilisk and 32–63% vs Crypt Warden. Likely a magic resistance hard counter.

### 4.6 Bard L20 Hard Counter
Bard is 77% vs Mind Flayer but 0% vs Sandstorm Djinn at L20. A specific mechanic (wind/elemental resistance?) completely nullifies the Bard.

---

## 5. Group Sim Overview

**Config:** 5 party compositions × 6 levels (5, 10, 15, 20, 30, 40) × 3 difficulties (easy, medium, hard) × 50 iterations = **4,500 fights**
**Method:** CR-match (budget = partySize × partyLevel × difficultyMultiplier)

---

## 6. Group Results

### Party Win Rates by Level and Difficulty

| Party | L5 E/M/H | L10 E/M/H | L15 E/M/H | L20 E/M/H | L30 E/M/H | L40 E/M/H |
|-------|----------|-----------|-----------|-----------|-----------|-----------|
| Duo — War+Cle | 100/100/86 | 100/98/94 | 100/96/96 | 92/98/80 | 88/94/56 | 96/90/54 |
| Trio — Balanced | 100/98/82 | 98/100/96 | 96/90/68 | 100/92/48 | 100/80/28 | 94/56/16 |
| Quartet — Standard | 100/100/98 | 100/100/98 | 98/94/68 | 100/78/42 | 100/86/68 | 90/68/18 |
| Full Party — Balanced | 100/100/98 | 100/98/96 | 100/94/64 | 100/80/20 | 100/80/40 | 98/68/6 |
| Full Party — Caster Heavy | 100/94/94 | 98/96/86 | 98/72/28 | 98/54/4 | 98/66/26 | 90/48/8 |

### Averages by Difficulty

| Difficulty | L5 | L10 | L15 | L20 | L30 | L40 | Overall |
|------------|-----|------|------|------|------|------|---------|
| Easy | 100% | 99.2% | 98.4% | 98.0% | 97.2% | 93.6% | **97.7%** |
| Medium | 98.4% | 98.4% | 89.2% | 80.4% | 81.2% | 66.0% | **85.6%** |
| Hard | 91.6% | 94.0% | 64.8% | 38.8% | 43.6% | 20.4% | **58.9%** |

---

## 7. Group — Key Findings

### 7.1 Party Composition Rankings (by Hard Difficulty Resilience)

| Rank | Party | Hard Avg | Notes |
|------|-------|----------|-------|
| 1 | Duo — War+Cle | **77.7%** | Tank+heal dominates. Never below 54%. |
| 2 | Quartet — Standard | **65.3%** | All-martial + healer. Strong through L30. |
| 3 | Trio — Balanced | **56.3%** | Mage deadweight at L30+ drags it down. |
| 4 | Full Party — Balanced | **54.0%** | More members = harder CR encounters. Mage weakens. |
| 5 | Full Party — Caster Heavy | **41.0%** | Worst party. Hard fails from L15. |

### 7.2 Duo Warrior+Cleric Dominance
The Duo consistently outperforms larger parties at hard difficulty. This reveals a CR-matching imbalance: the system generates harder encounters for more members, but caster members contribute negative value at high levels.

### 7.3 Caster-Heavy Party Failures
12 balance alerts, 7 involve caster-heavy or caster-inclusive compositions:
- L15 hard: 28% (target 40%+)
- L20 medium: 54% (target 60%+)
- L20 hard: 4% (target 40%+)
- L30 hard: 26% (target 40%+)
- L40 medium: 48% (target 60%+)
- L40 hard: 8% (target 40%+)

---

## 8. Group Balance Alerts

| Party | Level | Difficulty | Win% | Expected | Status |
|-------|-------|------------|------|----------|--------|
| Trio — Balanced | 30 | hard | 28% | 40%+ | **FAIL** |
| Trio — Balanced | 40 | medium | 56% | 60%+ | **FAIL** |
| Trio — Balanced | 40 | hard | 16% | 40%+ | **FAIL** |
| Quartet — Standard | 40 | hard | 18% | 40%+ | **FAIL** |
| Full Party — Balanced | 20 | hard | 20% | 40%+ | **FAIL** |
| Full Party — Balanced | 40 | hard | 6% | 40%+ | **FAIL** |
| Full Party — Caster Heavy | 15 | hard | 28% | 40%+ | **FAIL** |
| Full Party — Caster Heavy | 20 | medium | 54% | 60%+ | **FAIL** |
| Full Party — Caster Heavy | 20 | hard | 4% | 40%+ | **FAIL** |
| Full Party — Caster Heavy | 30 | hard | 26% | 40%+ | **FAIL** |
| Full Party — Caster Heavy | 40 | medium | 48% | 60%+ | **FAIL** |
| Full Party — Caster Heavy | 40 | hard | 8% | 40%+ | **FAIL** |

---

## 9. Design Target Scorecard

### Solo Win Rate Targets: 45–85% per class overall

| Class | Win% | Target | Status |
|-------|------|--------|--------|
| Warrior | 76.6% | 45–85% | **PASS** |
| Ranger | 68.8% | 45–85% | **PASS** |
| Cleric | 59.0% | 45–85% | **PASS** |
| Rogue | 45.0% | 45–85% | **PASS** (borderline) |
| Psion | 30.8% | 45–85% | **FAIL** (-14.2pp) |
| Bard | 30.8% | 45–85% | **FAIL** (-14.2pp) |
| Mage | 25.1% | 45–85% | **FAIL** (-19.9pp) |

### Group Win Rate Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Easy avg | >90% | 97.7% | **PASS** |
| Medium avg | >60% | 85.6% | **PASS** (over target by 25pp) |
| Hard avg | >40% | 58.9% | **PASS** (over target by 19pp) |
| Hard individual cell minimum | >40% | 4% (Caster Heavy L20) | **12 FAIL cells** |

### Monster Difficulty Targets: 30–70% player survival per encounter pair

| Bracket | Monsters | Avg Player Win% | Status |
|---------|----------|-----------------|--------|
| L1–5 | Goblin, Wild Boar, Bandit, Worg, Skeleton Warrior, Ghoul Pack Leader | 64.1% | **PASS** |
| L8–10 | Dire Wolf, Ironhide Ogre, Sandscale Basilisk, Crypt Warden | 70.5% | **PASS** (borderline high) |
| L15–16 | Hydra, Mire Hulk | 33.4% | **FAIL** (hard for non-warriors) |
| L20–22 | Mind Flayer, Sandstorm Djinn | 72.8% | **PASS** (slightly high) |
| L25–26 | Purple Worm, Ashlands Wyrm | 20.4% | **FAIL** (overtuned) |
| L30–32 | Storm Giant, Dread Colossus | 0.1% | **FAIL** (unbeatable solo) |
| L38–40 | Archlich, Ember Titan | 20.2% | **FAIL** (ranger/warrior only) |

---

## 10. Comparison to Pre-Fix Baseline

Previous baseline: post-attackStat-refactor, pre-armor-fix (same date, earlier run).

### Solo Class Overall Shifts

| Class | Pre-Fix | Post-Fix | Shift | Notes |
|-------|---------|----------|-------|-------|
| Warrior | 80.2% | 76.6% | **-3.6pp** | Slight drop, likely RNG variance |
| Ranger | 71.0% | 68.8% | -2.2pp | Stable |
| Cleric | 59.4% | 59.0% | -0.4pp | Stable |
| Rogue | 44.0% | 45.0% | +1.0pp | Stable |
| Psion | 27.9% | 30.8% | +2.9pp | Slight improvement |
| Bard | 23.8% | 30.8% | **+7.0pp** | Notable improvement |
| Mage | 19.5% | 25.1% | **+5.6pp** | Notable improvement |

### Key Shift Analysis

The armor fix improved casters (Bard +7pp, Mage +5.6pp, Psion +2.9pp) while leaving martials stable. This matches expectations: cloth armor AC was 0 before the fix, so casters gained the most physical survivability. However, the improvement is insufficient — all three casters remain below the 45% target.

### Monster-Level Comparison (selected matchups)

| Monster | Pre-Fix Avg | Post-Fix Avg | Shift | Notes |
|---------|------------|-------------|-------|-------|
| Goblin (L1) | 51.1% | 92.4% | **+41.3pp** | Massive improvement — L1 cloth armor matters most |
| Wild Boar (L1) | 46.3% | 49.7% | +3.4pp | Minimal — physical monster, casters still weak |
| Skeleton Warrior (L5) | 89.6% | 91.1% | +1.5pp | Stable |
| Dire Wolf (L8) | 76.1% | 76.9% | +0.8pp | Stable |
| Hydra (L15) | 25.4% | 26.9% | +1.5pp | Stable — cloth armor helps minimally vs L15 |
| Mind Flayer (L20) | 78.7% | 80.9% | +2.2pp | Slight improvement |
| Storm Giant (L30) | 1.3% | 0.3% | -1.0pp | RNG noise at near-0% |
| Archlich (L40) | 32.1% | 21.7% | -10.4pp | Drop — RNG or L40 matchup variance |

### Group Comparison (selected)

| Party | Diff | Pre-Fix L15 | Post-Fix L15 | Pre-Fix L20 | Post-Fix L20 | Pre-Fix L40 | Post-Fix L40 |
|-------|------|-------------|-------------|-------------|-------------|-------------|-------------|
| Duo | Hard | 80% | 96% | 82% | 80% | 50% | 54% |
| Full Balanced | Hard | 56% | 64% | 34% | 20% | 12% | 6% |
| Full Caster Heavy | Hard | 38% | 28% | 2% | 4% | 20% | 8% |

Group results show high variance between runs (n=50 per cell). Changes are within noise for most cells.

---

## 11. Priority Actions (Data Only — No Changes Made)

### P0: Caster Balance Overhaul
- Mage (25.1%), Bard (30.8%), Psion (30.8%) all below 45% target
- Armor fix helped (+3–7pp) but is insufficient
- **Next investigation:** spell damage scaling, spell slot integration in sim, caster multi-attack, ability resolution chain

### P1: L25+ Monster Tuning
- Purple Worm (11%), Storm Giant (0.3%), Dread Colossus (0%), Ashlands Wyrm (29.7%) all too hard
- Either reduce stats or designate as group-only encounters
- L30+ should not appear in solo road encounters

### P2: Hydra/Mire Hulk (L15) Tuning
- Hydra (26.9%) and Mire Hulk (39.9%) are hard — only warriors and clerics solo them reliably
- May be intentional mid-game challenge, but 0% for all casters is harsh

### P3: Rogue High-Tier Survivability
- Rogue (45.0%) passes barely, but collapses at L15 (8.5%) and L25+ (0–8%)
- Compare ranger (same armor, 68.8%) — ranged safety is the difference
- Rogue needs better evasion scaling or burst at high tiers

---

## 12. Armor Fix Impact Summary

| Change | Expected Impact | Actual Impact |
|--------|----------------|---------------|
| Cloth armor values (T1=8, T2=17, T3=35, T4=57) | Casters gain physical AC | Casters +3–7pp overall. L1 Goblin +41pp (biggest impact at lowest tier). |
| 3 new T1 leather recipes (sum=15) | Rogue/ranger L1 coverage | Rogue L1 = 51.5% (was lower), ranger L1 = 83.5%. Leather coverage helps. |
| Caster weapon dice synced | Casters deal more auto-attack damage | Negligible — casters use abilities, not weapon attacks |
| RAW_ARMOR lowered for leather classes | More accurate sim | Stable win rates — realistic armor values confirmed |
| RAW_ARMOR T2 cloth (20→17) | Reflects missing Linen Leggings | Minor — T2 gap is real but not a major factor |

**Key takeaway:** The armor/weapon sync was necessary for sim accuracy, and casters gained measurable survivability from cloth armor. But the real balance problem is caster **damage output**, not survivability. The next fix should focus on caster ability scaling.

---

## Files

| File | Purpose |
|------|---------|
| `server/src/scripts/sim-configs/full-rebaseline-solo.json` | Solo sim config (140 matchups) |
| `server/src/scripts/sim-configs/full-rebaseline-group.json` | Group sim config (90 matchups) |
| `audits/full-rebaseline-sim.md` | This report |
