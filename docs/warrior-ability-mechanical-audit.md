# Warrior Ability Mechanical Audit

**Sim Run:** cmmc4vui200007jyzsfptkuqc
**Generated:** 2026-03-04T14:52:44.188Z

## 1. Per-Ability Audit Summary

### Tier 0 (Pre-Specialization)

| Ability | Level | Effect Type | Uses | Damage | Buff/Debuff | Duration | Cooldown | Status | Overall |
|---------|-------|-------------|------|--------|-------------|----------|----------|--------|---------|
| Power Strike | L3 | damage | 343 | PASS | N/A | N/A | PASS | N/A | **PASS** |
| Defensive Stance | L3 | buff | 192 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| Intimidating Shout | L3 | debuff | 216 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| Sundering Strike | L5 | damage_debuff | 346 | FAIL | PASS | N/A | PASS | N/A | **ISSUES FOUND** |
| Second Wind | L5 | heal | 2 | PASS | N/A | N/A | PASS | N/A | **PASS** |
| Hamstring | L5 | damage_status | 215 | FAIL | N/A | N/A | PASS | PASS | **ISSUES FOUND** |
| Brutal Charge | L8 | damage | 336 | PASS | N/A | N/A | PASS | N/A | **PASS** |
| Iron Skin | L8 | buff | 110 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| War Cry | L8 | buff | 110 | N/A | PASS | N/A | PASS | N/A | **PASS** |

#### Sundering Strike — Issues (1 total)
- **MODERATE** `data_handler_mismatch` (×1): expected `bonusDamage: 2 should contribute to damage`, got `handler reads diceCount/diceSides only, defaults to 1d6`
  - Sample: Combat 6814a2fe-890..., Round 2, Actor: L8 Humans Warrior

#### Hamstring — Issues (1 total)
- **CRITICAL** `data_handler_mismatch` (×1): expected `bonusDamage: 1 should contribute to damage`, got `handler reads effects.damage (flat), not bonusDamage. Deals 0 damage.`
  - Sample: Combat b8248a18-f7d..., Round 4, Actor: L20 Humans Warrior

### Tier 1

| Ability | Level | Effect Type | Uses | Damage | Buff/Debuff | Duration | Cooldown | Status | Overall |
|---------|-------|-------------|------|--------|-------------|----------|----------|--------|---------|
| Reckless Strike | L10 | damage | 501 | PASS | N/A | N/A | N/A | N/A | **PASS** |
| Shield Bash | L10 | damage_status | 459 | PASS | N/A | N/A | PASS | PASS | **PASS** |
| Rally Cry | L10 | buff | 139 | N/A | PASS | N/A | PASS | N/A | **PASS** |

### Tier 2

| Ability | Level | Effect Type | Uses | Damage | Buff/Debuff | Duration | Cooldown | Status | Overall |
|---------|-------|-------------|------|--------|-------------|----------|----------|--------|---------|
| Blood Rage | L14 | buff | 34 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| Cleave | L20 | aoe_damage | 180 | PASS | N/A | N/A | PASS | N/A | **PASS** |
| Fortify | L14 | buff | 138 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| Taunt | L20 | status | 34 | N/A | N/A | N/A | PASS | PASS | **PASS** |
| Commanding Strike | L14 | damage | 412 | PASS | N/A | N/A | PASS | N/A | **PASS** |

### Tier 3

| Ability | Level | Effect Type | Uses | Damage | Buff/Debuff | Duration | Cooldown | Status | Overall |
|---------|-------|-------------|------|--------|-------------|----------|----------|--------|---------|
| Frenzy | L25 | multi_attack | 23 | PASS | N/A | N/A | PASS | N/A | **PASS** |
| Shield Wall | L25 | buff | 0 | N/A | N/A | N/A | N/A | N/A | **PASS** |
| Tactical Advance | L20 | buff | 34 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| Inspiring Presence | L25 | passive | 0 | N/A | N/A | N/A | N/A | N/A | **PASS** |

### Tier 4

| Ability | Level | Effect Type | Uses | Damage | Buff/Debuff | Duration | Cooldown | Status | Overall |
|---------|-------|-------------|------|--------|-------------|----------|----------|--------|---------|
| Berserker Rage | L32 | buff | 27 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| Iron Bulwark | L32 | buff | 27 | N/A | PASS | N/A | PASS | N/A | **PASS** |
| Warlords Decree | L32 | buff | 27 | N/A | PASS | N/A | PASS | N/A | **PASS** |

### Tier 5

| Ability | Level | Effect Type | Uses | Damage | Buff/Debuff | Duration | Cooldown | Status | Overall |
|---------|-------|-------------|------|--------|-------------|----------|----------|--------|---------|
| Undying Fury | L40 | passive | 0 | N/A | N/A | N/A | N/A | N/A | **PASS** |
| Unbreakable | L40 | passive | 0 | N/A | N/A | N/A | N/A | N/A | **PASS** |
| Legendary Commander | L40 | heal | 0 | N/A | N/A | N/A | N/A | N/A | **PASS** |

## 2. Duration Audit Detail

