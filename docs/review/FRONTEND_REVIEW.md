# Frontend Code Review - Realm of Crowns

**Reviewer:** frontend-reviewer
**Date:** 2026-02-10
**Scope:** `client/src/` - All pages, components, hooks, services, and context
**Files Reviewed:** 80+ TypeScript/TSX files across pages/, components/, hooks/, services/, context/

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Component Architecture](#1-component-architecture)
3. [State Management](#2-state-management)
4. [API Integration](#3-api-integration)
5. [Socket.io Client](#4-socketio-client)
6. [UI/UX Gaps](#5-uiux-gaps)
7. [Route Protection](#6-route-protection)
8. [Performance](#7-performance)

---

## Executive Summary

The Realm of Crowns frontend is a substantial React 18 + TypeScript application with approximately 24 page components, 70+ sub-components, 7 custom hooks, and 3 service modules. The codebase demonstrates strong feature coverage across all game systems but suffers from several architectural patterns that will create maintainability and performance problems at scale.

**Critical issues:** 3
**Major issues:** 18
**Minor issues:** 14
**Suggestions:** 12

The most pressing concerns are: (1) several extremely large page files with many inline sub-components, (2) hardcoded game values that should reference shared data, (3) no Error Boundary protection, and (4) a full-page-reload on 401 errors that destroys client state.

---

## 1. Component Architecture

### CRIT-01: CraftingPage.tsx is 1,380 lines with 5 inline sub-components

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\client\src\pages\CraftingPage.tsx`
- **Lines:** 1-1380
- **Description:** This single file contains the main `CraftingPage` component plus `WorkshopIndicator`, `RecipesTab`, `QueueTab`, and `WorkTab` sub-components, along with ~200 lines of type definitions, constants, and helper functions. This makes the file extremely difficult to navigate, test, and maintain. Prop drilling through `RecipesTab` alone requires 18 props.
- **Recommended Fix:** Extract each tab component into its own file under `components/crafting/`. Move shared types and constants to a `types/crafting.ts` or `shared/` module. Use a context or composition pattern to avoid 18-prop drilling.

### CRIT-02: CombatPage.tsx is 1,256 lines with ~10 inline sub-components

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\client\src\pages\CombatPage.tsx`
- **Lines:** 1-1256
- **Description:** Contains `BattleScreen`, `BattleLog`, `CharacterStatus`, `OpponentStatus`, `FloatingDamage`, `ChallengeModal`, `EncounterBrowser`, `PvPLeaderboard`, and additional helpers all in one file. These inline components cannot be individually tested or reused.
- **Recommended Fix:** Extract battle UI components to `components/combat/`. Move the `ChallengeModal` to a shared modals directory. Extract types to a dedicated file.

### CRIT-03: MarketPage.tsx is 981 lines with inline sub-components

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\client\src\pages\MarketPage.tsx`
- **Lines:** 1-981
- **Description:** Contains `PriceChart`, `GoldAmount`, `RarityBadge`, and listing management logic all in one file. The `PriceChart` component alone is a full SVG charting component that would benefit from being its own module.
- **Recommended Fix:** Extract `PriceChart` to `components/market/PriceChart.tsx`, `GoldAmount` to a shared UI component (it is duplicated in `KingdomPage.tsx` and `TownHallPage.tsx`), and separate browsing/listing/history tabs into individual components.

### MAJ-01: GoldAmount component is duplicated across files

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\KingdomPage.tsx` (line 51), `D:\realm_of_crowns\client\src\pages\TownHallPage.tsx` (line 71), `D:\realm_of_crowns\client\src\pages\MarketPage.tsx` (inline)
- **Description:** The `GoldAmount` helper component is independently defined in at least 3 different page files with identical implementations. This violates DRY principles.
- **Recommended Fix:** Create a shared `components/ui/GoldAmount.tsx` component and import it everywhere.

### MAJ-02: HomePage component defined inline in App.tsx

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\App.tsx`
- **Lines:** 242-306
- **Description:** The `HomePage` component is defined inside `App.tsx` rather than as a separate lazy-loaded page component. This means it is bundled with the main App chunk and cannot be code-split.
- **Recommended Fix:** Move `HomePage` to `pages/HomePage.tsx` and lazy-load it like all other pages.

### MAJ-03: No Error Boundaries anywhere in the application

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\App.tsx`
- **Lines:** 51-239
- **Description:** There are no React Error Boundaries in the component tree. A rendering error in any component (particularly in the complex CombatPage or MarketPage) will crash the entire application, showing a blank white screen with no recovery option.
- **Recommended Fix:** Add a top-level `ErrorBoundary` component wrapping the `<Routes>` element. Consider adding additional boundaries around each page for more granular error isolation. Display a user-friendly fallback with a "reload" button.

### MAJ-04: CountdownTimer component is duplicated

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\TownHallPage.tsx` (line 80), `D:\realm_of_crowns\client\src\pages\ElectionPage.tsx`
- **Description:** Both pages independently define their own `CountdownTimer` component with similar logic (setInterval updating every second).
- **Recommended Fix:** Extract to a shared `components/ui/CountdownTimer.tsx`.

### MIN-01: PageLayout component exists but is rarely used

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\components\ui\PageLayout.tsx`
- **Lines:** 1-58
- **Description:** A reusable `PageLayout` component exists that provides consistent page structure (header with title, subtitle, icon, max-width). However, most pages manually recreate this layout pattern with slight variations (e.g., TownHallPage, KingdomPage, ProfessionsPage, HousingPage, TradePage all have nearly identical header structures). Only some later pages use `PageLayout`.
- **Recommended Fix:** Standardize all pages to use `PageLayout` for consistent spacing and structure.

### MIN-02: RARITY_COLORS constant is duplicated

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\CraftingPage.tsx` (line 141), `D:\realm_of_crowns\client\src\pages\InventoryPage.tsx`
- **Description:** Rarity color mappings are defined independently in multiple files.
- **Recommended Fix:** Move to a shared `utils/colors.ts` or `constants/items.ts`.

### MIN-03: TOAST_STYLE constant is duplicated across 5 hooks

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\hooks\useCraftingEvents.ts` (line 17), `useBuildingEvents.ts` (line 19), `useTradeEvents.ts` (line 31), `D:\realm_of_crowns\client\src\pages\DiplomacyPage.tsx` (line 78)
- **Description:** The same toast styling object `{ background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #3a3a4e' }` is duplicated in at least 5 files.
- **Recommended Fix:** Export a shared `TOAST_STYLE` constant from a common module.

### SUGG-01: Consider a Storybook or component documentation approach

- **Severity:** SUGGESTION
- **Description:** With 70+ components and no documentation, onboarding new developers will be challenging. A component library tool would help document the design system (buttons, cards, badges, etc.).

---

## 2. State Management

### MAJ-05: Zustand is listed in tech stack but no stores exist

- **Severity:** MAJOR
- **File:** Project-wide
- **Description:** `CLAUDE.md` lists Zustand as part of the tech stack, but there are no Zustand stores in the codebase. The `client/src/stores/` directory does not exist. All client state is managed through React Query for server state and `useState` for local state. The `AuthContext` handles authentication state. This is not inherently a problem for the current scope, but the documentation mismatch is misleading.
- **Recommended Fix:** Either add Zustand stores for complex client-side state (e.g., UI preferences, chat panel state, map viewport) or update `CLAUDE.md` to remove Zustand from the tech stack.

### MAJ-06: Multiple components independently fetch `['character', 'me']`

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\components\HUD.tsx` (line 73), `D:\realm_of_crowns\client\src\components\ChatPanel.tsx`, `D:\realm_of_crowns\client\src\components\PoliticalNotifications.tsx`, `D:\realm_of_crowns\client\src\components\SocialEventsProvider.tsx`, `D:\realm_of_crowns\client\src\pages\CraftingPage.tsx` (line 230), `D:\realm_of_crowns\client\src\pages\HousingPage.tsx` (line 66), `D:\realm_of_crowns\client\src\pages\DiplomacyPage.tsx` (line 94), `D:\realm_of_crowns\client\src\pages\TownHallPage.tsx` (line 119), `D:\realm_of_crowns\client\src\pages\DailyDashboard.tsx` (line 45)
- **Description:** At least 9 components independently call `api.get('/characters/me')` with the query key `['character', 'me']`. While React Query deduplicates concurrent requests, each component defines its own response type, creating type inconsistencies. Some cast the response as `CharacterHUD`, others as `{ id: string; currentTownId?: string }`, others as `PlayerCharacter`. The same endpoint returns different type shapes depending on which component interprets it.
- **Recommended Fix:** Create a single `useCharacter()` custom hook that fetches and types the character data consistently. All components should use this hook instead of inline `useQuery` calls.

### MAJ-07: ChatPanel stores messages in local state, duplicating React Query data

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\components\ChatPanel.tsx`
- **Description:** Chat messages are stored in `useState` and also potentially available through React Query. New messages from socket events are prepended to local state, but there is no synchronization with the server state. If the user switches tabs and returns, old messages from the server response and new messages from socket events could get out of sync.
- **Recommended Fix:** Use React Query as the single source of truth for messages. On socket events, use `queryClient.setQueryData` to optimistically update the cache rather than maintaining a parallel state.

### MAJ-08: floatingDamages state in CombatPage grows unboundedly

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\CombatPage.tsx`
- **Description:** The `floatingDamages` state array adds new entries on each combat log event and uses `setTimeout` to remove the first element after a delay. In long combat sessions, if timeouts pile up or are not properly cleaned, this array can grow without bound. Additionally, the cleanup removes the first element by index (using `.slice(1)`), which may not correspond to the oldest damage if multiple damages were added rapidly.
- **Recommended Fix:** Use a unique ID for each floating damage entry and remove by ID in the timeout cleanup. Set a maximum array length (e.g., 10) to prevent unbounded growth. Clean up all timeouts on unmount.

### MIN-04: useCallback dependency arrays may cause unnecessary re-subscriptions

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\hooks\useSocialEvents.ts`
- **Lines:** ~182
- **Description:** The hook accepts callback props (`onChatMessage`, `onPresenceChange`, `onPlayerTown`) and includes them in the `useEffect` dependency array. If callers do not memoize these callbacks with `useCallback`, the socket event listeners will be torn down and re-attached on every render.
- **Recommended Fix:** Document that callers must memoize callbacks, or use refs inside the hook to hold the latest callback values without triggering effect re-runs.

### MIN-05: `window.__chatOpenDM` is a global function hack

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\components\ChatPanel.tsx` (line 210), `D:\realm_of_crowns\client\src\pages\ProfilePage.tsx` (line 142)
- **Description:** Cross-component communication between `ProfilePage` and `ChatPanel` uses `window.__chatOpenDM`, a globally defined function. This is fragile, not type-safe, and will break if ChatPanel is not mounted.
- **Recommended Fix:** Use a Zustand store, React Context, or event bus pattern for cross-component communication.

### SUGG-02: Consider extracting query keys into a centralized module

- **Severity:** SUGGESTION
- **Description:** Query keys are scattered as string literals across ~50+ `useQuery` calls. A centralized `queryKeys.ts` file would prevent typos and make cache invalidation patterns clearer.

---

## 3. API Integration

### MAJ-09: 401 interceptor causes full page reload

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\services\api.ts`
- **Lines:** 20-28
- **Description:** The Axios response interceptor handles 401 errors with `window.location.href = '/login'`, which triggers a full browser page reload. This destroys all in-memory React state, React Query cache, and socket connections. It also bypasses React Router, which means the user cannot be redirected back to their original page after re-authenticating.
- **Recommended Fix:** Instead of `window.location.href`, dispatch a global event or update the AuthContext to set the user as unauthenticated. React Router's `<Navigate>` or a redirect within `ProtectedRoute` will handle the routing properly. Consider storing the intended destination for post-login redirect.

### MAJ-10: Hardcoded TAX_RATE in MarketPage

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\MarketPage.tsx`
- **Lines:** ~109
- **Description:** `const TAX_RATE = 0.1` is hardcoded in the client. According to the game design, tax rates are set by elected mayors and can range from 5-25%. This hardcoded value will display incorrect tax calculations for any town that does not have exactly a 10% tax rate.
- **Recommended Fix:** Fetch the actual tax rate from the server (it should be part of the town data or marketplace response). The server already provides this data on the `TownHallPage` (line 302: `Math.round(town.taxRate * 100)`).

### MAJ-11: Hardcoded "Tax Rate: 10%" in TownPage

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\TownPage.tsx`
- **Lines:** ~369
- **Description:** The TownPage displays a hardcoded "Tax Rate: 10%" string instead of fetching the actual server-set tax rate. This will mislead players about the true tax rate in their town.
- **Recommended Fix:** Display `town.taxRate` from the server response, formatted as a percentage.

### MAJ-12: GovernancePage hardcodes kingdomId as 'default'

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\GovernancePage.tsx`
- **Lines:** ~131
- **Description:** The kingdom law query uses `kingdomId: 'default'` as a hardcoded value. This will break for any kingdom that does not have the ID 'default', which is likely all of them once multiple kingdoms exist.
- **Recommended Fix:** Derive the `kingdomId` from the player's town chain (town -> region -> kingdom) or from the character data. `KingdomPage` (line 76) partially addresses this by reading from URL search params but also falls back to 'default'.

### MAJ-13: ChatPanel sends messages via both Socket AND REST simultaneously

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\components\ChatPanel.tsx`
- **Lines:** ~183-188
- **Description:** When a user sends a chat message, the code emits the message over the socket AND sends a REST POST request simultaneously. The REST error is silently caught with `.catch(() => {})`. This creates duplicate message processing on the server side and silently swallows errors that should be reported to the user.
- **Recommended Fix:** Choose one transport mechanism. If using sockets for real-time delivery, use socket acknowledgments for success/error handling. Remove the REST call or use it only as a fallback.

### MAJ-14: AchievementPage fetches character data but expects achievements array

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\AchievementPage.tsx`
- **Lines:** 115-121
- **Description:** The query fetches `/characters/me` and then accesses `res.data.achievements ?? []`. There is no dedicated achievements endpoint. If the character endpoint does not include the `achievements` field (which most other uses of this endpoint do not expect), this will always return an empty array. Additionally, this query uses the query key `['achievements']` but fetches the character endpoint, which could conflict with other character queries.
- **Recommended Fix:** Create a dedicated `/achievements` API endpoint and use the appropriate query key. Do not overload the character endpoint for different data needs.

### MIN-06: No global error handling beyond 401

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\services\api.ts`
- **Lines:** 20-28
- **Description:** The only response interceptor handles 401 errors. 500 errors, network timeouts, and other server errors are not handled globally, leaving each component to implement its own error handling (inconsistently).
- **Recommended Fix:** Add a global interceptor for 500 errors that shows a toast notification. Add network error detection for offline states.

### MIN-07: WorldMapPage contains ~300 lines of hardcoded fallback town data

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\WorldMapPage.tsx`
- **Lines:** 101-312
- **Description:** The `buildFallbackData()` function contains 68 towns with coordinates, 86 routes, and 20 regions as hardcoded data. This should reference the shared data package instead of being duplicated in the client.
- **Recommended Fix:** Import fallback data from `@shared/data/` or ensure the API always provides this data (it should be seeded in the database).

### SUGG-03: Add request/response interceptors for request timing and debugging

- **Severity:** SUGGESTION
- **Description:** Adding a request timing interceptor would help identify slow API calls during development. Consider adding a debug mode that logs request/response pairs.

---

## 4. Socket.io Client

### MAJ-15: No socket error handling or reconnection logic

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\services\socket.ts`
- **Lines:** 163-182
- **Description:** The `connectSocket()` function sets up `connect` and `disconnect` event listeners (console.log only) but has no `connect_error` handler, no `reconnect_failed` handler, and no reconnection strategy. If the server restarts or the network drops, the socket will silently fail with no user feedback and no automatic recovery. The socket.io client does have built-in reconnection, but without handling `connect_error` events, the user will not know they are disconnected.
- **Recommended Fix:** Add `connect_error` and `reconnect_failed` event handlers. Display a connection status indicator in the HUD. Re-join rooms after reconnection. Consider adding an exponential backoff strategy for reconnection.

### MAJ-16: usePoliticalEvents does not clean up socket on unmount

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\hooks\usePoliticalEvents.ts`
- **Lines:** 54-57
- **Description:** The cleanup function for the socket connection effect contains only a comment: "keep socket alive (other components may still need it)". While the intent is understandable (singleton socket), the event listeners added in this hook ARE cleaned up, but if the component mounts/unmounts rapidly (e.g., during navigation), listeners can briefly double up between the old cleanup and new setup.
- **Recommended Fix:** Ensure event listener cleanup is synchronous and complete. The socket singleton pattern is fine, but document that socket lifecycle management happens elsewhere (e.g., in AuthContext logout).

### MAJ-17: Multiple hooks call getSocket() which can return null

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\hooks\useGatheringEvents.ts`, `useCraftingEvents.ts`, `useBuildingEvents.ts`, `useTradeEvents.ts`
- **Description:** All event hooks call `getSocket()` and return early if null. However, if the socket connects AFTER the hook has already run its effect, the hook will never register its listeners. The effect dependency arrays only include `queryClient` (which is stable), so they will not re-run when the socket becomes available.
- **Recommended Fix:** Add the socket connection state to the dependency array, or use a pattern where hooks subscribe to a "socket ready" event. Consider a `useSocket()` hook that returns the socket instance and triggers re-renders when connection state changes.

### MIN-08: useGatheringEvents does not check isAuthenticated

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\hooks\useGatheringEvents.ts`
- **Description:** Unlike `usePoliticalEvents` and `useSocialEvents`, the gathering events hook does not check `isAuthenticated` before subscribing to socket events. If the component using this hook renders before authentication is complete, it will attempt to listen on a potentially null socket.
- **Recommended Fix:** Add an `isAuthenticated` check consistent with other hooks, or ensure the hook is only used within authenticated routes.

### MIN-09: DiplomacyPage registers socket listeners inline instead of using a hook

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\DiplomacyPage.tsx`
- **Lines:** 151-186
- **Description:** The DiplomacyPage directly calls `getSocket()` and registers event listeners in an inline `useEffect`, rather than using a dedicated hook like other systems (e.g., `useTradeEvents`, `useBuildingEvents`).
- **Recommended Fix:** Extract socket event handling to a `useDiplomacyEvents()` hook for consistency with the codebase pattern.

### SUGG-04: Add a socket connection status indicator

- **Severity:** SUGGESTION
- **Description:** Since the game heavily depends on real-time updates (chat, combat, elections, trade), users should be able to see their connection status. A small indicator in the HUD (green dot = connected, yellow = reconnecting, red = disconnected) would help debugging and set user expectations.

---

## 5. UI/UX Gaps

### MAJ-18: No 404 catch-all route

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\App.tsx`
- **Lines:** 63-234
- **Description:** There is no `<Route path="*">` catch-all route in the router configuration. Navigating to any undefined path (e.g., `/nonexistent`) shows a blank page with just the HUD and navigation.
- **Recommended Fix:** Add a `<Route path="*" element={<NotFoundPage />} />` that displays a styled 404 page with navigation back to the game.

### MAJ-19: Modals do not trap focus or handle Escape key

- **Severity:** MAJOR
- **File:** Multiple files - `D:\realm_of_crowns\client\src\pages\ProfessionsPage.tsx` (line 430), `D:\realm_of_crowns\client\src\pages\CombatPage.tsx` (ChallengeModal), `D:\realm_of_crowns\client\src\components\professions\LearnProfessionModal.tsx`
- **Description:** All modal dialogs in the application are built with plain `div` elements. None implement focus trapping (users can tab to elements behind the modal), and none handle the Escape key for dismissal. The backdrop click-to-close works in most cases, but keyboard accessibility is entirely missing.
- **Recommended Fix:** Create a shared `Modal` component that implements focus trapping, Escape key handling, and `role="dialog"` with `aria-modal="true"`. Use a library like `@headlessui/react` or `@radix-ui/react-dialog` for accessible modal behavior.

### MAJ-20: ChallengeModal requires raw Character ID input

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\CombatPage.tsx` (ChallengeModal)
- **Description:** To challenge another player to a PvP duel, the user must type or paste a raw character UUID. There is no search-by-name functionality or player selection UI. This is an extremely poor user experience as UUIDs are not human-friendly.
- **Recommended Fix:** Add a player search/autocomplete component (the `PlayerSearch` component exists at `D:\realm_of_crowns\client\src\components\PlayerSearch.tsx`) that lets users search by character name and select from results.

### MIN-10: LoginPage lacks client-side validation

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\LoginPage.tsx`
- **Description:** The login form uses only HTML5 `required` attributes for validation, unlike `RegisterPage.tsx` which has a proper `validate()` function checking email format, password length, etc. While server-side validation catches errors, the UX is degraded by waiting for a round-trip to show validation errors.
- **Recommended Fix:** Add client-side validation for email format and password length, matching the RegisterPage pattern.

### MIN-11: GuildPage uses native confirm() for destructive actions

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\GuildPage.tsx`
- **Description:** Destructive guild actions (leave guild, kick member, disband guild) use the browser's native `confirm()` dialog, which is visually inconsistent with the rest of the themed UI and cannot be styled.
- **Recommended Fix:** Use a custom confirmation modal that matches the game's dark fantasy theme.

### MIN-12: GuildPage imports useAuth but does not use it

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\GuildPage.tsx`
- **Lines:** ~20
- **Description:** `useAuth` is imported but never used in the component, creating dead code.
- **Recommended Fix:** Remove the unused import.

### MIN-13: DailyDashboard page is not route-registered

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\DailyDashboard.tsx`, `D:\realm_of_crowns\client\src\App.tsx`
- **Description:** `DailyDashboard.tsx` exists as a fully implemented page component, but it is not imported or registered in the App.tsx router. It is unreachable by users.
- **Recommended Fix:** Add a route for the daily dashboard (e.g., `/daily`) and a navigation item, or remove the file if it is not yet intended for use.

### MIN-14: RaceSelectionPage is not route-registered

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\RaceSelectionPage.tsx`, `D:\realm_of_crowns\client\src\App.tsx`
- **Description:** `RaceSelectionPage.tsx` is a fully implemented standalone page for browsing races with compare functionality, but it is not registered in the router. It may be intended as a pre-creation browsing page.
- **Recommended Fix:** Register the route if it should be accessible, or document its purpose as an embedded component.

### SUGG-05: Add loading skeletons to all pages

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\client\src\components\ui\LoadingSkeleton.tsx`
- **Description:** `LoadingSkeleton` components exist (Text, Avatar, Row, Card, Table) but most pages use a simple centered `<Loader2>` spinner for loading states instead. Skeleton loading would provide a much better perceived performance experience, especially for the complex pages like TownPage, MarketPage, and WorldMapPage.

### SUGG-06: Revenant and Forgeborn sustenance warnings are duplicated

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\client\src\pages\CharacterCreationPage.tsx`
- **Lines:** 303-325 (race selection), 518-540 (stat review)
- **Description:** The identical warning text for Revenant Soul Essence and Forgeborn Maintenance is copy-pasted in two different steps of the character creation wizard. If the text changes, it must be updated in both places.
- **Recommended Fix:** Extract to a shared component or constant.

---

## 6. Route Protection

### MAJ-21: GovernancePage does client-side authorization that can flash content

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\GovernancePage.tsx`
- **Description:** The GovernancePage checks if the current user is the town mayor on the client side. The page renders its full content first, then checks authorization. Non-mayor users may briefly see the governance panel before being told they lack access. This also provides no protection against URL manipulation -- a non-mayor can navigate directly to `/governance`.
- **Recommended Fix:** Add a server-side authorization check in the API endpoints (likely already exists). On the client, show a loading state while checking authorization and redirect non-mayors immediately.

### MIN-15: No character-existence guard on protected routes

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\App.tsx`
- **Description:** `ProtectedRoute` only checks if the user is authenticated, not whether they have created a character. A logged-in user without a character can access pages like `/town`, `/combat`, `/market`, etc., which will either show errors or empty states. The `HomePage` component does handle this by checking for a character, but the individual game pages do not.
- **Recommended Fix:** Create a `CharacterRequiredRoute` wrapper that redirects to `/create-character` if no character exists.

### SUGG-07: Admin pages should verify server-side admin status on each request

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\client\src\components\ui\AdminRoute.tsx`
- **Description:** `AdminRoute` checks `isAdmin` from the AuthContext (set during login). If an admin's role is revoked while they are logged in, the client will still show admin pages until they re-authenticate. The server should verify admin status on each admin API request (likely already done), but the client should also periodically re-check.

---

## 7. Performance

### MAJ-22: CombatPage polls every 3 seconds during combat

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\CombatPage.tsx`
- **Description:** The combat state query uses `refetchInterval: 3000`, meaning the client polls the server every 3 seconds during combat. With many concurrent players in combat, this creates significant unnecessary server load. Socket.io is already set up for real-time events.
- **Recommended Fix:** Remove the polling and rely entirely on Socket.io events for combat state updates. The server already emits `combat:result` events. Add additional socket events for combat state changes (enemy turn, damage dealt, etc.) and use `queryClient.setQueryData` to update the cache in real-time.

### MAJ-23: CraftingPage has multiple overlapping polling intervals

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\client\src\pages\CraftingPage.tsx`
- **Lines:** 275-292
- **Description:** The crafting page runs three concurrent polling intervals: crafting status (15s), crafting queue (10s), and work status (15s). All three overlap and could be replaced with socket events. The socket hook `useCraftingEvents` already listens for `crafting:ready` events, making the crafting status poll partially redundant.
- **Recommended Fix:** Rely on socket events for state changes and remove or dramatically reduce polling intervals. Use longer stale times (e.g., 60s) as a fallback only.

### MIN-16: PriceChart in MarketPage uses indexOf for data lookups

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\MarketPage.tsx`
- **Description:** The `PriceChart` SVG component uses `Array.indexOf` for data point lookups during rendering. With large price history datasets, this could cause rendering performance issues.
- **Recommended Fix:** Use a `Map` for O(1) lookups, or pre-process the data outside the render path.

### MIN-17: No use of React.memo anywhere

- **Severity:** MINOR
- **File:** Project-wide
- **Description:** None of the 70+ components use `React.memo` for memoization. In the current architecture where many sub-components are defined inline (they re-mount on parent re-render anyway), this has limited impact. However, once components are extracted to separate files, adding `React.memo` to pure display components (StatBar, AchievementCard, ProfessionCard, BuildingCard, etc.) would prevent unnecessary re-renders.
- **Recommended Fix:** After extracting components from large files, wrap pure display components with `React.memo`.

### MIN-18: WorldMapPage SVG renders all 68 town markers regardless of viewport

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\client\src\pages\WorldMapPage.tsx`
- **Lines:** 730-745
- **Description:** All 68 town markers and their event handlers are rendered in the SVG regardless of the current viewport/zoom level. At continent view, markers are tiny and essentially invisible, but their event handlers and DOM nodes still exist.
- **Recommended Fix:** Implement viewport culling to only render markers that are within or near the current viewBox. The `getZoomLevel` function already exists and could be used to filter which markers to render.

### SUGG-08: Consider using React.lazy for more aggressive code splitting

- **Severity:** SUGGESTION
- **Description:** All pages are already lazy-loaded, which is good. However, some heavy component directories (e.g., `components/map/`, `components/diplomacy/`, `components/trade/`) could also be lazy-loaded since they are only used by specific pages.

### SUGG-09: Add React Query DevTools for development

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\client\src\main.tsx`
- **Description:** React Query DevTools would help debug cache behavior, stale times, and refetch patterns. It is especially useful given the complex caching patterns in this application.

### SUGG-10: WorldMapPage makes N+1 API calls for exclusive zone access checks

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\client\src\pages\WorldMapPage.tsx`
- **Lines:** 394-403
- **Description:** After fetching exclusive zones, the code makes a separate API call for EACH zone to check player access: `zones.map(z => api.get('/zones/${z.id}/access', ...))`. This is an N+1 query pattern that could be resolved with a single batch endpoint.
- **Recommended Fix:** Create a batch access check endpoint: `POST /zones/check-access` that accepts an array of zone IDs and returns access status for all at once.

### SUGG-11: KingdomPage reads kingdomId from window.location.search manually

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\client\src\pages\KingdomPage.tsx`
- **Lines:** 76
- **Description:** `const kingdomId = new URLSearchParams(window.location.search).get('id') || 'default'` manually parses the URL instead of using React Router's `useSearchParams` hook. This bypasses React's reactivity system -- if the search params change via React Router navigation, the component will not re-render.
- **Recommended Fix:** Use `useSearchParams` from `react-router-dom`.

### SUGG-12: Empty directories suggest unfinished scaffolding

- **Severity:** SUGGESTION
- **File:** `D:\realm_of_crowns\client\src\types\`, `D:\realm_of_crowns\client\src\utils\`, `D:\realm_of_crowns\client\src\styles\`
- **Description:** The `types/`, `utils/`, and `styles/` directories exist but contain no files. Types are defined inline in each component file, utility functions are duplicated, and styles are managed entirely through Tailwind classes. While this works for now, the empty directories suggest a planned structure that was never followed.
- **Recommended Fix:** Use these directories as intended. Move shared types to `types/`, utility functions (formatting, calculations) to `utils/`, and any global CSS overrides to `styles/`.

---

## Summary of Findings by Severity

| Severity   | Count | Key Areas                                                       |
|------------|-------|-----------------------------------------------------------------|
| CRITICAL   | 3     | File size (CraftingPage, CombatPage, MarketPage)                |
| MAJOR      | 18    | Architecture, API, state management, Socket.io, UX              |
| MINOR      | 14    | Duplicated code, missing validation, unused imports             |
| SUGGESTION | 12    | Developer experience, tooling, performance optimizations        |

## Priority Recommendations

1. **Immediate:** Add Error Boundaries to prevent white-screen crashes (MAJ-03)
2. **Immediate:** Fix the 401 interceptor to not full-page-reload (MAJ-09)
3. **High:** Extract CraftingPage, CombatPage, and MarketPage into smaller components (CRIT-01, CRIT-02, CRIT-03)
4. **High:** Fix hardcoded tax rates to use server data (MAJ-10, MAJ-11)
5. **High:** Add a 404 catch-all route (MAJ-18)
6. **High:** Add socket reconnection handling and error events (MAJ-15)
7. **Medium:** Create a shared `useCharacter()` hook (MAJ-06)
8. **Medium:** Fix modal accessibility (MAJ-19)
9. **Medium:** Replace combat polling with socket-only updates (MAJ-22)
10. **Medium:** Fix GovernancePage hardcoded kingdomId (MAJ-12)
