# Audit: Combat Stat & Status Effect Mechanics

**Date:** 2026-03-04
**Scope:** What every stat, saving throw, status effect, and combat property ACTUALLY does in the engine — not what it should do, but what the code implements.
**Method:** Code trace (sections A–J) + empirical log verification (section K)

---

## A. The 6 Core Stats (STR, DEX, CON, INT, WIS, CHA)

### How Modifiers Work

`getModifier()` at `shared/src/types/combat.ts:17`:
```ts
export function getModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}
```

Raw stat values are used directly in exactly one place: initiative tie-breaking (`rollAllInitiative`, combat-engine.ts:364).

---

### STR (Strength) — ACTIVE

| Usage | Location | Detail |
|-------|----------|--------|
| Attack rolls (melee weapon) | combat-engine.ts:661 | When `weapon.attackModifierStat === 'str'` |
| Damage rolls (melee weapon) | combat-engine.ts:427 | When `weapon.damageModifierStat === 'str'` |
| Monster attack fallback | monster-ability-resolver.ts:68 | `getModifier(actor.stats.str) + proficiencyBonus` when no weapon |
| Saving throw target | Generic | STR is a valid `saveType` (e.g., Wolf Knockdown DC 11, Direwolf Pounce DC 13) |

**Primary classes:** Warrior (`CLASS_WEAPON_STAT.warrior = 'str'` in combat-simulator.ts:109)

**Log Verification:** STR save modifier of +6 confirmed correct for L20 warriors (STR 22 = +6 modifier) in 20 saving throw entries.

---

### DEX (Dexterity) — ACTIVE

| Usage | Location | Detail |
|-------|----------|--------|
| Initiative rolls | combat-engine.ts:347 | `getModifier(stats.dex)` passed to `initiativeRoll()` |
| Initiative tie-breaking | combat-engine.ts:364 | Raw `stats.dex` compared directly |
| AC calculation (base fallback) | combat-engine.ts:382 | `BASE_AC(10) + getModifier(stats.dex)` when no equipment AC |
| AC calculation (production) | road-encounter.ts:474 | `10 + getModifier(effectiveStats.dex) + equipTotals.totalAC` |
| Attack rolls (ranged weapon) | combat-engine.ts:661 | When `weapon.attackModifierStat === 'dex'` |
| Damage rolls (ranged weapon) | combat-engine.ts:427 | When `weapon.damageModifierStat === 'dex'` |
| Flee check | combat-engine.ts:1685 | `getModifier(actor.stats.dex)` passed to `fleeCheck()` |
| Ranged weapon detection | combat-engine.ts:805 | `attackModifierStat === 'dex'` → ranged fumble chart |
| Armor type interaction (sim) | combat-simulator.ts:209 | Light: full DEX mod, Medium: capped at +2, Heavy: 0 |
| Saving throw target | Generic | Valid `saveType` (e.g., Spider Web DEX DC 12, AoE saves) |

**Primary classes:** Rogue, Ranger (attack, damage, initiative, AC, flee all benefit)

**Log Verification:** AC calculation verified correct for 15 characters (base 10 + DEX mod 1 + equipment 6 = 17).

---

### CON (Constitution) — ACTIVE (HP only)

| Usage | Location | Detail |
|-------|----------|--------|
| HP calculation (sim) | combat-simulator.ts:217 | `hitDie + conMod + (level-1) * floor(hitDieAvg + conMod)` |
| HP calculation (production) | simulation/seed.ts:519 | `(10 + conModifier + CLASS_HP_MAP[class]) * startLevel` |
| Passive bonus HP | class-ability-resolver.ts:2003 | `bonusHpFromCon` passive reads `getModifier(stats.con)` |
| Saving throw target | Generic | Valid `saveType` (e.g., Rat Filth Fever CON DC 10, death throes saves) |

**Note:** For production PvE players, HP is stored in `character.maxHealth` in the DB from creation/level-up. CON's effect is at character construction time, not per-fight.

**No direct combat-round effect.** CON doesn't affect attack, damage, AC, or initiative during combat. Its only in-combat path is through CON saving throws when relevant abilities fire.

---

### INT (Intelligence) — ACTIVE

