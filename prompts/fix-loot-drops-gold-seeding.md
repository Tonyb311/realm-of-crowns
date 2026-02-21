# Fix Combat Loot Drops + Gold Rebalance + Seeding Gap

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

## Task: Three Fixes Before Sim v8 Rerun

### Context

Simulation v8 ran 50 bots for 50 ticks. Results in `prompts/sim-v8-results.md`. Two critical failures blocked the combat loot pipeline test, plus a gold inflation problem:

1. **P0-1:** Zero item drops from 76 combat victories — `processItemDrops()` is not working
2. **P0-2:** ENCHANTER/SCRIBE never assigned by diverse seeding — 11 professions skipped entirely
3. **P2-1:** Gold inflated 102% (5,000g → 10,110g) — partly because animals/creatures that shouldn't carry gold are dropping it

---

## Fix 1: Debug and Fix processItemDrops() — P0 CRITICAL

This is the #1 blocker. 76 combat victories, zero item drops. Gold and XP work fine, but items never drop.

### Investigation Steps

1. **Read `server/src/lib/road-encounter.ts`** — Find where combat victory is handled after `resolveRoadEncounter()`. Look for where/if `processItemDrops()` from `server/src/lib/loot-items.ts` is called.

2. **Trace the exact code path:**
   - Road encounter triggers → combat resolves → victory detected → what happens next?
   - Is `processItemDrops()` actually called? Or is there a conditional that skips it?
   - Is it called but the monster's loot table data is missing/empty at that point?
   - Is it called but failing silently (try/catch swallowing the error)?

3. **Common failure patterns to check:**
   - The function is never imported or called in the victory path
   - The monster object passed to processItemDrops() doesn't have loot table data populated (Prisma didn't include the relation)
   - The loot table references item template names that don't match actual item definitions
   - A try/catch wraps the call and swallows errors without logging
   - The function runs inside a transaction that rolls back due to an unrelated error
   - The drop chance calculation results in 0% effective drop rate

4. **Add diagnostic logging** at every step of the loot drop path:
   ```typescript
   console.log(`[LOOT] Combat victory vs ${monster.name} — checking loot table`);
   console.log(`[LOOT] Monster loot entries: ${JSON.stringify(monster.lootTableEntries || 'NONE')}`);
   console.log(`[LOOT] Processing ${entries.length} loot entries...`);
   // For each entry:
   console.log(`[LOOT] Rolling for ${entry.itemName}: chance=${entry.dropChance}, rolled=${roll}, dropped=${dropped}`);
   ```

5. **Fix whatever is broken.** The fix could be anything from a missing function call to a Prisma include to a name mismatch. Find the actual root cause, don't guess.

6. **Verify the fix** — After fixing, you can do a quick manual test: seed 5 bots, run 3 ticks, check server logs for the `[LOOT]` diagnostic output confirming items actually dropped. Or query the database directly:
   ```sql
   SELECT i.name, i.quantity, inv.character_id 
   FROM items i 
   JOIN inventories inv ON i.id = inv.item_id 
   WHERE i.source = 'combat' OR i.name IN ('Animal Pelts', 'Bones', 'Arcane Reagents', 'Enchanted Essence')
   ORDER BY i.created_at DESC LIMIT 20;
   ```

---

## Fix 2: Remove Gold Drops from Non-Sentient Monsters

### The Problem

Gold inflated 102% in 50 ticks. Combat contributed 2,106g (26% of all earnings). But animals and magical creatures wouldn't carry coin purses. Only humanoid/sentient monsters should drop gold.

### Monsters That SHOULD Drop Gold (sentient, would carry loot)
- **Bandit** — thieves, would have stolen coin
- **Goblin** — scavengers, hoard shiny things
- **Orc Warrior** — raiders, carry plunder
- **Skeleton Warrior** — undead soldier, might have coin from life
- **Troll** — debatable, but trolls in this setting guard bridges/collect tolls, keep gold

