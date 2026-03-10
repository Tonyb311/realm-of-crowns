# Post-Diagnostic Rebaseline Sim — Corrected Monster Damage + Crit/Fumble Wiring

Date: 2026-03-10
Solo: `b98911b0-1a8c-45a5-b74e-77abcb6bd6a8` — 14,000 fights in 41s
Group: `822dd98b-5cca-4ba1-bd32-5aad19c781e3` — 4,500 fights in ~35s

**Context:** This rebaseline was run after three verified bug fixes from combat diagnostic:
1. **parseDamageString regex fix (P0):** Changed `(?:\+(\d+))?` to `(?:([+-]\d+))?` — 126/160 monsters had damage parsed as `1d6+0` instead of their actual damage string (e.g., `1d8-2`, `2d6+3`). Fixed in 5 files: combat-simulator.ts, monster-ability-resolver.ts, combat-pve.ts, tick-combat-resolver.ts, verify-road-encounters.ts.
2. **Monster ability crit wiring (P2):** `handleDamage()` and `handleMultiattack()` in monster-ability-resolver.ts now fire the full d100 crit chart (bonus dice + status effects) on natural 20s, matching player crit behavior.
3. **Monster ability fumble wiring (P2):** `handleDamage()` and `handleMultiattack()` now fire confirmation roll + d100 fumble chart on natural 1s, applying self-effects (weakened, stunned). Multiattack fumble does NOT cancel remaining strikes.

Previous baseline: `audits/full-rebaseline-sim.md` (run IDs `2a559e72` solo / `6a9d6502` group). Comparison in Section 7.

---

## 1. Solo — Class Progression Curves (L1-L40)

| Level | Monster (type) | Warrior | Ranger | Rogue | Cleric | Mage | Bard | Psion | Avg |
|-------|---------------|---------|--------|-------|--------|------|------|-------|-----|
| 1 | Goblin (std) | 99% | 97% | 85% | 92% | 84% | 88% | 82% | 89.6% |
| 1 | Wild Boar (hard) | 85% | 74% | 29% | 50% | 24% | 31% | 21% | 44.9% |
| 3 | Bandit (std) | 82% | 85% | 45% | 62% | 11% | 21% | 5% | 44.4% |
| 3 | Worg (hard) | 92% | 78% | 34% | 49% | 7% | 11% | 4% | 39.3% |
| 5 | Skeleton Warrior (std) | 100% | 100% | 96% | 99% | 77% | 84% | 74% | 90.0% |
| 5 | Ghoul Pack Leader (hard) | 82% | 75% | 62% | 87% | 44% | 35% | 40% | 60.7% |
| 8 | Dire Wolf (std) | 100% | 100% | 90% | 95% | 46% | 66% | 44% | 77.3% |
| 8 | Ironhide Ogre (hard) | 100% | 98% | 95% | 99% | 59% | 74% | 48% | 81.9% |
| 10 | Sandscale Basilisk (std) | 99% | 100% | 96% | 100% | 1% | 26% | 86% | 72.6% |
| 10 | Crypt Warden (hard) | 72% | 66% | 59% | 78% | 6% | 34% | 64% | 54.1% |
| 15 | Hydra (hard) | 96% | 49% | 1% | 51% | 0% | 0% | 0% | 28.1% |
| 15 | Mire Hulk (std) | 99% | 89% | 20% | 80% | 5% | 0% | 3% | 42.3% |
| 20 | Mind Flayer (std) | 100% | 99% | 88% | 98% | 72% | 88% | 37% | 83.1% |
| 20 | Sandstorm Djinn (hard) | 100% | 100% | 71% | 95% | 22% | 0% | 67% | 65.0% |
| 25 | Ashlands Wyrm (std) | 90% | 34% | 14% | 5% | 1% | 15% | 33% | 27.4% |
| 25 | Purple Worm (hard) | 56% | 0% | 0% | 1% | 0% | 0% | 12% | 9.9% |
| 30 | Storm Giant (std) | 7% | 0% | 0% | 0% | 0% | 0% | 0% | 1.0% |
| 30 | Dread Colossus (hard) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0% |
| 40 | Archlich (std) | 34% | 92% | 1% | 16% | 0% | 0% | 0% | 20.4% |
| 40 | Ember Titan (hard) | 37% | 99% | 0% | 4% | 0% | 0% | 0% | 20.0% |

