# Monster System Audit: Current State + D20 SRD Alignment

**Date:** 2026-03-03
**Scope:** Complete audit of monster data model, engine capabilities, and SRD gap analysis
**Purpose:** Establish foundation for D20-quality monsters (NOT balance tuning)

---

## 1. Current Monster Data Model

### Prisma Schema (`database/prisma/schema.prisma` line 1613)

```prisma
model Monster {
  id        String    @id @default(uuid())
  name      String
  level     Int       @default(1)
  stats     Json      @default("{}")      -- Stats JSON object
  lootTable Json      @default("[]")      -- Loot array
  regionId  String?   @map("region_id")
  biome     BiomeType
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  region    Region?   @relation(...)
}
```

### Stats JSON Structure (`database/seeds/monsters.ts` line 23)

```typescript
stats: {
  hp: number;       // Hit points
  ac: number;       // Armor class
  attack: number;   // Total attack bonus (NOT stat-based -- raw number)
  damage: string;   // Dice notation e.g. "1d6+2"
  speed: number;    // Movement speed (unused in combat)
  str: number;      // Ability scores (raw, 1-30 scale)
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}
```

### LootTable JSON Structure

```typescript
lootTable: {
  dropChance: number;        // 0.0-1.0 probability
  minQty: number;
  maxQty: number;
  gold: number;              // Gold drop (0 for non-sentient)
  itemTemplateName?: string; // Named item drop (e.g. "Arcane Reagents")
}[]
```

### Fields That DO NOT Exist

| Missing Field | D20 Equivalent | Impact |
|---|---|---|
| `abilities` | Monster actions/special attacks | Monsters can only basic attack |
| `damageType` | Physical/elemental damage type | All damage is untyped |
| `resistances` | Damage resistances (half damage) | No damage mitigation by type |
| `immunities` | Damage immunities (zero damage) | No damage negation by type |
| `vulnerabilities` | Damage vulnerabilities (double damage) | No damage amplification by type |
| `conditionImmunities` | Status effect immunities | Monsters can be stunned, paralyzed, charmed, etc. |
| `multiAttack` | Multiple attacks per turn | One attack per round always |
| `legendaryActions` | Extra actions outside turn (CR 11+) | No boss-tier mechanics |
| `saveDC` | Saving throw DC for abilities | No save-based attacks |
| `onHitEffects` | Status effects on melee hit | No poison, paralysis, etc. on hit |
| `rechargeAbilities` | Recharge 5-6 breath weapons etc. | No rechargeable abilities |
| `regeneration` | HP recovery per round | No Troll-style regeneration |
| `spellList` | Spell-like abilities | No monster spellcasting |

---

## 2. Current Monster Roster

### 21 Monsters Across 3 Tiers

| # | Name | Level | Biome | HP | AC | Attack | Damage | Region | Gold | Item Drop |
|---|------|-------|-------|-----|-----|--------|--------|--------|------|-----------|
| 1 | Goblin | 1 | HILLS | 24 | 12 | +3 | 1d4+1 | The Crossroads | 3 | -- |
| 2 | Giant Rat | 1 | UNDERGROUND | 18 | 12 | +3 | 1d4+1 | Vel'Naris Underdark | -- | Bones |
| 3 | Wolf | 2 | FOREST | 15 | 11 | +4 | 1d6+1 | Silverwood Forest | -- | Animal Pelts |
| 4 | Slime | 2 | SWAMP | 15 | 8 | +2 | 1d6 | Shadowmere Marshes | -- | Bones |
| 5 | Mana Wisp | 3 | SWAMP | 16 | 13 | +3 | 1d6+1 | Shadowmere Marshes | -- | Arcane Reagents |
| 6 | Bandit | 3 | PLAINS | 20 | 12 | +4 | 1d6+2 | Verdant Heartlands | 8 | -- |
| 7 | Bog Wraith | 4 | SWAMP | 22 | 12 | +4 | 1d6+2 | Ashenmoor | -- | Arcane Reagents |
| 8 | Skeleton Warrior | 5 | SWAMP | 40 | 15 | +5 | 1d10+3 | Ashenmoor | 8 | -- |
| 9 | Orc Warrior | 6 | BADLANDS | 46 | 15 | +6 | 1d10+3 | Ashenfang Wastes | 12 | -- |
| 10 | Arcane Elemental | 7 | VOLCANIC | 48 | 14 | +6 | 1d10+3 | The Confluence | -- | Arcane Reagents |
| 11 | Giant Spider | 7 | UNDERGROUND | 38 | 13 | +6 | 1d10+3 | Vel'Naris Underdark | -- | Bones |
| 12 | Dire Wolf | 8 | TUNDRA | 45 | 14 | +7 | 2d8+3 | Frozen Reaches | -- | Animal Pelts |
| 13 | Shadow Wraith | 9 | UNDERGROUND | 45 | 15 | +7 | 2d6+3 | Vel'Naris Underdark | -- | Arcane Reagents |
| 14 | Troll | 9 | SWAMP | 75 | 12 | +7 | 2d6+4 | Shadowmere Marshes | 15 | -- |
| 15 | Ancient Golem | 12 | MOUNTAIN | 140 | 19 | +8 | 2d10+5 | Ironvault Mountains | -- | Bones |
| 16 | Void Stalker | 13 | UNDERGROUND | 110 | 17 | +9 | 2d8+5 | Vel'Naris Underdark | -- | Arcane Reagents |
| 17 | Young Dragon | 14 | TUNDRA | 150 | 18 | +10 | 2d10+6 | Frozen Reaches | 50 | -- |
| 18 | Hydra | 15 | COASTAL | 160 | 15 | +8 | 3d6+4 | The Suncoast | -- | Bones |
| 19 | Demon | 16 | VOLCANIC | 130 | 17 | +10 | 2d8+6 | The Confluence | 60 | -- |
| 20 | Elder Fey Guardian | 16 | FOREST | 135 | 17 | +10 | 2d10+5 | Silverwood Forest | -- | Arcane Reagents |
| 21 | Lich | 18 | SWAMP | 120 | 17 | +9 | 3d6+5 | Ashenmoor | 80 | -- |

