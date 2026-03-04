# Prompt: Fix Psion Ability Routing Gap + Wire Up Temporal Echo Chaining

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/backend-developer.md
cat server/src/lib/class-ability-resolver.ts
cat server/src/services/tick-combat-resolver.ts
cat server/src/services/combat-simulator.ts
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

## Task: Fix Psion Ability Routing Inconsistency + Wire Up Temporal Echo

### The Problem

There's a routing inconsistency with Psion abilities:

1. **Psion spec abilities** are resolved through `resolvePsionAbility()` in the combat engine, which produces `PsionAbilityResult` with unique fields (`controlled`, `banished`, `negatedAttack`, `echoAction`).

2. **But in the sim and tick-combat-resolver**, psion abilities are dispatched as `class_ability` action type, which routes them through `resolveClassAbility()` / `class-ability-resolver.ts` instead. They still work (no crashes) because the class ability resolver handles them, but:
   - The unique `PsionAbilityResult` fields never get populated
   - The combat logs record them as `class_ability` instead of `psion_ability`
   - **Temporal Echo** specifically checks for `psion_ability` type in the last action to decide what to echo — since psion abilities are logged as `class_ability`, Echo never sees them and only echoes basic attacks

3. The Psion class verification confirmed: "All Psion abilities (tier 0 AND spec) log as class_ability in the encounter logs, despite spec abilities being resolved through resolvePsionAbility()."

### Step 1: Audit the Routing Path

Trace the full path for a Psion ability from decision to resolution:

**In auto-resolved combat (`tick-combat-resolver.ts`):**
- How does `decideAction()` select a Psion ability?
- What action type does it assign? (`class_ability` or `psion_ability`?)
- When `resolveTurn()` processes this action, which case does it hit?
- Does it call `resolveClassAbility()` or `resolvePsionAbility()`?

**In the sim (`combat-simulator.ts` / `combat-sim-runner.ts`):**
- Same questions — how does `simDecideAction()` handle Psion abilities?

**In the combat engine (`combat-engine.ts`):**
- What does `case 'psion_ability':` do in `resolveTurn()`?
- What does `case 'class_ability':` do?
- Is there a separate `resolvePsionAbility()` function? If so, what does it do differently from `resolveClassAbility()`?

Document the full routing path so we understand exactly where the split happens.

### Step 2: Decide on the Fix

There are two approaches:

**Option A: Route Psion spec abilities through `psion_ability` action type (proper fix)**
- Update `decideAction()` and `simDecideAction()` to emit `psion_ability` instead of `class_ability` for Psion spec abilities
- Ensure `resolveTurn()` routes `psion_ability` actions to the correct resolver
- This means combat logs correctly show `psion_ability` for Psion spec abilities
- Temporal Echo can then find psion abilities in the log to echo them
- Risk: the `psion_ability` resolver may have different behavior or bugs compared to the `class_ability` path that's been working fine

**Option B: Make Temporal Echo class-aware (simpler but messier)**
- Keep Psion abilities routing through `class_ability`
- Update Temporal Echo to look for the last `class_ability` action that was from a Psion ability (by checking the ability ID or class)
- Less clean but lower risk since we don't change the working routing

**Recommendation:** Choose based on what you find in the audit. If `resolvePsionAbility()` is a well-maintained function that handles all Psion abilities correctly, go with Option A. If it's outdated or only handles some abilities, go with Option B and note that proper routing is a future cleanup task.

**Important:** Tier 0 abilities should ALWAYS route through `class_ability` regardless — they're class-wide abilities shared with the standard resolver system. Only Psion SPEC abilities (the 18 specialization abilities) should potentially route through `psion_ability`.

### Step 3: Wire Up Temporal Echo

Once the routing is fixed (or worked around), Temporal Echo needs to echo psion abilities, not just basic attacks.

**Current behavior:** Temporal Echo looks at the combatant's last action. If it was a `psion_ability`, it re-executes it. Since psion abilities logged as `class_ability`, it never found one and fell back to echoing basic attacks.

**Desired behavior:** Temporal Echo should echo the last offensive psion ability (damage or debuff, not self-buffs). The echoed ability should:
- Deal the same damage type and amount (or re-roll dice)
- Apply the same status effects
- NOT consume a cooldown (it's an echo, not a real use)
- Log as `echoAction: true`

**Chaining approach (using the new tag system):** This is trickier than Vanish→Ambush because the "setup" is "use any high-damage psion ability" not a specific one. Options:
- Don't use the tag system for this — instead, have the AI check "is Temporal Echo off cooldown? If yes, prefer a high-damage psion ability this turn, knowing Echo will copy it next turn."
- Or simpler: just make Temporal Echo properly echo whatever the last action was (now that psion abilities are correctly identified). The AI doesn't need to chain — it just uses its best ability each turn, and Echo copies whatever it did last turn. The value comes naturally.

### Step 4: Verify

**Routing verification:**
- Run 10 Psion Seer combats at L25
- Check combat logs: do Psion spec abilities now log as `psion_ability` (if Option A) or still `class_ability` (if Option B)?
- Verify no crashes or fallback-to-attack

**Temporal Echo verification:**
- In the same 10 combats, check Temporal Echo uses:
  - Does it echo a psion ability (not just basic attack)?
  - Does `echoAction: true` appear in the log?
  - Does the echoed ability deal appropriate damage?
- Report: X Echo uses, Y echoed psion abilities, Z echoed basic attacks

**Regression check:**
- Run 5 combats for Psion Telepath and Psion Kineticist to make sure their abilities still work correctly after routing changes

### Output

In chat, report:
- Which routing option was chosen (A or B) and why
- How Temporal Echo was fixed
- Verification results (echo of psion abilities confirmed?)
- Any complications discovered

### Deployment

```
git add -A
git commit -m "fix: psion ability routing consistency + temporal echo now echoes psion abilities"
git push
```

Build and deploy to Azure with unique image tag. Never use `:latest`.
