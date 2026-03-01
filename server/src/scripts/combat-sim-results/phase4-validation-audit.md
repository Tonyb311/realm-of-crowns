# Phase 4 Validation Audit Report

**Date:** 2026-03-01
**Auditor:** Claude Opus 4.6 (read-only audit)
**Scope:** Combat simulator scenarios, ability coverage, engine interactions, determinism

---

## 1. Existing Scenario Coverage

### Scenario 1: `basic-melee`
- **Combatants:** L5 Human Warrior (STR 16, AC 16, Longsword) vs L6 Orc Warrior monster (STR 16, AC 14, Greataxe)
- **Class/Abilities:** None equipped (no `unlockedAbilityIds`)
- **Mechanics tested:** Basic attack rolls, d20 vs AC, weapon damage, initiative, turn order
- **Edge cases covered:** Orc has `neverRetreat`, player has default retreat threshold (20%)
- **NOT covered:** No class abilities, no spells, no status effects, no racial abilities

### Scenario 2: `spell-vs-melee`
- **Combatants:** L7 Elf Mage (INT 18, AC 13, spells: Fire Bolt, Burning Hands, Scorching Ray, Fireball) vs L7 Human Warrior (STR 18, AC 18, Greatsword)
- **Class/Abilities:** None equipped
- **Mechanics tested:** Spell casting, spell slots, saving throws (DEX saves), burning status, cantrips, spell prioritization
- **Edge cases covered:** Defensive mage vs aggressive warrior (stance variety)
- **NOT covered:** No class abilities, mage doesn't have healing spells for smart-heal AI logic

### Scenario 3: `status-effects`
- **Combatants:** L6 Nethkin Mage (CHA 16, spells: Hex, Hellfire, Blight) vs L6 Dwarf Cleric (WIS 16, spells: Healing Word, Bless, Regenerate)
- **Class/Abilities:** None equipped
- **Mechanics tested:** DoT (poisoned, burning), HoT (regenerating), buff (blessed), healing, status tick resolution
- **Edge cases covered:** Nethkin Infernal Rebuke fire reflect on melee, healing under pressure
- **NOT covered:** No class abilities, no dispel, no cleanse, no crowd control interrupts

### Scenario 4: `flee-test`
- **Combatants:** L3 Halfling Rogue (DEX 16, retreatHpThreshold: 50%) vs L14 Young Dragon monster (STR 21, AC 17, HP 152)
- **Class/Abilities:** None equipped
- **Mechanics tested:** Flee mechanic, retreat HP threshold decision, evasive stance, massive level gap
- **Edge cases covered:** Massive power imbalance, flee at 50% HP
- **NOT covered:** No class flee ability (Disengage), no Thief `rog-thi-4`

### Scenario 5: `racial-abilities`
- **Combatants:** L10 Half-Orc Warrior (Savage Attacks ability queue) vs L10 Drakonid Mage (Breath Weapon ability queue, Red sub-race)
- **Class/Abilities:** Racial only (savage-attacks, breath-weapon)
- **Mechanics tested:** Racial ability dispatch, sub-race element, racial queue with `first_round` condition
- **Edge cases covered:** Racial abilities fired via abilityQueue, aggressive vs balanced stance
- **NOT covered:** No class abilities mixed with racial, no Nethkin reflect + class counter stacking

### Scenario 6: `team-fight`
- **Combatants:** 3v3 (Warrior+Mage+Cleric vs Rogue+Ranger+Necro-Mage), all L8
- **Class/Abilities:** None equipped
- **Mechanics tested:** Multi-combatant turn order, multi-team targeting logic, healing prioritization
- **Edge cases covered:** Mixed roles, team AI choosing weakest targets, spell slot management
- **NOT covered:** No class abilities, no AoE mechanics despite having 3+ targets, no team synergy abilities

### Scenario 7: `class-abilities`
- **Combatants:** L10 Orc Warrior/Berserker (`war-ber-1` Reckless Strike) vs L10 Human Cleric/Healer (`cle-hea-1` Healing Light)
- **Abilities in play:** `war-ber-1` (damage + self AC debuff), `cle-hea-1` (heal, trigger at HP <= 60%)
- **Mechanics tested:** Class ability dispatch, `useWhen: always` vs `useWhen: low_hp`, cooldowns, damage handler, heal handler
- **Edge cases covered:** Heal triggered conditionally, cooldown=0 means always available
- **NOT covered:** Only 2 of 126 abilities, no buff/debuff/AoE/counter/trap/companion/special

### Scenario 8: `aoe-abilities`
- **Combatants:** L20 Elf Mage/Elementalist (`mag-ele-1` Fireball, `mag-ele-3` Chain Lightning, `mag-ele-5` Meteor Strike) vs 3x L15 Orc Warrior monsters
- **Abilities in play:** 3 abilities covering `aoe_damage` and `multi_target` effect types
- **Mechanics tested:** AoE damage distribution, multi-target Chain Lightning (capped at 3), per-target results, first_round Meteor Strike priority
- **Edge cases covered:** AoE against multiple enemies, first_round conditional
- **NOT covered:** AoE against dead targets, AoE when some enemies already killed in same round, no Elemental Shield (absorb)

### Scenario 9: `multi-attack`
- **Combatants:** L22 Halfling Rogue/Swashbuckler (`rog-swa-1` Riposte, `rog-swa-2` Dual Strike, `rog-swa-4` Flurry of Blades) vs L22 Human Warrior/Guardian (`war-gua-1` Shield Bash, `war-gua-2` Fortify)
- **Abilities in play:** 5 abilities (multi_attack, counter, damage_status, buff)
- **Mechanics tested:** Multi-attack strike-by-strike (2 and 4 strikes), damage multiplier, accuracy penalty, Fortify AC buff, Riposte counter stance
- **Edge cases covered:** Flurry 4x strikes with 0.4 multiplier, Fortify first_round
- **NOT covered:** Multi-attack + companion interaction, counter vs multi-attack (does counter trigger per-strike?), Shield Bash stun not queued

### Scenario 10: `counter-trap`
- **Combatants:** L14 Halfling Rogue/Swashbuckler (`rog-swa-1` Riposte) vs L22 Elf Ranger/Tracker (`ran-tra-1` Lay Trap, `ran-tra-4` Explosive Trap)
- **Abilities in play:** 3 abilities covering `counter` and `trap` effect types
- **Mechanics tested:** Reactive counter on melee_attack, Lay Trap on attacked, Explosive Trap AoE reactive, trap re-arming
- **Edge cases covered:** Explosive Trap first_round priority, counter vs trap interaction (both combatants have reactive), single target trap vs AoE trap
- **NOT covered:** Both traps triggering same round, trap against ranged attacks, trap when trap-layer is killed by the attack

### Scenario 11: `companion`
- **Combatants:** L30 Elf Ranger/Beastmaster (`ran-bea-1` Call Companion, `ran-bea-4` Bestial Fury, `ran-bea-5` Alpha Predator) vs 2x L20 Orc monsters
- **Abilities in play:** 3 abilities covering `summon` and `companion_attack` effect types
- **Mechanics tested:** Companion summon (Alpha Predator with HP), companion auto-damage per tick, Bestial Fury directed companion attack, `has_companion` useWhen condition, companion interception (30% chance)
- **Edge cases covered:** Alpha summon with companionHp, companion targeting random enemy
- **NOT covered:** Companion auto-damage killing last enemy (does combat end mid-tick?), companion HP depletion through interception, companion + HoT tick ordering

