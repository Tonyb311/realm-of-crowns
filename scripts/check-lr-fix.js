const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkLR(runId, label) {
  const logs = await p.$queryRawUnsafe(`
    SELECT rounds::text FROM "combat_encounter_logs"
    WHERE "simulation_run_id" = $1 LIMIT 5
  `, runId);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label} (${runId.slice(-8)}) — ${logs.length} logs checked`);
  console.log('='.repeat(60));

  let lrCount = 0, lrDetails = [];

  for (const log of logs) {
    const rounds = JSON.parse(log.rounds);
    for (const entry of rounds) {
      if (entry._encounterContext) continue;

      // Check legendaryResistance field
      if (entry.legendaryResistance && entry.legendaryResistance.resistanceUsed) {
        lrCount++;
        const lr = entry.legendaryResistance;
        lrDetails.push(`  R${entry.round}: Save ${lr.originalTotal} vs DC ${lr.saveDC} -> OVERRIDDEN (${lr.resistancesRemaining} left)`);
      }

      // Also check for save overrides without LR field (detect if old bug still present)
      if (entry.saveDC != null && entry.saveTotal != null) {
        const shouldFail = entry.saveTotal < entry.saveDC;
        const reported = entry.saveSucceeded;
        if (shouldFail && reported) {
          const hasLR = entry.legendaryResistance && entry.legendaryResistance.resistanceUsed;
          if (!hasLR) {
            console.log(`  WARNING R${entry.round}: Save ${entry.saveTotal} vs DC ${entry.saveDC} = SUCCESS but no LR field!`);
          }
        }
      }
    }
  }

  console.log(`Legendary Resistance: ${lrCount} triggers found in logs`);
  if (lrDetails.length > 0) {
    lrDetails.forEach(d => console.log(d));
  } else {
    console.log('  (none found)');
  }
  return lrCount;
}

async function main() {
  const lich = await checkLR('cmmb0qlee0000rwn67jax4gx9', 'RE-RUN TEST 2: Lich LR vs Psion');
  const golem = await checkLR('cmmb0qtgq00002stg69ywse7n', 'RE-RUN TEST 6: Golem LR vs Psion');

  console.log('\n=== VERDICT ===');
  console.log(`Lich LR triggers in logs: ${lich} ${lich > 0 ? '✓ FIXED' : '✗ STILL BROKEN'}`);
  console.log(`Golem LR triggers in logs: ${golem} ${golem > 0 ? '✓ FIXED' : '✗ STILL BROKEN'}`);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
