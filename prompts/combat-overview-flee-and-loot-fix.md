# Combat Overview — Flee Tracking + Loot Chart Fix

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

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Always end with a clear summary of what was delivered and what still needs the user's input.

## Task

Two changes to the Combat Dashboard Overview tab:

1. **Add flee tracking** — flee data is a behavioral signal that win/loss alone misses. High flee rates against a monster = players recognize it's overtuned. Low flee success = players feel trapped in unwinnable fights.
2. **Fix Loot by Rarity chart styling** — the chart currently has a light/white background that clashes with the dark theme. The COMMON bar (white/gray) is nearly invisible.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Change 1: Flee Tracking

### Backend: `server/src/routes/admin/combat.ts` — modify `GET /stats`

**Add to KPI response:**
```typescript
fleeAttemptRate: number,  // % of ALL encounters where outcome = 'flee'
```

**Add to `survivalByLevel` array items:**
```typescript
// existing fields stay, ADD these:
flees: number,            // count of encounters where outcome = 'flee' in this band
fleeRate: number,         // flees / encounters * 100
```

**Add to `alerts` generation logic:**
```
- WARNING: if flee rate in any level band > 30% (with >=10 encounters), message: "{band} level band has {fleeRate}% flee rate — players are avoiding combat here"
- CRITICAL: if flee rate in any level band > 50% (with >=10 encounters)
```

### Frontend: `client/src/components/admin/combat/OverviewTab.tsx`

**KPI cards — add 1 more card (7 total now):**

Insert after "PvE Survival Rate" card:

| Card | Value | Color Logic |
|------|-------|-------------|
| Flee Rate | percentage | green <10%, yellow 10-30%, red >30% |

**PvE Survival Rate by Level Band chart — add flee data:**

Add a second line to the ComposedChart:
- Existing gold/amber line = survival rate (keep)
- New red dashed line = flee rate per band
- Update tooltip to include: flees count, flee rate %
- Update legend to show both lines

## Change 2: Loot by Rarity Chart Fix

### Frontend only — in `OverviewTab.tsx`

The "Loot Drops by Rarity" BarChart currently has a light/white background. Fix:

- Set the chart container/card background to match the rest of the dashboard (`realm-bg-dark` or equivalent dark color)
- The COMMON bar color is `#e5e7eb` (very light gray) which is invisible on light backgrounds. Since we're fixing the background to dark, the COMMON color should be fine — but verify it's visible. If not, change COMMON to `#d1d5db` or a slightly brighter white.
- Ensure the chart's cartesian grid, axis labels, and tick marks use light colors (`#9ca3af` or similar) consistent with other charts on the page
- Match the styling pattern of the other Recharts charts on this page (Economy Injection, Fight Pacing) — they already have correct dark backgrounds

## DO NOT

- Do not restructure the overall layout — only add the flee KPI card, update the survival chart, fix loot chart styling
- Do not touch Codex, History, or Simulator tabs
- Do not touch `/stats/by-race`, `/stats/by-class`, `/stats/by-monster` endpoints
- Do not add database migrations

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "feat: add flee tracking + fix loot rarity chart styling"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
