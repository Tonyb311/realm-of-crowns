# Combat Balance Audit — Post-Equipment-Fix Baseline
## Date: 2026-03-02

## Executive Summary

47,950 fights across 6 batteries reveal **severe caster class imbalance** as the dominant issue. Mage and Psion are effectively non-viable at all levels against Tier 2+ monsters (0-3% win rates), while Warrior dominates with 2-10x the win rate of any other class. The root cause: casters have no armor (AC 10 + DEX = 10-11), a d6 hit die (vs Warrior's d10), and no usable abilities below level 10 — all class abilities require `levelRequired: 10`. They're essentially fragile melee fighters using their casting stat as a blunt weapon. Bard and Psion share this fate to a lesser degree.

Race balance within the 7 core released races is **moderately imbalanced**: Drakonid (+3 STR, +2 CON, +2 WIS) dominates physical classes with 87% warrior win rate vs Elf's 40.5% — a 46.5pp gap that's too wide. The monster difficulty curve shows a **hard wall at Tier 3**: Young Dragon is 0% win rate even at Level 20, and most Tier 3 monsters are unbeatable until Level 15+. Equipment scaling is visible and working (fights get longer at higher levels, HP remaining increases), confirming the armor fix is functional.

**What's working:** Tier 1 monsters are well-tuned for early game, Warrior class feels appropriately powerful, and equipment tiers create clear power progression. **What's broken:** Casters are unplayable against anything threatening, Tier 3 monsters are massively overtuned, and race balance needs tightening.

## Battery Summary

| Battery | Purpose | Matchups | Fights | Server Duration |
|---------|---------|----------|--------|-----------------|
| 1 | Class Balance @ L1 | 21 | 4,200 | 1,151ms |
| 2 | Class Balance @ L5 | 28 | 5,600 | 679ms |
| 3 | Class Balance @ L10 | 21 | 4,200 | 3,763ms |
| 4 | Race Balance (7 core) | 63 | 9,450 | 1,634ms |
| 5 | Race x Class @ L5 | 98 | 9,800 | 1,618ms |
| 6 | Monster Difficulty Curve | 147 | 14,700 | 4,253ms |
| **Total** | | **378** | **47,950** | **13,098ms** |

---

## A. Class Balance

### Level 1 (Battery 1: Human only, vs Goblin/Giant Rat/Slime)

| Class | Goblin | Giant Rat | Slime | Avg |
|-------|--------|-----------|-------|-----|
| **Warrior** | **96.5%** | **100.0%** | **87.5%** | **94.7%** |
| Cleric | 89.0% | 99.0% | 82.5% | 90.2% |
| Rogue | 81.5% | 97.5% | 78.5% | 85.8% |
| Ranger | 78.5% | 98.5% | 78.5% | 85.2% |
| Bard | 73.5% | 98.0% | 73.5% | 81.7% |
| Psion | 65.0% | 95.0% | 69.0% | 76.3% |
| **Mage** | **46.0%** | **91.0%** | **47.0%** | **61.3%** |

**Analysis:** At L1, all classes are technically viable (>50% average). Warrior is the clear best; Mage is the weakest. The gap (94.7% - 61.3% = 33.4pp) is significant but all classes can at least fight Tier 1 monsters. The spread is acceptable for L1 where gear hasn't differentiated yet.

**Notable:** Mage has only 46% vs Goblin at L1. A brand-new Mage player losing more than half their fights against the easiest non-trivial monster is a frustrating early experience.

### Level 5 (Battery 2: Human only, vs Tier 2 monsters)

| Class | Orc Warrior | Skel. Warrior | Giant Spider | Dire Wolf | Avg |
|-------|-------------|---------------|--------------|-----------|-----|
| **Warrior** | **50.0%** | **80.0%** | **81.5%** | **19.5%** | **57.8%** |
| Rogue | 27.0% | 58.5% | 52.5% | 5.0% | 35.8% |
| Cleric | 19.5% | 53.5% | 53.0% | 11.0% | 34.2% |
| Ranger | 17.5% | 52.0% | 47.0% | 7.0% | 30.9% |
| Bard | 16.5% | 38.0% | 36.5% | 5.0% | 24.0% |
| Psion | 0.0% | 9.0% | 1.0% | 0.0% | 2.5% |
| **Mage** | **0.0%** | **1.0%** | **0.5%** | **0.0%** | **0.4%** |

**Analysis:** This is where the class imbalance becomes **critical**:
- **Mage is dead.** 0.4% average win rate. Effectively 0% against anything except the weakest Tier 2 monster.
- **Psion is dead.** 2.5% average. Same problem as Mage — d6 hit die, no armor (AC 10), no abilities until L10.
- **Bard is struggling.** 24% average. Better than casters but still non-viable against most Tier 2.
- **Warrior dominates.** 57.8% average, nearly double the next class (Rogue at 35.8%).
- **Dire Wolf is a wall.** Even Warrior only manages 19.5% against it. All other classes are <11%.

**Root cause:** Mage and Psion have AC 10 (no armor, 10 + 0 DEX mod), a d6 hit die (~22 HP at L5), and no class abilities (all require Level 10+). They're essentially punching bags who can't survive 2-3 monster hits. Warrior has AC 17 (iron heavy armor), d10 hit die (~40 HP), and the highest STR for attack/damage rolls.

### Level 10 (Battery 3: Human only, vs Troll/Young Dragon/Lich)

| Class | Troll | Young Dragon | Lich | Avg |
|-------|-------|--------------|------|-----|
| **Warrior** | **89.5%** | **0.0%** | **11.0%** | **33.5%** |
| Cleric | 49.0% | 0.0% | 18.0% | 22.3% |
| Ranger | 24.5% | 0.0% | 15.0% | 13.2% |
| Rogue | 17.0% | 0.0% | 0.5% | 5.8% |
| Mage | 1.0% | 0.0% | 0.0% | 0.3% |
| Bard | 0.0% | 0.0% | 0.0% | 0.0% |
| Psion | 0.0% | 0.0% | 0.0% | 0.0% |

**Analysis:** L10 is even worse:
- **Young Dragon is 0% for ALL classes** including Warrior. It's an impossible wall at L10.
- **Bard and Psion are 0% across the board.** Completely non-functional.
- **Mage** has actually gained class abilities at L10 but still only manages 1% vs Troll.
- Only **Warrior** (89.5%) and **Cleric** (49%) can handle Troll. Everyone else is <25%.

**Note:** L10 class abilities are now active (Fireball, Reckless Strike, etc.), but the ability queue system may not be helping enough — Mage abilities deal decent damage but Mage can't survive long enough to use them with AC 10 and ~30 HP.

### Class Scaling Summary

| Class | L1 Avg | L5 Avg | L10 Avg | Scaling |
|-------|--------|--------|---------|---------|
| Warrior | 94.7% | 57.8% (-36.9) | 33.5% (-24.2) | Scales best, always top |
| Cleric | 90.2% | 34.2% (-55.9) | 22.3% (-11.9) | Decent tank, scales OK |
| Rogue | 85.8% | 35.8% (-50.1) | 5.8% (-29.9) | Falls off hard at L10 |
| Ranger | 85.2% | 30.9% (-54.3) | 13.2% (-17.7) | Falls off at L5+ |
| Bard | 81.7% | 24.0% (-57.7) | 0.0% (-24.0) | Non-viable past L1 |
| Psion | 76.3% | 2.5% (-73.8) | 0.0% (-2.5) | Non-viable past L1 |
| Mage | 61.3% | 0.4% (-61.0) | 0.3% (-0.0) | Non-viable at all levels |

**Key pattern:** Every class drops significantly from L1 to L5, but this is expected because L1 faces Tier 1 monsters while L5 faces Tier 2. The real problem is that the drop for casters is catastrophic (61% to 0.4% for Mage) while Warrior retains a healthy 57.8%.

---

## B. Race Balance (7 Released Core Races)

### Racial Stat Modifiers (for reference)

| Race | STR | DEX | CON | INT | WIS | CHA | Total |
|------|-----|-----|-----|-----|-----|-----|-------|
| Human | +1 | +1 | +1 | +1 | +1 | +1 | +6 |
| Elf | +0 | +3 | -1 | +2 | +2 | +1 | +7 |
| Dwarf | +2 | -1 | +3 | +1 | +1 | +0 | +6 |
| Harthfolk | -1 | +3 | +1 | +1 | +1 | +2 | +7 |
| Orc | +4 | +0 | +3 | -1 | +0 | -1 | +5 |
| Nethkin | +0 | +1 | +0 | +3 | +1 | +2 | +7 |
| Drakonid | +3 | -1 | +2 | +1 | +2 | +0 | +7 |

### Core Races as Warriors (Battery 4)

**Level 1:**

| Race | Goblin | Orc Warrior | Y. Dragon | Avg |
|------|--------|-------------|-----------|-----|
| Orc | 98.7% | 1.3% | 0.0% | 33.3% |
| Dwarf | 98.7% | 0.0% | 0.0% | 32.9% |
| Drakonid | 98.0% | 0.0% | 0.0% | 32.7% |
| Human | 94.0% | 0.0% | 0.0% | 31.3% |
| Elf | 91.3% | 0.7% | 0.0% | 30.7% |
| Nethkin | 92.0% | 0.0% | 0.0% | 30.7% |
| Harthfolk | 90.7% | 0.0% | 0.0% | 30.2% |

Gap: 3.1pp — **excellent balance at L1**. All races are within statistical noise. Orc and Dwarf's physical stat focus shows in the Goblin matchup but it's minor.

**Level 5:**

| Race | Goblin | Orc Warrior | Y. Dragon | Avg |
|------|--------|-------------|-----------|-----|
| **Drakonid** | **100%** | **74.0%** | **0%** | **58.0%** |
| Orc | 100% | 66.0% | 0% | 55.3% |
| Dwarf | 100% | 63.3% | 0% | 54.4% |
| Human | 100% | 52.7% | 0% | 50.9% |
| Nethkin | 100% | 39.3% | 0% | 46.4% |
| Harthfolk | 100% | 37.3% | 0% | 45.8% |
| **Elf** | **100%** | **25.3%** | **0%** | **41.8%** |

Gap: 16.2pp — **moderate but acceptable for warrior class.** Drakonid's +3 STR and +2 CON make it a naturally superior warrior. Elf's -1 CON and +0 STR make it the weakest warrior, which is thematically appropriate (Elves are designed as DEX/INT/WIS characters, not warriors).

The key differentiator is the Orc Warrior matchup: Drakonid 74%, Elf 25% (49pp spread on a single monster).

**Level 10:**

| Race | Goblin | Orc Warrior | Y. Dragon | Avg |
|------|--------|-------------|-----------|-----|
| All 7 races | 100% | 100% | 0% | 66.7% |

Gap: 0.0pp — **complete convergence.** At L10, equipment (Steel heavy armor AC 19, Steel Longsword 1d8+3) dominates over racial stat differences. This is healthy — it means gear progression equalizes races over time. The only differentiation remaining is the Young Dragon wall (0% for everyone).

### Race x Class Interaction (Battery 5, L5)

Average win rate across Orc Warrior + Giant Spider:

| Race | Warrior | Mage | Rogue | Cleric | Ranger | Bard | Psion |
|------|---------|------|-------|--------|--------|------|-------|
| **Drakonid** | **87.0%** | 3.0% | 47.5% | 52.0% | 50.5% | 34.5% | 6.5% |
| Orc | 80.0% | 0.0% | 38.0% | 32.5% | 32.0% | 22.0% | 4.0% |
| Dwarf | 72.5% | 0.5% | 34.0% | 41.0% | 37.5% | 23.0% | 2.5% |
| Human | 58.0% | 0.0% | 39.5% | 34.0% | 32.5% | 26.5% | 4.0% |
| Nethkin | 57.0% | 1.5% | 36.5% | 37.0% | 34.5% | 24.0% | 3.0% |
| Harthfolk | 41.5% | 0.5% | **63.5%** | 43.0% | 42.0% | 32.5% | 4.0% |
| Elf | 40.5% | 0.0% | 37.5% | 33.0% | 32.0% | 18.0% | 2.5% |

**Detailed: vs Orc Warrior only**

| Race | Warrior | Mage | Rogue | Cleric | Ranger | Bard | Psion |
|------|---------|------|-------|--------|--------|------|-------|
| Drakonid | 80% | 0% | 31% | 39% | 35% | 15% | 3% |
| Orc | 72% | 0% | 18% | 16% | 18% | 7% | 0% |
| Dwarf | 58% | 0% | 18% | 23% | 23% | 8% | 0% |
| Human | 38% | 0% | 27% | 22% | 20% | 12% | 0% |
| Nethkin | 40% | 1% | 21% | 22% | 15% | 14% | 2% |
| Harthfolk | 25% | 0% | 49% | 30% | 21% | 22% | 1% |
| Elf | 25% | 0% | 23% | 22% | 24% | 8% | 0% |

**Detailed: vs Giant Spider only**

| Race | Warrior | Mage | Rogue | Cleric | Ranger | Bard | Psion |
|------|---------|------|-------|--------|--------|------|-------|
| Drakonid | 94% | 6% | 64% | 65% | 66% | 54% | 10% |
| Orc | 88% | 0% | 58% | 49% | 46% | 37% | 8% |
| Dwarf | 87% | 1% | 50% | 59% | 52% | 38% | 5% |
| Human | 78% | 0% | 52% | 46% | 45% | 41% | 8% |
| Nethkin | 74% | 2% | 52% | 52% | 54% | 34% | 4% |
| Harthfolk | 58% | 1% | 78% | 56% | 63% | 43% | 7% |
| Elf | 56% | 0% | 52% | 44% | 40% | 28% | 5% |

**Key findings:**
- **Drakonid dominates almost every class.** Best warrior (87%), best cleric (52%), best ranger (50.5%), best bard (34.5%), best psion (6.5%). Its +3 STR / +2 CON / +2 WIS benefit almost all physical and wisdom-based builds.
- **Harthfolk shines as Rogue (63.5%)** — the highest non-warrior win rate in the entire grid. Their +3 DEX makes them exceptional for DEX-based classes. Also strong Cleric (43%) and Ranger (42%).
- **Mage is broken regardless of race** — 0-3% across all 7 races. Race choice is irrelevant for Mage.
- **Psion is broken regardless of race** — 2.5-6.5% across all 7 races.
- **Warrior race spread: 46.5pp** (Drakonid 87% to Elf 40.5%). This is too wide.
- **Rogue race spread: 29.5pp** (Harthfolk 63.5% to Dwarf 34%). Moderate, driven by DEX differences.

**Per-class race spread:**

| Class | Spread | Best Race | Worst Race | Assessment |
|-------|--------|-----------|------------|------------|
| Warrior | 46.5pp | Drakonid (87%) | Elf (40.5%) | **Too wide** |
| Rogue | 29.5pp | Harthfolk (63.5%) | Dwarf (34%) | Moderate |
| Cleric | 19.5pp | Drakonid (52%) | Orc (32.5%) | Acceptable |
| Ranger | 18.5pp | Drakonid (50.5%) | Elf (32%) | Acceptable |
| Bard | 16.5pp | Drakonid (34.5%) | Elf (18%) | Acceptable |
| Psion | 4.0pp | Drakonid (6.5%) | Elf (2.5%) | N/A (all broken) |
| Mage | 3.0pp | Drakonid (3%) | Human (0%) | N/A (all broken) |

### Race Balance Summary

Race balance for physical classes is **thematically coherent** but the spread is too wide for Warrior:
- Drakonid should be a strong warrior, but 87% vs Elf's 40.5% means Elf warriors are non-competitive.
- The +3 STR / +2 CON combination on Drakonid is strictly better for combat than any other race.
- Harthfolk being the best Rogue (DEX +3) shows race-class synergy working as intended.
- At L10, races converge completely — gear equalizes everything. This is good design.

---

## C. Monster Difficulty Curve (Battery 6: Human Warrior)

### Win Rate Matrix (%)

| Monster (Level) | L1 | L3 | L5 | L7 | L10 | L15 | L20 |
|-----------------|-----|-----|-----|-----|------|------|------|
| **TIER 1** | | | | | | | |
| Giant Rat (1) | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Mana Wisp (2) | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Goblin (1) | 91 | 100 | 100 | 100 | 100 | 100 | 100 |
| Slime (2) | 91 | 99 | 100 | 100 | 100 | 100 | 100 |
| Bog Wraith (4) | 74 | 100 | 100 | 100 | 100 | 100 | 100 |
| Wolf (3) | 62 | 97 | 100 | 100 | 100 | 100 | 100 |
| Bandit (3) | 42 | 91 | 100 | 100 | 100 | 100 | 100 |
| **TIER 2** | | | | | | | |
| Shadow Wraith (9) | 2 | 10 | 87 | 97 | 100 | 100 | 100 |
| Arcane Elemental (8) | 0 | 7 | 86 | 96 | 100 | 100 | 100 |
| Giant Spider (7) | 0 | 5 | 79 | 91 | 100 | 100 | 100 |
| Skeleton Warrior (6) | 0 | 5 | 76 | 96 | 100 | 100 | 100 |
| Orc Warrior (6) | 0 | 0 | 39 | 79 | 100 | 100 | 100 |
| Dire Wolf (8) | 0 | 0 | 28 | 42 | 100 | 100 | 100 |
| Troll (9) | 0 | 0 | 1 | 3 | 80 | 100 | 100 |
| **TIER 3** | | | | | | | |
| Lich (15) | 0 | 0 | 0 | 0 | 10 | 94 | 100 |
| Void Stalker (16) | 0 | 0 | 0 | 0 | 7 | 84 | 87 |
| Elder Fey Guardian (18) | 0 | 0 | 0 | 0 | 0 | 33 | 60 |
| Demon (17) | 0 | 0 | 0 | 0 | 0 | 24 | 43 |
| Hydra (19) | 0 | 0 | 0 | 0 | 0 | 1 | 29 |
| Ancient Golem (20) | 0 | 0 | 0 | 0 | 0 | 6 | 14 |
| **Young Dragon (12)** | **0** | **0** | **0** | **0** | **0** | **3** | **8** |

### Difficulty Curve Analysis

**Tier 1 (L1-5) — Well-tuned:**
- Giant Rat and Mana Wisp are 100% at L1 — good "tutorial" monsters.
- Goblin and Slime at 91% — easy but not trivial. Good.
- Bandit at 42% — challenging for L1, appropriate difficulty for a L3 humanoid.
- Wolf at 62% — solid mid-Tier-1 challenge.
- All Tier 1 monsters reach 100% by L5 — correct, they should be trivial outgrows.

**Tier 2 (L5-10) — Mixed:**
- Shadow Wraith (L9) and Arcane Elemental (L8) jump from 2-7% at L3 to 86-87% at L5. That's a very steep curve — nearly unbeatable below L5, then suddenly easy.
- Orc Warrior (L6) at 39% at L5 is well-placed — challenging but beatable.
- **Dire Wolf (L8) at 28% at L5 is quite hard.** It's harder than its level suggests compared to other L7-9 monsters (Giant Spider 79%, Skeleton Warrior 76%). The Dire Wolf's 2d8+3 damage and AC 14 make it an outlier.
- **Troll (L9) at 1% at L5 is too hard.** Only 3% at L7 and 80% at L10. There's a massive difficulty spike — it goes from essentially impossible to easy in one level tier jump.
- All Tier 2 reach 100% by L10 — correct progression.

**Tier 3 (L10-20) — Severely overtuned:**
- At L10, the target was "40-60% win rate" for level-appropriate Tier 3. Instead we get:
  - Lich (L15): 10%
  - Void Stalker (L16): 7%
  - All others: 0%
- **Young Dragon (L12) is essentially impossible.** Only 8% win rate at L20 — 8 levels above it. This is the single worst-tuned monster.
- Even at L15, only Lich (94%) and Void Stalker (84%) are reliably beatable. The rest range from 1% (Hydra) to 33% (Elder Fey Guardian).
- At L20 (max in test), only Lich (100%) is trivial. Void Stalker (87%) is manageable. Others: Ancient Golem 14%, Hydra 29%, Demon 43%, Elder Fey 60%.
- **There is no smooth difficulty curve for Tier 3.** Monsters go from "impossible" to "beatable" in sudden jumps, with some (Young Dragon, Ancient Golem, Hydra) never becoming consistently beatable.

### Average Rounds (Armor Impact Evidence)

| Monster | L1 | L5 | L10 | L20 |
|---------|-----|-----|------|------|
| Goblin | 4.5 | 3.1 | 2.0 | 3.0 |
| Orc Warrior | 1.7 | 4.9 | 3.1 | 6.3 |
| Troll | 1.2 | 3.9 | 5.0 | 10.8 |
| Young Dragon | 1.1 | 2.4 | 4.0 | 12.3 |

**Pattern:** Against stronger monsters, fights get progressively longer at higher levels. A L1 Warrior dies to Young Dragon in 1.1 rounds (instant kill); a L20 Warrior survives 12.3 rounds. This confirms armor and HP scaling are working — higher-level characters take much more punishment before dying, even if they can't win.

---

## D. Equipment Impact

Equipment scaling is clearly visible in the data:

**HP progression (Human Warrior):**
- L1: ~12 HP (10 + 2 CON mod)
- L5: ~40 HP (12 + 4 x floor(5.5 + 2))
- L10: ~79 HP (12 + 9 x floor(5.5 + 2))
- L20: ~159 HP

**AC progression (Warrior):**
- L1: AC 14 (Copper heavy armor)
- L5: AC 17 (Iron heavy armor)
- L10: AC 19 (Steel heavy armor)
- L15: AC 21 (Mithril heavy armor)
- L20: AC 23 (Adamantine heavy armor)

**AC progression (Mage/Psion — no armor):**
- All levels: AC 10 (no armor, base 10 + DEX modifier 0)

**Weapon progression (melee):**
- L1: 1d6 Copper Sword
- L5: 1d8+1 Iron Longsword (+1 attack)
- L10: 1d8+3 Steel Longsword (+2 attack)
- L20: 1d12+5 Adamantine Greatsword (+4 attack)

**Evidence from HP remaining data:**

| Monster | L1 HP rem | L5 HP rem | L10 HP rem | L20 HP rem |
|---------|-----------|-----------|------------|------------|
| Goblin | 7.1 | 37.5 | 74.0 | 144.2 |
| Bandit | 5.5 | 33.0 | 71.1 | 142.1 |
| Orc Warrior | 0.0 | 12.3 | 53.6 | 123.9 |
| Giant Spider | 0.0 | 17.4 | 58.5 | 130.0 |
| Dire Wolf | 0.0 | 11.9 | 46.7 | 114.0 |
| Troll | 0.0 | 5.0 | 21.3 | 83.8 |

The armor fix is clearly working. Higher-level characters survive significantly longer and retain more HP post-combat.

---

## E. The Armor Fix Specifically

**Before the armor fix:** All characters would have had AC ~12 (10 + DEX modifier). Now:
- L1 Warrior: AC 14 (+2 vs pre-fix). Monsters hitting on a ~11+ now hit on ~13+.
- L5 Warrior: AC 17 (+5 vs pre-fix). This is a massive improvement — a monster with +6 attack that used to need a 6+ to hit now needs an 11+. Hit rate drops from 75% to 50%.
- L10 Warrior: AC 19. Most Tier 2 monsters need 13+ to hit (~40% hit rate).

This is reflected in the avg rounds data: fights against Troll at L10 last 5.0 rounds vs 1.2 rounds at L1. The Warrior is surviving 4x as many rounds because monsters can't land hits as frequently.

**For non-Warrior classes:**
- Mage/Psion: AC 10 at ALL levels (no armor, 0 DEX). The armor fix did nothing for them.
- Rogue/Bard: AC 11-17 (light armor + DEX). Moderate improvement.
- Cleric: AC 13-20 (medium armor + DEX cap 2). Solid improvement.
- Ranger: AC 12-19 (medium armor + DEX cap 2). Solid improvement.

The armor fix disproportionately benefits Warrior (heavy armor, flat AC) and has zero effect on Mage/Psion (no armor at all). This is the core driver of the class imbalance gap widening at higher levels.

---

## F. Balance Red Flags (Priority Ordered)

### 1. CRITICAL: Mage and Psion are completely non-viable at L5+
- **Data:** Mage 0.4% avg win rate at L5 vs Tier 2; Psion 2.5%. At L10 vs Tier 2-3: Mage 0.3%, Psion 0.0%.
- **Root cause:** AC 10 at all levels (no armor), d6 hit die (~22 HP at L5, ~30 HP at L10), no abilities until L10, weapon damage uses INT which is comparable to STR but survivability is 3x worse than Warrior.
- **Impact:** Two of 7 classes (29%) are unplayable. Players who pick Mage or Psion will be unable to survive any road encounter against Tier 2+ monsters.

### 2. CRITICAL: No class abilities fire below Level 10
- **Data:** All class abilities in `ABILITIES_BY_CLASS` require `levelRequired: 10`. L1-9 combat is purely basic attacks for all classes.
- **Impact:** The entire L1-9 experience has zero class differentiation from abilities. A Mage plays identically to a Warrior except with worse stats and no armor. There's no Fireball, no Sneak Attack, no Healing Word — nothing that makes each class feel unique until L10.
- **Combined with #1:** Mage gets abilities at L10 but still can't survive long enough to use them (1% vs Troll with abilities active).

### 3. HIGH: Young Dragon is unbeatable (0-8% win rate at L12-20)
- **Data:** 0% win rate at all levels through L10. 3% at L15. 8% at L20. A Level 12 monster that a Level 20 character wins only 8% of the time.
- **Root cause:** Likely massively overtuned stats (HP, AC, damage) relative to its level designation.
- **Impact:** Young Dragon encounters during travel in the Frozen Reaches are instant death for any character below L20, and near-certain death even at L20.

### 4. HIGH: Tier 3 monsters massively overtuned across the board
- **Data:** At L10 (minimum Tier 3 level): only Lich has >0% win rate (10%). At L15: only Lich (94%) and Void Stalker (84%) are beatable. At L20: Hydra (29%), Ancient Golem (14%), and Young Dragon (8%) are still nearly impossible.
- **Impact:** Most Tier 3 road encounters are instant death. Players in level 10-20 regions will face encounters they cannot win.

### 5. MEDIUM: Bard non-viable at L5+ (24% avg vs Tier 2, 0% at L10)
- **Data:** Bard has d8 hit die and light armor (AC 11-17) but relies on CHA which doesn't help survivability. 24% at L5, 0% at L10.
- **Impact:** Third class out of 7 (43% of roster) that's non-viable against level-appropriate content.

### 6. MEDIUM: Drakonid warrior spread too wide (87% vs Elf's 40.5%)
- **Data:** 46.5pp spread within Warrior class at L5. Drakonid's +3 STR / +2 CON is strictly better for melee combat than any other race.
- **Impact:** Min-maxing players will always pick Drakonid for any physical class. Elf warriors are significantly handicapped.

### 7. LOW: Dire Wolf and Troll are difficulty spikes within Tier 2
- **Data:** At L5: Dire Wolf 28% win rate vs ~80% for similar-level monsters. Troll 1% at L5, 3% at L7, then 80% at L10.
- **Impact:** Tier 2 difficulty is uneven — encountering a Dire Wolf or Troll is much more dangerous than other Tier 2 monsters of similar level.

---

## G. Recommendations

### Priority 1: Fix Caster Survivability

**Option A (Recommended): Add early-level abilities**
- Add basic class abilities at levels 1, 3, 5, and 7 across all classes.
- Mage: L1 Arcane Bolt (1d8 force damage, ranged), L5 Mana Shield (+2 AC for 3 rounds).
- Psion: L1 Mind Blast (1d6 psychic damage), L5 Telekinetic Barrier (+2 AC for 3 rounds).
- This gives casters meaningful combat tools and survivability before L10.

**Option B: Buff caster base defenses**
- Increase Mage/Psion hit die from d6 to d8 (matches Rogue/Bard).
- Give Mage/Psion a "Mage Armor" passive that adds their INT/WIS modifier to AC (equivalent of light armor).
- Expected impact: Mage HP at L5 goes from ~22 to ~30. AC goes from 10 to ~13. Win rate should improve from 0% to ~15-25% vs Tier 2.

**Option C: Implement weapon spell damage**
- Caster "weapons" (staves) should deal damage based on spells, not melee. Give staves higher base damage or add spell damage dice on top. Currently staves deal 1d6 at Tier 1 (same as copper sword) — casters should deal more burst damage to compensate for fragility.

### Priority 2: Tune Tier 3 Monsters

- **Young Dragon:** Reduce HP by 40-50%, reduce AC by 3-4. A L12 monster should be beatable at L12 (~50% win rate for warrior). Current stats make it harder than L20 monsters.
- **Hydra, Ancient Golem, Demon:** Similar reductions. Target: 40-60% warrior win rate at their designated level.
- **Validate against:** After tuning, re-run Battery 6 to confirm smooth difficulty curve.

### Priority 3: Improve Bard Combat

- Bard has d8 hit die and light armor (AC 11-17) — survivability is OK but CHA-based damage isn't competitive.
- Consider: Bard abilities at lower levels (Inspiring Song at L1 for +1 attack, Cutting Words at L5 for -1 enemy attack).
- Or: Bard gets bonus to party combat (healing, buffs) — since road encounters are solo, this makes Bard inherently weaker in PvE. May need a different tuning philosophy.

### Priority 4: Consider Drakonid Warrior Tuning

- Reduce Drakonid STR modifier from +3 to +2, or increase CON cost (e.g., +1 CON instead of +2).
- Alternatively, give Elf/Harthfolk combat-relevant racial abilities that partially compensate for lower physical stats.
- Target: warrior race spread under 30pp at L5 (currently 46.5pp).

### Priority 5: Smooth Tier 2 Difficulty Spikes

- **Dire Wolf:** Reduce damage from 2d8+3 to 2d6+3 or reduce HP from 45 to 40. Target: ~40% warrior win rate at L5 (currently 28%).
- **Troll:** Reduce HP or AC to bring L7 win rate from 3% to ~30-40%. Currently it jumps from 3% at L7 to 80% at L10, which feels like a wall that suddenly crumbles.

---

## Appendix: Raw Data Location

All raw simulation results (JSON): `audits/combat-balance-raw.json`

Battery data is persisted in the database via `persist: true` for future reference.
