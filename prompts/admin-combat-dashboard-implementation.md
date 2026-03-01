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

Read the research findings:
```bash
cat prompts/research-admin-combat-panel-findings.md
```

---

## The Task

Build a comprehensive **Admin Combat Dashboard** with three major sections:

1. **Combat Codex** — A searchable, browsable encyclopedia of every race, class, item, and monster with full mechanical details
2. **Combat Viewer** — Browse and inspect past combats with hyper-detailed round-by-round breakdowns
3. **Combat Simulator** — Configure and run simulated combats, then view the same detailed round-by-round reports

The goal is to give the game admin (Tony) complete transparency into how combat works — every modifier, every roll, every decision, every stat interaction — so bugs and balance issues are immediately visible.

---

## Section 1: Combat Codex

A tabbed reference encyclopedia accessible at `/admin/combat/codex`.

### 1A. Race Codex Tab

For each of the 20 races, display a detail panel showing:

- **Base Stats**: STR, DEX, CON, INT, WIS, CHA modifiers in a clean stat block
- **Racial Traits**: Every trait with name and mechanical effect (not just flavor text)
- **Racial Abilities (6-7 per race)**: For each ability show:
  - Name, unlock level (1/5/10/15/25/40)
  - Category: passive / active / reactive
  - Full mechanical description: what it does in combat
  - Cooldown, mana cost, damage formula if applicable
  - Status effects applied/removed
  - Any conditional triggers (e.g., "on death", "when hit by melee", "on kill")
- **Sub-Races** (for Dragonborn, Beastfolk, Genasi): Show the specific variants with their unique modifiers
- **Profession Bonuses**: Gathering/crafting speed, quality, yield, XP racial bonuses
- **Racial Relations**: How this race starts with other races (Allied/Friendly/Neutral/Distrustful/Hostile/Blood Feud)
- **Starting Towns**: Where this race begins

Data source: All race files in `shared/src/data/races/` — read everything from shared data, never hardcode.

### 1B. Class Codex Tab

For each of the 7 classes and 21 specializations, display:

- **Class Overview**: Description, primary stat, combat role
- **Skill Tree Visualization**: Show the 3 specialization branches
- **Per-Specialization**:
  - Specialization name and description
  - All 6 abilities with:
    - Name, unlock requirements
    - Effect type (damage, buff, debuff, heal, passive, status, drain, HoT, cleanse, flee, AoE)
    - Full mechanical formula: damage dice, scaling stat, bonus values, duration
    - Cooldown (turns), mana/resource cost
    - Target type (self, enemy, ally, AoE)
    - Status effects applied
    - Integration status: ✅ integrated into combat engine / ⚠️ data only (not yet wired)
- **Psion Special Section**: Since Psion has its own dedicated resolver, flag this differently

Data source: `shared/src/data/skills/` files.

### 1C. Item Codex Tab

Organized by category with filters:

**Weapons**: For each weapon show:
- Name, rarity, material tier
- Damage dice (e.g., 1d8+2), damage type (slashing/piercing/bludgeoning/magical)
- Attack bonus, crit range/multiplier if any
- Special effects (e.g., +fire damage, life steal)
- Durability, weight
- Crafting profession and recipe chain

**Armor**: For each armor piece show:
- Name, rarity, material tier
- AC bonus, armor type (light/medium/heavy)
- Stat modifiers (e.g., -1 DEX for heavy)
- Special effects
- Durability, weight
- Equipment slot

**Consumables**: For each consumable show:
- Name, rarity
- Effect (heal X HP, buff +Y to STAT for Z turns, cure status)
- Duration if applicable
- Crafting profession and recipe

**Accessories & Enchantments**: Stats, effects, slots.

Data source: `shared/src/data/recipes/` and item template data.

### 1D. Monster Codex Tab

For each monster, display:

- **Stat Block** (D&D style layout):
  - Name, level, biome(s)
  - HP, AC, all ability scores
  - Damage dice, attack bonus
  - Special abilities if any
- **Loot Table**: Every possible drop with drop chance percentage
- **Gold Reward**: Amount (and note if 0 = non-sentient)
- **XP Reward**: Formula result (5 × level)
- **Encounter Info**: Which routes/biomes this monster spawns in, level range for encounters
- **Sentience Flag**: Sentient (drops gold) vs Non-sentient (drops materials)

Data source: `database/seeds/monsters.ts` and `server/src/lib/road-encounter.ts`.

