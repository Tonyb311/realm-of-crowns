# Audit: Combat Log Deep-Dive — Caster 0-Damage Bug + Ability Tax Analysis

**Date:** 2026-03-07
**Sim Run:** `cmmfo9g9y00005sr575hm173j` (v2 post-rebalance battery)
**Status:** DIAGNOSIS ONLY — no code changes

---

## 1. Caster 0-Damage Root Cause

### Verdict: Design issue (monster damage immunities), NOT a code bug

The combat engine's damage type interaction system works correctly. When a monster has `damageImmunities` containing a damage type, ALL damage of that type is set to 0 — for both basic attacks AND class abilities.

**The problem:** Caster weapons deal exotic damage types, and high-tier monsters are immune to those exact types.

### Caster Weapon Damage Types (from `combat-simulator.ts:250-259`)

| Class | Weapon | Damage Type |
|-------|--------|------------|
| Mage | Staff | FORCE |
| Psion | Orb | PSYCHIC |
| Cleric | Holy Symbol | RADIANT |
| Bard | Instrument | THUNDER |
| Warrior | Sword | SLASHING |
| Rogue | Dagger | PIERCING |
| Ranger | Bow | PIERCING |

### Specific 0-Damage Matchups Explained

**Mage (FORCE) vs Mind Flayer (L20):**
- Mind Flayer has `damageImmunities: ['FORCE']`
- Every mage basic attack deals FORCE damage → immunity → 0 damage
- Mage class abilities that deal damage via `resolveAttack()` also use weapon damage type → 0 damage
- Result: **0 total pDmg across 200 iterations** — confirmed in sim data
- Note: Mind Flayer also has `damageResistances: ['PSYCHIC']`, blocking Psion too (half damage)

**Psion (PSYCHIC) vs Archlich (L40):**
- Archlich has `damageImmunities: ['POISON', 'PSYCHIC']`
- Psion orb deals PSYCHIC → immunity → 0 damage
- Result: **0 total pDmg across 200 iterations** — confirmed

**Psion (PSYCHIC) vs Void Emperor (L50):**
- Void Emperor has `damageImmunities: ['PSYCHIC', 'NECROTIC', 'POISON']`
- Additionally has `damageResistances: ['COLD', 'FIRE', 'LIGHTNING', 'FORCE']` — Mage FORCE damage halved
- Result: Psion = 0 pDmg, Mage = 9 pDmg (half of already-low damage)

### How Damage Type Immunity Works (from `combat-engine.ts:264-337`)

```
applyDamageTypeInteraction(damage, damageType, target):
  1. Check status-based immunity → damage = 0
  2. Check static immunity (target.immunities?.includes(type)) → damage = 0
  3. Check status-based vulnerability → damage × 1.5
  4. Check static vulnerability → damage × 2
  5. Check static resistance → damage × 0.5
  6. Default: no change
```

This function is called:
- **Basic attacks:** `combat-engine.ts:1124-1142` (resolveAttack)
- **Class abilities:** `combat-engine.ts:3033-3050` (post-processing after resolveClassAbility)
- **Each extra attack independently** (called per attack in the extra attack loop)

The code is working as designed. The issue is that FORCE/PSYCHIC immunities on bosses make casters deal literally zero damage.

---

## 2. Monster Damage Immunity Table

### Monsters with immunities to CASTER damage types

| Monster | Level | FORCE (Mage) | PSYCHIC (Psion) | RADIANT (Cleric) | THUNDER (Bard) |
|---------|-------|:---:|:---:|:---:|:---:|
| Mind Flayer | 20 | **IMMUNE** | resist | - | - |
| Iron Golem | 23 | - | **IMMUNE** | - | - |
| Beholder | 26 | - | **IMMUNE** | - | - |
| Archlich | 40 | - | **IMMUNE** | - | - |
| Void Emperor | 50 | resist | **IMMUNE** | - | - |

