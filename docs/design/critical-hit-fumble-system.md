# Critical Hit & Fumble System Design

**Date:** 2026-03-03
**Updated:** 2026-03-03 (v2 -- d100 tables, Tony's decisions applied)
**Status:** Design Doc -- Decisions Finalized
**Scope:** Full crit/fumble chart system for melee, ranged, spells; monster interactions; CR integration
**Prerequisite:** Monster System Audit (`docs/investigations/monster-system-audit.md`), CR System Design (`docs/design/combat-rating-system.md`)

---

## 1. Research Summary: D20 Crit/Fumble Systems

### 1.1 D&D 5e Base

**System:** Nat 20 = auto-hit + double damage dice (not modifiers). Nat 1 = auto-miss, no fumble effect.

| Aspect | Assessment |
|--------|-----------|
| **Fun factor** | Low ceiling. "Roll your dice twice" generates table excitement that the mechanical payoff doesn't match. Rolling double 1s on your crit is a notorious feel-bad. |
| **Combat length** | Minimal impact. Crits average ~50-60% extra damage on one attack in a multi-round fight. |
| **Feel-bad moments** | None from RAW -- nat 1 is just a miss. Groups that add homebrew fumbles create their own feel-bad. |
| **Auto-resolve fit** | Excellent. Pure math, no decisions, instant resolution. |

**Why groups add homebrew:** The emotional spike of rolling a 20 doesn't match the mechanical reward of "an extra d8." Homebrew exists to bridge the excitement-to-payoff gap.

**Our current system mirrors 5e RAW exactly.** Nat 20 = double dice, nat 1 = miss. The crit range expansion mechanic (from class abilities) is already implemented and working.

### 1.2 Pathfinder 2e Degrees of Success

**System:** Four-tier outcomes on every roll. Crit success = beat DC by 10+ (or nat 20 upgrades success to crit). Crit failure = miss DC by 10+ (or nat 1 downgrades failure to crit failure).

**Weapon Critical Specialization Effects:**

| Weapon Group | Crit Effect |
|---|---|
| Sword/Axe | Persistent bleed (1d6/round) |
| Hammer/Flail | Knocked prone |
| Pick | Extra damage ignoring resistance |
| Bow | Speed reduction (-10 ft) |
| Knife | Target flat-footed (AC penalty) |
| Brawling | Slowed |
| Club | Fortitude save or stunned |

**Key insight:** Weapons feel different because they *behave* differently on crits. This is arguably the best weapon differentiation in any D20 system. Players choose weapons based on what they want to happen when they crit.

| Aspect | Assessment |
|--------|-----------|
| **Fun factor** | High. Every crit produces a unique tactical outcome, not just more damage. |
| **Combat length** | Moderate impact. Status effects from crits can chain into faster kills. |
| **Feel-bad moments** | Crit failure on saves can waste high-level spell slots for zero effect. |
| **Auto-resolve fit** | Excellent. Purely mathematical. Threshold comparison + lookup table. |

### 1.3 Popular Homebrew Crit Tables

**Common structure:** Roll on a secondary table (d12 or d20) after confirming a crit. Separate tables per damage type. Three severity tiers are the most popular format:

- **Minor (40% of table):** Bonus damage + minor condition (1 round)
- **Major (40% of table):** Significant damage + lasting condition (2-3 rounds)
- **Severe (20% of table):** Devastating damage + serious consequence

**Best practice from community:** Sterling Vermin's d20 crit tables are widely considered the gold standard for balanced homebrew. The key insight is that a d20 roll on the crit table makes severe effects rare (5% of 5% = 0.25% chance per attack), preventing the system from dominating combat outcomes.

**d100 tables (Rolemaster-derived homebrew):** Some tables use d100 for maximum granularity with weighted probability bands. The 50/35/15 split (minor/major/devastating) is a common and well-tested distribution that keeps devastating results exciting and rare.

**What works:** Damage-type differentiation (slashing = bleeds, bludgeoning = broken bones, piercing = organ damage). Makes weapon choice meaningful.

**What fails:** Fumble tables are almost universally abandoned after 2-3 sessions.

### 1.4 Warhammer Fantasy Roleplay (WFRP)

**System:** When damage exceeds remaining wounds, excess triggers a Critical Wound roll on tables indexed by damage type + hit location. Escalating severity tied to excess damage.

**What makes it memorable:**
1. **Specificity creates narrative.** "Your ear is sliced off" is infinitely more memorable than "8 extra damage."
2. **Consequences persist.** Injuries take weeks to heal or are permanent. Genuine fear of combat.
3. **Damage type matters viscerally.** Sword vs mace vs arrow produces qualitatively different injuries.

| Aspect | Assessment |
|--------|-----------|
| **Fun factor** | Highest narrative quality of any crit system. Every crit tells a specific story. |
| **Combat length** | Increases -- persistent injuries + tracking adds overhead. |
| **Feel-bad moments** | High lethality by design. A bad head crit = instant death. |
| **Auto-resolve fit** | Needs heavy simplification. The richness requires narrative text that auto-resolve must template. |

### 1.5 Rolemaster / MERP

**System:** The most elaborate crit tables ever published. ~25 weapon-specific attack tables, ~15-20 critical strike tables (slash, crush, puncture, heat, cold, electricity, etc.), severity levels A-E, d100 rolls producing ~7,500-10,000 possible outcomes.

**Key insight:** Unmatched variety -- players almost never see the same critical result twice. But resolution takes 1-3 minutes per attack at a physical table. In software, the lookup overhead is trivial. **The d100 system is perfectly suited to auto-resolved digital combat.**

| Aspect | Assessment |
|--------|-----------|
| **Fun factor** | Legendary. Rolemaster crit tables are considered the best-written combat text in TTRPG history. |
| **Combat length** | Massively increased at table. Trivial in software. |
| **Feel-bad moments** | Open-ended d100 can instant-kill any character. |
| **Auto-resolve fit** | Excellent for software (every step is deterministic lookup). The complexity that kills table play is free for computers. |

### 1.6 Video Game Adaptations

**Baldur's Gate 3:** 5e RAW crits + visual/audio spectacle. Tested fumble effects in Early Access, **removed them based on player feedback.** Key lesson: in digital games, **presentation compensates for mechanical simplicity.**

**Pathfinder: Kingmaker/WotR:** PF1e crits with confirmation rolls, fully automated. Players never see failed confirmations as separate rolls -- the game just reports the outcome. Crit-fishing builds (keen + Improved Critical = 15-20 threat range) are extremely popular.

**Pillars of Eternity:** Hit/graze/miss/crit degrees of success. Crits = 130% damage + weapon enchantment effects. Demonstrates degrees of success work excellently in CRPGs.

**Darkest Dungeon:** Crits provide **stress healing** to attacker and **stress damage** to target. Crits interact with systems beyond HP. Valuable design insight for our system.

### 1.7 Research Synthesis

**Adopt:**
- Rolemaster-inspired d100 crit charts with weighted probability bands (50% minor, 35% major, 15% devastating)
- Damage-type-specific crit effects (WFRP/Rolemaster principle -- slashing/piercing/bludgeoning produce different outcomes)
- d100 modifiers from class features, weapon properties, and monster traits to shift the probability curve
- Presentation over complexity (BG3 lesson -- excellent narration makes simple mechanics feel impactful)

**Avoid:**
- Margin-over-AC severity determination (too predictable -- high-level characters always get devastating crits against weaker enemies)
- Fumble tables that penalize martial classes (mathematically unsolvable without anti-fun workarounds)
- Instant-death crits (frustrating in 1v1 auto-resolve where a round-1 kill wastes the entire fight)
- Full crit immunity on most monster types (silently invalidates player builds -- use d100 modifier resistance instead)

---

## 2. Critical Hit System Design

### 2.1 Crit Trigger

**Baseline:** Nat 20 always crits (unchanged from current system).

**Expanded crit range (unchanged):** The existing `critThreshold = 20 - Math.floor(critBonus / 5)` system continues to work. Class abilities (Assassin Backstab, Sharpshooter Headshot, etc.) expand the crit range as before.

**On any crit trigger → roll d100 on the appropriate chart.**

### 2.2 d100 Severity Determination

When a crit triggers (nat 20 or expanded range hit), roll d100 on the chart matching the weapon's damage type. The raw d100 result determines severity:

| d100 Range | Severity | Probability | Damage Bonus | Narrator Treatment |
|---|---|---|---|---|
| **1-50** | Minor | 50% | 2x weapon dice + 1 bonus die | Exciting but brief |
| **51-85** | Major | 35% | 2x weapon dice + 2 bonus dice | Dramatic and impactful |
| **86-100** | Devastating | 15% | 3x weapon dice | Epic, memorable moment |

**Why d100 instead of margin-over-AC:**
- Every crit is a surprise. A level 50 warrior can still roll a minor crit (hit solidly but nothing special). A level 3 rogue can land a devastating one (pure luck).
- The probability distribution is fixed and testable -- 50/35/15 is the same at all levels.
- Modifiers from class features and weapon properties shift the curve without changing the fundamental mechanic.
- No dependency on the target's AC, which avoids the problem of high-attack characters always devastating low-AC targets.

**Bonus dice** use the weapon's die type. A longsword (1d8) Minor Crit = 2d8 + 1d8 + modifier. A greataxe (1d12) Devastating Crit = 3d12 + modifier.

### 2.3 d100 Modifiers

Class features, weapon properties, and situational bonuses ADD or SUBTRACT from the d100 roll, shifting the probability curve toward better or worse results:

| Source | Modifier | Effect |
|--------|----------|--------|
| **Berserker Rage** | +15 | Raging crits are more devastating |
| **Keen weapon property** | +10 | Sharp weapons cut deeper on crits |
| **Rogue (from stealth)** | +20 | Precision strikes from hiding are lethal |
| **Cleric (vs undead)** | +10 | Divine wrath against the unholy |
| **Psion (psionic crits)** | +5 | Psychic precision + separate confusion chance |
| **Evoker (spell crits)** | +10 | Raw magical power overflows |
| **Bard Exploit Weakness** | +15 | Lorekeeper analysis reveals weak points |
| **Boss monster critting** | +10 to +20 | Boss monsters crit harder |
| **Monster crit resistance** | -15 to -30 | Pushes results toward minor (see Section 5) |
| **Crit immune monster** | N/A | Crit is negated entirely (amorphous only) |

**Hard cap:** Modified d100 can't go below 1 or above 100.

**Example:** A Berserker (+15 rage) with a Keen longsword (+10) crits. They roll d100 = 42. Modified = 42 + 15 + 10 = 67 → Major Crit. Without modifiers, that 42 would have been Minor. The rage + keen weapon pushed them into the Major band.

**Example:** A Rogue attacking from stealth (+20) crits with a dagger. Roll d100 = 71. Modified = 71 + 20 = 91 → Devastating Crit. The stealth bonus turned a Major into a Devastating.

### 2.4 Weapon/Damage Type Determines Crit Chart

When a crit occurs, the weapon's `damageType` field determines which d100 chart is consulted:

| Damage Type | Crit Chart | Thematic Effects |
|-------------|-----------|-----------------|
| **SLASHING** | Slashing Melee | Bleeding, severed tendons, deep wounds |
| **PIERCING** | Piercing Melee | Vital strikes, pinning, punctured organs |
| **BLUDGEONING** | Bludgeoning Melee | Stagger, concussion, shattered armor |
| **PIERCING (ranged)** | Ranged | Ranged-specific flavor (shots, arrows, bolts) |
| **FORCE/ARCANE/FIRE/etc.** | Spell/Magical | Extended duration, bypass resistance, secondary effects |

This leverages our existing `damageType` field on weapons (already populated in starter weapons and recipes: SLASHING, PIERCING, BLUDGEONING, FORCE).

### 2.5 Crit Effect Duration & Auto-Resolve Compatibility

All crit effects must resolve without player decisions. Effects fall into these categories:

| Category | Examples | Auto-Resolve Rule |
|----------|---------|-------------------|
| **Bonus Damage** | Extra dice, damage multiplier | Applied immediately to the attack |
| **DoT (Damage over Time)** | Bleeding 1d4/round for 3 rounds | Status effect, ticks automatically |
| **Debuff** | -2 AC for 2 rounds, speed halved | Status effect with duration countdown |
| **Action Loss** | Staggered (lose next attack) | Skip next attack action |
| **Stat Reduction** | -2 to attack rolls for 3 rounds | Temporary modifier, auto-expires |

**Hard rule:** No crit effect lasts longer than 3 rounds. This prevents crits from dominating multi-round combats. The excitement is in the moment, not in tracking long debuffs.

**Hard rule:** No crit effect is permanent within a single combat. Narrative descriptions can reference "scars" and "broken bones" for flavor, but mechanically everything resets after combat ends.

---

## 3. Fumble System Design

### 3.1 Fumbles: INCLUDED

**Decision (Tony):** Fumbles are included with the existing guardrails: confirmation rolls, inverse level scaling, mild effects only. Both players and monsters can fumble.

### 3.2 Fumble Trigger: Confirmation Roll System

**Trigger:** Nat 1 on an attack roll.

**Confirmation:** Roll a second d20 + attack modifier against the target's AC.
- If the confirmation roll **hits** (would have hit the target): The nat 1 is just a normal miss. No fumble. The skilled fighter "recovers" from the bad roll.
- If the confirmation roll **misses**: Fumble confirmed. Roll d100 on the fumble chart.

**Why confirmation rolls:**
1. **Skilled characters fumble less.** A level 30 warrior with +15 to hit confirms away most fumbles against standard-AC targets. A level 1 character with +3 confirms away fewer.
2. **Reduces effective fumble rate.** Instead of 5% per attack, effective fumble rate becomes 5% * (miss chance on confirmation). Against AC 15 with +8: 5% * 30% = 1.5%.
3. **Partially solves the "fighters fumble more" problem.** High-level fighters have high attack bonuses, so their confirmation rolls succeed more often. They fumble less often than low-level characters despite attacking more.
4. **Transparent in auto-resolve.** The system runs both rolls and reports the outcome. No player decision needed.

### 3.3 Fumble d100 Severity Bands

On confirmed fumble, roll d100:

| d100 Range | Severity | Probability | Effect Scope |
|---|---|---|---|
| **1-60** | Trivial | 60% | Just a miss, maybe flavor text |
| **61-85** | Minor | 25% | Small penalty, 1 round |
| **86-100** | Moderate | 15% | Notable penalty, 1-2 rounds |

### 3.4 Inverse Level Scaling (d100 Cap)

Higher-level characters have their fumble d100 result **capped**, preventing them from reaching severe outcomes:

| Character Level | d100 Cap | Max Reachable Severity | Rationale |
|----------------|----------|----------------------|-----------|
| 1-10 | 100 (no cap) | Moderate | Learning fighters make real mistakes |
| 11-25 | 85 | Minor | Experienced fighters barely stumble |
| 26-50 | 60 | Trivial | Masters never truly fumble |

**Implementation:** After rolling d100, apply `Math.min(roll, levelCap)`. A level 30 warrior who rolls 92 gets capped to 60 → Trivial result.

### 3.5 Fumble d100 Modifiers

| Source | Modifier | Effect |
|--------|----------|--------|
| **Bard Graceful Recovery** | -15 | Bards recover gracefully from mistakes |
| **Heavy/unwieldy weapons** | +5 | Harder to recover from a bad swing with a greataxe |
| **Light/finesse weapons** | -5 | Easier to recover with nimble weapons |
| **Psion (spell fumble)** | Special | Psychic backlash replaces standard fumble (10% self-damage) |
| **Mage (spell fumble)** | +10 | Volatile magic -- fumbles are riskier (high risk/high reward) |

**Modifier applied BEFORE level cap.** Roll d100, add/subtract modifiers, then cap by level. A level 30 Bard rolling 55 with -15 Graceful Recovery = 40 → already trivial. A level 5 Mage rolling 78 with +10 volatile magic = 88 → Moderate.

### 3.6 Fumble Effects Design Principles

Fumble effects are **interesting, not punishing.** No effect costs more than 1 round of action economy. No effect permanently damages equipment. No "hit your ally" effects in 1v1 (reserved for future group combat). No "drop your weapon" effects.

### 3.7 Monster Fumbles

- Standard monsters fumble with the same confirmation roll system as players
- Elite monsters (CR 15+) get +5 to fumble confirmation rolls (harder to confirm fumbles against them)
- Boss monsters (CR 20+) are **fumble immune**
- Monster fumble d100 is capped at 85 (Minor maximum -- monsters don't have the narrative investment of a player character)

### 3.8 Group Combat Fumble Scaling (Future)

In 5v1, five attackers with 5% nat-1 chance each = ~23% chance someone fumbles per round. With confirmation rolls this drops to ~7-10%, which is acceptable. No additional scaling needed for group combat beyond the confirmation roll system.

---

## 4. Spell/Ability Crits

### 4.1 Attack Roll Abilities

Abilities that make attack rolls (most damage abilities in `handleDamage`) use the same d100 crit system as weapon attacks:
- Nat 20 (or expanded crit range hit) triggers a crit
- Roll d100 on the **Spell/Magical** crit chart (not weapon damage type chart)
- Apply class modifiers to d100 (Evoker +10, etc.)
- Ability dice are doubled on crit (already implemented)

### 4.2 Save-Based Abilities

**Decision (Tony):** Target rolls nat 1 on saving throw = "Spell Critical" for the caster.

Abilities that force saving throws do NOT crit in the traditional sense. Instead:

**Target rolls nat 1 on saving throw = "Spell Critical":**
- Full damage (no save reduction) + roll d100 on the Spell Crit chart for a bonus effect
- This is equivalent to "the spell lands perfectly"
- The caster doesn't "crit" -- the *target* critically fails their save

**Why nat 1 on save, not a caster roll:** Save-based abilities don't have an attack roll to crit with. Using the target's save roll as the trigger keeps the system consistent (d20 extremes produce special outcomes) without adding new roll types.

### 4.3 Spell Crit Effects

The Spell/Magical d100 chart covers all spell crit effects. See Section 9.5 for the full chart. General categories:

| Effect | Application | Notes |
|--------|------------|-------|
| **Extended Duration** | Debuff lasts +1 round | For duration-based effects |
| **Amplified Effect** | +50% damage | For instant-effect abilities |
| **Bypass Resistance** | Ignore target's damage resistance for this effect | When damage types are implemented |
| **Secondary Effect** | Apply a minor debuff alongside the primary effect | E.g., Fireball crit = damage + 1-round burning DoT |

### 4.4 Healing Crits

**Decision (Tony):** SKIPPED for initial implementation. Can be added later after the core crit system is proven in production.

### 4.5 Buff/Debuff Crits

**Buff crit:** Not implemented (skip for now alongside healing crits).

**Debuff crit (save-based):** Target nat 1 on save = roll d100 on Spell Crit chart. If the debuff has a "save each round to end" mechanic, the first save automatically fails on a devastating result.

---

## 5. Monster Crit Interactions

### 5.1 Crit Immunity (Amorphous Monsters Only)

**Decision (Tony):** Full crit immunity ONLY for truly amorphous monsters that lack any anatomy or weak points.

| Monster | Crit Immune? | Rationale |
|---------|-------------|-----------|
| Slime | Yes | No anatomy whatsoever -- amorphous blob |
| Mana Wisp | Yes | Incorporeal magical energy, no physical form |
| All others | No | Even Golems have weak joints; even Elementals have a core |

**Implementation:** Boolean `critImmune` flag on monster data. When true, all crits against this monster become normal hits (standard double dice damage, no d100 chart roll, no status effect).

**Maximum 2-3 monsters with full immunity** across the entire roster.

### 5.2 Crit Resistance (d100 Modifier)

Most "tough" monsters use crit resistance instead of immunity. This applies a **negative modifier** to the attacker's d100 crit chart roll, pushing results toward Minor severity:

| Monster Type | d100 Modifier | Examples | Rationale |
|---|---|---|---|
| Heavily armored | -15 | Ancient Golem, Skeleton Warrior | Armor deflects the worst of critical blows |
| Large creatures | -15 | Young Dragon, Troll | Sheer mass makes precise strikes less impactful |
| Undead | -10 | Shadow Wraith, Bog Wraith | No vital organs to critically wound |
| Elemental | -20 | Arcane Elemental | Mostly formless, hard to find weak points |
| Boss-tier | -20 to -30 | Lich, Demon Lord, Ancient Dragon | Boss durability against player crits |

**The attacker still crits** -- they still get double dice and a chart roll. But the modified d100 is more likely to land in the Minor band. A Rogue attacking from stealth (+20) against a crit-resistant boss (-20) nets +0 -- they roll the chart at base probabilities. This creates interesting counterplay.

### 5.3 Expanded Crit Range for Monsters

Elite and boss monsters can crit on expanded ranges, increasing their threat level:

| Monster Tier | Crit Range | Examples |
|---|---|---|
| Standard (most monsters) | 20 only | Goblin, Wolf, Bandit |
| Elite (mid-tier threats) | 19-20 | Orc Warrior, Shadow Wraith, Void Stalker |
| Boss (major threats) | 18-20 | Young Dragon, Lich, Demon Lord |

**Implementation:** `critRange` field on monster data (default 20). The combat engine already supports expanded crit ranges via the `critBonus` mechanic -- monsters just need the equivalent field.

### 5.4 Monster Crit d100 Modifier (When Monster Crits)

When a monster crits, it rolls d100 on the crit chart with a bonus based on its tier:

| Monster Tier | d100 Modifier | Effect |
|---|---|---|
| Standard | +0 | Standard probability distribution |
| Elite | +10 | More likely to land Major/Devastating |
| Boss | +20 | Significantly more likely to devastate |

### 5.5 Monster-Specific Crit Effects

**Decision (Tony):** Per-individual-monster, stored in their ability data as a field.

When a monster crits, instead of (or in addition to) consulting the standard crit chart, it can trigger a **monster-specific crit effect** defined in its ability data:

| Monster | Crit Effect | Mechanical |
|---------|-------------|-----------|
| Wolf | Knockdown | Target prone (-2 AC for 1 round) |
| Giant Spider | Venomous Bite | Poison DoT (1d4/round, 3 rounds) |
| Troll | Savage Rend | Bleeding (1d6/round, 2 rounds) + healing reduction |
| Young Dragon | Tail Sweep | Knockback (skip next attack) + 1d6 bludgeoning |
| Shadow Wraith | Soul Touch | -2 to all saves for 2 rounds |
| Demon Lord | Hellfire Surge | Burning DoT (2d6/round, 2 rounds) ignoring resistance |

**Implementation:** Optional `critEffect` object on monster ability data containing: effect name, status to apply, duration, damage, save DC. Falls back to standard damage-type chart if no monster-specific effect is defined.

### 5.6 Monster Fumble Rules

- Standard monsters fumble with the same confirmation roll + d100 system as players
- Elite monsters (CR 15+) get +5 to fumble confirmation rolls (harder to confirm fumbles)
- Boss monsters (CR 20+) are fumble immune
- Monster fumble d100 is capped at 85 (Minor maximum)

---

## 6. Class-Specific Crit Interactions

Each class gets 1-2 unique crit interactions expressed as **d100 modifiers** and/or **special triggered effects.** These supplement (not replace) the standard d100 crit system.

### 6.1 Warrior

| Specialization | Interaction | d100 Modifier | Additional Effect |
|---|---|---|---|
| **Berserker** | **Rage Crit** | +15 to crit d100 while Raging | Thematic: berserker fury drives more devastating crits |
| **Warlord** | **Commanding Blow** | +0 | Crit grants +2 attack to self next round (allies in group combat) |

### 6.2 Rogue

| Specialization | Interaction | d100 Modifier | Additional Effect |
|---|---|---|---|
| **Assassin** | **Lethal Precision** | +20 from stealth/flanking | All Sneak Attack dice doubled on crit (already works). Plus crits always apply 1-round "Exposed" debuff (-2 AC) |
| **Shadow** | **Vanishing Strike** | +0 | Crit grants temporary stealth for 1 round |

### 6.3 Mage

| Specialization | Interaction | d100 Modifier | Additional Effect |
|---|---|---|---|
| **Evoker** | **Arcane Surge** | +10 to spell crit d100 | Raw magical power overflows |
| **Any Mage** | **Volatile Magic** | +10 to spell crit d100, +10 to spell fumble d100 | High risk, high reward -- crits are better but fumbles are worse |

### 6.4 Cleric

| Specialization | Interaction | d100 Modifier | Additional Effect |
|---|---|---|---|
| **Any Cleric** | **Divine Judgment** | +10 vs undead monsters | Holy wrath against the unholy |
| **Any Cleric** | **Blessed Healer** | -- | (Reserved for future healing crit system) |

### 6.5 Ranger

| Specialization | Interaction | d100 Modifier | Additional Effect |
|---|---|---|---|
| **Sharpshooter** | **Called Shot** | Uses existing `critBonus: 20` (crits on 16+). | Sharpshooter crits apply 1-round "Marked" debuff (next attack against target has advantage) |
| **Tracker** | **First Strike Crit** | +0 (auto-crit on first attack at level 40) | First attack auto-crits, rolls d100 normally |

### 6.6 Bard

| Specialization | Interaction | d100 Modifier | Additional Effect |
|---|---|---|---|
| **Any Bard** | **Graceful Recovery** | -15 to fumble d100 | Bards rarely suffer real fumbles |
| **Lorekeeper** | **Exploit Weakness** | +15 to crit d100 (requires Analyze) | When Exploit Weakness crits, applies 2-round "Analyzed" debuff (-2 AC, -1 saves) |

### 6.7 Psion

| Specialization | Interaction | d100 Modifier | Additional Effect |
|---|---|---|---|
| **Any Psion** | **Mind Shatter** | +5 to crit d100 | Psionic crits always apply 1-round "Confused" status (-25% next ability effectiveness) |
| **Any Psion** | **Psychic Backlash** | Special | Psion fumbles deal psychic backlash (10% of intended damage to self) instead of rolling fumble chart |

---

## 7. How Crits Affect the CR Formula

### 7.1 Expected Crit Severity (d100 Distribution)

The d100 system produces a calculable expected severity for any given modifier set:

**Base distribution (no modifiers):**
```
E[severity] = 0.50 * Minor + 0.35 * Major + 0.15 * Devastating

Where Minor bonus ≈ +50% damage, Major ≈ +100%, Devastating ≈ +200%:
E[bonus_damage_ratio] = 0.50*0.50 + 0.35*1.00 + 0.15*2.00
                      = 0.25 + 0.35 + 0.30
                      = 0.90 (average +90% bonus damage per crit)
```

**With modifiers, the bands shift.** For a +20 modifier, the effective distribution becomes:

| Modified Range | Severity | Effective Probability |
|---|---|---|
| 1-30 (was 1-50) | Minor | 30% |
| 31-65 (was 51-85) | Major | 35% |
| 66-100 (was 86-100) | Devastating | 35% |

```
E[bonus_damage_ratio] = 0.30*0.50 + 0.35*1.00 + 0.35*2.00
                      = 0.15 + 0.35 + 0.70
                      = 1.20 (average +120% bonus damage per crit)
```

### 7.2 Crit Factor in EDPR (Effective Damage Per Round)

```
EDPR_crit = base_EDPR * (1 + crit_chance * E[bonus_damage_ratio])

crit_chance = (21 - critThreshold) / 20
  - Standard (20 only): 5%
  - 19-20: 10%
  - 18-20: 15%
```

**Approximate crit multipliers for CR calculation:**

| Crit Range | d100 Modifier | E[bonus] | EDPR Multiplier |
|---|---|---|---|
| 20 only | +0 | 0.90 | 1.045 (+4.5%) |
| 20 only | +20 (boss) | 1.20 | 1.060 (+6.0%) |
| 19-20 | +0 | 0.90 | 1.090 (+9.0%) |
| 19-20 | +10 (elite) | 1.05 | 1.105 (+10.5%) |
| 18-20 | +0 | 0.90 | 1.135 (+13.5%) |
| 18-20 | +20 (boss) | 1.20 | 1.180 (+18.0%) |

### 7.3 Crit Status Effects in EDPR

Crit status effects (bleeding DoT, AC reduction, action loss) contribute additional effective damage beyond the bonus dice:

```
status_DPR = P(crit) * P(chart_entry_produces_status) * avg_status_damage_equivalent

Approximate: +2-3% on top of the bonus damage calculation.
For CR formula, use a flat +2% adder for any monster with status-producing crits.
```

### 7.4 Crit Resistance in EHP

Monster crit resistance (negative d100 modifier) reduces expected incoming crit severity:

```
With -20 modifier, attacker's effective distribution:
  Minor: 70% (was 50%)
  Major: 25% (was 35%)
  Devastating: 5% (was 15%)

E[bonus_damage_ratio] = 0.70*0.50 + 0.25*1.00 + 0.05*2.00 = 0.70

Compared to base 0.90, this is a 22% reduction in crit bonus damage.
On a 5% crit chance: EHP multiplier ≈ 1.01 (≈1% effective HP increase)
```

Crit resistance is a mild EHP boost -- it's primarily a narrative/feel feature, not a major balance lever.

### 7.5 Crit Immunity in EHP

```
Crit immune: All crits become normal hits (no bonus dice, no chart effects)
EHP multiplier ≈ 1.045 (negates the ~4.5% EDPR increase from crits)
```

### 7.6 Fumble Immunity in EDPR

```
With confirmation rolls, effective fumble rate ≈ 1.5%
Average fumble cost ≈ 0.5 rounds of DPR
fumble_immune_multiplier ≈ 1.0075 (~0.75% EDPR increase)
```

Negligible. Fumble immunity is a narrative feature, not a balance lever.

### 7.7 Summary: CR Formula Adjustments

| Monster Property | CR Component | Adjustment |
|---|---|---|
| Expanded crit range (19-20) + no modifier | EDPR | +9% |
| Expanded crit range (18-20) + boss modifier (+20) | EDPR | +18% |
| Monster-specific crit effect | EDPR | +2-3% |
| Crit resistant (-20) | EHP | +1% |
| Crit immune | EHP | +4.5% |
| Fumble immune | EDPR | +0.75% (negligible) |

---

## 8. Combat Log Display

### 8.1 Player-Facing Narrator

Crits and fumbles need dedicated narrator templates that convey the drama. The narrator system already supports crit-specific templates (26 class-specific crit templates exist).

**New template categories needed:**

| Category | Example Templates |
|----------|------------------|
| **Minor Crit (generic)** | "{attacker} finds an opening and lands a solid blow on {target}!" |
| **Major Crit (generic)** | "{attacker} delivers a devastating strike that staggers {target}!" |
| **Devastating Crit (generic)** | "{attacker} unleashes a legendary blow -- {target} reels from the impact!" |
| **Slashing Crit Effect** | "The blade bites deep, opening a bleeding wound on {target}!" |
| **Piercing Crit Effect** | "The point drives into a vital area -- {target} gasps in pain!" |
| **Bludgeoning Crit Effect** | "A bone-crushing impact -- {target} is sent staggering!" |
| **Fumble (melee)** | "{attacker} overextends and stumbles, momentarily off-balance." |
| **Fumble (ranged)** | "{attacker}'s shot goes wide, the arrow disappearing harmlessly." |
| **Fumble (spell)** | "{attacker}'s spell fizzles in a flash of unstable energy." |
| **Monster Crit** | "The {monster} finds a devastating opening!" |
| **Monster Fumble** | "The {monster} overreaches and leaves itself open!" |

**Key principle:** Crits should feel EXCITING. Fumbles should feel DRAMATIC but not HUMILIATING. "Stumbles momentarily" not "falls flat on face and drops weapon."

### 8.2 Admin Combat Log (History Tab)

The admin History tab must show the **full decision chain** for every crit/fumble. This is critical for debugging and balance verification.

**Crit Decision Chain (stored in round JSONB):**

```typescript
critData?: {
  // 1. Trigger
  trigger: 'nat20' | 'expanded_range' | 'first_strike' | 'spell_crit_fail';
  triggerSource?: string;  // e.g., "Assassin Backstab critBonus:10"

  // 2. Chart selected
  chartType: 'slashing' | 'piercing' | 'bludgeoning' | 'ranged' | 'spell';
  chartReason: string;     // e.g., "Weapon damageType: SLASHING"

  // 3. d100 roll
  rawD100: number;         // unmodified d100 result

  // 4. Modifiers applied
  modifiers: Array<{ source: string; value: number }>;
  // e.g., [{ source: 'Berserker Rage', value: 15 }, { source: 'Keen Weapon', value: 10 }]

  // 5. Modified result
  modifiedD100: number;    // clamped 1-100 after modifiers
  severity: 'minor' | 'major' | 'devastating';

  // 6. Entry hit
  chartEntryRange: string; // e.g., "67-71"
  chartEntryName: string;  // e.g., "Bleeding Wound"

  // 7. Effect resolution
  bonusDice: number;
  bonusDamage: number;
  statusApplied?: string;
  statusDuration?: number;
  saveDC?: number;
  saveRoll?: number;
  savePassed?: boolean;

  // 8. Final outcome
  totalCritDamage: number;
  effectSummary: string;   // human-readable summary
};
```

**Fumble Decision Chain:**

```typescript
fumbleData?: {
  // 1. Trigger
  trigger: 'nat1';

  // 2. Confirmation roll
  confirmationRoll: number;    // second d20
  confirmationTotal: number;   // d20 + attack modifier
  confirmationAC: number;      // target AC
  confirmed: boolean;          // did the fumble confirm?

  // 3. d100 roll (if confirmed)
  rawD100?: number;
  modifiers?: Array<{ source: string; value: number }>;
  modifiedD100?: number;

  // 4. Level cap
  characterLevel?: number;
  levelCap?: number;           // 100, 85, or 60
  cappedD100?: number;         // min(modifiedD100, levelCap)

  // 5. Entry hit
  severity?: 'trivial' | 'minor' | 'moderate';
  chartType?: 'melee' | 'ranged' | 'spell';
  chartEntryRange?: string;
  chartEntryName?: string;

  // 6. Resolution
  effectApplied?: string;
  duration?: number;
};
```

**Frontend:** Render as expandable detail sections under the crit/fumble log entry, similar to how attack rolls currently show d20 + modifiers. Show a colored severity badge (green/yellow/red for Minor/Major/Devastating crits, gray/yellow for Minor/Moderate fumbles). Show the d100 roll prominently with modifier breakdown.

---

## 9. The Crit/Fumble Charts (d100)

### 9.1 Melee Weapon Crits -- Slashing

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-05 | Minor | Clean Cut | +1 bonus die | "A clean strike draws blood!" |
| 06-10 | Minor | Stinging Slash | +1 bonus die, -1 attack for 1 round | "The blade stings -- {target} flinches!" |
| 11-15 | Minor | Shallow Wound | +1 bonus die, 1d4 bleed for 1 round | "A shallow gash opens, blood welling forth." |
| 16-20 | Minor | Glancing Slice | +1 bonus die, -1 AC for 1 round | "The blade catches armor straps -- {target}'s guard drops." |
| 21-25 | Minor | Tendon Nick | +1 bonus die, -1 saves for 1 round | "A quick slash nicks a tendon -- {target} grimaces." |
| 26-30 | Minor | Forceful Slash | +2 bonus dice | "A powerful cut lands with authority!" |
| 31-35 | Minor | Razor Edge | +1 bonus die, 1d4 bleed for 1 round, -1 attack for 1 round | "The razor-sharp edge bites into flesh and sinew!" |
| 36-40 | Minor | Scored Armor | +1 bonus die, -1 AC for 2 rounds | "The blade scores across armor, weakening its protection." |
| 41-45 | Minor | Flesh Wound | +2 bonus dice, 1d4 bleed for 1 round | "A messy flesh wound -- painful but not crippling." |
| 46-50 | Minor | Slicing Arc | +2 bonus dice, -1 AC for 1 round | "A wide arc of the blade catches {target} across the torso!" |
| 51-55 | Major | Bleeding Wound | +2 bonus dice, 1d6 bleed for 2 rounds | "The blade opens a deep wound that bleeds freely!" |
| 56-60 | Major | Hamstring | +2 bonus dice, -2 AC for 2 rounds | "A vicious cut to the leg -- {target} struggles to maintain footing!" |
| 61-65 | Major | Muscle Tear | +2 bonus dice, -2 attack for 2 rounds | "The blade tears through muscle -- {target}'s strikes weaken!" |
| 66-70 | Major | Armor Breach | +2 bonus dice, -3 AC for 2 rounds | "The blade finds a gap and tears through armor!" |
| 71-75 | Major | Deep Gash | +3 bonus dice, 1d6 bleed for 2 rounds | "A devastating cut opens {target} to the bone!" |
| 76-80 | Major | Arterial Cut | +2 bonus dice, 2d4 bleed for 2 rounds | "An arterial cut -- blood sprays with every heartbeat!" |
| 81-85 | Major | Disabling Slash | +3 bonus dice, -2 attack for 2 rounds, -1 AC for 2 rounds | "A disabling slash across the weapon arm -- {target} can barely grip their weapon!" |
| 86-90 | Devastating | Savage Rend | +3 bonus dice, 2d4 bleed for 3 rounds, -2 AC for 2 rounds | "The blade tears a savage wound -- blood pours freely!" |
| 91-95 | Devastating | Crippling Strike | +4 bonus dice, 1d6 bleed for 3 rounds, -2 attack for 3 rounds | "A crippling slash -- {target} staggers, nearly cut in two!" |
| 96-100 | Devastating | Severing Strike | +4 bonus dice, 2d6 bleed for 3 rounds, -2 attack for 2 rounds, -2 AC for 2 rounds | "A monstrous blow nearly cleaves through -- {target} reels in agony!" |

### 9.2 Melee Weapon Crits -- Piercing

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-05 | Minor | Precise Thrust | +1 bonus die | "A precise strike finds its mark!" |
| 06-10 | Minor | Quick Jab | +1 bonus die, -1 attack for 1 round | "A quick jab catches {target} off-guard!" |
| 11-15 | Minor | Shallow Puncture | +1 bonus die, 1d4 bleed for 1 round | "The point drives in and withdraws, leaving a puncture wound." |
| 16-20 | Minor | Nerve Strike | +1 bonus die, -1 saves for 1 round | "The thrust grazes a nerve cluster -- {target} shudders." |
| 21-25 | Minor | Disorienting Stab | +1 bonus die, -1 AC for 1 round | "A sharp thrust disrupts {target}'s stance!" |
| 26-30 | Minor | Driving Point | +2 bonus dice | "The weapon drives deep with lethal precision!" |
| 31-35 | Minor | Exposed Flank | +1 bonus die, -1 AC for 2 rounds | "The thrust finds a gap between plates -- the flank is exposed!" |
| 36-40 | Minor | Piercing Pain | +1 bonus die, -1 attack for 1 round, -1 saves for 1 round | "Lancing pain shoots through {target}'s body!" |
| 41-45 | Minor | Deep Prick | +2 bonus dice, 1d4 bleed for 1 round | "The point sinks deep before withdrawing -- blood follows." |
| 46-50 | Minor | Rattling Thrust | +2 bonus dice, -1 attack for 1 round | "A rattling thrust that shakes {target}'s confidence!" |
| 51-55 | Major | Vital Strike | +3 bonus dice | "The point finds a vital area -- devastating!" |
| 56-60 | Major | Pinning Wound | +2 bonus dice, target loses next attack | "The weapon pins {target} -- they struggle to pull free!" |
| 61-65 | Major | Organ Graze | +2 bonus dice, -2 attack for 2 rounds | "The point grazes something vital -- {target} pales!" |
| 66-70 | Major | Deep Puncture | +2 bonus dice, 1d6 bleed for 2 rounds, -1 AC for 1 round | "A deep thrust punches through -- blood flows freely!" |
| 71-75 | Major | Tendon Pierce | +3 bonus dice, -2 AC for 2 rounds | "The point drives through a tendon -- {target}'s defense falters!" |
| 76-80 | Major | Gut Wound | +2 bonus dice, 2d4 bleed for 2 rounds | "A gut wound -- {target} doubles over as blood wells!" |
| 81-85 | Major | Crippling Stab | +3 bonus dice, -2 attack for 2 rounds, -1 saves for 2 rounds | "A crippling stab to a joint -- {target} can barely move!" |
| 86-90 | Devastating | Transfixed | +3 bonus dice, target loses next attack, -2 AC for 2 rounds | "The weapon drives clean through -- {target} is transfixed in place!" |
| 91-95 | Devastating | Impaled | +4 bonus dice, 1d6 bleed for 3 rounds, target loses next attack | "Impaled! {target} is run through and pinned in agony!" |
| 96-100 | Devastating | Heart Seeker | +4 bonus dice, 2d6 bleed for 3 rounds, -2 saves for 2 rounds, -2 AC for 2 rounds | "A devastating thrust aimed at the heart -- {target} staggers, grievously wounded!" |

### 9.3 Melee Weapon Crits -- Bludgeoning

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-05 | Minor | Solid Hit | +1 bonus die | "A solid impact lands with a satisfying crack!" |
| 06-10 | Minor | Jarring Blow | +1 bonus die, -1 attack for 1 round | "A jarring blow rattles {target}'s teeth!" |
| 11-15 | Minor | Bruising Strike | +1 bonus die, -1 AC for 1 round | "The impact leaves a deep bruise -- {target} winces." |
| 16-20 | Minor | Bell Ringer | +1 bonus die, -1 saves for 1 round | "A ringing blow to the head -- {target} sees stars!" |
| 21-25 | Minor | Numbing Impact | +1 bonus die, -1 attack for 2 rounds | "The impact numbs {target}'s arm!" |
| 26-30 | Minor | Crushing Force | +2 bonus dice | "A devastating impact with crushing force!" |
| 31-35 | Minor | Dented Armor | +1 bonus die, -1 AC for 2 rounds | "Metal dents under the blow -- armor buckles slightly!" |
| 36-40 | Minor | Ringing Ears | +1 bonus die, -1 saves for 1 round, -1 attack for 1 round | "A blow to the side of the head -- {target}'s ears ring!" |
| 41-45 | Minor | Heavy Impact | +2 bonus dice, -1 AC for 1 round | "A heavy, punishing impact that rattles armor!" |
| 46-50 | Minor | Winding Blow | +2 bonus dice, -1 attack for 1 round | "A blow to the midsection winds {target}!" |
| 51-55 | Major | Stagger | +2 bonus dice, target loses next attack | "A tremendous blow staggers {target} -- they struggle to stay upright!" |
| 56-60 | Major | Cracked Ribs | +2 bonus dice, -2 AC for 2 rounds | "Ribs crack under the impact -- {target} doubles over!" |
| 61-65 | Major | Concussion | +2 bonus dice, -2 attack for 2 rounds, -1 saves for 2 rounds | "A concussive blow scrambles {target}'s senses!" |
| 66-70 | Major | Armor Crush | +3 bonus dice, -3 AC for 2 rounds | "Metal crumples and buckles under the devastating impact!" |
| 71-75 | Major | Fractured Guard | +2 bonus dice, target loses next attack, -1 AC for 2 rounds | "The blow fractures {target}'s guard completely!" |
| 76-80 | Major | Knockdown | +3 bonus dice, -2 AC for 2 rounds | "A colossal hit -- {target} is driven to their knees!" |
| 81-85 | Major | Internal Trauma | +3 bonus dice, -2 attack for 2 rounds, -2 AC for 1 round | "Internal trauma -- {target} coughs and staggers!" |
| 86-90 | Devastating | Shattered Guard | +3 bonus dice, target loses next attack, -3 AC for 2 rounds | "The blow shatters {target}'s guard -- they stagger back defenseless!" |
| 91-95 | Devastating | Skull Crack | +4 bonus dice, -2 attack for 3 rounds, -2 saves for 2 rounds | "A sickening crack -- {target}'s skull fractures! They reel in agony!" |
| 96-100 | Devastating | Bone Breaker | +4 bonus dice, -3 attack for 3 rounds, -2 AC for 3 rounds, target loses next attack | "Bones shatter under the impact! {target} howls and collapses to their knees!" |

### 9.4 Ranged Weapon Crits

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-05 | Minor | Dead Center | +1 bonus die | "The shot strikes dead center!" |
| 06-10 | Minor | Stinging Shot | +1 bonus die, -1 attack for 1 round | "The arrow stings -- {target} flinches!" |
| 11-15 | Minor | Grazing Shot | +1 bonus die, 1d4 bleed for 1 round | "The projectile grazes, drawing a line of blood." |
| 16-20 | Minor | Rattling Hit | +1 bonus die, -1 saves for 1 round | "A well-placed shot rattles {target}!" |
| 21-25 | Minor | Pinpoint | +1 bonus die, -1 AC for 1 round | "Pinpoint accuracy -- the shot finds a gap in defenses!" |
| 26-30 | Minor | Power Shot | +2 bonus dice | "The projectile strikes with tremendous force!" |
| 31-35 | Minor | Armor Gap | +1 bonus die, -1 AC for 2 rounds | "The shot slips between armor plates!" |
| 36-40 | Minor | Distracting Hit | +1 bonus die, -1 attack for 1 round, -1 saves for 1 round | "A distracting shot that breaks {target}'s concentration!" |
| 41-45 | Minor | Lodged Projectile | +2 bonus dice, 1d4 bleed for 1 round | "The projectile lodges in flesh -- painful to remove!" |
| 46-50 | Minor | Solid Strike | +2 bonus dice, -1 attack for 1 round | "A solid, punishing shot that finds its mark!" |
| 51-55 | Major | Vital Shot | +3 bonus dice | "The shot strikes a vital area -- devastating!" |
| 56-60 | Major | Pinning Shot | +2 bonus dice, target loses next attack | "{target} is pinned by the projectile -- struggling to move!" |
| 61-65 | Major | Crippling Shot | +2 bonus dice, -2 attack for 2 rounds | "The shot cripples {target}'s ability to fight!" |
| 66-70 | Major | Through and Through | +2 bonus dice, 1d6 bleed for 2 rounds | "The projectile punches clean through -- blood sprays!" |
| 71-75 | Major | Joint Shot | +3 bonus dice, -2 AC for 2 rounds | "A perfect shot to a joint -- {target}'s defense falters!" |
| 76-80 | Major | Artery Hit | +2 bonus dice, 2d4 bleed for 2 rounds | "An artery is struck -- blood spurts with each heartbeat!" |
| 81-85 | Major | Debilitating Hit | +3 bonus dice, -2 attack for 2 rounds, -1 AC for 2 rounds | "A debilitating shot -- {target} can barely lift their weapon!" |
| 86-90 | Devastating | Impaling Shot | +3 bonus dice, target loses next attack, -2 AC for 2 rounds | "The projectile impales {target}, stopping them in their tracks!" |
| 91-95 | Devastating | Eye of the Storm | +4 bonus dice, 1d6 bleed for 3 rounds, -2 attack for 2 rounds | "An impossible shot -- the projectile strikes with surgical devastation!" |
| 96-100 | Devastating | Marksman's Pride | +4 bonus dice, 2d6 bleed for 3 rounds, -2 saves for 2 rounds, -2 AC for 2 rounds | "A legendary shot -- it strikes exactly where intended with devastating precision!" |

### 9.5 Spell/Ability Crits -- Magical

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-05 | Minor | Empowered Strike | +1 bonus ability die | "Magical energy surges into the strike!" |
| 06-10 | Minor | Arcane Sting | +1 bonus die, -1 saves for 1 round | "Arcane energy stings -- {target}'s resistance wavers!" |
| 11-15 | Minor | Lingering Energy | +1 bonus die, 1d4 elemental DoT for 1 round | "Residual energy crackles over {target}!" |
| 16-20 | Minor | Focus Disruption | +1 bonus die, -1 attack for 1 round | "The magical impact disrupts {target}'s focus!" |
| 21-25 | Minor | Energy Flare | +1 bonus die, -1 AC for 1 round | "A flare of energy strips away {target}'s protections!" |
| 26-30 | Minor | Power Surge | +2 bonus ability dice | "A surge of power amplifies the strike!" |
| 31-35 | Minor | Mana Burn | +1 bonus die, -1 saves for 1 round, -1 AC for 1 round | "Mana burns away at {target}'s defenses!" |
| 36-40 | Minor | Elemental Lash | +1 bonus die, 1d4 elemental DoT for 1 round, -1 attack for 1 round | "An elemental lash strikes {target} and lingers!" |
| 41-45 | Minor | Resonance | +2 bonus dice, -1 saves for 1 round | "Magical resonance reverberates through {target}!" |
| 46-50 | Minor | Arcane Impact | +2 bonus dice, -1 AC for 1 round | "An impact of pure arcane force!" |
| 51-55 | Major | Arcane Overload | +2 bonus dice, -2 saves for 2 rounds | "Arcane energy overloads {target}'s defenses!" |
| 56-60 | Major | Elemental Burn | +2 bonus dice, 1d6 elemental DoT for 2 rounds | "Elemental energy ignites -- {target} burns with magical flame!" |
| 61-65 | Major | Mind Jolt | +2 bonus dice, target loses next ability (stunned) | "A psychic jolt scrambles {target}'s thoughts!" |
| 66-70 | Major | Ward Erosion | +3 bonus dice, -2 AC for 2 rounds | "Magical wards erode under the assault!" |
| 71-75 | Major | Shatter Ward | +3 bonus dice, -3 saves for 2 rounds | "The spell shatters {target}'s magical wards!" |
| 76-80 | Major | Cascading Energy | +2 bonus dice, 1d6 elemental DoT for 2 rounds, -1 saves for 2 rounds | "Cascading energy washes over {target} in waves!" |
| 81-85 | Major | Spell Penetration | +3 bonus dice, -2 attack for 2 rounds, -2 saves for 1 round | "The spell punches clean through {target}'s magical defenses!" |
| 86-90 | Devastating | Arcane Devastation | +3 bonus dice, 2d6 elemental DoT for 2 rounds, -2 AC for 2 rounds | "Devastating arcane energy tears through every defense!" |
| 91-95 | Devastating | Magical Annihilation | +4 bonus dice, -2 saves for 3 rounds, target loses next ability | "A cataclysm of raw magical power -- {target} is overwhelmed!" |
| 96-100 | Devastating | Cataclysmic Force | +4 bonus dice, 2d6 elemental DoT for 3 rounds, -2 saves for 3 rounds, -2 AC for 2 rounds | "Reality itself warps under the spell's force -- {target} is engulfed in devastating magical fury!" |

### 9.6 Melee Fumbles

*Roll d100. Apply modifiers, then level cap.*

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-06 | Trivial | Awkward Swing | Miss only | "{attacker} swings awkwardly but quickly recovers." |
| 07-12 | Trivial | Misstep | Miss only | "{attacker} missteps briefly but catches their balance." |
| 13-18 | Trivial | Bad Angle | Miss only | "{attacker} misjudges the angle -- the strike goes wide." |
| 19-24 | Trivial | Telegraphed | Miss only | "{attacker} telegraphs the strike -- {target} easily avoids it." |
| 25-30 | Trivial | Flat of the Blade | Miss only | "The flat of the blade connects harmlessly." |
| 31-36 | Trivial | Glancing Blow | Miss only | "The weapon glances off at an awkward angle." |
| 37-42 | Trivial | Hesitation | Miss only | "{attacker} hesitates for a split second -- the moment passes." |
| 43-48 | Trivial | Whiff | Miss only | "A clean miss -- the weapon cuts nothing but air." |
| 49-54 | Trivial | Off-Tempo | Miss only | "{attacker} is slightly off-tempo -- the strike misses." |
| 55-60 | Trivial | Parried Clean | Miss only | "{target} parries the clumsy strike with ease." |
| 61-65 | Minor | Off-Balance | -2 AC for 1 round | "{attacker} overextends and is momentarily off-balance." |
| 66-70 | Minor | Wide Swing | Disadvantage on next attack | "{attacker} swings wide -- the momentum carries past the target." |
| 71-75 | Minor | Poor Footing | -1 attack and -1 AC for 1 round | "{attacker} loses footing for a moment." |
| 76-80 | Minor | Strained Muscle | -1 attack for 2 rounds | "{attacker} strains a muscle mid-swing." |
| 81-85 | Minor | Jarred Wrist | -2 attack for 1 round | "{attacker}'s wrist jars on impact -- grip weakened!" |
| 86-90 | Moderate | Stumble | Opponent gets +2 attack next round | "{attacker} stumbles, leaving an opening!" |
| 91-95 | Moderate | Exposed Flank | -2 AC for 2 rounds | "{attacker} leaves their flank completely exposed!" |
| 96-100 | Moderate | Overcommit | Skip next attack (recovering) | "{attacker} overcommits and must recover their stance!" |

### 9.7 Ranged Fumbles

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-06 | Trivial | Wild Shot | Miss only | "The shot goes wide." |
| 07-12 | Trivial | Distracted | Miss only | "{attacker} is momentarily distracted -- the shot misses." |
| 13-18 | Trivial | Wind Shift | Miss only | "A gust of wind sends the shot astray." |
| 19-24 | Trivial | Early Release | Miss only | "{attacker} releases too early -- the shot arcs harmlessly." |
| 25-30 | Trivial | Obstructed | Miss only | "Something obscures the line of sight at the last moment." |
| 31-36 | Trivial | Bad Grip | Miss only | "A slight grip fumble sends the shot off-target." |
| 37-42 | Trivial | Misjudged Range | Miss only | "{attacker} misjudges the range -- the shot falls short." |
| 43-48 | Trivial | Target Shift | Miss only | "{target} shifts at the last moment -- clean miss." |
| 49-54 | Trivial | Shaky Aim | Miss only | "{attacker}'s aim wavers and the shot goes wide." |
| 55-60 | Trivial | Wasted Shot | Miss only | "A wasted shot that hits nothing." |
| 61-65 | Minor | Pulled Shot | Disadvantage on next attack | "{attacker} pulls the shot -- arm still tense from the bad release." |
| 66-70 | Minor | Poor Aim | -1 attack for 2 rounds | "{attacker} misjudges the distance -- aim suffers." |
| 71-75 | Minor | Tangled Grip | -2 AC for 1 round | "{attacker}'s grip tangles -- defense drops momentarily." |
| 76-80 | Minor | String Slip | -1 attack and -1 AC for 1 round | "The bowstring slips -- an off-balance recovery." |
| 81-85 | Minor | Strained Shoulder | -2 attack for 1 round | "{attacker} strains their draw arm -- next shot will suffer." |
| 86-90 | Moderate | Fumbled Reload | Skip next attack (reloading) | "{attacker} fumbles the reload and must start over!" |
| 91-95 | Moderate | Exposed Position | Opponent gets +2 attack next round | "{attacker}'s miss leaves them in an exposed position!" |
| 96-100 | Moderate | Jammed Mechanism | Skip next attack, -1 attack for 1 round | "The mechanism jams -- precious time wasted clearing it!" |

### 9.8 Spell/Ability Fumbles

| d100 | Severity | Effect Name | Mechanical Effect | Narrator Flavor |
|------|----------|-------------|-------------------|-----------------|
| 01-06 | Trivial | Fizzle | Spell fails only | "The spell fizzles harmlessly." |
| 07-12 | Trivial | Static | Spell fails only | "A crackle of static -- the magic dissipates." |
| 13-18 | Trivial | Misfire | Spell fails only | "The spell misfires into empty air." |
| 19-24 | Trivial | Lost Focus | Spell fails only | "{attacker} briefly loses focus -- the incantation fails." |
| 25-30 | Trivial | Mana Sputter | Spell fails only | "Mana sputters and the spell collapses before forming." |
| 31-36 | Trivial | Weak Formation | Spell fails only | "The spell forms weakly and dissolves before reaching {target}." |
| 37-42 | Trivial | Disrupted Pattern | Spell fails only | "The arcane pattern breaks apart mid-cast." |
| 43-48 | Trivial | Harmless Flash | Spell fails only | "A flash of light -- but no magical effect." |
| 49-54 | Trivial | Energy Scatter | Spell fails only | "Magical energy scatters in all directions harmlessly." |
| 55-60 | Trivial | Wrong Syllable | Spell fails only | "A mispronounced syllable -- the spell unravels." |
| 61-65 | Minor | Mana Feedback | Next ability deals -25% damage | "Mana feeds back -- {attacker}'s magic weakens momentarily." |
| 66-70 | Minor | Disrupted Focus | -2 to next save DC imposed | "{attacker}'s focus wavers -- their magic feels uncertain." |
| 71-75 | Minor | Arcane Fatigue | -1 attack for 2 rounds | "The failed spell leaves {attacker} magically fatigued." |
| 76-80 | Minor | Residual Drain | -1 saves for 1 round | "Residual energy drains {attacker}'s magical reserves." |
| 81-85 | Minor | Unstable Aura | -2 AC for 1 round | "Unstable magical energy crackles around {attacker}, disrupting their ward." |
| 86-90 | Moderate | Backlash | Self-damage: 25% of intended spell damage | "The spell backfires -- arcane energy lashes {attacker}!" |
| 91-95 | Moderate | Wild Surge | Random: 50% minor buff (+1 attack, 1 round), 50% minor debuff (-1 attack, 1 round) | "Wild magic surges unpredictably!" |
| 96-100 | Moderate | Mana Burn | Self-damage: 25% of intended spell damage, -1 saves for 1 round | "Mana burns through {attacker}'s channels -- painful and disorienting!" |

---

## 10. Implementation Considerations

### 10.1 New Types/Interfaces Needed

```typescript
// In shared/src/types/combat.ts

type CritSeverity = 'minor' | 'major' | 'devastating';
type FumbleSeverity = 'trivial' | 'minor' | 'moderate';
type CritChartType = 'slashing' | 'piercing' | 'bludgeoning' | 'ranged' | 'spell';
type FumbleChartType = 'melee' | 'ranged' | 'spell';

interface CritResult {
  severity: CritSeverity;
  trigger: 'nat20' | 'expanded_range' | 'first_strike' | 'spell_crit_fail';
  triggerSource?: string;
  chartType: CritChartType;
  rawD100: number;
  modifiers: Array<{ source: string; value: number }>;
  modifiedD100: number;
  entry: CritChartEntry;
  bonusDamage: number;
  statusApplied?: StatusEffectApplication;
  totalCritDamage: number;
}

interface FumbleResult {
  confirmed: boolean;
  confirmationRoll: number;
  confirmationTotal: number;
  // Only populated if confirmed:
  rawD100?: number;
  modifiers?: Array<{ source: string; value: number }>;
  modifiedD100?: number;
  levelCap?: number;
  cappedD100?: number;
  severity?: FumbleSeverity;
  chartType?: FumbleChartType;
  entry?: FumbleChartEntry;
  effectApplied?: string;
  duration?: number;
}

interface CritChartEntry {
  rangeStart: number;    // d100 range start (inclusive)
  rangeEnd: number;      // d100 range end (inclusive)
  severity: CritSeverity;
  name: string;
  bonusDice: number;
  statusEffect?: {
    type: string;         // e.g., 'bleed', 'stagger', 'concussion'
    value?: number;       // damage per tick, AC penalty, etc.
    duration: number;     // rounds
    saveDC?: number;
  };
  narratorTemplate: string;
}

interface FumbleChartEntry {
  rangeStart: number;
  rangeEnd: number;
  severity: FumbleSeverity;
  name: string;
  effect: {
    type: 'ac_penalty' | 'attack_penalty' | 'save_penalty' | 'skip_attack'
          | 'opponent_bonus' | 'self_damage' | 'disadvantage' | 'none'
          | 'damage_reduction' | 'random_surge';
    value?: number;
    duration: number;   // rounds
  };
  narratorTemplate: string;
}

// Monster crit properties (added to monster data model)
interface MonsterCritProperties {
  critImmune?: boolean;           // amorphous only (Slime, Mana Wisp)
  critResistMod?: number;         // negative d100 modifier (e.g., -20)
  critRange?: number;             // default 20, elite 19, boss 18
  critD100Bonus?: number;         // bonus when THIS monster crits (e.g., +20 for boss)
  critEffect?: MonsterCritEffect; // per-monster custom crit effect
  fumbleImmune?: boolean;         // boss-tier only
  fumbleConfirmBonus?: number;    // bonus to fumble confirmation (elite: +5)
}

interface MonsterCritEffect {
  name: string;
  statusType: string;
  statusValue?: number;
  duration: number;
  narratorTemplate: string;
}
```

### 10.2 Chart Data Location

Crit/fumble charts should live in `shared/src/data/combat/crit-charts.ts` and `shared/src/data/combat/fumble-charts.ts` as typed arrays of `CritChartEntry[]` and `FumbleChartEntry[]`, keyed by chart type. This follows the existing pattern of static game data in `/shared/src/data/`.

### 10.3 Combat Engine Functions to Modify

| Function | File | Change |
|----------|------|--------|
| `resolveAttack()` | `combat-engine.ts` | After determining crit, roll d100, apply modifiers, look up chart entry, apply effects |
| `calculateDamage()` | `combat-engine.ts` | Accept crit entry, apply bonus dice based on entry |
| `handleDamage()` | `class-ability-resolver.ts` | Same d100 crit system for ability crits |
| `resolveCombatRound()` | `tick-combat-resolver.ts` | Pass crit/fumble results to logger |
| `buildRoundsData()` | `combat-logger.ts` | Store critData/fumbleData in round JSONB |

### 10.4 New Functions Needed

| Function | Purpose |
|----------|---------|
| `rollCritChart(chartType, modifiers)` | Roll d100, apply modifiers, look up entry in chart |
| `getCritModifiers(attacker, defender, activeEffects)` | Collect all d100 modifiers from class, weapon, rage, etc. |
| `confirmFumble(attackModifier, targetAC)` | Roll confirmation d20, return confirmed/not |
| `rollFumbleChart(chartType, modifiers, levelCap)` | Roll d100, apply modifiers, cap by level, look up entry |
| `getFumbleModifiers(attacker, weaponType)` | Collect fumble d100 modifiers (Bard, weapon weight, Mage) |
| `getFumbleLevelCap(level)` | Return 100, 85, or 60 based on character level |
| `applyMonsterCritDefense(rawD100, monsterProperties)` | Apply monster critResistMod to attacker's d100 |

### 10.5 Data Model Additions

**Weapons:** Already have `damageType` field (SLASHING, PIERCING, BLUDGEONING). Add optional `critMod` for keen/special weapons:
```typescript
critMod?: number;  // e.g., 10 for Keen weapons
```

**Monsters (stats JSON):** Add `critProperties` object:
```json
{
  "hp": 150, "ac": 18,
  "critProperties": {
    "critRange": 18,
    "critResistMod": -20,
    "critD100Bonus": 20,
    "fumbleImmune": true,
    "critEffect": {
      "name": "Tail Sweep",
      "statusType": "knockback",
      "duration": 1
    }
  }
}
```

**Status Effects:** New status types needed:
- `bleed` -- damage per round (already partially exists)
- `stagger` -- lose next attack
- `concussion` -- penalty to attack and saves
- `armor_breach` -- AC reduction
- `pinned` -- lose next attack
- `exposed` -- AC reduction (crit-specific)
- `confused` -- ability effectiveness reduction (Psion crit)

### 10.6 Interaction with Existing Status Effect System

The combat engine already supports 23 status effects with duration tracking. Crit/fumble effects use the same system:

1. Crit chart entry specifies a `statusEffect` with type, value, and duration
2. The existing `applyStatusEffect()` pipeline applies it
3. The existing duration countdown removes it
4. The existing narrator template system narrates it

No new infrastructure needed -- crit effects are just another source of status effects.

### 10.7 Ensuring Auto-Resolve Compatibility

Every crit/fumble effect must pass this checklist:
- [ ] No player decision required to resolve
- [ ] Duration is finite (max 3 rounds)
- [ ] Effect is expressible as a numeric modifier or status flag
- [ ] Effect can be applied and removed by the tick resolver without human input
- [ ] Effect does not create branching combat states (no "choose which limb is affected")

All effects in the charts above pass this checklist.

### 10.8 Implementation Priority

**Decision (Tony):** Implement alongside Monster Engine Phase 1 -- same combat engine pass.

The crit/fumble system and monster abilities share the same combat engine modification surface (resolveAttack, calculateDamage, tick resolver). Implementing them together avoids double-touching these functions.

---

## 11. Decisions Log (Resolved)

All open questions from v1 have been decided:

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | Crit immunity vs resistance | **Full immunity ONLY for amorphous** (Slime, Mana Wisp). All others use crit resistance (negative d100 modifier). | Golems have weak joints, Elementals have a core. Don't silently invalidate player builds. |
| Q2 | Include fumbles? | **YES** with guardrails: confirmation rolls + inverse level scaling + mild effects only. | Adds tension without punishment. |
| Q3 | Severity determination | **d100 roll** with fixed probability bands (50/35/15). No margin-over-AC. | Every crit is a surprise. Modifiers shift the curve without making outcomes predictable. |
| Q4 | Spell crit trigger | **Target nat 1 on save** = spell crit for caster. Roll d100 on spell chart. | Simple, uses existing dice, creates fun moments. |
| Q5 | Healing crits | **SKIP for now.** Add later after core system is proven. | Focus implementation effort on damage crits first. |
| Q6 | Monster crit effects | **Per-individual-monster**, stored in ability data. | Maximum flavor per monster. Falls back to standard chart if not defined. |
| Q7 | Implementation priority | **Alongside Monster Engine Phase 1** -- same combat engine pass. | Avoids double-touching resolveAttack/calculateDamage. |
