# Combat Simulator Capabilities Audit

## Summary

A solid 1v1 combat simulator already exists — `POST /admin/combat/simulate` runs 1-1000 iterations with fully synthetic combatants (no DB required), and the frontend SimulatorTab provides a complete UI with presets, monster picker, and batch stats. The core combat engine (`resolveTurn`) is a pure function with zero side effects, making it trivially parallelizable. **What's missing for large-scale balance testing:** parameter sweeping (auto-grid across level/race/class ranges), result persistence to `CombatEncounterLog`/`SimulationRun`, export pipeline, and smarter AI (the direct simulator uses "attack first enemy" instead of the stance/preset system used in road encounters).

---

## Q1: 1v1 Simulator Tab

**File:** `client/src/components/admin/combat/SimulatorTab.tsx`

### Current Capabilities:
- Manual configuration of player and monster stats (level, AC, ability scores, HP, weapon)
- 4 quick presets: L1 Human vs Goblin, L5 Dwarf vs Orc, L10 Elf vs Troll, L20 vs Young Dragon
- Monster picker dropdown (fetches all seeded monsters from `GET /admin/monsters`)
- Weapon configuration with dice notation (XdY+Z) for both sides
- Batch iteration control: **1-1000 iterations**
- Two display modes:
  - **Single mode (1-10 iterations):** Full combat replay with turn-by-turn logs
  - **Batch mode (11+ iterations):** Aggregate stats only (win rate, avg rounds, avg HP remaining)

### API Endpoint:
- Calls `POST /admin/combat/simulate`
- PvE only (player vs monster). No PvP or monster-vs-monster.

### Limitations:
- No race/class selection (just raw stats)
- No equipment system integration (manual AC/weapon entry)
- No racial abilities in combat resolution
- Results are ephemeral (not persisted to DB)
- No export capability
- No parameter sweeping (one config per run)

---

## Q2: Combat Engine Entry Points

**File:** `server/src/lib/combat-engine.ts` (2656 lines)

### Main Functions:

1. **`createCombatState(combatants, options?)`**
   - Creates initial combat state with initiative rolls
   - `combatants: Combatant[]` — array of fighters
   - Returns `CombatState` — full combat snapshot

2. **`resolveTurn(state, action, context, racialContext?)`**
   - Resolves a single combat action (attack, defend, flee, cast, item use)
   - **Pure function** — no DB calls, no side effects
   - `state: CombatState` — current snapshot
   - `action: CombatAction` — what the combatant does
   - `context: { weapon?, spell?, item? }` — equipment/ability for this turn
   - `racialContext?: { tracker, race, level, subRace? }` — optional racial abilities
   - Returns updated `CombatState`

3. **`createCharacterCombatant(id, name, team, stats, level, hp, maxHp, equipmentAC, weapon, spellSlots, proficiencyBonus)`**
   - Builds a player combatant from raw params
   - **Fully synthetic** — no DB lookup needed
   - `stats: CharacterStats` — `{ str, dex, con, int, wis, cha }`
   - `equipmentAC: number` — engine adds DEX mod to calculate final AC
   - `weapon: WeaponInfo | null`
   - Returns `Combatant` object

4. **`createMonsterCombatant(id, name, team, stats, level, hp, ac, weapon, proficiencyBonus)`**
   - Builds a monster combatant from raw params
   - **Fully synthetic** — no DB needed
   - `ac: number` — direct AC (not calculated)
   - `proficiencyBonus` should be 0 (monster `attack` stat already includes all bonuses)
   - Returns `Combatant` object

### Synthetic Data Support:
**YES — both combatant builders accept raw parameters. No database character or monster record required.** You can construct any arbitrary combatant with any stats.

### Combatant Structure (from `shared/src/types/combat.ts`):
```typescript
interface Combatant {
  id: string;
  name: string;
  entityType: 'character' | 'monster';
  team: number;                    // 0 or 1
  stats: CharacterStats;           // {str, dex, con, int, wis, cha}
  level: number;
  currentHp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  statusEffects: StatusEffect[];
  spellSlots: { [level: number]: number };
  weapon: WeaponInfo | null;
  isAlive: boolean;
  isDefending: boolean;
  proficiencyBonus: number;
  race?: string;                   // optional, enables racial abilities
  subRace?: { id: string; element?: string } | null;
}
```

