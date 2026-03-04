# Prompt B: Add Tier 0 Class Ability Choices at Levels 3, 5, 8

```
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
cat docs/audit-class-ability-levels.md
cat docs/skill-point-removal-summary.md
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

## Task: Add Tier 0 Class Ability Choices at Levels 3, 5, and 8

Read both doc files before starting. The skill point system has already been removed and spec abilities now auto-grant on level-up. This prompt adds the pre-specialization ability choice system.

### The Design

Before players choose their specialization at level 10, they get minor ability choices that let them start shaping their character's identity early. These are CLASS-level choices, not specialization-level — every Warrior sees the same 3 options at level 3 regardless of what spec they'll eventually pick.

**At levels 3, 5, and 8:** The player is presented with 3 ability options for their class. They pick 1. The other 2 are locked out permanently for that character. This means:
- Two Warriors who make different choices at levels 3, 5, and 8 can have completely different early toolkits
- There are 27 possible combinations per class (3 × 3 × 3), giving real early-game variety
- These abilities persist after specialization — they don't go away at level 10

**Total new abilities:** 3 options × 3 levels × 7 classes = **63 new abilities**

### How The Choice Should Work

**When a character hits level 3, 5, or 8:**
1. The game flags that a tier 0 ability choice is pending
2. The player is shown 3 ability options for their class at that tier
3. The player picks one — a `CharacterAbility` row is created for the chosen ability
4. The other 2 options are NOT available again. The choice is permanent.
5. Until the player makes their choice, the pending state persists (they aren't forced to choose immediately, but they should be prompted)

**Backend implementation:**
- New API endpoint: `POST /api/abilities/choose-tier0` — accepts `{ abilityId }`, validates:
  - The ability exists and is tier 0
  - The ability matches the character's class
  - The ability's `levelRequired` matches a level the character has reached
  - The character hasn't already made a choice for that tier 0 level
  - Creates the `CharacterAbility` row
- New API endpoint: `GET /api/abilities/tier0-pending` — returns any pending tier 0 choices for the character (levels where they qualify but haven't chosen yet), along with the 3 options for each pending level
- The level-up auto-grant logic (from Prompt A) should NOT auto-grant tier 0 abilities — those require player choice. Ensure the auto-grant hook skips abilities marked as tier 0 / choice-required.

**Frontend implementation:**
- When a player hits level 3, 5, or 8 (or logs in with a pending choice), show a choice modal/screen
- Display the 3 options with: name, description, and a brief mechanical summary
- Player clicks one to confirm (add a confirmation step — "Are you sure? This choice is permanent.")
- After choosing, the ability appears in their ability bar / combat UI
- The skill tree / progression viewer should show tier 0 choices: which one was picked, and the other 2 greyed out as "not chosen"

**Data model changes:**
- Tier 0 abilities need a way to be grouped by choice level. Add a field like `choiceGroup: 'tier0_level3' | 'tier0_level5' | 'tier0_level8'` (or similar) to the ability definition so the system knows which 3 abilities are grouped together as a choice set.
- Add a field to distinguish tier 0 abilities from spec abilities: `tier: 0` and `requiresChoice: true` (or equivalent)
- These fields go on the `AbilityDefinition` type in `shared/src/data/skills/types.ts`

### The 63 New Abilities — Design Specifications

For each class, design 9 abilities (3 per choice level). The 3 options at each level should offer meaningfully different playstyles or tactical approaches, NOT just "damage option / defense option / utility option" every time. Be creative with the differentiation.

#### Power Level Guidelines

**Level 3 — "First Taste" (3 options, pick 1):**
- Very low power, very simple mechanically — one clear effect per ability
- Damage: roughly 40-50% of the class's existing tier 1 ability (now at level 10)
- Cooldown: 0-2 rounds
- Resource cost: zero
- These are training wheels. A small tactical choice that breaks up "basic attack every round."

**Level 5 — "Building Up" (3 options, pick 1):**
- Slightly more impactful than level 3
- Should be interesting in combination with ANY of the 3 level 3 choices (don't design level 5 abilities that only synergize with one specific level 3 pick)
- Damage: roughly 50-60% of the tier 1 ability
- Cooldown: 1-3 rounds
- Resource cost: zero or trivially low

**Level 8 — "Coming Online" (3 options, pick 1):**
- The strongest of the tier 0 abilities, but still clearly below the tier 1 spec ability at level 10
- Can be slightly more complex — a conditional, a combo interaction, a moderate cooldown
- Damage: roughly 60-75% of the tier 1 ability
- Cooldown: 2-4 rounds
- When the player hits 10 and gets their first spec ability, it should feel like a clear jump up

#### Differentiation Guidelines

The 3 options at each level should let the player lean into different aspects of the class fantasy. Use this framework but adapt it per class — don't be formulaic:

- **Option A** might lean offensive (more damage, aggression)
- **Option B** might lean defensive/sustain (survival, mitigation, healing)
- **Option C** might lean tactical/utility (debuffs, positioning, resource advantage)

But vary this! For a Bard, maybe the three options are "charm-focused," "sonic damage-focused," and "knowledge-focused" — which maps better to Bard identity than generic offense/defense/utility. For a Ranger, maybe it's "beast affinity," "marksmanship," and "wilderness cunning." **Let the class fantasy drive the differentiation, not a rigid template.**

#### Class Identity Guide

Each class's 9 tier 0 abilities should hint broadly at the class, NOT at specific specializations. These are pre-spec choices. A Warrior's tier 0 abilities should feel like "warrior stuff" — not specifically Berserker or Guardian or Warlord stuff.

- **Warrior** → martial prowess, physical toughness, battlefield presence. Options might differentiate between aggression, endurance, and command.
- **Mage** → arcane fundamentals, magical aptitude. Options might differentiate between raw power, magical defense, and arcane manipulation.
- **Rogue** → cunning, speed, opportunism. Options might differentiate between precision, evasion, and dirty tricks.
- **Cleric** → divine connection, sacred duty. Options might differentiate between holy wrath, protection, and healing instinct.
- **Ranger** → wilderness mastery, natural attunement. Options might differentiate between predatory instinct, nature bond, and survival craft.
- **Bard** → performance, influence, knowledge. Options might differentiate between inspiration, disruption, and insight.
- **Psion** → mental discipline, psionic awakening. Options might differentiate between aggression (psychic damage), perception (foresight), and manipulation (mind tricks).

#### Naming Conventions

- Names should feel grounded and natural for a low-level character who's still learning
- Avoid "Lesser X" or "Minor X" — these feel like discount versions rather than real abilities
- Good examples: "Wild Swing" (Warrior), "Spark" (Mage), "Dirty Fighting" (Rogue), "Mending Touch" (Cleric)
- Bad examples: "Lesser Fireball," "Minor Backstab," "Apprentice Smite"
- Tone: gritty fantasy, morally grey, D&D-meets-Game of Thrones

#### Ability Definition Format

Each of the 63 abilities must include:
- `name` — grounded, class-appropriate name
- `description` — 1-2 sentence flavor text fitting the game's tone
- `mechanicalEffect` — exact mechanical description (damage values, durations, conditions)
- `levelRequired` — 3, 5, or 8
- `cooldown` — in rounds
- `resourceCost` — should be 0 for most tier 0 abilities
- `damageOrHealing` — specific values, not ranges (or specify the dice if the system uses dice)
- `type` — active or passive (strongly prefer active — at most 1 passive per class across all 9 abilities)
- `tier: 0`
- `requiresChoice: true`
- `choiceGroup` — identifies which 3 abilities are grouped as a choice set (e.g., `warrior_tier0_level3`)

### Where To Put The Data

Add tier 0 abilities to the existing class data files: `shared/src/data/skills/{class}.ts`

Structure them separately from specialization abilities — perhaps a new export like `TIER0_ABILITIES` alongside the existing spec ability exports. The tier 0 abilities are class-level, not nested under any specialization.

Update `shared/src/data/skills/index.ts` to export the tier 0 data.

Update `shared/src/data/skills/types.ts` with the new fields (`tier`, `requiresChoice`, `choiceGroup`).

### Combat Integration

- Tier 0 abilities that a character has chosen should appear in their combat ability queue just like spec abilities
- Update `buildAbilityQueue()` in the combat simulator to include tier 0 abilities when building queues for simulated characters. For simulations, you'll need a way to specify which tier 0 choices the sim character made — either pick randomly, or pick the first option for consistency. Document whichever approach you use.
- The tick combat resolver already uses `CharacterAbility` records, so chosen tier 0 abilities will naturally appear. Verify this works.

### Test Updates

- Add tests for the tier 0 choice flow: choosing an ability, attempting to choose twice for the same level (should fail), choosing for a level you haven't reached (should fail)
- Update any combat tests that use low-level characters (1-9) to account for tier 0 abilities
- Run the full combat test suite — all scenarios must pass
- If combat scenarios currently test characters below level 10, they should now have appropriate tier 0 abilities equipped (simulate making choices for them in test setup)

### Output

Write `docs/tier0-ability-choices-summary.md` containing:
- The complete list of all 63 tier 0 abilities organized by class and choice level
- For each ability: name, level, choice group, description, full mechanical details
- The API endpoints added and their request/response shapes
- How the choice system integrates with level-up and combat
- Any design decisions or edge cases

### Deployment

After all changes are complete and tests pass:

```
git add -A
git commit -m "feat: add tier-0 class ability choice system at levels 3, 5, 8 with 63 new abilities"
git push
```

Build and deploy to Azure with a unique image tag (timestamp or commit hash). Never use `:latest`.

Run any required DB migrations and re-seed.
