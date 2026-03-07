# Post-Rebalance Sim Results (v3 — Ability Extra Attacks + Caster Immunities Fix)

**Run ID:** `cmmgldwzv0000c8uxa7r0tm2u`
**Date:** 2026-03-07
**Config:** 20 monsters x 7 classes x 200 iterations = 25,200 encounters (126 matchups)
**Changes tested:** Abilities now fire extra attacks + FORCE/PSYCHIC immunities removed from 5 bosses

---

## 1. Overall Win Rate

| Version | Win Rate | Change |
|---------|----------|--------|
| v1 (pre-rebalance) | 8.8% | - |
| v2 (weapon tiers + monster rebalance) | 27.7% | +18.9 pts |
| **v3 (ability tax + immunities fix)** | **28.8%** | +1.1 pts |

Modest overall improvement. The warrior DPR increase is offset by T4+ monsters still being too tanky/deadly.

---

## 2. Win Rate by Class (v2 → v3)

| Class | v2 | v3 | Change |
|-------|-----|-----|--------|
| Warrior | 50.3% | **54.9%** | +4.6 pts |
| Ranger | 51.0% | **53.3%** | +2.3 pts |
| Cleric | 36.3% | **36.7%** | +0.4 pts |
| Rogue | 28.1% | **28.2%** | +0.1 pts |
| Bard | 13.6% | **13.2%** | -0.4 pts |
| Mage | 7.2% | **7.8%** | +0.6 pts |
| Psion | 7.2% | **7.8%** | +0.6 pts |

Warrior gained the most (+4.6 pts) from extra attacks. Casters barely changed — the immunity fix helped at specific matchups but overall caster DPR is still too low.

---

## 3. Win Rate Heat Map (Class x Level Bracket)

| Class | T1 (L1-5) | T2 (L6-10) | T3 (L11-20) | T4 (L21-30) | T5 (L31-40) | T6 (L41-50) |
|-------|-----------|------------|-------------|-------------|-------------|-------------|
| **Warrior** | 86% | 93% | **59%** | 1% | **9%** | 0% |
| **Ranger** | 75% | 91% | **56%** | 0% | **36%** | 0% |
| **Cleric** | 57% | 75% | 32% | 0% | 0% | 0% |
| **Rogue** | 43% | 62% | 20% | 0% | 0% | 0% |
| **Bard** | 22% | 18% | 16% | 0% | 0% | 0% |
| **Mage** | 16% | 7% | **8%** | 0% | 0% | 0% |
| **Psion** | 16% | 12% | 1% | 2% | 0% | 0% |

**v2 → v3 changes:**
- Warrior T3: 38% → **59%** (+21 pts — extra attacks making a big difference at L13-20)
- Warrior T5: 0% → **9%** (no longer 0% everywhere)
- Ranger T5: 22% → **36%** (+14 pts)
- Mage T3: 0% → **8%** (immunity fix lets mage damage Mind Flayer)

---

## 4. Warrior DPR by Level (The Key Output)

| Level | Monster | v2 DPR | v3 DPR | Change | v3 Total Dmg | Avg Rounds |
|-------|---------|--------|--------|--------|--------------|------------|
| 1 | Giant Rat | 1.8 | 1.9 | +0.1 | 17 | 9.2 |
| 1 | Goblin | 2.6 | 2.4 | -0.2 | 22 | 9.3 |
| 3 | Bandit | 3.8 | 3.8 | 0.0 | 19 | 4.9 |
| 3 | Prairie Stalker | 3.5 | 3.6 | +0.1 | 17 | 4.7 |
| 5 | Ghoul Stalker | 3.8 | 4.0 | +0.2 | 15 | 3.7 |
| 5 | Skeleton Warrior | 5.0 | 5.0 | 0.0 | 15 | 3.0 |
| 8 | Dire Wolf | 5.6 | 5.8 | +0.2 | 19 | 3.3 |
| 8 | Ironhide Ogre | 5.3 | 5.5 | +0.2 | 18 | 3.3 |
| 10 | Sandscale Basilisk | 7.6 | 7.5 | -0.1 | 33 | 4.5 |
| **13** | **Void Stalker** | **6.9** | **9.9** | **+3.0** | 35 | 3.5 |
| **15** | **Hydra** | **6.1** | **9.2** | **+3.1** | 29 | 3.2 |
| **20** | **Mind Flayer** | **8.7** | **13.4** | **+4.7** | 70 | 5.2 |
| **25** | **Purple Worm** | **8.4** | **12.5** | **+4.1** | 50 | 4.0 |
| **30** | **Storm Giant** | **8.5** | **14.3** | **+5.8** | 48 | 3.4 |
| **35** | **Basilisk King** | **8.8** | **20.8** | **+12.0** | 122 | 5.8 |
| **40** | **Archlich** | **5.8** | **11.6** | **+5.8** | 96 | 8.3 |
| **45** | **Blight Dragon** | **6.7** | **9.2** | **+2.5** | 41 | 4.4 |
| **50** | **Void Emperor** | **4.0** | **6.2** | **+2.2** | 38 | 6.2 |

