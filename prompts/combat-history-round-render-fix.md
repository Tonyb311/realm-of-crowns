# Fix: Combat Log Round Entries Not Rendering

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead.
- Always end with a clear summary of what was delivered and what still needs the user's input.

## Task

**Bug fix:** The combat log in the History tab detail panel shows round headers correctly (e.g., "ROUND 1 — 3 actions") but the expanded content inside each round is completely empty. No turn entries, no roll breakdowns, nothing.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

## Diagnosis Steps (DO THESE FIRST)

Before writing any fix, investigate the actual data:

### Step 1: Check what the API returns
```bash
# Hit the history endpoint and inspect the rounds field structure
curl -s "http://localhost:3000/api/admin/combat/history?dataSource=sim&limit=1" | jq '.encounters[0].rounds' | head -100
```
If `rounds` is null or missing, check the Prisma query in `server/src/routes/admin/combat.ts` — the `rounds` field may not be included in the select.

### Step 2: Check the actual database content
```bash
# Query the raw rounds JSON from the database
npx prisma db execute --stdin <<< "SELECT id, LEFT(rounds::text, 500) as rounds_preview FROM \"CombatEncounterLog\" LIMIT 1;"
```
Or use the Prisma client to query it directly.

### Step 3: Compare the DB structure to what the frontend parser expects

The frontend combat log component (in `client/src/components/admin/combat/HistoryTab.tsx`) expects the rounds to be an array of `TurnLogEntry`:
```typescript
interface TurnLogEntry {
  round: number;
  actorId: string;
  action: string; // 'attack' | 'cast' | 'defend' | 'item' | 'flee' | 'racial_ability' | 'psion_ability' | 'class_ability'
  result: TurnResult; // the union type with attackRoll, damageRoll, etc.
  statusTicks: StatusTickResult[];
}
```

The DB `rounds` field is a Prisma `Json` type. The actual stored structure might be:
- A flat array of TurnLogEntry objects: `[{round: 1, actorId: '...', ...}, ...]`
- Wrapped in an object: `{log: [...]}` or `{rounds: [...]}` or `{_combatants: {...}, log: [...]}`
- A stringified JSON that needs double-parsing
- Something else entirely

**The key question:** Does the actual JSON structure match what the frontend is trying to iterate over?

### Step 4: Check the frontend rendering logic

Look at how HistoryTab.tsx processes the rounds:
- How does it group entries by round number?
- What does it pass to the individual turn renderers?
- Is there a conditional that's evaluating to false and hiding content?
- Are the turn renderer functions receiving the right shape of data?

Add `console.log` statements temporarily to trace the data flow:
```typescript
console.log('Raw rounds:', encounter.rounds);
console.log('Parsed rounds:', parsedRounds);
console.log('Grouped by round:', groupedRounds);
```

## Common Failure Modes

1. **`rounds` not included in API response** — Prisma select/include doesn't fetch the field
2. **Double-stringified JSON** — DB stores string, API serializes it again, frontend gets `"\"[{...}]\""` instead of `[{...}]`
3. **Wrapped structure** — DB stores `{log: [...], combatants: [...]}` but frontend expects a flat array
4. **actorId mismatch** — name map built from `characterId`/`opponentId` doesn't match the IDs in the rounds data (e.g., rounds use UUID but name map uses a different format)
5. **Conditional rendering bug** — Turn renderer checks for a field that doesn't exist in the data and returns null
6. **Type checking too strict** — `result.type === 'attack'` fails because the actual value is `'Attack'` or something unexpected

## Fix Requirements

Once you've identified the root cause:

1. Fix the data flow so turn entries render inside each round
2. **Every attack must show:** the d20 roll, each modifier with its source name and value, the total vs AC, hit/miss result
3. **Every hit must show:** damage dice results, each damage modifier with source, total damage and type, HP before → after
4. **Crits:** highlighted in gold
5. **Kills:** skull emoji, red text
6. **Status ticks:** shown after each turn with effect name, damage/healing, HP after
7. If the rounds JSON structure doesn't match the expected format, add a normalizer function that transforms whatever the DB gives us into the expected `TurnLogEntry[]` format
8. Add a fallback: if a turn entry can't be parsed, render it as formatted JSON with a "Parse error" label rather than silently hiding it. This prevents future invisible failures.

## Testing

After the fix:
1. Navigate to Combat Dashboard → switch to Simulation → History tab
2. Click the Thalindra Windrunner vs Wolf encounter (4 rounds)
3. Expand Round 1 — should see attack roll breakdowns with d20 + modifiers
4. Also check the Finnian Hawthorne vs Goblin encounter (11 rounds) — more data to verify
5. Verify the HP Timeline chart still works above the combat log

## DO NOT

- Do not modify the Overview tab
- Do not restructure the History tab layout — only fix the combat log rendering
- Do not change the API response shape unless `rounds` is genuinely missing from the response
- Do not remove the round header counting logic (it's working correctly)

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "fix: combat log round entries not rendering in history detail"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
