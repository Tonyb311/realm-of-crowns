# Status Audit: Feat System & Caster Immunity / Ability Tax

## 1. Feat System Status

### Current Feat Inventory

28 feats across 5 categories:

| ID | Name | Category | Effects Summary |
|----|------|----------|----------------|
| `feat-precise-strikes` | Precise Strikes | Combat | +1 attack bonus |
| `feat-brutal-critical` | Brutal Critical | Combat | +50% crit damage |
| `feat-combat-reflexes` | Combat Reflexes | Combat | +3 initiative |
| `feat-devastating-blow` | Devastating Blow | Combat | GWM: -5 atk / +10 dmg (2H melee, excludes Mage/Psion) |
| `feat-deadeye` | Deadeye | Combat | Sharpshooter: -5 atk / +10 dmg (ranged, excludes Warrior/Cleric) |
| `feat-savage-attacker` | Savage Attacker | Combat | Reroll damage once/combat |
| `feat-arcane-focus` | Arcane Focus | Combat | +1 spell atk, +1 spell DC (excludes Warrior/Rogue/Ranger) |
| `feat-tough` | Tough | Defense | +2 HP/level (retroactive) |
| `feat-resilient` | Resilient | Defense | +1 save proficiency (player picks) |
| `feat-iron-will` | Iron Will | Defense | +1 all saves |
| `feat-natural-armor` | Natural Armor | Defense | +1 AC |
| `feat-heavy-armor-mastery` | Heavy Armor Mastery | Defense | Flat DR 3 (excludes Mage/Psion/Bard/Rogue) |
| `feat-durable` | Durable | Defense | +25% healing received |
| `feat-spell-ward` | Spell Ward | Defense | +2 save vs abilities only |
| `feat-undying` | Undying | Defense | 50% death penalty reduction |
| `feat-lucky` | Lucky | Utility | Reroll any d20 once/combat |
| `feat-quick-learner` | Quick Learner | Utility | +10% XP |
| `feat-inspiring-leader` | Inspiring Leader | Utility | 10 HP party shield at combat start |
| `feat-guardians-vigil` | Guardian's Vigil | Utility | Sentinel counter once/combat (excludes Mage/Psion) |
| `feat-swift-stride` | Swift Stride | Utility | 15% travel speed bonus (TODO: unwired) |
| `feat-wary-traveler` | Wary Traveler | Utility | 20% encounter avoidance |
| `feat-master-artisan` | Master Artisan | Crafting/Economy | +3 profession quality |
| `feat-merchant-prince` | Merchant Prince | Crafting/Economy | 10% buy discount, 10% sell bonus |
| `feat-fortune-favored` | Fortune Favored | Crafting/Economy | +15% gold from all sources |
| `feat-polymath` | Polymath | Crafting/Economy | +1 profession slot |
| `feat-master-chef` | Master Chef | Crafting/Economy | +25% food buff strength (TODO: unwired) |
| `feat-silver-tongue` | Silver Tongue | Social | +2 social/political bonus (TODO: unwired) |
| `feat-field-medic` | Field Medic | Social | +25% healing given (excludes Warrior/Rogue/Ranger) |

### FeatEffects Interface

32 fields total. Wiring status:

**Fully wired (25 effects):**
- `attackBonus` — combat-engine: resolveAttack
- `acBonus` — combat-engine: calculateAC
- `initiativeBonus` — combat-engine: initiative roll
- `critDamageBonus` — combat-engine: crit multiplier
- `damageReductionFlat` — combat-engine: DR application
- `spellAttackBonus` — combat-engine: spell attack modifier
- `spellDcBonus` — class-ability-resolver: spell DC
- `allSaveBonus` — combat-engine + class-ability-resolver: ~12 call sites
- `spellSaveBonus` — combat-engine + class-ability-resolver: ~12 call sites
- `gwmTradeoff` — combat-engine: conditional -5/+10 with AC heuristic
- `sharpshooterTradeoff` — combat-engine: conditional -5/+10 with AC heuristic
- `luckyReroll` — combat-engine: d20 reroll once/combat
- `savageAttackerReroll` — combat-engine: damage reroll once/combat
- `sentinelCounter` — combat-engine: free counterattack on hit
- `partyTempHp` — combat-engine: party shield at combat start (highest only, not stackable)
- `bonusSaveProficiency` — road-encounter + tick-combat-resolver: 7 call sites
- `healingReceivedBonus` — combat-engine: 3 call sites
- `healingGivenBonus` — class-ability-resolver: 3 call sites
- `encounterAvoidance` — road-encounter: multiplicative reduction
- `fleeBonus` — combat-engine: flee save + road-encounter: pre-combat flee
- `professionSlotBonus` — profession-config: getMaxProfessions()
- `bonusHp` — characters route: immediate on selection
- `hpPerLevel` — characters route: retroactive HP gain
- `statBonus` — characters route: stat increase (capped at 20)
- `deathPenaltyReduction` — structural game mechanic (works via penalty formula)

