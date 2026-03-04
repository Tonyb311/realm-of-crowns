# Monster Template & Design Guide

Reference for creating and auditing monsters in Realm of Crowns.

---

## A. Field Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique monster name |
| `level` | number | Monster level (1-50) |
| `biome` | BiomeType | Primary biome (must be reachable — see Section D) |
| `regionName` | string | Region name matching a seeded region |
| `stats.hp` | number | Hit points |
| `stats.ac` | number | Armor class |
| `stats.attack` | number | Attack bonus |
| `stats.damage` | string | Base damage dice (e.g., `'2d8+5'`) |
| `stats.str/dex/con/int/wis/cha` | number | Ability scores (3-30) |
| `lootTable` | array | At least one loot entry |
| `damageType` | string | Base attack damage type (e.g., `'SLASHING'`) |
| `category` | string | Monster category tag |
| `encounterType` | string | `'standard'`, `'elite'`, `'boss'`, or `'world_boss'` |
| `sentient` | boolean | `true` = can drop gold, `false` = materials only |
| `size` | string | `'tiny'`, `'small'`, `'medium'`, `'large'`, `'huge'`, `'gargantuan'` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `abilities` | MonsterAbilityDef[] | Special abilities |
| `resistances` | string[] | Damage types that deal half damage |
| `immunities` | string[] | Damage types that deal zero damage |
| `vulnerabilities` | string[] | Damage types that deal double damage |
| `conditionImmunities` | string[] | Status effects that can't be applied |
| `critImmunity` | boolean | Immune to critical hits |
| `critResistance` | number | Negative modifier to crit confirm rolls |
| `legendaryActions` | number | Legendary actions per round (bosses) |
| `legendaryResistances` | number | Auto-succeed saves per combat (bosses) |
| `phaseTransitions` | array | HP threshold-triggered phase changes |
| `subcategory` | string | Optional sub-classification |
| `isSolitary` | boolean | Encounters alone (no packs) |
| `environment` | string[] | Additional environment tags |

### Ability Types

| Type | Description |
|------|-------------|
| `damage` | Single-target damage ability |
| `status` | Applies status effect (save-based) |
| `aoe` | Area damage + save for half |
| `multiattack` | Multiple basic attacks in one turn |
| `buff` | Self-buff (shield, haste, etc.) |
| `heal` | Per-turn regeneration |
| `on_hit` | Triggered on each basic attack hit |
| `fear_aura` | Start-of-combat fear save (usually once) |
| `damage_aura` | Retaliatory damage on being hit |
| `death_throes` | Damage on death |
| `swallow` | Engulf + ongoing acid damage |

---

## B. Scaling Guidelines

### Stats by Tier

| Tier | Levels | HP Range | AC Range | Attack | Damage Dice | Save DC |
|------|--------|----------|----------|--------|-------------|---------|
| 1 | 1-5 | 15-25 | 8-13 | +2 to +4 | 1d4-1d6 | 10-12 |
| 2 | 5-10 | 38-75 | 12-15 | +5 to +7 | 1d10-2d8 | 12-14 |
| 3 | 10-20 | 110-160 | 15-19 | +8 to +10 | 2d8-3d6 | 14-18 |
| 4 | 17-30 | 120-280 | 15-21 | +9 to +15 | 2d8-3d10 | 15-20 |
| 5 | 31-40 | 290-420 | 19-23 | +14 to +18 | 3d8-4d10 | 17-21 |
| 6 | 41-50 | 440-650 | 22-25 | +19 to +22 | 4d8-5d10 | 20-25 |

### Proficiency Bonus Reference

| Level Range | Prof Bonus |
|-------------|-----------|
| 1-4 | +2 |
| 5-9 | +3 |
| 10-14 | +4 |
| 15-19 | +5 |
| 20-29 | +6 |
| 30-39 | +7 |
| 40-50 | +8 |

### Encounter Type Budget

| Type | HP Multiplier | Features | Typical Count |
|------|--------------|----------|---------------|
| standard | 1x | 0-1 abilities | Fodder |
| elite | 1.2-1.5x | 2-3 abilities, may have regen | Mid-tier challenge |
| boss | 1.5-2x | 3-5 abilities, legendary actions/resistances, phase transitions | Major encounter |
| world_boss | 2x+ | 4-6 abilities, 3 LA, 3 LR, multiple phases | Endgame |

---

## C. Tag Guidelines

### Category (Monster Type)

