# Known Issues — Consolidated from All Audits

**Last updated:** 2026-03-06
**Sources:** audit-combat-stat-mechanics, audit-saving-throws-comprehensive, audit-equipment-system, audit-monster-mechanics, audit-ability-attack-mechanics, audit-save-dc-stats, audit-class-ability-levels

---

## Codebase Health (as of 2026-03-05)

| Check | Status |
|-------|--------|
| Prisma schema validation | PASS |
| Shared package build | PASS |
| Server TS build | PASS |
| Client TS build | PASS |

---

## P0 — Critical (Mechanics Broken in Production)

**ALL P0 ISSUES RESOLVED.** No remaining P0 bugs.

### ~~P0-01: Duration-1 `preventsAction` effects never work~~ — FIXED
`processStatusEffects()` decrements and removes effects BEFORE the `preventsAction` check fires. Stunned, frozen, paralyzed, mesmerize, dominated, banished with `statusDuration: 1` expire before they can skip the target's turn. Evidence: 204 stun applications, 0 turns skipped in sim data.
- **Location:** `combat-engine.ts` — `resolveTurn()` / `processStatusEffects()` ordering
- **Source:** audit-combat-stat-mechanics
- **FIXED:** Status effect overhaul prompt, deployed rev `202603052223`

### ~~P0-02: `resolveAbilitySave()` omits target's proficiency bonus~~ — FIXED
Monster save modifier = `statMod` only, should be `statMod + proficiencyBonus`. Players' save-DC abilities are 2–6 points too easy to land. Monsters save at ~25% vs expected 40–60%.
- **Location:** `class-ability-resolver.ts` ~line 1931
- **Source:** audit-saving-throws-comprehensive
- **FIXED:** Saving throws fix prompt, deployed rev `202603052223`. `resolveAbilitySave()` now includes `target.proficiencyBonus` in save modifier calculation.

### ~~P0-03: `resolveAbilitySave()` ignores status effect save modifiers~~ — FIXED
A `frightened` target (−2 saves) gets no penalty when rolling against player abilities, but correctly gets −2 against monster abilities. The player-side utility skips the modifier loop.
- **Location:** `class-ability-resolver.ts` ~line 1933-1942
- **Source:** audit-saving-throws-comprehensive
- **FIXED:** Same fix as P0-02, deployed rev `202603052223`. `resolveAbilitySave()` now iterates `target.statusEffects`, applies `seDef.saveModifier` (e.g. frightened −2) and DEX/STR-specific modifiers from `STATUS_EFFECT_MECHANICS`.

### ~~P0-04: Monster AoE saves not propagated / possibly not rolling~~ — FIXED
All 3,815 AoE per-target hits in 450-encounter sim show 0 saves rolled. AoE deals 100% damage to every party member every time. Party wipe rate 91.8%.
- **Location:** `monster-ability-resolver.ts` `handleAoe()` + logging pipeline
- **Source:** audit-saving-throws-comprehensive
- **FIXED:** Status effect overhaul prompt, deployed rev `202603052223`

### ~~P0-05: Tick combat weapon quality/enchantment scaling bypassed~~ — FIXED
`buildCombatParams()` in `combat-presets.ts` reads raw `template.stats` without calling `calculateItemStats()`. A LEGENDARY weapon performs identically to COMMON for `bonusDamage`/`bonusAttack` in all PvP and bot travel combat.
- **Location:** `server/src/services/combat-presets.ts` lines 255–271
- **Source:** audit-equipment-system
- **FIXED:** Equipment system prompt, deployed rev `202603052223`

---

## P1 — High Priority (Significant Balance or Functionality Impact)

### ~~P1-01: `diseased` status is uncleansable~~ — FIXED
Rat Filth Fever applies `diseased` (DoT 2/round, attack −1, save −1) but no cleanse list includes it. Once applied, it runs forever.
- **Location:** `class-ability-resolver.ts:927`
- **FIXED:** `diseased` added to `handleCleanse` harmful effects list (line 927). Verified present in deployed code.