**Defined but not consumed by game code (3 effects):**
- `xpBonus` — used in feat data, NOT read by any XP granting code
- `goldBonus` — used in feat data, NOT read by any gold granting code
- `professionQualityBonus` — used in feat data, NOT read by crafting code

**Explicitly marked TODO (3 effects):**
- `travelSpeedBonus` — "TODO: wire into daily tick"
- `foodBuffBonus` — "TODO: wire into food system"
- `socialBonus` — "TODO: wire when political system adds roll-based outcomes"

### Feat Grant Mechanism

- **When:** Feats unlock at levels **38** and **48** (2 total, one per milestone)
- **How:** `checkFeatMilestone()` in `ability-grants.ts` sets `pendingFeatChoice = true` on level-up
- **Selection:** `POST /api/characters/choose-feat` — validates feat exists, not owned, respects class exclusions
- **Discovery:** `GET /api/characters/pending-feat` — returns filtered list of available feats
- **Storage:** `feats` JSONB array on characters table; `pendingFeatChoice` boolean flag
- **Immediate effects:** `hpPerLevel`, `bonusHp`, `statBonus`, `bonusSaveProficiency` applied on selection; all other effects are passively read during combat/travel

### Non-Combat Feats

Yes — 7 non-combat feats exist:
- **Crafting/Economy (5):** Master Artisan, Merchant Prince, Fortune Favored, Polymath, Master Chef
- **Social (2):** Silver Tongue, Field Medic
- **Utility with non-combat effects (2):** Swift Stride (travel), Wary Traveler (encounter avoidance)

### Feat System Verdict

**Partially implemented — 90% complete, 3 unwired hooks, 3 unconsumed bonuses**

The feat system is production-ready for the 25 fully-wired effects. The remaining gaps:
1. `xpBonus` / `goldBonus` / `professionQualityBonus` — defined on feats but never consumed by game code (Quick Learner, Fortune Favored, Master Artisan are partially broken)
2. `travelSpeedBonus` / `foodBuffBonus` / `socialBonus` — explicitly deferred with TODO comments
3. No feat-selection UI component exists in the client (the API exists but no React component calls it)

---

## 2. Caster Immunity / Zero Damage Bug

### Current Damage Pipeline

```
Ability/Attack → Dice Roll → Stat Modifier → Bonus Damage → Total Damage
    ↓
applyDamageTypeInteraction(totalDamage, damageType, target)
    ↓
Check status immunities (e.g., frozen → immune to COLD)
    ↓
Check target.immunities → finalDamage = 0 if immune
    ↓
Check target.vulnerabilities → finalDamage = damage × 2 if vulnerable
    ↓
Check target.resistances → finalDamage = floor(damage / 2) if resistant
    ↓
Apply damageReductionFlat (DR feat) → min 1 damage
    ↓
Final damage applied to target HP
```

### Immunity/Resistance Handling

`applyDamageTypeInteraction()` in `combat-engine.ts` (lines 273-346):
- Returns `{ finalDamage: 0, interaction: 'immune' }` if target has the damage type in `immunities`
- Returns `{ finalDamage: damage * 2, interaction: 'vulnerable' }` for vulnerabilities
- Returns `{ finalDamage: Math.floor(damage / 2), interaction: 'resistant' }` for resistances
- Called in 3 places: basic attacks (line 1211), class abilities (line 3246), and extra attacks

### Zero Damage Scenario Test

**Trace: Mage casts Fire Bolt at Mind Flayer (BEFORE fix)**

1. `decideAction()` → returns `{ type: 'class_ability', classAbilityId: 'fire-bolt' }`
2. `resolveClassAbility()` → calculates damage (e.g., 18 FORCE damage)
3. `applyDamageTypeInteraction(18, 'FORCE', mindFlayer)` → Mind Flayer had `immunities: ['FORCE']`
4. Returns `{ finalDamage: 0, interaction: 'immune' }` → **zero damage**
5. HP adjustment: `newHp = hpBefore - 0 = hpBefore` → monster takes no damage
6. Extra attacks (post-fix): each also deals FORCE damage → also 0 if immune
7. **Result: Mage deals 0 damage per turn indefinitely → guaranteed loss**

**After fix:** Mind Flayer's `immunities` cleared, `resistances: ['PSYCHIC']` added. FORCE no longer blocked. Mage deals full damage.

### Minimum Damage Floor

**No global minimum damage floor exists.** Immunity returns exactly 0. The only floor is in `damageReductionFlat` (DR feat): `Math.max(1, damage - DR)` — but this only applies to the feat's flat DR, not immunities.

A minimum damage floor (e.g., 1 damage on immune) is a design decision, not a bug. The fix was to remove inappropriate immunities, not add a floor.

### Bug Status

**Fixed** — Commit `0b343a6` (2026-03-07) removed FORCE/PSYCHIC immunities from 5 monsters. Follow-up commit `69b388f` (2026-03-11) converted 3 more monsters' immunities to resistances. No monster currently has FORCE or PSYCHIC in `damageImmunities`.

