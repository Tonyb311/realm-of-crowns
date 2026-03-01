# Admin Combat Dashboard — Full Implementation

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
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies.
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Keep scope realistic for a browser game. Avoid over-engineering.

## Setup

```bash
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/web-design.md
cat .claude/agents/backend-api.md
```

Read the research findings (REQUIRED — contains exact data structures, file paths, and interface definitions):
```bash
cat prompts/research-admin-combat-panel-findings.md
```

---

## The Task

Build a comprehensive **Admin Combat Dashboard** with four major sections:

1. **Combat Codex** — Searchable encyclopedia of every race, class, item, monster, and status effect with full mechanical details
2. **Combat Viewer** — Browse and inspect past combats with hyper-detailed round-by-round breakdowns
3. **Combat Simulator** — Configure and run simulated combats, view the same detailed round-by-round reports
4. **Combat Overview** — Landing page with aggregate combat statistics

### Critical Research Finding

**All round-by-round combat data is already persisted in the database.** Each action creates one `CombatLog` record with the full `TurnResult` discriminated union stored as JSON in the `result` column. This includes every dice roll, modifier breakdown, damage calculation, status tick, and HP change. **No combat engine modifications are needed. No new database columns are needed. No migrations are needed.** This is purely a read + visualize + simulate effort.

The existing data structures to work with:
- `TurnLogEntry` — round, actorId, action type, result (polymorphic), statusTicks array
- `StatusTickResult` — effectName, damage/healing, expired flag, hpAfter, killed flag
- `TurnResult` discriminated union — 8 variants: AttackResult, CastResult, DefendResult, ItemResult, FleeResult, RacialAbilityResult, PsionAbilityResult, ClassAbilityResult
- `CombatSession` — type, status, winnerId, participants, combatLogs

All of these are documented with full TypeScript interfaces in the research findings file.

---

## Section 1: Combat Codex

A tabbed reference encyclopedia accessible at `/admin/combat/codex`.

### 1A. Race Codex Tab

**20 races across 3 tiers** (core: 7, common: 6, exotic: 7). For each race display:

- **Base Stats**: STR, DEX, CON, INT, WIS, CHA modifiers in a clean stat block (from `statModifiers`)
- **Racial Trait**: Name + mechanical description (from `trait`)
- **Racial Abilities**: Each race has 1-7 abilities (103 total across all races). For each:
  - Name, unlock level (`levelRequired`: 1/5/10/15/25/40)
  - Category: `type` field — `passive` or `active` (color-code: passive=blue/teal, active=gold)
  - Effect type and value (from `effectType` + `effectValue`)
  - `cooldownSeconds` (convert to human-readable: "24h", "1h", "5min")
  - `duration` (seconds → readable)
  - `targetType`: self / party / enemy / aoe
  - Full mechanical description (from `description`)
- **Sub-Races** (3 races have them):
  - Drakonid: 7 ancestries (red, blue, green, black, white, gold, silver) — each with element and resistance
  - Beastfolk: 6 clans (wolf, bear, hawk, serpent, cat, boar) — each with bonusStat, bonusValue, specialPerk
  - Elementari: 4 elements (fire, water, earth, air) — each with element, resistance, bonusStat
- **Profession Bonuses**: Table showing professionType, speedBonus, qualityBonus, yieldBonus, xpBonus (from `professionBonuses`)
- **Gathering Bonuses**: If present (from `gatheringBonuses`)
- **Starting Towns**: List (from `startingTowns`)
- **Homeland Region**: (from `homelandRegion`)

Data source: `shared/src/data/races/core/*.ts`, `shared/src/data/races/common/*.ts`, `shared/src/data/races/exotic/*.ts`. Import from the race definition exports — never hardcode race data.

### 1B. Class Codex Tab

**7 classes, 21 specializations, 126 abilities** (6 per specialization, tiers 1-6). For each class:

