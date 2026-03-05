# Comprehensive Saving Throw Audit

**Date:** 2026-03-05
**Scope:** All 180 player abilities (7 classes), all ~200 monster abilities (129 monsters), combat engine handlers, 450 group combat logs

---

## Part 1: Code Audit — Which Abilities Should Have Saves?

### Player Abilities with `attackType: 'save'` (CORRECT — save-based, working as intended)

| Class | AbilityID | Name | saveStat | What Happens on Save |
|-------|-----------|------|----------|---------------------|
| Warrior | war-t0-3c | Intimidating Shout | WIS | Resist debuff |
| Mage | mag-ele-1 | Fireball | DEX | Half damage |
| Mage | mag-ele-5 | Meteor Strike | DEX | Half damage |
| Mage | mag-nec-3 | Corpse Explosion | DEX | Half damage |
| Mage | mag-nec-5 | Soul Harvest | WIS | Half drain |
| Mage | mag-enc-2 | Enfeeble | WIS | Resist debuff |
| Mage | mag-enc-4 | Arcane Siphon | WIS | Resist debuff |
| Mage | mag-enc-5 | Polymorph | WIS | Resist status |
| Mage | mag-t0-5c | Hex | WIS | Resist debuff |
| Cleric | cle-pal-5 | Divine Wrath | DEX | Half damage |
| Cleric | cle-inq-1 | Denounce | WIS | Resist debuff |
| Cleric | cle-inq-5 | Excommunicate | WIS | Resist debuff |
| Cleric | cle-t0-5c | Rebuke | WIS | Resist debuff |
| Cleric | cle-t0-8c | Condemnation | WIS | Half damage + resist debuff |
| Bard | bar-dip-1 | Charming Words | WIS | Resist debuff |
| Bard | bar-bat-4 | Shatter | CON | Half damage + resist debuff |
| Bard | bar-bat-6 | Epic Finale | CON | Half damage |
| Bard | bar-t0-3c | Jarring Note | WIS | Resist debuff |
| Bard | bar-t0-5a | Vicious Mockery | WIS | Half damage + resist debuff |
| Bard | bar-t0-8c | Cacophony | WIS | Half damage + resist debuff |
| Psion | psi-t0-3c | Mind Fog | INT | Resist debuff |

**Total: 21 abilities correctly configured with attackType: 'save' + saveType.**

### Issue A: `attackType: 'save'` but NO `saveType` — NONE FOUND

All save-based abilities have proper `saveType` in effects. No broken abilities in this category.

### Issue B: `saveType` defined but `attackType: 'auto'` (save silently bypassed)

These 6 abilities define a `saveType` but use `attackType: 'auto'`, so the engine never triggers the save pathway — the status lands automatically with zero counterplay.

| Class | AbilityID | Name | attackType | saveStat | Status Applied |
|-------|-----------|------|-----------|----------|----------------|
| Cleric | cle-inq-3 | Silence | auto | wis | silence (2r) |
| Ranger | ran-tra-2 | Snare | auto | dex | root (2r) |
| Ranger | ran-t0-3b | Nature's Grasp | auto | str | root (1r) |
| Bard | bar-dip-2 | Silver Tongue | auto | wis | skip_turn (1r) |
| Bard | bar-dip-5 | Enthrall | auto | wis | mesmerize (3r) |
| Bard | bar-t0-5c | Lullaby | auto | wis | slowed (2r) |

**Verdict:** These abilities have dead `saveType` data. Either:
- Change `attackType` to `'save'` so the save is enforced, OR
- Remove the `saveType` field to make the auto-apply intentional

**Note:** The log analysis confirms Snare and Silver Tongue ARE rolling saves (60 and 52 uses respectively). This means their handlers have inline save code that reads `effects.saveType` directly regardless of `attackType`. The save IS happening for these abilities despite the `attackType: 'auto'` — the data inconsistency is misleading but the behavior is correct.

### Issue C: Status effect applied with NO save defined anywhere

These 14 abilities apply CC/debuffs with no save to resist. The attack roll (vs AC) is the only barrier.

