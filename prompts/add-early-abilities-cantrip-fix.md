# Add Early-Level Abilities (L1-L7) for All Classes + Cantrip Fix

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- **Surgical changes** — don't refactor what already works.
- The combat engine is battle-tested (65/65 scenarios). Don't touch the engine. Only change ability DATA.
- This is about **class fantasy**, not balance. Balance pass comes later when all items are in.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

### The Problem

Combat balance audit (47,950 fights) revealed: **ALL class abilities require Level 10+** (except Psion which was already fixed). This means:

- Levels 1-9 have ZERO class differentiation — every class just does basic weapon attacks
- A L3 Mage and a L3 Warrior have the exact same combat experience: swing weapon, roll dice
- Casters (Mage, Psion, Bard) swing staves with STR-based attacks, which is thematically wrong
- There's no class fantasy for the first 9 levels of play — the most critical window for new player retention

### The Model: Psion Already Works

Psion was already restructured with the correct early-level pattern. Look at `shared/src/data/skills/psion.ts`:

**Telepath spec:**
- L1: Mind Spike (cooldown: 0 — cantrip, usable every round)
- L5: Thought Shield (passive defensive buff)
- L12: Psychic Crush (heavy damage + stun)
- L18: Dominate (control)
- L28: Mind Shatter (AoE)
- L40: Absolute Dominion (ultimate)

**Seer spec:**
- L1: Foresight (cooldown: 0 — defensive self-buff)
- L5: Danger Sense (passive)
- L12: Precognitive Dodge (reaction)
- L18: Third Eye (passive)
- L28: Temporal Echo (repeat action)
- L40: Prescient Mastery (ultimate)

**Nomad spec:**
- L1: Blink Strike (cooldown: 0 — teleport + attack)
- L5: Phase Step (passive)
- L12: Dimensional Pocket (phase out)
- L18: Translocation (swap)
- L28: Rift Walk (AoE)
- L40: Banishment (ultimate)

**Key patterns to replicate:**
1. Every spec gets a **L1 ability with cooldown: 0** — this is the "cantrip" that replaces basic attacks. The combat AI prefers abilities over basic attacks, so a cooldown-0 ability at L1 means casters NEVER swing a staff.
2. Every spec gets a **L5 ability** — usually a passive or defensive buff that adds depth.
3. The progression is: L1, L5, L12, L18, L28, L40 (6 abilities per spec, 18 per class).
4. L1 abilities have **no prerequisiteAbilityId** — they're entry points.
5. L5 abilities have `prerequisiteAbilityId` pointing to the L1 ability.

### What Needs to Change

The other 6 classes (Warrior, Mage, Rogue, Cleric, Ranger, Bard) currently use: L10, L14, L16, L22, L30, L40.

They need to be restructured to: **L1, L5, L10, L16, L22, L30** (keeping L40 as-is for the ultimate/passive tier 5).

Wait — Psion uses L1, L5, L12, L18, L28, L40. The exact level numbers don't need to match Psion exactly, but the principle is: **start at L1, second ability at L3-L5, then spread across the remaining progression**.

---

## THE TASK

### Part A: Restructure 6 Classes to Start at L1

For each of the 6 non-Psion classes, modify the ability files in `shared/src/data/skills/`:

#### Step 1: Shift Level Requirements

For each class, shift ALL existing abilities earlier. The goal: every specialization has a usable ability at L1 and another at L5.

**New level scheme per specialization (6 abilities):**

| Position | Old Level | New Level | Notes |
|----------|-----------|-----------|-------|
| 1st ability | 10 | **1** | Entry point, remove prerequisiteAbilityId, set cooldown: 0 if it's a damage/attack ability |
| 2nd ability | 14 | **5** | Set prerequisiteAbilityId to the 1st ability |
| 3rd ability | 16 | **10** | Keep existing prerequisite chain |
| 4th ability | 22 | **18** | Keep existing prerequisite chain |
| 5th ability | 30 | **28** | Keep existing prerequisite chain |
| 6th ability | 40 | **40** | Unchanged — capstone stays at 40 |

