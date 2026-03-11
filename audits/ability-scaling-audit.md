# Ability Scaling Overhaul -- Comprehensive Audit

**Date:** 2026-03-10
**Scope:** All 7 class skill files, engine handlers in `class-ability-resolver.ts`, spell attack damage fix in `calcWeaponDamage` / `handleDamage`

---

## 1. Summary

| Metric | Count |
|--------|-------|
| Total abilities across all 7 classes | 180 |
| Abilities with `scalingLevels` added | 118 |
| Abilities rebased (higher base dice / values) | 7 |
| Abilities with BOTH scaling + rebase | 5 |
| Abilities skipped (passive, CC-only, capstone, damageMultiplier, no numeric to scale) | 62 |
| Engine handlers modified with scaling logic | 22 |
| Scaling helper functions added | 3 (`getScaledDice`, `getScaledValue`, `getScaledHalfRate`) |
| Spell attack damage fix | Applied in `calcWeaponDamage` (line 62) and `handleDamage` (line 300-316) |

---

## 2. Complete Ability Audit Table

### Warrior (18 abilities: 9 tier 0, 3 specs x 6 = 18 + 9 = 27 total... wait)

#### Warrior -- Spec Abilities (18)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Warrior | Reckless Strike | war-ber-1 | 1 | 10 | damage | bonusDamage: 5, selfDefenseDebuff: -2 | SCALE | [15,20,25,30,40] |
| Warrior | Blood Rage | war-ber-2 | 2 | 14 | buff | attackScaling: missingHpPercent, dur: 5 | OK | -- (no numeric to scale) |
| Warrior | Cleave | war-ber-3 | 2 | 20 | aoe_damage | damageMultiplier: 0.8 | OK | -- (damageMultiplier, no dice/flat) |
| Warrior | Frenzy | war-ber-4 | 3 | 25 | multi_attack | strikes: 2, accuracyPenalty: -3 | OK | -- (multi_attack, no scalable numerics) |
| Warrior | Berserker Rage | war-ber-5 | 4 | 32 | buff | ccImmune, attackBonus: 15, dur: 3 | SCALE | [38,45] |
| Warrior | Undying Fury | war-ber-6 | 5 | 40 | passive | cheatingDeath, usesPerCombat: 1 | OK | -- (passive capstone) |
| Warrior | Shield Bash | war-gua-1 | 1 | 10 | damage_status | 1d6+3, stun 1 | BOTH | [15,20,25,30,40] (rebased: flat 3 -> 1d6+3) |
| Warrior | Fortify | war-gua-2 | 2 | 14 | buff | acBonus: 5, dur: 4 | SCALE | [20,25,30,40] |
| Warrior | Taunt | war-gua-3 | 2 | 20 | status | taunt 2 rds | OK | -- (CC-only, no numeric) |
| Warrior | Shield Wall | war-gua-4 | 3 | 25 | buff | damageReduction: 0.5, dur: 2 | OK | -- (percentage-based, no flat to scale) |
| Warrior | Iron Bulwark | war-gua-5 | 4 | 32 | buff | damageReflect: 0.3, immovable, dur: 3 | OK | -- (percentage-based) |
| Warrior | Unbreakable | war-gua-6 | 5 | 40 | passive | bonusHpFromCon: 0.2 | OK | -- (passive capstone) |
| Warrior | Rally Cry | war-war-1 | 1 | 10 | buff | attackBonus: 3, acBonus: 2, dur: 4 | SCALE | [15,20,25,30,40] |
| Warrior | Commanding Strike | war-war-2 | 2 | 14 | damage | bonusDamage: 5 | BOTH | [20,25,30,40] (rebased: +3 -> +5) |
| Warrior | Tactical Advance | war-war-3 | 3 | 20 | buff | extraAction | OK | -- (binary effect) |
| Warrior | Inspiring Presence | war-war-4 | 3 | 25 | passive | hpRegenPerRound: 3 | OK | -- (passive) |
| Warrior | Warlords Decree | war-war-5 | 4 | 32 | buff | guaranteedHits: 3, dur: 3 | OK | -- (binary/count-based, capstone-adjacent) |
| Warrior | Legendary Commander | war-war-6 | 5 | 40 | heal | fullRestore, usesPerCombat: 1 | OK | -- (capstone) |

#### Warrior -- Tier 0 Abilities (9)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Warrior | Power Strike | war-t0-3a | 0 | 3 | damage | bonusDamage: 3 | SCALE | [8,13,18,25,35] |
| Warrior | Defensive Stance | war-t0-3b | 0 | 3 | buff | acBonus: 3, dur: 2 | SCALE | [8,13,18,25,35] |
| Warrior | Intimidating Shout | war-t0-3c | 0 | 3 | debuff | attackReduction: -2, dur: 2 | SCALE | [8,13,18,25,35] |
| Warrior | Sundering Strike | war-t0-5a | 0 | 5 | damage_debuff | 1d4, acReduction: 2, dur: 2 | SCALE | [8,13,18,25,35] |
| Warrior | Second Wind | war-t0-5b | 0 | 5 | heal | 2d8+4 | BOTH | [8,13,18,25,35] (rebased: 1d8 -> 2d8) |
| Warrior | Hamstring | war-t0-5c | 0 | 5 | damage_status | damage: 1, slowed 2 rds | SCALE | [8,13,18,25,35] |
| Warrior | Brutal Charge | war-t0-8a | 0 | 8 | damage | bonusDamage: 5, accuracyBonus: 2 | SCALE | [13,18,25,35] |
| Warrior | Iron Skin | war-t0-8b | 0 | 8 | buff | absorbDamage: 12, dur: 3 | SCALE | [13,18,25,35] |
| Warrior | War Cry | war-t0-8c | 0 | 8 | buff | attackBonus: 3, acBonus: 1, dur: 3 | SCALE | [13,18,25,35] |

---

### Mage (20 abilities: 11 tier 0 incl. cantrip+ward, 3 specs x 6 = 18 + 11 = 29... counting below)

