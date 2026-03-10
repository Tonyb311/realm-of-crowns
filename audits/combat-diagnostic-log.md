# Combat Diagnostic — Raw Combat Log

Generated: 2026-03-10
Script: `server/src/scripts/combat-diagnostic-log.ts`

---

## Part A: parseDamageString Bug Verification

| Input | Sim Parser | Correct Parser | Match? |
|-------|-----------|---------------|--------|
| `1d4+1` | 1d4+1 | 1d4+1 | MATCH |
| `1d4-1` | 1d6+0 | 1d4-1 | **MISMATCH** |
| `1d8-2` | 1d6+0 | 1d8-2 | **MISMATCH** |
| `1d6` | 1d6+0 | 1d6+0 | MATCH |
| `2d8-3` | 1d6+0 | 2d8-3 | **MISMATCH** |
| `3d10-3` | 1d6+0 | 3d10-3 | **MISMATCH** |
| `1d6-3` | 1d6+0 | 1d6-3 | **MISMATCH** |
| `2d10-5` | 1d6+0 | 2d10-5 | **MISMATCH** |

Sim parser regex: `/^(\d+)d(\d+)(?:\+(\d+))?$/` — positive only.
Correct parser regex: `/^(\d+)d(\d+)(?:([+-]\d+))?$/` — handles both signs.

Any negative bonus string fails the sim regex and falls back to `{1d6+0}`.

---

## Part B: Monsters with Negative Damage Bonuses

**Total affected: 126 monsters** out of ~160 total.

Sample (first 10 by level):

| Monster | Level | Damage | Atk | Stat (Val/Mod) | Sim Parses As |
|---------|-------|--------|-----|----------------|--------------|
| Cinder Wisp | 1 | `1d4-1` | 1 | STR 4 / -3 | 1d6+0 |
| Dust Sprite | 1 | `1d4-1` | 1 | STR 4 / -3 | 1d6+0 |
| Frost Sprite | 1 | `1d4-1` | 1 | STR 4 / -3 | 1d6+0 |
| Giant Rat | 1 | `1d4-1` | 1 | STR 6 / -2 | 1d6+0 |
| Goblin | 1 | `1d4-1` | 1 | STR 8 / -1 | 1d6+0 |
| Marsh Rat | 1 | `1d4-1` | 0 | STR 6 / -2 | 1d6+0 |
| Sea Spray | 1 | `1d4-1` | 1 | STR 4 / -3 | 1d6+0 |
| Timber Wolf Pup | 1 | `1d4-1` | 1 | STR 10 / +0 | 1d6+0 |
| Goblin Archer | 2 | `1d6-2` | 2 | STR 8 / -1 | 1d6+0 |
| Pixie Trickster | 2 | `1d6-3` | 1 | STR 3 / -4 | 1d6+0 |

---

## Part C: Hydra Attack Modifier Analysis

```
Hydra (L15):
  attackStat: str, STR: 20 (mod +5)
  Current DB: attack=3, damage="1d8-2"
  Reconstructed old: attack=8, damage bonus=3
  Abilities: [hydra_multiattack: "Multiple Heads", type: multiattack, attacks: 3, cooldown: 1]
```

### resolveAttack() path (basic attacks)
| Component | Old Value | New Value |
|-----------|-----------|-----------|
| statMod | 0 (hack) | 5 (STR 20) |
| proficiencyBonus | 0 | 0 |
| bonusAttack | 8 | 3 |
| **Total atkMod** | **8** | **8** |
| **Match** | **YES** | |

### monster-ability-resolver path (multiattack)
| Component | Old Value | New Value |
|-----------|-----------|-----------|
| statMod | 5 (NOT zeroed) | 5 |
| proficiencyBonus | 0 | 0 |
| bonusAttack | 8 (included stat_mod) | 3 (base only) |
| **Total atkMod** | **13** | **8** |
| **SHIFT** | **-5 (= stat mod)** | |

### calculateDamage() path (basic attacks)
| Component | Old Value | New Value |
|-----------|-----------|-----------|
| statMod | 0 (hack) | 5 |
| bonusDamage | 3 (included stat_mod) | -2 (base only) |
| **Total modifier** | **3** | **3** |
| **Match** | **YES** | |

### Multiattack damage path
| Component | Old Value | New Value |
|-----------|-----------|-----------|
| statMod | 5 (NOT zeroed) | 5 |
| bonusDamage | 3 (included stat_mod) | -2 (base only) |
| **Total modifier** | **8** | **3** |
| **SHIFT** | **-5 (= stat mod)** | |

---

## Part D: 10 Fights — L15 Warrior vs Hydra

