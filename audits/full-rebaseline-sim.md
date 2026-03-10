# Full Rebaseline Sim — Post-Attack-Stat-Refactor Baseline

Date: 2026-03-10
Solo: `2a559e72-8344-430f-81ac-b6bee2a9dc9a` — 14,000 fights in 66s
Group: `6a9d6502-a04e-4b64-ae97-eb6a694a55cb` — 4,500 fights in 41s

**Context:** This rebaseline was run after the monster attackStat refactor, which:
1. Added per-monster `attackStat` field (str/dex/int/wis/cha) to all 155 monsters
2. Recalculated `stats.attack` and damage bonuses to base values (subtracting stat mod)
3. Removed the `entityType === 'monster' → statMod = 0` hack from combat-engine.ts
4. Net effect should be mathematically equivalent to pre-refactor (new_base + stat_mod = old_total)

Previous baseline: `2026-03-09` (pre-refactor, same sim configs). Comparison in Section 7.

---

## 1. Solo — Class Progression Curves (L1→L40)

| Level | Monster (type) | Warrior | Ranger | Rogue | Cleric | Mage | Bard | Psion | Avg |
|-------|---------------|---------|--------|-------|--------|------|------|-------|-----|
| 1 | Goblin (std) | 86% | 73% | 33% | 65% | 34% | 36% | 31% | 51.1% |
| 1 | Wild Boar (hard) | 80% | 75% | 34% | 58% | 16% | 29% | 32% | 46.3% |
| 3 | Bandit (std) | 88% | 79% | 47% | 55% | 13% | 10% | 9% | 43.0% |
| 3 | Worg (hard) | 90% | 67% | 40% | 52% | 13% | 6% | 9% | 39.6% |
| 5 | Skeleton Warrior (std) | 100% | 100% | 96% | 99% | 78% | 81% | 73% | 89.6% |
| 5 | Ghoul Pack Leader (hard) | 85% | 79% | 73% | 81% | 44% | 29% | 39% | 61.4% |
| 8 | Dire Wolf (std) | 99% | 97% | 96% | 94% | 50% | 64% | 33% | 76.1% |
| 8 | Ironhide Ogre (hard) | 99% | 98% | 94% | 98% | 44% | 65% | 35% | 76.1% |
| 10 | Crypt Warden (hard) | 69% | 75% | 61% | 74% | 4% | 27% | 58% | 52.6% |
| 10 | Sandscale Basilisk (std) | 100% | 100% | 99% | 100% | 0% | 24% | 84% | 72.4% |
| 15 | Hydra (hard) | 93% | 41% | 0% | 44% | 0% | 0% | 0% | 25.4% |
| 15 | Mire Hulk (std) | 99% | 89% | 14% | 75% | 2% | 0% | 0% | 39.9% |
| 20 | Mind Flayer (std) | 99% | 100% | 85% | 100% | 65% | 73% | 29% | 78.7% |
| 20 | Sandstorm Djinn (hard) | 100% | 100% | 79% | 99% | 26% | 0% | 56% | 65.7% |
| 25 | Ashlands Wyrm (std) | 99% | 57% | 18% | 16% | 0% | 31% | 55% | 39.4% |
| 25 | Purple Worm (hard) | 73% | 0% | 0% | 0% | 0% | 0% | 15% | 12.6% |
| 30 | Storm Giant (std) | 9% | 0% | 0% | 0% | 0% | 0% | 0% | 1.3% |
| 30 | Dread Colossus (hard) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0% |
| 40 | Archlich (std) | 71% | 90% | 5% | 59% | 0% | 0% | 0% | 32.1% |
| 40 | Ember Titan (hard) | 64% | 100% | 6% | 18% | 0% | 0% | 0% | 26.9% |

---

## 2. Solo — Class Summary

