# Audit: Class Ability Unlock Levels

Generated: 2026-03-04

## 1. Summary Table

| Class | Total Abilities | First Unlock | Unlock Levels | Empty Ranges |
|-------|----------------|-------------|---------------|-------------|
| Warrior | 18 (3 specs × 6) | Level 1 | 1, 5, 10, 18, 28, 40 | 2-4, 6-9, 11-17, 19-27, 29-39 |
| Mage | 18 (3 specs × 6) | Level 1 | 1, 5, 10, 18, 28, 40 | 2-4, 6-9, 11-17, 19-27, 29-39 |
| Rogue | 18 (3 specs × 6) | Level 1 | 1, 5, 10, 18, 28, 40 | 2-4, 6-9, 11-17, 19-27, 29-39 |
| Cleric | 18 (3 specs × 6) | Level 1 | 1, 5, 10, 18, 28, 40 | 2-4, 6-9, 11-17, 19-27, 29-39 |
| Ranger | 18 (3 specs × 6) | Level 1 | 1, 5, 10, 18, 28, 40 | 2-4, 6-9, 11-17, 19-27, 29-39 |
| Bard | 18 (3 specs × 6) | Level 1 | 1, 5, 10, 18, 28, 40 | 2-4, 6-9, 11-17, 19-27, 29-39 |
| Psion | 18 (3 specs × 6) | Level 1 | 1, 5, 12, 18, 28, 40 | 2-4, 6-11, 13-17, 19-27, 29-39 |

**Total: 126 abilities across 7 classes (21 specializations)**

All classes except Psion share the same unlock schedule: **1 → 5 → 10 → 18 → 28 → 40**.
Psion uses **1 → 5 → 12 → 18 → 28 → 40** (tier 3 at level 12 instead of 10).

---

## 2. Per-Class Breakdown

### WARRIOR

#### Berserker
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Reckless Strike | 1 | Active (damage) | Core | +5 damage, -2 defense debuff to self. Cooldown 0. |
| Blood Rage | 5 | Active (buff) | Core | Attack scales with missing HP%. 5 rounds. CD 8. |
| Cleave | 10 | Active (AoE) | Core | Hit all enemies at 80% damage. CD 3. |
| Frenzy | 18 | Active (multi_attack) | Major | Two strikes, -3 accuracy. CD 4. |
| Berserker Rage | 28 | Active (buff) | Major | CC-immune, +15 attack for 3 rounds. CD 12. |
| Undying Fury | 40 | Passive | Signature | Survive fatal blow once per combat at 1 HP. |

#### Guardian
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Shield Bash | 1 | Active (damage+status) | Core | 3 damage + 1-round stun. CD 3. |
| Fortify | 5 | Active (buff) | Core | +5 AC for 4 rounds. CD 6. |
| Taunt | 10 | Active (status) | Utility | Force enemy to target you, 2 rounds. CD 4. |
| Shield Wall | 18 | Active (buff) | Major | 50% damage reduction for 2 rounds. CD 8. |
| Iron Bulwark | 28 | Active (buff) | Major | Immovable + 30% melee damage reflect, 3 rounds. CD 10. |
| Unbreakable | 40 | Passive | Signature | +20% CON as permanent bonus HP. |

#### Warlord
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Rally Cry | 1 | Active (buff) | Core | +3 attack, +2 AC for 4 rounds. CD 5. |
| Commanding Strike | 5 | Active (damage) | Core | Precise attack with +3 damage. CD 3. |
| Tactical Advance | 10 | Active (buff) | Major | Extra action this turn. CD 8. |
| Inspiring Presence | 18 | Passive | Core | Regen 3 HP per round. |
| Warlord's Decree | 28 | Active (buff) | Major | Next 3 attacks can't miss, 3 rounds. CD 10. |
| Legendary Commander | 40 | Active (heal) | Signature | Full HP restore once per combat. |

---

### MAGE

#### Elementalist
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Fireball | 1 | Active (AoE) | Core | Area fire damage (1d6). CD 0. |
| Frost Lance | 5 | Active (damage+status) | Core | 2d8 + 2-round slow. CD 2. |
| Chain Lightning | 10 | Active (multi_target) | Core | Hits 3 enemies (2d6 each). CD 3. |
| Elemental Shield | 18 | Active (buff) | Major | Absorb 30 damage, 4 rounds. CD 8. |
| Meteor Strike | 28 | Active (AoE) | Major | 6d8 fire to all enemies. CD 10. |
| Arcane Mastery | 40 | Passive | Signature | All elemental spell cooldowns -30%. |

