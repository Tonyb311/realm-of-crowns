# Phase 3: Death Throes, Phase Transitions, Swallow/Engulf

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## REQUIRED READING

1. `cat docs/investigations/monster-system-audit.md` — Sections 4 (P3: Polish) and 6 (SRD Candidates — note which monsters use swallow, death throes, phase transitions)
2. `cat shared/src/types/combat.ts` — full type landscape after Phase 1+2
3. `cat server/src/lib/combat-engine.ts` — resolveTurn(), resolveAttack(), checkCombatEnd(), createMonsterCombatant()
4. `cat server/src/lib/monster-ability-resolver.ts` — current 6 ability handlers + resolveMonsterAbility()
5. `cat server/src/services/tick-combat-resolver.ts` — resolveTickCombat() main loop, legendary action execution, decideAction()
6. `cat server/src/lib/combat-logger.ts` — round log structure
7. `cat database/seeds/monsters.ts` — current 21 monsters
8. `cat client/src/components/admin/combat/HistoryTab.tsx` — admin log rendering

---

## CONTEXT

Phase 1 (monster abilities, crit/fumble, damage types, CR) and Phase 2 (legendary actions, legendary resistance, auras) are complete and verified. Three new engine capabilities for Phase 3:

### Scope Clarification: "Spell-Like Abilities"

The original plan listed "spell-like abilities" as a Phase 3 item. This is **already covered** by the existing monster ability system. The Lich's Necrotic Bolt (`damage` type) and Paralyzing Touch (`status` type) ARE spell-like abilities. Dragon breath (`aoe` type) IS a spell-like ability. The monster ability system with its 8 types (damage, status, aoe, multiattack, buff, heal, on_hit, fear_aura, damage_aura) already handles everything "spell-like" would need.

Making monsters use the actual player `resolveCast()` with spell slots would be overengineering — monsters don't need mana management in auto-resolved 1v1 combat. They need abilities with cooldowns and recharges, which they already have. When Phase 4 adds new monsters, they'll get more varied ability definitions using existing types — no engine work needed.

**Phase 3 therefore focuses on three genuinely new engine capabilities:**

### 1. Death Throes (Low complexity)

When a monster with a `death_throes` ability dies (HP hits 0), it triggers one final effect — typically AoE damage. The player takes damage AFTER killing the monster. This makes certain monsters dangerous even in death (Balor-style explosion, Demon self-destruct, etc.).

In auto-resolve: after the monster's HP is set to 0 and `isAlive = false`, check for death throes, resolve the effect, THEN check if the player survived. A player can kill the monster and die from the explosion — mutual kill.

### 2. Phase Transitions (Medium complexity)

At specific HP thresholds, a boss monster changes behavior — gaining new abilities, changing stats, or unlocking abilities that were previously unavailable. This makes boss fights feel dynamic rather than "same thing every round until someone dies."

Implementation: A `phaseThresholds` array on the monster defines HP percentage triggers. When the monster crosses a threshold, a transition fires — can add abilities, modify stats, apply self-buffs, or trigger an AoE.

Examples for existing monsters:
- **Lich at 50% HP:** "Desperate Arcana" — unlocks a more powerful necrotic AoE, crit range expands
- **Demon at 30% HP:** "Infernal Rage" — attack bonus increases, fire aura damage doubles
- **Young Dragon at 25% HP:** "Last Stand" — breath weapon auto-recharges, AC drops (reckless)

### 3. Swallow/Engulf (High complexity)

A monster swallows the player, removing them from normal combat. While swallowed:
- Player takes automatic DoT damage each round (acid, crushing, etc.)
- Player can attack from inside (hits automatically, no AC check, but with limited weapon options)
- Player must deal X damage from inside to break free, OR make a STR check
- If the monster dies while player is inside, player is freed

In 1v1 auto-resolve: swallow changes the combat dynamic — no dodging, no AC, just a DPS race. The player's attacks auto-hit but use reduced damage (constrained space). The monster doesn't attack normally while digesting — just DoT.

No current monsters use this. Building the engine now so Phase 4 can add Purple Worm, Kraken, Behir, and Remorhaz as data-only additions.

---

## WORK ITEMS

### A. Types

#### A1. New Ability Types — `shared/src/types/combat.ts`

Extend MonsterAbility type union:
```typescript
type: 'damage' | 'status' | 'aoe' | 'multiattack' | 'buff' | 'heal' | 'on_hit'
      | 'fear_aura' | 'damage_aura'
      | 'death_throes' | 'swallow';  // NEW
```

