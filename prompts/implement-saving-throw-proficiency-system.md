# Implement: D&D-Style Saving Throw Proficiency System

## Bootstrap
```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/balance-designer.md
cat .claude/agents/database.md
```

## Objective

Currently every character adds their full proficiency bonus to ALL 6 saving throws. This breaks bounded accuracy — at level 40+ (proficiency +8), characters have +8 to every save, making CC and debuff abilities near-useless. D&D only gives proficiency on 2 of 6 saves per class.

Implement D&D-style saving throw proficiencies:
- Each class starts proficient in 2 saves (data ALREADY EXISTS in `shared/src/data/combat-constants.ts` as `CLASS_SAVE_PROFICIENCIES`)
- Characters gain additional save proficiencies at milestone levels 18, 30, 45 (player choice)
- Non-proficient saves use ONLY stat modifier (no proficiency bonus)
- Monsters always add proficiency to all saves (unchanged behavior — monsters don't have class save restrictions)

## Files to Read Before Starting

1. `shared/src/data/combat-constants.ts` — `CLASS_SAVE_PROFICIENCIES` already defined (UNUSED)
2. `shared/src/types/combat.ts` — `Combatant` interface (needs new field)
3. `server/src/lib/class-ability-resolver.ts` — 6 locations computing save modifiers (lines ~580, ~1008, ~1116, ~1227, ~1386, ~1931)
4. `server/src/lib/combat-engine.ts` — 4 locations computing save modifiers (lines ~1411, ~1754, ~1815, ~1865)
5. `server/src/lib/monster-ability-resolver.ts` — 1 location computing save modifier (line ~48)
6. `server/src/services/tick-combat-resolver.ts` — Where player combatants are built (needs to populate save proficiencies)
7. `server/src/lib/road-encounter.ts` — Where player combatants are built (needs to populate save proficiencies)
8. `server/src/services/ability-grants.ts` — Level-up grant system (for milestone save unlocks)
9. `shared/src/utils/bounded-accuracy.ts` — `getProficiencyBonus()` reference
10. `database/prisma/schema.prisma` — Character model (needs new field)

## Design

### Change 1: Add `saveProficiencies` to Combatant interface

**File:** `shared/src/types/combat.ts`

Add to the `Combatant` interface:
```typescript
/** Saving throw proficiencies — stat keys this combatant adds proficiency bonus to on saves */
saveProficiencies?: string[];
```

### Change 2: Create a shared save modifier helper

**File:** `shared/src/utils/bounded-accuracy.ts`

Add a new exported function:
```typescript
import { getModifier } from '../types/combat';

/**
 * Calculate a combatant's saving throw modifier for a given save type.
 * Proficient saves: stat modifier + proficiency bonus
 * Non-proficient saves: stat modifier only
 * Monsters (no saveProficiencies set): always add proficiency (legacy behavior)
 */
export function getSaveModifier(
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  saveType: string,
  proficiencyBonus: number,
  saveProficiencies?: string[],
): number {
  const statMod = getModifier(stats[saveType as keyof typeof stats] ?? 10);
  // If no proficiency list provided (monsters), add proficiency to all saves
  if (!saveProficiencies) return statMod + proficiencyBonus;
  // Characters: only add proficiency if proficient in this save
  const isProficient = saveProficiencies.includes(saveType);
  return statMod + (isProficient ? proficiencyBonus : 0);
}
```

### Change 3: Replace ALL inline save modifier calculations

There are **11 locations** across 3 files that compute save modifiers with the pattern:
```typescript
let targetSaveMod = getModifier(target.stats[saveType]) + target.proficiencyBonus;
```

Replace every one of them with:
```typescript
let targetSaveMod = getSaveModifier(target.stats, saveType, target.proficiencyBonus, target.saveProficiencies);
```

**All 11 locations to find and replace:**

**`server/src/lib/class-ability-resolver.ts`** (6 locations):
Search for every instance of the pattern `getModifier(target.stats[` or `getModifier(enemy.stats[` followed by `+ target.proficiencyBonus` or `+ enemy.proficiencyBonus`. There are 5 inline ones in AoE/multi-target handlers plus 1 in `resolveAbilitySave`. Import `getSaveModifier` from `@shared/utils/bounded-accuracy`.

In `resolveAbilitySave` (~line 1931), change:
```typescript
// BEFORE
let targetSaveMod = getModifier(target.stats[saveType as keyof typeof target.stats] ?? 10) + target.proficiencyBonus;

// AFTER
let targetSaveMod = getSaveModifier(target.stats, saveType, target.proficiencyBonus, target.saveProficiencies);
```

Apply the same pattern change to all 5 other inline save calculations in this file.

**`server/src/lib/combat-engine.ts`** (4 locations):
- Spell save resolution (~line 1411): `getModifier(target.stats[spell.saveType]) + target.proficiencyBonus` → use helper
- Psion INT save (~line 1754): `getModifier(target.stats.int) + target.proficiencyBonus` → use helper with saveType `'int'`
- Psion WIS save (~line 1815): `getModifier(target.stats.wis) + target.proficiencyBonus` → use helper with saveType `'wis'`
- Psion WIS save with penalty (~line 1865): `getModifier(target.stats.wis) + target.proficiencyBonus - 2` → use helper, then subtract 2 afterward

Import `getSaveModifier` from `@shared/utils/bounded-accuracy`.

**`server/src/lib/monster-ability-resolver.ts`** (1 location):
- ~line 48: `getModifier(target.stats[saveType]) + target.proficiencyBonus` → use helper

Import `getSaveModifier` from `@shared/utils/bounded-accuracy`.

### Change 4: Populate `saveProficiencies` when building Combatants

When player combatants are created in combat resolution, set `saveProficiencies` from the character's class + any unlocked additional saves from DB.

**`server/src/services/tick-combat-resolver.ts`** — Every location where `createCharacterCombatant()` is called or where player combatant objects are built, add:
```typescript
import { CLASS_SAVE_PROFICIENCIES } from '@shared/data/combat-constants';

// When building combatant:
saveProficiencies: [
  ...(CLASS_SAVE_PROFICIENCIES[character.class.toLowerCase()] ?? []),
  ...((character.bonusSaveProficiencies as string[]) ?? []),
],
```

**`server/src/lib/road-encounter.ts`** — Same pattern in all locations where player combatants are constructed.

**For monster combatants:** Do NOT set `saveProficiencies` (leave undefined). The helper function treats undefined as "proficient in all" which preserves existing monster behavior.

### Change 5: Database — Add `bonusSaveProficiencies` field to Character model

**File:** `database/prisma/schema.prisma`

Add to the Character model:
```prisma
bonusSaveProficiencies Json @default("[]") // Array of additional save proficiency stat keys unlocked at milestone levels
```

Create a migration. Default `[]` means all existing characters have only their class saves.

### Change 6: Milestone save proficiency unlocks at levels 18, 30, 45

This follows the existing tier 0 choice pattern. At each milestone level, the player picks one of the 4 saves they're NOT yet proficient in.

**`server/src/services/ability-grants.ts`** — Add save proficiency choice handling:
- On level-up to 18, 30, or 45: flag that the character has an available save proficiency choice
- The character's existing `unspentStatPoints` or similar "pending choice" field can track this, OR add a new field `pendingSaveChoice Boolean @default(false)` to the Character model

**New API endpoint** (add to an appropriate route file, e.g., `server/src/routes/characters.ts`):
```
POST /api/characters/choose-save-proficiency
Body: { saveType: "str" | "dex" | "con" | "int" | "wis" | "cha" }
```

Validation:
- Character must have a pending save choice (level 18/30/45 reached, not yet chosen)
- `saveType` must NOT already be in their save proficiencies
- Update `bonusSaveProficiencies` JSON array to include the new save
- Clear the pending choice flag

**SIMPLIFICATION:** If the choice UI is too much scope for now, you may instead auto-grant the 3rd/4th/5th saves in a deterministic order based on class. For example, Warrior (STR, CON proficient) auto-gains: WIS at 18, DEX at 30, CHA at 45. This removes the player choice but still fills dead zones. Flag this decision for the user at the end of the prompt.

### Change 7: Update the progression viewer audit doc

**File:** `docs/character-progression-table.md`

- Add Section 8 or update Section 2 milestones to include save proficiency grants at 18, 30, 45
- Add a save proficiency table per class showing which saves are proficient at each milestone

## Verification

After implementation:
1. Build passes (shared, server, client)
2. `getSaveModifier({str:10,dex:14,con:10,int:10,wis:10,cha:10}, 'dex', 4, ['str','con'])` should return 2 (DEX mod only, no proficiency since DEX isn't proficient)
3. `getSaveModifier({str:10,dex:14,con:10,int:10,wis:10,cha:10}, 'str', 4, ['str','con'])` should return 4 (STR mod 0 + proficiency 4)
4. `getSaveModifier({str:10,dex:14,con:10,int:10,wis:10,cha:10}, 'dex', 4, undefined)` should return 6 (monster behavior: always add proficiency)
5. Confirm no instance of `+ target.proficiencyBonus` or `+ enemy.proficiencyBonus` remains in save modifier calculations (use grep)
6. Confirm monster combatants do NOT have `saveProficiencies` set

## Blast Radius Warning

This is a MAJOR combat balance change. Every non-proficient save drops by the character's full proficiency bonus (up to -8 at high levels). Status effects, CC, and debuffs will land DRAMATICALLY more often against non-proficient saves. This is intentional and correct (matching D&D design), but will require a combat sim re-run to verify balance.

## Rules

- Do NOT change how save DCs are calculated (those use the ATTACKER's stats, not the defender's)
- Do NOT change monster save behavior (monsters always get full proficiency on all saves)
- Do NOT modify `getProficiencyBonus()` — the bonus scaling stays the same
- All 11 inline save calculations MUST be replaced with the helper — no partial fixes
- Git commit, push, deploy to Azure with unique image tag. Run migration.
