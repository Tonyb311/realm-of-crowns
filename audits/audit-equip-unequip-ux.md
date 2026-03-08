# Audit: Equip / Unequip / Swap — UX Pipeline

## Executive Summary

The backend equip/unequip/swap API is **solid and well-designed** — proper ownership checks, slot validation, atomic transactions, swap logic, durability/level/class guards. The frontend equip and swap flows work correctly from the inventory grid. However, **clicking an equipped slot in the equipment grid is silently broken** — it tries to find the item in inventory but equipped items aren't in inventory, so nothing happens. Unequipping only works if you can select the item first, which you can't do from the equipment grid. The character sheet paper doll is display-only (by design) and works correctly.

## Backend API Assessment

### POST /equipment/equip
**Status: Solid**

Step-by-step logic:
1. Verifies item exists AND `ownerId === character.id` — correct
2. Verifies item is in `inventories` table (not just owned) — correct double-check
3. Validates slot via `ITEM_TYPE_SLOT_MAP` — covers WEAPON → MAIN_HAND/OFF_HAND, ARMOR → 6 body slots, ACCESSORY → RING_1/RING_2/NECK, TOOL → TOOL
4. Checks `currentDurability > 0` — blocks broken items
5. Checks level requirement from `requirements.level` or `itemTemplate.levelRequired`
6. Checks class restrictions from `requirements.classRestrictions`
7. **Swap logic (atomic transaction):**
   - Finds existing equipment in the target slot
   - Deletes the old equipment row
   - Returns old item to inventory (inserts or increments quantity)
   - Inserts new equipment row
   - Removes new item from inventory (deletes or decrements quantity)
8. Returns: equipped item with name/type/quality/durability/stats, swap info, proficiency warnings

**No bugs found.** Edge cases all handled.

### POST /equipment/unequip
**Status: Solid**

1. Finds equipment in the requested slot
2. Returns 400 if slot is empty — graceful
3. Transaction: deletes equipment row, returns item to inventory (insert or increment)
4. Returns: slot, itemId, name, `returnedToInventory: true`

**No bugs found.**

### GET /equipment/equipped
**Status: Complete**

Response shape per item:
- `slot` — equipment slot key
- `item.id`, `item.name`, `item.type`, `item.quality`
- `item.currentDurability`, `item.maxDurability`
- `item.enchantments` — raw enchantment array
- `item.stats` — final calculated stats (after quality + enchantments)
- `item.baseStats`, `item.qualityMultiplier`, `item.enchantmentBonuses` — full breakdown

**Very complete.** Includes everything needed for display.

### GET /equipment/stats
**Status: Works**

Returns:
- `totalAC` — aggregate AC from all equipment
- `totalDamage` — aggregate damage
- `totalStatBonuses` — per-stat bonuses (strength, dexterity, etc.)
- `totalResistances` — per-type resistances
- `equippedCount`

Used in InventoryPage to show Attack/Defense summary. Works correctly.

## Frontend UX Assessment

### Equipment Slots Grid
**Status: 12/12 slots rendered, but click interaction is broken**

All 12 slots are defined in `PRIMARY_SLOTS`: HEAD, NECK, BACK, CHEST, MAIN_HAND, OFF_HAND, HANDS, RING_1, RING_2, LEGS, FEET, TOOL. Rendered in a 4×6 / 6×2 responsive grid.

Equipped slots show:
- Item name (rarity-colored)
- Stats summary (+ATK, +DEF, yield%)
- Tool durability bar
- Rarity-colored border and background

Empty slots show: dashed border with slot label.

**BUG:** Clicking an equipped slot tries `inventory.find((i) => i.id === equipped.item.id)` (line 340), but equipped items are **removed from the inventory table** during equip. This lookup will always return `undefined`, so `setSelectedItem` is never called. **You cannot interact with equipped items from the equipment grid.**

### Equip Flow
**Status: Works from inventory grid**

1. Player clicks an item in inventory → `setSelectedItem(item)` → detail panel opens
2. Detail panel shows "Equip" button if `isEquippable(item)` returns true (and durability > 0)
3. Click "Equip" → `handleEquipClick(item)`:
   - Calls `detectSlot(item)` to auto-detect the target slot
   - If slot is empty → immediately calls `equipMutation.mutate({ itemId, slot })`
   - If slot is occupied → opens confirmation modal (see Swap Flow)
4. On success → invalidates `['character', 'me']` and `['equipment']` queries → UI refreshes
5. Selected item and confirm dialog are cleared

**Works correctly.** The slot auto-detection means the player never picks a slot manually.

### Swap Flow
**Status: Works — has confirmation dialog**

When equipping to an occupied slot:
1. `setConfirmEquip({ item, slot, replacing })` opens a modal
2. Modal shows: "Replace **[old item name]** with **[new item name]**? The old item will return to your inventory."
3. "Replace" button calls `equipMutation.mutate(...)` — disabled while pending, shows "Equipping..." text
4. "Cancel" button closes the modal
5. Backend handles the actual swap atomically

**Works correctly.** Clear UX with confirmation.

### Unequip Flow
**Status: Partially broken — cannot reach from equipment grid**

The unequip mutation and button exist and work correctly:
- Detail panel shows a red "Unequip" button when `equippedSlot` is truthy
- Button calls `unequipMutation.mutate(slot)`
- Shows "Unequipping..." during pending state
- On success → invalidates queries

**BUT:** The only way to trigger unequip is by selecting an item in the detail panel that shows as equipped. The `isItemEquippedSlot()` function (line 242) checks `equippedItems.find((e) => e.item.id === item.id)` — this only works if the item appears in both the `equippedItems` list AND the `inventory` list simultaneously. Since equipping removes items from inventory, **this can never be true for properly equipped items.**

