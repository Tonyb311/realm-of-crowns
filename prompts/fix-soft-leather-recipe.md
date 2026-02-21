# Fix: Add Soft Leather Recipe to TANNER

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

- This is a browser-based RPG. All solutions should target web technologies (HTML, CSS, JavaScript/TypeScript, Canvas/WebGL where appropriate, and relevant backend stacks).
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Consider both solo and multiplayer implications when relevant.
- Keep scope realistic for a browser game. Avoid over-engineering or suggesting AAA-scale solutions.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together and flags open questions or next steps.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Keep the game's vision consistent across all teammate contributions.
- Always end with a clear summary of what was delivered and what still needs the user's input.

---

## Task: Add Soft Leather Recipe to TANNER Profession

### The Bug

Multiple downstream crafting recipes (10+ BLACKSMITH weapon recipes, 3+ STABLE_MASTER mount gear recipes) reference "Soft Leather" as an input ingredient. The "Soft Leather" ItemTemplate exists in the database. However, **no recipe in the game produces Soft Leather**. The TANNER profession produces "Cured Leather" instead, which is a different item used for armor recipes.

This means:
- BLACKSMITH cannot craft any weapon that requires a grip wrap (Copper Dagger, Copper Sword, Iron Dagger, Iron Sword, Iron Longsword, Steel Dagger, Steel Sword, Steel Longsword, Steel Greatsword — all blocked)
- STABLE_MASTER cannot craft Saddle, Horse Armor, or War Saddle
- LEATHERWORKER and ARMORER are also partially starved since some of their recipes reference Soft Leather
- Players have zero way to obtain this item

### Root Cause

The TANNER seed file (`database/seeds/run-tanner.ts`) defines:
- "Cured Leather" (id: `material-cured_leather`, L3, 2 Animal Pelts → 1) — used in TANNER's own armor recipes
- No "Soft Leather" recipe exists

Meanwhile, `shared/src/data/recipes/weapons.ts` and other recipe files reference `{ itemName: 'Soft Leather', quantity: 1 }` as a crafting input.

### The Fix

Add a **Soft Leather recipe** to TANNER as a Level 1 Apprentice recipe. This is thematically correct — Soft Leather is a simpler, lighter tanning process (for weapon grips, satchels, padding) while Cured Leather is a harder, more involved process (for armor). Two processing tracks from the same raw material:

| Recipe | Level | Input | Output | Purpose |
|--------|-------|-------|--------|---------|
| **Tan Soft Leather** (NEW) | 1 | 1× Animal Pelts | 1× Soft Leather | Weapon grips, padding, light goods |
| Cure Leather (existing) | 3 | 2× Animal Pelts | 1× Cured Leather | Armor, heavy leather goods |

### Implementation Steps

#### Step 1: Verify the Soft Leather ItemTemplate exists

Check the database for the existing Soft Leather item template:
```sql
SELECT id, name, slug, type, rarity, "baseValue" FROM item_templates WHERE name = 'Soft Leather';
```

If it exists, note the ID. If it does NOT exist, check `database/seeds/recipes.ts` around line 150-161 where it's defined:
```typescript
{
  name: 'Soft Leather',       // ~line 152
  type: 'MATERIAL',
  rarity: 'COMMON',
  description: 'Supple tanned leather, ideal for light armor and clothing.',
  stats: {},
  durability: 100,
  // ...
}
```

Also check `database/seeds/base-value-propagation.ts` around line 447 where it has a base value assigned:
```typescript
'Soft Leather': 12,   // ~line 447
```

The template SHOULD already exist from previous seeding. If for some reason it doesn't, create it with these values:
- name: "Soft Leather"
- type: MATERIAL
- rarity: COMMON
- baseValue: 12
- professionRequired: TANNER
- levelRequired: 1

#### Step 2: Add Soft Leather Recipe to TANNER Seed

In `database/seeds/run-tanner.ts`, add the recipe to the `RECIPES` array as the FIRST entry (before "Cure Leather"):

```typescript
{
  recipeId: 'tan-soft-leather',
  name: 'Tan Soft Leather',
  levelRequired: 1,
  tier: 1,
  inputs: [{ itemName: 'Animal Pelts', quantity: 1 }],
  outputName: 'Soft Leather',
  xpReward: 8,
  craftTime: 15,
},
```

**IMPORTANT:** The seed script resolves item names via `templateMap`. "Animal Pelts" is already defined in `TANNER_ITEMS` (id: `resource-animal_pelts`), so the lookup will succeed. BUT "Soft Leather" may NOT be in `templateMap` since TANNER_ITEMS doesn't include it — the template was seeded by a different seed file.

To fix this, EITHER:

**Option A (preferred):** Add Soft Leather to the `TANNER_ITEMS` array in the seed file:
```typescript
{
  id: 'material-soft_leather',
  name: 'Soft Leather',
  type: 'MATERIAL',
  rarity: 'COMMON',
  description: 'Supple tanned leather, ideal for weapon grips, satchels, and light padding.',
  stats: {},
  durability: 100,
  professionRequired: 'TANNER',
  levelRequired: 1,
  isFood: false,
  foodBuff: null,
  isPerishable: false,
  shelfLifeDays: null,
  isBeverage: false,
  baseValue: 12,
},
```

**Option B:** After Step 1 (TANNER_ITEMS upsert), add a lookup for Soft Leather similar to how the script already looks up "Iron Ore Chunks", "Silver Ore", etc. in the `resourceNames` section:
```typescript
const resourceNames = ['Iron Ore Chunks', 'Silver Ore', 'Wood Logs', 'Hardwood', 'Soft Leather'];
```

Either option works. Option A is more self-contained. Choose whichever keeps the code cleaner.

#### Step 3: Add to YAML (Source of Truth)

Update `docs/profession-economy-master.yaml` in the TANNER section. Add under apprentice recipes:

```yaml
TANNER:
  apprentice:
    - name: "Tan Soft Leather"
      recipe_id: tan-soft-leather
      level: 1
      inputs:
        - item: "Animal Pelts"
          qty: 1
      output: "Soft Leather"
      output_qty: 1
      base_value: 12
      xp: 8
      craft_time: 15
      notes: "Primary source of Soft Leather for BLACKSMITH weapon grips and STABLE_MASTER saddles"
```

Find the TANNER section first — it should be around lines 200-400 in the YAML. Place this recipe BEFORE the existing "Cure Leather" recipe.

#### Step 4: Verify the Shared Recipe Files Reference "Soft Leather" Correctly

The downstream recipes in `shared/src/data/recipes/weapons.ts` already reference `{ itemName: 'Soft Leather', quantity: 1 }`. These do NOT need to change — once Soft Leather is craftable by TANNERs, players (and bots) will be able to buy it on the market and use it as input.

Do a quick search to confirm the exact item name used:
```bash
grep -r "Soft Leather" shared/src/data/recipes/
```

Make sure the name matches exactly (case-sensitive) with what the TANNER recipe outputs.

#### Step 5: Run the Seed

Locally:
```bash
cd database
DATABASE_URL=<your_local_db_url> npx tsx seeds/run-tanner.ts
```

Verify output includes:
```
+ Soft Leather (MATERIAL / COMMON)
...
+ Tan Soft Leather (TANNER APPRENTICE, Lvl 1)
```

Then verify in DB:
```sql
SELECT * FROM recipes WHERE name = 'Tan Soft Leather';
```

#### Step 6: Verify Supply Chain Unblocked

After seeding, manually test:
1. A TANNER character can see "Tan Soft Leather" in their recipe list
2. With 1× Animal Pelts in inventory, they can craft 1× Soft Leather
3. A BLACKSMITH can then use that Soft Leather to craft a Copper Dagger

### Deployment

After all changes verified locally:
```bash
git add -A
git commit -m "fix: add Soft Leather recipe to TANNER — unblocks BLACKSMITH/STABLE_MASTER supply chain"
git push origin main
```

Then build and deploy:
```bash
cd server
docker build -t realmofcrowns.azurecr.io/realm-of-crowns-server:$(git rev-parse --short HEAD) .
docker push realmofcrowns.azurecr.io/realm-of-crowns-server:$(git rev-parse --short HEAD)
az containerapp update --name realm-of-crowns-server --resource-group realm-of-crowns-rg --image realmofcrowns.azurecr.io/realm-of-crowns-server:$(git rev-parse --short HEAD)
```

Then seed production:
```bash
az containerapp exec --name realm-of-crowns-server --resource-group realm-of-crowns-rg --command "npx tsx database/seeds/run-tanner.ts"
```

### What NOT To Do

- Do NOT rename "Soft Leather" to "Cured Leather" in downstream recipes — these are intentionally different items (soft vs cured have different purposes)
- Do NOT modify `shared/src/data/recipes/weapons.ts` or any downstream recipe files — they're correct, the problem is the missing source
- Do NOT change the existing Cured Leather recipe or its pricing
- Do NOT add Soft Leather as a gathering resource — it's a processed material that should come from TANNER crafting
- Do NOT change Item IDs for any existing templates — only add new ones if needed

### Expected Impact

This single recipe addition unblocks:
- 9+ BLACKSMITH weapon recipes (Copper Dagger through Steel Greatsword)
- 3 STABLE_MASTER mount gear recipes (Saddle, Horse Armor, War Saddle)
- Several LEATHERWORKER and ARMORER recipes that also reference Soft Leather
- Estimated 10-15 crafting recipes total that were previously impossible to complete