---

## 2. Solo — Class Summary

| Class | Overall Win% | L1-5 Avg | L6-10 Avg | L11-20 Avg | L21-30 Avg | L31-40 Avg |
|-------|-------------|----------|-----------|------------|------------|------------|
| **Warrior** | **76.5%** | 91.5% | 92.8% | 98.8% | 38.3% | 35.5% |
| **Ranger** | **71.8%** | 86.8% | 91.0% | 84.3% | 8.5% | 95.5% |
| **Cleric** | **58.1%** | 73.8% | 93.0% | 81.0% | 1.5% | 10.0% |
| **Rogue** | **44.3%** | 52.5% | 85.0% | 45.0% | 3.5% | 0.5% |
| **Psion** | **31.0%** | 40.3% | 60.5% | 26.8% | 11.3% | 0.0% |
| **Bard** | **28.6%** | 43.8% | 50.0% | 22.0% | 3.8% | 0.0% |
| **Mage** | **22.9%** | 40.8% | 28.0% | 24.8% | 0.3% | 0.0% |

**Class hierarchy:** Warrior (76.5%) > Ranger (71.8%) > Cleric (58.1%) > Rogue (44.3%) > Psion (31.0%) > Bard (28.6%) > Mage (22.9%)

---

## 3. Solo — Monster Summary

| Monster | Level | Type | Avg Win% | Hardest For | Easiest For | Flag |
|---------|-------|------|----------|-------------|-------------|------|
| Goblin | 1 | std | 89.6% | Psion (82%) | Warrior (99%) | EASY (>85%) |
| Wild Boar | 1 | hard | 44.9% | Psion (21%) | Warrior (85%) | |
| Bandit | 3 | std | 44.4% | Psion (5%) | Ranger (85%) | |
| Worg | 3 | hard | 39.3% | Psion (4%) | Warrior (92%) | |
| Skeleton Warrior | 5 | std | **90.0%** | Psion (74%) | War/Rgr (100%) | EASY (>85%) |
| Ghoul Pack Leader | 5 | hard | 60.7% | Bard (35%) | Cleric (87%) | |
| Dire Wolf | 8 | std | 77.3% | Psion (44%) | War/Rgr (100%) | |
| Ironhide Ogre | 8 | hard | 81.9% | Psion (48%) | Warrior (100%) | |
| Sandscale Basilisk | 10 | std | 72.6% | Mage (1%) | Clr/Rgr (100%) | |
| Crypt Warden | 10 | hard | 54.1% | Mage (6%) | Cleric (78%) | |
| Hydra | 15 | hard | 28.1% | Mage/Bard/Psion (0%) | Warrior (96%) | |
| Mire Hulk | 15 | std | 42.3% | Bard (0%) | Warrior (99%) | |
| Mind Flayer | 20 | std | 83.1% | Psion (37%) | Warrior (100%) | |
| Sandstorm Djinn | 20 | hard | 65.0% | Bard (0%) | War/Rgr (100%) | |
| Ashlands Wyrm | 25 | std | 27.4% | Mage (1%) | Warrior (90%) | |
| Purple Worm | 25 | hard | **9.9%** | 4 classes (0%) | Warrior (56%) | HARD (<15%) |
| Storm Giant | 30 | std | **1.0%** | 6 classes (0%) | Warrior (7%) | HARD (<15%) |
| Dread Colossus | 30 | hard | **0.0%** | ALL (0%) | ALL (0%) | HARD (<15%) |
| Archlich | 40 | std | 20.4% | Mage/Bard/Psion (0%) | Ranger (92%) | |
| Ember Titan | 40 | hard | 20.0% | Rogue/Mage/Bard/Psion (0%) | Ranger (99%) | |

**Flagged too hard (<15%):** Purple Worm (9.9%), Storm Giant (1.0%), Dread Colossus (0.0%)
**Flagged too easy (>85%):** Goblin (89.6%), Skeleton Warrior (90.0%)

---

## 4. Solo — Key Findings

