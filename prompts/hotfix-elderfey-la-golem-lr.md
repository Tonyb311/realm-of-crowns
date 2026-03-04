# Hotfix: Elder Fey LA Pool + Golem LR Verification

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement.

Read `cat CLAUDE.md` first. Then review available agents: `ls .claude/agents/` and read relevant ones for this task.

---

## TASK 1: Elder Fey Guardian — Raise Legendary Actions to 2

### Change

In `database/seeds/monsters.ts`, find the Elder Fey Guardian entry and change:

```typescript
legendaryActions: 1,  // OLD
```

to:

```typescript
legendaryActions: 2,  // NEW — matches Demon tier, enables Radiant Burst (cost 2) as LA
```

This is the ONLY change. Do NOT modify:
- The Elder Fey's stats, level, name, or biome
- The Elder Fey's existing abilities (Entangling Roots, Radiant Burst)
- The Radiant Burst `legendaryCost: 2` (this is now correct — pool of 2 means it can spend all 2 on one Radiant Burst)
- The fear aura or legendary resistance values
- Any other monster

### Update CR

After changing the seed data, update the Elder Fey's formula CR. The CR formula uses `(1 + legendaryActions * 0.5)` as the LA multiplier — going from 1 LA to 2 LA changes this from 1.5x to 2.0x EDPR. Recalculate and note the new CR value.

### Deploy

```bash
git add -A
git commit -m "fix: Elder Fey legendary actions 1→2 (enables Radiant Burst as LA)"
git push origin main
az acr build --registry rocregistry --image realm-of-crowns:$(date +%Y%m%d%H%M) .
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

Wait for health check, then verify the seed applied:

```bash
npx prisma db execute --stdin <<EOF
SELECT name, "legendary_actions", "legendary_resistances" FROM "monsters" WHERE name = 'Elder Fey Guardian';
EOF
```

**Expected:** `legendary_actions = 2`, `legendary_resistances = 1`

### Verify with Sim

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class warrior --level 16 --monster "Elder Fey Guardian" --iterations 30 \
  --notes "Verify: Elder Fey 2 LA — Radiant Burst as LA"
```

Check admin History tab for:
- 2 legendary actions per round (not 1)
- Radiant Burst used as LA in some rounds (cost 2, spending full pool)
- Basic attack x2 used in other rounds (when Radiant Burst is on cooldown)
- Mix of both patterns across the 30 fights

---

## TASK 2: Golem LR Verification

Run a Psion L18 vs Ancient Golem sim. At L18, Psion should have save-or-suck abilities that force saves on the Golem.

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run \
  --race human --class psion --level 18 --monster "Ancient Golem" --iterations 30 \
  --notes "Verify: Golem legendary resistance at Psion L18"
```

Check admin History tab for:
- Legendary resistance triggers (⚜ display)
- Golem auto-passes first 2 failed saves
- After 2 uses exhausted, Golem fails saves normally
- LR result shows original roll, DC, "overridden to success", remaining count

If Psion L18 STILL doesn't force saves on the Golem (unlikely but possible), note in findings and we'll accept the Lich test as sufficient proof.

---

## REPORT

```
ELDER FEY FIX:
  - legendaryActions changed: 1 → 2
  - Seed verified: [yes/no]
  - Radiant Burst used as LA: [observed/not observed]
  - LA count per round: [observed count]
  - New formula CR: [old value] → [new value]
  - Deployed: [tag]

GOLEM LR VERIFICATION:
  - LR triggered: [yes/no]
  - Trigger count across 30 fights: [count]
  - Uses decrement: [yes/no]
  - Exhaustion confirmed: [yes/no — Golem fails saves after 2 LR used]
  - Notes: [any issues]
```

---

## DO NOT

- Do not change any other monster
- Do not change Elder Fey stats, abilities, or level
- Do not change Radiant Burst legendaryCost (2 is correct now)
- Do not run balance tuning
- Do not modify engine code — this is seed data + verification only
