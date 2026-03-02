# Combat Overview Tab — Full Redesign v2

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

## Task

Complete redesign of the admin Combat Dashboard **Overview** tab. The current version has the wrong KPIs and missing analytics. The Overview must serve as an **executive-level combat health dashboard** that answers three questions:

1. **Challenge Health** — Are fights fair and interesting across all levels?
2. **Economy Faucet** — What gold/XP/items are entering the world through combat, and at what rate?
3. **Balance Alerts** — What needs immediate attention?

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Data Model

### CombatEncounterLog (primary data source)
```
id, type ('pve'|'pvp'), sessionId,
characterId, characterName,
opponentId, opponentName,
townId, partyId,
startedAt, endedAt,
outcome ('win'|'loss'|'flee'|'draw'),
totalRounds,
characterStartHp, characterEndHp,
opponentStartHp, opponentEndHp,
characterWeapon, opponentWeapon,
xpAwarded, goldAwarded,
lootDropped (String — comma-separated item names, or empty ""),
rounds (Json), summary,
triggerSource ('road_encounter'|'group_road_encounter'|'town_pve'|'pvp_duel'|'pvp_spar'|'arena'),
originTownId, destinationTownId, simulationTick,
startedAt (DateTime)
```
FK: `characterId → Character` (has: race, class, specialization, level, stats)

### Item Rarity Lookup
The `lootDropped` field stores item names as comma-separated strings (e.g. `"Animal Pelts,Bones"`). To get rarity, check `shared/data/` for item definitions. Look for files that define items with a `rarity` field. If items aren't in shared data, check the database `Item` or `ItemTemplate` model. Investigate before implementing — don't assume.

### Level Bands
Use these bands throughout: `1-5`, `6-10`, `11-15`, `16-20`. Character level comes from joining `Character` via `characterId`.

## Backend: `server/src/routes/admin/combat.ts`

### REPLACE `GET /stats` entirely with this response shape:

```typescript
{
  // === TIER 1: Glanceable Health (KPI cards) ===
  totalEncounters: number,
  pveSurvivalRate: number,        // % of PvE encounters (type='pve') where outcome='win'
  avgRounds: number,              // mean totalRounds across all encounters
  goldPerDay: number,             // avg gold awarded per day over last 30 days
  itemsDroppedPerDay: number,     // avg items dropped per day over last 30 days (count non-empty lootDropped, split by comma to count individual items)
  activeLevelRange: string,       // the level band where most combat occurs, e.g. "1-5"

  // === TIER 2: Pattern Detection (charts) ===

  // PvE Survival Rate by Level Band — THE most important chart
  survivalByLevel: Array<{
    band: string,              // "1-5", "6-10", "11-15", "16-20"
    encounters: number,
    wins: number,
    survivalRate: number,      // wins / encounters * 100
    avgRounds: number,
    avgHpRemainingPct: number, // avg (characterEndHp / characterStartHp * 100) for wins only
  }>,

  // Economy injection trend (daily, last 30 days)
  economyTrend: Array<{
    date: string,
    gold: number,              // sum goldAwarded that day
    xp: number,                // sum xpAwarded that day
    itemsDropped: number,      // count of items dropped that day
  }>,

  // Loot by rarity distribution
  lootByRarity: Array<{
    rarity: string,            // POOR, COMMON, FINE, SUPERIOR, MASTERWORK, LEGENDARY, UNKNOWN
    count: number,
  }>,

  // Avg rounds by level band (pacing curve)
  pacingByLevel: Array<{
    band: string,
    avgRounds: number,
    encounters: number,
  }>,

  // === TIER 3: Balance Alerts (auto-flagged) ===
  alerts: Array<{
    category: 'race' | 'class' | 'monster' | 'level_band' | 'loot',
    entity: string,            // e.g. "ELF", "rogue", "Goblin", "1-5", "MASTERWORK"
    metric: string,            // human-readable: "PvE survival rate", "gold per encounter", "drop rate"
    value: number,             // the actual value
    expected: string,          // e.g. "40-70%", "<5% of total drops"
    severity: 'critical' | 'warning',
    message: string,           // e.g. "Elves have 92% PvE survival rate (expected 40-70%) across 45 encounters"
  }>,

  // === TOP LISTS (keep from current version) ===
  topMonsters: Array<{ name: string, count: number, playerWinRate: number }>,
  topRaces: Array<{ race: string, count: number, winRate: number }>,
  topClasses: Array<{ class: string, count: number, winRate: number }>,
}
```

### Alert Generation Rules (implement in backend)

Only generate alerts when sample size >= 10 encounters for the entity.

**Race/Class alerts:**
- CRITICAL: PvE survival rate < 25% or > 95%
- WARNING: PvE survival rate < 35% or > 85%

**Monster alerts:**
- CRITICAL: player survival rate < 15% (wall) or > 98% (trivial)
- WARNING: player survival rate < 25% or > 90%

**Level band alerts:**
- WARNING: avg gold per encounter in a band is >2x the overall avg gold per encounter
- WARNING: avg XP per encounter in a band is >2x the overall avg XP per encounter

