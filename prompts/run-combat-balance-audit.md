# Combat Balance Audit — Automated Battery via Batch Simulator

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- **This is an analysis task, not a code change.** You are RUNNING simulations and INTERPRETING results.
- Dump all detailed findings to the output file. Keep chat to summaries.
- If a run produces weird results, investigate — don't skip.
- Be honest about what the data shows. Don't spin bad balance as "interesting variety."

Read `cat CLAUDE.md` before starting.

---

## CONTEXT

### Just Deployed

A batch combat simulator: `POST /admin/combat/batch-simulate`

It accepts either explicit matchup lists or grid sweeps across race/class/level/monster combinations. It builds synthetic combatants with race-aware stats, level-appropriate gear, and runs fights through the real combat engine.

### Recent Combat Fixes (Now Live)

1. Armor AC fix — armor actually provides AC now
2. Quality multipliers — item quality affects combat
3. Equipment stat bonuses — gear stats apply to combatants
4. Enchantment bonuses — applied via calculateItemStats

### Game Data (Released Content Only)

- **7 released races** (Core only): Human, Elf, Dwarf, Harthfolk, Orc, Nethkin, Drakonid
  - 13 additional races exist (6 Common, 7 Exotic) but are locked behind `ContentRelease.isReleased`
  - DO NOT test unreleased races — they don't affect player experience
- **7 classes** (all released, no gating): Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion
  - Verify actual class names from `VALID_CLASSES` in `shared/src/data/skills/index.ts`
- 21 monsters across 3 tiers (L1-5, L5-10, L10-20) — all encounter-able
- ~35 released towns of 69 total

---

## THE TASK

Run 6 targeted simulation batteries, analyze the results, and produce a comprehensive balance report.

**First:** Check that the batch endpoint is working. Run a quick test:

```bash
curl -X POST https://realm-of-crowns.ambitioustree-37a1315e.eastus.azurecontainerapps.io/api/admin/combat/batch-simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "matchups": [{"race": "HUMAN", "class": "WARRIOR", "level": 5, "opponent": "Goblin", "iterations": 10}],
    "persist": false
  }'
```

If this doesn't work, check the endpoint URL, auth requirements, and request shape. Read `server/src/routes/admin/combat.ts` (or wherever the batch endpoint was added) to get the exact contract. You may need to get an admin auth token first — check how the admin simulation routes authenticate.

**If curl doesn't work for auth**, write a quick Node script that authenticates and calls the endpoint. Check existing test files or the simulation controller for how admin auth works.

Once the endpoint is confirmed working, run these batteries:

### Battery 1: Class Balance at Level 1 (Early Game)

**Purpose:** Are any classes non-viable at Level 1?

```json
{
  "grid": {
    "races": ["HUMAN"],
    "classes": ["ALL"],
    "levels": [1],
    "monsters": ["Goblin", "Giant Rat", "Slime"],
    "iterationsPerMatchup": 200
  },
  "persist": true,
  "notes": "Battery 1: Class balance at L1 vs Tier 1 monsters (Human only, isolates class)"
}
```

Fixing race to HUMAN isolates class differences. 7 classes × 3 monsters × 200 = 4,200 fights.

### Battery 2: Class Balance at Level 5 (Mid Game)

```json
{
  "grid": {
    "races": ["HUMAN"],
    "classes": ["ALL"],
    "levels": [5],
    "monsters": ["Orc Warrior", "Skeleton Warrior", "Giant Spider", "Dire Wolf"],
    "iterationsPerMatchup": 200
  },
  "persist": true,
  "notes": "Battery 2: Class balance at L5 vs Tier 2 monsters (Human only)"
}
```

7 classes × 4 monsters × 200 = 5,600 fights.

### Battery 3: Class Balance at Level 10 (Late Game)

```json
{
  "grid": {
    "races": ["HUMAN"],
    "classes": ["ALL"],
    "levels": [10],
    "monsters": ["Troll", "Young Dragon", "Lich"],
    "iterationsPerMatchup": 200
  },
  "persist": true,
  "notes": "Battery 3: Class balance at L10 vs Tier 2-3 monsters (Human only)"
}
```

7 classes × 3 monsters × 200 = 4,200 fights.

