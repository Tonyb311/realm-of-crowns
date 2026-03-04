# Fix: Equipment → Combat Pipeline

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead.
- Always end with a clear summary of what was delivered and what still needs the user's input.
- **Surgical changes** — don't refactor what already works. Weapons are fine. Don't touch them unless a fix requires it.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT: What the Audit Found

The equipment system has all the pieces but they're not connected to combat:

- **WORKS:** Weapons — MAIN_HAND damage dice, attack bonus, damage type all flow into combat correctly.
- **BROKEN — P0:** Armor AC — `getEquipmentAC()` reads `stats.ac` but all armor templates store `stats.armor`. Every character fights at 10 + DEX mod (naked AC) regardless of equipped armor.
- **BROKEN — P1:** Quality multipliers never applied in combat — a POOR sword and LEGENDARY sword deal identical damage. `calculateItemStats()` handles this perfectly but combat helpers bypass it.
- **BROKEN — P2:** Equipment attribute bonuses (STR ring, DEX boots, etc.) never applied to combatant stats. Only base character stats used.
- **BROKEN — P3:** Enchantment bonuses never applied (comes free once quality multipliers are wired in).
- **MISSING — P4:** Frontend only shows 6 of 12 equipment slots. HANDS, FEET, BACK, RING_1, RING_2, NECK are missing from UI.
- **MISSING — P5:** Character sheet shows base stats and equipment stats separately instead of combined totals.

The stat calculation service (`server/src/services/item-stats.ts`) already does everything right — quality multipliers, enchantment bonuses, stat aggregation. It just isn't called from combat code.

---

## THE TASK: Fix All 6 Priorities

### Phase 1: Fix Armor AC Key Mismatch (P0)

**This is a 1-line fix in 2 files with massive impact.**

File 1: `server/src/lib/road-encounter.ts`
- Find the `getEquipmentAC()` function (around line 182)
- It reads `stats?.ac` — change to `stats?.armor`
- This is the live PvE encounter path

File 2: `server/src/services/tick-combat-resolver.ts`
- Find the `getEquipmentAC()` function (around line 768)
- Same fix: `stats?.ac` → `stats?.armor`
- This is the tick/simulation combat path

Also check: `server/src/routes/combat-pve.ts` — if it has its own AC calculation, fix it there too. The audit says AC is stored in Redis from session start, so the initial calculation matters.

**Verify the fix:** After changing, trace the flow:
1. Iron Chestplate has `stats: { armor: 16 }`
2. `getEquipmentAC()` now reads `stats.armor` → returns 16
3. `createCharacterCombatant()` receives `equipmentAC: 16`
4. Combat engine uses `10 + DEX mod + 16` instead of `10 + DEX mod + 0`

### Phase 2: Wire Quality Multipliers + Enchantments into Combat (P1 + P3)

**The goal:** Replace raw template stat reads in combat helpers with calls to `calculateItemStats()` from `server/src/services/item-stats.ts`. This gives combat access to quality-scaled stats and enchantment bonuses in one shot.

**What needs to change:**

The combat entry points (`road-encounter.ts`, `tick-combat-resolver.ts`) currently have their own `getEquippedWeapon()` and `getEquipmentAC()` helper functions that read `item.template.stats` directly. These need to use `calculateItemStats()` instead.

For each combat entry point:

1. Import `calculateItemStats` from `../services/item-stats` (adjust path as needed)
2. In `getEquipmentAC()`:
   - For each equipped item, call `calculateItemStats(item)` instead of reading `item.template.stats` directly
   - Sum `finalStats.armor` (which includes quality multiplier + enchantment bonuses)
   - This replaces the raw `stats.armor` read from Phase 1 with the quality-scaled version
3. In `getEquippedWeapon()`:
   - Call `calculateItemStats(item)` on the MAIN_HAND item
   - Use `finalStats.damage` for base damage (if present)
   - For weapon-specific fields that aren't in the generic stat system (`diceCount`, `diceSides`, `damageType`, `bonusAttack`, `bonusDamage`), keep reading from template stats BUT apply the quality multiplier to numeric values (`bonusDamage`, `bonusAttack`)
   - A LEGENDARY weapon (1.8x) with `bonusDamage: 5` should get `bonusDamage: 9` (5 * 1.8, rounded)

**Important edge case:** The `calculateItemStats()` function requires the item to have `.template` and `.quality` (rarity) populated. Verify the Prisma queries in the combat helpers include `{ include: { template: true } }` and that the Item model has a `quality` field. If `quality` is nullable, default to `'COMMON'` (1.0x multiplier) for items without one.

**Do NOT refactor `calculateItemStats()` itself** — it works. Just call it.

### Phase 3: Apply Equipment Attribute Bonuses to Combatant Stats (P2)

**The goal:** When building a combatant for combat, add equipment stat bonuses (STR, DEX, CON, INT, WIS, CHA from gear) to the character's base stats.

**What needs to change:**

In each combat entry point, after loading equipment:

1. Import `calculateEquipmentTotals` from `../services/item-stats`
2. Before calling `createCharacterCombatant()`, call `calculateEquipmentTotals(characterId)`
3. The returned `totalStatBonuses` has keys like `strength`, `dexterity`, etc.
4. Add these to the character's base stats before passing to the combat engine

Example flow:
```typescript
const equipTotals = await calculateEquipmentTotals(characterId);

// Character base STR is 14, Gold Ring gives +3 STR
const effectiveStr = character.strength + (equipTotals.totalStatBonuses.strength ?? 0);
// effectiveStr = 17, which means higher attack modifier in combat
```

