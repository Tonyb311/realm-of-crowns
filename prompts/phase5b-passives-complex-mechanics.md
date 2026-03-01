# Phase 5B: Passives, Complex Mechanics & Remaining Gaps

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

Read the full Phase 5 audit. It has exact line numbers, function names, and field names for every fix. Line numbers may have shifted slightly after Phase 5A changes — verify actual locations before editing.

Also read the current state of the files you'll be modifying:

```bash
head -50 server/src/lib/class-ability-resolver.ts
head -50 server/src/lib/combat-engine.ts
head -30 shared/src/types/combat.ts
```

## Task Overview

Phase 5B implements the remaining two batches from the mechanics gap audit:

- **Batch 4:** 6 passive ability fixes (stored at combat start but never consumed)
- **Batch 5:** 11 complex mechanics (new systems or cross-cutting changes)
- **Carryover:** Taunt enforcement (skipped from 5A)

Estimated ~200-250 new/changed lines across 2-3 files. Batch 4 is LOW risk. Batch 5 has 2 HIGH-risk items (extraAction, stackingAttackSpeed) — implement those last and with extra care.

**After implementation, add 11 new validation scenarios (S35-S45).**

---

## Part A: Passive Ability Fixes (Batch 4)

All passive abilities are applied by `applyPassiveAbilities()` in `class-ability-resolver.ts`. The function runs once at combat start. Some passives store data that is never consumed by the engine.

### PASSIVE-1: critChanceBonus (MEDIUM)

**Abilities:** `rog-ass-6` Master Assassin (15%), `ran-sha-6` Eagle's Eye (10%)
**Current state:** Comment says "stored for reference, applied in attack resolution" but NO code in resolveAttack checks it.
**Fix:**
1. In `applyPassiveAbilities`: store `critChanceBonus` on the Combatant object. If the field doesn't exist on Combatant, add it to the interface in `shared/src/types/combat.ts`.
2. In `resolveAttack` (combat-engine.ts): after the d20 roll, expand the crit range. Current crit = natural 20 only. With critChanceBonus: crit if `d20Roll >= (20 - Math.floor(critChanceBonus / 5))`. So 15% → crits on 17-20, 10% → crits on 18-20.
3. Also interacts with the `critBonus` from `classAbilityAttackMods` (Phase 5A). The total crit expansion should combine passive + ability bonuses: `totalCritBonus = (combatant.critChanceBonus ?? 0) + (classAbilityAttackMods?.critBonus ?? 0)`. Then `critThreshold = 20 - Math.floor(totalCritBonus / 5)`.
**Affects:** `rog-ass-6`, `ran-sha-6`

### PASSIVE-2: accuracyBonus (passive) (SMALL)

**Ability:** `ran-sha-6` Eagle's Eye (+5 accuracy)
**Current state:** Not stored as buff or modifier.
**Fix:** In `applyPassiveAbilities`: create a permanent buff (duration 999) with `attackMod: 5`. The existing `getBuffAttackMod()` in the engine will consume it automatically.
**Alternative:** If a permanent buff already exists for this combatant from another passive (like hpRegenPerRound), just add `attackMod` to it.
**Affects:** `ran-sha-6`

### PASSIVE-3: firstStrikeCrit (SMALL)

**Ability:** `ran-tra-6` Master Tracker
**Current state:** Not stored or applied.
**Fix:**
1. In `applyPassiveAbilities`: store `firstStrikeCrit: true` on the Combatant. Add field to Combatant interface if needed.
2. Add `hasAttackedThisCombat: boolean` to Combatant (defaults to false).
3. In `resolveAttack` (combat-engine.ts): if `actor.firstStrikeCrit === true && !actor.hasAttackedThisCombat`, force the attack to be a critical hit. Set `actor.hasAttackedThisCombat = true` after the first attack resolves (regardless of hit/miss, to prevent exploit with guaranteed-miss-then-crit).
**Affects:** `ran-tra-6`

### PASSIVE-4: permanentCompanion / companionImmune (SMALL)