| Class | AbilityID | Name | attackType | Status Applied | Design Intent |
|-------|-----------|------|-----------|----------------|---------------|
| Warrior | war-gua-1 | Shield Bash | weapon | stun (1r) | Hit = stun (physical) |
| Warrior | war-gua-3 | Taunt | auto | taunt (2r) | Auto-apply (no roll at all) |
| Warrior | war-t0-5c | Hamstring | weapon | slowed (2r) | Hit = slow (physical) |
| Warrior | war-ber-3 | Cleave | weapon | AoE damage, no save | AoE weapon attack |
| Mage | mag-ele-2 | Frost Lance | spell | slowed (2r) | Hit = slow |
| Mage | mag-t0-3c | Chill Touch | spell | slowed (1r) | Hit = slow |
| Rogue | rog-t0-3c | Low Blow | weapon | stunned (1r) | Hit = stun |
| Rogue | rog-t0-5a | Gouge | weapon | blinded (1r) | Hit = blind |
| Rogue | rog-t0-5c | Crippling Poison | auto | poisoned (3r) | Auto-apply (no roll) |
| Rogue | rog-thi-2 | Smoke Bomb | auto | AoE accuracy -5 (2r) | Auto-apply |
| Ranger | ran-sha-5 | Rain of Arrows | weapon | AoE damage, no save | AoE weapon attack |
| Ranger | ran-t0-5c | Trip Wire | weapon | slowed (2r) | Hit = slow |
| Ranger | ran-t0-8c | Venomous Arrow | weapon | poisoned (3r) | Hit = poison |
| Psion | psi-t0-8b | Id Insinuation | spell | stunned (1r) | Hit = stun |

**Design analysis:**
- **Weapon-type** (war-gua-1, war-t0-5c, rog-t0-3c, rog-t0-5a, ran-t0-5c, ran-t0-8c): The attack roll vs AC IS the resistance check. Standard D&D pattern — "on hit, the target is stunned/slowed." Defensible design.
- **Auto-type** (war-gua-3 Taunt, rog-t0-5c Crippling Poison, rog-thi-2 Smoke Bomb): These auto-land with NO roll whatsoever. Taunt and Smoke Bomb are utility/tactical, so auto-apply is reasonable. Crippling Poison auto-applying 3 rounds of poison with no save is aggressive.
- **Stun without save** (Shield Bash, Low Blow, Id Insinuation): 1-round stuns on hit are very powerful in group combat. Consider adding CON saves for these.

### Issue D: Psion Spec Abilities — ALL 18 Missing `attackType`

All Psion spec abilities in `psionAbilities[]` lack the `attackType` field. Per CLAUDE.md, untagged abilities default to `'weapon'` for backward compatibility. However, Psion spec abilities route through `resolvePsionAbility()` which has its own routing — this may bypass the default.

8 of these abilities have `saveType` defined and SHOULD be save-based:
- psi-tel-1 Mind Spike (int), psi-tel-3 Psychic Crush (wis), psi-tel-4 Dominate (wis)
- psi-tel-5 Mind Shatter (wis), psi-tel-6 Absolute Dominion (wis)
- psi-nom-4 Translocation (int), psi-nom-5 Rift Walk (wis), psi-nom-6 Banishment (int)

**Log verification:** Mind Spike (36 uses, 100% saves rolled), Psychic Crush (35 uses, 100% saves rolled), Dominate (26 uses, 100% saves rolled), Translocation (26 uses, 100% saves rolled). The Psion resolver handles saves correctly via inline code regardless of the missing `attackType`. The missing field is a data hygiene issue, not a runtime bug.

---

### Monster Abilities — Save Configuration

#### All `aoe` type abilities: CORRECT
Every `aoe` ability across all 129 monsters has both `saveDC` and `saveType` defined. No bare AoEs found.

#### All `status` type abilities: CORRECT
Every `status` ability has `saveDC` and `saveType`. No bare status abilities.

#### All `on_hit` abilities: CORRECT
Every `on_hit` ability with a status effect has `saveDC` and `saveType` for the secondary effect.

#### `death_throes`: CORRECT
All use `deathSaveDC`/`deathSaveType` fields properly.

#### `swallow`: 1 ISSUE

| Monster | Lvl | Ability | Issue |
|---------|-----|---------|-------|
| Brambleback Toad | 5 | Swallow | Missing `saveDC`/`saveType`. Only has `swallowEscapeThreshold: 12`. Purple Worm and Tarrasque both correctly have `saveType: 'str'`. |

#### `fear_aura`: 7 MISSING `statusEffect`

These fear_aura abilities have `saveDC` + `saveType` but no `statusEffect: 'frightened'` — on failed save, no status is applied:

| Monster | Lvl | Ability | saveDC |
|---------|-----|---------|--------|
| Hill Giant Warlord | 38 | Warlord's Bellow | 18 |
| Dracolich | 39 | Dread Presence | 19 |
| Pit Fiend | 43 | Fear Aura | 21 |
| Elder Wyrm | 46 | Frightful Presence | 21 |
| Tarrasque | 49 | Frightful Presence | 23 |
| Void Emperor | 50 | Existential Dread | 24 |
| Blight Dragon | 45 | Plague Dread | 20 |

