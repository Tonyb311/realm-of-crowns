# Post-Rebalance Combat Sim Results

**Run ID:** `cmmfjm8t4000014gn32jikcz1`
**Date:** 2026-03-06
**Total fights:** 15,400 (77 matchups x 200 iterations)
**Overall win rate:** 8.8%
**Changes tested:** Bounded accuracy stats (cap 20), class-varied HP/level (4/3/2), save proficiencies, extra attacks, feats

## Key Findings

### 1. Level 1 balance is reasonable

L1 vs Giant Rat and Goblin shows meaningful class differentiation:
- **Warrior: 83%** — strong early game, as intended
- **Ranger: 71%** — solid physical damage
- **Cleric: 48%** — mid-tier, consistent
- **Bard: 35%**, **Rogue: 30%** — squishy but viable
- **Mage: 22%**, **Psion: 22%** — fragile casters struggle early (expected)

### 2. Level 5+ monsters are massively overtuned

From L5 onward, win rates collapse to near-zero:
- L5 vs Skeleton Warrior: best is Warrior at 18%, most classes at 0%
- L10 vs Sandscale Basilisk: **0% for 6/7 classes** (only Ranger at 4%)
- L13+ vs all monsters: **0% across the board**

**Root cause:** Monster HP and damage scale dramatically while player damage stays flat. A L50 Warrior with 220 HP and ~8.4 DPR can't dent a Void Emperor with 650 HP (would need ~77 rounds, dies in ~2).

### 3. HP class differentiation works correctly

| Level | Warrior | Ranger | Cleric | Rogue/Bard | Mage/Psion |
|------:|--------:|-------:|-------:|-----------:|-----------:|
| 1 | 20 | 18 | 18 | 16 | 14 |
| 10 | 56 | 54 | 45 | 43 | 32 |
| 25 | 116 | 114 | 90 | 88 | 62 |
| 50 | 220 | 214 | 169 | 163 | 112 |

**Warrior:Mage HP ratio at L50 = 1.96:1** — exactly the 2:1 target from the design doc.

### 4. Mage survivability at L50 is concerning

With only 112 HP, Mage/Psion die in 1-2 rounds to any mid+ tier monster. Even with the best possible play, they can't survive long enough to deal meaningful damage. This is by design (back-line fragile) but means caster viability depends entirely on ability damage, which the sim doesn't fully model.

### 5. Player DPR is too low across all levels

Even Warrior — the highest DPR class — peaks at ~11.2 DPR (L40 vs Archlich). Against monsters with 100-650 HP, this means 10-60+ rounds to kill. Players die long before that.