**Ability:** `ran-bea-6` Spirit Bond
**Current state:** Not stored or applied. Companion buffs have normal duration and take interception damage.
**Fix:**
1. In `applyPassiveAbilities`: store `permanentCompanion: true` and `companionImmune: true` on the Combatant.
2. In `tickActiveBuffs` (class-ability-resolver.ts): when decrementing buff durations, if the combatant has `permanentCompanion` and the buff has `companionDamage` (i.e., it's a companion buff), skip the duration decrement — companion never expires.
3. In `resolveAttack` companion interception logic (combat-engine.ts): if the combatant has `companionImmune`, skip the companion HP reduction when intercepting. Companion still intercepts but takes no damage.
**Affects:** `ran-bea-6`

### PASSIVE-5: stackingDamagePerRound (MEDIUM)

**Ability:** `bar-bat-5` Crescendo (+3 damage per round)
**Current state:** Not stored as buff or modifier.
**Fix:**
1. In `applyPassiveAbilities`: store `stackingDamagePerRound: 3` on the Combatant. Add field to interface.
2. Add `roundDamageBonus: number` to Combatant (defaults to 0).
3. In `resolveTurn` (combat-engine.ts): at the START of each turn for this combatant, increment `roundDamageBonus += stackingDamagePerRound`.
4. In `resolveAttack` or `getBuffDamageMod`: include `actor.roundDamageBonus` in the damage modifier calculation.
**Design note:** This stacks indefinitely. In a 10-round fight, that's +30 damage by round 10. This is intentional for a level-40 passive — it rewards long fights.
**Affects:** `bar-bat-5`

### PASSIVE-6: advantageVsLowHp (MEDIUM)

**Ability:** `ran-tra-5` Predator's Instinct (advantage vs targets below 50% HP)
**Current state:** Not stored or applied.
**Fix:**
1. In `applyPassiveAbilities`: store `advantageVsLowHp: true` and `advantageHpThreshold: 0.5` on the Combatant.
2. In `resolveAttack` (combat-engine.ts): before the attack roll, check if `actor.advantageVsLowHp` and target HP < target maxHp × threshold. If so, roll the d20 twice and take the higher result (advantage).
3. Log: "🎯 {Actor} senses weakness — rolls with advantage!"
**Affects:** `ran-tra-5`

---

## Part B: Complex Mechanics (Batch 5)

Implement in the order listed — simplest/safest first, highest-risk last.

### MECH-1: bonusDamageNext Consume-Once (SMALL)

**Ability:** `bar-lor-1` Analyze
**Problem:** Analyze grants `bonusDamageNext: 8` which maps to `damageMod: 8` on an ActiveBuff. But `damageMod` persists for the buff's full duration instead of being consumed after the first attack.
**Fix:**
1. In `handleBuff` (class-ability-resolver.ts): when `bonusDamageNext` is present, also set `consumeOnUse: true` on the buff. Add this field to ActiveBuff interface if needed.
2. In `resolveAttack` (combat-engine.ts): after consuming `getBuffDamageMod()`, check if any buff that contributed damageMod has `consumeOnUse: true`. If so, set that buff's `damageMod` to 0 (or remove the buff).
**Affects:** `bar-lor-1` Analyze

### MECH-2: nextCooldownHalved (SMALL)

**Ability:** `bar-lor-4` Arcane Insight
**Problem:** The buff is created but the `nextCooldownHalved` field is never read.
**Fix:**
1. In `handleBuff`: read `effects.nextCooldownHalved` and store it on the buff. Add field to ActiveBuff if needed.
2. In `resolveClassAbility` (class-ability-resolver.ts): when setting an ability's cooldown after use, check if the actor has any buff with `nextCooldownHalved: true`. If so, halve the cooldown (floor division) and consume the flag (set to false or remove the buff).
**Affects:** `bar-lor-4` Arcane Insight

### MECH-3: charmEffectiveness (SMALL)

**Ability:** `bar-dip-6` Silver-Tongued Devil (+50% charm duration)
**Current state:** Not stored or applied.
**Fix:**
1. In `applyPassiveAbilities`: store `charmEffectiveness: 0.5` on the Combatant.
2. In relevant handlers (`handleDebuff`, `handleStatus`): when the actor has `charmEffectiveness`, multiply the debuff/status duration by `(1 + charmEffectiveness)`. Round up with `Math.ceil()`. Only apply to "social" effects: debuffs, mesmerize, skip_turn, charm-type abilities.
**Design decision:** Define "social" effects as those from Diplomat abilities (bar-dip-*). Simplest check: if the ability ID starts with `bar-dip-`, apply the duration bonus.
**Affects:** `bar-dip-6`

### MECH-4: attackScaling: 'missingHpPercent' (MEDIUM)

**Ability:** `war-ber-2` Blood Rage
**Problem:** Blood Rage's attack bonus should scale with missing HP percentage, but `handleBuff` only reads a static `attackBonus` (which doesn't exist on this ability) and ignores `attackScaling`.
**Fix:**
1. In `handleBuff`: when `attackScaling === 'missingHpPercent'`, don't set a static `attackMod`. Instead, store a flag on the buff: `scalingType: 'missingHpPercent'`.
2. Add `scalingType?: string` to ActiveBuff interface.
3. In the engine's `getBuffAttackMod()` (combat-engine.ts): when iterating buffs, if a buff has `scalingType === 'missingHpPercent'`, calculate the attack bonus dynamically: `Math.floor(((combatant.maxHp - combatant.hp) / combatant.maxHp) * 20)`. At 50% HP, that's +10 attack. At 90% missing, that's +18.
4. The multiplier (20) can be stored on the buff as `scalingMax` if you want it data-driven, or hardcode for now.
**Affects:** `war-ber-2` Blood Rage

