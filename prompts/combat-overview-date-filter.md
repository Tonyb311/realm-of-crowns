# Combat Overview — Date Range Filter + Comparison Deltas + Engagement Metrics

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead.
- Always end with a clear summary of what was delivered and what still needs the user's input.

## Task

Add date range filtering, comparison deltas, and player engagement metrics to the Combat Dashboard Overview tab. This transforms the dashboard from "here's what happened" to "here's what changed and whether it's healthy."

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Why This Matters

Without date filtering, the admin can't measure the impact of balance patches, new monster additions, or economy changes. Every KPI needs context: "50% survival rate" means nothing without "...compared to 65% last week." The comparison deltas make every number immediately actionable.

## Data Model Reminder

### CombatEncounterLog (primary data source)
```
id, type ('pve'|'pvp'), sessionId,
characterId, characterName,
opponentId, opponentName,
startedAt (DateTime), endedAt (DateTime),
outcome ('win'|'loss'|'flee'|'draw'),
totalRounds,
characterStartHp, characterEndHp,
xpAwarded, goldAwarded,
lootDropped (String — comma-separated item names),
triggerSource, simulationTick
```
FK: `characterId → Character` (has: race, class, level)

## Backend Changes: `server/src/routes/admin/combat.ts`

### Modify `GET /stats` to accept query params:

```typescript
// Query params (all optional — default to last 30 days)
const statsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),   // ISO date string
  endDate: z.string().datetime().optional(),     // ISO date string
  preset: z.enum(['7d', '30d', '90d', 'all']).optional(),  // shortcut presets
});
```

**Date resolution logic:**
1. If `preset` is provided, calculate startDate/endDate from it (relative to now)
2. If `startDate`/`endDate` are provided, use them directly
3. If nothing provided, default to last 30 days
4. `'all'` preset = no date filter

**Apply date filter** to the `WHERE` clause of all CombatEncounterLog queries:
```typescript
where: {
  startedAt: {
    gte: startDate,   // omit if 'all'
    lte: endDate,     // omit if 'all'
  }
}
```

### Add comparison period data to response

For every date range, compute a "previous period" of equal length. If viewing March 1-7, the comparison period is Feb 22-28. If viewing "all", no comparison.

**Add to the response root:**
```typescript
{
  // ... existing fields ...

  // Date context
  dateRange: {
    start: string,     // ISO date of effective start
    end: string,       // ISO date of effective end
    preset: string | null,
    comparisonStart: string | null,  // null if preset='all'
    comparisonEnd: string | null,
  },

  // Comparison deltas (null if preset='all' or no previous data)
  deltas: {
    totalEncounters: number | null,        // e.g. +15 or -3
    pveSurvivalRate: number | null,        // e.g. +5.2 (percentage points)
    fleeAttemptRate: number | null,        // e.g. -2.1
    avgRounds: number | null,             // e.g. -0.5
    goldPerDay: number | null,            // e.g. +12
    itemsDroppedPerDay: number | null,    // e.g. +0.3
  } | null,

  // NEW: Player engagement metrics
  engagement: {
    uniquePlayers: number,                   // distinct characterIds in period
    encountersPerPlayer: number,             // totalEncounters / uniquePlayers
    repeatCombatants: number,                // players with >1 encounter in period
    repeatRate: number,                      // repeatCombatants / uniquePlayers * 100
    newPlayerSurvivalRate: number,           // survival rate for characters level 1-3 only (PvE)
    newPlayerEncounters: number,             // count of level 1-3 PvE encounters (sample size context)
  },
}
```

### Implementation notes for comparison deltas:

```typescript
// Calculate comparison period
const periodMs = endDate.getTime() - startDate.getTime();
const compStart = new Date(startDate.getTime() - periodMs);
const compEnd = new Date(startDate.getTime() - 1); // day before current period

// Run a SECOND set of queries for the comparison period (same metrics, different date range)
// Only compute: totalEncounters, pveSurvivalRate, fleeAttemptRate, avgRounds, goldPerDay, itemsDroppedPerDay
// Keep it lightweight — don't compute full charts/alerts for comparison period

// Delta = current - previous (positive = increase, negative = decrease)
```

Wrap comparison queries in their own Promise.all, parallel with the main queries.

### Implementation notes for engagement metrics:

```typescript
// uniquePlayers: SELECT COUNT(DISTINCT characterId) WHERE startedAt in range
// encountersPerPlayer: totalEncounters / uniquePlayers
// repeatCombatants: count characterIds that appear more than once
//   - GROUP BY characterId, HAVING COUNT(*) > 1, then count the groups
// repeatRate: repeatCombatants / uniquePlayers * 100
// newPlayerSurvivalRate: WHERE character.level <= 3 AND type = 'pve', count wins / total * 100
// newPlayerEncounters: count of above
```

