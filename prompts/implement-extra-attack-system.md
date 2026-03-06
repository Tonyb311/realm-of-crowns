# Implement: Extra Attack System (D&D 5e Style)

## Bootstrap
```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/balance-designer.md
cat .claude/agents/database.md
```

## Objective

All classes currently get 1 weapon attack per turn. In D&D 5e, martial classes get Extra Attack at key levels — the single biggest differentiator between martial and caster combat identity. Implement this for Realm of Crowns.

**Design goals:**
- Warrior is THE weapon attack class (up to 4 attacks/turn at endgame)
- Ranger and Cleric get a modest 2 attacks (off-tank / hybrid)
- Rogue, Bard, Mage, Psion stay at 1 attack (compensated by abilities/spells/sneak attack)
- Extra attacks only trigger on the `attack` action, NOT on class abilities, racial abilities, or spells
- Fills 4 dead zone levels: 13, 28, 34, 42

## Files to Read Before Starting

1. `shared/src/types/combat.ts` — `Combatant` interface (needs `extraAttacks` field)
2. `server/src/lib/combat-engine.ts` — `resolveTurn()` function and `resolveAttack()` — extra attacks go here
3. `server/src/services/tick-combat-resolver.ts` — `resolveTickCombat()` loop, `decideAction()`, and combatant builder locations
4. `server/src/lib/road-encounter.ts` — Combatant builder locations
5. `shared/src/data/combat-constants.ts` — Add `CLASS_EXTRA_ATTACKS` data
6. `server/src/services/ability-grants.ts` — Level-up grant system
7. `shared/src/utils/bounded-accuracy.ts` — `getProficiencyBonus()` for reference

## Design

### Extra Attack Schedule

```typescript
// shared/src/data/combat-constants.ts

/**
 * Extra attacks granted by class at specific character levels.
 * Value = TOTAL attacks per Attack action (1 = no extra, 2 = one extra, etc.)
 * Only applies to the 'attack' action type — not abilities or spells.
 *
 * D&D 5e reference: Fighter gets 2/3/4 attacks, other martial get 2.
 * RoC spreads this over 50 levels to fill dead zones.
 */
export const CLASS_EXTRA_ATTACKS: Record<string, { level: number; totalAttacks: number }[]> = {
  warrior: [
    { level: 13, totalAttacks: 2 },   // First extra attack — fills dead L13
    { level: 34, totalAttacks: 3 },   // Second extra — fills dead L34
    { level: 42, totalAttacks: 4 },   // Third extra — fills dead L42
  ],
  ranger: [
    { level: 28, totalAttacks: 2 },   // Single extra attack — fills dead L28
  ],
  cleric: [
    { level: 34, totalAttacks: 2 },   // Single extra attack (Paladin identity) — fills dead L34
  ],
  // Rogue: No extra attacks. Compensated by Sneak Attack / spec ability burst damage.
  // Bard: No extra attacks. Compensated by buffs/debuffs/CC.
  // Mage: No extra attacks. Compensated by spell damage scaling.
  // Psion: No extra attacks. Compensated by psionic ability damage.
};

/** Get total attacks per Attack action for a class at a given level */
export function getAttacksPerAction(characterClass: string, level: number): number {
  const classSchedule = CLASS_EXTRA_ATTACKS[characterClass.toLowerCase()];
  if (!classSchedule) return 1;
  let attacks = 1;
  for (const entry of classSchedule) {
    if (level >= entry.level) attacks = entry.totalAttacks;
  }
  return attacks;
}
```

### Change 1: Add `extraAttacks` to Combatant interface

**File:** `shared/src/types/combat.ts`

Add to the `Combatant` interface:
```typescript
/** Number of TOTAL attacks when taking the Attack action (1 = normal, 2+ = extra attacks) */
extraAttacks?: number;
```

### Change 2: Implement Extra Attack in `resolveTurn`

**File:** `server/src/lib/combat-engine.ts`

In the `resolveTurn()` function, find the `case 'attack':` block (around line ~2794). Currently it:
1. Resolves one attack via `resolveAttack()`
2. Checks for Orcish Rampage bonus attack on kill

Modify it to:
1. Resolve the FIRST attack via `resolveAttack()` (unchanged)
2. **NEW:** If `actor.extraAttacks > 1`, resolve additional attacks (up to `extraAttacks - 1` more)
3. Check for Orcish Rampage (unchanged, but should only trigger once even with multiple attacks)

```typescript
case 'attack': {
  if (!action.targetId || !context.weapon) {
    result = noOpDefend(actorId);
    break;
  }
  
  // First attack (always happens)
  const atk = resolveAttack(current, actorId, action.targetId, context.weapon, racialContext?.tracker);
  current = atk.state;
  result = atk.result;
  
  // === EXTRA ATTACKS ===
  const totalAttacks = currentActor.extraAttacks ?? 1;
  const extraAttackResults: TurnLogEntry[] = [];
  
  if (totalAttacks > 1) {
    for (let i = 1; i < totalAttacks; i++) {
      // Check combat is still active
      current = checkCombatEnd(current);
      if (current.status !== 'ACTIVE') break;
      
      // Re-fetch actor (may have taken damage from thorns/reflect)
      const actorNow = current.combatants.find(c => c.id === actorId);
      if (!actorNow || !actorNow.isAlive) break;
      
      // Find a valid target: prefer original, fall back to any alive enemy
      let extraTargetId = action.targetId;
      const originalTarget = current.combatants.find(c => c.id === extraTargetId);
      if (!originalTarget || !originalTarget.isAlive) {
        const anyEnemy = current.combatants.find(
          c => c.team !== actorNow.team && c.isAlive && !c.hasFled
        );
        if (!anyEnemy) break;
        extraTargetId = anyEnemy.id;
      }
      
      // Resolve extra attack
      const extraAtk = resolveAttack(current, actorId, extraTargetId, context.weapon, racialContext?.tracker);
      current = extraAtk.state;
      
      // Log as separate entry
      extraAttackResults.push({
        round: current.round,
        actorId,
        action: 'attack',
        result: extraAtk.result,
        statusTicks: [],
      });
    }
    
    // Append all extra attack logs
    if (extraAttackResults.length > 0) {
      current = { ...current, log: [...current.log, ...extraAttackResults] };
    }
  }
  
  // Check for Orcish Rampage: bonus attack on kill (only from FIRST attack, not extras)
  // ... existing Orcish Rampage code unchanged ...
```

