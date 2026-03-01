# Class Abilities Audit Report

**Date:** 2026-03-01
**Scope:** Read-only investigation of all class ability data, combat engine integration, database schema, seed scripts, and combat simulator handling.
**Auditor:** Claude Code (automated)

---

## 1. Class & Ability Data Definitions

### Location: `shared/src/data/skills/`

All class ability data lives in 9 files:

| File | Purpose |
|------|---------|
| `types.ts` | Type definitions: `AbilityDefinition`, `SpecializationDefinition`, `ClassDefinition` |
| `index.ts` | Aggregator: exports `ALL_ABILITIES`, `ABILITIES_BY_CLASS`, `VALID_CLASSES`, `SPECIALIZATIONS` |
| `warrior.ts` | 18 warrior abilities (3 specs x 6) |
| `mage.ts` | 18 mage abilities (3 specs x 6) |
| `rogue.ts` | 18 rogue abilities (3 specs x 6) |
| `cleric.ts` | 18 cleric abilities (3 specs x 6) |
| `ranger.ts` | 18 ranger abilities (3 specs x 6) |
| `bard.ts` | 18 bard abilities (3 specs x 6) |
| `psion.ts` | 18 psion abilities (3 specs x 6) |

### Type Definition

```typescript
// shared/src/data/skills/types.ts
export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  class: string;
  specialization: string;
  tier: number;
  effects: Record<string, unknown>;
  cooldown: number;
  prerequisiteAbilityId?: string;
  levelRequired: number;
}

export interface SpecializationDefinition {
  name: string;
  description: string;
  abilities: AbilityDefinition[];
}

export interface ClassDefinition {
  name: string;
  specializations: SpecializationDefinition[];
}
```

### Aggregator

```typescript
// shared/src/data/skills/index.ts
export const ALL_ABILITIES: AbilityDefinition[] = [
  ...warriorAbilities,    // 18
  ...mageAbilities,       // 18
  ...rogueAbilities,      // 18
  ...clericAbilities,     // 18
  ...rangerAbilities,     // 18
  ...bardAbilities,       // 18
  ...psionAbilities,      // 18
];
// Total: 126 abilities

export const VALID_CLASSES = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion'] as const;

export const SPECIALIZATIONS: Record<string, string[]> = {
  warrior: ['berserker', 'guardian', 'warlord'],
  mage: ['elementalist', 'necromancer', 'enchanter'],
  rogue: ['assassin', 'thief', 'swashbuckler'],
  cleric: ['healer', 'paladin', 'inquisitor'],
  ranger: ['beastmaster', 'sharpshooter', 'tracker'],
  bard: ['diplomat', 'battlechanter', 'lorekeeper'],
  psion: ['telepath', 'seer', 'nomad'],
};
```

### Total Ability Count

- **7 classes x 3 specializations x 6 abilities = 126 total abilities**
- **Psion: 18 abilities (fully integrated into combat engine)**
- **Non-psion: 108 abilities (data defined, NOT integrated into combat engine)**

---

## 2. Combat Engine Hooks

### File: `server/src/lib/combat-engine.ts`

The combat engine is a pure-function module (~1950 lines) with no database calls. It handles turn resolution, damage, status effects, and ability dispatch.

### Action Types in `resolveTurn`

The `resolveTurn` function (line ~1569) is the main entry point. It handles actions via a switch statement:

```typescript
switch (action.type) {
  case 'attack':        // Resolved via resolveAttack() -- WORKING
  case 'cast':          // Resolved via resolveCast() -- WORKING (spell slots)
  case 'defend':        // Resolved via resolveDefend() -- WORKING
  case 'item':          // Resolved via resolveItem() -- WORKING
  case 'flee':          // Resolved via resolveFlee() -- WORKING
  case 'racial_ability': // Resolved via resolveRacialAbility() -- WORKING (121 racial abilities)
  case 'psion_ability':  // Resolved via resolvePsionAbility() -- WORKING (18 psion abilities)
  default:              // Falls through to defend
}
```

### Key Finding: NO `class_ability` Action Type Exists

There is **no** `class_ability` action type. The `CombatActionType` union is:

```typescript
export type CombatActionType = 'attack' | 'cast' | 'defend' | 'item' | 'flee' | 'racial_ability' | 'psion_ability';
```

The 108 non-psion class abilities have **no dispatch path** in the combat engine. The engine has no function like `resolveClassAbility()` or `resolveWarriorAbility()`.

### How Psion Abilities ARE Integrated

Psion abilities have a dedicated `resolvePsionAbility()` function (~665 lines, cases `psi-tel-1` through `psi-nom-6`) that uses a giant switch statement on `abilityId` to resolve each of the 18 psion abilities individually:

```typescript
export function resolvePsionAbility(
  state: CombatState,
  actorId: string,
  abilityId: string,
  targetId?: string
): { state: CombatState; result: PsionAbilityResult } {
  // ... looks up abilityDef from psionAbilities data
  switch (abilityId) {
    case 'psi-tel-1': { /* Mind Spike */ }
    case 'psi-tel-2': { /* Thought Shield - passive */ }
    case 'psi-tel-3': { /* Psychic Crush */ }
    // ... 18 total cases, each with full mechanical resolution
  }
}
```

### What Would Be Needed for Non-Psion Abilities

