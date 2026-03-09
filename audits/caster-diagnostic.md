# Caster Non-Viability Diagnostic

**Date:** 2026-03-09
**Level analyzed:** 40
**Sim run:** a7fcd134-cb4b-4e42-a926-110d31898412

## 1. Ability Queue Dumps

### Warrior L40

**No specialization (sim default):** 18 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Iron Bulwark (war-gua-5) [cd:10, type:buff] | first_round | buff |
| 1 | Frenzy (war-ber-4) [cd:4, type:multi_attack] | always | damage |
| 2 | Cleave (war-ber-3) [cd:3, type:aoe_damage] | always | damage |
| 3 | Commanding Strike (war-war-2) [cd:3, type:damage] | always | damage |
| 4 | Reckless Strike (war-ber-1) [cd:0, type:damage] | always | damage |
| 5 | Shield Bash (war-gua-1) [cd:3, type:damage_status] | always | damage |
| 6 | Power Strike (war-t0-3a) [cd:2, type:damage] | always | damage |
| 7 | Sundering Strike (war-t0-5a) [cd:3, type:damage_debuff] | always | damage |
| 8 | Brutal Charge (war-t0-8a) [cd:3, type:damage] | always | damage |
| 9 | Legendary Commander (war-war-6) [cd:0, type:heal] | low_hp @40% | heal |
| 10 | Taunt (war-gua-3) [cd:4, type:status] | always | cc |
| 11 | Warlords Decree (war-war-5) [cd:10, type:buff] | always | buff |
| 12 | Berserker Rage (war-ber-5) [cd:12, type:buff] | always | buff |
| 13 | Shield Wall (war-gua-4) [cd:8, type:buff] | always | buff |
| 14 | Tactical Advance (war-war-3) [cd:8, type:buff] | always | buff |
| 15 | Fortify (war-gua-2) [cd:6, type:buff] | always | buff |
| 16 | Blood Rage (war-ber-2) [cd:8, type:buff] | always | buff |
| 17 | Rally Cry (war-war-1) [cd:5, type:buff] | always | buff |

**With berserker spec:** 8 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Berserker Rage (war-ber-5) [cd:12, type:buff] | first_round | buff |
| 1 | Frenzy (war-ber-4) [cd:4, type:multi_attack] | always | damage |
| 2 | Cleave (war-ber-3) [cd:3, type:aoe_damage] | always | damage |
| 3 | Reckless Strike (war-ber-1) [cd:0, type:damage] | always | damage |
| 4 | Power Strike (war-t0-3a) [cd:2, type:damage] | always | damage |
| 5 | Sundering Strike (war-t0-5a) [cd:3, type:damage_debuff] | always | damage |
| 6 | Brutal Charge (war-t0-8a) [cd:3, type:damage] | always | damage |
| 7 | Blood Rage (war-ber-2) [cd:8, type:buff] | always | buff |

### Mage L40

**No specialization (sim default):** 18 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Polymorph (mag-enc-5) [cd:10, type:status] | first_round | cc |
| 1 | Meteor Strike (mag-ele-5) [cd:10, type:aoe_damage] | always | damage |
| 2 | Soul Harvest (mag-nec-5) [cd:10, type:aoe_drain] | always | damage |
| 3 | Shadow Bolt (mag-nec-2) [cd:1, type:damage] | always | damage |
| 4 | Frost Lance (mag-ele-2) [cd:2, type:damage_status] | always | damage |
| 5 | Chain Lightning (mag-ele-3) [cd:3, type:multi_target] | always | damage |
| 6 | Corpse Explosion (mag-nec-3) [cd:4, type:aoe_damage] | always | damage |
| 7 | Fireball (mag-ele-1) [cd:0, type:aoe_damage] | always | damage |
| 8 | Arcane Bolt (mag-enc-1) [cd:0, type:damage] | always | damage |
| 9 | Life Drain (mag-nec-1) [cd:2, type:drain] | always | damage |
| 10 | Arcane Spark (mag-t0-3a) [cd:1, type:damage] | always | damage |
| 11 | Flame Jet (mag-t0-5a) [cd:2, type:damage] | always | damage |
| 12 | Lightning Bolt (mag-t0-8a) [cd:3, type:damage] | always | damage |
| 13 | Arcane Siphon (mag-enc-4) [cd:5, type:debuff] | always | cc |
| 14 | Enfeeble (mag-enc-2) [cd:4, type:debuff] | always | cc |
| 15 | Bone Armor (mag-nec-4) [cd:7, type:buff] | always | buff |
| 16 | Elemental Shield (mag-ele-4) [cd:8, type:buff] | always | buff |
| 17 | Haste (mag-enc-3) [cd:6, type:buff] | always | buff |

**With elementalist spec:** 8 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Elemental Shield (mag-ele-4) [cd:8, type:buff] | first_round | buff |
| 1 | Meteor Strike (mag-ele-5) [cd:10, type:aoe_damage] | always | damage |
| 2 | Frost Lance (mag-ele-2) [cd:2, type:damage_status] | always | damage |
| 3 | Chain Lightning (mag-ele-3) [cd:3, type:multi_target] | always | damage |
| 4 | Fireball (mag-ele-1) [cd:0, type:aoe_damage] | always | damage |
| 5 | Arcane Spark (mag-t0-3a) [cd:1, type:damage] | always | damage |
| 6 | Flame Jet (mag-t0-5a) [cd:2, type:damage] | always | damage |
| 7 | Lightning Bolt (mag-t0-8a) [cd:3, type:damage] | always | damage |

### Rogue L40

