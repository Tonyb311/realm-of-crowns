# Phase 1: Monster Engine + Crit/Fumble System + CR Foundation

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then read the agent definitions: `ls .claude/agents/` and read the relevant ones for this task.

---

## REQUIRED READING (read all before planning)

These three docs define what we're building:

1. `cat docs/investigations/monster-system-audit.md` — Current state, engine gaps, 21 monsters, what's missing
2. `cat docs/design/combat-rating-system.md` — CR formula, two-track system (formula + sim), encounter difficulty
3. `cat docs/design/critical-hit-fumble-system.md` — d100 tables, modifier system, 8 charts (160 entries), severity bands, logging

Also read the current combat engine and related files:
- `cat shared/src/types/combat.ts` — existing combat types
- `cat server/src/lib/combat-engine.ts` — existing combat engine (resolveTurn, resolveAttack, etc.)
- `cat server/src/lib/class-ability-resolver.ts` — EFFECT_HANDLERS map (the pattern for monster ability handlers)
- `cat server/src/services/tick-combat-resolver.ts` — decideAction() and auto-combat AI
- `cat server/src/lib/combat-logger.ts` — buildRoundsData() and round log structure
- `cat server/src/services/combat-simulator.ts` — buildSyntheticMonster()
- `cat database/seeds/monsters.ts` — current monster seed data
- `cat database/prisma/schema.prisma` — Monster model

---

## SCOPE

This is the single combat engine pass that adds three interconnected systems:

### System 1: Monster Abilities
Monsters can use abilities beyond basic attack. Monster AI selects from available abilities. Abilities resolve through handlers (same pattern as class abilities). Includes multi-attack, on-hit effects, conditional regeneration.

### System 2: Crit/Fumble
d100 chart system for crits and fumbles. 8 charts (slashing/piercing/bludgeoning melee, ranged, spell + 3 fumble charts) with 20 entries each. Modifier system (+/- from class features, weapon properties, monster traits). Fumble confirmation rolls with inverse level scaling.

### System 3: Damage Types & CR
Damage type checking on all damage (resistance = half, immunity = zero, vulnerability = double). Condition immunity checking. Formula-based CR stored on Monster model.

All three touch `combat-engine.ts`, which is why they're done together — one pass through the engine, not three.

---

## WORK ITEMS

### A. Schema & Types (do first — everything depends on these)

#### A1. Prisma Schema — Expand Monster model

Add to the Monster model in `database/prisma/schema.prisma`:

```prisma
model Monster {
  // ... existing fields ...
  abilities          Json      @default("[]")     // MonsterAbility[]
  damageType         String    @default("BLUDGEONING") // Primary damage type
  resistances        Json      @default("[]")     // DamageType[] — half damage
  immunities         Json      @default("[]")     // DamageType[] — zero damage
  vulnerabilities    Json      @default("[]")     // DamageType[] — double damage
  conditionImmunities Json     @default("[]")     // StatusEffectType[] — immune to these
  critImmunity       Boolean   @default(false)     // Amorphous only (Ooze, Slime)
  critResistance     Int       @default(0)         // Negative d100 modifier (-15 to -30)
  expandedCritRange  Int       @default(0)         // Monster's own crit range expansion
  formulaCR          Float?                        // Calculated CR (formula-based)
  simCR              Float?                        // Calculated CR (simulation-based)
  encounterType      String    @default("solo")    // solo, group, raid
}
```

Run `npx prisma migrate dev --name add-monster-abilities-crit-cr`.

Verify migration succeeds and existing monster data is preserved with defaults.

#### A2. Shared Types — `shared/src/types/combat.ts`

Add these types (DO NOT modify existing types — only add):

