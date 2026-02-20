# Fill Missing Recipe Base Values — YAML Completion Pass

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
- One major task per chat to avoid context overflow.

---

## YOUR TASK

Fill all missing `base_value` fields in `docs/profession-economy-master.yaml`. The v4 economy audit found ~175 recipes with no output base_values, making full economic analysis impossible. This is the foundational data pass that unblocks everything else.

### Source Files

- `docs/profession-economy-master.yaml` — **THE file to audit and update.** This is the source of truth.
- `docs/profession-economy-audit-v4.md` — Identifies which recipes are missing values and which have value-destructive margins.

### What base_value Means

The `base_value` is the **NPC vendor floor price** — the minimum gold a player receives if they sell this item to an NPC shop. It is NOT the player market price. Player-to-player trades on the market will be driven by supply and demand and will typically be HIGHER than base_value.

Think of base_value as:
- The **worst-case sale price** (no player buyers, must vendor it)
- The **crafting reference anchor** (used for economic analysis and balance checks)
- The **NPC shop buy price** (what the game's NPC merchants will pay)

### Pricing Rules (Follow ALL of these)

#### Rule 1: Processing Must Add Value
Every crafted/processed item's base_value must be **higher** than the sum of its input base_values. The output must be worth more than the inputs. This is non-negotiable.

**Minimum margin target: 1.3x input cost** (30% markup over raw material cost). This ensures that even at NPC vendor prices, the crafter earns something. Player market prices will push margins higher.

Example:
- Iron Ore base_value: 8g
- Charcoal base_value: 3g  
- Iron Ingot inputs: 2× Iron Ore (16g) + 1× Charcoal (3g) = 19g total input
- Iron Ingot base_value should be: at least 19g × 1.3 = ~25g

#### Rule 2: Tier Scaling
Higher-tier items should have proportionally higher base_values. A Master-tier recipe output should be worth significantly more than an Apprentice-tier output of the same type.

Rough tier multipliers (relative to base material cost):
- Apprentice recipes: 1.3x–1.5x input cost
- Journeyman recipes: 1.4x–1.6x input cost
- Craftsman recipes: 1.5x–1.8x input cost
- Master recipes: 1.6x–2.0x input cost

Higher tiers get better margins because they require more skill investment and workshop upgrades.

#### Rule 3: Utility Drives Value
Items that are consumed (food, potions, ammunition) should have LOWER base_values than durable items (armor, weapons, tools) because consumables generate repeat demand. A sword bought once for 100g and a meal bought daily for 5g may generate similar total revenue over time.

#### Rule 4: Internal Consistency Within Categories
All items in the same category should have base_values that make sense relative to each other:
- Iron Sword < Steel Sword < Mithril Sword
- Leather Armor < Chainmail < Plate Armor
- Bread < Stew < Feast
- Minor Health Potion < Health Potion < Greater Health Potion

#### Rule 5: Raw Materials Anchor Everything
Raw gathering materials (ore, wood, fish, herbs, etc.) should already have base_values in the YAML. If any are missing, set them based on:
- Gathering time investment (materials that take longer to gather = higher value)
- Rarity/availability (common materials cheaper than rare ones)
- Typical range: 3g–15g for common raw materials, 15g–40g for uncommon, 40g+ for rare

#### Rule 6: Account for Market Fees
The game has a 10% marketplace transaction fee. When setting base_values, the NPC vendor price does NOT include this fee (vendor sales are fee-free). But be aware that player-to-player market sales will lose 10%, so effective player margins are lower than base_value suggests.

#### Rule 7: Remember These Are Floor Prices
Don't overthink exact values. Real prices will be set by player supply and demand. The base_values just need to be:
- Internally consistent (no value destruction)
- Reasonable floors (not absurdly high or low)
- Margin-positive for crafters at every tier

If a value feels uncertain, err on the side of slightly higher. It's easier to have a healthy floor that players undercut than a floor so low that NPC vendoring destroys value.

### Fix Value-Destructive Recipes

The v4 audit identified specific value-destructive processing chains. These are P0 fixes:

- Wolf Leather, Bear Leather — output base_value too close to input cost
- Woven Cloth, Fine Cloth, Silk Fabric — processing adds no value
- ALL 12 TANNER finished goods — margin ratios 0.63–0.82

For these, raise the output base_value to at least 1.3x input cost. Show the before/after for each fix.

### Deliverable

1. **Update `docs/profession-economy-master.yaml`** directly with all missing base_values and all value-destructive fixes.
2. **Write a changelog to `docs/base-value-completion-changelog.md`** listing:
   - Every item that got a new or changed base_value
   - The old value (if any) and new value
   - The reasoning (input cost × margin multiplier = output value)
   - Flag any items where you were uncertain about the right value

### Process

1. Read the full YAML file.
2. Read the v4 audit for context on which items are problematic.
3. Identify ALL items missing base_values.
4. Calculate appropriate base_values using the rules above.
5. Update the YAML file.
6. Write the changelog.

### Guidelines

- **Minimize tool calls.** Read the YAML once, calculate all values, write updates in batches.
- **Keep chat response under 30 lines.** Just summary stats: how many values added, how many value-destructive chains fixed, any items you couldn't price and why.
- **Don't change recipe structures.** Only add/update base_value fields. Don't modify ingredients, quantities, crafting times, or anything else.
- **If a recipe's inputs don't have base_values either, work bottom-up.** Price raw materials first, then processed materials, then finished goods. Build the price chain from the ground up.
- **Flag genuinely uncertain items.** If you can't determine a reasonable base_value because the item's purpose or rarity is unclear, list it in the changelog as "NEEDS REVIEW" rather than guessing wildly.

### After completion, commit and push:
```bash
git add docs/profession-economy-master.yaml docs/base-value-completion-changelog.md
git commit -m "feat(economy): fill 175 missing base_values, fix value-destructive recipes"
git push
```
