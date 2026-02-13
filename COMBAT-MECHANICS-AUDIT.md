# Combat Mechanics Audit — Realm of Crowns

> Generated 2026-02-13. Based on direct code analysis, not assumptions.

---

## 1. Turn Structure

### Initiative & Turn Order
**File:** `server/src/lib/combat-engine.ts:215-243`

Each combatant rolls initiative at the start of combat:
```
Initiative = d20 + DEX modifier
```
where DEX modifier = `floor((DEX - 10) / 2)` (standard D&D formula, `shared/types/combat.ts:17-19`).

Turn order is sorted by initiative descending. Ties broken by DEX score, then random. Combat begins at Round 1, Turn Index 0.

**Dice utility:** `shared/utils/dice.ts:66-68` — `initiativeRoll(dexModifier)` = `roll(20) + dexModifier`.

### Actions Per Turn
One action per turn. Available actions:
- **attack** — Melee/ranged weapon attack
- **cast** — Spell with save DC or auto-hit
- **defend** — +2 AC until next turn
- **item** — Use a consumable (heal, damage, buff, cleanse)
- **flee** — Attempt to escape combat
- **racial_ability** — Race-specific combat ability (121 abilities across 20 races)
- **psion_ability** — Psion class-specific abilities (18 abilities across 3 specializations)

### Round Limit
**File:** `server/src/services/tick-combat-resolver.ts:47`

`MAX_ROUNDS = 50`. If reached while status is still ACTIVE, combat ends as a draw (`winningTeam = null`).

For player-initiated PvE combat via the API routes, there is no explicit round limit in `combat-pve.ts` — combat runs until one side is eliminated or the player flees.

### Combat End Condition
**File:** `combat-engine.ts:1862-1878`

Combat ends when only one team (or zero teams) have living combatants. The `checkCombatEnd()` function counts alive teams; if ≤1 remain, status becomes `COMPLETED`.

---

## 2. Attack Resolution

### Attack Roll Formula
**File:** `combat-engine.ts:396-553`

```
Attack Roll = d20 + statMod + proficiencyBonus + weaponBonusAttack + statusEffectModifiers + racialAttackBonus
```

Where:
- **d20**: Raw die roll (1-20). See `dice.ts:71-83`.
- **statMod**: `floor((stat - 10) / 2)` using the weapon's `attackModifierStat` (either STR or DEX)
- **proficiencyBonus**: Level-based, from `bounded-accuracy.ts:12-20`:
  - Level 1-4: +2
  - Level 5-9: +3
  - Level 10-14: +4
  - Level 15-19: +5
  - Level 20-29: +6
  - Level 30-39: +7
  - Level 40+: +8
- **weaponBonusAttack**: `weapon.bonusAttack` (from enchantments, quality, etc.)
- **statusEffectModifiers**: Sum of all active status effects' `attackModifier`:
  - poisoned: -2
  - blessed: +2
  - blinded: -4
  - weakened: -3
  - hasted: +2
  - slowed: -2
- **racialAttackBonus**: From `getPassiveModifiers()` based on race, level, sub-race

### Hit/Miss Determination
**File:** `dice.ts:74-83`

```
Hit = (d20 === 20) OR (d20 !== 1 AND (d20 + totalModifier) >= targetAC)
```

- **Natural 20**: Always hits (regardless of AC), AND is a critical hit.
- **Natural 1**: Always misses (regardless of modifiers). No special fumble penalty.
- Otherwise: Total ≥ AC is a hit.

### Target AC Calculation
**File:** `combat-engine.ts:248-278`

```
AC = max(equipmentAC, 10 + DEX mod) + defendBonus + statusModifiers + racialACBonus
```

Where:
- **equipmentAC**: Stored on `combatant.ac` if set from armor. If 0, falls back to `10 + DEX mod`.
- **defendBonus**: +2 if the combatant used Defend on their last turn (`DEFEND_AC_BONUS = 2`)
- **statusModifiers**: Sum of active status effects' `acModifier`:
  - stunned: -2
  - frozen: -4
  - paralyzed: -4
  - blinded: -2
  - shielded: +4
  - hasted: +2
  - slowed: -2
  - phased: +4
  - foresight: +2
- **racialACBonus**: From `getPassiveModifiers()` racial passive bonuses

### Critical Hits
A natural 20 on the d20. Critical damage = **double the dice count**, then add modifier once.

Example: Weapon is 1d6+3. Normal = 1d6+3. Critical = 2d6+3.