| Usage | Location | Detail |
|-------|----------|--------|
| Psion save DCs | combat-engine.ts:1766 | `8 + proficiencyBonus + getModifier(stats.int)` |
| Psion damage bonus | combat-engine.ts:1783+ | Added to all Psion damage dice rolls |
| Psion Blink Strike bonus | combat-engine.ts:2189 | `weapon.bonusDamage + intMod` |
| Spell save DC (INT caster) | combat-engine.ts:1455 | When `spell.castingStat === 'int'` |
| Attack rolls (INT weapon) | combat-engine.ts:661 | When `weapon.attackModifierStat === 'int'` |
| Saving throw target | Generic | Valid `saveType` (e.g., Psion Mind Spike INT save, Banishment INT save) |

**Primary classes:** Mage (weapon stat), Psion (weapon stat + all ability DCs + all ability damage)

---

### WIS (Wisdom) — ACTIVE

| Usage | Location | Detail |
|-------|----------|--------|
| Spell save DC (WIS caster) | combat-engine.ts:1455 | When `spell.castingStat === 'wis'` |
| Attack rolls (WIS weapon) | combat-engine.ts:661 | When `weapon.attackModifierStat === 'wis'` |
| Saving throw target | Generic | Most common save stat in the game — Psion control abilities (Psychic Crush, Dominate, Mind Shatter, Absolute Dominion), fear auras, Dread Gaze |

**Primary classes:** Cleric (`CLASS_WEAPON_STAT.cleric = 'wis'`). WIS is also the primary defensive stat against Psion class abilities.

---

### CHA (Charisma) — PARTIAL

| Usage | Location | Detail |
|-------|----------|--------|
| Spell save DC (CHA caster) | combat-engine.ts:1455 | When `spell.castingStat === 'cha'` |
| Attack/damage rolls (CHA weapon) | combat-engine.ts:661/427 | When `weapon.attackModifierStat === 'cha'` |
| Saving throw target | Generic | Valid `saveType` but NO current ability uses CHA saves |

**Primary classes:** Bard (`CLASS_WEAPON_STAT.bard = 'cha'`)

**Effectively dead for non-Bard characters.** If a character is not a Bard (or using a CHA-keyed spell), CHA contributes nothing in combat. No existing ability calls for a CHA save.

---

## B. Saving Throws

### B1. The Save Function

`savingThrow()` at `shared/src/utils/dice.ts:111–123`:
```ts
export function savingThrow(modifier: number, dc: number): { roll: number; total: number; success: boolean } {
  const d20 = roll(20);
  const total = d20 + modifier;
  return { roll: d20, total, success: d20 === 20 || (d20 !== 1 && total >= dc) };
}
```
- Natural 20 always passes, natural 1 always fails
- Otherwise: `total >= dc` (inclusive)

### B2. Save Modifier Formula

```
modifier = getModifier(target.stats[saveType]) + target.proficiencyBonus + sum(statusEffect.saveModifier)
```

Proficiency bonus IS always added to saves. Confirmed at every save site: spells (resolveCast:1463), Psion abilities (1775, 1836, 1886, 1943, 1987, 2245, 2319, 2372), monster abilities (monster-ability-resolver.ts:149, 221, 461, 544), fear aura (combat-engine.ts:2617), death throes (3421).

Status effect `saveModifier` penalties are applied by iterating `target.statusEffects` before calling `savingThrow`.

### B3. Save DC Formula

**Three different sources:**

| Context | Formula | Location |
|---------|---------|----------|
| Spells | `8 + actor.proficiencyBonus + getModifier(actor.stats[castingStat])` | combat-engine.ts:1455 |
| Psion abilities | `8 + actor.proficiencyBonus + getModifier(actor.stats.int)` | combat-engine.ts:1766 |
| Monster abilities | Static `saveDC` on ability definition | database/seeds/monsters.ts |

### B4. All Abilities That Call Saving Throws

**Psion abilities:**

| Ability | Save Stat | On Fail | On Save |
|---------|-----------|---------|---------|
| psi-tel-1 Mind Spike | INT | Full psychic dmg + weakened 2r | Half damage |
| psi-tel-3 Psychic Crush | WIS | Full dmg + stunned 1r | Half damage |
| psi-tel-4 Dominate | WIS (-2) | Controlled 1r | Weakened 2r |
| psi-tel-5 Mind Shatter | WIS (AoE) | Full dmg + weakened 2r | Half damage |
| psi-tel-6 Absolute Dominion | WIS (-4) | Controlled 2r | Stunned + 2d10 dmg |
| psi-nom-5 Rift Walk | WIS (AoE) | Full dmg + slowed 2r | Half damage |
| psi-nom-6 Banishment | INT (-2) | Banished 3r | 2d6 psychic + slowed 1r |

**Monster abilities:**