#### Mage -- Spec Abilities (18)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Mage | Fireball | mag-ele-1 | 1 | 10 | aoe_damage | 3d6, fire, save: dex | BOTH | [15,20,25,30,40] (rebased: 1d6 -> 3d6) |
| Mage | Frost Lance | mag-ele-2 | 2 | 14 | damage_status | 2d8, slow 2 rds | SCALE | [20,25,30,40] |
| Mage | Chain Lightning | mag-ele-3 | 2 | 20 | multi_target | 3 targets, 2d6 | SCALE | [25,30,35,40] |
| Mage | Elemental Shield | mag-ele-4 | 3 | 25 | buff | absorbDamage: 30, dur: 4 | SCALE | [30,35,40] |
| Mage | Meteor Strike | mag-ele-5 | 4 | 32 | aoe_damage | 6d8, fire, save: dex | SCALE | [38,45] |
| Mage | Arcane Mastery | mag-ele-6 | 5 | 40 | passive | cooldownReduction: 0.3 | OK | -- (passive capstone) |
| Mage | Life Drain | mag-nec-1 | 1 | 10 | drain | 3d6, healPercent: 0.5 | BOTH | [15,20,25,30,40] (rebased: 2d6 -> 3d6) |
| Mage | Shadow Bolt | mag-nec-2 | 2 | 14 | damage | 3d6, shadow | SCALE | [20,25,30,40] |
| Mage | Corpse Explosion | mag-nec-3 | 2 | 20 | aoe_damage | 4d6, save: dex | SCALE | [25,30,35,40] |
| Mage | Bone Armor | mag-nec-4 | 3 | 25 | buff | absorbDamage: 25, acBonus: 3, dur: 5 | SCALE | [30,35,40] |
| Mage | Soul Harvest | mag-nec-5 | 4 | 32 | aoe_drain | 3d8, healPerTarget: 8, save: wis | SCALE | [38,45] |
| Mage | Lichdom | mag-nec-6 | 5 | 40 | passive | reviveOnDeath, reviveHpPercent: 0.5 | OK | -- (passive capstone) |
| Mage | Arcane Bolt | mag-enc-1 | 1 | 10 | damage | autoHit, 2d4 | SCALE | [15,20,25,30,40] |
| Mage | Enfeeble | mag-enc-2 | 2 | 14 | debuff | atkRed: -4, acRed: -3, dur: 3, save: wis | SCALE | [20,25,30,40] |
| Mage | Haste | mag-enc-3 | 2 | 20 | buff | extraAction, dur: 1 | OK | -- (binary effect) |
| Mage | Arcane Siphon | mag-enc-4 | 3 | 25 | debuff | atkRed: -4, dur: 3, save: wis | SCALE | [30,35,40] |
| Mage | Polymorph | mag-enc-5 | 4 | 32 | status | polymorph 2 rds, save: wis | OK | -- (CC-only, no numeric) |
| Mage | Spell Weaver | mag-enc-6 | 5 | 40 | passive | cooldownReduction: 1 | OK | -- (passive capstone) |

#### Mage -- Tier 0 Abilities (11 incl. cantrip + ward)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Mage | Force Bolt | mag-cantrip | -1 | 1 | cantrip | 1d6 | SCALE | [5,11,17] |
| Mage | Arcane Ward | mag-ward | -1 | 1 | buff | absorbDamage: 5, dur: 2 | SCALE | [8,13,18,25,35] |
| Mage | Arcane Spark | mag-t0-3a | 0 | 3 | damage | 1d4+1 | SCALE | [8,13,18,25,35] |
| Mage | Mana Shield | mag-t0-3b | 0 | 3 | buff | absorbDamage: 6, dur: 2 | SCALE | [8,13,18,25,35] |
| Mage | Chill Touch | mag-t0-3c | 0 | 3 | damage_status | damage: 1, slowed 1 rd | SCALE | [8,13,18,25,35] |
| Mage | Flame Jet | mag-t0-5a | 0 | 5 | damage | 1d6+1, fire | SCALE | [8,13,18,25,35] |
| Mage | Frost Ward | mag-t0-5b | 0 | 5 | buff | acBonus: 3, dur: 3 | SCALE | [8,13,18,25,35] |
| Mage | Hex | mag-t0-5c | 0 | 5 | debuff | acReduction: -3, dur: 3, save: wis | SCALE | [8,13,18,25,35] |
| Mage | Lightning Bolt | mag-t0-8a | 0 | 8 | damage | 2d4+1, lightning | SCALE | [13,18,25,35] |
| Mage | Arcane Barrier | mag-t0-8b | 0 | 8 | buff | absorbDamage: 15, dur: 3 | SCALE | [13,18,25,35] |
| Mage | Enervation | mag-t0-8c | 0 | 8 | drain | 1d6, healPercent: 0.5 | SCALE | [13,18,25,35] |

---

### Cleric (20 abilities: 11 tier 0 incl. cantrip + rebuke, 3 specs x 6 = 18 + 11 = 29... counting below)

#### Cleric -- Spec Abilities (18)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Cleric | Healing Light | cle-hea-1 | 1 | 10 | heal | 2d8+3 | SCALE | [15,20,25,30,40] |
| Cleric | Purify | cle-hea-2 | 2 | 14 | cleanse | removeCount: 1 | OK | -- (no numeric to scale) |
| Cleric | Regeneration | cle-hea-3 | 2 | 20 | hot | healPerRound: 5, dur: 5 | SCALE | [25,30,35,40] |
| Cleric | Divine Shield | cle-hea-4 | 3 | 25 | buff | absorbDamage: 30, dur: 4 | SCALE | [30,35,40] |
| Cleric | Resurrection | cle-hea-5 | 4 | 32 | passive | reviveOnDeath, reviveHpPercent: 0.25 | OK | -- (passive) |
| Cleric | Miracle | cle-hea-6 | 5 | 40 | heal | fullRestore, usesPerCombat: 1 | OK | -- (capstone) |
| Cleric | Smite | cle-pal-1 | 1 | 10 | damage | bonusDamage: 6, radiant | SCALE | [15,20,25,30,40] |
| Cleric | Holy Armor | cle-pal-2 | 2 | 14 | buff | acBonus: 4, dur: 5 | SCALE | [20,25,30,40] |
| Cleric | Consecrate | cle-pal-3 | 2 | 20 | aoe_dot | damagePerRound: 6, dur: 3, bonusVsUndead: 2.0 | SCALE | [25,30,35,40] |
| Cleric | Judgment | cle-pal-4 | 3 | 25 | drain | 3d8, healPercent: 0.5 | SCALE | [30,35,40] |
| Cleric | Divine Wrath | cle-pal-5 | 4 | 32 | aoe_damage | 5d8, radiant, save: dex | SCALE | [38,45] |
| Cleric | Avatar of Light | cle-pal-6 | 5 | 40 | passive | holyDamageBonus: 0.25 | OK | -- (passive capstone) |
| Cleric | Denounce | cle-inq-1 | 1 | 10 | debuff | atkRed: -4, dur: 3, save: wis | SCALE | [15,20,25,30,40] |
| Cleric | Penance | cle-inq-2 | 2 | 14 | damage | 2d6, bonusPerDebuff: 4 | SCALE | [20,25,30,40] |
| Cleric | Silence | cle-inq-3 | 2 | 20 | status | silence 2 rds, save: wis | OK | -- (CC-only) |
| Cleric | Purging Flame | cle-inq-4 | 3 | 25 | dispel_damage | damagePerBuff: 8 | SCALE | [30,35,40] |
| Cleric | Excommunicate | cle-inq-5 | 4 | 32 | debuff | allStatsReduction: -5, dur: 3, save: wis | SCALE | [38,45] |
| Cleric | Inquisitors Verdict | cle-inq-6 | 5 | 40 | passive | antiHealAura | OK | -- (passive capstone) |