**Status effects with verifiable expiry:** 708 (691 MATCH, 17 MISMATCH)
**Buffs (expire via roundsRemaining, not in logs):** 267 (cannot verify from combat logs)

### Verifiable Status Effect Durations

| Ability | Effect | Count | Result | Sample (Applied→Expected→Actual) |
|---------|--------|-------|--------|----------------------------------|
| Taunt | taunt | 34 | MATCH | R1→R3→R3 |
| Shield Bash | stunned | 445 | MATCH | R2→R3→R3 |
| Shield Bash | stunned | 14 | MISMATCH | R50→R51→NEVER |
| Hamstring | slowed | 212 | MATCH | R4→R6→R5 |
| Hamstring | slowed | 3 | MISMATCH | R3→R5→NEVER |

### Buff Duration (Not Verifiable from Logs)

ActiveBuffs expire via `roundsRemaining` countdown in the combat engine, not via `statusEffectsExpired` in the log. These cannot be audited from log data alone.

| Buff | Instances | Expected Duration |
|------|-----------|-------------------|
| Blood Rage | 34 | 5 rounds |
| Fortify | 23 | 4 rounds |
| Iron Skin | 18 | 3 rounds |
| War Cry | 18 | 3 rounds |
| Defensive Stance | 18 | 2 rounds |
| Intimidating Shout | 18 | 2 rounds |
| Tactical Advance | 34 | ? rounds |
| Rally Cry | 23 | 4 rounds |
| Berserker Rage | 27 | 3 rounds |
| Iron Bulwark | 27 | 3 rounds |
| Warlords Decree | 27 | 3 rounds |


## 3. Cooldown Audit Detail

**Total cooldown pairs checked:** 2801 (2801 PASS, 0 VIOLATION)

| Ability | Cooldown | Pairs Checked | Passes | Violations |
|---------|----------|---------------|--------|------------|
| Power Strike | 2r | 305 | 305 | 0 |
| Cleave | 3r | 146 | 146 | 0 |
| Shield Bash | 3r | 408 | 408 | 0 |
| Sundering Strike | 3r | 308 | 308 | 0 |
| Brutal Charge | 3r | 299 | 299 | 0 |
| Fortify | 6r | 115 | 115 | 0 |
| Iron Skin | 4r | 92 | 92 | 0 |
| War Cry | 4r | 92 | 92 | 0 |
| Hamstring | 3r | 194 | 194 | 0 |
| Defensive Stance | 3r | 174 | 174 | 0 |
| Intimidating Shout | 3r | 198 | 198 | 0 |
| Commanding Strike | 3r | 354 | 354 | 0 |
| Rally Cry | 5r | 116 | 116 | 0 |


## 4. Anomalies & Failures

### CRITICAL (1)

- **Hamstring** `data_handler_mismatch` (×1):
  - Expected: bonusDamage: 1 should contribute to damage
  - Actual: handler reads effects.damage (flat), not bonusDamage. Deals 0 damage.
  - Sample: Combat b8248a18-f7d..., Round 4

### MODERATE (1)

- **Sundering Strike** `data_handler_mismatch` (×1):
  - Expected: bonusDamage: 2 should contribute to damage
  - Actual: handler reads diceCount/diceSides only, defaults to 1d6
  - Sample: Combat 6814a2fe-890..., Round 2

## 5. Untestable Abilities

| Ability | Reason |
|---------|--------|
| Undying Fury | Survive fatal blow at 1 HP — passive triggered on death. Requires specific HP scenario in logs. |
| Undying Fury | L40 ability — sim only tests up to L35. |
| Shield Wall | Zero uses found in combat logs. |
| Unbreakable | Passive bonus HP from CON — applied at combat start, not logged as class_ability. |
| Unbreakable | L40 ability — sim only tests up to L35. |
| Inspiring Presence | Passive HP regen does not appear as class_ability action. Would need to trace HoT ticks. |
| Legendary Commander | L40 ability — sim only tests up to L35. |

## 6. Known Data/Handler Mismatches

These are confirmed mismatches between ability data definitions and handler implementations:

| Ability | Data Field | Handler Reads | Impact |
|---------|-----------|---------------|--------|
| Sundering Strike | `bonusDamage: 2` | `diceCount/diceSides` (defaults 1d6) | bonusDamage ignored, deals 1d6 random instead of +2 flat |
| Second Wind | `healAmount: 8` | `diceCount/diceSides` (defaults 1d8) | healAmount ignored, heals 1-8 random instead of flat 8 |
| Hamstring | `bonusDamage: 1` | `effects.damage` (flat field) | bonusDamage ignored, deals 0 flat damage |

**Recommendation:** Fix the ability data definitions to use the field names the handlers actually read, OR update the handlers to recognize the data fields. The data→handler contract is:
- `handleDamage`: reads `bonusDamage`, `diceCount`, `diceSides` ✓
- `handleDamageDebuff`: reads `diceCount`, `diceSides` (NOT `bonusDamage`)
- `handleDamageStatus`: reads `damage` (flat), `diceCount`, `diceSides` (NOT `bonusDamage`)
- `handleHeal`: reads `diceCount`, `diceSides`, `bonusHealing`, `fullRestore` (NOT `healAmount`)
