# Early-Game Monster Expansion Audit

## Summary
Expanded L1-9 monster roster with 26 new monsters across 10 families, created an encounter template system with 35 multi-monster templates, and added `family` tags to all 155 monsters.

## Changes Made

### 1. Schema: `family` Column
- **File:** `database/schema/tables.ts` - Added `family: text()` to monsters table
- **Migration:** `database/drizzle-migrations/0005_add_monster_family.sql` - `ALTER TABLE "monsters" ADD COLUMN "family" text`

### 2. Monster Seed Data (database/seeds/monsters.ts)
- Added `family?: string` to `MonsterDef` interface
- Tagged all 128 existing monsters with one of 19 family keys
- Added 26 new L1-9 monsters:
  - **Wolves:** Timber Wolf Pup (L1), Alpha Wolf (L4 elite)
  - **Goblins:** Goblin Archer (L2), Goblin Shaman (L3), Worg (L3)
  - **Bandits:** Bandit Marksman (L4), Bandit Captain (L6 elite)
  - **Undead:** Bone Archer (L4), Ghoul Pack Leader (L5 elite)
  - **Beasts:** Wild Boar (L1), Marsh Rat (L1)
  - **Elementals:** Dust Sprite (L1), Cinder Wisp (L1), Frost Sprite (L1), Sea Spray (L1)
  - **Fey:** Pixie Trickster (L2), Satyr Prankster (L4)
  - **Desert:** Sand Beetle (L1), Scorpion Swarm (L2), Sand Lurker (L3)
  - **Aquatic:** River Pike (L1), Snapping Turtle (L2), Giant Crayfish (L3), River Serpent (L5)
  - **Insects:** Giant Ant (L2), Spider Hatchling (L3)

### 3. Encounter Template System (shared/src/data/encounter-templates.ts) - NEW
- `EncounterTemplate` and `EncounterComposition` interfaces
- 35 templates covering all 10 released biomes + RIVER (documented as unreachable)
- Templates support `familyTags`, `statScale` for pack minions, weighted selection
- `ENCOUNTER_TEMPLATES` exported as typed array

### 4. Road Encounter Integration (server/src/lib/road-encounter.ts)
- `selectEncounterTemplate()` - weighted random by biome + level range
- `applyStatScale()` - scales HP/attack for pack minions, appends "(Pack)" to name
- Multi-monster combatant creation via `SelectedMonster[]` array
- Template-first selection with fallback to single-monster behavior
- XP/loot iterates all selected monsters
- Loop cap adjusted: `MAX_COMBAT_ROUNDS * totalCombatants`

### 5. Narrator Templates (shared/src/data/combat-narrator/templates.ts)
- Added MONSTER_FLAVOR entries for all 26 new monsters (attack, wounded, opening)

## Issue Resolutions

### Issue 1: Pack Display Name
- `applyStatScale()` appends "(Pack)" when `scale < 1.0`
- Visible in combat logs to distinguish stat-scaled minions

### Issue 2: RIVER Biome Comment
- Comment in encounter-templates.ts explaining TERRAIN_TO_BIOME gap
- RIVER templates exist but won't trigger until terrain mapping is added

### Issue 3: Bandit Captain CR
- **Before fix:** CR delta +5.6 (multiattack 2 + elite stats)
- **Fix:** Replaced `Flurry of Steel` (multiattack 2) with `Captain's Cut` (2d6 damage, cd 2). Reduced HP 28->26, CON 14->12.
- **After fix:** CR delta +3.6 (within acceptable range)

### Issue 4: Multi-Monster Combat Loop
- Verified `createCombatState()` and `resolveTurn()` already support multiple team-1 combatants
- Only needed to adjust loop cap and XP/loot iteration

## CR Verification (Full Results)
- All 12 L1 monsters: delta 0.0 (perfectly calibrated)
- All L2-L5 new monsters: within acceptable range
- Bandit Captain (L6 elite): delta +3.6 after fix
- No new monsters on buff hit list

## Build Verification
- `npx tsc --build shared/tsconfig.json` - PASS
- `npx tsc -p server/tsconfig.build.json --noEmit` - PASS (excluding dev scripts)
- `cd client && npx tsc --noEmit` - PASS

## Family Tag Reference (19 keys)
wolves, goblins, orcs, bandits, undead, beasts, insects, elementals, fey, reptiles, plants, oozes, constructs, giants, dragons, fiends, aberrations, aquatic, celestials
