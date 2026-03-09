# Combat Rating System Design

**Date:** 2026-03-03
**Status:** Design Doc -- Awaiting Review
**Scope:** Per-monster Combat Rating + Encounter Difficulty system for levels 1-50

---

## 1. Why D&D 5e's CR System Fails

D&D 5e's CR system is widely acknowledged as inaccurate -- its own lead designer Mike Mearls called it "the single biggest blunder I've made in game dev." Understanding these flaws guides our design.

### 1.1 Offensive/Defensive Averaging

The DMG calculates offensive CR (from DPR + attack bonus) and defensive CR (from HP + AC), then averages them. This hides lethality.

**Example:** A glass cannon with 60 HP, AC 11 (Defensive CR ~1) but 70 DPR (Offensive CR ~10) averages to CR 5-6. A damage sponge with 300 HP, AC 19 (Defensive CR ~10) but 10 DPR (Offensive CR ~1) also averages to CR 5-6. Same rating, but the glass cannon can TPK a party in 3 rounds while the sponge is a tedious zero-threat slog.

Analysis of Monster Manual entries found that nearly all official monsters have defensive CR lower than offensive CR -- the MM systematically under-provisions HP, making most monsters glass cannons to some degree. The averaging conceals this.

### 1.2 Action Economy Blindness

CR rates monsters individually without accounting for total actions per side per round.

**Example:** A Lich (CR 21) gets 1 action + 3 legendary actions = 4 actions/round. Six level-12 characters get 18+ effective actions/round. The party outpaces the Lich 4:1 in action economy and can burn through its 135 HP in 1-2 rounds regardless of the CR 21 rating.

### 1.3 Save-or-Suck Distortion

CR uses DPR as its primary offensive metric, but save-or-die abilities are qualitatively different from consistent damage.

**Examples:**
- **Banshee (CR 4):** Wail is DC 13 CON save or drop to 0 HP. Against a level-4 party, statistically 1-2 PCs drop instantly. The CR 4 "medium" encounter becomes a coin flip between trivial and TPK.
- **Shadow (CR 1/2):** Strength Drain reduces STR by 1d4 per hit. A Wizard with STR 8 dies in 2-3 hits. Five Shadows rated as an "easy" encounter can create a death spiral where each kill spawns a new Shadow.
- **Intellect Devourer (CR 2):** Body Thief can effectively instant-kill a character and take over their body. This is an instant-kill on a CR 2 monster.

The CR formula counts all damage equally. "Deal 20 damage" and "save or die" produce the same DPR number but are categorically different threats.

### 1.4 Level Scaling Mismatch

CR assumes linear power scaling, but player power follows a step function with dramatic spikes.

**The Level 5 cliff:** Martial classes gain Extra Attack, doubling DPR overnight (7.5 to 15 DPR for a Fighter). Casters gain 3rd-level spell slots (Fireball: 8d6 AoE). A "Hard" encounter at level 4 becomes trivial at level 5.

**The Tier 3-4 collapse (levels 11+):** By level 11, Fighters have 3 attacks and casters have 6th-level spells (Disintegrate, Wall of Force). Encounters rated 5x "Deadly" are defeated in a few rounds by optimized parties.

### 1.5 Party Composition Variance

**Example -- Troll (CR 5):** A party with a fire mage shuts off regeneration in round 1. An all-melee party without fire/acid must out-damage 10 HP/round regeneration or the fight is unwinnable. Same monster, same CR, wildly different outcomes.

**Example -- Flesh Golem (CR 5):** Immune to nonmagical physical damage. Against a party without magic weapons, the Golem has effectively infinite HP regardless of its 93 actual HP. The CR 5 rating assumes the party can damage it.

### 1.6 Resistance/Immunity Undervaluation

The DMG uses a flat 1.5x-2x effective HP multiplier for resistances/immunities. But resistances are binary -- the party either has the counter or they don't. You cannot meaningfully average 0% and 100% into "50%."

