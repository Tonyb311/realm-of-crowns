# Phase 2: Boss Features — Legendary Actions, Legendary Resistance, Auras

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## REQUIRED READING

1. `cat docs/investigations/monster-system-audit.md` — Section 4 (P2: Boss-Tier Features) and Section 6 (SRD Monster Candidates)
2. `cat docs/design/combat-rating-system.md` — how boss features affect CR
3. `cat docs/design/critical-hit-fumble-system.md` — crit interactions with legendary monsters
4. `cat shared/src/types/combat.ts` — current combat types including MonsterAbility, Combatant
5. `cat server/src/lib/combat-engine.ts` — resolveTurn(), status processing, monster_ability case
6. `cat server/src/lib/monster-ability-resolver.ts` — current ability handlers
7. `cat server/src/services/tick-combat-resolver.ts` — decideAction() monster AI path
8. `cat server/src/lib/combat-logger.ts` — round log structure
9. `cat database/seeds/monsters.ts` — current 21 monsters with abilities
10. `cat client/src/components/admin/combat/HistoryTab.tsx` — MonsterAbilityEntry, admin log rendering

---

## CONTEXT

Phase 1 is complete and verified — monsters have abilities (multiattack, on-hit, regen, breath weapons), d100 crit/fumble system works, damage type interactions work. 14/14 smoke tests passed.

Phase 2 adds boss-tier features that make high-level monsters (L12+) feel like actual bosses instead of stat blocks with more HP. Three new engine capabilities:

### 1. Legendary Actions (High complexity)

In D&D, legendary actions are extra actions a boss takes at the end of other creatures' turns. In our 1v1 auto-resolved combat, this simplifies to: **after the player's turn, the boss gets 1-3 additional actions per round.**

