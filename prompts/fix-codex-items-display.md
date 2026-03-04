# Fix: Codex Items — Display Combat Stats & Mechanics

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead.
- **Surgical changes** — don't refactor what already works.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

The Codex items page (`CodexItems.tsx`) fetches all 220+ ItemTemplates with full `stats` JSON from `GET /api/codex/items`, but **completely ignores the stats blob in rendering**. It only shows three scalar fields: baseValue, durability, levelRequired.

The `InventoryPage.tsx` ItemDetailPanel (lines ~514-659) already has a working generic stat renderer that filters metadata keys, handles percentages, color-codes values, and converts camelCase to readable labels. Reuse that pattern.

**No API changes needed.** This is purely a frontend rendering fix in one file.

---

## THE TASK

Add type-aware stat rendering to the expanded item detail view in `client/src/components/codex/CodexItems.tsx` (around lines 300-340, after the existing scalar fields).

### Step 1: Add a Stats Section to the Expanded View

After the existing `baseValue` / `durability` / `levelRequired` display, add a "Stats" section that parses and renders `item.stats`.

**Filter these metadata keys from display (they're not combat stats):**
- `equipSlot`, `professionType`, `toolType`, `tier`

**Also filter these dead/duplicate stats:**
- `speed` — dead stat, not used mechanically anywhere. Do not render it.
- `durability` inside stats JSON — already shown from the typed column. Don't show twice.
- `levelToEquip` inside stats JSON — already shown as `levelRequired` from typed column. Don't show twice.

### Step 2: Type-Specific Stat Formatting

Rather than a generic key-value dump for all types, format stats based on `item.type`:

#### WEAPON Stats
The stats blob contains: `baseDamage`, `damageType`, `requiredStr`, `requiredDex`, `twoHanded` (optional), `range` (optional for ranged)

Display as:
```
⚔ Damage: 12 slashing
  Two-Handed
  Range: 20 (if present)
  Requires: STR 7, DEX 3
```

- `baseDamage` + `damageType` on one line (e.g., "12 slashing")
- `damageType` as a colored badge: slashing=amber, piercing=sky, bludgeoning=stone/gray
- `twoHanded: true` → show "Two-Handed" badge, otherwise "One-Handed"
- `range` only for ranged weapons
- Requirements as "Requires: STR X, DEX Y"
- Do NOT show `speed` — it's a dead stat

#### ARMOR Stats
The stats blob contains: `armor`, `magicResist` (optional), `requiredStr` (optional), `movementPenalty` (optional), `stealthPenalty` (optional)

Display as:
```
🛡 Armor: +16 AC
  Magic Resist: +10 (if present)
  Movement Penalty: -2 (if present, show in red)
  Stealth Penalty: -2 (if present, show in red)
  Requires: STR 9 (if present)
```

- `armor` → show as "+16 AC" (green)
- `magicResist` → "+10 Magic Resist" (blue/purple)
- Penalties in red
- Some armor (Cloth Robes) has only `magicResist` and no `armor` — handle gracefully

#### ACCESSORY Stats
The stats blob contains variable keys: `defense`, `magicPower`, `magicResistance`, `charisma`, `luck`, `strength`, `intelligence`, `wisdom`, `health`, `mana`, `attackSpeed`

Display as key-value rows (reuse InventoryPage pattern):
```
+5 Magic Power
+3 Charisma
+2 Luck
```

- Color-code: green for positive, red for negative
- Convert camelCase: `magicPower` → "Magic Power", `attackSpeed` → "Attack Speed"
- Filter out `speed` — dead stat

#### TOOL Stats
The stats blob contains: `speedBonus`, `yieldBonus`, `toolType`, `professionType`

Display as:
```
🔧 Gathering Speed: +30%
   Yield Bonus: +15%
   For: Miner (Pickaxe)
```

- `speedBonus` and `yieldBonus` are fractional (0.30 = 30%). Multiply by 100, show with `%`
- Show `professionType` and `toolType` as context
- Filter `tier` from display (it's metadata, not a stat)

#### CONSUMABLE Stats
The stats blob contains: `effect`, `magnitude`, `duration`, `stackSize`, `secondaryEffect` (optional), `secondaryMagnitude` (optional)

Display with human-readable effect descriptions:
```
💊 Heals 15 HP (instant)
   Stack Size: 20
```

Map `effect` values to readable text:
| Effect Key | Display |
|---|---|
| `heal_hp` | "Heals {magnitude} HP" |
| `heal_mana` | "Restores {magnitude} Mana" |
| `hp_regen` | "Regenerates {magnitude} HP over {duration} min" |
| `mana_regen` | "Regenerates {magnitude} Mana over {duration} min" |
| `buff_strength` | "+{magnitude} Strength for {duration} min" |
| `buff_dexterity` | "+{magnitude} Dexterity for {duration} min" |
| `buff_intelligence` | "+{magnitude} Intelligence for {duration} min" |
| `buff_constitution` | "+{magnitude} Constitution for {duration} min" |
| `buff_wisdom` | "+{magnitude} Wisdom for {duration} min" |
| `buff_charisma` | "+{magnitude} Charisma for {duration} min" |
| `buff_all_stats` | "+{magnitude} All Stats for {duration} min" |
| `buff_armor` | "+{magnitude} Armor for {duration} min" |
| `cure_poison` | "Cures Poison" |
| `cure_disease` | "Cures Disease" |
| `cure_all` | "Cures All Ailments" |
| `poison_immunity` | "Poison Immunity for {duration} min" |
| `apply_poison` | "Applies Poison ({magnitude} damage)" |
| `damage_fire` | "Deals {magnitude} Fire Damage" |
| `damage_ice` | "Deals {magnitude} Ice Damage" |
| `damage_lightning` | "Deals {magnitude} Lightning Damage" |
| `damage_area` | "Deals {magnitude} AoE Damage" |
| `blind` | "Blinds Target for {duration} min" |
| `stun` | "Stuns Target for {duration} min" |
| `sustenance` | "Removes Hunger for {duration} min" |
| `reveal_map` | "Reveals Map" |
| `identify` | "Identifies Item" |
| Any other | Fall back to generic: "{effect}: {magnitude}" |

Duration of 0 means instant — show "(instant)" instead of "for 0 min".

If `secondaryEffect` exists, show it on a second line with same formatting.

Show `stackSize` as "Stack Size: {N}".

#### MATERIAL / RESOURCE Stats
These typically have empty or minimal stats. If `stats` is empty/null or has no displayable keys after filtering, show nothing (no empty "Stats" section).

#### Enchantment Scrolls (CONSUMABLE subtype)
These have custom keys like `fireDamage`, `coldDamage`, `holyDamage`, `undeadBonus`, etc.

If the item name contains "Enchantment" or "Scroll", use generic key-value rendering:
```
✨ Fire Damage: +8
```
Convert camelCase to readable labels, color-code positive values green.

### Step 3: Styling

Match the existing Codex visual style:
- Stats section gets a slightly darker background (`bg-realm-bg-900/30` or similar to what's already used in the component)
- Thin left border colored by item type:
  - WEAPON: amber/gold
  - ARMOR: blue
  - ACCESSORY: purple
  - TOOL: green
  - CONSUMABLE: teal
- Keep the same font sizes and spacing as the existing scalar fields
- Stat labels in muted text, values in primary text
- Damage type badges match the existing rarity badge styling but with type-appropriate colors

### Step 4: Also Fix the Admin Codex Items Sub-Tab (Quick Win)

In `client/src/components/admin/combat/CodexTab.tsx`, the Items sub-tab shows recipe relationships but no stats. Add a compact stat summary line under each item:

- Weapons: "12 slashing, STR 7/DEX 3"
- Armor: "AC +16, MR +10"
- Tools: "+30% speed, +15% yield"
- Consumables: "Heals 15 HP"
- Others: skip

This is a one-liner per item, not the full detail view. Keep it compact — the admin needs quick reference, not full cards.

---

## TESTING

After implementation, verify by checking these specific items in the Codex:

1. **Weapon:** Find any sword — should show damage + type + requirements
2. **Armor:** Find Iron Chestplate — should show "AC +16"
3. **Armor (magic):** Find Mithril anything — should show AC + Magic Resist
4. **Armor (cloth):** Find Cloth Robes — should show only Magic Resist (no armor value)
5. **Tool:** Find any Pickaxe — should show "+X% speed, +X% yield"
6. **Consumable:** Find Minor Healing Potion — should show "Heals 15 HP (instant)"
7. **Consumable (buff):** Find Elixir of Strength — should show "+3 Strength for 5 min"
8. **Accessory:** Find Gold Ring — should show "+5 Magic Power, +3 Charisma, +2 Luck"
9. **Material:** Find Iron Ore — should show no stats section (empty stats)
10. **No item should show `speed` as a stat** — verify it's filtered out

---

## DEPLOYMENT

After all changes verified:

```bash
git add -A
git commit -m "feat: codex items now display full combat stats — type-specific formatting for weapons, armor, consumables, tools, accessories"
git push origin main
```

Build and deploy with unique tag:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify the API — stats are already included in the response
- Do not modify `item-stats.ts` or any backend service
- Do not refactor the existing scalar field display (baseValue, durability, levelRequired) — just add stats below it
- Do not show `speed` stat anywhere — it's a dead stat with no mechanical effect
- Do not show `durability` or `levelToEquip` from the stats JSON — they're already displayed from typed columns
- Do not create new components — add the rendering directly in CodexItems.tsx (and a compact version in CodexTab.tsx)
- Do not redesign the Codex layout — just add a stats block to the existing expanded view

## SUMMARY FOR CHAT

When done, print:
```
Codex items now show full stats:
- Weapons: damage + type badge + requirements
- Armor: AC + magic resist + penalties
- Accessories: stat bonuses (color-coded)
- Tools: speed% + yield%
- Consumables: human-readable effects (Heals 15 HP, +3 STR for 5min, etc.)
- Enchantment scrolls: elemental damage bonuses
- Dead stats filtered: speed, duplicate durability/levelToEquip
- Admin codex: compact stat summary per item
Deployed: tag [TAG]
```