**IMPORTANT:** The Orcish Rampage check should ONLY trigger from the first attack's kill, not from extra attacks. This prevents a Warrior/Orc from getting 4 attacks + rampage + rampage chains. If you want extra attack kills to also trigger Rampage, that's a balance decision — but start conservative.

**ALSO IMPORTANT:** The `extraAction` buff from Warlord's Tactical Advance is a SEPARATE system — it gives a whole extra turn, not an extra attack. Do NOT conflate these. Extra Attack only fires additional `resolveAttack()` calls within the same attack action.

### Change 3: Populate `extraAttacks` on Combatant creation

**File:** `server/src/services/tick-combat-resolver.ts`

Everywhere player combatants are built (5 locations per earlier save proficiency work), add:
```typescript
import { getAttacksPerAction } from '@shared/data/combat-constants';

// When building combatant:
extraAttacks: getAttacksPerAction(character.class, character.level),
```

**File:** `server/src/lib/road-encounter.ts`

Same pattern in both combatant builder locations:
```typescript
extraAttacks: getAttacksPerAction(character.class, character.level),
```

**For monster combatants:** Do NOT set `extraAttacks` (leave undefined = 1 attack). Monsters already have their own multi-attack patterns via monster abilities. If a specific monster needs multi-attack, that's handled through the monster ability system, not Extra Attack.

### Change 4: Combat simulator awareness

**File:** `server/src/services/combat-simulator.ts` (or wherever test combatants are built)

Ensure the combat simulator also sets `extraAttacks` when building player combatants for sim runs. Otherwise sim results won't reflect the new system.

### Change 5: Update combat log display (if needed)

Extra attacks will appear as additional `TurnLogEntry` items in the combat log — the same structure as Orcish Rampage bonus attacks. The admin combat dashboard and combat log viewer should already handle multiple log entries per round. Verify this works by checking:
- `client/src/components/admin/combat/` — Does the log renderer handle multiple attack entries per combatant per round?

If log entries are grouped by round+actor, extra attacks will naturally show up. If they're one-entry-per-turn, there may be a display issue. Flag for manual verification.

### Change 6: Update progression docs

**File:** `docs/character-progression-table.md`

Add Extra Attack milestones to Section 2 (Level Milestone Summary):
- Level 13: Warrior gains Extra Attack (2 attacks per Attack action)
- Level 28: Ranger gains Extra Attack (2 attacks)
- Level 34: Warrior gains 3rd attack. Cleric gains Extra Attack (2 attacks).
- Level 42: Warrior gains 4th attack.

Add a new subsection to Section 3 (Class Ability Progression) with the attacks-per-action table.

## Balance Notes

**DPR (Damage Per Round) impact at level 40:**
Assuming 16 STR (+3 mod), +7 proficiency, d8 weapon (longsword), +2 weapon bonus:
- Attack bonus: +12, damage per hit: ~8.5 avg
- **Warrior (4 attacks):** ~34 DPR from basic attacks alone
- **Ranger (2 attacks):** ~17 DPR from basic attacks
- **Rogue (1 attack):** ~8.5 DPR from basic attacks, but spec abilities (Backstab, Ambush, Death Mark) add burst

This is a MASSIVE change to Warrior damage output. It will likely require:
1. Monster HP scaling review (monsters may die too fast)
2. Warrior vs other class DPR comparison (Warriors should be highest sustained, but not outrageously so)
3. PvP balance review (a Warrior hitting 4 times per round is brutal)

These are follow-up tasks for the combat sim re-run. Do NOT attempt to rebalance monster HP in this prompt.

## Verification

1. Build passes
2. `getAttacksPerAction('warrior', 13)` returns 2
3. `getAttacksPerAction('warrior', 34)` returns 3
4. `getAttacksPerAction('warrior', 42)` returns 4
5. `getAttacksPerAction('ranger', 28)` returns 2
6. `getAttacksPerAction('cleric', 34)` returns 2
7. `getAttacksPerAction('mage', 50)` returns 1
8. `getAttacksPerAction('rogue', 50)` returns 1
9. Confirm `extraAttacks` is NOT set on monster combatants
10. Grep: no other locations build `Combatant` objects without setting `extraAttacks` for characters

## Rules

- Extra attacks ONLY fire on `action.type === 'attack'`. NOT on class_ability, racial_ability, psion_ability, or cast.
- Orcish Rampage bonus attack triggers only from the FIRST attack, not extras (conservative start).
- Monster multi-attack is a SEPARATE system via monster abilities. Do NOT give monsters `extraAttacks`.
- Do NOT change the `decideAction()` logic in tick-combat-resolver. The AI still picks "attack" — the engine handles the rest.
- Do NOT conflate with Warlord's `extraAction` buff (that's a whole extra turn, not extra attacks).
- Git commit, push, deploy to Azure with unique image tag.
