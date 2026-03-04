# Equipment → Combat Pipeline Audit

## Summary

**Equipment is partially connected to combat but has a critical bug that nullifies all armor.** Weapons work correctly — the equipped MAIN_HAND item's damage dice, attack bonus, and damage type are read by the combat engine. However, armor AC is completely broken: armor templates store their value under the key `armor` (e.g., `stats: { armor: 16 }`) but the combat engine reads `stats.ac` — a key that doesn't exist on any item template. This means every character fights at naked AC (10 + DEX) regardless of equipped armor. Additionally, equipment stat bonuses (STR/DEX from gear), quality multipliers, and enchantments are never applied to combat — they only appear in the UI display routes.

---

## Q1: Item Template Stats

### Schema Structure

`ItemTemplate.stats` is a **single untyped `Json` blob** (`stats Json @default("{}")`). No typed columns for damage, AC, etc. Different item types use completely different key names within this blob.

The `Item` model links to templates via `templateId` FK. Per-instance state: `currentDurability`, `quality` (rarity tier from crafting roll), `enchantments` (JSON array). Template stats are inherited at read time — no copying to the Item row.

### Static Data Location

`shared/src/data/items/` is essentially empty — contains only `item-names.ts` (name registry, no stats). Actual stat definitions live in:
- `shared/src/data/recipes/weapons.ts` — weapon stat shapes
- `database/seeds/weapon-recipes.ts` — weapon template seeding
- `database/seeds/armor-recipes.ts` — armor template seeding
- `database/seeds/accessory-recipes.ts` — accessory template seeding
- `shared/src/data/tools/index.ts` — tool tier definitions

Type definitions exist in `shared/src/data/recipes/types.ts` (`WeaponStats`, `ArmorStats`, `ConsumableStats`) but these are compile-time only, not enforced at DB layer.

### Sample Item Stats

**Weapon — Copper Dagger:**
```json
{ "baseDamage": 4, "damageType": "piercing", "speed": 12, "requiredStr": 3, "requiredDex": 5, "durability": 60, "levelToEquip": 1 }
```

**Armor — Iron Chestplate:**
```json
{ "armor": 16 }
```
(Mithril+ adds `magicResist`, e.g., `{ "armor": 38, "magicResist": 10 }`)

**Accessory — Gold Ring:**
```json
{ "magicPower": 5, "charisma": 3, "luck": 2 }
```

**Tool — Steel Pickaxe:**
```json
{ "speedBonus": 0.30, "yieldBonus": 0.15, "toolType": "Pickaxe", "tier": "STEEL", "professionType": "MINER" }
```

### Assessment

All 220+ item templates have **real, balanced stat values** — not placeholders. Weapons have full damage/speed/requirement tuples across 5 material tiers. Armor has `armor` + optional `magicResist`. Accessories use diverse stat combos. Tools use fractional bonus multipliers.

**Issue:** `durability` is stored twice for weapons — once as typed `Int` column on ItemTemplate and again inside the `stats` JSON blob. Armor only uses the typed column.

---

## Q2: Equipment System

### Routes (`server/src/routes/equipment.ts`)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /equipment/equip` | Move item from inventory to equipment slot | Fully implemented with validation (ownership, durability > 0, level/class requirements, auto-swap if slot occupied), transactional |
| `POST /equipment/unequip` | Return item from equipment slot to inventory | Fully implemented, transactional |
| `GET /equipment/equipped` | List all equipped items with calculated stats | Returns per-slot items with `calculateItemStats()` output |
| `GET /equipment/stats` | Aggregate equipment stat totals | Calls `calculateEquipmentTotals()`, returns totalAC, totalDamage, totalStatBonuses, totalResistances |

### Storage Model

Equipment uses a dedicated **`CharacterEquipment`** join table (not a field on Item):

```prisma
model CharacterEquipment {
  id          String    @id @default(uuid())
  characterId String
  slot        EquipSlot   // HEAD, CHEST, HANDS, LEGS, FEET, MAIN_HAND, OFF_HAND, RING_1, RING_2, NECK, BACK, TOOL
  itemId      String
  @@unique([characterId, slot])  // one item per slot per character
}
```

Both FK relations cascade on delete. Equipping removes from Inventory; unequipping returns to Inventory. All operations are transactional.

---

## Q3: Stat Calculation Service

### `calculateItemStats(item)` — `server/src/services/item-stats.ts`

1. Reads `item.template.stats` as base stats (falls back to `{}`)
2. Multiplies by quality tier:

| Rarity | Multiplier |
|--------|-----------|
| POOR | 0.7x |
| COMMON | 1.0x |
| FINE | 1.15x |
| SUPERIOR | 1.3x |
| MASTERWORK | 1.5x |
| LEGENDARY | 1.8x |