### 1.7 XP Multiplier Band-Aid

D&D uses XP multipliers for multiple monsters (2 = 1.5x, 3-6 = 2x, etc.). These are inaccurate because:
- Same multiplier regardless of party size (6 goblins vs 3 PCs =/= 6 goblins vs 7 PCs)
- A few CR 1/8 Kobolds added to a CR 5 encounter trigger the x2 multiplier despite negligible actual threat
- Doesn't account for AoE -- 15 low-HP monsters rated "x4 Deadly" die to one Fireball
- D&D's 2024 revision removed the multiplier entirely, suggesting even the designers knew it didn't work

### 1.8 Other Flaws

- **Low-level death zone (1-2):** A level-1 Wizard has 6-8 HP. An Ogre (CR 2, "Hard" encounter) deals 13 damage per hit -- instant kill.
- **Legendary Resistance:** Fixed at 3/day regardless of caster count in party. Either pointless (1 caster wastes 3 slots, then Fighter kills boss) or oppressive (3+ casters burn through it in round 1, then Hold Monster ends the fight).
- **Adventuring Day assumption:** CR assumes 6-8 encounters per long rest. Most groups run 1-3, meaning players always have full resources, trivializing "Deadly" encounters.
- **Terrain, surprise, environment:** None accounted for. A CR 5 fight in a 10x10 room vs an open field are completely different.

---

## 2. Our Combat Rating System Design

### 2.1 Definition

```
Combat Rating (CR) = A monster-intrinsic power index on a 1-50 scale,
computed purely from the monster's own stats and abilities.
```

CR is a **per-monster, absolute, intrinsic** rating. It measures relative danger between monsters without referencing player stats. Higher CR = more dangerous monster. The scale aligns with monster levels (CR 1 ≈ easiest encounter, CR 50 ≈ hardest encounter).

### 2.2 Why This Definition

| Design Choice | Rationale |
|---|---|
| **Monster-intrinsic** | No player lookup tables. Formula uses only the monster's own stats (HP, AC, ATK, damage, abilities). Eliminates 200+ manually-maintained player stat values. |
| **1-50 scale** | Aligns with the game's level range. CR 10 means "roughly L10 difficulty." |
| **Geometric mean** | `sqrt(OP * DP)` ensures both offense and defense matter equally. A glass cannon and a damage sponge with the same OP×DP product get the same CR. |
| **Logarithmic mapping** | Raw power spans ~550x (Goblin to Tarrasque). Log mapping distributes CR levels proportionally to relative power increases. |
| **Encounter Difficulty is separate** | Group scaling, composition, terrain are handled by a separate Encounter Difficulty calculation. Keeps CR clean. |
| **Sim CR as ground truth** | Formula CR is the fast estimate. Sim CR (from batch combat simulations) is the calibration baseline. Both are stored. |

### 2.3 Two-Track System: Formula CR + Sim CR

| Track | Purpose | When Used |
|---|---|---|
| **Formula CR** | Instant estimate from monster stats. No simulation needed. | During monster design, quick iteration, admin dashboard display. |
| **Sim CR** | Ground truth from 1000+ simulated fights per class per level. | After balance passes, official CR assignment, formula calibration. |

When Formula CR and Sim CR diverge by more than 1.5 levels, flag it -- the formula needs recalibration or the monster has unusual properties the formula can't capture (e.g., save-or-die ability).

### 2.4 Class Variance Indicator

Because a monster might be CR 5 for a Warrior but CR 8 for a Mage, we track variance:

```
CR 6 (V:Low)   -- all classes within +/- 1 level
CR 6 (V:Med)   -- spread of 2-3 levels across classes
CR 6 (V:High)  -- spread of 4+ levels across classes
CR 6 (V:Extreme, Mage:9, Psion:9)  -- 5+ spread, flag worst-case classes
```

