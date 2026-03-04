# Audit: Equipment → Combat Pipeline

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## Key Principles

- Bias toward action. Produce rather than over-plan.
- **Minimize tool calls** — batch reads, keep analysis brief.
- **Keep chat responses short** — dump all detailed findings to the output file.
- **This is a READ-ONLY audit.** Do not modify any code. Do not create branches. Do not deploy.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## THE TASK

Audit the **full equipment pipeline** end-to-end: from item template definitions → inventory → equipping → stat calculation → combat application. Answer these specific questions:

### Question 1: Do ItemTemplates Have Real Stats?

Check the **source of truth** for item stats:

- `database/prisma/schema.prisma` — What fields does ItemTemplate have for stats? Is it a JSON blob or typed columns?
- `shared/src/data/items/` — What do the static item definitions look like? Do weapons have damage values? Does armor have AC? Do accessories have stat bonuses?
- Run a DB query or check seed files: **How many items actually have non-null/non-empty stats?** vs how many are stat-less placeholders?
- Check a representative sample: pick 1 weapon, 1 armor, 1 accessory, 1 tool — list their actual stat values.

### Question 2: Does the Equipment System Work?

Check `server/src/routes/equipment.ts`:

- Does `POST /api/equipment/equip` correctly move an item from inventory to an equipment slot?
- Does `POST /api/equipment/unequip` correctly return it?
- Is there a `GET` endpoint that returns a character's currently equipped items?
- Does the Character model in Prisma have equipment slot fields/relations?
- Check: Is there an `equipment` table/relation, or are equipped items tracked via a field on the Item model, or something else?

### Question 3: Does `item-stats.ts` Actually Calculate Anything?

Check `server/src/services/item-stats.ts`:

- Does `calculateItemStats()` produce meaningful output given real item data?
- Does `calculateEquipmentTotals()` aggregate stats across all equipped items?
- Are quality multipliers (POOR 0.7x → LEGENDARY 1.8x) actually applied?
- Is there enchantment support or is that stubbed?
- **Who calls these functions?** Search the entire codebase for imports of `calculateItemStats` and `calculateEquipmentTotals` — list every file that uses them.

### Question 4: Does Combat Use Equipment Stats? (THE BIG ONE)

Check `server/src/lib/combat-engine.ts` (87KB — search, don't read the whole thing):

- Search for: `equipment`, `equip`, `item`, `armor`, `weapon`, `damage`, `calculateItemStats`, `calculateEquipmentTotals`, `EquipmentTotals`, `ItemStats`
- When the combat engine builds a combatant's stats (HP, AC, attack bonus, damage, etc.), does it:
  - Load the character's equipped items?
  - Call `calculateEquipmentTotals()` or similar?
  - Add equipment AC to base AC?
  - Add weapon damage to attack damage?
  - Apply stat bonuses (STR from a ring, DEX from boots, etc.)?
- Or does it use **only base character stats** (level, race modifiers, class base stats)?

Also check the combat entry points that feed into the engine:
- `server/src/routes/combat-pve.ts` — Does it load equipment before starting combat?
- `server/src/lib/road-encounter.ts` — Does the random encounter path load equipment?
- `server/src/services/tick-combat-resolver.ts` — Same question for tick-based combat.

### Question 5: Frontend Equipment UI

Check the client side briefly:
- Is there an equipment/inventory page where players can equip items?
- Does the character sheet show equipment slots?
- Does the character sheet show stats WITH equipment bonuses, or only base stats?
- Search `client/src/` for files referencing equipment, equip, inventory, gear.

### Question 6: The Gap Analysis

Based on findings from Q1-Q5, identify exactly where the pipeline breaks (if it does). The chain is:

```
ItemTemplate (stats defined) 
  → Item (instance created with template stats)
    → Inventory (player owns it) 
      → Equipment Slot (player equips it)
        → Stat Calculation (equipment totals computed)
          → Combat Engine (stats applied to combatant)
            → Combat Resolution (equipment affects outcomes)
```

For each link, answer: **CONNECTED** or **BROKEN** and explain why.

---

## OUTPUT

Write ALL findings to: `D:\realm_of_crowns\audits\equipment-combat-pipeline.md`

Structure the output file as:

```markdown
# Equipment → Combat Pipeline Audit

## Summary
[2-3 sentence executive summary: does equipment work end-to-end?]

## Q1: Item Template Stats
[Findings with specific examples]

## Q2: Equipment System
[Findings]

## Q3: Stat Calculation Service
[Findings including list of all callers]

## Q4: Combat Engine Integration
[Findings — this is the most important section]

## Q5: Frontend Equipment UI
[Brief findings]

## Q6: Pipeline Status
| Link | Status | Evidence |
|------|--------|----------|
| ItemTemplate → has stats | ✅/❌ | ... |
| Item → inherits stats | ✅/❌ | ... |
| Inventory → Equipment Slot | ✅/❌ | ... |
| Equipment → Stat Calculation | ✅/❌ | ... |
| Stat Calculation → Combat Engine | ✅/❌ | ... |
| Combat Engine → Resolution | ✅/❌ | ... |

## Recommendations
[Ordered list of what needs to be built/fixed, if anything]
```

In chat, just give me: "Audit complete. [1 sentence summary]. Results in `audits/equipment-combat-pipeline.md`."

## DO NOT

- Do not modify any code
- Do not create git commits
- Do not deploy anything
- Do not read the entire 87KB combat-engine.ts — use grep/search to find relevant sections
- Do not spend more than 2-3 sentences per answer in chat — put the detail in the file