To integrate the 108 non-psion abilities, the project would need:
1. A new `CombatActionType` value (e.g., `'class_ability'`)
2. A new result type (e.g., `ClassAbilityResult`)
3. A new resolver function (e.g., `resolveClassAbility()`) with 108 case branches
4. Updates to the `Combatant` interface for class ability state (cooldown tracking, uses-per-combat, etc.)
5. A new field on `CombatAction` (e.g., `classAbilityId`)
6. Updates to the tick-combat-resolver and combat simulator

---

## 3. Combat Types & Interfaces

### File: `shared/src/types/combat.ts`

### CombatActionType

```typescript
export type CombatActionType = 'attack' | 'cast' | 'defend' | 'item' | 'flee' | 'racial_ability' | 'psion_ability';
```

**No `class_ability` type exists.**

### CombatAction

```typescript
export interface CombatAction {
  type: CombatActionType;
  actorId: string;
  targetId?: string;
  resourceId?: string;
  spellSlotLevel?: number;
  racialAbilityName?: string;
  targetIds?: string[];
  psionAbilityId?: string;
}
```

**No `classAbilityId` field exists.** There is a `psionAbilityId` for psion abilities and `racialAbilityName` for racial abilities.

### Combatant Interface (ability-related fields)

```typescript
export interface Combatant {
  // ... standard fields ...
  race?: string;
  subRace?: { id: string; element?: string } | null;
  controlledBy?: string | null;       // Psion: Dominate/Absolute Dominion
  controlDuration?: number;            // Psion: rounds of mind control
  banishedUntilRound?: number | null;  // Psion: Banishment return round
  hasReaction?: boolean;               // Psion: Precognitive Dodge reaction
  reactionType?: string | null;        // Psion: type of reaction
  lastAction?: CombatAction | null;    // Psion: for Temporal Echo
  characterClass?: string | null;      // Used by Thought Shield passive check
  hasFled?: boolean;
}
```

All ability-related fields on `Combatant` are Psion-specific. There are:
- **No cooldown tracking fields** for class abilities
- **No uses-per-combat tracking** for class abilities
- **No active buff/debuff tracking** for class abilities (only status effects)

### TurnResult Union

```typescript
export type TurnResult = AttackResult | CastResult | DefendResult | ItemResult | FleeResult | RacialAbilityActionResult | PsionAbilityResult;
```

**No `ClassAbilityResult` type in the union.**

### PsionAbilityResult (the model for class ability results)

```typescript
export interface PsionAbilityResult {
  type: 'psion_ability';
  actorId: string;
  abilityName: string;
  abilityId: string;
  targetId?: string;
  targetIds?: string[];
  damage?: number;
  saveRequired: boolean;
  saveRoll?: number;
  saveTotal?: number;
  saveDC?: number;
  saveSucceeded?: boolean;
  statusApplied?: string;
  statusDuration?: number;
  controlled?: boolean;
  banished?: boolean;
  negatedAttack?: boolean;
  echoAction?: boolean;
  description: string;
  targetHpAfter?: number;
  targetKilled?: boolean;
}
```

### SpellInfo (the existing cast system)

```typescript
export interface SpellInfo {
  id: string;
  name: string;
  level: number;
  castingStat: 'int' | 'wis' | 'cha';
  type: 'damage' | 'heal' | 'status' | 'damage_status';
  diceCount: number;
  diceSides: number;
  modifier: number;
  statusEffect?: StatusEffectName;
  statusDuration?: number;
  requiresSave: boolean;
  saveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
}
```

### StatusEffectName (16 effects)

```typescript
export type StatusEffectName =
  | 'poisoned' | 'stunned' | 'blessed' | 'burning' | 'frozen'
  | 'paralyzed' | 'blinded' | 'shielded' | 'weakened' | 'hasted'
  | 'slowed' | 'regenerating' | 'dominated' | 'banished' | 'phased' | 'foresight';
```

Several class abilities reference status effects that ARE in this list (stunned, shielded, weakened, etc.), but many reference effects that are NOT (e.g., `polymorph`, `silence`, `mesmerize`, `skip_turn`, `root`, `taunt`).

---

## 4. Combat Preset System

### File: `server/src/services/combat-presets.ts`

### CombatPresets Interface

```typescript
export interface CombatPresets {
  stance: CombatStance;                    // AGGRESSIVE | BALANCED | DEFENSIVE | EVASIVE
  retreat: RetreatConditions;
  abilityQueue: AbilityQueueEntry[];       // Priority queue for ability usage
  itemUsageRules: ItemUsageRule[];
  pvpLootBehavior: PvPLootBehavior;
}
```

### AbilityQueueEntry

```typescript
export interface AbilityQueueEntry {
  abilityId: string;
  abilityName: string;
  priority: number;            // Lower = higher priority
  useWhen?: 'always' | 'low_hp' | 'high_hp' | 'first_round' | 'outnumbered';
  hpThreshold?: number;
}
```

### How the Decision Chain Works

The preset system supports queuing abilities via `abilityQueue`, and the `validateAbilityQueue` function checks both class abilities (via `CharacterAbility` DB records) and racial abilities (via `unlockedAbilities` JSON field).

```typescript
export async function validateAbilityQueue(characterId, queue) {
  // Gets class abilities from CharacterAbility table
  const unlockedAbilities = await prisma.characterAbility.findMany({ ... });
  // Gets racial abilities from Character.unlockedAbilities JSON
  const racialAbilities = ...;
  // Validates each queue entry exists in one of these sets
}
```

