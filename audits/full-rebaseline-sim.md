# Full Rebaseline Simulation — Post-Ability-Scaling Baseline

**Date:** 2026-03-11
**Context:** Post ability-scaling overhaul. 118 abilities got scalingLevels, 7 rebased (Fireball 1→3d6, Life Drain 2→3d6, Second Wind 1→2d8, Shield Bash flat→1d6+3, Mind Spike 2→3d6, Blink Strike +bonusDamage:3, Commanding Strike +3→+5). 22 engine handlers updated. Spell attack damage stat modifier removed.
**Solo Run ID:** `9ac7db29-71e5-4a77-8ba0-fa15bf8cafbf` — 14,000 fights in 47.5s
**Group Run ID:** `1a67c101-d7b2-49a9-a440-11ece9fcaf61` — 4,500 fights in ~10min

---

## 1. Solo — Class Progression Curves (L1→L40)

| Level | Monster | Warrior | Ranger | Cleric | Rogue | Bard | Psion | Mage |
|-------|---------|---------|--------|--------|-------|------|-------|------|
| 1 | Goblin | 97% | 96% | 96% | 89% | 96% | 81% | 92% |
| 1 | Wild Boar | 85% | 72% | 48% | 32% | 48% | 22% | 45% |
| 3 | Bandit | 88% | 79% | 70% | 56% | 25% | 14% | 22% |
| 3 | Worg | 79% | 66% | 51% | 44% | 14% | 4% | 14% |
| 5 | Skeleton Warrior | 100% | 100% | 100% | 100% | 75% | 51% | 68% |
| 5 | Ghoul Pack Leader | 84% | 82% | 87% | 68% | 29% | 25% | 28% |
| 8 | Dire Wolf | 100% | 98% | 93% | 91% | 56% | 22% | 24% |
| 8 | Ironhide Ogre | 99% | 100% | 98% | 93% | 58% | 29% | 31% |
| 10 | Sandscale Basilisk | 100% | 100% | 100% | 100% | 3% | 82% | 0% |
| 10 | Crypt Warden | 71% | 78% | 79% | 61% | 9% | 59% | 3% |
| 15 | Mire Hulk | 99% | 80% | 92% | 26% | 0% | 1% | 1% |
| 15 | Hydra | 91% | 21% | 56% | 4% | 0% | 0% | 0% |
| 20 | Mind Flayer | 100% | 100% | 98% | 93% | 68% | 15% | 49% |
| 20 | Sandstorm Djinn | 100% | 100% | 97% | 78% | 0% | 55% | 7% |
| 25 | Ashlands Wyrm | 86% | 33% | 1% | 16% | 6% | 38% | 0% |
| 25 | Purple Worm | 60% | 0% | 0% | 0% | 0% | 14% | 0% |
| 30 | Storm Giant | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 30 | Dread Colossus | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 40 | Archlich | 27% | 84% | 14% | 1% | 0% | 0% | 0% |
| 40 | Ember Titan | 35% | 100% | 1% | 1% | 0% | 0% | 0% |

## 2. Solo — Class Summary

| Class | Overall Win% | L1-5 | L6-10 | L11-20 | L21-30 | L31-40 |
|-------|-------------|------|-------|--------|--------|--------|
| **Warrior** | **75.1%** | 88.8% | 92.5% | 97.5% | 36.5% | 31.0% |
| **Ranger** | **69.5%** | 82.5% | 94.0% | 75.3% | 8.3% | 92.0% |
| **Cleric** | **59.1%** | 75.3% | 92.5% | 85.8% | 0.3% | 7.5% |
| **Rogue** | **47.7%** | 64.8% | 86.3% | 50.3% | 4.0% | 1.0% |
| **Psion** | **25.6%** | 32.8% | 48.0% | 17.8% | 13.0% | 0.0% |
| **Bard** | **24.4%** | 47.8% | 31.5% | 17.0% | 1.5% | 0.0% |
| **Mage** | **19.2%** | 44.8% | 14.5% | 14.3% | 0.0% | 0.0% |

## 3. Solo — Monster Summary