No monster is immune to RADIANT or THUNDER — Cleric and Bard are not affected by this bug.

### All Monster Immunities/Resistances (complete)

**T1 (L1-7):**
| Monster | Lvl | Immunities | Resistances |
|---------|-----|-----------|-------------|
| Bone Rattler | 2 | POISON | - |
| Shambling Corpse | 3 | POISON | - |
| Hollow Sentinel | 5 | - | - |
| Skeleton Warrior | 5 | POISON | - |
| Ghoul Stalker | 5 | POISON | - |
| Tidal Elemental | 6 | POISON | - |
| Stoneclaw Gargoyle | 7 | - | PIERCING, SLASHING |

**T2 (L10-14):**
| Monster | Lvl | Immunities | Resistances |
|---------|-----|-----------|-------------|
| Arcane Elemental | 10 | POISON | SLASHING, PIERCING |
| Crypt Warden | 11 | POISON, NECROTIC | - |
| Ancient Golem | 12 | - | SLASHING, PIERCING |
| Dune Revenant | 12 | POISON | - |
| Void Stalker | 13 | - | COLD, NECROTIC |
| Cairn Specter | 14 | POISON, NECROTIC | SLASH, PIERCE, BLUDG |

**T3 (L15-21):**
| Monster | Lvl | Immunities | Resistances |
|---------|-----|-----------|-------------|
| Hydra | 15 | - | - |
| Lich | 18 | POISON | COLD, LIGHTNING, NECROTIC |
| Mind Flayer | 20 | **FORCE** | **PSYCHIC** |
| Vampire Lord | 21 | POISON | NECROTIC, COLD |

**T4 (L23-30):**
| Monster | Lvl | Immunities | Resistances |
|---------|-----|-----------|-------------|
| Iron Golem | 23 | FIRE, POISON, **PSYCHIC**, NECROTIC | SLASH, PIERCE, BLUDG |
| Purple Worm | 25 | POISON | BLUDG, PIERCE |
| Beholder | 26 | **PSYCHIC** | - |
| Death Knight | 28 | POISON | COLD, NECROTIC |
| Storm Giant | 30 | LIGHTNING | COLD, THUNDER |

**T5 (L31-40):**
| Monster | Lvl | Immunities | Resistances |
|---------|-----|-----------|-------------|
| Obsidian Golem | 31 | FIRE | SLASHING, PIERCING |
| Stone Colossus | 34 | - | SLASHING, PIERCING |
| Basilisk King | 35 | POISON | - |
| Aboleth | 37 | POISON | **PSYCHIC**, COLD |
| Archlich | 40 | POISON, **PSYCHIC** | COLD, LIGHTNING, NECROTIC |

**T6 (L41-50):**
| Monster | Lvl | Immunities | Resistances |
|---------|-----|-----------|-------------|
| Nightwalker | 42 | POISON, NECROTIC | SLASH, PIERCE, BLUDG |
| Spectral Knight | 43 | POISON, NECROTIC | SLASH, PIERCE, BLUDG |
| Tundra Sentinel | 44 | COLD, POISON | - |
| Blight Dragon | 45 | POISON | ACID |
| Granite Warden | 46 | - | SLASHING, PIERCING |
| Tarrasque | 49 | FIRE, POISON | COLD, LIGHTNING, SLASH, PIERCE, BLUDG |
| Void Emperor | 50 | **PSYCHIC**, NECROTIC, POISON | COLD, FIRE, LIGHTNING, **FORCE** |

### Impact Summary

