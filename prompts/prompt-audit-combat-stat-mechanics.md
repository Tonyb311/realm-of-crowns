# Prompt: Audit — What Do Stats, Saving Throws, Status Effects, and Speed Actually Do in Combat?

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/game-designer.md
cat shared/src/types/combat.ts
cat server/src/lib/combat-engine.ts
cat server/src/lib/class-ability-resolver.ts
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

## Task: Full Audit of Combat Stat and Status Effect Mechanics

We need to know exactly what every stat, saving throw, status effect, and combat property ACTUALLY does in the combat engine. Not what the design doc says it should do — what the code actually implements. If a stat exists on a character but nothing in the engine reads it, that's a dead stat. If a status effect is applied by abilities but the engine never checks for it, that's a dead effect.

This is a codebase audit. Do NOT run any simulations. Do NOT change any code.

### What To Audit

Trace through the combat engine code and document what each of the following actually does mechanically. For every item, answer: **"Where in the code is this read, and what does it affect?"** If the answer is "nowhere," say so explicitly.

#### A. The 6 Core Stats (STR, DEX, CON, INT, WIS, CHA)

For EACH stat, trace:
1. Where is `getModifier(stat)` called for this stat in combat code?
2. What does the modifier affect? (attack rolls, damage, AC, save DCs, save rolls, initiative, HP, healing, ability effects, etc.)
3. Is the stat used directly (raw value) anywhere, or only via `getModifier()`?
4. Which classes/abilities specifically reference this stat?
5. Are there any stats that are completely unused in combat? (e.g., CHA might exist on every character but never get read during a fight)

#### B. Saving Throws

1. Where does the engine resolve saving throws? Find the function(s).
2. What is the formula? (d20 + stat modifier + proficiency? Just d20 + stat mod? Something else?)
3. Which stat is used for which save? Is it always WIS saves? Or do different abilities call for different save stats?
4. What determines the save DC? (8 + prof + caster stat mod? Hardcoded? Per-ability?)
5. Which abilities in the game actually call for saving throws? List them all.
6. What happens on a successful save vs failed save? (Half damage? No effect? Reduced duration?)
7. Is proficiency bonus actually factored into saves? Where?

#### C. Speed

1. Is there a `speed` stat on combatants? Where is it defined?
2. Does speed affect ANYTHING in combat? (Initiative? Turn order? Number of attacks? Flee chance? Movement?)
3. Does speed affect anything OUTSIDE combat? (Travel time? Tick processing?)
4. If speed does nothing in combat, is it a dead stat that just exists in the data model?

#### D. Initiative

1. How is initiative calculated? What stat(s) feed into it?
2. Does initiative actually determine turn order? Trace from initiative roll to `turnOrder` array.
3. Can anything modify initiative mid-combat?

#### E. Armor Class (AC)

1. How is AC calculated? (Base 10 + DEX mod + equipment? Something else?)
2. What modifies AC? (Buffs, debuffs, equipment, shields, abilities)
3. How does the engine use AC? (Attack roll >= AC to hit? Strict greater than?)
4. Is there damage reduction separate from AC, or is AC the only defense stat?

#### F. Proficiency Bonus

1. How is proficiency calculated? (Level-based? Fixed? From D&D 5e table?)
2. Where is proficiency used? (Attack rolls? Save DCs? Saving throw rolls? Skill checks?)
3. Is it applied consistently, or are there places it should be used but isn't?

#### G. Every Status Effect

Check the `StatusEffectName` type in `shared/src/types/combat.ts` for the full list. For EACH status effect:

1. **What applies it?** (Which abilities, racial traits, monster attacks?)
2. **What does it mechanically do?** Trace the code that checks for this status during combat resolution:
   - Does it prevent actions? (stunned, frozen)
   - Does it deal damage per round? (poisoned, burning — check DoT processing)
   - Does it heal per round? (regenerating — check HoT processing)
   - Does it modify attack rolls?
   - Does it modify AC?
   - Does it modify damage dealt?
   - Does it modify saves?
   - Does it affect turn order?
   - Does it prevent spellcasting?
3. **How long does it last?** Is duration tracked correctly?
4. **Can it be cleansed?** Are there abilities that remove it?
5. **Is it a dead status?** Applied by abilities but the engine never checks for it during combat resolution — meaning it's just a label with no mechanical effect.

Pay special attention to:
- **slowed** — Hamstring and several other abilities apply this. Does the engine actually check for "slowed" and penalize anything? Or is it just a status name in the log?
- **weakened** — Applied by debuff abilities. Does the engine reduce the target's attack/damage when weakened?
- **frightened** — What does this mechanically do?
- **blinded** — Does this affect accuracy?
- **silenced** — Does this prevent ability use?

#### H. Buffs vs Status Effects

The system seems to have both "buffs" (ActiveBuff on Combatant with statModifiers) and "status effects" (StatusEffect with modifier field). Clarify:
1. Are these two separate systems?
2. Do buffs from abilities (like +5 attack for 4 rounds) go through the buff system or the status system?
3. When a buff says "+5 attack," where in the combat resolution does that +5 actually get added to the attack roll?
4. Is there a function that aggregates all active buff modifiers when calculating an attack/AC/save?

#### I. Damage Types

