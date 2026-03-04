# Prompt: Restructure Class Abilities — Minor Unlocks at Levels 3, 5, 8

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

## Task: Restructure Early-Level Class Abilities

Read the audit file (`docs/audit-class-ability-levels.md`) carefully before doing anything. It contains the current state of all class abilities, unlock levels, the specialization structure, and how the codebase gates ability access.

### Context You Must Understand

The audit reveals the following critical facts about the current system:

1. **Each class has 3 specializations, each with 6 abilities.** Players pick ONE specialization, so a given character only ever has access to 6 abilities across 40 levels.
2. **The current unlock schedule is: 1 → 5 → 10 → 18 → 28 → 40** (Psion: 1 → 5 → 12 → 18 → 28 → 40). This creates massive dead zones — 34 of 40 levels grant nothing.
3. **The existing level 1 abilities are NOT minor.** They are core combat abilities: Fireball (AoE), Backstab (+10 crit, +5 damage), Smite (+6 radiant), Life Drain (heal 50%), etc. These must NOT be treated as "minor" abilities.
4. **Abilities require skill point spending to unlock** — they are NOT auto-granted on level-up. Players visit the skill tree, spend points, and manually unlock.
5. **The minor abilities we're adding at 3, 5, and 8 are NEW abilities** that sit below the existing tier 1 abilities in power. Think of them as "tier 0" — previews of the specialization's identity, not core rotation tools.

### The Problem

Levels 1-9 originally had zero abilities — just basic attacks. We opened them up, but the current setup front-loads core abilities at level 1 which is too much too fast, and levels 2-9 still feel barren. We want a deliberate early-game progression that gives players a taste of their specialization without handing them full-power abilities.

### The New Design

For ALL 7 released classes, across ALL 21 specializations, implement the following:

**Existing abilities shift up slightly:**
- Current level 1 abilities (tier 1 core abilities) → move to **level 10**
- Current level 5 abilities (tier 2) → move to **level 14**
- Current level 10 abilities (tier 3) → move to **level 20** (Psion tier 3 was already at 12 → move to 20)
- Current level 18 abilities → move to **level 25**
- Current level 28 abilities → move to **level 32**
- Current level 40 abilities → stay at **level 40** (capstone unchanged)

This spreads the existing 6 abilities more evenly across levels 10-40 and eliminates the worst dead zones in mid-to-late game.

**New minor abilities fill the early game:**
Each of the 21 specializations gets exactly 3 new minor abilities:

**Level 3 — "First Taste" ability:**
- Very low power, very simple mechanically
- Should communicate the *identity* of the specialization without giving real power
- A Berserker might get a minor self-buff that hints at rage mechanics. A Healer might get a tiny heal. An Assassin might get a small stealth-related bonus.
- Damage: roughly 40-50% of what the existing tier 1 ability does
- Short cooldown (1-2 rounds), low or zero resource cost
- These should feel like "training wheels" — you're learning what your spec does

**Level 5 — "Building Up" ability:**
- Slightly more impactful than level 3
- Should complement the level 3 ability so the player has a basic 2-ability mini-rotation
- Damage: roughly 50-60% of the existing tier 1 ability
- Can introduce one simple mechanic (a short buff, a minor debuff, a small conditional bonus)
- Still clearly weaker than any existing ability

**Level 8 — "Coming Online" ability:**
- The strongest of the three minor abilities, but still clearly below the tier 1 core ability at level 10
- Should make the player feel like their specialization is taking shape
- Damage: roughly 60-75% of the existing tier 1 ability
- Can be slightly more complex — a combo with the level 3 or 5 ability, a moderate cooldown ability, a meaningful but small utility
- When a player hits level 10 and gets the real tier 1 ability, it should feel like a clear power jump

### Auto-Grant vs Skill Points

The 3 minor abilities at levels 3, 5, and 8 should be **auto-granted when the player reaches that level** — no skill point cost. Rationale:
- These are minor preview abilities, not meaningful build choices
- New players shouldn't face a "spend points or not" decision on weak abilities
- It creates a smooth onboarding: auto-granted minor abilities teach you the spec → then at level 10+ you start making real choices with skill points
- The existing skill-point-gated abilities at level 10+ remain unchanged in their unlock mechanic

**Implementation:** When a character levels up to 3, 5, or 8, automatically create the `CharacterAbility` row for their specialization's corresponding minor ability. This means the level-up logic (wherever XP thresholds are checked and level incremented) needs a hook that checks: "did we just hit 3, 5, or 8? If so, grant the minor ability for this character's spec."

If the character hasn't chosen a specialization yet by level 3, the ability should be granted retroactively when they do pick one. Check for this in the specialization selection flow.

### Design Constraints For New Minor Abilities

All 63 new abilities (3 per specialization × 21 specializations) must follow these rules:

- **Damage values:** Scale relative to the existing tier 1 ability for that spec (see percentages above)
- **Cooldowns:** 0-3 rounds. These are simple abilities, not strategic cooldown management
- **Resource costs:** Zero or trivially low. Early players don't have resource pools to manage yet.
- **Naming:** Grounded, class-appropriate, not flashy. Use prefixes like "Lesser," "Apprentice," "Novice" sparingly — prefer names that feel natural. A baby Berserker ability called "Wild Swing" is better than "Lesser Reckless Strike."
- **Descriptions:** Fit the game's tone — gritty fantasy, morally grey, D&D-meets-Game of Thrones
- **Types:** Mostly active abilities. One passive per specialization at most (at level 5 or 8, not level 3 — the first ability should be a button to press)
- **Each ability must have:** name, description, mechanical effect, unlock level, cooldown, resource cost, damage/healing values, type (active/passive), and a `tier: 0` marker to distinguish from existing abilities