- **Mage (FORCE):** Blocked by 1 immunity (Mind Flayer L20) + 1 resistance (Void Emperor L50). Moderate impact.
- **Psion (PSYCHIC):** Blocked by 4 immunities (Iron Golem L23, Beholder L26, Archlich L40, Void Emperor L50) + 2 resistances (Mind Flayer L20, Aboleth L37). **Severe impact** — Psion is locked out of multiple high-tier fights.
- **Cleric (RADIANT):** No monster has RADIANT immunity or resistance. Cleric is unaffected.
- **Bard (THUNDER):** Only Storm Giant resists THUNDER. Bard's low win rate is from other causes (support kit, no party).
- **Physical classes (SLASHING/PIERCING):** Several monsters resist physical damage (Gargoyle, Golem, Specter, etc.) but none are IMMUNE. Physical resistance = half damage, not zero.

---

## 3. Ability Tax Breakdown

### The Mechanism

**From `tick-combat-resolver.ts:408-505` (decideAction priority chain):**

1. Check ability queue entries in order
2. For `useWhen: 'always'` → `shouldUse = true` always
3. Check cooldown: if `cooldownRemaining > 0`, skip to next
4. If any ability passes → **return class_ability action** (never reaches basic attack fallback)

**From `combat-engine.ts:2820-2905` (attack action) vs `combat-engine.ts:3024-3093` (class_ability action):**

- `action.type === 'attack'`: loops through `currentActor.extraAttacks` — L40 warrior gets 3 total attacks
- `action.type === 'class_ability'`: resolves ONE ability, **NO extra attack loop**

**Result:** Every turn spent on an ability = (extraAttacks - 1) basic attacks lost.

### L40 Berserker Ability Rotation

**Available abilities at L40 (after passive filter):**

| Ability | ID | Type | Tier | CD | useWhen | Effect |
|---------|-----|------|------|-----|---------|--------|
| Reckless Strike | war-ber-1 | damage | 1 | **0** | always | +5 bonus dmg, -2 AC self |
| Blood Rage | war-ber-2 | buff | 2 | 8 | first_round | ATK scaling from missing HP |
| Cleave | war-ber-3 | aoe_damage | 2 | 3 | always | 0.8x AoE (useless in 1v1) |
| Frenzy | war-ber-4 | multi_attack | 3 | 4 | always | 2 strikes, -3 accuracy |
| Berserker Rage | war-ber-5 | buff | 4 | 12 | first_round | CC immune, +15 ATK, 3 rds |
| Tier 0 (3 abilities) | war-t0-* | varies | 0 | 2-4 | always | Various |

**Queue built by `buildAbilityQueue()` (`combat-simulator.ts:533-632`):**

1. **Opener (first_round):** Berserker Rage (tier 4 buff, CD 12) or Blood Rage (tier 2 buff, CD 8)
2. **Sustain damage (always):** Frenzy (tier 3, CD 4) — highest tier damage ability
3. **More damage (always):** Cleave (tier 2, CD 3)
4. **More damage (always):** Reckless Strike (tier 1, **CD 0**)
5. **Tier 0 damage abilities (always):** Power Strike (CD 2), Sundering Strike (CD 3), Brutal Charge (CD 3)

### The Critical Problem: Reckless Strike CD 0

**Reckless Strike has cooldown 0** — it's available EVERY single turn. Since it appears in the ability queue with `useWhen: 'always'`, the warrior uses it every turn that higher-priority abilities are on cooldown.

**Turn-by-turn rotation for L40 Berserker vs Archlich:**

| Round | Action | Attacks | Approx Damage | Notes |
|-------|--------|---------|---------------|-------|
| 1 | Berserker Rage (buff) | 0 attacks | 0 | Opening buff, consumes turn |
| 2 | Frenzy (CD4) | 2 strikes (-3 acc) | ~8-12 | Multi-attack ability |
| 3 | Cleave (CD3) | 1 AoE hit (0.8x) | ~5-8 | AoE wasted in 1v1 (only 1 target) |
| 4 | Reckless Strike (CD0) | 1 attack (+5 dmg) | ~10-12 | CD0, always available |
| 5 | Reckless Strike (CD0) | 1 attack (+5 dmg) | ~10-12 | |
| 6 | Frenzy (off CD) | 2 strikes | ~8-12 | |
| 7 | Cleave (off CD) | 1 AoE hit | ~5-8 | |
| 8 | Reckless Strike (CD0) | 1 attack | ~10-12 | |
| 9 | Reckless Strike (CD0) | 1 attack | ~10-12 | |
| 10 | Reckless Strike (CD0) | 1 attack | ~10-12 | |