**No specialization (sim default):** 17 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Dance of Steel (rog-swa-5) [cd:10, type:buff] | first_round | buff |
| 1 | Mug (rog-thi-5) [cd:8, type:damage_steal] | always | damage |
| 2 | Death Mark (rog-ass-5) [cd:10, type:delayed_damage] | always | damage |
| 3 | Ambush (rog-ass-4) [cd:0, type:damage] | always | damage |
| 4 | Flurry of Blades (rog-swa-4) [cd:6, type:multi_attack] | always | damage |
| 5 | Dual Strike (rog-swa-2) [cd:2, type:multi_attack] | always | damage |
| 6 | Backstab (rog-ass-1) [cd:2, type:damage] | always | damage |
| 7 | Quick Slash (rog-t0-3a) [cd:1, type:damage] | always | damage |
| 8 | Gouge (rog-t0-5a) [cd:3, type:damage_status] | always | damage |
| 9 | Exploit Opening (rog-t0-8a) [cd:3, type:damage] | always | damage |
| 10 | Smoke Bomb (rog-thi-2) [cd:5, type:aoe_debuff] | always | cc |
| 11 | Vanish (rog-ass-2) [cd:5, type:buff] | always | buff |
| 12 | Evasion (rog-swa-3) [cd:5, type:buff] | always | buff |
| 13 | Poison Blade (rog-ass-3) [cd:6, type:buff] | always | buff |
| 14 | Riposte (rog-swa-1) [cd:2, type:counter] | always | buff |
| 15 | Disengage (rog-thi-4) [cd:6, type:flee] | always | utility |
| 16 | Pilfer (rog-thi-1) [cd:3, type:steal] | always | utility |

**With assassin spec:** 8 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Vanish (rog-ass-2) [cd:5, type:buff] | first_round | buff |
| 1 | Death Mark (rog-ass-5) [cd:10, type:delayed_damage] | always | damage |
| 2 | Ambush (rog-ass-4) [cd:0, type:damage] | always | damage |
| 3 | Backstab (rog-ass-1) [cd:2, type:damage] | always | damage |
| 4 | Quick Slash (rog-t0-3a) [cd:1, type:damage] | always | damage |
| 5 | Gouge (rog-t0-5a) [cd:3, type:damage_status] | always | damage |
| 6 | Exploit Opening (rog-t0-8a) [cd:3, type:damage] | always | damage |
| 7 | Poison Blade (rog-ass-3) [cd:6, type:buff] | always | buff |

### Cleric L40

**No specialization (sim default):** 18 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Excommunicate (cle-inq-5) [cd:10, type:debuff] | first_round | cc |
| 1 | Divine Wrath (cle-pal-5) [cd:10, type:aoe_damage] | always | damage |
| 2 | Judgment (cle-pal-4) [cd:5, type:drain] | always | damage |
| 3 | Purging Flame (cle-inq-4) [cd:6, type:dispel_damage] | always | damage |
| 4 | Penance (cle-inq-2) [cd:2, type:damage] | always | damage |
| 5 | Consecrate (cle-pal-3) [cd:5, type:aoe_dot] | always | damage |
| 6 | Smite (cle-pal-1) [cd:0, type:damage] | always | damage |
| 7 | Sacred Strike (cle-t0-3a) [cd:2, type:damage] | always | damage |
| 8 | Divine Strike (cle-t0-5a) [cd:2, type:damage] | always | damage |
| 9 | Holy Fire (cle-t0-8a) [cd:3, type:damage] | always | damage |
| 10 | Miracle (cle-hea-6) [cd:0, type:heal] | low_hp @40% | heal |
| 11 | Purify (cle-hea-2) [cd:3, type:cleanse] | low_hp @40% | heal |
| 12 | Regeneration (cle-hea-3) [cd:5, type:hot] | low_hp @40% | heal |
| 13 | Healing Light (cle-hea-1) [cd:2, type:heal] | low_hp @40% | heal |
| 14 | Silence (cle-inq-3) [cd:5, type:status] | always | cc |
| 15 | Denounce (cle-inq-1) [cd:3, type:debuff] | always | cc |
| 16 | Divine Shield (cle-hea-4) [cd:7, type:buff] | always | buff |
| 17 | Holy Armor (cle-pal-2) [cd:6, type:buff] | always | buff |

**With healer spec:** 8 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Divine Shield (cle-hea-4) [cd:7, type:buff] | first_round | buff |
| 1 | Sacred Strike (cle-t0-3a) [cd:2, type:damage] | always | damage |
| 2 | Divine Strike (cle-t0-5a) [cd:2, type:damage] | always | damage |
| 3 | Holy Fire (cle-t0-8a) [cd:3, type:damage] | always | damage |
| 4 | Miracle (cle-hea-6) [cd:0, type:heal] | low_hp @40% | heal |
| 5 | Purify (cle-hea-2) [cd:3, type:cleanse] | low_hp @40% | heal |
| 6 | Regeneration (cle-hea-3) [cd:5, type:hot] | low_hp @40% | heal |
| 7 | Healing Light (cle-hea-1) [cd:2, type:heal] | low_hp @40% | heal |

### Ranger L40

