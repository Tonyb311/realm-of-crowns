# Phase 7: Psion Edge Cases, Handler Bug Fixes & Final Coverage

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
cat server/src/scripts/combat-sim-results/phase7-handler-audit.md
cat server/src/lib/combat-engine.ts
cat server/src/lib/class-ability-resolver.ts
cat shared/src/data/class-abilities.ts
cat shared/src/types/combat.ts
cat server/src/scripts/combat-sim-scenarios.ts
```

The Phase 7 audit is your implementation guide. Read it before writing any code.

## Task Overview

Three parts:

- **Part A:** Fix 3 bugs found in the handler audit
- **Part B:** Resolve 3 data/code mismatches
- **Part C:** Add 7 new scenarios (S59-S65) covering the 5 previously untested handlers

**After all changes, run ALL scenarios (currently S1-S58, then S1-S65). Zero regressions allowed.**

---

## Part A: Bug Fixes (3 bugs)

### BUG-1: Flee handler ignores taunt status (HIGH RISK)

**File:** `class-ability-resolver.ts` → `handleFleeAbility`
**Problem:** A taunted combatant can use Disengage to flee combat, completely bypassing the tank's taunt. This breaks the core tank/taunt strategy.
**Fix:** At the top of `handleFleeAbility`, before the success roll, check if the actor has an active `taunt` status effect:

```typescript
// Check if actor is taunted — taunted combatants cannot flee
const isTaunted = actor.statusEffects.some(e => e.name === 'taunt');
if (isTaunted) {
  return {
    state,
    result: {
      fleeAttempt: true,
      fleeSuccess: false,
      description: `${abilityDef.name}: Cannot flee while taunted!`,
    },
  };
}
```

This returns early with a failed flee — no roll, no state change. Taunt forces the character to stay and fight.

### BUG-2: aoe_debuff handler ignores immuneBlinded (MEDIUM RISK)

**File:** `class-ability-resolver.ts` → `handleAoeDebuff`
**Problem:** Smoke Bomb applies `blinded` to all enemies, but doesn't check `target.immuneBlinded` (Third Eye Psion passive from Phase 6). A Psion with Third Eye gets blinded despite having explicit immunity.
**Fix:** In the enemy loop, add an immunity check before applying blinded:

```typescript
for (const enemy of enemies) {
  if (enemy.immuneBlinded) {
    // Log immunity, skip this enemy
    continue;
  }
  state = applyStatusEffectToState(state, enemy.id, 'blinded', duration, actor.id);
  affected++;
}
```

Update the result description to mention immune targets if any were skipped.

### BUG-3: Banish handler ignores noDuplicateBanish (MEDIUM RISK)

**File:** `combat-engine.ts` → banish handler (psi-nom-6 case)
**Problem:** Ability data includes `noDuplicateBanish: true` but the handler doesn't check it. A target can be re-banished, overwriting `banishedUntilRound` and potentially extending the void duration indefinitely.
**Fix:** Before the save roll, check if target is already banished:

```typescript
// noDuplicateBanish guard — cannot re-banish an already banished target
if (updatedTarget.banishedUntilRound != null) {
  return {
    state: current,
    result: {
      type: 'psion_ability', actorId, targetId, abilityName: abilityDef.name, abilityId,
      saveRequired: false,
      description: `${abilityDef.name}: Target is already banished — cannot re-banish.`,
    },
  };
}
```

This is a clean no-op return — ability used, turn consumed, but no effect on already-banished target.

---

## Part B: Data/Code Mismatch Resolution (3 items)

These are design decisions, not bugs. The audit found places where the handler hard-codes values that differ from the ability data. Here's how to resolve each:

### MISMATCH-1: Echo freeAction (psi-see-5)

**Problem:** Ability data has `freeAction: true` but the handler consumes the turn normally.
**Decision: DO NOT implement freeAction.** A free action that replays a full ability (including high-damage psion attacks) without costing a turn is overpowered. The ability is already strong — replaying a Psychic Crush or Dominate is powerful even if it costs a turn.
**Action:** Add a comment in the handler explaining the design decision:

```typescript
// NOTE: freeAction in ability data is intentionally NOT implemented.
// Echo replaying a full psion ability (Psychic Crush, Dominate, etc.) as a free action
// would be extremely overpowered. Temporal Echo is balanced as a turn-consuming replay.
```

No code changes needed.

### MISMATCH-2: Swap ally AC bonus (psi-nom-4)

**Problem:** Ability data says `allyEffect: { acBonus: 2 }` but code applies `shielded` status which gives +4 AC.
**Decision: Make the code match the data.** +4 AC from a level 18 ability on both caster AND ally is too strong. The data's +2 is the intended balance.
**Action:** Two options — pick whichever is cleaner:

**Option A (preferred): Create a lightweight custom buff instead of using `shielded` status.**
Instead of `applyStatusEffect(target, 'shielded', ...)`, apply an ActiveBuff with `acMod: 2`:

```typescript
// Ally branch
const translocBuff: Partial<ActiveBuff> = {
  name: 'Translocation Shield',
  duration: 1,
  sourceId: actorId,
  acMod: 2,
};
// Add to both caster and target's activeBuffs
```

This way the +2 AC comes from the buff, not the shielded status definition.

**Option B (simpler): Change the `shielded` status definition's acModifier from 4 to 2.**
But this affects ANYTHING that uses `shielded` — check if other abilities reference it. If `shielded` is only used by Translocation, Option B is fine. If it's used elsewhere, Option A is safer.

**Whichever you choose:** Verify no other abilities are broken by the change.

### MISMATCH-3: Banish hard-coded values (psi-nom-6)

**Problem:** Handler hard-codes 2d6 (save success), 4d6 (return damage), 3-round duration, and status effects instead of reading from ability data fields like `returnDamage`, `returnEffect`, etc.
**Decision: Leave hard-coded for now.** There's only one banish ability in the game. Data-driving it adds complexity for zero practical benefit. If a second banish ability is ever added, refactor then.
**Action:** Add a comment explaining the decision:

```typescript
// NOTE: Damage dice, duration, and effects are hard-coded since psi-nom-6 is the only
// banish ability. If additional banish abilities are added, refactor to read from abilityDef.effects.
```

No code changes needed.

---

## Part C: New Scenarios (S59-S65)

Add 7 new scenarios covering the 5 previously untested handlers. Follow the specifications from the Phase 7 audit Section 6.

### S59: `echo-replay` — Temporal Echo replays psion ability

**Tests:** echo handler (psi-see-5), lastAction tracking
**Setup:** L28 Psion/Seer vs L20 Training Dummy (high HP, low stats)
**Combatant:**
- Seer: HP 60, AC 14, STR 10, DEX 14, CON 12, INT 18, WIS 16, CHA 10
- Abilities unlocked: psi-see-1 (Foresight), psi-tel-1 (Mind Spike — needs to be accessible; check if cross-subclass abilities are available in the resolver. If not, use psi-see-3 Precognitive Dodge or any other Seer ability that has a visible effect, then echo it.)
- **IMPORTANT:** The echo handler replays `lastAction.psionAbilityId`. The scenario MUST have the actor use a psion ability on the turn BEFORE echo. If the Seer only has Seer abilities, use psi-see-1 (Foresight, a buff) as the pre-echo action and verify echo replays Foresight.
**Action queue:**
1. Round 1: psi-see-1 "Foresight" (buff, applies acBonus + saveBonus)
2. Round 2: psi-see-5 "Temporal Echo" (should replay Foresight)
**Key assertions:**
- Round 2 result contains "Temporal Echo: Foresight" in ability name
- `echoAction: true` in result
- Foresight effect applied twice (or refreshed — verify buff stacking behavior)

### S60: `echo-no-previous` — Temporal Echo with no prior action

**Tests:** echo handler edge case — no lastAction
**Setup:** Same as S59 but echo is FIRST action
**Action queue:**
1. Round 1: psi-see-5 "Temporal Echo" (no previous action)
**Key assertions:**
- Returns description "No previous action to echo"
- No crash, no damage, no state change
- `echoAction: false` in result

### S61: `swap-enemy-stun` — Translocation stuns enemy

**Tests:** swap handler enemy branch (psi-nom-4)
**Setup:** L18 Psion/Nomad vs L18 Orc (low INT for easy save fail)
**Combatant:**
- Nomad: INT 18 (high save DC)
- Orc: INT 6 (will likely fail save)
**Action queue:**
1. Round 1: psi-nom-4 "Translocation" targeting enemy
**Key assertions:**
- INT save rolled for target
- On save fail: `stunned` status applied for 1 round
- On save success: no stun applied
- Use a seed that makes the orc fail the save (or set INT low enough that failure is near-guaranteed)

### S62: `swap-ally-shield` — Translocation shields ally

**Tests:** swap handler ally branch (psi-nom-4)
**Setup:** 2v1 — L18 Psion/Nomad + L18 Warrior (same team) vs L20 Orc
**Action queue:**
1. Nomad: psi-nom-4 "Translocation" targeting ally Warrior
**Key assertions:**
- Both Nomad AND Warrior receive AC buff (shielded or translocation buff depending on MISMATCH-2 resolution)
- AC buff lasts 1 round
- Verify the buff value matches the MISMATCH-2 fix (should be +2 AC if data-aligned)
- No stun applied (ally branch, not enemy)

### S63: `banish-full-cycle` — Full banishment: cast, void, return

**Tests:** banish handler (psi-nom-6), banished state, return damage
**Setup:** L40 Psion/Nomad vs L35 Orc (HP 120+ to survive return 4d6)
**Combatant:**
- Nomad: INT 20 (high save DC for reliable banish)
- Orc: INT 6, HP 120
**Action queue:**
- Nomad: psi-nom-6 "Banishment" (round 1), then basic_attack for remaining rounds
**Run for at least 6 rounds** to see: cast (R1), banished (R2-R3-R4), return with damage+stun (R4 or R5), post-return combat
**Key assertions:**
- On save fail: target gets `banished` status + `banishedUntilRound` set to round+3
- During banished rounds: target skipped in turn order (no actions, not targetable)
- On return: 4d6 psychic damage dealt + `stunned` 1 round applied
- `banished` status removed on return
- `banishedUntilRound` set to null on return
- Use a seed that makes the orc fail the INT save

**Bonus assertion (BUG-3 fix validation):** If a second Banishment is queued (after target returns), verify it works. But if targeted while already banished, verify the noDuplicateBanish guard fires and returns the no-op message.

### S64: `flee-disengage` — Thief Disengage flee

**Tests:** flee handler (rog-thi-4), hasFled flag, BUG-1 taunt interaction
**Setup:** L22 Rogue/Thief vs L20 Orc
**Action queue:**
1. rog-thi-4 "Disengage" (round 1)
**Key assertions:**
- `fleeAttempt: true` in result
- On success (90% chance): `hasFled: true` on combatant, combat ends (only 1 combatant remains)
- Use a seed that produces a successful flee (≤90 on d100)
- **BUG-1 validation:** Run a SECOND sub-scenario or assertion block: same setup but Rogue has `taunt` status pre-applied. Verify flee is BLOCKED with "Cannot flee while taunted!" message and `fleeSuccess: false`.

**Implementation options for the taunt sub-test:**
- Option A: Two separate scenarios (S64a flee success, S64b flee-while-taunted blocked)
- Option B: One scenario with pre-applied taunt, verifying block. Then a separate seed/scenario for successful flee.
- Pick whichever fits the scenario framework better. If scenarios support pre-applied status effects on combatants, Option B is cleaner as a single scenario with taunt pre-applied, showing the block. Then S64 without taunt shows the success.

**Simplest approach:** Make S64 the SUCCESSFUL flee (no taunt). Add a separate `flee-blocked-by-taunt` assertion within S64 or as S64b where the Rogue has taunt status. If the scenario framework doesn't support status pre-application, just set it up however S50 (taunt-heal-antiheal) did it.

### S65: `smoke-bomb-aoe` — Smoke Bomb AoE debuff + immuneBlinded

**Tests:** aoe_debuff handler (rog-thi-2), BUG-2 immuneBlinded
**Setup:** 1v3 — L14 Rogue/Thief vs L14 Orc + L14 Orc + L14 Psion/Seer (with `immuneBlinded: true` from Third Eye)
**Action queue:**
1. rog-thi-2 "Smoke Bomb" (round 1)
**Key assertions:**
- Both Orcs receive `blinded` status for 2 rounds
- Psion/Seer with `immuneBlinded: true` does NOT receive `blinded` status
- Blinded orcs have -5 attack modifier
- Description mentions immune target was skipped (or affected count is 2, not 3)

---

## Implementation Order

1. **Read all source files** — especially the Phase 7 audit
2. **Part A: Fix 3 bugs** — flee taunt check, aoe_debuff immuneBlinded check, banish noDuplicateBanish guard
3. **Part B: Resolve 3 mismatches** — echo freeAction comment, swap AC fix, banish hard-code comment
4. **Run S1-S58** — verify zero regressions from bug fixes
5. **Part C: Add S59-S65** — 7 new scenarios
6. **Run ALL S1-S65** — zero regressions, all new scenarios pass
7. **Report** — list what was fixed, what was added, final scenario count

---

## Scope Boundaries

### DO:
- Fix 3 bugs (flee taunt check, aoe_debuff immuneBlinded, banish noDuplicateBanish)
- Add design decision comments for echo freeAction and banish hard-coding
- Fix swap ally AC to match data (+2 not +4) — choose cleanest approach
- Add 7 scenarios (S59-S65) testing all 5 previously untested handlers
- Run full regression suite

### DO NOT:
- Implement echo `freeAction` (intentionally overpowered, see MISMATCH-1)
- Data-drive banish handler (only one banish ability, see MISMATCH-3)
- Add non-psion echo replay (attack/cast/flee echo is intentionally a no-op for now)
- Implement opportunity attacks or surprise rounds
- Modify any scenarios S1-S58
- Add more than 7 new scenarios

### IF A SCENARIO FAILS:
- If a new scenario (S59-S65) fails due to an unexpected code path, investigate and fix if the fix is ≤10 lines. Otherwise mark with `// KNOWN ISSUE:` and report at the end.

---

## Deployment

After all implementation and testing:

```bash
git add -A
git commit -m "Phase 7: 3 handler bug fixes, 3 mismatch resolutions, 7 scenarios (S59-S65) — all 5 untested handlers now covered"
git push
```

Then deploy to Azure (use unique image tag, never :latest) and run database seed in production.