### MECH-5: bonusDamageFromYou (MEDIUM)

**Ability:** `ran-tra-3` Hunter's Mark
**Problem:** Hunter's Mark should make the ranger deal +4 bonus damage to the marked target. The debuff handler drops the `bonusDamageFromYou` field.
**Fix:**
1. In `handleDebuff`: when `bonusDamageFromYou` is present, create an ActiveBuff on the TARGET (not the actor) with:
   - `bonusDamageFromSource: 4` (the bonus value)
   - `bonusDamageSourceId: actor.id` (who applied the mark)
   - `duration`: from ability data
2. Add these fields to ActiveBuff interface.
3. In `resolveAttack` (combat-engine.ts): when calculating damage, check if the target has any buff with `bonusDamageFromSource` where `bonusDamageSourceId === actor.id`. If so, add `bonusDamageFromSource` to the damage total.
4. Log: "🎯 Hunter's Mark: +{X} bonus damage!"
**Affects:** `ran-tra-3` Hunter's Mark

### MECH-6: holyDamageBonus (MEDIUM)

**Ability:** `cle-pal-6` Avatar of Light (+25% radiant damage)
**Current state:** Not stored or applied.
**Fix:**
1. In `applyPassiveAbilities`: store `holyDamageBonus: 0.25` on the Combatant.
2. In damage handlers: after calculating total damage for any ability with `element: 'radiant'`, multiply by `(1 + holyDamageBonus)`. Check in `handleDamage`, `handleAoeDamage`, `handleDrain`, `handleAoeDot`, `handleDamageStatus`.
3. The `element` field needs to be passed through to damage calculation. Currently `element` is cosmetic. The simplest approach: in each handler, check if `effects.element === 'radiant'` AND `actor.holyDamageBonus`, then multiply.
**Affects:** `cle-pal-6` Avatar of Light (affects cle-pal-1 Smite, cle-pal-3 Consecrate, cle-pal-4 Judgment, cle-pal-5 Divine Wrath)

### MECH-7: Taunt Enforcement + AC Debuff (MEDIUM — carried from 5A)

**Ability:** `war-gua-3` Taunt
**Problem:** Taunt status is applied but the engine never forces target selection. Worse, in a 1v1 fight taunt is a completely wasted action since the opponent would attack you anyway.
**Design fix:** Taunt now has TWO effects:
1. **Target override** — the taunted combatant MUST attack the taunt source (matters in multi-combatant fights)
2. **AC debuff (-2)** — the taunted combatant is so fixated on the taunter that they leave themselves open, reducing their AC by 2 for the taunt duration. This makes taunt mechanically worthwhile even in 1v1.