This means unequip is only reachable if:
1. The item somehow appears in both inventory and equipment (shouldn't happen), OR
2. The player clicks an equipped slot in the grid (which is broken as noted above)

**Net result: Unequipping is effectively unreachable through the UI.**

### Error Handling & Loading States
**Status: Good**

- **Loading:** Full skeleton loading state while character data loads
- **Equip pending:** "Equipping..." text on button, button disabled
- **Unequip pending:** "Unequipping..." text on button, button disabled
- **Error state:** "No Character Found" with create character CTA
- **API errors:** Not shown to the user — mutations don't have `onError` handlers. The equip/unequip will silently fail if the API returns an error.

### Query Invalidation
**Status: Correct**

Both equip and unequip mutations invalidate:
- `['character', 'me']` — refetches inventory
- `['equipment']` — refetches equipped items AND stats (partial key match)

This ensures both the inventory grid and equipment grid update after any change.

## Character Sheet Integration

### Paper Doll Display
**Status: Works well — display only**

- Receives `equipment` array from `buildCharacterSheet()` service
- Shows all 12 slots in a CSS grid "paper doll" layout (desktop) or linear list (mobile)
- Item names with rarity coloring via `getRarityStyle(item.quality)`
- Enchanted items marked with purple asterisk
- Non-proficient items highlighted in red with "Not proficient" label
- Stat tooltips on hover (own profile only) — shows damage, AC, stat bonuses
- Empty slots show italic slot label in muted text

**No equip/unequip from character sheet** — intentionally display-only. This is fine; InventoryPage is the management surface.

### Data Flow
**Status: Consistent**

- ProfilePage fetches from `/characters/me/sheet` (own) or `/characters/{id}/sheet` (others)
- `buildCharacterSheet()` in `character-sheet.ts` builds equipment from `calculateEquipmentTotals()`
- Equipment shape for paper doll: `{ slot, itemId, itemName, quality, stats, enchanted, nonProficient }`
- This is different from the `/equipment/equipped` endpoint shape used by InventoryPage, but both ultimately read from the same `characterEquipment` + `items` + `itemTemplates` tables
- Other players' equipment IS visible but stats are redacted (`stats: undefined` for non-owners)

## Slot Detection

### `detectSlot()` Function (InventoryPage lines 121-159)

**Status: Good with minor gap**

| Item Type | Detection Logic | Correct? |
|-----------|----------------|----------|
| WEAPON | Always → MAIN_HAND | Yes (can't equip to OFF_HAND via auto-detect though) |
| TOOL | Always → TOOL | Yes |
| ARMOR | 1. Check `stats.equipSlot` JSON field → exact slot mapping | Yes |
| ARMOR | 2. Fallback: name-based guessing (helmet→HEAD, shield→OFF_HAND, etc.) | Mostly |
| ARMOR | 3. Ultimate fallback → CHEST | Reasonable |
| ACCESSORY | 1. Check `stats.equipSlot` → RING_1/RING_2/NECK | Yes |
| ACCESSORY | 2. Fallback: name-based (necklace/amulet→NECK) | Yes |
| ACCESSORY | 3. Ultimate fallback → RING_1 | Reasonable |
| CONSUMABLE | Returns null (not equippable) | Correct |
| MATERIAL | Returns null (not equippable) | Correct |

**Minor issues:**
- Weapons always go to MAIN_HAND — there's no way to equip a weapon to OFF_HAND (dual wielding), though the backend allows it
- RING_1 is always the default for accessories — no way to choose RING_2 specifically (player would need to equip ring 1 first, then the second defaults to... still RING_1, causing a swap)
- Shields are detected as ARMOR type with name-based "shield" check → OFF_HAND. This works.

## Issues Found

### P1 (broken)
1. **Equipped slot click does nothing.** `inventory.find((i) => i.id === equipped.item.id)` always returns undefined because equipped items are removed from inventory. Players cannot select equipped items from the equipment grid. (InventoryPage.tsx:340)

2. **Unequip is unreachable.** Because equipped items can't be selected (P1 #1) and `isItemEquippedSlot()` checks against inventory items that don't exist for equipped items, the "Unequip" button can never appear. Players have no way to unequip items. (InventoryPage.tsx:242, 669-677)

### P2 (degraded)
3. **No way to choose OFF_HAND for weapons.** `detectSlot()` hardcodes WEAPON → MAIN_HAND. Dual-wielding or placing a weapon in OFF_HAND is impossible through the UI. (InventoryPage.tsx:126)

4. **Ring slot always defaults to RING_1.** Second ring equip will trigger a swap dialog instead of auto-selecting RING_2. (InventoryPage.tsx:156)

5. **API errors are silently swallowed.** Neither `equipMutation` nor `unequipMutation` have `onError` handlers. If the backend rejects (proficiency, level, broken item), the player sees no feedback. (InventoryPage.tsx:211-233)

### P3 (polish)
6. **No empty-slot equip affordance.** Clicking an empty equipment slot does nothing. It could open a filtered list of equippable items for that slot.

7. **Year in studio footer says 2025.** (Unrelated but noticed: `studio-website/src/pages/ComingSoon.tsx:123`, `Footer.tsx:22` — should be 2026.)

## Verdict

**Can a player equip items today?** Yes — from the inventory grid, selecting an item and clicking "Equip" works correctly, including swap with confirmation.

**Can a player unequip items today?** No — the unequip button exists but is unreachable because equipped items can't be selected through either the equipment grid or the inventory grid.

**Can a player swap items today?** Yes — equipping an item to an occupied slot triggers a proper confirmation dialog and the swap works atomically.

**Overall:** The backend is production-ready. The frontend equip/swap flow works. **The unequip flow is broken** due to the equipped-slot click handler looking for items in inventory (where they no longer exist). This is the critical fix needed.