```typescript
// Damage types
type DamageType = 'SLASHING' | 'PIERCING' | 'BLUDGEONING' | 'FIRE' | 'COLD' | 'LIGHTNING' | 'ACID' | 'POISON' | 'NECROTIC' | 'RADIANT' | 'FORCE' | 'PSYCHIC' | 'THUNDER';

// Monster ability definition
interface MonsterAbility {
  id: string;                    // unique per monster (e.g., "troll-regen", "dragon-breath")
  name: string;
  type: 'damage' | 'status' | 'buff' | 'heal' | 'aoe' | 'multiattack' | 'on_hit';
  damage?: string;               // dice notation e.g., "4d6+4"
  damageType?: DamageType;
  attackBonus?: number;           // override monster's base attack
  saveDC?: number;
  saveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  statusEffect?: string;         // from existing STATUS_EFFECT_DEFS
  statusDuration?: number;       // rounds
  attacks?: number;              // for multiattack — how many strikes
  hpPerTurn?: number;            // for regeneration
  disabledBy?: DamageType[];     // damage types that disable this (e.g., fire disables troll regen)
  onHit?: boolean;               // triggers automatically on basic attack hit
  cooldown?: number;             // rounds between uses (0 = every turn)
  recharge?: number;             // recharge on X-6 (e.g., 5 = recharges on roll of 5 or 6)
  usesPerCombat?: number;        // limited uses
  priority?: number;             // AI priority (higher = used first)
  description?: string;          // for narrator/log display
}

// Crit result stored in round log
interface CritResult {
  triggered: boolean;
  triggerRoll: number;           // the d20 that triggered the crit
  critRange: number;             // the crit threshold (20, 19, 18, etc.)
  chartType: string;             // which chart was consulted (slashing_melee, spell, etc.)
  d100Roll: number;              // raw d100 roll
  modifiers: { source: string; value: number }[];  // list of modifiers applied
  modifiedRoll: number;          // d100 after modifiers (capped 1-100)
  severity: 'minor' | 'major' | 'devastating';
  effectName: string;            // from chart entry
  effectDescription: string;     // mechanical description
  bonusDamage?: number;          // extra damage from crit
  statusApplied?: string;        // status effect applied by crit
  statusDuration?: number;
}

// Fumble result stored in round log
interface FumbleResult {
  triggered: boolean;
  triggerRoll: number;           // the nat 1
  confirmationRoll: number;      // second d20
  confirmationTarget: number;    // what they needed to hit to avoid fumble
  confirmed: boolean;            // did the fumble confirm?
  chartType?: string;            // which fumble chart
  d100Roll?: number;             // raw d100 (only if confirmed)
  modifiers?: { source: string; value: number }[];
  modifiedRoll?: number;
  levelCap?: number;             // cap applied based on level
  cappedRoll?: number;           // roll after level cap
  severity?: 'trivial' | 'minor' | 'moderate';
  effectName?: string;
  effectDescription?: string;
  penaltyApplied?: string;       // what mechanical penalty
  penaltyDuration?: number;
}

// Damage type interaction result
interface DamageTypeResult {
  originalDamage: number;
  damageType: DamageType;
  interaction: 'normal' | 'resistant' | 'immune' | 'vulnerable';
  multiplier: number;            // 1.0, 0.5, 0, 2.0
  finalDamage: number;
}
```

Check if `DamageType` already exists in the types file before adding — the audit mentioned `damageType` is already on `WeaponInfo`. Extend the existing type if it exists, or create it if it doesn't.

#### A3. Crit/Fumble Chart Data — `shared/src/data/combat/crit-charts.ts`

Create this file with the 8 d100 charts from the design doc. Each chart has 20 entries covering the full d100 range:

**Charts to create:**
1. `SLASHING_MELEE_CRITS` — bleeding, severed tendons, deep wounds
2. `PIERCING_MELEE_CRITS` — vital strikes, pinning, organ damage
3. `BLUDGEONING_MELEE_CRITS` — stagger, concussion, armor breach
4. `RANGED_CRITS` — ranged-specific flavor
5. `SPELL_CRITS` — extended duration, bypass resistance, secondary effects
6. `MELEE_FUMBLES` — overswing, off-balance, momentum loss
7. `RANGED_FUMBLES` — string snap, misfire, dropped arrow
8. `SPELL_FUMBLES` — fizzle, backlash, mana burn

**Copy entries verbatim from `docs/design/critical-hit-fumble-system.md`** — the design doc has all 160 entries with d100 ranges, severity, effect names, mechanical effects, and narrator flavor text. Do NOT invent new entries — use what the design doc specifies.

**Each entry should have this shape:**
```typescript
interface CritChartEntry {
  d100Min: number;
  d100Max: number;
  severity: 'minor' | 'major' | 'devastating';
  name: string;
  mechanicalEffect: {
    damageMultiplier?: number;      // e.g., 2.0 for double damage
    bonusDice?: string;             // e.g., "1d6" extra
    statusEffect?: string;          // from STATUS_EFFECT_DEFS
    statusDuration?: number;
    acPenalty?: number;
    attackPenalty?: number;
    skipNextAttack?: boolean;
    dot?: { damage: string; duration: number; type: DamageType };
  };
  narratorText: string;             // flavor text for combat narrator
}

interface FumbleChartEntry {
  d100Min: number;
  d100Max: number;
  severity: 'trivial' | 'minor' | 'moderate';
  name: string;
  mechanicalEffect: {
    skipNextAttack?: boolean;
    selfDamage?: string;             // dice notation
    acPenaltyToSelf?: number;
    attackPenaltyToSelf?: number;
    grantEnemyBonus?: { type: string; value: number; duration: number };
    extendedCooldown?: number;       // for spell fumbles
  };
  narratorText: string;
}
```

