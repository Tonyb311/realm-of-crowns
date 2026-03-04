# Warrior AI + Psion Zero Damage Bug Audit

**Date:** 2026-03-03
**Scope:** Two functional bugs discovered during Phase 3 smoke testing that poison all balance data

---

## 1. Warrior AI Bug

### Warrior Abilities by Level

All 3 specs are available to every warrior in the sim (no spec selection). Sorted by tier:

| Tier | Level | ID | Name | Spec | Type | Damage | CD |
|------|-------|----|------|------|------|--------|----|
| 1 | 1 | war-ber-1 | Reckless Strike | Berserker | damage | +5 bonus dmg | 0 |
| 1 | 1 | war-gua-1 | Shield Bash | Guardian | damage+stun | 3 flat + stun 1rd | 3 |
| 1 | 1 | war-war-1 | Rally Cry | Warlord | buff | — | 5 |
| 2 | 5 | war-ber-2 | Blood Rage | Berserker | buff | atk scales w/ missing HP | 8 |
| 2 | 5 | war-gua-2 | Fortify | Guardian | buff | +5 AC, 4rds | 6 |
| 2 | 5 | war-war-2 | Commanding Strike | Warlord | damage | +3 bonus dmg | 3 |
| 2 | 10 | war-gua-3 | Taunt | Guardian | CC | force target, 2rds | 4 |
| 2 | 10 | war-ber-3 | Cleave | Berserker | AoE damage | 0.8x to all adj | 3 |
| 2 | 10 | war-war-3 | Tactical Advance | Warlord | buff | extra action this turn | 8 |
| 3 | 18 | war-ber-4 | Frenzy | Berserker | multi-attack | 2 strikes, -3 acc | 4 |
| 3 | 18 | war-gua-4 | Shield Wall | Guardian | buff | 50% DR, 2rds | 8 |
| 3 | 18 | war-war-4 | Inspiring Presence | Warlord | **passive** | 3 HP regen/rd | 0 |
| 4 | 28 | war-ber-5 | Berserker Rage | Berserker | buff | CC immune, +15 atk, 3rds | 12 |
| 4 | 28 | war-gua-5 | Iron Bulwark | Guardian | buff | 30% reflect, 3rds | 10 |
| 4 | 28 | war-war-5 | Warlord's Decree | Warlord | buff | next 3 atks auto-hit, 3rds | 10 |
| 5 | 40 | war-ber-6 | Undying Fury | Berserker | **passive** | cheat death 1/combat | 0 |
| 5 | 40 | war-gua-6 | Unbreakable | Guardian | **passive** | bonus HP = 20% CON | 0 |
| **5** | **40** | **war-war-6** | **Legendary Commander** | **Warlord** | **heal** | **full HP restore, 1/combat** | **0** |

### decideAction() Logic for Characters

**File:** `server/src/services/tick-combat-resolver.ts` lines 150-350

Decision path (strict priority chain):

```
1. Retreat check → flee if HP < threshold or outnumbered or round limit
2. Ability queue iteration (in order):
   for each entry in presets.abilityQueue:
     - Check useWhen condition (always/low_hp/high_hp/first_round/outnumbered)
     - Check cooldown (skip if on cooldown)
     - If both pass → dispatch class_ability → RETURN (turn ends after resolution)
3. Item usage rules → use item if conditions met
4. Default → basic attack on weakest enemy
```

**Key behavior:** Only ONE action per turn. When a class_ability is dispatched, the turn resolves that ability and ends. No automatic follow-up attack (unless the ability itself grants `extraAction`).

### Sim Setup (buildSyntheticPlayer for Warrior)

**File:** `server/src/services/combat-simulator.ts` lines 341-355

```typescript
function buildAbilityQueue(className, level) {
  const available = classAbilities.filter(
    a => a.levelRequired <= level && a.effects.type !== 'passive'
  );
  available.sort((a, b) => b.tier - a.tier || a.cooldown - b.cooldown);
  return available.map(a => ({
    abilityId: a.id,
    useWhen: 'always',   // ← HARDCODED for every ability
  }));
}
```

- **Sorts by tier descending** (highest tier first), then cooldown ascending
- **All abilities get `useWhen: 'always'`** — no conditional logic
- **Passives correctly excluded** (Undying Fury, Unbreakable, Inspiring Presence filtered out)
- **No class-specific variations** — same logic for all 7 classes

**L50 Warrior queue (first 5):**

| Priority | Ability | Tier | Type | Problem? |
|----------|---------|------|------|----------|
| 0 | **Legendary Commander** | **5** | **heal (full restore)** | **YES — used at 100% HP** |
| 1 | Berserker Rage | 4 | buff | Defensive, no damage |
| 2 | Iron Bulwark | 4 | buff | Defensive, no damage |
| 3 | Warlord's Decree | 4 | buff | Auto-hit setup, no damage |
| 4 | Frenzy | 3 | multi-attack | **First damage ability** |