1. What damage types exist? (slashing, fire, radiant, etc.)
2. Does damage type actually matter? Is there a resistance/vulnerability system?
3. If monsters have `resistances`, does the engine halve damage of that type?
4. If damage type is purely cosmetic (no resistance system), say so.

#### J. Flee Mechanic

1. How does flee work? What's the formula?
2. What stat(s) affect flee chance?
3. Does the "slowed" status affect flee chance?
4. Can monsters flee?

### Where To Look

Start with these files but follow the trail wherever it goes:
- `server/src/lib/combat-engine.ts` — the core engine (attack resolution, turn processing, status ticks)
- `server/src/lib/class-ability-resolver.ts` — how ability effects are applied
- `server/src/lib/tick-combat-resolver.ts` — how combat is auto-resolved (AI decisions, turn loop)
- `shared/src/types/combat.ts` — type definitions (Combatant, StatusEffect, ActiveBuff, etc.)
- `shared/src/utils/dice.ts` — dice rolling, saving throw resolution
- Any racial ability resolver files
- Any monster ability resolver files
- `server/src/services/combat-simulator.ts` — how sim characters are built (stat generation, equipment)

### Output

Write ALL findings to `docs/audit-combat-stat-mechanics.md`. Structure it exactly as the sections above (A through J). For each item, include:
- **What the code actually does** (with file name and approximate line references)
- **Whether it works as expected** or has gaps
- **Dead stats / dead effects** — anything that exists in data but is never read by the engine

At the end, include a summary table:

| Mechanic | Status | Notes |
|----------|--------|-------|
| STR | ACTIVE / PARTIAL / DEAD | Brief description |
| DEX | ACTIVE / PARTIAL / DEAD | ... |
| CON | ACTIVE / PARTIAL / DEAD | ... |
| ... | ... | ... |
| slowed | ACTIVE / PARTIAL / DEAD | ... |
| weakened | ACTIVE / PARTIAL / DEAD | ... |
| ... | ... | ... |

Where:
- **ACTIVE** = fully implemented and mechanically meaningful
- **PARTIAL** = partially implemented (works in some cases but not all, or only used by some subsystems)
- **DEAD** = exists in data/types but nothing in the engine reads it

### K. Cross-Reference Against Warrior Combat Logs

The code audit (sections A-J) tells us what SHOULD happen. This section verifies it ACTUALLY happens by checking the warrior functional verification combat logs in the DB.

Pull the combat logs from the most recent warrior sim run (same data the mechanical audit script used). For each mechanic that the code audit says is ACTIVE:

**Stat modifier verification:**
- Find combats where a buff applied stat modifiers (e.g., Rally Cry applies +3 attack, +2 AC). In the NEXT turn by that combatant, check: does `attackModifiers` in the AttackResult or ClassAbilityResult breakdown actually include the buff's bonus? Does the `attackTotal` reflect it?
- Find combats where Fortify (+5 AC) was active. On enemy attacks against that combatant, does the logged `targetAC` reflect the buffed AC value?
- If Blood Rage scales with missing HP%, check a few instances: was the actor's HP actually low, and did the damage scale accordingly?

**Status effect verification:**
- Find combats where "slowed" was applied (Hamstring, Snare). In subsequent rounds, does anything mechanically change for the slowed target? (Fewer actions? Lower initiative? Reduced dodge? Or nothing at all?) Cross-reference against what section G says "slowed" should do.
- Find combats where "stunned" was applied (Shield Bash). Verify the stunned combatant actually skipped their turn in the next round.
- For every status effect that appears in the warrior logs: verify the engine's handling matches what the code audit says it does.

**Saving throw verification:**
- Find combats where a saving throw was logged. Verify:
  - The save DC matches the formula from section B (8 + prof + stat mod, or whatever it is)
  - The save roll + modifier matches the defender's stat
  - The outcome (success/fail) correctly applied full effect or reduced effect per section B findings

**Buff duration in practice:**
- Pick 5-10 buff applications from the logs. Track the buff through subsequent rounds. Does the `attackModifiers` breakdown or `targetAC` stop reflecting the buff after the correct number of rounds? This catches cases where the code says "duration 4 rounds" but the buff lingers or drops early.

**Damage type verification:**
- If section I says resistances are implemented: find combats against monsters with resistances. Is damage actually reduced?
- If section I says resistances are NOT implemented: note that damage types are cosmetic in practice.

**AC calculation verification:**
- Pick a few combatants from the logs. Using their stats (DEX mod) and equipment from the encounter context snapshot, manually calculate what their AC should be. Compare to the logged `ac` value. Do they match?

**Dead mechanic confirmation:**
- For any stat or status the code audit flags as DEAD: search the combat logs to confirm. If "slowed" is dead in code, verify that slowed combatants in the logs show zero behavioral change.

Add the findings from this cross-reference to each relevant section (A-J) as a "Log Verification" subsection. Update the summary table with a second column:

| Mechanic | Code Status | Log Verified? | Notes |
|----------|-------------|---------------|-------|
| STR | ACTIVE | YES / NO / PARTIAL | ... |
| slowed | DEAD | CONFIRMED DEAD | ... |

This way we have both the theoretical answer (what the code says) and the empirical answer (what the logs show).

### Do NOT change any code. Do NOT fix anything. Audit only.
### Do NOT commit or deploy. Just the audit file.