Thematically: being taunted means you're tunnel-visioned and reckless, leaving openings in your defense.

**Fix:**
1. Need to track WHO applied the taunt. Check how status effects are stored — if there's no `sourceId` field on the status tracking, add one.
2. In `handleStatus` or `applyStatusEffectToState`: when applying `taunt`, store the source combatant's ID.
3. In `resolveTurn` (combat-engine.ts): when selecting the action target for a combatant, if they have a `taunt` status, override the target to be the taunt source ID.
4. **AC debuff:** When taunt is applied, ALSO create a debuff ActiveBuff on the target with `acMod: -2` and the same duration as the taunt status. This is automatically consumed by the existing `getBuffAcMod()` engine function — no extra engine work needed.
5. For sim runner: the ability queue already specifies targets, but the taunt override should take precedence. In the action resolution step, replace the queued target with the taunt source.
**Implementation note:** Look at how status effects are stored on the combatant. If they're just strings (e.g., `statusEffects: ['taunt', 'poisoned']`), you'll need to change to objects with metadata. If they're already objects, just add `sourceId`. Check the actual data structure before implementing.
**Affects:** `war-gua-3` Taunt

### MECH-8: antiHealAura (MEDIUM)

**Ability:** `cle-inq-6` Grand Inquisitor
**Current state:** Not stored or applied.
**Fix:**
1. In `applyPassiveAbilities`: store `antiHealAura: true` on the Combatant.
2. In `handleHeal` (class-ability-resolver.ts): before applying any heal to a target, check if any ENEMY has `antiHealAura: true`. If so, block the heal entirely. Log: "🚫 Healing blocked by {enemy}'s anti-heal aura!"
3. In `handleDrain` / `handleHot`: same check for the self-heal component. If the healer's enemies have antiHealAura, skip the heal portion (damage still applies for drain).
4. In `tickActiveBuffs` for HoT ticks: check enemy anti-heal aura before applying the tick heal.
**Design question:** Does anti-heal block ALL healing or just ability-based healing? Recommend: block all healing except death prevention revives. Item-based healing should also be blocked.
**Affects:** `cle-inq-6`

### MECH-9: poisonCharges (MEDIUM)

**Ability:** `rog-ass-3` Poison Blade (3 charges, 4 damage DoT for 3 rounds per charge)
**Problem:** `handleBuff` creates a buff but ignores `poisonCharges`, `dotDamage`, `dotDuration`.
**Fix:**
1. In `handleBuff`: when `poisonCharges` is present, read all three fields and store on the buff:
   - `poisonCharges: 3`
   - `poisonDotDamage: 4`
   - `poisonDotDuration: 3`
2. Add these fields to ActiveBuff interface.
3. In `resolveAttack` (combat-engine.ts): after a successful hit by an actor with a poison-charges buff, apply a `poisoned` status to the target with `damagePerRound: poisonDotDamage` and `duration: poisonDotDuration`. Decrement `poisonCharges`. When charges reach 0, remove the poison fields from the buff.
4. Log: "🧪 Poison Blade applies poison! ({N} charges remaining)"
**Affects:** `rog-ass-3` Poison Blade

### MECH-10: extraAction (LARGE — HIGH RISK)

**Abilities:** `war-war-3` Tactical Advance, `mag-enc-3` Haste
**Problem:** The `extraAction` buff field is stored but never consumed. These abilities should grant an additional action in the same turn.
**Fix:**
1. In `resolveTurn` (combat-engine.ts): after the primary action resolves, check if the actor has any buff with `extraAction: true`.
2. If so: resolve ONE additional action. The extra action should be a basic attack (simplest and safest — avoid recursive ability selection).
3. Consume the buff: set `extraAction: false` on the buff, or remove the buff entirely (Haste has duration: 1 so it expires anyway; Tactical Advance is instant).
4. **CRITICAL SAFETY:** Add a guard to prevent infinite loops. Track an `extraActionUsedThisTurn` flag on the combatant. Only grant ONE extra action per turn maximum, regardless of how many extraAction buffs exist.
5. Log: "⚡ {Actor} takes an extra action! (Haste/Tactical Advance)"