---

## Q3: Simulation Combat Path

### Road Encounter (`road-encounter.ts`, line ~423)

Builds player combatant from DB character:
```
1. Load character with equipment, stats, racial bonuses
2. Calculate effectiveStats (base + racial + gear bonuses)
3. Calculate playerAC from equipped armor
4. Build playerWeapon from equipped weapon
5. createCharacterCombatant(...all the above...)
6. Set .race and .subRace on combatant (for racial abilities)
```

Monster combatant from DB:
```
1. prisma.monster.findFirst({ where: { biome } })
2. parseStats(monster.stats) → CharacterStats
3. buildMonsterWeapon(monsterStats) → WeaponInfo (parses "1d6+2" format)
4. createMonsterCombatant(...parsed data...)
```

### Tick Combat Resolver (`tick-combat-resolver.ts`, line ~388)

Same combatant building as road encounters, plus:
- Loads combat presets (stance, retreat conditions, ability queues)
- Creates `RacialCombatTracker` for ability cooldown management
- Uses `decideAction()` AI instead of hardcoded "attack first enemy"
- Loops through turns with stance-aware decision making

### Reusability:

The combatant-building logic in road-encounter.ts **could** be extracted into a shared helper, but it's tightly coupled to DB character lookups. For a batch simulator using synthetic data, you'd bypass this entirely and call `createCharacterCombatant()` / `createMonsterCombatant()` directly with generated stats — which is exactly what the existing `/admin/combat/simulate` endpoint already does.

---

## Q4: Monster Data Access

### 21 Seeded Monsters (3 tiers):
| Tier | Level | Monsters |
|------|-------|----------|
| 1 | 1-5 | Goblin, Wolf, Bandit, Giant Rat, Slime, Mana Wisp, Bog Wraith |
| 2 | 5-10 | Orc Warrior, Skeleton Warrior, Giant Spider, Dire Wolf, Troll, Arcane Elemental, Shadow Wraith |
| 3 | 10-20 | Young Dragon, Lich, Demon, Hydra, Ancient Golem, Void Stalker, Elder Fey Guardian |

### Monster Stat Structure (`database/seeds/monsters.ts`):
```typescript
{
  name: string,
  level: number,
  biome: BiomeType,
  stats: {
    hp: number, ac: number,
    attack: number,        // TOTAL bonus (STR mod + prof already included)
    damage: string,        // "1d8+2" format
    speed: number,
    str, dex, con, int, wis, cha: number
  },
  lootTable: [...]
}
```

### Access Methods:
1. **Biome-based (road encounters):** `prisma.monster.findFirst({ where: { biome } })` — auto-selects by terrain
2. **All monsters (admin API):** `GET /admin/monsters` — returns all 21 with full stats
3. **By name/ID:** Can query `prisma.monster.findFirst({ where: { name } })`
4. **Direct (no DB):** Monster stats can be hardcoded from seed data — no DB lookup needed

### Monster → Combatant Conversion:
- `parseStats(monster.stats)` → `CharacterStats` object
- `buildMonsterWeapon(monsterStats)` → `WeaponInfo` with parsed dice notation
- `createMonsterCombatant(id, name, 1, parsedStats, level, hp, ac, weapon, 0)`
- **Important:** `proficiencyBonus: 0` because monster `attack` stat is already the total bonus

---

## Q5: Existing Endpoints

### Direct Combat Simulation:

**`POST /admin/combat/simulate`** — The only direct combat endpoint.

Input schema:
```typescript
{
  playerLevel: 1-100,
  playerStats: { str, dex, con, int, wis, cha },  // 1-30 each
  playerAC: 1-30,
  playerHP?: number,               // auto-calculated if omitted
  playerWeapon: {
    name: string,
    diceCount, diceSides, bonusDamage, bonusAttack: number,
    damageModifierStat, attackModifierStat: 'str' | 'dex'
  },
  monsterName: string,
  monsterLevel: 1-100,
  monsterStats: { str, dex, con, int, wis, cha },
  monsterHP: 1-1000,
  monsterAC: 1-30,
  monsterDamage: string,           // "1d8+2"
  monsterAttackBonus: number,
  iterations: 1-1000
}
```

