# Prompt: Fix Ability Descriptions and Effect Types That Contradict Their attackType/damageType

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/backend-developer.md
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

## Task: Audit and Fix All Ability Descriptions and Effect Type Labels to Match Their Actual Mechanics

### The Problem

Psychic Jab (Psion tier 0) shows as "melee damage" in the codex despite being `attackType: 'spell'` with `damageType: 'PSYCHIC'`. The `effectType` or display label and/or description text still says "melee" from when it was originally created. This contradicts what the ability actually does in the engine.

This is likely widespread — when we retagged all 180 abilities with correct `attackType` and `damageType`, we only changed the mechanical fields, not the human-readable text. Abilities across all 7 classes probably have descriptions and effectType labels that reference the wrong attack style.

### Step 1: Audit Every Ability Across All 7 Classes

Scan all ability data files:
```
shared/src/data/skills/warrior.ts
shared/src/data/skills/mage.ts
shared/src/data/skills/rogue.ts
shared/src/data/skills/cleric.ts
shared/src/data/skills/ranger.ts
shared/src/data/skills/bard.ts
shared/src/data/skills/psion.ts
```

For each ability, check for contradictions between:

1. **`effectType` field** (the handler label, e.g., "damage", "damage_status", "buff") — this is what the codex likely displays as the "type". Check if the codex displays this raw, and if so, whether it accurately describes the ability.

2. **`description` field** — the player-facing text. Look for words that contradict the actual mechanics:
   - "melee" on a `spell` attackType ability
   - "strike" or "slash" on a `spell` attackType ability (psychic/fire/radiant attacks aren't strikes)
   - "physical" on a magical ability
   - Missing damage type reference (a fire spell should mention fire somewhere in the description)
   - "attack" on a `save` based ability (save abilities don't roll attacks — they force saves)
   - Missing save reference on `save` based abilities (should mention the target resisting or saving)

3. **`effects.description` field** (if it exists) — an internal description of the effects. May also have stale text.

### Step 2: Fix Descriptions

For every ability with a contradiction:

**Update the `description`** to accurately reflect the ability's actual mechanics and flavor:
- Spell attacks should feel magical: "Lash out with psychic energy" not "Strike the enemy with your mind"
- Save-based abilities should hint at resistance: "Engulf the area in flames. Nimble targets may avoid the worst of it." (implies DEX save without stating the mechanic)
- Damage types should be referenced: a FIRE ability should mention fire, flame, or burning. A PSYCHIC ability should mention psychic, mental, or psionic.
- Keep descriptions flavorful and in-world — don't make them read like stat blocks

**Update `effectType` display** if the codex is showing it raw. Check what the codex actually renders as the "type" label. If it's showing `effectType` directly (e.g., "damage", "damage_status"), determine whether:
- The codex should show `effectType` as-is (it's a technical label, fine for admin)
- The codex should derive a display label from `attackType` + `damageType` (e.g., "Spell — Psychic" instead of "damage")
- The player codex should show something different from the admin codex

If the "melee damage" label the user is seeing comes from the codex constructing a display string from `effectType`, fix the codex display logic rather than changing `effectType` (which is a handler key the engine uses — changing it would break resolution).

### Step 3: Fix the Codex Display Label

Check both codexes to see how they construct the "type" display for abilities:

**In `CodexClasses.tsx` (player codex):**
- What does the "type" column or label show? Is it `effectType` raw? Is it derived?
- If it's showing `effectType` raw: replace with a derived display that combines `attackType` + `damageType`. Examples:
  - `attackType: 'weapon'`, no damageType → "Melee Attack" or "Ranged Attack"
  - `attackType: 'spell'`, `damageType: 'PSYCHIC'` → "Psychic Spell"
  - `attackType: 'spell'`, `damageType: 'FIRE'` → "Fire Spell"
  - `attackType: 'save'`, `damageType: 'FIRE'` → "Fire (DEX Save)"
  - `attackType: 'auto'`, no damageType → "Self" or "Utility"
  - `attackType: 'auto'`, is heal → "Heal"
  - `attackType: 'auto'`, is buff → "Buff"

**In `CodexTab.tsx` / `AbilityCard.tsx` (admin codex):**
- Same check. Admin can show more technical info but should still not show contradictory labels.

### Step 4: Verify

- Check the player codex for Psion — Psychic Jab should no longer say "melee damage"
- Spot-check 5 abilities from different classes:
  - Mage Fireball: should show "Fire (DEX Save)" or similar, not "damage"
  - Bard Vicious Mockery: should show "Thunder (WIS Save)" or similar
  - Warrior Power Strike: should show "Melee Attack" — this one IS correct as weapon
  - Cleric Holy Fire: should show "Radiant Spell" or similar
  - Rogue Backstab: should show "Melee Attack" — correct as weapon
- Check the admin codex for the same abilities — should show full technical detail

### What to Report

In chat, list:
- How many ability descriptions were updated
- How many had contradictions (said "melee" but were spell, etc.)
- How the codex type label was fixed (what it showed before vs after)
- Any abilities where the description was fine and didn't need changes

### Deployment

```
git add -A
git commit -m "fix: update ability descriptions and codex type labels to match actual attack/damage mechanics"
git push
```

Build and deploy to Azure with unique image tag. Never use `:latest`. Re-seed.