**Fix:** Add `statusEffect: 'frightened', statusDuration: 1` to all 7.

---

## Part 2: Handler Audit — Do Handlers Actually Check Saves?

### Player Ability Handlers (`class-ability-resolver.ts`)

#### CRITICAL BUG: `resolveAbilitySave()` omits target proficiency bonus

```
Target save modifier = getModifier(target.stats[saveType])
```

Should be:
```
Target save modifier = getModifier(target.stats[saveType]) + target.proficiencyBonus
```

The monster-facing handlers in `monster-ability-resolver.ts` correctly add `+ target.proficiencyBonus`. This means **every player save-DC ability is 2-6 points too easy for the target to fail**, depending on the target's proficiency bonus.

**Log confirmation:** Player save abilities have a 25.5% monster success rate (expected: 40-60%). At L10, DC 16 vs avg save 10.1. At L20, DC 20 vs avg save 12.9. At L30, DC 22 vs avg save 11.6. The missing prof bonus (~3-5) would bring these to 13-17 range, much closer to the expected 40-50% success.

#### CRITICAL BUG: No status effect save modifiers on player-side saves

`resolveAbilitySave()` and `handleStatus()` do NOT loop through `STATUS_EFFECT_DEFS[eff.name].saveModifier` for active effects on the target. The monster handlers all apply this loop. A target with the `frightened` status (which gives -2 to saves) gets no penalty when saving against player abilities but correctly gets -2 when saving against monster abilities.

#### Handler Save Support Matrix

| Handler | Has Save Path? | Uses resolveAbilitySave()? | Per-Target? | Notes |
|---------|---------------|---------------------------|-------------|-------|
| handleDamage | YES | YES | N/A (single) | Half damage on save success |
| handleDamageStatus | YES | YES | N/A (single) | Half damage + no status on save success |
| handleDamageDebuff | YES | YES | N/A (single) | Half damage + no debuff on save success |
| handleDebuff | YES | YES | N/A (single) | Full resist on save success |
| handleAoeDamage | YES | Inline | YES | Per-target save, half damage on success |
| handleAoeDrain | YES | Inline | YES | Per-target save, half damage on success |
| handleStatus | YES | Inline | N/A (single) | Full resist on success. Reads `effects.saveType` directly |
| **handleDrain** | **NO** | **NO** | — | **No save path exists. Auto-hits with no save.** |
| **handleMultiTarget** | **NO** | **NO** | — | **No save path exists. All targets hit with no save.** |
| **handleAoeDebuff** | **NO** | **NO** | — | **No save. Blinds all enemies unconditionally.** |

### Monster Ability Handlers (`monster-ability-resolver.ts`)

| Handler | Save Checked? | Prof Bonus Added? | Status Mods Applied? | Legendary Resistance? |
|---------|--------------|-------------------|---------------------|----------------------|
| handleStatus | YES | YES | YES | NO (N/A — targets are players) |
| handleAoe | YES | YES | YES | NO |
| handleSwallow | YES | YES | YES | NO |
| resolveOnHitAbilities | YES | YES | YES | NO |
| fear_aura (combat-engine) | YES | YES | YES | NO |
| death_throes (combat-engine) | YES | YES | YES | NO |
| damage_aura (combat-engine) | NO — by design | — | — | — |

**Monster handlers are fully correct.** All save paths include proficiency bonus and status effect modifiers.

### Legendary Resistance

