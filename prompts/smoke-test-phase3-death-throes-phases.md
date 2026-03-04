# Smoke Test: Phase 3 — Death Throes + Phase Transitions

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## CONTEXT

Phase 3 just built clean — death throes and phase transitions added to the combat engine. Three monsters upgraded: Demon (death throes + phase at 30%), Lich (phases at 50%/25%), Young Dragon (phase at 25%). Swallow was intentionally excluded — it'll ship with Phase 4 alongside the first monster that uses it.

**Nothing has been tested against a live database yet.** Deploy, migrate, verify seeds, run sims.

---

## TASK

### Step 0: Deploy + Migration

```bash
git add -A
git commit -m "feat: death throes + phase transitions (Phase 3 monster engine)"
git push origin main
az acr build --registry rocregistry --image realm-of-crowns:$(date +%Y%m%d%H%M) .
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

Wait for health check. Verify the migration applied:

```bash
npx prisma migrate status
```

If `add_phase_transitions` has NOT been applied:
```bash
npx prisma migrate deploy
```

### Step 1: Verify Seed Data

```bash
npx prisma db execute --stdin <<EOF
SELECT name, level,
  abilities::text,
  phase_transitions::text
FROM "monsters"
WHERE name IN ('Demon', 'Lich', 'Young Dragon')
ORDER BY level;
EOF
```

**Expected:**

| Monster | Should have in abilities | Should have in phase_transitions |
|---|---|---|
| Young Dragon (L14) | Existing abilities unchanged + NO death_throes | 1 transition: "Cornered Fury" at 25% |
| Demon (L16) | Existing abilities + `demon_death_throes` (type: death_throes, 8d6 FIRE, DC 15 DEX) | 1 transition: "Infernal Rage" at 30% |
| Lich (L18) | Existing abilities unchanged + NO death_throes | 2 transitions: "Desperate Arcana" at 50%, "Phylactery Rage" at 25% |

Also verify NON-upgraded monsters weren't touched:

```bash
npx prisma db execute --stdin <<EOF
SELECT name, level, phase_transitions::text
FROM "monsters"
WHERE name IN ('Wolf', 'Troll', 'Hydra', 'Ancient Golem', 'Elder Fey Guardian')
ORDER BY level;
EOF
```

**Expected:** All should have `phase_transitions = []`.

### Step 2: Smoke Test Battery

```bash
# TEST 1: Demon Death Throes — 50 iterations for mutual kill visibility
# Expected: When Demon dies, 8d6 FIRE with DEX DC 15 save (half on pass).
# Some fights should be mutual kills (player dies from explosion after killing Demon).
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 16 --monster Demon --iterations 50 \
  --notes "Smoke: Demon death throes — expect mutual kills"

# TEST 2: Lich Phase Transitions — 30 iterations
# Expected: Lich transitions at 50% HP ("Desperate Arcana" — Mass Necrotic Wave unlocks,
# +2 attack, 3d6 necrotic burst hits player) and at 25% HP ("Phylactery Rage" — Paralyzing
# Touch reset, +3 damage, +2 AC). Both should appear in fight logs.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich phase transitions at 50% and 25%"

# TEST 3: Young Dragon Phase Transition — 30 iterations
# Expected: Dragon enters "Cornered Fury" at 25% HP — Cold Breath resets (cooldown 0),
# +3 attack, -2 AC, 6d6 COLD burst hits player.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 14 --monster "Young Dragon" --iterations 30 \
  --notes "Smoke: Dragon phase transition at 25%"

# TEST 4: Demon Phase + Death Throes Combo — 50 iterations with overleveled player
# Expected: Demon enters Infernal Rage at 30% (+3 atk, +2 dmg), then death throes
# fires when killed. Both events should appear in the same fight log.
# Use L18 warrior so fights last longer and both triggers are more likely to fire.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 18 --monster Demon --iterations 50 \
  --notes "Smoke: Demon phase transition + death throes combo"

