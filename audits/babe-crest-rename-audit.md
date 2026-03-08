# Babe Crest Rename Audit

## Findings — "Babe Craft" occurrences (excluding the audit prompt itself)

### Source Code (must fix)

| # | File | Line(s) | Pattern |
|---|------|---------|---------|
| 1 | `landing_page/index.html` | 332, 335 | "Babe Craft Studios LLC" |
| 2 | `client/src/pages/LandingPage.tsx` | 438 | `https://babecraftstudios.com` |
| 3 | `client/src/pages/LandingPage.tsx` | 443 | "A Babe Craft Studios game" |
| 4 | `.claude/agents/studio-finance.md` | 3 | "Babe Craft Studios LLC" |
| 5 | `studio-website/package.json` | 2 | `"babe-craft-studios-website"` |
| 6 | `studio-website/CLAUDE.md` | 1, 4, 36 | "Babe Craft Studios", `babecraftstudios.com` |
| 7 | `studio-website/index.html` | 6, 7 | "Babe Craft Studios" |
| 8 | `studio-website/src/pages/ComingSoon.tsx` | 63, 123 | "Babe Craft Studios" |
| 9 | `studio-website/src/pages/StudioPage.tsx` | 45, 64, 160, 163 | "Babe Craft Studios", `babecraftstudios.com` |
| 10 | `studio-website/src/components/layout/Footer.tsx` | 19, 22 | "Babe Craft Studios" |
| 11 | `studio-website/src/components/layout/Navbar.tsx` | 33 | "Babe Craft Studios" |
| 12 | `studio-website/.claude/worktrees/agitated-hamilton/` | multiple | Stale worktree — multiple files |

### Prompt Files (reference material, still fix)

| # | File | Line(s) | Pattern |
|---|------|---------|---------|
| 13 | `prompts/codebase-optimization-critical-important.md` | 394 | "Babe Craft Studios" |
| 14 | `prompts/prompt-pre-kickstarter-landing-page.md` | 115, 117 | "Babe Craft Studios LLC" |
| 15 | `prompts/landing-page-polish.md` | 37 | `babecraftstudios.com` |
| 16 | `prompts/redesign-landing-page.md` | 124 | "A Babe Craft Studios game", `babecraftstudios.com` |
| 17 | `prompts/studio-website-build.md` | 1, 45, 49, 51, 291, 299, 309, 354, 360, 385, 388, 421 | Multiple variants |

---

## Verification — PASS

Re-ran `(?i)babe.?craft` search across entire repo (excluding node_modules, pnpm-lock.yaml, .git).

**Result: 0 remaining incorrect occurrences.**

Only matches are in meta-documents that describe the rename task:
- `audits/babe-crest-rename-audit.md` (this file — documents what was found)
- `prompts/audit-fix-babe-crest-rename.md` (the task prompt itself)

### Files fixed (20 total)

**Source code (11 files):**
1. `landing_page/index.html` — 2 occurrences
2. `client/src/pages/LandingPage.tsx` — 2 occurrences
3. `.claude/agents/studio-finance.md` — 1 occurrence
4. `studio-website/package.json` — 1 occurrence
5. `studio-website/CLAUDE.md` — 4 occurrences
6. `studio-website/index.html` — 2 occurrences
7. `studio-website/src/pages/ComingSoon.tsx` — 2 occurrences
8. `studio-website/src/pages/StudioPage.tsx` — 4 occurrences
9. `studio-website/src/components/layout/Footer.tsx` — 2 occurrences
10. `studio-website/src/components/layout/Navbar.tsx` — 1 occurrence
11. `studio-website/.claude/worktrees/agitated-hamilton/` — 5 files, ~20 occurrences

**Prompt files (5 files):**
12. `prompts/codebase-optimization-critical-important.md` — 1 occurrence
13. `prompts/prompt-pre-kickstarter-landing-page.md` — 2 occurrences
14. `prompts/landing-page-polish.md` — 1 occurrence
15. `prompts/redesign-landing-page.md` — 2 occurrences
16. `prompts/studio-website-build.md` — ~15 occurrences