### Scenario 12: `special-abilities`
- **Combatants:** 3v2 arena. L22 Human Bard/Diplomat (`bar-dip-4` Diplomat's Gambit), L30 Halfling Rogue/Thief (`rog-thi-1` Pilfer, `rog-thi-5` Mug), L30 Gnome Bard/Lorekeeper (`bar-lor-5` Tome of Secrets) vs 2 monsters
- **Abilities in play:** 4 abilities covering `special` (Gambit, Tome), `steal`, `damage_steal` effect types
- **Mechanics tested:** Diplomat's Gambit 50% peaceful resolution, Pilfer gold steal, Mug damage+steal+loot roll, Tome of Secrets random ability channeling
- **Edge cases covered:** Peaceful resolution combat end, Tome of Secrets delegating to random handler, 3v2 team composition
- **NOT covered:** Gambit at max rounds, Tome picking heal/AoE in edge conditions, Tome picking a handler that requires a corpse

---

## 2. Ability Coverage Matrix

### Legend
- **In Scenario:** Y = appears in `unlockedAbilityIds` of at least one scenario combatant
- **In Queue:** Y = appears in `abilityQueue` and will be actively dispatched
- **Tested:** FULL = mechanics specifically exercised, PARTIAL = present but not all paths exercised, NO = never appears

| ID | Name | Class | Spec | Effect Type | In Scenario? | In Queue? | Tested? |
|---|---|---|---|---|---|---|---|
| `war-ber-1` | Reckless Strike | Warrior | Berserker | damage | S7 | S7 | FULL |
| `war-ber-2` | Blood Rage | Warrior | Berserker | buff | - | - | NO |
| `war-ber-3` | Cleave | Warrior | Berserker | aoe_damage | - | - | NO |
| `war-ber-4` | Frenzy | Warrior | Berserker | multi_attack | - | - | NO |
| `war-ber-5` | Berserker Rage | Warrior | Berserker | buff | - | - | NO |
| `war-ber-6` | Undying Fury | Warrior | Berserker | passive | - | - | NO |
| `war-gua-1` | Shield Bash | Warrior | Guardian | damage_status | S9 | - | PARTIAL (unlocked, not queued) |
| `war-gua-2` | Fortify | Warrior | Guardian | buff | S9 | S9 | FULL |
| `war-gua-3` | Taunt | Warrior | Guardian | status | - | - | NO |
| `war-gua-4` | Shield Wall | Warrior | Guardian | buff | - | - | NO |
| `war-gua-5` | Iron Bulwark | Warrior | Guardian | buff | - | - | NO |
| `war-gua-6` | Unbreakable | Warrior | Guardian | passive | - | - | NO |
| `war-war-1` | Rally Cry | Warrior | Warlord | buff | - | - | NO |
| `war-war-2` | Commanding Strike | Warrior | Warlord | damage | - | - | NO |
| `war-war-3` | Tactical Advance | Warrior | Warlord | buff | - | - | NO |
| `war-war-4` | Inspiring Presence | Warrior | Warlord | passive | - | - | NO |
| `war-war-5` | Warlord's Decree | Warrior | Warlord | buff | - | - | NO |
| `war-war-6` | Legendary Commander | Warrior | Warlord | heal | - | - | NO |
| `mag-ele-1` | Fireball | Mage | Elementalist | aoe_damage | S8 | S8 | FULL |
| `mag-ele-2` | Frost Lance | Mage | Elementalist | damage_status | - | - | NO |
| `mag-ele-3` | Chain Lightning | Mage | Elementalist | multi_target | S8 | S8 | FULL |
| `mag-ele-4` | Elemental Shield | Mage | Elementalist | buff | - | - | NO |
| `mag-ele-5` | Meteor Strike | Mage | Elementalist | aoe_damage | S8 | S8 | FULL |
| `mag-ele-6` | Arcane Mastery | Mage | Elementalist | passive | - | - | NO |
| `mag-nec-1` | Life Drain | Mage | Necromancer | drain | - | - | NO |
| `mag-nec-2` | Shadow Bolt | Mage | Necromancer | damage | - | - | NO |
| `mag-nec-3` | Corpse Explosion | Mage | Necromancer | aoe_damage | - | - | NO |
| `mag-nec-4` | Bone Armor | Mage | Necromancer | buff | - | - | NO |
| `mag-nec-5` | Soul Harvest | Mage | Necromancer | aoe_drain | - | - | NO |
| `mag-nec-6` | Lichdom | Mage | Necromancer | passive | - | - | NO |
| `mag-enc-1` | Arcane Bolt | Mage | Enchanter | damage | - | - | NO |
| `mag-enc-2` | Enfeeble | Mage | Enchanter | debuff | - | - | NO |
| `mag-enc-3` | Haste | Mage | Enchanter | buff | - | - | NO |
| `mag-enc-4` | Arcane Siphon | Mage | Enchanter | debuff | - | - | NO |
| `mag-enc-5` | Polymorph | Mage | Enchanter | status | - | - | NO |
| `mag-enc-6` | Spell Weaver | Mage | Enchanter | passive | - | - | NO |
| `rog-ass-1` | Backstab | Rogue | Assassin | damage | - | - | NO |
| `rog-ass-2` | Vanish | Rogue | Assassin | buff | - | - | NO |
| `rog-ass-3` | Poison Blade | Rogue | Assassin | buff | - | - | NO |
| `rog-ass-4` | Ambush | Rogue | Assassin | damage | - | - | NO |
| `rog-ass-5` | Death Mark | Rogue | Assassin | delayed_damage | - | - | NO |
| `rog-ass-6` | Shadow Mastery | Rogue | Assassin | passive | - | - | NO |
| `rog-thi-1` | Pilfer | Rogue | Thief | steal | S12 | S12 | FULL |
| `rog-thi-2` | Smoke Bomb | Rogue | Thief | aoe_debuff | - | - | NO |
| `rog-thi-3` | Quick Fingers | Rogue | Thief | passive | - | - | NO |
| `rog-thi-4` | Disengage | Rogue | Thief | flee | - | - | NO |
| `rog-thi-5` | Mug | Rogue | Thief | damage_steal | S12 | S12 | FULL |
| `rog-thi-6` | Treasure Sense | Rogue | Thief | passive | - | - | NO |
| `rog-swa-1` | Riposte | Rogue | Swashbuckler | counter | S9, S10 | S9*, S10 | FULL |
| `rog-swa-2` | Dual Strike | Rogue | Swashbuckler | multi_attack | S9 | S9 | FULL |
| `rog-swa-3` | Evasion | Rogue | Swashbuckler | buff | - | - | NO |
| `rog-swa-4` | Flurry of Blades | Rogue | Swashbuckler | multi_attack | S9 | S9 | FULL |
| `rog-swa-5` | Dance of Steel | Rogue | Swashbuckler | buff | - | - | NO |
| `rog-swa-6` | Untouchable | Rogue | Swashbuckler | passive | - | - | NO |
| `cle-hea-1` | Healing Light | Cleric | Healer | heal | S7 | S7 | FULL |
| `cle-hea-2` | Purify | Cleric | Healer | cleanse | - | - | NO |
| `cle-hea-3` | Regeneration | Cleric | Healer | hot | - | - | NO |
| `cle-hea-4` | Divine Shield | Cleric | Healer | buff | - | - | NO |
| `cle-hea-5` | Resurrection | Cleric | Healer | passive | - | - | NO |
| `cle-hea-6` | Miracle | Cleric | Healer | heal | - | - | NO |
| `cle-pal-1` | Smite | Cleric | Paladin | damage | - | - | NO |
| `cle-pal-2` | Holy Armor | Cleric | Paladin | buff | - | - | NO |
| `cle-pal-3` | Consecrate | Cleric | Paladin | aoe_dot | - | - | NO |
| `cle-pal-4` | Judgment | Cleric | Paladin | drain | - | - | NO |
| `cle-pal-5` | Divine Wrath | Cleric | Paladin | aoe_damage | - | - | NO |
| `cle-pal-6` | Avatar of Light | Cleric | Paladin | passive | - | - | NO |
| `cle-inq-1` | Denounce | Cleric | Inquisitor | debuff | - | - | NO |
| `cle-inq-2` | Penance | Cleric | Inquisitor | damage | - | - | NO |
| `cle-inq-3` | Silence | Cleric | Inquisitor | status | - | - | NO |
| `cle-inq-4` | Purging Flame | Cleric | Inquisitor | dispel_damage | - | - | NO |
| `cle-inq-5` | Excommunicate | Cleric | Inquisitor | debuff | - | - | NO |
| `cle-inq-6` | Inquisitor's Verdict | Cleric | Inquisitor | passive | - | - | NO |
| `ran-bea-1` | Call Companion | Ranger | Beastmaster | summon | S11 | - | PARTIAL (unlocked but not queued directly -- Alpha Predator replaces) |
| `ran-bea-2` | Wild Bond | Ranger | Beastmaster | heal | - | - | NO |
| `ran-bea-3` | Pack Tactics | Ranger | Beastmaster | buff | - | - | NO |
| `ran-bea-4` | Bestial Fury | Ranger | Beastmaster | companion_attack | S11 | S11 | FULL |
| `ran-bea-5` | Alpha Predator | Ranger | Beastmaster | summon | S11 | S11 | FULL |
| `ran-bea-6` | Spirit Bond | Ranger | Beastmaster | passive | - | - | NO |
| `ran-sha-1` | Aimed Shot | Ranger | Sharpshooter | damage | - | - | NO |
| `ran-sha-2` | Multi-Shot | Ranger | Sharpshooter | multi_target | - | - | NO |
| `ran-sha-3` | Piercing Arrow | Ranger | Sharpshooter | damage | - | - | NO |
| `ran-sha-4` | Headshot | Ranger | Sharpshooter | damage | - | - | NO |
| `ran-sha-5` | Rain of Arrows | Ranger | Sharpshooter | aoe_damage | - | - | NO |
| `ran-sha-6` | Eagle's Eye | Ranger | Sharpshooter | passive | - | - | NO |
| `ran-tra-1` | Lay Trap | Ranger | Tracker | trap | S10 | S10 | FULL |
| `ran-tra-2` | Snare | Ranger | Tracker | status | - | - | NO |
| `ran-tra-3` | Hunter's Mark | Ranger | Tracker | debuff | - | - | NO |
| `ran-tra-4` | Explosive Trap | Ranger | Tracker | trap | S10 | S10 | FULL |
| `ran-tra-5` | Predator Instinct | Ranger | Tracker | passive | - | - | NO |
| `ran-tra-6` | Master Tracker | Ranger | Tracker | passive | - | - | NO |
| `bar-dip-1` | Charming Words | Bard | Diplomat | debuff | - | - | NO |
| `bar-dip-2` | Silver Tongue | Bard | Diplomat | status | - | - | NO |
| `bar-dip-3` | Soothing Presence | Bard | Diplomat | passive | - | - | NO |
| `bar-dip-4` | Diplomat's Gambit | Bard | Diplomat | special | S12 | S12 | FULL |
| `bar-dip-5` | Enthrall | Bard | Diplomat | status | - | - | NO |
| `bar-dip-6` | Legendary Charisma | Bard | Diplomat | passive | - | - | NO |
| `bar-bat-1` | War Song | Bard | Battlechanter | buff | - | - | NO |
| `bar-bat-2` | Discordant Note | Bard | Battlechanter | damage | - | - | NO |
| `bar-bat-3` | Marching Cadence | Bard | Battlechanter | buff | - | - | NO |
| `bar-bat-4` | Shatter | Bard | Battlechanter | damage_debuff | - | - | NO |
| `bar-bat-5` | Crescendo | Bard | Battlechanter | passive | - | - | NO |
| `bar-bat-6` | Epic Finale | Bard | Battlechanter | aoe_damage | - | - | NO |
| `bar-lor-1` | Analyze | Bard | Lorekeeper | buff | - | - | NO |
| `bar-lor-2` | Recall Lore | Bard | Lorekeeper | passive | - | - | NO |
| `bar-lor-3` | Exploit Weakness | Bard | Lorekeeper | damage | - | - | NO |
| `bar-lor-4` | Arcane Insight | Bard | Lorekeeper | buff | - | - | NO |
| `bar-lor-5` | Tome of Secrets | Bard | Lorekeeper | special | S12 | S12 | FULL |
| `bar-lor-6` | Omniscient | Bard | Lorekeeper | passive | - | - | NO |
| `psi-tel-1` | Mind Spike | Psion | Telepath | damage_status | - | - | NO |
| `psi-tel-2` | Thought Shield | Psion | Telepath | passive | - | - | NO |
| `psi-tel-3` | Psychic Crush | Psion | Telepath | damage_status | - | - | NO |
| `psi-tel-4` | Dominate | Psion | Telepath | control | - | - | NO |
| `psi-tel-5` | Mind Shatter | Psion | Telepath | aoe_damage_status | - | - | NO |
| `psi-tel-6` | Absolute Dominion | Psion | Telepath | control | - | - | NO |
| `psi-see-1` | Foresight | Psion | Seer | buff | - | - | NO |
| `psi-see-2` | Danger Sense | Psion | Seer | passive | - | - | NO |
| `psi-see-3` | Precognitive Dodge | Psion | Seer | reaction | - | - | NO |
| `psi-see-4` | Third Eye | Psion | Seer | passive | - | - | NO |
| `psi-see-5` | Temporal Echo | Psion | Seer | echo | - | - | NO |
| `psi-see-6` | Prescient Mastery | Psion | Seer | buff | - | - | NO |
| `psi-nom-1` | Blink Strike | Psion | Nomad | teleport_attack | - | - | NO |
| `psi-nom-2` | Phase Step | Psion | Nomad | passive | - | - | NO |
| `psi-nom-3` | Dimensional Pocket | Psion | Nomad | phase | - | - | NO |
| `psi-nom-4` | Translocation | Psion | Nomad | swap | - | - | NO |
| `psi-nom-5` | Rift Walk | Psion | Nomad | aoe_damage_status | - | - | NO |
| `psi-nom-6` | Banishment | Psion | Nomad | banish | - | - | NO |

### Coverage Summary

| Status | Count | Percentage |
|---|---|---|
| **FULL** (actively dispatched and exercised) | 17 | 13.5% |
| **PARTIAL** (unlocked but not primary test target) | 2 | 1.6% |
| **NO** (never appears in any scenario) | 107 | 84.9% |

**Directly tested abilities:** `war-ber-1`, `war-gua-2`, `mag-ele-1`, `mag-ele-3`, `mag-ele-5`, `cle-hea-1`, `rog-thi-1`, `rog-thi-5`, `rog-swa-1`, `rog-swa-2`, `rog-swa-4`, `ran-bea-4`, `ran-bea-5`, `ran-tra-1`, `ran-tra-4`, `bar-dip-4`, `bar-lor-5`

---

## 3. Untested Abilities by Priority

### HIGH Priority (unique/complex mechanics with no scenario coverage)

These abilities have unique effect types that no existing scenario exercises:

| ID | Name | Effect Type | Risk |
|---|---|---|---|
| `rog-ass-5` | Death Mark | `delayed_damage` | Only delayed_damage ability in the game. Detonation after 3 rounds, target could be dead/healed by then. Tick logic in `tickDelayedEffects` never exercised by sim. |
| `mag-nec-3` | Corpse Explosion | `aoe_damage` (requiresCorpse) | Only ability requiring a dead enemy. If no corpses exist, should no-op. Never tested. |
| `mag-nec-1` | Life Drain | `drain` | Drain mechanic (damage + self-heal %). No scenario exercises drain at all. |
| `mag-nec-5` | Soul Harvest | `aoe_drain` | AoE drain (damage all + heal per target). Entirely untested. |
| `cle-inq-4` | Purging Flame | `dispel_damage` | Only dispel ability. Removes buffs and deals damage per buff. Never tested against buffed targets. |
| `cle-pal-3` | Consecrate | `aoe_dot` | Only AoE DoT ability. Applies burning to all enemies for X rounds. Never tested. |
| `rog-thi-4` | Disengage | `flee` | Class-based flee (90% success). Never tested -- distinct from basic flee. |
| `cle-hea-2` | Purify | `cleanse` | Only cleanse ability. Removes debuffs from self. Never tested -- especially edge case: no debuffs to cleanse. |
| `rog-thi-2` | Smoke Bomb | `aoe_debuff` | Only AoE debuff ability. Applies blinded to all enemies. Never tested. |
| `war-ber-6` | Undying Fury | `passive` (cheatingDeath) | Death prevention passive. Survive at 1 HP once per combat. Never tested -- critical for game balance. |
| `mag-nec-6` | Lichdom | `passive` (reviveOnDeath) | Revive at 50% HP on death. Never tested -- same critical mechanic as Undying Fury. |
| `cle-hea-5` | Resurrection | `passive` (reviveOnDeath) | Revive at 25% HP on death. Same concern. |
| `mag-enc-5` | Polymorph | `status` (polymorph) | Transforms enemy for 2 rounds. Status type 'polymorph' mapped in resolver but never tested. |
| `cle-inq-3` | Silence | `status` (silence) | Prevents spellcasting for 2 rounds. Never tested against a spellcaster. |
| `bar-dip-2` | Silver Tongue | `status` (skip_turn) | Forces enemy to skip turn. Never tested. |
| `bar-dip-5` | Enthrall | `status` (mesmerize) | Mesmerize for 3 rounds (broken by damage). Never tested. |

### HIGH Priority: All 18 Psion Abilities

The **entire Psion class** has zero scenario coverage. Psion abilities use distinct effect types (`control`, `reaction`, `echo`, `phase`, `swap`, `banish`, `teleport_attack`, `aoe_damage_status`) that are handled by the psion-specific resolver in combat-engine.ts, NOT the class-ability-resolver.ts `EFFECT_HANDLERS` map. This is a fundamentally separate code path.

| ID | Name | Type | Specific Risk |
|---|---|---|---|
| `psi-tel-1` | Mind Spike | damage_status | Psion resolver path untested |
| `psi-tel-2` | Thought Shield | passive | Psychic resistance and mental save bonus |
| `psi-tel-3` | Psychic Crush | damage_status | Half damage on save path |
| `psi-tel-4` | Dominate | control | Forces target to attack allies. Complex domination logic in resolveTurn. |
| `psi-tel-5` | Mind Shatter | aoe_damage_status | AoE psychic + status path |
| `psi-tel-6` | Absolute Dominion | control | 2-round control + fail damage + fail stun |
| `psi-see-1` | Foresight | buff | AC + save bonus self-buff |
| `psi-see-2` | Danger Sense | passive | Initiative bonus, surprise immunity |
| `psi-see-3` | Precognitive Dodge | reaction | Negate one attack per combat -- unique reaction type |
| `psi-see-4` | Third Eye | passive | See invisible, immune blinded |
| `psi-see-5` | Temporal Echo | echo | Repeat last action as free action -- unique echo type |
| `psi-see-6` | Prescient Mastery | buff | Enemy disadvantage + self advantage |
| `psi-nom-1` | Blink Strike | teleport_attack | Teleport + attack -- unique type |
| `psi-nom-2` | Phase Step | passive | Free disengage |
| `psi-nom-3` | Dimensional Pocket | phase | Untargetable 1 round -- unique phase type |
| `psi-nom-4` | Translocation | swap | Position swap -- unique swap type |
| `psi-nom-5` | Rift Walk | aoe_damage_status | AoE damage + slow |
| `psi-nom-6` | Banishment | banish | Remove from combat 3 rounds -- complex return logic in advanceTurn |

### MEDIUM Priority (effect types exercised, but specific ability variants untested)

| ID | Name | Effect Type | Why Medium |
|---|---|---|---|
| `war-ber-2` | Blood Rage | buff (attackScaling: missingHpPercent) | Unique scaling mechanic -- attack power scales with missing HP %. Handler likely treats this as a standard buff, missing the scaling. |
| `war-ber-3` | Cleave | aoe_damage (damageMultiplier) | AoE with weapon damage multiplier path (0.8x). handleAoeDamage has this path but untested. |
| `war-ber-4` | Frenzy | multi_attack | 2 strikes with -3 accuracy. Multi-attack is tested via Swashbuckler, but Frenzy's accuracy penalty variant is not. |
| `war-gua-3` | Taunt | status (taunt) | Taunt status mapped but engine handling unknown -- does taunt force target selection? |
| `war-gua-4` | Shield Wall | buff (damageReduction: 0.5) | 50% DR buff. DR is in handleBuff but resolveAttack's `getBuffDamageReduction` path untested. |
| `war-gua-5` | Iron Bulwark | buff (damageReflect + immovable) | Damage reflect via buff. Only Nethkin racial reflect is tested. Class buff reflect path untested. |
| `war-war-3` | Tactical Advance | buff (extraAction) | Extra action. Handled in buff but does the engine actually grant an extra action? |
| `war-war-5` | Warlord's Decree | buff (guaranteedHits: 3) | Guaranteed hits. Stored in buff but is `getBuffAttackMod` or attack resolution checking this? |
| `war-war-6` | Legendary Commander | heal (fullRestore, usesPerCombat: 1) | Full HP restore once per combat. Heal handler has this path but untested. |
| `mag-ele-2` | Frost Lance | damage_status (slow) | Slow status. damage_status handler tested, but slow-specific effects not verified. |
| `mag-ele-4` | Elemental Shield | buff (absorbDamage: 30) | Absorption shield. `consumeAbsorption` in resolveAttack is untested. |
| `mag-enc-2` | Enfeeble | debuff (attack + AC reduction) | Debuff with both attack and AC reduction. Debuff handler tested via scenarios, but dual-reduction path untested. |
| `mag-enc-3` | Haste | buff (extraAction) | Same concern as Tactical Advance. |
| `mag-enc-4` | Arcane Siphon | debuff | Simpler debuff variant, but untested. |
| `mag-nec-2` | Shadow Bolt | damage (element: shadow) | Basic damage with element. Damage handler is tested but element is cosmetic. |
| `mag-nec-4` | Bone Armor | buff (absorbDamage + acBonus) | Dual absorb + AC. Same absorption concern. |
| `rog-ass-1` | Backstab | damage (critBonus: 10) | Crit bonus mechanic. Damage handler doesn't appear to apply critBonus dynamically. |
| `rog-ass-2` | Vanish | buff (stealth + untargetable) | Stealth/untargetable. Buff is set but does targeting logic respect `stealthed`? |
| `rog-ass-3` | Poison Blade | buff (poisonCharges) | Poison charges on weapon. Unique mechanic -- subsequent attacks should apply DoT. Entirely unimplemented in handler? |
| `rog-ass-4` | Ambush | damage (requiresStealth, 3x multiplier) | Requires Vanish active. Never tested -- dependency chain. |
| `rog-swa-3` | Evasion | buff (dodgeBonus: 30) | High dodge buff. dodge is in buff handler but does resolveAttack check dodgeMod? |
| `rog-swa-5` | Dance of Steel | buff (stackingAttackSpeed) | Stacking attack speed per hit. Unique stacking mechanic -- likely not implemented in handler. |
| `ran-bea-2` | Wild Bond | heal (healsSelf + healsCompanion) | Dual heal (self + companion). Heal handler may not check healsCompanion. |
| `ran-bea-3` | Pack Tactics | buff (advantage) | Advantage on next attack. advantage flag set in buff but resolveAttack may not check it. |
| `ran-bea-6` | Spirit Bond | passive (permanentCompanion + immune) | Permanent unkillable companion. Not tested. |
| `ran-sha-5` | Rain of Arrows | aoe_damage (hitsPerTarget: 2) | Multi-hit AoE. handleAoeDamage has `hitsPerTarget` path but untested. |
| `bar-bat-4` | Shatter | damage_debuff | damage_debuff handler exists and is untested. |
| `bar-bat-6` | Epic Finale | aoe_damage (baseDice + bonusPerRound) | Damage scaling with round number. handleAoeDamage has `baseDice` path but untested. |
| `bar-lor-1` | Analyze | buff (bonusDamageNext + revealWeakness) | Next-attack buff. revealWeakness flag unused in engine? |
| `bar-lor-3` | Exploit Weakness | damage (requiresAnalyze) | Depends on Analyze being active. Dependency chain untested. |
| `bar-lor-4` | Arcane Insight | buff (nextCooldownHalved) | Cooldown halving. Unique mechanic. |

### LOW Priority (simple variants of well-tested handlers)

| ID | Name | Why Low |
|---|---|---|
| `war-war-1` | Rally Cry | Standard buff (ATK+AC). Buff handler well-tested. |
| `war-war-2` | Commanding Strike | Standard damage with bonus. Damage handler well-tested. |
| `war-war-4` | Inspiring Presence | Passive HP regen. applyPassiveAbilities has this path. |
| `mag-ele-6` | Arcane Mastery | Passive cooldown reduction %. Applied at combat start. |
| `mag-enc-1` | Arcane Bolt | Simple damage with autoHit. Note: autoHit flag not checked by handleDamage -- potential BUG. |
| `mag-enc-6` | Spell Weaver | Passive flat cooldown reduction. Applied at combat start. |
| `rog-ass-6` | Shadow Mastery | Passive crit chance bonus. Stored but not checked in attack resolution. |
| `rog-swa-6` | Untouchable | Passive dodge bonus. Applied via applyPassiveAbilities. |
| `rog-thi-3` | Quick Fingers | Passive gold bonus. Cosmetic in sim. |
| `rog-thi-6` | Treasure Sense | Passive loot bonus. Cosmetic in sim. |
| `ran-sha-1` | Aimed Shot | Standard damage + accuracy bonus. accuracyBonus not used by handleDamage. |
| `ran-sha-2` | Multi-Shot | multi_target handler tested via Chain Lightning. Variant is similar. |
| `ran-sha-3` | Piercing Arrow | Damage with ignoreArmor. handleDamage doesn't implement ignoreArmor. |
| `ran-sha-4` | Headshot | Damage with critBonus + accuracyPenalty. Neither properly handled. |
| `ran-sha-6` | Eagle's Eye | Passive accuracy+crit bonus. |
| `ran-tra-2` | Snare | Status (root + AC reduction). root status mapped but untested. |
| `ran-tra-3` | Hunter's Mark | Debuff (bonusDamageFromYou). Unique tracking mechanic, likely ignored by handler. |
| `ran-tra-5` | Predator Instinct | Passive advantage vs low HP. |
| `ran-tra-6` | Master Tracker | Passive first strike crit. |
| `bar-dip-1` | Charming Words | Debuff (attack reduction). Standard debuff. |
| `bar-dip-3` | Soothing Presence | Passive HP regen. Same as Inspiring Presence. |
| `bar-dip-6` | Legendary Charisma | Passive charm effectiveness. Cosmetic. |
| `bar-bat-1` | War Song | Standard buff (ATK). |
| `bar-bat-2` | Discordant Note | Standard damage (sonic). |
| `bar-bat-3` | Marching Cadence | Buff (dodge + initiative). |
| `bar-bat-5` | Crescendo | Passive stacking damage per round. Unique mechanic, likely not implemented. |
| `bar-lor-2` | Recall Lore | Passive XP bonus. Cosmetic. |
| `bar-lor-6` | Omniscient | Passive global XP bonus. Cosmetic. |
| `cle-pal-1` | Smite | Standard damage (radiant element, bonusDamage: 6). |
| `cle-pal-2` | Holy Armor | Standard buff (AC bonus). |
| `cle-pal-4` | Judgment | Drain (radiant element). drain handler exists, untested. |
| `cle-pal-6` | Avatar of Light | Passive holy damage bonus. |
| `cle-inq-1` | Denounce | Standard debuff (attack reduction). |
| `cle-inq-2` | Penance | Damage with bonusPerDebuff. Unique mechanic, likely ignored by handler. |
| `cle-inq-5` | Excommunicate | Debuff (allStatsReduction). allStatsReduction in handleDebuff has code path. |
| `cle-inq-6` | Inquisitor's Verdict | Passive anti-heal aura. Not implemented in engine. |
| `cle-hea-3` | Regeneration | HoT. handleHot tested indirectly via status-effects scenario. |
| `cle-hea-4` | Divine Shield | Buff (absorb). Same absorption concern as Elemental Shield. |
| `cle-hea-6` | Miracle | Heal (full restore, 1x per combat). Same as Legendary Commander. |

---

## 4. Interaction Edge Cases

### 4.1 Two Reactive Abilities Triggering Simultaneously
**Scenario:** Combatant A has Riposte (counter) active. Combatant B has Explosive Trap active. A attacks B.
**Engine behavior (line 705-747 of combat-engine.ts):** After resolveAttack applies damage to target B, it checks B's activeBuffs for a reactive buff. It finds the FIRST matching buff via `.find()`. Only ONE reactive fires -- the first match wins. If both Riposte and Explosive Trap are on the same combatant (impossible since counter is self-buff and trap is also self-buff, meaning the same combatant has both), only the first in the array fires.
**Gap:** If attacker A has Riposte and target B has Explosive Trap, both could fire (A's counter on A, B's trap on B). The engine only checks the TARGET's reactive buffs, not the ATTACKER's. **Riposte is never checked reactively in the engine** -- it is set as a buff on the counter-user but the engine's reactive check is only on the attack TARGET. This means **Riposte may never actually trigger as a counter-attack**. This is a potential BUG.

**Investigation:** The `handleCounter` handler (line 1009) adds a buff with `counterDamage` and `triggerOn: 'melee_attack'` to the ACTOR (the one who used Riposte). But the engine's reactive check (line 706) only searches the TARGET's `activeBuffs`. For Riposte to work, the Riposte user must be the TARGET of an attack, which is correct -- Riposte triggers when you ARE attacked. So Riposte fires when the Riposte-user is the target and an enemy attacks them. This is correct behavior.

### 4.2 Companion Auto-Damage Targeting a Dying Enemy
**Engine behavior (line 1287-1292 of class-ability-resolver.ts):** `tickActiveBuffs` picks a random alive enemy for companion auto-damage. The filtering `aliveEnemies = enemies.filter(e => e.isAlive && !e.hasFled)` is correct. However, the enemy list is passed in from the resolveTurn function (line 1804) BEFORE status tick damage is applied. If a DoT tick kills an enemy earlier in the same tick processing, the companion may target an enemy that just died.
**Risk:** LOW. The companion damage is applied to the state AFTER buff ticking (line 1824-1845), and the target lookup uses `current.combatants.find()` which gets the latest state. But the target selection happened with potentially stale enemy list.
**Gap:** No scenario tests companion auto-damage on the last remaining enemy where the companion could kill it and end combat.

### 4.3 Delayed Detonation (Death Mark) on Healed Target
**Engine behavior (line 1331-1376):** `tickDelayedEffects` detonates when `roundsRemaining` hits 0. It applies damage regardless of whether the target was healed. The damage is applied to the combatant's current HP at detonation time.
**Gap:** No scenario tests Death Mark at all. Edge case: target healed to full but still takes detonation damage. Edge case: target already dead from prior damage -- detonation still applies (wasted).

### 4.4 Diplomat's Gambit at Max Rounds
**Engine behavior (line 934-955):** Gambit sets `state.status = 'COMPLETED'` and `peacefulResolution: true` on success. The runner checks `state.status === 'ACTIVE'` in its while loop (line 734). If Gambit fires on round 50 (max), it would succeed/fail normally.
**Gap:** No scenario tests Gambit at high round counts. The 50% random chance means it's non-deterministic and could succeed on round 1 or never fire if cooldown prevents reuse.

### 4.5 Tome of Secrets Picking Heal/AoE in Edge Conditions
**Engine behavior (line 957-995):** Tome picks from `TOME_ELIGIBLE_ABILITIES` (15 abilities). For heal/buff abilities, it retargets to `actor`. For damage abilities, it uses the first alive enemy. If no enemies are alive, `resolvedTarget` may be null.
**Gap:** Tome could pick `cle-hea-1` (Healing Light) and heal the caster even at full HP. Tome could pick `mag-nec-5` (Soul Harvest) which does AoE drain -- if enemies are dead, the handler returns "no targets". Tome could pick `cle-inq-4` (Purging Flame) which requires the target to have buffs. These edge cases are untested.
**Potential BUG:** `TOME_ELIGIBLE_ABILITIES` includes `cle-inq-1` (listed as "Smite" in the array comment, but `cle-inq-1` is actually "Denounce" -- a debuff). The comment says "Smite" but `cle-inq-1` is Denounce. `cle-pal-1` is Smite. This is a **comment mismatch** but the ability ID is correct -- Denounce is a valid debuff to channel.

### 4.6 Multiple Buff Stacking
**Engine behavior (line 143-144 of class-ability-resolver.ts):** `handleBuff` replaces existing buffs from the same ability via `filter(b => b.sourceAbilityId !== abilityDef.id)`. Different abilities can stack. Fortify + Shield Wall + Iron Bulwark could all be active simultaneously, stacking AC, DR, and reflect.
**Gap:** No scenario has a combatant with multiple buffs from different abilities active. No scenario tests buff-on-buff stacking limits.

### 4.7 Counter/Trap Re-Arming After Cooldown
**Engine behavior (line 740-745):** When a counter/trap fires, the reactive buff is consumed (removed from activeBuffs). The ability goes on cooldown. After cooldown expires, the AI should re-activate it.
**Gap:** Scenario 10 has Riposte with cooldown 2 and Lay Trap with cooldown 3. The AI queues them with `useWhen: 'always'`. After the trap fires and cooldown expires, the AI should re-arm. This IS partially tested in S10, but the explicit re-arm cycle is not verified in outputs.

### 4.8 AoE vs Dead Enemies
**Engine behavior (line 481 of class-ability-resolver.ts):** `handleAoeDamage` iterates over `enemies` (alive enemies filtered at call site). Dead enemies are already filtered out.
**Correct behavior:** AoE does not hit dead enemies.
**Gap:** Verified by code review. Not explicitly tested but safe.

### 4.9 Cleanse with No Debuffs
**Engine behavior (line 398-403):** `handleCleanse` checks `if (toRemove.length === 0)` and returns a no-op description.
**Gap:** This path is never exercised. Should be tested to verify it doesn't crash.

### 4.10 Flee with Companion Active
**Engine behavior:** When a character flees, they set `hasFled: true`. Their companion buff remains in `activeBuffs` but since they no longer take turns, companion auto-damage stops. The companion doesn't independently act.
**Gap:** No scenario tests fleeing with an active companion. Does the companion persist uselessly? Does it prevent combat from ending (since the companion owner is "fled" but companion is still "alive")?

### 4.11 Death Prevention + Counter Damage
**Edge case:** Combatant with Undying Fury (survive at 1 HP) is hit by an attack. They drop to 0 HP, death prevention fires, they survive at 1 HP. But the attacker also triggered a counter/trap on the target, dealing damage back. Does the counter damage apply BEFORE or AFTER death prevention?
**Engine behavior:** Death prevention is in `checkDeathPrevention` (class-ability-resolver.ts line 1384-1398), called from class-ability-resolver. But the combat-engine's death prevention for racial abilities is separate (line 669-676). Counter/trap damage is applied AFTER damage to target (line 705-747). Death prevention for class abilities is NOT called in the resolveAttack path -- only racial death prevention via `checkDeathPrevention` from racial-combat-abilities is called.
**Potential BUG:** Class ability death prevention (`war-ber-6` Undying Fury, `mag-nec-6` Lichdom, `cle-hea-5` Resurrection) is implemented in `class-ability-resolver.ts` `checkDeathPrevention` but this function is NEVER CALLED from `resolveAttack` in `combat-engine.ts`. The engine only calls the racial variant. **Class death prevention passives may never trigger during combat.** This is a HIGH severity finding.

### 4.12 Absorption Shield + Reactive Damage
**Engine behavior (line 628-634):** Absorption is consumed before damage applies. Then counter/trap check happens after damage. If absorption fully absorbs the hit (totalDamage becomes 0), the `hit` flag is still true, and the counter/trap check on the target still fires (line 706 checks `target.activeBuffs` regardless of damage dealt).
**Gap:** Counter/trap fires even when the attack dealt 0 damage after absorption. This may be intentional (the attack still "hit"), but it's an edge case worth testing.

### 4.13 Status Effects Preventing Ability Use
**Engine behavior (line 1942-1944):** `isPrevented` checks for `preventsAction` on status effects (stunned, frozen, paralyzed). If prevented, the combatant is forced to defend.
**Gap:** No scenario explicitly tests a combatant attempting to use a class ability while stunned/frozen. The sim runner's `simDecideAction` doesn't check status -- it relies on the engine to override. This should work but is untested.

### 4.14 Cooldown Reduction Verification
**Engine behavior:** `applyPassiveAbilities` (line 1213-1221) stores `cooldownReductionPercent` and `cooldownReductionFlat` on the combatant. `tickAbilityCooldowns` (line 1247-1258) decrements by 1 per round but does NOT apply the cooldown reduction.
**Potential BUG:** Cooldown reduction passives (`mag-ele-6` Arcane Mastery 30%, `mag-enc-6` Spell Weaver -1 flat) are stored on the combatant but `tickAbilityCooldowns` does not use them. The initial cooldown set when an ability is used (in `resolveClassAbility`) would need to apply the reduction at that point. This code path is not visible in the resolver -- **cooldown reduction may be silently ignored.**

### 4.15 HoT + Companion Auto-Damage in Same Tick
**Engine behavior (line 1801-1845):** Both HoT healing and companion auto-damage are processed in `tickClassActiveBuffs` during the same tick. HoT heals the actor, companion damages an enemy. These are separate effects on different targets.
**Gap:** Ordering is correct (both happen before the actor's action), but no scenario has both active simultaneously to verify they don't interfere.

---

## 5. Sim Runner Gaps

### 5.1 useWhen Condition Coverage

| Condition | Tested by Scenario? | Notes |
|---|---|---|
| `always` | YES (S7, S9, S10, S12) | Well-tested |
| `low_hp` | YES (S7 -- Healing Light at 60%) | Tested |
| `high_hp` | NO | Never used in any scenario. Could be used for buff-at-full-HP strategies. |
| `first_round` | YES (S5, S8, S9, S10, S11, S12) | Well-tested |
| `outnumbered` | NO | Never used in any scenario. Condition logic exists but untested. |
| `has_companion` | YES (S11 -- Bestial Fury) | Tested |

### 5.2 Abilities That Would Never Fire

1. **`war-gua-1` Shield Bash** (S9): Unlocked but NOT in abilityQueue. Since the AI falls through abilities, then checks spells (Guardian has none), then falls to basic attack, Shield Bash is never dispatched. It sits as a passive unlock contributing nothing.

2. **`ran-bea-1` Call Companion** (S11): Unlocked but NOT in abilityQueue. Alpha Predator replaces it. Call Companion is tier 1 and would only matter if Alpha Predator is on cooldown, but the AI doesn't fall back to unlocked-but-unqueued abilities.

3. **Any ability not in abilityQueue** will never be used by the sim runner. The runner only dispatches abilities from the queue (line 204-275), then falls through to spells/attack. There is no logic to automatically use unlocked abilities that aren't explicitly queued.

### 5.3 Multi-Target and Self-Target Handling

- **Multi-target:** The runner passes `enemies.map(e => e.id)` as `targetIds` for all class ability actions (line 257). This works for AoE abilities. For single-target abilities, only `targetId` (first enemy) is used.
- **Self-target:** Heals and buffs in the class-ability-resolver retarget to self/ally automatically. The runner doesn't need special handling.
- **Gap:** The runner always targets enemies[0] (line 243). It never picks the weakest enemy for class abilities -- only for spells (line 368) and basic attacks (line 403). Class abilities that target a specific enemy (like Death Mark) would always hit the first enemy in the list, not necessarily the most strategic target.

### 5.4 Psion Abilities Not Dispatched

The sim runner checks `CLASS_ABILITY_IDS.has(entry.abilityId)` (line 246) to route to `class_ability` action type. Psion abilities ARE in `ALL_ABILITIES` and would match this check. However, the engine's `resolveTurn` dispatches class_ability via `resolveClassAbility`, but psion abilities need to be dispatched via `resolvePsionAbility` using action type `psion_ability`.

**Potential BUG:** If a psion ability is queued in a scenario, the sim runner would dispatch it as `class_ability`, but the class-ability-resolver has no handler for psion effect types (`control`, `reaction`, `echo`, `phase`, `swap`, `banish`, `teleport_attack`). These would fall through to the fallback basic attack. **The sim runner cannot currently exercise psion abilities correctly.**

---

## 6. Logger Gaps

### 6.1 Fields Logged vs Silently Dropped

The logger in `extractTurnDetails` (combat-sim-runner.ts line 496-684) covers these result fields:

| Field | Logged? | Notes |
|---|---|---|
| `attack.hit / miss / crit` | YES | Full detail including rolls |
| `attack.counterTriggered` | YES | Counter name, damage, AoE flag |
| `attack.companionIntercepted` | YES | Absorbed damage, companion killed |
| `cast.saveRequired / saveSucceeded` | YES | Save rolls and DC |
| `cast.totalDamage` | YES | |
| `cast.healAmount` | YES | |
| `cast.statusApplied` | YES | |
| `class_ability.damage` | YES | |
| `class_ability.healing` | YES | |
| `class_ability.selfHealing` | YES | |
| `class_ability.buffApplied` | YES | |
| `class_ability.statusApplied` | YES | |
| `class_ability.perTargetResults` | YES | Full AoE breakdown |
| `class_ability.strikeResults` | YES | Full multi-attack breakdown |
| `class_ability.goldStolen` | YES | |
| `class_ability.bonusLootRoll` | YES | |
| `class_ability.peacefulResolution` | YES | |
| `class_ability.randomAbilityUsed` | YES | |
| `class_ability.fallbackToAttack` | YES | |
| `class_ability.debuffApplied` | PARTIAL | Logged in result but not printed in engine log lines |
| `class_ability.cleansedEffects` | NO | Cleanse results not logged |
| `class_ability.fleeAttempt/fleeSuccess` | NO | Flee ability results not logged |
| `class_ability.actorHpAfter` | NO | Actor HP after drain/heal not logged |
| `class_ability.targetIds` (AoE) | PARTIAL | Individual perTargetResults logged, but targetIds array not |
| `class_ability.debuffDuration` | NO | Duration of debuffs not logged |
| `delayed_damage detonations` | PARTIAL | Logged as status tick (burning proxy) in ticks, not as class ability |
| `companion auto-damage` | PARTIAL | Logged as status tick (burning proxy), not identified as companion |

### 6.2 Display Issues

1. **Companion auto-damage displays as "burning" status tick** (combat-engine.ts line 1838): The engine uses `effectName: 'burning'` as a visual proxy. The logger shows this as a DoT tick, not as companion damage. This is misleading in output.

2. **Delayed detonations display as "burning" status tick** (line 1854): Same issue. Death Mark detonation appears as a burning DoT, not as a delayed detonation with source ability name.

3. **Debuff details are sparse:** When `handleDebuff` applies a debuff, the result includes `debuffApplied` and `debuffDuration`, but the extractTurnDetails only logs `buffApplied` and `statusApplied` -- the debuff-specific fields are not in the engine log line extraction.

---

## 7. Racial + Class Ability Interactions

### 7.1 Nethkin Infernal Rebuke + Class Counter Stance

**Scenario:** A Nethkin with Riposte counter stance active is attacked.
**Engine behavior:**
1. `resolveAttack` applies damage to the Nethkin target
2. Line 694-703: Nethkin Infernal Rebuke fires, dealing fire reflect damage to attacker
3. Line 705-747: Counter stance check fires, dealing counter damage to attacker

Both fire independently. The attacker takes BOTH Nethkin reflect AND counter damage. This is a double-reactive that could be very powerful.
**Gap:** No scenario has a Nethkin with Riposte equipped. This stacking interaction is untested.

### 7.2 Racial AoE vs Trap Buffs

**Scenario:** An enemy with Explosive Trap active is hit by a Drakonid Breath Weapon (racial AoE).
**Engine behavior:** Racial abilities are resolved via `resolveRacialAbility`, which is a separate code path from `resolveAttack`. Traps only trigger in the `resolveAttack` path (line 705-747). Racial AoE attacks would NOT trigger traps.
**Gap:** This is potentially correct (traps trigger on "attacked", and racial AoE may not count as a direct attack), but the behavior is not documented or tested.

### 7.3 Psion Domination + Class Abilities

**Scenario:** A dominated combatant has class abilities queued.
**Engine behavior (line 1889-1938):** When `controlledBy` is set and `controlDuration > 0`, the engine forces the dominated combatant to attack an ally. It bypasses the action selection entirely. Class abilities in the queue are ignored.
**Gap:** This is correct behavior but never tested. What if the dominated combatant has a passive that should still apply?

### 7.4 Racial Death Prevention vs Class Death Prevention

**Engine behavior:** Only racial death prevention (`checkDeathPrevention` from `racial-combat-abilities.ts`) is called in `resolveAttack`. Class death prevention (`checkDeathPrevention` from `class-ability-resolver.ts`) is defined but NOT called during combat resolution.
**BUG CONFIRMED:** `war-ber-6` Undying Fury, `mag-nec-6` Lichdom, and `cle-hea-5` Resurrection would never trigger. The `applyPassiveAbilities` function (line 1207-1209) initializes the uses tracker, but no combat code calls the class-ability-resolver's `checkDeathPrevention`.

---

## 8. Combat End Edge Cases

### 8.1 All Enemies Die from AoE Counter/Trap

**Scenario:** Explosive Trap triggers on attack, dealing AoE damage to all enemies. If all enemies die:
**Engine behavior:** After resolveAttack finishes (with counter damage applied), the state is updated. Then `checkCombatEnd` is called (line 2133). It checks `aliveTeams` and finds only one team alive. Combat ends.
**Gap:** Correct behavior by code review. But if the trap-layer's team also lost all members from the attack that triggered the trap, both teams could be dead simultaneously. `checkCombatEnd` would find 0 alive teams and set `winningTeam: null` -- a draw. **This simultaneous-death scenario is untested.**

### 8.2 Peaceful Resolution

**Engine behavior (line 938-939 of class-ability-resolver.ts):** Gambit sets `status: 'COMPLETED'` and `peacefulResolution: true`. The engine returns immediately (line 2096-2105 of combat-engine.ts).
**Runner behavior (line 909):** Checks `state.peacefulResolution` for outcome reporting.
**Gap:** Tested in S12 but only probabilistically (50% chance). Run with a fixed seed to guarantee this path.

### 8.3 Companion Auto-Damage Killing Last Enemy During Tick

**Engine behavior (line 1824-1845):** Companion auto-damage is applied during tick processing, BEFORE the actor's action. If the companion kills the last enemy, the actor's turn still resolves (likely as "defend" since no enemies remain). Then `checkCombatEnd` fires at end of turn.
**Gap:** Combat would end correctly but the actor would waste their action. No scenario verifies this sequence.

### 8.4 Both Teams' Last Members Dying Simultaneously

**Possible via:** Mutual reactive damage (counter damage kills the attacker, attack damage kills the defender in the same resolveAttack call).
**Engine behavior:** In `resolveAttack`, the attacker and target HP updates happen in sequence. The attacker applies damage to target first (line 667-690), then counter damage is applied to attacker (line 735-738). Both could die.
**`checkCombatEnd` (line 2192-2208):** Checks `aliveTeams` set. If 0 alive, `winningTeam = null` (draw).
**Gap:** This mutual-kill scenario is never tested. It's theoretically possible in S10 (Riposte vs Explosive Trap) if both combatants are low HP.

### 8.5 Max Rounds Draw

**Runner behavior (line 734):** `state.round <= MAX_ROUNDS` (50). If round exceeds 50, the while loop exits. The outcome detection (line 908-923) checks `state.winningTeam` -- if null and no survivors, it's a "draw".
**Gap:** No scenario is designed to reach 50 rounds. A draw scenario could be engineered with high-HP/high-AC combatants.

---

## 9. Determinism Status

### Math.random() Calls Found

All `Math.random()` calls that should use a seeded PRNG:

| File | Line | Usage | Through Seeded PRNG? |
|---|---|---|---|
| `class-ability-resolver.ts` | 843 | `handleSteal`: gold stolen range | **NO -- raw Math.random()** |
| `class-ability-resolver.ts` | 866 | `handleDamageSteal`: gold stolen 10-50 | **NO -- raw Math.random()** |
| `class-ability-resolver.ts` | 938 | `handleDiplomatsGambit`: 50% success | **NO -- raw Math.random()** |
| `class-ability-resolver.ts` | 961 | `handleTomeOfSecrets`: random ability pick | **NO -- raw Math.random()** |
| `class-ability-resolver.ts` | 1290 | `tickActiveBuffs`: companion target selection | **NO -- raw Math.random()** |
| `combat-engine.ts` | 292 | `rollAllInitiative`: tiebreaker sort | **NO -- raw Math.random()** |
| `combat-engine.ts` | 639 | companion interception 30% chance | **NO -- raw Math.random()** |
| `combat-sim-runner.ts` | (none) | Runner itself has no Math.random() | N/A |

### Assessment

**7 raw Math.random() calls are NOT deterministic.** The sim runner accepts a `seed` parameter (line 688) but there is NO seeded PRNG implementation visible in the codebase. The `seed` value is recorded in the output JSON but never used to seed anything.

**Impact:** Running the same scenario with the same seed produces DIFFERENT results each time due to:
1. Initiative tiebreaking (combat-engine.ts:292)
2. Companion target selection (class-ability-resolver.ts:1290)
3. Companion interception chance (combat-engine.ts:639)
4. Diplomat's Gambit success (class-ability-resolver.ts:938)
5. Tome of Secrets ability selection (class-ability-resolver.ts:961)
6. Steal gold amounts (class-ability-resolver.ts:843, 866)

Note: The dice rolling functions (`roll`, `rollMultiple`, `savingThrow` from `@shared/utils/dice`) likely use their own random source. If those also use `Math.random()`, ALL combat outcomes are non-deterministic. The `seed` parameter is effectively decorative.

**Severity:** HIGH. Non-determinism makes it impossible to:
- Reproduce specific combat outcomes for debugging
- Write reliable regression tests
- Verify that code changes don't alter combat balance

---

## 10. Recommended Validation Scenarios

### P0: Critical (must have before production)

#### Scenario 13: `death-prevention`
**Purpose:** Test `war-ber-6` Undying Fury, `mag-nec-6` Lichdom, `cle-hea-5` Resurrection
**Setup:** L40 Warrior/Berserker (all 6 Berserker abilities) vs L40 Monster that can kill in 2-3 hits
**Validates:** Death prevention passive triggering, single-use-per-combat tracking, revive HP amounts
**NOTE:** This scenario will expose the BUG where class death prevention is never called in resolveAttack.

#### Scenario 14: `psion-telepath`
**Purpose:** Test Psion Telepath abilities (Mind Spike, Psychic Crush, Dominate, Mind Shatter, Absolute Dominion)
**Setup:** L40 Psion/Telepath vs L35 Warrior + L35 Mage (to test domination forcing ally attack)
**Validates:** Psion resolver path, domination mechanic, AoE psychic damage, halfDamageOnSave
**NOTE:** Requires fixing the sim runner to dispatch psion abilities via `psion_ability` action type.

#### Scenario 15: `psion-seer-nomad`
**Purpose:** Test Seer (Precognitive Dodge, Temporal Echo, Prescient Mastery) and Nomad (Blink Strike, Dimensional Pocket, Translocation, Banishment)
**Setup:** L40 Psion/Seer vs L40 Psion/Nomad
**Validates:** Reaction (negate attack), Echo (repeat action), Phase (untargetable), Swap, Banishment (3-round removal + return)

#### Scenario 16: `determinism-seed`
**Purpose:** Verify seeded PRNG produces identical results
**Setup:** Same as basic-melee but run twice with same seed
**Validates:** All Math.random() calls replaced with seeded PRNG
**Prerequisite:** Implement seeded PRNG first.

### P1: High Priority

#### Scenario 17: `drain-heal-loop`
**Purpose:** Test drain mechanics (`mag-nec-1` Life Drain, `mag-nec-5` Soul Harvest, `cle-pal-4` Judgment)
**Setup:** L30 Mage/Necromancer (Life Drain + Soul Harvest) vs 3x L25 monsters
**Validates:** Drain damage + self-heal, AoE drain heal-per-target, drain not over-healing

#### Scenario 18: `delayed-damage`
**Purpose:** Test Death Mark (`rog-ass-5`) detonation
**Setup:** L30 Rogue/Assassin (Death Mark + Backstab + Vanish + Ambush chain) vs L30 tank monster (high HP)
**Validates:** Delayed effect ticking, detonation damage after 3 rounds, mark on dead target (wasted), mark on healed target

#### Scenario 19: `dispel-and-cleanse`
**Purpose:** Test Purging Flame (`cle-inq-4`) vs buffed target, Purify (`cle-hea-2`) cleanse
**Setup:** L30 Cleric/Inquisitor vs L30 Mage/Enchanter (who buffs first). Also: L30 Cleric/Healer self-cleansing DoT
**Validates:** Buff counting, buff removal + per-buff damage, cleanse removing debuffs, cleanse with no debuffs

#### Scenario 20: `absorption-shield`
**Purpose:** Test Elemental Shield (`mag-ele-4`), Bone Armor (`mag-nec-4`), Divine Shield (`cle-hea-4`)
**Setup:** L22 Mage/Elementalist (Elemental Shield, absorb 30) vs L22 aggressive attacker
**Validates:** Absorption consuming damage, absorption running out mid-hit, absorption + counter interaction

#### Scenario 21: `full-assassin-chain`
**Purpose:** Test Vanish -> Ambush -> Death Mark -> Poison Blade chain
**Setup:** L40 Rogue/Assassin (all 6 abilities) vs L35 monster
**Validates:** Stealth buff + untargetable, requiresStealth check on Ambush, 3x damage multiplier, poison charges on subsequent attacks, delayed detonation

#### Scenario 22: `aoe-dot-consecrate`
**Purpose:** Test Consecrate (`cle-pal-3`) AoE DoT
**Setup:** L16 Cleric/Paladin (Consecrate + Smite) vs 3x monsters
**Validates:** AoE burning status applied to all enemies, per-round damage ticking, bonusVsUndead (even if undead flag doesn't exist)

#### Scenario 23: `corpse-explosion`
**Purpose:** Test Corpse Explosion (`mag-nec-3`) with/without available corpses
**Setup:** L16 Mage/Necromancer (Life Drain + Corpse Explosion) vs 3x low-HP monsters
**Validates:** Kill one enemy, then corpse explode, verify requires-corpse check, AoE from corpse

### P2: Medium Priority

#### Scenario 24: `silence-vs-spellcaster`
**Purpose:** Test Silence (`cle-inq-3`) on a mage
**Setup:** L16 Cleric/Inquisitor (Denounce + Silence) vs L16 Mage/Elementalist
**Validates:** Silence status preventing spell casting, status duration, silence expiry

#### Scenario 25: `polymorph`
**Purpose:** Test Polymorph (`mag-enc-5`)
**Setup:** L30 Mage/Enchanter (Polymorph + Enfeeble) vs L30 Warrior
**Validates:** Polymorph status effect, 2-round transformation, what happens to polymorphed combatant's actions

#### Scenario 26: `warlord-full-kit`
**Purpose:** Test Warlord specialization (Rally Cry, Commanding Strike, Tactical Advance, Inspiring Presence, Warlord's Decree, Legendary Commander)
**Setup:** L40 Warrior/Warlord (all 6 abilities) vs L35 tough monster
**Validates:** extraAction mechanic, guaranteedHits, full restore heal (1x per combat), passive HP regen

#### Scenario 27: `nethkin-counter-stack`
**Purpose:** Test Nethkin racial reflect + Riposte counter stacking
**Setup:** L14 Nethkin Rogue/Swashbuckler (Riposte) vs L14 aggressive Warrior
**Validates:** Double reactive damage on being attacked, damage ordering

#### Scenario 28: `enchanter-debuff-stack`
**Purpose:** Test Enfeeble + Arcane Siphon + Haste
**Setup:** L22 Mage/Enchanter (Enfeeble + Haste + Arcane Siphon) vs L22 Warrior
**Validates:** Attack/AC reduction stacking, extraAction from Haste, debuff duration overlap

#### Scenario 29: `mutual-kill`
**Purpose:** Test both combatants dying in same resolveAttack
**Setup:** Two very low HP combatants with counter/trap active attacking each other
**Validates:** Simultaneous death, checkCombatEnd with 0 alive teams, draw outcome

#### Scenario 30: `max-rounds-draw`
**Purpose:** Force a 50-round draw
**Setup:** Two very tanky combatants (AC 25+, HP 500+) with low damage
**Validates:** Max round limit, draw detection, no infinite loop

### P3: Lower Priority

#### Scenario 31: `flee-with-companion`
**Purpose:** Test flee when companion is active
**Setup:** L10 Ranger/Beastmaster (Call Companion) with retreatHpThreshold: 50% vs L15 aggressive monster
**Validates:** Companion behavior when owner flees, combat end condition

#### Scenario 32: `sharpshooter-full-kit`
**Purpose:** Test Aimed Shot, Multi-Shot, Piercing Arrow, Headshot, Rain of Arrows
**Setup:** L30 Ranger/Sharpshooter (5 abilities) vs 3x monsters
**Validates:** ignoreArmor, critBonus, hitsPerTarget, multi-target

#### Scenario 33: `battlechanter-full-kit`
**Purpose:** Test War Song, Discordant Note, Marching Cadence, Shatter, Crescendo, Epic Finale
**Setup:** L40 Bard/Battlechanter vs 2x monsters
**Validates:** Stacking damage per round (Crescendo), round-scaling AoE (Epic Finale), damage_debuff (Shatter)

#### Scenario 34: `mesmerize-break`
**Purpose:** Test Enthrall (`bar-dip-5`) mesmerize and break-on-damage
**Setup:** L30 Bard/Diplomat (Enthrall) vs 2 enemies -- one mesmerized, one still attacking
**Validates:** Mesmerize preventing action, mesmerize break when damaged, 3-round duration

#### Scenario 35: `item-usage`
**Purpose:** Test item usage rules (hp_below, status_effect, first_round)
**Setup:** Any combatant with healing potions configured in itemUsageRules
**Validates:** Item AI decisions, heal targeting, item effects

---

## Appendix A: Bugs Found

### BUG-1: Class Death Prevention Never Triggers (HIGH)
**Location:** `combat-engine.ts` resolveAttack (line 667-690)
**Issue:** Only racial death prevention (`checkDeathPrevention` from `racial-combat-abilities.ts`) is called. Class ability death prevention (`war-ber-6`, `mag-nec-6`, `cle-hea-5`) from `class-ability-resolver.ts` is defined but never invoked during damage resolution.
**Impact:** Three tier 5 abilities (level 40 unlocks) are non-functional.
**Fix:** Add a call to `class-ability-resolver.checkDeathPrevention` in `resolveAttack` after applying damage, checking `actor.unlockedAbilityIds`.

### BUG-2: Cooldown Reduction Passives Are Stored But Never Applied (MEDIUM)
**Location:** `class-ability-resolver.ts` applyPassiveAbilities (line 1213-1221) and tickAbilityCooldowns (line 1247-1258)
**Issue:** `cooldownReductionPercent` and `cooldownReductionFlat` are set on the combatant but `tickAbilityCooldowns` always decrements by exactly 1 per round. The initial cooldown set is also not reduced.
**Impact:** `mag-ele-6` Arcane Mastery (30% CDR) and `mag-enc-6` Spell Weaver (-1 flat CDR) have no effect.
**Fix:** Apply cooldown reduction when setting initial cooldown in `resolveClassAbility`, and optionally in `tickAbilityCooldowns`.

### BUG-3: Sim Runner Cannot Dispatch Psion Abilities Correctly (MEDIUM)
**Location:** `combat-sim-runner.ts` simDecideAction (line 246)
**Issue:** Psion abilities are in `CLASS_ABILITY_IDS` and would be dispatched as `class_ability` action type. But the engine's class_ability handler calls `resolveClassAbility` which looks up the ability in the class-ability-resolver's `EFFECT_HANDLERS` map. Psion effect types (`control`, `reaction`, `echo`, `phase`, `swap`, `banish`, `teleport_attack`) are NOT in `EFFECT_HANDLERS`. The ability would fall back to basic attack.
**Impact:** Cannot test psion abilities via the simulator.
**Fix:** Add a check in simDecideAction for psion abilities and dispatch as `psion_ability` action type.

### BUG-4: Non-Deterministic Combat (MEDIUM)
**Location:** 7 `Math.random()` calls across combat-engine.ts and class-ability-resolver.ts
**Issue:** The `seed` parameter accepted by `runCombatSim` is never used. No seeded PRNG exists.
**Impact:** Cannot reproduce combat outcomes. Batch testing has random variance.
**Fix:** Implement a seeded PRNG (e.g., mulberry32) and replace all `Math.random()` calls with it.

### BUG-5: Several Ability Mechanics Silently Ignored by Handlers (LOW-MEDIUM)
**Location:** `class-ability-resolver.ts` various handlers
**Issues found by code review:**
- `autoHit` flag (Arcane Bolt `mag-enc-1`): `handleDamage` does not check autoHit -- attack still rolls normally
- `ignoreArmor` flag (Piercing Arrow `ran-sha-3`): `handleDamage` does not ignore AC
- `critBonus` (Backstab `rog-ass-1`, Headshot `ran-sha-4`): `handleDamage` does not apply crit bonus
- `accuracyBonus` (Aimed Shot `ran-sha-1`): `handleDamage` does not adjust hit chance
- `bonusPerDebuff` (Penance `cle-inq-2`): `handleDamage` does not count target debuffs
- `requiresAnalyze` (Exploit Weakness `bar-lor-3`): `handleDamage` does not check analyze buff
- `requiresStealth` (Ambush `rog-ass-4`): `handleDamage` does not check stealth buff
- `poisonCharges` (Poison Blade `rog-ass-3`): `handleBuff` stores buff but no code applies poison on subsequent attacks
- `stackingAttackSpeed` (Dance of Steel `rog-swa-5`): `handleBuff` stores buff but no code implements stacking
- `stackingDamagePerRound` (Crescendo `bar-bat-5`): passive, but no code applies stacking damage
- `bonusDamageFromYou` (Hunter's Mark `ran-tra-3`): `handleDebuff` stores debuff but attack resolution doesn't check it
- `antiHealAura` (Inquisitor's Verdict `cle-inq-6`): passive, but no code prevents enemy healing
- `nextCooldownHalved` (Arcane Insight `bar-lor-4`): buff stored but no code checks it
- `revealWeakness` (Analyze `bar-lor-1`): buff stored but no code uses revealed weakness
- `healsCompanion` (Wild Bond `ran-bea-2`): heal handler does not heal companion

**Impact:** These abilities dispatch successfully but their unique mechanics are no-ops. They function as generic damage/buff/debuff without their special effects.

### BUG-6: Tome of Secrets Comment Mismatch (COSMETIC)
**Location:** `class-ability-resolver.ts` line 924
**Issue:** Comment says `cle-inq-1` is "Smite" but the actual ability is "Denounce". `cle-pal-1` is Smite.
**Impact:** Cosmetic only. The ability ID is correct.
