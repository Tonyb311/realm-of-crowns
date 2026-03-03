# Investigation: Class Ability Roll Details Not Showing in Combat Log

## Where the Chain Breaks

**Layer 1 — Class Ability Resolver (`server/src/lib/class-ability-resolver.ts`)**

The `handleDamage` handler gates the attack roll (d20 vs AC) behind a `hasAttackMods` check at line 133:

```typescript
const hasAttackMods = critBonus > 0 || ignoreArmor || accuracyMod !== 0;
```

This check only passes for abilities that **modify** the attack roll (crit bonus, ignore armor, accuracy penalty/bonus). For the majority of damage-type abilities — including Reckless Strike, Smite, Commanding Strike, and Penance — `hasAttackMods` evaluates to `false`, so:

- No d20 is rolled
- `abilityHit` stays `true` (auto-hit, line 134)
- `atkD20`, `atkTotal`, `atkModifiers`, `effectiveAC` remain `undefined`
- The ability always hits regardless of target AC

**Result:** 9 of 13 `damage`-type abilities never make an attack roll. They auto-hit and skip to damage.

## Ability-by-Ability Breakdown

| Ability | Effects | `hasAttackMods`? | Gets Attack Roll? |
|---------|---------|:---:|:---:|
| Reckless Strike | `bonusDamage: 5, selfDefenseDebuff: -2` | **NO** | NO |
| Commanding Strike | `bonusDamage: 3` | **NO** | NO |
| Smite | `bonusDamage: 6, element: 'radiant'` | **NO** | NO |
| Penance | `diceCount: 2d6, bonusPerDebuff: 4` | **NO** | NO |
| Discordant Note | `diceCount: 2d8, element: 'sonic'` | **NO** | NO |
| Shadow Bolt | `diceCount: 3d6, element: 'shadow'` | **NO** | NO |
| Arcane Bolt | `autoHit: true, diceCount: 2d4` | **NO** (autoHit skips roll) | NO (by design) |
| Ambush | `requiresStealth, damageMultiplier: 3.0` | **NO** | NO |
| Backstab | `critBonus: 10, bonusDamage: 5` | **YES** (critBonus) | YES |
| Aimed Shot | `bonusDamage: 6, accuracyBonus: 3` | **YES** (accuracyMod) | YES |
| Piercing Arrow | `ignoreArmor, diceCount: 2d8` | **YES** (ignoreArmor) | YES |
| Headshot | `critBonus: 20, accuracyPenalty: -5, diceCount: 4d8` | **YES** (both) | YES |
| Exploit Weakness | `requiresAnalyze, critBonus: 15, diceCount: 3d6` | **YES** (critBonus) | YES |

Only 5/13 damage abilities get attack rolls. The other 8 (including all the common Tier 1 abilities warriors/clerics use) auto-hit.

## What IS Working After the Deploy

The damage breakdown **does** get stored correctly for all damage abilities. For a post-deploy Reckless Strike, the DB would contain:

```json
{
  "action": "class_ability",
  "abilityName": "Reckless Strike",
  "damageRoll": {
    "dice": "1d6",
    "rolls": [4],
    "modifiers": [
      { "source": "STR", "value": 4 },
      { "source": "flat bonus", "value": 5 }
    ],
    "total": 14,
    "type": "slashing"
  },
  "targetHpBefore": 16,
  "targetHpAfter": 2,
  "hit": null,
  "attackRoll": null,
  "targetAC": null
}
```

The frontend `ClassAbilityEntry` would render:

```
L3 Drakonid Warrior uses Reckless Strike
  DAMAGE
    1d6 = [4]
    +4 STR
    +5 flat bonus
    = 14 slashing
  Mana Wisp: 16 → 2 HP
  Reckless Strike: 14 damage to Mana Wisp | self AC -2
```

This is an improvement over the old "Deals 14 damage" summary — but still missing the attack roll breakdown shown in the expected output.

## Why Basic Attacks Show Full Detail

`resolveAttack()` in `combat-engine.ts` (line 475) ALWAYS rolls d20 and builds the full modifier breakdown for every basic attack. There is no `hasAttackMods` gate — the attack roll is unconditional:

```typescript
// combat-engine.ts:497-507 — always runs
const statMod = getModifier(actor.stats[weapon.attackModifierStat]);
let atkMod = statMod + actor.proficiencyBonus + weapon.bonusAttack;
const atkModBreakdown: AttackModifierBreakdown[] = [
  { source: weapon.attackModifierStat.toUpperCase(), value: statMod },
  { source: 'proficiency', value: actor.proficiencyBonus },
];
```