**Chart lookup function:**
```typescript
function lookupCritChart(damageType: DamageType, isRanged: boolean, isSpell: boolean): CritChartEntry[];
function lookupFumbleChart(isRanged: boolean, isSpell: boolean): FumbleChartEntry[];
function rollOnChart(chart: ChartEntry[], d100: number): ChartEntry;
```

---

### B. Combat Engine Changes (do second — depends on A)

#### B1. Damage Type Resolution — `combat-engine.ts`

Find where damage is applied to a target (likely in `resolveAttack()` or `calculateDamage()`). Add damage type checking:

```typescript
function applyDamageTypeInteraction(
  baseDamage: number,
  damageType: DamageType,
  target: Combatant
): DamageTypeResult {
  if (target.immunities?.includes(damageType)) return { ...originalDamage, multiplier: 0, finalDamage: 0, interaction: 'immune' };
  if (target.vulnerabilities?.includes(damageType)) return { ...originalDamage, multiplier: 2, finalDamage: baseDamage * 2, interaction: 'vulnerable' };
  if (target.resistances?.includes(damageType)) return { ...originalDamage, multiplier: 0.5, finalDamage: Math.floor(baseDamage / 2), interaction: 'resistant' };
  return { ...originalDamage, multiplier: 1, finalDamage: baseDamage, interaction: 'normal' };
}
```

The `Combatant` type needs `resistances`, `immunities`, `vulnerabilities`, `conditionImmunities` fields. Add them. Monsters populate these from DB data; players populate them from equipment/buffs (empty for now, infrastructure ready for later).

Also add condition immunity checking to `applyStatusEffect()` — if the target has the status type in their `conditionImmunities`, block it.

#### B2. Crit Resolution — `combat-engine.ts`

Replace the current nat-20 crit logic (double dice) with the d100 chart system:

1. **On crit trigger** (nat 20 or expanded range hit):
   - Determine chart type from weapon's `damageType` + ranged/melee/spell
   - Roll d100
   - Collect modifiers (class features, weapon properties, monster crit resistance)
   - Apply modifiers (cap 1-100)
   - Look up chart entry
   - Apply the chart entry's mechanical effect (bonus damage, status, DoT, etc.)
   - If target has `critImmunity`, skip the entire crit (just a normal hit)
   - Store the full `CritResult` on the turn log entry

2. **Modifier collection**: Check combatant for crit modifiers. This needs a way to register modifiers. Options:
   - Check class/spec and apply the documented modifiers from the design doc
   - Check weapon properties for Keen bonus
   - Check active buffs for crit modifiers
   - Check if attacking from stealth (Rogue)
   - Check monster `critResistance` as negative modifier on incoming crits

3. **DON'T remove the existing double-dice crit damage** — the chart entries define their own damage multipliers. Some Minor entries are still 2x dice. The chart REPLACES the flat "always double dice" logic.

#### B3. Fumble Resolution — `combat-engine.ts`

On nat 1:

1. **Confirmation roll:** Roll a second d20 + attack modifiers. If it would hit the target's AC, the fumble does NOT confirm — it's just a miss.
2. **If confirmed:**
   - Determine fumble chart (melee, ranged, or spell)
   - Roll d100
   - Collect modifiers (class features, weapon properties)
   - Apply level cap: Level 26+ cap at 60 (trivial only), Level 11-25 cap at 85, Level 1-10 uncapped
   - Apply modifiers (cap 1-100)
   - Look up chart entry
   - Apply the mechanical effect
   - Store full `FumbleResult` on the turn log entry
3. **If not confirmed:** Just a normal miss. Store `FumbleResult` with `confirmed: false`.

#### B4. Monster Ability Resolution

**Monster AI — `tick-combat-resolver.ts`:**

In `decideAction()`, add a monster path. When the combatant is a monster:

1. Check available abilities (not on cooldown, recharged, uses remaining)
2. Sort by priority (highest first)
3. For recharge abilities: roll d6 at start of turn, recharge if roll >= ability.recharge value
4. Select the highest-priority available ability
5. If no abilities available, fall back to basic attack
6. Return action with type `'monster_ability'` and the ability data

