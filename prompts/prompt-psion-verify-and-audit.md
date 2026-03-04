# Prompt: Psion Functional Verification + Mechanical Audit

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

## Task: Psion Class — Full Functional Verification + Deep Mechanical Audit

Same process. Run the sim, then audit combat logs. Psion is the final class — after this, all 7 are verified.

### Psion Class Info

**Specializations:** Telepath, Kineticist, Seer

Check `shared/src/data/skills/psion.ts` for all tier 0 and spec ability definitions. Tier 0 fix applied: Id Insinuation (damage_status field mismatch).

**IMPORTANT:** Psion abilities use a SEPARATE resolver — `psion_ability` action type, not `class_ability`. The audit script validates `ClassAbilityResult` entries. It needs to ALSO validate `PsionAbilityResult` entries, which have a different structure (see `shared/src/types/combat.ts`). The `PsionAbilityResult` type includes fields like `controlled`, `banished`, `negatedAttack`, `echoAction` that don't exist on `ClassAbilityResult`.

Check whether the Psion's spec abilities route through `class_ability` or `psion_ability` in combat logs. If they use `psion_ability`, the audit script needs to handle that type. If they use `class_ability`, the existing script should work.

Also check: do Psion TIER 0 abilities route through `class_ability` or `psion_ability`? They might differ since tier 0 was added later.

---

## Phase 1: Functional Verification Sim

### Sim Config

Create `server/src/scripts/sim-configs/psion-functional-verify.ts` following the established pattern.

**Coverage:**
- All 27 tier 0 combos × 3 specs × 3 levels (8, 20, 35) with human = 243 combats
- All 7 races × 3 specs × 3 levels with fixed tier 0 combo = 63 combats
- Total: ~306 combats
- Level-appropriate monsters at each bracket

**Note:** Psion's existing ability level schedule is slightly different (1→5→12→18→28→40 pre-restructure, now shifted). Verify the current levels in the data file to ensure the sim level brackets capture the right abilities.

### Run the Sim

Report in chat: total combats, errors, tier 0 fire counts (9), spec ability fire counts (18), any that never fired and why, win rates.

---

## Phase 2: Deep Mechanical Audit

Use the class-agnostic audit script. **CRITICAL:** Before running, verify the script handles `psion_ability` action types in the combat logs. If Psion abilities log as `PsionAbilityResult` instead of `ClassAbilityResult`, the script needs to be extended to parse and validate that type.

### Psion-Specific Mechanics To Validate

Psion has the most exotic mechanics in the game. The `PsionAbilityResult` type has unique fields that no other class uses:

**A. Mind control / dominated:**
- Telepath likely has Dominate or Enthrall. Verify:
  - `controlled: true` is logged
  - The dominated target actually attacks its allies or skips its turn on subsequent rounds
  - The domination has a save (WIS save expected)
  - Duration matches definition
  - Does it break on damage? (Common D&D mechanic — verify)

**B. Banish mechanics:**
- If any Psion ability banishes: `banished: true` should be logged
  - The stat audit flagged `banishedUntilRound` as DEAD. Check if Psion's banish implementation reads this field or uses a different system.
  - Verify the banished target is untargetable and doesn't act for the correct duration
  - Verify they return after the banish expires

**C. Attack negation:**
- `negatedAttack: true` — some Psion ability negates an incoming attack. Verify:
  - When does this trigger? (Reactive? Buff-based?)
  - Does it actually prevent damage?

**D. Echo action:**
- `echoAction: true` — some ability copies/echoes another action. Verify:
  - What is echoed? The last action? A random ability?
  - Does the echo deal correct damage/apply correct effects?

**E. Psychic damage type:**
- Psion abilities likely deal psychic damage. Verify `damageType` is logged.
- Check if any monsters have psychic resistance/immunity — if so, does the resistance system apply?
- Psion abilities should NOT be blocked by silence (Fix 3 confirmed — `psion_ability` is exempted)

**F. Save-heavy class:**
- Psion probably has the most save-dependent abilities. For every save:
  - Verify save stat matches definition (WIS save for mind control, INT save for psychic, etc.)
  - Verify DC formula: 8 + proficiency + INT modifier (Psion primary stat)
  - Verify success/fail outcomes (half damage on save? No effect? Reduced duration?)

**G. Telekinetic / force mechanics (Kineticist):**
- Kineticist likely has force damage, push/pull effects, or telekinetic manipulation. Verify these resolve correctly.
- Force damage should bypass most resistances (it's non-elemental).

**H. Precognition / foresight (Seer):**
- Seer may have abilities that grant dodge, reroll, or foreknowledge. Verify:
  - Dodge/evasion buffs apply correctly
  - If rerolls exist, are they logged and resolved correctly?

**I. Psion resource system:**
- Do Psion abilities use mana, psi points, or are they cooldown-only? Check the ability definitions for any resource cost fields and verify they're tracked/consumed.

**J. Tier 0 routing:**
- Verify Psion tier 0 abilities use the same action type and resolver as other classes (`class_ability` via `class-ability-resolver.ts`). If they route through the psion-specific resolver instead, the validation needs to account for the different result structure.

**K. Fallback-to-attack check:**
- Flag ALL instances of `fallbackToAttack: true` in both `ClassAbilityResult` and `PsionAbilityResult` entries.

**L. Standard checks:**
- Damage ranges, buff/debuff names and durations, cooldown enforcement, status effects, duration tracking, save-based abilities

### Output

Write to `docs/psion-ability-mechanical-audit.md`.

In chat: brief summary — total tested, PASS/ISSUES, critical/moderate issues, untestable abilities, design questions. Specifically note:
- Whether psion_ability vs class_ability routing caused any audit gaps
- Any dead mechanics from the stat audit (banishedUntilRound) that are confirmed still dead
- Whether silence correctly does NOT block Psion abilities

### Do NOT fix bugs. Audit only. No deploy.