### Codex UI Requirements

- **Search bar** at the top that searches across all tabs (race names, ability names, item names, monster names)
- **Filter/sort** controls per tab (filter races by tier, items by rarity, monsters by biome/level)
- **Expandable cards** — show summary in collapsed state, full mechanical detail when expanded
- Use the Arcane design system (RealmPanel, RealmCard, RealmBadge, realm-* tokens)
- Stat blocks should look like D&D-style stat blocks with clear visual hierarchy
- Color-code by rarity where applicable using existing `RARITY_COLORS` constants
- Color-code ability categories (passive=blue/teal, active=gold, reactive=purple)

---

## Section 2: Combat Viewer

Accessible at `/admin/combat/history`. Browse and inspect every combat that has occurred.

### 2A. Combat List View

A paginated, filterable table of all past combats showing:
- Timestamp
- Combat type (PvE road encounter / PvP duel)
- Participants (character names + race + class + level, or monster name + level)
- Result (victory/defeat/fled)
- Duration (number of rounds)
- Quick stats: total damage dealt, damage taken, abilities used

**Filters**: Date range, combat type, character name search, result filter, min/max rounds.

### 2B. Combat Detail View — Round-by-Round Report

When a combat is selected, show a **hyper-detailed round-by-round breakdown**. This is the core deliverable. For EACH round, for EACH participant, show:

**Round Header:**
- Round number
- Initiative order (who goes first and why — show the d20 roll + DEX mod)

**Per-Participant Turn:**
- **Character State at Start of Turn**:
  - Current HP / Max HP
  - Current MP / Max MP (if applicable)
  - AC (base + armor + DEX mod + buff mods — show each component)
  - Active buffs/debuffs with remaining duration
  - Active status effects with remaining duration
  - Cooldowns on abilities

- **Status Effect Tick** (if any):
  - Which effects ticked (poison, burning, blessed HoT, etc.)
  - Damage/healing from each effect with formula shown
  - Effects that expired this round
  - Effects that prevented action (stunned, frozen)

- **Action Taken**:
  - What action was chosen and WHY (for monsters: AI decision logic; for players: what they selected)
  - **If Attack**:
    - Attack roll: d20 result + modifier breakdown (STR/DEX mod + weapon bonus + buff bonus + racial bonus = total) vs target AC (base + armor + DEX mod + shield + buff = total)
    - Hit or miss
    - If hit — damage roll: dice result + modifier breakdown (STR/DEX mod + weapon damage + enchant bonus + racial bonus + buff bonus = total)
    - Critical hit check (natural 20?)
    - If critical — doubled dice shown
    - Damage type (slashing, fire, etc.)
    - Target HP before → after
  - **If Ability Used**:
    - Ability name, source (racial/class)
    - Mana/resource cost
    - Effect resolution: what it did mechanically (damage formula, buff values, heal amount)
    - All modifiers that affected it
    - Target(s) affected
    - Status effects applied/removed
    - Cooldown set
  - **If Defend**:
    - AC bonus applied (+2 until next turn)
  - **If Item Used**:
    - Item name, effect, healing/buff values
  - **If Flee**:
    - Flee roll: d20 + DEX mod vs DC (show the DC and why)
    - Success or failure
    - If success: penalties applied (half XP loss, 50% HP, etc.)

- **Reactive Abilities Triggered**:
  - Any reactive racial abilities that fired (melee reflect, death prevention, bonus attack on kill)
  - Show the trigger condition and the mechanical result

- **Death Check**:
  - If HP ≤ 0: death prevention check (which racial abilities checked, did any fire?)
  - If dead: death penalties applied (gold lost, XP lost, durability damage — show amounts)

**Combat Summary** at the end:
- Winner / outcome
- Total rounds
- Per-participant totals: damage dealt, damage taken, healing done, abilities used, crits landed, status effects applied
- XP awarded (formula: 5 × monster level)
- Gold awarded (amount, sentient check)
- Loot dropped (items, drop chance that was rolled)
- Death penalties if applicable (gold lost, XP lost, durability damage per item)

### 2C. Data Requirements

**IMPORTANT**: The current combat log storage may not have enough detail for this level of reporting. The research findings will reveal whether round-by-round data is persisted. If it's NOT stored with this granularity:

- **Modify the combat engine** to produce a detailed `CombatReport` object during resolution
- **Store the full report as JSON** in the combat log database record (a new `detailedReport` JSON column)
- This means NEW combats will have full detail; historical ones will show whatever was stored
- Flag historical combats as "limited detail available" in the UI

