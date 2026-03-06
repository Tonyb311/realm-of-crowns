# Component Architecture Audit

Generated: 2026-03-06

## Current Layout System

### What Already Exists
| Component | Location | Purpose | Used By |
|-----------|----------|---------|---------|
| `GameShell` | `components/layout/GameShell.tsx` | Wraps all auth'd game routes — HudBar, HeroBanner, Sidebar, BottomNav, daily report popup | App.tsx line 86 |
| `AdminLayout` | `components/admin/AdminLayout.tsx` | Wraps all admin routes | App.tsx line 117 |
| `PageLayout` | `components/ui/PageLayout.tsx` | Page wrapper with optional title header + max-width content | **0 pages** use it |
| `HUD` | `components/HUD.tsx` | Legacy HUD bar — likely superseded by GameShell's HudBar | Unclear |
| `LoadingScreen` | `components/LoadingScreen.tsx` | Full-page spinner (Suspense fallback) | App.tsx |
| `ErrorMessage` | `components/ui/ErrorMessage.tsx` | Status-aware error card with retry | 0 pages use it directly |

### Key Findings
1. **GameShell already provides the "GameLayout" pattern** — no separate GameLayout needed.
2. **AdminLayout already exists** — no work needed.
3. **Auth pages (login, register, landing) have no shared layout** — AuthLayout is the only gap.
4. **PageLayout exists but is unused** — it conflicts with GameShell (both provide padding/bg).
5. **HUD.tsx appears to be a legacy component** — GameShell uses HudBar instead.

## Loading State Patterns (across 31 pages)

| Pattern | Count | Pages |
|---------|-------|-------|
| Loader2 spinner | ~13 | Achievement, Diplomacy, Election, Governance, Housing, Professions, QuestJournal, SkillTree, Tavern, Trade, Travel, WorldMap, Reports |
| animate-pulse skeletons | ~8 | Apothecary, Crafting, Guild, Inventory, Jobs, Kingdom, Market, Profile, TownHall, Town |
| Custom spinner | 1 | CodexPage |
| No loading state | ~9 | DailyDashboard, Landing, Login, Register, RaceSelection, CharacterCreation, CombatPage |

**Common spinner code (repeated 13+ times):**
```tsx
<div className="flex items-center justify-center py-20">
  <Loader2 className="w-8 h-8 text-realm-gold-400 animate-spin" />
</div>
```

## Error State Patterns

| Pattern | Count |
|---------|-------|
| Inline error text (small red banner) | ~11 |
| Full error screen (icon + message + button) | ~3 |
| No error handling | ~17 |

## Page Title Patterns

**All 25+ game pages use ad-hoc h1 headers** with inconsistent styling:
- Most: `<h1 className="text-3xl font-display text-realm-gold-400">Title</h1>`
- Some include icons, subtabs, or action buttons
- No consistent spacing or border treatment

## Empty State Patterns

~15 pages have empty state displays. Common pattern:
```tsx
<div className="text-center py-20">
  <Icon className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
  <p className="text-realm-text-muted">No items found.</p>
</div>
```

## What To Build

1. **PageHeader** — Lightweight header component (title + icon + subtitle + actions). NOT a full-page wrapper.
2. **LoadingState** — Centered spinner with optional message. Replaces ad-hoc Loader2 patterns.
3. **EmptyState** — Icon + title + description + optional action button.
4. **AuthLayout** — Simple wrapper for public pages (landing, login, register).
5. Wire AuthLayout into App.tsx router.
6. Migrate pages to use shared components (5 batches).

## What NOT To Build

- **GameLayout** — GameShell already does this.
- **AdminLayout** — Already exists.
- **New PageLayout** — Would conflict with GameShell's padding. PageHeader is the right extraction.
- **ErrorState** — ErrorMessage already exists and is comprehensive.
