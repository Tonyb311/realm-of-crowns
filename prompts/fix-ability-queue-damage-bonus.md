# Fix: Ability Queue AI + handleDamageStatus Missing Bonus

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## REQUIRED READING

1. `cat docs/investigations/warrior-psion-bug-audit.md` — Full root cause analysis
2. `cat server/src/services/combat-simulator.ts` — `buildAbilityQueue()` function
3. `cat server/src/lib/class-ability-resolver.ts` — `handleDamageStatus()` and `handleAoeDamageStatus()` for comparison
4. `cat shared/src/data/skills.ts` — All class ability definitions, especially `effects.type` and `effects.damageBonus`
5. `cat server/src/services/tick-combat-resolver.ts` — `decideAction()` and `useWhen` condition evaluation

---

## CONTEXT

Phase 3 smoke testing revealed two bugs that break sim combat for most classes:

**Bug 1 — Ability queue always picks highest-tier first:** `buildAbilityQueue()` sorts by tier descending and assigns `useWhen: 'always'` to every ability. This causes:
- L40+ Warrior uses Legendary Commander (full HP heal) at 100% HP, wasting turn 1
- L18 Psion uses Dominate/Translocation (pure CC, zero damage) for turns 1-2, dies before dealing damage
- 10 of 21 specializations have non-damage abilities as their highest tier at L18
- Every class except Ranger is affected at L28+

**Bug 2 — handleDamageStatus missing damageBonus:** The single-target damage+status handler doesn't read `damageBonus: 'int'` from ability definitions. The AoE handler (`handleAoeDamageStatus`) does it correctly. This costs Psion ~5 damage per ability (INT modifier missing).

---

## WORK ITEMS

### A. Fix handleDamageStatus Missing damageBonus — `class-ability-resolver.ts`

This is the straightforward code bug. Copy the damageBonus extraction pattern from `handleAoeDamageStatus` into `handleDamageStatus`.

Find `handleDamageStatus()`. Look at how it calculates damage. It should be rolling dice but NOT adding a stat modifier bonus.

Now find `handleAoeDamageStatus()`. It correctly extracts and applies damageBonus:

```typescript
// Pattern from handleAoeDamageStatus (CORRECT):
const damageBonus = effects.damageBonus as string | undefined;
const bonusMod = damageBonus
  ? Math.max(0, getModifier(actor.stats[damageBonus as keyof CharacterStats]))
  : 0;
// bonusMod is added to the damage roll
```

Apply the same pattern to `handleDamageStatus`:
1. Extract `damageBonus` from the ability's effects
2. Calculate `bonusMod` using `getModifier(actor.stats[damageBonus])`
3. Add `bonusMod` to the damage total

**Verify:** After the fix, Mind Spike should deal 2d6+INT (avg ~12 at INT 20) instead of 2d6 (avg 7). Psychic Crush should deal 3d8+INT (avg ~18.5) instead of 3d8 (avg 13.5).

**Check for other handlers with the same bug:** Scan ALL handlers in class-ability-resolver.ts that deal damage. Verify each one correctly applies damageBonus if the ability definition specifies it. The audit found this bug in `handleDamageStatus` — there might be others. List every handler and whether it reads damageBonus.

### B. Rewrite buildAbilityQueue() — `combat-simulator.ts`

The current logic is:
```typescript
// CURRENT (broken):
sort by tier DESC → cooldown ASC
assign useWhen: 'always' to everything
```

Replace with smart queue building that considers ability type. The goal: **damage-dealing abilities should be the primary actions, with buffs used strategically and heals reserved for emergencies.**

#### B1. Classify Each Ability

First, determine each ability's combat role from its effects. Read the ability definitions in `shared/src/data/skills.ts` — each ability has an `effects` object with a `type` field. Map the `effects.type` to a combat role:

```typescript
type CombatRole = 'damage' | 'buff' | 'heal' | 'cc' | 'utility';

function classifyAbility(ability): CombatRole {
  const type = ability.effects.type;
  
  // Direct damage dealers
  if (['damage', 'damage_status', 'multi_attack', 'aoe_damage', 'aoe_damage_status'].includes(type))
    return 'damage';
  
  // Heals
  if (['heal', 'heal_status', 'full_restore'].includes(type) || ability.effects.healAmount)
    return 'heal';
  
  // Pure CC (no damage component)
  if (['control', 'cc', 'stun', 'banish', 'swap', 'dominate'].includes(type) && !ability.effects.damage)
    return 'cc';
  
  // Buffs and defensive
  if (['buff', 'self_buff', 'shield', 'reflect', 'counter'].includes(type))
    return 'buff';
  
  // Anything else
  return 'utility';
}
```

**IMPORTANT:** Check the ACTUAL `effects.type` values in `shared/src/data/skills.ts`. The list above is approximate — you MUST verify by reading the actual ability definitions. Different abilities use different type strings. Map them correctly.

Also check: some abilities that look like "damage" types might have `damage: '0'` or no damage field. Classify those as CC or utility, not damage.

#### B2. Build Smart Queue