#### Necromancer
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Life Drain | 1 | Active (drain) | Core | 2d6 damage, heal 50%. CD 2. |
| Shadow Bolt | 5 | Active (damage) | Core | 3d6 dark energy bolt. CD 1. |
| Corpse Explosion | 10 | Active (AoE) | Core | 4d6 AoE (requires corpse). CD 4. |
| Bone Armor | 18 | Active (buff) | Major | Absorb 25 damage + 3 AC, 5 rounds. CD 7. |
| Soul Harvest | 28 | Active (AoE drain) | Major | 3d8 to all + heal 8 per hit. CD 10. |
| Lichdom | 40 | Passive | Signature | Revive on death at 50% HP once. |

#### Enchanter
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Arcane Bolt | 1 | Active (damage) | Core | 2d4, never misses. CD 0. |
| Enfeeble | 5 | Active (debuff) | Core | -4 attack, -3 AC for 3 rounds. CD 4. |
| Haste | 10 | Active (buff) | Major | Extra action for 1 turn. CD 6. |
| Arcane Siphon | 18 | Active (debuff) | Core | -4 attack for 3 rounds. CD 5. |
| Polymorph | 28 | Active (status) | Major | Transform enemy for 2 rounds. CD 10. |
| Spell Weaver | 40 | Passive | Signature | All ability cooldowns -1 round. |

---

### ROGUE

#### Assassin
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Backstab | 1 | Active (damage) | Core | +10 crit bonus, +5 damage. CD 2. |
| Vanish | 5 | Active (buff) | Core | Untargetable for 1 round. CD 5. |
| Poison Blade | 10 | Active (buff) | Core | Next 3 attacks apply 4 DoT, 3 rounds each. CD 6. |
| Ambush | 18 | Active (damage) | Major | 3x damage after Vanish. CD 0 (requires stealth). |
| Death Mark | 28 | Active (delayed_damage) | Major | Mark: after 3 rounds deal 8d6. CD 10. |
| Shadow Mastery | 40 | Passive | Signature | +15% crit chance permanently. |

#### Thief
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Pilfer | 1 | Active (steal) | Utility | Steal 5-20 gold. CD 3. |
| Smoke Bomb | 5 | Active (AoE debuff) | Core | -5 accuracy to enemies, 2 rounds. CD 5. |
| Quick Fingers | 10 | Passive | Utility | +10% gold drops permanently. |
| Disengage | 18 | Active (flee) | Utility | 90% flee success. CD 6. |
| Mug | 28 | Active (damage+steal) | Major | 3d6 damage + steal item. CD 8. |
| Treasure Sense | 40 | Passive | Signature | +25% loot quality and quantity. |

#### Swashbuckler
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Riposte | 1 | Active (counter) | Core | Counter melee: 8 damage response. CD 2. |
| Dual Strike | 5 | Active (multi_attack) | Core | Two attacks at 0.7x each. CD 2. |
| Evasion | 10 | Active (buff) | Core | +30 dodge for 2 rounds. CD 5. |
| Flurry of Blades | 18 | Active (multi_attack) | Major | Four strikes at 0.4x each. CD 6. |
| Dance of Steel | 28 | Active (buff) | Major | Stacking attack speed (max 5), 5 rounds. CD 10. |
| Untouchable | 40 | Passive | Signature | +10% dodge permanently. |

---

### CLERIC

#### Healer
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Healing Light | 1 | Active (heal) | Core | 2d8 + 3 healing. CD 2. |
| Purify | 5 | Active (cleanse) | Utility | Remove 1 negative status. CD 3. |
| Regeneration | 10 | Active (HoT) | Core | 5 HP/round for 5 rounds. CD 5. |
| Divine Shield | 18 | Active (buff) | Major | Absorb 30 damage, 4 rounds. CD 7. |
| Resurrection | 28 | Passive | Signature | Revive at 25% HP once on defeat. |
| Miracle | 40 | Active (heal) | Signature | Full HP restore once per combat. |