| Class | Overall Win% | L1-5 Avg | L6-10 Avg | L11-20 Avg | L21-30 Avg | L31-40 Avg |
|-------|-------------|----------|-----------|------------|------------|------------|
| **Warrior** | **80.2%** | 88.2% | 91.8% | 97.8% | 45.3% | 67.5% |
| **Ranger** | **71.0%** | 78.8% | 92.5% | 82.5% | 14.3% | 95.0% |
| **Cleric** | **59.4%** | 68.3% | 91.5% | 79.5% | 4.0% | 38.5% |
| **Rogue** | **44.0%** | 53.8% | 87.5% | 44.5% | 4.5% | 5.5% |
| **Psion** | **27.9%** | 32.2% | 52.5% | 21.3% | 17.5% | 0.0% |
| **Bard** | **23.8%** | 31.8% | 45.0% | 18.3% | 7.8% | 0.0% |
| **Mage** | **19.5%** | 33.0% | 24.5% | 23.3% | 0.0% | 0.0% |

**Class hierarchy:** Warrior (80.2%) > Ranger (71.0%) > Cleric (59.4%) > Rogue (44.0%) > Psion (27.9%) > Bard (23.8%) > Mage (19.5%)

---

## 3. Solo — Monster Summary

| Monster | Level | Type | Avg Win% | Hardest For | Easiest For | Flag |
|---------|-------|------|----------|-------------|-------------|------|
| Goblin | 1 | std | 51.1% | Psion (31%) | Warrior (86%) | |
| Wild Boar | 1 | hard | 46.3% | Mage (16%) | Warrior (80%) | |
| Bandit | 3 | std | 43.0% | Psion (9%) | Warrior (88%) | |
| Worg | 3 | hard | 39.6% | Bard (6%) | Warrior (90%) | |
| Skeleton Warrior | 5 | std | **89.6%** | Psion (73%) | War/Rgr (100%) | EASY (>85%) |
| Ghoul Pack Leader | 5 | hard | 61.4% | Bard (29%) | Warrior (85%) | |
| Dire Wolf | 8 | std | 76.1% | Psion (33%) | Warrior (99%) | |
| Ironhide Ogre | 8 | hard | 76.1% | Psion (35%) | Warrior (99%) | |
| Crypt Warden | 10 | hard | 52.6% | Mage (4%) | Ranger (75%) | |
| Sandscale Basilisk | 10 | std | 72.4% | Mage (0%) | War/Rgr/Clr (100%) | |
| Hydra | 15 | hard | 25.4% | 5 classes (0%) | Warrior (93%) | |
| Mire Hulk | 15 | std | 39.9% | Bard/Psion (0%) | Warrior (99%) | |
| Mind Flayer | 20 | std | 78.7% | Psion (29%) | Ranger/Cleric (100%) | |
| Sandstorm Djinn | 20 | hard | 65.7% | Bard (0%) | War/Rgr (100%) | |
| Ashlands Wyrm | 25 | std | 39.4% | Mage (0%) | Warrior (99%) | |
| Purple Worm | 25 | hard | **12.6%** | 4 classes (0%) | Warrior (73%) | HARD (<15%) |
| Storm Giant | 30 | std | **1.3%** | 6 classes (0%) | Warrior (9%) | HARD (<15%) |
| Dread Colossus | 30 | hard | **0.0%** | ALL (0%) | ALL (0%) | HARD (<15%) |
| Archlich | 40 | std | 32.1% | Mage/Bard/Psion (0%) | Ranger (90%) | |
| Ember Titan | 40 | hard | 26.9% | Mage/Bard/Psion (0%) | Ranger (100%) | |

**Flagged too hard (<15%):** Purple Worm (12.6%), Storm Giant (1.3%), Dread Colossus (0.0%)
**Flagged too easy (>85%):** Skeleton Warrior (89.6%)

---

## 4. Solo — Key Findings

### 4.1 AttackStat Refactor Impact
The refactor was designed as mathematically neutral (`new_base + stat_mod = old_total`). Comparing to the 2026-03-09 baseline (Section 7), win rates shifted significantly upward at most levels. The overall class average rose from ~38% to ~46.5%. This is unexpected for a neutral refactor — see Section 7 for detailed comparison and investigation notes.