### Monsters That Should NOT Drop Gold (animals, elementals, magical entities)
- **Wolf** — animal
- **Dire Wolf** — animal
- **Giant Rat** — animal
- **Giant Spider** — animal
- **Slime** — mindless creature
- **Cave Bear** — animal
- **Mountain Lion** — animal
- **Mana Wisp** — magical entity (should drop Arcane Reagents instead, no gold)
- **Bog Wraith** — swamp spirit (should drop Arcane Reagents instead, no gold)
- **Arcane Elemental** — pure magical construct (drops reagents, not gold)
- **Shadow Wraith** — undead spirit (drops reagents, not gold)
- **Void Stalker** — eldritch entity (drops reagents, not gold)
- **Elder Fey Guardian** — fey spirit (drops reagents, not gold)
- **Fire Salamander** — magical beast
- **Frost Wyvern** — beast
- **Rock Golem** — construct

### Implementation

Find where monster gold rewards are defined. This could be:
- A `goldReward` or `goldMin`/`goldMax` field on the monster definition in `database/seeds/monsters.ts`
- A calculated value in the combat resolution logic in `road-encounter.ts`
- A field in the database monster table

For the "no gold" monsters listed above, set their gold reward to 0. Do NOT change their XP rewards — killing a wolf should still give XP, just not gold.

For the gold-dropping monsters, keep their current gold values OR adjust slightly upward to partially compensate for the overall gold reduction, keeping it reasonable. We want gold to come from fighting sentient enemies, not grinding wolves.

---

## Fix 3: Force All Crafting Professions into Diverse Seeding

### The Problem

The diverse seeding algorithm assigned 18 professions but completely skipped 11 others including ENCHANTER and SCRIBE. Without ENCHANTER/SCRIBE bots, P6 combat travel never triggers and Arcane Reagent crafting is untestable.

### Implementation

Find the diverse seeding logic in the simulation code (likely `server/src/lib/simulation/seed.ts` or similar).

**The fix:** Ensure ALL crafting professions are represented in diverse seeding. Specifically:

1. **Build a priority profession list** that includes every crafting profession that has recipes in the game:
   - COOK, BREWER, ALCHEMIST, BLACKSMITH, ARMORER, WEAPONSMITH, TAILOR, LEATHERWORKER, WOODWORKER, TANNER, SMELTER, JEWELER, ENCHANTER, SCRIBE, FLETCHER, MASON
   - Plus key gathering professions: FARMER, MINER, HERBALIST, LUMBERJACK, FISHERMAN, HUNTER, RANCHER

2. **Assignment algorithm for 50 bots:**
   - First pass: Assign 1 bot to each crafting profession (16 bots) — guarantees coverage
   - Second pass: Assign 1 bot to each gathering profession (7 bots) — guarantees supply
   - Remaining bots (27): Distribute proportionally, weighted toward gathering professions that feed the most crafting chains (FARMER, MINER, HERBALIST, LUMBERJACK should get more bots)

3. **For ENCHANTER and SCRIBE specifically:** Assign them to bots at L5+ so they have the level to attempt crafting. These professions need combat-exclusive ingredients, so low-level bots won't be useful.

4. **Service professions (MERCHANT, INNKEEPER, HEALER, etc.)** can be excluded from simulation seeding for now — they don't produce tradeable goods and aren't part of the crafting pipeline we're testing.

**Important:** Only change the diverse seeding distribution. Don't change single-level seeding behavior or any other simulation parameter.

---

## Execution Order

1. **Fix 1 first** (loot drops) — this is the core blocker
2. **Fix 2 second** (gold from monsters) — quick data change in monster seeds
3. **Fix 3 third** (seeding) — ensures next sim run has proper profession coverage

## Deployment

After all three fixes:

1. `git add -A`
2. `git commit -m "fix: combat loot drops + remove gold from non-sentient monsters + complete profession seeding"`
3. `git push`
4. Build and push Docker image to ACR — **use a unique timestamp tag, NOT 'latest'** (Azure won't pull unchanged tags)
5. Deploy to Azure Container App
6. Run database seed to update monster gold values in production

**DO NOT run a simulation.** Deploy and seed only. We will run sim v8.1 separately after verifying the fixes are live.
