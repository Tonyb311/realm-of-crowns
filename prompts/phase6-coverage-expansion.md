# Phase 6: Scenario Repair, Coverage Expansion & Psion Passives

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
```

Read ALL of these files in full:

```bash
cat shared/src/data/class-abilities.ts
cat server/src/scripts/combat-sim-scenarios.ts
cat server/src/scripts/combat-sim-results/phase6-coverage-audit.md
cat server/src/lib/class-ability-resolver.ts
cat server/src/lib/combat-engine.ts
cat shared/src/types/combat.ts
```

The Phase 6 audit is your roadmap. It contains the exact broken scenario IDs, the correct ability IDs, and the recommended new scenarios. **Read it carefully before writing any code.**

## Task Overview

Three parts:

- **Part A:** Fix 6 broken Phase 5B scenarios (phantom ability IDs) + 3 mislabeled ability IDs in working scenarios
- **Part B:** Implement 4 missing Psion passives in `applyPassiveAbilities`
- **Part C:** Add 13 new full-kit and interaction scenarios (S46-S58)

**After all changes, run ALL scenarios — currently S1-S45, then S1-S58 after new scenarios added. Zero regressions allowed.**

---

## Part A: Repair Broken & Mislabeled Scenarios

### CRITICAL: 6 Broken Scenarios (phantom ability IDs)

These scenarios reference ability IDs that DO NOT EXIST in `class-abilities.ts`. The resolver silently falls back to basic attacks, so the scenarios "pass" but test nothing. Each one needs to be rewritten with REAL ability IDs from the correct subclasses.

**Before fixing anything:** look up the REAL ability IDs in `shared/src/data/class-abilities.ts`. The audit lists what the scenarios INTENDED to test, but used fabricated subclass prefixes (war-cha-*, cle-lif-*, rog-due-*). Find the real abilities that match the intended mechanics.

#### FIX-1: S35 `crit-first-strike` — uses `war-cha-1`, `war-cha-3`

**Intended test:** critChanceBonus passive + firstStrikeCrit passive
**Real abilities needed:** These are Ranger/Tracker passives, not Warrior/Champion.
- `ran-tra-6` Master Tracker (firstStrikeCrit) — passive
- `ran-tra-5` Predator Instinct (advantageVsLowHp) — passive (bonus test)
- Use real Ranger attacks: `ran-sha-1` Aimed Shot or `ran-tra-1` Lay Trap as queue abilities
- For critChanceBonus: `rog-ass-6` Shadow Mastery (15%) or `ran-sha-6` Eagle's Eye (10%) as passive

**Rewrite:** L40 Ranger/Tracker with Master Tracker passive. Queue real ranger abilities. Verify first attack is auto-crit, subsequent attacks use normal crit rules.

#### FIX-2: S39 `consume-and-cooldown` — uses `war-cha-1`, `war-cha-3`

**Intended test:** consumeOnUse (MECH-1) + nextCooldownHalved (MECH-2)
**Real abilities needed:** These are Bard/Lorekeeper mechanics.
- `bar-lor-1` Analyze (consumeOnUse via bonusDamageNext: 8)
- `bar-lor-4` Arcane Insight (nextCooldownHalved)
- `bar-lor-3` Exploit Weakness (to test cooldown after halving)

**Rewrite:** L30 Bard/Lorekeeper. Queue: Analyze → basic_attack (consumes +8 bonus) → basic_attack (no bonus) → Arcane Insight → Exploit Weakness (verify halved cooldown). Validate consumeOnUse fires once, cooldown halved on next ability.

#### FIX-3: S41 `anti-heal-aura` — uses `cle-lif-1`, `cle-lif-2`

**Intended test:** antiHealAura (MECH-8)
**Real abilities needed:**
- `cle-inq-6` Grand Inquisitor passive (antiHealAura) — applied on the ENEMY
- `cle-hea-1` Healing Light (heal to be blocked)
- `cle-hea-3` Regeneration (HoT to be blocked)

**Rewrite:** 2v1 setup. L30 Cleric/Healer (low HP) vs L30 Orc Inquisitor (with antiHealAura passive set manually). Healer queues Healing Light + Regeneration. Validate ALL healing is blocked. Then run a second phase or check: if anti-heal source dies, healing should resume.

#### FIX-4: S43 `extra-action-attack` — uses `war-cha-5`, `war-cha-1`

**Intended test:** extraAction (MECH-10)
**Real abilities needed:**
- `mag-enc-3` Haste (extraAction, duration: 1) OR `war-war-3` Tactical Advance (extraAction)
- Any real attack ability for the queue

**Rewrite:** L25 Mage/Enchanter. Queue: Haste → Arcane Bolt (mag-enc-1, autoHit). On the Haste turn, actor should get TWO actions: the queued ability + a bonus basic attack. Validate exactly one extra action, no infinite loop.

#### FIX-5: S44 `stacking-attack-speed` — uses `rog-due-1`

**Intended test:** stackingAttackSpeed (MECH-11)
**Real ability needed:**
- `rog-swa-5` Dance of Steel (stackingAttackSpeed, maxStacks: 5)

**Rewrite:** L30 Rogue/Swashbuckler. Queue: Dance of Steel → basic_attack × 8. Validate stacks increment on each successful hit, cap at 5, attack modifier increases by +2 per stack.

#### FIX-6: S45 `charm-holy` — uses `cle-lif-4`

**Intended test:** charmEffectiveness (MECH-3) + holyDamageBonus (MECH-6)
**Real abilities needed:**
- `bar-dip-6` Legendary Charisma passive (charmEffectiveness: 0.5) — on the charm user
- `bar-dip-1` Charming Words or `bar-dip-5` Enthrall — charm abilities
- `cle-pal-6` Avatar of Light passive (holyDamageBonus: 0.25)
- `cle-pal-1` Smite (radiant damage)

**Design note:** Testing two unrelated mechanics in one scenario is messy. Split into two scenarios OR test them sequentially with two combatant pairs.

**Rewrite:** Option 1 (combined): L40 Bard/Diplomat (with charmEffectiveness passive) + L40 Cleric/Paladin (with holyDamageBonus passive) vs 2 Training Dummies. Diplomat queues Enthrall (verify extended duration from 3 → 5 rounds). Paladin queues Smite (verify +25% radiant damage). Option 2 (split): Just pick one. The full-kit scenarios below will cover both anyway.

### Mislabeled Ability IDs (3 fixes in working scenarios)

These scenarios use real ability IDs but the comments/labels are wrong. The abilities actually fire correctly — it's the human-readable labels that are misleading.

#### LABEL-1: S40 `taunt-enforcement`

- `war-gua-1` is labeled "Shield Wall" → actual name is "Shield Bash"
- `war-gua-2` is labeled "Taunt" → actual name is "Fortify"
- **The scenario NEVER calls war-gua-3 (actual Taunt).** The taunt mechanic "works" only because the scenario manually sets combatant flags.

**Fix:** Replace `war-gua-2` with `war-gua-3` in the action queue so the ACTUAL Taunt ability fires. Fix the labels. This is the most important label fix — it changes behavior, not just comments.

#### LABEL-2: S42 `poison-charges`

- `rog-ass-1` is labeled "Poison Blade" → actual name is "Backstab"
- The scenario never calls `rog-ass-3` (actual Poison Blade)

**Fix:** The queue should start with `rog-ass-3` (Poison Blade, applies poison charges buff), THEN use `rog-ass-1` (Backstab, attacks that consume charges). Fix the queue order and labels.

#### LABEL-3: S40 `taunt-enforcement` (Shield Wall label)

- `war-gua-4` is the real Shield Wall. The scenario uses `war-gua-1` (Shield Bash) and calls it Shield Wall.
- **If the scenario intended to test Shield Wall's damage reduction**, replace with `war-gua-4`. If it intended Shield Bash's stun, keep `war-gua-1` but fix the label.

**Fix:** Read the scenario's assertions to determine intent. Fix accordingly.

---

## Part B: Psion Passive Implementation

The audit found 4 Psion passives with NO code path in `applyPassiveAbilities`. These are low-impact implementations — most map to fields that either already exist or need simple additions.

### PSION-PASSIVE-1: Thought Shield (`psi-tel-2`)

**Effect:** Psychic resistance + mental save bonus (+2)
**Implementation:**
1. In `applyPassiveAbilities`: detect `psi-tel-2` and store `mentalSaveBonus: 2` on the Combatant.
2. Add `mentalSaveBonus?: number` to the Combatant interface if not already present.
3. **For psychicResistance:** Since we don't have an elemental damage type system, the simplest approach is to store `psychicResistance: true` on the combatant. In `resolveAttack` or the psion ability resolution: if the target has `psychicResistance` and the incoming ability has `element: 'psychic'`, reduce damage by 50%.
4. Add `psychicResistance?: boolean` to Combatant interface.
**Risk:** LOW — additive only, no existing behavior changes.

### PSION-PASSIVE-2: Danger Sense (`psi-see-2`)

**Effect:** Cannot be surprised, +2 initiative bonus
**Implementation:**
1. In `applyPassiveAbilities`: detect `psi-see-2` and store `initiativeBonus: 2` on the Combatant.
2. Add `initiativeBonus?: number` to the Combatant interface if not already present.
3. In the initiative calculation (wherever initiative is rolled/sorted at combat start): add `combatant.initiativeBonus ?? 0` to the initiative roll.
4. `cannotBeSurprised` — store the flag but there's no surprise system in the combat engine. Just store it: `cannotBeSurprised: true`. Leave a `// TODO: implement surprise round system` comment.
**Risk:** LOW — initiative bonus is simple additive.