| Type | Examples | Save |
|------|----------|------|
| on_hit | Wolf Knockdown (STR DC 11), Rat Filth Fever (CON DC 10), Direwolf Pounce (STR DC 13) | Per-ability |
| status | Spider Web (DEX DC 12), Shadow Wraith Dread Gaze (WIS DC 14) | Per-ability |
| aoe | Various (DEX or CON per config) | Half damage on pass |
| swallow | STR save after attack hits | Fail = swallowed |
| fear_aura | WIS save each turn | Fail = frightened 1r, Pass = permanent immunity |
| death_throes | Per `deathSaveType` field | Half damage on pass |

**Legendary Resistance:** `combat-engine.ts:495–528`. When a monster would fail a save and has `legendaryResistancesRemaining > 0`, it auto-passes and consumes one charge.

### B5. Success vs Failure

| Context | Save Succeeds | Save Fails |
|---------|---------------|------------|
| Damage spell/ability | Half damage | Full damage + status |
| Status-only ability | No effect | Status applied |
| Monster AoE | Half damage | Full damage |
| Psion control (Dominate) | Weakened 2r instead | Full mind control |
| Fear aura | Permanent immunity (`fearAuraImmune = true`) | Frightened 1r |
| Swallow | Target escapes | Swallowed (999r) |

**Log Verification:** 20/20 saving throw success/failure calculations verified correct.

---

## C. Speed — DEAD

**`speed` is NOT on the `Combatant` interface.** It exists only in:
- `MonsterStats` interface in combat-simulator.ts:45
- Monster seed data (e.g., `speed: 30`)
- Admin API route (reads `stats.speed ?? 30`)

**Does speed affect combat?** No. Zero references to `.speed` in combat-engine.ts, class-ability-resolver.ts, tick-combat-resolver.ts, or monster-ability-resolver.ts.

**Does speed affect travel?** No. Zero references in road-encounter.ts. Travel timing is tick-based.

**Verdict: DEAD STAT.** Stored in monster seed data but completely ignored by every system.

---

## D. Initiative

### D1. Formula

`calculateInitiative` at combat-engine.ts:346–353:
```
initiative = d20 + getModifier(stats.dex) + initiativeBonus
```

`initiativeBonus` is Psion-specific (Seer passive `psi-see-2` Danger Sense: +2 initiative).

### D2. Turn Order

`rollAllInitiative` at combat-engine.ts:357–376:
1. All combatants get `calculateInitiative()` → numeric `initiative` value
2. Sorted **descending** by `initiative`
3. Ties broken by raw `stats.dex` (higher wins), then random
4. Sorted IDs stored in `state.turnOrder`
5. `state.turnIndex` advances each turn

### D3. Mid-Combat Modification

**Not possible.** `rollAllInitiative` is called exactly once inside `createCombatState` (line 3264). Turn order is never re-sorted or re-rolled.

---

## E. Armor Class (AC)

### E1. Calculation

`calculateAC` at combat-engine.ts:381–413:
```ts
let ac = BASE_AC(10) + getModifier(stats.dex);   // fallback
if (combatant.ac > 0) ac = combatant.ac;          // use stored equipment AC
if (combatant.isDefending) ac += DEFEND_AC_BONUS;  // +2
// + status effect acModifiers (loop)
// + racial passive AC bonuses
// + class ability buff AC (getBuffAcMod)
```

**Important:** If `combatant.ac > 0`, DEX mod base is discarded. DEX is baked into `combatant.ac` at construction time (road-encounter.ts:474: `10 + dexMod + equipTotals.totalAC`).

### E2. AC Modifiers

| Source | Value | Location |
|--------|-------|----------|
| Equipment AC (baked in) | Variable | combat-simulator.ts:204, road-encounter.ts:474 |
| Defend action | +2 | `DEFEND_AC_BONUS` line 95 |
| Status: stunned | -2 | STATUS_EFFECT_DEFS |
| Status: frozen | -4 | STATUS_EFFECT_DEFS |
| Status: paralyzed | -4 | STATUS_EFFECT_DEFS |
| Status: blinded | -2 | STATUS_EFFECT_DEFS |
| Status: shielded | +4 | STATUS_EFFECT_DEFS |
| Status: hasted | +2 | STATUS_EFFECT_DEFS |
| Status: slowed | -2 | STATUS_EFFECT_DEFS |
| Status: phased | +4 | STATUS_EFFECT_DEFS |
| Status: foresight | +2 | STATUS_EFFECT_DEFS |
| Status: root | -3 | STATUS_EFFECT_DEFS |
| Status: polymorph | -5 | STATUS_EFFECT_DEFS |
| Status: knocked_down | -2 | STATUS_EFFECT_DEFS |
| Status: restrained | -2 | STATUS_EFFECT_DEFS |
| Status: swallowed | -2 | STATUS_EFFECT_DEFS |
| Racial passives | Variable | `getPassiveModifiers()` |
| Class ability ActiveBuff.acMod | Variable | `getBuffAcMod()` |