**Risk mitigation:**
- The extra action is ALWAYS a basic attack — never an ability. This avoids recursive ability usage, cooldown issues, and ability queue corruption.
- Set `extraActionUsedThisTurn = true` before the extra attack. Clear it at the start of each turn.
- If the extra attack triggers a counter/trap/reflect, handle it normally — the reactive damage resolution is self-contained.
- Do NOT allow the extra action to trigger ANOTHER extra action.

**Affects:** `war-war-3` Tactical Advance, `mag-enc-3` Haste

### MECH-11: stackingAttackSpeed (LARGE — HIGH RISK)

**Ability:** `rog-swa-5` Dance of Steel (stacking attack speed, max 5 stacks, 5-round duration)
**Problem:** Buff is created but no stacking logic exists.

**Design decision needed:** "Attack speed" doesn't have a direct mechanical mapping in a turn-based system. Options:
- **Option A:** Each stack grants a cumulative attack bonus (+2 per stack = +10 at max). Simple, low risk.
- **Option B:** At certain stack thresholds, grant bonus strikes (like multi-attack). Medium complexity.
- **Option C:** Each stack grants a chance for an extra attack (20% per stack). Medium complexity.

**Recommended: Option A** — it's mechanically clean and low risk. Dance of Steel becomes a ramping attack buff.

**Fix (Option A):**
1. In `handleBuff`: when `stackingAttackSpeed` is present, set initial stack count on the buff: `stackingAttackSpeedStacks: 1`, `stackingAttackSpeedMax: effects.maxStacks`.
2. Add these fields to ActiveBuff interface.
3. In `resolveAttack` (combat-engine.ts): after a successful hit by an actor with a stacking buff, increment `stackingAttackSpeedStacks` (up to max).
4. In `getBuffAttackMod`: if a buff has `stackingAttackSpeedStacks`, add `stacks * 2` to the attack modifier.
5. Log: "🗡️ Dance of Steel: {N} stacks (+{X} attack)"

**Affects:** `rog-swa-5` Dance of Steel

---

## Part C: Type Changes

Add these fields to the interfaces in `shared/src/types/combat.ts`:

### Combatant Interface Additions:
```typescript
// Passive fields (set by applyPassiveAbilities)
critChanceBonus?: number;          // PASSIVE-1
firstStrikeCrit?: boolean;         // PASSIVE-3
hasAttackedThisCombat?: boolean;   // PASSIVE-3
permanentCompanion?: boolean;      // PASSIVE-4
companionImmune?: boolean;         // PASSIVE-4
stackingDamagePerRound?: number;   // PASSIVE-5
roundDamageBonus?: number;         // PASSIVE-5
advantageVsLowHp?: boolean;        // PASSIVE-6
advantageHpThreshold?: number;     // PASSIVE-6
holyDamageBonus?: number;          // MECH-6
antiHealAura?: boolean;            // MECH-8
extraActionUsedThisTurn?: boolean; // MECH-10 safety guard
```

### ActiveBuff Interface Additions:
```typescript
scalingType?: string;              // MECH-4 (e.g., 'missingHpPercent')
scalingMax?: number;               // MECH-4 (max attack bonus from scaling)
bonusDamageFromSource?: number;    // MECH-5
bonusDamageSourceId?: string;      // MECH-5
consumeOnUse?: boolean;            // MECH-1
nextCooldownHalved?: boolean;      // MECH-2
poisonCharges?: number;            // MECH-9
poisonDotDamage?: number;          // MECH-9
poisonDotDuration?: number;        // MECH-9
stackingAttackSpeedStacks?: number; // MECH-11
stackingAttackSpeedMax?: number;   // MECH-11
```

### Status Effect Tracking:
If status effects are stored as strings, check whether taunt (MECH-7) requires changing to objects with `sourceId`. Only modify the type if needed.

---

## Part D: Validation Scenarios (S35-S45)