### Critical Finding: abilityQueue dispatches as `racial_ability`

In `tick-combat-resolver.ts`, the `decideAction` function dispatches ALL queued abilities as `racial_ability` actions:

```typescript
// tick-combat-resolver.ts, line ~138-151
if (shouldUse) {
  const target = enemies.length > 0 ? enemies[0] : null;
  return {
    action: {
      type: 'racial_ability',        // <-- ALL abilities dispatched as racial_ability
      actorId,
      racialAbilityName: entry.abilityName,
      targetId: target?.id,
      targetIds: enemies.map(e => e.id),
    },
    context: {},
  };
}
```

This means even if a player queues a class ability (e.g., "Fireball" from mage/elementalist), it would be dispatched as a `racial_ability` action, which would fail to resolve correctly in the combat engine since `resolveRacialAbility` only knows about racial abilities.

The `buildCombatParams` function in combat-presets.ts does load character abilities from the database:

```typescript
const availableAbilities = character.characterAbilities.map(ca => ({
  id: ca.ability.id,
  name: ca.ability.name,
  effects: ca.ability.effects,
}));
```

But these are never used for combat resolution -- they are loaded but not wired to any action dispatch.

---

## 5. Database Schema

### File: `database/prisma/schema.prisma`

### Character Model (ability-related fields)

```prisma
model Character {
  id                     String           @id @default(uuid())
  class                  String?
  specialization         String?
  level                  Int              @default(1)
  unlockedAbilities      Json             @default("[]") @map("unlocked_abilities")  // Racial abilities
  unspentSkillPoints     Int              @default(0) @map("unspent_skill_points")

  // Combat presets
  combatStance           CombatStance     @default(BALANCED) @map("combat_stance")
  abilityPriorityQueue   Json?            @map("ability_priority_queue")
  itemUsageRules         Json?            @map("item_usage_rules")

  characterAbilities     CharacterAbility[]
  // ... other relations ...
}
```

### Ability Model

```prisma
model Ability {
  id                    String   @id @default(uuid())
  name                  String   @unique
  description           String?
  class                 String
  specialization        String
  tier                  Int      @default(1)
  effects               Json     @default("{}")
  cooldown              Int      @default(0)
  prerequisiteAbilityId String?  @map("prerequisite_ability_id")
  levelRequired         Int      @default(1) @map("level_required")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  prerequisite       Ability?           @relation("AbilityPrereq", fields: [prerequisiteAbilityId], references: [id])
  dependents         Ability[]          @relation("AbilityPrereq")
  characterAbilities CharacterAbility[]

  @@index([class])
  @@index([class, specialization])
  @@map("abilities")
}
```

### CharacterAbility Junction Model

```prisma
model CharacterAbility {
  id          String   @id @default(uuid())
  characterId String   @map("character_id")
  abilityId   String   @map("ability_id")
  unlockedAt  DateTime @default(now()) @map("unlocked_at")
  createdAt   DateTime @default(now()) @map("created_at")

  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  ability   Ability   @relation(fields: [abilityId], references: [id], onDelete: Cascade)

  @@unique([characterId, abilityId])
  @@index([characterId])
  @@map("character_abilities")
}
```

### Key Finding

The database schema fully supports class abilities:
- `Ability` table stores all 126 abilities (seeded from `ALL_ABILITIES`)
- `CharacterAbility` is the many-to-many junction tracking which abilities a character has unlocked
- `Character.abilityPriorityQueue` stores the combat AI queue as JSON
- `Character.unspentSkillPoints` tracks available points for unlocking abilities

The schema is **complete and ready** for class ability integration. The gap is purely in combat engine resolution.

---

## 6. Seed Data

### File: `server/src/scripts/seed-abilities.ts`

```typescript
import { ALL_ABILITIES } from '@shared/data/skills';

async function main() {
  console.log(`Seeding ${ALL_ABILITIES.length} abilities...`);

  for (const ability of ALL_ABILITIES) {
    const existing = await prisma.ability.findFirst({
      where: { name: ability.name },
    });

    if (existing) { skipped++; continue; }

    // Resolve prerequisite DB id
    let prereqId: string | null = null;
    if (ability.prerequisiteAbilityId) {
      const prereqDef = ALL_ABILITIES.find((a) => a.id === ability.prerequisiteAbilityId);
      if (prereqDef) {
        const prereqDb = await prisma.ability.findFirst({ where: { name: prereqDef.name } });
        prereqId = prereqDb?.id ?? null;
      }
    }

    await prisma.ability.create({
      data: {
        id: ability.id,
        name: ability.name,
        description: ability.description,
        class: ability.class,
        specialization: ability.specialization,
        tier: ability.tier,
        effects: ability.effects as any,
        cooldown: ability.cooldown,
        prerequisiteAbilityId: prereqId,
        levelRequired: ability.levelRequired,
      },
    });
    created++;
  }
}
```

This seeds **all 126 abilities** (including non-psion) into the `abilities` table. The seed resolves prerequisite chains correctly by matching on name.

No other seed files reference abilities.

---

## 7. Class System

### How Classes Are Stored