**Key takeaway:** Extra attacks after abilities boosted warrior DPR by 40-140% at L13+. The fix is working. But monsters at L25+ are still killing warriors in 3-6 rounds before they can deal enough total damage.

### Warrior DPR Summary by Bracket

| Bracket | Avg Warrior DPR | Note |
|---------|----------------|------|
| T1 (L1-5) | 3.4 | No extra attacks at these levels — no change expected |
| T2 (L8-10) | 6.3 | Extra attacks start at L13, minimal impact at L8-10 |
| T3 (L13-20) | 10.8 | **+55% from v2** — extra attacks kicking in at L13 |
| T4 (L25-30) | 13.4 | **+60% from v2** — 2 attacks per turn |
| T5 (L35-40) | 16.2 | **+88% from v2** — 3 attacks per turn at L34+ |
| T6 (L45-50) | 7.7 | **+53% from v2** — still low because fights end too fast (3-6 rds) |

---

## 5. Caster DPR Analysis

### Mage vs Mind Flayer (FORCE immunity removed)

| Metric | v2 | v3 | Change |
|--------|----|----|--------|
| Win Rate | 0% | **25%** | +25 pts |
| Avg pDmg | 0 | **48** | +48 |
| Avg Rounds | 7.3 | 6.3 | -1.0 |

The FORCE immunity removal worked — Mage can now damage Mind Flayer. 25% win rate is low but non-zero.

### Psion vs Archlich (PSYCHIC immunity → resistance)

| Metric | v2 | v3 | Change |
|--------|----|----|--------|
| Win Rate | 0% | **0%** | No change |
| Avg pDmg | 0 | **14** | +14 |
| Avg Rounds | 4.6 | 4.7 | +0.1 |

Psion now deals some damage (14 total) but it's halved by PSYCHIC resistance. Combined with Archlich's 186 HP, 14 damage is negligible.

### Psion vs Void Emperor (PSYCHIC immunity removed, FORCE resistance removed)

| Metric | v2 | v3 | Change |
|--------|----|----|--------|
| Psion pDmg | 0 | **18** | +18 |
| Mage pDmg | 9 | **17** | +8 |

Modest improvement but both casters are still at 0% win rate vs Void Emperor.

### Overall Caster Assessment

Removing immunities helped specific matchups but casters remain non-functional at all tiers. Root cause: **caster base DPR is too low**, not just monster immunities. Mage at L20 deals 48 total damage in 6.3 rounds = 7.6 DPR, vs Warrior's 13.4. The gap is fundamental — casters lack extra attacks AND their base weapon damage (staff/orb) is low.

---

## 6. What's Still Broken

### T4+ Monster Damage (Primary Issue)

Players die in 3-6 rounds at T4+. Target survival time is 8-14 rounds. Monster DPR is 2-3x too high:

| Monster | Level | Monster DPR vs Warrior | Warrior HP (est.) | Rounds to Kill Warrior |
|---------|-------|----------------------|-------------------|----------------------|
| Purple Worm | 25 | 29 | 120 | 4.1 |
| Storm Giant | 30 | 40 | 140 | 3.5 |
| Basilisk King | 35 | 27 | 160 | 5.9 |
| Archlich | 40 | 21 | 180 | 8.6 |
| Blight Dragon | 45 | 42 | 200 | 4.8 |
| Void Emperor | 50 | 35 | 220 | 6.3 |

### T4+ Monster HP vs Warrior DPR

| Monster | Level | Monster HP | Warrior DPR | Rounds to Kill Monster | Fits Target? |
|---------|-------|-----------|-------------|----------------------|--------------|
| Purple Worm | 25 | 76 | 12.5 | 6.1 | No (warrior dead in 4) |
| Storm Giant | 30 | 106 | 14.3 | 7.4 | No (warrior dead in 3.5) |
| Basilisk King | 35 | 145 | 20.8 | 7.0 | Borderline (close) |
| Archlich | 40 | 186 | 11.6 | 16.0 | No (fight too long for warrior DPR) |
| Blight Dragon | 45 | 225 | 9.2 | 24.5 | No (impossible) |
| Void Emperor | 50 | 270 | 6.2 | 43.5 | No (impossible) |

### Warrior DPR Drops at L40-50

The DPR increase from extra attacks is being offset at L40+ by:
1. **Fights ending too fast** — monsters kill warrior before enough attack rounds happen
2. **Archlich/Void Emperor are so tanky** that even with extra attacks, total damage dealt before death is too low
3. **L40 Warrior gets 3 attacks** but each deals ~4-5 damage against AC 20+ monsters (frequent misses)

---

## 7. Corrected eDPR Multiplier

With ability + extra attacks, the effective DPR multiplier is now:

| Level Bracket | v2 Multiplier (abilities only) | v3 Multiplier (ability + extra attacks) |
|---------------|-------------------------------|---------------------------------------|
| T1 (L1-5) | ~1.5x (abilities help) | ~1.5x (no change — no extra attacks) |
| T2 (L8-10) | ~1.4x | ~1.4x (L8 is pre-extra-attacks) |
| T3 (L13-20) | ~0.65x | **~1.0x** (abilities + 1 extra = ~same as raw) |
| T4 (L25-30) | ~0.55x | **~0.85x** |
| T5 (L35-40) | ~0.35x | **~0.55x** |
| T6 (L45-50) | ~0.25x | **~0.35x** |

