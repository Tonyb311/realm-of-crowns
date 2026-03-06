# Prompt: Component Architecture Cleanup (Phase 3 — Game Client Modernization)

```
cat CLAUDE.md
cat .claude/agents/web-design.md
```

You are the Team Lead for a browser-based roleplay game project.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

---

## Context

The game client has ~43 pages but no shared layout system. Every page independently renders its own structure. The studio website (`studio-website/`) already demonstrates the right pattern: a `Layout.tsx` wrapper with shared `Navbar` and `Footer`, reusable `ui/` and `sections/` components.

This prompt brings that same architecture to the game client — shared layouts, extracted reusable patterns, consistent loading/error states. This is structural refactoring, NOT visual redesign.

---

## Pre-Work: Audit Current Patterns

Before writing any code, examine:

```bash
cat client/src/components/HUD.tsx
cat client/src/components/ui/PageLayout.tsx
cat client/src/components/ui/realm-index.ts
ls client/src/pages/
```

Then check 3-4 representative pages to understand current patterns:
```bash
head -60 client/src/pages/DailyDashboard.tsx
head -60 client/src/pages/TownPage.tsx
head -60 client/src/pages/CraftingPage.tsx
head -60 client/src/pages/ProfilePage.tsx
```

Answer these questions BEFORE writing code:
1. Does `PageLayout.tsx` already wrap pages? What does it provide?
2. Does `HUD.tsx` serve as a persistent nav bar?
3. How do pages currently handle loading states? Is there a shared pattern?
4. How do pages currently handle error states?
5. What's repeated across every page that could be extracted?

Write your findings to `docs/audit-component-architecture.md` before proceeding.

---

## Part 1: Standardize the Layout System

Based on your audit, create or update the shared layout components:

### GameLayout.tsx
Create `client/src/components/layout/GameLayout.tsx` — the equivalent of the studio site's `Layout.tsx` but for the game:
- Wraps all authenticated game pages
- Includes HUD (top bar) and any persistent UI (notification area, chat panel)
- Provides consistent page padding/margins
- Handles the "authenticated player" chrome that every game page needs

### AuthLayout.tsx
Create `client/src/components/layout/AuthLayout.tsx` — for unauthenticated pages:
- Landing, Login, Register, Race Selection, Character Creation
- Simpler layout — no HUD, no persistent game UI
- Just centered content with the game's atmospheric background

### AdminLayout.tsx
If admin pages don't already have a shared layout, create `client/src/components/layout/AdminLayout.tsx`.

**Important:** Do NOT break existing page functionality. The layout wrappers should WRAP existing pages, not replace their content. If `PageLayout.tsx` already does some of this, extend it rather than creating a competing component.

---

## Part 2: Extract Reusable UI Patterns

Search across all pages for repeated patterns and extract them. Common candidates:

### LoadingState.tsx
Create `client/src/components/ui/LoadingState.tsx`:
- Consistent loading spinner/skeleton used across all pages
- Props: `message?: string`, `fullPage?: boolean`
- Replace scattered loading implementations across pages

### ErrorState.tsx
Create `client/src/components/ui/ErrorState.tsx`:
- Consistent error display
- Props: `error: string`, `onRetry?: () => void`
- Replace scattered error handling displays

### PageHeader.tsx
Create `client/src/components/ui/PageHeader.tsx`:
- Page title + optional subtitle + optional action buttons
- Uses `font-display text-realm-gold-400` consistently
- Replace the ad-hoc h1/h2 headers on each page

### EmptyState.tsx
Create `client/src/components/ui/EmptyState.tsx`:
- "Nothing here yet" display for empty lists/tables
- Props: `icon?: LucideIcon`, `title: string`, `description?: string`, `action?: ReactNode`

**Only extract patterns that appear in 3+ pages.** Don't create components for one-off use cases.

---

## Part 3: Wire Layouts to Router

Update `client/src/App.tsx` (or wherever routes are defined) to use layout wrappers:

```tsx
// Pseudocode — adapt to actual router structure
<Route element={<AuthLayout />}>
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
</Route>

<Route element={<GameLayout />}>
  <Route path="/dashboard" element={<DailyDashboard />} />
  <Route path="/town" element={<TownPage />} />
  <Route path="/travel" element={<TravelPage />} />
  {/* ... all authenticated game routes */}
</Route>

<Route element={<AdminLayout />}>
  <Route path="/admin/*" element={<AdminRoutes />} />
</Route>
```

Use React Router's `<Outlet />` pattern for nested layouts.

**Critical:** Do NOT change any route paths. Players' bookmarks and the URL structure must stay identical.

---

## Part 4: Migrate Pages to New Patterns

For each page that currently handles its own layout/loading/error, update it to use the shared components. Do this in batches:

**Batch 1 — High traffic pages (5):**
- DailyDashboard.tsx
- TownPage.tsx
- ProfilePage.tsx
- InventoryPage.tsx
- CraftingPage.tsx

**Batch 2 — Economy pages (5):**
- MarketPage.tsx
- TradePage.tsx
- ProfessionsPage.tsx
- JobsBoardPage.tsx

**Batch 3 — Social/Political pages (6):**
- GovernancePage.tsx
- ElectionPage.tsx
- KingdomPage.tsx
- DiplomacyPage.tsx
- GuildPage.tsx
- TownHallPage.tsx

**Batch 4 — Character/Exploration pages (6):**
- TravelPage.tsx
- WorldMapPage.tsx
- CombatPage.tsx
- SkillTreePage.tsx
- QuestJournalPage.tsx
- CodexPage.tsx

**Batch 5 — Auth pages (4):**
- LandingPage.tsx
- LoginPage.tsx
- RegisterPage.tsx
- RaceSelectionPage.tsx
- CharacterCreationPage.tsx

For each page:
1. Remove any self-contained layout wrapper if the Layout component now provides it
2. Replace ad-hoc loading spinners with `<LoadingState />`
3. Replace ad-hoc error displays with `<ErrorState />`
4. Replace ad-hoc page titles with `<PageHeader />`
5. Do NOT change the page's actual content or functionality

---

## Part 5: Update Realm Component Exports

Update `client/src/components/ui/realm-index.ts` to export any new components:
- LoadingState
- ErrorState
- PageHeader
- EmptyState
- Any other new reusable components

---

## Part 6: Verify

### Build check
```bash
pnpm run build 2>&1 | tail -20
```
Must compile with 0 errors.

### Route check
Verify all routes still work by checking the router config is correct. No paths should have changed.

### Commit, push, and deploy

```bash
git add -A
git commit -m "refactor: shared layout system, reusable UI components, consistent page patterns"
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
- Change any visual styling or colors (Phase 2 handled that)
- Change any route paths or URL structure
- Modify game logic, API calls, or state management
- Add new features
- Remove any functionality — only restructure how it's organized
- Over-abstract. If a pattern only appears once, leave it inline.

## DO:
- Audit first, code second
- Only extract patterns that repeat across 3+ pages
- Keep layouts minimal — they wrap content, they don't replace it
- Preserve all existing functionality exactly
- Test that the build passes with zero errors
- Report: components created, pages migrated, anything you left alone and why