| Monster | Level | Win% | Notes |
|---------|-------|------|-------|
| Goblin | 1 | 92.4% | Standard — appropriate |
| Wild Boar | 1 | 50.3% | Harder — appropriate |
| Bandit | 3 | 50.6% | Standard — appropriate |
| Worg | 3 | 38.9% | Hard for L3 — casters crushed |
| Skeleton Warrior | 5 | 84.9% | Standard — easy |
| Ghoul Pack Leader | 5 | 57.6% | Harder — appropriate |
| Dire Wolf | 8 | 69.1% | Standard — fair |
| Ironhide Ogre | 8 | 72.6% | Elite — surprisingly easy |
| Sandscale Basilisk | 10 | 69.3% | Standard — OK |
| Crypt Warden | 10 | 51.4% | Harder — fair |
| Mire Hulk | 15 | 42.7% | Standard — hard |
| Hydra | 15 | 24.6% | Elite — very hard |
| Mind Flayer | 20 | 74.7% | Standard — easy |
| Sandstorm Djinn | 20 | 62.4% | Harder — fair |
| Purple Worm | 25 | 10.6% | Elite — crushing |
| Ashlands Wyrm | 25 | 25.7% | Standard — very hard |
| Storm Giant | 30 | 0.0% | **IMPOSSIBLE** — 0% across all classes |
| Dread Colossus | 30 | 0.0% | **IMPOSSIBLE** — 0% across all classes |
| Archlich | 40 | 18.0% | Only Ranger (84%) can solo |
| Ember Titan | 40 | 19.6% | Only Ranger (100%) can solo |

## 4. Solo — Key Findings

### Positive Changes from Ability Scaling
1. **Early game (L1-5) improved significantly** — most classes now viable at L1 (Goblin: 81-97% across all classes)
2. **Psion got a meaningful L10 boost** — 82% vs Sandscale Basilisk (up from near-zero before scaling)
3. **Cleric strong through L20** — 85-93% win rates through mid-game
4. **Warrior consistently dominant** — 75.1% overall, 97.5% at L11-20

### Persistent Problems
1. **Mage remains weakest class** — 19.2% overall, drops to 0% by L25. Fireball rebase to 3d6 not enough at higher levels. The spell attack damage removal may have overcorrected.
2. **Bard/Psion still caster-floor** — 24-26% overall, both drop to 0% by L30
3. **L30 is a death wall** — Storm Giant and Dread Colossus are 0% for ALL classes. These monsters are fundamentally overtuned or the level gap is too large.
4. **L40 monsters only beatable by Ranger** — Ranger's sustained weapon damage + scaling abilities makes it the only viable solo class at endgame
5. **Caster viability collapses at L15** — Mage 0-1%, Bard 0%, Psion 0-1% vs L15 monsters. The scaling isn't keeping pace with monster HP/damage growth.
6. **Mage 0% vs Sandscale Basilisk at L10** — This is a critical finding. At the exact level casters should get their T1 spec abilities, Mage can't beat the easier L10 monster.

### Comparison to Pre-Scaling Baseline (same run ID format)
| Class | Pre-Scaling | Post-Scaling | Delta |
|-------|-----------|-------------|-------|
| Warrior | 76.6% | 75.1% | -1.5% |
| Ranger | 68.8% | 69.5% | +0.7% |
| Cleric | 59.0% | 59.1% | +0.1% |
| Rogue | 45.0% | 47.7% | +2.7% |
| Psion | 30.8% | 25.6% | -5.2% |
| Bard | 30.8% | 24.4% | -6.4% |
| Mage | 25.1% | 19.2% | -5.9% |

**The spell attack damage removal hurt casters more than the scaling helped.** Warrior is nearly identical (no spell attacks). Ranger slightly up. But Mage, Bard, and Psion all dropped 5-6 points. This confirms the stat modifier removal from spell attack damage was too aggressive — casters lost damage on their bread-and-butter abilities.

---

## 5. Group — Party Composition Results

### Duo — Warrior + Cleric

| Level | Easy | Medium | Hard |
|-------|------|--------|------|
| 5 | 100% | 100% | 98% |
| 10 | 100% | 98% | 62% |
| 15 | 100% | 86% | 44% |
| 20 | 100% | 74% | 26% |
| 30 | 100% | 68% | 26% |
| 40 | 92% | 40% | 6% |

### Trio — Balanced (Warrior/Mage/Cleric)

| Level | Easy | Medium | Hard |
|-------|------|--------|------|
| 5 | 100% | 100% | 98% |
| 10 | 100% | 96% | 86% |
| 15 | 100% | 76% | 52% |
| 20 | 96% | 56% | 24% |
| 30 | 98% | 76% | 30% |
| 40 | 90% | 50% | 16% |

### Quartet — Standard (Warrior/Rogue/Cleric/Ranger)

| Level | Easy | Medium | Hard |
|-------|------|--------|------|
| 5 | 100% | 100% | 100% |
| 10 | 100% | 98% | 78% |
| 15 | 100% | 82% | 52% |
| 20 | 100% | 74% | 36% |
| 30 | 100% | 74% | 42% |
| 40 | 98% | 56% | 28% |

