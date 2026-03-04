# Combat Narrator: Flavor Text System for Combat Logs

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

---

## CONTEXT

### The Problem

Combat logs are mechanical and boring. Every fight reads like a spreadsheet:

> "Player attacks Goblin. Rolls 14. Hits. Deals 6 damage."
> "Goblin attacks Player. Rolls 8. Misses."

There's zero narrative texture. An Orc Warrior cleaving a goblin reads identically to an Elf Mage hurling fire. A desperate last-stand fight reads the same as a casual stomp. There's no sense of place, character, or drama.

### The Architecture

Combat data flows like this:

1. **Combat engine** (`server/src/lib/combat-engine.ts`) — Pure functions. Produces `TurnLogEntry` with typed `result` objects (`AttackResult`, `CastResult`, `FleeResult`, `DefendResult`, `ItemResult`, `RacialAbilityActionResult`, `PsionAbilityResult`, `ClassAbilityResult`). Each result has all the raw data: rolls, damage, hit/miss, crits, status effects, target HP, etc.

2. **Route serialization** (`server/src/routes/combat-pve.ts` → `formatCombatResponse()`) — Sends structured `TurnLogEntry[]` to the client. Each entry has: `round`, `actorId`, `action`, `result`, `statusTicks`.

3. **Frontend display** (`client/src/components/combat/CombatLog.tsx`) — Renders `CombatLogEntry` objects with: `id`, `actor`, `actorType` (player/enemy/system), `action`, `roll`, `damage`, `healing`, `message`, `timestamp`. The `message` field is what the player reads.

4. **Structured logging** (`server/src/lib/combat-logger.ts`) — Writes detailed `CombatEncounterLog` to DB for admin replay/analytics. Completely separate from player-facing messages. **Do not touch this.**

### Key Data Available for Narration

From `AttackResult`:
- `attackRoll` (raw d20), `attackTotal`, `hit`, `critical` (nat 20), `totalDamage`, `damageType`, `weaponName`, `weaponDice`, `targetKilled`, `targetHpBefore`, `targetHpAfter`, `counterTriggered`, `companionIntercepted`, `deathPrevented`, `negatedAttack`

From `CastResult`:
- `spellName`, `saveDC`, `saveRoll`, `saveSucceeded`, `totalDamage`, `healAmount`, `statusApplied`, `targetKilled`

From `FleeResult`:
- `fleeRoll`, `fleeDC`, `success`

From `PsionAbilityResult` / `ClassAbilityResult`:
- `abilityName`, `description`, `damage`, `statusApplied`, `targetKilled`, `controlled`, `banished`

From `StatusTickResult` (on `statusTicks`):
- `effectName`, `damage`, `healing`, `expired`, `killed`

From the **combatant**:
- `name`, `race`, `entityType` (character/monster), `level`, `currentHp`, `maxHp`

### The 7 Core Races

Human, Elf, Dwarf, Harthfolk, Orc, Nethkin, Drakonid

### The 7 Classes

Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion

### What We're NOT Doing

- NOT touching the combat engine. Zero mechanical changes.
- NOT touching combat-logger.ts (admin/analytics logging).
- NOT using LLMs at runtime. All narration is template-based.
- NOT making this a blocker for anything else. If a template is missing, fall back to the mechanical message.

---

## THE TASK

Build a **CombatNarrator** system that transforms mechanical combat events into flavorful narrative text. This is a **presentation layer only** — it sits between the combat engine output and the player-facing log display.

### Part A: Create the Narrator Data Files

Create `shared/src/data/combat-narrator/` with the following files:

#### 1. `templates.ts` — Core Narration Templates

Each template is a function that receives structured data and returns a narrative string. Templates are organized by action type and keyed by specificity (class+race → class → race → generic).

**Template categories needed:**

**Attack templates** — keyed by: `{hit/miss}` × `{weapon_type}` × `{class}` × `{race}`
- Generic hit: 3-4 variants per weapon type (sword, axe, staff, bow, dagger, mace, unarmed)
- Generic miss: 3-4 variants per weapon type
- Class-specific: 2-3 variants per class (e.g., Warrior hits feel different from Rogue hits)
- Race-specific: 1-2 variants per race (optional enhancement, not required for MVP)