- `Character.class` -- nullable string field (e.g., `"warrior"`, `"mage"`, `"psion"`)
- `Character.specialization` -- nullable string field (e.g., `"berserker"`, `"elementalist"`, `"telepath"`)
- `Character.unspentSkillPoints` -- integer, used to unlock abilities
- `Character.unlockedAbilities` -- JSON array for **racial** abilities (NOT class abilities)
- `CharacterAbility` -- junction table for **class** abilities

### How Classes Are Used

**Skills Route (`server/src/routes/skills.ts`):**
- `GET /api/skills/tree` -- Returns the skill tree for the character's class with unlock status
- `POST /api/skills/specialize` -- Sets the character's specialization
- `POST /api/skills/unlock` -- Unlocks a class ability (costs 1 skill point, checks level and prerequisites)

The skills route is fully functional: players can view their skill tree, specialize, and unlock abilities. Unlocked abilities are stored in the `CharacterAbility` table.

**Combat Engine (`server/src/lib/combat-engine.ts`):**
- `Combatant.characterClass` is only used in one place: the `applyPsychicDamage` helper checks if `target.characterClass === 'psion'` for Thought Shield passive resistance.
- No other class-based combat logic exists.

**Tick Combat Resolver (`server/src/services/tick-combat-resolver.ts`):**
- Does not differentiate between class abilities and racial abilities in the ability queue.
- All queued abilities are dispatched as `racial_ability` actions.

### Progression Path

The progression system grants skill points at level-up, and the skills route lets players spend them. However, unlocked class abilities have no effect in combat because:
1. The combat engine has no `class_ability` action type
2. The tick resolver dispatches all queued abilities as `racial_ability`
3. No ability cooldown tracking exists on the `Combatant` state

---

## 8. Abilities Detail -- Full Catalog

### Warrior (18 abilities)

#### Berserker (rage/damage)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `war-ber-1` | Reckless Strike | 1 | 10 | 0 | damage (+5 dmg, -2 self AC) |
| `war-ber-2` | Blood Rage | 2 | 14 | 8 | buff (attack scales with missing HP, 5 rounds) |
| `war-ber-3` | Cleave | 2 | 16 | 3 | aoe_damage (all adjacent, 0.8x multiplier) |
| `war-ber-4` | Frenzy | 3 | 22 | 4 | multi_attack (2 strikes, -3 accuracy) |
| `war-ber-5` | Berserker Rage | 4 | 30 | 12 | buff (CC immune, +15 atk, 3 rounds) |
| `war-ber-6` | Undying Fury | 5 | 40 | 0 | passive (cheat death 1x/combat) |

#### Guardian (tank/shield)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `war-gua-1` | Shield Bash | 1 | 10 | 3 | damage_status (3 dmg + stun 1 round) |
| `war-gua-2` | Fortify | 2 | 14 | 6 | buff (+5 AC, 4 rounds) |
| `war-gua-3` | Taunt | 2 | 16 | 4 | status (taunt 2 rounds) |
| `war-gua-4` | Shield Wall | 3 | 22 | 8 | buff (50% damage reduction, 2 rounds) |
| `war-gua-5` | Iron Bulwark | 4 | 30 | 10 | buff (30% damage reflect, immovable, 3 rounds) |
| `war-gua-6` | Unbreakable | 5 | 40 | 0 | passive (+20% CON as bonus HP) |

#### Warlord (buffs/leadership)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `war-war-1` | Rally Cry | 1 | 10 | 5 | buff (+3 atk, +2 AC, 4 rounds) |
| `war-war-2` | Commanding Strike | 2 | 14 | 3 | damage (+3 bonus damage) |
| `war-war-3` | Tactical Advance | 3 | 20 | 8 | buff (extra action) |
| `war-war-4` | Inspiring Presence | 3 | 22 | 0 | passive (3 HP regen/round) |
| `war-war-5` | Warlord's Decree | 4 | 30 | 10 | buff (3 guaranteed hits, 3 rounds) |
| `war-war-6` | Legendary Commander | 5 | 40 | 0 | heal (full restore, 1x/combat) |

### Mage (18 abilities)

#### Elementalist (fire/ice/lightning)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `mag-ele-1` | Fireball | 1 | 10 | 2 | aoe_damage (fire, 3d6) |
| `mag-ele-2` | Frost Lance | 2 | 14 | 2 | damage_status (ice, 2d8 + slow 2 rounds) |
| `mag-ele-3` | Chain Lightning | 2 | 16 | 3 | multi_target (lightning, 3 targets, 2d6) |
| `mag-ele-4` | Elemental Shield | 3 | 22 | 8 | buff (absorb 30 dmg, 4 rounds) |
| `mag-ele-5` | Meteor Strike | 4 | 30 | 10 | aoe_damage (fire, 6d8) |
| `mag-ele-6` | Arcane Mastery | 5 | 40 | 0 | passive (30% cooldown reduction) |

#### Necromancer (undead/drain)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `mag-nec-1` | Life Drain | 1 | 10 | 2 | drain (2d6, heal 50%) |
| `mag-nec-2` | Shadow Bolt | 2 | 14 | 1 | damage (shadow, 3d6) |
| `mag-nec-3` | Corpse Explosion | 2 | 16 | 4 | aoe_damage (requires corpse, 4d6) |
| `mag-nec-4` | Bone Armor | 3 | 22 | 7 | buff (absorb 25 + 3 AC, 5 rounds) |
| `mag-nec-5` | Soul Harvest | 4 | 30 | 10 | aoe_drain (3d8, 8 heal per target) |
| `mag-nec-6` | Lichdom | 5 | 40 | 0 | passive (revive at 50% HP once) |

