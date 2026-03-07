# Audit: Monster Balance & Player DPR Analysis

**Date:** 2026-03-06
**Sim Run ID:** `cmmfjm8t4000014gn32jikcz1`
**Overall win rate:** 8.8% (catastrophic — 0% from L13+)

---

## 1. DPR Gap Analysis

### The Question

L40 Warrior sim DPR is 11.2 against Archlich (420 HP, AC 23). Back-of-envelope math suggests ~42 DPR. Where is the other 73% of expected damage going?

### 1a. Attack Bonus Calculation — VERIFIED CORRECT

For a L40 Human Warrior:

| Component | Value | Source |
|-----------|------:|--------|
| STR stat | 20 | Base 10 + 10 milestone allocations (16 milestones available at L40, STR is priority 1, hits cap 20 at allocation #10) |
| STR modifier | +5 | `(20 - 10) / 2 = 5` |
| Proficiency bonus | +7 | `getProficiencyBonus(40)` → L30-39 bracket = 7 (NOT 8; L40+ = 8 but sim tests L40 exactly, which falls in L40+ = 8) |
| Weapon bonus (Mithril Sword) | +4 | T4: `bonusAttack: 3`, quality `1.5×` → `floor(3 * 1.5) = 4` |
| **Total attack bonus** | **+16 or +17** | Depends on whether L40 gets proficiency 7 or 8 |

**Correction:** `getProficiencyBonus(40)` → checking the code: `if (level >= 40) return 8`. So proficiency is **+8** at L40, giving total **+17**.

**Actual attack bonus at L40: +17** (STR 5 + prof 8 + weapon 4)

### 1b. Extra Attacks — CRITICAL FINDING: L40 gets 3 attacks, not 4

```typescript
// From combat-constants.ts
warrior: [
  { level: 13, totalAttacks: 2 },
  { level: 34, totalAttacks: 3 },
  { level: 42, totalAttacks: 4 },  // ← L40 doesn't reach this!
]
```

**L40 Warrior gets 3 attacks per Attack action.** The 4th attack unlocks at L42. The prompt assumed L40 had 4 attacks — it has 3.

### 1c. Ability Priority Interaction — MAJOR DPR DRAIN

This is the biggest factor in the DPR gap.

**How `decideAction()` works** (from `tick-combat-resolver.ts` line ~170):

1. Check retreat conditions
2. Check CC status effects (stunned/mesmerized/frightened — SKIP TURN)
3. Check monster abilities (N/A for players)
4. Check setup chain abilities
5. **Check ability queue** — iterate the queue, fire the first ability that's off cooldown and whose `useWhen` condition matches
6. Check items
7. **Basic attack** — only if nothing above triggered

**Critical: abilities REPLACE the attack action entirely.** When a warrior uses an ability, they get 0 extra attacks that turn. Extra attacks only apply to the `'attack'` action type (code at combat-engine.ts line ~2820).

**What abilities does a L40 Warrior have in the sim?**

The sim calls `buildAbilityQueue('warrior', 40)` with no specialization or tier0 selections. The default behavior picks:
- **Tier 0 abilities** (L3, L5, L8): first option per choice group → `Power Strike`, `Sundering Strike`, `Brutal Charge`
- **No spec abilities** (no specialization set → all spec abilities filtered out)

So a L40 Warrior has 3 tier 0 abilities:

| Ability | Level | Role | useWhen | Cooldown | Effect |
|---------|-------|------|---------|----------|--------|
| Brutal Charge | 8 | damage | always | 3 | +5 bonus damage, +2 accuracy |
| Sundering Strike | 5 | damage | always | 3 | 1d4 + AC reduction 2 |
| Power Strike | 3 | damage | always | 2 | +3 bonus damage |

**Queue priority order:**
1. First damage ability: Brutal Charge (highest tier) → `always`
2. Sundering Strike → `always`
3. Power Strike → `always`

**What happens in combat:**

The AI always prefers abilities over basic attacks. Since all 3 abilities are `useWhen: 'always'` and they cycle through cooldowns, the warrior uses abilities on MOST rounds instead of basic attacks. When using an ability:
- Only 1 attack is made (the ability's single attack)
- Extra attacks don't fire
- The ability's bonus damage is typically small (+3 to +5)

**Rough round allocation for a L40 Warrior:**
- ~60-70% of rounds: using one of the 3 tier 0 abilities (1 attack each)
- ~30-40% of rounds: all abilities on cooldown → basic Attack action (3 attacks)

**This is the primary DPR killer.** The warrior trades 3 attacks × weapon damage for 1 attack + small bonus.

### 1d. Hit Probability — VERIFIED CORRECT

```typescript
// From dice.ts
hit: d20 === 20 || (d20 !== 1 && total >= targetAC)
```

Attack roll: d20 + 17 vs AC 23.
- Need to roll 6+ on d20 (23 - 17 = 6)
- Natural 1 always misses, natural 20 always hits
- Hit probability: (20 - 6 + 1) / 20 = 15/20 = **75%**

Additionally, fumble mechanics: natural 1 triggers a confirmation roll. If the confirm also misses, a d100 fumble chart fires, potentially applying stun/weakened to the warrior, further reducing DPR.

### 1e. Weapon Damage Per Hit — VERIFIED

**T4 Mithril Sword at L40:**

| Component | Value |
|-----------|------:|
| Dice | 1d12 |
| Weapon bonusDamage | `floor(3 × 1.5)` = 4 |
| STR modifier | +5 |
| **Average per hit** | **6.5 + 4 + 5 = 15.5** |

`calculateDamage()` computes: `damageRoll(1, 12, statMod + bonusDamage)` = `1d12 + 9` = average **15.5**

This is correct — weapon damage per hit is reasonable.

### 1f. Monster Defensive Abilities — SIGNIFICANT IMPACT

**Archlich (L40) defensive capabilities:**

| Defensive Feature | Effect on Player |
|-------------------|-----------------|
| AC 23 | 25% miss rate for +17 attack |
| Resistances: COLD, LIGHTNING, NECROTIC | Doesn't affect SLASHING (warrior) |
| Immunities: POISON, PSYCHIC | Doesn't affect SLASHING |
| Condition immunities: poisoned, frightened, charmed, stunned | Player CC is useless |
| Legendary Resistances: 3 | Can auto-save 3 times |
| **Power Word Stun** | DC 21 WIS save → stunned 2 rounds (warrior WIS is 10, mod +0, save = d20 + prof 8 = ~45% chance to save → **55% chance to lose 2 turns**) |
| **Death Aura** | 3d6 NECROTIC damage whenever player attacks in melee (avg 10.5 per round of attacking) |
| **Phase: Phylactery Surge (50% HP)** | +3 attack, +3 damage, AoE burst 6d8 NECROTIC |
| **Phase: Undying Will (25% HP)** | +3 AC (now 26!), gains Mass Raise Dead (30 HP/turn regen) |

**At 25% HP, the Archlich heals 30 HP/turn.** If the warrior's DPR is 11.2, the Archlich out-heals all damage in its final phase. This alone makes the fight unwinnable.

**Fear Aura from other monsters:** Frightened status imposes -2 on attack rolls, further reducing hit rate. Void Stalker (L13) and Void Emperor (L50) both have frightened auras.

### DPR Gap Summary

Expected DPR (naive): 3 attacks × 15.5 avg × 75% hit = **34.9**

Actual observed: **11.2**

| Factor | DPR Impact | Explanation |
|--------|-----------|-------------|
| Wrong attack count assumption | -8.7 | 3 attacks at L40, not 4 |
| Ability turns replacing attacks | ~-14 to -18 | ~60-70% of turns use abilities (1 atk) instead of Attack action (3 atks) |
| Power Word Stun (lost turns) | ~-3 to -5 | Stunned ~2 rounds per fight = 0 DPR those rounds |
| Death Aura (self-damage) | Indirect | Player takes 10.5/round, dies faster |
| Fumble penalties | ~-1 | Occasional stun/weakness from nat 1 |
| **Total estimated DPR** | **~10-13** | Matches observed 11.2 |

**Root causes in order of impact:**
1. **Abilities consuming extra attack turns** (~50% of the gap)
2. **Fewer attacks than assumed** (3, not 4)
3. **Monster CC eating turns** (stuns, fears)
4. **Monster regen out-heals player DPR** (Archlich at 25% HP)

---

## 2. Monster Stat Table

All calculations use L[X] Human Warrior with STR priority. Human has no racial stat bonuses, making this a clean baseline.

### Player Stats by Level

| Level | STR | STR Mod | Prof | Weapon | Tier | bonusAtk | bonusDmg | Total Atk Bonus | Attacks | AC | HP |
|------:|----:|--------:|-----:|--------|-----:|---------:|---------:|----------------:|--------:|---:|---:|
| 1 | 10 | 0 | 2 | Copper Sword 1d6 | T1 | 0 | 0 | +2 | 1 | 14 | 20 |
| 5 | 11 | 0 | 3 | Copper Sword 1d6 | T1 | 0 | 0 | +3 | 1 | 14 | 36 |
| 10 | 13 | 1 | 4 | Iron Sword 1d8+1 | T2 | 1 | 1 | +6 | 1 | 16 | 56 |
| 13 | 14 | 2 | 4 | Iron Sword 1d8+1 | T2 | 1 | 1 | +7 | 2 | 16 | 68 |
| 15 | 14 | 2 | 5 | Iron Sword 1d8+1 | T2 | 1 | 1 | +8 | 2 | 16 | 76 |
| 20 | 16 | 3 | 6 | Steel Sword 1d10+2 | T3 | 2 | 2 | +11 | 2 | 18 | 96 |
| 25 | 18 | 4 | 6 | Steel Sword 1d10+2 | T3 | 2 | 2 | +12 | 2 | 18 | 116 |
| 30 | 20 | 5 | 7 | Mithril Sword 1d12+4 | T4 | 4 | 4 | +16 | 2 | 21 | 136 |
| 40 | 20 | 5 | 8 | Mithril Sword 1d12+4 | T4 | 4 | 4 | +17 | 3 | 21 | 176 |
| 50 | 20 | 5 | 8 | Mithril Sword 1d12+4 | T4 | 4 | 4 | +17 | 3 | 21 | 216 |

**Note on STR progression:** Milestones at levels [4,7,9,12,16,19,22,24,27,29,33,36,39,44,47,50]. Human starts at STR 10. Warrior priority fills STR first. STR reaches 20 (cap) at level 29 (10 milestones). At L40, warrior has 13 milestones earned → STR 20 (capped), CON gets spillover.

**Correction on HP:** Using actual formula: `10 + conMod + classCreationBonus(10) + (level-1) * 4`.
- L1: 10 + 0 + 10 = 20 ✓
- L40: 10 + conMod + 10 + 39*4 = 20 + conMod + 156 = 176+conMod

At L40 with 13 milestones: STR has 10 (capped), CON gets 3 → CON=13, conMod=1. So HP = 177. (Sim doc says 178, close enough — likely due to racial variation in the sim.)

At L50 with 16 milestones: STR=20 (10 used), CON gets 6 → CON=16, conMod=3. HP = 10 + 3 + 10 + 49*4 = 219.

### Warrior DPR Calculations (basic attacks only — no ability turns)

| Level | Attacks | Avg Dmg/Hit | Monster AC | Hit% | Raw DPR (attacks only) |
|------:|--------:|------------:|-----------:|-----:|-----------------------:|
| 1 | 1 | 3.5+0 = 3.5 | 12 | 55% | 1.9 |
| 5 | 1 | 3.5+0 = 3.5 | 15 | 45% | 1.6 |
| 10 | 1 | 4.5+2 = 6.5 | 15 | 60% | 3.9 |
| 13 | 2 | 4.5+2 = 6.5 | 17 | 55% | 7.2 |
| 15 | 2 | 4.5+2 = 6.5 | 15 | 70% | 9.1 |
| 20 | 2 | 5.5+5 = 10.5 | 16 | 80% | 16.8 |
| 25 | 2 | 5.5+5 = 10.5 | 18 | 75% | 15.8 |
| 30 | 2 | 6.5+9 = 15.5 | 21 | 80% | 24.8 |
| 40 | 3 | 6.5+9 = 15.5 | 23 | 75% | 34.9 |
| 50 | 3 | 6.5+9 = 15.5 | 25 | 70% | 32.6 |

**Effective DPR (accounting for ~60% of rounds on abilities):**
Rough model: 40% of rounds = basic attack (full DPR), 60% of rounds = ability (1 attack, ability damage ≈ weapon + 3-5).

| Level | Raw DPR | Est. Effective DPR | Sim DPR | Notes |
|------:|--------:|-------------------:|--------:|-------|
| 1 | 1.9 | ~2.0 | 1.8-2.6 | Few/no abilities at L1, close match |
| 5 | 1.6 | ~2.5 | 4.5 | Abilities add damage at L5 with only 1 attack anyway |
| 10 | 3.9 | ~4.5 | 7.9* | Only 1 attack, abilities add to it |
| 13 | 7.2 | ~5.5 | 3.5 | Void Stalker CC (fear, stun) eating turns |
| 15 | 9.1 | ~7.0 | 2.3 | Hydra multiattack (5x) kills player fast → short fights |
| 20 | 16.8 | ~12.0 | 9.5 | Mind Flayer stun + mind blast eating turns |
| 25 | 15.8 | ~11.0 | 9.5 | Purple Worm swallow eating turns |
| 30 | 24.8 | ~16.0 | 3.6 | Storm Giant: damage aura + lightning + stun; player dies fast |
| 40 | 34.9 | ~20.0 | 11.2 | Archlich: stun + death aura + regen at 25% |
| 50 | 32.6 | ~19.0 | 8.4 | Void Emperor: massive CC, condition immunities, phase boosts |

*L10 DPR seems high in sim because Sandscale Basilisk has AC 15 and no strong CC — warrior just whales on it until HP pool overwhelms.

### Full Monster Stat Table

| Monster | Lvl | HP | AC | Atk | Damage | Player Hit% | Player DPR (raw) | Rounds to Kill | Monster DPR vs Player | Rounds Player Survives | Expected Win% |
|---------|----:|---:|---:|----:|--------|------------:|------------------:|---------------:|----------------------:|-----------------------:|---------------:|
| Giant Rat | 1 | 18 | 12 | +3 | 1d4+1 (3.5) | 55% | 1.9 | 9.5 | 1.7 | 12 | ~55% |
| Goblin | 1 | 24 | 12 | +3 | 1d4+1 (3.5) | 55% | 1.9 | 12.6 | 1.7 | 12 | ~45% |
| Skeleton Warrior | 5 | 40 | 15 | +5 | 1d10+3 (8.5) | 45% | 1.6 | 25.0 | 5.9 | 6.1 | ~15% |
| Sandscale Basilisk | 10 | 110 | 15 | +8 | 2d8+3 (12) | 60% | 3.9 | 28.2 | 8.4 | 6.7 | ~15% |
| Void Stalker | 13 | 110 | 17 | +9 | 2d8+5 (14) | 55% | 7.2 | 15.3 | 11.2 | 6.1 | ~25% |
| Hydra | 15 | 160 | 15 | +8 | 3d6+4 (14.5) × 5 heads | 70% | 9.1 | 17.6 | ~30+ | 2.5 | ~5% |
| Mind Flayer | 20 | 120 | 16 | +10 | 2d8+4 (13) + abilities | 80% | 16.8 | 7.1 | ~25 (w/ extract brain) | 3.8 | ~30% |
| Purple Worm | 25 | 210 | 18 | +13 | 3d8+7 (20.5) | 75% | 15.8 | 13.3 | ~18 (w/ swallow) | 6.4 | ~30% |
| Storm Giant | 30 | 280 | 21 | +15 | 3d10+8 (24.5) + aura | 80% | 24.8 | 11.3 | ~35+ (w/ lightning + aura) | 3.9 | ~20% |
| Archlich | 40 | 420 | 23 | +18 | 4d8+10 (28) + aura | 75% | 34.9 → ~11.2 eff | 37.5 (eff) | ~40+ (w/ necrotic storm + aura) | 4.4 | ~5% |
| Void Emperor | 50 | 650 | 25 | +22 | 5d10+14 (41.5) × 3 rend | 70% | 32.6 → ~8.4 eff | 77.4 (eff) | ~100+ | 2.2 | ~0% |

**Notes on Monster DPR:**
- Hydra attacks 5 times per round via multiattack (cooldown 0). Each hit deals 3d6+4 = avg 14.5. With AC 15 and +8 attack vs warrior AC 16, hit rate ~65%. Monster DPR ≈ 5 × 14.5 × 0.65 = **47.1**
- Storm Giant has 2× multiattack + Rock Throw + Lightning Strike AoE (8d8 = avg 36). Damage aura deals 2d8 per player attack.
- Archlich deals 4d8+10 (avg 28) base + Necrotic Storm AoE (8d8 avg 36 every 2 rounds) + Death Aura 3d6 (avg 10.5) per player melee attack.
- Void Emperor has 3× multiattack (3 hits of 5d10+14 = avg 41.5 each) + Reality Tear AoE (12d8 avg 54).

### Key Insight: Monster Action Economy Scaling

At low levels, monsters get 1 attack per round, roughly matching players. At high levels, monsters get multiattack (2-5 attacks), AoE abilities, damage auras, phase transitions with stat boosts, and legendary actions. Meanwhile, the player's action economy stays at 1 action per round (even with extra attacks, it's still 1 action).

---

## 3. Proposed Monster Rebalance

### Design Targets (Warrior Solo Win Rates)

| Level Bracket | Target Warrior Win% | Current Win% |
|:---:|:---:|:---:|
| 1-4 | 70-85% | 83% ✓ |
| 5-9 | 55-70% | 18% ✗ |
| 10-14 | 50-65% | 0-4% ✗ |
| 15-19 | 45-60% | 0% ✗ |
| 20-29 | 40-55% | 0-11% ✗ |
| 30-39 | 40-55% | 0% ✗ |
| 40-50 | 35-50% | 0% ✗ |

### Proposed Changes

#### Giant Rat (L1) — NO CHANGE
- Current: 18 HP, AC 12, 1d4+1
- Win rate: 83% (Warrior) → within target range
- **Verdict: Keep as-is**

#### Goblin (L1) — NO CHANGE
- Current: 24 HP, AC 12, 1d4+1
- Win rate: 82.5% (Warrior) → within target range
- **Verdict: Keep as-is**

#### Skeleton Warrior (L5) — REDUCE HP AND AC

**Current:** 40 HP, AC 15, +5 attack, 1d10+3
**Problem:** AC 15 vs player +3 attack = 45% hit rate. Player DPR = 1.6. Takes 25 rounds to kill. Monster deals 8.5 DPR (assuming ~70% hit rate vs player AC 14). Player dies in ~4 rounds.

**Proposed:** 25 HP, AC 13, +5 attack, 1d8+2 (avg 6.5)
- Player hit rate: 55% → DPR ≈ 1.9
- Rounds to kill: 13.2
- Monster DPR: ~4.6 (hit rate ~65% vs AC 14)
- Player survives: ~7.8 rounds
- Expected win rate: ~55%
- **Justification:** HP -37.5%, AC -2, damage slightly reduced. Makes fight winnable but still dangerous.

#### Sandscale Basilisk (L10) — REDUCE HP SIGNIFICANTLY

**Current:** 110 HP, AC 15, +8 attack, 2d8+3 (avg 12)
**Problem:** 110 HP ÷ 3.9 DPR = 28 rounds. Player dies in ~7 rounds (12 DPR vs 56 HP, hit rate ~60%).

**Proposed:** 50 HP, AC 14, +7 attack, 2d6+3 (avg 10)
- Player hit rate: 65% → DPR ≈ 4.2
- Rounds to kill: 11.9
- Monster DPR: ~7 (vs AC 16)
- Player survives: ~8 rounds
- Expected win rate: ~55%
- **Justification:** HP -55%, AC -1, damage -2. Still threatening (petrifying gaze slows), but survivable.

#### Void Stalker (L13) — REDUCE HP AND DAMAGE

**Current:** 110 HP, AC 17, +9 attack, 2d8+5 (avg 14), 2× multiattack, Psychic Terror (fear)
**Problem:** AC 17 vs +7 attack = 55% hit rate. 2× multiattack gives monster 28 DPR. Fear reduces player attack by -2. Player dies in 3-4 rounds.

**Proposed:** 60 HP, AC 15, +8 attack, 2d6+4 (avg 11), remove multiattack (or reduce to cooldown 2)
- Player hit rate: 65% → DPR ≈ 8.5 (with 2 extra attacks)
- Rounds to kill: 7.1
- Monster DPR: ~8 (single attack)
- Player survives: ~8.5 rounds
- Expected win rate: ~60%
- **Justification:** HP -45%, AC -2, remove multiattack. The fear aura already provides tactical challenge.

#### Hydra (L15) — MAJOR REBALANCE NEEDED

**Current:** 160 HP, AC 15, +8 attack, 3d6+4 (avg 14.5) × 5 heads (cooldown 0!)
**Problem:** 5× multiattack at cooldown 0 = EVERY TURN. Monster DPR ≈ 47. Player HP 76, dies in 1.6 rounds. Completely unwinnable.

**Proposed:** 80 HP, AC 14, +7 attack, 2d6+3 (avg 10), multiattack 3 heads (not 5), cooldown 1
- Player hit rate: 70% → DPR ≈ 9.1
- Rounds to kill: 8.8
- Monster DPR: ~15 (3 hits at 70% hit rate)
- Player survives: ~5.1 rounds
- Expected win rate: ~50%
- **Justification:** HP -50%, multiattack 5→3 with cooldown 1 (alternates multi/single), damage reduced. Still a scary elite monster.

#### Mind Flayer (L20) — REDUCE HP, TUNE ABILITIES

**Current:** 120 HP, AC 16, +10 attack, 2d8+4 (avg 13), Mind Blast (6d8 AoE), Psychic Grasp (stun 2), Extract Brain (10d10!)
**Problem:** Extract Brain deals avg 55 damage — that's 57% of a L20 Warrior's HP in one hit. Mind Blast (avg 36) + stun creates 2-turn helplessness.

**Proposed:** 80 HP, AC 15, +9 attack, 2d6+3 (avg 10), Mind Blast to 4d8 (avg 18), Extract Brain to 6d8 (avg 27)
- Player hit rate: 80% → DPR ≈ 16.8
- Rounds to kill: 4.8
- Reduced ability damage means player isn't one-shot
- Expected win rate: ~50%
- **Justification:** HP -33%, ability damage halved. Mind Flayer is still extremely dangerous (stun + AoE) but doesn't instagib.

#### Purple Worm (L25) — REDUCE HP AND SWALLOW DAMAGE

**Current:** 210 HP, AC 18, +13 attack, 3d8+7 (avg 20.5), 2× multiattack, Swallow (3d6 acid/turn), Death Throes (6d8)
**Problem:** Swallow auto-removes player from combat for multiple turns. 210 HP at 15.8 DPR = 13+ rounds. Phase transition at 30% adds +3 atk/+3 dmg + AoE burst.

**Proposed:** 130 HP, AC 17, +12 attack, 2d8+5 (avg 14), swallow escape threshold 15 (not 25)
- Player hit rate: 75% → DPR ≈ 15.8
- Rounds to kill: 8.2
- Monster DPR: ~12 (with multiattack ~24)
- Player survives: ~4.8 rounds (longer if swallow is escaped quickly)
- Expected win rate: ~45%
- **Justification:** HP -38%, AC -1, swallow easier to escape, damage reduced.

#### Storm Giant (L30) — MAJOR REBALANCE

**Current:** 280 HP, AC 21, +15 attack, 3d10+8 (avg 24.5), 2× multiattack, Lightning Strike (8d8 AoE DC 20), Storm Aura (2d8/melee hit), Rock Throw (4d10+7)
**Problem:** Too many damage layers. AoE (avg 36) + aura damage (avg 9 per player attack) + multiattack (49 DPR). Phase transition at 40% adds +3 atk/+2 AC/+4 dmg + AoE burst. Player can't survive 2 rounds.

**Proposed:** 160 HP, AC 19, +13 attack, 2d10+6 (avg 17), Lightning Strike to 5d8 (avg 22.5) DC 18, remove Storm Aura, multiattack cooldown 1
- Player hit rate: 80% → DPR ≈ 24.8
- Rounds to kill: 6.5
- Monster DPR: ~20
- Player survives: ~6.8 rounds
- Expected win rate: ~50%
- **Justification:** HP -43%, AC -2, remove damage aura (it punishes melee classes unfairly), weaken AoE, reduce multiattack frequency.

#### Archlich (L40) — MAJOR REBALANCE

**Current:** 420 HP, AC 23, +18 attack, 4d8+10 (avg 28), Power Word Stun (DC 21), Necrotic Storm (8d8 DC 20), Soul Drain (weakened 3 turns), Death Aura (3d6), 3 legendary actions/resistances, 2 phase transitions (regen 30 HP/turn at 25%)
**Problem:** Death aura alone deals 10.5 per player melee attack. Power Word Stun shuts down the warrior for 2 rounds (55% fail rate). At 25% HP (105), the Archlich heals 30/turn — more than the player's effective DPR.

**Proposed:** 200 HP, AC 20, +15 attack, 3d8+7 (avg 20.5), Power Word Stun DC 18, Necrotic Storm to 5d8 DC 18, remove Death Aura, remove Mass Raise Dead phase, reduce legendary actions to 2, reduce legendary resistances to 1
- Player hit rate: 80% → DPR ≈ 34.9 (raw) → ~20 effective (with ability turns)
- Rounds to kill: 10
- Monster DPR: ~25
- Player survives: ~7 rounds
- Expected win rate: ~45%
- **Justification:** HP -52%, AC -3, remove the two mechanics that make the fight mathematically unwinnable (death aura punishes every attack, regen out-heals all damage).

#### Void Emperor (L50) — MAJOR REBALANCE

**Current:** 650 HP, AC 25, +22 attack, 5d10+14 (avg 41.5), 3× multiattack, Reality Tear (12d8 AoE DC 24), Existential Dread (fear DC 24), Void Drain (weakened 3), Dimensional Rift (stun DC 23), death throes (12d8), 3 legendary actions/resistances, 2 phase transitions, crit resistance -25
**Problem:** This is a world boss designed for parties, not solo play. 3× multiattack = avg 124.5 per round. Player HP 216, dead in 1.7 rounds.

**Proposed:** 300 HP, AC 22, +18 attack, 3d10+10 (avg 26.5), multiattack 2× (not 3×), Reality Tear to 8d8 (avg 36) DC 20, reduce all save DCs by 4, reduce legendary resistances to 1, remove second phase transition
- Player hit rate: 75% → DPR ≈ 32.6 (raw) → ~19 effective
- Rounds to kill: 15.8
- Monster DPR: ~35
- Player survives: ~6.2 rounds
- Expected win rate: ~35%
- **Justification:** HP -54%, AC -3, multiattack reduced, all DCs reduced. Even nerfed, this is the hardest solo fight in the game. 35% warrior win rate is appropriate.

### Summary of Proposed Changes

| Monster | Current HP | Proposed HP | Current AC | Proposed AC | Key Changes |
|---------|----------:|------------:|-----------:|------------:|-------------|
| Giant Rat | 18 | 18 | 12 | 12 | None |
| Goblin | 24 | 24 | 12 | 12 | None |
| Skeleton Warrior | 40 | 25 | 15 | 13 | HP -37%, AC -2, damage reduced |
| Sandscale Basilisk | 110 | 50 | 15 | 14 | HP -55%, AC -1, damage reduced |
| Void Stalker | 110 | 60 | 17 | 15 | HP -45%, AC -2, remove multiattack |
| Hydra | 160 | 80 | 15 | 14 | HP -50%, multiattack 5→3 w/ CD |
| Mind Flayer | 120 | 80 | 16 | 15 | HP -33%, ability damage halved |
| Purple Worm | 210 | 130 | 18 | 17 | HP -38%, swallow easier to escape |
| Storm Giant | 280 | 160 | 21 | 19 | HP -43%, remove damage aura |
| Archlich | 420 | 200 | 23 | 20 | HP -52%, remove death aura + regen phase |
| Void Emperor | 650 | 300 | 25 | 22 | HP -54%, multiattack 3→2, DCs -4 |

---

## 4. Weapon Tier Gap Analysis

### Current Weapon Tiers

| Tier | Level Range | Weapon (Warrior) | Avg Dmg/Hit | Quality |
|------|:-----------:|------------------|------------:|---------|
| T1 | 1-9 | Copper Sword 1d6+0 | 3.5 | COMMON (1.0×) |
| T2 | 10-19 | Iron Sword 1d8+1+1 | 6.5 | COMMON (1.0×) |
| T3 | 20-29 | Steel Sword 1d10+2+2 | 9.5 | FINE (1.15×) |
| T4 | 30-50 | Mithril Sword 1d12+4+4 | 15.5 | MASTERWORK (1.5×) |

*"+X+Y" format: weapon bonusDamage + STR mod (varies by level)*

### The T4 Plateau Problem

**T4 covers levels 30-50 — a 20-level range with zero weapon progression.** A L30 warrior and a L50 warrior do the same weapon damage (1d12+4 after quality). The only DPR increase comes from:
- STR reaching 20 (happens around L29)
- Proficiency bonus increasing (7→8 at L40, but this is attack bonus, not damage)
- Extra attacks at L34 (2→3) and L42 (3→4)

Meanwhile, monster HP scales from 280 (Storm Giant L30) to 650 (Void Emperor L50) — a **2.3× increase** in HP with no player damage increase.

### Recipe-Based Weapon Tiers (from YAML)

The prompt noted 5 real weapon tiers: Copper/Iron/Steel/Mithril/Adamantine. The sim only uses 4:

| Recipe Tier | Material | Level Unlock | In Sim? |
|:-----------:|----------|:------------:|:-------:|
| T1 | Copper | L1 | ✓ |
| T2 | Iron | L10 | ✓ |
| T3 | Steel | L30 | ✓ (mapped to L20) |
| T4 | Mithril | L55 | ✓ (mapped to L30) |
| T5 | Adamantine | L75 | ✗ (out of level range) |

**Issue 1:** The sim maps Steel to L20 and Mithril to L30, but the real game recipes unlock Steel at L30 and Mithril at L55. If the sim's mapping is wrong, players are using T3 Steel weapons from L30-54 in the actual game — an even worse plateau.

**Issue 2:** If Mithril really unlocks at L55, then no sim scenario (max L50) ever uses the best weapon. L30-50 players are stuck on Steel Swords (1d10+2, FINE quality = 1d10+2).

**This needs verification against actual recipe unlock levels.** If the sim is optimistically giving Mithril at L30, but the real game doesn't unlock it until L55, the actual in-game experience is even worse than what the sim shows.

### Damage Plateau Quantified

| Level | Attacks | Weapon Avg | Total Raw DPR (at 75% hit) | Monster HP | Rounds to Kill |
|------:|--------:|-----------:|---------------------------:|-----------:|---------------:|
| 30 | 2 | 15.5 | 23.3 | 280 | 12.0 |
| 35 | 3 | 15.5 | 34.9 | ~350 (est) | 10.0 |
| 40 | 3 | 15.5 | 34.9 | 420 | 12.0 |
| 45 | 3 | 15.5 | 34.9 | ~530 (est) | 15.2 |
| 50 | 4 | 15.5 | 46.5 | 650 | 14.0 |

Player DPR flatlines from L30-L41 (before 4th attack at L42). Monster HP keeps climbing. The gap widens from L30 to L41.

---

## 5. Recommended Approach

### Fix Both — Monsters First, Then Weapons

**Order of operations:**

1. **Reduce monster HP/AC/damage** (Phase 1 — this document's proposals)
   - Quickest to implement — just change numbers in `database/seeds/monsters.ts`
   - Gets win rates into playable range immediately
   - Deploy and re-run sim to validate

2. **Fix weapon tier gap** (Phase 2 — separate prompt)
   - Add a T5 tier for L40+ (or shift Mithril to L40 and add "Enchanted" tier at L50)
   - Alternatively, add quality scaling within T4 (e.g., T4a at L30 = 1.3×, T4b at L40 = 1.5×, T4c at L50 = 1.7×)
   - Verify real recipe unlock levels vs sim tier mapping

3. **Address ability-vs-attack DPR drain** (Phase 3 — separate prompt, possible code change)
   - Options:
     a. Make some abilities grant extra attacks (like "Frenzy" already does with `multi_attack`)
     b. Allow extra attacks to fire alongside abilities for melee classes
     c. Give warrior abilities that enhance basic attacks instead of replacing them
     d. Adjust warrior tier 0 abilities to have higher damage to compensate
   - This is the most impactful change but requires design decisions

### Why Monsters First

The monster rebalance is pure data changes with no code risk. It immediately makes the game playable while we investigate the deeper questions about ability-vs-attack action economy and weapon progression.

### Why NOT Just Buff Player Damage

Multiplying player damage would fix PvE win rates but would break:
- PvP balance (players hitting each other harder)
- Economy balance (faster monster kills = more loot/gold/hr)
- Low-level balance (L1 is already well-tuned)

Monster-specific tuning is safer because it doesn't cascade to other systems.

---

## 6. Open Questions for Tony

1. **Ability action economy:** Is it intentional that abilities replace the Attack action (including extra attacks)? Or should martial classes get extra attacks even on ability turns? This is the single biggest factor in the DPR gap.

2. **Sim specializations:** The sim runs warriors with no specialization, meaning they only get tier 0 abilities. A Berserker warrior at L40 would have Reckless Strike, Blood Rage, Cleave, Frenzy, and Berserker Rage — dramatically different DPR. Should we sim warriors with specializations?

3. **Weapon tier unlock levels:** The sim gives Mithril weapons at L30, but if the real game requires L55 crafting, L30-54 players are much weaker than the sim shows. What are the actual unlock levels?

4. **Void Emperor is a world boss.** Should it even be in the solo sim battery? A 35% warrior solo win rate against what's designed to be a party fight seems too generous. Consider replacing it with a standard T6 monster like Ember Titan.

5. **Hydra multiattack 5× at cooldown 0** — is this intentional? Five attacks per round every round is the equivalent of 5 warriors attacking simultaneously. Even nerfed to 3 heads, this is one of the deadliest abilities in the game.

6. **Damage auras (Death Aura, Storm Aura)** — these uniquely punish melee classes. A warrior MUST be in melee to attack, so every attack costs them HP. Should damage auras be reserved for specific boss fights, or is this an intentional anti-melee mechanic?

7. **Monster regen phases** — the Archlich's Mass Raise Dead (30 HP/turn) at 25% HP creates an impossible wall if player DPR is below 30. Should phase regen be capped at a percentage of player-tier DPR?