Add new fields to MonsterAbility interface:
```typescript
// Death throes fields
deathDamage?: string;              // dice for death explosion (e.g., "10d6")
deathDamageType?: CombatDamageType;
deathSaveDC?: number;              // DEX save for half damage
deathSaveType?: 'str' | 'dex' | 'con';

// Swallow fields
swallowDC?: number;                // STR save DC to avoid being swallowed
swallowEscapeDC?: number;          // STR check DC to break free from inside
swallowEscapeDamage?: number;      // damage threshold to cut free from inside
swallowDotDamage?: string;         // DoT while swallowed (e.g., "3d6")
swallowDotType?: CombatDamageType; // acid, bludgeoning, etc.
```

#### A2. Phase Transition Types — `shared/src/types/combat.ts`

New interfaces:
```typescript
interface PhaseTransition {
  id: string;                       // e.g., "lich_phase2"
  hpThresholdPercent: number;       // triggers at or below this % of max HP (e.g., 50)
  name: string;                     // "Desperate Arcana"
  description: string;              // narrator text when transition fires
  triggered: boolean;               // runtime: has this already fired?
  effects: PhaseTransitionEffect[];
}

interface PhaseTransitionEffect {
  type: 'add_ability' | 'stat_boost' | 'self_buff' | 'aoe_burst' | 'unlock_ability';
  // add_ability: grants a new MonsterAbility for rest of combat
  ability?: MonsterAbility;
  // stat_boost: permanent combat modifier
  statBoost?: { attack?: number; ac?: number; damage?: string };
  // self_buff: apply a status effect to self
  selfBuff?: { status: string; duration: number };
  // aoe_burst: one-time AoE damage when transition fires (like a smaller death throes)
  aoeBurst?: { damage: string; damageType: CombatDamageType; saveDC: number; saveType: 'str' | 'dex' | 'con' };
  // unlock_ability: marks an existing ability's cooldown to 0 and sets it available
  unlockAbilityId?: string;
}

interface PhaseTransitionResult {
  transitionId: string;
  transitionName: string;
  hpThresholdPercent: number;
  actualHpPercent: number;
  effects: string[];               // descriptions of what happened
  aoeDamage?: number;              // damage dealt to player from aoe_burst
  narratorText: string;
}
```

#### A3. Swallow State — `shared/src/types/combat.ts`

Add to Combatant interface:
```typescript
isSwallowed?: boolean;              // player is currently swallowed
swallowedBy?: string;              // ID of monster that swallowed
swallowDamageDealt?: number;        // damage dealt from inside (tracks toward escape threshold)
```

Add to MonsterAbility-using combatant (monster side):
```typescript
hasSwallowedTarget?: boolean;       // monster currently has something swallowed
swallowedTargetId?: string;
```

#### A4. Result Types — `shared/src/types/combat.ts`

```typescript
interface DeathThroesResult {
  monsterName: string;
  damage: number;
  damageType: CombatDamageType;
  damageRoll: string;               // dice notation
  saveDC: number;
  saveType: string;
  saveRoll: number;
  saveTotal: number;
  savePassed: boolean;
  finalDamage: number;              // half on save
  playerSurvived: boolean;
  mutualKill: boolean;              // both died
}

interface SwallowResult {
  phase: 'attempt' | 'swallowed_tick' | 'escape' | 'freed_on_death';
  // Attempt phase
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  savePassed?: boolean;
  // Swallowed tick
  dotDamage?: number;
  dotType?: CombatDamageType;
  playerAttackDamage?: number;
  damageTowardEscape?: number;
  escapeThreshold?: number;
  // Escape
  escaped?: boolean;
  escapeMethod?: 'damage' | 'strength_check' | 'monster_death';
}
```

Extend TurnLogEntry:
```typescript
deathThroesResult?: DeathThroesResult;
phaseTransition?: PhaseTransitionResult;
swallowResult?: SwallowResult;
```

#### A5. Extend MonsterDef in seeds — `database/seeds/monsters.ts`

Add to MonsterDef interface:
```typescript
phaseTransitions?: PhaseTransition[];
```

No new Prisma fields needed — `phaseTransitions` can be stored in the existing `abilities` JSON field alongside regular abilities, OR added as a separate field. Since phase transitions are conceptually different from abilities, store them separately:

Add to Monster model in `schema.prisma`:
```prisma
phaseTransitions  Json      @default("[]")  @map("phase_transitions")
```

Run migration: `npx prisma migrate dev --name add_phase_transitions`

