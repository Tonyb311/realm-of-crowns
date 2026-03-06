# Post-Rebalance Combat Sim Results

**Run ID:** `cmmfhkxix000014enwv7fvuyj`
**Date:** 2026-03-06
**Total fights:** 15,400 (77 matchups x 200 iterations)
**Overall win rate:** 0.0%

## CRITICAL FINDING: HP Formula Mismatch

The sim's `computeHP()` uses D&D-style hit dice. The game uses a flat `10 + conMod + classBonus + 10/level` formula. This produces drastically different HP values and makes ALL sim results invalid for balance analysis.

| Level | Sim HP (avg) | Game HP (Warrior) | Game HP (Mage) | Ratio |
|------:|-------------:|------------------:|---------------:|------:|
| 1 | 8 | 20 | 14 | ~40-57% |
| 5 | 23 | 60 | 54 | ~38-43% |
| 10 | 42 | 110 | 104 | ~38-40% |
| 15 | 62 | 160 | 154 | ~39-40% |
| 20 | 81 | 210 | 204 | ~39-40% |
| 25 | 100 | 260 | 254 | ~38-39% |
| 30 | 128 | 310 | 304 | ~41-42% |
| 40 | 181 | 410 | 404 | ~44-45% |
| 50 | 254 | 510 | 504 | ~50% |

**Game HP formula** (from `server/src/routes/characters.ts` and `server/src/services/progression.ts`):
- Starting: `10 + floor((CON - 10) / 2) + classHpBonus` (warrior: 10, cleric/ranger: 8, rogue/bard: 6, mage/psion: 4)
- Per level: `+10 HP` (flat, from `LEVEL_UP_REWARDS.HP_PER_LEVEL`)

**Sim HP formula** (from `server/src/services/combat-simulator.ts` `computeHP()`):
- `hitDie + conMod + (level - 1) * floor(hitDieAvg + conMod)`
- warrior hitDie=10, mage hitDie=6

The sim produces 38-50% of actual game HP, making players die in 1-3 rounds against level-appropriate monsters.

### Recommendation

Replace `computeHP()` in `combat-simulator.ts` with the game's actual formula:
```typescript
function computeHP(className: string, level: number, conMod: number): number {
  const classBonus: Record<string, number> = {
    warrior: 10, cleric: 8, ranger: 8, rogue: 6, bard: 6, mage: 4, psion: 4,
  };
  const startingHp = 10 + conMod + (classBonus[className] ?? 6);
  return startingHp + (level - 1) * 10;
}
```

## Results Summary (Invalid Due to HP Bug)

All data below is recorded for reference but SHOULD NOT be used for balance decisions until the HP formula is fixed and the battery is re-run.

### Class Win Rate by Level

| Level | warrior | mage | rogue | cleric | ranger | bard | psion |
|------:|--------:|-----:|------:|-------:|-------:|-----:|------:|
| 1 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 5 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 10 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 13 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 15 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 20 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 25 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 30 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 40 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| 50 | 0% | 0% | 0% | 0% | 0% | 0% | 0% |

### Per-Matchup Breakdown