### S35: crit-chance-passive
**Tests:** PASSIVE-1 (critChanceBonus)
**Setup:**
- Actor: L40 Halfling Rogue/Assassin, HP 70, AC 16. Passive: Master Assassin (15% crit bonus). Abilities: Backstab (rog-ass-1, +10 critBonus). Queue: [backstab, basic_attack, backstab, basic_attack, ...]
- Target: L40 Training Dummy, HP 300, AC 12. No attacks (or very weak).
**Validate:** Actor should crit on d20 rolls of 15-20 when using Backstab (passive 15% + ability 10% = 25% → critThreshold 15). Basic attacks crit on 17-20 (passive only). Over many rounds, crit rate should be visibly higher than vanilla 5%.
**Key assertion:** Multiple crits logged. Backstab crits more often than basic attacks. Log shows "expanded crit range" messages.

### S36: first-strike-crit
**Tests:** PASSIVE-3 (firstStrikeCrit)
**Setup:**
- Actor: L40 Human Ranger/Tracker, HP 90, AC 15. Passive: Master Tracker (firstStrikeCrit). Abilities: Lay Trap (ran-tra-1). Queue: [basic_attack, lay_trap, basic_attack, ...]
- Target: L30 Orc Warrior, HP 100, AC 13. Basic attacks.
**Validate:** Actor's very first attack is always a critical hit. Second and subsequent attacks use normal crit rules.
**Key assertion:** Round 1 attack: critical hit logged. Round 2+ attacks: normal hit/miss/crit distribution.

### S37: permanent-companion
**Tests:** PASSIVE-4 (permanentCompanion/companionImmune)
**Setup:**
- Actor: L40 Elf Ranger/Beastmaster, HP 90, AC 14. Passive: Spirit Bond. Abilities: Call Companion (ran-bea-1, 5 round duration), Bestial Fury (ran-bea-4). Queue: [call_companion, bestial_fury, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack, ...]
- Target: L35 Orc Berserker (monster), HP 120, AC 12. High damage attacks.
**Validate:** Companion should still be active after 5 rounds (normal duration would expire). Companion should take no damage from interception.
**Key assertion:** Companion auto-damage logs continue past round 5. Companion HP stays constant (never decremented).

### S38: crescendo-stacking
**Tests:** PASSIVE-5 (stackingDamagePerRound)
**Setup:**
- Actor: L35 Human Bard/Battlechanter, HP 80, AC 13. Passive: Crescendo (+3/round). Abilities: War Song (bar-bat-1). Queue: [war_song, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack]
- Target: L35 Training Dummy, HP 400, AC 12. No attacks.
**Validate:** Damage should increase each round. Round 1: base damage. Round 5: base + 15. Round 10: base + 30.
**Key assertion:** Damage per round visibly increases in logs. Round 10 damage is noticeably higher than round 1.

### S39: advantage-low-hp
**Tests:** PASSIVE-6 (advantageVsLowHp)
**Setup:**
- Actor: L30 Human Ranger/Tracker, HP 80, AC 14. Passive: Predator's Instinct (advantage vs <50% HP). Queue: [basic_attack, basic_attack, basic_attack, ...]
- Target: L30 Orc Warrior, HP 30 (starting LOW — below 50% of maxHp 100), AC 16 (high to make advantage matter). Basic attacks.
**Validate:** Actor should roll with advantage (roll twice, take higher) against the low-HP target. Hit rate should be notably higher than a normal attacker vs AC 16.
**Key assertion:** Log shows "senses weakness — rolls with advantage!" on attacks. Hit rate visibly above normal (~75% with advantage vs ~50% without on AC 16).

### S40: blood-rage-scaling
**Tests:** MECH-4 (attackScaling: missingHpPercent)
**Setup:**
- Actor: L20 Orc Warrior/Berserker, HP 40 (starting at 40 of maxHp 100 = 60% missing). Abilities: Blood Rage (war-ber-2). Queue: [blood_rage, basic_attack, basic_attack, basic_attack, ...]
- Target: L20 Training Dummy, HP 200, AC 14. No attacks.
**Validate:** Blood Rage should grant ~+12 attack at 60% missing HP (floor(0.6 * 20) = 12). Check that attack modifier reflects missing HP percentage.
**Key assertion:** Attack roll logs show significant positive modifier from Blood Rage. Hit rate against AC 14 should be very high.

