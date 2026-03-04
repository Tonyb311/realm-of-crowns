# Audit: Released vs Unreleased Content — Races, Classes, Towns, All Game Content

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

We need a single source of truth for what game content is **released** (available to players) vs **unreleased** (exists in code/data but not accessible). This affects testing — we should only balance-test released content. It also affects the Codex, character creation, and market.

Audit EVERY content category. For each, determine: does a `released`, `enabled`, `active`, `visible`, `available`, `locked`, `tier`, or similar flag exist? Is it in the database, seed data, shared types, or frontend config? Is it actually enforced (checked during character creation, shown/hidden in Codex, etc.)?

### Category 1: Races

Check:
- `shared/src/data/races/` — all 20 race definitions. Is there a `released`, `enabled`, `available`, `locked` field on `RaceDefinition`?
- `shared/src/types/race.ts` — the `RaceDefinition` interface. What fields control availability?
- `database/prisma/schema.prisma` — the `Race` enum. Are all 20 in the enum?
- Character creation flow — `server/src/routes/characters.ts` or wherever characters are created. Does it filter races? Can players pick ANY race or only a subset?
- Frontend character creation — does the UI show all 20 races or filter by tier/released status?
- The `tier` field ('core', 'common', 'exotic') exists — is it used to gate access?

Document: which races are available for character creation RIGHT NOW?

### Category 2: Classes

Check:
- `shared/src/data/skills/` or wherever class definitions live. Is there a `released`/`enabled` flag?
- `shared/src/types/` — the class type/enum. How many classes exist?
- Character creation — can players pick any class?
- The audit mentioned 7 classes (Warrior, Paladin, Rogue, Ranger, Mage, Cleric, Warlock). The balance audit also found "Psion" and "Bard" — are these additional classes beyond the 7? Are they released?
- List ALL classes that exist in code and which are player-selectable.

### Category 3: Towns & Cities

Check:
- `database/seeds/towns.ts` or equivalent — how many towns/cities are seeded?
- `database/prisma/schema.prisma` — Town model. Is there an `active`, `released`, `enabled`, `visible` field?
- Are all seeded towns accessible via travel routes, or are some isolated/disabled?
- The travel system — `server/src/lib/travel-tick.ts` or route definitions. Can players travel to all towns?
- Frontend town list — does the map/travel UI show all towns?

Document: which towns are in the game and accessible vs which exist in data but are locked/hidden.

### Category 4: Professions

Check:
- `shared/src/data/professions/` or equivalent. How many professions exist?
- Is there a `released`/`enabled` flag?
- Can players learn any profession, or are some locked?
- The economy audit mentioned 29 professions — are all 29 available?

### Category 5: Monsters

Check:
- `database/seeds/monsters.ts` — all 21 monsters. Is there an `active`/`enabled` flag?
- Are all monsters encounter-able via road travel, or are some restricted to specific biomes that aren't accessible?
- If some towns are unreleased, are monsters in those biomes also effectively unreleased?

### Category 6: Items & Recipes

Check:
- Are all 220+ ItemTemplates available? Or are some gated behind unreleased professions/towns?
- Are recipes for unreleased professions still craftable?
- Does the Codex show unreleased content?

### Category 7: Any Other Content

Check for any other gated content:
- Quests — are there released/unreleased quests?
- Buildings/Assets — are all building types available?
- Housing — any restrictions?
- Enchantments — all available?
- Governance/elections — enabled?

---

## OUTPUT

Write ALL findings to: `D:\realm_of_crowns\audits\released-content-audit.md`

Structure:

```markdown
# Released Content Audit

## Summary
[Quick overview: X of Y races released, X of Y classes, X of Y towns, etc.]
[Whether release flags exist in the data model or if it's all-or-nothing]

## Races
### Release Mechanism
[How availability is controlled — flag, tier gating, frontend filter, or none]
### Released (available for character creation)
[List with tier]
### Unreleased (exist in code but not player-accessible)
[List with tier, and WHY they're unreleased — flag, no UI, etc.]
### Evidence
[Which file/line/query confirms this]

## Classes
### Release Mechanism
[How availability is controlled]
### Released
[List]
### Unreleased
[List]
### Evidence

## Towns & Cities
### Release Mechanism
[How availability is controlled]
### Released (accessible via travel)
[List with region/biome]
### Unreleased (in data but not accessible)
[List]
### Evidence

## Professions
### Release Mechanism
### Released
### Unreleased
### Evidence

## Monsters
### Release Mechanism
### Encounter-able
### Not encounter-able (in unreleased biomes, disabled, etc.)
### Evidence

## Items & Recipes
### Gating mechanism
### Any unreleased items/recipes
### Evidence

## Other Content
[Quests, buildings, governance — anything with release gating]

## Release Flag Recommendations
[Does the game need a consistent `released` flag system? Currently inconsistent?
 Recommendation for how to standardize if needed.]
```

### Chat Summary

In chat, give me:
```
Released content audit complete:
- Races: [X] released of [Y] total — [mechanism]
- Classes: [X] released of [Y] total — [mechanism]
- Towns: [X] released of [Y] total — [mechanism]
- Professions: [X] released of [Y] total — [mechanism]
- [Any surprising findings]
Full audit: audits/released-content-audit.md
```

## DO NOT

- Do not modify any code
- Do not create git commits
- Do not deploy anything
- Do not guess — check the actual code, schema, seed files, and frontend components
- If there's no release flag and everything is available, say so clearly
