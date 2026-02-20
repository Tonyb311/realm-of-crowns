# Prompt: Execute All 6 Profession Seed Pipeline Fixes

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- Keep analysis brief in chat. Write all detailed output to files.
- Minimize tool calls — batch reads where possible.
- Make surgical, minimal changes. Do not refactor surrounding code.

---

## YOUR TASK: Execute 6 Seed Pipeline Fixes in One Pass

### Context

A team audit (commit 756f73b) identified 6 fixes needed in the seed pipeline. All 29 professions work in production today, but `npm run seed` on a fresh database breaks 4 professions because some templates and recipes only exist in standalone scripts, not the main pipeline.

**Reference docs:**
- `docs/profession-audit-report.md` — full audit with line numbers and file locations
- `docs/profession-fix-queue.md` — ordered fix list with exact instructions

**Read both docs first.** They contain the exact file paths, line numbers, and template definitions you need. Do not guess — use the audit data.

### The 6 Fixes

Execute these in order. Each fix is small and surgical.

---

### Fix 1: TANNER — Add 3 intermediate templates to main pipeline

**File:** `database/seeds/recipes.ts`
**Action:** Add 3 templates to the `ITEM_TEMPLATES` array.
**Source:** Copy the exact definitions from `database/seeds/run-tanner.ts` (lines ~112, ~129, ~146).

Add these 3 item templates:
- **Cured Leather** — MATERIAL, rarity: COMMON, professionRequired: TANNER, levelRequired: 3
- **Wolf Leather** — MATERIAL, rarity: FINE, professionRequired: TANNER, levelRequired: 7
- **Bear Leather** — MATERIAL, rarity: SUPERIOR, professionRequired: TANNER, levelRequired: 7

Match the exact field structure of existing templates in `ITEM_TEMPLATES`. Include description, baseValue, stackable, maxStack, etc. as defined in the standalone script.

**Verify:** After adding, confirm that `TANNER_RECIPES` in `shared/src/data/recipes/tanner.ts` references these exact output names. The recipe output names must match the template names character-for-character.

---

### Fix 2: WOODWORKER — Add 4 templates + wire 14 finished goods into pipeline

**File 1:** `database/seeds/recipes.ts`
**Action:** Add 4 intermediate templates to `ITEM_TEMPLATES`.
**Source:** Copy from `database/seeds/run-recipes.ts` (lines ~1142-1145).

Add these 4 item templates:
- **Wooden Dowels** — MATERIAL, WOODWORKER L3
- **Wooden Handle** — MATERIAL, WOODWORKER L5
- **Bow Stave** — MATERIAL, WOODWORKER L8
- **Wooden Frame** — MATERIAL, WOODWORKER L12

Match existing template field structure. Get exact values from the standalone script.

**File 2:** `database/seeds/index.ts`
**Action:** Wire `WOODWORKER_FINISHED_GOODS` (14 recipes) into the main seed pipeline.

The recipes are already exported from `shared/src/data/recipes/woodworker.ts` as `WOODWORKER_FINISHED_GOODS`. They just need to be imported and seeded.

**Approach (pick the cleaner option after reading the code):**
- **Option A:** Add a `seedWoodworkerGoods()` function in the seed pipeline and call it from `index.ts`
- **Option B:** Import `WOODWORKER_FINISHED_GOODS` into an existing seed function like `seedRecipes()` and loop through them alongside `ALL_PROCESSING_RECIPES`

Choose whichever approach is more consistent with how other recipe groups are already seeded. Do not invent a new pattern — follow the existing one.

**Verify:** Confirm that the 14 recipe output names all have matching templates (either existing or newly added).

---

### Fix 3: LEATHERWORKER — Verify (no code change expected)

**Action:** After Fix 1 and Fix 2, verify that all 13 LEATHERWORKER recipes in `shared/src/data/recipes/armor.ts` (LEATHERWORKER section) have their input templates resolvable:
- Cured Leather, Wolf Leather, Bear Leather → added in Fix 1
- Wooden Frame, Wooden Handle → added in Fix 2

**If all inputs resolve:** No code change needed. Note verification in commit message.
**If something is still missing:** Fix it. Document what was missing that the audit didn't catch.

---

### Fix 4: COOK — Deduplicate 6+2 recipe IDs

**The problem:** 6 recipeIds exist in BOTH `shared/src/data/recipes/cook.ts` (as RecipeDefinition) and `shared/src/data/recipes/consumables.ts` (as ConsumableRecipe). The ConsumableRecipe versions are canonical because they include `consumableStats` (hunger/thirst/HP restoration). Additionally, 2 of those IDs (`cook-grilled-fish`, `cook-fish-stew`) appear TWICE within `consumables.ts` itself.

**Duplicate IDs to resolve:**

| recipeId | cook.ts | consumables.ts (1st) | consumables.ts (2nd) |
|----------|---------|---------------------|---------------------|
| cook-grilled-fish | ✓ | ✓ | ✓ (triple dupe) |
| cook-fish-stew | ✓ | ✓ | ✓ (triple dupe) |
| cook-berry-jam | ✓ | ✓ | — |
| cook-herbal-tea | ✓ | ✓ | — |
| cook-apple-pie | ✓ | ✓ | — |
| cook-berry-tart | ✓ | ✓ | — |

