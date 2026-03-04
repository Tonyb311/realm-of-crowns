# Smoke Test: Phase 2 Boss Features

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## CONTEXT

Phase 2 just built clean — legendary actions, legendary resistance, and auras added to the combat engine. Five monsters upgraded: Lich (3 LA, 3 LR, fear aura), Demon (2 LA, 1 LR, fear + fire aura), Young Dragon (1 LA, 1 LR, fear aura), Ancient Golem (0 LA, 2 LR), Elder Fey Guardian (1 LA, 1 LR, fear aura).

**Nothing has been tested against a live database yet.** We need to deploy, run the migration, verify seeds, then run targeted sims to confirm all three boss features work end-to-end.

---

## TASK

### Step 0: Deploy + Migration

Deploy the current build:

```bash
git add -A
git commit -m "feat: boss features — legendary actions, legendary resistance, fear/damage auras"
git push origin main
```

Build and deploy with unique tag:
```bash
az acr build --registry rocregistry --image realm-of-crowns:$(date +%Y%m%d%H%M) .
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

Wait for health check to pass. Then verify the migration applied:

```bash
npx prisma migrate status
```

If `add_legendary_features` has NOT been applied, run:
```bash
npx prisma migrate deploy
```

### Step 1: Verify Seed Data

Spot-check that boss monsters have their new fields:

```bash
npx prisma db execute --stdin <<EOF
SELECT name, level, "legendary_actions", "legendary_resistances",
       abilities::text
FROM "monsters"
WHERE name IN ('Lich', 'Demon', 'Young Dragon', 'Ancient Golem', 'Elder Fey Guardian')
ORDER BY level;
EOF
```

**Expected:**

| Monster | legendary_actions | legendary_resistances | Should have in abilities |
|---|---|---|---|
| Ancient Golem | 0 | 2 | Slam multiattack (unchanged) |
| Young Dragon | 1 | 1 | fear_aura (DC 15), multiattack, breath |
| Demon | 2 | 1 | fear_aura (DC 15), damage_aura (1d6 FIRE), multiattack (isLegendaryAction) |
| Elder Fey Guardian | 1 | 1 | fear_aura (DC 16), Radiant Burst (isLegendaryAction, cost 2) |
| Lich | 3 | 3 | fear_aura (DC 18), Paralyzing Touch (legendary cost 2), Necrotic Bolt (legendary cost 1) |

**If any monster is missing legendary fields or abilities, re-run the seed or fix the seed data before continuing.**

Also verify that NON-boss monsters were NOT changed:

```bash
npx prisma db execute --stdin <<EOF
SELECT name, level, "legendary_actions", "legendary_resistances"
FROM "monsters"
WHERE name IN ('Wolf', 'Troll', 'Goblin', 'Hydra', 'Void Stalker')
ORDER BY level;
EOF
```

**Expected:** All should have `legendary_actions = 0`, `legendary_resistances = 0`.

### Step 2: Smoke Test Battery

Run 7 sim batches. Each tests a specific boss feature combination.

```bash
# TEST 1: Lich Legendary Actions — should see 3 extra actions per round
# Expected: Lich uses Paralyzing Touch (cost 2) + Necrotic Bolt (cost 1) or basic attacks as legendary actions after player's turn
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich legendary actions (3 LA)"

# TEST 2: Lich Legendary Resistance vs CC — Psion has lots of save-or-suck
# Expected: Lich auto-passes first 3 failed saves, then starts failing normally
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class psion --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich legendary resistance vs Psion CC"

# TEST 3: Lich Fear Aura
# Expected: At start of player's turn each round, WIS save vs DC 18. If failed, frightened applied. If passed, immune for rest of combat.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 18 --monster Lich --iterations 30 \
  --notes "Smoke: Lich fear aura"

# TEST 4: Demon Fear Aura + Fire Damage Aura
# Expected: Fear aura (DC 15 WIS save). Fire aura: warrior takes 1d6 fire damage every time they hit the Demon with a melee attack.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 16 --monster Demon --iterations 30 \
  --notes "Smoke: Demon fear + fire aura"

# TEST 5: Young Dragon — 1 Legendary Action + Fear Aura
# Expected: Dragon gets 1 extra basic attack after player's turn. Fear aura (DC 15).
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 14 --monster "Young Dragon" --iterations 30 \
  --notes "Smoke: Dragon 1 LA + fear aura"