### Biome Coverage

| Biome | Monster Count | Levels |
|---|---|---|
| SWAMP | 5 | 2, 3, 4, 5, 9 |
| UNDERGROUND | 4 | 1, 7, 9, 13 |
| VOLCANIC | 2 | 7, 16 |
| FOREST | 2 | 2, 16 |
| TUNDRA | 2 | 8, 14 |
| HILLS | 1 | 1 |
| PLAINS | 1 | 3 |
| BADLANDS | 1 | 6 |
| MOUNTAIN | 1 | 12 |
| COASTAL | 1 | 15 |
| DESERT | 0 | -- |

**Gaps:** DESERT has zero monsters. HILLS, PLAINS, BADLANDS, MOUNTAIN, COASTAL each have only 1. SWAMP and UNDERGROUND are overrepresented.

### Level Coverage

- **Levels 1-5:** 8 monsters (well-covered)
- **Levels 6-10:** 6 monsters (adequate)
- **Levels 11-18:** 7 monsters (adequate for current cap)
- **Levels 19-50:** 0 monsters (no content beyond level 18)

---

## 3. Combat Engine Capabilities

### What the Engine CAN Do

| Capability | Status | Evidence |
|---|---|---|
| Basic melee attack (d20 + mod vs AC) | **Working** | `resolveAttack()` combat-engine.ts:475 |
| Damage dice + modifiers | **Working** | `calculateDamage()` combat-engine.ts |
| Critical hits (nat 20, double dice) | **Working** | Standard d20 crit |
| Initiative rolls (d20 + DEX) | **Working** | `rollInitiative()` |
| 23 status effects with mechanical impact | **Working** | `STATUS_EFFECT_DEFS` combat-engine.ts:81 |
| DoT/HoT (burning, regenerating, poisoned) | **Working** | Damage/heal per round |
| CC (stun, freeze, paralyze, dominate, mesmerize) | **Working** | `preventsAction` flag |
| Saving throws (d20 + stat mod + proficiency vs DC) | **Working** | `resolveCast()` combat-engine.ts:1032 |
| Spell casting with save DCs | **Working** | Character-only currently |
| Class ability resolution | **Working** | `resolveClassAbility()` via class-ability-resolver.ts |
| Racial ability resolution | **Working** | `resolveRacialAbility()` via racial-combat-abilities.ts |
| Weapon damage type field | **Stored** | `WeaponInfo.damageType` -- logged but not checked |
| Active buffs with AC/attack/damage mods | **Working** | Character-only currently |
| CC immunity via buffs | **Working** | `ccImmune` on ActiveBuff |
| Ability cooldowns | **Type exists** | `abilityCooldowns` on Combatant, unused for monsters |
| Multi-strike abilities | **Working** | `handleMultiAttack` in class-ability-resolver.ts |
| AoE damage | **Working** | `handleAoeDamage` in class-ability-resolver.ts |