### Combatant Stats
```
Player: L15 Human Warrior
  HP: 76, AC: 16
  Weapon: Iron Sword (1d8+1 bonusDamage, 0 bonusAttack)
  STR: 16 (+3), Proficiency: +5
  Attack mod: 3 + 5 + 0 = +8
  Damage mod: 3 + 1 = +4 → 1d8+4 range [5, 12]

Hydra: L15 Monster
  HP: 44, AC: 15
  Weapon: Natural Attack (1d8-2 bonusDamage, 3 bonusAttack)
  STR: 20 (+5), Proficiency: 0
  Multiattack: 3 strikes/round
  Attack mod (per strike): 5 + 0 + 3 = +8 → need d20 >= 8 vs AC 16 (65% hit rate)
  Damage mod (per strike): 5 + (-2) = +3 → 1d8+3 range [4, 11]
```

### Fight 1 — PLAYER LOSS (6 rounds)

| Rnd | Actor | Action | d20 | Total | AC | Result | Dmg | Target HP |
|-----|-------|--------|-----|-------|-----|--------|-----|-----------|
| 1 | Player | ATK | 1 | 9 | 15 | MISS | 0 | 44/44 Hydra |
| 1 | Hydra | Strike 1 | 10 | 18 | 16 | HIT | 11 | — |
| 1 | Hydra | Strike 2 | 19 | 27 | 16 | HIT | 7 | — |
| 1 | Hydra | Strike 3 | 14 | 22 | 16 | HIT | 8 | 50/76 Player |
| 2 | Player | ATK | 11 | 19 | 15 | HIT | 7 | 37/44 Hydra |
| 2 | Hydra | Strike 1 | 1 | 9 | 16 | MISS | 0 | — |
| 2 | Hydra | Strike 2 | 3 | 11 | 16 | MISS | 0 | — |
| 2 | Hydra | Strike 3 | 5 | 13 | 16 | MISS | 0 | 50/76 Player |
| 3 | Player | ATK | 19 | 27 | 15 | HIT | 7 | 30/44 Hydra |
| 3 | Hydra | Strike 1 | 9 | 17 | 16 | HIT | 10 | — |
| 3 | Hydra | Strike 2 | 15 | 23 | 16 | HIT | 6 | — |
| 3 | Hydra | Strike 3 | 17 | 25 | 16 | HIT | 10 | 24/76 Player |
| 4 | Player | ATK | 9 | 17 | 15 | HIT | 7 | 23/44 Hydra |
| 4 | Hydra | Strike 1 | 3 | 11 | 16 | MISS | 0 | — |
| 4 | Hydra | Strike 2 | 2 | 10 | 16 | MISS | 0 | — |
| 4 | Hydra | Strike 3 | 18 | 26 | 16 | HIT | 4 | 20/76 Player |
| 5 | Player | ATK | 6 | 14 | 15 | MISS | 0 | 23/44 Hydra |
| 5 | Hydra | Strike 1 | 9 | 17 | 16 | HIT | 11 | — |
| 5 | Hydra | Strike 2 | 10 | 18 | 16 | HIT | 5 | — |
| 5 | Hydra | Strike 3 | 6 | 14 | 16 | MISS | 0 | 4/76 Player |
| 6 | Player | ATK | 1 | 9 | 15 | MISS | 0 | 23/44 Hydra |
| 6 | Hydra | Strike 1 | 20 | 28 | 16 | HIT CRIT | 4 | 0/76 Player |

### Fight 2 — PLAYER WIN (3 rounds)

| Rnd | Actor | Action | d20 | Total | AC | Result | Dmg | Target HP |
|-----|-------|--------|-----|-------|-----|--------|-----|-----------|
| 1 | Hydra | Strike 1 | 11 | 19 | 16 | HIT | 7 | — |
| 1 | Hydra | Strike 2 | 5 | 13 | 16 | MISS | 0 | — |
| 1 | Hydra | Strike 3 | 8 | 16 | 16 | HIT | 7 | 62/76 Player |
| 1 | Player | ATK | 7 | 15 | 15 | HIT | 8 | 36/44 Hydra |
| 2 | Hydra | Strike 1 | 14 | 22 | 16 | HIT | 6 | — |
| 2 | Hydra | Strike 2 | 6 | 14 | 16 | MISS | 0 | — |
| 2 | Hydra | Strike 3 | 10 | 18 | 16 | HIT | 10 | 46/76 Player |
| 2 | Player | ATK | 20 | 28 | 15 | HIT CRIT | 26 | 10/44 Hydra |
| 3 | Hydra | Strike 1 | 16 | 24 | 16 | HIT | 6 | — |
| 3 | Hydra | Strike 2 | 4 | 12 | 16 | MISS | 0 | — |
| 3 | Hydra | Strike 3 | 12 | 20 | 16 | HIT | 5 | 35/76 Player |
| 3 | Player | ATK | 16 | 24 | 15 | HIT | 10 | 0/44 Hydra |