#### Enchanter (buffs/debuffs)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `mag-enc-1` | Arcane Bolt | 1 | 10 | 0 | damage (auto-hit, 2d4) |
| `mag-enc-2` | Enfeeble | 2 | 14 | 4 | debuff (-4 atk, -3 AC, 3 rounds) |
| `mag-enc-3` | Haste | 2 | 16 | 6 | buff (extra action, 1 round) |
| `mag-enc-4` | Arcane Siphon | 3 | 22 | 5 | debuff (-4 atk, 3 rounds) |
| `mag-enc-5` | Polymorph | 4 | 30 | 10 | status (polymorph 2 rounds) |
| `mag-enc-6` | Spell Weaver | 5 | 40 | 0 | passive (cooldowns reduced by 1) |

### Rogue (18 abilities)

#### Assassin (stealth/crit)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `rog-ass-1` | Backstab | 1 | 10 | 2 | damage (+10 crit bonus, +5 dmg) |
| `rog-ass-2` | Vanish | 2 | 14 | 5 | buff (stealth + untargetable, 1 round) |
| `rog-ass-3` | Poison Blade | 2 | 16 | 6 | buff (3 poison charges, 4 dmg DoT, 3 rounds) |
| `rog-ass-4` | Ambush | 3 | 22 | 0 | damage (requires stealth, 3x multiplier) |
| `rog-ass-5` | Death Mark | 4 | 30 | 10 | delayed_damage (3 round delay, 8d6) |
| `rog-ass-6` | Shadow Mastery | 5 | 40 | 0 | passive (+15% crit chance) |

#### Thief (steal/lockpick)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `rog-thi-1` | Pilfer | 1 | 10 | 3 | steal (5-20 gold) |
| `rog-thi-2` | Smoke Bomb | 2 | 14 | 5 | aoe_debuff (-5 accuracy, 2 rounds) |
| `rog-thi-3` | Quick Fingers | 2 | 16 | 0 | passive (+10% gold drops) |
| `rog-thi-4` | Disengage | 3 | 22 | 6 | flee (90% success chance) |
| `rog-thi-5` | Mug | 4 | 30 | 8 | damage_steal (3d6 + steal item) |
| `rog-thi-6` | Treasure Sense | 5 | 40 | 0 | passive (+25% loot quality/quantity) |

#### Swashbuckler (dodge/dual-wield)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `rog-swa-1` | Riposte | 1 | 10 | 2 | counter (8 dmg on melee attack) |
| `rog-swa-2` | Dual Strike | 2 | 14 | 2 | multi_attack (2 strikes, 0.7x) |
| `rog-swa-3` | Evasion | 2 | 16 | 5 | buff (+30 dodge, 2 rounds) |
| `rog-swa-4` | Flurry of Blades | 3 | 22 | 6 | multi_attack (4 strikes, 0.4x) |
| `rog-swa-5` | Dance of Steel | 4 | 30 | 10 | buff (stacking attack speed, 5 max, 5 rounds) |
| `rog-swa-6` | Untouchable | 5 | 40 | 0 | passive (+10% dodge) |

### Cleric (18 abilities)

#### Healer (heal/cure)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `cle-hea-1` | Healing Light | 1 | 10 | 2 | heal (2d8 + 3) |
| `cle-hea-2` | Purify | 2 | 14 | 3 | cleanse (remove 1 debuff) |
| `cle-hea-3` | Regeneration | 2 | 16 | 5 | hot (5 HP/round, 5 rounds) |
| `cle-hea-4` | Divine Shield | 3 | 22 | 7 | buff (absorb 30, 4 rounds) |
| `cle-hea-5` | Resurrection | 4 | 30 | 0 | passive (revive at 25% HP, 1x/combat) |
| `cle-hea-6` | Miracle | 5 | 40 | 0 | heal (full restore, 1x/combat) |

#### Paladin (holy damage/armor)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `cle-pal-1` | Smite | 1 | 10 | 1 | damage (radiant, +6 bonus) |
| `cle-pal-2` | Holy Armor | 2 | 14 | 6 | buff (+4 AC, 5 rounds) |
| `cle-pal-3` | Consecrate | 2 | 16 | 5 | aoe_dot (radiant, 6 dmg/round, 3 rounds, 2x vs undead) |
| `cle-pal-4` | Judgment | 3 | 22 | 5 | drain (radiant, 3d8, 50% lifesteal) |
| `cle-pal-5` | Divine Wrath | 4 | 30 | 10 | aoe_damage (radiant, 5d8) |
| `cle-pal-6` | Avatar of Light | 5 | 40 | 0 | passive (+25% holy damage) |

#### Inquisitor (smite/purge)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `cle-inq-1` | Denounce | 1 | 10 | 3 | debuff (-4 attack, 3 rounds) |
| `cle-inq-2` | Penance | 2 | 14 | 2 | damage (2d6, +4 per debuff on target) |
| `cle-inq-3` | Silence | 2 | 16 | 5 | status (silence 2 rounds) |
| `cle-inq-4` | Purging Flame | 3 | 22 | 6 | dispel_damage (8 dmg per buff removed) |
| `cle-inq-5` | Excommunicate | 4 | 30 | 10 | debuff (-5 all stats, 3 rounds) |
| `cle-inq-6` | Inquisitor's Verdict | 5 | 40 | 0 | passive (anti-heal aura) |