#### Paladin
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Smite | 1 | Active (damage) | Core | +6 radiant damage. CD 0. |
| Holy Armor | 5 | Active (buff) | Core | +4 AC for 5 rounds. CD 6. |
| Consecrate | 10 | Active (AoE DoT) | Core | 6 dmg/round (2x vs undead), 3 rounds. CD 5. |
| Judgment | 18 | Active (drain) | Major | 3d8 holy + heal 50%. CD 5. |
| Divine Wrath | 28 | Active (AoE) | Major | 5d8 radiant to all. CD 10. |
| Avatar of Light | 40 | Passive | Signature | +25% holy ability damage. |

#### Inquisitor
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Denounce | 1 | Active (debuff) | Core | -4 attack for 3 rounds. CD 3. |
| Penance | 5 | Active (damage) | Core | 2d6 + 4 per debuff on target. CD 2. |
| Silence | 10 | Active (status) | Core | Prevent spellcasting for 2 rounds. CD 5. |
| Purging Flame | 18 | Active (dispel+damage) | Major | Remove buffs, +8 dmg per buff removed. CD 6. |
| Excommunicate | 28 | Active (debuff) | Major | -5 all stats for 3 rounds. CD 10. |
| Inquisitor's Verdict | 40 | Passive | Signature | Nullify enemy healing. |

---

### RANGER

#### Beastmaster
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Call Companion | 1 | Active (summon) | Core | Summon pet: 5 dmg/round, 5 rounds. CD 6. |
| Wild Bond | 5 | Active (heal) | Utility | Heal self + companion 2d6. CD 4. |
| Pack Tactics | 10 | Active (buff) | Core | Advantage on next attack. CD 3. |
| Bestial Fury | 18 | Active (companion_attack) | Major | Companion attack: 4d8. CD 5. |
| Alpha Predator | 28 | Active (summon) | Major | Summon alpha: 12 dmg, 50 HP, 8 rounds. CD 12. |
| Spirit Bond | 40 | Passive | Signature | Companion persists indefinitely, immune to death. |

#### Sharpshooter
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Aimed Shot | 1 | Active (damage) | Core | +6 damage, +3 accuracy. CD 0. |
| Multi-Shot | 5 | Active (multi_target) | Core | Hit 3 enemies (1d8 each). CD 3. |
| Piercing Arrow | 10 | Active (damage) | Core | Ignore armor, 2d8. CD 3. |
| Headshot | 18 | Active (damage) | Major | +20 crit, -5 accuracy, 4d8. CD 5. |
| Rain of Arrows | 28 | Active (AoE) | Major | 2 hits/target (2d8 each). CD 10. |
| Eagle's Eye | 40 | Passive | Signature | +5 accuracy, +10% crit permanently. |

#### Tracker
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Lay Trap | 1 | Active (trap) | Core | 10 damage when enemy attacks. CD 3. |
| Snare | 5 | Active (status) | Core | Root + -3 AC, 2 rounds. CD 4. |
| Hunter's Mark | 10 | Active (debuff) | Core | +4 bonus damage from you, 5 rounds. CD 5. |
| Explosive Trap | 18 | Active (trap) | Major | 25 damage AoE. CD 6. |
| Predator Instinct | 28 | Passive | Core | Advantage vs enemies below 50% HP. |
| Master Tracker | 40 | Passive | Signature | First strike always crits. |

---

### BARD

#### Diplomat
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Charming Words | 1 | Active (debuff) | Core | -3 attack for 3 rounds. CD 3. |
| Silver Tongue | 5 | Active (status) | Core | Enemy skips 1 turn. CD 5. |
| Soothing Presence | 10 | Passive | Core | Regen 3 HP/round. |
| Diplomat's Gambit | 18 | Active (special) | Utility | 50% chance to end combat peacefully. CD 8. |
| Enthrall | 28 | Active (status) | Major | Mesmerize 3 rounds. CD 10. |
| Legendary Charisma | 40 | Passive | Signature | +50% charm effectiveness. |