### Fight 3 — PLAYER LOSS (5 rounds)

| Rnd | Actor | Action | d20 | Total | AC | Result | Dmg | Target HP |
|-----|-------|--------|-----|-------|-----|--------|-----|-----------|
| 1 | Player | ATK | 15 | 23 | 15 | HIT | 11 | 33/44 Hydra |
| 1 | Hydra | Strike 1 | 15 | 23 | 16 | HIT | 8 | — |
| 1 | Hydra | Strike 2 | 19 | 27 | 16 | HIT | 9 | — |
| 1 | Hydra | Strike 3 | 1 | 9 | 16 | MISS | 0 | 59/76 Player |
| 2 | Player | ATK | 14 | 22 | 15 | HIT | 4 | 29/44 Hydra |
| 2 | Hydra | Strike 1 | 12 | 20 | 16 | HIT | 10 | — |
| 2 | Hydra | Strike 2 | 11 | 19 | 16 | HIT | 5 | — |
| 2 | Hydra | Strike 3 | 1 | 9 | 16 | MISS | 0 | 44/76 Player |
| 3 | Player | ATK | 5 | 13 | 15 | MISS | 0 | 29/44 Hydra |
| 3 | Hydra | Strike 1 | 4 | 12 | 16 | MISS | 0 | — |
| 3 | Hydra | Strike 2 | 18 | 26 | 16 | HIT | 11 | — |
| 3 | Hydra | Strike 3 | 2 | 10 | 16 | MISS | 0 | 33/76 Player |
| 4 | Player | ATK | 14 | 22 | 15 | HIT | 11 | 18/44 Hydra |
| 4 | Hydra | Strike 1 | 20 | 28 | 16 | HIT CRIT | 11 | — |
| 4 | Hydra | Strike 2 | 17 | 25 | 16 | HIT | 6 | — |
| 4 | Hydra | Strike 3 | 9 | 17 | 16 | HIT | 11 | 5/76 Player |
| 5 | Player | ATK | 15 | 23 | 15 | HIT | 4 | 14/44 Hydra |
| 5 | Hydra | Strike 1 | 1 | 9 | 16 | MISS | 0 | — |
| 5 | Hydra | Strike 2 | 3 | 11 | 16 | MISS | 0 | — |
| 5 | Hydra | Strike 3 | 16 | 24 | 16 | HIT | 6 | 0/76 Player |

### Fights 4-10 — Summary

| Fight | Rounds | Result | Player HP | Hydra HP |
|-------|--------|--------|-----------|----------|
| 4 | 5 | LOSS | 0/76 | 25/44 |
| 5 | 6 | LOSS | 0/76 | 17/44 |
| 6 | 7 | LOSS | 0/76 | 21/44 |
| 7 | 5 | LOSS | 0/76 | 21/44 |
| 8 | 7 | LOSS | 0/76 | 23/44 |
| 9 | 5 | LOSS | 0/76 | 19/44 |
| 10 | 6 | LOSS | 0/76 | 8/44 |

### Aggregate Stats

| Metric | Value | Expected |
|--------|-------|----------|
| Player wins | 1/10 (10%) | — |
| Total attacks logged | 205 | — |
| Nat 20s (crits) | 9 (4.4%) | ~5% |
| Nat 1s (fumbles confirmed) | 2 (1.0%) | ~2.5% |
| Avg fight length | 5.5 rounds | — |
| Hydra avg damage/round | ~14.1 | — |
| Player avg damage/round | ~5.8 | — |

---

## Old vs New Comparison (Fights 1-3)

Using the SAME d20 rolls from the log, calculate what the OLD system would have produced for Hydra multiattack strikes.

**Old system ability path:** atkMod = stat_mod(5) + prof(0) + old_bonusAttack(8) = **13**, dmgMod = stat_mod(5) + old_bonusDamage(3) = **8**
**New system ability path:** atkMod = stat_mod(5) + prof(0) + new_bonusAttack(3) = **8**, dmgMod = stat_mod(5) + new_bonusDamage(-2) = **3**

### Fight 1 — Hydra Strikes Only