**Variance is informational, not part of the CR number.** The encounter system uses it to warn when a specific group composition faces unusually high/low difficulty.

---

## 3. The CR Formula

### 3.1 Core Formula

```
RawPower = sqrt(OP * DP) * lethality_adjustment
CR = 7.61 * ln(RawPower) - 15.86     (clamped to minimum 1)
```

Where:
- **OP (Offensive Power)** = How much effective DPR this monster outputs
- **DP (Defensive Power)** = How hard this monster is to kill (effective HP)
- **Geometric mean** `sqrt(OP * DP)` ensures both axes contribute equally
- **Lethality adjustment** = +0-15% for glass cannons (OP >> DP)
- **Logarithmic mapping** calibrated to: Goblin (raw ~9) → CR 1, Tarrasque (raw ~5000) → CR 49

Implementation: `shared/src/data/combat/cr-formula.ts`

### 3.2 Offensive Power (OP)

```
OP = (baseDPR + abilityDPR) * legendaryActionMultiplier * attackBonusFactor
```

**Base DPR:**
```
baseDPR = avg_damage * attacks_per_round
```

**Ability DPR contributions:**
- AoE abilities: `avg_damage * 0.65 * use_frequency` (65% accounts for saves)
- Damage abilities: `avg_damage * 0.70 * use_frequency`
- On-hit effects: `avg_damage * 0.50` (contact damage) + status lethality per hit
- Fear aura: `+15% base DPR`
- Death throes: `avg_damage * 0.50 / 5` (amortized over 5 rounds)
- Damage aura: `avg_damage` (once per round)
- Status abilities (stun/paralyze): `avg_base_damage * 0.5 * duration / 5`

**Legendary Action Multiplier:** `1 + legendaryActions * 0.5` (each LA slot = +50% effective output)

**Attack Bonus Factor (cubic):**
```
atkFactor = (1 + max(0, ATK - 3) * 0.12) ^ 3.0
```

Baseline ATK +3 = 1.0x. Each point adds 12% compounding, cubed. This produces accelerating returns at higher ATK values:

| ATK | Factor | Notes |
|-----|--------|-------|
| +3 | 1.0x | Baseline (L1 monsters) |
| +6 | 1.6x | T1-T2 transition |
| +10 | 3.2x | T2-T3 transition |
| +15 | 8.6x | T4-T5 transition |
| +22 | 35.3x | World boss tier |

### 3.3 Defensive Power (DP)

```
DP = HP * acFactor * resistMult * regenMult * LR_mult * phaseMult * condImmMult * vulnPenalty
```

**AC Factor (cubic):**
```
acFactor = (1 + max(0, AC - 10) * 0.10) ^ 3.0
```

| AC | Factor | Notes |
|----|--------|-------|
| 10 | 1.0x | Baseline |
| 12 | 1.7x | T1-T2 |
| 16 | 4.1x | T3 |
| 20 | 8.0x | T4-T5 |
| 24 | 13.8x | World boss |

**Resistance Multiplier:**

| Condition | Multiplier |
|---|---|
| No resistances | 1.0 |
| 1 physical resistance | +0.20 |
| 2+ physical resistances | +0.40 |
| 2+ physical immunities | +0.75 |
| Each elemental resistance | +0.06 |
| Each elemental immunity | +0.12 |
| 3+ elemental immunities | additional +0.12 |

**Regeneration Multiplier:**
```
regenMult = min(2.0, 1 + (regenPerTurn * 5) / HP)
if disableable: regenMult = 1 + (regenMult - 1) * 0.5
```
Regen is extracted from `heal` type abilities with `hpPerTurn`.

**Legendary Resistances:** `+12% EHP per LR`

**Phase Transitions:** Base `+10%` per phase, plus `+5%` stat boost, `+4%` AoE burst, `+6%` added ability.

**Condition Immunities:** `+5%` per major immunity (stunned, paralyzed, frightened, charmed).