Add to MonsterDef and monsterData in seeds:
```typescript
phaseTransitions: monster.phaseTransitions ?? [],
```

#### A6. Extend Combatant — `shared/src/types/combat.ts`

Add to Combatant interface:
```typescript
phaseTransitions?: PhaseTransition[];  // runtime copy with triggered flags
```

---

### B. Combat Engine

#### B1. Death Throes — `combat-engine.ts`

**New function** `resolveDeathThroes()`:

```typescript
function resolveDeathThroes(
  state: CombatState,
  deadMonsterId: string,
  targetId: string,
): { state: CombatState; result: DeathThroesResult | null }
```

Logic:
1. Find the dead monster's `death_throes` ability from its `monsterAbilities`
2. If none exists, return null
3. Roll death damage: `deathDamage` dice (e.g., "10d6")
4. Target makes save: `deathSaveType` vs `deathSaveDC`
5. If saved: half damage (Math.floor(damage / 2))
6. Apply damage to target (apply damage type interaction)
7. Check if target is still alive
8. Build DeathThroesResult with `mutualKill = !targetSurvived`

**Integration point:** In `resolveTickCombat()` (tick-combat-resolver.ts), find where a monster death is detected. After the monster's `isAlive` is set to false but BEFORE the combat end result is finalized:

```
if (monster just died && monster has death_throes ability) {
  resolve death throes against player
  if player also died → mutual kill result
}
```

This must also work when the monster dies from:
- A regular attack in resolveAttack()
- A class ability
- A spell
- A status effect tick (DoT killing the monster)
- During legendary actions (player kills monster, then death throes fires)

The safest hook is in `resolveTickCombat()` AFTER each turn resolves — check if any monster died this turn and hasn't had death throes processed yet. Use a flag `deathThroesProcessed` on the combatant to prevent double-firing.

#### B2. Phase Transitions — `combat-engine.ts`

**New function** `checkPhaseTransitions()`:

```typescript
function checkPhaseTransitions(
  state: CombatState,
  monsterId: string,
): { state: CombatState; result: PhaseTransitionResult | null }
```

Logic:
1. Get monster's `phaseTransitions` array
2. Calculate current HP percentage: `(currentHp / maxHp) * 100`
3. For each untriggered transition where `hpThresholdPercent >= currentHpPercent`:
   - Mark as triggered
   - Process each effect:
     - `add_ability`: Push new MonsterAbility onto monster's ability list, create instance with cooldown 0
     - `stat_boost`: Modify monster's attack/AC/damage (store as active buff or direct stat change)
     - `self_buff`: Apply status effect to monster
     - `aoe_burst`: Deal AoE damage to player (DEX/CON save for half)
     - `unlock_ability`: Find ability by ID, reset its cooldown to 0 and set isRecharged
   - Build PhaseTransitionResult
4. Only trigger ONE transition per turn (even if multiple thresholds crossed at once — trigger highest threshold first, others on subsequent turns)

**Integration point:** Call `checkPhaseTransitions()` at the END of the player's turn (after damage is dealt but before legendary actions). This way:
- Player attacks monster, dropping it below 50% HP
- Phase transition fires — monster buffs up, AoE burst hits player
- Legendary actions fire with the new buffs active
- Monster's normal turn uses any newly unlocked abilities

**Stat boost implementation:** For `stat_boost`, don't mutate the base stats. Instead, add an `ActiveBuff` to the monster with the stat modifiers. The existing buff system already handles attack/AC mods — use it. Create a buff with a very long duration (999 rounds — permanent for the fight).

#### B3. Swallow/Engulf — `combat-engine.ts` + `monster-ability-resolver.ts`

**New handler in monster-ability-resolver.ts** — `handleSwallow()`:

Attempt phase (monster uses swallow action):
1. Monster makes attack roll vs player AC (must HIT to attempt swallow)
2. If hit: player makes STR save vs `swallowDC`
3. If save fails: player is swallowed
   - Set `player.isSwallowed = true`, `player.swallowedBy = monsterId`
   - Set `monster.hasSwallowedTarget = true`, `monster.swallowedTargetId = playerId`
   - Reset `player.swallowDamageDealt = 0`
4. If save succeeds: normal attack damage only (not swallowed)
5. Build SwallowResult with `phase: 'attempt'`

**Modified combat flow while player is swallowed** — in `resolveTickCombat()`:

When `player.isSwallowed === true`, the normal turn flow changes:

