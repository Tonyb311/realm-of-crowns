# Prompt: Monster System Audit + Tagging System + Template Standardization

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
cat database/seeds/monsters.ts
cat server/src/lib/combat-engine.ts
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

## Task: Monster System Audit, Tagging System, and Template Standardization

Three goals: (1) audit every monster for d20 correctness, (2) add a classification tagging system for future content types, (3) create a standardized monster template so adding new monsters is easy and consistent.

---

### Part 1: Monster Classification Tagging System

Add tags to the `MonsterDef` interface and every monster in the seed data. These tags classify monsters for filtering, content gating, AI behavior, encounter generation, and future systems (quests, events, bounties).

**Add these fields to `MonsterDef` in `database/seeds/monsters.ts`:**

```typescript
// Classification tags
category: 'beast' | 'humanoid' | 'undead' | 'construct' | 'fiend' | 'aberration' | 'elemental' | 'fey' | 'dragon' | 'monstrosity' | 'plant' | 'celestial' | 'ooze';
subcategory?: string; // Optional finer classification: 'wolf', 'giant', 'lich', etc.
encounterType: 'standard' | 'elite' | 'boss' | 'miniboss' | 'quest' | 'event' | 'rare' | 'world_boss';
sentient: boolean; // Determines gold drops (true = drops gold, false = materials only)
isSolitary: boolean; // Appears alone or in groups (future: encounter group sizing)
environment?: string[]; // Additional environment tags beyond biome: 'cave', 'ruins', 'water', 'sky', 'underground'
faction?: string; // Future: faction affiliation ('Iron Pact', 'Cult of the Void', 'Wild', etc.)
size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
```

**Also add to the Prisma schema** (`database/prisma/schema.prisma`) — check if the Monster model stores these as JSON or if they need proper columns. Since monsters are seeded as JSON stats, these tags should be part of the monster record so they're queryable. Add columns for `category`, `encounterType`, `sentient`, and `size` at minimum. The rest can live in a `tags` JSON column.

**Create a migration** for the new columns.

**Tag every existing monster.** Here's the classification guide:

| Monster | Category | Encounter Type | Sentient | Size |
|---------|----------|---------------|----------|------|
| Goblin | humanoid | standard | true | small |
| Wolf | beast | standard | false | medium |
| Bandit | humanoid | standard | true | medium |
| Giant Rat | beast | standard | false | small |
| Slime | ooze | standard | false | medium |
| Mana Wisp | elemental | standard | false | tiny |
| Bog Wraith | undead | standard | false | medium |
| Skeleton Warrior | undead | standard | false | medium |
| Orc Warrior | humanoid | standard | true | medium |
| Giant Spider | beast | standard | false | large |
| Dire Wolf | beast | standard | false | large |
| Troll | monstrosity | standard | true | large |
| Arcane Elemental | elemental | standard | false | medium |
| Shadow Wraith | undead | elite | false | medium |
| Young Dragon | dragon | boss | false | large |
| Lich | undead | boss | true | medium |
| Demon | fiend | boss | true | large |
| Hydra | monstrosity | elite | false | huge |
| Ancient Golem | construct | elite | false | large |
| Void Stalker | aberration | elite | false | medium |
| Elder Fey Guardian | fey | boss | true | large |
| Wyvern | dragon | standard | false | large |
| Treant | plant | standard | false | huge |
| Chimera | monstrosity | elite | false | large |
| Mind Flayer | aberration | boss | true | medium |
| Vampire Lord | undead | boss | true | medium |
| Frost Giant | humanoid | elite | true | huge |
| Sea Serpent | beast | elite | false | huge |
| Iron Golem | construct | boss | false | large |
| Fire Giant | humanoid | elite | true | huge |
| Purple Worm | monstrosity | boss | false | gargantuan |
| Beholder | aberration | boss | true | large |
| Fey Dragon | dragon | elite | true | large |
| Death Knight | undead | boss | true | medium |
| Storm Giant | humanoid | boss | true | huge |
| Sand Wyrm | monstrosity | elite | false | gargantuan |
| Kraken Spawn | aberration | elite | false | huge |
| War Mammoth | beast | elite | false | gargantuan |
| River Leviathan | beast | elite | false | gargantuan |
| Basilisk King | monstrosity | boss | false | large |
| Aboleth | aberration | boss | true | large |
| Djinn Lord | elemental | boss | true | large |
| Roc | beast | elite | false | gargantuan |
| Archlich | undead | boss | true | medium |
| Phoenix | elemental | boss | false | huge |
| Pit Fiend | fiend | boss | true | large |
| Deep Kraken | aberration | boss | true | gargantuan |
| Elder Wyrm | dragon | boss | false | gargantuan |
| Arcane Titan | construct | boss | true | gargantuan |
| Tarrasque | monstrosity | world_boss | false | gargantuan |
| Void Emperor | aberration | world_boss | true | large |