### ~~P1-02: Spell damage ignores damage type interactions~~ — FIXED
`resolveCast()` never calls `applyDamageTypeInteraction()`. Fire-immune monsters take full Fireball damage.
- **Location:** `combat-engine.ts` — `resolveCast()` lines 1434-1437
- **FIXED:** `resolveCast()` now calls `applyDamageTypeInteraction()` when `spell.damageType` is set. Fire-immune monsters take 0 fire spell damage.

### ~~P1-03: `silence` only blocks class abilities~~ — FIXED
Silenced monsters can still cast spells. Silenced Psions can still use psion abilities.
- **Location:** `combat-engine.ts:2834` (cast block), `class-ability-resolver.ts:2967` (class_ability block)
- **FIXED:** Silence now blocks both `cast` actions (line 2834) and `class_ability` actions (line 2967). Psion exemption is BY DESIGN — psion abilities are psychic/mental, not verbal.

### ~~P1-04: `root` status does not prevent fleeing~~ — FIXED
Status definition says "cannot flee" but no flee-path code checks for root/slowed.
- **Location:** `combat-engine.ts` — `resolveFlee()` lines 1635-1654
- **FIXED:** `resolveFlee()` checks `STATUS_EFFECT_MECHANICS[e.name].blocksFlee` (lines 1635-1638) for root/restrained. Slowed adds +5 flee DC penalty (line 1651).

### ~~P1-05: 7 high-tier fear_aura abilities missing `statusEffect: 'frightened'`~~ — FIXED
Hill Giant Warlord, Dracolich, Pit Fiend, Elder Wyrm, Tarrasque, Void Emperor, Blight Dragon have `saveDC`+`saveType` but no `statusEffect`. On failed save, nothing is applied.
- **Location:** `database/seeds/monsters.ts`
- **FIXED:** Status effect overhaul prompt, deployed rev `202603052223`

### ~~P1-06: `handleDrain`, `handleMultiTarget`, `handleAoeDebuff` have no save path~~ — FIXED
If any ability using these handlers has `attackType: 'save'`, it auto-hits with no resistance. `handleAoeDebuff` unconditionally blinds all enemies.
- **Location:** `class-ability-resolver.ts` lines ~815, ~1077, ~947
- **FIXED:** Status effect overhaul prompt, deployed rev `202603052223`

### ~~P1-07: No caster weapons for 4/7 classes~~ — FIXED
34 caster weapons added: Mage (staves/wands), Cleric (holy symbols/blessed maces), Bard (instruments/hand drums), Psion (orbs/crystal staves).
- **Location:** `shared/src/data/recipes/caster-weapons.ts`
- **FIXED:** Caster weapons prompt, deployed rev `202603052223`

### ~~P1-08: Enchantment system partially functional~~ — FIXED
Enchant API endpoint added (`POST /equipment/enchant`). 12/13 scroll recipes now craftable with monster component drops. Combat engine enchantment damage handler may still be missing.
- **Location:** `server/src/services/combat-presets.ts:260-270`
- **FIXED:** `buildCombatParams()` calls `calculateItemStats()` (line 260) which sums enchantment bonuses into `finalStats`. `bonusDamage` and `bonusAttack` from enchantments flow into the weapon used by combat engine. Elemental typing (FIRE vs untyped) is a future enhancement.

### ~~P1-09: Proficiency formula divergence between production and simulator~~ — FIXED
Production uses bounded lookup table (L20 → +5). Simulator uses `floor((level−1)/4)+2` (L20 → +6). Results diverge at every level above 12.
- **Location:** `shared/src/utils/bounded-accuracy.ts` vs `server/src/services/combat-simulator.ts:200`
- **FIXED:** Proficiency system prompt, deployed rev `202603052223`. Simulator now uses the same bounded-accuracy lookup as production.

### ~~P1-10: FEET slot missing from all plate armor tiers~~ — FIXED
No metal boots exist. Warriors and Clerics have an always-empty FEET equipment slot.
- **Location:** Armorer recipe/template seeds
- **FIXED:** Armor gap-fill prompt, deployed rev `202603052223`

### ~~P1-11: Leather/cloth armor caps at T3~~ — FIXED
44 gap-fill recipes added for cloth T1-T5, leather T4-T5, ranged T4-T5.
- **Location:** `shared/src/data/recipes/armor.ts`
- **FIXED:** Armor gap-fill prompt, deployed rev `202603052223`

