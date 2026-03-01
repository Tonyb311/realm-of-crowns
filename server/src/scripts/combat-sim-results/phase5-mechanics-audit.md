# Phase 5 Mechanics Gap Audit

**Date:** 2026-03-01
**Auditor:** Claude Opus 4.6 (read-only audit)
**Scope:** Complete inventory of ability mechanics defined in game data but silently ignored by the combat engine

---

## 1. Complete Ignored Mechanics Inventory

### 1.1 Ability Effect Fields Ignored by Handlers

These fields exist on ability data objects but are NOT read by the handler that processes them.

| Field | Abilities Using It | Handler | Handler Status | Engine Status | Fix Location | Complexity |
|---|---|---|---|---|---|---|
| `critBonus` | `rog-ass-1` (10), `ran-sha-4` (20), `bar-lor-3` (15) | `handleDamage` | **IGNORED** -- handler never reads `effects.critBonus` | N/A (never reaches engine) | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `autoHit` | `mag-enc-1` | `handleDamage` | **IGNORED** -- handler never reads `effects.autoHit` | Engine has racial autoHit at L523, not class | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `ignoreArmor` | `ran-sha-3` | `handleDamage` | **IGNORED** -- handler never reads `effects.ignoreArmor` | N/A | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `selfDefenseDebuff` | `war-ber-1` | `handleDamage` | **PARTIAL** -- reads `selfAcPenalty` but data uses `selfDefenseDebuff` (-2). Key name mismatch! | N/A | `class-ability-resolver.ts` handleDamage ~L95-98 | TRIVIAL |
| `attackScaling: 'missingHpPercent'` | `war-ber-2` | `handleBuff` | **IGNORED** -- handler stores attackMod from `effects.attackBonus` only; `attackScaling` is dropped | N/A | `class-ability-resolver.ts` handleBuff ~L121-165 | MEDIUM |
| `accuracyBonus` | `ran-sha-1` (3) | `handleDamage` | **IGNORED** -- handler never reads `effects.accuracyBonus` for hit bonus | N/A | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `accuracyPenalty` (on damage type) | `ran-sha-4` (-5) | `handleDamage` | **IGNORED** -- only `handleMultiAttack` reads accuracyPenalty, not `handleDamage` | N/A | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `bonusPerDebuff` | `cle-inq-2` (4) | `handleDamage` | **IGNORED** -- handler never counts target debuffs for bonus damage | N/A | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `requiresStealth` | `rog-ass-4` | `handleDamage` | **IGNORED** -- handler never checks if actor has stealth buff | N/A | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `requiresAnalyze` | `bar-lor-3` | `handleDamage` | **IGNORED** -- handler never checks if target has analyze debuff/buff | N/A | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `damageMultiplier` (on damage type) | `rog-ass-4` (3.0) | `handleDamage` | **IGNORED** -- only `handleAoeDamage` and `handleMultiAttack` read damageMultiplier | N/A | `class-ability-resolver.ts` handleDamage ~L76-119 | SMALL |
| `poisonCharges` | `rog-ass-3` | `handleBuff` | **STORED but DEAD** -- buff is created but no code applies poison DoT on subsequent attacks | `combat-engine.ts` resolveAttack ~L460-833 | `class-ability-resolver.ts` handleBuff + `combat-engine.ts` resolveAttack | MEDIUM |
| `dotDamage` / `dotDuration` | `rog-ass-3` | `handleBuff` | **IGNORED** -- handler never reads these fields from poison blade data | N/A | `class-ability-resolver.ts` handleBuff ~L121-165 | SMALL |
| `stackingAttackSpeed` / `maxStacks` | `rog-swa-5` | `handleBuff` | **STORED but DEAD** -- buff created but no stacking logic exists | `combat-engine.ts` resolveAttack | `class-ability-resolver.ts` handleBuff + `combat-engine.ts` | LARGE |
| `bonusDamageFromYou` | `ran-tra-3` | `handleDebuff` | **IGNORED** -- debuff handler applies weakened status but drops `bonusDamageFromYou` entirely | `combat-engine.ts` resolveAttack ~L460-833 | `class-ability-resolver.ts` handleDebuff + `combat-engine.ts` resolveAttack | MEDIUM |
| `advantage` | `ran-bea-3` | `handleBuff` | **IGNORED** -- handler never reads `effects.advantage` | `combat-engine.ts` resolveAttack ~L525 | `class-ability-resolver.ts` handleBuff + `combat-engine.ts` resolveAttack | MEDIUM |
| `bonusDamageNext` | `bar-lor-1` | `handleBuff` | **PARTIALLY STORED** -- mapped to `damageMod` on buff (L130), which is consumed by `getBuffDamageMod`. But NOT consumed-once (persists for full duration instead of just next attack). | `combat-engine.ts` resolveAttack ~L620-624 | `class-ability-resolver.ts` tickActiveBuffs | SMALL |
| `revealWeakness` | `bar-lor-1` | `handleBuff` | **IGNORED** -- cosmetic field, no mechanical effect exists | N/A | N/A (design decision needed) | TRIVIAL |
| `nextCooldownHalved` | `bar-lor-4` | `handleBuff` | **IGNORED** -- handler never reads this field; no consume-on-next-ability logic exists | `class-ability-resolver.ts` resolveClassAbility ~L1534-1553 | `class-ability-resolver.ts` handleBuff + resolveClassAbility | MEDIUM |
| `healsSelf` / `healsCompanion` | `ran-bea-2` | `handleHeal` | **PARTIALLY HANDLED** -- heals actor OR target based on team, but does NOT heal companion HP on activeBuffs | `class-ability-resolver.ts` handleHeal ~L203-241 | `class-ability-resolver.ts` handleHeal | SMALL |
| `element` | `mag-ele-1,2,3,5`, `mag-nec-2`, `cle-pal-1,3,4,5`, `bar-bat-2,4,6` | Multiple handlers | **COSMETIC ONLY** -- logged in descriptions but never affects damage calculations (no elemental resistances exist) | Engine has no elemental system | N/A (design decision: add elemental or leave cosmetic) | LARGE (if implemented) |
| `bonusVsUndead` | `cle-pal-3` (2.0) | `handleAoeDot` | **EXPLICITLY IGNORED** -- comment at L776: "bonusVsUndead not applied — no undead flag exists on combatants" | N/A (no monster type field on Combatant) | `combat.ts` Combatant type + `combat-engine.ts` | LARGE |
| `initiativeBonus` | `bar-bat-3` | `handleBuff` | **IGNORED** -- handler never reads `effects.initiativeBonus`; initiative is only rolled once at combat start | `combat-engine.ts` rollAllInitiative ~L285-304 | Requires rethinking: initiative is single-roll | TRIVIAL (can't fix meaningfully) |
| `acReduction` (on status type) | `ran-tra-2` | `handleStatus` | **IGNORED** -- status handler maps to `root` status correctly but drops `acReduction` field since status handler doesn't apply separate AC changes | `class-ability-resolver.ts` handleStatus ~L254-272 | `class-ability-resolver.ts` handleStatus | SMALL |

### 1.2 Passive Effect Fields Ignored by `applyPassiveAbilities`

| Field | Abilities Using It | Status in `applyPassiveAbilities` | Expected Behavior | Fix Location | Complexity |
|---|---|---|---|---|---|
| `critChanceBonus` | `rog-ass-6` (15%), `ran-sha-6` (10%) | **IGNORED** -- comment at L1224 says "stored for reference, applied in attack resolution" but NO code in resolveAttack checks it | Should modify crit threshold in resolveAttack | `class-ability-resolver.ts` L1224 + `combat-engine.ts` resolveAttack ~L525-527 | MEDIUM |
| `accuracyBonus` (passive) | `ran-sha-6` (5) | **IGNORED** -- not stored as buff or modifier | Should add to attack modifier | `class-ability-resolver.ts` applyPassiveAbilities ~L1178-1240 | SMALL |
| `holyDamageBonus` | `cle-pal-6` (0.25) | **IGNORED** -- not stored or applied | Should multiply damage of radiant-element abilities by 1.25 | `class-ability-resolver.ts` applyPassiveAbilities + all damage handlers | MEDIUM |
| `antiHealAura` | `cle-inq-6` | **IGNORED** -- not stored or applied | Should prevent enemies from healing while aura is active | `class-ability-resolver.ts` handleHeal + `combat-engine.ts` resolveItem | LARGE |
| `charmEffectiveness` | `bar-dip-6` (0.5) | **IGNORED** -- not stored or applied | Should increase duration/potency of charm/social debuffs | `class-ability-resolver.ts` multiple handlers | MEDIUM |
| `permanentCompanion` / `companionImmune` | `ran-bea-6` | **IGNORED** -- not stored or applied | Companion never expires and cannot take damage | `class-ability-resolver.ts` tickActiveBuffs ~L1267-1313 + `combat-engine.ts` companion interception ~L643-662 | SMALL |
| `firstStrikeCrit` | `ran-tra-6` | **IGNORED** -- not stored or applied | First attack in combat is always a critical hit | `combat-engine.ts` resolveAttack ~L525-527 | SMALL |
| `advantageVsLowHp` / `hpThreshold` | `ran-tra-5` | **IGNORED** -- not stored or applied | Advantage on attacks vs targets below 50% HP | `combat-engine.ts` resolveAttack ~L525-527 | MEDIUM |
| `stackingDamagePerRound` | `bar-bat-5` (3) | **IGNORED** -- not stored as buff or modifier | Each round in combat, damage increases by +3 | `class-ability-resolver.ts` applyPassiveAbilities + `combat-engine.ts` calculateDamage | MEDIUM |
| `goldBonus` | `rog-thi-3` (0.1) | **IGNORED** -- not stored or applied | 10% more gold from combat loot drops | Post-combat loot processing (outside combat engine) | TRIVIAL (out-of-scope for engine) |
| `lootQualityBonus` / `lootQuantityBonus` | `rog-thi-6` (0.25 each) | **IGNORED** -- not stored or applied | Loot improvements from combat | Post-combat loot processing | TRIVIAL (out-of-scope) |
| `xpBonus` | `bar-lor-2` (0.15) | **IGNORED** -- not stored or applied | 15% bonus XP from combat | Post-combat XP calculation | TRIVIAL (out-of-scope) |
| `globalXpBonus` | `bar-lor-6` (0.25) | **IGNORED** -- not stored or applied | 25% bonus XP from all sources | Post-combat XP + other systems | TRIVIAL (out-of-scope) |
| `cooldownReduction` (passive) | `mag-ele-6` (0.3), `mag-enc-6` (1) | **HANDLED** -- fully implemented at L1212-1222 | Working as intended | N/A | N/A |
| `bonusHpFromCon` | `war-gua-6` (0.2) | **HANDLED** -- implemented at L1189-1193 | Working as intended | N/A | N/A |
| `hpRegenPerRound` (passive) | `war-war-4` (3), `bar-dip-3` (3) | **HANDLED** -- implemented as permanent buff at L1196-1205 | Working as intended | N/A | N/A |
| `cheatingDeath` | `war-ber-6` | **HANDLED** -- tracked in usesTracker at L1208-1210 | Working via `checkDeathPrevention` | N/A | N/A |
| `reviveOnDeath` | `mag-nec-6`, `cle-hea-5` | **HANDLED** -- tracked in usesTracker at L1208-1210 | Working via `checkDeathPrevention` | N/A | N/A |
| `dodgeBonus` (passive) | `rog-swa-6` (10) | **STORED** -- stored as buff with `dodgeMod` at L1226-1234 but **dodgeMod is never consumed** (see Section 2) | Dead end | See Section 2 | SMALL |

---

## 2. Dead ActiveBuff Fields

These 6 fields are defined on the `ActiveBuff` interface (`shared/src/types/combat.ts` L183-207), populated by `handleBuff` (`class-ability-resolver.ts` L121-165), but **never consumed** by any combat engine function.

### 2.1 `damageReflect`

- **Set by:** `handleBuff` at `class-ability-resolver.ts` L133 (`damageReflect: (effects.damageReflect as number) ?? undefined`)
- **Abilities that set it:** `war-gua-5` Iron Bulwark (0.3 = 30% reflect)
- **Should be read by:** `combat-engine.ts` `resolveAttack()` ~L584-792, after damage is applied to target, reflect portion back to attacker
- **Expected behavior:** When a combatant with `damageReflect` buff is hit by a melee attack, `floor(totalDamage * damageReflect)` should be dealt back to the attacker. Similar to the Nethkin Infernal Rebuke at L719-728 but from a class buff instead of a racial ability.
- **Additional note:** The `immovable` field from Iron Bulwark is also ignored (no forced movement system exists, so this is cosmetic).
- **Fix complexity:** SMALL (5-10 lines in resolveAttack, after damage application, before HP update)

### 2.2 `guaranteedHits`

- **Set by:** `handleBuff` at `class-ability-resolver.ts` L135 (`guaranteedHits: (effects.guaranteedHits as number) ?? undefined`)
- **Abilities that set it:** `war-war-5` Warlord's Decree (3 guaranteed hits over 3 rounds)
- **Should be read by:** `combat-engine.ts` `resolveAttack()` ~L520-527, where the attack roll is made. If actor has buff with `guaranteedHits > 0`, skip the d20 roll and treat as hit (roll=20, not critical). Decrement `guaranteedHits` each time consumed.
- **Expected behavior:** Next 3 attacks auto-hit (but don't auto-crit). Counter is decremented each attack.
- **Fix complexity:** SMALL (8-12 lines: add `getBuffGuaranteedHits()` query + check in resolveAttack + decrement in buff)

### 2.3 `extraAction`

- **Set by:** `handleBuff` at `class-ability-resolver.ts` L136 (`extraAction: (effects.extraAction as boolean) ?? undefined`)
- **Abilities that set it:** `war-war-3` Tactical Advance, `mag-enc-3` Haste
- **Should be read by:** `combat-engine.ts` `resolveTurn()` ~L2000-2160, after the primary action resolves. If the actor has an `extraAction` buff, they should resolve a second action in the same turn.
- **Expected behavior:** After the primary action resolves, if the combatant has an active buff with `extraAction: true`, grant one additional action (basic attack or ability). Consume the buff after use (set `extraAction: false` or remove the buff).
- **Fix complexity:** MEDIUM (15-25 lines: check after action resolution in resolveTurn, trigger second action, consume buff)
- **Risk:** HIGH -- adding an extra action in the turn loop requires careful handling to avoid infinite loops or state corruption.

### 2.4 `ccImmune`

- **Set by:** `handleBuff` at `class-ability-resolver.ts` L137 (`ccImmune: (effects.ccImmune as boolean) ?? undefined`)
- **Abilities that set it:** `war-ber-5` Berserker Rage
- **Should be read by:**
  1. `combat-engine.ts` `applyStatusEffect()` ~L367-390: Before applying a CC status (stunned, frozen, paralyzed, dominated, mesmerize, polymorph, root, skip_turn), check if target has `ccImmune` buff -- if so, skip the application.
  2. `class-ability-resolver.ts` `handleStatus` and `handleDamageStatus`: Before applying status effects, check target's buffs for ccImmune.
- **Expected behavior:** While Berserker Rage is active, the combatant cannot be stunned, frozen, paralyzed, dominated, mesmerized, polymorphed, rooted, or forced to skip turn.
- **Fix complexity:** SMALL (5-8 lines: add `isBuffCCImmune()` check to `applyStatusEffect()`)

### 2.5 `stealthed`

- **Set by:** `handleBuff` at `class-ability-resolver.ts` L138 (`stealthed: (effects.stealth as boolean) || (effects.untargetable as boolean) || undefined`)
- **Abilities that set it:** `rog-ass-2` Vanish (stealth + untargetable for 1 round)
- **Should be read by:**
  1. `combat-engine.ts` targeting logic: When selecting targets (monster AI, abilities targeting enemies), skip combatants with `stealthed` buff. This would affect bot/AI targeting in simulation and any ability targeting.
  2. `combat-engine.ts` `resolveAttack()`: If target has `stealthed`, attack should auto-miss (similar to Precognitive Dodge logic at L550-582).
  3. `class-ability-resolver.ts` `handleDamage`: For `rog-ass-4` Ambush which `requiresStealth`, the damage handler should check if actor has stealthed buff and apply the 3.0 multiplier.
- **Expected behavior:** Vanish makes the combatant untargetable for 1 round. All attacks against them miss. Ambush (rog-ass-4) only activates with stealth active and deals triple damage.
- **Fix complexity:** MEDIUM (15-20 lines across resolveAttack and handleDamage)

### 2.6 `dodgeMod`

- **Set by:** `handleBuff` at `class-ability-resolver.ts` L131 (`dodgeMod: (effects.dodgeBonus as number) ?? undefined`) and `applyPassiveAbilities` at L1232.
- **Abilities that set it:** `rog-swa-3` Evasion (30%), `bar-bat-3` Marching Cadence (5%), `rog-swa-6` Untouchable passive (10%)
- **Should be read by:** `combat-engine.ts` `resolveAttack()` ~L520-527: After determining that a d20 roll hits, check if target has dodge buffs. Roll a percentile; if roll <= total dodgeMod, the attack is dodged (miss).
- **Expected behavior:** Adds a percentage chance to completely avoid an attack that would otherwise hit. Stacks additively from multiple buffs.
- **Fix complexity:** SMALL (8-12 lines: add `getBuffDodgeMod()` query + dodge roll in resolveAttack after hit determination)

### 2.7 Additional Dead/Unused Fields NOT in Phase 4 List

| Field | Source | Status |
|---|---|---|
| `immovable` (from `war-gua-5`) | `handleBuff` never reads it | No forced movement system exists -- cosmetic only |
| `companionDamage` on buff (auto-damage) | `tickActiveBuffs` L1287 | **WORKING** -- this IS consumed correctly |
| `companionHp` on buff (interception) | `combat-engine.ts` L643-662 | **WORKING** -- this IS consumed correctly |
| `counterDamage` / `trapDamage` / `triggerOn` / `trapAoe` on buff | `combat-engine.ts` L731-791 | **WORKING** -- these ARE consumed correctly |
| `hotPerRound` on buff | `tickActiveBuffs` L1282 | **WORKING** -- this IS consumed correctly |
| `absorbRemaining` on buff | `consumeAbsorption` L1596-1607 | **WORKING** -- this IS consumed correctly |
| `damageReduction` on buff | `getBuffDamageReduction` L1592 | **WORKING** -- this IS consumed correctly |
| `attackMod` on buff | `getBuffAttackMod` L1572 | **WORKING** -- this IS consumed correctly |
| `acMod` on buff | `getBuffAcMod` L1577 | **WORKING** -- this IS consumed correctly |
| `damageMod` on buff | `getBuffDamageMod` L1582 | **WORKING** -- this IS consumed correctly |

---

## 3. Handler-by-Handler Gap Analysis

### 3.1 `handleDamage` (L76-119) -- Handles: `damage` type

**Abilities dispatched to this handler:**
- `war-ber-1` Reckless Strike: `{ bonusDamage: 5, selfDefenseDebuff: -2 }`
- `war-war-2` Commanding Strike: `{ bonusDamage: 3 }`
- `mag-nec-2` Shadow Bolt: `{ element: 'shadow', diceCount: 3, diceSides: 6 }`
- `mag-enc-1` Arcane Bolt: `{ autoHit: true, diceCount: 2, diceSides: 4 }`
- `rog-ass-1` Backstab: `{ critBonus: 10, bonusDamage: 5 }`
- `rog-ass-4` Ambush: `{ requiresStealth: true, damageMultiplier: 3.0 }`
- `cle-pal-1` Smite: `{ element: 'radiant', bonusDamage: 6 }`
- `cle-inq-2` Penance: `{ diceCount: 2, diceSides: 6, bonusPerDebuff: 4 }`
- `ran-sha-1` Aimed Shot: `{ bonusDamage: 6, accuracyBonus: 3 }`
- `ran-sha-3` Piercing Arrow: `{ ignoreArmor: true, diceCount: 2, diceSides: 8 }`
- `ran-sha-4` Headshot: `{ critBonus: 20, accuracyPenalty: -5, diceCount: 4, diceSides: 8 }`
- `bar-lor-3` Exploit Weakness: `{ requiresAnalyze: true, critBonus: 15, diceCount: 3, diceSides: 6 }`

**Fields handler reads:** `bonusDamage`, `diceCount`, `diceSides`, `selfAcPenalty`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `critBonus` | rog-ass-1, ran-sha-4, bar-lor-3 | Crit bonus never applied -- crits are purely d20 nat-20 |
| `autoHit` | mag-enc-1 | Arcane Bolt always misses sometimes despite "never misses" |
| `ignoreArmor` | ran-sha-3 | Piercing Arrow still rolls vs full AC |
| `selfDefenseDebuff` | war-ber-1 | Handler reads `selfAcPenalty` not `selfDefenseDebuff` -- NAME MISMATCH |
| `requiresStealth` | rog-ass-4 | Ambush works without stealth, nullifying Vanish prerequisite |
| `damageMultiplier` | rog-ass-4 | Ambush deals weapon+0 damage instead of 3x |
| `accuracyBonus` | ran-sha-1 | Aimed Shot accuracy bonus is ignored |
| `accuracyPenalty` | ran-sha-4 | Headshot penalty is ignored (only multi_attack reads this) |
| `bonusPerDebuff` | cle-inq-2 | Penance ignores target debuff count |
| `requiresAnalyze` | bar-lor-3 | Exploit Weakness works without Analyze |
| `element` | mag-nec-2, cle-pal-1 | Cosmetic -- no elemental system |

### 3.2 `handleBuff` (L121-165) -- Handles: `buff` type

**Abilities dispatched to this handler:**
- `war-ber-2` Blood Rage: `{ attackScaling: 'missingHpPercent', duration: 5 }`
- `war-ber-5` Berserker Rage: `{ ccImmune: true, attackBonus: 15, duration: 3 }`
- `war-gua-2` Fortify: `{ acBonus: 5, duration: 4 }`
- `war-gua-4` Shield Wall: `{ damageReduction: 0.5, duration: 2 }`
- `war-gua-5` Iron Bulwark: `{ damageReflect: 0.3, immovable: true, duration: 3 }`
- `war-war-1` Rally Cry: `{ attackBonus: 3, acBonus: 2, duration: 4 }`
- `war-war-3` Tactical Advance: `{ extraAction: true }`
- `war-war-5` Warlord's Decree: `{ guaranteedHits: 3, duration: 3 }`
- `mag-ele-4` Elemental Shield: `{ absorbDamage: 30, duration: 4 }`
- `mag-nec-4` Bone Armor: `{ absorbDamage: 25, acBonus: 3, duration: 5 }`
- `mag-enc-3` Haste: `{ extraAction: true, duration: 1 }`
- `rog-ass-2` Vanish: `{ stealth: true, untargetable: true, duration: 1 }`
- `rog-ass-3` Poison Blade: `{ poisonCharges: 3, dotDamage: 4, dotDuration: 3 }`
- `rog-swa-3` Evasion: `{ dodgeBonus: 30, duration: 2 }`
- `rog-swa-5` Dance of Steel: `{ stackingAttackSpeed: true, maxStacks: 5, duration: 5 }`
- `ran-bea-3` Pack Tactics: `{ advantage: true, duration: 1 }`
- `bar-bat-1` War Song: `{ attackBonus: 4, duration: 4 }`
- `bar-bat-3` Marching Cadence: `{ dodgeBonus: 5, initiativeBonus: 3, duration: 5 }`
- `bar-lor-1` Analyze: `{ bonusDamageNext: 8, revealWeakness: true }`
- `bar-lor-4` Arcane Insight: `{ nextCooldownHalved: true }`

**Fields handler reads:** `duration`, `attackBonus`, `acBonus`, `bonusDamage`, `bonusDamageNext`, `dodgeBonus`, `damageReduction`, `damageReflect`, `absorbDamage`, `guaranteedHits`, `extraAction`, `ccImmune`, `stealth`, `untargetable`, `hpRegenPerRound`
**Fields handler IGNORES (drops on the floor):**
| Field | Abilities | Impact |
|---|---|---|
| `attackScaling` | war-ber-2 | Blood Rage gets no attack bonus at all (neither static nor scaling) |
| `immovable` | war-gua-5 | No forced movement system -- cosmetic |
| `poisonCharges` | rog-ass-3 | Poison Blade is a normal buff with no poison effect |
| `dotDamage` | rog-ass-3 | Poison DoT damage lost |
| `dotDuration` | rog-ass-3 | Poison DoT duration lost |
| `stackingAttackSpeed` | rog-swa-5 | Dance of Steel is a normal buff with no stacking |
| `maxStacks` | rog-swa-5 | Max stacks info lost |
| `advantage` | ran-bea-3 | Pack Tactics grants no mechanical advantage |
| `initiativeBonus` | bar-bat-3 | Initiative already rolled -- too late |
| `revealWeakness` | bar-lor-1 | No weakness reveal system |
| `nextCooldownHalved` | bar-lor-4 | Arcane Insight does nothing |

### 3.3 `handleDebuff` (L167-201) -- Handles: `debuff` type

**Abilities dispatched:**
- `cle-inq-1` Denounce: `{ attackReduction: -4, duration: 3 }`
- `mag-enc-2` Enfeeble: `{ attackReduction: -4, acReduction: -3, duration: 3 }`
- `mag-enc-4` Arcane Siphon: `{ attackReduction: -4, duration: 3 }`
- `cle-inq-5` Excommunicate: `{ allStatsReduction: -5, duration: 3 }`
- `ran-tra-3` Hunter's Mark: `{ bonusDamageFromYou: 4, duration: 5 }`
- `bar-dip-1` Charming Words: `{ attackReduction: -3, duration: 3 }`

**Fields handler reads:** `duration`, `attackReduction`, `acReduction`, `allStatsReduction`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `bonusDamageFromYou` | ran-tra-3 | Hunter's Mark bonus damage completely lost -- debuff handler only applies weakened status, no per-attacker bonus tracking |

**Bug note:** The debuff handler applies `weakened` status which gives -3 attack (STATUS_EFFECT_DEFS L158-165). But `attackReduction` values like -4 from Denounce are passed as `damagePerRound` to `applyStatusEffectToState` at L180. This parameter is meant for DoT damage, not attack reduction. The weakened status always applies its hardcoded -3 attack modifier regardless of the ability's `attackReduction` value. **All debuffs effectively give -3 attack instead of their specified values.**

### 3.4 `handleHeal` (L203-241) -- Handles: `heal` type

**Abilities dispatched:**
- `cle-hea-1` Healing Light: `{ diceCount: 2, diceSides: 8, bonusHealing: 3 }`
- `cle-hea-6` Miracle: `{ fullRestore: true, usesPerCombat: 1 }`
- `war-war-6` Legendary Commander: `{ fullRestore: true, usesPerCombat: 1 }`
- `ran-bea-2` Wild Bond: `{ diceCount: 2, diceSides: 6, healsSelf: true, healsCompanion: true }`

**Fields handler reads:** `fullRestore`, `usesPerCombat`, `diceCount`, `diceSides`, `bonusHealing`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `healsSelf` | ran-bea-2 | Handler already defaults to healing actor if no allied target -- partially working by accident |
| `healsCompanion` | ran-bea-2 | Companion HP on activeBuffs never receives healing |

### 3.5 `handlePassive` (L243-252) -- Handles: `passive` type

This is a no-op that returns a description string. All passive mechanics are expected to be applied by `applyPassiveAbilities` at combat start. See Section 1.2 for which passive fields are ignored.

### 3.6 `handleStatus` (L254-272) -- Handles: `status` type

**Abilities dispatched:**
- `war-gua-3` Taunt: `{ statusEffect: 'taunt', statusDuration: 2 }`
- `cle-inq-3` Silence: `{ statusEffect: 'silence', statusDuration: 2 }`
- `mag-enc-5` Polymorph: `{ statusEffect: 'polymorph', statusDuration: 2 }`
- `ran-tra-2` Snare: `{ statusEffect: 'root', acReduction: -3, statusDuration: 2 }`
- `bar-dip-2` Silver Tongue: `{ statusEffect: 'skip_turn', statusDuration: 1 }`
- `bar-dip-5` Enthrall: `{ statusEffect: 'mesmerize', statusDuration: 3 }`

**Fields handler reads:** `statusEffect`, `statusDuration`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `acReduction` | ran-tra-2 | Snare's AC reduction is lost -- only root status applied. Root itself has -3 AC in STATUS_EFFECT_DEFS so by coincidence the value matches, but this is accidental. |

**Engine-level note:** The `taunt` status is defined in STATUS_EFFECT_DEFS (L223-230) but the engine never checks it to force target selection. Taunt is applied but has zero mechanical effect.

### 3.7 `handleDamageStatus` (L274-308) -- Handles: `damage_status` type

**Abilities dispatched:**
- `war-gua-1` Shield Bash: `{ damage: 3, statusEffect: 'stun', statusDuration: 1 }`
- `mag-ele-2` Frost Lance: `{ element: 'ice', diceCount: 2, diceSides: 8, statusEffect: 'slow', statusDuration: 2 }`

**Fields handler reads:** `damage`, `diceCount`, `diceSides`, `statusEffect`, `statusDuration`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `element` | mag-ele-2 | Cosmetic only |

### 3.8 `handleDamageDebuff` (L310-340) -- Handles: `damage_debuff` type

**Abilities dispatched:**
- `bar-bat-4` Shatter: `{ element: 'sonic', diceCount: 3, diceSides: 6, acReduction: -4, duration: 3 }`

**Fields handler reads:** `diceCount`, `diceSides`, `acReduction`, `duration`
**Fields handler note:** Applies `weakened` status for the AC reduction, which works via STATUS_EFFECT_DEFS but conflates attack debuff with AC debuff. The `weakened` status gives -3 attack but +0 AC modifier -- so the intended AC reduction is NOT applied via the status; instead it would need direct AC modification.

### 3.9 `handleDrain` (L342-372) -- Handles: `drain` type

**Abilities dispatched:**
- `mag-nec-1` Life Drain: `{ diceCount: 2, diceSides: 6, healPercent: 0.5 }`
- `cle-pal-4` Judgment: `{ element: 'radiant', diceCount: 3, diceSides: 8, healPercent: 0.5 }`

**Fields handler reads:** `diceCount`, `diceSides`, `healPercent`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `element` | cle-pal-4 | Cosmetic only |

**Bug note:** The `healPercent` is divided by 100 at L352 (`healPercent / 100`), but the data value is already a fraction (0.5, meaning 50%). So `0.5 / 100 = 0.005`, healing only 0.5% of damage dealt instead of 50%. **Life Drain and Judgment heal almost nothing.** The fix should be `Math.floor(totalDamage * healPercent)` without dividing by 100.

### 3.10 `handleHot` (L374-390) -- Handles: `hot` type

**Abilities dispatched:**
- `cle-hea-3` Regeneration: `{ healPerRound: 5, duration: 5 }`

**Fields handler reads:** `healPerRound`, `duration`
**No gaps.** Fully functional.

### 3.11 `handleCleanse` (L392-417) -- Handles: `cleanse` type

**Abilities dispatched:**
- `cle-hea-2` Purify: `{ removeCount: 1 }`

**Fields handler reads:** `removeCount`
**No gaps.** Fully functional.

### 3.12 `handleFleeAbility` (L419-438) -- Handles: `flee` type

**Abilities dispatched:**
- `rog-thi-4` Disengage: `{ successChance: 0.9 }`

**Fields handler reads:** `successChance`
**Bug note:** `successChance` is 0.9 (90%) but the handler multiplies by 100 for display while comparing `roll(100) <= successChance`. Since `roll(100)` returns 1-100 and `successChance` is 0.9, the flee ALWAYS FAILS (any roll > 0.9 = always). Should be `roll(100) <= successChance * 100` or `Math.random() < successChance`.

### 3.13 `handleAoeDebuff` (L440-459) -- Handles: `aoe_debuff` type

**Abilities dispatched:**
- `rog-thi-2` Smoke Bomb: `{ accuracyReduction: -5, duration: 2 }`

**Fields handler reads:** `accuracyReduction`, `duration`
**Handler note:** Maps to `blinded` status which gives -4 attack, -2 AC. The `accuracyReduction` value (-5) is used in the description but the actual debuff is hardcoded to blinded's stats. Minor mismatch.

### 3.14 `handleAoeDamage` (L469-542) -- Handles: `aoe_damage` type

**Abilities dispatched:**
- `war-ber-3` Cleave: `{ targets: 'all_adjacent', damageMultiplier: 0.8 }`
- `mag-ele-1` Fireball: `{ element: 'fire', diceCount: 3, diceSides: 6 }`
- `mag-nec-3` Corpse Explosion: `{ requiresCorpse: true, diceCount: 4, diceSides: 6 }`
- `mag-ele-5` Meteor Strike: `{ element: 'fire', diceCount: 6, diceSides: 8 }`
- `cle-pal-5` Divine Wrath: `{ element: 'radiant', diceCount: 5, diceSides: 8 }`
- `ran-sha-5` Rain of Arrows: `{ hitsPerTarget: 2, diceCount: 2, diceSides: 8 }`
- `bar-bat-6` Epic Finale: `{ element: 'sonic', baseDice: 4, diceSides: 8, bonusPerRound: 5 }`

**Fields handler reads:** `requiresCorpse`, `damageMultiplier`, `hitsPerTarget`, `baseDice`, `bonusPerRound`, `diceCount`, `diceSides`, `element`
**No critical gaps.** This handler is the most complete.

### 3.15 `handleMultiTarget` (L544-589) -- Handles: `multi_target` type

**Abilities dispatched:**
- `mag-ele-3` Chain Lightning: `{ element: 'lightning', targets: 3, diceCount: 2, diceSides: 6 }`
- `ran-sha-2` Multi-Shot: `{ targets: 3, diceCount: 1, diceSides: 8 }`

**Fields handler reads:** `targets`, `diceCount`, `diceSides`, `element`
**No gaps.** Fully functional.

### 3.16 `handleMultiAttack` (L591-667) -- Handles: `multi_attack` type

**Abilities dispatched:**
- `war-ber-4` Frenzy: `{ strikes: 2, accuracyPenalty: -3 }`
- `rog-swa-2` Dual Strike: `{ strikes: 2, damageMultiplier: 0.7 }`
- `rog-swa-4` Flurry of Blades: `{ strikes: 4, damageMultiplier: 0.4 }`

**Fields handler reads:** `strikes`, `accuracyPenalty`, `damageMultiplier`
**No gaps.** Fully functional.

### 3.17 `handleAoeDrain` (L669-718) -- Handles: `aoe_drain` type

**Abilities dispatched:**
- `mag-nec-5` Soul Harvest: `{ diceCount: 3, diceSides: 8, healPerTarget: 8 }`

**Fields handler reads:** `diceCount`, `diceSides`, `healPerTarget`
**No gaps.** Fully functional.

### 3.18 `handleDispelDamage` (L720-767) -- Handles: `dispel_damage` type

**Abilities dispatched:**
- `cle-inq-4` Purging Flame: `{ damagePerBuff: 8 }`

**Fields handler reads:** `damagePerBuff`
**No gaps.** Fully functional.

### 3.19 `handleAoeDot` (L769-794) -- Handles: `aoe_dot` type

**Abilities dispatched:**
- `cle-pal-3` Consecrate: `{ element: 'radiant', damagePerRound: 6, duration: 3, bonusVsUndead: 2.0 }`

**Fields handler reads:** `damagePerRound`, `duration`, `element`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `bonusVsUndead` | cle-pal-3 | Explicitly noted as ignored (L776 comment). No `monsterType` field on Combatant. |

### 3.20 `handleDelayedDamage` (L796-834) -- Handles: `delayed_damage` type

**Abilities dispatched:**
- `rog-ass-5` Death Mark: `{ delay: 3, diceCount: 8, diceSides: 6 }`

**Fields handler reads:** `delay`, `diceCount`, `diceSides`
**No gaps.** Fully functional.

### 3.21 `handleSteal` (L838-853) -- Handles: `steal` type

**Abilities dispatched:**
- `rog-thi-1` Pilfer: `{ goldRange: [5, 20] }`

**Fields handler reads:** `goldRange`
**No gaps.** Fully functional (gold tracking is out-of-combat-engine-scope).

### 3.22 `handleDamageSteal` (L855-879) -- Handles: `damage_steal` type

**Abilities dispatched:**
- `rog-thi-5` Mug: `{ diceCount: 3, diceSides: 6, stealItem: true }`

**Fields handler reads:** `diceCount`, `diceSides`, `stealItem`
**No gaps.** Fully functional.

### 3.23 `handleCompanionAttack` (L881-912) -- Handles: `companion_attack` type

**Abilities dispatched:**
- `ran-bea-4` Bestial Fury: `{ diceCount: 4, diceSides: 8 }`

**Fields handler reads:** `diceCount`, `diceSides`
**No gaps.** Fully functional.

### 3.24 `handleSpecial` (L997-1005) -- Handles: `special` type

**Abilities dispatched:**
- `bar-dip-4` Diplomat's Gambit: `{ peacefulEnd: true, successChance: 0.5 }`
- `bar-lor-5` Tome of Secrets: `{ randomClassAbility: true, powerLevel: 'high' }`

**Fields handler reads (Gambit):** `peacefulEnd`, `successChance`
**Fields handler reads (Tome):** `randomClassAbility`
**Fields handler IGNORES:**
| Field | Abilities | Impact |
|---|---|---|
| `powerLevel` | bar-lor-5 | Cosmetic -- Tome pool is hardcoded regardless |

### 3.25 `handleCounter` (L1009-1031) -- Handles: `counter` type

**Abilities dispatched:**
- `rog-swa-1` Riposte: `{ counterDamage: 8, triggerOn: 'melee_attack' }`

**Fields handler reads:** `counterDamage`, `triggerOn`
**No gaps.** Fully functional.

### 3.26 `handleTrap` (L1033-1057) -- Handles: `trap` type

**Abilities dispatched:**
- `ran-tra-1` Lay Trap: `{ trapDamage: 10, triggerOn: 'attacked' }`
- `ran-tra-4` Explosive Trap: `{ trapDamage: 25, aoe: true, triggerOn: 'attacked' }`

**Fields handler reads:** `trapDamage`, `aoe`, `triggerOn`
**No gaps.** Fully functional.

### 3.27 `handleSummon` (L1061-1088) -- Handles: `summon` type

**Abilities dispatched:**
- `ran-bea-1` Call Companion: `{ companionDamage: 5, duration: 5 }`
- `ran-bea-5` Alpha Predator: `{ companionDamage: 12, companionHp: 50, duration: 8 }`

**Fields handler reads:** `companionDamage`, `duration`, `companionHp`
**No gaps.** Fully functional.

---

## 4. Engine Consumption Point Map

### 4.1 `resolveAttack()` (combat-engine.ts L460-833)

**Currently checks from class system:**
- `getBuffAttackMod(actor)` -- attack modifier from buffs (L514-518) -- **WORKING**
- `getBuffAcMod(target)` via `calculateAC()` (L339) -- AC modifier from buffs -- **WORKING**
- `getBuffDamageMod(actor)` -- damage modifier from buffs (L620-624) -- **WORKING**
- `getBuffDamageReduction(target)` -- DR from buffs (L627-632) -- **WORKING**
- `consumeAbsorption(target)` -- absorption shields (L635-640) -- **WORKING**
- Companion interception (L643-662) -- **WORKING**
- Counter/Trap reactive triggers (L731-791) -- **WORKING**
- Class death prevention (L700-716) -- **WORKING**

**Should ALSO check:**
| Mechanic | Data Path | Check Location | Expected Behavior |
|---|---|---|---|
| `guaranteedHits` | `actor.activeBuffs[].guaranteedHits` | Before attack roll ~L520-527 | If `guaranteedHits > 0`, auto-hit (treat as roll 20 non-crit). Decrement counter. |
| `dodgeMod` | `target.activeBuffs[].dodgeMod` | After hit determination ~L527 | Roll percentile; if <= total dodgeMod, convert hit to miss. |
| `damageReflect` | `target.activeBuffs[].damageReflect` | After damage application ~L673-697 | `floor(totalDamage * damageReflect)` dealt back to attacker. |
| `stealthed` | `target.activeBuffs[].stealthed` | Before attack roll ~L520 | If target is stealthed, attack auto-misses (similar to Precognitive Dodge). |
| `ccImmune` | `target.activeBuffs[].ccImmune` | N/A in resolveAttack (see applyStatusEffect) | Not needed here. |
| `critChanceBonus` | Combatant field (from passive) | After d20 roll ~L525-527 | Expand crit range: if `roll >= 20 - critChanceBonus/5`, treat as crit. Or add percentage check. |
| `firstStrikeCrit` | Combatant field (from passive) | At start of attack, if round === 1 and first attack | Force crit on first attack. |
| `advantageVsLowHp` | Combatant field (from passive) | Before attack roll ~L520 | If target HP < 50%, roll twice and take higher. |

### 4.2 `calculateAC()` (combat-engine.ts L309-342)

**Currently checks from class system:**
- `getBuffAcMod(combatant)` (L339) -- **WORKING**

**No additional gaps** -- AC from buffs is correctly consumed.

### 4.3 `applyStatusEffect()` (combat-engine.ts L367-390)

**Currently checks:** Nothing from class buffs.

**Should ALSO check:**
| Mechanic | Check Location | Expected Behavior |
|---|---|---|
| `ccImmune` | Before applying any CC status effect ~L374 | Query target's activeBuffs for `ccImmune`. If true, skip application of: stunned, frozen, paralyzed, dominated, mesmerize, polymorph, root, skip_turn. |

### 4.4 `processStatusEffects()` (combat-engine.ts L397-455)

**No class system gaps.** Status ticks work correctly.

### 4.5 `resolveTurn()` (combat-engine.ts L1812-2189)

**Currently checks from class system:**
- `tickClassAbilityCooldowns(actor)` (L1851) -- **WORKING**
- `tickClassActiveBuffs(actor, enemies)` (L1853) -- **WORKING**
- `tickDelayedEffects(state, actor)` (L1897) -- **WORKING**
- Class ability dispatch via `resolveClassAbility()` (L2134) -- **WORKING**

**Should ALSO check:**
| Mechanic | Check Location | Expected Behavior |
|---|---|---|
| `extraAction` | After primary action resolution ~L2160 | If actor has buff with `extraAction: true`, resolve a second action. Consume the buff. |
| `taunt` enforcement | During action resolution ~L2002-2008 | If actor has `taunt` status, force their target to be the taunt source. Override `action.targetId`. |

### 4.6 `rollAllInitiative()` (combat-engine.ts L285-304)

**Currently checks:** Nothing from class system.

**Could check:** Danger Sense initiative bonus (psi-see-2), but psion passives are handled separately. No class ability initiative bonuses currently exist that aren't in the psion system.

---

## 5. Implementation Groups

### Group A: Handler-Only Fixes (handler needs to read a field it currently ignores)

These require changes ONLY in `class-ability-resolver.ts` handlers:

1. **`selfDefenseDebuff` name mismatch** in `handleDamage` -- read `effects.selfDefenseDebuff` in addition to `effects.selfAcPenalty` (war-ber-1)
2. **`accuracyBonus` / `accuracyPenalty`** in `handleDamage` -- read and apply as hit modifier (ran-sha-1, ran-sha-4)
3. **`bonusPerDebuff`** in `handleDamage` -- count target debuffs and add bonus damage (cle-inq-2)
4. **`damageMultiplier`** in `handleDamage` -- apply multiplier to total damage (rog-ass-4)
5. **`attackScaling: 'missingHpPercent'`** in `handleBuff` -- compute attack bonus from missing HP percentage (war-ber-2)
6. **`poisonCharges` / `dotDamage` / `dotDuration`** in `handleBuff` -- store poison data on buff for consumption (rog-ass-3)
7. **`advantage`** in `handleBuff` -- store advantage flag on buff for engine consumption (ran-bea-3)
8. **`bonusDamageFromYou`** in `handleDebuff` -- store per-attacker bonus on target (ran-tra-3)
9. **`healsCompanion`** in `handleHeal` -- heal companion HP on activeBuffs (ran-bea-2)
10. **`acReduction`** in `handleStatus` -- apply direct AC modification (ran-tra-2; though coincidentally same value as root status)
11. **`nextCooldownHalved`** in `handleBuff` -- store flag for consumption in resolveClassAbility (bar-lor-4)
12. **`healPercent` division bug** in `handleDrain` -- fix `healPercent / 100` to just `healPercent` since value is already 0-1 (mag-nec-1, cle-pal-4)
13. **`successChance` comparison bug** in `handleFleeAbility` -- fix `roll(100) <= successChance` to `roll(100) <= successChance * 100` (rog-thi-4)

### Group B: Engine Consumption Fixes (engine needs to check a buff/status field it currently ignores)

These require changes ONLY in `combat-engine.ts`:

1. **`damageReflect`** in `resolveAttack` -- reflect damage back to attacker from target's buffs
2. **`guaranteedHits`** in `resolveAttack` -- auto-hit check + decrement
3. **`dodgeMod`** in `resolveAttack` -- dodge roll after hit determination
4. **`stealthed`** in `resolveAttack` -- auto-miss if target is stealthed
5. **`ccImmune`** in `applyStatusEffect` -- block CC application
6. **`taunt`** in `resolveTurn` -- force target to be taunt source

### Group C: New Infrastructure (mechanic requires a new system that doesn't exist)

1. **`extraAction` system** -- requires extra-turn logic in resolveTurn. The most complex single addition because it needs to avoid infinite loops, handle action selection for the extra turn, and deal with buff consumption.
2. **`poisonCharges` consumption on attack** -- requires a new check in resolveAttack that finds poison-charge buffs on the attacker, applies DoT to the target, and decrements the charge counter. New mechanic type.
3. **`stackingAttackSpeed` system** -- requires per-hit tracking in resolveAttack: on each successful hit, increment a counter on the buff and increase attack speed (translate to bonus attack roll or extra strikes). Complex scaling mechanic.
4. **`stackingDamagePerRound` system** -- requires a per-round damage accumulator on the Combatant, incremented each turn in resolveTurn.
5. **`critChanceBonus` system** -- requires expanding crit range beyond nat-20. Need a `getCritThreshold()` function that checks passive bonuses.
6. **`firstStrikeCrit` system** -- requires tracking "first attack" state per combatant.
7. **`advantageVsLowHp` system** -- requires roll-twice-take-higher logic in resolveAttack conditioned on target HP.
8. **`bonusVsUndead` / `monsterType` system** -- requires adding `monsterType` field to Combatant interface and checking in damage calculation.
9. **`antiHealAura` system** -- requires checking enemy passives before any heal is applied (in handleHeal, resolveItem, processStatusEffects HoT).
10. **`permanentCompanion` / `companionImmune` system** -- requires modifying tickActiveBuffs to skip duration decrement and interception damage.
11. **`holyDamageBonus` system** -- requires checking element on abilities and multiplying radiant damage.
12. **`charmEffectiveness` system** -- requires modifying debuff duration/potency when actor has this passive.

### Group D: Cross-Cutting (needs changes in both handler AND engine)

1. **`autoHit`** for Arcane Bolt (mag-enc-1): handler must flag the attack, engine must skip attack roll for flagged class abilities.
2. **`ignoreArmor`** for Piercing Arrow (ran-sha-3): handler must flag the attack, engine must set target AC to base 10 for that attack.
3. **`critBonus`** for Backstab/Headshot/Exploit Weakness: handler must flag crit bonus, engine must expand crit range.
4. **`requiresStealth`** for Ambush (rog-ass-4): handler must check stealth buff (Group A), AND engine must support stealthed state (Group B).
5. **`bonusDamageNext`** consume-once for Analyze (bar-lor-1): handler stores it as damageMod (working), but needs to be consumed after one attack (engine change to consume buff's damageMod after first use).
6. **`nextCooldownHalved`** for Arcane Insight (bar-lor-4): handler must set flag (Group A), resolveClassAbility must check and consume it when setting cooldowns.

---

## 6. Recommended Implementation Order

Ordered by: unblocks most abilities, lowest risk, highest impact.

### Batch 1: Bug Fixes (CRITICAL -- Fix incorrect behavior before adding new)

| # | Mechanic | Fix Description | Affected Abilities | Complexity | Risk |
|---|---|---|---|---|---|
| 1.1 | `healPercent` division bug | Change `healPercent / 100` to `healPercent` at L352 | mag-nec-1, cle-pal-4 | TRIVIAL (1 line) | LOW |
| 1.2 | `selfDefenseDebuff` name mismatch | Add `effects.selfDefenseDebuff` fallback at L95 | war-ber-1 | TRIVIAL (1 line) | LOW |
| 1.3 | `successChance` flee comparison | Fix `roll(100) <= successChance` to `roll(100) <= successChance * 100` at L424 | rog-thi-4 | TRIVIAL (1 line) | LOW |
| 1.4 | `debuff attackReduction` misuse | Fix handleDebuff to not pass attackReduction as damagePerRound; instead create a proper debuff system or use custom status | All debuff abilities | MEDIUM (15-20 lines) | MEDIUM |

### Batch 2: Dead ActiveBuff Field Consumption (HIGH IMPACT -- unlocks 6+ abilities each)

| # | Mechanic | Fix Description | Affected Abilities | Complexity | Risk |
|---|---|---|---|---|---|
| 2.1 | `ccImmune` | Add check in applyStatusEffect: if target has ccImmune buff, block CC statuses | war-ber-5 | SMALL (5 lines) | LOW |
| 2.2 | `guaranteedHits` | Add `getBuffGuaranteedHits()` query + check in resolveAttack + decrement | war-war-5 | SMALL (10 lines) | LOW |
| 2.3 | `dodgeMod` | Add `getBuffDodgeMod()` query + dodge roll in resolveAttack | rog-swa-3, bar-bat-3, rog-swa-6 | SMALL (10 lines) | LOW |
| 2.4 | `damageReflect` | Add reflect logic in resolveAttack after damage application | war-gua-5 | SMALL (8 lines) | LOW |
| 2.5 | `stealthed` | Add stealthed check in resolveAttack (auto-miss) | rog-ass-2 (enables rog-ass-4) | SMALL (8 lines) | LOW |

### Batch 3: handleDamage Enrichment (unlocks 9 damage abilities)

| # | Mechanic | Fix Description | Affected Abilities | Complexity | Risk |
|---|---|---|---|---|---|
| 3.1 | `critBonus` | Read effects.critBonus, pass to weapon or flag for expanded crit range | rog-ass-1, ran-sha-4, bar-lor-3 | SMALL (5-8 lines) | LOW |
| 3.2 | `autoHit` | Read effects.autoHit, skip attack roll when true | mag-enc-1 | SMALL (3 lines) | LOW |
| 3.3 | `ignoreArmor` | Read effects.ignoreArmor, use base AC 10 for the attack | ran-sha-3 | SMALL (5 lines) | LOW |
| 3.4 | `accuracyBonus`/`Penalty` | Read effects.accuracyBonus, add to attack roll modifier | ran-sha-1, ran-sha-4 | SMALL (5 lines) | LOW |
| 3.5 | `bonusPerDebuff` | Count target debuffs, add bonus damage | cle-inq-2 | SMALL (5 lines) | LOW |
| 3.6 | `damageMultiplier` | Apply multiplier to total damage | rog-ass-4 | SMALL (3 lines) | LOW |
| 3.7 | `requiresStealth` | Check if actor has stealthed buff; if not, reduce/block damage | rog-ass-4 | SMALL (5 lines) | LOW |
| 3.8 | `requiresAnalyze` | Check if target has Analyze buff from this actor | bar-lor-3 | SMALL (5 lines) | LOW |

### Batch 4: Passive Abilities (unlocks 10+ passives)

| # | Mechanic | Fix Description | Affected Abilities | Complexity | Risk |
|---|---|---|---|---|---|
| 4.1 | `critChanceBonus` | Store on combatant, check in resolveAttack to expand crit range | rog-ass-6, ran-sha-6 | MEDIUM (10-15 lines) | LOW |
| 4.2 | `accuracyBonus` (passive) | Store on combatant via buff, consumed by getBuffAttackMod | ran-sha-6 | SMALL (5 lines) | LOW |
| 4.3 | `firstStrikeCrit` | Store flag, check in resolveAttack if round===1 and first attack | ran-tra-6 | SMALL (8 lines) | LOW |
| 4.4 | `permanentCompanion`/`companionImmune` | Skip duration decrement + immune to interception | ran-bea-6 | SMALL (5 lines) | LOW |
| 4.5 | `stackingDamagePerRound` | Add `roundDamageBonus` field to Combatant, increment each round | bar-bat-5 | MEDIUM (10-15 lines) | LOW |
| 4.6 | `advantageVsLowHp` | Store flag, roll twice in resolveAttack when target < threshold HP | ran-tra-5 | MEDIUM (10 lines) | LOW |

### Batch 5: Complex New Mechanics (HIGH complexity, handle last)

| # | Mechanic | Fix Description | Affected Abilities | Complexity | Risk |
|---|---|---|---|---|---|
| 5.1 | `extraAction` | Add extra-action processing in resolveTurn after primary action | war-war-3, mag-enc-3 | LARGE (25+ lines) | HIGH |
| 5.2 | `poisonCharges` | Store charges on buff, consume in resolveAttack, apply DoT | rog-ass-3 | MEDIUM (15-20 lines) | MEDIUM |
| 5.3 | `attackScaling: 'missingHpPercent'` | Compute attackMod based on missing HP ratio each turn | war-ber-2 | MEDIUM (10-15 lines) | LOW |
| 5.4 | `stackingAttackSpeed` | Per-hit counter on buff, translates to bonus strikes or attack bonus | rog-swa-5 | LARGE (25+ lines) | HIGH |
| 5.5 | `bonusDamageFromYou` | Track per-attacker bonus on target, check in resolveAttack | ran-tra-3 | MEDIUM (15 lines) | MEDIUM |
| 5.6 | `antiHealAura` | Check enemy aura before any heal | cle-inq-6 | MEDIUM (15 lines) | MEDIUM |
| 5.7 | `holyDamageBonus` | Check actor passive, multiply radiant-element ability damage by 1.25 | cle-pal-6 | MEDIUM (10 lines) | LOW |
| 5.8 | `charmEffectiveness` | Multiply debuff duration when actor has passive | bar-dip-6 | SMALL (5 lines) | LOW |
| 5.9 | `taunt` enforcement | Force target selection to taunt source in resolveTurn | war-gua-3 | MEDIUM (10-15 lines) | MEDIUM |
| 5.10 | `bonusDamageNext` consume-once | Consume damageMod from Analyze buff after first attack | bar-lor-1 | SMALL (8 lines) | LOW |
| 5.11 | `nextCooldownHalved` | Consume flag when setting cooldown in resolveClassAbility | bar-lor-4 | SMALL (8 lines) | LOW |

---

## 7. Scenario Unlocks

### After Batch 1 (Bug Fixes)

All existing scenarios become more accurate. In particular:
- Drain-type abilities (mag-nec-1, cle-pal-4) now heal properly
- Debuff abilities apply correct attack reduction values
- Disengage (rog-thi-4) actually has 90% success rate

### After Batch 2 (Dead Buff Field Consumption)

The following Phase 4 deferred scenarios become fully testable:

| Scenario | From Phase 4 | Unblocked By |
|---|---|---|
| P2 S22: `guardian-tank` | Shield Wall + Iron Bulwark + Fortify | `damageReflect` (2.4) |
| P2 S26: `warlord-leader` | Warlord's Decree | `guaranteedHits` (2.2) |
| P2 S23: `berserker-rage` | Berserker Rage CC immune | `ccImmune` (2.1) |
| P2 S24: `assassin-stealth` | Vanish + Ambush chain | `stealthed` (2.5) |
| P2 S25: `swashbuckler-dance` | Evasion dodge buff | `dodgeMod` (2.3) |

### After Batch 3 (handleDamage Enrichment)

| Scenario | Unblocked By |
|---|---|
| P2 S24: `assassin-stealth` (full) | `critBonus` (3.1) + `requiresStealth` (3.7) + `damageMultiplier` (3.6) |
| New: `sharpshooter-precision` | `autoHit` (3.2) + `ignoreArmor` (3.3) + `accuracyBonus` (3.4) |
| New: `inquisitor-punish` | `bonusPerDebuff` (3.5) |
| New: `arcane-bolt-reliable` | `autoHit` (3.2) |

### After Batch 4 (Passives)

| Scenario | Unblocked By |
|---|---|
| P2 S25: `swashbuckler-dance` (full) | `critChanceBonus` (4.1 via rog-ass-6), passive dodge (already 2.3) |
| New: `master-tracker` | `firstStrikeCrit` (4.3), `advantageVsLowHp` (4.6) |
| New: `spirit-bond-companion` | `permanentCompanion`/`companionImmune` (4.4) |
| New: `battlechanter-crescendo` | `stackingDamagePerRound` (4.5) |
| New: `eagles-eye-sniper` | `critChanceBonus` + passive `accuracyBonus` (4.1+4.2) |

### After Batch 5 (Complex Mechanics)

| Scenario | Unblocked By |
|---|---|
| P2 S26: `warlord-leader` (full) | `extraAction` (5.1) + `guaranteedHits` (2.2) |
| P2 S28: `enchanter-control` | `extraAction` (5.1 via Haste) |
| New: `blood-rage-scaling` | `attackScaling` (5.3) |
| New: `poison-assassin` | `poisonCharges` (5.2) + stealth chain (2.5, 3.7) |
| New: `dance-of-steel-flurry` | `stackingAttackSpeed` (5.4) |
| New: `inquisitor-verdict` | `antiHealAura` (5.6) |
| New: `taunt-tank` | `taunt` enforcement (5.9) |
| New: `analyze-exploit` | `bonusDamageNext` consume-once (5.10) + `requiresAnalyze` (3.8) |

---

## 8. Type Changes Needed

### 8.1 `Combatant` Interface Changes (shared/src/types/combat.ts L129-181)

```typescript
// New fields needed:
export interface Combatant {
  // ... existing fields ...

  /** Passive crit chance bonus percentage (e.g., 15 = +15% crit chance) */
  critChanceBonus?: number;
  /** Passive accuracy bonus from passives like Eagle's Eye */
  passiveAccuracyBonus?: number;
  /** First strike in combat is always a critical hit */
  firstStrikeCrit?: boolean;
  /** Whether this combatant has already made their first attack */
  hasAttackedThisCombat?: boolean;
  /** Advantage on attacks vs targets below HP threshold */
  advantageVsLowHp?: boolean;
  /** HP threshold for advantageVsLowHp (e.g., 0.5 = 50%) */
  advantageHpThreshold?: number;
  /** Stacking damage bonus per round (Crescendo) */
  roundDamageBonus?: number;
  /** Holy damage bonus multiplier (Avatar of Light) */
  holyDamageBonus?: number;
  /** Anti-heal aura prevents enemies from healing */
  antiHealAura?: boolean;
  /** Charm effectiveness multiplier (increases debuff duration) */
  charmEffectiveness?: number;
  /** Monster type for bonusVsUndead etc. */
  monsterType?: 'undead' | 'beast' | 'humanoid' | 'elemental' | 'construct' | 'dragon' | null;
}
```

### 8.2 `ActiveBuff` Interface Changes (shared/src/types/combat.ts L183-207)

```typescript
export interface ActiveBuff {
  // ... existing fields ...

  /** Poison charges remaining (consumed on each attack) */
  poisonCharges?: number;
  /** Poison DoT damage per round */
  poisonDotDamage?: number;
  /** Poison DoT duration in rounds */
  poisonDotDuration?: number;
  /** Advantage on next attack */
  advantage?: boolean;
  /** Stacking attack speed: per-hit counter */
  stackingAttackSpeedStacks?: number;
  /** Max stacks for attack speed */
  stackingAttackSpeedMax?: number;
  /** Bonus damage from the user of this debuff (Hunter's Mark) -- on TARGET */
  bonusDamageFromSource?: number;
  /** Source actor ID for bonusDamageFromSource */
  bonusDamageSourceId?: string;
  /** Next cooldown halved flag (Arcane Insight) */
  nextCooldownHalved?: boolean;
  /** Whether this buff's damageMod should be consumed after one use */
  consumeOnUse?: boolean;
}
```

### 8.3 No Changes Needed

- `AttackResult` -- already has `negatedAttack` field for stealthed miss cases
- `ClassAbilityResult` -- already has all needed fields
- `DelayedEffect` -- no changes needed
- `StatusEffect` -- no changes needed (damagePerRound field already reused for various purposes)

---

## Summary Statistics

| Category | Count |
|---|---|
| Total ability effect fields in data | ~85 unique fields across 108 non-psion abilities |
| Fields correctly consumed | ~35 |
| Fields ignored by handler | 22 |
| Fields stored in buff but ignored by engine | 6 |
| Passive fields ignored by applyPassiveAbilities | 13 |
| Cosmetic-only fields (element, etc.) | 5 |
| Out-of-combat fields (goldBonus, xpBonus, lootBonus) | 5 |
| Bug-level issues (wrong behavior, not just missing) | 4 |
| New Combatant fields needed | 12 |
| New ActiveBuff fields needed | 8 |
| Total implementation batches | 5 |
| Estimated total line changes | 300-400 lines across 2 files |
