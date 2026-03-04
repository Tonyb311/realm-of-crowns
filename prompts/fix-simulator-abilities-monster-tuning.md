# Fix: Wire Class Abilities into Batch Combat Simulator + Monster Tuning

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed.
3. **Delegate & Execute** — Assign work items to each teammate.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- **Surgical changes** — don't refactor what already works.
- The combat engine is battle-tested (65/65 scenarios). Don't touch its internals.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

### Balance Audit Results (44,150 fights)

The batch combat simulator works perfectly but has a critical gap: **it uses "attack first enemy" AI instead of the real ability/stance system.** This means:

- Mages swing staves with STR 8 instead of casting INT-based spells → 0% win rate
- Psions swing staves instead of using CHA/WIS-based abilities → 0% win rate  
- Bards swing staves instead of using CHA-based abilities → ~5% win rate
- Warriors never use Shield Wall, Reckless Strike, or any combat abilities
- No class uses any abilities at all — every fight is basic attack vs basic attack

**Note on classes:** All 7 classes are released (no class gating exists): Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion. Verify exact names from `VALID_CLASSES` in `shared/src/data/skills/index.ts`.

**Note on races:** Only 7 core races are released. The batch simulator should use actual race IDs: HUMAN, ELF, DWARF, HARTHFOLK, ORC, NETHKIN, DRAKONID. Do not test Common/Exotic races (Goliath, Faefolk, etc.) — they are locked behind ContentRelease.

The combat engine already supports all of this (65/65 test scenarios pass). The `tick-combat-resolver.ts` uses `decideAction()` with stance-aware AI and ability queues. The batch simulator just bypasses all of it.

### Separate Issue: Monster Tuning

The audit also found:
- Tier 2 monsters are overtuned for L5 (Warriors only 37% win rate)
- Bandit is too hard for L1 (10% win rate for Warriors — should be ~40%)
- Orc Warrior (L6) and Dire Wolf (L8) have nearly identical difficulty

---

## THE TASK

Two parts: (A) wire abilities into the simulator, (B) tune monster stats.

### Part A: Wire Class Abilities into Batch Simulator

#### Step 1: Understand the Working Implementation

Before changing anything, study how `tick-combat-resolver.ts` runs combat WITH abilities. This is the reference implementation. Find:

1. **How combatants get their ability list.** Search for where class abilities are loaded — likely from `shared/src/data/skills/` or the `ABILITIES_BY_CLASS` constant. How does the resolver know what abilities a L5 Warrior has?

2. **How `decideAction()` works.** This is the AI that picks between basic attack, abilities, defend, flee, item use. Where is it defined? What inputs does it need? (combatant state, available abilities, stance/preset, enemy state)

3. **How abilities are passed to `resolveTurn()`.** The engine's `resolveTurn(state, action, context, racialContext?)` takes an action and context. How does the resolver build the `action` and `context` objects for ability use?

4. **What `CombatPreset` / stance system looks like.** The tick resolver uses presets that control behavior (aggressive, defensive, balanced). How are these defined?

5. **How spell slots work.** Casters have spell slots. How does the resolver track and consume them?

Document these findings briefly in chat, then proceed.

#### Step 2: Add Ability Data to Synthetic Combatants

In `server/src/services/combat-simulator.ts` (the file created by the batch simulator prompt), update `buildSyntheticPlayer()`:

1. **Load class abilities** for the given class and level. Use the same data source as `tick-combat-resolver.ts` — likely `ABILITIES_BY_CLASS[className]` filtered by `levelRequired <= level`.

2. **Add abilities to the combatant object.** Check what fields the combat engine expects on a `Combatant` for ability resolution. It might be:
   - `abilities: AbilityDefinition[]`
   - `spellSlots: { [level: number]: number }`
   - `knownSpells: string[]`
   - Or something else — check the `Combatant` interface and what `resolveTurn` reads

