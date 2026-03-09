# Feat Expansion Combat Sim Results

**Date:** 2026-03-09
**Context:** Post feat expansion from 13→30 feats with 9 new combat engine integrations.
**Sim infrastructure:** feat override support added to `batch-combat-sim.ts`, `combat-simulator.ts`

---

## 1. Solo Regression Check (Levels 5 / 15 / 25)

No feats at these levels — tests that the feat expansion didn't break baseline combat.

### Level 5 — Tier 1 (100 iterations each)

| Class | vs Goblin (easy) | vs Bandit (at-level) | vs Hollow Sentinel (hard) | Avg |
|-------|-----------------|---------------------|--------------------------|-----|
| Warrior | 100% | 97% | 97% | **98.0%** |
| Ranger | 100% | 98% | 92% | **96.7%** |
| Cleric | 100% | 93% | 79% | **90.7%** |
| Rogue | 99% | 88% | 67% | **84.7%** |
| Mage | 93% | 32% | 5% | **43.3%** |
| Bard | 99% | 46% | 17% | **54.0%** |
| Psion | 97% | 27% | 4% | **42.7%** |

**Notes:** Warrior/Ranger dominate T1. Mage and Psion struggle against anything tougher than Goblin. This is consistent with pre-feat baselines — no regression detected.

### Level 15 — Tier 2 (100 iterations each)

| Class | vs Troll | vs Ancient Golem | vs Young Dragon | Avg |
|-------|---------|-----------------|----------------|-----|
| Warrior | 75% | 2% | 29% | **35.3%** |
| Ranger | 7% | 0% | 2% | **3.0%** |
| Cleric | 2% | 1% | 0% | **1.0%** |
| Rogue | 0% | 0% | 0% | **0.0%** |
| Mage | 3% | 0% | 0% | **1.0%** |
| Bard | 0% | 0% | 0% | **0.0%** |
| Psion | 0% | 0% | 0% | **0.0%** |

**BALANCE ALERT:** Massive Warrior dominance. All non-Warrior classes are essentially dead at L15 solo vs these monsters. Ancient Golem and Young Dragon are near-impossible for everyone except Warriors.

### Level 25 — Tier 3 (100 iterations each)

| Class | vs Mind Flayer | vs Lich | vs Purple Worm | Avg |
|-------|---------------|---------|---------------|-----|
| Warrior | 100% | 78% | 4% | **60.7%** |
| Cleric | 99% | 20% | 0% | **39.7%** |
| Ranger | 95% | 15% | 0% | **36.7%** |
| Rogue | 89% | 1% | 0% | **30.0%** |
| Bard | 88% | 0% | 0% | **29.3%** |
| Mage | 70% | 1% | 0% | **23.7%** |
| Psion | 27% | 0% | 2% | **9.7%** |

**Notes:** Mind Flayer is an "easy" L25 opponent — most classes beat it. Lich is Warrior-favored. Purple Worm is near-impossible for all solo. Psion is the weakest class across all tiers.

---

## 2. Solo Feat Baseline (Levels 38 / 48, Default Feats)

Default feats assigned by `getSimFeatIds()` — whatever the sim picks per class.

### Level 38 — First Feat Tier (200 iterations each)

| Class | vs Storm Giant | vs Basilisk King | vs Djinn Lord | Avg |
|-------|---------------|-----------------|--------------|-----|
| Ranger | 6.0% | 24.0% | 19.5% | **16.5%** |
| Warrior | 8.5% | 21.5% | 12.0% | **14.0%** |
| Cleric | 0.0% | 0.0% | 0.0% | **0.0%** |
| Rogue | 0.0% | 0.0% | 0.0% | **0.0%** |
| Mage | 0.0% | 0.0% | 0.0% | **0.0%** |
| Bard | 0.0% | 0.0% | 0.0% | **0.0%** |
| Psion | 0.0% | 0.0% | 0.0% | **0.0%** |

**BALANCE ALERT:** Only Warrior and Ranger can win ANY fight at L38 solo. All casters and Rogue have 0% across the board.

### Level 48 — Both Feats Tier (200 iterations each)

| Class | vs Archlich | vs Siege Wurm | vs Phoenix | Avg |
|-------|-----------|-------------|-----------|-----|
| Ranger | 89.5% | 100.0% | 5.0% | **64.8%** |
| Warrior | 77.0% | 54.0% | 0.0% | **43.7%** |
| Cleric | 33.5% | 3.5% | 0.0% | **12.3%** |
| Rogue | 3.5% | 0.5% | 0.0% | **1.3%** |
| Mage | 0.0% | 0.0% | 0.0% | **0.0%** |
| Bard | 0.0% | 0.0% | 0.0% | **0.0%** |
| Psion | 0.0% | 0.0% | 0.0% | **0.0%** |

**Notes:** Ranger dominates at L48 (100% vs Siege Wurm!). Phoenix is near-impossible for everyone. Mage/Bard/Psion remain at flat 0% even with two feats.

---

## 3. Solo Feat A/B Comparison (Level 40 vs Djinn Lord, 200 iterations each)

### Warrior

