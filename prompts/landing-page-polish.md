# Prompt: Landing Page Polish — Color, Copy, Spacing

```
cat CLAUDE.md
cat .claude/agents/web-design.md
```

You are the Team Lead for a browser-based roleplay game project.

Be a truth-seeking collaborator, not a cheerleader.

---

## Context

The landing page redesign is deployed and the structure is good, but three things need fixing:

```bash
cat client/src/pages/LandingPage.tsx
```

---

## Fix 1: Color Warmth — Match Studio Site Atmosphere

The studio marketing site (`studio-website/`) has a richer, more atmospheric color palette with deep purple undertones. The game landing page currently uses the standard `realm-*` navy-blue tokens which feel flat by comparison.

**Do NOT change the game's design token system.** The `realm-*` tokens are correct for the game UI (dashboards, inventory, combat logs). But the **landing page is marketing** — it should feel cinematic, not utilitarian.

On the landing page ONLY, override the background treatment to use deeper, more atmospheric purples:

- Hero background: Replace the current gradient with something closer to the studio site's `radial-gradient(ellipse at top, #1a0a2e 0%, #07040F 60%)`. Use inline styles or add landing-page-specific CSS classes — do NOT change tailwind.config.js.
- The ambient glow effects should use purple-tinged radials (`rgba(106,79,160,0.2)`, `rgba(138,80,200,0.08)`) instead of pure blue.
- Section backgrounds: alternate between `#07040F` (near-black purple) and `#0D0618` (slightly lighter purple) instead of the current `realm-bg-800`/`realm-bg-900` alternation.
- Keep text colors as-is (`realm-text-primary`, `realm-gold-400`) — those work fine against the darker purples.

The goal: when someone lands on the page, it should feel like the same visual world as babecreststudios.com, then transition into the game UI's navy palette after login.

---

## Fix 2: Copy — "One Throne" Is Wrong

The tagline "20 Races · 29 Professions · One Throne" is factually wrong. The game has **multiple towns, each with their own elected government**. There is no single throne to compete for. The political system is about local governance, alliances between towns, and regional power — not a single seat of power.

Replace with something that's both accurate and punchy. Options:
- "20 Races · 29 Professions · Your Story"
- "20 Races · 29 Professions · Infinite Ambition"  
- "20 Races · 29 Professions · Every Decision Matters"
- "20 Races · 29 Professions · A World That Remembers"

Pick whichever reads best, or write something better. The key constraint: it must be factually accurate about how the game works.

Also check the rest of the copy for any other "one throne" or "single ruler" implications and fix them.

---

## Fix 3: Spacing — Too Much Dead Space

The page still has too much vertical padding between sections. Tighten it up:

- Hero section: reduce bottom padding. The gap between the CTA buttons and the scroll indicator / next section is too large.
- Between ALL sections: reduce vertical padding. Current `py-16` or `py-20` sections should be more like `py-12` or `py-14`. The page should feel dense and scrollable, not like each section is on its own island.
- Race grid section: tighten the gap between the intro text and the grid.
- "Three Steps to Aethermere" section: very compact — this is a quick visual, not a full section. `py-10` max.
- Final CTA section: tighten. It's just a headline, one line of text, and a button — doesn't need a full `py-20`.

The overall page should feel like one flowing narrative, not disconnected sections separated by voids.

---

## Verify

```bash
pnpm run build 2>&1 | tail -20
```

0 errors.

## Commit, push

```bash
git add -A
git commit -m "style: landing page polish — atmospheric purples, fix copy accuracy, tighten spacing"
git push
```

Then tell the user to trigger the GitHub Actions deploy workflow.

---

## Do NOT:
- Change tailwind.config.js — landing page overrides only
- Change any other pages
- Add new sections or features
- Change the page structure or component hierarchy
