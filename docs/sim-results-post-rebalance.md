# Post-Rebalance Sim Results (v4 — Tough Feat HP Fix)

**Run ID:** `7507f3dc-34ca-45a4-b88e-f249f9b83656`
**Date:** 2026-03-08
**Config:** 18 monsters × 7 classes × 200 iterations = 25,200 encounters (126 matchups)
**Changes tested:** Tough feat (+2 HP/level) now correctly applied to L48+ sim combatants

---

## 1. Overall Win Rate

| Version | Win Rate | Change |
|---------|----------|--------|
| v1 (pre-rebalance) | 8.8% | — |
| v2 (weapon tiers + monster rebalance) | 27.7% | +18.9 pts |
| v3 (ability tax + immunities fix) | 28.8% | +1.1 pts |
| **v4 (Tough feat HP fix)** | **29.0%** | +0.2 pts |

Minimal change overall — Tough feat only affects L48+ combatants (2 out of 18 level brackets).

---

## 2. Win Rate by Class (v3 → v4)

| Class | v3 | v4 | Change |
|-------|-----|-----|--------|
| Warrior | 54.9% | **56.2%** | +1.3 pts |
| Ranger | 53.3% | **53.6%** | +0.3 pts |
| Cleric | 36.7% | **36.3%** | -0.4 pts |
| Rogue | 28.2% | **28.2%** | 0.0 pts |
| Bard | 13.2% | **13.9%** | +0.7 pts |
| Mage | 7.8% | **8.1%** | +0.3 pts |
| Psion | 7.8% | **6.9%** | -0.9 pts |

Tough feat adds +100 HP at L50 and +96 HP at L48, but L45-50 monsters are so overtuned that the extra HP doesn't change outcomes significantly.

### Balance Alerts (below 45% threshold)

- Mage: 8.1%
- Psion: 6.9%
- Bard: 13.9%
- Rogue: 28.2%
- Cleric: 36.3%

---

## 3. Win Rate by Monster

| Monster | Level | Player Win Rate | Status |
|---------|-------|-----------------|--------|
| Giant Rat | 1 | 47.1% | OK |
| Goblin | 1 | 39.9% | SLIGHTLY HARD |
| Bandit | 3 | 31.1% | HARD |
| Prairie Stalker | 3 | 31.3% | HARD |
| Skeleton Warrior | 5 | 69.8% | OK |
| Ghoul Stalker | 5 | 52.8% | OK |
| Dire Wolf | 8 | 58.0% | OK |
| Ironhide Ogre | 8 | 40.9% | OK |
| Sandscale Basilisk | 10 | 54.1% | OK |
| Void Stalker | 13 | 18.1% | VERY HARD |
| Hydra | 15 | 3.7% | NEARLY IMPOSSIBLE |
| Mind Flayer | 20 | 61.6% | OK |
| Purple Worm | 25 | 0.5% | IMPOSSIBLE |
| Storm Giant | 30 | 0.0% | IMPOSSIBLE |
| Basilisk King | 35 | 6.3% | NEARLY IMPOSSIBLE |
| Archlich | 40 | 7.3% | NEARLY IMPOSSIBLE |
| Blight Dragon | 45 | 0.0% | IMPOSSIBLE |
| Void Emperor | 50 | 0.0% | IMPOSSIBLE |

### Monster Balance Summary

- **L1–L10: Reasonable** — 40–70% win rates, appropriate for road encounters
- **L13: Cliff** — Void Stalker drops to 18%, hard wall begins
- **L15+: Broken** — Hydra 3.7%, then 0% at most T4+ monsters
- **Mind Flayer (L20) is an outlier** — 61.6% while adjacent-level monsters are <5%. Likely undertuned.

---

## 4. What Changed with Tough Feat Fix

The Tough feat adds `level × 2` HP retroactively. For L48 and L50 combatants:

| Level | HP Before Fix | HP After Fix | Tough Bonus |
|-------|--------------|-------------|-------------|
| L48 Warrior | ~208 | **~304** | +96 |
| L50 Warrior | ~216 | **~316** | +100 |
| L48 Mage | ~108 | **~204** | +96 |
| L50 Mage | ~112 | **~212** | +100 |

Despite nearly doubling HP for some classes at L50, win rates barely moved because L45-50 monsters deal enough damage to chew through 300+ HP in 4-6 rounds.

---

## 5. Key Takeaways

1. **HP rebalance confirmed working** — Warrior/Ranger clearly outlive casters
2. **Tough feat fix verified** — L48+ combatants now include the bonus. Doesn't change endgame outcomes because monsters are overtuned.
3. **Caster DPR is the bottleneck, not HP** — Mages at 8% and Psions at 7% even with correct HP
4. **Monster scaling is too steep past L13** — Separate monster rebalance needed
5. **Mid-tier balance (L1–L10) is reasonable** — 40–70% win rates

---

## 6. What Next? (Same as v3)

1. **Monster rebalance pass** — Reduce HP/AC/damage on L13+ monsters
2. **Caster DPR audit** — Mage/Psion abilities need damage boosts or better scaling
3. **Bard ability audit** — 14% is extremely low for a hybrid class
4. **Rogue investigation** — 28% is low for hybrid tier

**Warrior DPR reference values (for monster rebalance):**

| Level | Warrior DPR |
|-------|-------------|
| 1 | ~2.1 |
| 3 | ~3.7 |
| 5 | ~4.5 |
| 8 | ~5.6 |
| 10 | ~7.5 |
| 13 | ~9.9 |
| 15 | ~9.2 |
| 20 | ~13.4 |
| 25 | ~12.5 |
| 30 | ~14.3 |
| 35 | ~20.8 |
| 40 | ~11.6 |
| 45 | ~9.2 |
| 50 | ~6.2 |

DPR peaks at L35 (20.8) then drops because fights end too quickly at L40+.
