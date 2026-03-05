# Prompt: Deep Group Combat Analysis — Ability Usage, Timing, and Dead Effects

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/sim-analyst.md
cat docs/audit-combat-stat-mechanics.md
cat docs/group-combat-diagnostic.md
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

## Task: Deep Group Combat Analysis — Ability Usage, Timing, and Dead Effects

We have 450 group combat encounters in the DB from the baseline sim. Write a script that pulls these logs and performs a comprehensive analysis of how every combatant uses abilities, when they use them, what effects actually do something, and what effects are mechanically dead.

### Create Analysis Script

Create `server/src/scripts/analyze-group-combat.ts` — a script that connects to the DB, pulls all group combat encounter logs from the most recent group baseline sim run, and produces a detailed analysis.

### Section 1: Per-Class Ability Usage Breakdown

For each of the 7 classes that appear across the 5 party compositions, report:

**A. Ability usage frequency:**
- Every ability used by that class across all combats
- Total uses, uses per combat average
- What percentage of that class's total actions was each ability
- Rank abilities by frequency: which abilities dominate, which are rarely/never used

**B. Ability timing:**
- Average round when each ability is first used (e.g., "Fireball first used on round 1.3 on average")
- Is the ability front-loaded (used early) or back-loaded (used late)?
- For heal abilities specifically: what round does the first heal happen? What was the lowest ally HP% when the heal fired?

**C. Ability effectiveness:**
For each ability used, calculate:
- Average damage dealt per use (for damage abilities)
- Average healing done per use (for heal abilities)
- Hit rate (for weapon/spell attack abilities): hits / total uses
- Save failure rate (for save-based abilities): failed saves / total saves forced
- Status application rate: how often the status actually applied
- Kills attributed: how many times this ability delivered the killing blow

**D. Abilities never used:**
List every ability each class HAD available (based on level and spec) but NEVER used across all combats. These are abilities the AI queue never selects — they may as well not exist.

### Section 2: Per-Monster Ability Usage

Same analysis for monster abilities:
- Which monster abilities fired most
- Which monster abilities dealt the most total damage
- AoE ability impact: average targets hit, average total damage per use
- Status abilities: application rate, how many turns the status persisted
- Legendary actions: how many fired per combat on average, which abilities were chosen
- Phase transitions: how many triggered, what round on average

### Section 3: Status Effect Impact Analysis (CRITICAL)

This is the most important section. For EVERY status effect that was applied during the 450 combats:

**For each status effect, answer:**

1. **How many times was it applied?** (total across all combats)
2. **What applied it?** (which abilities, both player and monster)
3. **What did it mechanically DO to the affected combatant?** Trace the code:
   - Did it prevent actions? (stunned, paralyzed, frozen)
   - Did it reduce attack/damage? (weakened — check if the engine actually reads the weakened status and reduces anything)
   - Did it reduce AC? (check if any status modifies AC in the engine)
   - Did it reduce movement/flee? (slowed — we know this only adds +5 to flee DC, which is useless in group combat where nobody flees)
   - Did it deal damage per round? (poisoned, burning — check DoT ticks)
   - Did it heal per round? (regenerating — check HoT ticks)
   - Did it do NOTHING? (applied, logged, but the engine never checks for it during combat resolution)

4. **Quantify the impact:**
   - For action-preventing statuses (stunned, paralyzed): how many turns were skipped because of this status? Multiply by the affected combatant's average damage per turn = "damage prevented"
   - For DoT statuses (poisoned, burning): total damage dealt via DoT ticks across all combats
   - For weakened: find every attack made by a weakened combatant. Did their damage actually decrease compared to non-weakened attacks? (Compare average damage while weakened vs average damage while not weakened)
   - For slowed: find every turn by a slowed combatant. Did ANYTHING change? (We expect: nothing in group combat)
   - For frightened: what does frightened actually do in the engine? Check the code. Does it prevent attacking? Reduce accuracy? Force flee attempts? Or nothing?
   - For blinded: does it reduce hit chance?
   - For charmed/mesmerized: does it prevent attacking the charmer? Skip turns? Or nothing?
   - For restrained: does it reduce AC? Grant advantage to attackers? Or nothing?
   - For knocked_down: same questions

5. **Verdict per status:** Classify each as:
   - **ACTIVE** — has a real, measurable mechanical effect in group combat
   - **PARTIAL** — has some effect but weaker than expected (e.g., slowed only affects flee which doesn't happen)
   - **DEAD** — applied but the engine never checks for it, OR the effect is irrelevant in this context

### Section 4: Targeting Analysis

**Player targeting:**
- What percentage of player attacks target the lowest-HP enemy? (focus fire rate)
- Does the Cleric heal the lowest-HP ally? What % of heals go to the most injured party member?
- Does taunt actually redirect attacks? Count: attacks against taunter vs attacks against non-taunter while taunt is active
- Do AoE abilities fire more often when 3+ enemies are alive vs 1-2?

**Monster targeting:**
- Do monsters spread damage across the party or focus fire?
- Do monster AoEs hit all 5 party members every time?
- Do elite/boss monsters use their strongest abilities first or save them?
- Legendary action usage: are they used every round or saved?

### Section 5: Combat Flow Analysis

**Typical combat shape:**
- What's the average HP% of each party member by round? (HP curve over time)
- At what round does the first party member die? (average)
- At what round does the first monster die?
- Is there a "tipping point" round where one side starts consistently winning?
- How many combats go to max rounds vs ending in a TPK/victory?

**Action economy:**
- Actions per round: party vs monsters (5 players vs N monsters)
- Effective actions per round: subtract stunned/paralyzed/dead combatants
- Does the side with more effective actions always win?

### Output

Write all findings to `docs/group-combat-deep-analysis.md`. Structure it with the 5 sections above.

**At the end, include a summary table for status effects:**

| Status | Times Applied | By Whom | Mechanical Effect | Impact Rating | Verdict |
|--------|--------------|---------|-------------------|---------------|---------|
| stunned | X | Shield Bash, etc. | Prevents action | X turns prevented | ACTIVE |
| slowed | X | Hamstring, etc. | +5 flee DC only | 0 impact (no fleeing) | DEAD |
| weakened | X | Life Drain, etc. | ??? | ??? | ??? |
| frightened | X | Fear auras, etc. | ??? | ??? | ??? |
| ... | ... | ... | ... | ... | ... |

**In chat, provide a brief summary:**
- Top 3 most impactful player abilities
- Top 3 most impactful monster abilities
- Dead status effects (list)
- Any abilities that fired 100+ times but dealt 0 total damage or had 0 effect
- The single most important finding

### Do NOT fix anything. Analysis only. No deploy needed.