**Action:**

**Step 1 — Determine canonical versions.** Read both files. For each duplicate:
- Check `docs/profession-economy-master.yaml` for the intended recipe inputs
- The ConsumableRecipe version (with `consumableStats`) is almost certainly correct
- But verify ingredients match the YAML source of truth

**Step 2 — Remove duplicates from `cook.ts`.** Delete the 6 duplicate recipe entries from `COOK_RECIPES` in `cook.ts`. Leave all non-duplicated COOK recipes untouched.

**Step 3 — Fix intra-file duplicates in `consumables.ts`.** For `cook-grilled-fish` and `cook-fish-stew`, which each appear twice in `consumables.ts`:
- Determine which version has the correct ingredients per YAML
- Remove the incorrect duplicate
- If both differ from YAML, fix the remaining one to match YAML

**Step 4 — Verify.** Count remaining unique COOK recipeIds across both files. There should be zero duplicates. Document the final count.

**IMPORTANT:** Do NOT remove non-duplicated recipes from `cook.ts`. Some COOK recipes may legitimately only exist in `cook.ts` (non-consumable outputs like Flour). Only remove the 6 that are duplicated in `consumables.ts`.

---

### Fix 5: TAILOR — Remove orphaned legacy templates

**File:** `database/seeds/recipes.ts`
**Action:** Remove 2 orphaned template entries from `ITEM_TEMPLATES`:
- **"Woven Wool"** (~line 211) — legacy name, no recipe outputs this. Canonical name is "Woven Cloth" (line 235).
- **"Silk Cloth"** (~line 221) — legacy name, no recipe outputs this. Canonical name is "Silk Fabric" (line 255).

**Verify before removing:** Search the entire codebase for any reference to "Woven Wool" or "Silk Cloth" in recipe inputs, outputs, or game logic. If anything references these names, update the reference to the canonical name instead of just deleting the template.

---

### Fix 6: BLACKSMITH — Fold 28 specialization recipes into main pipeline

**Source:** `shared/src/data/recipes/blacksmith.ts` exports specialization recipes (Toolsmith/Weaponsmith/Armorer branches, 28 recipes).
**Currently seeded by:** `database/seeds/run-recipes.ts` (standalone only).

**Action:** Wire these 28 recipes into the main seed pipeline.

**Approach:** Look at how `seedWeaponRecipes()` in the main pipeline already seeds the 33 melee weapon recipes from `weapons.ts`. Follow the same pattern:
- Import the blacksmith specialization recipes
- Either extend `seedWeaponRecipes()` or create a parallel `seedBlacksmithSpecializations()` function
- Add the call to `index.ts` if creating a new function

**Verify:** All 28 recipes have matching input AND output templates in the main pipeline. If any templates are missing, add them.

---

### Post-Fix Verification

After all 6 fixes, run a comprehensive check:

**1. Compile check:**
```bash
cd server && npx tsc --noEmit
```
No TypeScript errors should be introduced.

**2. Recipe ID uniqueness check:**
Write a quick script or grep to verify zero duplicate recipeIds across ALL recipe files in `shared/src/data/recipes/`.

**3. Template coverage check:**
For every recipe in the codebase, verify that:
- All input item names have matching templates in `ITEM_TEMPLATES` or other seed sources
- All output item names have matching templates

**4. Document any unexpected findings** in the commit message.

---

### What NOT To Do

- Do NOT refactor surrounding code. Surgical additions and deletions only.
- Do NOT modify recipe logic, crafting mechanics, or game balance.
- Do NOT change the seed execution order in `index.ts` unless absolutely necessary.
- Do NOT delete the standalone scripts yet (that's Fix 7, separate task). Just add to the main pipeline.
- Do NOT modify the YAML source of truth. Code changes only.

### Commit, Push, Deploy, Seed

After all fixes pass verification:

```bash
git add -A
git commit -m "fix: seed pipeline - 6 fixes for fresh DB reproducibility

- Fix 1: TANNER - added Cured/Wolf/Bear Leather templates to main pipeline
- Fix 2: WOODWORKER - added 4 intermediate templates + wired 14 finished goods
- Fix 3: LEATHERWORKER - verified all inputs resolve (no code change)
- Fix 4: COOK - deduplicated 6+2 recipe IDs across cook.ts and consumables.ts
- Fix 5: TAILOR - removed orphaned Woven Wool and Silk Cloth templates
- Fix 6: BLACKSMITH - folded 28 specialization recipes into main pipeline

Refs: profession-audit-report.md, profession-fix-queue.md"
git push
```

Then deploy and run the seed in production to ensure everything is live:

```bash
# Deploy to Azure
[use the project's standard Azure deployment command]

# Run database seed in production
[use the project's standard production seed command]
```

If the production seed command is unclear, check `package.json` scripts or previous deployment docs. The seed must run against the production database to make these changes live.
