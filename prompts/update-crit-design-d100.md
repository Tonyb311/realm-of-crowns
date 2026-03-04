# Update: Crit/Fumble Design Doc — Switch to d100 Tables

Read `cat CLAUDE.md` before starting.

Read the current design doc: `cat docs/design/critical-hit-fumble-system.md`

---

## TASK

Update the crit/fumble design doc to replace the **margin-over-AC severity system** with a **d100 table roll system**. The current design determines crit severity by how far the attack roll exceeded the target's AC. Replace this with: on any crit trigger, roll d100 on the appropriate chart. The d100 result determines the effect.

### What to Change

#### 1. Severity Determination

**Remove:** Margin-over-AC tiers (0-4 = Minor, 5-9 = Major, 10+ = Devastating)

**Replace with:** d100 roll on the appropriate crit chart, with natural probability weighting:

| d100 Range | Severity | Probability |
|---|---|---|
| 1-50 | Minor | 50% |
| 51-85 | Major | 35% |
| 86-100 | Devastating | 15% |

This means devastating crits are rare and exciting. Every crit is a surprise — a level 50 warrior can still roll a minor crit, and a level 3 rogue can land a devastating one.

#### 2. Modifiers to the d100 Roll

Instead of expanded crit ranges or guaranteed severity tiers, class features and weapon properties ADD or SUBTRACT from the d100 roll, shifting the probability curve:

- **Berserker rage:** +15 to crit table roll (more likely to land major/devastating)
- **Keen weapon property:** +10 to crit table roll
- **Rogue (from stealth/flanking):** +20 to crit table roll
- **Cleric (vs undead):** +10 to crit table roll
- **Psion (psionic crits):** +5 to crit table roll + separate confusion chance
- **Monster crit resistance:** -15 to -30 from attacker's crit table roll (pushes results toward minor)
- **Boss monster expanded crit (when MONSTER crits):** +10 to +20 on their own crit table roll

Modifiers are capped — d100 roll can't go below 1 or above 100 after modifiers.

#### 3. Fumble Tables — Same d100 Approach

On confirmed fumble: roll d100 on the appropriate fumble chart.

| d100 Range | Severity | Probability |
|---|---|---|
| 1-60 | Trivial | 60% (just a miss, maybe flavor text) |
| 61-85 | Minor | 25% (small penalty, 1 round) |
| 86-100 | Moderate | 15% (notable penalty, 1-2 rounds) |

Keep the existing inverse level scaling rule on top of this — level 26+ characters cap their fumble d100 at 60 (can only get trivial results). Level 11-25 cap at 85 (can't get moderate). Level 1-10 roll the full range.

Fumble modifiers:
- **Bard graceful recovery:** -15 from fumble table roll
- **Heavy/unwieldy weapons:** +5 to fumble table roll
- **Light/finesse weapons:** -5 from fumble table roll

#### 4. Expand the Charts to d100

The current charts are d12 with 12 entries per chart. Expand each to d100 with more varied entries. Each chart should have:

- **At least 10 Minor entries** (d100 1-50 range, each covering 5 points)
- **At least 7 Major entries** (d100 51-85 range, each covering 5 points)
- **At least 3 Devastating entries** (d100 86-100 range, each covering 5 points)

Each entry has:
- d100 range
- Effect name
- Severity tier
- Mechanical effect (damage multiplier, status, duration, save DC)
- Narrator flavor text

Expand these charts:
1. Melee crits — slashing
2. Melee crits — piercing
3. Melee crits — bludgeoning
4. Ranged crits
5. Spell crits
6. Melee fumbles
7. Ranged fumbles
8. Spell fumbles

#### 5. Update the Admin Log Decision Chain

The decision chain in the admin combat log now shows:
1. Trigger: nat 20 (or expanded range hit)
2. Chart selected: which d100 chart and why (weapon damage type, spell school)
3. d100 roll: raw result
4. Modifiers applied: list each modifier and source (e.g., "+15 Berserker Rage, +10 Keen Weapon = +25")
5. Modified result: final d100 value after modifiers
6. Entry hit: which chart entry the modified roll landed on (name, severity, range)
7. Effect resolution: mechanical result (damage multiplier, status applied, duration)
8. Save roll (if applicable): target save, DC, pass/fail
9. Final outcome: total damage, status applied, duration

Same for fumbles — show the confirmation roll, d100 roll, level cap applied, modifiers, entry hit, effect.

#### 6. Update CR Formula Impact

The d100 system changes CR formula considerations:
- Monster crit chance still affects effective DPR, but now the EXPECTED crit severity is calculable from the probability distribution (50% minor + 35% major + 15% devastating = weighted average damage multiplier)
- Modifier bonuses shift the distribution — a monster with +20 crit modifier has a different expected severity than one with no modifier
- Crit resistance (-15 to -30) reduces expected severity and thus reduces the monster's effective incoming damage (increases EHP)
- The CR formula should use the EXPECTED value of the d100 distribution, not worst-case

#### 7. Incorporate Tony's Decisions on Open Questions

Apply these decisions throughout the doc:

1. **Crit immunity vs resistance:** Full immunity ONLY for amorphous monsters (Oozes, Slimes — no vital organs). All others use crit resistance (negative modifier to attacker's d100 roll). Constructs like Golems can still be critted (you found a weak joint).

2. **Include fumbles:** YES, with the existing guardrails (confirmation rolls + inverse level scaling + mild effects only).

3. **Severity thresholds:** FIXED d100 ranges (not scaling). The d100 already provides natural variance.

4. **Spell crit trigger:** Target nat 1 on save = spell crit for the caster. Roll d100 on spell crit chart.

5. **Healing crits:** SKIP for now. Can be added later.

6. **Monster crit effects:** Per-individual-monster, stored in their ability data as a field.

7. **Implementation priority:** Alongside monster engine Phase 1 — same combat engine pass.

---

## OUTPUT

Update `docs/design/critical-hit-fumble-system.md` in place. Preserve the research section (Part 1) and any still-relevant design rationale. Replace the margin-over-AC mechanics with d100 tables throughout. Mark the resolved open questions as decided.

Then print a brief summary of what changed.

---

## DO NOT

- Do not implement anything — design doc update only
- Do not modify any code
- Do not reduce the number of chart entries — expand from d12 to d100
- Do not remove the fumble confirmation roll system — it stays
- Do not remove the inverse level scaling for fumbles — it stays
- Do not add healing crits — skipped for now
