# Prompt: Group Combat Sim — 5-Player Parties vs CR-Matched Monster Groups

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
cat server/src/scripts/batch-combat-sim.ts
cat server/src/services/combat-simulator.ts
cat server/src/services/tick-combat-resolver.ts
cat shared/src/data/combat/cr-formula.ts
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

## Task: Build Group Combat Sim + Run Baseline 5v5 Encounters

The combat engine already supports multiple combatants per team (team field, initiative-based turn order, AoE targeting, multi-target abilities). But the sim infrastructure is 1v1 only. We need to extend it for group combat and run baseline sims.

### Part 1: Extend the Sim Infrastructure for Group Combat

**Extend `SyntheticPlayerConfig` in `combat-simulator.ts`:**

The existing config generates one player. Add a party config type:

```typescript
interface PartyConfig {
  members: SyntheticPlayerConfig[];  // 1-5 player configs
  partyLevel?: number;  // If set, override individual levels (all same level)
}
```

**Add `buildSyntheticParty()` function:**

Takes a `PartyConfig`, calls `buildSyntheticPlayer()` for each member, returns an array of player results. Each member gets:
- A unique name (e.g., "Human Warrior #1", "Elf Mage #2" or generate fantasy names)
- Their own race/class stats, abilities, equipment
- All assigned to `team: 0`

**Add monster group generation:**

```typescript
interface MonsterGroupConfig {
  /** Match monsters to party level */
  partyLevel: number;
  /** How to select monsters */
  method: 'cr_match' | 'manual';
  /** For cr_match: target difficulty */
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  /** For manual: explicit monster names */
  monsters?: string[];
}
```

For `cr_match` method, build a function that:
1. Queries the DB for all monsters
2. Selects a group of monsters whose combined threat matches the party's level and difficulty:
   - **Easy:** total monster levels ≈ party size × party level × 0.5
   - **Medium:** total monster levels ≈ party size × party level × 0.75
   - **Hard:** total monster levels ≈ party size × party level × 1.0
   - **Deadly:** total monster levels ≈ party size × party level × 1.5
3. Monster selection rules:
   - Individual monster level should be within partyLevel ± 5 (don't send a L1 goblin against a L20 party)
   - Mix of monster types: prefer 1 elite/boss + 2-4 standard, or 3-5 standard
   - Don't exceed 5 monsters per group (keeps fights manageable)
   - Prefer monsters from the same biome (thematic consistency) but don't require it

**These are rough starting formulas.** The exact tuning doesn't matter yet — we're establishing a baseline and will adjust after seeing results.

**Extend `batch-combat-sim.ts` CLI:**

Add a `--group` flag or a new subcommand:
```
npm run sim:run -- --group --config sim-configs/group-baseline.ts
```

When in group mode:
- Build the player party (multiple combatants, team 0)
- Build the monster group (multiple combatants, team 1)
- All combatants go into one `CombatState`
- Roll initiative for everyone
- `resolveTickCombat()` handles the rest (it already processes all combatants by initiative order)

**Targeting AI update:**

Check `tick-combat-resolver.ts` — the AI's `decideAction()` selects targets. In 1v1 there's only one enemy. In group combat, it needs target selection logic:
- **Damage abilities:** Target the lowest-HP living enemy (focus fire)
- **AoE abilities:** Always preferred when 2+ enemies are alive
- **Heals/buffs:** Target the lowest-HP ally (or self if solo)
- **Debuffs/CC:** Target the highest-threat enemy (most damage dealt, or highest level)
- **Taunt:** Taunted combatants must attack the taunter

Check if `getEnemies()` already handles multi-enemy filtering. It should — it filters by `c.team !== actor.team && c.isAlive`.

**Victory condition:**

Combat ends when all combatants on one team are dead (or fled). The existing `winningTeam` field already supports this.

### Part 2: Combat Encounter Log Updates

The `CombatEncounterLog` and the admin dashboard need to handle group combat data:

1. **Encounter context** should list ALL combatants (5 players + N monsters), not just 2
2. **The admin dashboard** may render combat assuming 2 combatants — check if the History/Overview tabs handle multi-combatant logs gracefully. If not, don't fix it now — just note it.

### Part 3: Create Baseline Sim Config

Create `server/src/scripts/sim-configs/group-baseline.ts` with these encounter setups:

**Party Compositions (5 archetypal parties):**

```
Party A — "Balanced": Warrior(Guardian), Mage(Elementalist), Cleric(Healer), Rogue(Assassin), Ranger(Marksman)
Party B — "Heavy Melee": Warrior(Berserker), Warrior(Guardian), Rogue(Swashbuckler), Cleric(Paladin), Ranger(Beast Master)
Party C — "Caster Heavy": Mage(Elementalist), Mage(Necromancer), Psion(Kineticist), Cleric(Healer), Bard(Minstrel)
Party D — "Support/Control": Bard(Diplomat), Cleric(Healer), Psion(Telepath), Ranger(Warden), Warrior(Warlord)
Party E — "Glass Cannon": Mage(Elementalist), Rogue(Assassin), Ranger(Marksman), Psion(Kineticist), Bard(Battle Bard)
```

All party members use human race for baseline (no racial ability variance).

**Level brackets:** 10, 20, 30 (post-specialization levels where all classes have meaningful abilities)

**Difficulty levels:** medium, hard, deadly

**Matrix:**
- 5 parties × 3 levels × 3 difficulties = 45 unique encounters
- Run each encounter 10 times for statistical reliability = 450 total combats

**For each encounter, let the CR-match system pick appropriate monsters.** Don't hand-pick — we want to see what the system produces.

### Part 4: Run the Sims and Report

Run all 450 combats. Results persist to DB for admin dashboard viewing.

**In chat, report a summary table:**

| Party | Level | Difficulty | Win Rate | Avg Rounds | Avg Party Deaths | Avg Monsters |
|-------|-------|------------|----------|------------|-----------------|--------------|
| A (Balanced) | 10 | Medium | X% | X | X | X |
| A (Balanced) | 10 | Hard | X% | X | X | X |
| A (Balanced) | 10 | Deadly | X% | X | X | X |
| A (Balanced) | 20 | Medium | X% | X | X | X |
| ... | ... | ... | ... | ... | ... | ... |

**Key metrics to report per encounter:**
- Win rate (party wins / total combats)
- Average rounds to resolution
- Average party member deaths per combat (0 = flawless, 5 = TPK)
- Average monsters in the group (to see what CR-match picked)
- Which monsters were selected most often
- Any combats that errored or hung (should be 0)

**Also report:**
- Did AoE abilities fire against groups? (Fireball should shine in group combat)
- Did heals target allies? (Cleric should heal party members, not just self)
- Did taunt work? (Guardian's taunt should redirect enemy attacks)
- Any AI targeting issues? (Everyone attacking the same target vs spreading damage)

### What NOT to Do

- Don't fix balance issues. Report them. We're establishing a baseline.
- Don't tune the CR-match formula. Use the rough version. We'll refine after data.
- Don't rewrite the combat engine. It already supports groups. Just wire it up.
- Don't change the admin dashboard. If group logs look weird, note it.

### Deployment

If infrastructure changes were needed (sim extensions, AI targeting):

```
git add -A
git commit -m "feat: group combat sim infrastructure + baseline 5v5 encounters"
git push
```

Build and deploy with unique image tag. Never use `:latest`.

Then run the sims (no deploy needed for the sim run itself — it's a local script against the production DB).
