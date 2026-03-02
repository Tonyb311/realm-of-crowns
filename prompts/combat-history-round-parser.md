# History Tab — Round-by-Round Combat Log Parser

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

## Task

Replace the raw JSON dump in the History tab's detail panel with a properly parsed, human-readable round-by-round combat log. The `rounds` field in CombatEncounterLog contains a JSON array of `TurnLogEntry` objects with full combat detail (dice rolls, modifiers with sources, results). This data needs to be rendered as a readable combat narrative with full mechanical transparency.

Read `cat CLAUDE.md` and `cat .claude/agents/fullstack.md` before starting.

Also read the combat type definitions to understand ALL result types:
```
cat shared/src/types/combat.ts
```

## Data Structure

The `rounds` JSON field contains an array with this structure (from `shared/src/types/combat.ts`):

```typescript
interface TurnLogEntry {
  round: number;
  actorId: string;
  action: CombatActionType; // 'attack' | 'cast' | 'defend' | 'item' | 'flee' | 'racial_ability' | 'psion_ability' | 'class_ability'
  result: TurnResult;       // Union of all result types below
  statusTicks: StatusTickResult[];
}
```

### Result Types to Parse

**AttackResult** (type: 'attack') — the most common:
```typescript
{
  type: 'attack',
  actorId, targetId,
  attackRoll: number,           // the raw d20 roll
  attackTotal: number,          // roll + all modifiers
  attackModifiers?: Array<{ source: string, value: number }>,  // e.g. [{source: "STR modifier", value: 3}, {source: "proficiency bonus", value: 2}]
  targetAC: number,
  hit: boolean,
  critical: boolean,
  damageRoll: number,           // raw damage dice result
  damageRolls?: number[],       // individual dice results
  damageModifiers?: Array<{ source: string, value: number }>,  // e.g. [{source: "STR modifier", value: 3}, {source: "weapon bonus", value: 1}]
  damageType?: string,          // SLASHING, PIERCING, etc.
  totalDamage: number,
  targetHpBefore?: number,
  targetHpAfter: number,
  targetKilled: boolean,
  weaponName?: string,
  weaponDice?: string,          // e.g. "2d6"
  // Reactive results
  counterTriggered?: boolean,
  counterDamage?: number,
  counterAbilityName?: string,
  companionIntercepted?: boolean,
  companionDamageAbsorbed?: number,
  deathPrevented?: boolean,
  deathPreventedAbility?: string,
}
```

**CastResult** (type: 'cast'):
```typescript
{
  type: 'cast',
  actorId, targetId,
  spellName, spellLevel, slotExpended,
  damageRoll?, totalDamage?, healAmount?,
  saveRequired, saveRoll?, saveTotal?, saveDC?, saveSucceeded?,
  statusApplied?, statusDuration?,
  targetHpAfter, targetKilled,
}
```

**DefendResult** (type: 'defend'):
```typescript
{ type: 'defend', actorId, acBonusGranted }
```

**ItemResult** (type: 'item'):
```typescript
{ type: 'item', actorId, targetId, itemName, healAmount?, damageAmount?, statusApplied?, statusRemoved?, targetHpAfter }
```

**FleeResult** (type: 'flee'):
```typescript
{ type: 'flee', actorId, fleeRoll, fleeDC, success }
```

**RacialAbilityActionResult** (type: 'racial_ability'):
```typescript
{ type: 'racial_ability', actorId, abilityName, success, description, targetIds?, damage?, healing?, statusApplied? }
```

**PsionAbilityResult** (type: 'psion_ability'):
```typescript
{ type: 'psion_ability', actorId, abilityName, abilityId, targetId?, damage?, saveRequired, saveRoll?, saveTotal?, saveDC?, saveSucceeded?, statusApplied?, controlled?, banished?, description, targetHpAfter?, targetKilled? }
```

**ClassAbilityResult** (type: 'class_ability'):
```typescript
{
  type: 'class_ability',
  actorId, abilityId, abilityName, effectType,
  targetId?, damage?, healing?, selfHealing?,
  buffApplied?, debuffApplied?, statusApplied?,
  saveRequired?, saveType?, saveDC?, saveRoll?, saveTotal?, saveSucceeded?,
  description,
  targetHpAfter?, targetKilled?,
  perTargetResults?: Array<{ targetId, targetName, damage?, healing?, statusApplied?, hpAfter, killed }>,
  strikeResults?: Array<{ strikeNumber, hit, crit, damage, attackRoll?, attackTotal?, targetAc? }>,
  totalStrikes?, strikesHit?,
  goldStolen?, bonusLootRoll?, peacefulResolution?,
}
```

