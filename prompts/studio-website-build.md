# Prompt: Build Studio Website — Babe Crest Studios

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
- Common roles include (but aren't limited to):
  - **Game Designer** — Mechanics, systems, balance, progression, combat
  - **Narrative Designer** — Story, lore, dialogue, quests, world-building
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **UX/UI Designer** — Interface layout, player flow, menus, HUD, accessibility
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review
  - **Art Director** — Visual style, asset guidance, theming, mood and atmosphere

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies.
- Player experience is paramount. Every decision should serve immersion and engagement.
- Keep scope realistic for a browser game. Avoid over-engineering.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together.

---

## TASK: Build the Babe Crest Studios Marketing Website

The studio-website repo at the current working directory is a blank git repo (just `.gitignore` and git scaffolding). Build a complete, polished studio website from scratch.

This is the marketing site for **Babe Crest Studios LLC**, the indie studio behind the browser-based fantasy MMORPG **Realm of Crowns**, set in the world of **Aethermere**.

### Who is Babe Crest Studios

- Solo indie game studio based in Colorado Springs, CO
- Founded by a developer building the game they've always wanted to play
- Core philosophy: player interdependence, political depth, morally grey narrative
- The game: Realm of Crowns — a browser-based MMORPG with D&D-style mechanics, 20 playable races, 29 professions, player-driven economy, turn-based combat, and political systems with elected leadership
- Art direction: Netflix Arcane-inspired — painterly rendering, dramatic lighting, rich palettes
- Current state: Game is fully functional but uses placeholder art. Preparing for a Kickstarter campaign ($12,000 goal) to fund professional art commissions
- Think CD Projekt Red or Larian Studios website energy — not corporate, not cutesy. Confident and atmospheric.

---

## Step 1 — Scaffold the Project

```bash
# Ensure pnpm is available
pnpm --version || npm install -g pnpm

# Scaffold Vite + React + TypeScript
pnpm create vite . --template react-ts

# Install dependencies
pnpm install

# Install Tailwind + PostCSS
pnpm add -D tailwindcss@3 postcss autoprefixer
pnpx tailwindcss init -p

# Install UI and utility libs
pnpm add framer-motion lucide-react clsx tailwind-merge

# Install router
pnpm add react-router-dom
```

**Do NOT install** Radix UI, shadcn, or any other component library. Everything is hand-built with Tailwind.

### Important: This site will grow

This is the initial build but NOT a throwaway. The site will expand with more pages and sections over time (dev blog, Kickstarter page, community hub, press kit, etc.). Build the architecture to support growth:

- **Shared layout component** — Nav + Footer in a `Layout` wrapper so new pages get them automatically
- **Reusable section components** — Extract patterns (section headers, feature grids, CTAs) into composable components
- **Clean folder structure** — `components/`, `pages/`, `components/ui/`, `components/sections/`, `lib/`
- **Consistent naming** — components are PascalCase, files match component names
- **The router should be easy to extend** — adding a new page should be: create file in `pages/`, add route in `App.tsx`, done

---

## Step 2 — Configure Tailwind

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'studio': {
          'bg':        '#07040F',   // near-black purple
          'surface':   '#110820',   // card backgrounds
          'border':    '#2a1650',   // subtle borders
          'accent':    '#C9A84C',   // crown gold
          'accent-lt': '#F0D080',   // hover gold
          'muted':     '#7A6FA0',   // secondary text
          'text':      '#E8D5FF',   // primary text
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at top, #1a0a2e 0%, #07040F 60%)',
        'gold-gradient': 'linear-gradient(135deg, #F0D080 0%, #C9A84C 50%, #8a6a1f 100%)',
      },
      boxShadow: {
        'glow-gold':  '0 0 30px rgba(201,168,76,0.25)',
        'glow-soft':  '0 0 60px rgba(106,79,160,0.2)',
        'card':       '0 4px 24px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease-out forwards',
        'fade-in':    'fadeIn 0.4s ease-out forwards',
        'float':      'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:     { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        float:      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        glowPulse:  { '0%,100%': { boxShadow: '0 0 20px rgba(201,168,76,0.2)' }, '50%': { boxShadow: '0 0 40px rgba(201,168,76,0.5)' } },
      },
    },
  },
  plugins: [],
}
```

---

## Step 3 — Global CSS

Replace `src/index.css` entirely:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

@layer base {
  html { @apply bg-studio-bg text-studio-text antialiased; scroll-behavior: smooth; }
  body { @apply min-h-screen; background: theme('backgroundImage.hero-gradient'); }
  
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { @apply bg-studio-bg; }
  ::-webkit-scrollbar-thumb { @apply bg-studio-border rounded-full; }
  ::-webkit-scrollbar-thumb:hover { @apply bg-studio-accent; }
}

@layer components {
  .btn-gold {
    @apply inline-flex items-center gap-2 px-6 py-3 font-body font-semibold text-sm
           bg-studio-accent text-studio-bg rounded-sm
           hover:bg-studio-accent-lt transition-all duration-200
           shadow-glow-gold hover:shadow-glow-gold;
  }
  .btn-outline {
    @apply inline-flex items-center gap-2 px-6 py-3 font-body font-semibold text-sm
           border border-studio-accent text-studio-accent rounded-sm
           hover:bg-studio-accent hover:text-studio-bg transition-all duration-200;
  }
  .section-label {
    @apply font-display text-xs tracking-[0.25em] uppercase text-studio-accent;
  }
  .card {
    @apply bg-studio-surface border border-studio-border rounded-sm shadow-card
           hover:border-studio-accent/30 transition-colors duration-300;
  }
}
```

