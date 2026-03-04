# Prompt: Deep Mechanical Audit of Warrior Combat Logs

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/sim-analyst.md
cat shared/src/types/combat.ts
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

## Task: Deep Mechanical Audit of Warrior Ability Combat Logs

We've already confirmed that Warrior abilities fire without crashing. Now we need to verify they're doing the RIGHT thing — correct damage values, correct modifiers, correct durations, correct cooldown enforcement. This is a line-by-line mechanical audit of the combat log data.

### What This Is

Write a script that:
1. Pulls all combat encounter logs from the most recent warrior functional verification sim run from the database
2. Loads every Warrior ability definition from the shared data files (tier 0 + all 3 specs)
3. For every `class_ability` action in every combat log, cross-references the logged result against the ability definition and validates that the mechanics were applied correctly

### Step 1: Understand the Data

Before writing anything, examine these files to understand the structures:

**Ability definitions:** `shared/src/data/skills/warrior.ts` — contains all Warrior abilities with their `effects` objects defining exactly what each ability should do (damage dice, bonus damage, buff names, durations, stat modifiers, cooldowns, etc.)

**Ability type:** `shared/src/data/skills/types.ts` — the `AbilityDefinition` interface, especially the `effects` field structure

**Combat log type:** `shared/src/types/combat.ts` — specifically:
- `ClassAbilityResult` — what gets logged when a class ability fires. Contains: damage, healing, buffApplied, buffDuration, debuffApplied, debuffDuration, statModifiers, statusApplied, statusDuration, save info, attack rolls, per-target AoE results, multi-strike results, etc.
- `StatusTickResult` — logged each round when active status effects tick (DoT damage, HoT healing, expiration)
- `TurnLogEntry` — wraps the result + status ticks for each turn
- `ActiveBuff` on the Combatant — tracks active buffs with remaining duration

**Effect resolver:** `server/src/lib/class-ability-resolver.ts` — the handler functions that translate ability definitions into combat results. Understanding how it works will help you know what to validate.

**DB model:** Check the Prisma schema for the combat encounter log model — find where round data / turn logs are stored as JSONB so you know how to query them.

### Step 2: Write the Audit Script

Create a script at `server/src/scripts/audit-warrior-combat-logs.ts` that does the following:

**For EVERY class_ability action in the sim's combat logs, validate:**

#### A. Damage Validation
- If the ability definition specifies `diceCount` and `diceSides`: verify the logged `damage` falls within the possible range (minimum = diceCount × 1 + bonusDamage, maximum = diceCount × diceSides + bonusDamage). Flag any damage outside this range.
- If the ability specifies `bonusDamage` only (no dice): verify the logged damage matches exactly.
- If the ability is a healing ability: same validation but on the `healing` or `selfHealing` field.
- For AoE abilities with `perTargetResults`: validate each target's damage individually.
- For multi-attack abilities with `strikeResults`: validate each strike's damage individually.
- Check that `damageType` in the log matches what the ability definition specifies (if specified).

#### B. Buff/Debuff Validation
- If the ability applies a buff: verify `buffApplied` matches the expected buff name from the definition.
- Verify `buffDuration` matches the `duration` in the ability's effects.
- If the ability applies a debuff: verify `debuffApplied` and `debuffDuration` match.
- If `statModifiers` are logged: verify they match the ability definition's stat modifiers (e.g., if the ability says +5 attack, the log should show `{ attack: 5 }` or equivalent).

#### C. Status Effect Validation
- If the ability applies a status effect: verify `statusApplied` matches the expected status.
- Verify `statusDuration` matches the definition.
- Then trace forward in subsequent rounds: does the status actually tick for the right number of rounds? Look at `StatusTickResult` entries in later turns for that combatant to verify the effect persists for exactly the specified duration and then expires.

#### D. Duration Tracking (Critical)
This is the most important check. For every buff, debuff, and status effect applied:
- Track the round it was applied
- Scan forward through subsequent rounds in the same combat
- Count how many rounds the effect persisted (via status ticks or buff presence)
- Verify it expired on the correct round (applied round + duration)
- Flag any effect that expired too early or too late
- Flag any effect that never expired (persisted past when it should have ended)

#### E. Cooldown Validation
- For each ability with a cooldown > 0: find every usage of that ability by the same actor in the same combat
- Verify the gap between consecutive uses is >= the cooldown (in rounds)
- Flag any ability that was used before its cooldown expired

#### F. Self-Damage / Self-Debuff Validation
- Some abilities (like Reckless Strike) apply negative effects to the caster. Verify:
  - The self-debuff is applied (e.g., -2 defense)
  - The duration is correct
  - It actually reduces the caster's stats in subsequent rounds

#### G. Conditional / Scaling Abilities
- Blood Rage scales with missing HP%. Verify the logged damage is appropriate for the actor's HP at time of cast.
- Any ability with conditional bonuses: check that the bonus applied when the condition was met and didn't apply when it wasn't.

#### H. Passive Abilities
- Inspiring Presence (passive HP regen) won't appear as a `class_ability` action but should show as healing each round. Check if the actor with this ability receives consistent HP per round from a regen-like source.
- Undying Fury (survive fatal blow at 1 HP) — scan for any instance where the actor's HP should have hit 0 but didn't. If no such instance occurred in the sim, note it as "not testable in current data."

#### I. Save-Based Abilities
- For abilities requiring saving throws: verify the save type matches the definition, the DC is calculated correctly (check how the engine computes save DCs — usually 8 + proficiency + stat modifier), and the effect is reduced/negated on a successful save.

### Step 3: Output

Write results to `docs/warrior-ability-mechanical-audit.md`. Structure:

**1. Per-Ability Audit Summary**
For each of the 27 testable Warrior abilities (9 tier 0 + 18 spec), report:
- Ability name, tier, level, effect type
- Total uses found in logs
- Damage validation: PASS / FAIL (with details on failures)
- Buff/Debuff validation: PASS / FAIL / N/A
- Duration validation: PASS / FAIL / N/A (with specific round counts)
- Cooldown validation: PASS / FAIL / N/A
- Stat modifier validation: PASS / FAIL / N/A
- Status effect validation: PASS / FAIL / N/A
- Overall: PASS / ISSUES FOUND

**2. Duration Audit Detail**
A dedicated section for duration tracking since this is the most likely source of bugs:
- For every buff/debuff/status applied in the logs, list: ability name → effect name → applied round → expected expiry round → actual expiry round → MATCH / MISMATCH

**3. Cooldown Audit Detail**
For every ability with a cooldown:
- List every pair of consecutive uses by the same actor: round X → round Y → gap → expected minimum → PASS / VIOLATION

**4. Anomalies & Failures**
- Every validation failure with full context: combat ID, round number, actor, ability, expected value, actual value
- Group by severity: CRITICAL (wrong damage/effect), MODERATE (wrong duration), MINOR (cosmetic/logging issues)

**5. Untestable Abilities**
List any abilities that couldn't be fully validated and why (e.g., passive abilities without explicit log entries, L40 abilities not present in data, conditional abilities where the condition never triggered)

### Important Notes

- This is analysis only. Do NOT fix anything. Document everything.
- The script should be runnable via `npx ts-node server/src/scripts/audit-warrior-combat-logs.ts` or similar
- Connect to the DB directly (same as other scripts in the scripts directory — check how they connect)
- If the sim run data is identifiable by a run ID, use the most recent warrior verification run. Check the `simulationRunId` field on combat encounter logs.
- Keep the script — we'll reuse it for the other 6 classes later

### No deploy. No git commit. Just the script and the results file.