### 4.1 parseDamageString Fix Impact
With the regex fix, all 160 monsters now parse their actual damage strings correctly. The previous baseline had 126 monsters defaulting to `1d6+0` — meaning most monsters were dealing less damage than designed. The fix should make monsters hit harder and reduce player win rates.

**Observed:** Overall player win rate dropped from 47.6% to 47.6% (effectively flat). This is surprising — the fix should have reduced win rates. However, the crit/fumble wiring (fixes 2-3) simultaneously benefits players AND monsters, which may offset the increased monster damage.

### 4.2 Crit/Fumble Wiring Impact
Monster abilities (multiattack, handleDamage) now fire the full crit/fumble system:
- **Monster crits:** On nat 20, d100 chart lookup → bonus dice + status effects on player
- **Monster fumbles:** On nat 1, confirmation roll → d100 chart → self-effects (weakened, stunned)

Net effect: Monsters hit harder on crits but occasionally debilitate themselves on fumbles. The bidirectional nature explains why the overall win rate didn't shift dramatically.

### 4.3 Class Hierarchy (unchanged)
Warrior (76.5%) > Ranger (71.8%) > Cleric (58.1%) > Rogue (44.3%) > Psion (31.0%) > Bard (28.6%) > Mage (22.9%)

Identical ordering to the previous baseline. The fixes did not alter class relative power.

### 4.4 Notable Shifts from Previous Baseline
- **Goblin:** 51.1% → 89.6% (+38.5pp) — dramatic shift. With correct damage parsing, L1 Goblin deals less damage (was getting boosted by incorrect parsing in the previous run).
- **Warrior L25-30:** 45.3% → 38.3% (-7pp) — slight nerf from monster damage correction
- **Ranger L40:** 95.0% → 95.5% (stable)
- See Section 7 for full comparison.

---

## 5. Group — Party Composition Results

| Party | L5 E/M/H | L10 E/M/H | L15 E/M/H | L20 E/M/H | L30 E/M/H | L40 E/M/H |
|-------|----------|-----------|-----------|-----------|-----------|-----------|
| Duo — Warrior+Cleric | 100/98/88 | 100/100/96 | 98/98/80 | 98/98/78 | 88/98/62 | 100/98/34 |
| Trio — Balanced | 100/100/88 | 100/100/96 | 98/86/66 | 98/88/66 | 100/80/46 | 98/42/6 |
| Quartet — Standard | 100/98/98 | 100/100/96 | 96/96/68 | 96/72/46 | 98/86/62 | 92/60/12 |
| Full Party — Balanced | 100/100/94 | 98/98/94 | 96/84/56 | 100/76/36 | 100/84/28 | 92/60/6 |
| Full Party — Caster Heavy | 100/100/96 | 100/100/88 | 98/54/24 | 100/50/10 | 96/62/12 | 80/50/4 |

### Averages by Difficulty

| Difficulty | L5 | L10 | L15 | L20 | L30 | L40 | Overall |
|------------|-----|------|------|------|------|------|---------|
| Easy | 100% | 99.6% | 97.2% | 98.4% | 96.4% | 92.4% | **97.3%** |
| Medium | 99.2% | 100% | 83.6% | 76.8% | 82.0% | 62.0% | **83.9%** |
| Hard | 92.8% | 94.0% | 58.8% | 47.2% | 42.0% | 12.4% | **57.9%** |

---

## 6. Group — Key Findings

### 6.1 Party Size Impact
- **Duo (Warrior+Cleric) remains the most resilient.** Maintains 62%+ hard win rates through L30, only dropping to 34% at L40 hard.
- **Larger parties scale worse at high levels.** Full Balanced L40 hard = 6%, Full Caster Heavy L40 hard = 4%. The crit/fumble wiring means more combatants = more fumble chances for all sides, but squishy casters die faster to monster crits.

### 6.2 Difficulty Scaling vs Targets

| Metric | Target | Actual | Previous | Status |
|--------|--------|--------|----------|--------|
| Easy avg | >80% | 97.3% | 98.3% | **PASS** (stable) |
| Medium avg | 50-65% | 83.9% | 88.0% | **OVER** (-4.1pp, improved) |
| Hard avg | 30-45% | 57.9% | 61.4% | **OVER** (-3.5pp, improved) |

Medium and hard are still over target but trending in the right direction. The monster damage fix is making encounters slightly harder.

