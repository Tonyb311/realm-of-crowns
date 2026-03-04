# Prompt: Rerun Warrior Functional Verification — Full Tier Coverage

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/sim-analyst.md
cat docs/tier0-ability-choices-summary.md
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

## Task: Rerun Warrior Functional Verification With Full Monster Range

The first run of the warrior functional verification (306 combats) confirmed all 9 tier 0 abilities and tier 1-2 spec abilities work. However, tier 3-5 spec abilities (12 of 18) were never tested because the highest available monster was level 16. New monsters up to level 35 have now been deployed.

### What To Do

1. **Check the existing sim config** at `server/src/scripts/sim-configs/warrior-functional-verify.ts` (or whatever it was named — check the sim-configs directory).

2. **Update the config** to fight level-appropriate monsters now that L17-35 monsters exist. The previous run used levels 8, 20, and 35. The level 20 and 35 characters were fighting the L16 Elder Fey Guardian and getting destroyed. Now they should fight monsters closer to their own level:
   - Level 8 characters → fight L6-10 monsters (unchanged, these worked fine)
   - Level 20 characters → fight L17-22 monsters (new monsters)
   - Level 35 characters → fight L30-35 monsters (new monsters)
   
   Check how the sim selects opponents — does it pick monsters by level range automatically, or does the config specify the monster? If the config specifies monsters, update it to use appropriate new monsters at each level bracket. If the sim auto-selects based on level proximity, just verify the new monsters are in the DB and let it work.

3. **Focus this run on the untested abilities.** The previous run already confirmed tier 0 and tier 1-2 spec abilities work. This run's primary goal is to verify tiers 3-5. That means:
   - Level 20 combats (should exercise tier 1-3 abilities: levels 10, 14, 20)
   - Level 35 combats (should exercise tier 1-5 abilities: levels 10, 14, 20, 25, 32)
   - Level 8 combats can be dropped or kept minimal — we already know those work
   
   Keep the same race × spec × tier 0 coverage from before so we don't lose ground, but the critical thing is that fights at L20 and L35 are now survivable and last long enough for the full ability queue to cycle.

4. **Run the sim.** Use the existing CLI. Results persist to DB for admin dashboard viewing.

5. **In chat, report:**
   - Total combats run
   - Total errors (should be 0)
   - For each of the 18 spec abilities: did it fire? How many times?
   - Specifically call out the 12 abilities that were untested last time — did they all fire this time?
   - Any abilities that STILL never fired and why
   - Any new errors or anomalies with the new monsters

### Critical Check

If the level 20/35 characters are STILL dying too fast against level-appropriate monsters (meaning higher-tier abilities still don't cycle), that's important information. Report the win rates at each level bracket. If fights are too short, we may need to look at monster tuning — but that's a separate prompt. For now just report what happens.

### Do NOT fix bugs, do NOT write analysis files. Results are in the DB. Brief summary in chat only.

### No deploy needed — just run the sim.