3. **Set spell slots for casters.** Use a standard allocation:
   - Mage/Warlock/Psion: Full caster slots
   - Cleric: Full caster slots  
   - Ranger/Bard: Half caster slots
   - Warrior/Rogue/Paladin: No spell slots (or minimal for Paladin)
   
   Check how `tick-combat-resolver.ts` or `road-encounter.ts` builds spell slots for real characters and replicate that logic.

4. **Set a default combat preset/stance.** The tick resolver uses presets. Give synthetic combatants a sensible default:
   - Warriors/Paladins: "balanced" or "aggressive" stance
   - Rogues/Rangers: "aggressive" (prioritize damage)
   - Casters: whatever stance triggers spell use
   
   Again, mirror whatever `tick-combat-resolver.ts` does.

#### Step 3: Use the Real Combat AI in the Fight Loop

In the batch simulation fight loop (the part that currently runs `resolveTurn` with hardcoded "attack first enemy"):

1. **Replace the hardcoded action selection** with a call to `decideAction()` (or whatever the tick resolver uses to pick actions).

2. **Pass the full context** that `decideAction()` needs — combatant state, available abilities, stance, enemy state, spell slots remaining.

3. **Handle ability cooldowns** — abilities have per-combat cooldowns. The resolver likely tracks these. Ensure the batch loop resets cooldowns between fights but tracks them within a fight.

4. **Handle racial abilities** if feasible. The resolver uses `RacialCombatTracker`. If this is easy to wire in (just needs race name and level), include it. If it requires complex DB lookups, skip it for now — class abilities are the priority.

#### Step 4: Update Caster Weapon/Attack Profile

Currently `buildSyntheticPlayer()` gives casters a staff with STR-based attacks. This is wrong even WITH abilities, because between ability uses they'll fall back to basic attacks.

**For caster classes (Mage, Psion, Warlock):**
- Check if the combat engine supports a "spell attack" as a basic attack (INT/WIS/CHA modifier instead of STR)
- If yes: set their weapon's `attackModifierStat` and `damageModifierStat` to their primary casting stat
- If no: give them a weapon with `attackModifierStat: 'int'` or `'wis'` or `'cha'` matching their primary stat. The engine's `createCharacterCombatant` likely supports any stat as modifier.

**For Clerics:**
- They're WIS-based. Give them a mace (1d6+WIS mod) or set their weapon to use WIS.

**For Bards:**
- CHA-based. Set weapon to use CHA modifier.

Check what modifier stats the `WeaponInfo` interface supports. The audit found `attackModifierStat` and `damageModifierStat` as fields — just set them to the class's primary stat.

#### Step 5: Verify the Integration

Run a quick sanity check via the batch endpoint:

```json
{
  "matchups": [
    {"race": "HUMAN", "class": "MAGE", "level": 5, "opponent": "Goblin", "iterations": 100},
    {"race": "HUMAN", "class": "WARRIOR", "level": 5, "opponent": "Goblin", "iterations": 100}
  ],
  "persist": false
}
```

**Expected:** Mage win rate should now be SIGNIFICANTLY higher than 0%. If the Mage has INT 16 (+3 mod) and is casting spells or using INT-based attacks, they should be competitive against a Goblin. If they're still at 0%, something isn't wired correctly — debug.

**Also verify** that Warriors now use abilities like Reckless Strike and Shield Wall instead of just basic attacking. You can check this by running 1 iteration with logs enabled and inspecting the combat log for ability usage.

---

### Part B: Monster Stat Tuning

Based on the balance audit findings, adjust these monster stats:

#### 1. Tier 2 Monster HP Reduction (15-20%)

Check `database/seeds/monsters.ts` for current HP values and reduce:

| Monster | Current HP (check) | Target HP | Rationale |
|---------|-------------------|-----------|-----------|
| Orc Warrior | ~50 | 42 | L5 Warrior should have ~50% win rate, currently 14% |
| Dire Wolf | ~55 | 45 | Same, currently 13% |
| Giant Spider | ~45 | 38 | Currently 54% for Warrior — slight reduction |
| Shadow Wraith | ~50 | 42 | Currently 42% — slight reduction |

**Do NOT change:** Skeleton Warrior (65% Warrior win rate — well balanced), Arcane Elemental, Troll.

