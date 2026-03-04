# Smoke Test: Phase 1 Monster Engine + Crit/Fumble + Damage Types

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## CONTEXT

Phase 1 just deployed (tag `202603031018`, revision 151). Three systems were added in one pass:

1. **Monster Abilities** — MonsterAbility type, monster AI in decideAction(), ability resolver with 6 handlers, all 21 monsters upgraded with SRD-appropriate abilities
2. **Crit/Fumble d100** — 8 charts (154 entries), modifier system, fumble confirmation + level cap, full decision chain logging
3. **Damage Types + CR** — resistance/immunity/vulnerability on all damage, condition immunity, formula CR on Monster model

**Nothing has been tested against a live database yet.** Type checking passed but no integration tests ran. We need to verify everything works end-to-end.

## TASK

### Step 0: Verify Production Database

Before running any sims, confirm the Prisma migration ran successfully:

```bash
npx prisma migrate status
```

If the migration `add_monster_abilities_crit_cr` has NOT been applied to production, run:

```bash
npx prisma migrate deploy
```

Then verify monster seed data includes the new fields by spot-checking a few monsters:

```bash
npx prisma db execute --stdin <<EOF
SELECT name, level, "damage_type", abilities::text, resistances::text, immunities::text, "crit_immunity", "crit_resistance", "formula_cr"
FROM "Monster"
WHERE name IN ('Wolf', 'Troll', 'Goblin', 'Lich', 'Young Dragon', 'Slime', 'Skeleton Warrior')
ORDER BY level;
EOF
```

**Expected:** Each monster should have non-empty abilities (except Goblin/Bandit which are basic), correct damage types, and a formulaCR value. If abilities are still empty `[]` for monsters like Wolf or Troll, the seed didn't run — trigger it manually or investigate.

**Stop here if the data isn't right.** Don't run sims against un-upgraded monsters.

### Step 1: Smoke Test Battery

Run these 7 sim batches. Each tests a specific system. Use small iteration counts — we're checking functionality, not balance.

```bash
# TEST 1: Wolf on-hit knockdown
# Expected: Some Wolf attacks should trigger knockdown (STR save DC 11). Look for 'prone' or 'knocked_down' status in results.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 3 --monster Wolf --iterations 30 \
  --notes "Smoke: Wolf on-hit knockdown"

# TEST 2: Troll regeneration + fire disable
# Expected: Troll should heal each round. If warrior deals fire damage (unlikely without fire weapon), regen should be disabled.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 10 --monster Troll --iterations 30 \
  --notes "Smoke: Troll regen"

# TEST 3: Troll regen disabled by fire damage (use Mage who may have fire spells)
# Expected: Mage's fire damage should disable Troll regen for that round
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class mage --level 10 --monster Troll --iterations 30 \
  --notes "Smoke: Troll regen vs Mage fire"

# TEST 4: Crit d100 chart visibility
# Expected: With 50 fights, should see multiple crits. Admin log should show d100 roll, modifiers, severity, chart entry.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 5 --monster Goblin --iterations 50 \
  --notes "Smoke: Crit d100 visibility"

# TEST 5: Skeleton Warrior bludgeoning vulnerability
# Expected: Bludgeoning damage should be doubled against Skeleton Warrior. Check damage type interaction in logs.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 6 --monster "Skeleton Warrior" --iterations 30 \
  --notes "Smoke: Skeleton bludgeoning vulnerability"

# TEST 6: Slime crit immunity + resistances
# Expected: Crits against Slime should be negated (normal hit). Slashing/piercing damage should be halved.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 3 --monster Slime --iterations 30 \
  --notes "Smoke: Slime crit immunity + resistances"

# TEST 7: Young Dragon breath weapon + multi-attack
# Expected: Dragon should use breath weapon (recharge 5-6) and multi-attack (3 attacks). NOT just basic attack every round.
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 15 --monster "Young Dragon" --iterations 30 \
  --notes "Smoke: Dragon breath + multiattack"
```

**Run them sequentially, not in parallel.** Check each for errors before moving to the next. If any sim throws an error, capture the full stack trace and fix the issue before continuing.

### Step 2: Verify Admin Dashboard

After all 7 sims complete, check the admin combat dashboard Simulation History page.

For each sim run, open 2-3 individual fight logs and verify:

**TEST 1 (Wolf):** Look for fights where Wolf's attack triggers an on-hit ability. The combat log should show:
- Wolf's basic attack hits
- On-hit: knockdown check (STR save DC 11)
- Save result: target's d20 + STR mod vs DC 11
- If failed: status applied (prone/knocked_down) with duration

**TEST 2-3 (Troll):** Look for:
- Troll's turn showing regeneration healing (should appear each round the Troll acts)
- Multi-attack: Troll should make 3 attacks per turn (bite + 2 claws), not 1
- In Mage fights: look for a round where fire damage was dealt, then check if Troll's regen was skipped the following round

**TEST 4 (Goblin - Crits):** Look for any fight where a crit occurred. The admin log should show the full d100 decision chain:
- Trigger: "nat 20" (or expanded range if applicable)
- Chart type: slashing/piercing/bludgeoning (based on weapon)
- d100 Roll: raw number (1-100)
- Modifiers: list of sources and values (may be empty for basic warrior)
- Modified Roll: d100 after modifiers
- Severity: Minor/Major/Devastating
- Effect: name from chart + mechanical description
- Any bonus damage or status effect applied

