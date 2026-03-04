# Audit: Combat Simulator Capabilities — What Exists vs What's Needed

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- Bias toward action. Produce rather than over-plan.
- **Minimize tool calls** — batch reads, keep analysis brief.
- **Keep chat responses short** — dump all detailed findings to the output file.
- **This is a READ-ONLY audit.** Do not modify any code. Do not create branches. Do not deploy.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## THE TASK

We want to run hundreds of direct combat simulations to test balance — specific race/class/level matchups against specific monsters, without running the full economy/travel simulation loop. No daily ticks, no waiting for road encounters. Just: build combatant → build monster → fight → record result → repeat.

Before building this, audit what already exists.

### Question 1: The 1v1 Simulator Tab

Check `client/src/components/admin/combat/SimulatorTab.tsx`:

- What can it currently do? (pick combatants, configure fight, run it)
- What API endpoint does it call to execute a fight?
- Can it run player-vs-monster? Player-vs-player? Monster-vs-monster?
- Does it use the real combat engine (`combat-engine.ts`) or a simplified version?
- Can you configure: race, class, level, equipment, stats?
- Does it record results to `CombatEncounterLog` or is it ephemeral?
- Can it run multiple fights in a batch or only one at a time?

### Question 2: The Combat Engine Entry Points

Check how combat can be initiated programmatically:

- `server/src/lib/combat-engine.ts` — What's the main entry function? What params does it need? (combatant objects, monster data, etc.)
- How is a "combatant" built? What does `createCharacterCombatant()` need?
- How is a monster combatant built? Is there `createMonsterCombatant()` or equivalent?
- Can the engine run a fight without a real Character in the database? (i.e., can you pass synthetic/generated stats?)
- What does the engine return? (winner, rounds, combat log, HP tracking, etc.)

### Question 3: The Simulation Combat Path

Check how the full simulation triggers combat:

- `server/src/lib/road-encounter.ts` — How does it build the player combatant for the engine?
- `server/src/services/tick-combat-resolver.ts` — Same question
- What stats/data do they pass to the combat engine?
- Could we reuse the combatant-building logic without the travel/road-encounter wrapper?

### Question 4: Monster Data Access

- How are monsters loaded for combat? By level? By biome? Random?
- Can we select a specific monster by name/ID for testing?
- What does a monster combatant look like when passed to the engine?
- Where is the monster → combatant conversion logic?

### Question 5: Backend Simulation Endpoint

Check if there's already a batch simulation endpoint:

- `server/src/routes/admin/simulation.ts` — any endpoint for direct combat simulation (not the full economy sim)?
- `server/src/routes/admin/combat.ts` or similar — any "simulate fight" endpoint?
- What endpoint does the SimulatorTab call?

### Question 6: What Would a Batch Combat Simulator Need?

Based on Q1-Q5, outline exactly what functions/services already exist that a batch simulator could reuse, and what's missing. The goal is:

```
Input: 
  - Character template: { race, class, level, equipment? }
  - Opponent: { monsterName } or { race, class, level }
  - Iterations: 100
  
Output:
  - Win rate, avg rounds, avg HP remaining, death rate
  - Per-round breakdown (optional)
  - Results logged to CombatEncounterLog with a SimulationRun
```

What existing functions can be called directly? What wrapper is needed?

---

## OUTPUT

Write ALL findings to: `D:\realm_of_crowns\audits\combat-simulator-capabilities.md`

Structure:

```markdown
# Combat Simulator Capabilities Audit

## Summary
[2-3 sentences: what exists, what's missing for batch combat testing]

## Q1: 1v1 Simulator Tab
[Current capabilities, API endpoint, limitations]

## Q2: Combat Engine Entry Points
[Main functions, required params, synthetic combatant support]

## Q3: Simulation Combat Path
[How road encounters build combatants, reusability]

## Q4: Monster Data Access
[Loading, selection, conversion to combatant]

## Q5: Existing Endpoints
[Any direct combat sim endpoints]

## Q6: Batch Simulator Blueprint
[What exists vs what's needed — specific functions to reuse, gap list]
```

In chat, just say: "Audit complete. [1 sentence summary]. Results in `audits/combat-simulator-capabilities.md`."

## DO NOT

- Do not modify any code
- Do not create git commits
- Do not deploy anything
- Do not spend more than 2-3 sentences per answer in chat — put the detail in the file
