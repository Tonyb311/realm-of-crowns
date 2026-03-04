# Fix: Class Ability Attack Roll Always Skipped (1-Line Fix)

Read `cat CLAUDE.md` before starting.

Read the investigation: `cat docs/investigations/class-ability-roll-details-missing.md`

---

## THE FIX

In `server/src/lib/class-ability-resolver.ts`, `handleDamage` at line 143:

```diff
- if (hasAttackMods && actor.weapon && !autoHit) {
+ if (actor.weapon && !autoHit) {
```

This makes all damage-dealing class abilities roll a d20 attack vs AC when the actor has a weapon, regardless of whether the ability adds accuracy modifiers. The `hasAttackMods` variable should still exist and be used inside the block to apply bonus accuracy when present — just don't gate the entire d20 roll behind it.

Verify that after the change:
- Abilities WITH accuracy mods (Backstab, Aimed Shot, etc.) still apply their bonus to the roll
- Abilities WITHOUT accuracy mods (Reckless Strike, Commanding Strike, etc.) roll d20 with base modifiers only (STR/DEX/INT + proficiency + weapon bonus)
- Abilities with `autoHit` still skip the roll
- The d20 result, modifiers, total, targetAC, hit/miss, and isCritical are all stored on the result

---

## TESTING

1. All existing tests pass (0 regressions)
2. Run a quick smoke sim:

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run --race orc --class warrior --level 3 --monster "Mana Wisp" --iterations 5 --notes "Verify attack roll shows for Reckless Strike"
```

3. Check admin dashboard History tab. Reckless Strike should now show:
   - d20 = X
   - +N STR (or appropriate stat mod)
   - +N proficiency
   - +N weaponBonus
   - = total vs AC Y → HIT/MISS
   - Damage dice breakdown (already working)

4. Verify a miss is possible — if all 5 hit, check the attack totals vs AC to confirm the math is correct.

---

## DEPLOYMENT

```bash
git add -A
git commit -m "fix: class ability damage now rolls d20 attack vs AC

- Removed hasAttackMods gate on d20 roll in handleDamage
- All weapon-based damage abilities now roll attack vs AC (9 abilities affected)
- Abilities with accuracy mods still apply their bonus
- autoHit abilities still skip the roll"
git push origin main
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not modify combat-engine.ts
- Do not modify the logger or frontend (layers 2-4 already work)
- Do not remove the `hasAttackMods` variable — it's still used for applying accuracy bonuses inside the block
- Do not change any ability definitions

## SUMMARY FOR CHAT

```
Fix: class ability d20 attack roll no longer gated behind hasAttackMods
- 1 line changed in class-ability-resolver.ts
- 9 damage abilities now properly roll d20 vs AC instead of auto-hitting
- Attack roll breakdown (d20 + mods vs AC → hit/miss) now visible in admin combat log
- Damage breakdown was already working, no changes needed
Tests: [X/X passing]
Deployed: tag [TAG]
```