---

## Step 4 — Utility Helper

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

---

## Step 5 — Vite Config

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173, open: true },
})
```

---

## Step 6 — Component Architecture & Router

### Folder Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx          # Shared wrapper: Nav + children + Footer
│   │   ├── Navbar.tsx           # Fixed top nav (used on StudioPage, future pages)
│   │   └── Footer.tsx           # Shared footer
│   ├── ui/
│   │   ├── GoldButton.tsx       # Reusable gold CTA button
│   │   ├── OutlineButton.tsx    # Reusable outline button
│   │   ├── SectionHeader.tsx    # Section label + title + optional subtitle
│   │   ├── Divider.tsx          # Decorative gold diamond divider
│   │   └── AnimatedSection.tsx  # Framer Motion whileInView wrapper
│   └── sections/
│       ├── HeroSection.tsx      # Reusable hero (title, subtitle, CTA)
│       ├── FeatureGrid.tsx      # 3-column icon + title + desc grid
│       └── GameCard.tsx         # Game showcase card
├── pages/
│   ├── ComingSoon.tsx           # Route: /
│   └── StudioPage.tsx           # Route: /studio
├── lib/
│   └── utils.ts                 # cn() helper
└── App.tsx                      # Router
```

Extract every repeated pattern into a component. When we add pages later (dev blog, press kit, Kickstarter page, community hub), they should be able to compose from these building blocks without copy-pasting.

