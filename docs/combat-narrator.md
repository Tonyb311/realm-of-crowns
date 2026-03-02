# Combat Narrator System

## Overview

The CombatNarrator transforms mechanical combat events (attack rolls, damage numbers, status ticks) into flavorful narrative text. It is a **pure-function, template-based system** with zero LLM dependency and zero combat engine changes.

All narration code lives in `shared/src/data/combat-narrator/`.

## Architecture

```
combat-pve.ts                    shared/data/combat-narrator/
  formatCombatResponse()  ───►  narrator.ts  ───►  templates.ts
      │                          │                     │
      │ builds NarrationContext   │ picks template      │ 1087 lines
      │ from CombatState          │ substitutes vars    │ 200+ templates
      │                          │ applies HP mods     │
      └──► CombatLogEntry[]      └──► string           └──► string[]
```

### Data Flow

1. `formatCombatResponse()` in `combat-pve.ts` receives a `CombatState` after each combat action
2. For each `TurnLogEntry`, it builds a `NarrationContext` with actor/target data (name, class, race, HP%, weapon)
3. Calls `narrateCombatEvent()` which selects and fills a template
4. Returns `CombatLogEntry[]` with narrative `message` field for the client
5. Status ticks are expanded into separate entries via `narrateStatusTick()`
6. A combat opening line is prepended via `narrateCombatOpening()`

### Template Resolution Priority

For player attacks:
1. Critical hit → class-specific crit template (50%) or generic crit
2. Fumble (nat 1) → class-specific fumble or generic fumble
3. Miss → class-specific miss or generic miss
4. Hit → class template (50% chance) → weapon-type template → generic

For abilities/spells: ability-specific template → result description → fallback

For monster attacks: monster personality text → generic monster attack

## Files

| File | Purpose |
|------|---------|
| `shared/src/data/combat-narrator/templates.ts` | All 200+ narration templates organized by category |
| `shared/src/data/combat-narrator/narrator.ts` | Pure function narrator logic |
| `shared/src/data/combat-narrator/index.ts` | Re-exports |
| `shared/src/data/combat-narrator/__tests__/narrator.test.ts` | Unit tests |

## Template Categories

| Category | Count | Description |
|----------|-------|-------------|
| Attack (weapon type) | 28 | Templates for sword, axe, staff, bow, dagger, mace, unarmed, generic |
| Attack (class) | 21 | Class-specific hit templates (3 per class) |
| Miss (generic + class) | 18 | Miss narration |
| Critical Hit | 25 | Generic (3) + class-specific (22) |
| Fumble | 11 | Generic (4) + class-specific (7) |
| Ability | 113 | Templates keyed by ability name across all 7 classes |
| Monster Personality | 21 | Each of the 21 monsters has attack, wounded, and opening text |
| Status Effects | 40 | Apply + expire templates for all 20 status effects |
| HP Modifiers | 12 | Strained (4), Desperate (4), Last Stand (4) prefixes |
| Kill Lines | 8 | Player wins (5), Player dies (3) |
| Defend/Flee/Item | 12 | Defend (4), Flee success (4), Flee failure (4) |
| Combat Openings | 21+3 | Monster-specific + 3 generic fallbacks |
| Monster Generic | 6 | Generic monster attack (3) + miss (3) |

## Key Interfaces

```typescript
interface NarrationContext {
  actorName: string;
  actorRace?: string;
  actorClass?: string;
  actorEntityType: 'character' | 'monster';
  actorHpPercent: number;       // 0-100
  targetName?: string;
  targetEntityType?: 'character' | 'monster';
  targetHpPercent?: number;
  targetKilled?: boolean;
  weaponName?: string;
}

interface NarratorLogEntry {
  round: number;
  actorId: string;
  action: string;
  result: BaseResult;
  statusTicks?: Array<{ ... }>;
}
```

## Exported Functions

| Function | Purpose |
|----------|---------|
| `narrateCombatEvent(entry, context)` | Main entry — returns narrative text for any combat action |
| `narrateStatusTick(effect, dmg, heal, expired, killed)` | Narrates a status effect tick |
| `narrateCombatOpening(monsterName)` | Returns a combat opening flavor line |
| `narrateMonsterWounded(monsterName)` | Returns wounded flavor text (or null) |

## HP Threshold Modifiers

When the actor's HP drops below certain thresholds, a tone-setting prefix is prepended:

| HP Range | Tone | Example Prefix |
|----------|------|----------------|
| 76-100% | Normal | (no modifier) |
| 51-75% | Strained | "Gritting teeth through the pain," |
| 26-50% | Desperate | "Blood streaming from a dozen cuts," |
| 1-25% | Last Stand | "On the verge of collapse," |

## Target Label Logic

- Player → Monster: "the {monsterName}" (e.g., "the Goblin")
- Monster → Player: "you"
- PvP: opponent's name

## Adding New Content

### New Monster
Add an entry to `MONSTER_FLAVOR` in `templates.ts`:
```typescript
'New Monster': {
  attack: ['strikes with terrible force.', 'lashes out viciously.'],
  wounded: ['staggers, ichor dripping.', 'snarls in defiance.'],
  opening: ['A new monster blocks the path ahead.'],
},
```

### New Ability
Add an entry to `ABILITY_TEMPLATES` in `templates.ts`:
```typescript
'New Ability': [
  'channels {ability} at {target}.',
  'unleashes {ability}, energy crackling.',
],
```

### New Status Effect
Add entries to both `STATUS_APPLY` and `STATUS_EXPIRE`:
```typescript
// In STATUS_APPLY
new_effect: ['is affected by the new effect.'],
// In STATUS_EXPIRE
new_effect: ['shakes off the new effect.'],
```

## Integration Points

- **PvE combat**: Full narrator integration via `formatCombatResponse()` in `combat-pve.ts`
- **PvP combat**: Not integrated (sends raw log) — future enhancement
- **Simulation**: Not integrated (sim uses combat engine directly)
- **CombatLog.tsx**: Renders narrative messages with critical hit styling (gold highlight + left border)
