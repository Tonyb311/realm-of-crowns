# Phase 4B — Endgame Monsters (L31–50) + Biome Backfill + Storm Aura Fix

```
cat CLAUDE.md
cat .claude/agents/combat.md 2>/dev/null || echo "No combat agent file"
```

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed (frontend, backend, game design, narrative, art direction, etc.).
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable. Ensure game mechanics, narrative, UI, and code all align.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed. Don't pad the team.
- Common roles include (but aren't limited to):
  - **Game Designer** — Mechanics, systems, balance, progression, combat
  - **Narrative Designer** — Story, lore, dialogue, quests, world-building
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **UX/UI Designer** — Interface layout, player flow, menus, HUD, accessibility
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review
  - **Art Director** — Visual style, asset guidance, theming, mood and atmosphere

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies (HTML, CSS, JavaScript/TypeScript, Canvas/WebGL where appropriate, and relevant backend stacks).
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Consider both solo and multiplayer implications when relevant.
- Keep scope realistic for a browser game. Avoid over-engineering or suggesting AAA-scale solutions.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together and flags open questions or next steps.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Keep the game's vision consistent across all teammate contributions.
- Always end with a clear summary of what was delivered and what still needs the user's input.

---

## Context

### Current Monster Roster (35 monsters after Phase 4A)

**Tier 1 (L1–5):** Goblin(1), Wolf(2), Slime(2), Bandit(3), Mana Wisp(3), Giant Rat(1), Bog Wraith(4), Skeleton Warrior(5)
**Tier 2 (L5–10):** Orc Warrior(6), Giant Spider(7), Arcane Elemental(7), Dire Wolf(8), Troll(9), Shadow Wraith(9)
**Tier 3 (L10–20):** Ancient Golem(12), Void Stalker(13), Young Dragon(14), Hydra(15), Demon(16), Elder Fey Guardian(16), Wyvern(17), Treant(18), Lich(18), Chimera(19), Mind Flayer(20)
**Tier 4 (L21–30):** Vampire Lord(21), Frost Giant(22), Sea Serpent(22), Fey Dragon(22), Iron Golem(23), Fire Giant(24), Purple Worm(25), Beholder(26), Death Knight(28), Storm Giant(30)

**Gap:** L31–50 has ZERO monsters (entire endgame is empty).

### Biome Coverage After 4A

| Biome | Count | Monsters |
|-------|-------|----------|
| UNDERGROUND | 7 | Giant Rat(1), Giant Spider(7), Shadow Wraith(9), Void Stalker(13), Mind Flayer(20), Purple Worm(25), Beholder(26) |
| SWAMP | 7 | Slime(2), Mana Wisp(3), Bog Wraith(4), Skeleton Warrior(5), Troll(9), Lich(18), Death Knight(28) |
| FOREST | 4 | Wolf(2), Elder Fey Guardian(16), Treant(18), Vampire Lord(21) |
| MOUNTAIN | 4 | Ancient Golem(12), Wyvern(17), Iron Golem(23), Storm Giant(30) |
| TUNDRA | 3 | Dire Wolf(8), Young Dragon(14), Frost Giant(22) |
| VOLCANIC | 3 | Arcane Elemental(7), Demon(16), Fire Giant(24) |
| BADLANDS | 2 | Orc Warrior(6), Chimera(19) |
| COASTAL | 2 | Hydra(15), Sea Serpent(22) |
| PLAINS | 1 | Bandit(3) — needs high-level entries |
| HILLS | 1 | Goblin(1) — needs high-level entries |
| FEYWILD | 1 | Fey Dragon(22) |
| **DESERT** | **0** | **EMPTY** |
| **RIVER** | **0** | **EMPTY** |
| **UNDERWATER** | **0** | **EMPTY** |

### Arcane Reagent Droppers (current)

Mana Wisp(3), Bog Wraith(4), Arcane Elemental(7), Shadow Wraith(9), Void Stalker(13), Elder Fey Guardian(16), Fey Dragon(22)

**Gap:** Highest arcane dropper is L22. Need at least one L35+ and one L45+ arcane dropper.

### Known Bug from Phase 4A

**Storm Giant's storm_aura dealing 0 damage.** The `damage_aura` handler may not be applying `auraDamage` correctly. The Demon (L16) also has a Fire Aura — check if that one works. If the Demon's aura also does 0, it's an engine bug in `handleDamageAura()`. If Demon's works, it's a Storm Giant seed data issue. Fix whichever is broken.

### Engine Features Available

All ability types from Phases 1–4A:
- damage, status, aoe, multiattack, buff, heal, on_hit
- fear_aura, damage_aura, death_throes, **swallow**
- Legendary Actions + Legendary Resistances
- Phase Transitions (hpThresholdPercent triggers)
- Death Throes (deathDamage/deathDamageType/deathSaveDC)

### Valid Regions (with biome)

**Core (8):** Verdant Heartlands (PLAINS), Silverwood Forest (FOREST), Ironvault Mountains (MOUNTAIN), The Crossroads (HILLS), Ashenfang Wastes (BADLANDS), Shadowmere Marshes (SWAMP), Frozen Reaches (TUNDRA), The Suncoast (COASTAL)

**Common (6):** Twilight March (FOREST), Scarred Frontier (BADLANDS), Cogsworth Warrens (HILLS), Pelagic Depths (UNDERWATER), Thornwilds (FOREST), Glimmerveil (FEYWILD)

**Exotic (7):** Skypeak Plateaus (MOUNTAIN), Vel'Naris Underdark (UNDERGROUND), Mistwood Glens (FOREST), The Foundry (MOUNTAIN), The Confluence (VOLCANIC), Ashenmoor (SWAMP)

**IMPORTANT — DESERT and RIVER biome placement:**
- No region has DESERT or RIVER as its primary biome
- The monster `biome` field and `regionName` are independent — a monster CAN have `biome: 'DESERT'` while being in regionName `'The Suncoast'` (which is COASTAL)
- The Suncoast contains Sandrift town (DESERT biome) — use The Suncoast as the region for DESERT monsters
- RIVER monsters can be placed in any region with rivers — use Verdant Heartlands (PLAINS) or The Crossroads (HILLS)
- UNDERWATER monsters go in Pelagic Depths

### Valid BiomeType enum values

PLAINS, FOREST, MOUNTAIN, HILLS, BADLANDS, SWAMP, TUNDRA, VOLCANIC, COASTAL, DESERT, RIVER, UNDERGROUND, UNDERWATER, FEYWILD

### Damage types available

SLASHING, PIERCING, BLUDGEONING, FIRE, COLD, LIGHTNING, ACID, POISON, NECROTIC, RADIANT, FORCE, PSYCHIC, THUNDER

### Key Files

- `database/seeds/monsters.ts` — Monster seed data (MonsterDef interface + seedMonsters function)
- `server/src/lib/combat-engine.ts` — Core combat resolution, STATUS_EFFECT_DEFS
- `server/src/lib/monster-ability-resolver.ts` — Monster ability handlers
- `server/src/services/tick-combat-resolver.ts` — Tick combat resolution loop
- `shared/src/types/combat.ts` — Combat type definitions

---

## Task: Three deliverables

### PART 0 — Storm Aura Bug Fix

Before adding new monsters, investigate and fix the storm aura 0-damage bug from Phase 4A.

1. Read `server/src/lib/monster-ability-resolver.ts` — find the `handleDamageAura()` function
2. Check if the `auraDamage` field is being parsed and rolled correctly (it should use parseDamageString + damageRoll)
3. Check the Demon (L16) seed — does its Fire Aura also produce 0 damage in a quick sim? If yes, the handler is broken. If no, it's a Storm Giant seed data issue.
4. Fix whichever is broken
5. Run a quick 5-fight sim: Warrior L30 vs Storm Giant — confirm damage_aura now deals >0 damage

### PART 1 — New Monsters (16 total, L31–50)

Add these 16 monsters to `database/seeds/monsters.ts`. Follow the exact same MonsterDef format as existing monsters.

#### Stat Scaling Reference

Extrapolate from existing roster:
- L18 Lich: 120 HP, 17 AC, +9 atk, 3d6+5
- L25 Purple Worm: 220 HP, 18 AC, +12 atk, 3d8+7
- L30 Storm Giant: 280 HP, 21 AC, +14 atk, 3d10+8

Scale L31–50 monsters proportionally:
- **L31–35:** HP 280–340, AC 20–22, attack +14–16, damage 3d10+8 to 4d8+9
- **L36–40:** HP 340–420, AC 21–23, attack +16–18, damage 4d8+9 to 4d10+10
- **L41–45:** HP 420–520, AC 22–24, attack +18–20, damage 4d10+10 to 5d8+12
- **L46–50:** HP 520–650, AC 23–25, attack +20–22, damage 5d8+12 to 5d10+14

**Gold/loot scaling:** L31–35 = 100–200g, L36–40 = 150–300g, L41–45 = 250–500g, L46–50 = 400–800g.

---

#### Monster Roster

##### 1. Sand Wyrm (L31) — DESERT / The Suncoast
- damageType: PIERCING
- resistances: ['FIRE']
- **Abilities:**
  - Burrow Strike multiattack, 2 attacks, cooldown 0
  - Sand Blast (aoe): 6d8 BLUDGEONING, DEX save DC 18, cooldown 3
  - Tremorsense Ambush (on_hit): DEX save DC 17, knocked_down 1 round — represents surprise attacks from below
- death_throes: deathDamage "6d6", deathDamageType "BLUDGEONING", deathSaveDC 17, deathSaveType "dex"
- Stats: ~290 HP, 20 AC, +14 atk, 3d10+8 base

##### 2. Kraken Spawn (L32) — UNDERWATER / Pelagic Depths
- damageType: BLUDGEONING
- resistances: ['COLD', 'LIGHTNING']
- immunities: ['ACID']
- **Abilities:**
  - Tentacle Slam multiattack, 3 attacks, cooldown 0
  - Ink Cloud (status): CON save DC 18, blinded 2 rounds, cooldown 3 (use 'weakened' if blinded isn't in StatusEffectName — weakened represents disorientation)
  - Constrict (status): STR save DC 18, restrained 2 rounds, cooldown 2
- legendaryActions: 1
- Stats: ~310 HP, 20 AC, +14 atk, 3d8+8 base

##### 3. War Mammoth (L33) — PLAINS / Verdant Heartlands
- damageType: BLUDGEONING
- resistances: ['COLD']
- **Abilities:**
  - Gore + Stomp multiattack, 2 attacks, cooldown 0
  - Trampling Charge (aoe): 6d10 BLUDGEONING, DEX save DC 18, cooldown 3
  - Tusk Toss (on_hit): STR save DC 18, knocked_down 1 round
- Stats: ~330 HP, 20 AC, +15 atk, 3d10+8 base — high HP brute, low complexity

##### 4. River Leviathan (L34) — RIVER / Verdant Heartlands
- damageType: PIERCING
- resistances: ['COLD']
- **Abilities:**
  - Bite + Tail multiattack, 2 attacks, cooldown 0
  - Tidal Wave (aoe): 5d10 BLUDGEONING, STR save DC 18, cooldown 3
  - Drag Under (status): STR save DC 18, restrained 2 rounds, cooldown 2
- Stats: ~320 HP, 19 AC, +15 atk, 3d10+8 base

##### 5. Basilisk King (L35) — HILLS / Cogsworth Warrens
- damageType: PIERCING
- immunities: ['POISON']
- **Abilities:**
  - Multiattack (bite + tail), 2 attacks, cooldown 0
  - Petrifying Gaze (status): CON save DC 19, stunned 2 rounds, cooldown 4, priority 9 — represents partial petrification
  - Venomous Bite (on_hit): CON save DC 18, poisoned 3 rounds
- legendaryResistances: 1
- Phase: 30% HP → "Stone Fury" — stat_boost { attack: 3, ac: 2 }
- Stats: ~340 HP, 21 AC, +15 atk, 4d8+9 base

##### 6. Aboleth (L37) — UNDERWATER / Pelagic Depths
- damageType: PSYCHIC
- resistances: ['PSYCHIC', 'COLD']
- immunities: ['POISON']
- conditionImmunities: ['poisoned', 'charmed']
- **Abilities:**
  - Tentacle multiattack, 3 attacks, cooldown 0
  - Enslave (status): WIS save DC 20, charmed 3 rounds, cooldown 4, priority 9
  - Psychic Drain (aoe): 6d8 PSYCHIC, WIS save DC 19, cooldown 3
  - Mucus Cloud (status): CON save DC 19, poisoned 2 rounds, cooldown 3
- legendaryActions: 2
- legendaryResistances: 2
- Stats: ~370 HP, 21 AC, +16 atk, 3d10+9 base

##### 7. Djinn Lord (L38) — DESERT / The Suncoast
- damageType: LIGHTNING
- immunities: ['LIGHTNING', 'THUNDER']
- resistances: ['FIRE']
- **Abilities:**
  - Scimitar multiattack, 2 attacks, cooldown 0
  - Whirlwind (aoe): 8d8 BLUDGEONING, STR save DC 20, cooldown 3
  - Lightning Storm (aoe): 6d10 LIGHTNING, DEX save DC 19, cooldown 2
  - Wind Shield (buff): self, statusEffect 'shielded', statusDuration 2, cooldown 4
- legendaryActions: 2
- legendaryResistances: 1
- Stats: ~380 HP, 22 AC, +17 atk, 4d8+9 base

##### 8. Roc (L39) — MOUNTAIN / Ironvault Mountains
- damageType: PIERCING
- **Abilities:**
  - Talon + Beak multiattack, 2 attacks, cooldown 0
  - Snatch (status): DEX save DC 20, restrained 2 rounds, cooldown 3, priority 8
  - Wing Buffet (aoe): 6d8 BLUDGEONING, STR save DC 19, cooldown 2
- Stats: ~400 HP, 21 AC, +17 atk, 4d10+9 base — massive flying predator, simple but hard-hitting

##### 9. Archlich (L40) — SWAMP / Ashenmoor ★ ARCANE REAGENT DROPPER
- damageType: NECROTIC
- resistances: ['COLD', 'LIGHTNING', 'NECROTIC']
- immunities: ['POISON', 'PSYCHIC']
- conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned']
- **Abilities:**
  - Power Word Stun (status): WIS save DC 21, stunned 2 rounds, cooldown 4, priority 10, isLegendaryAction true, legendaryCost 2
  - Necrotic Storm (aoe): 8d8 NECROTIC, CON save DC 20, cooldown 2
  - Soul Drain (on_hit): CON save DC 20, weakened 3 rounds
  - Death Aura (damage_aura): auraDamage "3d6", auraDamageType "NECROTIC"
- legendaryActions: 3
- legendaryResistances: 3
- Phase 1: 50% HP → "Phylactery Surge" — stat_boost { attack: 3, damage: 3 }, aoe_burst { damage: '6d8', damageType: 'NECROTIC', saveDC: 20, saveType: 'con' }
- Phase 2: 25% HP → "Undying Will" — stat_boost { ac: 3 }, add_ability { id: 'archlich_massraise', name: 'Mass Raise Dead', type: 'heal', hpPerTurn: 30, description: 'The archlich draws on death energy to sustain itself' }
- Stats: ~420 HP, 23 AC, +18 atk, 4d8+10 base — endgame boss, Lich's big brother
- lootTable: Arcane Reagents drop (0.60 chance, 4-7 qty) + gold (200-400)

##### 10. Phoenix (L42) — VOLCANIC / The Confluence
- damageType: FIRE
- immunities: ['FIRE', 'POISON']
- vulnerabilities: ['COLD']
- **Abilities:**
  - Flame Talon multiattack, 2 attacks, cooldown 0
  - Immolation Burst (aoe): 8d8 FIRE, DEX save DC 20, cooldown 2
  - Healing Flames (heal): hpPerTurn 25, disabledBy ['COLD'] — Phoenix regenerates unless hit with cold
  - Fire Aura (damage_aura): auraDamage "3d6", auraDamageType "FIRE"
- death_throes: deathDamage "10d6", deathDamageType "FIRE", deathSaveDC 20, deathSaveType "dex"
- legendaryActions: 2
- legendaryResistances: 1
- Stats: ~440 HP, 22 AC, +19 atk, 4d10+10 base

##### 11. Pit Fiend (L43) — BADLANDS / Ashenfang Wastes
- damageType: SLASHING
- immunities: ['FIRE', 'POISON']
- resistances: ['COLD']
- conditionImmunities: ['poisoned', 'frightened']
- **Abilities:**
  - Mace + Tail multiattack, 2 attacks, cooldown 0
  - Fireball (aoe): 10d6 FIRE, DEX save DC 21, cooldown 2
  - Fear Aura (fear_aura): WIS save DC 21, frightened 1 round, auraRepeats false
  - Infernal Wound (on_hit): CON save DC 20, bleeding 3 rounds (use 'burning' for ongoing damage if bleeding not in system)
- legendaryActions: 2
- legendaryResistances: 2
- Phase: 25% HP → "Infernal Ascension" — stat_boost { attack: 4, damage: 4, ac: 2 }
- Stats: ~500 HP, 23 AC, +19 atk, 4d10+11 base

##### 12. Deep Kraken (L44) — UNDERWATER / Pelagic Depths
- damageType: BLUDGEONING
- immunities: ['LIGHTNING', 'COLD']
- resistances: ['ACID', 'PIERCING']
- **Abilities:**
  - Tentacle Lash multiattack, 4 attacks, cooldown 0 — the real kraken, not a spawn
  - Maelstrom (aoe): 8d10 BLUDGEONING, STR save DC 21, cooldown 3
  - Lightning Storm (aoe): 8d8 LIGHTNING, DEX save DC 20, cooldown 2
  - Ink Darkness (status): WIS save DC 20, frightened 2 rounds, cooldown 4
- legendaryActions: 3
- legendaryResistances: 2
- Stats: ~520 HP, 22 AC, +20 atk, 4d10+11 base

##### 13. Elder Wyrm (L46) — TUNDRA / Frozen Reaches
- damageType: PIERCING
- immunities: ['COLD']
- resistances: ['FIRE', 'LIGHTNING']
- **Abilities:**
  - Multiattack (bite + 2 claws), 3 attacks, cooldown 0
  - Glacial Breath (aoe): 14d6 COLD, CON save DC 22, recharge 5, cooldown 0, priority 10
  - Frightful Presence (fear_aura): WIS save DC 21, frightened 1 round, auraRepeats false
  - Tail Sweep (aoe): 6d8 BLUDGEONING, DEX save DC 20, cooldown 2
- legendaryActions: 3
- legendaryResistances: 3
- Phase: 20% HP → "Ancient Fury" — stat_boost { attack: 4, damage: 4, ac: -3 }, aoe_burst { damage: '10d6', damageType: 'COLD', saveDC: 22, saveType: 'con' }
- Stats: ~560 HP, 24 AC, +21 atk, 5d8+12 base — top-tier dragon, massive breath weapon

##### 14. Arcane Titan (L47) — FEYWILD / Glimmerveil ★ ARCANE REAGENT DROPPER
- damageType: FORCE
- immunities: ['PSYCHIC', 'FORCE']
- resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING']
- conditionImmunities: ['charmed', 'frightened']
- **Abilities:**
  - Arcane Fist multiattack, 2 attacks, cooldown 0
  - Arcane Cataclysm (aoe): 10d8 FORCE, WIS save DC 22, cooldown 2, priority 9
  - Antimagic Pulse (status): INT save DC 22, weakened 2 rounds, cooldown 4
  - Arcane Shield (buff): self, statusEffect 'shielded', statusDuration 2, cooldown 4
- legendaryActions: 2
- legendaryResistances: 2
- Phase: 30% HP → "Arcane Overload" — stat_boost { attack: 3, damage: 5 }, add_ability { id: 'arcanetitan_nova', name: 'Arcane Nova', type: 'aoe', damage: '12d8', damageType: 'FORCE', saveType: 'wis', saveDC: 23, cooldown: 3, priority: 10 }
- Stats: ~580 HP, 24 AC, +21 atk, 5d8+12 base
- lootTable: Arcane Reagents drop (0.70 chance, 5-10 qty) + gold (400-600) — endgame arcane source

##### 15. Tarrasque (L49) — PLAINS / Verdant Heartlands
- damageType: PIERCING
- immunities: ['FIRE', 'POISON']
- resistances: ['COLD', 'LIGHTNING', 'SLASHING', 'PIERCING', 'BLUDGEONING']
- conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned']
- critResistance: -30
- **Abilities:**
  - Multiattack (bite + 2 claws + tail), 4 attacks, cooldown 0
  - Swallow (swallow): STR save DC 24, swallowDamage "5d8", swallowDamageType "ACID", swallowEscapeThreshold 40, cooldown 4, priority 8
  - Frightful Presence (fear_aura): WIS save DC 23, frightened 1 round, auraRepeats false
  - Tail Sweep (aoe): 8d8 BLUDGEONING, DEX save DC 22, cooldown 2
- legendaryActions: 3
- legendaryResistances: 3
- Phase 1: 50% HP → "Primal Rage" — stat_boost { attack: 3, damage: 3 }, aoe_burst { damage: '8d6', damageType: 'BLUDGEONING', saveDC: 22, saveType: 'str' }
- Phase 2: 20% HP → "Extinction Event" — stat_boost { attack: 5, ac: 2 }, add_ability { id: 'tarrasque_quake', name: 'Earthshatter', type: 'aoe', damage: '12d10', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 24, cooldown: 3, priority: 10 }
- Stats: ~640 HP, 25 AC, +22 atk, 5d10+14 base — THE apex monster, near-final boss

##### 16. Void Emperor (L50) — UNDERGROUND / Vel'Naris Underdark
- damageType: PSYCHIC
- immunities: ['PSYCHIC', 'NECROTIC', 'POISON']
- resistances: ['COLD', 'FIRE', 'LIGHTNING', 'FORCE']
- conditionImmunities: ['poisoned', 'frightened', 'charmed', 'stunned']
- critResistance: -25
- **Abilities:**
  - Void Rend multiattack, 3 attacks, cooldown 0
  - Reality Tear (aoe): 12d8 PSYCHIC, WIS save DC 24, cooldown 2, priority 9
  - Existential Dread (fear_aura): WIS save DC 24, frightened 2 rounds, auraRepeats false
  - Void Drain (on_hit): WIS save DC 22, weakened 3 rounds
  - Dimensional Rift (status): INT save DC 23, stunned 2 rounds, cooldown 4, priority 10, isLegendaryAction true, legendaryCost 2
- legendaryActions: 3
- legendaryResistances: 3
- Phase 1: 50% HP → "Void Ascension" — stat_boost { attack: 4, damage: 4 }, aoe_burst { damage: '10d8', damageType: 'PSYCHIC', saveDC: 24, saveType: 'wis' }
- Phase 2: 20% HP → "Event Horizon" — stat_boost { ac: 3 }, add_ability { id: 'voidemperor_collapse', name: 'Dimensional Collapse', type: 'aoe', damage: '14d8', damageType: 'FORCE', saveType: 'int', saveDC: 25, cooldown: 3, priority: 10 }
- death_throes: deathDamage "12d8", deathDamageType "PSYCHIC", deathSaveDC 22, deathSaveType "wis"
- Stats: ~650 HP, 25 AC, +22 atk, 5d10+14 base — THE final boss monster, L50 cap

---

### PART 2 — Smoke Sims + Verification

Run 10 iterations of each matchup. Write all results to `docs/investigations/phase4b-smoke-results.md`:

1. **Storm Giant storm_aura fix verification** — Warrior L30 vs Storm Giant, 5 fights. Confirm damage_aura deals >0 damage in at least 1 fight.
2. Warrior L35 vs Basilisk King (L35) — verify stun + phase transition
3. Warrior L40 vs Archlich (L40) — verify legendary actions, phase transitions, arcane reagent drops
4. Warrior L45 vs Deep Kraken (L44) — verify 4-attack multiattack + maelstrom
5. Warrior L49 vs Tarrasque (L49) — verify swallow (threshold 40) + multi-phase
6. Warrior L50 vs Void Emperor (L50) — verify full legendary kit + death throes
7. Psion L47 vs Arcane Titan (L47) — verify arcane reagent drops

---

## Implementation Order

### Step 0 — Storm Aura Fix
1. Investigate `handleDamageAura()` in monster-ability-resolver.ts
2. Check Demon Fire Aura behavior (quick sim or code review)
3. Fix the bug
4. Verify with 5 Storm Giant fights

### Step 1 — Monster Seed Data
1. Add all 16 monsters to `database/seeds/monsters.ts` MONSTERS array
2. Update the file header comment with new tier info (Tier 5 L31-40, Tier 6 L41-50)
3. Ensure every monster follows existing MonsterDef interface exactly
4. Handle edge cases:
   - Archlich Mass Raise Dead: Model as heal type with hpPerTurn 30 (self-heal added at phase 2)
   - Phoenix Healing Flames: heal type with hpPerTurn 25, disabledBy ['COLD']
   - Tarrasque Swallow: Use existing swallow type from Phase 4A, higher threshold (40)
   - Void Emperor: Most complex monster — 3 LA, 3 LR, 2 phases, death throes, fear aura, 5 abilities
   - DESERT/RIVER biome on non-matching regions: Set biome field to DESERT/RIVER, regionName to the closest region

### Step 2 — Run Prisma + Build
1. `npx prisma generate` in BOTH shared/ and server/
2. `npx tsc --build shared/tsconfig.json`
3. `npx tsc --noEmit -p server/tsconfig.json`
4. `cd client && npx tsc --noEmit`

### Step 3 — Smoke Sims
1. Run all 7 matchups (10 iterations each except Storm Giant which is 5)
2. Dump results to `docs/investigations/phase4b-smoke-results.md`
3. All 16 monsters must deal non-zero damage
4. Swallow must fire in Tarrasque fights
5. Win rates don't need to be balanced yet

### Step 4 — Deploy
1. `git add -A && git commit -m "Phase 4B: storm aura fix + 16 endgame monsters (L31-50)"`
2. `git push origin main`
3. Build with unique image tag: `docker build -t rocregistry.azurecr.io/realm-of-crowns:phase4b-$(date +%Y%m%d%H%M) .`
4. `docker push rocregistry.azurecr.io/realm-of-crowns:phase4b-$(date +%Y%m%d%H%M)`
5. Update Azure Container App with new image tag (NOT :latest)
6. Run seed in production to add new monsters
7. Health check
8. Verify DB: `SELECT name, level, biome FROM monsters ORDER BY level` — expect 51 total

---

## Output Format

Write results to `docs/investigations/phase4b-results.md`:

```
PHASE 4B RESULTS
================

STORM AURA FIX:
  - Root cause: [description]
  - Fix applied: [what changed]
  - Verification: damage_aura deals X avg damage in 5 Storm Giant fights

NEW MONSTERS SEEDED: X/16
  [list each with level, biome, regionName]

ARCANE REAGENT DROPPERS:
  - Archlich (L40): confirmed drops X-Y reagents
  - Arcane Titan (L47): confirmed drops X-Y reagents

SMOKE SIM RESULTS:
  [each matchup with win rate, avg damage, key mechanics verified]

BUILDS:
  - shared: PASS/FAIL
  - server: PASS/FAIL
  - client: PASS/FAIL

DEPLOYMENT:
  - Commit: [hash]
  - Image tag: [tag]
  - Revision: [number]
  - Health: OK/FAIL
  - Total monsters in DB: [count — should be 51]

BIOME COVERAGE:
  PLAINS: [count] monsters
  FOREST: [count]
  MOUNTAIN: [count]
  HILLS: [count]
  BADLANDS: [count]
  SWAMP: [count]
  TUNDRA: [count]
  VOLCANIC: [count]
  COASTAL: [count]
  DESERT: [count]
  RIVER: [count]
  UNDERGROUND: [count]
  UNDERWATER: [count]
  FEYWILD: [count]

ISSUES:
  - [any problems found]
```

---

## IMPORTANT RULES

1. **Do NOT modify existing monsters** — only ADD new ones (exception: Storm Aura fix if it's a seed data issue)
2. **Do NOT touch class abilities, buildAbilityQueue, or the swallow engine** — those are done
3. **Use unique ability IDs** — prefix with monster name (e.g. `tarrasque_swallow`, `voidemperor_rift`)
4. **Every regionName must match exactly** from the valid regions list above
5. **Every biome must be a valid BiomeType enum value**
6. **Gold in lootTable** — scale with level properly. L50 monsters should drop 400-800g
7. **Arcane Reagent drops** — ONLY on Archlich (L40) and Arcane Titan (L47)
8. **Two monsters use the swallow engine** — Tarrasque (L49) with threshold 40, reusing Phase 4A's swallow type
9. **Run `npx prisma generate` in BOTH shared/ and server/** BEFORE build checks — we got burned by stale types in Phase 3
10. If any ability type doesn't fit cleanly, adapt the closest existing type. NO new ability types in this phase.
11. **L50 Void Emperor is the endgame apex** — it should be the hardest monster in the game. Give it everything.