### S41: hunters-mark-bonus
**Tests:** MECH-5 (bonusDamageFromYou)
**Setup:**
- Actor: L20 Elf Ranger/Tracker, HP 70, AC 14. Abilities: Hunter's Mark (ran-tra-3, +4 bonus damage), basic attacks. Queue: [hunters_mark, basic_attack, basic_attack, basic_attack, ...]
- Ally: L20 Human Warrior, HP 80, AC 14. Basic attacks only.
- Target: L20 Orc Warrior, HP 100, AC 12. Basic attacks.
**Validate:** After Hunter's Mark, the RANGER's attacks deal +4 bonus damage to the marked target. The ALLY's attacks do NOT get the bonus (it's per-source).
**Key assertion:** Ranger damage logs show "+4 Hunter's Mark bonus". Ally damage logs do NOT show the bonus.

### S42: poison-blade-charges
**Tests:** MECH-9 (poisonCharges)
**Setup:**
- Actor: L20 Halfling Rogue/Assassin, HP 50, AC 14. Abilities: Poison Blade (rog-ass-3, 3 charges), Backstab (rog-ass-1). Queue: [poison_blade, backstab, backstab, backstab, backstab, ...]
- Target: L20 Orc Warrior, HP 80, AC 12. Basic attacks.
**Validate:** First 3 successful melee hits after Poison Blade apply poison DoT (4 damage/round for 3 rounds). 4th hit does not apply poison (charges exhausted).
**Key assertion:** 3 "Poison Blade applies poison!" messages with decrementing charge count. Target takes poison tick damage on subsequent rounds. No poison message on 4th+ hit.

### S43: extra-action-haste
**Tests:** MECH-10 (extraAction)
**Setup:**
- Actor: L25 Human Mage/Enchanter, HP 65, AC 12. Abilities: Haste (mag-enc-3, extraAction for 1 round), Arcane Bolt (mag-enc-1, autoHit). Queue: [haste, arcane_bolt, arcane_bolt, ...]
- Target: L25 Orc Warrior, HP 90, AC 14. Basic attacks.
**Validate:** On the turn Haste is active, the actor should resolve TWO actions: their queued ability + a bonus basic attack. On subsequent turns (Haste expired), only one action.
**Key assertion:** Turn with Haste: TWO attack resolution logs in one turn. "takes an extra action" message. Next turn: only one action.

### S44: dance-of-steel-stacking
**Tests:** MECH-11 (stackingAttackSpeed)
**Setup:**
- Actor: L30 Halfling Rogue/Swashbuckler, HP 60, AC 15. Abilities: Dance of Steel (rog-swa-5, stacking). Queue: [dance_of_steel, basic_attack, basic_attack, basic_attack, basic_attack, basic_attack, ...]
- Target: L30 Training Dummy, HP 300, AC 14. No attacks.
**Validate:** Each successful hit should increment stacks (up to 5). Attack modifier should increase by +2 per stack. At 5 stacks, +10 attack bonus.
**Key assertion:** Log shows incrementing stacks: "Dance of Steel: 1 stacks", "2 stacks", etc. Attack modifier visibly increases. Stacks cap at 5.

### S45: taunt-ac-debuff
**Tests:** MECH-7 (Taunt enforcement + AC debuff)
**Setup:**
- Actor: L25 Dwarf Warrior/Guardian, HP 120, AC 18. Abilities: Taunt (war-gua-3), Shield Bash (war-gua-1). Queue: [taunt, shield_bash, basic_attack, taunt, shield_bash, basic_attack, ...]
- Ally: L25 Elf Ranger, HP 70, AC 14. Basic attacks only. Targets the enemy.
- Target: L25 Orc Berserker (monster), HP 100, AC 14. High damage basic attacks. Normally targets the Elf (lower AC/HP).
**Validate:** After Taunt, the Orc MUST attack the Guardian (not the Elf) for the taunt duration. The Orc's AC should also drop by 2 (from 14 to effective 12) for the taunt duration, making the Guardian and Ally's attacks hit more often.
**Key assertion:** "is taunted — must attack {Guardian}" log message. Orc targets Guardian during taunt, Elf during non-taunt. Orc's effective AC reduced by 2 during taunt (visible in attack roll logs against it).