### Ranger (18 abilities)

#### Beastmaster (pet/summon)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `ran-bea-1` | Call Companion | 1 | 10 | 6 | summon (5 dmg companion, 5 rounds) |
| `ran-bea-2` | Wild Bond | 2 | 14 | 4 | heal (2d6 self + companion) |
| `ran-bea-3` | Pack Tactics | 2 | 16 | 3 | buff (advantage 1 round) |
| `ran-bea-4` | Bestial Fury | 3 | 22 | 5 | companion_attack (4d8) |
| `ran-bea-5` | Alpha Predator | 4 | 30 | 12 | summon (12 dmg, 50 HP, 8 rounds) |
| `ran-bea-6` | Spirit Bond | 5 | 40 | 0 | passive (permanent immortal companion) |

#### Sharpshooter (ranged/crit)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `ran-sha-1` | Aimed Shot | 1 | 10 | 2 | damage (+6 dmg, +3 accuracy) |
| `ran-sha-2` | Multi-Shot | 2 | 14 | 3 | multi_target (3 targets, 1d8) |
| `ran-sha-3` | Piercing Arrow | 2 | 16 | 3 | damage (ignore armor, 2d8) |
| `ran-sha-4` | Headshot | 3 | 22 | 5 | damage (+20 crit, -5 accuracy, 4d8) |
| `ran-sha-5` | Rain of Arrows | 4 | 30 | 10 | aoe_damage (2 hits/target, 2d8) |
| `ran-sha-6` | Eagle's Eye | 5 | 40 | 0 | passive (+5 accuracy, +10% crit) |

#### Tracker (traps/detection)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `ran-tra-1` | Lay Trap | 1 | 10 | 3 | trap (10 dmg on attack) |
| `ran-tra-2` | Snare | 2 | 14 | 4 | status (root + -3 AC, 2 rounds) |
| `ran-tra-3` | Hunter's Mark | 2 | 16 | 5 | debuff (+4 bonus dmg from you, 5 rounds) |
| `ran-tra-4` | Explosive Trap | 3 | 22 | 6 | trap (25 AoE dmg on attack) |
| `ran-tra-5` | Predator Instinct | 4 | 30 | 0 | passive (advantage vs <50% HP) |
| `ran-tra-6` | Master Tracker | 5 | 40 | 0 | passive (first strike always crits) |

### Bard (18 abilities)

#### Diplomat (social/charm)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `bar-dip-1` | Charming Words | 1 | 10 | 3 | debuff (-3 attack, 3 rounds) |
| `bar-dip-2` | Silver Tongue | 2 | 14 | 5 | status (skip_turn, 1 round) |
| `bar-dip-3` | Soothing Presence | 2 | 16 | 0 | passive (3 HP regen/round) |
| `bar-dip-4` | Diplomat's Gambit | 3 | 22 | 8 | special (50% chance peaceful end) |
| `bar-dip-5` | Enthrall | 4 | 30 | 10 | status (mesmerize, 3 rounds) |
| `bar-dip-6` | Legendary Charisma | 5 | 40 | 0 | passive (+50% charm effectiveness) |

#### Battlechanter (combat buffs/songs)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `bar-bat-1` | War Song | 1 | 10 | 4 | buff (+4 attack, 4 rounds) |
| `bar-bat-2` | Discordant Note | 2 | 14 | 2 | damage (sonic, 2d8) |
| `bar-bat-3` | Marching Cadence | 2 | 16 | 5 | buff (+5 dodge, +3 initiative, 5 rounds) |
| `bar-bat-4` | Shatter | 3 | 22 | 5 | damage_debuff (sonic, 3d6, -4 AC, 3 rounds) |
| `bar-bat-5` | Crescendo | 4 | 30 | 0 | passive (+3 dmg per round, stacking) |
| `bar-bat-6` | Epic Finale | 5 | 40 | 12 | aoe_damage (sonic, 4d8 + 5 per round) |

#### Lorekeeper (knowledge/identify)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `bar-lor-1` | Analyze | 1 | 10 | 2 | buff (+8 next attack dmg, reveal weakness) |
| `bar-lor-2` | Recall Lore | 2 | 14 | 0 | passive (+15% XP from combat) |
| `bar-lor-3` | Exploit Weakness | 2 | 16 | 3 | damage (requires analyze, +15 crit, 3d6) |
| `bar-lor-4` | Arcane Insight | 3 | 22 | 6 | buff (halve next cooldown) |
| `bar-lor-5` | Tome of Secrets | 4 | 30 | 8 | special (random class ability) |
| `bar-lor-6` | Omniscient | 5 | 40 | 0 | passive (+25% global XP) |

### Psion (18 abilities) -- FULLY INTEGRATED

