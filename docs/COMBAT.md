# Combat System

> Auto-generated from implementation code. Last updated: 2026-02-08.

## Overview

Realm of Crowns uses a **turn-based combat system** with two modes: PvE (player vs. environment) and PvP (player vs. player duels). Combat state is stored in **Redis** with an in-memory fallback, ensuring persistence across server restarts while maintaining low-latency access during fights.

---

## PvE Combat

**Source:** `server/src/routes/combat-pve.ts`

### Starting Combat

- Endpoint: `POST /combat-pve/start`
- A random monster is selected based on the character's **current region** and **level range** (character level +/- 2).
- The monster's stats scale with its level.
- Combat state is serialized and stored in Redis (key: `combat:{characterId}`) with a **1-hour TTL**.
- If Redis is unavailable, state falls back to an in-memory `Map`.

### Combat State

Each combat instance tracks:
- `characterId`, `monsterId`, `monsterName`
- `monsterHealth`, `monsterMaxHealth`, `monsterLevel`
- `monsterAttack`, `monsterDefense`
- `characterHealth`, `characterMana`
- `turn` counter
- `log` array of combat events

### Available Actions

| Action | Description |
|--------|-------------|
| `attack` | Standard melee attack. Damage = character's attack - monster's defense (minimum 1). |
| `cast` | Cast an unlocked ability. Costs mana. Damage/effect based on ability definition. |
| `defend` | Reduce incoming damage by 50% for the next monster turn. |
| `item` | Use a consumable item from inventory (e.g., health potion). |
| `flee` | Attempt to escape. Success chance scales with character's dexterity. Failure wastes the turn. |

### Monster AI

Monsters use a simple AI: they always attack a random party member (currently just the player). Damage = monster's attack - character's defense (minimum 1).

### Victory Rewards

When the monster's health reaches 0:
- **XP**: `monsterLevel * 25`
- **Gold**: Random roll from the monster's loot table
- **Items**: Loot table rolls with rarity weighting
- **Quest Progress**: Triggers `onMonsterKill` for any active quests with KILL objectives matching the monster type
- **Level-Up Check**: Calls `checkLevelUp()` from the progression service
- **Achievement Check**: Evaluates combat-related achievements

### Death Penalty

When the character's health reaches 0:
- **Gold Loss**: 10% of carried gold
- **XP Loss**: 5% of current XP (cannot drop below current level threshold)
- **Durability Loss**: All equipped items lose durability
- Character respawns at their bound town with 25% HP

### Socket.io Integration

Combat results are emitted via Socket.io events so the client can update in real-time without polling.

---

## PvP Combat (Duels)

**Source:** `server/src/routes/combat-pvp.ts`

### Challenge System

- Endpoint: `POST /combat-pvp/challenge`
- **Same-town requirement**: Both players must be in the same town.
- **Level restriction**: Maximum 5-level difference between combatants.
- **Cooldown**: 30-minute cooldown between challenges to the same player.
- **Wager**: Optional gold wager. A **5% tax** is deducted from the pot and sent to the town treasury.

### Challenge Flow

1. **Challenger** sends a challenge (with optional wager amount).
2. **Target** receives a notification and can **accept** or **decline**.
   - `POST /combat-pvp/accept/:challengeId`
   - `POST /combat-pvp/decline/:challengeId`
3. On accept, combat state is initialized in Redis for both players.
4. Challenges expire after a timeout if not responded to.

### Turn-Based Combat

- Players alternate turns, similar to PvE.
- Same action set: `attack`, `cast`, `defend`, `item`, `flee` (forfeit in PvP).
- Each turn has a time limit; if a player doesn't act, their turn is skipped.

### Victory Rewards

- **XP**: `50 * opponent's level` awarded to the winner.
- **Wager**: Winner takes the full pot (minus the 5% town tax).
- **Healing**: Winner is healed to full HP/MP after the duel.
- **Leaderboard**: Win/loss records are tracked.

### Leaderboard

- Endpoint: `GET /combat-pvp/leaderboard`
- Tracks wins, losses, and win rate.
- Sortable and paginated.

---

## Damage Formula

Both PvE and PvP use the same base formula:

```
damage = max(1, attackerAttack - defenderDefense)
```

- **Defend action** halves incoming damage for one turn.
- **Abilities** bypass the standard formula and use their own `effectValue` with type-specific calculations.

---

## Technical Notes

- **State Storage**: Redis primary (`combat:{characterId}`, 1-hour TTL), in-memory `Map` fallback.
- **Validation**: All endpoints use Zod schemas for input validation.
- **Auth**: All combat endpoints require JWT authentication via middleware.
- **Concurrency**: Redis operations are atomic; combat state updates use read-modify-write with checks to prevent stale state.