## Layer 2-4 Status (Logger, Normalizer, Frontend)

These layers all work correctly for data that exists:

- **Logger** (`combat-logger.ts` lines 378-386): Correctly checks `ca.attackRoll != null` and passes through when present. The `damageRoll` object is built with full `dice`, `rolls`, `modifiers`, `type` fields.
- **Frontend normalizer** (`HistoryTab.tsx` lines 318-327): Correctly extracts `attackRoll.raw`, `attackRoll.modifiers`, `attackRoll.total` and damage breakdown fields from the structured objects.
- **ClassAbilityEntry** (`HistoryTab.tsx` line 653): Correctly gates `RollBreakdown` on `r.attackRoll != null` and `DamageBreakdown` on `r.damageRolls?.length > 0`. Falls back to simple "Deals X damage" for old data.

The chain is intact — the frontend simply doesn't receive attack roll data because the resolver doesn't produce it.

## Recommended Fix

**Change `handleDamage` to ALWAYS make an attack roll when the actor has a weapon**, regardless of `hasAttackMods`. The `hasAttackMods` flag should only modify the roll behavior (crit threshold, accuracy bonus, ignore armor), not gate the roll's existence.

### File: `server/src/lib/class-ability-resolver.ts`

**Current (line 132-143):**
```typescript
const hasAttackMods = critBonus > 0 || ignoreArmor || accuracyMod !== 0;
let abilityHit = true;
let isCrit = false;

// ...tracking vars...

if (hasAttackMods && actor.weapon && !autoHit) {
  // attack roll + breakdown
}
```

**Proposed:**
```typescript
const hasAttackMods = critBonus > 0 || ignoreArmor || accuracyMod !== 0;
let abilityHit = true;
let isCrit = false;

// ...tracking vars...

// Always roll attack for weapon-based damage abilities (not autoHit like Arcane Bolt)
if (actor.weapon && !autoHit) {
  const statMod = getModifier(actor.stats[actor.weapon.attackModifierStat]);
  const atkMod = statMod + actor.proficiencyBonus + actor.weapon.bonusAttack + accuracyMod;
  const effectiveAC = ignoreArmor ? 10 : target.ac;
  const d20 = roll(20);
  abilityHit = d20 + atkMod >= effectiveAC || d20 === 20;

  const effectiveCritBonus = analyzeMissing ? 0 : critBonus;
  const critThreshold = 20 - Math.floor(effectiveCritBonus / 5);
  isCrit = d20 >= critThreshold && abilityHit;

  // Store attack roll breakdown
  atkD20 = d20;
  atkTotal = d20 + atkMod;
  atkModifiers = [];
  if (statMod !== 0) atkModifiers.push({ source: actor.weapon.attackModifierStat.toUpperCase(), value: statMod });
  if (actor.proficiencyBonus !== 0) atkModifiers.push({ source: 'proficiency', value: actor.proficiencyBonus });
  if (actor.weapon.bonusAttack !== 0) atkModifiers.push({ source: 'weapon bonus', value: actor.weapon.bonusAttack });
  if (accuracyMod !== 0) atkModifiers.push({ source: 'ability accuracy', value: accuracyMod });
}
```

The only change is removing `hasAttackMods` from the `if` guard (line 143). All modifier behavior remains identical — the `hasAttackMods` flag still controls whether crit threshold / accuracy / armor-ignore modifiers are applied, because those fields default to 0/false when not present.

### Impact

- All 13 `damage`-type abilities will now roll d20 vs AC (except `autoHit: true` abilities like Arcane Bolt, which correctly skip)
- Abilities can now MISS, which is a balance-meaningful change
- Reckless Strike's `-2 self AC` becomes verifiable in logs
- No changes needed to layers 2-4 (logger, normalizer, frontend) — they already handle the data correctly

### Balance Consideration

Making abilities roll to hit is a nerf to damage abilities that previously auto-hit. This brings them in line with D&D rules (melee/ranged attacks always roll) but changes combat balance. Pure-dice abilities without weapons (Discordant Note, Shadow Bolt) will still auto-hit since `actor.weapon` may be null for casters — this should be verified. Caster abilities might need a separate spell attack roll path (d20 + INT/WIS + proficiency) rather than weapon attack.