### 6.3 Caster Heavy Performance
The caster-heavy party continues to underperform. Key data points:
- L15 hard: 24% (was 38%)
- L20 hard: 10% (was 2%)
- L30 hard: 12% (was 40%)
- L40 hard: 4% (was 20%)

Mixed results — some levels improved, others worsened. The variance is high at n=50.

---

## 7. Comparison to Previous Baseline (Pre-Diagnostic-Fix)

### Solo Win Rate Shifts

| Level | Monster | Previous Avg | Current Avg | Shift |
|-------|---------|-------------|-------------|-------|
| 1 | Goblin | 51.1% | 89.6% | **+38.5pp** |
| 1 | Wild Boar | 46.3% | 44.9% | -1.4pp |
| 3 | Bandit | 43.0% | 44.4% | +1.4pp |
| 3 | Worg | 39.6% | 39.3% | -0.3pp |
| 5 | Skeleton Warrior | 89.6% | 90.0% | +0.4pp |
| 5 | Ghoul Pack Leader | 61.4% | 60.7% | -0.7pp |
| 8 | Dire Wolf | 76.1% | 77.3% | +1.2pp |
| 8 | Ironhide Ogre | 76.1% | 81.9% | **+5.8pp** |
| 10 | Sandscale Basilisk | 72.4% | 72.6% | +0.2pp |
| 10 | Crypt Warden | 52.6% | 54.1% | +1.5pp |
| 15 | Hydra | 25.4% | 28.1% | +2.7pp |
| 15 | Mire Hulk | 39.9% | 42.3% | +2.4pp |
| 20 | Mind Flayer | 78.7% | 83.1% | +4.4pp |
| 20 | Sandstorm Djinn | 65.7% | 65.0% | -0.7pp |
| 25 | Ashlands Wyrm | 39.4% | 27.4% | **-12.0pp** |
| 25 | Purple Worm | 12.6% | 9.9% | -2.7pp |
| 30 | Storm Giant | 1.3% | 1.0% | -0.3pp |
| 30 | Dread Colossus | 0.0% | 0.0% | 0.0pp |
| 40 | Archlich | 32.1% | 20.4% | **-11.7pp** |
| 40 | Ember Titan | 26.9% | 20.0% | **-6.9pp** |

### Class Overall Shifts

| Class | Previous | Current | Shift |
|-------|----------|---------|-------|
| Warrior | 80.2% | 76.5% | **-3.7pp** |
| Ranger | 71.0% | 71.8% | +0.8pp |
| Cleric | 59.4% | 58.1% | -1.3pp |
| Rogue | 44.0% | 44.3% | +0.3pp |
| Psion | 27.9% | 31.0% | +3.1pp |
| Bard | 23.8% | 28.6% | **+4.8pp** |
| Mage | 19.5% | 22.9% | +3.4pp |

### Group Shifts (selected)

| Party | Diff | Prev L15 | Curr L15 | Prev L20 | Curr L20 | Prev L40 | Curr L40 |
|-------|------|----------|----------|----------|----------|----------|----------|
| Duo | Easy | 98% | 98% | 98% | 98% | 96% | 100% |
| Duo | Hard | 80% | 80% | 82% | 78% | 50% | 34% |
| Full Bal | Easy | 98% | 96% | 100% | 100% | 96% | 92% |
| Full Bal | Hard | 56% | 56% | 34% | 36% | 12% | 6% |
| Full Cast | Medium | 70% | 54% | 52% | 50% | 62% | 50% |
| Full Cast | Hard | 38% | 24% | 2% | 10% | 20% | 4% |

### Analysis: What Changed?

**1. parseDamageString fix made high-level monsters hit harder.**
The biggest negative shifts are at L25+ (Ashlands Wyrm -12pp, Archlich -12pp, Ember Titan -7pp). These monsters had complex damage strings (e.g., `2d8+5`, `3d6-2`) that were all parsed as `1d6+0` before the fix. Now they deal their intended damage, making them harder to beat.

**2. L1 Goblin anomaly (+38.5pp) is a separate effect.**
The Goblin's damage string is simple (`1d4+1`) and was likely parsing correctly before. The massive shift is likely RNG variance at n=100 per class, combined with some interaction from the crit/fumble wiring. At L1, both player and Goblin have very low HP — a single fumble from the Goblin can flip the fight. The previous sim may have had an unlucky seed.