#### Battlechanter
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| War Song | 1 | Active (buff) | Core | +4 attack for 4 rounds. CD 4. |
| Discordant Note | 5 | Active (damage) | Core | 2d8 sonic damage. CD 2. |
| Marching Cadence | 10 | Active (buff) | Core | +5 dodge, +3 initiative, 5 rounds. CD 5. |
| Shatter | 18 | Active (damage+debuff) | Major | 3d6 + -4 AC, 3 rounds. CD 5. |
| Crescendo | 28 | Passive | Core | +3 damage per round of combat. |
| Epic Finale | 40 | Active (AoE) | Signature | 4d8 + 5 per round elapsed. CD 12. |

#### Lorekeeper
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Analyze | 1 | Active (buff) | Core | +8 damage on next hit + reveal weakness. CD 2. |
| Recall Lore | 5 | Passive | Utility | +15% XP from combat. |
| Exploit Weakness | 10 | Active (damage) | Core | 3d6, +15 crit after analyze. CD 3. |
| Arcane Insight | 18 | Active (buff) | Utility | Halve next ability cooldown. CD 6. |
| Tome of Secrets | 28 | Active (special) | Major | Cast random powerful spell. CD 8. |
| Omniscient | 40 | Passive | Signature | +25% XP from all sources. |

---

### PSION

#### Telepath
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Mind Spike | 1 | Active (damage+status) | Core | 2d6+INT, -1 attack 2 rounds. CD 0. |
| Thought Shield | 5 | Passive | Core | Psychic resistance + 2 mental saves. |
| Psychic Crush | 12 | Active (damage+status) | Major | 3d8+INT, stun on failed WIS save. CD 1. |
| Dominate | 18 | Active (control) | Major | Seize control 1 round (WIS save -2). CD 1. |
| Mind Shatter | 28 | Active (AoE+status) | Major | 3d6+INT to all, half on save. CD 1. |
| Absolute Dominion | 40 | Active (control) | Signature | 2-round mind control (WIS -4); stun+2d10 on save. CD 1. |

#### Seer
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Foresight | 1 | Active (buff) | Core | +2 AC, +2 saves, 3 rounds. CD 0. |
| Danger Sense | 5 | Passive | Core | No surprise, +2 initiative, detect hidden. |
| Precognitive Dodge | 12 | Active (reaction) | Core | Negate one attack per combat. CD 1. |
| Third Eye | 18 | Passive | Core | See invisible, immune to blind, +2 traps. |
| Temporal Echo | 28 | Active (echo) | Major | Repeat previous action free. CD 1. |
| Prescient Mastery | 40 | Active (buff) | Signature | Enemy disadvantage, you advantage, 3 rounds. CD 1. |

#### Nomad
| Ability | Level | Type | Power Tier | Mechanics |
|---------|-------|------|-----------|-----------|
| Blink Strike | 1 | Active (teleport+attack) | Core | Teleport + attack, +2 hit, INT damage. CD 0. |
| Phase Step | 5 | Passive | Core | +3 AC vs opportunity attacks, free disengage. |
| Dimensional Pocket | 12 | Active (phase) | Core | Phase out 1 round, advantage on return. CD 1. |
| Translocation | 18 | Active (swap) | Major | Swap positions (INT save), enemy loses action. CD 1. |
| Rift Walk | 28 | Active (AoE+status) | Major | 2d8+INT psychic, slow 2 rounds. CD 1. |
| Banishment | 40 | Active (banish) | Signature | Banish 3 rounds; 4d6+stun on return. CD 1. |

---

## 3. Observations

### Consistent Structure
- Every class has exactly **18 abilities** (3 specializations × 6 abilities each)
- Every specialization follows the same **6-tier progression** with prerequisite chains
- **Tier 5 (level 40)** is always the capstone — either a passive or once-per-combat effect

### Unlock Level Pattern
All classes share: **1 → 5 → 10 → 18 → 28 → 40**
- **Exception:** Psion tier 3 unlocks at level **12** instead of 10

### Massive Empty Ranges
The current unlock schedule creates huge gaps with zero progression:
- **Levels 2-4** — 4 levels with nothing new
- **Levels 6-9** — 4 levels with nothing new (3 levels for Psion at 6-11)
- **Levels 11-17** — 7 levels with nothing new
- **Levels 19-27** — 9 levels with nothing new
- **Levels 29-39** — 11 levels with nothing new

