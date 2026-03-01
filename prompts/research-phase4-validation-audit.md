# Research Task: Phase 4 Combat Sim Validation — Gap Analysis

You are a research analyst preparing a comprehensive audit for the Team Lead. Your job is to identify what's already tested, what's NOT tested, and recommend comprehensive validation scenarios for the final combat sim pass.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

## Research Steps

### 1. Current Scenario Inventory

Read all 12 existing scenarios and document exactly what each one tests:

```bash
cat server/src/scripts/combat-sim-scenarios.ts
```

For EACH scenario, list:
- Scenario name
- Combatants (class, level, race, abilities equipped)
- What effect types / mechanics are exercised
- What edge cases ARE covered
- What edge cases are NOT covered

### 2. Full Ability Coverage Matrix

Read every class ability data file and build a complete list of all 126 abilities with their effect types:

```bash
cat shared/src/data/skills/warrior.ts
cat shared/src/data/skills/mage.ts
cat shared/src/data/skills/cleric.ts
cat shared/src/data/skills/rogue.ts
cat shared/src/data/skills/ranger.ts
cat shared/src/data/skills/bard.ts
```

Build a matrix: for each ability ID, note:
- Effect type
- Whether it appears in ANY existing scenario (by checking unlockedAbilityIds and abilityQueue across all 12 scenarios)
- Whether its specific mechanic subtleties are tested (e.g., Backstab has requiresStealth — is stealth ever active in a scenario?)

### 3. Interaction Edge Cases Inventory

Read the full resolver and engine to identify interaction points that could fail:

```bash
cat server/src/lib/class-ability-resolver.ts
cat server/src/lib/combat-engine.ts
```

Focus on identifying:
- What happens when two reactive abilities both trigger (e.g., Riposte + Lay Trap on same character — does first consume block second?)
- Companion auto-damage targeting a dying enemy (killed by DoT earlier in the same turn)
- Delayed detonation on a target that was healed between placement and trigger
- Diplomat's Gambit during the last round before max rounds
- Tome of Secrets picking a heal ability when actor is full HP
- Tome of Secrets picking an AoE ability when only 1 enemy remains
- Multiple buff stacking (attack buff + damage buff + AC buff simultaneously)
- Counter/trap re-arming after cooldown expires (is the old buff gone by then?)
- AoE abilities when some enemies are dead (should skip dead, hit alive)
- Cleanse on a target with no debuffs
- Flee while companion is active (does companion buff persist? should it?)
- Death prevention (checkDeathPrevention) interacting with counter damage
- Absorption shield absorbing counter/trap reactive damage
- Status effect (stunned/mesmerized) preventing ability use — is this checked before class ability resolution?
- Cooldown reduction passives: verify Arcane Mastery (30%) and Spell Weaver (-1 flat) actually reduce displayed cooldowns
- HoT ticking alongside companion auto-damage in the same tick phase

### 4. Sim Runner Decision Gaps

```bash
cat server/src/scripts/combat-sim-runner.ts
```

Identify:
- Can the sim runner actually exercise every useWhen condition? (always, low_hp, high_hp, first_round, outnumbered, has_companion)
- Are there abilities that would never fire because the scenario conditions don't trigger their useWhen?
- Does the sim runner handle multi-target abilities correctly (passing targetIds)?
- Does the sim runner handle self-target abilities (heals, buffs)?

### 5. Logger Coverage

```bash
cat server/src/scripts/combat-sim-logger.ts
```

Identify:
- Which result fields are logged and which are silently dropped?
- Are perTargetResults displayed for all AoE abilities?
- Are strikeResults displayed for multi_attack?
- Is companion damage/interception logged clearly?
- Is goldStolen logged?
- Is randomAbilityUsed logged?
- Are delayed detonations logged with enough detail?

### 6. Racial Ability + Class Ability Interactions

```bash
cat server/src/lib/racial-combat-abilities.ts
```

