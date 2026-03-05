# Prompt: Fix All Saving Throw Bugs

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/backend-developer.md
cat docs/audit-saving-throws-comprehensive.md
cat server/src/lib/class-ability-resolver.ts
cat server/src/lib/combat-engine.ts
```

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed.
3. **Delegate & Execute** — Assign work items to each teammate.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Key Principles

- Bias toward action.
- Truth-seeking over cheerleading.

---

## Task: Fix All Saving Throw Bugs From Comprehensive Audit

The saving throw audit (`docs/audit-saving-throws-comprehensive.md`) found 5 bugs. Fix all of them.

### Bug 1: Monster AoE Saves Not Happening (CRITICAL — #1 PRIORITY)

**The problem:** 3,815 monster AoE per-target hits across 450 combats had 0 saves rolled. Every monster AoE (Cold Breath, Infernal Blaze, Hellfire Orb, Radiant Burst, etc.) deals full damage to every party member with no saving throw.

**Where to look:** The monster AoE handler in `server/src/lib/combat-engine.ts`. Find where monster abilities with `type: 'aoe'` are resolved. The handler should:
1. For each target (living enemy), roll a saving throw: d20 + getModifier(target.stats[saveType]) + target.proficiencyBonus vs saveDC
2. On save success: deal half damage (Math.floor(damage / 2))
3. On save failure: deal full damage
4. Log `saveRequired: true`, `saveRoll`, `saveTotal`, `saveDC`, `saveSucceeded` per target

The audit says "the handler code has save logic, but saves are either not rolling or not being logged." This means one of:
- The save code exists but is behind a condition that's never true
- The save data (saveDC/saveType) isn't being passed into the handler
- The save rolls but the result isn't applied to damage
- The save code path has a bug (early return, wrong variable)

Trace the EXACT code path for a monster AoE with saveDC (e.g., Young Dragon's Cold Breath: `type: 'aoe', damage: '12d6', damageType: 'COLD', saveType: 'con', saveDC: 17`). Follow it from ability selection through resolution. Find where the save should happen and why it doesn't.

**Fix it.** Every monster AoE with `saveDC` and `saveType` must roll per-target saves. Half damage on success.

### Bug 2: resolveAbilitySave() Missing Proficiency Bonus (MODERATE)

**The problem:** The player-side save utility `resolveAbilitySave()` in `class-ability-resolver.ts` doesn't add `target.proficiencyBonus` to the save roll. Monster-side handlers correctly add it. Result: monsters save against player abilities only 25.5% of the time (should be 40-60%).

**The fix:** Find `resolveAbilitySave()` and add `target.proficiencyBonus` to the save total:
```
saveTotal = d20 + getModifier(target.stats[saveType]) + target.proficiencyBonus
```

Verify this matches how monster handlers compute saves. Both should use the same formula.

### Bug 3: Three Handlers Have No Save Path (MODERATE)

**The problem:** `handleDrain`, `handleMultiTarget`, and `handleAoeDebuff` have zero save code. Any ability routed through them auto-hits unconditionally.

**handleDrain fix:**
For abilities with `attackType: 'save'`: the drain auto-hits, but the target saves for half damage (and therefore half healing to the drainer). Add save check:
- Roll save per target
- On success: half damage, half drain healing
- On failure: full damage, full drain healing

**handleMultiTarget fix:**
For abilities with `attackType: 'save'`: per-target save, half damage on success. Some multi-target abilities (Chain Lightning) might be `attackType: 'spell'` (attack roll per target) — only add saves to save-based abilities.

**handleAoeDebuff fix:**
If this handler exists: add save check before applying the debuff. On successful save: debuff is resisted entirely (or reduced duration if that's the design intent).

### Bug 4: 7 Fear Auras Missing statusEffect Field (MINOR)

**The problem:** 7 fear_aura abilities on high-tier monsters (L38-L50) are missing `statusEffect: 'frightened'`. The save rolls, but on failure no status is applied.

**The fix:** Find these 7 abilities in `database/seeds/monsters.ts`. They're on monsters at levels 38-50. Add `statusEffect: 'frightened'` and `statusDuration: 1` (or 2 for bosses) to each. Check the audit doc for the specific monster names.

Also check: do ALL fear_aura abilities have `statusEffect: 'frightened'`? The earlier Tier 1-3 monsters (Demon, Lich, Young Dragon, Elder Fey Guardian) already had it set correctly — it's only the newer Tier 5-6 monsters that are missing it.

### Bug 5: Verify All Fixes Together

After all fixes, run a targeted diagnostic to verify:

**Monster AoE save test:**
- 10 combats: Balanced party L20 vs a monster with a known AoE (e.g., Young Dragon with Cold Breath)
- For each Cold Breath use: verify saves were rolled per target, some succeeded (half damage), some failed (full damage)
- Report: X AoE uses, Y per-target save rolls, Z successes, save success rate

**Player save-based ability test:**
- In the same combats: check Warrior Intimidating Shout, Mage Fireball, or any save-based player ability
- Verify the monster's save total includes proficiency bonus
- Report: X player save abilities used, Y monster saves rolled, Z successes, success rate

**Drain save test:**
- If a drain ability fires (Mage Necromancer Life Drain, Psion Thought Leech): verify the target got a save
- Report: X drain uses, Y saves rolled

**Fear aura test:**
- If a fear_aura fires: verify the `frightened` status is applied on failed save
- Report: X fear aura triggers, Y failed saves, Z frightened statuses applied (Y should equal Z)

Report all verification results in chat.

### Deployment

```
git add -A
git commit -m "fix: monster AoE saves, proficiency on save rolls, drain/multi-target/aoe-debuff save paths, fear aura status"
git push
```

Build and deploy with unique image tag. Never use `:latest`. Re-seed for the fear aura status fix.

### After verification: rerun the full 450-combat group baseline to see the new win rates.