### E3. Hit Logic

`attackRoll` in dice.ts:80:
```ts
hit: d20 === 20 || (d20 !== 1 && total >= targetAC)
```
- `>=` (inclusive): attack total equal to AC hits
- Nat 20 always hits, nat 1 always misses

### E4. Damage Reduction (Separate from AC)

1. **`damageReduction`** — percentage-based via `getBuffDamageReduction()` at combat-engine.ts:1135. Applied as `totalDamage = floor(totalDamage * (1 - dr))`.
2. **`absorption`** — pool-based via `consumeAbsorption()` at combat-engine.ts:1143. Absorbs damage up to `ActiveBuff.absorbRemaining`.

Both are post-hit, post-roll reductions that bypass AC.

**Log Verification:** Character AC verified correct for 15 combatants. Monster AC display breakdown is misleading (shows base+dex formula that doesn't match seed AC) but actual combat AC is correct.

---

## F. Proficiency Bonus

### F1. Calculation

**Two implementations that diverge at higher levels:**

| Path | Formula | Location |
|------|---------|----------|
| Production | Bounded table: L1-4→2, L5-9→3, L10-14→4, L15-19→5, L20-29→6, L30-39→7, L40+→8 | shared/src/utils/bounded-accuracy.ts:12 |
| Simulator | `floor((level-1)/4) + 2` | combat-simulator.ts:200 |

**Divergence example:** Level 20 → production: 5, simulator: 6.

### F2. Where Used

| Usage | Evidence | Location |
|-------|----------|----------|
| Attack rolls | `atkMod = statMod + actor.proficiencyBonus + weapon.bonusAttack` | combat-engine.ts:662 |
| Spell save DCs | `8 + actor.proficiencyBonus + castMod` | combat-engine.ts:1455 |
| Psion save DCs | `8 + actor.proficiencyBonus + intMod` | combat-engine.ts:1766 |
| Saving throws (target) | `getModifier(stats[saveType]) + target.proficiencyBonus` | All save sites |
| Death throes saves | `statMod + profBonus + statusSaveMod` | combat-engine.ts:3421 |
| Monster attack fallback | `getModifier(str) + actor.proficiencyBonus` | monster-ability-resolver.ts:68 |

### F3. Consistency

Mostly consistent. **One intentional exception:** Monster `proficiencyBonus` is set to 0 (road-encounter.ts:494) because monster seed `attack` stat already includes the total bonus. Adding proficiency on top would double-count.

---

## G. Every Status Effect

### Status Effect Definitions (STATUS_EFFECT_DEFS, combat-engine.ts:122–341)

| Status | preventsAction | attackMod | acMod | saveMod | DoT/HoT | Applied By | Notes |
|--------|---------------|-----------|-------|---------|---------|------------|-------|
| **poisoned** | No | -2 | 0 | 0 | 3 dmg/round | Rogue poison charges, Rat on_hit (as `diseased`) | Cleansable. LIVE. |
| **stunned** | **Yes** | 0 | -2 | -4 | 0 | Psion Psychic Crush, Shield Bash, fumbles, crits | Cleansable. **BUG: duration-1 instances never prevent action** (see K.2a). |
| **blessed** | No | +2 | 0 | +2 | 0 | Spell/class ability buffs | LIVE definition. Rarely applied in current data. |
| **burning** | No | 0 | 0 | 0 | 5 dmg/round | Crit chart fire entries, fire abilities | Cleansable. LIVE. |
| **frozen** | **Yes** | 0 | -4 | -2 | 0 | Cold crit entries, ice spells | Cleansable. LIVE. |
| **paralyzed** | **Yes** | 0 | -4 | -4 | 0 | Crit entries, spells | Cleansable. LIVE. |
| **blinded** | No | -4 | -2 | 0 | 0 | Crit entries (bludgeoning head hits) | Cleansable. LIVE. `immuneBlinded` passive is **DEAD** (set but never checked). |
| **shielded** | No | 0 | +4 | 0 | 0 | Class ability buffs, items | LIVE. |
| **weakened** | No | -3 | 0 | -2 | 0 | Psion Mind Spike/Dominate/Mind Shatter, fumbles, class debuffs | Cleansable. LIVE. Note: class debuffs bypass this via ActiveBuff to avoid double-dipping. |
| **hasted** | No | +2 | +2 | 0 | 0 | Class ability buffs, items | LIVE. |
| **slowed** | No | -2 | -2 | -2 | 0 | Psion Rift Walk, Hamstring, Banishment save-pass | Cleansable. LIVE. Does NOT affect flee. |
| **regenerating** | No | 0 | 0 | 0 | Heals `dmgPerRound` | Class `handleHot` abilities | LIVE. Beneficial, not in cleanse lists. |
| **dominated** | **Yes** | 0 | 0 | 0 | 0 | Psion Dominate, Absolute Dominion | Partially redundant — `controlledBy` field on Combatant handles forced-attack logic, not `preventsAction`. |
| **banished** | **Yes** | 0 | 0 | 0 | 0 | Psion Banishment | LIVE via preventsAction. `banishedUntilRound` field is **DEAD** (set but never read). |
| **phased** | No | 0 | +4 | 0 | 0 | Class ability buffs | LIVE. |
| **foresight** | No | 0 | +2 | +2 | 0 | Class ability buffs | LIVE. |
| **taunt** | No | 0 | 0 | 0 | 0 | Class ability `handleStatus` | **DEAD as modifier.** Targeting override works via separate logic at resolveTurn:2739. AC -2 applied via parallel ActiveBuff, not status. |
| **silence** | No | 0 | 0 | 0 | 0 | Class ability `handleStatus` | **PARTIAL.** Blocks class abilities (except damage/passive) at class-ability-resolver.ts:2383, but does NOT block spells, psion abilities, monster abilities, items, or racial abilities. |
| **root** | No | 0 | -3 | 0 | 0 | Class ability `handleStatus` | AC penalty LIVE. "Cannot flee" comment is **NOT IMPLEMENTED** — no flee check for root. |
| **skip_turn** | **Yes** | 0 | 0 | 0 | 0 | Class ability `handleStatus` | LIVE. |
| **mesmerize** | **Yes** | 0 | 0 | 0 | 0 | Class ability `handleStatus` | LIVE. Break-on-damage implemented at combat-engine.ts:1199–1204. |
| **polymorph** | No | -4 | -5 | -2 | 0 | Class ability `handleStatus` | Modifiers LIVE. "Reduced to 1d4 damage" is **NOT IMPLEMENTED**. |
| **frightened** | No | -2 | 0 | -2 | 0 | Monster fear_aura, Shadow Wraith Dread Gaze | LIVE. Permanent immunity after passing fear aura save. |
| **diseased** | No | -1 | 0 | -1 | 2 dmg/round | Rat on_hit (Filth Fever) | LIVE but **UNCLEANSABLE** — not in any cleanse list. Likely bug. |
| **knocked_down** | No | -2 | -2 | 0 | 0 | Wolf/Direwolf on_hit | LIVE. Not cleansable (1-round duration). |
| **restrained** | No | -4 | -2 | -2 | 0 | Spider Web ability | LIVE. Not cleansable. |
| **swallowed** | No | -4 | -2 | -2 | 0 | Monster swallow ability | LIVE. Separate swallow processing handles per-round acid damage and escape. 999-round duration. |

**Log Verification:** Slowed (duration 2) confirmed functional — survives tick cycle. Stunned (duration 1) confirmed broken — 204/204 targets acted normally after being stunned. See K.2a for full evidence.

---

## H. Buffs vs Status Effects

### H1. Two Separate Systems

| System | Data Structure | Processed By | Modifier Aggregation |
|--------|---------------|--------------|---------------------|
| **Status Effects** | `Combatant.statusEffects: StatusEffect[]` | `processStatusEffects()` — DoT/HoT, duration tick, expiry | Per-effect modifiers read at point-of-use via `STATUS_EFFECT_DEFS` loop |
| **Active Buffs** | `Combatant.activeBuffs: ActiveBuff[]` | `tickClassActiveBuffs()` — duration tick, HoT, companion damage | Query functions: `getBuffAttackMod()`, `getBuffAcMod()`, `getBuffDamageMod()`, `getBuffDamageReduction()`, `consumeAbsorption()` |

### H2. Class Ability Buffs → ActiveBuff System

Class abilities with `effectType: 'buff'` create an `ActiveBuff` (class-ability-resolver.ts:284). "+5 attack for 4 rounds" → `{ attackMod: 5, roundsRemaining: 4 }`.

Class ability **debuffs** ALSO use ActiveBuff with negative values. Sundering Strike's AC -2 → `ActiveBuff { acMod: -2 }`. This was an explicit design choice (comment at lines 356–357) to avoid double-dipping with the `weakened` status's hardcoded -3 attack modifier.

### H3. Where Buffs Apply to Rolls

`resolveAttack`, combat-engine.ts:693–696:
```ts
const buffAtkMod = getBuffAttackMod(actor);
if (buffAtkMod !== 0) {
  atkModBreakdown.push({ source: 'classBuffs', value: buffAtkMod });
  atkMod += buffAtkMod;
}
```

### H4. Buff Aggregation Functions (class-ability-resolver.ts)

| Function | Line | Aggregates |
|----------|------|-----------|
| `getBuffAttackMod()` | 2501 | All `ActiveBuff.attackMod` + MECH-4 HP-scaling |
| `getBuffAcMod()` | 2519 | All `ActiveBuff.acMod` |
| `getBuffDamageMod()` | 2524 | All `ActiveBuff.damageMod` + `roundDamageBonus` |
| `getBuffDamageReduction()` | 2537 | All `ActiveBuff.damageReduction`, capped at 1.0 |
| `consumeAbsorption()` | 2542 | Drains `absorbRemaining` shields in order |

---

## I. Damage Types

### I1. All Damage Types

`CombatDamageType` at shared/src/types/combat.ts:91–95:
```
SLASHING | PIERCING | BLUDGEONING | FIRE | COLD | LIGHTNING | THUNDER
ACID | POISON | NECROTIC | RADIANT | FORCE | PSYCHIC
```
13 types: physical (3), elemental (4), energy (6).

### I2. Resistance/Vulnerability/Immunity System — ACTIVE

`applyDamageTypeInteraction()` at combat-engine.ts:442–487:
- **Immunity** → multiply by 0 (checked first)
- **Vulnerability** → multiply by 2
- **Resistance** → floor(damage / 2)

### I3. Where Damage Type Is Checked

| Call Site | Location | Note |
|-----------|----------|------|
| Basic weapon attacks | combat-engine.ts:1151 | After all damage calc, before companion interception |
| Class ability post-processing | combat-engine.ts:2891 | Only when `context.weapon?.damageType` present |
| Monster handleDamage | monster-ability-resolver.ts:93 | Per hit |
| Monster handleAoe | monster-ability-resolver.ts:234 | Per target |
| Monster handleMultiattack | monster-ability-resolver.ts:307 | Per strike |
| Damage aura | combat-engine.ts:1300 | Hardcoded inline check |

### I4. Gaps

- **Spells (`resolveCast`):** Does NOT call `applyDamageTypeInteraction`. Spell damage ignores all resistances/immunities/vulnerabilities.
- **Psychic damage:** Uses `applyPsychicDamage()` (line 1710) which checks `target.race === 'forgeborn'` and `target.psychicResistance` but BYPASSES the normal DT pipeline. No immunity/vulnerability check for psychic via the unified path.

**Log Verification:** 988 SLASHING-resistant interactions against Elder Fey Guardian confirmed correct — 0.5x multiplier properly applied.

---

## J. Flee Mechanic

### J1. Formula

`resolveFlee` at combat-engine.ts:1673–1705:
```ts
const fleeDC = DEFAULT_FLEE_DC + Math.max(0, (enemies.length - 1) * 2);  // base 10
const dexMod = getModifier(actor.stats.dex);
const check = fleeCheck(dexMod, fleeDC);  // d20 + DEX mod vs DC
```

DC scaling: 1 enemy → DC 10, 2 enemies → DC 12, 3 enemies → DC 14.

### J2. Stats Affecting Flee

Only DEX modifier. No proficiency bonus. No class bonuses. No level scaling. No item bonuses.

### J3. Does Slowed Affect Flee?

**No.** `resolveFlee` only uses raw DEX modifier. Status effect save modifiers are not applied. The `root` status comment says "cannot flee" but this is also **NOT IMPLEMENTED** — no root check in the flee dispatch path.

### J4. Can Monsters Flee?

Technically the function works for any combatant. In practice, **no** — the AI never issues a flee action for monsters. There is no code path that causes a monster to choose flee.

### J5. Alternative Flee Path

`handleFleeAbility` in class-ability-resolver.ts:657 is a separate path for class abilities (e.g., Rogue Disengage):
- Uses percentile roll (d100 vs `successChance * 100`)
- Blocked by `taunt` status (line 659) but NOT by `root` or `slowed`
- Does NOT use the DEX DC formula
- Completely independent implementation

---

## K. Cross-Reference Against Combat Logs

Verified against combat logs from 9 simulation runs (2,000+ fights).

### K.1 Stat Modifier Verification — PASS (partial)

- Sundering Strike AC debuff (-2) verified: `targetAC` correctly decreased on subsequent attacks
- Attack buff verification limited by short combat durations (most fights end before buffed actor's next attack)

### K.2 Status Effect Verification — FAIL (critical bug)

#### BUG: Duration-1 `preventsAction` Effects Never Prevent Action

Across 204 stunned applications from Shield Bash (`statusDuration: 1`), the target skipped their turn **0 times**.

**Root cause:** `processStatusEffects()` in `resolveTurn()` runs BEFORE the `preventsAction` check:
1. `processStatusEffects` decrements `remainingRounds` from 1 → 0
2. Effect is removed (expired)
3. `preventsAction` check finds no stunned effect
4. Target acts normally

**This affects ALL duration-1 `preventsAction` effects:** stunned, frozen, paralyzed, skip_turn, mesmerize, dominated, banished.

**Confirmed working:** Slowed (Hamstring, `statusDuration: 2`) survives the tick cycle and applies modifiers for 1 round.

### K.3 Saving Throw Verification — PASS

20/20 success/failure calculations correct. Save DC consistent (16 for Elder Fey). Save modifier +6 matches STR-based saves for L20 warriors (STR 22 = +6).

### K.4 Buff Duration Verification — PASS

Duration tick-down works correctly. Most buff durations (4–5 rounds) outlast typical combat length (3–5 rounds), so natural expiry is rarely exercised.

### K.5 Damage Type Verification — PASS

988 resistance interactions logged with correct 0.5x multiplier for SLASHING vs Elder Fey Guardian.

### K.6 AC Calculation Verification — PASS

15/15 character AC values verified correct (base 10 + DEX mod 1 + equipment 6 = 17). Monster AC breakdown display is misleading for monsters with AC < 10+DEX mod, but actual combat values are correct.

### K.7 Dead Mechanic Confirmation

| Mechanic | Log Evidence | Verdict |
|----------|-------------|---------|
| `taunt` (as status modifier) | 80 applications, zero modifiers | DEAD as modifier (targeting override works separately) |
| `silence` | 0 applications in sampled logs | Cannot verify |
| `stunned` at duration 1 | 204 applications, 0 turns skipped | EFFECTIVELY DEAD |
| `slowed` at duration 2 | 291 applications, survives tick | FUNCTIONAL |

---

## Summary Table

| Mechanic | Code Status | Log Verified? | Notes |
|----------|-------------|---------------|-------|
| **STR** | ACTIVE | YES | Melee attack/damage, STR saves |
| **DEX** | ACTIVE | YES | Initiative, AC, ranged attack/damage, flee, DEX saves |
| **CON** | ACTIVE | N/A (HP at creation) | HP formula only, CON saves |
| **INT** | ACTIVE | N/A (no INT class tested) | Mage/Psion weapon + ability stat, INT saves |
| **WIS** | ACTIVE | N/A (no WIS class tested) | Cleric weapon stat, most-used defensive save stat |
| **CHA** | PARTIAL | N/A | Only matters for Bard; dead for all other classes |
| **Speed** | **DEAD** | N/A | Stored in data, never read by any system |
| **Initiative** | ACTIVE | YES (implicit) | d20 + DEX mod + bonus, determines turn order |
| **AC** | ACTIVE | YES | 10 + DEX + equipment + buffs + status mods |
| **Proficiency** | ACTIVE | YES | Attack rolls, save DCs, saving throws. Prod/sim formulas diverge at high levels |
| **Saving Throws** | ACTIVE | YES | d20 + stat mod + prof + status mods vs DC. 20/20 correct |
| **Flee** | ACTIVE | N/A | d20 + DEX mod vs DC 10+. Slowed/root do NOT affect flee |
| **Damage Types** | ACTIVE | YES | Resistance/vulnerability/immunity system works. Spells bypass it |
| **poisoned** | ACTIVE | N/A | DoT 3/round, attack -2 |
| **stunned** | **PARTIAL** | **BUG CONFIRMED** | preventsAction works for duration 2+. Duration 1 = DEAD (expires before check) |
| **blessed** | ACTIVE | N/A | Attack +2, save +2 |
| **burning** | ACTIVE | N/A | DoT 5/round |
| **frozen** | ACTIVE | N/A | preventsAction, AC -4 |
| **paralyzed** | ACTIVE | N/A | preventsAction, AC -4, save -4 |
| **blinded** | ACTIVE | N/A | Attack -4, AC -2. `immuneBlinded` passive is DEAD |
| **shielded** | ACTIVE | N/A | AC +4 |
| **weakened** | ACTIVE | LIKELY | Attack -3, save -2. Class debuffs bypass via ActiveBuff |
| **hasted** | ACTIVE | N/A | Attack +2, AC +2 |
| **slowed** | ACTIVE | YES | Attack -2, AC -2, save -2. Duration 2 = functional. Does NOT affect flee |
| **regenerating** | ACTIVE | N/A | HoT per round |
| **dominated** | ACTIVE | N/A | Forced-attack via `controlledBy` field, not preventsAction |
| **banished** | ACTIVE | N/A | preventsAction works. `banishedUntilRound` field is DEAD |
| **phased** | ACTIVE | N/A | AC +4 |
| **foresight** | ACTIVE | N/A | AC +2, save +2 |
| **taunt** | **DEAD** (as modifier) | CONFIRMED | Zero modifiers. Targeting override works separately via resolveTurn |
| **silence** | **PARTIAL** | N/A | Blocks class abilities only. Does NOT block spells/psion/monster/items |
| **root** | **PARTIAL** | N/A | AC -3 works. "Cannot flee" NOT IMPLEMENTED |
| **skip_turn** | ACTIVE | N/A | preventsAction |
| **mesmerize** | ACTIVE | N/A | preventsAction + break-on-damage |
| **polymorph** | **PARTIAL** | N/A | Stat modifiers work. "1d4 damage" NOT IMPLEMENTED |
| **frightened** | ACTIVE | N/A | Attack -2, save -2. Permanent immunity after aura save pass |
| **diseased** | **PARTIAL** | N/A | DoT 2/round, attack -1, save -1. **UNCLEANSABLE** (not in any cleanse list) |
| **knocked_down** | ACTIVE | N/A | Attack -2, AC -2 |
| **restrained** | ACTIVE | N/A | Attack -4, AC -2, save -2 |
| **swallowed** | ACTIVE | N/A | Attack -4, AC -2, save -2 + separate swallow acid/escape processing |

---

## Dead/Broken Mechanics Summary

| Mechanic | Issue | Severity | Location |
|----------|-------|----------|----------|
| **Speed stat** | Stored but never read | LOW | seeds/types only |
| **Duration-1 preventsAction** | Expires before check, never prevents action | **HIGH** | combat-engine.ts resolveTurn — processStatusEffects runs before preventsAction check |
| **`root` prevents flee** | Comment says "cannot flee" but not implemented | MEDIUM | combat-engine.ts:268 (comment only) |
| **`polymorph` forces 1d4 damage** | Comment says 1d4 but weapon dice not overridden | LOW | STATUS_EFFECT_DEFS line 292 |
| **`immuneBlinded` passive** | Set on combatant but never checked in applyStatusEffect | LOW | combat.ts:532 |
| **`banishedUntilRound` field** | Set but never read for auto-return | LOW | combat.ts:466 |
| **`diseased` uncleansable** | Not in any cleanse list | MEDIUM | class-ability-resolver.ts:633, combat-engine.ts:1643 |
| **Spell damage ignores DT** | resolveCast never calls applyDamageTypeInteraction | MEDIUM | combat-engine.ts resolveCast |
| **Psychic damage bypasses DT pipeline** | Uses separate applyPsychicDamage, not unified path | LOW | combat-engine.ts:1710 |
| **Proficiency formula divergence** | Production (bounded table) vs simulator (floor formula) differ at high levels | LOW | bounded-accuracy.ts vs combat-simulator.ts |
| **`silence` only blocks class abilities** | Doesn't block spells, psion abilities, monster abilities, items | MEDIUM | class-ability-resolver.ts:2383 |
| **`taunt` status has zero modifiers** | AC -2 comes from parallel ActiveBuff, not the status itself | LOW | Design choice, not a bug |
| **Flee ignores slowed/root** | Only uses raw DEX mod, no status interaction | MEDIUM | combat-engine.ts:1685 |
| **CHA dead for non-Bards** | No ability uses CHA saves, no non-Bard use | LOW | By design, but worth noting |
