# Prompt: Mage Functional Verification + Mechanical Audit

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/sim-analyst.md
cat docs/tier0-ability-choices-summary.md
cat docs/audit-combat-stat-mechanics.md
```

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

---

## Task: Mage Class — Full Functional Verification + Deep Mechanical Audit

This is the same process we completed for Warrior. Two phases in one prompt: run the sim, then audit the combat logs for mechanical correctness.

### Mage Class Info

**Specializations:** Elementalist, Necromancer, Enchanter

**Tier 0 abilities (9 total, 3 options at each of levels 3, 5, 8):**
Check `shared/src/data/skills/mage.ts` for the tier 0 definitions. These were part of the 17-ability field mismatch fix, so some may have been corrected recently — use whatever is currently in the data files.

**Spec abilities (18 total, 6 per spec) at levels 10, 14, 20, 25, 32, 40:**
Check the audit file (`docs/audit-class-ability-levels.md`) or the data files for the full list. Key Mage abilities include:
- Elementalist: Fireball (AoE), Frost Lance (damage+slow), Chain Lightning (multi-target), Elemental Shield (absorb), Meteor Strike (AoE), Arcane Mastery (passive)
- Necromancer: Life Drain (drain), Shadow Bolt (damage), Corpse Explosion (AoE), Bone Armor (buff), Soul Harvest (AoE drain), Lichdom (passive — revive)
- Enchanter: Arcane Bolt (auto-hit), Enfeeble (debuff), Haste (extra action), Arcane Siphon (debuff), Polymorph (status), Spell Weaver (passive)

---

## Phase 1: Functional Verification Sim

### Sim Config

Create a sim config at `server/src/scripts/sim-configs/mage-functional-verify.ts` (or match existing config format — check the warrior config for the pattern).

**Coverage requirements — same approach as warrior:**

**Minimum coverage:**
- All 7 released races (human, elf, dwarf, harthfolk, orc, nethkin, drakonid)
- All 3 specs (Elementalist, Necromancer, Enchanter)
- All 27 tier 0 combinations (3 choices × 3 levels)
- 3 level brackets to exercise all ability tiers:
  - Level 8: has all tier 0 abilities, no spec abilities — tests tier 0 in isolation
  - Level 20: has tier 0 + spec tiers 1-3 (levels 10, 14, 20)
  - Level 35: has tier 0 + spec tiers 1-5 (levels 10, 14, 20, 25, 32)

**Suggested structure (same as warrior):**
- All 27 tier 0 combos × 3 specs × 3 levels with human = 243 combats
- All 7 races × 3 specs × 3 levels with fixed tier 0 combo = 63 combats
- Total: ~306 combats minimum

If the warrior config is already set up to be parameterized by class, duplicate and modify it for Mage. If it's hardcoded to Warrior, create a new config following the same pattern.

**Monster selection:** Use level-appropriate monsters:
- Level 8 → fight L6-10 monsters
- Level 20 → fight L17-22 monsters (use new L17-30 monsters)
- Level 35 → fight L30-35 monsters

### Run the Sim

```
npm run sim:run -- --config mage-functional-verify
```

Results persist to DB for admin dashboard. After the sim completes, report in chat:
- Total combats run
- Total errors/crashes
- For each of the 9 tier 0 abilities: fire count
- For each of the 18 spec abilities: fire count, noting which are NEW (first time tested)
- Any abilities that never fired and why
- Win rates at each level bracket (informational, not a balance concern)

---

## Phase 2: Deep Mechanical Audit

After the sim completes, run the mechanical audit against the Mage combat logs.

### Reuse the Warrior Audit Script

The audit script at `server/src/scripts/audit-warrior-combat-logs.ts` was built to validate class abilities against their definitions. It needs to be adapted for Mage:

**Option A (preferred):** Refactor the script to accept a class name as a parameter so it works for any class:
```
npx ts-node server/src/scripts/audit-combat-logs.ts --class mage --run-id <latest_sim_run_id>
```
Rename it from `audit-warrior-combat-logs.ts` to `audit-combat-logs.ts` and make it class-agnostic. The validation logic (damage ranges, buff durations, cooldowns, status tracking) is the same regardless of class — it just needs to load the right ability definitions.

**Option B (if refactoring is too invasive):** Duplicate the script as `audit-mage-combat-logs.ts` and update it to reference Mage abilities. Less elegant but faster.

### What To Validate (same as warrior audit)

For every `class_ability` action in the Mage sim combat logs:

**A. Damage validation** — logged damage within dice range + bonuses. Special attention to:
- Fireball (AoE) — validate per-target damage in `perTargetResults`
- Chain Lightning (multi-target) — validate each target hit
- Meteor Strike (massive AoE) — validate per-target damage
- Life Drain — validate damage AND healing (50% of damage dealt)
- Soul Harvest — validate AoE damage AND per-target healing
- Corpse Explosion — has a "requires corpse" condition. Did it fire correctly? Did it fail gracefully when no corpse?

**B. Buff/debuff validation** — correct names, correct stat modifiers:
- Elemental Shield (absorb 30 damage) — is damage absorption tracked correctly?
- Bone Armor (absorb 25 + 3 AC) — dual effect: absorption AND AC bonus
- Enfeeble (-4 attack, -3 AC) — verify both modifiers apply
- Arcane Siphon (-4 attack) — verify modifier applies
- Haste (extra action) — does the character actually get an extra action that turn?

**C. Status effect validation:**
- Frost Lance applies "slowed" — now that slowed affects flee DC (Fix 6), verify it's applied correctly
- Polymorph — transforms enemy for 2 rounds. What does this actually do mechanically? Is the target prevented from acting? Verify duration.

**D. Duration tracking** — every buff/debuff/status applied:
- Applied round → expected expiry → actual expiry → MATCH/MISMATCH
- Bone Armor: 5 rounds
- Elemental Shield: 4 rounds
- Enfeeble: 3 rounds
- Arcane Siphon: 3 rounds

**E. Cooldown validation** — consecutive uses by same actor:
- Chain Lightning: CD 3
- Corpse Explosion: CD 4
- Haste: CD 6
- Meteor Strike: CD 10
- All others per their definitions

**F. Passive abilities:**
- Arcane Mastery (all elemental cooldowns -30%) — can we observe reduced cooldowns in the logs? If an Elementalist's Fireball has CD 0, this may be unobservable.
- Lichdom (revive at 50% HP on death) — did any Necromancer die and revive? If so, verify HP. If not, note as untestable.
- Spell Weaver (all cooldowns -1 round) — can we observe this? Check if Enchanter cooldowns are consistently 1 round shorter than defined.

**G. Save-based abilities:**
- Polymorph likely requires a save. Verify DC formula, save stat, and success/fail outcomes.
- Any other Mage abilities with saves.

**H. Drain mechanics:**
- Life Drain heals for 50% of damage dealt. Verify: if 12 damage dealt, 6 healing received.
- Soul Harvest heals 8 per target hit. Verify per-target healing matches.

**I. Auto-hit mechanics:**
- Arcane Bolt never misses. Verify: no misses logged for Arcane Bolt across all uses.

**J. Fallback-to-attack check:**
- If any ability's `fallbackToAttack` flag is true in the log, that means the effect handler didn't know how to resolve it and fell back to a basic attack. Flag ALL instances — these are broken abilities masquerading as working ones.

### Output

Write results to `docs/mage-ability-mechanical-audit.md` with the same structure as the warrior audit:

1. Per-ability audit summary (PASS / ISSUES for each)
2. Duration audit detail
3. Cooldown audit detail
4. Anomalies & failures
5. Untestable abilities
6. Drain/absorb/auto-hit special mechanic validation
7. Fallback-to-attack instances

### In Chat

Provide a brief summary:
- Total abilities tested
- PASS / ISSUES count
- Any CRITICAL or MODERATE issues found (with ability name and what's wrong)
- List of untestable abilities

### Do NOT fix any bugs found. Audit and document only.
### No deploy needed — just the sim run and audit results.
