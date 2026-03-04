# Design: Combat Rating System for Realm of Crowns

Read `cat CLAUDE.md` before starting.

Read the monster system audit: `cat docs/investigations/monster-system-audit.md`

---

## CONTEXT

We need a Combat Rating (CR) system for our monsters. D&D 5e's CR system is widely acknowledged as inaccurate — it averages offensive and defensive CR in a way that produces misleading ratings. A CR 1 Shadow with STR drain can kill a level 5 party, while a CR 8 T-Rex gets trivialized by ranged attackers.

Our current road encounters are 1v1, but the combat system supports **groups of up to 5 players**, and we'll later introduce **linking groups** (multiple groups joining the same fight). This means the CR system needs to work for:

- 1v1 (solo road encounters, current state)
- 1-5 players vs 1 monster (group encounters)
- 1-5 players vs multiple monsters (group encounters with adds)
- Linked groups (potentially 10+ players vs boss-tier threats)

Our game scales to **level 50** (not 20). We have **7 classes** with distinct combat profiles (warrior is tanky/high-damage, mage is burst/squishy, cleric is sustain/heal, etc.). Monsters need a rating that accurately predicts difficulty across group sizes and class compositions.

## TASK — Design Doc Only

### Part 1: Why D&D's CR System Fails

Research and document the specific flaws in D&D 5e's CR calculation (DMG pp. 273-283). Cover at least:

1. **The offensive/defensive averaging problem** — how averaging hides lethality (a glass cannon and a damage sponge both average to "medium" but play completely differently)
2. **Action economy blindness** — CR doesn't account for monsters that get multiple actions vs parties that get multiple actions
3. **Save-or-suck distortion** — abilities like Banshee's Wail (CR 4, but can instant-kill multiple PCs) aren't properly weighted
4. **Level scaling mismatch** — CR assumes linear scaling but player power curves are exponential (cantrip scaling, Extra Attack, spell slot progression)
5. **Party composition variance** — CR assumes a "standard" party that doesn't exist in practice
6. **Resistance/immunity undervaluation** — damage immunities make some monsters way harder than their CR suggests against certain parties
7. **Any other documented flaws** from the D20 community (search for well-known critiques)

### Part 2: Design Our Combat Rating System

Design a CR system for Realm of Crowns that addresses the above flaws. Consider these principles:

**Our constraints:**
- Groups of 1-5 players vs 1+ monsters (current road encounters are 1v1, but group combat is coming)
- Linked groups can combine multiple parties (potentially 10+ players for boss encounters)
- Auto-resolved (no player tactical decisions during combat — the tick resolver handles it)
- 7 classes with different combat profiles
- Level 1-50 scale
- Monsters will have abilities, damage types, resistances, multi-attack (per the audit)
- We want a CR number that is ACTUALLY PREDICTIVE of difficulty across different group sizes

**Design considerations:**

1. **Effective HP (EHP) instead of raw HP** — Account for AC, resistances, immunities. A monster with 50 HP and AC 18 is much harder than 50 HP and AC 10. A monster immune to physical damage is effectively infinite HP against a non-magical attacker.

2. **Effective DPR (damage per round) instead of raw damage** — Account for hit chance (attack bonus vs expected player AC at that level), multi-attack, on-hit effects, breath weapons, AoE damage.

3. **Lethality scoring** — Save-or-suck abilities (petrification, paralysis, instant death) need a separate lethality component, not just averaged in. A monster that has a 30% chance to one-shot the player is categorically different from one that deals consistent moderate damage.

4. **Rounds-to-kill modeling** — How many rounds does it take the monster to kill an average player of level X? How many rounds does it take that player to kill the monster? The ratio of these two numbers is more predictive than any stat averaging.

5. **Class variance scoring** — A monster might be CR 5 against a warrior but CR 8 against a mage (because the mage has lower AC/HP). Should we:
   - Use a single CR that's the AVERAGE across all 7 classes?
   - Use a single CR that's the MEDIAN?
   - Show a CR range (e.g., "CR 5-8")?
   - Use a single CR with a "variance" indicator?

6. **Group scaling** — How does difficulty change with group size? D&D uses XP multipliers (2 monsters = 1.5x, 3-6 = 2x, etc.) which are crude. Our system should account for:
   - Action economy: 5 players get 5 attacks/round vs 1 monster's 1-3 attacks — even a high-CR monster melts under focus fire
   - HP pooling: a group's combined HP is effectively their shared resource
   - Healer presence: a Cleric in the group dramatically changes survivability
   - Should we rate encounters as "CR X for a solo player, CR X-3 for a full group"?
   - Or should CR stay per-monster and encounter difficulty be calculated separately from the sum of monster CRs vs group strength?

7. **Level-relative vs absolute** — Should CR be absolute (this monster is always CR 7) or relative to the player level? D&D uses absolute. But a "CR 7" monster is a different challenge for a level 7 vs a level 10 character.

8. **Simulatable** — Since we have the batch sim infrastructure, can we COMPUTE the CR by actually simulating fights? For solo: run 1000 fights of each class at each level. For groups: simulate common group compositions (e.g., warrior+cleric, full 5-man balanced party).

