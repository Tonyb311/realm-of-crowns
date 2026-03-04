# Phase 5 — Mechanical Verification Report

Generated: 2026-03-04T02:01:40.448Z
Runtime: 1.5s

## Summary
- Total fights: 3570
- Total errors: 0
- Monster abilities verified: 110/129 (85.3%)
- Class abilities verified: 69/126 (54.8%)
- Engine features verified: 11/13

## Engine Feature Coverage

| Feature | Triggered? | Count | Monsters |
|---------|-----------|-------|----------|
| Legendary Actions | YES | 5832 | Young Dragon, Demon, Lich, Elder Fey Guardian, Frost Giant, Fire Giant, Beholder, Death Knight, Storm Giant, Kraken Spawn, Aboleth, Djinn Lord, Archlich, Phoenix, Pit Fiend, Deep Kraken, Elder Wyrm, Arcane Titan, Tarrasque, Void Emperor |
| Legendary Resistances | YES | 194 | Lich, Iron Golem, Beholder, Death Knight, Storm Giant, Basilisk King, Aboleth, Djinn Lord, Archlich, Phoenix, Pit Fiend, Deep Kraken, Elder Wyrm, Arcane Titan, Tarrasque, Void Emperor |
| Phase Transitions | YES | 27 | Lich, Vampire Lord |
| Death Throes | NO | 0 | - |
| Swallow | YES | 107 | Purple Worm, Tarrasque |
| Damage Aura | YES | 78 | Demon, Fire Giant, Storm Giant, Archlich, Phoenix |
| Fear Aura | YES | 867 | Young Dragon, Demon, Lich, Elder Fey Guardian, Death Knight, Pit Fiend, Elder Wyrm, Tarrasque, Void Emperor |
| Multiattack | YES | 3777 | Orc Warrior, Troll, Ancient Golem, Young Dragon, Hydra, Demon, Void Stalker, Wyvern, Chimera, Vampire Lord, Purple Worm, Beholder, Fey Dragon, Death Knight, Storm Giant, Sand Wyrm, Kraken Spawn, War Mammoth, River Leviathan, Basilisk King, Aboleth, Djinn Lord, Roc, Phoenix, Pit Fiend, Elder Wyrm, Arcane Titan, Tarrasque, Void Emperor |
| Heal/Regen | YES | 2139 | Treant |
| On-Hit Effects | YES | 288 | Wolf, Giant Rat, Giant Spider, Dire Wolf, Bog Wraith, Shadow Wraith, Archlich |
| Status Effects | YES | 3367 | Giant Spider, Lich, Arcane Elemental, Shadow Wraith, Elder Fey Guardian, Treant, Mind Flayer, Vampire Lord, Frost Giant, Sea Serpent, Purple Worm, Beholder, Kraken Spawn, River Leviathan, Basilisk King, Aboleth, Roc, Archlich, Deep Kraken, Arcane Titan, Tarrasque, Void Emperor |
| AoE Attacks | YES | 2649 | Young Dragon, Demon, Elder Fey Guardian, Chimera, Mind Flayer, Frost Giant, Sea Serpent, Iron Golem, Fire Giant, Fey Dragon, Death Knight, Storm Giant, Sand Wyrm, War Mammoth, River Leviathan, Aboleth, Djinn Lord, Roc, Archlich, Phoenix, Pit Fiend, Deep Kraken, Elder Wyrm, Arcane Titan, Tarrasque, Void Emperor |
| Buff | NO | 0 | - |

## Monster Ability Coverage

### FULLY VERIFIED (all abilities fired at least once)

- Wolf
- Giant Rat
- Orc Warrior
- Giant Spider
- Dire Wolf
- Ancient Golem
- Young Dragon
- Hydra
- Lich
- Bog Wraith
- Arcane Elemental
- Shadow Wraith
- Elder Fey Guardian
- Treant
- Chimera
- Mind Flayer
- Frost Giant
- Sea Serpent
- Iron Golem
- Fire Giant
- Beholder
- Death Knight
- Storm Giant
- Kraken Spawn
- River Leviathan
- Aboleth
- Roc
- Archlich
- Elder Wyrm
- Tarrasque

### ABILITIES THAT NEVER FIRED

| Monster | Ability | Type | Total Fights | Possible Reason |
|---------|---------|------|-------------|-----------------|
| Troll | Regeneration | heal | 70 | Heal disabled by FIRE/ACID or fight too short |
| Demon | Infernal Explosion | death_throes | 70 | Monster never died (fights too short or player dies first) |
| Void Stalker | Psychic Terror | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Wyvern | Venomous Stinger | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Vampire Lord | Life Drain | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Purple Worm | Bursting Death | death_throes | 70 | Monster never died (fights too short or player dies first) |
| Fey Dragon | Phase Shift | buff | 70 | High cooldown (3) + fight too short |
| Sand Wyrm | Tremorsense Ambush | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Sand Wyrm | Burrowing Collapse | death_throes | 70 | Monster never died (fights too short or player dies first) |
| War Mammoth | Tusk Toss | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Basilisk King | Venomous Bite | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Djinn Lord | Wind Shield | buff | 70 | High cooldown (4) + fight too short |
| Phoenix | Healing Flames | heal | 70 | Heal disabled by COLD or fight too short |
| Phoenix | Rebirth Inferno | death_throes | 70 | Monster never died (fights too short or player dies first) |
| Pit Fiend | Infernal Wound | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Deep Kraken | Tentacle Lash | multiattack | 70 | Cooldown: 0, Priority: 5 |
| Arcane Titan | Arcane Shield | buff | 70 | High cooldown (4) + fight too short |
| Void Emperor | Void Drain | on_hit | 70 | Monster basic attack never landed (abilities used instead) |
| Void Emperor | Void Collapse | death_throes | 70 | Monster never died (fights too short or player dies first) |