**StatusTickResult** (processed each turn):
```typescript
{ combatantId, effectName, damage?, healing?, expired, hpAfter, killed }
```

## Frontend Changes: `client/src/components/admin/combat/HistoryTab.tsx`

### Replace the raw JSON section in the detail panel

Where it currently shows "ROUND DATA" with raw JSON, replace with a structured combat log.

### Combat Log Layout

**Group entries by round number.** Each round gets a collapsible section:

```
┌─ ROUND 1 ──────────────────────────────────────────────┐
│                                                         │
│  ⚔ Thalindra Windrunner attacks Wolf with Rustic Dagger │
│  ┌─ Attack Roll ─────────────────────────────────────┐  │
│  │  🎲 d20 = 14                                      │  │
│  │  + STR modifier: +3                               │  │
│  │  + Proficiency bonus: +2                          │  │
│  │  = 19 vs AC 12 → ✅ HIT                           │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌─ Damage Roll ─────────────────────────────────────┐  │
│  │  🎲 1d8 = [5]                                     │  │
│  │  + STR modifier: +3                               │  │
│  │  + Weapon bonus: +1                               │  │
│  │  = 9 Slashing damage                              │  │
│  └───────────────────────────────────────────────────┘  │
│  Wolf: 15 → 6 HP                                       │
│                                                         │
│  ⚔ Wolf attacks Thalindra with Natural Attack           │
│  ┌─ Attack Roll ─────────────────────────────────────┐  │
│  │  🎲 d20 = 8                                       │  │
│  │  + STR modifier: +1                               │  │
│  │  = 9 vs AC 14 → ❌ MISS                           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  🔥 Wolf: Burning tick → 3 damage (12 → 9 HP) [2 rnds] │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Rendering Rules by Result Type

**Attack (type: 'attack'):**
- Header: `⚔ {actorName} attacks {targetName} with {weaponName}`
- If critical: add `💥 CRITICAL HIT!` badge in gold
- Attack roll box:
  - Line 1: `🎲 d20 = {attackRoll}` (if critical, highlight in gold)
  - Lines 2+: each modifier from `attackModifiers[]`: `+ {source}: {value > 0 ? '+' : ''}{value}`
  - Total line: `= {attackTotal} vs AC {targetAC} → ✅ HIT / ❌ MISS`
- If hit, Damage roll box:
  - Line 1: `🎲 {weaponDice} = [{damageRolls joined by ', '}]` (or just `{damageRoll}` if no individual dice)
  - Lines 2+: each modifier from `damageModifiers[]`
  - Total line: `= {totalDamage} {damageType} damage`
- HP change: `{targetName}: {targetHpBefore} → {targetHpAfter} HP`
- If targetKilled: `💀 {targetName} has been slain!` in red
- If counterTriggered: `↩ {counterAbilityName} counters for {counterDamage} damage!`
- If companionIntercepted: `🛡 Companion intercepts, absorbing {companionDamageAbsorbed} damage`
- If deathPrevented: `✨ {deathPreventedAbility} prevents death!`
- If negatedAttack: show as `🚫 Attack negated`

**Cast (type: 'cast'):**
- Header: `✨ {actorName} casts {spellName} (Level {spellLevel}, Slot {slotExpended})`
- If saveRequired:
  - `Save: {saveRoll} + modifiers = {saveTotal} vs DC {saveDC} → ✅ Saved / ❌ Failed`
- If damage: `Damage: {totalDamage}`
- If heal: `Heals for {healAmount}`
- If statusApplied: `Applies {statusApplied} for {statusDuration} rounds`
- HP change line

**Defend (type: 'defend'):**
- `🛡 {actorName} takes a defensive stance (+{acBonusGranted} AC)`

**Item (type: 'item'):**
- `🧪 {actorName} uses {itemName}`
- If heal: `Restores {healAmount} HP`
- If damage: `Deals {damageAmount} damage`
- If statusApplied/removed

**Flee (type: 'flee'):**
- `🏃 {actorName} attempts to flee!`
- `Roll: {fleeRoll} vs DC {fleeDC} → ✅ Escaped! / ❌ Failed to escape`

**Racial Ability (type: 'racial_ability'):**
- `🔮 {actorName} uses {abilityName}`
- `{description}`
- If damage/healing, show amounts

**Psion Ability (type: 'psion_ability'):**
- `🧠 {actorName} uses {abilityName}`
- If save: show save roll breakdown
- `{description}`
- If controlled/banished, show special status

**Class Ability (type: 'class_ability'):**
- `⚡ {actorName} uses {abilityName}`
- `{description}`
- If save: show save roll breakdown
- If strikeResults (multi-attack): render each strike as a mini attack line:
  - `Strike {n}: 🎲 {attackRoll} = {attackTotal} vs AC {targetAc} → HIT/MISS → {damage} damage`
  - Summary: `{strikesHit}/{totalStrikes} strikes hit`
- If perTargetResults (AoE): list each target and result
- If goldStolen/bonusLootRoll/peacefulResolution, show special

**Status Ticks (statusTicks array on each TurnLogEntry):**
- After the turn result, render each status tick:
- `🔥 {combatantName}: {effectName} → {damage} damage ({hpAfter} HP)` or healing
- If expired: `{effectName} has worn off`
- If killed: `💀 {combatantName} killed by {effectName}!`

### Name Resolution

The rounds JSON uses `actorId` and `targetId` (UUIDs), not names. To display names:

**Option A (preferred):** The `rounds` JSON in CombatEncounterLog might contain combatant data at the top level. Check the actual JSON structure — it may include a combatants array with id→name mappings. Look at how the combat engine stores the data.

**Option B:** Build a name map from the encounter itself:
```typescript
const nameMap: Record<string, string> = {};
nameMap[encounter.characterId] = encounter.characterName;
nameMap[encounter.opponentId] = encounter.opponentName;
```
This covers PvE encounters (1v1). For group encounters, there may be additional combatants. Check if the rounds JSON includes combatant info.

**Option C:** If the rounds JSON includes a `_combatants` or similar field at the top level, extract names from there.

**IMPORTANT:** Investigate the actual JSON structure in the database before implementing. Use `console.log` or inspect a real entry. The structure may wrap the TurnLogEntry array in an object with metadata.

### Visual Styling

**Round headers:**
- Collapsible (click to expand/collapse)
- Dark background with subtle gold left border
- "ROUND 1" in uppercase, amber text, small encounter count badge ("3 actions")
- Default: all rounds expanded (there are usually <15 rounds)

**Turn entries within a round:**
- Indented under the round header
- Action icon on the left (⚔ attack, ✨ cast, 🛡 defend, 🧪 item, 🏃 flee, etc.)
- Actor name in bold
- Roll breakdown boxes: slightly darker background, monospace for numbers, compact

**Roll breakdowns:**
- Light border, slightly inset
- Each modifier on its own line with `+` or `-` prefix
- Total line in bold with HIT/MISS color: green for hit, red for miss
- Dice emoji 🎲 before dice rolls
- Critical hits: gold highlight on the d20 roll, `💥 CRITICAL HIT!` badge

**HP changes:**
- Small text below the action
- Show as: `{name}: {before} → {after} HP` with a tiny inline HP bar
- Red text if HP decreased significantly (>50% loss in one hit)
- Green text for heals

**Kill indicators:**
- `💀` skull emoji, red text, slightly larger

**Status effects:**
- Colored by type: poison = green, burning = orange, frozen = blue, stunned = yellow, etc.
- Show remaining rounds: `[2 rounds remaining]`

### Keep the HP Timeline Chart

The Recharts LineChart showing HP over rounds (if it exists in the current detail panel) should remain above the combat log. It provides a visual overview before diving into details.

### Keep the existing combat stats grid

The grid showing Player HP, Opponent HP, Weapons, Rounds, XP, etc. at the top of the detail panel should remain. The combat log replaces ONLY the raw JSON section below it.

## DO NOT

- Do not touch the Overview tab
- Do not touch the Codex or Simulator tabs
- Do not modify any backend code — this is purely a frontend parsing task
- Do not add new API endpoints
- Do not import from `shared/src/types/combat.ts` directly unless it's already imported in the client. If the types aren't available client-side, define lightweight inline interfaces for parsing.

## Deployment

After all changes are complete:
1. `git add -A && git commit -m "feat: parsed round-by-round combat log in history detail panel"`
2. `git push`
3. Build and deploy to Azure with a **unique image tag** (never `:latest`):
   ```bash
   docker build -t rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM .
   docker push rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:YYYYMMDDHHMM
   ```