Identify:
- Do any racial abilities interact with class abilities in ways that could break?
- Nethkin melee reflect + counter stance on same target — would attacker take double reactive damage?
- Drakonid breath weapon (racial AoE) vs targets with trap buffs — does the trap trigger on racial AoE?
- Psion domination forcing a dominated combatant to use class abilities — does that work?

### 7. Combat End Conditions

```bash
grep -n "checkCombatEnd\|COMPLETED\|DRAW\|MAX_ROUNDS\|winningTeam" server/src/lib/combat-engine.ts | head -30
```

Check:
- Does combat end correctly when all enemies die from AoE counter/trap reactive damage?
- Does combat end correctly after Diplomat's Gambit peaceful resolution?
- Does combat end correctly when companion auto-damage kills the last enemy during buff tick (before the actor's main action)?
- What happens if both teams' last members die simultaneously (e.g., counter kills attacker who killed the defender)?
- Max rounds draw — does the sim handle this gracefully?

### 8. Determinism Audit

```bash
grep -n "Math.random\|Math.floor.*Math.random\|randomInt\|rollDice\|seed\|rng\|deterministic" server/src/lib/class-ability-resolver.ts | head -20
grep -n "Math.random\|Math.floor.*Math.random\|randomInt\|rollDice\|seed\|rng\|deterministic" server/src/lib/combat-engine.ts | head -20
grep -n "Math.random\|seed\|rng\|deterministic" server/src/scripts/combat-sim-runner.ts | head -20
```

Identify:
- Is ALL randomness seeded? Or are there raw Math.random() calls that break determinism?
- Phase 3 additions (Tome of Secrets random selection, companion target selection, Diplomat's Gambit 50% roll, companion 30% interception) — are these seeded?
- The sim passes "determinism verified" but are there any new Math.random() calls from Phase 3 that could break it under different conditions?

## Output

Write your complete findings to: `server/src/scripts/combat-sim-results/phase4-validation-audit.md`

Use this structure:

```markdown
# Phase 4 Validation Audit Report

## 1. Existing Scenario Coverage
For each of the 12 scenarios:
- Name, combatants, abilities tested
- Effect types exercised
- Edge cases covered / not covered

## 2. Ability Coverage Matrix
| Ability ID | Name | Effect Type | Tested in Scenario? | Mechanic Subtleties Tested? |
Full 126-row table (or group by "tested" / "untested")

## 3. Untested Abilities
List of abilities that appear in NO scenario, grouped by priority:
- HIGH: Abilities with complex mechanics never exercised
- MEDIUM: Abilities with standard mechanics but never directly tested
- LOW: Abilities similar to tested ones (same effect type, no special fields)

## 4. Interaction Edge Cases
For each identified interaction:
- Description
- Expected behavior
- Risk level (HIGH/MEDIUM/LOW)
- Whether current scenarios test it

## 5. Sim Runner Gaps
- useWhen conditions never triggered
- Multi-target ability handling
- Self-target ability handling

## 6. Logger Gaps
- Fields not logged
- Formatting issues

## 7. Racial + Class Ability Interactions
- Identified interaction points
- Risk assessment

## 8. Combat End Edge Cases
- Identified edge cases
- Expected behavior
- Whether tested

## 9. Determinism Status
- Seeded vs unseeded random calls
- Risk of non-determinism

## 10. Recommended Validation Scenarios
For each recommended new scenario:
- Scenario name
- Purpose (what gap it fills)
- Combatants and setup
- Specific validations to check
- Priority (MUST HAVE / NICE TO HAVE)
```

## Rules

- Do NOT modify any code. Read-only research.
- Do NOT skip any section.
- Be exhaustive on the ability coverage matrix — every one of the 126 abilities.
- Focus on finding GAPS, not re-documenting what already works.
- Flag any bugs or inconsistencies found during research.
- The goal is to produce a list of scenarios that, when added, give confidence that the combat system is production-ready.