Replace the sort-and-assign logic with a role-aware queue builder:

```typescript
function buildAbilityQueue(className: string, level: number): AbilityQueueEntry[] {
  // Get available non-passive abilities
  const available = classAbilities.filter(
    a => a.className === className && a.levelRequired <= level && a.effects.type !== 'passive'
  );
  
  // Classify each ability
  const classified = available.map(a => ({
    ability: a,
    role: classifyAbility(a),
  }));
  
  const queue: AbilityQueueEntry[] = [];
  
  // 1. OPENER: Best buff/CC ability (use on first round only)
  //    Pick highest-tier buff or CC ability
  const openerCandidates = classified
    .filter(c => c.role === 'buff' || c.role === 'cc')
    .sort((a, b) => b.ability.tier - a.ability.tier);
  
  if (openerCandidates.length > 0) {
    queue.push({
      abilityId: openerCandidates[0].ability.id,
      useWhen: 'first_round',
    });
  }
  
  // 2. SUSTAIN: All damage abilities, sorted by tier DESC then cooldown ASC
  //    These are the bread-and-butter — used every turn when available
  const damageAbilities = classified
    .filter(c => c.role === 'damage')
    .sort((a, b) => b.ability.tier - a.ability.tier || a.ability.cooldown - b.ability.cooldown);
  
  for (const da of damageAbilities) {
    queue.push({
      abilityId: da.ability.id,
      useWhen: 'always',
    });
  }
  
  // 3. EMERGENCY: Heal abilities — only when HP is low
  const healAbilities = classified
    .filter(c => c.role === 'heal')
    .sort((a, b) => b.ability.tier - a.ability.tier);
  
  for (const ha of healAbilities) {
    queue.push({
      abilityId: ha.ability.id,
      useWhen: 'low_hp',
      hpThreshold: 40,  // Use heal when below 40% HP
    });
  }
  
  // 4. FALLBACK CC: Remaining CC abilities after the opener
  //    Used when all damage abilities are on cooldown
  const remainingCC = classified
    .filter(c => c.role === 'cc')
    .filter(c => !queue.some(q => q.abilityId === c.ability.id))  // skip the opener
    .sort((a, b) => b.ability.tier - a.ability.tier);
  
  for (const cc of remainingCC) {
    queue.push({
      abilityId: cc.ability.id,
      useWhen: 'always',
    });
  }
  
  // 5. REMAINING BUFFS: Used when everything else is on cooldown
  const remainingBuffs = classified
    .filter(c => c.role === 'buff')
    .filter(c => !queue.some(q => q.abilityId === c.ability.id))  // skip the opener
    .sort((a, b) => b.ability.tier - a.ability.tier);
  
  for (const rb of remainingBuffs) {
    queue.push({
      abilityId: rb.ability.id,
      useWhen: 'always',
    });
  }
  
  return queue;
}
```

**Key design decisions:**
- ONE buff/CC opener on first round only — sets up the fight
- Damage abilities are the primary loop — `useWhen: 'always'`, tried every turn
- Heals only fire at low HP (40% threshold) — no more healing at full health
- CC and remaining buffs are fallbacks when damage is on cooldown
- If ALL abilities are on cooldown, `decideAction()` already falls through to basic attack

#### B3. Verify useWhen: 'low_hp' Works

