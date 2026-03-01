# Phase 6: Full Class Ability Coverage Audit

**Generated:** 2026-03-01
**Source files:** `shared/src/data/class-abilities.ts` (via skill trees), `combat-sim-scenarios.ts`, `class-ability-resolver.ts`, `combat-engine.ts`

---

## CRITICAL: Phase 5B Phantom Ability IDs

**6 of 11 Phase 5B scenarios reference ability IDs that DO NOT EXIST in the game data.** These scenarios will fail at runtime — the resolver returns `fallbackToAttack: true` for unknown IDs.

| Scenario | Phantom IDs Used | Intended Subclass | Actual Subclasses |
|----------|-----------------|-------------------|-------------------|
| `crit-first-strike` (S35) | `war-cha-1`, `war-cha-3` | Warrior/Champion | Berserker, Guardian, Warlord |
| `consume-and-cooldown` (S39) | `war-cha-1`, `war-cha-3` | Warrior/Champion | Berserker, Guardian, Warlord |
| `extra-action-attack` (S43) | `war-cha-5`, `war-cha-1` | Warrior/Champion | Berserker, Guardian, Warlord |
| `anti-heal-aura` (S41) | `cle-lif-1`, `cle-lif-2` | Cleric/Lifegiver | Healer, Paladin, Inquisitor |
| `stacking-attack-speed` (S44) | `rog-due-1` | Rogue/Duelist | Assassin, Thief, Swashbuckler |
| `charm-holy` (S45) | `cle-lif-4` | Cleric/Lifegiver | Healer, Paladin, Inquisitor |

**Additional ID mislabeling bugs in working scenarios:**

| Scenario | Ability ID | Label in Scenario | Actual Ability Name |
|----------|-----------|-------------------|---------------------|
| `taunt-enforcement` (S40) | `war-gua-1` | "Shield Wall" | Shield Bash |
| `taunt-enforcement` (S40) | `war-gua-2` | "Taunt" | Fortify |
| `poison-charges` (S42) | `rog-ass-1` | "Poison Blade" | Backstab |

**Impact:** `war-gua-3` (the ACTUAL Taunt ability) is never tested. The `taunt-enforcement` scenario calls `war-gua-2` (Fortify, a buff) thinking it's Taunt (a status). The taunt mechanic only works in this scenario because combatant flags are set manually, not because the ability fires correctly.

---

## Section 1: Complete Ability Inventory

### Warrior (18 abilities)

#### Berserker

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `war-ber-1` | Reckless Strike | 10 | damage | bonusDamage, selfDefenseDebuff | class-abilities, death-prevention, reckless-strike-penalty | TESTED |
| `war-ber-2` | Blood Rage | 14 | buff | attackScaling: missingHpPercent | — | INDIRECT |
| `war-ber-3` | Cleave | 16 | aoe_damage | damageMultiplier: 0.8 | — | INDIRECT |
| `war-ber-4` | Frenzy | 22 | multi_attack | strikes: 2, accuracyPenalty | cc-immune-berserker | TESTED |
| `war-ber-5` | Berserker Rage | 30 | buff | ccImmune, attackBonus: 15 | cc-immune-berserker | TESTED |
| `war-ber-6` | Undying Fury | 40 | passive | cheatingDeath, usesPerCombat: 1 | death-prevention (unlocked) | PASSIVE-TESTED |

#### Guardian

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `war-gua-1` | Shield Bash | 10 | damage_status | stun 1 round | taunt-enforcement (mislabeled) | TESTED |
| `war-gua-2` | Fortify | 14 | buff | acBonus: 5 | multi-attack, multi-buff-stack, damage-reflect-bulwark, taunt-enforcement (mislabeled) | TESTED |
| `war-gua-3` | Taunt | 16 | status | taunt 2 rounds | — | **UNTESTED** |
| `war-gua-4` | Shield Wall | 22 | buff | damageReduction: 0.5 | multi-buff-stack, damage-reflect-bulwark | TESTED |
| `war-gua-5` | Iron Bulwark | 30 | buff | damageReflect: 0.3 | damage-reflect-bulwark | TESTED |
| `war-gua-6` | Unbreakable | 40 | passive | bonusHpFromCon: 0.2 | — | UNTESTED |

#### Warlord

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `war-war-1` | Rally Cry | 10 | buff | attackBonus: 3, acBonus: 2 | — | INDIRECT |
| `war-war-2` | Commanding Strike | 14 | damage | bonusDamage: 3 | guaranteed-hits-warlord | TESTED |
| `war-war-3` | Tactical Advance | 20 | buff | extraAction: true | — | INDIRECT |
| `war-war-4` | Inspiring Presence | 22 | passive | hpRegenPerRound: 3 | — | UNTESTED |
| `war-war-5` | Warlord's Decree | 30 | buff | guaranteedHits: 3 | guaranteed-hits-warlord | TESTED |
| `war-war-6` | Legendary Commander | 40 | heal | fullRestore, usesPerCombat: 1 | — | INDIRECT |

### Mage (18 abilities)

#### Elementalist

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `mag-ele-1` | Fireball | 10 | aoe_damage | fire, 3d6 | aoe-abilities, absorption-shield, cooldown-reduction | TESTED |
| `mag-ele-2` | Frost Lance | 14 | damage_status | ice, slow 2 rounds | — | INDIRECT |
| `mag-ele-3` | Chain Lightning | 16 | multi_target | lightning, 3 targets | aoe-abilities | TESTED |
| `mag-ele-4` | Elemental Shield | 22 | buff | absorbDamage: 30 | absorption-shield | TESTED |
| `mag-ele-5` | Meteor Strike | 30 | aoe_damage | fire, 6d8 | aoe-abilities, cooldown-reduction | TESTED |
| `mag-ele-6` | Arcane Mastery | 40 | passive | cooldownReduction: 0.3 | cooldown-reduction (unlocked) | PASSIVE-TESTED |

#### Necromancer

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `mag-nec-1` | Life Drain | 10 | drain | healPercent: 0.5 | drain-heal-loop, drain-heal-fixed | TESTED |
| `mag-nec-2` | Shadow Bolt | 14 | damage | shadow element | drain-heal-fixed (unlocked) | PASSIVE-TESTED |
| `mag-nec-3` | Corpse Explosion | 16 | aoe_damage | requiresCorpse | — | INDIRECT |
| `mag-nec-4` | Bone Armor | 22 | buff | absorbDamage: 25, acBonus: 3 | — | INDIRECT |
| `mag-nec-5` | Soul Harvest | 30 | aoe_drain | healPerTarget: 8 | drain-heal-loop | TESTED |
| `mag-nec-6` | Lichdom | 40 | passive | reviveOnDeath, 50% HP | — | UNTESTED |