**Monster ability handlers — create `server/src/lib/monster-ability-resolver.ts`:**

A new file, following the pattern of `class-ability-resolver.ts`. Create handlers for each monster ability type:

- `damage` — Roll attack vs AC, deal ability damage with specified damage type
- `status` — Target makes save (ability.saveType vs ability.saveDC), apply status on fail
- `aoe` — Target makes DEX/CON save, deal AoE damage (in 1v1 this is just damage + save)
- `multiattack` — Make N attacks in one turn (reuse the multi-attack pattern from class abilities)
- `buff` — Apply buff to self (regeneration, AC bonus, etc.)
- `heal` — Heal self for specified amount
- `on_hit` — Special: doesn't use an action. Triggers automatically when basic attack hits. Target saves or gets status applied.

Each handler returns a result that the logger can process.

**On-hit effects — `combat-engine.ts`:**

After a successful basic attack, check if the attacker has any `on_hit` abilities. If so, target makes save vs ability.saveDC. On fail, apply the status effect.

**Conditional regeneration:**

For abilities like Troll regeneration: at the start of the monster's turn, check if any `heal` type ability with `disabledBy` exists. If the monster was hit by a damage type in `disabledBy` last round, skip the regen. Otherwise, heal `hpPerTurn`.

Track "damage types received this round" on the combatant state. Reset each round.

#### B5. Combat Engine — `resolveTurn()` Integration

In `resolveTurn()`, add handling for the new `monster_ability` action type:

1. Dispatch to `resolveMonsterAbility()` in `monster-ability-resolver.ts`
2. Get the result
3. Apply damage type checking on any damage dealt
4. Check for crit/fumble on attack rolls within monster abilities
5. Attach result to turn log entry

---

### C. Combat Logger (do third — depends on B)

#### C1. Log Crit/Fumble Details — `combat-logger.ts`

In `buildRoundsData()`, for every attack action (basic attack, class ability, monster ability):

- If `critResult` exists on the turn entry, add it to the round log with the full decision chain
- If `fumbleResult` exists, add it similarly
- If `damageTypeResult` exists, log the interaction (resistant/immune/vulnerable/normal)

#### C2. Log Monster Ability Details

Add a `monster_ability` case to `buildRoundsData()` (same pattern as `class_ability`). Extract:
- Ability name and description
- Attack roll (if applicable) with full breakdown
- Save DC and save roll (if applicable)
- Damage dealt with type
- Status effects applied
- Crit/fumble results if triggered during the ability
- Damage type interaction if applicable

#### C3. Add Crit/Fumble to Existing Handlers

The `attack` handler in `buildRoundsData()` already logs attack rolls. Extend it to also log:
- `critResult` with full d100 decision chain
- `fumbleResult` with confirmation and d100 chain
- `damageTypeResult` showing resistance/immunity/vulnerability interaction

---

### D. Admin Frontend (do fourth — depends on C)

#### D1. Crit/Fumble Display — `HistoryTab.tsx`

Add rendering for crit and fumble results in the combat log:

**Crit display (expandable):**
```
⚔ CRITICAL HIT — Major: Arterial Slice
  Trigger: nat 20 (crit range 20)
  d100 Roll: 42 → +15 Berserker Rage, +10 Keen Weapon → Modified: 67
  Severity: Major (51-85 band)
  Effect: Bleeding 1d4/round for 3 rounds
  Bonus Damage: 2d8 + 2d8
```

**Fumble display (expandable):**
```
✕ FUMBLE — Minor: Overextended
  Trigger: nat 1
  Confirmation: d20 = 8 + 4 = 12 vs AC 15 → CONFIRMED
  d100 Roll: 73 → -15 Bard Grace → Modified: 58 → Level cap (85) → Final: 58
  Severity: Trivial (1-60 band)
  Effect: No penalty (just a miss with flair)
```

**Damage type interaction display:**
When damage type interaction is non-normal, show it:
```
Damage: 14 FIRE → Troll is VULNERABLE → 28 damage
Damage: 8 SLASHING → Skeleton is RESISTANT → 4 damage
Damage: 12 POISON → Iron Golem is IMMUNE → 0 damage
```

#### D2. Monster Ability Display

Render monster abilities the same way class abilities render — ability name, effect, damage, saves. Use the same `RollBreakdown` and `DamageBreakdown` components.

---

### E. Monster Seed Data Upgrade (do last — depends on everything above)