### Root Cause

**The ability queue builder hardcodes `useWhen: 'always'` for every ability.** There is no logic to:
- Check if a heal ability is needed (HP < max)
- Differentiate buff/heal abilities from damage abilities
- Skip non-damage abilities when the player is healthy

At L50, the queue evaluates Legendary Commander first (tier 5, CD 0). `useWhen: 'always'` → `shouldUse = true`. Cooldown 0 → available. The warrior uses a full HP restore at 100% HP, the turn ends, and no attack is made. Every. Single. Turn.

After using it once (1 use per combat), it goes on permanent cooldown and the warrior falls through to Berserker Rage (tier 4, buff), then Iron Bulwark (tier 4, buff), then Warlord's Decree (tier 4, buff). The warrior cycles through 3-4 non-damage buffs before ever reaching Frenzy (tier 3, the first damage ability at priority 4).

### At What Level Does It Start?

| Level Range | Highest Queue Entry | Type | Broken? |
|-------------|-------------------|------|---------|
| 1-4 | Reckless Strike (T1) | damage | No |
| 5-9 | Blood Rage (T2) | buff | **YES** — buff first |
| 10-17 | Cleave/Tactical Advance (T2) | mixed | **Partial** — depends on CD sort |
| 18-27 | Frenzy (T3) | damage | No — Frenzy wins tie at CD 4 |
| 28-39 | Berserker Rage (T4) | buff | **YES** — buff first |
| 40-50 | Legendary Commander (T5) | heal | **YES** — heal at full HP |

**The bug exists at L5+ wherever the highest-tier ability is a buff/heal.** It's most severe at L28+ (tier 4 buffs dominate) and catastrophic at L40+ (Legendary Commander wastes first turn on full HP heal).

At L18 specifically, Frenzy (T3, CD 4) sorts before Shield Wall (T3, CD 8) and Tactical Advance (T3, CD 8) within tier 3, so the warrior DOES attack. But the buff problem still exists at other level ranges.

### Other Classes Affected?

**YES.** Every class that has a non-damage ability as its highest-tier entry is affected:

| Class | Spec | Highest Active L18 | Type | Affected? |
|-------|------|--------------------|------|-----------|
| Warrior | Berserker | Frenzy (T3) | damage | No |
| Warrior | Guardian | Shield Wall (T3) | buff | **Yes** |
| Warrior | Warlord | Tactical Advance (T2) | buff | **Yes** |
| Ranger | All 3 | T3 damage abilities | damage | No |
| Cleric | Healer | Divine Shield (T3) | buff | **Yes** |
| Cleric | Paladin | Judgment (T3) | damage | No |
| Cleric | Inquisitor | Purging Flame (T3) | damage | No |
| Mage | Elementalist | Elemental Shield (T3) | buff | **Yes** |
| Mage | Necromancer | Bone Armor (T3) | buff | **Yes** |
| Mage | Enchanter | Arcane Siphon (T3) | debuff | **Yes** |
| Rogue | Assassin | Ambush (T3) | damage | No |
| Rogue | Thief | Disengage (T3) | flee | **Yes** |
| Rogue | Swashbuckler | Flurry (T3) | damage | No |
| Psion | Telepath | Dominate (T4) | CC | **Yes** |
| Psion | Seer | Third Eye (T4) | passive | N/A (filtered) |
| Psion | Nomad | Translocation (T4) | CC | **Yes** |
| Bard | Diplomat | Diplomat's Gambit (T3) | special | **Yes** |
| Bard | Battlechanter | Shatter (T3) | damage | No |
| Bard | Lorekeeper | Arcane Insight (T3) | buff | **Yes** |

**Note:** The sim doesn't pick one specialization — ALL abilities from all specs are queued. So the actual queue mixes abilities from all 3 specs, sorted by tier then cooldown. The effective queue depends on which tier-matched abilities sort first.

---

## 2. Psion Zero Damage

### Psion Abilities by Level

