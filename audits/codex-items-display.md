# Codex Items Display Audit

## Summary

The Codex items page (`CodexItems.tsx`) fetches all 220+ ItemTemplates with full `stats` JSON included in the API response, but **completely ignores the stats blob in rendering**. Only three scalar fields are displayed (baseValue, durability, levelRequired). The `InventoryPage.tsx` ItemDetailPanel already has a working generic stat renderer (filters metadata keys, handles percentages, color-codes values) that can be directly reused. The fix is purely frontend — no API changes needed.

---

## Q1: Current Codex Items Rendering

### Two Codex Components Exist

**1. `client/src/components/codex/CodexItems.tsx` (Player-facing Codex)**

The main in-game Codex for browsing items and crafting relationships.

**Collapsed view shows:**
- Item name (with rarity color)
- Rarity badge
- Recipe connection summary ("Crafted by Blacksmith", "Used in X recipes")

**Expanded view shows:**
- Rarity badge
- Type badge (WEAPON, ARMOR, TOOL, etc.)
- Profession required badge
- Description text
- Three scalar fields only:
  - `baseValue` (gold price) — `Value: 150g`
  - `durability` (max uses) — `Durability: 80`
  - `levelRequired` (min level) — `Lv. 10`
- "Produced By" section — recipes that create this item
- "Used In" section — recipes that use this as ingredient

**Stats JSON rendering:** **COMPLETELY IGNORED.** The `stats` field exists in the interface (`stats: any`) and is fetched from the API, but the expanded item view only renders the three hardcoded scalar fields above. The stats JSON blob (damage, armor, stat bonuses, etc.) is never parsed or displayed.

**Item type handling:** 8 types defined (`WEAPON`, `ARMOR`, `CONSUMABLE`, `TOOL`, `MATERIAL`, `ACCESSORY`, `HOUSING`, `RESOURCE`), grouped into sections with filter tabs. All types use the same generic rendering — no type-specific stat display.

**2. `client/src/components/admin/combat/CodexTab.tsx` (Admin Combat Dashboard)**

The admin-only combat dashboard has Items as one of 5 sub-tabs. This shows items as lightweight recipe references — item name, ingredients, profession badge, level requirement. **Stats JSON is not rendered here either.** This component is focused on recipe/ingredient relationships, not combat stats.

---

## Q2: API Response

### Endpoint: `GET /api/codex/items`

**Location:** `server/src/routes/codex.ts` (lines 111-137)

```typescript
const items = await prisma.itemTemplate.findMany({
  orderBy: [{ type: 'asc' }, { rarity: 'asc' }, { name: 'asc' }],
  select: {
    id: true,
    name: true,
    type: true,
    rarity: true,
    description: true,
    stats: true,              // ✓ STATS INCLUDED
    durability: true,
    baseValue: true,
    professionRequired: true,
    levelRequired: true,
  },
});
```

**Verdict: Stats ARE included in the API response.** The `select` clause explicitly includes `stats: true`. No filtering or transformation occurs server-side. The stats JSON blob is returned as-is from the database.