Also look for any fumble (nat 1). Should show:
- Confirmation roll: d20 + attack mod vs target AC
- If confirmed: d100 roll, level cap, severity, effect
- If not confirmed: just a miss

**TEST 5 (Skeleton):** Look for damage type interaction display:
- Warrior's weapon damage type (likely SLASHING or BLUDGEONING depending on starter weapon)
- If BLUDGEONING: "Skeleton Warrior is VULNERABLE → damage doubled"
- If SLASHING: normal interaction (no vulnerability to slashing)
- Check if the warrior's starter weapon is actually bludgeoning — if it's a sword (SLASHING), vulnerability won't trigger. Note this in findings.

**TEST 6 (Slime):** Look for:
- Any crit attempt against Slime: should show "Crit Immunity — normal hit" (no d100 chart roll)
- Damage type interaction: SLASHING or PIERCING damage should show "Slime is RESISTANT → damage halved"

**TEST 7 (Dragon):** Look for:
- Rounds where Dragon uses breath weapon (not basic attack) — should show ability name, damage dice, save DC, save type
- Rounds where Dragon uses multi-attack (3 strikes in one turn)
- Recharge mechanic: after breath weapon used, subsequent turns should show recharge roll (d6, succeeds on 5-6)

### Step 3: Report Findings

Print a structured report to chat:

```
PHASE 1 SMOKE TEST RESULTS
===========================

DB Migration: [PASSED/FAILED] — migration status
Monster Seed Data: [PASSED/FAILED] — spot check results

TEST 1 - Wolf Knockdown: [PASSED/FAILED/PARTIAL]
  - On-hit trigger: [observed/not observed]
  - Save roll visible: [yes/no]
  - Status applied on fail: [yes/no]
  - Notes: [any issues]

TEST 2 - Troll Regen (Warrior): [PASSED/FAILED/PARTIAL]
  - Regen each round: [observed/not observed]
  - Multi-attack (3/turn): [observed/not observed]
  - Notes: [any issues]

TEST 3 - Troll Regen vs Mage Fire: [PASSED/FAILED/PARTIAL]
  - Fire damage dealt: [observed/not observed]
  - Regen disabled after fire: [observed/not observed]
  - Notes: [any issues]

TEST 4 - Crit d100 Chain: [PASSED/FAILED/PARTIAL]
  - Crits occurred: [count in 50 fights]
  - d100 roll visible: [yes/no]
  - Modifiers visible: [yes/no]
  - Severity determination visible: [yes/no]
  - Chart entry name visible: [yes/no]
  - Fumble occurred: [count]
  - Fumble confirmation visible: [yes/no]
  - Notes: [any issues]

TEST 5 - Skeleton Vulnerability: [PASSED/FAILED/PARTIAL]
  - Warrior weapon type: [SLASHING/BLUDGEONING/PIERCING]
  - Vulnerability triggered: [yes/no/N/A if wrong damage type]
  - Damage doubled: [yes/no]
  - Notes: [any issues]

TEST 6 - Slime Crit Immunity: [PASSED/FAILED/PARTIAL]
  - Crit negated: [observed/not observed]
  - Resistance applied: [observed/not observed]
  - Damage halved: [yes/no]
  - Notes: [any issues]

TEST 7 - Dragon Abilities: [PASSED/FAILED/PARTIAL]
  - Breath weapon used: [observed/not observed]
  - Multi-attack used: [observed/not observed]
  - Recharge roll visible: [observed/not observed]
  - Monster still just basic attacks: [yes = FAILED / no = PASSED]
  - Notes: [any issues]

OVERALL: [X/7 PASSED, X PARTIAL, X FAILED]

ISSUES FOUND:
1. [issue description + which test + severity]
2. ...

ADMIN LOG RENDERING:
- CritDisplay component renders: [yes/no]
- FumbleDisplay component renders: [yes/no]
- DamageTypeDisplay component renders: [yes/no]
- MonsterAbilityEntry component renders: [yes/no]
- d100 decision chain fully visible: [yes/no]
```

### Step 4: Fix Critical Issues (if any)

If any test FAILS (not partial — fully fails):

1. Capture the error or incorrect behavior
2. Diagnose root cause (check the relevant handler, logger, or seed data)
3. Fix it
4. Re-run just that test
5. Verify the fix in admin dashboard

If the issue is in seed data (wrong ability definition, missing resistance, etc.), fix it in `database/seeds/monsters.ts` and re-deploy.

If the issue is in the combat engine (handler not triggering, wrong damage calc, etc.), fix it in the relevant file and re-deploy.

**For any fix:** commit separately with a descriptive message, use a new unique image tag, verify after deploy.

---

## DO NOT

- Do not run balance tuning — this is functional verification only
- Do not modify crit/fumble chart entries
- Do not add new monsters
- Do not change monster levels or names
- Do not skip the DB migration check — sims against un-migrated data will silently produce wrong results
- Do not batch all 7 sims into one command — run sequentially and check each
- Do not declare success without checking admin dashboard rendering
