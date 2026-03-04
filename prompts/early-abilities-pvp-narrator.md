# Early-Level Abilities + PvP Narrator Integration

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## THIS PROMPT HAS TWO INDEPENDENT TASKS

**Task 1:** Restructure early-level class abilities (data-only changes to ability files)
**Task 2:** Wire the CombatNarrator into PvP combat routes (combat-pvp.ts is missing narration)

These tasks are independent but shipped together. If one blocks, the other can still complete.

---

# TASK 1: EARLY-LEVEL ABILITIES + CASTER ATTACK FIX

## Context

Combat balance audit (47,950 fights) revealed: **ALL class abilities require Level 10+** except Psion which was already fixed. Levels 1-9 have zero class differentiation — every class just does basic weapon attacks. Casters (Mage, Cleric, Bard) swing staves with STR-based attacks, which is thematically wrong.

## The Model: Psion Already Works

Psion's pattern in `shared/src/data/skills/psion.ts`:
- L1: Cantrip (cooldown: 0, usable every round)
- L5: Passive/defensive
- L12: Heavy damage or CC
- L18: Utility/control
- L28: AoE or powerful
- L40: Ultimate capstone

Every spec has a **cooldown-0 ability at L1** so the combat AI uses it instead of basic attacks.

## Part A: Shift Ability Levels for 6 Classes

Modify ability files in `shared/src/data/skills/` for: Warrior, Mage, Rogue, Cleric, Ranger, Bard.

### Level Shift Table

| Position | Old Level | New Level | Notes |
|----------|-----------|-----------|-------|
| 1st | 10 | **1** | Remove `prerequisiteAbilityId`, consider cooldown: 0 |
| 2nd | 14 | **5** | Set `prerequisiteAbilityId` → 1st ability |
| 3rd | 16 | **10** | Keep existing chain |
| 4th | 22 | **18** | Keep existing chain |
| 5th | 30 | **28** | Keep existing chain |
| 6th | 40 | **40** | Unchanged capstone |

### Per-Class Cantrip Decisions

**L1 abilities that should get `cooldown: 0` (cantrip):**
- Warrior Berserker → Reckless Strike: Already `cooldown: 0` ✅
- Mage Enchanter → Arcane Bolt: Already `cooldown: 0` ✅
- Cleric Paladin → Smite: Change from `cooldown: 1` to `cooldown: 0` (holy cantrip)
- Ranger Sharpshooter → Aimed Shot: Change from `cooldown: 2` to `cooldown: 0` (archer cantrip)

**L1 abilities to keep existing cooldown (tactical, not cantrips):**
- Warrior Guardian → Shield Bash: Keep `cooldown: 3` (stun is tactical)
- Warrior Warlord → Rally Cry: Keep `cooldown: 5` (buff is tactical)
- Mage Elementalist → Fireball: Keep cooldown but **reduce dice from 3d6 to 1d6** for L1 appropriateness. AoE at L1 is fine — road encounters are 1v1 so it effectively hits one target.
- Mage Necromancer → Life Drain: Keep `cooldown: 2` (drain is strategic)
- Rogue Assassin → Backstab: Keep `cooldown: 2` (burst is tactical)
- Rogue Thief → Pilfer: Keep `cooldown: 3`
- Rogue Swashbuckler → Riposte: Keep `cooldown: 2`
- Cleric Healer → Healing Light: Keep `cooldown: 2`
- Cleric Inquisitor → Denounce: Keep `cooldown: 3`
- Ranger Beastmaster → Call Companion: Keep `cooldown: 6`
- Ranger Tracker → Lay Trap: Keep `cooldown: 3`
- Bard Diplomat → Charming Words: Keep `cooldown: 3`
- Bard Battlechanter → War Song: Keep `cooldown: 4`
- Bard Lorekeeper → Analyze: Keep `cooldown: 2`

Classes without cooldown-0 cantrips (Rogue, Bard, non-Smite Clerics, non-Aimed-Shot Rangers) are fine — their class fantasy includes basic weapon attacks between ability uses. Rogues stab with daggers, Warriors swing swords. This is intended.

### Prerequisite Chain Verification

After shifting, verify for every class:
1. L1 abilities have NO `prerequisiteAbilityId` (remove if present)
2. L5 abilities chain to their L1 sibling (same spec)
3. All further abilities chain correctly down the spec tree
4. No circular dependencies
5. Ability IDs are NOT changed — only `levelRequired`, `cooldown`, and `prerequisiteAbilityId`

### DO NOT modify `psion.ts` — it already has the correct pattern.