### What the Engine CANNOT Do (For Monsters)

| Missing Capability | Why | D20 Impact |
|---|---|---|
| **Monster abilities** | No ability definitions, no action selection | Monsters can only basic attack |
| **Monster AI / action selection** | `decideAction()` only reads character CombatPresets | Monsters always attack first alive enemy |
| **Damage type resistance/vulnerability/immunity** | `damageType` stored but never checked against target | Troll takes full fire damage, Skeleton takes full bludgeoning |
| **Multi-attack per turn** | One action per turn per combatant, no multi-attack field | Hydra attacks once, not 5 times |
| **Breath weapons / recharge abilities** | No recharge mechanic, no cone/line targeting | Dragon has no breath weapon |
| **Regeneration** | Status effect `regenerating` exists (+5/round) but can't be innate or conditional | Troll has no regeneration |
| **On-hit status effects** | No mechanism for "bite applies poison on hit" | Giant Spider can't poison on bite |
| **Legendary actions** | No between-turn action system | No boss-tier extra actions |
| **Legendary resistance** | No auto-pass saves mechanic | Bosses vulnerable to all CC |
| **Condition immunities** | No innate immunity field for monsters | All monsters can be stunned, paralyzed, charmed |
| **Fear aura / passive effects** | No aura system for monsters | Dragons have no Frightful Presence |
| **Spell-like abilities** | Monsters can't use `resolveCast()` | Lich can't cast spells |
| **Swallow / engulf** | No mechanic for removing targets from combat temporarily | No Purple Worm swallow |
| **Death throes / on-death effects** | No death trigger system | No Balor explosion on death |

### Monster Creation Flow

1. `road-encounter.ts:selectMonsterForEncounter()` queries DB by biome + level range
2. `buildMonsterWeapon()` creates a `WeaponInfo` from the damage string
3. `createMonsterCombatant()` builds a `Combatant` with empty statusEffects, empty spellSlots, no abilities
4. Monster enters combat as a pure stat block with one weapon

### Monster AI (tick-combat-resolver.ts)

```
decideAction() for monsters:
1. Check retreat conditions → SKIP (monsters have no CombatPresets, use defaults)
2. Check ability queue → SKIP (monsters have no ability queue)
3. Check item usage → SKIP (monsters have no items)
4. Default: attack first alive enemy with basic weapon → ALWAYS THIS
```

**Result:** Every monster, every turn, attacks the first alive enemy with their basic attack. No tactical variation. No ability usage. No retreat.

### Synthetic Monster (combat-simulator.ts)

`buildSyntheticMonster()` creates the same basic stat block for simulations:
- name, level, stats (6 ability scores), hp, ac
- weapon (parsed from damage string)
- No abilities, damage types, resistances, or special effects

---

## 4. Engine Gaps (Prioritized)

### P0: Foundation (Required for any special abilities)

| Gap | What's Needed | Complexity | Existing Infrastructure |
|---|---|---|---|
| **Monster ability definitions** | `MonsterAbility` type + data per monster | Medium | Class abilities exist as pattern |
| **Monster action selection** | AI decides when to use abilities vs basic attack | Medium | `decideAction()` exists for characters |
| **Monster ability resolution** | Dispatch to ability handlers | Medium | `resolveClassAbility()` is the pattern |
| **Damage type checking** | Apply resistance/vulnerability/immunity on damage | Low | `damageType` already stored on WeaponInfo |

### P1: Tactical Depth

| Gap | What's Needed | Complexity | Existing Infrastructure |
|---|---|---|---|
| **Multi-attack** | Multiple attacks in one turn | Medium | `handleMultiAttack` exists for class abilities |
| **On-hit status effects** | Poison/paralysis on melee hit with save DC | Low | `applyStatusEffect()` + `savingThrow()` exist |
| **Regeneration (conditional)** | Heal X/turn unless specific damage type dealt | Low | `regenerating` status exists, needs fire/acid check |
| **Condition immunities** | Innate immunity to specific status effects | Low | `applyStatusEffect()` has CC immunity check |
| **Breath weapons / recharge** | Cone/line AoE with recharge mechanic | Medium | `handleAoeDamage` exists for class abilities |

### P2: Boss-Tier Features