**Player's turn while swallowed:**
1. Skip normal action selection — player auto-attacks from inside
2. Player attacks automatically hit (no AC roll) but use a reduced damage formula:
   - Use weapon damage dice but NO strength modifier (cramped space)
   - Or: use full damage but cap weapon at light weapons only (abstracted: just use base dice)
3. Add damage to `player.swallowDamageDealt`
4. If `swallowDamageDealt >= swallowEscapeDamage`: player cuts free
   - Set `isSwallowed = false`, `hasSwallowedTarget = false`
   - Build SwallowResult with `phase: 'escape'`, `escapeMethod: 'damage'`
5. Alternatively: player makes STR check vs `swallowEscapeDC` each turn
   - If passed: player escapes
   - This is the backup escape for low-damage characters

**Monster's turn while player is swallowed:**
1. Monster does NOT use normal attacks or abilities against the swallowed player
2. Instead: player takes automatic DoT: `swallowDotDamage` of `swallowDotType` each round
3. Monster's legendary actions still fire (but target is swallowed — they may target swallowed player with DoT only, not attacks)
4. If player dies while swallowed: combat ends, monster wins

**Monster death while player is swallowed:**
1. If something kills the monster (DoT from a previous ability, etc.) while player is inside:
   - Player is automatically freed
   - Build SwallowResult with `phase: 'freed_on_death'`, `escapeMethod: 'monster_death'`
2. Death throes still fire if applicable (player takes explosion damage from inside)

**Edge case — 1v1 only:** In 1v1, the monster can only swallow one target (the player). If we add group combat later, a monster could swallow one player while fighting others. For now, `hasSwallowedTarget` is a simple boolean. Leave a TODO for group combat expansion.

Add `swallow` case to the switch in `resolveMonsterAbility()`.

#### B4. createMonsterCombatant() — Pass Phase Transitions

Extend options:
```typescript
phaseTransitions?: PhaseTransition[];
```

Set on combatant with all `triggered: false`.

Update all callers (tick-combat-resolver.ts `buildMonsterCombatOptions()`, batch-combat-sim.ts) to pass phase transition data from the DB monster record.

---

### C. Combat Logger

#### C1. Log Death Throes — `combat-logger.ts`

New handler for death throes events:
```
💀 DEATH THROES — Demon Infernal Explosion
  10d6 FIRE damage: [dice result] = 35
  DEX save: d20(14) + 3 = 17 vs DC 15 → PASSED → 17 damage (half)
  Player HP: 45 → 28
  Survived: YES
```

Or mutual kill:
```
💀 DEATH THROES — Demon Infernal Explosion
  10d6 FIRE damage: [dice result] = 42
  DEX save: d20(3) + 3 = 6 vs DC 15 → FAILED → 42 damage
  Player HP: 20 → 0
  ☠ MUTUAL KILL — Both combatants slain
```

#### C2. Log Phase Transitions — `combat-logger.ts`

```
⚡ PHASE TRANSITION — Lich enters "Desperate Arcana" (HP at 45%)
  Threshold: 50%
  Effects:
    - Unlocked: Mass Necrotic Wave (6d8 necrotic AoE)
    - Stat boost: +2 attack (active until end of combat)
    - AoE burst: 4d6 necrotic (DEX DC 18 → player takes 14 damage)
```

#### C3. Log Swallow Events — `combat-logger.ts`

Attempt:
```
🐛 SWALLOW ATTEMPT — Purple Worm
  Attack: d20(18) + 12 = 30 vs AC 17 → HIT
  STR save: d20(11) + 3 = 14 vs DC 19 → FAILED
  Player is SWALLOWED
```

Swallowed tick:
```
🐛 SWALLOWED — Player inside Purple Worm
  Acid damage: 3d6 = 11 → Player HP: 55 → 44
  Player attacks from inside: 1d8+4 = 9 → Damage toward escape: 9/25
```

Escape:
```
🐛 ESCAPE — Player cuts free from Purple Worm
  Total damage from inside: 27/25 → THRESHOLD REACHED
  Player is freed
```

---

### D. Admin Frontend

#### D1. New Components — `HistoryTab.tsx`

**DeathThroesDisplay** — skull/dark themed, shows damage roll, save, final damage, mutual kill flag:
- Gold border if player survived, red border if mutual kill
- Expandable showing full save breakdown

**PhaseTransitionDisplay** — lightning/yellow themed, shows transition name, HP threshold, effects list:
- Each effect listed with its type and details
- AoE burst damage shown inline
- New abilities listed by name