**Verify actual HP values before changing** — the numbers above are estimates from the audit. Use the real seed values.

#### 2. Bandit Adjustment

The Bandit is a L3 monster but L1 Warriors only have 10% win rate. Target: ~35-40%.

Options (pick one based on current stats):
- Reduce HP by 20% (if HP is 25, reduce to 20)
- OR reduce AC by 1 (if AC is 13, reduce to 12)
- OR reduce attack bonus by 1

Check current Bandit stats and pick the adjustment that gets closest to 35-40% L1 Warrior win rate without making it trivial for L3 characters.

#### 3. Dire Wolf Differentiation

Dire Wolf (L8) and Orc Warrior (L6) are nearly identical difficulty. After the HP reduction, also bump Dire Wolf damage slightly to maintain 2-level separation:

- If Dire Wolf damage is "2d6+3", increase to "2d8+3"
- Or increase Dire Wolf AC by 1
- Goal: Dire Wolf should be noticeably harder than Orc Warrior after both HP reductions

#### 4. Re-seed Monsters

After stat changes:
```bash
npx ts-node database/seeds/monsters.ts
```

Verify the seeded values match expectations.

---

## TESTING

After both Part A and Part B:

1. **Ability integration test:** Run 1 iteration MAGE vs Goblin with logs. Verify the combat log shows spell/ability usage, not just basic attacks.

2. **Caster viability test:** Run 200 iterations Human Mage vs Goblin at L5. Win rate should be > 30% (was 0%).

3. **Warrior ability test:** Run 200 iterations Human Warrior vs Goblin at L5. Check if win rate changed (abilities like Reckless Strike should help, but basic Goblin was already 100% — test vs Orc Warrior instead to see if abilities help in tough fights).

4. **Monster tuning test:** Run 200 iterations Human Warrior L5 vs Orc Warrior. Win rate should be ~45-55% (was 14%).

5. **Bandit test:** Run 200 iterations Human Warrior L1 vs Bandit. Win rate should be ~35-40% (was 10%).

---

## DEPLOYMENT

After all changes verified:

```bash
git add -A
git commit -m "feat: wire class abilities into batch simulator + monster HP tuning for L5 balance"
git push origin main
```

Build and deploy with unique tag:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

Re-seed monsters on production:
```bash
az containerapp exec --name realm-of-crowns --resource-group realm-of-crowns-rg --command "npx ts-node database/seeds/monsters.ts"
```

---

## DO NOT

- Do not modify the combat engine's `resolveTurn()` or `createCombatState()` — they're battle-tested
- Do not modify the class ability definitions — the abilities themselves are fine
- Do not add new abilities — use what exists
- Do not change Tier 1 or Tier 3 monster stats — only Tier 2 + Bandit
- Do not change the 1v1 simulator tab (single mode) — only the batch simulator
- Do not over-engineer the AI — use the same `decideAction()` the tick resolver uses. If it's good enough for live combat, it's good enough for the simulator.
- Do not add racial abilities if it requires significant refactoring — class abilities are the priority
- Do not test or build stat profiles for unreleased races (Common/Exotic) — only the 7 core races
- Do not assume class names — verify from `VALID_CLASSES` in `shared/src/data/skills/index.ts`. This prompt may reference Paladin/Warlock but the actual released classes may be Bard/Psion or different. USE WHATEVER THE CODE SAYS.

## SUMMARY FOR CHAT

When done, print:
```
Abilities wired into batch simulator + monster tuning:
- Class abilities now used in batch combat (was basic-attack-only)
- Caster weapon stats use INT/WIS/CHA modifiers (was STR for everyone)
- Combat AI uses decideAction() with stances (was "attack first enemy")
- Spell slots allocated by class archetype
- Verification: Mage L5 vs Goblin win rate: [X]% (was 0%)
- Monster HP tuned: Orc Warrior [old]→[new], Dire Wolf [old]→[new], Bandit [old]→[new]
- Warrior L5 vs Orc Warrior win rate: [X]% (was 14%)
Deployed: tag [TAG], monsters re-seeded
```