| Gap | What's Needed | Complexity |
|---|---|---|
| **Legendary actions** | Extra actions between turns (1-3/round) | High |
| **Legendary resistance** | Auto-pass failed saves X/day | Medium |
| **Fear aura** | Passive save-or-frightened for nearby targets | Medium |
| **Spell-like abilities** | Use existing cast system for monsters | Medium |
| **Swallow/engulf** | Remove target from combat, DoT, breakout check | High |

### P3: Polish

| Gap | What's Needed | Complexity |
|---|---|---|
| **Death throes** | On-death AoE damage | Low |
| **Summon minions** | Spawn additional combatants mid-fight | High |
| **Phase transitions** | Behavior change at HP thresholds | Medium |
| **Lair actions** | Environmental effects on initiative 20 | High |

---

## 5. Level Tier to CR Mapping

| Our Level | D20 CR | Tier | Player Power | Monster Design Goal |
|---|---|---|---|---|
| 1-5 | CR 1/8 - CR 2 | **Low** | Fragile, few abilities | Teach one mechanic per monster |
| 6-10 | CR 3 - CR 5 | **Mid-Low** | Competent, some abilities | Multi-attack, saves, elemental damage |
| 11-15 | CR 6 - CR 10 | **Mid** | Powerful, diverse toolkit | Multiple abilities per monster, status effects |
| 16-20 | CR 11 - CR 15 | **Mid-High** | Veteran, specialized | Legendary-adjacent, swallow, breath weapons |
| 21-30 | CR 16 - CR 20 | **High** | Dominant | Legendary actions, fear auras, spell-like abilities |
| 31-40 | CR 21+ | **Epic** | Demigod-tier | Legendary resistance, instant-death mechanics |
| 41-50 | Beyond CR | **Mythic** | Ascended | Custom-scaled world bosses, mythic resistance |

### Scaling Formula (approximate)

- **HP:** `base_hp * (1 + 0.15 * level)` -- scales ~15% per level
- **AC:** `10 + (level / 3)` -- scales slowly
- **Attack:** `proficiency + stat_mod` where proficiency = `2 + floor(level/4)`
- **Damage dice:** scale sides and count with tier
- **Save DC:** `8 + proficiency + primary_stat_mod`

---

## 6. SRD Monster Candidates by Tier

### Tier 1: Low (Levels 1-5, CR 1/8-2)

| Monster | CR | Biome | Key Mechanic | Damage Type |
|---|---|---|---|---|
| Giant Rat* | 1/8 | UNDERGROUND | Pack Tactics, disease | Piercing |
| Poisonous Snake | 1/8 | SWAMP, DESERT | Heavy poison damage | Piercing + Poison |
| Cockatrice | 1/2 | HILLS, BADLANDS | **Petrification** (CON save) | Piercing |
| Shadow | 1/2 | UNDERGROUND | **STR drain**, resist all physical | Necrotic |
| Ghoul | 1 | UNDERGROUND, SWAMP | **Paralysis** (CON save) | Piercing, Slashing |
| Harpy | 1 | MOUNTAIN, COASTAL | **Charm** song (WIS save) | Slashing, Bludgeoning |
| Ankheg | 2 | PLAINS, HILLS | **Acid Spray** AoE (DEX save), grapple | Slashing + Acid |
| Will-o'-Wisp | 2 | SWAMP, FOREST | AC 19, resist almost everything, lightning | Lightning |

*Already in game but needs Pack Tactics and disease.*

### Tier 2: Mid-Low (Levels 6-10, CR 3-5)

| Monster | CR | Biome | Key Mechanic | Damage Type |
|---|---|---|---|---|
| Basilisk | 3 | UNDERGROUND, DESERT | **Petrifying Gaze** (CON save) | Piercing + Poison |
| Manticore | 3 | HILLS, MOUNTAIN | **Ranged tail spikes** (3/round, 200 ft.) | Piercing |
| Phase Spider | 3 | FOREST, UNDERGROUND | **Ethereal Jaunt** (teleport between planes), heavy poison | Piercing + Poison |
| Hell Hound | 3 | VOLCANIC, BADLANDS | **Fire Breath** (Recharge 5-6), Pack Tactics, fire immune | Piercing + Fire |
| Winter Wolf | 3 | TUNDRA | **Cold Breath** (Recharge 5-6), knockdown bite | Piercing + Cold |
| Troll* | 5 | SWAMP | **Regeneration 10/turn** (disabled by fire/acid) | Piercing, Slashing |
| Shambling Mound | 5 | SWAMP, FOREST | **Engulf**, lightning absorption (heals from lightning) | Bludgeoning |
| Wraith | 5 | UNDERGROUND, SWAMP | **Life Drain** (max HP reduction), incorporeal, resist everything | Necrotic |