9. **Auto-recalculating** — CR must NOT be a manually assigned static number. When a monster's stats, abilities, resistances, or damage change, the CR should update automatically. This means:
   - The formula-based CR estimate updates instantly when monster data changes (no human in the loop)
   - The simulation-based CR can be recomputed on demand (e.g., after a balance pass, run a full CR recalc sweep)
   - If formula CR and sim CR diverge significantly, flag it — the formula needs recalibration
   - Consider: should CR be a stored/cached value that gets recomputed, or computed on-the-fly from monster stats?
   - Consider: should there be a CLI command like `npx ts-node scripts/recalc-cr.ts` that recomputes all monster CRs via simulation and updates the DB?
   - Consider: should the admin dashboard show both "formula CR" and "sim CR" so we can see when they drift?
   - The CR system is only useful if it stays accurate as the game evolves — a stale CR is worse than no CR

**Proposed approach (challenge this if you have a better idea):**

```
Monster CR = The player level at which a SOLO character (average across all 7 classes)
             wins approximately 50% of 1v1 fights against this monster.

Encounter Difficulty = f(sum of monster CRs, group size, group composition, average group level)
```

Keep CR as a per-monster solo rating (simple, simulatable). Build encounter difficulty as a SEPARATE calculation that factors in group size and composition. This way CR stays stable and meaningful — the encounter system handles group scaling.

If the class variance is extreme (warrior wins 90% at level 5 but mage wins 10%), flag it with a "variance" indicator.

### Part 3: The Formula (Calculable Without Simulation)

While simulation gives the ground truth, we also need a **formula** to estimate CR during monster design WITHOUT running sims every time. Design a formula that takes monster stats as input and outputs an estimated CR.

The formula should account for:
- **Effective HP**: `raw_HP * AC_multiplier * resistance_multiplier`
- **Effective DPR**: `per_attack_damage * hit_probability * attacks_per_round + ability_DPR`
- **Lethality**: Save-or-suck abilities weighted by save DC and effect severity
- **Sustain**: Regeneration, self-healing
- **Control**: Stun/paralyze/charm duration and save DC

Provide the actual formula with example calculations for 3-4 existing monsters to validate it produces reasonable results.

### Part 4: CR Tiers and Expected Win Rates

Define what CR means relative to player level:

| Encounter Type | CR vs Player Level | Expected Win Rate | Avg Rounds |
|---|---|---|---|
| Trivial | CR = Level - 5+ | 95%+ | 1-2 |
| Easy | CR = Level - 3 | 85-95% | 2-3 |
| Standard | CR = Level - 1 to Level | 50-70% | 3-5 |
| Hard | CR = Level + 1 to +2 | 30-50% | 4-6 |
| Deadly | CR = Level + 3 to +5 | 10-30% | 5+ (if survived) |
| Impossible | CR = Level + 6+ | <10% | N/A |

Adjust these numbers based on what makes sense for our game. Road encounters should usually be Standard or Easy — players shouldn't die frequently during routine travel.

### Part 5: How CR Integrates With Encounters

Currently `road-encounter.ts` selects monsters by biome + level range for solo encounters. How should the CR system work for both solo and group encounters?

**Solo road encounters (current):**
- Should the encounter selector use CR instead of (or in addition to) monster level?
- How does route danger level factor in? (safe trade routes vs wilderness)
- What's the death rate target? (e.g., "players should die in ~5% of solo road encounters")

**Group encounters (future):**
- How are group encounters triggered? (party travel together?)
- Should groups face single stronger monsters, or multiple weaker ones?
- How do you build an encounter budget for a group? (e.g., "5 level-10 players can handle CR 15 solo monster OR 3x CR 8 monsters")
- Should some monsters ONLY appear as group encounters? (boss-tier threats that would be impossible solo)

**Linked groups (future):**
- Linked groups suggest raid-style content — 10+ players vs a world boss
- These probably need a separate "Raid CR" tier that's explicitly impossible for a single group
- Should raid encounters have different mechanics? (phase transitions, adds, lair effects)

### Part 6: How CR Integrates With Loot/XP

Should monster CR affect rewards?
- XP currently = `5 * monster.level` — should this reference CR instead?
- Should harder monsters (higher CR relative to player) give bonus XP?
- Should loot quality scale with CR?

## OUTPUT

Write the full design doc to `D:\realm_of_crowns\docs\design\combat-rating-system.md`:

1. D&D CR system flaws (with specific examples)
2. Our CR system design (definition, formula, rationale)
3. CR formula with worked examples
4. CR tier definitions with expected win rates
5. Road encounter integration
6. Loot/XP integration
7. Open questions for Tony to decide

Then print a summary to chat highlighting the key design decisions that need Tony's input.

---

## DO NOT

- Do not implement anything — design doc only
- Do not modify any code or data
- Do not run simulations
- Do not finalize balance numbers — focus on the SYSTEM DESIGN
- Do not ignore class variance — this is a key flaw in D&D's CR and we need to address it
