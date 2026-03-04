# Phase 5 — Full Mechanical Verification Sim

```
cat CLAUDE.md
cat .claude/agents/combat.md 2>/dev/null || echo "No combat agent file"
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

### Goal

Run a comprehensive mechanical verification simulation to confirm that **every monster ability** and **every class ability** actually fires and resolves without errors. This is NOT a balance pass — we don't care about win rates. We care about:

1. Does every ability actually activate in combat?
2. Do any abilities produce runtime errors?
3. Are there any 0-damage bugs (like the storm aura issue from 4A)?
4. Do all engine features work (legendary actions, legendary resistances, phase transitions, death throes, swallow, damage auras, fear auras)?

### Current State

- **51 monsters** across L1–50, all 14 biomes
- **7 classes**: Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion
- **7 released races**: Human, Elf, Dwarf, Harthfolk, Orc, Nethkin, Drakonid
- All class abilities wired into combat engine (Phase 3 work — 65/65 tests passing)
- Swallow engine built and verified (Phase 4A)
- Batch sim infrastructure exists and works

### Infrastructure Available

**Batch Combat Sim CLI:** `server/src/scripts/batch-combat-sim.ts`
- Creates synthetic players via `buildSyntheticPlayer({ race, class, level })`
- Builds class ability queues via `buildAbilityQueue(className, level)`
- Uses `resolveTickCombat()` — the real combat engine with full AI
- Persists results to `CombatEncounterLog` tagged with `SimulationRun`
- CLI: `npm run sim:run -- --race human --class warrior --level 5 --monster Goblin --iterations 50`
- Grid mode: `npm run sim:run -- --config=some-config.json`

**Combat Simulator:** `server/src/services/combat-simulator.ts`
- `buildSyntheticPlayer()` — race/class/level → full combatant with stats, equipment, ability queue
- `buildDefaultPresets()` — generates combat presets with role-aware ability queue
- `buildAbilityQueue()` — classifies abilities (damage/buff/heal/cc/utility), builds priority queue
- `buildPlayerCombatParams()` — wraps player with presets + racial tracker for resolveTickCombat
- `buildSyntheticMonster()` — DB monster → combatant with all combat data

**Key Files:**
- `server/src/scripts/batch-combat-sim.ts` — CLI entry point
- `server/src/services/combat-simulator.ts` — Synthetic combatant builders
- `server/src/services/tick-combat-resolver.ts` — Real combat loop (resolveTickCombat)
- `server/src/lib/combat-engine.ts` — Core engine (resolveTurn, createCombatState)
- `server/src/lib/monster-ability-resolver.ts` — Monster ability handlers
- `server/src/services/class-ability-resolver.ts` — Class ability handlers
- `shared/src/data/skills/index.ts` — ABILITIES_BY_CLASS, VALID_CLASSES
- `shared/src/types/combat.ts` — All combat types
- `server/src/lib/combat-logger.ts` — Encounter log builder

### What the Batch Sim Already Does Well

- Builds realistic synthetic players with proper stats, gear, and ability queues
- Uses the real combat engine (not a simplified version)
- Persists every fight to DB for analysis
- Tracks per-class and per-monster win rates
- Creates and cleans up test users/characters

### What's Missing for Mechanical Verification

The batch sim runs fights and tracks win rates, but it does NOT:
1. Track which specific abilities fired during combat
2. Track which monster ability types activated (damage, status, aoe, multiattack, buff, heal, on_hit, fear_aura, damage_aura, death_throes, swallow)
3. Track which engine features triggered (legendary actions, legendary resistances, phase transitions)
4. Flag abilities that NEVER fired across all iterations
5. Flag 0-damage results from abilities that should deal damage
6. Provide a per-monster and per-class ability coverage report

---

## Task

### PART 1 — Build Verification Sim Script

Create a new script: `server/src/scripts/verify-combat-mechanics.ts`

This script runs targeted matchups designed to maximize ability coverage, then produces a detailed report on what fired and what didn't.

#### Design Principles

1. **Don't modify the batch-combat-sim.ts** — build a new script that imports from combat-simulator.ts
2. **Run fights in-memory only** — no DB writes, no test user creation. This is a verification script, not a sim run.
3. **Instrument the combat engine output** — parse the `state.log` entries from each fight to extract ability activations
4. **Keep it fast** — target <60 seconds total runtime

#### Matchup Strategy

For each of the 51 monsters, run fights against an appropriately-leveled player of EACH class. This ensures every monster faces every class, maximizing the chance that all abilities fire.

- For each monster: pick the class at the monster's level (or closest level)
- 7 classes × 51 monsters = 357 matchups
- 10 iterations per matchup = 3,570 total fights
- Use Human race for all (simplest, no racial complications)

```
For each monster in DB:
  For each class in [warrior, mage, rogue, cleric, ranger, bard, psion]:
    player = buildSyntheticPlayer({ race: 'human', class, level: monster.level })
    Run 10 fights
    Parse logs for:
      - Player class abilities that fired (by ability name)
      - Monster abilities that fired (by ability name + type)
      - Engine features that triggered (LA, LR, phase, death throes, swallow)
      - Any errors or exceptions
      - Any 0-damage results from damage-dealing abilities