### 4.2 Caster Viability at L1-5
- **L1:** Mage 25%, Bard 32.5%, Psion 31.5%. Non-zero win rates confirm cantrips and L1 defense provide a survival floor.
- **L3:** Casters collapse — Mage 13%, Bard 8%, Psion 9%. The gap between player power and monster power spikes here.
- **L5:** Big recovery — Mage 61%, Bard 55%, Psion 56% (averaged across both monsters). Tier 0 abilities at L3/L5 are transformative.
- **Verdict:** L3 is the death valley for casters. L5 abilities dramatically improve performance.

### 4.3 Class Hierarchy
**Expected:** Warrior/Ranger > Rogue/Cleric > Mage/Bard/Psion (solo)

**Actual:** Warrior (80.2%) > Ranger (71.0%) > **Cleric (59.4%)** > Rogue (44.0%) > Psion (27.9%) > Bard (23.8%) > Mage (19.5%)

- Cleric outperforms Rogue significantly (59.4% vs 44.0%). Healing sustain and holy damage make Cleric more of a hybrid than a pure caster in solo.
- Psion edges out Bard and Mage, likely due to INT-based scaling and utility abilities.
- Rogue has wild swings: 87.5% at L6-10, but crashes to 4.5% at L21-30 and 5.5% at L31-40. Damage doesn't scale.

### 4.4 Caster Non-Viability Threshold
- **Mage:** Drops below 10% at L10 (4% vs Crypt Warden, 0% vs Basilisk). Non-viable solo from L10+.
- **Bard:** Drops below 10% at L15 (0% vs both). Brief resurgence at L20 (73% vs Mind Flayer) then crashes again.
- **Psion:** More resilient — 71% at L10, 42.5% at L20. Drops below 10% consistently from L30+.

### 4.5 Death Valleys
1. **L3 casters** (Mage 13%, Bard 8%, Psion 9%): Pre-ability wasteland
2. **L15 non-martial**: Mage 1%, Bard 0%, Psion 0%, Rogue 7%. Hydra/Mire Hulk punish non-Warriors. However, Warrior (96%), Ranger (65%), and Cleric (59.5%) perform much better post-refactor than pre-refactor.
3. **L25 Purple Worm**: Only Warrior (73%) and Psion (15%) can beat it. All other classes 0%.
4. **L30 total wipeout**: ALL classes 0% vs Dread Colossus. Only Warrior scrapes 9% vs Storm Giant.
5. **L40 recovery**: Warrior 67.5%, Ranger 95%, Cleric 38.5%. Post-refactor, L40 is no longer a total wipeout for the top 3 classes.

### 4.6 Anomalies
- **Ranger L40 = 95%** but L25-30 = 14.3%/0%. Sharpshooter spec abilities at L32/L40 provide a massive spike, or the L40 monster matchup (Archlich/Ember Titan) is relatively easier than L25-30 (Purple Worm/Storm Giant/Dread Colossus).
- **Psion L10 = 71%** but L8 = 34%. Specialization at L10 is a huge power jump for Psion.
- **Mage L10 Sandscale Basilisk = 0%** while other casters manage 24-84%. Specific interaction (magic resistance?) invalidates Mage.
- **Bard L20 Mind Flayer = 73%** but **Bard L20 Sandstorm Djinn = 0%**. Hard counter mechanic.

---

## 5. Group — Party Composition Results

| Party | L5 E/M/H | L10 E/M/H | L15 E/M/H | L20 E/M/H | L30 E/M/H | L40 E/M/H |
|-------|----------|-----------|-----------|-----------|-----------|-----------|
| Duo — Warrior+Cleric | 100/92/80 | 100/100/100 | 98/92/80 | 98/100/82 | 98/98/80 | 96/94/50 |
| Trio — Balanced | 100/94/70 | 100/100/94 | 98/96/50 | 100/96/58 | 100/86/46 | 94/70/28 |
| Quartet — Standard | 100/100/92 | 100/98/94 | 98/92/64 | 100/88/40 | 98/94/86 | 90/60/26 |
| Full Party — Balanced | 100/100/100 | 100/100/92 | 98/86/56 | 100/86/34 | 100/98/50 | 96/76/12 |
| Full Party — Caster Heavy | 100/96/98 | 100/86/80 | 96/70/38 | 98/52/2 | 100/78/40 | 92/62/20 |