**Loot alerts:**
- WARNING: MASTERWORK + LEGENDARY items exceed 5% of total item drops
- CRITICAL: LEGENDARY items exceed 2% of total item drops

### Implementation Notes
- ALL queries wrapped in Promise.all for performance
- Join Character table via characterId to get `level`, `race`, `class`
- Level band helper: `const getBand = (lvl: number) => lvl <= 5 ? '1-5' : lvl <= 10 ? '6-10' : lvl <= 15 ? '11-15' : '16-20'`
- For lootDropped parsing: `const items = loot.split(',').map(s => s.trim()).filter(Boolean)`
- For rarity lookup: investigate shared data files first. If no centralized item→rarity map exists, build one from the recipe/item definition files at startup (cache it).
- Keep the existing `/stats/by-race`, `/stats/by-class`, `/stats/by-monster` endpoints unchanged.

## Frontend: `client/src/components/admin/combat/OverviewTab.tsx`

### REPLACE the entire component. Layout top to bottom:

---

**TIER 1 — KPI Cards Row** (6 cards, responsive grid)

| Card | Value | Color Logic |
|------|-------|-------------|
| Total Encounters | number | neutral (white/gold) |
| PvE Survival Rate | percentage | green >70%, yellow 40-70%, red <40% |
| Avg Rounds | number (1 decimal) | green 4-8, yellow 2-4 or 8-12, red <2 or >12 |
| Gold / Day | number | neutral |
| Items Dropped / Day | number (1 decimal) | neutral |
| Active Level Range | band string | neutral |

Card styling: dark background (`realm-bg-dark`), subtle border, gold border on hover. Icon top-left, large value center, label below.

---

**TIER 2A — PvE Survival Rate by Level Band** (full width, most important chart)

Recharts **ComposedChart** with:
- Bar: encounters per band (subtle, background context)
- Line: survival rate % per band (gold/amber line, prominent)
- Reference area: green zone 40-70% (light green fill, low opacity)
- X-axis: band labels ("1-5", "6-10", etc.)
- Left Y-axis: survival rate (0-100%)
- Right Y-axis: encounter count
- Tooltip: band, encounters, wins, survival rate, avg rounds, avg HP remaining %

Title: "PvE Survival Rate by Level Band"
Subtitle text: "Green zone = healthy range (40-70%). Below = too hard. Above = too easy."

---

**TIER 2B — Two charts side-by-side**

LEFT: **Economy Injection Trend** (last 30 days)
- Recharts AreaChart, stacked
- Three areas: Gold (amber), XP (blue), Items Dropped (green)
- X-axis: dates
- Tooltip: date, gold, XP, items
- Title: "Economy Injection (Last 30 Days)"

RIGHT: **Loot by Rarity**
- Recharts BarChart (vertical bars)
- X-axis: rarity names
- Y-axis: count
- Bar colors per rarity:
  - POOR: `#9ca3af`
  - COMMON: `#e5e7eb`
  - FINE: `#22c55e`
  - SUPERIOR: `#3b82f6`
  - MASTERWORK: `#a855f7`
  - LEGENDARY: `#f59e0b`
  - UNKNOWN: `#6b7280`
- Title: "Loot Drops by Rarity"

---

**TIER 2C — Fight Pacing by Level Band** (full width, smaller chart)

Recharts BarChart:
- X-axis: level bands
- Y-axis: avg rounds
- Reference area: green zone 4-8 rounds (healthy pacing)
- Bar color: gold/amber
- Title: "Fight Pacing by Level Band"
- Subtitle: "Sweet spot = 4-8 rounds. Under 3 = stomps. Over 10 = tedious."

---

**TIER 2D — Top 5 Tables Row** (three tables side-by-side, keep from current version)

Same as current: Top Monsters, Top Races, Top Classes with clickable rows and color-coded win rates.

---

**TIER 3 — Balance Alerts** (only shown if alerts array is non-empty)

Section title: "⚠ Balance Alerts" with count badge

Each alert rendered as a card:
- Critical: red left border + red background tint
- Warning: yellow left border + yellow background tint
- Icon: alert triangle
- Content: the `message` field
- Badge showing `category` (race/class/monster/level_band/loot)

If no alerts: don't render this section at all.

---

### Styling Rules
- Use existing design tokens: `realm-bg-dark`, `realm-border`, `realm-gold`, `text-amber-200`
- Recharts for all charts (already in project)
- React Query: `useQuery({ queryKey: ['admin', 'combat', 'stats'], queryFn: ... })`
- Loading: skeleton cards + skeleton chart placeholders
- Error: styled error banner
- Empty state: if totalEncounters === 0, show a centered message "No combat data yet. Run a simulation or wait for player encounters."

## DO NOT

- Do not touch Codex, History, or Simulator tabs
- Do not touch the `/stats/by-race`, `/stats/by-class`, `/stats/by-monster` endpoints
- Do not add database migrations
- Do not create new shared type files — inline types are fine
- Do not over-engineer with Redux or global state

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "feat: combat overview v2 — executive dashboard with level bands, economy trends, loot rarity, balance alerts"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