Review these classifications and adjust if any seem wrong based on the monster's lore, stats, and abilities.

**Validate sentient vs gold drops:** Cross-reference the `sentient` tag against the loot table. Every `sentient: true` monster should have gold in its loot table. Every `sentient: false` monster should NOT have gold. Flag any mismatches — the earlier design rule was "only humanoids/sentient monsters drop gold." Some non-humanoid sentient creatures (Lich, Beholder, Aboleth) should arguably drop gold too.

---

### Part 2: d20 Mechanics Audit

Audit every monster's stats and abilities for d20 correctness, similar to what we did for class abilities.

**A. Attack bonus validation:**
The `stats.attack` field is the monster's attack bonus. Verify it makes sense given the monster's stats:
- For STR-based attackers: attack should ≈ getModifier(STR) + proficiencyForLevel
- For DEX-based attackers: attack should ≈ getModifier(DEX) + proficiencyForLevel
- Proficiency for monsters scales with level (use the same `getProficiencyBonus()` from shared)
- Flag any monster where `stats.attack` is wildly off from what the stats would produce

**B. Save DC validation:**
For monster abilities with `saveDC`: verify the DC makes sense:
- DC should ≈ 8 + proficiencyForLevel + relevant stat modifier
- A Lich (INT 22) at level 18 with prof +6 should have DCs around 8 + 6 + 6 = 20
- A Wolf (STR 12) at level 2 with prof +2 should have DCs around 8 + 2 + 1 = 11
- Flag any DCs that seem too high or too low for the monster's level and stats

**C. Damage scaling validation:**
- Verify damage dice scale reasonably with level
- Tier 1 (L1-5): 1d4-1d6 range
- Tier 2 (L5-10): 1d8-2d8 range
- Tier 3 (L10-20): 2d6-3d8 range
- Tier 4 (L17-30): 2d8-4d8 range
- Tier 5 (L31-40): 3d8-5d10 range
- Tier 6 (L41-50): 4d8-5d10+ range
- Flag any outliers

**D. HP/AC scaling validation:**
- HP should scale roughly linearly or slightly exponential with level
- AC should be in reasonable range for the monster type (constructs/dragons high, beasts lower)
- Flag any monsters that seem too tanky or too squishy for their level

**E. Resistance/immunity consistency:**
- A fire creature should be immune to FIRE, not COLD
- An ice creature should be immune to COLD
- Undead should be immune to POISON and poisoned condition
- Constructs should be immune to poisoned, frightened, charmed conditions
- Flag any monsters with illogical resistances/immunities

**F. Missing damage types:**
- Every monster should have a `damageType` on the base monster (for basic attacks)
- Every monster ability that deals damage should have a `damageType` on the ability
- Flag any missing damage types

**G. Ability descriptions:**
- Check that monster ability descriptions match what the ability actually does
- A `type: 'aoe'` ability shouldn't be described as a single-target attack
- Damage types in descriptions should match the mechanical damage type
- Fear auras should mention fear/dread
- Save-based abilities should hint at resistance possibility