At level 1, players get **3 abilities** (one per specialization). The next unlock isn't until level 5.

### Per-Specialization, Players Get Only 1 Ability at a Time
Since players pick one specialization, they effectively unlock:
- Level 1: 1 ability
- Level 5: 1 ability
- Level 10 (or 12 for Psion): 1 ability
- Level 18: 1 ability
- Level 28: 1 ability
- Level 40: 1 ability

**Total: 6 abilities per character across 40 levels.** That's one new ability every ~7 levels.

### Active vs Passive Distribution
| Type | Count | Percentage |
|------|-------|-----------|
| Active (combat) | 86 | 68% |
| Passive | 20 | 16% |
| Utility (flee, steal, etc.) | 10 | 8% |
| Reactive (counter, reaction) | 3 | 2% |
| Other (special, echo, etc.) | 7 | 6% |

### Psion Outlier
Psion is the only class with tier 3 at level 12 instead of 10, and uses tiers 1-6 while all other classes use 1-5. This is inconsistent but could be intentional (psionic abilities take longer to develop).

### Power Curve Issues
- **Level 1 abilities are quite strong**: Reckless Strike (+5 damage), Smite (+6 radiant), Backstab (+10 crit, +5 dmg) — players start with meaningful combat tools
- **Level 5 abilities are mostly buffs/utility**: Blood Rage, Fortify, Vanish, Purify — these enhance the level 1 ability rather than adding new damage
- **Level 10 is the first real power spike for most specs**: Cleave, Chain Lightning, Silence — multi-target/AoE unlocks
- **Level 18-28 gap is enormous**: 9 levels between major unlocks, longest drought

---

## 4. Current Architecture Notes

### How Ability Access Works

**Data source:** `shared/src/data/skills/{class}.ts` — hardcoded TypeScript constants defining all abilities with `levelRequired` field.

**Database sync:** Seed script populates the `abilities` table from shared data. The `Ability` model stores `level_required` as a DB column.

**Player unlock flow:**
1. Player levels up → gains skill points
2. Player visits skill tree → `GET /api/skills/tree` returns abilities with `canUnlock` flag
3. `canUnlock` requires: `character.level >= ability.levelRequired` AND has prerequisite AND has skill points AND correct class/spec
4. Player spends skill point → `POST /api/skills/unlock` validates and creates `CharacterAbility` row
5. **Abilities are NOT auto-granted on level-up** — players must manually spend points

**Combat flow:**
1. Character enters combat → ability queue built from their unlocked `CharacterAbility` records
2. AI uses `decideAction()` which iterates the queue by priority
3. No further level checks at combat time — if it's unlocked, it's usable

**Batch sim flow:**
1. `buildAbilityQueue(className, level)` filters `ABILITIES_BY_CLASS[class]` by `levelRequired <= level`
2. Passive abilities filtered out
3. Remaining sorted by tier (desc) then cooldown (asc)
4. Queue built: opener (first_round buff/CC) → sustain (damage) → emergency (heal at 40% HP) → fallback → remaining

### What To Change to Modify Unlock Levels

1. **Edit `levelRequired`** in `shared/src/data/skills/{class}.ts`
2. **Rebuild shared:** `npx tsc --build shared/tsconfig.json`
3. **Re-seed abilities:** Run seed script to sync DB `abilities` table
4. **No combat engine changes needed** — the resolver doesn't check levels, only whether the ability is in the character's queue
5. **Existing characters keep their unlocks** — no revocation mechanism exists

### Key Files

| File | Purpose |
|------|---------|
| `shared/src/data/skills/warrior.ts` (etc.) | Ability definitions with `levelRequired` |
| `shared/src/data/skills/index.ts` | Exports `ABILITIES_BY_CLASS`, `VALID_CLASSES` |
| `shared/src/data/skills/types.ts` | `AbilityDefinition` interface |
| `database/prisma/schema.prisma` | `Ability` + `CharacterAbility` models |
| `server/src/routes/skills.ts` | Unlock endpoint + skill tree API |
| `server/src/services/combat-simulator.ts` | `buildAbilityQueue()` — sim ability filtering |
| `server/src/services/tick-combat-resolver.ts` | `decideAction()` — combat AI ability selection |