## Class Ability Coverage

### By Class

| Class | Total Abilities | Abilities Fired | Coverage |
|-------|----------------|-----------------|----------|
| warrior | 18 | 9 | 50.0% |
| mage | 18 | 9 | 50.0% |
| rogue | 18 | 11 | 61.1% |
| cleric | 18 | 11 | 61.1% |
| ranger | 18 | 11 | 61.1% |
| bard | 18 | 10 | 55.6% |
| psion | 18 | 8 | 44.4% |

### Abilities That Never Fired

| Class | Ability | Level Req | Possible Reason |
|-------|---------|-----------|-----------------|
| warrior | Blood Rage | 5 | Not selected by ability queue AI |
| warrior | Berserker Rage | 28 | Not selected by ability queue AI |
| warrior | Undying Fury | 40 | Passive ability (not actively used in combat) |
| warrior | Shield Bash | 1 | Not selected by ability queue AI |
| warrior | Taunt | 10 | Not selected by ability queue AI |
| warrior | Unbreakable | 40 | Passive ability (not actively used in combat) |
| warrior | Inspiring Presence | 18 | Passive ability (not actively used in combat) |
| warrior | Warlords Decree | 28 | Not selected by ability queue AI |
| warrior | Legendary Commander | 40 | Not selected by ability queue AI |
| mage | Elemental Shield | 18 | Not selected by ability queue AI |
| mage | Arcane Mastery | 40 | Passive ability (not actively used in combat) |
| mage | Life Drain | 1 | Not selected by ability queue AI |
| mage | Corpse Explosion | 10 | Not selected by ability queue AI |
| mage | Bone Armor | 18 | Not selected by ability queue AI |
| mage | Lichdom | 40 | Passive ability (not actively used in combat) |
| mage | Arcane Bolt | 1 | Not selected by ability queue AI |
| mage | Haste | 10 | Not selected by ability queue AI |
| mage | Spell Weaver | 40 | Passive ability (not actively used in combat) |
| rogue | Poison Blade | 10 | Not selected by ability queue AI |
| rogue | Shadow Mastery | 40 | Passive ability (not actively used in combat) |
| rogue | Quick Fingers | 10 | Passive ability (not actively used in combat) |
| rogue | Disengage | 18 | Flee abilities only used at low HP + AI decision |
| rogue | Treasure Sense | 40 | Passive ability (not actively used in combat) |
| rogue | Flurry of Blades | 18 | Not selected by ability queue AI |
| rogue | Untouchable | 40 | Passive ability (not actively used in combat) |
| cleric | Healing Light | 1 | Not selected by ability queue AI |
| cleric | Purify | 5 | Not selected by ability queue AI |
| cleric | Regeneration | 10 | Not selected by ability queue AI |
| cleric | Resurrection | 28 | Passive ability (not actively used in combat) |
| cleric | Miracle | 40 | Not selected by ability queue AI |
| cleric | Avatar of Light | 40 | Passive ability (not actively used in combat) |
| cleric | Inquisitors Verdict | 40 | Passive ability (not actively used in combat) |
| ranger | Wild Bond | 5 | Not selected by ability queue AI |
| ranger | Spirit Bond | 40 | Passive ability (not actively used in combat) |
| ranger | Eagles Eye | 40 | Passive ability (not actively used in combat) |
| ranger | Lay Trap | 1 | Not selected by ability queue AI |
| ranger | Hunters Mark | 10 | Not selected by ability queue AI |
| ranger | Predator Instinct | 28 | Passive ability (not actively used in combat) |
| ranger | Master Tracker | 40 | Passive ability (not actively used in combat) |
| bard | Soothing Presence | 10 | Passive ability (not actively used in combat) |
| bard | Diplomats Gambit | 18 | Not selected by ability queue AI |
| bard | Legendary Charisma | 40 | Passive ability (not actively used in combat) |
| bard | Marching Cadence | 10 | Not selected by ability queue AI |
| bard | Crescendo | 28 | Passive ability (not actively used in combat) |
| bard | Recall Lore | 5 | Passive ability (not actively used in combat) |
| bard | Tome of Secrets | 28 | Not selected by ability queue AI |
| bard | Omniscient | 40 | Passive ability (not actively used in combat) |
| psion | Thought Shield | 5 | Passive ability (not actively used in combat) |
| psion | Danger Sense | 5 | Passive ability (not actively used in combat) |
| psion | Precognitive Dodge | 12 | Reactive ability — triggers on being hit, not actively queued |
| psion | Third Eye | 18 | Passive ability (not actively used in combat) |
| psion | Prescient Mastery | 40 | Not selected by ability queue AI |
| psion | Blink Strike | 1 | Not selected by ability queue AI |
| psion | Phase Step | 5 | Passive ability (not actively used in combat) |
| psion | Dimensional Pocket | 12 | Not selected by ability queue AI |
| psion | Translocation | 18 | Not selected by ability queue AI |
| psion | Banishment | 40 | Not selected by ability queue AI |

## Damage Verification

No 0-damage bugs found. All damage-dealing abilities that fired dealt >0 damage.

## Errors

No runtime errors.