**SwallowDisplay** — purple/dark themed, three variants:
- Attempt: attack roll → save → swallowed or not
- Tick: DoT damage + player inside attack + escape progress bar
- Escape: method + freed

#### D2. Wire Into Existing Components

- Add `death_throes` to ACTION_ICONS: '💀'
- Add `phase_transition` to ACTION_ICONS: '⚡'
- Add `swallow` to ACTION_ICONS: '🐛'
- Update normalizeRoundEntry() for new data fields
- Insert phase transition entries after player's turn, before legendary actions
- Insert death throes at end of combat (after final killing blow)
- Insert swallow entries inline with monster ability usage

---

### E. Monster Seed Upgrades

#### E1. Death Throes

Add to existing monsters:

| Monster | Death Throes | Damage | Save |
|---|---|---|---|
| **Demon** (L16) | Infernal Explosion | 8d6 FIRE | DEX DC 15 for half |

Only the Demon gets death throes from the existing roster. It fits the Balor/fiend theme. Other candidates (Arcane Elemental could have an arcane discharge, Mana Wisp could have a mana burst) are lower priority — add them in Phase 4 if desired.

#### E2. Phase Transitions

Add to existing bosses:

**Lich (L18) — 2 phase transitions:**

Phase 2 at 50% HP: "Desperate Arcana"
- `unlock_ability`: Add a new ability `lich_mass_necrotic` — `aoe` type, 4d8+5 necrotic, DC 18 CON save, cooldown 2
- `stat_boost`: +2 attack bonus (permanent buff)
- `aoe_burst`: 3d6 necrotic, DC 18 DEX save (transition explosion)

Phase 3 at 25% HP: "Phylactery Rage"
- `unlock_ability`: Set breath-weapon-style ability to cooldown 0 (ready to fire immediately)
- `self_buff`: Apply `haste` (or equivalent — +1 attack, +2 AC) for rest of combat
- `stat_boost`: +3 damage bonus

**Demon (L16) — 1 phase transition:**

Phase 2 at 30% HP: "Infernal Rage"
- `stat_boost`: +3 attack bonus
- `self_buff`: Apply `enraged` (or `berserk`) for rest of combat
- Existing damage_aura fire damage conceptually increases — implement as adding a SECOND damage_aura with higher damage, or modify the existing one. Simpler: just add `stat_boost` with damage bonus.

**Young Dragon (L14) — 1 phase transition:**

Phase 2 at 25% HP: "Cornered Fury"
- `unlock_ability`: Breath weapon cooldown reset to 0 + recharge changes to 4-6 (from 5-6, recharges more often)
- `stat_boost`: -2 AC (reckless), +3 attack
- `aoe_burst`: 6d6 COLD, DC 15 DEX save (furious cold blast as transition fires)

#### E3. Swallow Ability

**No current monsters get swallow.** The engine is built but no seed data uses it yet. Phase 4 monsters that will use it:
- Purple Worm (L25+): swallowDC 19, escapeDC 21, escapeDamage 30, dot 3d6 acid
- Kraken (L35+): swallowDC 23, escapeDC 25, escapeDamage 50, dot 4d6 acid
- Behir (L20+): swallowDC 17, escapeDC 19, escapeDamage 25, dot 2d8 acid

Add a comment in the seed file documenting the planned swallow monsters for Phase 4.

---

### F. CR Formula Update

Update `server/src/lib/cr-formula.ts`:

- **Death Throes:** Add expected death throes damage to effective DPR as a one-time burst. Factor as `deathDamage / expectedCombatLength`. Example: 8d6 (avg 28) over ~5 round combat = ~5.6 DPR equivalent.
- **Phase Transitions:** Stat boosts increase effective DPR and effective HP. Factor as weighted average: if transition fires at 50% HP, the stat boost affects ~50% of the combat, so multiply the boost effect by 0.5. AoE burst adds to DPR as one-time damage.
- **Swallow:** Increases effective DPR (guaranteed DoT), decreases monster's effective damage taken (player attacks auto-hit but may use reduced damage). Factor as DPR increase for the swallow DoT.

Recalculate formulaCR for upgraded monsters (Lich, Demon, Young Dragon).

---

## TESTING

### Unit Tests

1. **Death Throes:**
   - Monster with death_throes dies → AoE triggers → player takes damage
   - Player saves → half damage
   - Player fails save → full damage
   - Player dies from death throes → mutual kill result
   - Monster without death_throes dies → no effect
   - Death throes doesn't fire twice (deathThroesProcessed flag)

