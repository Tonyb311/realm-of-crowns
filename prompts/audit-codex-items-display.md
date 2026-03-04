# Audit: Codex Items Display — What's Shown vs What Exists

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- Bias toward action. Produce rather than over-plan.
- **Minimize tool calls** — batch reads, keep analysis brief.
- **Keep chat responses short** — dump all detailed findings to the output file.
- **This is a READ-ONLY audit.** Do not modify any code. Do not create branches. Do not deploy.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## THE TASK

The Codex items page shows items but doesn't display their mechanical stats (damage, AC, healing amounts, stat bonuses, durability, requirements, etc.). The data exists — all 220+ ItemTemplates have real stat values in their `stats` JSON blob. The display just isn't parsing or showing them.

Audit exactly what's happening and what needs to change.

### Question 1: What Does the Codex Items Page Currently Render?

Check `client/src/components/codex/CodexItems.tsx` (or wherever the Codex items section lives — may be in `client/src/components/admin/combat/CodexTab.tsx` if items are in the admin codex):

- What fields are displayed per item? (name, type, rarity, description — what else?)
- Is the `stats` JSON blob rendered at all? As raw JSON? Ignored entirely?
- Is there an item detail/expand view or just a list?
- How are different item types (WEAPON, ARMOR, ACCESSORY, TOOL, CONSUMABLE) handled — same generic card or type-specific rendering?

### Question 2: What Does the API Return?

Check the endpoint that feeds the Codex items section:

- `GET /api/codex/items` — what fields does it return? Does it include `stats`?
- If stats are in the response, the problem is purely frontend rendering
- If stats are NOT in the response, the API `select` clause is excluding them

Also check: `GET /api/items` (if different from codex endpoint) — same question.

### Question 3: What Stats Exist Per Item Type?

Sample the actual data to document the stat shapes. Check seed files or query templates:

- **Weapons** (`database/seeds/weapon-recipes.ts` or similar): What keys are in stats? (`baseDamage`, `diceCount`, `diceSides`, `damageType`, `speed`, `bonusAttack`, `bonusDamage`, `requiredStr`, `requiredDex`, `levelToEquip`, `durability`)
- **Armor** (`database/seeds/armor-recipes.ts`): Keys? (`armor`, `magicResist`, `requiredStr`, `levelToEquip`)
- **Accessories** (`database/seeds/accessory-recipes.ts`): Keys? (`magicPower`, `charisma`, `luck`, `strength`, `wisdom`, etc.)
- **Tools** (`shared/src/data/tools/`): Keys? (`speedBonus`, `yieldBonus`, `toolType`, `tier`, `professionType`)
- **Consumables** (potions, food, etc.): Keys? (`healAmount`, `healDice`, `buffType`, `buffDuration`, `buffValue`, etc.)

For each type, pick 2-3 representative items and list their full stat objects.

### Question 4: What Types/Interfaces Exist for Item Stats?

Check:
- `shared/src/data/recipes/types.ts` — `WeaponStats`, `ArmorStats`, `ConsumableStats` interfaces
- `server/src/services/item-stats.ts` — `ItemStats` interface
- Any other type definitions for item stat shapes

Document all of them — the fix prompt needs to know exactly what keys to parse per item type.

### Question 5: Are There Other Item Display Components?

Search `client/src/` for any existing components that DO show item stats properly:
- InventoryPage item detail panel — does it show stats?
- Market/trade item listings — do they show stats?
- Equipment comparison view — does it show stats?
- Any `ItemCard`, `ItemDetail`, `ItemTooltip` components?

If any existing component already renders item stats well, we should reuse that pattern in the Codex rather than building from scratch.

---

## OUTPUT

Write ALL findings to: `D:\realm_of_crowns\audits\codex-items-display.md`

Structure:

```markdown
# Codex Items Display Audit

## Summary
[2-3 sentences: what's shown, what's missing, where the fix is]

## Q1: Current Codex Items Rendering
[What the component shows, what it ignores]

## Q2: API Response
[Fields returned, whether stats are included]

## Q3: Stat Shapes Per Item Type
[Full key listing with 2-3 examples per type]

## Q4: Type Definitions
[All relevant interfaces]

## Q5: Existing Item Display Components
[Any reusable patterns found elsewhere in the codebase]

## Recommendations
[What specifically needs to change — which file, which section, what to add]
```

In chat, just say: "Audit complete. [1 sentence summary]. Results in `audits/codex-items-display.md`."

## DO NOT

- Do not modify any code
- Do not create git commits
- Do not deploy anything
- Do not spend more than 2-3 sentences per answer in chat — put the detail in the file