**Critical hit templates** — 3-5 per class. These should be dramatic and memorable.
- Warrior crit: "You find a devastating opening and drive your blade clean through the goblin's guard"
- Mage crit: "Arcane energy surges through your staff — the spell strikes with explosive force"
- Rogue crit: "Your blade finds the perfect gap in their defense — a lethal strike"

**Critical miss/fumble templates** — 3-5 generic + 1-2 per class
- "Your swing goes wide, leaving you momentarily exposed"
- "Your footing slips — the attack sails harmlessly past"

**Ability use templates** — 1-2 per named ability (cover at minimum: all Tier 1 abilities across 7 classes that currently exist, plus Psion abilities)
- Fireball: "You hurl a sphere of roaring flame" / "Fire erupts from your hands"
- Backstab: "You slip behind your target and strike from the shadows"
- Healing Light: "Divine radiance flows from your hands, mending your wounds"
- Mind Spike: "You lance a bolt of psychic energy into your target's mind"

**Defend templates** — 3-4 generic
- "You brace yourself and raise your guard"
- "You hunker down, watching for the next attack"

**Flee templates** — success and failure, 3-4 each
- Success: "You break free and escape into the wilderness"
- Failure: "You try to run but your enemy cuts off the escape"

**Status effect templates** — 1-2 per status effect for application and expiry
- Poisoned applied: "Venom courses through your veins"
- Stunned applied: "The blow leaves you reeling, unable to act"
- Burning expired: "The flames finally die out"

**Monster personality text** — For the 21 seeded monsters in `database/seeds/monsters.ts`, add a `combatFlavor` section:
- Each monster gets 2-3 attack flavor strings and 1-2 "wounded" strings (shown when monster drops below 50% HP)
- Goblin (cowardly): "The goblin snarls and swipes wildly" / "The goblin's eyes dart toward the treeline"
- Orc Warrior (aggressive): "The orc warrior charges with a thunderous war cry"
- Shadow Wraith (eerie): "The wraith's form flickers as dark tendrils lash out"

**HP-threshold narrative modifiers** — These modify the tone of ANY template based on the actor's HP percentage:
- Above 75%: Confident tone modifier (no change, base template)
- 50-75%: Strained tone — prepend/append fatigue hints: "gritting your teeth", "blood dripping from a cut"
- 25-50%: Desperate tone — "With your vision blurring", "Barely keeping your feet"
- Below 25%: Last-stand tone — "Summoning every last ounce of strength", "On the edge of collapse"
- These are **prefixes/suffixes** that combine with attack/ability templates, NOT replacements

**Kill templates** — 3-5 for when the player kills a monster, 2-3 for when the monster kills the player
- Player kills: "The goblin crumples to the ground" / "Your enemy falls, defeated"
- Player dies: "The world goes dark as you collapse" / "Your strength finally gives out"

#### 2. `narrator.ts` — The CombatNarrator Service

A pure function module (no side effects, no DB calls). Interface:

```typescript
interface NarrationContext {
  // Actor info
  actorName: string;
  actorRace?: string;    // e.g., 'orc', 'elf'
  actorClass?: string;   // e.g., 'warrior', 'mage'
  actorEntityType: 'character' | 'monster';
  actorHpPercent: number; // 0-100, current/max * 100

  // Target info (if applicable)
  targetName?: string;
  targetEntityType?: 'character' | 'monster';
  targetHpPercent?: number;
  targetKilled?: boolean;
}

// Main entry point: takes a TurnLogEntry + context, returns narrative text
function narrateCombatEvent(
  entry: TurnLogEntry,
  context: NarrationContext
): string;
```

**Template resolution priority (most specific → generic):**
1. Monster-specific text (if actor is a known monster with combatFlavor)
2. Ability-specific text (if using a named ability)
3. Class + weapon type combo
4. Class-specific
5. Weapon-type specific
6. Generic

