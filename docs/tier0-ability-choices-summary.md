# Tier 0 Class Ability Choices Summary

## Overview

Added a pre-specialization ability choice system at levels 3, 5, and 8. Each class gets 9 new abilities (3 per level), and the player picks 1 of 3 at each level. The choice is permanent. This creates 27 possible early-game builds per class.

**Total new abilities:** 63 (7 classes x 9 abilities each)

## Choice Levels

| Level | Power Bracket | Description |
|-------|--------------|-------------|
| 3 | First Taste | Very low power, simple one-effect abilities, cd 1-3 |
| 5 | Building Up | Slightly more impactful, combos with any L3 pick, cd 2-4 |
| 8 | Coming Online | Strongest tier 0, still below tier 1 spec ability, cd 3-5 |

## All 63 Abilities

### Warrior (9 abilities)

**Level 3 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| war-t0-3a | Power Strike | damage (bonus: 3) | Heavy overhead swing | 2 |
| war-t0-3b | Defensive Stance | buff (AC+3, 2 rounds) | Brace for impact | 3 |
| war-t0-3c | Intimidating Shout | debuff (atk -2, 2 rounds) | Shake opponent's confidence | 3 |

**Level 5 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| war-t0-5a | Sundering Strike | damage_debuff (bonus: 2, AC-2, 2 rounds) | Crack their armor | 3 |
| war-t0-5b | Second Wind | heal (8 HP) | Catch your breath mid-fight | 4 |
| war-t0-5c | Hamstring | damage_status (bonus: 1, slow 2 rounds) | Cripple movement | 3 |

**Level 8 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| war-t0-8a | Brutal Charge | damage (bonus: 5, accuracy+2) | Devastating charge | 3 |
| war-t0-8b | Iron Skin | buff (absorb 12, 3 rounds) | Shrug off blows | 4 |
| war-t0-8c | War Cry | buff (atk+3, AC+1, 3 rounds) | Battle cry buff | 4 |

### Mage (9 abilities)

**Level 3 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| mag-t0-3a | Arcane Spark | damage (1d4+1) | Raw arcane energy | 1 |
| mag-t0-3b | Mana Shield | buff (absorb 6, 2 rounds) | Thin arcane barrier | 3 |
| mag-t0-3c | Chill Touch | damage_status (bonus: 1, slow 1 round) | Spectral cold | 2 |

**Level 5 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| mag-t0-5a | Flame Jet | damage (fire, 1d6+1) | Burst of flame | 2 |
| mag-t0-5b | Frost Ward | buff (AC+3, 3 rounds) | Ice shell | 4 |
| mag-t0-5c | Hex | debuff (AC-3, 3 rounds) | Unravel defenses | 3 |

**Level 8 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| mag-t0-8a | Lightning Bolt | damage (lightning, 2d4+1) | Electric bolt | 3 |
| mag-t0-8b | Arcane Barrier | buff (absorb 15, 3 rounds) | Force wall | 5 |
| mag-t0-8c | Enervation | drain (1d6, 50% heal) | Life siphon | 3 |

### Rogue (9 abilities)

**Level 3 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| rog-t0-3a | Quick Slash | damage (bonus: 3) | Swift precise cut | 1 |
| rog-t0-3b | Dodge Roll | buff (AC+4, 1 round) | Tumble aside | 3 |
| rog-t0-3c | Low Blow | damage_status (bonus: 1, stun 1 round) | Dirty strike | 4 |

**Level 5 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| rog-t0-5a | Gouge | damage_status (bonus: 2, blind 1 round) | Jab at the eyes | 3 |
| rog-t0-5b | Slip Away | buff (AC+4, 2 rounds) | Hard to pin down | 4 |
| rog-t0-5c | Crippling Poison | status (poison 3 rounds) | Debilitating toxin | 3 |

**Level 8 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| rog-t0-8a | Exploit Opening | damage (bonus: 6, accuracy+2) | Strike the gap | 3 |
| rog-t0-8b | Nimble Defense | buff (AC+5, 2 rounds) | Preternatural grace | 4 |
| rog-t0-8c | Cheap Shot | damage_debuff (bonus: 2, atk-3, AC-2, 2 rounds) | Dirty fighting | 4 |

### Cleric (9 abilities)

**Level 3 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| cle-t0-3a | Sacred Strike | damage (radiant, bonus: 3) | Divine wrath through weapon | 2 |
| cle-t0-3b | Mending Touch | heal (6 HP) | Lay hands to heal | 3 |
| cle-t0-3c | Blessed Ward | buff (AC+3, 2 rounds) | Protective prayer | 3 |

