const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Check TEST 2 (Psion vs Lich) — look for save results in detail
  const logs = await p.$queryRawUnsafe(`
    SELECT rounds::text, summary FROM "combat_encounter_logs"
    WHERE "simulation_run_id" = $1 LIMIT 1
  `, 'cmmb0agpd0000ftllzpkt254x');

  if (!logs.length) { console.log('No logs found'); return; }

  console.log('Summary:', logs[0].summary);
  const rounds = JSON.parse(logs[0].rounds);

  for (const entry of rounds) {
    if (entry._encounterContext) continue;

    console.log(`\nRound ${entry.round} | Action: ${entry.action} | Actor: ${entry.actor}`);

    // Check for saves in the result
    if (entry.saveDC != null) {
      console.log(`  Save: roll=${entry.saveRoll} total=${entry.saveTotal} vs DC ${entry.saveDC} -> ${entry.saveSucceeded ? 'SUCCESS' : 'FAIL'}`);
    }

    // Check for legendaryResistance field
    if (entry.legendaryResistance) {
      console.log(`  LR: used=${entry.legendaryResistance.resistanceUsed} remaining=${entry.legendaryResistance.resistancesRemaining}`);
    } else {
      console.log(`  LR: (not present)`);
    }

    // Check for auraResults
    if (entry.auraResults) {
      for (const a of entry.auraResults) {
        console.log(`  Aura: ${a.auraName} type=${a.auraType} save=${a.saveRoll}/${a.saveTotal} DC=${a.saveDC} passed=${a.savePassed}`);
      }
    }

    // Check for legendaryActions
    if (entry.legendaryActions) {
      for (const la of entry.legendaryActions) {
        console.log(`  LA #${la.actionNumber}: cost=${la.cost} remaining=${la.actionsRemaining} type=${la.action?.type}`);
      }
    }

    // Dump full entry keys for debugging
    const keys = Object.keys(entry).filter(k => entry[k] != null && entry[k] !== '' && !(Array.isArray(entry[k]) && entry[k].length === 0));
    console.log(`  Keys: ${keys.join(', ')}`);
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
