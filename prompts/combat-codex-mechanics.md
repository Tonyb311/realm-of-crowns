# Codex Tab — Crash Fix + Combat Mechanics Detail

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead.
- Always end with a clear summary of what was delivered and what still needs the user's input.

## Task

Two parts:
1. **Fix crash** — Codex tab crashes with React error #31 ("Objects are not valid as React child, keys: name, description") when expanding any race. The `trait` field is `{name: string, description: string}` but is being rendered as a raw object.
2. **Combat mechanics transparency** — Replace the generic "Effects: type: damage, bonusDamage: 5" JSON dump with structured, human-readable combat mechanics. Show what stats drive each ability, what the defense is, dice/damage formulas, status effects, durations, and targeting.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Understanding the Data

### Race Abilities (from `shared/src/types/race.ts`)
```typescript
interface RacialAbility {
  name: string;
  description: string;
  levelRequired: number;
  type: 'active' | 'passive';
  effectType: string;       // 'combat_debuff', 'death_prevention', 'low_hp_buff', 'stat_buff', etc.
  effectValue: any;          // Varies by effectType
  cooldownSeconds?: number;  // Overworld cooldown (seconds)
  duration?: number;         // Effect duration (seconds) for overworld buffs
  targetType: 'self' | 'party' | 'enemy' | 'aoe';
}
```

Example race ability effects:
```typescript
// Orc: Intimidating Presence
{ effectType: 'combat_debuff', effectValue: { enemyAttackPenalty: -1, scope: 'first_attack' }, targetType: 'enemy' }

// Orc: Relentless Endurance
{ effectType: 'death_prevention', effectValue: { surviveAtHp: 1, usesPerCombat: 1 }, targetType: 'self' }

// Orc: Blood Fury
{ effectType: 'low_hp_buff', effectValue: { hpThreshold: 0.50, damageBonus: 0.25 }, targetType: 'self' }

// Human: Rally the People
{ effectType: 'stat_buff', effectValue: { allStats: 2 }, cooldownSeconds: 86400, duration: 3600, targetType: 'party' }
```

### Class Abilities (from `shared/src/data/skills/types.ts`)
```typescript
interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  class: string;
  specialization: string;
  tier: number;
  effects: Record<string, unknown>;  // The generic effects blob
  cooldown: number;                   // Combat rounds
  prerequisiteAbilityId?: string;
  levelRequired: number;
}
```

Example class ability effects by type:
```typescript
// Damage
{ type: 'damage', bonusDamage: 5, selfDefenseDebuff: -2 }

// Multi-attack
{ type: 'multi_attack', strikes: 2, accuracyPenalty: -3 }

// AoE damage
{ type: 'aoe_damage', targets: 'all_adjacent', damageMultiplier: 0.8 }

// Buff (self)
{ type: 'buff', acBonus: 5, duration: 4 }
{ type: 'buff', attackBonus: 3, acBonus: 2, duration: 4 }
{ type: 'buff', damageReduction: 0.5, duration: 2 }
{ type: 'buff', damageReflect: 0.3, immovable: true, duration: 3 }
{ type: 'buff', ccImmune: true, attackBonus: 15, duration: 3 }
{ type: 'buff', extraAction: true }
{ type: 'buff', guaranteedHits: 3, duration: 3 }
{ type: 'buff', attackScaling: 'missingHpPercent', duration: 5 }

// Damage + Status
{ type: 'damage_status', damage: 3, statusEffect: 'stun', statusDuration: 1 }

// Status
{ type: 'status', statusEffect: 'taunt', statusDuration: 2 }

// Heal
{ type: 'heal', fullRestore: true, usesPerCombat: 1 }
{ type: 'heal', healDice: '2d8', healModifier: 'wis' }

// Passive
{ type: 'passive', cheatingDeath: true, usesPerCombat: 1 }
{ type: 'passive', bonusHpFromCon: 0.2 }
{ type: 'passive', hpRegenPerRound: 3 }
{ type: 'passive', critChanceBonus: 0.15 }
{ type: 'passive', firstStrikeCrit: true }

// Save-based
{ type: 'damage_save', saveStat: 'con', diceCount: 3, diceSides: 6, statusEffect: 'poisoned', statusDuration: 3 }
{ type: 'cc', saveStat: 'wis', statusEffect: 'mesmerize', statusDuration: 2 }
```

### Race trait field (the crash source)
```typescript
trait: { name: string; description: string }  // e.g. { name: 'Adaptive', description: '+1 to ALL stats' }
```
The API returns this object directly. The Codex frontend renders `race.trait` as a React child, causing the crash.