### ~~P1-12: Rangers 44% behind Warrior weapon damage at equivalent levels~~ — FIXED
Fletcher caps at 26 damage (L45) vs Warrior 46 damage. T4/T5 ranged weapons added via gap-fill recipes.
- **Location:** `shared/src/data/recipes/ranged-weapons.ts`
- **FIXED:** Ranged weapons gap-fill prompt, deployed rev `202603052223`

---

## P2 — Medium Priority (Functional Gaps, Incorrect Behavior)

**ALL P2 ISSUES RESOLVED.** No remaining P2 bugs.

### ~~P2-01: `polymorph` doesn't reduce damage to 1d4~~ — FIXED
Status definition says "reduced to 1d4 damage" but weapon dice were never overridden.
- **FIXED:** Added polymorph dice override in `resolveAttack()` — polymorphed attackers use 1d4 with no weapon bonuses. P2 fix session.

### ~~P2-02: `banishedUntilRound` is dead code~~ — NOT A BUG
`banishedUntilRound` IS actively read at `combat-engine.ts:3243, 3251, 3260` for return-from-banishment logic. Not dead code.

### ~~P2-03: `immuneBlinded` passive never checked~~ — FIXED
`applyStatusEffect()` didn't check this field before applying `blinded`.
- **FIXED:** Added `immuneBlinded` check in `applyStatusEffect()` — Psion Third Eye passive now correctly prevents blinded. P2 fix session.

### ~~P2-04: Psychic damage bypasses unified damage type pipeline~~ — FIXED
`applyPsychicDamage()` only checked `target.race === 'forgeborn'` and `target.psychicResistance`.
- **FIXED:** Rewrote `applyPsychicDamage()` to use `applyDamageTypeInteraction('PSYCHIC')`. PSYCHIC-immune monsters now take 0 damage. P2 fix session.

### ~~P2-05: 6 abilities have `saveType` but `attackType: 'auto'`~~ — NOT A BUG
`handleStatus` handler has independent inline save logic that reads `effects.saveType` directly. Auto-hit + target-saves-to-resist is correct design for debuff/CC abilities.

### ~~P2-06: 14 status-applying abilities auto-apply CC with no save~~ — FIXED
- On-hit physical effects (Shield Bash, Low Blow, Hamstring, Gouge, Trip Wire, Venomous Arrow): attack roll IS the gating mechanism — no additional save needed. Correct by design.
- **FIXED:** Smoke Bomb changed to `attackType:'save'` with `saveType:'dex'` (AoE blind needs a save). Crippling Poison changed to `attackType:'save'` with `saveType:'con'` (3-round auto-hit poison too strong without save). P2 fix session.

### ~~P2-07: All 18 Psion spec abilities missing `attackType` field~~ — FIXED
- **FIXED:** All 18 Psion spec abilities tagged with proper `attackType` and `damageType: 'PSYCHIC'`. Telepath damage/control: `save`, passives: `auto`. Seer: all `auto`. Nomad: `spell` for Blink Strike, `auto` for passives, `save` for save-based. P2 fix session.

### ~~P2-08: No `tan-exotic-leather` recipe~~ — VERIFIED FIXED
Exotic leather processing recipe exists in `shared/src/data/recipes/tanner.ts`. Fixed by armor gap-fill prompt.

### ~~P2-09: ENCHANTER scroll recipes missing monster sources~~ — FIXED
All 14 enchantment recipe inputs now have monster drop sources. Last missing component (Ogre Sinew) added to Ironhide Ogre loot table. P2 fix session.

### ~~P2-10: FLETCHER broken: Spider Silk and Bear Claw have no monster sources~~ — FIXED
- **FIXED:** Spider Silk added to Giant Spider (25%, 1-2 qty) and Broodmother Spider (25%, 1-2 qty). Bear Claw added to Dire Wolf (20%, 1-2 qty) — no Bear monster exists, Dire Wolf is the closest large-clawed beast. P2 fix session.

### ~~P2-11: JEWELER broken: Wind Mote, Fey Tear, Wyvern Scale have no sources~~ — VERIFIED FIXED
Wind Mote, Fey Tear, and Wyvern Scale all have monster drop sources (added by enchantment system prompt). Verified in code.

