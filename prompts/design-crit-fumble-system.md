# Design: Critical Hit & Fumble System

Read `cat CLAUDE.md` before starting.

Read the combat engine audit from the monster system investigation: `cat docs/investigations/monster-system-audit.md` (Section 3: Combat Engine Capabilities)

Read the CR design doc: `cat docs/design/combat-rating-system.md`

---

## CONTEXT

We're designing a full critical hit and fumble system BEFORE building the monster ability engine, so monsters can have crit interactions (crit immunity, expanded crit range, special crit effects) from the start.

The current system: nat 20 = auto-hit + double damage dice. That's it. No fumble effects, no crit variation, no spell crits, no class/weapon differentiation. Combat feels samey.

The goal: a robust crit/fumble chart system that makes combat genuinely interesting and unpredictable. Crits should be memorable moments, not just "more damage." Fumbles should create tension without being unfun.

Our system: modified D20, levels 1-50, 7 classes, auto-resolved 1v1 (expanding to group combat later). Combat is tick-resolved — no player input during combat. This means crit/fumble effects need to be impactful but NOT require player decisions to resolve.

## TASK — Design Doc Only

### Part 1: Research D20 Crit/Fumble Systems

Look at established crit/fumble systems from the D20 community. Research and compare:

1. **D&D 5e base** — nat 20 double dice, nat 1 auto-miss (no fumble effects)
2. **Pathfinder 2e critical system** — degrees of success (crit success, success, failure, crit failure on every roll), weapons with different crit specialization effects (fatal, deadly, forceful, etc.)
3. **Popular homebrew crit tables** — search for well-known D&D critical hit tables and fumble charts (there are many widely-used community ones)
4. **Warhammer Fantasy Roleplay** — critical wound tables by damage type (slashing/piercing/bludgeoning produce different injuries)
5. **Rolemaster / MERP** — the granddaddy of crit tables, different crit severity levels, weapon-type-specific crit charts
6. **Video game adaptations** — how do CRPGs (Baldur's Gate 3, Pathfinder: Kingmaker, Solasta) handle crits in auto-resolved or real-time combat?

For each, note:
- What makes it fun or unfun?
- How does it affect combat length and lethality?
- Does it create "feel-bad" moments (fumble hurts the player more than it adds excitement)?
- How complex is it to implement in auto-resolved combat?

### Part 2: Design the Crit System

Design a critical hit system for Realm of Crowns. Address ALL of the following:

#### A. Melee/Ranged Weapon Crits

**Crit trigger:** Nat 20 is the baseline. But consider:
- **Expanded crit range by weapon type** — Keen weapons (19-20), Brutal weapons (18-20 at high tiers)?
- **Expanded crit range by class** — Warrior Berserker gets 19-20 at a certain level? Rogue gets crit on flanking?
- **Expanded crit range by level** — everyone's crit range expands at milestone levels (e.g., 19-20 at level 20, 18-20 at level 40)?

**Crit effects — NOT just double damage.** Design a crit chart with varied effects based on WEAPON TYPE and/or DAMAGE TYPE:

For example (adjust these, they're just starting ideas):
- **Slashing weapons** (swords, axes): Bleeding (DoT), Severed tendon (speed reduction), Deep wound (healing reduction)
- **Piercing weapons** (daggers, spears, arrows): Vital strike (triple dice), Pinned (immobilized), Punctured organ (CON save or extra damage per round)
- **Bludgeoning weapons** (maces, hammers, fists): Stagger (lose next turn), Concussion (disadvantage on attacks), Shattered armor (AC reduction)

Should crit effects be:
- Rolled from a table (d100 or d20 on crit chart)?
- Determined by weapon type?
- Determined by how much the attack roll exceeded the AC (degree of success)?
- A combination?

**Crit severity tiers** — Consider scaling crit severity by how far above the target's AC the roll landed, or by level difference:
- **Minor crit** (nat 20, barely over AC): Bonus damage + minor effect
- **Major crit** (nat 20, well over AC): Double damage + significant effect  
- **Devastating crit** (nat 20 + very high roll, or special ability): Triple damage + severe effect + status

#### B. Spell/Ability Crits

Spells and abilities are different from weapons. Design how crits work for:

- **Direct damage spells/abilities** (Fireball, Mind Spike, Reckless Strike): What triggers a crit? Spells don't usually roll to hit. Options:
  - If ability makes an attack roll → nat 20 crits like a weapon
  - If ability forces a save → target rolling nat 1 on save = "crit" for the caster?
  - Flat % chance on any ability use?

- **Spell crit effects** (NOT just double damage):
  - Extended duration (debuff lasts twice as long)
  - Bypasses resistance (target's resistance is ignored for this hit)
  - Area expansion (AoE abilities hit harder or wider)
  - Secondary effect (Fireball crit: double damage + burning DoT)
  - Spell penetration (crit ignores magic resistance / legendary resistance)

- **Healing spell crits**: Should heals be able to crit? If yes:
  - Overheal as temporary HP?
  - Healing crit removes a debuff?
  - Crit heal also applies a minor buff?

- **Buff/debuff spell crits**: 
  - Buff crit = extended duration or amplified effect?
  - Debuff crit = harder to resist/remove, or applies a secondary debuff?

#### C. Fumble System

**Critical question: should fumbles exist at all?** Many TTRPG communities hate fumble tables because:
- Fighters who attack more often fumble more often (punishes martial classes)
- Fumbles make skilled characters look incompetent
- "You drop your weapon" effects are frustrating, not fun

If we include fumbles, design them to be INTERESTING, not PUNISHING. Consider:

**Fumble trigger:** Nat 1 is the baseline. Should it:
- Always trigger a fumble effect?
- Require a confirmation roll (roll again — if second roll also misses, fumble triggers)?
- Scale with level (lower-level characters fumble more severely, high-level characters have minor fumbles)?
- Be class-dependent (Rogues have graceful fumbles, Warriors have weapon fumbles)?

**Fumble effects by weapon type:**
- **Slashing:** Overswing (self AC penalty next round), Off-balance (attacker prone)
- **Piercing:** Weapon stuck (lose next attack extracting it), Misjudged thrust (self-damage)
- **Bludgeoning:** Wild swing (hit ally if in group combat), Momentum loss (no attack next round)

**Spell fumble effects:**
- Wild magic surge (random effect — could be good or bad)
- Spell fizzle (ability goes on extended cooldown)
- Backlash (damage to self)
- Mana burn (reduced effectiveness next cast)
- Inverted effect (heal becomes damage, buff becomes debuff — for comedy and chaos)

**Fumble severity:** Should mirror crit severity — how badly you missed matters:
- **Minor fumble** (nat 1, would have missed anyway): Small penalty, recover next round
- **Major fumble** (nat 1, roll confirmed): Significant penalty lasting multiple rounds
- **Catastrophic fumble** (nat 1, confirmed, under special conditions): Severe consequences

**Group combat fumble consideration:** In 5v1, if each attacker has a 5% fumble chance, there's a ~23% chance SOMEONE fumbles each round. This needs to feel fair, not constant.

#### D. Monster Crit Interactions

This is why we're designing crits before the monster engine:

- **Crit immunity** — Some monsters should be immune to crits (Oozes, Elementals, constructs without vital organs). Add to monster data model.
- **Crit resistance** — Reduce crit severity by 1 tier (devastating → major → minor). For heavily armored or amorphous monsters.
- **Expanded crit range for monsters** — Elite/boss monsters might crit on 19-20. Assassin-type monsters on 18-20.
- **Monster-specific crit effects** — Dragon crit = knockback. Spider crit = extra poison. Lich crit = level drain. These go in the monster ability data.
- **Fumble immunity for monsters** — Should monsters fumble? It adds flavor but might make fights too swingy if the Lich fumbles its Power Word Kill.

#### E. Class-Specific Crit Interactions

Each class should have a unique relationship with crits:

- **Warrior (Berserker):** Expanded crit range? Bonus crit damage? Crit triggers Rage?
- **Warrior (Warlord):** Crits buff allies in group combat?
- **Rogue:** Crits deal massive bonus damage (sneak attack amplification)? Auto-crit from stealth?
- **Mage:** Spell crits more powerful but spell fumbles more dangerous?
- **Cleric:** Healing crits? Crits against undead are more severe?
- **Ranger:** Crits apply tracking/slowing effects? Crits at range?
- **Bard:** Crits inspire allies (buff)? Fumbles are less severe (graceful recovery)?
- **Psion:** Psionic crits cause confusion/madness? Fumbles backlash psychic damage?

Don't overdesign — just identify 1-2 unique crit interactions per class that feel thematic.

#### F. How Crits Affect the CR Formula

Crits add variance to combat outcomes. Update the CR formula considerations:
- Monster crit chance affects its effective DPR (a monster critting on 19-20 does ~10% more average damage than one critting on 20 only)
- Crit effects (status application, DoT) increase effective DPR beyond just bonus damage
- Crit immunity/resistance increases effective HP (the monster takes fewer devastating hits)
- Fumble immunity increases effective DPR (the monster never wastes a turn)
- The CR formula needs a "crit factor" multiplier

#### G. Display in Combat Logs

Crits and fumbles need to be fully logged at two different detail levels:

**Player-facing combat log / narrator:**
- Show the OUTCOME: what happened narratively ("A devastating blow! Your sword cuts deep, severing a tendon. The Troll's movement is slowed.")
- The combat narrator already exists — crits and fumbles need narrative templates
- Critical hits should feel EXCITING (not just "deals extra damage")
- Fumbles should feel dramatic but not humiliating
- Show the effect name, damage, and any status applied

**Admin combat log (History tab):**
- Show the FULL DECISION CHAIN — how the system determined the outcome:
  - Trigger: what roll triggered the crit/fumble (nat 20, nat 1, expanded range hit)
  - Confirmation roll (if fumbles use confirmation): the second d20 result and whether it confirmed
  - Severity determination: what tier was assigned and WHY (e.g., "attack roll exceeded AC by 8 → Major crit" or "nat 20 + crit range expansion from Keen weapon → Devastating crit")
  - Chart consulted: which crit/fumble chart was used (slashing melee, piercing ranged, spell fire, etc.) and why (weapon type, damage type, spell school)
  - Chart roll: the d12/d20 roll on the crit table and which entry it landed on
  - Effect resolution: the mechanical effect applied (status name, duration, damage multiplier, save DC if any)
  - Save roll (if the effect allows a save): target's save roll, modifiers, DC, pass/fail
  - Final outcome: the complete mechanical result (total damage dealt, status applied with duration, AC change, etc.)
- This data needs to be stored in the round JSONB so it's available for post-hoc analysis
- The admin UI should render this as an expandable detail section under the crit/fumble entry (similar to how attack rolls currently show d20 + modifiers)

This is critical for debugging and balance verification — we need to see WHY a crit one-shot a player or why a fumble cost a monster the fight. Without the decision chain, we can't tell if the charts are working correctly.

### Part 3: The Crit/Fumble Charts

Design the actual charts. Format as tables with:
- Roll range or trigger condition
- Severity tier
- Effect name
- Mechanical effect (damage multiplier, status applied, duration, save DC if any)
- Flavor text for narrator

Create separate charts for:
1. **Melee weapon crits** (by damage type: slashing, piercing, bludgeoning)
2. **Ranged weapon crits** (piercing primarily)
3. **Spell/ability crits** (by school or damage type)
4. **Melee fumbles** (by weapon type)
5. **Ranged fumbles**
6. **Spell/ability fumbles** (by class or school)

Each chart should have at least 8-12 entries with varying severity. The charts should be rollable (d12 or d20 on crit, then consult chart).

### Part 4: Implementation Considerations

Without writing code, outline:
- What new types/interfaces are needed
- What combat engine functions need modification
- What data needs to be added to weapons, spells, abilities, and monsters
- How the crit system interacts with the existing status effect system
- How to ensure crits don't break the auto-resolve tick combat (no player decisions needed)

## OUTPUT

Write the full design doc to `D:\realm_of_crowns\docs\design\critical-hit-fumble-system.md`:

1. Research summary of existing D20 crit/fumble systems (what works, what doesn't)
2. Our crit system design (triggers, severity tiers, effects)
3. Our fumble system design (triggers, severity, confirmation rolls)
4. Monster crit interactions (immunity, resistance, expanded range, monster-specific effects)
5. Class-specific crit interactions
6. CR formula impact
7. The actual crit/fumble charts (melee, ranged, spell — by damage type)
8. Implementation outline
9. Open questions for Tony

Then print a summary to chat highlighting key design decisions that need Tony's input.

---

## DO NOT

- Do not implement anything — design doc only
- Do not modify any code or data
- Do not run simulations
- Do not make the fumble system punishing — it should add excitement, not frustration
- Do not create a system that requires player decisions during auto-resolved combat
- Do not ignore how this affects the CR formula — they're designed together