| Category | Examples | Typical Traits |
|----------|----------|----------------|
| `beast` | Wolf, Dire Wolf, Roc | No magic, physical attacks, pelts/hide drops |
| `humanoid` | Goblin, Orc, Giants | Sentient, drops gold, weapon-based attacks |
| `undead` | Skeleton, Lich, Death Knight | Poison immunity, necrotic damage, condition immunities |
| `fiend` | Demon, Pit Fiend | Fire immunity, fear aura, death throes |
| `dragon` | Young Dragon, Elder Wyrm, Fey Dragon | Breath weapon, frightful presence, legendary |
| `construct` | Ancient Golem, Iron Golem, Arcane Titan | Condition immunities, crit resistance, no poison |
| `elemental` | Mana Wisp, Arcane Elemental, Phoenix, Djinn Lord | Physical resistance, element immunity |
| `aberration` | Void Stalker, Mind Flayer, Beholder, Aboleth, Void Emperor | Psychic damage, mind control, INT-based |
| `fey` | Elder Fey Guardian | Force/radiant, charm-based, psychic immunity |
| `monstrosity` | Hydra, Chimera, Purple Worm, Tarrasque | Multi-part attacks, unique mechanics |
| `plant` | Treant | Regeneration, fire vulnerability, restraint |
| `ooze` | Slime | Crit immunity, physical resistance, low AC |

### Encounter Type

- **standard**: Basic enemies. No legendary features. 0-1 special abilities.
- **elite**: Tougher enemies. May have 2-3 abilities. Slightly inflated HP/AC.
- **boss**: Major encounters. Legendary actions + resistances. Phase transitions. 3-5 abilities.
- **world_boss**: Endgame challenges. Maximum legendary features. Multiple phases. 4-6 abilities.

### Sentient Rule

- `sentient: true` → drops gold. Must be a creature that would logically carry or hoard treasure.
- `sentient: false` → drops materials only (pelts, bones, hide, reagents, monster parts).
- Exception: Skeleton Warrior is `sentient: false` but drops gold (legacy loot from former life).

### Size

| Size | Typical Examples |
|------|-----------------|
| tiny | Mana Wisp |
| small | Goblin, Giant Rat |
| medium | Bandit, Lich, Death Knight, Slime |
| large | Giant Spider, Demon, Young Dragon, most bosses |
| huge | Troll, Frost Giant, Phoenix, Storm Giant, Sea Serpent |
| gargantuan | Purple Worm, Sand Wyrm, Tarrasque, Elder Wyrm, Roc |

---

## D. New Monster Checklist

When adding a new monster, verify all of these:

1. **Biome is reachable.** Check `TERRAIN_TO_BIOME` in `road-encounter.ts`. Currently unreachable: RIVER, UNDERWATER.
2. **Region exists.** `regionName` must match a seeded region in `database/seeds/world.ts`.
3. **Stats follow tier guidelines.** Use Section B tables. Attack bonus should be ~`getModifier(primaryStat) + getProficiencyBonus(level)` (±2 is acceptable).
4. **Save DCs are set.** Every ability with a save must have BOTH `saveType` AND `saveDC`. Target: `8 + prof + relevantStatMod` (±3 acceptable for balance).
5. **Damage type is set.** Both `damageType` (base) and per-ability `damageType` for damaging abilities.
6. **Loot follows sentient rule.** Gold only for `sentient: true`. Materials for beasts/constructs/oozes.
7. **Classification tags are complete.** `category`, `encounterType`, `sentient`, `size` — all four required.
8. **Narrator templates added.** Add entries in `shared/src/data/combat-narrator/templates.ts` under `MONSTER_FLAVOR`.
9. **No redundant resistances/immunities.** If a type is in `immunities`, don't also list it in `resistances`.
10. **Boss features match encounter type.** `boss`/`world_boss` should have `legendaryActions`, `legendaryResistances`, and usually `phaseTransitions`.
11. **Codex updated.** Both player (`CodexMonsters.tsx`) and admin (`CodexTab.tsx`) codex components display monster data — update if new fields are shown.

---

## E. Annotated Examples

### Example 1: Standard Monster (Tier 2)

```typescript
{
  name: 'Giant Spider',
  level: 7,
  biome: 'UNDERGROUND',
  regionName: "Vel'Naris Underdark",
  // Classification tags — all 4 required
  category: 'beast', encounterType: 'standard', sentient: false, size: 'large',
  // Base damage type for regular attacks
  damageType: 'PIERCING',
  // Two abilities: one on-hit, one active
  abilities: [
    {
      id: 'spider_poison', name: 'Venomous Bite', type: 'on_hit',
      saveType: 'con', saveDC: 12,           // DC = 8 + prof(3) + CON mod(1) = 12
      statusEffect: 'poisoned', statusDuration: 3,
      description: 'The spider injects venom with its bite.',
    },
    {
      id: 'spider_web', name: 'Web', type: 'status',
      saveType: 'dex', saveDC: 12,           // Intentionally uses DEX save
      statusEffect: 'restrained', statusDuration: 2,
      priority: 8, cooldown: 3,              // Higher priority = used first; 3-round cooldown
      description: 'The spider shoots sticky webbing to restrain its prey.',
    },
  ],
  stats: {
    hp: 38, ac: 13, attack: 6,              // Attack = DEX mod(3) + prof(3) = 6
    damage: '1d10+3',
    str: 14, dex: 16, con: 12, int: 2, wis: 12, cha: 4,
  },
  // Non-sentient → no gold, only materials
  lootTable: [
    { dropChance: 0.6, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Bones' },
  ],
}
```