For uniquePlayers and repeatCombatants, use the already-fetched allEncounters array — don't add more DB queries. Compute in JS:
```typescript
const playerCounts = new Map<string, number>();
for (const enc of filteredEncounters) {
  playerCounts.set(enc.characterId, (playerCounts.get(enc.characterId) ?? 0) + 1);
}
const uniquePlayers = playerCounts.size;
const repeatCombatants = [...playerCounts.values()].filter(c => c > 1).length;
```

## Frontend Changes: `client/src/components/admin/combat/OverviewTab.tsx`

### Add Date Range Picker (top of page, below tab nav, above KPI cards)

**Layout:** Single row, left-aligned, with:

LEFT side:
- **Preset buttons** — row of 4 buttons: "7 Days", "30 Days", "90 Days", "All Time"
  - Active button gets gold/amber highlight, others are subtle outline
  - Default: "30 Days" active

RIGHT side:
- **Custom date inputs** — two date inputs: "From" and "To"
  - When custom dates are entered, deselect all preset buttons
  - When a preset is clicked, clear custom dates
  - Style: dark inputs matching `realm-bg-dark`, gold border on focus

**Behavior:**
- Selecting any preset or entering custom dates triggers a React Query refetch with new params
- Use query key: `['admin', 'combat', 'stats', { startDate, endDate, preset }]`
- Show a subtle loading indicator on the KPI cards while refetching (opacity reduction or skeleton)
- URL state is NOT required — local component state is fine

**Styling:**
- Container: `flex items-center justify-between` with subtle bottom border
- Preset buttons: small, compact, pill-shaped
- Matches existing admin panel aesthetic (dark bg, gold accents)

### Modify KPI Cards to show deltas

Each KPI card that has a delta value gets a small delta indicator below the main value:

```
  ⚔ 2
  TOTAL ENCOUNTERS
  ▲ +5 vs prev     ← this is new
```

**Delta styling:**
- Positive increase: `▲` green text (for metrics where up = good, like encounters)
- Negative decrease: `▼` red text
- **Context-aware coloring** — not all increases are good:
  - Total Encounters: up = green, down = red (more activity is good)
  - PvE Survival Rate: up = green, down = red (higher survival is healthier, within reason)
  - Flee Rate: up = RED, down = GREEN (increasing flee is bad)
  - Avg Rounds: show delta as neutral (amber) — neither direction is inherently good
  - Gold/Day: up = amber/neutral (could indicate inflation), down = amber/neutral
  - Items/Day: up = amber/neutral, down = amber/neutral
- If delta is 0 or null: show "—" in gray
- If comparison period has no data: show "No prior data" in gray, small text

**Delta format:**
- Numbers: `+5` or `-3` (whole numbers for counts)
- Percentages: `+5.2pp` or `-1.3pp` (percentage points, 1 decimal)
- Rates: `+0.3` or `-0.1` (1 decimal)

### Add Player Engagement Section (new row after KPI cards, before the survival chart)

**Title:** "Player Engagement"

**Layout:** 4 metric cards in a row, same card style as KPI cards but slightly smaller:

| Card | Value | Subtext | Color Logic |
|------|-------|---------|-------------|
| Unique Players | number | "fought in this period" | neutral |
| Encounters / Player | number (1 decimal) | "avg per player" | green >3, yellow 1-3, red <1 |
| Repeat Rate | percentage | "{repeatCombatants} of {uniquePlayers} fought again" | green >50%, yellow 25-50%, red <25% |
| New Player Survival | percentage | "Level 1-3 PvE ({newPlayerEncounters} fights)" | green >60%, yellow 35-60%, red <35% |

**Why these matter to an indie game designer:**
- **Unique Players** = combat reach (is combat a core loop or niche?)
- **Encounters/Player** = grind depth (are players doing 1 fight or 20?)
- **Repeat Rate** = combat stickiness (do players come back for more?)
- **New Player Survival** = onboarding health (the #1 retention risk — if new players die repeatedly, they quit)

### Empty states

- If the selected date range returns 0 encounters: show centered message "No combat data in this period. Try a wider date range."
- If comparison period returns 0 encounters: show deltas as "No prior data" instead of numbers

## DO NOT

- Do not touch Codex, History, or Simulator tabs
- Do not touch `/stats/by-race`, `/stats/by-class`, `/stats/by-monster` endpoints
- Do not add database migrations
- Do not change the existing chart sections (survival by level, economy trend, loot rarity, fight pacing, top 5 tables, balance alerts) — they should just respond to the date filter
- Do not over-engineer with URL state management or Redux

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "feat: date range filter + comparison deltas + player engagement metrics"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