**Level 5 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| cle-t0-5a | Divine Strike | damage (radiant, bonus: 4) | Holy strike | 2 |
| cle-t0-5b | Rejuvenation | hot (3 HP/round, 3 rounds) | Healing over time | 4 |
| cle-t0-5c | Rebuke | debuff (atk-3, 3 rounds) | Righteous chastisement | 3 |

**Level 8 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| cle-t0-8a | Holy Fire | damage (radiant, 1d8+2) | Sacred flame | 3 |
| cle-t0-8b | Sanctuary | buff (absorb 12, AC+2, 3 rounds) | Divine light shield | 5 |
| cle-t0-8c | Condemnation | damage_debuff (bonus: 3, AC-3, 2 rounds) | Divine judgment | 4 |

### Ranger (9 abilities)

**Level 3 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| ran-t0-3a | Steady Shot | damage (bonus: 3, accuracy+1) | Careful aim | 2 |
| ran-t0-3b | Nature's Grasp | status (root 1 round) | Tangling roots | 3 |
| ran-t0-3c | Tracker's Eye | debuff (AC-2, 3 rounds) | Study weaknesses | 3 |

**Level 5 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| ran-t0-5a | Twin Arrows | damage (bonus: 2, 1d4) | Two arrows | 2 |
| ran-t0-5b | Bark Skin | buff (AC+3, 3 rounds) | Forest protection | 4 |
| ran-t0-5c | Trip Wire | damage_status (bonus: 2, slow 2 rounds) | Tangle their legs | 3 |

**Level 8 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| ran-t0-8a | Drilling Shot | damage (bonus: 5, ignoreArmor) | Punch through armor | 3 |
| ran-t0-8b | Camouflage | buff (AC+4, 3 rounds) | Blend with terrain | 4 |
| ran-t0-8c | Venomous Arrow | damage_status (bonus: 3, poison 3 rounds) | Poison-tipped arrow | 3 |

### Bard (9 abilities)

**Level 3 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| bar-t0-3a | Cutting Words | damage (bonus: 3) | Insult that wounds | 2 |
| bar-t0-3b | Soothing Melody | heal (6 HP) | Gentle healing tune | 3 |
| bar-t0-3c | Jarring Note | debuff (atk-2, 2 rounds) | Discordant pitch | 3 |

**Level 5 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| bar-t0-5a | Vicious Mockery | damage_debuff (bonus: 3, atk-2, 2 rounds) | Magical insults | 3 |
| bar-t0-5b | Hymn of Fortitude | buff (AC+2, atk+2, 3 rounds) | War hymn | 4 |
| bar-t0-5c | Lullaby | status (slow 2 rounds) | Drowsy melody | 3 |

**Level 8 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| bar-t0-8a | Thunderclap | damage (2d4+2) | Sonic shockwave | 3 |
| bar-t0-8b | Inspiring Ballad | heal (12 HP) | Stirring ballad | 4 |
| bar-t0-8c | Cacophony | damage_debuff (bonus: 2, atk-3, AC-2, 2 rounds) | Overwhelming noise | 4 |

### Psion (9 abilities)

**Level 3 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| psi-t0-3a | Psychic Jab | damage (psychic, bonus: 3) | Raw thought spike | 1 |
| psi-t0-3b | Mental Ward | buff (AC+3, 2 rounds) | Psychic membrane | 3 |
| psi-t0-3c | Mind Fog | debuff (atk-2, 2 rounds) | Psychic static | 3 |

**Level 5 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| psi-t0-5a | Psionic Dart | damage (psychic, 1d6+1) | Needle of psychic force | 2 |
| psi-t0-5b | Mental Fortress | buff (absorb 8, 3 rounds) | Layered barriers | 4 |
| psi-t0-5c | Thought Leech | drain (1d4, 50% heal) | Feast on stray thoughts | 3 |

**Level 8 — Choose One:**
| ID | Name | Effect Type | Description | Cooldown |
|----|------|------------|-------------|----------|
| psi-t0-8a | Ego Whip | damage (psychic, 2d4+1) | Willpower lash | 3 |
| psi-t0-8b | Id Insinuation | damage_status (bonus: 2, stun 1 round) | Psychic motor disruption | 5 |
| psi-t0-8c | Precognition | buff (AC+4, atk+2, 2 rounds) | Future sight | 4 |

## API Endpoints

### GET /api/skills/tier0-pending