3. Sums enchantment bonuses from `item.enchantments` JSON array (reads `ench.bonuses ?? ench.stats`)
4. Returns `{ baseStats, qualityMultiplier, enchantmentBonuses, finalStats }`

Stat keys processed: `armor, damage, strength, dexterity, constitution, intelligence, wisdom, charisma, speed` plus a `resistance` sub-object.

**Enchantment support is real**, not stubbed — reads and sums all enchantment stat bonuses.

### `calculateEquipmentTotals(characterId)`

Queries all equipped items, calls `calculateItemStats()` for each, aggregates into:
- `totalAC` (sum of `finalStats.armor`)
- `totalDamage` (sum of `finalStats.damage`)
- `totalStatBonuses` (sum of str/dex/con/int/wis/cha/speed)
- `totalResistances` (sum of resistance sub-keys)
- `equippedCount`

### All Callers

| File | Functions Used |
|------|---------------|
| `server/src/routes/equipment.ts` | `calculateItemStats` (POST /equip, GET /equipped), `calculateEquipmentTotals` (GET /stats) |
| `server/src/routes/items.ts` | `calculateItemStats` (GET /details, GET /compare) |

**No combat code imports either function.** These are used exclusively for UI display routes.

---

## Q4: Combat Engine Integration

### How Combatants Are Built

The combat engine (`combat-engine.ts`) does NOT query the database itself. It receives pre-built stats from caller functions:

```typescript
createCharacterCombatant(id, name, team, stats, level, hp, maxHp,
  equipmentAC: number,       // <-- passed in from caller
  weapon: WeaponInfo | null,  // <-- passed in from caller
  spellSlots, proficiencyBonus
)
```

When `equipmentAC` is 0, it falls back to `BASE_AC + DEX_modifier` (i.e., `10 + DEX mod`).

### Entry Point Analysis

**`road-encounter.ts` (live PvE):**
- Calls `getEquippedWeapon(characterId)` — queries MAIN_HAND slot, reads `diceCount`, `diceSides`, `bonusDamage`, `bonusAttack`, `damageType` from template stats
- Calls `getEquipmentAC(characterId)` — queries all equipped items, sums `stats.ac`
- Passes both to `createCharacterCombatant()`

**`tick-combat-resolver.ts` (simulation/tick PvE):**
- Same pattern but synchronous — pre-loads equipment via Prisma include, then uses local `getEquipmentAC()` and `getEquippedWeapon()` functions
- Both read the same stat keys

**`combat-pve.ts` (interactive PvE `/action`):**
- Re-queries weapon server-side every action (P0 security fix)
- AC is stored in Redis combat state from session start — not re-queried per action

**`combat-presets.ts` (build combat params):**
- Used by tick-based resolver for autonomous combat decisions
- Reads weapon from MAIN_HAND equipment

### THE CRITICAL BUG: `armor` vs `ac` Key Mismatch

**Armor equipment has zero effect on combat.**

The disconnect:
- **Armor seeds** store AC under key `"armor"`: `stats: { armor: 16 }` (in `armor-recipes.ts`)
- **Combat engine** reads key `"ac"`: `if (stats?.ac) { ac += stats.ac; }` (in both `road-encounter.ts:182` and `tick-combat-resolver.ts:768`)
- Since no item template has an `"ac"` key, `getEquipmentAC()` **always returns 0**
- This causes fallback to `10 + DEX modifier` — naked AC for every character

A player in full Adamantine plate armor (`armor: 52`) fights identically to a naked player with the same DEX.

### What Equipment Stats ARE vs ARE NOT Used in Combat

| Stat | Used in Combat? | Evidence |
|------|----------------|---------|
| Weapon damage dice (diceCount, diceSides) | YES | Read from MAIN_HAND template stats |
| Weapon attack/damage bonus | YES | `bonusAttack`, `bonusDamage` from template |
| Weapon damage type | YES | `damageType` from template |
| Armor AC | NO (BUG) | Code reads `stats.ac`, templates store `stats.armor` |
| Attribute bonuses (STR/DEX from gear) | NO | Never applied to combatant stats |
| Item quality multiplier | NO | `calculateItemStats()` never called from combat |
| Enchantment bonuses | NO | Never applied to combatant stats |
| Magic resist | NO | Never read by combat engine |
| Equipment durability damage after combat | YES | Applied in post-combat transaction |

---

## Q5: Frontend Equipment UI

### InventoryPage.tsx

Fully functional with 6 primary equipment slots displayed: MAIN_HAND, OFF_HAND, HEAD, CHEST, LEGS, TOOL.