**Vulnerability Penalty:** `-10% EHP` if the monster has any vulnerabilities.

### 3.4 Lethality Adjustment

For abilities that can instantly kill or permanently remove a combatant:

| Ability Type | Lethality Bonus |
|---|---|
| Save-or-die (petrification, Power Word Kill) | +3 to +5 levels |
| Max HP reduction (Wraith life drain) | +2 to +3 levels |
| Paralysis/stun > 2 rounds | +1 to +2 levels |
| Multi-target save-or-suck (Banshee wail) | +3 to +5 levels |

```
lethality_bonus = severity * (1 - save_probability)
```

Where severity is from the table above, and save_probability uses the expected save modifier at the target level.

### 3.5 Worked Examples

#### Example 1: Goblin (Current Stats)

```
Stats: HP 24, AC 12, Attack +3, Damage 1d4+1 (avg 3.5)
No abilities, no resistances, no status effects.

--- EHP ---
Against a Level 1 player (avg attack +5):
  hit_prob = (21 - (12 - 5)) / 20 = 14/20 = 0.70
  AC_multiplier = 1/0.70 = 1.43
  EHP = 24 * 1.43 = 34.3

Level 1 player avg DPR = weapon_avg * hit_prob
  = (1d6+3 avg = 6.5) * 0.70 = 4.55 DPR (with class abilities factored ~5.5)
  Rounds to kill Goblin: 34.3 / 5.5 = 6.2 rounds

Level 1 is slightly too low (want ~5 rounds). Check Level 2:
  Level 2 avg DPR ~6.0 → 34.3 / 6.0 = 5.7 rounds. Close enough.
  EHP_Level ≈ 1.5

--- EDPR ---
Against Level 1 player (avg AC 13):
  hit_prob = (21 - (13 - 3)) / 20 = 11/20 = 0.55
  DPR = 3.5 * 0.55 = 1.93
  Level 1 avg HP = 16 (avg across classes)
  Rounds to kill player: 16 / 1.93 = 8.3 rounds
  → Monster kills at ~level 0 pace. EDPR_Level ≈ 0.5

--- CR ---
CR = (1.5 + 0.5 + 0) / 2 = 1.0

Lethality: 0 (no special abilities)
Variance: Low (all classes have similar experience vs basic melee)

Result: CR 1 (V:Low) ✓ — matches expectations for a level-1 starter monster.
```

#### Example 2: Troll (Current Stats -- No Regeneration)

```
Stats: HP 75, AC 12, Attack +7, Damage 2d6+4 (avg 11)
No abilities (regeneration not implemented), no resistances.

--- EHP ---
Against Level 9 player (avg attack +8):
  hit_prob = (21 - (12 - 8)) / 20 = 17/20 = 0.85
  AC_multiplier = 1/0.85 = 1.18
  EHP = 75 * 1.18 = 88.5

Level 9 avg DPR: (1d8+2 weapon avg 6.5 + 3 stat) * 0.70 hit + ability_dmg
  ≈ 8.0 raw DPR (with abilities ~10-12)
  Rounds to kill: 88.5 / 11 = 8.0 rounds — too many

Level 7: avg DPR ~8 → 88.5 / 8 = 11 rounds — way too many
Level 10: avg DPR ~12 → 88.5 / 12 = 7.4 rounds — still high

EHP_Level ≈ 10 (generous; AC 12 is very hittable)

--- EDPR ---
Against Level 9 player (avg AC ~16):
  hit_prob = (21 - (16 - 7)) / 20 = 12/20 = 0.60
  DPR = 11 * 0.60 = 6.6
  Level 9 avg HP ~50
  Rounds to kill: 50 / 6.6 = 7.6 rounds
  → Monster kills level 7-8 players in ~5 rounds. EDPR_Level ≈ 7.5

--- CR ---
CR = (10 + 7.5 + 0) / 2 = 8.75 ≈ 9

Result: CR 9 (V:Low) — matches its assigned level.
Note: With SRD regeneration (10/round disabled by fire/acid), this would add:
  regen_multiplier = 1 + (10 * 5) / 75 = 1.67 → EHP = 75 * 1.18 * 1.67 = 148
  But reduced by 0.5 for disableable = 1.33 → EHP = 118
  Would push CR to ~11, with V:High (melee-only parties without fire face CR 13+).
```