### Battery 4: Race Balance (All 7 Released Core Races)

**Purpose:** Do racial stat modifiers create meaningful but balanced differences?

Only 7 core races are released: Human, Elf, Dwarf, Harthfolk, Orc, Nethkin, Drakonid.
Common and Exotic races are locked behind ContentRelease and NOT player-accessible.

```json
{
  "grid": {
    "races": ["HUMAN", "ELF", "DWARF", "HARTHFOLK", "ORC", "NETHKIN", "DRAKONID"],
    "classes": ["WARRIOR"],
    "levels": [1, 5, 10],
    "monsters": ["Goblin", "Orc Warrior", "Young Dragon"],
    "iterationsPerMatchup": 150
  },
  "persist": true,
  "notes": "Battery 4: All 7 released core races as Warriors at L1/5/10"
}
```

Fixing class to WARRIOR isolates race differences. 7 races × 3 levels × 3 monsters × 150 = 9,450 fights.

### Battery 5: Race × Class Interaction (Released Content Only)

**Purpose:** Test whether race choice creates meaningful variety WITHIN each class, not just Warriors.

All 7 released races × all 7 classes at L5. This is the real player-experience test.

```json
{
  "grid": {
    "races": ["HUMAN", "ELF", "DWARF", "HARTHFOLK", "ORC", "NETHKIN", "DRAKONID"],
    "classes": ["WARRIOR", "MAGE", "ROGUE", "CLERIC", "RANGER", "BARD", "PSION"],
    "levels": [5],
    "monsters": ["Orc Warrior", "Giant Spider"],
    "iterationsPerMatchup": 100
  },
  "persist": true,
  "notes": "Battery 5: All 7 released races × all 7 classes at L5 vs Tier 2"
}
```

7 races × 7 classes × 2 monsters × 100 = 9,800 fights.

Verify class names from `VALID_CLASSES` in `shared/src/data/skills/index.ts` before running. If names differ from what's listed here, use whatever the code defines.

### Battery 6: Monster Difficulty Curve

**Purpose:** Does monster difficulty scale smoothly with level?

```json
{
  "grid": {
    "races": ["HUMAN"],
    "classes": ["WARRIOR"],
    "levels": [1, 3, 5, 7, 10, 15, 20],
    "monsters": ["ALL"],
    "iterationsPerMatchup": 100
  },
  "persist": true,
  "notes": "Battery 6: Human Warrior at all level tiers vs all 21 monsters — difficulty curve"
}
```

7 levels × 21 monsters × 100 = 14,700 fights.

---

## ANALYSIS

After all 6 batteries complete, pull the results and analyze. For each battery, the response includes per-matchup results AND pre-computed summary aggregations.

### Analysis Framework

**For each battery, compute and report:**

1. **Win rate table** — rows are the variable being tested (class, race, or level), columns are monsters. Color-code: red < 35%, yellow 35-45%, green 45-65%, yellow 55-65%, red > 65%.

2. **Outliers** — Any matchup with win rate < 30% or > 80%. These are the most urgent balance problems.

3. **Archetype analysis:**
   - Tank classes (Warrior, Paladin) — are they tankier now that armor works?
   - DPS classes (Rogue, Ranger) — competitive damage output?
   - Casters (Mage, Cleric, Warlock) — can they survive to cast?

4. **Scaling analysis** (Battery 6) — plot player win rate vs monster level for each player level tier. The ideal curve: ~80% win rate vs same-level monsters, dropping to ~20% vs monsters 5+ levels above.

### Key Questions to Answer

**A. Class Balance (Batteries 1-3):**
- Which class has the highest/lowest overall win rate at each level tier?
- Is any class below 30% win rate against level-appropriate monsters? (unviable)
- Is any class above 80%? (overpowered)
- How does the class ranking shift between L1, L5, and L10? (Do casters scale differently?)
- Now that armor works: how much do Warrior/Paladin win rates differ from Mage/Rogue?

**B. Race Balance (Battery 4 — 7 released core races):**
- Which of the 7 core races have the highest/lowest win rates as Warriors?
- Is the gap between best and worst race > 20 percentage points? (too much if so)
- Do Orc's STR bonus and Dwarf's CON bonus create dominant warriors?
- Does any core race fall below 35% against level-appropriate monsters?
- How does the spread change from L1 → L5 → L10? (expect convergence as gear outscales racial mods)