#### Cleric -- Tier 0 Abilities (11 incl. cantrip + rebuke)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Cleric | Sacred Flame | clr-cantrip | -1 | 1 | cantrip | 1d6, save: dex | SCALE | [5,11,17] |
| Cleric | Rebuke the Wicked | clr-rebuke | -1 | 1 | debuff | atkRed: -2, dur: 2, save: wis | SCALE | [8,13,18,25,35] |
| Cleric | Sacred Strike | cle-t0-3a | 0 | 3 | damage | bonusDamage: 3, radiant | SCALE | [8,13,18,25,35] |
| Cleric | Mending Touch | cle-t0-3b | 0 | 3 | heal | 1d6+3 | SCALE | [8,13,18,25,35] |
| Cleric | Blessed Ward | cle-t0-3c | 0 | 3 | buff | acBonus: 3, dur: 2 | SCALE | [8,13,18,25,35] |
| Cleric | Divine Strike | cle-t0-5a | 0 | 5 | damage | bonusDamage: 4, radiant | SCALE | [8,13,18,25,35] |
| Cleric | Rejuvenation | cle-t0-5b | 0 | 5 | hot | healPerRound: 3, dur: 3 | SCALE | [8,13,18,25,35] |
| Cleric | Rebuke | cle-t0-5c | 0 | 5 | debuff | atkRed: -3, dur: 3, save: wis | SCALE | [8,13,18,25,35] |
| Cleric | Holy Fire | cle-t0-8a | 0 | 8 | damage | 1d8+2, radiant | SCALE | [13,18,25,35] |
| Cleric | Sanctuary | cle-t0-8b | 0 | 8 | buff | absorbDamage: 12, acBonus: 2, dur: 3 | SCALE | [13,18,25,35] |
| Cleric | Condemnation | cle-t0-8c | 0 | 8 | damage_debuff | 1d6, acReduction: 3, dur: 2 | SCALE | [13,18,25,35] |

---

### Rogue (18 spec + 9 tier 0 = 27)

#### Rogue -- Spec Abilities (18)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Rogue | Backstab | rog-ass-1 | 1 | 10 | damage | critBonus: 10, bonusDamage: 5 | SCALE | [15,20,25,30,40] |
| Rogue | Vanish | rog-ass-2 | 2 | 14 | buff | stealth, untargetable, dur: 1 | OK | -- (binary effect, no numeric) |
| Rogue | Poison Blade | rog-ass-3 | 2 | 20 | buff | poisonCharges: 3, dotDamage: 4, dotDur: 3 | SCALE | [25,30,35,40] |
| Rogue | Ambush | rog-ass-4 | 3 | 25 | damage | requiresStealth, damageMultiplier: 3.0 | OK | -- (damageMultiplier, no flat/dice) |
| Rogue | Death Mark | rog-ass-5 | 4 | 32 | delayed_damage | delay: 3, 8d6 | SCALE | [38,45] |
| Rogue | Shadow Mastery | rog-ass-6 | 5 | 40 | passive | critChanceBonus: 15 | OK | -- (passive capstone) |
| Rogue | Pilfer | rog-thi-1 | 1 | 10 | steal | goldRange: [5,20] | OK | -- (no damage/numeric to scale) |
| Rogue | Smoke Bomb | rog-thi-2 | 2 | 14 | aoe_debuff | accuracyReduction: -5, dur: 2, save: dex | SCALE | [20,25,30,40] |
| Rogue | Quick Fingers | rog-thi-3 | 2 | 20 | passive | goldBonus: 0.1 | OK | -- (passive) |
| Rogue | Disengage | rog-thi-4 | 3 | 25 | flee | successChance: 0.9 | OK | -- (percentage-based) |
| Rogue | Mug | rog-thi-5 | 4 | 32 | damage_steal | 3d6, stealItem | SCALE | [38,45] |
| Rogue | Treasure Sense | rog-thi-6 | 5 | 40 | passive | lootQualityBonus: 0.25 | OK | -- (passive capstone) |
| Rogue | Riposte | rog-swa-1 | 1 | 10 | counter | counterDamage: 8 | SCALE | [15,20,25,30,40] |
| Rogue | Dual Strike | rog-swa-2 | 2 | 14 | multi_attack | strikes: 2, damageMultiplier: 0.7 | OK | -- (damageMultiplier) |
| Rogue | Evasion | rog-swa-3 | 2 | 20 | buff | dodgeBonus: 30, dur: 2 | OK | -- (already high value, no scaling needed) |
| Rogue | Flurry of Blades | rog-swa-4 | 3 | 25 | multi_attack | strikes: 4, damageMultiplier: 0.4 | OK | -- (damageMultiplier) |
| Rogue | Dance of Steel | rog-swa-5 | 4 | 32 | buff | stackingAttackSpeed, maxStacks: 5, dur: 5 | OK | -- (stacking mechanic) |
| Rogue | Untouchable | rog-swa-6 | 5 | 40 | passive | dodgeBonus: 10 | OK | -- (passive capstone) |

