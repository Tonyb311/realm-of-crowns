# Quests & Progression

> Auto-generated from implementation code. Last updated: 2026-02-08.

## Overview

The quest system supports multiple quest types, NPC quest givers, automatic progress tracking via triggers, and a full skill/specialization tree tied to 6 character classes. Progression is driven by an XP-based leveling system that grants stat points, skill points, and HP/MP increases.

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

1. **Browse Available**: `GET /quests/available` - Filtered by character level, prerequisites, and cooldowns. NPC quest givers are attached to results.
2. **Accept**: `POST /quests/:questId/accept` - Adds quest to active list. Repeatable quests enforce cooldowns.
3. **Progress**: Automatic via triggers (KILL, GATHER, VISIT) or manual reporting (`POST /quests/:questId/progress`).
4. **Complete**: `POST /quests/:questId/complete` - Validates all objectives are met, then grants rewards in a database transaction.
5. **Abandon**: `POST /quests/:questId/abandon` - Removes quest from active list. Progress is lost.

### Quest Rewards

Rewards are granted atomically in a Prisma transaction:
- **XP** (amount defined per quest)
- **Gold** (amount defined per quest)
- **Items** (optional, specific items by ID)

After reward grant, `checkLevelUp()` is called to handle any level-ups.

### NPC Quest Givers

- Endpoint: `GET /quests/npcs/:townId` - Lists NPCs in a town with their available quests.
- Each quest definition can reference an `npcId` as its giver.
- The endpoint enriches NPC data with quest status (available/active/completed) per character.

### Quest Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/quests/available` | Browse available quests (level/prereq/cooldown filtered) |
| `GET` | `/quests/active` | List active quests |
| `GET` | `/quests/completed` | List completed quests |
| `POST` | `/quests/:questId/accept` | Accept a quest |
| `POST` | `/quests/:questId/progress` | Manually report progress |
| `POST` | `/quests/:questId/complete` | Complete a quest (validates + grants rewards) |
| `POST` | `/quests/:questId/abandon` | Abandon a quest |
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
| Warrior | 3 specializations |
| Mage | 3 specializations |
| Rogue | 3 specializations |
| Cleric | 3 specializations |
| Ranger | 3 specializations |
| Bard | 3 specializations |

**6 classes, 18 total specializations** (3 per class). Defined in `shared/src/data/skills/index.ts`.

### Specialization

- **Requirement**: Character level 10+.
- **One-time choice**: Once specialized, it cannot be changed.
- Specializing unlocks access to specialization-specific abilities in the skill tree.

### Ability Definitions

Each ability (`AbilityDefinition` in `shared/src/data/skills/types.ts`) has:
- `class` - Which class can use it
- `specialization` - Which specialization (if any) is required
- `tier` - Skill tree tier
- `effects` - What the ability does
- `cooldown` - Turns between uses
- `manaCost` - Mana cost per use
- `prerequisiteAbilityId` - Must unlock this ability first
- `levelRequired` - Minimum character level

### Unlocking Abilities

- Endpoint: `POST /skills/unlock`
- Validation checks: correct class, correct specialization (if required), prerequisites unlocked, sufficient level, sufficient unspent skill points.
- Costs **1 skill point** per unlock.

### Skill Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/skills/tree` | View full skill tree for your class (with unlock status) |
| `POST` | `/skills/specialize` | Choose a specialization (level 10+, one-time) |
| `POST` | `/skills/unlock` | Unlock an ability (validates prereqs, level, points) |
| `GET` | `/skills/abilities` | List your unlocked abilities |

---

## Leveling & Progression

**Source:** `server/src/services/progression.ts`

### XP Formula

- **XP to next level**: `currentLevel * 100`
  - Level 1 to 2: 100 XP
  - Level 5 to 6: 500 XP
  - Level 10 to 11: 1,000 XP
- **Cumulative XP to reach level N**: `100 * (N-1) * N / 2`

### XP Sources

| Source | XP Awarded |
|--------|------------|
| PvE monster kill | `monsterLevel * 25` |
| PvP duel victory | `50 * opponentLevel` |
| Quest completion | Per-quest defined amount |

### Level-Up Rewards (per level gained)

| Reward | Amount |
|--------|--------|
| Stat Points | +2 |
| Skill Points | +1 |
| Max Health | +10 |
| Max Mana | +5 |

- On level-up, the character is **healed to full HP and MP**.
- Multiple levels can be gained at once (e.g., from a large XP quest reward).
- Level-up triggers an **achievement check** for leveling milestones.
- A **Socket.io event** is emitted to notify the client of the level-up and rewards.

### Stat & Skill Point Spending

- **Stat points**: Spent via character update endpoints to increase base stats (strength, dexterity, constitution, intelligence, wisdom, charisma).
- **Skill points**: Spent via `POST /skills/unlock` to unlock abilities in the skill tree.