Returns pending tier 0 choices (levels where character qualifies but hasn't chosen).

**Response:**
```json
{
  "pending": [
    {
      "level": 3,
      "choiceGroup": "warrior_tier0_level3",
      "options": [
        { "id": "war-t0-3a", "name": "Power Strike", ... },
        { "id": "war-t0-3b", "name": "Defensive Stance", ... },
        { "id": "war-t0-3c", "name": "Intimidating Shout", ... }
      ]
    }
  ]
}
```

### POST /api/skills/choose-tier0

Choose a tier 0 ability. Permanent, one per choice group.

**Request:** `{ "abilityId": "war-t0-3a" }`

**Response:**
```json
{
  "message": "Chose ability: Power Strike",
  "ability": {
    "id": "war-t0-3a",
    "name": "Power Strike",
    "description": "A heavy overhead swing...",
    "choiceGroup": "warrior_tier0_level3",
    "levelRequired": 3,
    "effects": { "type": "damage", "bonusDamage": 3 },
    "cooldown": 2
  }
}
```

**Validations:**
- Ability must be tier 0 and match character's class
- Character must be >= levelRequired
- Character must not have already chosen from this group

### GET /api/skills/tree (updated)

Now includes `tier0` array in response:
```json
{
  "class": "warrior",
  "level": 5,
  "tier0": [
    {
      "level": 3,
      "choiceGroup": "warrior_tier0_level3",
      "chosen": "war-t0-3a",
      "abilities": [
        { "id": "war-t0-3a", "status": "chosen", ... },
        { "id": "war-t0-3b", "status": "not_chosen", ... },
        { "id": "war-t0-3c", "status": "not_chosen", ... }
      ]
    },
    {
      "level": 5,
      "choiceGroup": "warrior_tier0_level5",
      "chosen": null,
      "abilities": [
        { "id": "war-t0-5a", "status": "available", ... },
        { "id": "war-t0-5b", "status": "available", ... },
        { "id": "war-t0-5c", "status": "available", ... }
      ]
    }
  ],
  "tree": [ ... ]
}
```

## Integration Points

### Level-Up Flow
- Socket `player:level-up` event now includes `tier0Pending?: number`
- LevelUpCelebration shows pending choice count and "Choose Abilities" button
- Progression service counts pending after granting abilities

### Auto-Grant Safety
- `autoGrantAbilities()` explicitly filters out `requiresChoice` abilities
- Tier 0 abilities also have `specialization: 'none'` which naturally skips them

### Combat Simulator
- `buildAbilityQueue()` picks the first option ("a") per choice group for deterministic sim behavior
- Tier 0 abilities flow through the same combat engine as spec abilities

### Skill Tree UI
- New "Early Abilities" section at top of skill tree page
- Shows all 3 tier 0 choice groups with status (chosen/available/locked)
- Confirmation modal for permanent choices
- Pending badge in header

## Files Modified

| File | Changes |
|------|---------|
| `shared/src/data/skills/types.ts` | Added `requiresChoice?`, `choiceGroup?` to AbilityDefinition |
| `shared/src/data/skills/warrior.ts` | Added 9 tier 0 abilities |
| `shared/src/data/skills/mage.ts` | Added 9 tier 0 abilities |
| `shared/src/data/skills/rogue.ts` | Added 9 tier 0 abilities |
| `shared/src/data/skills/cleric.ts` | Added 9 tier 0 abilities |
| `shared/src/data/skills/ranger.ts` | Added 9 tier 0 abilities |
| `shared/src/data/skills/bard.ts` | Added 9 tier 0 abilities |
| `shared/src/data/skills/psion.ts` | Added 9 tier 0 abilities |
| `shared/src/data/skills/index.ts` | Added tier0 exports, TIER0_ABILITIES_BY_CLASS, TIER0_CHOICE_LEVELS |
| `server/src/services/ability-grants.ts` | Added `!a.requiresChoice` filter |
| `server/src/routes/skills.ts` | Added choose-tier0, tier0-pending endpoints; tier0 in tree response |
| `server/src/services/progression.ts` | Count pending tier0 in level-up event |
| `server/src/socket/events.ts` | Added `tier0Pending?` to level-up payload |
| `server/src/services/combat-simulator.ts` | Filter tier0 to first option per group in sim |
| `client/src/pages/SkillTreePage.tsx` | Added Tier0ChoiceSection, ConfirmChoiceModal |
| `client/src/components/LevelUpCelebration.tsx` | Shows pending tier0 count + Choose button |
| `client/src/hooks/useProgressionEvents.ts` | Added `tier0Pending?` to LevelUpPayload |
| `client/src/services/socket.ts` | Added `tier0Pending?` to LevelUpPayload |
| `client/src/components/codex/CodexMechanics.tsx` | Updated progression text |

## Edge Cases

- **Characters already past level 8:** All 3 choice groups show as `available` until the player makes choices
- **No respec:** Once chosen, the choice is permanent. No undo endpoint exists.
- **Sim characters:** Always get the "a" option at each level for deterministic results
- **Combat integration:** Chosen tier 0 abilities are stored as CharacterAbility rows, so the existing combat system picks them up automatically
- **Multiple level-ups:** If a character gains multiple levels at once (e.g., 2→5), they'll see all newly-eligible tier 0 choices