#### Telepath (psychic damage/control)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `psi-tel-1` | Mind Spike | 1 | 1 | 0 | damage_status (psychic, 2d6+INT, weakened) |
| `psi-tel-2` | Thought Shield | 2 | 5 | 0 | passive (psychic resistance, +2 mental saves) |
| `psi-tel-3` | Psychic Crush | 3 | 12 | 1 | damage_status (psychic, 3d8+INT, stunned) |
| `psi-tel-4` | Dominate | 4 | 18 | 1 | control (1 round domination or weakened) |
| `psi-tel-5` | Mind Shatter | 5 | 28 | 1 | aoe_damage_status (psychic, 3d6+INT, weakened) |
| `psi-tel-6` | Absolute Dominion | 6 | 40 | 1 | control (2 round domination or stun+2d10) |

#### Seer (precognition/buffs)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `psi-see-1` | Foresight | 1 | 1 | 0 | buff (+2 AC, +2 saves, 3 rounds) |
| `psi-see-2` | Danger Sense | 2 | 5 | 0 | passive (no surprise, +2 initiative) |
| `psi-see-3` | Precognitive Dodge | 3 | 12 | 1 | reaction (negate 1 attack per combat) |
| `psi-see-4` | Third Eye | 4 | 18 | 0 | passive (see invisible, immune blinded) |
| `psi-see-5` | Temporal Echo | 5 | 28 | 1 | echo (repeat last action free) |
| `psi-see-6` | Prescient Mastery | 6 | 40 | 1 | buff (foresight + blessed, 3 rounds) |

#### Nomad (teleportation/spatial)
| ID | Name | Tier | Level | Cooldown | Effect Type |
|----|------|------|-------|----------|-------------|
| `psi-nom-1` | Blink Strike | 1 | 1 | 0 | teleport_attack (+2 hit, +INT dmg) |
| `psi-nom-2` | Phase Step | 2 | 5 | 0 | passive (+3 AC vs opportunity, free disengage) |
| `psi-nom-3` | Dimensional Pocket | 3 | 12 | 1 | phase (untargetable 1 round) |
| `psi-nom-4` | Translocation | 4 | 18 | 1 | swap (enemy: stun; ally: +AC) |
| `psi-nom-5` | Rift Walk | 5 | 28 | 1 | aoe_damage_status (psychic, 2d8+INT, slowed) |
| `psi-nom-6` | Banishment | 6 | 40 | 1 | banish (3 rounds or 2d6+slow) |

### Notable Differences Between Psion and Non-Psion Abilities

| Aspect | Psion Abilities | Non-Psion Abilities |
|--------|----------------|---------------------|
| Level requirements | Start at level 1, caps at 40 | Start at level 10, cap at 40 |
| Tier range | 1-6 | 1-5 |
| Cooldowns | All 0 or 1 | Range from 0-12 |
| Effect types | Specialized (damage_status, control, phase, banish, echo, swap, teleport_attack) | Generic (damage, buff, debuff, heal, passive, etc.) |
| Scaling | INT modifier as damage bonus, save DCs | No stat scaling defined in effects |
| Save mechanics | Explicit `saveType` and `savePenalty` fields | No save mechanics in effect data |

---

## 9. Combat Simulator

### File: `server/src/scripts/combat-sim-runner.ts`

### How the Sim Handles Abilities

The `simDecideAction` function replicates the tick-combat-resolver's `decideAction` logic. Its priority chain:

1. Check retreat conditions -- flee
2. Check ability priority queue -- dispatch as `racial_ability`
3. Check item usage rules -- use item
4. Spellcasting -- highest available spell slot
5. Default -- melee attack on weakest enemy

```typescript
// combat-sim-runner.ts, line ~228-243
if (shouldUse) {
  const target = enemies.length > 0 ? enemies[0] : null;
  return {
    action: {
      type: 'racial_ability',         // <-- Same issue: dispatched as racial_ability
      actorId,
      racialAbilityName: entry.abilityName,
      targetId: target?.id,
      targetIds: enemies.map(e => e.id),
    },
    context: {},
    reason: `ability: ${entry.abilityName} (${condDesc})`,
  };
}
```

### Scenarios and Class Abilities

The combat simulator defines 6 preset scenarios in `combat-sim-scenarios.ts`. None use class abilities:

| Scenario | Combatants | Tests |
|----------|------------|-------|
| `basic-melee` | L5 Human Warrior vs L5 Orc Warrior | Pure attack/damage |
| `spell-vs-melee` | L7 Elf Mage vs L7 Human Warrior | SpellInfo-based casting |
| `status-effects` | L6 Nethkin Warlock vs L6 Dwarf Cleric | DoT/HoT via SpellInfo |
| `flee-test` | L3 Halfling Rogue vs L8 Young Dragon | Flee mechanics |
| `racial-abilities` | L10 Half-Orc vs L10 Drakonid | Racial abilities only |
| `team-fight` | 3v3 | Multi-target, mixed roles |

The `racial-abilities` scenario uses `abilityQueue` entries for racial abilities (Savage Attacks, Breath Weapon), not class abilities. The `spell-vs-melee` and other scenarios use the `SpellInfo` system (the `cast` action type), which is a parallel spell system separate from class abilities.

### CombatantDef Type

```typescript
export interface CombatantDef {
  id: string;
  name: string;
  entityType: 'character' | 'monster';
  // ...
  characterClass?: string;         // Present but unused by sim
  abilityQueue?: AbilityQueueEntry[];  // Would dispatch as racial_ability
  // ...
}
```

The `characterClass` field exists on `CombatantDef` but is never used by the sim's decision logic.

---

## 10. Summary of Findings

