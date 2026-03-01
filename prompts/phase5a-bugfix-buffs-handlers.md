# Phase 5A: Bug Fixes, Dead Buff Consumption & Handler Enrichment

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed (frontend, backend, game design, narrative, art direction, etc.).
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable. Ensure game mechanics, narrative, UI, and code all align.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed. Don't pad the team.
- Common roles include (but aren't limited to):
  - **Game Designer** — Mechanics, systems, balance, progression, combat
  - **Narrative Designer** — Story, lore, dialogue, quests, world-building
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **UX/UI Designer** — Interface layout, player flow, menus, HUD, accessibility
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review
  - **Art Director** — Visual style, asset guidance, theming, mood and atmosphere

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies (HTML, CSS, JavaScript/TypeScript, Canvas/WebGL where appropriate, and relevant backend stacks).
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Consider both solo and multiplayer implications when relevant.
- Keep scope realistic for a browser game. Avoid over-engineering or suggesting AAA-scale solutions.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together and flags open questions or next steps.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Keep the game's vision consistent across all teammate contributions.
- Always end with a clear summary of what was delivered and what still needs the user's input.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/backend-developer.md
cat .claude/agents/game-designer.md
cat server/src/scripts/combat-sim-results/phase5-mechanics-audit.md
```

Read the full Phase 5 audit — it has exact line numbers, function names, and field names for every fix.

## Task Overview

Phase 5A implements three batches from the mechanics gap audit:

- **Batch 1:** 4 bug fixes (incorrect behavior in existing code)
- **Batch 2:** 6 dead ActiveBuff field consumption (fields stored but never read by engine)
- **Batch 3:** 8 handleDamage enrichments (handler ignores fields it receives)

Estimated ~100-120 new/changed lines across 2 files. All changes are LOW risk — no new systems, no architectural changes.

**After implementation, add 10 new validation scenarios (S25-S34) to the combat simulator.**

---

## Part A: Bug Fixes (Batch 1)

### BUG-FIX 1: healPercent Division (TRIVIAL)

**File:** `server/src/lib/class-ability-resolver.ts` — `handleDrain` ~L352
**Problem:** `healPercent` is already a fraction (0.5 = 50%), but the code divides by 100 again, so `0.5 / 100 = 0.005` — Life Drain and Judgment heal 0.5% of damage instead of 50%.
**Fix:** Change `healPercent / 100` to just `healPercent`. The line should be approximately:
```typescript
// BEFORE:
const healAmount = Math.floor(totalDamage * (healPercent / 100));
// AFTER:
const healAmount = Math.floor(totalDamage * healPercent);
```
**Affects:** `mag-nec-1` Life Drain, `cle-pal-4` Judgment

### BUG-FIX 2: selfDefenseDebuff Name Mismatch (TRIVIAL)

**File:** `server/src/lib/class-ability-resolver.ts` — `handleDamage` ~L95
**Problem:** `war-ber-1` Reckless Strike defines `selfDefenseDebuff: -2` but the handler reads `selfAcPenalty`. Key name mismatch means the -2 AC penalty is never applied.
**Fix:** Add fallback to read `selfDefenseDebuff` when `selfAcPenalty` is absent:
```typescript
const selfAcPenalty = (effects.selfAcPenalty as number) ?? (effects.selfDefenseDebuff as number) ?? 0;
```
**Affects:** `war-ber-1` Reckless Strike

### BUG-FIX 3: Flee successChance Comparison (TRIVIAL)

**File:** `server/src/lib/class-ability-resolver.ts` — `handleFleeAbility` ~L424
**Problem:** `successChance` is 0.9 (90%), but `roll(100)` returns 1-100. Comparing `roll(100) <= 0.9` means the roll must be ≤ 0.9, which never happens since minimum roll is 1. So flee currently **always fails** (not succeeds as the audit summary table says — verify the actual comparison direction in code before fixing).
**Fix:** Multiply successChance by 100 for the comparison:
```typescript
// BEFORE:
const success = roll <= successChance;
// AFTER:
const success = roll <= successChance * 100;
```
**IMPORTANT:** Read the actual flee handler code carefully. The audit summary table says "always succeeds since every roll > 0.9" but the detailed Section 3.12 says "flee ALWAYS FAILS (any roll > 0.9 = always)". The detailed section is correct — if the check is `roll <= successChance` and roll is always ≥ 1, it always fails. Verify the actual operator before fixing.
**Affects:** `rog-thi-4` Disengage

### BUG-FIX 4: Debuff attackReduction Misrouted (MEDIUM)

**File:** `server/src/lib/class-ability-resolver.ts` — `handleDebuff` ~L180
**Problem:** The handler passes ability-specific `attackReduction` values (like -4 from Denounce) into the `damagePerRound` parameter of `applyStatusEffectToState`, which is meant for DoT damage. The `weakened` status always applies its hardcoded -3 attack modifier regardless. So all debuffs give -3 attack instead of their specified values.
**Fix approach:** Instead of (or in addition to) applying the `weakened` status, create a debuff-type ActiveBuff that stores the actual `attackReduction` value. This buff should be consumed by `getBuffAttackMod()` in the engine. The simplest fix:

1. In `handleDebuff`, after applying the weakened status, ALSO push an ActiveBuff to the target with:
   - `name`: ability name
   - `duration`: from ability data
   - `attackMod`: the actual `attackReduction` value (e.g., -4)
   - `acMod`: the actual `acReduction` value if present (e.g., -3 from Enfeeble)

2. Since `getBuffAttackMod` already sums all buff `attackMod` values, the debuff buff will be automatically consumed.

3. BUT this means the target gets BOTH the weakened status (-3 attack from STATUS_EFFECT_DEFS) AND the debuff buff (-4 attack). To avoid double-dipping, either:
   - **Option A:** Remove the weakened status application and rely solely on the ActiveBuff for the attack modifier. Still apply the status for visual/log purposes but with attackModifier: 0.
   - **Option B:** Keep weakened but subtract its hardcoded -3 from the buff attackMod to avoid stacking.
   - **Recommended: Option A** — it's cleanest. Apply weakened with `attackModifier: 0` for visual purposes, and let the ActiveBuff carry the real values.

**Affects:** `cle-inq-1` Denounce (-4), `mag-enc-2` Enfeeble (-4 atk, -3 AC), `mag-enc-4` Arcane Siphon (-4), `cle-inq-5` Excommunicate (-5), `bar-dip-1` Charming Words (-3)

---

## Part B: Dead ActiveBuff Field Consumption (Batch 2)

All 6 fixes go in `server/src/lib/combat-engine.ts`.

### BUFF-1: ccImmune

**Location:** `applyStatusEffect()` or equivalent status application function
**Implementation:** Before applying any CC status effect, check if the target has any active buff with `ccImmune: true`. If so, skip the status application and log "resisted due to CC immunity".
**CC statuses to block:** `stunned`, `frozen`, `paralyzed`, `dominated`, `mesmerize`, `polymorph`, `root`, `skip_turn`
**Helper function:**
```typescript
function isBuffCCImmune(combatant: Combatant): boolean {
  return combatant.activeBuffs?.some(b => b.ccImmune === true) ?? false;
}
```
**Affects:** `war-ber-5` Berserker Rage

### BUFF-2: guaranteedHits

**Location:** `resolveAttack()`, before the attack roll (~L520-527)
**Implementation:**
1. Add helper: `getBuffGuaranteedHits(combatant)` — returns first active buff with `guaranteedHits > 0`, or null.
2. In resolveAttack, before rolling the d20: if actor has a guaranteed-hits buff, set the roll result to 20 (auto-hit but NOT auto-crit — skip the natural-20 crit check). Decrement the buff's `guaranteedHits` by 1. If it reaches 0, remove `guaranteedHits` from the buff (or let it stay as 0).
3. Log: "{Actor} uses guaranteed strike! (X remaining)"
**Affects:** `war-war-5` Warlord's Decree (3 guaranteed hits over 3 rounds)

### BUFF-3: dodgeMod

**Location:** `resolveAttack()`, AFTER determining the attack hits (after the d20 roll succeeds vs AC) but BEFORE applying damage
**Implementation:**
1. Add helper: `getBuffDodgeMod(combatant)` — sums `dodgeMod` from all active buffs. Returns total dodge percentage.
2. After hit determination: if target has dodge buffs, roll percentile (`roll(100)`). If roll <= total `dodgeMod`, the attack is dodged — treat as miss.
3. Log: "{Target} dodges the attack! (X% dodge chance)"
**Affects:** `rog-swa-3` Evasion (30%), `bar-bat-3` Marching Cadence (5%), `rog-swa-6` Untouchable passive (10%)

### BUFF-4: damageReflect

**Location:** `resolveAttack()`, AFTER damage is applied to target, BEFORE the HP update completes
**Implementation:**
1. Add helper: `getBuffDamageReflect(combatant)` — returns the highest `damageReflect` value from active buffs (don't stack — use max).
2. After damage is applied: if target has `damageReflect`, calculate `reflectedDamage = Math.floor(totalDamage * damageReflect)`. Apply this damage to the attacker. Check attacker death prevention.
3. Log: "{Target}'s Iron Bulwark reflects X damage back to {Attacker}!"
4. This is very similar to the Nethkin Infernal Rebuke logic at ~L719-728. Model the implementation after that.
**Affects:** `war-gua-5` Iron Bulwark (30% reflect)

### BUFF-5: stealthed

**Location:** `resolveAttack()`, BEFORE the attack roll (~L520)
**Implementation:**
1. If target has any active buff with `stealthed: true`, the attack auto-misses. Set result to miss, log "{Target} is hidden — attack misses!"
2. Do NOT break stealth on being targeted (stealth breaks on the stealthed combatant's next action, not when attacked). The buff has duration: 1, so it expires naturally at end of their turn.
**Note:** This also enables `requiresStealth` for Ambush (rog-ass-4) in Batch 3 below.
**Affects:** `rog-ass-2` Vanish

### BUFF-6: Taunt Enforcement

**Location:** `resolveTurn()`, during action/target selection
**Problem:** The `taunt` status is applied by `war-gua-3` Taunt but the engine never forces target selection.
**Implementation:** When resolving a combatant's turn, if they have the `taunt` status effect, override their target to be the taunt source. The taunt status should store the source combatant ID.
**Complexity note:** This requires knowing WHO applied the taunt. Check if the status effect tracking includes source information. If not, we need to add a `sourceId` field to the status tracking. If this is too complex for this batch, flag it and skip — it can go in Phase 5B.
**Affects:** `war-gua-3` Taunt

**IMPORTANT on BUFF-6:** If implementing taunt requires adding a `sourceId` to the status effect system AND modifying the turn resolution targeting logic, that's more than a "dead field consumption" fix. Use your judgment — if it takes more than 15 lines, skip it and leave a TODO comment. We'll handle it in Phase 5B.

---

## Part C: handleDamage Enrichment (Batch 3)

All 8 fixes go in `server/src/lib/class-ability-resolver.ts` — `handleDamage` handler (~L76-119).

The handleDamage handler currently reads: `bonusDamage`, `diceCount`, `diceSides`, `selfAcPenalty`.
It needs to ALSO read and apply these fields from the ability's `effects` object:

### DMG-1: critBonus

**Read:** `effects.critBonus` (number, e.g., 10 or 20)
**Apply:** Pass `critBonus` value to the attack result so the engine can expand the crit range. Since handleDamage creates an attack action that the engine's resolveAttack processes, add `critBonus` to the ClassAbilityResult or the action data.
**Engine integration:** In `resolveAttack`, when checking for critical hit (natural 20), also check: `d20Roll >= (20 - Math.floor(critBonus / 5))`. So critBonus: 10 crits on 18-20, critBonus: 20 crits on 16-20.
**NOTE:** This requires BOTH handler change (read the field, pass it through) AND engine change (consume it in resolveAttack). The handler should put the value somewhere the engine can find it — either on the action object or as a temporary field on the actor's state.
**Simplest approach:** Add a temporary `critBonus` field to the combatant before the attack resolves, then clear it after. Or pass it through the ClassAbilityResult and have the engine check it.
**Affects:** `rog-ass-1` Backstab (10), `ran-sha-4` Headshot (20), `bar-lor-3` Exploit Weakness (15)

### DMG-2: autoHit

**Read:** `effects.autoHit` (boolean)
**Apply:** Same pattern as critBonus — pass through to engine. In `resolveAttack`, if the attack has `autoHit`, skip the d20 roll and treat as a hit (not crit).
**Simplest approach:** Set a temporary `autoHit` flag on the actor before the ability-driven attack resolves, clear after.
**Affects:** `mag-enc-1` Arcane Bolt

### DMG-3: ignoreArmor

**Read:** `effects.ignoreArmor` (boolean)
**Apply:** When `ignoreArmor` is true, the attack should be resolved against AC 10 (base, no equipment/buffs/dex). Set temporary `ignoreArmor` flag, engine uses it in `calculateAC` or overrides AC to 10 for that attack.
**Affects:** `ran-sha-3` Piercing Arrow

### DMG-4: accuracyBonus / accuracyPenalty

**Read:** `effects.accuracyBonus` (number) and `effects.accuracyPenalty` (number)
**Apply:** Add to the attack roll modifier. Net it out: `accuracyMod = (effects.accuracyBonus ?? 0) + (effects.accuracyPenalty ?? 0)`. Set as temporary field on actor, consumed by resolveAttack as additional attack modifier.
**Affects:** `ran-sha-1` Aimed Shot (+3), `ran-sha-4` Headshot (-5)

### DMG-5: bonusPerDebuff

**Read:** `effects.bonusPerDebuff` (number)
**Apply:** Count the number of debuff-type ActiveBuffs and negative status effects on the target. Multiply count by `bonusPerDebuff` and add to damage.
**Implementation in handler:** After calculating base damage, check target's status effects and negative activeBuffs, count them, add `count * bonusPerDebuff` to damage total.
**Affects:** `cle-inq-2` Penance (+4 per debuff)

### DMG-6: damageMultiplier

**Read:** `effects.damageMultiplier` (number, e.g., 3.0)
**Apply:** After calculating total damage, multiply by `damageMultiplier`. This is already done in `handleAoeDamage` and `handleMultiAttack` — copy the pattern.
**Affects:** `rog-ass-4` Ambush (3.0x)

### DMG-7: requiresStealth

**Read:** `effects.requiresStealth` (boolean)
**Apply:** If `requiresStealth` is true and the actor does NOT have an active buff with `stealthed: true`, the ability should fail or deal reduced (1x instead of 3x) damage. Log: "{Actor} needs stealth for this ability!" when stealth is missing.
**Design decision:** Either block the ability entirely (return a fail result) or just remove the damage multiplier. Recommend: allow the attack but skip the multiplier — the sim runner can't handle "pick a different ability" logic.
**Affects:** `rog-ass-4` Ambush (paired with DMG-6)

### DMG-8: requiresAnalyze

**Read:** `effects.requiresAnalyze` (boolean)
**Apply:** If `requiresAnalyze` is true, check if the target has an ActiveBuff named "Analyze" (from `bar-lor-1`). If they do, apply full damage. If not, deal reduced damage (no crit bonus, no bonus damage). 
**Same pattern as requiresStealth:** Allow attack but skip the bonus mechanics when prerequisite isn't met.
**Affects:** `bar-lor-3` Exploit Weakness

### CROSS-CUTTING APPROACH FOR DMG-1 through DMG-4:

These fields need to flow from the handler to the engine's resolveAttack. The cleanest approach:

1. **Add a `classAbilityMods` temporary object on the Combatant** (or pass through the action):
```typescript
interface ClassAbilityAttackMods {
  critBonus?: number;
  autoHit?: boolean;
  ignoreArmor?: boolean;
  accuracyMod?: number;
}
```

2. In `handleDamage`: Before returning, set `actor.classAbilityAttackMods = { critBonus, autoHit, ignoreArmor, accuracyMod }` with only the relevant fields.

3. In `resolveAttack` (combat-engine.ts): Check `actor.classAbilityAttackMods` and apply each modifier:
   - `autoHit`: Skip attack roll, treat as hit
   - `ignoreArmor`: Use AC 10 instead of calculated AC
   - `accuracyMod`: Add to attack roll
   - `critBonus`: Expand crit range
   After the attack resolves, clear `actor.classAbilityAttackMods`.

4. Add `classAbilityAttackMods?: ClassAbilityAttackMods` to the `Combatant` interface in `shared/src/types/combat.ts`.

This is clean, minimal, and doesn't require changing any function signatures.

---

## Part D: Validation Scenarios (S25-S34)

Add 10 new scenarios to the combat simulator. Follow the exact same pattern as scenarios 1-24.

### S25: drain-heal-fixed
**Tests:** BUG-FIX 1 (healPercent)
**Setup:**
- Actor: L30 Human Mage/Necromancer, HP 80, AC 12. Abilities: Life Drain (mag-nec-1), Shadow Bolt (mag-nec-2). Queue: [life_drain, shadow_bolt, life_drain, shadow_bolt, ...]
- Target: L30 Orc Warrior, HP 120, AC 14, basic attacks only.
**Validate:** Actor's HP increases after Life Drain damage. With ~12 avg damage (2d6) and 50% heal, should heal ~6 HP per drain. Check that actor HP > starting HP after first Life Drain if they took some damage.
**Key assertion:** `actor.hp` increases after Life Drain turn. `healAmount` in log should be roughly half of damage dealt, NOT near zero.

### S26: reckless-strike-penalty
**Tests:** BUG-FIX 2 (selfDefenseDebuff)
**Setup:**
- Actor: L10 Human Warrior/Berserker, HP 60, AC 14. Abilities: Reckless Strike (war-ber-1). Queue: [reckless_strike, basic_attack, basic_attack, ...]
- Target: L10 Orc Warrior, HP 60, AC 12, basic attacks only.
**Validate:** After actor uses Reckless Strike, their effective AC should decrease by 2 (from the self-debuff). Check that the target's subsequent attacks hit more often / the log mentions AC reduction.
**Key assertion:** Actor's AC modifier changes after Reckless Strike. Log shows self-inflicted AC penalty.

### S27: cc-immune-berserker
**Tests:** BUFF-1 (ccImmune)
**Setup:**
- Actor: L35 Orc Warrior/Berserker, HP 150, AC 14. Abilities: Berserker Rage (war-ber-5), Frenzy (war-ber-4). Queue: [berserker_rage, frenzy, frenzy, frenzy, ...]
- Target: L35 Human Mage/Enchanter, HP 80, AC 11. Abilities: Polymorph (mag-enc-5), Enfeeble (mag-enc-2), Arcane Bolt (mag-enc-1). Queue: [polymorph, enfeeble, arcane_bolt, polymorph, ...]
**Validate:** Polymorph (CC) should fail against the Berserker while Berserker Rage is active (3 rounds). After Rage expires, Polymorph should land.
**Key assertion:** First polymorph attempt: "resisted due to CC immunity". Later polymorph attempt (after round 3): applies successfully.

### S28: guaranteed-hits-warlord
**Tests:** BUFF-2 (guaranteedHits)
**Setup:**
- Actor: L35 Human Warrior/Warlord, HP 130, AC 15. Abilities: Warlord's Decree (war-war-5), Commanding Strike (war-war-2). Queue: [warlords_decree, commanding_strike, commanding_strike, commanding_strike, ...]
- Target: L35 High Elf Mage/Elementalist, HP 80, AC 18 (high AC to normally miss often). Basic attacks only.
**Validate:** First 3 attacks after Warlord's Decree should auto-hit regardless of AC. Use high target AC to make normal hits unlikely.
**Key assertion:** 3 consecutive hits after Decree. Log shows "guaranteed strike" messages. After 3 hits, normal miss rate resumes.

### S29: dodge-evasion
**Tests:** BUFF-3 (dodgeMod)
**Setup:**
- Actor: L20 Halfling Rogue/Swashbuckler, HP 55, AC 15. Abilities: Evasion (rog-swa-3, 30% dodge), Dual Strike (rog-swa-2). Queue: [evasion, dual_strike, dual_strike, evasion, ...]
- Target: L20 Orc Warrior, HP 80, AC 12, basic attacks only.
**Validate:** While Evasion buff is active (2 rounds), some attacks that would hit AC should be dodged. With 30% dodge, over multiple attacks, expect ~30% dodge rate.
**Key assertion:** At least one "dodges the attack" log message during Evasion buff duration. Dodge does NOT occur after buff expires.

### S30: damage-reflect-bulwark
**Tests:** BUFF-4 (damageReflect)
**Setup:**
- Actor: L30 Dwarf Warrior/Guardian, HP 140, AC 18. Abilities: Iron Bulwark (war-gua-5, 30% reflect), Fortify (war-gua-2), Shield Wall (war-gua-4). Queue: [iron_bulwark, fortify, shield_wall, basic_attack, ...]
- Target: L30 Orc Berserker (monster), HP 120, AC 12, high damage attacks (12-18).
**Validate:** While Iron Bulwark is active, each time the Orc hits the Guardian, 30% of damage is reflected back. With avg 15 damage per hit, should reflect ~4 HP per hit.
**Key assertion:** Log shows "reflects X damage back" messages. Target HP decreases from reflected damage even on turns target attacks.

### S31: stealth-vanish
**Tests:** BUFF-5 (stealthed)
**Setup:**
- Actor: L15 Halfling Rogue/Assassin, HP 45, AC 14. Abilities: Vanish (rog-ass-2, stealth 1 round), Backstab (rog-ass-1, critBonus 10). Queue: [vanish, backstab, vanish, backstab, ...]
- Target: L15 Orc Warrior, HP 70, AC 12, basic attacks only.
**Validate:** While stealthed (1 round after Vanish), target's attacks against actor should auto-miss. Backstab after Vanish should benefit from critBonus (if DMG-1 is also working).
**Key assertion:** Target attack immediately after Vanish: "is hidden — attack misses!" Backstab on next turn lands with potential expanded crit.

### S32: ambush-stealth-chain
**Tests:** DMG-6 + DMG-7 (damageMultiplier + requiresStealth)
**Setup:**
- Actor: L25 Halfling Rogue/Assassin, HP 55, AC 14. Abilities: Vanish (rog-ass-2), Ambush (rog-ass-4, 3x multiplier + requiresStealth). Queue: [vanish, ambush, basic_attack, vanish, ambush, ...]
- Target: L25 Orc Warrior, HP 100, AC 13, basic attacks only.
**Validate:** Ambush after Vanish should deal 3x damage. Ambush without Vanish should deal 1x (no multiplier because stealth requirement not met).
**Key assertion:** First Ambush (stealthed): damage is ~3x normal weapon damage. If there's a non-stealthed Ambush later: damage is normal 1x. Log distinguishes the two cases.

### S33: aimed-shot-accuracy
**Tests:** DMG-4 (accuracyBonus/accuracyPenalty)
**Setup:**
- Actor: L20 Elf Ranger/Sharpshooter, HP 65, AC 14. Abilities: Aimed Shot (ran-sha-1, +3 accuracy, +6 damage), Headshot (ran-sha-4, +20 critBonus, -5 accuracy). Queue: [aimed_shot, headshot, aimed_shot, headshot, ...]
- Target: L20 Orc Warrior, HP 80, AC 16 (moderately high AC). Basic attacks only.
**Validate:** Aimed Shot should hit more reliably than basic attacks (effective +3 to hit). Headshot should miss more often (effective -5 to hit) but crit when it hits (16-20 crit range).
**Key assertion:** Aimed Shot hit rate > basic attack hit rate over multiple rounds. Headshot shows expanded crit range in logs. At least one Headshot miss attributable to accuracy penalty.

### S34: penance-debuff-bonus
**Tests:** DMG-5 (bonusPerDebuff)
**Setup:**
- Actor: L20 Human Cleric/Inquisitor, HP 70, AC 14. Abilities: Denounce (cle-inq-1, debuff), Silence (cle-inq-3, status), Penance (cle-inq-2, +4 per debuff). Queue: [denounce, silence, penance, penance, denounce, silence, penance, ...]
- Target: L20 Orc Warrior, HP 90, AC 13, basic attacks only.
**Validate:** Penance damage should increase based on number of debuffs/negative effects on target. After Denounce + Silence (2 effects), Penance should deal base damage + 8 (2 × 4).
**Key assertion:** First Penance (after 2 debuffs applied): bonus damage of +8 visible in log. Penance without debuffs: only base damage.

---

## Part E: Logger Updates

Update the combat logger to display the new mechanics:

1. **Drain heal fix:** Verify heal amounts in drain logs are now reasonable (e.g., "heals for 6" not "heals for 0")
2. **CC Immunity:** Log "⚡ {Target} resists {status} — CC immune!" in bold cyan or similar
3. **Guaranteed Hits:** Log "🎯 {Actor} uses guaranteed strike! ({N} remaining)"
4. **Dodge:** Log "💨 {Target} dodges the attack! ({X}% dodge chance)"
5. **Damage Reflect:** Log "🛡️ {Target}'s Iron Bulwark reflects {X} damage back!"
6. **Stealth Miss:** Log "👻 {Target} is hidden — attack misses!"
7. **Crit Bonus:** When expanded crit triggers, log "🎯 Critical hit! (expanded range from {ability})"
8. **Auto Hit:** Log "🎯 {Ability} auto-hits! (never misses)"
9. **Ignore Armor:** Log "⚔️ {Ability} ignores armor! (AC treated as 10)"
10. **Accuracy Mod:** Show net accuracy modifier in attack roll log: "rolls {d20} + {base} + {accuracyMod} vs AC {ac}"
11. **Debuff Bonus Damage:** Log "💀 Penance deals +{X} bonus damage ({N} debuffs × {bonusPerDebuff})"
12. **Damage Multiplier:** Log "💥 Ambush deals {X} damage (×{multiplier} from stealth!)"
13. **Stealth Requirement:** When missing stealth: "⚠️ {Actor} attempts {Ability} without stealth — reduced damage"

---

## Scope Boundaries

### DO:
- Fix the 4 bugs in Batch 1
- Implement the 6 dead buff consumptions in Batch 2 (skip taunt if > 15 lines)
- Implement the 8 handleDamage enrichments in Batch 3
- Add the `classAbilityAttackMods` interface and field to Combatant type
- Add 10 new sim scenarios (S25-S34)
- Update logger for new mechanics
- Run ALL 34 scenarios — zero regressions on S1-S24

### DO NOT:
- Implement passive ability fixes (Phase 5B)
- Implement complex new mechanics like extraAction, poisonCharges, stackingAttackSpeed (Phase 5B)
- Add elemental damage system
- Add monsterType system
- Refactor existing handlers that are working correctly
- Modify the seeded PRNG system
- Change any existing scenario (S1-S24) definitions

---

## Deployment

After all implementation and testing:

```bash
git add -A
git commit -m "Phase 5A: 4 bug fixes, 6 dead buff consumptions, 8 handler enrichments, 10 new scenarios (S25-S34)"
git push
```

Then deploy to Azure (use unique image tag, never :latest) and run database seed in production.