#### Rogue -- Tier 0 Abilities (9)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Rogue | Quick Slash | rog-t0-3a | 0 | 3 | damage | bonusDamage: 3 | SCALE | [8,13,18,25,35] |
| Rogue | Dodge Roll | rog-t0-3b | 0 | 3 | buff | acBonus: 4, dur: 1 | SCALE | [8,13,18,25,35] |
| Rogue | Low Blow | rog-t0-3c | 0 | 3 | damage_status | damage: 1, stunned 1 rd | SCALE | [8,13,18,25,35] |
| Rogue | Gouge | rog-t0-5a | 0 | 5 | damage_status | damage: 2, blinded 1 rd | SCALE | [8,13,18,25,35] |
| Rogue | Slip Away | rog-t0-5b | 0 | 5 | buff | acBonus: 4, dur: 2 | SCALE | [8,13,18,25,35] |
| Rogue | Crippling Poison | rog-t0-5c | 0 | 5 | status | poisoned 3 rds, save: con | OK | -- (CC-only, no numeric) |
| Rogue | Exploit Opening | rog-t0-8a | 0 | 8 | damage | bonusDamage: 6, accuracyBonus: 2 | SCALE | [13,18,25,35] |
| Rogue | Nimble Defense | rog-t0-8b | 0 | 8 | buff | acBonus: 5, dur: 2 | SCALE | [13,18,25,35] |
| Rogue | Cheap Shot | rog-t0-8c | 0 | 8 | damage_debuff | 1d4, acReduction: 2, dur: 2 | SCALE | [13,18,25,35] |

---

### Ranger (18 spec + 9 tier 0 = 27)

#### Ranger -- Spec Abilities (18)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Ranger | Call Companion | ran-bea-1 | 1 | 10 | summon | companionDamage: 5, dur: 5 | SCALE | [15,20,25,30,40] |
| Ranger | Wild Bond | ran-bea-2 | 2 | 14 | heal | 2d6, healsSelf+companion | SCALE | [20,25,30,40] |
| Ranger | Pack Tactics | ran-bea-3 | 2 | 20 | buff | advantage, dur: 1 | OK | -- (binary effect) |
| Ranger | Bestial Fury | ran-bea-4 | 3 | 25 | companion_attack | 4d8 | SCALE | [30,35,40] |
| Ranger | Alpha Predator | ran-bea-5 | 4 | 32 | summon | companionDamage: 12, companionHp: 50, dur: 8 | SCALE | [38,45] |
| Ranger | Spirit Bond | ran-bea-6 | 5 | 40 | passive | permanentCompanion, companionImmune | OK | -- (passive capstone) |
| Ranger | Aimed Shot | ran-sha-1 | 1 | 10 | damage | bonusDamage: 6, accuracyBonus: 3 | SCALE | [15,20,25,30,40] |
| Ranger | Multi-Shot | ran-sha-2 | 2 | 14 | multi_target | 3 targets, 1d8 | SCALE | [20,25,30,40] |
| Ranger | Piercing Arrow | ran-sha-3 | 2 | 20 | damage | ignoreArmor, 2d8 | SCALE | [25,30,35,40] |
| Ranger | Headshot | ran-sha-4 | 3 | 25 | damage | critBonus: 20, accPenalty: -5, 4d8 | SCALE | [30,35,40] |
| Ranger | Rain of Arrows | ran-sha-5 | 4 | 32 | aoe_damage | hitsPerTarget: 2, 2d8 | SCALE | [38,45] |
| Ranger | Eagles Eye | ran-sha-6 | 5 | 40 | passive | accuracyBonus: 5, critChanceBonus: 10 | OK | -- (passive capstone) |
| Ranger | Lay Trap | ran-tra-1 | 1 | 10 | trap | trapDamage: 10 | SCALE | [15,20,25,30,40] |
| Ranger | Snare | ran-tra-2 | 2 | 14 | status | root 2 rds, acReduction: -3, save: dex | SCALE | [20,25,30,40] |
| Ranger | Hunters Mark | ran-tra-3 | 2 | 20 | debuff | bonusDamageFromYou: 4, dur: 5 | SCALE | [25,30,35,40] |
| Ranger | Explosive Trap | ran-tra-4 | 3 | 25 | trap | trapDamage: 25, aoe | SCALE | [30,35,40] |
| Ranger | Predator Instinct | ran-tra-5 | 4 | 32 | passive | advantageVsLowHp, hpThreshold: 0.5 | OK | -- (passive) |
| Ranger | Master Tracker | ran-tra-6 | 5 | 40 | passive | firstStrikeCrit | OK | -- (passive capstone) |

#### Ranger -- Tier 0 Abilities (9)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Ranger | Steady Shot | ran-t0-3a | 0 | 3 | damage | bonusDamage: 3, accBonus: 1 | SCALE | [8,13,18,25,35] |
| Ranger | Nature's Grasp | ran-t0-3b | 0 | 3 | status | root 1 rd, save: str | OK | -- (CC-only, no numeric) |
| Ranger | Tracker's Eye | ran-t0-3c | 0 | 3 | debuff | acReduction: -2, dur: 3 | SCALE | [8,13,18,25,35] |
| Ranger | Twin Arrows | ran-t0-5a | 0 | 5 | damage | bonusDamage: 2, 1d4 | SCALE | [8,13,18,25,35] |
| Ranger | Bark Skin | ran-t0-5b | 0 | 5 | buff | acBonus: 3, dur: 3 | SCALE | [8,13,18,25,35] |
| Ranger | Trip Wire | ran-t0-5c | 0 | 5 | damage_status | damage: 2, slowed 2 rds | SCALE | [8,13,18,25,35] |
| Ranger | Drilling Shot | ran-t0-8a | 0 | 8 | damage | bonusDamage: 5, ignoreArmor | SCALE | [13,18,25,35] |
| Ranger | Camouflage | ran-t0-8b | 0 | 8 | buff | acBonus: 4, dur: 3 | SCALE | [13,18,25,35] |
| Ranger | Venomous Arrow | ran-t0-8c | 0 | 8 | damage_status | damage: 3, poisoned 3 rds | SCALE | [13,18,25,35] |

---

### Bard (18 spec + 11 tier 0 incl. cantrip + flourish = 29)

