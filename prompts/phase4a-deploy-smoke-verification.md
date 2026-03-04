# Phase 4A Follow-Up — Deploy + Smoke Verification

```
cat CLAUDE.md
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

## Context

Phase 4A implementation is complete — swallow engine + 14 new monsters (L17–30) are built and all 3 builds (shared, server, client) compile clean. But deployment, DB verification, and smoke sims were NOT done. This prompt finishes the job.

## Task — 4 Steps, All Required

### Step 1 — Deploy to Azure

1. `git add -A && git commit -m "Phase 4A: swallow engine + 14 new monsters (L17-30)"`
2. `git push origin main`
3. Build with unique image tag: `docker build -t rocregistry.azurecr.io/realm-of-crowns:phase4a-$(date +%Y%m%d%H%M) .`
4. `docker push rocregistry.azurecr.io/realm-of-crowns:phase4a-$(date +%Y%m%d%H%M)`
5. Update Azure Container App with new image tag — do NOT use `:latest`
6. Record the commit hash, image tag, and revision number

### Step 2 — Seed Monsters in Production

1. Run the monster seed against production DB so all 14 new monsters are created
2. Verify with DB query: `SELECT name, level, biome, "damage_type" FROM monsters WHERE level >= 17 ORDER BY level`
3. Expect exactly 14 rows (Wyvern L17 through Storm Giant L30)
4. Also verify total monster count: `SELECT COUNT(*) FROM monsters` — expect 35
5. Spot-check Purple Worm: `SELECT name, abilities FROM monsters WHERE name = 'Purple Worm'` — confirm swallow ability exists in the JSON with swallowDamage, swallowEscapeThreshold fields

### Step 3 — Smoke Sims (4 Matchups × 10 Iterations)

Run these through the existing combat simulator. For each matchup, run 10 iterations and record win rate + key mechanic observations.

**Matchup 1: Warrior L20 vs Mind Flayer (L20)**
- Verify: psychic damage lands, stun fires, Extract Brain fires (priority 10 opener)
- Record: win rate, avg rounds, avg damage dealt by Mind Flayer

**Matchup 2: Warrior L25 vs Purple Worm (L25)**
- **CRITICAL**: Verify swallow ability fires in at least some fights
- Verify: digestive damage applied while swallowed, escape or freed-on-death triggers
- Record: win rate, how many fights swallow fired, how many escapes vs freed-on-death

**Matchup 3: Warrior L30 vs Storm Giant (L30)**
- Verify: legendary actions fire, phase transition triggers at 25% HP, storm aura deals damage
- Record: win rate, avg rounds, phase triggered count

**Matchup 4: Psion L22 vs Fey Dragon (L22)**
- Verify: psychic-vs-force matchup works, fey breath AoE fires
- Record: win rate, avg rounds

If the existing sim infrastructure doesn't support running these easily from CLI, write a quick script `scripts/phase4a-smoke-test.ts` that:
- Creates mock combatants at the right levels with appropriate stats
- Runs resolveTickCombat 10 times per matchup
- Dumps results to stdout

### Step 4 — Write Results File

Output everything to `docs/investigations/phase4a-deploy-results.md`:

```
PHASE 4A DEPLOYMENT & VERIFICATION
====================================

DEPLOYMENT:
  Commit: [hash]
  Image tag: [tag]
  Revision: [number]
  Health: OK/FAIL

DB VERIFICATION:
  Total monsters: [count] (expect 35)
  New monsters (L17+): [count] (expect 14)
  Purple Worm swallow ability: PRESENT/MISSING
  Monster list:
    [name] | L[level] | [biome] | [region]
    ...

SMOKE SIM RESULTS (10 iterations each):

  Warrior L20 vs Mind Flayer L20:
    Win rate: X%
    Avg rounds: X
    Extract Brain fired: X/10 fights
    Stun applied: X/10 fights

  Warrior L25 vs Purple Worm L25:
    Win rate: X%
    Avg rounds: X
    Swallow fired: X/10 fights
    Swallow escapes: X
    Freed on death: X
    Avg digestive damage per swallow: X

  Warrior L30 vs Storm Giant L30:
    Win rate: X%
    Avg rounds: X
    Phase triggered: X/10 fights
    Legendary actions used: X total
    Storm aura damage: X avg per fight

  Psion L22 vs Fey Dragon L22:
    Win rate: X%
    Avg rounds: X

ISSUES:
  [any problems found, or "None"]
```

## IMPORTANT

- If git shows nothing to commit (already committed), skip to push/deploy
- If monsters are already seeded, the upsert logic will update them — safe to re-run
- Do NOT modify any game code — this is deploy + verify only
- If swallow does NOT fire in any of the 10 Purple Worm fights, that's a bug — report it but do not attempt to fix in this prompt
- If any sim crashes, capture the error and report it — do not attempt to fix in this prompt
- All sim output goes to the results file, keep chat output brief
