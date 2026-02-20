# Prompt: Full 29-Profession Audit Against YAML Source of Truth

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- Keep analysis brief in chat. Write all detailed output to files.
- Minimize tool calls — batch reads where possible.

---

## YOUR TASK: Audit All 29 Professions Against the YAML Source of Truth

### Context

The game has 29 playable professions. The canonical definition of every profession, its recipes, required materials, outputs, and gathering sources lives in:

```
docs/profession-economy-master.yaml
```

A recent P0 fix seeded 28 recipes (TAILOR, COOK, BREWER) and 38 item templates, which unblocked those 3 professions. But the remaining 26 professions likely have the same problem — recipes and items defined in the YAML but never seeded into the database.

### Objective

Produce a comprehensive audit report that answers ONE question per profession:

**"Does every recipe and item defined in the YAML exist in the database seed files?"**

### Execution Plan

**Step 1 — Read the source of truth**
Read `docs/profession-economy-master.yaml` in full. Extract every profession, every recipe, and every item referenced (inputs AND outputs).

**Step 2 — Read the database seed files**
Identify and read ALL relevant seed files. These likely include:
- `server/prisma/seed.ts` or similar
- Any seed data JSON/TS files in `server/prisma/` or `server/src/data/`
- Item template definitions
- Recipe definitions
- Gathering source definitions

Batch your reads — don't read files one at a time.

**Step 3 — Cross-reference**
For each of the 29 professions, check:
1. Do ALL recipes from the YAML exist in the seed data?
2. Do ALL input items (materials/ingredients) exist as item templates?
3. Do ALL output items exist as item templates?
4. Do gathering sources exist for raw materials? (e.g., if WOODWORKER needs "oak_log", is there a gathering source that produces it?)
5. Are there any orphaned items in the DB that aren't referenced by any recipe?

**Step 4 — Write the audit report**
Write the full report to: `docs/profession-audit-report.md`

The report should contain:

```
# Profession Audit Report
Generated: [date]

## Summary
- Total professions: 29
- Fully functional (all recipes + items seeded): X
- Partially functional (some recipes missing): X  
- Non-functional (no recipes seeded): X
- Total missing item templates: X
- Total missing recipes: X
- Total missing gathering sources: X

## Priority Tiers
### P0 — Completely Broken (zero recipes seeded)
[list professions]

### P1 — Partially Broken (some recipes missing or input items missing)
[list professions]

### P2 — Functional but Incomplete (recipes work but gathering chains have gaps)
[list professions]

### P3 — Fully Functional
[list professions]

## Per-Profession Detail

### [PROFESSION_NAME]
- YAML recipes: [count]
- Seeded recipes: [count]  
- Missing recipes: [list]
- Missing input items: [list]
- Missing output items: [list]
- Missing gathering sources: [list]
- Status: P0/P1/P2/P3
- Notes: [any special issues]

[repeat for all 29]

## Recommended Fix Order
[ordered list based on dependency chains — fix upstream professions first so downstream ones can function]

## Supply Chain Dependency Map
[which professions depend on which others for materials — this determines fix order]
```

**Step 5 — Write implementation queue**
Based on the audit, write a second file: `docs/profession-fix-queue.md`

This should be an ordered list of profession fix prompts to execute, grouped by dependency tier:

```
# Profession Fix Queue

## Tier 1 — Raw Resource Providers (no dependencies on other professions)
1. [PROFESSION] — X missing recipes, Y missing items
2. ...

## Tier 2 — Primary Processors (depend on Tier 1 outputs)
1. [PROFESSION] — X missing recipes, Y missing items, depends on: [list]
2. ...

## Tier 3 — Secondary Crafters (depend on Tier 2 outputs)
...

## Tier 4 — Advanced/Luxury Crafters (depend on multiple tiers)
...
```

### What NOT To Do

- Do NOT fix anything in this task. This is audit only.
- Do NOT modify any seed files, schema, or game code.
- Do NOT run the game or attempt database operations.
- Keep chat responses brief — all detail goes in the report files.

### Deliverables

1. `docs/profession-audit-report.md` — Full audit with per-profession detail
2. `docs/profession-fix-queue.md` — Ordered implementation queue

### Final Steps

After writing both files:

```bash
git add docs/profession-audit-report.md docs/profession-fix-queue.md
git commit -m "audit: full 29-profession audit against YAML source of truth"
git push
```

No deployment needed — this is documentation only.
