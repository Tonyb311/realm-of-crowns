# Prompt A: Remove Skill Points + Auto-Grant Spec Abilities on Level-Up

```
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
cat docs/audit-class-ability-levels.md
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

## Task: Remove Skill Points and Convert to Auto-Grant Ability System

Read the audit file (`docs/audit-class-ability-levels.md`) carefully before doing anything. It documents the current ability system architecture, skill point mechanics, and all relevant files.

### What We're Doing

We are removing the skill point system entirely and converting all specialization abilities to auto-unlock when a character reaches the required level. This is a system-level change that touches the data model, backend services, API routes, and frontend UI.

### Context From The Audit

- Abilities currently require skill points to unlock via `POST /api/skills/unlock`
- The skill tree (`GET /api/skills/tree`) returns abilities with `canUnlock` flags based on level + skill points + prerequisites
- `CharacterAbility` rows are created when a player spends skill points
- The combat system only cares about `CharacterAbility` records — it doesn't re-check levels at combat time
- Ability definitions live in `shared/src/data/skills/{class}.ts` with `levelRequired` fields

### Step 1: Shift Existing Ability Level Requirements

Before removing skill points, update the `levelRequired` values for all existing abilities. The current schedule (1 → 5 → 10 → 18 → 28 → 40) is being restructured to make room for new minor abilities at levels 3, 5, and 8 (those come in a separate prompt). The new schedule for existing spec abilities:

| Current Level | New Level | Notes |
|--------------|-----------|-------|
| 1 (Tier 1) | 10 | Aligns with specialization selection at level 10 |
| 5 (Tier 2) | 14 | |
| 10 (Tier 3) | 20 | Psion tier 3 was at 12, also moves to 20 |
| 18 (Tier 4) | 25 | |
| 28 (Tier 5) | 32 | |
| 40 (Tier 6) | 40 | Capstone unchanged |

Update these in ALL files under `shared/src/data/skills/{class}.ts` for all 7 classes, all 21 specializations, all 126 abilities.

### Step 2: Remove Skill Points From The Data Model

- Remove `skillPoints` (or whatever the field is called) from the Character model in Prisma schema
- Create a database migration to drop the column
- Remove any logic that awards skill points on level-up
- Remove any skill point validation from ability unlock logic
- Remove skill point display from any frontend components

Search thoroughly for all references to skill points across the codebase. Common places:
- Character creation / level-up services
- Skill tree API route
- Frontend skill tree / character sheet components
- Shared type definitions
- Seed data

### Step 3: Convert Ability Unlocking to Auto-Grant

**The new flow:** When a character levels up AND has a specialization selected, automatically grant them any abilities they now qualify for based on their level and spec.

Implementation:
1. Find the level-up logic (wherever XP is processed and character level incremented)
2. After incrementing the level, add a hook: query all abilities for the character's class + specialization where `levelRequired <= newLevel`
3. For each qualifying ability, check if a `CharacterAbility` row already exists — if not, create one
4. This is idempotent — running it multiple times won't create duplicates

**Specialization selection flow:** When a player picks their specialization at level 10, immediately grant all spec abilities they qualify for (which at level 10 would be the tier 1 ability at level 10). The same auto-grant logic should run here.

**Edge case — respeccing:** If the game supports changing specializations, the old spec's abilities should be revoked and the new spec's abilities should be granted. Check if respec exists in the codebase and handle it if so.

### Step 4: Update the Skill Tree API

`GET /api/skills/tree` currently returns abilities with unlock state based on skill points. Change it:
- Remove all skill point references from the response
- Abilities should show as: "locked" (level too low), "unlocked" (auto-granted, in character's ability list), or "upcoming" (level not yet reached, shows required level)
- Remove the `canUnlock` flag — there's no manual unlock anymore
- The response should still show the full specialization tree so players can see what's coming

### Step 5: Remove the Skill Point Unlock Endpoint

`POST /api/skills/unlock` is no longer needed. Either:
- Remove the route entirely, OR
- Repurpose it if it's needed for the tier 0 choice system (coming in the next prompt) — but for now, remove it. The next prompt can add a new endpoint if needed.

### Step 6: Update Frontend

- The skill tree UI should reflect the new auto-grant system — no "unlock" buttons, no skill point counter
- Show abilities as locked/unlocked/upcoming with level requirements
- If there's a skill point display on the character sheet or HUD, remove it
- The skill tree can still exist as a "progression viewer" showing what you have and what's coming

### Step 7: Update Seed Data

- Re-seed with the new `levelRequired` values
- Ensure seeded test characters have the correct abilities auto-granted for their level and spec
- Remove any seed logic that grants skill points

### Step 8: Update Combat Systems

- `buildAbilityQueue()` in the combat simulator filters by `levelRequired <= level` from the shared data files. Since we changed `levelRequired` values, verify this still works correctly for simulated characters at various levels.
- The tick combat resolver uses `CharacterAbility` records — since auto-grant creates these records, it should work. But verify.
- Run the full combat test suite. **All 65 scenarios must still pass.** Tests will likely break because:
  - Characters at level 1 no longer have tier 1 abilities (those moved to level 10)
  - Any test that creates a low-level character and expects combat abilities will fail
  - Fix these by adjusting test character levels OR by accepting that low-level characters (1-9) currently have no abilities (tier 0 abilities come in the next prompt)
  - For now, if tests require abilities, set test characters to level 10+ so they have tier 1 abilities
  - Document any test modifications in the summary

### Output

Write `docs/skill-point-removal-summary.md` containing:
- List of all files modified
- The new level schedule for all existing abilities
- How auto-grant works (the hook location and logic)
- Any edge cases encountered (respec, existing characters, etc.)
- Test suite results and any modifications made to tests

### Deployment

After all changes are complete and tests pass:

```
git add -A
git commit -m "feat: remove skill points, auto-grant spec abilities on level-up, shift ability level requirements"
git push
```

Build and deploy to Azure with a unique image tag (timestamp or commit hash). Never use `:latest`.

Run the DB migration to drop the skill points column, then re-seed abilities.
