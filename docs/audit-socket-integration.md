# Socket Integration Audit

Generated: 2026-03-06

## Socket Infrastructure

- **Connection**: `client/src/services/socket.ts` — singleton via `getSocket()`, auto-reconnect, room management (town/kingdom/guild)
- **Toast system**: `react-hot-toast` with `TOAST_STYLE` constant from `client/src/constants/index.ts`. `<Toaster>` rendered by `PoliticalNotifications` component
- **Pattern**: Each domain has a `use*Events.ts` hook using `useEffect` → `getSocket()` → `socket.on()`/`socket.off()` + `queryClient.invalidateQueries()`
- **Global wiring**: Provider components in `App.tsx` (SocialEventsProvider, ProgressionEventsProvider, PoliticalNotifications, GlobalEventsProvider)
- **Page-specific wiring**: Some hooks called directly in pages (useTravelEvents in TravelPage, useGatheringEvents/useCraftingEvents in CraftingPage)

## Events Wired (Phase 5)

### Part 1: Travel Events (useTravelEvents.ts - NEW)
| Event | Server Source | Client Action |
|-------|-------------|---------------|
| `travel:tick-processed` | `user:${id}` + broadcast | Invalidate travel + character queries |
| `travel:group-update` | `user:${id}` per member | Invalidate travel + party queries |
| `travel:player-entered` | `node:${id}` room | Toast: "X arrived at Y" |
| `travel:player-left` | `node:${id}` room | Toast: "X left Y" |

**Note**: `travel:player-entered` and `travel:player-left` emit to `node:${id}` rooms. Client does not currently join node rooms, so these listeners are ready but won't fire until node room joining is implemented server-side.

### Part 2: Item Durability Events (useItemEvents.ts - NEW)
| Event | Payload Key Fields | Client Action |
|-------|-------------------|---------------|
| `item:lowDurability` | itemName, percentRemaining | Warning toast + invalidate inventory/equipment |
| `item:broken` | itemName, wasEquipped | Danger toast + invalidate inventory/equipment/character |

### Part 3: Building Events (useBuildingEvents.ts - UPDATED)
Already had: `building:constructed`. Added 5 events:
| Event | Client Action |
|-------|---------------|
| `building:taxDue` | Toast (info if paid, warning if not) + invalidate buildings |
| `building:delinquent` | Danger toast with seizure countdown + invalidate buildings |
| `building:seized` | Danger toast + invalidate buildings + character |
| `building:damaged` | Warning toast with cause/condition + invalidate buildings |
| `building:conditionLow` | Warning/danger toast (condemned vs low) + invalidate buildings |

Moved from HousingPage-only to global via GlobalEventsProvider.

### Part 4: Social Events (useSocialEvents.ts - UPDATED)
Added 5 events:
| Event | Client Action |
|-------|---------------|
| `friend:request` | Info toast + invalidate friends |
| `friend:accepted` | Success toast + invalidate friends |
| `action:cancelled` | Warning toast + invalidate actions |
| `system:broadcast` | Prominent toast (10s, blue border) |
| `chat:error` | Error toast (red border) |

### Part 5: DailyDashboard tick:processing (REMOVED)
Server never emits `tick:processing`. Removed dead listener and associated `isProcessing` state. `ActionTimer` now receives `isProcessing={false}` statically.

## Event #17: admin:error-log
Skipped — this is admin-facing, emitted via `setAdminEmitter` callback in `error-logger.ts`. The `ErrorLogDashboardPage` already handles it through its own mechanism.

## Files Changed
- `client/src/hooks/useTravelEvents.ts` (NEW)
- `client/src/hooks/useItemEvents.ts` (NEW)
- `client/src/hooks/useBuildingEvents.ts` (UPDATED — 5 events added)
- `client/src/hooks/useSocialEvents.ts` (UPDATED — 5 events added)
- `client/src/components/GlobalEventsProvider.tsx` (NEW)
- `client/src/App.tsx` (import + mount GlobalEventsProvider)
- `client/src/pages/TravelPage.tsx` (wire useTravelEvents)
- `client/src/pages/HousingPage.tsx` (remove useBuildingEvents, now global)
- `client/src/pages/DailyDashboard.tsx` (remove tick:processing dead listener)
