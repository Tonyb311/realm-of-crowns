# Combat System

> Updated from implementation code. Last updated: 2026-02-10.

## Overview

Realm of Crowns uses a **D&D-style turn-based combat system** with four modes: PvE (player vs. environment), PvP Duels (wagered competitive fights), Spars (zero-stakes practice fights), and Arena (future). Combat state is stored in **Redis** with an in-memory fallback, ensuring persistence across server restarts while maintaining low-latency access during fights.

The combat engine (`server/src/lib/combat-engine.ts`) implements full D&D mechanics: d20 attack rolls vs. AC, proficiency bonuses, ability score modifiers, spell save DCs, status effects with DoT/HoT, critical hits with doubled dice, initiative order, and racial ability integration. Characters choose from **7 classes** (Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion) with 21 specializations and 121 racial combat abilities across 20 races.

---

## Core Mechanics

### Attack Resolution

Attacks use D&D-style rolls, not simple subtraction:

```
Attack Roll: d20 + stat modifier + proficiency bonus + weapon bonus + status modifiers
vs.
Target AC: base AC (10 + DEX mod) or equipment AC + defend bonus + status modifiers + racial bonuses
```

- **Hit**: attack total >= target AC
- **Critical Hit**: natural 20 on the d20
- **Miss**: attack total < target AC

### Damage Calculation

```
Damage = weapon dice (e.g. 1d8) + stat modifier + weapon bonus damage
Critical Damage = double the weapon dice + modifiers (not doubled)
Minimum damage: 0 (clamped by Math.max)
```