### Averages by Difficulty

| Difficulty | L5 | L10 | L15 | L20 | L30 | L40 | Overall |
|------------|-----|------|------|------|------|------|---------|
| Easy | 100% | 100% | 97.6% | 99.2% | 99.2% | 93.6% | **98.3%** |
| Medium | 96.4% | 96.8% | 87.2% | 84.4% | 90.8% | 72.4% | **88.0%** |
| Hard | 88.0% | 92.0% | 57.6% | 43.2% | 60.4% | 27.2% | **61.4%** |

---

## 6. Group — Key Findings

### 6.1 Party Size Impact
- **Duo (Warrior+Cleric) is the most resilient composition.** Maintains 80%+ hard win rates from L5-L30, only dropping to 50% at L40 hard. The tank+heal synergy without squishy casters dominates.
- **Larger parties are NOT strictly better.** Full Party Balanced at L40 hard = 12% while Duo = 50%. More members = harder CR-matched encounters, but the casters die too quickly.
- **Party size ranking by hard-difficulty resilience:** Duo > Quartet > Trio > Full Balanced > Full Caster Heavy

### 6.2 Difficulty Scaling vs Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Easy avg | >80% | 98.3% | **PASS** (well above) |
| Medium avg | 50-65% | 88.0% | **OVER TARGET** (+23pp) |
| Hard avg | 30-45% | 61.4% | **OVER TARGET** (+16pp) |

Medium and hard encounters are significantly easier than designed. However, variance is extreme — L20 hard Caster Heavy = 2% while L10 hard Duo = 100%.

### 6.3 Caster Heavy vs Balanced
The caster-heavy party underperforms balanced at every level:
- **L5:** Nearly identical (100/96/98 vs 100/100/100)
- **L10:** Gap opens (100/86/80 vs 100/100/92)
- **L15:** Significant (96/70/38 vs 98/86/56)
- **L20:** Large — especially hard (98/52/2 vs 100/86/34)
- **L30:** Moderate (100/78/40 vs 100/98/50)
- **L40:** Moderate (92/62/20 vs 96/76/12)

L20 hard is the nadir: Caster Heavy = 2%, Balanced = 34%.

### 6.4 Group Content Mandatory for Casters
Solo casters become non-viable (~10%) at:
- **Mage:** L10+
- **Bard:** L15+ (except L20 vs Mind Flayer)
- **Psion:** L15+ (intermittent viability at L20/L25)

Groups mask this weakness. Even Caster Heavy maintains 62-96% medium win rates through L40.

### 6.5 CR Matching Quality
- **L5-L10:** Solid difficulty separation across all compositions.
- **L10 Duo hard = 100%:** Encounter too easy — CR may undervalue the Warrior+Cleric duo.
- **L15-L20:** Hard difficulty drops sharply for caster-heavy groups. CR doesn't account for composition weakness.
- **L30 anomalies:** Quartet hard (86%) vastly exceeds Trio hard (46%) and Full Balanced hard (50%). Inconsistent CR matching at L30.

---

## 7. Comparison to Pre-Refactor Baseline (2026-03-09)

### Solo Win Rate Shifts

