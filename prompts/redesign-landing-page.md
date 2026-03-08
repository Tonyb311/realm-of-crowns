# Prompt: Redesign Game Landing Page

```
cat CLAUDE.md
cat .claude/agents/web-design.md
cat .claude/agents/lore-narrative.md
```

You are the Team Lead for a browser-based roleplay game project.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

---

## Context

The game's landing page (`client/src/pages/LandingPage.tsx`) is uninspiring. It's the first thing players see and it needs to immediately communicate what this game IS and why someone should care. Currently it's a dark void with a title, a vague tagline, and some flat cards.

**Read the current page first:**
```bash
cat client/src/pages/LandingPage.tsx
```

Also read the studio website's Coming Soon page for reference — it has the atmospheric quality we want:
```bash
cat ../studio-website/src/pages/ComingSoon.tsx
```

---

## Problems to Fix

### 1. The hero tells you nothing
"Forge alliances. Seize power. Rule the realm." could be any strategy game. A visitor has NO idea this is:
- A browser-based game (no download)
- An MMORPG with D&D mechanics
- Free to play
- Something they can start right now

### 2. Wrong race names (lore violation)
The page still uses D&D names:
- "Halfling" → should be **Harthfolk**
- "Tiefling" → should be **Nethkin**
- "Dragonborn" → should be **Drakonid**

### 3. Dead visual energy
No atmospheric effects, no scroll animations, no glow, no personality. Compare to the studio site which has radial gradient glows, Framer Motion stagger animations, and typographic presence. This page has none of that.

### 4. Race cards clip off the right edge
The horizontal scroll race cards cut off the Orc card, looking broken.

### 5. Too much dead space
Massive empty gaps between sections. The page feels like it's 50% void.

### 6. Key selling points buried
"Free to play. No downloads. Begin now." is the LAST thing on the page. It should be one of the FIRST things people see.

### 7. Feature icons are generic
Two of the four feature icons are literally the same star shape. The icons don't communicate anything about their feature.

---

## The Redesign

Rewrite `client/src/pages/LandingPage.tsx` from scratch. Keep the same route (`/`) and the same navigation targets (register/login). Change everything else.

### Install Framer Motion if not already in the game client
```bash
pnpm add framer-motion
```

Also add lucide-react if not already installed:
```bash
pnpm add lucide-react
```

### New Page Structure

**Section 1: Hero (full viewport)**
- Game title "Realm of Crowns" in Cinzel with gold glow effect (`drop-shadow` + subtle `text-shadow`)
- Atmospheric background: radial gradient glow (dark purple/navy center fading to near-black, similar to studio site's `hero-gradient` effect but using `realm-*` tokens)
- **Subtitle that actually explains the game:** Something like: *"A free browser-based MMORPG where every player shapes the world. No downloads. No pay-to-win. Just a realm that needs a ruler."*
- Below that, a punchy one-liner like: *"20 races. 29 professions. One throne."* or similar — concrete numbers that show scale
- Two CTA buttons: "Create Your Character" (primary) and "Sign In" (secondary)
- **Key badges visible in the hero:** Small, elegant badges or text showing "Free to Play" · "Browser-Based" · "No Downloads" — these should be above or near the CTA buttons, not buried at the bottom
- Framer Motion staggered fade-up animation on all hero elements
- Subtle floating particle/glow animation (CSS only — a slow-moving radial gradient or pulsing glow, not actual particles)
- Scroll indicator arrow at bottom

**Section 2: What Makes This Different (feature pillars)**
- Section title: something better than "A Living World Awaits" — try: *"Not Your Average MMO"* or *"Built Different"* or *"A World That Fights Back"*
- 4 feature cards with DISTINCT Lucide icons:
  - **Player-Driven Politics** — icon: `Crown` or `Landmark` — "Elect mayors. Pass laws. Overthrow tyrants. Every town is governed by its players."
  - **D&D-Style Combat** — icon: `Swords` or `Shield` — "Turn-based combat with class abilities, saving throws, and tactical depth inspired by tabletop RPGs."
  - **Living Economy** — icon: `Pickaxe` or `Hammer` — "29 professions. No character is self-sufficient. The blacksmith needs the miner who needs the merchant."
  - **Explore Aethermere** — icon: `Map` or `Compass` — "Journey between towns through dangerous roads. Trade across regions. Discover a world that remembers."
- Cards should have hover effects (border glow, slight scale) and Framer Motion scroll-triggered fade-in
- Tighter spacing than current — no massive gaps

**Section 3: The Races of Aethermere**
- Section title and brief intro text
- Fix ALL race names to lore names:
  - Halfling → **Harthfolk**
  - Tiefling → **Nethkin**
  - Dragonborn → **Drakonid**
- Race cards in a responsive GRID (not horizontal scroll) — 3-4 columns on desktop, 2 on tablet, 1 on mobile
- Show all 7 released races, not a clipped scrolling strip
- Each card: race name (Cinzel, gold), one-line description, subtle border glow on hover
- Below the grid: a teaser line like *"13 more races unlocking as the realm grows..."* to hint at the 20-race scope

**Section 4: How It Works (optional — only if it fits naturally)**
- 3 simple steps: "Create a character" → "Choose your path" → "Shape the realm"
- Keep this SHORT — 3 icons with one-liners, not paragraphs
- This helps new visitors understand the onboarding flow

**Section 5: Final CTA**
- "Your Story Begins Now" or similar
- Repeat the key value props: free, browser-based, no downloads
- Large CTA button
- Framer Motion fade-in

**Footer**
- Keep the existing footer structure but ensure it uses realm tokens consistently
- Add link to studio site: "A Babe Crest Studios game" linking to babecreststudios.com (or /studio)

---

## Design Requirements

- **Use Framer Motion** for scroll-triggered animations (`whileInView` with `once: true`). Stagger the hero elements. Fade-in feature cards as they enter viewport.
- **Atmospheric background effects** — radial gradient glows, subtle vignette. The page should feel like entering a dimly lit fantasy hall, not staring at a flat dark screen.
- **Use Lucide React icons** — they're cleaner and more distinct than the current hand-drawn SVGs where two icons are identical.
- **Use `realm-*` design tokens** exclusively. No raw Tailwind colors. Check `tailwind.config.js` for available tokens.
- **Use existing Realm components** where appropriate: `RealmButton`, `RealmPanel`, `RealmCard`, etc. Check `realm-index.ts` for what's available.
- **Responsive:** Must look good at 375px (mobile), 768px (tablet), 1024px, and 1440px.
- **Gold accents are sparse** — title, icons, card borders on hover, CTAs. Not splashed everywhere.
- **Typography:** Cinzel for headings, Inter for body. The title "Realm of Crowns" should be the visual anchor of the page.
- **No external images.** CSS-only atmospheric effects. We don't have art yet.

---

## What NOT to Change

- Route stays at `/`
- Navigation targets: `/register` for new players, `/login` for returning players
- Keep it a single component file — no need to extract sub-components unless it genuinely helps readability
- Don't add any new API calls or backend dependencies
- Don't modify any other files except LandingPage.tsx (plus package.json if installing framer-motion/lucide-react)

---

## Verify

```bash
pnpm run build 2>&1 | tail -20
```

Must compile with 0 errors.

## Commit, push, and deploy

```bash
git add -A
git commit -m "feat: redesign landing page — atmospheric hero, better copy, lore names, scroll animations"
git push
```

Then tell the user to trigger the GitHub Actions deploy workflow.