---

## Part E: Logger Updates

Add display for new mechanics:

1. **Passive crit bonus:** "🎯 Critical hit! (passive crit range: {threshold}-20)"
2. **First strike crit:** "⚡ First strike — guaranteed critical hit!"
3. **Permanent companion:** "🐺 Spirit Bond: companion is permanent and immune to damage"
4. **Crescendo:** "🎵 Crescendo: +{X} damage this round ({N} rounds in combat)"
5. **Advantage:** "🎯 {Actor} senses weakness — rolls with advantage! ({roll1}, {roll2} → {higher})"
6. **Blood Rage scaling:** "💢 Blood Rage: +{X} attack ({Y}% HP missing)"
7. **Hunter's Mark bonus:** "🎯 Hunter's Mark: +{X} bonus damage"
8. **Poison application:** "🧪 Poison Blade applies poison! ({N} charges remaining)"
9. **Extra action:** "⚡ {Actor} takes an extra action! ({ability name})"
10. **Dance of Steel stacks:** "🗡️ Dance of Steel: {N} stacks (+{X} attack)"
11. **CC Immunity (taunt):** If taunt forces target, "⚔️ {Actor} is taunted — must attack {source}!"
12. **Anti-heal aura:** "🚫 Healing blocked by {enemy}'s anti-heal aura!"
13. **Consume-on-use:** "📖 Analyze bonus consumed after first attack"
14. **Cooldown halved:** "✨ Arcane Insight: cooldown halved ({base} → {halved})"
15. **Holy damage bonus:** "✝️ Avatar of Light: +{X}% radiant damage ({bonus} extra)"

---

## Implementation Order

Execute in this exact order to minimize risk:

1. **Type changes** (Part C) — add all new interface fields first
2. **Batch 4 passives** (Part A: PASSIVE-1 through PASSIVE-6) — low risk, self-contained
3. **Simple mechanics** (MECH-1 through MECH-3) — small, isolated
4. **Medium mechanics** (MECH-4 through MECH-9) — moderate complexity
5. **High-risk mechanics** (MECH-10, MECH-11) — implement last, test immediately
6. **Scenarios** (Part D: S35-S45) — add and run all
7. **Logger updates** (Part E)
8. **Full regression** — run ALL 45 scenarios

---

## Scope Boundaries

### DO:
- Implement all 6 passive fixes (Batch 4)
- Implement all 11 complex mechanics (Batch 5) including taunt
- Add all type interface changes
- Add 11 new scenarios (S35-S45)
- Update logger for new mechanics
- Run ALL 45 scenarios — zero regressions on S1-S34

### DO NOT:
- Implement elemental damage system (element remains cosmetic except for holyDamageBonus on radiant)
- Implement monsterType/bonusVsUndead system
- Add goldBonus/xpBonus/lootBonus (out-of-combat-engine scope)
- Modify the seeded PRNG system
- Change any existing scenario (S1-S34) definitions
- Refactor working handlers

### IF A MECHANIC IS TOO COMPLEX:
- If any single mechanic exceeds 40 lines of changes, STOP and leave a `// TODO: Phase 5C` comment
- Specifically for MECH-10 (extraAction) and MECH-11 (stackingAttackSpeed): if the implementation introduces bugs in existing scenarios, revert and leave TODO
- Do NOT sacrifice existing scenario stability for new mechanics

---

## Deployment

After all implementation and testing:

```bash
git add -A
git commit -m "Phase 5B: 6 passives, 11 complex mechanics, taunt+AC debuff, 11 new scenarios (S35-S45)"
git push
```

Then deploy to Azure (use unique image tag, never :latest) and run database seed in production.