*Already in game but needs regeneration mechanic.*

### Tier 3: Mid (Levels 11-15, CR 6-10)

| Monster | CR | Biome | Key Mechanic | Damage Type |
|---|---|---|---|---|
| Medusa | 6 | UNDERGROUND, DESERT | **Petrifying Gaze** (instant if fail by 5+), ranged + melee | Piercing + Poison |
| Chimera | 6 | HILLS, MOUNTAIN | **Fire Breath** + triple-type multiattack, flying | Piercing, Bludgeoning, Slashing + Fire |
| Wyvern | 6 | MOUNTAIN, COASTAL | **Massive poison stinger** (7d6 poison, CON save) | Piercing + Poison |
| Oni | 7 | FOREST, MOUNTAIN | **Regeneration 10/turn** + innate spellcasting + shapeshifting | Slashing + Cold |
| Hydra* | 8 | SWAMP, COASTAL | **5 heads = 5 attacks**, head regrows x2 unless fire | Piercing |
| Young Green Dragon | 8 | FOREST, SWAMP | **Poison Breath** 30ft cone (12d6), poison immune | Piercing, Slashing + Poison |
| Frost Giant | 8 | TUNDRA, MOUNTAIN | **Rock Throw** 240ft + 25 damage greatsword, cold immune | Slashing, Bludgeoning |
| Drider | 6 | UNDERGROUND | **Spellcasting** (darkness, faerie fire) + poison attacks | Slashing, Piercing + Poison |

*Already in game but needs multi-head attacks and head regeneration.*

### Tier 4: Mid-High (Levels 16-20, CR 11-15)

| Monster | CR | Biome | Key Mechanic | Damage Type |
|---|---|---|---|---|
| Behir | 11 | MOUNTAIN, UNDERGROUND | **Lightning Breath** (12d10) + **Swallow** | Piercing, Bludgeoning + Lightning + Acid |
| Remorhaz | 11 | TUNDRA | **Heated Body** (melee attackers take fire) + Swallow | Piercing + Fire + Acid |
| Roc | 11 | MOUNTAIN, COASTAL | **Gargantuan grappler** (DC 19, carries + drops from height) | Piercing, Slashing |
| Vampire | 13 | UNDERGROUND, FOREST | **Regeneration 20/turn** + Charm + Life Drain + **Legendary Actions** | Bludgeoning + Necrotic |
| Storm Giant | 13 | COASTAL, MOUNTAIN | **Lightning Strike** 500ft range AoE + 30 damage greatsword | Slashing, Bludgeoning + Lightning |
| Purple Worm | 15 | UNDERGROUND, DESERT | **Swallow** + **42 (12d6) poison** tail stinger | Piercing + Acid + Poison |
| Mummy Lord | 15 | DESERT, UNDERGROUND | **Mummy Rot** (curse, -10 max HP/day) + spellcasting + **Legendary Actions** | Bludgeoning + Necrotic |
| Iron Golem | 16 | UNDERGROUND, MOUNTAIN | AC 20, **fire absorption**, magic resistance, immune to almost everything | Bludgeoning, Slashing + Poison |

### Tier 5: High (Levels 21-30, CR 16-20)

| Monster | CR | Biome | Key Mechanic | Damage Type |
|---|---|---|---|---|
| Adult Red Dragon | 17 | VOLCANIC, MOUNTAIN | **Fire Breath** 60ft cone (18d6) + Frightful Presence + **3 Legendary Actions** | Piercing, Slashing + Fire |
| Pit Fiend | 20 | VOLCANIC, UNDERGROUND | **4 attacks/round** + Fear Aura + fire on mace + spellcasting | All physical + Fire + Poison |
| Balor | 19 | VOLCANIC, UNDERGROUND | **Fire Aura** (passive damage) + **Death Throes** (20d6 on death) | Slashing + Lightning + Fire |
| Aboleth | 10 (scaled) | UNDERGROUND, COASTAL | **Enslave** (mind control 3/day) + disease | Bludgeoning + Psychic |
| Ancient Brass Dragon | 20 | DESERT, PLAINS | **Dual breath** (fire + sleep), Legendary Resistance | Piercing, Slashing + Fire |

### Tier 6: Epic (Levels 31-40, CR 21+)

