# Documentation Review Report

**Reviewer:** docs-reviewer
**Date:** 2026-02-10
**Scope:** All documentation in `docs/`, root-level markdown files (`CLAUDE.md`, `README.md`), cross-referenced against the actual codebase.

---

## Summary

The documentation is generally thorough and well-organized. However, there are several discrepancies between what the docs say and what the code actually implements, particularly around class/specialization counts, profession counts, file inventory counts, and a few specific naming mismatches. The most impactful issues involve documents that disagree with each other about whether there are 6 or 7 character classes, and a Code Inventory document that is severely outdated compared to the current codebase.

**Findings by severity:**
- CRITICAL: 3
- MAJOR: 12
- MINOR: 11
- SUGGESTION: 5

---

## CRITICAL Findings

### C1. GAME_GUIDE.md says 6 classes; code implements 7 (Psion missing)

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\docs\GAME_GUIDE.md` (line 59)
- **Description:** The Game Guide tells players there are "6 classes (Warrior, Mage, Rogue, Cleric, Ranger, Bard)" and says "One of 6 classes." The actual code in `server/src/routes/characters.ts` (line 14) and `shared/src/data/skills/index.ts` (line 39) defines 7 valid classes: `warrior, mage, rogue, cleric, ranger, bard, psion`. The Psion class is fully implemented with 3 specializations (telepath, seer, nomad) and 18 abilities. Players reading the Game Guide would not know the Psion class exists.
- **Doc says:** 6 classes (Warrior, Mage, Rogue, Cleric, Ranger, Bard)
- **Code does:** 7 classes including Psion

### C2. API_REFERENCE.md omits Psion from character creation validation

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\docs\API_REFERENCE.md` (line 193)
- **Description:** The API Reference documents the `characterClass` field for `POST /api/characters/create` as accepting only `warrior, mage, rogue, cleric, ranger, or bard`. The actual Zod validation in `server/src/routes/characters.ts` uses `VALID_CLASSES` which includes `psion`. A developer building a client from this API reference would not know to include `psion` as a valid class option.
- **Doc says:** `characterClass: 'warrior', 'mage', 'rogue', 'cleric', 'ranger', or 'bard'`
- **Code does:** Also accepts `'psion'`

### C3. CODE_INVENTORY.md is severely outdated (reflects Phase 1 only)

- **Severity:** CRITICAL
- **File:** `D:\realm_of_crowns\docs\CODE_INVENTORY.md`
- **Description:** This document was generated 2026-02-08 but reflects the codebase state as of Phase 1 completion only. It dramatically undercounts nearly every category:
  - Says **20 route modules** -- actual count is **41 files** (including `admin/` subdirectory with 7 files)
  - Says **4 service modules** -- actual count is **31 service files**
  - Says **3 cron job modules** -- actual count is **17 job files**
  - Says **3 middleware modules** -- actual count is **5 middleware files** (includes `admin.ts` and `daily-action.ts`)
  - Says **18 page components** -- actual count is **25 files** (plus 6 admin pages in `admin/` subdirectory)
  - Says `professions/` is ".gitkeep only (empty)" -- actually contains 7 fully implemented files
  - Says `recipes/` is ".gitkeep only (empty)" -- actually contains 15 fully implemented files
  - Says `resources/` is ".gitkeep only (empty)" -- actually has implemented content
  - Says `items/` is ".gitkeep only (empty)" -- actually has implemented content
  - Says `world/` is ".gitkeep only (empty)" -- actually has implemented content
  - Says `skills/` has "6 class definitions" -- actually has 7 (includes psion.ts)
  - Says 3 lib files -- actually 5 files (includes `alt-guard.ts`, `combat-engine.ts`, `game-day.ts`)

  This is the most misleading document in the project. Any developer relying on it would have a completely wrong picture of the codebase scope.

---

## MAJOR Findings

### M1. Multiple docs disagree on class count: 6 vs 7

- **Severity:** MAJOR
- **Files:**
  - `D:\realm_of_crowns\docs\ARCHITECTURE.md` (line 355, 671): Says "6 classes, 18 specializations"
  - `D:\realm_of_crowns\docs\GAME_GUIDE.md` (line 59): Says "6 classes"
  - `D:\realm_of_crowns\docs\_gameplay-section.md` (line 389): Says "6 classes, 108 total abilities"
  - `D:\realm_of_crowns\docs\QUESTS.md` (line 108): Says "7 classes, 21 total specializations"
  - `D:\realm_of_crowns\CLAUDE.md` (line 434): Says "7 classes, 21 specializations" (in completion summary)