This matches the Psion pattern closely (L1, L5, L12, L18, L28, L40 vs L1, L5, L10, L18, L28, L40).

#### Step 2: Make L1 Abilities Combat-Defining "Cantrips"

The critical change: every spec's **L1 ability must have `cooldown: 0`** if it's a damage or attack ability. This ensures the combat AI uses it every round instead of basic weapon attacks.

Review each class's tier 1 abilities (the ones being moved from L10 to L1) and set `cooldown: 0` where appropriate:

**Warrior — already good for cantrips:**
- Berserker → Reckless Strike: Already `cooldown: 0`. ✅ Just change `levelRequired: 1`, remove `prerequisiteAbilityId` if any.
- Guardian → Shield Bash: Currently `cooldown: 3`. This is a stun — keep the cooldown, but consider: is there a basic attack in Guardian identity? If Shield Bash is the only L1, having a 3-round cooldown means rounds 2-3 are basic attacks. **Acceptable for Warrior** since basic attacks ARE the warrior identity. STR-based weapon swings are fine.
- Warlord → Rally Cry: Currently `cooldown: 5`. Buff ability, not an attack cantrip. Same logic — Warrior basic attacks between buff uses is fine.

**Mage — NEEDS cantrip fixes:**
- Elementalist → Fireball: `cooldown: 2`, AoE. Reduce to `cooldown: 0` and tone down for L1? **OR** add a new L1 cantrip like "Fire Bolt" (1d8 fire, cooldown: 0, auto-hit or uses INT) and shift Fireball to L5. **Recommendation:** Fireball is too flashy for L1. Create a new simple cantrip for L1 and push everything else down. See the detailed Mage plan below.
- Necromancer → Life Drain: `cooldown: 2`, drain. Could work at cooldown: 0 for L1 but drain at L1 might be strong. Keep cooldown: 2 — necromancer can do basic attacks between drains.
- Enchanter → Arcane Bolt: Already `cooldown: 0`, auto-hit. **Perfect cantrip.** Just change `levelRequired: 1`.

**IMPORTANT: For Mage specifically**, the Elementalist and Necromancer specs need a proper L1 cantrip. Here's the approach:

For specs where the current tier-1 ability is too complex for L1 (like Fireball being AoE at L1), **add a NEW simpler L1 ability** and shift the existing ones down by one slot:

```
Elementalist:
- NEW L1: "Fire Bolt" — 1d8 fire damage, uses INT, cooldown: 0 (cantrip)
- Fireball moves from L10 to L5 (reduce dice: 3d6 → 2d6 at L5, still AoE)
- Frost Lance stays at L10 (was L14→L10)
- Chain Lightning at L16 (was L16)
- Elemental Shield at L22 (was L22)
- Meteor Strike at L28 (was L30)
- Arcane Mastery stays at L40

That's 7 abilities for Elementalist. That's fine — Psion specs also have 6, having 7 is acceptable.
```

Actually, simpler approach: **DON'T add new abilities.** Instead, modify the existing first ability to be cantrip-appropriate:

```
Elementalist:
- Fireball → rename to "Fire Bolt" at L1, change to single-target 1d8 fire, cooldown: 0
  Then the EXISTING Chain Lightning, Elemental Shield, etc. shift up
  BUT then we lose Fireball entirely...
```

**Best approach: Keep all existing abilities, just shift levels. If the L1 ability has a cooldown > 0, that's OK for some classes.** The key insight: the combat AI will use the ability on cooldown and do basic attacks in between. For casters, the basic attack also needs fixing (Part B below), so even between ability uses they'll use their casting stat.