## Part 1: Fix the Crash

In `client/src/components/admin/combat/CodexTab.tsx`, in the `RacesSubTab` component, find where `race.trait` is rendered and change it from:
```tsx
{race.trait}  // ← crashes because trait is {name, description}
```
to:
```tsx
<span className="text-realm-text-secondary">{race.trait?.name ?? race.trait}</span>
{race.trait?.description && (
  <span className="text-realm-text-muted ml-1">({race.trait.description})</span>
)}
```
Or handle both cases: if trait is a string, render directly. If trait is an object with `name`/`description`, render both. Use a type guard.

## Part 2: Enhanced AbilityCard with Combat Mechanics

Rewrite `client/src/components/admin/combat/AbilityCard.tsx` to parse and display combat mechanics clearly.

### For Race Abilities

When the AbilityCard receives race ability data, it should show structured mechanics based on `effectType`:

**Combat effects** (effectType contains 'combat', 'damage', 'death', 'buff' in combat context):
Show a "Combat Mechanics" section with:
- **Offense**: What stat drives it? (STR for melee, DEX for ranged, INT/WIS/CHA for magic)
- **Defense**: What counters it? (AC for attacks, specific save for spells/abilities)
- **Damage**: Dice formula if available, bonus damage values
- **Status Effect**: What it applies, duration, save to resist
- **Target**: Self/Party/Enemy/AoE
- **Trigger**: When does it activate (passive triggers, HP thresholds, etc.)

**Non-combat effects** (xp_bonus, reputation_bonus, profession_slot, building_discount, mount_buff):
Show an "Overworld Effect" section with the values clearly formatted.

### For Class Abilities

Parse the `effects` object by its `type` field and render structured mechanics:

**type: 'damage'**
```
⚔ Melee Damage
  Bonus Damage: +5
  Side Effect: -2 AC (self)
  Defense: Target AC
```

**type: 'multi_attack'**
```
⚔ Multi-Strike (2 hits)
  Accuracy: -3 per strike
  Defense: Target AC (each strike)
```

**type: 'aoe_damage'**
```
⚔ AoE Attack — All Adjacent
  Damage: 80% weapon damage
  Defense: Target AC (each target)
```

**type: 'buff'**
```
🛡 Self Buff (4 rounds)
  +5 AC
  -- or --
  +3 Attack, +2 AC (4 rounds)
  -- or --
  50% Damage Reduction (2 rounds)
  -- or --
  CC Immune, +15 Attack (3 rounds)
```

**type: 'damage_status'**
```
⚔ Attack + Status
  Damage: 3
  Applies: Stun (1 round)
  Defense: Target AC (damage), CON save (status)
```

**type: 'status'**
```
🎯 Crowd Control
  Applies: Taunt (2 rounds)
  Defense: WIS save
```

**type: 'damage_save'**
```
✨ Save-or-Suck
  Damage: 3d6
  Save: CON
  On Fail: Poisoned (3 rounds)
```

**type: 'cc'**
```
🧠 Crowd Control
  Applies: Mesmerize (2 rounds)
  Save: WIS
```

**type: 'heal'**
```
💚 Heal
  Amount: 2d8 + WIS modifier
  -- or --
  Full HP Restore (1/combat)
```

**type: 'passive'**
```
⭐ Passive
  Survive lethal blow at 1 HP (1/combat)
  -- or --
  +20% max HP from CON
  -- or --
  Regenerate 3 HP/round
  -- or --
  +15% crit chance
  -- or --
  First attack is auto-crit
```

### Visual Layout for AbilityCard