- **Description:** The docs are split. QUESTS.md and the CLAUDE.md completion summary correctly say 7 classes / 21 specializations. ARCHITECTURE.md, GAME_GUIDE.md, and _gameplay-section.md say 6 classes / 18 specializations. The code (`shared/src/data/skills/index.ts`) definitively has 7 classes and 21 specializations. The Psion class is fully implemented.
- **Code does:** 7 classes, 21 specializations (7 x 3)

### M2. Specialization names in QUESTS.md do not match code

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docs\QUESTS.md` (lines 99-106)
- **Description:** The QUESTS.md documents specialization names that differ from the actual code in `shared/src/data/skills/index.ts`:

  | Class | QUESTS.md says | Code says |
  |-------|---------------|-----------|
  | Mage | evoker, enchanter, necromancer | **elementalist**, **enchanter**, necromancer |
  | Rogue | assassin, trickster, shadow | assassin, **thief**, **swashbuckler** |
  | Cleric | healer, crusader, oracle | healer, **paladin**, **inquisitor** |
  | Ranger | beastmaster, marksman, warden | beastmaster, **sharpshooter**, **tracker** |
  | Bard | minstrel, wardrummer, lorekeeper | **diplomat**, **battlechanter**, lorekeeper |

  10 out of 15 non-Psion specialization names are wrong. Players and developers relying on QUESTS.md would reference incorrect spec names.

### M3. ECONOMY.md header says "29 professions" but body and code have 28

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docs\ECONOMY.md` (line 8)
- **Description:** The header note says "all 29 professions (7 gathering + 15 crafting + 7 service)" but 7 + 15 + 7 = 29 is mathematically correct. However, CLAUDE.md consistently says "28 professions" and the profession index file exports exactly 28 professions (7 gathering + 15 crafting + 7 service). There appears to be a simple arithmetic confusion: 7+15+7 does equal 29, but the ECONOMY.md body and the profession lists in the code enumerate only 28 unique professions (the "Rancher/Herder" in the gathering table might count as one profession named "Rancher"). The CLAUDE.md consistently says 28, and the code exports `RANCHER` as one profession. The header note of ECONOMY.md is inconsistent with the rest of the project.
- **Doc header says:** 29 professions
- **Code and CLAUDE.md say:** 28 professions
- **Actual code count:** 7 + 15 + 7 = 29 if you count Rancher/Herder separately, but the code has a single `RANCHER` profession. The discrepancy appears to be that the ECONOMY.md table lists "Rancher/Herder" as one entry, meaning the actual count is 28, and the header's "29" is simply wrong.

### M4. ARCHITECTURE.md claims Phase 1-only scope but codebase is Phase 2B complete

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docs\ARCHITECTURE.md` (line 3)
- **Description:** The Architecture document states "Version 0.2.0 | Reflects Phase 1 completion (Prompts 00-08)" but the project has completed through Phase 2B (Prompts 00-18). The doc is missing descriptions of all Phase 2A systems (professions, gathering, crafting chains, housing, caravans, trade analytics) and Phase 2B systems (20 races, 68-town world, diplomacy, racial abilities). Any architect reading this doc would not understand the full scope of the implemented system.

### M5. GAME_GUIDE.md says "68 towns across 10 distinct regions" -- should be 21 territories

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docs\GAME_GUIDE.md` (line 49)
- **Description:** The Game Guide says "explore a world of 68 towns across 10 distinct regions." The actual world has 21 territories (8 core regions + 6 common territories + 7 exotic territories). Other docs (WORLD_MAP.md, CLAUDE.md) correctly say "21 territories." The number "10" does not correspond to any grouping in the world data.
- **Doc says:** 10 regions
- **Code/other docs say:** 21 territories