**File:** `dice.ts:102-108` — `criticalDamageRoll(diceCount, diceSides, modifier)` calls `damageRoll(diceCount * 2, diceSides, modifier)`.

### Half-Orc Savage Attacks
**File:** `combat-engine.ts:478-482`

On a critical hit, Half-Orcs roll extra dice equal to their `extraCritDice` racial passive (typically 1 extra die of the weapon's die type), added on top of the doubled dice.

---

## 3. Damage Calculation

### Damage Formula
**File:** `combat-engine.ts:286-298`

```
Damage = sum(NdS dice) + statMod + weaponBonusDamage
```

Where:
- **NdS**: `weapon.diceCount` d `weapon.diceSides` (e.g., 1d6 for a shortsword)
- **statMod**: `floor((stat - 10) / 2)` using weapon's `damageModifierStat` (STR or DEX)
- **weaponBonusDamage**: `weapon.bonusDamage` (from enchantments, quality, etc.)

**Minimum damage**: Clamped to 0 by `Math.max(0, total)` in `dice.ts:97`.

### Damage Modifiers
After the base calculation:
- **Racial damage multiplier** (`combat-engine.ts:485-487`): Orc Blood Fury, Beastfolk Apex Predator, etc. — `totalDamage = floor(totalDamage * racialMods.damageMultiplier)`
- **Racial flat bonus** (`combat-engine.ts:490-492`): Goliath Titan's Grip — `totalDamage += racialMods.damageFlatBonus`

### Damage Type
Stored on `weapon.damageType` but **not currently included in `AttackResult`**. The combat engine calculates damage but does not pass the weapon's damage type into the result. This is a logging gap.

### Psychic Damage
**File:** `combat-engine.ts:817-841`

Psychic damage from Psion abilities gets special resistance handling:
- **Forgeborn**: Halve psychic damage
- **Psion (Telepath)**: Thought Shield passive halves psychic damage if they have the ability unlocked

---

## 4. HP and Death

### Starting HP
Characters: Set during character creation based on class + CON modifier. Grows by `+10 per level` (`LEVEL_UP_REWARDS.HP_PER_LEVEL = 10`, `xp-curve.ts:193`).

Monsters: From `monsterStats.hp` in the Monster table, defaulting to 50.

### Death at 0 HP
Instant death — no death saves, no unconscious state. When `currentHp` reaches 0, `isAlive` becomes `false`.

**Death prevention**: Orc Relentless Endurance and Revenant Undying Fortitude can prevent death at 0 HP (`combat-engine.ts:495-509`) — the `checkDeathPrevention()` function sets HP to a small positive value instead.

### Healing During Combat
- **Spells** (type `heal`): Roll dice + modifier and add to HP, capped at `maxHp`
- **Items** (type `heal`): `diceCount * diceSides + flatAmount`, capped at `maxHp`
- **Status effects**: `regenerating` heals `damagePerRound ?? 5` HP per round at start of turn

### Flee Mechanic
**File:** `combat-engine.ts:781-812`

```
Flee DC = 10 + (number of enemies - 1) * 2
Flee Roll = d20 + DEX modifier
Success = (d20 === 20) OR (d20 !== 1 AND total >= DC)
```

On success: Combatant marked as `hasFled = true`, `isAlive = false`. Receives minor penalty (half XP loss, no gold/durability loss, HP set to 50% of max).

---

## 5. PvE Specifics

### Monster Stats
**File:** `combat-pve.ts:210-233`

Monsters are loaded from the `Monster` database table. The route selects monsters from the character's current region, within ±3 levels of the character.

Monster stat block (from DB `stats` JSONB column):
- `hp` (default 50)
- `ac` (default 12)
- `damage` string (e.g., "1d6+2", default "1d6")
- `attack` bonus (default 0)
- Standard ability scores: `str`, `dex`, `con`, `int`, `wis`, `cha` (default 10 each)

Monster weapon is built from the damage string: `buildMonsterWeapon()` parses "NdS+B" format.

### Monster AI
**File:** `combat-pve.ts:518-539`

Simple AI: Pick a random living enemy and attack. No spell casting, no item usage, no fleeing. Always uses its `weapon` for attacks.

### Level 1 PvE Encounters
A Level 1 character faces monsters of levels 1-4 (±3 range). Monster stats come entirely from the database — there are no hardcoded level-1 monsters in the code.

### Encounter Difficulty
Not calculated explicitly. The only difficulty scaling is the level range filter (character level ±3). No CR system, no encounter difficulty rating.

---

## 6. PvP Specifics

### Same Engine
PvP uses the exact same `combat-engine.ts` functions as PvE. Both call `resolveTurn()` with the same attack/damage/AC formulas.

### Duels vs. Spars
**Duels** (from `combat-pvp.ts`): Full death penalties for the loser (gold, XP, durability), XP reward for winner (`PVP_WIN_PER_OPPONENT_LEVEL * opponent.level = 8 * opponent.level`), wager system.

**Spars**: No death penalties, no XP, no wagers. Mechanical combat is identical, only the reward/penalty phase differs.

### Tick-Based PvP
**File:** `tick-combat-resolver.ts:454-608`

Travel node PvP gives the ambusher a +2 initiative bonus. Both combatants use their preset AI decisions. Same engine, same formulas.

---

## 7. Rewards

### PvE XP
**File:** `xp-curve.ts:158`
```
XP = PVE_WIN_PER_MONSTER_LEVEL * monster.level = 5 * monster.level
```
Level 5 monster = 25 XP. Level 10 = 50 XP.

Survive (lose/flee): `PVE_SURVIVE = 5` flat XP.

### PvE Gold
From monster's `lootTable` JSONB column. Each entry has `dropChance`, `minQty`, `maxQty`, `gold`. Random roll per entry.

### PvP XP
Winner: `PVP_WIN_PER_OPPONENT_LEVEL * opponent.level = 8 * opponent.level`.
Loser: 0 XP.

### Death Penalties
**File:** `xp-curve.ts:213-217`
- Gold: 5% lost
- XP: 15 * character level lost
- Durability: 5 damage to all equipped items

Flee penalty (half of death): `15/2 * level` XP, no gold, no durability, HP set to 50% max.

Revenant racial: 50% reduction on all death penalties.

---

## 8. Status Effects

### 16 Effects
**File:** `combat-engine.ts:81-210`

| Effect | Prevents Action | DoT/HoT | Attack Mod | AC Mod | Save Mod |
|--------|:-:|:-:|:-:|:-:|:-:|
| poisoned | No | 3/round dmg | -2 | — | — |
| stunned | **Yes** | — | — | -2 | -4 |
| blessed | No | — | +2 | — | +2 |
| burning | No | 5/round dmg | — | — | — |
| frozen | **Yes** | — | — | -4 | -2 |
| paralyzed | **Yes** | — | — | -4 | -4 |
| blinded | No | — | -4 | -2 | — |
| shielded | No | — | — | +4 | — |
| weakened | No | — | -3 | — | -2 |
| hasted | No | — | +2 | +2 | — |
| slowed | No | — | -2 | -2 | -2 |
| regenerating | No | 5/round heal | — | — | — |
| dominated | **Yes** | — | — | — | — |
| banished | **Yes** | — | — | — | — |
| phased | No | — | — | +4 | — |
| foresight | No | — | — | +2 | +2 |

Effects are processed at the **start** of each combatant's turn (`processStatusEffects()`, lines 333-391). Duration decrements by 1 each turn. Expired effects are removed.

### Action Prevention
If any active effect has `preventsAction: true`, the combatant's chosen action is replaced with a no-op defend (0 AC bonus).

---

## 9. Combat Stances (Tick-Based Only)

**File:** `combat-presets.ts:54-59`

| Stance | Attack | AC | Flee |
|--------|:------:|:--:|:----:|
| AGGRESSIVE | +2 | -2 | 0 |
| BALANCED | 0 | 0 | 0 |
| DEFENSIVE | -2 | +2 | 0 |
| EVASIVE | -4 | +4 | +4 |

Stances are applied by the tick-combat-resolver before each turn. They modify the combatant's AC directly and the attack bonus is intended for use (though it's applied to AC via `applyStanceToState()` rather than explicitly to the attack roll).

