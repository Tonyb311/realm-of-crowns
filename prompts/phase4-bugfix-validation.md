# Phase 4: Bug Fixes + Validation Scenarios

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

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
```

Read the Phase 4 audit report for full context on bugs and scenario recommendations:

```bash
cat server/src/scripts/combat-sim-results/phase4-validation-audit.md
```

## Task Overview

Phase 4 has two parts:

**Part A — Fix 4 Blocking Bugs** that prevent proper validation
**Part B — Add 12 Validation Scenarios** that test mechanics which SHOULD already work

This does NOT include BUG-5 (15+ ability mechanics silently ignored by handlers). That's a separate future task. Scenarios in this phase only test effect types and code paths that are already implemented.

---

## Part A: Bug Fixes

### BUG-1 (HIGH): Class Death Prevention Never Triggers

**Problem:** `war-ber-6` Undying Fury, `mag-nec-6` Lichdom, and `cle-hea-5` Resurrection define death-prevention passives in `class-ability-resolver.ts` (`checkDeathPrevention` function), but this function is NEVER called from `combat-engine.ts` `resolveAttack`. Only racial death prevention fires.

**Fix in `combat-engine.ts` `resolveAttack`:**

After the existing racial death prevention check (around line 669-676), add a call to the class-ability-resolver's `checkDeathPrevention`. The pattern:

```typescript
// EXISTING: racial death prevention (keep as-is)
if (target.hp <= 0 && !target.hasFled) {
  const racialPrevention = checkRacialDeathPrevention(target, state);
  // ... existing racial logic
}

// NEW: class ability death prevention (add AFTER racial block)
if (target.hp <= 0 && !target.hasFled) {
  const classPrevention = classAbilityResolver.checkDeathPrevention(target);
  if (classPrevention) {
    target.hp = classPrevention.revivedHp;
    target.isAlive = true;
    // Log the prevention
    // Add to attack result or state log
  }
}
```

- Import `checkDeathPrevention` from `class-ability-resolver.ts` (it should already be exported)
- The function checks `target.unlockedAbilityIds` for death-prevention abilities and their `usesPerCombat` tracking
- Racial prevention takes priority (checked first). Class prevention is the fallback.
- Add a `deathPrevented` field to AttackResult so the logger can display it
- **Critical:** Also check death prevention after COUNTER/TRAP reactive damage kills the ATTACKER. The attacker takes counter damage at line ~735-738. If the attacker dies from counter damage, check their death prevention too.

### BUG-2 (MEDIUM): Cooldown Reduction Passives Never Applied

**Problem:** `applyPassiveAbilities` stores `cooldownReductionPercent` and `cooldownReductionFlat` on the combatant, but nothing reads them. Abilities always go on their full cooldown.

**Fix in `class-ability-resolver.ts` `resolveClassAbility`:**

When an ability is used and placed on cooldown, apply the reduction:

```typescript
// After successful ability use, when setting cooldown:
let effectiveCooldown = abilityDef.cooldown;

// Apply flat reduction first (Spell Weaver mag-enc-6: -1)
if (actor.cooldownReductionFlat) {
  effectiveCooldown = Math.max(0, effectiveCooldown - actor.cooldownReductionFlat);
}

// Apply percentage reduction (Arcane Mastery mag-ele-6: 30%)
if (actor.cooldownReductionPercent) {
  effectiveCooldown = Math.max(0, Math.floor(effectiveCooldown * (1 - actor.cooldownReductionPercent / 100)));
}

// Set the reduced cooldown
actor.abilityCooldowns.set(abilityDef.id, effectiveCooldown);
```

Find wherever the cooldown is set after ability use and apply this logic. Order: flat first, then percentage (so a 5-round cooldown with -1 flat and 30% reduction becomes: 5 → 4 → 2).

### BUG-3 (MEDIUM): Sim Runner Can't Dispatch Psion Abilities

**Problem:** The sim runner dispatches all abilities from `abilityQueue` as `class_ability` action type. But psion abilities need `psion_ability` action type to route to the correct resolver.

**Fix in `combat-sim-runner.ts` `simDecideAction`:**

When building the action from the ability queue, check if the ability is a psion ability:

```typescript
// Import psion ability IDs or check by prefix
const isPsionAbility = (abilityId: string) => abilityId.startsWith('psi-');