**Where stats are used in combat:**
- STR → melee attack bonus, melee damage bonus
- DEX → ranged attack bonus, AC bonus, initiative
- CON → HP bonus
- INT → spell attack/DC (some casters)
- WIS → spell attack/DC (some casters), some save DCs
- CHA → spell attack/DC (some casters)

The combat engine's `createCharacterCombatant()` already accepts these stats — you just need to pass the equipment-boosted values instead of raw base values.

**Also pass `totalResistances`** if the combat engine supports damage resistance checks. Search for `resistance` or `magicResist` in combat-engine.ts. If the engine doesn't support resistances yet, skip this — don't build new engine features.

**Also use `totalAC` from `calculateEquipmentTotals()`** instead of the manual `getEquipmentAC()` sum. This consolidates the AC calculation into one place and ensures quality/enchantment scaling applies. If you do this, you can simplify/remove the custom `getEquipmentAC()` functions since `calculateEquipmentTotals()` already sums armor correctly (once Phase 2 is done).

### Phase 4: Frontend — Add Missing Equipment Slots (P4)

**Files to modify:**
- `client/src/pages/InventoryPage.tsx`
- `client/src/pages/ProfilePage.tsx` (if it shows equipment)

**Current state:** UI shows 6 slots: MAIN_HAND, OFF_HAND, HEAD, CHEST, LEGS, TOOL

**Target state:** UI shows all 12 slots organized logically:

```
Equipment Layout:
┌──────────────────────────────┐
│         [HEAD]               │
│  [NECK]        [BACK]       │
│  [CHEST]                    │
│  [MAIN_HAND]  [OFF_HAND]   │
│  [HANDS]                    │
│  [RING_1]  [RING_2]        │
│  [LEGS]                     │
│  [FEET]                     │
│  [TOOL]                     │
└──────────────────────────────┘
```

- Use the existing slot rendering pattern — just add the 6 missing slots to the grid
- Each slot should show the equipped item name + rarity color, or "Empty" if unslotted
- Click to see item details / equip / unequip (same behavior as existing slots)
- Match existing visual style exactly — don't redesign, just extend

**Check the `ITEM_TYPE_SLOT_MAP` in `equipment.ts`:**
```typescript
WEAPON: ['MAIN_HAND', 'OFF_HAND'],
ARMOR: ['HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'BACK'],
ACCESSORY: ['RING_1', 'RING_2', 'NECK'],
TOOL: ['TOOL'],
```
The backend already supports all 12 slots with proper type→slot mapping. Frontend just needs to display them.

### Phase 5: Merge Equipment Stats into Character Sheet (P5)

On `ProfilePage.tsx` (or wherever the character sheet displays stats):

- Instead of showing "Base Stats" and "Equipment Stats" separately, show **Effective Stats**
- Format: `STR: 14 (+3)` where 14 is base and +3 is from equipment, total shown as 17
- Show effective AC: `AC: 18` (10 + DEX mod + equipment armor)
- Show effective damage range from weapon
- Keep the breakdown available (tooltip or collapsible section) but lead with the combined number

This is a UI-only change — the data already comes from existing API endpoints (`/equipment/stats` for totals, character endpoint for base stats).

---

## TESTING

After all phases, verify:

1. **Armor works:** Equip Iron Chestplate (armor: 16) → character AC in combat should be 10 + DEX mod + 16, not 10 + DEX mod
2. **Quality matters:** If you can, create or find two items of the same template but different quality. Verify the LEGENDARY one gives better stats in combat.
3. **Stat bonuses work:** Equip an accessory with STR bonus → verify the character's melee attack bonus increases in combat
4. **All 12 slots render:** Load inventory page, verify all 12 equipment slots appear
5. **Character sheet shows totals:** Profile page shows merged base + equipment stats

If you can't easily test quality differences (requires crafting two items), at minimum verify the `calculateItemStats()` integration by logging the output for a COMMON item and confirming the multiplier path runs.

---

## DEPLOYMENT

After all changes verified:

```bash
git add -A
git commit -m "fix: wire equipment stats to combat — armor AC fix, quality multipliers, gear stat bonuses, full 12-slot UI"
git push origin main
```

Build and deploy with unique tag:
```bash
# Use commit hash or timestamp as tag
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not refactor `calculateItemStats()` or `calculateEquipmentTotals()` — they work correctly
- Do not modify weapon handling if it already works — only touch weapon code if quality multiplier integration requires it
- Do not change the combat engine's internal resolution logic — only change what stats are **passed into** it
- Do not add new Prisma models or run migrations — the schema already supports everything needed
- Do not redesign the inventory UI — just extend the existing grid with the 6 missing slots
- Do not add durability-on-combat-damage logic if it already exists (the audit says it does)

## SUMMARY FOR CHAT

When done, print:
```
Equipment pipeline fixed:
- P0: Armor AC key mismatch (stats.ac → stats.armor) in [N] files
- P1: Quality multipliers now applied via calculateItemStats() in combat
- P2: Equipment stat bonuses (STR/DEX/etc) applied to combatant stats
- P3: Enchantment bonuses applied (via calculateItemStats integration)
- P4: All 12 equipment slots now in UI (was 6)
- P5: Character sheet shows effective stats (base + gear)
Deployed: tag [TAG]
```