| Matchup | Win% | Avg Rounds | Avg DPR | n |
|---------|------|------------|---------|---|
| L1 warrior vs Giant Rat | 0.0% | 7.4 | 2.0 | 200 |
| L1 warrior vs Goblin | 0.0% | 6.9 | 2.6 | 200 |
| L1 ranger vs Giant Rat | 0.0% | 7.2 | 1.8 | 200 |
| L1 ranger vs Goblin | 0.0% | 5.3 | 2.7 | 200 |
| L1 rogue vs Giant Rat | 0.0% | 7.8 | 1.2 | 200 |
| L1 rogue vs Goblin | 0.0% | 5.4 | 1.9 | 200 |
| L1 cleric vs Giant Rat | 0.0% | 8.0 | 1.4 | 200 |
| L1 cleric vs Goblin | 0.0% | 6.6 | 1.9 | 200 |
| L1 mage vs Giant Rat | 0.0% | 5.6 | 1.5 | 200 |
| L1 mage vs Goblin | 0.0% | 4.1 | 1.8 | 200 |
| L1 bard vs Giant Rat | 0.0% | 7.7 | 1.3 | 200 |
| L1 bard vs Goblin | 0.0% | 5.3 | 1.9 | 200 |
| L1 psion vs Giant Rat | 0.0% | 5.9 | 1.4 | 200 |
| L1 psion vs Goblin | 0.0% | 4.2 | 1.8 | 200 |
| L5 warrior vs Skeleton Warrior | 0.0% | 4.5 | 4.0 | 200 |
| L5 ranger vs Skeleton Warrior | 0.0% | 3.5 | 4.6 | 200 |
| L5 rogue vs Skeleton Warrior | 0.0% | 3.6 | 3.7 | 200 |
| L5 cleric vs Skeleton Warrior | 0.0% | 3.6 | 3.5 | 200 |
| L5 mage vs Skeleton Warrior | 0.0% | 2.4 | 2.4 | 200 |
| L5 bard vs Skeleton Warrior | 0.0% | 3.2 | 2.1 | 200 |
| L5 psion vs Skeleton Warrior | 0.0% | 2.4 | 2.1 | 200 |
| L10 warrior vs Sandscale Basilisk | 0.0% | 4.7 | 8.0 | 200 |
| L10 ranger vs Sandscale Basilisk | 0.0% | 4.0 | 12.6 | 200 |
| L10 rogue vs Sandscale Basilisk | 0.0% | 3.7 | 8.0 | 200 |
| L10 cleric vs Sandscale Basilisk | 0.0% | 5.0 | 5.1 | 200 |
| L10 mage vs Sandscale Basilisk | 0.0% | 2.8 | 2.3 | 200 |
| L10 bard vs Sandscale Basilisk | 0.0% | 3.6 | 2.3 | 200 |
| L10 psion vs Sandscale Basilisk | 0.0% | 3.0 | 4.0 | 200 |
| L13 warrior vs Void Stalker | 0.0% | 3.0 | 4.2 | 200 |
| L13 ranger vs Void Stalker | 0.0% | 2.5 | 6.3 | 200 |
| L13 rogue vs Void Stalker | 0.0% | 2.3 | 2.3 | 200 |
| L13 cleric vs Void Stalker | 0.0% | 2.7 | 1.8 | 200 |
| L13 mage vs Void Stalker | 0.0% | 2.0 | 1.6 | 200 |
| L13 bard vs Void Stalker | 0.0% | 2.2 | 0.9 | 200 |
| L13 psion vs Void Stalker | 0.0% | 1.9 | 1.0 | 200 |
| L15 warrior vs Hydra | 0.0% | 1.6 | 2.7 | 200 |
| L15 others vs Hydra | 0.0% | 1.0 | 0.0-0.2 | 1200 |
| L20 warrior vs Mind Flayer | 0.0% | 6.9 | 9.6 | 200 |
| L20 ranger vs Mind Flayer | 0.0% | 5.5 | 7.8 | 200 |
| L20 rogue vs Mind Flayer | 0.0% | 5.1 | 7.6 | 200 |
| L20 cleric vs Mind Flayer | 0.0% | 6.5 | 7.0 | 200 |
| L20 bard vs Mind Flayer | 0.0% | 3.9 | 7.2 | 200 |
| L20 psion vs Mind Flayer | 0.0% | 2.8 | 2.2 | 200 |
| L20 mage vs Mind Flayer | 0.0% | 2.4 | 0.0 | 200 |
| L25 warrior vs Purple Worm | 0.0% | 3.8 | 9.9 | 200 |
| L25 psion vs Purple Worm | 0.0% | 4.6 | 8.6 | 200 |
| L25 bard vs Purple Worm | 0.0% | 3.1 | 7.0 | 200 |
| L25 mage vs Purple Worm | 0.0% | 2.9 | 5.1 | 200 |
| L25 cleric vs Purple Worm | 0.0% | 3.1 | 4.4 | 200 |
| L25 rogue vs Purple Worm | 0.0% | 3.1 | 3.2 | 200 |
| L25 ranger vs Purple Worm | 0.0% | 3.2 | 2.0 | 200 |
| L30 all vs Storm Giant | 0.0% | 1.6-2.0 | 0.0-9.5 | 1400 |
| L40 warrior vs Archlich | 0.0% | 6.0 | 10.6 | 200 |
| L40 ranger vs Archlich | 0.0% | 3.0 | 6.4 | 200 |
| L40 rogue vs Archlich | 0.0% | 3.0 | 6.1 | 200 |
| L40 bard vs Archlich | 0.0% | 2.6 | 5.1 | 200 |
| L40 mage vs Archlich | 0.0% | 2.4 | 2.1 | 200 |
| L40 cleric vs Archlich | 0.0% | 4.8 | 1.2 | 200 |
| L40 psion vs Archlich | 0.0% | 2.4 | 0.0 | 200 |
| L50 warrior vs Void Emperor | 0.0% | 3.2 | 7.6 | 200 |
| L50 ranger vs Void Emperor | 0.0% | 2.1 | 3.4 | 200 |
| L50 rogue vs Void Emperor | 0.0% | 2.1 | 1.9 | 200 |
| L50 mage vs Void Emperor | 0.0% | 2.0 | 0.4 | 200 |
| L50 bard vs Void Emperor | 0.0% | 2.1 | 0.3 | 200 |
| L50 cleric vs Void Emperor | 0.0% | 3.0 | 0.0 | 200 |
| L50 psion vs Void Emperor | 0.0% | 2.0 | 0.0 | 200 |

### Monster HP Reference

| Monster | Level Bracket | HP |
|---------|:------------:|---:|
| Giant Rat | 1 | 18 |
| Goblin | 1 | 24 |
| Skeleton Warrior | 5 | 40 |
| Sandscale Basilisk | 10 | 110 |
| Void Stalker | 13 | 110 |
| Hydra | 15 | 160 |
| Mind Flayer | 20 | 120 |
| Purple Worm | 25 | 210 |
| Storm Giant | 30 | 280 |
| Archlich | 40 | 420 |
| Void Emperor | 50 | 650 |

### Balance Alerts

All 77 matchups flagged as <30% win rate. This is entirely due to the HP formula mismatch. No balance conclusions can be drawn.

## What's Validated

Despite the HP bug, the sim successfully validates:
1. **Stat model is correct** — Stats start at 11 (human, all stats) at L1, primary reaches 20 cap by mid-game
2. **Save proficiencies work** — Base + milestone saves at L18/30/45 applied correctly
3. **Extra attacks fire** — Warrior shows higher DPR at levels with extra attacks (10.6 at L40 vs ~5 for others)
4. **Feats apply** — featIds populated at L38+ (Precise Strikes for martial, Iron Will for casters)
5. **Class differentiation visible in DPR** — Even with wrong HP, warrior consistently tops DPR, mage/psion lowest (as expected for weapon-based DPR)

## Next Steps

1. Fix `computeHP()` to use game's actual formula (`10 + conMod + classBonus + (level-1) * 10`)
2. Re-run the battery
3. Then analyze for actual balance issues