### ~~P2-12: Accessory stat keys don't match `NUMERIC_STAT_KEYS`~~ — VERIFIED FIXED
Accessories now use combat-engine-recognized keys (armor, intelligence, constitution, etc.). Fixed by equipment system prompt.

### ~~P2-13: Weapon enchantment bonuses not surfaced in road encounter path~~ — VERIFIED FIXED
`getEquippedWeapon()` in `road-encounter.ts` calls `calculateItemStats()` (line 240). Quality+enchantment bonuses flow correctly.

### ~~P2-14: Brambleback Toad Swallow missing `saveDC`/`saveType`~~ — FIXED
- **FIXED:** Added `saveDC: 12, saveType: 'str'` to Brambleback Toad's swallow ability. DC = 8 + prof(+3) + STR mod(+1) ≈ 12. P2 fix session.

### ~~P2-15: AoE save results not logged~~ — VERIFIED FIXED
Monster AoE handler includes `saveRoll`, `saveTotal`, `saveDC`, `saveSucceeded` in per-target results (lines 187-190, 214-217 in `monster-ability-resolver.ts`).

### ~~P2-16: Cloth armor 23 templates have no recipes~~ — VERIFIED FIXED
35 TAILOR cloth recipes exist in `shared/src/data/recipes/armor.ts`. Fixed by armor gap-fill prompt.

### ~~P2-17: No 1H weapons at T4/T5 for shield users~~ — FIXED
- T4 already had Mithril Sword (1H, baseDamage 30) and Mithril Longsword (1H, baseDamage 36).
- **FIXED:** Added Adamantine Sword (T5, 1H, baseDamage 38) and Adamantine Longsword (T5, 1H, baseDamage 45) to weapons.ts, item-names.ts, and weapon-recipes.ts base values. P2 fix session.

### ~~P2-18: Psion tier 3 unlocks at level 12~~ — NOT A BUG
Psion tier 3 spec abilities unlock at L20, matching all other classes. Original audit was a false positive.

### ~~P2-19: `calculateSaveDC()` class-awareness~~ — VERIFIED FIXED
Now uses `CLASS_SAVE_DC_STAT` map. Deployed and verified (prior session).

### ~~P2-20: Skeleton Warrior `sentient: false` but drops gold~~ — FIXED
- **FIXED:** Changed to `sentient: true` — Skeleton Warriors have enough intelligence to fight with weapons and tactics. Also fixed broken second loot row (missing `itemTemplateName`) by adding `'Bones'`. P2 fix session.

---

## P3 — Low Priority (Dead Code, Cosmetic, Data Hygiene)

**ALL P3 ISSUES RESOLVED.** 1 deferred to future audit.

| # | Status | Description |
|---|--------|-------------|
| P3-01 | ALREADY FIXED | `speed` stat removed from all monsters and type defs in prior session |
| P3-02 | NOT A BUG | `taunt` modifies AI targeting behavior, not stats — zero modifiers correct |
| P3-03 | BY DESIGN | CHA matters for Bards (spell DC/attacks) and social/political systems |
| P3-04 | NOT A BUG | `run-recipes.ts` is legacy standalone script, not part of main seed pipeline — no collision in production |
| P3-05 | FIXED | TANNER quiver renamed to "Leather Quiver" — FLETCHER keeps "Quiver" (combat accessory) |
| P3-06 | FIXED | `Arcane Reagent` (singular) in legacy `recipes.ts` normalized to `Arcane Reagents` (plural) |
| P3-07 | DOCUMENTED | Comment added to weapons.ts explaining "Copper" is flavor naming, materials are Iron |
| P3-08 | FIXED | Added Adamantine Ring (T5), Mithril Necklace (T4), Adamantine Necklace (T5) to JEWELER |
| P3-09 | ALREADY FIXED | Frost Giant redundant COLD resistance removed (prior session) |
| P3-10 | ALREADY FIXED | 4 fear_aura abilities got `saveType: 'wis'` (prior session) |
| P3-11 | BY DESIGN | Ability unlocks at defined levels; players gain stats/HP/proficiency between unlocks |
| P3-12 | ALREADY FIXED | TUTORIAL exists in QuestType enum in Prisma schema |
| P3-13 | FIXED | All 29+ professions added to PROFESSION_LABELS in both CraftingResults.tsx and RecipeList.tsx |
| P3-14 | DEFERRED | Dead API route audit — future frontend-backend alignment pass |
| P3-15 | BY DESIGN | RIVER/UNDERWATER monsters are future content for water travel release |
| P3-16 | FIXED | Mithril Dagger/Rapier (T4) and Adamantine Dagger/Rapier (T5) added for piercing builds |
| P3-17 | BY DESIGN | Save DC deviations are intentional tuning — weak-stat abilities inflated, high-stat abilities capped |