Response:
```typescript
{
  config: { ... },
  summary: {
    playerWins, monsterWins, draws: number,
    playerWinRate: percentage,
    avgRounds: float,
    avgPlayerHpRemaining: number
  },
  results: [{
    winner: 'player' | 'monster' | 'draw',
    rounds: number,
    playerHpRemaining, monsterHpRemaining: number,
    logs?: TurnLogEntry[]           // only if iterations <= 10
  }]
}
```

Characteristics:
- **Fully synthetic** — zero DB calls
- Sequential loop (not parallelized)
- 50-round safety cap per fight
- Hardcoded AI: "attack first alive enemy" (no stances/presets)
- Logs only for <= 10 iterations
- **Not persisted** to `CombatEncounterLog` or any DB table

### Other Relevant Endpoints:
- `GET /admin/monsters` — all 21 monsters with stats (for monster picker)
- `GET /admin/combat/stats?dataSource=sim&runId=X` — aggregate stats from DB logs
- `/combat/pve/start` — **DISABLED** (returns 400)

---

## Q6: Batch Simulator Blueprint

### What Already Exists (Reusable):

| Component | File | Reusable? |
|-----------|------|-----------|
| Core combat engine (`resolveTurn`) | `combat-engine.ts` | Yes — pure function, no DB |
| Character combatant builder | `combat-engine.ts:2586` | Yes — fully synthetic |
| Monster combatant builder | `combat-engine.ts:2626` | Yes — fully synthetic |
| Combat state initializer | `combat-engine.ts` | Yes |
| 1v1 simulate endpoint | `admin/combat.ts` | Yes — 1-1000 iterations |
| Frontend simulator UI | `SimulatorTab.tsx` | Yes — presets + batch |
| Monster seed data | `seeds/monsters.ts` | Yes — all 21 monsters |
| Race stat data | `shared/src/data/races/` | Yes — all 20 races |
| Class ability data | `shared/src/data/skills/` | Yes — 7 classes |
| SimulationRun model | `schema.prisma` | Yes — just deployed |
| Combat log persistence | `combat-logger.ts` | Yes — `logPveCombat()` |

### What's Missing (Gaps):

| Gap | What's Needed | Effort |
|-----|---------------|--------|
| **Race/class-aware combatant builder** | Function that takes `{ race, class, level }` and generates realistic stats (using racial modifiers, class HP formulas, typical gear for level) | Medium |
| **Parameter sweeping** | Loop over race x class x level x monster grid, running N iterations each | Small — just a nested loop |
| **Result persistence** | Write batch results to `CombatEncounterLog` tagged with a `SimulationRun` | Small — call existing `logPveCombat()` |
| **Racial ability integration** | Current simulator ignores racial abilities. Need `RacialCombatTracker` setup | Medium |
| **Smarter AI** | Use `decideAction()` from tick-combat-resolver instead of "attack first enemy" | Medium |
| **Equipment generation** | Generate level-appropriate gear (weapons, armor) from recipe/item data | Medium |
| **Export pipeline** | Write results to Excel/CSV for external analysis | Small — XLSX already imported in sim routes |
| **Timeout handling** | Large grids (20 races x 7 classes x 20 levels x 21 monsters = 58,800 configs) need job queue or chunking | Medium |

### Recommended Approach:

The fastest path to batch balance testing:

1. **New endpoint: `POST /admin/combat/batch-simulate`** — accepts an array of configs, loops through them, persists results to `CombatEncounterLog` tagged with a new `SimulationRun`
2. **New helper: `buildSyntheticCombatant({ race, class, level })`** — uses race stat modifiers from `shared/data/races`, class HP formula, proficiency bonus by level, and default gear tier for level
3. **Reuse everything else** — the combat engine, combatant builders, and logging are already production-ready
4. **Frontend: extend SimulatorTab** with a "Batch Grid" mode that lets you select race/class/level ranges and a target monster

The existing `/admin/combat/simulate` endpoint is 80% of the way there. The main additions are: stat generation from race/class (instead of manual entry), result persistence, and iteration over a parameter grid.
