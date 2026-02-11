# Quests & Progression

> Updated from implementation code. Last updated: 2026-02-10.

## Overview

The quest system supports multiple quest types, NPC quest givers, automatic progress tracking via triggers, and a full skill/specialization tree tied to **7 character classes**. Progression is driven by an XP-based leveling system with a **max level of 50**, a rebalanced daily-action XP curve, and level-up rewards of stat points, skill points, and HP/MP increases.

---

## Quest System

**Source:** `server/src/routes/quests.ts`, `shared/src/data/quests/`

### Quest Types

| Type | Description |
|------|-------------|
| `MAIN` | Story-driven quests forming the main narrative |
| `TOWN` | Town-specific quests tied to a location |
| `DAILY` | Repeatable quests with cooldown timers |
| `GUILD` | Guild-exclusive quests |
| `BOUNTY` | Kill-target bounty quests |
| `RACIAL` | Race-specific quests (defined in type system, not yet populated) |

Quest definitions live in `shared/src/data/quests/` and are exported via `ALL_QUESTS` (aggregation of `MAIN_QUESTS`, `TOWN_QUESTS`, `DAILY_QUESTS`, `GUILD_QUESTS`, `BOUNTY_QUESTS`).

### Objective Types

| Type | Trigger | Description |
|------|---------|-------------|
| `KILL` | `onMonsterKill` | Kill a specific number of a monster type |
| `GATHER` | `onResourceGather` | Collect a specific resource |
| `DELIVER` | Manual | Deliver items to an NPC |
| `TALK` | Manual | Speak to a specific NPC |
| `VISIT` | `onVisitLocation` | Visit a specific location |

### Quest Lifecycle

1. **Browse Available**: `GET /quests/available` -- Filtered by character level, prerequisites, and cooldowns. NPC quest givers are attached to results. Optional `townId` query parameter to filter by town/region.
2. **Accept**: `POST /quests/accept` -- Adds quest to active list with body `{ questId }`. Repeatable quests enforce cooldowns; non-repeatable quests cannot be re-accepted once completed.
3. **Progress**: Automatic via triggers (KILL, GATHER, VISIT) or manual reporting (`POST /quests/progress` with body `{ questId, objectiveIndex, amount }`).
4. **Complete**: `POST /quests/complete` -- Validates all objectives are met, then grants rewards (XP + gold) in a database transaction. Body: `{ questId }`.
5. **Abandon**: `POST /quests/abandon` -- Removes quest from active list. Progress is lost. Body: `{ questId }`.

### Quest Rewards

Rewards are granted atomically in a Prisma transaction:
- **XP** (amount defined per quest)
- **Gold** (amount defined per quest)
- **Items** (optional, specific items by ID)

After reward grant, `checkLevelUp()` is called to handle any level-ups.

### NPC Quest Givers

- Endpoint: `GET /quests/npcs/:townId` -- Lists NPCs in a town with their available quests.
- Each NPC has a `questIds` array linking to available quests.
- The endpoint enriches NPC data with quest status per character: `available`, `active`, `completed`, or `locked` (below level requirement).

### Quest Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/quests/available` | Browse available quests (level/prereq/cooldown filtered, optional `?townId=`) |
| `GET` | `/quests/active` | List active quests with progress |
| `GET` | `/quests/completed` | List completed quests |
| `POST` | `/quests/accept` | Accept a quest (`{ questId }`) |
| `POST` | `/quests/progress` | Manually report progress (`{ questId, objectiveIndex, amount }`) |
| `POST` | `/quests/complete` | Complete a quest and claim rewards (`{ questId }`) |
| `POST` | `/quests/abandon` | Abandon a quest (`{ questId }`) |
| `GET` | `/quests/npcs/:townId` | Get NPCs with quest status for a town |

---

## Quest Triggers (Automatic Progress)

**Source:** `server/src/services/quest-triggers.ts`

Three trigger functions are called from other systems to auto-advance quest objectives:

| Trigger | Called From | Advances |
|---------|------------|----------|
| `onMonsterKill(characterId, monsterType)` | PvE combat victory | `KILL` objectives matching the monster type |
| `onResourceGather(characterId, resourceType)` | Resource gathering | `GATHER` objectives matching the resource |
| `onVisitLocation(characterId, locationId)` | Zone/town entry | `VISIT` objectives matching the location |

When all objectives for a quest are met, a **notification** is emitted to the player indicating the quest is ready to turn in.

---

## Skill System

**Source:** `server/src/routes/skills.ts`, `shared/src/data/skills/`

### Character Classes

| Class | Specializations |
|-------|----------------|
| Warrior | berserker, guardian, warlord |
| Mage | elementalist, enchanter, necromancer |
| Rogue | assassin, thief, swashbuckler |
| Cleric | healer, paladin, inquisitor |
| Ranger | beastmaster, sharpshooter, tracker |
| Bard | diplomat, battlechanter, lorekeeper |
| **Psion** | **telepath, seer, nomad** |

**7 classes, 21 total specializations** (3 per class). Defined in `shared/src/data/skills/index.ts`.