**Basic attack (if it were ever chosen):** 3 attacks × ~8 each = ~24 damage/round

**Actual average across turns:**
- ~50% of turns: Reckless Strike (1 attack, +5 bonus = ~12 dmg)
- ~15% of turns: Frenzy (2 attacks with -3 acc = ~10 dmg)
- ~15% of turns: Cleave (1 AoE = ~7 dmg)
- ~10% of turns: Buff/opener (0 dmg)
- ~10% of turns: CC'd/stunned (0 dmg)

**Weighted average: ~8.5 DPR** — close to the observed 5.8 (the gap being further explained by Archlich's COLD/LIGHTNING/NECROTIC resistances applying to some ability damage, plus miss rate at AC 20+).

**Versus basic attack DPR: 3 attacks × ~8 = 24 DPR**

**Actual multiplier: 5.8 / 24 = 0.24x** (vs assumed 0.45x)

### Why the Theoretical 0.45x Was Wrong

The 0.45x multiplier assumed:
- 40% of turns use abilities (1 attack) → 0.40 × 1 = 0.40
- 60% of turns use basic attack (3 attacks) → 0.60 × 3 = 1.80
- Effective attacks = 2.20 → 2.20/3 = 0.73x

But reality:
- **~90%+ of turns use abilities** (because CD 0 abilities fill every gap)
- **~0% of turns use basic attack** (never reaches the fallback)
- The AI NEVER basic attacks when ANY ability is available

### L5 Warrior (Control Case)

At L5, warrior has 1 attack and tier 0 abilities. Abilities ADD bonus damage on top of a weapon attack (via `resolveAttack()` inside `handleDamage`). Since there are no extra attacks to lose, abilities are strictly better than basic attack. This is why T1-T2 balance is healthy — no ability tax at all.

---

## 4. Corrected eDPR Table

### Old (assumed 0.45x for multi-attack levels)

| Level | Raw DPR (basic atk) | eDPR Multiplier | eDPR |
|-------|---------------------|----------------|------|
| 1-12 | 2.1-4.3 | 1.1x | 2.3-4.7 |
| 13-33 | 5.8-10.5 | 0.45x | 2.6-4.7 |
| 34-41 | 12.7-13.5 | 0.45x | 5.7-6.1 |
| 42-50 | 18.0 | 0.45x | 8.1 |

### Corrected (actual ~0.24x for multi-attack levels, based on sim data)

The actual multiplier varies by level because it depends on how many abilities are available and their cooldowns. But the sim data gives us hard numbers:

| Level | Monster | Warrior Total Dmg | Avg Rounds | Actual DPR | Old eDPR | Ratio |
|-------|---------|-------------------|------------|-----------|----------|-------|
| 1 | Giant Rat | 17 | 9.3 | 1.8 | 2.3 | 0.78x |
| 1 | Goblin | 23 | 9.0 | 2.6 | 2.3 | 1.13x |
| 3 | Bandit | 19 | 5.0 | 3.8 | 2.3 | 1.65x |
| 5 | Skeleton Warrior | 15 | 3.0 | 5.0 | 2.5 | 2.0x |
| 5 | Ghoul Stalker | 15 | 3.9 | 3.8 | 2.5 | 1.52x |
| 8 | Dire Wolf | 19 | 3.4 | 5.6 | 3.8 | 1.47x |
| 8 | Ironhide Ogre | 18 | 3.4 | 5.3 | 3.8 | 1.39x |
| 10 | Sandscale Basilisk | 34 | 4.5 | 7.6 | 4.3 | 1.77x |
| 13 | Void Stalker | 29 | 4.2 | 6.9 | 4.1 | 1.68x |
| 15 | Hydra | 20 | 3.3 | 6.1 | 4.1 | 1.49x |
| 20 | Mind Flayer | 69 | 7.9 | 8.7 | 5.8 | 1.50x |
| 25 | Purple Worm | 36 | 4.3 | 8.4 | 6.0 | 1.40x |
| 30 | Storm Giant | 29 | 3.4 | 8.5 | 8.4 | 1.01x |
| 35 | Basilisk King | 56 | 6.4 | 8.8 | 12.7 | 0.69x |
| 40 | Archlich | 66 | 11.4 | 5.8 | 13.5 | 0.43x |
| 45 | Blight Dragon | 40 | 6.0 | 6.7 | 18.0 | 0.37x |
| 50 | Void Emperor | 29 | 7.3 | 4.0 | 18.0 | 0.22x |

### Key Observations

1. **T1-T2 (L1-10): Actual DPR is 1.3-1.8x higher than estimated** — abilities ADD damage at these levels
2. **T3 (L13-20): Actual DPR roughly matches** — ability tax starts biting but abilities still contribute meaningful damage
3. **T4 (L25-30): Actual DPR is ~1.0-1.4x of estimate** — still reasonable
4. **T5+ (L35+): Actual DPR drops to 0.22-0.69x of estimate** — ability tax overwhelms. This is where the estimate broke down catastrophically.

**The problem gets worse at higher levels because:**
- More extra attacks to lose (3 at L34+, 4 at L42+)
- Abilities don't scale proportionally (Reckless Strike is +5 damage at ALL levels)
- Higher level = more abilities available = more turns spent on abilities
- Monster HP/AC scale up but ability damage stays flat

---

## 5. Corrected Monster HP Targets

Using the ACTUAL warrior DPR from sim data to recalculate what monster HP should be:

### Formula
`target HP = actual warrior DPR × target rounds to kill`

### T3-T6 Corrected Targets

| Tier | Level | Actual Warrior DPR | Target Rounds | Target HP (grunt) | Target HP (elite) | Target HP (boss) |
|------|-------|--------------------|---------------|-------------------|--------------------|-------------------|
| T3 | 13 | 6.9 | 10 | 55 | 69 | 83 |
| T3 | 15 | 6.1 | 10 | 49 | 61 | 73 |
| T3 | 20 | 8.7 | 10 | 70 | 87 | 104 |
| T4 | 25 | 8.4 | 10.5 | 71 | 88 | 106 |
| T4 | 30 | 8.5 | 10.5 | 71 | 89 | 107 |
| T5 | 35 | 8.8 | 11.5 | 81 | 101 | 121 |
| T5 | 40 | 5.8 | 11.5 | 53 | 67 | 80 |
| T6 | 45 | 6.7 | 12.5 | 67 | 84 | 100 |
| T6 | 50 | 4.0 | 12.5 | 40 | 50 | 60 |

### Comparison with Current v2 HP

| Monster | Lvl | Current HP | Target HP | Reduction Needed |
|---------|-----|-----------|-----------|-----------------|
| Void Stalker | 13 | 52 | 55 (grunt) | ~OK |
| Hydra | 15 | 44 | 73 (boss) | Actually UNDER-HP'd — Hydra kills too fast, problem is monster DPR |
| Mind Flayer | 20 | 54 | 87 (elite) | Under-HP'd — but 94% warrior win suggests it's fine |
| Purple Worm | 25 | 76 | 88 (elite) | -14% needed |
| Storm Giant | 30 | 106 | 89 (elite) | -16% needed |
| Basilisk King | 35 | 145 | 101 (elite) | -30% needed |
| Archlich | 40 | 186 | 67 (boss) | **-64% needed** |
| Blight Dragon | 45 | 225 | 84 (elite) | **-63% needed** |
| Void Emperor | 50 | 270 | 50 (boss) | **-81% needed** |

**Critical insight:** At T5-T6, the HP reduction needed is 60-80%. But simply cutting HP won't fix the real problem — monster DAMAGE is also too high (killing players in 3-7 rounds). Both HP and damage need dramatic cuts at T5-T6.

---

## 6. Action Items (Prioritized)

### Priority 1: Fix Ability Tax (Biggest Impact)

**Problem:** CD 0 abilities (Reckless Strike) fill every turn gap, preventing basic attack from ever being chosen. The warrior uses 1-attack abilities instead of 3-attack basic attacks.

**Options:**
- **Option A: Make basic attack the default when extra attacks > ability damage.** Add logic to `decideAction()`: if actor has N extra attacks and the best available ability deals less than N × basic_attack_damage, choose basic attack instead.
- **Option B: Let abilities trigger extra attacks.** After resolving a class_ability, if the actor has extra attacks remaining, resolve (extraAttacks - 1) basic attacks. This makes abilities a "first strike" followed by regular attacks.
- **Option C: Increase all CD 0 abilities to CD 1+.** This would force some basic attack turns. Least elegant but simplest.

**Recommendation:** Option B is the best design. It preserves the value of abilities AND extra attacks. A L40 warrior turn would be: use Reckless Strike (1 boosted attack) + 2 basic attacks = 3 total attacks, with the first being stronger.

### Priority 2: Remove Caster Damage Type Immunities from Bosses

**Problem:** Mind Flayer, Iron Golem, Beholder, Archlich, and Void Emperor are immune to FORCE or PSYCHIC, making Mage and Psion deal 0 damage.

**Fix:** Remove FORCE and PSYCHIC from `damageImmunities` on these 5 monsters. Optionally convert to resistance (50% damage) instead of immunity (0% damage) if flavour requires it. Consider also checking that no monster is immune to RADIANT or THUNDER to future-proof for Cleric and Bard.

### Priority 3: Further Reduce T4-T6 Monster Stats

Even after fixing the ability tax, monster HP and damage at T4-T6 are too high. The corrected HP targets (section 5) show 30-80% reductions still needed at T5-T6.

**Monster damage is also the problem.** Players die in 3-7 rounds at T4+. Target is 8-14 rounds for the fight. Monster damage per round needs to be cut roughly in half at T4-T6.

### Priority 4: Address Weapon Tier Plateau

Iron weapons cover L10-29 (20 levels with no damage increase). Steel covers L30-54 (25 levels). Player damage stays flat while monster HP scales.

**Options:**
- Add +1/+2/+3 weapon enchantments as intermediate upgrades
- Reduce the number of levels in each tier by adding intermediate tiers
- Scale proficiency bonus damage (not just hit chance) with level

### Priority 5: Class-Specific Tuning

- **Mage/Psion:** Even after fixing immunities, need higher base damage (currently lowest pDmg of all classes at every tier)
- **Bard:** Support abilities are worthless in solo combat — consider giving bard a solo-viable damage ability
- **Rogue:** Underperforms at 28% — may need higher base weapon damage or better ability rotation

---

## 7. Open Questions for Game Design Input

1. **Should abilities consume extra attacks?** The current design makes abilities strictly worse than basic attack at L13+ because they replace all extra attacks. Is this intentional?
2. **Should bosses be immune to caster damage types?** The flavour makes sense (Mind Flayer resists psychic) but the gameplay impact is catastrophic (Psion literally cannot hurt 4 bosses).
3. **Is caster solo viability a goal?** If the game is designed around party play, low caster solo win rates may be acceptable. But if players can encounter these monsters solo via road encounters, casters need to be able to deal damage.
4. **CD 0 abilities — design intent?** Reckless Strike (CD 0) was likely designed to be usable every turn, but at L40 it prevents the warrior from ever using 3 basic attacks. Should it have a minimum CD of 1?
