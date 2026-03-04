# Audit: Simulation Data Management — Admin Combat Dashboard

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

The admin combat dashboard has a simulation stats section. When new simulations are run, old data clutters the view. We need a way to "clear" the view for a fresh simulation without deleting old data (old runs need to be available for comparison).

Before designing a solution, audit exactly how simulation data is stored and displayed.

### Question 1: Where Does Simulation Data Live?

Check the database schema for simulation-related tables/models:

- Search `database/prisma/schema.prisma` for: `Simulation`, `SimulationRun`, `CombatEncounterLog`, `CombatSession`, or any model that stores simulation output
- For each relevant model, document: model name, key fields, relationships, any batch/run grouping that already exists
- Is there a `source` or `type` field that distinguishes simulation combat from real player combat?
- Is there a `batchId`, `runId`, `simulationId`, or timestamp grouping?

### Question 2: How Does the Simulation Stats Page Read Data?

Check the admin combat dashboard simulation section:

- Find the component: likely in `client/src/components/admin/combat/` — which file renders simulation stats?
- What API endpoint(s) does it call?
- Does it query ALL combat data or filter to simulation-only?
- Does it already have any date range filtering or run selection?
- What stats/charts does it display? (win rates, balance metrics, etc.)

### Question 3: How Are Simulations Created?

Check the simulation engine:

- `server/src/lib/simulation/` — how does a simulation run get initiated?
- When a sim runs, what records does it create? (CombatEncounterLog entries? CombatSession entries? Something else?)
- Is there any metadata stored about the run itself (start time, tick count, bot count, config)?
- Does each sim run have a unique identifier, or are results just mixed into the same tables as everything else?

### Question 4: What's the Data Volume?

- How many simulation-related records exist currently? (Check table counts or estimate from recent 45-tick/50-bot runs)
- Are simulation records in the same tables as real player combat records?
- If mixed, is there a reliable way to distinguish them? (a flag, a specific characterId pattern for bots, etc.)

### Question 5: Backend Endpoints for Simulation Stats

Check `server/src/routes/admin/` for simulation-related endpoints:

- What endpoints serve the simulation stats page?
- Do they accept any filtering parameters (date range, run ID, etc.)?
- Do they aggregate on the fly or read pre-computed summaries?

---

## OUTPUT

Write ALL findings to: `D:\realm_of_crowns\audits\simulation-data-management.md`

Structure:

```markdown
# Simulation Data Management Audit

## Summary
[2-3 sentences: how sim data is stored, whether runs are distinguishable, what the current filtering capabilities are]

## Q1: Data Storage
[Models, fields, relationships, any existing grouping]

## Q2: Stats Page Component
[Component location, API calls, current filtering, displayed metrics]

## Q3: Simulation Run Process
[How runs are initiated, what records are created, metadata]

## Q4: Data Volume & Separation
[Record counts, whether sim and real data are mixed, how to distinguish]

## Q5: Backend Endpoints
[Endpoints, parameters, aggregation approach]

## Recommendations
[Proposed approach for run-based filtering with comparison capability — keep brief, 3-5 bullets max]
```

In chat, just say: "Audit complete. [1 sentence summary]. Results in `audits/simulation-data-management.md`."

## DO NOT

- Do not modify any code
- Do not create git commits
- Do not deploy anything
- Do not spend more than 2-3 sentences per answer in chat — put the detail in the file
