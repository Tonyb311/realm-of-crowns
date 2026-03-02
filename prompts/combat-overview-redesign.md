# Combat Overview Tab Redesign — Backend + Frontend

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

Redesign the admin Combat Dashboard **Overview** tab to show meaningful, actionable statistics with drill-down capability. The current Overview is vanity metrics from the wrong table (`CombatSession`). The real data lives in `CombatEncounterLog`.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Critical Context: Data Model

### CombatEncounterLog (THE data source — use this)
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
xpAwarded, goldAwarded, lootDropped,
rounds (Json), summary,
triggerSource ('road_encounter'|'group_road_encounter'|'town_pve'|'pvp_duel'|'pvp_spar'|'arena'),
originTownId, destinationTownId, simulationTick
```

FK: `characterId → Character` (has: race, class, specialization, level, stats)

### CombatSession (keep for Simulator/History linking, NOT for stats)
```
id, type, status, locationTownId, startedAt, endedAt, log, attackerParams, defenderParams
```

## What to Build

### Part 1: Backend — New Stats Endpoints

**Replace** the existing `GET /stats` endpoint in `server/src/routes/admin/combat.ts` (lines 282-360). Add new endpoints alongside it.

#### `GET /stats` (rewrite)
Query `CombatEncounterLog` joined with `Character` for race/class. Return:

```typescript
{
  // KPI cards
  totalEncounters: number,
  uniqueCombatants: number,
  winRate: number,           // % of encounters where outcome = 'win'
  avgRounds: number,         // average totalRounds
  avgHpRemaining: number,    // average characterEndHp / characterStartHp * 100
  totalXpAwarded: number,
  totalGoldAwarded: number,
  
  // Trend: encounters per day (last 30 days)
  encountersPerDay: Array<{ date: string, count: number, wins: number, losses: number }>,
  
  // Breakdowns for overview charts
  byOutcome: Array<{ outcome: string, count: number }>,
  byTriggerSource: Array<{ source: string, count: number }>,
  byType: Array<{ type: string, count: number }>,
  
  // Top lists (limit 5 each, ordered by count desc)
  topMonsters: Array<{ name: string, count: number, playerWinRate: number }>,
  topRaces: Array<{ race: string, count: number, winRate: number }>,
  topClasses: Array<{ class: string, count: number, winRate: number }>,
  
  // Balance alerts — flag anything outside 35-85% win rate with >10 encounters
  balanceAlerts: Array<{ entity: string, entityType: 'race'|'class'|'monster', winRate: number, encounters: number, severity: 'warning'|'critical' }>
}
```

Implementation notes:
- Use `prisma.combatEncounterLog` as primary source
- Join Character via `characterId` to get `race`, `class`  
- For topMonsters, group by `opponentName` where `type = 'pve'`
- For topRaces, join Character and group by `character.race`
- For topClasses, join Character and group by `character.class` (filter out null)
- Balance alerts: critical if <25% or >95% win rate, warning if <35% or >85%
- ALL queries should be wrapped in Promise.all for performance

#### `GET /stats/by-race` (new endpoint)
```typescript
{
  races: Array<{
    race: string,
    encounters: number,
    wins: number,
    losses: number,
    flees: number,
    winRate: number,
    avgRounds: number,
    avgHpRemaining: number,
    avgXpPerEncounter: number,
    topWeapons: Array<{ weapon: string, count: number }>,  // top 3
    topMonsters: Array<{ monster: string, count: number, winRate: number }>,  // top 3
  }>
}
```

#### `GET /stats/by-class` (new endpoint)
Same structure as by-race but grouped by `character.class`. Skip null classes.

#### `GET /stats/by-monster` (new endpoint)  
```typescript
{
  monsters: Array<{
    name: string,
    encounters: number,
    playerWinRate: number,
    avgRounds: number,
    avgPlayerHpRemaining: number,
    levelRange: { min: number, max: number },  // from character levels who fought it
    topRacesAgainst: Array<{ race: string, count: number, winRate: number }>,  // top 3
  }>
}
```

### Part 2: Frontend — Redesigned OverviewTab

**Replace** `client/src/components/admin/combat/OverviewTab.tsx` entirely.

#### Layout (top to bottom):

**Row 1: KPI Cards** (7 cards in a grid)
- Total Encounters (number + trend arrow comparing to previous 30 days)
- Unique Combatants
- Win Rate (% with color: green >60%, yellow 40-60%, red <40%)
- Avg Rounds per Fight
- Avg HP Remaining (%)
- Total XP Awarded
- Total Gold Awarded

Use the existing `realm-stat-card` or similar pattern from the admin panel. Each card: dark bg (`realm-bg-dark`), gold border on hover, icon top-left, value large center, label small below.

**Row 2: Encounters Per Day chart** (full width)
- Recharts AreaChart with stacked areas for wins (green), losses (red), flees (yellow)
- 30-day x-axis
- Tooltip showing date, total, wins, losses, flees

**Row 3: Two charts side-by-side**
- Left: **By Trigger Source** — Recharts PieChart (road_encounter, town_pve, pvp_duel, etc.) with custom golden color palette
- Right: **By Outcome** — Recharts PieChart (win, loss, flee, draw)

**Row 4: Three "Top 5" tables side-by-side**
- **Top Monsters**: name, encounters, player win rate (color-coded)
- **Top Races**: race name, encounters, win rate
- **Top Classes**: class name, encounters, win rate

Each table row should be clickable (for future drill-down — just add `cursor-pointer` and `onClick` that does nothing yet, we'll wire it in Prompt 2).

**Row 5: Balance Alerts** (only shown if alerts exist)
- Red/yellow banner cards listing entities with extreme win rates
- Icon: warning triangle
- Text: "{entity} ({entityType}) — {winRate}% win rate across {encounters} encounters"
- Critical = red border, Warning = yellow border

#### Styling Rules
- Use existing design tokens: `realm-bg-dark`, `realm-border`, `realm-gold`, `text-amber-200`, etc.
- Use Recharts (already imported in project) for all charts
- Use React Query `useQuery` with key `['admin', 'combat', 'stats']`
- Loading state: skeleton cards matching layout
- Error state: styled error banner

## Existing Code Reference

The current file to replace: `client/src/components/admin/combat/OverviewTab.tsx`
The current backend endpoint to rewrite: `server/src/routes/admin/combat.ts` lines 282-360 (the `/stats` route)

The current frontend uses:
- React Query for data fetching
- Recharts for charts  
- Tailwind + custom `realm-*` design tokens
- The pattern: `useQuery({ queryKey: [...], queryFn: () => fetch(...).then(r => r.json()) })`

## DO NOT

- Do not touch Codex, History, or Simulator tabs
- Do not add database migrations — CombatEncounterLog already exists and is populated
- Do not create new shared types files — define response types inline or in the route file
- Do not over-engineer with Redux or global state — React Query handles caching

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "feat: redesign combat overview with CombatEncounterLog stats"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
4. No database migration or seed needed — CombatEncounterLog is already populated.