#### Enchanter

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `mag-enc-1` | Arcane Bolt | 10 | damage | autoHit | cc-immune-berserker | TESTED |
| `mag-enc-2` | Enfeeble | 14 | debuff | attackReduction: -4, acReduction: -3 | dispel-and-cleanse, cc-immune-berserker | TESTED |
| `mag-enc-3` | Haste | 16 | buff | extraAction, duration: 1 | dispel-and-cleanse | TESTED |
| `mag-enc-4` | Arcane Siphon | 22 | debuff | attackReduction: -4 | — | INDIRECT |
| `mag-enc-5` | Polymorph | 30 | status | polymorph 2 rounds | cc-immune-berserker | TESTED |
| `mag-enc-6` | Spell Weaver | 40 | passive | cooldownReduction: 1 (flat) | — | UNTESTED |

### Rogue (18 abilities)

#### Assassin

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `rog-ass-1` | Backstab | 10 | damage | critBonus: 10, bonusDamage: 5 | delayed-damage, stealth-vanish, poison-charges (mislabeled) | TESTED |
| `rog-ass-2` | Vanish | 14 | buff | stealthed | stealth-vanish, ambush-stealth-chain | TESTED |
| `rog-ass-3` | Poison Blade | 16 | buff | poisonCharges: 3, dotDamage: 4 | — | INDIRECT |
| `rog-ass-4` | Ambush | 22 | damage | requiresStealth, damageMultiplier: 3.0 | ambush-stealth-chain | TESTED |
| `rog-ass-5` | Death Mark | 30 | delayed_damage | delay: 3, 8d6 | delayed-damage | TESTED |
| `rog-ass-6` | Shadow Mastery | 40 | passive | critChanceBonus: 15 | — | UNTESTED |

#### Thief

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `rog-thi-1` | Pilfer | 10 | steal | goldRange: [5,20] | special-abilities | TESTED |
| `rog-thi-2` | Smoke Bomb | 14 | aoe_debuff | accuracyReduction: -5 | — | **UNTESTED** |
| `rog-thi-3` | Quick Fingers | 16 | passive | goldBonus: 0.1 | — | UNTESTED (non-combat) |
| `rog-thi-4` | Disengage | 22 | flee | successChance: 0.9 | — | **UNTESTED** |
| `rog-thi-5` | Mug | 30 | damage_steal | stealItem | special-abilities | TESTED |
| `rog-thi-6` | Treasure Sense | 40 | passive | lootQualityBonus: 0.25 | — | UNTESTED (non-combat) |

#### Swashbuckler

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `rog-swa-1` | Riposte | 10 | counter | counterDamage: 8 | counter-trap, nethkin-counter-stack, mutual-kill | TESTED |
| `rog-swa-2` | Dual Strike | 14 | multi_attack | strikes: 2, damageMultiplier: 0.7 | multi-attack, dodge-evasion | TESTED |
| `rog-swa-3` | Evasion | 16 | buff | dodgeBonus: 30 | dodge-evasion | TESTED |
| `rog-swa-4` | Flurry of Blades | 22 | multi_attack | strikes: 4, damageMultiplier: 0.4 | multi-attack | TESTED |
| `rog-swa-5` | Dance of Steel | 30 | buff | stackingAttackSpeed, maxStacks: 5 | — | INDIRECT |
| `rog-swa-6` | Untouchable | 40 | passive | dodgeBonus: 10 | — | UNTESTED |

### Cleric (18 abilities)

#### Healer

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `cle-hea-1` | Healing Light | 10 | heal | 2d8 + 3 | class-abilities | TESTED |
| `cle-hea-2` | Purify | 14 | cleanse | removeCount: 1 | — | **UNTESTED** |
| `cle-hea-3` | Regeneration | 16 | hot | healPerRound: 5, duration: 5 | — | **UNTESTED** |
| `cle-hea-4` | Divine Shield | 22 | buff | absorbDamage: 30 | — | INDIRECT |
| `cle-hea-5` | Resurrection | 30 | passive | reviveOnDeath, 25% HP | — | UNTESTED |
| `cle-hea-6` | Miracle | 40 | heal | fullRestore, usesPerCombat: 1 | — | INDIRECT |

#### Paladin

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `cle-pal-1` | Smite | 10 | damage | radiant, bonusDamage: 6 | aoe-dot-consecrate | TESTED |
| `cle-pal-2` | Holy Armor | 14 | buff | acBonus: 4 | — | INDIRECT |
| `cle-pal-3` | Consecrate | 16 | aoe_dot | radiant, damagePerRound: 6 | aoe-dot-consecrate | TESTED |
| `cle-pal-4` | Judgment | 22 | drain | radiant, healPercent: 0.5 | — | INDIRECT |
| `cle-pal-5` | Divine Wrath | 30 | aoe_damage | radiant, 5d8 | — | INDIRECT |
| `cle-pal-6` | Avatar of Light | 40 | passive | holyDamageBonus: 0.25 | — | UNTESTED |

#### Inquisitor

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `cle-inq-1` | Denounce | 10 | debuff | attackReduction: -4 | dispel-and-cleanse, penance-debuff-bonus | TESTED |
| `cle-inq-2` | Penance | 14 | damage | bonusPerDebuff: 4 | penance-debuff-bonus | TESTED |
| `cle-inq-3` | Silence | 16 | status | silence 2 rounds | penance-debuff-bonus | TESTED |
| `cle-inq-4` | Purging Flame | 22 | dispel_damage | damagePerBuff: 8 | dispel-and-cleanse | TESTED |
| `cle-inq-5` | Excommunicate | 30 | debuff | allStatsReduction: -5 | — | INDIRECT |
| `cle-inq-6` | Inquisitor's Verdict | 40 | passive | antiHealAura | — | UNTESTED |

### Ranger (18 abilities)