Features:
- Equip/unequip via real API calls with transactional swaps
- Auto-detects equippable slot from item type and name keywords
- Confirmation modal for slot replacement
- Shows combat stats (Attack + Defense totals)
- Item detail panel with full stats, durability, equip/unequip buttons
- Rarity coloring (POOR → LEGENDARY)
- Durability bars for tools

### ProfilePage.tsx

Shows equipment section with all 6 slots and combat stats summary. Base character stats and equipment stats are displayed **separately** — not merged.

### Gaps

- 3 accessory slots (RING_1, RING_2, NECK) exist in backend `EquipSlot` enum but are NOT displayed in the 6-slot frontend grid
- HANDS, FEET, BACK slots also exist in enum but not in UI
- Base character stats not merged with equipment bonuses in the character sheet display

---

## Q6: Pipeline Status

| Link | Status | Evidence |
|------|--------|----------|
| ItemTemplate → has stats | CONNECTED | All 220+ templates have real stat values in the `stats` JSON blob. Weapons: baseDamage/diceCount/diceSides. Armor: armor. Accessories: various stat bonuses. |
| Item → inherits template stats | CONNECTED | Items reference templates via FK. Stats read at query time via `item.template.stats`. Quality stored per-instance for multiplier calculation. |
| Inventory → Equipment Slot | CONNECTED | Full equip/unequip API with transactional inventory↔equipment swaps, validation (ownership, durability, level, class). 12-slot enum. |
| Equipment → Stat Calculation | CONNECTED (display only) | `calculateItemStats()` and `calculateEquipmentTotals()` work correctly with quality multipliers and enchantments. But only called from UI display routes (`/equipment/equipped`, `/equipment/stats`, `/items/details`). |
| Stat Calculation → Combat Engine | BROKEN | Combat code does NOT call `calculateItemStats()` or `calculateEquipmentTotals()`. It uses its own `getEquipmentAC()` / `getEquippedWeapon()` helpers that read raw template stats, bypassing quality scaling and enchantments entirely. |
| Combat Engine → Weapon Resolution | CONNECTED | Equipped MAIN_HAND weapon's dice, bonuses, and damage type are correctly passed to `createCharacterCombatant()` and used in attack/damage calculations. |
| Combat Engine → Armor Resolution | BROKEN (key mismatch) | `getEquipmentAC()` reads `stats.ac` but all armor templates store `stats.armor`. Result: AC is always 0, every character fights at 10 + DEX mod regardless of armor. |
| Combat Engine → Stat Bonuses from Gear | BROKEN (not implemented) | Attribute bonuses from accessories/armor (STR rings, DEX boots, etc.) are never applied to combatant stats. Only base character stats (race mods + level allocation) are used. |
| Combat Engine → Quality/Enchantment Scaling | BROKEN (not implemented) | Item quality multipliers (POOR 0.7x → LEGENDARY 1.8x) and enchantment bonuses are never applied in combat. A POOR sword and LEGENDARY sword with the same template deal identical damage. |

---

## Recommendations

### Priority 1: Fix armor AC key mismatch (1-line fix, massive impact)

In both `getEquipmentAC()` functions:
- `server/src/lib/road-encounter.ts` line 182: change `stats?.ac` → `stats?.armor`
- `server/src/services/tick-combat-resolver.ts` line 768: change `stats?.ac` → `stats?.armor`

This immediately makes all armor functional in combat.

### Priority 2: Integrate quality multipliers into combat

Replace the raw `stats.armor` / weapon stat reads in the combat helpers with calls to `calculateItemStats()`, so that item quality affects combat. A LEGENDARY sword should hit harder than a POOR one.

### Priority 3: Apply equipment attribute bonuses to combatant stats

When building a combatant, sum equipment stat bonuses (STR, DEX, CON, etc. from accessories/armor) and add them to the character's base stats before passing to `createCharacterCombatant()`. This makes rings, necklaces, and stat-bearing armor meaningful.

### Priority 4: Apply enchantment bonuses to combat

Once quality multipliers work (P2), enchantment bonuses come along for free since `calculateItemStats()` already handles them. Just need to ensure the combat helpers use `finalStats` from `calculateItemStats()` rather than raw template stats.

### Priority 5: Add missing equipment slots to frontend UI

The backend supports 12 slots (HEAD, CHEST, HANDS, LEGS, FEET, MAIN_HAND, OFF_HAND, RING_1, RING_2, NECK, BACK, TOOL) but the frontend only shows 6. Add UI for HANDS, FEET, BACK, RING_1, RING_2, NECK.

### Priority 6: Merge equipment stats into character sheet display

ProfilePage currently shows base stats and equipment stats separately. Show combined totals so players can see their effective combat stats at a glance.