Check `decideAction()` in tick-combat-resolver.ts. Find where it evaluates `useWhen` conditions. Verify that:
- `'low_hp'` exists as a recognized condition
- It checks current HP against a threshold (either from the queue entry's `hpThreshold` or a default)
- If `hpThreshold` is not a supported field on `AbilityQueueEntry`, check what the actual type definition is and adapt

If `useWhen: 'low_hp'` doesn't support a configurable threshold, use whatever the existing low_hp check uses (probably something like HP < 25% or HP < 50%).

#### B4. Verify useWhen: 'first_round' Works

Similarly, verify that `'first_round'` is a recognized condition and that it only triggers on round 1 of combat. If the current combat state doesn't track round number in a way that `decideAction` can read, this might need adjustment.

If `first_round` doesn't exist or doesn't work, use `'always'` for the opener but put it at the END of the damage abilities (so damage is tried first, buff is the fallback).

---

### C. Verification

#### C1. Build Check

```bash
npx tsc --build shared/tsconfig.json
npx tsc --noEmit --project server/tsconfig.json
cd client && npx tsc --noEmit
```

#### C2. Spot-Check Queue Output

Add a temporary log or write a quick test script that prints the ability queue for each class at L18 and L40:

```bash
# Create a temp script to dump queues
cat > /tmp/dump-queues.ts << 'EOF'
// Import buildAbilityQueue and print queue for each class at L18 and L40
const classes = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion'];
for (const cls of classes) {
  console.log(`\n=== ${cls.toUpperCase()} L18 ===`);
  const q18 = buildAbilityQueue(cls, 18);
  q18.forEach((e, i) => console.log(`  ${i}: ${e.abilityId} (${e.useWhen})`));
  
  console.log(`\n=== ${cls.toUpperCase()} L40 ===`);
  const q40 = buildAbilityQueue(cls, 40);
  q40.forEach((e, i) => console.log(`  ${i}: ${e.abilityId} (${e.useWhen})`));
}
EOF
```

**Verify for each class:**
- First entry at L18: damage ability (except maybe one `first_round` buff)
- First entry at L40: damage ability (NOT Legendary Commander)
- Legendary Commander appears with `useWhen: 'low_hp'`
- No damage ability is buried behind multiple buffs
- Psion at L18: Psychic Crush or Mind Spike appears before Dominate
- Warrior at L50: Frenzy appears before Berserker Rage

#### C3. Smoke Sims

Run the exact scenarios that were broken:

```bash
# Warrior L50 vs Demon — was dealing 0 damage
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 50 --monster Demon --iterations 30 \
  --notes "Fix verify: Warrior L50 should deal damage now"

# Psion L18 vs Lich — was dealing 0 damage
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class psion --level 18 --monster Lich --iterations 30 \
  --notes "Fix verify: Psion L18 should deal damage now (damageBonus + queue fix)"

# Mage L18 vs Troll — Mage was all-buff at T3
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class mage --level 18 --monster Troll --iterations 30 \
  --notes "Fix verify: Mage L18 should deal damage (was buff-only)"

# Ranger L18 vs Troll — control case, should be unaffected
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class ranger --level 18 --monster Troll --iterations 30 \
  --notes "Control: Ranger should be unaffected by queue changes"
```

Check admin dashboard — in each fight:
- Player deals damage on turns 1-2 (not just buffing)
- Heal abilities only fire when HP is low (not at 100%)
- Damage numbers include stat modifier (Psion Mind Spike avg ~12, not ~7)

#### C4. Cross-Class Quick Check

For each of the 7 classes at L18, run 10 iterations vs Troll and verify the player deals non-zero damage:

```bash
for class in warrior mage rogue cleric ranger bard psion; do
  npx ts-node server/src/scripts/batch-combat-sim.ts run \
    --race human --class $class --level 18 --monster Troll --iterations 10 \
    --notes "Cross-class check: $class L18 vs Troll"
done
```

**Every class must deal non-zero damage.** If any class still shows 0 damage dealt, investigate that class's queue.

---

## DEPLOYMENT

```bash
git add -A
git commit -m "fix: ability queue AI — damage-first priority, heal at low HP only

Root cause: buildAbilityQueue() sorted by tier DESC and set useWhen: 'always'
for every ability. This caused:
- Warriors using full HP heal at 100% HP
- Psions using pure CC (0 damage) for first 2 turns
- 10/21 specs had non-damage abilities as highest priority

Fix: Role-aware queue builder — classify abilities as damage/buff/heal/cc,
put damage abilities first with 'always', heals with 'low_hp', one buff
opener with 'first_round', remaining buffs as fallback.

Also fixed: handleDamageStatus missing damageBonus extraction (Psion abilities
were missing +INT modifier, ~5 damage per hit)"
git push origin main
az acr build --registry rocregistry --image realm-of-crowns:$(date +%Y%m%d%H%M) .
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## REPORT FORMAT

```
ABILITY QUEUE + DAMAGE BONUS FIX RESULTS
=========================================

FIX A — handleDamageStatus damageBonus:
  - damageBonus extraction added: [yes/no]
  - Other handlers checked for same bug: [list any found]
  - Mind Spike damage with fix: [observed avg]
  - Psychic Crush damage with fix: [observed avg]

FIX B — buildAbilityQueue rewrite:
  - Queue dump L18 spot check:
    - Warrior: [first 3 entries]
    - Psion: [first 3 entries]
    - Mage: [first 3 entries]
  - Queue dump L40 spot check:
    - Warrior: [first 3 entries — Legendary Commander should be low_hp]

SMOKE SIMS:
  - Warrior L50 vs Demon: player damage dealt [was 0, now X]
  - Psion L18 vs Lich: player damage dealt [was 0, now X]
  - Mage L18 vs Troll: player damage dealt [was 0, now X]
  - Ranger L18 vs Troll (control): [unchanged/affected]

CROSS-CLASS L18 vs Troll:
  - warrior: [damage dealt / 0]
  - mage: [damage dealt / 0]
  - rogue: [damage dealt / 0]
  - cleric: [damage dealt / 0]
  - ranger: [damage dealt / 0]
  - bard: [damage dealt / 0]
  - psion: [damage dealt / 0]
  ALL CLASSES DEAL DAMAGE: [yes/no]

REMAINING ISSUES:
  [any classes still broken, any edge cases found]
```

---

## DO NOT

- Do not change ability definitions in shared/src/data/skills.ts — fix the queue builder and handler only
- Do not change monster data
- Do not change combat engine mechanics (attack resolution, saves, etc.)
- Do not add new abilities
- Do not remove the basic attack fallback in decideAction() — it's the safety net when all abilities are on cooldown
- Do not change how real players (non-sim) set their combat presets — this fix is for buildAbilityQueue() only, which is used exclusively in sims
- Do not break existing combat tests
