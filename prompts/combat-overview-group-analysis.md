# Combat Overview — Solo vs Group Analysis

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

Add solo vs group combat analysis to the Combat Dashboard Overview tab. Groups can have up to 5 members. The data already exists in CombatEncounterLog (`partyId` field — null = solo, non-null = grouped; `triggerSource` includes `'group_road_encounter'`).

This matters because **right now groups fight the same monsters as solo players**, meaning grouping is a free survival boost. The dashboard should quantify this gap so the admin can see the magnitude of the imbalance and eventually verify that encounter scaling (a planned future feature) is working correctly.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Data Model

### CombatEncounterLog fields relevant to groups:
```
partyId (String? — null = solo, non-null = in a group)
triggerSource ('road_encounter' = solo travel, 'group_road_encounter' = group travel, etc.)
characterId → Character (has: level)
outcome ('win'|'loss'|'flee'|'draw')
totalRounds
characterStartHp, characterEndHp
xpAwarded, goldAwarded
lootDropped
startedAt
```

### How to determine group size:
Group size = count of distinct `characterId` values that share the same `partyId` AND `sessionId` (or similar startedAt timestamp within the same encounter). The simplest approach: for encounters with the same non-null `partyId`, count how many CombatEncounterLog rows share that `partyId` AND have startedAt within a few seconds of each other. Or if `sessionId` is populated for group fights, group by that.

**IMPORTANT:** Investigate the actual data before implementing. Check a few group encounters to understand the relationship. Each group member may get their own CombatEncounterLog row for the same fight, OR there may be one row per encounter. This determines how you count group size. Read the combat engine code if needed: look at how `group_road_encounter` creates CombatEncounterLog entries.

## Backend Changes: `server/src/routes/admin/combat.ts`

### Add to `GET /stats` response:

```typescript
{
  // ... existing fields ...

  // NEW: Solo vs Group analysis
  groupAnalysis: {
    // Overview split
    soloEncounters: number,
    groupEncounters: number,
    groupRate: number,            // groupEncounters / total * 100

    // Solo metrics (PvE only, type='pve' AND partyId IS NULL)
    solo: {
      survivalRate: number,
      avgRounds: number,
      avgHpRemainingPct: number,  // avg (characterEndHp / characterStartHp * 100) for wins
      avgGoldPerEncounter: number,
      avgXpPerEncounter: number,
      fleeRate: number,
    },

    // Group metrics (PvE only, type='pve' AND partyId IS NOT NULL)
    group: {
      survivalRate: number,
      avgRounds: number,
      avgHpRemainingPct: number,
      avgGoldPerEncounter: number,
      avgXpPerEncounter: number,
      fleeRate: number,
    },

    // Survival gap = group.survivalRate - solo.survivalRate
    // Positive = groups survive more (expected, but how much?)
    survivalGap: number,

    // Group size distribution (how many encounters per group size)
    // Only if you can determine group size from the data
    sizeDistribution: Array<{
      size: number,             // 2, 3, 4, 5
      encounters: number,
      survivalRate: number,
    }>,
  },
}
```

### Implementation notes:

```typescript
// Split encounters into solo and group
const soloEncounters = pveEncounters.filter(e => !e.partyId);
const groupEncounters = pveEncounters.filter(e => !!e.partyId);

// Compute metrics for each set using the same logic as existing survival/rounds/HP calculations
// This is pure JS computation on the already-fetched allEncounters array — no new DB queries needed

// For group size distribution:
// Group encounters by partyId, count distinct characterIds per partyId
// This requires the encounters to already be in memory
// If each group member gets their own row: groupBy partyId, count unique characterIds
// If one row per encounter: the group size info might be in rounds JSON or needs investigation
```

### Add to alerts generation:

```typescript
// Group balance alert
// WARNING: if survival gap > 30 percentage points (with >=10 encounters in each category)
// Message: "Group survival rate ({group.survivalRate}%) exceeds solo ({solo.survivalRate}%) by {survivalGap}pp — grouping may trivialize combat"
// CRITICAL: if survival gap > 50 percentage points
```

Apply the existing date range filter to group analysis data (use the same startDate/endDate filtering).

## Frontend Changes: `client/src/components/admin/combat/OverviewTab.tsx`

### Add to Engagement row — 1 more card (5 total now):

Insert as last card in the engagement row:

| Card | Value | Subtext | Color Logic |
|------|-------|---------|-------------|
| Group Rate | percentage | "{groupEncounters} of {total} in groups" | neutral (just informational) |

### Add new section: "Solo vs Group" (between PvE Survival by Level Band chart and Economy Injection)

**Section title:** "Solo vs Group Combat"

**Layout:** A comparison block with the following structure:

**Top: Two side-by-side stat columns**

```
┌─────────────────────────┐  ┌─────────────────────────┐
│      ⚔ SOLO             │  │      👥 GROUP            │
│                         │  │                         │
│  Survival Rate    45%   │  │  Survival Rate    92%   │
│  Avg Rounds       7.2   │  │  Avg Rounds       3.1   │
│  Avg HP Left      31%   │  │  Avg HP Left      78%   │
│  Flee Rate        12%   │  │  Flee Rate        2%    │
│  Gold/Fight       8     │  │  Gold/Fight       8     │
│  XP/Fight         20    │  │  XP/Fight         20    │
│                         │  │                         │
│  (234 encounters)       │  │  (89 encounters)        │
└─────────────────────────┘  └─────────────────────────┘
```

**Styling for the comparison:**
- Each column is a card with dark background
- Solo card: subtle blue-gray left border
- Group card: subtle amber/gold left border
- Metrics that differ significantly (>15pp or >50% relative difference) between solo and group get highlighted:
  - If group is significantly BETTER: the group value gets a amber/warning color (grouping is too easy)
  - If group is significantly WORSE: the group value gets green (scaling is working / group content is harder)
- Between the two cards, show the survival gap prominently:
  - "Gap: +47pp" in large text
  - Color: red if >30pp (imbalanced), yellow if 15-30pp (monitor), green if <15pp (healthy)

**Bottom: Group Size Distribution** (small horizontal bar chart, only shown if sizeDistribution has data)

- Recharts BarChart, compact height (~120px)
- X-axis: group sizes (2, 3, 4, 5)
- Y-axis: encounter count
- Each bar labeled with survival rate on top (e.g. "87%")
- Bar color: gold/amber
- Title: "Encounters by Group Size"

**Empty state:** If groupEncounters === 0, show: "No group combat data in this period." and hide the comparison block entirely. Still show the Group Rate card in the engagement row as "0%".

## DO NOT

- Do not touch Codex, History, or Simulator tabs
- Do not touch `/stats/by-race`, `/stats/by-class`, `/stats/by-monster` endpoints
- Do not add database migrations
- Do not modify the existing sections (KPIs, survival chart, economy, loot, pacing, top 5, alerts) — only add the new engagement card and the new solo vs group section
- Do not change how date filtering works — just make sure group analysis respects the existing date range

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "feat: solo vs group combat analysis on overview dashboard"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