## Part B: Caster Attack Stat Override

The live game gives casters STR-based staff attacks. The batch simulator already fixed this. Apply the same fix to live combat.

**Find where `createCharacterCombatant()` builds the weapon info** and override the attack/damage stat based on class:

```typescript
const CLASS_ATTACK_STAT: Record<string, StatKey> = {
  warrior: 'str',
  rogue: 'dex',
  ranger: 'dex',
  mage: 'int',
  psion: 'int',
  cleric: 'wis',
  bard: 'cha',
};
```

Apply this override on the weapon's `attackModifierStat` and `damageModifierStat` **when building the combatant**, not in the engine. Check both:
- `server/src/routes/combat-pve.ts` — where PvE combatants are built
- `server/src/routes/combat-pvp.ts` — where PvP combatants are built
- `server/src/services/tick-combat-resolver.ts` — where tick-based road encounter combatants are built

All three paths need the override. The character's class determines their attack stat regardless of weapon.

**Do NOT modify `combat-engine.ts`** — set the correct stat on the combatant BEFORE it enters the engine.

---

# TASK 2: PVP NARRATOR INTEGRATION

## Context

The CombatNarrator was deployed in tag 202603022045. It transforms mechanical `TurnLogEntry` objects into narrative `CombatLogEntry` objects with flavor text, HP-threshold tone modifiers, monster personality, and combat opening lines.

**The narrator was wired into PvE only.** The PvP route (`server/src/routes/combat-pvp.ts`) still returns raw `TurnLogEntry[]` without narration. This means PvP combat logs are mechanical spreadsheets while PvE logs are narrative — inconsistent player experience.

## What PvE Has (Reference Implementation)

Look at `combat-pve.ts` → `formatCombatResponse()`. It:

1. Imports narrator functions: `narrateCombatEvent`, `narrateStatusTick`, `generateCombatOpening` (or however they were named — **read the actual imports**)
2. Builds a `combatantMap` for looking up actor names, races, classes, HP
3. Maps each `TurnLogEntry` → one or more `CombatLogEntry` with:
   - `id`: unique string
   - `actor`: combatant name
   - `actorType`: 'player' | 'enemy' | 'system'
   - `action`: action type string
   - `roll`: d20 roll (if attack)
   - `damage`: damage dealt (if any)
   - `healing`: healing done (if any)
   - `message`: **narrator-generated flavor text**
   - `isCritical`: boolean for UI highlighting
   - `timestamp`: ISO string
4. Expands `statusTicks` into separate narrative entries via `narrateStatusTick()`
5. Prepends a combat opening flavor line as a `system` entry

## What PvP Currently Does

The PvP route has **4 endpoints** that return combat log data, and NONE use the narrator:

### 1. `POST /action` (ranked duel)
Returns:
```typescript
response.session.combatants = [...] // basic combatant data
response.turnResult = lastLog;       // RAW TurnLogEntry — no narration
```
**No log array in response.** Client gets a single raw turn result.

### 2. `POST /spar-action`
Same pattern — returns `turnResult: lastLog` as raw TurnLogEntry.

### 3. `GET /state` (ranked duel)
Returns:
```typescript
session.log = combatState.log; // ENTIRE raw TurnLogEntry[] — no narration
```

### 4. `GET /spar-state`
Same — returns raw `combatState.log`.

## The Fix

### Step 1: Extract Shared Narrator Formatting

The `formatCombatResponse()` function in `combat-pve.ts` does the narrator transformation. **Extract the log-narration logic** into a shared utility so both PvE and PvP use it.

Create or find the appropriate shared location. Options:
- `server/src/lib/combat-narrator-formatter.ts` — new shared module
- Or refactor `formatCombatResponse()` to be importable

The shared function signature should be something like:

```typescript
function formatCombatLog(
  state: CombatState,
  options?: {
    isPvp?: boolean;          // Changes opening line style
    combatantMetadata?: Map<string, { race?: string; class?: string }>; // For PvP characters
  }
): CombatLogEntry[];
```

### Step 2: PvP-Specific Adaptations

PvP is different from PvE in several ways the narrator needs to handle:

**Actor types:** In PvP, BOTH combatants are `entityType: 'character'`. The narrator currently uses `entityType === 'monster'` to determine `actorType: 'enemy'`. For PvP:
- The player making the request is `actorType: 'player'`
- Their opponent is `actorType: 'enemy'`
- This means `actorType` is **perspective-dependent** in PvP. The requesting character's ID determines who is "player" and who is "enemy".
- Alternatively, since the frontend already knows which combatant is the local player, the narrator can mark both as 'player' and let the frontend handle coloring. **Check how the frontend currently handles PvP combatant identification and match that pattern.**