| Tier | Level | ID | Name | Spec | Type | Damage | Save | Status |
|------|-------|----|------|------|------|--------|------|--------|
| 1 | 1 | psi-tel-1 | Mind Spike | Telepath | damage+status | 2d6+INT psychic | INT | weakened 2rd |
| 1 | 1 | psi-see-1 | Foresight | Seer | buff | — | — | +2 AC/saves 3rd |
| 1 | 1 | psi-nom-1 | Blink Strike | Nomad | teleport+atk | weapon+2+INT | — | — |
| 2 | 5 | psi-tel-2 | Thought Shield | Telepath | **passive** | — | — | +2 mental saves |
| 2 | 5 | psi-see-2 | Danger Sense | Seer | **passive** | — | — | no surprise, +2 init |
| 2 | 5 | psi-nom-2 | Phase Step | Nomad | **passive** | — | — | +3 AC vs opp atk |
| 3 | 12 | psi-tel-3 | Psychic Crush | Telepath | damage+status | 3d8+INT psychic | WIS | stunned 1rd |
| 3 | 12 | psi-see-3 | Precognitive Dodge | Seer | reaction | — | — | negate 1 atk, 1/combat |
| 3 | 12 | psi-nom-3 | Dimensional Pocket | Nomad | phase | — | — | untargetable 1rd |
| **4** | **18** | **psi-tel-4** | **Dominate** | **Telepath** | **CC** | **— (0 damage)** | **WIS** | **dominate 1rd** |
| **4** | **18** | **psi-see-4** | **Third Eye** | **Seer** | **passive** | — | — | see invisible |
| **4** | **18** | **psi-nom-4** | **Translocation** | **Nomad** | **CC** | **— (0 damage)** | **INT** | **stun 1rd / +2 AC** |
| 5 | 28 | psi-tel-5 | Mind Shatter | Telepath | AoE dmg+status | 3d6+INT psychic | WIS | weakened 2rd |
| 5 | 28 | psi-nom-5 | Rift Walk | Nomad | AoE dmg+status | 2d8+INT psychic | WIS | slowed 2rd |
| 6 | 40 | psi-tel-6 | Absolute Dominion | Telepath | control | 2d10 on save pass | WIS | dominion 2rd |
| 6 | 40 | psi-nom-6 | Banishment | Nomad | banish | 4d6/2d6 psychic | INT | banish 3rd |

### Damage vs CC Breakdown (L18 Available)

| Category | Count | Abilities |
|----------|-------|-----------|
| **Deal damage** | 3 | Mind Spike (2d6+INT), Psychic Crush (3d8+INT), Blink Strike (weapon+INT) |
| **Pure CC (0 damage)** | 2 | Dominate, Translocation |
| **Defensive/utility** | 2 | Precognitive Dodge, Dimensional Pocket |
| **Buff** | 1 | Foresight |
| **Passive (filtered)** | 4 | Thought Shield, Danger Sense, Phase Step, Third Eye |

### L18 Psion Ability Queue (Actual)

Built by `buildAbilityQueue('psion', 18)`:

| Priority | Ability | Tier | CD | Type | Deals Damage? |
|----------|---------|------|----|------|--------------|
| **0** | **Dominate** | **4** | **1** | **CC** | **NO** |
| **1** | **Translocation** | **4** | **1** | **CC** | **NO** |
| 2 | Psychic Crush | 3 | 1 | damage+status | YES |
| 3 | Precognitive Dodge | 3 | 1 | reaction | NO |
| 4 | Dimensional Pocket | 3 | 1 | phase | NO |
| 5 | Mind Spike | 1 | 0 | damage+status | YES |
| 6 | Foresight | 1 | 0 | buff | NO |
| 7 | Blink Strike | 1 | 0 | teleport+atk | YES |

### Turn-by-Turn Trace (L18 Psion vs Lich)

Average fight lasts 2.6 rounds. The psion gets ~3 turns:

```
Turn 1: Dominate (priority 0, T4, CD 1) → CC, 0 damage. Lich may use LR.
Turn 2: Dominate on CD → Translocation (priority 1, T4, CD 1) → CC, 0 damage.
Turn 3: Both on CD → Psychic Crush (priority 2, T3) → 3d8 damage...
         BUT: psion is likely already dead (Lich does ~40+ DPR with 3 LA + fear aura)
```

**The psion dies before ever reaching a damage ability in its queue.**

### Interaction with Lich Defenses

| Lich Defense | Effect on Psion |
|-------------|-----------------|
| 3 Legendary Resistance | Negates status effects (stun, dominate) but NOT damage |
| Condition immunities (poisoned, frightened, charmed) | Does NOT block psychic, weakened, stunned, dominated |
| 3 Legendary Actions | 4-6 extra attacks per round → psion dies fast |
| Fear Aura | Psion saves against fear; if failed, -2 on all attacks/abilities |

**LR does NOT negate damage.** When LR overrides a save:
- Status effect (stun, dominate) → NOT applied
- Damage → STILL applied in full

So Psychic Crush vs Lich with LR = full 3d8+INT damage, no stun. The damage SHOULD get through.

### Additional Code Bug: Missing damageBonus

**File:** `server/src/lib/class-ability-resolver.ts` — `handleDamageStatus` (line 486-537)

The handler for `damage_status` abilities (Mind Spike, Psychic Crush) does NOT read the `damageBonus: 'int'` field from the ability definition. It rolls dice but never adds the INT modifier.