**HP modifier application:**
After selecting the base template, apply the HP-threshold modifier based on `actorHpPercent`. If the actor is the player character and HP is below 50%, prepend the strained/desperate/last-stand modifier.

**Randomization:**
For each template category, randomly select from the pool of variants. Use a simple `Math.random()` selection — no need for weighted randomness.

**Fallback:**
If no template matches (new ability not yet covered, edge case), return a **plain mechanical message** like the current system produces. Never return empty or broken text.

### Part B: Integrate into the Combat Flow

#### Step 1: Find the conversion layer

Search the codebase to find where `TurnLogEntry` (server-side) becomes `CombatLogEntry` (client-side, with `message` field). This could be:
- In `formatCombatResponse()` in `combat-pve.ts` and `combat-pvp.ts`
- In a client-side transformation in `CombatPage.tsx`
- In a shared utility

If the conversion happens **client-side** (likely — the client receives raw `TurnLogEntry` and maps it to `CombatLogEntry`):
- Add the narrator as a **client-side module** in `client/src/utils/combat-narrator.ts` that imports from `shared/src/data/combat-narrator/`
- Call `narrateCombatEvent()` when mapping server log entries to display entries
- The narrator needs the combatant data (race, class, HP) which is available on the `CombatState.combatants` array

If the conversion happens **server-side**:
- Add the narrator call in the serialization step
- Pass race/class/HP context from the combatants array

**Either way, the narrator MUST have access to:**
- The `TurnLogEntry.result` typed object (for attack rolls, damage, ability names, etc.)
- The actor's race, class, and current HP percentage
- The target's name and alive/dead status

#### Step 2: Add combat-opening flavor

At the start of each combat encounter, inject a `system` log entry with an opening line. This should reference:
- The monster name
- Optional: the biome/region if available from the travel context

Example: "A snarling goblin leaps from the underbrush, blocking your path!"

This opening entry should be generated when the combat state is first created. Find where `createCombatState()` is called in `tick-combat-resolver.ts` and/or `combat-pve.ts`, and add the opening entry to `state.log` as the first element.

The opening line templates should be in the narrator data, keyed by monster name (specific) with a generic fallback.

#### Step 3: Wire up CombatLog.tsx

The existing `CombatLog.tsx` already renders `entry.message` with color coding by `actorType`. The narrator's output goes into the `message` field. No UI changes needed unless:
- Critical hits should have special styling (the component already highlights nat 20 rolls — consider adding a `isCritical` flag to the `CombatLogEntry` so the message text can also be styled)
- Kill messages could use a special color/icon

Keep any UI tweaks minimal. The narrative text itself carries the drama.

### Part C: Create the Documentation

Create `docs/combat-narrator.md` with:

1. **Overview** — What the narrator does, where it sits in the architecture
2. **Template structure** — How templates are organized, the priority resolution order
3. **Adding new templates** — Step-by-step guide for adding flavor text for a new ability, monster, or class
4. **HP threshold system** — How tone modifiers work
5. **Monster personality system** — How monster-specific text works
6. **Testing** — How to verify narrator output (run a combat in the simulator, check log output)
7. **Content coverage checklist** — Table of all abilities/monsters and whether they have custom narration

---

## TEMPLATE WRITING GUIDELINES

These are critical for quality. The difference between good and bad flavor text is the difference between immersion and cringe.

**DO:**
- Use second person for player actions ("You swing your blade"), third person for monsters ("The goblin lunges")
- Keep templates SHORT — 1 sentence, occasionally 2. This is a log, not a novel.
- Use concrete sensory verbs: "slash", "crack", "sear", "shatter" — not "do damage to"
- Make class identity obvious in the language: Warriors are physical and forceful, Mages are arcane and elemental, Rogues are precise and quick, Clerics are divine and radiant, Rangers are natural and keen, Bards are melodic and charismatic, Psions are mental and eerie
- Reference the weapon/ability by name when it adds flavor
- Make critical hits feel EXCITING and rare
- Make near-death moments feel TENSE

