# Phase 4A — Swallow Engine + 14 Mid-Tier Monsters (L17–30)

```
cat CLAUDE.md
cat .claude/agents/combat.md 2>/dev/null || echo "No combat agent file"
```

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed (frontend, backend, game design, narrative, art direction, etc.).
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable. Ensure game mechanics, narrative, UI, and code all align.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed. Don't pad the team.
- Common roles include (but aren't limited to):
  - **Game Designer** — Mechanics, systems, balance, progression, combat
  - **Narrative Designer** — Story, lore, dialogue, quests, world-building
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **UX/UI Designer** — Interface layout, player flow, menus, HUD, accessibility
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review
  - **Art Director** — Visual style, asset guidance, theming, mood and atmosphere

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies (HTML, CSS, JavaScript/TypeScript, Canvas/WebGL where appropriate, and relevant backend stacks).
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Consider both solo and multiplayer implications when relevant.
- Keep scope realistic for a browser game. Avoid over-engineering or suggesting AAA-scale solutions.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together and flags open questions or next steps.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Keep the game's vision consistent across all teammate contributions.
- Always end with a clear summary of what was delivered and what still needs the user's input.

---

## Context

### Current Monster Roster (21 monsters, L1–18)

**Tier 1 (L1–5):** Goblin(1), Wolf(2), Bandit(3), Giant Rat(1), Slime(2), Mana Wisp(3), Bog Wraith(4)
**Tier 2 (L5–10):** Skeleton Warrior(5), Orc Warrior(6), Giant Spider(7), Arcane Elemental(7), Dire Wolf(8), Troll(9), Shadow Wraith(9)
**Tier 3 (L10–20):** Ancient Golem(12), Void Stalker(13), Young Dragon(14), Hydra(15), Demon(16), Elder Fey Guardian(16), Lich(18)

**Gap:** L19–50 has ZERO monsters.

### Engine Features Available (all built and tested)

- Monster abilities: damage, status, aoe, multiattack, buff, heal, on_hit, fear_aura, damage_aura, death_throes
- Legendary Actions (isLegendaryAction + legendaryCost)
- Legendary Resistances (legendaryResistances field)
- Phase Transitions (phaseTransitions array with hpThresholdPercent triggers)
- Death Throes (deathDamage/deathDamageType/deathSaveDC)
- Damage types: SLASHING, PIERCING, BLUDGEONING, FIRE, COLD, LIGHTNING, ACID, POISON, NECROTIC, RADIANT, FORCE, PSYCHIC, THUNDER

### Valid Regions (for regionName field — must match EXACTLY)

**Core (8):** Verdant Heartlands (PLAINS), Silverwood Forest (FOREST), Ironvault Mountains (MOUNTAIN), The Crossroads (HILLS), Ashenfang Wastes (BADLANDS), Shadowmere Marshes (SWAMP), Frozen Reaches (TUNDRA), The Suncoast (COASTAL)
**Common (6):** Twilight March (FOREST), Scarred Frontier (BADLANDS), Cogsworth Warrens (HILLS), Pelagic Depths (UNDERWATER), Thornwilds (FOREST), Glimmerveil (FEYWILD)
**Exotic (7):** Skypeak Plateaus (MOUNTAIN), Vel'Naris Underdark (UNDERGROUND), Mistwood Glens (FOREST), The Foundry (MOUNTAIN), The Confluence (VOLCANIC), Ashenmoor (SWAMP)

### Valid BiomeType enum values

PLAINS, FOREST, MOUNTAIN, HILLS, BADLANDS, SWAMP, TUNDRA, VOLCANIC, COASTAL, DESERT, RIVER, UNDERGROUND, UNDERWATER, FEYWILD

### Key Files

- `shared/src/types/combat.ts` — Combat type definitions (MonsterAbility, Combatant, StatusEffectName, TurnLogEntry, etc.)
- `server/src/lib/combat-engine.ts` — STATUS_EFFECT_DEFS, CC_STATUSES, resolveTurn()
- `server/src/lib/monster-ability-resolver.ts` — resolveMonsterAbility() switch, handleDamage/handleStatus/etc.
- `server/src/services/tick-combat-resolver.ts` — resolveTickCombat() main combat loop, decideAction(), LA processing
- `server/src/lib/combat-logger.ts` — buildRoundsData(), RoundLogEntry
- `client/src/components/admin/combat/HistoryTab.tsx` — TurnEntry, TurnResultRenderer, normalizeRoundEntry()
- `shared/src/data/combat-narrator/templates.ts` — Narrator template definitions
- `database/seeds/monsters.ts` — MonsterDef interface, MonsterAbilityDef interface, MONSTERS array, seedMonsters()
- `database/prisma/schema.prisma` — Monster model definition

---

## Task: Two deliverables in 10 steps

### STEP 1 — Type Changes (`shared/src/types/combat.ts`)

**1A.** Add `restrained` and `swallowed` to `StatusEffectName` union (around line 82–85):
```typescript
// Monster ability status effects
| 'frightened'
| 'diseased'
| 'knocked_down'
| 'restrained'
| 'swallowed';
```
NOTE: `restrained` is already used by Giant Spider (L7) and Elder Fey Guardian (L16) in seeds but was missing from the type union — this fixes that existing gap.

**1B.** Add `'swallow'` to MonsterAbility type union (around line 181–182):
```typescript
type: 'damage' | 'status' | 'aoe' | 'multiattack' | 'buff' | 'heal' | 'on_hit'
      | 'fear_aura' | 'damage_aura' | 'death_throes' | 'swallow';
```

**1C.** Add swallow fields to MonsterAbility interface (after line ~214):
```typescript
/** Dice for acid/digestive damage per round while swallowed (e.g., "3d6") */
swallowDamage?: string;
/** Damage type for swallow damage */
swallowDamageType?: CombatDamageType;
/** Damage threshold to escape from inside (e.g., 25) */
swallowEscapeThreshold?: number;
```

**1D.** Add swallow tracking fields to Combatant interface (after line ~534):
```typescript
/** ID of monster that swallowed this combatant */
swallowedBy?: string;
/** Damage dice for per-round swallow damage */
swallowDamagePerRound?: string;
/** Damage type for swallow damage */
swallowDamageTypePerRound?: CombatDamageType;
/** Damage threshold to escape */
swallowEscapeThreshold?: number;
```

**1E.** Add SwallowResult interface (after DeathThroesResult or similar):
```typescript
export interface SwallowResult {
  type: 'swallow_attempt' | 'swallow_damage' | 'swallow_escape' | 'swallow_freed';
  monsterName: string;
  // Attempt fields
  attackRoll?: number;
  attackTotal?: number;
  targetAC?: number;
  hit?: boolean;
  saveRoll?: number;
  saveTotal?: number;
  saveDC?: number;
  saveType?: string;
  savePassed?: boolean;
  swallowed?: boolean;
  // Per-round damage fields
  damage?: number;
  damageType?: CombatDamageType;
  damageRoll?: string;
  playerHpBefore?: number;
  playerHpAfter?: number;
  // Escape fields
  damageDealtInRound?: number;
  escapeThreshold?: number;
  escaped?: boolean;
}
```

**1F.** Add `swallowResults` to TurnLogEntry (around line 884):
```typescript
swallowResults?: SwallowResult[];
```

**BUILD CHECK:** `npx tsc --build shared/tsconfig.json` — must pass before proceeding.

---

### STEP 2 — Status Effect Definitions (`server/src/lib/combat-engine.ts`)

**2A.** Add `restrained` to STATUS_EFFECT_DEFS (after `knocked_down`, around line 324):
```typescript
restrained: {
  preventsAction: false,
  dotDamage: () => 0,
  hotHealing: () => 0,
  attackModifier: -4,  // disadvantage on attacks
  acModifier: -2,      // advantage to be hit (lower AC)
  saveModifier: -2,    // disadvantage on DEX saves
},
```

**2B.** Add `swallowed` to STATUS_EFFECT_DEFS:
```typescript
swallowed: {
  preventsAction: false,  // can still basic attack from inside
  dotDamage: () => 0,     // acid damage handled separately (needs dice roll, not flat)
  hotHealing: () => 0,
  attackModifier: -4,     // restrained penalties apply
  acModifier: -2,
  saveModifier: -2,
},
```

**2C.** Add `'swallowed'` to CC_STATUSES array (around line ~517) so that CC immunity buffs block swallow.

---

### STEP 3 — Swallow Handler (`server/src/lib/monster-ability-resolver.ts`)

**3A.** Add `handleSwallow()` function (before `resolveMonsterAbility`):

```typescript
function handleSwallow(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: MonsterAbility,
): { state: CombatState; result: Partial<MonsterAbilityResult> } {
  const swallowResults: SwallowResult[] = [];

  // 1. If target already swallowed — skip
  if (target.swallowedBy) {
    return { state, result: { description: `${target.name} is already swallowed.` } };
  }

  // 2. Attack roll vs AC (reuse same attack roll logic as handleDamage)
  const atkMod = actor.stats.attack ?? 0;
  // Roll d20 + atkMod vs target AC
  // Use existing rollD20/attack helpers

  // 3. If miss → return miss result with swallow_attempt SwallowResult (hit: false)

  // 4. If hit → STR saving throw
  const saveType = ability.saveType ?? 'str';
  // Roll save: d20 + target's STR mod + proficiency + status modifiers
  // Compare vs ability.saveDC

  // 5. If save succeeds → return save success with swallow_attempt SwallowResult (savePassed: true, swallowed: false)

  // 6. If save fails → apply swallowed status + set tracking fields
  // applyStatusEffect(target, 'swallowed', 999, actor.id);  // 999 = until freed
  // Set target.swallowedBy = actor.id
  // Set target.swallowDamagePerRound = ability.swallowDamage
  // Set target.swallowDamageTypePerRound = ability.swallowDamageType
  // Set target.swallowEscapeThreshold = ability.swallowEscapeThreshold

  // 7. Return result with swallow_attempt SwallowResult (swallowed: true) + updated state
}
```

Follow the patterns from existing handlers (handleDamage, handleStatus) for attack rolls and saving throws. Don't reinvent — reuse the same dice/modifier logic.

**3B.** Add `'swallow'` case to `resolveMonsterAbility()` switch (around line 531):
```typescript
case 'swallow':
  if (!target) {
    return { state, result: { ...baseResult, description: 'No valid target.' } };
  }
  resolved = handleSwallow(state, actor, target, abilityDef);
  break;
```

**3C.** Swallow is an ACTIVE ability (NOT passive like fear_aura/damage_aura/death_throes). No changes needed to the passive filter.

---

### STEP 4 — Swallow State Processing (`server/src/services/tick-combat-resolver.ts`)

Three integration points in resolveTickCombat():

**4A. Force basic attack while swallowed** — In `decideAction()` (around line 155), BEFORE ability queue evaluation, after the retreat check (around line 178):
```typescript
// If swallowed, can only basic attack (no class abilities, no flee)
if (actor.swallowedBy) {
  return {
    action: { type: 'attack', actorId, targetId: actor.swallowedBy },
    context: { weapon: params.weapon ?? undefined }
  };
}
```
This prevents fleeing and forces attacks against the swallower.

**4B. Swallow digestive damage** — After `resolveTurn()` call (around line 398), before the LA block. Check if the actor who just took their turn is swallowed:
```typescript
// === SWALLOW DAMAGE — if actor is swallowed, take digestive damage ===
const swallowResults: SwallowResult[] = [];
const actorAfterTurn = state.combatants.find(c => c.id === actorId);
if (actorAfterTurn?.swallowedBy && actorAfterTurn.swallowDamagePerRound) {
  // Roll swallow damage using parseDamageString + damageRoll (existing helpers)
  // Apply damage type interaction via applyDamageTypeInteraction()
  // Subtract from HP, update isAlive
  // Push swallow_damage SwallowResult
  // checkCombatEnd(state)
}
```

**4C. Swallow escape check** — Immediately after 4B, check if the player dealt enough damage this round to escape:
```typescript
// === SWALLOW ESCAPE — check if player dealt enough damage to escape ===
const playerAfterAction = state.combatants.find(c => c.id === actorId);
if (playerAfterAction?.swallowedBy && playerAfterAction.swallowEscapeThreshold) {
  // Extract damage dealt from the last log entry's attack result
  // Need helper: extractDamageDealt(logEntry, actorId) — reads totalDamage from AttackResult
  const damageDealt = extractDamageDealt(/* last log entry */, actorId);

  if (damageDealt >= playerAfterAction.swallowEscapeThreshold) {
    // Remove swallowed status effect
    // Clear swallowedBy, swallowDamagePerRound, swallowDamageTypePerRound, swallowEscapeThreshold
    // Push swallow_escape SwallowResult
  }
}
```

Write helper `extractDamageDealt(logEntry, actorId)` that reads damage from AttackResult or MonsterAbilityResult in the log entry.

**4D. Swallow freed on monster death** — In the death processing block (around line 552–573), after death throes processing:
```typescript
// === SWALLOW FREED — if dead monster had swallowed someone, free them ===
if (c.entityType === 'monster' && !c.isAlive) {
  const freedPlayer = state.combatants.find(p => p.swallowedBy === c.id);
  if (freedPlayer) {
    // Remove swallowed status, clear all swallow tracking fields
    // Push swallow_freed SwallowResult
  }
}
```

**4E. Attach swallowResults to log entry** — After all swallow processing in each turn:
```typescript
if (swallowResults.length > 0 && state.log.length > 0) {
  const lastEntry = state.log[state.log.length - 1];
  state = { ...state, log: [...state.log.slice(0, -1), { ...lastEntry, swallowResults }] };
}
```

**4F. Block swallow from Legendary Actions** — In the LA availability filter (around line 428), add swallow to the excluded types:
```typescript
if (inst.def.type === 'fear_aura' || inst.def.type === 'damage_aura' || inst.def.type === 'swallow') return false;
```

---

### STEP 5 — Combat Logger (`server/src/lib/combat-logger.ts`)

**5A.** Add `SwallowResult` import and `swallowResults?: SwallowResult[]` to RoundLogEntry interface.

**5B.** Pass through in `buildRoundsData()` (after deathThroesResult passthrough):
```typescript
if (entry.swallowResults && entry.swallowResults.length > 0) {
  round.swallowResults = entry.swallowResults;
  // Update HP tracker for swallow damage
  for (const sr of entry.swallowResults) {
    if (sr.playerHpAfter !== undefined) {
      // Find the player combatant and update their HP in the tracker
    }
  }
}
```

---

### STEP 6 — Admin Frontend (`client/src/components/admin/combat/HistoryTab.tsx`)

**6A.** Extend TurnEntry interface (around line 59): add `swallowResults?: any[]`

**6B.** Add to ACTION_ICONS (around line ~1111): `swallow: '🐛'`

**6C.** Create `SwallowDisplay` component (before TurnResultRenderer):
- Background: `bg-purple-500/10 border-l-2 border-purple-500`
- Per result type:
  - `swallow_attempt`: 🐛 "SWALLOW — {monsterName}" + attack roll vs AC + STR save breakdown + swallowed/resisted
  - `swallow_damage`: 🫠 "{damage} {damageType} digestive damage" + HP change
  - `swallow_escape`: 💪 "ESCAPED! Dealt {dmg} (threshold {threshold})"
  - `swallow_freed`: 🐛 "Freed — monster died"

**6D.** Wire into TurnResultRenderer:
```tsx
{entry.swallowResults?.map((sr, i) => <SwallowDisplay key={i} result={sr} />)}
```

**6E.** In `normalizeRoundEntry()` (around line 459):
```typescript
...(raw.swallowResults && { swallowResults: raw.swallowResults }),
```

---

### STEP 7 — Monster Seed Data (`database/seeds/monsters.ts`)

**7A.** Update MonsterAbilityDef type union (line 21–22) — add `| 'swallow'`

**7B.** Add swallow fields to MonsterAbilityDef interface (after line ~45):
```typescript
swallowDamage?: string;
swallowDamageType?: string;
swallowEscapeThreshold?: number;
```

**7C.** Update file header comment to include new tiers.

**7D.** Add all 14 monsters to MONSTERS array. Insert after Elder Fey Guardian (the last arcane monster), before the closing `];`. Each monster follows the EXACT same MonsterDef format as existing monsters.

#### Monster 1: Wyvern (L17) — MOUNTAIN / Skypeak Plateaus
```typescript
{
  name: 'Wyvern',
  level: 17,
  biome: 'MOUNTAIN',
  regionName: 'Skypeak Plateaus',
  damageType: 'PIERCING',
  abilities: [
    {
      id: 'wyvern_multiattack', name: 'Bite and Sting', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The wyvern attacks with its bite and tail stinger.',
    },
    {
      id: 'wyvern_poison', name: 'Poison Sting', type: 'on_hit',
      saveType: 'con', saveDC: 15, statusEffect: 'poisoned', statusDuration: 2,
      description: 'The wyvern\'s tail stinger injects a debilitating poison.',
    },
  ],
  stats: {
    hp: 135, ac: 16, attack: 9, damage: '2d8+5', speed: 40,
    str: 18, dex: 14, con: 16, int: 5, wis: 12, cha: 6,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 30, maxQty: 80, gold: 40 },
    { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

#### Monster 2: Treant (L18) — FOREST / Mistwood Glens
```typescript
{
  name: 'Treant',
  level: 18,
  biome: 'FOREST',
  regionName: 'Mistwood Glens',
  damageType: 'BLUDGEONING',
  vulnerabilities: ['FIRE'],
  resistances: ['PIERCING', 'BLUDGEONING'],
  abilities: [
    {
      id: 'treant_slam', name: 'Slam', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The treant slams with two massive branch-arms.',
    },
    {
      id: 'treant_roots', name: 'Entangling Roots', type: 'status',
      saveType: 'dex', saveDC: 16, statusEffect: 'restrained', statusDuration: 2,
      priority: 8, cooldown: 3,
      description: 'Roots burst from the ground to entangle the target.',
    },
    {
      id: 'treant_regen', name: 'Bark Regeneration', type: 'heal',
      hpPerTurn: 8, disabledBy: ['FIRE'],
      description: 'The treant regenerates 8 HP per turn unless damaged by fire.',
    },
  ],
  stats: {
    hp: 150, ac: 16, attack: 9, damage: '2d10+5', speed: 20,
    str: 20, dex: 6, con: 18, int: 10, wis: 16, cha: 10,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 30, maxQty: 80, gold: 45 },
    { dropChance: 0.25, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

#### Monster 3: Chimera (L19) — BADLANDS / Scarred Frontier
```typescript
{
  name: 'Chimera',
  level: 19,
  biome: 'BADLANDS',
  regionName: 'Scarred Frontier',
  damageType: 'PIERCING',
  immunities: ['FIRE'],
  abilities: [
    {
      id: 'chimera_triple', name: 'Triple Heads', type: 'multiattack',
      attacks: 3, priority: 5, cooldown: 0,
      description: 'The chimera attacks with lion bite, goat horns, and dragon head.',
    },
    {
      id: 'chimera_breath', name: 'Fire Breath', type: 'aoe',
      damage: '6d6', damageType: 'FIRE', saveType: 'dex', saveDC: 15,
      recharge: 5, priority: 9, cooldown: 0,
      description: 'The dragon head exhales a cone of fire.',
    },
  ],
  stats: {
    hp: 155, ac: 16, attack: 10, damage: '2d8+5', speed: 35,
    str: 18, dex: 12, con: 16, int: 4, wis: 12, cha: 8,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 35, maxQty: 80, gold: 50 },
    { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

#### Monster 4: Mind Flayer (L20) — UNDERGROUND / Vel'Naris Underdark
```typescript
{
  name: 'Mind Flayer',
  level: 20,
  biome: 'UNDERGROUND',
  regionName: "Vel'Naris Underdark",
  damageType: 'PSYCHIC',
  resistances: ['PSYCHIC'],
  abilities: [
    {
      id: 'mindflayer_blast', name: 'Mind Blast', type: 'aoe',
      damage: '4d8+4', damageType: 'PSYCHIC', saveType: 'int', saveDC: 17,
      priority: 7, cooldown: 3,
      description: 'The mind flayer unleashes a devastating psychic shockwave.',
    },
    {
      id: 'mindflayer_grapple', name: 'Tentacle Grapple', type: 'status',
      saveType: 'str', saveDC: 15, statusEffect: 'stunned', statusDuration: 1,
      priority: 8, cooldown: 2,
      description: 'The mind flayer grasps the target with its tentacles.',
    },
    {
      id: 'mindflayer_extract', name: 'Extract Brain', type: 'damage',
      damage: '6d10', damageType: 'PSYCHIC',
      priority: 10, usesPerCombat: 1, cooldown: 0,
      description: 'The mind flayer attempts to extract the target\'s brain — a devastating psychic assault.',
    },
  ],
  stats: {
    hp: 145, ac: 17, attack: 10, damage: '2d6+5', speed: 30,
    str: 10, dex: 14, con: 14, int: 22, wis: 18, cha: 16,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 40, maxQty: 100, gold: 60 },
    { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```
NOTE on Extract Brain: priority 10 + usesPerCombat 1 = fires as opener nuke. This is intentional. The Mind Flayer is L20 and should hit hard. Balance pass in Phase 5 will catch it if overtuned.

#### Monster 5: Vampire Lord (L21) — FOREST / Silverwood Forest
```typescript
{
  name: 'Vampire Lord',
  level: 21,
  biome: 'FOREST',
  regionName: 'Silverwood Forest',
  damageType: 'NECROTIC',
  resistances: ['NECROTIC', 'COLD'],
  vulnerabilities: ['RADIANT'],
  conditionImmunities: ['charmed'],
  abilities: [
    {
      id: 'vampire_claws', name: 'Rending Claws', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The vampire lord slashes with both clawed hands.',
    },
    {
      id: 'vampire_drain', name: 'Life Drain', type: 'on_hit',
      saveType: 'con', saveDC: 16, statusEffect: 'weakened', statusDuration: 2,
      description: 'The vampire lord drains life force with each strike.',
    },
    {
      id: 'vampire_charm', name: 'Charm Gaze', type: 'status',
      saveType: 'wis', saveDC: 17, statusEffect: 'charmed', statusDuration: 2,
      priority: 9, cooldown: 4,
      description: 'The vampire lord locks eyes with the target, bending their will.',
    },
  ],
  phaseTransitions: [{
    id: 'vampire_frenzy', hpThresholdPercent: 40, name: 'Blood Frenzy',
    description: 'The vampire lord enters a frenzied bloodlust, attacking with savage speed.',
    triggered: false,
    effects: [
      { type: 'stat_boost', statBoost: { attack: 3, damage: 2 } },
    ],
  }],
  stats: {
    hp: 160, ac: 17, attack: 10, damage: '2d8+5', speed: 40,
    str: 18, dex: 18, con: 16, int: 16, wis: 14, cha: 20,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 50, maxQty: 120, gold: 70 },
    { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

#### Monster 6: Frost Giant (L22) — TUNDRA / Frozen Reaches
```typescript
{
  name: 'Frost Giant',
  level: 22,
  biome: 'TUNDRA',
  regionName: 'Frozen Reaches',
  damageType: 'BLUDGEONING',
  immunities: ['COLD'],
  legendaryActions: 1,
  abilities: [
    {
      id: 'frostgiant_axe', name: 'Greataxe', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The frost giant swings its massive greataxe twice.',
    },
    {
      id: 'frostgiant_boulder', name: 'Boulder Throw', type: 'aoe',
      damage: '4d10', damageType: 'BLUDGEONING', saveType: 'dex', saveDC: 17,
      priority: 8, cooldown: 2,
      isLegendaryAction: true, legendaryCost: 1,
      description: 'The frost giant hurls a massive boulder.',
    },
    {
      id: 'frostgiant_stomp', name: 'Freezing Stomp', type: 'aoe',
      damage: '3d8', damageType: 'COLD', saveType: 'con', saveDC: 17,
      priority: 7, cooldown: 3,
      description: 'The frost giant stomps, sending a wave of freezing cold across the ground.',
    },
  ],
  stats: {
    hp: 185, ac: 17, attack: 11, damage: '3d8+6', speed: 35,
    str: 24, dex: 10, con: 20, int: 10, wis: 12, cha: 12,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 50, maxQty: 120, gold: 75 },
    { dropChance: 0.3, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

#### Monster 7: Sea Serpent (L22) — COASTAL / The Suncoast
```typescript
{
  name: 'Sea Serpent',
  level: 22,
  biome: 'COASTAL',
  regionName: 'The Suncoast',
  damageType: 'PIERCING',
  resistances: ['COLD'],
  abilities: [
    {
      id: 'seaserpent_multi', name: 'Bite and Tail', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The sea serpent strikes with its fangs and lashes with its tail.',
    },
    {
      id: 'seaserpent_constrict', name: 'Constrict', type: 'status',
      saveType: 'str', saveDC: 17, statusEffect: 'restrained', statusDuration: 2,
      priority: 8, cooldown: 2,
      description: 'The serpent coils around its prey, crushing it in powerful coils.',
    },
    {
      id: 'seaserpent_tidal', name: 'Tidal Crash', type: 'aoe',
      damage: '4d8', damageType: 'BLUDGEONING', saveType: 'str', saveDC: 16,
      priority: 7, cooldown: 3,
      description: 'The sea serpent crashes down with the force of a tidal wave.',
    },
  ],
  stats: {
    hp: 180, ac: 16, attack: 11, damage: '2d10+5', speed: 40,
    str: 22, dex: 14, con: 18, int: 4, wis: 12, cha: 6,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 50, maxQty: 120, gold: 70 },
    { dropChance: 0.3, minQty: 1, maxQty: 2, gold: 0 },
  ],
},
```

#### Monster 8: Fey Dragon (L22) — FEYWILD / Glimmerveil ★ ARCANE REAGENT DROPPER
```typescript
{
  name: 'Fey Dragon',
  level: 22,
  biome: 'FEYWILD',
  regionName: 'Glimmerveil',
  damageType: 'FORCE',
  resistances: ['PSYCHIC', 'FORCE'],
  abilities: [
    {
      id: 'feydragon_breath', name: 'Fey Breath', type: 'aoe',
      damage: '4d8', damageType: 'FORCE', saveType: 'wis', saveDC: 16,
      recharge: 5, priority: 9, cooldown: 0,
      description: 'The fey dragon exhales a shimmering blast of raw fey energy.',
    },
    {
      id: 'feydragon_charm', name: 'Beguiling Gaze', type: 'status',
      saveType: 'wis', saveDC: 16, statusEffect: 'charmed', statusDuration: 2,
      priority: 8, cooldown: 3,
      description: 'The fey dragon locks eyes with the target, enchanting them.',
    },
    {
      id: 'feydragon_phase', name: 'Phase Shift', type: 'buff',
      statusEffect: 'shielded', statusDuration: 1,
      priority: 6, cooldown: 3,
      description: 'The fey dragon phases partially into the Feywild, becoming harder to hit.',
    },
  ],
  stats: {
    hp: 150, ac: 17, attack: 10, damage: '2d8+5', speed: 50,
    str: 14, dex: 18, con: 14, int: 18, wis: 16, cha: 20,
  },
  lootTable: [
    { dropChance: 0.55, minQty: 3, maxQty: 5, gold: 0, itemTemplateName: 'Arcane Reagents' },
    { dropChance: 1.0, minQty: 50, maxQty: 120, gold: 65 },
  ],
},
```

#### Monster 9: Iron Golem (L23) — MOUNTAIN / The Foundry
```typescript
{
  name: 'Iron Golem',
  level: 23,
  biome: 'MOUNTAIN',
  regionName: 'The Foundry',
  damageType: 'BLUDGEONING',
  immunities: ['FIRE', 'POISON', 'PSYCHIC'],
  resistances: ['SLASHING', 'PIERCING', 'BLUDGEONING'],
  conditionImmunities: ['poisoned', 'charmed', 'frightened', 'stunned'],
  legendaryResistances: 2,
  critResistance: -25,
  abilities: [
    {
      id: 'irongolem_slam', name: 'Slam', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The iron golem slams with both massive metal fists.',
    },
    {
      id: 'irongolem_poison', name: 'Poison Breath', type: 'aoe',
      damage: '6d8', damageType: 'POISON', saveType: 'con', saveDC: 18,
      priority: 8, cooldown: 4,
      description: 'The golem exhales a cloud of toxic gas from its furnace core.',
    },
  ],
  stats: {
    hp: 200, ac: 20, attack: 11, damage: '3d8+6', speed: 20,
    str: 24, dex: 6, con: 22, int: 3, wis: 10, cha: 1,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 60, maxQty: 120, gold: 80 },
    { dropChance: 0.4, minQty: 1, maxQty: 3, gold: 0 },
  ],
},
```

#### Monster 10: Fire Giant (L24) — VOLCANIC / The Confluence
```typescript
{
  name: 'Fire Giant',
  level: 24,
  biome: 'VOLCANIC',
  regionName: 'The Confluence',
  damageType: 'SLASHING',
  immunities: ['FIRE'],
  legendaryActions: 1,
  abilities: [
    {
      id: 'firegiant_sword', name: 'Greatsword', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The fire giant swings its superheated greatsword twice.',
    },
    {
      id: 'firegiant_flame', name: 'Flame Strike', type: 'aoe',
      damage: '5d8', damageType: 'FIRE', saveType: 'dex', saveDC: 17,
      priority: 8, cooldown: 3,
      isLegendaryAction: true, legendaryCost: 1,
      description: 'The fire giant calls down a column of fire.',
    },
    {
      id: 'firegiant_aura', name: 'Heated Body', type: 'damage_aura',
      auraDamage: '2d6', auraDamageType: 'FIRE',
      description: 'Flames lash out at anyone who strikes the fire giant in melee.',
    },
  ],
  stats: {
    hp: 195, ac: 18, attack: 12, damage: '3d8+6', speed: 35,
    str: 26, dex: 10, con: 20, int: 10, wis: 12, cha: 14,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 60, maxQty: 150, gold: 90 },
    { dropChance: 0.35, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

#### Monster 11: Purple Worm (L25) — UNDERGROUND / Vel'Naris Underdark ★ SWALLOW USER
```typescript
{
  name: 'Purple Worm',
  level: 25,
  biome: 'UNDERGROUND',
  regionName: "Vel'Naris Underdark",
  damageType: 'PIERCING',
  abilities: [
    {
      id: 'purpleworm_multi', name: 'Bite and Tail', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The purple worm attacks with its massive jaws and spiked tail.',
    },
    {
      id: 'purpleworm_swallow', name: 'Swallow', type: 'swallow',
      saveType: 'str', saveDC: 18,
      swallowDamage: '3d6', swallowDamageType: 'ACID',
      swallowEscapeThreshold: 25,
      priority: 9, cooldown: 3,
      description: 'The purple worm attempts to swallow the target whole.',
    },
    {
      id: 'purpleworm_sting', name: 'Tail Stinger', type: 'on_hit',
      saveType: 'con', saveDC: 18, statusEffect: 'poisoned', statusDuration: 2,
      description: 'The worm\'s tail stinger injects a paralyzing venom.',
    },
  ],
  phaseTransitions: [{
    id: 'purpleworm_thrash', hpThresholdPercent: 30, name: 'Thrashing Death',
    description: 'The purple worm thrashes violently as it nears death, crushing everything nearby.',
    triggered: false,
    effects: [
      { type: 'stat_boost', statBoost: { attack: 2 } },
      { type: 'aoe_burst', aoeBurst: { damage: '4d6', damageType: 'BLUDGEONING', saveDC: 18, saveType: 'str' } },
    ],
  }],
  stats: {
    hp: 220, ac: 18, attack: 12, damage: '3d8+7', speed: 40,
    str: 28, dex: 8, con: 22, int: 2, wis: 8, cha: 4,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 80, maxQty: 180, gold: 100 },
    { dropChance: 0.35, minQty: 1, maxQty: 2, gold: 0 },
  ],
},
```
NOTE: Also add death_throes ability:
```typescript
{
  id: 'purpleworm_death', name: 'Acidic Eruption', type: 'death_throes',
  deathDamage: '4d8', deathDamageType: 'ACID', deathSaveDC: 16, deathSaveType: 'dex',
  description: 'The purple worm erupts in a spray of corrosive acid upon death.',
},
```

#### Monster 12: Beholder (L26) — UNDERGROUND / Vel'Naris Underdark
```typescript
{
  name: 'Beholder',
  level: 26,
  biome: 'UNDERGROUND',
  regionName: "Vel'Naris Underdark",
  damageType: 'FORCE',
  immunities: ['PSYCHIC'],
  conditionImmunities: ['charmed', 'frightened'],
  legendaryActions: 2,
  legendaryResistances: 2,
  abilities: [
    {
      id: 'beholder_rays', name: 'Eye Rays', type: 'multiattack',
      attacks: 3, priority: 5, cooldown: 0,
      description: 'The beholder fires three random eye rays at its target.',
    },
    {
      id: 'beholder_disintegrate', name: 'Disintegration Ray', type: 'damage',
      damage: '8d8', damageType: 'FORCE',
      priority: 9, cooldown: 3,
      isLegendaryAction: true, legendaryCost: 2,
      description: 'The beholder fires its most devastating ray, disintegrating matter on contact.',
    },
    {
      id: 'beholder_antimagic', name: 'Antimagic Cone', type: 'status',
      saveType: 'wis', saveDC: 18, statusEffect: 'weakened', statusDuration: 1,
      priority: 7, cooldown: 4,
      description: 'The beholder projects an antimagic field that suppresses magical abilities.',
    },
    {
      id: 'beholder_fear', name: 'Fear Ray', type: 'status',
      saveType: 'wis', saveDC: 18, statusEffect: 'frightened', statusDuration: 2,
      priority: 6, cooldown: 3,
      isLegendaryAction: true, legendaryCost: 1,
      description: 'The beholder fixes a terrifying gaze on its target.',
    },
  ],
  stats: {
    hp: 200, ac: 18, attack: 12, damage: '2d10+6', speed: 20,
    str: 10, dex: 14, con: 18, int: 20, wis: 16, cha: 18,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 80, maxQty: 200, gold: 120 },
    { dropChance: 0.4, minQty: 1, maxQty: 2, gold: 0 },
  ],
},
```

#### Monster 13: Death Knight (L28) — SWAMP / Ashenmoor
```typescript
{
  name: 'Death Knight',
  level: 28,
  biome: 'SWAMP',
  regionName: 'Ashenmoor',
  damageType: 'NECROTIC',
  immunities: ['NECROTIC', 'POISON'],
  resistances: ['COLD', 'FIRE'],
  conditionImmunities: ['poisoned', 'frightened'],
  legendaryActions: 2,
  legendaryResistances: 2,
  abilities: [
    {
      id: 'deathknight_sword', name: 'Necrotic Greatsword', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The death knight strikes twice with its necrotic-infused greatsword.',
    },
    {
      id: 'deathknight_hellfire', name: 'Hellfire Orb', type: 'aoe',
      damage: '10d8', damageType: 'FIRE', saveType: 'dex', saveDC: 19,
      priority: 9, cooldown: 4,
      isLegendaryAction: true, legendaryCost: 2,
      description: 'The death knight hurls an orb of unholy hellfire that explodes on impact.',
    },
    {
      id: 'deathknight_dread', name: 'Dread Command', type: 'fear_aura',
      saveType: 'wis', saveDC: 18, statusEffect: 'frightened', statusDuration: 1,
      auraRepeats: false,
      description: 'The death knight radiates an aura of commanding dread.',
    },
  ],
  phaseTransitions: [{
    id: 'deathknight_undying', hpThresholdPercent: 35, name: 'Unholy Resurrection',
    description: 'Dark energy surges through the death knight as it refuses to fall.',
    triggered: false,
    effects: [
      { type: 'stat_boost', statBoost: { attack: 3, ac: 2, damage: 3 } },
    ],
  }],
  stats: {
    hp: 240, ac: 20, attack: 13, damage: '3d8+7', speed: 30,
    str: 22, dex: 12, con: 20, int: 14, wis: 16, cha: 20,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 100, maxQty: 200, gold: 150 },
    { dropChance: 0.4, minQty: 1, maxQty: 2, gold: 0 },
    { dropChance: 0.1, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

#### Monster 14: Storm Giant (L30) — MOUNTAIN / Skypeak Plateaus ★ APEX
```typescript
{
  name: 'Storm Giant',
  level: 30,
  biome: 'MOUNTAIN',
  regionName: 'Skypeak Plateaus',
  damageType: 'BLUDGEONING',
  immunities: ['LIGHTNING', 'THUNDER'],
  resistances: ['COLD'],
  legendaryActions: 3,
  legendaryResistances: 2,
  abilities: [
    {
      id: 'stormgiant_sword', name: 'Greatsword', type: 'multiattack',
      attacks: 2, priority: 5, cooldown: 0,
      description: 'The storm giant swings its crackling greatsword twice.',
    },
    {
      id: 'stormgiant_lightning', name: 'Lightning Bolt', type: 'aoe',
      damage: '8d6', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 19,
      priority: 9, cooldown: 2,
      isLegendaryAction: true, legendaryCost: 1,
      description: 'The storm giant calls down a bolt of lightning.',
    },
    {
      id: 'stormgiant_thunder', name: 'Thunderclap', type: 'aoe',
      damage: '4d8', damageType: 'THUNDER', saveType: 'con', saveDC: 19,
      priority: 7, cooldown: 3,
      isLegendaryAction: true, legendaryCost: 2,
      description: 'The storm giant claps its hands, unleashing a concussive thunderwave.',
    },
    {
      id: 'stormgiant_aura', name: 'Storm Aura', type: 'damage_aura',
      auraDamage: '2d8', auraDamageType: 'LIGHTNING',
      description: 'Crackling lightning arcs from the storm giant to anyone who strikes it.',
    },
  ],
  phaseTransitions: [{
    id: 'stormgiant_tempest', hpThresholdPercent: 25, name: 'Tempest Unleashed',
    description: 'The storm giant channels the full fury of the storm, becoming an avatar of lightning.',
    triggered: false,
    effects: [
      {
        type: 'add_ability',
        ability: {
          id: 'stormgiant_chain', name: 'Chain Lightning', type: 'aoe',
          damage: '10d6', damageType: 'LIGHTNING', saveType: 'dex', saveDC: 20,
          cooldown: 3, priority: 10,
          description: 'Lightning leaps from the giant in devastating chains.',
        },
      },
      { type: 'stat_boost', statBoost: { attack: 3, damage: 3 } },
    ],
  }],
  stats: {
    hp: 280, ac: 21, attack: 14, damage: '3d10+8', speed: 40,
    str: 28, dex: 14, con: 22, int: 16, wis: 18, cha: 20,
  },
  lootTable: [
    { dropChance: 1.0, minQty: 120, maxQty: 200, gold: 180 },
    { dropChance: 0.45, minQty: 1, maxQty: 2, gold: 0 },
    { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0 },
  ],
},
```

---

### STEP 8 — Narrator Templates (`shared/src/data/combat-narrator/templates.ts`)

Add narrator templates for the following events. Follow the existing template pattern and style:

- **swallow ability type** (monster action): "The {monster} opens its enormous maw..." / "{monster} lunges forward, attempting to swallow {target} whole..."
- **swallowed status applied**: "{target} is engulfed, trapped inside {monster}!" / "The darkness closes in as {target} is swallowed!"
- **swallow_damage per-round**: "Digestive acids burn {target} for {damage} damage!" / "{target} writhes in agony inside {monster}, taking {damage} acid damage!"
- **swallow_escape**: "{target} cuts free from inside {monster}!" / "With a mighty strike, {target} tears free from {monster}'s gullet!"
- **swallow_freed on monster death**: "{target} bursts free as {monster} collapses!" / "The beast falls, releasing {target} from its innards!"
- **restrained status applied**: "{target} is entangled and can barely move!" / "Roots/coils tighten around {target}, restricting movement!"

---

### STEP 9 — Build + Seed + Smoke Sims

**CRITICAL: Run `npx prisma generate` in BOTH shared/ and server/ directories after type changes and before builds.**

**9A. Build checks (all three must pass):**
```bash
npx tsc --build shared/tsconfig.json
npx tsc --noEmit -p server/tsconfig.json
cd client && npx tsc --noEmit
```

**9B. Seed verification:**
- Deploy + seed monsters
- Verify: `SELECT name, level, biome FROM monsters WHERE level >= 17 ORDER BY level` — expect 14 new rows
- Verify Purple Worm has swallow ability in abilities JSON

**9C. Smoke sims (4 matchups, 10 iterations each):**
1. Warrior L20 vs Mind Flayer — verify psychic damage + stun
2. Warrior L25 vs Purple Worm — verify swallow fires, escape/free mechanics
3. Warrior L30 vs Storm Giant — verify LA, phase transition, storm aura
4. Psion L22 vs Fey Dragon — verify arcane caster matchup

Dump all results to `docs/investigations/phase4a-smoke-results.md`

---

### STEP 10 — Deploy

1. `git add -A && git commit -m "Phase 4A: swallow engine + 14 new monsters (L17-30)"`
2. `git push origin main`
3. Build with unique tag: `docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .`
4. `docker push rocregistry.azurecr.io/realm-of-crowns:<TAG>`
5. Update Azure Container App with new image tag (NEVER use :latest)
6. Run seed in production to add new monsters
7. Health check

---

## Output Format

Write results to `docs/investigations/phase4a-results.md`:

```
PHASE 4A RESULTS
================

SWALLOW ENGINE:
  - 'swallow' type added to combat.ts: YES/NO
  - SwallowResult interface added: YES/NO
  - handleSwallow() implemented: YES/NO
  - Swallowed-state round processing (digestive dmg + escape + freed): YES/NO
  - Force basic-attack-only while swallowed: YES/NO
  - Blocked from Legendary Actions: YES/NO
  - restrained status added to type union + STATUS_EFFECT_DEFS: YES/NO
  - swallowed status added to STATUS_EFFECT_DEFS + CC_STATUSES: YES/NO

NEW MONSTERS SEEDED: X/14
  [list each with level, biome, regionName]

SMOKE SIM RESULTS:
  - Warrior L20 vs Mind Flayer: X% win rate, avg rounds, Extract Brain fired Y/10
  - Warrior L25 vs Purple Worm: X% win rate, swallow fired Y/10, escapes Z/Y
  - Warrior L30 vs Storm Giant: X% win rate, phase triggered Y/10, Chain Lightning fired Z/10
  - Psion L22 vs Fey Dragon: X% win rate, avg rounds

NARRATOR:
  - Swallow templates added: YES/NO
  - Restrained templates added: YES/NO

ADMIN UI:
  - SwallowDisplay component added: YES/NO
  - 🐛 icon wired: YES/NO

BUILDS:
  - shared: PASS/FAIL
  - server: PASS/FAIL
  - client: PASS/FAIL

DEPLOYMENT:
  - Commit: [hash]
  - Image tag: [tag]
  - Revision: [number]
  - Health: OK/FAIL
  - Total monsters in DB: [count] (expect 35)

ISSUES:
  - [any problems found]
```

---

## IMPORTANT RULES

1. **Do NOT modify existing monsters** — only ADD new ones to the MONSTERS array
2. **Do NOT touch class abilities, buildAbilityQueue, or class-ability-resolver.ts** — those were just fixed in Phase 3
3. **Use unique ability IDs** — prefix with monster name (e.g., `purpleworm_swallow`, `stormgiant_lightning`)
4. **Every regionName must match EXACTLY** from the valid regions list above
5. **Every biome must be a valid BiomeType enum value**
6. **Gold in lootTable** — scale with level (L17=~40g, L22=~70g, L25=~100g, L30=~180g)
7. **Arcane Reagent drops** — ONLY on Fey Dragon (the designated arcane dropper in this batch)
8. **Swallow is 1v1 only** — don't overcomplicate with multi-target swallow logic
9. **Don't create new ability types** beyond 'swallow' — adapt existing types for edge cases (Phase Shift = buff with shielded, Hellfire Orb = aoe with combined damage as 10d8 FIRE, Extract Brain = damage with usesPerCombat: 1)
10. **Run `npx prisma generate`** in both shared/ and server/ after type changes — we got burned by skipping this in Phase 3
11. The Purple Worm death_throes ability goes in the same abilities array as its other abilities — death_throes is already a supported ability type