#### Beastmaster

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `ran-bea-1` | Call Companion | 10 | summon | companionDamage: 5 | permanent-companion, companion (unlocked) | TESTED |
| `ran-bea-2` | Wild Bond | 14 | heal | heals self + companion | — | INDIRECT |
| `ran-bea-3` | Pack Tactics | 16 | buff | advantage: true | permanent-companion (unlocked) | PASSIVE-TESTED |
| `ran-bea-4` | Bestial Fury | 22 | companion_attack | 4d8 | companion | TESTED |
| `ran-bea-5` | Alpha Predator | 30 | summon | companionHp: 50 | companion | TESTED |
| `ran-bea-6` | Spirit Bond | 40 | passive | permanentCompanion, companionImmune | — | UNTESTED |

#### Sharpshooter

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `ran-sha-1` | Aimed Shot | 10 | damage | accuracyBonus: 3, bonusDamage: 6 | aimed-shot-accuracy | TESTED |
| `ran-sha-2` | Multi-Shot | 14 | multi_target | 3 targets | — | INDIRECT |
| `ran-sha-3` | Piercing Arrow | 16 | damage | ignoreArmor | — | INDIRECT |
| `ran-sha-4` | Headshot | 22 | damage | critBonus: 20, accuracyPenalty: -5 | aimed-shot-accuracy | TESTED |
| `ran-sha-5` | Rain of Arrows | 30 | aoe_damage | hitsPerTarget: 2 | — | INDIRECT |
| `ran-sha-6` | Eagle's Eye | 40 | passive | critChanceBonus: 10, accuracyBonus: 5 | — | UNTESTED |

#### Tracker

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `ran-tra-1` | Lay Trap | 10 | trap | trapDamage: 10 | counter-trap | TESTED |
| `ran-tra-2` | Snare | 14 | status | root 2 rounds, acReduction: -3 | — | INDIRECT |
| `ran-tra-3` | Hunter's Mark | 16 | debuff | bonusDamageFromYou: 4 | — | INDIRECT |
| `ran-tra-4` | Explosive Trap | 22 | trap | trapDamage: 25, aoe | counter-trap | TESTED |
| `ran-tra-5` | Predator Instinct | 30 | passive | advantageVsLowHp, hpThreshold: 0.5 | — | UNTESTED |
| `ran-tra-6` | Master Tracker | 40 | passive | firstStrikeCrit | — | UNTESTED |

### Bard (18 abilities)

#### Diplomat

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `bar-dip-1` | Charming Words | 10 | debuff | attackReduction: -3 | charm-holy | TESTED |
| `bar-dip-2` | Silver Tongue | 14 | status | skip_turn 1 round | charm-holy (unlocked) | PASSIVE-TESTED |
| `bar-dip-3` | Soothing Presence | 16 | passive | hpRegenPerRound: 3 | — | UNTESTED |
| `bar-dip-4` | Diplomat's Gambit | 22 | special | peacefulEnd, 50% | special-abilities | TESTED |
| `bar-dip-5` | Enthrall | 30 | status | mesmerize 3 rounds | — | INDIRECT |
| `bar-dip-6` | Legendary Charisma | 40 | passive | charmEffectiveness: 0.5 | — | UNTESTED |

#### Battlechanter

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `bar-bat-1` | War Song | 10 | buff | attackBonus: 4 | — | INDIRECT |
| `bar-bat-2` | Discordant Note | 14 | damage | sonic, 2d8 | — | INDIRECT |
| `bar-bat-3` | Marching Cadence | 16 | buff | dodgeBonus: 5, initiativeBonus: 3 | — | INDIRECT |
| `bar-bat-4` | Shatter | 22 | damage_debuff | sonic, acReduction: -4 | — | **UNTESTED** |
| `bar-bat-5` | Crescendo | 30 | passive | stackingDamagePerRound: 3 | — | UNTESTED |
| `bar-bat-6` | Epic Finale | 40 | aoe_damage | sonic, bonusPerRound: 5 | — | INDIRECT |

#### Lorekeeper

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `bar-lor-1` | Analyze | 10 | buff | bonusDamageNext: 8, revealWeakness | — | INDIRECT |
| `bar-lor-2` | Recall Lore | 14 | passive | xpBonus: 0.15 | — | UNTESTED (non-combat) |
| `bar-lor-3` | Exploit Weakness | 16 | damage | requiresAnalyze, critBonus: 15 | — | INDIRECT |
| `bar-lor-4` | Arcane Insight | 22 | buff | nextCooldownHalved | — | INDIRECT |
| `bar-lor-5` | Tome of Secrets | 30 | special | randomClassAbility | special-abilities | TESTED |
| `bar-lor-6` | Omniscient | 40 | passive | globalXpBonus: 0.25 | — | UNTESTED (non-combat) |

### Psion (18 abilities)

#### Telepath

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `psi-tel-1` | Mind Spike | 1 | damage_status | psychic, weakened 2 | psion-telepath | TESTED |
| `psi-tel-2` | Thought Shield | 5 | passive | psychicResistance, mentalSaveBonus: 2 | — | UNTESTED |
| `psi-tel-3` | Psychic Crush | 12 | damage_status | psychic, stunned, halfDamageOnSave | psion-telepath | TESTED |
| `psi-tel-4` | Dominate | 18 | control | dominate 1 round | psion-telepath | TESTED |
| `psi-tel-5` | Mind Shatter | 28 | aoe_damage_status | psychic, weakened, AoE | — | INDIRECT |
| `psi-tel-6` | Absolute Dominion | 40 | control | absolute_dominion 2 rounds | — | INDIRECT |

#### Seer

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `psi-see-1` | Foresight | 1 | buff | acBonus: 2, saveBonus: 2 | psion-seer-nomad | TESTED |
| `psi-see-2` | Danger Sense | 5 | passive | cannotBeSurprised, initiativeBonus: 2 | — | UNTESTED |
| `psi-see-3` | Precognitive Dodge | 12 | reaction | negateAttack, usesPerCombat: 1 | psion-seer-nomad | TESTED |
| `psi-see-4` | Third Eye | 18 | passive | seeInvisible, immuneBlinded | — | UNTESTED |
| `psi-see-5` | Temporal Echo | 28 | echo | repeatLastAction, freeAction | — | **UNTESTED** |
| `psi-see-6` | Prescient Mastery | 40 | buff | enemyDisadvantage, selfAdvantage | — | INDIRECT |

#### Nomad