### Full Party — Balanced (Warrior/Mage/Cleric/Rogue/Ranger)

| Level | Easy | Medium | Hard |
|-------|------|--------|------|
| 5 | 100% | 100% | 100% |
| 10 | 100% | 94% | 80% |
| 15 | 100% | 76% | 60% |
| 20 | 98% | 56% | 30% |
| 30 | 100% | 78% | 38% |
| 40 | 96% | 60% | 8% |

### Full Party — Caster Heavy (Mage/Psion/Bard/Cleric/Ranger)

| Level | Easy | Medium | Hard |
|-------|------|--------|------|
| 5 | 100% | 100% | 92% |
| 10 | 100% | 92% | 78% |
| 15 | 96% | 66% | 44% |
| 20 | 88% | 32% | 10% |
| 30 | 98% | 74% | 24% |
| 40 | 94% | 62% | 6% |

## 6. Group — Key Findings

1. **Easy difficulty** is consistently 88-100% across all parties and levels — too easy at most levels.
2. **Medium difficulty** drops appropriately: ~95% at L5, ~55-75% at L15-30, but collapses at L40 for caster-heavy (62%) vs balanced (60%).
3. **Hard difficulty** is generally appropriate through L15 (44-100%), then becomes crushing at L20+ (6-36%). The L40 hard fights are 6-28% — essentially unwinnable.
4. **Caster-heavy party underperforms** at L20: 32% medium (vs 56% balanced) — confirms casters drag down group performance.
5. **Duo viability** holds surprisingly well through L30 (68% medium), showing Warrior+Cleric core is very strong.
6. **L30 recovery in groups** — several parties show higher win% at L30 than L20 on medium. This suggests the L20 monster tier is overtuned relative to L30.

## 7. Design Target Scorecard

| Target | Expected | Actual | Status |
|--------|----------|--------|--------|
| Warrior/Ranger solo L1-10 | 55-75% | 86-94% | **OVER** (too strong early) |
| Rogue/Cleric solo L1-10 | 35-55% | 70-89% | **OVER** (too strong early) |
| Mage/Bard/Psion solo L1-10 | 15-30% | 14-48% | **MIXED** (varies widely) |
| Duo easy all levels | >80% | 92-100% | **PASS** |
| Full party medium | 50-65% | 56-100% | **PASS** (but too easy early) |
| Full party hard | 30-45% | 8-100% | **FAIL** (8% at L40, 100% at L5) |
| Caster-heavy medium | 50-65% | 32-100% | **FAIL** (32% at L20) |

## 8. Balance Alerts

### Critical
- **L30 Solo = 0% for ALL classes** — Storm Giant and Dread Colossus are impossibly hard. These monsters need rebalancing or the L30 sim needs different opponents.
- **Spell attack damage removal overcorrected** — Casters lost 5-6% overall win rate. The stat modifier should be partially restored or replaced with a different scaling mechanism.
- **Mage is non-functional above L10 solo** — 0-1% vs L15 monsters, 0% at L25+.

### High Priority
- **L40 hard group content at 6-8%** — essentially impossible. Hard difficulty scaling is too aggressive at endgame.
- **Caster-heavy L20 medium at 32%** — groups with 3 casters can't reliably clear medium content at L20.
- **Purple Worm (L25) at 10.6%** — only Warrior can solo it. May be intentional for elite monsters but leaves other classes no path.

### Moderate
- **Ranger dominates L40** — 84-100% vs L40 monsters while all other classes are 0-35%. Ranger weapon damage + scaling is carrying hard.
- **Psion has unusual L10 spike** — 82% vs Sandscale Basilisk, then drops to 0-1% at L15. The spike-and-crash pattern suggests Psion abilities are front-loaded.

## 9. Recommended Next Steps

1. **Restore partial spell damage scaling** — Instead of full stat mod, add `floor(statMod / 2)` to spell attack damage. This partially compensates for the removal without fully reverting.
2. **Rebalance L30 monsters** — Storm Giant and Dread Colossus should not be 0% for every class at-level. Reduce HP or damage by 20-30%.
3. **Increase caster base dice further** — Fireball at 3d6 L10 isn't enough. Consider 4d6 or faster scaling thresholds for caster T1 openers.
4. **Add L25/L30 monster variety** — Currently testing against the hardest monsters at those levels. Need standard-difficulty options.
5. **Reduce hard difficulty multiplier at L40** — CR matching is producing fights that are mathematically unwinnable for all but Ranger.