Racial modifiers can add:
- Flat damage bonuses (e.g., Goliath Titan's Grip)
- Damage multipliers (e.g., Orc Blood Fury)
- Extra critical dice (e.g., Half-Orc Savage Attacks)

### AC Calculation

```
Effective AC = base AC + defend bonus (+2) + status effect modifiers + racial passive bonuses
```

Constants:
- `BASE_AC` = 10 (before equipment/DEX)
- `DEFEND_AC_BONUS` = 2
- Equipment AC replaces base if higher than 0

### Spell System

Spells use a save DC system:

```
Spell Save DC = 8 + proficiency bonus + casting stat modifier
Target Save = d20 + save stat modifier + proficiency bonus + status modifiers
```

- Failed save: full effect (damage + status)
- Successful save on damage spells: half damage, no status effect
- Spell types: `damage`, `heal`, `status`, `damage_status`

### Initiative

```
Initiative Roll = d20 + DEX modifier
```

Sort order: highest initiative first, ties broken by DEX score, then random.

---

## Status Effects

The combat engine supports 16 status effects:

| Effect | Prevents Action | Attack Mod | AC Mod | Save Mod | Special |
|--------|:-:|:-:|:-:|:-:|---------|
| `poisoned` | No | -2 | 0 | 0 | DoT (3/round default) |
| `stunned` | **Yes** | 0 | -2 | -4 | -- |
| `blessed` | No | +2 | 0 | +2 | -- |
| `burning` | No | 0 | 0 | 0 | DoT (5/round default) |
| `frozen` | **Yes** | 0 | -4 | -2 | -- |
| `paralyzed` | **Yes** | 0 | -4 | -4 | -- |
| `blinded` | No | -4 | -2 | 0 | -- |
| `shielded` | No | 0 | +4 | 0 | -- |
| `weakened` | No | -3 | 0 | -2 | -- |
| `hasted` | No | +2 | +2 | 0 | -- |
| `slowed` | No | -2 | -2 | -2 | -- |
| `regenerating` | No | 0 | 0 | 0 | HoT (5/round default) |
| `dominated` | **Yes** | 0 | 0 | 0 | Controlled by caster |
| `banished` | **Yes** | 0 | 0 | 0 | Removed from combat |
| `phased` | No | 0 | +4 | 0 | Untargetable |
| `foresight` | No | 0 | +2 | +2 | -- |

Status effects are processed at the start of each combatant's turn: DoT/HoT is applied, durations decremented, and expired effects removed.

---

## Combat Actions

| Action | Description |
|--------|-------------|
| `attack` | Melee/ranged weapon attack. d20 + modifiers vs. target AC. Damage uses weapon dice. |
| `cast` | Cast a spell. Expends a spell slot. Uses spell save DC or auto-hit depending on spell. |
| `defend` | Gain +2 AC until your next turn. |
| `item` | Use a consumable item (heal, damage, buff, or cleanse a harmful status). |
| `flee` | Attempt to escape. DC = 10 + 2 per additional enemy. d20 + DEX mod vs. flee DC. |
| `racial_ability` | Use an unlocked racial ability (requires racial context). |
| `psion_ability` | Use a Psion class ability (mana-based, INT-scaling). |

---

## PvE Combat

**Source:** `server/src/routes/combat-pve.ts`

### Starting Combat

- Endpoint: `POST /combat-pve/start`
- A random monster is selected based on the character's **current region** and **level range** (character level +/- 3).
- The monster's stats scale with its level.
- Combat state is serialized and stored in Redis (key: `combat:pve:{sessionId}`) with a **1-hour TTL**.
- If Redis is unavailable, state falls back to an in-memory `Map`.

### Monster AI

Monsters use a simple AI: they always attack a random party member (currently just the player).

### Victory Rewards

When the monster's health reaches 0:
- **XP**: `ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL * monsterLevel` = **5 XP per monster level** (e.g., a level 10 monster = 50 XP)
- **Gold**: Random roll from the monster's loot table
- **Items**: Loot table rolls with rarity weighting
- **Quest Progress**: Triggers `onMonsterKill` for any active quests with KILL objectives matching the monster type
- **Level-Up Check**: Calls `checkLevelUp()` from the progression service
- **Achievement Check**: Evaluates combat-related achievements

### Death Penalty

When the character's health reaches 0:
- **Gold Loss**: 5% of carried gold (`DEATH_PENALTY.GOLD_LOSS_PERCENT = 5`)
- **XP Loss**: 15 XP per character level (`DEATH_PENALTY.XP_LOSS_PER_LEVEL = 15`)
- **Durability Loss**: 5 durability on all equipped items (`DEATH_PENALTY.DURABILITY_DAMAGE = 5`)
- Character respawns at their bound town with **full HP** (healed to `maxHealth`)

### Socket.io Integration

Combat results are emitted via Socket.io events so the client can update in real-time without polling.

---

## PvP Combat (Duels)

**Source:** `server/src/routes/combat-pvp.ts`

### Challenge System

- Endpoint: `POST /combat-pvp/challenge`
- **Same-town requirement**: Both players must be in the same town.
- **Level restriction**: Maximum **5-level** difference between combatants (`MAX_LEVEL_DIFFERENCE = 5`).
- **Cooldown**: **30-minute** cooldown between challenges to the same player (`CHALLENGE_COOLDOWN_MS`).
- **Wager**: Optional gold wager. A **5% tax** is deducted from the pot and sent to the town treasury (`WAGER_TAX_RATE = 0.05`).
- **Alt-account detection**: The system checks `isSameAccount()` to prevent players from dueling their own alt characters.

### Challenge Flow

1. **Challenger** sends a challenge (with optional wager amount).
2. **Target** receives a notification and can **accept** or **decline**.
   - `POST /combat-pvp/accept/:challengeId`
   - `POST /combat-pvp/decline/:challengeId`
3. On accept, combat state is initialized in Redis for both players.
4. Challenges expire after a timeout if not responded to.

### Turn-Based Combat

- Players alternate turns using the same combat engine as PvE.
- Full action set: `attack`, `cast`, `defend`, `item`, `flee` (forfeit in PvP), `racial_ability`, `psion_ability`.
- Each turn has a time limit; if a player does not act, their turn is skipped.

### Victory Rewards

- **XP**: `ACTION_XP.PVP_WIN_PER_OPPONENT_LEVEL * opponentLevel` = **8 XP per opponent level** (e.g., a level 20 opponent = 160 XP)
- **Wager**: Winner takes the full pot (minus the 5% town tax).
- **Healing**: Both winner and loser are healed to full HP after the duel.
- **Leaderboard**: Win/loss records are tracked.

### Leaderboard

- Endpoint: `GET /combat-pvp/leaderboard`
- Tracks wins, losses, and win rate.
- Sortable and paginated.

---

## Spar System (Practice Duels)

**Source:** `server/src/routes/combat-pvp.ts`

Spars are zero-stakes practice fights with no rewards or penalties.

### Spar Rules

- **Same-town requirement**: Both players must be in the same town.
- **Level restriction**: Maximum **10-level** difference (`SPAR_MAX_LEVEL_DIFF = 10`), more lenient than duels.
- **Cooldown**: **5-minute** cooldown between spars (`SPAR_COOLDOWN_MS`), much shorter than duels.
- **No wagers**: Spars never involve gold.
- **No alt-account check**: Not needed since there are no rewards.

### Spar Outcomes

- **No XP awarded** to either player.
- **No gold exchanged**.
- **No achievement progress**.
- Both players are **restored to their pre-spar HP and mana** after the fight ends.

### Spar Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/combat-pvp/spar` | Challenge someone to a spar |
| `POST` | `/combat-pvp/spar-accept/:challengeId` | Accept a spar challenge |
| `POST` | `/combat-pvp/spar-decline/:challengeId` | Decline a spar challenge |
| `POST` | `/combat-pvp/spar-action` | Take an action in a spar |
| `GET` | `/combat-pvp/spar-state` | Get current spar state |

---

## Psion Class Combat Integration

**Source:** `server/src/lib/combat-engine.ts`

The Psion class has 3 specializations (Telepath, Seer, Nomad) with 18 unique combat abilities resolved by the engine. Psion abilities use mana instead of spell slots and scale with INT.

### Telepath Abilities

| ID | Name | Effect |
|----|------|--------|
| `psi-tel-1` | Mind Spike | 2d6+INT psychic damage, INT save or weakened 2 rounds |
| `psi-tel-2` | Thought Shield | Passive: psychic damage resistance |
| `psi-tel-3` | Psychic Crush | 3d8+INT psychic damage, WIS save or stunned 1 round |
| `psi-tel-4` | Dominate | WIS save at -2, fail: controlled 1 round, save: weakened 2 rounds |
| `psi-tel-5` | Mind Shatter | AoE: all enemies take 3d6+INT psychic, WIS save or weakened |
| `psi-tel-6` | Absolute Dominion | WIS save at -4, fail: controlled 2 rounds, save: stunned + 2d10 psychic |

### Seer Abilities

| ID | Name | Effect |
|----|------|--------|
| `psi-see-1` | Foresight | Grant foresight (+2 AC, +2 saves) to self/ally for 3 rounds |
| `psi-see-2` | Danger Sense | Passive: bonus to initiative and saves |
| `psi-see-3` | Precognitive Dodge | Reaction: negate the next incoming attack completely |
| `psi-see-4` | Third Eye | Passive: see invisible, true sight |
| `psi-see-5` | Temporal Echo | Repeat the last psion ability used (echo) |
| `psi-see-6` | Prescient Mastery | Foresight + Blessed for 3 rounds (+2 AC, +4 saves, +2 attack) |

### Nomad Abilities

| ID | Name | Effect |
|----|------|--------|
| `psi-nom-1` | Blink Strike | Teleport attack with +2 hit and +INT bonus damage |
| `psi-nom-2` | Phase Step | Passive: phasing movement |
| `psi-nom-3` | Dimensional Pocket | Phase self for 1 round (untargetable, +4 AC) |
| `psi-nom-4` | Translocation | Enemy: INT save or stunned. Ally: both get +4 AC (shielded) |
| `psi-nom-5` | Rift Walk | AoE: 2d8+INT psychic to all enemies, WIS save or slowed 2 rounds |
| `psi-nom-6` | Banishment | INT save at -2, fail: banished 3 rounds, save: 2d6 psychic + slowed |

### Psychic Damage Resistance

- **Forgeborn**: Halve all psychic damage (racial resistance)
- **Psion Telepaths** (level 5+): Thought Shield halves psychic damage

### Banishment Mechanics

When a banished combatant's duration expires:
- They return from the void
- Take 4d6 psychic damage
- Are stunned for 1 round
- Their turn is skipped on return

---

## Racial Ability Combat Integration

There are **121 racial combat abilities** across all 20 races (6 per race, except Nightborne which has 7), unlocking at character levels 1, 5, 10, 15, 25, and 40. These abilities are integrated into the combat engine via the `RacialCombatTracker`. Examples:

- **Orc Blood Fury**: Damage multiplier when active
- **Orc Relentless Endurance**: Prevent death once per combat
- **Orc Orcish Rampage**: Bonus attack on kill
- **Half-Orc Savage Attacks**: Extra die on critical hits
- **Half-Orc Unstoppable Force**: Auto-hit ability
- **Nethkin Infernal Rebuke**: Reflect fire damage when hit in melee
- **Beastfolk**: Natural weapon fallback if no weapon equipped
- **Goliath Titan's Grip**: Flat damage bonus
- **Elementari Primordial Awakening**: AoE DoT at start of turn
- **Revenant Undying Fortitude**: Death prevention

---

## Combat Types

The engine supports four combat types:

| Type | Description | Implemented |
|------|-------------|:-:|
| `PVE` | Player vs. monster encounters | Yes |
| `DUEL` | Competitive PvP with wagers | Yes |
| `SPAR` | Practice PvP, zero stakes | Yes |
| `ARENA` | Structured PvP tournament | Future |

---

## All PvE Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/combat-pve/start` | Start a PvE encounter |
| `POST` | `/combat-pve/action` | Take a combat action |
| `GET` | `/combat-pve/state` | Get current combat state |

## All PvP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/combat-pvp/challenge` | Challenge a player to a duel |
| `POST` | `/combat-pvp/accept/:challengeId` | Accept a duel challenge |
| `POST` | `/combat-pvp/decline/:challengeId` | Decline a duel challenge |
| `POST` | `/combat-pvp/action` | Take a duel action |
| `GET` | `/combat-pvp/state` | Get current duel state |
| `GET` | `/combat-pvp/challenges` | List pending challenges |
| `GET` | `/combat-pvp/leaderboard` | View PvP leaderboard |
| `POST` | `/combat-pvp/spar` | Challenge to a spar |
| `POST` | `/combat-pvp/spar-accept/:challengeId` | Accept spar |
| `POST` | `/combat-pvp/spar-decline/:challengeId` | Decline spar |
| `POST` | `/combat-pvp/spar-action` | Take a spar action |
| `GET` | `/combat-pvp/spar-state` | Get current spar state |

---

## Technical Notes

- **State Storage**: Redis primary (`combat:pve:{sessionId}`, 1-hour TTL), in-memory `Map` fallback.
- **Weapon Validation**: Server-side weapon lookup from `CharacterEquipment` (slot `MAIN_HAND`) joined with `Item` and `ItemTemplate`. Client cannot send fabricated weapon stats. Unarmed defaults: `1d4 + 0`.
- **Transaction Safety**: PvE combat resolution is wrapped in `prisma.$transaction()` -- session status, gold/XP awards, equipment durability, and participant HP are updated atomically.
- **Flee Action**: Successful flee sets `FLED` status with minor penalty (half XP loss, 50% HP, no gold or durability loss) instead of full death penalties.
- **Validation**: All endpoints use Zod schemas for input validation.
- **Auth**: All combat endpoints require JWT authentication via middleware.
- **Concurrency**: Redis operations are atomic; combat state updates use read-modify-write with checks to prevent stale state.
- **Proficiency Bonus**: Characters have a proficiency bonus that scales with level, added to attack rolls and spell save DCs.
- **Bounded Accuracy**: The system follows D&D 5e bounded accuracy principles -- modifiers stay within reasonable ranges.