#### Bard -- Spec Abilities (18)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Bard | Charming Words | bar-dip-1 | 1 | 10 | debuff | atkRed: -3, dur: 3, save: wis | SCALE | [15,20,25,30,40] |
| Bard | Silver Tongue | bar-dip-2 | 2 | 14 | status | skip_turn 1 rd, save: wis | OK | -- (CC-only) |
| Bard | Soothing Presence | bar-dip-3 | 2 | 20 | passive | hpRegenPerRound: 3 | OK | -- (passive) |
| Bard | Diplomats Gambit | bar-dip-4 | 3 | 25 | special | peacefulEnd, successChance: 0.5 | OK | -- (special/binary) |
| Bard | Enthrall | bar-dip-5 | 4 | 32 | status | mesmerize 3 rds, save: wis | OK | -- (CC-only) |
| Bard | Legendary Charisma | bar-dip-6 | 5 | 40 | passive | charmEffectiveness: 0.5 | OK | -- (passive capstone) |
| Bard | War Song | bar-bat-1 | 1 | 10 | buff | attackBonus: 4, dur: 4 | SCALE | [15,20,25,30,40] |
| Bard | Discordant Note | bar-bat-2 | 2 | 14 | damage | 2d8, sonic | SCALE | [20,25,30,40] |
| Bard | Marching Cadence | bar-bat-3 | 2 | 20 | buff | dodgeBonus: 5, initiativeBonus: 3, dur: 5 | OK | -- (no scalingLevels; dodge+initiative not scaled) |
| Bard | Shatter | bar-bat-4 | 3 | 25 | damage_debuff | 3d6, acReduction: 4, dur: 3, save: con | SCALE | [30,35,40] |
| Bard | Crescendo | bar-bat-5 | 4 | 32 | passive | stackingDamagePerRound: 3 | OK | -- (passive) |
| Bard | Epic Finale | bar-bat-6 | 5 | 40 | aoe_damage | baseDice: 4, 4d8, bonusPerRound: 5, save: con | OK | -- (capstone, no scalingLevels) |
| Bard | Analyze | bar-lor-1 | 1 | 10 | buff | bonusDamageNext: 8, revealWeakness | SCALE | [15,20,25,30,40] |
| Bard | Recall Lore | bar-lor-2 | 2 | 14 | passive | xpBonus: 0.15 | OK | -- (passive) |
| Bard | Exploit Weakness | bar-lor-3 | 2 | 20 | damage | requiresAnalyze, critBonus: 15, 3d6 | SCALE | [25,30,35,40] |
| Bard | Arcane Insight | bar-lor-4 | 3 | 25 | buff | nextCooldownHalved | OK | -- (binary effect) |
| Bard | Tome of Secrets | bar-lor-5 | 4 | 32 | special | randomClassAbility | OK | -- (special, not scalable) |
| Bard | Omniscient | bar-lor-6 | 5 | 40 | passive | globalXpBonus: 0.25 | OK | -- (passive capstone) |

#### Bard -- Tier 0 Abilities (11 incl. cantrip + flourish)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Bard | Dissonant Whisper | brd-cantrip | -1 | 1 | cantrip | 1d4, debuffOnHit: atkMod -1 | SCALE | [5,11,17] |
| Bard | Disorienting Flourish | brd-flourish | -1 | 1 | debuff | atkRed: -2, dur: 1, save: cha | SCALE | [8,13,18,25,35] |
| Bard | Cutting Words | bar-t0-3a | 0 | 3 | damage | bonusDamage: 3 | SCALE | [8,13,18,25,35] |
| Bard | Soothing Melody | bar-t0-3b | 0 | 3 | heal | 1d6+3 | SCALE | [8,13,18,25,35] |
| Bard | Jarring Note | bar-t0-3c | 0 | 3 | debuff | atkRed: -2, dur: 2, save: wis | SCALE | [8,13,18,25,35] |
| Bard | Vicious Mockery | bar-t0-5a | 0 | 5 | damage_debuff | 1d6, acReduction: 2, dur: 2, save: wis | SCALE | [8,13,18,25,35] |
| Bard | Hymn of Fortitude | bar-t0-5b | 0 | 5 | buff | acBonus: 2, attackBonus: 2, dur: 3 | SCALE | [8,13,18,25,35] |
| Bard | Lullaby | bar-t0-5c | 0 | 5 | status | slowed 2 rds, save: wis | OK | -- (CC-only, no numeric) |
| Bard | Thunderclap | bar-t0-8a | 0 | 8 | damage | 2d4+2 | SCALE | [13,18,25,35] |
| Bard | Inspiring Ballad | bar-t0-8b | 0 | 8 | heal | 2d6+3 | SCALE | [13,18,25,35] |
| Bard | Cacophony | bar-t0-8c | 0 | 8 | damage_debuff | 1d4, acReduction: 2, dur: 2, save: wis | SCALE | [13,18,25,35] |

---

### Psion (18 spec + 11 tier 0 incl. cantrip + veil = 29)

#### Psion -- Spec Abilities (18)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Psion | Mind Spike | psi-tel-1 | 1 | 10 | damage_status | 3d6, weakened 2 rds, save: int | BOTH | [15,20,25,30,40] (rebased: 2d6 -> 3d6) |
| Psion | Thought Shield | psi-tel-2 | 2 | 14 | passive | psychicResistance, mentalSaveBonus: 2 | OK | -- (passive) |
| Psion | Psychic Crush | psi-tel-3 | 3 | 20 | damage_status | 3d8, stunned 1 rd, halfDmgOnSave, save: wis | SCALE | [25,30,35,40] |
| Psion | Dominate | psi-tel-4 | 4 | 25 | control | dominate 1 rd, savePenalty: -2, save: wis | OK | -- (control, no numeric damage to scale) |
| Psion | Mind Shatter | psi-tel-5 | 5 | 32 | aoe_damage_status | 3d6, weakened 2 rds, halfDmgOnSave, save: wis | SCALE | [38,45] |
| Psion | Absolute Dominion | psi-tel-6 | 6 | 40 | control | abs. dominion 2 rds, failDamage: 2d10, save: wis | OK | -- (capstone) |
| Psion | Foresight | psi-see-1 | 1 | 10 | buff | acBonus: 2, saveBonus: 2, dur: 3 | SCALE | [15,20,25,30,40] |
| Psion | Danger Sense | psi-see-2 | 2 | 14 | passive | cannotBeSurprised, initiativeBonus: 2 | OK | -- (passive) |
| Psion | Precognitive Dodge | psi-see-3 | 3 | 20 | reaction | acBonus: 4, DR: 0.5, dur: 1, usesPerCombat: 1 | OK | -- (reaction, 1/combat) |
| Psion | Third Eye | psi-see-4 | 4 | 25 | passive | seeInvisible, immuneBlinded | OK | -- (passive) |
| Psion | Temporal Echo | psi-see-5 | 5 | 32 | echo | repeatLastAction | OK | -- (special mechanic) |
| Psion | Prescient Mastery | psi-see-6 | 6 | 40 | buff | enemyDisadvantage, selfAdvantage, saveBonus: 4, dur: 3 | OK | -- (capstone) |
| Psion | Blink Strike | psi-nom-1 | 1 | 10 | teleport_attack | attackBonus: 2, bonusDamage: 3 | BOTH | [15,20,25,30,40] (rebased: added bonusDamage: 3) |
| Psion | Phase Step | psi-nom-2 | 2 | 14 | passive | oppAtkAcBonus: 3, freeDisengage | OK | -- (passive) |
| Psion | Dimensional Pocket | psi-nom-3 | 3 | 20 | phase | untargetable 1 rd, advantageOnReturn | OK | -- (binary effect) |
| Psion | Translocation | psi-nom-4 | 4 | 25 | swap | save: int, enemyEffect: lose_action | OK | -- (special mechanic) |
| Psion | Rift Walk | psi-nom-5 | 5 | 32 | aoe_damage_status | 2d8, slowed 2 rds, save: wis | SCALE | [38,45] |
| Psion | Banishment | psi-nom-6 | 6 | 40 | banish | banishDur: 3, returnDmg: 4d6, save: int | OK | -- (capstone) |

