# Combat Dashboard — Live/Sim Toggle + History Tab Fix

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

Two related changes to the Combat Dashboard:

1. **Global Live/Sim toggle** — Add a data source toggle that filters ALL combat data across all tabs (Overview, History, Codex, Simulator). Simulation data and live player data serve different purposes and must never be mixed by default.
2. **History tab rewrite** — Switch from querying `CombatSession` to querying `CombatEncounterLog`. This fixes the "Unknown" names bug (CombatSession doesn't store names directly; CombatEncounterLog has `characterName` and `opponentName` fields). Also restructure the History tab to show more useful information.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Why This Matters

Simulation data pollutes live metrics. If 500 bot encounters drown out 5 real player encounters, every KPI on the Overview is meaningless. The admin needs to see live player behavior separately from simulation test results. The `simulationTick` field on CombatEncounterLog already distinguishes them.

## Data Model

### CombatEncounterLog (switch History to use this)
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
lootDropped (String — comma-separated or empty),
rounds (Json — round-by-round combat data),
summary (String),
triggerSource ('road_encounter'|'group_road_encounter'|'town_pve'|'pvp_duel'|'pvp_spar'|'arena'),
originTownId, destinationTownId,
simulationTick (Int? — null = live player, non-null = from simulation),
createdAt
```
FK: `characterId → Character` (has: race, class, level, name)

### CombatSession (old table — keep for Simulator tab only)
The existing History tab queries this table via `GET /history`. The entries show "Unknown" because CombatSession stores `attackerParams`/`defenderParams` as JSON blobs and the frontend doesn't extract names from them properly.

## Part 1: Global Live/Sim Toggle

### Backend: `server/src/routes/admin/combat.ts`

**Add `dataSource` query param to ALL endpoints that query CombatEncounterLog:**

Affected endpoints: `GET /stats`, `GET /stats/by-race`, `GET /stats/by-class`, `GET /stats/by-monster`, and the new `GET /history` endpoint (Part 2).

```typescript
// Add to query param validation for each endpoint
dataSource: z.enum(['live', 'sim', 'all']).optional().default('live'),
```

**Apply filter to all CombatEncounterLog queries:**
```typescript
const simFilter = dataSource === 'live'
  ? { simulationTick: null }           // null = live player data
  : dataSource === 'sim'
  ? { simulationTick: { not: null } }  // non-null = simulation data
  : {};                                 // 'all' = no filter

// Add to every where clause:
where: {
  ...simFilter,
  ...existingFilters,
}
```

**IMPORTANT:** The existing date range filter (`startDate`/`endDate`/`preset`) must continue to work alongside the sim filter. They combine with AND logic.

### Frontend: `client/src/components/admin/combat/` — parent page level

**Add the toggle to the Combat Dashboard page level** (above the tab navigation, so it persists across tabs).

The toggle lives in the parent page component that contains the tab navigation. Look at the current structure — it's likely `AdminCombatPage.tsx` or wherever the Overview/Codex/History/Simulator tabs are rendered.

**Toggle UI:**
- Three segmented buttons in a row: **Live** | **Simulation** | **All**
- Position: right side of the page header, same row as "Combat Dashboard" title
- Default: **Live** selected
- Active button: gold/amber fill with dark text
- Inactive buttons: outline/ghost style, matching existing admin aesthetics
- Small label below or beside: when "Live" is selected show "Player data only", when "Simulation" show "Bot simulation data", when "All" show "All data sources"

**State management:**
- Store `dataSource` in React state in the parent page component
- Pass it down to all tab components as a prop
- Each tab's React Query calls include `dataSource` in both the query key and the fetch URL params:
```typescript
useQuery({
  queryKey: ['admin', 'combat', 'stats', { dataSource, ...otherParams }],
  queryFn: () => fetch(`/api/admin/combat/stats?dataSource=${dataSource}&...`).then(r => r.json()),
})
```

**When toggle changes:** all tabs should refetch with the new filter. React Query handles this automatically via the query key change.

## Part 2: History Tab Rewrite

### Backend: `server/src/routes/admin/combat.ts`

**Rewrite `GET /history`** to query `CombatEncounterLog` instead of `CombatSession`.

```typescript
// Query params
const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  type: z.enum(['all', 'pve', 'pvp']).optional().default('all'),
  outcome: z.enum(['all', 'win', 'loss', 'flee', 'draw']).optional().default('all'),
  search: z.string().optional(),         // search by characterName or opponentName
  dataSource: z.enum(['live', 'sim', 'all']).optional().default('live'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['startedAt', 'totalRounds', 'xpAwarded', 'goldAwarded']).optional().default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
```

**Response shape:**
```typescript
{
  encounters: Array<{
    id: string,
    type: string,                    // 'pve' | 'pvp'
    characterName: string,
    opponentName: string,
    outcome: string,                 // 'win' | 'loss' | 'flee' | 'draw'
    totalRounds: number,
    characterStartHp: number,
    characterEndHp: number,
    opponentStartHp: number,
    opponentEndHp: number,
    characterWeapon: string,
    opponentWeapon: string,
    xpAwarded: number,
    goldAwarded: number,
    lootDropped: string,
    triggerSource: string,
    startedAt: string,               // ISO datetime
    endedAt: string,
    summary: string,
    simulationTick: number | null,
    // Character context (from join)
    character: {
      race: string,
      class: string | null,
      level: number,
    } | null,
  }>,
  total: number,
  page: number,
  totalPages: number,
}
```

**Implementation:**
```typescript
const where: any = { ...simFilter };
if (type !== 'all') where.type = type;
if (outcome !== 'all') where.outcome = outcome;
if (search) {
  where.OR = [
    { characterName: { contains: search, mode: 'insensitive' } },
    { opponentName: { contains: search, mode: 'insensitive' } },
  ];
}
if (startDate) where.startedAt = { ...where.startedAt, gte: new Date(startDate) };
if (endDate) where.startedAt = { ...where.startedAt, lte: new Date(endDate) };

const [encounters, total] = await Promise.all([
  prisma.combatEncounterLog.findMany({
    where,
    include: {
      character: { select: { race: true, class: true, level: true } },
    },
    orderBy: { [sortBy]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.combatEncounterLog.count({ where }),
]);
```

**Keep the old `GET /session/:id` endpoint** — it's used by the Simulator's replay component and reads from CombatSession. Don't remove it.

### Frontend: Replace `client/src/components/admin/combat/HistoryTab.tsx`

**Accept `dataSource` prop** from parent page component.

**Layout:**

**Top: Filter bar**
- Type filter: dropdown — "All Types", "PvE", "PvP"
- Outcome filter: dropdown — "All Outcomes", "Win", "Loss", "Flee", "Draw"
- Search input: "Search by name..." (searches characterName and opponentName)
- Date range: two date inputs (From / To) — styled same as Overview's custom date inputs
- Sort: dropdown — "Newest First", "Oldest First", "Most Rounds", "Most XP", "Most Gold"

Style the filter bar to match the Overview's date picker row (compact, dark bg, gold accents).

**Main: Encounter list (left panel, ~55% width)**

Each encounter card shows:
```
┌──────────────────────────────────────────────────┐
│ [PVE] [WIN]                           7 rounds   │
│ Thorin (Dwarf Warrior, Lv 5)                     │
│   vs Wolf                                        │
│ HP: 45/60 → 28/60    |    Feb 13, 2026 08:22 AM  │
│ XP: +20  Gold: +5  Loot: Animal Pelts            │
│ [SIM Tick 3]                    road_encounter    │
└──────────────────────────────────────────────────┘
```

Card details:
- **Type badge**: "PVE" (teal) or "PVP" (purple)
- **Outcome badge**: "WIN" (green), "LOSS" (red), "FLEE" (yellow), "DRAW" (gray)
- **Round count**: right-aligned
- **Character line**: `{characterName} ({race} {class}, Lv {level})` — if class is null, just show race
- **vs line**: `vs {opponentName}`
- **HP bar**: show `characterStartHp → characterEndHp` as a mini horizontal bar (green portion = remaining HP, red = lost HP). Show opponent HP the same way below it.
- **Rewards line**: XP, Gold, Loot (only show items that exist, skip empty fields)
- **Footer**: if `simulationTick` is non-null, show "[SIM Tick {n}]" badge in a distinct color (purple/blue). Show `triggerSource` right-aligned.
- **Date**: formatted as "Feb 13, 2026 08:22 AM"

Cards should be clickable — clicking expands inline or selects for detail panel.

**Detail panel (right panel, ~45% width)**

When an encounter is selected, show:
- Full summary text (from `summary` field)
- Round-by-round breakdown (from `rounds` JSON field) — if the JSON contains round data, render each round with actions taken. If the format is unclear, just display it as formatted JSON for now.
- HP timeline: small line chart showing character HP and opponent HP across rounds (if round data contains HP values)
- Weapon info: character weapon vs opponent weapon

If no encounter selected: show the existing "Select a combat session to view replay" placeholder.

**Pagination** (bottom of list panel):
- "Showing 1-25 of 519" text
- Page buttons: « 1 2 3 4 5 ... 21 »
- Same pagination pattern as current History tab

**Empty state**: "No encounters found matching your filters."

## Styling Rules

- Match existing admin panel dark theme (`realm-bg-dark`, gold accents, `text-amber-200`)
- HP bars: green for remaining HP, dark red for lost HP, thin horizontal bars
- Badges: small rounded pills with appropriate colors
- Use React Query for data fetching
- Loading state: skeleton cards in the list panel
- Error state: styled error banner

## DO NOT

- Do not touch the Codex or Simulator tabs
- Do not remove the old `GET /session/:id` endpoint (Simulator's CombatReplay component uses it)
- Do not add database migrations
- Do not modify the Overview tab — it already accepts `dataSource` from the parent once we wire it up
- Do not touch the existing CombatReplay component — the History detail panel is a simpler, dedicated view

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "feat: live/sim toggle + history tab rewrite with CombatEncounterLog"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