**No specialization (sim default):** 17 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Alpha Predator (ran-bea-5) [cd:12, type:summon] | first_round | buff |
| 1 | Rain of Arrows (ran-sha-5) [cd:10, type:aoe_damage] | always | damage |
| 2 | Bestial Fury (ran-bea-4) [cd:5, type:companion_attack] | always | damage |
| 3 | Headshot (ran-sha-4) [cd:5, type:damage] | always | damage |
| 4 | Explosive Trap (ran-tra-4) [cd:6, type:trap] | always | damage |
| 5 | Multi-Shot (ran-sha-2) [cd:3, type:multi_target] | always | damage |
| 6 | Piercing Arrow (ran-sha-3) [cd:3, type:damage] | always | damage |
| 7 | Aimed Shot (ran-sha-1) [cd:0, type:damage] | always | damage |
| 8 | Lay Trap (ran-tra-1) [cd:3, type:trap] | always | damage |
| 9 | Steady Shot (ran-t0-3a) [cd:2, type:damage] | always | damage |
| 10 | Twin Arrows (ran-t0-5a) [cd:2, type:damage] | always | damage |
| 11 | Drilling Shot (ran-t0-8a) [cd:3, type:damage] | always | damage |
| 12 | Wild Bond (ran-bea-2) [cd:4, type:heal] | low_hp @40% | heal |
| 13 | Snare (ran-tra-2) [cd:4, type:status] | always | cc |
| 14 | Hunters Mark (ran-tra-3) [cd:5, type:debuff] | always | cc |
| 15 | Pack Tactics (ran-bea-3) [cd:3, type:buff] | always | buff |
| 16 | Call Companion (ran-bea-1) [cd:6, type:summon] | always | buff |

**With sharpshooter spec:** 8 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Rain of Arrows (ran-sha-5) [cd:10, type:aoe_damage] | always | damage |
| 1 | Headshot (ran-sha-4) [cd:5, type:damage] | always | damage |
| 2 | Multi-Shot (ran-sha-2) [cd:3, type:multi_target] | always | damage |
| 3 | Piercing Arrow (ran-sha-3) [cd:3, type:damage] | always | damage |
| 4 | Aimed Shot (ran-sha-1) [cd:0, type:damage] | always | damage |
| 5 | Steady Shot (ran-t0-3a) [cd:2, type:damage] | always | damage |
| 6 | Twin Arrows (ran-t0-5a) [cd:2, type:damage] | always | damage |
| 7 | Drilling Shot (ran-t0-8a) [cd:3, type:damage] | always | damage |

### Bard L40

**No specialization (sim default):** 16 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Enthrall (bar-dip-5) [cd:10, type:status] | first_round | cc |
| 1 | Epic Finale (bar-bat-6) [cd:12, type:aoe_damage] | always | damage |
| 2 | Shatter (bar-bat-4) [cd:5, type:damage_debuff] | always | damage |
| 3 | Discordant Note (bar-bat-2) [cd:2, type:damage] | always | damage |
| 4 | Exploit Weakness (bar-lor-3) [cd:3, type:damage] | always | damage |
| 5 | Cutting Words (bar-t0-3a) [cd:2, type:damage] | always | damage |
| 6 | Vicious Mockery (bar-t0-5a) [cd:3, type:damage_debuff] | always | damage |
| 7 | Thunderclap (bar-t0-8a) [cd:3, type:damage] | always | damage |
| 8 | Silver Tongue (bar-dip-2) [cd:5, type:status] | always | cc |
| 9 | Charming Words (bar-dip-1) [cd:3, type:debuff] | always | cc |
| 10 | Arcane Insight (bar-lor-4) [cd:6, type:buff] | always | buff |
| 11 | Marching Cadence (bar-bat-3) [cd:5, type:buff] | always | buff |
| 12 | Analyze (bar-lor-1) [cd:2, type:buff] | always | buff |
| 13 | War Song (bar-bat-1) [cd:4, type:buff] | always | buff |
| 14 | Tome of Secrets (bar-lor-5) [cd:8, type:special] | always | utility |
| 15 | Diplomats Gambit (bar-dip-4) [cd:8, type:special] | always | utility |

**With battlechanter spec:** 8 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Marching Cadence (bar-bat-3) [cd:5, type:buff] | first_round | buff |
| 1 | Epic Finale (bar-bat-6) [cd:12, type:aoe_damage] | always | damage |
| 2 | Shatter (bar-bat-4) [cd:5, type:damage_debuff] | always | damage |
| 3 | Discordant Note (bar-bat-2) [cd:2, type:damage] | always | damage |
| 4 | Cutting Words (bar-t0-3a) [cd:2, type:damage] | always | damage |
| 5 | Vicious Mockery (bar-t0-5a) [cd:3, type:damage_debuff] | always | damage |
| 6 | Thunderclap (bar-t0-8a) [cd:3, type:damage] | always | damage |
| 7 | War Song (bar-bat-1) [cd:4, type:buff] | always | buff |

### Psion L40

**No specialization (sim default):** 17 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Absolute Dominion (psi-tel-6) [cd:1, type:control] | first_round | cc |
| 1 | Mind Shatter (psi-tel-5) [cd:1, type:aoe_damage_status] | always | damage |
| 2 | Temporal Echo (psi-see-5) [cd:1, type:echo] | always | echo |
| 3 | Rift Walk (psi-nom-5) [cd:1, type:aoe_damage_status] | always | damage |
| 4 | Psychic Crush (psi-tel-3) [cd:1, type:damage_status] | always | damage |
| 5 | Mind Spike (psi-tel-1) [cd:0, type:damage_status] | always | damage |
| 6 | Blink Strike (psi-nom-1) [cd:0, type:teleport_attack] | always | damage |
| 7 | Psychic Jab (psi-t0-3a) [cd:1, type:damage] | always | damage |
| 8 | Psionic Dart (psi-t0-5a) [cd:2, type:damage] | always | damage |
| 9 | Ego Whip (psi-t0-8a) [cd:3, type:damage] | always | damage |
| 10 | Banishment (psi-nom-6) [cd:1, type:banish] | always | cc |
| 11 | Dominate (psi-tel-4) [cd:1, type:control] | always | cc |
| 12 | Translocation (psi-nom-4) [cd:1, type:swap] | always | cc |
| 13 | Prescient Mastery (psi-see-6) [cd:1, type:buff] | always | buff |
| 14 | Foresight (psi-see-1) [cd:0, type:buff] | always | buff |
| 15 | Precognitive Dodge (psi-see-3) [cd:1, type:reaction] | always | utility |
| 16 | Dimensional Pocket (psi-nom-3) [cd:1, type:phase] | always | utility |