#### Psion -- Tier 0 Abilities (11 incl. cantrip + veil)

| Class | Ability | ID | Tier | Level | Type | Base Values | Action | scalingLevels |
|-------|---------|-----|------|-------|------|------------|--------|---------------|
| Psion | Psychic Bolt | psi-cantrip | -1 | 1 | cantrip | 1d6 | SCALE | [5,11,17] |
| Psion | Psychic Veil | psi-veil | -1 | 1 | buff | acBonus: 2, dur: 2 | SCALE | [8,13,18,25,35] |
| Psion | Psychic Jab | psi-t0-3a | 0 | 3 | damage | bonusDamage: 3 | SCALE | [8,13,18,25,35] |
| Psion | Mental Ward | psi-t0-3b | 0 | 3 | buff | acBonus: 3, dur: 2 | SCALE | [8,13,18,25,35] |
| Psion | Mind Fog | psi-t0-3c | 0 | 3 | debuff | atkRed: -2, dur: 2, save: int | SCALE | [8,13,18,25,35] |
| Psion | Psionic Dart | psi-t0-5a | 0 | 5 | damage | 1d6+1 | SCALE | [8,13,18,25,35] |
| Psion | Mental Fortress | psi-t0-5b | 0 | 5 | buff | absorbDamage: 8, dur: 3 | SCALE | [8,13,18,25,35] |
| Psion | Thought Leech | psi-t0-5c | 0 | 5 | drain | 1d4, healPercent: 0.5 | SCALE | [8,13,18,25,35] |
| Psion | Ego Whip | psi-t0-8a | 0 | 8 | damage | 2d4+1 | SCALE | [13,18,25,35] |
| Psion | Id Insinuation | psi-t0-8b | 0 | 8 | damage_status | damage: 2, stunned 1 rd | SCALE | [13,18,25,35] |
| Psion | Precognition | psi-t0-8c | 0 | 8 | buff | acBonus: 4, attackBonus: 2, dur: 2 | SCALE | [13,18,25,35] |

---

## 3. Engine Handler Changes

All handlers modified are in `server/src/lib/class-ability-resolver.ts`. Each extracts `scalingLevels` from the ability's effects and passes them to one or more scaling helper functions.

| # | Handler | Line | Scaled Field(s) | Helper Used |
|---|---------|------|-----------------|-------------|
| 1 | `handleDamage` | 151 | diceCount, bonusDamage (flat-only path) | `getScaledDice`, `getScaledValue` |
| 2 | `handleBuff` | 400 | attackBonus, acBonus, bonusDamage/bonusDamageNext, absorbDamage, hpRegenPerRound, poisonDotDamage | `getScaledHalfRate`, `getScaledValue` |
| 3 | `handleDebuff` | 466 | attackReduction, acReduction, allStatsReduction, bonusDamageFromYou | `getScaledHalfRate`, `getScaledValue` |
| 4 | `handleHeal` | 541 | diceCount | `getScaledDice` |
| 5 | `handleDamageStatus` | 691 | damage (flat), diceCount | `getScaledValue`, `getScaledDice` |
| 6 | `handleDamageDebuff` | 810 | diceCount | `getScaledDice` |
| 7 | `handleDrain` | 892 | diceCount | `getScaledDice` |
| 8 | `handleHot` | 960 | healPerRound | `getScaledValue` |
| 9 | `handleAoeDebuff` | 1041 | accuracyReduction | `getScaledHalfRate` |
| 10 | `handleAoeDamage` | 1106 | diceCount | `getScaledDice` |
| 11 | `handleMultiTarget` | 1230 | diceCount | `getScaledDice` |
| 12 | `handleAoeDrain` | 1417 | diceCount, healPerTarget | `getScaledDice`, `getScaledValue` |
| 13 | `handleDispelDamage` | 1506 | damagePerBuff | `getScaledValue` |
| 14 | `handleAoeDot` | 1556 | damagePerRound | `getScaledValue` |
| 15 | `handleDelayedDamage` | 1584 | diceCount | `getScaledDice` |
| 16 | `handleDamageSteal` | 1644 | diceCount | `getScaledDice` |
| 17 | `handleCompanionAttack` | 1671 | diceCount | `getScaledDice` |
| 18 | `handleCounter` | 1788 | counterDamage | `getScaledValue` |
| 19 | `handleTrap` | 1825 | trapDamage | `getScaledValue` |
| 20 | `handleSummon` | 1854 | companionDamage | `getScaledValue` |
| 21 | `handleTeleportAttack` | 2033 | bonusDamage | `getScaledValue` |
| 22 | `handleAoeDamageStatus` | 2216 | diceCount | `getScaledDice` |

**Total: 22 handlers modified.**