The `CombatReport` structure should include for each round:
```typescript
interface CombatReport {
  rounds: CombatRoundReport[];
  summary: CombatSummary;
}

interface CombatRoundReport {
  roundNumber: number;
  initiativeOrder: { combatantId: string; roll: number; dexMod: number; total: number }[];
  turns: CombatTurnReport[];
}

interface CombatTurnReport {
  combatantId: string;
  stateAtStart: {
    hp: number; maxHp: number;
    mp: number; maxMp: number;
    ac: number; acBreakdown: { base: number; armor: number; dex: number; buffs: number; racial: number };
    activeBuffs: { name: string; remainingTurns: number; effect: string }[];
    activeDebuffs: { name: string; remainingTurns: number; effect: string }[];
    statusEffects: { name: string; remainingTurns: number }[];
    cooldowns: { abilityName: string; remainingTurns: number }[];
  };
  statusEffectTicks: {
    effectName: string;
    type: 'damage' | 'heal' | 'expired' | 'prevented_action';
    value?: number;
    formula?: string;
  }[];
  action: {
    type: string; // attack, defend, ability, item, flee
    reason?: string; // AI decision reasoning for monsters
    details: AttackDetail | AbilityDetail | DefendDetail | ItemDetail | FleeDetail;
  };
  reactiveAbilities: {
    abilityName: string;
    source: string; // race name
    trigger: string; // what caused it
    effect: string; // what it did
    values?: Record<string, number>;
  }[];
  deathCheck?: {
    triggered: boolean;
    preventionAttempts: { abilityName: string; succeeded: boolean }[];
    penalties?: { goldLost: number; xpLost: number; durabilityDamage: number };
  };
  hpAfter: number;
}
```

Adapt this structure based on what the research findings reveal about the actual combat engine internals. The key principle: **capture every number and every decision so the admin can trace exactly what happened and why.**

---

## Section 3: Combat Simulator

Accessible at `/admin/combat/simulator`. Configure and run simulated combats.

### 3A. Configuration Panel

**PvE Simulator:**
- Select race (dropdown of all 20)
- Select sub-race if applicable
- Select class + specialization
- Set level (1-50 slider/input)
- Select equipment loadout (weapon, armor, accessories from item list — or "auto-equip best for level")
- Select monster opponent (dropdown of all monsters)
- Number of simulations to run (1 for detailed view, 10-1000 for statistical analysis)
- Option: "Use random rolls" vs "Use average rolls" (for deterministic testing)

**PvP Simulator:**
- Same character config for BOTH combatants
- Side-by-side configuration panels

**Quick Presets:**
- "Level 1 Human Warrior vs Goblin" (basic test)
- "Level 10 Elf Mage vs Orc Warrior" (midgame PvP)
- "Level 25 Dwarf Cleric vs Young Dragon" (endgame PvE)
- "Level 40 Drow Rogue vs Lich" (max PvE challenge)
- "Mirror Match: Level 20 Human Warrior vs Human Warrior" (balance check)
- Allow saving custom presets

### 3B. Single Combat View

When running a single simulation, show the **exact same round-by-round report** as Section 2B (Combat Viewer). Reuse the same component — just feed it the simulation result instead of a database record.

### 3C. Batch Simulation View

When running N simulations, show statistical analysis:

- Win rate (% character wins, % monster wins, % fled)
- Average combat duration (rounds)
- Average damage dealt per round (by participant)
- Average HP remaining on winner
- Damage source breakdown (melee vs ability vs racial vs status effect DoT)
- Most-used abilities (ranked by frequency)
- Most effective abilities (ranked by avg damage or heal per use)
- Critical hit rate
- Status effect application rate (how often does X ability apply its status?)
- Death prevention trigger rate (for races with those abilities)
- Flee success rate

Display as:
- Summary stats table
- Bar charts for win rate
- Distribution histogram for combat duration
- Damage breakdown pie chart

### 3D. Simulator Backend

Create an admin API endpoint: `POST /admin/combat/simulate`

```typescript
// Request
{
  type: 'pve' | 'pvp';
  combatantA: {
    race: string;
    subRace?: string;
    class: string;
    specialization: string;
    level: number;
    equipment?: { weapon?: string; armor?: string; accessories?: string[] };
    autoEquip?: boolean;
  };
  combatantB: { /* same for PvP */ } | { monsterId: string; /* for PvE */ };
  count: number; // 1-1000
  useAverageRolls?: boolean;
}

// Response
{
  results: CombatReport[]; // full reports for count <= 10
  summary: BatchSimulationSummary; // always present
}
```