| Level | Monster | Pre-Refactor Avg | Post-Refactor Avg | Shift |
|-------|---------|-----------------|-------------------|-------|
| 1 | Goblin | 20.4% | 51.1% | **+30.7pp** |
| 1 | Wild Boar | 43.3% | 46.3% | +3.0pp |
| 3 | Bandit | 46.7% | 43.0% | -3.7pp |
| 3 | Worg | 40.0% | 39.6% | -0.4pp |
| 5 | Skeleton Warrior | 88.0% | 89.6% | +1.6pp |
| 5 | Ghoul Pack Leader | 64.0% | 61.4% | -2.6pp |
| 8 | Dire Wolf | 83.6% | 76.1% | -7.5pp |
| 8 | Ironhide Ogre | 82.4% | 76.1% | -6.3pp |
| 10 | Crypt Warden | 52.4% | 52.6% | +0.2pp |
| 10 | Sandscale Basilisk | 74.3% | 72.4% | -1.9pp |
| 15 | Hydra | 3.4% | 25.4% | **+22.0pp** |
| 15 | Mire Hulk | 9.4% | 39.9% | **+30.5pp** |
| 20 | Mind Flayer | 60.6% | 78.7% | **+18.1pp** |
| 20 | Sandstorm Djinn | 65.3% | 65.7% | +0.4pp |
| 25 | Ashlands Wyrm | 16.1% | 39.4% | **+23.3pp** |
| 25 | Purple Worm | 0.9% | 12.6% | **+11.7pp** |
| 30 | Storm Giant | 0.0% | 1.3% | +1.3pp |
| 30 | Dread Colossus | 0.0% | 0.0% | 0.0pp |
| 40 | Archlich | 9.3% | 32.1% | **+22.8pp** |
| 40 | Ember Titan | 12.4% | 26.9% | **+14.5pp** |

### Class Overall Shifts

| Class | Pre-Refactor | Post-Refactor | Shift |
|-------|-------------|---------------|-------|
| Warrior | 59.8% | 80.2% | **+20.4pp** |
| Ranger | 53.9% | 71.0% | **+17.1pp** |
| Cleric | 48.5% | 59.4% | +10.9pp |
| Rogue | 39.3% | 44.0% | +4.7pp |
| Psion | 25.0% | 27.9% | +2.9pp |
| Bard | 21.4% | 23.8% | +2.4pp |
| Mage | 17.7% | 19.5% | +1.8pp |

### Group Shifts (selected)

| Party | Diff | Pre L15 | Post L15 | Pre L20 | Post L20 | Pre L40 | Post L40 |
|-------|------|---------|----------|---------|----------|---------|----------|
| Duo | Easy | 98% | 98% | 98% | 98% | 92% | 96% |
| Duo | Hard | 70% | 80% | 68% | 82% | 40% | 50% |
| Full Bal | Easy | 100% | 98% | 96% | 100% | 92% | 96% |
| Full Bal | Hard | 44% | 56% | 12% | 34% | 2% | 12% |
| Full Cast | Medium | 58% | 70% | 44% | 52% | 42% | 62% |
| Full Cast | Hard | 16% | 38% | 0% | 2% | 6% | 20% |

### Investigation Notes

The attackStat refactor was algebraically verified to be neutral: `new_base + stat_mod = old_total` for all 155 monsters. Yet several matchups shifted by 20-30pp. Key observations:

1. **Pattern:** The biggest shifts are at L15+ (Hydra +22pp, Mire Hulk +30.5pp, Mind Flayer +18pp, Ashlands Wyrm +23pp, Archlich +23pp). L3-L10 matchups are mostly stable (±7pp).
2. **Warrior/Ranger benefited most** (+20pp/+17pp overall). Casters shifted only +2-3pp.
3. **L1 Goblin is an outlier** at +30.7pp, while L1 Wild Boar is only +3pp. Both have stat_mod = +2 (DEX 14 / STR 14 respectively).
4. **Possible causes:**
   - **RNG variance:** n=100 gives ~±10pp 95% CI at 50% true rate. Some shifts exceed this.
   - **Interaction effects:** The stat mod is now applied dynamically (not zeroed), which could interact differently with abilities, crits, or damage floors.
   - **Negative damage bonus parsing:** Some monsters got negative damage bonuses (e.g., "1d4-1"). If these are handled differently than expected, damage output changes.
   - **Damage floor clamping:** If minimum damage = 1, then `dice + negative_bonus + stat_mod` might produce different floor behavior than `dice + old_bonus + 0`.
5. **Net direction:** Players are strictly stronger post-refactor. The refactor may have inadvertently weakened monsters despite algebraic neutrality.

**Recommendation:** Run a targeted diagnostic sim on Goblin (L1) and Hydra (L15) with 1000 iterations to separate signal from noise. If the shift persists, trace the damage/attack calculation step-by-step for these specific monsters to find the interaction.