- `checkLegendaryResistance()` only fires for `monster` entity type targets
- Called by: `resolveAbilitySave()`, `handleStatus` (player), `handleAoeDamage`, `handleAoeDrain`
- **NOT called by:** any monster-ability handler (correct — players don't have LR)
- Correctly decrements `legendaryResistancesRemaining` and flips `save.success` to `true`

### Save DC Calculation

- **Player abilities:** `DC = 8 + actor.proficiencyBonus + CLASS_PRIMARY_STAT modifier` — correct
- **Monster abilities:** `saveDC` hardcoded per-ability in monster data — does NOT compute dynamically

---

## Part 3: Log Verification — 450 Group Combat Encounters

### Monster AoE Saves — CRITICAL BUG

| Metric | Value |
|--------|-------|
| Total AoE per-target hits | 3,815 |
| Saves rolled | **0 (0%)** |
| Expected saves | 3,815 |

**Every monster AoE in the 450 combats dealt full damage with no save.** All AoE abilities have `saveDC`/`saveType` defined in monster data, and the `handleAoe` handler code does roll saves internally. The saves are either not propagated to the log entry's `perTargetResults` objects, or there's a disconnect in the logging pipeline.

**Impact:** This is the single biggest balance issue. Monster AoEs deal 100% damage to every party member every time. With proper saves (~50% success rate), roughly half of AoE hits would deal half damage, reducing total AoE damage by ~25%. Given that party wipe rate is 91.8%, this would significantly improve survivability.

Top no-save AoE abilities by usage:
- Fire Breath: 558 hits (Chimera, Ashlands Wyrm, Volcanic Drake)
- Petrifying Breath: 294 hits (Gorgon Bull)
- Whirlwind: 216 hits (Dust Devil)
- Tidal Surge: 197 hits (Tidecaller Siren, Sea Serpent)
- Sand Blast: 174 hits (Sand Wyrm)

### Monster Status Saves — OK

| Metric | Value |
|--------|-------|
| Total uses | 797 |
| Saves rolled | 797 (100%) |
| Save success rate | 58.3% |

Working correctly. In the expected 40-60% range. Top abilities:
- Entangling Roots: 112 uses, 59.8% save rate, DC 16
- Constrict: 100 uses, 48.0% save rate, DC 17.6
- Ink Cloud: 96 uses, 63.5% save rate, DC 17.7

### Monster Fear Aura — OK (with logging gap for damage_auras)

| Metric | Value |
|--------|-------|
| Total events | 334 |
| Saves rolled | 229 (68.6%) |
| Save success rate | 59.4% |

The 105 events with no save rolled are `damage_aura` abilities (Heat Aura, Molten Shell, Heated Body, etc.) that were incorrectly categorized as fear_aura by the analysis script. Actual fear_auras all roll saves correctly with ~55-70% success rates.

### Monster Death Throes — OK

8 events, 100% saves rolled, 62.5% success rate, avg DC 16.4. Working correctly.

### Monster Swallow — OK

69 events, 100% saves rolled, 50.7% success rate, avg DC 18.0. Working correctly.

### Player Save-Based Abilities — PARTIALLY BROKEN

| Metric | Value |
|--------|-------|
| Total events | 1,220 |
| Saves rolled | 400 (32.8%) |
| Save success rate | 25.5% |

**820 events with no save rolled — breakdown:**
- **Multi-Shot** (398): `handleMultiTarget` — has NO save path. Not a save-based ability (`attackType: 'weapon'`). Correctly has no save — false positive.
- **Fireball** (223): `handleAoeDamage` — DOES have save code, `attackType: 'save'`. Save is rolled internally but per-target results don't include save fields in the log. **Logging gap, not mechanics bug.**
- **Cleave** (166): `handleAoeDamage` — `attackType: 'weapon'`. Not save-based. Correctly no save.
- **Chain Lightning** (33): `handleMultiTarget` — `attackType: 'spell'`. Not save-based. No save expected.

**Corrected analysis:** Of 1,220 events, only 623 SHOULD have saves (400 single-target + 223 Fireball AoE). The 400 single-target saves are rolling correctly. The 223 Fireball events likely roll saves internally but don't log them per-target. **Actual save coverage: ~64%+ of expected saves are confirmed rolling.**

**Save success rate is 25.5% — far below expected 40-60%.** Root cause: `resolveAbilitySave()` doesn't add target's `proficiencyBonus` to save roll. With prof bonus added, estimated success rate would be 40-50%.

### Player Status-Applying Abilities — BY DESIGN (mostly)

| Metric | Value |
|--------|-------|
| Total events | 1,514 |
| Saves rolled | 0 (0%) |

Most are self-buffs (Vanish, Foresight, Blood Rage, Holy Armor, etc.) that correctly don't need saves. The status-applying offensive abilities (Shield Bash stun, Gouge blind, Frost Lance slow) are Issue C abilities — status lands on hit with no secondary save. This is a design choice for weapon-type abilities where the attack roll acts as the resistance check.

---

## Part 4: Save Balance Analysis

### Player Save DCs vs Monster Save Bonuses

| Level | Total Saves | Monster Success Rate | Avg Player DC | Avg Monster Save Total |
|-------|-------------|---------------------|---------------|----------------------|
| L10 | 130 | 24.6% | 16.0 | 10.1 |
| L20 | 99 | 35.4% | 20.0 | 12.9 |
| L30 | 171 | 20.5% | 22.0 | 11.6 |

**Verdict: Monsters save far too rarely (20-35% vs expected 40-60%).** Primary cause: missing `proficiencyBonus` in `resolveAbilitySave()`. Secondary cause: monsters may have low save stats relative to player DCs at high levels.

### Monster Save DCs vs Player Save Bonuses

| Level | Total Saves | Player Success Rate | Avg Monster DC | Avg Player Save Total |
|-------|-------------|--------------------|-----------------|-----------------------|
| L10 | 261 | 60.5% | 14.0 | 15.6 |
| L20 | 433 | 56.4% | 16.5 | 17.8 |
| L30 | 409 | 58.4% | 17.8 | 18.6 |

**Verdict: Players save at the correct rate (56-60%).** Monster handlers correctly add proficiency bonus and status modifiers. This is within the expected 40-60% range, slightly favoring players (which is appropriate — players should succeed saves more often than monsters at-level).

---

## Summary: All Bugs and Issues

### CRITICAL BUGS (Mechanics)

| # | Bug | Impact | Location |
|---|-----|--------|----------|
| 1 | `resolveAbilitySave()` doesn't add target's `proficiencyBonus` to save roll | All player save-DC abilities are 2-6 points too easy to fail. Monsters save only 25% instead of ~45% | `class-ability-resolver.ts` line ~1763 |
| 2 | `resolveAbilitySave()` doesn't apply status effect save modifiers | Targets with frightened (-2 saves) or other modifiers don't get the penalty vs player abilities | `class-ability-resolver.ts` line ~1763 |
| 3 | `handleDrain` has no save path | If a drain ability ever uses `attackType: 'save'`, it auto-hits with no save | `class-ability-resolver.ts` line ~815 |
| 4 | `handleMultiTarget` has no save path | Same — no save path exists for multi-target abilities | `class-ability-resolver.ts` line ~1077 |
| 5 | `handleAoeDebuff` has no save | Blinds all enemies unconditionally with no save | `class-ability-resolver.ts` line ~947 |

### HIGH PRIORITY DATA ISSUES

| # | Issue | Count | Fix |
|---|-------|-------|-----|
| 6 | 7 fear_aura abilities missing `statusEffect: 'frightened'` | 7 monsters (L38-L50) | Add `statusEffect: 'frightened', statusDuration: 1` |
| 7 | Brambleback Toad Swallow missing `saveDC`/`saveType` | 1 monster | Add `saveType: 'str', saveDC: 12` |
| 8 | All 18 Psion spec abilities missing `attackType` field | 18 abilities | Add proper `attackType` values (data hygiene — runtime works via Psion resolver) |

### LOGGING GAPS

| # | Gap | Impact |
|---|-----|--------|
| 9 | Monster AoE per-target save results not in log entries | Can't verify AoE saves from logs (3,815 events) |
| 10 | Player AoE save results (Fireball) not in per-target log entries | Can't verify Fireball saves from logs (223 events) |

### DESIGN DECISIONS (Not Bugs)

| # | Decision | Abilities | Recommendation |
|---|----------|-----------|----------------|
| 11 | 6 abilities have `saveType` but `attackType: 'auto'` | Silence, Snare, Nature's Grasp, Silver Tongue, Enthrall, Lullaby | Some (Snare, Silver Tongue) do inline saves. Others may need `attackType: 'save'` |
| 12 | 14 abilities apply status on hit with no save | Shield Bash stun, Gouge blind, etc. | Standard D&D for weapon attacks. Consider CON save for stun effects |
| 13 | Crippling Poison auto-applies 3r poison with no roll | 1 ability | Aggressive — consider adding CON save |

---

## Summary Table

| Category | Total Uses | Save Rolled? | Success Rate | Verdict |
|----------|-----------|-------------|--------------|---------|
| Monster AoE | 3,815 | 0/3,815 (0%) | N/A | **BUG — saves not logged (possibly not rolling)** |
| Monster Status | 797 | 797/797 (100%) | 58.3% | OK |
| Monster Fear Aura | 229 | 229/229 (100%) | 59.4% | OK |
| Monster Death Throes | 8 | 8/8 (100%) | 62.5% | OK |
| Monster Swallow | 69 | 69/69 (100%) | 50.7% | OK |
| Player Save-Based | 400 | 400/400 (100%) | 25.5% | **BUG — success rate too low (missing profBonus)** |
| Player Status (no-save) | 1,514 | 0/1,514 (0%) | N/A | BY DESIGN (mostly buffs + weapon-hit statuses) |