- **Class Overview**: Name, specialization names
- **Per-Specialization**:
  - Specialization name and description
  - All 6 abilities in tier order (tier 1-6), each showing:
    - `id` (format: `{class}-{spec}-{number}`, e.g., `war-ber-1`)
    - `name`, `description`
    - `tier` (1-6)
    - `levelRequired`
    - `prerequisiteAbilityId` (if any — show dependency chain)
    - `effects` object — parse the effect type and display:
      - For damage: damage formula, scaling stat, bonus values
      - For buff/debuff: stat affected, modifier value, duration
      - For heal/HoT: heal amount, ticks
      - For status: which status effect, duration
      - For summon/companion: companion stats
      - For AoE: targets, area, damage
      - For multi_attack: number of strikes, per-strike damage
      - For drain: damage dealt + self-healing amount
      - For passive: always-on effect description
    - `cooldown` (rounds, 0=none)
    - Effect type badge (from the 20 unique effect types: damage, aoe_damage, buff, debuff, status, heal, hot, drain, passive, summon, teleport_attack, counter, trap, control, multi_attack, steal, companion, dispel, death_prevention, special)
    - **Integration status badge**: Check whether the ability's effect type is handled by `class-ability-resolver.ts` handlers (handleDamage, handleHealing, handleStatus, handleAoE, handleCounter, handleTrap, handleSummon, handleSteal, handleCompanion, handleDispel, handleDeath, handleSpecial). If the effect type maps to a handler → ✅ Integrated. If it falls through to the fallback basic attack → ⚠️ Data Only.
- **Psion Note**: Psion has its own dedicated resolver (`server/src/services/psion-abilities.ts`). All 18 Psion abilities are fully integrated — mark all as ✅.

Data source: `shared/src/data/skills/` — use `ALL_ABILITIES` and `ABILITIES_BY_CLASS` exports.

### 1C. Item Codex Tab

**~298 recipes/items** organized by category with filters:

**Weapons** (47 melee + 14 ranged = 61 total): From recipes with `outputItemType: 'WEAPON'`:
- Name, material tier, recipe tier (1-5)
- `WeaponStats`: baseDamage, damageType (slashing/piercing/bludgeoning), speed, durability, levelToEquip
- Required stats: requiredStr, requiredDex
- twoHanded flag, range (for ranged)
- Class restrictions if any (`classRestrictions`)
- Crafting chain: profession required, inputs, craftTime, xpReward

**Armor** (62 armor + 28 blacksmith = 90 total): From recipes with `outputItemType: 'ARMOR'`:
- Name, material tier, recipe tier
- `ArmorStats`: armor (AC value), magicResist, durability, levelToEquip
- requiredStr, movementPenalty, stealthPenalty
- Equipment slot (`equipSlot`)
- Crafting chain

**Consumables** (56 total): From recipes with `consumableStats`:
- Name, recipe tier
- `ConsumableStats`: effect type, magnitude, duration (0=instant), stackSize
- Secondary effect if any
- Crafting chain

**Other** (processing: 54, accessories: 12, enchantments: 13, housing: 11, mount gear: 6, food: 9):
- Grouped by sub-category
- Show recipe inputs/outputs, craft time, profession

**Quality System Display**: Show the quality multiplier table prominently:
- POOR: 0.7×, COMMON: 1.0×, FINE: 1.15×, SUPERIOR: 1.3×, MASTERWORK: 1.5×, LEGENDARY: 1.8×

Data source: `shared/src/data/recipes/` — all recipe files (smelter.ts, tanner.ts, tailor.ts, mason.ts, woodworker.ts, weapons.ts, ranged-weapons.ts, armor.ts, blacksmith.ts, consumables.ts, accessories.ts, enchantments.ts, housing.ts, mount-gear.ts, cook.ts).

### 1D. Monster Codex Tab

**21 monsters** across 10 biomes, levels 1-18. For each monster:

- **D&D-Style Stat Block**:
  - Name, level, biome
  - HP, AC
  - All 6 ability scores: STR, DEX, CON, INT, WIS, CHA
  - Attack bonus, damage dice string (e.g., "2d6+3")
  - Speed