**With telepath spec:** 8 abilities

| # | Ability | UseWhen | Role |
|---|---------|---------|------|
| 0 | Absolute Dominion (psi-tel-6) [cd:1, type:control] | first_round | cc |
| 1 | Mind Shatter (psi-tel-5) [cd:1, type:aoe_damage_status] | always | damage |
| 2 | Psychic Crush (psi-tel-3) [cd:1, type:damage_status] | always | damage |
| 3 | Mind Spike (psi-tel-1) [cd:0, type:damage_status] | always | damage |
| 4 | Psychic Jab (psi-t0-3a) [cd:1, type:damage] | always | damage |
| 5 | Psionic Dart (psi-t0-5a) [cd:2, type:damage] | always | damage |
| 6 | Ego Whip (psi-t0-8a) [cd:3, type:damage] | always | damage |
| 7 | Dominate (psi-tel-4) [cd:1, type:control] | always | cc |

## 2. Round-by-Round Combat Logs

### Mage: L38 Humans Mage vs Djinn Lord (loss, 3 rounds)

**Round 1:** {"_encounterContext":{"turnOrder":["bsim-c-31898412-human-mage-38","sim-monster-78-0"],"combatants":[{"ac":10,"hp":88,"id":"bsim-c-31898412-human-mage-38","name":"L38 Humans Mage","race":"human","team":0,"level":38,"maxHp":88,"stats":{"cha":11,"con":11,"dex":11,"int":20,"str":11,"wis":14},"weapon":{

**Round 2:** {"actor":"L38 Humans Mage","round":1,"action":"class_ability","saveDC":21,"actorId":"bsim-c-31898412-human-mage-38","hpAfter":{"Djinn Lord":182,"L38 Humans Mage":69},"saveRoll":1,"saveTotal":5,"abilityName":"Polymorph","saveSucceeded":true,"targetHpBefore":182,"legendaryActions":[{"cost":1,"action":

**Round 3:** {"actor":"Djinn Lord","round":1,"action":"monster_ability","saveDC":20,"actorId":"sim-monster-78-0","hpAfter":{"Djinn Lord":182,"L38 Humans Mage":52},"damageRoll":{"dice":"ability","type":"BLUDGEONING","rolls":[],"total":17,"modifiers":[]},"abilityName":"Whirlwind","perTargetResults":[{"damage":17,"

**Round 4:** {"actor":"L38 Humans Mage","round":2,"action":"class_ability","saveDC":21,"actorId":"bsim-c-31898412-human-mage-38","hpAfter":{"Djinn Lord":148,"L38 Humans Mage":32},"damageRoll":{"dice":"ability","type":"FIRE","rolls":[],"total":34,"modifiers":[]},"abilityName":"Meteor Strike","targetHpBefore":182,

**Round 5:** {"actor":"Djinn Lord","round":2,"action":"monster_ability","saveDC":19,"actorId":"sim-monster-78-0","hpAfter":{"Djinn Lord":148,"L38 Humans Mage":24},"damageRoll":{"dice":"ability","type":"LIGHTNING","rolls":[],"total":8,"modifiers":[]},"abilityName":"Lightning Storm","perTargetResults":[{"damage":8

**Round 6:** {"actor":"L38 Humans Mage","round":3,"action":"class_ability","saveDC":21,"actorId":"bsim-c-31898412-human-mage-38","hpAfter":{"Djinn Lord":140,"L38 Humans Mage":8},"damageRoll":{"dice":"ability","type":"NECROTIC","rolls":[],"total":8,"modifiers":[]},"abilityName":"Soul Harvest","targetHpBefore":148

**Round 7:** {"actor":"Djinn Lord","round":3,"action":"monster_ability","actorId":"sim-monster-78-0","hpAfter":{"Djinn Lord":140,"L38 Humans Mage":0},"damageRoll":{"dice":"ability","rolls":[],"total":19,"modifiers":[]},"strikesHit":1,"abilityName":"Scimitar Storm","targetKilled":true,"totalStrikes":2,"strikeResu


### Warrior (control): L38 Humans Warrior vs Djinn Lord (loss, 4 rounds)

**Round 1:** {"_encounterContext":{"turnOrder":["bsim-c-31898412-human-warrior-38","sim-monster-77-0"],"combatants":[{"ac":19,"hp":170,"id":"bsim-c-31898412-human-warrior-38","name":"L38 Humans Warrior","race":"human","team":0,"level":38,"maxHp":170,"stats":{"cha":11,"con":14,"dex":11,"int":11,"str":20,"wis":11}

**Round 2:** {"hit":false,"actor":"L38 Humans Warrior","round":1,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":182,"L38 Humans Warrior":170},"targetAC":19,"attackRoll":{"raw":2,"total":17,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":

**Round 3:** {"hit":true,"actor":"L38 Humans Warrior","round":1,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":182,"L38 Humans Warrior":153},"targetAC":19,"attackRoll":{"raw":5,"total":20,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":2

**Round 4:** {"actor":"L38 Humans Warrior","round":1,"action":"class_ability","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":182,"L38 Humans Warrior":129},"abilityName":"Iron Bulwark","buffApplied":"Iron Bulwark","targetHpBefore":153,"legendaryActions":[{"cost":1,"action":{"hit":true,"type"

**Round 5:** {"actor":"Djinn Lord","round":1,"action":"monster_ability","saveDC":20,"actorId":"sim-monster-77-0","hpAfter":{"Djinn Lord":182,"L38 Humans Warrior":115},"damageRoll":{"dice":"ability","type":"BLUDGEONING","rolls":[],"total":14,"modifiers":[]},"abilityName":"Whirlwind","perTargetResults":[{"damage":

**Round 6:** {"hit":true,"actor":"L38 Humans Warrior","round":2,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":138,"L38 Humans Warrior":115},"targetAC":20,"attackRoll":{"raw":6,"total":21,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":2

**Round 7:** {"hit":true,"actor":"L38 Humans Warrior","round":2,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":127,"L38 Humans Warrior":115},"targetAC":20,"attackRoll":{"raw":8,"total":23,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":2

**Round 8:** {"actor":"L38 Humans Warrior","round":2,"action":"class_ability","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":154,"L38 Humans Warrior":93},"damageRoll":{"dice":"ability","rolls":[],"total":21,"modifiers":[]},"strikesHit":2,"abilityName":"Frenzy","targetKilled":false,"totalStr

**Round 9:** {"actor":"Djinn Lord","round":2,"action":"monster_ability","saveDC":19,"actorId":"sim-monster-77-0","hpAfter":{"Djinn Lord":154,"L38 Humans Warrior":81},"damageRoll":{"dice":"ability","type":"LIGHTNING","rolls":[],"total":12,"modifiers":[]},"abilityName":"Lightning Storm","perTargetResults":[{"damag

**Round 10:** {"hit":true,"actor":"L38 Humans Warrior","round":3,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":100,"L38 Humans Warrior":81},"targetAC":18,"attackRoll":{"raw":8,"total":23,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":2,

**Round 11:** {"hit":true,"actor":"L38 Humans Warrior","round":3,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":83,"L38 Humans Warrior":81},"targetAC":18,"attackRoll":{"raw":6,"total":21,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":2,"

**Round 12:** {"actor":"L38 Humans Warrior","round":3,"action":"class_ability","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":114,"L38 Humans Warrior":58},"damageRoll":{"dice":"ability","rolls":[],"total":7,"modifiers":[]},"abilityName":"Cleave","targetHpBefore":83,"legendaryActions":[{"cost

**Round 13:** {"actor":"Djinn Lord","round":3,"action":"monster_ability","actorId":"sim-monster-77-0","hpAfter":{"Djinn Lord":114,"L38 Humans Warrior":22},"damageRoll":{"dice":"ability","rolls":[],"total":36,"modifiers":[]},"strikesHit":2,"abilityName":"Scimitar Storm","targetKilled":false,"totalStrikes":2,"strik

**Round 14:** {"hit":true,"actor":"L38 Humans Warrior","round":4,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":67,"L38 Humans Warrior":22},"targetAC":16,"attackRoll":{"raw":14,"total":29,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":2,

**Round 15:** {"hit":true,"actor":"L38 Humans Warrior","round":4,"action":"attack","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":53,"L38 Humans Warrior":22},"targetAC":16,"attackRoll":{"raw":10,"total":25,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"value":2,

**Round 16:** {"hit":false,"actor":"L38 Humans Warrior","round":4,"action":"class_ability","actorId":"bsim-c-31898412-human-warrior-38","hpAfter":{"Djinn Lord":77,"L38 Humans Warrior":0},"targetAC":16,"attackRoll":{"raw":1,"total":15,"modifiers":[{"value":5,"source":"STR"},{"value":7,"source":"proficiency"},{"val


### Psion: L38 Humans Psion vs Djinn Lord (loss, 3 rounds)

**Round 1:** {"_encounterContext":{"turnOrder":["bsim-c-31898412-human-psion-38","sim-monster-83-0"],"combatants":[{"ac":10,"hp":88,"id":"bsim-c-31898412-human-psion-38","name":"L38 Humans Psion","race":"human","team":0,"level":38,"maxHp":88,"stats":{"cha":11,"con":11,"dex":11,"int":20,"str":11,"wis":14},"weapon

**Round 2:** {"actor":"L38 Humans Psion","round":1,"action":"psion_ability","saveDC":20,"actorId":"bsim-c-31898412-human-psion-38","hpAfter":{"Djinn Lord":182,"L38 Humans Psion":70},"saveRoll":14,"saveTotal":16,"abilityName":"Dominate","targetKilled":false,"saveSucceeded":true,"targetHpAfter":182,"legendaryActio

**Round 3:** {"actor":"Djinn Lord","round":1,"action":"monster_ability","saveDC":20,"actorId":"sim-monster-83-0","hpAfter":{"Djinn Lord":182,"L38 Humans Psion":51},"damageRoll":{"dice":"ability","type":"BLUDGEONING","rolls":[],"total":19,"modifiers":[]},"abilityName":"Whirlwind","perTargetResults":[{"damage":19,

**Round 4:** {"actor":"L38 Humans Psion","round":2,"action":"psion_ability","saveDC":20,"actorId":"bsim-c-31898412-human-psion-38","hpAfter":{"Djinn Lord":182,"L38 Humans Psion":36},"damageRoll":{"dice":"psion","rolls":[],"total":9,"modifiers":[]},"abilityName":"Mind Shatter","legendaryActions":[{"cost":1,"actio

**Round 5:** {"actor":"Djinn Lord","round":2,"action":"monster_ability","saveDC":19,"actorId":"sim-monster-83-0","hpAfter":{"Djinn Lord":182,"L38 Humans Psion":31},"damageRoll":{"dice":"ability","type":"LIGHTNING","rolls":[],"total":5,"modifiers":[]},"abilityName":"Lightning Storm","perTargetResults":[{"damage":

**Round 6:** {"actor":"L38 Humans Psion","round":3,"action":"psion_ability","saveDC":20,"actorId":"bsim-c-31898412-human-psion-38","hpAfter":{"Djinn Lord":182,"L38 Humans Psion":31},"damageRoll":{"dice":"psion","rolls":[],"total":10,"modifiers":[]},"abilityName":"Temporal Echo: Mind Shatter","legendaryActions":[

**Round 7:** {"actor":"Djinn Lord","round":3,"action":"monster_ability","actorId":"sim-monster-83-0","hpAfter":{"Djinn Lord":182,"L38 Humans Psion":0},"damageRoll":{"dice":"ability","rolls":[],"total":44,"modifiers":[]},"strikesHit":2,"abilityName":"Scimitar Storm","targetKilled":true,"totalStrikes":2,"strikeRes


### Ranger (control): L38 Humans Ranger vs Djinn Lord (loss, 5 rounds)

**Round 1:** {"_encounterContext":{"turnOrder":["bsim-c-31898412-human-ranger-38","sim-monster-81-0"],"combatants":[{"ac":18,"hp":166,"id":"bsim-c-31898412-human-ranger-38","name":"L38 Humans Ranger","race":"human","team":0,"level":38,"maxHp":166,"stats":{"cha":11,"con":11,"dex":20,"int":11,"str":14,"wis":11},"w

**Round 2:** {"hit":false,"actor":"L38 Humans Ranger","round":1,"action":"attack","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":182,"L38 Humans Ranger":166},"targetAC":18,"attackRoll":{"raw":2,"total":17,"modifiers":[{"value":5,"source":"DEX"},{"value":7,"source":"proficiency"},{"value":2,"

**Round 3:** {"actor":"L38 Humans Ranger","round":1,"action":"class_ability","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":182,"L38 Humans Ranger":148},"abilityName":"Alpha Predator","buffApplied":"Alpha Companion","targetHpBefore":166,"legendaryActions":[{"cost":1,"action":{"hit":true,"typ

**Round 4:** {"actor":"Djinn Lord","round":1,"action":"monster_ability","saveDC":20,"actorId":"sim-monster-81-0","hpAfter":{"Djinn Lord":182,"L38 Humans Ranger":141},"damageRoll":{"dice":"ability","type":"BLUDGEONING","rolls":[],"total":7,"modifiers":[]},"abilityName":"Whirlwind","perTargetResults":[{"damage":7,

**Round 5:** {"hit":true,"actor":"L38 Humans Ranger","round":2,"action":"attack","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":147,"L38 Humans Ranger":141},"targetAC":20,"attackRoll":{"raw":5,"total":20,"modifiers":[{"value":5,"source":"DEX"},{"value":7,"source":"proficiency"},{"value":2,"s

**Round 6:** {"actor":"L38 Humans Ranger","round":2,"action":"class_ability","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":156,"L38 Humans Ranger":119},"damageRoll":{"dice":"ability","rolls":[],"total":14,"modifiers":[]},"abilityName":"Rain of Arrows","targetHpBefore":170,"legendaryActions"

**Round 7:** {"actor":"Djinn Lord","round":2,"action":"monster_ability","saveDC":19,"actorId":"sim-monster-81-0","hpAfter":{"Djinn Lord":156,"L38 Humans Ranger":111},"damageRoll":{"dice":"ability","type":"LIGHTNING","rolls":[],"total":8,"modifiers":[]},"abilityName":"Lightning Storm","perTargetResults":[{"damage

**Round 8:** {"hit":true,"actor":"L38 Humans Ranger","round":3,"action":"attack","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":101,"L38 Humans Ranger":111},"targetAC":18,"attackRoll":{"raw":14,"total":29,"modifiers":[{"value":5,"source":"DEX"},{"value":7,"source":"proficiency"},{"value":2,"

**Round 9:** {"actor":"L38 Humans Ranger","round":3,"action":"class_ability","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":118,"L38 Humans Ranger":89},"damageRoll":{"dice":"ability","rolls":[],"total":17,"modifiers":[]},"abilityName":"Bestial Fury","targetKilled":false,"targetHpAfter":118,"

**Round 10:** {"actor":"Djinn Lord","round":3,"action":"monster_ability","actorId":"sim-monster-81-0","hpAfter":{"Djinn Lord":118,"L38 Humans Ranger":44},"damageRoll":{"dice":"ability","rolls":[],"total":45,"modifiers":[]},"strikesHit":2,"abilityName":"Scimitar Storm","targetKilled":false,"totalStrikes":2,"strike

**Round 11:** {"hit":true,"actor":"L38 Humans Ranger","round":4,"action":"attack","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":118,"L38 Humans Ranger":43},"targetAC":18,"attackRoll":{"raw":19,"total":34,"modifiers":[{"value":5,"source":"DEX"},{"value":7,"source":"proficiency"},{"value":2,"s

**Round 12:** {"actor":"L38 Humans Ranger","round":4,"action":"class_ability","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":89,"L38 Humans Ranger":28},"healAmount":10,"abilityName":"Wild Bond","targetHpAfter":54,"targetHpBefore":43,"legendaryActions":[{"cost":1,"action":{"hit":true,"type":"a

**Round 13:** {"actor":"Djinn Lord","round":4,"action":"monster_ability","saveDC":20,"actorId":"sim-monster-81-0","hpAfter":{"Djinn Lord":89,"L38 Humans Ranger":21},"damageRoll":{"dice":"ability","type":"BLUDGEONING","rolls":[],"total":7,"modifiers":[]},"abilityName":"Whirlwind","perTargetResults":[{"damage":7,"k

**Round 14:** {"hit":true,"actor":"L38 Humans Ranger","round":5,"action":"attack","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":47,"L38 Humans Ranger":21},"targetAC":14,"attackRoll":{"raw":5,"total":20,"modifiers":[{"value":5,"source":"DEX"},{"value":7,"source":"proficiency"},{"value":2,"sou

**Round 15:** {"hit":true,"actor":"L38 Humans Ranger","round":5,"action":"class_ability","actorId":"bsim-c-31898412-human-ranger-38","hpAfter":{"Djinn Lord":56,"L38 Humans Ranger":4},"targetAC":14,"attackRoll":{"raw":7,"total":16,"modifiers":[{"value":5,"source":"DEX"},{"value":7,"source":"proficiency"},{"value":

**Round 16:** {"actor":"Djinn Lord","round":5,"action":"monster_ability","saveDC":19,"actorId":"sim-monster-81-0","hpAfter":{"Djinn Lord":56,"L38 Humans Ranger":0},"damageRoll":{"dice":"ability","type":"LIGHTNING","rolls":[],"total":11,"modifiers":[]},"abilityName":"Lightning Storm","perTargetResults":[{"damage":


## 3. DPR Comparison Table

### Monster Stats (L35-42 range)

| Monster | Level | HP | AC | Attack | Damage |
|---------|-------|----|----|--------|--------|
| Spectral Knight | 35 | 117 | 20 | +15 | 2d8+4 |
| Basilisk King | 35 | 175 | 21 | +15 | 2d8+5 |
| Dust Devil | 35 | 117 | 19 | +14 | 2d8+4 |
| Infernal Bladedancer | 36 | 148 | 21 | +16 | 2d8+4 |
| Coastal Wyrm | 36 | 119 | 20 | +16 | 2d10+4 |

**Reference monster:** Spectral Knight (AC 20, ATK +15, DMG 2d8+4)

### Per-Class Breakdown at L40

| Class | HP | AC | Weapon DPR | Ability DPR | Extra Attacks | Effective DPR | Rounds to Die | Rounds to Kill |
|-------|----|----|-----------|-------------|--------------|---------------|---------------|----------------|
| warrior | 178 | 19 | 30.0 | 2.0 | 3 | 30.6 | 17 | 4 |
| mage | 92 | 10 | 8.4 | 1.0 | 1 | 8.4 | 8 | 14 |
| rogue | 133 | 19 | 9.2 | 1.5 | 1 | 9.7 | 13 | 13 |
| cleric | 137 | 18 | 16.8 | 0.0 | 2 | 16.8 | 12 | 7 |
| ranger | 174 | 18 | 21.6 | 2.5 | 2 | 22.4 | 15 | 6 |
| bard | 133 | 16 | 8.4 | 0.0 | 1 | 8.4 | 11 | 14 |
| psion | 92 | 10 | 8.4 | 2.0 | 1 | 8.4 | 8 | 14 |

## 4. Structural Findings

### 4a: Empty Spell Slots

`buildSyntheticPlayer()` returns `spellSlots: {}`. This is a potential concern.

However, **class abilities use the `class_ability` action type**, not `cast`. The `class_ability` handler in combat-engine.ts (line 3141) goes directly to `resolveClassAbility()` without checking spell slots. Spell slot checks only apply to the `cast` action type (line 3028-3034).

**Verdict: NOT AN ISSUE.** Class abilities bypass spell slots entirely — they use their own cooldown system tracked via `abilityCooldowns` on the combatant.

### 4b: Mage/Psion AC Never Scales

- Mage L40: AC 10, HP 92, DEX 11 (mod 0)
- Psion L40: AC 10, HP 92, DEX 11 (mod 0)
- Warrior L40: AC 19, HP 178

`ARMOR_TIERS` for mage/psion: `{ type: "none", ac: [10, 10, 10, 10] }`. Base AC is 10 at ALL tiers.
DEX mod for mage/psion is 0 (all stat points go to INT first, then WIS, then CON — DEX is 4th priority).
Result: **AC 10 at every level.** This means:

- Monster (+15 ATK) hits Mage (AC 10): **95% of the time**
- Monster (+15 ATK) hits Warrior (AC 19): **85% of the time**

**Verdict: CRITICAL ISSUE.** Mage/Psion AC is effectively non-existent. Every monster hit lands. Combined with 2 HP/level (vs Warrior's 4 HP/level), casters die in half the rounds.

### 4c: Solo Matchups Lack Specialization

**mage:** No spec = 18 abilities (12 damage), with elementalist = 8 abilities (7 damage)
**psion:** No spec = 17 abilities (8 damage), with telepath = 8 abilities (6 damage)
**bard:** No spec = 16 abilities (7 damage), with battlechanter = 8 abilities (6 damage)

Without specialization, `buildAbilityQueue` loads abilities from ALL specializations. This gives MORE abilities (more damage options, more buffs) but also bloats the queue with competing cooldowns. The sim actually gets MORE firepower without a spec, not less.

**Verdict: MINOR ISSUE.** The bloated queue might cause suboptimal ordering (buff/CC abilities from wrong specs clogging priority), but casters have plenty of damage abilities available. Specialization would slightly optimize the queue but wouldn't fix the survivability gap.

### 4d: Warrior Extra Attacks

| Class | Attacks at L40 | Effective DPR Multiplier |
|-------|---------------|------------------------|
| warrior | 3 | 3x |
| mage | 1 | 1x |
| rogue | 1 | 1x |
| cleric | 2 | 2x |
| ranger | 2 | 2x |
| bard | 1 | 1x |
| psion | 1 | 1x |

Warrior gets **3 attacks at L34+** (4 at L42+). Ranger gets **2 at L28+**. All other classes get **1 attack.** Extra attacks also fire after class abilities (via `resolveExtraAttacksAfterAbility`).

This means:
- Warrior basic attack DPR: ~45 damage/round (3 × 15 avg)
- Mage basic attack DPR: ~8 damage/round (1 × 8 avg with staff)
- Even with class abilities, Mage peaks at ~15-20 damage/round vs Warrior's 45+

**Verdict: MAJOR CONTRIBUTING FACTOR.** Extra attacks are a 3x DPR multiplier for Warriors. Casters have no equivalent scaling mechanism. Even if caster abilities did significant damage, the Warrior weapon damage alone exceeds it.

## 5. Diagnosis

### Answer: BOTH hypotheses are partially correct, but B (survivability gap) is the primary cause.

**Evidence for Hypothesis B (survivability gap — PRIMARY):**

1. **HP gap:** Mage 92 HP vs Warrior 166 HP at L40 (1.8x). With Warrior in plate (AC 19) and Mage in cloth (AC 10), effective HP (accounting for dodge chance) is even worse.
2. **AC gap:** Mage AC 10 means ~95% of monster attacks land. Warrior AC 19 means ~60% land. Effective damage taken per round is 1.6x higher for Mage.
3. **Combined effect:** Mage dies in ~3 rounds. Warrior survives ~9 rounds. The Warrior has 3x more rounds to deal damage.
4. **DPR gap:** Warrior does ~45 DPR (3 attacks × 15 avg). Mage does ~10-15 DPR (abilities + staff). Even with triple survival time, Warrior total damage output is 3x higher.
5. **No scaling path:** Mage AC and HP per level never improve. At L48 the gap gets worse, not better.

**Evidence against Hypothesis A (sim misconfiguration):**

1. Class abilities ARE firing — `class_ability` action type dispatches correctly without spell slot checks.
2. Ability queues contain multiple damage abilities with proper priority ordering.
3. No specialization in solo configs gives MORE abilities, not fewer — queue bloat, not emptiness.
4. The issue is not that casters can't use abilities — it's that they die before abilities matter.

**Minor sim config issues (Hypothesis A, SECONDARY):**

1. Missing specialization means suboptimal ability ordering (opener might be a CC from wrong spec).
2. Without spec, passive abilities from all specs load (e.g., Arcane Mastery cooldown reduction) — but passives in the ability queue are wasted entries since they're always active anyway. This could push real abilities further down the queue.

### Quantifying the Gap

For a Mage to reach ~30% win rate solo vs Djinn Lord (like Ranger achieves):

- **HP needed:** ~180 (from 92) — would survive ~6 rounds instead of 3
- **OR AC needed:** ~16 (from 10) — would reduce hits from 95% to 70%, effectively +50% survival
- **OR DPR needed:** ~40 (from 10-15) — would kill the monster before dying
- **Realistically:** A combination: +50% HP (to ~140), +4 AC (to 14), and ability damage that matches weapon scaling

## 6. Recommended Next Steps

### Priority 1: Fix Caster Survivability (HP + AC)

1. **Increase caster HP per level:** Mage/Psion from 2→3 HP/level. Bard from 3→3 (already OK). This gives Mage ~131 HP at L40 instead of 92 (+42%).
2. **Add cloth armor AC scaling:** Change `ARMOR_TIERS` for mage/psion from `[10,10,10,10]` to `[11,12,13,14]`. With DEX mod 0, this gives AC 14 at T3 instead of 10. Each +1 AC = ~5% fewer hits.
3. **In the real game,** verify: do Mage characters have ANY AC from equipment? If cloth robes provide AC in the item recipes, the sim `ARMOR_TIERS` is misconfigured and should match reality.

### Priority 2: Rebalance Caster DPR

1. **Reduce caster weapon penalty:** Staff/Orb damage is 1d6-1d8 at T3. Consider giving casters a "cantrip" auto-attack that deals INT/WIS/CHA mod + proficiency damage instead of weapon dice — matching how spellcasters in D&D 5e scale.
2. **Lower ability cooldowns:** Mage damage abilities have 1-3 round cooldowns, meaning basic attack fills 30-50% of rounds. Reducing key ability cooldowns would keep caster DPR closer to their ability damage rather than their weapon damage.
3. **Consider caster extra attacks equivalent:** A "multi-cast" scaling (cast 2 abilities per turn at L34+) would mirror the Warrior extra attack progression.

### Priority 3: Sim Config Improvements

1. **Add specialization to solo matchup configs:** Set `specialization` for each class to get the intended ability loadout rather than the "all specs" bloat.
2. **Add tier0 selections:** Pick optimal tier 0 choices per class (highest damage option at each level).
3. **Run a follow-up sim** with specializations and compare win rates — this isolates the spec vs no-spec impact.

### Priority 4: Psion-Specific Fixes

1. Psion is the weakest class even among casters. Seer spec has almost no damage abilities (mostly buffs/utility). Telepath has damage but it's all save-based (targets can resist).
2. Consider adding a direct-damage Psion ability that scales with level to give them a reliable DPR floor.