```
┌──────────────────────────────────────────────────────┐
│ ▸ Reckless Strike           T1  Lv 10  Active  ⚔    │
│                                                       │  ← collapsed
│ ▾ Reckless Strike           T1  Lv 10  Active  ⚔    │
│   A powerful overhead blow that deals extra damage    │
│   but leaves you exposed.                            │
│                                                       │
│   ┌─ Combat Mechanics ──────────────────────────────┐│
│   │  Type: Melee Damage                              ││
│   │  Bonus Damage: +5                                ││
│   │  Side Effect: -2 AC on self                      ││
│   │  Offense: STR modifier + proficiency → vs AC     ││
│   │  No cooldown                                     ││
│   └──────────────────────────────────────────────────┘│
│                                                       │
│ ▾ Shield Bash              T1  Lv 10  Active  ⚔🎯   │
│   Strike with your shield, dealing damage and        │
│   briefly stunning the target.                       │
│                                                       │
│   ┌─ Combat Mechanics ──────────────────────────────┐│
│   │  Type: Damage + Status                           ││
│   │  Damage: 3 bonus                                 ││
│   │  Applies: Stun (1 round)                         ││
│   │  Offense: STR modifier + proficiency → vs AC     ││
│   │  Status Save: CON save vs caster DC              ││
│   │  Cooldown: 3 rounds                              ││
│   └──────────────────────────────────────────────────┘│
│                                                       │
│ ▾ Blood Fury (Orc racial)  Lv 5  Passive  ⭐        │
│   +25% damage when below 50% HP                     │
│                                                       │
│   ┌─ Combat Mechanics ──────────────────────────────┐│
│   │  Type: Passive Combat Buff                       ││
│   │  Trigger: HP below 50%                           ││
│   │  Effect: +25% damage                             ││
│   │  Target: Self                                    ││
│   └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Mechanics Box Styling

- Slightly darker background than the card (`bg-realm-bg-900/50`)
- Thin left border: gold for offense abilities, blue for defensive, teal for passives, green for heals, purple for CC
- Each line is a key-value pair: key in muted text, value in primary text
- Status effect names get colored badges matching their type (poison=green, stun=yellow, etc.)
- Dice formulas in monospace: `3d6`, `2d8+WIS`
- "vs AC" and save types get subtle highlight

### Defense Type Derivation Rules

Since the ability definitions don't always explicitly state the defense, derive it from the effect type:

| Effect Type | Offense | Defense |
|---|---|---|
| damage, multi_attack, aoe_damage | STR/DEX modifier + proficiency (weapon attack) | Target AC |
| damage_status | Weapon attack (damage part) + save (status part) | AC + specified save (or CON default) |
| damage_save | Spell/ability DC | Specified save stat |
| cc, status (with saveStat) | Spell/ability DC | Specified save stat |
| status (taunt, no saveStat) | Auto-apply | WIS save (default for mental effects) |
| buff, heal | N/A (self/ally) | N/A |
| passive | N/A | N/A |

If `effects.saveStat` exists, use it directly. If a status effect is applied but no save is specified:
- Physical effects (stun, root, paralyzed): default CON save
- Mental effects (taunt, mesmerize, dominated, silence): default WIS save
- Magical effects (burning, frozen, poisoned): default CON save

Note: These defaults are reasonable assumptions. The actual combat engine handler may differ in edge cases. Show the default but add "(estimated)" if the save isn't explicitly in the data.

### Type Icons

Add a small icon before the ability type badge:
- ⚔ damage, multi_attack, aoe_damage
- 🛡 buff (defensive: acBonus, damageReduction)
- ⚡ buff (offensive: attackBonus, guaranteedHits)
- 🎯 status, cc, damage_status
- 💚 heal
- ⭐ passive
- 🧠 psion/mental abilities
- 🔮 magical/racial combat abilities

### AbilityCard Props Update

The AbilityCard needs to accept the full ability data, not just name/description/effects. Update the props:

```typescript
interface AbilityCardProps {
  name: string;
  description: string;
  // Class ability fields
  tier?: number;
  levelRequired?: number;
  cooldown?: number;          // combat rounds
  effects?: Record<string, unknown>;
  specialization?: string;
  prerequisiteAbilityId?: string | null;
  // Race ability fields
  type?: 'active' | 'passive';
  effectType?: string;
  effectValue?: any;
  targetType?: 'self' | 'party' | 'enemy' | 'aoe';
  cooldownSeconds?: number;   // overworld seconds
  duration?: number;           // effect duration in seconds
  // Source context
  abilitySource?: 'race' | 'class';
}
```

### CodexTab Updates

**RacesSubTab**: Pass the full race ability data to AbilityCard including `effectType`, `effectValue`, `targetType`, `type`, `cooldownSeconds`, `duration`, and `abilitySource: 'race'`.

**ClassesSubTab**: Pass `abilitySource: 'class'` and the existing data.

**Both**: Fix the `race.trait` crash. Handle trait as either string or `{name, description}` object.

## DO NOT

- Do not touch the History tab or Overview tab
- Do not modify backend endpoints unless fields are genuinely missing from the API response
- Do not change the Monsters or Status Effects sub-tabs (they work fine)
- Do not modify combat engine code
- Do not add new routes

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "fix: codex crash + enhanced combat mechanics display"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