#### Example 3: Lich (Current Stats -- No Spellcasting)

```
Stats: HP 120, AC 17, Attack +9, Damage 3d6+5 (avg 15.5)
No abilities (spellcasting not implemented), no resistances.

--- EHP ---
Against Level 18 player (avg attack +11):
  hit_prob = (21 - (17 - 11)) / 20 = 15/20 = 0.75
  AC_multiplier = 1/0.75 = 1.33
  EHP = 120 * 1.33 = 160

Level 15 avg DPR ~18 → 160 / 18 = 8.9 rounds
Level 18 avg DPR ~22 → 160 / 22 = 7.3 rounds
Level 20 avg DPR ~26 → 160 / 26 = 6.2 rounds

EHP_Level ≈ 18

--- EDPR ---
Against Level 18 player (avg AC ~18):
  hit_prob = (21 - (18 - 9)) / 20 = 12/20 = 0.60
  DPR = 15.5 * 0.60 = 9.3
  Level 18 avg HP ~90
  Rounds to kill: 90 / 9.3 = 9.7 rounds → kills level ~14 in 5 rounds
  EDPR_Level ≈ 14

--- CR ---
CR = (18 + 14 + 0) / 2 = 16

Result: CR 16 (V:Low) — Current Lich is a boring melee brute at CR 16.

With SRD spellcasting (Power Word Kill, Dominate, Paralyzing Touch, 3 Legendary Actions):
  Lethality: +4 (save-or-die Power Word Kill + Paralyzing Touch)
  EDPR would spike to Level 25+ (AoE spells, action denial)
  Legendary actions add ~50% more EDPR
  CR would likely be 25-30, with V:Extreme (Mage/Psion face CR 35+ due to low HP/AC)
```

#### Example 4: Young Dragon (Current Stats -- No Breath Weapon)

```
Stats: HP 150, AC 18, Attack +10, Damage 2d10+6 (avg 17)
No abilities, no resistances, no flight.

--- EHP ---
Against Level 14 player (avg attack +10):
  hit_prob = (21 - (18 - 10)) / 20 = 13/20 = 0.65
  AC_multiplier = 1/0.65 = 1.54
  EHP = 150 * 1.54 = 231

Level 14 avg DPR ~16 → 231 / 16 = 14.4 rounds (too many)
Level 18 avg DPR ~22 → 231 / 22 = 10.5 rounds (still high)
Level 20 avg DPR ~26 → 231 / 26 = 8.9 rounds

This monster is tanky. EHP_Level ≈ 20 (defensive weight heavy due to AC 18 + 150 HP)

--- EDPR ---
Against Level 14 player (avg AC ~17):
  hit_prob = (21 - (17 - 10)) / 20 = 14/20 = 0.70
  DPR = 17 * 0.70 = 11.9
  Level 14 avg HP ~70
  Rounds to kill: 70 / 11.9 = 5.9 rounds → kills level 14 in ~6 rounds
  EDPR_Level ≈ 13

--- CR ---
CR = (20 + 13 + 0) / 2 = 16.5 ≈ 17

Result: CR 17 (V:Med) — Higher than its assigned level 14 because of the AC 18 + 150 HP combo.
The high EHP relative to EDPR confirms this is a damage sponge.

With SRD breath weapon (12d6 fire cone, Recharge 5-6):
  Ability DPR = 42 avg * 0.5 (save fail rate) * 0.33 (recharge freq) = +6.9 DPR
  Total EDPR_Level would jump to ~18
  + Fire immunity (resistance_mult = 1.25 for common element)
  + Lethality bonus +1 (AoE burst can one-shot squishy classes)
  CR would be ~20-22
```