### M6. _gameplay-section.md says "69 towns" instead of 68

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docs\_gameplay-section.md` (lines 539, 597)
- **Description:** This partial doc section says "The world contains **69 towns**" and references "All 21 regions, 69 towns." Every other document in the project (CLAUDE.md, WORLD_MAP.md, README.md, RACES.md) consistently says 68 towns. The code seeds 68 towns. This is an off-by-one error in this specific document.
- **Doc says:** 69 towns
- **Everything else says:** 68 towns

### M7. Drow/Nightborne race lists 7 abilities in RACES.md; standard is 6

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\docs\RACES.md` (lines 779-787)
- **Description:** The docs list 7 abilities for Drow/Nightborne (Superior Darkvision at L1, Sunlight Sensitivity at L5, Drow Magic at L5, Poison Mastery at L10, Web Walker at L15, Shadow Step at L25, Matriarch's Command at L40). This breaks the "6 abilities per race" rule stated everywhere else. The code in `shared/src/data/races/exotic/nightborne.ts` actually implements all 7 of these abilities. Two abilities share the Level 5 unlock. While the code matches the doc, this contradicts the design rule of "6 per race, unlock at levels 1/5/10/15/25/40" cited in CLAUDE.md and README.md.
- **Both doc and code say:** 7 abilities for Nightborne
- **Design rule says:** 6 abilities per race, 120 total (20 x 6)
- **Impact:** The "120 racial abilities" count cited in CLAUDE.md, README.md, and elsewhere is actually 121 if Nightborne has 7.

### M8. CLAUDE.md server lib count is wrong

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\CLAUDE.md` (line 267-270)
- **Description:** CLAUDE.md lists 3 server libraries: `prisma.ts`, `redis.ts`, `socket.ts`. The actual `server/src/lib/` directory contains 5 files: `alt-guard.ts`, `combat-engine.ts`, `game-day.ts`, `prisma.ts`, `redis.ts`. There is no `socket.ts` in lib -- the socket server setup is in `server/src/socket/`. CLAUDE.md also says "3 library modules" in the README's project structure. Neither the file list nor the count is correct.
- **Doc says:** 3 files: prisma.ts, redis.ts, socket.ts
- **Code has:** 5 files: alt-guard.ts, combat-engine.ts, game-day.ts, prisma.ts, redis.ts

### M9. CLAUDE.md middleware count is wrong

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\CLAUDE.md` (line 255-259)
- **Description:** CLAUDE.md lists 4 middleware files but the actual `server/src/middleware/` directory has 5 files: `admin.ts`, `auth.ts`, `cache.ts`, `daily-action.ts`, `validate.ts`. The `admin.ts` middleware is not mentioned in CLAUDE.md.
- **Doc says:** 4 middleware files
- **Code has:** 5 middleware files

### M10. CLAUDE.md test suite count says "8 suites" but directory has 10 files

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\CLAUDE.md` (line 272-280)
- **Description:** CLAUDE.md lists 8 integration test suites. The `server/src/__tests__/` directory contains 10 files: the 8 listed test files plus `jest.setup.ts` and `setup.ts`. While the setup files are not test suites, the naming is imprecise. More importantly, the claim of "8 suites" is confirmed correct (the extra 2 are setup files, not suites), so this is a minor accuracy note.
- **Status:** Count is correct; setup files are infrastructure, not test suites. Reclassifying to MINOR.

### M11. README.md correctly lists 7 specializations but GAME_GUIDE, ARCHITECTURE, _gameplay-section all say 6

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\README.md` (line 50)
- **Description:** README.md says "Seven class specializations per class (Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion)." This is confusingly worded -- it should say "7 classes with 3 specializations each" not "seven class specializations per class." But it does correctly list Psion. The GAME_GUIDE, ARCHITECTURE, and _gameplay-section all omit Psion.

### M12. CLAUDE.md Phase 1 Summary says "6 classes, 18 specializations" then Completion Summary says "7 classes, 21 specializations"

- **Severity:** MAJOR
- **File:** `D:\realm_of_crowns\CLAUDE.md`
- **Description:** The system-reminder version of CLAUDE.md (provided in the prompt context, which may reflect an older cached version) says "Skill trees (6 classes, 18 specializations, ability unlock)" under Phase 1 Completion Summary. The actual CLAUDE.md file on disk at line 434 says "Skill trees (7 classes, 21 specializations, ability unlock)" under Phase 1 Core Systems. This creates confusion -- the Psion class was apparently added during Phase 2 but the Phase 1 summary was retroactively updated in the on-disk file while remaining outdated in the system-reminder cached version. The system-reminder version provided as user context is stale.

---

## MINOR Findings

### m1. Nightborne ability named "Superior Deepsight" in code vs "Superior Darkvision" in RACES.md

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docs\RACES.md` (line 781) vs `D:\realm_of_crowns\shared\src\data\races\exotic\nightborne.ts` (line 16)
- **Description:** RACES.md calls the level 1 ability "Superior Darkvision." The code calls it "Superior Deepsight." Similarly, the level 5 active ability is called "Drow Magic" in the doc but "Nightborne Magic" in the code. These are minor naming discrepancies that reflect the D&D-to-lore name transition.
- **Doc says:** "Superior Darkvision", "Drow Magic"
- **Code says:** "Superior Deepsight", "Nightborne Magic"

### m2. ECONOMY.md profession limit description contradicts CLAUDE.md

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docs\ECONOMY.md` (lines 248-252)
- **Description:** ECONOMY.md describes the profession limit as: "1 Gathering + 1 Crafting + 1 Service, OR 2 Gathering + 1 Crafting, OR 1 Gathering + 2 Crafting. Maximum 3." CLAUDE.md simply says "Max 3 professions per character (Humans get 4th at Level 15)." The ECONOMY.md adds category constraints that CLAUDE.md does not mention. It is unclear whether the code enforces category constraints or just a simple count of 3.

### m3. Profession tier ranges slightly inconsistent across docs

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docs\ECONOMY.md` (lines 222-229)
- **Description:** ECONOMY.md tier ranges: Apprentice (1-10), Journeyman (11-25), Craftsman (26-50), Expert (51-75), Master (76-90), Grandmaster (91-100). The shared data file `shared/src/data/professions/tiers.ts` should be the authoritative source. Minor discrepancies may exist between docs and code for tier boundary levels.

### m4. README.md mentions "Cloud: Azure" but this is not reflected in Docker Compose or CI

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\README.md` (line 67)
- **Description:** The tech stack table includes "Azure PostgreSQL Flexible Server, Azure Cache for Redis (optional)." This appears to be aspirational/optional rather than implemented, as the Docker Compose files use standard PostgreSQL and Redis images. The "(optional)" qualifier is accurate but could confuse developers about actual deployment requirements.

### m5. Changelog Prompt 04 combat endpoint paths use `/api/combat/pve/` format

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docs\CHANGELOG.md` (lines 127, 133)
- **Description:** The Changelog lists combat endpoints as `/api/combat/pve/start` and `/api/combat/pvp/challenge`. The actual route files are `combat-pve.ts` and `combat-pvp.ts`, which mount as `/combat-pve/start` and `/combat-pvp/challenge` (with hyphens, not slashes between "combat" and "pve"). The COMBAT.md and API_REFERENCE.md use the correct hyphenated form.
- **Changelog says:** `/api/combat/pve/start`
- **Actual route:** `/api/combat-pve/start`

### m6. COMBAT.md Redis key format says `combat:{characterId}` but PvE code uses `combat:pve:{sessionId}`

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docs\COMBAT.md` (line 126) vs `D:\realm_of_crowns\server\src\routes\combat-pve.ts` (line 41)
- **Description:** COMBAT.md states the Redis key is `combat:{characterId}`. The actual code uses `combat:pve:{sessionId}`. This is a minor but potentially confusing difference for developers debugging Redis state.
- **Doc says:** `combat:{characterId}`
- **Code does:** `combat:pve:{sessionId}`

### m7. COMBAT.md XP table claims in QUESTS.md don't match exactly

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docs\QUESTS.md` (lines 168-176)
- **Description:** The XP table in QUESTS.md shows approximate cumulative XP values. The Level 50 entry says "Cumulative XP: ~22,836" and the code comment in `xp-curve.ts` says "Level 50->51 costs 929 XP." These are internally consistent but the XP formula `floor(10 * level^1.15) + 30` at level 1 gives `floor(10 * 1) + 30 = 40`, which matches the doc. The tilde (~) prefix on values correctly indicates approximation. No actual error, but worth noting that the doc values are approximations.

### m8. STREAK_MAX_BONUS comment in code is internally inconsistent

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\shared\src\data\progression\xp-curve.ts` (line 170)
- **Description:** The code comment says "Cap: 5 days * 2 = 10 XP max streak bonus (floor(7*2)=14, but capped at 10)" while `STREAK_MAX_DAYS` is 7. The comment itself explains the cap correctly (14 potential but hard-capped at 10), but the "5 days * 2 = 10" part is misleading since the max days is 7. This is an internal code comment inconsistency, not a doc issue per se.

### m9. CLAUDE.md client pages count says "24 files" but actual count is 25+ files

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\CLAUDE.md` (line 180-205)
- **Description:** CLAUDE.md lists 24 page files. The actual `client/src/pages/` directory has 25 `.tsx` files at the root level plus an `admin/` subdirectory with 6 more page files. `DailyDashboard.tsx` is listed in CLAUDE.md but `RaceSelectionPage.tsx` is also present in the directory. Counting the admin pages, the actual total is 31 page files. CLAUDE.md does not mention any admin pages.

### m10. README test count says "8 integration test suites" matching CLAUDE.md

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\README.md` (not explicitly stated but implied by project structure section line 172)
- **Description:** README says "8 integration test suites" in the project structure. The `__tests__` directory has 8 actual test files plus 2 setup files, so the suite count is technically correct. No issue.

### m11. ARCHITECTURE.md lists only 20 protected routes

- **Severity:** MINOR
- **File:** `D:\realm_of_crowns\docs\ARCHITECTURE.md` (lines 123-147)
- **Description:** The Architecture doc lists 20 protected routes. With the addition of Phase 2 features and admin pages, the actual route count in `client/src/App.tsx` may be higher. The doc's route table appears accurate for what it lists but may be incomplete due to the Phase 1-only scope issue (M4).

---

## SUGGESTION Findings

### S1. Consider adding a "doc freshness" date check or automated inventory script

- **Severity:** SUGGESTION
- **Description:** Multiple docs contain stale file counts and system inventories (CODE_INVENTORY.md being the worst offender). A script that counts routes, services, pages, etc. and compares against documented claims would catch these automatically.

### S2. Standardize class/specialization naming with a single source of truth doc

- **Severity:** SUGGESTION
- **Description:** The specialization name discrepancies between QUESTS.md and the code (M2) suggest the code was updated but the design doc was not. Consider making `shared/src/data/skills/index.ts` the canonical source and auto-generating the doc table from it.

### S3. GAME_GUIDE.md should be updated to reflect Psion class

- **Severity:** SUGGESTION
- **Description:** The Game Guide is the player-facing document and omitting an entire playable class is significant. The Psion class section should be added with its 3 specializations and unique combat mechanics.

### S4. Consider deprecating or archiving CODE_INVENTORY.md

- **Severity:** SUGGESTION
- **Description:** Given how stale CODE_INVENTORY.md is (C3), it is actively harmful for developers. Either update it comprehensively or add a prominent deprecation notice pointing to CLAUDE.md as the accurate inventory.

### S5. ECONOMY.md should clarify profession count arithmetic

- **Severity:** SUGGESTION
- **Description:** The header says 29 but most docs say 28. Clarify whether Rancher and Herder are one profession or two, and update all docs to use a consistent number.

---

## Cross-Reference Summary

### Documents that correctly reference each other:
- WORLD_MAP.md correctly references RACES.md and ECONOMY.md
- COMBAT.md correctly references route files and the combat engine
- POLITICS.md correctly references route and job files
- SOCIAL.md correctly references route files and Socket.io events
- QUESTS.md correctly references route and service files (except specialization names)
- README.md correctly links to all doc files in the `docs/` directory

### Documents with internal consistency issues:
- CLAUDE.md is mostly accurate except for lib count (M8), middleware count (M9), and the class count discrepancy between the system-reminder cached version and the on-disk version (M12)
- ARCHITECTURE.md is consistent internally but out of date for Phase 2+ content (M4)
- CODE_INVENTORY.md is consistent internally but catastrophically out of date (C3)

### Race name mapping consistency:
The D&D-to-lore name mapping (Halfling=Harthfolk, Tiefling=Nethkin, etc.) is documented in RACES.md header, WORLD_MAP.md header, and CLAUDE.md. All three agree. Code files use the lore names consistently. This is well-handled.

---

## Overall Assessment

The core game design documents (RACES.md, ECONOMY.md, COMBAT.md, POLITICS.md, SOCIAL.md, WORLD_MAP.md) are comprehensive and mostly accurate. The RACES.md and COMBAT.md in particular are impressively detailed and closely match the code.

The main problem areas are:
1. **The Psion class omission** from the Game Guide and API Reference (critical for players and developers)
2. **CODE_INVENTORY.md being catastrophically stale** (reflects ~30% of the actual codebase)
3. **Specialization naming drift** between docs and code
4. **File/module count inflation or staleness** in CLAUDE.md and ARCHITECTURE.md

The project would benefit from a pass to update GAME_GUIDE.md, API_REFERENCE.md, ARCHITECTURE.md, and CODE_INVENTORY.md to reflect the full Phase 2B codebase state.