| ID | Name | Lvl | Effect Type | Special Flags | Tested In | Status |
|----|------|-----|-------------|---------------|-----------|--------|
| `psi-nom-1` | Blink Strike | 1 | teleport_attack | attackBonus: 2, noReactions | psion-seer-nomad | TESTED |
| `psi-nom-2` | Phase Step | 5 | passive | freeDisengage, acBonus: 3 | — | UNTESTED |
| `psi-nom-3` | Dimensional Pocket | 12 | phase | untargetable 1 round | psion-seer-nomad | TESTED |
| `psi-nom-4` | Translocation | 18 | swap | enemy lose_action / ally acBonus | — | **UNTESTED** |
| `psi-nom-5` | Rift Walk | 28 | aoe_damage_status | psychic, slowed | psion-seer-nomad | TESTED |
| `psi-nom-6` | Banishment | 40 | banish | banish 3 rounds, returnDamage | — | **UNTESTED** |

---

## Section 2: Coverage Summary by Class/Subclass

Sorted by coverage % ascending (worst first).

| Class | Subclass | Total | Tested | Passive-Tested | Indirect | Untested | Coverage % |
|-------|----------|-------|--------|----------------|----------|----------|------------|
| Bard | Battlechanter | 6 | 0 | 0 | 4 | 2 | **0%** |
| Cleric | Healer | 6 | 1 | 0 | 2 | 3 | **17%** |
| Bard | Lorekeeper | 6 | 1 | 0 | 3 | 2 | **17%** |
| Warrior | Warlord | 6 | 2 | 0 | 3 | 1 | **33%** |
| Cleric | Paladin | 6 | 2 | 0 | 3 | 1 | **33%** |
| Ranger | Sharpshooter | 6 | 2 | 0 | 3 | 1 | **33%** |
| Ranger | Tracker | 6 | 2 | 0 | 2 | 2 | **33%** |
| Psion | Seer | 6 | 2 | 0 | 1 | 3 | **33%** |
| Mage | Necromancer | 6 | 2 | 1 | 2 | 1 | **50%** |
| Bard | Diplomat | 6 | 2 | 1 | 1 | 2 | **50%** |
| Psion | Telepath | 6 | 3 | 0 | 2 | 1 | **50%** |
| Psion | Nomad | 6 | 3 | 0 | 0 | 3 | **50%** |
| Rogue | Thief | 6 | 2 | 0 | 0 | 4 | **33%** |
| Rogue | Assassin | 6 | 4 | 0 | 1 | 1 | **67%** |
| Rogue | Swashbuckler | 6 | 4 | 0 | 1 | 1 | **67%** |
| Mage | Enchanter | 6 | 4 | 0 | 1 | 1 | **67%** |
| Cleric | Inquisitor | 6 | 4 | 0 | 1 | 1 | **67%** |
| Warrior | Guardian | 6 | 4 | 0 | 0 | 2 | **67%** |
| Ranger | Beastmaster | 6 | 3 | 1 | 1 | 1 | **67%** |
| Mage | Elementalist | 6 | 4 | 1 | 1 | 0 | **83%** |
| Warrior | Berserker | 6 | 3 | 1 | 2 | 0 | **67%** |

**Coverage % = (Tested + Passive-Tested) / Total**

---

## Section 3: Handler Coverage Matrix

### Non-Psion Handlers (class-ability-resolver.ts)

| Handler | Total Abilities | Tested Abilities | Test Gaps |
|---------|----------------|------------------|-----------|
| `damage` | 13 | 9 | ran-sha-3, bar-bat-2, bar-lor-3, mag-nec-2* |
| `buff` | 23 | 10 | war-ber-2, war-war-1, war-war-3, mag-nec-4, rog-ass-3, rog-swa-5, cle-hea-4, cle-pal-2, bar-bat-1, bar-bat-3, bar-lor-1, bar-lor-4, psi-see-6 |
| `debuff` | 6 | 3 | mag-enc-4, cle-inq-5, ran-tra-3 |
| `heal` | 4 | 1 | cle-hea-6, ran-bea-2, war-war-6 |
| `status` | 6 | 2 | war-gua-3, bar-dip-5, ran-tra-2, bar-dip-2* |
| `damage_status` | 4 | 3 | mag-ele-2 |
| `damage_debuff` | 1 | **0** | **bar-bat-4 (Shatter)** |
| `drain` | 2 | 1 | cle-pal-4 |
| `hot` | 1 | **0** | **cle-hea-3 (Regeneration)** |
| `cleanse` | 1 | **0** | **cle-hea-2 (Purify)** |
| `flee` | 1 | **0** | **rog-thi-4 (Disengage)** |
| `aoe_debuff` | 1 | **0** | **rog-thi-2 (Smoke Bomb)** |
| `aoe_damage` | 6 | 2 | war-ber-3, ran-sha-5, cle-pal-5, bar-bat-6 |
| `multi_target` | 2 | 1 | ran-sha-2 |
| `multi_attack` | 3 | 3 | — (fully covered) |
| `aoe_drain` | 1 | 1 | — (fully covered) |
| `dispel_damage` | 1 | 1 | — (fully covered) |
| `aoe_dot` | 1 | 1 | — (fully covered) |
| `delayed_damage` | 1 | 1 | — (fully covered) |
| `steal` | 1 | 1 | — (fully covered) |
| `damage_steal` | 1 | 1 | — (fully covered) |
| `companion_attack` | 1 | 1 | — (fully covered) |
| `special` | 2 | 2 | — (fully covered) |
| `counter` | 1 | 1 | — (fully covered) |
| `trap` | 2 | 2 | — (fully covered) |
| `summon` | 2 | 2 | — (fully covered) |
| `passive` | 27 | N/A | No-op handler; passives tested via engine |

*\* mag-nec-2 and bar-dip-2 are PASSIVE-TESTED (unlocked only)*

### Psion Handlers (combat-engine.ts)

| Handler | Total Abilities | Tested Abilities | Test Gaps |
|---------|----------------|------------------|-----------|
| `damage_status` | 2 | 2 | — |
| `control` | 2 | 1 | psi-tel-6 |
| `aoe_damage_status` | 2 | 1 | psi-tel-5 |
| `reaction` | 1 | 1 | — |
| `echo` | 1 | **0** | **psi-see-5 (Temporal Echo)** |
| `teleport_attack` | 1 | 1 | — |
| `phase` | 1 | 1 | — |
| `swap` | 1 | **0** | **psi-nom-4 (Translocation)** |
| `banish` | 1 | **0** | **psi-nom-6 (Banishment)** |
| `buff` | 2 | 1 | psi-see-6 |