---

## 4. CR Tiers and Expected Win Rates

### 4.1 Solo Encounter Difficulty

| Difficulty | CR vs Player Level | Solo Win Rate | Avg Rounds | Use Case |
|---|---|---|---|---|
| **Trivial** | CR <= Level - 5 | 95%+ | 1-3 | Nuisance encounters, resource-free |
| **Easy** | CR = Level - 3 to -4 | 85-95% | 2-4 | Safe trade route encounters |
| **Standard** | CR = Level - 1 to Level | 55-70% | 3-6 | Normal road encounters |
| **Challenging** | CR = Level + 1 to +2 | 35-55% | 4-7 | Dangerous wilderness |
| **Deadly** | CR = Level + 3 to +4 | 15-35% | 5+ | Extreme danger routes, boss areas |
| **Impossible** | CR >= Level + 5 | <15% | N/A | Group-only content, world bosses |

### 4.2 Group Encounter Difficulty

For groups, compute **Group Power Level (GPL)**:

```
GPL = average_party_level + group_size_bonus

group_size_bonus:
  2 players: +2
  3 players: +4
  4 players: +5
  5 players: +6
```

Then use the same difficulty table, comparing monster CR to GPL instead of individual level.

**Example:** A group of 4 level-10 players has GPL = 10 + 5 = 15. A CR 15 monster is a "Standard" encounter for this group. A CR 20 monster is "Impossible" (they need a bigger group).

**Why this works:** The group_size_bonus accounts for action economy (more attacks/round), HP pooling (shared damage absorption), and healer multiplier effects. The bonus diminishes per-player because each additional player adds less marginal value.

### 4.3 Linked Group (Raid) Difficulty

For linked groups (10+ players):

```
Raid Power Level (RPL) = average_level + 6 + floor(total_players / 5)
```

A 10-player raid at level 20 has RPL = 20 + 6 + 2 = 28. A 15-player raid at level 30 has RPL = 30 + 6 + 3 = 39.

Raid-tier monsters should have CR 30+ and require mechanics that prevent them from being overwhelmed by action economy (legendary actions, phase transitions, AoE on every turn).

---

## 5. Road Encounter Integration

### 5.1 Solo Road Encounters (Current System)

**Current:** `road-encounter.ts` selects monsters by biome + level range (`charLevel +/- 3`).

**Proposed:** Replace level range with CR-based selection:

```typescript
function selectMonsterForEncounter(charLevel: number, biome: BiomeType, routeDanger: number) {
  // Target CR based on route danger
  const targetCR = getTargetCR(charLevel, routeDanger);
  const crRange = { min: targetCR - 2, max: targetCR + 1 };

  // Query monsters by biome + CR range
  return prisma.monster.findMany({
    where: { biome, cr: { gte: crRange.min, lte: crRange.max } }
  });
}
```

**Route danger → target CR mapping:**

| Danger Level | Target CR | Difficulty | Expected Win Rate | Death Rate Target |
|---|---|---|---|---|
| 1 (Safe trade route) | Level - 4 | Easy | 90%+ | <2% |
| 2 (Normal road) | Level - 2 | Easy-Standard | 75-85% | 3-5% |
| 3 (Wilderness) | Level - 1 | Standard | 60-70% | 5-8% |
| 4 (Dangerous) | Level | Standard-Challenging | 50-60% | 8-12% |
| 5 (Extreme) | Level + 1 | Challenging | 40-55% | 12-18% |
| 6 (Deadly) | Level + 2 | Deadly | 30-40% | 18-25% |
| 7 (Suicide) | Level + 3 | Deadly | 20-30% | 25-35% |

**Death rate target for the game overall:** ~5% of solo road encounters should result in player death. This means most encounters should be danger 2-3, with higher danger reserved for specific dangerous routes.