- **Sentience Badge**: Sentient (drops gold, has intelligence) vs Non-sentient (drops materials)
- **Loot Table**: Each drop entry showing:
  - Drop chance as percentage (e.g., "90%")
  - Item name (`itemTemplateName`) or "Gold" with min-max quantity
  - Gold amount (from `gold` field)
- **XP Reward**: 5 × level = X XP
- **Encounter Info**: Which biomes via `TERRAIN_TO_BIOME` mapping, level range from `getMonsterLevelRange()`

Data source: `database/seeds/monsters.ts` for monster definitions, `server/src/lib/road-encounter.ts` for encounter logic.

### 1E. Status Effects Tab

**22 status effects**. For each effect:

- **Name** with color-coded badge (CC effects in red, buffs in green, debuffs in orange, DoT in purple)
- **Prevents Action**: YES/NO (8 CC effects: stunned, frozen, paralyzed, dominated, mesmerize, polymorph, root, skip_turn)
- **Modifier Table**: attackModifier, acModifier, saveModifier values
- **DoT/HoT**: damage per round or healing per round (if applicable)
- **Special Mechanics**: e.g., mesmerize breaks on damage, dominated forces attacking allies, taunt forces targeting source, silence blocks casting, root prevents flee
- **CC Immunity Note**: If `ccImmune` buff is active, all CC status applications are blocked
- **Duration Mechanic**: Decrements by 1 at START of affected combatant's turn, after DoT/HoT ticks

Data source: `STATUS_EFFECT_DEFS` in `server/src/lib/combat-engine.ts`.

### Codex UI Requirements

- **Global search bar** at the top — searches across all tabs (race names, ability names, item names, monster names, effect names)
- **Filter/sort controls** per tab:
  - Races: filter by tier (core/common/exotic)
  - Classes: filter by class, search abilities by name
  - Items: filter by category (weapon/armor/consumable/other), recipe tier (1-5), profession
  - Monsters: filter by biome, level range, sentience
  - Status Effects: filter by category (CC/buff/debuff/DoT/HoT)
- **Expandable cards** — collapsed shows name + key stats, expanded shows full mechanical detail
- Arcane design system: RealmPanel, RealmCard, RealmBadge, realm-* tokens
- D&D-style stat block layout for monsters (bordered box, clear visual hierarchy)
- Color-coding: ability categories (passive=blue/teal, active=gold, reactive=purple), item rarity (use existing `RARITY_COLORS`), status effect types
- Tab navigation with URL state: `/admin/combat/codex?tab=races`, `?tab=classes`, etc.

---

## Section 2: Combat Viewer

Accessible at `/admin/combat/history`. Browse and inspect every combat that has occurred.

### 2A. Combat List View

A paginated, filterable table of all past combats. Each row shows:
- Timestamp (from `CombatLog.createdAt`)
- Combat type (from `CombatSession.type`: PVE, PVP, DUEL, ARENA, WAR)
- Participants: character names + race + class + level, or monster name + level (from `CombatSession.participants`)
- Result: victory/defeat/fled (from `CombatSession.status` + `winnerId`)
- Duration: number of rounds (max round number from combat logs)
- Quick stats: total damage dealt (sum from TurnResult damage fields)

**Filters**: Date range, combat type dropdown, character name search, result filter (win/loss/fled), min/max rounds.

**Pagination**: 25 per page default, standard page/pageSize pattern matching existing admin endpoints.

### 2B. Combat Detail View — Round-by-Round Report

When a combat is selected, show a **hyper-detailed round-by-round breakdown**. This is the core deliverable.

The data is already in the database. Each `CombatLog` record has:
- `round` — round number
- `actorId` — who took the action
- `action` — action type string
- `result` — full `TurnResult` JSON (discriminated union)

Group logs by round number, then display each participant's turn within that round.