### Handlers with ZERO Tested Abilities

| # | Handler | Ability | Notes |
|---|---------|---------|-------|
| 1 | `damage_debuff` | bar-bat-4 (Shatter) | Only ability using this handler |
| 2 | `hot` | cle-hea-3 (Regeneration) | Only ability using this handler |
| 3 | `cleanse` | cle-hea-2 (Purify) | Only ability using this handler |
| 4 | `flee` | rog-thi-4 (Disengage) | Only ability using this handler |
| 5 | `aoe_debuff` | rog-thi-2 (Smoke Bomb) | Only ability using this handler |
| 6 | `echo` | psi-see-5 (Temporal Echo) | Psion handler, only ability |
| 7 | `swap` | psi-nom-4 (Translocation) | Psion handler, only ability |
| 8 | `banish` | psi-nom-6 (Banishment) | Psion handler, only ability |

**8 handlers with zero coverage.**

---

## Section 4: Mechanic Coverage Matrix

| # | Mechanic | Phase | Ability That Uses It | Scenario(s) Testing It | Status |
|---|----------|-------|---------------------|----------------------|--------|
| 1 | critBonus | 5A | rog-ass-1, ran-sha-4, bar-lor-3 | stealth-vanish, aimed-shot-accuracy | **TESTED** |
| 2 | autoHit | 5A | mag-enc-1 | cc-immune-berserker | **TESTED** |
| 3 | ignoreArmor | 5A | ran-sha-3 | — | **UNTESTED** |
| 4 | accuracyMod | 5A | ran-sha-1, ran-sha-4 | aimed-shot-accuracy | **TESTED** |
| 5 | bonusPerDebuff | 5A | cle-inq-2 | penance-debuff-bonus | **TESTED** |
| 6 | damageMultiplier | 5A | rog-swa-2, rog-swa-4, war-ber-3, rog-ass-4 | multi-attack, ambush-stealth-chain | **TESTED** |
| 7 | requiresStealth | 5A | rog-ass-4 | ambush-stealth-chain | **TESTED** |
| 8 | requiresAnalyze | 5A | bar-lor-3 | — | **UNTESTED** |
| 9 | ccImmune | 5A | war-ber-5 | cc-immune-berserker | **TESTED** |
| 10 | guaranteedHits | 5A | war-war-5 | guaranteed-hits-warlord | **TESTED** |
| 11 | dodgeMod | 5A | rog-swa-3 | dodge-evasion | **TESTED** |
| 12 | damageReflect | 5A | war-gua-5 | damage-reflect-bulwark | **TESTED** |
| 13 | stealthed | 5A | rog-ass-2 | stealth-vanish, ambush-stealth-chain | **TESTED** |
| 14 | critChanceBonus | 5B | rog-ass-6, ran-sha-6 | — (S35 uses phantom IDs) | **UNTESTED** |
| 15 | firstStrikeCrit | 5B | ran-tra-6 | — (S35 uses phantom IDs) | **UNTESTED** |
| 16 | permanentCompanion | 5B | ran-bea-6 | permanent-companion (manual setup) | **PARTIAL** |
| 17 | stackingDamagePerRound | 5B | bar-bat-5 | stacking-damage (manual setup) | **PARTIAL** |
| 18 | advantageVsLowHp | 5B | ran-tra-5 | advantage-low-hp (manual setup) | **PARTIAL** |
| 19 | consumeOnUse | 5B | bar-lor-1 (bonusDamageNext) | — (S39 uses phantom IDs) | **UNTESTED** |
| 20 | nextCooldownHalved | 5B | bar-lor-4 | — (S39 uses phantom IDs) | **UNTESTED** |
| 21 | charmEffectiveness | 5B | bar-dip-6 | charm-holy (bar-dip-1 is real, but passive bar-dip-6 not applied) | **PARTIAL** |
| 22 | attackScaling (missingHpPercent) | 5B | war-ber-2 | — | **UNTESTED** |
| 23 | bonusDamageFromYou | 5B | ran-tra-3 | — | **UNTESTED** |
| 24 | holyDamageBonus | 5B | cle-pal-6 | — (S45 uses phantom cle-lif-4) | **UNTESTED** |
| 25 | taunt | 5B | war-gua-3 | taunt-enforcement (uses wrong ID war-gua-2) | **PARTIAL** |
| 26 | antiHealAura | 5B | cle-inq-6 | — (S41 uses phantom cle-lif-*) | **UNTESTED** |
| 27 | poisonCharges | 5B | rog-ass-3 | poison-charges (uses rog-ass-1, wrong ability) | **PARTIAL** |
| 28 | extraAction | 5B | war-war-3, mag-enc-3 | dispel-and-cleanse tests Haste (mag-enc-3) but as dispel target, not for extra action | **UNTESTED** |
| 29 | stackingAttackSpeed | 5B | rog-swa-5 | — (S44 uses phantom rog-due-1) | **UNTESTED** |

**Summary: 13 TESTED, 5 PARTIAL (manual/wrong ID), 11 UNTESTED**

---

## Section 5: Cross-Class Interaction Gaps

