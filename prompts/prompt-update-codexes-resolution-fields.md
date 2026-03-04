# Prompt: Update Both Codexes to Display New Ability Resolution Fields

```
cat CLAUDE.md
cat .claude/agents/frontend-developer.md
cat .claude/agents/backend-developer.md
cat docs/audit-ability-attack-mechanics.md
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

## Task: Update Both Codexes With New Ability Resolution Fields

We recently overhauled the ability system. Every ability now has `attackType` (weapon/spell/save/auto), many have `damageType` (FIRE, COLD, PSYCHIC, RADIANT, etc.), and save-based abilities have `saveType` (wis/dex/con/str/int). We also added tier 0 abilities, setup→payoff chaining tags, and updated descriptions. Neither the player-facing codex nor the admin codex displays any of this new information.

### Important Context

There's also an outstanding prompt to add tier 0 abilities to both codexes (`prompts/prompt-update-codex-tier0-abilities.md`). That prompt was written earlier but may not have been run yet. **Check whether tier 0 abilities are already showing in the codexes.** If they're not, incorporate that work into this prompt — add the tier 0 section AND the new resolution fields in one pass.

### Step 1: Update the Backend API

**Check both API endpoints that serve ability data to the codexes:**

1. `GET /api/codex/classes` (player-facing) — in `server/src/routes/codex.ts`
2. `GET /admin/combat/codex/classes` (admin) — check `server/src/routes/admin/` for the admin codex endpoint

Both endpoints need to include the new fields in their response. Currently they likely only return: `id`, `name`, `description`, `specialization`, `tier`, `levelRequired`, `cooldown`, `effects`.

**Add to both responses:**
- `attackType` — 'weapon' | 'spell' | 'save' | 'auto'
- `damageType` — the CombatDamageType if specified (FIRE, COLD, etc.)
- `saveType` — the save stat if applicable (wis, dex, con, etc.)
- `attackStat` — if spell attack, which stat is used (int, wis, cha, etc.). Can be derived from `CLASS_PRIMARY_STAT` map if not on the ability itself.
- `grantsSetupTag` / `requiresSetupTag` — if the ability is part of a chain (admin only)

**For tier 0 abilities (if not already in API):**
- Include tier 0 abilities in the response, grouped by choice level (3, 5, 8), with 3 options per level
- See `prompts/prompt-update-codex-tier0-abilities.md` for the full tier 0 API response structure

### Step 2: Update Player-Facing Codex (`client/src/components/codex/CodexClasses.tsx`)

The player codex should present the new info in a player-friendly way. Players don't need raw field names — they need intuitive labels.

**For each ability in the ability table, add:**

- **Attack Type indicator** — a small badge or icon next to the ability name:
  - Weapon: crossed swords icon or "Melee" / "Ranged" badge
  - Spell: sparkle/wand icon or "Spell" badge
  - Save: shield icon or "Save" badge (with the save type: "WIS Save", "DEX Save")
  - Auto: no badge needed (self-buffs don't need an attack type label)

- **Damage Type** — if the ability deals typed damage, show it as a colored badge:
  - FIRE = orange/red badge
  - COLD = light blue badge
  - LIGHTNING = yellow badge
  - RADIANT = white/gold badge
  - NECROTIC = purple/dark badge
  - PSYCHIC = pink/violet badge
  - THUNDER = blue badge
  - SLASHING/PIERCING/BLUDGEONING = grey badge (physical)
  - No damage type = no badge

- **Save info** — for save-based abilities, show "Target: WIS Save" or similar in the ability description area. Don't show the DC formula to players (that's admin info).

**Do NOT show to players:**
- Raw `attackType` field name
- Save DC formula (8 + prof + stat mod)
- `grantsSetupTag` / `requiresSetupTag` (internal mechanic)
- Raw effect objects

**If tier 0 section doesn't exist yet:** Add it per the structure in `prompts/prompt-update-codex-tier0-abilities.md` — "Early Abilities (Levels 3, 5, 8)" section above specializations, with choice cards showing 3 options per level.

### Step 3: Update Admin Codex (`client/src/components/admin/combat/CodexTab.tsx`)

The admin codex should show EVERYTHING — full mechanical details for dev/QA use.

**For each ability, display:**

- **Attack Type** — explicit badge: `WEAPON`, `SPELL`, `SAVE`, `AUTO`
- **Attack Stat** — for spell attacks: "INT + Prof vs AC", for weapon: "STR/DEX + Prof vs AC"
- **Save Info** — for save-based abilities: "DC: 8 + Prof + [STAT] mod | Target: [SAVE_TYPE] Save"
- **Damage Type** — explicit: "FIRE", "PSYCHIC", "RADIANT", etc.
- **Chain Tags** — if `grantsSetupTag`: show "Grants: [tag]". If `requiresSetupTag`: show "Requires: [tag]". This helps admins understand ability chains.
- **Full Effects Object** — the raw effects JSON (already shown via `AbilityCard` component, but make sure the new fields are included)

**If tier 0 section doesn't exist yet:** Add it with full mechanical details, using the `AbilityCard` component. Show `choiceGroup`, `requiresChoice`, and all effect fields.

### Step 4: Update Type Definitions

The frontend `AbilityDefinition` interface in the codex components may not include the new fields. Update:
- `CodexClasses.tsx` — the `AbilityDefinition` interface at the top
- `CodexTab.tsx` — the `ClassAbility` interface

Add: `attackType`, `damageType`, `saveType`, `attackStat`, `grantsSetupTag`, `requiresSetupTag`

### Step 5: Visual Design

- Use the existing Realm design system (`RealmBadge`, `RealmCard`, realm color tokens)
- Damage type badges should use color coding that's intuitive (fire = warm, cold = cool, etc.)
- Attack type badges should be subtle — they're informational, not the primary content
- The admin codex can be more dense/technical than the player codex
- Tier 0 section needs a distinct visual treatment (choice cards, "pick 1 of 3" labeling)
- Add tier 0 to the `TIER_VARIANT` mapping — tier 0 should use a less prestigious variant than tier 1

### Step 6: Verify

- Start dev server or deploy and verify both codexes render correctly
- Check all 7 classes show correct attack types, damage types, save info
- Check tier 0 abilities appear (if they were missing before)
- Check that ability counts are correct (27 per class: 9 tier 0 + 18 spec)
- Search should work for new fields (searching "fire" should find fire damage abilities)

### What NOT to Change

- Don't touch other codex tabs (races, items, monsters, status effects, professions)
- Don't change how spec abilities are mechanically resolved — display only
- Don't add ability unlock/choice functionality — codex is read-only

### Deployment

```
git add -A
git commit -m "feat: update player and admin codex with attack types, damage types, saves, and tier 0 abilities"
git push
```

Build and deploy to Azure with unique image tag. Never use `:latest`.