The multiplier improved significantly but still drops at T5-T6 because:
- L40+ fights end before all attacks land (monster kills warrior in 3-6 rounds)
- High AC monsters cause frequent misses
- Some ability turns still "waste" extra attacks when the ability itself does AoE or buff

---

## 8. Per-Monster Detail

### T1: Giant Rat (L1)
| Class | Win% | Rds | pDmg | mDmg |
|-------|------|-----|------|------|
| warrior | 89% | 9.2 | 17 | 7 |
| ranger | 75% | 9.4 | 16 | 10 |
| cleric | 48% | 13.6 | 14 | 13 |
| psion | 32% | 10.3 | 12 | 12 |
| rogue | 32% | 12.2 | 13 | 13 |
| bard | 31% | 11.9 | 12 | 14 |
| mage | 28% | 10.5 | 12 | 12 |

### T1: Goblin (L1)
| Class | Win% | Rds | pDmg | mDmg |
|-------|------|-----|------|------|
| warrior | 75% | 9.3 | 22 | 13 |
| ranger | 67% | 8.3 | 22 | 12 |
| cleric | 49% | 11.1 | 20 | 15 |
| rogue | 24% | 9.2 | 17 | 15 |
| bard | 24% | 9.1 | 17 | 15 |
| psion | 22% | 8.1 | 16 | 13 |
| mage | 10% | 7.7 | 14 | 14 |

### T3: Void Stalker (L13) — Major improvement
| Class | v2 Win% | v3 Win% | v3 Rds | v3 pDmg |
|-------|---------|---------|--------|---------|
| warrior | 17% | **55%** | 3.5 | 35 |
| ranger | 66% | **71%** | 3.6 | 38 |
| cleric | 0% | 0% | 4.1 | 15 |
| rogue | 0% | 0% | 3.2 | 15 |
| mage | 0% | 0% | 2.3 | 4 |
| bard | 0% | 0% | 3.1 | 5 |
| psion | 0% | 0% | 2.4 | 5 |

### T3: Hydra (L15) — Improved but still very hard
| Class | v2 Win% | v3 Win% | v3 Rds | v3 pDmg |
|-------|---------|---------|--------|---------|
| warrior | 5% | **26%** | 3.2 | 29 |
| ranger | 0% | 0% | 2.9 | 10 |
| cleric | 0% | 0% | 2.7 | 9 |
| all others | 0% | 0% | ~2 | 4-6 |

### T3/T4: Mind Flayer (L20) — Mage fix working
| Class | v2 Win% | v3 Win% | v3 Rds | v3 pDmg |
|-------|---------|---------|--------|---------|
| warrior | 94% | **97%** | 5.2 | 70 |
| ranger | 96% | **97%** | 8.3 | 70 |
| cleric | 97% | **96%** | 8.9 | 69 |
| rogue | 70% | **60%** | 9.3 | 65 |
| bard | 54% | **49%** | 8.1 | 60 |
| mage | 0% | **25%** | 6.3 | 48 |
| psion | 6% | **3%** | 9.4 | 34 |

### T5: Archlich (L40) — Warrior doubled DPR
| Class | v2 Win% | v3 Win% | v3 Rds | v3 pDmg |
|-------|---------|---------|--------|---------|
| ranger | 41% | **49%** | 7.1 | 154 |
| warrior | 0% | **2%** | 8.3 | 96 |
| cleric | 0% | 0% | 8.2 | 76 |
| rogue | 0% | 0% | 6.8 | 65 |
| bard | 0% | 0% | 6.5 | 60 |
| mage | 0% | 0% | 4.9 | 45 |
| psion | 0% | 0% | 4.7 | 14 |

---

## 9. Summary: What Next?

The ability tax fix worked — warrior DPR doubled at L35+ and T3 is now viable (59% warrior win rate). But T4+ remains a wall because:

1. **Monster damage is 2-3x too high** at T4-T6 — players die before landing enough attacks
2. **Monster HP at T5-T6 is still too high** relative to actual DPR
3. **Caster base DPR is fundamentally low** — not an immunity issue but a class design gap

**For the final monster rebalance prompt, use these ACTUAL v3 warrior DPR values:**

| Level | Warrior DPR (use this) |
|-------|----------------------|
| 1 | 2.1 |
| 3 | 3.7 |
| 5 | 4.5 |
| 8 | 5.6 |
| 10 | 7.5 |
| 13 | 9.9 |
| 15 | 9.2 |
| 20 | 13.4 |
| 25 | 12.5 |
| 30 | 14.3 |
| 35 | 20.8 |
| 40 | 11.6 |
| 45 | 9.2 |
| 50 | 6.2 |

**Note:** DPR drops at L40-50 because fights end before enough rounds occur. The DPR at L35 (20.8) is the peak. Beyond L35, monster damage kills the warrior too fast for DPR to accumulate.