| # | Interaction | Currently Tested? | Risk If Untested |
|---|-------------|-------------------|------------------|
| 1 | **Tank (Taunt) + Healer** — Does healing work while taunt forces attacks? Does anti-heal block ally heals? | NO — Taunt ability (war-gua-3) is never tested; anti-heal uses phantom IDs | **HIGH** — Taunt + heal is the core tank/healer gameplay loop. If taunt doesn't redirect attacks or anti-heal leaks through to allies, 2v2+ combat is broken. |
| 2 | **Buff stacking** — Do Haste + War Song + Blood Rage stack correctly? Do multiple buff sources overflow? | PARTIAL — multi-buff-stack tests 2 Guardian buffs (AC stacking). No test for mixed buff types (ATK + extraAction + scaling). | **MEDIUM** — Buff stacking bugs could make certain combos OP or non-functional. |
| 3 | **CC chains** — Does CC immunity protect against sequential CC from different sources (stun → polymorph → mesmerize)? | PARTIAL — cc-immune-berserker tests Berserker Rage vs Polymorph. No test for CC immunity vs multiple CC types in sequence. | **MEDIUM** — CC chains are a common PvP exploit. |
| 4 | **Counter + Reflect** — What happens when a reflected attack triggers a counter? Infinite loop? | NO — counter and reflect are tested separately (counter-trap, damage-reflect-bulwark) but never together. | **HIGH** — Could cause infinite recursion or stack overflow in resolveAttack. |
| 5 | **Death prevention + Drain** — Does drain healing work after death prevention triggers (Undying Fury/Lichdom)? | NO — death-prevention tests Undying Fury alone. No drain ability in that scenario. | **LOW** — Unlikely to cause crashes, but healing after death prevention could be unintuitive. |
| 6 | **Companion + AoE** — Do AoE abilities (Fireball, Meteor Strike) hit companions? | NO — companion and aoe-abilities scenarios are separate. | **MEDIUM** — If AoE hits companions, Beastmaster becomes weaker than intended in multi-combatant fights. |
| 7 | **Stealth + AoE** — Does AoE bypass stealth? | NO — stealth and AoE tested separately. | **HIGH** — If AoE doesn't break stealth, Assassin+AoE becomes unbeatable. If it does, stealth is less useful than expected. |
| 8 | **Taunt + CC** — If the taunter gets stunned, does taunt still force targeting? | NO — taunt and stun tested separately. | **HIGH** — Taunt + stun interaction is a critical tank mechanic question. |
| 9 | **Extra action + Poison** — Does the bonus attack from Haste/extraAction trigger poison charges? | NO — neither extraAction mechanic nor poison charges are correctly tested. | **MEDIUM** — Bonus attacks should trigger on-hit effects, but might not. |
| 10 | **Advantage + Guaranteed hits** — Do they interact correctly or override each other? | NO — tested separately. | **LOW** — Both are attack roll modifiers, likely independent. |

---

## Section 6: Recommended Full-Kit Scenarios

### Tier 1: Zero/Low Coverage Subclasses (MUST HAVE)

#### S46: `battlechanter-full-kit`
**Tests:** bar-bat-1 through bar-bat-6 (ALL 6 abilities + stackingDamagePerRound mechanic)
**Setup:** L40 Bard/Battlechanter (human) vs L35 Training Dummy (high HP, low AC)
**Action queue:**
1. bar-bat-1 "War Song" (first_round) → apply ATK buff
2. bar-bat-4 "Shatter" (always) → damage_debuff handler
3. bar-bat-2 "Discordant Note" (always) → sonic damage
4. bar-bat-6 "Epic Finale" (always, after round 4) → AoE + bonusPerRound scaling
**Passives:** bar-bat-5 (Crescendo, stackingDamagePerRound: 3), bar-bat-3 "Marching Cadence" in unlocked
**Key assertions:**
- War Song attackBonus applies (+4 ATK)
- Shatter deals damage AND applies AC debuff
- Crescendo passive increases damage each round (+3 cumulative)
- Epic Finale bonusPerRound scales with combat duration
- damage_debuff handler executes without errors