# TEST 6: Ancient Golem — Legendary Resistance only (no LA, no auras)
# Expected: Golem auto-passes first 2 failed saves. No legendary actions, no fear aura.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class psion --level 14 --monster "Ancient Golem" --iterations 30 \
  --notes "Smoke: Golem legendary resistance only"

# TEST 7: Elder Fey Guardian — 1 LA + Fear Aura
# Expected: 1 legendary action (Radiant Burst costs 2, so only usable if pool = 2+? No — pool is 1, cost is 2, so it should fall back to basic attack). Fear aura DC 16.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 16 --monster "Elder Fey Guardian" --iterations 30 \
  --notes "Smoke: Elder Fey 1 LA + fear aura"
```

**Run sequentially. If any sim throws an error, capture the stack trace and fix before continuing.**

**NOTE on TEST 7:** Elder Fey has 1 LA but Radiant Burst costs 2. That means the Fey can NEVER use Radiant Burst as a legendary action — it will always fall back to basic attack. This is probably a design bug. Check if this is intentional or if `legendaryCost` should be 1. Flag in findings either way.

### Step 3: Verify Admin Dashboard

After all sims complete, open the admin combat dashboard Simulation History page.

For each sim, open 2-3 individual fights and verify the following:

**TEST 1 (Lich LA):** Look for legendary action entries in the round log:
- 🔱 icons or "Legendary Action" labels
- Action number (1/3, 2/3, 3/3)
- Cost displayed (Paralyzing Touch costs 2, Necrotic Bolt costs 1)
- Pool remaining after each action
- Full ability resolution nested inside (save DCs, damage, status applied)
- LA pool refreshes each round (not cumulative)

**TEST 2 (Lich LR):** Look for legendary resistance triggers:
- ⚜ or "Legendary Resistance" inline with a save result
- Shows the original failed save roll
- Shows "overridden to SUCCESS"
- Shows remaining uses (3 → 2 → 1 → 0)
- After 3 uses exhausted, subsequent failed saves stay failed

**TEST 3 (Lich Fear Aura):** Look for fear aura at start of player turns:
- 👁 or "Fear Aura" entry at turn start
- WIS save roll vs DC 18
- If failed: "frightened" status applied
- If passed: "immune to fear aura" noted, no more checks in subsequent rounds
- Frightened effects visible on subsequent attack rolls (if frightened imposes penalties)

**TEST 4 (Demon Auras):** Look for BOTH aura types:
- Fear aura: WIS save vs DC 15 at player turn start
- Fire aura: damage to attacker AFTER each successful melee hit
  - Should show: "🔥 Fire Aura: X FIRE damage to attacker"
  - Attacker HP should decrease from aura damage
  - Should trigger on EVERY successful melee hit, not just once

**TEST 5 (Dragon LA):** Verify:
- Exactly 1 legendary action per round (not 2 or 3)
- Dragon uses basic attack as legendary action (no abilities marked as legendary for dragon)
- Fear aura triggers

**TEST 6 (Golem LR):** Verify:
- NO legendary action entries (Golem has 0 LA)
- NO fear aura entries (Golem has no aura)
- Legendary resistance triggers when Psion CC forces saves
- After 2 uses, Golem starts failing saves normally

**TEST 7 (Elder Fey):** Verify:
- 1 legendary action per round
- Whether Radiant Burst (cost 2) is ever used as LA when pool is only 1 (it shouldn't be)
- Falls back to basic attack for LA
- Fear aura DC 16

### Step 4: Report Findings

```
PHASE 2 SMOKE TEST RESULTS
===========================

Deployment: [tag] — revision [N] — health [PASS/FAIL]
Migration: [APPLIED/ALREADY APPLIED/FAILED]
Seed Data: [PASS/FAIL] — boss monsters have correct legendary fields

TEST 1 - Lich Legendary Actions (3 LA): [PASS/FAIL/PARTIAL]
  - LA entries in log: [observed/not observed]
  - Action count per round: [observed count]
  - Cost tracking: [correct/incorrect]
  - Pool refresh each round: [yes/no]
  - Ability resolution in LA: [full/partial/missing]
  - Notes: [any issues]