**Response shape:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Iron Chestplate",
      "type": "ARMOR",
      "rarity": "COMMON",
      "description": "...",
      "stats": { "armor": 16 },
      "durability": 150,
      "baseValue": 200,
      "professionRequired": "ARMORER",
      "levelRequired": 10
    }
  ],
  "total": 220
}
```

Cached for 300 seconds. Public endpoint (no auth required).

**Conclusion: The problem is 100% frontend rendering.** The data is there; the component just doesn't display it.

---

## Q3: Stat Shapes Per Item Type

### Weapons (from `shared/src/data/recipes/weapons.ts`, `ranged-weapons.ts`)

**Keys:** `baseDamage`, `damageType`, `speed`, `requiredStr`, `requiredDex`, `durability`, `levelToEquip`, `twoHanded` (optional), `range` (optional, ranged only)

**Example — Copper Sword (Level 1, Melee):**
```json
{ "baseDamage": 6, "damageType": "slashing", "speed": 8, "requiredStr": 5, "requiredDex": 4, "durability": 70, "levelToEquip": 1 }
```

**Example — Iron Longsword (Level 10, 2H Melee):**
```json
{ "baseDamage": 12, "damageType": "slashing", "speed": 6, "requiredStr": 7, "requiredDex": 3, "durability": 120, "levelToEquip": 10, "twoHanded": true }
```

**Example — Shortbow (Level 5, Ranged):**
```json
{ "baseDamage": 6, "damageType": "piercing", "speed": 10, "requiredStr": 4, "requiredDex": 6, "durability": 80, "levelToEquip": 1, "twoHanded": true, "range": 20 }
```

### Armor (from `database/seeds/armor-recipes.ts`)

**Keys:** `armor`, `magicResist` (optional), `durability`, `levelToEquip`, `requiredStr` (optional), `movementPenalty` (optional), `stealthPenalty` (optional)

**Example — Copper Helm (Level 1):**
```json
{ "armor": 4, "durability": 60, "levelToEquip": 1, "requiredStr": 4, "movementPenalty": 0, "stealthPenalty": 1 }
```

**Example — Mithril Chestplate (Level 55, High Tier):**
```json
{ "armor": 38, "magicResist": 10, "durability": 400, "levelToEquip": 55, "requiredStr": 9, "movementPenalty": 2, "stealthPenalty": 2 }
```

**Example — Cloth Robes (Level 1, Magical):**
```json
{ "magicResist": 4, "durability": 40, "levelToEquip": 1 }
```

Note: Some armor templates only store `{ armor: 16 }` in the stats JSON (the `durability`/`levelToEquip` are also typed columns on ItemTemplate). The seed files store the full outputStats from recipes, but only some keys end up in the stats blob.

### Accessories (from `database/seeds/accessory-recipes.ts`)

**Keys (variable):** `defense`, `magicPower`, `magicResistance`, `charisma`, `luck`, `strength`, `intelligence`, `wisdom`, `health`, `mana`, `speed`, `attackSpeed`

**Example — Copper Ring (Level 1):**
```json
{ "defense": 1 }
```

**Example — Gold Ring (Level 30):**
```json
{ "magicPower": 5, "charisma": 3, "luck": 2 }
```

**Example — Crown of Wisdom (Level 50):**
```json
{ "magicPower": 10, "mana": 30, "intelligence": 6, "charisma": 5 }
```

**Example — Brooch of Speed (Level 30):**
```json
{ "speed": 6, "attackSpeed": 4 }
```

### Tools (from `shared/src/data/tools/index.ts`)

**Keys:** `speedBonus` (fractional, 0.10 = 10%), `yieldBonus` (fractional, 0.05 = 5%), `toolType`, `tier`, `professionType`

```typescript
// 6 tiers:
{ tier: 'CRUDE',       speedBonus: 0.00, yieldBonus: 0.00, durability: 20 }
{ tier: 'COPPER',      speedBonus: 0.10, yieldBonus: 0.05, durability: 40 }
{ tier: 'IRON',        speedBonus: 0.20, yieldBonus: 0.10, durability: 60 }
{ tier: 'STEEL',       speedBonus: 0.30, yieldBonus: 0.15, durability: 80 }
{ tier: 'MITHRIL',     speedBonus: 0.40, yieldBonus: 0.20, durability: 120 }
{ tier: 'ADAMANTINE',  speedBonus: 0.50, yieldBonus: 0.25, durability: 200 }
```

### Consumables (from `shared/src/data/recipes/consumables.ts`)

**Keys:** `effect`, `magnitude`, `duration` (minutes, 0=instant), `stackSize`, `secondaryEffect` (optional), `secondaryMagnitude` (optional)

**Example — Minor Healing Potion:**
```json
{ "effect": "heal_hp", "magnitude": 15, "duration": 0, "stackSize": 20 }
```

**Example — Elixir of Strength:**
```json
{ "effect": "buff_strength", "magnitude": 3, "duration": 5, "stackSize": 10 }
```

**Example — Berry Salve:**
```json
{ "effect": "hp_regen", "magnitude": 8, "duration": 3, "stackSize": 20 }
```

### Enchantment Scrolls (CONSUMABLE subtype, from `database/seeds/accessory-recipes.ts`)

**Keys (custom per enchantment):** `fireDamage`, `coldDamage`, `lightningDamage`, `holyDamage`, `shadowDamage`, `durabilityBonus`, `attackSpeedBonus`, `undeadBonus`

**Example — Flaming Enchantment Scroll:**
```json
{ "fireDamage": 8 }
```

**Example — Holy Enchantment Scroll:**
```json
{ "holyDamage": 15, "undeadBonus": 10 }
```

---

## Q4: Type Definitions

### 1. WeaponStats (`shared/src/data/recipes/types.ts`)

```typescript
export interface WeaponStats {
  baseDamage: number;
  damageType: DamageType;     // 'slashing' | 'piercing' | 'bludgeoning'
  speed: number;
  requiredStr: number;
  requiredDex: number;
  durability: number;
  levelToEquip: number;
  twoHanded?: boolean;
  range?: number;
}
```

### 2. ArmorStats (`shared/src/data/recipes/types.ts`)

```typescript
export interface ArmorStats {
  armor: number;
  magicResist?: number;
  durability: number;
  levelToEquip: number;
  requiredStr?: number;
  movementPenalty?: number;
  stealthPenalty?: number;
}
```

### 3. ConsumableStats (`shared/src/data/recipes/types.ts`)

```typescript
export interface ConsumableStats {
  effect: ConsumableEffect;
  magnitude: number;
  duration: number;       // minutes of real time (0 = instant)
  stackSize: number;
  secondaryEffect?: ConsumableEffect;
  secondaryMagnitude?: number;
}