| Round | Strike | d20 | New Total (d20+8) | Old Total (d20+13) | AC | New Hit? | Old Hit? | Dice Roll | New Dmg (+3) | Old Dmg (+8) |
|-------|--------|-----|-------------------|--------------------|----|----------|----------|-----------|-------------|-------------|
| 1 | 1 | 10 | 18 | 23 | 16 | HIT | HIT | 8 | 11 | 16 |
| 1 | 2 | 19 | 27 | 32 | 16 | HIT | HIT | 4 | 7 | 12 |
| 1 | 3 | 14 | 22 | 27 | 16 | HIT | HIT | 5 | 8 | 13 |
| 2 | 1 | 1 | 9 | 14 | 16 | MISS | MISS | — | 0 | 0 |
| 2 | 2 | 3 | 11 | 16 | 16 | MISS | **HIT** | ~4 | 0 | **12** |
| 2 | 3 | 5 | 13 | 18 | 16 | MISS | **HIT** | ~6 | 0 | **14** |
| 3 | 1 | 9 | 17 | 22 | 16 | HIT | HIT | 7 | 10 | 15 |
| 3 | 2 | 15 | 23 | 28 | 16 | HIT | HIT | 3 | 6 | 11 |
| 3 | 3 | 17 | 25 | 30 | 16 | HIT | HIT | 7 | 10 | 15 |
| 4 | 1 | 3 | 11 | 16 | 16 | MISS | **HIT** | ~5 | 0 | **13** |
| 4 | 2 | 2 | 10 | 15 | 16 | MISS | MISS | — | 0 | 0 |
| 4 | 3 | 18 | 26 | 31 | 16 | HIT | HIT | 1 | 4 | 9 |
| 5 | 1 | 9 | 17 | 22 | 16 | HIT | HIT | 8 | 11 | 16 |
| 5 | 2 | 10 | 18 | 23 | 16 | HIT | HIT | 2 | 5 | 10 |
| 5 | 3 | 6 | 14 | 19 | 16 | MISS | **HIT** | ~3 | 0 | **11** |
| 6 | 1 | 20 | 28 | 33 | 16 | HIT | HIT | 1 | 4 | 9 |

**Summary — Fight 1 Hydra damage:**
- **New system:** 76 total damage over 6 rounds → kills player R6
- **Old system:** ~202 total damage over 6 rounds → would kill player in R2-R3
- **Hit rate:** New 10/16 (63%), Old **14/16 (88%)**. 4 extra hits in old system.
- **Damage per hit:** New avg ~7.6, Old avg ~12.5 (+5 per hit from modifier difference)

### Fight 2 — Hydra Strikes Only

| Round | Strike | d20 | New Total | Old Total | AC | New Hit? | Old Hit? |
|-------|--------|-----|-----------|-----------|----|----------|----------|
| 1 | 1 | 11 | 19 | 24 | 16 | HIT | HIT |
| 1 | 2 | 5 | 13 | 18 | 16 | MISS | **HIT** |
| 1 | 3 | 8 | 16 | 21 | 16 | HIT | HIT |
| 2 | 1 | 14 | 22 | 27 | 16 | HIT | HIT |
| 2 | 2 | 6 | 14 | 19 | 16 | MISS | **HIT** |
| 2 | 3 | 10 | 18 | 23 | 16 | HIT | HIT |
| 3 | 1 | 16 | 24 | 29 | 16 | HIT | HIT |
| 3 | 2 | 4 | 12 | 17 | 16 | MISS | **HIT** |
| 3 | 3 | 12 | 20 | 25 | 16 | HIT | HIT |

Old: 9/9 hits (100%). New: 6/9 hits (67%). +3 extra hits in old system.

---

## Crit/Fumble Observations from Combat Log

### Crits observed (9 total across 205 attacks):
1. Fight 1 R6: Hydra strike d20=20 → HIT CRIT, dmg=4 (low — crit bonus dice added to base)
2. Fight 2 R2: Player d20=20 → HIT CRIT, dmg=26 (massive — crit chart bonus dice)
3. Fight 3 R4: Hydra strike d20=20 → HIT CRIT, dmg=11
4. Fight 5 R1: Hydra strike d20=20 → CRIT, dmg=5
5. Fight 5 R1: Hydra strike d20=20 → CRIT, dmg=10 (two crits same round!)
6. Fight 5 R2: Hydra strike d20=20 → CRIT, dmg=4
7. Fight 5 R3: Hydra strike d20=20 → CRIT, dmg=4
8. Fight 8 R6: Hydra strike d20=20 → CRIT, dmg=6
9. Fight 9 R4: Hydra strike d20=20 → CRIT, dmg=9

### Fumbles observed (2 total):
1. Fight 1 R1: Player d20=1 → FUMBLE (confirmed)
2. Fight 8 R6: Player d20=1 → FUMBLE (confirmed)

### Notable: Monster multiattack crits
Hydra crits are logged (d20=20 → CRIT flag on strike), but crit damage seems LOW compared to player crits (Player crit: 26 damage, Hydra crits: 4-11 damage). This suggests the crit chart bonus dice may not be fully applied in the multiattack path, OR the d100 roll gave low-severity results.