#### S47: `healer-full-kit`
**Tests:** cle-hea-1 through cle-hea-6 (ALL 6 abilities + hot/cleanse handlers)
**Setup:** L40 Cleric/Healer (human, start at 30% HP, pre-apply poisoned status) vs L35 Training Dummy
**Action queue:**
1. cle-hea-6 "Miracle" (first_round, low_hp at 30%) → fullRestore heal
2. cle-hea-2 "Purify" (always) → cleanse poisoned
3. cle-hea-3 "Regeneration" (always) → HoT application
4. cle-hea-4 "Divine Shield" (always) → absorption shield buff
5. cle-hea-1 "Healing Light" (low_hp at 70%) → standard heal
**Passives:** cle-hea-5 (Resurrection, reviveOnDeath)
**Key assertions:**
- Miracle heals to full HP (usesPerCombat: 1, doesn't fire again)
- Purify removes poisoned status
- Regeneration HoT ticks each round for 5 rounds
- Divine Shield absorbs incoming damage
- Resurrection triggers on death (heals to 25% HP)

#### S48: `lorekeeper-full-kit`
**Tests:** bar-lor-1, bar-lor-3, bar-lor-4, bar-lor-5 + consumeOnUse, nextCooldownHalved, requiresAnalyze mechanics
**Setup:** L40 Bard/Lorekeeper (gnome) vs L35 Training Dummy
**Action queue:**
1. bar-lor-1 "Analyze" (first_round) → bonusDamageNext: 8, consumeOnUse
2. bar-lor-3 "Exploit Weakness" (always) → requiresAnalyze + critBonus: 15
3. bar-lor-4 "Arcane Insight" (always) → nextCooldownHalved buff
4. bar-lor-5 "Tome of Secrets" (always) → random ability from pool
**Passives:** bar-lor-2 (xpBonus, non-combat — verify no crash), bar-lor-6 (globalXpBonus)
**Key assertions:**
- Analyze sets bonusDamageNext on actor's buff (consumeOnUse: true)
- First attack after Analyze gets +8 damage, buff consumed
- Exploit Weakness only fires if Analyze was used (requiresAnalyze check)
- Arcane Insight sets nextCooldownHalved on actor's buff
- Next ability after Arcane Insight has halved cooldown
- Tome of Secrets picks and executes a random eligible ability

#### S49: `warlord-full-kit`
**Tests:** war-war-1 through war-war-6 + extraAction mechanic
**Setup:** L40 Warrior/Warlord (human, 50% HP) vs L35 Training Dummy
**Action queue:**
1. war-war-1 "Rally Cry" (first_round) → attackBonus: 3, acBonus: 2
2. war-war-3 "Tactical Advance" (always) → extraAction buff
3. war-war-5 "Warlord's Decree" (always) → guaranteedHits: 3
4. war-war-2 "Commanding Strike" (always) → damage + bonusDamage
5. war-war-6 "Legendary Commander" (low_hp at 30%) → fullRestore heal
**Passives:** war-war-4 (Inspiring Presence, hpRegenPerRound: 3)
**Key assertions:**
- Rally Cry buffs both ATK and AC
- Tactical Advance grants extra action (bonus basic attack per turn)
- Extra action doesn't trigger infinite loop
- Warlord's Decree guaranteedHits auto-hits for 3 attacks
- Legendary Commander heals to full (usesPerCombat: 1)
- Inspiring Presence heals 3 HP per round passively

### Tier 2: Multi-Class Interaction Scenarios (HIGH VALUE)

#### S50: `taunt-heal-antiheal`
**Tests:** war-gua-3 (ACTUAL Taunt), cle-hea-1, cle-hea-3, cle-inq-6 (antiHealAura)
**Setup:** 2v1 — L20 Warrior/Guardian + L20 Cleric/Healer vs L25 Orc Berserker (with antiHealAura flag manually set)
**Action queue:**
- Guardian: war-gua-3 "Taunt" (first_round), war-gua-2 "Fortify" (always)
- Healer: cle-hea-1 "Healing Light" (low_hp at 70%), cle-hea-3 "Regeneration" (always)
**Key assertions:**
- Taunt status forces enemy to attack Guardian (not Healer)
- Taunt applies -2 AC debuff to target
- When enemy has antiHealAura, Healing Light is blocked
- When enemy has antiHealAura, Regeneration HoT ticks are blocked
- When taunt expires, enemy can target either combatant

#### S51: `counter-reflect-loop`
**Tests:** rog-swa-1 (Riposte counter) + war-gua-5 (Iron Bulwark reflect) interaction
**Setup:** L30 Rogue/Swashbuckler (counter stance) vs L30 Warrior/Guardian (reflect buff)
**Action queue:**
- Rogue: rog-swa-1 "Riposte" (always)
- Guardian: war-gua-5 "Iron Bulwark" (first_round)
**Key assertions:**
- When Guardian attacks Rogue, counter triggers dealing damage back
- Counter damage reflected back by Iron Bulwark should NOT trigger another counter (no infinite loop)
- Both combatants take expected damage amounts
- Combat terminates normally

#### S52: `stealth-vs-aoe`
**Tests:** rog-ass-2 (Vanish stealth) vs mag-ele-1 (Fireball AoE) interaction
**Setup:** 2v2 — L20 Rogue/Assassin + L20 Warrior (no abilities) vs L20 Mage/Elementalist + L20 Orc
**Action queue:**
- Rogue: rog-ass-2 "Vanish" (first_round), rog-ass-4 "Ambush" (always)
- Mage: mag-ele-1 "Fireball" (always)
**Key assertions:**
- Stealthed Rogue cannot be targeted by single-target attacks
- Fireball AoE hits all enemies — verify if it hits stealthed targets
- If AoE hits stealthed target, stealth should break
- Ambush requiresStealth check fires correctly after Vanish

#### S53: `buff-stack-overflow`
**Tests:** war-war-1 (Rally Cry) + bar-bat-1 (War Song) + war-ber-2 (Blood Rage attackScaling) stacking
**Setup:** 3v1 — L30 Warrior/Warlord + L30 Bard/Battlechanter + L30 Warrior/Berserker vs L40 Training Golem (high HP)
**Action queue:**
- Warlord: war-war-1 "Rally Cry" (first_round)
- Battlechanter: bar-bat-1 "War Song" (first_round)
- Berserker: war-ber-2 "Blood Rage" (first_round), war-ber-1 "Reckless Strike" (always)
**Key assertions:**
- All three buff sources stack (Rally Cry +3 ATK, War Song +4 ATK, Blood Rage scaling ATK)
- Blood Rage attackScaling: missingHpPercent scales dynamically as Berserker takes damage
- Combined ATK bonuses apply correctly in resolveAttack
- No buff overwrites another

#### S54: `companion-aoe-interaction`
**Tests:** ran-bea-5 (Alpha Predator companion) vs mag-ele-1 (Fireball AoE)
**Setup:** 2v2 — L30 Ranger/Beastmaster + L30 Warrior vs L30 Mage/Elementalist + L30 Orc
**Action queue:**
- Beastmaster: ran-bea-5 "Alpha Predator" (first_round), ran-bea-4 "Bestial Fury" (has_companion)
- Mage: mag-ele-1 "Fireball" (always)
**Key assertions:**
- Companion summon creates the companion buff with HP
- Fireball AoE — verify if companion intercepts or takes AoE damage
- Companion auto-damage still fires each round
- Bestial Fury companion_attack deals expected damage

### Tier 3: Edge Case / Stress Scenarios (NICE TO HAVE)

#### S55: `death-prevention-drain`
**Tests:** war-ber-6 (Undying Fury cheatingDeath) + mag-nec-1 (Life Drain) interaction
**Setup:** L40 Warrior/Berserker (8 HP) vs L40 Mage/Necromancer
**Action queue:**
- Berserker: war-ber-1 "Reckless Strike" (always)
- Necromancer: mag-nec-1 "Life Drain" (always)
**Passives:** war-ber-6 (cheatingDeath)
**Key assertions:**
- When Berserker dies, Undying Fury triggers (revive to 1 HP)
- Drain healing still works after death prevention fires
- usesPerCombat: 1 — second death is permanent
- Necromancer drain heals correctly after killing + revived target

#### S56: `poison-stealth-chain`
**Tests:** rog-ass-3 (ACTUAL Poison Blade) + rog-ass-2 (Vanish) + rog-ass-4 (Ambush) full Assassin kit
**Setup:** L30 Rogue/Assassin vs L30 Training Dummy
**Action queue:**
1. rog-ass-3 "Poison Blade" (first_round) → apply poison charges buff
2. rog-ass-2 "Vanish" (always) → stealth
3. rog-ass-4 "Ambush" (always) → 3x damage from stealth
**Passives:** rog-ass-6 (Shadow Mastery, critChanceBonus: 15)
**Key assertions:**
- Poison Blade creates buff with 3 poison charges
- Each attack applies poisoned status and decrements charges
- Ambush 3x multiplier applies from stealth
- Shadow Mastery critChanceBonus expands crit range
- Poison DoT ticks alongside normal combat

#### S57: `paladin-holy-kit`
**Tests:** cle-pal-1 through cle-pal-6 + holyDamageBonus mechanic
**Setup:** L40 Cleric/Paladin vs L35 Skeleton Warrior (undead flag)
**Action queue:**
1. cle-pal-2 "Holy Armor" (first_round) → acBonus buff
2. cle-pal-3 "Consecrate" (always) → radiant AoE DoT
3. cle-pal-1 "Smite" (always) → radiant damage
4. cle-pal-4 "Judgment" (always) → radiant drain
5. cle-pal-5 "Divine Wrath" (always) → radiant AoE
**Passives:** cle-pal-6 (Avatar of Light, holyDamageBonus: 0.25)
**Key assertions:**
- All radiant damage gets +25% from holyDamageBonus
- Consecrate bonusVsUndead doubles damage vs skeleton
- Judgment drain heals Paladin for 50% of radiant damage dealt
- Divine Wrath AoE hits all enemies with radiant damage

#### S58: `hunter-mark-advantage`
**Tests:** ran-tra-3 (Hunter's Mark, bonusDamageFromYou) + ran-tra-5 (Predator Instinct, advantageVsLowHp) + ran-tra-6 (Master Tracker, firstStrikeCrit)
**Setup:** L40 Ranger/Tracker vs L35 Orc (start at 40% HP for advantage trigger)
**Action queue:**
1. ran-tra-3 "Hunter's Mark" (first_round) → bonusDamageFromYou: 4 on target
2. ran-tra-1 "Lay Trap" (always) → trap buff
**Passives:** ran-tra-5 (advantageVsLowHp), ran-tra-6 (firstStrikeCrit)
**Key assertions:**
- First attack auto-crits (firstStrikeCrit)
- Target below 50% HP → advantage roll (roll twice, take better)
- Hunter's Mark: target takes +4 bonus damage from Tracker specifically
- Trap fires on enemy attack
- hasAttackedThisCombat flips after first attack

---

## Section 7: Remaining Implementation Gaps

| Ability ID | Ability Name | Expected Behavior | Actual Code Path | Gap Description |
|-----------|-------------|-------------------|------------------|-----------------|
| `bar-bat-4` | Shatter | Deals sonic damage + applies AC debuff | `handleDamageDebuff` handler exists | Handler creates `weakened` status from `acReduction` — but Shatter has `acReduction: -4`, need to verify `weakened` is the correct status and the -4 AC is applied properly |
| `mag-nec-3` | Corpse Explosion | AoE damage, requires dead target on field | `handleAoeDamage` has `requiresCorpse` guard | Guard checks `state.combatants.find(c => c.currentHp <= 0)` — verify this works with death prevention reviving corpses |
| `bar-bat-6` | Epic Finale | AoE damage with `bonusPerRound` scaling | `handleAoeDamage` has Epic Finale branch | Uses `state.round` for scaling — verify `bonusPerRound * state.round` actually increases damage over time |
| `rog-thi-3` | Quick Fingers | +10% gold from kills | `handlePassive` (no-op) | Non-combat passive. No code in combat engine processes `goldBonus`. Would need to be applied in loot/reward processing, not combat. |
| `rog-thi-6` | Treasure Sense | +25% loot quality/quantity | `handlePassive` (no-op) | Non-combat passive. Same as Quick Fingers — needs loot system integration. |
| `bar-lor-2` | Recall Lore | +15% XP from combat | `handlePassive` (no-op) | Non-combat passive. Would need XP grant multiplier in progression system. |
| `bar-lor-6` | Omniscient | +25% global XP | `handlePassive` (no-op) | Non-combat passive. Same as Recall Lore. |
| `psi-tel-2` | Thought Shield | Psychic resistance + mental save bonus | `applyPassiveAbilities` — NOT HANDLED | No code path for `psychicResistance` or `mentalSaveBonus` in applyPassiveAbilities. Would need: (1) damage type resistance in resolveAttack, (2) save bonus in psion ability resolution. |
| `psi-see-2` | Danger Sense | Cannot be surprised, +2 initiative, reveal hidden | `applyPassiveAbilities` — NOT HANDLED | No code path for `cannotBeSurprised`, `initiativeBonus` (passive), or `revealHidden`. Initiative bonus would need to be added before initiative rolls. |
| `psi-see-4` | Third Eye | See invisible, see disguises, immune blinded, trap detection | `applyPassiveAbilities` — NOT HANDLED | Multiple unimplemented fields: `seeInvisible`, `seeDisguises`, `immuneBlinded`, `trapDetectionBonus`. Would need integration with stealth/blinded/trap systems. |
| `psi-nom-2` | Phase Step | +3 AC vs opportunity attacks, free disengage | `applyPassiveAbilities` — NOT HANDLED | `freeDisengage` has no combat engine support. `opportunityAttackAcBonus` has no opportunity attack system implemented. |
| `psi-see-5` | Temporal Echo | Repeat last action as free action | `resolvePsionAbility` echo handler | Handler exists but has NO TEST. Complex mechanic — needs to replay previous action without consuming the turn. High risk of bugs. |
| `psi-nom-4` | Translocation | Swap positions, enemy loses action / ally gains AC | `resolvePsionAbility` swap handler | Handler exists but has NO TEST. Dual-effect ability (different results for enemy vs ally target). |
| `psi-nom-6` | Banishment | Remove from combat for 3 rounds, damage on return | `resolvePsionAbility` banish handler | Handler exists but has NO TEST. Complex state management — target must be tracked while banished and returned with damage/stun. `noDuplicateBanish` flag needs validation. |

---

## SUMMARY

```
Total abilities: 126
Tested: 54 (43%)
Passive-Tested: 5 (4%)
Indirect (handler tested, ability not): 35 (28%)
Untested: 32 (25%)

Subclasses with zero coverage: 1 (Bard/Battlechanter)
Subclasses below 33% coverage: 4 (Healer 17%, Lorekeeper 17%, Rogue/Thief 33%, Psion/Seer 33%)

Handlers with zero tested abilities: 8
  Non-Psion: damage_debuff, hot, cleanse, flee, aoe_debuff
  Psion: echo, swap, banish

Phase 5B mechanics status:
  - Working with correct IDs: 13/29
  - Partially tested (manual setup / wrong IDs): 5/29
  - Completely untested: 11/29
  - Phase 5B phantom ID scenarios: 6 of 11 BROKEN

Recommended new scenarios: 13
  Tier 1 (MUST HAVE): 4 (S46-S49) — zero/low coverage subclass full kits
  Tier 2 (HIGH VALUE): 5 (S50-S54) — cross-class interactions
  Tier 3 (NICE TO HAVE): 4 (S55-S58) — edge cases + mechanic validation

Implementation gaps found: 13
  - 4 non-combat passives with no combat engine code path (expected, needs loot/XP integration)
  - 4 Psion passives with no applyPassiveAbilities code path (missing implementation)
  - 3 Psion active abilities with untested handlers (echo, swap, banish)
  - 2 aoe_damage special branches needing validation (requiresCorpse, bonusPerRound)

CRITICAL FIX NEEDED FIRST: Repair 6 Phase 5B scenarios with phantom ability IDs before running any scenarios.
```