```

#### Log Parsing — What to Extract

From `CombatState.log` (array of `TurnLogEntry`), extract:

**Player ability activations:**
- Look for `turnResult.abilityUsed` or similar field in TurnLogEntry
- Track: ability name, whether it dealt damage, damage amount
- Cross-reference with ABILITIES_BY_CLASS to identify which abilities NEVER fired

**Monster ability activations:**
- Look for `turnResult.monsterAbilityResult` in TurnLogEntry
- Track: ability id, ability name, ability type, damage dealt, status applied
- Cross-reference with monster's abilities array to identify which NEVER fired

**Engine feature activations:**
- Legendary Actions: look for `turnResult.legendaryActionResult` or entries with `isLegendaryAction`
- Legendary Resistances: look for any LR consumption log entries
- Phase Transitions: look for `turnResult.phaseTransitionResult`
- Death Throes: look for `turnResult.deathThroesResult`
- Swallow: look for `turnResult.swallowResults`
- Damage Aura: look for `turnResult.damageAuraResult`
- Fear Aura: look for `turnResult.fearAuraResult`

**IMPORTANT:** Before writing code, READ the actual TurnLogEntry type definition in `shared/src/types/combat.ts` to understand the exact field names. Also read `tick-combat-resolver.ts` to see how results are logged. The field names above are guesses — use the real ones.

#### Output Format

Write results to `docs/investigations/phase5-mechanical-verification.md`:

```markdown
# Phase 5 — Mechanical Verification Report

## Summary
- Total fights: 3,570
- Total errors: X
- Monster abilities verified: X/Y (Z%)
- Class abilities verified: X/Y (Z%)
- Engine features verified: X/Y

## Engine Feature Coverage
| Feature | Triggered? | Monster/Count |
|---------|-----------|---------------|
| Legendary Actions | YES/NO | [which monsters] |
| Legendary Resistances | YES/NO | [which monsters] |
| Phase Transitions | YES/NO | [which monsters] |
| Death Throes | YES/NO | [which monsters] |
| Swallow | YES/NO | [which monsters] |
| Damage Aura | YES/NO | [which monsters] |
| Fear Aura | YES/NO | [which monsters] |
| Multiattack | YES/NO | [which monsters] |
| Heal/Regen | YES/NO | [which monsters] |
| On-Hit Effects | YES/NO | [which monsters] |
| Status Effects | YES/NO | [which monsters] |
| AoE Attacks | YES/NO | [which monsters] |

## Monster Ability Coverage

### FULLY VERIFIED (all abilities fired at least once)
[list monsters]

### PARTIAL COVERAGE (some abilities never fired)
| Monster | Ability | Type | Never Fired In X Fights |
|---------|---------|------|-------------------------|
| ...     | ...     | ...  | ...                     |

### ABILITIES THAT NEVER FIRED
[list with investigation notes — why might they not fire? Cooldown too long? Priority too low? Conditional?]

## Class Ability Coverage

### By Class
| Class | Total Abilities (at any level) | Abilities Fired | Coverage |
|-------|-------------------------------|-----------------|----------|
| Warrior | X | Y | Z% |
| Mage | X | Y | Z% |
| ...  | ... | ... | ... |

### Abilities That Never Fired
| Class | Ability | Level Required | Possible Reason |
|-------|---------|---------------|-----------------|
| ...   | ...     | ...           | cooldown/priority/conditional |

## Damage Verification
| Monster | Ability | Expected Damage Type | Actual Damage | Status |
|---------|---------|---------------------|---------------|--------|
| [any with 0 damage] | ... | ... | 0 | BUG |

## Errors
[any runtime exceptions, with stack traces if available]
```

### PART 2 — Run the Verification

1. Build the script: `npx tsc --noEmit` to verify it compiles
2. Run it: `npx ts-node server/src/scripts/verify-combat-mechanics.ts`
3. Review the output report
4. If there are bugs found (0-damage, abilities never firing due to engine issues, errors):
   - Investigate root cause
   - Fix engine bugs (NOT balance issues — if an ability fires but deals too much/little damage, that's balance, not a bug)
   - Re-run verification to confirm fix
5. Write final report to `docs/investigations/phase5-mechanical-verification.md`

### PART 3 — Deploy Fixes (if any)

If engine bugs were found and fixed:
1. `git add -A && git commit -m "Phase 5: mechanical verification + [bug fixes]"`
2. `git push origin main`
3. Build + deploy with unique image tag
4. Health check

If no bugs found:
1. Just commit the verification script and report
2. `git add -A && git commit -m "Phase 5: mechanical verification — all clear"`
3. `git push origin main`

---

## IMPORTANT RULES

1. **Do NOT create DB records** — run everything in-memory. No test users, no SimulationRun, no CombatEncounterLog rows.
2. **Do NOT modify the combat engine** unless you find an actual bug. Balance issues are NOT bugs.
3. **Do NOT modify monster stats or abilities** — the goal is to verify what we have works, not tune it.
4. **Do NOT modify batch-combat-sim.ts** — build a new standalone script.
5. **READ the actual type definitions** before writing log parsing code. Don't guess field names.
6. **Keep output files only** — all results go to `docs/investigations/phase5-mechanical-verification.md`
7. **Fix bugs surgically** — if damage_aura is broken, fix the handler, don't refactor the whole ability system.
8. **Run `npx prisma generate` in both shared/ and server/** before building the script, just in case.
9. **This is verification, not balance** — a monster that wins 95% of fights is fine as long as its abilities all fire correctly. A monster whose damage_aura deals 0 damage is a bug.
10. **Class abilities** — if an ability never fires, determine WHY. Is it because buildAbilityQueue assigns it low priority? Is it because the ability type isn't handled in class-ability-resolver? Is it because the fight ends too quickly? The reason matters.
