# Monster Item Drops + Arcane Monsters

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

## Task: Add Item Drop Support to Monster Loot Tables + Create Arcane Monsters

### Context

The monster loot system currently only supports gold drops. We need to extend it to support item drops so that monsters can be the primary source of Arcane Reagents (needed by ENCHANTER and SCRIBE professions, which are currently non-functional because Arcane Reagents have no obtainable source).

This is a **two-phase task**:
1. Extend the loot table format and resolution code to support item drops (backward-compatible)
2. Add new arcane-themed monsters that drop Arcane Reagents across multiple tiers

### Current State

**Monster Schema** (Prisma — `database/prisma/schema.prisma` line 1590):
```prisma
model Monster {
  id        String    @id @default(uuid())
  name      String
  level     Int       @default(1)
  stats     Json      @default("{}")
  lootTable Json      @default("[]") @map("loot_table")
  regionId  String?   @map("region_id")
  biome     BiomeType
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  region Region? @relation(fields: [regionId], references: [id], onDelete: SetNull)
  @@index([regionId])
  @@index([level])
  @@map("monsters")
}
```

**Current Loot Table Format** (gold-only):
```typescript
interface LootEntry {
  dropChance: number;  // 0-1 probability
  minQty: number;
  maxQty: number;
  gold: number;        // gold per unit
}
```

**Loot Resolution Code** — exists in 3 places, all gold-only:
1. `server/src/routes/combat-pve.ts` (line ~484-491)
2. `server/src/services/tick-combat-resolver.ts` (line ~411-416)
3. `server/src/lib/road-encounter.ts` (line ~497-501)

All three do the same thing:
```typescript
const lootTable = monster.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number }[];
let totalGold = 0;
for (const entry of lootTable) {
  if (Math.random() <= entry.dropChance) {
    totalGold += entry.gold * (Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty);
  }
}
```

**Current Monsters** (15 total in `database/seeds/monsters.ts`):
- Tier 1 (L1-5): Goblin, Wolf, Bandit, Giant Rat, Slime
- Tier 2 (L5-10): Orc Warrior, Skeleton Warrior, Giant Spider, Dire Wolf, Troll
- Tier 3 (L10-20): Young Dragon, Lich, Demon, Hydra, Ancient Golem

**Existing Biome Types** used by monsters: HILLS, FOREST, PLAINS, UNDERGROUND, SWAMP, BADLANDS, TUNDRA, VOLCANIC, COASTAL, MOUNTAIN

**Existing Regions** (from monsters.ts): The Crossroads, Silverwood Forest, Verdant Heartlands, Vel'Naris Underdark, Shadowmere Marshes, Ashenfang Wastes, Ashenmoor, Frozen Reaches, The Confluence, The Suncoast, Ironvault Mountains

**Arcane Reagents** — already exists as a town resource (`arcane_reagents` in town-resources.ts) in SWAMP, VOLCANIC, and FEYWILD biomes, and specific towns: Boghollow, Cinderkeep, Moonhaven, Wyrmrest. It also exists as an item template but has zero obtainable sources through combat.

### Phase 1: Extend Loot Tables for Item Drops

**New Loot Entry Format** (backward-compatible):
```typescript
interface LootEntry {
  dropChance: number;
  minQty: number;
  maxQty: number;
  gold: number;
  // NEW — optional item drop fields
  itemTemplateSlug?: string;  // if present, drop this item instead of/in addition to gold
}
```

When `itemTemplateSlug` is present on a loot entry:
- Look up the ItemTemplate by slug
- Create `minQty` to `maxQty` Item instances in the player's inventory
- Gold on that entry should be 0 (item entries are separate from gold entries)
- If the ItemTemplate doesn't exist, log a warning and skip (don't crash)

**Files to modify:**

1. **`server/src/routes/combat-pve.ts`** (~line 484-491) — Add item drop handling after gold processing
2. **`server/src/services/tick-combat-resolver.ts`** (~line 411-416) — Same
3. **`server/src/lib/road-encounter.ts`** (~line 497-501) — Same

For each, the pattern should be:
```typescript
// After existing gold processing...
if (entry.itemTemplateSlug) {
  const template = await tx.itemTemplate.findFirst({
    where: { slug: entry.itemTemplateSlug },
  });
  if (template) {
    const qty = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;
    for (let i = 0; i < qty; i++) {
      await tx.item.create({
        data: {
          itemTemplateId: template.id,
          ownerId: characterId, // or playerId depending on context
          quantity: 1,
          condition: 100,
        },
      });
    }
    // TODO: Emit socket event or include in combat results so frontend shows the drop
  } else {
    console.warn(`[LOOT] ItemTemplate slug "${entry.itemTemplateSlug}" not found for monster loot`);
  }
}
```

**IMPORTANT**: Check the exact Item model schema in schema.prisma before writing the create call. The fields above are guesses — verify `ownerId`, `quantity`, `condition` etc. match the actual schema. Also check if items go into an Inventory table vs directly on Character.