The Psion class is unique -- its abilities are fully integrated into the combat engine with custom resolution logic (see `docs/COMBAT.md` for details). Psion abilities use mana and scale with INT, and include mind control, psychic damage, precognition, and dimensional manipulation.

### Specialization

- **Requirement**: Character level 10+.
- **One-time choice**: Once specialized, it cannot be changed.
- Specializing unlocks access to specialization-specific abilities in the skill tree.

### Ability Definitions

Each ability (`AbilityDefinition` in `shared/src/data/skills/types.ts`) has:
- `class` -- Which class can use it
- `specialization` -- Which specialization (if any) is required
- `tier` -- Skill tree tier
- `effects` -- What the ability does
- `cooldown` -- Turns between uses
- `manaCost` -- Mana cost per use
- `prerequisiteAbilityId` -- Must unlock this ability first
- `levelRequired` -- Minimum character level

### Unlocking Abilities

- Endpoint: `POST /skills/unlock`
- Validation checks: correct class, correct specialization (if required), prerequisites unlocked, sufficient level, sufficient unspent skill points.
- Costs **1 skill point** per unlock.
- The ability definition is upserted into the database `Ability` table if it does not already exist.

### Skill Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/skills/tree` | View full skill tree for your class (with unlock status and `canUnlock` flags) |
| `POST` | `/skills/specialize` | Choose a specialization (level 10+, one-time) |
| `POST` | `/skills/unlock` | Unlock an ability (validates prereqs, level, points) |
| `GET` | `/skills/abilities` | List your unlocked abilities (for combat integration) |

---

## Leveling & Progression

**Source:** `server/src/services/progression.ts`, `shared/src/data/progression/xp-curve.ts`

### Max Level

The maximum character level is **50** (`MAX_LEVEL = 50`).

### XP Formula

XP to advance from level N to level N+1:

```
xpToNextLevel(level) = floor(10 * level^1.15) + 30
```

This formula is rebalanced for a **daily-action economy** where players perform approximately 1 major action per day.

**Cumulative XP milestones:**

| Level | XP to Next | Cumulative XP |
|-------|-----------|---------------|
| 1 | 40 | 0 |
| 5 | 59 | ~329 |
| 10 | 81 | ~1,025 |
| 15 | 101 | ~2,129 |
| 20 | 120 | ~3,666 |
| 30 | 157 | ~8,110 |
| 50 | 226 | ~22,836 |

### XP Sources

| Source | XP Awarded | Constant |
|--------|------------|----------|
| PvE monster kill | 5 XP per monster level | `ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL = 5` |
| PvP duel victory | 8 XP per opponent level | `ACTION_XP.PVP_WIN_PER_OPPONENT_LEVEL = 8` |
| Gathering/crafting | 15 XP (base) | `ACTION_XP.WORK_GATHER_BASE = 15` |
| Quest completion | Per-quest defined amount | -- |
| Daily login bonus | 5 XP | `ACTION_XP.LOGIN_BONUS = 5` |
| Login streak bonus | 2 XP per consecutive day | `ACTION_XP.STREAK_BONUS_PER_DAY = 2` |

### Level-Up Rewards (per level gained)

| Reward | Amount | Constant |
|--------|--------|----------|
| Stat Points | +2 | `LEVEL_UP_REWARDS.STAT_POINTS_PER_LEVEL = 2` |
| Skill Points | +1 | `LEVEL_UP_REWARDS.SKILL_POINTS_PER_LEVEL = 1` |
| Max Health | +10 | `LEVEL_UP_REWARDS.HP_PER_LEVEL = 10` |
| Max Mana | +5 | `LEVEL_UP_REWARDS.MP_PER_LEVEL = 5` |

- On level-up, the character is **healed to full HP and MP**.
- Multiple levels can be gained at once (e.g., from a large XP quest reward).
- Level-up triggers an **achievement check** for leveling milestones.
- A **Socket.io event** (`emitLevelUp`) is emitted to notify the client of the level-up and rewards.

### Death Penalty

| Penalty | Amount | Constant |
|---------|--------|----------|
| Gold loss | 5% of carried gold | `DEATH_PENALTY.GOLD_LOSS_PERCENT = 5` |
| XP loss | 15 XP per character level | `DEATH_PENALTY.XP_LOSS_PER_LEVEL = 15` |
| Durability damage | 5 durability on equipped items | `DEATH_PENALTY.DURABILITY_DAMAGE = 5` |

Character respawns at bound town with full HP.

### Stat & Skill Point Spending

- **Stat points**: Spent via character update endpoints to increase base stats (strength, dexterity, constitution, intelligence, wisdom, charisma).
- **Skill points**: Spent via `POST /skills/unlock` to unlock abilities in the skill tree.

### Psion Perks Outside Combat

The Psion class also has perks that affect non-combat systems:

- **Seer (Election Oracle)**: During elections, Seers receive projected vote counts for candidates.
- **Telepath (Mind Reader)**: During elections, Telepaths see a "sincerity score" on candidate platforms.
- **Nomad (Far Whisper)**: Nomad Psions can send whisper messages with a special "far whisper" indicator, flagged in the messaging system.
