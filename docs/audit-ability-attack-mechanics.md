# Ability Attack Resolution System — Audit & Fix

**Date:** 2026-03-04
**Status:** Implemented, awaiting verification sims + deploy

---

## Problem Statement

Class abilities used the weapon's `attackModifierStat` for all attack rolls. A Psion with INT 20 / STR 8 would miss Psychic Jab because the equipped staff uses STR for attacks. Same issue for Bard sonic abilities (should use CHA) and Mage spells (should use INT). Additionally, most damage handlers auto-hit when many abilities should require attack rolls or saving throws per D&D convention.

## Solution

### New Fields on AbilityDefinition

```typescript
attackType?: 'weapon' | 'spell' | 'save' | 'auto';
damageType?: string; // e.g., 'FIRE', 'PSYCHIC', 'RADIANT'
```

### attackType Classification

| attackType | Resolution | Stat Used | When |
|-----------|------------|-----------|------|
| `weapon` | d20 + weapon stat + prof + weapon bonus vs AC | Weapon's `attackModifierStat` (STR/DEX) | Physical melee/ranged attacks |
| `spell` | d20 + class primary stat + prof vs AC | CLASS_PRIMARY_STAT (INT/WIS/CHA) | Magical ranged attacks |
| `save` | Auto-hit, target saves (DC = 8 + prof + primary stat mod) | N/A (target rolls) | AoE spells, debuffs |
| `auto` | No roll needed | N/A | Self-buffs, heals, passives, auto-hit abilities |

### CLASS_PRIMARY_STAT Map
```
warrior: STR, rogue: DEX, ranger: DEX, mage: INT, psion: INT, cleric: WIS, bard: CHA
```

## Changes Made

### Shared Types
- `shared/src/data/skills/types.ts`: Added `attackType` and `damageType` fields to AbilityDefinition

### Utility Functions (class-ability-resolver.ts)
- **Renamed** `CLASS_SAVE_DC_STAT` → `CLASS_PRIMARY_STAT` (same map, broader usage)
- **Added** `resolveAbilityAttackRoll()` — shared attack roll utility for weapon/spell attacks
- **Added** `resolveAbilitySave()` — shared saving throw utility for save-based abilities

### Handler Modifications (9 handlers)

| Handler | Change |
|---------|--------|
| `handleDamage` | Replaced inline d20 with utility; spell attacks use class primary stat for damage; added save path |
| `handleDamageStatus` | Added attack roll check (miss = no damage/status); added save path |
| `handleDamageDebuff` | Added attack/save check; on save: half damage, no debuff |
| `handleDebuff` | Added save check; on save: debuff not applied |
| `handleAoeDamage` | Added per-target save for save-based AoE; half damage on save |
| `handleDrain` | Added spell attack roll; miss = no drain |
| `handleMultiTarget` | Added per-target attack roll; miss = skip that target |
| `handleTeleportAttack` | Replaced inline d20 with `resolveAbilityAttackRoll()`; uses spell attack (INT) |
| `handleAoeDrain` | Added per-target save; half damage on save |

### Handlers Left Unchanged
- `handleMultiAttack` — already calls `resolveAttack()`, all abilities are weapon attacks
- `handleAoeDamageStatus` — already uses saves correctly
- `handleDispelDamage` — auto-hit by design (purge + damage per buff)
- `handleCompanionAttack` — companion attacks, auto-hit appropriate
- `handleDelayedDamage` — delayed bomb, auto-hit appropriate
- `handleDamageSteal` — low priority, could add weapon attack later
- `handleAoeDot` — status application, auto-hit fine
- `handleBuff/handleHeal/handleHot/handleCleanse/etc.` — self/ally effects
- `handleStatus` — already has save support via `saveType` field

### Ability Tagging (180 abilities tagged)
- 7 skill data files modified (warrior, mage, rogue, cleric, ranger, bard, psion tier 0)
- 18 psion spec abilities excluded (handled by separate `resolvePsionAbility()` system)
- 34 damageType additions
- 35 saveType values added to effects where needed

## Impact Summary

| Before | After |
|--------|-------|
| Psion Psychic Jab uses STR (weapon stat) | Uses INT (class primary stat) via spell attack |
| Bard Cutting Words uses weapon stat | Uses CHA via spell attack |
| Mage Fireball auto-hits all targets | DEX save, half damage on success |
| Cleric Denounce auto-applies debuff | WIS save, resisted on success |
| Most damage abilities auto-hit | Appropriate attack roll or save based on ability design |

## Verification Plan

1. All 3 TS builds pass (shared, server, client)
2. Psion L20 Kineticist vs Mind Flayer — verify INT-based spell attacks
3. Mage L20 Elementalist vs Mind Flayer — verify save-based Fireball, spell-attack Frost Lance
4. Bard L20 Minstrel vs Mind Flayer — verify CHA-based spell attacks, WIS-save debuffs

## Monster Ability Resolver Status

**Audit completed:** 2026-03-04 (read-only)

### Findings

The monster ability resolver (`server/src/lib/monster-ability-resolver.ts`) does **NOT** have the same weapon-stat fallback bug. Monster abilities are cleanly designed:

- **Monster attack rolls** use the monster's own stat block (STR, DEX, etc.) directly — not a weapon's `attackModifierStat`
- **Monster spell-like abilities** use the monster's relevant casting stat (typically INT or CHA depending on the monster type)
- **Monster save DCs** are calculated from the monster's own proficiency + stat modifier, independent of any weapon
- **No shared code path** with the player `class-ability-resolver.ts` — monster abilities resolve through a separate system

### Monster Save Stat Sanity Check

| Monster | WIS | DEX | CON | Notes |
|---------|-----|-----|-----|-------|
| Dire Wolf | Low | Moderate | Moderate | Beast — appropriately low WIS saves |
| Mind Flayer | High | Moderate | Moderate | Psychic aberration — appropriately high WIS |
| Basilisk King | Moderate | 10 | High | DEX 10 is unusual for a boss but mechanically valid (slow, tanky) |

**Verdict:** Monster save stats are sane. Basilisk King's low DEX is a design choice (petrifying gaze boss = slow but deadly), not a bug.

### Recommendation

No changes needed to the monster ability system. The weapon-stat fallback problem was isolated to the player class ability resolver.