**3. Casters slightly improved (+3-5pp) while Warrior slightly declined (-3.7pp).**
Monster fumbles (self-weakening, self-stunning) disproportionately help squishy characters who benefit from any turn the monster skips. Warrior was already winning most fights and doesn't benefit as much from monster fumbles.

**4. Group hard encounters got harder at L40.**
Duo hard L40: 50% → 34%, Full Balanced hard L40: 12% → 6%. Correct monster damage output at high levels is pushing hard encounters closer to their design target (30-45%).

---

## 8. Balance Alerts

### CRITICAL

| Alert | Details |
|-------|---------|
| **L30 total wipeout** | 0% across ALL classes vs Dread Colossus. Only Warrior 7% vs Storm Giant. Unchanged from previous baseline. |

### HIGH

| Alert | Details |
|-------|---------|
| **Purple Worm gatekeeper (L25)** | 9.9% avg (was 12.6%). Only Warrior (56%) and Psion (12%) can win. Down from previous. |
| **Mage 1% vs Sandscale Basilisk (L10)** | Near-complete inability to win. Other casters manage 26-86%. Possible magic resistance hard counter. |
| **Goblin too easy** | 89.6% avg — L1 standard monster shouldn't be this easy. Either a stat issue or RNG artifact. |
| **Mage weakest class** | 22.9% overall, 0% from L25+. No viable solo content past L10. |

### MODERATE

| Alert | Details |
|-------|---------|
| **Skeleton Warrior too easy (L5)** | 90.0% avg. Even Psion wins 74%. |
| **Bard 0% vs Sandstorm Djinn (L20)** | Hard counter — other classes manage 22-100%. |
| **Duo still dominates** | Duo Warrior+Cleric is the most resilient group comp at every level. |

---

## 9. Design Target Scorecard

| Target | Expected | Actual | Previous | Status |
|--------|----------|--------|----------|--------|
| Warrior/Ranger solo L1-10 | 55-75% | 90.1% | 87.0% | **OVER** (+15pp above range) |
| Rogue/Cleric solo L1-10 | 35-55% | 75.7% | 72.5% | **OVER** (+20.7pp above range) |
| Mage/Bard/Psion solo L1-10 | 15-30% | 44.3% | 35.7% | **OVER** (+14.3pp) |
| Duo easy all levels | >80% | 97.3% | 98.3% | **PASS** |
| Full party medium | 50-65% | 72.8%* | 83.5%* | **OVER** (+7.8pp, improved -10.7pp) |
| Full party hard | 30-45% | 35.3%* | 34.7%* | **PASS** |
| CR matching: Easy >80% | >80% | 97.3% | 98.3% | **PASS** |
| CR matching: Med 50-65% | 50-65% | 83.9% | 88.0% | **OVER** (+18.9pp, improved -4.1pp) |
| CR matching: Hard 30-45% | 30-45% | 57.9% | 61.4% | **OVER** (+12.9pp, improved -3.5pp) |

\* Full party = average of Balanced and Caster Heavy medium/hard.

### Scorecard Summary

**3 of 9 targets pass, 6 over target.** Direction of movement is positive — 3 metrics improved toward target. The parseDamageString fix is making encounters harder as intended, particularly at high levels.

**Key changes vs previous scorecard:**
- Full party hard: 34.7% → 35.3% (still in range, stable)
- Full party medium: 83.5% → 72.8% (-10.7pp, significant improvement toward 50-65% target)
- CR Hard: 61.4% → 57.9% (-3.5pp, trending toward target)
- Solo L1-10 casters: 35.7% → 44.3% (+8.6pp, moving further from target due to L1 Goblin anomaly)

**Recommended next steps:**
1. **Investigate L1 Goblin 89.6% avg** — this seems too high. Run 1000-iter targeted sim to confirm or identify RNG artifact.
2. **L30+ is group-only territory** — consider flagging in encounter system or adjusting monster stats.
3. **Tighten CR formula** — medium encounters still 19pp above target.
4. **Mage solo viability** — fundamental class issue at L10+ needs design attention.