export type ConsumableEffect =
  | 'heal_hp' | 'heal_mana' | 'buff_strength' | 'buff_dexterity'
  | 'buff_intelligence' | 'buff_constitution' | 'buff_wisdom' | 'buff_charisma'
  | 'cure_poison' | 'cure_disease' | 'apply_poison' | 'damage_fire'
  | 'damage_area' | 'blind' | 'obscure' | 'hp_regen' | 'mana_regen'
  | 'buff_all_stats' | 'buff_strength_debuff_intelligence' | 'reveal_map'
  | 'identify' | 'damage_ice' | 'damage_lightning' | 'damage_healing'
  | 'cure_all' | 'poison_immunity' | 'sustenance' | 'buff_armor' | 'stun';
```

### 4. ItemStats — Runtime (`server/src/services/item-stats.ts`)

```typescript
export interface ItemStats {
  armor?: number;
  damage?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  speed?: number;
  resistance?: Record<string, number>;
  [key: string]: unknown;   // escape hatch for custom keys
}
```

Recognized numeric keys for quality scaling: `armor`, `damage`, `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`, `speed`.

### 5. ToolTierStats (`shared/src/data/tools/index.ts`)

```typescript
export interface ToolTierStats {
  tier: ToolTier;
  speedBonus: number;
  yieldBonus: number;
  durability: number;
  rarity: string;
}
```

---

## Q5: Existing Item Display Components

### Best Reusable Pattern: `ItemDetailPanel` in `InventoryPage.tsx`

**Location:** `client/src/pages/InventoryPage.tsx:514-659`

This is the most complete stat renderer in the codebase:

```typescript
// Filter out internal/metadata stats
const displayStats = item.template.stats
  ? Object.entries(item.template.stats).filter(
      ([key]) => !['equipSlot', 'professionType', 'toolType', 'tier'].includes(key),
    )
  : [];