**Round Header:**
- Round number
- Initiative order — the first round's data should include initiative rolls. If initiative data isn't in the log (it's in `CombatState.turnOrder`), derive order from the sequence of actorIds within the round.

**Per-Participant Turn — parse the TurnResult based on action type:**

**If `action === 'attack'`** — parse as `AttackResult`:
- Attack roll: `attackRoll` (d20) + modifier breakdown from `attackModifiers` array (each has `source` and `value`) = `attackTotal`
- vs Target AC: `targetAC`
- Hit/Miss: `hit` boolean
- Critical: `critical` boolean (natural 20)
- If hit: damage breakdown from `damageModifiers` array + `damageRolls` array = `totalDamage`
- Damage type: `damageType`
- Weapon: `weaponName` + `weaponDice`
- HP change: `targetHpBefore` → `targetHpAfter`
- Kill: `targetKilled`
- Negated: `negatedAttack` (Precognitive Dodge)

**If `action === 'cast'`** — parse as `CastResult`:
- Spell: `spellName`, level `spellLevel`, slot expended `slotExpended`
- If damage: `damageRoll` → `totalDamage`
- If heal: `healAmount`
- Save: `saveRequired`, `saveRoll` + `saveTotal` vs `saveDC`, `saveSucceeded`
- Status: `statusApplied` for `statusDuration` rounds
- Target: `targetHpAfter`, `targetKilled`

**If `action === 'defend'`** — parse as `DefendResult`:
- AC bonus: `acBonusGranted` (always +2)

**If `action === 'item'`** — parse as `ItemResult`:
- Item: `itemName`
- Effect: `healAmount` or `damageAmount`, `statusApplied`/`statusRemoved`
- Target: `targetHpAfter`

**If `action === 'flee'`** — parse as `FleeResult`:
- Roll: `fleeRoll` vs DC `fleeDC`
- Result: `success` boolean

**If `action === 'racial_ability'`** — parse as `RacialAbilityResult`:
- Ability: `abilityName`, `description`
- Effects: `damage`, `healing`, `statusApplied` on `targetIds`
- Success: `success` boolean

**If `action === 'psion_ability'`** — parse as `PsionAbilityResult`:
- Ability: `abilityName` (`abilityId`)
- Effects: `damage`, `statusApplied`, `controlled`, `banished`
- Save: `saveRequired`, `saveRoll` vs `saveDC`, `saveSucceeded`
- Description: `description`
- Target: `targetHpAfter`, `targetKilled`

**If `action === 'class_ability'`** — parse as `ClassAbilityResult`:
- Ability: `abilityName` (`abilityId`), `effectType`
- Damage/Healing: `damage`, `healing`, `selfHealing`
- Buffs/Debuffs: `buffApplied`/`debuffApplied` with `duration`
- Status: `statusApplied` with `statusDuration`
- Stat mods: `statModifiers` object
- Save: `saveRequired`, `saveType`, `saveDC`, `saveRoll`, `saveTotal`, `saveSucceeded`
- AoE results: `perTargetResults` array (targetName, damage, healing, statusApplied, hpAfter, killed)
- Multi-strike: `strikeResults` array (strikeNumber, hit, crit, damage, attackRoll, attackTotal, targetAc)
- Special: `goldStolen`, `bonusLootRoll`, `peacefulResolution`, `fallbackToAttack`, `cleansedEffects`
- Target: `targetHpAfter`, `actorHpAfter`, `targetKilled`

**Status Effect Ticks** — from `statusTicks` array on each TurnLogEntry (note: these are embedded in the result JSON):
- For each `StatusTickResult`: effectName, damage/healing value, expired flag, hpAfter, killed flag
- Display as a sub-section before the action: "⚡ Poison ticked for 3 damage (HP: 47 → 44)"
- Flag expired effects: "❄️ Frozen expired"
- Flag kills: "☠️ Killed by Burning (3 fire damage)"

**Combat Summary** (at the bottom of the detail view):
- Winner / outcome (from `CombatSession.winnerId` + `status`)
- Total rounds
- Per-participant totals: sum up damage dealt, damage taken, healing done from all their TurnResults
- Count abilities used, crits landed (from `critical: true` on AttackResults)
- Count status effects applied (from `statusApplied` fields)

### 2C. Round-by-Round Component — REUSABLE

Build the round-by-round display as a **standalone React component** that accepts an array of `CombatLog` records + participant metadata. This SAME component will be used in:
1. Combat Viewer (Section 2B) — fed from database records
2. Combat Simulator (Section 3B) — fed from simulation results

Component signature (approximately):
```typescript
interface CombatReplayProps {
  logs: Array<{ round: number; actorId: string; action: string; result: any }>;
  participants: Array<{ id: string; name: string; race?: string; class?: string; level: number; entityType: 'character' | 'monster' }>;
}
```

---

## Section 3: Combat Simulator

Accessible at `/admin/combat/simulator`. Configure and run simulated combats.

### 3A. Configuration Panel

**PvE Simulator:**
- Race dropdown (all 20 races, grouped by tier)
- Sub-race dropdown (conditional — only shows for Drakonid/Beastfolk/Elementari)
- Class + Specialization cascading dropdowns (7 classes → 3 specs each)
- Level: number input with slider (1-50)
- Equipment: "Auto-equip best for level" toggle (default on), or manual weapon/armor selection from item codex data
- Monster opponent: dropdown of all 21 monsters, showing name + level + biome
- Simulation count: 1 (detailed view) / 10-100 (batch analysis) / 100-1000 (statistical significance)
- Roll mode: "Random rolls" (default) / "Average rolls" (deterministic)

**PvP Simulator:**
- Side-by-side identical configuration panels for Combatant A and Combatant B
- Same fields as PvE minus monster selection

**Quick Presets** (buttons that auto-fill configuration):
- "Level 1 Human Warrior vs Goblin"
- "Level 10 Elf Mage vs Orc Warrior"
- "Level 25 Dwarf Cleric vs Young Dragon"
- "Level 40 Drow Rogue vs Lich"
- "Level 20 Mirror Match"
- "Save Custom Preset" button (store in localStorage)

### 3B. Single Combat View

When count=1 (or ≤10): display the **exact same round-by-round report** from Section 2C. The simulator endpoint returns data in the same shape as `CombatLog` records — feed it directly to the reusable `CombatReplay` component.

### 3C. Batch Simulation View

When count > 10: display statistical analysis dashboard:

**Summary Stats Table:**
- Win rate: % character wins / % monster wins / % fled
- Average combat duration (rounds) with min/max
- Average damage dealt per round (by each side)
- Average HP remaining on winner
- Average total damage per combat

**Charts** (use Recharts — already in the project):
- Bar chart: win/loss/flee rate
- Histogram: combat duration distribution (rounds)
- Pie chart: damage source breakdown (attack vs ability vs racial_ability vs class_ability vs DoT)
- Bar chart: most-used abilities (top 10 by frequency)

**Detailed Stats:**
- Most effective abilities ranked by avg damage per use
- Critical hit rate (crits / total attacks)
- Status effect application rate (per ability that applies status)
- Death prevention trigger rate (for races with those abilities)
- Flee success rate (successful flees / attempted flees)

### 3D. Simulator Backend

Create endpoint: `POST /api/admin/combat/simulate`

Zod validation schema:
```typescript
const SimulateSchema = z.object({
  type: z.enum(['pve', 'pvp']),
  combatantA: z.object({
    race: z.string(),
    subRace: z.string().optional(),
    class: z.string(),
    specialization: z.string(),
    level: z.number().int().min(1).max(50),
    autoEquip: z.boolean().default(true),
    weaponRecipeId: z.string().optional(),
    armorRecipeId: z.string().optional(),
  }),
  combatantB: z.union([
    z.object({ monsterId: z.string() }),  // PvE
    z.object({                              // PvP
      race: z.string(),
      subRace: z.string().optional(),
      class: z.string(),
      specialization: z.string(),
      level: z.number().int().min(1).max(50),
      autoEquip: z.boolean().default(true),
    }),
  ]),
  count: z.number().int().min(1).max(1000).default(1),
  useAverageRolls: z.boolean().default(false),
});
```

**Implementation approach — REUSE existing infrastructure:**

The CLI combat simulator already exists at `server/src/scripts/combat-sim-runner.ts` (980 lines) with a full instrumented round-by-round loop. The combat engine pure functions are in `server/src/lib/combat-engine.ts`. The class ability resolver is at `server/src/lib/class-ability-resolver.ts`. Do NOT duplicate any combat logic.

The simulator endpoint should:
1. Build `Combatant` objects from the config (race stats from shared data + class info + level scaling + equipment stats from recipe data)
2. Call the existing combat engine functions: `rollInitiative()` → `resolveTurn()` loop → check `isComplete()`
3. Collect the `CombatState.log` (array of `TurnLogEntry`) after combat ends
4. For count ≤ 10: return the full log arrays for each combat (for the CombatReplay component)
5. For count > 10: return only aggregate statistics (win rate, avg duration, damage breakdowns, ability usage counts)
6. For count > 100: consider running in batches with progress streaming via Socket.io (the existing simulation system uses adaptive polling — follow the same pattern)

The response shape should match what the frontend needs:
```typescript
// Response for count <= 10
{
  combats: Array<{
    logs: TurnLogEntry[];
    participants: CombatantSummary[];
    winner: 'A' | 'B' | 'fled';
    rounds: number;
  }>;
  summary: BatchSummary;
}

// Response for count > 10
{
  combats: []; // empty — too large to return
  summary: BatchSummary;
}
```

---

## Section 4: Admin Combat Overview Dashboard

At `/admin/combat` — the landing page for the combat section. Quick-glance aggregate stats.

Query the `CombatSession` + `CombatLog` tables to compute:

- **Total combats**: today / this week / all time (count CombatSession records)
- **PvE win rate**: overall + broken down by level bracket (1-10, 11-20, 21-30, 31-40, 41-50)
- **PvP win rate by class**: which class wins most in PvP matchups
- **Most lethal monsters**: highest kill rate (monster wins / total encounters per monster)
- **Average combat duration**: by level bracket (avg round count)
- **Most-used abilities**: top 10 racial + top 10 class abilities by frequency (count from CombatLog.action + result.abilityName)
- **Status effect frequency**: how often each of the 22 effects appears in combat logs
- **Flee rate**: % of combats that ended in flee (from FleeResult with success=true)

Display with Recharts: bar charts for win rates, line chart for duration trends, tables for ability rankings.

---

## Technical Requirements

### Navigation
- Add "Combat" to `ADMIN_NAV` in `client/src/components/admin/AdminLayout.tsx` with a Swords icon (from Lucide React)
- Sub-navigation within the combat section: Overview | Codex | History | Simulator
- URL structure: `/admin/combat`, `/admin/combat/codex`, `/admin/combat/history`, `/admin/combat/simulator`
- Add routes to the `/admin` route block in `App.tsx`

### Frontend Architecture
- Create `client/src/pages/admin/combat/` directory:
  - `AdminCombatOverviewPage.tsx` — Overview dashboard
  - `AdminCombatCodexPage.tsx` — Tabbed codex (or split into sub-components per tab)
  - `AdminCombatHistoryPage.tsx` — Combat list + detail
  - `AdminCombatSimulatorPage.tsx` — Simulator config + results
- Create `client/src/components/admin/combat/` for shared components:
  - `CombatReplay.tsx` — The reusable round-by-round component (used by History + Simulator)
  - `TurnResultDisplay.tsx` — Renders a single TurnResult based on action type
  - `StatBlock.tsx` — D&D-style stat block for monsters
  - `AbilityCard.tsx` — Expandable ability display
  - `BatchStatsDisplay.tsx` — Charts and tables for batch simulation results
- React Query for all data fetching (standard pattern — see existing admin pages)
- All components use Arcane design system (RealmPanel, RealmCard, RealmBadge, realm-* tokens, Cinzel font)

### Backend Architecture
- Create `server/src/routes/admin/combat.ts`
- Register in `server/src/routes/admin/index.ts`: `router.use('/combat', combatRouter)`
- All endpoints require `adminGuard` (already applied at router level)
- Zod validation on all POST endpoints

**New API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/admin/combat/stats` | GET | Aggregate statistics for overview dashboard |
| `GET /api/admin/combat/history` | GET | Paginated combat session list with filters |
| `GET /api/admin/combat/session/:id` | GET | Full combat detail — session + all CombatLogs ordered by round/createdAt |
| `POST /api/admin/combat/simulate` | POST | Run simulated combat(s) |
| `GET /api/admin/combat/codex/races` | GET | All 20 race definitions from shared data |
| `GET /api/admin/combat/codex/classes` | GET | All 7 class definitions with 126 abilities from shared data |
| `GET /api/admin/combat/codex/items` | GET | All ~298 recipe definitions from shared data |
| `GET /api/admin/combat/codex/monsters` | GET | All 21 monster definitions |
| `GET /api/admin/combat/codex/status-effects` | GET | All 22 status effect definitions |

**Codex endpoints are simple** — they just import from `shared/src/data/` and return the data. These are essentially static data served via API (could also be imported directly on the frontend from shared, but API is cleaner for the admin pattern).

**History endpoint** follows existing pagination pattern:
```typescript
const page = parseInt(req.query.page) || 1;
const pageSize = Math.min(parseInt(req.query.pageSize) || 25, 100);
// ... Prisma query with filters on CombatSession, include participants
```

**Session detail endpoint** — single query:
```typescript
const session = await prisma.combatSession.findUnique({
  where: { id },
  include: {
    combatLogs: { orderBy: { createdAt: 'asc' } },
    participants: true,
  },
});
```

### Performance
- Codex data: cache aggressively with React Query (staleTime: Infinity — data is static from shared files)
- Combat history: standard pagination, 25/page
- Session detail: load on demand when combat is expanded/selected
- Batch simulation (>100): stream progress updates if feasible, otherwise just await with loading indicator
- Round-by-round display: virtualize if combat has >20 rounds (use react-window or similar)

### Shared Types
Add to `shared/src/types/`:
- `SimulationConfig` — matches the Zod schema for simulator input
- `SimulationResult` — response shape for simulator output
- Re-export existing combat types (`TurnLogEntry`, `TurnResult` variants, `StatusTickResult`) if not already in shared

---

## Implementation Order

1. **Backend — Codex API endpoints** (simplest — just serve shared data): races, classes, items, monsters, status effects
2. **Backend — Combat history endpoints**: list with pagination/filters, session detail
3. **Backend — Combat stats endpoint**: aggregate queries for overview dashboard
4. **Backend — Simulator endpoint**: build combatants, run engine, return results
5. **Frontend — Codex tabs**: Race → Class → Item → Monster → Status Effects
6. **Frontend — CombatReplay component**: The reusable round-by-round display (build this early, it's used twice)
7. **Frontend — Combat History**: List page + detail view using CombatReplay
8. **Frontend — Simulator**: Config panel + single view (reuse CombatReplay) + batch stats view
9. **Frontend — Overview Dashboard**: Aggregate stats with charts
10. **Navigation**: Add Combat to admin sidebar, set up routes in App.tsx

---

## Deployment

After all implementation is complete:

```bash
git add -A
git commit -m "feat: comprehensive admin combat dashboard with codex, viewer, simulator, and overview"
git push origin main
```

Build and deploy to Azure:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:<UNIQUE_TIMESTAMP_TAG> .
docker push rocregistry.azurecr.io/realm-of-crowns:<UNIQUE_TIMESTAMP_TAG>
az containerapp update --name realm-of-crowns --resource-group roc-production --image rocregistry.azurecr.io/realm-of-crowns:<UNIQUE_TIMESTAMP_TAG>
```

No database migrations are needed — all data is already stored.

---

## What This Prompt Does NOT Cover

- Modifying combat balance (damage numbers, monster stats, ability values)
- Adding new abilities, races, or monsters
- Changing how combat works mechanically
- Player-facing combat UI changes
- The combat engine's class ability integration gaps (separate workstream)
- Modifications to the combat engine code itself

This is purely a **read-only visibility and debugging tool** for the admin. It reads existing shared data files and existing database records. The only new backend code is API endpoints to serve that data and the simulator endpoint that calls existing combat engine functions.