| Feat | Win% | Avg Rounds | Notes |
|------|------|------------|-------|
| Precise Strikes (+1 atk) | 0.0% | 5.6r | Default pick |
| **Devastating Blow** (GWM -5/+10) | **2.0%** | 5.4r | Best performer — only feat that scored any wins |
| Brutal Critical (+crit dmg) | 0.0% | 5.8r | |
| Heavy Armor Mastery (DR 3) | 0.0% | 6.7r | Longest survival, but still 0% |

**Verdict:** Devastating Blow is the only Warrior feat that moved the needle. Heavy Armor Mastery extended fights but couldn't convert to wins. All feats are marginal at this level — the class gap to Ranger is the bigger issue.

### Mage

| Feat | Win% | Avg Rounds |
|------|------|------------|
| Arcane Focus (+spell atk/DC) | 0.0% | 3.1r |
| Iron Will (+all saves) | 0.0% | 3.1r |
| Spell Ward (+spell save) | 0.0% | 3.1r |

**Verdict:** No differentiation. Mage dies in ~3 rounds regardless of feat pick. The class is not viable solo at this tier.

### Rogue

| Feat | Win% | Avg Rounds |
|------|------|------------|
| Precise Strikes | 0.0% | 4.5r |
| Savage Attacker (dmg reroll) | 0.0% | 4.5r |
| Combat Reflexes (+init) | 0.0% | 4.4r |

**Verdict:** No differentiation. All 0%.

### Cleric

| Feat | Win% | Avg Rounds |
|------|------|------------|
| Iron Will | 0.0% | 5.8r |
| **Tough (+HP)** | 0.0% | **8.3r** | Notably longer survival |
| Natural Armor (+AC) | 0.0% | 5.8r |

**Verdict:** Tough significantly extended fights (8.3r vs 5.8r) but still 0% wins. The extra HP matters — in a group context, more healing rounds could make a difference.

### Ranger (ONLY CLASS WITH DIFFERENTIATION)

| Feat | Win% | Avg Rounds | Notes |
|------|------|------------|-------|
| Precise Strikes (+1 atk) | 30.0% | 5.6r | Solid baseline |
| **Deadeye** (Sharpshooter -5/+10) | **39.5%** | 5.2r | **Best feat — +9.5pp over baseline** |
| Savage Attacker (dmg reroll) | 27.5% | 5.6r | Slightly worse than default |

**Verdict:** Deadeye is clearly the best Ranger feat. The -5/+10 tradeoff with the AC heuristic gate works well — Rangers have high enough attack mods to absorb the penalty. Savage Attacker underperforms Precise Strikes.

### Bard

| Feat | Win% | Avg Rounds |
|------|------|------------|
| Arcane Focus | 0.0% | 4.0r |
| Iron Will | 0.0% | 4.1r |
| Inspiring Leader | 0.0% | 4.2r |

**Verdict:** All 0%. Inspiring Leader is a party feat tested solo — expected to be useless here.

### Psion

| Feat | Win% | Avg Rounds |
|------|------|------------|
| Arcane Focus | 0.0% | 4.5r |
| Spell Ward | 0.0% | 4.6r |
| Iron Will | 0.0% | 4.5r |

**Verdict:** All 0%. No differentiation.

---

## 4. Solo Double-Feat Combos (Level 48 vs Phoenix, 200 iterations each)

Phoenix proved too hard for any solo class — all combos scored 0%. Avg round data shows relative survivability:

### Warrior vs Phoenix

| Feat Combo | Win% | Avg Rounds |
|------------|------|------------|
| Precise Strikes + Tough | 0.0% | 7.0r |
| Devastating Blow + Heavy Armor Mastery | 0.0% | 5.1r |
| Brutal Critical + Combat Reflexes | 0.0% | 5.3r |

**Notes:** Precise Strikes + Tough is the most survivable combo. The "power" builds (GWM + DR, Crit + Init) actually die faster — suggests offensive feats don't overcome the DPS check and defensive feats matter more vs Phoenix.

### Mage vs Phoenix

| Feat Combo | Win% | Avg Rounds |
|------------|------|------------|
| Arcane Focus + Tough | 0.0% | 5.4r |
| Arcane Focus + Spell Ward | 0.0% | 3.2r |
| Iron Will + Durable | 0.0% | 3.2r |

**Notes:** Tough adds 2.2 extra rounds of survival. Pure magic defense combos offer no benefit — Mage HP is too low.

### Rogue vs Phoenix

| Feat Combo | Win% | Avg Rounds |
|------------|------|------------|
| Precise Strikes + Tough | 0.0% | 6.5r |
| Savage Attacker + Combat Reflexes | 0.0% | 4.4r |
| Deadeye + Natural Armor | 0.0% | 4.6r |

**Notes:** Again, Tough-based combo survives longest. Offensive combos die 2 rounds faster.

---

## 5. Group Results (5 parties × 2 levels × 3 difficulties, 50 iterations each)

### Level 38