---

## 10. Spell Casting

### Spell Save DC
**File:** `combat-engine.ts:571-573`
```
Spell Save DC = 8 + proficiencyBonus + castingStatModifier
```

### Save Mechanics
Target rolls: `d20 + saveStat modifier + proficiencyBonus + statusEffectSaveModifiers` vs. DC.
- Natural 20 always succeeds, natural 1 always fails.
- On save success for damage spells: **half damage** (floored).
- On save success for status spells: **effect does not apply**.

### Damage Spells
Roll `diceCount * diceSides + modifier` damage. If save succeeds, halved.

### Heal Spells
Roll same dice formula, add to target HP (capped at maxHp).

---

## 11. Racial Combat Abilities (121 total)

**File:** `server/src/services/racial-combat-abilities.ts`

Each of the 20 races has ~6 abilities (Nightborne/Drow has 7). These unlock at levels 1, 5, 10, 15, 25, and 40.

Abilities are resolved through `resolveRacialAbility()` which returns damage, healing, status effects, and a description. The result is stored as a `RacialAbilityActionResult` in the combat log.

### Passive Racial Modifiers
`getPassiveModifiers()` returns per-combat-round modifiers that are applied to every attack and AC calculation:
- `attackBonus` — flat bonus to attack rolls
- `damageMultiplier` — multiply total damage
- `damageFlatBonus` — flat bonus to damage
- `acBonus` — flat bonus to AC
- `extraCritDice` — extra dice on critical hits (Half-Orc)