// Render each stat as a key-value row
{displayStats.map(([stat, value]) => {
  const numVal = typeof value === 'number' ? value : 0;
  const isPercentage = stat === 'yieldBonus' || stat === 'speedBonus';
  const displayVal = isPercentage
    ? `${numVal > 0 ? '+' : ''}${Math.round(numVal * 100)}%`
    : `${numVal > 0 ? '+' : ''}${numVal}`;
  return (
    <div key={stat} className="flex justify-between text-xs">
      <span className="text-realm-text-secondary capitalize">
        {stat.replace(/([A-Z])/g, ' $1').trim()}
      </span>
      <span className={numVal > 0 ? 'text-realm-success' : numVal < 0 ? 'text-realm-danger' : 'text-realm-text-secondary'}>
        {displayVal}
      </span>
    </div>
  );
})}
```

**Features:**
- Filters metadata keys: `equipSlot`, `professionType`, `toolType`, `tier`
- Handles percentage stats: `yieldBonus`, `speedBonus` → multiply by 100, add `%`
- Color-codes values: green (+), red (-), gray (0)
- CamelCase→readable: `baseDamage` → `base Damage`
- Positive prefix: `+6`, `+20%`
- Works across all item types (generic approach)

### Equipment Slot Inline Summary (InventoryPage.tsx)

Compact stat display inside equipment slot buttons:
```typescript
{equipped.item.stats.damage && `+${Math.round(damage)} ATK`}
{equipped.item.stats.armor && `+${Math.round(armor)} DEF`}
{equipped.item.stats.yieldBonus && `+${Math.round(yieldBonus * 100)}%`}
```
Maps: `damage` → ATK, `armor` → DEF. Very terse, single-line.

### Market Detail Popup (MarketPage.tsx)

```typescript
{Object.entries(selectedListing.item.stats).map(([key, val]) => (
  <div key={key} className="flex justify-between text-xs">
    <span className="text-realm-text-muted capitalize">{key}</span>
    <span className="text-realm-text-primary">{val}</span>
  </div>
))}
```
Shows all stats in 2-column grid. No filtering, no color coding, no percentage handling. Simpler version.

### Components That DON'T Show Stats
- `CraftingResults.tsx` — Shows quality, XP, profession progress only
- `GatheringResults.tsx` — Shows items, quantities, rarity only
- No standalone `ItemCard`, `ItemDetail`, or `ItemTooltip` components exist

---

## Recommendations

### What Needs to Change

**File:** `client/src/components/codex/CodexItems.tsx`

**Section:** The expanded item detail view (around lines 300-340)

**Change:** Add a stats rendering block after the existing scalar fields display (baseValue, durability, levelRequired). Reuse the exact pattern from `InventoryPage.tsx` `ItemDetailPanel`.

### Specific Implementation

1. **Add generic stat renderer** — Copy the `displayStats` pattern from InventoryPage's ItemDetailPanel:
   - Filter out metadata keys: `equipSlot`, `professionType`, `toolType`, `tier`
   - Iterate remaining entries as key-value rows
   - Handle percentages for `yieldBonus`, `speedBonus`
   - Color-code positive/negative values
   - Convert camelCase to human-readable labels

2. **Consider type-specific formatting (optional enhancement):**
   - **Weapons:** Show damage type as badge (slashing/piercing/bludgeoning), range if present, 2H indicator
   - **Armor:** Show armor as "AC +16", magic resist separately
   - **Consumables:** Show effect as human-readable ("Heals 15 HP", "Buff STR +3 for 5 min")
   - **Tools:** Already handled by percentage display
   - **Accessories:** Already handled by generic key-value display

3. **Do NOT modify the API** — Stats are already returned with all needed data.

4. **Do NOT modify `CodexTab.tsx`** (admin) — That component is focused on recipe/ingredient relationships, not combat stats. Fixing the player-facing Codex is the priority.

### Estimated Scope

- **Minimum fix:** ~15 lines added to CodexItems.tsx (generic stat block reusing InventoryPage pattern)
- **Enhanced fix:** ~50-80 lines if adding type-specific formatting (weapon damage type badges, consumable effect descriptions, etc.)
- **No new files needed** — this is a single-component change
- **No API changes needed** — data already flows correctly