| Party | Medium | Hard | Deadly |
|-------|--------|------|--------|
| **Melee Stack + GWM** | **56%** | 0% | 0% |
| Balanced + Sentinel | 46% | 2% | 2% |
| Default Feats | 40% | 0% | 2% |
| Balanced + Inspire | 10% | 0% | 0% |
| Caster Stack + Arcane Focus | 0% | 0% | 0% |

### Level 48

| Party | Medium | Hard | Deadly |
|-------|--------|------|--------|
| Default Feats | 18% | 0% | 0% |
| Balanced + Sentinel | 12% | 0% | 0% |
| Balanced + Inspire | 10% | 0% | 0% |
| Melee Stack + GWM | 6% | 0% | 0% |
| Caster Stack + Arcane Focus | 0% | 0% | 0% |

### Group Analysis

**Key findings:**

1. **Melee Stack dominates L38 medium** (56%) — two Warriors with GWM/DR feats + physical support outperform balanced comps. But this advantage disappears at L48, suggesting monsters scale faster than melee.

2. **Balanced + Sentinel outperforms Default Feats at L38** (46% vs 40%) — Guardian's Vigil (sentinel counter) provides measurable group benefit. The 6pp improvement at medium difficulty is meaningful.

3. **Balanced + Inspire underperforms** (10% L38/10% L48) — swapping Ranger for Bard hurts significantly. The Inspiring Leader temp HP doesn't compensate for lost Ranger DPS. Bard as Battlechanter is still weak compared to Ranger Sharpshooter.

4. **Caster Stack is unviable** — 0% across all matchups. Five casters can't survive group encounters even at medium difficulty. This matches the solo pattern where casters are non-competitive.

5. **Hard/Deadly are near-impossible** — Only 3 wins total across ALL parties at hard/deadly (2 from Sentinel, 1 from Default Feats, all at L38). The CR matching algorithm may be overtuning encounter difficulty, or monsters scale too aggressively.

6. **L48 is harder than L38 for groups** — counterintuitive, but L48 CR-matched encounters pit parties against higher-level monsters. Win rates drop across the board despite having two feats. Suggests monster power scales faster than player power at high levels.

---

## 6. Key Findings

### Critical Balance Issues

1. **Warrior/Ranger dominance is extreme.** Across all solo tiers, these two classes have win rates while all others sit at 0%. The gap is not "a bit ahead" — it's "the only classes that function." This predates feats and is a core combat engine balance issue.

2. **Casters are non-viable solo.** Mage, Bard, and Psion have 0% win rates at every feat-eligible level. They die in 3-4 rounds. No feat changes this. The issue is likely HP scaling, damage output, or monster resistance profiles.

3. **Psion is the weakest class overall.** Even at L5 vs Bandit (27%) and L25 vs Mind Flayer (27%), Psion consistently underperforms every other class. Needs fundamental rebalancing.

4. **Group combat shares the caster problem.** Caster Stack party scored 0% everywhere. Even in balanced comps, swapping Ranger for Bard (Inspire comp) cuts win rates dramatically.

### Feat-Specific Findings

5. **Deadeye (Sharpshooter) is the strongest solo feat** — +9.5pp over Precise Strikes for Ranger. The AC heuristic gate works correctly (only activates when likely to hit). This is the only feat that produced statistically significant differentiation.

6. **Devastating Blow (GWM) works but barely** — 2% vs 0% for other Warrior feats. The -5/+10 tradeoff is less effective for Warriors than Deadeye is for Rangers, possibly because Warrior attack mods are lower relative to target AC.

7. **Tough is the best defensive feat** — consistently extended survival by 2+ rounds across all classes. In group contexts where a Cleric is healing, those extra rounds could be the difference between winning and losing.

8. **Heavy Armor Mastery (DR 3) extends fights but doesn't convert to wins.** The flat damage reduction helps survivability but doesn't provide enough to overcome the DPS gap.

9. **Savage Attacker underperforms Precise Strikes** for Ranger (27.5% vs 30.0%). Rerolling once isn't as good as a consistent +1 to hit. The one-per-combat limitation may be too restrictive.

10. **Inspiring Leader doesn't help in groups** — Balanced + Inspire (10%) is much worse than Default Feats (40%) at L38. The party comp change (Bard instead of Ranger) hurts far more than the temp HP helps.

11. **Guardian's Vigil (Sentinel) provides ~6pp group benefit** at L38 medium (46% vs 40% Default). This is a real but modest improvement. The counterattack mechanic works as intended.

### Recommendations for Future Tuning

- **Priority 1:** Address caster solo viability (HP, damage, or monster resistance)
- **Priority 2:** Psion needs fundamental buffs (lowest class at every tier)
- **Priority 3:** Review CR matching for hard/deadly — near-0% win rates suggest overtuning
- **Priority 4:** Consider making Savage Attacker per-round instead of per-combat
- **Priority 5:** Review monster power scaling at L38-48 — win rates drop between L38 and L48 even with extra feats

### Sim Run IDs
- Solo: `a7fcd134-cb4b-4e42-a926-110d31898412` (136 matchups, 20,900 fights, 81.3s)
- Group: `63f23375-04a1-4041-8d26-011528817d5d` (30 matchups, 1,500 fights)