Each legendary action can be:
- A basic attack (costs 1 action)
- A specific legendary ability (costs 1-3 actions depending on power)
- Some abilities cost 2 or 3 legendary actions (e.g., the Lich's Paralyzing Touch as a legendary action costs 2)

**In 1v1, this means a boss with 3 legendary actions effectively gets 4 turns per round** (1 normal + 3 legendary). This is the primary mechanic that makes bosses threatening despite being outnumbered in group combat later.

**Important for group combat (future):** In 5v1, legendary actions fire after EACH player's turn, not all at once after the round. A boss with 3 legendary actions gets to use 1 after player A's turn, 1 after player B's turn, 1 after player C's turn. The pool refreshes at the start of the boss's own turn. For now (1v1), all 3 fire after the single player's turn.

### 2. Legendary Resistance (Medium complexity)

When a boss fails a saving throw, it can choose to succeed instead. Limited uses per combat (typically 3). This prevents a single lucky stun/paralyze/dominate from trivializing a boss fight.

Implementation: In the save resolution logic, after the monster rolls and fails, check if it has legendary resistance uses remaining. If yes, auto-succeed and decrement the count. Log the legendary resistance use so the player sees "The Lich resists your Dominate through sheer force of will!" rather than silently passing.

### 3. Auras — Passive and Reactive (Medium complexity)

Two subtypes:

**Fear Aura (passive):** At the START of the player's turn each round, they must make a WIS save vs the monster's DC or become frightened. Frightened status already exists in STATUS_EFFECT_DEFS. Once the player succeeds on the save, they should be immune to that monster's fear aura for the rest of the combat (no re-save every round after passing once — prevents tedious repeat saves).

**Damage Aura (reactive):** When the monster is hit by a melee attack, the attacker takes automatic damage (no save). Examples: Demon fire aura (1d6 fire damage), Balor flame whip. This makes melee combat against certain bosses a DPS race — you're taking damage every time you swing.

---

## WORK ITEMS

### A. Types & Schema

#### A1. Extend MonsterAbilityDef — `shared/src/types/combat.ts`

Add two new ability types to the existing MonsterAbility type union:

```typescript
type: 'damage' | 'status' | 'aoe' | 'multiattack' | 'buff' | 'heal' | 'on_hit' 
      | 'fear_aura' | 'damage_aura';  // NEW
```

Add new fields to MonsterAbility interface:
```typescript
// Aura fields
auraDamage?: string;           // dice for damage aura (e.g., "1d6")
auraDamageType?: CombatDamageType;  // fire, cold, etc.
auraRepeats?: boolean;         // false = immune after first successful save (fear aura)

// Legendary action fields  
isLegendaryAction?: boolean;   // can this ability be used as a legendary action?
legendaryCost?: number;        // how many legendary actions it costs (1-3)
```

#### A2. Extend Combatant — `shared/src/types/combat.ts`

Add to Combatant interface:
```typescript
legendaryActionsMax?: number;       // total per round (0 = not a boss, 1-3 typical)
legendaryActionsRemaining?: number; // current pool (resets at start of monster's turn)
legendaryResistancesMax?: number;   // total per combat
legendaryResistancesRemaining?: number; // current uses
fearAuraImmune?: boolean;           // set to true after player succeeds fear aura save
```

#### A3. New result types — `shared/src/types/combat.ts`

```typescript
interface LegendaryActionResult {
  actionNumber: number;          // 1st, 2nd, 3rd legendary action this round
  actionsRemaining: number;      // pool remaining after this action
  action: MonsterAbilityResult | AttackResult;  // what the legendary action did
}

interface LegendaryResistanceResult {
  originalRoll: number;
  originalTotal: number;
  saveDC: number;
  wouldHaveFailed: boolean;
  resistanceUsed: boolean;
  resistancesRemaining: number;
}

interface AuraResult {
  auraName: string;
  auraType: 'fear' | 'damage';
  // Fear aura
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  savePassed?: boolean;
  statusApplied?: string;
  immuneAfterPass?: boolean;
  // Damage aura
  damage?: number;
  damageType?: CombatDamageType;
  damageRoll?: string;          // dice notation that was rolled
}
```

Extend TurnResult or RoundLogEntry to include:
```typescript
legendaryActions?: LegendaryActionResult[];
legendaryResistance?: LegendaryResistanceResult;
auraResults?: AuraResult[];
```

#### A4. Prisma Schema — Monster model

Add two fields to Monster model:
```prisma
legendaryActions      Int       @default(0)  @map("legendary_actions")       // 0 = not a boss
legendaryResistances  Int       @default(0)  @map("legendary_resistances")   // 0 = none
```

Run migration: `npx prisma migrate dev --name add_legendary_features`

#### A5. Extend MonsterDef in seeds — `database/seeds/monsters.ts`

Add to MonsterDef interface:
```typescript
legendaryActions?: number;
legendaryResistances?: number;
```

Add to monsterData in seed function:
```typescript
legendaryActions: monster.legendaryActions ?? 0,
legendaryResistances: monster.legendaryResistances ?? 0,
```

---

### B. Combat Engine

#### B1. Legendary Resistance — Save Resolution

Find where saving throws are resolved for monsters. This occurs in multiple places:
- `resolveCast()` — when player casts at monster
- Class ability handlers that force saves
- Any status ability that targets the monster with a save DC

**In EACH place where a monster fails a save**, add a check:

```typescript
if (target.entityType === 'monster' && !savePassed && target.legendaryResistancesRemaining > 0) {
  target.legendaryResistancesRemaining--;
  savePassed = true;  // override to success
  // Build LegendaryResistanceResult and attach to turn log
}
```

This is the simplest of the three features but touches the MOST code paths. Search for every save resolution and add the check. Don't miss:
- Monster ability `status` type handler (when monsters are targeted by player status effects)
- Crit/fumble status effects that force saves
- Any class ability that forces a save on the target

#### B2. Fear Aura — Start of Player Turn

In `resolveTurn()`, at the START of the player's turn (before action selection), if the opponent is a monster with a `fear_aura` ability:

1. Check if player has `fearAuraImmune` flag — if yes, skip
2. Player makes WIS save: d20 + WIS modifier vs the aura's saveDC
3. If failed: apply `frightened` status (duration from ability, typically 1 round — re-check each turn)
4. If passed: set `fearAuraImmune = true` on the player combatant — no more fear checks this combat
5. Build AuraResult and attach to the round log

The `frightened` status already exists in STATUS_EFFECT_DEFS and should already have mechanical effects (disadvantage on attacks, can't move closer). Verify it does.

#### B3. Damage Aura — After Melee Attack Hits Monster

In `resolveAttack()`, after a melee attack successfully hits a monster that has a `damage_aura` ability:

1. Roll the aura damage (e.g., "1d6")
2. Determine damage type from the aura ability
3. Apply damage type interaction (check attacker's resistances/immunities — though players don't have these yet, build the infrastructure)
4. Deal the damage to the attacker
5. Build AuraResult and attach to the turn result

**Important:** Damage aura triggers on MELEE attacks only, not ranged. Check if the attacker's weapon is melee. If this distinction isn't tracked, add it — or default to "all attacks trigger it" for now with a TODO for ranged exclusion.

Also: damage aura should trigger EVEN IF the attack misses? In D&D, Remorhaz Heated Body triggers when the creature is HIT by a melee attack. Fire aura (Balor) triggers just by being near it. For simplicity, trigger on successful melee hit only.

#### B4. Legendary Actions — After Player Turn

This is the most complex addition. In `resolveTurn()`, after the player's turn fully resolves (action + status ticks + all effects), if the opponent (monster) has `legendaryActionsRemaining > 0`:

1. **Refresh pool** — at the start of the monster's own normal turn, reset `legendaryActionsRemaining = legendaryActionsMax`

2. **After player's turn** — process legendary actions:
   ```
   while (legendaryActionsRemaining > 0 && monster is alive && target is alive):
     a. Check available legendary abilities (isLegendaryAction: true, not on cooldown, cost <= remaining)
     b. Sort by priority
     c. If an ability is available and cost <= remaining:
        - Execute the ability (same as monster_ability resolution)
        - Subtract legendaryCost from pool
     d. If no abilities available but pool > 0:
        - Execute basic attack (costs 1)
        - Subtract 1 from pool
     e. Build LegendaryActionResult for each action taken
   ```

3. **Track results** — attach array of `LegendaryActionResult` to the round log entry

4. **Cooldown interaction** — legendary action abilities share cooldowns with the monster's normal abilities. If the Lich uses Paralyzing Touch as a legendary action, it goes on cooldown for the normal turn too.

5. **Round flow becomes:**
   ```
   Player turn → Player status ticks → Fear aura check (if applicable) →
   Monster legendary actions (1-3 extra actions) →
   Monster normal turn → Monster status ticks → Monster regen
   ```

   Wait — actually, fear aura should happen at start of player's turn (before they act), not after. And legendary actions happen AFTER the player acts. So:

   ```
   Start of round:
     Reset monster legendary action pool
   Player's turn:
     Fear aura save (start of turn)
     Player acts (may be prevented by frightened/stunned)
     Player status ticks
   After player's turn:
     Monster legendary actions (1-3)
   Monster's normal turn:
     Monster acts (normal ability selection from Phase 1)
     Monster status ticks
     Monster regen
   End of round
   ```

#### B5. createMonsterCombatant() — Pass Boss Data

Extend `createMonsterCombatant()` options to include:
```typescript
legendaryActions?: number;
legendaryResistances?: number;
```

Set on combatant:
```typescript
legendaryActionsMax: options.legendaryActions ?? 0,
legendaryActionsRemaining: options.legendaryActions ?? 0,
legendaryResistancesMax: options.legendaryResistances ?? 0,
legendaryResistancesRemaining: options.legendaryResistances ?? 0,
fearAuraImmune: false,
```

Update all callers (road-encounter.ts, combat-simulator.ts, batch-combat-sim.ts) to pass legendary data from the DB monster record.

---

### C. Combat Logger

#### C1. Log Legendary Actions

Each legendary action produces its own round log entry (or sub-entry within the round). The admin log should show:

```
🔱 LEGENDARY ACTION (1/3)
  Lich uses Paralyzing Touch (cost: 2)
  [full ability resolution details — save, effect, etc.]

🔱 LEGENDARY ACTION (3/3)
  Lich basic attacks
  [attack roll, damage, crit check, etc.]
```

Add `legendary_action` to the action type handling in `buildRoundsData()`. Each legendary action entry should include:
- Action number (1st, 2nd, 3rd)
- Actions remaining after this one
- Cost of this action
- Full ability/attack resolution (reuse existing handlers)

#### C2. Log Legendary Resistance

When legendary resistance triggers, add it to the save result in the round log:

```
Lich fails CON save: d20(8) + 2 = 10 vs DC 16
⚜ LEGENDARY RESISTANCE used (2 remaining)
Save overridden to SUCCESS
```

This should appear inline with the save result, not as a separate entry.

#### C3. Log Aura Results

**Fear aura** — at start of player's turn:
```
👁 FEAR AURA — Demon Frightful Presence
  WIS save: d20(12) + 1 = 13 vs DC 15 → FAILED
  Frightened applied (1 round)
```

Or:
```
👁 FEAR AURA — Demon Frightful Presence
  WIS save: d20(16) + 1 = 17 vs DC 15 → PASSED
  Player is now immune to this fear aura
```

**Damage aura** — after melee hit:
```
🔥 DAMAGE AURA — Demon Fire Aura
  Attacker takes 1d6(4) FIRE damage
```

---

### D. Admin Frontend

#### D1. New Components — `HistoryTab.tsx`

**LegendaryActionEntry** — gold/purple themed, shows action number, cost, remaining pool, then delegates to MonsterAbilityEntry or AttackEntry for the actual action resolution:
```
🔱 Legendary Action 1/3 (cost: 2, pool: 1 remaining)
  [MonsterAbilityEntry or AttackEntry nested inside]
```

**LegendaryResistanceDisplay** — inline badge shown after a save result:
```
Save: d20(8) + 2 = 10 vs DC 16 → FAILED ⚜ Legendary Resistance (2 left) → OVERRIDDEN TO SUCCESS
```

**FearAuraDisplay** — at the start of the round for the player:
```
👁 Fear Aura: Frightful Presence
  WIS Save: d20(12) + 1 = 13 vs DC 15 → FAILED → Frightened (1 round)
```

**DamageAuraDisplay** — inline after an attack entry:
```
🔥 Fire Aura: 4 FIRE damage to attacker (HP: 45 → 41)
```

#### D2. Wire Into Existing Components

- Update `normalizeRoundEntry()` to extract legendary action, legendary resistance, and aura data
- Add `legendary_action` to ACTION_ICONS: '🔱'
- Add legendary action sub-entries within the round display (after player's turn, before monster's turn)
- Add fear aura entry at start of player's turn section
- Add damage aura entry inline after melee attacks against boss monsters

---

### E. Monster Seed Upgrades

Upgrade existing boss-tier monsters with the new features. **Do NOT change their existing abilities, stats, or levels** — only ADD legendary/aura features.

| Monster | Level | Legendary Actions | Legendary Resistances | Auras | New Abilities |
|---|---|---|---|---|---|
| **Lich** | 18 | 3 | 3 | Fear aura (DC 18 WIS) | Mark existing Paralyzing Touch as `isLegendaryAction: true, legendaryCost: 2`. Add Necrotic Bolt as legendary (`legendaryCost: 1`). Add fear_aura ability. |
| **Demon** | 16 | 2 | 1 | Fear aura (DC 15 WIS), Fire aura (1d6 FIRE) | Add fear_aura ability. Add damage_aura ability (1d6 FIRE). |
| **Young Dragon** | 14 | 1 | 1 | Fear aura (DC 15 WIS) | Add fear_aura ability. Mark basic attack as `isLegendaryAction: true, legendaryCost: 1`. |
| **Ancient Golem** | 12 | 0 | 2 | None | No auras (it's a construct, not scary). Legendary resistance represents magic resistance. |
| **Hydra** | 15 | 0 | 0 | None | Hydra isn't a "boss" — it's a brute with lots of heads. No legendary features. |
| **Elder Fey Guardian** | 16 | 1 | 1 | Fear aura (DC 16 WIS) | Add fear_aura ability (nature dread). Mark Radiant Burst as `isLegendaryAction: true, legendaryCost: 2`. |

**For ALL monsters with legendary actions:** add at minimum a basic attack legendary option. This ensures the monster always has something to spend legendary actions on even if all abilities are on cooldown.

### F. CR Formula Update

Update `server/src/lib/cr-formula.ts` to account for boss features:

- **Legendary Actions** increase effective DPR: multiply monster DPR by `(1 + legendaryActions * 0.5)` approximately. A boss with 3 legendary actions deals roughly 2.5x the DPR of a non-legendary monster because it acts 4 times per round.
- **Legendary Resistance** increases effective HP against CC: if the monster has legendary resistances, reduce the lethality adjustment from player save-or-suck abilities (the monster will auto-pass the first N saves).
- **Fear Aura** increases effective DPR indirectly: frightened players deal less damage (if frightened imposes disadvantage on attacks). Factor as ~10-15% effective DPR increase.
- **Damage Aura** is direct DPR: add expected aura damage per round to the monster's EDPR.

Recalculate formulaCR for the 6 upgraded monsters after updating the formula.

---

## TESTING

### Unit Tests

1. **Legendary Resistance:**
   - Monster with 3 LR fails a save → auto-succeeds, LR decremented to 2
   - Monster with 0 LR fails a save → normal failure
   - LR doesn't trigger on successful saves (only on failures)

2. **Fear Aura:**
   - Player fails WIS save → frightened status applied
   - Player succeeds WIS save → fearAuraImmune set, no more checks
   - Fear aura doesn't trigger if player already immune
   - Fear aura fires at start of player's turn, not monster's

3. **Damage Aura:**
   - Melee attack hits boss → attacker takes aura damage
   - Melee attack misses → no aura damage
   - Aura damage applies damage type interaction (if attacker has resistances)

4. **Legendary Actions:**
   - Boss with 3 LA takes 3 extra actions after player turn
   - Legendary abilities respect cooldowns
   - Cost-2 ability consumes 2 from pool
   - Pool refreshes at start of boss's normal turn
   - Boss doesn't take legendary actions if dead or stunned

### Smoke Sims

```bash
# Lich — legendary actions + legendary resistance + fear aura
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich legendary actions + resistance + fear"

# Lich vs Psion — test legendary resistance against CC
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class psion --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich LR vs Psion CC"

# Demon — fear aura + fire aura + multiattack
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 16 --monster Demon --iterations 30 \
  --notes "Smoke: Demon fear + fire aura"

# Young Dragon — 1 legendary action + fear aura
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 14 --monster "Young Dragon" --iterations 30 \
  --notes "Smoke: Dragon legendary action + fear"

# Ancient Golem — legendary resistance (no legendary actions)
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class psion --level 14 --monster "Ancient Golem" --iterations 30 \
  --notes "Smoke: Golem legendary resistance vs CC"
```

After sims, check admin History tab for:
- **Lich fights:** 🔱 legendary action entries (3 per round), ⚜ legendary resistance triggers on failed saves, 👁 fear aura at start of player turns
- **Demon fights:** 👁 fear aura + 🔥 fire aura damage after melee hits
- **Dragon fights:** 1 legendary action per round
- **Golem fights:** legendary resistance triggering against Psion CC

---

## DEPLOYMENT

Standard workflow: commit → push → build with unique timestamp tag → deploy → verify health + admin dashboard.

Commit message:
```
feat: boss features — legendary actions, legendary resistance, fear/damage auras

Legendary Actions:
- Bosses get 1-3 extra actions per round after the player's turn
- Each action costs 1-3 from the pool, refreshes at boss's turn start
- Lich (3), Demon (2), Young Dragon (1), Elder Fey Guardian (1)

Legendary Resistance:
- Bosses auto-succeed failed saves, limited uses per combat
- Lich (3), Ancient Golem (2), Young Dragon (1), Demon (1), Elder Fey (1)

Auras:
- Fear aura: WIS save at player turn start or frightened; immune after passing
- Damage aura: melee attackers take automatic damage (Demon fire 1d6)
- Lich, Demon, Young Dragon, Elder Fey Guardian gain fear auras

Admin logging: full decision chain for all three features
CR formula updated to account for boss features
```

---

## DO NOT

- Do not change existing monster stats, levels, or names
- Do not remove or modify existing monster abilities — only ADD legendary/aura features
- Do not implement legendary actions for group combat (5v1 distribution) — that's future work. For now, all legendary actions fire after the single player's turn.
- Do not add spell-like abilities (Phase 3)
- Do not add swallow/engulf (Phase 3)
- Do not add death throes (Phase 3)
- Do not add phase transitions (Phase 3)
- Do not break existing combat tests — all 65 scenarios + new Phase 1 tests must still pass
- Do not forget to update the CR formula — legendary actions massively change monster power
