# Audit Fixes Applied

**Date:** 2026-03-09
**Source:** `reviews/full-system-audit-review.md` — 10 pipeline audits, 10 issues found

---

## Critical Fixes

### Fix 1: Starter Armor Field Name Mismatch
**File:** `shared/src/data/starter-weapons.ts`
**Change:** `stats: { ac: 2 }` → `stats: { armor: 2 }` in `STARTER_ARMOR` and `StarterArmorDef` interface
**Impact:** Every new character's Rustic Leather Vest now contributes +2 AC as intended (was silently contributing 0)

### Fix 2: Starter Armor Template onConflictDoUpdate
**File:** `server/src/lib/starting-weapons.ts`
**Change:** Added `stats` and `updatedAt` to both `onConflictDoUpdate` set clauses (weapon templates + armor template)
**Impact:** Re-seeding now corrects existing DB item templates. Previous deploys only updated `baseValue`.

---

## Medium Fixes

### Fix 3: Monster STR Modifier Double-Count
**Files:** `server/src/lib/combat-engine.ts` — `resolveAttack()` and `calculateDamage()`
**Change:** Skip stat modifier for monsters (`entityType === 'monster'` → statMod = 0). Monster attack/damage bonuses are already baked into `stats.attack` and damage dice bonus.
**Impact:** ⚠️ **MONSTER COMBAT EFFECTIVENESS CHANGED.** Monsters with high STR (14-24) will hit less often and deal less damage. This is the CORRECT behavior — the prior inflated values were a bug. Sim re-run recommended to verify balance.
- Example: Troll (STR 18, mod +4) — attack rolls drop by 4, damage drops by 4 per hit
- Example: Goblin (STR 8, mod -1) — attack rolls INCREASE by 1 (was being penalized by negative mod)

### Fix 4: Lucky Feat — Wire `luckyReroll`
**Files:** `server/src/lib/combat-engine.ts`, `shared/src/types/combat.ts`
**Change:** After attack roll, if miss (not fumble) + Lucky feat + not yet used → reroll d20 and take better result. Tracked via `luckyRerollUsed` on Combatant (once per combat).
**Impact:** Lucky feat now provides combat benefit. Players with Lucky will convert ~25% of misses into hits (once per combat).

### Fix 5: Resilient Feat — Wire `bonusSaveProficiency`
**Files:** `server/src/lib/road-encounter.ts`, `server/src/services/tick-combat-resolver.ts`
**Change:** When building `saveProficiencies` array on combatant, check for `bonusSaveProficiency` feat and add `'con'` save proficiency.
**Note:** CON save proficiency is hardcoded (the D&D standard for Resilient). The feat data model (`bonusSaveProficiency: boolean`) doesn't specify which save — a future enhancement could change it to a string.
**Impact:** Resilient feat now grants CON save proficiency in combat.
**Scope:** Applied to all 7 combatant construction paths: solo road encounter, group road encounter, tick-combat-resolver (solo, traveler, ambusher, group×2).

---

## Minor Fixes

### Fix 6: `parseDamageString` — Support Negative Bonuses
**File:** `server/src/lib/road-encounter.ts`
**Change:** Regex `/^(\d+)d(\d+)(?:\+(\d+))?$/` → `/^(\d+)d(\d+)(?:([+-]\d+))?$/`
**Impact:** `"1d6-1"` now correctly parses to `{ diceCount: 1, diceSides: 6, bonus: -1 }` instead of falling back to 1d6+0.

### Fix 7: Missing Encounter Template Monsters — Warning Log
**File:** `server/src/lib/road-encounter.ts`
**Change:** Added `logger.warn()` when a template references a non-existent monster name.
**Impact:** Missing monster references now produce a visible log instead of being silently skipped.

### Fix 8: `restrained` Status Effect — Comment
**File:** `shared/src/data/combat/status-effect-defs.ts`
**Change:** Added `// Reserved — no abilities currently apply this effect` comment before the `restrained` definition.
**Impact:** Documentation only. The status definition is preserved for future content.

### Fix 9: `hastened` Status Effect — Wire Attack/AC Bonus
**File:** `server/src/lib/class-ability-resolver.ts`
**Change:** In `handleBuff`, when `extraAction: true` is set, also apply `'hasted'` status effect for the buff's duration.
**Impact:** Abilities granting extra actions now also provide +2 ATK and +2 AC from the `hasted` status mechanics. This is a buff to Haste-type abilities.

### Fix 10: Add Modifier Stats to Crafted Weapon Recipes
**Files:** `shared/src/data/recipes/weapons.ts`, `shared/src/data/recipes/ranged-weapons.ts`, `shared/src/data/recipes/types.ts`
**Change:** Added `damageModifierStat: 'str', attackModifierStat: 'str'` to all 39 melee weapon recipes. Added `damageModifierStat: 'dex', attackModifierStat: 'dex'` to all 10 ranged weapon recipes. Added fields to `WeaponStats` interface.
**Impact:** Removes dependency on `applyClassWeaponStat()` override. Recipes now explicitly declare their default modifier stat. `applyClassWeaponStat()` still overrides to class-appropriate stat (mage→int, etc.), so no functional change for players.

---

## Build Verification
- `npx tsc --build shared/tsconfig.json` — ✅ PASS
- `npx tsc -p server/tsconfig.build.json --noEmit` — ✅ PASS
- `cd client && npx tsc --noEmit` — ✅ PASS

## Post-Deploy Notes
- DB seeds run on container startup — starter armor template will be auto-corrected
- **Sim re-run needed** after Fix 3 (monster STR double-count removal). Monster damage/attack will decrease for high-STR monsters. This is correct behavior but may shift balance.