**So the rule is:**
- If the L1 ability is a direct damage attack (Reckless Strike, Backstab, Arcane Bolt), try to make it `cooldown: 0`
- If the L1 ability is a buff/debuff/special (Rally Cry, Shield Bash, Charming Words), keep its cooldown — the class fantasy is using the ability strategically, not spamming it

#### Step 3: Apply to Each Class File

Modify these files in `shared/src/data/skills/`:

**`warrior.ts`** — Shift levels: 10→1, 14→5, 16→10, 22→18, 30→28, 40→40
- Reckless Strike (Berserker): L1, cooldown: 0 ✅ (already 0)
- Shield Bash (Guardian): L1, keep cooldown: 3
- Rally Cry (Warlord): L1, keep cooldown: 5
- Remove `prerequisiteAbilityId` from all new-L1 abilities
- Update prerequisite chains: L5 abilities point to L1 abilities

**`mage.ts`** — Same level shift
- Fireball (Elementalist): L1, reduce cooldown from 2 to 0, reduce dice from 3d6 to 1d8, change from `aoe_damage` to `damage` (single target at L1 — it's more of a "Fire Bolt" at this level). Update name to "Fire Bolt" and description to "Hurl a bolt of fire at a single enemy." **Keep the original Fireball concept for a later ability** — when Chain Lightning unlocks at L10, Fire Bolt is still the reliable cantrip while Chain Lightning is the AoE.
  - Actually, WAIT. Don't rename. The combat engine resolves abilities by their `effects.type`. If we change `type: 'aoe_damage'` to `type: 'damage'`, the engine needs to support that type for this ability. **Check what effect types the combat engine actually resolves before changing.** If the engine handles `aoe_damage` fine in 1v1 (just hits the single target), leave it as `aoe_damage` and just reduce the dice. Safest approach.
  - **Safest: Keep Fireball as-is except `levelRequired: 1, cooldown: 0`. Reduce `diceCount` from 3 to 1.** If 1d6 fire AoE at L1 feels wrong thematically, the effect is the same as 1d6 single-target in a 1v1 encounter (which is all road encounters are).
- Life Drain (Necromancer): L1, keep cooldown: 2 (drain is strategic, not a cantrip)
- Arcane Bolt (Enchanter): L1, cooldown: 0 ✅ (already 0, auto-hit — perfect cantrip)

**`rogue.ts`** — Same level shift
- Backstab (Assassin): L1, keep cooldown: 2 (burst + crit is strategic)
- Pilfer (Thief): L1, keep cooldown: 3 (stealing is situational)
- Riposte (Swashbuckler): L1, keep cooldown: 2 (counter-attack is reactive)
- Note: Rogue doesn't need a cantrip — DEX-based basic attacks with daggers ARE the rogue fantasy. Between abilities, basic attacking is fine.

**`cleric.ts`** — Same level shift
- Healing Light (Healer): L1, keep cooldown: 2 (healing is strategic)
- Smite (Paladin): L1, reduce cooldown from 1 to 0 (WIS-based holy damage cantrip — paladin fantasy is smiting every round)
- Denounce (Inquisitor): L1, keep cooldown: 3 (debuff is strategic)

**`ranger.ts`** — Same level shift
- Call Companion (Beastmaster): L1, keep cooldown: 6 (summon is strategic)
- Aimed Shot (Sharpshooter): L1, reduce cooldown from 2 to 0 (DEX-based aimed shot as cantrip — archer fantasy)
- Lay Trap (Tracker): L1, keep cooldown: 3 (traps are tactical)

**`bard.ts`** — Same level shift
- Charming Words (Diplomat): L1, keep cooldown: 3 (debuff is tactical)
- War Song (Battlechanter): L1, keep cooldown: 4 (buff is tactical)
- Analyze (Lorekeeper): L1, keep cooldown: 2 (study is tactical)
- Note: Bard doesn't need a cantrip — CHA-based basic attacks between songs is fine.

#### Step 4: Verify No Prerequisite Chains Break

After shifting levels, verify:
1. Every L1 ability has NO `prerequisiteAbilityId` (or remove it if present)
2. Every L5 ability's `prerequisiteAbilityId` points to the correct L1 ability ID
3. The chain continues: L10→L5, L18→L10 or L5, L28→previous, L40→previous
4. No circular dependencies

Check that the existing prerequisite IDs are still correct — e.g., `war-ber-2` (Blood Rage) has `prerequisiteAbilityId: 'war-ber-1'` (Reckless Strike). Since we're not changing IDs, just levels, the chain should remain intact. Just verify.

---

### Part B: Fix Caster Basic Attacks in Live Combat

The batch simulator already maps caster weapons to INT/WIS/CHA, but the **live game** (road encounters via `tick-combat-resolver.ts`) still gives casters STR-based staff attacks.

This needs fixing so that between ability cooldowns, casters still attack with their casting stat.

#### Option 1: Class-Based Weapon Stat Override (Recommended)

In the combat system, wherever a character's weapon attack modifier is determined, add a class-based override:

```typescript
// If the character's class is a caster, override weapon attack/damage stat
function getEffectiveAttackStat(character: Character, weapon: WeaponInfo): StatKey {
  const CASTER_STAT_MAP: Record<string, StatKey> = {
    mage: 'int',
    psion: 'int',
    cleric: 'wis',
    bard: 'cha',
  };
  return CASTER_STAT_MAP[character.class] || weapon.attackModifierStat || 'str';
}
```

Find where the combat system reads `weapon.attackModifierStat` or equivalent and apply this override. Check:
- `server/src/lib/combat-engine.ts` — where attack rolls are calculated
- `server/src/lib/tick-combat-resolver.ts` — where combatants are built from characters
- `createCharacterCombatant()` — where character data becomes a combatant

**Do NOT modify the combat engine's `resolveTurn()` function.** Instead, set the correct stat on the combatant BEFORE it enters combat. The best place is wherever `createCharacterCombatant()` builds the weapon info.

#### Option 2: Update Weapon Templates (Alternative)

Update staff/wand ItemTemplates in the database seeds to include `stats.attackModifierStat: 'int'`. But this doesn't solve the problem because:
- A mage could pick up a sword (still STR)
- Different caster classes use different stats (INT vs WIS vs CHA)
- The class should determine the stat, not the weapon

**Go with Option 1.** The class determines attack stat regardless of weapon.

#### For Non-Caster Hybrids:

- **Rogue:** Uses DEX. Check if this is already handled (rogues use daggers/shortswords which may already be DEX-based via `finesse` property or similar). If not, add `rogue: 'dex'` to the override map.
- **Ranger:** Uses DEX. Same check and override.
- **Warrior:** Uses STR. Default behavior, no change needed.

The full override map:
```typescript
const CLASS_ATTACK_STAT: Record<string, StatKey> = {
  warrior: 'str',
  rogue: 'dex',
  ranger: 'dex',
  mage: 'int',
  psion: 'int',
  cleric: 'wis',
  bard: 'cha',
};
```

---

### Part C: Verify Psion is Unaffected

Psion already has the correct L1/L5/L12/L18/L28/L40 progression. **Do not modify `psion.ts`.** Just verify it's still intact after all other changes.

---

## TESTING

### 1. Data Integrity Tests

After modifying ability files, verify:

```bash
# Check that all abilities load without errors
npx ts-node -e "
  const { ALL_ABILITIES, ABILITIES_BY_CLASS, VALID_CLASSES } = require('./shared/src/data/skills');
  console.log('Total abilities:', ALL_ABILITIES.length);
  for (const cls of VALID_CLASSES) {
    const abilities = ABILITIES_BY_CLASS[cls];
    const l1 = abilities.filter(a => a.levelRequired <= 1);
    const l5 = abilities.filter(a => a.levelRequired <= 5);
    console.log(cls + ': ' + abilities.length + ' abilities, ' + l1.length + ' at L1, ' + l5.length + ' by L5');
  }
"
```

**Expected:** Every class has at least 3 abilities at L1 (one per spec) and at least 6 by L5 (two per spec).

### 2. Combat Engine Tests

Run the existing 65 combat test scenarios:

```bash
npm test -- --grep combat
```

These MUST still pass. If any fail, the level/prerequisite changes broke something — investigate before proceeding.

### 3. Batch Simulator Verification

Run a quick batch to confirm abilities fire at L1:

```json
{
  "matchups": [
    {"race": "HUMAN", "class": "MAGE", "level": 1, "opponent": "Goblin", "iterations": 100},
    {"race": "HUMAN", "class": "WARRIOR", "level": 1, "opponent": "Goblin", "iterations": 100},
    {"race": "HUMAN", "class": "ROGUE", "level": 1, "opponent": "Goblin", "iterations": 100},
    {"race": "HUMAN", "class": "MAGE", "level": 5, "opponent": "Goblin", "iterations": 100},
    {"race": "HUMAN", "class": "CLERIC", "level": 5, "opponent": "Orc Warrior", "iterations": 100}
  ],
  "persist": false
}
```

**Expected:**
- Mage L1 vs Goblin: Should be significantly higher than the previous 46% (was using STR staff, now uses INT + Fire Bolt/Arcane Bolt)
- All classes should show > 0% win rate improvement from having abilities
- L5 matchups should show second-tier abilities being used

### 4. Live Combat Verification

If possible, test a road encounter with a Mage character to confirm:
- The Mage uses INT for attack rolls (not STR)
- The Mage uses abilities (Fire Bolt, Arcane Bolt, Life Drain) instead of just basic attacking
- Combat log shows ability names, not just "attacks with Staff"

---

## DEPLOYMENT

```bash
git add -A
git commit -m "feat: add early-level abilities (L1-L7) for all classes + caster attack stat fix

- Restructure 6 classes to match Psion's early-level pattern (L1/L5/L10/L18/L28/L40)
- Every specialization now has a usable ability at L1 and L5
- Caster classes use INT/WIS/CHA for attack rolls instead of STR
- Zero combat engine changes — data only
- Combat tests still passing (65/65)"
git push origin main
```

Build and deploy:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify the combat engine (`resolveTurn`, `createCombatState`, etc.) — it's battle-tested
- Do not modify `psion.ts` — it already has the correct pattern
- Do not add NEW abilities — only shift existing ones to earlier levels (exception: if a caster spec has no viable L1 cantrip, a minor adjustment to the tier 1 ability's stats is acceptable)
- Do not worry about balance — this is a class fantasy fix, not a balance pass. Numbers will be tuned later when all items are in the game.
- Do not change ability IDs — only `levelRequired`, `cooldown` (for cantrips), and `prerequisiteAbilityId` (for L1 entries)
- Do not remove any abilities
- Do not change ability `effects` objects unless absolutely necessary for L1 appropriateness (e.g., reducing Fireball from 3d6 to 1d6 at L1 is acceptable; changing its effect type is risky)

## SUMMARY FOR CHAT

When done, print:
```
Early-level abilities + caster attack fix deployed:
- 6 classes restructured: L10→L1, L14→L5, L16→L10, L22→L18, L30→L28, L40→L40
- Every spec now has a usable ability at L1 (was L10)
- Cantrip-style abilities (cooldown: 0) at L1 for: [list which specs got cooldown 0]
- Caster attack stat override: Mage→INT, Psion→INT, Cleric→WIS, Bard→CHA, Rogue→DEX, Ranger→DEX
- Psion unchanged (already had correct pattern)
- Combat tests: [X]/65 passing
- Batch verification: Mage L1 vs Goblin [X]% (was 46%), Warrior L1 vs Goblin [X]%
Deployed: tag [TAG]
```
