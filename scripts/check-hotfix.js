const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkRun(runId, label) {
  const logs = await p.$queryRawUnsafe(`
    SELECT rounds::text FROM "combat_encounter_logs"
    WHERE "simulation_run_id" = $1 LIMIT 10
  `, runId);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label} — ${logs.length} logs checked`);
  console.log('='.repeat(60));

  let laCount = 0, lrCount = 0, fearCount = 0;
  let laDetails = [], lrDetails = [], fearDetails = [];
  let radiantBurstAsLA = 0, basicAttackAsLA = 0;

  for (const log of logs) {
    const rounds = JSON.parse(log.rounds);
    for (const entry of rounds) {
      if (entry._encounterContext) continue;

      if (entry.legendaryActions && entry.legendaryActions.length > 0) {
        laCount += entry.legendaryActions.length;
        for (const la of entry.legendaryActions) {
          const abilName = la.action?.abilityName || la.action?.weaponName || 'basic';
          laDetails.push(`  R${entry.round}: LA #${la.actionNumber} cost=${la.cost} remaining=${la.actionsRemaining} type=${la.action?.type} ability=${abilName}`);
          if (abilName === 'Radiant Burst') radiantBurstAsLA++;
          else if (la.action?.type === 'attack') basicAttackAsLA++;
        }
      }

      if (entry.legendaryResistance && entry.legendaryResistance.resistanceUsed) {
        lrCount++;
        const lr = entry.legendaryResistance;
        lrDetails.push(`  R${entry.round}: Save ${lr.originalTotal} vs DC ${lr.saveDC} -> OVERRIDDEN (${lr.resistancesRemaining} left)`);
      }

      if (entry.auraResults) {
        for (const aura of entry.auraResults) {
          if (aura.auraType === 'fear') {
            fearCount++;
            fearDetails.push(`  R${entry.round}: ${aura.auraName} save=${aura.saveRoll}/${aura.saveTotal} vs DC ${aura.saveDC} -> ${aura.savePassed ? 'SAVED' : 'FAILED'}`);
          }
        }
      }
    }
  }

  console.log(`LA: ${laCount} | LR: ${lrCount} | Fear: ${fearCount}`);
  if (radiantBurstAsLA > 0 || basicAttackAsLA > 0) {
    console.log(`  Radiant Burst as LA: ${radiantBurstAsLA} | Basic Attack as LA: ${basicAttackAsLA}`);
  }
  if (laDetails.length > 0) { console.log('LA details (first 10):'); laDetails.slice(0, 10).forEach(d => console.log(d)); }
  if (lrDetails.length > 0) { console.log('LR details:'); lrDetails.forEach(d => console.log(d)); }
  if (fearDetails.length > 0) { console.log('Fear details (first 5):'); fearDetails.slice(0, 5).forEach(d => console.log(d)); }

  return { laCount, lrCount, fearCount, radiantBurstAsLA, basicAttackAsLA };
}

async function main() {
  const fey = await checkRun('cmmb1kns70000a55dxdh3b0mb', 'Elder Fey 2 LA (Warrior L16)');
  const golem = await checkRun('cmmb1kvwf0000d80m93m08jfj', 'Golem LR (Psion L18)');

  console.log('\n\n=== VERDICT ===');
  console.log(`Elder Fey LA: ${fey.laCount} total | Radiant Burst as LA: ${fey.radiantBurstAsLA} ${fey.radiantBurstAsLA > 0 ? '✓' : '✗'} | Basic: ${fey.basicAttackAsLA}`);
  console.log(`Golem LR: ${golem.lrCount} triggers ${golem.lrCount > 0 ? '✓ CONFIRMED' : '✗ NOT TRIGGERED'}`);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