4. **`server/src/routes/admin/monsters.ts`** — Update the enriched monster response to show item drops (not just gold range)
5. **`server/src/routes/codex.ts`** (~line 149-160) — Update codex monster display to show possible item drops
6. **Test file** `server/src/routes/__tests__/combat-pve.test.ts` — Update test monster loot table fixtures to include item drop entries

### Phase 2: Add Arcane-Themed Monsters

Design and add **5-6 new monsters** that thematically make sense as sources of arcane materials. They should:

- Span multiple tiers so Arcane Reagents are accessible from early-mid game onward
- Be placed in biomes where arcane resources already exist (SWAMP, VOLCANIC, FEYWILD, UNDERGROUND)
- Have item drops including `arcane_reagents` and potentially other arcane/magical items
- Still drop gold alongside items
- Follow the existing stat balance patterns from the current 15 monsters

**Design Guidelines for New Monsters:**

| Tier | Level Range | HP Range | AC Range | Suggested Arcane Monsters |
|------|------------|----------|----------|--------------------------|
| 1 | 2-4 | 15-25 | 10-13 | Mana Wisp, Corrupted Sprite |
| 2 | 6-9 | 40-60 | 13-15 | Arcane Elemental, Shadow Wraith |
| 3 | 11-17 | 100-140 | 16-18 | Void Stalker, Elder Fey Guardian |

These names are suggestions — the Game Designer should finalize names that fit the world of Aethermere. Consider the existing lore:
- Shadowmere Marshes (SWAMP) — dark, corrupted magic
- The Confluence (VOLCANIC) — elemental convergence
- Vel'Naris Underdark (UNDERGROUND) — ancient, alien magic
- FEYWILD biome — wild, nature magic

**Loot Table Examples for Arcane Monsters:**
```typescript
// Tier 1 example — Mana Wisp (L3)
lootTable: [
  { dropChance: 0.7, minQty: 1, maxQty: 3, gold: 2 },           // small gold
  { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0, itemTemplateSlug: 'arcane-reagents' },  // arcane drop
]

// Tier 3 example — Elder Fey Guardian (L15)
lootTable: [
  { dropChance: 1.0, minQty: 15, maxQty: 40, gold: 35 },
  { dropChance: 0.6, minQty: 2, maxQty: 5, gold: 0, itemTemplateSlug: 'arcane-reagents' },
  { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0, itemTemplateSlug: 'arcane-crystal' },  // rare drop if item exists
]
```

**IMPORTANT**: Before adding `itemTemplateSlug` values, verify the actual slug/name used for Arcane Reagents in the ItemTemplate table. Run this query or check the seed file:
```sql
SELECT id, name, slug FROM item_templates WHERE name ILIKE '%arcane%' OR slug ILIKE '%arcane%';
```

### Phase 3: Update Monster Seed File

Add the new arcane monsters to `database/seeds/monsters.ts`:
- Follow the existing `MonsterDef` interface
- Assign to appropriate regions (check `world.ts` for region names)
- Ensure biome matches the region's biome

### Verification Steps

After implementation:
1. Run `npx prisma generate` (no migration needed — lootTable is already Json)
2. Run the monster seed: ensure all 20-21 monsters seed without errors
3. Test a combat encounter against an arcane monster — verify:
   - Gold is awarded correctly
   - Item drops appear in player inventory
   - No crashes when itemTemplateSlug is missing from old monsters
4. Check the codex page shows item drops for new monsters
5. Check admin monster panel shows item drop info

### Deployment

After all changes verified locally:
```bash
git add -A
git commit -m "feat: add item drop support to monster loot tables + arcane monsters"
git push origin main
```

Then build and deploy:
```bash
cd server
docker build -t realmofcrowns.azurecr.io/realm-of-crowns-server:$(git rev-parse --short HEAD) .
docker push realmofcrowns.azurecr.io/realm-of-crowns-server:$(git rev-parse --short HEAD)
az containerapp update --name realm-of-crowns-server --resource-group realm-of-crowns-rg --image realmofcrowns.azurecr.io/realm-of-crowns-server:$(git rev-parse --short HEAD)
```

Then seed production database:
```bash
az containerapp exec --name realm-of-crowns-server --resource-group realm-of-crowns-rg --command "npx ts-node database/seeds/monsters.ts"
```

### What NOT To Do

- Do NOT modify the Prisma schema — lootTable is already Json, no migration needed
- Do NOT remove or change existing monsters — only ADD new ones
- Do NOT change existing loot table entries on old monsters — they should continue working with gold-only
- Do NOT over-engineer the item drop system — no rarity tiers, no conditional drops based on player level, none of that. Simple: roll dice, drop item. That's it.
- Do NOT create items in bulk (e.g., quantity: 5 in one row). Create individual Item records with quantity: 1 each, matching how crafted items work. UNLESS the Item schema supports stacking (quantity > 1) — check first.