**Opening lines:** PvP doesn't fight monsters. The opening line should be PvP-specific:
- Duel: "You face {opponentName} in the arena. Steel meets steel!" or "The duel begins — {opponentName} draws their weapon."
- Spar: "A friendly spar begins between you and {opponentName}." or "{opponentName} takes a fighting stance. Let's see what you've got!"
- Add 3-4 duel opening variants and 2-3 spar opening variants to the narrator templates.

**No monster personality:** Monster-specific flavor text doesn't apply. The narrator should fall through to class-specific → weapon-specific → generic templates for PvP character actions.

**Race/class awareness:** PvP combatants are characters with races and classes. The narrator should use this data for template selection. When building the `NarrationContext`:
- `actorRace` comes from the character's race
- `actorClass` comes from the character's class
- Both participants are characters, so both get class-specific narration

**The character's race and class need to be available.** Check if the PvP combatant objects already have `race` and `class` fields. From the code I saw, `race` is set via `(combatant as any).race = p.character.race.toLowerCase()`. The narrator needs this data. If it's not on the combatant type, pass it through metadata.

### Step 3: Wire Into PvP Endpoints

**`POST /action` and `POST /spar-action`:**

Currently these return `turnResult: lastLog` (single raw TurnLogEntry). They need to return narrated entries instead. Two options:

**Option A (Recommended):** Change the response to include the full narrated log array, matching PvE's format. The frontend already handles this format from PvE polling. Replace `turnResult: lastLog` with:
```typescript
response.session.log = formatCombatLog(combatState, { isPvp: true });
```

**Option B:** Narrate just the latest entry and return it alongside the raw data. Less clean but less disruptive to existing frontend PvP handling.

**Go with Option A** unless the frontend PvP flow specifically depends on `turnResult` being a raw `TurnLogEntry`. Check how `CombatPage.tsx` handles PvP action responses (search for `pvpActionMutation.onSuccess`). From my reading: it calls `queryClient.invalidateQueries({ queryKey: ['combat', 'pvp', 'state'] })` — meaning it just triggers a re-fetch of `/state`. So the action response format doesn't matter much for display; it's the `/state` response that the UI reads for rendering.

**`GET /state` and `GET /spar-state`:**

These are the critical ones — the frontend polls these for display. Currently they return `log: combatState.log` (raw). Replace with:
```typescript
// Instead of: log: combatState.log
log: formatCombatLog(combatState, { isPvp: true, requestingCharacterId: character.id })
```

The `requestingCharacterId` lets the formatter determine perspective (who is 'player' vs 'enemy').

### Step 4: Frontend Compatibility Check

The frontend `CombatPage.tsx` normalizes PvP state in the `pvpState` query:
```typescript
log: s.log ?? [],
```

If `s.log` now returns `CombatLogEntry[]` (with `message`, `actor`, `actorType`) instead of raw `TurnLogEntry[]` (with `actorId`, `action`, `result`), the frontend mapping in `processNewLogEntries()` needs to handle both formats OR the PvP query normalizer needs updating.

**Check the frontend carefully.** The PvE query already receives narrated entries. The PvP query currently receives raw entries. After this change, both should return the same `CombatLogEntry[]` format. The PvP normalizer in the query function may need adjustment to stop re-mapping fields that are now already in the correct format.

Look at how the frontend maps combat log entries to the `CombatLog` component. If PvE already works with the narrated format, make PvP match it exactly.

### Step 5: Add PvP Narrator Templates

Add to the narrator template files (`shared/src/data/combat-narrator/templates.ts` or wherever they were created):

**PvP opening lines (duel):**
```
"You face {opponentName} across the arena floor. The crowd falls silent."
"Steel rings as {opponentName} draws their weapon. The duel begins."
"{opponentName} meets your gaze with cold determination. No quarter asked."
"The arena master signals — the duel with {opponentName} has begun!"
```

**PvP opening lines (spar):**
```
"You and {opponentName} square off for a friendly bout."
"{opponentName} grins and raises their guard. Time for practice."
"A training spar with {opponentName}. No stakes, just skill."
```

**PvP kill/victory lines:**
```
"You stand victorious as {opponentName} yields."
"{opponentName} crumples — the duel is yours."
"The arena roars as you claim victory over {opponentName}."
```

**PvP defeat lines:**
```
"Your strength gives out. {opponentName} wins the duel."
"The world spins as {opponentName} lands the final blow."
```