#### E1. Upgrade All 21 Monsters — `database/seeds/monsters.ts`

Using the SRD gap analysis from `docs/investigations/monster-system-audit.md` Section 7, give every monster their SRD-appropriate abilities, damage types, resistances, and condition immunities.

**Read the monster audit's Section 7 (Current Monster vs SRD Gap Analysis) carefully.** Each monster's SRD equivalent is documented there.

For each monster, add:
- `damageType` — primary weapon damage type
- `abilities` — array of `MonsterAbility` based on SRD equivalent
- `resistances`, `immunities`, `vulnerabilities` — from SRD
- `conditionImmunities` — from SRD
- `critImmunity` — true ONLY for Slime and Mana Wisp (amorphous)
- `critResistance` — negative modifier for armored/hardy monsters (Ancient Golem: -20, etc.)

**Key upgrades per the audit:**

| Monster | Critical Additions |
|---|---|
| Wolf | on_hit: knockdown (DC 11 STR save) |
| Slime | critImmunity, acid damage type, resistances |
| Mana Wisp | critImmunity, lightning damage, high resistances |
| Giant Spider | on_hit: poison (DC 11 CON), web ability (restrains) |
| Troll | regeneration 10/turn (disabled by fire/acid), multiattack (bite + 2 claws) |
| Young Dragon | breath weapon (recharge 5-6), multiattack (bite + 2 claws), elemental immunity |
| Hydra | multiattack (5 attacks, one per head) |
| Lich | spell-like abilities (at minimum: damage + status abilities), legendary-tier features |
| Ancient Golem | critResistance -20, magic resistance, condition immunities |
| Bog Wraith | necrotic damage, life drain (healing on hit), resistances |
| Skeleton Warrior | vulnerability to bludgeoning, immunity to poison |
| Demon | fire damage, multi-attack, condition immunities |

**Don't over-scope:** For Phase 1, focus on abilities the engine can handle (damage, status, multiattack, on_hit, heal/regen). Don't add abilities that require engine features from Phase 4-5 (legendary actions, spell-like, swallow). Those monsters get their basic abilities now and more later.

#### E2. Calculate Formula CR for All 21 Monsters

Implement the CR formula from `docs/design/combat-rating-system.md` as a utility function. Run it against each monster's stats and store the result in `formulaCR`.

The formula uses:
- **EHP Level** — effective HP accounting for AC, resistances, regen
- **EDPR Level** — effective DPR accounting for hit chance, multi-attack, abilities
- **Lethality Adjustment** — for save-or-suck abilities

Reference the worked examples in the CR doc (Goblin = CR 1, Troll = CR 9, etc.) to validate the formula produces reasonable results.

#### E3. Update `combat-simulator.ts`

Update `buildSyntheticMonster()` to include the new fields (abilities, damage type, resistances, etc.) so batch sims use the full monster data.

---

## TESTING

1. **All existing tests pass** — 65/65 combat scenarios, 29 narrator tests, everything. Zero regressions.

2. **New tests for crit system:**
   - Nat 20 triggers d100 chart lookup, returns CritResult
   - d100 modifiers apply correctly (cap 1-100)
   - Each severity band returns appropriate entries
   - Crit immunity negates crit (just normal hit)
   - Crit resistance modifier shifts d100 roll

3. **New tests for fumble system:**
   - Nat 1 triggers confirmation roll
   - Confirmation roll that hits AC → no fumble
   - Confirmed fumble → d100 chart lookup
   - Level cap applies correctly (26+ capped at 60, 11-25 at 85)

4. **New tests for damage types:**
   - Resistance halves damage
   - Immunity zeroes damage
   - Vulnerability doubles damage
   - Normal interaction passes through unchanged
   - Condition immunity blocks status application

5. **New tests for monster abilities:**
   - Monster with abilities uses them (not just basic attack)
   - On-hit effect triggers on basic attack hit
   - Regeneration heals each turn
   - Regeneration disabled by specified damage type
   - Multi-attack resolves correct number of attacks
   - Cooldown/recharge mechanics work

6. **Smoke test after deployment:**

```bash
# Wolf knockdown test
npx ts-node server/src/scripts/batch-combat-sim.ts run --race human --class warrior --level 3 --monster Wolf --iterations 20 --notes "Verify wolf knockdown on-hit"

# Troll regen test
npx ts-node server/src/scripts/batch-combat-sim.ts run --race human --class warrior --level 10 --monster Troll --iterations 20 --notes "Verify troll regen"

# Crit visibility test
npx ts-node server/src/scripts/batch-combat-sim.ts run --race human --class warrior --level 5 --monster Goblin --iterations 50 --notes "Verify crits show in admin log with d100 chain"
```