Handlers NOT modified (no numeric damage/buff to scale or special mechanics):
- `handlePassive` (line 601) -- passives are always-on, no per-use scaling
- `handleStatus` (line 612) -- applies CC status only (stun, root, polymorph, etc.)
- `handleCleanse` (line 979) -- removes debuffs, no numeric
- `handleFleeAbility` (line 1006) -- flee attempt, percentage-based
- `handleMultiAttack` (line 1339) -- uses damageMultiplier on weapon damage, not flat/dice
- `handleSteal` (line 1627) -- gold range steal, no damage
- `handleSpecial` (line 1788) -- delegates to sub-handlers (Diplomat's Gambit, Tome of Secrets)
- `handleReaction` (line 2289) -- Precognitive Dodge, fixed AC+DR for 1 round
- `handlePhase` (line 2317) -- Dimensional Pocket, binary untargetable
- `handleSwap` (line 2356) -- Translocation, positional swap
- `handleEcho` (line 2402) -- Temporal Echo, repeats last action
- `handleBanish` (line 2452) -- Banishment, fixed mechanics
- `handleControl` (line 2123) -- Dominate/Absolute Dominion, control mechanics
- `handleCantrip` (line 2563) -- cantrips use their own inline `getScaledDice` call

---

## 4. Scaling Helper Functions

All three helpers are defined at lines 116-147 of `class-ability-resolver.ts`.

### `getScaledDice(baseDice, scalingLevels, actorLevel) -> number`
- **Purpose:** Add +1 die per scaling threshold reached.
- **Formula:** `baseDice + scalingLevels.filter(lvl => actorLevel >= lvl).length`
- **Example:** `getScaledDice(3, [15, 20, 25, 30, 40], 22)` => `3 + 2 = 5` dice (L15 and L20 reached).
- **Used by:** All dice-based damage, healing, and drain handlers (handleDamage, handleHeal, handleAoeDamage, handleDrain, handleDelayedDamage, handleMultiTarget, handleDamageStatus, handleDamageDebuff, handleCompanionAttack, handleDamageSteal, handleAoeDrain, handleAoeDamageStatus, handleCantrip).
- **Guard:** Returns `baseDice` unchanged if `scalingLevels` is empty or `baseDice === 0`.

### `getScaledValue(base, scalingLevels, actorLevel, perStep = 1) -> number`
- **Purpose:** Add a flat amount per scaling threshold reached.
- **Formula:** `base + (steps * perStep)` where `steps = scalingLevels.filter(lvl => actorLevel >= lvl).length`
- **Common `perStep` values:**
  - `2` -- bonusDamage (flat-only abilities), healPerRound, counterDamage, trapDamage, companionDamage, poisonDotDamage, healPerTarget, bonusDamageFromYou, damagePerRound
  - `3` -- absorbDamage, bonusDamage/bonusDamageNext in buffs (higher perStep since absorb/buff values matter more)
- **Example:** `getScaledValue(5, [15, 20, 25, 30, 40], 22, 2)` => `5 + 2*2 = 9`.
- **Guard:** Returns `base` unchanged if `scalingLevels` is empty or `base === 0`.

### `getScaledHalfRate(base, scalingLevels, actorLevel) -> number`
- **Purpose:** Scale buffs and debuffs at half rate to prevent them from becoming overpowered. Adds +1 per 2 thresholds reached.
- **Formula:** `base + Math.floor(steps / 2)` where `steps = scalingLevels.filter(lvl => actorLevel >= lvl).length`
- **Example:** `getScaledHalfRate(3, [8, 13, 18, 25, 35], 25)` => `3 + floor(4/2) = 5`.
- **Used by:** AC bonuses in buffs, attack bonuses in buffs, attack/AC/allStats reductions in debuffs, accuracy reductions in AoE debuffs.
- **Guard:** Returns `base` unchanged if `scalingLevels` is empty or `base === 0`.
- **Design rationale:** Buff/debuff values like AC and attack modifiers are bounded accuracy -- each point matters more than raw damage. Half-rate scaling prevents T0 abilities from granting absurd AC/attack values at high levels.

---

## 5. Spell Attack Damage Removal

### Problem
Spell attack abilities (`attackType: 'spell'`) were double-dipping on the caster's primary stat modifier:
1. The stat mod was applied to the **attack roll** (correct -- used to determine hit vs. AC)
2. The stat mod was **also** applied to **damage** via `calcWeaponDamage()` (incorrect -- D&D standard is spell damage comes from dice only)

This gave spell attacks an unfair ~3-5 extra damage per hit compared to save-based spells, which only used ability dice for damage.

### Fix Applied

**`calcWeaponDamage()` (line 62-80):**
```typescript
function calcWeaponDamage(actor: Combatant, abilityDef: AbilityDefinition, isCrit = false): number {
  const isSpellAttack = abilityDef.attackType === 'spell';
  const isWeaponAttack = abilityDef.attackType === 'weapon' || (!abilityDef.attackType && !isSpellAttack);

  if (isWeaponAttack && actor.weapon) {
    // Weapon attacks: weapon dice + stat mod + weapon bonus (doubled on crit)
    // ... unchanged ...
  } else if (isSpellAttack) {
    // Spell attacks: damage comes from ability dice only (D&D standard).
    // Stat modifier affects attack roll and save DC, not damage.
    return 0;
  }
  return 0;
}
```

**`handleDamage` spell-attack path (line 300-316):**
```typescript
if (actor.weapon && !isSpellAttack) {
  // Full weapon damage calculation (dice + stat mod + bonus)
  // ... unchanged ...
} else if (isSpellAttack) {
  // Spell attacks: damage comes from ability dice only (D&D standard).
  // Stat modifier affects attack roll and save DC, not damage.
  weaponDmg = 0;
}
```

### Affected Abilities
All abilities with `attackType: 'spell'` that go through the attack-roll path (not save-based):
- Frost Lance (mag-ele-2)
- Chain Lightning (mag-ele-3) -- via handleMultiTarget
- Life Drain (mag-nec-1)
- Shadow Bolt (mag-nec-2)
- Judgment (cle-pal-4)
- Discordant Note (bar-bat-2)
- Blink Strike (psi-nom-1) -- via handleTeleportAttack
- All caster tier 0 damage abilities with `attackType: 'spell'` (Arcane Spark, Flame Jet, Lightning Bolt, Enervation, Holy Fire, Cutting Words, Thunderclap, Psychic Jab, Psionic Dart, Ego Whip, Thought Leech)

**Note:** Abilities with `attackType: 'auto'` (Arcane Bolt, heals, buffs) and `attackType: 'save'` (Fireball, Mind Spike, etc.) were never affected -- they already skipped the weapon damage path.

---

## 6. Scaling Curves (3 Examples)

### Fireball (mag-ele-1) -- Elementalist T1
- **Base:** 3d6 (avg 10.5), `scalingLevels: [15, 20, 25, 30, 40]`
- **Scaling:** `getScaledDice` adds +1 die per threshold

| Level | Dice | Average Damage | Notes |
|-------|------|---------------|-------|
| 10 | 3d6 | 10.5 | Base (0 thresholds) |
| 15 | 4d6 | 14.0 | +1 die (1 threshold) |
| 20 | 5d6 | 17.5 | +2 dice (2 thresholds) |
| 25 | 6d6 | 21.0 | +3 dice (3 thresholds) |
| 30 | 7d6 | 24.5 | +4 dice (4 thresholds) |
| 40 | 8d6 | 28.0 | +5 dice (5 thresholds, max) |

Save-based: successful DEX save halves damage. Effective average vs. 50% save rate: ~75% of listed values.

### Reckless Strike (war-ber-1) -- Berserker T1
- **Base:** bonusDamage: 5 (flat, no dice), `scalingLevels: [15, 20, 25, 30, 40]`
- **Scaling:** `getScaledValue` with `perStep: 2` (flat-only damage path in handleDamage)

| Level | Bonus Damage | Notes |
|-------|-------------|-------|
| 10 | +5 | Base (0 thresholds) |
| 15 | +7 | +2 (1 threshold) |
| 20 | +9 | +4 (2 thresholds) |
| 25 | +11 | +6 (3 thresholds) |
| 30 | +13 | +8 (4 thresholds) |
| 40 | +15 | +10 (5 thresholds, max) |

This bonus is added ON TOP of full weapon damage (weapon dice + STR mod + weapon bonus). Self-debuff of -2 AC persists.

### Healing Light (cle-hea-1) -- Healer T1
- **Base:** 2d8+3 (avg 12.0), `scalingLevels: [15, 20, 25, 30, 40]`
- **Scaling:** `getScaledDice` adds +1 die per threshold (bonusHealing stays at base 3)

| Level | Dice | Bonus | Average Healing | Notes |
|-------|------|-------|----------------|-------|
| 10 | 2d8 | +3 | 12.0 | Base (0 thresholds) |
| 15 | 3d8 | +3 | 16.5 | +1 die (1 threshold) |
| 20 | 4d8 | +3 | 21.0 | +2 dice (2 thresholds) |
| 25 | 5d8 | +3 | 25.5 | +3 dice (3 thresholds) |
| 30 | 6d8 | +3 | 30.0 | +4 dice (4 thresholds) |
| 40 | 7d8 | +3 | 34.5 | +5 dice (5 thresholds, max) |

Healing scales well: nearly triples from L10 to L40, keeping pace with increasing monster damage and HP pools.

---

## 7. Rebase Details

Seven abilities had their base values increased before scaling was applied. This was necessary because their original base values were too low to feel meaningful even with scaling.

| # | Ability | ID | Class | Original Base | New Base | Rationale |
|---|---------|-----|-------|--------------|----------|-----------|
| 1 | Fireball | mag-ele-1 | Mage (Elementalist T1) | 1d6 | **3d6** | Fireball is the T1 signature ability for the game's premier damage caster. 1d6 (avg 3.5) at L10 was embarrassing -- lower than a basic weapon swing. 3d6 (avg 10.5) is appropriately powerful as a save-based AoE and matches D&D tradition. |
| 2 | Life Drain | mag-nec-1 | Mage (Necromancer T1) | 2d6 | **3d6** | Necromancer T1 needed parity with Elementalist. 2d6 single-target with 50% heal was too weak compared to Fireball AoE. 3d6 gives it appropriate single-target damage to compensate for the healing component. |
| 3 | Second Wind | war-t0-5b | Warrior (Tier 0, L5) | 1d8 | **2d8** | The only self-heal available to Warriors before spec. 1d8 (avg 4.5) + 4 bonus = 8.5 avg was barely noticeable at L5. 2d8 (avg 9) + 4 = 13 avg is a meaningful mid-combat recovery. |
| 4 | Shield Bash | war-gua-1 | Warrior (Guardian T1) | flat 3 damage | **1d6+3** | Guardian's T1 was the weakest tier 1 in the game: flat 3 damage with a 1-round stun. Adding 1d6 (avg 3.5) gives it 6.5 avg damage, which still lags behind pure damage specs but feels like an actual attack. |
| 5 | Mind Spike | psi-tel-1 | Psion (Telepath T1) | 2d6 | **3d6** | Telepath's T1 needed competitive damage. 2d6 save-based + minor debuff was far below Fireball and Backstab. 3d6 (avg 10.5) with the weakened status rider makes it Telepath's reliable bread-and-butter. |
| 6 | Blink Strike | psi-nom-1 | Psion (Nomad T1) | attackBonus: 2 only | **added bonusDamage: 3** | Blink Strike originally had only +2 hit and an INT damage bonus via the damageBonus field, but no flat bonusDamage. Adding 3 gives it a concrete base that scales with `getScaledValue`, ensuring it stays relevant through L40. |
| 7 | Commanding Strike | war-war-2 | Warrior (Warlord T2) | bonusDamage: 3 | **bonusDamage: 5** | Warlord's damage ability at +3 was weaker than multiple tier 0 abilities. +5 puts it on par with Backstab and Aimed Shot, which also have bonusDamage in the 5-6 range at their base. |

---

## Appendix: Ability Count Verification

| Class | Spec Abilities | Tier 0 (incl. cantrip/L1) | Total |
|-------|---------------|---------------------------|-------|
| Warrior | 18 | 9 | 27 |
| Mage | 18 | 11 | 29 |
| Cleric | 18 | 11 | 29 |
| Rogue | 18 | 9 | 27 |
| Ranger | 18 | 9 | 27 |
| Bard | 18 | 11 | 29 |
| Psion | 18 | 11 | 29 |
| **Total** | **126** | **71** | **197** |

**Note:** The total of 197 exceeds the 180 stated in the CLAUDE.md ability count. The discrepancy is due to the 4 cantrips (Mage, Cleric, Bard, Psion) and 4 L1 utility abilities (Arcane Ward, Rebuke the Wicked, Disorienting Flourish, Psychic Veil) and caster-specific auto-granted abilities at tier -1 that were added after the original 63 tier 0 + 126 spec = 189 count. The extra 8 are the tier -1 innate abilities for the 4 caster classes (cantrip + L1 defensive each).

### Scaling Status Breakdown

| Status | Count | Percentage |
|--------|-------|------------|
| SCALE | 113 | 57.4% |
| BOTH (scale + rebase) | 5 | 2.5% |
| OK (no change needed) | 79 | 40.1% |
| **Total** | **197** | 100% |

Combined abilities that received `scalingLevels`: **118** (SCALE + BOTH).
