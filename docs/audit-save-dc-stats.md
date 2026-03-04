# Save DC Stat Audit

## Date: 2026-03-04

## Bug

`calculateSaveDC()` in `class-ability-resolver.ts:1395` defaulted to `'int'` for ALL classes:

```typescript
// BEFORE (broken)
const castingStat = saveStatOverride ?? 'int';
```

This meant a Warrior's Shield Bash stun DC, a Bard's charm DC, etc. all used INT modifier instead of the class's primary stat.

## Root Cause

Two issues:

1. **`calculateSaveDC` defaulted to INT** — no class-aware lookup existed
2. **`characterClass` was never set on player combatants** in production combat paths (road-encounter.ts and tick-combat-resolver.ts). The field exists on the `Combatant` type but was only populated in the combat simulator.

## Fix

### 1. Class-aware save DC (`class-ability-resolver.ts`)

```typescript
const CLASS_SAVE_DC_STAT: Record<string, string> = {
  warrior: 'str', rogue: 'dex', ranger: 'dex',
  mage: 'int', psion: 'int', cleric: 'wis', bard: 'cha',
};

function calculateSaveDC(actor: Combatant, saveStatOverride?: string): number {
  const castingStat = saveStatOverride
    ?? (actor.characterClass ? CLASS_SAVE_DC_STAT[actor.characterClass.toLowerCase()] : undefined)
    ?? 'int'; // fallback for monsters/unknown
  const statMod = getModifier(actor.stats[castingStat as keyof typeof actor.stats] ?? 10);
  return 8 + actor.proficiencyBonus + statMod;
}
```

Priority: `saveStatOverride` (ability-defined) > class primary stat > `'int'` fallback.

### 2. `characterClass` populated in 7 production sites

| File | Location | Combat Type |
|------|----------|-------------|
| `road-encounter.ts:513` | Solo PvE player | Road encounter |
| `road-encounter.ts:911` | Group PvE members | Group road encounter |
| `tick-combat-resolver.ts:896` | Solo PvE player | Tick combat |
| `tick-combat-resolver.ts:1054` | PvP traveler | PvP |
| `tick-combat-resolver.ts:1066` | PvP ambusher | PvP |
| `tick-combat-resolver.ts:1219` | Group PvP allies | Group PvP |
| `tick-combat-resolver.ts:1255` | Group PvP enemies | Group PvP |

## Scope of Impact

### Handlers that call `calculateSaveDC`:
- `handleStatus` (line 469) — only when ability has `saveType` defined
- `handleControl` (line 1513)
- `handleAoeDamageStatus` (line 1608)
- `handleSwap` (line 1742)
- `handleBanish` (line 1845)

### Current abilities using these handlers:
- **Mage Polymorph** (`mag-enc-5`, L32) — `saveType: 'wis'`, goes through `handleStatus`. Mage uses INT, same as old default, so no observable change.
- **No other non-psion class abilities** currently define `saveType` or use control/aoe_save/swap/banish effect types.

### Psion save DCs are separate:
Psion abilities routed through `resolvePsionAbility()` in `combat-engine.ts` compute save DC at line 1791 with hardcoded `intMod`. This is correct (psion = INT class) and is NOT affected by this fix.

## Verification

- Pre-flight TS checks pass (shared, server, client)
- The fix is **structurally correct** by code inspection: lookup table + fallback chain
- No existing non-INT-class ability exercises the save path, so the fix has no observable behavior change with current ability data
- When future abilities add `saveType` to Warrior/Bard/Cleric/Rogue/Ranger abilities, they will correctly use STR/CHA/WIS/DEX/DEX respectively

## Files Modified

- `server/src/lib/class-ability-resolver.ts` — `CLASS_SAVE_DC_STAT` map + `calculateSaveDC` fix
- `server/src/lib/road-encounter.ts` — `characterClass` in 2 locations
- `server/src/services/tick-combat-resolver.ts` — `characterClass` in 5 locations