### Router: `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ComingSoon from './pages/ComingSoon'
import StudioPage from './pages/StudioPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ComingSoon />} />
        <Route path="/studio" element={<StudioPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Two-layer structure:
- **`/` (Coming Soon)** — the public-facing page while the game is in development. Standalone (no Layout wrapper — it's a full-bleed cinematic page).
- **`/studio` (Full Marketing Site)** — wrapped in `<Layout>` (Nav + Footer). Future pages will also use this wrapper.

---

## Step 7 — Build the Pages

### Page 1: `src/pages/ComingSoon.tsx`

Full-viewport Coming Soon page:

- Dark hero background with a faint radial purple glow (use the `hero-gradient` from Tailwind config)
- **Babe Crest Studios** logo text in Cinzel font with gold gradient (`bg-gold-gradient bg-clip-text text-transparent`)
- Tagline: *"Forging worlds from myth and shadow"*
- Game title: **Realm of Crowns** — with subtitle *"A browser-based MMORPG. Player-driven. Politically charged. Morally grey."*
- Email signup: input field + "Notify Me" gold button
  - NOT functional yet — just styled. Add a `// TODO: integrate Mailchimp or ConvertKit` comment
  - Copy above input: *"Be the first to enter Aethermere"*
- Animated floating decorative element — a crown SVG or decorative diamond glyph (pure CSS/SVG, no external image assets)
- Decorative divider — thin horizontal line with a centered diamond glyph (♦ or ⟡) in gold
- Footer at bottom: `© 2025 Babe Crest Studios LLC` and a subtle text link: "About the Studio →" linking to `/studio`
- Use **Framer Motion** for staggered entrance animations on all text elements (fade-up with delay offsets)
- The page should feel mysterious, cinematic, and inviting — like discovering something secret

### Page 2: `src/pages/StudioPage.tsx`

Full marketing site with these sections, scrolling single-page layout:

**Navigation Bar:**
- Fixed top, backdrop blur (`backdrop-blur-md bg-studio-bg/80`)
- Babe Crest Studios wordmark (Cinzel, gold) on left
- Nav links on right: About, Games, Philosophy, Contact (smooth scroll to sections)
- Mobile: hamburger menu that slides in
- Transition: starts transparent, gains solid background on scroll

**Hero Section:**
- Full viewport height
- Same dark atmospheric gradient as Coming Soon page
- Headline: *"We build worlds worth getting lost in."*
- Subtext: 2-3 sentences about the studio vision — making games that respect players' intelligence, reward cooperation, and tell stories worth telling
- CTA: gold button scrolling down to the Games section

**About Section:**
- Section label in gold: "THE STUDIO"
- 2-column layout on desktop (stacks on mobile)
- Left column: 3-4 paragraphs about the studio
  - Solo indie developer, Colorado Springs, CO
  - D&D player who wanted to build the game that doesn't exist yet
  - Player-first philosophy — no pay-to-win, no shortcuts, no solo-sufficient builds
  - Building in public, community-driven development
- Right column: stat grid or feature callouts
  - "20 Playable Races" / "29 Professions" / "7 Character Classes" / "1 Developer"
  - Styled as cards or bold typographic elements

**Games Section:**
- Section label: "GAMES"
- Single game card for Realm of Crowns (centered, wide):
  - Dark card with gold border on hover (`card` class + hover glow)
  - Game title in Cinzel + "In Development" badge (gold outline badge)
  - 2-3 sentence description of the game: browser-based fantasy MMORPG where every player matters, economies are player-driven, and political power is earned not given
  - Feature tags: Fantasy, MMORPG, Browser-based, Turn-based Combat, Player Economy, Political Systems
  - "Coming Soon to Kickstarter" button (links to `/` for now)

**Philosophy Section:**
- Section label: "DESIGN PHILOSOPHY"
- 3-column grid on desktop, stacks on mobile
- Each column: Lucide icon (gold), bold heading (Cinzel), 2-line description (Inter)
  - ⚔️ **Player Interdependence** — "No solo-sufficient builds. Every profession matters. Your success depends on other players."
  - 🏛️ **Political Depth** — "Kingdoms rise and fall by player hands. Elections, diplomacy, and betrayal — all player-driven."
  - ⚖️ **Morally Grey Narrative** — "No chosen heroes. No clear villains. Just choices, consequences, and a world that remembers."
- Use Lucide React icons: `Swords`, `Landmark`, `Scale` (or closest equivalents)

**Contact Section:**
- Section label: "GET IN TOUCH"
- Centered, simple
- Email: `contact@babecreststudios.com` (styled as a clickable mailto link)
- GitHub: link to `github.com/Tonyb311` 
- Brief text: "For press inquiries, collaboration, or just to say hello."

**Footer:**
- Studio name in Cinzel
- `© 2025 Babe Crest Studios LLC · Colorado Springs, CO`
- Tagline: *"Forging worlds from myth and shadow"*
- Social media icon placeholders (Discord, Twitter/X, Reddit) — link to `#` for now, add `// TODO: add real social links` comment
- Back-to-top button

---

## Step 8 — Design Rules (FOLLOW THESE)

- **No stock photos, no external images, no placeholder images.** Use CSS gradients, SVG decorations, and typography as the visual language. We don't have art yet — that's what the Kickstarter is for.
- **Decorative dividers** — thin horizontal lines with a centered diamond or crown glyph (♦ or ⟡) in gold. Use these between major sections.
- **Gold accents are sparse** — headlines, CTAs, borders on hover, section labels. Not splashed everywhere.
- **Typography hierarchy** — Cinzel for all display/headings, Inter for body. This contrast IS the visual identity.
- **Subtle background texture** — faint radial gradient overlays or noise patterns to avoid flat dead backgrounds. Can use a tiny CSS pseudo-element with a repeating pattern.
- **Mobile responsive** — all sections stack cleanly on small screens. Nav collapses to hamburger. Test at 375px, 768px, 1024px, 1440px breakpoints.
- **Hover states on everything interactive** — buttons, cards, nav links, social icons. Smooth transitions (200-300ms).
- **Framer Motion for scroll-triggered animations** — sections fade in as they enter viewport. Use `whileInView` with `once: true`. Keep animations subtle — no spinning, no bouncing. Just clean fade-up reveals.

---

## Step 9 — Create CLAUDE.md

Create a `CLAUDE.md` at the project root with operational context for future Claude Code sessions:

```markdown
# Babe Crest Studios Website — CLAUDE.md

## Project
Marketing website for Babe Crest Studios LLC (babecreststudios.com).
Studio behind the browser-based fantasy MMORPG "Realm of Crowns".

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS 3 with custom `studio-*` design tokens
- Framer Motion for scroll animations
- Lucide React for icons
- React Router for page routing
- **pnpm** (not npm) — all commands use `pnpm run`, `pnpm add`, etc.

## Design System
- Fonts: Cinzel (display), Inter (body)
- Colors: defined as `studio-*` tokens in tailwind.config.js
- Gold accents on near-black purple backgrounds
- No external images — CSS-only visuals until Kickstarter art is commissioned
- Component classes: `.btn-gold`, `.btn-outline`, `.section-label`, `.card`

## Architecture
This site is designed to grow. Adding a new page = create file in pages/, add route, done.

- `src/components/layout/` — Layout, Navbar, Footer (shared across all pages except ComingSoon)
- `src/components/ui/` — Reusable atomic components (buttons, dividers, section headers, animation wrappers)
- `src/components/sections/` — Composable page sections (hero, feature grid, game card)
- `src/pages/` — Route-level page components
- `src/lib/` — Utility functions

## Current Routes
- `/` — Coming Soon (standalone, no Layout wrapper)
- `/studio` — Full marketing site (uses Layout wrapper)

## Deployment
- Target: Azure Static Web Apps (free tier)
- Domain: babecreststudios.com
- Build: `pnpm run build` → outputs to `dist/`
- SPA routing: `staticwebapp.config.json` handles fallback to index.html
- Deploy via Azure CLI or GitHub Actions

## Conventions
- Components are PascalCase, file names match component names
- Use `cn()` helper from `src/lib/utils.ts` for conditional classes
- Extract repeated patterns into components — no copy-pasting between pages
- Framer Motion `whileInView` with `once: true` for scroll animations
```

---

## Step 10 — Create staticwebapp.config.json

Create `staticwebapp.config.json` in the project root for Azure Static Web Apps:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.ico", "/*.png", "/*.svg"]
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "mimeTypes": {
    ".json": "application/json"
  }
}
```

---

## Step 11 — Build Check & Commit

```bash
# Verify TypeScript compiles clean
pnpm run build 2>&1 | tail -30
```

Fix ALL TypeScript errors. Build must pass with 0 errors, 0 warnings.

```bash
# Verify dev server starts
pnpm run dev &
sleep 3
curl -s http://localhost:5173 | head -20
kill %1
```

Then commit and push:

```bash
git add -A
git commit -m "feat: studio website — Coming Soon + full marketing site (React + Vite + Tailwind)"
git push
```

---

## Deliverables Checklist

When complete, report:
1. Dev server URL (should be `http://localhost:5173`)
2. List of all files/components created
3. Confirmation that build passes with 0 errors
4. Items that need a real backend later (email signup, contact form)
5. Any design decisions you made that Tony should review
6. Screenshot-worthy — confirm the Coming Soon page looks polished enough to share publicly

## Do NOT:
- Over-engineer this. Two pages, clean design, ship it.
- Add a blog, CMS, or any backend functionality.
- Install component libraries (Radix, shadcn, MUI, etc.).
- Generate or reference any art assets we don't have.
- Add analytics or tracking scripts (we'll add those later).
- Create unnecessary abstractions — this is a marketing site, not a component library.

## DO:
- Make it look like a studio that takes their craft seriously.
- Ensure both pages share the same visual DNA — navigating between them should feel like expansion, not a different site.
- Write compelling but honest marketing copy that reflects the game's actual features (20 races, 29 professions, player-driven economy, political systems, turn-based combat).
- Use the correct lore names: Halflings = Harthfolk, Dragonborn = Drakonid, Tieflings = Nethkin. The world is called Aethermere.
- Keep the codebase simple enough that updating text content is obvious.
- Score well on Lighthouse (performance, accessibility, SEO basics).