---

## 12. Unarmed Combat

**File:** `combat-pve.ts:145-154`

If a character has no equipped weapon:
```
Unarmed Strike: 1d4, STR-based, no bonuses
```

Beastfolk get natural weapons as a racial fallback: `getBeastfolkNaturalWeapon(level)` scales with level.

---

## 13. Key Combat Constants

| Constant | Value | Location |
|----------|-------|----------|
| BASE_AC | 10 | combat-engine.ts:58 |
| DEFEND_AC_BONUS | +2 | combat-engine.ts:57 |
| DEFAULT_FLEE_DC | 10 | combat-engine.ts:59 |
| Flee DC per extra enemy | +2 | combat-engine.ts:791 |
| MAX_ROUNDS (tick) | 50 | tick-combat-resolver.ts:47 |
| DEATH_GOLD_LOSS_PERCENT | 5% | xp-curve.ts:214 |
| DEATH_XP_LOSS_PER_LEVEL | 15 | xp-curve.ts:215 |
| DEATH_DURABILITY_DAMAGE | 5 | xp-curve.ts:216 |
| PVE_WIN_XP | 5 * monster.level | xp-curve.ts:158 |
| PVP_WIN_XP | 8 * opponent.level | xp-curve.ts:163 |
| PVE_SURVIVE_XP | 5 | xp-curve.ts:159 |
| Ambush initiative bonus | +2 | tick-combat-resolver.ts:48 |

---

## 14. Identified Logging Gaps

The following mechanical data is computed by the combat engine but NOT captured by the combat logger (`combat-logger.ts`):

1. **Modifier breakdown missing**: `AttackResult` stores `attackRoll` (raw d20) and `attackTotal` (d20 + all modifiers) but does NOT separately store the individual modifiers (stat mod, proficiency, weapon bonus, status effects, racial). The logger cannot show "rolled 14 + 3 STR + 2 proficiency = 19" because only the raw and total are available.

2. **Damage breakdown missing**: `AttackResult.damageRoll` is the total damage value, not the individual dice rolls. The `damageRoll()` function returns `{ rolls: number[], total: number }` but the engine only stores `total` into the result. No separation of dice vs. modifier.

3. **Damage type not in AttackResult**: The weapon's damage type (SLASHING, PIERCING, etc.) is known at attack time but is not stored in `AttackResult`. Logger's `round.damageType` is always undefined for attacks.

4. **Target HP before attack not tracked**: `AttackResult` has `targetHpAfter` but not `targetHpBefore`. Can't calculate damage dealt from the result alone.

5. **HP snapshot uses final state**: `buildRoundsData()` reads `state.combatants` for HP — but this is the FINAL state after all rounds. Every round shows the same (final) HP values, making per-round HP tracking useless.

6. **Field name mismatches**: The logger reads `result.roll` / `result.modifier` but `AttackResult` uses `attackRoll` / `attackTotal`. Cast and flee results have similar mismatches.

7. **No encounter context/header**: The logger stores character name and weapon but not the full starting stat block (all 6 ability scores, AC breakdown, level, proficiency bonus, weapon dice, monster stat block). Without this, you can't verify the math.

8. **Cast/spell detail incomplete**: `CastResult` includes save DC, save roll, damage, and heal — but the logger reads wrong field names and drops save information.

9. **Initiative/turn order not logged**: Who goes first and why (initiative rolls) is not captured.

10. **Weapon dice format not captured**: Whether the weapon is "1d6" or "2d8" is not in the round log.