Check admin dashboard History tab for each:
- Wolf fights should show knockdown status on some hits
- Troll fights should show regeneration each round
- Goblin fights should show at least a few crits with full d100 breakdown

---

## DEPLOYMENT

```bash
git add -A
git commit -m "feat: monster abilities + crit/fumble d100 system + damage types + CR foundation

Monster Abilities:
- MonsterAbility type and schema fields (abilities, damageType, resistances, immunities, vulnerabilities, conditionImmunities)
- Monster AI action selection in tick-combat-resolver (priority-based ability queue with cooldowns and recharge)
- Monster ability resolver with handlers: damage, status, aoe, multiattack, buff, heal, on_hit
- All 21 monsters upgraded with SRD-appropriate abilities, damage types, resistances

Crit/Fumble System:
- d100 chart-based crits with 8 charts (160 entries total)
- Severity bands: 50% Minor, 35% Major, 15% Devastating
- Modifier system: class features, weapon properties, monster traits shift d100 roll
- Fumble confirmation rolls with inverse level scaling (L26+ trivial only)
- Full decision chain logged in round JSONB (trigger, d100, modifiers, chart entry, effect)
- Admin History tab renders crit/fumble detail with expandable d100 breakdown

Damage Types:
- Resistance (half), immunity (zero), vulnerability (double) checking on all damage
- Condition immunity blocks status effect application
- DamageTypeResult logged showing interaction type

CR Foundation:
- formulaCR and simCR fields on Monster model
- CR formula utility function
- All 21 monsters assigned formula CR"
git push origin main
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## IMPORTANT NOTES

- **This is a large task.** Use subagents. Break into sequential phases (types/schema first → engine second → logger/frontend third → seed data last). Do NOT try to do everything in one pass through each file.
- **The design docs are the source of truth.** If this prompt conflicts with the design docs, the design docs win.
- **Don't invent crit/fumble chart entries.** Copy them from `docs/design/critical-hit-fumble-system.md`. They've been reviewed and approved.
- **Don't add boss-tier features yet** (legendary actions, legendary resistance, spell-like abilities). Those are Phase 4. Give boss monsters their basic abilities for now.
- **The crit system replaces the current double-dice logic.** Don't keep both — the d100 charts define their own damage multipliers.
- **Monster abilities should feel like their SRD counterparts** but simplified for auto-resolve. A Dragon breath weapon doesn't need cone targeting in 1v1 — it's just AoE damage with a DEX save.
- **Test continuously.** Run the existing test suite after each major change to catch regressions early.

## DO NOT

- Do not skip reading the three design docs — they have implementation-critical details
- Do not create new status effect types — use the existing 23 from `STATUS_EFFECT_DEFS`
- Do not modify player class abilities or class ability resolver
- Do not add abilities that require unbuilt engine features (legendary actions, swallow, phase transitions)
- Do not manually assign CR numbers — use the formula from the CR design doc
- Do not delete any existing sim data
- Do not skip the smoke tests

## SUMMARY FOR CHAT

When done, print:

```
Phase 1 Monster Engine Complete:

Monster Abilities:
- MonsterAbility type + schema fields added
- Monster AI selects abilities by priority (cooldown/recharge tracked)
- Handlers: damage, status, aoe, multiattack, buff, heal, on_hit
- 21 monsters upgraded: [list key upgrades — Wolf knockdown, Troll regen, Dragon breath, etc.]

Crit/Fumble System:
- 8 d100 charts (160 entries) — slashing/piercing/bludgeoning melee, ranged, spell + 3 fumble
- Severity: 50% Minor / 35% Major / 15% Devastating
- Modifiers: [list which modifiers are implemented]
- Fumble confirmation + level cap working
- Admin log shows full d100 decision chain

Damage Types:
- Resistance/immunity/vulnerability checking on all damage
- Condition immunity blocks status effects
- [list notable monster interactions — Skeleton bludgeoning vulnerability, Troll fire vulnerability, etc.]

CR Foundation:
- Formula CR calculated for all 21 monsters: [list a few examples]
- simCR field ready for future batch sim CR computation

Tests: [X/X passing, X new tests added]
Smoke verified: Wolf knockdown, Troll regen, crits with d100 breakdown in admin log
Deployed: tag [TAG]
```