The simulator should:
- Build `Combatant` objects from the configuration (race stats + class stats + level scaling + equipment)
- Use the EXISTING `combat-engine.ts` pure functions — do NOT duplicate combat logic
- Generate the `CombatReport` from Section 2C for each combat
- For batch runs (>10), return only the summary stats (not all 1000 detailed reports)
- For single runs or small batches (≤10), return full detailed reports

---

## Section 4: Admin Combat Overview Dashboard

At `/admin/combat` — the landing page for the combat section. Quick-glance stats:

- Total combats today / this week / all time
- PvE win rate (overall + per level bracket: 1-10, 11-20, 21-30, 31-40, 41-50)
- PvP win rate by class
- Most lethal monsters (highest kill rate against players)
- Most common death cause (which monster, which ability)
- Average combat duration by level bracket
- Most-used racial abilities in combat
- Most-used class abilities in combat
- Status effect application frequency
- Flee rate

Data source: aggregate from combat log database.

---

## Technical Requirements

### Navigation
- Add "Combat" section to admin sidebar/navigation
- Sub-navigation: Overview | Codex | History | Simulator
- URL structure: `/admin/combat`, `/admin/combat/codex`, `/admin/combat/history`, `/admin/combat/simulator`

### Performance
- Codex data is static — load once, cache aggressively (it comes from shared data files, not DB)
- Combat history pagination: 25 per page default, lazy load detail on expand
- Simulator batch runs: run server-side, stream progress updates via Socket.io if >100 simulations
- Round-by-round reports can be large — lazy render rounds (virtualize if >20 rounds)

### Frontend Architecture
- Create an `admin/combat/` directory for all combat admin components
- Reuse the round-by-round report component between Combat Viewer and Simulator
- Use React Query for all data fetching with appropriate cache/stale times
- All components use Arcane design system (realm-* tokens, Realm components)

### Backend Architecture
- New admin routes in `server/src/routes/admin/combat.ts`
- Register in admin route index
- All endpoints require admin middleware
- Combat simulation endpoint should validate all inputs with Zod
- If combat engine modifications are needed for detailed reporting, make them non-breaking (the detailed report is an ADDITION to existing return values, not a replacement)

### Shared Types
- Add new types to `shared/src/types/` for:
  - `CombatReport` and sub-types (as defined in Section 2C, adapted from research findings)
  - `SimulationConfig` and `SimulationResult`
  - `CodexEntry` types if needed for API responses

---

## Implementation Order

1. **Backend first**: Combat report generation, combat log storage enhancement, simulator endpoint, codex API endpoints
2. **Shared types**: CombatReport, SimulationConfig types
3. **Frontend — Codex**: Race → Class → Item → Monster tabs (these are the most self-contained)
4. **Frontend — Combat Overview**: Dashboard with aggregate stats
5. **Frontend — Combat History**: List + detail view with round-by-round component
6. **Frontend — Simulator**: Configuration + reuse round-by-round component + batch stats view

---

## Deployment

After all implementation is complete:

```bash
git add -A
git commit -m "feat: comprehensive admin combat dashboard with codex, viewer, and simulator"
git push origin main
```

Build and deploy to Azure:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:<UNIQUE_TIMESTAMP_TAG> .
docker push rocregistry.azurecr.io/realm-of-crowns:<UNIQUE_TIMESTAMP_TAG>
az containerapp update --name realm-of-crowns --resource-group roc-production --image rocregistry.azurecr.io/realm-of-crowns:<UNIQUE_TIMESTAMP_TAG>
```

If any database migrations are needed (e.g., adding `detailedReport` JSON column to combat log):
```bash
npx prisma migrate dev --name add-combat-report-detail
```

Then deploy and seeds will run automatically on container startup.

---

## What This Prompt Does NOT Cover

- Modifying the actual combat balance (damage numbers, monster stats, etc.)
- Adding new abilities or races
- Changing how combat works mechanically
- Player-facing combat UI changes
- The combat engine's class ability integration gaps (that's a separate workstream)

This is purely a **visibility and debugging tool** for the admin. It reads and displays existing data. The only engine modification is adding detailed report generation so the admin can see the full picture.