### PSION-PASSIVE-3: Third Eye (`psi-see-4`)

**Effect:** See invisible, immune to blinded, trap detection bonus
**Implementation:**
1. In `applyPassiveAbilities`: detect `psi-see-4` and store:
   - `seeInvisible: true` (counters stealthed buff — in `resolveAttack`, if attacker has `seeInvisible`, ignore target's stealthed status)
   - `immuneBlinded: true` (if a `blinded` status exists, block it like ccImmune blocks CC)
   - `trapDetectionBonus: 5` (store for future use, no current trap detection roll)
2. Add all three fields to Combatant interface.
3. **seeInvisible integration:** In `resolveAttack` where stealthed causes auto-miss, add: `if (actor.seeInvisible) { /* ignore stealth, attack normally */ }`. Log: "👁️ Third Eye pierces stealth!"
**Risk:** LOW-MEDIUM — seeInvisible interacts with the stealth system from Phase 5A.

### PSION-PASSIVE-4: Phase Step (`psi-nom-2`)

**Effect:** +3 AC vs opportunity attacks, free disengage
**Implementation:**
1. In `applyPassiveAbilities`: detect `psi-nom-2` and store `freeDisengage: true` on the Combatant.
2. Add `freeDisengage?: boolean` to Combatant interface.
3. There is no opportunity attack system in the combat engine. Store the flag and leave `// TODO: implement opportunity attacks` comment.
4. The `acBonus: 3` from Phase Step only applies vs opportunity attacks (which don't exist). Skip this — don't add a permanent +3 AC bonus as it would be overpowered.
**Risk:** NONE — flag storage only, no behavioral change until opportunity attacks are implemented.

---

## Part C: New Scenarios (S46-S58)

Add exactly 13 new scenarios as specified in the Phase 6 coverage audit Section 6. The audit has complete specifications for each scenario including:
- Combatant setup (class, subclass, level, HP, AC)
- Action queues
- Key assertions
- What mechanics are being tested

**Read the audit's Section 6 carefully for each scenario definition.** Below are the scenarios to add:

### Tier 1: Full-Kit Subclass Scenarios (MUST HAVE)

| # | Name | Tests | Key Mechanic Validations |
|---|------|-------|--------------------------|
| S46 | `battlechanter-full-kit` | ALL bar-bat-1 through bar-bat-6 | damage_debuff handler, stackingDamagePerRound, Epic Finale bonusPerRound |
| S47 | `healer-full-kit` | ALL cle-hea-1 through cle-hea-6 | hot handler, cleanse handler, Resurrection passive, Miracle usesPerCombat |
| S48 | `lorekeeper-full-kit` | bar-lor-1, bar-lor-3, bar-lor-4, bar-lor-5 | consumeOnUse, nextCooldownHalved, requiresAnalyze |
| S49 | `warlord-full-kit` | ALL war-war-1 through war-war-6 | extraAction, guaranteedHits, Inspiring Presence hpRegen |

### Tier 2: Cross-Class Interaction Scenarios (HIGH VALUE)

| # | Name | Tests | Key Interaction |
|---|------|-------|-----------------|
| S50 | `taunt-heal-antiheal` | war-gua-3 + cle-hea-1/3 + antiHealAura | Taunt forces targeting + anti-heal blocks ally healing |
| S51 | `counter-reflect-loop` | rog-swa-1 + war-gua-5 | Counter + reflect no infinite loop |
| S52 | `stealth-vs-aoe` | rog-ass-2 + mag-ele-1 | AoE interaction with stealthed targets |
| S53 | `buff-stack-overflow` | war-war-1 + bar-bat-1 + war-ber-2 | Multiple buff sources stacking correctly |
| S54 | `companion-aoe-interaction` | ran-bea-5 + mag-ele-1 | AoE interaction with companion |

### Tier 3: Edge Case & Mechanic Validation (NICE TO HAVE)

| # | Name | Tests | Key Edge Case |
|---|------|-------|---------------|
| S55 | `death-prevention-drain` | war-ber-6 + mag-nec-1 | Death prevention + drain healing interaction |
| S56 | `poison-stealth-chain` | rog-ass-3 + rog-ass-2 + rog-ass-4 + rog-ass-6 | Full Assassin kit: poison charges + stealth + ambush + crit passive |
| S57 | `paladin-holy-kit` | ALL cle-pal-1 through cle-pal-6 | holyDamageBonus on all radiant abilities |
| S58 | `hunter-mark-advantage` | ran-tra-3 + ran-tra-5 + ran-tra-6 | bonusDamageFromYou + advantage + firstStrikeCrit |

**For each scenario:** Follow the detailed spec in the audit's Section 6. Match the combatant setups, action queues, and assertions described there. Use REAL ability IDs — verify each one exists in `class-abilities.ts` before writing the scenario.

---

## Implementation Order

Execute in this exact order:

1. **Read all source files** — understand current scenario structure, ability IDs, resolver, engine
2. **Part A: Fix broken scenarios** — repair 6 phantom ID scenarios + 3 mislabeled scenarios
3. **Run all 45 scenarios** — verify repairs work, zero regressions on S1-S34, repaired S35-S45 now test real mechanics
4. **Part B: Psion passives** — implement 4 passive code paths in applyPassiveAbilities + type changes
5. **Part C: Add S46-S58** — add 13 new scenarios
6. **Run ALL 58 scenarios** — zero regressions, all new scenarios execute without errors
7. **Report coverage improvement** — count abilities now tested vs before

---

## Scope Boundaries

### DO:
- Fix all 6 broken scenarios with correct ability IDs from class-abilities.ts
- Fix 3 mislabeled scenarios (especially S40 taunt — this changes behavior)
- Implement 4 Psion passives (store flags, integrate seeInvisible with stealth, integrate initiativeBonus, mentalSaveBonus/psychicResistance as damage reduction)
- Add 13 new scenarios (S46-S58) per audit specifications
- Add Combatant interface fields for Psion passives
- Run ALL 58 scenarios with zero errors

### DO NOT:
- Implement elemental damage type system (psychicResistance is a one-off 50% reduction, not a generalized system)
- Implement opportunity attacks
- Implement surprise rounds
- Add new combat engine handlers (echo, swap, banish are tested via existing psion handlers, not new scenarios)
- Modify any existing handler logic (class-ability-resolver.ts, combat-engine.ts) beyond Psion passive additions and the seeInvisible stealth check
- Change scenario definitions for S1-S34

### IF A SCENARIO FAILS:
- If a new scenario (S46-S58) fails because of a missing code path or handler bug, DO NOT fix the handler. Instead:
  1. Log what failed and why
  2. Mark the scenario with a `// KNOWN ISSUE:` comment explaining the gap
  3. Continue with remaining scenarios
  4. Report all known issues at the end
- The goal is coverage visibility, not fixing every handler bug in this phase

---

## Deployment

After all implementation and testing:

```bash
git add -A
git commit -m "Phase 6: Fix 9 broken/mislabeled scenarios, 4 Psion passives, 13 new scenarios (S46-S58)"
git push
```

Then deploy to Azure (use unique image tag, never :latest) and run database seed in production.