### Specialization Identity Guide

When designing the 3 minor abilities for each spec, the abilities should hint at what the spec becomes. Quick reference:

- **Berserker** → rage, recklessness, damage-at-a-cost
- **Guardian** → shields, protection, taking hits
- **Warlord** → commands, buffing, tactical leadership
- **Elementalist** → elemental damage, AoE
- **Necromancer** → life drain, death magic, dark energy
- **Enchanter** → debuffs, control, precision
- **Assassin** → crits, stealth, burst damage
- **Thief** → theft, evasion, trickery
- **Swashbuckler** → speed, dual attacks, counters
- **Healer** → direct healing, cleansing
- **Paladin** → holy damage, self-sustain, armor
- **Inquisitor** → debuffs, punishment, anti-magic
- **Beastmaster** → companion, nature bond
- **Sharpshooter** → precision, ranged damage
- **Tracker** → traps, marks, hunting
- **Diplomat** → charm, debuffs, social manipulation
- **Battlechanter** → war songs, sonic damage, buffs
- **Lorekeeper** → analysis, knowledge, exploit weakness
- **Telepath** → psychic damage, mind debuffs
- **Seer** → foresight, defense, prediction
- **Nomad** → teleportation, mobility, spatial tricks

### What To Change — Step by Step

1. **Add the 63 new minor abilities** to `shared/src/data/skills/{class}.ts` — one per specialization at levels 3, 5, and 8. Mark them as `tier: 0` (or whatever the lowest tier value is in the type system — check `types.ts`). Set `autoGrant: true` (or add this field if it doesn't exist on `AbilityDefinition`).

2. **Shift existing ability `levelRequired` values** according to the new schedule:
   - Tier 1 (was level 1) → level 10
   - Tier 2 (was level 5) → level 14
   - Tier 3 (was level 10, or 12 for Psion) → level 20
   - Tier 4 (was level 18) → level 25
   - Tier 5 (was level 28) → level 32
   - Tier 6 (was level 40) → level 40 (unchanged)

3. **Update the `AbilityDefinition` type** in `shared/src/data/skills/types.ts` to include `autoGrant: boolean` if it doesn't exist.

4. **Update the level-up logic** to auto-grant tier 0 abilities when a character reaches level 3, 5, or 8. Find where level-ups are processed (likely in a service that handles XP gain / level thresholds) and add a hook that:
   - Checks if the new level is 3, 5, or 8
   - Looks up the character's specialization
   - Finds the tier 0 ability for that spec at that level
   - Creates the `CharacterAbility` row automatically (no skill point cost)
   - If the character has no specialization yet, skip — handle it in step 5

5. **Update specialization selection** to retroactively grant any tier 0 abilities the character's level already qualifies for. If a player picks their spec at level 6, they should immediately receive the level 3 and level 5 minor abilities.

6. **Update the skill tree API** (`GET /api/skills/tree`) so tier 0 abilities display correctly — they should show as auto-granted, not as "spend a point to unlock." The frontend skill tree UI should reflect this (greyed out "granted" state vs clickable "unlock" state).

7. **Rebuild shared:** `npx tsc --build shared/tsconfig.json`

8. **Re-seed the database** to sync the new abilities and updated `levelRequired` values.

9. **Handle existing characters:** Since existing seeded test players may have abilities unlocked at the old level thresholds, the seed refresh will handle this. But note: any real characters (if any exist pre-launch) would need a migration to revoke abilities they no longer qualify for and grant tier 0 abilities they've earned. For now, since we're pre-launch with seeded test data, a full re-seed is sufficient.

10. **Run the full combat test suite.** All 65 scenarios must still pass. The test suite likely creates characters at specific levels and expects certain abilities — these tests WILL break because the level thresholds changed. Fix them:
    - Tests that create level 1 characters with tier 1 abilities → now need level 10 characters, OR update tests to use tier 0 abilities at the appropriate levels
    - Tests that assume specific ability availability at specific levels → update level thresholds
    - Do NOT just delete or skip failing tests. Fix them to match the new level schedule.

11. **Update `buildAbilityQueue()` in the combat simulator** if it hardcodes any level assumptions. It filters by `levelRequired <= level` so it should work automatically, but verify.

### Output

1. Write `docs/class-ability-restructure-summary.md` containing:
   - The new complete unlock schedule (levels 3, 5, 8, 10, 14, 20, 25, 32, 40)
   - For each of the 21 specializations: the 3 new minor abilities (name, level, description, mechanics)
   - A before/after comparison of the level thresholds for existing abilities
   - Notes on any implementation decisions or edge cases encountered

2. All code changes committed, tested, and verified with passing test suite

### Deployment

After all changes are complete and tests pass:

```
git add -A
git commit -m "feat: add tier-0 minor abilities at 3/5/8, restructure existing ability levels"
git push
```

Build and deploy to Azure with a unique image tag (timestamp or commit hash). Never use `:latest`.

Run any required DB migrations or seed updates against the deployed environment.