### Example 2: Elite Monster (Tier 4)

```typescript
{
  name: 'Sea Serpent',
  level: 22,
  biome: 'COASTAL',
  regionName: 'The Suncoast',
  category: 'beast', encounterType: 'elite', sentient: false, size: 'huge',
  damageType: 'BLUDGEONING',
  resistances: ['COLD', 'LIGHTNING'],         // Thematic resistances
  abilities: [
    {
      id: 'serpent_constrict', name: 'Constrict', type: 'status',
      saveType: 'str', saveDC: 17,            // Hand-tuned below formula (20)
      statusEffect: 'restrained', statusDuration: 2,
      damage: '3d8', damageType: 'BLUDGEONING', // Status + damage combo
      priority: 7, cooldown: 2,
      description: 'The serpent wraps its coils around the target, crushing them.',
    },
    {
      id: 'serpent_tidal', name: 'Tidal Surge', type: 'aoe',
      damage: '5d8', damageType: 'BLUDGEONING',
      saveType: 'str', saveDC: 16,            // AoE save for half
      priority: 6, cooldown: 3,
      description: 'The serpent thrashes, sending a wall of water crashing over everything.',
    },
  ],
  stats: {
    hp: 165, ac: 16, attack: 11,             // Slightly below formula (12)
    damage: '2d10+5',
    str: 22, dex: 14, con: 20, int: 4, wis: 12, cha: 6,
  },
  lootTable: [
    { dropChance: 0.50, minQty: 2, maxQty: 4, gold: 0, itemTemplateName: 'Monster Parts' },
  ],
}
```

### Example 3: Boss Monster (Tier 3)

```typescript
{
  name: 'Demon',
  level: 16,
  biome: 'VOLCANIC',
  regionName: 'The Confluence',
  category: 'fiend', encounterType: 'boss', sentient: true, size: 'large',
  damageType: 'FIRE',
  resistances: ['COLD', 'LIGHTNING'],
  immunities: ['FIRE', 'POISON'],             // Fiend immunities
  legendaryActions: 2,                         // Boss-level features
  legendaryResistances: 1,
  abilities: [
    {
      id: 'demon_multiattack', name: 'Fiendish Strikes', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      isLegendaryAction: true, legendaryCost: 1, // Can use as legendary action
      description: 'The demon slashes with burning claws.',
    },
    {
      id: 'demon_aoe', name: 'Infernal Blaze', type: 'aoe',
      damage: '8d6', damageType: 'FIRE',
      saveType: 'dex', saveDC: 15,
      priority: 8, cooldown: 3,
      description: 'The demon unleashes a wave of hellfire.',
    },
    {
      id: 'demon_fear_aura', name: 'Abyssal Dread', type: 'fear_aura',
      saveType: 'wis', saveDC: 15,             // ALWAYS include saveType on fear_aura!
      statusEffect: 'frightened', statusDuration: 1,
      auraRepeats: false,                       // Only triggers once at combat start
      description: 'The demon radiates an aura of abyssal terror.',
    },
    {
      id: 'demon_fire_aura', name: 'Fire Aura', type: 'damage_aura',
      auraDamage: '1d6', auraDamageType: 'FIRE', // Retaliatory on melee hit
      description: 'Flames lash out at anyone who strikes the demon in melee.',
    },
    {
      id: 'demon_death_throes', name: 'Infernal Explosion', type: 'death_throes',
      deathDamage: '8d6', deathDamageType: 'FIRE',
      deathSaveDC: 15, deathSaveType: 'dex',    // Death throes use deathSave* fields
      description: 'The demon explodes in a burst of hellfire upon death.',
    },
  ],
  // Phase transition at 30% HP
  phaseTransitions: [{
    id: 'demon_phase2', hpThresholdPercent: 30, name: 'Infernal Rage',
    description: 'The demon enters a berserk frenzy as infernal flames surge around it.',
    triggered: false,                           // Must start as false
    effects: [
      { type: 'stat_boost', statBoost: { attack: 3, damage: 2 } },
    ],
  }],
  stats: {
    hp: 130, ac: 17, attack: 10,
    damage: '2d8+6',
    str: 18, dex: 14, con: 16, int: 14, wis: 12, cha: 18,
  },
  // Sentient → drops gold
  lootTable: [
    { dropChance: 1.0, minQty: 25, maxQty: 60, gold: 60 },
    { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0 },
  ],
}
```