---

## 3. Warrior Ability Tax

### Extra Attack System

Warriors get extra attacks per action based on level:

| Level Range | Total Attacks/Turn |
|---|---|
| 1–12 | 1 |
| 13–33 | 2 |
| 34–41 | 3 |
| 42+ | 4 |

Set via `getAttacksPerAction()` in `shared/src/data/combat-constants.ts`. Only Warriors have extra attacks.

### resolveExtraAttacksAfterAbility() Status

**Exists and is called.** Function at `combat-engine.ts` lines 2698-2739.

- Loops `totalAttacks - 1` times (ability counts as first attack)
- Each extra attack is a full `resolveAttack()` with weapon dice, stat mod, AC check, crit/fumble, damage type interaction
- Handles: actor death (stops), target death (retargets), no enemies (stops)
- Called after `attack`, `class_ability`, and `psion_ability` action types (lines 3071, 3215, 3286)

### Ability vs Basic Attack Comparison

**Level 10 Warrior with 1 attack/turn (no extra attacks at L10):**
- Basic attack: 1 × (weapon dice + STR mod) = ~12 damage
- Power Strike: 1 × (ability dice + STR mod + bonus) ≈ ~18 damage
- **Ability wins** — no extra attack penalty at L10

**Level 20 Warrior with 2 attacks/turn:**
- Basic attack: 2 × ~14 = ~28 damage/turn
- Power Strike + 1 extra attack: ~22 (ability) + ~14 (extra) = ~36 damage/turn
- **Ability wins** — now gets both ability damage AND extra attacks

**Before the fix (Level 20 Warrior):**
- Basic attack: 2 × ~14 = ~28 damage/turn
- Power Strike (no extra attacks): 1 × ~22 = ~22 damage/turn
- **Basic attack was BETTER** — the "ability tax" was -22% DPS for using abilities

### Ability Tax Verdict

**Fixed** — Commit `0b343a6`. Warriors now get extra attacks after using abilities. Sim validation showed Warrior win rate jumped from 38% → 54.9% (+16.9 pts). DPR approximately doubled at L13+ where extra attacks kick in.

---

## 4. Git History Evidence

**Feat system commits:**
- `d035065` — "feat: expand feat system from 13 to 30 feats with full combat engine wiring"
- `a589705` — "feat: add feat override support to combat sim + comprehensive feat expansion configs"
- `ff28f49` — "fix: apply all 10 audit findings — starter armor AC, monster STR double-count, feat wiring"
- `e683e43` — "fix: apply Tough feat HP bonus in sim buildSyntheticPlayer + fix stale HP docs"

**Caster immunity + ability tax commits:**
- `0b343a6` — "fix: caster zero-damage immunity bug + warrior ability tax (extra attacks after abilities)"
- `69b388f` — "fix: convert 3 more monster PSYCHIC/FORCE immunities to resistances"

### Was fix-ability-tax-caster-immunities.md executed?

**Yes.** Commit `0b343a6` directly addresses both issues from the prompt. The commit message references both bugs. The code changes match the prompt's prescriptions: removed monster immunities, extracted `resolveExtraAttacksAfterAbility()`, called it in 3 places.

---

## 5. Prompt Status

| Prompt | Status |
|--------|--------|
| `prompts/fix-ability-tax-caster-immunities.md` | **Executed** — commit `0b343a6` |
| `prompts/expand-feat-system-d20.md` | **Executed** — commit `d035065` |
| `prompts/audit-feat-expansion-d20.md` | **Exists** — likely the audit that preceded the expansion |
| `prompts/comprehensive-feat-combat-sim.md` | **Exists** — sim configs for feat testing |
| `prompts/audit-combat-log-caster-bug-ability-tax.md` | **Exists** — diagnostic audit that identified both bugs |

---

## 6. Recommended Next Steps

**Priority order:**

1. **Wire `xpBonus` and `goldBonus` feat effects** (Quick Learner and Fortune Favored are partially broken — they have the effect defined but nothing reads it). Search for XP/gold granting code and add `computeFeatBonus` calls. ~30 min.

2. **Wire `professionQualityBonus`** into crafting quality rolls (Master Artisan feat is partially broken). ~15 min.

3. **Build feat selection UI** — the API (`GET /pending-feat`, `POST /choose-feat`) exists but there's no React component. Players at L38/48 can't actually pick feats without it. **This is the highest-impact gap.**

4. **Wire `travelSpeedBonus`** into the travel tick speed modifier. Swift Stride feat effect is unused. Low effort since `speedModifier` already exists on `characterTravelStates`.

5. **Caster viability** is a separate, larger issue documented in `docs/audit-caster-non-viability-diagnostic.md`. Not a bug — it's a balance problem (lower HP, less AC, lower damage scaling). Separate workstream.

6. **T4+ monster rebalance** needed — the ability tax fix enabled accurate DPR measurement, but high-level monster win rates are still terrible (Archlich 7.3%, Void Emperor 0%). Separate workstream.