### 5.2 Group Road Encounters (Future)

When a party travels together:

```
Encounter Budget = GPL * encounter_multiplier

encounter_multiplier:
  Standard encounter: 1.0x (one monster at CR = GPL)
  Multi-monster: split budget across 2-4 monsters (e.g., GPL 15 → 3x CR 7 monsters)
  Boss + adds: one monster at 0.7x budget + several at 0.1x each
```

**Group encounter triggers:**
- Party of 2+ characters traveling the same route at the same time
- Higher danger routes should prefer multi-monster encounters (wolf pack, bandit gang) over solo monsters
- Boss-tier monsters (CR > any individual player level + 5) should ONLY appear as group encounters

### 5.3 Biome-Locked Encounters

Some monsters should only appear in specific dangerous areas:

| Monster Type | Biome Lock | Min Group Size | Min CR |
|---|---|---|---|
| Ancient Dragon | VOLCANIC / TUNDRA | 5+ players | 25+ |
| Lich | UNDERGROUND / SWAMP | 3+ players | 25+ |
| Tarrasque | ANY (world event) | 10+ (raid) | 40+ |
| Kraken | COASTAL (deep water) | 5+ players | 30+ |

---

## 6. Loot/XP Integration

### 6.1 XP Scaling

**Current:** XP = `5 * monster.level`. This is flat and doesn't reward fighting harder monsters.

**Proposed:** XP scales with CR AND relative difficulty:

```
base_XP = CR_XP_table[monster.CR]
relative_bonus = max(0, (monster.CR - player.level) * 0.15)
XP_earned = floor(base_XP * (1 + relative_bonus))
```

**CR XP Table (base values):**

| CR | Base XP | CR | Base XP |
|---|---|---|---|
| 1 | 25 | 15 | 350 |
| 3 | 50 | 20 | 600 |
| 5 | 100 | 25 | 1000 |
| 7 | 150 | 30 | 1600 |
| 10 | 200 | 40 | 3000 |
| 12 | 275 | 50 | 5000 |

The `relative_bonus` gives +15% XP per CR above player level, rewarding players who punch above their weight. Fighting below your level gives base XP only (no penalty -- the encounter was still a fight).

### 6.2 Loot Quality Scaling

**Proposed:** Loot drop rarity influenced by CR tier, not raw CR number.

| CR Tier | Available Loot Rarities | Gold Multiplier |
|---|---|---|
| 1-5 | Common | 1.0x |
| 6-10 | Common, Uncommon | 1.5x |
| 11-15 | Common, Uncommon, Rare | 2.0x |
| 16-20 | Uncommon, Rare, Very Rare | 3.0x |
| 21-30 | Rare, Very Rare, Legendary | 5.0x |
| 31+ | Very Rare, Legendary, Mythic | 10.0x |

Gold multiplier applies to the monster's base gold drop. Higher CR monsters naturally drop more gold due to the multiplier.

### 6.3 Group XP Distribution

For group encounters, total XP is split but with a participation bonus:

```
per_player_XP = (total_encounter_XP / group_size) * participation_bonus

participation_bonus:
  2 players: 1.2x (60% each of total)
  3 players: 1.15x (38% each)
  4 players: 1.1x (28% each)
  5 players: 1.05x (21% each)
```

This prevents XP-per-player from dropping too steeply in groups while still making solo combat more XP-efficient (risk/reward).

---

## 7. Implementation: Auto-Recalculating CR

### 7.1 Stored vs Computed

**Decision: Stored + auto-recomputed.**

- Add `cr` (Float) and `crVariance` (String) fields to the Monster schema
- Formula CR recomputes on seed (when monster stats change)
- Sim CR recomputes on demand via CLI script

### 7.2 CLI Commands