**B2. Race × Class Interaction (Battery 5):**
- Do caster races (Elf, Nethkin) outperform STR races when playing caster classes?
- Is race choice meaningful for every class, or does one race dominate all classes?
- Which race/class combos are the worst outliers?

**C. Monster Difficulty (Battery 6):**
- For a Level 1 Warrior, which monsters are > 50% death rate? (too dangerous for starters)
- For a Level 5 Warrior, are Tier 1 monsters still threatening? (they shouldn't be — should be ~90%+ win rate)
- For a Level 10 Warrior, are Tier 3 monsters appropriately challenging? (target: 40-60% win rate)
- Is there a smooth difficulty curve or are there sudden spikes?
- Any monster that's either trivial to everyone (0% death) or lethal to everyone (90%+ death)?

**D. Equipment Impact:**
- Compare L1 results (copper gear) to L10 results (steel gear) — does the gear tier difference show in the data?
- The armor fix should make L5+ characters noticeably tankier than L1 characters facing the same monsters

**E. The Armor Fix Specifically:**
- Without armor, a L5 Warrior had AC ~12 (10 + DEX). With armor, should be ~17-18 (10 + DEX + iron armor).
- This means monsters need ~5 more on their attack roll to hit. Is this visible in avg rounds? (fights should be longer at higher levels)

---

## OUTPUT

Write the full analysis to: `D:\realm_of_crowns\audits\combat-balance-audit.md`

Structure:

```markdown
# Combat Balance Audit — Post-Equipment-Fix Baseline
## Date: [date]

## Executive Summary
[5-8 sentences: overall health, biggest concerns, what's working]

## Battery Summary
| Battery | Purpose | Matchups | Fights | Duration |
|---------|---------|----------|--------|----------|
| 1 | Class @ L1 | ... | ... | ... |
| ... | ... | ... | ... | ... |

## A. Class Balance

### Level 1
[Win rate table: 7 classes × 3 monsters]
[Analysis: viable vs non-viable classes]

### Level 5
[Win rate table: 7 classes × 4 monsters]
[Analysis]

### Level 10
[Win rate table: 7 classes × 3 monsters]
[Analysis]

### Class Scaling Summary
[How each class performs across level tiers — who scales well, who falls off]

## B. Race Balance (7 Released Core Races)

### Core Races as Warriors (Battery 4)
[Win rate tables at L1/L5/L10, analysis]

### Race × Class Interaction (Battery 5)
[7 races × 7 classes grid at L5 — which race/class combos shine vs suffer]

### Race Balance Summary
[Gap between best and worst, whether race choice is meaningful per class, unviable combos]

## C. Monster Difficulty Curve (Battery 6)
[Level × Monster win rate matrix]
[Difficulty curve analysis — smooth vs spikey]
[Monsters that are too easy / too hard at each level tier]

## D. Equipment Impact
[Evidence from level comparisons, avg rounds analysis]

## E. Balance Red Flags (Priority Ordered)
1. [Most critical issue with data]
2. [Second most critical]
3. ...

## F. Recommendations
[Specific balance changes suggested, with expected impact]
- e.g., "Reduce Giant Rat HP from 25 to 18 — L1 win rate should improve from 32% to ~50%"
- e.g., "Mage base HP too low — increase hit die from d6 to d8 or add CON scaling"
```

### Chat Summary

In chat, give me:
```
Combat balance audit complete:
- [N] total fights across 6 batteries
- Top 3 red flags:
  1. [issue + data]
  2. [issue + data]
  3. [issue + data]
- Top 3 things working well:
  1. [what + data]
  2. [what + data]
  3. [what + data]
Full analysis: audits/combat-balance-audit.md
```

---

## DO NOT

- Do not modify any game code, combat engine, or balance numbers
- Do not modify monster stats
- Do not deploy anything
- Do not skip batteries that produce unexpected results — document them
- Do not fabricate or estimate data — only report actual simulation results
- If a battery fails (endpoint error, timeout), document the error and troubleshoot before moving on
- Do not run more than 500K total fights per battery (the endpoint has a limit)