### What IS Working

| System | Status | Details |
|--------|--------|---------|
| Ability data definitions | COMPLETE | 126 abilities across 7 classes, 21 specializations, fully typed |
| Database schema | COMPLETE | `Ability`, `CharacterAbility` models, indexes, prerequisite chain |
| Seed script | COMPLETE | Seeds all 126 abilities into DB with prerequisite resolution |
| Skill tree API | COMPLETE | View tree, specialize, unlock abilities (costs skill points) |
| Combat preset system | COMPLETE | `abilityQueue` with conditional triggers, validation |
| Psion combat abilities | COMPLETE | 18 abilities fully integrated with individual resolution |
| Psion non-combat perks | COMPLETE | 12 cross-system perks (Telepath, Seer, Nomad) |

### What IS NOT Working

| System | Status | Details |
|--------|--------|---------|
| Non-psion combat resolution | NOT IMPLEMENTED | No `class_ability` action type, no resolver function |
| Ability cooldown tracking | NOT IMPLEMENTED | No per-combat cooldown state on Combatant |
| Uses-per-combat tracking | NOT IMPLEMENTED | Abilities like "Undying Fury (1x/combat)" have no counter |
| Ability queue dispatch | BROKEN | All queued abilities dispatched as `racial_ability` -- wrong action type |
| Missing status effects | NOT IMPLEMENTED | `polymorph`, `silence`, `mesmerize`, `skip_turn`, `root`, `taunt` not in StatusEffectName |
| Multi-attack resolution | NOT IMPLEMENTED | `multi_attack` effect type has no engine support |
| AoE targeting | NOT IMPLEMENTED | `aoe_damage` for class abilities has no engine support |
| Companion/summon system | NOT IMPLEMENTED | Beastmaster `summon`/`companion_attack` has no engine support |
| Trap system | NOT IMPLEMENTED | Tracker `trap` effect type has no engine support |
| Counter/riposte system | NOT IMPLEMENTED | Swashbuckler `counter` effect type has no engine support |
| Steal/loot effects | NOT IMPLEMENTED | Thief `steal`/`damage_steal` has no engine support |
| Delayed damage | NOT IMPLEMENTED | Assassin `delayed_damage` has no engine support |
| Damage absorption | NOT IMPLEMENTED | `absorbDamage` buff has no engine support |

### Exact Ability Count

- **Total abilities defined:** 126
- **Psion abilities (fully integrated):** 18
- **Non-psion abilities (data only, not in combat):** 108
  - Warrior: 18
  - Mage: 18
  - Rogue: 18
  - Cleric: 18
  - Ranger: 18
  - Bard: 18

### Unique Effect Types Used by Non-Psion Abilities

These effect types appear in the 108 non-psion ability definitions but have no combat engine handling:

1. `damage` -- bonus damage attacks (simple, closest to existing attack system)
2. `buff` -- AC/attack/dodge/damage buffs with duration
3. `debuff` -- attack/AC/stat reductions with duration
4. `heal` -- direct healing and full restore
5. `passive` -- always-on effects (crit bonus, regen, death prevention, etc.)
6. `aoe_damage` -- area damage to multiple targets
7. `multi_attack` -- multiple strikes in one turn
8. `multi_target` -- single ability hitting multiple targets
9. `damage_status` -- damage + status effect application
10. `status` -- pure status effect (stun, taunt, polymorph, silence, etc.)
11. `drain` -- damage that heals the caster
12. `aoe_drain` -- AoE drain with per-target healing
13. `hot` -- heal over time
14. `aoe_dot` -- AoE damage over time
15. `counter` -- reactive damage on incoming attack
16. `trap` -- placed effect that triggers on condition
17. `summon` -- companion creation with damage/HP stats
18. `companion_attack` -- command companion to attack
19. `steal` -- gold theft during combat
20. `damage_steal` -- damage + item theft
21. `flee` -- enhanced flee attempt
22. `delayed_damage` -- deferred damage after N rounds
23. `cleanse` -- remove negative status effects
24. `dispel_damage` -- remove enemy buffs and deal damage
25. `special` -- unique mechanics (peaceful combat end, random class ability)
26. `damage_debuff` -- combined damage and stat reduction
27. `aoe_debuff` -- AoE accuracy/stat reduction

### Architecture Decision for Integration

The Psion integration took ~665 lines of hand-coded switch cases in `resolvePsionAbility()`. Repeating this pattern for 108 abilities would require an estimated 3,000-4,000 lines. A more scalable approach would be a data-driven ability resolver that reads the `effects` JSON and applies generic handlers for each effect type (damage, buff, debuff, heal, status, etc.), similar to how the SpellInfo/resolveCast system works but expanded.

### Risk Assessment

| Risk | Severity | Note |
|------|----------|------|
| Players unlock abilities that do nothing | HIGH | Skill points are spent, abilities show as unlocked, but have zero combat effect |
| Ability queue silently fails | MEDIUM | Queued class abilities dispatched as racial_ability, engine finds no matching racial ability, resolves as "Unknown ability" or falls through to defend |
| Missing status effects crash engine | LOW | `StatusEffectName` is typed; if new effects are added, TypeScript compilation would catch mismatches before deployment |
| Psion advantage over other classes | HIGH | Psion is the only class with functional combat abilities, giving it a significant mechanical advantage in PvP and PvE |