**H. Missing narrator templates:**
- Check `shared/src/data/combat-narrator/templates.ts` for MONSTER_FLAVOR entries
- Every monster name should have narrator templates. Flag any without.

---

### Part 3: Monster Template Standardization

Create a documented template file at `docs/monster-template.md` that serves as the canonical reference for adding new monsters. This template should include:

**A. Required fields:**
List every field on `MonsterDef` with:
- Field name and type
- Whether it's required or optional
- Default value if optional
- Description and examples
- Validation rules (e.g., "saveDC must equal 8 + profBonus + relevant stat modifier")

**B. Scaling guidelines:**
A table showing expected stat ranges per tier:
- HP, AC, attack, damage, save DCs, number of abilities, legendary actions/resistances
- When to use phase transitions (bosses only, at 50%/25% HP)
- When to use legendary actions (elites+, 1-3 based on encounter type)
- When to use legendary resistances (bosses+, 1-3)

**C. Tag guidelines:**
- When to use each `category`
- When to use each `encounterType`
- How `sentient` affects loot tables
- Size guidelines (what's "large" vs "huge" vs "gargantuan")

**D. Checklist for new monsters:**
A bullet-point checklist that can be included in future prompts:
1. Define stats (calculate attack from stat + prof, calculate save DCs)
2. Set damage type (base + per ability)
3. Set resistances/immunities (must be thematically appropriate)
4. Set condition immunities (undead: poisoned, constructs: poisoned/frightened/charmed)
5. Set category, encounterType, sentient, size tags
6. Define abilities with proper types, save DCs, damage, cooldowns
7. If elite/boss: add legendary actions/resistances
8. If boss: add phase transitions
9. Set loot table (gold only for sentient, materials for beasts)
10. Add narrator templates
11. Verify biome is reachable via existing routes

**E. Example monster:**
Include a fully annotated example monster at each tier (1 standard, 1 elite, 1 boss) showing proper formatting and field usage.

---

### Part 4: Update Both Codexes

**Admin codex (`CodexTab.tsx` — MonstersSubTab):**
Display the new classification tags:
- Category badge (colored by type: beast=green, undead=purple, fiend=red, etc.)
- Encounter type badge (standard=grey, elite=blue, boss=gold, world_boss=red)
- Size badge
- Sentient indicator (affects gold drop display)
- Make tags searchable

**Player codex (`CodexClasses.tsx` or equivalent monster page):**
Show player-appropriate info:
- Category (player-friendly label: "Beast", "Undead", "Dragon", etc.)
- Difficulty indicator derived from encounter type (don't show raw "elite"/"boss" — show "Dangerous", "Deadly", "Legendary")
- Size (flavor only)
- Do NOT show: sentient flag, faction, environment tags, raw encounter type

**Admin API (`/admin/combat/codex/monsters`):**
Include all new tags in the response.

**Player API (`/api/codex/monsters`):**
Include player-appropriate tags only (category, size, difficulty label).

---

### Part 5: Verify

1. TypeScript builds clean (shared + server + client)
2. Migration runs successfully
3. Re-seed populates all new fields
4. Admin codex shows tags correctly for all 51 monsters
5. Player codex shows category/size/difficulty
6. Cross-reference: every sentient monster has gold, every non-sentient doesn't
7. Spot-check 5 monsters for d20 correctness (attack bonus, save DCs)

### Output

Write audit findings to `docs/audit-monster-mechanics.md`:
1. Per-monster validation table: attack bonus check, save DC check, HP/AC check, resistance check, damage type check
2. Any monsters that need stat corrections
3. Tag assignments for all 51 monsters
4. Sentient vs gold mismatch list

In chat: brief summary — monsters with issues, tags added, template created.

### Deployment

```
git add -A
git commit -m "feat: monster classification tags, d20 audit, template standardization, codex updates"
git push
```

Build and deploy with unique image tag. Run migration + re-seed.