```
Expected: Mind Spike = 2d6 + 5 (INT mod) = avg 12
Actual:   Mind Spike = 2d6            = avg 7

Expected: Psychic Crush = 3d8 + 5 (INT mod) = avg 18.5
Actual:   Psychic Crush = 3d8                = avg 13.5
```

**Contrast:** `handleAoeDamageStatus` (line 1552) DOES correctly read and apply `damageBonus`. This is inconsistent — the single-target handler is bugged, the AoE handler works.

### Root Cause

**Two compounding issues:**

1. **Queue ordering (design issue):** The two highest-priority abilities (Dominate T4, Translocation T4) are pure CC with zero damage. The psion spends its first 2 turns dealing no damage, and dies before reaching Psychic Crush at priority 2.

2. **Missing damageBonus (code bug):** Even when damage abilities fire, they're missing the +INT modifier (~5 damage). `handleDamageStatus` doesn't read `damageBonus: 'int'`, while `handleAoeDamageStatus` does. This reduces Psychic Crush from avg 18.5 to avg 13.5.

3. **Extremely short fights:** Lich with 3 LA + fear aura + 3d6+5 bolt kills psion (75 HP at L18) in 2-3 rounds. The psion rarely survives to turn 3.

### Does Psion Deal Damage to Other Monsters?

**Likely very little.** Against weaker monsters (Goblin, Wolf), fights are shorter — the psion would use Dominate/Translocation (CC) on turn 1-2 and the monster might die from weapon auto-attacks if they ever reach the fallback. But against anything that survives 3+ turns, the CC-first queue ordering means most turns are wasted.

---

## 3. Cross-Class Check

| Class | L18 Damage Ability? | First Queue Entry | Type | Issue? |
|-------|--------------------|--------------------|------|--------|
| **Warrior** | Frenzy (T3) | Frenzy | multi-attack | **No at L18** (but YES at L28+ with buff-first T4) |
| **Ranger** | Headshot/Bestial Fury/Explosive Trap | damage ability | damage | **No** |
| **Cleric** | Judgment (T3) | Judgment or Divine Shield | mixed | **Partial** — depends on CD sort |
| **Mage** | (no T3 damage) | Elemental Shield / Bone Armor | buff | **YES** — all T3 are non-damage |
| **Rogue** | Ambush (T3) | Ambush or Disengage | mixed | **Partial** — Thief spec interferes |
| **Psion** | Psychic Crush (T3) | Dominate (T4, CC) | CC | **YES** — T4 CC before T3 damage |
| **Bard** | Shatter (T3) | Shatter or Diplomat's Gambit | mixed | **Partial** — Diplomat spec interferes |

**Most affected at L18:** Mage (all specs non-damage at T3), Psion (T4 CC blocks T3 damage)
**Most affected at L28+:** Warrior, Cleric, Mage, Bard (T4 buffs dominate queue)
**Unaffected:** Ranger (all specs have damage at every tier)

---

## 4. Recommended Fixes

### Fix 1: Smart `useWhen` Assignment (Medium effort, high impact)

In `buildAbilityQueue()`, assign `useWhen` based on ability type:

```
heal abilities      → useWhen: 'low_hp', hpThreshold: 50
buff/defensive      → useWhen: 'first_round' or 'high_hp'
CC abilities        → useWhen: 'always' (but lower priority than damage)
damage abilities    → useWhen: 'always'
```

This prevents heals at full HP and ensures damage abilities get picked in most turns.

### Fix 2: Interleave Damage with Buffs (Low effort, medium impact)

Change the sort in `buildAbilityQueue()` to group damage abilities before buffs within the same tier:

```
Sort: tier DESC → isDamage DESC → cooldown ASC
```

This ensures that within each tier, damage abilities are tried before buffs.

### Fix 3: Fix `handleDamageStatus` Missing damageBonus (Low effort, direct bug fix)

In `class-ability-resolver.ts`, update `handleDamageStatus` to read and apply `damageBonus` the same way `handleAoeDamageStatus` does:

```typescript
const damageBonus = effects.damageBonus as string | undefined;
const bonusMod = damageBonus
  ? Math.max(0, getModifier(actor.stats[damageBonus]))
  : 0;
// Apply bonusMod to damage roll
```

This is a straightforward bug fix — the AoE handler already implements it correctly.

### Fix 4: Add Ability Type Awareness to Queue (Higher effort, best long-term fix)

Tag each ability definition with a combat role: `'damage' | 'buff' | 'heal' | 'cc' | 'utility'`. Use this tag in `buildAbilityQueue()` to build smarter queues:

1. **Opener:** 1 buff/cc ability with `useWhen: 'first_round'`
2. **Sustain:** Damage abilities with `useWhen: 'always'`
3. **Emergency:** Heals with `useWhen: 'low_hp'`

This is the most robust fix but requires updating all ability definitions.