| Monster | CR | Biome | Key Mechanic | Damage Type |
|---|---|---|---|---|
| Lich* | 21 | UNDERGROUND, SWAMP | **18th-level wizard** (Power Word Kill, Dominate Monster) + Legendary + Rejuvenation | Cold + Necrotic |
| Ancient Black Dragon | 21 | SWAMP | **Acid Breath** 90ft line (15d8) + Legendary | Piercing, Slashing + Acid |
| Kraken | 23 | COASTAL | **3 tentacles** + Lightning Storm + Swallow + Ink Cloud | Bludgeoning + Lightning + Acid + Poison |
| Ancient Red Dragon | 24 | VOLCANIC, MOUNTAIN | **Fire Breath** 90ft cone (26d6=91 avg!) + 3 Legendary Actions | Piercing, Slashing + Fire |
| Solar | 21 | MOUNTAIN, PLAINS | **Slaying Longbow** (instant death < 100 HP) + Searing Burst | Slashing + Radiant + Fire |

*Already in game as basic melee -- the gap is enormous.*

### Tier 7: Mythic (Levels 41-50, Beyond CR)

| Monster | CR | Biome | Key Mechanic | Damage Type |
|---|---|---|---|---|
| Tarrasque | 30 | ANY | **5 attacks/round**, Reflective Carapace, Swallow, immune to almost everything, 676 HP | All physical + Acid |
| Ancient Gold Dragon | 24 | MOUNTAIN, PLAINS | **Dual breath** (fire + Weakening Breath disables STR chars) | Piercing, Slashing + Fire |
| Ancient Blue Dragon | 23 | DESERT, BADLANDS | **Lightning Breath** 120ft line (16d10=88 avg) | Piercing, Slashing + Lightning |
| Elder Kraken (scaled) | 27+ | COASTAL | Scaled Kraken with more tentacles and amplified Lightning Storm | All + Lightning + Acid |

---

## 7. Current Monster vs SRD Gap Analysis

### Every Monster Compared

| Our Monster | SRD Equivalent | What We Have | What SRD Has | Gap Severity |
|---|---|---|---|---|
| **Goblin** (L1) | CR 1/4 Goblin | Basic melee 1d4+1 | Nimble Escape (disengage/hide bonus), Scimitar 1d6+2, Shortbow 1d6+2 | **Low** -- minor ability |
| **Giant Rat** (L1) | CR 1/8 Giant Rat | Basic melee 1d4+1 | Pack Tactics (advantage w/ ally), disease on bite | **Medium** -- missing pack synergy |
| **Wolf** (L2) | CR 1/4 Wolf | Basic melee 1d6+1 | Pack Tactics, Bite knockdown (DC 11 STR save or prone) | **Medium** -- missing knockdown |
| **Slime** (L2) | CR 2 Ochre Jelly | Basic melee 1d6 | Pseudopod 2d6+1 acid, Split (splits in two when hit with lightning/slashing), acid immune, **amorphous** | **High** -- missing split mechanic, acid damage type |
| **Mana Wisp** (L3) | CR 2 Will-o'-Wisp | Basic melee 1d6+1 | AC 19, **lightning damage**, resist almost everything, invisibility, incorporeal | **Critical** -- our Mana Wisp has AC 13 and no special traits |
| **Bandit** (L3) | CR 1/8 Bandit | Basic melee 1d6+2 | Scimitar or light crossbow (ranged option) | **Low** -- just needs ranged option |
| **Bog Wraith** (L4) | CR 5 Wraith | Basic melee 1d6+2 | **Life Drain** (4d8+3 necrotic + max HP reduction), incorporeal, resist everything | **Critical** -- missing entire identity |
| **Skeleton Warrior** (L5) | CR 1/4 Skeleton | Basic melee 1d10+3 | Shortbow (ranged), **vulnerability to bludgeoning**, immune to poison/exhaustion | **Medium** -- missing vulnerability and immunity |
| **Orc Warrior** (L6) | CR 1/2 Orc | Basic melee 1d10+3 | **Aggressive** (bonus action dash toward enemy), Greataxe 1d12+3 | **Low** -- minor ability |
| **Giant Spider** (L7) | CR 1 Giant Spider | Basic melee 1d10+3 | **Web** (restrains, DC 12), Bite + **2d8 poison** (DC 11 CON), web walk, spider climb | **Critical** -- missing web, poison, and stealth |
| **Arcane Elemental** (L7) | CR 5 Air/Fire Elemental | Basic melee 1d10+3 | **Elemental form** (immune to physical conditions), multi-attack (2x), specific damage immunity + vulnerability, whirlwind/fire form | **Critical** -- missing entire elemental identity |
| **Dire Wolf** (L8) | CR 1 Dire Wolf | Basic melee 2d8+3 | Pack Tactics, Bite 2d6+3 + **knockdown** (DC 13 STR) | **Medium** -- missing knockdown |
| **Shadow Wraith** (L9) | CR 5 Wraith | Basic melee 2d6+3 | Life Drain (necrotic + max HP reduction), incorporeal, resist everything, sunlight weakness | **High** -- missing life drain and resistances |
| **Troll** (L9) | CR 5 Troll | Basic melee 2d6+4 | **Regeneration 10/turn** (disabled by fire/acid), Multiattack (bite + 2 claws), Keen Smell | **Critical** -- missing THE defining trait |
| **Ancient Golem** (L12) | CR 10 Stone Golem | Basic melee 2d10+5 | **Magic Resistance**, **Slow** ability (WIS save, reduces target actions), immune to most conditions, absorb spells | **Critical** -- missing all golem traits |
| **Void Stalker** (L13) | Custom / CR 6 Phase Spider (scaled) | Basic melee 2d8+5 | Should have: ethereal jaunt, heavy poison, ambush mechanics | **High** -- missing all flavor |
| **Young Dragon** (L14) | CR 8 Young Dragon | Basic melee 2d10+6 | **Breath Weapon** (e.g., 12d6 cone), Multiattack (bite + 2 claws), **damage immunity**, flying | **Critical** -- a dragon with no breath weapon |
| **Hydra** (L15) | CR 8 Hydra | Basic melee 3d6+4 | **5 attacks/round** (one per head), head regeneration (2 new heads unless fire), advantage on saves vs many conditions | **Critical** -- a Hydra that attacks once |
| **Demon** (L16) | CR 19 Balor / CR 13 Glabrezu | Basic melee 2d8+6 | **Fire Aura**, Death Throes, Magic Resistance, multi-attack, fear | **Critical** -- missing all demonic traits |
| **Elder Fey Guardian** (L16) | Custom / CR 9 Treant | Basic melee 2d10+5 | Should have: animate trees, slam damage, nature magic, resistance to nonmagical | **High** -- no fey abilities |
| **Lich** (L18) | CR 21 Lich | Basic melee 3d6+5 | **18th-level wizard spellcasting** (Power Word Kill, Dominate Monster, Disintegrate), Paralyzing Touch, **3 Legendary Actions**, Legendary Resistance, Rejuvenation | **CATASTROPHIC** -- a Lich that punches |