**DON'T:**
- Don't be purple/overwrought: "With the fury of a thousand suns, you bring doom upon your foe" — NO
- Don't break the fourth wall: "You rolled a 20!" — the roll display already shows this
- Don't repeat mechanical info that's already displayed: damage numbers, HP amounts, roll values are shown separately in the UI
- Don't use modern slang or break fantasy tone
- Don't make templates too long — they stack up fast in a combat log
- Don't include damage numbers in the narrative text (the UI already shows "-6 HP" separately)

**TONE TARGET:** Think of a skilled tabletop DM narrating combat — descriptive but efficient, dramatic but not overwrought. The feel of Baldur's Gate 3 combat log, not a dense fantasy novel.

---

## SCOPE BOUNDARIES

**In scope:**
- Template data files for all 7 classes, 7 races, 21 monsters, all existing abilities, all status effects
- The `CombatNarrator` service (pure functions)
- Integration into the existing combat log display pipeline
- Combat opening flavor text
- HP-threshold tone modifiers
- Documentation
- Tests for the narrator service (unit tests: given a specific result object + context, does it produce a non-empty string? Does template resolution priority work correctly? Does HP modifier apply?)

**Out of scope — do NOT implement:**
- Biome-aware context (requires travel system integration — save for later)
- Racial combat flair beyond basic race-aware template selection (Orc hits differently than Elf is nice-to-have, not MVP)
- PvP-specific narration (use the same templates — "The orc warrior" becomes "Darkthorn")
- Any changes to combat mechanics, balance, or the combat engine
- Any changes to combat-logger.ts (admin logging)
- Sound effects or animations (separate concern)

---

## TESTING

### Unit Tests

Create `shared/src/data/combat-narrator/__tests__/narrator.test.ts`:

```typescript
// Test: narrateCombatEvent returns non-empty string for every action type
// Test: attack hit with warrior context uses warrior-specific template (not generic)
// Test: critical hit uses critical template
// Test: HP below 25% adds last-stand modifier
// Test: unknown ability falls back to mechanical description
// Test: monster-specific text used for known monsters
// Test: kill event produces kill template
// Test: all 7 classes have at least one class-specific attack template
// Test: all status effects have apply/expire templates
```

### Integration Verification

After deployment, manually verify:
1. Start a PvE combat as a Mage — log should reference spells/magic, not "attacks with staff"
2. Get a critical hit — message should be dramatic
3. Drop below 25% HP — messages should sound desperate
4. Kill a monster — kill message appears
5. Fight a Goblin specifically — should see goblin-specific flavor text

---

## DEPLOYMENT

```bash
git add -A
git commit -m "feat: add CombatNarrator flavor text system for combat logs

- 200+ narration templates across 7 classes, 21 monsters, all abilities
- HP-threshold tone modifiers (confident/strained/desperate/last-stand)
- Monster personality text (goblin cowardly, orc aggressive, wraith eerie)
- Combat opening flavor lines
- Template priority: monster > ability > class+weapon > class > weapon > generic
- Pure function service, zero combat engine changes
- Fallback to mechanical text for uncovered cases
- Full test coverage for narrator service"
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

- Do not modify `combat-engine.ts` — zero mechanical changes
- Do not modify `combat-logger.ts` — admin logging is separate
- Do not use AI/LLM calls at runtime — templates only
- Do not make combat log messages longer than ~15 words average. Short and punchy.
- Do not duplicate damage/healing numbers in the narrative text (UI shows these separately)
- Do not create separate narrator files per class — keep it in a single `templates.ts` with clear sections
- Do not over-engineer the template system. Simple string arrays with `Math.random()` selection is fine. No template engine, no interpolation library, no i18n framework.

## SUMMARY FOR CHAT

When done, print:
```
CombatNarrator system deployed:
- Templates: [X] attack, [X] ability, [X] monster, [X] status effect, [X] critical, [X] kill
- Classes covered: [list which have specific templates]
- Monsters covered: [X]/21 with personality text
- HP threshold modifiers: 4 tiers (confident/strained/desperate/last-stand)
- Integration point: [client-side/server-side] at [specific file]
- Combat opening lines: [X] monster-specific + generic fallback
- Tests: [X] passing
- Docs: docs/combat-narrator.md
Deployed: tag [TAG]
```
