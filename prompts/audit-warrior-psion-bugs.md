# Audit: Warrior AI + Psion Zero Damage Bugs

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## CONTEXT

Phase 3 smoke tests revealed two pre-existing functional bugs that poison all balance data:

**Bug 1: Warrior AI at High Levels**
L50 warrior always uses "Legendary Commander" (a buff ability) and never attacks. Deals 0 damage to Demon across 8 rounds of combat. This means warriors at high levels are functionally broken — they buff themselves every turn and never swing their weapon.

**Bug 2: Psion Zero Damage vs Lich**
L18 Psion deals 0 damage across 30 fights vs Lich. Min monster HP stays at 120 (max). Psion abilities either don't deal damage or are being fully negated.

Both bugs exist in the sim/combat pipeline, NOT in Phase 3 code. They need to be understood before they can be fixed.

---

## TASK

Produce a findings file at `docs/investigations/warrior-psion-bug-audit.md` with the following sections. Keep the investigation focused — don't try to fix anything, just document what's happening.

### Investigation 1: Warrior AI Bug

Read these files and trace the decision path:

1. `cat shared/src/data/skills.ts` — Find ALL warrior abilities. List every ability with its name, level requirement, type (damage/buff/utility), and any conditions.

2. `cat server/src/lib/class-ability-resolver.ts` — Find how warrior abilities are resolved. Which handler does each ability use? What damage does each deal?

3. `cat server/src/services/tick-combat-resolver.ts` — Find `decideAction()`. Trace what happens when the actor is a character (not monster). How does it pick which ability to use? Is there a priority system? What's the fallback?

4. `cat server/src/services/combat-presets.ts` — What are CombatPresets? How do they affect ability selection? What defaults are used in sims (where no player presets exist)?

5. `cat server/src/scripts/batch-combat-sim.ts` — How does `buildSyntheticPlayer()` set up the warrior? What combat presets does it use? Does it set an ability queue?

6. `cat server/src/services/combat-simulator.ts` — Same questions for the single-fight simulator.

**Questions to answer:**

- At L50, what abilities does a warrior have access to?
- In the sim, what combat presets/ability queue is set for the warrior?
- In `decideAction()`, what logic picks "Legendary Commander" over a damage ability?
- Is the issue that: (a) the AI prioritizes buffs over attacks, (b) the sim doesn't set up an ability queue so it falls back to a default, (c) the ability selection logic has a bug, or (d) something else?
- At what level does this bug START? (L10? L20? L30?) — Check which abilities unlock at each level.
- Does this affect other classes too, or just Warrior?

### Investigation 2: Psion Zero Damage

Read these files:

1. `cat shared/src/data/skills.ts` — Find ALL psion abilities. List every ability with damage, type, and level requirement.

2. `cat server/src/lib/combat-engine.ts` — Find the psion ability handlers (grep for 'psi-nom' or 'psion'). What damage does each deal? Are there save-or-suck abilities that deal no damage?

3. Trace a L18 Psion vs Lich fight:
   - What abilities does Psion have at L18?
   - Which ones deal damage vs. which are pure CC (save-or-suck)?
   - Lich has 3 Legendary Resistance — does LR negate damage abilities or just save effects?
   - Lich has condition immunities (poisoned, frightened, charmed) — do any Psion abilities apply these?
   - Is the issue that Psion abilities are all CC with no damage component, and the Lich auto-passes saves via LR?

4. Check the sim setup:
   - Does `buildSyntheticPlayer()` for Psion set up abilities correctly?
   - Does the Psion have the right level/stats to actually use its abilities?
   - Are Psion damage abilities (if any) actually being selected by decideAction()?

**Questions to answer:**

- How many Psion abilities deal direct damage vs. pure CC?
- Against a target with 3 LR + condition immunities, can a Psion deal ANY damage?
- Is this a Psion design problem (class has no damage) or a code bug (damage not being applied)?
- Does the Psion deal damage against OTHER monsters (e.g., Goblin, Troll)?

### Investigation 3: Quick Cross-Class Check

Run (or trace through code) to answer: does this affect ALL classes or just Warrior/Psion?

For each of the 7 classes, note:
- At L18, does the class have at least one damage-dealing ability?
- In the sim, does decideAction() ever select that ability?
- Any classes that appear to have the "always picks buffs" problem?

---

## OUTPUT FORMAT

Write all findings to `docs/investigations/warrior-psion-bug-audit.md`:

```markdown
# Warrior AI + Psion Zero Damage Bug Audit

**Date:** [date]
**Scope:** Two functional bugs discovered during Phase 3 smoke testing

## 1. Warrior AI Bug

### Warrior Abilities by Level
[table: level, ability name, type, damage, handler]

### decideAction() Logic for Characters
[trace of the decision path]

### Sim Setup (buildSyntheticPlayer for Warrior)
[what presets/queue is set]

### Root Cause
[what's actually happening and why]

### At What Level Does It Start?
[level range where the bug manifests]

### Other Classes Affected?
[yes/no + which ones]

## 2. Psion Zero Damage

### Psion Abilities by Level
[table: level, ability name, type, damage, save, effect]

### Damage vs CC Breakdown
[how many deal damage, how many are pure CC]

### Interaction with Lich Defenses
[LR, condition immunities, what survives]

### Root Cause
[design issue vs code bug]

### Does Psion Deal Damage to Other Monsters?
[test/trace results]

## 3. Cross-Class Check
[table: class, L18 damage ability, selected in sim, any issues]

## 4. Recommended Fixes
[brief recommendations — NOT implementations, just direction]
```

---

## DO NOT

- Do not fix any code — audit only
- Do not modify any files except creating the findings document
- Do not run sims (they take too long for an audit) — trace through code instead
- Do not change monster data
- Do not expand scope beyond these two bugs
- Keep the findings file concise — tables over prose where possible
