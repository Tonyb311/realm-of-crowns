# Prompt: Page-by-Page UI Polish (Phase 4 — Game Client Modernization)

```
cat CLAUDE.md
cat .claude/agents/web-design.md
```

You are the Team Lead for a browser-based roleplay game project.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

---

## Context

Phases 1-3 of the game client modernization are complete:
- Phase 1: Critical bugs fixed
- Phase 2: Design system unified (semantic tokens, legacy killed)
- Phase 3: Component architecture (shared layouts, reusable patterns)

This phase is the visual polish pass. Each page gets reviewed for consistent use of the Realm design system, proper component usage, responsive behavior, and overall quality.

**Read the web-design agent first** — it documents the full Realm design system, typography rules, component library, and design principles.

---

## Pre-Work

```bash
cat .claude/agents/web-design.md
cat client/src/components/ui/realm-index.ts
ls client/src/pages/
ls client/src/components/ui/
```

Understand what components and tokens are available before touching pages.

---

## Approach

Go through pages in priority order. For each page:

1. **Check token usage** — Any remaining raw Tailwind colors (`text-red-400`, `bg-gray-700`)? Replace with `realm-*` semantic tokens.
2. **Check component usage** — Is it using RealmPanel, RealmCard, RealmButton, RealmBadge, PageHeader, LoadingState, ErrorState where appropriate? Or hand-rolling its own versions?
3. **Check typography** — Page titles use `font-display text-realm-gold-400`? Body text uses `font-body text-realm-text-primary`? No `text-white`?
4. **Check spacing** — Consistent padding/margins? Not cramped or weirdly spaced?
5. **Check responsive** — Does it stack properly on mobile (375px)? Nothing overflows?
6. **Check hover/focus states** — Interactive elements have clear hover feedback?

### Priority Batches

**Batch A — Player's first impression (what new players see first):**
- LandingPage.tsx
- LoginPage.tsx
- RegisterPage.tsx
- RaceSelectionPage.tsx
- CharacterCreationPage.tsx

**Batch B — Daily gameplay loop (what players use every session):**
- DailyDashboard.tsx
- TownPage.tsx
- ProfilePage.tsx
- InventoryPage.tsx
- TravelPage.tsx

**Batch C — Economy (core game systems):**
- MarketPage.tsx
- CraftingPage.tsx
- ProfessionsPage.tsx
- TradePage.tsx
- JobsBoardPage.tsx

**Batch D — Social & Political (endgame engagement):**
- GovernancePage.tsx
- ElectionPage.tsx
- KingdomPage.tsx
- TownHallPage.tsx
- TavernPage.tsx
- GuildPage.tsx
- DiplomacyPage.tsx

**Batch E — Character & Exploration:**
- WorldMapPage.tsx
- CombatPage.tsx
- SkillTreePage.tsx
- QuestJournalPage.tsx
- CodexPage.tsx
- AchievementPage.tsx
- HousingPage.tsx
- ReportsPage.tsx

---

## Rules

- **This is polish, not redesign.** Same layout, same content, same functionality. Just consistent styling and component usage.
- **Use Realm components** wherever they make sense. If a page has a custom-styled button that RealmButton already handles, swap it.
- **Don't break functionality.** If a page has complex state management tied to specific DOM structure, be careful refactoring its JSX.
- **Mobile is secondary but important.** All pages should stack cleanly at 375px. Nothing should overflow horizontally.
- **Skip admin pages** — they're out of scope for player-facing polish.
- **Keep changes minimal per page.** If a page already looks good and uses realm tokens correctly, skip it and report "no changes needed."

---

## Verify

After each batch:

```bash
pnpm run build 2>&1 | tail -20
```

Must compile with 0 errors after every batch.

---

## Commit, push, and deploy after all batches

```bash
git add -A
git commit -m "style: page-by-page UI polish — consistent tokens, components, responsive behavior"
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

## Report

For each page, report one of:
- **POLISHED** — changes made (brief list)
- **SKIPPED** — already consistent, no changes needed
- **DEFERRED** — needs deeper work beyond polish (explain why)