TEST 2 - Lich Legendary Resistance vs Psion: [PASS/FAIL/PARTIAL]
  - LR triggers on failed saves: [observed/not observed]
  - Override to success: [yes/no]
  - Uses decrement correctly: [yes/no]
  - Stops working at 0: [yes/no]
  - Total LR triggers across 30 fights: [count]
  - Notes: [any issues]

TEST 3 - Lich Fear Aura: [PASS/FAIL/PARTIAL]
  - Fear check at turn start: [observed/not observed]
  - WIS save vs DC 18: [yes/no]
  - Frightened applied on fail: [yes/no]
  - Immune after pass: [yes/no]
  - No re-check after immunity: [yes/no]
  - Notes: [any issues]

TEST 4 - Demon Fear + Fire Aura: [PASS/FAIL/PARTIAL]
  - Fear aura triggers: [observed/not observed]
  - Fire aura damage on melee hit: [observed/not observed]
  - Fire aura triggers per hit (not per round): [yes/no]
  - Attacker HP decreases from aura: [yes/no]
  - Fire damage amount: [observed values]
  - Notes: [any issues]

TEST 5 - Young Dragon 1 LA + Fear: [PASS/FAIL/PARTIAL]
  - Exactly 1 LA per round: [yes/no]
  - LA is basic attack: [yes/no]
  - Fear aura triggers: [yes/no]
  - Notes: [any issues]

TEST 6 - Ancient Golem LR Only: [PASS/FAIL/PARTIAL]
  - No LA entries: [confirmed/found unexpected LA]
  - No aura entries: [confirmed/found unexpected aura]
  - LR triggers: [observed/not observed]
  - LR exhausted after 2 uses: [yes/no]
  - Notes: [any issues]

TEST 7 - Elder Fey 1 LA + Fear: [PASS/FAIL/PARTIAL]
  - 1 LA per round: [yes/no]
  - Radiant Burst used as LA: [yes/no — if yes, BUG: cost 2 > pool 1]
  - Falls back to basic attack: [yes/no]
  - Fear aura DC 16: [yes/no]
  - DESIGN FLAG: Radiant Burst legendaryCost 2 with pool 1 — intentional? [analysis]
  - Notes: [any issues]

OVERALL: [X/7 PASSED, X PARTIAL, X FAILED]

ISSUES FOUND:
1. [issue + test + severity]
2. ...

DESIGN FLAGS:
1. Elder Fey Radiant Burst cost 2 with pool 1 — [recommendation]
2. [any other design concerns from sim results]

ADMIN RENDERING:
- LegendaryActionDisplay renders: [yes/no]
- LegendaryResistanceDisplay renders: [yes/no]
- FearAuraDisplay renders: [yes/no]
- DamageAuraDisplay renders: [yes/no]
- All nested ability details visible: [yes/no]

PHASE 1 REGRESSION CHECK:
- Wolf knockdown still works: [spot check 1-2 fights from TEST 1-7 where wolf data would show]
- Crit d100 still fires: [observed in any fight logs]
- Damage type interactions still work: [observed in any fight logs]
```

### Step 5: Fix Critical Issues

If any test FAILS:
1. Capture error or incorrect behavior
2. Diagnose root cause
3. Fix in the relevant file
4. Re-run just that test
5. Verify fix in admin dashboard
6. Commit separately with descriptive message, new unique image tag, re-deploy

**Elder Fey design flag:** If Radiant Burst (cost 2) can never be used as LA because pool is 1, either:
- Change `legendaryCost` to 1 (makes it usable but maybe too cheap)
- Change `legendaryActions` to 2 for Elder Fey (gives it a bigger LA pool)
- Leave as-is (Elder Fey LA is always a basic attack — intentional design choice?)

Report the flag and let Tony decide. Do NOT change it without confirmation.

---

## DO NOT

- Do not run balance tuning — functional verification only
- Do not add new monsters or new abilities
- Do not change monster stats, levels, or names
- Do not modify Phase 1 features (crit/fumble charts, damage type interactions, monster abilities)
- Do not skip the migration check
- Do not batch sims — run sequentially
- Do not auto-fix the Elder Fey design flag — report it for Tony's decision
- Do not declare success without checking admin dashboard rendering for ALL four new display components