2. **Phase Transitions:**
   - Monster drops below 50% HP → transition fires
   - Transition only fires once (triggered flag)
   - add_ability: new ability appears in monster's ability list
   - stat_boost: attack/AC/damage modified
   - aoe_burst: player takes damage
   - unlock_ability: existing ability cooldown reset
   - Multiple thresholds crossed at once → only highest fires this turn

3. **Swallow:**
   - Monster uses swallow → attack roll → player STR save
   - Save fails → player.isSwallowed = true
   - Save succeeds → normal hit damage, not swallowed
   - While swallowed: player auto-hits, damage tracks toward escape
   - Escape threshold reached → player freed
   - STR check escape works
   - Monster dies while player inside → player freed
   - Monster doesn't normal-attack swallowed target (uses DoT instead)

### Smoke Sims

```bash
# TEST 1: Demon death throes
# Expected: When Demon dies, player takes 8d6 fire with DEX save. Some fights should be mutual kills.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 16 --monster Demon --iterations 50 \
  --notes "Smoke: Demon death throes"

# TEST 2: Lich phase transitions
# Expected: Lich should transition at 50% and 25% HP. New abilities unlock, stat boosts apply, AoE burst fires.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich phase transitions at 50% and 25%"

# TEST 3: Young Dragon phase transition
# Expected: Dragon enters "Cornered Fury" at 25% HP — breath weapon resets, AC drops, AoE cold burst.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 14 --monster "Young Dragon" --iterations 30 \
  --notes "Smoke: Dragon phase transition at 25%"

# TEST 4: Demon phase transition + death throes combo
# Expected: Demon enters Infernal Rage at 30%, then death throes when killed. Both should appear in log.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 18 --monster Demon --iterations 50 \
  --notes "Smoke: Demon phase + death throes combo"

# TEST 5: Swallow engine (no current monsters use it — need a test-only setup)
# Create a temporary test: manually add swallow ability to a monster in the sim script
# OR skip this test and verify swallow works in Phase 4 when Purple Worm is added
# For now, just verify the swallow handler exists and compiles without testing in a live sim
```

**TEST 5 NOTE:** No existing monster has swallow. Options:
- Temporarily add swallow to Hydra for testing (it has 5 heads, not thematically correct)
- Create a one-off test script that manually constructs a swallow scenario
- Skip live testing and verify swallow when Phase 4 adds Purple Worm

Recommend option B: write a focused unit test in the test suite that constructs a manual swallow scenario without needing a DB monster. This tests the engine without polluting seed data.

After sims, check admin History tab for:
- 💀 Death throes entries when Demon dies
- ⚡ Phase transition entries when Lich/Dragon/Demon cross HP thresholds
- Mutual kill display when player dies from death throes
- Phase transition effects visible (stat boosts, new abilities, AoE burst damage)

---

## DEPLOYMENT

```bash
git add -A
git commit -m "feat: death throes, phase transitions, swallow engine

Death Throes:
- New ability type: death_throes — AoE damage when monster dies
- Save for half damage, mutual kill detection
- Demon gains Infernal Explosion (8d6 FIRE, DC 15 DEX)

Phase Transitions:
- phaseTransitions field on Monster schema
- HP threshold triggers with effects: add_ability, stat_boost, self_buff, aoe_burst, unlock_ability
- Lich: 2 phases (50% Desperate Arcana, 25% Phylactery Rage)
- Demon: 1 phase (30% Infernal Rage)
- Young Dragon: 1 phase (25% Cornered Fury)

Swallow/Engulf Engine:
- New ability type: swallow — STR save or swallowed
- Modified combat flow while swallowed: auto-hit from inside, DoT, escape threshold
- Engine ready for Phase 4 monsters (Purple Worm, Kraken, Behir)

Admin logging: death throes, phase transition, and swallow displays
CR formula updated for death throes and phase transition effects"
git push origin main
az acr build --registry rocregistry --image realm-of-crowns:$(date +%Y%m%d%H%M) .
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not implement spell-like abilities as a separate system — the existing monster ability types already cover this
- Do not add swallow ability to any current monster — engine only, Phase 4 adds monsters
- Do not change existing monster stats, levels, or names
- Do not remove or modify existing abilities — only ADD death_throes, phase transitions
- Do not implement summon minions or lair actions (out of scope)
- Do not break existing tests — all Phase 1 + Phase 2 tests must still pass
- Do not trigger multiple phase transitions in the same turn
- Do not allow death throes to fire more than once
- Do not skip the mutual kill edge case — player CAN die from death throes after killing the monster
