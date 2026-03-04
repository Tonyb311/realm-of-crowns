# Prompt: Audit + Fix Save DC Stat Assignments Across All Classes

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
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

## Task: Audit and Fix Save DC Stat Assignments Across All 7 Classes

### The Problem

The Bard class audit revealed that Bard is the primary CHA class, but its save DCs may not use CHA as the casting stat. This means Bard abilities that require saving throws might be using INT or WIS for the DC calculation, making them weaker than intended (since Bards invest in CHA, not INT/WIS).

This might be a game-wide issue. Every class has a primary stat, and abilities requiring saves should use that class's primary stat for the DC formula.

### Step 1: Document the Intended Design

Each class has a defined primary stat (from the codex):

| Class | Primary Stat | Save DCs should use |
|-------|-------------|-------------------|
| Warrior | STR | STR modifier |
| Mage | INT | INT modifier |
| Rogue | DEX | DEX modifier |
| Cleric | WIS | WIS modifier |
| Ranger | DEX | DEX modifier (or WIS — Rangers could go either way, check the data) |
| Bard | CHA | CHA modifier |
| Psion | INT | INT modifier |

The save DC formula should be: **8 + proficiency bonus + [class primary stat modifier]**

### Step 2: Audit How Save DCs Are Currently Calculated

1. Find the save DC calculation in the combat engine. Check:
   - `server/src/lib/combat-engine.ts` — is there a `calculateSaveDC()` function?
   - `server/src/lib/class-ability-resolver.ts` — do individual handlers calculate DCs?
   - `shared/src/utils/dice.ts` — is DC calculation in the dice utility?

2. Document what stat the current DC calculation uses. Possibilities:
   - **Hardcoded stat** — e.g., always uses WIS modifier regardless of class
   - **Per-ability stat** — each ability definition specifies which stat to use
   - **Per-class stat** — looks up the caster's class and uses the appropriate stat
   - **Generic formula** — uses the highest stat, or a fixed number

3. If it's hardcoded to one stat (e.g., always WIS), that's the bug — Warriors using WIS for Intimidating Shout DCs makes no sense.

### Step 3: Audit Every Ability That Requires a Save

Search all 7 class ability data files for any ability with save-related fields:

```
shared/src/data/skills/warrior.ts
shared/src/data/skills/mage.ts
shared/src/data/skills/rogue.ts
shared/src/data/skills/cleric.ts
shared/src/data/skills/ranger.ts
shared/src/data/skills/bard.ts
shared/src/data/skills/psion.ts
```

For each ability that has a save:
- What save type does the TARGET roll? (WIS, CON, DEX, STR, etc.)
- What stat does the CASTER use for the DC? (This is the question — does it use the class primary stat?)
- Is the save stat explicitly specified in the ability data, or inherited from a global setting?

Also check tier 0 abilities — they're class-wide (pre-specialization) and should also use the class primary stat.

### Step 4: Fix

**If the DC calculation is hardcoded to one stat:**
Refactor it to be class-aware. The cleanest approach:

1. Add a `saveDCStat` field to a class definition lookup (or use the existing `primaryStat` from the codex `CLASS_INFO`), so the engine can look up which stat a class uses for save DCs.

2. Update the DC calculation function to: `8 + proficiencyBonus + getModifier(caster.stats[classPrimaryStat])`

3. This should be a single point of change — find the DC calculation function and make it class-aware.

**If saves are per-ability (each ability specifies its own DC stat):**
Audit every ability and verify the DC stat matches the class primary stat. Fix any mismatches. A Bard ability should not be using INT for its DC — it should use CHA.

**If there's no save DC calculation at all (saves auto-fail or auto-succeed):**
That's a bigger problem. Implement proper save DC calculation using the formula above.

### Step 5: Cross-reference with Combat Logs

Pull save results from the 7 class verification sims. For each save that was logged:
- What DC was used?
- Back-calculate: does the DC = 8 + prof + correct stat modifier?
- If the DC used the wrong stat, note the discrepancy

This validates both the old (broken) behavior and confirms the fix.

### Step 6: Document

Write findings to `docs/audit-save-dc-stats.md`:

1. **Current implementation** — how DCs are calculated today, which stat is used
2. **Per-class audit** — for each class, list every save-requiring ability, what stat it should use, what stat it currently uses
3. **Fixes applied** — what was changed and where
4. **Log verification** — DC values from combat logs before/after

### Step 7: Verify

Run a targeted sim to verify the fix:
- 5 combats each for Bard (CHA save), Warrior (STR save), and Psion (INT save) — classes with different primary stats
- Each must use an ability that requires a save
- Check the logged save DC: does it match 8 + prof + correct stat modifier?
- Report the DCs in chat

### Deployment

```
git add -A
git commit -m "fix: save DCs now use class primary stat (CHA for Bard, STR for Warrior, etc.)"
git push
```

Build and deploy to Azure with unique image tag. Never use `:latest`.
