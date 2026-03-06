# Prompt: Socket & Real-Time UX Polish (Phase 5 — Game Client Modernization)

```
cat CLAUDE.md
cat .claude/agents/web-design.md
```

You are the Team Lead for a browser-based roleplay game project.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

---

## Context

The frontend integrity audit (`docs/frontend-audit-report.md`) identified 17 server socket events with no client listeners — these represent features the server already supports but players never see in real-time. This prompt wires them up.

Phase 1 already fixed the critical socket payload mismatches. This phase adds the missing client-side listeners and UI feedback.

---

## Pre-Work

```bash
cat docs/frontend-audit-report.md
```

Read the "Socket Event Alignment" sections — specifically:
- "Orphaned Emitters (server emits, nobody listens)" — 17 events
- Any remaining "Orphaned Listeners" after Phase 1 fixes

Then examine the existing socket infrastructure:
```bash
find client/src -name "*.ts" -o -name "*.tsx" | xargs grep "socket\.\|useSocket\|Socket" | head -40
ls client/src/hooks/use*Events*
ls client/src/hooks/use*Socket*
ls client/src/services/socket*
```

Understand:
1. How does the client connect to the socket server?
2. What hooks exist for socket event handling?
3. How are toast notifications currently displayed?
4. What's the pattern for adding a new socket listener?

Write findings to `docs/audit-socket-integration.md`.

---

## Part 1: Travel Events (High Priority)

Server emits these but nobody listens:
- `travel:tick-processed` — travel state changed after a tick
- `travel:group-update` — party composition changed during travel
- `travel:player-entered` — another player entered your travel node
- `travel:player-left` — another player left your travel node

**Create or update** `client/src/hooks/useTravelEvents.ts`:
- Listen for each event
- For `travel:tick-processed`: invalidate travel-related React Query caches so the UI auto-refreshes
- For `travel:group-update`: invalidate party/group queries
- For `travel:player-entered` / `travel:player-left`: show a subtle toast ("PlayerName arrived at your node" / "PlayerName left") and invalidate node occupant queries

**Wire the hook** into TravelPage.tsx (or wherever travel state is managed).

---

## Part 2: Item Durability Events (Medium Priority)

Server emits:
- `item:lowDurability` — equipment durability below threshold
- `item:broken` — equipment durability hit zero

**Create** `client/src/hooks/useItemEvents.ts`:
- `item:lowDurability` → warning toast with item name ("Your Iron Sword is wearing out")
- `item:broken` → danger toast with item name ("Your Iron Sword broke!")
- Invalidate inventory/equipment queries so UI reflects the change

**Wire** into the game layout (GameLayout or wherever persistent hooks live) so these fire regardless of which page the player is on.

---

## Part 3: Building Events (Medium Priority)

Server emits:
- `building:taxDue` — property tax is due
- `building:delinquent` — overdue tax warning
- `building:seized` — building seized for non-payment
- `building:damaged` — building took damage
- `building:conditionLow` — building needs repair

**Create** `client/src/hooks/useBuildingEvents.ts`:
- Each event → appropriate toast (warning for tax, danger for seizure, info for condition)
- Invalidate building/housing queries

**Wire** into GameLayout.

---

## Part 4: Social Events (Lower Priority)

Server emits:
- `friend:request` — someone sent a friend request
- `friend:accepted` — someone accepted your friend request
- `action:cancelled` — an action was cancelled
- `system:broadcast` — admin broadcast message
- `chat:error` — chat-related error

**Create or update** `client/src/hooks/useSocialEvents.ts`:
- `friend:request` → info toast + invalidate friend list
- `friend:accepted` → success toast + invalidate friend list
- `action:cancelled` → warning toast
- `system:broadcast` → prominent system message (not just a toast — maybe a modal or banner)
- `chat:error` → error toast

**Wire** into GameLayout.

---

## Part 5: DailyDashboard tick:processing

The DailyDashboard listens for `tick:processing` but the server never emits it. Two options:

**Option A (preferred):** Remove the dead listener from DailyDashboard. If there's a "processing" spinner state tied to this event, remove it — the tick happens server-side during the daily cron, not in response to a player action.

**Option B:** If a "tick is running" indicator is genuinely useful, add the emit to the server's tick processor: emit `tick:processing` at the start of the tick, `tick:complete` at the end. Only do this if the server already has a `tick:complete` emit.

Check what the server actually does and pick the appropriate option.

---

## Part 6: Toast System Check

Before wiring all these events, verify the toast notification system:
- What library is used? (react-hot-toast, react-toastify, custom?)
- Does it support different types (success, error, warning, info)?
- Is there a shared `useToast` or similar hook?
- Can it display multiple toasts without overlapping?

If the toast system is missing or insufficient, set one up first. react-hot-toast is lightweight and simple. Add it with:
```bash
pnpm add react-hot-toast
```

Add `<Toaster />` to the root layout.

---

## Verify

```bash
pnpm run build 2>&1 | tail -20
```

Must compile with 0 errors.

Check that no new socket listeners accidentally duplicate existing ones. Search for event name strings to confirm each event is only listened to in one place.

---

## Commit, push, and deploy

```bash
git add -A
git commit -m "feat: wire 17 orphaned socket events — travel, durability, building, social real-time feedback"
git push
```

Then trigger the deploy:

```bash
gh workflow run deploy.yml --ref main
echo "Deploy triggered. Monitor at: https://github.com/Tonyb311/realm-of-crowns/actions"
```

Wait 30 seconds, then check the workflow status:
```bash
gh run list --workflow=deploy.yml --limit=1
```

---

## Do NOT:
- Modify server-side socket emit logic (except tick:processing if Option B)
- Change any game mechanics
- Redesign the toast/notification UI — just wire events to the existing system
- Add socket events that don't already exist on the server

## DO:
- Audit the existing socket infrastructure first
- Check event payload shapes match between server emits and client listeners
- Group related events into logical hook files
- Wire hooks into the appropriate layout so they're always active
- Handle edge cases (what if the socket disconnects? don't crash)
- Report: events wired, hooks created, any events you skipped and why