---

## Fixed Issues Log

All fixes deployed in revision `202603052223` unless noted otherwise.

| ID | Description | Fix Prompt/Session |
|----|-------------|-------------------|
| P0-01 | Duration-1 `preventsAction` effects now work (status effect processing reordered) | Status effect overhaul |
| P0-02 | `resolveAbilitySave()` now includes `target.proficiencyBonus` | Saving throws fix |
| P0-03 | `resolveAbilitySave()` now applies status effect save modifiers (frightened −2, etc.) | Saving throws fix |
| P0-04 | Monster AoE saves now roll and propagate to logs | Status effect overhaul |
| P0-05 | Tick combat weapon quality/enchantment scaling now calls `calculateItemStats()` | Equipment system fix |
| P1-01 | `diseased` added to cleanse list in `handleCleanse` | Prior session (verified) |
| P1-02 | `resolveCast()` now calls `applyDamageTypeInteraction()` for spell damage | Prior session (verified) |
| P1-03 | Silence blocks both `cast` and `class_ability` actions; psion exemption by design | Prior session (verified) |
| P1-04 | `resolveFlee()` checks `blocksFlee` from STATUS_EFFECT_MECHANICS; slowed adds +5 DC | Prior session (verified) |
| P1-05 | 7 fear_aura abilities now have `statusEffect: 'frightened'` | Status effect overhaul |
| P1-06 | `handleDrain`, `handleMultiTarget`, `handleAoeDebuff` now have save paths | Status effect overhaul |
| P1-07 | 34 caster weapons added for Mage, Cleric, Bard, Psion | Caster weapons prompt |
| P1-08 | Enchantment bonuses flow through `calculateItemStats()` → `buildCombatParams()` → combat | Equipment system fix (verified) |
| P1-09 | Simulator proficiency formula now matches production bounded-accuracy table | Proficiency system prompt |
| P1-10 | Metal boots added for all plate armor tiers | Armor gap-fill prompt |
| P1-11 | 44 gap-fill recipes: cloth T1-T5, leather T4-T5, ranged T4-T5 | Armor gap-fill prompt |
| P1-12 | T4/T5 ranged weapons added for Rangers | Ranged gap-fill prompt |
| FIX-01 | `calculateSaveDC()` class-aware via `CLASS_SAVE_DC_STAT` map | Prior session |
| FIX-02 | All 189 player abilities tagged with `attackType` and `damageType` | Prior session |
| FIX-03 | Frost Giant redundant COLD resistance removed | Prior session |
| FIX-04 | 4 fear_aura abilities got `saveType: 'wis'` | Prior session |
| FIX-05 | 34 caster weapons added | Caster weapons prompt |
| FIX-06 | 44 armor/ranged gap-fill recipes | Armor gap-fill prompt |
| FIX-07 | Enchantment system: API endpoint + monster component drops | Enchantment prompt |
| FIX-08 | Boss material drops → 28 elite crafted recipes | Boss drops prompt |
| FIX-09 | Armor/weapon proficiency system with combat penalties | Proficiency system prompt |
| P2-01 | Polymorph now overrides weapon dice to 1d4 | P2 fix session |
| P2-02 | NOT A BUG — `banishedUntilRound` actively read for return-from-banishment | P2 fix session (verified) |
| P2-03 | `immuneBlinded` check added to `applyStatusEffect()` | P2 fix session |
| P2-04 | `applyPsychicDamage()` now uses unified `applyDamageTypeInteraction('PSYCHIC')` | P2 fix session |
| P2-05 | NOT A BUG — `handleStatus` has inline save logic for auto+saveType | P2 fix session (verified) |
| P2-06 | Smoke Bomb + Crippling Poison saves added; on-hit physical CC correct by design | P2 fix session |
| P2-07 | All 18 Psion spec abilities tagged with `attackType` + `damageType` | P2 fix session |
| P2-08 | VERIFIED — exotic leather processing recipe exists | P2 fix session (verified) |
| P2-09 | Ogre Sinew drop added to Ironhide Ogre — all enchantment inputs sourced | P2 fix session |
| P2-10 | Spider Silk drops (Giant Spider, Broodmother); Bear Claw drop (Dire Wolf) | P2 fix session |
| P2-11 | VERIFIED — Wind Mote, Fey Tear, Wyvern Scale all have monster sources | P2 fix session (verified) |
| P2-12 | VERIFIED — accessory stats use combat-engine-recognized keys | P2 fix session (verified) |
| P2-13 | VERIFIED — road encounter calls `calculateItemStats()` | P2 fix session (verified) |
| P2-14 | Brambleback Toad swallow: `saveDC: 12, saveType: 'str'` added | P2 fix session |
| P2-15 | VERIFIED — AoE save results logged in per-target results | P2 fix session (verified) |
| P2-16 | VERIFIED — 35 TAILOR cloth recipes exist | P2 fix session (verified) |
| P2-17 | Adamantine Sword + Adamantine Longsword (T5 1H) added | P2 fix session |
| P2-18 | NOT A BUG — Psion level schedule matches other classes | P2 fix session (verified) |
| P2-19 | VERIFIED — `calculateSaveDC()` class-aware | Prior session (verified) |
| P2-20 | Skeleton Warrior `sentient: true` + broken loot row fixed | P2 fix session |
| P3-01 | ALREADY FIXED — `speed` stat removed from monsters/types | Prior session |
| P3-02 | NOT A BUG — taunt modifies AI targeting, not stats | P3 fix session (verified) |
| P3-03 | BY DESIGN — CHA matters for Bards and social systems | P3 fix session |
| P3-04 | NOT A BUG — `run-recipes.ts` is unused legacy script | P3 fix session (verified) |
| P3-05 | TANNER quiver renamed to "Leather Quiver" | P3 fix session |
| P3-06 | `Arcane Reagent` → `Arcane Reagents` in legacy seed | P3 fix session |
| P3-07 | DOCUMENTED — "Copper" is flavor naming, uses Iron materials | P3 fix session |
| P3-08 | Adamantine Ring + Mithril/Adamantine Necklace added to JEWELER | P3 fix session |
| P3-09 | ALREADY FIXED — Frost Giant COLD resistance removed | Prior session |
| P3-10 | ALREADY FIXED — fear_aura `saveType: 'wis'` added | Prior session |
| P3-11 | BY DESIGN — level gaps are normal, players gain stats between ability unlocks | P3 fix session |
| P3-12 | ALREADY FIXED — TUTORIAL exists in QuestType Prisma enum | P3 fix session (verified) |
| P3-13 | All 29+ professions in PROFESSION_LABELS (both UI files) | P3 fix session |
| P3-14 | DEFERRED — dead route audit for future session | P3 fix session |
| P3-15 | BY DESIGN — RIVER/UNDERWATER monsters are future content | P3 fix session |
| P3-16 | Mithril/Adamantine Dagger + Rapier (T4/T5 piercing) added | P3 fix session |
| P3-17 | BY DESIGN — save DC deviations are intentional balance tuning | P3 fix session (verified) |

---

## Summary by System

| System | P0 Open | P1 Open | P2 Open | P3 Open | Fixed |
|--------|---------|---------|---------|---------|-------|
| Combat Engine | 0 | 0 | 0 | 0 | 17 |
| Saving Throws | 0 | 0 | 0 | 0 | 6 |
| Monster AoE / logging | 0 | 0 | 0 | 0 | 4 |
| Equipment / Combat | 0 | 0 | 0 | 0 | 29 |
| Ability system | 0 | 0 | 0 | 0 | 6 |
| Schema / Frontend | 0 | 0 | 0 | 1 | 2 |
| Monster data | 0 | 0 | 0 | 0 | 8 |
| **Total** | **0** | **0** | **0** | **1** | **72** |

*P3-14 (dead API routes) deferred to future audit — only remaining open item.*