// In the ability queue dispatch section:
if (isPsionAbility(entry.abilityId)) {
  return {
    type: 'psion_ability',
    abilityId: entry.abilityId,
    targetId: enemies[0]?.id,
    targetIds: enemies.map(e => e.id)
  };
} else {
  return {
    type: 'class_ability',
    // ... existing class ability action
  };
}
```

Check how `psion_ability` actions are structured in `combat-engine.ts` `resolveTurn` to ensure the action shape matches what the engine expects (particularly the psion ability lookup and `resolvePsionAbility` call).

### BUG-6 (COSMETIC): Tome of Secrets Comment

**Problem:** In `class-ability-resolver.ts`, the `TOME_ELIGIBLE_ABILITIES` array has a comment calling `cle-inq-1` "Smite" but it's actually "Denounce". `cle-pal-1` is Smite.

**Fix:** Update the comment to say "Denounce" (or whatever the ability name actually is). Do NOT change the ability ID — the ID is correct.

---

## Part B: Validation Scenarios

Add these 12 new scenarios to `combat-sim-scenarios.ts`. Each tests mechanics that ARE implemented (not BUG-5 items).

Read the existing 12 scenarios first to match the format exactly:
```bash
cat server/src/scripts/combat-sim-scenarios.ts
```

### Scenario 13: `death-prevention`

**Purpose:** Validate BUG-1 fix — class death prevention passives trigger correctly.

**Setup:**
- **Team 1:** L40 Human Warrior/Berserker
  - Stats: STR 20, DEX 12, CON 18, INT 8, WIS 10, CHA 8
  - HP: 80 (low enough to die from a big hit)
  - AC: 14, Weapon: Greataxe (1d12+5)
  - `unlockedAbilityIds`: [`war-ber-1`, `war-ber-6`] (Reckless Strike + Undying Fury)
  - `abilityQueue`: [{ abilityId: 'war-ber-1', useWhen: 'always', priority: 1 }]
  - Stance: aggressive
- **Team 2:** L45 Monster "Executioner Golem"
  - Stats: STR 22, DEX 8, CON 20, INT 5, WIS 5, CHA 5
  - HP: 200, AC: 12, Weapon: Giant Maul (3d10+6)
  - neverRetreat: true, stance: aggressive

**Expected:** Warrior takes lethal damage, Undying Fury triggers, survives at 1 HP, fights on. The monster hits hard enough that the warrior WILL drop to 0 at some point.

**Validations:** death prevention log line, warrior HP = 1 after trigger, doesn't trigger a second time (usesPerCombat: 1)

### Scenario 14: `psion-telepath`

**Purpose:** Validate BUG-3 fix — psion abilities dispatch through the correct resolver.

**Setup:**
- **Team 1:** L20 Human Psion/Telepath
  - Stats: STR 8, DEX 12, CON 12, INT 20, WIS 16, CHA 10
  - HP: 60, AC: 12, Weapon: Staff (1d6+0)
  - `unlockedAbilityIds`: [`psi-tel-1`, `psi-tel-3`, `psi-tel-4`] (Mind Spike, Psychic Crush, Dominate)
  - `abilityQueue`: [
    { abilityId: 'psi-tel-4', useWhen: 'first_round', priority: 1 },  // Dominate first
    { abilityId: 'psi-tel-3', useWhen: 'always', priority: 2 },       // Psychic Crush
    { abilityId: 'psi-tel-1', useWhen: 'always', priority: 3 }        // Mind Spike filler
  ]
- **Team 2:** L18 Orc Warrior + L18 Orc Warrior (two enemies so domination forces friendly fire)
  - Both: STR 18, HP 80, AC 15, aggressive, neverRetreat

**Expected:** Telepath dominates one orc on round 1, forcing it to attack its ally. Then uses Psychic Crush / Mind Spike for damage. Two enemies so domination has a visible target.

**Validations:** Dominate action dispatched as `psion_ability`, dominated orc attacks ally, psychic damage applies

### Scenario 15: `psion-seer-nomad`

**Purpose:** Test Seer and Nomad psion specializations.

**Setup:**
- **Team 1:** L20 Elf Psion/Seer
  - Stats: STR 8, DEX 14, CON 12, INT 18, WIS 20, CHA 10
  - HP: 55, AC: 13
  - `unlockedAbilityIds`: [`psi-see-1`, `psi-see-3`] (Foresight, Precognitive Dodge)
  - `abilityQueue`: [
    { abilityId: 'psi-see-1', useWhen: 'first_round', priority: 1 },
    { abilityId: 'psi-see-3', useWhen: 'always', priority: 2 }
  ]
- **Team 2:** L20 Gnome Psion/Nomad
  - Stats: STR 8, DEX 16, CON 12, INT 20, WIS 14, CHA 10
  - HP: 55, AC: 14
  - `unlockedAbilityIds`: [`psi-nom-1`, `psi-nom-3`, `psi-nom-5`] (Blink Strike, Dimensional Pocket, Rift Walk)
  - `abilityQueue`: [
    { abilityId: 'psi-nom-3', useWhen: 'first_round', priority: 1 },  // Go untargetable
    { abilityId: 'psi-nom-5', useWhen: 'always', priority: 2 },       // AoE damage
    { abilityId: 'psi-nom-1', useWhen: 'always', priority: 3 }        // Blink Strike filler
  ]

**Expected:** Seer buffs with Foresight, dodges attacks. Nomad phases out, then uses AoE and Blink Strike. Tests reaction, phase, teleport_attack, and aoe_damage_status psion types.

### Scenario 16: `drain-heal-loop`

**Purpose:** Test drain mechanics (damage + self-heal) which are implemented but never exercised.

**Setup:**
- **Team 1:** L30 Human Mage/Necromancer
  - Stats: STR 8, DEX 12, CON 14, INT 20, WIS 14, CHA 10
  - HP: 70, AC: 12, Weapon: Staff (1d6+0)
  - Spells: [Shadow Bolt, Blight]
  - `unlockedAbilityIds`: [`mag-nec-1`, `mag-nec-5`] (Life Drain, Soul Harvest)
  - `abilityQueue`: [
    { abilityId: 'mag-nec-5', useWhen: 'first_round', priority: 1 },  // AoE drain opener
    { abilityId: 'mag-nec-1', useWhen: 'always', priority: 2 }        // Single drain sustain
  ]
- **Team 2:** 3x L25 Orc Warrior monsters
  - STR 16, HP 60, AC 14, aggressive, neverRetreat

**Expected:** Soul Harvest damages all 3 orcs and heals necro per target hit. Life Drain damages single target and heals. Necro should sustain through drain healing.

**Validations:** selfHealing field populated on drain results, AoE drain hits all 3, heal amount matches % of damage dealt

### Scenario 17: `delayed-damage`

**Purpose:** Test delayed_damage effect type (Death Mark detonation after N rounds).

**Setup:**
- **Team 1:** L30 Human Rogue/Assassin
  - Stats: STR 10, DEX 20, CON 12, INT 14, WIS 10, CHA 8
  - HP: 60, AC: 16, Weapon: Dagger (1d4+5)
  - `unlockedAbilityIds`: [`rog-ass-5`, `rog-ass-1`] (Death Mark, Backstab)
  - `abilityQueue`: [
    { abilityId: 'rog-ass-5', useWhen: 'first_round', priority: 1 },  // Mark target
    { abilityId: 'rog-ass-1', useWhen: 'always', priority: 2 }        // Backstab filler (won't get bonus without stealth, but exercises the damage path)
  ]
- **Team 2:** L30 Monster "Armored Construct"
  - STR 18, HP: 150 (high HP so it survives to see detonation), AC: 18, CON 20
  - neverRetreat, stance: defensive

**Expected:** Death Mark placed round 1, ticks for 3 rounds, detonates. Target has enough HP to survive until detonation.

**Validations:** Delayed effect appears in state, roundsRemaining decrements each turn, detonation damage logged, delayed effect removed after detonation

### Scenario 18: `dispel-and-cleanse`

**Purpose:** Test dispel_damage (Purging Flame) and cleanse (Purify) handlers.

**Setup:**
- **Team 1:** L20 Human Cleric/Inquisitor
  - Stats: STR 12, DEX 10, CON 14, INT 12, WIS 20, CHA 14
  - HP: 65, AC: 16, Weapon: Mace (1d8+1)
  - `unlockedAbilityIds`: [`cle-inq-4`, `cle-inq-1`] (Purging Flame, Denounce)
  - `abilityQueue`: [
    { abilityId: 'cle-inq-1', useWhen: 'first_round', priority: 1 },  // Debuff enemy first
    { abilityId: 'cle-inq-4', useWhen: 'always', priority: 2 }        // Dispel + damage
  ]
- **Team 2:** L20 Elf Mage/Enchanter
  - Stats: STR 8, DEX 14, CON 12, INT 20, WIS 14, CHA 12
  - HP: 50, AC: 12, Weapon: Staff (1d6+0)
  - Spells: [Hex, Fire Bolt]
  - `unlockedAbilityIds`: [`mag-enc-2`, `mag-enc-3`] (Enfeeble, Haste)
  - `abilityQueue`: [
    { abilityId: 'mag-enc-3', useWhen: 'first_round', priority: 1 },  // Buff self with Haste
    { abilityId: 'mag-enc-2', useWhen: 'always', priority: 2 }        // Debuff Inquisitor
  ]

**Expected:** Enchanter buffs with Haste. Inquisitor uses Purging Flame to strip Haste buff + deal bonus damage per buff removed. Also tests Enfeeble debuff and Denounce debuff.

**Validations:** Purging Flame removes buffs, damage scales with buffs removed, debuffs applied correctly

### Scenario 19: `absorption-shield`

**Purpose:** Test absorption shields (buff with absorbDamage) being consumed by attacks.

**Setup:**
- **Team 1:** L22 Elf Mage/Elementalist
  - Stats: STR 8, DEX 14, CON 12, INT 20, WIS 14, CHA 10
  - HP: 55, AC: 13, Weapon: Staff (1d6+0)
  - Spells: [Fire Bolt, Scorching Ray]
  - `unlockedAbilityIds`: [`mag-ele-4`, `mag-ele-1`] (Elemental Shield, Fireball)
  - `abilityQueue`: [
    { abilityId: 'mag-ele-4', useWhen: 'first_round', priority: 1 },  // Shield up first
    { abilityId: 'mag-ele-1', useWhen: 'always', priority: 2 }        // Fireball
  ]
- **Team 2:** L22 Orc Warrior monster
  - STR 20, HP: 90, AC: 15, Weapon: Greataxe (2d12+5), aggressive, neverRetreat

**Expected:** Mage shields turn 1. Warrior attacks and shield absorbs damage until depleted. Then mage takes real damage.

**Validations:** absorbDamage buff created, incoming damage consumed by shield (reduced or zeroed), shield depletes after enough hits, damage passes through once shield gone

### Scenario 20: `aoe-dot-consecrate`

**Purpose:** Test AoE DoT (Consecrate applies burning to all enemies).

**Setup:**
- **Team 1:** L16 Human Cleric/Paladin
  - Stats: STR 16, DEX 10, CON 16, INT 10, WIS 18, CHA 14
  - HP: 75, AC: 18, Weapon: Warhammer (1d8+3)
  - `unlockedAbilityIds`: [`cle-pal-3`, `cle-pal-1`] (Consecrate, Smite)
  - `abilityQueue`: [
    { abilityId: 'cle-pal-3', useWhen: 'first_round', priority: 1 },  // AoE DoT opener
    { abilityId: 'cle-pal-1', useWhen: 'always', priority: 2 }        // Smite for single target
  ]
- **Team 2:** 3x L14 Goblin monsters
  - STR 10, DEX 14, HP: 30, AC: 12, Weapon: Short Sword (1d6+2)

**Expected:** Consecrate applies burning DoT to all 3 goblins. Burning ticks each round. Smite deals single-target radiant damage.

**Validations:** Burning status applied to all enemies, per-round DoT ticking, Smite damage with bonusDamage field

### Scenario 21: `cooldown-reduction`

**Purpose:** Validate BUG-2 fix — cooldown reduction passives actually reduce cooldowns.

**Setup:**
- **Team 1:** L40 Elf Mage/Elementalist
  - Stats: STR 8, DEX 14, CON 12, INT 22, WIS 16, CHA 10
  - HP: 60, AC: 13, Weapon: Staff (1d6+0)
  - `unlockedAbilityIds`: [`mag-ele-1`, `mag-ele-5`, `mag-ele-6`] (Fireball cd:3, Meteor Strike cd:5, Arcane Mastery passive 30% CDR)
  - `abilityQueue`: [
    { abilityId: 'mag-ele-5', useWhen: 'first_round', priority: 1 },
    { abilityId: 'mag-ele-1', useWhen: 'always', priority: 2 }
  ]
- **Team 2:** L35 Monster "Training Dummy"
  - STR 10, HP: 300 (survives many rounds to see cooldown cycles), AC: 10, CON 20
  - neverRetreat, stance: defensive, Weapon: Fist (1d4+0)

**Expected:** With 30% CDR: Meteor Strike cooldown 5 → 3 (floor(5*0.7)), Fireball cooldown 3 → 2 (floor(3*0.7)). Abilities should come off cooldown faster than their listed values. The dummy survives long enough to see at least 2 full cooldown cycles.

**Validations:** Abilities re-available before their base cooldown expires, log shows reduced cooldown values

### Scenario 22: `nethkin-counter-stack`

**Purpose:** Test Nethkin racial reflect + class counter stacking (double reactive damage).

**Setup:**
- **Team 1:** L14 Nethkin Rogue/Swashbuckler
  - Stats: STR 10, DEX 18, CON 12, INT 12, WIS 10, CHA 14
  - HP: 50, AC: 16, Weapon: Rapier (1d8+4)
  - `unlockedAbilityIds`: [`rog-swa-1`] (Riposte)
  - `abilityQueue`: [{ abilityId: 'rog-swa-1', useWhen: 'always', priority: 1 }]
  - Stance: defensive
- **Team 2:** L14 Orc Warrior monster
  - STR 18, HP: 70, AC: 14, Weapon: Greataxe (1d12+4), aggressive, neverRetreat

**Expected:** When the orc attacks the Nethkin: (1) Nethkin Infernal Rebuke fires fire reflect damage, (2) Riposte counter fires additional counter damage. Attacker takes damage from BOTH. Tests reactive damage stacking.

**Validations:** Both reflect and counter appear in attack result, attacker takes cumulative reactive damage

### Scenario 23: `multi-buff-stack`

**Purpose:** Test multiple buffs from different abilities stacking on one combatant.

**Setup:**
- **Team 1:** L20 Human Warrior/Guardian
  - Stats: STR 18, DEX 12, CON 18, INT 8, WIS 12, CHA 10
  - HP: 80, AC: 18, Weapon: Longsword+Shield (1d8+4)
  - `unlockedAbilityIds`: [`war-gua-2`, `war-gua-4`] (Fortify: +4 AC, Shield Wall: 50% DR)
  - `abilityQueue`: [
    { abilityId: 'war-gua-2', useWhen: 'first_round', priority: 1 },  // AC buff first
    { abilityId: 'war-gua-4', useWhen: 'always', priority: 2 }        // DR buff
  ]
  - Stance: defensive
- **Team 2:** L20 Orc Berserker monster
  - STR 20, HP: 80, AC: 12, Weapon: Greataxe (2d6+5), aggressive, neverRetreat

**Expected:** Guardian stacks Fortify (+4 AC) AND Shield Wall (50% DR). Both buffs should be active simultaneously, making the guardian very tanky. Tests that buff handler doesn't clobber previous buffs from different abilities.

**Validations:** Both buffs appear in activeBuffs array, AC bonus applies to hit calculation, DR applies to damage (if DR is implemented in resolveAttack — check `getBuffDamageReduction` function)

### Scenario 24: `mutual-kill`

**Purpose:** Test simultaneous death via reactive damage — both combatants die in same resolveAttack.

**Setup:**
- **Team 1:** L10 Nethkin Rogue/Swashbuckler
  - Stats: STR 10, DEX 16, CON 10, INT 10, WIS 10, CHA 14
  - HP: 8 (deliberately very low — one hit from counter will kill)
  - AC: 14, Weapon: Rapier (1d8+3)
  - `unlockedAbilityIds`: [`rog-swa-1`] (Riposte)
  - `abilityQueue`: [{ abilityId: 'rog-swa-1', useWhen: 'always', priority: 1 }]
- **Team 2:** L10 Orc Warrior
  - STR 16, HP: 8 (deliberately very low — one normal hit will kill)
  - AC: 12, Weapon: Greataxe (1d12+3)
  - neverRetreat, aggressive

**Expected:** Whoever attacks first kills the other. But the defender has counter (Riposte) or Nethkin reflect. If the Orc attacks the Nethkin and kills them, Nethkin's Infernal Rebuke + Riposte counter might kill the Orc too. Result should be a draw (0 alive teams).

**Validations:** Combat ends with draw outcome, `winningTeam: null`, both combatants dead in final state

---

## Scenario Implementation Guidelines

For ALL scenarios:

1. **Match existing format** — Use the exact same TypeScript interface as scenarios 1-12. Copy the structure.
2. **All abilities in `unlockedAbilityIds` must also be in `abilityQueue`** if you want them to fire. Unlocked-but-unqueued abilities are only passives or do nothing in the sim.
3. **Psion scenarios (14, 15)** — These test the BUG-3 fix. If psion dispatch still routes wrong, these scenarios will expose it with fallback-to-attack behavior.
4. **Death prevention scenario (13)** — This tests the BUG-1 fix. The warrior MUST take enough damage to hit 0 HP. Make the monster hit hard.
5. **Cooldown reduction scenario (21)** — This tests the BUG-2 fix. Use a high-HP dummy so the fight lasts 10+ rounds, enough to see multiple cooldown cycles. The log should show abilities becoming available sooner than their base cooldown.

## Sim Runner Updates

The runner needs updates for the new scenarios:

1. **Psion ability dispatch** (BUG-3 fix) — Already covered in Part A
2. **New scenario names** — Add all 12 to the scenario list/registry
3. **Logger updates if needed:**
   - Death prevention: Log "☠️→❤️ [Name] survived lethal damage via [ability]! (1 HP)" in bold green
   - Psion abilities: Check if the psion resolver's return format matches what the logger expects. If not, add extraction for psion-specific result fields.
   - Absorption: Log "🛡️ [Shield] absorbed [X] damage ([Y] remaining)" when shield consumes damage

## Running & Verification

After implementing everything:

```bash
cd server
npx ts-node src/scripts/combat-sim.ts
```

This should run all 24 scenarios (12 existing + 12 new). Verify:

1. **No TypeScript errors** — Clean compilation
2. **All 24 scenarios complete** — No crashes, no infinite loops
3. **BUG-1 validated** — Scenario 13 shows death prevention triggering
4. **BUG-2 validated** — Scenario 21 shows reduced cooldowns
5. **BUG-3 validated** — Scenarios 14-15 show psion abilities dispatching correctly (not falling back to basic attack)
6. **Determinism** — Run twice with seed=42, verify output hashes match (existing monkey-patch handles this)
7. **No regressions** — Scenarios 1-12 produce same results as before

Write a summary of scenario results to: `server/src/scripts/combat-sim-results/phase4-results.md`

Include for each of the 12 new scenarios:
- Pass/Fail
- Key observations (did the mechanic work as expected?)
- Any unexpected behavior or new bugs discovered

## Scope Boundaries — Do NOT Do These

- **Do NOT fix BUG-5** (ability mechanics silently ignored). That's a separate task.
- **Do NOT refactor existing handlers.** Bug fixes only touch the specific lines needed.
- **Do NOT add P2/P3 scenarios** (polymorph, warlord, battlechanter, etc.). Those come after BUG-5 is fixed.
- **Do NOT change how the seeded PRNG works.** The existing monkey-patch is fine.
- **Do NOT exceed ~200 new lines in combat-engine.ts** or ~100 new lines in class-ability-resolver.ts for bug fixes. These are targeted fixes, not refactors.
- **Do NOT modify any existing scenario.** Scenarios 1-12 must remain unchanged for regression comparison.

## Deployment

After all changes pass locally:

```bash
git add -A
git commit -m "Phase 4: Fix death prevention/cooldown/psion bugs + 12 validation scenarios"
git push origin main
```

Then deploy to Azure and seed production:

```bash
# Build and deploy
az acr build --registry realmofcrowns --image realm-of-crowns-api:phase4-validation-$(date +%s) --file server/Dockerfile .
az containerapp update --name realm-of-crowns-api --resource-group realm-of-crowns-rg --image realmofcrowns.azurecr.io/realm-of-crowns-api:phase4-validation-$(date +%s)

# Seed production database
az containerapp exec --name realm-of-crowns-api --resource-group realm-of-crowns-rg -- npx ts-node src/scripts/seed.ts
```

Use a unique image tag (never :latest).