### Gap Severity Summary

| Severity | Count | Monsters |
|---|---|---|
| **CATASTROPHIC** | 1 | Lich (supposed to be an 18th-level wizard, only punches) |
| **CRITICAL** | 8 | Mana Wisp, Bog Wraith, Giant Spider, Arcane Elemental, Troll, Ancient Golem, Young Dragon, Hydra, Demon |
| **HIGH** | 3 | Slime, Shadow Wraith, Void Stalker, Elder Fey Guardian |
| **MEDIUM** | 4 | Giant Rat, Wolf, Skeleton Warrior, Dire Wolf |
| **LOW** | 3 | Goblin, Bandit, Orc Warrior |

---

## 8. Recommendations

### What Can Be Done WITHOUT Engine Changes (Data/Seed Only)

Nothing meaningful. The engine has no mechanism to consume monster ability data even if we stored it. However, two small improvements are possible:

1. **Add `damageType` to monster stats** -- the field is already on `WeaponInfo` and gets logged. Doesn't affect gameplay but prepares for resistance implementation.
2. **Fix biome coverage** -- add monsters to DESERT, and add more to PLAINS/HILLS/MOUNTAIN/COASTAL.

### What REQUIRES Engine Changes (Prioritized)

#### Phase 1: Monster Ability Foundation

**Estimated scope: Medium (1-2 days)**

1. **Create `MonsterAbility` type** in `shared/src/types/combat.ts`:
   ```typescript
   interface MonsterAbility {
     name: string;
     type: 'damage' | 'status' | 'buff' | 'heal' | 'aoe' | 'multiattack';
     recharge?: number;       // 5 = recharges on 5-6 each round
     cooldown?: number;       // rounds between uses
     usesPerCombat?: number;
     damage?: string;         // dice notation
     damageType?: string;
     saveDC?: number;
     saveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
     statusEffect?: string;
     statusDuration?: number;
     range?: number;          // 0 = melee, >0 = ranged/AoE
     aoeShape?: 'cone' | 'line' | 'sphere';
     aoeSize?: number;
     attacks?: number;        // for multiattack
     hpPerTurn?: number;      // for regeneration
     disabledBy?: string[];   // damage types that disable this ability
     onHit?: boolean;         // triggers on basic attack hit
   }
   ```