These go in the same template structure as PvE but keyed to `isPvp: true` context.

---

## TESTING

### Task 1 Tests (Early Abilities)

1. **Data integrity:** Every class has 3+ abilities at L1 (one per spec), 6+ by L5 (two per spec)
2. **Combat engine:** 65/65 test scenarios still pass
3. **Batch verification:** Quick 100-iteration test — Mage L1 vs Goblin should exceed previous 46%
4. **Caster stat check:** Verify Mage uses INT, Cleric uses WIS, Bard uses CHA in live combat
5. **Psion untouched:** Verify `psion.ts` was not modified

### Task 2 Tests (PvP Narrator)

1. **Unit test:** Call the shared `formatCombatLog()` with a mock PvP CombatState — verify it returns `CombatLogEntry[]` with non-empty `message` fields, correct `actorType` assignments, and PvP opening line
2. **PvP opening:** Duel opening line should NOT reference monsters (no "A snarling goblin..." in PvP)
3. **Perspective test:** Both players should see themselves as 'player' and opponent as 'enemy'
4. **Template fallback:** PvP characters use class/weapon templates since monster templates don't apply
5. **Spar distinction:** Spar opening lines are friendlier than duel opening lines
6. **Frontend parity:** PvE and PvP combat logs render identically in `CombatLog.tsx` — same format, same styling, same critical hit highlights

### Integration Verification

After deployment:
1. Start PvE as Mage — abilities fire at L1, narrator flavor text appears, INT-based attacks
2. Start PvP duel — narrator flavor text appears, PvP opening line (not monster opening), class-specific templates for both players
3. Start spar — spar-specific opening line, same narrator quality as duel
4. Check that PvP combat log shows gold-highlighted critical hits, HP-threshold tone shifts, and status effect narration — all features that PvE already has

---

## DEPLOYMENT

Both tasks deploy together:

```bash
git add -A
git commit -m "feat: early-level abilities (L1+) for all classes + PvP narrator integration

Task 1 - Early Abilities:
- Restructure 6 classes: L10→L1, L14→L5, L16→L10, L22→L18, L30→L28
- Every spec has usable ability at L1 (was L10)
- Cantrip (cooldown: 0) at L1 for: Reckless Strike, Arcane Bolt, Smite, Aimed Shot
- Caster attack stat override: Mage→INT, Cleric→WIS, Bard→CHA, Rogue→DEX, Ranger→DEX
- Psion unchanged (already correct)
- Fireball reduced to 1d6 for L1 appropriateness

Task 2 - PvP Narrator:
- Extract shared narrator formatting from PvE for reuse
- Wire narrator into all 4 PvP endpoints (action, spar-action, state, spar-state)
- PvP-specific opening lines (duel + spar variants)
- PvP victory/defeat lines
- Perspective-aware actorType (player vs enemy based on requesting character)
- Frontend compatibility verified

Zero combat engine changes. All 65 test scenarios passing."
git push origin main
```

Build and deploy:
```bash
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify `combat-engine.ts` — battle-tested, 65/65 scenarios
- Do not modify `combat-logger.ts` — admin analytics logging, separate concern
- Do not modify `psion.ts` — already correct pattern
- Do not change ability IDs — only `levelRequired`, `cooldown`, `prerequisiteAbilityId`
- Do not add new abilities — only shift existing ones earlier
- Do not remove abilities
- Do not duplicate the narrator code — extract and share between PvE and PvP
- Do not break the PvE narrator that's already working (tag 202603022045)
- Do not use LLM calls at runtime — templates only

---

## SUMMARY FOR CHAT

When done, print:

```
=== TASK 1: Early-Level Abilities ===
- 6 classes restructured: L10→L1, L14→L5, L16→L10, L22→L18, L30→L28, L40→L40
- Cantrip (cooldown: 0) at L1 for: [list specs]
- Caster stat override applied: [list where — PvE routes, PvP routes, tick-resolver]
- Psion: unchanged ✅
- Combat tests: [X]/65 passing
- Abilities at L1: [count] across [X] specs

=== TASK 2: PvP Narrator ===
- Shared narrator formatter: [filename]
- PvP endpoints narrated: /action, /spar-action, /state, /spar-state
- PvP opening lines: [X] duel + [X] spar variants
- PvP victory/defeat lines: [X] total
- Perspective handling: [how actorType is determined]
- Frontend compatibility: [verified/changes needed]
- PvE narrator: still working ✅

Deployed: tag [TAG]
```