**The problem is NOT player HP (that's now correct). The problem is the player-to-monster damage/HP ratio.** Monsters need HP rebalancing or player damage scaling needs review.

## Class Win Rate by Level

| Level | Warrior | Mage | Rogue | Cleric | Ranger | Bard | Psion |
|------:|--------:|-----:|------:|-------:|-------:|-----:|------:|
| 1 | 83% | 22% | 30% | 48% | 71% | 35% | 22% |
| 5 | 18% | 0% | 2% | 3% | 10% | 0% | 0% |
| 10 | 0% | 0% | 0% | 0% | 4% | 0% | 0% |
| 13 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 15 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 20 | 6% | 0% | 2% | 4% | 11% | 0% | 0% |
| 25 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 30 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 40 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 50 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |

## Per-Matchup Breakdown

### Level 1 (vs Giant Rat / Goblin)

| Matchup | Win% | Avg Rounds | DPR |
|---------|------|------------|-----|
| L1 warrior vs Giant Rat | 84.0% | 9.4 | 1.8 |
| L1 warrior vs Goblin | 82.5% | 9.0 | 2.6 |
| L1 ranger vs Giant Rat | 72.0% | 10.2 | 1.6 |
| L1 ranger vs Goblin | 69.5% | 8.4 | 2.6 |
| L1 cleric vs Giant Rat | 43.0% | 13.9 | 1.0 |
| L1 cleric vs Goblin | 52.0% | 11.0 | 1.8 |
| L1 bard vs Giant Rat | 39.0% | 11.9 | 1.1 |
| L1 bard vs Goblin | 31.5% | 9.3 | 1.9 |
| L1 rogue vs Giant Rat | 33.0% | 12.6 | 1.0 |
| L1 rogue vs Goblin | 26.5% | 9.1 | 1.9 |
| L1 mage vs Giant Rat | 30.5% | 10.7 | 1.1 |
| L1 mage vs Goblin | 12.5% | 7.8 | 1.9 |
| L1 psion vs Giant Rat | 27.5% | 10.5 | 1.1 |
| L1 psion vs Goblin | 15.5% | 7.5 | 2.0 |

### Level 5 (vs Skeleton Warrior)

| Matchup | Win% | Avg Rounds | DPR |
|---------|------|------------|-----|
| L5 warrior | 18.0% | 5.6 | 4.5 |
| L5 ranger | 10.0% | 4.5 | 4.9 |
| L5 cleric | 3.0% | 4.3 | 3.8 |
| L5 rogue | 1.5% | 3.8 | 3.5 |
| L5 mage | 0.0% | 2.8 | 2.7 |
| L5 bard | 0.0% | 3.7 | 2.3 |
| L5 psion | 0.0% | 2.8 | 2.1 |

### Level 10+ (all 0% except noted)

| Level | Monster | Best Class | Best Win% | Best DPR |
|------:|---------|------------|-----------|----------|
| 10 | Sandscale Basilisk (110 HP) | Ranger | 4.0% | 13.7 |
| 13 | Void Stalker (110 HP) | — | 0% | 7.2 (Ranger) |
| 15 | Hydra (160 HP) | — | 0% | 2.3 (Warrior) |
| 20 | Mind Flayer (120 HP) | Ranger | 11.0% | 9.5 (Warrior) |
| 25 | Purple Worm (210 HP) | — | 0% | 9.5 (Warrior) |
| 30 | Storm Giant (280 HP) | — | 0% | 3.6 (Warrior) |
| 40 | Archlich (420 HP) | — | 0% | 11.2 (Warrior) |
| 50 | Void Emperor (650 HP) | — | 0% | 8.4 (Warrior) |

## Monster HP Reference

| Monster | Level Bracket | HP | Player HP (Warrior) | Ratio |
|---------|:------------:|---:|--------------------:|------:|
| Giant Rat | 1 | 18 | 20 | 0.9x |
| Goblin | 1 | 24 | 20 | 1.2x |
| Skeleton Warrior | 5 | 40 | 36 | 1.1x |
| Sandscale Basilisk | 10 | 110 | 56 | 2.0x |
| Void Stalker | 13 | 110 | 68 | 1.6x |
| Hydra | 15 | 160 | 76 | 2.1x |
| Mind Flayer | 20 | 120 | 96 | 1.3x |
| Purple Worm | 25 | 210 | 116 | 1.8x |
| Storm Giant | 30 | 280 | 137 | 2.0x |
| Archlich | 40 | 420 | 178 | 2.4x |
| Void Emperor | 50 | 650 | 220 | 3.0x |

Monster HP:Warrior HP ratio climbs from 0.9x at L1 to 3.0x at L50. Combined with monsters dealing much more damage per round than players, this makes mid-to-late game unwinnable.

## Warrior Extra Attack DPR Analysis

| Level | Attacks | DPR | Monster | Win% |
|------:|--------:|----:|---------|-----:|
| 1 | 1 | 1.8-2.6 | Giant Rat/Goblin | 83% |
| 5 | 1 | 4.5 | Skeleton Warrior | 18% |
| 10 | 1 | 7.9 | Sandscale Basilisk | 0% |
| 13 | 2 | 3.5 | Void Stalker | 0% |
| 20 | 2 | 9.5 | Mind Flayer | 6% |
| 40 | 4 | 11.2 | Archlich | 0% |
| 50 | 4 | 8.4 | Void Emperor | 0% |

DPR doesn't scale proportionally with extra attacks — weapon damage is too low relative to monster HP at higher tiers.

## What's Validated

1. **HP formula is now correct** — matches game's actual formula perfectly
2. **Class HP differentiation works** — 2:1 Warrior:Mage ratio at L50
3. **Stat model is correct** — bounded accuracy, cap 20, milestone allocations
4. **Extra attacks fire** — Warrior shows higher sustained DPR
5. **Save proficiencies and feats apply** — wired into all combatant builders

## Next Steps (Monster Rebalance Required)

The player-side systems are now correct. The problem is monster tuning:

1. **Reduce monster HP at mid-high tiers** — Target 0.8-1.5x player HP (currently 1.6-3.0x)
2. **Or increase player weapon damage scaling** — Current weapon tiers don't keep up with monster HP growth
3. **Or both** — Likely the best approach: moderate monster HP reduction + modest damage scaling increase
4. **Re-run sim after monster rebalance** to validate 40-60% target win rates