2. **Add `abilities` JSON field to Monster schema** (Prisma migration)

3. **Add monster ability definitions to seed data** -- start with existing 21 monsters, giving each their SRD-appropriate abilities

4. **Implement monster `decideAction()` variant** in tick-combat-resolver.ts:
   - Check if any abilities are available (not on cooldown, recharged)
   - Priority: breath weapon > status ability > multi-attack > basic attack
   - Simple rule-based AI, not complex decision tree

5. **Implement monster ability resolution** -- dispatch to handlers similar to class-ability-resolver.ts

#### Phase 2: Damage Type System

**Estimated scope: Small (half day)**

1. **Add `resistances`, `immunities`, `vulnerabilities`, `conditionImmunities`** to Monster schema
2. **Check damage type in `resolveAttack()`** -- apply 0.5x (resistance), 0x (immunity), 2x (vulnerability)
3. **Check condition immunities in `applyStatusEffect()`** -- block specified conditions
4. **Populate data for all 21 monsters**

#### Phase 3: Multi-Attack & On-Hit Effects

**Estimated scope: Small-Medium**

1. **Multi-attack**: Allow monsters to take N attacks per turn (reuse `handleMultiAttack` pattern from class abilities)
2. **On-hit status effects**: After basic attack hits, roll save DC for status application (poison on Spider bite, knockdown on Wolf bite, etc.)
3. **Conditional regeneration**: Check if fire/acid damage was dealt this round; if not, apply regen HP

#### Phase 4: Boss Features (Level 16+)

**Estimated scope: Medium-Large**

1. **Legendary Actions**: Extra actions at end of other combatants' turns (1-3 per round)
2. **Legendary Resistance**: Auto-succeed on N failed saves per combat
3. **Fear Aura**: Passive save-or-frightened for combatants within range
4. **Breath Weapon (Recharge)**: AoE damage with recharge roll each round

#### Phase 5: High-Level Content (Level 21+)

**Estimated scope: Large**

1. **Spell-like abilities**: Use existing `resolveCast()` for monster spells
2. **Swallow/Engulf**: Remove target from combat, apply DoT, breakout mechanic
3. **Death Throes**: AoE damage on monster death
4. **Phase transitions**: Change AI behavior at HP thresholds

### New Monsters to Add Per Tier

| Tier | Current Count | Target Count | New Monsters Needed |
|---|---|---|---|
| Low (1-5) | 8 | 10-12 | Poisonous Snake, Cockatrice, Shadow, Ghoul |
| Mid-Low (6-10) | 6 | 10-12 | Basilisk, Manticore, Hell Hound, Winter Wolf, Phase Spider, Shambling Mound |
| Mid (11-15) | 7 | 10-12 | Medusa, Chimera, Wyvern, Oni, Young Green Dragon |
| Mid-High (16-20) | 0 | 8-10 | ALL NEW: Behir, Remorhaz, Vampire, Storm Giant, Purple Worm, Mummy Lord, Iron Golem |
| High (21-30) | 0 | 5-6 | ALL NEW: Adult Red Dragon, Pit Fiend, Balor, Aboleth, Ancient Brass Dragon |
| Epic (31-40) | 0 | 4-5 | ALL NEW: Ancient Black Dragon, Kraken, Ancient Red Dragon, Solar |
| Mythic (41-50) | 0 | 3-4 | ALL NEW: Tarrasque, Ancient Gold Dragon, Ancient Blue Dragon |

**Total: 21 existing + ~35 new = ~56 monsters for full L1-50 coverage**

### Implementation Priority

1. **Engine Phase 1** (Monster ability foundation) -- unlocks ability definitions for all monsters
2. **Engine Phase 2** (Damage types) -- unlocks resistances/immunities/vulnerabilities
3. **Upgrade existing 21 monsters** with abilities + damage types (data only after engine work)
4. **Engine Phase 3** (Multi-attack + on-hit) -- unlocks tactical combat depth
5. **Add Tier 4 monsters** (L16-20) -- extends playable content
6. **Engine Phase 4** (Boss features) -- unlocks legendary actions/resistance
7. **Add Tier 5-7 monsters** (L21-50) -- endgame content
8. **Engine Phase 5** (High-level features) -- polish for epic/mythic tier