---

## 8. Balance Alerts

### CRITICAL

| Alert | Details |
|-------|---------|
| **L30 total wipeout** | 0% across ALL classes vs Dread Colossus (700 fights). Only Warrior 9% vs Storm Giant. L30 monsters are not soloable. |
| **Refactor non-neutrality** | 20-30pp win rate shifts at L15+ despite algebraically neutral refactor. Players significantly stronger post-refactor. Needs investigation. |

### HIGH

| Alert | Details |
|-------|---------|
| **Purple Worm gatekeeper (L25)** | 12.6% avg. Only Warrior (73%) and Psion (15%) can win. Ranger 0% is surprising given overall strength. |
| **Mage 0% vs Sandscale Basilisk (L10)** | Complete inability to win. Other casters manage 24-84%. Possible magic resistance hard counter. |
| **Medium/Hard over target** | Medium = 88% (target 50-65%), Hard = 61.4% (target 30-45%). CR matching too generous. |
| **Mage weakest class** | 19.5% overall, 0% from L25+. No viable solo content past L10. |

### MODERATE

| Alert | Details |
|-------|---------|
| **Skeleton Warrior too easy (L5)** | 89.6% avg. Even Psion wins 73%. Doesn't provide meaningful challenge as the "standard" L5 monster. |
| **Bard 0% vs Sandstorm Djinn (L20)** | Hard counter — other classes manage 26-100%. |
| **L10 Duo hard = 100%** | Duo Warrior+Cleric sweeps all hard encounters at L10. CR matching undervalues this combo. |
| **Quartet L30 hard = 86%** | Far exceeds Trio (46%) and Full Balanced (50%). Inconsistent CR scaling. |

---

## 9. Design Target Scorecard

| Target | Expected | Actual | Status |
|--------|----------|--------|--------|
| Warrior/Ranger solo L1-10 | 55-75% | 87.0% | **OVER** (+12pp above range) |
| Rogue/Cleric solo L1-10 | 35-55% | 72.5% | **OVER** (+17.5pp above range) |
| Mage/Bard/Psion solo L1-10 | 15-30% | 35.7% | **SLIGHTLY OVER** (+5.7pp) |
| Duo easy all levels | >80% | 98.3% | **PASS** |
| Full party medium | 50-65% | 83.5%* | **OVER** (+18.5pp) |
| Full party hard | 30-45% | 34.7%* | **PASS** |
| CR matching: Easy >80% | >80% | 98.3% | **PASS** |
| CR matching: Med 50-65% | 50-65% | 88.0% | **OVER** (+23pp) |
| CR matching: Hard 30-45% | 30-45% | 61.4% | **OVER** (+16pp) |

\* Full party = average of Balanced and Caster Heavy medium/hard.

### Scorecard Summary

**3 of 9 targets pass, 1 borderline pass, 5 over target.** All failures are in the same direction: players win too often. This was also true of the pre-refactor baseline, but the refactor has widened the gap further.

**Compared to pre-refactor scorecard (2026-03-09):**
- Warrior/Ranger L1-10: 83.4% → 87.0% (+3.6pp, still over)
- Rogue/Cleric L1-10: 71.2% → 72.5% (+1.3pp, still over)
- Caster L1-10: 35.8% → 35.7% (-0.1pp, stable)
- Full party hard: 42.3% → 34.7% (-7.6pp, improved toward target)

**Recommended next steps:**
1. **Investigate refactor non-neutrality** — run diagnostic sims with 1000 iterations on L1 Goblin and L15 Hydra to confirm the shift is real, then trace calculations step-by-step.
2. **Tighten CR formula** — medium and hard encounters are 16-23pp above design targets.
3. **Add solo-viable L30 monsters** — or flag L30+ as group-only in the encounter system.
4. **Investigate Mage L10 cliff** — 0% vs Sandscale Basilisk needs explanation.
5. **Review Ranger L40 spike** — 95% at L40 vs 0% at L30 is a jarring discontinuity.