# TEST 5: Phase 2 Regression — Lich Legendary Actions still work alongside phases
# Expected: Lich still uses 3 legendary actions per round, legendary resistance still
# triggers, fear aura still fires — AND phase transitions layer on top.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class psion --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich regression — LA + LR + fear + phases all together"
```

**Run sequentially. If any sim throws an error, capture stack trace and fix before continuing.**

### Step 3: Verify Admin Dashboard

Open admin combat dashboard Simulation History. For each sim, open 2-3 individual fights:

**TEST 1 (Demon Death Throes):**
- 💀 Death Throes entry appears when Demon dies
- Shows damage roll (8d6), damage type (FIRE), save (DEX vs DC 15)
- Shows save result (passed = half damage, failed = full damage)
- Shows player HP before and after
- If mutual kill: both combatants shown as dead, special indicator
- Death throes fires ONCE (not repeated in subsequent rounds)
- Death throes fires regardless of HOW the Demon died (attack, class ability, DoT)

**TEST 2 (Lich Phases):**
- ⚡ Phase Transition entry when Lich crosses 50% HP
  - Shows "Desperate Arcana" name
  - Lists effects: Mass Necrotic Wave added, +2 attack buff, 3d6 burst damage
  - Burst damage shows save + result
  - After transition: Lich should USE Mass Necrotic Wave in subsequent rounds
- ⚡ Second transition when Lich crosses 25% HP
  - Shows "Phylactery Rage" name
  - Lists effects: Paralyzing Touch unlocked, +3 damage, +2 AC
  - Lich's attacks should deal more damage after this point
- Transitions fire ONCE each (not repeated)
- Only ONE transition fires per turn (if Lich drops from 60% to 20% in one hit, only 50% fires that turn, 25% fires next turn)

**TEST 3 (Dragon Phase):**
- ⚡ Phase Transition at 25% HP: "Cornered Fury"
- Cold Breath available immediately after transition (cooldown reset)
- Attack bonus increases visible in subsequent attack rolls
- AC decrease visible (lower AC hit in attack results)
- 6d6 COLD burst damage to player when transition fires

**TEST 4 (Demon Combo):**
- Find fights where BOTH phase transition AND death throes appear
- Phase fires first (at 30% HP) — Demon gets buffed
- Death throes fires after (at 0 HP) — explosion with save
- Both entries visible in the same fight log
- Correct ordering: ⚡ before 💀

**TEST 5 (Lich Regression):**
- All Phase 2 features still work:
  - 🔱 Legendary Actions (3 per round)
  - ⚜ Legendary Resistance on failed saves
  - 👁 Fear Aura at player turn start
- Phase transitions layer correctly on top
- No conflicts between LA and phase transition timing

### Step 4: Report Findings

```
PHASE 3 SMOKE TEST RESULTS
===========================

Deployment: [tag] — revision [N] — health [PASS/FAIL]
Migration: [APPLIED/ALREADY APPLIED/FAILED]
Seed Data: [PASS/FAIL]

TEST 1 - Demon Death Throes: [PASS/FAIL/PARTIAL]
  - Death throes fires on kill: [yes/no]
  - Save for half damage: [observed/not observed]
  - Mutual kills: [count out of 50 fights]
  - Fires exactly once: [yes/no]
  - Damage range observed: [min-max]
  - Notes: [any issues]

TEST 2 - Lich Phase Transitions: [PASS/FAIL/PARTIAL]
  - 50% transition fires: [yes/no]
  - 25% transition fires: [yes/no]
  - Mass Necrotic Wave unlocked and used: [yes/no]
  - Stat boosts applied (visible in attacks): [yes/no]
  - AoE burst damage dealt: [yes/no]
  - Only one transition per turn: [verified/not verified]
  - Transitions fire once each: [yes/no]
  - Notes: [any issues]

TEST 3 - Dragon Phase Transition: [PASS/FAIL/PARTIAL]
  - 25% transition fires: [yes/no]
  - Cold Breath available immediately after: [yes/no]
  - Attack bonus increase visible: [yes/no]
  - AC decrease visible: [yes/no]
  - 6d6 COLD burst dealt: [yes/no]
  - Notes: [any issues]

TEST 4 - Demon Combo (Phase + Death Throes): [PASS/FAIL/PARTIAL]
  - Both events in same fight: [yes/no — count]
  - Correct order (phase before death throes): [yes/no]
  - Phase buffs affect remaining combat: [yes/no]
  - Notes: [any issues]

TEST 5 - Lich Regression (Phase 2 features): [PASS/FAIL/PARTIAL]
  - Legendary Actions still fire: [yes/no]
  - Legendary Resistance still triggers: [yes/no]
  - Fear Aura still fires: [yes/no]
  - Phase transitions layer correctly: [yes/no]
  - No timing conflicts: [yes/no]
  - Notes: [any issues]

OVERALL: [X/5 PASSED, X PARTIAL, X FAILED]

ISSUES FOUND:
1. [issue + test + severity]
2. ...

ADMIN RENDERING:
- DeathThroesDisplay renders: [yes/no]
- PhaseTransitionDisplay renders: [yes/no]
- Mutual kill indicator: [yes/no]
- Phase effects list visible: [yes/no]
- Burst damage inline: [yes/no]

PHASE 1+2 REGRESSION:
- Crit d100 still fires: [spot check]
- Damage type interactions: [spot check]
- Monster abilities (multiattack, regen, breath): [spot check]
- Legendary actions: [verified in TEST 5]
- Legendary resistance: [verified in TEST 5]
- Auras: [verified in TEST 5]

BALANCE OBSERVATION (not a bug — just note):
- Lich win rate at L18 warrior: [%]
- Is Lich unkillable with 3 LA + 3 LR + fear + 2 phases? [observation]
```

### Step 5: Fix Critical Issues

If any test FAILS:
1. Capture error or incorrect behavior
2. Diagnose root cause
3. Fix in the relevant file
4. Re-run just that test
5. Verify fix in admin dashboard
6. Commit separately with descriptive message, new unique image tag, re-deploy

---

## DO NOT

- Do not run balance tuning — functional verification only
- Do not add swallow to any monster (intentionally excluded from Phase 3)
- Do not change monster stats, levels, or names
- Do not modify Phase 1 or Phase 2 features
- Do not skip the regression check in TEST 5
- Do not batch sims — run sequentially
- Do not declare success without checking admin dashboard rendering for both new display components
- Do not skip verifying that non-upgraded monsters have empty phase_transitions