```bash
# Recompute formula CR for all monsters (instant, no sim)
npx ts-node server/src/scripts/recalc-cr.ts formula

# Recompute sim CR for all monsters (runs batch sims, takes minutes)
npx ts-node server/src/scripts/recalc-cr.ts sim --iterations 200

# Recompute for a specific monster
npx ts-node server/src/scripts/recalc-cr.ts sim --monster "Troll" --iterations 500

# Show CR comparison (formula vs sim)
npx ts-node server/src/scripts/recalc-cr.ts compare
```

### 7.3 Admin Dashboard

The admin combat dashboard should show:
- **Per-monster:** Formula CR, Sim CR, Variance indicator, last sim date
- **Divergence alerts:** Flag any monster where |Formula CR - Sim CR| > 1.5
- **CR distribution chart:** Histogram of all monster CRs to spot gaps in level coverage

### 7.4 Seed Integration

When `seedMonsters()` runs, it should also compute Formula CR for each monster and store it. This ensures CR is always up-to-date with monster stat changes without requiring a separate step.

---

## 8. Open Questions for Tony

### Q1: Solo CR Definition Confirmation

The proposed definition is: **CR = level at which average player wins 50% of 1v1 fights.** This means a CR 5 monster kills the player roughly half the time at level 5.

**Alternative:** CR = level at which player wins 65-70% (D&D's "medium" difficulty). This would make CR more optimistic and would mean road encounters at `CR = level` feel easier.

**Which do you prefer?** 50% (honest coin-flip) or 65-70% (player-favored "standard" difficulty)?

### Q2: Death Rate Target for Road Encounters

The proposed target is **~5% death rate** for standard road encounters (danger 2-3). This means 1 in 20 road trips results in a combat death.

Is this too punishing? Too lenient? For reference:
- 2% = very safe, deaths are rare events
- 5% = meaningful risk, deaths happen but aren't frequent
- 10% = dangerous world, deaths are a regular occurrence

### Q3: Group Encounter Trigger

How should group encounters be triggered?
- **Option A:** Automatic when 2+ players travel the same route simultaneously
- **Option B:** Players explicitly form a party before traveling
- **Option C:** Solo encounters always, group encounters are special content (dungeons, boss areas)

### Q4: CR on Monster Schema vs Computed Field

Should CR be:
- **Option A:** A stored field on the Monster table (computed on seed, recomputed on demand)
- **Option B:** Always computed on-the-fly from stats (no storage, but slower queries)
- **Option C:** Stored field + computed field (store formula CR, cache sim CR separately)

Recommendation: **Option A** (stored, recomputed on seed). Simplest, and CR doesn't change frequently.

### Q5: Should CR Replace Monster Level?

Currently monsters have a `level` field (1-18). Should we:
- **Option A:** Keep `level` as-is, add `cr` as a separate field (both stored)
- **Option B:** Replace `level` with `cr` (CR becomes the primary difficulty indicator)
- **Option C:** Keep `level` for loot/XP scaling, use `cr` for encounter selection

Recommendation: **Option C**. Level determines loot tier and XP rewards. CR determines encounter selection and difficulty display. They'll often be close but serve different purposes.

### Q6: XP Formula Change

Changing from `5 * monster.level` to CR-based XP is a significant balance change. Should we:
- **Option A:** Switch to CR-based XP immediately
- **Option B:** Keep current formula until CR system is proven via simulation
- **Option C:** Implement both, A/B test with sim bots

### Q7: Lethality Tolerance

How should we handle monsters with save-or-die abilities in solo road encounters?
- **Option A:** Never put save-or-die monsters in solo encounters (group-only)
- **Option B:** Allow them but heavily reduce encounter chance
- **Option C:** Allow them with the CR system properly accounting for lethality (higher CR = less likely to appear for that level)

Recommendation: **Option C**. The CR formula already adjusts for lethality. A Banshee-equivalent might be CR 8 even though its raw stats suggest CR 4, so it only appears against players who can handle it.
